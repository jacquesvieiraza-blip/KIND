// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (resolver-alignment pass) — PHASE A IS A DRY-RUN MODEL OF PHASE B, EXECUTED.
//
// The promotion SQL cannot run in this suite (no Postgres), but its correctness lives in the
// CLASSIFICATION RULES, not the syntax — so those rules are executed here against fixtures.
// The seven red-proofs the founder specified are the seven behaviours pinned below; the SQL
// is bound to this model by structural guards in pool-country-contract.test.ts.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import {
  resolveRowProvider, buildAcquisitions, identityStates, executableSet, healCountryFor,
  type LeadRowModel, type MemoryRowModel,
} from './promotion-resolver'

let seq = 0
const row = (o: Partial<LeadRowModel> & { emailNorm: string }): LeadRowModel => ({
  leadId: `l${++seq}`, createdAt: seq, ...o,
})
const mem = (o: Partial<MemoryRowModel> & { emailNorm: string; source: string }): MemoryRowModel =>
  ({ providerId: null, costUsd: 0.28, ...o })

describe('① ACQUISITION IDENTITY is (provider, provider_id) — never the email', () => {
  it('⚑ SAME EMAIL, SAME PROVIDER, DIFFERENT PROVIDER IDS → two acquisitions → fail closed', () => {
    // `distinct provider = 1` does NOT mean one acquisition: PDL/A and PDL/B are two
    // purchases of the same person. The old min(provider_id) picked one and then resolved
    // cost against that arbitrary choice.
    const rows = [
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: 'GB' }),
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'B', jobTitle: 'CEO', country: 'GB' }),
    ]
    const memory = [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', costUsd: 0.28 }),
                    mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'B', costUsd: 0.28 })]
    const acqs = buildAcquisitions(rows, memory)
    expect(acqs, 'two distinct acquisition identities').toHaveLength(2)
    expect(new Set(acqs.map(a => a.acquisitionKey))).toEqual(new Set(['pdl:A', 'pdl:B']))
    expect(identityStates(acqs, rows, memory).get('x@y.com')).toBe('acquisition_identity_ambiguous')
    expect(executableSet(acqs), 'Phase B must not choose one').toHaveLength(0)
  })

  it('one acquisition with several rows stays ONE identity', () => {
    const rows = [
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: 'GB' }),
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: 'England' }),
    ]
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs).toHaveLength(1)
    expect(executableSet(acqs)).toHaveLength(1)
  })

  it('the house book is its own acquisition record (its rows predate provider ids)', () => {
    const rows = [row({ emailNorm: 'h@y.com', isHouse: true, jobTitle: 'CEO', country: 'US' })]
    const acqs = buildAcquisitions(rows, [])
    expect(acqs[0].acquisitionKey).toBe('apollo:house:h@y.com')
    expect(acqs[0].resolvedCost, 'proven house book → 0').toBe(0)
  })
})

describe('② UNRESOLVED / CUSTOMER ROWS CONTRIBUTE NOTHING', () => {
  it('⚑ an unresolved row cannot leak metadata into the pool row', () => {
    // proven owned row says CEO; an untagged manual row on the same email says Barista.
    const rows = [
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', company: 'Acme', country: 'GB' }),
      row({ emailNorm: 'x@y.com', source: null, providerId: null, jobTitle: 'Barista', company: 'Cafe' }),
    ]
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs).toHaveLength(1)
    expect(acqs[0].metadata.jobTitle, 'metadata comes only from the proven acquisition').toBe('CEO')
    expect(acqs[0].metadata.company).toBe('Acme')
  })

  it('⚑ a CUSTOMER row shares the email but neither poisons nor feeds the owned acquisition', () => {
    const rows = [
      row({ emailNorm: 'x@y.com', source: 'csv_import', jobTitle: 'Barista', company: 'Cafe', country: 'US' }),
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', company: 'Acme', country: 'GB' }),
    ]
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs, 'the CSV row is not an acquisition').toHaveLength(1)
    expect(acqs[0].metadata.jobTitle).toBe('CEO')
    expect(acqs[0].metadata.company).toBe('Acme')
    expect(acqs[0].resolvedCountry, 'the CSV row\'s US must not be seen at all').toBe('united kingdom')
    expect(acqs[0].countryAmbiguous, 'and it must not create a false conflict either').toBe(false)
    expect(executableSet(acqs), 'the owned acquisition may still be promoted').toHaveLength(1)
  })

  it('a customer row ALONE leaves the identity with no owned acquisition', () => {
    const custRows = [row({ emailNorm: 'c@y.com', source: 'csv_import', jobTitle: 'CEO' })]
    const acqs = buildAcquisitions(custRows, [])
    expect(acqs).toHaveLength(0)
    expect(identityStates(acqs, custRows).get('c@y.com')).toBe('customer_only_excluded')
  })

  it('email coincidence in acquisition_memory never corroborates a different provider id', () => {
    const rows = [row({ emailNorm: 'x@y.com', source: null, providerId: 'X', jobTitle: 'CEO' })]
    const memory = [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'Y' })]
    expect(resolveRowProvider(rows[0], memory)).toBeNull()
    expect(buildAcquisitions(rows, memory)).toHaveLength(0)
  })
})

