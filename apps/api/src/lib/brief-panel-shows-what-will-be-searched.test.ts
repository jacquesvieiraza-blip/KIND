// ══════════════════════════════════════════════════════════════════════════════════════════
// THE FIRST-RUN PANEL SHOWS WHAT WILL ACTUALLY BE SEARCHED ON — founder-locked 22 Sep
//
// 🛑 THE REQUIREMENT, IN THE FOUNDER'S WORDS: *"the client lands after sign up and lands in
// Milla portal. they speak there and see there."*
//
// ── WHAT "SEE" HAD TO MEAN, AND WHY A PARAGRAPH WAS NOT IT ──────────────────────────────
//
// The panel beside Milla said *"As we chat, Milla builds your ICP here"* for the whole
// conversation, and then showed a finished ICP at the end. So the first moment a client could
// see how their sentence had been read was AFTER the reading was done — by which time a
// misread fact had already been promoted, already shaped a search, and already cost a pass.
// The correction has to be available in the sentence after the mistake, which means the
// derived values have to be on screen while the client is still talking.
//
// ── THE DEFECT THIS FILE EXISTS TO PREVENT ──────────────────────────────────────────────
//
// 🛑 A DISPLAY-ONLY COPY OF THE SAME RULES. The obvious way to build that panel is to read
// the draft's facts and translate them for the screen — which produces a second derivation
// that agrees with promotion today and drifts on the first change to either. The panel would
// then be a claim about what we will search on, rather than the thing we will search on.
//
// So the read model calls `icpFromDraft` — promotion's own function, the one its header calls
// *"THE ONE SERVER-SIDE DERIVATION"* — and shows its output. There is nothing to keep in
// step, because there is only one of it.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ⚠️ `icpFromDraft` IS PURE AND TOUCHES NOTHING — but its module reaches the database client
// at load, which needs env this suite does not have. Stubbed to nothing, deliberately: if a
// future change made the derivation read a row, every assertion below would fail loudly
// rather than quietly start proving something else.
vi.mock('@kind/db', () => ({ db: {} }))

const { icpFromDraft } = await import('./promotion')
type BriefDraft = Awaited<ReturnType<typeof import('./brief-draft')['briefDraftFor']>>

const code = (p: string): string =>
  readFileSync(join(__dirname, p), 'utf8')
    .split('\n')
    .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
    .join('\n')

const MILLA_ROUTE = code('../routes/milla.ts')
const WELCOME = readFileSync(
  join(__dirname, '../../../portal/src/app/(milla)/milla/welcome/page.tsx'), 'utf8')

/** A client mid-conversation: some facts landed, some not. */
const draft = (facts: Record<string, unknown>): BriefDraft => ({
  id: 'draft-1', userId: 'user-1', facts, conversation: [],
  confirmedAt: null, promotedClientId: null,
} as unknown as BriefDraft)

describe('the panel is derived from the function that does the storing', () => {
  it('🛑 the read model asks promotion for the values — it does not translate for the screen', () => {
    expect(MILLA_ROUTE, 'the brief read model no longer uses promotion\'s derivation')
      .toContain("await import('../lib/promotion')")
    expect(MILLA_ROUTE, 'the panel values are not `icpFromDraft`\'s').toContain('icpFromDraft')
    // 🛑 AND NO SECOND TRANSLATION APPEARED BESIDE IT. These are the two functions that turn a
    // client's words into provider values; promotion calls them, and this route must not.
    expect(MILLA_ROUTE, 'the route grew its own provider translation')
      .not.toContain('translateProviderList')
    expect(MILLA_ROUTE, 'the route grew its own provider review derivation')
      .not.toContain('deriveProviderReview')
  })

  it('🛑 the panel is fed both halves: the client\'s words AND the derived values', () => {
    // ⚠️ THE KEY, WITH ITS COLON, AND THAT PRECISION IS EARNED. `toContain('onboarding_targeting')`
    // was the first version of this line, and renaming the field to `onboarding_targeting_BROKEN`
    // left it green — a substring match cannot tell a field from a field that merely starts
    // the same way. The panel reads these exact names off the response.
    expect(MILLA_ROUTE, 'the panel\'s field is not on the response').toContain('onboarding_targeting:')
    expect(MILLA_ROUTE, 'the free count has nothing to run on').toContain('onboarding_search:')
    // The client's own phrasing travels as `said`; ours as `sending`. A row with only one of
    // them is the pre-22-Sep panel with extra steps.
    expect(MILLA_ROUTE).toMatch(/\bsaid\b/)
    expect(MILLA_ROUTE).toMatch(/\bsending\b/)
    // And the portal reads the same two names — a rename on either side is a blank panel, and
    // a blank panel is indistinguishable from "Milla understood nothing".
    expect(WELCOME, 'the page reads a field the server does not send').toContain('onboarding_targeting')
    expect(WELCOME).toContain('onboarding_search')
  })
})

