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
import { readFileSync } from 'node:fs'
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

const rec = (over: Partial<PoolRecord>): PoolRecord => ({ email_norm: 'a@b.com', ...over })

/** Strip whole-line comments before asserting on source text, so a guard can never be
 *  satisfied by the prose of the comment that explains it. */
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|--|\*|\/\*)/.test(l)).join('\n')

const readRepo = (rel: string) => readFileSync(join(__dirname, '../../../..', rel), 'utf8')

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

  it('the OR across title / industry / seniority is untouched', () => {
    const icp = { geographies: ['United Kingdom'], job_titles: ['CTO'], industries: ['SaaS'], seniority_levels: ['cxo'] }
    expect(poolRecordMatchesIcp(rec({ country: 'UK', title: 'CTO' }), icp)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ country: 'UK', industry: 'B2B SaaS' }), icp)).toBe(true)
    expect(poolRecordMatchesIcp(rec({ country: 'UK', seniority: 'cxo' }), icp)).toBe(true)
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
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain('launchCountrySpellings')
    expect(src).toMatch(/geoTerms\.map\(g => `country\.ilike/)
    // and the un-expanded form is gone
    expect(src).not.toMatch(/geos\.map\(g => `country\.ilike/)
  })

  it('⚑ the route makes the PRECISE country decision in JS after the widened query', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain('poolCountryMatches(c.country, geos)')
  })
})

// ── 7–8 · NON-NULL PRESERVATION, AND THE ONE-DIRECTION HEAL ─────────────────────────────
describe('⑦⑧ upsert semantics — good country protected, null country healable', () => {
  it('⑦ the pool write is ON CONFLICT DO NOTHING, so a later null can never erase a country', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain("upsert(poolEligible, { onConflict: 'email_norm', ignoreDuplicates: true })")
  })

  it('⑧ the heal fills ONLY where country is null — the WHERE clause is the safety', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    // .is('country', null) is what makes overwriting structurally impossible.
    expect(src).toMatch(/\.update\(\{ country \}\)\.in\('email_norm', emails\)\.is\('country', null\)/)
  })

  it('the heal touches country and nothing else — not a general merge', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
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
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain('canonicalPoolCountry(contact.country) || null')
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
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain('stage=pool_write')
    expect(src).toContain('isGeoServable(r)')
  })

  it('a geo-gated serve that discards country-less candidates names the count', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain('stage=pool_country_missing')
    expect(src).toContain('notGeoServable')
  })

  it('neither diagnostic can carry PII', () => {
    const src = readRepo('apps/api/src/routes/icps.ts')
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
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toMatch(/geoTerms\.map\(g => `country\.ilike\.\$\{g\}`\)/)
    expect(src, 'the substring form must never return').not.toMatch(/country\.ilike\.\*/)
  })

  it('role terms deliberately KEEP their wildcards — titles are genuinely partial', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
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
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
    expect(src).toContain('!poolCountryMatches(contact.country, icpGeographies)')
    expect(src).toContain('removedByGeoGate++')
  })

  it('a geo-rejected batch is a counted, PII-free diagnostic', () => {
    const src = codeOnly(readRepo('apps/api/src/routes/icps.ts'))
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
    // provider loop rows never stamped leads.source — provider id is the recorded fact
    expect(classifyLeadRights(null, 'pdl_abc123')).toBe('kind_acquired')
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
    // provider must be provable or the row is skipped — fail closed:
    expect(sql).toContain('where p.provider is not null')
    // never overwrites an existing pooled record:
    expect(sql.toLowerCase()).toContain('on conflict (email_norm) do nothing')
    // the heal is fill-only:
    expect(sql).toContain("coalesce(btrim(p.country),'') = ''")
  })

  it('the corrected audit terminology: metadata-complete is never called servable', () => {
    const sql = readRepo(TOOL)
    expect(sql).toContain('metadata_complete_candidates')
    expect(sql).toContain('safely_promotable_now')
    expect(sql).toContain('likely_runtime_servable_estimate')
    expect(sql, 'the old overclaiming label is gone').not.toContain('promotable_not_in_pool')
  })
})
