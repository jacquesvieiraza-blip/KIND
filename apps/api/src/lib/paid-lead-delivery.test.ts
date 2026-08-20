import { describe, it, expect, vi, beforeEach } from 'vitest'

// #568 ②, ③ and ④ — THREE PATHS WHERE "PAID, NOTHING DELIVERED" WAS SILENT.
//
// Both fixes are on main and neither had a test. ① (the email write) is pinned by
// `approve-lead.pack-boundary.test.ts`; these are the other two.
//
// ② `approve-lead.ts` — `autoEnrollLead(...).catch(() => {})`. A failed enrol produces the
//    EXACT outcome the `no_campaign` gate fails closed to prevent — money taken, nothing ever
//    sent — but silently, going around the gate that looks like the protection. The lead stays
//    approved on purpose (un-revealing would lose the contact they paid for), so the alert is
//    the only thing that makes it recoverable.
//
// ③ `start-work.ts` — the `surfaced_for_approval_at` / `delivered_at` pair. `/for-approval`
//    requires `delivered_at`, so a failed write left the leads INVISIBLE to the client while
//    the function still returned `surfaced: ids.length` and the operator's alert read
//    "sent 200 to them". A delivery reported but not made.
//
// ④ `approve-lead.ts:81` — the #424 CHARGE-ONCE free re-approve, added 29 Jul. It returns
//    `charged: false`, which is why it read as harmless for so long — but `reveal_is_owned` is
//    true precisely BECAUSE this client already paid for this contact. The money moved on an
//    earlier approval; the re-approve buys the WORK. Swallowed, they have paid and the lead
//    enters no sequence. With ② guarded and ④ silent, the failure simply moved to whichever
//    door the client came through.
//
//    `approve-lead.ts:69` (demo) stays swallowed DELIBERATELY: nobody paid, `is_demo` is a hard
//    stop in the send path, and every demo address is `.invalid`. Alerting there would train
//    the founder to ignore the alert that means a real client is stuck.
//
// The rule all three pin: when money has already moved and the work did not happen, somebody is
// told, and no success figure is reported.

const state = {
  enrolThrows: null as Error | null,
  surfaceError: null as { message: string } | null,
  deliveredError: null as { message: string } | null,
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
  /** which columns each leads-update touched, so ③ can tell the two writes apart */
  leadUpdates: [] as string[],
  purchaseCount: 1,
  approvedCount: 1,
  /** what the pager hands surfaceEverything — the leads on the desk */
  pagedIds: ['l1', 'l2', 'l3'] as string[],
  /** false → the paid path (step 8); true → the #424 charge-once re-approve (step 3b) */
  revealIsOwned: false,
}

function makeQuery(table: string) {
  const q: Record<string, unknown> = {
    _count: false, _update: null as Record<string, unknown> | null,
    select(_c?: string, opts?: { count?: string; head?: boolean }) { (q as { _count: boolean })._count = !!opts?.count; return q },
    eq() { return q }, neq() { return q }, is() { return q }, in() { return q }, not() { return q },
    order() { return q }, limit() { return q }, or() { return q },
    update(row: Record<string, unknown>) {
      (q as { _update: Record<string, unknown> | null })._update = row
      if (table === 'leads') state.leadUpdates.push(Object.keys(row).join(','))
      return q
    },
    insert() { return { then: (r: (v: unknown) => unknown) => r({ error: null }) } },
    delete() { return { eq: () => ({ then: (r: (v: unknown) => unknown) => r({ error: null }) }) } },
    async maybeSingle() {
      if (table === 'figsy_campaigns') return { data: { id: 'camp1' }, error: null }
      if (table === 'credit_transactions') return { data: null, error: null }
      if (table === 'clients') return { data: { id: 'c1', user_id: 'u1', leads_per_run: 200, sourcing_allowance: 0 }, error: null }
      return { data: LEAD, error: null }
    },
    async single() { return { data: LEAD, error: null } },
    async range() { return { data: [], error: null } },
    then(resolve: (v: unknown) => unknown) {
      const upd = (q as { _update: Record<string, unknown> | null })._update
      if ((q as { _count: boolean })._count) {
        return resolve({ count: table === 'credit_transactions' ? state.purchaseCount : state.approvedCount, error: null })
      }
      if (upd && table === 'leads') {
        // ③ — the two writes are told apart by the column each one sets.
        if ('surfaced_for_approval_at' in upd) return resolve({ error: state.surfaceError })
        if ('delivered_at' in upd) return resolve({ error: state.deliveredError })
        return resolve({ data: [LEAD], error: null })   // the atomic claim
      }
      return resolve({ data: [], count: 0, error: null })
    },
  }
  return q
}

