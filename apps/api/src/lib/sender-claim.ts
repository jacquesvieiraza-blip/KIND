// ═══════════════════════════════════════════════════════════════════════════════════════
// CLAIM A POOLED SENDER, AND PROVE IT CAN SEND — the automatic half of P1 preparation.
//
// ── 🛑 WHAT THIS REPLACES: AN OPERATOR STEP THAT COULD NOT BE TAKEN ─────────────────────
//
// `preparation-readiness.ts` blocks READY_FOR_APPROVAL on `no_sender` and `sender_unverified`,
// and both were classified as blockers preparation CANNOT clear. The intended manual remedy
// was `POST /operator/inboxes/assign` — which requires an operator to TYPE a pooled address —
// followed by `POST /operator/inboxes/:id/verify`. But `assign` never set SMTP credentials, so
// `verifyInbox` refused every mailbox it created, and there was no inventory of pooled
// addresses anywhere in the product to type one FROM. The step was not slow. It was impossible.
//
// ── THE SHAPE, AS THE FOUNDER CHOSE IT (decision F, 16 Sep) ─────────────────────────────
//
// AVAILABILITY is `POOLED_SENDERS_JSON` (see `sender-pool.ts`). ASSIGNMENT is `client_inboxes`.
// Nothing new models either: the env says what exists, the database says who has what, and
// `verifyInbox` says whether it works.
//
// ── THE DATABASE IS THE ARBITER, NOT THIS CODE ──────────────────────────────────────────
//
// 🛑 A READ-THEN-INSERT WOULD BE A RACE, and an automatic claimer makes that race normal
// rather than theoretical: two programmes reaching the sender step together is exactly what a
// queue produces. So the read below is a FILTER (it saves pointless attempts), and the
// guarantee is `client_inboxes_one_live_per_email` — the partial unique index this build adds,
// because the pre-existing one is `(client_id, kind)` and proves nothing about an address being
// live on two clients. A lost race is caught as a unique violation and the next mailbox is
// tried, so a collision costs one attempt rather than a programme.
//
// ── AND NOTHING HERE EVER PRINTS A SECRET ───────────────────────────────────────────────
//
// ⚠️ The password's entire journey is: `sender-pool` (env) → `encryptSecret` →
// `client_inboxes.smtp_pass_enc`. It is never logged, never returned, and never placed in a
// problem string. Every log line in this file is checked by a test for exactly that.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { encryptSecret } from './inbox-secret'
import { senderPoolFromEnv, SENDER_POOL_ENV, senderIsReserved, type PooledSender } from './sender-pool'

/**
 * Statuses that mean "this mailbox is in play right now".
 *
 * ⚠️ MIRRORS THE INDEX'S OWN PREDICATE, and it must: a filter that admitted a status the
 * index constrains would attempt claims the database then refuses, and one that excluded a
 * status the index ignores would hide a free mailbox for ever.
 */
export const LIVE_CLAIM_STATUSES = ['assigned', 'warming', 'active'] as const

export type SenderClaim =
  | { ok: true; inboxId: string; email: string; verified: true }
  | { ok: false; reason: 'already_has_sender'; inboxId: string; email: string }
  | { ok: false; reason: 'no_inventory'; detail: string }
  | { ok: false; reason: 'all_taken'; detail: string }
  | { ok: false; reason: 'verify_failed'; inboxId: string; email: string; detail: string }
  | { ok: false; reason: 'unreadable'; detail: string }

/** Is a supabase-js error the unique-index refusal? The same check `meeting-truth` uses. */
function isUniqueViolation(e: { code?: string | null; message?: string | null } | null): boolean {
  if (!e) return false
  return e.code === '23505' || /duplicate key|unique constraint/i.test(e.message ?? '')
}

