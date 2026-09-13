// ═══════════════════════════════════════════════════════════════════════════════════════
// HISTORICAL PROOF CLASSIFICATION — the operator's two decisions, as a decision layer. (B2.)
//
// ── WHAT THIS IS FOR ───────────────────────────────────────────────────────────────────
//
// `claim_proof_authority` fails closed on pre-ledger ambiguity. Two protected operator routes
// are the remedy, and Vida could not show them to exactly the right clients because it could
// not tell who needed classifying. The evidence GET now answers that, server-side, from the
// RPC's own predicates.
//
// ── 🛑 THE ONE RULE THIS MODULE EXISTS TO HOLD ────────────────────────────────────────
//
// THE BROWSER NEVER RE-DERIVES THE REQUIREMENT. `controlsFor` reads the two server booleans
// and nothing else — not `passes_done`, not `restart_used_at`, not the ledger. An authority
// rule reconstructed here would be a second definition of "is this client blocked", and the
// two would drift apart silently, which is the whole defect class this repo keeps closing.
//
// ⚠️ AND NOTHING IS DEFAULTED. Historical truth is a human decision: no pre-selected pass
// count, no pre-selected restart outcome, no recommendation dressed as a fact. The operator
// chooses, writes down what they read, and the server records it.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const EVIDENCE_PATH = (clientId: string) =>
  `/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/evidence`

export const CLASSIFY_PASSES_PATH = (clientId: string) =>
  `/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/classify-passes`

export const CLASSIFY_RESTART_PATH = (clientId: string) =>
  `/api/proxy/operator/proof-review/${encodeURIComponent(clientId)}/classify-restart`

/**
 * Exactly the fields of the evidence payload this decision layer reads.
 *
 * ⚠️ THE TWO BOOLEANS ARE OPTIONAL, AND THEIR ABSENCE HIDES THE CONTROLS. An older API that
 * does not send them cannot establish that classification is required, and a control shown on
 * a guess is a control that can classify the wrong client. Absent means NOT SHOWN.
 */
export interface ClassificationEvidence {
  legacy_passes_classification_required?: boolean
  legacy_restart_classification_required?: boolean
  /** The persisted column, `null` when unclassified. Displayed; never used to decide. */
  legacy_passes_classified_as?: number | null
}

export interface ClassificationControls {
  passes: boolean
  restart: boolean
}

/**
 * 🛑 WHICH CONTROLS RENDER. Server booleans only, and `=== true` only.
 *
 * ⚠️ THE TWO ARE INDEPENDENT. A client may need passes only, restart only, both or neither —
 * and settling one must never clear the other. That independence lives here, and it lives
 * nowhere else, because the panel holds no local "done" state at all: after a successful
 * classification it re-reads the evidence and renders whatever the SERVER now says.
 */
export function controlsFor(e: ClassificationEvidence | null | undefined): ClassificationControls {
  return {
    passes:  e?.legacy_passes_classification_required === true,
    restart: e?.legacy_restart_classification_required === true,
  }
}

// ── THE PASS CLASSIFICATION ───────────────────────────────────────────────────────────

/** The only three answers the route accepts. Presented in this order; none is pre-selected. */
export const PASS_CHOICES = [0, 1, 2] as const
export type PassChoice = (typeof PASS_CHOICES)[number]

export const PASS_CHOICE_REQUIRED =
  'Choose 0, 1 or 2 — how many of the two automatic Proof passes this client legitimately consumed. Nothing is recorded until you do.'

export const CLASSIFY_NOTE_REQUIRED =
  'A note is required: say what evidence you read. A classification with no reasoning is the guess this control exists to avoid.'

export type PassValidation =
  | { ok: true; body: { passes: PassChoice; note: string } }
  | { ok: false; message: string }

export function validatePasses(passes: number | null, note: string): PassValidation {
  if (passes !== 0 && passes !== 1 && passes !== 2) return { ok: false, message: PASS_CHOICE_REQUIRED }
  const trimmed = note.trim()
  if (!trimmed) return { ok: false, message: CLASSIFY_NOTE_REQUIRED }
  // The route clamps at 4000; clamping here keeps the two the same length rather than letting
  // the server silently shorten what the operator believes they recorded.
  return { ok: true, body: { passes, note: trimmed.slice(0, 4000) } }
}

// ── THE RESTART CLASSIFICATION ────────────────────────────────────────────────────────

/** The two meanings the route accepts. Neither is pre-selected, and neither is inferred. */
export const RESTART_CHOICES = ['completed', 'released'] as const
export type RestartChoice = (typeof RESTART_CHOICES)[number]

