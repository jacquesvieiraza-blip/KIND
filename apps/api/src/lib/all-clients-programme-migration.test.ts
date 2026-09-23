// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 23 Sep (R137) — `20260923_all_clients_programme`: EVERY ACCOUNT IS ON THE PROGRAMME
//
// Founder, verbatim: *"the 299/4 is retired/ this must go. everything must be updated to new
// programme pricing model."*
//
// This is the first CONTRACTING migration on `clients.commercial_model`: it writes rows. So the
// shape that makes it safe is asserted here, against the constant the runner executes:
//   ① what each row held is RECORDED before it is overwritten — nothing is lost;
//   ② only rows that are not already 'programme' are touched, and only those two columns;
//   ③ the database then refuses the retired states for good — DEFAULT, NOT NULL, CHECK;
//   ④ it is idempotent (the runner can replay it with `force`);
//   ⑤ no money column, and no other table, is touched.
//
// ⚠️ IT DOES NOT EXECUTE SQL — nothing in this suite can. The real-database harness does.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '../../../..')
const KEY = '20260923_all_clients_programme'
const RUNNER = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
const CANON = readFileSync(join(REPO, `supabase/migrations/${KEY}.sql`), 'utf8')

/** The entry's executable SQL, from the constant the runner actually runs. */
const SQL = (() => {
  const i = RUNNER.indexOf(`key: '${KEY}'`)
  if (i < 0) return ''
  return RUNNER.slice(RUNNER.indexOf('sql: `', i) + 6, RUNNER.indexOf('`.trim(),', i)).trim()
})()
/** SQL with `--` comment lines removed, so prose cannot satisfy or break an assertion. */
const CODE = SQL.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')

describe('the R137 migration (20260923_all_clients_programme)', () => {
  it('is registered in the runner, and the canonical file carries its SQL verbatim', () => {
    expect(SQL.length, 'the runner entry is missing').toBeGreaterThan(200)
    // Everything after the leading `--` header is what a database would see.
    const body = (t: string) => {
      const lines = t.split('\n'); let i = 0
      while (i < lines.length && (lines[i].trim().startsWith('--') || lines[i].trim() === '')) i++
      return lines.slice(i).join('\n').trim()
    }
    const unescape = (t: string) => t.replace(/\\`/g, '`').replace(/\\\$\{/g, '${')
    expect(body(CANON), 'file and runner have drifted').toBe(body(unescape(SQL)))
    expect(CANON).toContain('DOES NOT RUN')
  })

  it('🛑 ① WHAT EACH ROW HELD IS RECORDED, IN THE SAME STATEMENT THAT OVERWRITES IT', () => {
    expect(CODE).toContain('ADD COLUMN IF NOT EXISTS commercial_model_before_r137 text;')
    const upd = CODE.slice(CODE.indexOf('UPDATE public.clients'), CODE.indexOf(';', CODE.indexOf('UPDATE public.clients')))
    expect(upd, 'the prior value is kept, and NULL is named rather than lost')
      .toContain("commercial_model_before_r137 = COALESCE(commercial_model, 'unclassified')")
    expect(upd).toContain("commercial_model = 'programme'")
    // The record is written BEFORE the overwrite within the SET list — Postgres evaluates every
    // right-hand side against the OLD row, so this reads the pre-R137 value either way; the order
    // is asserted so a reader never has to know that.
    expect(upd.indexOf('commercial_model_before_r137 ='))
      .toBeLessThan(upd.indexOf("commercial_model = 'programme'"))
  })

  it('🛑 ② ONLY ROWS THAT ARE NOT ALREADY PROGRAMME, AND ONLY THE TWO MODEL COLUMNS', () => {
    const upd = CODE.slice(CODE.indexOf('UPDATE public.clients'), CODE.indexOf(';', CODE.indexOf('UPDATE public.clients')))
    expect(upd).toContain("WHERE commercial_model IS DISTINCT FROM 'programme'")
    const set = upd.slice(upd.indexOf('SET'), upd.indexOf('WHERE'))
    const cols = [...set.matchAll(/([a-z_0-9]+)\s*=/g)].map(m => m[1])
    expect(cols).toEqual(['commercial_model_before_r137', 'commercial_model'])
    expect((CODE.match(/\bUPDATE\b/gi) ?? []).length, 'one UPDATE, not a sweep of several').toBe(1)
  })

  it('🛑 ③ THE DATABASE REFUSES THE RETIRED STATES FROM HERE ON', () => {
    expect(CODE).toContain("ALTER COLUMN commercial_model SET DEFAULT 'programme'")
    expect(CODE).toContain('ALTER COLUMN commercial_model SET NOT NULL')
    expect(CODE).toContain('ADD CONSTRAINT clients_commercial_model_programme_only')
    expect(CODE).toContain("CHECK (commercial_model = 'programme')")
    // ⚠️ THE BACKFILL PRECEDES NOT NULL — the other order fails on every NULL row.
    expect(CODE.indexOf('UPDATE public.clients')).toBeLessThan(CODE.indexOf('SET NOT NULL'))
    expect(CODE.indexOf('UPDATE public.clients')).toBeLessThan(CODE.indexOf('ADD CONSTRAINT'))
    // One constraint, one owner: C1's constraint keeps its own name and is not redefined here.
    expect(CODE).not.toContain('clients_commercial_model_check')
  })

  it('🛑 ④ IDEMPOTENT — the constraint is guarded, the column is IF NOT EXISTS, the UPDATE is a no-op on replay', () => {
    expect(CODE).toMatch(/EXCEPTION WHEN duplicate_object THEN NULL;/)
    expect(CODE).not.toMatch(/DROP\s+CONSTRAINT/i)
    expect(CODE).not.toMatch(/DROP\s+COLUMN/i)
  })

  it('🛑 ⑤ ONE TABLE, AND NO MONEY COLUMN — wallets, credits and history are untouched', () => {
    const altered = [...CODE.matchAll(/(?:ALTER\s+TABLE|UPDATE)\s+public\.([a-z_]+)/gi)].map(m => m[1].toLowerCase())
    expect([...new Set(altered)]).toEqual(['clients'])
    for (const banned of ['wallet_balance_usd', 'credit_balance', 'seat_budget', 'credit_pool', 'plan ', 'DELETE', 'INSERT']) {
      expect(CODE, `${banned} must not appear`).not.toContain(banned)
    }
  })
})
