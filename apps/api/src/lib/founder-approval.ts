// ═══════════════════════════════════════════════════════════════════════════════════════
// THE FOUNDER APPROVES THE WORDING BEFORE IT REACHES ANYONE.
//
// ⛓️ R186 ③ (2 Oct, card #2542): *"i want to review the sequence and campaign wording for now.
// this is a stage gate approval needed by me in vida."* · once per sequence, as a whole:
// *"A. lock"* · founder first: *"A. lock"*. R191 (2 Oct): four PRs — this is 4a.
//
// THE RULE, AS CODE:
//   · An approval is recorded against the EXACT version the founder saw — the programme's
//     frozen preparation (`review_preparation_hash`), which holds the emails and the people.
//     A rewrite, an edit or a new batch is a new version, so it comes back to him.
//   · Nothing sends for a version he has not approved — for any client, House included, and for
//     every sequence already built.
//   · Batch 2: only the NEW people wait. A follow-up to someone already emailed keeps going, as
//     long as the WORDING is one he approved (`wording_hash`).
//   · The gate stays on until he turns it off: Railway `FOUNDER_WORDING_GATE=off`.
//   · Unreadable → refused. A gate that opens when it cannot read is not a gate.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { createHash } from 'crypto'

export const FOUNDER_APPROVAL_MIGRATION = '20261002_founder_wording_approval'

export function founderGateOn(env: Record<string, string | undefined> = process.env): boolean {
  return (env.FOUNDER_WORDING_GATE ?? '').trim().toLowerCase() !== 'off'
}

/** A hash of the WORDING alone (subjects, bodies, waits) — not the people. */
export function wordingHash(steps: unknown): string {
  const list = Array.isArray(steps) ? steps as Record<string, unknown>[] : []
  const norm = list.map(st => ({ subject: String(st.subject ?? ''), body: String(st.body ?? ''), wait_days: Number(st.wait_days ?? 0) }))
  return createHash('sha256').update(JSON.stringify(norm)).digest('hex')
}

export type FounderApprovalRow = { snapshot_hash: string; wording_hash: string }

/** The pure decision. */
export function founderVerdict(a: {
  gateOn: boolean
  version: string | null
  wording: string | null
  approvals: FounderApprovalRow[]
  followUp: boolean
}): { allowed: true } | { allowed: false; message: string } {
  if (!a.gateOn) return { allowed: true }
  if (!a.version) return { allowed: false, message: 'Nothing has been prepared for the founder to approve yet, so nothing may be sent.' }
  if (a.approvals.some(r => r.snapshot_hash === a.version)) return { allowed: true }
  if (a.followUp && a.wording && a.approvals.some(r => r.wording_hash === a.wording)) return { allowed: true }
  return {
    allowed: false,
    message: a.approvals.length === 0
      ? 'The founder has not approved these emails yet (R186). Nothing is sent until he approves them in Vida → the client → Programme.'
      : 'This version (new wording or new people) has not been approved by the founder yet (R186). Follow-ups to people already emailed continue; nothing new is sent until he approves it in Vida.',
  }
}

/** Read and decide for one programme. */
export async function founderApprovalVerdict(programmeId: string, followUp: boolean): Promise<{ allowed: true } | { allowed: false; message: string }> {
  if (!founderGateOn()) return { allowed: true }
  const { db } = await import('@kind/db')
  const { data: p, error: pErr } = await db.from('programmes')
    .select('review_preparation_hash, review_preparation_snapshot').eq('id', programmeId).maybeSingle()
  if (pErr) return { allowed: false, message: `The programme's prepared version could not be read (${pErr.message}), so nothing may be sent.` }
  const row = p as { review_preparation_hash?: string | null; review_preparation_snapshot?: { steps?: unknown } | null } | null
  const { data: approvals, error } = await db.from('founder_wording_approvals')
    .select('snapshot_hash, wording_hash').eq('programme_id', programmeId)
  if (error) {
    return { allowed: false, message: `The founder's approvals could not be read (${error.message}). If the table is missing, run migration ${FOUNDER_APPROVAL_MIGRATION} from the Vida migration runner. Nothing may be sent until then.` }
  }
  return founderVerdict({
    gateOn: true,
    version: row?.review_preparation_hash ?? null,
    wording: row?.review_preparation_snapshot ? wordingHash(row.review_preparation_snapshot.steps) : null,
    approvals: (approvals ?? []) as FounderApprovalRow[],
    followUp,
  })
}

