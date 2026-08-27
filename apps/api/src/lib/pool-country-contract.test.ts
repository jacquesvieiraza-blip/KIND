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
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  poolRecordMatchesIcp, poolCountryMatches, canonicalPoolCountry, isGeoServable,
  type PoolRecord,
} from './pool-sourcing'
import { canonicalLaunchCountry, launchCountrySpellings } from '@kind/shared'

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
