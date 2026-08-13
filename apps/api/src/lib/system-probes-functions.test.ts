// EVERY RUNTIME RPC IS ASKED ABOUT — the guard for the #383 class.
//
// #383: a migration file existed from 10 Jul, was never added to the runner, so the atomic
// send counter never existed in production, and every send for 33 days used a racy fallback.
// The System page could ask about tables and columns and had NO WAY to ask about functions.
// That gap was closed for exactly one function. On 13 Aug an audit of every `db.rpc(` call
// found twelve more in the same blind spot — including every function that moves a client's
// money — and `20260706_pool_atomic` sitting unrun since 6 Jul, the same shape as #383.
//
// These tests are the ratchet. Adding a `db.rpc('x')` call without adding `x` to
// REQUIRED_FUNCTIONS now fails the gate, by name, with the file that introduced it.
//
// RED PROOF (run both, both fail before the fix):
//   • delete any entry from REQUIRED_FUNCTIONS      → "every runtime RPC is on the list" fails
//   • give record_reveal_or_refund real args        → "no probe may write" fails
//   • drop 20260706_pool_atomic from the runner     → "pool functions are runnable" fails

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { PENDING_MIGRATIONS } from './pending-migrations'

const LIB = __dirname
const SRC = join(LIB, '..')
const PROBES = readFileSync(join(LIB, 'system-probes.ts'), 'utf8')

/** Every `db.rpc('name')` in the API source, excluding tests. */
function runtimeRpcs(): Set<string> {
  const found = new Set<string>()
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name)
      if (statSync(p).isDirectory()) { walk(p); continue }
      if (!p.endsWith('.ts') || p.includes('.test.')) continue
      for (const m of readFileSync(p, 'utf8').matchAll(/db\.rpc\(\s*'([a-z_]+)'/g)) found.add(m[1])
    }
  }
  walk(SRC)
  return found
}

/** The names listed in REQUIRED_FUNCTIONS, read from the source so the test cannot drift. */
function listedFunctions(): string[] {
  const block = PROBES.slice(PROBES.indexOf('const REQUIRED_FUNCTIONS'), PROBES.indexOf('async function schema('))
  return [...block.matchAll(/name:\s*'([a-z_]+)'/g)].map(m => m[1])
}

describe('every function the product calls at runtime is asked about', () => {
  it('no runtime RPC is missing from REQUIRED_FUNCTIONS — the #383 blind spot, closed', () => {
    const listed = new Set(listedFunctions())
    const missing = [...runtimeRpcs()].filter(fn => !listed.has(fn)).sort()
    expect(missing, `these RPCs are called in production and nothing checks they exist: ${missing.join(', ')}`).toEqual([])
  })

  it('covers all thirteen found on 13 Aug — a shrinking list is a regression, not a tidy-up', () => {
    expect(listedFunctions().length).toBeGreaterThanOrEqual(13)
  })

  it('nothing is listed that is never actually called (a stale probe is noise)', () => {
    const live = runtimeRpcs()
    const dead = listedFunctions().filter(fn => !live.has(fn))
    expect(dead, `listed but never called: ${dead.join(', ')}`).toEqual([])
  })
})

