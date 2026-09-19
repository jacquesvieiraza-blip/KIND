// ══════════════════════════════════════════════════════════════════════════════════════════
// J20-C2 · NO CLAIM, NO AUTOMATIC SENDING (LR 17)
//
// REQ: *"Missing claims table = no automatic sending."*
// RED: *"claims table absent (F-DBREAD): cron sends anyway."*
//
// ── THE RULE THAT WAS HERE, AND WHY IT WAS ONLY HALF RIGHT ──────────────────────────────
//
// `cron.ts` said it in its own words: *"The claim table missing means the migration has not
// been run. The job RUNS ANYWAY — failing closed would stop every send, digest, drip and
// charge across the business to prevent a doubling that only happens above one replica."*
//
// That reasoning is sound for a digest and a watchdog. The cost of stopping them is certain;
// the cost of doubling them is one extra email to our own customer.
//
// 🛑 IT IS NOT SOUND FOR OUTBOUND. Doubling a prospect send is the same stranger emailed twice
// in one instant from a cold mailbox — the fastest way there is to burn a sending domain, and
// the one thing outreach cannot take back. So the two jobs that email somebody who is not our
// customer stand down without a claim, and everything else keeps the behaviour it has.
//
// ⚠️ "LOUDLY" IS THREE PLACES, NOT ONE. The log, the founder alert (which is also the
// `operator_tasks` row), and a `cron_runs` row — because a refusal that leaves no row looks
// exactly like a job that never fired, on the one panel an operator checks.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// ⚠️ THE MODULE IS IMPORTED FOR ITS LIST, NOT RUN. `cron.ts` pulls `@kind/db` at import time,
// which throws without service credentials — so the two collaborators are stubbed. Nothing
// here schedules anything: the schedule lives inside a function this file never calls.
vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({}) } }))
vi.mock('node-cron', () => ({ default: { schedule: () => ({}), getTasks: () => new Map() } }))

const { CLAIMLESS_REFUSED_JOBS, refusesWithoutClaim } = await import('../cron')

const CRON = readFileSync(join(__dirname, '../cron.ts'), 'utf8')
const code = CRON
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .split('\n')
  .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
  .join('\n')

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE LIST, AND WHAT IS ON IT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C2 · the jobs that email a stranger are named', () => {
  it('🛑 THE SEQUENCE SENDER IS ON THE LIST', () => {
    expect(refusesWithoutClaim('/figsy/send-due-all')).toBe(true)
  })

  it('🛑 AND SO IS THE SELF-OUTREACH JOB — it sources, enrols AND sends in one pass', () => {
    expect(refusesWithoutClaim('/cmo/self-outreach')).toBe(true)
  })

  it('every scheduled outbound path in this file is on the list', () => {
    // 🛑 READ FROM THE SCHEDULE, NOT FROM MEMORY. A new outbound job added to the cron and not
    // to this list would send twice on an unclaimed slot, and nothing else in the file would
    // notice. The two names below are the ones that reach a prospect's inbox.
    for (const scheduled of ['/figsy/send-due-all', '/cmo/self-outreach']) {
      expect(code, `${scheduled} is no longer scheduled — this guard must be repointed`)
        .toContain(`callInternal('${scheduled}')`)
      expect(CLAIMLESS_REFUSED_JOBS, `${scheduled} sends but does not stand down without a claim`)
        .toContain(scheduled)
    }
  })

  it('🛑 AND THE REST OF THE BUSINESS IS NOT STOPPED — that was the reason for the old rule', () => {
    // Failing every job closed to prevent a doubling that only happens above one replica is
    // what the original decision refused, and it is still refused.
    for (const keepsRunning of ['/digest/weekly', '/clients/chase-unpaid', '/leads/drip',
                                '/nexus/recompute-all', '/figsy/check-performance']) {
      expect(refusesWithoutClaim(keepsRunning), `${keepsRunning} now stops when the claim table is missing`)
        .toBe(false)
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE REFUSAL ITSELF
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C2 · an unclaimed slot stops the send before anything runs', () => {
  const branch = (() => {
    const at = code.indexOf("if (claim.kind === 'unavailable') {")
    expect(at, 'the unavailable branch moved — this guard must be repointed').toBeGreaterThan(-1)
    return code.slice(at, code.indexOf('if (!ADMIN_KEY)', at))
  })()

  it('🛑 IT RETURNS — the job does not carry on to the internal call', () => {
    expect(branch).toContain('if (refusesWithoutClaim(path)) {')
    expect(branch).toMatch(/return\s*$|return\n/m)
    // And it stands down BEFORE the fetch, which is what makes "nothing was sent" true.
    const fetchAt = code.indexOf('await fetch(`${API_BASE}/internal${path}`')
    expect(fetchAt, 'the internal call moved').toBeGreaterThan(-1)
    expect(code.indexOf('if (refusesWithoutClaim(path)) {')).toBeLessThan(fetchAt)
  })

  it('🛑 AND IT IS LOUD IN THREE PLACES — log, alert, and a run row', () => {
    expect(branch).toContain('console.error')
    expect(branch).toContain('reportClaimUnavailable(path, claim)')
    expect(branch, 'the refusal leaves no run row, so it looks like a job that never fired')
      .toContain('await recordCronRun(path,')
    expect(branch).toContain('stood down:')
  })

  it('the row is recorded as NOT ok — a stand-down is not a success', () => {
    expect(branch).toMatch(/recordCronRun\(path, new Date\(\)\.toISOString\(\), false,/)
  })

  it('🛑 A TAKEN SLOT IS STILL A QUIET STAND-DOWN, not a failure', () => {
    // Another replica winning the race is the guard WORKING. Reporting that as an exception
    // would fill the queue with rows that mean everything is fine.
    const taken = code.slice(code.indexOf("if (claim.kind === 'taken')"), code.indexOf("if (claim.kind === 'unavailable')"))
    expect(taken).toContain('standing down')
    expect(taken, 'a healthy race is being reported as a failure').not.toContain('recordCronRun')
    expect(taken).not.toContain('sendFounderAlert')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE ALERT NO LONGER SAYS SOMETHING THAT STOPPED BEING TRUE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J20-C2 · the alert describes what actually happens now', () => {
  it('🛑 IT SAYS OUTBOUND STOOD DOWN, and names the jobs', () => {
    expect(code).toContain('Outbound sending STANDS DOWN while this persists')
    expect(code).toContain('CLAIMLESS_REFUSED_JOBS.join')
  })

  it('🛑 AND IT NO LONGER CLAIMS EVERY JOB IS STILL RUNNING', () => {
    expect(code, 'the alert still tells the founder that all jobs are running')
      .not.toContain('Jobs are still running, deliberately')
    expect(code).toContain('Every other job still runs, deliberately')
  })

  it('it still names the migration, which is the thing to go and do', () => {
    expect(CRON).toContain('20260727_cron_claims')
  })

  it('🛑 and the claim is still attempted FIRST, before the admin key', () => {
    // Two replicas with no key would otherwise each raise the "all crons are disabled" alert —
    // the same duplication one layer up. The order is older than this item and is not what
    // changed.
    const claimAt = code.indexOf('const claim = await claimCronSlot(path, new Date())')
    const keyAt = code.indexOf('if (!ADMIN_KEY)')
    expect(claimAt).toBeGreaterThan(-1)
    expect(keyAt).toBeGreaterThan(claimAt)
  })
})
