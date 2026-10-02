// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ⑥ · card #2547 · S7 part c) — "SENDING HAS STALLED" ONLY WHEN IT HAS.
//
// R185 ⑥: *"no 'stalled' alert when nothing was allowed to send"*. The hourly watchdog fired
// whenever anything was overdue and nothing at all had gone out in six hours — a paused House,
// an inactive campaign and a weekend each read as a stall, once an hour.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = {
  enrollments: [] as Row[],
  campaigns: [] as Row[],
  sentByCampaign: new Map<string, number>(),
  programmes: new Map<string, Row | null>(),
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      let head = false
      const q: Record<string, unknown> = {
        select(_c?: unknown, o?: { head?: boolean }) { head = o?.head === true; return q },
        eq(c: string, v: unknown) { filters.push(r => r[c] === v); return q },
        in(c: string, vs: unknown[]) { filters.push(r => vs.includes(r[c])); return q },
        lte() { return q }, gte() { return q }, limit() { return q },
        then(res: (v: unknown) => unknown) {
          if (table === 'figsy_enrollments') return res({ data: state.enrollments, error: null })
          if (table === 'figsy_campaigns') return res({ data: state.campaigns.filter(r => filters.every(f => f(r))), error: null })
          if (table === 'figsy_sent_emails' && head) {
            // the campaigns asked about are this client's; count what they sent
            const asked = state.campaigns.filter(r => filters.every(f => f({ campaign_id: r.id }))).map(r => String(r.id))
            return res({ data: null, count: asked.reduce((n, id) => n + (state.sentByCampaign.get(id) ?? 0), 0), error: null })
          }
          return res({ data: [], error: null })
        },
      }
      return q
    },
  },
}))
vi.mock('./commercial-model', () => ({
  clientCommercialModel: async (cid: string) => ({
    model: 'programme', openProgramme: state.programmes.get(cid) ?? null,
  }),
}))

/** A programme the send gate would let send right now. */
const LIVE = (client_id: string, over: Row = {}): Row => ({
  id: `prog-${client_id}`, client_id, status: 'LIVE', approved_at: '2026-09-30T10:00:00Z',
  first_paid_at: '2026-09-29T10:00:00Z', second_paid_at: '2026-09-30T10:00:00Z',
  first_payment_ref: 'pi_1', second_payment_ref: 'pi_2',
  run_at: '2026-09-30T12:00:00Z', paused_at: null, ...over,
})

function client(cid: string, { due = 3, sent = 0, live = LIVE(cid), active = true }: { due?: number; sent?: number; live?: Row | null; active?: boolean } = {}) {
  state.campaigns.push({ id: `camp-${cid}`, client_id: cid, status: active ? 'active' : 'paused' })
  for (let i = 0; i < due; i++) state.enrollments.push({ client_id: cid, campaign_id: `camp-${cid}` })
  state.sentByCampaign.set(`camp-${cid}`, sent)
  state.programmes.set(cid, live)
}

const WEDNESDAY = new Date('2026-10-07T13:20:00Z')
const SATURDAY = new Date('2026-10-03T13:20:00Z')
const verdict = async (at = WEDNESDAY) => (await import('./sends-stalled')).sendsStalledVerdict(at)

beforeEach(() => { state.enrollments = []; state.campaigns = []; state.sentByCampaign = new Map(); state.programmes = new Map() })

describe('R185 ⑥ — a stall is something that SHOULD have sent and did not', () => {
  it('🛑 a live, running programme with work due and nothing sent in six hours IS a stall, named by client', async () => {
    client('house')
    expect((await verdict()).stalled).toEqual([{ clientId: 'house', due: 3 }])
  })

  it('🛑 a PAUSED programme is not a stall — nothing was allowed to send (the hourly House alert)', async () => {
    client('house', { live: LIVE('house', { paused_at: '2026-10-02T09:00:00Z' }) })
    expect((await verdict()).stalled).toEqual([])
  })

  it('🛑 a programme armed but never run is not a stall', async () => {
    client('house', { live: LIVE('house', { run_at: null }) })
    expect((await verdict()).stalled).toEqual([])
  })

  it('🛑 work on a campaign that is not active is not a stall', async () => {
    client('house', { active: false })
    expect((await verdict()).stalled).toEqual([])
  })

  it('🛑 a weekend is not a stall — programme email goes Monday to Friday', async () => {
    client('house')
    expect((await verdict(SATURDAY)).stalled).toEqual([])
  })

  it('a client that sent in the last six hours is sending, not stalled — and one client\'s silence is never hidden by another\'s sends', async () => {
    client('house', { sent: 4 })
    client('paying')
    const v = await verdict()
    expect(v.sending).toEqual(['house'])
    expect(v.stalled).toEqual([{ clientId: 'paying', due: 3 }])
  })
})

describe('once per stall, not every hour', () => {
  const cron = readFileSync(join(__dirname, '..', 'cron.ts'), 'utf8')
  const body = cron.slice(cron.indexOf('async function checkSendsStalled'), cron.indexOf('async function pruneCronClaims'))

  it('🛑 an open Vida task for that client means it has already been said — no second alert', () => {
    expect(body).toContain(".eq('dedupe_key', keyFor(s.clientId)).eq('status', 'open')")
    expect(body).toMatch(/if \(\(open \?\? \[\]\)\.length > 0\) continue/)
  })

  it('🛑 the alert names the client and its key matches the task it raises', () => {
    expect(body).toContain('`${name}: sending has stalled`')
    expect(body).toContain("{ clientId: s.clientId, subjectKind: 'send_stall' }")
  })

  it('a client that is sending again closes its stall, so the next one is news', () => {
    expect(body).toContain("resolveOperatorTasksForCondition('sends_stalled', keyFor(clientId)")
  })

  it('the old any-client, every-hour check is gone', () => {
    expect(body).not.toContain("'FIGSY sending has stalled'")
  })
})
