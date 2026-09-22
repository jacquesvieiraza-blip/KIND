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

import {
  briefDraftFacts, BRIEF_FACT_LABEL,
  type BriefDraftFacts, type BriefFactsResult, type BriefFactId,
} from '@kind/shared'
// ⚠️ PURE, AND THAT IS WHY IT MAY BE IMPORTED HERE. This module has to stay statically
// importable by `routes/icps.ts` — the eleven-fact gate is a Zod refinement and cannot await
// — so nothing it imports may reach the database client. `icp-provider-translation` has no
// imports at all: it is the closed vocabularies and a matcher, nothing else.
//
// ⚠️ AND THE PACKAGE NAME IS NOT WRITTEN OUT ABOVE ON PURPOSE. `s1-onb-001` asserts this
// FILE's source does not contain it, reading the raw text — so naming it even in a comment
// about not importing it is enough to fail the guard that keeps this module importable.
import { translateProviderList, PROVIDER_VOCABULARIES } from './icp-provider-translation'

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

/**
 * ── 🛑 ⚑ 22 Sep — THE FACTS A CLIENT ANSWERED IN WORDS WE CANNOT USE (founder-locked) ───
 *
 * 🛑 THE DEFECT THIS CLOSES, AND IT IS SILENT. A fact was held the moment it was a non-empty
 * string, so *"a few dozen people"* or *"whoever runs ops"* finished the Brief at eleven of
 * eleven. `deriveProviderReview` could place neither on a closed list, so `icp_review` was
 * set — and `runIcpJob` THROWS while a review is outstanding: *"nothing may be sourced
 * against it until an operator has reviewed it."* No provider call, no leads, no Proof. The
 * client finished talking to Milla and nothing ever happened, with nothing on their screen
 * to say why.
 *
 * 🛑 AND NOBODY IS TOLD. Promotion writes an `icp_review_pending` operator task, and Vida has
 * no surface that lists it — `programme-lifecycle.ts` says so in its own words: the task is
 * *"read by no surface in Vida"*. So the queue that is supposed to rescue this client is one
 * nobody opens.
 *
 * 🛑 THIS IS A KNOWN KILLER IN THE NEIGHBOURING FIELD. `icp-provider-translation`'s note:
 * Northstar Operations Studio said *"professional services"*, a review was owed, **no search
 * was ever made**, and seven of the last seven attempts ended the same way.
 *
 * ── THE RULING (founder, 22 Sep) ────────────────────────────────────────────────────────
 *
 * ⛓️ IT AMENDS `s1-runtime-batch.test.ts`'s *"THE CLIENT NEVER SPEAKS APOLLO — an
 * un-normalisable company size still completes"*, whose stated purpose is that *"our provider
 * vocabulary must not refuse the client their Brief"*. That purpose is kept and honoured
 * better: refusing their PROOF for the same reason, silently, is the same refusal wearing a
 * later timestamp. Milla asking one clarifying question is not our vocabulary refusing them;
 * it is her doing her job, with the only person who can answer, while they are still there.
 *
 * ⚠️ AND THE OTHER HALF OF THAT LOCK IS UNTOUCHED: the client's phrase must never be smuggled
 * into a provider filter. Nothing here writes a value anywhere. It reports which facts could
 * not be used and translates nothing itself.
 *
 * ⚠️ TWO FACTS, NOT THREE, AND THE THIRD IS DELIBERATE. `target_category` is NOT here:
 * `promotion.ts` already ruled that owing a review on it would make *"every single signup
 * become an operator task — a Needs-you list with everybody on it"*, because almost no
 * client's own category is one of our sixteen. It is canonicalised where it can be and used
 * to ORDER results where it cannot. Re-asking for it would be teaching a client our words.
 *
 * ⚠️ AND A PARTIAL ANSWER IS AN ANSWER. `translateProviderList` keeps what it could place, so
 * "11–50 and a few bigger ones" is searchable and is left alone. Only a value that maps to
 * NOTHING sends the question back.
 */
export function unmappableTargetingFacts(
  facts: BriefDraftFacts | null | undefined,
): BriefFactId[] {
  const f = (facts ?? {}) as Record<string, unknown>
  const list = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : []
  const placeable = (said: string[], vocabulary: readonly string[]): boolean =>
    translateProviderList(said, vocabulary, 6).canonical.length > 0

  const out: BriefFactId[] = []

  const sizes = list(f.company_sizes)
  if (sizes.length > 0 && !placeable(sizes, PROVIDER_VOCABULARIES.company_sizes)) {
    out.push('company_size')
  }

  // ⚠️ ONLY WHEN SENIORITY IS CARRYING THE FACT. `target_roles` is satisfied by titles OR
  // seniority, and Apollo takes free-text titles — "Managing Director" is already the thing
  // we send, so there is nothing to fail to map and nothing to re-ask. A client who gave a
  // title has answered, whatever words their seniority arrived in.
  const titles = list(f.job_titles)
  const seniority = list(f.seniority_levels)
  if (titles.length === 0 && seniority.length > 0
      && !placeable(seniority, PROVIDER_VOCABULARIES.seniority_levels)) {
    out.push('target_roles')
  }

  return out
}

export function onboardingState(facts: BriefDraftFacts | null | undefined): OnboardingState {
  const targeting = briefDraftFacts(facts ?? null, unmappableTargetingFacts(facts))
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
