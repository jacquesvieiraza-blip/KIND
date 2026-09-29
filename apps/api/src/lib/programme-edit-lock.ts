// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 ② · PR 1d) — A PROGRAMME'S TARGETING AND EMAILS ARE FIXED FROM "READY".
//
// From the moment the package is frozen for the client (READY_FOR_APPROVAL) through APPROVED
// and LIVE, the client is reading — or has approved — exactly this targeting and these words.
// Vida's ICP and Sequence tabs could still rewrite them in place (or, for the ICP, save a new
// version that switches the programme's ICP OFF), which either stales the package so the client
// cannot approve, or quietly halts a live programme at the send gate (`sequence_not_canonical`
// / `preparation_changed`). Founder ruling (R174): lock them; a change goes through Rewrite
// messages / Re-freeze on the Programme tab, and the client approves the new version.
//
// ⚠️ UNREADABLE REFUSES. Not knowing whether the programme is locked is never permission to
// change what a client may already have approved (the R96 shape).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const EDIT_LOCKED_STATUSES = ['READY_FOR_APPROVAL', 'APPROVED', 'LIVE'] as const

export const EDIT_LOCK_MESSAGE =
  'This programme\'s targeting and emails are fixed from the client review onward — the client is reading (or has approved) exactly these. ' +
  'Change them from the Programme tab (Rewrite messages / Re-freeze), and the client approves the new version.'

export type EditVerdict = { refuse: false } | { refuse: true; status: 409 | 503; message: string }

type Lock = { kind: 'none' } | { kind: 'locked'; programmeId: string } | { kind: 'unknown'; reason: string }

async function lockFor(clientId: string): Promise<Lock> {
  const { data, error } = await db.from('programmes').select('id, status')
    .eq('client_id', clientId).in('status', EDIT_LOCKED_STATUSES as unknown as string[]).limit(1)
  if (error) return { kind: 'unknown', reason: error.message }
  const row = ((data ?? []) as { id: string }[])[0]
  return row ? { kind: 'locked', programmeId: row.id } : { kind: 'none' }
}

const unknown = (reason: string): EditVerdict => ({
  refuse: true, status: 503,
  message: `Whether this client's programme is locked could not be read (${reason}), so nothing was changed.`,
})
const locked: EditVerdict = { refuse: true, status: 409, message: EDIT_LOCK_MESSAGE }

/**
 * May an operator save this ICP? `icpId` null = a NEW version, which deactivates every other
 * ICP of the client (including the programme's), so it is refused whenever a programme is locked.
 */
export async function icpEditVerdict(clientId: string, icpId: string | null): Promise<EditVerdict> {
  const lock = await lockFor(clientId)
  if (lock.kind === 'unknown') return unknown(lock.reason)
  if (lock.kind === 'none') return { refuse: false }
  if (!icpId) return locked
  const { data, error } = await db.from('icps').select('programme_id').eq('id', icpId).eq('client_id', clientId).maybeSingle()
  if (error) return unknown(error.message)
  return (data as { programme_id?: string | null } | null)?.programme_id === lock.programmeId ? locked : { refuse: false }
}

/** May an operator rewrite this saved sequence in place? Refused when it is the locked programme's own. */
export async function sequenceEditVerdict(clientId: string, sequenceId: string): Promise<EditVerdict> {
  const lock = await lockFor(clientId)
  if (lock.kind === 'unknown') return unknown(lock.reason)
  if (lock.kind === 'none') return { refuse: false }
  const { data: seq, error: e1 } = await db.from('figsy_sequences').select('campaign_id').eq('id', sequenceId).eq('client_id', clientId).maybeSingle()
  if (e1) return unknown(e1.message)
  const campaignId = (seq as { campaign_id?: string | null } | null)?.campaign_id
  if (!campaignId) return { refuse: false }
  const { data: camp, error: e2 } = await db.from('figsy_campaigns').select('icp_id').eq('id', campaignId).maybeSingle()
  if (e2) return unknown(e2.message)
  const icpId = (camp as { icp_id?: string | null } | null)?.icp_id
  if (!icpId) return { refuse: false }
  const { data: icp, error: e3 } = await db.from('icps').select('programme_id').eq('id', icpId).maybeSingle()
  if (e3) return unknown(e3.message)
  return (icp as { programme_id?: string | null } | null)?.programme_id === lock.programmeId ? locked : { refuse: false }
}
