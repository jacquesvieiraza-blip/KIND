import { describe, it, expect, vi, beforeEach } from 'vitest'

// ④ A SOURCING FAILURE MUST NOT READ AS "NOTHING TO DO".
//
// The client has just PAID. `runIcpJob` threw, the `.catch` returned null, the function
// carried on, and the caller received `{ started: true, sourced: 0 }` — identical to a client
// who was already stocked. The only trace was `console.error`.
//
// Not visible from any unit test of the parts: `runIcpJob` is fine, `sourceTarget` is fine.
// The defect was in what the caller was told afterwards.

const state = {
  purchases: 1,
  awaiting: 0,
  sourcingThrows: null as string | null,
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'limit']) q[m] = () => q
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'credit_transactions') return resolve({ count: state.purchases, error: null })
    if (table === 'leads') return resolve({ count: state.awaiting, data: [], error: null })
    return resolve({ data: [], count: 0, error: null })
  }
  q.maybeSingle = async () => {
    if (table === 'icps') return { data: { id: 'icp-1' }, error: null }
    if (table === 'clients') return { data: { user_id: 'user-1' }, error: null }
    return { data: null, error: null }
  }
  q.update = () => ({ in: () => ({ is: async () => ({ error: null }) }), then: (r: (v: unknown) => void) => r({ error: null }) })
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t) } }))
vi.mock('../routes/icps', () => ({
  runIcpJob: vi.fn(async () => {
    if (state.sourcingThrows) throw new Error(state.sourcingThrows)
    return { inserted: 200 }
  }),
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: vi.fn(async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
  }),
}))

import { startWorkForClient } from './start-work'

beforeEach(() => {
  state.purchases = 1
  state.awaiting = 0          // nothing waiting → sourceTarget wants a full batch
  state.sourcingThrows = null
  state.alerts.length = 0
})

describe('when sourcing fails for a client who has paid', () => {
  beforeEach(() => { state.sourcingThrows = 'PDL returned 500' })

  it('the founder is ALERTED — it was console.error only', async () => {
    await startWorkForClient('client-1')
    expect(state.alerts.length).toBeGreaterThan(0)
  })

  it('the alert says the client has PAID and their desk is not being filled', async () => {
    await startWorkForClient('client-1')
    const text = state.alerts.map(a => a.subject + ' ' + a.lines.join(' ')).join(' ')
    expect(text).toContain('paid')
    expect(text).toContain('PDL returned 500')
  })

  it('the alert warns that it otherwise reads as "nothing to do"', async () => {
    // The whole point: without this, every board shows a calm zero.
    await startWorkForClient('client-1')
    expect(state.alerts.map(a => a.lines.join(' ')).join(' ')).toContain('nothing to do')
  })

  it('the RESULT carries the error — sourced:0 alone can no longer be trusted', async () => {
    const r = await startWorkForClient('client-1')
    expect(r.sourcingError).toBe('PDL returned 500')
    expect(r.sourced).toBe(0)
  })
})

describe('when sourcing succeeds', () => {
  it('no alert, no error on the result', async () => {
    state.sourcingThrows = null
    const r = await startWorkForClient('client-1')
    expect(state.alerts).toHaveLength(0)
    expect(r.sourcingError).toBeUndefined()
    expect(r.sourced).toBe(200)
  })
})

describe('a genuinely stocked client is NOT an error', () => {
  it('nothing to source, nothing to alert about', async () => {
    // This is the case a failure used to be indistinguishable from.
    state.awaiting = 500
    state.sourcingThrows = 'should never run'
    const r = await startWorkForClient('client-1')
    expect(state.alerts).toHaveLength(0)
    expect(r.sourcingError).toBeUndefined()
  })
})

describe('the money gate still comes first', () => {
  it('an unpaid client sources nothing and raises nothing', async () => {
    state.purchases = 0
    const r = await startWorkForClient('client-1')
    expect(r.reason).toBe('not_paid')
    expect(state.alerts).toHaveLength(0)
  })
})
