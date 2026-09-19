// ══════════════════════════════════════════════════════════════════════════════════════════
// C-9 · THE RELATION-ABSENCE PREDICATE — BOTH CODES, AND NOTHING ELSE
//
// The negative half of this file is the half that matters. A predicate that answers "is the
// table missing?" is one careless `||` away from answering "did anything go wrong?", and the
// founder's approval of C-9 was explicit that it must not become a broad error swallow. So
// every code that is NEARBY but means something else is asserted FALSE by name.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  isRelationAbsent,
  relationErrorCode,
  RELATION_ABSENT_CODES,
  PG_UNDEFINED_TABLE,
  PGRST_UNDEFINED_TABLE,
} from './relation-absent'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('C-9 · isRelationAbsent accepts exactly two codes', () => {
  it('TRUE for 42P01 — PostgreSQL undefined_table (raw pg, and a stale PostgREST cache)', () => {
    expect(isRelationAbsent({ code: '42P01', message: 'relation "public.operator_tasks" does not exist' })).toBe(true)
    expect(PG_UNDEFINED_TABLE).toBe('42P01')
  })

  it('TRUE for PGRST205 — what supabase-js ACTUALLY receives through PostgREST', () => {
    // The real shape, as PostgREST answers it. This is the case Batch 1 could not recognise.
    expect(isRelationAbsent({
      code: 'PGRST205',
      message: "Could not find the table 'public.operator_tasks' in the schema cache",
      hint: null, details: null,
    })).toBe(true)
    expect(PGRST_UNDEFINED_TABLE).toBe('PGRST205')
  })

  it('🛑 FALSE for 42703 — a missing COLUMN is a different fact with different handling', () => {
    // Conflating them would report a half-migrated table as a missing one, and send somebody
    // to run a migration that has already run. The EXPAND/CONTRACT window has its own
    // predicate (`isLedgerColumnMissing`).
    expect(isRelationAbsent({ code: '42703', message: 'column "last_outcome" does not exist' })).toBe(false)
  })

  it('🛑 FALSE for PGRST200 / PGRST201 / PGRST204 — embeddings and columns, not existence', () => {
    expect(isRelationAbsent({ code: 'PGRST200', message: "Could not find a relationship between 'a' and 'b'" })).toBe(false)
    expect(isRelationAbsent({ code: 'PGRST201', message: 'Could not embed because more than one relationship was found' })).toBe(false)
    expect(isRelationAbsent({ code: 'PGRST204', message: "Could not find the 'x' column of 'y' in the schema cache" })).toBe(false)
  })

  it('🛑 FALSE for the ordinary failures a swallow would hide', () => {
    for (const code of [
      '23505', // unique_violation — has its own branch at every call site
      '23502', // not_null_violation — the failure-record bug migration-ledger documents
      '23503', // foreign_key_violation
      '42501', // insufficient_privilege — "permission denied for table", NOT absence.
      '42P13', // invalid_function_definition — what check 10's broken migration produces
      '08006', // connection_failure — the database is unreachable, which is not "no table"
      'PGRST301', // JWT expired
      'PGRST125', // invalid path — the gateway defect, emphatically not a missing table
    ]) {
      expect(isRelationAbsent({ code, message: 'something went wrong' }), `${code} must not read as absence`).toBe(false)
    }
  })

  it('FALSE for anything with no code at all — never guesses from a message', () => {
    expect(isRelationAbsent(null)).toBe(false)
    expect(isRelationAbsent(undefined)).toBe(false)
    expect(isRelationAbsent({})).toBe(false)
    expect(isRelationAbsent('relation "operator_tasks" does not exist')).toBe(false)
    expect(isRelationAbsent(new Error('relation "operator_tasks" does not exist'))).toBe(false)
    // A numeric code is not a code: supabase-js and pg both use strings.
    expect(isRelationAbsent({ code: 42701 })).toBe(false)
  })

  it('the accepted set is EXACTLY two members, asserted by value', () => {
    // ⚠️ THE TRIPWIRE. Adding a third code is a decision, and it should have to change a
    // test that says so out loud rather than pass silently.
    expect([...RELATION_ABSENT_CODES].sort()).toEqual(['42P01', 'PGRST205'])
    expect(RELATION_ABSENT_CODES.size).toBe(2)
  })

  it('relationErrorCode reads the code wherever it is, and empty-strings when absent', () => {
    expect(relationErrorCode({ code: 'PGRST205' })).toBe('PGRST205')
    expect(relationErrorCode({})).toBe('')
    expect(relationErrorCode(null)).toBe('')
  })
})

describe('C-9 · every absence site uses the one predicate', () => {
  // ⚠️ ASSERTED ON CODE, COMMENTS STRIPPED. Each of these files explains the two codes in
  // prose, so an un-stripped search for "PGRST205" would be satisfied by the explanation
  // rather than by the behaviour — the repo's convention, and the reason it is repeated here.
  const codeOf = (p: string) => read(p).replace(/^\s*\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')

  const SITES = [
    'apps/api/src/lib/operator-tasks.ts',
    'apps/api/src/lib/automatic-work.ts',
    'apps/api/src/lib/migration-ledger.ts',
  ]

  it.each(SITES)('%s imports isRelationAbsent', (p) => {
    expect(codeOf(p)).toMatch(/from '\.\/relation-absent'/)
  })

  it.each(SITES)('%s no longer hard-codes a bare 42P01 comparison', (p) => {
    // The literal may still appear inside `relation-absent.ts`'s own constants — but not as a
    // comparison in a call site, which is what made PGRST205 unreachable.
    const code = codeOf(p)
    expect(code, `${p} still compares against a bare '42P01'`).not.toMatch(/===\s*'42P01'|===\s*UNDEFINED_TABLE|code\s*===\s*"42P01"/)
  })

  it('migration-ledger handles absence at BOTH of its sites', () => {
    // The read path (`isLedgerTableMissing`) and the WRITE path (`recordOutcome`'s catch) are
    // separate branches, and the write path is the one the ledger exists for.
    const code = codeOf('apps/api/src/lib/migration-ledger.ts')
    expect((code.match(/isRelationAbsent\(/g) ?? []).length,
      'both the read and write absence branches must use it').toBeGreaterThanOrEqual(2)
    // …and the COLUMN predicate is untouched, still its own separate fact.
    expect(code).toMatch(/isLedgerColumnMissing/)
    expect(code).toMatch(/'42703'/)
  })

  it('the loud messages are preserved — absence still names the migration to run', () => {
    expect(read('apps/api/src/lib/automatic-work.ts')).toMatch(/migration has not been run/)
    expect(read('apps/api/src/lib/migration-ledger.ts')).toMatch(/does not exist \(run \$\{LEDGER_MIGRATION\}\)/)
  })
})
