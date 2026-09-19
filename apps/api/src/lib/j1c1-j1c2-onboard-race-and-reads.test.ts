// ══════════════════════════════════════════════════════════════════════════════════════════
// J1-C1 + J1-C2 · THE ONBOARD RACE, AND THE READS THAT DECIDE IT
//
// These two items are one read/write path and cannot be separated without leaving a broken
// state in between: J1-C2's silent reads are HOW J1-C1's race produces a second client row.
//
// ── J1-C2 · THE READS ───────────────────────────────────────────────────────────────────
//
// Four decisive reads in `POST /auth/onboard` destructure `{ data }` and discard the error:
//
//     const { data: referrer }   = await db.from('clients')       // who referred them
//     const { data: partner }    = await db.from('partners')      // which partner code
//     const { data: existing }   = await db.from('clients')       // ⚠️ do they already exist
//     const { data: existingSub }= await db.from('subscriptions') // ⚠️ is the entitlement there
//
// 🛑 EACH FAILS INTO A DIFFERENT WRONG ANSWER, and two of them are irreversible:
//
//   · an unreadable REFERRER read drops the attribution, and `referred_by` is set ONCE at
//     creation and deliberately never updated — so the referral is lost for ever;
//   · an unreadable EXISTING read answers "this user is new", which takes the INSERT branch
//     for somebody who already has a client row;
//   · an unreadable SUBSCRIPTION read answers "no entitlement", which inserts a second one.
//
// ── J1-C1 · THE RACE ────────────────────────────────────────────────────────────────────
//
// The shape is check-then-insert with no fence: read `existing`, branch, INSERT. Two
// concurrent onboards for one auth user both read `null` and both insert.
//
// 🛑 AND `clients.user_id` CARRIES NO UNIQUE INDEX — searched across `supabase/migrations`
// and `pending-migrations.ts`; there is none. So the loser does not collide, it SUCCEEDS: one
// auth user, two client rows, and every downstream `.eq('user_id', …).maybeSingle()` then picks
// one of them arbitrarily. Their Proof claim, their wallet and their programme can end up on
// the row their next request does not read.
//
// ⚠️ THE FIX IS BOTH HALVES, AND THE APPLICATION HALF IS THE ONE THAT WORKS TODAY. The index
// is a pending migration the founder runs; until it is applied the route must still converge,
// and after it is applied the route must complete against the winner rather than 500 on the
// duplicate-key error. Both are asserted here.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const SRC = readFileSync(join(__dirname, '../routes/auth.ts'), 'utf8')
const CODE = SRC.split('\n')
  .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

/** The onboard handler's body, to the start of the next route registration. */
const ONBOARD = (() => {
  const at = CODE.indexOf("authRouter.post('/onboard'")
  expect(at, 'the onboard route moved — this guard must be repointed').toBeGreaterThan(-1)
  const next = CODE.indexOf('authRouter.', at + 30)
  return CODE.slice(at, next > at ? next : CODE.length)
})()

describe('J1-C2 · every decisive read in onboard checks its error', () => {
  it('🛑 no read destructures `data` without its `error`', () => {
    const bad: string[] = []
    for (const m of ONBOARD.matchAll(/const\s*\{\s*data(?::\s*\w+)?\s*\}\s*=\s*await\s*db\s*\.from\(([^)]*)\)/g)) {
      bad.push(m[1].trim())
    }
    expect(
      bad,
      'a failed read becomes a wrong answer: no referrer, a new user who is not new, or a '
      + 'missing entitlement that is already there',
    ).toEqual([])
  })

  it('🛑 the EXISTING-client read refuses rather than guessing "new"', () => {
    // The most dangerous of the four: guessing "new" takes the INSERT branch for somebody who
    // already has a row, which is the second-client-row defect J1-C1 is about.
    const at = ONBOARD.indexOf("from('clients')\n      .select('id, signup_terms_accepted_at, contact_email')")
    expect(at, 'the existing-client read moved — this guard must be repointed').toBeGreaterThan(-1)
    expect(ONBOARD.slice(at - 200, at + 500), 'an unreadable answer still takes the insert branch')
      .toMatch(/existingErr/)
  })

  it('🛑 a lost REFERRAL is refused, not dropped — it can never be set again', () => {
    // `referred_by` is written ONLY on the insert and deliberately never updated, so a
    // referral dropped by a transient read error is gone permanently.
    const at = ONBOARD.indexOf('UUID_RE.test(referred_by)')
    expect(at).toBeGreaterThan(-1)
    expect(ONBOARD.slice(at, at + 900)).toMatch(/refErr|referrerErr|partnerErr/)
  })
})

describe('J1-C1 · a duplicate onboard completes against the winner', () => {
  it('🛑 a failed INSERT re-reads and completes, rather than 500-ing over the winner\'s row', () => {
    const at = ONBOARD.indexOf('Insert failed')
    expect(at, 'the insert error path moved — this guard must be repointed').toBeGreaterThan(-1)
    const around = ONBOARD.slice(Math.max(0, at - 1400), at + 400)
    expect(
      around,
      'the loser of the race still throws — the account EXISTS and the client is told it failed',
    ).toMatch(/winner|raceWinner/)
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ⛓️ 18 Sep — UNPARKED. FOUNDER DECISION B.
  //
  // These two cases were written, verified, and then SKIPPED for one turn: the migration they
  // ask for trips a GLOBAL migration count inside `house-authority.test.ts`, one of XC-10's
  // five frozen files, and a fourth edit there was not mine to make. It was raised as a STOP
  // under MVP1_STOP_AND_SCOPE_RULES §1 (frozen-test conflict) and the founder ruled:
  //
  //     "B APPROVED. Authorise removing the one global migration-count assertion … that
  //      global migration-count tripwire is already enforced by the non-frozen
  //      migration/schema tests and is structurally blocking every future legitimate
  //      migration." — founder, 18 Sep 2026
  //
  // ⚠️ THE FROZEN FILE LOST EXACTLY ONE `expect`, and nothing else. Both House XOR
  // constraints, the "A1 appears exactly once" invariant and both named Batch 1 migration
  // keys are untouched, and the count/key/uniqueness protection continues to live where it
  // belongs — `migration-home.test.ts`, `schema-drift.test.ts` and
  // `batch1-frozen-assertion-successors.test.ts`.
  // ══════════════════════════════════════════════════════════════════════════════════════
  it('🛑 the race fence exists as a migration the founder can run', () => {
    const mig = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
    expect(mig, 'nothing fences two client rows for one auth user at the database').toMatch(/clients_one_per_user/)
    expect(mig, 'the index is not unique, so it fences nothing').toMatch(/create unique index/i)
  })

  it('🛑 the migration REFUSES to run over existing duplicates rather than failing half-way', () => {
    // A bare `CREATE UNIQUE INDEX` on a table that already holds duplicates aborts — and
    // deciding which of two client rows to keep is a data decision, never a migration's.
    const mig = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
    const at = mig.indexOf('clients_one_per_user')
    const block = mig.slice(Math.max(0, at - 2000), at + 2000)
    expect(block, 'the migration does not check for duplicates first').toMatch(/duplicate|RAISE NOTICE/i)
    expect(block, 'the migration would merge or delete a client row by itself')
      .not.toMatch(/delete from public\.clients|update public\.clients set user_id/i)
  })
})
