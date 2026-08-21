import { describe, it, expect, vi, beforeEach } from 'vitest'

// P33 v3 — the DELIVERY half. The pure rules live in morning-brief.test.ts; what
// is proved here is everything that only exists once a database is involved:
// the one-per-day guarantee, the concurrent race the founder asked about by name,
// tenant isolation, and the rail that stops a greeting breaking the page.

const state: {
  existing: { id: string } | null
  pendingCount: number | { error: string }
  meetingsCount: number | { error: string }
  sessions: { id: string }[]
  dailyBriefEnabled: boolean | null
  inserts: Record<string, unknown>[]
  insertError: { code?: string; message: string } | null
  seenClientFilters: string[]
} = {
  existing: null, pendingCount: 0, meetingsCount: 0, sessions: [{ id: 'sess-1' }],
  dailyBriefEnabled: null, inserts: [], insertError: null, seenClientFilters: [],
}

// A deliberately small fake: it records the client_id every query filters on, so
// tenant isolation can be asserted as a FACT about the queries rather than hoped for.
vi.mock('@kind/db', () => {
  const make = (table: string) => {
    // A chainable builder that is ALSO a thenable: the real code does
    // `await db.from(t).select(..., {head:true}).eq(...).not(...)...`, so every
    // filter has to return something still awaitable. An earlier version of this
    // fake returned the plain builder from the filters, so `await` yielded the
    // builder itself and every count read as undefined -> 0. The test went green
    // on a lie until the assertions caught it.
    let result: unknown = { data: null, error: null }
    const q: Record<string, unknown> = {}
    const self = () => q as never
    Object.assign(q, {
      select: (_c?: string, opts?: { head?: boolean; count?: string }) => {
        if (opts?.head) {
          const v = table === 'leads' ? state.pendingCount : state.meetingsCount
          result = typeof v === 'number'
            ? { count: v, error: null }
            : { count: null, error: { message: v.error } }
        }
        return self()
      },
      eq: (col: string, val: unknown) => {
        if (col === 'client_id') state.seenClientFilters.push(String(val))
        return self()
      },
      neq: self, not: self, is: self, gte: self, order: self,
      limit: () => {
        if (table === 'milla_sessions') result = { data: state.sessions, error: null }
        return self()
      },
      maybeSingle: () => Promise.resolve(
        table === 'clients'
          ? { data: state.dailyBriefEnabled === null ? {} : { daily_brief_enabled: state.dailyBriefEnabled }, error: null }
          : { data: state.existing, error: null },
      ),
      single: () => Promise.resolve({ data: { id: 'sess-new' }, error: null }),
      insert: (row: Record<string, unknown>) => {
        if (table === 'milla_messages') {
          if (state.insertError) return Promise.resolve({ error: state.insertError })
          state.inserts.push(row)
          return Promise.resolve({ error: null })
        }
        return {
          select: () => ({ single: () => Promise.resolve({ data: { id: 'sess-new' }, error: null }) }),
        }
      },
      // The thenable tail — this is what makes the filter chain awaitable.
      then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject),
    })
    return q
  }
  return { db: { from: (t: string) => make(t) } }
})

const { ensureTodaysBrief } = await import('./morning-brief-deliver')

beforeEach(() => {
  state.existing = null
  state.pendingCount = 0
  state.meetingsCount = 0
  state.sessions = [{ id: 'sess-1' }]
  state.dailyBriefEnabled = null
  state.inserts = []
  state.insertError = null
  state.seenClientFilters = []
})

describe('one brief per client per London day', () => {
  it('creates the day\'s brief when there is none', async () => {
    state.pendingCount = 12
    state.meetingsCount = 2
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('created')
    expect(state.inserts).toHaveLength(1)
    expect(state.inserts[0].content).toBe(
      'Morning. 12 prospects are waiting for your review · 2 meetings booked this week.')
    expect(state.inserts[0].role).toBe('assistant')
    expect(state.inserts[0].sources).toEqual({ kind: 'morning_brief', day: '2026-08-24' })
  })

  it('a SECOND login the same day writes nothing — the same brief stands', async () => {
    state.existing = { id: 'brief-1' }
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T14:00:00Z'))
    expect(r.status).toBe('exists')
    expect(state.inserts).toHaveLength(0)
  })

  it('TWO CONCURRENT FIRST LOGINS produce one brief, not twins', async () => {
    // The founder asked for this case by name. Both callers pass the "does it
    // exist?" probe — that is what concurrency MEANS — so the guarantee has to
    // come from the unique index. Here the loser's insert returns 23505 and must
    // be read as success, because the winner's brief is already in the thread.
    state.insertError = { code: '23505', message: 'duplicate key value violates unique constraint' }
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('exists')          // NOT 'failed' — the race was settled correctly
    expect(state.inserts).toHaveLength(0)
  })

  it('a real insert failure is NOT disguised as success', async () => {
    // The 23505 branch must stay narrow. Any other error is a genuine failure and
    // reporting it as "exists" would hide a brief that never landed.
    state.insertError = { code: '42703', message: 'column does not exist' }
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('failed')
  })
})

describe('#136a — an unmeasurable number never renders as zero', () => {
  it('a failed pending count writes NO brief', async () => {
    state.pendingCount = { error: 'timeout' }
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('failed')
    expect(state.inserts).toHaveLength(0)
  })

  it('a failed meetings count writes NO brief', async () => {
    state.meetingsCount = { error: 'timeout' }
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('failed')
    expect(state.inserts).toHaveLength(0)
  })

  it('a genuine zero DOES render — as the honest quiet state', async () => {
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('created')
    expect(String(state.inserts[0].content)).toContain('Quiet night')
  })
})

describe('tenant isolation', () => {
  it('every query is filtered on the SAME client id — Client A can never see B', async () => {
    state.pendingCount = 5
    await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(state.seenClientFilters.length).toBeGreaterThanOrEqual(3)   // clients, leads, bookings
    expect(new Set(state.seenClientFilters)).toEqual(new Set(['client-a']))
    expect(state.inserts[0].client_id).toBe('client-a')
  })
})

describe('the rails', () => {
  it('respects the client\'s existing daily-brief opt-out', async () => {
    // The email brief already honours clients.daily_brief_enabled (#27/R2). An
    // in-app brief that ignored it would be the same nag through a side door.
    state.dailyBriefEnabled = false
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r).toEqual({ status: 'skipped', reason: 'opted_out' })
    expect(state.inserts).toHaveLength(0)
  })

  it('creates a session for a brand-new client — day one still gets a brief', async () => {
    // Founder-ruled: "yes send on day 1". A client who has never typed has no
    // session, and without this they would get nothing until they started talking.
    state.sessions = []
    const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
    expect(r.status).toBe('created')
    expect(state.inserts[0].session_id).toBe('sess-new')
  })

  it('NEVER THROWS — a greeting must not be why a client cannot reach their leads', async () => {
    const { db } = await import('@kind/db') as unknown as { db: { from: unknown } }
    const original = db.from
    ;(db as { from: unknown }).from = () => { throw new Error('database is gone') }
    try {
      const r = await ensureTodaysBrief('client-a', new Date('2026-08-24T08:00:00Z'))
      expect(r.status).toBe('failed')          // a value, never an exception
    } finally {
      ;(db as { from: unknown }).from = original
    }
  })
})
