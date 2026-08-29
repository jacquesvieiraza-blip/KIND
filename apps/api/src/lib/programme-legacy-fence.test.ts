import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// ── THE LEGACY FENCE — two money models, running side by side, never reading each other ──
//
// Two commercial models exist in this repo at once, and both are correct:
//
//   LIVE LEGACY   — $299 pack · first 100 approvals included · $4 per approved lead.
//                   What actually runs today, and what actually charges clients.
//   PROGRAMME     — targeted booked meetings on the R81 curve, 50/50, contribution-based
//                   partner commission. Founder-approved, UNBUILT as live truth (R74).
//
// ⚠️ THE FENCE EXISTS BECAUSE R68 ALREADY PROVED WHAT HAPPENS WITHOUT ONE. The $4 price
// lives in THREE places — `constants/index.ts:219`, `integrity-checks.ts:50` and
// `approve-lead.ts:22` — and the partner commission derives from the SHARED one while the
// charge reads the LOCAL one. Change one alone and a partner is paid $2 on a $4 sale: a 50%
// commission, from a one-line edit that looked complete. That is what two money models
// touching each other does, and it happened inside a single model. Two models is worse.
//
// So this file asserts a PARTITION, in both directions:
//   ① no programme module imports or names a legacy money constant;
//   ② no legacy money module imports the programme curve.
//
// ⚠️ AND IT MUST FAIL IF IT FINDS NOTHING TO CHECK. A fence that quietly passes because the
// directory moved, a file was renamed, or the glob stopped matching is worse than no fence —
// it reports safety it never verified. That is the #617 shape, and the first assertion below
// is aimed squarely at it.

const LIB = join(__dirname)
const ROUTES = join(__dirname, '../routes')
const SHARED = join(__dirname, '../../../../packages/shared/src')

/** Source with comments stripped — a comment NAMING a banned constant is not a usage. */
function code(text: string): string {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
}

function readIf(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null
}

/**
 * Every programme module. Discovered by NAME, then verified non-empty — the discovery is
 * what the first test guards.
 */
function programmeModules(): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const dir of [LIB, ROUTES]) {
    for (const f of readdirSync(dir)) {
      if (!f.startsWith('programme')) continue
      if (!f.endsWith('.ts') || f.endsWith('.test.ts')) continue
      out.push([f, readFileSync(join(dir, f), 'utf8')])
    }
  }
  const curve = readIf(join(SHARED, 'programme-pricing.ts'))
  if (curve) out.push(['programme-pricing.ts', curve])
  return out
}

/** The legacy money constants. A programme module naming any of these is the defect. */
const LEGACY_MONEY = [
  'LEAD_PRICE_USD',
  'PACK_PRICE_USD',
  'PACK_LEADS',
  'PARTNER_COMMISSION_PER_LEAD_USD',
  'PARTNER_COMMISSION_PCT',
  'PRICE_PER_LEAD_USD',
]

/** The programme curve's exported names. A legacy money module naming any is the defect. */
const PROGRAMME_CURVE = [
  'programmeTotalCents',
  'pricePerMeetingUsd',
  'quoteProgramme',
  'firstPaymentCents',
  'secondPaymentCents',
  'programmeStripeAmountCents',
  'LEADS_PER_TARGETED_MEETING',
]

describe('⓪ the fence is actually looking at something', () => {
  it('⚠️ FAILS IF NO PROGRAMME MODULES ARE FOUND — a fence that checks nothing proves nothing', () => {
    // Delete or rename every programme file and this test goes red, instead of the whole
    // suite going green because there was nothing left to violate the rule.
    const mods = programmeModules()
    expect(mods.length, 'no programme modules found — the fence is checking nothing').toBeGreaterThanOrEqual(3)
    for (const [name, src] of mods) {
      expect(src.length, `${name} is empty`).toBeGreaterThan(500)
    }
  })

  it('the legacy money modules are still where the fence expects them', () => {
    // The other half of the same problem: if these moved, direction ② silently stops testing.
    expect(readIf(join(LIB, 'approve-lead.ts')), 'approve-lead.ts missing').not.toBeNull()
    expect(readIf(join(SHARED, 'constants/index.ts')), 'shared constants missing').not.toBeNull()
    expect(readIf(join(LIB, 'stripe.ts')), 'lib/stripe.ts missing').not.toBeNull()
  })
})

