// ═══════════════════════════════════════════════════════════════════════════════════════
// THE EXACT WORK APPROVED IS THE EXACT WORK ALLOWED TO RUN (founder-locked 7 Sep).
//
// 🛑 WHAT APPROVAL RECORDED BEFORE THIS: a timestamp. `approved_at` says WHEN somebody
// approved and nothing whatever about WHAT. So a sequence rewritten, a cadence retimed, a
// sender swapped or an enrolment set replaced after approval carried the old consent forward
// in silence — and every gate downstream reads that consent as permission to send THIS.
//
// ⚠️ A HASH, NOT A VERSION HISTORY. One snapshot, the approved one, replaced only by a
// re-approval. Full product versioning is post-launch and deliberately not started here: the
// question this answers is binary — *is the work still the work they said yes to?*
//
// ── WHAT MAKES IT TRUSTWORTHY ───────────────────────────────────────────────────────────
//
// ① DETERMINISTIC. Canonical JSON with recursively sorted keys, so two identical preparations
//    hash identically no matter what order the database returned rows in. Membership lists are
//    SORTED for the same reason — a page boundary must not look like a change.
//
// ② NO TIMESTAMPS, NO RUNTIME NOISE. `updated_at`, `created_at`, counters and ids that churn
//    are excluded on purpose. A hash that changes when nothing changed is worse than no hash:
//    it trains everybody to re-approve reflexively, which is how a REAL change gets waved
//    through. Every field below is something a customer would recognise as the work.
//
// ③ IT COVERS MEMBERSHIP, NOT JUST IDENTITY. `batch_id` alone would not notice 200 different
//    people inside the same batch, and `sequence_id` alone would not notice the words being
//    rewritten under it. So the batch's leads, the enrolled leads, and the ordered step CONTENT
//    are all in the digest. Founder-locked: an id is not the work.
//
// ④ CADENCE IS STATED SEPARATELY from the steps that carry it. The waits already live inside
//    `steps[].wait_days`, but listing them on their own makes a RETIMING a first-class change
//    rather than something buried in a body diff.
//
// 🛑 AND IT GRANTS NOTHING. Building a snapshot is not approving one. Nothing in this file
// writes a status, an authority, an approval or a send.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto'
import { db } from '@kind/db'
import { resolveProgrammeChain, type SequenceStep } from './programme-chain'

/** The canonical, hashable description of a programme's prepared work. */
export interface PreparationSnapshot {
  /** Bumped only if the CONTENT of the digest changes shape, which invalidates every hash. */
  v: 1
  programme_id: string
  batch_id: string | null
  /** Sorted. The people inside the batch — an id alone would not notice a different 250. */
  batch_lead_ids: string[]
  campaign_id: string | null
  sequence_id: string | null
  /** Ordered as authored: order is meaning, so it is never sorted. */
  steps: SequenceStep[]
  /** The waits in order — a retiming is a change even when no word moved. */
  cadence: number[]
  /** Identity of the mailbox that would send, not its credentials. Never a secret. */
  sender: string | null
  /** Sorted. Who would actually receive this. */
  enrolled_lead_ids: string[]
}

export type SnapshotResult =
  | { ok: true; snapshot: PreparationSnapshot; hash: string }
  | { ok: false; degraded: string }

/**
 * Canonical JSON: object keys sorted recursively, arrays left in their own order, no spaces.
 *
 * ⚠️ `JSON.stringify` ALONE IS NOT CANONICAL — its output follows insertion order, so two
 * structurally identical snapshots built by two code paths can serialise differently and hash
 * differently. A hash that depends on how the object was assembled is not a hash of the work.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  const o = value as Record<string, unknown>
  const keys = Object.keys(o).sort()
  return `{${keys.map(k => `${JSON.stringify(k)}:${canonicalJson(o[k])}`).join(',')}}`
}

/** The digest of a snapshot. Pure — the same snapshot always gives the same string. */
export function preparationHash(snapshot: PreparationSnapshot): string {
  return createHash('sha256').update(canonicalJson(snapshot)).digest('hex')
}

/**
 * Build the CURRENT preparation snapshot for a programme.
 *
 * ⚠️ A READ FAILURE IS NEVER AN EMPTY SNAPSHOT. Returning `{ batch_lead_ids: [] }` because a
 * query errored would hash to a stable value and quietly declare "unchanged" — the single most
 * dangerous thing this module could do. Every failure returns `ok: false` and the caller must
 * treat it as "cannot tell", which for an authority gate means refuse.
 */
