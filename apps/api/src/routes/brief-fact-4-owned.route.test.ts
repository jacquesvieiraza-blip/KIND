import { describe, it, expect, vi, beforeEach } from 'vitest'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BRIEF FACT #4 — "WHAT THE COMPANY DOES / BUSINESS CONTEXT" — IS THE SERVER'S.
// (S1-AUDIT-002, founder-locked 13 Sep.)
//
// ── THE DEFECT ─────────────────────────────────────────────────────────────────────────
//
// `what_they_do` is one of the eleven. It is stored (`BriefDraftFacts.what_they_do`), written
// by `PUT /milla/brief-draft`, counted by the canonical counter, and the promotion gate
// REFUSES a brief without it. Yet nothing in promotion read it: the client's business context
// reached `figsy_knowledge.pitch.data.product` entirely from `req.body.business.product`.
//
// So the browser could contradict the confirmed brief with a different business description,
// or omit the field and lose the fact altogether — the same defect S1-AUDIT-002 exists to
// close, surviving at a second destination after the first was fixed.
//
// ── 🛑 WHAT THE BUSINESS DOES ≠ INDUSTRY (founder-locked) ─────────────────────────────
//
// `clients.industry` is a SEPARATE classification field and it is NOT this fact. It stays the
// body's, it keeps its meaning, and nothing here writes it. Substituting one for the other
// was explicitly ruled out, so it is asserted rather than assumed.
//
// ⚠️ EVERY CASE DRIVES THE REAL `POST /icps` HANDLER and asserts the row that is actually
// upserted. The lesson this repo keeps relearning is that a helper can be right and the route
// can call it wrong — and this fact has no helper at all, only the route.
// ═══════════════════════════════════════════════════════════════════════════════════════

type Row = Record<string, unknown>

const state = {
  client: null as Row | null,
  icps: [] as Row[],
  writes: [] as { table: string; op: 'insert' | 'update' | 'upsert'; patch: Row }[],
  /** the caller's brief draft, or null for a journey that never had one */
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

/** The ICP the onboarding confirmation posts. */
const FROM_DRAFT = {
  name: 'Digital marketing agencies — UK',
  target_category: 'Digital marketing agencies',
  target_company_type: 'agency',
  industries: ['Marketing and Advertising'],
  job_titles: ['Managing Director'],
  seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'],
  geographies: ['United Kingdom'],
  tech_stack: [],
  keywords: [],
  from_brief_draft: true,
}

const WATCHES = 'We restore and sell vintage watches.'
const SOFTWARE = 'We sell accounting software.'

/** The `figsy_knowledge` pitch row the handler actually upserted, or undefined. */
const pitchData = (): Row | undefined => {
  const w = state.writes.filter(x => x.table === 'figsy_knowledge' && x.patch.kind === 'pitch')
  return w.length ? (w[w.length - 1].patch.data as Row) : undefined
}

/** a confirmed, unpromoted draft holding exactly these facts */
const confirmed = (facts: Row) => {
  state.draft = { promotedClientId: null, confirmedAt: '2026-09-11T16:41:00Z', facts }
}

beforeEach(() => {
  state.client = { id: 'client-1', user_id: 'user-1', proof_passes_done: 0, credit_balance: 0 }
  state.icps = []
  state.writes = []
  state.draft = null
  state.sealed = []
  process.env.ANTHROPIC_API_KEY = 'test-key-not-a-real-one'
})

describe('🛑 brief fact #4 — the confirmed Brief owns what the company does', () => {
  it('1 · confirmed what_they_do BEATS a contradictory browser business.product', async () => {
    confirmed({ what_they_do: WATCHES })
    const r = await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE } })
    expect(r.code).toBe(201)
    expect(
      pitchData()?.product,
      'the browser overwrote the business context the client confirmed',
    ).toBe(WATCHES)
  })

  it('2 · a browser that OMITS business.product cannot lose the confirmed fact', async () => {
    confirmed({ what_they_do: WATCHES })
    // No `business` key at all. Without the injection `persistMillaUnderstanding` returns
    // early on `hasBusiness` and writes NOTHING, which is how the fact used to vanish.
    const r = await postIcp({ ...FROM_DRAFT })
    expect(r.code).toBe(201)
    expect(pitchData()?.product).toBe(WATCHES)
  })

  it('2b · an EMPTY business object loses it too, without the injection', async () => {
    confirmed({ what_they_do: WATCHES })
    await postIcp({ ...FROM_DRAFT, business: {} })
    expect(pitchData()?.product).toBe(WATCHES)
  })

  it('3 · NO owning draft — the body-driven business/product behaviour is unchanged', async () => {
    state.draft = null
    const r = await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE } })
    expect(r.code).toBe(201)
    expect(pitchData()?.product).toBe(SOFTWARE)
  })

  it('3b · an UNCONFIRMED draft owns nothing — the body still stands', async () => {
    state.draft = { promotedClientId: null, confirmedAt: null, facts: { what_they_do: WATCHES } }
    await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE } })
    expect(pitchData()?.product).toBe(SOFTWARE)
  })

  it('3c · an ALREADY-PROMOTED draft owns nothing — a replay cannot rewrite the row', async () => {
    state.draft = {
      promotedClientId: 'client-1', confirmedAt: '2026-09-11T16:41:00Z',
      facts: { what_they_do: WATCHES },
    }
    await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE } })
    expect(pitchData()?.product).toBe(SOFTWARE)
  })

  it('🛑 4 · clients.industry is NOT this fact and is never written from it', async () => {
    confirmed({ what_they_do: WATCHES })
    await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE }, industry: 'Retail' })
    // WHAT THE BUSINESS DOES != INDUSTRY. This route writes no `industry` at all, and
    // certainly never the brief's words into it.
    const industryWrites = state.writes.filter(w => 'industry' in w.patch)
    expect(industryWrites, `industry was written by POST /icps: ${JSON.stringify(industryWrites)}`)
      .toEqual([])
    expect(pitchData()?.product).toBe(WATCHES)
  })

  it('🛑 a BLANK draft fact does not blank what the client approved on screen', async () => {
    // The eleven-fact gate has already refused a brief missing this, so a blank here means a
    // draft that never captured it — falling back is right, blanking is the one direction
    // R72 ⑦ forbids reading into an absence.
    confirmed({ what_they_do: '   ' })
    await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE } })
    expect(pitchData()?.product).toBe(SOFTWARE)
  })

  it('exclusions keep their own destination, unchanged, in the same gate', async () => {
    confirmed({ what_they_do: WATCHES, exclusions: 'No sole traders.' })
    await postIcp({ ...FROM_DRAFT, business: { product: SOFTWARE, bad_fit: 'No agencies.' } })
    expect(pitchData()?.product).toBe(WATCHES)
    expect(pitchData()?.bad_fit).toBe('No sole traders.')
  })

  it('the rest of the pitch row is untouched — no figsy_knowledge redesign', async () => {
    confirmed({ what_they_do: WATCHES })
    await postIcp({
      ...FROM_DRAFT,
      business: { product: SOFTWARE, pitch: 'Handmade, guaranteed.', pain_points: 'Fakes.', tone: 'warm' },
    })
    const d = pitchData()!
    expect(d.pitch).toBe('Handmade, guaranteed.')
    expect(d.pain_points).toBe('Fakes.')
    expect(d.source).toBe('milla_onboarding')
    // And the key set is exactly what it was before this correction.
    expect(Object.keys(d).sort()).toEqual(
      ['bad_fit', 'differentiators', 'pain_points', 'pitch', 'product', 'proof_all', 'source'])
  })
})
