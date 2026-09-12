// ═══════════════════════════════════════════════════════════════════════════════════════
// DURABLE PROOF AUTHORITY — the server side of `20260912_proof_pass_claims`.
//
// ── WHAT THIS REPLACES ─────────────────────────────────────────────────────────────────
//
// `try_claim_proof_pass` incremented `clients.proof_passes_done` and NOTHING ANYWHERE
// RELEASED IT. A run that crashed at the PDL boundary — with `PAID_PROVIDERS_ENABLED`
// unset, the fail-closed default and the most likely production path — left the pass spent
// and the client with nothing.
//
// Authority is now CONSUMED at completion, HELD in flight and RETURNED on release. A
// duplicate or a retry arriving while a claim is held cannot reach the NEXT authority,
// because it cannot claim anything at all: that is the residual the founder refused when he
// rejected a decrement ("Do not knowingly ship the residual").
//
// ⚠️ THE AUTHORITY LIVES IN THE DATABASE, NOT HERE. Three unique partial indexes decide it;
// these functions are a typed seam over two RPCs. Nothing in this file may be read as
// permission — a refusal is always the database's.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { RunStatus } from './run-outcome'

/** The three doors, exactly as the `authority` CHECK names them. */
export type ProofAuthority = 'automatic_1' | 'automatic_2' | 'calibrated_restart'

/** How a claim ends. There is no third settlement: an unsettled claim stays OPEN. */
export type RunTerminal = 'completed' | 'released'

/**
 * 🛑 EVERY `icp_run_outcomes` STATUS MAPS TO A SETTLEMENT, AND THE MAP IS EXHAUSTIVE.
 *
 * A `Record<RunStatus, …>` rather than a switch with a default, deliberately: a seventh
 * status cannot be added to `RunStatus` without this object failing to compile. A default
 * would silently settle an unmapped outcome, and the direction it defaulted to would either
 * hand out a free pass or burn a real one.
 *
 * ⚠️ `failed` RELEASES, AND IT IS WRITTEN BY THREE DIFFERENT PATHS — only one of which
 * throws. The outer `.catch` in the proof route covers the crash; `runIcpJob` ALSO records
 * `failed` when the structural gate refuses a batch (leads inserted, none surfaced) and when
 * `deriveRunStatus` sees `searchCompleted === false`. Neither throws. Wiring settlement to
 * exceptions alone would have left both consuming the pass, which is the whole defect.
 *
 * ⚠️ `quota_exhausted` RELEASES because it is a refusal BEFORE any provider call: the funded-
 * account refusal and the no-budget refusal both record it and both spend nothing.
 *
 * ⚠️ `no_match` AND `audience_exhausted` COMPLETE. The query ran and answered truthfully, so
 * the client had their attempt. That is today's behaviour and this build does not change it.
 */
export const RUN_STATUS_TERMINAL: Record<RunStatus, RunTerminal> = {
  served:             'completed',
  no_match:           'completed',
  audience_exhausted: 'completed',
  demo:               'completed',
  failed:             'released',
  quota_exhausted:    'released',
}

export function terminalForRunStatus(status: RunStatus): RunTerminal {
  return RUN_STATUS_TERMINAL[status]
}

/** Why a claim was released. Recorded on the row so an operator can read the history. */
export type ReleaseReason =
  | 'run_failed'
  | 'refused_before_run'
  | 'run_threw'
  | 'operator_reconciled'

export type ClaimResult =
  | { ok: true; claimId: string; authority: ProofAuthority; pass: number; kind: 'automatic' | 'calibrated_restart' }
  | {
      ok: false
      /**
       * `in_flight`            — a claim is already held; nothing was granted or advanced.
       * `unclassified`         — historical automatic authority has not been classified.
       * `restart_unclassified` — a historical restart consumption has not been classified.
       * `restart_already_used` — the one calibrated restart is spent for ever (R119).
       * `exhausted`            — both automatic passes used and no restart granted.
       * `unreadable`           — the RPC itself failed; we know nothing, so we grant nothing.
       */
      reason: 'in_flight' | 'unclassified' | 'restart_unclassified' | 'restart_already_used'
            | 'exhausted' | 'unknown_client' | 'bad_args' | 'unreadable'
      detail?: string
    }

/**
 * Claim the next Proof authority, or be refused with a reason the route can turn into the
 * client sentence it already has.
 *
 * ⚠️ IT NEVER THROWS FOR AN ORDINARY REFUSAL, and an unreadable RPC answers `unreadable`
 * rather than falling through — a claim we could not make is a claim that did not happen.
 */
