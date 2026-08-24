import { describe, it, expect, vi } from 'vitest'

// `pdl-search` imports `./alerts`, which builds a Supabase client at module load and throws
// without SUPABASE_* env vars. Mocked so the TARGETING MAPS can be executed in a unit test —
// nothing here sends an alert, and nothing here calls PDL.
vi.mock('./alerts', () => ({ sendFounderAlert: vi.fn() }))
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  LAUNCH_SEND_COUNTRIES, isLaunchSendCountry, launchHoldReason,
  launchHoldMessage, launchTargetRefusal, canonicalLaunchCountry,
} from '@kind/shared'
import { buildPdlBody } from './pdl-search'
import { isUkCountry } from './pecr'

// THE LAUNCH ALLOWLIST — AND THE DRIFT GUARD BETWEEN THE TWO UK LISTS.
//
// There are now two country lists in this repository that both know about the UK:
//
//   • `apps/api/src/lib/pecr.ts` → `UK_COUNTRIES`, answering "does UK law govern this send?"
//   • `packages/shared/src/launch-countries.ts` → answering "have we opened this country?"
//
// They are separate on purpose (see the header of the launch file), and separate lists drift.
// The failure is silent and one-directional in the dangerous way: if somebody adds a UK
// spelling to PECR's list — `'jersey'`, `'isle of man'`, `'gb-eng'` — PECR starts recognising
// a lead as UK while the launch gate does not recognise it as an allowed country, so a
// perfectly legitimate British lead is held forever and nothing anywhere says why. Nobody
// would look for the cause in a file about UK statute.
//
// This test reads PECR's array OUT OF ITS SOURCE rather than importing it, because the const is
// private and exporting it purely to be tested would widen the file's surface for a test's
// convenience. Reading the source is the same technique `schema-drift.test.ts` uses, and it has
// the property that matters here: it sees the list as WRITTEN, not as re-exported.

describe('drift guard — PECR\'s UK list and the launch allowlist cannot diverge', () => {
  const pecrSource = readFileSync(join(__dirname, 'pecr.ts'), 'utf8')

  const ukCountriesFromPecrSource = (): string[] => {
    const block = pecrSource.match(/const UK_COUNTRIES\s*=\s*\[([\s\S]*?)\]/)
    if (!block) throw new Error('Could not find UK_COUNTRIES in pecr.ts — the drift guard is blind. Fix the matcher, do not delete the test.')
    return [...block[1].matchAll(/'([^']+)'/g)].map(m => m[1])
  }

  it('finds a real, non-trivial UK list in pecr.ts (the guard is not silently reading nothing)', () => {
    // Without this, a refactor that renames the const leaves the matcher finding an empty array
    // and every assertion below passing vacuously — a green test proving nothing, which is the
    // #617 harness lesson.
    const list = ukCountriesFromPecrSource()
    expect(list.length).toBeGreaterThanOrEqual(10)
    expect(list).toContain('united kingdom')
  })

  it('every country PECR treats as UK is a country the launch gate will send to', () => {
    for (const c of ukCountriesFromPecrSource()) {
      expect(isUkCountry(c), `pecr.ts says "${c}" is UK`).toBe(true)
      expect(
        isLaunchSendCountry(c),
        `"${c}" is in pecr.ts's UK_COUNTRIES but the launch allowlist does not recognise it — ` +
        `a legitimate UK lead would be held with no explanation. Add it to LAUNCH_COUNTRY_TOKENS.`,
      ).toBe(true)
    }
  })
})

