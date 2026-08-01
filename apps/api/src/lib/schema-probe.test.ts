import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  classifyProbeError, migrationSafety, PROBES, NEEDS_PG_CONNECTION,
  MISSING_TABLE_CODES, MISSING_COLUMN_CODES, LEDGER_TYPES_TO_COUNT,
  type CountResult,
} from './schema-probe'

// #558 — THE PROBE THAT MUST NEVER MISTAKE AN OUTAGE FOR AN ANSWER.
//
// `docs/SCHEMA-DRIFT.md` shipped eight queries and told the founder to paste them into
// "Vida → Engine → SQL", **a screen that does not exist**. This closes six of them with the
// supabase-js client we already have: selecting a column that is not there is an error with
// a specific code, so the request itself is the probe.
//
// Which makes the classifier the entire judgement, and gives it one failure mode that
// matters more than every other:
//
//   ⚠️ **A PROBE THAT COULD NOT RUN MUST RETURN `unknowable`, NEVER `missing`.**
//
// A bad key, a paused project, a dropped connection and an RLS refusal all arrive as errors.
// Reading any of them as "the column is absent" turns an outage into a confident, wrong
// schema verdict — and sends somebody to add a column that was there all along. That is #565
// wearing its fourth hat, and it is the branch that cannot be tested against a working
// database, which is exactly why the classifier is pure.

const err = (code: string, message = 'boom') => ({ code, message })

describe('a missing column is recognised by code, and by wording as a backstop', () => {
  it('42703 and PGRST204 are the column codes', () => {
    expect([...MISSING_COLUMN_CODES]).toEqual(['42703', 'PGRST204'])
    for (const c of MISSING_COLUMN_CODES) {
      expect(classifyProbeError(err(c), 'column').verdict).toBe('missing')
    }
  })

  it('the wording is a SECOND route to the same verdict, not the first', () => {
    // PostgREST has renamed codes between versions. A probe that silently reclassified every
    // schema question as `unknowable` after a dependency bump would be useless in exactly the
    // quiet way this file exists to avoid.
    expect(classifyProbeError({ code: '', message: `column leads.source does not exist` }, 'column').verdict).toBe('missing')
    expect(classifyProbeError({ code: '', message: `Could not find the 'source' column of 'leads'` }, 'column').verdict).toBe('missing')
  })

  it('a column probe on an absent TABLE also answers the column question', () => {
    // The column cannot exist if the table does not. Reported missing, with the table's
    // error attached — "the table is gone" is the more useful sentence to read.
    const r = classifyProbeError(err('42P01', 'relation "public.ghost" does not exist'), 'column')
    expect(r.verdict).toBe('missing')
    expect(r.detail).toContain('does not exist')
  })
})

describe('a missing table is recognised the same way', () => {
  it('42P01 and PGRST205 are the table codes', () => {
    expect([...MISSING_TABLE_CODES]).toEqual(['42P01', 'PGRST205'])
    for (const c of MISSING_TABLE_CODES) {
      expect(classifyProbeError(err(c), 'table').verdict).toBe('missing')
    }
  })

  it('a COLUMN error on a table probe is NOT "table missing"', () => {
    // Different question, different answer. Calling this "missing" would report a table gone
    // because one column name was wrong.
    expect(classifyProbeError(err('42703'), 'table').verdict).toBe('unknowable')
  })
})

describe('⚠️ no error means it exists — and every other error means we could not tell', () => {
  it('a clean result is exists', () => {
    const r = classifyProbeError(null, 'column')
    expect(r.verdict).toBe('exists')
    expect(r.detail).toBeNull()
  })

  it('a bad key, a paused project and a dropped connection are all UNKNOWABLE', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. Any of these classified as `missing` prints a
    // schema verdict about a database we could not reach.
    for (const e of [
      err('PGRST301', 'JWT expired'),
      err('', 'fetch failed'),
      err('57P03', 'the database system is starting up'),
      err('42501', 'permission denied for table leads'),
      { code: null, message: null },
    ]) {
      expect(classifyProbeError(e, 'column').verdict, JSON.stringify(e)).toBe('unknowable')
      expect(classifyProbeError(e, 'table').verdict, JSON.stringify(e)).toBe('unknowable')
    }
  })

  it('an RLS refusal is unknowable, not missing — the column may be perfectly present', () => {
    expect(classifyProbeError(err('42501', 'new row violates row-level security policy'), 'column').verdict)
      .toBe('unknowable')
  })

  it('every non-clean verdict carries the raw error, so it can be argued with', () => {
    for (const e of [err('42703', 'column x does not exist'), err('PGRST301', 'JWT expired')]) {
      const r = classifyProbeError(e, 'column')
      expect(r.detail).toBeTruthy()
      expect(r.code).toBe(e.code)
    }
  })
})