describe('③ COST STATE MACHINE — evidence beats the default', () => {
  it('exactly one recorded cost → that cost', () => {
    const acqs = buildAcquisitions(
      [row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO' })],
      [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', costUsd: 0.31 })])
    expect(acqs[0].resolvedCost).toBe(0.31)
    expect(executableSet(acqs)).toHaveLength(1)
  })

  it('⚑ HOUSE APOLLO WITH CONFLICTING COSTS → cost_ambiguous → NO fallback to 0', () => {
    const rows = [row({ emailNorm: 'h@y.com', isHouse: true, providerId: 'H', jobTitle: 'CEO', country: 'US' })]
    const memory = [mem({ emailNorm: 'h@y.com', source: 'apollo', providerId: 'H', costUsd: 0.10 }),
                    mem({ emailNorm: 'h@y.com', source: 'apollo', providerId: 'H', costUsd: 0.20 })]
    const acqs = buildAcquisitions(rows, memory)
    expect(acqs[0].costAmbiguous).toBe(true)
    expect(acqs[0].resolvedCost, 'the house default must not override the conflict').toBeNull()
    expect(identityStates(acqs, rows, memory).get('h@y.com')).toBe('cost_ambiguous')
    expect(executableSet(acqs)).toHaveLength(0)
  })

  it('no recorded cost and not the house book → cost_unprovable → excluded', () => {
    const acqs = buildAcquisitions(
      [row({ emailNorm: 'x@y.com', source: 'lookalike', providerId: 'A', jobTitle: 'CEO' })], [])
    expect(acqs[0].costUnprovable).toBe(true)
    expect(executableSet(acqs)).toHaveLength(0)
  })
})

describe('④ COUNTRY STATE MACHINE — canonicalise BEFORE distinctness', () => {
  it('⚑ GB + United Kingdom + England → ONE canonical country', () => {
    const rows = ['GB', 'United Kingdom', 'England'].map(c =>
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: c }))
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs[0].distinctCountries, 'raw string counting would say 3').toBe(1)
    expect(acqs[0].resolvedCountry).toBe('united kingdom')
    expect(acqs[0].countryAmbiguous).toBe(false)
  })

  it('US + USA + United States → one', () => {
    const rows = ['US', 'USA', 'United States'].map(c =>
      row({ emailNorm: 'u@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: c }))
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'u@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs[0].resolvedCountry).toBe('united states')
  })

  it('⚑ US + UK → a TRUE conflict → country_ambiguous, no country chosen', () => {
    const rows = ['United States', 'United Kingdom'].map(c =>
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: c }))
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs[0].countryAmbiguous).toBe(true)
    expect(acqs[0].resolvedCountry, 'never earliest, never min').toBeNull()
    // …and it still promotes as geo-unservable inventory, which is the existing pool rule.
    expect(executableSet(acqs)).toHaveLength(1)
  })

  it('NULL + GB → one known country, not ambiguous', () => {
    const rows = [
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: null }),
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: 'GB' }),
    ]
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })])
    expect(acqs[0].countryAmbiguous).toBe(false)
    expect(acqs[0].resolvedCountry).toBe('united kingdom')
  })
})