describe('isLaunchSendCountry', () => {
  it('accepts the US, the UK and South Africa however enrichment happens to spell them', () => {
    // PDL writes lowercase, an Apollo CSV writes title case, a human writes anything.
    for (const c of ['US', 'us', 'U.S.', 'USA', 'United States', 'united states of america', 'America']) {
      expect(isLaunchSendCountry(c), c).toBe(true)
    }
    for (const c of ['UK', 'uk', 'GB', 'United Kingdom', 'Great Britain', 'England', 'Scotland', 'Wales', 'Northern Ireland']) {
      expect(isLaunchSendCountry(c), c).toBe(true)
    }
    for (const c of ['ZA', 'za', 'ZAF', 'South Africa', 'south africa', 'RSA', 'Republic of South Africa', 'Suid-Afrika']) {
      expect(isLaunchSendCountry(c), c).toBe(true)
    }
  })

  it('is insensitive to case and surrounding whitespace', () => {
    expect(isLaunchSendCountry('  UnItEd KiNgDoM  ')).toBe(true)
    expect(isLaunchSendCountry('  south africa ')).toBe(true)
  })

  it('⛓️ SOUTH AFRICA IS OPEN — this assertion used to say the opposite', () => {
    // ⛓️ 20 Aug 2026, and recorded rather than quietly edited. This file shipped earlier the
    // same day with `'South Africa'` in the HELD list below, because the allowlist was built as
    // US + UK. The founder's rule is *"my launch rule is US, UK and South Africa"* — the third
    // country was never in question, and R45 had attached a POPIA condition he never set (R54).
    //
    // Left as its own test rather than folded into the one above so the flip is visible in the
    // suite, not just in a git diff nobody reads.
    expect(isLaunchSendCountry('South Africa')).toBe(true)
    expect(LAUNCH_SEND_COUNTRIES).toContain('South Africa')
  })

  it('holds every country we have not opened', () => {
    // The African list the ICP builder suggests is the one that matters commercially — before
    // the front-door fence, each of these was a country we would happily have bought leads in.
    // South Africa left this list on 20 Aug (see above); the rest are still closed.
    for (const c of ['Nigeria', 'Kenya', 'Ghana', 'Egypt', 'Rwanda', 'Tanzania', 'Uganda', 'Senegal', "Cote d'Ivoire"]) {
      expect(isLaunchSendCountry(c), c).toBe(false)
    }
    for (const c of ['Ireland', 'Canada', 'Australia', 'Germany', 'India']) {
      expect(isLaunchSendCountry(c), c).toBe(false)
    }
  })

  it('opening South Africa did not open its neighbours or a substring of its name', () => {
    // `'za'` is a short token and short tokens are where a loose match leaks. These are the
    // countries somebody would expect to be caught by a sloppy rule.
    for (const c of ['Zambia', 'Zimbabwe', 'South Sudan', 'South Korea', 'Africa', 'South Africa Ltd']) {
      expect(isLaunchSendCountry(c), c).toBe(false)
    }
  })

  it('⚠️ HOLDS A BLANK COUNTRY — the deliberate inversion of pecrVerdict', () => {
    // `pecrVerdict` ALLOWS an unknown country: refusing on a missing field would delete most of
    // the book on a legal test that may not even apply. This gate is commercial and inverts it —
    // we cannot claim a lead is in the US or the UK when nothing on the row says so.
    //
    // Founder-locked 20 Aug. If this ever flips to `true`, every lead with no country starts
    // sending, which is precisely the outcome the allowlist exists to prevent.
    for (const c of [null, undefined, '', '   ']) {
      expect(isLaunchSendCountry(c)).toBe(false)
    }
  })

  it('does not match on substrings — "United Statesville" is not the United States', () => {
    // The whole-token care `hasCorporateMarker` needed, for the same reason: a loose match here
    // hands an unopened country an allowance it does not have.
    expect(isLaunchSendCountry('United Statesville')).toBe(false)
    expect(isLaunchSendCountry('New England')).toBe(false)
    expect(isLaunchSendCountry('Republic of Ireland')).toBe(false)
  })
})

