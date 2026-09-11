// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CANONICAL BRIEF — ELEVEN DATA FACTS. One list, one counter, every reader.
//
// 🛑 WHY THIS EXISTS (C21). The builder's completion gate demanded TWO facts — company name
// and the client's own country — and the prompt told Milla the mobile and the website were
// "fine to go without". "Complete" therefore meant "I have enough to open an account", not
// "I understand who to write to". Everything downstream inherited the gap: Proof sourced
// against whatever the model had filled in, and the missing facts surfaced later as bad
// prospects rather than immediately as one more question.
//
// ⚠️ ONE FUNCTION, TWO READERS — the single-canonical-truth rule applied to the Brief.
//   · the builder gate asks "may Milla answer complete?" about values just proposed
//   · Vida's brief-progress card asks "how far has Milla got?" about values persisted
// A second hand-written copy of this list is precisely how Vida came to display "seven of
// the eight brief facts" while Milla was collecting eleven.
//
// ⚠️ ELEVEN FACTS, NOT ELEVEN QUESTIONS (founder-locked). One client utterance may satisfy
// two facts at once — "Digital marketing agencies" carries the target category AND, through
// the word "agencies", the target company type. This module counts FACTS HELD and has no
// opinion whatever about how many questions were asked to get them. Milla must not
// interrogate a client who has already answered.
//
// ⚠️ CATEGORY AND COMPANY TYPE ARE TWO DISTINCT FACTS (founder-locked):
//   · target category — what kind of market/business to target, IN THE CLIENT'S OWN WORDS.
//     "Digital marketing agencies", "Healthcare businesses", "Construction companies".
//     Authoritative. Provider taxonomy never replaces it; normalisation happens only at the
//     provider edge.
//   · company type — the organisational form of the TARGET company: agency, consultancy,
//     clinic, recruitment firm, SaaS company. NOT a legal entity form (Ltd/PLC/LLC), NOT the
//     client's own industry, NOT a provider label, and NEVER a model guess with no client
//     evidence behind it.
// A client who said "Digital marketing" and never established an organisational form holds
// the category and not the company type. That is a legitimate 10-of-11 state, and it is
// exactly the one Preview 07 shows.
//
// ⚠️ CLIENT CONFIRMATION IS NOT ONE OF THE ELEVEN. It is the separate gate that follows all
// eleven, and it is what starts Proof. Counting it as the eleventh is the defect Preview 07
// was corrected for, and `brief-facts.test.ts` asserts it never creeps back in.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The eleven, in the approved display order. Index + 1 is the row Vida prints. */
export const BRIEF_FACTS = [
  'contact_name',
  'company',
  'website',
  'what_they_do',
  'target_category',
  'geography',
  'company_type',
  'company_size',
  'target_roles',
  'exclusions',
  'desired_outcome',
] as const
export type BriefFactId = (typeof BRIEF_FACTS)[number]

/** The founder's words for each fact, as the approved previews print them. */
export const BRIEF_FACT_LABEL: Record<BriefFactId, string> = {
  contact_name:    'Contact name',
  company:         'Company',
  website:         'Website, or an explicit none',
  what_they_do:    'What the company does',
  target_category: 'Target company category',
  geography:       'Geography',
  company_type:    'Company type',
  company_size:    'Company size',
  target_roles:    'Target roles',
  exclusions:      'Exclusions',
  desired_outcome: 'Desired outcome',
}

/**
 * The facts as either caller holds them.
 *
 * ⚠️ EVERY FIELD IS OPTIONAL AND EVERY FIELD IS NULLABLE, deliberately. Both callers read
 * from places where a value can be absent, empty or null, and a counter that throws on a
 * null is a counter nobody dares call from a render path.
 */
export type BriefFactInput = {
  /** Who Milla is speaking to. */
  contactName?: string | null
  /** The client's own company. */
  companyName?: string | null
  /** The client's own website. */
  website?: string | null
  /**
   * ⚠️ "WE DO NOT HAVE ONE" IS AN ANSWER. A client with no website must be able to finish
   * their brief. What must never happen is the fact being skipped in silence — so the
   * absence has to be stated, not inferred from an empty column.
   */
  websiteNone?: boolean | null
  /** What the client's own business does. */
  whatTheCompanyDoes?: string | null
  /** The target market, IN THE CLIENT'S OWN WORDS. Never a provider label. */
  targetCategory?: string | null
  /** Where the target companies are. */
  geographies?: readonly (string | null | undefined)[] | null
  /** The organisational form of the target company, from client evidence only. */
  targetCompanyType?: string | null
  /** How big the target companies are. */
  companySizes?: readonly (string | null | undefined)[] | null
  /** Who to reach inside them — job titles. */
  targetRoles?: readonly (string | null | undefined)[] | null
  /** …or seniority bands. Either satisfies the roles fact; see below. */
  targetSeniority?: readonly (string | null | undefined)[] | null
  /** Who the client does NOT want. */
  exclusions?: string | null
  /** What the client said this should achieve, in their words. */
  desiredOutcome?: string | null
}

export type BriefFactsResult = {
  collected: BriefFactId[]
  missing: BriefFactId[]
  /** How many of the eleven are held. */
  count: number
  /** Always 11. Returned so a caller never hard-codes the denominator. */
  total: number
  /** All eleven held. NOT the same as "the client confirmed" — that gate is separate. */
  complete: boolean
}

/** A string is a fact only when it survives trimming. `''` and `'   '` are not answers. */
const said = (v: string | null | undefined): boolean =>
  typeof v === 'string' && v.trim() !== ''

/** A list is a fact only when at least one entry survives trimming. */
const listed = (v: readonly (string | null | undefined)[] | null | undefined): boolean =>
  Array.isArray(v) && v.some(said)

export function briefFacts(input: BriefFactInput): BriefFactsResult {
  const held: Record<BriefFactId, boolean> = {
    contact_name:    said(input.contactName),
    company:         said(input.companyName),
    // The website fact is satisfied by an address OR by the client explicitly saying they
    // have none. `websiteNone` must be exactly true — a null or a false is not an answer.
    website:         said(input.website) || input.websiteNone === true,
    what_they_do:    said(input.whatTheCompanyDoes),
    target_category: said(input.targetCategory),
    geography:       listed(input.geographies),
    company_type:    said(input.targetCompanyType),
    company_size:    listed(input.companySizes),
    // ⚠️ TITLES **OR** SENIORITY. The founder's fact is "target roles" — who to reach inside
    // the target company. A client who said "founders, CEOs and MDs" has answered it, and so
    // has one who said "C-suite". Demanding both would invent a twelfth fact.
    target_roles:    listed(input.targetRoles) || listed(input.targetSeniority),
    exclusions:      said(input.exclusions),
    desired_outcome: said(input.desiredOutcome),
  }

  const collected = BRIEF_FACTS.filter(id => held[id])
  const missing = BRIEF_FACTS.filter(id => !held[id])
  return {
    collected: [...collected],
    missing: [...missing],
    count: collected.length,
    total: BRIEF_FACTS.length,
    complete: missing.length === 0,
  }
}

/**
 * The next fact Milla still needs, or null.
 *
 * ⚠️ ONE AT A TIME, IN THE APPROVED ORDER. Preview 01's whole shape is Milla asking for one
 * missing thing at a time and stopping once she has it — never a checklist, never all at
 * once. This returns the FACT, never a question: the wording is Milla's, in her own voice,
 * and no copy is generated here.
 */
export function nextBriefFact(input: BriefFactInput): BriefFactId | null {
  return briefFacts(input).missing[0] ?? null
}
