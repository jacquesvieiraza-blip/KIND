// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ONE PROOF-START BOUNDARY — launch a free-Proof run, and settle the claim it was
// granted against. (S1-RT-004, founder-authorised 15 Sep.)
//
// ── WHY THIS FILE EXISTS ───────────────────────────────────────────────────────────────
//
// Two surfaces need to start the FIRST free Proof run, and they must start the SAME one:
//
//   · the client's own door — `POST /icps/:id/proof`, pressed at Brief confirmation;
//   · the operator's continuation — Vida saving the ICP-review translation that was the only
//     thing blocking that first run (`POST /operator/icp-review/:icpId/resolve`).
//
// 🛑 THE DEFECT THAT EARNED IT, and it stranded a real client. Juniper Ridge Consulting
// finished its Brief, was promoted, and reached the Proof desk — but `POST /icps/:id/proof`
// had refused with `needs_icp_review`, because "10-100 employees" is not a value any provider
// takes. An operator translated it in Vida (11–50 + 51–200) and the review resolved
// correctly. NOTHING THEN STARTED PROOF: `proof_started_at` stayed NULL, no `proof_pass_claims`
// row, no `icp_run_outcomes` row, no leads, Apollo never called. The client's only start door
// is on the confirmation screen they had already passed, and no Vida control issues that POST
// — so a correct, human-resolved refusal was terminal for that client's Proof journey.
//
// ⚠️ THIS IS AN EXTRACTION, NOT A REWRITE. `launchProofRun` below is the route's own
// run-and-settle tail, moved VERBATIM. The route keeps every pre-claim gate, every refusal
// code and every client-facing sentence exactly as it had them; only this tail is shared, so
// the two callers cannot drift into two different ideas of what starting Proof means.
//
// 🛑 IT GRANTS NOTHING. Authority is `claimProofAuthority` and nothing else. This module is
// handed an ALREADY-GRANTED claim and only fires the run and settles that claim. There is
// deliberately NO second idempotency mechanism here: the claim ledger is the single fence,
// and a caller without a claim must not call `launchProofRun`.
//
// ⚠️ THE GUARD TESTS THAT USED TO READ `routes/icps.ts` FOR THIS TAIL NOW READ THIS FILE.
// Their assertions were repointed, not relaxed — the settlement semantics they protect are
// unchanged and are protected here instead, which is where the behaviour now lives.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import { settleProofClaim } from './proof-claim'
import { fundedVia } from './onboarding-pack'

export interface LaunchProofRunInput {
  icpId: string
  clientId: string
  userId: string
  /** The pass number the claim granted. 1 or 2; a restart keeps pass 2's number. */
  claimed: number
  batchKind: 'automatic' | 'calibrated_restart'
  /** The claim this run is settled against. Never minted here. */
  claimId: string
}

/**
 * Fire the run and settle its claim. FIRE-AND-FORGET, exactly as the route has always done:
 * the caller has already answered its own surface and must not wait for a provider.
 *
 * ── 🛑 ⚑ 12 Sep — THE CLAIM IS SETTLED FROM THE RUN'S OWN TERMINAL RESULT ───────────
 *
 * 🛑 WIRING THIS TO THE `.catch` ALONE WOULD HAVE MISSED TWO REAL FAILURE PATHS, and the
 * founder named the first: the structural gate records `failed` WITH LEADS INSERTED and
 * simply RETURNS — it never throws. `deriveRunStatus` also returns `failed` when the
 * provider search did not COMPLETE, likewise without throwing. Both leave the client with
 * no Proof set, and under the old code both consumed the pass.
 *
 * So the `.then` settles from `r.terminal`, which `runIcpJob` derives from the status it
 * actually recorded via an exhaustive map. The `.catch` settles a throw. Between them
 * every terminal exit is covered, and a new exit cannot compile without choosing one.
 */
