// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 · STEP 2 (24 Sep) — THE BRIEF PANEL, AS THE REDESIGN DRAWS IT
//
// Founder, verbatim: *"yes but i cant add more informaiton when the purple part comes up"* ·
// *"Milla does not tell me what else i need here. i need to ask???"* · *"we dont assume again.
// if unsure milla needs to ask."* · *"match everything. colors everything."*
//
// Tracker rows #7 #8 #9 #10 #56 #57 #69 #70 #71 #73 and decision D2 ("Show me who you'd find").
// Proved by RUNNING the storing derivation and the Brief's read model, plus the screen, read
// from source.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key'

const { icpFromDraft } = await import('./promotion')
const { NEVER_CONTACT_KINDS } = await import('@kind/shared')
type BriefDraft = Awaited<ReturnType<typeof import('./brief-draft')['briefDraftFor']>>

const draft = (facts: Record<string, unknown>): BriefDraft => ({
  id: 'draft-1', userId: 'user-1', facts, conversation: [], confirmedAt: null, promotedClientId: null,
} as unknown as BriefDraft)

type Row = { id: string; label: string; said: string; sending: string[]; pick?: { key: string; kinds: string[]; kinds_chosen: string[]; kinds_key: string } }
const readModel = async (facts: Record<string, unknown>) => {
  const { briefReadModelFrom } = await import('../routes/milla')
  const { BRIEF_FACT_LABEL, briefDraftFacts } = await import('@kind/shared')
  return briefReadModelFrom(
    draft(facts), briefDraftFacts(facts), { state: 'conversing', unresolvedLabels: [] },
    BRIEF_FACT_LABEL as Record<string, string>, icpFromDraft as never,
  ) as unknown as {
    onboarding_targeting: Row[]
    needs_pick: Array<{ id: string; said: string[] }>
    onboarding_picked: Record<string, string[]>
  }
}

const src = (rel: string) => readFileSync(join(__dirname, rel), 'utf8')
/** Comments out, so an explanation can never satisfy a guard about code. */
const code = (rel: string) => src(rel).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const WELCOME = code('../../../portal/src/app/(milla)/milla/welcome/page.tsx')

describe('#71 · words Apollo has no option for — the client picks, nobody is parked', () => {
  it('🛑 an unmatched seniority is sent to the screen BEFORE confirm, with the client\'s words', async () => {
    const m = await readModel({ seniority_levels: ['bigwigs'] })
    expect(m.needs_pick).toEqual([{ id: 'seniority', said: ['bigwigs'] }])
  })

  it('🛑 and a pick resolves it — the same verdict promotion stores, so no review is raised', async () => {
    const m = await readModel({ seniority_levels: ['bigwigs'], picked: { seniority_levels: ['C-Suite'] } })
    expect(m.needs_pick).toEqual([])
    const icp = icpFromDraft(draft({ seniority_levels: ['bigwigs'], picked: { seniority_levels: ['C-Suite'] } }))
    expect(icp.icp_review).toBeUndefined()
  })

  it('🛑 the screen asks once per field, in the chat, and holds the button until it is picked', () => {
    expect(WELCOME).toContain('for (const n of needsPick) {')
    expect(WELCOME).toContain('if (pickAsked.current.has(n.id)) continue')
    expect(WELCOME).toContain(': needsPick.length > 0 ? `Open ')
  })
})

