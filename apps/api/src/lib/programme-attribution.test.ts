// ═══════════════════════════════════════════════════════════════════════════════════════
// ATTRIBUTION, PROVED BY RUNNING THE REAL `runIcpJob` — NOT BY READING IT.
//
// ⛓️ WHY THIS FILE EXISTS AT ALL. The first cut of PR2-E was proved by a STRUCTURAL test that
// asserted the stamp appeared ABOVE `settleBatch` in the source. It passed. It was also the
// precise statement of the bug: a batch settles on what the PROVIDER RETURNED, so settling
// happens BEFORE the insert loop, and a stamp above it runs when the rows do not exist yet.
// The write matched zero rows on every run, silently, and null columns look deliberate.
//
// A structural test pinned my mistaken belief and passed for the one reason that should have
// failed it. So the invariants below are proved by EXECUTION: the real function runs against a
// recording database, and the assertions read the ids it actually wrote.
//
// The four questions this answers, which no amount of reading the file could:
//   · does the stamp reach the PROVIDER rows? (it did not)
//   · does it reach the POOL rows? (it did not)
//   · can a FREE PROOF run be stamped as paid programme delivery?
//   · are the ids EXACT, or inferred from a time window a concurrent run can fall inside?
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'

vi.mock('./alerts', () => ({ sendFounderAlert: async () => undefined }))

const PROGRAMME_ID = 'prog-1'
const BATCH_ID = 'batch-1'

type Stamp = { patch: Record<string, unknown>; ids: string[] }
type Rec = {
  leadInserts: number
  stamps: Stamp[]
  rpcs: string[]
}
const fresh = (): Rec => ({ leadInserts: 0, stamps: [], rpcs: [] })

type Opts = {
  /** rows the pool can serve (free copies — cost the batch nothing) */
  pool: number
  /** rows the provider returns (paid volume the batch reserved) */
  provider: number
  /** null = the ICP belongs to no programme (legacy) */
  programmeOnIcp: string | null
  /** a free-proof claim travels with the call, exempting it from programme authority */
  proof?: boolean
}

/** A LIVE, approved, fully-paid programme — the only shape that authorises anything. */
const PROGRAMME = {
  id: PROGRAMME_ID, client_id: 'c1', status: 'LIVE',
  meeting_target: 4, recommended_volume: 1000,
  first_paid_at: 'x', second_paid_at: 'x', first_payment_ref: 'a', second_payment_ref: 'b',
  approved_at: 'x', went_live_at: 'x', paused_at: null, pause_reason: null,
  sourcing_ceiling: 1000, sourced_used: 0, sourced_reserved: 0,
  review_required_at: null, review_reason: null, review_resolved_at: null,
}

