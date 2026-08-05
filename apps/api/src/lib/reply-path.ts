// #624 — WHERE DO REPLIES ACTUALLY GO, AND WOULD WE KNOW IF THEY STOPPED?
//
// ⚠️ THE GAP THIS CLOSES. The System check already had a reply-path row, and it checked two
// things: `RESEND_WEBHOOK_SECRET` is set, and how many replies exist. Both true, both useless
// on their own — because **it never asked where replies are addressed.**
//
// Outreach is SENT by SMTP from the warmed Google mailbox, but every email carries a
// `Reply-To:` from `COLD_REPLY_TO` — `FIGSY_COLD_REPLY_TO` → `FIGSY_REPLY_TO` → a **silent
// hardcoded default** of `hello@get-kind.com`. Replies are ingested ONLY through Resend's
// inbound webhook. So the screen could report green while every reply was addressed to a
// mailbox whose inbound was never wired to Resend: a campaign with no return path, and the
// failure is completely silent — an empty Unibox reads as "nobody answered", not "we lost
// them all". You would not find out until send-day, after three weeks of warmup.
//
// ⚠️ THE DOMAIN CHECK IS NECESSARY, NOT SUFFICIENT, AND THIS FILE SAYS SO OUT LOUD.
// Resend's `/domains` lists domains verified for **sending**. Receiving additionally needs MX
// records pointed at Resend. So:
//   • domain ABSENT  → definitive. Inbound cannot possibly work. Broken.
//   • domain PRESENT → necessary condition met, NOT proof. Say that plainly and keep pointing
//     at the live-fire test (send one, reply to it, watch it land).
// Claiming "verified" as if it proved delivery would be the exact class of false green this
// build exists to end.
//
// Pure, for the same reason `coldView` and `pecrVerdict` are: the judgement is provable without
// a network, a database or a clock. The probe gathers facts; this decides what they mean.

/** How the reply-to address came to be what it is. The third one is the dangerous one. */
export type ReplyToSource =
  /** `FIGSY_COLD_REPLY_TO` — deliberately chosen for cold outreach. */
  | 'cold_reply_to'
  /** `FIGSY_REPLY_TO` — the general fallback. Chosen, but not for cold specifically. */
  | 'reply_to_fallback'
  /** Nobody set anything. The address is a hardcoded literal nobody decided on. */
  | 'hardcoded_default'

export type ReplyPathVerdict = {
  state: 'ok' | 'broken' | 'unmeasured'
  detail: string
  action?: string
}

/** The literal in `deliverability.ts` when neither env var is set. */
export const REPLY_TO_HARDCODED_DEFAULT = 'hello@get-kind.com'

/** Which env var (if any) produced the reply-to address actually in use. */
export function replyToSource(a: {
  coldReplyTo?: string | null
  replyTo?: string | null
}): ReplyToSource {
  if (String(a.coldReplyTo ?? '').trim()) return 'cold_reply_to'
  if (String(a.replyTo ?? '').trim()) return 'reply_to_fallback'
  return 'hardcoded_default'
}

/** The domain half of an email address, lowercased. Null when there isn't one. */
export function emailDomain(address: string | null | undefined): string | null {
  const s = String(address ?? '').trim().toLowerCase()
  const at = s.lastIndexOf('@')
  if (at <= 0 || at === s.length - 1) return null
  const domain = s.slice(at + 1).trim()
  return domain || null
}

/** Whole days between two instants, floored at 0. */
function daysBetween(then: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - then.getTime()) / 86_400_000))
}

/**
 * Can a prospect's reply reach a desk — and would we notice if it stopped?
 *
 * Ordered worst-first, because the operator should be shown the thing that breaks the loop
 * earliest in the chain, not the last thing we happened to check.
 */