/** Record the founder's approval of the version he is looking at. Refuses a stale version. */
export async function recordFounderApproval(programmeId: string, version: string, by: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { db } = await import('@kind/db')
  const { data: p, error: pErr } = await db.from('programmes')
    .select('review_preparation_hash, review_preparation_snapshot').eq('id', programmeId).maybeSingle()
  if (pErr) return { ok: false, status: 503, error: `The programme could not be read (${pErr.message}). Nothing was approved.` }
  const row = p as { review_preparation_hash?: string | null; review_preparation_snapshot?: { steps?: unknown } | null } | null
  if (!row?.review_preparation_hash) return { ok: false, status: 409, error: 'Nothing has been prepared yet, so there is nothing to approve.' }
  if (row.review_preparation_hash !== version) {
    return { ok: false, status: 409, error: 'The emails changed while you were reading them. Reload, read the new version, and approve that one.' }
  }
  const { error } = await db.from('founder_wording_approvals').upsert({
    programme_id: programmeId, snapshot_hash: version,
    wording_hash: wordingHash(row.review_preparation_snapshot?.steps), approved_by: by,
  }, { onConflict: 'programme_id,snapshot_hash', ignoreDuplicates: true })
  if (error) return { ok: false, status: 503, error: `Your approval could not be saved (${error.message}). If the table is missing, run migration ${FOUNDER_APPROVAL_MIGRATION}.` }
  return { ok: true }
}

/** ⚑ 4c — has the founder approved the programme's CURRENT version? Gate off → yes; unreadable → no. */
export async function founderWordingApproved(programmeId: string): Promise<boolean> {
  if (!founderGateOn()) return true
  const { db } = await import('@kind/db')
  const { data: p, error: pErr } = await db.from('programmes').select('review_preparation_hash').eq('id', programmeId).maybeSingle()
  const version = (p as { review_preparation_hash?: string | null } | null)?.review_preparation_hash
  if (pErr || !version) return false
  const { data, error } = await db.from('founder_wording_approvals').select('snapshot_hash').eq('programme_id', programmeId).eq('snapshot_hash', version)
  return !error && (data ?? []).length > 0
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (#2542 · R189 ⑧ · 4d) — A CLIENT WAITING ON THE FOUNDER'S APPROVAL IS NOT LEFT WAITING.
//
// R189 ⑧: pay first, with a one-working-day founder check and an alert. A client who has paid
// and whose emails are prepared is waiting on the founder; past one working day he is told, once
// per version (one Needs-you task, and an email only when that task is new).
// ═══════════════════════════════════════════════════════════════════════════════════════

/** `from` plus one working day (Mon–Fri), in UTC. */
export function oneWorkingDayAfter(from: Date): Date {
  const d = new Date(from.getTime() + 86_400_000)
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6) d.setTime(d.getTime() + 86_400_000)
  return d
}

export async function alertFounderApprovalWaits(now: Date): Promise<{ ok: boolean; waiting: number }> {
  if (!founderGateOn()) return { ok: true, waiting: 0 }
  const { db } = await import('@kind/db')
  const { TERMINAL_STATUSES } = await import('./programme')
  const { data: progs, error } = await db.from('programmes')
    .select('id, client_id, review_preparation_hash, review_preparation_at')
    .not('review_preparation_hash', 'is', null)
    .not('status', 'in', `(${TERMINAL_STATUSES.join(',')})`)
  if (error) return { ok: false, waiting: 0 }
  let waiting = 0
  for (const p of (progs ?? []) as { id: string; client_id: string; review_preparation_hash: string; review_preparation_at: string | null }[]) {
    if (!p.review_preparation_at || oneWorkingDayAfter(new Date(p.review_preparation_at)) > now) continue
    if (await founderWordingApproved(p.id)) continue
    waiting++
    const key = `founder_approval_wait:${p.id}:${p.review_preparation_hash}`
    const title = 'A client has waited over a working day for your approval of their emails'
    const lines = [
      `Client ${p.client_id} · programme ${p.id}. Prepared ${p.review_preparation_at}.`,
      'Nothing is sent and the client cannot see their emails until you approve them in Vida → the client → Programme.',
    ]
    const { raiseOperatorTask } = await import('./operator-tasks')
    const t = await raiseOperatorTask({ kind: 'support_escalation', severity: 'warn', title, detail: lines.join('\n'), clientId: p.client_id, programmeId: p.id, dedupeKey: key })
    if (t.ok && t.alreadyOpen) continue
    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert('support_escalation', title, lines, { clientId: p.client_id, programmeId: p.id, dedupeKey: key })
  }
  return { ok: true, waiting }
}
