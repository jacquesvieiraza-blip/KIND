// ═══════════════════════════════════════════════════════════════════════════════════════
// POST /icps/revise — THE SAME REQUEST TWICE, AND WHAT THE CLIENT IS TOLD CHANGED (C01).
//
// ── WHY THIS FILE EXISTS ────────────────────────────────────────────────────────────────
//
// C01 gives Milla ONE automatic retry when a targeting save gets no answer — a 15s abort, a
// dropped connection, a backgrounded tab. "No answer" is not "no write": the first request
// can commit and lose only its response. So the retry and this route's repeat check are one
// change, and this file is the half that proves the dangerous direction.
//
// Without the repeat check, one client press could produce:
//   · TWO ICP versions (the insert branch), which the My ICP screen shows as two and which
//     `runIcpJob` hangs a pass-2 batch off one of;
//   · a re-stamped `pending_submitted_at`, moving the review clock on a revision that was
//     already waiting;
//   · a SECOND founder alert for one change.
//
// ⚠️ BEHAVIOURAL, THROUGH THE REAL EXPRESS HANDLER. A source assertion cannot tell one write
// from two, and "how many writes" is the entire question here. What is asserted is the
// literal `.update()`/`.insert()` traffic the route produced and the payload it answered.
//
// ⚠️ AND THE HARNESS LETS WRITES LAND. An insert that does not become the client's ICP, or
// an update that does not move the row, makes every "it did not do it twice" assertion pass
// for free — which is exactly how a missing guard stays green.
//
// Mocks only. No provider, no database, no network, no alert leaves the process.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

type Row = Record<string, unknown>

const state = {
  /** The client's one ICP, or null for a client who has none yet. */
  icp: null as Row | null,
  /** clients.proof_passes_done — 1 is the only value the apply exception exists at. */
  passes: 0 as number,
  updates: [] as Row[],
  inserts: [] as Row[],
  /** Every founder alert the route fired. One change must never produce two. */
  alerts: [] as string[],
}

const CORE_COLS = 'id, name, is_active, pending_targeting, pending_campaign_intent, industries, geographies, job_titles, seniority_levels, company_sizes, tech_stack, keywords'

function query(table: string) {
  let cols = ''
  const q: Record<string, unknown> = {
    select(c?: string) { cols = c ?? ''; return q },
    eq() { return q }, in() { return q }, is() { return q }, neq() { return q },
    not() { return q }, order() { return q }, limit() { return q },
    async maybeSingle() {
      if (table === 'clients') return { data: { id: 'c1', proof_passes_done: state.passes, company_name: 'Acme', credit_balance: 0 }, error: null }
      // A SNAPSHOT, like a real read: the caller holds these values.
      if (table === 'icps') return { data: state.icp ? { ...state.icp } : null, error: null }
      return { data: null, error: null }
    },
    async single() {
      if (table === 'clients') return { data: { credit_balance: 0 }, error: null }
      return { data: state.icp, error: null }
    },
    update(patch: Row) {
      const conds: Array<[string, unknown]> = []
      const finish = () => {
        const row = state.icp
        const matches = !!row && conds.every(([col, val]) => {
          if (col === 'client_id') return true
          if (col === 'pending_targeting' && val === null) return (row[col] ?? null) === null
          return row[col] === val
        })
        if (!matches) return { data: null, error: null }
        state.updates.push(patch)
        // ⚠️ THE WRITE LANDS. A harness that returned a merged object and left the row alone
        // would make the second request look identical to the first from the route's side.
        state.icp = { ...row, ...patch }
        return { data: state.icp, error: null }
      }
      const chain: Record<string, unknown> = {
        eq(col: string, val: unknown) { conds.push([col, val]); return chain },
        is(col: string, val: unknown) { conds.push([col, val]); return chain },
        select() { return chain },
        async single() { return finish() },
        async maybeSingle() { return finish() },
        then(r: (v: unknown) => unknown) { return r(finish()) },
      }
      return chain
    },
    insert(row: Row) {
      const created = { id: `icp-${state.inserts.length + 1}`, is_active: true, ...row }
      if (table === 'icps') {
        state.inserts.push(row)
        // 🛑 THE INSERTED ROW BECOMES THE CLIENT'S ICP. This is the line that makes the
        // duplicate-version test real: without it the second request reads `null` again and
        // inserting twice is the only thing it could do, guard or no guard.
        state.icp = created
      }
      const done = { data: created, error: null }
      const chain: Record<string, unknown> = {
        select() { return chain },
        async single() { return done },
        async maybeSingle() { return done },
        then(r: (v: unknown) => unknown) { return r(done) },
      }
      return chain
    },
    then(resolve: (v: { data: Row[]; error: null }) => unknown) {
      return resolve({ data: [], error: null })
    },
  }
  // `cols` is read by nothing here; kept so the select shape matches the real chain.
  void CORE_COLS; void cols
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (t: string) => query(t), rpc: async () => ({ data: null, error: null }),
        auth: { admin: { getUserById: async () => ({ data: { user: { email: '' } } }) } } },
}))
vi.mock('../lib/start-work', async (orig) => ({
  ...(await orig() as Row), ensureCampaignForIcp: async () => undefined,
}))
vi.mock('../lib/alerts', () => ({
  sendFounderAlert: async (_kind: string, subject: string) => { state.alerts.push(subject) },
}))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class FakeAnthropic { messages = { create: async () => ({ content: [] }) } },
}))

