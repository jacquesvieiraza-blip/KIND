// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LEAD-POOL COUNTRY CONTRACT — what a pooled row must carry to serve a geography.
//
// THE PRODUCTION FAILURE, and it is measured, not inferred. A fresh Pass 1 targeting
// ["United States","United Kingdom"] served ZERO from a pool of 85 owned rows — while 18 of
// those rows matched on title. The founder read the table directly: **all 85 `country` values
// are NULL**. The matcher requires `country AND (title OR industry OR seniority)`, so a null
// country makes an otherwise-perfect record permanently unservable to any client who named a
// country — which is every client.
//
// ⚠️ WHAT IS OBSERVED vs WHAT IS CODE-REPRODUCED, kept apart deliberately.
//   FOUNDER-OBSERVED (production, read by him in SQL): 85 pool rows · 18 title hits · 0
//     industry hits · 0 seniority hits · 0 geography hits · 0 full-matcher hits · every
//     `country` NULL.
//   CODE-REPRODUCED (this repository, in these tests): the write path that produces a null
//     country, the two substring accidents in the old matcher, the freeze that stopped a
//     null row ever healing, and the non-null protection. No production row was read by me
//     and no provider was called.
//
// THE TWO DEFECTS THESE TESTS PIN:
//   ① COUNTRY WAS COMPARED AS A SUBSTRING. `'australia'.includes('us')` is true, so a US
//      target was matched by Australia, Austria, Belarus, Cyprus and Mauritius; `'ukraine'
//      .includes('uk')` is true. In the other direction a row stored as "GB" or "England"
//      never matched a client who typed "United Kingdom", so owned inventory was invisible.
//   ② A NULL COUNTRY COULD NEVER HEAL. The pool upsert is ON CONFLICT DO NOTHING, which
//      correctly protects a good value — and also froze a bad one, permanently.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import {
  poolRecordMatchesIcp, poolCountryMatches, canonicalPoolCountry, isGeoServable,
  type PoolRecord,
} from './pool-sourcing'
import { canonicalLaunchCountry, launchCountrySpellings } from '@kind/shared'

// The executed Apollo-tripwire test imports `./apollo`, whose chain reaches `@kind/db` —
// which throws at import without Supabase env vars. Mocked empty: nothing in this file
// touches a database, and `fetch` is mocked in the one test that calls the provider code.
vi.mock('@kind/db', () => ({ db: {} }))

// ⛓️ RETARGETED 10 Sep (C02) — THE FIXTURE HARD-FITS BY DEFAULT, SO GEOGRAPHY STAYS THE
// VARIABLE. `poolRecordMatchesIcp` was OR-generous (country AND (title OR industry OR
// seniority), with no size test at all) and now delegates to the one deterministic hard-fit
// rule: geography AND size AND industry AND seniority must all hold.
//
// This file's subject is the COUNTRY CONTRACT — that `GB`/`England` satisfy "United Kingdom"
// and that Ukraine and Australia do not. Those duties are unchanged and every one of them is
// still asserted below. What changed is that a row carrying only a country and a title is no
// longer a match for any other reason, so each case would now fail on a criterion it was
// never about. The default row therefore satisfies industry, size and seniority for the ICPs
// used here, and each case overrides exactly the field it is testing.
const rec = (over: Partial<PoolRecord>): PoolRecord => ({
  email_norm: 'a@b.com',
  industry: 'SaaS', company_size: '11–50', seniority: 'c_suite', title: 'Founder',
  ...over,
})

/** Strip whole-line comments before asserting on source text, so a guard can never be
 *  satisfied by the prose of the comment that explains it. */
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|--|\*|\/\*)/.test(l)).join('\n')

const readRepo = (rel: string) => readFileSync(join(__dirname, '../../../..', rel), 'utf8')
// ⛓️ 12 Sep — THE POOL READ MOVED; THIS GUARD FOLLOWED IT RATHER THAN SHRANK.
//
// The candidate selection these assertions describe was extracted from `servePoolLeads` into
// `lib/pool-candidates.ts`, so that `/lookalike/generate` and House prospecting ask the SAME
// code instead of each growing their own answer (POOL-FIRST gate, founder 12 Sep). The pool
// WRITE stayed in `routes/icps.ts`.
//
// ⚠️ THE SURFACE IS BOTH FILES, AND THE ASSERTIONS ARE UNCHANGED. Splitting these tests by
// file would mean re-deciding, one by one, which half each rule lives in — and the next
// extraction would break them all over again. What this guard is for is that the RULES still
// exist somewhere on the pool path; `pool-provenance.test.ts` is what pins each lead_pool SITE
// to its own file, and it still does.
const poolSurface = () =>
  readRepo('apps/api/src/routes/icps.ts') + '\n' + readRepo('apps/api/src/lib/pool-candidates.ts')

// ── 1–5 · CANONICALISATION: every spelling of one country resolves to one value ──────────
describe('country canonicalisation — one country, one stored form', () => {
  it('① a source that has a country canonicalises to the pool form', () => {
    expect(canonicalPoolCountry('United States')).toBe('united states')
    expect(canonicalPoolCountry('United Kingdom')).toBe('united kingdom')
  })

  it('② alias US → united states', () => expect(canonicalPoolCountry('US')).toBe('united states'))
  it('③ alias USA → united states', () => {
    expect(canonicalPoolCountry('USA')).toBe('united states')
    expect(canonicalPoolCountry('U.S.A.')).toBe('united states')
    expect(canonicalPoolCountry('America')).toBe('united states')
  })
  it('④ alias UK → united kingdom', () => {
    expect(canonicalPoolCountry('UK')).toBe('united kingdom')
    expect(canonicalPoolCountry('England')).toBe('united kingdom')
    expect(canonicalPoolCountry('Scotland')).toBe('united kingdom')
  })
  it('⑤ alias GB → united kingdom', () => {
    expect(canonicalPoolCountry('GB')).toBe('united kingdom')
    expect(canonicalPoolCountry('GBR')).toBe('united kingdom')
  })

  it('⑥ unknown stays unknown — blank, null and whitespace are NOT a country', () => {
    for (const v of [null, undefined, '', '   ', '\t']) {
      expect(canonicalPoolCountry(v), String(v)).toBe('')
      expect(isGeoServable({ country: v }), String(v)).toBe(false)
    }
  })

  it('a country outside the alias table is preserved, never dropped', () => {
    expect(canonicalPoolCountry('Nigeria')).toBe('nigeria')
    expect(canonicalPoolCountry('  KENYA ')).toBe('kenya')
  })

  it('the canonicaliser is the ONE already-locked table, not a second copy', () => {
    for (const t of ['US', 'usa', 'GB', 'England', 'suid-afrika', 'Nigeria', '']) {
      expect(canonicalPoolCountry(t), t).toBe(canonicalLaunchCountry(t))
    }
  })
})

// ── ⚑ THE SUBSTRING ACCIDENTS — the wrong-lead half of the defect ───────────────────────
describe('⚑ canonical equality kills the substring accidents', () => {
  it('targeting the US no longer matches Australia, Austria, Belarus, Cyprus or Mauritius', () => {
    // Every one of these is literally `country.toLowerCase().includes('us')`.
    for (const wrong of ['Australia', 'Austria', 'Belarus', 'Cyprus', 'Mauritius']) {
      expect(wrong.toLowerCase().includes('us'), `${wrong} really does contain "us"`).toBe(true)
      expect(poolCountryMatches(wrong, ['US']), wrong).toBe(false)
      expect(poolCountryMatches(wrong, ['United States']), wrong).toBe(false)
    }
  })

  it('targeting the UK no longer matches Ukraine', () => {
    expect('ukraine'.includes('uk')).toBe(true)
    expect(poolCountryMatches('Ukraine', ['UK'])).toBe(false)
    expect(poolCountryMatches('Ukraine', ['United Kingdom'])).toBe(false)
  })

  it('targeting Ireland no longer swallows Northern Ireland (which is a UK row)', () => {
    expect('northern ireland'.includes('ireland')).toBe(true)
    expect(poolCountryMatches('Northern Ireland', ['Ireland'])).toBe(false)
    expect(poolCountryMatches('Northern Ireland', ['United Kingdom'])).toBe(true)
  })

  it('and the real country still matches, by every spelling it may be stored under', () => {
    for (const stored of ['US', 'usa', 'U.S.', 'United States', 'united states of america']) {
      expect(poolCountryMatches(stored, ['United States']), stored).toBe(true)
    }
    for (const stored of ['GB', 'uk', 'England', 'Wales', 'Great Britain', 'United Kingdom']) {
      expect(poolCountryMatches(stored, ['United Kingdom']), stored).toBe(true)
    }
  })
})

