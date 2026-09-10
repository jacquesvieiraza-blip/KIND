// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I7) — CLOSING THE `status = 'passed'` QUESTION.
//
// ── THE ANSWER, UP FRONT ────────────────────────────────────────────────────────────────
//
// `'passed'` is **not an anomaly**. It is the intended value, written by exactly ONE function
// and read by eight as an exclusion. The product depends on it working.
//
// What is genuinely wrong is that THIS REPO HOLDS THREE INCONSISTENT RECORDS of what
// `leads.status` may contain, and they disagree about this exact value:
//
//   ① packages/db/src/schema.sql — a CHECK allowing
//        pending · scored · consent_sent · consent_given · exported · rejected · opted_out
//      No 'passed'. No 'contacted' either.
//
//   ② supabase/migrations/20260525_fix_leads_status_and_figsy_memory.sql — DROPs and re-ADDs
//      `leads_status_check` to add 'contacted'. STILL no 'passed'.
//
//   ③ supabase/migrations/20260723_operator_audit_log.sql — states, in its own words,
//      "PROD REALITY (learned on first run, 23 Jul): leads.status is an ENUM (lead_status)"
//      and runs `ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'passed'`.
//      ⚠️ THAT MIGRATION IS NOT IN THE RUNNER. It was applied outside it.
//
// So the most likely production shape is an ENUM that DOES permit 'passed', and the CHECK the
// other two files describe was probably never applied to prod — which is what ③ says outright.
//
// 🛑 WHICH ONE PRODUCTION ACTUALLY CARRIES CANNOT BE READ FROM THIS REPOSITORY. That is a
// RUNTIME question and this file does not pretend to answer it. What it does is pin the trace,
// so the next person does not rediscover it, and prove the code behaves safely under EITHER.
//
// ── WHAT WAS ACTUALLY BROKEN, AND IS NOW FIXED ──────────────────────────────────────────
//
// Not the value — the REPORTING. `passLead` destructured `{ data }` only and returned
// `data ? 'passed' : 'not_found'`, so a refused write was indistinguishable from "no such
// lead" and the route answered 404 "Lead not found or already actioned" to a client looking
// straight at the card. It now returns a third outcome, `'failed'`, carrying the reason.
//
// ── THE FOUNDER'S STANDING DECISION, UNCHANGED ──────────────────────────────────────────
//
// "Do NOT add 'passed' to the CHECK constraint at this stage." Nothing in this stack does, and
// this file asserts that nothing has.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

