// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 STRUCTURAL FIT IS DECIDED HERE, DETERMINISTICALLY, AND NEVER BY A MODEL.
//
// ── WHAT THE FOUNDER SAW ON 10 Sep (the live canary) ────────────────────────────────────
//
// Targeting: UK digital marketing agencies · 10–50 staff · Founder or CEO. Proof showed him
// management consultancies and procurement firms, scored **70–75**, starred **"We'd start
// here"**, above a reason that read *"no evidence of digital marketing or agency focus."*
//
// Two independent defects produced that one card, and each is fixed in a different place:
//
//   ① NOTHING FILTERED. `start-work.ts` says it out loud — *"Every sourced person goes to the
//      client, scored, with our top 20 marked. We don't filter first."* That was a deliberate
//      speed choice when the desk was a paid client's lead list. On a PROSPECT'S FIRST
//      IMPRESSION it means the client does our data cleaning, which is the opposite of the
//      product. **This file is the filter.**
//   ② THE STAR WAS RANK, NOT FIT. `/leads/for-approval` marked the top 20 BY SCORE; a proof
//      pass surfaces exactly 20, so **every card was starred**, worst included.
//
// ── WHY HARD FIT IS CODE AND CALIBRATION IS THE MODEL (founder-locked 10 Sep) ────────────
//
// Geography, company size, industry and seniority are all COLUMNS on the row and all four are
// in the ICP. A pure function answers them the same way every time, for free, and can be
// proved. Asking a model to re-derive a fact we already hold is how ① and ② met in one card:
// the model wrote a 72 next to its own disqualifying sentence, and nothing could contradict it
// because the number and the sentence came from the same guess.
//
// So the split is absolute:
//   • THIS FILE decides *does this person structurally match what they asked for* — yes/no/
//     unknown, per criterion, from canonical data.
//   • THE MODEL decides *how promising is this one* — but only ever among candidates that
//     already passed here, and its number can no longer overturn a structural refusal.
//
// **The contradiction class stops existing rather than being policed.** There is no re-ask,
// no arbitration, no "trust the model unless…". A hard `no` is a refusal before scoring.
//
// ── UNKNOWN IS NOT A FAILURE, AND IT IS NOT A PASS EITHER ────────────────────────────────
//
// Providers leave fields blank. A company with no `industry` recorded is not disqualified —
// it may genuinely be the right company — but it must never be presented as one of the
// people *"we'd start here"*, because we do not know that. Unknown is admissible and capped:
// **Worth a look, never starred.** Treating unknown as `no` would throw away real prospects;
// treating it as `yes` is exactly the false confidence the founder caught.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { canonicalLaunchCountry } from '@kind/shared'
import { bandIndex } from './lead-feedback'

/** One criterion's answer. `unknown` means the DATA is absent — never "we could not decide". */
export type HardVerdict = 'yes' | 'no' | 'unknown'

/** The four hard criteria, founder-locked 10 Sep. Nothing else is structural. */
export type HardFit = {
  geography: HardVerdict
  size: HardVerdict
  industry: HardVerdict
  seniority: HardVerdict
}

export const HARD_CRITERIA = ['geography', 'size', 'industry', 'seniority'] as const
export type HardCriterion = typeof HARD_CRITERIA[number]

/** The candidate fields this judgement reads. Every one is an existing `leads` column. */
export interface FitCandidate {
  country?: string | null
  company_size?: string | null
  industry?: string | null
  job_title?: string | null
  seniority?: string | null
}

/** The ICP fields this judgement reads. Every one is an existing `icps` column. */
export interface FitIcp {
  geographies?: string[] | null
  company_sizes?: string[] | null
  industries?: string[] | null
  job_titles?: string[] | null
  seniority_levels?: string[] | null
}

const clean = (s: unknown): string => String(s ?? '').trim().toLowerCase()
const present = (xs: string[] | null | undefined): string[] =>
  (xs ?? []).map(clean).filter(Boolean)

// ⚠️ AN UNSTATED CRITERION IS NOT A TEST, and every function below follows that shape: if the
// client named nothing, the answer is `yes` — there is nothing unknown about a requirement
// that does not exist. `unknown` is reserved for *they asked, and the row is silent*, which is
// the only case that should cost a candidate its star.

/**
 * 🛑 GEOGRAPHY IS COMPARED CANONICALLY, NEVER AS A SUBSTRING.
 *
 * ⛓️ THIS EXACT BUG IS ALREADY IN THE REPO'S HISTORY. `pool-sourcing.ts` compared countries
 * with `includes`, so `'australia'.includes('us')` matched a US target to Australia, Austria,
 * Belarus, Cyprus and Mauritius, and `'ukraine'.includes('uk')` matched the UK. In the other
 * direction a row stored as `GB` or `England` never matched a client who typed
 * "United Kingdom", so owned inventory was invisible. `canonicalLaunchCountry` is the one
 * vocabulary that already fixed it and is reused here rather than re-solved.
 */
function geographyVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const required = present(icp.geographies)
  if (required.length === 0) return 'yes'
  const value = clean(c.country)
  if (!value) return 'unknown'
  // ⚠️ `canonicalLaunchCountry` returns the LOWERCASED INPUT for anything outside the launch
  // set — never null — so an unrecognised country compares as itself rather than collapsing
  // to a single "unknown" bucket that would make every non-launch country match every other.
  const canon = (s: string) => canonicalLaunchCountry(s)
  const want = new Set(required.map(canon))
  return want.has(canon(value)) ? 'yes' : 'no'
}

/**
 * 🛑 SIZE IS COMPARED AS A BAND, NOT AS A STRING.
 *
 * A client asking for `11–50` and a row recorded as `11-50` or `11 – 50` are the same company
 * size; a string compare says otherwise and silently disqualifies real matches. `SIZE_LADDER`
 * and `bandIndex` are the ladder the feedback system already uses — one vocabulary, not two.
 *
 * ⚠️ AN UNRECOGNISED BAND IS `unknown`, NOT `no`. A provider value outside our ladder is our
 * gap in vocabulary, not evidence the company is the wrong size, and refusing on it would
 * throw away candidates for a defect on our side.
 */
function sizeVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const required = present(icp.company_sizes)
  if (required.length === 0) return 'yes'
  const value = clean(c.company_size)
  if (!value) return 'unknown'
  const have = bandIndex(c.company_size ?? null)
  if (have < 0) return 'unknown'
  const wanted = required.map(r => bandIndex(r)).filter(i => i >= 0)
  if (wanted.length === 0) return 'unknown'
  return wanted.includes(have) ? 'yes' : 'no'
}

/**
 * INDUSTRY / CATEGORY — word-aware, so "marketing" matches "Digital Marketing Agency" and
 * does NOT match "Marketing Technology" via a coincidence of letters.
 *
 * ⚠️ WHY THIS IS NOT A BARE `includes`. The provider query sends industries as KEYWORD TAGS
 * (`apollo.ts` — the strict industry field returned 1 result where tags returned 65k), so a
 * request for "digital marketing" comes back holding anything tagged *either* word. That is
 * the fetch being generous, which is correct — and it is exactly why the answer has to be
 * re-decided HERE, on the row, before a client ever sees it.
 */
function tokens(s: string): string[] {
  return s.split(/[^a-z0-9]+/i).map(clean).filter(t => t.length > 2)
}

function industryVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const required = present(icp.industries)
  if (required.length === 0) return 'yes'
  const value = clean(c.industry)
  if (!value) return 'unknown'
  const rowWords = new Set(tokens(value))
  // Every SIGNIFICANT word of a requested category must be present. "digital marketing"
  // therefore needs both "digital" and "marketing" — a management consultancy tagged
  // "marketing" alone no longer qualifies, which is the founder's C04 card.
  return required.some(r => {
    const want = tokens(r)
    return want.length > 0 && want.every(w => rowWords.has(w))
  }) ? 'yes' : 'no'
}

/**
 * SENIORITY / TITLE FAMILY — satisfied by EITHER the seniority band or the job title, because
 * the ICP carries both and providers populate one or the other inconsistently.
 *
 * ⚠️ ONE SIDE BEING SILENT IS NOT A REFUSAL. A row with no `seniority` but a `job_title` of
 * "Chief Executive Officer" plainly satisfies "CEO"; requiring both fields would refuse the
 * clearest match in the set.
 */
function seniorityVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const wantTitles = present(icp.job_titles)
  const wantLevels = present(icp.seniority_levels)
  if (wantTitles.length === 0 && wantLevels.length === 0) return 'yes'

  const title = clean(c.job_title)
  const level = clean(c.seniority)
  if (!title && !level) return 'unknown'

  const titleWords = new Set(tokens(title))
  const titleHit = wantTitles.some(r => {
    const want = tokens(r)
    return want.length > 0 && want.every(w => titleWords.has(w))
  })
  const levelHit = wantLevels.some(r => level === clean(r) || tokens(level).includes(clean(r)))

  if (titleHit || levelHit) return 'yes'
  // Asked for one, the row answered the other and did not match: that is a genuine `no`.
  return 'no'
}

