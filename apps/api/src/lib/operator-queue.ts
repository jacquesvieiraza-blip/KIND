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

// Cross-client Lead queue: EVERY pending draft awaiting a human release, across ALL
// clients, newest first. This is the operator's single inbox so they don't have to open
// each client to find what's waiting. Normalizes the nested client/lead names to flat
// fields the UI can render directly. Read-only — the actions reuse approve/reject above.
export type PendingDraft = {
  id: string
  client_id: string | null
  client_name: string | null
  lead_id: string | null
  lead_name: string | null
  to_email: string | null
  subject: string | null
  body: string | null
  sequence_step: number | null
  created_at: string | null
}

export async function listPendingDrafts(limit = 100): Promise<PendingDraft[]> {
  const { data } = await db
    .from('figsy_approval_queue')
    .select('id, client_id, lead_id, to_email, subject, body, sequence_step, created_at, clients ( company_name ), leads ( first_name, last_name )')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as Record<string, unknown>[]).map((r) => {
    const client = (r.clients ?? null) as { company_name?: string | null } | null
    const lead = (r.leads ?? null) as { first_name?: string | null; last_name?: string | null } | null
    const leadName = lead ? [lead.first_name, lead.last_name].filter(Boolean).join(' ').trim() || null : null
    return {
      id: r.id as string,
      client_id: (r.client_id as string | null) ?? null,
      client_name: client?.company_name ?? null,
      lead_id: (r.lead_id as string | null) ?? null,
      lead_name: leadName,
      to_email: (r.to_email as string | null) ?? null,
      subject: (r.subject as string | null) ?? null,
      body: (r.body as string | null) ?? null,
      sequence_step: (r.sequence_step as number | null) ?? null,
      created_at: (r.created_at as string | null) ?? null,
    }
  })
}

// #493 — SEND TO CLIENT. The operator NEVER spends (invariant #1); the only thing they can
// do with a sourced/qualified lead is surface it to the client for the client's own 👍 in
// Milla. This marks the lead surfaced-for-approval — from here it appears in the client's
// Milla lead desk. Scoped to the client + only masked, un-passed leads. Returns whether a
// row was actually surfaced so the route can 404 honestly.
//
// NO TIME LIMIT ON PAID LEADS (founder-locked 25 Jul). The old #492 72h TTL is gone: it
// never expired anything, it just made a surfaced lead quietly stop counting on the operator
// board while the client could still see it. Nothing writes approval_expires_at now.
export async function surfaceLeadForApproval(
  clientId: string,
  leadId: string,
): Promise<{ surfaced: boolean }> {
  const now = new Date()
  const { data } = await db.from('leads')
    .update({ surfaced_for_approval_at: now.toISOString() })
    .eq('id', leadId).eq('client_id', clientId)
    .is('revealed_at', null).neq('status', 'passed')
    .select('id').maybeSingle()
  return { surfaced: !!data }
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