/**
 * Claim and verify a pooled sender for this client, if they do not already have one.
 *
 * ⚠️ IDEMPOTENT BY THE DATABASE'S OWN RULE. A client who already holds a live inbox gets
 * `already_has_sender` and NOTHING is written — the per-kind unique index would refuse a
 * second one anyway, and asking first means preparation running twice is free.
 *
 * ⚠️ IT NEVER "FIXES" AN EXISTING MAILBOX. If a client holds a live inbox that fails
 * verification, that is `sender_unverified` and an operator's problem — silently releasing
 * somebody's warmed mailbox and handing them a different one would be a destructive act taken
 * on their behalf.
 */
export async function claimPooledSender(clientId: string): Promise<SenderClaim> {
  // ── ① DOES THIS CLIENT ALREADY HAVE ONE? ───────────────────────────────────────────────
  let existing: { id: string; email: string } | null = null
  try {
    const { data, error } = await db.from('client_inboxes')
      .select('id, email').eq('client_id', clientId)
      .in('status', LIVE_CLAIM_STATUSES as unknown as string[])
      .limit(1).maybeSingle()
    if (error) return { ok: false, reason: 'unreadable', detail: `the client's mailboxes could not be read (${error.message})` }
    existing = (data as { id: string; email: string } | null) ?? null
  } catch (err) {
    return {
      ok: false, reason: 'unreadable',
      detail: err instanceof Error ? err.message : "the client's mailboxes could not be read",
    }
  }
  if (existing) {
    return { ok: false, reason: 'already_has_sender', inboxId: existing.id, email: existing.email }
  }

  // ── ② WHAT IS AVAILABLE AT ALL? ────────────────────────────────────────────────────────
  const pool = senderPoolFromEnv()
  if (pool.problems.length > 0) {
    // ⚠️ THE PROBLEMS ARE LOGGED EVEN WHEN A VALID SENDER IS FOUND. A malformed entry that
    // nobody ever sees is a mailbox silently missing from the pool, and the inventory is small
    // enough that a single bad line matters.
    console.error(`[sender-claim] ${SENDER_POOL_ENV} has ${pool.problems.length} unusable entr${pool.problems.length === 1 ? 'y' : 'ies'}: ${pool.problems.join(' | ')}`)
  }
  if (pool.senders.length === 0) {
    return {
      ok: false, reason: 'no_inventory',
      detail: pool.problems.length > 0
        ? `No pooled sending mailbox is available: every entry in ${SENDER_POOL_ENV} is unusable. ${pool.problems.join(' ')}`
        : `No pooled sending mailbox is available — ${SENDER_POOL_ENV} is not set, so there is nothing to assign. Add a mailbox to it in Railway → @kind/api.`,
    }
  }

  // ── ③ WHICH ARE ALREADY LIVE SOMEWHERE? A FILTER, NOT THE GUARANTEE. ──────────────────
  const taken = new Set<string>()
  try {
    const { data, error } = await db.from('client_inboxes')
      .select('email').in('status', LIVE_CLAIM_STATUSES as unknown as string[])
    if (error) return { ok: false, reason: 'unreadable', detail: `live mailboxes could not be listed (${error.message})` }
    for (const r of ((data ?? []) as { email: string | null }[])) {
      if (r.email) taken.add(r.email.trim().toLowerCase())
    }
  } catch (err) {
    return {
      ok: false, reason: 'unreadable',
      detail: err instanceof Error ? err.message : 'live mailboxes could not be listed',
    }
  }

  // ── 🛑 ⚑ 16 Sep (GAP 1) — AND K.I.N.D'S OWN ADDRESSES, BELT AND BRACES ───────────────
  //
  // `parseSenderPool` already drops a reserved address, so this is defence in depth rather
  // than the primary fence — and it is here deliberately. This module is one import away from
  // being called by something new that builds its own candidate list, and the consequence of
  // getting it wrong once is a client sending cold outreach AS K.I.N.D from K.I.N.D's own
  // domain. A second, cheap check at the moment of the claim is the right trade.
  const reserved = pool.senders.filter(s => senderIsReserved(s.email))
  if (reserved.length > 0) {
    console.error(`[sender-claim] ${reserved.length} reserved K.I.N.D address(es) reached the candidate list and were refused at the claim — the inventory parser should already have dropped them.`)
  }
  const candidates = pool.senders.filter(s => !taken.has(s.email) && !senderIsReserved(s.email))
  if (candidates.length === 0) {
    return {
      ok: false, reason: 'all_taken',
      detail: `Every pooled mailbox in ${SENDER_POOL_ENV} (${pool.senders.length}) is already live on a client. Add another mailbox before more programmes can reach Ready for Approval.`,
    }
  }

  // ── ④ CLAIM, AND LET THE INDEX DECIDE ─────────────────────────────────────────────────
  let lastRefusal: string | null = null
  for (const sender of candidates) {
    const inserted = await insertClaim(clientId, sender)
    if (inserted.kind === 'lost_race') {
      // Somebody else took it between the filter and the insert. Try the NEXT mailbox — that
      // is the whole reason this is a loop rather than a single attempt.
      console.warn(`[sender-claim] ${sender.email} was claimed by another programme first; trying the next mailbox.`)
      continue
    }
    if (inserted.kind === 'error') {
      lastRefusal = inserted.detail
      console.error(`[sender-claim] could not assign ${sender.email} to client ${clientId}: ${inserted.detail}`)
      continue
    }

    // ── ⑤ PROVE IT CAN SEND, IMMEDIATELY AND WITHOUT SENDING ANYTHING ──────────────────
    //
    // `verifyInbox` opens the connection and authenticates. It sends no message, which is the
    // distinction that matters: the alternative is discovering a wrong password when a real
    // prospect's email fails at 3am.
    const { verifyInbox } = await import('./mailer')
    const result = await verifyInbox({
      id: inserted.id,
      email: sender.email,
      kind: 'pooled',
      status: 'assigned',
      smtp_host: sender.smtp_host,
      smtp_port: sender.smtp_port,
      smtp_secure: sender.smtp_secure,
      smtp_user: sender.smtp_user,
      smtp_pass_enc: inserted.passEnc,
      from_name: sender.from_name ?? null,
    })
    const stampedAt = new Date().toISOString()
    // ⚠️ THE SAME COLUMNS AND THE SAME SHAPE `POST /inboxes/:id/verify` ALREADY WRITES. A
    // FAILED CHECK CLEARS `verified_at`: a mailbox that worked in July and has since had its
    // password changed must not keep a stale green stamp.
    const stamp = result.ok
      ? { verified_at: stampedAt, verify_failed_at: null, verify_detail: result.message }
      : { verified_at: null, verify_failed_at: stampedAt, verify_detail: result.message }
    const { error: stampErr } = await db.from('client_inboxes').update(stamp).eq('id', inserted.id)
    if (stampErr) {
      // ── ⚑ 18 Sep (J14-C2 · LR 21) — A STAMP THAT DID NOT LAND IS A FAILED VERIFICATION ──
      //
      // ⛓️ WHAT STOOD HERE: ~~a `console.error` and nothing else~~, so a mailbox whose SMTP
      // check PASSED and whose result could not be written returned
      // `{ ok: true, verified: true }`. The row still said `verified_at: null` — because the
      // write is the only thing that sets it — so `programmeSenderSafety` refused the
      // programme with `sender_unverified` while the claim that produced it had just reported
      // success. Preparation recorded no sender problem, and the blocker arrived from a
      // different module with no explanation of where it came from.
      //
      // 🛑 THE CHECK IS NOT THE VERIFICATION. Nothing downstream reads the SMTP answer; they
      // all read the COLUMN. A result nobody can read has not verified anything, whatever the
      // mailbox said, and that is the whole of this item: a failed stamp write IS a failed
      // verification.
      //
      // ⚠️ THE ROW STAYS ASSIGNED AND UNVERIFIED, exactly as on a failed check below — which
      // is the state the gate already refuses, with the mailbox's own sentence on it.
      console.error(`[sender-claim] verification ran for ${sender.email} but the result could not be stored: ${stampErr.message}. Treating the mailbox as NOT verified.`)
      return {
        ok: false, reason: 'verify_failed', inboxId: inserted.id, email: sender.email,
        detail: result.ok
          ? `The mailbox answered and let us in, but the result could not be stored (${stampErr.message}). Nothing downstream can read a check that was not recorded, so this mailbox counts as unverified until it is checked again.`
          : `The mailbox refused us (${result.message}) and the result could not be stored either (${stampErr.message}).`,
      }
    }

    if (!result.ok) {
      // 🛑 THE ROW STAYS. It is assigned and unverified, which is EXACTLY the state
      // `sender_unverified` refuses — so the programme cannot freeze Ready for Approval, and
      // Vida shows the blocker with the mailbox's own sentence on it. Releasing the row and
      // trying the next mailbox would walk the whole pool into an unverified state on one
      // misconfiguration, and an operator would have no single thing to fix.
      console.error(`[sender-claim] ${sender.email} was assigned to client ${clientId} but FAILED verification. Preparation stops here.`)
      return {
        ok: false, reason: 'verify_failed',
        inboxId: inserted.id, email: sender.email, detail: result.message,
      }
    }

    console.log(`[sender-claim] client ${clientId} assigned pooled mailbox ${sender.email} and it verified. Preparation continues.`)
    return { ok: true, inboxId: inserted.id, email: sender.email, verified: true }
  }

  return {
    ok: false, reason: 'all_taken',
    detail: lastRefusal
      ? `No pooled mailbox could be assigned. The last attempt failed: ${lastRefusal}`
      : `Every pooled mailbox was claimed by another programme while this one was being prepared. Try again.`,
  }
}

