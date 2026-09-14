// ═══════════════════════════════════════════════════════════════════════════════════════
// WHERE THE ELEVEN FACTS ACTUALLY LIVE IN A COMPLETION — the reconciliation, as one
// decision. (S1-RT-002.)
//
// ── THE DEFECT THIS CLOSES, AND IT STRANDED A REAL CLIENT ──────────────────────────────
//
// The completion gate in `routes/icps.ts` read fact #10 from `business.bad_fit` and fact #11
// from `campaign_intent`. Neither field is named in the system prompt, and neither carries a
// `description` in the tool schema. What the prompt DOES say, on every single turn, is:
//
//     ⚠️ FILL "brief_so_far" ON EVERY SINGLE TURN, including questions.
//
// So the model did exactly as instructed — exclusions into `brief_so_far.exclusions`, the
// desired outcome into `brief_so_far.desired_outcome` — then answered "complete". The gate
// looked in two fields nobody had been told about, counted 9 of 11, and raised
// INVALID_SHAPE. The client saw "Milla didn't catch that", and because a retry re-sends the
// identical transcript to the same model under the same prompt, the refusal repeated for
// ever. The Brief could not be completed at all.
//
// 🛑 THE FIX IS STRUCTURAL, NOT PERSUASIVE. "Tell the model harder" is the failure mode this
// repo already names — an instruction is not a gate. The server reconciles the two homes
// itself, so the contract can never again disagree with the validator about where a fact is.
//
// ── THE RULE, IN ONE LINE ──────────────────────────────────────────────────────────────
//
//     CANONICAL FIELD IF SUPPLIED  ·  OTHERWISE THE VALIDATED `brief_so_far` VALUE.
//
// ⚠️ CANONICAL WINS, DELIBERATELY. `brief_so_far` is a running snapshot; the canonical
// fields are what the completion itself asserts. Where the model filled both, the completion
// is the more considered answer and must not be overwritten by the snapshot.
//
// ⚠️ AND THIS WIDENS WHERE A FACT MAY BE FOUND — NEVER WHETHER IT IS REQUIRED. Every one of
// the eleven is still required, still counted by the one canonical `briefFacts`, and a
// completion short of eleven is still refused. Nothing here invents, guesses, defaults or
// fabricates a value: a fact absent from BOTH homes stays absent.
//
// ── WHY THIS ALSO SERVES THE FOUNDER'S FAIL-SOFT RULE ──────────────────────────────────
//
// 🛑 "THE CUSTOMER MUST NEVER NEED TO SPEAK APOLLO." Fact #8 (company size) reaches the gate
// through `icp.company_sizes`, which is a CLOSED PROVIDER LIST (`boundedEnum(ICP_SIZES)`).
// A client who says "small to mid-sized agencies" produces values that canonicalise to
// nothing — and an all-off-list closed list is refused outright, by design, because an empty
// one would silently widen the search downstream. That refusal used to cost the client the
// whole completion: our provider vocabulary, rejecting their valid answer.
//
// `brief_so_far.company_sizes` is `boundedList(6, 40)` — FREE TEXT, no enum, no provider
// vocabulary. Reading fact #8 from there when the provider list is empty means the client's
// own words satisfy the fact, exactly as the founder ruled: translating their truth into
// provider format is our job, and failing at it must not strand them.
//
// ⚠️ IT DOES NOT SILENTLY WIDEN THE SEARCH. This module resolves what the GATE counts and
// what the DOWNSTREAM writes receive. The provider-facing `icp.company_sizes` column is
// untouched by this file and still carries only canonical values — so a size we could not
// normalise is recorded as the client's words and is NOT smuggled into a provider filter.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Exactly the shape of a validated completion this module reads. Nothing else is consulted. */
export interface CompletionFactSources {
  profile?: {
    company_name?: string
    country?: string
    contact_name?: string
    phone?: string
    website?: string
    website_none?: boolean
    industry?: string
  }
  icp?: {
    target_category?: string
    target_company_type?: string
    geographies?: string[]
    company_sizes?: string[]
    job_titles?: string[]
    seniority_levels?: string[]
  }
  business?: {
    product?: string
    bad_fit?: string
  }
  campaign_intent?: string
  brief_so_far?: {
    contact_name?: string
    company_name?: string
    website?: string
    website_none?: boolean
    what_they_do?: string
    target_category?: string
    geographies?: string[]
    target_company_type?: string
    company_sizes?: string[]
    job_titles?: string[]
    seniority_levels?: string[]
    exclusions?: string
    desired_outcome?: string
    country?: string
    phone?: string
  }
}