/** THE ONE DERIVATION of structural fit. Pure, total, and the only thing that decides it. */
export function hardFit(candidate: FitCandidate, icp: FitIcp): HardFit {
  return {
    geography: geographyVerdict(icp, candidate),
    size: sizeVerdict(icp, candidate),
    industry: industryVerdict(icp, candidate),
    seniority: seniorityVerdict(icp, candidate),
  }
}

/** The first criterion the candidate actually FAILS, or null. Order is the founder's list. */
export function firstHardFailure(f: HardFit): HardCriterion | null {
  return HARD_CRITERIA.find(k => f[k] === 'no') ?? null
}

/** Any criterion the row is silent on. Admissible, but never starred. */
export function unknownCriteria(f: HardFit): HardCriterion[] {
  return HARD_CRITERIA.filter(k => f[k] === 'unknown')
}

/** 🛑 A single `no` is a refusal. Nothing else refuses, and nothing overrides this. */
export function structurallyEligible(f: HardFit): boolean {
  return firstHardFailure(f) === null
}

/** Founder-plain, client-safe. Named criterion, no provider or column vocabulary. */
const FAILURE_COPY: Record<HardCriterion, string> = {
  geography: 'outside the countries you asked for',
  size: 'outside the company size you asked for',
  industry: 'not the kind of company you asked for',
  seniority: 'not the seniority you asked for',
}

/**
 * Why a candidate was set aside — the sentence stored in `leads.set_aside_reason`.
 *
 * ⚠️ IT NAMES THE CRITERION, NOT A SCORE. "Set aside: not the kind of company you asked for"
 * is answerable by an operator; "score too low" is not, and would be the same unfalsifiable
 * shape as the card this whole change exists to remove.
 */
export function setAsideReason(f: HardFit): string | null {
  const failed = firstHardFailure(f)
  return failed ? `${failed}: ${FAILURE_COPY[failed]}` : null
}

// ── THE BANDS ──────────────────────────────────────────────────────────────────────────

/** Founder-locked 10 Sep. Three bands, and the star belongs to exactly one of them. */
export type FitBand = 'start_here' | 'worth_a_look' | 'not_a_fit'

export const BAND_LABEL: Record<FitBand, string> = {
  start_here: "We'd start here",
  worth_a_look: 'Worth a look',
  not_a_fit: 'Not a fit',
}

/** The calibration threshold for a star. */
export const START_HERE_MIN_SCORE = 75
/** The ceiling a structurally-unknown candidate may display. */
export const UNKNOWN_SCORE_CAP = 74
/** The ceiling a structurally-refused candidate may display. */
export const NOT_A_FIT_SCORE_CAP = 30

/**
 * 🛑 THE BAND IS DERIVED, NEVER STORED AND NEVER CHOSEN BY THE MODEL.
 *
 * ⚠️ AND IT IS NEVER A RANK. The defect this replaces marked *the top 20 by score* — which,
 * on a pass that surfaces exactly 20, starred all of them. A band asks only about THIS
 * candidate, so it cannot be inflated by the company it happens to keep.
 *
 * @param score the model's calibration judgement, or null when scoring has not run/failed.
 *              **A missing score is never a star.** An unscored lead is a lead we have not
 *              judged, and #358's rule — never fabricate a score — applies to its label too.
 */
export function fitBand(f: HardFit, score: number | null | undefined): FitBand {
  if (!structurallyEligible(f)) return 'not_a_fit'
  if (unknownCriteria(f).length > 0) return 'worth_a_look'
  if (typeof score !== 'number' || !Number.isFinite(score)) return 'worth_a_look'
  return score >= START_HERE_MIN_SCORE ? 'start_here' : 'worth_a_look'
}

/**
 * The score a client may be SHOWN, capped to agree with the band.
 *
 * ⛓️ THIS IS THE C05 CARD, EXACTLY. A 72 beside "no evidence of digital marketing" was
 * possible because the number and the label were independent. A structural refusal now cannot
 * display above 30 and an unknown cannot display above 74, so **the number can never claim
 * more than the structure supports** — whatever the model returned.
 */
export function displayScore(f: HardFit, score: number | null | undefined): number | null {
  if (typeof score !== 'number' || !Number.isFinite(score)) return null
  const s = Math.max(0, Math.min(100, Math.round(score)))
  if (!structurallyEligible(f)) return Math.min(s, NOT_A_FIT_SCORE_CAP)
  if (unknownCriteria(f).length > 0) return Math.min(s, UNKNOWN_SCORE_CAP)
  return s
}

/** Is this card starred? One place answers it, so no surface can invent its own rule. */
export function isStarred(band: FitBand): boolean {
  return band === 'start_here'
}
