// ═══════════════════════════════════════════════════════════════════════════════════════
// A PROGRAMME BELONGS TO ONE CLIENT — and Vida may only act on the one it is looking at. (BL-1.)
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// Vida switches client in place, and `loadProgramme` had neither a request generation nor an
// identity check:
//
//     const j = await fetch(`…/operator/programme?client_id=${clientId}`).then(r => r.json())
//     if (!j?.success) throw new Error(…)
//     setProg(j.data as ProgrammeTruth)          // ← whoever it belonged to
//
// The client-switch effect DOES clear `prog`. That closes the transient window and nothing
// else: a slow read for client A landing AFTER B's fast read writes A's programme back into
// the now-empty B view. And `prog` is not display: six operator actions target
// `prog.programme.id` —
//
//     qualify-batch · pause · refreeze · ready-for-approval · authorise/first ·
//     authorise/second · go-live · attach-icp
//
// — and `routes/programme.ts` scopes every one of them by PROGRAMME ID, never by the client
// Vida has selected. So the server re-proves the action against A's own state and correctly
// says yes, while the confirmation dialog the operator read named B. That is an AUTHORITY
// defect: prepare, freeze, refreeze (which invalidates the exact version A's client is
// holding on an open screen), pause, internally authorise — or make live — the WRONG CLIENT'S
// PROGRAMME, believing you are acting on the right one.
//
// ── 🛑 WHY A RESET ALONE IS NOT THE FIX ───────────────────────────────────────────────
//
// Clearing on switch removes the programme that is on screen at the moment of the switch. The
// late A response arrives afterwards and writes itself into the empty B view — the same
// defect, one step later, and now with no visible clue that anything changed. All four
// protections are required, and they live here so they can be driven for real:
//
//   1. CLIENT-SWITCH INVALIDATION — the caller bumps the generation BEFORE it loads
//   2. REQUEST GENERATION         — a response from an older request is DISCARDED
//   3. SERVER PAYLOAD IDENTITY    — `data.programme.client_id` must equal the selected client
//   4. ACTION-TIME IDENTITY       — re-asked at the PRESS, because selection moves between
//                                   the render and the click
//
// ⚠️ OWNERSHIP IS NEVER INFERRED FROM TIMING. Generation alone would accept a response that
// arrived in the right order and described the wrong programme (a proxy bug, a cached body).
// Identity alone would accept a stale response for a client the operator returned to — the
// A → B → A case. Both are asked, every time.
//
// ⚠️ AND THIS IS DELIBERATELY NOT COUPLED TO `vida-calibration-isolation.ts`. The two answer
// different questions about different payloads — calibration evidence has no "legitimately
// absent" state, a programme does (see ③ below) — and sharing one decision would mean one of
// them carrying a branch that is meaningless for the other.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The only two fields of the programme this decision reads.
 *
 * ⚠️ `client_id` IS THE SERVER'S, AND IT HAS ALWAYS BEEN SENT: `operator-programme.ts`'s
 * `PROGRAMME_COLUMNS` begins `'id, client_id, status, …'`. Vida's own type simply never
 * declared it, so nothing could compare the programme's owner to the selected client — the
 * exact shape of the calibration defect, on the money surface.
 */
export interface ProgrammeOwner {
  id?: string | null
  /** `GET /operator/programme?client_id=…` answers `data.programme.client_id`. */
  client_id?: string | null
}

export interface ProgrammeResponseContext {
  /** The client this request was ISSUED for. */
  requestedClientId: string
  /** The client selected RIGHT NOW, when the response came back. */
  selectedClientId: string | null
  /** The generation this request was issued at. */
  requestGeneration: number
  /** The generation the page is on now. Any client switch increments it. */
  currentGeneration: number
  /** `j.success` — did the API itself say this read worked? */
  apiSuccess: boolean
  /** `j.error`, or a thrown message. The server's own sentence when it did not. */
  apiError?: string | null
  /**
   * `data.programme` — the ACTION-BEARING object, or null.
   *
   * ⚠️ `null` IS A LEGITIMATE ANSWER, NOT A MISSING ONE. A client who has finished Proof and
   * not yet chosen a size genuinely has no programme, and the panel must render that state.
   * Treating it as an ownership failure would blank a correct screen and put a red error in
   * front of an operator looking at a perfectly healthy client.
   */
  programme: ProgrammeOwner | null | undefined
}

/**
 *   accept             — current, successful, and the server says this programme is theirs
 *   accept_no_programme— current, successful, and this client legitimately has no programme
 *   stale_generation   — a newer request exists (the operator switched, or re-selected)
 *   not_selected       — it was issued for a client who is no longer selected
 *   no_selection       — nothing is selected; nothing may be shown or acted on
 *   api_error          — CURRENT request, and the API said it failed
 *   unowned            — a SUCCESSFUL programme that carries no `client_id`, so ownership is
 *                        unprovable
 *   identity_mismatch  — a SUCCESSFUL programme the SERVER attributes to somebody else
 */
export type ProgrammeReason =
  | 'accept' | 'accept_no_programme'
  | 'stale_generation' | 'not_selected' | 'no_selection'
  | 'api_error' | 'unowned' | 'identity_mismatch'

