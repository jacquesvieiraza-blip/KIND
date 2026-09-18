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
  // 🛑 PARKED — BLOCKED BY A FROZEN TEST, AND THE FOUNDER'S DECISION IS REQUIRED (STOP §1)
  //
  // The two cases below are WRITTEN AND CORRECT and are deliberately not running. The
  // migration they ask for was authored, verified against them, and then withdrawn, because
  // adding any entry to `PENDING_MIGRATIONS` trips a GLOBAL migration count inside
  // `house-authority.test.ts` — one of XC-10's five frozen files, in which the founder
  // authorised exactly THREE hunks under Fable's C-3 ruling. A fourth edit is not mine to make.
  //
  // ⚠️ THE FROZEN FILE ITSELF NAMES THE PROBLEM AND THE REMEDY, at that very line: *"THIS FILE
  // IS NO-TOUCH AND THE COUNT IS THE REASON IT KEEPS CONFLICTING … the tripwire has no House
  // invariant in it, so every future batch collides with it. The same tripwire lives in
  // `migration-home.test.ts` and `schema-drift.test.ts`, which is where it belongs … this line
  // is kept in step, not relied upon."*
  //
  // 🛑 IT IS STRUCTURAL, NOT LOCAL. It blocks EVERY remaining item in this wave that needs a
  // migration, which is why it was raised rather than worked around.
  //
  // ⚠️ THE APPLICATION HALF IS SHIPPED AND IS NOT WAITING ON THIS. The route converges on the
  // winning row with or without the index; what the index adds is that the second insert is
  // REFUSED rather than merely unlikely to be noticed.
  // ══════════════════════════════════════════════════════════════════════════════════════
  it.skip('🛑 PARKED (frozen-test conflict) · the race fence exists as a migration the founder can run', () => {
    const mig = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
    expect(mig, 'nothing fences two client rows for one auth user at the database').toMatch(/clients_one_per_user/)
    expect(mig, 'the index is not unique, so it fences nothing').toMatch(/create unique index/i)
  })

  it.skip('🛑 PARKED (frozen-test conflict) · the migration refuses to run over existing duplicates', () => {
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
