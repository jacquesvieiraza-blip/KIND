// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (founder: *"what Vida is approved. should be the sequence in Milla"* · *"they need to
// match"*) — WHAT IS SENT IS WHAT WAS APPROVED.
//
// A programme email used to be read from each person's own stored copy (`figsy_enrollments.steps`).
// Those copies are written when people are enrolled and rewritten when the words change (House's
// approved emails, a new version) — and a rewrite that misses someone left them on the OLD words,
// with nothing to notice: the approval is pinned to the version, not to 234 separate copies.
//
// Now a programme send is built from the APPROVED version at the moment it goes out, filled in for
// this person by the same `buildDraftStepsFromSequence` that builds the stored copies. So the
// founder's approval in Vida, the client's in Milla and the email in the prospect's inbox are the
// same words by construction. Anything that cannot be read DEFERS the send (never the old copy).
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { SequenceStep } from './sequence-apply'

type StepLead = { first_name?: string | null; last_name?: string | null; company?: string | null; job_title?: string | null; industry?: string | null }
type Programme = {
  client_id: string | null
  review_preparation_hash: string | null
  approved_preparation_hash: string | null
  review_preparation_snapshot: { steps?: unknown } | null
}

export type ApprovedStep = { ok: true; subject: string; body: string } | { ok: false; reason: string }

/** The approved version's email for step `step`, filled in for this person. Pure. */
export function approvedStepFor(
  p: Programme, step: number, lead: StepLead, senderCompany: string | null,
  build: (steps: SequenceStep[], lead: StepLead, company: string | null) => { subject: string; body: string }[],
): ApprovedStep {
  if (!p.approved_preparation_hash) return { ok: false, reason: 'this programme has no approved version' }
  if (p.review_preparation_hash !== p.approved_preparation_hash) {
    return { ok: false, reason: 'the version on screen is not the approved one (a new version waits for approval)' }
  }
  const steps = Array.isArray(p.review_preparation_snapshot?.steps) ? p.review_preparation_snapshot!.steps as SequenceStep[] : []
  const full = build(steps, lead, senderCompany)
  const s = full[step - 1]
  if (!s || !s.subject.trim() || !s.body.trim()) return { ok: false, reason: `the approved version has no email ${step}` }
  return { ok: true, subject: s.subject, body: s.body }
}

/** Reads the enrolment's programme and its approved version, then `approvedStepFor`. */
export async function approvedProgrammeStep(enrollmentId: string, step: number, lead: StepLead): Promise<ApprovedStep> {
  const { data: enr, error: eErr } = await db.from('figsy_enrollments').select('programme_id').eq('id', enrollmentId).maybeSingle()
  if (eErr) return { ok: false, reason: `the enrolment could not be read (${eErr.message})` }
  const programmeId = (enr as { programme_id?: string | null } | null)?.programme_id
  if (!programmeId) return { ok: false, reason: 'the enrolment belongs to no programme' }
  const { data: p, error: pErr } = await db.from('programmes')
    .select('client_id, review_preparation_hash, approved_preparation_hash, review_preparation_snapshot').eq('id', programmeId).maybeSingle()
  if (pErr || !p) return { ok: false, reason: pErr ? `the programme could not be read (${pErr.message})` : 'no such programme' }
  const prog = p as Programme
  let company: string | null = null
  if (prog.client_id) {
    const { data: c, error: cErr } = await db.from('clients').select('company_name').eq('id', prog.client_id).maybeSingle()
    if (cErr) return { ok: false, reason: `the client's name could not be read (${cErr.message})` }
    company = (c as { company_name?: string | null } | null)?.company_name ?? null
  }
  const { buildDraftStepsFromSequence } = await import('./sequence-apply')
  return approvedStepFor(prog, step, lead, company, buildDraftStepsFromSequence as never)
}

/**
 * How many people's stored copies differ from the approved version (Vida shows it, so "0" can be
 * seen). Informational: a programme send uses the approved wording either way. `null` = unreadable.
 */
export async function countDifferingCopies(programmeId: string): Promise<number | null> {
  const { data: p, error: pErr } = await db.from('programmes')
    .select('client_id, review_preparation_hash, approved_preparation_hash, review_preparation_snapshot').eq('id', programmeId).maybeSingle()
  if (pErr || !p) return null
  const prog = p as Programme
  const steps = Array.isArray(prog.review_preparation_snapshot?.steps) ? prog.review_preparation_snapshot!.steps as SequenceStep[] : []
  let company: string | null = null
  if (prog.client_id) {
    const { data: c, error: cErr } = await db.from('clients').select('company_name').eq('id', prog.client_id).maybeSingle()
    if (cErr) return null
    company = (c as { company_name?: string | null } | null)?.company_name ?? null
  }
  const { buildDraftStepsFromSequence } = await import('./sequence-apply')
  let differ = 0
  for (let from = 0; ; from += 500) {
    const { data: rows, error } = await db.from('figsy_enrollments')
      .select('lead_id, steps').eq('programme_id', programmeId).in('status', ['enrolled', 'in_progress']).range(from, from + 499)
    if (error) return null
    const list = (rows ?? []) as { lead_id: string; steps: { subject?: string; body?: string }[] | null }[]
    if (!list.length) break
    const { data: leads, error: lErr } = await db.from('leads')
      .select('id, first_name, last_name, company, job_title, industry').in('id', list.map(r => r.lead_id))
    if (lErr) return null
    const byId = new Map(((leads ?? []) as (StepLead & { id: string })[]).map(l => [l.id, l]))
    for (const r of list) {
      const lead = byId.get(r.lead_id)
      if (!lead) { differ++; continue }
      const want = buildDraftStepsFromSequence(steps, lead as never, company)
      const have = Array.isArray(r.steps) ? r.steps : []
      if (want.length !== have.length || want.some((w, i) => w.subject !== have[i]?.subject || w.body !== have[i]?.body)) differ++
    }
    if (list.length < 500) break
  }
  return differ
}
