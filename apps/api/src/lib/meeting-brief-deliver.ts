// ═══════════════════════════════════════════════════════════════════════════
// THE MEETING BRIEF — the database half (P34)
//
// Split from `meeting-brief.ts` so the evidence rule stays provable without a
// database. Everything that touches Postgres lives here.
//
// ── THE AUTHORITATIVE BRIEF, DEFINED ONCE ───────────────────────────────────
// The highest `version` for a client whose `status = 'approved'`. Nothing else.
//   ⚠️ NOT "MAX(version)". A draft sitting at version 4 must never become
//   consumer context, and the status filter is the entire difference. Every read
//   in this file goes through `currentBrief()` so that filter cannot be
//   forgotten at one call site and remembered at another.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  assembleBrief, hasSubstance, nextVersion, applyClientEdit, briefPromptContext,
  type BriefContent, type BriefProvenance, type AssembledBrief,
} from './meeting-brief'

export type BriefRow = {
  id: string
  version: number
  status: 'draft' | 'approved'
  content: BriefContent
  provenance: BriefProvenance
  approved_at: string | null
  created_at: string
}

const CONTENT_COLS = [
  'objective', 'ideal_accounts', 'target_personas', 'exclusions', 'proposition',
  'proof_points', 'strong_signals', 'anti_signals', 'geography', 'meeting_objective',
] as const

function rowToBrief(r: Record<string, unknown>): BriefRow {
  const content: BriefContent = {}
  for (const c of CONTENT_COLS) {
    const v = r[c]
    if (typeof v === 'string' && v.trim()) content[c] = v
  }
  return {
    id: String(r.id), version: Number(r.version),
    status: (r.status === 'approved' ? 'approved' : 'draft'),
    content,
    provenance: (r.provenance ?? {}) as BriefProvenance,
    approved_at: (r.approved_at as string | null) ?? null,
    created_at: String(r.created_at),
  }
}

/** The one authoritative brief, or null. Every consumer read goes through here. */
export async function currentBrief(clientId: string): Promise<BriefRow | null> {
  const { data, error } = await db.from('meeting_briefs')
    .select('*')
    .eq('client_id', clientId)
    .eq('status', 'approved')          // ⚠️ never drop this — see the header
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return rowToBrief(data as Record<string, unknown>)
}

/** The newest row of any status — what the client's own screen shows. */
export async function latestBrief(clientId: string): Promise<BriefRow | null> {
  const { data, error } = await db.from('meeting_briefs')
    .select('*')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  return rowToBrief(data as Record<string, unknown>)
}

/** Full history, newest first — the Vida operator view. */
export async function briefHistory(clientId: string): Promise<BriefRow[]> {
  const { data, error } = await db.from('meeting_briefs')
    .select('*')
    .eq('client_id', clientId)
    .order('version', { ascending: false })
    .limit(50)
  if (error) return []
  return (data ?? []).map(r => rowToBrief(r as Record<string, unknown>))
}

/**
 * Gather the evidence that actually persists, and assemble a brief from it.
 *
 * ⚠️ NO MODEL RUNS HERE. Every value is copied from a row. That is what makes
 * "no invention" a fact about the code rather than an instruction to an LLM.
 */
export async function assembleFromEvidence(clientId: string): Promise<AssembledBrief> {
  const [{ data: icp }, { data: knowledgeRows }, { data: feedback }] = await Promise.all([
    db.from('icps')
      .select('name, industries, job_titles, seniority_levels, company_sizes, geographies, keywords')
      .eq('client_id', clientId).eq('is_active', true).maybeSingle(),
    db.from('figsy_knowledge')
      .select('kind, data').eq('client_id', clientId).in('kind', ['pitch', 'messaging']),
    db.from('lead_feedback')
      .select('reason_code').eq('client_id', clientId).eq('action', 'pass')
      .not('reason_code', 'is', null)
      .order('created_at', { ascending: false }).limit(100),
  ])

  // figsy_knowledge stores a jsonb `data` blob per kind — flatten the pitch row,
  // which is the same shape getClientKnowledgeForOutreach reads, so the brief and
  // the outreach copy cannot describe the offer differently.
  const pitch = (knowledgeRows ?? []).find((r: { kind: string }) => r.kind === 'pitch')
  const kd = (pitch?.data ?? null) as Record<string, unknown> | null

  // P32 — only reason codes the client has used at least twice. One pass is a
  // one-off; a repeated code is a pattern, and only a pattern belongs in a
  // document that shapes future targeting.
  const counts = new Map<string, number>()
  for (const r of (feedback ?? []) as { reason_code: string | null }[]) {
    if (!r.reason_code) continue
    counts.set(r.reason_code, (counts.get(r.reason_code) ?? 0) + 1)
  }
  const antiSignals = [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([code]) => code.replace(/_/g, ' '))

  return assembleBrief({
    icp: (icp ?? null) as never,
    knowledge: kd ? {
      pitch:           typeof kd.pitch === 'string' ? kd.pitch : null,
      product:         typeof kd.product === 'string' ? kd.product : null,
      pain_points:     typeof kd.pain_points === 'string' ? kd.pain_points : null,
      differentiators: typeof kd.differentiators === 'string' ? kd.differentiators : null,
    } : null,
    antiSignals,
  })
}

