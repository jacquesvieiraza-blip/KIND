// ══════════════════════════════════════════════════════════════════════════════════════════
// J6-C1 · A REFINEMENT CHANGES WHAT THE CLIENT CHANGED, AND NOTHING ELSE
//
// REQ: *"Omitted fact untouched; change only by explicit statement; pass 2 uses six criteria"*
// (LR 10; FD-2).
//
// ── THE DEFECT IS ONE ZOD MODIFIER, AND ITS OWN COMMENT DESCRIBES THE OPPOSITE ──────────
//
//     // ⚠️ DEFAULTED TO '' RATHER THAN OMITTED, so an older client saving a targeting change
//     // does not silently blank a category they already have…
//     target_category:     z.string().max(200).default(''),
//     target_company_type: z.string().max(120).default(''),
//
// 🛑 `.default('')` IS WHAT SILENTLY BLANKS IT. An ABSENT key becomes `''` in the parsed
// object, that object IS the update patch (`saveClientTargeting` writes `{ ...body }`), and
// the statement that reaches Postgres is `SET target_category = ''`. The comment states the
// intention correctly and the code does the reverse of it.
//
// ⚠️ AND THE PORTAL NEVER SENDS IT. `saveIcpDraft` posts `name, industries, job_titles,
// seniority_levels, company_sizes, geographies, tech_stack, keywords` — `target_category` is
// not in the list. So the field is absent on EVERY refinement, and every refinement wiped it.
//
// ── WHAT THAT COSTS, AND IT IS THE FOUNDER'S OWN CANARY ─────────────────────────────────
//
// `target_category` is the column the founder locked as the only authority on client intent,
// and `categoryVerdict` reads it. Blank it and *"an unstated criterion is not a test"* —
// the category verdict returns `yes` for every company on earth. So a client who said
// "digital marketing agencies", then asked for "smaller ones", got a pass 2 sourced with the
// category criterion switched off entirely. Their refinement removed the requirement they had
// been most specific about.
//
// ── THE SHAPE `exclusions` ALREADY HAS ────────────────────────────────────────────────────
//
// `icpSchema` does not declare `exclusions` at all, so it is not in the patch, so a revision
// cannot touch it. That is the correct behaviour and it arrived by omission. `.optional()`
// gives the two category fields the same property deliberately: absent means untouched, and
// an explicitly sent `''` still clears — which is what *"change only by explicit statement"*
// requires in both directions.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>

const state: { clients: Row[]; icps: Row[]; txs: Row[]; camps: Row[]; leads: Row[] } =
  { clients: [], icps: [], txs: [], camps: [], leads: [] }
/** Every patch handed to `update()` on `icps`, in order. The assertion surface of this file. */
const icpPatches: Row[] = []

function table(name: string) {
  const rows = (): Row[] =>
    name === 'icps' ? state.icps : name === 'credit_transactions' ? state.txs
    : name === 'figsy_campaigns' ? state.camps : name === 'leads' ? state.leads : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[], _limit: 0,
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    neq(c: string, v: unknown) { q._f.push((r: Row) => r[c] !== v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    gte() { return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    not(c: string, op: string, v: unknown) {
      if (op === 'is' && v === null) { q._f.push((r: Row) => (r[c] ?? null) !== null); return q }
      return q
    },
    order() { return q },
    limit(n: number) { q._limit = n; return q },
    update(patch: Row) {
      if (name === 'icps') icpPatches.push(patch)
      // The row the route then reads back is the stored row MERGED with the patch, which is
      // exactly what Postgres would return — so a patch that omits a key leaves it standing.
      const hit = q._hit()[0]
      if (hit) Object.assign(hit, patch)
      return q
    },
    insert(v: Row) { rows().push({ id: 'new-icp', ...v }); return q },
    async upsert() { return { error: null } },
    _hit() {
      const all = rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r)))
      return q._limit > 0 ? all.slice(0, q._limit) : all
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'nobody@example.com' } } }) } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_r: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))

const C = 'c-refine'
const USER = 'u-refine'

/** The state a refinement actually happens in: a client with one saved, not-yet-live ICP. */
function savedIcp(over: Row = {}) {
  state.icps.push({
    id: 'icp-1', client_id: C, name: 'Digital marketing agencies', is_active: false,
    pending_targeting: null, pending_campaign_intent: null,
    target_category: 'digital marketing agencies', target_company_type: 'agency',
    exclusions: 'no recruitment agencies',
    industries: ['Media'], geographies: ['United Kingdom'], job_titles: ['Founder'],
    seniority_levels: ['founder'], company_sizes: ['11–50'], tech_stack: [], keywords: [],
    created_at: '2026-09-01T00:00:00.000Z', ...over,
  })
}

