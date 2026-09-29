// ⚑ 29 Sep (R174 · PR 4a·2) — THE OLD ADMIN PAGES ARE REDIRECTED INTO VIDA, /playbook QUOTES
// TODAY'S PRICES, AND THE COMPLIANCE PAGE CLAIMS ONLY WHAT CAN BE CHECKED.
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const MW = read('apps/admin/src/middleware.ts')

describe('the old pages land in Vida — redirected, not deleted', () => {
  const RETIRED = ['messages', 'command', 'cmo', 'activation', 'activity', 'cohorts', 'analytics', 'agents',
    'status', 'launch', 'smoketest', 'roadmap', 'scalability', 'docs', 'data-moat', 'terms-library']
  it('each one is in the redirect map, and its file is still in the repo', () => {
    const map = MW.slice(MW.indexOf('const RETIRED_TO_VIDA'), MW.indexOf('if (RETIRED_TO_VIDA[seg])'))
    for (const p of RETIRED) {
      expect(map, p).toMatch(new RegExp(`(^|[\\s,{])'?${p}'?: '`))
      expect(existsSync(join(process.cwd(), `apps/admin/src/app/${p}`)), `${p} was deleted`).toBe(true)
    }
  })
  it('Proposals and Visitors are kept (founder: "propsals and visitors"), and /playbook is rewritten, not redirected', () => {
    const map = MW.slice(MW.indexOf('const RETIRED_TO_VIDA'), MW.indexOf('if (RETIRED_TO_VIDA[seg])'))
    for (const p of ['proposals', 'visitors', 'playbook']) expect(map).not.toMatch(new RegExp(`\\b${p}:`))
  })
  it('the live Vida pages no longer link to them', () => {
    for (const f of ['apps/admin/src/app/revenue/page.tsx', 'apps/admin/src/app/ops/page.tsx', 'apps/admin/src/app/cockpit/page.tsx']) {
      expect(read(f), f).not.toMatch(/href="\/(command|cohorts|activation)"/)
    }
  })
})

describe('/playbook quotes today\'s prices, read from @kind/shared', () => {
  const PB = read('apps/admin/src/app/playbook/page.tsx')
  it('flat by company size, one payment, the R166 ⑤ credit', () => {
    expect(PB).toContain('BAND_PRICE_PER_MEETING_USD[b.key]')
    expect(PB).toContain('you pay once, when you accept, before we source anyone')
    expect(PB).toContain('valid ${SHORTFALL_CREDIT_EXPIRY_DAYS} days')
  })
  it('none of the old model is quoted any more', () => {
    const live = PB.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    for (const old of ['PROGRAMME_ANCHOR_1_USD', 'half at the start and half at approval', 'credit model', "Credits don't expire", 'Starter tier', 'R[X]']) {
      expect(live, old).not.toContain(old)
    }
  })
})

describe('Compliance claims only what can be checked', () => {
  const C = read('apps/admin/src/app/compliance/page.tsx')
  it('GDPR and CCPA read self-assessed, not complete', () => {
    expect(C).not.toContain("nextStep: 'Already complete. No action required.'")
    expect(C.match(/timeline: 'Self-assessed — not independently reviewed'/g)?.length).toBe(2)
  })
  it('the documents it ticks exist', () => {
    for (const f of ['trust.html', 'dpa.html', 'dpa-us.html']) expect(existsSync(join(process.cwd(), 'apps/website', f)), f).toBe(true)
  })
})