describe('#73 · "Never contact" as picks plus a free list', () => {
  it('🛑 the row carries the two lists only the client holds, and the companies they named', async () => {
    const m = await readModel({ picked: { exclusions: ['Acme Ltd'], exclusion_kinds: ['Existing customers'] } })
    const row = m.onboarding_targeting.find(r => r.id === 'exclusions')!
    expect(row.sending).toEqual(['Acme Ltd'])
    expect(row.pick).toEqual({
      key: 'exclusions', kinds: [...NEVER_CONTACT_KINDS], kinds_chosen: ['Existing customers'], kinds_key: 'exclusion_kinds',
    })
  })

  it('🛑 a named company is joined to what they SAID — both remove people, neither replaces the other', () => {
    const icp = icpFromDraft(draft({ exclusions: 'no recruitment agencies', picked: { exclusions: ['Acme Ltd'] } }))
    expect(icp.exclusions).toBe('no recruitment agencies; Acme Ltd')
    expect(icpFromDraft(draft({ picked: { exclusions: ['Acme Ltd'] } })).exclusions).toBe('Acme Ltd')
    expect(icpFromDraft(draft({})).exclusions).toBeUndefined()
  })

  it('the save boundary accepts exactly those two kinds', () => {
    const milla = src('../routes/milla.ts')
    expect(milla).toContain('exclusion_kinds:  z.array(z.enum(NEVER_CONTACT_KINDS))')
    expect([...NEVER_CONTACT_KINDS]).toEqual(['Existing customers', 'Open opportunities'])
  })

  it('🛑 ticking one makes Milla ask for the list', () => {
    expect(WELCOME).toContain("if (next.length > kinds.length) setMessages(m => [...m, { role: 'assistant', content: NEVER_CONTACT_ASK_COPY }])")
  })
})

describe('#8 · the client can keep changing things — and a change after a reload loses nothing', () => {
  it('🛑 the read model returns the stored picks', async () => {
    const m = await readModel({ picked: { seniority_levels: ['C-Suite'], company_sizes: ['11–50'] } })
    expect(m.onboarding_picked).toEqual({ seniority_levels: ['C-Suite'], company_sizes: ['11–50'] })
  })

  it('🛑 and every save starts from them, so one new pick cannot wipe the others', () => {
    expect(WELCOME).toContain('const body: Record<string, string[]> = { ...serverPicked }')
    expect(WELCOME).toContain('setServerPicked(d.data?.onboarding_picked ?? {})')
  })
})

describe('#7 #56 #57 · ONE panel in every state — the fields never disappear', () => {
  it('🛑 there is no second, plan-card state and no way "back" to the fields', () => {
    expect(WELCOME).not.toContain('Proposed ICP')
    expect(WELCOME).not.toContain('Keep adjusting the target')
    expect(WELCOME).not.toContain('{!(serverReady && proposed) ? (')
  })

  it('🛑 the redesign\'s hero, filter rows and one button', () => {
    expect(WELCOME).toContain('<div className="mv-hero-card">')
    expect(WELCOME).toContain('<details className="mv-filter-row"')
    expect(WELCOME).toContain('<b>Your targeting</b>')
    expect(WELCOME.match(/"Show me who you'd find"/g) ?? []).toHaveLength(1)
  })
})

describe('#9 #69 #70 · the button says what is missing, and so does Milla when asked', () => {
  it('🛑 the button is always there and the line under it names the one thing missing', () => {
    expect(WELCOME).toContain('disabled={saving || blocker !== null}')
    expect(WELCOME).toContain('{blocker ?? <>')
    expect(WELCOME).toContain('`Milla still needs: ${briefNext}. Tell her in the chat.`')
  })

  it('🛑 the readiness it reads is refreshed after EVERY turn, not only on arrival', () => {
    const at = WELCOME.indexOf('const refreshTargeting = useCallback(')
    const body = WELCOME.slice(at, at + 2500)
    expect(body).toContain("setServerReady(d.data.onboarding_state === 'ready')")
    expect(body).toContain('setBriefNext(d.data.next?.label ?? null)')
  })

  it('🛑 Milla asks for the industry as soon as the conversation is complete — not only after a plan', () => {
    expect(WELCOME).toContain('if ((!proposed && !serverReady) || industryChosen || industryAsked.current) return')
  })

  it('🛑 the builder is told what is outstanding AND whether the industry is chosen, and to answer plainly', () => {
    const icps = src('../routes/icps.ts')
    expect(icps).toContain('── IF THEY ASK WHAT ELSE YOU NEED')
    expect(icps).toContain('They have NOT yet chosen their industry.')
    expect(icps).toContain('Never ask again for anything listed above as already told to you.')
  })
})
