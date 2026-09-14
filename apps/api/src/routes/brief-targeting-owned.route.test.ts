import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BRIEF FACTS 5–9 — THE CONFIRMED BRIEF OWNS THE TARGETING, PROVED ON THE WRITTEN ROW. (B5.)
//
// ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────────────────
//
// The implementation was already correct, and the PROOF was not. Facts 5–9 —
//
//     5 target company category · 6 geography · 7 target company type
//     8 company size · 9 target roles (job titles AND seniority)
//
// — were asserted only by matching source text in `lib/brief-promotion-server-owned.test.ts`:
// "the file mentions `f.geographies`". That proves a line exists. It does not prove that a
// contradictory browser value LOSES, that an omitted one cannot erase the confirmed answer, or
// that a sealed draft cannot rewrite live targeting on replay — which are the actual rules.
//
// The pre-deploy certification rejected structural-only proof here because behavioural testing
// is demonstrably practical: `brief-fact-4-owned.route.test.ts` already drives the REAL
// `POST /icps` handler with a mocked confirmed draft and asserts the row that is written. This
// is that harness, pointed at the other five facts.
//
// ⚠️ EVERY ASSERTION IS ON THE PERSISTED ICP ROW, never on source text. Arrays are compared
// exactly — a filter that silently keeps the browser's extra entry is the defect this class of
// bug actually produces.
//
// ⚠️ AND THE THREE SEPARATIONS ARE ASSERTED, NOT ASSUMED:
//   · CATEGORY and COMPANY TYPE are two distinct facts and must not collapse into one;
//   · GEOGRAPHY is where the TARGETS are, never the client's own country;
//   · TARGET ROLES keeps job titles and seniority as separate columns.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  icps: [] as Row[],
  writes: [] as { table: string; op: 'insert' | 'update' | 'upsert'; patch: Row }[],
  draft: null as Row | null,
  sealed: [] as string[],
}

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = (): Row[] => table === 'icps' ? state.icps
    : table === 'clients' ? (state.client ? [state.client] : [])
    : []
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    not(c: string, _op: string, v: unknown) { filters.push(r => (r[c] ?? null) !== v); return q },
    or() { return q },
    order() { return q },
    limit() { return q },
    async single() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    async maybeSingle() { const h = rows().filter(r => filters.every(f => f(r))); return { data: h[0] ?? null, error: null } },
    insert(patch: Row) {
      state.writes.push({ table, op: 'insert', patch })
      const made = { id: `${table}-new`, ...patch }
      if (table === 'icps') state.icps.push(made)
      return {
        select: () => ({ async single() { return { data: made, error: null } },
                         async maybeSingle() { return { data: made, error: null } } }),
        then: (r: (v: unknown) => unknown) => r({ data: made, error: null }),
      }
    },
    upsert(patch: Row) {
      state.writes.push({ table, op: 'upsert', patch })
      return { then: (r: (v: unknown) => unknown) => r({ data: null, error: null }) }
    },
    update(patch: Row) {
      state.writes.push({ table, op: 'update', patch })
      const u: Record<string, unknown> = {
        eq() { return u }, is() { return u }, select() { return u },
        async single() { return { data: { ...(rows()[0] ?? {}), ...patch }, error: null } },
        async maybeSingle() { return { data: { ...(rows()[0] ?? {}), ...patch }, error: null } },
        then: (r: (v: unknown) => unknown) => r({ error: null }),
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) {
      return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async () => ({ data: 1, error: null }),
    auth: { getUser: async () => ({ data: { user: { id: 'user-1', email: 'e@t.test' } }, error: null }) },
  },
}))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('../lib/brief-draft', () => ({
  briefDraftFor: async () => state.draft,
  markBriefDraftPromoted: async (_u: string, c: string) => { state.sealed.push(c); return { ok: true } },
}))

async function postIcp(body: Row) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST / not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const fakeRes = {
    status(c: number) { out.code = c; return fakeRes },
    json(p: Row) { out.payload = p; return fakeRes },
  }
  await handler({ body, headers: {}, params: {}, query: {}, userId: 'user-1' }, fakeRes, () => {})
  return out
}

// ── THE TWO WORLDS. `A` is what the client CONFIRMED with Milla; `B` is what a stale browser
//    tab, an edited component state or a replayed request carries instead. ────────────────
const DRAFT_A = {
  target_category:     'Digital marketing agencies',
  target_company_type: 'agency',
  geographies:         ['United Kingdom', 'Ireland'],
  company_sizes:       ['11-50', '51-200'],
  job_titles:          ['Managing Director', 'Head of Growth'],
  seniority_levels:    ['C-Suite', 'Director'],
}