describe('the Run-migrations safety answer refuses to guess', () => {
  const measured = (value: number): CountResult => ({ measured: true, value })
  const unmeasured = (why: string): CountResult => ({ measured: false, why })

  it('safe when both counts are measured and zero', () => {
    const r = migrationSafety({ hold: measured(0), release: measured(0) })
    expect(r.safe).toBe(true)
    // And it does not overclaim: eleven other migrations exist and this says nothing of them.
    expect(r.detail).toContain('says nothing about the other eleven')
  })

  it('NOT safe when a hold row exists, and it names the count', () => {
    // ADD CONSTRAINT validates existing rows, so one surviving row makes the migration throw.
    const r = migrationSafety({ hold: measured(3), release: measured(0) })
    expect(r.safe).toBe(false)
    expect(r.headline).toContain('Do NOT press Run migrations')
    expect(r.detail).toContain('3 × hold')
    expect(r.detail).toContain('validates existing rows')
  })

  it('an UNMEASURED count is not zero — it answers null, not safe', () => {
    // The sending panel's rule (#576) applied to a different number. Reporting "safe" here
    // because the count query failed is how somebody presses a button that throws.
    const r = migrationSafety({ hold: unmeasured('statement timeout'), release: measured(0) })
    expect(r.safe).toBeNull()
    expect(r.detail).toContain('NOT evidence')
    expect(r.detail).toContain('statement timeout')
  })

  it('hold and release are the two types that decide it', () => {
    expect([...LEDGER_TYPES_TO_COUNT]).toEqual(['hold', 'release'])
  })
})

describe('the probe list is fixed, and covers what the doc asked', () => {
  it('accepts no input — the list is a constant, not a parameter', () => {
    // A probe endpoint that took a table name would be the arbitrary-read surface
    // pending-migrations.ts deliberately refuses to be.
    const route = readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8')
    const handler = route.slice(route.indexOf("operatorRouter.get('/schema-probe'"))
    expect(handler.slice(0, 200)).toContain('_req')
    expect(handler.slice(0, 4000)).not.toMatch(/req\.(query|body|params)/)
  })

  it('probes exactly the five schema questions #558 left open', () => {
    expect(PROBES.map(p => p.id).sort()).toEqual([
      'clients.last_low_credit_email_at',
      'leads.source',
      'opt_out_blocklist.whatsapp_number',
      'subscribers',
      'whatsapp_messages',
    ])
  })

  it('leads.source names the thing it actually blocks', () => {
    // The only one of the five with a consequence today: #599's CSV import writes it on
    // every row, and it is the first thing Client Zero needs.
    const p = PROBES.find(x => x.id === 'leads.source')!
    expect(p.ifMissing).toContain('#599')
    expect(p.ifMissing).toContain('ALTER TABLE public.leads')
  })

  it('every probe says what to do if it comes back missing', () => {
    // A verdict with no next action is a verdict that sits there — which is how the eight
    // queries in SCHEMA-DRIFT.md ended up with nowhere to run.
    for (const p of PROBES) expect(p.ifMissing.length, p.id).toBeGreaterThan(60)
  })
})

describe('the two questions this CANNOT answer travel with the ones it can', () => {
  it('names both, and says why', () => {
    // PostgREST exposes tables, not the catalog. Discovering that gap later is how a doc
    // gets trusted for something it never covered.
    expect(NEEDS_PG_CONNECTION.map(n => n.id).sort()).toEqual(['credit_transactions_type_check', 'table_census'])
    for (const n of NEEDS_PG_CONNECTION) expect(n.why).toContain('DATABASE_URL')
  })

  it('the constraint definition is one of them — it is #558\'s literal example', () => {
    const c = NEEDS_PG_CONNECTION.find(n => n.id === 'credit_transactions_type_check')!
    expect(c.why).toContain('pg_constraint')
  })
})

describe('the doc no longer sends the founder to a screen that does not exist', () => {
  const doc = () => readFileSync(join(__dirname, '../../../../docs/SCHEMA-DRIFT.md'), 'utf8')

  it('the phantom SQL runner is gone', () => {
    // The mistake this whole change exists to fix. It shipped in PR #1236.
    expect(doc()).not.toContain('Engine** → the SQL runner')
    expect(doc()).not.toMatch(/paste (them )?into Vida → Engine → SQL/i)
  })

  it('it points at the probe button instead, and says what the button is', () => {
    expect(doc()).toContain('Schema probe')
    expect(doc()).toContain('/vida/engine')
  })

  it('the two blocked questions are marked blocked, not quietly dropped', () => {
    // Deleting them would read as "all answered". They are still open and still matter.
    const d = doc()
    expect(d).toContain('need a Postgres connection')
    expect(d).toContain('DATABASE_URL')
    expect(d).toContain('pg_constraint')
  })

  it('the SQL that remains is still read-only', () => {
    const fences = [...doc().matchAll(/```sql\n([\s\S]*?)```/g)].map(m => m[1])
    for (const q of fences) {
      expect(q.trim().toLowerCase().startsWith('select'), `not a SELECT: ${q.trim().slice(0, 60)}`).toBe(true)
      expect(q).not.toMatch(/\b(insert|update|delete|drop|truncate|grant)\b/i)
    }
  })
})
