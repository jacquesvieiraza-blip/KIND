// ═══════════════════════════════════════════════════════════════════════════════════════
// CHANGING THE WORDS OF A LIVE PROGRAMME — and approving them again (item 6 · #2544 · 4b).
//
// ⛓️ #2544 (R186 ②): House sent the AI's emails because the founder's approved 8 Sep emails only
// loaded when a Railway variable named the House programme, and it didn't. The founder: *"they
// fine. the emails are fine. its the layout in the email."* The fix: put the five approved
// emails on the LIVE House programme for every person — the people already emailed get the
// approved follow-ups next, the rest get the approved email 1 — then the founder approves them
// (Vida, R186 ③), then once in Milla, then he resumes House.
//
// ⛓️ R191 (2 Oct) 4b — "re-approve a live programme after a change". Until now a version could
// only be re-frozen and approved while READY_FOR_APPROVAL, so a live programme whose words
// changed could never be approved again. This adds that, narrowly:
//   · only on a LIVE programme that is PAUSED (nothing sends while its words change);
//   · the client approves the exact new version, and only after the founder has (founder first);
//   · nothing else about the programme moves — status, payments, run and people stay as they are.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

type Result = { ok: true; detail: string } | { ok: false; status: number; reason: string }

/** Re-freeze the review version of a LIVE, PAUSED programme so its new words can be approved. */
export async function refreezeLive(programmeId: string): Promise<Result & { version?: number | null }> {
  const { getProgramme } = await import('./programme')
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, status: 404, reason: 'No such programme.' }
  if (p.status !== 'LIVE') return { ok: false, status: 409, reason: `This programme is ${p.status}; this re-freeze is only for a live programme whose words changed.` }
  if (!p.paused_at) return { ok: false, status: 409, reason: 'Pause the programme first — its words are not changed while it can send.' }
  const { buildPreparationSnapshot } = await import('./preparation-snapshot')
  const built = await buildPreparationSnapshot(programmeId)
  if (!built.ok) return { ok: false, status: 503, reason: `The prepared work could not be described, so nothing was re-frozen. ${built.degraded}` }
  const cur = p as unknown as { review_preparation_hash?: string | null; review_preparation_version?: number | null }
  if (cur.review_preparation_hash === built.hash) return { ok: true, detail: 'Nothing changed, so there is no new version.', version: cur.review_preparation_version ?? null }
  const at = new Date().toISOString()
  const version = (cur.review_preparation_version ?? 0) + 1
  let q = db.from('programmes').update({
    review_preparation_hash: built.hash, review_preparation_snapshot: built.snapshot as unknown,
    review_preparation_at: at, review_preparation_version: version, updated_at: at,
  }).eq('id', programmeId).eq('status', 'LIVE')
  q = cur.review_preparation_hash ? q.eq('review_preparation_hash', cur.review_preparation_hash) : q.is('review_preparation_hash', null)
  const { data, error } = await q.select('id')
  if (error) return { ok: false, status: 503, reason: `The new version could not be saved (${error.message}). Nothing changed.` }
  if (!data || (data as unknown[]).length !== 1) return { ok: false, status: 409, reason: 'The programme changed while this ran. Press again.' }
  return { ok: true, detail: `Version ${version} is ready for the founder's approval, then the client's.`, version }
}

/** Does this live programme have a new version waiting for the client's re-approval? */
export function needsReapproval(p: { status: string; paused_at?: string | null; approved_at?: string | null; review_preparation_hash?: string | null; approved_preparation_hash?: string | null }): boolean {
  return p.status === 'LIVE' && !!p.paused_at && !!p.approved_at
    && !!p.review_preparation_hash && p.review_preparation_hash !== (p.approved_preparation_hash ?? null)
}

/** The client re-approves the exact new version of their LIVE, PAUSED programme. */
export async function reapproveLive(clientId: string, programmeId: string, version: string | null): Promise<Result> {
  const { getProgramme } = await import('./programme')
  const p = await getProgramme(programmeId)
  if (!p || p.client_id !== clientId) return { ok: false, status: 404, reason: 'No such programme.' }
  const row = p as unknown as { status: string; paused_at: string | null; approved_at: string | null; review_preparation_hash: string | null; approved_preparation_hash: string | null }
  if (!needsReapproval(row)) return { ok: false, status: 409, reason: 'There is no new version of this programme waiting for your approval.' }
  if (!version || version !== row.review_preparation_hash) {
    return { ok: false, status: 409, reason: 'This programme has been updated since you opened it. Take another look and approve the current version.' }
  }
  const { founderWordingApproved } = await import('./founder-approval')
  if (!(await founderWordingApproved(programmeId))) {
    return { ok: false, status: 409, reason: 'Our team is still checking these emails. You can approve them as soon as they appear here.' }
  }
  const { data, error } = await db.from('programmes')
    .update({ approved_preparation_hash: version, updated_at: new Date().toISOString() })
    .eq('id', programmeId).eq('status', 'LIVE').eq('approved_preparation_hash', row.approved_preparation_hash as string)
    .select('id')
  if (error) return { ok: false, status: 503, reason: `Your approval could not be saved (${error.message}). Nothing changed.` }
  if (!data || (data as unknown[]).length !== 1) return { ok: false, status: 409, reason: 'The programme changed while you were approving. Take another look.' }
  return { ok: true, detail: 'Approved. Your programme can be resumed.' }
}

