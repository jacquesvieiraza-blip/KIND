// ═══════════════════════════════════════════════════════════════════════════════════════
// WHICH MAILBOX SENDS FOR THIS PROGRAMME — and the two ways that answer can be unsafe.
//
// `resolveSendingInbox` already answers "can this client send at all?" honestly: status,
// credentials, the secret key, and a refusal reason rather than a shrug. What it does NOT
// answer is either of the questions a PROGRAMME raises, because it was written for a client
// with one mailbox and a legacy campaign.
//
// ── ① AMBIGUITY. Two equally-ranked boxes is an arbitrary choice, not a decision ─────────
//
// The picker sorts by rank — active before assigned, branded before pooled — and takes the
// first. With one clear winner that is deterministic and fine. With TWO boxes of identical
// rank the winner is whatever order the database happened to return, so the sender recorded in
// the approved snapshot and the sender that actually sends can differ between two reads of the
// same data. A frozen snapshot whose sender is a coin toss freezes nothing.
//
// ⚠️ THIS DOES NOT UNDO #610 ROTATION. The founder ruled "inbox x 2 yes for now but volume is
// key", and a second box at a LOWER rank is exactly that: a deterministic first choice with
// spread behind it. Only a TIE at the top is refused, because only a tie is genuinely arbitrary.
//
// ── ② THE SAME PHYSICAL MAILBOX SERVING TWO LIVE CLIENTS ────────────────────────────────
//
// `client_inboxes` is keyed per client, so nothing stops the same address being attached to
// two of them. That is not a tidiness problem: two programmes sending as the same human, with
// two different stories, two different suppression lists and one shared reputation. When it
// bounces, both burn, and neither client's controls can see the other's sends.
//
// ⚠️ FAIL CLOSED, AND NAME THE OTHER CLIENT. An operator cannot fix "something is wrong with
// the mailbox"; they can fix "this address is also live on client X".
//
// 🛑 AND IT GRANTS NOTHING. This module refuses or stays quiet. It assigns no mailbox, writes
// no row and sends nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

export type SenderSafety =
  | { ok: true; inboxId: string; email: string | null; status: string | null; kind: string | null }
  | {
      ok: false
      reason: 'no_sender' | 'ambiguous_sender' | 'shared_sender' | 'unverified_sender' | 'unreadable'
      detail: string
    }

/** Statuses that mean "this mailbox is in play right now" — mirrors `sending-inbox.ts`. */
const LIVE_STATUSES = new Set(['assigned', 'warming', 'active'])

/** Named in the refusal so a missing column sends somebody to the runner, not to the code. */
export const INBOX_VERIFICATION_MIGRATION = '20260910_inbox_verification'
/** The same rank the picker uses. Duplicated here would be a second rulebook; imported below. */

/**
 * Is this client's sending mailbox safe to bind a PROGRAMME to?
 *
 * ⚠️ IT DELEGATES THE "CAN SEND" QUESTION rather than re-deriving it — `resolveSendingInbox` is
 * the one rulebook for warming, credentials and the secret key, and a second copy here is how
 * a console and a sender start disagreeing about the same mailbox.
 */
/**
 * ⚑ 2 Oct (#2547 · 7e) — the words every screen uses for a sender-safety refusal, so Vida, the
 * System check and the send gate give ONE answer. Before this the board and the System check
 * asked only `pickSendingInbox` and said "can send" for a mailbox the gate refuses (a tie, or a
 * mailbox shared live with another client).
 */
export function senderSafetyLabel(reason: Exclude<SenderSafety, { ok: true }>['reason']): string {
  switch (reason) {
    case 'ambiguous_sender':  return 'Two mailboxes tie — which one sends is not decided'
    case 'shared_sender':     return 'This mailbox is live on another client too'
    case 'unverified_sender': return 'The mailbox has not been verified'
    case 'no_sender':         return 'No mailbox can send'
    case 'unreadable':        return 'The mailboxes could not be read'
  }
}

/** The send gate's own answer for one client, in the shape the screens show. */
export async function screenSendVerdict(
  clientId: string,
  safety: (clientId: string) => Promise<SenderSafety> = programmeSenderSafety,
): Promise<{ canSend: true } | { canSend: false; reason: string; label: string; detail: string }> {
  const s = await safety(clientId)
  return s.ok ? { canSend: true } : { canSend: false, reason: s.reason, label: senderSafetyLabel(s.reason), detail: s.detail }
}

