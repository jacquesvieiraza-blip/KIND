// LAUNCH SEND ALLOWLIST — AT LAUNCH WE EMAIL THE US, THE UK AND SOUTH AFRICA, AND NOWHERE ELSE.
//
// Founder-locked 20 Aug 2026. A lead outside this list is **held**, not deleted: it stays in
// the book, keeps its row, and starts sending the day he opens its country. Nothing about this
// file destroys data.
//
// ⛓️ AMENDED 20 Aug 2026 — the list shipped as US + UK only. The founder's rule is *"my launch
// rule is US, UK and South Africa"*, and R45 had attached a POPIA condition to South Africa that
// he never set (R54 chains it). South Africa was added the same day, under R54.
//
// ⚠️ WHY A SECOND COUNTRY LIST EXISTS, AND WHY THAT IS NOT DUPLICATION.
//
// `apps/api/src/lib/pecr.ts` already carries a UK list. It answers a different question:
// *"does UK law govern this send?"* — and its answer for a US lead is **out of scope, send**.
// This file answers *"is this one of the two countries we have chosen to operate in on day
// one?"* — and its answer for a Nigerian lead is **hold**, even though PECR is perfectly happy
// with it. Merging them would collapse a legal test into a commercial one, and the day the
// founder opens a third country he would be editing a file about UK statute to do it.
//
// They are two lists on purpose. `launch-countries.test.ts` asserts every UK spelling PECR
// recognises is also recognised here, so the pair cannot silently drift apart — which is the
// only failure mode two lists actually have.
//
// ⚠️ THIS IS NOT `SUPPORTED_COUNTRIES`. That constant is the African geography list the ICP
// builder suggests, and it overlaps this by exactly nothing. Do not conflate them.

/**
 * The countries we send to at launch, as a person would write them.
 *
 * Display-facing — this is the list a client is shown when their target list is refused.
 * Matching does NOT use this array; it uses the tolerant token set below.
 */
export const LAUNCH_SEND_COUNTRIES = ['United States', 'United Kingdom', 'South Africa'] as const

/**
 * Every spelling of those two countries we accept from enrichment.
 *
 * ⚠️ TOLERANT ON PURPOSE, in the same style and for the same reason as `pecr.ts`'s
 * `UK_COUNTRIES`: `country` is a free-text field filled by whichever provider sourced the
 * lead. PDL writes `location_country` lowercase (`"united states"`), an Apollo CSV writes
 * `"United States"`, a hand-typed row writes `"USA"` or `"U.S."`. An exact compare against
 * two title-case strings would hold most of a legitimate book on spelling alone — a
 * suppression that large, caused by punctuation, is indistinguishable from a bug.
 *
 * The four home nations are here because they arrive as the country in practice, and PECR's
 * list already accepts them; a lead whose country reads `"Scotland"` is a UK lead.
 */
const LAUNCH_COUNTRY_TOKENS = [
  // United States
  'us', 'u.s.', 'u.s.a.', 'usa', 'united states', 'united states of america', 'america',
  // United Kingdom — kept in step with pecr.ts's UK_COUNTRIES by launch-countries.test.ts
  'uk', 'u.k.', 'gb', 'gbr', 'united kingdom', 'great britain', 'britain',
  'england', 'scotland', 'wales', 'northern ireland',
  // South Africa — founder-locked 20 Aug 2026 (R54). `suid-afrika` is the Afrikaans name and
  // appears in real data; `rsa` is what a South African writes on a form more often than `za`.
  'za', 'zaf', 'south africa', 'rsa', 'republic of south africa', 'suid-afrika', 'suid afrika',
]

/**
 * Is this lead in a country we send to at launch?
 *
 * ⚠️ BLANK IS **FALSE**, AND THAT IS THE DELIBERATE DIFFERENCE FROM PECR.
 *
 * `pecrVerdict` lets an unknown country through — correctly, because refusing every lead with
 * a missing country would delete most of the book on a *legal* test that may not even apply.
 * This test is commercial and the reasoning inverts: we cannot claim a lead is in the US or the
 * UK when nothing on the row says so. An unknown country is not evidence of an allowed one.
 *
 * The cost of that is real and the founder took it knowingly: leads with no country are held
 * until the field is filled. They are counted and named, never dropped.
 */
