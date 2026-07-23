import { describe, it, expect, vi, beforeEach } from 'vitest'

// #487 — Vida operator draft-queue actions. Two invariants Fable flagged:
//   1. approve RELEASES the draft via the SAME shared send path the portal uses — it must
//      call approveQueuedDraft(clientId, queueId), not the $4 lead-approve.
//   2. reject closes the draft SCOPED to the client + status='pending', and reports
//      honestly whether a row was actually closed (so the route can 404).

// --- capture the reject query chain so we can assert the exact scoping ---
const rejectChain: Array<{ m: string; args: unknown[] }> = []
let rejectRow: { id: string } | null = null

function makeRejectQuery() {
  const q: any = {
    update(row: unknown) { rejectChain.push({ m: 'update', args: [row] }); return q },
    eq(col: string, val: unknown) { rejectChain.push({ m: 'eq', args: [col, val] }); return q },
    select(c: string) { rejectChain.push({ m: 'select', args: [c] }); return q },
    async maybeSingle() { return { data: rejectRow, error: null } },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: { from: (table: string) => { expect(table).toBe('figsy_approval_queue'); return makeRejectQuery() } },
}))

// The heavy figsy router is never loaded — approveQueuedDraft is mocked to a spy so we can
// assert the delegation (clientId, queueId) and that its result passes straight through.
const approveSpy = vi.fn(async (_clientId: string | null, _queueId: string) => ({ http: 200, body: { success: true, approved: true, sent: true } }))
vi.mock('../routes/figsy', () => ({ approveQueuedDraft: approveSpy }))

import { approveDraftOnBehalf, rejectDraftOnBehalf } from './operator-queue'

beforeEach(() => { rejectChain.length = 0; rejectRow = null; approveSpy.mockClear() })

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
