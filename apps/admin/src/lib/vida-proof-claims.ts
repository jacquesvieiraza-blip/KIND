// ═══════════════════════════════════════════════════════════════════════════════════════
// STALE PROOF CLAIMS — seeing them, and reconciling one deliberately. (B4.)
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// A Proof claim is durable and NOTHING releases it on a timer. `PROOF_CLAIM_STALE_MS` is
// visibility-only and says so in the source. That is correct: an automatic time-based release
// would hand a client their attempt back while the original run was still alive, and could
// then produce a second batch for one attempt.
//
// The consequence is that a process death mid-Proof leaves an `open` claim, and
// `proof_pass_claims_one_open` then refuses every further attempt with `in_flight` — for
// ever. The remedy exists (`GET /operator/proof-claims/stale`,
// `POST /operator/proof-claims/:claimId/reconcile`) and Vida could not reach it, so the
// client was permanently blocked from Proof with the cure sitting behind no button.
//
// ── 🛑 WHAT THIS MUST NEVER BECOME ────────────────────────────────────────────────────
//
// The automatic release wearing a person's face. So:
//   · loading the panel issues ONE GET and settles nothing;
//   · a decision is chosen by a human, one claim at a time, with a written reason;
//   · the server still refuses a claim that is not stale — this never pre-empts that;
//   · a row leaves the list only when the SERVER says the claim was settled.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const STALE_CLAIMS_PATH = '/api/proxy/operator/proof-claims/stale'

/** Built from the canonical claim id, never assembled from parts at a call site. */
export function reconcilePath(claimId: string): string {
  return `/api/proxy/operator/proof-claims/${encodeURIComponent(claimId)}/reconcile`
}

/** Exactly what `staleProofClaims()` returns per row. */
export interface StaleClaim {
  claimId: string
  clientId: string
  companyName: string | null
  authority: string
  icpId?: string | null
  claimedAt: string
  /** True when no run outcome was recorded after the claim — the process-death signature. */
  noTerminalEvidence?: boolean
  heldMs?: number
}

export interface StaleClaimsPayload {
  success?: boolean
  data?: {
    stale_after_ms?: number
    claims?: StaleClaim[]
    release_warning?: string
    complete_warning?: string
  }
  error?: string
}

export type ClaimsViewState = 'loading' | 'ok' | 'empty' | 'failed'

export interface ClaimsView {
  state: ClaimsViewState
  claims: StaleClaim[]
  staleAfterMs: number | null
  releaseWarning: string | null
  completeWarning: string | null
  error: string | null
}

/** 🛑 A FAILED READ IS NOT "NOTHING IS STUCK". */
export const CLAIMS_READ_FAILED_COPY =
  'The stale Proof claims could not be read, so this list is NOT proof that none exist. Reload, and check the API if it keeps failing.'

export const CLAIMS_EMPTY_COPY =
  'No Proof claim has been open long enough to need a person. Nothing is stuck.'

export function claimsView(payload: StaleClaimsPayload | null, failed = false): ClaimsView {
  if (failed || !payload || payload.success !== true) {
    return {
      state: 'failed', claims: [], staleAfterMs: null,
      releaseWarning: null, completeWarning: null,
      error: (payload?.error && String(payload.error)) || CLAIMS_READ_FAILED_COPY,
    }
  }
  const claims = payload.data?.claims ?? []
  return {
    state: claims.length ? 'ok' : 'empty',
    claims,
    staleAfterMs: payload.data?.stale_after_ms ?? null,
    // ⚠️ THE WARNINGS ARE THE SERVER'S WORDS. They explain what each decision spends or gives
    // back, and re-writing them here would be a second version of a safety sentence.
    releaseWarning: payload.data?.release_warning ?? null,
    completeWarning: payload.data?.complete_warning ?? null,
    error: null,
  }
}

/** The two decisions the server accepts, and nothing else. */
export type ReconcileDecision = 'completed' | 'released'

export interface ReconcileRequest {
  decision: ReconcileDecision
  note: string
}

export type ReconcileValidation =
  | { ok: true; body: ReconcileRequest }
  | { ok: false; message: string }

/**
 * 🛑 THE NOTE IS REQUIRED BECAUSE THE SERVER REQUIRES IT, and refusing locally is not a
 * duplicate of that check — it is what stops the operator losing a typed decision to a 400.
 * The wording matches the route so the two cannot teach different things.
 */
export const RECONCILE_NOTE_REQUIRED =
  'A note is required: say what you checked and why the original run will not finish.'

export const RECONCILE_DECISION_REQUIRED =
  'Choose Completed or Released. There is no third answer, and nothing is settled until you do.'

export function validateReconcile(decision: string | null, note: string): ReconcileValidation {
  if (decision !== 'completed' && decision !== 'released') {
    return { ok: false, message: RECONCILE_DECISION_REQUIRED }
  }
  const trimmed = note.trim()
  if (!trimmed) return { ok: false, message: RECONCILE_NOTE_REQUIRED }
  // The server clamps at 4000; clamping here keeps the two the same length rather than
  // letting the server silently truncate what the operator believes they recorded.
  return { ok: true, body: { decision, note: trimmed.slice(0, 4000) } }
}

export type ReconcileOutcome =
  | { ok: true }
  | { ok: false; message: string }

export const RECONCILE_FAILED_COPY =
  'The claim could not be reconciled, so nothing was changed and it is still open.'

/**
 * Submit ONE reconciliation.
 *
 * ⚠️ IT RETURNS FAILURE FAITHFULLY. The server refuses a claim that is not stale, one already
 * settled, and one that does not exist — and each refusal must leave the row on screen. A
 * panel that removed the row optimistically would tell the operator a blocked client was
 * unblocked.
 */
export async function submitReconcile(
  post: (path: string, body: unknown) => Promise<{ success?: boolean; error?: string }>,
  claimId: string,
  decision: string | null,
  note: string,
): Promise<ReconcileOutcome> {
  const v = validateReconcile(decision, note)
  if (!v.ok) return { ok: false, message: v.message }
  try {
    const r = await post(reconcilePath(claimId), v.body)
    if (r && r.success === true) return { ok: true }
    return { ok: false, message: (typeof r?.error === 'string' && r.error) || RECONCILE_FAILED_COPY }
  } catch (e) {
    const m = e instanceof Error && e.message && e.message.length < 300 ? e.message : RECONCILE_FAILED_COPY
    return { ok: false, message: m }
  }
}

/**
 * Load the list. The ONLY request made on render.
 *
 * ⚠️ GET, AND THE TESTS ASSERT IT. Rendering must settle nothing — a panel that could POST on
 * mount would be the automatic release this design exists to refuse.
 */
export async function loadStaleClaims(
  get: (path: string) => Promise<StaleClaimsPayload>,
): Promise<ClaimsView> {
  try {
    return claimsView(await get(STALE_CLAIMS_PATH))
  } catch {
    return claimsView(null, true)
  }
}