/**
 * A present, non-blank string — or undefined.
 *
 * ⚠️ BLANK IS NEVER A VALUE. A canonical field the model emitted as `''` must fall through to
 * the snapshot rather than shadowing it; an empty string is the absence of an answer, not an
 * answer. This is the same rule `text2` applies in `routes/auth.ts` and `briefFactValues`
 * applies in the canonical counter, so all three agree about what "held" means.
 */
function text(v: string | null | undefined): string | undefined {
  const t = (v ?? '').trim()
  return t === '' ? undefined : t
}

/** A non-empty list of non-blank strings — or undefined. Same rule, one dimension up. */
function list(v: string[] | null | undefined): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out = v.map(s => (s ?? '').trim()).filter(s => s !== '')
  return out.length > 0 ? out : undefined
}

/**
 * The eleven facts (plus the two account fields the `clients` row cannot be written without),
 * resolved from wherever the contract allows them to be.
 *
 * ⚠️ `websiteNone` IS RESOLVED SEPARATELY FROM `website`, and only an explicit `true` counts —
 * the same rule `briefFactValues` and `resolveOwnedWebsite` apply. `false`, `null` and
 * `undefined` are not an answer, so a completion that never mentioned a website cannot have
 * one asserted for it from either home.
 */
export interface ResolvedBriefFacts {
  contactName?: string
  companyName?: string
  website?: string
  websiteNone?: boolean
  whatTheCompanyDoes?: string
  targetCategory?: string
  geographies?: string[]
  targetCompanyType?: string
  companySizes?: string[]
  targetRoles?: string[]
  targetSeniority?: string[]
  exclusions?: string
  desiredOutcome?: string
  /** NOT one of the eleven — the client row cannot be written without it. */
  country?: string
  /** NOT one of the eleven — carried so promotion does not lose it either. */
  phone?: string
}

export function resolveBriefFacts(v: CompletionFactSources): ResolvedBriefFacts {
  const b = v.brief_so_far ?? {}
  return {
    contactName:        text(v.profile?.contact_name) ?? text(b.contact_name),
    companyName:        text(v.profile?.company_name) ?? text(b.company_name),
    website:            text(v.profile?.website) ?? text(b.website),
    websiteNone:        v.profile?.website_none === true ? true : b.website_none === true ? true : undefined,
    // ⚠️ THREE HOMES, AND THE ORDER IS THE EXISTING ONE. `profile.industry || business.product`
    // is precisely what the gate read before this module; the snapshot is appended as a third
    // fallback, never inserted ahead of either.
    whatTheCompanyDoes: text(v.profile?.industry) ?? text(v.business?.product) ?? text(b.what_they_do),
    targetCategory:     text(v.icp?.target_category) ?? text(b.target_category),
    geographies:        list(v.icp?.geographies) ?? list(b.geographies),
    targetCompanyType:  text(v.icp?.target_company_type) ?? text(b.target_company_type),
    // 🛑 THE PROVIDER-VOCABULARY SEAM. `icp.company_sizes` is canonicalised against a closed
    // list and can legitimately be empty when the client's own words did not map; the
    // snapshot is free text and holds what they actually said.
    companySizes:       list(v.icp?.company_sizes) ?? list(b.company_sizes),
    targetRoles:        list(v.icp?.job_titles) ?? list(b.job_titles),
    targetSeniority:    list(v.icp?.seniority_levels) ?? list(b.seniority_levels),
    // The two that stranded the client.
    exclusions:         text(v.business?.bad_fit) ?? text(b.exclusions),
    desiredOutcome:     text(v.campaign_intent) ?? text(b.desired_outcome),
    country:            text(v.profile?.country) ?? text(b.country),
    phone:              text(v.profile?.phone) ?? text(b.phone),
  }
}
