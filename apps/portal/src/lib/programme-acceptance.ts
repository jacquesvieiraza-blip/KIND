// ═══════════════════════════════════════════════════════════════════════════════════════
// ACCEPTING THE RECOMMENDATION — the decision, separated from the screen. (B1.)
//
// ── THE DEFECT THIS CLOSES ─────────────────────────────────────────────────────────────
//
// `programmes.recommendation_accepted_at` has exactly ONE canonical writer —
// `acceptRecommendation`, reached only through `POST /my/programme/accept` — and the Milla
// product had no control that called it. `POST /my/programme/checkout/first` correctly
// refuses while it is null. So the live journey was:
//
//     accept Proof -> calculator -> "Build my programme" -> payment card
//       -> press pay -> 409 not_accepted
//
// A client could not complete the acceptance step, and therefore could not pay P1 at all.
//
// ── 🛑 THE THREE THINGS THAT MUST STAY SEPARATE (founder-locked) ──────────────────────
//
//   CHOOSING a size is not accepting.   ACCEPTING is not paying.   PAYING is not approving.
//
// So nothing here writes `recommendation_accepted_at`, nothing here mints a checkout, and
// nothing here infers acceptance from the calculator. This module decides only WHICH of the
// three the client is currently being asked for, and it decides it from SERVER TRUTH.
//
// ── ⚠️ WHY THERE IS NO LOCAL "accepted" FLAG ANYWHERE ─────────────────────────────────
//
// `paymentUnlocked` reads `recommendation.acceptedAt` — the persisted column, re-read from
// `GET /my/programme` after the POST. A browser-side boolean would unlock the payment card on
// a request that never landed, which is the exact failure the server's 409 exists to prevent,
// moved one layer up where nobody would see it. A failed acceptance leaves the canonical
// field null, so payment stays shut with no extra code.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The one canonical acceptance route. Never built by hand at a call site. */
export const PROGRAMME_ACCEPT_PATH = '/my/programme/accept'

/** Exactly the programme facts this decision reads. Nothing else is consulted. */
export interface AcceptanceFacts {
  /** `stage` cannot say — DRAFT and "no programme at all" are both 'Proof'. */
  hasProgramme?: boolean
  stage: string
  /**
   * ⚠️ OPTIONAL, AND ITS ABSENCE FAILS CLOSED. An older API response carrying no
   * `recommendation` block cannot establish acceptance, so it reads as "still to accept":
   * the client is asked (which is safe and idempotent) and payment stays shut.
   */
  recommendation?: { acceptedAt?: string | null } | null
  money: {
    firstPaidAt: string | null
    firstAuthorisedAt?: string | null
  }
}

/**
 *   hidden          — not the client's decision right now (no programme, or past this stage)
 *   accept_required — the recommendation is on the table and has NOT been accepted
 *   accepted        — acceptance is persisted (or P1 is already settled, which implies it)
 */
export type AcceptanceGate = 'hidden' | 'accept_required' | 'accepted'

/** The stage at which accepting is the client's next act. The founder's stage name. */
export const ACCEPTANCE_STAGE = 'Recommendation'

export function acceptanceGate(p: AcceptanceFacts): AcceptanceGate {
  if (!p.hasProgramme) return 'hidden'
  // P1 already settled — by money or by internal authority — so acceptance is behind them.
  // Asking again would be a screen disagreeing with a paid programme.
  if (p.money.firstPaidAt || p.money.firstAuthorisedAt) return 'accepted'
  if (p.recommendation?.acceptedAt) return 'accepted'
  if (p.stage !== ACCEPTANCE_STAGE) return 'hidden'
  return 'accept_required'
}

/**
 * 🛑 MAY THE CLIENT BE ASKED FOR THE FIRST PAYMENT?
 *
 * ⚠️ PERSISTED ACCEPTANCE, AND NOTHING ELSE. Not a local flag, not the calculator having been
 * used, not the payment card having rendered once. `/my/programme/checkout/first` applies the
 * same rule server-side and is the control; this is what stops the client meeting it as a
 * dead end.
 */
export function paymentUnlocked(p: AcceptanceFacts): boolean {
  return !!p.recommendation?.acceptedAt
}

/** What `POST /my/programme/accept` answers. */
export interface AcceptResponse {
  success?: boolean
  accepted_at?: string | null
  already_accepted?: boolean
  code?: string
  error?: string
}

export type AcceptOutcome =
  | { ok: true; acceptedAt: string | null; alreadyAccepted: boolean }
  | { ok: false; message: string }

/** The sentence shown when the route answered nothing usable. Never a stack trace. */
export const ACCEPT_FAILED_COPY =
  'We could not record your acceptance just now, so nothing has changed and nothing has been charged. Please try again.'

/**
 * Post the acceptance through the canonical route.
 *
 * ⚠️ `already_accepted` IS SUCCESS, NOT A CLASH. A double click, a retried request and a
 * re-entry after a lost response all land here; the server answers `already_accepted: true`
 * with the ORIGINAL timestamp, and treating that as an error would show a failure for a
 * decision that is safely recorded. The route is idempotent by design
 * (`.is('recommendation_accepted_at', null)` on the update) and so is this.
 *
 * ⚠️ THE TRANSPORT IS INJECTED so the production decision can be driven for real in tests
 * without a network — the same reason `sendTx`'s callers are testable server-side.
 */
export async function postAcceptance(
  post: (path: string, body: unknown) => Promise<AcceptResponse>,
): Promise<AcceptOutcome> {
  try {
    const r = await post(PROGRAMME_ACCEPT_PATH, {})
    if (r && r.success === true) {
      return {
        ok: true,
        acceptedAt: r.accepted_at ?? null,
        alreadyAccepted: r.already_accepted === true,
      }
    }
    const msg = typeof r?.error === 'string' && r.error.trim() ? r.error.trim() : ACCEPT_FAILED_COPY
    return { ok: false, message: msg }
  } catch (e) {
    // ⚠️ THE SERVER'S OWN SENTENCE WINS WHERE THERE IS ONE. `apiFetch` throws an Error whose
    // message is the API's `error` string, so a refusal the server explained reaches the
    // client in the server's words rather than a generic apology.
    const msg = e instanceof Error && e.message && e.message.length < 300 ? e.message : ACCEPT_FAILED_COPY
    return { ok: false, message: msg }
  }
}
