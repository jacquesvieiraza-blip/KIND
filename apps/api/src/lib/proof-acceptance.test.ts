// ═══════════════════════════════════════════════════════════════════════════════════════
// 👍 LOOKS RIGHT — PROOF ACCEPTANCE, AND THE TARGETING IT ALIGNS.
//
// TWO DEFECTS THIS CLOSES, and they are different:
//
//   ① A widened pass-2 proof could be accepted and PAID FOR while the saved ICP still held
//      the seniority and size bands whose exact query had already returned zero. The client
//      approves leads found one way and then pays for sourcing that runs the other way.
//
//   ② THE GLEAN HOLE (live, 25 Aug). Pass 2 can be SPENT and produce no second batch. The
//      pass-1 cards stay on screen, so "Looks right" on an Earlier card walked straight to
//      billing — past the human review the failed pass exists to require.
//
// ⚠️ THESE TESTS DRIVE THE REAL ROUTE. The handler is pulled off `leadRouter` and invoked
// with a fake req/res against a recorded database, because a source assertion cannot tell an
// UPDATE that carried its guards from one that did not, nor prove which rows a predicate
// would have matched.
//
// Mocks only. No provider, no database, no network.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  pgTextArrayLiteral, sameTargetingSet, readCandidate, basisMatchesRow, pendingCandidate,
  PROOF_BASIS_FIELDS,
} from './proof-candidate'

