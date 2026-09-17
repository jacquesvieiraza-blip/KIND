// ══════════════════════════════════════════════════════════════════════════════════════════
// J4-C1 · PROMOTION IS ONE SERVER-OWNED ACT — client + ICP + seal + Proof, or none of them
//
// ── THE DEFECT ──────────────────────────────────────────────────────────────────────────
//
// Promotion is FOUR browser calls, in sequence, from `apps/portal/.../milla/welcome/page.tsx`:
//
//     1. POST /milla/brief-draft/confirm   → the seal
//     2. POST /auth/onboard                → the client row
//     3. POST /icps                        → the ICP
//     4. POST /icps/:id/proof              → the Proof claim
//
// Every gap between them is a stranding. A closed tab, a dropped connection, a phone that
// slept, a 500 on leg 3 — each leaves a real person half-promoted: sealed with no client, or
// a client with no ICP, or an ICP whose Proof never started. Nothing on the server knows the
// journey was meant to continue, so nothing finishes it and nothing reports it. The client
// sees a dead screen and we see a healthy 200 on leg 1.
//
// 🛑 AND THE BROWSER IS THE ONLY THING SEQUENCING IT. That is what "server-owned" means here
// and why LR 6/21 and PV 07 require it: the four legs are one decision — *this client agreed
// to this brief* — and a decision cannot be spread across four requests from a device we do
// not control.
//
// ── WHAT THIS FILE ASSERTS, AND WHY IT IS A BEHAVIOUR TEST ──────────────────────────────
//
// It calls the REAL confirm route through the real router and then reads the STATE. Not "the
// route calls a function named promote" — a source-text assertion would pass for a call that
// throws, a call inside a dead branch, or a call whose result is discarded. The question is
// only ever: after one confirm, do all four artifacts exist?
//
// ⚠️ THE F-BROWSER CASE IS THE FIRST TEST, and it is the whole point. Exactly ONE request is
// made and then the client vanishes. No second call, no retry, no cleanup pass. If promotion
// needs a second request to be whole, this test fails — which is precisely the RED state.
//
// ⚠️ F-DUP IS THE SECOND. A replayed confirm must return the WINNER's ids and create nothing
// — one client, one ICP, one seal, one Proof claim — because the double-click is the normal
// case on a slow connection and a second Proof claim would spend the client's second free
// pass before they have seen the first batch.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'

type Row = Record<string, unknown>

/** Every table promotion touches. Nothing here is a product opinion — it is storage. */
const state = {
  drafts: [] as Row[],
  clients: [] as Row[],
  icps: [] as Row[],
  /** the Proof claim: `clients.proof_passes_done` / `proof_started_at` in the real schema */
  proof_claims: [] as Row[],
  audit: [] as Row[],
  partners: [] as Row[],
  partner_referrals: [] as Row[],
  subscriptions: [] as Row[],
  /** a decisive read fails — F-DBREAD */
  unreadable: null as string | null,
}

/** Real table name → the bag above. The Proof claim lives on `clients` in the real schema
 *  (`proof_passes_done` / `proof_started_at`, written by `try_claim_proof_pass`), so there is
 *  no separate table for it — `proof_claims` below is only a convenience for a future shape. */
const TABLES: Record<string, keyof typeof state> = {
  onboarding_brief_drafts: 'drafts',
  clients: 'clients',
  icps: 'icps',
  partners: 'partners',
  partner_referrals: 'partner_referrals',
  subscriptions: 'subscriptions',
}
const bag = (name: string): Row[] => {
  const key = TABLES[name] ?? name
  const t = state as unknown as Record<string, Row[]>
  if (!Array.isArray(t[key as string])) t[key as string] = []
  return t[key as string]
}

