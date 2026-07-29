import { describe, it, expect, vi, beforeEach } from 'vitest'

// #349 (tail) — THE UNSUBSCRIBE THAT DIDN'T UNSUBSCRIBE.
//
// `recordUnsubscribe` is the whole opt-out mechanism: the RFC 8058 one-click POST that
// Gmail and Yahoo fire, and the visible footer link. All three of its writes ran on a bare
// `await` that discarded the returned error — so if the blocklist upsert failed, the route
// still answered "You have been unsubscribed", and the next send run saw nothing to stop it.
//
// That is not a cosmetic gap. Someone used the mechanism the law requires us to honour, we
// told them it worked, and we kept emailing them. There is no retry: they will not click
// unsubscribe a second time on an email they believe they already stopped.
//
// The blocklist row is what actually halts the sending (every send re-checks that table), so
// its failure ALERTS and names the address — an alert that says "an unsubscribe failed" with
// no address cannot be acted on, which is the difference between a page and a fix.

const state = {
  blocklistError: null as { message: string } | null,
  leadUpdateError: null as { message: string } | null,
  enrollmentError: null as { message: string } | null,
  /** lead rows matching the address — enrollments are only touched when this is non-empty */
  leadRows: [{ id: 'lead-1' }] as { id: string }[],
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
  writes: [] as { table: string; patch: Record<string, unknown> }[],
}

function query(table: string) {
  const errFor = () =>
    table === 'opt_out_blocklist' ? state.blocklistError
    : table === 'leads' ? state.leadUpdateError
    : table === 'figsy_enrollments' ? state.enrollmentError
    : null

  const write = (patch: Record<string, unknown>) => {
    state.writes.push({ table, patch })
    const err = errFor()
    const chain: Record<string, unknown> = {
      eq() { return chain }, in() { return chain }, is() { return chain },
      then(resolve: (v: unknown) => unknown) { return resolve({ data: null, error: err }) },
    }
    return chain
  }

  const q: Record<string, unknown> = {
    select() { return q },
    eq() { return q }, in() { return q }, is() { return q }, limit() { return q },
    insert(row: Record<string, unknown>) { return write(row) },
    update(patch: Record<string, unknown>) { return write(patch) },
    upsert(row: Record<string, unknown>) { return write(row) },
    async maybeSingle() { return { data: null, error: null } },
    async single() { return { data: null, error: null } },
    then(resolve: (v: { data: unknown; error: null }) => unknown) {
      if (table === 'leads') return resolve({ data: state.leadRows, error: null })
      return resolve({ data: [], error: null })
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }) },
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
  },
}))
vi.mock('../lib/deliverability', async (orig) => ({
  // Partial: the rest of the module is real (lib/figsy reads COLD_REPLY_TO at import time).
  // The token is not what this file is about — every valid request carries the same address.
  ...(await orig() as Record<string, unknown>),
  verifyUnsubscribeToken: (t: string) => (t === 'good' ? 'Thandi@Rivo.co ' : null),
}))
vi.mock('../lib/outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, next: () => void) => next() }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}))

async function unsubscribe(method: 'post' | 'get', token = 'good') {
  const { figsyRouter } = await import('./figsy')
  const layer = (figsyRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/unsubscribe/:token' && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} /unsubscribe/:token not found on the figsy router`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: { code: number; body: string } = { code: 200, body: '' }
  const fakeRes = {
    status(c: number) { res.code = c; return fakeRes },
    type() { return fakeRes },
    send(b: string) { res.body = String(b); return fakeRes },
  }
  await handler({ params: { token }, headers: {}, body: {}, query: {}, ip: '1.2.3.4' }, fakeRes, () => {})
  return res
}

const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  state.blocklistError = null
  state.leadUpdateError = null
  state.enrollmentError = null
  state.leadRows = [{ id: 'lead-1' }]
  state.alerts = []
  state.writes = []
})

describe('the blocklist write is the one that actually stops the sending', () => {
  it('ALERTS when it fails — it does not pass silently', async () => {
    state.blocklistError = { message: 'permission denied for table opt_out_blocklist' }
    await unsubscribe('post')
    await settle()
    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].kind).toBe('sends_stalled')
  })

  it('NAMES THE ADDRESS — an alert without it cannot be acted on', async () => {
    // The fix is adding them to opt_out_blocklist by hand. Without the address in the alert
    // there is nothing to add, and the founder is paged about a problem they cannot close.
    state.blocklistError = { message: 'boom' }
    await unsubscribe('post')
    await settle()
    expect(state.alerts[0].lines.join(' ')).toContain('thandi@rivo.co')
  })

  it('normalises the address before recording it, so the send path matches on it', async () => {
    // The token carries whatever casing and whitespace the header had. The blocklist is
    // matched exactly, so "Thandi@Rivo.co " and "thandi@rivo.co" must not be two people.
    await unsubscribe('post')
    expect(state.writes[0]).toEqual({
      table: 'opt_out_blocklist',
      patch: { email: 'thandi@rivo.co', reason: 'list_unsubscribe' },
    })
  })

  it('says why it matters — that we may keep emailing them', async () => {
    state.blocklistError = { message: 'boom' }
    await unsubscribe('post')
    await settle()
    expect(state.alerts[0].subject.toLowerCase()).toContain('keep emailing them')
    expect(state.alerts[0].lines.join(' ')).toContain('boom')
  })

  it('the GET (footer link) is the same path — it alerts too', async () => {
    // Two doors, one function. A fix on only the one-click POST would leave every recipient
    // who clicks the visible link unprotected.
    state.blocklistError = { message: 'boom' }
    await unsubscribe('get')
    await settle()
    expect(state.alerts).toHaveLength(1)
  })
})

describe('the other two writes are checked at their own weight', () => {
  it('live enrollments left behind ALERT — they will keep being processed', async () => {
    state.enrollmentError = { message: 'deadlock detected' }
    await unsubscribe('post')
    await settle()
    expect(state.alerts).toHaveLength(1)
    const body = state.alerts[0].lines.join(' ')
    expect(body).toContain('thandi@rivo.co')
    expect(body).toContain('still read as live')
  })

  it('a failed lead-status write does NOT alert — the blocklist already stopped the sending', async () => {
    // Alerting on every one of the three would train the founder to ignore all three. This
    // one is product state, not suppression: the send path never reads leads.status to decide
    // whether to send.
    state.leadUpdateError = { message: 'boom' }
    await unsubscribe('post')
    await settle()
    expect(state.alerts).toHaveLength(0)
  })

  it('no lead rows means no enrollment write is attempted at all', async () => {
    // `.in('lead_id', [])` would match nothing anyway, but issuing it makes an empty result
    // indistinguishable from a failed one.
    state.leadRows = []
    await unsubscribe('post')
    expect(state.writes.some(w => w.table === 'figsy_enrollments')).toBe(false)
  })
})

describe('the recipient is never told it failed', () => {
  it('still answers 200 — a retry loop from Gmail helps nobody, and the founder has been paged', async () => {
    state.blocklistError = { message: 'boom' }
    const res = await unsubscribe('post')
    expect(res.code).toBe(200)
  })

  it('an invalid token is refused before anything is written', async () => {
    const res = await unsubscribe('post', 'forged')
    expect(res.code).toBe(400)
    expect(state.writes).toHaveLength(0)
  })
})

describe('the ordinary path is untouched', () => {
  it('all three writes land and nothing is raised', async () => {
    await unsubscribe('post')
    await settle()
    expect(state.alerts).toHaveLength(0)
    expect(state.writes.map(w => w.table)).toEqual(['opt_out_blocklist', 'leads', 'figsy_enrollments'])
  })
})
