import type { IcpReview } from './icp-provider-translation'

// ═══════════════════════════════════════════════════════════════════════════════════════
// S1-PD-05 — WHAT A HELD REVISION'S REVIEW STATE MUST BECOME WHEN K.I.N.D PRESSES GO.
//
// ── THE DEFECT, AND I REPORTED IT MYSELF ───────────────────────────────────────────────
//
// 🛑 `apply_pending_revision` APPLIES A COLUMN WHITELIST, and `icp_review` was not on it.
// Everything before GO was right and that was exactly what made the hole invisible:
//
//   1. a LIVE client revises their targeting in their own words;
//   2. the write boundary translates — canonical half to the provider columns, the words we
//      could not map kept verbatim as a review requirement (S1-PD-01/02/03);
//   3. the ICP is live, so `saveClientTargeting` PARKS the whole thing in `pending_targeting`
//      and touches no live column. Correct: the live targeting has not moved, so the live
//      ICP must not be falsely blocked;
//   4. an operator presses GO;
//   5. the whitelist applies `industries`, `job_titles`, `seniority_levels`, `company_sizes`,
//      `geographies`, `tech_stack`, `keywords`, `name`, `apollo_only_consented` — and NOT the
//      review;
//   6. the new targeting is now LIVE, its canonical half intact, and the unresolved customer
//      constraint has ceased to exist as an authority fact;
//   7. `icpNeedsReview` reads the live row, sees no review, and answers "translatable";
//   8. Proof runs. `runIcpJob` runs. Provider money is spent against a filter set a human was
//      supposed to finish and never did.
//
// The targeting travelled and its safety state did not. That is the whole bug.
//
// ── WHY THIS IS A SEPARATE, PURE MODULE ────────────────────────────────────────────────
//
// 🛑 THE DECISION HAS TO LIVE INSIDE THE TRANSACTION, so the implementation is plpgsql:
// `apply_pending_revision` takes `FOR UPDATE` on the ICP row and applies the brief, the
// targeting, the one-active sweep, the activation and the clearing of every pending field as
// ONE statement set. A TypeScript pre-check would be a second observation of a row the
// function re-reads under a lock — the exact read-then-write race this repo has closed twice
// already — and "atomic" would become a claim rather than a property.
//
// But a decision that exists only as SQL cannot be executed by the gate, and this batch has
// already had three guards pass while the behaviour behind them was dead. So the RULE lives
// here, in a pure function with no database, no clock and no request, and the SQL implements
// exactly it. This module is executed against every case the rule has; the SQL is executed
// against the same cases on a disposable PostgreSQL during the migration rehearsal; and a
// structural test proves the two have not drifted apart. Three proofs, one rule.
//
// ── THE TRUST BOUNDARY ─────────────────────────────────────────────────────────────────
//
// ⚠️ THE STORED REVIEW IS SERVER-AUTHORED, AND THAT IS THE ONLY REASON IT MAY BE CARRIED.
// `pending_targeting` is written by `POST /icps` from `deriveProviderReview` — the server's
// own translation of the values it was about to persist (S1-PD-01). No browser can put an
// `icp_review` into it: the field is not in `icpSchema` and Zod strips it. So carrying it
// forward at GO is carrying OUR derivation, not a caller's claim.
//
// ⚠️ AND IT CANNOT BE RE-DERIVED AT GO TIME, WHICH IS WORTH SAYING PLAINLY RATHER THAN
// LEAVING AS AN OMISSION. Re-deriving needs two things the database does not have: the three
// closed vocabularies (putting them in SQL would be a SECOND copy of the constants, which is
// the two-truths defect this batch exists to remove), and the client's ORIGINAL words — which
// are not in the parked targeting at all. The parked provider lists hold only the CANONICAL
// half; the unmapped words survive nowhere except inside `icp_review.requirements[].said`.
// Re-deriving from what is there would therefore find nothing unmapped and produce exactly
// the bypass above. So the stored review is VALIDATED and CARRIED, and never reconstructed.
//
// ⚠️ GO MAY APPLY A REVIEW. GO MAY NOT RESOLVE ONE. Resolution is the Vida operator route's
// alone, which re-canonicalises every value before it writes. See `resolvedStampMustClear`.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * What GO must do with the review columns of the live ICP.
 *
 * ⚠️ THREE OUTCOMES BECAUSE THERE ARE THREE, and collapsing any two loses a real distinction:
 * "apply this review" · "this revision owes nothing, leave the live state alone" · "I cannot
 * read this, apply NOTHING AT ALL".
 */