describe('what the client will see is what the search will send', () => {
  it('a stated size becomes the bands the provider is actually asked for', () => {
    // The client said a range in their own words; the six-band ladder is ours. Both belong on
    // the panel — theirs so they can recognise it, ours so they can catch it being wrong.
    const icp = icpFromDraft(draft({
      company_size: 'around twenty to fifty people',
      company_sizes: ['11–50', '51–200'],
    }))
    expect(icp.company_sizes).toEqual(['11–50', '51–200'])
    // ⚠️ AND THEIR PHRASE SURVIVES AS ITS OWN FIELD, never replaced by our translation.
    expect(icp.target_size).toBe('11–50, 51–200')
  })

  it('a category the provider has no word for produces NO filter, and that is not a failure', () => {
    // 🛑 THE STATE THE PANEL MUST BE HONEST ABOUT. "professional-services firms" is not one of
    // the sixteen provider industries, so `industries` is empty — and an empty closed list
    // means UNCONSTRAINED downstream. The client is told it will be used to order results
    // rather than to leave anybody out, which is what actually happens.
    const icp = icpFromDraft(draft({ target_category: 'professional-services firms' }))
    expect(icp.industries).toEqual([])
    // Their words are still the ICP's name — never discarded because we could not map them.
    expect(icp.name).toBe('professional-services firms')
  })

  it('a category the provider DOES know becomes a real filter', () => {
    const icp = icpFromDraft(draft({ target_category: 'SaaS companies' }))
    expect(icp.industries).toEqual(['SaaS'])
  })

  it('job titles are sent as the client wrote them — there is nothing to translate', () => {
    const icp = icpFromDraft(draft({ job_titles: ['Managing Director', 'COO'] }))
    expect(icp.job_titles).toEqual(['Managing Director', 'COO'])
  })

  it('an empty brief derives an empty search', () => {
    const icp = icpFromDraft(draft({}))
    for (const k of ['job_titles', 'seniority_levels', 'company_sizes', 'geographies', 'industries']) {
      expect(icp[k], `${k} invented a value from an empty brief`).toEqual([])
    }
  })
})

describe('the first run shows it, and pays nothing for it', () => {
  it('the panel refreshes after every turn, including a failed one', () => {
    // The customer's message is durable the moment it is sent (J5-C11), so a turn that errored
    // on the way back may still have moved the Brief. Refreshing only on success would leave
    // the panel behind the truth exactly when the client is most likely to re-read it.
    expect(WELCOME, 'the panel no longer re-reads after a turn').toMatch(
      /finally \{[\s\S]{0,400}?refreshTargeting\(\)/)
  })

  it('🛑 the panel costs nothing — no provider is asked anything to draw it', () => {
    // Every value on it is derived from what the client already told Milla. The live count the
    // founder asked for is deliberately absent: `preview-count` is pinned to exactly one gated
    // call site, and a second one here would be the bypass that pin exists to forbid.
    expect(WELCOME.match(/'\/icps\/preview-count'/g) ?? [],
      'a second preview-count call site appeared, bypassing the account gate').toHaveLength(1)
    expect(WELCOME, 'the first run reached the paid reveal').not.toContain('bulk_match')
    expect(WELCOME, 'the first run reached the paid reveal').not.toContain('/leads/reveal')
  })

  it('a failed read leaves the panel as it was — it never blanks what the client was shown', () => {
    // An empty panel after a network blip reads as "Milla forgot", which is the impression
    // the durable Brief exists to remove.
    expect(WELCOME).toMatch(/catch \{ \/\* silent — the panel keeps whatever it last showed \*\/ \}/)
  })
})