describe('the words a person actually reads', () => {
  it('names the country in the skip reason, and says "unknown" when there is none', () => {
    expect(launchHoldReason('Nigeria')).toBe('launch_hold: Nigeria')
    expect(launchHoldReason(null)).toBe('launch_hold: unknown')
    expect(launchHoldReason('   ')).toBe('launch_hold: unknown')
  })

  it('⚠️ INTERPOLATES the open countries — never a typed "the US and the UK"', () => {
    // Same rule as every price a client can read. The day a third country opens, these
    // sentences must update themselves; a hard-typed pair is a promise that goes stale
    // silently. Asserted by deriving the expectation from the constant, so hard-typing the
    // names into the source would fail this.
    for (const c of LAUNCH_SEND_COUNTRIES) {
      expect(launchHoldMessage('Nigeria')).toContain(c)
      expect(launchTargetRefusal('Nigeria')).toContain(c)
    }
  })

  it('⚠️ AND READS AS ENGLISH — "and the South Africa" is what this catches', () => {
    // ⚠️ THE TEST ABOVE PASSED ON THE BROKEN SENTENCE, and that is the whole lesson here.
    // `toContain('South Africa')` is satisfied by *"in the United States, United Kingdom and
    // the South Africa"* — every name present, two article bugs, and a client reads it.
    //
    // Interpolating a name is not the same as producing a sentence. So this asserts the
    // sentence: the article belongs to each country, and no country gets one it should not.
    for (const msg of [launchHoldMessage('Nigeria'), launchTargetRefusal('Nigeria')]) {
      expect(msg, 'no article on South Africa').not.toContain('the South Africa')
      expect(msg, 'the US keeps its article').toContain('the United States')
      expect(msg, 'so does the UK').toContain('the United Kingdom')
      expect(msg, 'and the list reads as one phrase').toContain('the United States, the United Kingdom and South Africa')
      expect(msg, 'no doubled article from a leading "the" at the call site').not.toContain('the the ')
    }
  })

  it('the article rule is a RULE, not a lookup of the three we have today', () => {
    // The phrase builder is private, so this proves the rule through the only door it has: a
    // sentence. If the article were a hard-coded map of today's three countries, opening the
    // Netherlands would silently produce "and Netherlands" — right names, wrong English, and
    // no test would notice until a client did.
    const sentence = launchTargetRefusal('Nigeria')
    expect(sentence).toContain('send in the United States')
    expect(sentence, 'the leading article moved into the phrase, so the call site has none').not.toContain('send in the the')
  })

  it('tells the client they were not charged and that the lead is still theirs', () => {
    const msg = launchHoldMessage('Nigeria')
    expect(msg).toContain('Nigeria')
    expect(msg).toContain('not charged')
    expect(msg.toLowerCase()).toContain('left them on your list')
  })

  it('says "without a country on record" rather than printing an empty gap', () => {
    expect(launchHoldMessage(null)).toContain('without a country on record')
    expect(launchHoldMessage(null)).not.toContain('in  —')
  })

  it('names the refused country back to the client', () => {
    expect(launchTargetRefusal('Nigeria')).toContain('Nigeria')
  })
})

