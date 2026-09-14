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

/** A list, as the client would read it back. `''` when nothing in it survives trimming. */
const joined = (v: readonly (string | null | undefined)[] | null | undefined): string =>
  Array.isArray(v) ? v.filter(said).map(s => (s as string).trim()).join(', ') : ''

const trimmed = (v: string | null | undefined): string => (said(v) ? (v as string).trim() : '')

/**
 * 🛑 THE ONE PER-FACT MAPPING IN THIS CODEBASE. Every fact's VALUE is read here, and whether
 * it is HELD is derived from that value being non-empty — so there is no second place where a
 * fact could be considered present under one rule and absent under another.
 *
 * ⚠️ EMPTY MEANS NOT HELD, and that is why the website's "we have none" answer has to become
 * a real string: an explicit none IS an answer, and rendering it as `''` would demote it back
 * to the silence it was given to replace.
 */
function briefFactValues(input: BriefFactInput): Record<BriefFactId, string> {
  return {
    contact_name:    trimmed(input.contactName),
    company:         trimmed(input.companyName),
    // The website fact is satisfied by an address OR by the client explicitly saying they
    // have none. `websiteNone` must be exactly true — a null or a false is not an answer.
    website:         trimmed(input.website) || (input.websiteNone === true ? 'they have no website' : ''),
    what_they_do:    trimmed(input.whatTheCompanyDoes),
    target_category: trimmed(input.targetCategory),
    geography:       joined(input.geographies),
    company_type:    trimmed(input.targetCompanyType),
    company_size:    joined(input.companySizes),
    // ⚠️ TITLES **OR** SENIORITY. The founder's fact is "target roles" — who to reach inside
    // the target company. A client who said "founders, CEOs and MDs" has answered it, and so
    // has one who said "C-suite". Demanding both would invent a twelfth fact.
    target_roles:    joined(input.targetRoles) || joined(input.targetSeniority),
    exclusions:      trimmed(input.exclusions),
    desired_outcome: trimmed(input.desiredOutcome),
  }
}

/**
 * What the client has ALREADY said, in the approved order — label, and their own words.
 *
 * 🛑 WHY THIS IS NEEDED AT ALL (MVP1 resume). Persisting eleven facts and never reading them
 * back is not persistence. The builder prompt sees only the browser's transcript, so a client
 * who closed the tab returns to an empty `messages` array and Milla asks for all eleven again
 * while the answers sit in the draft. This is how the stored answers reach her — and it is
 * here, beside `BRIEF_FACTS`, so re-rendering them never becomes a twelfth copy of the list.
 *
 * ⚠️ HELD FACTS ONLY. A fact with no value is not rendered as "unknown"; it is simply absent,
 * which is what leaves Milla free to ask for it.
 */
export function briefFactLines(input: BriefFactInput): { id: BriefFactId; label: string; value: string }[] {
  const values = briefFactValues(input)
  return BRIEF_FACTS.filter(id => values[id] !== '')
    .map(id => ({ id, label: BRIEF_FACT_LABEL[id], value: values[id] }))
}

