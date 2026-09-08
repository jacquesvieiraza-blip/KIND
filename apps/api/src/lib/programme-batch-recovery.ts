// ═══════════════════════════════════════════════════════════════════════════════════════
// QUALIFY AND SETTLE ONE PROGRAMME'S ATTEMPT — the recovery for work that ran unaccounted.
//
// 🛑 WHAT IT IS FOR. 246 real people were sourced for the House launch programme while the
// House path bypassed the accounting entirely, so the programme reads `0 used · no batch`
// about a run that happened. Those 246 are CANDIDATES: obtained, attributed, and never judged
// against the customer's ICP. This judges them in place, settles the attempt on the QUALIFIED
// count, and puts the qualified ones in front of the customer.
//
// ── THE ORDER, AND WHY EACH STEP CANNOT MOVE ────────────────────────────────────────────
//
//   ① resolve the exact programme, its client and its ATTACHED ICP   (nothing inferred)
//   ② find the batch-less candidates                                  (never sources anybody)
//   ③ qualify them — stored facts first, one reveal only where needed
//   ④ STOP if anything is still unjudged                              (never settle a guess)
//   ⑤ settle: one batch, every candidate stamped, used = qualified
//   ⑥ surface the qualified rows only
//
// ⚠️ ④ IS THE WHOLE SAFETY ARGUMENT. A provider outage mid-way leaves verdicts written and a
// remainder unjudged; settling then would convert a half-finished judgement into the
// customer's permanently consumed ceiling. The RPC refuses too — two independent guards —
// and a retry skips everything already judged, so the second attempt costs nothing extra.
//
// ⚠️ IT SOURCES NOBODY. There is no People Search, no PDL, no Hunter, no waterfall and no
// phone reveal on this path. The single provider door is `bulkMatchEmails`, reached only for a
// candidate whose stored facts cannot answer the ICP.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { QualifyOutcome } from './programme-qualification'

export interface QualifyBatchReport extends QualifyOutcome {
  programme_id: string
  client_id: string
  icp_id: string
  /** True once the attempt was settled on this call. */
  settled: boolean
  /** The batch the attempt now belongs to, when it was settled. */
  batch_id: string | null
  /** What the settle consumed — read back from the programme, never assumed. */
  used: number | null
  reserved: number | null
  remaining: number | null
  status_before: string
  status_after: string
  surfaced: number
  headline: string
}

export type QualifyBatchResult =
  | { ok: true; report: QualifyBatchReport }
  | { ok: false; reason: string; partial?: QualifyOutcome }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Judge, settle and surface one programme's unaccounted attempt.
 *
 * ⚠️ EVERY REFUSAL PRESERVES COMPLETED WORK. Verdicts already written are never rolled back —
 * they are what a retry is allowed to skip, and what stops the same reveal being paid for
 * twice.
 */