async function build(opts: Opts, rec: Rec) {
  vi.resetModules()

  const icpRow = {
    id: 'icp-1', client_id: 'c1', name: 'ICP', is_active: true,
    job_titles: ['CEO'], seniority_levels: ['C-Suite'], industries: ['SaaS'],
    company_sizes: ['201–500'], geographies: ['United Kingdom'],
    programme_id: opts.programmeOnIcp,
  }

  const poolRows = Array.from({ length: opts.pool }, (_, i) => ({
    email_norm: `p${i}@pool.example`, first_name: 'P', last_name: `${i}`,
    title: 'CEO', seniority: 'C-Suite', company: `Pool${i}`, industry: 'SaaS',
    company_size: '201–500', country: 'United Kingdom', linkedin_url: null, source: 'pdl',
  }))

  vi.doMock('@kind/db', () => {
    const q = (table: string) => {
      const chain: Record<string, unknown> = {
        select() { return chain }, eq() { return chain }, in() { return chain },
        is() { return chain }, not() { return chain }, neq() { return chain },
        or() { return chain }, order() { return chain }, limit() { return chain },
        gte() { return chain },
        async upsert() { return { error: null } },
        async maybeSingle() {
          if (table === 'icps')       return { data: icpRow, error: null }
          if (table === 'clients')    return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Co' }, error: null }
          if (table === 'programmes') return { data: PROGRAMME, error: null }
          return { data: null, error: null }
        },
        async single() {
          if (table === 'icps')       return { data: icpRow, error: null }
          if (table === 'clients')    return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Co' }, error: null }
          if (table === 'programmes') return { data: PROGRAMME, error: null }
          return { data: null, error: null }
        },
        // ⚠️ THE RECORDER. Every `.update(patch).in('id', [...])` on `leads` is captured with
        // the EXACT id list the run passed — which is the whole question this file answers.
        update(patch: Record<string, unknown>) {
          const c2: Record<string, unknown> = {
            eq() { return c2 }, is() { return c2 }, filter() { return c2 }, select() { return c2 },
            gte() { return c2 },
            in(col: string, ids: string[]) {
              if (table === 'leads' && col === 'id' &&
                  ('programme_id' in patch || 'batch_id' in patch)) {
                rec.stamps.push({ patch, ids: [...ids] })
              }
              return c2
            },
            async single() { return { data: icpRow, error: null } },
            async maybeSingle() { return { data: icpRow, error: null } },
            then(r: (v: unknown) => unknown) { return r({ data: [{}], error: null }) },
          }
          return c2
        },
        insert(rows: unknown) {
          const list = Array.isArray(rows) ? rows : [rows]
          // ⚠️ COUNT `leads` ONLY. The first cut incremented on every table, so
          // `icp_run_outcomes` and friends inflated the count and the "stamp covered every
          // inserted lead" assertion compared the stamp against rows that are not leads.
          const data = list.map(() =>
            table === 'leads' ? { id: `lead-${++rec.leadInserts}` } : { id: `${table}-row` })
          const c2: Record<string, unknown> = {
            select() { return c2 },
            async single() { return { data: data[0], error: null } },
            then(r: (v: unknown) => unknown) { return r({ data, error: null }) },
          }
          return c2
        },
        then(resolve: (v: unknown) => unknown) {
          if (table === 'lead_pool') return resolve({ data: poolRows, error: null })
          return resolve({ data: [], count: 0, error: null })
        },
      }
      return chain
    }
    return {
      db: {
        from: (t: string) => q(t),
        rpc: async (fn: string, args: Record<string, unknown>) => {
          rec.rpcs.push(fn)
          if (fn === 'try_spend_sourcing')  return { data: Number(args.p_requested ?? 0), error: null }
          if (fn === 'claim_programme_batch') return { data: { id: BATCH_ID, programme_id: PROGRAMME_ID, seq: 1, status: 'running' }, error: null }
          if (fn === 'settle_programme_batch') return { data: 0, error: null }
          if (fn === 'try_claim_proof_pass') return { data: 1, error: null }
          if (fn === 'try_reserve_proof_records') return { data: { granted: Number(args.p_requested ?? 0), reservation_id: 'res-1', reason: 'GRANTED' }, error: null }
          if (fn === 'release_proof_records') return { data: 0, error: null }
          return { data: null, error: null }
        },
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } } }) } },
      },
    }
  })

  // `middleware/auth` builds its own Supabase client at MODULE SCOPE, so importing
  // routes/icps.ts pulls it in and `createClient` throws before a single line of the run
  // executes. Mocked exactly as the sibling runIcpJob harness does.
  vi.doMock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
  vi.doMock('./lead-delivery', () => ({ enrichAndDeliverLeads: async () => 0 }))
  vi.doMock('./provider-boundary', async () => {
    const real = await vi.importActual<typeof import('./provider-boundary')>('./provider-boundary')
    return { ...real, audienceForClient: async () => 'client', audienceForUser: async () => 'client' }
  })
  vi.doMock('./apollo', () => ({
    searchPeopleWithFallback: async (_i: unknown, _p: number, size: number) => ({
      contacts: Array.from({ length: Math.min(opts.provider, size) }, (_, i) => ({
        id: `pdl_${i}`, first_name: 'A', last_name: `B${i}`, email: `a${i}@b.example`,
        email_status: 'verified', linkedin_url: null, title: 'CEO', seniority: 'C-Suite',
        country: 'united kingdom', organization_name: 'Acme', organization: null,
      })),
      relaxed: null,
      pdlPage: { contacts: [], scrollToken: null, exhausted: false, matchedNothing: false, error: null, completed: true },
    }),
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))
}

