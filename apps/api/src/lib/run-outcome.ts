import { exhaustedMessage } from './pdl-cursor'

// PR-A — honest ICP-run outcome status + client-facing copy.
// runIcpJob records one of these per run into icp_run_outcomes; the portal reads the
// latest and renders the matching message so a quota outage is never mistaken for a
// narrow ICP. Pure functions — unit-tested without a DB.

// `audience_exhausted` (#366) is NOT `no_match`. no_match says "your ICP is too narrow —
// nobody like this exists"; audience_exhausted says "your ICP was right, we found all of
// them, and you already have every one". Told the wrong one, a client widens an ICP that
// was working, or gives up on one that simply finished. They are opposite instructions.
// `failed` is TERMINAL AND NEVER DERIVED. `deriveRunStatus` cannot return it — it is
// written only by the handler that caught the throw. A crash recorded as `no_match` would
// tell a prospect their targeting matched nobody when the query never completed (R72).
export type RunStatus = 'served' | 'no_match' | 'quota_exhausted' | 'demo' | 'audience_exhausted' | 'failed'

/** The approved client-facing recovery copy for a crashed run (founder-locked 26 Aug).
 *  ⚠️ The prospect is NEVER shown the word "failed" — that is the internal state name. */
export const FAILED_RUN_HEADLINE = 'We hit a snag confirming your matches'
export const FAILED_RUN_BODY =
  'Your setup is saved and has been flagged for K.I.N.D review. You won’t need to start again.'

/** ⚑ 26 Aug — THE ZERO THAT COMES AFTER WE ALREADY WIDENED.
 *
 *  ⚠️ NOT NEW COPY. This is the sentence `runIcpJob` already uses for exactly this state
 *  (the pass-2 widened proved-zero branch in `routes/icps.ts`) — lifted here so the
 *  PERSISTED message can say it too. It ends at a human, promises no timing, invites no
 *  retry, and above all does not tell a client to widen targeting we have already widened. */
export const WIDENED_NO_MATCH_BODY =
  'That refined targeting didn’t return a second set. K.I.N.D will review it with you.'

/**
 * ⚑ 16 Sep (MVP1 · A1) — THE COUNT THE CLIENT CAN ACTUALLY RECEIVE.
 *
 * 🛑 WHY THIS EXISTS AS A NAMED FUNCTION RATHER THAN INLINE ARITHMETIC. `runIcpJob` counts
 * `inserted` — every candidate row it wrote — and then the 10-Sep STRUCTURAL GATE refuses
 * some of them, which are never surfaced and never shown. Two different numbers, one of
 * which is the client's truth and the other of which is accounting's. They were the same
 * variable, so the client was told the accounting number.
 *
 * ⚠️ THE RAW NUMBER IS NOT REDEFINED (founder decision C, 16 Sep). `icp_run_outcomes
 * .total_inserted` still records what we sourced, because that is what the run cost and what
 * an audit must be able to read. This is the OTHER number — what arrived on the desk — and
 * it is the only one a client sentence or a Proof settlement may derive from.
 *
 * ⚠️ IT CANNOT GO NEGATIVE. A set-aside count larger than the insert count would be a bug
 * upstream, but "less than nothing" downstream reads as a healthy zero in some comparisons
 * and as a truthy negative in others, so it is clamped here rather than at each caller.
 */
export function clientUsableCount(totalInserted: number, setAside: number): number {
  return Math.max(0, Math.round(totalInserted) - Math.round(setAside))
}

