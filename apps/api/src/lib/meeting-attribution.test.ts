// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 10 Sep (I4) — ONE CLIENT, TWO PROGRAMMES, AND NEITHER MAY WEAR THE OTHER'S RESULT.
//
// ── THREE KEYS, THREE ANSWERS, ONE NUMBER ───────────────────────────────────────────────
//
// "How many meetings has this programme booked" was being answered three different ways:
//
//   Vida's panel      `campaignMeetingCount(campaignId)`     — keyed by CAMPAIGN
//   Milla's screen    `meetingCounts({ programmeId })`       — keyed by PROGRAMME
//   the review hold   `clientMeetingCounts([clientId])`      — keyed by CLIENT
//
// It is the number the entire commercial model is judged on, and a client with two programmes
// got a different one on each surface.
//
// 🛑 THE REVIEW HOLD'S VERSION WAS THE DANGEROUS ONE, and it failed in the direction that HIDES
// a problem. The hold exists so a human looks when 250 leads have been delivered without a
// result. Counting by client meant a first programme that booked one meeting answered for a
// second that had delivered 250 and produced nothing — so the programme that most needed
// looking at was exactly the one a sibling's success covered for.
//
// Founder, 10 Sep: "programme_id remains canonical for outcome attribution. Preserve
// campaign_id as operational metadata/bridge where needed."
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

type Row = Record<string, unknown>
const state: { meetings: Row[]; unreadable: boolean } = { meetings: [], unreadable: false }

function table(name: string) {
  const q: Record<string, unknown> = {}
  const filters: Array<(r: Row) => boolean> = []
  let head = false
  q.select = (_c?: string, o?: { head?: boolean }) => { head = o?.head === true; return q }
  q.eq = (c: string, v: unknown) => { filters.push(r => r[c] === v); return q }
  q.is = (c: string, v: unknown) => { filters.push(r => (r[c] ?? null) === v); return q }
  q.not = (c: string, _o: string, v: unknown) => { filters.push(r => (r[c] ?? null) !== v); return q }
  q.gte = (c: string, v: string) => { filters.push(r => String(r[c] ?? '') >= v); return q }
  q.in = (c: string, l: unknown[]) => { filters.push(r => l.includes(r[c] as never)); return q }
  q.then = (res: (v: unknown) => unknown) => {
    if (state.unreadable) return Promise.resolve({ data: null, count: null, error: { message: 'meetings unreadable' } }).then(res)
    const rows = (name === 'meetings' ? state.meetings : []).filter(r => filters.every(f => f(r)))
    return Promise.resolve({ data: head ? null : rows, count: rows.length, error: null }).then(res)
  }
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t), rpc: async () => ({ data: null, error: null }) } }))

import { meetingCounts } from './meeting-truth'
import { reviewTriggerReached } from './programme-authority'

const CLIENT = 'client-1'
const OTHER_CLIENT = 'client-2'
const PROG_A = 'prog-a'
const PROG_B = 'prog-b'

/** One countable meeting: not excluded, not superseded. */
const booked = (id: string, programmeId: string | null, clientId = CLIENT, over: Row = {}): Row => ({
  id, client_id: clientId, programme_id: programmeId, campaign_id: 'camp-shared',
  state: 'BOOKED', excluded_reason: null, superseded_by: null,
  scheduled_at: '2026-09-01T10:00:00Z', ...over,
})

/** A programme row shaped as `reviewTriggerReached` reads it. */
const prog = (id: string, sourcedUsed: number): Parameters<typeof reviewTriggerReached>[0] =>
  ({ id, client_id: CLIENT, sourced_used: sourcedUsed } as never)