export const RESTART_CHOICE_REQUIRED =
  'Choose Completed (they received their restart set) or Released (it was burned before they saw anything). Nothing is recorded until you do.'

/**
 * ⚠️ THE SENTENCE THAT STOPS THE OBVIOUS WRONG INFERENCE, in the route's own terms: zero
 * restart-attributed leads is NOT evidence of a burn, because a batch whose surfacing UPDATE
 * failed leaves exactly that signature with the leads sitting in the table invisible.
 */
export const RESTART_EVIDENCE_WARNING =
  '"No restart leads on their desk" does not decide this. A batch whose surfacing failed looks identical to one that never ran — read the attempt history and the run outcomes before choosing.'

export type RestartValidation =
  | { ok: true; body: { status: RestartChoice; note: string } }
  | { ok: false; message: string }

export function validateRestart(status: string | null, note: string): RestartValidation {
  if (status !== 'completed' && status !== 'released') return { ok: false, message: RESTART_CHOICE_REQUIRED }
  const trimmed = note.trim()
  if (!trimmed) return { ok: false, message: CLASSIFY_NOTE_REQUIRED }
  return { ok: true, body: { status, note: trimmed.slice(0, 4000) } }
}

// ── SUBMISSION ────────────────────────────────────────────────────────────────────────

export type ClassifyOutcome = { ok: true } | { ok: false; message: string }

export const CLASSIFY_FAILED_COPY =
  'The classification could not be recorded, so nothing was changed and this client is still unclassified.'

type Post = (path: string, body: unknown) => Promise<{ success?: boolean; error?: string }>

async function send(post: Post, path: string, body: unknown): Promise<ClassifyOutcome> {
  try {
    const r = await post(path, body)
    if (r && r.success === true) return { ok: true }
    return { ok: false, message: (typeof r?.error === 'string' && r.error) || CLASSIFY_FAILED_COPY }
  } catch (e) {
    const m = e instanceof Error && e.message && e.message.length < 300 ? e.message : CLASSIFY_FAILED_COPY
    return { ok: false, message: m }
  }
}

/**
 * Record how many automatic passes this client legitimately consumed.
 *
 * ⚠️ NO `force`. Correcting an existing classification is a separate, deliberate decision the
 * route audits differently; this control only ever classifies a client the SERVER has said is
 * unclassified, so a `409 already_classified` here means the state moved under the operator
 * and the honest answer is to show it, not to overwrite.
 */
export async function submitPassClassification(
  post: Post, clientId: string, passes: number | null, note: string,
): Promise<ClassifyOutcome> {
  const v = validatePasses(passes, note)
  if (!v.ok) return { ok: false, message: v.message }
  return send(post, CLASSIFY_PASSES_PATH(clientId), v.body)
}

export async function submitRestartClassification(
  post: Post, clientId: string, status: string | null, note: string,
): Promise<ClassifyOutcome> {
  const v = validateRestart(status, note)
  if (!v.ok) return { ok: false, message: v.message }
  return send(post, CLASSIFY_RESTART_PATH(clientId), v.body)
}

// ── READING THE EVIDENCE ──────────────────────────────────────────────────────────────

export interface ClassificationView {
  state: 'loading' | 'ok' | 'failed'
  evidence: ClassificationEvidence | null
  error: string | null
}

export const EVIDENCE_READ_FAILED_COPY =
  'The classification state could not be read, so no classification control is shown. This is NOT proof that none is needed — reload, and check the API if it keeps failing.'

/**
 * Load the canonical evidence.
 *
 * ⚠️ FAILURE HIDES THE CONTROLS AND SAYS SO. Unknown authority means no action: a control
 * rendered on an unreadable state could classify a client nobody established anything about.
 * The operator is told rather than shown a button that may be wrong.
 */
export async function loadClassificationEvidence(
  get: (path: string) => Promise<{ success?: boolean; data?: ClassificationEvidence; error?: string }>,
  clientId: string,
): Promise<ClassificationView> {
  try {
    const r = await get(EVIDENCE_PATH(clientId))
    if (!r || r.success !== true || !r.data) {
      return { state: 'failed', evidence: null, error: (typeof r?.error === 'string' && r.error) || EVIDENCE_READ_FAILED_COPY }
    }
    return { state: 'ok', evidence: r.data, error: null }
  } catch {
    return { state: 'failed', evidence: null, error: EVIDENCE_READ_FAILED_COPY }
  }
}