/**
 *   accept  — write the payload into the view
 *   discard — SILENTLY do nothing: this response is not ours any more
 *   fail    — CURRENT and ours, and it did not work: clear the view and SHOW the reason
 */
export type ProgrammeResponseAction = 'accept' | 'discard' | 'fail'

export interface ProgrammeOutcome {
  action: ProgrammeResponseAction
  reason: ProgrammeReason
  /** Present only on `fail`. The sentence the operator must see. */
  message?: string
}

export const PROGRAMME_READ_FAILED_COPY = 'This client\'s programme could not be read'

/** The sentence shown when a programme is present but does not belong to the selected client. */
export const PROGRAMME_MISMATCH_COPY =
  'This programme belongs to a different client, so nothing can be prepared, paused, authorised or re-frozen from it. Reselect the client to read theirs.'

/**
 * 🛑 THE ONE CANONICAL DECISION for a programme read. Three questions, strictly in this order.
 *
 *   ① IS IT STILL OURS?  generation → selection → requested-vs-selected.
 *      Decided WITHOUT needing a successful payload, because a stale failure must stay silent:
 *      client A's "programme could not be read" must never appear while B is on screen.
 *
 *   ② DID IT WORK?  only now. A current failure is surfaced in the server's own words, and it
 *      CLEARS the programme — an operator who cannot be told the state must not be handed
 *      controls built from the last state we happened to have.
 *
 *   ③ IS IT THEIRS?  only on a SUCCESSFUL payload.
 *      · no programme at all  → ACCEPT. A client between Proof and the calculator has none,
 *        and that is the truth of the screen, not a fault. There is nothing to act on and
 *        `programmeActionable` refuses independently, so accepting it grants nothing.
 *      · a programme with no `client_id` → `unowned`. Ownership is unprovable and the fail is
 *        VISIBLE, because that is not a state the product produces.
 *      · a programme attributed to somebody else → `identity_mismatch`. Fail closed, loudly.
 *
 * ⚠️ ORDER ① BEFORE ② IS THE STALE-REQUEST RULE, and it is not a style choice. Asking "did it
 * work" first would print an old client's error message under the new client's name.
 *
 * ⚠️ AND ③'s "no programme" BRANCH IS NOT A HOLE. It is reached only after ① proved the
 * response is the CURRENT client's and ② proved the server answered successfully — so it says
 * "this client has no programme", which is a fact about the selected client and nobody else.
 */
export function decideProgrammeResponse(c: ProgrammeResponseContext): ProgrammeOutcome {
  // ① Still ours?
  if (c.requestGeneration !== c.currentGeneration) return { action: 'discard', reason: 'stale_generation' }
  if (!c.selectedClientId) return { action: 'discard', reason: 'no_selection' }
  if (c.requestedClientId !== c.selectedClientId) return { action: 'discard', reason: 'not_selected' }

  // ② Did it work?
  if (c.apiSuccess !== true) {
    const said = (c.apiError ?? '').trim()
    return { action: 'fail', reason: 'api_error', message: said || PROGRAMME_READ_FAILED_COPY }
  }

  // ③ Is it theirs?
  // A successful read with no programme is this client's real state — see the note above.
  if (!c.programme) return { action: 'accept', reason: 'accept_no_programme' }
  // ⚠️ THE SERVER'S OWN STATEMENT, NOT OURS. A missing `client_id` cannot be read as "it must
  // be the one we asked for" — that is inferring ownership, which is what this exists to stop.
  if (!c.programme.client_id) return { action: 'fail', reason: 'unowned', message: PROGRAMME_MISMATCH_COPY }
  if (c.programme.client_id !== c.selectedClientId) {
    return { action: 'fail', reason: 'identity_mismatch', message: PROGRAMME_MISMATCH_COPY }
  }
  return { action: 'accept', reason: 'accept' }
}

/**
 * 🛑 MAY A PROGRAMME AUTHORITY ACTION BE OFFERED OR SUBMITTED FOR THIS CLIENT?
 *
 * This is asked at the PRESS, and that is not belt-and-braces over the read guard — it is the
 * other half of the defect. The selection can change between the render that drew the control
 * and the click that fires it, and every one of these actions carries a programme id the
 * SERVER will scope by id alone. "Read A → switch to B → click" is the sequence, and only a
 * check at the press can see it.
 *
 * ⚠️ IT READS THE CANONICAL SERVER `client_id`, never a browser-owned copy of who we think we
 * are looking at. A second identity maintained in the browser is a second definition, and the
 * two drift exactly when it matters.
 *
 * ⚠️ AND IT REQUIRES AN `id`. Every guarded action targets `programme.id`; a programme object
 * with no id is nothing an action can be built from, whatever its ownership says.
 */
export function programmeActionable(
  programme: ProgrammeOwner | null | undefined,
  selectedClientId: string | null,
): boolean {
  if (!selectedClientId) return false
  if (!programme) return false
  if (!programme.id) return false
  if (!programme.client_id) return false
  return programme.client_id === selectedClientId
}
