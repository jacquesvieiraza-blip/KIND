// ═══════════════════════════════════════════════════════════════════════════════════════
// TWO SEAMS THE AUDIT FOUND OPEN — and both would have been discovered by a paying customer.
//
// ── ① THE MEETING BELONGED TO NO PROGRAMME ──────────────────────────────────────────────
//
// `meetings.programme_id` existed and NOTHING ever populated it. Both booking writers left it
// NULL, so a real prospect booking off a programme's own sequence produced a meeting attached
// to no programme — and every programme-scoped report counted zero. The single outcome the
// client is buying was invisible in the product that sold it to them.
//
// The enrolment is the attribution truth: it is the row that says *this person is being worked,
// under this campaign, for this programme*, written at preparation and carrying both ids. A
// programme cannot be inferred from the client (they may have had several), the lead (it may
// predate the programme) or "the newest programme" — that is a guess wearing a fact's clothes.
//
// ── ② A REVERSED PROGRAMME PAYMENT LEFT THE PROGRAMME LIVE ──────────────────────────────
//
// `charge.refunded` / `charge.dispute.created` paused the client's ACTIVE CAMPAIGNS and stopped
// there. The programme row was untouched — no `disputed_at`, no `paused_at` — so
// `checkProgrammeAuthority` still granted OUTREACH, and any legacy activation path could wake
// the campaigns straight back up. Pausing the symptom while the authority stays live is not a
// stop, and this was the state we were about to take real client money in.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'

type Row = Record<string, unknown>
const state: { enrollments: Row[]; programmes: Row[] } = { enrollments: [], programmes: [] }
const alerts: { subject: string }[] = []

function table(name: keyof typeof state) {
  const rows = () => state[name]
  const q: Record<string, unknown> & { _f: ((r: Row) => boolean)[] } = {
    _f: [], _mode: '', _payload: null as Row | null,
    select() { return q }, order() { return q }, limit() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not(c: string, _o: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) !== v); return q },
    in(c: string, l: unknown[]) { q._f.push((r: Row) => l.includes(r[c] as never)); return q },
    insert(p: Row) { q._mode = 'insert'; q._payload = p; return q },
    update(p: Row) { q._mode = 'update'; q._payload = p; return q },
    _hit() { return rows().filter(r => q._f.every(f => f(r))) },
    _run() {
      if (q._mode === 'update') { const h = q._hit(); for (const r of h) Object.assign(r, q._payload); return { data: h, error: null } }
      return { data: q._hit(), error: null }
    },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) { return Promise.resolve(q._run()).then(res) },
  } as never
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t === 'programmes' ? 'programmes' : 'enrollments'),
    rpc: async () => ({ data: null, error: null }),
  },
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (_k: string, subject: string) => { alerts.push({ subject }); },
}))

import { resolveBookingAttribution } from './meeting-truth'
import { recordDispute } from './programme'

const LEAD = 'lead-1'
const PROG = 'prog-1'
const OTHER_PROG = 'prog-2'

beforeEach(() => { state.enrollments = []; state.programmes = []; alerts.length = 0 })

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① MEETING → PROGRAMME ATTRIBUTION
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① a booking is attributed from its enrolment', () => {
  it('🛑 the named enrolment gives BOTH the campaign and the programme', async () => {
    state.enrollments.push({ id: 'enr-1', lead_id: LEAD, campaign_id: 'camp-1', programme_id: PROG })
    const a = await resolveBookingAttribution(LEAD, 'enr-1')
    expect(a.programmeId, 'the meeting would belong to no programme').toBe(PROG)
    expect(a.campaignId).toBe('camp-1')
    expect(a.enrollmentId).toBe('enr-1')
  })

  it('🛑 BOTH FACTS COME FROM ONE ROW — never one enrolment\'s campaign and another\'s programme', async () => {
    // Two enrolments for the same lead, deliberately disagreeing. Resolving the two fields
    // separately would produce a booking describing work nobody did.
    state.enrollments.push({ id: 'enr-old', lead_id: LEAD, campaign_id: 'camp-OLD', programme_id: null, enrolled_at: '2026-01-01' })
    state.enrollments.push({ id: 'enr-new', lead_id: LEAD, campaign_id: 'camp-NEW', programme_id: PROG, enrolled_at: '2026-09-01' })
    const a = await resolveBookingAttribution(LEAD, 'enr-old')
    expect(a.campaignId).toBe('camp-OLD')
    expect(a.programmeId, 'the programme came from a different row than the campaign').toBe(null)
  })

  it('falls back to the lead\'s enrolment when none is named, and still uses one row', async () => {
    state.enrollments.push({ id: 'enr-1', lead_id: LEAD, campaign_id: 'camp-1', programme_id: PROG, enrolled_at: '2026-09-01' })
    const a = await resolveBookingAttribution(LEAD, null)
    expect(a.programmeId).toBe(PROG)
    expect(a.campaignId).toBe('camp-1')
  })

  it('🛑 NULL IS AN HONEST ANSWER — a lead with no enrolment belongs to no programme', async () => {
    const a = await resolveBookingAttribution(LEAD, null)
    expect(a.programmeId).toBe(null)
    expect(a.campaignId).toBe(null)
  })

  it('🛑 never attributes to ANOTHER programme', async () => {
    state.enrollments.push({ id: 'enr-mine', lead_id: LEAD, campaign_id: 'camp-1', programme_id: PROG, enrolled_at: '2026-09-01' })
    state.enrollments.push({ id: 'enr-theirs', lead_id: 'lead-other', campaign_id: 'camp-2', programme_id: OTHER_PROG, enrolled_at: '2026-09-02' })
    const a = await resolveBookingAttribution(LEAD, null)
    expect(a.programmeId).toBe(PROG)
    expect(a.programmeId).not.toBe(OTHER_PROG)
  })

  it('a legacy NULL-programme enrolment attributes to no programme, never to a guess', async () => {
    state.enrollments.push({ id: 'enr-legacy', lead_id: LEAD, campaign_id: 'camp-legacy', programme_id: null, enrolled_at: '2026-01-01' })
    const a = await resolveBookingAttribution(LEAD, null)
    expect(a.campaignId).toBe('camp-legacy')
    expect(a.programmeId).toBe(null)
  })
})

