import { describe, it, expect } from 'vitest'
import { computeExcludedClientIds, HOUSE_ACCOUNT_EMAIL, type MinClient } from './real-clients-logic'

const c = (id: string, over: Partial<MinClient> = {}): MinClient => ({
  id, user_id: `u-${id}`, is_demo: false, ...over,
})

describe('computeExcludedClientIds — demo ∪ house never count toward revenue', () => {
  it('excludes demo clients', () => {
    const { excludedClientIds, demoClientIds } = computeExcludedClientIds(
      [c('a', { is_demo: true }), c('b', { is_demo: false })],
      new Set(),
    )
    expect(demoClientIds).toEqual(new Set(['a']))
    expect(excludedClientIds.has('a')).toBe(true)
    expect(excludedClientIds.has('b')).toBe(false)
  })

  it('excludes the house account by its owning auth-user id (even when is_demo=false)', () => {
    const { excludedClientIds, houseClientIds } = computeExcludedClientIds(
      [c('house', { user_id: 'u-house', is_demo: false }), c('real', { user_id: 'u-real' })],
      new Set(['u-house']),
    )
    expect(houseClientIds).toEqual(new Set(['house']))
    expect(excludedClientIds.has('house')).toBe(true)
    expect(excludedClientIds.has('real')).toBe(false)
  })

  it('excludes a client that is BOTH demo and house without double-trouble', () => {
    const { excludedClientIds, demoClientIds, houseClientIds } = computeExcludedClientIds(
      [c('x', { user_id: 'u-x', is_demo: true })],
      new Set(['u-x']),
    )
    expect(demoClientIds.has('x')).toBe(true)
    expect(houseClientIds.has('x')).toBe(true)
    expect([...excludedClientIds]).toEqual(['x'])
  })

  it('a real paying client is NEVER excluded', () => {
    const { excludedClientIds } = computeExcludedClientIds(
      [c('pays', { user_id: 'u-pays', is_demo: false })],
      new Set(['u-someone-else']),
    )
    expect(excludedClientIds.size).toBe(0)
  })

  it('handles null user_id / null is_demo without throwing or mis-including', () => {
    const { excludedClientIds } = computeExcludedClientIds(
      [{ id: 'n', user_id: null, is_demo: null }],
      new Set(['u-house']),
    )
    expect(excludedClientIds.size).toBe(0)
  })

  it('empty input → empty exclusions', () => {
    const { excludedClientIds } = computeExcludedClientIds([], new Set())
    expect(excludedClientIds.size).toBe(0)
  })

  it('house email constant is the founder testing account, lower-cased', () => {
    // ⛓️ 24 Sep (R152) — WAS 'hello@get-kind.com'. The founder ordered a new House account; the old
    // address stays House (its history is never revenue) but is no longer the login.
    expect(HOUSE_ACCOUNT_EMAIL).toBe('jacques.vieiraza+house@gmail.com')
    expect(HOUSE_ACCOUNT_EMAIL).toBe(HOUSE_ACCOUNT_EMAIL.toLowerCase())
  })
})
