// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C5 · ONE FIT PREDICATE FOR POOL + APOLLO — AND IT IS ASKED BEFORE A SLOT IS CONSUMED
//
// REQ: *"Six criteria + exclusions applied before a slot is consumed"* (LR 10 · FD-1/2).
//
// ── THE TWO HALVES THIS FILE PROVES, AND WHY THE SECOND IS THE ITEM ─────────────────────
//
// ① ONE PREDICATE. The pool has asked the whole rule since C02; the provider path asked one
//    criterion of seven. Both must ask `structurallyAdmissible(hardFit(…))` — not two matchers
//    that happen to agree today.
//
// ② BEFORE THE SLOT. `applyStructuralGate` already refuses these candidates — but it runs
//    AFTER the insert, and the insert is what consumes `grantedSize`. `grantedSize` is
//    RESERVED entitlement: a programme's `try_reserve_programme_sourcing`, or a prospect's
//    `try_reserve_proof_records` — FORTY RECORDS FOR A PROSPECT'S ENTIRE LIFETIME. A page of
//    40 where 35 are companies the client's own criteria refuse consumed all 40 to show 5,
//    and the 35 were refused for free a few hundred lines later by the same predicate.
//
// ⚠️ THE CLIENT'S SET IS UNCHANGED, AND THAT IS THE PROOF THIS IS SAFE.
// `structurallyAdmissible` is strictly weaker than the gate's `setAsideReason` (which sets
// aside UNKNOWNS too), so every candidate refused here would have been set aside there, and
// `/leads/for-approval` already filters `set_aside_reason IS NULL`. What changes is the slot,
// the lead row and the scoring call — never what reaches the desk.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  splitPreSpendFit, preSpendRefusal, providerContactAsCandidate,
  describePreSpendRefusals, type ProviderContact,
} from './pre-spend-fit'
import { hardFit, setAsideReason, type FitIcp } from './proof-fit'

/** A UK client who wants small marketing agencies, run by their founder, minus two kinds. */
const ICP: FitIcp = {
  geographies: ['United Kingdom'],
  company_sizes: ['11-50'],
  target_category: 'marketing agencies',
  seniority_levels: ['founder', 'c_suite'],
  exclusions: 'no recruitment agencies',
}

const MATCH: ProviderContact = {
  country: 'United Kingdom',
  title: 'Founder',
  seniority: 'founder',
  organization: { name: 'Fathom Marketing Agency', industry: 'Marketing', num_employees: 24 },
}