export function launchProofRun(input: LaunchProofRunInput): void {
  const { icpId, clientId, userId, claimed, batchKind, claimId } = input

  void (async () => {
    // Imported at call time, not module scope: `routes/icps.ts` imports this file, so a
    // top-level import back into it would close a require cycle.
    const { runIcpJob, recordRunOutcome, PROOF_PASS_LEADS } = await import('../routes/icps')
    const { attemptLabel: attemptLabelFor } = await import('./proof-calibration')

    runIcpJob(icpId, clientId, userId, PROOF_PASS_LEADS, { proofPass: claimed, proofKind: batchKind })
      .then(async r => {
        const settled = await settleProofClaim(claimId, r.terminal, r.terminal === 'released' ? 'run_failed' : undefined)
        if (!settled.settled) {
          // The claim stays OPEN. That is the fail-closed direction — nothing is granted — but
          // the client cannot retry until an operator reconciles it, so a human must know.
          void sendFounderAlert('source_down', 'A Proof authority claim could not be settled — the client cannot retry', [
            `Prospect ${clientId}, ICP ${icpId}, claim ${claimId}.`,
            `The run finished with terminal "${r.terminal}" but the settle write did not persist: ${settled.detail ?? 'unknown'}.`,
            'Their claim is still OPEN, so nothing was granted and nothing was consumed — but their next Proof request will answer "already started".',
            'ACTION: Vida -> Command Centre -> System -> stale Proof claims, and reconcile it.',
          ]).catch(() => {})
        }
        if (r.terminal === 'released') {
          console.log(`[icps/proof] the run for prospect ${clientId} did not deliver a set — the Proof attempt has been RETURNED, not consumed.`)
        }
      })
      .catch(async e => {
        console.error('[icps/proof] proof run failed:', e)
        // ⚠️ THE AUTHORITY COMES BACK FIRST. Provider and infrastructure failure must not
        // consume Proof authority (founder-locked), and this is the crash boundary.
        const settled = await settleProofClaim(claimId, 'released', 'run_threw')
        // ⚑ 26 Aug — PERSIST THE CRASH AS A TERMINAL FACT (founder-approved `failed`).
        // Written HERE, at the crash boundary, because this is the only place that knows
        // the run threw. Never derived, and never folded into `no_match`: the query did
        // not complete, so claiming it matched nobody would be false (R72).
        const recorded = await recordRunOutcome(icpId, clientId, 'failed', PROOF_PASS_LEADS, 0, 0)
          .then(() => true)
          .catch(re => { console.error('[icps/proof] could not record the failed outcome:', re); return false })
        void sendFounderAlert('source_down', 'A free-proof run crashed — the prospect is waiting on a desk that cannot finish', [
          `Prospect ${clientId}, ICP ${icpId}, ${attemptLabelFor({ pass: claimed, kind: batchKind })}.`,
          `Reason: ${e instanceof Error ? e.message : String(e)}`,
          // ── ⛓️ 12 Sep (S2-AUDIT-003 half A) — THIS SENTENCE WAS FALSE ─────────────────
          //
          // It read: "Their proof pass is CONSUMED and no run outcome was recorded, so the
          // desk shows no terminal state for this attempt." BOTH HALVES WERE WRONG. The line
          // directly above it records the `failed` outcome, so the desk DOES have a terminal
          // state — and as of this build the pass is RETURNED rather than consumed.
          //
          // ⚠️ AND IT NOW REPORTS WHAT ACTUALLY HAPPENED rather than asserting either. If the
          // outcome write or the settle failed, the alert says which — the two facts it used
          // to state blindly are the two it now measures.
          settled.settled
            ? 'Their Proof attempt has been RETURNED, not consumed — provider and infrastructure failure must not spend a pass.'
            : `⚠️ The attempt could NOT be returned (${settled.detail ?? 'settle failed'}) — their claim is still OPEN and needs reconciling in Vida.`,
          recorded
            ? 'The failed run outcome WAS recorded, so the desk shows a terminal state for this attempt.'
            : '⚠️ The failed run outcome could NOT be recorded, so the desk has no terminal state and will fall back to its bounded recovery copy.',
          'If this reads SAFE_TEST_MODE / PAID_PROVIDERS_ENABLED, the guard refused to spend — that is correct behaviour, not a bug.',
        ]).catch(() => {})
      })
  })()
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 ⚑ 16 Sep (S1-RT-004 correction) — A RESOLVED REVIEW IS NOT, BY ITSELF, "START PROOF".
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// `POST /operator/icp-review/:icpId/resolve` IS GENERIC. It translates a provider review on
// ANY client's ICP — a live, paying client whose targeting was edited into words a provider
// will not take reaches exactly the same endpoint as Juniper Ridge did. The first cut of this
// continuation proved only that the client row had an owner before it claimed Proof
// authority, so a perfectly ordinary operator translation for a FUNDED client would have
// claimed a free Proof pass and started a free Proof run nobody asked for.
//
// 🛑 SO THE CONTINUATION MUST PROVE THE ONBOARDING STATE, NOT ASSUME IT. This is the
// smallest predicate that does, and every condition is durable server-owned truth:
//
//   ① NOT FUNDED — `fundedVia(credit_transactions)` is `null`. The EXACT classifier
//      `/icps/:id/proof` already refuses on (`'Your account is already live'`) and the one
//      the money surfaces use. Reused, never re-expressed: a second definition of "funded"
//      is how #619 happened.
//
//   ② NO AUTOMATIC PROOF AUTHORITY HAS EVER BEEN CONSUMED — `proof_passes_done = 0`. This is
//      the same counter `claim_proof_authority` itself reads as `v_done`, kept by
//      `refresh_proof_authority_mirror`, so it cannot drift from the ledger into a second
//      idea of how much Proof a client has had. It is ALSO what catches the pre-ledger
//      client: `try_claim_proof_pass` incremented this counter from the beginning, whereas
//      `proof_started_at` only exists from 20260826 and was never backfilled.
//
//   ③ NO PROOF CLAIM WAS EVER GRANTED — `proof_started_at IS NULL`. ② alone is not enough
//      and the gap is real: a client whose FIRST Proof run CRASHED has the claim RELEASED,
//      so the counter is still 0 while `proof_started_at` is stamped. Without ③, an operator
//      translating that client's review would silently start a second run for an attempt
//      they are still entitled to spend deliberately.
//
// ⚠️ WHY THERE IS NO CALIBRATION / ESCALATION CHECK HERE, and it is not an omission. Every
// calibration state — escalation, the granted restart, the refinement journey — is reachable
// only AFTER a Proof set exists, so ② and ③ exclude all of them structurally. Copying the
// route's calibration gate would add a read that cannot change the answer, and the founder's
// instruction is the smallest check, not the widest.
//
// ⚠️ AN UNREADABLE FACT IS NOT A PASS. The route tolerates an unreadable funding read because
// a human is pressing its button and the claim ledger is behind it; here NOTHING downstream
// asks a person anything, so "we could not prove it" must refuse. Fail-closed costs a client
// nothing — the review stays resolved and their own Proof door still works.
//
// 🛑 IT GRANTS NOTHING, AND IT IS NOT AUTHORITY. `claimProofAuthority` remains the sole owner
// of authority and idempotency. This can only REFUSE before that call — it can never permit
// something the ledger would refuse.
// ═══════════════════════════════════════════════════════════════════════════════════════

export type FirstFreeProofEligibility =
  | { ok: true;  userId: string }
  | { ok: false; detail: string }

export async function firstFreeProofEligibility(clientId: string): Promise<FirstFreeProofEligibility> {
  // ── THE CLIENT ROW: the owner, and the two Proof-entry facts, in ONE read ──────────────
  //
  // The owner is required for its own reason: `runIcpJob` needs a user id for the "your first
  // leads" email, and an operator's identity is not the client's — the same reasoning as the
  // activate route, which starts NOTHING when the client row has no owner rather than
  // emailing whoever pressed the button.
  const { data: row, error: rowErr } = await db.from('clients')
    .select('user_id, proof_passes_done, proof_started_at')
    .eq('id', clientId).maybeSingle()
  if (rowErr) {
    return { ok: false, detail: `the client row could not be read (${rowErr.message})` }
  }
  const client = (row ?? null) as {
    user_id?: string | null; proof_passes_done?: number | null; proof_started_at?: string | null
  } | null
  if (!client) {
    return { ok: false, detail: 'there is no client row to start a Proof run for' }
  }

  const userId = client.user_id ?? null
  if (!userId) {
    return { ok: false, detail: 'this client row has no owner user, so a Proof run would have nobody to notify' }
  }

  // ② — any consumed automatic authority, legacy or ledger, means this is not a first Proof.
  const passesDone = Number(client.proof_passes_done ?? 0) || 0
  if (passesDone > 0) {
    return { ok: false, detail: `this client has already used ${passesDone} free Proof pass${passesDone === 1 ? '' : 'es'}, so resolving a review does not start another one` }
  }
  // ③ — a claim was granted at some point, even if it was released. They have entered Proof.
  if (typeof client.proof_started_at === 'string' && client.proof_started_at.trim() !== '') {
    return { ok: false, detail: 'this client has already entered Proof, so resolving a review does not start another run' }
  }

  // ① — funded or comped means live. Their leads come through their campaign, not a free set.
  const { data: fundingRows, error: fundErr } = await db.from('credit_transactions')
    .select('type, reference').eq('client_id', clientId)
  if (fundErr) {
    return { ok: false, detail: `this client's funding state could not be read (${fundErr.message}), so a free Proof run was not started` }
  }
  const funded = fundedVia((fundingRows ?? []) as Array<{ type?: unknown; reference?: unknown }>)
  if (funded !== null) {
    return { ok: false, detail: `this client is already live (${funded === 'real' ? 'funded' : 'comped'}), so their leads come through their campaign rather than a free Proof set` }
  }

  return { ok: true, userId }
}

/** What the operator's continuation actually managed to do. Reported to Vida verbatim. */
export type ProofContinuation =
  | { started: true;  pass: number; kind: 'automatic' | 'calibrated_restart' }
  | { started: false; reason: 'already_started' }
  | { started: false; reason: 'no_authority'; detail: string }
  | { started: false; reason: 'not_eligible'; detail: string }

/**
 * CONTINUE INTO THE FIRST FREE PROOF RUN after an operator has resolved the ICP review that
 * was blocking it (founder-ruled 15 Sep, S1-RT-004).
 *
 * 🛑 THE OPERATOR HAS ALREADY TAKEN THE CORRECTIVE ACTION. Requiring a second click — or
 * worse, a second CLIENT action the client has no screen for — is what stranded Juniper
 * Ridge. So resolution continues into the run, exactly once.
 *
 * 🛑 AND IT CONTINUES ONLY FROM THE ONBOARDING STATE (corrected 16 Sep). This endpoint is
 * GENERIC — it resolves a provider review for any client, including a live paying one — so
 * the continuation proves it is genuinely pre-first-free-Proof before claiming anything.
 * `firstFreeProofEligibility` above is that proof, and it can only refuse.
 *
 * ⚠️ IDEMPOTENCY IS THE CLAIM LEDGER'S, NOT THIS FUNCTION'S. `claimProofAuthority` is the
 * single door: it stamps `clients.proof_started_at` and inserts `proof_pass_claims` in one
 * atomic RPC, and answers `in_flight` when a run already holds authority. A replayed
 * resolution therefore cannot produce a second run — and there is no second fence here to
 * disagree with it.
 *
 * ⚠️ AND IT IS PROOF-MODE ONLY. `launchProofRun` always passes `proofPass`/`proofKind`, so
 * this can never fall into the ordinary paid client path (`/icps/:id/run`, Vida GO) which
 * sources against PDL behind AR8's cash fence. A prospect has no allowance there.
 *
 * ⚠️ IT NEVER UNDOES THE TRANSLATION. The caller has already committed the human's work;
 * this runs afterwards and reports what happened. A provider or runtime failure here must
 * not cost a correct translation (founder-ruled), so no branch below rolls anything back.
 */
export async function continueProofAfterReviewResolved(
  clientId: string,
  icpId: string,
): Promise<ProofContinuation> {
  // 🛑 THE ONBOARDING STATE IS PROVED BEFORE ANY AUTHORITY IS CLAIMED. A generic review
  // resolution is not permission to start Proof — see `firstFreeProofEligibility` above.
  const eligible = await firstFreeProofEligibility(clientId)
  if (!eligible.ok) {
    return { started: false, reason: 'not_eligible', detail: eligible.detail }
  }

  const { claimProofAuthority } = await import('./proof-claim')
  const authority = await claimProofAuthority(clientId, icpId)
  if (!authority.ok) {
    // `in_flight` is not an error and must not read as one: a run already holds authority,
    // so the honest answer is that nothing more is needed.
    if (authority.reason === 'in_flight') return { started: false, reason: 'already_started' }
    return { started: false, reason: 'no_authority', detail: authority.detail ?? authority.reason }
  }

  launchProofRun({
    icpId, clientId, userId: eligible.userId,
    claimed: authority.pass, batchKind: authority.kind, claimId: authority.claimId,
  })
  return { started: true, pass: authority.pass, kind: authority.kind }
}

export type ProofRetry =
  | { started: true;  pass: number; kind: 'automatic' | 'calibrated_restart' }
  | { started: false; reason: 'not_in_exception'; detail: string }
  | { started: false; reason: 'already_started' }
  | { started: false; reason: 'no_authority'; detail: string }
  | { started: false; reason: 'unusable_client'; detail: string }

/**
 * ⚑ 16 Sep (MVP1 · A1b) — RETRY PROOF AFTER WE PRODUCED NOTHING THE CLIENT COULD USE.
 *
 * 🛑 THE THIRD CALLER, AND IT HAS ITS OWN PREDICATE FOR A REASON. `firstFreeProofEligibility`
 * above refuses any client whose `proof_started_at` is set — which is every client who has
 * ever entered Proof, including this one. That check is AR21 and it is correct: resolving a
 * generic review must not start a second Proof. Weakening it to let this retry through would
 * have re-opened exactly the fence it exists to hold. So this is a separate door with a
 * separate question.
 *
 * 🛑 AND THE QUESTION IS THE STATE, NOT A PERMISSION. It asks the SAME persisted truth Vida's
 * rail asks — `proofNoEligibleSetFor` — so the button can only be pressed on a client the
 * product is already showing as a zero-eligible exception. There is no second definition of
 * that state to drift against, and an operator cannot retry a healthy client into a free pass.
 *
 * ⚠️ IT GRANTS NOTHING AND COUNTS NOTHING. `claimProofAuthority` is the only door, exactly as
 * it is for the client's own route and for the review continuation. The failed run RELEASED
 * its claim and `refresh_proof_authority_mirror` does not count released claims, so the ladder
 * hands back the attempt the client already had — `automatic_1` if they had delivered none.
 * No counter is touched here, and `proof_passes_done` is never written by hand anywhere.
 *
 * ⚠️ NO INFINITE LOOP. Each retry is an operator PRESS, never automatic, and each one either
 * delivers a set (consuming the attempt) or fails again and returns it. The ladder still caps
 * DELIVERED automatic attempts at two and the calibrated restart at one — unchanged.
 */
export async function retryProofAfterZeroEligible(
  clientId: string,
  icpId: string,
): Promise<ProofRetry> {
  // ① THE STATE, asked of the one reader that defines it. Imported at call time to keep this
  // module free of a static edge into the lifecycle facts gatherer.
  const { proofNoEligibleSetFor } = await import('./programme-lifecycle-facts')
  const inException = await proofNoEligibleSetFor(clientId)
  if (inException !== true) {
    return {
      started: false, reason: 'not_in_exception',
      detail: inException === null
        ? 'this client\'s last Proof run could not be read, so nothing was retried'
        : 'this client is not in a zero-eligible Proof exception, so there is nothing to retry',
    }
  }

  // ② THE OWNER. `runIcpJob` needs a user to attribute the run to, and an operator's identity
  // is not the client's — the same rule `firstFreeProofEligibility` applies for the same
  // reason. A client row with no owner starts nothing.
  const { data: row, error: rowErr } = await db.from('clients')
    .select('user_id').eq('id', clientId).maybeSingle()
  if (rowErr) {
    return { started: false, reason: 'unusable_client', detail: `the client row could not be read (${rowErr.message})` }
  }
  const userId = (row as unknown as { user_id?: string | null } | null)?.user_id ?? null
  if (!userId) {
    return { started: false, reason: 'unusable_client', detail: 'this client row has no owner user, so a Proof run would have nobody to notify' }
  }

  // ③ THE AUTHORITY. One door, no exceptions, no hand-counting.
  const { claimProofAuthority } = await import('./proof-claim')
  const authority = await claimProofAuthority(clientId, icpId)
  if (!authority.ok) {
    if (authority.reason === 'in_flight') return { started: false, reason: 'already_started' }
    return { started: false, reason: 'no_authority', detail: authority.detail ?? authority.reason }
  }

  launchProofRun({
    icpId, clientId, userId,
    claimed: authority.pass, batchKind: authority.kind, claimId: authority.claimId,
  })
  return { started: true, pass: authority.pass, kind: authority.kind }
}
