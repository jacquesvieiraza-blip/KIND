// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R185 ④ · R189 ③ · card #2546 · S6) — A PROGRAMME IS NEVER PAUSED OR THROTTLED BY
// A ROBOT. THE FOUNDER IS TOLD IN VIDA, AND HE DECIDES.
//
// R185 ④: *"No automatic low-reply pause for programmes — the system tells the founder in Vida
// and he decides"* (*"yes. lock"*). R189 ③: each client is held by its own mailboxes; nothing
// else slows a client.
//
// What was wrong: every morning at 08:00 UTC `/figsy/check-performance` paused any campaign with
// 50+ sent, 10+ days old and under 1% replies — programmes and House included, and it emailed
// the client "Your campaign was paused". At 100 a day House would have paused itself the morning
// after resuming. And at 09:30 `/figsy/adaptive-send-check` silently cut or raised a campaign's
// daily limit. Both now leave programme customers alone; a legacy client is unchanged (proved
// below, so the programme assertions cannot pass vacuously).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'

process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key'

type Row = Record<string, unknown>
const DAY = 86_400_000

const state = {
  campaigns: [] as Row[],
  /** client ids on a programme; `null` = the read failed */
  programmeClients: new Set<string>() as Set<string> | null,
  paused: [] as string[],
  limitWrites: [] as { id: string; limit: number }[],
  clientEmails: [] as string[],
  alerts: [] as { kind: string; title: string; lines: string[]; about?: Row }[],
}

function query(table: string) {
  const filters: ((r: Row) => boolean)[] = []
  let updating: Row | null = null
  const q: Record<string, unknown> = {
    select() { return q },
    eq(col: string, val: unknown) { filters.push(r => r[col] === val); return q },
    in(col: string, vals: unknown[]) { filters.push(r => vals.includes(r[col])); return q },
    gt(col: string, val: number) { filters.push(r => Number(r[col]) > val); return q },
    gte(col: string, val: number) { filters.push(r => Number(r[col]) >= val); return q },
    not() { return q }, is() { return q }, order() { return q }, limit() { return q }, lte() { return q },
    update(row: Row) { updating = row; return q },
    async maybeSingle() {
      if (table === 'clients') return { data: { company_name: 'Co', user_id: 'u-1', campaign_paused_emails_enabled: null }, error: null }
      return { data: null, error: null }
    },
    then(resolve: (v: unknown) => unknown) {
      if (table === 'figsy_campaigns' && updating) {
        for (const c of state.campaigns.filter(r => filters.every(f => f(r)))) {
          c.status = updating.status
          state.paused.push(String(c.id))
        }
        return resolve({ data: null, error: null })
      }
      if (table === 'figsy_campaigns') return resolve({ data: state.campaigns.filter(r => filters.every(f => f(r))), error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => query(t),
    rpc: async (fn: string, args: { p_campaign_id: string; p_patch: { daily_send_limit: number } }) => {
      if (fn === 'figsy_merge_settings') state.limitWrites.push({ id: args.p_campaign_id, limit: args.p_patch.daily_send_limit })
      return { data: null, error: null }
    },
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'client@example.com' } } }) } },
  },
}))
vi.mock('./figsy', () => ({ recomputeCampaignCounters: async () => null }))
vi.mock('./email', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  sendCampaignPausedEmail: async (to: string) => { state.clientEmails.push(to) },
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, title: string, lines: string[], about?: Row) => {
    state.alerts.push({ kind, title, lines, about })
    return { delivered: true }
  },
}))
vi.mock('./programme-notifications', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  programmeClientIds: async () => state.programmeClients,
}))

