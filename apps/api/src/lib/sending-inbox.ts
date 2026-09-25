// WHOSE MAILBOX DOES THIS EMAIL LEAVE FROM? — the answer #547 exists to give.
//
// Before this file, `figsy.ts:26` was `const FROM = COLD_FROM` — a module-level constant
// feeding both `resend.emails.send` calls, so **every client on the platform emailed from
// one shared address**. `client_inboxes` already existed and Vida already wrote a row into
// it, but no send path ever read that table: the sending identity was recorded and then
// ignored. RULEBOOK 12.2 in one line — *you cannot share a sender across clients; one
// client's spam complaints poison the rest.*
//
// The rule, and it is deliberately harsh: **no inbox = no send.** Not "send from ours
// instead". A silent fallback to the shared address is the exact failure this replaces —
// it looks like it worked, and the damage lands on every other client's deliverability
// weeks later, where nobody connects it back.
//
// Which inbox, when a client holds two: the SOP (docs/client-flow-sop.md) has them on a
// pooled pre-warmed mailbox from day 1 while their own branded one warms for ~14 days, so
// the switch at ~day 29 is gapless. During that overlap both rows are live, and the
// question "which one sends" has one right answer: the branded mailbox once it is `active`,
// the pooled one until then. A `warming` branded inbox must NEVER send — sending on it is
// precisely what un-warms it.

// `@kind/db` is imported lazily inside `resolveSendingInbox`, not at module scope. That is
// deliberate: the db client throws on import without SUPABASE_URL / SERVICE_ROLE_KEY, and
// the whole point of splitting the decision out as a pure function is that the ordering
// rules — which mailbox wins, and when nothing may send — can be tested without a database
// or a live environment.

/** A mailbox row as this module needs it. Mirrors `client_inboxes` + the #547 SMTP columns. */
export type InboxRow = {
  id: string
  email: string
  kind: 'pooled' | 'branded' | string
  status: 'assigned' | 'warming' | 'active' | 'released' | 'retired' | string
  provider?: string | null
  daily_cap?: number | null
  smtp_host?: string | null
  smtp_port?: number | null
  smtp_secure?: boolean | null
  smtp_user?: string | null
  smtp_pass_enc?: string | null
  from_name?: string | null
}

/** Why a client cannot send. Every one of these is a state an operator can act on. */
export type RefusalReason =
  | 'no_inbox'          // nothing assigned at all — #550 has not run for this client
  | 'lookup_failed'     // the mailbox table could not be READ — a different problem entirely
  | 'warming_only'      // a branded mailbox is warming; sending on it would un-warm it
  | 'no_credentials'    // the row exists but has no SMTP details to send with
  | 'no_secret_key'     // INBOX_SECRET_KEY unset — the password cannot be read

export type Resolution =
  | { ok: true; inbox: InboxRow; from: string }
  | { ok: false; reason: RefusalReason; detail: string }

/** Statuses that mean "this mailbox is in play right now". Mirrors the table's unique index. */
const LIVE_STATUSES = new Set(['assigned', 'warming', 'active'])

/** Sending is permitted only from these. `warming` is deliberately absent. */
const SENDABLE_STATUSES = new Set(['assigned', 'active'])

function hasCredentials(r: InboxRow): boolean {
  return Boolean(r.smtp_host && r.smtp_user && r.smtp_pass_enc)
}

/**
 * The decision, as a pure function over the client's mailbox rows — so the ordering rules
 * can be tested without a database, and so the reason a send was refused is a value rather
 * than a log line.
 *
 * `secretOk` is passed in rather than read from the environment here, because a resolver
 * that consults `process.env` cannot be tested for the missing-key path.
 */
/**
 * ROTATION — spread a batch across every sendable mailbox a client has (#610).
 *
 * WHY THIS EXISTS. `pickSendingInbox` below answers "which ONE box?" and is still the right
 * answer for a single message. But a BATCH sent entirely from one box wastes the others and
 * hits that box's cap at a fraction of the volume: the founder's 4-Aug ruling — *"inbox x 2
 * yes for now but volume is key"* — is exactly this. Two boxes at 30/day is 60/day; one box is
 * 30 however many boxes exist.
 *
 * ⚠️ WHAT THIS CAN AND CANNOT DO, STATED HERE BECAUSE THE LIMIT IS INVISIBLE OTHERWISE.
 * `figsy_sent_emails` records `enrollment_id, campaign_id, lead_id, step, subject, body,
 * resend_id` — **there is no column naming the mailbox that sent** (it has no `client_id`
 * either; the counters join through `leads`). So "how many has THIS box sent today?" **cannot
 * be answered from the database**, and answering it needs one migration
 * (`figsy_sent_emails.inbox_id`) which the frozen schema forbids today.
 *
 * Therefore the counts here are **per-batch, held in memory by the caller**. Within one run the
 * distribution and the per-box caps are exact. Across two runs in the same day, a box could
 * exceed its daily cap — the global cold-send cap (`coldCapReached`) still bounds the day, so
 * the exposure is "uneven between boxes", not "unbounded". Recorded on #610; the fix is one
 * column, the day migrations return.
 *
 * PURE on purpose: the whole decision is testable without a database.
 */
