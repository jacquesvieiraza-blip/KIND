// ═══════════════════════════════════════════════════════════════════════════════════════
// THE MODEL MAY INTERPRET LANGUAGE. IT MAY NOT ASSERT FACTS ABOUT THE CLIENT. (S1-RT-009.)
//
// ── WHY THIS EXISTS ────────────────────────────────────────────────────────────────────
//
// Removing the completion-time country requirement stopped the product from FORCING the
// model to invent a country. It did not stop the model from volunteering one. `profile.country`
// was still taken at face value, so this remained reachable and is exactly what happened live:
//
//   the client says          "our best customers are agencies in the UK and US"
//   the model emits          profile.country = "United Kingdom"
//   the screen tells them    "Based in — UK"
//
// about a business they never said was in the UK.
//
// ⚠️ THE VISIBLE COMPLETION SUMMARY IS NO LONGER GUARDED HERE — IT IS NO LONGER SENT. A
// screen that judged the model's prose was a second, weaker truth: it caught invented
// locations and would have let "you want recruitment agencies in the UK" through against a
// record that excludes them. The confirmation now carries facts on the canonical cards and
// nothing else, so there is no second version of the client's truth to police. See
// `icps.ts`, the completion response.
//
// ⚠️ NEITHER FUNCTION HERE EVER SUPPLIES A VALUE. They answer one question — "did the
// CUSTOMER establish this?" — and the only two outcomes are "keep what the customer said"
// and "unknown stays unknown". Nothing is guessed, defaulted or repaired.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The spellings a person actually types for the markets we operate in, plus the handful of
 * forms that matter for matching a country name inside a sentence.
 *
 * ⚠️ MATCHING AID ONLY, NEVER A VOCABULARY. Nothing here is written to a column or offered
 * as a choice; it exists so "the UK" in a customer's sentence can be recognised as the same
 * country as "United Kingdom" in a model field. An unrecognised country is compared by its
 * own text, which means an unusual one can only ever be MISSED — never invented.
 */
const COUNTRY_FORMS: ReadonlyArray<readonly string[]> = [
  ['united kingdom', 'uk', 'u.k.', 'great britain', 'britain', 'england', 'scotland', 'wales'],
  ['united states', 'us', 'u.s.', 'usa', 'u.s.a.', 'america'],
  ['south africa', 'sa', 'rsa'],
  ['ireland', 'republic of ireland', 'eire'],
]

/** "We're an Irish company" locates their business as plainly as "we are based in Ireland". */
const DEMONYMS: ReadonlyArray<readonly [string, string]> = [
  ['irish', 'ireland'],
  ['british', 'united kingdom'],
  ['english', 'united kingdom'],
  ['scottish', 'united kingdom'],
  ['welsh', 'united kingdom'],
  ['american', 'united states'],
  ['south african', 'south africa'],
]

const norm = (s: unknown): string => String(s ?? '').trim().toLowerCase()

/**
 * ⚠️ DOTS ARE REMOVED, NOT KEPT AS WORD CHARACTERS. Preserving them so "u.k." could match
 * turned every sentence-final country into a miss: "We are based in Ireland." tokenised as
 * `ireland.`, which never equals `ireland`.
 */
const words = (text: unknown): string =>
  ` ${norm(text).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()} `

function formsOf(country: string): string[] {
  const c = norm(country)
  if (!c) return []
  const row = COUNTRY_FORMS.find(forms => forms.includes(c))
  return row ? [...row] : [c]
}

/** Do two country strings name the same country? */
export function sameCountry(a: unknown, b: unknown): boolean {
  const x = norm(a), y = norm(b)
  if (!x || !y) return false
  if (x === y) return true
  return COUNTRY_FORMS.some(forms => forms.includes(x) && forms.includes(y))
}

