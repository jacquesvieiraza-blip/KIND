// ═══════════════════════════════════════════════════════════════════════════════════════
// CALIBRATION EVIDENCE BELONGS TO ONE CLIENT — the three protections, as one decision. (R1.)
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// Vida keeps the human-calibration evidence in PAGE-level state (`calib`), and the client
// workspace switches client in place. Three things were true at once:
//
//   ① `calib` was NOT in the client-switch reset — it was cleared only by a second effect
//      gated on `lc?.verdict.state`, which lags a switch by a render;
//   ② the loader had no cancellation, no request generation and no identity check, so a slow
//      read for client A could land AFTER B's and overwrite it;
//   ③ the server already returns `client_id` in the payload and the page's type did not even
//      declare it, so nothing ever compared the evidence's owner to the selected client.
//
// And the two calibration actions target `selected`. So the operator could read A's attempt
// history, phone and note, press restart, and grant **B** a calibrated restart — a free Proof
// set with real provider spend — with an operator note describing A recorded against B. The
// server re-checks B's OWN eligibility and therefore does not refuse: if B is also
// escalated-and-resolved, the wrong client gets the restart.
//
// ── 🛑 WHY A RESET ALONE IS NOT THE FIX ───────────────────────────────────────────────
//
// Clearing on switch closes ① and nothing else. The late A response still arrives afterwards
// and writes itself into the now-empty B view — the defect, with one extra step. All three
// protections are required, and all three live here so they can be driven for real:
//
//   1. IMMEDIATE RESET      — the caller clears on switch (asserted in the page guard)
//   2. GENERATION           — a response from an older request is DISCARDED
//   3. IDENTITY             — the payload's own `client_id` must equal the selected client
//
// ⚠️ AND OWNERSHIP IS NEVER INFERRED FROM TIMING. Generation alone would accept a response
// that arrived in the right order but described the wrong client (a proxy bug, a redirected
// request, a cached body). Identity alone would accept a stale response for a client the
// operator returned to — the A → B → A case. Both are asked, every time.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The only field of the payload this decision reads. The server has always sent it. */
export interface CalibrationOwner {
  /** `GET /operator/proof-review/:clientId/evidence` answers `data.client_id`. */
  client_id?: string | null
}

export interface CalibrationResponseContext {
  /** The client this request was ISSUED for. */
  requestedClientId: string
  /** `data.client_id` from the response body — the server's own statement of ownership. */
  payloadClientId: string | null | undefined
  /** The client selected RIGHT NOW, when the response came back. */
  selectedClientId: string | null
  /** The generation this request was issued at. */
  requestGeneration: number
  /** The generation the page is on now. Any switch increments it. */
  currentGeneration: number
}

/**
 *   accept            — this response describes the selected client and is current
 *   stale_generation  — a newer request exists (the operator switched, or re-selected)
 *   not_selected      — it was issued for a client who is no longer selected
 *   identity_mismatch — the SERVER says this evidence belongs to somebody else
 *   no_selection      — nothing is selected; nothing may be shown or acted on
 *   unowned           — the payload carries no `client_id` at all, so ownership is unprovable
 */
export type CalibrationAcceptance =
  | 'accept' | 'stale_generation' | 'not_selected' | 'identity_mismatch' | 'no_selection' | 'unowned'

/**
 * 🛑 MAY THIS RESPONSE BE WRITTEN INTO THE VIEW?
 *
 * ⚠️ EVERY REFUSAL IS A DISCARD, NOT AN ERROR. A response for a client the operator has left is
 * not a failure of anything — it is simply not ours any more, and writing it would be the
 * defect. The caller drops it silently and leaves the current view alone.
 *
 * ⚠️ THE GENERATION IS ASKED FIRST because it is the cheapest and the most common: a switch
 * invalidates every request in flight regardless of what they say about themselves.
 */
export function acceptCalibrationResponse(c: CalibrationResponseContext): CalibrationAcceptance {
  if (c.requestGeneration !== c.currentGeneration) return 'stale_generation'
  if (!c.selectedClientId) return 'no_selection'
  if (c.requestedClientId !== c.selectedClientId) return 'not_selected'
  // ⚠️ THE SERVER'S OWN STATEMENT, NOT OURS. A missing `client_id` cannot be read as "it must
  // be the one we asked for" — that is inferring ownership, which is what this exists to stop.
  if (!c.payloadClientId) return 'unowned'
  if (c.payloadClientId !== c.selectedClientId) return 'identity_mismatch'
  return 'accept'
}

/**
 * 🛑 MAY A CALIBRATION AUTHORITY ACTION BE OFFERED OR SUBMITTED FOR THIS CLIENT?
 *
 * This is asked TWICE and both are load-bearing: once at render, so a control built from
 * somebody else's evidence never appears; and once inside the action, because the selection
 * can change between the render and the press — the "read A → click → mutate B" sequence.
 *
 * ⚠️ IT READS THE CANONICAL SERVER `client_id`, never a browser-owned copy of who we think we
 * are looking at. A second identity maintained in the browser is a second definition, and the
 * two drift exactly when it matters.
 */
export function calibrationActionable(
  evidence: CalibrationOwner | null | undefined,
  selectedClientId: string | null,
): boolean {
  if (!selectedClientId) return false
  if (!evidence) return false
  if (!evidence.client_id) return false
  return evidence.client_id === selectedClientId
}

/** The sentence shown when evidence is present but does not belong to the selected client. */
export const CALIBRATION_MISMATCH_COPY =
  'This calibration evidence belongs to a different client, so nothing can be resolved or restarted from it. Reselect the client to read theirs.'