describe('no probe may write, spend, or move money', () => {
  it('record_reveal_or_refund is declared unprobeable, never called', () => {
    // Its first statement is an unguarded INSERT, and the conflict branch credits a wallet.
    // There is no safe argument set — so the page must refuse to call it and say why.
    const entry = PROBES.slice(PROBES.indexOf("name: 'record_reveal_or_refund'"), PROBES.indexOf("name: 'reveal_is_owned'"))
    expect(entry).toContain('args: null')
    expect(entry).toMatch(/unprobeable:/)
    expect(entry).toMatch(/INSERT/)
  })

  it('an unprobeable function reports NOT MEASURED — never OK, never MISSING', () => {
    // Claiming OK would assert something unverified; claiming MISSING would send the founder
    // to re-create a function that is probably there. Both are the #630 defect.
    const loop = PROBES.slice(PROBES.indexOf('for (const fn of REQUIRED_FUNCTIONS)'))
    expect(loop).toMatch(/if \(fn\.args === null\)[\s\S]{0,200}unmeasured/)
  })

  it('every probed money function passes a zero amount or an unmatchable id', () => {
    // The two safe shapes, and nothing else: a guard clause that returns before any write,
    // or a WHERE that matches no row.
    //
    // ⚠️ HARDENED ON VERIFICATION, 13 Aug — the first version sliced a flat 500 characters
    // after the entry's name, which BLED INTO THE NEXT ENTRY: weakening try_charge_wallet's
    // probe to `p_amount: 1` still passed, because increment_wallet's `p_amount: 0` sat
    // inside the window. The slice now ends at the next `name:` line, so each entry is
    // judged on its own args and nothing else. (Red-proved: `p_amount: 1` on
    // try_charge_wallet now fails THIS test by name.)
    for (const [fn, needle] of [
      ['try_charge_wallet', 'p_amount: 0'],
      ['increment_wallet', 'p_amount: 0'],
      ['increment_figsy_credits', 'p_amount: 0'],
      ['try_spend_sourcing', 'p_requested: 0'],
      ['add_sourcing_allowance', 'p_records: 0'],
      ['allocate_pool_to_rep', 'p_amount: 0'],
      ['grant_first_run_credits', 'p_amount: 0'],
    ] as const) {
      const i = PROBES.indexOf(`name: '${fn}'`)
      expect(i, `${fn} not in REQUIRED_FUNCTIONS`).toBeGreaterThan(-1)
      const next = PROBES.indexOf("name: '", i + 1)
      const entry = PROBES.slice(i, next === -1 ? i + 500 : next)
      expect(entry, `${fn} must be probed with ${needle}`).toContain(needle)
    }
  })

  it('every probe targets the all-zeros uuid, which exists nowhere', () => {
    const block = PROBES.slice(PROBES.indexOf('const REQUIRED_FUNCTIONS'), PROBES.indexOf('async function schema('))
    // One entry (record_reveal_or_refund) is args:null; every other must use the sentinel.
    const argLines = [...block.matchAll(/args: \{[^}]*\}/g)].map(m => m[0])
    expect(argLines.length).toBe(listedFunctions().length - 1)
    for (const line of argLines) expect(line).toContain('NO_SUCH_ROW_UUID')
  })
})

describe('the fix instruction is true — Vida can only run what is in the runner', () => {
  it('the page derives runnability from PENDING_MIGRATIONS rather than assuming it', () => {
    // Telling the founder to "run migration X from Vida" when X is not in the runner sends
    // him to a button that will never list it. Read at runtime so it cannot go stale.
    expect(PROBES).toContain("await import('./pending-migrations')")
    expect(PROBES).toMatch(/runnerKeys\.has\(migration\)/)
    expect(PROBES).toMatch(/NOT in the migration runner/)
  })

  it('the pool functions are now genuinely runnable from Vida (#316)', () => {
    expect(PENDING_MIGRATIONS.map(m => m.key)).toContain('20260706_pool_atomic')
  })

  it('#372 is fixed in the runner copy: a bad seat id rolls the pool debit back', () => {
    const entry = PENDING_MIGRATIONS.find(m => m.key === '20260706_pool_atomic')!
    // The row-count check on the REP update is the fix; the subtransaction is what makes
    // returning false safe, because the pool debit is already written by that point.
    expect(entry.sql).toMatch(/get diagnostics v_rows = row_count;[\s\S]*?if v_rows = 0 then[\s\S]*?raise exception/)
    expect(entry.sql).toContain("errcode = 'KIND1'")
    expect(entry.sql).toMatch(/exception when sqlstate 'KIND1' then\s*\n\s*return false;/)
  })

  it('the runner copy and the canonical .sql file agree on both functions', () => {
    const entry = PENDING_MIGRATIONS.find(m => m.key === '20260706_pool_atomic')!
    const file = readFileSync(join(SRC, '../../../supabase/migrations/20260706_pool_atomic.sql'), 'utf8')
    for (const marker of ["errcode = 'KIND1'", 'exception when sqlstate', 'return_rep_to_pool']) {
      expect(entry.sql, `runner copy missing: ${marker}`).toContain(marker)
      expect(file, `canonical file missing: ${marker}`).toContain(marker)
    }
  })
})