describe('① both booking writers use it, and BOOKED semantics are untouched', () => {
  const CAL = readFileSync(join(__dirname, '..', 'routes', 'calendar.ts'), 'utf8')
  const TRUTH = readFileSync(join(__dirname, 'meeting-truth.ts'), 'utf8')

  it('every recordBooking call passes a resolved programmeId', () => {
    const calls = [...CAL.matchAll(/recordBooking\(\{[\s\S]{0,600}?\}\)/g)].map(m => m[0])
    expect(calls.length, 'the booking writers moved').toBe(2)
    for (const c of calls) {
      expect(c, 'a booking writer still omits the programme').toContain('programmeId:   attribution.programmeId')
      expect(c).toContain('campaignId:    attribution.campaignId')
    }
  })

  it('🛑 no writer infers the programme from the client, the lead alone or "the newest"', () => {
    const body = TRUTH.slice(TRUTH.indexOf('export async function resolveBookingAttribution'))
      .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(body.includes("from('programmes')"), 'attribution reads the programmes table').toBe(false)
    expect(body.includes('openProgrammeFor'), 'attribution resolves the client\'s open programme').toBe(false)
    expect(body).toContain("from('figsy_enrollments')")
  })

  it('BOOKED vs BOOKED_UNVERIFIED still turns on the google event id alone', () => {
    expect(TRUTH).toContain("state:           verified ? 'BOOKED' : 'BOOKED_UNVERIFIED'")
    expect(TRUTH).toContain('const verified = !!params.googleEventId')
  })

  it('the unverified fallback attributes too — a calendar outage must not erase an outcome', () => {
    const at = CAL.indexOf('async function recordUnverifiedBooking')
    const body = CAL.slice(at, at + 1600)
    expect(body).toContain('resolveBookingAttribution')
    expect(body).toContain('googleEventId: null')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② REFUND / DISPUTE PROGRAMME SAFETY
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② a reversed programme payment stops the programme itself', () => {
  it('🛑 stamps disputed_at AND paused_at — the authority, not just the campaigns', async () => {
    state.programmes.push({ id: PROG, client_id: 'c1', paused_at: null, pause_reason: null, disputed_at: null })
    const r = await recordDispute(PROG, 'Stripe charge.refunded', 'refund')
    expect(r.ok).toBe(true)
    const p = state.programmes[0]
    expect(p.disputed_at, 'the programme was never marked disputed').toBeTruthy()
    // 🛑 `paused_at` IS WHAT `checkProgrammeAuthority` REFUSES ON. Without it the money is
    // reversed and OUTREACH authority still says yes.
    expect(p.paused_at, 'the programme was left with live outreach authority').toBeTruthy()
    expect(p.pause_reason).toBe('quality')
  })

  it('🛑 IDEMPOTENT — a redelivered webhook keeps the FIRST stamp and alerts once', async () => {
    // ⚠️ THE ORIGINAL STAMP IS A SENTINEL, NOT A CLOCK READING. Comparing two
    // `new Date().toISOString()` values taken microseconds apart proved nothing: they are the
    // same string inside one millisecond, so mutating `p.disputed_at ?? now` to a bare `now`
    // came back GREEN. A distinguishable value is what makes the retry visible.
    state.programmes.push({
      id: PROG, client_id: 'c1', paused_at: 'PAUSED-ORIGINAL',
      pause_reason: 'quality', disputed_at: 'DISPUTED-ORIGINAL',
    })
    await recordDispute(PROG, 'redelivery', 'dispute')
    await recordDispute(PROG, 'redelivery again', 'dispute')
    expect(state.programmes[0].disputed_at, 'a retry rewrote when the money was reversed').toBe('DISPUTED-ORIGINAL')
    expect(state.programmes[0].paused_at, 'a retry moved the pause').toBe('PAUSED-ORIGINAL')
    expect(alerts.length, 'a redelivery alerted the founder again').toBe(0)
  })

  it('…and the FIRST delivery does stamp and alert exactly once', async () => {
    state.programmes.push({ id: PROG, client_id: 'c1', paused_at: null, pause_reason: null, disputed_at: null })
    await recordDispute(PROG, 'first', 'dispute')
    expect(state.programmes[0].disputed_at).toBeTruthy()
    expect(alerts.length).toBe(1)
  })

  it('never overwrites an existing pause reason — the earlier decision stands', async () => {
    state.programmes.push({ id: PROG, client_id: 'c1', paused_at: 'earlier', pause_reason: 'client', disputed_at: null })
    await recordDispute(PROG, 'x', 'refund')
    expect(state.programmes[0].paused_at).toBe('earlier')
    expect(state.programmes[0].pause_reason).toBe('client')
  })

  it('a refund and a dispute are told apart in what the founder is sent', async () => {
    state.programmes.push({ id: PROG, client_id: 'c1', paused_at: null, pause_reason: null, disputed_at: null })
    await recordDispute(PROG, 'x', 'refund')
    expect(alerts[0].subject).toContain('refunded')
    alerts.length = 0
    state.programmes = [{ id: OTHER_PROG, client_id: 'c1', paused_at: null, pause_reason: null, disputed_at: null }]
    await recordDispute(OTHER_PROG, 'x', 'dispute')
    expect(alerts[0].subject).toContain('disputed')
  })

  it('an unknown programme is refused, never invented', async () => {
    const r = await recordDispute('nope', 'x', 'refund')
    expect(r.ok).toBe(false)
  })

  it('🛑 DELETES NOTHING AND FABRICATES NO REFUND ACCOUNTING', async () => {
    const PROGSRC = readFileSync(join(__dirname, 'programme.ts'), 'utf8')
    const body = PROGSRC.slice(PROGSRC.indexOf('export async function recordDispute'))
      .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
      .slice(0, 1800)
    for (const forbidden of ['.delete(', 'first_paid_at: null', 'second_paid_at: null', 'make_whole_cents', 'credit_transactions']) {
      expect(body.includes(forbidden), `the reversal reaches ${forbidden}`).toBe(false)
    }
  })
})

describe('② the Stripe handler reaches it, and the authority refuses afterwards', () => {
  const STRIPE = readFileSync(join(__dirname, '..', 'routes', 'stripe.ts'), 'utf8')
  const AUTH = readFileSync(join(__dirname, 'programme-authority.ts'), 'utf8')

  it('a programme payment reversal calls recordDispute for the EXACT programme', () => {
    const at = STRIPE.indexOf("if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created')")
    expect(at).toBeGreaterThan(-1)
    const block = STRIPE.slice(at, at + 9000)
    expect(block).toContain('recordDispute(')
    // 🛑 THE CONDITION THAT REACHES IT, NOT JUST THE CALL. Asserting the call alone passed
    // happily when the guard around it was mutated to `if (false)` — the code was still there
    // and could never run. The reachability is the thing being proved.
    expect(block, 'the call is present but nothing reaches it')
      .toContain("if (meta.programmeId && typeof meta.programmeId === 'string') {")
    // 🛑 FROM THE CHECKOUT METADATA, which is identity — never a lookup that could pick another.
    expect(block).toContain('meta.programmeId,')
    expect(block.includes('openProgrammeFor'), 'the handler resolves a programme from the client').toBe(false)
  })

  it('it distinguishes a refund from a dispute', () => {
    expect(STRIPE).toContain("event.type === 'charge.dispute.created' ? 'dispute' as const : 'refund' as const")
  })

  it('a failure to stop the programme is alerted, never swallowed', () => {
    const at = STRIPE.indexOf('could not be stopped')
    expect(at).toBeGreaterThan(-1)
    expect(STRIPE.slice(at - 400, at + 700)).toContain('sendFounderAlert')
  })

  it('🛑 and the campaign pause is still there — both, not either', () => {
    expect(STRIPE).toContain("update({ status: 'paused' })")
  })

  it('🛑 a paused programme is refused OUTREACH, so legacy activation cannot wake it', () => {
    expect(AUTH).toContain('if (p.paused_at) {')
    expect(AUTH).toContain("refuse('programme_paused'")
    // `ensureCampaignForIcp({ activate: true })` — the only door to an active campaign —
    // consults exactly this, so a reversed programme cannot be reactivated by that path.
    const START = readFileSync(join(__dirname, 'start-work.ts'), 'utf8')
    expect(START).toContain("checkProgrammeAuthority(clientId, 'OUTREACH'")
  })
})