export type RotationBox = {
  id: string
  /** null = no cap for this box. */
  dailyCap: number | null
  /** How many this box has sent TODAY — seeded from the database at the start of a run
   *  (⚑ 25 Sep, P1), then counted up in memory as the run sends. */
  sentThisBatch: number
}

/**
 * Which box should send the next message?
 *
 * Least-used first, so a batch spreads evenly instead of draining one box then moving on.
 * A box at its cap drops out. Ties break on `id` so the order is stable rather than
 * dependent on however the rows arrived — an unstable order makes a bug unreproducible.
 *
 * Returns null when every box is at its cap: the caller must STOP, not fall back to a box
 * that is over its limit.
 */
export function nextFromRotation(boxes: RotationBox[]): string | null {
  const eligible = boxes.filter(b => b.dailyCap == null || b.sentThisBatch < b.dailyCap)
  if (eligible.length === 0) return null
  const best = [...eligible].sort((a, b) =>
    a.sentThisBatch - b.sentThisBatch || a.id.localeCompare(b.id))[0]
  return best.id
}

/**
 * Every box a client could send from right now, ranked the same way `pickSendingInbox` ranks.
 *
 * Returns the SAME refusal reasons as the single-box path, so a client with no mailbox, only a
 * warming one, no credentials or no secret key gets the identical (already-tested, already
 * honest) message whichever path asked. Rotation must not invent a second vocabulary for the
 * same failures.
 */
export function sendablePool(rows: InboxRow[], secretOk: boolean): { ok: true; boxes: InboxRow[] } | { ok: false; reason: RefusalReason; detail: string } {
  const single = pickSendingInbox(rows, secretOk)
  if (!single.ok) return { ok: false, reason: single.reason, detail: single.detail }

  const live = (rows ?? []).filter(r => r && LIVE_STATUSES.has(String(r.status)))
  const boxes = live
    .filter(r => SENDABLE_STATUSES.has(String(r.status)))
    .filter(hasCredentials)
    // Same rank as the single picker: active before assigned, branded before pooled. A batch
    // should lean on the client's own domain first and use the second box as spread, not as
    // an equal-status coin toss.
    .sort((a, b) => rank(a) - rank(b))

  return { ok: true, boxes }
}

/** Shared rank so `pickSendingInbox` and `sendablePool` can never disagree about preference. */
function rank(r: InboxRow): number {
  return (String(r.status) === 'active' ? 0 : 1) * 10 + (String(r.kind) === 'branded' ? 0 : 1)
}

/**
 * CAN **THIS ONE MAILBOX** SEND? — the question the Engine board was answering wrongly.
 *
 * The board's chip read `has_smtp ? 'can send' : 'no SMTP details'`, which is **status-blind**:
 * a `warming` branded box with credentials saved rendered a green *"can send"* while
 * `pickSendingInbox` refuses it outright, because *sending on a warming mailbox is what
 * un-warms it*. So the one screen the founder checks before send-day said the opposite of what
 * the send path would do — the #565/#576 shape again, a calm colour over an untested claim.
 *
 * ⚠️ IT DELEGATES RATHER THAN RE-DERIVING. A single row IS a client with one mailbox, so
 * `pickSendingInbox([row])` is already the exact verdict — asking it keeps ONE rulebook. A
 * second copy of "warming may not send" in a UI helper is how the board and the sender start
 * disagreeing without anything failing.
 */
export type BoxVerdict =
  | { canSend: true }
  | { canSend: false; reason: RefusalReason; label: string }

export function boxSendVerdict(row: InboxRow, secretOk: boolean): BoxVerdict {
  const r = pickSendingInbox([row], secretOk)
  if (r.ok) return { canSend: true }
  return { canSend: false, reason: r.reason, label: refusalLabel(r.reason) }
}