type Inserted =
  | { kind: 'ok'; id: string; passEnc: string }
  | { kind: 'lost_race' }
  | { kind: 'error'; detail: string }

/**
 * Write the assignment row.
 *
 * ⚠️ THE PASSWORD IS ENCRYPTED BEFORE IT IS WRITTEN, with `encryptSecret` — the same function
 * the add-mailbox form uses, so one `INBOX_SECRET_KEY` reads every stored password and there
 * is no second at-rest format to maintain.
 *
 * ⚠️ `status: 'assigned'` IS DELIBERATE, NOT `'active'`. `assigned` is sendable under the
 * existing sender-safety rules and is what a pooled mailbox has always been given; `warming`
 * is a branded-mailbox concept and inventing a new status would put a value in the column that
 * no existing rule knows how to read.
 */
async function insertClaim(clientId: string, sender: PooledSender): Promise<Inserted> {
  let passEnc: string
  try {
    passEnc = encryptSecret(sender.smtp_pass)
  } catch (err) {
    // ⚠️ THE MESSAGE NAMES THE CAUSE, NOT THE VALUE. `encryptSecret` throws when
    // INBOX_SECRET_KEY is unset or the password is empty.
    return {
      kind: 'error',
      detail: err instanceof Error
        ? `the mailbox password could not be encrypted (${err.message})`
        : 'the mailbox password could not be encrypted',
    }
  }

  try {
    const { data, error } = await db.from('client_inboxes').insert({
      client_id: clientId,
      email: sender.email,
      kind: 'pooled',
      status: 'assigned',
      provider: 'smtp',
      smtp_host: sender.smtp_host,
      smtp_port: sender.smtp_port,
      smtp_secure: sender.smtp_secure,
      smtp_user: sender.smtp_user,
      smtp_pass_enc: passEnc,
      from_name: sender.from_name ?? null,
    }).select('id').single()
    if (error) {
      // 🛑 A UNIQUE VIOLATION IS NOT AN ERROR HERE — it is the answer. Either this address went
      // live on another client between the filter and this insert (try the next one), or this
      // client acquired an inbox concurrently (the per-kind index), which the caller's first
      // check will report on the retry.
      if (isUniqueViolation(error)) return { kind: 'lost_race' }
      return { kind: 'error', detail: error.message }
    }
    return { kind: 'ok', id: String((data as { id: string }).id), passEnc }
  } catch (err) {
    return {
      kind: 'error',
      detail: err instanceof Error ? err.message : 'the mailbox row could not be written',
    }
  }
}