export type ReviewTransfer =
  /**
   * 🛑 FAIL CLOSED. The stored review is a shape we cannot read, so the whole GO is refused:
   * not the targeting, not the brief, not the activation. Applying the targeting and skipping
   * the unreadable half is the silent widening this design exists to prevent, and it would be
   * indistinguishable from success.
   */
  | { ok: false; reason: 'unreadable' }
  /**
   * The revision owes no review. Every review column on the live ICP is LEFT EXACTLY AS IT
   * IS — this is not "clear it". An operator's open review must survive a clean revision, or
   * a client could lift their own block by revising around the word that raised it.
   */
  | { ok: true; apply: false }
  /** Apply this review to the live ICP, UNRESOLVED, in the same statement as the targeting. */
  | { ok: true; apply: true; review: IcpReview }

/**
 * 🛑 THE RULE. Given the parked `pending_targeting` exactly as it is stored, what must the
 * live ICP's review state become?
 *
 * ⚠️ IT READS ONE KEY. Everything else in the parked object is the targeting whitelist's
 * business; a hostile or stray key cannot reach a column and cannot reach this decision.
 *
 * ⚠️ ITS FAIL-CLOSED DIRECTION IS THE SAME AS `icpNeedsReview`'S, deliberately: a review
 * state nobody can read is never treated as "fine". There the answer is "this ICP is
 * blocked"; here it is "this GO does not happen". Both refuse to spend on an unreadable
 * translation state, which is the one property that must never depend on which seam you ask.
 */
export function pendingReviewTransfer(pendingTargeting: unknown): ReviewTransfer {
  // No parked targeting at all — a brief-only revision. Nothing to carry, nothing to clear.
  if (pendingTargeting === null || pendingTargeting === undefined) return { ok: true, apply: false }
  if (typeof pendingTargeting !== 'object' || Array.isArray(pendingTargeting)) {
    // ⚠️ NOT "unreadable". A non-object parked payload has no `icp_review` key to misread, and
    // Postgres answers `'"x"'::jsonb -> 'icp_review'` with NULL rather than an error — so
    // refusing here would put this function and the SQL into disagreement over a case where
    // the targeting whitelist ALSO writes nothing. The two must agree everywhere.
    return { ok: true, apply: false }
  }

  const raw = (pendingTargeting as { icp_review?: unknown }).icp_review
  // Absent, or an explicit JSON null: the server derived no review for this revision.
  if (raw === null || raw === undefined) return { ok: true, apply: false }

  // 🛑 EVERY SHAPE BELOW IS A REFUSAL, NOT A DEFAULT. A number, a string, an array, an object
  // with no `requirements`, a `requirements` that is not a list — each means the stored state
  // is not something this code wrote, and the safe reading of "I do not recognise this" is
  // never "carry on".
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, reason: 'unreadable' }
  const reqs = (raw as { requirements?: unknown }).requirements
  if (reqs === undefined || !Array.isArray(reqs)) return { ok: false, reason: 'unreadable' }

  // A readable review that owes nothing. Leave the live columns alone — see `apply: false`.
  if (reqs.length === 0) return { ok: true, apply: false }

  return { ok: true, apply: true, review: raw as IcpReview }
}

/**
 * 🛑 WHY APPLYING A REVIEW MUST ALSO CLEAR THE RESOLUTION STAMP — and why that is the
 * OPPOSITE of GO resolving anything.
 *
 * `icpNeedsReview` answers `false` the moment `icp_review_resolved_at` is set, whatever the
 * review says. So an ICP whose PREVIOUS review a human resolved in March carries a live
 * resolution stamp for ever. Apply a NEW unresolved review on top of it and the March stamp
 * answers for it: a brand-new untranslated constraint would read as already handled, and
 * sourcing would proceed. That is the same bypass by a different door.
 *
 * ⚠️ SO THE STAMP IS SET TO NULL, AND NULL IS THE ONLY VALUE GO MAY EVER WRITE THERE. It can
 * make an ICP MORE blocked and can never make one less blocked. GO applies a review; it does
 * not resolve one, and it has no way to express a resolution even if it wanted to — the Vida
 * operator route is the only writer of a non-null stamp, and it re-canonicalises every value
 * against the closed vocabularies before it writes one.
 */
export const resolvedStampMustClear = true

/** The refusal an operator sees when the stored review cannot be read. Stable — never reword. */
export const GO_UNREADABLE_REVIEW =
  'the held revision carries an unreadable review state; nothing has been applied'
