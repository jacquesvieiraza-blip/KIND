import { describe, it, expect, vi, beforeEach } from 'vitest'

// #487 — Vida operator draft-queue actions. Two invariants Fable flagged:
//   1. approve RELEASES the draft via the SAME shared send path the portal uses — it must
//      call approveQueuedDraft(clientId, queueId), not the $4 lead-approve.
//   2. reject closes the draft SCOPED to the client + status='pending', and reports
//      honestly whether a row was actually closed (so the route can 404).

// --- capture the query chain so we can assert exact scoping (reject) + shape (list) ---
const rejectChain: Array<{ m: string; args: unknown[] }> = []
let rejectRow: { id: string } | null = null
let listRows: Record<string, unknown>[] = []

function makeQuery() {
  const q: any = {
    update(row: unknown) { rejectChain.push({ m: 'update', args: [row] }); return q },
    eq(col: string, val: unknown) { rejectChain.push({ m: 'eq', args: [col, val] }); return q },
    is(col: string, val: unknown) { rejectChain.push({ m: 'is', args: [col, val] }); return q },
    neq(col: string, val: unknown) { rejectChain.push({ m: 'neq', args: [col, val] }); return q },
    select(c: string) { rejectChain.push({ m: 'select', args: [c] }); return q },
    order() { return q },
    limit() { return q },
    async maybeSingle() { return { data: rejectRow, error: null } },
    // the list flow (listPendingDrafts) awaits the builder directly:
    then(resolve: (v: unknown) => unknown) { return resolve({ data: listRows, error: null }) },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (table: string) => { expect(['figsy_approval_queue', 'leads']).toContain(table); return makeQuery() } },
}))

// The heavy figsy router is never loaded — approveQueuedDraft is mocked to a spy so we can
// assert the delegation (clientId, queueId) and that its result passes straight through.
const approveSpy = vi.fn(async (_clientId: string | null, _queueId: string) => ({ http: 200, body: { success: true, approved: true, sent: true } }))
vi.mock('../routes/figsy', () => ({ approveQueuedDraft: approveSpy }))

import { approveDraftOnBehalf, rejectDraftOnBehalf, listPendingDrafts, surfaceLeadForApproval } from './operator-queue'

beforeEach(() => { rejectChain.length = 0; rejectRow = null; listRows = []; approveSpy.mockClear() })

describe('approveDraftOnBehalf', () => {
  it('delegates to the shared approveQueuedDraft with (clientId, queueId) and returns its result', async () => {
    const r = await approveDraftOnBehalf('client-1', 'queue-9')
    expect(approveSpy).toHaveBeenCalledTimes(1)
    expect(approveSpy).toHaveBeenCalledWith('client-1', 'queue-9')
    expect(r).toEqual({ http: 200, body: { success: true, approved: true, sent: true } })
  })

  it('passes a deferred/not-sent outcome straight through (no fabricated success)', async () => {
    approveSpy.mockResolvedValueOnce({ http: 200, body: { success: true, approved: true, sent: false, outcome: 'deferred', note: 'cap reached' } })
    const r = await approveDraftOnBehalf('client-1', 'queue-9')
    expect(r.body.sent).toBe(false)
    expect(r.body.note).toBe('cap reached')
  })
})

describe('rejectDraftOnBehalf', () => {
  it('closes a pending draft scoped to the client + status, returns rejected:true', async () => {
    rejectRow = { id: 'queue-9' }
    const r = await rejectDraftOnBehalf('client-1', 'queue-9')
    expect(r).toEqual({ rejected: true })
    // scoping invariant: update->rejected, eq id, eq client_id, eq status pending
    expect(rejectChain.find(c => c.m === 'update')?.args[0]).toEqual({ status: 'rejected' })
    const eqs = rejectChain.filter(c => c.m === 'eq').map(c => c.args)
    expect(eqs).toContainEqual(['id', 'queue-9'])
    expect(eqs).toContainEqual(['client_id', 'client-1'])
    expect(eqs).toContainEqual(['status', 'pending'])
  })

  it('reports rejected:false when no matching row (wrong client / already actioned)', async () => {
    rejectRow = null
    const r = await rejectDraftOnBehalf('client-1', 'queue-does-not-exist')
    expect(r).toEqual({ rejected: false })
  })
})