// ── THE ALIASES NOW ANSWER "WHICH ONE?", NOT JUST "IS IT ONE OF THE THREE?" ──────────────
//
// `pdl-search.ts` sent the client's own geography words straight to PDL, lowercased. PDL
// indexes `location_country` as a canonical full name, so a client targeting "US" produced
// `terms: { location_country: ['us'] }` — a clause matching nobody. It sits in `bool.must`,
// so the WHOLE query went to zero, silently, and the client read that as "K.I.N.D found
// nobody in my market". The industry, seniority and size clauses all mapped through a
// vocabulary table; country was the only one that did not — while the alias knowledge to fix
// it sat in THIS file, unusable because a flat token list cannot say which country a token is.
describe('canonicalLaunchCountry — one alias table, now readable in both directions', () => {
  it('every United States spelling canonicalises', () => {
    for (const t of ['US', 'us', 'U.S.', 'U.S.A.', 'USA', 'America', 'United States', 'United States of America'])
      expect(canonicalLaunchCountry(t), t).toBe('united states')
  })

  it('every United Kingdom spelling canonicalises, home nations included', () => {
    for (const t of ['UK', 'U.K.', 'GB', 'GBR', 'United Kingdom', 'Great Britain', 'Britain',
                     'England', 'Scotland', 'Wales', 'Northern Ireland'])
      expect(canonicalLaunchCountry(t), t).toBe('united kingdom')
  })

  it('every South Africa spelling canonicalises', () => {
    for (const t of ['ZA', 'ZAF', 'RSA', 'South Africa', 'Republic of South Africa', 'Suid-Afrika', 'Suid Afrika'])
      expect(canonicalLaunchCountry(t), t).toBe('south africa')
  })

  it('is insensitive to case and surrounding whitespace, like its sibling', () => {
    expect(canonicalLaunchCountry('  uNiTeD sTaTeS  ')).toBe('united states')
  })

  it('⚠️ AN UNKNOWN COUNTRY LOWERCASES AND PASSES THROUGH — it is never dropped', () => {
    // Dropping it would quietly widen the client's targeting from one country to the whole
    // world. Passing it through preserves exactly the pre-24-Aug behaviour for anything
    // outside the table: it reaches the provider as they wrote it, and matches what it matches.
    expect(canonicalLaunchCountry('Nigeria')).toBe('nigeria')
    expect(canonicalLaunchCountry('Kenya')).toBe('kenya')
    expect(canonicalLaunchCountry('')).toBe('')
    expect(canonicalLaunchCountry(null)).toBe('')
  })

  it('ONE SOURCE OF TRUTH — the send fence and the canonicaliser cannot disagree', () => {
    // The flat token list the fence tests against is DERIVED from the grouping, so every
    // alias either both passes the fence and canonicalises, or does neither. A second
    // independent token table is exactly what this assertion exists to prevent.
    for (const t of ['US', 'USA', 'U.S.', 'UK', 'GB', 'England', 'ZA', 'RSA', 'Suid-Afrika']) {
      expect(isLaunchSendCountry(t), `${t} passes the fence`).toBe(true)
      expect(LAUNCH_SEND_COUNTRIES.map(c => c.toLowerCase()), `${t} canonicalises to a launch country`)
        .toContain(canonicalLaunchCountry(t))
    }
    // …and the source really does derive one from the other, rather than listing twice.
    const src = readFileSync(join(__dirname, '../../../../packages/shared/src/launch-countries.ts'), 'utf8')
    expect(src).toContain('const LAUNCH_COUNTRY_TOKENS: readonly string[] = Object.values(LAUNCH_COUNTRY_ALIASES).flat()')
    expect((src.match(/'u\.s\.a\.'/g) ?? []), 'the USA alias is written exactly once').toHaveLength(1)
  })
})

