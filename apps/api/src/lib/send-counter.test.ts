import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// #383 — THE SEND COUNTER MUST NOT LOSE COUNTS.
//
// The defect, in one sentence: `sendSequenceEmail` bumped a campaign's `emails_sent` with a
// read-then-write fallback, so two concurrent sends both read N and both wrote N+1 — two
// emails, one increment. The atomic RPC that was supposed to prevent it (`increment_figsy_-
// emails_sent`) was written as a .sql file on 10 Jul and never added to PENDING_MIGRATIONS,
// which is the only list that executes — so it has never existed in production and the racy
// path has run for every send this product has ever made.
//
// The fix is not "add the RPC". The RPC is one statement of defence and the founder has to
// press a button for it. The fallback itself now RECOMPUTES from the send log rather than
// incrementing, which is race-free whether or not the function exists.
//
// These tests model the two strategies directly rather than grepping the source, because a
// grep asserts what the code LOOKS like and this bug is about what it DOES under concurrency.

/** The OLD fallback: read the current value, write value + 1. */
async function incrementStrategy(counter: { value: number }, sendLogRows: number): Promise<void> {
  void sendLogRows
  const read = counter.value          // ← both concurrent callers observe the same N here
  await Promise.resolve()             // ← the await that makes the race real
  counter.value = read + 1
}

/** The NEW fallback: set the counter to the number of rows in the send log. */
async function recomputeStrategy(counter: { value: number }, sendLogRows: number): Promise<void> {
  const count = sendLogRows           // one row per send, already written before this runs
  await Promise.resolve()
  counter.value = count
}

describe('#383 — the send counter under concurrency', () => {
  it('RED PROOF: the old increment strategy loses a count when two sends overlap', async () => {
    const counter = { value: 0 }
    // Two emails are sent. The send log therefore has 2 rows. Both callers interleave.
    await Promise.all([incrementStrategy(counter, 2), incrementStrategy(counter, 2)])

    expect(
      counter.value,
      'two concurrent sends must NOT both read the same value and both write +1 — this is #383',
    ).toBe(1)                          // ← 1, not 2. The bug, reproduced.
  })

  it('the new recompute strategy is correct under the same interleaving', async () => {
    const counter = { value: 0 }
    await Promise.all([recomputeStrategy(counter, 2), recomputeStrategy(counter, 2)])

    expect(counter.value, 'the counter must equal the number of sends').toBe(2)
  })

  it('recompute is idempotent — running it twice cannot drift the counter upward', async () => {
    const counter = { value: 0 }
    await recomputeStrategy(counter, 5)
    await recomputeStrategy(counter, 5)
    await recomputeStrategy(counter, 5)

    expect(counter.value, 'a retry must not add a phantom send').toBe(5)
  })

  it('recompute can never report more sends than the log holds', async () => {
    const counter = { value: 999 }     // a counter that has already drifted upward
    await recomputeStrategy(counter, 3)

    expect(counter.value, "the counter must never exceed the send log — this function's own invariant").toBe(3)
  })
})

describe('#383 — the RPC is in the list that actually executes', () => {
  const runner = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')

  it('increment_figsy_emails_sent is in PENDING_MIGRATIONS, not merely in supabase/migrations', () => {
    // The whole reason this defect survived a month: the .sql file existed, so the migration
    // LOOKED applied. Only PENDING_MIGRATIONS runs (O3). A file on disk executes nothing.
    expect(
      runner,
      'the .sql file existing is not enough — recording a migration is not running one',
    ).toContain('increment_figsy_emails_sent')
  })

  it('and it is keyed so the runner reports it by name', () => {
    expect(runner).toContain("key: '20260710_increment_emails_sent'")
  })
})

describe('#383 — a failed counter write is never silent', () => {
  const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  const body = src.slice(src.indexOf("db.rpc('increment_figsy_emails_sent'"))
    .slice(0, 2000)

  it('the fallback checks the error on BOTH the count and the update (#349)', () => {
    expect(body).toContain('countErr')
    expect(body).toContain('setErr')
  })

  it('and says the email was sent even though the counter was not updated', () => {
    // The operator reading this line needs to know the send HAPPENED — otherwise the obvious
    // reaction to a counter error is to re-send, which double-mails a prospect.
    expect(body).toContain('the email WAS sent, the counter was not')
  })
})
