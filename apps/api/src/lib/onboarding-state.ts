// ═══════════════════════════════════════════════════════════════════════════════════════
// THE ONBOARDING STATE AUTHORITY — PURE, DATABASE-FREE, AND THE ONLY DEFINITION OF READY.
//
// 🛑 WHY IT HAS ITS OWN MODULE (founder-approved 16 Sep, S1-ONB-001). The eleven-fact gate in
// `routes/icps.ts` is a Zod refinement, so it cannot `await` — the authority must be
// STATICALLY importable. It used to sit in `brief-draft.ts`, which imports the database
// client, and a static import of that file did two unacceptable things: it dragged the
// database into the route's module graph, and it broke every existing suite that replaces
// `./brief-draft` wholesale with a double — the route threw and the turn became a 503.
//
// ⚠️ SO THIS FILE IMPORTS NOTHING BUT `@kind/shared`. No database, no request, no I/O. Facts
// in, verdict out — which is exactly what lets the SAME function answer at four boundaries
// that have nothing else in common: the chat turn, the confirm endpoint, `/auth/onboard` and
// the portal's own progression.
//
// ⚠️ `brief-draft.ts` RE-EXPORTS IT so existing callers are unaffected. That is a second NAME
// for one function, never a second answer.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { briefDraftFacts, BRIEF_FACT_LABEL, type BriefDraftFacts, type BriefFactsResult } from '@kind/shared'

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 ⚑ 16 Sep (S1-ONB-001) — THE ONE ONBOARDING READINESS AUTHORITY.
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
//
// Readiness was decided in NINE places that did not read the same thing, and the customer met
// the disagreement on screen: a finished targeting plan with a live "Confirm my brief" button
// sitting above a line that said **"Based in — still needed"**. Three of those places are the
// reason:
//
//   · the completion gate counted the eleven over `draft ∪ this model reply`;
//   · `mayConfirmBrief` counted the eleven over the DRAFT ALONE — a narrower input, so a fact
//     the gate had accepted could be invisible to it;
//   · the portal rendered the plan and the CTA on `proposed !== null`, which is not a fact
//     check at all — it records that a completion once arrived in this browser tab.
//
// 🛑 ONE FUNCTION, ONE INPUT, EVERY BOUNDARY. This takes the PERSISTED draft and nothing else,
// which is precisely what makes it callable from all four: the chat turn, the confirm
// endpoint, `/auth/onboard` and the portal's own progression. None of those has a model reply;
// all of them have a draft. (An authority that needed a reply could never reach the last
// three — which is why the resolution now flows INTO the draft, see `routes/icps.ts`.)
//
// ⚠️ IT ADDS NO SECOND DEFINITION OF THE ELEVEN. The targeting half is `draftProgress` →
// `briefDraftFacts` → `briefFacts`, the one canonical counter in `@kind/shared`. This file
// does not contain a fact list and must never grow one.
//
// ⚠️ AND COUNTRY IS NOT A TWELFTH FACT (founder-ratified 16 Sep). `BRIEF_FACTS` is eleven and
// stays eleven. The client's own country is an ACCOUNT requirement: `onboardSchema` refuses
// without it, `clients.country` DEFAULTS TO 'South Africa' — the silent placeholder the
// founder ruled out by name — and `/auth/onboard` sits downstream of `confirmed_at`. So today
// a client can be stamped CONFIRMED and only then be refused an account. Two classes, one
// answer, eleven facts.
//
// ⚠️ `phone` IS DELIBERATELY ABSENT. It is optional in `onboardSchema`, the prompt calls it
// "genuinely optional", and it is the field a future human-handoff will reuse. It must never
// become a readiness blocker.
//
// ⚠️ READY IS NOT CONFIRMED. This answers "does the system hold enough to proceed", never
// "has the client agreed". `confirmed_at` remains an explicit act and is asked separately
// everywhere (`confirmBriefDraft`).
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The account facts onboarding cannot truthfully progress without. NOT Brief facts. */
export const ACCOUNT_FACTS = ['country'] as const
export type AccountFactId = (typeof ACCOUNT_FACTS)[number]

/** Founder-facing words for the account class, kept beside the class rather than in the
 *  shared eleven-fact label map — which must stay a map of the ELEVEN and nothing else. */
export const ACCOUNT_FACT_LABEL: Record<AccountFactId, string> = {
  country: 'Which country your business is based in',
}

export type OnboardingState = {
  /** `conversing` — the system still needs something · `ready` — it does not. */
  state: 'conversing' | 'ready'
  /** Of the canonical eleven, in the approved order. */
  unresolvedTargeting: BriefFactsResult['missing']
  /** Account facts, outside the eleven. */
  unresolvedAccount: AccountFactId[]
  /** Both classes as the words a person would use. Targeting first, account last. */
  unresolvedLabels: string[]
  /** The eleven-fact result, unchanged, for callers that already speak it. */
  targeting: BriefFactsResult
}

export function onboardingState(facts: BriefDraftFacts | null | undefined): OnboardingState {
  const targeting = briefDraftFacts(facts ?? null)
  const said = (v: unknown): boolean => typeof v === 'string' && v.trim() !== ''
  const unresolvedAccount = ACCOUNT_FACTS.filter(id => !said((facts ?? {})[id]))
  return {
    state: targeting.complete && unresolvedAccount.length === 0 ? 'ready' : 'conversing',
    unresolvedTargeting: targeting.missing,
    unresolvedAccount: [...unresolvedAccount],
    unresolvedLabels: [
      ...targeting.missing.map(id => BRIEF_FACT_LABEL[id]),
      ...unresolvedAccount.map(id => ACCOUNT_FACT_LABEL[id]),
    ],
    targeting,
  }
}