const TARGETING = (over: Row = {}) => ({
  name: 'My targeting',
  industries: ['Consulting'], job_titles: ['Founder/CEO'], seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'], geographies: ['United Kingdom'],
  tech_stack: [], keywords: [],
  ...over,
})

async function callRevise(body: Row) {
  const { icpRouter } = await import('./icps')
  const layer = (icpRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> })
    .stack.find(l => l.route?.path === '/revise' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /revise not found on the icp router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { code: number; payload: Row } = { code: 200, payload: {} }
  const res = { status(c: number) { out.code = c; return res }, json(p: Row) { out.payload = p; return res } }
  await handler({ body, headers: {}, params: {}, query: {}, userId: 'u1' }, res, () => {})
  return out
}

/** The live (already-saved) targeting of a client whose ICP is NOT active — the apply path. */
const LIVE = (over: Row = {}) => ({
  id: 'icp-1', name: 'My targeting', is_active: false, pending_targeting: null,
  industries: ['Consulting'], job_titles: ['Founder/CEO'], seniority_levels: ['C-Suite'],
  company_sizes: ['11–50'], geographies: ['United Kingdom'], tech_stack: [], keywords: [],
  ...over,
})

beforeEach(() => {
  state.icp = null; state.passes = 0
  state.updates = []; state.inserts = []; state.alerts = []
})

