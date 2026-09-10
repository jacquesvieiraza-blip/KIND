// ═══════════════════════════════════════════════════════════════════════════════════════
// PR A2 — HOUSE WALKS THE CUSTOMER'S LIFECYCLE, PAYING NOTHING, AND HISTORY STAYS HISTORY.
//
// House is Client Zero: a real internal launch canary that must walk the SAME path a paying
// customer walks — Proof → Recommendation → P1 → sourcing → review → ONE client approval →
// P2 → Live — while creating no Stripe object, no invoice, no revenue and no commission.
//
// ── 🛑 THE THREE THINGS THIS FILE EXISTS TO STOP ─────────────────────────────────────────
//
// ① FAKE MONEY. `first_paid_at` is simultaneously the sourcing key AND the revenue trigger:
//    `computeContribution` reads `(first_paid_at ? first_payment_cents : 0)`, and a partner's
//    commission derives from that figure. Authorising House by stamping it would have invented
//    revenue on an account that has paid nothing.
//
// ② HISTORY WEARING THE CLOTHES OF CURRENT WORK. `checkEnrollmentAuthority` resolved a
//    NULL-attributed enrollment to the CLIENT'S open programme. House carries ~263 enrollments
//    and ~166 leads from a RETIRED desk, every one `programme_id = NULL`. The moment its new
//    programme reached LIVE, all of them would have been authorised by it — with a real
//    prospect at the far end of each.
//
// ③ NEW WORK THAT CAN NEVER BE USED. Fixing ② alone would have been worse than useless:
//    `icps.programme_id` — the field `runIcpJob` derives programme identity from — had NO
//    WRITER anywhere in the product. So House's own new sourcing would ALSO have been
//    null-attributed, and refused by the very gate that protects its history.
//
// ── ⚠️ AND LEGACY IS NOT REMOVED ─────────────────────────────────────────────────────────
//
// A client with no open programme behaves exactly as before, at every one of the three layers.
// The $299 pack model is what is actually selling, and this narrows nothing for it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE FAKE DATABASE ────────────────────────────────────────────────────────────────────
//
// Table-aware, because the decisions that matter here are made INSIDE async functions that
// read rows. A source-text assertion cannot tell `if (open)` from `if (false && open)` — they
// contain identical substrings — so the gates are exercised by calling them.
const dbState: {
  enrollment: { client_id: string | null; programme_id: string | null; sequence_id?: string | null } | null
  programme: Record<string, unknown> | null
  icp: Record<string, unknown> | null
  icpList: Record<string, unknown>[]
  leadCount: number
  leadCountError: { message: string } | null
  writes: { table: string; patch: Record<string, unknown> }[]
  updatedRows: Record<string, unknown>[] | null
  icpClientFilter: string | null
  icpListError: { message: string } | null
  campaigns: Record<string, unknown>[]
  campaignsError: { message: string } | null
  /** ⚑ 8 Sep — `figsy_sequences` is the single source of truth for programme words, so the
   *  fixture has to be able to hold one. Empty by default: most cases here are about attribution
   *  and authority, not about wording. */
  sequences: Record<string, unknown>[]
  // ⛓️ C2 — THE CLIENT ROW IS NOW PART OF EVERY AUTHORITY QUESTION. `checkProgrammeAuthority`
  // resolves `clients.commercial_model` before it reads the programme, so a fixture with no
  // client row is a client that does not exist — which fails closed, correctly, and is not what
  // any assertion in this file is about. `commercial_model: null` is the UNCLASSIFIED state
  // every existing row on the live book holds, so every assertion keeps its original meaning.
  client: Record<string, unknown> | null
} = {
  enrollment: null, programme: null, icp: null, icpList: [],
  leadCount: 0, leadCountError: null, writes: [], updatedRows: null,
  icpClientFilter: null, icpListError: null, campaigns: [], campaignsError: null, sequences: [],
  client: { id: 'c1', commercial_model: null },
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (col: string, val: unknown) => {
          if (table === 'icps' && col === 'client_id') dbState.icpClientFilter = String(val)
          return q
        },
        not: () => q, neq: () => q, gt: () => q, limit: () => q, order: () => q, is: () => q, in: () => q,
        update: (patch: Record<string, unknown>) => { dbState.writes.push({ table, patch }); return q },
        insert: (patch: Record<string, unknown>) => { dbState.writes.push({ table, patch }); return q },
        async maybeSingle() {
          if (table === 'figsy_enrollments') return { data: dbState.enrollment, error: null }
          if (table === 'programmes') return { data: dbState.programme, error: null }
          if (table === 'icps') return { data: dbState.icp, error: null }
          if (table === 'clients') return { data: dbState.client, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: dbState.programme, error: null } },
        then: (res: (v: unknown) => unknown) => {
          if (table === 'leads') {
            // `markReadyForApproval` uses a head count: `{ count, error }`, no rows.
            return res({ data: null, count: dbState.leadCount, error: dbState.leadCountError })
          }
          if (table === 'figsy_sequences') return res({ data: dbState.sequences, error: null })
          if (table === 'figsy_campaigns') {
            if (dbState.campaignsError) return res({ data: null, error: dbState.campaignsError })
            return res({ data: dbState.campaigns, error: null })
          }
          if (table === 'icps') {
            if (dbState.icpListError) return res({ data: null, error: dbState.icpListError })
            // `programmeIcps` filters by client in the QUERY; the fake honours that filter so a
            // tenancy test is real work rather than a list nobody narrowed.
            const rows = dbState.updatedRows
              ?? dbState.icpList.filter(r => !dbState.icpClientFilter || r.client_id === dbState.icpClientFilter)
            return res({ data: rows, error: null })
          }
          return res({ data: dbState.updatedRows ?? [{ id: 'prog-1' }], error: null })
        },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))

import {
  p1Authorised, p2Authorised, authoriseFirstInternal, authoriseSecondInternal,
  goLiveProgramme, markReadyForApproval, recordFirstPayment, recordSecondPayment,
  mayStartCampaign, type ProgrammeRow,
} from './programme'
import { authorityFor, checkEnrollmentAuthority, type AuthorityVerdict } from './programme-authority'
import { attachIcpToProgramme, programmeIcps } from './programme-icp'

const API = join(__dirname, '..')
const raw = (p: string) => readFileSync(p, 'utf8')
const strip = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

const P = (over: Partial<ProgrammeRow> = {}): ProgrammeRow => ({
  id: 'prog-1', client_id: 'house', status: 'DRAFT',
  meeting_target: 4, recommended_volume: 1000,
  price_per_meeting_cents: 45000, price_total_cents: 180000,
  first_payment_cents: 90000, second_payment_cents: 90000,
  first_payment_ref: null, second_payment_ref: null,
  first_payment_intent_id: null, second_payment_intent_id: null,
  first_paid_at: null, second_paid_at: null,
  first_authorised_at: null, second_authorised_at: null,
  sourcing_ceiling: 0, sourced_used: 0, sourced_reserved: 0,
  approved_at: null, went_live_at: null, paused_at: null, pause_reason: null,
  value_settled_at: null, make_whole_cents: 0, contribution_cents: null,
  contribution_finalised_at: null, disputed_at: null,
  ...over,
})
const asRow = (p: ProgrammeRow) => p as unknown as Record<string, unknown>
const LIVE = P({
  status: 'LIVE', approved_at: 'a', went_live_at: 'w',
  first_authorised_at: 'i1', second_authorised_at: 'i2', sourcing_ceiling: 1000,
})

