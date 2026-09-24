// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 24 Sep — REWRITE A PROGRAMME'S MESSAGES BEFORE THE CLIENT HAS APPROVED THEM.
//
// ── WHY THIS EXISTS ─────────────────────────────────────────────────────────────────────
//
// The founder's House walk reached Milla's Approval screen with copy that named one sample
// prospect and was signed by an invented person. #2320 stopped new copy leaking — and could
// not reach the copy already written, because three rules, each right on its own, met:
//
//   • the generator never overwrites an existing sequence (an operator's edit must survive)
//   • every prepared person stores their OWN filled-in copy (`figsy_enrollments.steps`)
//   • nothing moves a programme back out of READY_FOR_APPROVAL
//
// So a bad package waiting for approval could only be approved as it was. This is the one door.
//
// ── WHAT IT MAY TOUCH, AND ONLY WHEN ────────────────────────────────────────────────────
//
// 🛑 ONLY A PACKAGE NOBODY HAS AGREED TO AND NOTHING HAS LEFT. The programme is
// READY_FOR_APPROVAL, has never been approved, is not paused — and not one email has been
// sent for it: no `figsy_sent_emails` row on its campaign, and every enrolment still `enrolled`
// at step 0. Any of those false and nothing is written. Approved work is never rewritten in
// place; that is the rule `refreezeForReview` also holds.
//
// ── WHAT IT DOES ────────────────────────────────────────────────────────────────────────
//
//   1. writes new words through the SAME generator preparation uses (and its leak guard and
//      quality rules) — a refusal there changes nothing at all
//   2. rebuilds each prepared person's stored copy from the new words, still guarded on
//      "never sent" row by row
//   3. re-freezes, so the client is shown a NEW version and asked again
//
// ⚠️ IT APPROVES NOTHING, CHARGES NOTHING, SENDS NOTHING AND MOVES NO STATUS.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

export type RewriteResult =
  | { ok: true; rewritten: number; version: number | null; sequenceName: string }
  | { ok: false; code: 'not_found' | 'wrong_state' | 'already_sent' | 'unreadable' | 'generation_refused' | 'partial'; reason: string }

type EnrolmentRow = { id: string; lead_id: string; status: string | null; current_step: number | null }
type LeadRow = { id: string; first_name: string | null; last_name: string | null; company: string | null; job_title: string | null; industry: string | null }

const PAGE = 500