async function run(opts: Opts, rec: Rec) {
  await build(opts, rec)
  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'c1', 'u1', 20, opts.proof ? { proofPass: 1 } : undefined)
}

const programmeStamp = (rec: Rec) => rec.stamps.find(s => 'programme_id' in s.patch)
const batchStamp     = (rec: Rec) => rec.stamps.find(s => 'batch_id' in s.patch)

describe('the harness is not vacuous', () => {

  it('a programme run actually inserts leads and reaches the provider', async () => {
    // Without this every "was it stamped?" assertion below could pass on a run that did
    // nothing at all — the #617 harness failure, where a fully broken batch reads as a
    // working gate.
    const rec = fresh()
    await run({ pool: 3, provider: 4, programmeOnIcp: PROGRAMME_ID }, rec)
    expect(rec.leadInserts, 'no leads were inserted — the assertions below prove nothing').toBeGreaterThan(0)
    expect(rec.rpcs).toContain('claim_programme_batch')
  })
})

describe('PROGRAMME ATTRIBUTION REACHES THE ROWS THIS RUN CREATED', () => {

  it('🛑 EVERY lead this invocation inserted gets programme_id — pool copies included', async () => {
    // ⛓️ THE REGRESSION THIS FILE WAS WRITTEN FOR. The previous implementation stamped
    // NOTHING: it ran before the provider inserts and its time window excluded the pool rows
    // inserted earlier. Both halves are asserted, because the old code failed both.
    const rec = fresh()
    await run({ pool: 3, provider: 4, programmeOnIcp: PROGRAMME_ID }, rec)

    const stamp = programmeStamp(rec)
    expect(stamp, 'no programme_id was stamped at all — the write matched zero rows').toBeTruthy()
    expect(stamp!.patch.programme_id).toBe(PROGRAMME_ID)
    expect(stamp!.ids.length, 'the stamp did not cover every inserted lead').toBe(rec.leadInserts)
  })

  it('POOL-served programme leads are attributed — a pool copy served by a programme IS programme delivery', async () => {
    const rec = fresh()
    await run({ pool: 5, provider: 0, programmeOnIcp: PROGRAMME_ID }, rec)
    const stamp = programmeStamp(rec)
    expect(stamp, 'a pool-only programme run stamped nothing').toBeTruthy()
    expect(stamp!.ids.length).toBe(rec.leadInserts)
    expect(stamp!.ids.length).toBeGreaterThan(0)
  })

  it('PROVIDER-served programme leads are attributed', async () => {
    const rec = fresh()
    await run({ pool: 0, provider: 6, programmeOnIcp: PROGRAMME_ID }, rec)
    const stamp = programmeStamp(rec)
    expect(stamp, 'a provider-only programme run stamped nothing').toBeTruthy()
    expect(stamp!.ids.length).toBe(rec.leadInserts)
  })

  it('🛑 THE IDS ARE EXACT — every stamped id was created by THIS run, and no other', async () => {
    // No window, no `icp_id` sweep. A run can only name rows it inserted itself, which is what
    // makes a concurrent free-proof run structurally unreachable rather than merely unlikely.
    const rec = fresh()
    await run({ pool: 2, provider: 3, programmeOnIcp: PROGRAMME_ID }, rec)
    const created = new Set(Array.from({ length: rec.leadInserts }, (_, i) => `lead-${i + 1}`))
    for (const s of rec.stamps) {
      for (const id of s.ids) {
        expect(created.has(id), `stamped an id this run did not create: ${id}`).toBe(true)
      }
    }
  })
})