// ── PART 1 · THE ENCODER, WHICH IS WHY THIS HAS ITS OWN FILE ───────────────────────────
describe('a Postgres array literal the query builder could not have written', () => {
  it('quotes every element, so a comma inside one cannot split it in two', () => {
    // ⚠️ THE CASE THAT FORCED THIS. `PDL_SIZE_MAP` has the key '1,000+'. The builder's own
    // `.contains()` does `value.join(',')` UNQUOTED, so it would ask for `{1,000+}` — the
    // two-element array {"1","000+"} — and match the wrong rows or none.
    expect(pgTextArrayLiteral(['1,000+'])).toBe('{"1,000+"}')
    expect(pgTextArrayLiteral(['501–1,000', '201–500'])).toBe('{"501–1,000","201–500"}')
    const pdl = readFileSync(join(__dirname, './pdl-search.ts'), 'utf8')
    expect(pdl, 'the comma-bearing band is real, not hypothetical').toContain("'1,000+'")
  })

  it('escapes backslash before quote — the other order doubles the escape', () => {
    expect(pgTextArrayLiteral(['a"b'])).toBe('{"a\\"b"}')
    expect(pgTextArrayLiteral(['a\\b'])).toBe('{"a\\\\b"}')
    expect(pgTextArrayLiteral([])).toBe('{}')
  })

  it('the builder is NOT used for array equality anywhere in the acceptance path', () => {
    // `.eq(col, jsArray)` serialises to `eq.a,b`, which is not an array literal at all.
    const leads = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const icps  = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    for (const [name, src] of [['leads.ts', leads], ['icps.ts', icps]] as const) {
      expect(src, `${name}: the literal encoder, not .contains/.containedBy`).not.toMatch(/\.contains\(\s*f\b|\.containedBy\(/)
      expect(src, `${name}`).toContain("q.filter(f, 'eq', pgTextArrayLiteral(")
    }
  })
})

describe('the candidate is server-owned, and unreadable means absent', () => {
  const good = pendingCandidate('2026-08-25T12:00:00.000Z', {
    job_titles: ['CEO', 'CTO'], seniority_levels: ['C-Suite'], industries: ['SaaS'],
    company_sizes: ['201–500'], geographies: ['United Kingdom'],
  })

  it('reads back exactly what it wrote', () => {
    expect(readCandidate(good)).toEqual(good)
    expect(readCandidate(JSON.parse(JSON.stringify(good)))).toEqual(good)
  })

  it('refuses anything it did not write — and refusing means NO targeting change', () => {
    // ⚠️ EVERY ONE OF THESE RETURNS null, which the route treats as "no widened candidate",
    // which means acceptance succeeds and writes nothing. A candidate that cannot be fully
    // understood is never a licence to rewrite a client's ICP.
    expect(readCandidate(null)).toBeNull()
    expect(readCandidate('pending')).toBeNull()
    expect(readCandidate([good])).toBeNull()
    expect(readCandidate({ ...good, version: 2 })).toBeNull()
    expect(readCandidate({ ...good, proof_pass: 1 }), 'a pass other than 2 is not this feature').toBeNull()
    expect(readCandidate({ ...good, state: 'anything' })).toBeNull()
    expect(readCandidate({ ...good, batch_at: '' })).toBeNull()
    expect(readCandidate({ ...good, basis: { ...good.basis, job_titles: 'CEO' } })).toBeNull()
    expect(readCandidate({ ...good, basis: { ...good.basis, industries: [1, 2] } })).toBeNull()
    for (const f of PROOF_BASIS_FIELDS) {
      const basis = { ...good.basis } as Record<string, unknown>
      delete basis[f]
      expect(readCandidate({ ...good, basis }), `missing ${f}`).toBeNull()
    }
  })

  it('targeting equality is by SET, so a reordered column is not a drift', () => {
    expect(sameTargetingSet(['CEO', 'CTO'], ['CTO', 'CEO'])).toBe(true)
    expect(sameTargetingSet([], [])).toBe(true)
    expect(sameTargetingSet(['CEO'], ['CEO', 'CTO'])).toBe(false)
    expect(sameTargetingSet(['CEO'], [])).toBe(false)
    expect(basisMatchesRow(good.basis, { ...good.basis, job_titles: ['CTO', 'CEO'] } as Record<string, unknown>)).toBe(true)
    expect(basisMatchesRow(good.basis, { ...good.basis, company_sizes: [] } as Record<string, unknown>)).toBe(false)
  })
})

// ── PART 2 · THE ROUTE ─────────────────────────────────────────────────────────────────

const BATCH_2 = '2026-08-25T12:15:55.664Z'
const BATCH_1 = '2026-08-24T09:00:00.000Z'

const SAVED = {
  job_titles:       ['CEO', 'CTO'],
  seniority_levels: ['C-Suite', 'VP / Director'],
  industries:       ['SaaS', 'Consulting'],
  company_sizes:    ['201–500'],
  geographies:      ['United Kingdom'],
}

type Filter = [string, string, unknown]
type Rec = {
  updates: Array<{ table: string; patch: Record<string, unknown>; filters: Filter[] }>
  rpcs: string[]
  tables: string[]
}

type World = {
  lead?: Record<string, unknown> | null
  icp?: Record<string, unknown> | null
  funding?: Array<{ type: string; reference?: string | null }>
  passesDone?: number
  batches?: string[]
  /** what the conditional ICP update comes back with */
  update?: 'ok' | 'zero' | 'error'
}

async function callAccept(w: World, rec: Rec, leadId = 'lead-1') {
  vi.resetModules()

  vi.doMock('@kind/db', () => {
    const from = (table: string) => {
      rec.tables.push(table)
      const filters: Filter[] = []
      let patch: Record<string, unknown> | null = null
      const has = (op: string, col: string) => filters.some(f => f[0] === op && f[1] === col)

      const resolve = () => {
        if (patch) {
          rec.updates.push({ table, patch, filters: [...filters] })
          if (w.update === 'error') return { data: null, error: { message: 'boom' } }
          if (w.update === 'zero')  return { data: null, error: null }
          return { data: { id: 'icp-1' }, error: null }
        }
        if (table === 'leads') {
          // The batch listing is the read that asks for non-null stamps; the card lookup
          // is the one that names an id.
          if (has('not', 'surfaced_for_approval_at')) {
            return { data: (w.batches ?? []).map(b => ({ surfaced_for_approval_at: b })), error: null }
          }
          // ⚑ 25 Aug — THE MOCK HONOURS OWNERSHIP, because a mock that hands the row over
          // however you ask for it cannot tell a scoped query from an unscoped one. Removing
          // `.eq('client_id', …)` from the route left every test green until this changed:
          // the "another client's lead" case was asserting a 404 the harness produced by
          // itself. Mutation caught it.
          const scoped = filters.some(f => f[0] === 'eq' && f[1] === 'client_id' && f[2] === 'c1')
          const row = w.lead === undefined ? null : w.lead
          if (!row) return { data: null, error: null }
          if (!scoped && row.client_id !== 'c1') return { data: row, error: null }   // the leak
          return { data: row.client_id === 'c1' ? row : null, error: null }
        }
        if (table === 'credit_transactions') return { data: w.funding ?? [], error: null }
        if (table === 'clients') return { data: { id: 'c1', proof_passes_done: w.passesDone ?? 2 }, error: null }
        if (table === 'icps') return { data: w.icp === undefined ? null : w.icp, error: null }
        return { data: null, error: null }
      }

      const chain: Record<string, unknown> = {
        select() { return chain },
        update(p: Record<string, unknown>) { patch = p; return chain },
        eq(c: string, v: unknown) { filters.push(['eq', c, v]); return chain },
        is(c: string, v: unknown) { filters.push(['is', c, v]); return chain },
        not(c: string, op: string, v: unknown) { filters.push(['not', c, `${op}.${v}`]); return chain },
        filter(c: string, op: string, v: unknown) { filters.push([op, c, v]); return chain },
        neq() { return chain }, in() { return chain }, order() { return chain }, limit() { return chain },
        async maybeSingle() { return resolve() },
        async single() { return resolve() },
        then(r: (v: unknown) => unknown) { return r(resolve()) },
      }
      return chain
    }
    return {
      db: {
        from,
        rpc: async (fn: string) => { rec.rpcs.push(fn); return { data: null, error: null } },
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } } }) } },
      },
    }
  })

  vi.doMock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
  vi.doMock('./alerts', () => ({ sendFounderAlert: async () => undefined }))
  vi.doMock('../lib/alerts', () => ({ sendFounderAlert: async () => undefined }))
  vi.doMock('./rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))
  vi.doMock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))

  const { leadRouter } = await import('../routes/leads')
  const layer = (leadRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/:id/proof-accept')
  if (!layer?.route) throw new Error('POST /:id/proof-accept is not registered')

  let status = 200
  let body: Record<string, unknown> = {}
  const res = {
    status(s: number) { status = s; return res },
    json(b: Record<string, unknown>) { body = b; return res },
  }
  const req = { userId: 'u1', params: { id: leadId }, body: {} }
  const handlers = layer.route.stack.map(s => s.handle)
  await handlers[handlers.length - 1](req, res, () => {})
  return { status, body }
}