export type EnsureResult =
  | { status: 'exists'; brief: BriefRow }
  | { status: 'created'; brief: BriefRow }
  | { status: 'no_evidence' }
  | { status: 'failed'; reason: string }

/**
 * Make sure the client has a brief to look at. Idempotent, never throws.
 *
 * v1 lands as a DRAFT: it was derived by us, and the client has not yet said it
 * is right. A draft is never consumer context — `currentBrief` filters it out —
 * so nothing about scoring or sequences changes until a human confirms it.
 */
export async function ensureBrief(clientId: string): Promise<EnsureResult> {
  try {
    const existing = await latestBrief(clientId)
    if (existing) return { status: 'exists', brief: existing }

    const assembled = await assembleFromEvidence(clientId)
    // A brief with nothing in it is not a brief. A brand-new client with no ICP
    // would otherwise be shown "here's what I understand" followed by nothing.
    if (!hasSubstance(assembled)) return { status: 'no_evidence' }

    const { data, error } = await db.from('meeting_briefs').insert({
      client_id:  clientId,
      version:    nextVersion(null),
      status:     'draft',
      ...assembled.content,
      provenance: assembled.provenance,
    }).select('*').single()

    if (error) {
      // 23505: another request created v1 microseconds ago. Read theirs.
      if ((error as { code?: string }).code === '23505') {
        const now = await latestBrief(clientId)
        return now ? { status: 'exists', brief: now } : { status: 'failed', reason: error.message }
      }
      return { status: 'failed', reason: error.message }
    }
    return { status: 'created', brief: rowToBrief(data as Record<string, unknown>) }
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : 'unknown' }
  }
}

export type ApproveResult =
  | { status: 'approved'; brief: BriefRow }
  | { status: 'not_found' }
  | { status: 'failed'; reason: string }

/**
 * The client confirms a draft. The ONLY update in this module, and it touches
 * metadata only — never a word of content. Founder-ruled 21 Aug: the client
 * approves their own brief.
 *
 * Scoped by client_id AND status so it cannot approve another tenant's row, and
 * cannot re-approve an already-approved version (which would move approved_at
 * and quietly rewrite when the client agreed to something).
 */
export async function approveBrief(clientId: string, version: number): Promise<ApproveResult> {
  try {
    const { data, error } = await db.from('meeting_briefs')
      .update({ status: 'approved', approved_by: 'client', approved_at: new Date().toISOString() })
      .eq('client_id', clientId).eq('version', version).eq('status', 'draft')
      .select('*').maybeSingle()
    if (error) return { status: 'failed', reason: error.message }
    if (!data) return { status: 'not_found' }
    return { status: 'approved', brief: rowToBrief(data as Record<string, unknown>) }
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : 'unknown' }
  }
}

export type EditResult =
  | { status: 'created'; brief: BriefRow }
  | { status: 'conflict' }
  | { status: 'no_base' }
  | { status: 'failed'; reason: string }

/**
 * A client edit. INSERTS version+1 — the previous version is never touched.
 *
 * The new row is 'approved' immediately, and that is not a shortcut: the client
 * IS the approver (founder-ruled), so words they typed themselves are approved
 * by the act of typing them. Asking them to write it and then confirm it would
 * be a second click that means nothing.
 */
export async function editBrief(
  clientId: string, edit: Record<string, unknown>,
): Promise<EditResult> {
  try {
    const base = await latestBrief(clientId)
    if (!base) return { status: 'no_base' }

    const next = applyClientEdit(base.content, base.provenance, edit)
    const { data, error } = await db.from('meeting_briefs').insert({
      client_id:   clientId,
      version:     nextVersion(base.version),
      status:      'approved',
      approved_by: 'client',
      approved_at: new Date().toISOString(),
      ...next.content,
      provenance:  next.provenance,
    }).select('*').single()

    if (error) {
      // Two tabs both read version N and both wrote N+1. The database settled it;
      // the loser is told to re-read rather than silently overwriting the winner.
      if ((error as { code?: string }).code === '23505') return { status: 'conflict' }
      return { status: 'failed', reason: error.message }
    }
    return { status: 'created', brief: rowToBrief(data as Record<string, unknown>) }
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : 'unknown' }
  }
}

/**
 * The consumers' single entry point: approved brief → prompt text, or null.
 *
 * ⚠️ NEVER THROWS AND NEVER BLOCKS. Both call sites are inside paths that score
 * or send. A brief is additive context; if anything here fails, the caller must
 * behave EXACTLY as it does today. That is the no-brief fallback, and it is the
 * same failure shape as the Nexus and P32 blocks that already sit beside it.
 */
export async function briefContextFor(clientId: string): Promise<string | null> {
  try {
    const brief = await currentBrief(clientId)
    if (!brief) return null
    return briefPromptContext(brief.content)
  } catch {
    return null
  }
}
