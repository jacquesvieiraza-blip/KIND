import { describe, it, expect } from 'vitest'
import { assertSameClient, NexusFenceError, autoTuneReady, nexusTuneGate } from './nexus-guard'

// #511 Phase 3 guardrails — the two guarantees that MUST hold before any auto-tuning ships.

describe('assertSameClient — THE FENCE (per-client isolation is the product)', () => {
  it('passes when source and target are the same client', () => {
    expect(() => assertSameClient('client-A', 'client-A')).not.toThrow()
  })
  it('THROWS when one client\'s learnings would touch another client', () => {
    expect(() => assertSameClient('client-A', 'client-B')).toThrow(NexusFenceError)
  })
  it('throws on empty/missing ids (fail-closed)', () => {
    expect(() => assertSameClient('', 'client-A')).toThrow(NexusFenceError)
    expect(() => assertSameClient('client-A', '')).toThrow(NexusFenceError)
  })
})

describe('autoTuneReady — CONFIDENCE GATE (tune on signal, not noise)', () => {
  it('blocks a still-learning profile', () => {
    expect(autoTuneReady({ confidence: 'learning', sample_worked: 500, sample_meetings: 20 }).ready).toBe(false)
    expect(autoTuneReady({ confidence: 'emerging', sample_worked: 100, sample_meetings: 5 }).ready).toBe(false)
  })
  it('blocks a confident profile with too few booked meetings', () => {
    expect(autoTuneReady({ confidence: 'confident', sample_worked: 300, sample_meetings: 1 }).ready).toBe(false)
  })
  it('blocks a confident profile with too few worked leads', () => {
    expect(autoTuneReady({ confidence: 'confident', sample_worked: 20, sample_meetings: 10 }).ready).toBe(false)
  })
  it('allows only a confident profile with real booked outcomes', () => {
    expect(autoTuneReady({ confidence: 'confident', sample_worked: 300, sample_meetings: 8 }).ready).toBe(true)
  })
})

describe('nexusTuneGate — default-deny combined gate', () => {
  const ready = { confidence: 'confident' as const, sample_worked: 300, sample_meetings: 8 }
  it('global kill wins over everything → off', () => {
    expect(nexusTuneGate(ready, true, true)).toMatchObject({ state: 'off', allowed: false })
  })
  it('client disabled (the default) → off', () => {
    expect(nexusTuneGate(ready, false, false)).toMatchObject({ state: 'off', allowed: false })
  })
  it('enabled but thin data → learning, not allowed', () => {
    expect(nexusTuneGate({ confidence: 'learning', sample_worked: 5, sample_meetings: 0 }, true, false))
      .toMatchObject({ state: 'learning', allowed: false })
  })
  it('enabled + enough signal → ready, allowed', () => {
    expect(nexusTuneGate(ready, true, false)).toMatchObject({ state: 'ready', allowed: true })
  })
})