/**
 * ⚑ 16 Sep (MVP1 · A1) — DID K.I.N.D'S OWN GATES EMPTY A SEARCH THAT WORKED?
 *
 * This is the 26-Aug rule — *"A ZERO THAT K.I.N.D ITSELF CREATED IS NEVER A TARGETING
 * VERDICT"* — lifted out of `runIcpJob` so it can be proved rather than read. The rule and
 * its consequences (`failed`, a released Proof attempt, `FAILED_RUN_BODY`, a founder alert)
 * are unchanged; only the COUNT it asks about is corrected.
 *
 * 🛑 THE DEFECT IT FIXES. The predicate asked `inserted === 0` — the PRE-GATE count — and so
 * a run that inserted twenty candidates and had all twenty refused by the structural gate
 * looked like a healthy served batch: the client was told "Sourced 20 leads." with an empty
 * desk, and the Proof attempt was consumed for a set that was never delivered.
 *
 * ⚠️ THREE CONDITIONS, AND EACH EXCLUDES A DIFFERENT CAUSE:
 *   • `clientUsable === 0`         — nothing reached the desk. One eligible lead is a served
 *                                    batch (the 26-Aug partial-proof rule) and never this.
 *   • `searchTrusted`              — an untrusted search is a PROVIDER failure, and
 *                                    `deriveRunStatus` already answers it through
 *                                    `searchCompleted:false`. Claiming it here would give one
 *                                    state two causes.
 *   • `providerContactsReturned>0` — the provider found people. A search that returned nobody
 *                                    is a targeting answer (`no_match` / `audience_exhausted`)
 *                                    and must keep its own honest copy.
 */
export function gatesEmptiedTheRun(args: {
  clientUsable: number
  searchTrusted: boolean
  providerContactsReturned: number
}): boolean {
  return args.clientUsable === 0 && args.searchTrusted && args.providerContactsReturned > 0
}

/**
 * Derive the outcome status from what actually happened in the run.
 * - quotaRefused: try_spend_sourcing granted 0 AND the pool served 0 (no pre-funded
 *   budget / monthly ceiling reached) — the run could not even attempt PDL.
 * - isDemo: a demo client (pool-only, $0) — leads may be 0 on a fresh pool.
 * - audienceExhausted: PDL has nobody left for this exact query (#366).
 * - totalInserted: pool-served + PDL-inserted leads for this run.
 */
export function deriveRunStatus(
  isDemo: boolean,
  totalInserted: number,
  quotaRefused: boolean,
  audienceExhausted = false,
  searchCompleted: boolean,
): RunStatus {
  if (quotaRefused) return 'quota_exhausted'
  if (isDemo) return 'demo'

  // ⚑ PARTIAL PROOF RULE (founder-approved 26 Aug) — SHOW WHAT WE HAVE.
  // Checked BEFORE trustworthiness on purpose: if real, safe, relevant people were found,
  // the client sees them, whatever happened to the rest of the batch. A provider that died
  // after the pool served seven does not take those seven away.
  if (totalInserted > 0) return 'served'

  // Zero. Only NOW does it matter whether the zero can be trusted.
  //
  // ⚠️ THIS IS THE FIX FOR THE FALSE `no_match`. Every non-block failure — timeout, 5xx,
  // 401/403, two rate limits, malformed body, out of credits, and the no-API-key exit that
  // returns `error: null` — used to arrive here indistinguishable from a completed search
  // that genuinely matched nobody, and every one of them told the prospect "No leads
  // matched this ICP. Try widening it". An empty page is not evidence of an empty audience.
  //
  // ⚠️ `failed` IS STILL NEVER DERIVED FROM EMPTINESS. It is derived from an explicit
  // "the search did not complete" fact carried by the provider page (`PdlPage.completed`),
  // and from nothing else.
  //
  // ⛓️ 26 Aug (final gate) — THE DEFAULT IS GONE. `searchCompleted = true` let a future
  // caller omit the argument and silently inherit "trustworthy", which is the same
  // fail-open shape the tri-state killed inside the run. The argument is now REQUIRED:
  // a caller that forgets it does not compile, so forgetting cannot create `no_match`.
  // A caller whose run never needed a provider passes `true` explicitly, as a statement.
  if (!searchCompleted) return 'failed'

  return audienceExhausted ? 'audience_exhausted' : 'no_match'
}

/** Client-facing message for a run outcome. Honest: never blames the client for a
 *  platform quota outage, and never hides a genuine no-match behind a vague spinner. */