/** Does this text name the country, as a whole word rather than inside another word? */
function mentions(text: string, country: string): boolean {
  const hay = words(text)
  return formsOf(country).some(form => hay.includes(words(form)))
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTE A — THE CUSTOMER LOCATED THEIR OWN BUSINESS
//
// 🛑 THE SUBJECT IS THE WHOLE GUARD. A country in a sentence proves nothing; WHO the sentence
// puts there is the entire question, and the previous version of this rule never asked it.
// Its location pattern made the subject OPTIONAL, so a bare `is`/`are` was enough and every
// one of these established the client's own head office:
//
//     "Our partner is based in Ireland."              ← somebody else's head office
//     "Our client is based in Ireland."               ← their customer's
//     "Recruitment agencies are based in Ireland."    ← an industry, and one they EXCLUDE
//     "One of our suppliers is headquartered in Ireland."
//
// and its demonym rule asked only whether `we`/`our` appeared ANYWHERE in the sentence, so
// these did too:
//
//     "We target Irish companies."                    ← who they sell TO
//     "Our best customers are Irish companies."       ← who buys from them
//     "We have Irish clients."                        ← same
//
// ⚠️ SO THE SUBJECT IS NOW REQUIRED, IT IS A CLOSED LIST, AND IT MUST GOVERN THE VERB. Only
// three things may occupy it: `we`, `our <own-business noun>`, or THE CLIENT'S OWN COMPANY
// NAME as the canonical Brief already records it. Anything else — a partner, a supplier, a
// client, a plural industry, an unnamed third party — is a sentence about someone else, and a
// sentence about someone else is UNKNOWN.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * The nouns a person uses for THEIR OWN business. Deliberately excludes everything that
 * belongs to somebody else — `partner`, `client`, `customer`, `supplier`, `office`, `team's
 * agency` — because "our partner" and "our company" differ by exactly one word and mean
 * opposite things about who is located where.
 */
const OWN_NOUN =
  'company|business|firm|agency|consultancy|practice|studio|startup|organisation|organization'

/** Up to three words after "in" — bounded so "in Ireland and sells into the UK" is one claim. */
const LOC = String.raw`([A-Za-z.]+(?:\s+[A-Za-z.]+){0,2})`

/**
 * ⚠️ THE VERB LIST IS SHORT ON PURPOSE. Each says "this is where the subject IS". Everything
 * else a person says about a country says something else: "we have clients in Ireland" is a
 * customer, "we opened an office in Ireland" is an office, "we don't sell into Ireland" is a
 * market they refuse. None of them is a head office and none of them matches.
 */
const PLACED = String.raw`(?:based|headquartered|hq(?:['’]?d)?|registered|incorporated|domiciled)`

/** The copula and the small adverbs that can sit between the subject and the verb. */
const LINK =
  String.raw`(?:\s*,)?(?:\s*['’](?:re|s|m)|\s+(?:are|is|am|was|were))?(?:\s+(?:currently|now|also|officially|proudly))?`

const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * 🛑 THE ONLY THREE SUBJECTS THAT CAN LOCATE THIS CLIENT.
 *
 * ⚠️ THE COMPANY NAME COMES FROM THE CANONICAL BRIEF, NEVER FROM THE MODEL'S `profile`. If the
 * model could supply the name, it could supply a name that makes its own invented sentence
 * self-consistent — which is the defect this whole file exists to close. `resolveBriefFacts`
 * is the customer's own record; the model's field is a projection of it.
 *
 * ⚠️ AND A NAME UNDER THREE CHARACTERS IS NOT USED. A one- or two-letter "name" is far more
 * likely to be a fragment that matches half the transcript than a company.
 */
function ownSubjects(companyName: unknown): string {
  const alts = [String.raw`we`, String.raw`our\s+(?:${OWN_NOUN})`]
  const name = String(companyName ?? '').trim()
  if (name.length >= 3 && /[a-z]/i.test(name)) alts.push(escapeRe(name))
  return `(?:${alts.join('|')})`
}

/** "We are NOT based in Ireland" must never read as "based in Ireland". */
function negatedNear(text: string, at: number): boolean {
  const before = norm(text.slice(Math.max(0, at - 40), at))
  return /\b(?:not|never|no longer|isn'?t|aren'?t|won'?t|don'?t|doesn'?t)\b/.test(before)
}

/**
 * 🛑 "<THE CLIENT> IS BASED IN <COUNTRY>" — subject, verb, place, in that order.
 *
 * `plainIn` drops the requirement for a location VERB, so "we are in the UK" counts. It is
 * passed ONLY for the direct reply to our own question, where the question has already
 * established that the subject under discussion is their business. Said unprompted, "we're in
 * the UK" is as likely to be about a market as a head office, so route A never allows it.
 */
function locatedByAnOwnSubject(
  text: string, country: string, companyName: unknown, plainIn = false,
): boolean {
  const verb = plainIn ? `(?:${PLACED}\\s+)?` : `${PLACED}\\s+`
  const re = new RegExp(
    String.raw`\b${ownSubjects(companyName)}${LINK}\s+${verb}(?:in|out of|at)\s+${LOC}`, 'gi')
  for (const m of text.matchAll(re)) {
    if (negatedNear(text, m.index ?? 0)) continue
    if (mentions(m[1] ?? '', country)) return true
  }
  return false
}

/**
 * 🛑 "WE'RE AN IRISH COMPANY" — a demonym locates them only when it describes THEIR COMPANY.
 *
 * ⛓️ THE OLD RULE ASKED ONLY WHETHER `we`/`our` APPEARED SOMEWHERE IN THE SENTENCE, which made
 * "We target Irish companies", "Our best customers are Irish companies" and "We have Irish
 * clients" all read as an Irish head office. The demonym must now sit between an own-business
 * subject with a copula and an own-business noun — the shape of "we are an Irish company" and
 * of nothing else on that list.
 *
 * ⚠️ "WE'RE IRISH" IS NOT ENOUGH, AND THAT IS DELIBERATE. That is a person's nationality, not a
 * company's registration, and the founder's rule is that UNKNOWN is correct whenever
 * ownership is ambiguous.
 */
function describedAsTheirOwnCountry(text: string, country: string, companyName: unknown): boolean {
  for (const [demonym, named] of DEMONYMS) {
    if (!sameCountry(named, country)) continue
    const re = new RegExp(
      String.raw`\b${ownSubjects(companyName)}(?:\s*['’]re|\s+(?:are|is))\s+(?:an?\s+)?` +
      String.raw`${demonym}\s+(?:${OWN_NOUN})\b`, 'i')
    if (re.test(text) && !/\b(?:not|never|no longer)\b/i.test(text.slice(0, 40))) return true
  }
  return false
}

function saysTheyAreLocatedIn(text: string, country: string, companyName: unknown): boolean {
  return locatedByAnOwnSubject(text, country, companyName)
    || describedAsTheirOwnCountry(text, country, companyName)
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ROUTE B — WE ASKED, AND THIS IS THE ANSWER
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * 🛑 THE PRODUCT'S OWN QUESTION. `approve()` composes "Before I can open your account I still
 * need which country your business is based in — could you tell me?" and appends it to the
 * transcript, so the client's reply is the turn straight after it. That is the existing flow
 * establishing the evidence — no new field, no twelfth Brief fact.
 */
const ASKED_WHERE_THEY_ARE_BASED: readonly string[] = [
  // The product's own sentence, from `approve()`.
  'country your business is based in',
  'country your company is based in',
  // ⚠️ AND THE WAY A PERSON ACTUALLY WRITES IT. "Which country is your business based in?"
  // matched NOTHING in the first version of this list, so route B never fired for the most
  // natural phrasing of the question — a client who answered it would still have been
  // refused, and the promotion ask would have looped. Found by a tooth that only bit once.
  'country is your business based in',
  'country is your company based in',
  'where your business is based',
  'where is your business based',
  'where is your company based',
  'where are you based',
  'which country are you based in',
  'what country is your company in',
  'what country is your business in',
]

const asksOwnCountry = (content: string): boolean =>
  ASKED_WHERE_THEY_ARE_BASED.some(q => norm(content).includes(q))

/**
 * 🛑 THE WORDS A BARE ANSWER MAY CONTAIN BESIDES THE COUNTRY ITSELF — AND NOT ONE SUBJECT.
 *
 * "Ireland." · "The UK." · "Yes, the UK." — the plainest possible reply to "which country is
 * your business based in?" is the country and a word of politeness. THAT is all this path
 * recognises. The moment a reply names WHO or WHAT is somewhere, it stops being a bare answer
 * and has to satisfy the ownership rule like any other sentence.
 *
 * ⛓️ THIS LIST ONCE CONTAINED `office`, `i`, `my`, `am`, `we`, `our`, `is`, `company`,
 * `business` AND `currently` — every one of them a SUBJECT or the verb that carries one — so
 * the bare path blessed sentences the ownership rule exists to refuse:
 *
 *     "Our office is in Ireland."     ← an office is not the company's base
 *     "My office is in Ireland."      ← the same, and not even "our"
 *     "I am in Ireland."              ← where the PERSON is, not the business
 *     "I'm currently in Ireland."     ← where the person is today
 *
 * ⚠️ SO NO SUBJECT-CAPABLE WORD MAY EVER BE ADDED HERE. A reply carrying a subject — "we're in
 * the UK", "our business is in the UK", "Northstar Revenue is in the UK" — is accepted by
 * `locatedByAnOwnSubject(…, plainIn)` on the very next line, which CHECKS that subject. This
 * path must never be a second, unchecked way in.
 *
 * ⚠️ `not` IS NOT IN THIS LIST AND MUST NEVER BE. It is what makes "I'm not sure" and "we are
 * not in the UK" fail, without a second negation rule to keep in step with this one.
 */
const ANSWER_FILLER: ReadonlySet<string> = new Set([
  'the', 'a', 'an', 'in', 'at', 'of', 'and',
  'yes', 'yeah', 'yep', 'ok', 'okay', 'thanks', 'please',
])

/**
 * 🛑 DID THE REPLY SAY THE COUNTRY AND NOTHING ELSE AT ALL?
 *
 * The country's own words are removed and every remaining word must be filler. A bare "The
 * UK." is the plainest possible answer to our question and must be accepted; a reply that
 * names any subject falls through to the ownership rule, which is the only thing entitled to
 * judge whether that subject is the client's own business.
 */
function answerIsJustTheCountry(text: string, country: string): boolean {
  let rest = words(text)
  let found = false
  for (const form of formsOf(country).slice().sort((a, b) => b.length - a.length)) {
    const f = words(form)
    while (rest.includes(f)) { rest = rest.replace(f, ' '); found = true }
  }
  if (!found) return false
  return rest.trim().split(/\s+/).filter(Boolean).every(w => ANSWER_FILLER.has(w))
}

export interface CountryEvidenceInput {
  /** The country the MODEL supplied. Never trusted on its own. */
  country: unknown
  /** The conversation as it actually happened, in order. */
  turns: ReadonlyArray<{ role: string; content: string }>
  /**
   * The client's own company name AS THE CANONICAL BRIEF RECORDS IT — so "Northstar Revenue
   * is based in Ireland" can be read as the client locating themselves. Optional: without it
   * only `we` and `our company` can carry a location, which is a narrowing, never a widening.
   */
  companyName?: unknown
}

/**
 * 🛑 MAY THIS COUNTRY BE RECORDED AS THE CLIENT'S OWN BUSINESS LOCATION?
 *
 * IT IS ACCEPTED ONLY WHEN THE CUSTOMER CLEARLY LOCATED THEIR OWN BUSINESS. Two routes:
 *
 *   A. THEY LOCATED THEMSELVES THERE — "we are based in Ireland", "our company is based in
 *      Ireland", "Northstar Revenue is based in Ireland", "we're an Irish company", "ABCV
 *      Logistics, based in the US". An own-business SUBJECT governing a location verb.
 *
 *   B. WE ASKED WHERE THEIR BUSINESS IS AND THEY ANSWERED IT — the FIRST reply after the most
 *      recent ask, and that reply must itself locate the business: the country on its own
 *      ("The UK."), or an own-business subject placed there ("We're in the UK.").
 *
 * ⛓️ A THIRD ROUTE STOOD HERE AND WAS WRONG: "they mentioned it and it is not one of their
 * target markets". That accepted "we have clients in Ireland" and "our partner is in
 * Ireland" as a head office. And pairing ANY historical question with ANY historical mention
 * recreated the original defect exactly — target "UK and US" said on turn 1, our question on
 * turn 8, "I'm not sure" on turn 9, and the UK accepted. Both are gone.
 *
 * ⛓️ AND ROUTE B ONCE ACCEPTED ANY MENTION IN THAT REPLY, which is necessary but nowhere near
 * sufficient: "I'm not sure, but our customers are in the UK" is a reply to our question that
 * answers a different one, and it established the United Kingdom. Immediately following the
 * question no longer makes a sentence an answer to it.
 *
 * ⚠️ NOTHING IS INFERRED FROM SOMEBODY ELSE BEING SOMEWHERE — not a partner, a supplier, a
 * client, an office, a customer base, a target market, nor a demonym describing any of them.
 * UNKNOWN is correct whenever ownership is ambiguous.
 *
 * ⚠️ A "NO" IS NOT A REJECTION OF THE CLIENT. The fact stays UNKNOWN, the panel renders
 * "still needed", and `approve()` asks. One extra question is the cost of being wrong in the
 * safe direction; a false company fact on their record is the cost of the other.
 */
export function countryHasCustomerEvidence(input: CountryEvidenceInput): boolean {
  const country = String(input.country ?? '').trim()
  if (!country) return false
  const name = input.companyName

  // ── A. the customer located their own business
  if (input.turns.some(t => t.role === 'user' && saysTheyAreLocatedIn(t.content, country, name)))
    return true

  // ── B. the answer to OUR question — the reply immediately after the most recent ask.
  //    ⚠️ THE MOST RECENT, AND ONLY THE REPLY THAT FOLLOWS IT. An older question paired with
  //    an older mention is not a question being answered; it is two unrelated sentences.
  let askedAt = -1
  for (let i = 0; i < input.turns.length; i++) {
    const t = input.turns[i]
    if (t.role === 'assistant' && asksOwnCountry(t.content)) askedAt = i
  }
  if (askedAt >= 0) {
    const answer = input.turns.slice(askedAt + 1).find(t => t.role === 'user')
    if (answer) {
      // ⚠️ THE REPLY MUST ANSWER THE QUESTION WE ASKED. "The UK." does; "I'm not sure, but our
      // customers are in the UK" mentions a country while answering something else.
      if (answerIsJustTheCountry(answer.content, country)) return true
      if (locatedByAnOwnSubject(answer.content, country, name, true)) return true
    }
  }
  return false
}
