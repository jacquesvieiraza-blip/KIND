// ═══════════════════════════════════════════════════════════════════════════════
// J5-C14 · HOW LONG MAY A HEALTHY PROOF RUN TAKE?
//
// The Proof desk has to choose between two sentences while it waits: "Finding your
// matches now…" or the approved recovery copy. Getting it wrong in either direction is a
// lie to the first client a prospect ever sees — a spinner that never ends, or "We hit a
// snag" about a run that is working perfectly.
//
// ── ⛓️ 17 Sep (FD-6) — THE OLD BOUND WAS DERIVED FROM A PROVIDER WE DO NOT USE ─────
//
// `PROOF_WAIT_MS` was 240s, and its derivation was written down honestly:
//
//     "one PDL attempt is a 15s timeout, the size ladder at batch 20 is four attempts
//      (60s), one global rate-limit retry adds 2.5s + 15s, so an exact search is ~77.5s
//      and the one widened fallback repeats it — ~160–180s with overheads."
//
// Every number in that sentence is PDL's: its timeout, its 402 size ladder, its retry.
// Proof sources from Apollo now, which has no size ladder at all — it pages, and a Proof
// batch of 20 fits in ONE page. So the old bound was neither right nor wrong; it was
// measuring a different machine.
//
// ── THE DERIVATION, FROM APOLLO'S ACTUAL WORST CASE ────────────────────────────
//
// A Proof pass, counted request by request through `searchPeopleWithFallback`:
//
//   · pass 1, the exact query                                    1 page (20 ≤ 100/page)
//   · pass 2, consent filter relaxed                             1 page
//   · pass 3, employee ranges relaxed                            1 page
//   · the ONE widened fallback repeats all three                  3 pages
//   · the Proof geography qualification (`bulkMatchEmails`),
//     which chunks ids in tens, so 20 candidates                 2 requests
//                                                               ───────────
//                                                                9 requests
//
// At `APOLLO_REQUEST_TIMEOUT_MS` each, the worst case is 9 × 15s = 135s of provider time.
// The bound adds margin for the database reads, the pool serve, the insert loop and the
// reservation round-trips between them.
//
// 🛑 THE TIMEOUT IS WHAT MAKES THIS DERIVABLE AT ALL. `searchPeople` had NO timeout on its
// fetch — Node's `fetch` has no default — so Apollo's worst case was not 135s, it was
// UNBOUNDED. A bound computed against an unbounded call is arithmetic about nothing, which
// is why `APOLLO_REQUEST_TIMEOUT_MS` is applied in `apollo.ts` and exported from here: the
// two must be the same number or the desk is guessing again.
//
// ⚠️ THE DESK'S POLL BUDGET MUST EQUAL THE BOUND. `FINDING_POLL_MS × FINDING_MAX_CHECKS`
// is asserted against `PROOF_WAIT_MS` at module load in the Milla page, so the two cannot
// drift into different truths. Changing anything here means changing that pair too, and the
// assertion is what forces it.
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * How long one Apollo request may take before it is abandoned.
 *
 * Applied in `apollo.ts` (`searchPeople`, `bulkMatchEmails`) — not merely declared here.
 * An unbounded provider call is the "started and never came back" condition XC-6's detector
 * exists to find, and it is better not to create it.
 */
export const APOLLO_REQUEST_TIMEOUT_MS = 15_000

/** Requests a single Proof pass can make in its worst case. See the derivation above. */
export const APOLLO_PROOF_WORST_CASE_REQUESTS = 9

/** Room for the database reads, the pool serve, the insert loop and the reservations. */
export const PROOF_OVERHEAD_MS = 45_000

/**
 * The bound, computed rather than typed.
 *
 * ⚠️ IT IS ROUNDED UP TO A MULTIPLE OF THE DESK'S POLL INTERVAL. The desk waits by polling,
 * so a bound that is not a whole number of polls cannot be expressed by a poll count — and
 * the Milla page asserts `FINDING_POLL_MS × FINDING_MAX_CHECKS === PROOF_WAIT_MS` at module
 * load. Rounding here is what lets that assertion hold without anybody hand-tuning a count.
 */
export const PROOF_DESK_POLL_MS = 3_000

export const PROOF_WAIT_MS =
  Math.ceil(
    (APOLLO_REQUEST_TIMEOUT_MS * APOLLO_PROOF_WORST_CASE_REQUESTS + PROOF_OVERHEAD_MS) /
      PROOF_DESK_POLL_MS,
  ) * PROOF_DESK_POLL_MS

/** The poll count the desk must use, so the two can never be set independently. */
export const PROOF_DESK_MAX_CHECKS = PROOF_WAIT_MS / PROOF_DESK_POLL_MS