function table(name: string) {
  const filters: ((r: Row) => boolean)[] = []
  const rows = () => bag(name)
  const fail = () => { if (state.unreadable === name) throw new Error(`relation "${name}" does not exist`) }
  const q: Record<string, unknown> = {
    select() { return q },
    eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
    is(c: string, v: unknown) { filters.push(r => (r[c] ?? null) === v); return q },
    in(c: string, v: unknown[]) { filters.push(r => v.includes(r[c])); return q },
    order() { return q }, limit() { return q },
    async maybeSingle() { fail(); const hit = rows().filter(r => filters.every(f => f(r))); return { data: hit[0] ?? null, error: null } },
    async single() { fail(); const hit = rows().filter(r => filters.every(f => f(r))); return { data: hit[0] ?? null, error: hit[0] ? null : { message: 'no rows' } } },
    insert(row: Row | Row[]) {
      const made = (Array.isArray(row) ? row : [row]).map((r, i) => ({ id: `${name}-${rows().length + i + 1}`, ...r }))
      const done = { data: made.length === 1 ? made[0] : made, error: null as unknown }
      const push = () => { fail(); rows().push(...made) }
      return {
        select: () => ({
          async maybeSingle() { push(); return { data: made[0], error: null } },
          async single() { push(); return { data: made[0], error: null } },
          then(resolve: (v: unknown) => unknown) { push(); return resolve(done) },
        }),
        then(resolve: (v: unknown) => unknown) { push(); return resolve(done) },
      }
    },
    upsert(row: Row) {
      const key = (r: Row) => r.user_id ?? r.id
      const apply = () => {
        const i = rows().findIndex(r => key(r) === key(row))
        const made = i >= 0 ? { ...rows()[i], ...row }
          : { id: `${name}-1`, confirmed_at: null, promoted_client_id: null, promoted_at: null, ...row }
        if (i >= 0) rows()[i] = made; else rows().push(made)
        return made
      }
      return {
        select: () => ({ async maybeSingle() { return { data: apply(), error: null } } }),
        then(resolve: (v: unknown) => unknown) { apply(); return resolve({ error: null }) },
      }
    },
    update(patch: Row) {
      const uf: ((r: Row) => boolean)[] = []
      const u: Record<string, unknown> = {
        eq(c: string, v: unknown) { uf.push(r => r[c] === v); return u },
        is(c: string, v: unknown) { uf.push(r => (r[c] ?? null) === v); return u },
        select() { return u },
        async maybeSingle() {
          const hit = rows().filter(r => uf.every(f => f(r)))
          if (hit.length === 0) return { data: null, error: null }
          Object.assign(hit[0], patch); return { data: hit[0], error: null }
        },
        then(resolve: (v: unknown) => unknown) {
          for (const r of rows().filter(x => uf.every(f => f(x)))) Object.assign(r, patch)
          return resolve({ error: null })
        },
      }
      return u
    },
    then(resolve: (v: unknown) => unknown) { fail(); return resolve({ data: rows().filter(r => filters.every(f => f(r))), error: null }) },
  }
  return q
}

// ⚠️ `db.auth.getUser` IS PART OF THE MOCK because the client row's email comes from the auth
// user, not from the brief — `/auth/onboard` reads it that way today and promotion must keep
// doing so. A server-owned promotion has no bearer token of its own, so it resolves the
// identity from the caller's `userId`; either shape is served here.
vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    auth: {
      getUser: async () => ({ data: { user: { id: 'user-1', email: 'first@client.invalid' } }, error: null }),
      admin: { getUserById: async () => ({ data: { user: { id: 'user-1', email: 'first@client.invalid' } }, error: null }) },
    },
  },
}))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

/** The eleven canonical facts, complete — the only state from which confirm may proceed. */
const ELEVEN = {
  contact_name: 'Ada', company_name: 'Redmayne', website: 'redmayne.co.uk',
  what_they_do: 'fractional finance directors for agencies',
  target_category: 'marketing agencies', geographies: ['United Kingdom'],
  target_company_type: 'agency', company_sizes: ['11-50'],
  job_titles: ['Managing Director'], seniority_levels: ['owner'],
  exclusions: 'no competitors of ours', desired_outcome: 'book qualified meetings',
  country: 'United Kingdom',
}

function seedDraft(facts: Row = ELEVEN, over: Row = {}) {
  state.drafts.push({
    id: 'draft-1', user_id: 'user-1', facts, confirmed_at: null,
    promoted_client_id: null, promoted_at: null,
    created_at: '2026-09-17T10:00:00Z', updated_at: '2026-09-17T10:00:00Z', ...over,
  })
}

/** The REAL route, invoked exactly once — the browser then disappears. */
async function confirmOnce(userId: string | undefined = 'user-1') {
  const { millaRouter } = await import('./milla')
  const layer = (millaRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/brief-draft/confirm' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /brief-draft/confirm not found on the milla router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Record<string, unknown> } = { code: 200, payload: {} }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: Record<string, unknown>) { out.payload = p; return res },
  }
  await handler({ body: {}, headers: {}, params: {}, query: {}, userId }, res, () => {})
  return out
}

beforeEach(() => {
  state.drafts = []; state.clients = []; state.icps = []
  state.proof_claims = []; state.audit = []
  state.partners = []; state.partner_referrals = []; state.subscriptions = []
  state.unreadable = null
  vi.resetModules()
})