const BODY_B = {
  target_category:     'Healthcare businesses',
  target_company_type: 'clinic',
  geographies:         ['United States'],
  company_sizes:       ['1000+'],
  job_titles:          ['Practice Manager'],
  seniority_levels:    ['Manager'],
}

/** The ICP the onboarding confirmation posts — with the BROWSER's copy of the targeting. */
const FROM_DRAFT = {
  name: 'Promotion ICP',
  industries: [], tech_stack: [], keywords: [],
  from_brief_draft: true,
  ...BODY_B,
}

/** The ICP row the handler actually wrote. */
const icpRow = (): Row => {
  const w = state.writes.filter(x => x.table === 'icps')
  expect(w.length, 'no ICP row was written at all').toBeGreaterThan(0)
  return w.reduce((a, x) => ({ ...a, ...x.patch }), {} as Row)
}

const confirmed = (facts: Row) => {
  state.draft = { promotedClientId: null, confirmedAt: '2026-09-11T16:41:00Z', facts }
}

// ── ⛓️ 14 Sep (S1-PD-02) — WHERE AN UNTRANSLATABLE CONFIRMED WORD NOW LANDS ─────────────
//
// 🛑 THESE FIXTURES ARE THE CLIENT'S OWN WORDS AND THEY ARE NOT VOCABULARY: `'11-50'` is a
// HYPHEN where `ICP_SIZES` holds an EN-DASH (`'11–50'`), and `'Director'` is not a value of
// `ICP_SENIORITY` at all (it holds `'VP / Director'`). Until this round the promotion path
// wrote them into the provider columns VERBATIM — the confirmed draft overrode the body and
// nothing translated the result — which is precisely the founder's rule inverted: the
// client's sentence handed to Apollo as if it were a filter value.
//
// ⚠️ SO THESE ASSERTIONS MOVED, AND EVERY ONE OF THEM GOT STRICTER. B5's claim is unchanged
// and still proved: the CONFIRMED answer beats the browser's, and not one of B's values
// survives anywhere. What is new is that A's untranslatable words must be somewhere provable
// — as review evidence, blocking sourcing — rather than silently either dropped or shipped to
// a provider. Each test below now pins BOTH halves: what reached the column, and what reached
// the review. Nothing here asserts less than it did.
const reviewSaid = (field: string): string[] => {
  const review = icpRow().icp_review as { requirements?: Array<{ field: string; said: string[] }> } | undefined
  return review?.requirements?.find(r => r.field === field)?.said ?? []
}

beforeEach(() => {
  state.client = { id: 'client-1', user_id: 'user-1', proof_passes_done: 0, credit_balance: 0 }
  state.icps = []
  state.writes = []
  state.draft = null
  state.sealed = []
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-one'
})

// ═══════════════════════════════════════════════════════════════════════════════════════
describe('🛑 B5-A · confirmed value A beats a contradictory browser value B', () => {
  it('fact 5 · target category — A wins', async () => {
    confirmed(DRAFT_A)
    const r = await postIcp(FROM_DRAFT)
    expect(r.code).toBe(201)
    expect(icpRow().target_category).toBe('Digital marketing agencies')
  })

  it('fact 7 · target company type — A wins', async () => {
    confirmed(DRAFT_A)
    await postIcp(FROM_DRAFT)
    expect(icpRow().target_company_type).toBe('agency')
  })

  it('fact 6 · geography — A wins, EXACTLY (no merge with the body)', async () => {
    confirmed(DRAFT_A)
    await postIcp(FROM_DRAFT)
    expect(icpRow().geographies).toEqual(['United Kingdom', 'Ireland'])
    expect(icpRow().geographies).not.toContain('United States')
  })

  it('fact 8 · company size — A wins, EXACTLY, and A\'s untranslatable words are KEPT', async () => {
    confirmed(DRAFT_A)
    await postIcp(FROM_DRAFT)
    // Neither of A's two sizes is in `ICP_SIZES` (hyphen, not en-dash), so neither may reach
    // the provider column — and the browser's `'1000+'` certainly may not.
    expect(icpRow().company_sizes).toEqual([])
    expect(icpRow().company_sizes).not.toContain('1000+')
    // 🛑 BUT THEY ARE NOT LOST. A's exact words, verbatim, as the evidence a human resolves.
    expect(reviewSaid('company_sizes')).toEqual(['11-50', '51-200'])
    expect(reviewSaid('company_sizes'), 'the browser\'s value is not evidence').not.toContain('1000+')
  })

  it('fact 9 · target roles — job titles AND seniority both come from A, separately', async () => {
    confirmed(DRAFT_A)
    await postIcp(FROM_DRAFT)
    // `job_titles` is OPEN TEXT — no closed vocabulary sits between the client and this
    // column, so A's answer reaches it exactly as it always did.
    expect(icpRow().job_titles).toEqual(['Managing Director', 'Head of Growth'])
    // `seniority_levels` is CLOSED. A said two things; one is vocabulary and one is not, and
    // the split is honoured in both directions rather than the pair being taken or dropped
    // together.
    expect(icpRow().seniority_levels).toEqual(['C-Suite'])
    expect(reviewSaid('seniority_levels')).toEqual(['Director'])
    expect(icpRow().seniority_levels, 'the browser\'s value never arrives').not.toContain('Manager')
  })

  it('🛑 all five at once — not one of B’s values survives anywhere on the row', async () => {
    confirmed(DRAFT_A)
    await postIcp(FROM_DRAFT)
    const row = JSON.stringify(icpRow())
    for (const leaked of ['Healthcare businesses', 'clinic', 'United States', '1000+', 'Practice Manager', 'Manager']) {
      expect(row, `the browser's "${leaked}" reached the persisted ICP`).not.toContain(leaked)
    }
  })
})

