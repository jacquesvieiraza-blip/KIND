import { describe, it, expect } from 'vitest'
import {
  poolRecordMatchesIcp, splitPoolAndRemainder, isPoolRecordStale,
  POOL_FRESHNESS_MS, poolWriteAllowed, type PoolRecord,
} from './pool-sourcing'

const rec = (over: Partial<PoolRecord>): PoolRecord => ({ email_norm: 'a@b.com', ...over })

describe('poolRecordMatchesIcp — OR-generous candidate predicate', () => {
  it('matches on title within the geography', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'South Africa', title: 'Chief Technology Officer' }),
      { geographies: ['South Africa'], job_titles: ['CTO', 'Chief Technology'] },
    )).toBe(true)
  })

  it('matches on industry even when the title does not match', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'Kenya', title: 'Operations Lead', industry: 'Financial Services' }),
      { geographies: ['Kenya'], job_titles: ['CTO'], industries: ['Financial'] },
    )).toBe(true)
  })

  it('matches on seniority (OR-generous third arm)', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'Nigeria', seniority: 'cxo' }),
      { geographies: ['Nigeria'], seniority_levels: ['cxo'] },
    )).toBe(true)
  })

  it('is case-insensitive on every field', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'south africa', title: 'head of sales' }),
      { geographies: ['SOUTH AFRICA'], job_titles: ['HEAD OF SALES'] },
    )).toBe(true)
  })

  it('rejects when the geography does not match (geography is a hard gate)', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'United States', title: 'CTO' }),
      { geographies: ['South Africa'], job_titles: ['CTO'] },
    )).toBe(false)
  })

  it('rejects when neither title, industry nor seniority matches', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'South Africa', title: 'Barista', industry: 'Hospitality', seniority: 'entry' }),
      { geographies: ['South Africa'], job_titles: ['CTO'], industries: ['SaaS'], seniority_levels: ['cxo'] },
    )).toBe(false)
  })

  it('ignores the geography gate when the ICP has no geographies', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'Anywhere', title: 'CTO' }),
      { job_titles: ['CTO'] },
    )).toBe(true)
  })

  it('matches on geography alone when the ICP has no role/industry/seniority signal', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: 'South Africa', title: 'Whatever' }),
      { geographies: ['South Africa'] },
    )).toBe(true)
  })

  it('does not crash on null fields', () => {
    expect(poolRecordMatchesIcp(
      rec({ country: null, title: null, industry: null, seniority: null }),
      { geographies: ['South Africa'], job_titles: ['CTO'] },
    )).toBe(false)
  })
})

describe('splitPoolAndRemainder — serve pool free, source only the rest', () => {
  it('serves the whole target from a deep pool, no PDL remainder', () => {
    expect(splitPoolAndRemainder(20, 100)).toEqual({ poolServe: 20, pdlRemainder: 0 })
  })

  it('serves what the pool has and sends the leftover to PDL', () => {
    expect(splitPoolAndRemainder(20, 8)).toEqual({ poolServe: 8, pdlRemainder: 12 })
  })

  it('empty pool → serve nothing, whole target goes to PDL (byte-identical path)', () => {
    expect(splitPoolAndRemainder(20, 0)).toEqual({ poolServe: 0, pdlRemainder: 20 })
  })

  it('never over-serves or returns negatives', () => {
    expect(splitPoolAndRemainder(0, 50)).toEqual({ poolServe: 0, pdlRemainder: 0 })
    expect(splitPoolAndRemainder(-5, 50)).toEqual({ poolServe: 0, pdlRemainder: 0 })
    expect(splitPoolAndRemainder(10, -3)).toEqual({ poolServe: 0, pdlRemainder: 10 })
  })

  it('serve + remainder always equals the (clamped) target', () => {
    for (const [t, a] of [[20, 5], [7, 7], [3, 100], [50, 0]] as const) {
      const { poolServe, pdlRemainder } = splitPoolAndRemainder(t, a)
      expect(poolServe + pdlRemainder).toBe(t)
    }
  })
})

describe('isPoolRecordStale — 6-month freshness horizon', () => {
  const now = Date.parse('2026-07-10T00:00:00Z')

  it('is fresh when re-verified within 6 months', () => {
    expect(isPoolRecordStale(rec({ last_verified_at: '2026-06-01T00:00:00Z' }), now)).toBe(false)
  })

  it('is stale when the last verification is older than 6 months', () => {
    expect(isPoolRecordStale(rec({ last_verified_at: '2025-01-01T00:00:00Z' }), now)).toBe(true)
  })

  it('falls back to sourced_at when never re-verified', () => {
    expect(isPoolRecordStale(rec({ last_verified_at: null, sourced_at: '2026-07-01T00:00:00Z' }), now)).toBe(false)
    expect(isPoolRecordStale(rec({ last_verified_at: null, sourced_at: '2024-01-01T00:00:00Z' }), now)).toBe(true)
  })

  it('treats missing/garbage timestamps as stale without throwing', () => {
    expect(isPoolRecordStale(rec({ last_verified_at: null, sourced_at: null }), now)).toBe(true)
    expect(isPoolRecordStale(rec({ last_verified_at: 'not-a-date' }), now)).toBe(true)
  })

  it('uses the exported 6-month horizon by default', () => {
    const justOver = now - POOL_FRESHNESS_MS - 1000
    expect(isPoolRecordStale(rec({ last_verified_at: new Date(justOver).toISOString() }), now)).toBe(true)
  })
})

describe('poolWriteAllowed — the pool holds only bought records', () => {
  it('BLOCKS a demo run from ever writing to the pool', () => {
    expect(poolWriteAllowed(true, 50)).toBe(false)
    expect(poolWriteAllowed(true, 0)).toBe(false)
  })
  it('allows a real (non-demo) run with records', () => {
    expect(poolWriteAllowed(false, 50)).toBe(true)
  })
  it('skips when there is nothing to write', () => {
    expect(poolWriteAllowed(false, 0)).toBe(false)
  })
})