describe('J4-C1 · one confirm produces all four artifacts, or none', () => {
  it('🛑 F-BROWSER · ONE request, then the client vanishes — client, ICP, seal and Proof all exist', async () => {
    seedDraft()
    const r = await confirmOnce()
    expect(r.code, `confirm refused: ${JSON.stringify(r.payload)}`).toBe(200)

    // The seal — the only one the baseline writes.
    expect(state.drafts[0].confirmed_at, 'the brief was not sealed').toBeTruthy()

    // 🛑 THE THREE THE BROWSER USED TO DO. No second request was made.
    expect(state.clients, 'NO CLIENT ROW — the seal exists but the person does not').toHaveLength(1)
    expect(state.icps, 'NO ICP — a client with nobody to target').toHaveLength(1)
    expect(
      state.proof_claims.length > 0 || state.clients.some(c => c.proof_started_at || Number(c.proof_passes_done ?? 0) > 0),
      'NO PROOF CLAIM — the desk will spin for ever on a run that never started',
    ).toBe(true)

    // And the route must hand back what it created, so the caller navigates without re-reading.
    const d = (r.payload.data ?? {}) as Row
    expect(d.client_id, 'the route did not return the client id it created').toBeTruthy()
    expect(d.icp_id, 'the route did not return the icp id it created').toBeTruthy()
  })

  it('🛑 F-DUP · a replayed confirm returns the WINNER\'s ids and creates nothing second', async () => {
    seedDraft()
    const first = await confirmOnce()
    const sealedAt = state.drafts[0].confirmed_at
    const again = await confirmOnce()

    expect(state.clients, 'a second client row').toHaveLength(1)
    expect(state.icps, 'a second ICP').toHaveLength(1)
    expect(state.drafts[0].confirmed_at, 'the moment of agreement moved').toBe(sealedAt)
    // 🛑 THE EXPENSIVE ONE. A second claim spends the client's second free pass before they
    // have seen the first batch of leads.
    const claims = state.proof_claims.length || Number(state.clients[0].proof_passes_done ?? 0)
    expect(claims, 'a SECOND Proof pass was claimed by a double click').toBe(1)

    const a = (first.payload.data ?? {}) as Row
    const b = (again.payload.data ?? {}) as Row
    if (again.code === 200) {
      expect(b.client_id, 'the replay did not answer with the winner\'s client').toBe(a.client_id)
      expect(b.icp_id, 'the replay did not answer with the winner\'s ICP').toBe(a.icp_id)
    } else {
      // 409 "already confirmed" is also an acceptable replay answer — but it must not
      // have created a second anything, which the assertions above already proved.
      expect(again.code).toBe(409)
    }
  })

  it('the promotion is RECORDED — one audit row naming the act', async () => {
    seedDraft()
    await confirmOnce()
    // LR 21: a decision the product made on the client's behalf leaves evidence. Either a
    // dedicated audit row or the draft's own promotion columns satisfy this.
    const recorded = state.audit.length > 0
      || (state.drafts[0].promoted_client_id != null && state.drafts[0].promoted_at != null)
    expect(recorded, 'promotion left no record — nothing says which client this brief became').toBe(true)
  })

  it('🛑 F-DBREAD · an unreadable clients table REFUSES and creates no partial journey', async () => {
    seedDraft()
    state.unreadable = 'clients'
    const r = await confirmOnce()
    expect(r.code, 'an unreadable decisive read was treated as success').toBeGreaterThanOrEqual(400)
    expect(state.clients, 'a client row was written through a failing read').toHaveLength(0)
    expect(state.icps, 'an ICP was created after the client read failed').toHaveLength(0)
    // ⚠️ AND THE SEAL MUST NOT STAND ALONE. Sealing and then failing is the stranding this
    // item exists to close: the client would be unable to confirm again (409) and have nothing.
    expect(state.drafts[0].confirmed_at, 'the brief was sealed but promotion failed — the client is stranded').toBeNull()
  })

  it('an incomplete brief still creates nothing at all', async () => {
    const { target_company_type: _omitted, ...ten } = ELEVEN
    seedDraft(ten)
    const r = await confirmOnce()
    expect(r.code).toBe(400)
    expect(state.clients).toHaveLength(0)
    expect(state.icps).toHaveLength(0)
    expect(state.drafts[0].confirmed_at).toBeNull()
  })

  it('🛑 it is scoped to the caller — nobody promotes somebody else\'s brief', async () => {
    seedDraft(ELEVEN, { user_id: 'somebody-else' })
    const r = await confirmOnce('user-1')
    expect(r.code).toBe(404)
    expect(state.clients, 'another user\'s brief was promoted').toHaveLength(0)
  })
})
