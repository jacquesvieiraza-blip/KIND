import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

// #406 — THE PORTAL ELEMENT SWEEP. Guards for the four lies this pass removed.
//
// SCOPE, stated because it is the load-bearing decision of this sweep. #406 says "every screen
// in apps/portal", which is 104 pages. A client can reach 19 of them. `middleware.ts` redirects
// every signed-in client off `/dashboard/*` to the matching `/milla/*` screen, so a dead button
// on a retired dashboard page is not a lie told to anyone. What IS client-facing is:
//   • 9 native Milla pages, and the MillaShell chrome around all of them
//   • 10 more via 13-line Milla wrappers that render a (dashboard) page inside the Milla frame
//     — those dashboard files ARE the client's screen, reached by wrapper rather than by URL,
//     which is exactly how they escaped the last sweep
//
// Each test below pins one defect found by reading those files, and would fail if it returned.

const PORTAL = join(__dirname, '../../../portal/src')
// COMMENTS ARE STRIPPED BEFORE EVERY ASSERTION, and that is not a detail. The first run of
// this file failed four ways — on the comments THIS PASS ADDED, which quote the old copy in
// order to record what was removed and why. A guard that cannot tell a live string from an
// explanation of its removal forces the next person to delete the reasoning along with the
// code. Same lesson as #607's copy guard; same shared stripper.
const read = (rel: string) => stripCommentsForEnvScan(readFileSync(join(PORTAL, rel), 'utf8'))

describe('no invented numbers on a client screen', () => {
  const analytics = read('app/(dashboard)/dashboard/analytics/page.tsx')

  it('the unsubscribe count is never derived from a percentage of replies', () => {
    // WAS: `Math.round(m.replies * 0.05)` — an invented unsubscribe figure, plotted on a chart
    // the client can select, ONE LINE BELOW the comment "never fabricate a bounce number".
    expect(analytics).not.toMatch(/replies\s*\*\s*0\.05/)
    expect(analytics).not.toMatch(/Math\.round\([^)]*\*\s*0\.0\d/)
  })

  it('and it comes from the server, which is the only place that can count it', () => {
    // The portal receives `month` as a display label ("Jan 26"), so it cannot match a reply's
    // YYYY-MM timestamp — which is why the old code gave up and fabricated. The API holds the
    // month key, so it counts there.
    expect(analytics).toContain('m.unsubscribed ?? 0')
    const leads = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8'))
    expect(leads).toMatch(/unsubscribed:\s*mReplies\.filter/)
  })

  it('metrics with no data source cannot be selected as if they were measured', () => {
    // A flat zero line labelled "Bounced" reads as "nothing bounced", not "we do not track it".
    for (const m of ['bounced', 'linkedin_connections', 'linkedin_messages']) {
      const at = analytics.indexOf(`key: '${m}'`)
      expect(at, `${m} missing from METRICS`).toBeGreaterThan(-1)
      expect(analytics.slice(at, at + 200), `${m} is selectable with no data`).toContain('unavailable')
    }
    expect(analytics).toContain('disabled={!!m.unavailable}')
  })
})

describe('the referral page promises what the backend actually pays', () => {
  const referral = read('app/(dashboard)/dashboard/referral/page.tsx')
  const stripe = readFileSync(join(__dirname, '../routes/stripe.ts'), 'utf8')  // raw: we read a const

  it('the reward is stated in wallet dollars, matching REFERRAL_BONUS_USD', () => {
    // The backend pays 45 wallet dollars. The page said "15 FIGSY credits" — the WORK wallet of
    // the retired two-wallet model — so a client could refer someone and be paid in a different
    // currency from the one they were promised.
    const bonus = stripe.match(/const REFERRAL_BONUS_USD = (\d+)/)?.[1]
    expect(bonus, 'REFERRAL_BONUS_USD not found in stripe.ts').toBe('45')
    expect(referral).toContain(`$${bonus}`)
  })

  it('and never in the retired credit currency', () => {
    expect(referral).not.toMatch(/15 FIGSY credits/)
    expect(referral).not.toMatch(/earn FIGSY credits/)
  })

  it('and does not tell the client their referral gets a free trial', () => {
    // #607 retired the trial on 1 Aug. This page still described one in its step 2.
    expect(referral).not.toMatch(/free trial/i)
  })
})

describe('nothing in the client chrome looks like a control it is not', () => {
  it('the dead notification bell is gone from the Milla shell', () => {
    // No onClick, no href, no badge, no menu — a bell that could not be clicked, on every
    // screen. There is no notification centre behind it.
    const shell = read('components/milla/MillaShell.tsx')
    expect(shell).not.toMatch(/<Bell\b/)
  })

  it('no browser alert() is used as a feature anywhere a client can reach', () => {
    // `alert('Create team — coming soon')` was the last one. Honest words, wrong delivery.
    const reachable = [
      'app/(milla)', 'components/milla',
      ...['billing', 'analytics', 'company', 'documents', 'kpis', 'referral', 'roi', 'settings', 'team', 'usage']
        .map(p => `app/(dashboard)/dashboard/${p}`),
    ]
    const offenders: string[] = []
    const walk = (dir: string) => {
      let entries: string[]
      try { entries = readdirSync(join(PORTAL, dir)) } catch { return }
      for (const e of entries) {
        const rel = `${dir}/${e}`
        if (statSync(join(PORTAL, rel)).isDirectory()) { walk(rel); continue }
        if (!/\.tsx?$/.test(e)) continue
        const stripped = stripCommentsForEnvScan(readFileSync(join(PORTAL, rel), 'utf8'))
        if (/(?<![\w.])alert\s*\(/.test(stripped)) offenders.push(rel)
      }
    }
    for (const r of reachable) walk(r)
    expect(offenders, `alert() used in: ${offenders.join(', ')}`).toEqual([])
  })
})
