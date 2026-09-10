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

  // ── ① A TIE AT THE TOP IS AMBIGUOUS ──────────────────────────────────────────────────
  const pool = sendablePool((rows ?? []) as Parameters<typeof sendablePool>[0], secretState().ok)
  if (!pool.ok) return { ok: false, reason: 'no_sender', detail: pool.detail }
  const boxes = pool.boxes
  if (boxes.length > 1) {
    const rankOf = (r: { status?: unknown; kind?: unknown }) =>
      (String(r.status) === 'active' ? 0 : 1) * 10 + (String(r.kind) === 'branded' ? 0 : 1)
    const top = rankOf(boxes[0])
    const tied = boxes.filter(b => rankOf(b) === top)
    if (tied.length > 1) {
      return {
        ok: false, reason: 'ambiguous_sender',
        detail: `This client has ${tied.length} equally-ranked sending mailboxes (${tied.map(b => b.email ?? b.id).join(', ')}), so which one sends is decided by row order rather than by a decision. Retire or re-rank one before binding a programme to it — a frozen snapshot whose sender is arbitrary freezes nothing.`,
      }
    }
  }

  // ── ② THE SAME ADDRESS LIVE ON ANOTHER CLIENT ────────────────────────────────────────
  const email = chosen.inbox.email ?? null
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
  const { data: vRows, error: vErr } = await db.from('client_inboxes')
    .select('verified_at, verify_failed_at, verify_detail').eq('id', chosen.inbox.id).limit(1)
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

  return {
    ok: true,
    inboxId: String(chosen.inbox.id),
    email,
    status: (chosen.inbox.status as string | null) ?? null,
    kind: (chosen.inbox.kind as string | null) ?? null,
  }
}
