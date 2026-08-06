// LEADS COLUMN TRUTH — every column we name in a `leads` query must actually exist.
//
// WHY THIS FILE EXISTS. A18 (the live-fire reply test) needed one test lead planted via
// `Vida → Engine → Import leads (CSV)`. The import failed on the real file with:
//
//     Could not find the 'source' column of 'leads' in the schema cache
//
// `toLeadRow` has written `source: 'csv_import'` since it was authored, and **no migration
// ever created `leads.source`** — so the CSV importer has never worked, on any file, ever.
//
// That was the LOUD half. Grepping for every other query that names a `leads` column found
// two more, and both fail SILENTLY because supabase-js returns `{ error }` rather than
// throwing and both call sites read `.data ?? []` (#349):
//
//   • `figsy.ts` /activity  — selected `source`. Every "N leads added" row is missing from
//     every client's activity feed, and an empty feed looks exactly like a quiet week.
//   • `leads.ts` /coaching  — selected `why_fits`, which is DERIVED (scrubbed from
//     `score_reasoning` at leads.ts:273) and has never been a column. Every booked meeting
//     renders as "Prospect" with no title, company, industry or score.
//
// Three defects, one root cause: nothing checked a query's column names against the schema.
// This does. It is deliberately GENERIC — it walks every `db.from('leads').select(...)` in
// the API and every key `toLeadRow` writes, so the NEXT invented column fails here instead
// of in production.
//
// Scoped per the assertion-scoping law: the assertion is bound to the parsed column sets
// themselves, never to a char window or a comment anchor.

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { toLeadRow } from './lead-import'
import { failedReads, failedReadLines } from './read-errors'

const REPO = join(__dirname, '../../../..')
const SCHEMA = join(REPO, 'packages/db/src/schema.sql')
const API_SRC = join(__dirname, '..')

/**
 * Every column `public.leads` has, according to the committed schema of record.
 *
 * Two sources, because the table is defined in two places: the original `create table`
 * and the reconciliation `alter table ... add column if not exists` blocks that carry
 * everything added since. Reading only the first would report 30 columns for a 44-column
 * table and fail this test on rows that are perfectly real.
 */
export function leadsColumnsInSchema(schemaSql: string): Set<string> {
  const cols = new Set<string>()

  const base = schemaSql.match(/create table if not exists public\.leads \(([\s\S]*?)\n\);/i)
  if (!base) throw new Error('Could not find `create table if not exists public.leads (...)` in schema.sql')
  for (const line of base[1].split('\n')) {
    const m = line.trim().match(/^([a-z_][a-z0-9_]*)\s+/i)
    // Table-level constraint lines start with a keyword, not a column name.
    if (m && !/^(check|constraint|primary|unique|foreign|references)$/i.test(m[1])) cols.add(m[1])
  }

  for (const block of schemaSql.matchAll(/alter table public\.leads\b([\s\S]*?);/gi)) {
    for (const m of block[1].matchAll(/add column if not exists\s+([a-z_][a-z0-9_]*)/gi)) cols.add(m[1])
  }

  return cols
}

/** Every `.ts`/`.tsx` file under the API source, tests excluded. */
function apiSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name)
    if (entry.isDirectory()) { if (entry.name !== 'node_modules') apiSourceFiles(p, out) }
    else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(p)
  }
  return out
}

/**
 * Column names a `db.from('leads').select('…')` asks Postgres for.
 *
 * `select('*')` names nothing and is skipped. Embedded relations (`clients(company_name)`)
 * are columns of the OTHER table, so the group is stripped before splitting — leaving them
 * in would report `company_name` as a missing `leads` column and bury the real finding.
 */
export function leadsColumnsSelectedIn(src: string): { column: string; index: number }[] {
  const found: { column: string; index: number }[] = []
  for (const m of src.matchAll(/from\(\s*'leads'\s*\)\s*\r?\n?\s*\.select\(\s*'([^']*)'/g)) {
    const raw = m[1]
    if (raw.includes('*')) continue
    const flat = raw.replace(/[a-z_]+\s*\([^)]*\)/gi, '')
    for (let col of flat.split(',')) {
      col = col.trim()
      if (!col) continue
      if (col.includes(':')) col = col.split(':').pop()!.trim()   // `alias:column`
      if (!/^[a-z_][a-z0-9_]*$/.test(col)) continue
      found.push({ column: col, index: m.index ?? 0 })
    }
  }
  return found
}

function lineOf(src: string, index: number): number {
  return src.slice(0, index).split('\n').length
}

/**
 * The body of one Express handler, bound by its own registration rather than a line count.
 *
 * Assertion-scoping law: a fixed char window drifts the moment anything above it changes,
 * and a comment anchor passes happily after the code beneath it is deleted. The handler's
 * next sibling registration is the only honest end marker.
 */
