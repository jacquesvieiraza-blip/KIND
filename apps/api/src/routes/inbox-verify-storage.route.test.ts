// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I2) — THE CHECK WAS ALWAYS RIGHT. ITS ANSWER WENT NOWHERE.
//
// `POST /operator/inboxes/:id/verify` has called `verifyInbox` since #552 and it does exactly
// the right thing: it opens the SMTP connection, authenticates, and sends nothing. The RESULT
// was written into an `operator_audit_log` row's `detail` as a boolean nobody reads, and
// nowhere else. So every gate downstream could ask *"does this row have a host, a username and
// a password saved?"* and none of them could ask *"do those credentials actually work?"*.
//
// 🛑 THE COST, FOR A FRESH CLIENT SPECIFICALLY. A typo in a password satisfies every existing
// requirement, passes readiness, reaches READY_FOR_APPROVAL, and is discovered when a real
// prospect's first email fails on a warmed mailbox — the expensive way to find out.
//
// ⚠️ THESE CASES ASSERT THE WRITE, NOT THE CHECK. `verifyInbox` itself is already covered
// elsewhere; what is on trial here is whether the route records what it said, and whether the
// three files that have to agree about these columns actually do.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'

// ⚠️ NO DATABASE MOCK, AND THAT IS DELIBERATE. What is on trial here is not what the handler
// returns — it is whether THREE FILES AGREE: the route writes the columns, the migration
// creates them, and the sender gate reads them. A mock that satisfied all three at once would
// prove only that the mock was consistent. These assertions read the real files.

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROUTE = readFileSync(join(__dirname, 'operator.ts'), 'utf8')


/** The exact body of the verify handler, so the assertions are about THAT route. */
function verifyHandler(): string {
  const at = ROUTE.indexOf("operatorRouter.post('/inboxes/:id/verify'")
  expect(at, 'the verify route has moved or been renamed').toBeGreaterThan(-1)
  const next = ROUTE.indexOf('operatorRouter.', at + 20)
  return ROUTE.slice(at, next === -1 ? ROUTE.length : next)
}

describe('① the verify route records what the mailbox said', () => {
  it('🛑 a PASS is written to the row, not only to an audit detail nobody reads', () => {
    const body = verifyHandler()
    expect(body, 'the verification result is still thrown away').toContain("db.from('client_inboxes').update(")
    expect(body).toContain('verified_at:')
  })

  it('🛑 A FAILED CHECK CLEARS `verified_at` — a mailbox that once worked is not still verified', () => {
    // An App Password revoked in August must not leave a July success standing. The failure
    // branch has to write `verified_at: null`, not merely stamp a failure beside it.
    const body = verifyHandler()
    const fail = body.slice(body.indexOf(': {', body.indexOf('result.ok')))
    expect(fail, 'a failed check leaves a stale verified_at in place').toContain('verified_at: null')
    expect(fail).toContain('verify_failed_at:')
  })

  it('the operator-facing sentence is stored on both branches', () => {
    const body = verifyHandler()
    expect((body.match(/verify_detail: result\.message/g) ?? []).length,
      'one of the two branches records no reason').toBe(2)
  })

  it('🛑 a failed WRITE does not break the check — the operator still hears the answer', () => {
    // Before the migration runs these columns do not exist. An operator pressing Test
    // connection must still be told what the mailbox said; the gate that consumes the column
    // fails closed on its own, so this route does not need to.
    const body = verifyHandler()
    expect(body).toContain('if (stampErr)')
    expect(body).toContain('20260910_inbox_verification')
    expect(body, 'a missing column would 500 the check itself').not.toContain('throw stampErr')
  })

  it('the write is scoped to BOTH the inbox and its client', () => {
    // ⚠️ `.eq('id', …)` ALONE WOULD BE ENOUGH TO FIND THE ROW and would also be enough to stamp
    // another tenant's mailbox if an id were guessed. The read above is already client-scoped;
    // the write must be too.
    const body = verifyHandler()
    const at = body.indexOf("db.from('client_inboxes').update(")
    const stmt = body.slice(at, at + 500)
    expect(stmt).toContain(".eq('id', req.params.id)")
    expect(stmt).toContain(".eq('client_id', client.id)")
  })
})

describe('② the migration and the gate agree about the column names', () => {
  it('🛑 every column the route writes exists in the migration it names', () => {
    // A stamp written to a column the migration never creates is a silent no-op that would
    // leave every mailbox permanently unverified — with the route reporting success.
    const MIG = readFileSync(join(__dirname, '..', 'lib', 'pending-migrations.ts'), 'utf8')
    const at = MIG.indexOf("key: '20260910_inbox_verification'")
    expect(at, 'the migration is not in the runner').toBeGreaterThan(-1)
    const entry = MIG.slice(at, at + 2000)
    for (const col of ['verified_at', 'verify_failed_at', 'verify_detail']) {
      expect(entry, `the migration does not create ${col}`).toContain(`ADD COLUMN IF NOT EXISTS ${col}`)
    }
  })

  it('the sender gate reads the same three columns', () => {
    const GATE = readFileSync(join(__dirname, '..', 'lib', 'programme-sender.ts'), 'utf8')
    expect(GATE).toContain("select('verified_at, verify_failed_at, verify_detail')")
    expect(GATE).toContain('INBOX_VERIFICATION_MIGRATION')
  })
})