async function call(path: string): Promise<{ status: number; body: Row }> {
  const { internalRouter } = await import('../routes/internal')
  const layer = (internalRouter as unknown as { stack: Array<{ route?: { path: string; stack: Array<{ handle: unknown }> } }> })
    .stack.find(l => l.route?.path === path)
  if (!layer?.route) throw new Error(`${path} not found on internalRouter`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle as (req: unknown, res: unknown) => Promise<void>
  const out = { status: 200, body: {} as Row }
  const res = { status(s: number) { out.status = s; return res }, json(b: Row) { out.body = b; return res } }
  await handler({ body: {}, params: {}, headers: {}, query: {} }, res)
  return out
}

/** Over every line of the old rule: 300 sent, 1 reply, 30 days old. */
const lowReplies = (id: string, client_id: string, status = 'active'): Row => ({
  id, client_id, name: `${client_id} campaign`, status, leads_enrolled: 300, emails_sent: 300,
  replies_total: 1, replies_interested: 0, opted_out: 0, created_at: new Date(Date.now() - 30 * DAY).toISOString(),
})

beforeEach(() => {
  state.campaigns = []
  state.programmeClients = new Set(['house', 'paying'])
  state.paused = []; state.limitWrites = []; state.clientEmails = []; state.alerts = []
})

describe('④ the 08:00 low-reply check never pauses a programme', () => {
  it('🛑 House and a paying client stay ACTIVE, and neither client is emailed "your campaign was paused"', async () => {
    state.campaigns = [lowReplies('camp-house', 'house'), lowReplies('camp-paying', 'paying')]
    const r = await call('/figsy/check-performance')
    expect(r.status).toBe(200)
    expect(state.paused).toEqual([])
    expect(state.campaigns.map(c => c.status)).toEqual(['active', 'active'])
    expect(state.clientEmails).toEqual([])
  })

  it('🛑 instead the founder is told in Vida, per campaign, with the numbers — "worth a look"', async () => {
    state.campaigns = [lowReplies('camp-house', 'house')]
    await call('/figsy/check-performance')
    const a = state.alerts.find(x => x.about?.subjectId === 'camp-house')
    expect(a, 'the founder was not told').toBeTruthy()
    expect(a!.kind).toBe('churn_risk')
    expect(a!.title).toContain('300 sent')
    expect(a!.title).toContain('1 reply')
    expect(a!.title).toContain('worth a look')
    expect(a!.about?.clientId).toBe('house')
    expect(a!.lines.join(' ')).toMatch(/not paused/i)
  })

  it('when the programme list cannot be read, NOTHING is paused — a robot never guesses a client off', async () => {
    state.programmeClients = null
    state.campaigns = [lowReplies('camp-house', 'house'), lowReplies('camp-legacy', 'legacy')]
    await call('/figsy/check-performance')
    expect(state.paused).toEqual([])
    expect(state.clientEmails).toEqual([])
  })

  it('a programme campaign the old rule already paused is shown to the founder, not silently left stopped', async () => {
    state.campaigns = [lowReplies('camp-stuck', 'paying', 'paused_low_performance')]
    await call('/figsy/check-performance')
    const a = state.alerts.find(x => x.about?.subjectId === 'camp-stuck')
    expect(a, 'a programme left paused by the old rule was not reported').toBeTruthy()
    expect(a!.lines.join(' ')).toMatch(/paused by the old automatic low-reply rule/i)
  })

  it('positive control: a LEGACY client is still paused and emailed exactly as before', async () => {
    state.campaigns = [lowReplies('camp-legacy', 'legacy')]
    await call('/figsy/check-performance')
    expect(state.paused).toEqual(['camp-legacy'])
    expect(state.clientEmails).toEqual(['client@example.com'])
  })
})

describe('R189 ③ the 09:30 adaptive check never throttles a programme', () => {
  /** 3% opt-outs: the old rule cuts the limit by a quarter. */
  const optOuts = (id: string, client_id: string): Row => ({
    id, client_id, status: 'active', emails_sent: 100, opted_out: 3, replies_total: 0, settings: { daily_send_limit: 40 },
  })

  it('🛑 a programme campaign’s daily limit is not touched', async () => {
    state.campaigns = [optOuts('camp-house', 'house')]
    await call('/figsy/adaptive-send-check')
    expect(state.limitWrites).toEqual([])
  })

  it('and when the programme list cannot be read, no limit anywhere is touched', async () => {
    state.programmeClients = null
    state.campaigns = [optOuts('camp-house', 'house'), optOuts('camp-legacy', 'legacy')]
    await call('/figsy/adaptive-send-check')
    expect(state.limitWrites).toEqual([])
  })

  it('positive control: a LEGACY campaign is still adjusted exactly as before', async () => {
    state.campaigns = [optOuts('camp-legacy', 'legacy')]
    await call('/figsy/adaptive-send-check')
    expect(state.limitWrites).toEqual([{ id: 'camp-legacy', limit: 30 }])
  })
})
