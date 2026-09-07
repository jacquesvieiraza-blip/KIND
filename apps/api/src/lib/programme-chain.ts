// ═══════════════════════════════════════════════════════════════════════════════════════
// PROGRAMME → ICP → CAMPAIGN → SEQUENCE — resolved POSITIVELY, once, in one place.
//
// 🛑 WHAT THIS EXISTS TO REFUSE. "This client's newest sequence" is not "this programme's
// sequence", and House proves it: it carries campaigns and sequences from a retired per-lead
// desk. A client-scoped answer would put the words of an old campaign in front of a customer
// as the words they are being asked to approve for a NEW programme — right client, right
// shape, wrong work, and nothing anywhere would say so.
//
// ⛓️ THE CAMPAIGN SIDE ALREADY LEARNED THIS. `autoEnrollLead` refuses to fall back to the
// client's newest active campaign for programme work (2 Sep, PR A2) for exactly this reason.
// The sequence side had no column to make the same refusal with; `figsy_sequences.campaign_id`
// (20260907_preparation_snapshot) is that column, and this module is the one place the chain
// is walked.
//
// ── EVERY LINK IS POSITIVE, AND EVERY AMBIGUITY IS A REFUSAL ────────────────────────────
//
//   programme  →  icps.programme_id            (written only by the attach action)
//              →  figsy_campaigns.icp_id       (an attached ICP provably had no campaign)
//              →  figsy_sequences.campaign_id  (NULL = historical, never a candidate)
//
// ⚠️ NOT FOUND, UNREADABLE AND AMBIGUOUS ARE THREE DIFFERENT ANSWERS. Collapsing them is how
// "we could not tell" becomes "there is nothing wrong" — the recurring `?? []` defect in this
// codebase, on a chain that decides what a customer is shown and asked to consent to.
//
// ⚠️ AND IT RESOLVES NOTHING BY CLIENT. `client_id` appears here only as a TENANCY CHECK on a
// row already found by a positive link — never as the thing that finds a row.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

/** One message step, exactly as `figsy_sequences.steps` stores it. */
export interface SequenceStep {
  subject: string
  body: string
  wait_days: number
}

export interface ProgrammeChain {
  programmeId: string
  clientId: string
  icpId: string | null
  campaignId: string | null
  sequenceId: string | null
  /** Ordered as authored. Order is meaning: step 2 reads as a follow-up to step 1. */
  steps: SequenceStep[]
  /** The waits, in order — stated separately so a retiming is visible even if no word changed. */
  cadence: number[]
  /**
   * 🛑 THE SECOND STORE, AND IT IS THE ONE THAT ACTUALLY SENDS.
   *
   * `autoEnrollLead` builds every enrolment's message steps from
   * `figsy_campaigns.settings.sequence` — NOT from `figsy_sequences`. So the words a customer
   * is shown and asked to approve (read from `figsy_sequences`, above) and the words that
   * leave the building are held in two different places, and nothing makes them agree.
   *
   * ⚠️ THIS IS REPORTED, NOT RECONCILED. Silently preferring one store would make the other
   * quietly meaningless, and which one is canonical is a product decision. What this field is
   * for is the FREEZE: both stores are hashed, so an edit to either one after approval moves
   * the digest and outreach refuses. A hole in the freeze is not something to leave open while
   * the ownership question is settled.
   */
  campaignSettingsSteps: SequenceStep[]
}

export type ChainResult =
  | { ok: true; chain: ProgrammeChain }
  /** The chain could not be READ. Never the same answer as "there is nothing there". */
  | { ok: false; degraded: string }

/** A step is only a step if it has words. A blank row is not reviewable content. */
function readSteps(raw: unknown): SequenceStep[] {
  if (!Array.isArray(raw)) return []
  const out: SequenceStep[] = []
  for (const s of raw) {
    if (!s || typeof s !== 'object') continue
    const o = s as Record<string, unknown>
    const subject = typeof o.subject === 'string' ? o.subject : ''
    const body = typeof o.body === 'string' ? o.body : ''
    // ⚠️ A step with neither a subject nor a body is not content, whatever the array length
    // says. Counting it would let an empty three-row sequence pass as "three message steps".
    if (subject.trim() === '' && body.trim() === '') continue
    const wait = typeof o.wait_days === 'number' && Number.isFinite(o.wait_days) ? o.wait_days : 0
    out.push({ subject, body, wait_days: wait })
  }
  return out
}

