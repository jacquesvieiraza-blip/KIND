import { db } from '@kind/db'

// #487 — Vida operator draft-queue actions (the "Needs approval" column).
//
// These act on the figsy_approval_queue (drafts FIGSY wrote, awaiting a human gate) —
// NOT the $4 lead-approve. The $4 already fired when the lead was revealed + enrolled;
// releasing a draft here is the real SEND, and rejecting closes the draft. Both are
// scoped to the client the operator selected (never a default), so an operator can only
// touch drafts belonging to the client they're driving.

// Release a draft on the client's behalf — reuses the EXACT charged, logged,
// atomically-claimed send the portal's own approve door uses (no parallel send path).
export async function approveDraftOnBehalf(
  clientId: string,
  queueId: string,
): Promise<{ http: number; body: Record<string, unknown> }> {
  const { approveQueuedDraft } = await import('../routes/figsy')
  return approveQueuedDraft(clientId, queueId)
}

// Reject a draft: close it so it stops reappearing as approvable. Scoped to the client
// AND to status='pending' (can't re-reject a sent/rejected row). Returns whether a row
// was actually closed so the caller can 404 honestly.
export async function rejectDraftOnBehalf(
  clientId: string,
  queueId: string,
): Promise<{ rejected: boolean }> {
  const { data } = await db
    .from('figsy_approval_queue')
    .update({ status: 'rejected' })
    .eq('id', queueId)
    .eq('client_id', clientId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle()
  return { rejected: !!data }
}