export function pickSendingInbox(rows: InboxRow[], secretOk: boolean): Resolution {
  const live = (rows ?? []).filter(r => r && LIVE_STATUSES.has(String(r.status)))
  if (live.length === 0) {
    return {
      ok: false,
      reason: 'no_inbox',
      detail: 'This client has no sending mailbox assigned. Assign one in Vida before any outreach can leave.',
    }
  }

  const sendable = live.filter(r => SENDABLE_STATUSES.has(String(r.status)))
  if (sendable.length === 0) {
    return {
      ok: false,
      reason: 'warming_only',
      detail: 'The only mailbox for this client is still warming. Sending on a warming mailbox is what un-warms it — wait for it to go active, or assign a pooled mailbox to send from meanwhile.',
    }
  }

  // Branded-and-active beats pooled: it is the client's own domain, and once it is active
  // the pooled row is only still there to be released. Within a kind, prefer `active`.
  // ⚠️ The rank function moved to module scope (#610) so `sendablePool` uses THE SAME one —
  // two copies of a preference order is how the batch and the single send start disagreeing
  // about which mailbox is "first" without anything failing.
  const ordered = [...sendable].sort((a, b) => rank(a) - rank(b))

  const usable = ordered.find(hasCredentials)
  if (!usable) {
    return {
      ok: false,
      reason: 'no_credentials',
      detail: `Mailbox ${ordered[0].email} is assigned but has no SMTP details saved, so nothing can connect to it. Add the host, username and password in Vida → the client's inbox.`,
    }
  }

  if (!secretOk) {
    return {
      ok: false,
      reason: 'no_secret_key',
      detail: 'INBOX_SECRET_KEY is not set on the API, so the saved mailbox password cannot be read. Set it in Railway → @kind/api → Variables (64 hex characters).',
    }
  }

  return { ok: true, inbox: usable, from: fromHeader(usable) }
}

/**
 * The `From:` header. A display name matters on cold mail — a bare address reads as
 * machine-sent — but the ADDRESS must be the mailbox we are actually authenticated as, or
 * the receiving server sees a mismatch and treats it as spoofing.
 */
export function fromHeader(inbox: InboxRow): string {
  const name = (inbox.from_name ?? '').trim()
  return name ? `${name} <${inbox.email}>` : inbox.email
}

/**
 * Settle the port and the encryption mode together, because they are not independent:
 * **465 is implicit TLS, 587 is STARTTLS**, and mismatching them is the single most common
 * way an SMTP connection HANGS rather than failing — which reads as a dead product rather
 * than a wrong setting.
 *
 * Also the NaN guard. An empty port box gives `Number('')` → 0 and `Number(undefined)` →
 * NaN, and either one reaching the transport is a connection attempt to nowhere.
 */
export function normalisePort(port: unknown, secure?: unknown): { port: number; secure: boolean } {
  const n = Number(port)
  const p = Number.isFinite(n) && n > 0 && n <= 65535 ? Math.floor(n) : 587
  return { port: p, secure: typeof secure === 'boolean' ? secure : p === 465 }
}

/** Human wording for a refusal — one sentence an operator can act on, no jargon. */
export function refusalLabel(reason: RefusalReason): string {
  switch (reason) {
    case 'no_inbox':        return 'No sending mailbox assigned'
    case 'warming_only':    return 'Mailbox still warming — cannot send yet'
    case 'no_credentials':  return 'Mailbox has no SMTP details saved'
    case 'no_secret_key':   return 'API cannot read mailbox passwords (INBOX_SECRET_KEY unset)'
    // Its own reason, because "No sending mailbox assigned" sent the operator to configure a
    // mailbox that is already there, while the database was the thing that was down.
    // (Audit 27 Jul — the detail was honest, the LABEL was not.)
    case 'lookup_failed':   return 'Could not read this client\'s mailboxes — database problem, NOT a missing mailbox'
  }
}

/**
 * Read the client's mailboxes and decide. The DB half, kept thin on purpose — all the
 * judgement is in `pickSendingInbox`.
 */
export async function resolveSendingInbox(clientId: string): Promise<Resolution> {
  const { secretState } = await import('./inbox-secret')
  const { db } = await import('@kind/db')
  const { data, error } = await db
    .from('client_inboxes')
    .select('id, email, kind, status, provider, daily_cap, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
    .eq('client_id', clientId)

  if (error) {
    // A read failure is NOT permission to send from the shared address. Refuse, and say
    // which kind of problem it is so it isn't mistaken for "this client has no mailbox".
    return {
      ok: false,
      reason: 'lookup_failed',
      detail: `Could not read this client's mailboxes (${error.message ?? 'database error'}) — refusing to send rather than falling back to a shared sender. This is a DATABASE failure, not a missing mailbox: do not go and assign one.`,
    }
  }

  return pickSendingInbox((data ?? []) as InboxRow[], secretState().ok)
}