describe('listPendingDrafts (cross-client Lead queue)', () => {
  it('filters to pending only and flattens client + lead names for the UI', async () => {
    listRows = [
      { id: 'q1', client_id: 'c1', lead_id: 'l1', to_email: 'a@x.com', subject: 'Hi A', body: 'Body A', sequence_step: 1, created_at: '2026-07-23T10:00:00Z',
        clients: { company_name: 'Acme' }, leads: { first_name: 'Ada', last_name: 'Lovelace' } },
      { id: 'q2', client_id: 'c2', lead_id: 'l2', to_email: 'b@y.com', subject: 'Hi B', body: 'Body B', sequence_step: 2, created_at: '2026-07-23T09:00:00Z',
        clients: { company_name: 'Beta' }, leads: { first_name: 'Bo', last_name: null } },
    ]
    const drafts = await listPendingDrafts(100)
    // pending-only invariant: the query filters status='pending'
    const eqs = rejectChain.filter(c => c.m === 'eq').map(c => c.args)
    expect(eqs).toContainEqual(['status', 'pending'])
    // cross-client: two different clients survive, names flattened
    expect(drafts.map(d => d.client_name)).toEqual(['Acme', 'Beta'])
    expect(drafts[0]).toMatchObject({ id: 'q1', client_id: 'c1', lead_name: 'Ada Lovelace', subject: 'Hi A', body: 'Body A', sequence_step: 1 })
    expect(drafts[1].lead_name).toBe('Bo') // single-name lead doesn't crash
  })

  it('returns [] and tolerates missing joins', async () => {
    listRows = [{ id: 'q3', client_id: 'c3', lead_id: null, to_email: null, subject: null, body: null, sequence_step: null, created_at: null, clients: null, leads: null }]
    const drafts = await listPendingDrafts()
    expect(drafts).toHaveLength(1)
    expect(drafts[0]).toMatchObject({ id: 'q3', client_name: null, lead_name: null })
  })
})

describe('surfaceLeadForApproval (#493 — Send to client; operators never spend)', () => {
  it('marks the lead surfaced + sets the 72h TTL, scoped to client + masked + un-passed', async () => {
    rejectRow = { id: 'lead-1' }
    const r = await surfaceLeadForApproval('client-1', 'lead-1', 72)
    expect(r).toEqual({ surfaced: true })
    // NO money RPC anywhere — surfacing spends nothing.
    // Scoping invariants: update sets surfaced_for_approval_at + approval_expires_at;
    // eq id + eq client_id; is revealed_at null; neq status passed.
    const upd = rejectChain.find(c => c.m === 'update')?.args[0] as Record<string, unknown>
    expect(upd.surfaced_for_approval_at).toBeTruthy()
    expect(upd.approval_expires_at).toBeTruthy()
    const eqs = rejectChain.filter(c => c.m === 'eq').map(c => c.args)
    expect(eqs).toContainEqual(['id', 'lead-1'])
    expect(eqs).toContainEqual(['client_id', 'client-1'])
    expect(rejectChain.filter(c => c.m === 'is').map(c => c.args)).toContainEqual(['revealed_at', null])
    expect(rejectChain.filter(c => c.m === 'neq').map(c => c.args)).toContainEqual(['status', 'passed'])
  })

  it('reports surfaced:false when no matching masked lead (already revealed / passed / wrong client)', async () => {
    rejectRow = null
    const r = await surfaceLeadForApproval('client-1', 'nope')
    expect(r).toEqual({ surfaced: false })
  })
})
