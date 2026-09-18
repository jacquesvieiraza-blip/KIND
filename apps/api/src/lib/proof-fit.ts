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
import { bandIndex, headcountBandIndex } from './lead-feedback'

/**
 * A CANDIDATE's size band, from either spelling of the same fact: a ladder label (portal,
 * `lead_pool` rows written from one) or a raw headcount (`String(num_employees)`, which is
 * what `runIcpJob` writes into `leads` and `lead_pool` for every provider-sourced record).
 * ⚑ 18 Sep (J5-C5) — see `headcountBandIndex`'s note for the measured defect this closes.
 */
function candidateBandIndex(value: string | null): number {
  const label = bandIndex(value)
  return label >= 0 ? label : headcountBandIndex(value)
}

/** One criterion's answer. `unknown` means the DATA is absent — never "we could not decide". */
export type HardVerdict = 'yes' | 'no' | 'unknown'

/**
 * The hard criteria. Nothing else is structural.
 *
 * ⛓️ SIX SINCE MVP1, WAS FOUR (founder-locked 11 Sep). `category` and `company_type` are two
 * INDEPENDENT required dimensions once a Brief is confirmed — they are not one fact wearing
 * two names. A client who said "digital marketing" has stated the category and NOT the
 * organisational form, and a prospect can satisfy one while contradicting the other.
 *
 * ⚠️ `industry` IS NOT RETIRED AND IS NOT THE SAME THING. It reads `icps.industries`, the
 * closed sixteen-value PROVIDER list, and it keeps working for every legacy ICP that has
 * nothing else. `category` reads `icps.target_category` — the client's own words — and that
 * column is the only authority on client intent. A provider tag may be EVIDENCE toward a
 * requirement; it may never BE the requirement.
 */
export type HardFit = {
  geography: HardVerdict
  size: HardVerdict
  industry: HardVerdict
  category: HardVerdict
  company_type: HardVerdict
  seniority: HardVerdict
  /**
   * ── 🛑 ⚑ 18 Sep (J5-C12 · FD-1) — WHO THEY TOLD US TO LEAVE OUT ────────────────────
   *
   * 🛑 SEVEN NOW, AND THE SEVENTH IS THE ONLY ONE THAT SUBTRACTS. The six above ask "does
   * this candidate MEET the requirement". This one asks "did the client already tell us NOT
   * to contact companies like this" — and until now nothing anywhere asked it. `icps.exclusions`
   * has been written since promotion existed, `figsy_knowledge.bad_fit` carries the same
   * sentence to the copywriter, and NO GATE READ EITHER: a client who said "not recruitment
   * agencies, not our competitors" three times could still have one sourced, surfaced,
   * approved and emailed.
   *
   * ⚠️ IT IS A SUPPRESSION, NOT A PREFERENCE. FD-1 is explicit that a match is SET ASIDE with
   * a reason, in every path — not ranked lower, not shown with a warning. An excluded company
   * on a review desk is a client watching us ignore something they said out loud.
   */
  excluded: HardVerdict
}

export const HARD_CRITERIA = [
  'geography', 'size', 'industry', 'category', 'company_type', 'seniority', 'excluded',
] as const
export type HardCriterion = typeof HARD_CRITERIA[number]

/** The candidate fields this judgement reads. Every one is an existing `leads` column. */
export interface FitCandidate {
  country?: string | null
  company_size?: string | null
  industry?: string | null
  job_title?: string | null
  seniority?: string | null
  /**
   * ⚑ MVP1 — EVIDENCE FOR CATEGORY AND COMPANY TYPE. `leads.company` is the company NAME,
   * which is where an organisational form most often actually appears ("Fathom Digital
   * Agency", "Northgate Consultancy"). Thin evidence is the normal case, and thin evidence
   * correctly produces `unknown` rather than a guess.
   */
  company?: string | null
  /** Any longer description a provider returned. Optional; usually absent. */
  company_description?: string | null
  /**
   * ── 🛑 ⚑ 18 Sep (J5-C13 · FD-2) — THE MODEL'S RECORDED VERDICT ON THE CATEGORY ───────
   *
   * `leads.category_fit`, written by `scoreLeadsForIcp` when the client stated a category.
   * FD-2 makes this judgement MODEL-INTERPRETED, and a model cannot be called from a pure
   * synchronous predicate — so the model writes a FACT and this file reads it, which is the
   * same shape every other criterion here uses.
   *
   * ⚠️ ABSENT IS NOT A PASS AND NOT A FAIL. A lead scored before this existed, or one whose
   * scoring failed, carries nothing — and the word-overlap rule below still answers, exactly
   * as it did yesterday. The model REFINES the structural answer; it never replaces the
   * product's ability to judge without one.
   */
  category_fit?: 'yes' | 'no' | 'unknown' | null
}