/**
 * #2544 — put the founder's approved House emails on the LIVE House programme, for every person:
 * each one's remaining steps become the approved ones (people already emailed keep their place),
 * then the programme is re-frozen for the founder's and then House's approval.
 */
export async function applyHouseApprovedEmails(programmeId: string): Promise<Result> {
  const { getProgramme } = await import('./programme')
  const p = await getProgramme(programmeId)
  if (!p) return { ok: false, status: 404, reason: 'No such programme.' }
  const { audienceForClientStrict } = await import('./provider-boundary')
  if ((await audienceForClientStrict(p.client_id)) !== 'house') {
    return { ok: false, status: 409, reason: 'These are House\'s own approved emails; they are never put on another client\'s programme. Nothing was changed.' }
  }
  if (p.status !== 'LIVE' || !p.paused_at) return { ok: false, status: 409, reason: 'Pause House\'s live programme first. Nothing was changed.' }

  // ⚑ 3 Oct (review B2 · R189 ⑥ — *"our house account needs to end with the Milla & Vida Team"*):
  // the 8 Sep emails carry no sign-off, so they are signed here, exactly as the launch path signs
  // them (`applyHouseProgrammeSequence`). The opt-out and legal lines are added at send time.
  const { HOUSE_SEQUENCE_STEPS } = await import('./house-sequence')
  const { ensureSignOff } = await import('./sequence-tokens')
  const { HOUSE_SIGN_OFF } = await import('./house-client')
  const steps = HOUSE_SEQUENCE_STEPS.map(s => ({ ...s, body: ensureSignOff(s.body, HOUSE_SIGN_OFF) }))
  const { applyProgrammeSequence } = await import('./programme-sequence')
  const applied = await applyProgrammeSequence(programmeId, steps, 'House programme sequence')
  if (!applied.ok) return { ok: false, status: 409, reason: applied.reason }

  const { data: client } = await db.from('clients').select('company_name').eq('id', p.client_id).maybeSingle()
  const company = (client as { company_name?: string | null } | null)?.company_name ?? null
  const { buildDraftStepsFromSequence } = await import('./sequence-apply')
  const { data: enr, error: enrErr } = await db.from('figsy_enrollments')
    .select('id, lead_id').eq('programme_id', programmeId).in('status', ['enrolled', 'in_progress'])
  if (enrErr) return { ok: false, status: 503, reason: `The people could not be read (${enrErr.message}). The approved emails are on the programme, but nobody's next email was changed.` }
  const rows = (enr ?? []) as { id: string; lead_id: string }[]
  let updated = 0
  const failed: string[] = []
  for (let i = 0; i < rows.length; i += 100) {
    const slice = rows.slice(i, i + 100)
    const { data: leads } = await db.from('leads').select('id, first_name, last_name, company, job_title, industry').in('id', slice.map(r => r.lead_id))
    const byId = new Map(((leads ?? []) as { id: string }[]).map(l => [l.id, l]))
    for (const r of slice) {
      const lead = byId.get(r.lead_id)
      const full = lead ? buildDraftStepsFromSequence(steps as never, lead as never, company) : []
      if (!full.length) { failed.push(r.id); continue }
      const { error } = await db.from('figsy_enrollments').update({
        sequence_id: applied.sequenceId, steps: full, total_steps: full.length, updated_at: new Date().toISOString(),
      }).eq('id', r.id).eq('programme_id', programmeId)
      if (error) failed.push(r.id); else updated++
    }
  }
  const frozen = await refreezeLive(programmeId)
  if (!frozen.ok) return { ok: false, status: frozen.status, reason: `The approved emails are on ${updated} people, but the new version could not be frozen: ${frozen.reason}` }
  return {
    ok: true,
    detail: `The approved emails are on ${updated} of ${rows.length} people${failed.length ? ` (${failed.length} could not be updated — try again)` : ''}. ${frozen.detail} Approve them in Vida, then in Milla, then resume House.`,
  }
}
