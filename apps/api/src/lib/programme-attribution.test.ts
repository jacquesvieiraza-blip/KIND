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
  /** Every RPC with its arguments — `p_requested` / `p_granted` are the numbers under review. */
  rpcCalls: Array<{ fn: string; args: Record<string, unknown> }>
  /** Every insert, by table, with its row count. A pool serve is ONE multi-row insert. */
  inserts: Array<{ table: string; rows: Record<string, unknown>[] }>
}
const fresh = (): Rec => ({ leadInserts: 0, stamps: [], rpcs: [], rpcCalls: [], inserts: [] })

type Opts = {
  /** rows the pool can serve (free copies — cost the batch nothing) */
  pool: number
  /** rows the provider returns (paid volume the batch reserved) */
  provider: number
  /** null = the ICP belongs to no programme (legacy) */
  programmeOnIcp: string | null
  /** a free-proof claim travels with the call, exempting it from programme authority */
  proof?: boolean
  /**
   * What `try_reserve_programme_sourcing` GRANTS the pool half of the attempt.
   *
   * ⚑ ADDED 9 Sep FOR THE POOL-AUTHORITY BLOCKER. Undefined means "grants whatever was asked",
   * which is every pre-existing case in this file. A NUMBER models a programme whose remaining
   * ceiling is smaller than the pool can serve — the state in which the previous
   * implementation admitted every served row into the batch anyway and let the settle clamp
   * report a smaller USED than the customer could see.
   */
  poolAuthority?: number
  /**
   * Does the CLIENT hold an open programme row?
   *
   * ⚑ ADDED BY PR A2, and it had to be. This harness always seeded one, so "a legacy run"
   * was modelled as *a client with an open programme running an unattached ICP* — which is
   * now the one state sourcing refuses outright, because it can only produce work that no
   * programme owns and every send gate then rejects. A genuine legacy client has no
   * programme row at all, and that is what this flag makes expressible.
   */
  clientProgramme?: boolean
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
          if (table === 'clients')    return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Co', commercial_model: null }, error: null }
          if (table === 'programmes') return { data: opts.clientProgramme === false ? null : PROGRAMME, error: null }
          return { data: null, error: null }
        },
        async single() {
          if (table === 'icps')       return { data: icpRow, error: null }
          if (table === 'clients')    return { data: { id: 'c1', leads_per_run: null, is_demo: false, company_name: 'Co', commercial_model: null }, error: null }
          if (table === 'programmes') return { data: opts.clientProgramme === false ? null : PROGRAMME, error: null }
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
          rec.inserts.push({ table, rows: list as Record<string, unknown>[] })
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
          rec.rpcCalls.push({ fn, args })
          if (fn === 'try_spend_sourcing')  return { data: Number(args.p_requested ?? 0), error: null }
          // Entitlement, not money. Defaults to granting the whole ask so every case written
          // before the pool-authority blocker behaves exactly as it did.
          if (fn === 'try_reserve_programme_sourcing') {
            const asked = Number(args.p_requested ?? 0)
            return { data: opts.poolAuthority === undefined ? asked : Math.min(asked, opts.poolAuthority), error: null }
          }
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
// ⛓️ 17 Sep (FD-6) — `pdlPage` → `providerPage`, `scrollToken` → `cursor`. With one provider
// the PDL-shaped names stopped describing anything: the page now carries Apollo's own
// completed / exhausted / matchedNothing verdict, which the Apollo branch never reported
// before (it returned null, so no client run could ever reach searchTrust = 'proven').
      providerPage: { provider: 'apollo' as const, contacts: [], cursor: null, exhausted: false, matchedNothing: false, error: null, completed: true },
    }),
    ApolloCreditsExhaustedError: class extends Error {},
    ApolloRateLimitError: class extends Error {},
  }))
}