async function revise(body: Row): Promise<{ status: number; body: any }> {
  const mod = await import('../routes/icps')
  const layer = (mod.icpRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/revise' && l.route?.methods.post)
  if (!layer) throw new Error('POST /revise not found on icpRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let status = 200
  let payload: any = null
  const res: any = { status(c: number) { status = c; return res }, json(b: unknown) { payload = b; return res } }
  await handler({ userId: USER, query: {}, body, params: {} }, res, () => {})
  return { status, body: payload }
}

/** The patch that actually reached `icps`. `null` when nothing was written. */
const lastPatch = (): Row | null => icpPatches[icpPatches.length - 1] ?? null

beforeEach(() => {
  state.clients = [{ id: C, user_id: USER, commercial_model: 'programme', proof_passes_done: 1 }]
  state.icps = []; state.txs = []; state.camps = []; state.leads = []
  icpPatches.length = 0
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① AN OMITTED FACT IS NOT A CHANGE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J6-C1 · a refinement that says nothing about the category leaves it alone', () => {
  /** What the portal actually sends: the seven lists and a name. No category, ever. */
  const PORTAL_REVISION = {
    name: 'Digital marketing agencies',
    industries: ['Media'], job_titles: ['Founder'], seniority_levels: ['founder'],
    company_sizes: ['1–10'], geographies: ['United Kingdom'], tech_stack: [], keywords: [],
  }

  it('🛑 `target_category` IS NOT IN THE WRITE — it cannot be blanked by omission', async () => {
    savedIcp()
    await revise(PORTAL_REVISION)
    const patch = lastPatch()
    expect(patch, 'the refinement wrote nothing at all').toBeTruthy()
    expect(
      Object.prototype.hasOwnProperty.call(patch!, 'target_category'),
      'a refinement that never mentioned the category still wrote to that column',
    ).toBe(false)
  })

  it('🛑 and the row still holds it afterwards — the founder\'s canary survives', async () => {
    savedIcp()
    await revise(PORTAL_REVISION)
    expect(
      state.icps[0].target_category,
      'the client asked for smaller companies and lost the kind of company entirely',
    ).toBe('digital marketing agencies')
  })

  it('`target_company_type` is the same fact and gets the same protection', async () => {
    savedIcp()
    await revise(PORTAL_REVISION)
    expect(Object.prototype.hasOwnProperty.call(lastPatch()!, 'target_company_type')).toBe(false)
    expect(state.icps[0].target_company_type).toBe('agency')
  })

  it('`exclusions` was already safe by omission, and still is', async () => {
    // FD-1's suppression is not in `icpSchema` at all, so it was never in the patch. Pinned
    // because "safe because nobody declared it" is one schema edit away from not being true.
    savedIcp()
    await revise(PORTAL_REVISION)
    expect(Object.prototype.hasOwnProperty.call(lastPatch()!, 'exclusions')).toBe(false)
    expect(state.icps[0].exclusions).toBe('no recruitment agencies')
  })

  it('the thing the client DID change is changed', async () => {
    savedIcp()
    await revise(PORTAL_REVISION)
    expect(lastPatch()!.company_sizes, 'the refinement did not apply').toEqual(['1–10'])
    expect(state.icps[0].company_sizes).toEqual(['1–10'])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② CHANGE ONLY BY EXPLICIT STATEMENT — WHICH CUTS BOTH WAYS
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J6-C1 · an explicit statement still changes it', () => {
  // 🛑 AND THIS ONE FOUND A SECOND DEFECT, IN THE OPPOSITE DIRECTION. `revisionIsRepeat`
  // compares `diffTargeting`, which reads `TARGETING_FIELDS` — the seven PROVIDER lists and
  // deliberately nothing else. So a refinement whose ONLY change was the client's stated
  // category matched "nothing moved", was short-circuited before any write, and answered 200
  // with `wrote: false`. An explicit statement we DISCARD breaks "change only by explicit
  // statement" exactly as an omission we WRITE does.
  it('🛑 a NEW category is written', async () => {
    savedIcp()
    await revise({
      name: 'Brand studios', target_category: 'brand studios',
      industries: ['Media'], job_titles: ['Founder'], seniority_levels: ['founder'],
      company_sizes: ['11–50'], geographies: ['United Kingdom'], tech_stack: [], keywords: [],
    })
    expect(lastPatch(), 'the repeat short-circuit swallowed a real change').toBeTruthy()
    expect(lastPatch()!.target_category, 'an explicit change was dropped').toBe('brand studios')
    expect(state.icps[0].target_category).toBe('brand studios')
  })

  it('a genuine repeat is STILL a repeat — the short-circuit is narrowed, not removed', async () => {
    // Re-sending exactly what is already stored must still write nothing. That is what makes
    // the one client-side retry safe (C01), and widening the "did anything move" question
    // must not turn every retry into a second version.
    savedIcp()
    await revise({
      name: 'Digital marketing agencies', target_category: 'digital marketing agencies',
      target_company_type: 'agency',
      industries: ['Media'], job_titles: ['Founder'], seniority_levels: ['founder'],
      company_sizes: ['11–50'], geographies: ['United Kingdom'], tech_stack: [], keywords: [],
    })
    expect(lastPatch(), 'an unchanged re-send wrote a new version').toBeNull()
  })

  it('🛑 and a repeat that OMITS the category is still a repeat — absent is not a move', async () => {
    // THE ORDINARY CASE, and the one my first cut of `categoryMoved` got wrong: the portal
    // sends no category when the draft holds none, so comparing an ABSENT key against the
    // stored value reads every such re-send as a change — minting a second ICP version and
    // an operator alert for a request that asked for nothing. Absent means "no change"; that
    // is the whole property `.optional()` buys and it has to be read on both sides.
    savedIcp()
    await revise({
      name: 'Digital marketing agencies',
      industries: ['Media'], job_titles: ['Founder'], seniority_levels: ['founder'],
      company_sizes: ['11–50'], geographies: ['United Kingdom'], tech_stack: [], keywords: [],
    })
    expect(lastPatch(), 'a re-send that simply said nothing about the category wrote anyway').toBeNull()
  })

  it('🛑 an explicitly EMPTY category clears it — "untouched" must not become "unclearable"', async () => {
    // A client who says "actually, any kind of company" has stated something, and the
    // difference between that and saying nothing is exactly what `.optional()` preserves and
    // `.default('')` destroyed.
    savedIcp()
    await revise({
      name: 'Anyone', target_category: '',
      industries: [], job_titles: ['Founder'], seniority_levels: ['founder'],
      company_sizes: ['11–50'], geographies: ['United Kingdom'], tech_stack: [], keywords: [],
    })
    expect(Object.prototype.hasOwnProperty.call(lastPatch()!, 'target_category')).toBe(true)
    expect(state.icps[0].target_category).toBe('')
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE SCREEN CARRIES WHAT THE CLIENT SAID
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J6-C1 · the refinement payload can carry an explicit change', () => {
  const CONV = readFileSync(
    join(__dirname, '../../../portal/src/components/milla/MillaConversation.tsx'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

  it('🛑 `saveIcpDraft` sends the category when the draft holds one', () => {
    // Omitting it made an explicit change impossible to express: the model could return a new
    // category and the browser dropped it before the request. With the schema fixed, omitting
    // it is now merely "no change" — so the field has to be sent when there IS one.
    expect(CONV, 'the refinement payload cannot express a category change at all')
      .toMatch(/target_category/)
    expect(CONV).toMatch(/target_company_type/)
  })

  it('and it is sent CONDITIONALLY — an absent draft field must stay absent', () => {
    // Sending `target_category: ''` unconditionally would re-create the exact defect one
    // layer up: every refinement would carry an explicit clear.
    expect(CONV).toMatch(/\.\.\.\(icpDraft\.target_category \?/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ④ PASS 2 STILL JUDGES ON EVERY CRITERION
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J6-C1 · pass 2 uses the whole rule', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  it('the one widened retry drops seniority and size ONLY — never the category', async () => {
    const src = code('../routes/icps.ts')
    expect(src).toMatch(/const widened = \{ \.\.\.icpForSearch, seniority_levels: \[\], company_sizes: \[\] \}/)
    expect(src, 'the widened fallback started dropping the client\'s own category')
      .not.toMatch(/const widened = \{[^}]*target_category/)
  })

  it('the run reads the whole ICP row, so every criterion reaches the gate', async () => {
    const src = code('../routes/icps.ts')
    expect(src).toMatch(/\.from\('icps'\)\.select\('\*'\)\.eq\('id', icpId\)/)
  })

  it('and the criteria are still all seven', async () => {
    const { HARD_CRITERIA } = await import('./proof-fit')
    expect([...HARD_CRITERIA]).toEqual([
      'geography', 'size', 'industry', 'category', 'company_type', 'seniority', 'excluded',
    ])
  })
})