const fresh = (): Rec => ({ updates: [], rpcs: [], tables: [] })

/** A prospect two passes in, whose LATEST batch was produced by the widened fallback. */
const widenedWorld = (over: Partial<World> = {}): World => ({
  lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_2, delivered_at: BATCH_2, revealed_at: null, status: 'new' },
  icp: { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: pendingCandidate(BATCH_2, SAVED) },
  funding: [],
  passesDone: 2,
  batches: [BATCH_1, BATCH_2],
  ...over,
})

/** An ordinary exact batch — pass 1, one set, no candidate anywhere. */
const exactWorld = (over: Partial<World> = {}): World => ({
  lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_1, delivered_at: BATCH_1, revealed_at: null, status: 'new' },
  icp: { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: null },
  funding: [],
  passesDone: 1,
  batches: [BATCH_1],
  ...over,
})

const icpUpdate = (rec: Rec) => rec.updates.find(u => u.table === 'icps')

beforeEach(() => vi.restoreAllMocks())

describe('accepting an EXACT batch changes nothing at all', () => {
  it('pass 1, one batch, no candidate → success and NO targeting write', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(exactWorld(), rec)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect((body.data as Record<string, unknown>).applied, 'the saved targeting already produced this set').toBe(false)
    expect(icpUpdate(rec), 'no ICP write of any kind').toBeUndefined()
  })

  it('pass 2 whose EXACT targeting worked — two batches, no candidate → no write', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(exactWorld({
      lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_2, delivered_at: BATCH_2, revealed_at: null, status: 'new' },
      passesDone: 2, batches: [BATCH_1, BATCH_2],
    }), rec)
    expect(status).toBe(200)
    expect((body.data as Record<string, unknown>).applied).toBe(false)
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('ONLY an ABSENT candidate takes the exact path — that is what makes it unambiguous', async () => {
    // ⛓️ 25 Aug. `runIcpJob` now records the candidate BEFORE it surfaces a widened set, so a
    // surfaced widened batch always carries provenance. That is the whole reason a NULL
    // column can be read as "ordinary exact batch" rather than "widened, provenance lost".
    const rec = fresh()
    const { status, body } = await callAccept(exactWorld(), rec)
    expect(status).toBe(200)
    expect((body.data as Record<string, unknown>).applied).toBe(false)
    expect(icpUpdate(rec)).toBeUndefined()
  })
})

describe('a candidate that is present but not usable is REFUSED, never downgraded', () => {
  it('a NON-NULL column this file cannot parse → REFUSED, not treated as exact', async () => {
    // ⚠️ THE FIRST CUT LET THIS THROUGH. `readCandidate` returns null for anything malformed,
    // and the route then took the exact path — reporting an ordinary acceptance about server
    // state nobody had managed to read, and sending the client on to billing.
    for (const raw of [
      { version: 2, state: 'pending', proof_pass: 2, batch_at: BATCH_2, basis: SAVED },
      { ...pendingCandidate(BATCH_2, SAVED), proof_pass: 1 },
      { ...pendingCandidate(BATCH_2, SAVED), state: 'half-done' },
      { ...pendingCandidate(BATCH_2, SAVED), basis: { ...SAVED, job_titles: 'CEO' } },
      'pending',
      42,
      [pendingCandidate(BATCH_2, SAVED)],
    ]) {
      const rec = fresh()
      const { status, body } = await callAccept(widenedWorld({
        icp: { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: raw },
      }), rec)
      expect(status, JSON.stringify(raw)).toBe(409)
      expect(body.code).toBe('proof_acceptance_needs_review')
      expect(icpUpdate(rec)).toBeUndefined()
    }
  })

  it('a valid PENDING candidate naming a different batch → REFUSED', async () => {
    const rec = fresh()
    const { status } = await callAccept(widenedWorld({
      icp: { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: pendingCandidate(BATCH_1, SAVED) },
    }), rec)
    expect(status, 'never silently downgraded to an exact acceptance').toBe(409)
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('a valid ACCEPTED candidate naming a different batch → REFUSED', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld({
      icp: {
        id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED,
        proof_widened_candidate: { ...pendingCandidate(BATCH_1, SAVED), state: 'accepted', accepted_at: BATCH_1 },
      },
    }), rec)
    expect(status).toBe(409)
    expect(body.code).toBe('proof_acceptance_needs_review')
    expect(icpUpdate(rec)).toBeUndefined()
  })
})