export function runOutcomeMessage(
  status: RunStatus,
  totalInserted: number,
  alreadyHeld = 0,
  /**
   * ⚑ 26 Aug — DID THIS RUN ALREADY USE ITS ONE WIDENED FALLBACK?
   *
   * THE DEFECT. The persisted `message` is derived from `status` alone, and a pass-2 widened
   * search that COMPLETED and genuinely matched nobody derives `no_match` — whose sentence
   * is *"Try widening it — broaden the job titles, seniority, industries or regions."* We had
   * just widened it for them. The desk renders the server's message, so a client who had
   * already been through the one approved fallback was told to go and widen again, against
   * the founder rule that a widened zero ends at a human.
   *
   * ⚠️ THE STATUS IS UNCHANGED AND STILL TRUE: the search completed and matched nobody, so
   * `no_match` is the honest state and no new status is invented for a copy problem. Only the
   * SENTENCE differs, and only for `no_match` — every other status is untouched.
   */
  alreadyWidened = false,
): string {
  switch (status) {
    case 'failed':
      // ⚠️ NO TECHNICAL DETAIL EVER REACHES THE PROSPECT. No provider name, no status
      // code, no stack — a person who asked to see some leads is told what it means for
      // them and what happens next, and the diagnosis goes to the founder alert instead.
      return FAILED_RUN_BODY
    case 'quota_exhausted':
      // ── ⛓️ 18 Sep (J12-C4 · PV 09 B) — HONEST UNDER THE PROGRAMME MODEL ──────────────
      //
      // ~~"Sourcing capacity is temporarily out — the team has been alerted and your credits
      // are untouched. Try again shortly."~~
      //
      // 🛑 TWO OF ITS THREE CLAUSES STOPPED BEING TRUE. **R124 (16 Sep, founder-locked):**
      // *"299/4 is gone. out. we are on the programme. all clients."* — so a client reassured
      // about their CREDITS is being reassured about a wallet the product no longer has, which
      // is the retired economics reappearing in the one place nobody scans for them. And R94
      // already named that exact half of this sentence as one of *"three false claims in one
      // card… credits from a wallet the programme model does not have."*
      //
      // 🛑 AND *"Try again shortly"* POINTS AT THE WRONG PERSON. This state is a stop on OUR
      // side; a client pressing anything achieves nothing until we clear it, and telling them
      // to retry makes our capacity look like their problem.
      //
      // ⚠️ WHAT IS KEPT IS WHAT WAS TRUE: it is capacity, not their targeting, and nothing of
      // theirs was consumed — the reservation is released in full on this path (`settleBatch`
      // with zero delivered, and `release_proof_records` for a proof run), so the programme
      // volume sentence is a statement about code that runs, not a reassurance.
      //
      // ⚠️ NO PROVIDER IS NAMED, exactly as on the `failed` path above. A client is told what
      // it means for them and what happens next; the diagnosis goes to the operator task.
      return 'We had to pause finding people for this run — it is a limit on our side, not a problem with your targeting. '
        + 'K.I.N.D has been alerted and will pick it back up; none of your programme volume has been used.'
    case 'audience_exhausted':
      // #366 — the honest end-of-audience sentence. Never "no leads matched", which blames
      // targeting that was in fact correct all the way to the last person in it.
      return exhaustedMessage(alreadyHeld)
    case 'no_match':
      // ⚑ 26 Aug — NEVER ADVISE A WIDENING WE HAVE ALREADY DONE. After the one approved
      // fallback this goes to a human instead: no third search, no retry control, and no
      // instruction the client has already been given and cannot act on again.
      return alreadyWidened
        ? WIDENED_NO_MATCH_BODY
        : 'No leads matched this ICP. Try widening it — broaden the job titles, seniority, industries or regions.'
    case 'demo':
      return totalInserted > 0
        ? `Demo run — ${totalInserted} leads served from the shared pool at no cost.`
        : 'Demo run — no pool leads matched this ICP yet. Widen the ICP to see sample leads.'
    case 'served':
    default:
      return `Sourced ${totalInserted} lead${totalInserted === 1 ? '' : 's'}.`
  }
}

// The portal's show/tone decision for this outcome lives in `@kind/shared`
// (`run-outcome-banner.ts`) — one tested rule, shared by the API and the UI, rather than an
// allowlist copied into JSX. See that file for why the allowlist had to go.
