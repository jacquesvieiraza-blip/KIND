// ══════════════════════════════════════════════════════════════════════════════════════════
// THE HEADCOUNT APOLLO ACTUALLY SENDS (19 Sep) — RUNTIME VERIFIED BY A PRODUCTION RUN
//
// 🛑 WHAT EARNED THIS, AND WE PREDICTED IT IN WRITING BEFORE IT HAPPENED. GREAT Studio's first
// real Proof run — the first search this product has ever made for a paying-path client —
// sourced twenty people and surfaced NONE. Vida's own words: *"Every sourced prospect failed a
// hard criterion: size 20."* Twenty bought, twenty set aside.
//
// `routes/icps.ts` wrote `company_size` from `contact.organization?.num_employees`. Apollo
// sends `estimated_num_employees`. With the key we read absent, every candidate reached
// `sizeVerdict` in `proof-fit.ts` with no headcount, that criterion answered `unknown`, and an
// unknown hard criterion sets a candidate aside — after it has been paid for.
//
// 🛑 AND THE SUITE COULD NOT SEE IT, BY CONSTRUCTION. `scripts/fullstack/fakes.mjs` says so
// itself: *"WHICH KEY REAL APOLLO SENDS IS RUNTIME UNVERIFIED AND MATTERS. If it is
// `estimated_num_employees`, the product reads a field that is never there… no prospect would
// EVER clear the size criterion in production."* The fake was then made to emit BOTH keys so
// the journey could be walked either way — so 26/26 journeys passed while production produced
// nothing. A fixture that supplies what the code expects proves the fixture.
//
// ⚠️ THIS FILE TESTS THE SHAPE APOLLO SENDS, NOT THE SHAPE WE HOPE FOR. The first case carries
// ONLY `estimated_num_employees`, exactly as the live payload does.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// `apollo.ts` reaches the money fences through `@kind/db`, whose client throws at module scope
// without Supabase env vars. `apolloHeadcount` is pure and touches none of it.
vi.mock('@kind/db', () => ({
  db: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }), rpc: async () => ({ data: null, error: null }) },
}))

import { apolloHeadcount } from './apollo-headcount'

const REPO = join(__dirname, '../../../..')
const org = (o: Record<string, unknown> | null) =>
  ({ organization: o } as unknown as Parameters<typeof apolloHeadcount>[0])

describe('the headcount Apollo actually sends', () => {
  it('🛑 THE PRODUCTION SHAPE — only `estimated_num_employees`, and it is read', () => {
    // This is the payload that produced 20 sourced / 0 eligible. Before the fix it answered
    // null, and null is what set every one of those twenty aside.
    expect(apolloHeadcount(org({ name: 'Acme Ops', estimated_num_employees: 40 }))).toBe(40)
  })

  it('the older key still answers — this widens what we read and narrows nothing', () => {
    expect(apolloHeadcount(org({ name: 'Acme', num_employees: 120 }))).toBe(120)
  })

  it('both present → one answer, and the two never disagree in the result', () => {
    expect(apolloHeadcount(org({ estimated_num_employees: 40, num_employees: 40 }))).toBe(40)
  })

  it('🛑 AND A GENUINELY ABSENT HEADCOUNT IS STILL null — we invent nothing', () => {
    // `unknown` on a hard criterion is a real refusal and must stay one. The defect was
    // reading the wrong key, never the refusal itself.
    expect(apolloHeadcount(org({ name: 'No size here' }))).toBeNull()
    expect(apolloHeadcount(org(null))).toBeNull()
    expect(apolloHeadcount(null)).toBeNull()
    expect(apolloHeadcount(undefined)).toBeNull()
  })

  it('nonsense is not a headcount — a string, a zero, a negative all answer null', () => {
    for (const bad of ['forty', '', null, 0, -5, Number.NaN]) {
      expect(apolloHeadcount(org({ estimated_num_employees: bad })), `"${String(bad)}" became a headcount`).toBeNull()
    }
  })

  it('a numeric string is read — a payload that quotes its numbers still answers', () => {
    expect(apolloHeadcount(org({ estimated_num_employees: '40' }))).toBe(40)
  })
})

describe('both write sites ask the one reader', () => {
  it('🛑 NO RAW `organization?.num_employees` SURVIVES ON THE SOURCING PATH', () => {
    // There were two sites. A fix applied to one is a defect that returns on the path nobody
    // remembered — which is the shape of half the bugs this repo has paid for.
    const route = readFileSync(join(REPO, 'apps/api/src/routes/icps.ts'), 'utf8')
    expect(route, 'a raw headcount read is back on the sourcing path')
      .not.toMatch(/contact\.organization\?\.num_employees/)
    const uses = route.match(/apolloHeadcount\(contact\)/g) ?? []
    expect(uses.length, 'both the lead and the pool copies must use the reader').toBeGreaterThanOrEqual(2)
  })
})