// ── 9–13 · SERVING BEHAVIOUR THROUGH THE REAL MATCHER ────────────────────────────────────
describe('EXECUTED · geography-targeted serving', () => {
  const UK_ICP = { geographies: ['United Kingdom'], job_titles: ['Head of Sales'] }

  it('⑬ title-relevant + correct country → SERVED', () => {
    expect(poolRecordMatchesIcp(rec({ country: 'GB', title: 'Head of Sales' }), UK_ICP)).toBe(true)
  })

  it('⑪ title-relevant + WRONG country → NOT served', () => {
    expect(poolRecordMatchesIcp(rec({ country: 'Ukraine', title: 'Head of Sales' }), UK_ICP)).toBe(false)
    expect(poolRecordMatchesIcp(rec({ country: 'United States', title: 'Head of Sales' }), UK_ICP)).toBe(false)
  })

  it('⑫ title-relevant + NULL country → NOT served. This is the production case exactly', () => {
    // The 18 title hits among the 85 rows. Every one of them looks like this.
    for (const c of [null, undefined, '', '  ']) {
      expect(poolRecordMatchesIcp(rec({ country: c, title: 'Head of Sales' }), UK_ICP), String(c)).toBe(false)
    }
  })

  it('⑨ a multi-geography proof serves ONLY the countries named', () => {
    const icp = { geographies: ['United States', 'United Kingdom'], job_titles: ['CEO'] }
    expect(poolRecordMatchesIcp(rec({ country: 'US', title: 'CEO' }), icp)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ country: 'England', title: 'CEO' }), icp)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ country: 'South Africa', title: 'CEO' }), icp)).toBe(false)
    expect(poolRecordMatchesIcp(rec({ country: 'Australia', title: 'CEO' }), icp)).toBe(false)
  })

  it('⑩ a geo-UNCONSTRAINED proof is unchanged — a null-country row still matches on role', () => {
    // Existing product behaviour, deliberately preserved: with no geography named there is
    // no geography to fail, so the row qualifies on its role signal exactly as before.
    expect(poolRecordMatchesIcp(rec({ country: null, title: 'CEO' }), { job_titles: ['CEO'] })).toBe(true)
  })

  it('a null country is never a wildcard — not for one geography, not for many', () => {
    expect(poolCountryMatches(null, ['United States'])).toBe(false)
    expect(poolCountryMatches(null, ['United States', 'United Kingdom', 'South Africa'])).toBe(false)
    expect(poolCountryMatches('', [])).toBe(false)
  })

  // ⛓️ RETARGETED 10 Sep (C02) — `OR` BECAME `AND`. The three arms no longer rescue each
  // other: every stated criterion must hold. The duty this case actually defends — that the
  // ROLE decision is real and a barista is refused — is unchanged and asserted last.
  it('🛑 the OR across title / industry / seniority is GONE — all of them must hold', () => {
    const icp = { geographies: ['United Kingdom'], job_titles: ['CTO'], industries: ['SaaS'], seniority_levels: ['cxo'] }
    // Everything they asked for → reused.
    expect(poolRecordMatchesIcp(rec({ country: 'UK', title: 'CTO', industry: 'SaaS' }), icp)).toBe(true)
    // ── ⛓️ 22 Sep — INDUSTRY MOVED OUT OF "ALL OF THEM MUST HOLD" ────────────────────
    //
    // ⛓️ WAS: ~~`industry: 'Hospitality'` → `toBe(false)`~~, alongside title and seniority.
    //
    // 🛑 THE CLIENT'S CATEGORY NO LONGER REMOVES ANYBODY, on the provider path or this one —
    // judging their own words against a vocabulary we invented is what emptied the Proof
    // screen, and the founder ruled the pool must match Apollo. What this test is really
    // about is that the OLD `containsAny` OR-generosity is gone, and that is unchanged: title
    // and seniority below still each refuse on their own.
    //
    // ⚠️ THE VERDICT IS STILL `no`. Only its CONSEQUENCE changed: ranked to the bottom of the
    // client's list instead of never reaching it.
    expect(poolRecordMatchesIcp(rec({ country: 'UK', title: 'CTO', industry: 'Hospitality' }), icp)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ country: 'UK', title: 'Barista', industry: 'SaaS', seniority: 'entry' }), icp)).toBe(false)
    expect(poolRecordMatchesIcp(rec({ country: 'UK', title: 'Barista' }), icp)).toBe(false)
  })

  it('titles stay SUBSTRING — only country became exact', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'United Kingdom', title: 'Global Head of Sales, EMEA' }),
      { geographies: ['United Kingdom'], job_titles: ['Head of Sales'] },
    )).toBe(true)
  })
})

// ── ⚑ THE ROUND TRIP — provider value → stored pool row → geography-targeted serve ──────
describe('⚑ EXECUTED · round trip, and the exact behaviour it replaces', () => {
  /** The mapping the route performs when building a pool row (icps.ts, guarded by ⑭). */
  const poolRowFrom = (providerCountry: string | null): PoolRecord => ({
    email_norm: 'x@y.com',
    title: 'Head of Sales',
    country: canonicalPoolCountry(providerCountry) || null,
  })

  /** The country test EXACTLY as it stood before 27 Aug — inlined so the comparison cannot
   *  rot into a description of a defect nobody can run any more. */
  const OLD_countryTest = (stored: string | null, geos: string[]) =>
    !!stored && geos.some(g => stored.toLowerCase().includes(g.toLowerCase()))

  const UK = ['United Kingdom']

  it('a provider record that says GB is STORED as one canonical country', () => {
    expect(poolRowFrom('GB').country).toBe('united kingdom')
    expect(poolRowFrom('England').country).toBe('united kingdom')
    expect(poolRowFrom('United Kingdom').country).toBe('united kingdom')
  })

  it('OLD: owned, title-relevant, in the right country — and served ZERO', () => {
    expect(OLD_countryTest('GB', UK)).toBe(false)
    expect(OLD_countryTest('England', UK)).toBe(false)
  })

  it('NEW: the same record serves', () => {
    for (const provider of ['GB', 'England', 'uk', 'United Kingdom']) {
      const row = poolRowFrom(provider)
      expect(poolRecordMatchesIcp(row, { geographies: UK, job_titles: ['Head of Sales'] }), provider).toBe(true)
    }
  })

  it('OLD: a US target also swept up Australia — NEW does not', () => {
    expect(OLD_countryTest('Australia', ['US'])).toBe(true)
    expect(poolCountryMatches('Australia', ['US'])).toBe(false)
  })

  it('a provider record with NO country stores NULL and serves nothing geo-targeted', () => {
    const row = poolRowFrom(null)
    expect(row.country).toBeNull()
    expect(isGeoServable(row)).toBe(false)
    expect(poolRecordMatchesIcp(row, { geographies: UK, job_titles: ['Head of Sales'] })).toBe(false)
    // …and this is what all 85 production rows look like. The fix cannot invent their country.
  })
})