async function run(opts: Opts, rec: Rec, maxLeads = 20) {
  await build(opts, rec)
  const { runIcpJob } = await import('../routes/icps')
  return runIcpJob('icp-1', 'c1', 'u1', maxLeads, opts.proof ? { proofPass: 1 } : undefined)
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

describe('batch_id AND programme_id NOW COVER THE SAME ATTEMPT', () => {

  // ⛓️ REVERSED 9 Sep BY THE FOUNDER, AND THE PREMISE IS WHAT CHANGED — the rule is not being
  // relaxed, it is being re-derived from a different `delivered`.
  //
  // The two cases here used to assert that `batch_id` covers ONLY the provider rows, because
  // "BUILD-002 accounts a batch in PROVIDER volume: `settleBatch` converts what the provider
  // returned, so stamping a free pool copy would make `count(leads where batch_id = X)`
  // disagree with `programme_batches.delivered` for X." That was true while `delivered` meant
  // provider volume.
  //
  // It now means USED — the QUALIFIED count — and entitlement is consumed by M&V's
  // qualification verdict, not by what a provider returned. Under that model a batch is the
  // SOURCING ATTEMPT, and leaving pool rows out of it broke four things at once: the settle
  // counts `batch_id = X`, so a qualified pool prospect never reached `sourced_used`;
  // `surfaceQualifiedBatch` is batch-scoped, so it was never shown to the customer; preparation
  // enrols the current batch, so it could never be worked; and it sat programme-attributed and
  // batch-less for ever, which the recovery RPC would later read as a SECOND unaccounted
  // attempt. The pool volume is now reserved as ENTITLEMENT (`try_reserve_programme_sourcing`,
  // which writes no ledger row) and the batch records the whole attempt, so the two numbers
  // agree again — by covering the same population rather than by excluding half of it.

  it('batch_id covers EVERY candidate of the attempt — pool copies included', async () => {
    const rec = fresh()
    await run({ pool: 4, provider: 3, programmeOnIcp: PROGRAMME_ID }, rec)

    const prog = programmeStamp(rec)!
    const batch = batchStamp(rec)
    expect(batch, 'the attempt got no batch_id at all').toBeTruthy()
    expect(batch!.patch.batch_id).toBe(BATCH_ID)
    // 🛑 THE SAME POPULATION, NOT A SUBSET. A qualified pool prospect outside the batch is a
    // prospect the customer received and was never charged for — and never shown.
    expect(batch!.ids.length, 'the pool half of the attempt is outside the batch again')
      .toBe(prog.ids.length)
    expect([...batch!.ids].sort()).toEqual([...prog.ids].sort())
  })

  it('a POOL-ONLY programme run stamps programme_id AND the batch', async () => {
    // ⛓️ ALSO REVERSED. It used to assert `batch_id` stayed NULL here. Under the new model that
    // is a whole attempt with no unit of work: nothing to settle, nothing to surface, nothing
    // to prepare — and an orphan the recovery would later mistake for a second attempt.
    const rec = fresh()
    await run({ pool: 5, provider: 0, programmeOnIcp: PROGRAMME_ID }, rec)
    expect(programmeStamp(rec), 'pool-only programme delivery lost its programme').toBeTruthy()
    const batch = batchStamp(rec)
    expect(batch, 'a pool-only attempt was left with no batch, so it can never be accounted for').toBeTruthy()
    expect(batch!.ids.length).toBe(programmeStamp(rec)!.ids.length)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 A BATCH MAY NEVER HOLD MORE CANDIDATE AUTHORITY THAN WAS GRANTED (founder-locked 9 Sep)
//
// ⛓️ WHAT THIS REPLACES, AND IT WAS MINE. The first fix for the pool half of the attempt
// reserved AFTER `servePoolLeads` had already inserted, then admitted every served row into
// the batch regardless of what came back — logging loudly when the grant was short. With room
// for 10 and a pool of 20 that put twenty candidates in a batch granted ten: twenty could
// qualify, twenty could surface, and `settle_programme_batch`'s `LEAST(delivered, granted)`
// clamp recorded USED = 10 while the customer had twenty people in front of them. The founder's
// ruling on that mitigation: *"Logging loudly does not fix the accounting contradiction."*
//
// The reservation now happens BEFORE a pool row is written, and only the granted number is
// written — so there is no population to trim, no orphan left over, and the invariant is
// structural rather than remembered.
//
// ⚠️ THESE ARE BEHAVIOURAL, NOT STRUCTURAL. They run the real `runIcpJob` and read the rows it
// actually created and stamped. A source-shaped assertion here would pin the implementation I
// happen to have written, which is exactly how the first version of this file passed while the
// stamp matched zero rows.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('POOL AUTHORITY — the batch can never exceed what was granted', () => {

  /** Every candidate the run put in the batch, and the authority the batch was opened with. */
  function accounting(rec: Rec) {
    const claim = rec.rpcCalls.find(c => c.fn === 'claim_programme_batch')
    const batch = batchStamp(rec)
    return {
      inBatch: batch ? batch.ids.length : 0,
      granted: claim ? Number(claim.args.p_granted ?? 0) : 0,
      opened: !!claim,
      poolRowsWritten: rec.inserts.filter(i => i.table === 'leads' && i.rows.length > 1)
        .reduce((n, i) => n + i.rows.length, 0),
      reserve: rec.rpcCalls.find(c => c.fn === 'try_reserve_programme_sourcing'),
    }
  }

  it('🛑 CASE 1 · room 10, pool offers 20 — TEN are created, ten are in the batch, USED can never be twenty', async () => {
    const rec = fresh()
    await run({ pool: 20, provider: 0, programmeOnIcp: PROGRAMME_ID, poolAuthority: 10 }, rec)
    const a = accounting(rec)

    // The reserve was asked for what the pool could actually serve, and answered with less.
    expect(a.reserve, 'the pool half made no reservation at all').toBeTruthy()
    expect(Number(a.reserve!.args.p_requested), 'the ask was not the eligible pool population').toBe(20)

    // 🛑 THE ROWS THAT DO NOT EXIST CANNOT BE QUALIFIED, SURFACED OR CLAMPED. Ten candidates
    // beyond the grant are not created, so there is nothing downstream to trim or to explain.
    expect(a.poolRowsWritten, 'pool rows beyond the programme grant were written anyway').toBe(10)
    expect(rec.leadInserts, 'the run created more candidates than the programme had authority for').toBe(10)
    expect(a.inBatch, 'the batch carries more candidates than the grant allows').toBe(10)
    expect(a.inBatch, 'the batch population exceeds its own granted authority').toBeLessThanOrEqual(a.granted)
  })

  it('🛑 CASE 2 · room 0, pool offers rows — NOTHING is served, nothing is stamped, no ceiling breach', async () => {
    const rec = fresh()
    await run({ pool: 8, provider: 0, programmeOnIcp: PROGRAMME_ID, poolAuthority: 0 }, rec)
    const a = accounting(rec)

    expect(a.reserve, 'a spent ceiling was never even asked').toBeTruthy()
    expect(a.poolRowsWritten, 'a programme with no authority left served pool candidates anyway').toBe(0)
    expect(rec.leadInserts, 'candidates were created for a programme that could not account for one').toBe(0)
    expect(batchStamp(rec), 'a candidate outside all authority was stamped into a batch').toBeFalsy()
    expect(programmeStamp(rec), 'a candidate outside all authority was attributed to the programme').toBeFalsy()
  })

  it('🛑 CASE 3 · pool 5 + provider 5 against authority 10 — one batch, ten candidates, all of them accountable', async () => {
    const rec = fresh()
    await run({ pool: 5, provider: 5, programmeOnIcp: PROGRAMME_ID, poolAuthority: 5 }, rec, 10)
    const a = accounting(rec)

    expect(a.opened, 'the attempt got no batch').toBe(true)
    // ONE batch for the whole attempt. Two would split the qualified population across two
    // settles and put half of it outside whatever the customer is shown.
    expect(rec.rpcs.filter(f => f === 'claim_programme_batch'), 'the attempt was split across batches')
      .toHaveLength(1)
    expect(rec.leadInserts, 'the attempt did not create both halves').toBe(10)
    expect(a.inBatch, 'the two halves of one attempt are not in the same batch').toBe(10)
    expect(a.granted, 'the grant does not cover the whole attempt').toBe(10)
    expect(a.inBatch).toBeLessThanOrEqual(a.granted)
  })

  it('🛑 a pool serve that fills the WHOLE target still opens a batch — `openBatch` lives in a branch that never runs', async () => {
    // `openBatch` sits inside `pdlRemainder > 0`. When the pool fills the run's entire target
    // there is no provider remainder, that branch is skipped, and the reserved pool volume would
    // otherwise sit against the ceiling with no batch to settle it and no batch to stamp its
    // candidates with — reserved for ever, and every candidate an orphan of exactly the kind
    // this arc exists to remove.
    const rec = fresh()
    await run({ pool: 20, provider: 0, programmeOnIcp: PROGRAMME_ID }, rec, 5)
    const a = accounting(rec)

    expect(rec.leadInserts, 'the pool did not fill the target, so this proves nothing').toBe(5)
    expect(rec.rpcs, 'the money fence was reached for a run with no provider remainder')
      .not.toContain('try_spend_sourcing')
    expect(a.opened, 'a pool-only attempt was left with reserved volume and no batch').toBe(true)
    expect(a.inBatch, 'the pool-only attempt has no batch to belong to').toBe(5)
    expect(a.granted, 'the batch was opened for volume other than what was reserved').toBe(5)
  })

  it('🛑 free pool volume is reserved as ENTITLEMENT and never booked as provider money', async () => {
    const rec = fresh()
    await run({ pool: 6, provider: 0, programmeOnIcp: PROGRAMME_ID, poolAuthority: 4 }, rec)

    // The authority call carries the programme; the money call is only ever asked for the
    // PROVIDER remainder. Routing free pool records through `try_spend_sourcing` would book
    // $0.28 a head of PDL cost nobody incurred — the conflation HOUSE-009 removed.
    const reserve = rec.rpcCalls.find(c => c.fn === 'try_reserve_programme_sourcing')!
    expect(reserve.args.p_programme_id).toBe(PROGRAMME_ID)
    const spend = rec.rpcCalls.find(c => c.fn === 'try_spend_sourcing')
    if (spend) expect(Number(spend.args.p_requested), 'the money call was asked for pool volume').toBe(20 - 4)

    // And the pool's own $0 ledger row records the ADMITTED count, not the eligible one — a
    // free row still counts against the daily volume fence, and only the rows that exist do.
    const ledger = rec.inserts.find(i => i.table === 'sourcing_ledger')
    expect(ledger, 'the pool serve booked no volume row at all').toBeTruthy()
    expect(ledger!.rows[0].records, 'the volume fence was told about rows that were never served').toBe(4)
    expect(ledger!.rows[0].cost_usd, 'a free pool record was booked as provider spend').toBe(0)
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
    // ⛓️ 25 Sep (R168 ② · P3c) — WAS: the run proceeded (`leadInserts > 0`) and stamped nothing.
    // A client with no programme is now REFUSED before the pool and before any provider
    // (founder: *"A"*), so it still stamps nothing — and now creates nothing either. Stricter.
    const rec = fresh()
    await expect(run({ pool: 3, provider: 3, programmeOnIcp: null, clientProgramme: false }, rec))
      .rejects.toMatchObject({ reason: 'not_this_programme' })
    expect(rec.leadInserts, 'a client with no programme had leads created').toBe(0)
    expect(rec.stamps, 'a legacy run wrote programme attribution').toEqual([])
  })

  it('🛑 A PROGRAMME CLIENT RUNNING AN UNATTACHED ICP IS REFUSED, and creates nothing', async () => {
    // ⚑ PR A2. The gate fires BEFORE the pool is served and before any provider is called, so
    // the refusal is not "we sourced and then discarded" — nothing is bought and no row is
    // written. Without it, a programme client produced null-attributed leads that every send
    // gate then rejected: real sourcing spent to manufacture prospects nobody may contact.
    const rec = fresh()
    await expect(run({ pool: 3, provider: 3, programmeOnIcp: null, clientProgramme: true }, rec))
      .rejects.toMatchObject({ reason: 'icp_not_attached_to_programme' })
    expect(rec.leadInserts, 'not one lead may be created by a refused run').toBe(0)
    expect(rec.stamps).toEqual([])
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