export function handlerBody(src: string, registration: string): string {
  const start = src.indexOf(registration)
  if (start < 0) throw new Error(`Could not find the handler registration: ${registration}`)
  const rest = src.slice(start + registration.length)
  const end = rest.search(/\n(figsyRouter|leadRouter|operatorRouter)\.(get|post|put|patch|delete)\(/)
  return end < 0 ? rest : rest.slice(0, end)
}

describe('a failed read is reported, not rendered as silence (#349)', () => {
  it('names exactly the reads that failed, and none of the ones that did not', () => {
    expect(failedReads({
      sent:      { error: null },
      replies:   { error: { message: 'column "x" does not exist' } },
      campaigns: {},
      leads:     { error: { message: 'schema cache miss' } },
    })).toEqual(['replies', 'leads'])
  })

  it('says nothing when every read succeeded — a clean request stays quiet', () => {
    expect(failedReads({ sent: { error: null }, leads: {} })).toEqual([])
  })

  it('each line names the read AND the reason — "the query failed" sends you to four candidates', () => {
    const lines = failedReadLines('figsy/activity', { leads: { error: { message: 'column leads.source does not exist' } } })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('figsy/activity')
    expect(lines[0]).toContain('leads')
    expect(lines[0]).toContain('column leads.source does not exist')
  })

  it('survives an error with no message rather than printing "undefined"', () => {
    expect(failedReadLines('s', { leads: { error: {} } })[0]).toContain('(no message)')
  })

  it('the LIVE activity feed calls it, with both of its reads', () => {
    // Wiring only — the behaviour is proven above. Bound to the handler's own registration
    // rather than a line range, per the assertion-scoping law.
    //
    // "LIVE" is load-bearing: there used to be a second `/activity` handler ~2,000 lines
    // below this one, and Express never reached it. A wiring pin that resolves to a shadowed
    // duplicate proves nothing at all, which is why `no-duplicate-routes.test.ts` exists.
    const body = handlerBody(
      readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8'),
      `figsyRouter.get('/activity'`,
    )
    expect(body, 'the /activity handler never calls reportFailedReads').toContain('reportFailedReads(')
    for (const read of ['sentRes', 'repliesRes']) {
      const passed = new RegExp(`reportFailedReads\\([\\s\\S]{0,300}\\b${read}\\b`).test(body)
      expect(passed, `${read} is never passed to reportFailedReads, so its failure stays silent`).toBe(true)
    }
  })
})

describe('leads column truth — a query may only name a column that exists', () => {
  const schemaSql = readFileSync(SCHEMA, 'utf8')
  const columns = leadsColumnsInSchema(schemaSql)

  it('the schema parse itself is sane — it finds the columns everyone knows are there', () => {
    // If the parser silently returned an empty set, every assertion below would pass while
    // checking nothing. Pin a handful of columns that unquestionably exist.
    for (const known of ['id', 'client_id', 'email', 'first_name', 'status', 'delivered_at', 'revealed_at']) {
      expect(columns.has(known), `schema.sql parse lost the column '${known}'`).toBe(true)
    }
    expect(columns.size).toBeGreaterThan(30)
  })

  it('every column toLeadRow writes exists in the schema — the CSV importer bug', () => {
    const written = Object.keys(toLeadRow(
      {
        first_name: 'A', last_name: 'B', email: 'a@b.com',
        job_title: null, company: null, linkedin_url: null, country: null,
      },
      '00000000-0000-0000-0000-000000000000',
    ))
    const missing = written.filter(c => !columns.has(c))
    expect(
      missing,
      `toLeadRow writes column(s) that do not exist on public.leads: ${missing.join(', ')}. ` +
      `Every insert it makes will fail with "Could not find the '<col>' column of 'leads' in the schema cache".`,
    ).toEqual([])
  })

  it('every column any leads query selects exists in the schema — the silent-failure class', () => {
    const violations: string[] = []
    for (const file of apiSourceFiles(API_SRC)) {
      const src = readFileSync(file, 'utf8')
      for (const { column, index } of leadsColumnsSelectedIn(src)) {
        if (!columns.has(column)) {
          violations.push(`${file.slice(REPO.length + 1)}:${lineOf(src, index)} selects '${column}'`)
        }
      }
    }
    expect(
      [...new Set(violations)],
      'A leads query names a column that is not in schema.sql. supabase-js returns { error } ' +
      'rather than throwing, and these call sites read `.data ?? []` — so the whole query ' +
      'returns nothing and the page renders as if there were simply no data (#349).',
    ).toEqual([])
  })

  it('a column toLeadRow writes must also be RUNNABLE in production, not just declared', () => {
    // schema.sql is documentation. The only thing that changes the live database is a
    // migration — `pending-migrations.ts` for the ones Vida runs, or a committed file under
    // supabase/migrations/. Declaring `source` in schema.sql and stopping there would leave
    // this test green and the importer just as broken as it was this morning.
    const migrationSql = [
      readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8'),
      ...readdirSync(join(REPO, 'supabase/migrations'))
        .filter(f => f.endsWith('.sql'))
        .map(f => readFileSync(join(REPO, 'supabase/migrations', f), 'utf8')),
    ].join('\n')

    // Columns in the base `create table` predate every migration; only the ones added since
    // need one.
    const base = schemaSql.match(/create table if not exists public\.leads \(([\s\S]*?)\n\);/i)![1]
    const baseCols = new Set(
      base.split('\n')
        .map(l => l.trim().match(/^([a-z_][a-z0-9_]*)\s+/i)?.[1])
        .filter((c): c is string => !!c && !/^(check|constraint|primary|unique|foreign|references)$/i.test(c)),
    )

    const written = Object.keys(toLeadRow(
      {
        first_name: 'A', last_name: 'B', email: 'a@b.com',
        job_title: null, company: null, linkedin_url: null, country: null,
      },
      '00000000-0000-0000-0000-000000000000',
    ))

    const unmigrated = written.filter(c => !baseCols.has(c) && !new RegExp(
      `add column if not exists\\s+${c}\\b`, 'i',
    ).test(migrationSql))

    expect(
      unmigrated,
      `toLeadRow writes column(s) with no migration that creates them: ${unmigrated.join(', ')}. ` +
      'Adding it to schema.sql changes nothing in production — only a migration does.',
    ).toEqual([])
  })
})