/** The ICP fields this judgement reads. Every one is an existing `icps` column. */
export interface FitIcp {
  geographies?: string[] | null
  company_sizes?: string[] | null
  /** The CLOSED sixteen-value provider list. Evidence and query hint — never client intent. */
  industries?: string[] | null
  /**
   * ⚑ MVP1 — THE CLIENT'S OWN WORDS for the kind of company to target. Authoritative.
   * NULL means "not collected" for a legacy row and is never fabricated.
   */
  target_category?: string | null
  /** ⚑ MVP1 — the organisational form of the target company, from client evidence only. */
  target_company_type?: string | null
  job_titles?: string[] | null
  seniority_levels?: string[] | null
  /**
   * ⚑ 18 Sep (J5-C12 · FD-1) — THE CANONICAL EXCLUSIONS, in the client's own words.
   *
   * ⚠️ ONE SENTENCE, NOT A LIST, because that is how a person answers the question: *"no
   * recruitment agencies, nothing in gambling, and not our competitors."* It is split into
   * phrases here rather than asking the client to structure it.
   *
   * ⚠️ NULL IS "NOT STATED" AND IS NEVER FABRICATED. A legacy ICP carries NULL and every
   * candidate passes this criterion, exactly as they did before it existed.
   */
  exclusions?: string | null
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
  // ⛓️ 18 Sep (J5-C5) — A LABEL *OR* A RAW HEADCOUNT. `lead_pool` and the portal store a
  // ladder label; `runIcpJob` writes `String(num_employees)` into both `leads` and
  // `lead_pool`, so every provider-sourced candidate reached here as an unreadable value and
  // this criterion answered `unknown` for a 4,000-person company against an 11–50 target. One
  // ladder, two spellings of the same fact. The ICP side stays label-only: `company_sizes` is
  // written by the portal and a headcount there would be a different defect.
  const have = candidateBandIndex(c.company_size ?? null)
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

// ── ⚑ MVP1 — CATEGORY AND COMPANY TYPE (founder-locked 11 Sep) ─────────────────────────
//
// 🛑 THREE ANSWERS, AND THE MIDDLE ONE IS THE POINT.
//   PASS    — the evidence SUPPORTS the requirement
//   FAIL    — the evidence CONTRADICTS it
//   UNKNOWN — the evidence is missing, ambiguous, or insufficient to establish compatibility
//
// The old `industryVerdict` has only two outcomes: every significant word present, or `no`.
// That is right for a closed provider tag and WRONG for a client's sentence — it would call
// "Marketing & Advertising" a REFUSAL of "Digital marketing agencies", when the honest answer
// is that it neither establishes nor contradicts it. A refusal we cannot justify throws away
// real prospects; a pass we cannot justify is the live-canary card. So: neither.
//
// ⚠️ ORGANISATIONAL WORDS BELONG TO `company_type`, NOT TO `category`. "Digital marketing
// agencies" carries a category ("digital marketing") and a form ("agency") in one phrase, and
// the founder locked those as two facts. Requiring the word "agencies" to appear in the row's
// INDUSTRY tag to satisfy the CATEGORY would fail every correct company whose provider tag is
// simply "Marketing & Advertising" — and would do it twice, once per dimension.

/**
 * Words that name an organisational FORM rather than a market. Used two ways: stripped out of
 * a category requirement, and searched for as company-type evidence.
 *
 * ⚠️ THIS IS OUR COMPARISON VOCABULARY, NOT A REDEFINITION OF CLIENT INTENT. It never
 * overwrites `target_category` or `target_company_type`; it only helps decide whether a row's
 * evidence satisfies what the client stored. Each entry maps a canonical form to the words
 * that evidence it.
 */
const ORG_FORMS: Record<string, string[]> = {
  agency:          ['agency', 'agencies'],
  consultancy:     ['consultancy', 'consultancies', 'consulting', 'consultants', 'consultant'],
  clinic:          ['clinic', 'clinics', 'practice', 'practices'],
  recruiter:       ['recruitment', 'recruiter', 'recruiters', 'staffing', 'headhunter'],
  saas:            ['saas', 'software', 'platform'],
  law_firm:        ['law', 'solicitors', 'attorneys', 'legal'],
  accountancy:     ['accountancy', 'accountants', 'accounting'],
  manufacturer:    ['manufacturer', 'manufacturing', 'factory'],
  studio:          ['studio', 'studios'],
  contractor:      ['contractor', 'contractors', 'builders', 'construction'],
}

/** Which canonical form does this word evidence, if any? */
function formOf(word: string): string | null {
  for (const [form, words] of Object.entries(ORG_FORMS)) if (words.includes(word)) return form
  return null
}

/** Every organisational form the candidate's evidence actually names. */
function formsEvidenced(words: Set<string>): Set<string> {
  const out = new Set<string>()
  for (const w of words) { const f = formOf(w); if (f) out.add(f) }
  return out
}

/**
 * Everything we know about the company, as words. Deliberately several fields: the
 * organisational form appears in the NAME far more often than in a provider tag.
 */
function evidenceWords(c: FitCandidate): Set<string> {
  return new Set([
    ...tokens(clean(c.industry)),
    ...tokens(clean(c.company)),
    ...tokens(clean(c.company_description)),
  ])
}

/**
 * TARGET COMPANY CATEGORY — the client's own words, matched semantically.
 *
 * ⚠️ TOLERANT, NEVER EXACT. "Digital marketing agencies" is satisfied by evidence carrying
 * "digital" and "marketing" in any field, any order, any capitalisation, with or without the
 * organisational word.
 *
 * ⚠️ AND THE THREE OUTCOMES ARE DECIDED BY OVERLAP, NOT BY A THRESHOLD NOBODY CAN EXPLAIN:
 *   · every core word present  → the evidence supports it            → yes
 *   · some core words present  → adjacent; establishes nothing       → unknown
 *   · no core word present, with evidence → a different kind of company → no
 *   · no evidence at all       → nothing to judge                    → unknown
 */
/**
 * ── 🛑 EXCLUSIONS (J5-C12 · FD-1) — THE CLIENT ALREADY TOLD US NO ──────────────────────
 *
 * 🛑 THE DIRECTION IS INVERTED AND THAT IS THE WHOLE CARE THIS FUNCTION NEEDS. Everywhere
 * else in this file, evidence supporting the requirement is `yes`. Here, evidence supporting
 * the EXCLUSION is `no` — the candidate is refused — so a copy-paste of `categoryVerdict`
 * would have admitted exactly the companies it was meant to remove.
 *
 * ── HOW A SENTENCE BECOMES A TEST ──────────────────────────────────────────────────────
 *
 * The client writes one sentence. It is split on the separators people actually use — commas,
 * "and", "or", semicolons, "no"/"not"/"nothing" — into PHRASES, and each phrase is matched the
 * same tolerant way `categoryVerdict` matches a requirement: every significant word of the
 * phrase present somewhere in the candidate's evidence.
 *
 * ⚠️ EVERY WORD, NOT ANY WORD. "no recruitment agencies" must not exclude every company whose
 * name contains "agencies" — that would delete the entire target market of a client who asked
 * for agencies and excluded recruitment ones, which is the ordinary case.
 *
 * ⚠️ AND STOP WORDS ARE DROPPED, so "not our competitors" does not reduce to the word "our"
 * and match everything. A phrase with no significant words left is not a test and is skipped:
 * "not our competitors" names no company we can recognise, and pretending otherwise would be
 * the unfalsifiable judgement this file refuses everywhere else.
 *
 * ⚠️ THE SEMANTIC UPGRADE IS J5-C13'S (FD-2), DELIBERATELY. This is the STRUCTURAL half: the
 * criterion, the canonical field, the reason and the suppression in every path. Model-
 * interpreted matching — "TalentBridge Staffing" against "no recruitment agencies" — arrives
 * with the same mechanism that makes category fit model-interpreted, and lands on this
 * criterion rather than beside it.
 */
const EXCLUSION_SPLIT = /[,;/]|\band\b|\bor\b|\bnor\b|\bno\b|\bnot\b|\bnothing\b|\bexcept\b|\bavoid\b|\bexclude\b/i

/** Words that carry no company meaning and must never be a match on their own. */
const EXCLUSION_STOP = new Set([
  'our', 'ours', 'we', 'us', 'their', 'they', 'any', 'all', 'the', 'a', 'an',
  'of', 'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'like', 'similar',
  'companies', 'company', 'business', 'businesses', 'firms', 'firm', 'org', 'orgs',
  'organisation', 'organisations', 'organization', 'organizations', 'please', 'want',
  // ⚠️ RELATIONSHIP WORDS, NOT COMPANY WORDS. "not our competitors" and "nobody we already
  // work with" describe a relationship to the CLIENT, which no provider field records — so
  // they can never be recognised from a candidate's evidence. Leaving them in would make
  // `['competitors']` a live filter that matches nothing and looks like a working suppression,
  // which is worse than no filter: the client believes their instruction is being honoured.
  //
  // 🛑 THIS IS A REPORTED LIMIT, NOT A SILENT ONE. Suppressing "our competitors" needs a list
  // of who they are, which nothing in the product collects today — see the evidence package.
  'competitor', 'competitors', 'competition', 'rivals', 'clients', 'customers', 'partners',
])

/** The phrases a client's exclusion sentence actually tests for. Exported for the guard. */
export function exclusionPhrases(sentence: string | null | undefined): string[][] {
  const raw = clean(sentence)
  if (!raw) return []
  return raw
    .split(EXCLUSION_SPLIT)
    .map(part => tokens(part).filter(w => !EXCLUSION_STOP.has(w)))
    .filter(words => words.length > 0)
}

function excludedVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const phrases = exclusionPhrases(icp.exclusions)
  // Nothing was excluded, or nothing they said names a company we could recognise. Either way
  // there is no test here, and an untested criterion passes — it never invents a refusal.
  if (phrases.length === 0) return 'yes'