export async function claimProofAuthority(clientId: string, icpId: string | null): Promise<ClaimResult> {
  const { data, error } = await db.rpc('claim_proof_authority', {
    p_client_id: clientId,
    p_icp_id:    icpId,
  })
  if (error) {
    return { ok: false, reason: 'unreadable', detail: error.message }
  }
  const r = (data ?? null) as {
    ok?: boolean; claim_id?: string; authority?: string; pass?: number; kind?: string; reason?: string
  } | null
  if (!r) return { ok: false, reason: 'unreadable', detail: 'claim_proof_authority returned nothing' }
  if (r.ok === true && r.claim_id && r.authority) {
    return {
      ok: true,
      claimId:   r.claim_id,
      authority: r.authority as ProofAuthority,
      pass:      Number(r.pass ?? 0) || 0,
      kind:      r.kind === 'calibrated_restart' ? 'calibrated_restart' : 'automatic',
    }
  }
  const reason = (r.reason ?? 'unreadable') as Exclude<ClaimResult, { ok: true }>['reason']
  return { ok: false, reason }
}

/**
 * Settle a claim — COMPLETE (the authority is spent) or RELEASE (it returns).
 *
 * ⚠️ IDEMPOTENT BY CONSTRUCTION. The RPC's conditional UPDATE matches only `status = 'open'`,
 * so a double-settle, a retry and two racing settles produce exactly one transition and the
 * losers answer `not_open`. That is not an error and is not reported as one.
 */
export async function settleProofClaim(
  claimId: string, terminal: RunTerminal, reason?: ReleaseReason,
): Promise<{ settled: boolean; detail?: string }> {
  const { data, error } = await db.rpc('settle_proof_claim', {
    p_claim_id: claimId,
    p_status:   terminal,
    p_reason:   reason ?? null,
  })
  if (error) {
    // 🛑 A SETTLE WE COULD NOT PERSIST IS THE ONE FAILURE THAT MATTERS, because the claim
    // stays OPEN — which is the fail-closed direction (nothing is granted) but leaves the
    // client unable to retry until an operator reconciles it. Say so loudly; the caller
    // raises the alert, because this function must never depend on the write it just lost.
    console.error(`[proof-claim] settle FAILED for claim ${claimId} (${terminal}) — the claim stays OPEN:`, error.message)
    return { settled: false, detail: error.message }
  }
  const r = (data ?? null) as { ok?: boolean; reason?: string } | null
  return { settled: r?.ok === true, detail: r?.reason }
}

/**
 * 🛑 VISIBILITY ONLY. IT MUST NEVER RELEASE AUTHORITY.
 *
 * ── WHY THERE IS NO TIME-BASED RELEASE ────────────────────────────────────────────────
 *
 * An automatic release after N minutes is safe only if the original run physically cannot
 * still be executing. I traced `runIcpJob` end to end and it cannot be proved:
 *
 *   · the PDL search IS bounded — `AbortSignal.timeout(15000)`, a 4-rung size ladder and one
 *     paced rate-limit retry, so the exact search is ≤ 77.5 s and the one widened fallback
 *     repeats it: ≈ 155 s of bounded provider time;
 *   · EVERYTHING ELSE IS UNBOUNDED. `packages/db/src/client.ts` builds the supabase client
 *     with no fetch override, no `AbortSignal` and no timeout option, so all ~30 database
 *     round-trips — including a per-candidate insert loop — are unbounded fetches; Node's
 *     undici defaults are inactivity timeouts, not total-request timeouts;
 *   · `runIcpJob` is invoked as a floating promise with no `AbortController`, so nothing can
 *     cancel a hung run.
 *
 * A release on elapsed time could therefore reissue authority WHILE THE ORIGINAL RUN IS
 * STILL ALIVE — two live runs for one logical pass. So this threshold decides only WHEN A
 * HUMAN IS TOLD. Known failures release immediately (the outcome is in hand); known
 * completions complete immediately; genuine process death stays OPEN until an operator
 * reconciles it deliberately.
 *
 * The value: comfortably beyond the 155 s of bounded provider work plus generous headroom
 * for the unbounded database portion. Because it releases nothing, its exact value cannot
 * cause harm — only how soon the operator surface lights up.
 */
export const PROOF_CLAIM_STALE_MS = 900_000   // 15 minutes

