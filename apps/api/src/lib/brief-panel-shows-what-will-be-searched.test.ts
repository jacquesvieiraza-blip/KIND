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

// ⚑ 22 Sep — `routes/milla.ts` reaches `middleware/auth`, which builds a Supabase client at
// module scope, so importing the route at all needs a URL to exist. Same stand-in
// `kill-switch-absolute.test.ts` uses, and for the same reason.
//
// ⚠️ NOTHING BELOW TALKS TO IT. `briefReadModelFrom` takes its facts, its labels and its
// derivation as arguments precisely so it can be RUN without a database — which is the
// property that makes the panel provable rather than merely greppable, and the property the
// month-long blank-screen defect slipped through for want of.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-key'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-key'

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

// ══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 22 Sep — THE WORKSPACE EXISTS BEFORE IT IS FULL, AND THIS IS THE GUARD THAT WAS MISSING
//
// 🛑 WHAT ACTUALLY HAPPENED. `onboarding_targeting` returned `[]` for a draft-less client and
// then `.filter(r => r.said !== '' || r.sending.length > 0)` dropped every unanswered row from
// the ones that did exist. So the approved portal's first screen — six labelled fields reading
// "Milla will fill this" — was structurally impossible to render, and what a client actually
// landed on after signing up was one sentence in a white box. The founder called it a blank
// screen and he was right.
//
// 🛑 EVERY EXISTING GUARD IN THIS FILE STAYED GREEN THROUGH ALL OF IT, because every one of
// them reads the SOURCE. `toContain('onboarding_targeting:')` is true of a field that always
// returns nothing. The rule being broken was behavioural, so the test has to RUN the thing.
//
// ⚠️ THE SIX ARE ASSERTED BY NAME AND BY COUNT. A future edit that drops a field, reorders
// them, or reintroduces a filter fails here rather than on a founder's screenshot.
describe('the workspace is six fields before the client has said a word', () => {
  const EXPECTED = [
    ['target_roles', 'Job titles'],
    ['seniority', 'Seniority'],
    ['company_size', 'Employees'],
    ['geography', 'Location'],
    // ⛓️ 23 Sep (R142 · A2a) — WAS `'Order by (never excludes)'`. The client now picks their
    // industry from Apollo's own list here (founder: *"milla must say please look to the right and
    // drop down and choose"*). Still six fields, same order, same ids.
    ['target_category', 'Industry'],
    ['exclusions', 'Never contact'],
  ] as const

  type Row = { id: string; label: string; said: string; sending: string[]; placeholder: string; note?: string }
  const panel = async (facts: Record<string, unknown> | null): Promise<Row[]> => {
    const { briefReadModelFrom } = await import('../routes/milla')
    const { BRIEF_FACT_LABEL, briefDraftFacts } = await import('@kind/shared')
    const d = facts === null ? null : draft(facts)
    const model = briefReadModelFrom(
      d, briefDraftFacts(facts ?? null), { state: 'conversing', unresolvedLabels: [] },
      BRIEF_FACT_LABEL as Record<string, string>,
      icpFromDraft as never,
    )
    return model.onboarding_targeting as Row[]
  }

  it('🛑 a client who has JUST SIGNED UP gets all six fields, not an empty list', async () => {
    // The exact state the founder landed in: authenticated, no draft row, nothing said.
    const rows = await panel(null)
    expect(rows, 'the landing screen has no workspace — this is the blank screen').toHaveLength(6)
    expect(rows.map(r => r.id)).toEqual(EXPECTED.map(([id]) => id))
    expect(rows.map(r => r.label)).toEqual(EXPECTED.map(([, label]) => label))
  })

  it('🛑 every unanswered field carries its own placeholder, from the server', async () => {
    const rows = await panel(null)
    for (const r of rows) {
      expect(r.said, `${r.id} invented words the client never said`).toBe('')
      expect(r.placeholder, `${r.id} has no empty-state copy`).not.toBe('')
    }
    // ⚠️ EXCLUSIONS IS THE ONE MILLA ASKS FOR rather than derives, and the locked copy says so.
    // If the portal had to work this out from the row id, the vocabulary boundary this read
    // model exists to hold would be broken by its own empty state.
    expect(rows.find(r => r.id === 'exclusions')!.placeholder).toBe('Milla will ask')
    // ⛓️ 23 Sep (R142 · A2a) — Industry joins exclusions as a field Milla does NOT fill: the client
    // chooses it from Apollo's list, so its empty state says so.
    expect(rows.find(r => r.id === 'target_category')!.placeholder).toBe('Choose from the list')
    for (const r of rows.filter(r => r.id !== 'exclusions' && r.id !== 'target_category')) {
      expect(r.placeholder).toBe('Milla will fill this')
    }
  })

  it('🛑 a HALF-ANSWERED brief still returns six — the unanswered ones keep their place', async () => {
    // The pre-22-Sep filter dropped exactly these. A client three answers in watched fields
    // appear one at a time out of nowhere instead of filling in.
    const rows = await panel({ target_roles: 'MDs and COOs', geography: 'United Kingdom' })
    expect(rows, 'unanswered fields were filtered out again').toHaveLength(6)
    expect(rows.find(r => r.id === 'target_roles')!.said).toBe('MDs and COOs')
    expect(rows.find(r => r.id === 'company_size')!.said).toBe('')
  })

  // ⛓️ 23 Sep (R142 · A2a) — INVERTED. WAS: '🛑 the category NEVER claims to remove anybody,
  // answered or not' — label "Order by (never excludes)" and note "used to order the results — it
  // never leaves anybody out", unconditionally. Founder, 23 Sep: *"this is why we use apollo drop
  // downs and make sure we do not assume."* The field is now the client's Industry pick from
  // Apollo's own list, and it says where its values come from — whatever they said about it.
  it('🛑 the industry field says it is Apollo\'s list, answered or not', async () => {
    for (const facts of [null, { target_category: 'professional-services firms' }, { target_category: 'SaaS' }]) {
      const row = (await panel(facts))!.find(r => r.id === 'target_category')!
      expect(row.label).toBe('Industry')
      expect(row.note, `the source line vanished for ${JSON.stringify(facts)}`).toBe('from Apollo’s own industry list')
    }
  })

  it('the count the workspace header prints is the server\'s, with its own denominator', async () => {
    const { briefDraftFacts } = await import('@kind/shared')
    const empty = briefDraftFacts(null)
    expect(empty.count).toBe(0)
    expect(empty.total, 'the eleven is no longer stated by the server').toBe(11)
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

// ══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 22 Sep — "YOU EITHER TALK TO MILLA OR DROP THEM DOWN" (founder-locked)
//
// 🛑 The conversation is the primary path and is unchanged. This is the second one: values the
// client chose directly in the workspace. They are stored BESIDE what the client said, never
// over it, and they win when the search is built.
describe('what the client picked beats what we heard — and resolves the review', () => {
  it('a picked size wins over the sentence we could not translate', () => {
    // "a few dozen people" is the founder's own example of an untranslatable answer, and it is
    // the one that stranded a live client: unusable size → operator review → Proof blocked.
    const spoken = icpFromDraft(draft({ company_sizes: ['a few dozen people'] }))
    expect(spoken.company_sizes, 'an untranslatable size somehow produced a band').toEqual([])

    const withPick = icpFromDraft(draft({
      company_sizes: ['a few dozen people'],
      picked: { company_sizes: ['11–50'] },
    }))
    expect(withPick.company_sizes).toEqual(['11–50'])
  })

  it('🛑 AND THE PICK RESOLVES THE REVIEW — the client answered the operator’s question', () => {
    // This is the point of feeding the pick INTO `deriveProviderReview` rather than around it.
    // Without it the ICP is born flagged, Proof waits for a human, and the client is stranded
    // behind a queue with no screen — having already told us the exact canonical value.
    const stranded = icpFromDraft(draft({ company_sizes: ['a few dozen people'] }))
    expect(stranded.icp_review, 'an untranslatable size no longer owes a review').toBeTruthy()

    const resolved = icpFromDraft(draft({
      company_sizes: ['a few dozen people'],
      picked: { company_sizes: ['11–50'] },
    }))
    expect(resolved.icp_review, 'the client resolved it themselves and a review was raised anyway')
      .toBeUndefined()
  })

  it('a picked seniority wins, and it is canonical vocabulary', () => {
    const icp = icpFromDraft(draft({
      seniority_levels: ['whoever owns the P&L'],
      picked: { seniority_levels: ['C-Suite', 'VP / Director'] },
    }))
    expect(icp.seniority_levels).toEqual(['C-Suite', 'VP / Director'])
    expect(icp.icp_review).toBeUndefined()
  })

  it('picked titles and locations win too — both are free text at the provider', () => {
    const icp = icpFromDraft(draft({
      job_titles: ['founders'], geographies: ['England'],
      picked: { job_titles: ['Managing Director', 'COO'], geographies: ['United Kingdom'] },
    }))
    expect(icp.job_titles).toEqual(['Managing Director', 'COO'])
    expect(icp.geographies).toEqual(['United Kingdom'])
  })

  it('🛑 an EMPTY pick is not a pick — clearing a field falls back to what they said', () => {
    // Otherwise unticking the last chip would silently empty the criterion, and an empty
    // closed list means UNCONSTRAINED downstream: the client would have widened their own
    // search to everybody by tidying up a field.
    const icp = icpFromDraft(draft({
      company_sizes: ['11–50'], picked: { company_sizes: [] },
    }))
    expect(icp.company_sizes).toEqual(['11–50'])
  })

  it('🛑 a pick NEVER erases what the client said — the panel must show the disagreement', () => {
    const rows = icpFromDraft(draft({
      company_sizes: ['around twenty to fifty'],
      picked: { company_sizes: ['201–500'] },
    }))
    // ⛓️ 23 Sep — WAS: `rows.target_size` === 'around twenty to fifty'. Storing the phrase on the
    // ICP made the Proof check judge size against the PHRASE while the search used the PICK —
    // Blackburne, 23 Sep: 20 found, 20 set aside on size. The pick is their answer and now the
    // only size on the ICP, so the check judges exactly what was searched.
    expect(rows.target_size, 'the phrase must not outrank the pick on the ICP').toBeUndefined()
    expect(rows.company_sizes).toEqual(['201–500'])
    // ⚠️ AND THE PHRASE IS NOT ERASED — the panel's "you said" reads the DRAFT's own words
    // (`onboardingText`), never this ICP column, so the disagreement stays visible to them.
    const src = readFileSync(join(__dirname, '../routes/milla.ts'), 'utf8')
    expect(src).toContain("row('company_size',    'Employees',    onboardingText('company_size')")
  })
})

// ── ⚑ 22 Sep — "stored & sent as" MEANS WHAT APOLLO RECEIVES ─────────────────────────
describe('the panel prints the provider’s own values, not our labels', () => {
  type Row = { id: string; provider: string[] }
  const panel = async (facts: Record<string, unknown>): Promise<Row[]> => {
    const { briefReadModelFrom } = await import('../routes/milla')
    const { BRIEF_FACT_LABEL, briefDraftFacts } = await import('@kind/shared')
    return briefReadModelFrom(
      draft(facts), briefDraftFacts(facts), { state: 'conversing', unresolvedLabels: [] },
      BRIEF_FACT_LABEL as Record<string, string>, icpFromDraft as never,
    ).onboarding_targeting as Row[]
  }

  it('🛑 seniority prints c_suite / vp / director — not "C-Suite"', () => {
    // We STORE "C-Suite". Apollo receives `c_suite`. A caption reading "stored & sent as" that
    // shows the first is the panel's one claim — that no later comparison can disagree with
    // what was searched — being false on the screen that makes it.
    return panel({ picked: { seniority_levels: ['C-Suite', 'VP / Director'] } }).then(rows => {
      expect(rows.find(r => r.id === 'seniority')!.provider).toEqual(['c_suite', 'vp', 'director'])
    })
  })

  it('🛑 employees prints Apollo’s ranges — 11,50 · 51,200', () => {
    return panel({ picked: { company_sizes: ['11–50', '51–200'] } }).then(rows => {
      expect(rows.find(r => r.id === 'company_size')!.provider).toEqual(['11,50', '51,200'])
    })
  })

  it('titles and locations travel as typed — there is nothing to translate', () => {
    return panel({ picked: { job_titles: ['Managing Director'], geographies: ['United Kingdom'] } })
      .then(rows => {
        expect(rows.find(r => r.id === 'target_roles')!.provider).toEqual(['Managing Director'])
        expect(rows.find(r => r.id === 'geography')!.provider).toEqual(['United Kingdom'])
      })
  })

  it('🛑 the category reaches the provider as NOTHING — it orders, it never filters', () => {
    return panel({ target_category: 'SaaS' }).then(rows => {
      const row = rows.find(r => r.id === 'target_category')!
      expect(row.provider, 'the client’s category is being sent to Apollo again').toEqual([])
    })
  })
})
