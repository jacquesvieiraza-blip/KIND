import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// PR1A — THE NIGHTLY PAID SOURCING TOP-UP IS RETIRED.
//
// It fired daily at 08:20 UTC, walked every paid client with a positive `sourcing_allowance`
// and topped their desk back up to 200 undecided leads. Nobody asked for those leads. Under
// the new commercial model, sourcing spend requires explicit PROGRAMME AUTHORITY, and a
// scheduler holds authority from nobody.
//
// ⚠️ WHY THESE GUARDS STRIP COMMENTS FIRST. The retirement notes left behind in `cron.ts`
// and `internal.ts` deliberately QUOTE the removed schedule line verbatim, so that anyone
// reading the file later can see exactly what used to run. A guard asserting
// `not.toContain("callInternal('/leads/top-up')")` against the raw source would therefore be
// satisfied by the very prose explaining the removal — it would pass while the cron was live
// and fail when the explanation was good. Every source assertion below runs against
// COMMENT-STRIPPED code, so it can only ever be answered by real executable text.
//
// ⚠️ NOTHING HERE EXECUTES A SOURCING JOB. These are static source assertions: no provider
// is called, no database is touched, no cron is started, `startWorkForClient` is never
// invoked. That is deliberate — a test that ran the top-up to prove it no longer runs would
// be the defect it was written to prevent.

const API = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')

/**
 * Executable text only — every whole-line `//` comment removed.
 *
 * ⚠️ WHY THIS EXISTS RATHER THAN `stripCommentsForEnvScan`. That helper is the repo's
 * general stripper and it is correct on small inputs, but on `apps/api/src/routes/internal.ts`
 * it returns the retirement comment block BELOW verbatim — both `startWorkForClient` mentions
 * survive it (verified: 2 raw occurrences, 2 after stripping). Something earlier in that
 * ~1,900-line file puts it into a mode it never leaves, so from that point on it stops
 * removing comments. A guard written on top of it would therefore have been answered by the
 * prose explaining the removal — the exact self-matching failure these guards exist to avoid.
 *
 * This is deliberately the dumbest thing that cannot be wrong for THIS job: the retirement
 * notes are all whole-line comments, so dropping whole-line comments is sufficient and its
 * behaviour is obvious on inspection. A trailing `// …` on a line of real code leaves the
 * code, which is what we want — that line is still executable.
 *
 * The `stripCommentsForEnvScan` shortcoming is reported to the founder as an out-of-scope
 * finding (PR1A is a money-safety change, not a test-tooling change); it is NOT fixed here.
 */
function codeOnly(src: string): string {
  return src
    .split('\n')
    .filter(line => !line.trim().startsWith('//'))
    .join('\n')
}

const cronSrc     = API('../cron.ts')
const internalSrc = API('../routes/internal.ts')
const cronCode     = codeOnly(cronSrc)
const internalCode = codeOnly(internalSrc)

describe('the nightly paid top-up is no longer scheduled', () => {
  it('no cron schedules the 08:20 UTC top-up', () => {
    expect(cronCode).not.toContain("callInternal('/leads/top-up')")
    expect(cronCode).not.toContain('/leads/top-up')
  })

  it('the 08:20 UTC slot itself is gone — not merely repointed at another job', () => {
    // The defect this catches is a "fix" that keeps the slot and swaps the target, which
    // would leave an unattended 08:20 job spending money under a different name.
    expect(cronCode).not.toMatch(/cron\.schedule\(\s*'20 8 \* \* \*'/)
  })

  it('NO cron anywhere invokes the top-up path, under any quoting', () => {
    // Bound to the registry rather than to one line: any re-added schedule, however it is
    // written, has to name the route, and the route name cannot appear in executable code.
    const schedules = cronCode.match(/cron\.schedule\([^\n]*/g) ?? []
    for (const s of schedules) {
      expect(s, `a cron still references the top-up: ${s}`).not.toContain('top-up')
    }
  })

  it('the comment-stripping is real — the raw file DOES still mention it, on purpose', () => {
    // Proves the guards above are not passing because the stripper ate everything, and pins
    // the historical record in place: the explanation must survive, the schedule must not.
    expect(cronSrc).toContain('/leads/top-up')
    expect(cronSrc).toContain('RETIRED')
  })
})

describe('unrelated scheduled work is untouched — this retires one job, not the scheduler', () => {
  // A retirement that quietly took neighbouring jobs with it would be invisible until the
  // morning something did not run. These are the jobs registered either side of the removed
  // line, plus a spread across the file.
  const stillScheduled = [
    '/clients/cold-check',
    '/ae/low-credits',
    '/leads/drip',
    '/clients/chase-unpaid',
    '/figsy/send-due-all',
    '/milla/morning-brief-all',
    '/onboarding/activation-sequence',
    '/subscriptions/check-lapsed',
    '/metrics/snapshot',
  ]

  for (const route of stillScheduled) {
    it(`${route} is still scheduled`, () => {
      expect(cronCode).toContain(`callInternal('${route}')`)
    })
  }

  it('the scheduler still registers a full complement of jobs', () => {
    const count = (cronCode.match(/cron\.schedule\(/g) ?? []).length
    // 32 before this change, 31 after. Pinned as a floor so a future accidental deletion of
    // several jobs cannot pass by merely being "fewer than before".
    expect(count).toBe(31)
  })
})

describe('the endpoint refuses rather than being left loaded', () => {
  const at = internalCode.indexOf("internalRouter.post('/leads/top-up'")

  it('the route still exists — retired, not deleted', () => {
    expect(at).toBeGreaterThan(-1)
  })

  it('it answers 410 and nothing else', () => {
    const body = internalCode.slice(at, at + 800)
    expect(body).toContain('res.status(410)')
    expect(body).not.toContain('res.json({ success: true')
  })

  it('the retired handler cannot source: no sourcing call survives inside it', () => {
    // The precise regression: a handler that still reaches startWorkForClient is a handler
    // that still spends, whatever its HTTP status says.
    const body = internalCode.slice(at, at + 800)
    expect(body).not.toContain('startWorkForClient')
    expect(body).not.toContain('paidClientIds')
    expect(body).not.toContain('PACK_SOURCE_TARGET')
    expect(body).not.toContain('sourcing_allowance')
  })

  it('no executable code in internal.ts calls startWorkForClient any more', () => {
    // `internal.ts` had exactly one such caller — this one. If a second appears, it is a new
    // unattended sourcing path and this guard is the thing that says so.
    expect(internalCode).not.toContain('startWorkForClient')
  })
})

describe('the explicitly-triggered sourcing paths are deliberately left alone', () => {
  it('startWorkForClient still exists and is still used by the paths a human triggers', () => {
    const startWork = API('./start-work.ts')
    expect(startWork).toContain('export async function startWorkForClient')

    // The Stripe payment webhook is a human paying — authority exists there today, and
    // replacing it with programme authority is later work, explicitly out of PR1A's scope.
    const stripeCode = codeOnly(API('../routes/stripe.ts'))
    expect(stripeCode).toContain('startWorkForClient')
  })
})
