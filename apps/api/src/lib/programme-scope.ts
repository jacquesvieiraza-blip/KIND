// ═══════════════════════════════════════════════════════════════════════════════════════
// WHAT COUNTS AS *THIS PROGRAMME'S* ACTIVITY — one rule, executable.
//
// ⚑ 1 Sep (HOUSE READINESS). The founder walked Client Zero and found history wearing the
// clothes of current work:
//
//   • Milla → Pipeline showed **Approved 16 · Contacted 145** — and 16 + 145 = **161**, exactly
//     House's historical revealed-lead count, on an account sitting at Proof with no sourcing
//     authority and no outreach. Nothing new had happened; the page was counting 2026's
//     legacy desk as though the programme had produced it.
//   • Teams Hub showed **"166 Leads today"** — House's ALL-TIME lead total, relabelled today.
//
// 🛑 THE CAUSE IS ONE MISSING SENTENCE, NOT TWO BUGS. `/leads/pipeline` selects
// `leads WHERE client_id = ? AND revealed_at IS NOT NULL` and stops. `revealed_at` is the
// LEGACY claim — it means "the client paid $4 and we unmasked this person" — so on a
// programme account it selects precisely the rows the programme model retired.
//
// ⚠️ AND THE DEEPER FINDING, WHICH IS WHY MILLA AND VIDA DISAGREE ABOUT THE SAME ACCOUNT:
// **nothing marks a client as being on the programme model.** `readCustomerProgramme` reads
// "no programme row" and answers `NO_PROGRAMME` → stage **Proof** (customer-programme.ts:65).
// Vida reads the same absence and says *"No programme for this client. They are on the legacy
// model."* Both are correct about the data and neither is wrong about the code — they are
// describing one fact in two vocabularies, because the fact "which model is this client on?"
// is not recorded anywhere. **House genuinely has no programme row.**
//
// ⚠️ SO THIS MODULE DOES NOT INVENT THAT FLAG. Inventing one would be a schema change and a
// commercial decision, and both belong to the founder. What it does instead is make the
// boundary EXPLICIT and executable, so that the moment a client has a programme, every
// surface counts the same rows — and until then a legacy client's screens are untouched.
//
// ⚠️ HISTORY IS NEVER DELETED, HIDDEN OR REWRITTEN. Every rule here is a READ filter. The
// founder's instruction was explicit: *"Historical House evidence must be PRESERVED, not
// deleted."* Nothing in this file writes, and nothing it gates makes a row unreachable — the
// operator surfaces and the audit trail still read every one of them.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The rows a client's CURRENT programme may claim as its own.
 *
 * `programmeId === null` means "this client has no programme" — a legacy client, or House
 * today. In that state the answer is deliberately `'legacy'`: the caller keeps its existing
 * behaviour untouched. Changing what a legacy client sees is not this module's business, and
 * R74 keeps that runtime live until the coordinated migration.
 */
export type Scope =
  /** A programme exists: only rows attributed to THIS programme count. */
  | { mode: 'programme'; programmeId: string }
  /** No programme: the caller's pre-existing legacy behaviour applies, unchanged. */
  | { mode: 'legacy' }

export function scopeFor(programmeId: string | null | undefined): Scope {
  return programmeId ? { mode: 'programme', programmeId } : { mode: 'legacy' }
}

/**
 * 🛑 MAY THIS ROW COUNT AS CURRENT PROGRAMME ACTIVITY?
 *
 * The whole isolation rule, in one function, so every surface asks it the same way and a
 * future page cannot invent a looser version of it.
 *
 * ⚠️ ATTRIBUTION IS POSITIVE, NEVER INFERRED. A row belongs to a programme only if it CARRIES
 * that programme's id. A row with `programme_id = null` is not "probably current" — it is
 * pre-programme history, which is exactly what the 161 leads are. Treating null as a match is
 * the bleed, written as code.
 */
export function rowCountsForProgramme(
  scope: Scope,
  rowProgrammeId: string | null | undefined,
): boolean {
  if (scope.mode === 'legacy') return true      // untouched: legacy clients keep their screens
  return rowProgrammeId === scope.programmeId
}

/**
 * Filter a set of attributed rows down to the ones this programme may claim.
 *
 * Generic over the row so the same rule serves leads, enrollments, sends, replies and
 * meetings — the founder listed all five, and five hand-written filters is five chances to
 * disagree.
 */
export function onlyThisProgramme<T extends { programme_id?: string | null }>(
  scope: Scope,
  rows: readonly T[],
): T[] {
  if (scope.mode === 'legacy') return [...rows]
  return rows.filter(r => rowCountsForProgramme(scope, r.programme_id))
}

/**
 * Why a surface is showing nothing — so an empty programme reads as "not started yet" rather
 * than as a failure, and never as "your history vanished".
 *
 * ⚠️ THE SENTENCE MATTERS AS MUCH AS THE FILTER. A client whose pipeline correctly empties
 * because their programme has not sourced anyone must not conclude that work was lost. The
 * history is still there; it simply is not this programme's.
 */
export const HISTORY_NOT_THIS_PROGRAMME =
  'Nothing has been sourced on this programme yet. Earlier activity on this account belongs to ' +
  'a previous engagement and is kept on record — it is not counted here.'