const SCHEMA = read('packages/db/src/schema.sql')
const CHECK_MIGRATION = read('supabase/migrations/20260525_fix_leads_status_and_figsy_memory.sql')
const ENUM_MIGRATION = read('supabase/migrations/20260723_operator_audit_log.sql')
const RUNNER = read('apps/api/src/lib/pending-migrations.ts')

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE THREE RECORDS, PINNED
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① three records of one column, and they disagree', () => {
  it('schema.sql\'s CHECK does NOT permit `passed`', () => {
    const at = SCHEMA.indexOf("check (status in ('pending','scored'")
    expect(at, 'the leads.status CHECK has moved — re-trace before trusting this file').toBeGreaterThan(-1)
    const clause = SCHEMA.slice(at, SCHEMA.indexOf('))', at))
    expect(clause).not.toContain("'passed'")
    expect(clause, 'the snapshot has drifted from what this trace recorded').toContain("'opted_out'")
  })

  it('the 25 May migration re-adds the CHECK with `contacted` and still no `passed`', () => {
    expect(CHECK_MIGRATION).toContain('DROP CONSTRAINT IF EXISTS leads_status_check')
    expect(CHECK_MIGRATION).toContain("'contacted'")
    const at = CHECK_MIGRATION.indexOf('ADD CONSTRAINT leads_status_check')
    const clause = CHECK_MIGRATION.slice(at, CHECK_MIGRATION.indexOf('));', at))
    expect(clause, 'the 25 May CHECK now permits `passed` — the trace is stale').not.toContain("'passed'")
  })

  it('🛑 the 23 July migration says production is an ENUM, and adds `passed` to it', () => {
    expect(ENUM_MIGRATION).toContain('PROD REALITY')
    expect(ENUM_MIGRATION).toContain('leads.status is an ENUM (lead_status)')
    expect(ENUM_MIGRATION).toContain("ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'passed'")
  })

  it('🛑 AND THAT MIGRATION IS NOT IN THE RUNNER — it was applied outside it', () => {
    // This is the whole reason the repo cannot answer the question: the migration that most
    // likely describes production is not one the runner has ever applied or can replay.
    expect(RUNNER.includes('20260723_operator_audit_log'),
      'the enum migration joined the runner — re-trace, the answer may have changed').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② IT IS THE INTENDED VALUE, NOT AN ANOMALY
// ═══════════════════════════════════════════════════════════════════════════════════════

const API = join(__dirname)
const libFiles = () => readdirSync(API).filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts'))
const executable = (src: string) => src.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

describe('② one writer, many readers — the product depends on it', () => {
  it('🛑 exactly ONE place writes it', () => {
    const writers = libFiles().filter(f =>
      executable(readFileSync(join(API, f), 'utf8')).includes("status: 'passed'"))
    // `demo-mbf.ts` fabricates a demo cast and is not a real write path; it is named rather
    // than filtered so a future reader can see it was considered.
    expect(writers.filter(f => f !== 'demo-mbf.ts'),
      `more than one path writes status='passed': ${writers.join(', ')}`).toEqual(['approve-lead.ts'])
  })

  it('and several read it as an exclusion, so removing it would surface passed prospects again', () => {
    const readers = libFiles().filter(f =>
      executable(readFileSync(join(API, f), 'utf8')).includes("neq('status', 'passed')"))
    expect(readers.length,
      'the exclusion readers have gone — a client who said "not a fit" would see the card again')
      .toBeGreaterThanOrEqual(4)
  })

  it('the review suppression list names it alongside the other two dead ends', () => {
    const src = read('apps/api/src/lib/programme-review.ts')
    expect(src).toContain("REVIEW_SUPPRESSED_STATUSES = ['passed', 'rejected', 'opted_out']")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ THE CODE IS SAFE UNDER EITHER SHAPE
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ whichever definition production carries, the client is told the truth', () => {
  it('🛑 a refused write is its own outcome, not "lead not found"', () => {
    const src = read('apps/api/src/lib/approve-lead.ts')
    expect(src).toContain("Promise<{ status: 'passed' | 'not_found' | 'failed'; detail?: string }>")
    const at = src.indexOf('export async function passLead')
    const body = src.slice(at, at + 1400)
    expect(body, 'the write error is being swallowed again').toContain('if (error) {')
    expect(body).toContain("return { status: 'failed', detail: error.message }")
  })

  it('🛑 and the client\'s reason survives a refused status write', () => {
    // The feedback row is written BEFORE the status write, so if the column refuses, the
    // two-attempt rule and Vida's evidence still see the rejection.
    const src = read('apps/api/src/routes/leads.ts')
    const at = src.indexOf("leadRouter.post('/:id/pass'")
    expect(at, 'the pass route has moved').toBeGreaterThan(-1)
    const body = src.slice(at, at + 3000)
    const feedbackAt = body.indexOf('lead_feedback')
    const passAt = body.indexOf('passLead(')
    expect(feedbackAt, 'no feedback is recorded on the pass route').toBeGreaterThan(-1)
    expect(passAt).toBeGreaterThan(-1)
    expect(feedbackAt, "the client's reason is written AFTER the status write, so a refusal loses it")
      .toBeLessThan(passAt)
  })

  it('🛑 THE CONSTRAINT IS STILL NOT WIDENED — the founder\'s standing decision', () => {
    // "Do NOT add 'passed' to the CHECK constraint at this stage." Nothing in the runner may
    // quietly do it, including as part of some other migration.
    //
    // ⚠️ THE CHECK IS FOR DDL, NOT FOR THE WORD. The runner MENTIONS `leads_status_check` twice
    // — once in a comment and once inside a COMMENT ON COLUMN string — and both are explaining
    // why the set-aside reason is a COLUMN rather than a status. Banning the word would fail on
    // the very text that records the decision. This repo has been caught by that shape before.
    expect(RUNNER, "a migration in the runner now alters leads_status_check — that is the founder's call, not ours")
      .not.toMatch(/(ADD|DROP)\s+CONSTRAINT[^;]*leads_status_check/i)
    expect(RUNNER, 'a migration in the runner now widens the lead_status enum')
      .not.toMatch(/ALTER\s+TYPE\s+lead_status/i)
  })

  it('and the set-aside reason stayed a COLUMN rather than becoming a status', () => {
    // The same decision, taken once already: `20260910_lead_set_aside_reason` is a text column
    // precisely so the constraint the whole outreach path writes through is left alone.
    const mig = read('supabase/migrations/20260910_lead_set_aside_reason.sql')
    expect(mig).toContain('set_aside_reason')
    expect(mig, 'the set-aside work widened the status constraint after all').not.toContain('leads_status_check\n  CHECK')
  })
})