export interface StaleProofClaim {
  claimId:    string
  clientId:   string
  companyName: string | null
  authority:  ProofAuthority
  icpId:      string | null
  claimedAt:  string
  ageMs:      number
  /** True when no `icp_run_outcomes` row exists at or after `claimed_at` for this ICP. */
  noTerminalEvidence: boolean
}

/**
 * OPEN claims old enough that no healthy run is still plausibly working, WITH the evidence
 * an operator needs to decide. Read-only: it settles nothing and changes nothing.
 *
 * ⚠️ `noTerminalEvidence` IS THE WHOLE DECISION AID. A stale open claim that DOES have a
 * terminal outcome row is a lost settle-write, and completing or releasing it follows the
 * recorded status. One with no evidence at all is genuine process death, and only a human
 * can say whether the original run will ever finish.
 */
export async function staleProofClaims(nowMs = Date.now()): Promise<StaleProofClaim[]> {
  const cutoff = new Date(nowMs - PROOF_CLAIM_STALE_MS).toISOString()
  const { data, error } = await db.from('proof_pass_claims')
    .select('id, client_id, authority, icp_id, claimed_at')
    .eq('status', 'open')
    .lt('claimed_at', cutoff)
    .order('claimed_at', { ascending: true })
    .limit(200)
  if (error || !data) {
    if (error) console.error('[proof-claim] stale claims unreadable:', error.message)
    return []
  }
  const rows = data as Array<{
    id: string; client_id: string; authority: string; icp_id: string | null; claimed_at: string
  }>
  const out: StaleProofClaim[] = []
  for (const r of rows) {
    let noTerminalEvidence = true
    if (r.icp_id) {
      const { data: outcome } = await db.from('icp_run_outcomes')
        .select('id').eq('icp_id', r.icp_id).eq('client_id', r.client_id)
        .gte('created_at', r.claimed_at).limit(1)
      noTerminalEvidence = (outcome ?? []).length === 0
    }
    const { data: c } = await db.from('clients')
      .select('company_name').eq('id', r.client_id).maybeSingle()
    out.push({
      claimId:    r.id,
      clientId:   r.client_id,
      companyName: (c as { company_name?: string | null } | null)?.company_name ?? null,
      authority:  r.authority as ProofAuthority,
      icpId:      r.icp_id,
      claimedAt:  r.claimed_at,
      ageMs:      nowMs - new Date(r.claimed_at).getTime(),
      noTerminalEvidence,
    })
  }
  return out
}

/**
 * 🛑 THE OPERATOR'S DELIBERATE RECONCILIATION — the only thing that settles an unknown.
 *
 * ⚠️ IT REFUSES A CLAIM THAT IS NOT STALE. A fresh claim may still be a live run, and
 * settling it would be the automatic time-based release wearing a person's face.
 *
 * ⚠️ THE COPY THE OPERATOR IS SHOWN IS PART OF THE CONTROL, and it is exported so one
 * sentence cannot drift from the other: a RELEASE must only be chosen once they have
 * concluded the original run will NOT subsequently complete. Releasing a run that later
 * finishes is how two live runs for one logical pass happen.
 */
export const RECONCILE_RELEASE_WARNING =
  'Only choose Release once you have concluded the original run will NOT subsequently ' +
  'complete. Releasing gives the client their Proof attempt back — if the original run is ' +
  'still alive it could then produce a second batch for one attempt.'

export const RECONCILE_COMPLETE_WARNING =
  'Choose Completed only when you can see the batch actually landed — a run outcome, or ' +
  'leads on their desk. Completing spends the attempt.'

export async function reconcileProofClaim(
  claimId: string, decision: RunTerminal, nowMs = Date.now(),
): Promise<{ ok: true } | { ok: false; reason: 'not_found' | 'not_open' | 'not_stale' | 'unreadable'; detail?: string }> {
  const { data, error } = await db.from('proof_pass_claims')
    .select('id, status, claimed_at').eq('id', claimId).maybeSingle()
  if (error) return { ok: false, reason: 'unreadable', detail: error.message }
  const row = data as { id: string; status: string; claimed_at: string } | null
  if (!row) return { ok: false, reason: 'not_found' }
  if (row.status !== 'open') return { ok: false, reason: 'not_open' }
  if (nowMs - new Date(row.claimed_at).getTime() < PROOF_CLAIM_STALE_MS) {
    return { ok: false, reason: 'not_stale' }
  }
  const settled = await settleProofClaim(claimId, decision, 'operator_reconciled')
  if (!settled.settled) return { ok: false, reason: 'unreadable', detail: settled.detail }
  return { ok: true }
}