describe('accepting the WIDENED batch aligns exactly two fields', () => {
  it('clears seniority and size, and touches nothing else', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld(), rec)
    expect(status).toBe(200)
    expect((body.data as Record<string, unknown>).applied).toBe(true)

    const up = icpUpdate(rec)!
    expect(up.patch.seniority_levels).toEqual([])
    expect(up.patch.company_sizes).toEqual([])
    // ⚠️ PRESERVED BY CONSTRUCTION — they are not in the patch, so no spread, no merge and no
    // stale copy can reach them. Asserting their ABSENCE is the only honest way to say that.
    for (const f of ['job_titles', 'industries', 'geographies', 'name', 'tech_stack', 'keywords',
                     'apollo_only_consented', 'client_id', 'is_active', 'pending_targeting']) {
      expect(up.patch, `${f} must not be written`).not.toHaveProperty(f)
    }
    // Exactly three keys: the two fields and the consumption marker.
    expect(Object.keys(up.patch).sort()).toEqual(['company_sizes', 'proof_widened_candidate', 'seniority_levels'])
  })

  it('the consumption rides in the SAME statement — pending → accepted', async () => {
    const rec = fresh()
    await callAccept(widenedWorld(), rec)
    const cand = icpUpdate(rec)!.patch.proof_widened_candidate as Record<string, unknown>
    expect(cand.state).toBe('accepted')
    expect(cand.batch_at, 'still naming the batch it belonged to').toBe(BATCH_2)
    expect(cand.basis, 'and what produced it, for the record').toEqual(SAVED)
    expect(typeof cand.accepted_at).toBe('string')
  })

  it('the write carries every guard the decision was made on', async () => {
    const rec = fresh()
    await callAccept(widenedWorld(), rec)
    const f = icpUpdate(rec)!.filters
    const shows = (op: string, col: string, val?: unknown) =>
      f.some(x => x[0] === op && x[1] === col && (val === undefined || x[2] === val))
    expect(shows('eq', 'id', 'icp-1')).toBe(true)
    expect(shows('eq', 'client_id', 'c1')).toBe(true)
    expect(shows('eq', 'is_active', true)).toBe(true)
    expect(shows('is', 'pending_targeting', null)).toBe(true)
    // ⚠️ THE STATE AND THE BATCH. Without the first, a replayed click applies twice; without
    // the second, a candidate could be spent by a batch it never produced.
    expect(shows('eq', 'proof_widened_candidate->>state', 'pending')).toBe(true)
    expect(shows('eq', 'proof_widened_candidate->>batch_at', BATCH_2)).toBe(true)
    // ⚠️ AND ALL FIVE TARGETING COLUMNS, AS PROPERLY-QUOTED ARRAY LITERALS. This is the
    // compare-and-swap: it is what stops a read→write window from writing over a change.
    for (const col of PROOF_BASIS_FIELDS) {
      expect(shows('eq', col, pgTextArrayLiteral(SAVED[col])), `CAS on ${col}`).toBe(true)
    }
    expect(f.filter(x => x[0] === 'eq' && (PROOF_BASIS_FIELDS as readonly string[]).includes(x[1])), 'five, not four').toHaveLength(5)
  })
})