beforeEach(() => {
  dbState.enrollment = null; dbState.programme = null; dbState.icp = null
  dbState.icpList = []; dbState.leadCount = 0; dbState.leadCountError = null; dbState.sequences = []
  dbState.writes = []; dbState.updatedRows = null
  dbState.icpClientFilter = null; dbState.icpListError = null
  dbState.client = { id: 'c1', commercial_model: null }
  dbState.campaigns = []; dbState.campaignsError = null
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① AUTHORITY IS SATISFIED BY EITHER SOURCE, PER STAGE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('① internal authority carries the same weight as a payment, stage by stage', () => {
  it('P1 is satisfied by a payment OR internal authority — and by nothing else', () => {
    expect(p1Authorised(P())).toBe(false)
    expect(p1Authorised(P({ first_paid_at: 'x' }))).toBe(true)
    expect(p1Authorised(P({ first_authorised_at: 'x' }))).toBe(true)
    expect(p1Authorised(P({ first_payment_ref: 'cs_1' })), 'a ref alone is not authority').toBe(false)
  })

  it('P2 keeps the STRICTER paid test — timestamp AND ref — plus internal authority', () => {
    // ⚠️ Deliberately unlike P1, and this preserves `mayStartCampaign`'s original wording.
    // P2 is the gate on emailing real prospects; a half-written row must not read as authority.
    expect(p2Authorised(P())).toBe(false)
    expect(p2Authorised(P({ second_paid_at: 'x' })), 'timestamp without ref is not authority').toBe(false)
    expect(p2Authorised(P({ second_paid_at: 'x', second_payment_ref: 'cs_2' }))).toBe(true)
    expect(p2Authorised(P({ second_authorised_at: 'x' }))).toBe(true)
  })

  it('🛑 ONE DEFINITION — the campaign gate and go-live cannot disagree about P2', () => {
    // The defect this prevents: `mayStartCampaign` restated the paid test inline, so an
    // internally-authorised programme could reach LIVE through `goLiveProgramme` and then be
    // refused by the send gate about the identical fact.
    const internal = P({ status: 'LIVE', approved_at: 'a', second_authorised_at: 'i' })
    expect(p2Authorised(internal)).toBe(true)
    expect(mayStartCampaign(internal).allowed, 'the campaign gate must accept internal P2').toBe(true)
    expect(strip(raw(join(API, 'lib/programme.ts'))),
      'mayStartCampaign must not restate the paid test')
      .toMatch(/export function mayStartCampaign[\s\S]{0,400}p2Authorised\(p\)/)
  })

  it('and OUTREACH authority accepts an internally-authorised LIVE programme', () => {
    const v = authorityFor(LIVE, 'OUTREACH')
    expect(v.allowed).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② INTERNAL P1 — VALID STATE ONLY, NO MONEY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('② internal P1 may only be recorded from AWAITING_FIRST_PAYMENT', () => {
  it('🛑 it refuses from every other state — Recommendation is not a step to skip', async () => {
    for (const status of ['DRAFT', 'RECOMMENDED', 'SOURCING_AUTHORISED', 'SOURCING', 'READY_FOR_APPROVAL', 'APPROVED', 'LIVE'] as const) {
      dbState.programme = asRow(P({ status })); dbState.writes = []
      const r = await authoriseFirstInternal('prog-1')
      expect(r.ok, `internal P1 must refuse from ${status}`).toBe(false)
      expect(dbState.writes, `${status} must not write`).toHaveLength(0)
    }
  })

  it('a paused or terminal programme is refused', async () => {
    for (const over of [{ status: 'AWAITING_FIRST_PAYMENT' as const, paused_at: 'p' }, { status: 'CANCELLED' as const }, { status: 'COMPLETED' as const }]) {
      dbState.programme = asRow(P(over)); dbState.writes = []
      expect((await authoriseFirstInternal('prog-1')).ok).toBe(false)
      expect(dbState.writes).toHaveLength(0)
    }
  })

  it('it ACCEPTS the one state it is for, opens the ceiling, and writes NO money', async () => {
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT' }))
    const r = await authoriseFirstInternal('prog-1')
    expect(r.ok).toBe(true)
    const patch = dbState.writes[0].patch
    expect(patch).toMatchObject({ sourcing_ceiling: 1000, status: 'SOURCING_AUTHORISED' })
    expect(patch.first_authorised_at).toBeTruthy()
    for (const money of ['first_paid_at', 'first_payment_ref', 'first_payment_intent_id']) {
      expect(patch, `internal authority must never write ${money}`).not.toHaveProperty(money)
    }
  })

  it('🛑 it refuses when ANY P1 payment evidence exists, the intent id included', async () => {
    for (const over of [{ first_paid_at: 'x' }, { first_payment_ref: 'cs_1' }, { first_payment_intent_id: 'pi_1' }]) {
      dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT', ...over })); dbState.writes = []
      const r = await authoriseFirstInternal('prog-1')
      expect(r.ok, `must refuse with ${Object.keys(over)[0]} set`).toBe(false)
      expect(dbState.writes).toHaveLength(0)
    }
  })

  it('it is idempotent — a second press writes nothing', async () => {
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT', first_authorised_at: 'already' }))
    const r = await authoriseFirstInternal('prog-1')
    expect(r.ok).toBe(true)
    expect(dbState.writes).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ INTERNAL P2 — AND IT IS NOT GO LIVE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('③ internal P2 authorises the stage and does not take the programme live', () => {
  it('requires APPROVED with an approval actually recorded', async () => {
    for (const over of [{ status: 'SOURCING_AUTHORISED' as const, approved_at: 'a' }, { status: 'APPROVED' as const, approved_at: null }, { status: 'READY_FOR_APPROVAL' as const }]) {
      dbState.programme = asRow(P(over)); dbState.writes = []
      expect((await authoriseSecondInternal('prog-1')).ok).toBe(false)
      expect(dbState.writes).toHaveLength(0)
    }
  })

  it('🛑 IT WRITES NEITHER status NOR went_live_at — Live is a separate founder act', async () => {
    dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a' }))
    const r = await authoriseSecondInternal('prog-1')
    expect(r.ok).toBe(true)
    const patch = dbState.writes[0].patch
    expect(patch.second_authorised_at).toBeTruthy()
    expect(patch, 'P2 must not set status').not.toHaveProperty('status')
    expect(patch, 'P2 must not take the programme live').not.toHaveProperty('went_live_at')
    for (const money of ['second_paid_at', 'second_payment_ref', 'second_payment_intent_id']) {
      expect(patch).not.toHaveProperty(money)
    }
  })

  it('🛑 it refuses when ANY P2 payment evidence exists, the intent id included', async () => {
    for (const over of [{ second_paid_at: 'x' }, { second_payment_ref: 'cs_2' }, { second_payment_intent_id: 'pi_2' }]) {
      dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a', ...over })); dbState.writes = []
      expect((await authoriseSecondInternal('prog-1')).ok).toBe(false)
      expect(dbState.writes).toHaveLength(0)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ A STAGE HOLDS ONE AUTHORITY — PAYMENT OR INTERNAL, NEVER BOTH
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('④ the Stripe writers refuse when internal authority already exists', () => {
  it('recordFirstPayment refuses an internally-authorised P1', async () => {
    dbState.programme = asRow(P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'i' }))
    const r = await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1' })
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/INTERNAL P1 authority/)
    expect(dbState.writes, 'no money may be recorded against internal authority').toHaveLength(0)
  })

  it('recordSecondPayment refuses an internally-authorised P2', async () => {
    dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a', second_authorised_at: 'i' }))
    const r = await recordSecondPayment({ programmeId: 'prog-1', sessionId: 'cs_2' })
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/INTERNAL P2 authority/)
    expect(dbState.writes).toHaveLength(0)
  })

  it('and a NORMAL paying client is completely unaffected', async () => {
    // The regression that would matter commercially: these guards must be invisible to the
    // path that actually takes money.
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT' }))
    const r1 = await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1', paymentIntentId: 'pi_1' })
    expect(r1.ok).toBe(true)
    expect(dbState.writes[0].patch).toMatchObject({
      first_payment_ref: 'cs_1', first_payment_intent_id: 'pi_1',
      sourcing_ceiling: 1000, status: 'SOURCING_AUTHORISED',
    })

    dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a' })); dbState.writes = []
    const r2 = await recordSecondPayment({ programmeId: 'prog-1', sessionId: 'cs_2', paymentIntentId: 'pi_2' })
    expect(r2.ok).toBe(true)
    // ⛓️ THE MONEY IS ITS OWN WRITE NOW. Payment truth is committed unconditionally; the LIVE
    // transition is a SECOND write that happens only once preparation completes. This fixture
    // has no attached ICP, so preparation legitimately cannot complete — the payment is still
    // recorded in full, which is the property this test is about.
    expect(dbState.writes[0].patch).toMatchObject({ second_payment_ref: 'cs_2' })
    expect(dbState.writes[0].patch.second_paid_at).toBeTruthy()
    expect(dbState.writes[0].patch, 'the money write carries no status').not.toHaveProperty('status')
    expect(r2.preparationIncomplete, 'and it says the programme is not operable').toBe(true)
  })

  it('🛑 REVENUE READS PAYMENT ONLY — internal authority contributes nothing', () => {
    // The whole reason the columns are separate. If `computeContribution` ever reads
    // `authorised_at`, House starts producing revenue and a partner earns commission on
    // money nobody paid.
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function computeContribution')
    const f = src.slice(at, at + 900)
    expect(f).toContain('(p.first_paid_at ? p.first_payment_cents : 0)')
    expect(f).toContain('(p.second_paid_at ? p.second_payment_cents : 0)')
    expect(f, 'contribution must never read internal authority').not.toContain('authorised_at')
  })

  it('the DB carries the same rule per stage, and A2 adds no migration', () => {
    const mig = raw(join(API, 'lib/pending-migrations.ts'))
    const at = mig.indexOf('20260902_programme_internal_authority')
    const end = mig.indexOf('`.trim()', at)
    const sql = mig.slice(at, end).split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    expect(sql).toContain('ADD CONSTRAINT programmes_p1_authority_xor CHECK (')
    expect(sql).toContain('ADD CONSTRAINT programmes_p2_authority_xor CHECK (')
    // ⛓️ RE-AIMED 3 Sep (PR C1). This read `toHaveLength(46)` with the message "A2 must add no
    // runner entry" — a snapshot that encoded "no migration has been added since A1", which is
    // a DIFFERENT claim from the one it is named for. A2 adding none is a fact about A2 and is
    // settled; pinning a global count made this file go red for any unrelated migration
    // anywhere in the product, which is not what it guards.
    //
    // 🛑 THE INVARIANT THAT MATTERS IS ABOVE: A1's two XOR constraints are intact. Here the
    // narrow, durable version — A1 appears exactly once, so nothing has re-migrated it — plus
    // the count as the repository's usual "adding a migration is never silent" tripwire.
    expect((mig.match(/20260902_programme_internal_authority/g) ?? []).length,
      'A1 must appear exactly once — a second entry would re-migrate columns production has run').toBe(1)
    expect((mig.match(/key:\s*'[^']+'/g) ?? []), 'a migration was added').toHaveLength(54)   // ⛓️ 51 → 52 on 9 Sep: +1 20260909_programme_qualification — leads.qualified_at/_disqualified_at/_disqualify_reason/_email_status and programme_batches.inserted, plus reconcile_programme_sourcing REPOINTED from delivered_at to qualified_at. Entitlement is consumed by QUALIFICATION, not by the legacy self-serve visibility stamp — which is capped at a constant 25 per run and ~5/day and would have settled a 250-candidate batch at 25 used. All five columns NULLABLE, NO DEFAULT, NO BACKFILL; the RPC keeps its name, signature and return type and gains one refusal: it will not settle while any candidate is unjudged, which is what makes the older Vida control harmless before any app code ships.   // ⛓️ 50 → 51 on 8 Sep: +1 20260908_review_freeze_and_schedule — programmes.review_preparation_hash/_snapshot/_at (the client must review the EXACT thing they later approve; freezing only at APPROVED proved what was approved and nothing about what was READ), programmes.send_schedule (there was NO schedule anywhere in the send path — `getDay`, `getHours` and "send window" appear nowhere — so outbound was ready to leave at 03:00 on a Sunday), and figsy_enrollments.sequence_id (so "which words will this person receive" is a positive fact rather than an unverifiable copy). All nullable, NO DEFAULT, NO BACKFILL.   // ⛓️ 49 → 50 on 7 Sep (House delivery preparation): +2 — 20260907_preparation_snapshot (figsy_sequences.campaign_id, the positive programme→campaign→sequence link, plus programmes.approved_preparation_hash/_snapshot/_at). Both nullable, NO DEFAULT, NO BACKFILL: a NULL campaign_id means historical client-scoped work, and guessing one would relink a retired desk's words to current programme work — the exact leak the column exists to stop. The snapshot columns are written ONLY in the same conditional UPDATE as status = APPROVED, so nothing is stamped approved before an approval happens.   // ⛓️ 48 → 49 on 7 Sep (HOUSE-009): +1 20260907_programme_sourcing_authority — functions only, no table, no column, no row. try_reserve_programme_sourcing is new and try_spend_sourcing is REPLACED with the same signature, the same return and a byte-unchanged legacy branch. It exists because programme ENTITLEMENT and PDL MONEY were one function body, so exempting the prepaid Apollo/house path from a fabricated $0.28-a-record ledger row also exempted it from the reservation, the 2,500 ceiling and the batch.   // ⛓️ 47 → 48 on 3 Sep (PR C3 · leads.proof_pass): +1 20260903_lead_proof_attribution — one NULLABLE smallint on leads with NO DEFAULT and NO BACKFILL, plus a guarded CHECK admitting NULL, 1 and 2, and a partial index. It exists because a free-proof lead and a retired legacy delivered lead were BYTE-IDENTICAL on every column that was traced (leads.source is the PROVIDER name and the same for both; programme_id is null for both; icp_run_outcomes holds no lead ids and no proof flag; sourcing_ledger and proof_ledger are money rows with no lead ids, and a pool-only proof pass writes no proof_ledger row at all; acquisition_memory is keyed on the provider identity; icps.proof_widened_candidate exists only for a pass-2 widened fallback). The withdrawn fix used clients.proof_passes_done, which is CUMULATIVE ACCOUNT STATE: any declared programme client with old legacy leads who later ran a proof they were entitled to run got their whole history back as current work. NULL means "not known to be proof work", which is the honest reading of every existing row, and no row is written by the migration. 🚀 UNLIKE C1 THIS ONE SHIPS WITH THE CODE THAT READS IT — run it from Vida → Engine immediately after deploying this build; until it is applied the customer desk attributes NOTHING, which fails closed to an empty desk and never to a historical one.   // ⛓️ 46 → 47 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model — one NULLABLE text column on clients, NO DEFAULT, NO BACKFILL, plus a CHECK admitting NULL / 'programme' / 'legacy'. NULL is the migrated state for the whole existing book and resolves to exactly today's behaviour, so no row is written and nobody is reclassified. Nothing in C1 reads or writes it (expand/contract).      // ⛓️ 52 → 53 on 10 Sep: +1 20260910_lead_set_aside_reason — leads.set_aside_reason, the structural gate's record of a refused Proof candidate (C04)   // ⛓️ 53 → 54 on 10 Sep: +1 20260910_proof_calibration_handoff — the C07 escalation trigger, confirmed phone, operator note and the one calibrated restart
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ GO LIVE — EXPLICIT, GUARDED, IDEMPOTENT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑤ Make live is its own act, and repeating it rewrites nothing', () => {
  it('it refuses without approval, without P2, when paused and when terminal', async () => {
    const refusals: Partial<ProgrammeRow>[] = [
      { status: 'APPROVED', approved_at: 'a' },                                   // no P2
      { status: 'APPROVED', approved_at: null, second_authorised_at: 'i' },       // no approval row
      { status: 'SOURCING_AUTHORISED', approved_at: 'a', second_authorised_at: 'i' }, // wrong status
      { status: 'APPROVED', approved_at: 'a', second_authorised_at: 'i', paused_at: 'p' },
      { status: 'CANCELLED', approved_at: 'a', second_authorised_at: 'i' },
    ]
    for (const over of refusals) {
      dbState.programme = asRow(P(over)); dbState.writes = []
      const r = await goLiveProgramme('prog-1')
      expect(r.ok, `must refuse for ${JSON.stringify(over)}`).toBe(false)
      expect(dbState.writes).toHaveLength(0)
    }
  })

  it('EITHER source of P2 satisfies it — paid or internal', async () => {
    for (const over of [
      { second_authorised_at: 'i' },
      { second_paid_at: 'x', second_payment_ref: 'cs_2' },
    ]) {
      dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a', ...over })); dbState.writes = []
      const r = await goLiveProgramme('prog-1')
      // ⛓️ NOTHING IS WRITTEN UNTIL PREPARATION COMPLETES, which is the correction: LIVE is
      // durable evidence that preparation succeeded. This fixture has no attached ICP, so the
      // call correctly refuses AND leaves the row untouched.
      //
      // What THIS test is about is the AUTHORITY decision, so it asserts that P2 was accepted:
      // the refusal names preparation, never the second payment.
      expect(r.ok).toBe(false)
      expect(r.reason, 'P2 must not be the reason').toMatch(/outreach preparation did not complete/)
      expect(r.reason, 'and it must say it is not live').toMatch(/remains APPROVED/)
      expect(dbState.writes, 'no status may be written on a refused go-live').toHaveLength(0)
    }
  })

  it('🛑 ALREADY LIVE IS A SUCCESS THAT WRITES NOTHING — no rewritten timestamp', async () => {
    dbState.programme = asRow(P({ status: 'LIVE', approved_at: 'a', went_live_at: 'ORIGINAL', second_authorised_at: 'i' }))
    const r = await goLiveProgramme('prog-1')
    expect(r.ok).toBe(true)
    expect(r.alreadyLive).toBe(true)
    expect(dbState.writes, 'a no-op must not touch the row').toHaveLength(0)
  })

  it('the write is a compare-and-set, so two concurrent presses cannot both transition', () => {
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function goLiveProgramme')
    const f = src.slice(at, at + 1200)
    const f2 = src.slice(at, at + 3200)
    expect(f2, 'the update must be guarded on went_live_at being null').toContain(".is('went_live_at', null)")
  })

  it('the loser of that race gets success, not a false failure', () => {
    // ⛓️ ASSERTED ON THE SOURCE, because the transition now happens only AFTER preparation
    // completes and this fixture has no ICP to prepare. The rule itself is unchanged: a
    // compare-and-set that matches zero rows means somebody else won, which is success.
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function goLiveProgramme')
    const f = src.slice(at, at + 3200)
    expect(f).toContain('if (!data || data.length === 0) return { ok: true, alreadyLive: true, preparation: prep }')
  })

  it('and the route records no second audit event for a no-op', () => {
    // ⛓️ The condition gained a second arm: a go-live whose PREPARATION failed is also worth
    // recording, because "live but not operable" is exactly the event somebody must find
    // later. An already-live no-op still writes nothing — it has neither a transition nor a
    // preparation result.
    const routes = strip(raw(join(API, 'routes/programme.ts')))
    expect(routes).toContain("if (r.preparation || (r.ok && !r.alreadyLive)) {")
    expect(routes).toContain("auditProgramme(req, 'programme_go_live'")
    // ⚠️ SCOPED TO THE RESPONSE. `operable: r.ok` also appears in the audit detail, so an
    // unscoped substring check stayed green while the payload was hardcoded to `true`.
    // Scoped to the go-live route itself, from its definition to the end of its response.
    const route = routes.indexOf("programmeRouter.post('/:id/go-live'")
    expect(route, 'the go-live route must be found').toBeGreaterThan(-1)
    const at = routes.indexOf('already_live:', route)
    expect(at, 'the go-live response must be found').toBeGreaterThan(-1)
    const payload = routes.slice(at, at + 200)
    expect(payload, 'the response must say whether it is operable, not just live').toContain('operable: r.ok')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑥ POSITIVE ATTRIBUTION — THE AUTHORITY LAYER
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ a null programme_id is HISTORY when the client has an open programme', () => {
  it('🛑 the authority layer REFUSES it rather than inheriting the client programme', async () => {
    // The defect itself, exercised end to end.
    dbState.enrollment = { client_id: 'house', programme_id: null }
    dbState.programme = asRow(LIVE)
    const v = await checkEnrollmentAuthority('enr-legacy', 'OUTREACH')
    expect(v.allowed, 'a LIVE programme must not authorise work it never sourced').toBe(false)
    expect(v.allowed === false && v.reason).toBe('not_this_programme')
  })

  // ⛓️ 8 Sep — THIS CASE IS ABOUT ATTRIBUTION, AND IT IS SCOPED BACK TO THAT.
  //
  // It was written as the other half of the pair above: a null-attributed enrolment is history,
  // and one that NAMES the programme is not. Since 7 Sep the OUTREACH door also enforces the
  // canonical sequence, sender safety, the send window and the approved-preparation comparison
  // — none of which this fixture has any opinion about, and all of which would make this case
  // fail for reasons that have nothing to do with attribution.
  //
  // ⚠️ SO IT ASSERTS THE ATTRIBUTION VERDICT, NOT A BLANKET ALLOW. `not_this_programme` is the
  // refusal the pair exists to tell apart, and a function that refused everything with THAT
  // reason would still fail here. The allow/refuse proof for the newer gates lives in
  // `outbound-execution-guard.test.ts`, against a fixture built for it.
  it('an enrollment that NAMES the programme is not refused as history', async () => {
    dbState.enrollment = { client_id: 'house', programme_id: 'prog-1', sequence_id: 'seq-1' }
    dbState.programme = asRow(LIVE)
    const v = await checkEnrollmentAuthority('enr-current', 'OUTREACH')
    expect(v.allowed === false && v.reason,
      'the programme is refusing its OWN work as historical').not.toBe('not_this_programme')
  })

  it('a client with NO open programme still resolves as legacy — the selling model is untouched', async () => {
    dbState.enrollment = { client_id: 'pack-client', programme_id: null }
    dbState.programme = null
    const v = await checkEnrollmentAuthority('enr-pack', 'OUTREACH')
    expect(v).toEqual({ allowed: true, mode: 'legacy', programme: null })
    expect(authorityFor(null, 'OUTREACH')).toEqual({ allowed: true, mode: 'legacy', programme: null })
  })

  it('a named programme that is tenant-mismatched fails CLOSED', async () => {
    dbState.enrollment = { client_id: 'house', programme_id: 'prog-1' }
    dbState.programme = asRow(P({ ...LIVE, client_id: 'somebody-else' }))
    const v = await checkEnrollmentAuthority('enr-corrupt', 'OUTREACH')
    expect(v.allowed).toBe(false)
    expect(v.allowed === false && v.reason).toBe('programme_unresolvable')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑦ POSITIVE ATTRIBUTION — THE SELECTION LAYER
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑦ the selection layer filters on programme_id too — authority alone is not enough', () => {
  const sd = strip(raw(join(API, 'lib/send-due.ts')))

  it('🛑 due rows are filtered POSITIVELY against the client\'s open programme', () => {
    // Two independent gates: this one stops history being OFFERED, the other stops it being
    // authorised. A row that slipped past selection is still refused, and vice versa.
    expect(sd).toContain('openProgrammeByClient')
    expect(sd).toContain("return (e as { programme_id?: string | null }).programme_id === openId")
  })

  it('a genuine legacy client selects exactly as before, and unreadable state fails closed', () => {
    expect(sd).toContain('if (openId == null) return true')
    expect(sd).toContain("if (openId === '__unreadable__') return false")
  })

  it('the automatic cron and the Founder Run-once share ONE implementation', () => {
    // Both entry points call `runSendDue`, so the filter cannot apply to one and not the other.
    expect(sd).toContain('export async function runSendDue(mode: SendDueMode)')
    const internal = strip(raw(join(API, 'routes/internal.ts')))
    const operator = strip(raw(join(API, 'routes/operator.ts')))
    expect(internal).toContain("runSendDue({ mode: 'automatic' })")
    expect(operator).toMatch(/runSendDue\(\{ mode: 'operator_run'/)
  })

  it('the filter runs BEFORE fair-order grouping, so history never enters the queue at all', () => {
    expect(sd.indexOf('const dueRows = (due ?? []).filter'))
      .toBeLessThan(sd.indexOf('const byClient = new Map'))
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑧ POSITIVE ATTRIBUTION — THE SOURCING LAYER (the link that had no writer)
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑧ an unattached ICP cannot source for a programme client', () => {
  const icps = strip(raw(join(API, 'routes/icps.ts')))

  it('🛑 THE REFUSAL COMES BEFORE THE POOL IS SERVED AND BEFORE ANY PROVIDER CALL', () => {
    // `servePoolLeads` runs before the provider gate and inserts leads regardless of what the
    // spend RPC would have said — so a gate that only fenced provider spend still let real
    // people into the pipeline with no attribution.
    const gate = icps.indexOf("icp_not_attached_to_programme")
    expect(gate, 'the gate must exist').toBeGreaterThan(-1)
    expect(gate, 'it must precede pool serving').toBeLessThan(icps.indexOf('await servePoolLeads('))
    expect(gate, 'and it must precede the sourcing spend RPC').toBeLessThan(icps.indexOf("try_spend_sourcing"))
  })

  it('it asks about the CLIENT\'S open programme, and a mismatch fails closed', () => {
    // ⛓️ C2 — ~~`const open = await openProgrammeForClient(clientId)`~~. The open programme now
    // comes from the commercial-model resolution, which does the same read and additionally
    // answers which model governs the client. The PROPERTY this test names is unchanged: the
    // question is asked about the CLIENT, and a mismatch fails closed.
    expect(icps).toContain('const model = await clientCommercialModel(clientId)')
    expect(icps).toContain('const open = model.openProgramme')
    expect(icps).toMatch(/if \(open && !programmeId\)/)
    expect(icps).toMatch(/if \(open && programmeId && programmeId !== open\.id\)/)
  })

  it('a client with NO open programme keeps genuine legacy sourcing', () => {
    // ⚠️ SCOPED TO THE NEW GATE ONLY. The window ends where the pre-existing broken-link
    // checks begin — those have always thrown and are not what this asserts. A wider slice
    // counted one of them and made the assertion about the wrong code.
    //
    // ⛓️ C2 — THE WINDOW NOW OPENS AT THE MODEL RESOLUTION, and holds FOUR refusals rather than
    // two. The property is the same and is asserted the same way: every one of them is
    // conditioned, so an UNCLASSIFIED client with no open programme — which is the entire live
    // book — reaches none of them and sources exactly as before.
    const at = icps.indexOf('const model = await clientCommercialModel(clientId)')
    expect(at, 'the model must be resolved before the gate').toBeGreaterThan(-1)
    const block = icps.slice(at, icps.indexOf('if (programmeId) {', at))
    const throws = [...block.matchAll(/throw new ProgrammeAuthorityError/g)]
    expect(throws, 'the gate raises exactly four refusals').toHaveLength(4)
    for (const m of throws) {
      const before = block.slice(0, m.index)
      const guard = Math.max(before.lastIndexOf('if (open'), before.lastIndexOf('if (model.model'))
      expect(guard, 'every refusal must be conditioned on the model or on an OPEN programme')
        .toBeGreaterThan(-1)
    }
    // 🛑 AND THE TWO NEW ONES ARE THE TWO THE FOUNDER NAMED — a declared programme client with
    // no programme, and a model that would not resolve. Neither is reachable by a NULL client.
    expect(block).toMatch(/if \(model\.model === 'unreadable'\)/)
    expect(block).toMatch(/if \(model\.model === 'programme' && !model\.openProgramme\)/)
    // ⚠️ NO "nothing throws unconditionally" ASSERTION HERE. The first version of this line
    // matched the very throws the loop above had just proved are guarded — a check that
    // contradicted its own sibling. The guard proof IS the assertion.
  })

  it('🛑 THE LOOKALIKE ROUTE IS FENCED TOO — including for House', () => {
    // `audience !== 'house'` skipped the spend RPC entirely (Apollo is prepaid, so there was
    // no PDL cash to fence) and with it the programme check inside. House is Client Zero: the
    // one client the programme was built for was the one client the fence did not cover.
    // ⛓️ 3 Sep (C2) — ~~`openProgrammeForClient` / `if (openProgramme) {`.~~ THIS GUARD WAS
    // RIGHT ABOUT THE PROPERTY AND THE PROPERTY WAS TOO NARROW. Asking "is a programme open"
    // covered House only while House HAD one — and House and MBF are declared programme
    // clients with no programme open today, so the refusal did not fire for either of them and
    // the House branch reached Apollo with no gate at all. The question is now the declared
    // commercial model; everything this test asserts about POSITION is unchanged.
    const look = strip(raw(join(API, 'routes/lookalike.ts')))
    const fence = look.indexOf('clientCommercialModel(String(client_id))')
    expect(fence, 'the lookalike route must resolve the commercial model').toBeGreaterThan(-1)
    // ⚠️ THE CONDITION IS MATCHED WHOLE. `if (!mayUse…(model)) {` and `if (false && !mayUse…)`
    // both contain the identifier, so asserting its PRESENCE proves only that somebody typed
    // the word. The neutered version was written and this test stayed green until it read the
    // actual condition.
    expect(look, 'the refusal must be conditioned on the model itself')
      .toMatch(/\n\s*if \(!mayUseLegacyCommercialPath\(model\)\) \{/)
    expect(fence, 'and it must do so BEFORE the house-audience branch')
      .toBeLessThan(look.indexOf("if (audience !== 'house')"))
    expect(fence, 'and before any lead is inserted').toBeLessThan(look.indexOf("from('leads').insert"))
    expect(look).toContain("refused: 'programme_attribution'")
  })

  it('provider authority is still a separate gate — attribution does not bypass the kill-switch', () => {
    // Correct attribution grants nothing. `PAID_PROVIDERS_ENABLED` and `try_spend_sourcing`
    // both still stand between an attached ICP and a paid provider call.
    expect(icps).toContain('try_spend_sourcing')
    const guard = strip(raw(join(API, 'lib/paid-provider-guard.ts')))
    expect(guard).toContain('PAID_PROVIDERS_ENABLED')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑨ ATTACHING AN ICP — TENANCY, IDEMPOTENCY, AND NO BACKFILL
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑨ attaching an ICP is explicit, per-ICP, and changes nothing historical', () => {
  const attachable = P({ status: 'SOURCING_AUTHORISED', client_id: 'house' })

  it('attaches an unattached ICP belonging to the same client', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { id: 'icp-1', client_id: 'house', name: 'Founders', is_active: true, programme_id: null }
    dbState.updatedRows = [{ id: 'icp-1', name: 'Founders' }]
    const r = await attachIcpToProgramme('prog-1', 'icp-1')
    expect(r.ok).toBe(true)
    const write = dbState.writes.find(w => w.table === 'icps')
    expect(write?.patch).toMatchObject({ programme_id: 'prog-1' })
  })

  it('🛑 TENANCY — an ICP belonging to another client is refused', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { id: 'icp-x', client_id: 'other-client', name: 'Theirs', is_active: true, programme_id: null }
    const r = await attachIcpToProgramme('prog-1', 'icp-x')
    expect(r.ok).toBe(false)
    expect(dbState.writes.filter(w => w.table === 'icps')).toHaveLength(0)
  })

  it('repeating the same attach is an idempotent success that writes nothing', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { id: 'icp-1', client_id: 'house', name: 'Founders', is_active: true, programme_id: 'prog-1' }
    const r = await attachIcpToProgramme('prog-1', 'icp-1')
    expect(r.ok && r.alreadyAttached).toBe(true)
    expect(dbState.writes.filter(w => w.table === 'icps')).toHaveLength(0)
  })

  it('🛑 AN ICP IS NEVER SILENTLY MOVED between programmes', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { id: 'icp-1', client_id: 'house', name: 'Founders', is_active: true, programme_id: 'other-prog' }
    const r = await attachIcpToProgramme('prog-1', 'icp-1')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/already belongs to programme/)
    expect(dbState.writes.filter(w => w.table === 'icps')).toHaveLength(0)
  })

  it('it refuses from the client review onward, and while paused', async () => {
    for (const over of [
      { status: 'READY_FOR_APPROVAL' as const }, { status: 'APPROVED' as const },
      { status: 'LIVE' as const }, { status: 'COMPLETED' as const }, { status: 'CANCELLED' as const },
      { status: 'SOURCING' as const, paused_at: 'p' },
    ]) {
      dbState.programme = asRow(P({ client_id: 'house', ...over }))
      dbState.icp = { id: 'icp-1', client_id: 'house', name: 'F', is_active: true, programme_id: null }
      dbState.writes = []
      const r = await attachIcpToProgramme('prog-1', 'icp-1')
      expect(r.ok, `must refuse while ${over.status}${over.paused_at ? ' (paused)' : ''}`).toBe(false)
      expect(dbState.writes.filter(w => w.table === 'icps')).toHaveLength(0)
    }
  })

  it('🛑 NO HISTORICAL BACKFILL — it writes ONE column on ONE icps row and nothing else', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { id: 'icp-1', client_id: 'house', name: 'Founders', is_active: true, programme_id: null }
    dbState.updatedRows = [{ id: 'icp-1', name: 'Founders' }]
    await attachIcpToProgramme('prog-1', 'icp-1')
    // L_OLD and E_OLD keep their NULL because nothing here touches them at all.
    for (const table of ['leads', 'figsy_enrollments', 'figsy_campaigns', 'figsy_sent_emails', 'meetings', 'sourcing_ledger', 'clients']) {
      expect(dbState.writes.filter(w => w.table === table), `attach must never write ${table}`).toHaveLength(0)
    }
    const icpWrites = dbState.writes.filter(w => w.table === 'icps')
    expect(icpWrites).toHaveLength(1)
    expect(Object.keys(icpWrites[0].patch).sort()).toEqual(['programme_id', 'updated_at'])

    // …and the module contains no backfill of any kind.
    const src = strip(raw(join(API, 'lib/programme-icp.ts')))
    expect(src).not.toMatch(/from\('leads'\)/)
    expect(src).not.toMatch(/from\('figsy_enrollments'\)/)
  })

  it('the write is a compare-and-set, so two operators cannot both win', () => {
    const src = strip(raw(join(API, 'lib/programme-icp.ts')))
    expect(src).toContain(".is('programme_id', null)")
  })

  it('🛑 THERE IS NO "ATTACH ALL" — one ICP per call, one decision per press', () => {
    const src = strip(raw(join(API, 'lib/programme-icp.ts')))
    const vida = strip(raw(join(API, '../../admin/src/app/vida/page.tsx')))
    expect(src).not.toMatch(/attachAll|attach_all/i)
    expect(vida).not.toMatch(/Attach all/i)
    // The route takes a single icp_id, not a list.
    expect(strip(raw(join(API, 'routes/programme.ts')))).toContain("req.body?.icp_id")
  })

  it('and the generic ICP doors still cannot set programme_id', () => {
    // `POST /icps` parses through a zod object with no such key — unknown keys are stripped —
    // and the operator ICP editor writes a fixed payload. Both stay shut.
    const icpsSrc = strip(raw(join(API, 'routes/icps.ts')))
    const schemaAt = icpsSrc.indexOf('const icpSchema = z.object({')
    const schema = icpsSrc.slice(schemaAt, icpsSrc.indexOf('})', schemaAt))
    expect(schema, 'the ICP schema must not admit programme_id').not.toContain('programme_id')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑩ READY FOR APPROVAL — THERE MUST BE SOMETHING TO REVIEW
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑩ a programme with no attributed work cannot be put to the client', () => {
  it('🛑 P1 → Ready for approval with nothing sourced is refused', async () => {
    dbState.programme = asRow(P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'i' }))
    dbState.leadCount = 0
    const r = await markReadyForApproval('prog-1')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/nothing for the client to review/)
    expect(dbState.writes).toHaveLength(0)
  })

  // ⛓️ SUPERSEDED 7 Sep, BY THE DEFECT THIS RULE WAS TOO SMALL TO CATCH (founder-ordered).
  //
  // This case used to read *"one positively-attributed lead is enough"* and assert `ok: true`.
  // The reasoning was sound as far as it went — no invented volume threshold, zero versus more
  // than zero — and it is STILL the lead rule inside the canonical check. What was wrong is
  // that the lead count was the ONLY question asked.
  //
  // 🛑 LIVE, 7 Sep: the House programme had 246 delivered, surfaced prospects and no batch, no
  // campaign, no sequence, no messaging, no cadence, no sender and no frozen review set — and
  // Vida offered **Ready for approval**. That status means "a human may now look at what will
  // run, and approve it". An approval collected against nothing is WORSE than no approval,
  // because everybody downstream treats it as consent to send.
  //
  // So the transition now consults `preparationBlockers` (preparation-readiness.ts), which asks
  // the lead question AND fourteen others. Nothing was weakened to make this pass: the old rule
  // survives intact as one of the fifteen.
  it('🛑 one attributed lead is NOT enough any more — the rest of the work must exist too', async () => {
    dbState.programme = asRow(P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'i' }))
    dbState.leadCount = 1
    const r = await markReadyForApproval('prog-1')
    expect(r.ok, 'a programme with leads and nothing else is offered to the client again').toBe(false)
    // AND IT NAMES WHAT IS MISSING. "Not ready" with no reason sends an operator hunting.
    expect(r.reason).toMatch(/campaign|sequence|cadence|mailbox|enrol/)
    expect(dbState.writes, 'the status was written despite the refusal').toHaveLength(0)
  })

  it('an unreadable count refuses — "we cannot tell" is not "there is nothing"', async () => {
    dbState.programme = asRow(P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'i' }))
    dbState.leadCountError = { message: 'connection reset' }
    const r = await markReadyForApproval('prog-1')
    expect(r.ok).toBe(false)
    expect(r.reason).toMatch(/Could not read/)
    expect(dbState.writes).toHaveLength(0)
  })

  it('it counts POSITIVE attribution, the same rule the send layers use', () => {
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function markReadyForApproval')
    const f = src.slice(at, at + 1800)
    expect(f).toContain(".eq('programme_id', programmeId)")
    expect(f, 'sourced_used counts only PROVIDER delivery, so it must not be the test')
      .not.toContain('sourced_used')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑪ R87 — NO PROGRAMME CLIENT RECEIVES A RETIRED WALLET NUDGE, ON ANY PATH
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑪ every low-credit path is fenced, not just the obvious one', () => {
  const internal = strip(raw(join(API, 'routes/internal.ts')))
  const clients = strip(raw(join(API, 'routes/clients.ts')))

  it('both internal.ts email sweeps pass the programme fact', () => {
    const fenced = internal.match(
      /mayNotify\('low_credits',\s*\{\s*onProgramme:\s*onProgramme\(lowProgrammes,\s*client\.id\)\s*\}\)/g,
    ) ?? []
    expect(fenced, 'the FIGSY sweep and the /ae/low-credits route must BOTH be fenced').toHaveLength(2)
    // ⚠️ counts the FENCED SHAPE, not the call: `mayNotify('low_credits')` with no second
    // argument gates nothing and would satisfy a bare substring count.
    expect((internal.match(/mayNotify\('low_credits'/g) ?? []).length).toBe(2)
  })

  it('🛑 AND THE IN-PRODUCT NOTIFICATION — the path that sends no email', () => {
    // The one a search for `resend` would miss. It renders the same retired sentence inside
    // the product, to a customer whose own billing page says they owe nothing.
    expect(clients).toMatch(/mayNotify\('low_credits',\s*\{\s*onProgramme\s*\}\)/)
    expect(clients).toContain('programmeClientIds(')
    expect(clients.indexOf('mayNotify(') , 'the fence must precede the push')
      .toBeLessThan(clients.indexOf("notifications.push({ id: 'low_credits'"))
  })

  it('an unreadable programme state withholds the notice, deliberately', () => {
    const notif = strip(raw(join(API, 'lib/programme-notifications.ts')))
    expect(notif).toContain('if (onProgramme !== false) return false')
    // …and no caller may collapse that null into a boolean on the way in.
    expect(clients).toContain('onProgrammeIds === null ? null :')
  })

  it('and no wallet value is touched anywhere in this change', () => {
    for (const f of ['routes/clients.ts', 'routes/internal.ts', 'lib/programme.ts', 'lib/programme-icp.ts']) {
      expect(strip(raw(join(API, f))), `${f} must not zero a wallet`)
        .not.toMatch(/credit_balance:\s*0|wallet_balance_usd:\s*0/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑫ VIDA — IT STOPS AT READY_FOR_APPROVAL
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑫ the Vida controls stop where the client takes over', () => {
  const vidaRaw = raw(join(API, '../../admin/src/app/vida/page.tsx'))
  const vida = strip(vidaRaw)

  it('🛑 THERE IS NO VIDA APPROVE BUTTON — the one approval belongs to the customer in Milla', () => {
    expect(vida, 'no approve action may be wired').not.toMatch(/lifecycle\(\s*'approve'/)
    expect(vida).not.toMatch(/programmes\/\$\{[^}]*\}\/approve/)
    expect(vida).not.toMatch(/>\s*Approve programme\s*</)
  })

  it('READY_FOR_APPROVAL says so, and offers no way through', () => {
    expect(vidaRaw).toContain('Awaiting client approval in Milla')
  })

  it('exactly the six approved lifecycle actions exist, and no seventh', () => {
    const actions = [...vida.matchAll(/lifecycle\('([^']+)'/g)].map(m => m[1])
    expect(new Set(actions)).toEqual(new Set([
      'recommend', 'await-first-payment', 'authorise/first',
      'ready-for-approval', 'authorise/second', 'go-live',
    ]))
  })

  it('each control is gated on the state it belongs to', () => {
    const at = vida.indexOf('function lcCan(action: string): boolean {')
    const f = vida.slice(at, vida.indexOf('\n  }', at))
    expect(f).toContain("case 'recommend':            return p.status === 'DRAFT'")
    expect(f).toContain("case 'await-first-payment':  return p.status === 'RECOMMENDED'")
    expect(f).toContain("case 'authorise/first':      return p.status === 'AWAITING_FIRST_PAYMENT'")
    expect(f).toContain("case 'authorise/second':     return p.status === 'APPROVED' && !p2")
    expect(f).toContain("case 'go-live':              return p.status === 'APPROVED' && p2")
    expect(f, 'a paused programme offers no lifecycle control').toContain('if (p.paused_at) return false')
  })

  it('the wording is the founder\'s, and it never says a payment happened', () => {
    expect(vidaRaw).toContain('Authorise P1 internally')
    expect(vidaRaw).toContain('Authorise P2 internally')
    expect(vidaRaw).toContain('Move to P1')
    expect(vidaRaw, 'the P1/P2 state line must say internal authority, never paid').toContain('internal authority')
    expect(vidaRaw).toMatch(/No payment is taken/)
    expect(vidaRaw, 'Move to P1 must not read as a charge').not.toMatch(/>\s*Pay\b/)
  })

  it('every button disables while a request is in flight, and the panel reloads after', () => {
    const buttons = [...vidaRaw.matchAll(/lifecycle\('[^']+',\s*'[^']+'\)\}\s*disabled=\{lcBusy !== null\}/g)]
    expect(buttons.length, 'all six lifecycle buttons must disable in flight').toBe(6)
    expect(vida, 'state is re-read from the row, never guessed locally')
      .toContain('if (selected) await loadProgramme(selected)')
  })

  it('material confirmations name the client, and Create takes a typed target', () => {
    expect(vidaRaw).toMatch(/Authorise P1 INTERNALLY for \$\{name\}/)
    expect(vidaRaw).toMatch(/No payment is taken and no invoice, revenue or commission is created/)
    // ⚠️ NO DEFAULT MEETING TARGET — it prices the whole programme.
    expect(vidaRaw).toContain('Number.isInteger(meetings)')
    expect(vida, 'no hardcoded meeting target').not.toMatch(/meetings:\s*\d+/)
  })

  it('the ICP section explains what attaching does — and does not do', () => {
    expect(vidaRaw).toContain('Targeting that feeds this programme')
    expect(vidaRaw).toMatch(/Historical leads and enrolments are NOT changed/)
    expect(vidaRaw, 'an unreadable ICP list must not render as "none"')
      .toContain('This is NOT evidence that none are attached')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑬ PROGRAMME TRUTH — THE EXACT DELTA
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑬ Vida is given exactly the truth it needs, and no more', () => {
  const op = strip(raw(join(API, 'lib/operator-programme.ts')))

  it('the seven new fields are exposed', () => {
    for (const f of [
      'recommended_volume', 'first_paid_at', 'first_payment_ref', 'second_payment_ref',
      'went_live_at', 'first_authorised_at', 'second_authorised_at',
    ]) {
      expect(op, `${f} must reach the operator console`).toMatch(new RegExp(`${f}:\\s*p\\.${f}`))
    }
  })

  it('🛑 the payment INTENT ids are NOT exposed to the console', () => {
    // The backend reads them for the XOR guards; an operator screen has no question they
    // answer, and a Stripe intent id on a console is an identifier that can leak.
    const truthType = op.slice(op.indexOf('export type ProgrammeTruth'), op.indexOf('batches: BatchSummary[]'))
    expect(truthType).not.toContain('payment_intent_id')
  })

  it('but the full ProgrammeRow still carries them, because the guards need them', () => {
    const prog = strip(raw(join(API, 'lib/programme.ts')))
    expect(prog).toContain('first_payment_intent_id: string | null')
    expect(prog).toContain('second_payment_intent_id: string | null')
  })

  it('the no-programme state stays clean', () => {
    // ⛓️ 7 Sep — `sender` and `preparation` joined the shape (read-only truth so the founder can
    // PROVE which mailbox would send and whether the work still matches what was approved).
    // Both are null here for the same reason every other field is: there is no programme.
    expect(op).toContain('return { programme: null, sender: null, preparation: null, batches: [], stranded: [], blockers: [], degraded }')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑭ THE OPERATOR ROUTES ARE THE AUTHORITY, NOT THE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑭ every control is re-decided by a route that a UI cannot bypass', () => {
  const routes = strip(raw(join(API, 'routes/programme.ts')))

  it('🛑 MOVE TO P1 IS RECOMMENDED-ONLY IN THE ROUTE, not merely in the button', () => {
    // `awaitFirstPayment` still accepts DRAFT because the paid checkout path has always been
    // able to reach it from there — narrowing a function the Stripe flow depends on, to fix an
    // operator screen, would be changing paying-client behaviour to solve an internal problem.
    // So the restriction lives on the NEW action.
    const at = routes.indexOf("programmeRouter.post('/:id/await-first-payment'")
    const f = routes.slice(at, at + 900)
    // ⚠️ WHOLE CONDITION. `!== 'RECOMMENDED'` is a substring of
    // `!== 'RECOMMENDED' && p.status !== 'DRAFT'`, so `toContain` stays green while the gate
    // is widened to admit exactly the state this route exists to refuse.
    expect(f).toMatch(/if \(p\.status !== 'RECOMMENDED'\) \{/)
    expect(f, 'and it must not mint a checkout').not.toMatch(/createProgrammeCheckoutSession|stripe/i)
  })

  it('the paid path keeps its broader entry, deliberately', () => {
    const prog = strip(raw(join(API, 'lib/programme.ts')))
    const at = prog.indexOf('export async function awaitFirstPayment')
    expect(prog.slice(at, at + 400)).toContain("p.status !== 'RECOMMENDED' && p.status !== 'DRAFT'")
  })

  it('every new route is on the admin-key router', () => {
    expect(routes).toContain("adminKeyValid(req.headers['x-admin-key'])")
    for (const path of ['/:id/await-first-payment', '/:id/authorise/first', '/:id/authorise/second', '/:id/go-live', '/:id/attach-icp']) {
      expect(routes).toContain(`programmeRouter.post('${path}'`)
    }
  })

  it('material actions are audited, with truthful money wording', () => {
    const audit = strip(raw(join(API, 'lib/operator-audit.ts')))
    for (const a of ['programme_lifecycle', 'programme_internal_authority', 'programme_go_live', 'programme_icp_attached']) {
      expect(audit, `${a} must be a declared operator action`).toContain(`'${a}'`)
      expect(routes, `${a} must actually be written`).toContain(a)
    }
    expect(routes).toMatch(/money: 'none — no Stripe object, no invoice, no revenue, no commission, no wallet movement'/)
  })

  it('🛑 AND NOTHING HERE CALLS /approve OR AUTO-APPROVES', () => {
    expect(routes).not.toMatch(/approveProgramme\(/g === null ? /x^/ : /auditProgramme\(req, 'programme_lifecycle'[^)]*APPROVED/)
    const vida = strip(raw(join(API, '../../admin/src/app/vida/page.tsx')))
    expect(vida).not.toContain('/approve')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑮ CAMPAIGN SAFETY — RIGHT ATTRIBUTION IS NOT ENOUGH
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// 🛑 THE DEFECT THIS BLOCK EXISTS FOR, AND IT SURVIVED THE FIRST A2 BUILD. `autoEnrollLead`
// resolves a campaign from the lead's ICP, and falls back to the client's NEWEST ACTIVE
// campaign when it finds none. House carries historical campaigns. So a lead sourced under
// the new programme, correctly stamped `programme_id`, could be enrolled into an OLD campaign
// and sent that campaign's sequence.
//
// ⚠️ EVERY DOWNSTREAM GATE WOULD HAVE ALLOWED IT. The enrollment copies `programme_id` from
// the lead, so send SELECTION matches and send AUTHORITY matches — neither has any opinion
// about which campaign the row points at. Attribution being CORRECT is what made this
// invisible: the row is programme work, and it would have told the wrong story.
describe('⑮ programme work never inherits a historical campaign', () => {
  const fig = strip(raw(join(API, 'lib/figsy.ts')))

  it('the campaign is resolved from the LEAD\'S ICP first — one ICP, one campaign', () => {
    // ⛓️ 7 Sep — the `status: 'active'` filter is now CONDITIONAL, and the condition is the
    // point. Preparation runs before approval, and before approval the programme campaign is
    // deliberately a DRAFT (`activate: true` is the only door to `active`, and it stays shut
    // until Make Live) — so requiring `active` here would have made pre-approval preparation
    // unable to see the campaign it had just created.
    //
    // ⚠️ WHAT MUST NOT CHANGE IS THE *ICP-FIRST RESOLUTION*, and that is what is asserted:
    // the lead's own ICP, which is the positive programme-correct link.
    expect(fig).toContain(".eq('client_id', clientId).eq('icp_id', leadIcp.icp_id)")
    // 🛑 AND THE WIDENING IS AVAILABLE ONLY TO VERIFIED PROGRAMME FULFILMENT. Every ordinary
    // caller still gets `active` only — asserted as the exact ternary, so moving the widening
    // out from behind `programmeFulfilment` fails here.
    expect(fig).toContain("await (opts?.programmeFulfilment ? q : q.eq('status', 'active'))")
  })

  it('🛑 A PROGRAMME LEAD MAY NOT FALL BACK to the newest active campaign', () => {
    // The fallback is legacy-only. Matched whole: `if (!campaign)` and
    // `if (!campaign && leadProgrammeId)` share a substring, so the ORDER and the guard both
    // have to be read, not just the presence of the words.
    const guard = fig.indexOf('if (!campaign && leadProgrammeId) {')
    const fallback = fig.indexOf("      const { data: newest } = await db.from('figsy_campaigns')")
    expect(guard, 'the programme guard must exist').toBeGreaterThan(-1)
    expect(fallback, 'the legacy fallback must still exist').toBeGreaterThan(-1)
    expect(guard, 'and the guard must come BEFORE the fallback').toBeLessThan(fallback)
    // It RETURNS. Falling through to any other campaign is the whole defect.
    //
    // ⛓️ RETARGETED 9 Sep — the return is no longer bare. Every refusal in `autoEnrollLead`
    // now carries its cause, because fourteen silent `return`s were exactly why the House
    // recovery could report "no enrolment row exists after the attempt" and name no reason.
    // The duty this case exists for is unchanged and is now asserted more strictly: the block
    // must RETURN, and it must return a refusal rather than fall through.
    const block = fig.slice(guard, fallback)
    expect(block, 'a programme lead with no ICP campaign must enrol in nothing')
      .toMatch(/\n\s*return refuse\('no_campaign'/)
  })

  it('the programme id is read from the LEAD, in the query already being made', () => {
    // No extra round trip, and read from the person rather than guessed from the client —
    // the same rule `resolveLeadAttribution` follows.
    expect(fig).toContain("db.from('leads').select('icp_id, programme_id')")
  })

  it('a LEGACY lead keeps the fallback exactly as before', () => {
    // The $299 model has null-attributed leads and one campaign; narrowing this would break
    // the model that is actually selling.
    const fallback = fig.slice(fig.indexOf('if (!campaign) {', fig.indexOf('if (!campaign && leadProgrammeId)')))
    expect(fallback).toContain(".eq('client_id', clientId).eq('status', 'active')")
    expect(fallback).toContain("order('created_at', { ascending: false })")
  })

  it('and activation of ANY campaign still runs through the one programme gate', () => {
    // `ensureCampaignForIcp` is the only door to `status: 'active'`, and it asks
    // `mayStartCampaign` — so an old campaign cannot be re-activated for a programme client
    // that is not LIVE with P2, and a new one cannot be activated early.
    const sw = strip(raw(join(API, 'lib/start-work.ts')))
    expect(sw).toContain('export async function ensureCampaignForIcp')
    // ⚠️ THE REAL CALL, NOT THE COMMENT ABOUT IT. `ensureCampaignForIcp` reaches the one
    // authority module through `checkProgrammeAuthority(clientId, 'OUTREACH')`, which is
    // `mayStartCampaign` plus the approval check — the first version of this assertion matched
    // the word `mayStartCampaign` inside a comment and proved nothing.
    expect(sw).toContain("const verdict = await checkProgrammeAuthority(clientId, 'OUTREACH'")
    // and OUTREACH authority is where `p2Authorised` is consulted
    const auth = strip(raw(join(API, 'lib/programme-authority.ts')))
    expect(auth).toContain('const verdict = mayStartCampaign(p)')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑯ mayStartCampaign — THE FULL AUTHORITY MATRIX, BEHAVIOURALLY
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑯ the campaign gate answers the same way for every programme state', () => {
  // Each row: the programme shape, and whether a campaign may start.
  const paidP2 = { second_paid_at: 'x', second_payment_ref: 'cs_2' }
  const cases: [string, Partial<ProgrammeRow>, boolean][] = [
    ['DRAFT',                        { status: 'DRAFT' }, false],
    ['RECOMMENDED',                  { status: 'RECOMMENDED' }, false],
    ['AWAITING_FIRST_PAYMENT',       { status: 'AWAITING_FIRST_PAYMENT' }, false],
    ['SOURCING_AUTHORISED',          { status: 'SOURCING_AUTHORISED', first_authorised_at: 'i' }, false],
    ['SOURCING',                     { status: 'SOURCING', first_authorised_at: 'i' }, false],
    ['READY_FOR_APPROVAL',           { status: 'READY_FOR_APPROVAL', first_authorised_at: 'i' }, false],
    ['APPROVED without P2',          { status: 'APPROVED', approved_at: 'a' }, false],
    ['APPROVED + internal P2',       { status: 'APPROVED', approved_at: 'a', second_authorised_at: 'i' }, false],
    ['APPROVED + paid P2',           { status: 'APPROVED', approved_at: 'a', ...paidP2 }, false],
    ['LIVE + internal P2',           { status: 'LIVE', approved_at: 'a', went_live_at: 'w', second_authorised_at: 'i' }, true],
    ['LIVE + paid P2',               { status: 'LIVE', approved_at: 'a', went_live_at: 'w', ...paidP2 }, true],
    ['LIVE + paid timestamp only',   { status: 'LIVE', approved_at: 'a', second_paid_at: 'x' }, false],
    ['LIVE but PAUSED',              { status: 'LIVE', approved_at: 'a', went_live_at: 'w', second_authorised_at: 'i', paused_at: 'p' }, false],
    ['COMPLETED',                    { status: 'COMPLETED', approved_at: 'a', second_authorised_at: 'i' }, false],
    ['CANCELLED',                    { status: 'CANCELLED', approved_at: 'a', second_authorised_at: 'i' }, false],
  ]

  for (const [label, over, allowed] of cases) {
    it(`${label} → ${allowed ? 'may' : 'may NOT'} start`, () => {
      expect(mayStartCampaign(P(over)).allowed, label).toBe(allowed)
    })
  }

  it('a genuine legacy client is not gated by this at all', () => {
    // `mayStartCampaign` takes a programme ROW; a legacy client has none, and the callers
    // reach it only through `authorityFor`, which answers `mode: 'legacy'` for null.
    expect(authorityFor(null, 'OUTREACH')).toEqual({ allowed: true, mode: 'legacy', programme: null })
  })

  it('🛑 WHY IT HAD TO CHANGE IN A2 — the two gates would otherwise disagree', () => {
    // It restated `second_paid_at && second_payment_ref` inline. `goLiveProgramme` uses
    // `p2Authorised`. So an internally-authorised programme could be taken LIVE by one gate
    // and refused by the other about the identical fact — LIVE, and unable to send.
    const internallyLive = P({ status: 'LIVE', approved_at: 'a', went_live_at: 'w', second_authorised_at: 'i' })
    expect(p2Authorised(internallyLive)).toBe(true)
    expect(mayStartCampaign(internallyLive).allowed).toBe(true)
    expect(authorityFor(internallyLive, 'OUTREACH').allowed).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑰ THE PAYING CLIENT'S STRIPE LIFECYCLE IS UNCHANGED
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑰ nothing House needed altered what a paying client experiences', () => {
  it('P1 payment records the same evidence and opens the same ceiling', async () => {
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT', recommended_volume: 1000 }))
    const r = await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1', paymentIntentId: 'pi_1' })
    expect(r.ok).toBe(true)
    const patch = dbState.writes[0].patch
    expect(patch).toMatchObject({
      first_payment_ref: 'cs_1', first_payment_intent_id: 'pi_1',
      sourcing_ceiling: 1000, status: 'SOURCING_AUTHORISED',
    })
    expect(patch.first_paid_at).toBeTruthy()
    expect(patch, 'the paid path never writes internal authority').not.toHaveProperty('first_authorised_at')
  })

  it('🛑 P2 PAYMENT STILL TAKES AN APPROVED PROGRAMME LIVE, and still stamps went_live_at', async () => {
    // The existing product truth: for a PAYING client the money arriving IS the last event.
    // A2 must not have quietly moved that behind the new Make live control.
    dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a', paused_at: null }))
    const r = await recordSecondPayment({ programmeId: 'prog-1', sessionId: 'cs_2', paymentIntentId: 'pi_2' })
    expect(r.ok).toBe(true)
    const patch = dbState.writes[0].patch
    expect(patch).toMatchObject({ second_payment_ref: 'cs_2', second_payment_intent_id: 'pi_2' })
    expect(patch.second_paid_at).toBeTruthy()
    expect(patch).not.toHaveProperty('second_authorised_at')
    // ⛓️ `went_live_at` MOVED TO A SECOND WRITE, on purpose: LIVE is now durable evidence that
    // preparation succeeded, so the money arriving no longer sets it by itself. The paid path
    // STILL auto-goes-live when preparation completes — proved in `programme-preparation.test.ts`
    // and asserted here against the source, because this fixture cannot prepare.
    expect(patch, 'the money write no longer carries the transition').not.toHaveProperty('went_live_at')
    const prog = strip(raw(join(API, 'lib/programme.ts')))
    const at = prog.indexOf('export async function recordSecondPayment')
    expect(prog.slice(at, at + 4600), 'the successful paid path still transitions')
      .toContain("status: 'LIVE', went_live_at: new Date().toISOString()")
  })

  it('P2 arriving on a paused or non-APPROVED programme still records money WITHOUT going live', async () => {
    // The pre-existing refusal shape: money that arrived is a fact regardless of whether we
    // may act on it. Unchanged by A2.
    for (const over of [{ status: 'APPROVED' as const, approved_at: 'a', paused_at: 'p' }, { status: 'SOURCING' as const }]) {
      dbState.programme = asRow(P(over)); dbState.writes = []
      const r = await recordSecondPayment({ programmeId: 'prog-1', sessionId: 'cs_2' })
      expect(r.ok).toBe(true)
      expect(r.recordedNotLive).toBe(true)
      const patch = dbState.writes[0].patch
      expect(patch.second_payment_ref).toBe('cs_2')
      expect(patch, 'a blocked P2 must not go live').not.toHaveProperty('status')
      expect(patch).not.toHaveProperty('went_live_at')
    }
  })

  it('the refusals fire ONLY on internal authority, never on an ordinary payment', async () => {
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT' }))
    expect((await recordFirstPayment({ programmeId: 'prog-1', sessionId: 'cs_1' })).ok).toBe(true)
    dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a' })); dbState.writes = []
    expect((await recordSecondPayment({ programmeId: 'prog-1', sessionId: 'cs_2' })).ok).toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑱ THE P1 CEILING INVARIANT
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑱ internal P1 never opens a ceiling from a figure that is not one', () => {
  for (const bad of [0, -1, -250]) {
    it(`refuses recommended_volume = ${bad}`, async () => {
      dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT', recommended_volume: bad }))
      const r = await authoriseFirstInternal('prog-1')
      expect(r.ok).toBe(false)
      expect(r.reason).toMatch(/no valid recommended volume/)
      expect(dbState.writes, 'a refused authorisation must not write').toHaveLength(0)
    })
  }

  it('refuses a NULL/absent recommended_volume', async () => {
    // The column is `int NOT NULL`, so this is defence against a future writer rather than a
    // state the product can reach today — which is why it is a guard and not a migration.
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT', recommended_volume: null as unknown as number }))
    const r = await authoriseFirstInternal('prog-1')
    expect(r.ok).toBe(false)
    expect(dbState.writes).toHaveLength(0)
  })

  it('allows a positive volume, and the ceiling is that number', async () => {
    dbState.programme = asRow(P({ status: 'AWAITING_FIRST_PAYMENT', recommended_volume: 750 }))
    const r = await authoriseFirstInternal('prog-1')
    expect(r.ok).toBe(true)
    expect(dbState.writes[0].patch).toMatchObject({ sourcing_ceiling: 750, status: 'SOURCING_AUTHORISED' })
  })

  it('and the figure is never re-derived here — it comes off the row', () => {
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function authoriseFirstInternal')
    const f = src.slice(at, at + 2600)
    expect(f).toContain('sourcing_ceiling: p.recommended_volume')
    expect(f, 'no second copy of the R77 curve').not.toMatch(/\*\s*250|LEADS_PER_TARGETED_MEETING/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑲ READY FOR APPROVAL COUNTS ONLY WHAT A CLIENT COULD EVER SEE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑲ readiness reuses the existing reviewable-lead definition', () => {
  it('🛑 IT FILTERS ON delivered_at AND surfaced_for_approval_at', () => {
    // Not invented here: this is exactly what `/leads/for-approval` already requires. A lead
    // that failed enrichment, or that no operator has Sent to the client, can never appear in
    // the review set — so it must never be the reason a programme is declared ready.
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function markReadyForApproval')
    const f = src.slice(at, at + 2600)
    expect(f).toContain(".eq('programme_id', programmeId)")
    expect(f).toContain(".not('delivered_at', 'is', null)")
    expect(f).toContain(".not('surfaced_for_approval_at', 'is', null)")
  })

  it('🛑 AND IT COPIES ALL FOUR — the predicate IS the review query, not an approximation', () => {
    // ⛓️ CORRECTED. The first version omitted `revealed_at IS NULL` and `status != 'passed'`,
    // arguing they answer "what is still outstanding" rather than "what can ever appear".
    // That is wrong at THIS transition: the client has not reviewed anything yet — that is the
    // step this status hands them — so a lead already revealed or passed went through the
    // legacy per-lead path and will never appear in their list. Counting one would let
    // READY_FOR_APPROVAL succeed while Milla opens empty.
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function markReadyForApproval')
    const f = src.slice(at, at + 3400)
    expect(f).toContain(".is('revealed_at', null)")
    expect(f).toContain(".neq('status', 'passed')")
  })

  it('🛑 READY ⇒ THE REAL REVIEW SET IS NON-EMPTY — the two predicates cannot disagree', () => {
    // Both conditions, read off the two call sites and compared as sets. If either side ever
    // gains or loses a filter, these stop matching and this test names it.
    const progSrc = strip(raw(join(API, 'lib/programme.ts')))
    const at = progSrc.indexOf('export async function markReadyForApproval')
    const readiness = progSrc.slice(at, at + 3400)
    const leads = strip(raw(join(API, 'routes/leads.ts')))
    const rAt = leads.indexOf("leadRouter.get('/for-approval'")
    const review = leads.slice(rAt, rAt + 1600)

    const conditions = [
      ".not('delivered_at', 'is', null)",
      ".not('surfaced_for_approval_at', 'is', null)",
      ".is('revealed_at', null)",
      ".neq('status', 'passed')",
    ]
    for (const c of conditions) {
      expect(readiness, `readiness must apply ${c}`).toContain(c)
      expect(review, `the review set must apply ${c}`).toContain(c)
    }
    // …and readiness additionally scopes to the programme, which the client route scopes by
    // client instead — the one deliberate difference between them.
    expect(readiness).toContain(".eq('programme_id', programmeId)")
  })

  it('the same definition is the one the customer route uses', () => {
    const leads = strip(raw(join(API, 'routes/leads.ts')))
    const at = leads.indexOf("leadRouter.get('/for-approval'")
    const f = leads.slice(at, at + 1600)
    expect(f).toContain(".not('delivered_at', 'is', null)")
    expect(f).toContain(".not('surfaced_for_approval_at', 'is', null)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑳ THE VIDA ICP LISTS ARE TENANT-SAFE
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑳ one client never sees another client\'s targeting', () => {
  const H = 'house', M = 'mbf'
  const seed = () => { dbState.icpList = [
    { id: 'ICP_H_NULL',  client_id: H, name: 'H null',  is_active: true, programme_id: null },
    { id: 'ICP_H_PNEW',  client_id: H, name: 'H pnew',  is_active: true, programme_id: 'P_NEW' },
    { id: 'ICP_H_OTHER', client_id: H, name: 'H other', is_active: true, programme_id: 'P_OLD' },
    { id: 'ICP_M_NULL',  client_id: M, name: 'M null',  is_active: true, programme_id: null },
  ] }

  it('🛑 attached holds only this programme\'s OWN ICPs, and never another client\'s', async () => {
    seed()
    const r = await programmeIcps(H, 'P_NEW')
    expect(r.attached.map(i => i.id)).toEqual(['ICP_H_PNEW'])
    expect(r.attached.map(i => i.id)).not.toContain('ICP_M_NULL')
  })

  it('eligible holds unattached ICPs of this client only — never another programme\'s, never another client\'s', async () => {
    seed()
    const r = await programmeIcps(H, 'P_NEW')
    expect(r.eligible.map(i => i.id)).toEqual(['ICP_H_NULL'])
    // ⚠️ ICP_H_OTHER belongs to another programme, so it appears in NEITHER list. Offering it
    // would render a button whose only possible outcome is a refusal.
    expect(r.eligible.map(i => i.id)).not.toContain('ICP_H_OTHER')
    expect(r.eligible.map(i => i.id)).not.toContain('ICP_M_NULL')
  })

  it('the query itself is narrowed by client — the filter is not applied after the fact', async () => {
    seed()
    await programmeIcps(H, 'P_NEW')
    expect(dbState.icpClientFilter, 'the read must be scoped to the client').toBe(H)
  })

  it('a tenancy mismatch fails closed rather than borrowing another client\'s programme', async () => {
    seed()
    const r = await programmeIcps(H, 'P_OF_ANOTHER_CLIENT')
    expect(r.attached, 'no ICP of this client belongs to that programme').toEqual([])
  })

  it('🛑 A READ FAILURE NEVER CLAIMS THERE ARE ZERO ICPs', async () => {
    dbState.icpListError = { message: 'connection reset' }
    const r = await programmeIcps(H, 'P_NEW')
    expect(r.unreadable).toBe(true)
    expect(r.attached).toEqual([])
    expect(r.eligible).toEqual([])
    // …and Vida says so on screen rather than rendering an empty list as "none attached".
    expect(raw(join(API, '../../admin/src/app/vida/page.tsx')))
      .toContain('This is NOT evidence that none are attached')
  })

  it('these lists reach the OPERATOR endpoint only — no customer surface returns them', () => {
    const op = strip(raw(join(API, 'routes/operator.ts')))
    expect(op).toContain('programmeIcps(clientId, truth.programme?.id ?? null)')
    // The customer programme reader has no ICP list at all.
    const cust = strip(raw(join(API, 'lib/customer-programme.ts')))
    expect(cust).not.toContain('programmeIcps')
    expect(cust).not.toMatch(/from\('icps'\)/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ㉑ DEPLOYING THIS PR ALONE CANNOT SEND ANYTHING
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('㉑ authority is product permission, never a send', () => {
  it('A2 reads no send/provider kill-switch, and changes none', () => {
    const changed = [
      'lib/programme.ts', 'lib/programme-icp.ts', 'lib/programme-authority.ts',
      'lib/send-due.ts', 'lib/operator-programme.ts', 'routes/programme.ts',
    ]
    for (const f of changed) {
      const src = strip(raw(join(API, f)))
      for (const env of ['AUTO_OUTREACH_ENABLED', 'PAID_PROVIDERS_ENABLED', 'FIGSY_OPERATOR_SEND_ENABLED']) {
        expect(src, `${f} must not read or set ${env}`).not.toContain(env)
      }
    }
  })

  it('the kill-switches still stand where they always did', () => {
    expect(strip(raw(join(API, 'lib/paid-provider-guard.ts')))).toContain('PAID_PROVIDERS_ENABLED')
    expect(strip(raw(join(API, 'lib/figsy.ts')))).toContain('outreachEnabled()')
    expect(strip(raw(join(API, 'lib/figsy.ts')))).toContain('operatorSendEnabled()')
  })

  it('and nothing in this PR mutates a historical enrolment into current programme work', () => {
    for (const f of ['lib/programme.ts', 'lib/programme-icp.ts', 'lib/programme-authority.ts', 'lib/send-due.ts']) {
      const src = strip(raw(join(API, f)))
      expect(src, `${f} must not write enrolment attribution`)
        .not.toMatch(/from\('figsy_enrollments'\)[\s\S]{0,120}\.update\(/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ㉒ THE SAME-ICP HISTORICAL CAMPAIGN — the case "by construction" did NOT cover
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// ⛓️ THIS BLOCK EXISTS BECAUSE A PREVIOUS CLAIM OF MINE WAS WRONG. I reported that an
// ICP-matched campaign is "programme-correct by construction, one ICP = one campaign". Two
// facts falsify it:
//
//   ① NO UNIQUE INDEX. `002_figsy.sql` creates `figsy_campaigns_client_id_idx` and
//      `_status_idx` and nothing else — there is no `unique (client_id, icp_id)`. One ICP can
//      carry several campaigns; the "one campaign" rule is a convention `ensureCampaignForIcp`
//      maintains, not something the database enforces.
//   ② `ensureCampaignForIcp` REUSES AND RE-ACTIVATES. Given an existing campaign for the ICP
//      it returns it, and if that campaign is paused it sets it back to `active`.
//
// So House attaching its EXISTING ICP would have meant: Go Live re-activates the ICP's
// pre-programme campaign, and `autoEnrollLead`'s PRIMARY lookup hands that old campaign — and
// its old sequence — to a brand-new programme lead. The legacy-fallback fence cannot help,
// because the primary lookup succeeds and the fallback never runs.
describe('㉒ a programme can never inherit a pre-programme campaign through a shared ICP', () => {
  const attachable = P({ status: 'SOURCING_AUTHORISED', client_id: 'H' })
  const icpI = { id: 'I', client_id: 'H', name: 'Founders', is_active: true, programme_id: null }

  it('🛑 ATTACHING AN ICP THAT ALREADY HAS A CAMPAIGN IS REFUSED', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = icpI
    dbState.campaigns = [{ id: 'C_OLD', name: 'SaaS Trial Push', status: 'active' }]
    const r = await attachIcpToProgramme('prog-1', 'I')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/already has a campaign from before the programme/)
    expect(dbState.writes.filter(w => w.table === 'icps'), 'nothing may be attached').toHaveLength(0)
  })

  it('…and a PAUSED or DRAFT historical campaign counts too — ensureCampaignForIcp would wake it', async () => {
    for (const status of ['paused', 'draft', 'archived']) {
      dbState.programme = asRow(attachable)
      dbState.icp = { ...icpI }
      dbState.campaigns = [{ id: 'C_OLD', name: 'Warmup test', status }]
      dbState.writes = []
      const r = await attachIcpToProgramme('prog-1', 'I')
      expect(r.ok, `a ${status} campaign must still block the attach`).toBe(false)
      expect(dbState.writes.filter(w => w.table === 'icps')).toHaveLength(0)
    }
  })

  it('🛑 NOTHING HISTORICAL IS TOUCHED BY THE REFUSAL — the old campaign is left exactly as it was', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { ...icpI }
    dbState.campaigns = [{ id: 'C_OLD', name: 'SaaS Trial Push', status: 'active' }]
    await attachIcpToProgramme('prog-1', 'I')
    // Retiring or rewriting C_OLD would mutate history and could strand its enrolments.
    expect(dbState.writes.filter(w => w.table === 'figsy_campaigns')).toHaveLength(0)
    expect(dbState.writes.filter(w => w.table === 'leads')).toHaveLength(0)
    expect(dbState.writes.filter(w => w.table === 'figsy_enrollments')).toHaveLength(0)
  })

  it('a CLEAN ICP — no campaign of any kind — attaches normally', async () => {
    // The other half. A guard that refused every attach would satisfy everything above.
    dbState.programme = asRow(attachable)
    dbState.icp = { ...icpI }
    dbState.campaigns = []
    dbState.updatedRows = [{ id: 'I', name: 'Founders' }]
    const r = await attachIcpToProgramme('prog-1', 'I')
    expect(r.ok).toBe(true)
    expect(dbState.writes.find(w => w.table === 'icps')?.patch).toMatchObject({ programme_id: 'prog-1' })
  })

  it('an unreadable campaign check refuses — a wrong yes hands over a pre-programme sequence', async () => {
    dbState.programme = asRow(attachable)
    dbState.icp = { ...icpI }
    dbState.campaignsError = { message: 'connection reset' }
    const r = await attachIcpToProgramme('prog-1', 'I')
    expect(r.ok).toBe(false)
    expect(dbState.writes.filter(w => w.table === 'icps')).toHaveLength(0)
  })

  it('the check is scoped to the programme\'s OWN client and that ICP', () => {
    const src = strip(raw(join(API, 'lib/programme-icp.ts')))
    expect(src).toContain(".eq('client_id', p.client_id).eq('icp_id', icpId)")
  })

  it('🛑 AND THE INVARIANT IT BUYS IS STRUCTURAL, not conventional', () => {
    // An ICP that had no campaign when it joined can only acquire one afterwards, from
    // `ensureCampaignForIcp` — which is gated by programme authority. THAT is what makes the
    // ICP-matched campaign genuinely the programme's, and it is now enforced rather than
    // assumed. Recorded here with the two facts that falsified the earlier claim.
    const figsyMig = raw(join(API, '../../../supabase/migrations/002_figsy.sql'))
    expect(figsyMig, 'there is still no unique (client_id, icp_id) index to lean on')
      .not.toMatch(/unique[\s\S]{0,80}figsy_campaigns[\s\S]{0,80}icp_id/i)
    const sw = strip(raw(join(API, 'lib/start-work.ts')))
    expect(sw, 'ensureCampaignForIcp still reuses and re-activates — which is why attach must refuse')
      .toContain("update({ status: 'active' }).eq('id', existing.id)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ㉓ PROGRAMME ENROLMENT IS INCLUDED FULFILMENT — the wallet is not consulted, nor spent
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// Founder ruling, 2 Sep: "P1/P2 programme economics pay for programme delivery. Enrolment is
// NOT separately billable." Proved against the real `autoEnrollLead` source, because the three
// facts that matter are all conditions inside it.
describe('㉓ the legacy wallet is bypassed for programme work and untouched for everyone else', () => {
  const fig = strip(raw(join(API, 'lib/figsy.ts')))

  it('🛑 `programmeFulfilment` IS ITS OWN MODE — `force` is not reused', () => {
    // `force` means "a human approval BOUGHT this work" — the per-lead $4 semantics. Reusing
    // it would make every log line and alert claim a purchase that never happened.
    expect(fig).toContain('programmeFulfilment?: { programmeId: string }')
    expect(fig).toContain('export type EnrolMode')
  })

  it('the wallet GATE is skipped only for proven programme fulfilment', () => {
    expect(fig).toContain('if (!isDemo && !programmeFulfilment && !canEnroll(client?.figsy_credits_remaining))')
  })

  it('the wallet CHARGE is skipped only for proven programme fulfilment', () => {
    expect(fig).toContain("(isDemo || opts?.prepaid || programmeFulfilment) ? 'skipped' : await chargeFigsyEnroll(clientId, lead)")
  })

  it('🛑 THE BYPASS IS UNLOCKED BY A DATABASE CHECK, NOT BY THE CALLER\'S ARGUMENT', () => {
    // A guard that depends on another guard having run is not a guard — and what is being
    // unlocked here is free enrolment.
    expect(fig).toContain('const { verifyProgrammeFulfilment } = await import(\'./programme-preparation\')')
    expect(fig).toContain('const v = await verifyProgrammeFulfilment(leadId, clientId, opts.programmeFulfilment.programmeId)')
    // …and a refusal returns before anything is written.
    const at = fig.indexOf('if (!v.ok) {')
    const gate = fig.indexOf('canEnroll(client?.figsy_credits_remaining)')
    expect(at).toBeGreaterThan(-1)
    expect(at, 'the verification must precede the wallet decision').toBeLessThan(gate)
  })

  it('preparation is allowed while AUTO_OUTREACH_ENABLED is off — but the SEND still is not', () => {
    // Preparing is not sending. The bail is relaxed for programme fulfilment; the send at the
    // bottom of the function still consults `sendSequenceEmail`, which has its own switch.
    expect(fig).toContain('if (!opts?.force && !opts?.programmeFulfilment && !outreachEnabled())')
    expect(fig, 'the send path is untouched').toContain('await sendSequenceEmail(')
  })

  it('and no programme path creates revenue, a payment or an invoice', () => {
    const prep = strip(raw(join(API, 'lib/programme-preparation.ts')))
    for (const forbidden of ['chargeFigsyEnroll', 'figsy_credits_remaining', 'credit_transactions', 'stripe', 'invoice']) {
      expect(prep, `preparation must never touch ${forbidden}`).not.toMatch(new RegExp(forbidden, 'i'))
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ㉔ THE FRIDAY RUNBOOK — programme first, then the fresh ICP
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('㉔ the fresh-ICP ordering is a real property of the code, not a hope', () => {
  it('🛑 CREATING AN ICP ATTEMPTS A CAMPAIGN IMMEDIATELY — which is why order matters', () => {
    const op = strip(raw(join(API, 'routes/operator.ts')))
    expect(op).toContain("void ensureCampaignForIcp(client.id, data.id, data.name, { activate: true })")
  })

  it('…and that attempt is REFUSED for a client whose programme is not yet LIVE', () => {
    // So an ICP created AFTER the programme exists stays campaign-clean, and can be attached.
    // The refusal happens before any insert — the programme gate sits above the try block.
    const sw = strip(raw(join(API, 'lib/start-work.ts')))
    const gate = sw.indexOf("const verdict = await checkProgrammeAuthority(clientId, 'OUTREACH'")
    const insert = sw.indexOf("db.from('figsy_campaigns')")
    expect(gate, 'the programme gate must exist').toBeGreaterThan(-1)
    expect(gate, 'and must precede any campaign write').toBeLessThan(insert)
    expect(sw).toContain('return { refused:')
  })

  it('an ICP created BEFORE the programme keeps its campaign, and attach then refuses it', async () => {
    // The operator-error case. Not redesigned for Friday — refused clearly instead.
    dbState.programme = asRow(P({ status: 'SOURCING_AUTHORISED', client_id: 'H' }))
    dbState.icp = { id: 'I_EARLY', client_id: 'H', name: 'Made too early', is_active: true, programme_id: null }
    dbState.campaigns = [{ id: 'C', name: 'Outbound campaign', status: 'active' }]
    const r = await attachIcpToProgramme('prog-1', 'I_EARLY')
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.reason).toMatch(/Create a new ICP for this programme/)
  })
})
