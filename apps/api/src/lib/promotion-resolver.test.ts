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
  resolveRowProvider, buildAcquisitions, identityStates, executableSet,
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
    expect(identityStates(acqs, ['x@y.com']).get('x@y.com')).toBe('acquisition_identity_ambiguous')
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
    const acqs = buildAcquisitions([row({ emailNorm: 'c@y.com', source: 'csv_import', jobTitle: 'CEO' })], [])
    expect(acqs).toHaveLength(0)
    expect(identityStates(acqs, ['c@y.com']).get('c@y.com')).toBe('no_owned_acquisition_excluded')
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
    expect(identityStates(acqs, ['h@y.com']).get('h@y.com')).toBe('cost_ambiguous')
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
  const emails = [...new Set(rows.map(r => r.emailNorm))]
  const acqs = buildAcquisitions(rows, memory, new Set(['pooled@y.com']))
  const states = identityStates(acqs, emails)
  const exec = executableSet(acqs)

  it('every identity lands in exactly the expected state', () => {
    expect(states.get('ok@y.com')).toBe('executable_promotion')
    expect(states.get('cost@y.com')).toBe('cost_ambiguous')
    expect(states.get('dupe@y.com')).toBe('acquisition_identity_ambiguous')
    expect(states.get('cust@y.com')).toBe('no_owned_acquisition_excluded')
    expect(states.get('unk@y.com')).toBe('no_owned_acquisition_excluded')
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