describe('the Glean hole — an Earlier set can never buy its way past a failed pass 2', () => {
  it('two passes spent but only ONE batch → REFUSED, and no billing', async () => {
    // THE LIVE STATE, 25 Aug 12:15 UTC. Pass 2 was consumed and produced nothing; the pass-1
    // cards are still on screen. Clicking one used to navigate straight to billing.
    const rec = fresh()
    const { status, body } = await callAccept(exactWorld({ passesDone: 2, batches: [BATCH_1] }), rec)
    expect(status).toBe(409)
    expect(body.success).toBe(false)
    expect(body.code).toBe('proof_acceptance_needs_review')
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('two batches exist, but they clicked the EARLIER one → REFUSED', async () => {
    // ⚠️ NO CANDIDATE IN THIS WORLD, DELIBERATELY. With one present, the candidate's own
    // batch check would refuse this too — and mutation showed exactly that: deleting the
    // latest-batch guard left the test green because the later check caught it. An EXACT
    // world removes the understudy, so this asserts the guard it names.
    const rec = fresh()
    const { status } = await callAccept(exactWorld({
      lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_1, delivered_at: BATCH_1, revealed_at: null, status: 'new' },
      passesDone: 2, batches: [BATCH_1, BATCH_2],
    }), rec)
    expect(status).toBe(409)
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('and a WIDENED latest set does not rescue an Earlier card either', async () => {
    const rec = fresh()
    const { status } = await callAccept(widenedWorld({
      lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_1, delivered_at: BATCH_1, revealed_at: null, status: 'new' },
    }), rec)
    expect(status).toBe(409)
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('a batch count that disagrees with the passes spent → REFUSED, both directions', async () => {
    for (const [passesDone, batches] of [[1, [BATCH_1, BATCH_2]], [2, []], [1, []]] as const) {
      const rec = fresh()
      const { status } = await callAccept(widenedWorld({ passesDone, batches: [...batches] }), rec)
      expect(status, `passes=${passesDone} batches=${batches.length}`).toBe(409)
      expect(icpUpdate(rec)).toBeUndefined()
    }
  })

  it('nought or three passes is not a proof state at all → REFUSED', async () => {
    for (const passesDone of [0, 3]) {
      const rec = fresh()
      const { status } = await callAccept(widenedWorld({ passesDone }), rec)
      expect(status).toBe(409)
      expect(icpUpdate(rec)).toBeUndefined()
    }
  })

  it('THREE passes with three batches — coherent, and still refused', async () => {
    // ⚠️ THIS IS THE CASE THE BATCH-COUNT TEST CANNOT REACH. With 3 passes and 3 batches the
    // counts AGREE, so only the pass-range check stands between a third proof pass — which
    // `try_claim_proof_pass` can never grant — and billing. Mutation proved the earlier
    // version of this test was leaning on the count check instead.
    //
    // ⚠️ AND NO CANDIDATE, for the same reason as the Earlier-card test above: a candidate
    // naming a different batch would refuse this on its own, hiding whether the pass-range
    // check does anything. Mutation found that mask too.
    const rec = fresh()
    const third = '2026-08-26T09:00:00.000Z'
    const { status } = await callAccept(exactWorld({
      passesDone: 3, batches: [BATCH_1, BATCH_2, third],
      lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: third, delivered_at: third, revealed_at: null, status: 'new' },
    }), rec)
    expect(status).toBe(409)
    expect(icpUpdate(rec)).toBeUndefined()
  })
})

describe('acceptance refuses everything it cannot prove', () => {
  it("another client's lead is indistinguishable from one that does not exist", async () => {
    // ⚠️ A REAL ROW, OWNED BY SOMEBODY ELSE — not a missing row. The harness hands it over
    // only if the query actually scoped to the caller, so this proves the SCOPE, not just
    // the status code.
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld({
      lead: { id: 'lead-1', client_id: 'c2', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_2, delivered_at: BATCH_2, revealed_at: null, status: 'new' },
    }), rec)
    expect(status, '404, not 403 — no probe learns whether the id is real').toBe(404)
    expect(body.error).toBe('Lead not found')
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('a lead that does not exist at all is the SAME answer', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld({ lead: null }), rec)
    expect(status).toBe(404)
    expect(body.error).toBe('Lead not found')
  })

  it('a FUNDED account is refused — free proof is not theirs', async () => {
    const rec = fresh()
    const { status } = await callAccept(widenedWorld({ funding: [{ type: 'purchase', reference: 'pi_1' }] }), rec)
    expect(status).toBe(403)
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('a REVEALED, passed, undelivered or unsurfaced card is not a proof card', async () => {
    const base = { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_2, delivered_at: BATCH_2, revealed_at: null, status: 'new' }
    for (const over of [
      { revealed_at: BATCH_2 },
      { status: 'passed' },
      { delivered_at: null },
      { surfaced_for_approval_at: null },
      { icp_id: null },
    ]) {
      const rec = fresh()
      const { status } = await callAccept(widenedWorld({ lead: { ...base, ...over } }), rec)
      expect(status, JSON.stringify(over)).toBe(409)
      expect(icpUpdate(rec)).toBeUndefined()
    }
  })

  it('an inactive ICP, a parked revision, or no ICP at all → REFUSED', async () => {
    const base = { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: pendingCandidate(BATCH_2, SAVED) }
    for (const icp of [{ ...base, is_active: false }, { ...base, pending_targeting: { job_titles: ['CFO'] } }, null]) {
      const rec = fresh()
      const { status } = await callAccept(widenedWorld({ icp }), rec)
      expect(status).toBe(409)
      expect(icpUpdate(rec)).toBeUndefined()
    }
  })

  it('the ICP drifted from the basis → REFUSED at the read, with NO overwrite attempted', async () => {
    const rec = fresh()
    const { status } = await callAccept(widenedWorld({
      icp: {
        id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null,
        ...SAVED, job_titles: ['CFO'],                    // someone changed the titles
        proof_widened_candidate: pendingCandidate(BATCH_2, SAVED),
      },
    }), rec)
    expect(status).toBe(409)
    // ⚠️ NOT EVEN ATTEMPTED. The conditional write would have matched zero rows anyway; this
    // asserts we do not fire a write we already know is wrong.
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('a candidate for a DIFFERENT batch cannot be spent by this one', async () => {
    const rec = fresh()
    const { status } = await callAccept(widenedWorld({
      icp: { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: pendingCandidate('2026-01-01T00:00:00.000Z', SAVED) },
    }), rec)
    // ⛓️ 25 Aug — WAS a 200 exact acceptance. Refused now: a candidate that does not describe
    // the set in front of them is server state we cannot explain, not an ordinary batch.
    expect(status).toBe(409)
    expect(icpUpdate(rec)).toBeUndefined()
  })

  it('ZERO ROWS from the conditional write is a refusal, never an unconditional retry', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld({ update: 'zero' }), rec)
    expect(status).toBe(409)
    expect(body.code).toBe('proof_acceptance_needs_review')
    expect(rec.updates.filter(u => u.table === 'icps'), 'one attempt, and no fallback write').toHaveLength(1)
  })

  it('a DATABASE ERROR on the write is a refusal too — the portal must not navigate', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld({ update: 'error' }), rec)
    expect(status).toBe(409)
    expect(body.success).toBe(false)
    expect(rec.updates.filter(u => u.table === 'icps')).toHaveLength(1)
  })

  it('every refusal says the same honest sentence, and claims nothing', async () => {
    const rec = fresh()
    const { body } = await callAccept(exactWorld({ passesDone: 2, batches: [BATCH_1] }), rec)
    const msg = String(body.error)
    expect(msg).toBe('K.I.N.D couldn’t save what worked in that proof yet. K.I.N.D needs to check this before you go live.')
    expect(msg, 'no payment implied').not.toMatch(/charg|paid|payment|refund/i)
    expect(msg, 'no timing promised').not.toMatch(/minutes|shortly|soon|notify|email you/i)
    expect(msg, 'no retry invited, and no new search').not.toMatch(/try again|retry|search again/i)
  })
})

describe('a second click is safe, and only for the batch that was actually accepted', () => {
  it('the same batch, already accepted → success with NO second mutation', async () => {
    const rec = fresh()
    const { status, body } = await callAccept(widenedWorld({
      icp: {
        id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null,
        seniority_levels: [], company_sizes: [],   // the first click already cleared them
        job_titles: SAVED.job_titles, industries: SAVED.industries, geographies: SAVED.geographies,
        proof_widened_candidate: { ...pendingCandidate(BATCH_2, SAVED), state: 'accepted', accepted_at: BATCH_2 },
      },
    }), rec)
    expect(status).toBe(200)
    expect(body.success).toBe(true)
    expect((body.data as Record<string, unknown>).already_accepted).toBe(true)
    expect((body.data as Record<string, unknown>).applied).toBe(false)
    expect(icpUpdate(rec), 'nothing mutated a second time').toBeUndefined()
    // ⚠️ AND IT RESTS ON THE SERVER'S OWN RECORD, not on the browser saying "I already did".
    expect(rec.tables).toContain('icps')
  })

  it('a STALE batch does NOT inherit that idempotency', async () => {
    const rec = fresh()
    // The accepted candidate names batch 2; they click an Earlier card. Refused on the batch
    // test long before the accepted state is consulted.
    const { status } = await callAccept(widenedWorld({
      lead: { id: 'lead-1', client_id: 'c1', icp_id: 'icp-1', surfaced_for_approval_at: BATCH_1, delivered_at: BATCH_1, revealed_at: null, status: 'new' },
      icp: { id: 'icp-1', client_id: 'c1', is_active: true, pending_targeting: null, ...SAVED, proof_widened_candidate: { ...pendingCandidate(BATCH_2, SAVED), state: 'accepted' } },
    }), rec)
    expect(status).toBe(409)
    expect(icpUpdate(rec)).toBeUndefined()
  })
})

describe('the browser cannot influence any of it', () => {
  it('a forged widened flag and a forged targeting body change nothing', async () => {
    const rec = fresh()
    // Exact world — no candidate. If the route read the body at all, this would apply.
    vi.resetModules()
    const { status, body } = await callAccept(exactWorld(), rec)
    expect(status).toBe(200)
    expect((body.data as Record<string, unknown>).applied).toBe(false)
    expect(icpUpdate(rec)).toBeUndefined()
    // The structural proof: the handler never reads `req.body`.
    const src = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const from = src.indexOf("leadRouter.post('/:id/proof-accept'")
    const to   = src.indexOf("leadRouter.post('/:id/pass'", from)
    const block = src.slice(from, to)
    expect(block, 'no body is parsed').not.toMatch(/req\.body/)
    expect(block, 'and no targeting arrives from outside').not.toMatch(/seniority_levels:\s*req|company_sizes:\s*req|z\.object/)
  })
})

describe('acceptance spends nothing and calls nobody', () => {
  const block = () => {
    const src = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const from = src.indexOf("leadRouter.post('/:id/proof-accept'")
    const to   = src.indexOf("leadRouter.post('/:id/pass'", from)
    expect(from, 'the route exists').toBeGreaterThan(-1)
    expect(to).toBeGreaterThan(from)
    return src.slice(from, to)
  }
  /** Absence is asserted on CODE — the convention this repo uses everywhere. */
  const strip = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ')

  it('no provider, no money, no reveal, no send — at runtime', async () => {
    const rec = fresh()
    await callAccept(widenedWorld(), rec)
    // ⚠️ NOT ONE RPC. Not a proof claim, not a reservation, not a release, not a sourcing
    // grant. The pass economics are untouched because none of them is consulted.
    expect(rec.rpcs, 'zero RPCs on the acceptance path').toEqual([])
    // The only tables it reads or writes.
    expect([...new Set(rec.tables)].sort()).toEqual(['clients', 'credit_transactions', 'icps', 'leads'])
  })

  it('and in the source, which catches the call a happy-path test never reaches', async () => {
    const src = strip(block())
    for (const forbidden of [
      /pdlSearch|searchPeople|apollo|hunter|clearbit/i,
      /stripe|checkout|payment_intent|wallet|charge/i,
      /revealEmail|waterfallEnrich|enrichAndDeliver|approveLead/i,
      /sendConsentEmail|mailer|sendMail|smartlead|sequence/i,
      /try_claim_proof_pass|try_reserve_proof_records|release_proof_records|try_spend_sourcing|add_sourcing_allowance/,
      /figsy_campaigns|autoEnrollLead|sendDay1/,
    ]) expect(src, `must not appear: ${forbidden}`).not.toMatch(forbidden)
    // `db.rpc(` is what actually spends authority anywhere in this codebase.
    expect(src, 'and no RPC at all').not.toMatch(/db\.rpc\(/)
  })
})

// ── PART 3 · NOTHING ELSE MOVED ────────────────────────────────────────────────────────
describe('the surrounding product is untouched', () => {
  const icps  = () => readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
  const pdl   = () => readFileSync(join(__dirname, './pdl-search.ts'), 'utf8')
  const portal = () => readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')

  it('the fences and the pass economics are exactly as they were', () => {
    const src = icps()
    expect(src).toContain('const PROOF_PASS_LEADS = 20')
    expect(src).toContain('PROOF_CLIENT_RECORD_CAP = 40')
    expect((src.match(/db\.rpc\('try_claim_proof_pass'/g) ?? []), 'one pass claim').toHaveLength(1)
    expect((src.match(/db\.rpc\('try_reserve_proof_records'/g) ?? []), 'one reservation').toHaveLength(1)
    expect((src.match(/searchPeopleWithFallback\(/g) ?? []), 'exact + one widened retry, still two').toHaveLength(2)
  })

  it('#1447, #1448 and #1449 all still standing', () => {
    const p = pdl()
    expect(p).toContain("'Head of':                ['manager', 'director', 'vp'],")
    expect(p).toContain("'1,000+': ['1001-5000', '5001-10000', '10001+'],")
    expect(p).toContain('canonicalLaunchCountry(g)')
    expect(p).toContain("if (opts?.proofMode !== true) must.push({ exists: { field: 'work_email' } })")
    expect(icps()).toContain('if (!proofMode && insertedIds.length > 0) {')
  })

  // ⛓️ 30 Aug (BUILD-004A-1, OPTION B) — THIS GUARD IS INVERTED WHERE IT NAMED THE CHECKOUT,
  // AND TIGHTENED EVERYWHERE ELSE. Its whole subject used to be an ORDERING: the pack
  // checkout must not fire before the server answered. The founder removed the destination —
  // "Looks right" is a free calibration signal and what follows it is a conversation with
  // Milla, not a $299 ask — so the ordering rule now has no navigation left to order.
  //
  // 🛑 WHAT IT STILL PROTECTS, AND WHY THAT MATTERS MORE THAN THE PUSH DID: the signal is
  // still sent to the server before anything is claimed on screen, the acknowledgement is
  // still recorded only on SUCCESS, and the refusal still says the honest sentence. A failure
  // that silently marked the card "Noted" would tell a client we had their verdict when we
  // had thrown it away.
  it('Looks right calls the server FIRST, acknowledges only on success, and navigates nowhere', () => {
    const src = portal()
    // ⚠️ THE ORDER IS STILL THE GUARD. The acknowledgement must be INSIDE the try, after the
    // await — before it, or in a `finally`, and a refusal reads as recorded.
    expect(src).toContain("await api.post(`/leads/${id}/proof-accept`, {}, await token())")
    expect(src).toMatch(/await api\.post\(`\/leads\/\$\{id\}\/proof-accept`[\s\S]{0,600}?setReacted\(r => \(\{ \.\.\.r, \[id\]: 'approve' \}\)\)/)
    // 🛑 AND IT GOES NOWHERE. Not to the pack checkout, not to billing, not anywhere.
    expect(src, 'the pack checkout is back behind "Looks right"').not.toContain("from=proof")
    // ⚠️ ANCHORED ON A REAL CALL, NOT THE WORD. The comment above `acceptProof` quotes the
    // route it used to push to (`router.push('/milla/billing…')`); matching that prose would
    // bind this guard to a comment — the failure mode this file has hit four times.
    expect((src.match(/router\.push\('\/milla\/billing\?/g) ?? []), 'the desk navigates to billing again').toHaveLength(0)
    // The button still calls the handler rather than acting by itself.
    expect(src).toContain("onClick={e => { e.stopPropagation(); void acceptProof(l.id) }}")
    expect(src).toContain('👍 Looks right')
    // The refusal copy, and no promise in it.
    expect(src).toContain('K.I.N.D couldn’t save what worked in that proof yet. K.I.N.D needs to check this before you go live.')
    // ⚠️ THE HANDLER SENDS NO TARGETING. The server would ignore it, but sending it would
    // invite the next reader to believe it matters.
    // ⛓️ THE END ANCHOR MOVED because `approve()` — the paid per-lead reveal — no longer
    // exists on this screen. Anchored on the next declaration that does.
    const from = src.indexOf('async function acceptProof(')
    const to   = src.indexOf('async function sendReason(', from)
    expect(from, 'acceptProof is gone from the home').toBeGreaterThan(-1)
    expect(to, 'the slice anchor is gone — this guard would read the rest of the file')
      .toBeGreaterThan(from)
    const body = src.slice(from, to)
    expect(body).not.toMatch(/seniority_levels|company_sizes|job_titles|widened/)
    expect(body, 'no sourcing, no proof pass').not.toMatch(/\/proof['`]|icps\//)
    // ⚠️ AND NO MONEY. The signal is free; a charge introduced inside this handler is the
    // one change that would turn calibration back into the paid desk.
    //
    // ⛓️ CODE ONLY. This slice's own comments legitimately NAME what was removed — the $299
    // ask, the $4 reveal, "nothing here charges" — so an unstripped scan binds to the
    // explanation instead of the code. Fifth time in this build; stripped by line, which can
    // only ever under-strip, never hide a real statement.
    const code = body.split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(code, 'the slice stripped to nothing — this guard would pass vacuously').toContain('api.post')
    expect(code, 'a charge appeared inside the calibration signal').not.toMatch(/\$\s?\d|charge|wallet|stripe|billing/i)
  })

  it('the migration is recorded AND runnable — a file alone runs nothing', () => {
    const all = readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')
    const file = readFileSync(join(__dirname, '../../../../supabase/migrations/20260825_proof_widened_candidate.sql'), 'utf8')
    expect(all).toContain("key: '20260825_proof_widened_candidate'")
    // ⚠️ SCOPED TO THIS ENTRY, NOT THE WHOLE RUNNER. A first cut asserted over all 33
    // migrations and failed on somebody else's legitimate `drop constraint` — the same
    // assert-absence-over-the-wrong-slice trap this repo keeps hitting.
    const at = all.indexOf("key: '20260825_proof_widened_candidate'")
    const runner = all.slice(at, all.indexOf('`.trim(),', at))
    for (const src of [runner, file]) {
      expect(src).toContain('add column if not exists proof_widened_candidate jsonb')
      // Additive only: no default, no backfill, no constraint, no RLS change.
      expect(src).not.toMatch(/drop\s+(column|table|constraint)/i)
      expect(src).not.toMatch(/update\s+public\.icps/i)
      expect(src).not.toMatch(/not null|default |check \(/i)
    }
  })
})
