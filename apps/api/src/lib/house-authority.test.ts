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
  enrollment: { client_id: string | null; programme_id: string | null } | null
  programme: Record<string, unknown> | null
  icp: Record<string, unknown> | null
  icpList: Record<string, unknown>[]
  leadCount: number
  leadCountError: { message: string } | null
  writes: { table: string; patch: Record<string, unknown> }[]
  updatedRows: Record<string, unknown>[] | null
  icpClientFilter: string | null
  icpListError: { message: string } | null
} = {
  enrollment: null, programme: null, icp: null, icpList: [],
  leadCount: 0, leadCountError: null, writes: [], updatedRows: null,
  icpClientFilter: null, icpListError: null,
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
        not: () => q, limit: () => q, order: () => q, is: () => q, in: () => q,
        update: (patch: Record<string, unknown>) => { dbState.writes.push({ table, patch }); return q },
        insert: (patch: Record<string, unknown>) => { dbState.writes.push({ table, patch }); return q },
        async maybeSingle() {
          if (table === 'figsy_enrollments') return { data: dbState.enrollment, error: null }
          if (table === 'programmes') return { data: dbState.programme, error: null }
          if (table === 'icps') return { data: dbState.icp, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: dbState.programme, error: null } },
        then: (res: (v: unknown) => unknown) => {
          if (table === 'leads') {
            // `markReadyForApproval` uses a head count: `{ count, error }`, no rows.
            return res({ data: null, count: dbState.leadCount, error: dbState.leadCountError })
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
  dbState.icpList = []; dbState.leadCount = 0; dbState.leadCountError = null
  dbState.writes = []; dbState.updatedRows = null
  dbState.icpClientFilter = null; dbState.icpListError = null
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
    expect(dbState.writes[0].patch, 'the paid path still auto-goes-live').toMatchObject({
      second_payment_ref: 'cs_2', status: 'LIVE',
    })
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
    expect((mig.match(/key:\s*'[^']+'/g) ?? []), 'A2 must add no runner entry').toHaveLength(46)
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
      expect(r.ok).toBe(true)
      expect(dbState.writes[0].patch).toMatchObject({ status: 'LIVE' })
      expect(dbState.writes[0].patch.went_live_at).toBeTruthy()
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
    expect(f, 'the update must be guarded on went_live_at being null').toContain(".is('went_live_at', null)")
  })

  it('the loser of that race gets success, not a false failure', async () => {
    dbState.programme = asRow(P({ status: 'APPROVED', approved_at: 'a', second_authorised_at: 'i' }))
    dbState.updatedRows = []   // compare-and-set matched zero rows: somebody else won
    const r = await goLiveProgramme('prog-1')
    expect(r.ok).toBe(true)
    expect(r.alreadyLive).toBe(true)
  })

  it('and the route records no second audit event for a no-op', () => {
    const routes = strip(raw(join(API, 'routes/programme.ts')))
    expect(routes).toMatch(/if \(r\.ok && !r\.alreadyLive\) await auditProgramme\(req, 'programme_go_live'/)
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

  it('an enrollment that NAMES the programme is authorised as normal', async () => {
    // The other half. Without this, a refusal that broke everything would still pass above.
    dbState.enrollment = { client_id: 'house', programme_id: 'prog-1' }
    dbState.programme = asRow(LIVE)
    const v = await checkEnrollmentAuthority('enr-current', 'OUTREACH')
    expect(v.allowed, 'the programme must still authorise its OWN work').toBe(true)
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
    expect(icps).toContain('const open = await openProgrammeForClient(clientId)')
    expect(icps).toMatch(/if \(open && !programmeId\)/)
    expect(icps).toMatch(/if \(open && programmeId && programmeId !== open\.id\)/)
  })

  it('a client with NO open programme keeps genuine legacy sourcing', () => {
    // ⚠️ SCOPED TO THE NEW GATE ONLY. The window ends where the pre-existing broken-link
    // checks begin — those have always thrown and are not what this asserts. A wider slice
    // counted one of them and made the assertion about the wrong code.
    const at = icps.indexOf('const open = await openProgrammeForClient(clientId)')
    const block = icps.slice(at, icps.indexOf('if (programmeId) {', at))
    const throws = [...block.matchAll(/throw new ProgrammeAuthorityError/g)]
    expect(throws, 'the new gate raises exactly two refusals').toHaveLength(2)
    // Both live inside an `if (open …)`, so a client with no programme reaches neither.
    for (const m of throws) {
      const guard = block.slice(0, m.index).lastIndexOf('if (open')
      expect(guard, 'every new refusal must be conditioned on an OPEN programme').toBeGreaterThan(-1)
    }
    // ⚠️ NO "nothing throws unconditionally" ASSERTION HERE. The first version of this line
    // matched the very two throws the loop above had just proved are guarded — a check that
    // contradicted its own sibling. The guard proof IS the assertion.
  })

  it('🛑 THE LOOKALIKE ROUTE IS FENCED TOO — including for House', () => {
    // `audience !== 'house'` skipped the spend RPC entirely (Apollo is prepaid, so there was
    // no PDL cash to fence) and with it the programme check inside. House is Client Zero: the
    // one client the programme was built for was the one client the fence did not cover.
    const look = strip(raw(join(API, 'routes/lookalike.ts')))
    const fence = look.indexOf('openProgrammeForClient')
    expect(fence, 'the lookalike route must check for an open programme').toBeGreaterThan(-1)
    // ⚠️ THE CONDITION IS MATCHED WHOLE. `if (openProgramme) {` and `if (false && openProgramme) {`
    // both contain the identifier, so asserting its PRESENCE proves only that somebody typed
    // the word. The neutered version was written and this test stayed green until it read the
    // actual condition.
    expect(look, 'the refusal must be conditioned on the open programme itself')
      .toMatch(/\n\s*if \(openProgramme\) \{/)
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

  it('one positively-attributed lead is enough — no invented volume threshold', async () => {
    // ⚠️ THE RULE IS ZERO VERSUS MORE THAN ZERO. A percentage of the ceiling, or a ratio, would
    // be a new product rule nobody agreed; a count of the work that exists is existing truth.
    dbState.programme = asRow(P({ status: 'SOURCING_AUTHORISED', first_authorised_at: 'i' }))
    dbState.leadCount = 1
    const r = await markReadyForApproval('prog-1')
    expect(r.ok).toBe(true)
    expect(dbState.writes[0].patch).toMatchObject({ status: 'READY_FOR_APPROVAL' })
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
    expect(op).toContain('return { programme: null, batches: [], stranded: [], blockers: [], degraded }')
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
    expect(fig).toContain(".eq('client_id', clientId).eq('icp_id', leadIcp.icp_id).eq('status', 'active')")
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
    const block = fig.slice(guard, fallback)
    expect(block, 'a programme lead with no ICP campaign must enrol in nothing').toMatch(/\n\s*return\n/)
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
    expect(sw).toContain("const verdict = await checkProgrammeAuthority(clientId, 'OUTREACH')")
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
    expect(patch).toMatchObject({
      second_payment_ref: 'cs_2', second_payment_intent_id: 'pi_2', status: 'LIVE',
    })
    expect(patch.second_paid_at).toBeTruthy()
    expect(patch.went_live_at, 'the paid path still stamps went_live_at itself').toBeTruthy()
    expect(patch).not.toHaveProperty('second_authorised_at')
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

  it('and it deliberately does NOT copy the two "still outstanding" filters', () => {
    // `revealed_at IS NULL` and `status != 'passed'` answer a different question. Copying them
    // would make a programme whose leads the client has already worked through read as having
    // nothing to review — the opposite of the truth.
    const src = strip(raw(join(API, 'lib/programme.ts')))
    const at = src.indexOf('export async function markReadyForApproval')
    const f = src.slice(at, at + 2600)
    expect(f).not.toContain("revealed_at")
    expect(f).not.toContain("'passed'")
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