// ── THE CANDIDATE-QUERY EXPANSION — the other half of "owned but invisible" ──────────────
describe('candidate expansion — the database is asked for every spelling', () => {
  it('one geography expands to its whole alias group', () => {
    const uk = launchCountrySpellings('United Kingdom')
    for (const s of ['gb', 'uk', 'england', 'scotland', 'wales', 'northern ireland', 'great britain']) {
      expect(uk, s).toContain(s)
    }
    const us = launchCountrySpellings('US')
    for (const s of ['us', 'usa', 'united states', 'america']) expect(us, s).toContain(s)
  })

  it('an unrecognised geography returns itself — never an empty filter', () => {
    expect(launchCountrySpellings('Nigeria')).toEqual(['nigeria'])
    expect(launchCountrySpellings('')).toEqual([])
    expect(launchCountrySpellings(null)).toEqual([])
  })

  it('⚑ the route builds its country filter from the EXPANSION, not the raw term', () => {
    const src = codeOnly(poolSurface())
    expect(src).toContain('launchCountrySpellings')
    expect(src).toMatch(/geoTerms\.map\(g => `country\.ilike/)
    // and the un-expanded form is gone
    expect(src).not.toMatch(/geos\.map\(g => `country\.ilike/)
  })

  it('⚑ the route makes the PRECISE country decision in JS after the widened query', () => {
    const src = codeOnly(poolSurface())
    expect(src).toContain('poolCountryMatches(c.country, geos)')
  })
})

// ── 7–8 · NON-NULL PRESERVATION, AND THE ONE-DIRECTION HEAL ─────────────────────────────
describe('⑦⑧ upsert semantics — good country protected, null country healable', () => {
  it('⑦ the pool write is ON CONFLICT DO NOTHING, so a later null can never erase a country', () => {
    const src = codeOnly(poolSurface())
    expect(src).toContain("upsert(poolEligible, { onConflict: 'email_norm', ignoreDuplicates: true })")
  })

  it('⑧ the heal fills ONLY where country is null — the WHERE clause is the safety', () => {
    const src = codeOnly(poolSurface())
    // .is('country', null) is what makes overwriting structurally impossible.
    expect(src).toMatch(/\.update\(\{ country \}\)\.in\('email_norm', emails\)\.is\('country', null\)/)
  })

  it('the heal touches country and nothing else — not a general merge', () => {
    const src = codeOnly(poolSurface())
    const heal = src.slice(src.indexOf('const byCountry'), src.indexOf('const byCountry') + 900)
    for (const col of ['title', 'industry', 'seniority', 'company', 'linkedin_url', 'acquisition_cost']) {
      expect(heal.includes(`.update({ ${col}`), col).toBe(false)
    }
  })

  it('a batch with no usable country produces no heal statement at all', () => {
    // The grouping skips empty countries, so an all-null batch yields an empty map.
    const batch = [{ email_norm: 'a@b.com', country: null }, { email_norm: 'c@d.com', country: '' }]
    const byCountry = new Map<string, string[]>()
    for (const r of batch) {
      const country = typeof r.country === 'string' ? r.country : ''
      if (!country) continue
      byCountry.set(country, [...(byCountry.get(country) ?? []), r.email_norm])
    }
    expect(byCountry.size).toBe(0)
  })
})

// ── 14–15 · EVERY REAL PRODUCTION WRITER ────────────────────────────────────────────────
describe('⑭⑮ every writer to lead_pool preserves country', () => {
  it('⑭ WRITER A — the runtime PDL path canonicalises country into the pool row', () => {
    const src = codeOnly(poolSurface())
    // ⛓️ 15 Sep (AR20) — `provenCountry`, not `contact.country`: the country this run actually
    // ESTABLISHED, from the search (PDL) or the Proof qualification lookup (Apollo, which
    // supplies none at search). The invariant is unchanged — one canonical form into the pool,
    // and '' still stays NULL — but a country we proved is no longer discarded on write.
    expect(src).toContain('canonicalPoolCountry(provenCountry) || null')
    // '' must never be stored: a present-looking value that matches nothing is worse than null.
    expect(src).not.toMatch(/country:\s*canonicalPoolCountry\(contact\.country\),/)
  })

  it('⑮ WRITER B — the migration backfill maps leads.country → lead_pool.country', () => {
    const sql = readRepo('supabase/migrations/20260712_lead_pool.sql')
    const insert = sql.slice(sql.indexOf('INSERT INTO public.lead_pool'))
    expect(insert).toMatch(/country,/)
    expect(insert).toMatch(/l\.country,/)
  })

  it('⑮ WRITER C — the Apollo promotion script maps leads.country → lead_pool.country', () => {
    const sql = readRepo('supabase/maintenance/2026-07-11_promote_apollo_to_pool.sql')
    const insert = sql.slice(sql.indexOf('insert into public.lead_pool'))
    expect(insert).toMatch(/country,/)
    expect(insert).toMatch(/l\.country,/)
    // Both SQL writers are ON CONFLICT DO NOTHING too — same non-clobber guarantee.
    expect(insert).toMatch(/on conflict \(email_norm\) do nothing/i)
  })

  it('⚑ THE WRITER MATRIX IS CLOSED — a fourth writer must be added to this test', () => {
    // A new pool writer that nobody teaches about country is exactly how the 85 rows happened.
    const ts = ['apps/api/src/routes/icps.ts', 'apps/api/src/lib/pool-sourcing.ts']
      .map(readRepo).join('\n')
    const writes = [...codeOnly(ts).matchAll(/from\('lead_pool'\)\s*\n?\s*\.(insert|upsert|update)/g)]
    // icps.ts: one upsert (the pool write) + one update (the null-only country heal).
    expect(writes.map(m => m[1]).sort()).toEqual(['update', 'upsert'])
  })
})

// ── OBSERVABILITY — the silence is what cost the launch day ─────────────────────────────
describe('observability — a country-starved pool now says so', () => {
  it('the write path counts records with and without a usable country', () => {
    const src = codeOnly(poolSurface())
    expect(src).toContain('stage=pool_write')
    expect(src).toContain('isGeoServable(r)')
  })

  it('a geo-gated serve that discards country-less candidates names the count', () => {
    const src = codeOnly(poolSurface())
    expect(src).toContain('stage=pool_country_missing')
    expect(src).toContain('notGeoServable')
  })

  it('neither diagnostic can carry PII', () => {
    const src = poolSurface()
    for (const stage of ['stage=pool_write', 'stage=pool_country_missing']) {
      const at = src.indexOf(stage)
      expect(at, stage).toBeGreaterThan(0)
      const line = src.slice(src.lastIndexOf('\n', at), src.indexOf('\n', at + 200))
      for (const pii of ['email', 'first_name', 'last_name', 'linkedin', 'email_norm']) {
        expect(line.includes(pii), `${stage} must not log ${pii}`).toBe(false)
      }
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (launch gate) — CANDIDATE-WINDOW STARVATION. The pool candidate query is
// BOUNDED (`.limit(max(cap*5, 50))`), which turns a loose prefilter into a starvation
// channel: every false row a substring pattern admits can push a genuine target row OUT of
// the window before the JS filter ever sees it. "JS filters them later" is no defence once
// the database has capped the list. The fix is exact-per-spelling matching AT the query —
// these tests simulate both query shapes under PostgREST's own `ilike` semantics and prove
// the bounded window cannot be eaten by substring impostors.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⚑ bounded candidate window cannot be starved by substring impostors', () => {
  /** PostgREST `ilike` semantics: `*` → SQL %, case-insensitive; NO `*` → exact match. */
  const pgIlike = (value: string, pattern: string): boolean => {
    const v = value.toLowerCase()
    const p = pattern.toLowerCase()
    if (!p.includes('*')) return v === p
    const re = new RegExp('^' + p.split('*').map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*') + '$')
    return re.test(v)
  }
  /** The DB-side prefilter: first N rows whose country matches ANY pattern — a faithful
   *  model of `.or(patterns).limit(n)` over a table scanned in storage order. */
  const dbWindow = (rows: { country: string }[], patterns: string[], limit: number) =>
    rows.filter(r => patterns.some(p => pgIlike(r.country, p))).slice(0, limit)

  // 250 substring impostors FIRST in storage order, the 10 genuine targets AFTER them —
  // the exact layout that starves a bounded window under a loose prefilter.
  const impostors = ['Australia', 'Austria', 'Belarus', 'Cyprus', 'Mauritius', 'Ukraine']
  const table = [
    ...Array.from({ length: 250 }, (_, i) => ({ country: impostors[i % impostors.length], row: `impostor-${i}` })),
    ...Array.from({ length: 5 }, (_, i) => ({ country: 'United States', row: `us-${i}` })),
    ...Array.from({ length: 5 }, (_, i) => ({ country: 'GB', row: `uk-${i}` })),
  ]
  const LIMIT = 100   // cap 20 → max(20*5, 50) = 100, the real proof-run window

  const oldPatterns = (geos: string[]) => geos.map(g => `*${g}*`)                       // pre-fix
  const newPatterns = (geos: string[]) => [...new Set(geos.flatMap(g => launchCountrySpellings(g)))] // post-fix

  it('OLD (substring): a US+UK target fills the 100-row window with 100 impostors — zero real rows reachable', () => {
    const window = dbWindow(table, oldPatterns(['us', 'uk']), LIMIT)
    expect(window).toHaveLength(LIMIT)
    expect(window.every(r => impostors.includes(r.country)), 'the whole window is impostors').toBe(true)
    // …and the JS canonical filter, however correct, can only work on what arrived:
    expect(window.filter(r => poolCountryMatches(r.country, ['United States', 'United Kingdom']))).toHaveLength(0)
  })

  it('⚑ NEW (exact per spelling): the same window admits ONLY real target rows — all 10 reachable', () => {
    const window = dbWindow(table, newPatterns(['United States', 'United Kingdom']), LIMIT)
    expect(window, 'no impostor can enter — exact match admits no substring').toHaveLength(10)
    expect(window.filter(r => poolCountryMatches(r.country, ['United States', 'United Kingdom']))).toHaveLength(10)
  })

  it('NEW: client-typed aliases behave identically ("us", "uk" → same exact spellings)', () => {
    const window = dbWindow(table, newPatterns(['us', 'uk']), LIMIT)
    expect(window).toHaveLength(10)
  })

  it('⚑ the route’s country patterns carry NO wildcard — exact per spelling, at the source', () => {
    const src = codeOnly(poolSurface())
    expect(src).toMatch(/geoTerms\.map\(g => `country\.ilike\.\$\{g\}`\)/)
    expect(src, 'the substring form must never return').not.toMatch(/country\.ilike\.\*/)
  })

  it('role terms deliberately KEEP their wildcards — titles are genuinely partial', () => {
    const src = codeOnly(poolSurface())
    expect(src).toMatch(/title\.ilike\.\*\$\{t\}\*/)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug — THE LIVE-PROVIDER GATE IS WIRED, AND THE APOLLO BOUNDARY IS LOUD.
// The EXECUTED proof lives in proof-provider-off.test.ts (real runIcpJob, provider country
// varied). These pin the wiring so neither can be deleted without a red.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('the hard geography invariant is wired at both boundaries', () => {
  it('the provider insert loop gates on the SAME canonical predicate as the pool', () => {
    const src = codeOnly(poolSurface())
    // ⛓️ 15 Sep (AR20) — same predicate, same boundary, now fed the PROVEN country.
    expect(src).toContain('!poolCountryMatches(provenCountry, icpGeographies)')
    expect(src).toContain('removedByGeoGate++')
  })

  it('a geo-rejected batch is a counted, PII-free diagnostic', () => {
    const src = codeOnly(poolSurface())
    expect(src).toContain('stage=provider_geo_rejected')
  })

  afterEach(() => { vi.restoreAllMocks() })

  it('⚑ EXECUTED · the Apollo tripwire actually FIRES on a parsed response missing country', async () => {
    // Behavioural, not textual — a silenced tripwire (`if (false && …)`) keeps every source
    // string and still tells nobody. So this drives the REAL `searchPeople` against a mocked
    // `fetch` (no network: vitest.setup deletes real keys, and the body here is local) whose
    // 200 body carries a contact with NO country property — the exact Apollo-cast shape —
    // and requires the diagnostic to be EMITTED.
    const savedKey = process.env.APOLLO_API_KEY
    process.env.APOLLO_API_KEY = 'test-key-fetch-is-mocked'
    const warns: string[] = []
    vi.spyOn(console, 'warn').mockImplementation((...a: unknown[]) => { warns.push(a.map(String).join(' ')) })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({
      contacts: [{ id: 'x1', first_name: 'A', last_name: 'B', title: 'CEO' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    try {
      const { searchPeople } = await import('./apollo')
      const out = await searchPeople({ page: 1, per_page: 1 })
      expect(out, 'the contact itself still returns — the boundary reports, it does not drop').toHaveLength(1)
      expect(warns.some(w => w.includes('stage=provider_geo_missing')),
        'the geo-missing diagnostic must be EMITTED, not merely present in source').toBe(true)
    } finally {
      if (savedKey === undefined) delete process.env.APOLLO_API_KEY
      else process.env.APOLLO_API_KEY = savedKey
    }
  })

  it('the Apollo ingestion boundary counts contacts arriving without a usable country', () => {
    const src = codeOnly(readRepo('apps/api/src/lib/apollo.ts'))
    expect(src).toContain('stage=provider_geo_missing')
    // and it must NOT invent a field mapping: the search result is still returned as the
    // provider handed it (`data.contacts ?? data.people`), with no remapped country — the
    // real Apollo person→country field is UNPROVEN in this repo, and a guessed remap would
    // be a second silent miss wearing a fix. (`person_locations` in the REQUEST body is the
    // query filter and is untouched by this rule.)
    expect(src).toContain('const list = data.contacts ?? data.people ?? []')
    expect(src).toContain('return list')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (R73) — THE RIGHTS CLASSIFIER AND THE PROMOTION TOOL'S FAIL-CLOSED BUCKETS.
// Founder ruling, verbatim: "all client data we own. including apollo data can be used as
// a source for clients too. it is data we own." — K.I.N.D-ACQUIRED data pools; customer/
// inbound stays out unless separately ruled; unknown provenance fails closed.
// ═══════════════════════════════════════════════════════════════════════════════════════
import {
  classifyLeadRights, rightsAllowPooling, CUSTOMER_INBOUND_SOURCES, KIND_ACQUIRED_SOURCES,
  POOL_ELIGIBLE_SOURCES,
} from './pool-sourcing'

describe('R73 · the rights classifier — one answer to "whose data is this row?"', () => {
  it('K.I.N.D-acquired sources classify as kind_acquired and may pool', () => {
    for (const src of ['pdl', 'apollo', 'lookalike']) {
      expect(classifyLeadRights(src, null), src).toBe('kind_acquired')
      expect(rightsAllowPooling(classifyLeadRights(src, null)), src).toBe(true)
    }
    // ⛓️ corrected 27 Aug (evidence pass): a bare provider id is NOT proof — the manual
    // POST /leads schema accepts apollo_id and stamps no source, so an untagged row with an
    // id could be customer-created. Uncorroborated → unknown, fail closed.
    expect(classifyLeadRights(null, 'pdl_abc123')).toBe('unknown')
    // With corroboration (house book / unique memory provenance) it IS kind_acquired:
    expect(classifyLeadRights(null, 'pdl_abc123', false, true)).toBe('kind_acquired')
  })

  it('⚠️ every customer/inbound source is customer_inbound and may NEVER pool', () => {
    for (const src of ['csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding']) {
      expect(classifyLeadRights(src, null), src).toBe('customer_inbound')
      expect(rightsAllowPooling(classifyLeadRights(src, null)), src).toBe(false)
      // …even when the row carries a provider id (a customer CSV of Apollo exports is
      // still the CUSTOMER'S upload — the tag wins over the id):
      expect(classifyLeadRights(src, 'apollo_x1'), `${src}+id`).toBe('customer_inbound')
    }
  })

  it('a pool-served copy is not new inventory', () => {
    expect(classifyLeadRights(null, null, true)).toBe('pool_served_copy')
    expect(rightsAllowPooling('pool_served_copy')).toBe(false)
  })

  it('⚠️ unknown FAILS CLOSED — no source, no provider id, not pooled → never promoted', () => {
    expect(classifyLeadRights(null, null, false)).toBe('unknown')
    expect(classifyLeadRights('mystery_source', null)).toBe('unknown')
    expect(classifyLeadRights('   ', null)).toBe('unknown')
    for (const b of ['unknown', 'customer_inbound', 'pool_served_copy'] as const) {
      expect(rightsAllowPooling(b), b).toBe(false)
    }
  })

  it('the classifier and the write allowlist cannot drift apart', () => {
    // Every pool-eligible source must classify as kind_acquired, and no customer source
    // may ever appear in the allowlist — the two constants describe one boundary.
    for (const src of POOL_ELIGIBLE_SOURCES) {
      expect(classifyLeadRights(src, null), src).toBe('kind_acquired')
    }
    for (const src of CUSTOMER_INBOUND_SOURCES) {
      expect([...POOL_ELIGIBLE_SOURCES]).not.toContain(src)
      expect([...KIND_ACQUIRED_SOURCES]).not.toContain(src)
    }
  })

  it('the customer-source list names the tags the real writers actually stamp', () => {
    // Each entry must correspond to a literal a production writer uses — a list of made-up
    // names would guard nothing. Verified against the writer files.
    const writers: Record<string, string> = {
      csv_import:       'apps/api/src/lib/lead-import.ts',
      web_form:         'apps/api/src/routes/forms.ts',
      company_csv:      'apps/api/src/routes/leads.ts',
      vida_chat:        'apps/api/src/lib/vida.ts',
      milla_onboarding: 'apps/api/src/routes/icps.ts',
    }
    for (const [tag, file] of Object.entries(writers)) {
      expect(readRepo(file).includes(`'${tag}'`), `${tag} in ${file}`).toBe(true)
    }
  })
})

describe('R73 · the promotion tool cannot auto-run and cannot sweep customer data', () => {
  const TOOL = 'supabase/maintenance/2026-08-27_kind_acquired_pool_promotion.sql'

  it('⚑ PHASE B is NOT wired into the migration runner — it cannot run on deploy', () => {
    const runner = readRepo('apps/api/src/lib/pending-migrations.ts')
    expect(runner.includes('kind_acquired_pool_promotion'), 'no runner entry may ever exist').toBe(false)
    // and it lives in maintenance/, not migrations/ — the runner's home directory:
    expect(TOOL).toContain('supabase/maintenance/')
  })

  it('the old indiscriminate backfill shape is not reused — the tool classifies rights', () => {
    const sql = readRepo(TOOL)
    // customer/inbound excluded BY NAME, in the candidate WHERE clause:
    for (const src of ['csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding']) {
      expect(sql.includes(src), `${src} must be explicitly excluded`).toBe(true)
    }
    // never overwrites an existing pooled record:
    expect(sql.toLowerCase()).toContain('on conflict (email_norm) do nothing')
    // the heal is fill-only:
    expect(sql).toContain("coalesce(btrim(p.country),'') = ''")
  })

  it('⚑ NO LIMIT 1, and NO arbitrary identity/cost/country pick anywhere', () => {
    // comment-stripped (the header SAYS "no limit 1", and "limit 100" contains the substring)
    const sql = codeOnly(readRepo(TOOL)).toLowerCase()
    expect(/limit\s+1\b/.test(sql), 'an arbitrary pick violates fail-closed').toBe(false)
    // ⛓️ resolver-alignment pass: min(provider_id) was the surviving arbitrary choice — one
    // email can carry SEVERAL acquisitions from the same provider, so it silently picked one
    // and then resolved cost against that choice.
    expect(sql.includes('min(provider_id)'), 'acquisition identity must never be chosen').toBe(false)
    expect(sql.includes('max(provider_id)')).toBe(false)
    // the memory arm demands EXACTLY ONE distinct eligible provider, bound to the identity:
    expect(sql).toContain('count(distinct lower(btrim(am.source))) = 1')
    expect(sql).toContain("lower(btrim(am.source)) in ('pdl','apollo')")
    expect(sql).toContain('am.provider_id = l.apollo_id')
    // cost: exactly-one-distinct, never MIN-as-truth:
    expect(sql).toContain('count(distinct am.acquisition_cost_usd) = 1')
  })

  it('⚑ THE ACQUISITION IDENTITY IS (provider, provider_id) — mirrored from promotion-resolver.ts', () => {
    const sql = codeOnly(readRepo(TOOL))
    expect(sql).toContain("rr.provider || ':' || rr.provider_id")
    expect(sql).toContain("rr.provider || ':house:' || rr.email_norm")
    expect(sql, 'grouping is by the acquisition, not the email').toContain('group by acquisition_key, email_norm')
  })

  it('⚑ UNRESOLVED AND CUSTOMER ROWS ARE DROPPED BEFORE GROUPING — no metadata leak', () => {
    const sql = codeOnly(readRepo(TOOL))
    const owned = sql.slice(sql.indexOf('), owned_rows as ('), sql.indexOf('), acquisition as ('))
    expect(owned).toContain("rr.provider in ('pdl','apollo')")
    expect(owned).toContain('not rr.is_customer_row')
    expect(owned, 'and only rows with a bindable identity').toContain('rr.provider_id is not null or rr.is_house')
    // the metadata aggregation happens AFTER that filter, over `owned_rows` only
    expect(sql.indexOf('), owned_rows as (')).toBeLessThan(sql.indexOf('array_agg(first_name'))
    expect(sql.slice(sql.indexOf('), acquisition as ('))).toContain('from owned_rows')
  })

  it('⚑ COST: ambiguity beats the house-zero default, in the SQL not only the prose', () => {
    const sql = codeOnly(readRepo(TOOL))
    expect(sql).toContain('(c.distinct_costs > 1)')
    // the house-zero arm is reachable ONLY when there are zero recorded costs:
    expect(sql).toContain("when c.distinct_costs = 0 and c.provider = 'apollo' and c.is_house then 0")
    // and the executable set excludes ambiguity outright:
    expect(sql).toContain('not cl.cost_ambiguous')
    expect(sql).toContain('not cl.cost_unprovable')
  })

  it('⚑ COUNTRY: canonicalised BEFORE distinctness, and a conflict is never resolved', () => {
    const sql = codeOnly(readRepo(TOOL))
    expect(sql).toContain('count(distinct canon_country)')
    expect(sql, 'raw-string country counting is the defect').not.toContain('count(distinct lower(btrim(l.country)))')
    expect(sql).toContain('case when c.distinct_countries = 1 then c.one_country end')
  })

  it('⚑ PHASE A PREDICTS PHASE B — one `executable` CTE, and Phase B inserts exactly it', () => {
    const raw = readRepo(TOOL)
    const sql = codeOnly(raw)
    // the canonical resolver opens every statement that classifies: A1 · A1b · A2 · A3 ·
    // Phase B insert · Phase B2 heal — repeated verbatim so each is pasteable alone.
    const copies = sql.split('), executable as (').length - 1
    expect(copies, 'A1 · A1b · A2 · A3 · Phase B · Phase B2').toBe(6)
    // and every copy is byte-identical — one truth, not six dialects.
    // ⚠️ THE SLICE END MATTERS. A first version cut at the first `)\n`, which lands inside
    // the canon CTE — it compared a ~6-line prefix and passed happily while a later line
    // drifted. Sliced to the END of the resolver instead (its closing `)` after the
    // `executable` CTE), so the whole block is compared.
    const MARK = 'with canon as ('
    const blocks = raw.split(MARK).slice(1).map(b => {
      const end = b.indexOf('), executable as (')
      expect(end, 'every resolver copy must contain the executable CTE').toBeGreaterThan(0)
      return b.slice(0, b.indexOf('\n)', end) + 2)
    })
    expect(blocks.every(b => b.length > 3000), 'the compared block must be the whole resolver').toBe(true)
    expect(new Set(blocks).size, 'the resolver copies must not drift apart').toBe(1)
    // Phase B's insert selects FROM the executable set, with no extra WHERE of its own
    const insert = sql.slice(sql.indexOf('insert into public.lead_pool'))
    expect(insert).toContain('from executable e')
    expect(insert).toContain('on conflict (email_norm) do nothing')
    expect(insert.slice(0, insert.indexOf('on conflict')),
      'no second WHERE may narrow or widen the set A1b counted').not.toContain('where')
  })

  it('⚑ B2 HEAL cannot be fooled by ambiguity hidden behind a NULL country', () => {
    const sql = codeOnly(readRepo(TOOL))
    const heal = sql.slice(sql.indexOf('one_answer as ('))
    // NOTHING is filtered out before the check — the old `where resolved_country is not null`
    // dropped internally-ambiguous acquisitions and let the survivors heal.
    // ⚠️ targeted at a STANDALONE `where` line — `count(*) filter (where resolved_country is
    // not null)` legitimately contains the same words, and a bare not.toContain matched it.
    expect(/\n\s*where resolved_country is not null/.test(heal),
      'a pre-filter would hide the ambiguity').toBe(false)
    expect(heal).toContain('count(*) filter (where resolved_country is not null) > 0')
    expect(heal, 'any ambiguous acquisition blocks the heal').toContain('count(*) filter (where country_ambiguous) = 0')
    expect(heal, 'and the survivors must agree exactly').toContain('count(distinct resolved_country) = 1')
  })

  it('⚑ B2 HEAL respects R73 on the TARGET pool row too', () => {
    const heal = codeOnly(readRepo(TOOL))
    const upd = heal.slice(heal.indexOf('update public.lead_pool p'))
    expect(upd, 'a legacy/customer/untagged pooled row is not ours to enrich')
      .toContain("p.source in ('pdl','apollo')")
    expect(upd, 'fill only').toContain("coalesce(btrim(p.country),'') = ''")
  })

  it('⚑ ROLE METADATA: the representative skips blanks, and has_role describes it', () => {
    const sql = codeOnly(readRepo(TOOL))
    for (const col of ['job_title', 'industry', 'seniority', 'company', 'first_name']) {
      expect(sql, `${col} must skip blank values`)
        .toContain(`filter (where coalesce(btrim(${col}),'')`)
    }
    // has_role is computed in `costed`, FROM the resolved representative fields (a.job_title
    // etc.), not from "any row in the acquisition had one".
    expect(sql).toContain("(coalesce(btrim(a.job_title),'') <> '' or coalesce(btrim(a.industry),'') <> ''")
    expect(sql, 'the old any-row form must be gone')
      .not.toContain("bool_or(coalesce(btrim(job_title),'') <> ''")
  })

  it('⚑ A1 says WHY an identity was excluded — customer vs unprovable are different facts', () => {
    const sql = codeOnly(readRepo(TOOL))
    for (const st of ['customer_only_excluded', 'unknown_only_excluded',
                      'customer_and_unknown_excluded']) {
      expect(sql, st).toContain(st)
    }
    expect(sql, 'the collapsed state is gone').not.toContain('no_owned_acquisition_excluded')
    // and the facts come from ALL rows of the email, not only the owned acquisitions
    expect(sql).toContain('), email_rows as (')
    expect(sql).toContain('from resolved_rows group by email_norm')
  })

  it('⚑ NO arbitrary acquisition selector exists — not even as dead code', () => {
    const sql = codeOnly(readRepo(TOOL)).toLowerCase()
    expect(sql.includes('min(acquisition_key)'), 'dead code is what a later edit reaches for').toBe(false)
    expect(sql.includes('max(acquisition_key)')).toBe(false)
    expect(sql.includes('only_key')).toBe(false)
  })

  it('⚑ A1b reports exact counts, not a fabricated upper bound', () => {
    const sql = codeOnly(readRepo(TOOL))
    for (const col of ['current_eligible_pool_identities', 'executable_promotion_identities',
                       'projected_pool_after_phase_b']) {
      expect(sql, col).toContain(col)
    }
  })

  it('the corrected audit terminology: progressive gates, never an absolute servability claim', () => {
    const sql = readRepo(TOOL)
    for (const col of ['already_in_pool', 'customer_only_excluded', 'unknown_only_excluded',
                       'customer_and_unknown_excluded', 'acquisition_identity_ambiguous', 'cost_ambiguous', 'cost_unprovable',
                       'metadata_incomplete', 'executable_promotion',
                       'acquisition_identity_proven', 'metadata_complete', 'country_single',
                       'country_missing', 'country_ambiguous', 'cost_proven',
                       'house_zero_accepted', 'kind_acquired_proven', 'canonical_geo_match',
                       'role_match', 'after_opt_out_blocklist',
                       'after_sql_visible_suppression_floor', 'after_existing_client_dedupe',
                       'after_sql_visible_runtime_gates']) {
      expect(sql, col).toContain(col)
    }
    // ⛓️ renamed on the merge-gate pass: the old name implied Phase B would take the row,
    // but Phase B also demands a provable, unambiguous cost.
    // ⚠️ COMMENT-STRIPPED — the file's own note EXPLAINING the rename contains the old name,
    // and a guard satisfied by the prose that explains it is the recurring defect here.
    const code = codeOnly(readRepo(TOOL))
    for (const stale of ['safely_promotable_now', 'promotable_not_in_pool',
                         'likely_runtime_servable_estimate',
                         'projected_after_promotion_upper_bound']) {
      expect(code, `${stale} over-claims and must not survive`).not.toContain(stale)
    }
    // the stated caveat about the env-only suppression additions:
    expect(sql).toContain('SUPPRESSED_DOMAINS')
  })

  it('⚑ the unsafe 27-Aug country backfill is RETIRED and nothing points to it', () => {
    // Under R73 public.leads holds BOTH K.I.N.D-acquired and customer data, and the old
    // backfill drew country evidence from ALL of it — a customer/inbound row sharing an
    // email with a pooled identity could contribute the geography. Retired outright; the
    // rights-bounded heal inside the promotion tool is the only country-fill path now.
    expect(existsSync(join(__dirname, '../../../..', 'supabase/maintenance/2026-08-27_lead_pool_country_backfill.sql')))
      .toBe(false)
    expect(poolSurface()).not.toContain('lead_pool_country_backfill')
    // and the replacement heal draws country ONLY from the canonical resolver's proven
    // acquisitions — customer/inbound rows never reach `classified`, so they cannot supply a
    // geography at all. (Stronger than the old string filter: it is structural.)
    const sql = codeOnly(readRepo(TOOL))
    const heal = sql.slice(sql.indexOf('one_answer as ('))
    expect(heal, 'the heal reads the resolver, not raw leads').toContain('from classified')
    // ⛓️ the HAVING became three clauses on the final pass (something to say · nothing
    // hidden · they agree); the country-agreement clause is now `and count(distinct …)`.
    expect(heal, 'and only where exactly one proven country exists')
      .toContain('count(distinct resolved_country) = 1')
    expect(heal, 'fill only — never overwrite').toContain("coalesce(btrim(p.country),'') = ''")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (evidence pass) — THE DETERMINISTIC HISTORICAL PROVIDER RESOLVER.
// The SQL mirrors this function clause for clause; the text guards above tie them together.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { resolveHistoricalProvider } from './pool-sourcing'

describe('resolveHistoricalProvider — deterministic, never a pick', () => {
  it('A · a customer/inbound tag resolves to NOTHING, whatever else is true', () => {
    for (const src of ['csv_import', 'web_form', 'company_csv', 'vida_chat', 'milla_onboarding']) {
      expect(resolveHistoricalProvider({ source: src, isHouseAccount: true, memorySources: ['pdl'] }), src).toBeNull()
    }
  })

  it('B · an explicit trustworthy leads.source wins', () => {
    expect(resolveHistoricalProvider({ source: 'pdl' })).toBe('pdl')
    expect(resolveHistoricalProvider({ source: 'apollo' })).toBe('apollo')
    // and it outranks the house arm and memory:
    expect(resolveHistoricalProvider({ source: 'pdl', isHouseAccount: true, memorySources: ['apollo'] })).toBe('pdl')
  })

  it('C · lookalike → pdl (the route calls pdlSearchPeople)', () => {
    expect(resolveHistoricalProvider({ source: 'lookalike' })).toBe('pdl')
  })

  it('D · the known house-account book → apollo', () => {
    expect(resolveHistoricalProvider({ source: null, isHouseAccount: true })).toBe('apollo')
  })

  it('E · memory corroborates ONLY through the matching acquisition IDENTITY', () => {
    // acquisition_memory is keyed (source, provider_id) — the row's own provider id must
    // match a remembered provider_id, and exactly one eligible provider must claim it.
    const M = (source: string, providerId: string) => ({ source, providerId })
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('pdl', 'X')] })).toBe('pdl')
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('apollo', 'X'), M('apollo', 'X')] })).toBe('apollo')
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('PDL', 'X'), M(' pdl ', 'X')] }),
      'case/space variants are one provider').toBe('pdl')
  })

  it('⚑ EMAIL ALONE NEVER CORROBORATES — the remembered identity must be THIS row', () => {
    // The exact defect: a manual/customer lead row carrying apollo_id=X whose email happens
    // to exist in acquisition_memory under a DIFFERENT provider_id=Y. Same email, different
    // acquisition. Must not resolve.
    const M = (source: string, providerId: string) => ({ source, providerId })
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('pdl', 'Y')] })).toBeNull()
    // …and a row with NO provider id has nothing to bind to at all:
    expect(resolveHistoricalProvider({ providerId: null, memoryRecords: [M('pdl', 'Y')] })).toBeNull()
    expect(resolveHistoricalProvider({ memoryRecords: [M('pdl', 'X')] })).toBeNull()
  })

  it('⚑ BOTH pdl AND apollo remembered for the SAME identity → AMBIGUOUS → null', () => {
    const M = (source: string, providerId: string) => ({ source, providerId })
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('pdl', 'X'), M('apollo', 'X')] })).toBeNull()
  })

  it('⚑ an unexpected memory source is NEVER eligible merely by being non-null', () => {
    const M = (source: string, providerId: string) => ({ source, providerId })
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('hunter', 'X')] })).toBeNull()
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('clearbit', 'X'), M('mystery', 'X')] })).toBeNull()
    // …but it cannot poison a unique eligible provider on the same identity either:
    expect(resolveHistoricalProvider({ providerId: 'X', memoryRecords: [M('hunter', 'X'), M('pdl', 'X')] })).toBe('pdl')
  })

  it('nothing at all → null — unknown fails closed', () => {
    expect(resolveHistoricalProvider({})).toBeNull()
    expect(resolveHistoricalProvider({ memoryRecords: [] })).toBeNull()
    expect(resolveHistoricalProvider({ source: '  ' })).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (merge-gate) — AMBIGUITY IS A STATE, NEVER A PICK.
// Phase B used `DISTINCT ON (email) ORDER BY created_at ASC` for country and `MIN()` for
// cost. Both are deterministic and both are WRONG: "earliest row" and "lowest number" are
// tiebreaks wearing determinism, not historical truth. These pure helpers are the spec the
// SQL mirrors (text-guarded above).
// ═══════════════════════════════════════════════════════════════════════════════════════
import { resolvePromotionCountry, resolvePromotionCost } from './pool-sourcing'

describe('resolvePromotionCountry — one answer, or none', () => {
  it('exactly one distinct canonical country → that country', () => {
    expect(resolvePromotionCountry(['United Kingdom'])).toEqual({ country: 'united kingdom', ambiguous: false })
    // spelling variants of ONE country are still one answer
    expect(resolvePromotionCountry(['GB', 'England', 'united kingdom'])).toEqual({ country: 'united kingdom', ambiguous: false })
  })

  it('no observations → NULL, not ambiguous (poolable, geo-unservable)', () => {
    expect(resolvePromotionCountry([])).toEqual({ country: null, ambiguous: false })
    expect(resolvePromotionCountry([null, '', '  '])).toEqual({ country: null, ambiguous: false })
  })

  it('⚑ CONFLICTING countries → AMBIGUOUS → country NULL. Never earliest, never min/max', () => {
    const r = resolvePromotionCountry(['United States', 'United Kingdom'])
    expect(r.ambiguous, 'the conflict is a state, and it is reported').toBe(true)
    expect(r.country, 'no geography may be claimed for this identity').toBeNull()
    // order must not change the answer — an "earliest row" rule would
    expect(resolvePromotionCountry(['United Kingdom', 'United States'])).toEqual(r)
  })
})

describe('resolvePromotionCost — original truth, or a skip', () => {
  it('exactly one distinct recorded cost → that cost', () => {
    expect(resolvePromotionCost([0.28])).toEqual({ cost: 0.28, state: 'proven' })
    expect(resolvePromotionCost([0.28, 0.28])).toEqual({ cost: 0.28, state: 'proven' })
  })

  it('⚑ CONFLICTING recorded costs → AMBIGUOUS. Never MIN to force a number', () => {
    const r = resolvePromotionCost([0.28, 0.35])
    expect(r.state).toBe('ambiguous')
    expect(r.cost, '"lowest is conservative" is not "historically true"').toBeNull()
    expect(resolvePromotionCost([0.35, 0.28])).toEqual(r)     // order-independent
  })

  it('no recorded cost → house-Apollo 0 only where the house book proves it, else unprovable', () => {
    expect(resolvePromotionCost([], { houseApollo: true })).toEqual({ cost: 0, state: 'house_zero' })
    expect(resolvePromotionCost([])).toEqual({ cost: null, state: 'unprovable' })
  })

  it('a conflict is ambiguous even for the house book — evidence beats the default', () => {
    expect(resolvePromotionCost([0.1, 0.2], { houseApollo: true }).state).toBe('ambiguous')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (A3 matcher alignment) — THE DRY RUN MUST PREDICT THE DEPLOYED MATCHER.
//
// A3 used hand-written synonym regexes (`chief executive`, `chief revenue`, `software`, bare
// `director`/`vp`/`owner`/`chief`) that appear nowhere in the client's saved ICP. Every one
// inflated the counts — and a dry run that over-predicts inventory is worse than none,
// because it is believed. The runtime is `containsAny` in pool-sourcing.ts:
//     hay.toLowerCase().includes(needle.toLowerCase())
// STORED value contains a SAVED term. Literal substring. OR across title/industry/seniority.
//
// These tests run the REAL `poolRecordMatchesIcp` against the REAL saved Pass-1 ICP, and a
// structural guard proves the SQL carries the same arrays and the same `strpos` semantics.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('A3 mirrors the deployed Pass-1 matcher — no invented synonyms', () => {
  /** The saved Pass-1 ICP, exactly as A3's `params` block declares it. */
  const PASS1 = {
    geographies:      ['United States', 'United Kingdom'],
    job_titles:       ['Founder', 'CEO', 'CRO', 'VP Sales', 'Sales Director', 'Head of Sales'],
    industries:       ['SaaS'],
    seniority_levels: ['C-Suite', 'VP / Director', 'Head of'],
  }
  /** Runtime role decision for one stored row, geography satisfied. */
  const roleOk = (r: { title?: string | null; industry?: string | null; seniority?: string | null }) =>
    poolRecordMatchesIcp(rec({ country: 'United Kingdom', ...r }), PASS1)

  it('1 · stored title "CEO" matches — the saved term is a substring of it', () => {
    expect(roleOk({ title: 'CEO' })).toBe(true)
    expect(roleOk({ title: 'Group CEO, EMEA' }), 'substring, so a longer title still matches').toBe(true)
  })

  // ⛓️ 24 Sep (R145 step 3a · #72) — CASES 2 AND 3 ARE INVERTED BY A FOUNDER RULING. They pinned "no invented synonyms":
  // a pooled "Chief Executive Officer" did not match a saved "CEO". Founder, 23 Sep: *"CEO is one
  // thing. we need to look at how Apollo asks for an ICP match and follow this"* — tracker #72,
  // approved 24 Sep: *"a 'Chief Executive Officer' counts as 'CEO'"*. Apollo's own title search
  // treats them as one title. The shorthand list (`TITLE_SHORTHANDS`) is closed and spelled out;
  // nothing is inferred from a sentence, and "Founder" still does not become anything else.
  it('2 · stored "Chief Executive Officer" MATCHES "CEO" — the same title, as Apollo reads it', () => {
    // No saved term ("Founder","CEO","CRO","VP Sales","Sales Director","Head of Sales") is a
    // substring of it. The old regex matched it anyway.
    expect('chief executive officer'.includes('ceo'), 'and it genuinely does not contain "ceo"').toBe(false)
    // ⛓️ 23 Sep (R142) — THE ROW'S SENIORITY IS NOW BLANKED, so this case tests the TITLE alone.
    // The shared `rec()` row carries Apollo's own `c_suite`, which the check could not read as
    // "C-Suite" until R142 — this case was silently passing on that defect. Read correctly, a
    // `c_suite` row IS the seniority the ICP asks for, so the title-synonym duty is isolated here.
    expect(roleOk({ title: 'Chief Executive Officer', seniority: null })).toBe(true)
    // …and a title that is NOT a spelling of one the ICP holds still does not match.
    expect(roleOk({ title: 'Chief Marketing Officer', seniority: null })).toBe(false)
  })

  it('3 · stored "Chief Revenue Officer" MATCHES "CRO" — the same ruling', () => {
    expect('chief revenue officer'.includes('cro')).toBe(false)
    // ⛓️ 23 Sep (R142) — THE ROW'S SENIORITY IS NOW BLANKED, so this case tests the TITLE alone.
    // The shared `rec()` row carries Apollo's own `c_suite`, which the check could not read as
    // "C-Suite" until R142 — this case was silently passing on that defect. Read correctly, a
    // `c_suite` row IS the seniority the ICP asks for, so the title-synonym duty is isolated here.
    expect(roleOk({ title: 'Chief Revenue Officer', seniority: null })).toBe(true)
  })

  it('4 · industry "SaaS" matches', () => expect(roleOk({ industry: 'SaaS' })).toBe(true))

  it('5 · industry "B2B SaaS Platform" matches via the substring', () => {
    expect(roleOk({ industry: 'B2B SaaS Platform' })).toBe(true)
  })

  // ⛓️ 22 Sep — the word-wise comparison is unchanged and still answers `no` for "Software"
  // against "SaaS"; what changed is that the category ranks rather than removes, so the row
  // is reusable. The synonym-invention this case guards against has not returned — nothing
  // here decided "Software" MEANS "SaaS".
  it('6 · industry "Software" is still not SaaS — but it no longer costs the record its place', () => {
    expect(roleOk({ industry: 'Software' })).toBe(true)
    expect(roleOk({ industry: 'Computer Software' })).toBe(true)
  })

  it('7 · seniority "C-Suite" matches', () => expect(roleOk({ seniority: 'C-Suite' })).toBe(true))
  it('8 · seniority "VP / Director" matches', () => expect(roleOk({ seniority: 'VP / Director' })).toBe(true))
  it('9 · seniority "Head of" matches', () => expect(roleOk({ seniority: 'Head of' })).toBe(true))

  // ⛓️ RETARGETED 10 Sep (C02) — SENIORITY AND TITLE ARE ONE CRITERION NOW, satisfied by
  // either, because providers populate one or the other inconsistently and refusing a row
  // whose `job_title` plainly says "Chief Executive Officer" for want of a `seniority` value
  // would throw away the clearest match in the set. So "bare `director` was invented" can no
  // longer be isolated on the seniority field alone — with a matching title the row is
  // correctly reused. The INVENTED-SYNONYM duty survives on the criteria where it is still
  // separable (industry, case 6; title, cases 2–3), and is asserted here on the pair.
  it('10 · seniority and title are ONE criterion — an invented term still does not match', () => {
    // The saved terms are "VP / Director" and the six job titles. A row carrying neither a
    // real title nor a real level is refused; a row carrying a real TITLE is reused even
    // when its stored seniority is one of A3's invented spellings.
    // ⛓️ 23 Sep (R142) — INVERTED. WAS `roleOk({ seniority: 'Director', title: 'Barista' })` and
    // `…'VP'…` → false ("bare `director`/`vp` was invented"). They were not invented: the saved
    // label "VP / Director" is SEARCHED at Apollo as `['vp', 'director']` (`buildSearchBody`), so
    // a director or a VP is exactly who that ICP asked Apollo for. R142 makes the check read the
    // label the way the search sends it. A seniority the ICP never asked for is still refused.
    expect(roleOk({ seniority: 'Director', title: 'Barista' })).toBe(true)
    expect(roleOk({ seniority: 'VP', title: 'Barista' })).toBe(true)
    expect(roleOk({ seniority: 'Manager', title: 'Barista' }), 'a level the ICP never named').toBe(false)
    expect(roleOk({ seniority: 'Intern', title: 'Barista' })).toBe(false)
    expect(roleOk({ seniority: 'Director', title: 'CEO' }), 'a real title carries the criterion').toBe(true)
  })

  // ⛓️ RETARGETED 10 Sep (C02) — THE OR IS GONE, so a barista is a barista whatever their
  // employer sells. This is the A3 case that most over-predicted inventory: it counted rows
  // as reusable on one arm while the client's own targeting named three.
  it('11 · a non-matching title NO LONGER qualifies on industry', () => {
    // ⛓️ 23 Sep (R142) — seniority blanked so this tests the industry arm alone; the shared row's
    // Apollo `c_suite` now reads correctly as C-Suite and would otherwise carry the criterion.
    expect(roleOk({ title: 'Barista', industry: 'B2B SaaS', seniority: null })).toBe(false)
    // ⚠️ AND THIS ONE IS CORRECTLY REUSED, which I had expected to fail until the rule said
    // otherwise. The client asked for C-Suite people at SaaS firms; this row is a C-Suite
    // person at a SaaS firm. Title and seniority are ONE criterion satisfied by either (see
    // case 10), so a stored level of "C-Suite" carries it even beside an odd title — and
    // refusing it would throw away a row that matches everything they actually named.
    expect(roleOk({ title: 'Barista', seniority: 'C-Suite' })).toBe(true)
    // The industry they asked for, with the title they asked for → reused.
    expect(roleOk({ title: 'Head of Sales', industry: 'B2B SaaS' })).toBe(true)
  })

  it('12 · nothing matches → role_ok false', () => {
    expect(roleOk({ title: 'Barista', industry: 'Hospitality', seniority: 'Entry' })).toBe(false)
    // ⛓️ 10 Sep — `roleOk({})` NOW INHERITS THE HARD-FITTING DEFAULT ROW, so it asserts the
    // opposite fact and is stated as such: a row that satisfies every saved criterion IS
    // reusable. The "nothing matches" duty is the line above, where every field is wrong.
    expect(roleOk({}), 'a row matching every saved criterion is reusable').toBe(true)
  })

  it('and geography stays canonical equality, not substring', () => {
    expect(poolRecordMatchesIcp(rec({ country: 'GB', title: 'CEO' }), PASS1)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ country: 'Australia', title: 'CEO' }), PASS1)).toBe(false)
    expect(poolRecordMatchesIcp(rec({ country: null, title: 'CEO' }), PASS1)).toBe(false)
  })

  it('13 · A3 declares the saved ICP arrays verbatim', () => {
    const sql = codeOnly(readRepo('supabase/maintenance/2026-08-27_kind_acquired_pool_promotion.sql'))
    expect(sql).toContain("array['United States','United Kingdom']")
    expect(sql).toContain("array['Founder','CEO','CRO','VP Sales','Sales Director',")
    expect(sql).toContain("'Head of Sales']")
    expect(sql).toContain("array['SaaS']")
    expect(sql).toContain("array['C-Suite','VP / Director','Head of']")
  })

  it('⚑ 14 · every invented synonym is GONE, and the matcher is strpos over the saved arrays', () => {
    const sql = codeOnly(readRepo('supabase/maintenance/2026-08-27_kind_acquired_pool_promotion.sql')).toLowerCase()
    // the regex form itself must not return
    expect(sql.includes('similar to'), 'regex synonym matching must not come back').toBe(false)
    // nor any of the specific invented terms
    for (const invented of ['chief executive', 'chief revenue', 'vp of sales', 'director of sales',
                            '|software|', 'c_suite', '|owner|', '|chief)']) {
      expect(sql.includes(invented), `invented term: ${invented}`).toBe(false)
    }
    // and the role test is the literal-substring mirror of containsAny, over params arrays
    expect(sql).toContain("strpos(lower(coalesce(u.title,'')),     lower(t)) > 0")
    expect(sql).toContain("strpos(lower(coalesce(u.industry,'')),  lower(i)) > 0")
    expect(sql).toContain("strpos(lower(coalesce(u.seniority,'')), lower(sn)) > 0")
    for (const arr of ['unnest(pp.job_titles)', 'unnest(pp.industries)', 'unnest(pp.seniority_levels)']) {
      expect(sql, arr).toContain(arr)
    }
  })

  it('the downstream funnel columns are unchanged', () => {
    const sql = codeOnly(readRepo('supabase/maintenance/2026-08-27_kind_acquired_pool_promotion.sql'))
    for (const col of ['kind_acquired_proven', 'canonical_geo_match', 'role_match',
                       'after_opt_out_blocklist', 'after_sql_visible_suppression_floor',
                       'after_existing_client_dedupe', 'after_sql_visible_runtime_gates']) {
      expect(sql, col).toContain(col)
    }
  })
})