describe('J5-C5 · every criterion can refuse a provider contact before its slot is spent', () => {
  it('a contact that matches everything is admissible', () => {
    expect(preSpendRefusal(MATCH, ICP)).toBeNull()
  })

  for (const [criterion, contact] of [
    ['geography', { ...MATCH, country: 'Germany' }],
    ['size', { ...MATCH, organization: { ...MATCH.organization, num_employees: 4000 } }],
    ['seniority', { ...MATCH, seniority: 'entry' }],
    ['category', { ...MATCH, organization: { name: 'Brick & Co', industry: 'Construction', num_employees: 24 } }],
  ] as [string, ProviderContact][]) {
    it(`🛑 ${criterion} REFUSES before a slot is consumed — it is not decorative here either`, () => {
      expect(preSpendRefusal(contact, ICP), `${criterion} cannot refuse a provider contact`)
        .toBe(criterion)
    })
  }

  it('🛑 the client\'s EXCLUSIONS refuse too — FD-1 said "in every path" and this is a path', () => {
    // The company NAME is where an exclusion is usually recognisable, and it is the field the
    // pool path had to be given before its own criterion could see anything (J5-C12).
    const excluded: ProviderContact = {
      ...MATCH,
      organization: { name: 'Northgate Recruitment Agencies', industry: 'Marketing', num_employees: 24 },
    }
    expect(preSpendRefusal(excluded, ICP), 'a company the client excluded consumed a slot')
      .toBe('excluded')
  })

  it('🛑 UNKNOWN IS NOT REFUSED — this is the lenient question, deliberately', () => {
    // Apollo's People Search returns availability booleans, never the country itself, so
    // `country` is undefined for every Apollo candidate at this point (AR20). Refusing on an
    // absence would empty a healthy page outright — and would delete the "Worth a look" state
    // (capped at 74, never starred) before it could exist.
    const noCountry: ProviderContact = { ...MATCH, country: null }
    expect(preSpendRefusal(noCountry, ICP), 'an unproven country cost a candidate its slot')
      .toBeNull()

    // ADJACENT EVIDENCE IS THE ORDINARY CASE AND MUST SURVIVE. "Marketing & Advertising"
    // neither establishes nor contradicts "marketing agencies" — `categoryVerdict` answers
    // `unknown`, and an unknown keeps its slot.
    const adjacent: ProviderContact = {
      ...MATCH,
      organization: { name: 'Meridian Group', industry: 'Marketing & Advertising', num_employees: 24 },
    }
    expect(preSpendRefusal(adjacent, { ...ICP, target_category: 'digital marketing agencies' }))
      .toBeNull()

    // And a row with no company evidence at all is judged on nothing, which is not a refusal.
    expect(preSpendRefusal({ title: 'Founder', seniority: 'founder' }, ICP)).toBeNull()
  })

  it('🛑 SIZE COULD NOT REFUSE A PROVIDER CONTACT AT ALL — and that was four criteria, not five', () => {
    // ⛓️ 18 Sep (J5-C5) — the measured defect. `runIcpJob` writes
    // `String(organization.num_employees)` into `leads.company_size` AND `lead_pool`, and
    // `bandIndex` matches only the six ladder LABELS — so `bandIndex('4000')` is -1 and
    // `sizeVerdict` answered **`unknown`** for a four-thousand-person company shown to a
    // client who asked for 11–50. One of the founder's own four canary criteria, unable to
    // refuse anybody the provider had ever returned. Every size case in `proof-fit.test.ts` is
    // written with a ladder label — the one shape this path never produces — which is why it
    // stayed green. Fixed by `headcountBandIndex`, over the SAME ladder.
    expect(hardFit({ company_size: '4000' }, { company_sizes: ['11–50'] }).size).toBe('no')
    expect(hardFit({ company_size: '24' }, { company_sizes: ['11–50'] }).size).toBe('yes')
    // The label spelling is untouched — `lead_pool` rows and the portal still work.
    expect(hardFit({ company_size: '11-50' }, { company_sizes: ['11–50'] }).size).toBe('yes')
    // A value that is not a plain headcount stays honestly unknown rather than guessing.
    expect(hardFit({ company_size: '7 people' }, { company_sizes: ['11–50'] }).size).toBe('unknown')
  })

  it('🛑 IT CAN NEVER REFUSE WHAT THE GATE WOULD ADMIT — the one-way invariant', () => {
    // If this were ever the stricter question, the pre-spend filter would delete candidates
    // the client was entitled to see. Every refusal here must also be a set-aside there.
    const cases: ProviderContact[] = [
      MATCH,
      { ...MATCH, country: 'Germany' },
      { ...MATCH, seniority: 'entry' },
      { ...MATCH, organization: { name: 'Northgate Recruitment Agencies', industry: 'Marketing', num_employees: 24 } },
      { title: 'Founder', seniority: 'founder', organization_name: 'Fathom' },
      { ...MATCH, organization: { name: 'Meridian Group', industry: 'Marketing & Advertising', num_employees: 24 } },
      { ...MATCH, country: null },
      {},
    ]
    for (const c of cases) {
      if (preSpendRefusal(c, ICP) === null) continue
      expect(
        setAsideReason(hardFit(providerContactAsCandidate(c), ICP)),
        'a contact was refused a slot that the structural gate would have surfaced',
      ).toBeTruthy()
    }
  })

  it('a client who stated nothing refuses nobody — a legacy ICP is untouched', () => {
    for (const c of [MATCH, { ...MATCH, country: 'Germany' }, {}]) {
      expect(preSpendRefusal(c, {})).toBeNull()
    }
  })

  it('the split keeps the page intact and counts the refusals by criterion, never by PII', () => {
    const page: ProviderContact[] = [
      MATCH,
      { ...MATCH, seniority: 'entry' },
      { ...MATCH, seniority: 'intern' },
      { ...MATCH, country: 'Germany' },
    ]
    const split = splitPreSpendFit(page, ICP)
    expect(split.admissible).toEqual([MATCH])
    expect(split.refused).toHaveLength(3)
    expect(split.counts).toEqual({ seniority: 2, geography: 1 })
    expect(describePreSpendRefusals(split.counts)).toBe('seniority 2 · geography 1')
    // The input is not mutated — the caller still owes `acquisition_memory` the whole page.
    expect(page).toHaveLength(4)
  })

  it('the contact is mapped to the SAME fields the lead row is written from', () => {
    expect(providerContactAsCandidate({
      country: 'United Kingdom', title: 'CEO', seniority: 'c_suite',
      organization: { name: 'Fathom', industry: 'Marketing', num_employees: 24 },
    })).toEqual({
      country: 'United Kingdom', job_title: 'CEO', seniority: 'c_suite',
      company: 'Fathom', industry: 'Marketing', company_size: '24',
    })
    // `organization_name` is the flat spelling both providers sometimes return instead.
    expect(providerContactAsCandidate({ organization_name: 'Fathom' }).company).toBe('Fathom')
    // An absent headcount is NULL, never the string "undefined" — which would match no band
    // and turn a silent row into a refusal.
    expect(providerContactAsCandidate({ organization: { name: 'F' } }).company_size).toBeNull()
  })
})