export async function buildPreparationSnapshot(programmeId: string): Promise<SnapshotResult> {
  const chainRes = await resolveProgrammeChain(programmeId)
  if (!chainRes.ok) return { ok: false, degraded: chainRes.degraded }
  const chain = chainRes.chain

  // ── THE BATCH, and the people in it ──────────────────────────────────────────────────
  const { data: batches, error: batchErr } = await db.from('programme_batches')
    .select('id, seq').eq('programme_id', programmeId).order('seq', { ascending: false })
  if (batchErr) return { ok: false, degraded: `This programme's batches could not be read (${batchErr.message}).` }
  const batchId = ((batches ?? []) as { id: string }[])[0]?.id ?? null

  let batchLeadIds: string[] = []
  if (batchId) {
    const { data: bl, error: blErr } = await db.from('leads').select('id').eq('batch_id', batchId)
    if (blErr) return { ok: false, degraded: `The prospects in this programme's batch could not be read (${blErr.message}).` }
    batchLeadIds = ((bl ?? []) as { id: string }[]).map(r => r.id).sort()
  }

  // ── THE PREPARED AUDIENCE ────────────────────────────────────────────────────────────
  const { data: enr, error: enrErr } = await db.from('figsy_enrollments')
    .select('lead_id').eq('programme_id', programmeId)
  if (enrErr) return { ok: false, degraded: `This programme's prepared enrolments could not be read (${enrErr.message}).` }
  const enrolledLeadIds = ((enr ?? []) as { lead_id: string | null }[])
    .map(r => r.lead_id).filter((v): v is string => typeof v === 'string').sort()

  // ── THE SENDER. Its IDENTITY, never its credentials — a snapshot is stored and read back,
  // and a password inside a hashed blob is still a password in the database.
  let sender: string | null = null
  try {
    const { resolveSendingInbox } = await import('./sending-inbox')
    const r = await resolveSendingInbox(chain.clientId)
    if (r.ok) sender = `${r.inbox.id}|${r.inbox.email ?? ''}`
  } catch (err) {
    return { ok: false, degraded: `The sending mailbox for this client could not be checked (${err instanceof Error ? err.message : String(err)}).` }
  }

  const snapshot: PreparationSnapshot = {
    v: 1,
    programme_id: programmeId,
    batch_id: batchId,
    batch_lead_ids: batchLeadIds,
    campaign_id: chain.campaignId,
    sequence_id: chain.sequenceId,
    steps: chain.steps,
    cadence: chain.cadence,
    sender,
    enrolled_lead_ids: enrolledLeadIds,
  }
  return { ok: true, snapshot, hash: preparationHash(snapshot) }
}

export type PreparationDrift =
  /** No approval has been recorded, so there is nothing to have drifted FROM. */
  | { state: 'not_approved' }
  | { state: 'unchanged'; hash: string }
  | { state: 'changed'; approved: string; current: string; detail: string }
  /** Could not tell. For an authority gate this must be treated as a refusal. */
  | { state: 'unreadable'; detail: string }

/**
 * Has the prepared work changed since the customer approved it?
 *
 * 🛑 AN APPROVED PROGRAMME WITH NO STORED HASH IS `unreadable`, NOT `unchanged`. It was
 * approved before this existed, or the write did not land — either way nobody can say the work
 * still matches, and "we have no record" must never resolve to "yes, it matches".
 */
export async function preparationDrift(programmeId: string): Promise<PreparationDrift> {
  const { data: prog, error } = await db.from('programmes')
    .select('id, approved_at, approved_preparation_hash').eq('id', programmeId).maybeSingle()
  if (error) return { state: 'unreadable', detail: `The programme could not be read (${error.message}).` }
  if (!prog) return { state: 'unreadable', detail: 'There is no programme with that id.' }
  const p = prog as { approved_at: string | null; approved_preparation_hash: string | null }

  if (!p.approved_at) return { state: 'not_approved' }
  if (!p.approved_preparation_hash) {
    return {
      state: 'unreadable',
      detail: 'This programme is approved but carries no record of WHAT was approved, so it cannot be proved that the current work is the work the client agreed to. It must be re-approved before anything runs.',
    }
  }

  const now = await buildPreparationSnapshot(programmeId)
  if (!now.ok) return { state: 'unreadable', detail: now.degraded }
  if (now.hash === p.approved_preparation_hash) return { state: 'unchanged', hash: now.hash }
  return {
    state: 'changed',
    approved: p.approved_preparation_hash,
    current: now.hash,
    detail: 'The prepared work has changed since the client approved it — the campaign, the sequence, the wording, the timing, the sender or the audience is not what they agreed to. It must be reviewed and re-approved before anything runs.',
  }
}