describe('🛑 B5-B · an omitted browser field cannot lose the confirmed answer', () => {
  const bare = { name: 'Promotion ICP', industries: [], tech_stack: [], keywords: [], from_brief_draft: true }

  it('the body carries NO targeting at all — the confirmed brief supplies all five', async () => {
    confirmed(DRAFT_A)
    const r = await postIcp(bare)
    expect(r.code).toBe(201)
    const row = icpRow()
    expect(row.target_category).toBe('Digital marketing agencies')
    expect(row.target_company_type).toBe('agency')
    expect(row.geographies).toEqual(['United Kingdom', 'Ireland'])
    expect(row.job_titles).toEqual(['Managing Director', 'Head of Growth'])
    // The two CLOSED lists: what translated reached the column, what did not reached the
    // review. A body carrying nothing still loses none of the confirmed answer.
    expect(row.company_sizes).toEqual([])
    expect(reviewSaid('company_sizes')).toEqual(['11-50', '51-200'])
    expect(row.seniority_levels).toEqual(['C-Suite'])
    expect(reviewSaid('seniority_levels')).toEqual(['Director'])
  })

  it('an EMPTY array from the browser does not blank a confirmed list', async () => {
    confirmed(DRAFT_A)
    await postIcp({ ...bare, geographies: [], company_sizes: [], job_titles: [], seniority_levels: [] })
    const row = icpRow()
    expect(row.geographies).toEqual(['United Kingdom', 'Ireland'])
    expect(row.job_titles).toEqual(['Managing Director', 'Head of Growth'])
    // An empty array from the browser does not blank the confirmed size either — it is still
    // A's answer that is being carried, and it is carried to the review because it is not
    // vocabulary, NOT because the browser sent `[]`.
    expect(reviewSaid('company_sizes')).toEqual(['11-50', '51-200'])
  })

  it('🛑 and a BLANK draft fact falls back rather than blanking what Milla proposed', async () => {
    // R72 ⑦ — an absence is never read as "empty this filter".
    confirmed({ ...DRAFT_A, target_category: '   ', geographies: [], job_titles: [' ', ''] })
    await postIcp(FROM_DRAFT)
    const row = icpRow()
    expect(row.target_category).toBe('Healthcare businesses')     // the body's, untouched
    expect(row.geographies).toEqual(['United States'])
    expect(row.job_titles).toEqual(['Practice Manager'])
    // …while the facts the draft DOES hold still win.
    expect(row.target_company_type).toBe('agency')
    expect(reviewSaid('company_sizes'), 'the draft\'s size still wins over the body\'s').toEqual(['11-50', '51-200'])
    expect(reviewSaid('company_sizes')).not.toContain('1000+')
  })
})

describe('B5-C · no owning draft — the legacy/body path is unchanged', () => {
  it('no draft at all → every one of the five is the body’s', async () => {
    state.draft = null
    const r = await postIcp(FROM_DRAFT)
    expect(r.code).toBe(201)
    const row = icpRow()
    expect(row.target_category).toBe('Healthcare businesses')
    expect(row.target_company_type).toBe('clinic')
    expect(row.geographies).toEqual(['United States'])
    expect(row.job_titles).toEqual(['Practice Manager'])
    // ⛓️ The body's own words face the SAME closed vocabularies — no door is exempt. `'1000+'`
    // is not `'1,000+'`, so it becomes review evidence; `'Manager'` IS `ICP_SENIORITY`, so it
    // reaches the column. The legacy path is unchanged in WHOSE words are used, which is what
    // B5-C is about; it was never a licence to write un-normalised text to a provider column.
    expect(row.company_sizes).toEqual([])
    expect(reviewSaid('company_sizes')).toEqual(['1000+'])
    expect(row.seniority_levels).toEqual(['Manager'])
  })

  it('and a non-promotion save (no from_brief_draft) reads no draft either', async () => {
    confirmed(DRAFT_A)
    const { from_brief_draft: _named, ...notAPromotion } = FROM_DRAFT
    await postIcp(notAPromotion)
    // `promotionDraft` is only read when the act is NAMED, so an ordinary ICP save is
    // untouched by the promotion overrides.
    expect(icpRow().target_category).toBe('Healthcare businesses')
  })
})