export async function programmeSenderSafety(clientId: string): Promise<SenderSafety> {
  const { resolveSendingInbox, sendablePool } = await import('./sending-inbox')
  const { secretState } = await import('./inbox-secret')

  const chosen = await resolveSendingInbox(clientId)
  if (!chosen.ok) {
    // ── 🛑 ⚑ 10 Sep (I2) — A DATABASE FAILURE IS NOT A MISSING MAILBOX ─────────────────
    //
    // ⛓️ THIS LINE USED TO FLATTEN EVERY REFUSAL TO `no_sender`, which quietly undid a fix
    // `sending-inbox.ts` already carries: it gave `lookup_failed` its own reason on 27 Jul
    // precisely because *"No sending mailbox assigned"* sent an operator off to configure a
    // mailbox that was already there, while the database was the thing that was down. The
    // detail sentence was honest; the REASON was not, and the reason is what callers branch on.
    //
    // ⚠️ IT WEAKENS NOTHING. Both answers refuse. What changes is that readiness now reports a
    // degraded read rather than a missing mailbox, and the Vida panel can tell a client's
    // problem apart from ours.
    const reason = chosen.reason === 'lookup_failed' ? 'unreadable' : 'no_sender'
    return { ok: false, reason, detail: chosen.detail }
  }

  const { data: rows, error } = await db.from('client_inboxes')
    .select('id, email, kind, status, provider, daily_cap, smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass_enc, from_name')
    .eq('client_id', clientId)
  if (error) {
    return { ok: false, reason: 'unreadable', detail: `This client's mailboxes could not be re-read to check for an ambiguous sender (${error.message}), so nothing may be bound to them.` }
  }

  // ── ① ⛓️ 2 Oct (#2559 · R189 ②) — ~~A TIE AT THE TOP IS AMBIGUOUS~~ ──────────────────
  //
  // Two equally-ranked boxes used to be refused as `ambiguous_sender`: which one sent was row
  // order, not a decision. R189 ② makes two mailboxes per client the RULE — *"2 mailboxes, set
  // up before approval and approved together"* — and the send run now keeps each person on the
  // mailbox that first emailed them (#2559 part 1), so a tie decides nothing about anybody. The
  // pair is frozen together in the approval (`preparation-snapshot.ts`). What every box must
  // still prove, it proves below: not live on another client, and able to log in.
  const pool = sendablePool((rows ?? []) as Parameters<typeof sendablePool>[0], secretState().ok)
  if (!pool.ok) return { ok: false, reason: 'no_sender', detail: pool.detail }
  const boxes = pool.boxes

  // ── ② THE SAME ADDRESS LIVE ON ANOTHER CLIENT ────────────────────────────────────────
  // ⚑ 2 Oct (#2559) — EVERY box that can carry a person's email is checked, not only the first.
  const email = chosen.inbox.email ?? null
  for (const sendingBox of boxes.length ? boxes : [chosen.inbox]) {
  const email = sendingBox.email ?? null   // shadows the outer one: this box's own address
  if (email) {
    const { data: shared, error: sharedErr } = await db.from('client_inboxes')
      .select('client_id, status').eq('email', email)
    if (sharedErr) {
      return { ok: false, reason: 'unreadable', detail: `It could not be checked whether ${email} is also live on another client (${sharedErr.message}), so nothing may be bound to it.` }
    }
    const others = ((shared ?? []) as { client_id: string | null; status: string | null }[])
      .filter(r => r.client_id && r.client_id !== clientId && LIVE_STATUSES.has(String(r.status)))
    if (others.length > 0) {
      return {
        ok: false, reason: 'shared_sender',
        detail: `${email} is also live on ${others.length} other client(s) (${others.map(o => o.client_id).join(', ')}). Two programmes sending as the same person share one reputation and cannot see each other's suppression — this must be resolved before either sends.`,
      }
    }
  }
  }

  // ── ③ ⚑ 10 Sep (I2) — HAS ANYONE PROVED THIS MAILBOX CAN ACTUALLY LOG IN? ────────────
  //
  // ⛓️ THE GAP THIS CLOSES. Everything above — and everything in `sending-inbox.ts` — asks
  // whether the ROW is well formed: a live status, a host, a username, a saved password, a
  // readable secret key. None of it asks whether those credentials WORK. `verifyInbox` has
  // answered exactly that since #552 and its result was thrown away, so a typed-but-wrong
  // password passed readiness, reached READY_FOR_APPROVAL, and was discovered when a real
  // prospect's first email failed on a warmed mailbox.
  //
  // ⚠️ NEVER-CHECKED AND FAILED ARE DIFFERENT SENTENCES, because they send an operator to
  // different places: one is a button nobody has pressed, the other is a credential to fix.
  //
  // 🛑 FAIL CLOSED BEFORE THE MIGRATION RUNS, AND NAME IT. An unreadable verification state
  // is not permission to send — but the refusal has to say what to run, or it reads as a
  // broken mailbox and an operator goes looking for one.
  for (const sendingBox of boxes.length ? boxes : [chosen.inbox]) {
  const email = sendingBox.email ?? null
  const { data: vRows, error: vErr } = await db.from('client_inboxes')
    .select('verified_at, verify_failed_at, verify_detail').eq('id', sendingBox.id).limit(1)
  if (vErr) {
    return {
      ok: false, reason: 'unreadable',
      detail: `Whether ${email ?? 'this mailbox'} has ever proved it can log in could not be read (${vErr.message}). `
        + `If the columns are missing, run migration ${INBOX_VERIFICATION_MIGRATION} from the Vida migration runner. `
        + 'Nothing may be bound to an unverifiable mailbox.',
    }
  }
  const v = ((vRows ?? []) as { verified_at: string | null; verify_failed_at: string | null; verify_detail: string | null }[])[0]
  if (!v?.verified_at) {
    return {
      ok: false, reason: 'unverified_sender',
      detail: v?.verify_failed_at
        ? `${email ?? 'This mailbox'} failed its last login check, so it cannot send. ${v.verify_detail ?? ''} `.trim()
          + ' Fix the credentials and press Test connection again in Vida → the client\'s inbox.'
        : `Nobody has proved ${email ?? 'this mailbox'} can log in. Press Test connection on it in Vida → the client's inbox — `
          + 'it authenticates and sends nothing. Until it passes, a wrong password would only be discovered when a real '
          + 'prospect\'s first email failed on a warmed mailbox.',
    }
  }
  }

  return {
    ok: true,
    inboxId: String(chosen.inbox.id),
    email,
    status: (chosen.inbox.status as string | null) ?? null,
    kind: (chosen.inbox.kind as string | null) ?? null,
  }
}
