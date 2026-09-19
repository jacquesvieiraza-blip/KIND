// ══════════════════════════════════════════════════════════════════════════════════════════
// J14-C2 · A STAMP THAT DID NOT LAND IS A FAILED VERIFICATION (LR 21)
//
// REQ: *"Failed stamp write is a failed verification."*
// RED: *"Stamp write fails and verification reports success."*
//
// ── THE CHECK IS NOT THE VERIFICATION, AND THAT IS THE WHOLE ITEM ───────────────────────
//
// `verifyInbox` opens the SMTP connection and authenticates. Nothing downstream ever sees that
// answer: `programmeSenderSafety` reads `client_inboxes.verified_at`, and the only thing that
// sets that column is the stamp write. So a mailbox that PASSED its check and whose stamp
// write failed produced this:
//
//   · `claimPooledSender` returned `{ ok: true, verified: true }` — success;
//   · the row still read `verified_at: null`;
//   · `preparation` therefore recorded NO sender problem;
//   · and readiness refused the programme with `sender_unverified`, from a different module,
//     with nothing anywhere explaining where the refusal came from.
//
// A result nobody can read has verified nothing, whatever the mailbox said.
//
// ── BOTH WRITERS, BECAUSE THE PROPERTY IS ABOUT THE COLUMN, NOT ABOUT ONE FUNCTION ──────
//
// The automatic path (`sender-claim.ts`, R129) and the operator's Test connection button
// (`POST /operator/inboxes/:id/verify`) write the same three columns in the same shape. Fixing
// one and leaving the other would make this guard a half-truth.
//
// ⚠️ AND THE OPERATOR ROUTE'S EXISTING RULE IS KEPT, NOT REVERSED. A failed write still does
// not break the check, there is still no throw, and the operator still hears exactly what the
// mailbox said — before the migration runs, the columns do not exist, and a person pressing
// Test connection must still be told the answer. What changes is that an unrecorded pass is no
// longer REPORTED as a verification.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE AUTOMATIC PATH (R129)
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J14-C2 · the pooled claim refuses a verification it could not record', () => {
  const CLAIM = code('./sender-claim.ts')
  const stampBlock = (() => {
    const at = CLAIM.indexOf("const { error: stampErr } = await db.from('client_inboxes').update(stamp)")
    expect(at, 'the stamp write moved — this guard must be repointed').toBeGreaterThan(-1)
    const end = CLAIM.indexOf('if (!result.ok) {', at)
    expect(end, 'the failed-check branch moved').toBeGreaterThan(at)
    return CLAIM.slice(at, end)
  })()

  it('🛑 A FAILED STAMP RETURNS `verify_failed` — it does not log and carry on', () => {
    expect(stampBlock, 'a stamp that did not land is still reported as a success')
      .toMatch(/return \{\s*ok: false, reason: 'verify_failed'/)
  })

  it('🛑 AND IT RETURNS BEFORE THE SUCCESS PATH CAN BE REACHED', () => {
    // The whole defect was `{ ok: true, verified: true }` for a mailbox the column says is
    // unverified. The refusal has to be a `return`, not a flag somebody reads later.
    const at = CLAIM.indexOf('if (stampErr) {')
    const ok = CLAIM.indexOf('return { ok: true, inboxId: inserted.id')
    expect(at, 'the stamp failure is no longer handled').toBeGreaterThan(-1)
    expect(ok, 'the success return moved').toBeGreaterThan(at)
    expect(CLAIM.slice(at, ok), 'nothing returns success between the stamp failure and the end')
      .toMatch(/reason: 'verify_failed'/)
  })

  it('it names the mailbox and says what actually happened, both ways round', () => {
    // The operator needs to tell "the password is wrong" from "the database refused the
    // write" — they are different jobs, and one of them is not about the mailbox at all.
    expect(stampBlock).toContain('email: sender.email')
    expect(stampBlock).toContain('the result could not be stored')
    expect(stampBlock, 'a failed CHECK plus a failed write reads as a storage problem alone')
      .toContain('The mailbox refused us')
  })

  it('🛑 THE ROW IS NOT RELEASED — assigned-and-unverified is the state the gate refuses', () => {
    // Releasing the claim and trying the next mailbox would walk the pool into an unverified
    // state on one storage fault, and leave an operator nothing single to fix.
    expect(stampBlock, 'the claim row is deleted or released on a storage failure')
      .not.toMatch(/\.delete\(|release|status: 'released'/)
  })

  it('and the caller turns it into the Vida sentence it already had', () => {
    // `verify_failed` is a reason `programme-preparation` already renders, so this needed no
    // new code path — which is why it is the right reason rather than a new one.
    expect(code('./programme-preparation.ts'))
      .toContain("senderClaim.reason === 'verify_failed'")
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE OPERATOR'S TEST CONNECTION BUTTON
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J14-C2 · the operator is not told a mailbox is verified when nothing recorded it', () => {
  const ROUTE = code('../routes/operator.ts')
  const handler = (() => {
    const at = ROUTE.indexOf("operatorRouter.post('/inboxes/:id/verify'")
    expect(at, 'the verify route has moved or been renamed').toBeGreaterThan(-1)
    return ROUTE.slice(at, ROUTE.indexOf('operatorRouter.', at + 20))
  })()

  it('🛑 AN UNRECORDED PASS COMES BACK AS `ok: false`', () => {
    expect(handler, 'the mailbox\'s own answer is still reported as the verdict')
      .toMatch(/const answer = stampErr\s*\?\s*\{ ok: false/)
    expect(handler).toContain('res.json({ success: true, data: answer })')
    expect(handler, 'the raw result is still what the operator is shown')
      .not.toContain('res.json({ success: true, data: result })')
  })

  it('and the sentence says which of the two things failed', () => {
    expect(handler).toContain('the result could not be recorded')
    expect(handler).toContain('is NOT verified')
    // The mailbox's own words survive — the operator still needs them.
    expect(handler).toMatch(/\$\{result\.message\}/)
  })

  it('🛑 THE EXISTING RULE IS KEPT — a failed write still does not break the check', () => {
    // Before the migration runs these columns do not exist, and a person pressing Test
    // connection must still be told what the mailbox said. That property is older than this
    // item and is not what changed.
    expect(handler).toContain('if (stampErr)')
    expect(handler).toContain('20260910_inbox_verification')
    expect(handler, 'a missing column would 500 the check itself').not.toContain('throw stampErr')
  })

  it('🛑 and the audit records THREE facts, not one', () => {
    // Collapsing "the mailbox answered", "we stored it" and "this counts as verified" into a
    // single boolean is what let an unrecorded pass read as a verification.
    expect(handler).toContain('detail: { connection_ok: result.ok, stored: !stampErr, verified: result.ok && !stampErr }')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ WHY IT MATTERS — THE COLUMN IS WHAT EVERY GATE READS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J14-C2 · nothing downstream reads the SMTP answer', () => {
  it('🛑 the sender gate reads the COLUMN, never a claim result', () => {
    const GATE = code('./programme-sender.ts')
    expect(GATE).toContain("select('verified_at, verify_failed_at, verify_detail')")
    expect(GATE).toContain('if (!v?.verified_at)')
    expect(GATE, 'the gate takes a verification verdict from the claim instead of the row')
      .not.toContain('claimPooledSender')
  })

  it('and readiness still refuses an assigned-but-unverified mailbox', () => {
    expect(code('./preparation-readiness.ts')).toContain('sender_unverified')
  })
})