describe('① no programme module reads legacy money', () => {
  for (const constant of LEGACY_MONEY) {
    it(`no programme module names ${constant}`, () => {
      const offenders = programmeModules()
        .filter(([, src]) => new RegExp(`\\b${constant}\\b`).test(code(src)))
        .map(([name]) => name)
      expect(
        offenders,
        `${offenders.join(', ')} reads ${constant} — programme money comes from the R81 curve, ` +
        'and a programme priced off a legacy constant is the R68 defect with a second model attached.',
      ).toEqual([])
    })
  }

  it('⚠️ AND NO PROGRAMME MODULE HARD-CODES A LEGACY PRICE AS A LITERAL', () => {
    // Importing the constant is the obvious violation. Typing `299` or `4` into programme
    // code is the same defect wearing a different hat, and it is the one a constant-name
    // check misses entirely.
    for (const [name, src] of programmeModules()) {
      const body = code(src)
      expect(body, `${name} hard-codes the legacy $299 pack price`).not.toMatch(/=\s*299\b/)
      expect(body, `${name} hard-codes the legacy 100-lead pack size`).not.toMatch(/PACK[_A-Z]*\s*=\s*100\b/)
    }
  })
})

describe('② no legacy money module reads the programme curve', () => {
  const LEGACY_MODULES = [
    ['approve-lead.ts', join(LIB, 'approve-lead.ts')],
    ['integrity-checks.ts', join(LIB, 'integrity-checks.ts')],
    ['lead-sale-commission.ts', join(LIB, 'lead-sale-commission.ts')],
    ['stripe.ts', join(LIB, 'stripe.ts')],
    ['onboarding-pack.ts', join(LIB, 'onboarding-pack.ts')],
  ] as const

  for (const [name, path] of LEGACY_MODULES) {
    it(`${name} does not import the programme curve`, () => {
      const src = readIf(path)
      if (src === null) return // covered by ⓪ for the modules that must exist
      const hits = PROGRAMME_CURVE.filter(fn => new RegExp(`\\b${fn}\\b`).test(code(src)))
      expect(
        hits,
        `${name} names ${hits.join(', ')} — the legacy model must keep charging $4 while the ` +
        'programme model is unbuilt, and a legacy path reaching for the curve is how a live ' +
        'client gets billed on an unshipped price.',
      ).toEqual([])
    })
  }

  it('⚠️ lib/stripe.ts stays legacy-only — which is WHY programme checkout is its own module', () => {
    // `lib/stripe.ts` imports PACK_LEADS. Putting programme checkout in it would have forced
    // an exception into this fence, and a partition with an exception is not a partition.
    // `programme-checkout.ts` exists for exactly this reason.
    const legacyStripe = readIf(join(LIB, 'stripe.ts'))!
    expect(code(legacyStripe)).toContain('PACK_LEADS')
    expect(code(legacyStripe), 'programme checkout must not live in the legacy Stripe module')
      .not.toMatch(/createProgrammeCheckoutSession/)
    expect(readIf(join(LIB, 'programme-checkout.ts')), 'programme-checkout.ts must exist').not.toBeNull()
  })
})

describe('③ the legacy model is PRESERVED, not deleted', () => {
  it('every legacy money constant still exists and still holds its live value', () => {
    // The fence must not be satisfiable by deleting the legacy model. $299/100/$4 is LIVE
    // commercial truth until the coordinated migration ships (R74) — these are the numbers
    // that actually charge clients today.
    const constants = readFileSync(join(SHARED, 'constants/index.ts'), 'utf8')
    expect(constants).toMatch(/PACK_LEADS\s*=\s*100\b/)
    expect(constants).toMatch(/PACK_PRICE_USD\s*=\s*299\b/)
    expect(constants).toMatch(/LEAD_PRICE_USD\s*=\s*4\b/)
    expect(constants).toMatch(/PARTNER_COMMISSION_PCT\s*=\s*25\b/)
  })

  it('the local charging constant is still what takes the money', () => {
    // R68 names `approve-lead.ts` as the literal that actually charges the wallet. If the
    // programme work had quietly removed it, the live model would stop billing.
    const approve = readFileSync(join(LIB, 'approve-lead.ts'), 'utf8')
    expect(approve).toMatch(/PRICE_PER_LEAD_USD\s*=\s*4\b/)
  })

  it('the legacy sourcing branch survives inside the gate, byte-for-byte', () => {
    // The programme authority gate rewrote `try_spend_sourcing`. The legacy branch inside it
    // must still be the original logic — a legacy client's sourcing behaviour is not allowed
    // to move because a second model arrived.
    const migration = readFileSync(
      join(__dirname, '../../../../supabase/migrations/20260828_programme_money_engine.sql'), 'utf8')
    for (const legacyLine of [
      'SELECT pdl_monthly_cap_usd INTO v_cap_usd FROM public.money_settings WHERE id = 1;',
      'v_day_room := GREATEST(0, v_daily_cap - v_day_used);',
      'SELECT COALESCE(sourcing_allowance, 0) INTO v_allowance',
      'SET sourcing_allowance = sourcing_allowance - v_granted',
    ]) {
      expect(migration, `the legacy branch lost: ${legacyLine}`).toContain(legacyLine)
    }
  })
})