// See approve-lead.test.ts: an allowed country keeps step 3d's launch hold out of a file whose
// subject is what happens to a lead AFTER it is paid for.
const LEAD = { id: 'lead1', client_id: 'c1', email: 'known@acme.com', first_name: 'A', last_name: 'B', company: 'Acme', country: 'United States', crm_existing: false }

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => makeQuery(t),
    // `reveal_is_owned` decides WHICH enrol call site runs, and both are now under test:
    //   false → the main paid path (approve-lead.ts step 8)
    //   true  → the #424 charge-once free re-approve (step 3b) — #568④, fixed in this PR
    // It was pinned to false when only the paid path was guarded; flipping it is how ④ was
    // found in the first place (an assertion went down that branch and passed while proving
    // nothing), so the switch is now deliberate rather than a constant.
    rpc: async (fn: string) => ({ data: fn === 'reveal_is_owned' ? state.revealIsOwned : true, error: null }),
  },
}))
vi.mock('./figsy', () => ({
  autoEnrollLead: vi.fn(async () => {
    if (state.enrolThrows) throw state.enrolThrows
  }),
}))
vi.mock('./enrichment', () => ({ waterfallEnrich: vi.fn(async () => ({ email: 'found@acme.com' })) }))
vi.mock('./demo', () => ({ isDemoClient: vi.fn(async () => false) }))
vi.mock('./billing-rules', () => ({ normalizeRevealEmail: (e: string | null) => (e ? e.toLowerCase() : null) }))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => { state.alerts.push({ kind, subject, lines }) },
}))
// `surfaceEverything(clientId)` takes ONE argument and pages the undecided leads itself
// (#571 — it used to `.limit(1000)`). So the ids under test come from the pager, not the call.
vi.mock('./page-rows', () => ({
  pageRows: async () => ({ rows: state.pagedIds.map(id => ({ id })), complete: true }),
}))

const settle = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  state.enrolThrows = null
  state.surfaceError = null
  state.deliveredError = null
  state.alerts = []
  state.leadUpdates = []
  state.purchaseCount = 1
  state.approvedCount = 1
  state.pagedIds = ['l1', 'l2', 'l3']
  state.revealIsOwned = false
})

// ── ② THE ENROL THAT NEVER HAPPENED ──────────────────────────────────────────────────────
describe('a paid lead that never entered a sequence is reported', () => {
  it('ALERTS when autoEnrollLead throws — it does not pass silently', async () => {
    // Before the fix this was `.catch(() => {})`. The client is charged, the lead is revealed,
    // and no outreach will ever run — indistinguishable from a working approval.
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('no active campaign for client')
    await approveLead('lead1', 'c1')
    await settle()
    const alert = state.alerts.find(a => a.subject.includes('never enrolled'))
    expect(alert).toBeDefined()
    expect(alert!.lines.join(' ')).toContain('lead1')
    expect(alert!.lines.join(' ')).toContain('no active campaign')
  })

  it('says whether MONEY moved or the pack covered it — the two need different responses', async () => {
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    await approveLead('lead1', 'c1')
    await settle()
    const body = state.alerts.find(a => a.subject.includes('never enrolled'))!.lines.join(' ')
    expect(body).toMatch(/charged \$4|included pack/)
  })

  it('says what to actually DO about it', async () => {
    // An alert that reports a stuck lead without saying it must be enrolled by hand leaves the
    // client waiting anyway.
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    await approveLead('lead1', 'c1')
    await settle()
    expect(state.alerts.find(a => a.subject.includes('never enrolled'))!.lines.join(' ')).toContain('Vida')
  })

  it('the lead STAYS approved — un-revealing would lose the contact they paid for', async () => {
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'approved', revealed: true })
  })

  it('a clean enrol raises nothing', async () => {
    const { approveLead } = await import('./approve-lead')
    await approveLead('lead1', 'c1')
    await settle()
    expect(state.alerts.filter(a => a.subject.includes('never enrolled'))).toHaveLength(0)
  })
})