export function replyPathVerdict(a: {
  /** Raw env values, so this function can name WHICH one is missing. */
  coldReplyTo?: string | null
  replyTo?: string | null
  /** The address actually applied to outgoing mail (`COLD_REPLY_TO`). */
  resolved: string
  /** Domains Resend returned, or null when Resend could not be reached. */
  resendDomains: string[] | null
  /** Newest `figsy_replies.received_at`, or null when there has never been one. */
  lastReplyAt: string | Date | null | undefined
  /** Has anything been sent yet? Before send-day, zero replies is expected, not alarming. */
  hasSent: boolean
  secretSet: boolean
  now: Date
}): ReplyPathVerdict {
  const source = replyToSource(a)
  const addr = String(a.resolved ?? '').trim()
  const domain = emailDomain(addr)

  // ① The signing secret. Without it the route rejects every inbound reply unverified, so
  //    nothing downstream matters. Fails closed by design (#617-style): unset means refused.
  if (!a.secretSet) {
    return {
      state: 'broken',
      detail: `RESEND_WEBHOOK_SECRET is NOT set, so every inbound reply is rejected unverified — a prospect can answer and nothing reaches the client. Replies are addressed to ${addr || 'an unknown address'}, but none of them can get in. This is invisible to the client: a lost reply looks identical to no reply.`,
      action: 'Set RESEND_WEBHOOK_SECRET in Railway → @kind/api → Variables.',
    }
  }

  // ② An unusable address. Nothing else can be true if there is nowhere to reply TO.
  if (!addr || !domain) {
    return {
      state: 'broken',
      detail: `The Reply-To on cold outreach resolves to ${addr ? `"${addr}", which is not a usable email address` : 'nothing at all'} — replies have nowhere to go.`,
      action: 'Set FIGSY_COLD_REPLY_TO to a real mailbox in Railway → @kind/api → Variables.',
    }
  }

  // ③ NOBODY CHOSE THIS ADDRESS. The default is a real mailbox, which is exactly why it is
  //    dangerous: it looks fine, sends fine, and quietly collects replies somewhere that may
  //    not be wired to Resend and may not be read. A decision nobody made is not a decision.
  if (source === 'hardcoded_default') {
    return {
      state: 'broken',
      detail: `Replies will go to ${REPLY_TO_HARDCODED_DEFAULT} because NO reply-to is configured — that address is a hardcoded fallback, not a choice anyone made. If its inbound is not wired to Resend, every reply is lost silently.`,
      action: 'Set FIGSY_COLD_REPLY_TO in Railway → @kind/api → Variables to the mailbox you will actually read.',
    }
  }

  const via = source === 'cold_reply_to' ? 'FIGSY_COLD_REPLY_TO' : 'FIGSY_REPLY_TO (the general fallback — set FIGSY_COLD_REPLY_TO to be explicit about cold mail)'

  // ④ Reply age — a fact whose MEANING depends on whether we have sent anything yet.
  const lastReply = a.lastReplyAt ? new Date(a.lastReplyAt) : null
  const lastReplyValid = lastReply && !Number.isNaN(lastReply.getTime()) ? lastReply : null
  const replyAge = lastReplyValid
    ? `Last reply arrived ${daysBetween(lastReplyValid, a.now)} day(s) ago.`
    : a.hasSent
      // Sending, and NOTHING has ever come back. That is the shape of a dead return path.
      ? '⚠️ Mail has been SENT and NOT ONE reply has ever arrived. That is the exact signature of a broken return path — an empty inbox reads as "nobody answered" when it may mean "we lost them all". Send yourself a test and reply to it before assuming the market is quiet.'
      : '0 replies so far, which is expected before send-day. After the first sends, a zero here beside a rising sent counter means the return path is broken, not that nobody answered.'

  // ⑤ The domain check. Absent is definitive; present is necessary but NOT proof.
  if (a.resendDomains === null) {
    return {
      state: 'unmeasured',
      detail: `Replies are addressed to ${addr} (via ${via}), and the signing secret is set. Resend could NOT be reached, so whether Resend can receive for ${domain} was not established — this is not a pass. ${replyAge}`,
      action: 'Re-run when Resend is reachable, and send a test reply to prove the loop end to end.',
    }
  }

  const known = a.resendDomains.map(d => String(d ?? '').trim().toLowerCase()).filter(Boolean)
  if (!known.includes(domain)) {
    return {
      state: 'broken',
      detail: `Replies are addressed to ${addr}, but ${domain} is NOT a domain Resend holds (it has: ${known.length ? known.join(', ') : 'none'}). The inbound webhook can never fire for it, so every reply is lost silently. ${replyAge}`,
      action: `Add and verify ${domain} in Resend with inbound routing, or set FIGSY_COLD_REPLY_TO to an address on a domain Resend already receives for.`,
    }
  }

  return {
    state: 'ok',
    detail: `Replies are addressed to ${addr} (via ${via}), the signing secret is set, and ${domain} is a domain Resend holds. ⚠️ NOT proof that a reply arrives: Resend lists domains verified for SENDING, and receiving also needs MX records pointed at Resend. ${replyAge}`,
    action: 'Prove the loop once before send-day: send a test, reply to it from another address, and confirm it appears in the Unibox. Only a real reply proves the return path.',
  }
}