export function briefFacts(input: BriefFactInput): BriefFactsResult {
  const values = briefFactValues(input)
  const held: Record<BriefFactId, boolean> = Object.fromEntries(
    BRIEF_FACTS.map(id => [id, values[id] !== '']),
  ) as Record<BriefFactId, boolean>

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

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE PRE-CONFIRMATION DRAFT — THE SAME ELEVEN FACTS, PERSISTED BEFORE THERE IS A CLIENT.
//
// 🛑 WHY A DRAFT EXISTS AT ALL. `/auth/signup` creates an auth user and nothing else; the
// `clients` row is created by the CONFIRM click, which also saves the ICP and starts Proof.
// So the entire Brief conversation lived in React state in one browser tab: close it and
// everything collected was gone, and Vida never knew the person existed. Preview 07 —
// "signed up 14 minutes ago and Milla is collecting their brief", 10 of 11, confirmation
// pending — was not a state the product could reach.
//
// ⚠️ THIS IS NOT A SECOND BRIEF MODEL, and the shape below is the proof: it is a storage
// layout for the SAME eleven facts, mapped into the SAME `briefFacts()` counter that the
// builder gate and Vida both call. There is one definition of the Brief in this codebase and
// it is `BRIEF_FACTS` above. A draft that could disagree with it about completeness would be
// the second Brief model Preview 07 was corrected to delete.
//
// ⚠️ AND IT IS NOT A SECOND LIFECYCLE AUTHORITY. Before confirmation the draft is the
// authoritative WRITABLE Brief state. After promotion the confirmed client and ICP are the
// authoritative operational truth and the draft is evidence — kept for audit, provenance and
// recovery, never read back as a competing mutable source.
//
// ⚠️ SNAKE_CASE, BECAUSE IT IS A STORED SNAPSHOT. This object is persisted as one jsonb
// column — the same shape decision as `programmes.calculator_assumptions`: read back
// together, never queried across and never aggregated. Column-per-fact would be eleven
// migrations of churn for a value that is only ever read whole.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The partial Brief as stored. Every field optional — that is the entire point of a draft.
 *
 * ⚠️ THE LAST TWO ARE NOT BRIEF FACTS. `country` (where the CLIENT'S OWN business is) and
 * `phone` are account facts the promotion needs; they are carried here so the confirm click
 * has everything it requires, and they are deliberately absent from the eleven-fact mapping
 * below. Counting them would make the Brief thirteen facts by accident.
 */
export type BriefDraftFacts = {
  contact_name?: string | null
  company_name?: string | null
  website?: string | null
  website_none?: boolean | null
  what_they_do?: string | null
  target_category?: string | null
  geographies?: string[] | null
  target_company_type?: string | null
  company_sizes?: string[] | null
  job_titles?: string[] | null
  seniority_levels?: string[] | null
  exclusions?: string | null
  desired_outcome?: string | null
  /**
   * ⚑ 14 Sep (R121, Build 4) — AN ATTRIBUTE OF FACT #11, NOT A TWELFTH FACT.
   *
   * 🛑 IT REPLACES A TEN-WORD LIST that decided a commercial fact. `MEETING_WORDS` was matched
   * against the client's own sentence to choose between `meetings` and `other`, and whichever
   * way it fell decided whether a MEETING TARGET could later be agreed against their
   * programme — so "book qualified sales conversations" classified as `other` while "demo our
   * platform at the trade show" classified as `meetings`.
   *
   * ⚠️ IT IS DELIBERATELY ABSENT FROM `briefFactsFromDraft` BELOW. The Brief is eleven facts;
   * counting this would make it twelve by accident and ask the client for something they have
   * already told us inside #11.
   */
  desired_outcome_kind?: string | null
  /** Account fact, not a Brief fact — where the client's OWN business is based. */
  country?: string | null
  /** Account fact, not a Brief fact. */
  phone?: string | null
}

/**
 * The one mapping from stored draft to the canonical counter.
 *
 * ⚠️ EVERY READER GOES THROUGH THIS. Milla's persistence, the promotion gate and Vida's
 * progress card all count the same draft the same way, because they all call this and then
 * `briefFacts()`. A hand-rolled count anywhere is a second answer to "is this brief done?".
 */
export function briefFactsFromDraft(d: BriefDraftFacts | null | undefined): BriefFactInput {
  const f = d ?? {}
  return {
    contactName:        f.contact_name,
    companyName:        f.company_name,
    website:            f.website,
    websiteNone:        f.website_none,
    whatTheCompanyDoes: f.what_they_do,
    targetCategory:     f.target_category,
    geographies:        f.geographies,
    targetCompanyType:  f.target_company_type,
    companySizes:       f.company_sizes,
    targetRoles:        f.job_titles,
    targetSeniority:    f.seniority_levels,
    exclusions:         f.exclusions,
    desiredOutcome:     f.desired_outcome,
  }
}

/** How complete is a stored draft? The canonical answer, for every surface. */
export function briefDraftFacts(d: BriefDraftFacts | null | undefined): BriefFactsResult {
  return briefFacts(briefFactsFromDraft(d))
}
