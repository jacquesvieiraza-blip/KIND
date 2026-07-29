import { describe, it, expect, vi, beforeEach } from 'vitest'

// #571 — TWO SILENT CAPS IN SOURCING.
//
// Neither one errors, logs, or leaves an empty run to notice. Both simply deliver less than
// the client paid for and report success:
//
//   ① `.order('created_at', desc).limit(1)` — only the NEWEST active ICP was ever sourced.
//      A client with two live ICPs had one ignored FOREVER. They approved it, the board says
//      "never sourced", and nothing in the product ever explains why.
//   ② `.limit(1000)` inside `surfaceEverything` — a function whose entire contract is
//      "everyone". Past a thousand undecided leads the rest were never surfaced and never
//      delivered, and the caller reported the truncated number to the founder as "sent N".

const state = {
  purchases: 1,
  awaiting: 0,
  icps: [{ id: 'icp-1' }] as { id: string }[],
  /** every runIcpJob call, so the SPLIT can be asserted rather than assumed */
  runs: [] as { icpId: string; want: number }[],
  failFor: [] as string[],
  /** leads returned by the pager, page by page */
  leadPages: [] as { id: string }[][],
  rangeCalls: 0,
  updatedIds: [] as string[][],
  alerts: [] as { subject: string; lines: string[] }[],
}

function query(table: string) {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is', 'neq', 'not', 'order', 'limit']) q[m] = () => q
  q.then = (resolve: (v: unknown) => void) => {
    if (table === 'credit_transactions') return resolve({ count: state.purchases, error: null })
    if (table === 'icps') return resolve({ data: state.icps, error: null })
    if (table === 'leads') return resolve({ count: state.awaiting, data: [], error: null })
    return resolve({ data: [], count: 0, error: null })
  }
  // The pager: one page per call, then an empty one to end the walk.
  q.range = async () => {
    const page = state.leadPages[state.rangeCalls] ?? []
    state.rangeCalls++
    return { data: page, error: null }
  }
  q.maybeSingle = async () => {
    if (table === 'clients') return { data: { user_id: 'user-1' }, error: null }
    return { data: null, error: null }
  }
  q.update = () => ({
    in: (_c: string, ids: string[]) => {
      state.updatedIds.push(ids)
      return { is: async () => ({ error: null }), then: (r: (v: unknown) => void) => r({ error: null }) }
    },
  })
  return q
}

vi.mock('@kind/db', () => ({ db: { from: (t: string) => query(t) } }))
vi.mock('../routes/icps', () => ({
  runIcpJob: vi.fn(async (icpId: string, _c: string, _u: string, want: number) => {
    state.runs.push({ icpId, want })
    if (state.failFor.includes(icpId)) throw new Error(`boom for ${icpId}`)
    return { inserted: want }
  }),
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: vi.fn(async (_k: string, subject: string, lines: string[]) => {
    state.alerts.push({ subject, lines })
  }),
}))

import { startWorkForClient, surfaceEverything, splitSourceTarget } from './start-work'

beforeEach(() => {
  state.purchases = 1
  state.awaiting = 0
  state.icps = [{ id: 'icp-1' }]
  state.runs = []
  state.failFor = []
  state.leadPages = []
  state.rangeCalls = 0
  state.updatedIds = []
  state.alerts = []
})

describe('① every active ICP is sourced, not just the newest', () => {
  it('TWO ACTIVE ICPs BOTH GET SOURCED — the defect, directly', async () => {
    state.icps = [{ id: 'icp-new' }, { id: 'icp-old' }]
    await startWorkForClient('client-1')
    expect(state.runs.map(r => r.icpId).sort()).toEqual(['icp-new', 'icp-old'])
  })

  it('the target is SPLIT between them, not doubled', async () => {
    // Running the full 200 against each would source 400 and spend twice the allowance.
    state.icps = [{ id: 'a' }, { id: 'b' }]
    await startWorkForClient('client-1')
    expect(state.runs.reduce((s, r) => s + r.want, 0)).toBe(200)
    expect(state.runs.map(r => r.want)).toEqual([100, 100])
  })

  it('a single ICP still gets the whole target — nothing changes for most clients', async () => {
    await startWorkForClient('client-1')
    expect(state.runs).toEqual([{ icpId: 'icp-1', want: 200 }])
  })

  it('three ICPs split with the remainder going to the newest first', async () => {
    state.icps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    await startWorkForClient('client-1')
    expect(state.runs.map(r => r.want)).toEqual([67, 67, 66])
  })

  it('no active ICP is still no_icp', async () => {
    state.icps = []
    expect((await startWorkForClient('client-1')).reason).toBe('no_icp')
    expect(state.runs).toHaveLength(0)
  })

  it('ONE ICP FAILING STILL ALERTS even though the other succeeded', async () => {
    // The dangerous shape: a partial delivery looks like a normal slightly-small one.
    state.icps = [{ id: 'good' }, { id: 'bad' }]
    state.failFor = ['bad']
    const r = await startWorkForClient('client-1')
    expect(r.sourcingError).toContain('bad')
    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].lines.join(' ')).toContain('DID land')
  })

  it('the good ICP\'s leads are still counted when the other fails', async () => {
    state.icps = [{ id: 'good' }, { id: 'bad' }]
    state.failFor = ['bad']
    expect((await startWorkForClient('client-1')).sourced).toBe(100)
  })

  it('runs are SEQUENTIAL — they share one pre-funded allowance', async () => {
    // Promise.all would race try_spend_sourcing: two runs each reading "enough left".
    state.icps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    await startWorkForClient('client-1')
    expect(state.runs.map(r => r.icpId)).toEqual(['a', 'b', 'c'])
  })
})