describe('batch_id ANSWERS A DIFFERENT QUESTION FROM programme_id', () => {

  it('batch_id covers ONLY the provider rows — pool copies cost the batch nothing', async () => {
    // ⚠️ BUILD-002 ACCOUNTS A BATCH IN PROVIDER VOLUME. `requested`/`granted` are what was
    // reserved and `settleBatch` converts what the provider returned. Stamping a free pool copy
    // with the batch id would make `count(leads where batch_id = X)` disagree with
    // `programme_batches.delivered` for X — a number that reads as truth and is not.
    const rec = fresh()
    await run({ pool: 4, provider: 3, programmeOnIcp: PROGRAMME_ID }, rec)

    const prog = programmeStamp(rec)!
    const batch = batchStamp(rec)
    expect(batch, 'provider rows got no batch_id').toBeTruthy()
    expect(batch!.patch.batch_id).toBe(BATCH_ID)
    expect(batch!.ids.length, 'batch_id covered more rows than the provider returned').toBeLessThan(prog.ids.length)
    // and every batch-stamped id is also programme-stamped — never the other way round
    for (const id of batch!.ids) expect(prog.ids).toContain(id)
  })

  it('a POOL-ONLY programme run stamps programme_id and NO batch_id', async () => {
    // Founder decision, 29 Aug: programme_id must still be correct when no batch exists;
    // batch_id stays NULL, and that null is accurate rather than a gap.
    const rec = fresh()
    await run({ pool: 5, provider: 0, programmeOnIcp: PROGRAMME_ID }, rec)
    expect(programmeStamp(rec), 'pool-only programme delivery lost its programme').toBeTruthy()
    expect(batchStamp(rec), 'a batch id was stamped on rows no batch paid for').toBeUndefined()
  })
})

describe('WHO MUST NEVER BE STAMPED', () => {

  it('🛑 A FREE PROOF RUN IS NEVER STAMPED AS PAID PROGRAMME DELIVERY', async () => {
    // The concurrency answer, proved rather than argued. A proof run is deliberately exempt
    // from programme authority and inserts through the SAME loop with the SAME icp_id — so
    // under the old time-window stamp an overlapping paid run would have swept its rows into
    // the paid batch. Here the proof run reaches the stamp with no programme identity at all,
    // so there is nothing to sweep and nothing to time.
    const rec = fresh()
    await run({ pool: 3, provider: 3, programmeOnIcp: PROGRAMME_ID, proof: true }, rec)
    expect(rec.leadInserts, 'the proof run inserted nothing — this proves nothing').toBeGreaterThan(0)
    expect(rec.stamps, 'a FREE PROOF run was stamped with programme attribution').toEqual([])
  })

  it('a LEGACY (non-programme) run is never stamped', async () => {
    const rec = fresh()
    await run({ pool: 3, provider: 3, programmeOnIcp: null }, rec)
    expect(rec.leadInserts).toBeGreaterThan(0)
    expect(rec.stamps, 'a legacy run wrote programme attribution').toEqual([])
  })

  it('HISTORICAL rows are untouched — no write is unbounded, ever', async () => {
    // Every attribution write must be keyed to an explicit id list. A write without `.in('id',
    // …)` would reach rows this run never created — the backfill that must never happen.
    const rec = fresh()
    await run({ pool: 3, provider: 3, programmeOnIcp: PROGRAMME_ID }, rec)
    expect(rec.stamps.length).toBeGreaterThan(0)
    for (const s of rec.stamps) {
      expect(s.ids.length, 'an attribution write named no ids — it would touch every row').toBeGreaterThan(0)
    }
  })
})
