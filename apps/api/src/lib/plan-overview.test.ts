// ⚑ 1 Oct (R180 · Coaching #2490 · #2493 · #2499) — THE PLAN CARD: prices interpolated from
// `@kind/shared`, the founder's promises, no internal words, only built features (the website's own
// rows), Full Coaching as a fact with no sell, and the wiring. Mocks only — no network.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { BAND_PRICE_PER_MEETING_USD, SIZE_BANDS, type SizeBand } from '@kind/shared'

const state = vi.hoisted(() => ({ band: 'growth' as string | null, activated: false }))
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => {
      const rows = t === 'programmes' ? (state.band ? [{ id: 'p-1', size_band: state.band, status: 'LIVE', created_at: '2026-09-01' }] : [])
        : t === 'coaching_activations' ? (state.activated ? [{ id: 'a-1' }] : []) : []
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, order() { return q }, limit() { return q }, is() { return q },
        then(r: (v: unknown) => unknown) { return Promise.resolve(r({ data: rows, error: null })) },
      }
      return q
    },
  },
}))

import { planView, planOverviewFor, EVERY_PLAN, GROWTH_EXTRAS, FULL_COACHING_BUILT, PLAN_PROMISE, type PlanView } from './plan-overview'

const ROOT = join(__dirname, '..', '..', '..', '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const BANDS: SizeBand[] = ['founders', 'growth', 'enterprise']
const all = (v: PlanView) => [v.name, v.promise, v.summary, v.price, v.size, ...v.includes, v.fullCoachingLine]

beforeEach(() => { state.band = 'growth'; state.activated = false })

describe('#2490 · #2493 · #2499 — the card for each plan', () => {
  it('🛑 the price is BAND_PRICE_PER_MEETING_USD, interpolated — and the founder\'s promise', () => {
    for (const b of BANDS) {
      const v = planView(b, false)
      expect(v.price).toBe(`$${BAND_PRICE_PER_MEETING_USD[b]} per qualified meeting`)
      expect(v.promise).toBe(PLAN_PROMISE[b])
    }
    expect(PLAN_PROMISE.founders).toBe('Get me qualified meetings.')
    expect(PLAN_PROMISE.growth).toBe('Get me meetings and help me convert them better.')
  })

  it('🛑 no price is typed in the lib — every $ figure comes from @kind/shared', () => {
    const src = read('apps/api/src/lib/plan-overview.ts')
    expect(src).not.toMatch(/\$\s?\d/)
    expect(src).not.toMatch(/\b(99|199|299|100)\b/)
  })

  it('the size range is SIZE_BANDS\'s', () => {
    expect(planView('founders', false).size).toBe(`${SIZE_BANDS[0].min}–${SIZE_BANDS[0].max} employees`)
    expect(planView('enterprise', false).size).toBe(`${SIZE_BANDS[2].min}+ employees`)
  })

  it('what each plan includes, and Full Coaching as a fact', () => {
    const f = planView('founders', false), g = planView('growth', false), e = planView('enterprise', false)
    expect(f.includes).toEqual([...EVERY_PLAN])
    expect(g.includes).toEqual(['Everything in Founders', ...GROWTH_EXTRAS])
    expect(e.includes).toEqual(['Everything in Growth', ...FULL_COACHING_BUILT])
    expect([f.fullCoachingLine, g.fullCoachingLine, e.fullCoachingLine]).toEqual(['Not turned on', 'Not turned on', 'Included'])
  })

  it('Full Coaching turned on (F3) → "on", and what it adds is listed', () => {
    const f = planView('founders', true), g = planView('growth', true)
    expect(f.fullCoaching).toBe('on')
    expect(f.fullCoachingLine).toBe('On for the meetings still to come')
    expect(f.includes).toEqual([...EVERY_PLAN, ...GROWTH_EXTRAS, ...FULL_COACHING_BUILT])
    expect(g.includes).toEqual(['Everything in Founders', ...GROWTH_EXTRAS, ...FULL_COACHING_BUILT])
    // Enterprise is never "bought" — it is included.
    expect(planView('enterprise', true).fullCoaching).toBe('included')
  })
})

describe('🛑 the review\'s rules — no internal words, nothing unbuilt, no sell, no pool', () => {
  const strings = BANDS.flatMap(b => [...all(planView(b, false)), ...all(planView(b, true))])

  it('no "Product", "sub-products", "Expansion Engine", milestones, uplift, pool or limit', () => {
    for (const s of strings) {
      expect(s, s).not.toMatch(/\bproducts?\b|sub-products|Expansion Engine|25\s*\/\s*50|uplift|\bpool\b|\blimit\b|\bsourc|%/i)
    }
  })

  it('RED PROOF for that scan — it catches each internal word', () => {
    for (const bad of ['Included sub-products', 'Product: Pipeline', 'Expansion Engine · Active', '25 / 50 / 75', 'draft +$100 uplift', 'from a pool of 400']) {
      expect(/\bproducts?\b|sub-products|Expansion Engine|25\s*\/\s*50|uplift|\bpool\b|\blimit\b|\bsourc|%/i.test(bad), bad).toBe(true)
    }
  })

  it('🛑 every feature row is one the website\'s comparison already lists (one wording, site and portal)', () => {
    const html = read('apps/website/pricing.html')
    const start = html.indexOf('<details class="cmp" id="compare">')
    const norm = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;|[’']/g, ' ').replace(/\s+/g, ' ')
    const site = norm(html.slice(start, html.indexOf('</details>', start)))
    for (const row of [...EVERY_PLAN, ...GROWTH_EXTRAS, ...FULL_COACHING_BUILT]) expect(site, row).toContain(norm(row))
  })

  it('the card has no button and no price for Full Coaching — the offer is the 50% moment\'s', () => {
    const card = read('apps/portal/src/components/milla/PlanOverview.tsx')
    expect(card).not.toMatch(/<button|<Link|Turn on|upliftPerMeeting/)
    for (const s of strings.filter(x => /Full Coaching|Not turned on|Included|On for/.test(x))) expect(s).not.toMatch(/\$/)
  })
})

describe('the read and the wiring', () => {
  it('reads the plan from the programme; no band → no card', async () => {
    expect((await planOverviewFor('c-1'))?.name).toBe('Growth')
    state.band = 'founders'; state.activated = true
    expect((await planOverviewFor('c-1'))?.fullCoaching).toBe('on')
    state.band = null
    expect(await planOverviewFor('c-1')).toBeNull()
  })

  it('the route never answers a successful `data: null`, and the screen shows the card', () => {
    const route = read('apps/api/src/routes/my-programme.ts')
    const block = route.slice(route.indexOf("myProgrammeRouter.get('/plan'"), route.indexOf("myProgrammeRouter.get('/growth-report'"))
    expect(block).toContain('data: { plan: await planOverviewFor(clientId) }')
    expect(block).toContain('data: { plan: null }')
    expect(block).not.toMatch(/success: true, data: null/)
    expect(read('apps/portal/src/components/milla/PlanOverview.tsx')).toContain("'/my/programme/plan'")
    expect(read('apps/portal/src/components/milla/ProgrammeOutcome.tsx')).toContain('<PlanOverview />')
  })
})
