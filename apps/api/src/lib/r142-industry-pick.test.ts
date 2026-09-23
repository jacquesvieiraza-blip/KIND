// ═══════════════════════════════════════════════════════════════════════════════════════
// R142 · A2a (23 Sep) — THE CLIENT PICKS THEIR INDUSTRY FROM APOLLO'S OWN LIST
//
// Founder, verbatim: *"this is why we use apollo drop downs and make sure we do not assume"* ·
// *"milla must say please look to the right and drop down and choose."*
//
// Proved by RUNNING the storing derivation (`icpFromDraft`), the Brief's read model and the
// write boundary's review — plus the screen's lock, read from source.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key'

const { icpFromDraft } = await import('./promotion')
const { deriveProviderReview, PROVIDER_VOCABULARIES, WRITE_VOCABULARIES } = await import('./icp-provider-translation')
const { APOLLO_INDUSTRIES, PICK_INDUSTRY_COPY, apolloIndustriesOnly } = await import('@kind/shared')
type BriefDraft = Awaited<ReturnType<typeof import('./brief-draft')['briefDraftFor']>>

const draft = (facts: Record<string, unknown>): BriefDraft => ({
  id: 'draft-1', userId: 'user-1', facts, conversation: [], confirmedAt: null, promotedClientId: null,
} as unknown as BriefDraft)

const panelRow = async (facts: Record<string, unknown>) => {
  const { briefReadModelFrom } = await import('../routes/milla')
  const { BRIEF_FACT_LABEL, briefDraftFacts } = await import('@kind/shared')
  const rows = briefReadModelFrom(
    draft(facts), briefDraftFacts(facts), { state: 'conversing', unresolvedLabels: [] },
    BRIEF_FACT_LABEL as Record<string, string>, icpFromDraft as never,
  ).onboarding_targeting as Array<{ id: string; label: string; sending: string[] }>
  return rows.find(r => r.id === 'target_category')!
}

const src = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')

describe('A2a · a picked industry is stored as Apollo spells it — and nothing else is', () => {
  it('🛑 the picked Apollo industries become the ICP\'s industries; a word not on the list is dropped', () => {
    const icp = icpFromDraft(draft({
      target_category: 'property developers and construction companies',
      picked: { industries: ['Construction', 'real estate', 'Doughnuts'] },
    }))
    expect(icp.industries).toEqual(['Construction', 'Real Estate'])
  })

  it('with no pick, an ICP derives exactly as it did before', () => {
    expect(icpFromDraft(draft({ target_category: 'SaaS' })).industries).toEqual(['SaaS'])
  })

  it('🛑 the write boundary accepts a picked Apollo industry — no review, so Proof is not parked', () => {
    const d = deriveProviderReview({ industries: ['Construction', 'Civil Engineering'] }, WRITE_VOCABULARIES)
    expect(d.review).toBeNull()
    expect(d.values.industries).toEqual(['Construction', 'Civil Engineering'])
  })

  it('🛑 and the ICP save route actually judges against that wider list', () => {
    const icps = src('../routes/icps.ts')
    const at = icps.indexOf('const decided = deriveProviderReview(')
    expect(at).toBeGreaterThan(-1)
    expect(icps.slice(at, at + 800)).toMatch(/\n\s+WRITE_VOCABULARIES,\n\s+\)/)
  })

  it('and the list a CONVERSATION is translated into is unchanged — the model gains no Apollo industries to guess with', () => {
    expect(PROVIDER_VOCABULARIES.industries).toHaveLength(16)
    expect(PROVIDER_VOCABULARIES.industries).not.toContain('Construction')
  })

  it('Apollo\'s list is a closed list: only its own entries survive', () => {
    expect(apolloIndustriesOnly(['construction', 'Construction', 'Builders'])).toEqual(['Construction'])
    expect(APOLLO_INDUSTRIES).toContain('Real Estate')
    expect(APOLLO_INDUSTRIES).toContain('Civil Engineering')
  })
})

describe('A2a · the Brief shows an Industry pick, and only what the client picked', () => {
  it('🛑 the row is "Industry" — no longer "Order by (never excludes)"', async () => {
    expect((await panelRow({})).label).toBe('Industry')
  })

  it('🛑 a value WE derived from their sentence is not shown as chosen — only a pick counts', async () => {
    // "SaaS" translates to ['SaaS'] through the old list; that is our reading, not their pick.
    expect((await panelRow({ target_category: 'SaaS' })).sending).toEqual([])
    expect((await panelRow({ picked: { industries: ['Construction'] } })).sending).toEqual(['Construction'])
  })
})

describe('A2a · the screen: no industry, no next step — and Milla says where to choose', () => {
  const welcome = src('../../../portal/src/app/(milla)/milla/welcome/page.tsx')

  it('🛑 "Yes, this represents us" is locked until an industry is picked', () => {
    expect(welcome).toContain('disabled={saving || proofHold !== null || !industryChosen}')
    expect(welcome).toMatch(/async function approve\(\) \{\n[^\n]*\n\s*if \(!industryChosen\)/)
  })

  it('🛑 the industry field is Apollo\'s closed list, saved under `industries`', () => {
    expect(welcome).toContain("target_category: { options: [...APOLLO_INDUSTRIES], free: false, max: 6 }")
    expect(welcome).toContain("target_category: 'industries'")
  })

  it('🛑 Milla tells the client to look right and choose — the founder\'s instruction', () => {
    expect(PICK_INDUSTRY_COPY).toMatch(/look to the right/i)
    expect(PICK_INDUSTRY_COPY).toMatch(/drop-down/i)
    expect(welcome).toContain("content: PICK_INDUSTRY_COPY")
  })
})

describe('A1 gap · the Brief can save all eleven Apollo seniorities', () => {
  it('🛑 the save step allows eleven seniority picks, and six industries', () => {
    const route = src('../routes/milla.ts')
    expect(route).toContain('seniority_levels: z.array(z.string().max(40)).max(11).nullish()')
    expect(route).toContain('industries:       z.array(z.string().max(80)).max(6).nullish()')
  })
})