// ── ③ THE DELIVERY THAT WAS REPORTED BUT NOT MADE ────────────────────────────────────────
describe('surfacing reports what actually landed on the desk', () => {
  const IDS = ['l1', 'l2', 'l3']

  it('a failed delivered_at write returns ZERO, not the count nobody received', async () => {
    // The figure the caller logs to the founder as "sent N to them". Returning ids.length here
    // is how "we sent 200" gets said about a client whose desk is empty.
    const { surfaceEverything } = await import('./start-work')
    state.deliveredError = { message: 'permission denied for table leads' }
    const out = await surfaceEverything('c1')
    expect(out).toMatchObject({ surfaced: 0, recommended: 0 })
  })

  it('and ALERTS, saying the client cannot see them AT ALL', async () => {
    // `delivered_at` is what `/for-approval` filters on, so this failure is total invisibility
    // rather than a cosmetic flag — the alert has to say so or it reads as minor.
    const { surfaceEverything } = await import('./start-work')
    state.deliveredError = { message: 'boom' }
    await surfaceEverything('c1')
    await settle()
    const alert = state.alerts.find(a => a.subject.includes('NOT put on'))
    expect(alert).toBeDefined()
    expect(alert!.lines.join(' ')).toContain('cannot see them at all')
    expect(alert!.lines.join(' ')).toContain('c1')
  })

  it('a failed SURFACE write is reported differently from a failed DELIVER write', async () => {
    // Two different states needing two different responses: not-surfaced is invisible to the
    // operator's Sent view, not-delivered is invisible to the client. One message for both
    // would send the founder looking in the wrong place.
    const { surfaceEverything } = await import('./start-work')
    state.surfaceError = { message: 'boom' }
    await surfaceEverything('c1')
    await settle()
    const body = state.alerts.find(a => a.subject.includes('NOT put on'))!.lines.join(' ')
    expect(body).toContain('not marked as surfaced')
    expect(body).not.toContain('cannot see them at all')
  })

  it('says nothing is lost and a re-run retries — so nobody starts repairing rows by hand', async () => {
    const { surfaceEverything } = await import('./start-work')
    state.deliveredError = { message: 'boom' }
    await surfaceEverything('c1')
    await settle()
    expect(state.alerts.find(a => a.subject.includes('NOT put on'))!.lines.join(' ')).toContain('Nothing is lost')
  })

  it('the clean path sets BOTH columns and reports the real count', async () => {
    // Surfaced and visible must never disagree — that is why they are written together.
    const { surfaceEverything } = await import('./start-work')
    const out = await surfaceEverything('c1')
    await settle()
    expect(state.alerts).toHaveLength(0)
    expect(state.leadUpdates).toContain('surfaced_for_approval_at')
    expect(state.leadUpdates).toContain('delivered_at')
    expect((out as { surfaced: number }).surfaced).toBe(IDS.length)
  })
})