// ── THE WIRING. A predicate nothing calls before the reservation is a predicate that changed
//    nothing, and the whole item is WHERE it is asked. ───────────────────────────────────
describe('J5-C5 · the provider path asks it, and asks it first', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  const ICPS = code('../routes/icps.ts')

  it('🛑 BOTH PATHS ASK THE SAME PREDICATE — not two matchers that agree today', () => {
    for (const p of ['./pool-sourcing.ts', './pre-spend-fit.ts']) {
      expect(code(p), `${p} decides fit without the one canonical predicate`)
        .toMatch(/structurallyAdmissible\(\s*(hardFit\(|fit\))/)
    }
  })

  it('🛑 the split runs BEFORE the reconcile that spends the reservation', () => {
    const split = ICPS.indexOf('splitPreSpendFit(contacts')
    const reconcile = ICPS.indexOf('const returnedCount =')
    expect(split, 'the provider page is never judged before the slot is spent').toBeGreaterThan(-1)
    expect(reconcile, 'the reconcile moved — this guard must be repointed').toBeGreaterThan(-1)
    expect(split, 'the fit is judged AFTER the reservation has already been consumed')
      .toBeLessThan(reconcile)
  })

  it('🛑 and BEFORE the granted-budget cap, which is what a slot actually is', () => {
    const refusal = ICPS.indexOf('refusedPreSpend.has(contact)')
    const cap = ICPS.indexOf('if (pdlKept >= grantedSize)')
    expect(refusal, 'the insertion loop never refuses a pre-spend rejection').toBeGreaterThan(-1)
    expect(cap, 'the granted-budget cap moved — this guard must be repointed').toBeGreaterThan(-1)
    expect(refusal, 'a refused candidate is still counted against the granted budget')
      .toBeLessThan(cap)
  })

  it('🛑 the RESERVATION is reconciled on what may be kept — for the PREPAID provider only', () => {
    // PDL bills per record RETURNED, so its reservation is spent by the page whatever we then
    // do with it, and refunding there would book a negative ledger row for money we did spend.
    // Apollo is prepaid — its reservation should consume what became a usable lead, which is
    // the same reasoning HOUSE-009 already applied to `settleBatch`.
    expect(ICPS, 'a refused Apollo candidate still burns a reserved record')
      .toMatch(/sourcingProvider === 'pdl'[\s\S]{0,200}preSpend\.admissible\.length/)
  })

  it('🛑 the page is NOT shrunk before `acquisition_memory` — R67 outranks this filter', () => {
    // R67: every paid identity is remembered BEFORE any client gate can drop it. The split is
    // pure and the caller keeps the whole page; a `contacts = preSpend.admissible` here would
    // make us forget identities we already own.
    expect(ICPS, 'the provider page was filtered before the identities were remembered')
      .not.toMatch(/contacts\s*=\s*preSpend\.admissible/)
    const remembered = ICPS.indexOf('rememberAcquiredIdentities')
    const refusal = ICPS.indexOf('refusedPreSpend.has(contact)')
    expect(remembered).toBeGreaterThan(-1)
    expect(refusal, 'the refusal drops contacts before they are remembered').toBeGreaterThan(remembered)
  })

  it('🛑 `providerContactsReturned` still records what the PROVIDER handed us', () => {
    // The neutral-review decision reads it: "a completed search that K.I.N.D's own gates
    // emptied" must never be reported as "your targeting matched nobody". Recording the
    // post-filter count here would make a refused page look like a thin one.
    expect(ICPS).toMatch(/providerContactsReturned = contacts\.length/)
  })

  it('the run SAYS how many it refused and on which criteria — counts only, no PII', () => {
    expect(ICPS).toMatch(/stage=pre_spend_refused/)
    expect(ICPS, 'the emptied-run alert cannot name the new variant')
      .toMatch(/refusedBeforeSpend > 0/)
  })

  it('the judgement is made against the targeting THE SEARCH ACTUALLY USED', () => {
    // The widened proof pass drops seniority and size on purpose. Judging its results against
    // the ICP as saved would refuse exactly what the widening existed to find.
    expect(ICPS).toMatch(/icpAsSearched\s*=\s*widened/)
    expect(ICPS).toMatch(/splitPreSpendFit\(contacts, icpAsSearched/)
  })
})