// ── THE PDL QUERY MEANS WHAT THE CLIENT'S WORDS MEAN ─────────────────────────────────────
//
// Executed against the real builder, not asserted by reading source strings: a map that is
// string-matched proves it was TYPED, while executing `buildPdlBody` proves what a client's
// actual selections turn into.
describe('buildPdlBody — targeting maps say what the labels promise', () => {
  const ICP = {
    job_titles: ['Head of Operations'], seniority_levels: [], company_sizes: [],
    geographies: [], industries: [],
  }
  const clauseFor = (icp: Partial<typeof ICP>, field: string) => {
    const body = buildPdlBody({ ...ICP, ...icp } as typeof ICP, 20) as
      { query: { bool: { must: Array<Record<string, Record<string, unknown>>> } } }
    const hit = body.query.bool.must.find(c => c.terms && field in c.terms)
    return (hit?.terms?.[field] as string[] | undefined) ?? null
  }

  it('COUNTRY — the canonical value reaches location_country, not the client\'s spelling', () => {
    expect(clauseFor({ geographies: ['US'] }, 'location_country')).toEqual(['united states'])
    expect(clauseFor({ geographies: ['USA'] }, 'location_country')).toEqual(['united states'])
    expect(clauseFor({ geographies: ['U.S.'] }, 'location_country')).toEqual(['united states'])
    expect(clauseFor({ geographies: ['United States'] }, 'location_country')).toEqual(['united states'])
    expect(clauseFor({ geographies: ['UK'] }, 'location_country')).toEqual(['united kingdom'])
    expect(clauseFor({ geographies: ['GB'] }, 'location_country')).toEqual(['united kingdom'])
    expect(clauseFor({ geographies: ['England'] }, 'location_country')).toEqual(['united kingdom'])
    expect(clauseFor({ geographies: ['RSA'] }, 'location_country')).toEqual(['south africa'])
    // …aliases of the SAME country collapse to one term rather than repeating it.
    expect(clauseFor({ geographies: ['US', 'USA', 'America'] }, 'location_country')).toEqual(['united states'])
    // …and an unknown country still reaches the provider, lowercased.
    expect(clauseFor({ geographies: ['Nigeria'] }, 'location_country')).toEqual(['nigeria'])
  })

  it('SENIORITY — "Head of" means manager, director AND vp', () => {
    const levels = clauseFor({ seniority_levels: ['Head of'] }, 'job_title_levels')
    for (const lvl of ['manager', 'director', 'vp']) expect(levels, lvl).toContain(lvl)
  })

  it('SENIORITY — every other label keeps exactly the meaning it had', () => {
    expect(clauseFor({ seniority_levels: ['C-Suite'] }, 'job_title_levels')).toEqual(['cxo', 'owner'])
    expect(clauseFor({ seniority_levels: ['VP / Director'] }, 'job_title_levels')).toEqual(['vp', 'director'])
    expect(clauseFor({ seniority_levels: ['Manager'] }, 'job_title_levels')).toEqual(['manager'])
    expect(clauseFor({ seniority_levels: ['Senior'] }, 'job_title_levels')).toEqual(['senior'])
    expect(clauseFor({ seniority_levels: ['Individual Contributor'] }, 'job_title_levels')).toEqual(['entry'])
  })

  it('SIZE — "1,000+" does not stop at 5,000', () => {
    const sizes = clauseFor({ company_sizes: ['1,000+'] }, 'job_company_size')
    for (const b of ['1001-5000', '5001-10000', '10001+']) expect(sizes, b).toContain(b)
  })

  it('SIZE — no OTHER band was widened; each still means exactly one bucket', () => {
    expect(clauseFor({ company_sizes: ['1–10'] }, 'job_company_size')).toEqual(['1-10'])
    expect(clauseFor({ company_sizes: ['11–50'] }, 'job_company_size')).toEqual(['11-50'])
    expect(clauseFor({ company_sizes: ['51–200'] }, 'job_company_size')).toEqual(['51-200'])
    expect(clauseFor({ company_sizes: ['201–500'] }, 'job_company_size')).toEqual(['201-500'])
    expect(clauseFor({ company_sizes: ['501–1,000'] }, 'job_company_size')).toEqual(['501-1000'])
    // …and a selection of small bands never drags enterprise buckets in behind it.
    expect(clauseFor({ company_sizes: ['1–10', '11–50'] }, 'job_company_size'))
      .toEqual(['1-10', '11-50'])
  })

  it('TITLES are still OR, and every clause still sits in bool.must', () => {
    const body = buildPdlBody({ ...ICP, job_titles: ['Head of Ops', 'COO'] }, 20) as
      { query: { bool: { must: Array<Record<string, unknown>> } } }
    const titleClause = body.query.bool.must.find(c => 'bool' in c) as
      { bool: { should: Array<{ match: { job_title: string } }> } }
    expect(titleClause.bool.should.map(s => s.match.job_title)).toEqual(['Head of Ops', 'COO'])
    expect(Array.isArray(body.query.bool.must)).toBe(true)
  })

  it('⚠️ BOUNDARIES — work_email, request shape and pagination are untouched', () => {
    const body = buildPdlBody(ICP, 20) as Record<string, unknown> & { query: { bool: { must: unknown[] } } }
    // The email-existence clause is NOT this build's business — the founder ruled it a
    // separate one. It must still be here, unchanged, on every query.
    expect(JSON.stringify(body)).toContain('{"exists":{"field":"work_email"}}')
    // Same envelope, same size passthrough, and scroll_token only when one is supplied.
    expect(body.size).toBe(20)
    expect(body).not.toHaveProperty('scroll_token')
    expect(buildPdlBody(ICP, 20, 'tok')).toHaveProperty('scroll_token', 'tok')
    // No `from`-based paging crept back in (#366).
    expect(body).not.toHaveProperty('from')
  })
})