beforeEach(() => { state.meetings = []; state.unreadable = false })

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE COUNT ITSELF
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① one client, two programmes, no cross-contamination', () => {
  it('🛑 each programme is counted its own result and nobody else\'s', async () => {
    state.meetings = [
      booked('m1', PROG_A), booked('m2', PROG_A),
      booked('m3', PROG_B),
    ]
    expect((await meetingCounts({ clientId: CLIENT, programmeId: PROG_A }))?.booked).toBe(2)
    expect((await meetingCounts({ clientId: CLIENT, programmeId: PROG_B }))?.booked).toBe(1)
  })

  it('the client-wide total still exists and is still the sum — history is not deleted', async () => {
    // ⚠️ THE POINT IS SCOPE, NOT SUPPRESSION. Reports and all-time totals legitimately count
    // every meeting a client has; what changed is that a PROGRAMME's panel no longer does.
    state.meetings = [booked('m1', PROG_A), booked('m2', PROG_B), booked('m3', null)]
    expect((await meetingCounts({ clientId: CLIENT }))?.booked).toBe(3)
  })

  it('🛑 another client\'s meeting can never be pulled in, even on a shared campaign', async () => {
    // Every fixture row carries the same `campaign_id`, which is exactly how a campaign-keyed
    // count leaked: the campaign is operational plumbing and can be re-pointed or reused.
    state.meetings = [booked('m1', PROG_A), booked('m2', PROG_A, OTHER_CLIENT)]
    expect((await meetingCounts({ clientId: CLIENT, programmeId: PROG_A }))?.booked).toBe(1)
  })

  it('a meeting with no programme belongs to no programme', async () => {
    // ⚠️ NULL IS A RESULT, NOT A GAP TO FILL. Legacy meetings, and every meeting booked before
    // `resolveBookingAttribution` started stamping the column on 9 Sep, carry null — and
    // inferring "the client's current programme" would attribute a 2025 booking to today's work.
    state.meetings = [booked('m1', null)]
    expect((await meetingCounts({ clientId: CLIENT, programmeId: PROG_A }))?.booked).toBe(0)
    expect((await meetingCounts({ clientId: CLIENT }))?.booked).toBe(1)
  })

  it('excluded and superseded rows stay out of both scopes', async () => {
    state.meetings = [
      booked('m1', PROG_A, CLIENT, { excluded_reason: 'duplicate' }),
      booked('m2', PROG_A, CLIENT, { superseded_by: 'm9' }),
      booked('m3', PROG_A),
    ]
    expect((await meetingCounts({ clientId: CLIENT, programmeId: PROG_A }))?.booked).toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② THE REVIEW HOLD — where counting by client HID a problem
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② a sibling programme\'s success no longer answers for this one', () => {
  it('🛑 THE BUG: programme A booked a meeting, programme B delivered 250 and produced nothing', async () => {
    state.meetings = [booked('m1', PROG_A)]
    expect(await reviewTriggerReached(prog(PROG_B, 250)),
      "a sibling programme's meeting suppressed the hold on a programme that produced nothing").toBe(true)
  })

  it('and programme A itself is NOT held, because it did produce a result', async () => {
    // ⚠️ THE COMPLEMENT, so the case above cannot pass by everything being held.
    state.meetings = [booked('m1', PROG_A)]
    expect(await reviewTriggerReached(prog(PROG_A, 250))).toBe(false)
  })

  it('below the benchmark nothing is held, whatever the meetings say', async () => {
    state.meetings = []
    expect(await reviewTriggerReached(prog(PROG_B, 249))).toBe(false)
  })

  it('🛑 AN UNREADABLE COUNT RAISES NOTHING — unknown is not zero', async () => {
    // Reading a storage failure as no-meetings would raise a hold against a healthy programme
    // and stop its next batch. Null means the caller does nothing.
    state.unreadable = true
    expect(await reviewTriggerReached(prog(PROG_B, 250))).toBeNull()
  })

  it('a meeting on ANOTHER client does not answer for this programme either', async () => {
    state.meetings = [booked('m1', PROG_B, OTHER_CLIENT)]
    expect(await reviewTriggerReached(prog(PROG_B, 250)),
      "another client's meeting was counted as this programme's result").toBe(true)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ WHAT STAYS CAMPAIGN-KEYED, AND WHY THAT IS NOT AN INCONSISTENCY
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ campaign_id survives as operational metadata', () => {
  it('the Vida panel counts meetings by programme and sends by campaign', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const raw = readFileSync(join(__dirname, 'programme-lifecycle-facts.ts'), 'utf8')
    // 🛑 EXECUTABLE LINES ONLY. This file's comments EXPLAIN what it stopped doing, and they
    // name the old accessor to do it — a whole-file `not.toContain` would fail on the very
    // comment that records the fix. This repo has been caught by that shape before.
    const src = raw.split('\n')
      .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
      .join('\n')

    // Meetings: the outcome number, and it must be programme-scoped.
    expect(src, 'the panel still counts meetings by campaign').not.toContain('campaignMeetingCount(')
    expect(src).toContain('meetingCounts({ clientId, programmeId })')

    // Sends: `figsy_sent_emails` has no `programme_id` column, so the campaign IS the bridge.
    // Founder, 10 Sep: "preserve campaign_id as operational metadata/bridge where needed."
    expect(src).toContain("eq('campaign_id', campaignId)")
  })

  it('the campaign cache is still recomputed from the campaign — it is a cache OF a campaign', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    expect(src, 'figsy_campaigns.meetings_booked stopped being derived from its own campaign')
      .toContain('campaignMeetingCount(campaignId)')
  })
})