  const words = evidenceWords(c)
  // ⚠️ NO EVIDENCE IS `unknown`, NOT `yes`. We cannot say this company is not one they
  // excluded, and `setAsideReason` already treats an unknown as set-aside-with-a-reason
  // (11 Sep) — so a candidate we cannot read does not quietly clear a suppression. It does not
  // make them WORSE off either: a candidate with no evidence is already unknown on category
  // and industry for the same reason.
  if (words.size === 0) return 'unknown'

  // 🛑 EVERY SIGNIFICANT WORD OF A PHRASE, so "recruitment agencies" needs both words. A match
  // on "agencies" alone would delete the whole market of a client who asked for agencies and
  // excluded the recruitment ones.
  const hit = phrases.some(phrase => phrase.every(w => words.has(w)))
  return hit ? 'no' : 'yes'
}

function categoryVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const requirement = clean(icp.target_category)

  // ── 🛑 ⚑ 18 Sep (J5-C13 · FD-2) — THE MODEL'S VERDICT OUTRANKS THE WORD OVERLAP ───────
  //
  // FD-2: *"Model-interpreted fit; adjacent qualifies; vague B2B does not; UNKNOWN never
  // eligible."* The rule below this block is word overlap, and it is wrong in both directions
  // for a client's own sentence: it refuses a BRAND agency for "digital marketing agencies"
  // (adjacent, and the client's actual market), and it passes anything whose tag happens to
  // carry both words. Neither is something a word set can fix — which is why the founder ruled
  // it a model's judgement.
  //
  // ⚠️ IT IS READ, NOT CALLED. A model cannot be invoked from a pure synchronous predicate,
  // and making this async would make every caller async. `scoreLeadsForIcp` records the verdict
  // on the row; this reads a fact, exactly like every other criterion in this file.
  //
  // ⚠️ AND ONLY WHEN THERE IS A REQUIREMENT TO JUDGE. A client who stated no category has no
  // test here, and a recorded verdict against a requirement they never gave would be a
  // judgement about nothing.
  if (requirement) {
    const judged = c.category_fit
    if (judged === 'yes' || judged === 'no') return judged
    // `unknown` falls through DELIBERATELY: the word overlap may still be able to say
    // something useful, and "the model was unsure" is not itself evidence of anything. If
    // the overlap is also unsure it returns `unknown`, which is the honest joint answer —
    // and `structurallyEligible` already refuses to count an unknown as a match (FD-2's
    // "UNKNOWN never eligible", which needs no new rule here).
  }
  // An unstated requirement is not a test. A legacy ICP carries NULL here — "not collected" —
  // and making that `unknown` would empty every legacy client's Proof set.
  if (!requirement) return 'yes'

  // Core = the market words. The organisational word is `company_type`'s business.
  const core = tokens(requirement).filter(w => formOf(w) === null)
  if (core.length === 0) return 'unknown'   // the client said only a form, e.g. "agencies"

  const words = evidenceWords(c)
  if (words.size === 0) return 'unknown'

  const hits = core.filter(w => words.has(w)).length
  if (hits === core.length) return 'yes'
  if (hits > 0) return 'unknown'
  return 'no'
}