describe('B5-D · an UNCONFIRMED draft owns nothing', () => {
  it('eleven facts without a confirmation is not authority — the body stands', async () => {
    state.draft = { promotedClientId: null, confirmedAt: null, facts: DRAFT_A }
    await postIcp(FROM_DRAFT)
    const row = icpRow()
    expect(row.target_category).toBe('Healthcare businesses')
    expect(row.geographies).toEqual(['United States'])
  })
})

describe('🛑 B5-E · a SEALED draft cannot rewrite live targeting on replay', () => {
  it('an already-promoted draft owns nothing — the body stands', async () => {
    state.draft = { promotedClientId: 'client-1', confirmedAt: '2026-09-11T16:41:00Z', facts: DRAFT_A }
    await postIcp(FROM_DRAFT)
    const row = icpRow()
    expect(row.target_category).toBe('Healthcare businesses')
    expect(row.target_company_type).toBe('clinic')
    expect(row.geographies).toEqual(['United States'])
  })

  it('🛑 B5-F · and a replayed promotion writes NO targeting at all', async () => {
    // The core ICP already exists. The replay branch answers with it and touches nothing —
    // which is what stops a stale onboarding snapshot overwriting targeting that has
    // legitimately moved on since.
    confirmed(DRAFT_A)
    await postIcp(FROM_DRAFT)
    expect(state.icps).toHaveLength(1)
    state.writes = []
    const again = await postIcp(FROM_DRAFT)
    expect(again.code).toBe(200)
    expect(again.payload.replayed).toBe(true)
    expect(state.writes.filter(w => w.table === 'icps'), 'a replay rewrote the ICP').toEqual([])
    expect(state.icps).toHaveLength(1)
  })
})

describe('🛑 B5 · the three separations the founder locked', () => {
  it('CATEGORY and COMPANY TYPE stay two distinct facts', async () => {
    confirmed({ ...DRAFT_A, target_category: 'Digital marketing agencies', target_company_type: 'agency' })
    await postIcp(FROM_DRAFT)
    const row = icpRow()
    expect(row.target_category).toBe('Digital marketing agencies')
    expect(row.target_company_type).toBe('agency')
    expect(row.target_category).not.toBe(row.target_company_type)
  })

  it('a draft holding ONLY the category leaves company type to the body — never copied across', async () => {
    confirmed({ target_category: 'Digital marketing agencies' })
    await postIcp(FROM_DRAFT)
    const row = icpRow()
    expect(row.target_category).toBe('Digital marketing agencies')
    // If these ever collapse, one client utterance would silently satisfy two facts at write
    // time — the exact conflation `brief-facts.ts` documents as founder-locked apart.
    expect(row.target_company_type).toBe('clinic')
  })

  it('GEOGRAPHY is the TARGETS’ geography, never the client’s own country', async () => {
    // `facts.country` is an ACCOUNT fact (where the client's business is) and is deliberately
    // not one of the eleven. It must never leak into the ICP's geographies.
    confirmed({ ...DRAFT_A, country: 'South Africa' })
    await postIcp(FROM_DRAFT)
    expect(icpRow().geographies).toEqual(['United Kingdom', 'Ireland'])
    expect(icpRow().geographies).not.toContain('South Africa')
  })

  it('TARGET ROLES keeps titles and seniority in their own columns', async () => {
    confirmed({ ...DRAFT_A, job_titles: ['Managing Director'], seniority_levels: ['C-Suite'] })
    await postIcp(FROM_DRAFT)
    const row = icpRow()
    expect(row.job_titles).toEqual(['Managing Director'])
    expect(row.seniority_levels).toEqual(['C-Suite'])
    expect(row.job_titles).not.toEqual(row.seniority_levels)
  })

  it('titles alone satisfy the fact without inventing a seniority', async () => {
    confirmed({ ...DRAFT_A, seniority_levels: [] })
    await postIcp(FROM_DRAFT)
    expect(icpRow().job_titles).toEqual(['Managing Director', 'Head of Growth'])
    // Nothing is fabricated: the draft is silent on seniority, so the body's value stands.
    expect(icpRow().seniority_levels).toEqual(['Manager'])
  })
})
