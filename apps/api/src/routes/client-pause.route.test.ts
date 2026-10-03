// ⚑ 29 Sep (R174 · PR 2d) — THE CLIENT'S "PAUSE SENDING" PAUSES, AT ONCE.
// ① The real route, against a fake database: it pauses with reason 'client', pages the founder
//   with the never-deduplicated kind, and a demo pauses without paging anyone.
// ② The lifecycle makes a client's pause a Needs-you at every stage.
// ③ The client is told why, in plain words; no reason keeps the locked sentence.
// ④ Milla's button and chip make the press — they no longer ask a Milla who cannot act.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({
  clients: [] as Row[], programme: null as Row | null,
  paused: [] as { id: string; reason: string }[], alerts: [] as { kind: string; title: string }[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const filters: ((r: Row) => boolean)[] = []
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        async maybeSingle() {
          const rows = table === 'clients' ? st.clients : []
          return { data: rows.find(r => filters.every(f => f(r))) ?? null, error: null }
        },
      }
      return q
    },
  },
}))
vi.mock('../lib/programme', async orig => ({
  ...(await orig<Record<string, unknown>>()),
  openProgrammeForClient: async () => st.programme,
  pauseProgramme: async (id: string, reason: string) => { st.paused.push({ id, reason }); return { ok: true } },
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (kind: string, title: string) => { st.alerts.push({ kind, title }); return { reached: true } },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

async function press() {
  const { myProgrammeRouter } = await import('./my-programme')
  const layer = (myProgrammeRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/pause' && l.route?.methods.post)
  if (!layer) throw new Error('POST /pause not found')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b; return res }, status: (s: number) => { status = s; return res } }
  await handler({ body: {}, params: {}, query: {}, headers: {}, userId: 'u1' }, res, () => {})
  return { status, payload }
}

beforeEach(() => {
  st.clients = [{ id: 'c1', user_id: 'u1', company_name: 'Acme', is_demo: false }]
  st.programme = { id: 'p1', client_id: 'c1', status: 'LIVE', paused_at: null }
  st.paused = []; st.alerts = []
})

describe('① the press pauses at once', () => {
  it('a real client: paused with reason "client", and the founder is paged — urgent, never deduplicated', async () => {
    const r = await press()
    expect(r.status).toBe(200)
    expect(st.paused).toEqual([{ id: 'p1', reason: 'client' }])
    expect(st.alerts).toHaveLength(1)
    expect(st.alerts[0].kind).toBe('support_escalation')
    expect(st.alerts[0].title).toBe('Pause requested — Acme')
    expect(readFileSync(join(process.cwd(), 'apps/api/src/lib/alerts.ts'), 'utf8'))
      .toContain("const NEVER_DEDUPED: ReadonlySet<AlertKind> = new Set<AlertKind>(['hot_reply', 'new_signup', 'support_escalation'])")
  })
  it('the demo pauses on its screen and pages nobody', async () => {
    st.clients[0].is_demo = true
    const r = await press()
    expect(r.status).toBe(200)
    expect(st.paused).toHaveLength(1)
    expect(st.alerts).toEqual([])
  })
  it('pressing again changes nothing and pages nobody again', async () => {
    st.programme = { ...st.programme!, paused_at: '2026-09-29T09:00:00Z' }
    const r = await press()
    expect((r.payload.data as Row).already).toBe(true)
    expect(st.paused).toEqual([])
    expect(st.alerts).toEqual([])
  })
  it('no running programme: a plain 404, nothing paused', async () => {
    st.programme = null
    const r = await press()
    expect(r.status).toBe(404)
    expect(st.paused).toEqual([])
  })
})

describe('② a client\'s pause is always a Needs-you', () => {
  const base = {
    programme: null, proofStarted: null, preparationStopped: false, preparing: false, humanBlockers: [],
    readinessReady: true, sends: 0, repliesAwaitingDecision: 0, senderSendable: true, killSwitchOff: true,
    operatorRunEnabled: true, remainingEntitlement: 0, hasNewerProgramme: false, repeatDismissed: false,
  }
  const prog = (over: Row) => ({ status: 'SOURCING', paused: false, approved: false, secondAuthorised: false, live: false, run: true, ...over })
  it('at Approval and approved-not-live, where an operator\'s own pause is not a task', async () => {
    const { deriveLifecycle } = await import('../lib/programme-lifecycle')
    const cases = [
      { status: 'READY_FOR_APPROVAL' },
      { status: 'APPROVED', approved: true, secondAuthorised: true },
    ]
    for (const c of cases) {
      expect(deriveLifecycle({ ...base, programme: prog({ ...c, paused: true, pausedByClient: true }) } as never).needsYou, c.status).toBe(true)
      expect(deriveLifecycle({ ...base, programme: prog({ ...c, paused: true }) } as never).needsYou, `${c.status} operator pause`).toBe(false)
    }
  })
  it('and while running', async () => {
    const { deriveLifecycle } = await import('../lib/programme-lifecycle')
    const v = deriveLifecycle({ ...base, sends: 3, programme: prog({ status: 'LIVE', approved: true, secondAuthorised: true, live: true, paused: true, pausedByClient: true }) } as never)
    expect(v.needsYou).toBe(true)
  })
  it('the fact is read from the row', () => {
    const facts = readFileSync(join(process.cwd(), 'apps/api/src/lib/programme-lifecycle-facts.ts'), 'utf8')
    expect(facts).toContain("pausedByClient: !!p.paused_at && p.pause_reason === 'client',")
    expect(facts).toContain("'id, client_id, status, paused_at, pause_reason, approved_at,")
  })
})

describe('③ the client is told why, in plain words', () => {
  it('one sentence per reason; no reason keeps the locked sentence unchanged', async () => {
    const { pausedCopyFor, MILLA_PAUSE_COPY, MILLA_FAILURE_COPY } = await import('@kind/shared')
    expect(pausedCopyFor('client')).toBe(MILLA_PAUSE_COPY.client)
    expect(pausedCopyFor('client')).toContain('as you asked')
    expect(pausedCopyFor('quality')).toContain('check quality')
    expect(pausedCopyFor('icp_change')).toContain('targeting')
    expect(pausedCopyFor(null)).toBe(MILLA_FAILURE_COPY.sourcingPaused)
    expect(MILLA_FAILURE_COPY.sourcingPaused).toBe('Sourcing is paused while we recover.')
    const cp = readFileSync(join(process.cwd(), 'apps/api/src/lib/customer-programme.ts'), 'utf8')
    // ⛓️ 2 Oct (#2561 · 14c): a reversed payment now says so first; every other pause is unchanged.
    expect(cp).toContain('(p.disputed_at ? MILLA_PAYMENT_REVERSED_COPY : pausedCopyFor(p.pause_reason as string | null))')
  })
})

describe('④ the button and the chip make the press', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  it('Results: "Pause sending" pauses (after a confirmation), and is gone once paused', () => {
    const out = read('apps/portal/src/components/milla/ProgrammeOutcome.tsx')
    expect(out).toContain('onClick={() => void pressPause()}')
    expect(out).toContain("if (pausing || !window.confirm(PAUSE_CONFIRM)) return")
    expect(out).toContain('{!p.paused && (')
    expect(out).not.toContain("onClick={() => ask('Please pause my programme')}")
  })
  it('the chat chip pauses too, and is not offered once paused', () => {
    const chat = read('apps/portal/src/components/milla/MillaConversation.tsx')
    expect(chat).toContain('if (c === PAUSE_CHIP && prog) { void pauseFromChip(); return }')
    expect(chat).toContain('PAUSE_STAGES.includes(prog.stage) && !prog.paused ? [PAUSE_CHIP] : []')
  })
  it('both go to the one press', () => {
    expect(read('apps/portal/src/lib/pause-programme.ts')).toContain("api.post('/my/programme/pause', {}, session?.access_token)")
  })
})