/**
 * TARGET COMPANY TYPE — the organisational form, and only from evidence that names one.
 *
 * 🛑 NEVER INFERRED FROM A BROAD PROVIDER CATEGORY. "Marketing & Advertising" says nothing
 * about whether this is an agency, an in-house team or a software vendor, and answering `yes`
 * there is precisely the false confidence the founder refused.
 *
 * ⚠️ A FAIL REQUIRES A CONTRADICTION, not an absence. Evidence naming a DIFFERENT form —
 * "consultancy" where an agency was asked for — contradicts. Evidence naming no form at all
 * is `unknown`, however rich it is in other respects.
 */
function companyTypeVerdict(icp: FitIcp, c: FitCandidate): HardVerdict {
  const requirement = clean(icp.target_company_type)
  if (!requirement) return 'yes'

  // The client's word, resolved to a canonical form. An unrecognised form is still usable:
  // it compares as itself, so "brokerage" matches evidence saying "brokerage".
  const wantWords = tokens(requirement)
  const wantForms = new Set(wantWords.map(w => formOf(w) ?? w))
  if (wantForms.size === 0) return 'unknown'

  const words = evidenceWords(c)
  if (words.size === 0) return 'unknown'

  const haveForms = new Set([...formsEvidenced(words), ...[...words].filter(w => wantForms.has(w))])
  if (haveForms.size === 0) return 'unknown'   // evidence, but none of it names a form
  for (const f of haveForms) if (wantForms.has(f)) return 'yes'
  return 'no'                                   // it named a form, and it was a different one
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
    category: categoryVerdict(icp, candidate),
    excluded: excludedVerdict(icp, candidate),
    company_type: companyTypeVerdict(icp, candidate),
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

/**
 * THE OVERALL STRUCTURAL ANSWER — three states, founder-locked 11 Sep.
 *
 *   any required FAIL              → not_fit
 *   no FAIL, one or more UNKNOWN   → unknown
 *   all required dimensions PASS   → pass
 */
export type StructuralVerdict = 'pass' | 'unknown' | 'not_fit'

export function structuralVerdict(f: HardFit): StructuralVerdict {
  if (firstHardFailure(f) !== null) return 'not_fit'
  return unknownCriteria(f).length > 0 ? 'unknown' : 'pass'
}

/**
 * 🛑 IS THIS AN ELIGIBLE PROOF MATCH?
 *
 * ⛓️ TIGHTENED 11 Sep, AND THE CHANGE IS THE WHOLE POINT. This used to mean "nothing said
 * no", so an UNKNOWN candidate counted as eligible and was merely never starred. The founder
 * locked the opposite: **UNKNOWN MUST NEVER BE PROMOTED TO PASS MERELY TO FILL A PROOF SET.**
 * A prospect we cannot confirm is not a match we found; it is a match we hope for, and the
 * pressure to show twenty cards is exactly the pressure that turns one into the other.
 *
 * ⚠️ NOT COUNTED IS NOT NOT SHOWN. An unknown candidate is still surfaced, as a set-aside
 * prospect with its reason printed — Preview 02 and Preview 08 both show that state
 * explicitly ("4 eligible matches + 1 prospect set aside"). What it may never do is be
 * counted as one of the eligible matches the client was promised.
 */
export function structurallyEligible(f: HardFit): boolean {
  return structuralVerdict(f) === 'pass'
}

/**
 * MAY THIS CANDIDATE BE SURFACED AT ALL? — a different question, and it needs its own name.
 *
 * 🛑 THE LESSON THIS FILE KEEPS TEACHING. Three separate concerns were reading one function:
 * "may it be counted as a match", "which band does it display in", and "is this owned row
 * worth reusing". Tightening the first silently changed the other two — it collapsed
 * "Worth a look" into "Not a fit", and it stopped the pool reusing rows with a blank
 * industry. Both were regressions dressed as a rule change.
 *
 * ⚠️ ADMISSIBLE MEANS NOTHING REFUSES IT. An unknown is admissible: it is shown, banded
 * "Worth a look", capped at 74, never starred and never counted. Only a genuine `no` is
 * inadmissible.
 *
 * ⚠️ AND FOR THE OWNED POOL THIS IS THE RIGHT QUESTION, not eligibility. Refusing to reuse a
 * free row we already hold — because its industry column is blank — would spend provider
 * money to replace a candidate that would have been surfaced anyway, as a set-aside, for
 * nothing. The measured production failure behind that gate (85 rows with a NULL country,
 * a geo-targeted pass serving zero) is about REFUSAL, and it stays exactly as it was.
 */
export function structurallyAdmissible(f: HardFit): boolean {
  return structuralVerdict(f) !== 'not_fit'
}

/** Founder-plain, client-safe. Named criterion, no provider or column vocabulary. */
const FAILURE_COPY: Record<HardCriterion, string> = {
  geography: 'outside the countries you asked for',
  size: 'outside the company size you asked for',
  industry: 'not the kind of company you asked for',
  category: 'not the kind of company you asked for',
  company_type: 'not the type of organisation you asked for',
  seniority: 'not the seniority you asked for',
  // ⚑ 18 Sep (J5-C12 · FD-1) — the only sentence here that quotes the CLIENT back to
  // themselves, because the reason is something they said rather than something we judged.
  excluded: 'you asked us to leave companies like this out',
}

/**
 * Why a candidate could not be CONFIRMED — distinct from why one was refused.
 *
 * ⚠️ "WE COULD NOT CONFIRM" IS NOT "THIS IS WRONG", and saying the second when you mean the
 * first is a claim about a real company that we cannot support. Preview 02 shows both
 * sentences on the same screen for exactly that reason.
 */
const UNKNOWN_COPY: Record<HardCriterion, string> = {
  geography: 'their country could not be confirmed',
  size: 'their headcount could not be confirmed',
  industry: 'their industry could not be confirmed',
  category: 'the kind of company could not be confirmed',
  company_type: 'the type of organisation could not be confirmed',
  seniority: 'their seniority could not be confirmed',
  excluded: 'we could not confirm this is not one of the companies you asked us to leave out',
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
  if (failed) return `${failed}: ${FAILURE_COPY[failed]}`
  // ⛓️ 11 Sep — AN UNKNOWN IS NOW SET ASIDE TOO, so it needs its own sentence. Reusing the
  // refusal copy would tell a client we had judged a company we had merely failed to read.
  const unknown = unknownCriteria(f)[0]
  return unknown ? `${unknown}: ${UNKNOWN_COPY[unknown]}` : null
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
  // ⛓️ 11 Sep — READS THE VERDICT, NOT `structurallyEligible`, AND THAT DISTINCTION IS THE
  // WHOLE FIX. Those two questions used to share one function, so tightening eligibility to
  // exclude UNKNOWN also collapsed "Worth a look" into "Not a fit" — deleting the middle band
  // the founder locked on 10 Sep and that Preview 02 renders. They are different questions:
  //   · `structuralVerdict` — what do we KNOW about this company?  (three answers)
  //   · `structurallyEligible` — may it be COUNTED as a match?     (pass only)
  // An unknown company is banded "Worth a look", shown, never starred, and never counted.
  if (structuralVerdict(f) === 'not_fit') return 'not_a_fit'
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
  // ⛓️ 11 Sep — same correction as `fitBand`. A refusal is capped at 30; an UNKNOWN is
  // capped at 74 and keeps its band, because "we could not confirm this" is not "this is
  // wrong" and the client's screen must not say the second when we mean the first.
  if (structuralVerdict(f) === 'not_fit') return Math.min(s, NOT_A_FIT_SCORE_CAP)
  if (unknownCriteria(f).length > 0) return Math.min(s, UNKNOWN_SCORE_CAP)
  return s
}

/** Is this card starred? One place answers it, so no surface can invent its own rule. */
export function isStarred(band: FitBand): boolean {
  return band === 'start_here'
}