describe('🛑 ① one press, one write — however many times it arrives', () => {
  it('a client with NO ICP who is retried gets ONE version, not two', async () => {
    const first = await callRevise(TARGETING())
    const second = await callRevise(TARGETING())
    // 🛑 THE DUPLICATE-VERSION DEFECT, in the only place it could happen.
    expect(state.inserts, 'the retry minted a second ICP version').toHaveLength(1)
    expect(first.code).toBe(201)
    expect(second.code).toBe(200)
    expect(second.payload.wrote, 'the repeat claims it wrote').toBe(false)
    expect(second.payload.change, 'the repeat narrates a change').toBeNull()
  })

  it('…and fires ONE founder alert, not one per attempt', async () => {
    await callRevise(TARGETING())
    await callRevise(TARGETING())
    expect(state.alerts, 'one change told us twice').toHaveLength(1)
  })

  it('a LIVE client\'s repeat does not re-stamp the waiting revision', async () => {
    state.icp = LIVE({ is_active: true })
    const first = await callRevise(TARGETING({ industries: ['Digital Marketing'] }))
    expect(first.payload.pending_review, 'a live client\'s edit must be parked').toBe(true)
    const stampedAt = state.updates[0]!.pending_submitted_at
    expect(stampedAt).toBeTruthy()

    state.updates = []
    const again = await callRevise(TARGETING({ industries: ['Digital Marketing'] }))
    // 🛑 NOTHING WRITTEN. A second stamp would move a review clock the client cannot see.
    expect(state.updates, 'the repeat re-parked the same revision').toHaveLength(0)
    expect(again.code).toBe(200)
    expect(again.payload.wrote).toBe(false)
    // It is still honest about the state they are in: a revision IS waiting.
    expect(again.payload.pending_review).toBe(true)
  })

  it('🛑 a genuinely DIFFERENT second edit is not swallowed as a repeat', async () => {
    // The guard must not become "the second edit never lands", which would be a far worse
    // defect than the one it fixes: a client could change nothing after their first save.
    state.icp = LIVE({ is_active: true })
    await callRevise(TARGETING({ industries: ['Digital Marketing'] }))
    state.updates = []
    const r = await callRevise(TARGETING({ industries: ['Fintech'] }))
    expect(state.updates, 'the second real edit was dropped').toHaveLength(1)
    expect(r.payload.wrote).toBe(true)
    expect((state.updates[0]!.pending_targeting as Row).industries).toEqual(['Fintech'])
  })

  it('a repeat carrying a NEW brief is not a repeat', async () => {
    // The targeting matching is not permission to drop the words they sent with it.
    state.icp = LIVE({ is_active: true })
    await callRevise({ ...TARGETING({ industries: ['Digital Marketing'] }), campaign_intent: 'book demos' })
    state.updates = []
    await callRevise({ ...TARGETING({ industries: ['Digital Marketing'] }), campaign_intent: 'book audits instead' })
    expect(state.updates, 'the revised brief was dropped as a duplicate').toHaveLength(1)
    expect(state.updates[0]!.pending_campaign_intent).toBe('book audits instead')
  })

  it('asking for exactly what is already live writes nothing and says so', async () => {
    state.icp = LIVE()                          // inactive → the ordinary apply path
    const r = await callRevise(TARGETING())     // byte-identical to the live columns
    expect(state.updates, 'it rewrote identical values').toHaveLength(0)
    expect(state.inserts).toHaveLength(0)
    expect(r.payload.wrote).toBe(false)
    expect(r.payload.change).toBeNull()
  })
})

describe('🛑 ② the client is told what actually moved', () => {
  it('the founder\'s own sentence, from the two states the SERVER observed', async () => {
    state.icp = LIVE()
    const r = await callRevise(TARGETING({ industries: ['Digital Marketing'] }))
    expect(r.code).toBe(201)
    expect(r.payload.wrote).toBe(true)
    expect((r.payload.change as Row).sentence).toBe(
      'I’ve changed the industry from Consulting to Digital Marketing and kept the United Kingdom, Founder/CEO, C-Suite and 11–50 employees filters.')
  })

  it('🛑 a PARKED revision is described as asked for, never as done', async () => {
    // The transcript said "this is your live targeting now" on this path, which is the
    // opposite of what AR9's 22-Aug lock makes happen.
    state.icp = LIVE({ is_active: true })
    const r = await callRevise(TARGETING({ industries: ['Digital Marketing'] }))
    expect(r.payload.pending_review).toBe(true)
    const s = String((r.payload.change as Row).sentence)
    expect(s).toContain('You’ve asked me to change the industry from Consulting to Digital Marketing')
    expect(s, 'a parked change is claimed as applied').not.toContain('I’ve changed')
  })

  it('the diff is taken BEFORE the write, so it can still see the old values', async () => {
    // Computed after the update, "before" and "after" are the same row and every revision
    // would be described as changing nothing.
    state.icp = LIVE()
    const r = await callRevise(TARGETING({ industries: ['Digital Marketing'] }))
    expect((r.payload.change as Row).unchanged).toBe(false)
    expect(String((r.payload.change as Row).sentence)).toContain('from Consulting to')
  })

  it('a dropped filter is named, not glossed', async () => {
    state.icp = LIVE()
    const r = await callRevise(TARGETING({ geographies: [] }))
    expect(String((r.payload.change as Row).sentence))
      .toContain('removed the country filter of United Kingdom')
  })

  it('no change is narrated when none happened — even on a write path', async () => {
    // A reorder is not a change the client asked for.
    state.icp = LIVE()
    const r = await callRevise(TARGETING({ job_titles: ['Founder/CEO'], industries: ['Consulting'] }))
    expect(r.payload.change).toBeNull()
    expect(r.payload.wrote).toBe(false)
  })
})