export async function qualifyAndSettleBatch(programmeId: unknown): Promise<QualifyBatchResult> {
  const id = typeof programmeId === 'string' ? programmeId.trim() : ''
  if (!UUID.test(id)) {
    return { ok: false, reason: 'A programme id is required, and it must be the exact uuid of the programme. Nothing was read, judged or changed — this action never resolves a programme from a client, a name or an ordering.' }
  }

  // ── ① THE PROGRAMME, ITS CLIENT AND ITS ATTACHED ICP ────────────────────────────────
  const { data: prog, error: progErr } = await db.from('programmes')
    .select('id, client_id, status, sourcing_ceiling, sourced_used, sourced_reserved')
    .eq('id', id).maybeSingle()
  if (progErr) return { ok: false, reason: `This programme's row could not be read (${progErr.message}). Nothing was changed.` }
  if (!prog) return { ok: false, reason: 'There is no programme with that id. Nothing was changed.' }
  const p = prog as { client_id: string; status: string; sourcing_ceiling: number; sourced_used: number; sourced_reserved: number }
  const statusBefore = String(p.status)

  // 🛑 THE ICP COMES FROM `icps.programme_id`, never from the client. A client may hold more
  // than one ICP and "the active one" is a different question that has answered wrongly
  // before. Ambiguity refuses rather than picking.
  const { data: icps, error: icpErr } = await db.from('icps')
    .select('id, client_id, name, geographies').eq('programme_id', id)
  if (icpErr) return { ok: false, reason: `This programme's targeting could not be read (${icpErr.message}). Nothing was changed.` }
  const icpRows = ((icps ?? []) as { id: string; client_id: string | null; name: string | null; geographies: string[] | null }[])
    .filter(r => r.client_id === p.client_id)
  if (icpRows.length === 0) {
    return { ok: false, reason: 'No targeting is attached to this programme, so there is no ICP to qualify its candidates against. Nothing was changed.' }
  }
  if (icpRows.length > 1) {
    return { ok: false, reason: `This programme has ${icpRows.length} attached ICPs, so which criteria its candidates should be judged against is ambiguous. Nothing was changed.` }
  }
  const icp = icpRows[0]

  // ── ①b EVERY IDENTITY THIS ACTION WILL QUERY BY IS A UUID, PROVED BEFORE IT IS USED ──
  //
  // 🛑 THE ORDER IS THE GUARANTEE: identity → candidate population → provider work. An id
  // that cannot be an id must stop the action HERE, where nothing has been read, nothing has
  // been judged and no reveal has been paid for. `programmeId` was already checked at the top;
  // these two arrive from ROWS, and a row can hold an empty string where a uuid was meant.
  //
  // ⚠️ IT REFUSES, IT DOES NOT REPAIR. No newest client, no first ICP, no "the one that
  // matches by name" — substituting an identity here would write permanent verdicts on
  // somebody else's terms, which is the failure every guard in this module exists to prevent.
  const clientId = String(p.client_id ?? '').trim()
  if (!UUID.test(clientId)) {
    return { ok: false, reason: `This programme does not name a readable client (${JSON.stringify(p.client_id)}), so whose candidates these are cannot be established. Nothing was read, judged or changed — and no client is ever substituted for a missing one.` }
  }
  const icpId = String(icp.id ?? '').trim()
  if (!UUID.test(icpId)) {
    return { ok: false, reason: `The targeting attached to this programme does not carry a readable id (${JSON.stringify(icp.id)}), so its criteria cannot be established. Nothing was read, judged or changed — and no other ICP is ever substituted for it.` }
  }

  // 🛑 THE AUDIENCE DECIDES ONE ICP RULE, AND IT IS PROVED, NOT INFERRED. House requires a
  // provider-VERIFIED business address; `audienceForClientStrict` answers from the AUTH USER
  // and THROWS rather than guessing. A throw refuses the whole action: judging against the
  // wrong criteria would write permanent verdicts on somebody else's terms.
  let requireVerifiedBusinessEmail: boolean
  try {
    const { audienceForClientStrict } = await import('./provider-boundary')
    requireVerifiedBusinessEmail = (await audienceForClientStrict(clientId)) === 'house'
  } catch (err) {
    return { ok: false, reason: `This client's audience could not be proved (${err instanceof Error ? err.message : String(err)}), so the ICP's verification rule is unknown. Nothing was judged or changed.` }
  }

  // ── ② THE CANDIDATES — batch-less, this programme, this client. NEVER SOURCED. ───────
  //
  // 🛑 9 Sep — THE PRODUCTION FAILURE THIS LOOP CAUSED, AND THE FIX.
  // `let after = ''` seeded a KEYSET CURSOR with an empty string, and the first page therefore
  // asked Postgres for `id > ''`. `leads.id` is `uuid`, so the cast failed before a single row
  // was considered: *invalid input syntax for type uuid: ""*. The House programme could not be
  // qualified at all — not because anything was wrong with its data, but because page one of
  // the read was malformed. An empty string is not a cursor; it is the ABSENCE of one, and the
  // two are only interchangeable on a `text` column.
  //
  // ⚠️ THE CURSOR IS NOW `null` UNTIL A ROW SUPPLIES ONE, and the predicate is omitted rather
  // than sent empty. There is no page-zero sentinel to get wrong, because there is no page-zero
  // predicate.
  const candidateIds: string[] = []
  let after: string | null = null
  for (let page = 0; page < 40; page++) {
    let q = db.from('leads')
      .select('id')
      .eq('programme_id', id)
      .eq('client_id', clientId)
      .is('batch_id', null)
    if (after !== null) q = q.gt('id', after)
    const { data, error } = await q
      .order('id', { ascending: true })
      .limit(500)
    if (error) return { ok: false, reason: `This programme's candidates could not be read (${error.message}). Nothing was judged or changed.` }
    const rows = (data ?? []) as { id: string }[]
    if (rows.length === 0) break
    candidateIds.push(...rows.map(r => r.id))
    after = rows[rows.length - 1].id
    if (rows.length < 500) break
  }

  if (candidateIds.length === 0) {
    return { ok: false, reason: 'This programme has no unaccounted candidates — every prospect it sourced already belongs to a batch. Nothing was changed.' }
  }

  // ── ③ QUALIFY ───────────────────────────────────────────────────────────────────────
  const { qualifyCandidates } = await import('./programme-qualification')
  const q = await qualifyCandidates(clientId, candidateIds, {
    geographies: (icp.geographies ?? []).filter(Boolean),
    requireVerifiedBusinessEmail,
  })

  // ── ④ NEVER SETTLE A PARTIAL JUDGEMENT ──────────────────────────────────────────────
  if (q.provider_failed || q.still_unjudged > 0) {
    return {
      ok: false,
      partial: q,
      reason: `Qualification did not finish: ${q.still_unjudged} candidate(s) still have no verdict${q.provider_failed ? ' after a provider failure' : ''}. NOTHING was settled and no counter moved — the ${q.qualified + q.disqualified} verdict(s) already written are kept, and running this again will skip them and cost nothing extra for those. Re-run when the provider is available.`,
    }
  }

  // ── ⑤ SETTLE — the RPC counts qualified, stamps every candidate, refuses an unjudged one ──
  const { data: rpcData, error: rpcErr } = await db.rpc('reconcile_programme_sourcing', { p_programme_id: id })
  if (rpcErr) {
    return { ok: false, partial: q, reason: `The attempt could not be settled and nothing was changed by the settle: ${rpcErr.message}. Every verdict written above is kept.` }
  }
  if (typeof rpcData !== 'number' || !Number.isFinite(rpcData)) {
    return { ok: false, partial: q, reason: `The settle did not return a count (got ${JSON.stringify(rpcData)}), so what it did is UNKNOWN — do not run this again until the programme's counters and batches have been read.` }
  }

  // Read back, never derived: the row is the truth and an arithmetic answer can never be wrong.
  const { data: post } = await db.from('programmes')
    .select('status, sourcing_ceiling, sourced_used, sourced_reserved').eq('id', id).maybeSingle()
  const pr = (post ?? null) as { status?: string; sourcing_ceiling?: number; sourced_used?: number; sourced_reserved?: number } | null
  const used = pr ? Number(pr.sourced_used ?? 0) : null
  const reserved = pr ? Number(pr.sourced_reserved ?? 0) : null
  const remaining = pr ? Math.max(0, Number(pr.sourcing_ceiling ?? 0) - Number(pr.sourced_used ?? 0) - Number(pr.sourced_reserved ?? 0)) : null

  const { data: batchRows } = await db.from('programme_batches')
    .select('id, seq').eq('programme_id', id).order('seq', { ascending: false }).limit(1)
  const batchId = ((batchRows ?? []) as { id: string }[])[0]?.id ?? null

  // ── ⑥ SURFACE THE QUALIFIED ROWS ONLY ───────────────────────────────────────────────
  let surfaced = 0
  let surfaceNote = ''
  if (batchId) {
    const { surfaceQualifiedBatch } = await import('./programme-surfacing')
    const s = await surfaceQualifiedBatch(id, clientId, batchId)
    if (s.ok) surfaced = s.surfaced
    else surfaceNote = ` The review set was NOT put in front of the customer: ${s.reason}`
  } else {
    surfaceNote = ' The settled batch could not be re-read, so nothing was surfaced.'
  }

  return {
    ok: true,
    report: {
      ...q,
      programme_id: id,
      client_id: clientId,
      icp_id: icp.id,
      settled: true,
      batch_id: batchId,
      used, reserved, remaining,
      status_before: statusBefore,
      status_after: String(pr?.status ?? statusBefore),
      surfaced,
      headline:
        `${q.candidates_total} candidate(s) judged against ${icp.name ?? 'the attached targeting'}: ` +
        `${q.qualified} qualified, ${q.disqualified} disqualified` +
        `${Object.keys(q.reasons).length ? ` (${Object.entries(q.reasons).map(([k, v]) => `${k} ${v}`).join(', ')})` : ''}. ` +
        `${rpcData} prospect(s) now consume programme entitlement — ${used} used · ${reserved} reserved · ${remaining} left. ` +
        `${surfaced} qualified prospect(s) are on the customer's review desk.${surfaceNote} ` +
        `${statusBefore === String(pr?.status ?? statusBefore) ? `Status is unchanged (${statusBefore}).` : `Status moved ${statusBefore} → ${pr?.status}.`} ` +
        `Provider: ${q.provider_reveals_attempted} reveal(s) attempted, ${q.provider_reveals_succeeded} answered, ${q.already_judged} candidate(s) already judged and skipped. ` +
        'Nobody was sourced, no approval was given, no Payment 2 was taken and nothing was sent.',
    },
  }
}