export async function rewriteProgrammeMessages(programmeId: string): Promise<RewriteResult> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!id) return { ok: false, code: 'not_found', reason: 'A programme id is required. Nothing was changed.' }

  const { getProgramme } = await import('./programme')
  let p: Awaited<ReturnType<typeof getProgramme>>
  try { p = await getProgramme(id) }
  catch (err) { return { ok: false, code: 'unreadable', reason: `The programme could not be read (${err instanceof Error ? err.message : String(err)}). Nothing was changed.` } }
  if (!p) return { ok: false, code: 'not_found', reason: 'No such programme. Nothing was changed.' }

  if (p.status !== 'READY_FOR_APPROVAL') {
    return { ok: false, code: 'wrong_state', reason: `This programme is ${p.status}. Messages can only be rewritten while the client has not yet approved them. Nothing was changed.` }
  }
  if (p.approved_at) return { ok: false, code: 'wrong_state', reason: 'This programme has been approved, so its messages are not rewritten in place. Nothing was changed.' }
  if (p.paused_at) return { ok: false, code: 'wrong_state', reason: 'This programme is paused, so nothing was rewritten.' }

  const { resolveProgrammeChain } = await import('./programme-chain')
  const chainRes = await resolveProgrammeChain(id)
  if (!chainRes.ok) return { ok: false, code: 'unreadable', reason: `${chainRes.degraded} Nothing was changed.` }
  const { clientId, campaignId } = chainRes.chain
  if (!campaignId) return { ok: false, code: 'wrong_state', reason: 'This programme has no campaign, so there are no messages to rewrite. Nothing was changed.' }

  // ── 🛑 NOTHING MAY HAVE LEFT ───────────────────────────────────────────────────────────
  const { count: sentCount, error: sentErr } = await db.from('figsy_sent_emails')
    .select('id', { count: 'exact', head: true }).eq('campaign_id', campaignId)
  if (sentErr) return { ok: false, code: 'unreadable', reason: `Whether anything was sent could not be read (${sentErr.message}), so nothing was changed.` }
  if ((sentCount ?? 0) > 0) {
    return { ok: false, code: 'already_sent', reason: `${sentCount} email(s) have already been sent for this programme, so its messages are not rewritten. Nothing was changed.` }
  }

  const enrolments: EnrolmentRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from('figsy_enrollments')
      .select('id, lead_id, status, current_step').eq('programme_id', id)
      .order('id', { ascending: true }).range(from, from + PAGE - 1)
    if (error) return { ok: false, code: 'unreadable', reason: `The prepared people could not be read (${error.message}). Nothing was changed.` }
    const rows = (data ?? []) as EnrolmentRow[]
    enrolments.push(...rows)
    if (rows.length < PAGE) break
  }
  const started = enrolments.filter(e => (e.current_step ?? 0) > 0 || (e.status ?? 'enrolled') !== 'enrolled')
  if (started.length > 0) {
    return { ok: false, code: 'already_sent', reason: `${started.length} prepared person(s) have already started or left the sequence, so its messages are not rewritten. Nothing was changed.` }
  }

  // ── 1 · NEW WORDS, THROUGH THE ONE GENERATOR ───────────────────────────────────────────
  const { generateProgrammeSequence } = await import('./programme-sequence-generation')
  const gen = await generateProgrammeSequence(id, { replaceExisting: true })
  if (!gen.ok) return { ok: false, code: 'generation_refused', reason: `${gen.reason}` }

  const after = await resolveProgrammeChain(id)
  if (!after.ok || !after.chain.sequenceId || after.chain.steps.length === 0) {
    return { ok: false, code: 'partial', reason: 'The new messages were written but could not be read back, so the prepared people were NOT updated and nothing was re-frozen. Press again.' }
  }
  const steps = after.chain.steps

  // ── 2 · EVERY PREPARED PERSON'S OWN COPY ───────────────────────────────────────────────
  const { data: clientRow } = await db.from('clients').select('company_name').eq('id', clientId).maybeSingle()
  const senderCompany = (clientRow as { company_name?: string | null } | null)?.company_name ?? null
  const { buildDraftFromSequence, buildDraftStepsFromSequence } = await import('./sequence-apply')

  let rewritten = 0
  const failed: string[] = []
  for (let i = 0; i < enrolments.length; i += 100) {
    const slice = enrolments.slice(i, i + 100)
    const { data: leadRows, error: leadErr } = await db.from('leads')
      .select('id, first_name, last_name, company, job_title, industry')
      .in('id', slice.map(e => e.lead_id))
    if (leadErr) { failed.push(...slice.map(e => e.id)); continue }
    const leads = new Map(((leadRows ?? []) as LeadRow[]).map(l => [l.id, l]))
    await Promise.all(slice.map(async e => {
      const lead = leads.get(e.lead_id)
      if (!lead) { failed.push(e.id); return }
      const full = buildDraftStepsFromSequence(steps, lead, senderCompany)
      const draft = buildDraftFromSequence(steps, lead, senderCompany)
      if (full.length === 0 || !draft) { failed.push(e.id); return }
      // 🛑 STILL "NEVER SENT", ROW BY ROW. A send that raced the check above leaves its row alone.
      const { data: upd, error } = await db.from('figsy_enrollments')
        .update({
          sequence_id: after.chain.sequenceId,
          steps: full, total_steps: full.length,
          step1_subject: draft.step1.subject, step1_body: draft.step1.body,
          step2_subject: draft.step2.subject, step2_body: draft.step2.body,
          step3_subject: draft.step3.subject, step3_body: draft.step3.body,
          updated_at: new Date().toISOString(),
        })
        .eq('id', e.id).eq('programme_id', id).eq('current_step', 0).eq('status', 'enrolled')
        .select('id')
      if (error || !upd || (upd as unknown[]).length !== 1) { failed.push(e.id); return }
      rewritten++
    }))
  }

  // ⚠️ A HALF-REWRITTEN DESK IS NEVER FROZEN. The snapshot shows the new words; people still
  // holding the old copy would send the old words under the new version's approval.
  if (failed.length > 0) {
    return {
      ok: false, code: 'partial',
      reason: `New messages were written and ${rewritten} of ${enrolments.length} prepared people were updated, but ${failed.length} could not be. Nothing was re-frozen, so the client cannot approve the mixed package. Press again to finish.`,
    }
  }

  // ── 3 · A NEW VERSION FOR THE CLIENT ───────────────────────────────────────────────────
  const { refreezeForReview } = await import('./programme')
  const frozen = await refreezeForReview(id)
  if (!frozen.ok) {
    return { ok: false, code: 'partial', reason: `The messages and all ${rewritten} prepared people were updated, but the new version could not be frozen: ${frozen.reason} Press again.` }
  }
  return { ok: true, rewritten, version: frozen.version, sequenceName: gen.name }
}