// ── ④ THE RE-APPROVE OF A CONTACT THEY HAD ALREADY PAID FOR ──────────────────────────────
//
// The third of three enrol call sites, and the one that hid longest. It returns
// `charged: false`, so it reads like a free path — but `reveal_is_owned` is true precisely
// BECAUSE this client already paid for this contact (#424 charge-once). The money moved on an
// earlier approval; what the re-approve buys is the WORK. With ② guarded and this one silent,
// the failure simply moved to whichever door the client came through.
describe('a re-approve of an ALREADY-PAID contact reports a failed enrol', () => {
  beforeEach(() => { state.revealIsOwned = true })

  it('ALERTS — this path used to swallow while its sibling alerted', async () => {
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('campaign is paused')
    await approveLead('lead1', 'c1')
    await settle()
    const alert = state.alerts.find(a => a.subject.includes('already-paid'))
    expect(alert).toBeDefined()
    expect(alert!.lines.join(' ')).toContain('lead1')
    expect(alert!.lines.join(' ')).toContain('campaign is paused')
  })

  it('says NO NEW CHARGE was made, and that they paid earlier — not "$4 charged"', async () => {
    // The distinction the operator needs. Reusing the paid path's "They were charged $4" here
    // would send them looking for a charge that does not exist on this approval, and would
    // contradict `charged: false` in the response. The money is real but it is historical.
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    await approveLead('lead1', 'c1')
    await settle()
    const body = state.alerts.find(a => a.subject.includes('already-paid'))!.lines.join(' ')
    expect(body).toContain('No new charge')
    expect(body).toContain('ALREADY paid')
    expect(body).not.toContain('charged $4')
  })

  it('says what to do about it — enrol from Vida', async () => {
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    await approveLead('lead1', 'c1')
    await settle()
    expect(state.alerts.find(a => a.subject.includes('already-paid'))!.lines.join(' ')).toContain('Vida')
  })

  it('the lead STAYS approved and STILL reports charged:false', async () => {
    // Both halves matter. Un-revealing would lose the contact; flipping `charged` to true would
    // tell the client they were billed for a re-approve that is free by design (#569's defect,
    // pointed the other way).
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    const out = await approveLead('lead1', 'c1')
    expect(out).toMatchObject({ status: 'approved', revealed: true, charged: false })
  })

  it('a clean re-approve raises nothing', async () => {
    const { approveLead } = await import('./approve-lead')
    await approveLead('lead1', 'c1')
    await settle()
    expect(state.alerts).toHaveLength(0)
  })

  it('the two paths raise DIFFERENT alerts — so the operator knows which door it came through', async () => {
    // A single shared message would make "they were charged $4 just now" and "they paid weeks
    // ago" indistinguishable, and those need different responses.
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    state.revealIsOwned = true
    await approveLead('lead1', 'c1')
    await settle()
    const reapprove = state.alerts.map(a => a.subject)
    state.alerts = []
    state.revealIsOwned = false
    await approveLead('lead1', 'c1')
    await settle()
    const paid = state.alerts.map(a => a.subject)
    expect(reapprove).not.toEqual(paid)
    expect(reapprove.join(' ')).toContain('already-paid')
    expect(paid.join(' ')).toContain('paid lead')
  })
})

// ── THE DEMO PATH STAYS SWALLOWED, DELIBERATELY ──────────────────────────────────────────
describe('a demo lead does NOT alert — and that is the decision, not an oversight', () => {
  it('stays quiet when the enrol fails for a demo client', async () => {
    // Nobody paid, `is_demo` is a hard stop inside the send path, and every demo address is
    // `.invalid`. Alerting here would page the founder about a seeded walkthrough row and
    // train them to ignore the alert that means a REAL client is stuck. Pinned so nobody
    // "completes the set" later without reading why.
    const { isDemoClient } = await import('./demo')
    vi.mocked(isDemoClient).mockResolvedValueOnce(true)
    const { approveLead } = await import('./approve-lead')
    state.enrolThrows = new Error('boom')
    const out = await approveLead('lead1', 'c1')
    await settle()
    expect(out).toMatchObject({ status: 'approved', charged: false })
    expect(state.alerts).toHaveLength(0)
  })
})