describe('the split arithmetic itself', () => {
  it('divides evenly and hands the remainder to the front of the list', () => {
    expect(splitSourceTarget(200, 2)).toEqual([100, 100])
    expect(splitSourceTarget(10, 3)).toEqual([4, 3, 3])
  })

  it('never asks for more in total than the target', () => {
    for (const [want, n] of [[200, 1], [200, 7], [5, 4], [1, 3], [0, 2]] as const) {
      expect(splitSourceTarget(want, n).reduce((a, b) => a + b, 0), `${want}/${n}`).toBe(want)
    }
  })

  it('gives zero shares when there are more ICPs than leads — skipped, not empty runs', async () => {
    expect(splitSourceTarget(2, 5)).toEqual([1, 1, 0, 0, 0])
    state.icps = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    state.awaiting = 198          // sourceTarget → 2
    await startWorkForClient('client-1')
    expect(state.runs.map(r => r.icpId)).toEqual(['a', 'b'])   // 'c' never ran
  })

  it('handles a zero target and a zero ICP count without inventing work', () => {
    expect(splitSourceTarget(0, 3)).toEqual([0, 0, 0])
    expect(splitSourceTarget(100, 0)).toEqual([])
  })
})

describe('② surfacing is paged, so >1000 leads are not truncated', () => {
  const leads = (n: number, offset = 0) =>
    Array.from({ length: n }, (_, i) => ({ id: `lead-${offset + i}` }))

  it('SURFACES MORE THAN 1000 — the cap this removes', async () => {
    // 1000 was a hard ceiling inside a function contracted to surface "everyone".
    state.leadPages = [leads(1000), leads(500, 1000)]
    const r = await surfaceEverything('client-1')
    expect(r.surfaced).toBe(1500)
  })

  it('walks pages until one comes back short', async () => {
    state.leadPages = [leads(1000), leads(1000, 1000), leads(7, 2000)]
    expect((await surfaceEverything('client-1')).surfaced).toBe(2007)
  })

  it('EVERY id is written, not just the first page', async () => {
    // Reporting 1500 while only updating 1000 would be the same lie in a new place.
    state.leadPages = [leads(1000), leads(500, 1000)]
    await surfaceEverything('client-1')
    expect(state.updatedIds[0]).toHaveLength(1500)
  })

  it('a client under the page size behaves exactly as before', async () => {
    state.leadPages = [leads(12)]
    const r = await surfaceEverything('client-1')
    expect(r.surfaced).toBe(12)
    expect(r.recommended).toBe(12)
  })

  it('nothing to surface is still a clean zero', async () => {
    state.leadPages = [[]]
    expect(await surfaceEverything('client-1')).toEqual({ surfaced: 0, recommended: 0 })
    expect(state.alerts).toHaveLength(0)
  })

  it('the top-20 recommendation caps at 20 however many are surfaced', async () => {
    state.leadPages = [leads(1000), leads(500, 1000)]
    expect((await surfaceEverything('client-1')).recommended).toBe(20)
  })
})

describe('a read failure is not "nothing to surface"', () => {
  it('ALERTS instead of returning a calm zero', async () => {
    // pageRows THROWS where the old .limit() read swallowed the error into an undefined and
    // returned {0,0} — indistinguishable from an already-stocked client.
    state.leadPages = []
    const q = query
    void q
    const { db } = await import('@kind/db') as unknown as { db: { from: (t: string) => Record<string, unknown> } }
    const original = db.from
    db.from = (t: string) => {
      const built = query(t) as Record<string, unknown>
      if (t === 'leads') built.range = async () => { throw new Error('connection reset') }
      return built
    }
    const r = await surfaceEverything('client-1')
    db.from = original
    expect(r).toEqual({ surfaced: 0, recommended: 0 })
    expect(state.alerts).toHaveLength(1)
    expect(state.alerts[0].lines.join(' ')).toContain('connection reset')
    expect(state.alerts[0].lines.join(' ')).toContain('already stocked')
  })
})