/**
 * Walk the chain for one programme.
 *
 * A missing link is reported as `null`, not as a failure — the caller (readiness) needs to say
 * WHICH link is missing. A failure here means a READ failed, which is a different thing.
 */
export async function resolveProgrammeChain(programmeId: string): Promise<ChainResult> {
  const { data: prog, error: progErr } = await db.from('programmes')
    .select('id, client_id').eq('id', programmeId).maybeSingle()
  if (progErr) return { ok: false, degraded: `This programme's own row could not be read (${progErr.message}).` }
  if (!prog) return { ok: false, degraded: 'There is no programme with that id.' }
  const clientId = (prog as { client_id: string }).client_id

  const chain: ProgrammeChain = {
    programmeId, clientId, icpId: null, campaignId: null, sequenceId: null,
    steps: [], cadence: [], campaignSettingsSteps: [],
  }

  // ── ① THE ATTACHED ICP. By `programme_id`, never by `is_active` — the client-facing active
  // ICP is a different question and has answered it wrongly before.
  const { data: icps, error: icpErr } = await db.from('icps')
    .select('id, client_id').eq('programme_id', programmeId)
  if (icpErr) return { ok: false, degraded: `The targeting attached to this programme could not be read (${icpErr.message}).` }
  const icpRows = ((icps ?? []) as { id: string; client_id: string | null }[])
    // TENANCY on a row already found positively. A row naming this programme but another
    // client is a corrupt link, and reading through it would cross a tenant boundary.
    .filter(r => r.client_id === clientId)
  if (icpRows.length > 1) {
    return { ok: false, degraded: `This programme has ${icpRows.length} attached ICPs, so "the" campaign and sequence are ambiguous. Nothing was resolved.` }
  }
  chain.icpId = icpRows[0]?.id ?? null
  if (!chain.icpId) return { ok: true, chain }

  // ── ② THE CAMPAIGN, BY ICP. `attachIcpToProgramme` refuses an ICP that already carries a
  // campaign, so an attached ICP provably had none when it joined — the only campaign it can
  // hold was created after attachment, for this programme. That is what makes this positive.
  const { data: camps, error: campErr } = await db.from('figsy_campaigns')
    .select('id, client_id, settings').eq('icp_id', chain.icpId)
  if (campErr) return { ok: false, degraded: `This programme's campaign could not be read (${campErr.message}).` }
  const campRows = ((camps ?? []) as { id: string; client_id: string | null; settings?: unknown }[])
    .filter(r => r.client_id === clientId)
  if (campRows.length > 1) {
    return { ok: false, degraded: `This programme's ICP has ${campRows.length} campaigns, so which one the customer would be approving is ambiguous.` }
  }
  chain.campaignId = campRows[0]?.id ?? null
  // The sending store, read whether or not a `figsy_sequences` row exists.
  chain.campaignSettingsSteps = readSteps((campRows[0]?.settings as { sequence?: unknown } | null)?.sequence)
  if (!chain.campaignId) return { ok: true, chain }

  // ── ③ THE SEQUENCE, BY CAMPAIGN. 🛑 THE `client_id` FILTER IS A TENANCY CHECK ON A ROW
  // ALREADY FOUND BY `campaign_id` — it is NOT how the row is found. A sequence whose
  // `campaign_id` is NULL is historical, client-scoped work and is never a candidate here.
  const { data: seqs, error: seqErr } = await db.from('figsy_sequences')
    .select('id, client_id, steps, campaign_id').eq('campaign_id', chain.campaignId)
  if (seqErr) return { ok: false, degraded: `This campaign's sequence could not be read (${seqErr.message}).` }
  const seqRows = ((seqs ?? []) as { id: string; client_id: string | null; steps: unknown }[])
    .filter(r => r.client_id === clientId)
  if (seqRows.length > 1) {
    return { ok: false, degraded: `This campaign has ${seqRows.length} sequences, so the words the customer would approve are ambiguous.` }
  }
  const seq = seqRows[0]
  if (!seq) return { ok: true, chain }

  chain.sequenceId = seq.id
  chain.steps = readSteps(seq.steps)
  chain.cadence = chain.steps.map(s => s.wait_days)
  return { ok: true, chain }
}
