// #614 — THE DOC AND THE CODE CANNOT DRIFT.
//
// `docs/CASHFLOW-LAB.html` is the money model the founder actually maintains — every line is an
// editable box he has corrected against real invoices. The console ignored it and computed
// margin from `estStack = 690` typed into a page. Now the pages read `cost-floor.ts`, and this
// test parses the DOC and asserts the two agree.
//
// Without this the drift is silent and one-directional: he corrects a number in the doc, the
// console keeps the old one, and the console is the thing he looks at.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  PLATFORM_LINES, COMPANY_LINES, ALL_FIXED_LINES,
  PLATFORM_FLOOR_USD, COMPANY_FLOOR_USD, TOTAL_FLOOR_USD,
  STRIPE_ALL_IN_PCT, PER_CLIENT_MONTHLY_USD, basisLabel,
} from './cost-floor'
import { stripCommentsForEnvScan } from './env-inventory'

const DOC = join(__dirname, '../../../../docs/CASHFLOW-LAB.html')

/**
 * Pull the default values out of the doc's number inputs.
 *
 * ⚠️ PARSES `value="N"` ATTRIBUTES ONLY, never prose. The doc quotes its own figures in
 * sentences constantly ("read $138 and was tagged verified", "$50.59, read off the bills"), so
 * a regex over the text would match explanatory history and report drift that does not exist —
 * a checker that cries wolf is one people delete.
 */
function docDefaults(): Record<string, number> {
  const html = readFileSync(DOC, 'utf8')
  const out: Record<string, number> = {}
  const re = /id="((?:f|v|c)_[a-z]+)"\s+value="([0-9.]+)"/g
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) out[m[1]] = parseFloat(m[2])
  return out
}

describe('the cost doc and the cost code agree', () => {
  const doc = docDefaults()

  it('the doc is parseable and not empty (a pass over zero lines proves nothing)', () => {
    expect(Object.keys(doc).length).toBeGreaterThanOrEqual(17)
  })

  it.each(ALL_FIXED_LINES.map(l => [l.id, l.label] as const))(
    'doc and code agree on %s (%s)',
    (id) => {
      const line = ALL_FIXED_LINES.find(l => l.id === id)!
      expect(doc[id], `${id} is in the code but not in docs/CASHFLOW-LAB.html`).toBeDefined()
      expect(doc[id], `${id}: doc says ${doc[id]}, code says ${line.usdPerMonth} — one of them was edited alone`).toBe(line.usdPerMonth)
    },
  )

  it('every fixed line in the doc exists in the code — a new doc line must not be silently ignored', () => {
    const fixedIds = Object.keys(doc).filter(k => k.startsWith('f_') || (k.startsWith('c_') && k !== 'c_overseas'))
    const codeIds = new Set(ALL_FIXED_LINES.map(l => l.id))
    for (const id of fixedIds) {
      expect(codeIds.has(id), `${id} is in the doc but missing from cost-floor.ts — the console would under-count the floor`).toBe(true)
    }
  })

  it('the Stripe rate agrees, and it is the ALL-IN rate not the card fee alone', () => {
    expect(doc['v_stripe']).toBe(STRIPE_ALL_IN_PCT)
    // 3.5 was the card fee with the currency conversion silently missing. If this ever goes
    // back to 3.5, the model has forgotten that we bill USD into a GBP account.
    expect(STRIPE_ALL_IN_PCT).toBeGreaterThan(3.5)
  })

  it('the per-client monthly cost agrees', () => {
    expect(doc['v_inbox']).toBe(PER_CLIENT_MONTHLY_USD)
  })

  it('the subtotals are derived, never typed', () => {
    expect(PLATFORM_FLOOR_USD).toBe(PLATFORM_LINES.reduce((s, l) => s + l.usdPerMonth, 0))
    expect(COMPANY_FLOOR_USD).toBe(COMPANY_LINES.reduce((s, l) => s + l.usdPerMonth, 0))
    expect(TOTAL_FLOOR_USD).toBe(PLATFORM_FLOOR_USD + COMPANY_FLOOR_USD)
  })
})

describe('every line says how we know it', () => {
  it('each line carries a basis and a real note', () => {
    for (const l of ALL_FIXED_LINES) {
      expect(l.note.length, `${l.id} has no note`).toBeGreaterThan(20)
      expect(['verified', 'estimate', 'unverified-secondary']).toContain(l.basis)
    }
  })

  it('EVERY company line is tagged unverified-secondary', () => {
    // gov.uk, ICO, Companies House, Xero and Stripe were all unreachable when these were
    // researched. Re-tagging one `verified` without opening the real page is exactly the $138
    // failure: a confident label on an unread number, which stops everyone else re-checking.
    for (const l of COMPANY_LINES) {
      expect(l.basis, `${l.id} claims more confidence than we have`).toBe('unverified-secondary')
    }
  })

  it('the unverified label says so in words, not just a colour', () => {
    expect(basisLabel('unverified-secondary')).toContain('unverified')
    expect(basisLabel('verified')).toContain('invoice')
  })
})

// ── RED PROOF ② — THE LITERALS ARE GONE ──────────────────────────────────────────────────
describe('the console reads the constants, not typed-in numbers', () => {
  const cockpit = stripCommentsForEnvScan(readFileSync(join(__dirname, '../../../../apps/admin/src/app/cockpit/page.tsx'), 'utf8'))
  const revenue = stripCommentsForEnvScan(readFileSync(join(__dirname, '../../../../apps/admin/src/app/revenue/page.tsx'), 'utf8'))

  it('cockpit no longer hardcodes 690 or 95', () => {
    expect(cockpit).not.toMatch(/estStack\s*=\s*690/)
    expect(cockpit).not.toMatch(/estCostPerClient\s*=\s*95/)
  })

  it('cockpit imports the shared floor', () => {
    // Imported from `@kind/shared`, not a relative path — the admin app cannot reach
    // `apps/api`, which is precisely why the constants live in the shared package.
    expect(cockpit).toContain('TOTAL_FLOOR_USD')
    expect(cockpit).toContain('@kind/shared')
  })

  it('revenue no longer renders the four hardcoded cost strings', () => {
    for (const s of ['~$138', '~$220', '~$180', '~$150']) {
      expect(revenue, `revenue/page.tsx still hardcodes ${s}`).not.toContain(s)
    }
  })

  it('revenue imports the shared floor and renders the lines rather than strings', () => {
    expect(revenue).toContain('ALL_FIXED_LINES')
    expect(revenue).toContain('@kind/shared')
  })
})