describe('⑤ ⚑ PHASE A EXACTLY EQUALS PHASE B — the whole point of this pass', () => {
  // The founder's fixture: one of each state, in one dataset.
  const memory: MemoryRowModel[] = [
    mem({ emailNorm: 'ok@y.com',    source: 'pdl',    providerId: 'P1', costUsd: 0.28 }),
    mem({ emailNorm: 'cost@y.com',  source: 'apollo', providerId: 'H1', costUsd: 0.10 }),
    mem({ emailNorm: 'cost@y.com',  source: 'apollo', providerId: 'H1', costUsd: 0.20 }),
    mem({ emailNorm: 'dupe@y.com',  source: 'pdl',    providerId: 'D1', costUsd: 0.28 }),
    mem({ emailNorm: 'dupe@y.com',  source: 'pdl',    providerId: 'D2', costUsd: 0.28 }),
    mem({ emailNorm: 'pooled@y.com', source: 'pdl',   providerId: 'Q1', costUsd: 0.28 }),
  ]
  const rows: LeadRowModel[] = [
    row({ emailNorm: 'ok@y.com',     source: 'pdl', providerId: 'P1', jobTitle: 'CEO', country: 'GB' }),
    row({ emailNorm: 'cost@y.com',   isHouse: true, providerId: 'H1', jobTitle: 'CEO', country: 'US' }),
    row({ emailNorm: 'dupe@y.com',   source: 'pdl', providerId: 'D1', jobTitle: 'CEO', country: 'GB' }),
    row({ emailNorm: 'dupe@y.com',   source: 'pdl', providerId: 'D2', jobTitle: 'CEO', country: 'GB' }),
    row({ emailNorm: 'cust@y.com',   source: 'csv_import', jobTitle: 'CEO', country: 'GB' }),
    row({ emailNorm: 'unk@y.com',    source: null, providerId: null, jobTitle: 'CEO', country: 'GB' }),
    row({ emailNorm: 'pooled@y.com', source: 'pdl', providerId: 'Q1', jobTitle: 'CEO', country: 'GB' }),
  ]
  const acqs = buildAcquisitions(rows, memory, new Set(['pooled@y.com']))
  const states = identityStates(acqs, rows, memory)
  const exec = executableSet(acqs)

  it('every identity lands in exactly the expected state', () => {
    expect(states.get('ok@y.com')).toBe('executable_promotion')
    expect(states.get('cost@y.com')).toBe('cost_ambiguous')
    expect(states.get('dupe@y.com')).toBe('acquisition_identity_ambiguous')
    expect(states.get('cust@y.com'), 'customer data we deliberately exclude').toBe('customer_only_excluded')
    expect(states.get('unk@y.com'), 'history we cannot prove — a different fact').toBe('unknown_only_excluded')
    expect(states.get('pooled@y.com')).toBe('already_in_pool')
  })

  it('⚑ Phase A executable count === Phase B candidate set, exactly', () => {
    const phaseA = [...states.values()].filter(s => s === 'executable_promotion').length
    expect(phaseA, 'A1 says one identity is executable').toBe(1)
    expect(exec, 'Phase B attempts exactly that set').toHaveLength(phaseA)
    expect(exec[0].emailNorm).toBe('ok@y.com')
  })

  it('and A1b projected pool = eligible pool identities + executable', () => {
    const currentEligiblePool = 1                       // 'pooled@y.com'
    expect(currentEligiblePool + exec.length).toBe(2)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 27 Aug (final maintenance-SQL pass) — the four remaining SQL-only defects, executed.
// ═══════════════════════════════════════════════════════════════════════════════════════
describe('⑥ B2 HEAL — fail closed on ANY ambiguity, including ambiguity hidden by a NULL', () => {
  const acq = (o: Partial<{ resolvedCountry: string | null; countryAmbiguous: boolean }>) =>
    ({ resolvedCountry: null, countryAmbiguous: false, ...o }) as never

  it('⚑ A · one clean US acquisition + one INTERNALLY AMBIGUOUS acquisition → NO heal', () => {
    // The exact hole: the ambiguous acquisition resolves to NULL, so a
    // `where resolved_country is not null` filter dropped it and the clean one healed to US.
    // Geography invented by omission.
    expect(healCountryFor([
      acq({ resolvedCountry: 'united states' }),
      acq({ resolvedCountry: null, countryAmbiguous: true }),
    ])).toBeNull()
  })

  it('⚑ B · two proven acquisitions disagree US vs UK → NO heal', () => {
    expect(healCountryFor([
      acq({ resolvedCountry: 'united states' }),
      acq({ resolvedCountry: 'united kingdom' }),
    ])).toBeNull()
  })

  it('⚑ C · one unambiguous GB/UK acquisition → heal to canonical united kingdom', () => {
    const rows = ['GB', 'England'].map(c =>
      row({ emailNorm: 'h@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: c }))
    const acqs = buildAcquisitions(rows, [mem({ emailNorm: 'h@y.com', source: 'pdl', providerId: 'A' })])
    expect(healCountryFor(acqs)).toBe('united kingdom')
  })

  it('agreeing acquisitions (both US, one silent) still heal', () => {
    expect(healCountryFor([
      acq({ resolvedCountry: 'united states' }),
      acq({ resolvedCountry: null }),               // simply had no country — not ambiguous
    ])).toBe('united states')
  })

  it('nothing known at all → no heal', () => {
    expect(healCountryFor([acq({ resolvedCountry: null })])).toBeNull()
    expect(healCountryFor([])).toBeNull()
  })
})

describe('⑦ ROLE METADATA — what Phase A counts is what Phase B writes', () => {
  it('⚑ earliest row blank, later owned row CEO → executable, and the CEO is what is inserted', () => {
    const rows = [
      row({ emailNorm: 'r@y.com', source: 'pdl', providerId: 'A', jobTitle: null, industry: null, seniority: null, country: 'GB' }),
      row({ emailNorm: 'r@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', country: 'GB' }),
    ]
    const memory = [mem({ emailNorm: 'r@y.com', source: 'pdl', providerId: 'A' })]
    const acqs = buildAcquisitions(rows, memory)
    expect(acqs[0].metadata.jobTitle, 'the blank earliest value must be skipped').toBe('CEO')
    expect(acqs[0].hasRole).toBe(true)
    expect(executableSet(acqs)).toHaveLength(1)
    // the invariant: an executable row always carries a real role signal
    for (const a of executableSet(acqs)) {
      expect(!!(a.metadata.jobTitle || a.metadata.industry || a.metadata.seniority)).toBe(true)
    }
  })

  it('⚑ every role field blank across the acquisition → metadata_incomplete, NOT executable', () => {
    const rows = [
      row({ emailNorm: 'b@y.com', source: 'pdl', providerId: 'A', jobTitle: '  ', industry: null, seniority: '', country: 'GB' }),
      row({ emailNorm: 'b@y.com', source: 'pdl', providerId: 'A', jobTitle: null, country: 'GB' }),
    ]
    const memory = [mem({ emailNorm: 'b@y.com', source: 'pdl', providerId: 'A' })]
    const acqs = buildAcquisitions(rows, memory)
    expect(acqs[0].hasRole).toBe(false)
    expect(identityStates(acqs, rows, memory).get('b@y.com')).toBe('metadata_incomplete')
    expect(executableSet(acqs)).toHaveLength(0)
  })
})

describe('⑧ EXCLUSION STATES say WHY, and never mislabel a mixed identity', () => {
  it('customer-only email → customer_only_excluded', () => {
    const rows = [row({ emailNorm: 'c@y.com', source: 'web_form', jobTitle: 'CEO' })]
    expect(identityStates(buildAcquisitions(rows, []), rows).get('c@y.com')).toBe('customer_only_excluded')
  })

  it('provenance-unknown-only email → unknown_only_excluded', () => {
    const rows = [row({ emailNorm: 'u@y.com', source: null, providerId: null, jobTitle: 'CEO' })]
    expect(identityStates(buildAcquisitions(rows, []), rows).get('u@y.com')).toBe('unknown_only_excluded')
  })

  it('both, with no owned acquisition → customer_and_unknown_excluded (never silently one)', () => {
    const rows = [
      row({ emailNorm: 'm@y.com', source: 'csv_import', jobTitle: 'CEO' }),
      row({ emailNorm: 'm@y.com', source: null, providerId: null, jobTitle: 'CTO' }),
    ]
    expect(identityStates(buildAcquisitions(rows, []), rows).get('m@y.com')).toBe('customer_and_unknown_excluded')
  })

  it('⚑ customer row + separately proven owned acquisition → the OWNED one still executes', () => {
    const rows = [
      row({ emailNorm: 'x@y.com', source: 'csv_import', jobTitle: 'Barista', company: 'Cafe', country: 'US' }),
      row({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A', jobTitle: 'CEO', company: 'Acme', country: 'GB' }),
    ]
    const memory = [mem({ emailNorm: 'x@y.com', source: 'pdl', providerId: 'A' })]
    const acqs = buildAcquisitions(rows, memory)
    expect(identityStates(acqs, rows, memory).get('x@y.com'),
      'the customer row must not mislabel this as customer_only').toBe('executable_promotion')
    expect(executableSet(acqs)).toHaveLength(1)
    expect(acqs[0].metadata.jobTitle, 'and it contributes nothing').toBe('CEO')
  })
})