export function isLaunchSendCountry(country: string | null | undefined): boolean {
  const c = String(country ?? '').trim().toLowerCase()
  if (!c) return false
  return LAUNCH_COUNTRY_TOKENS.includes(c)
}

/**
 * The reason an operator reads next to a held lead.
 *
 * Kept here rather than typed at the six call sites so they cannot word the same refusal six
 * different ways — the same reason `pecrSkipReason` exists. When one gate's counts stop
 * reconciling with another's, this is always why.
 */
export function launchHoldReason(country: string | null | undefined): string {
  const c = String(country ?? '').trim()
  return `launch_hold: ${c || 'unknown'}`
}

/**
 * What the CLIENT reads when a lead or a target list is held.
 *
 * ⚠️ THE COUNTRY NAMES ARE INTERPOLATED FROM `LAUNCH_SEND_COUNTRIES`, NEVER TYPED. Same rule as
 * every price a client can read: the day the founder opens a third country, this sentence
 * updates itself. A hard-typed "the US and the UK" is a promise that goes stale silently.
 *
 * It says what happened, what it means, and that nothing was lost — a client whose lead is held
 * has done nothing wrong and their lead has not gone anywhere.
 */
export function launchHoldMessage(country: string | null | undefined): string {
  const c = String(country ?? '').trim()
  const where = c ? `in ${c}` : 'without a country on record'
  // No article here — `openCountriesPhrase()` carries its own, per country. See there.
  return `We're only sending to ${openCountriesPhrase()} right now, and this contact is ${where} — so we've left them on your list and you were not charged. They'll be ready as soon as we open up.`
}

/**
 * Does this country name take a definite article? "the United States", but "South Africa".
 *
 * ⚠️ A REAL RULE, NOT A LOOKUP OF THE THREE WE HAPPEN TO HAVE. English gives "the" to country
 * names that are grammatically descriptions rather than proper nouns — plurals and names built
 * on a common noun (States, Kingdom, Republic, Emirates, Netherlands, Philippines, Gambia).
 * A hard-coded `{'United States': true}` map would be right today and silently wrong the first
 * time the founder opens the Netherlands.
 */
function takesThe(country: string): boolean {
  return /\b(States|Kingdom|Republic|Emirates|Netherlands|Philippines|Gambia|Bahamas|Maldives|Union)\b/i.test(country)
}

/**
 * "the United States, the United Kingdom and South Africa" — built from the constant, never typed.
 *
 * ⚠️ THE ARTICLE MOVED IN HERE ON 20 Aug, AND SOUTH AFRICA IS WHY. Both sentences below used to
 * read `in the ${openCountriesPhrase()}`, and the phrase itself welded a second `the` onto the
 * last item — correct for exactly the two countries it was written against, and broken the
 * moment a third arrived: *"in the United States, United Kingdom and the South Africa"*. Two
 * separate article bugs in one line, neither visible until the list changed.
 *
 * So each name now carries its own article and the call sites carry none. Adding a country is
 * one line in `LAUNCH_SEND_COUNTRIES` again, which is what that constant was always for.
 *
 * Widened to `readonly string[]` on purpose: `LAUNCH_SEND_COUNTRIES` is `as const`, so its
 * length is a literal and TypeScript rejects the one-country branch as dead code. That is the
 * compiler being right about TODAY and wrong about the point of this function, which is to still
 * read correctly the day the list is one country or six.
 */
function openCountriesPhrase(): string {
  const list: readonly string[] = LAUNCH_SEND_COUNTRIES
  if (list.length === 0) return 'the countries we have opened'
  const named = list.map(c => (takesThe(c) ? `the ${c}` : c))
  if (named.length === 1) return named[0]
  return `${named.slice(0, -1).join(', ')} and ${named[named.length - 1]}`
}

/**
 * What the CLIENT reads when their TARGET LIST names a country we cannot send to.
 *
 * Different sentence from `launchHoldMessage` on purpose: nothing has been held and no lead
 * exists yet — they are being told a choice is not available, before it costs them anything.
 * Naming the country back to them is the difference between a rule and a wall.
 */
export function launchTargetRefusal(country: string): string {
  // No article here either — see `openCountriesPhrase()`.
  return `We can't target ${String(country).trim()} yet — right now we source and send in ${openCountriesPhrase()} only. Remove it to save your targeting, and we'll tell you the moment it opens up.`
}
