// ⚑ 26 Aug — A DELIBERATE BLOCK MUST PROPAGATE AS A DELIBERATE BLOCK.
//
// THE DEFECT. `apollo.ts` wrapped the PDL search in `.catch(() => null)`. That handler
// exists for network flakiness and for that it is right — but it also ate the zero-spend
// guard's refusal. So with `PAID_PROVIDERS_ENABLED` off and a pool too thin to fill the
// 20-lead proof batch, the run finished with zero contacts, derived `no_match`, and told
// a prospect **"No leads matched this ICP. Try widening it"** — when PDL was never asked.
// The approved `failed` state was unreachable because the throw never escaped.
//
// ⚠️ NO PROVIDER IS CALLED HERE, and none can be: `vitest.setup.ts` deletes every provider
// key before any test runs. `fetch` is mocked, and the tests that matter assert it is
// NEVER invoked.

// `apollo.ts` and `enrichment.ts` transitively import `@kind/db`, which refuses to load
// without these. Fake values: nothing in this file performs a database call.
process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  rethrowIfProviderBlocked,
  PaidProviderBlockedError,
} from './paid-provider-guard'
import { deriveRunStatus } from './run-outcome'

/**
 * ⚠️ ASSERT ON `code`, NOT `instanceof`. These tests `vi.resetModules()` and re-import the
 * module under test, which builds a FRESH module graph — so the `PaidProviderBlockedError`
 * class thrown inside it is a different object from the one imported at the top of this
 * file, and `instanceof` is false even though the behaviour is exactly right. `code` is on
 * the class precisely so a caller can recognise it without string-matching.
 */
function expectBlocked(e: unknown) {
  expect((e as { code?: string }).code, `expected a provider block, got: ${e}`).toBe('SAFE_TEST_MODE_BLOCKED')
}

const ICP = { job_titles: ['Head of Ops'], industries: ['logistics'], geographies: ['United Kingdom'], seniority_levels: [], company_sizes: [] }

/** Simulate PRODUCTION with providers off: keys present, opt-in absent. */
function productionWithProvidersOff() {
  process.env.PDL_API_KEY = 'test-pdl'
  process.env.HUNTER_API_KEY = 'test-hunter'
  delete process.env.PAID_PROVIDERS_ENABLED
  delete process.env.SAFE_TEST_MODE
}

describe('rethrowIfProviderBlocked — lets one error past, swallows nothing else', () => {
  it('re-throws a PaidProviderBlockedError', () => {
    expect(() => rethrowIfProviderBlocked(new PaidProviderBlockedError('pdl', 'x'))).toThrow(PaidProviderBlockedError)
  })

  it('does NOT re-throw ordinary failures — soft-failure behaviour is preserved', () => {
    for (const e of [new Error('ECONNRESET'), new TypeError('fetch failed'), null, undefined, 'boom', { message: 'x' }]) {
      expect(() => rethrowIfProviderBlocked(e)).not.toThrow()
    }
  })
})

describe('the PDL search path — a block escapes, a network error still soft-fails', () => {
  const saved = { ...process.env }
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => { vi.resetModules() })
  afterEach(() => {
    fetchSpy?.mockRestore()
    for (const k of ['PDL_API_KEY', 'HUNTER_API_KEY', 'PAID_PROVIDERS_ENABLED', 'SAFE_TEST_MODE']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
    }
  })

  it('BLOCKED → throws out of searchPeopleWithFallback, and makes ZERO outbound calls', async () => {
    productionWithProvidersOff()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { searchPeopleWithFallback } = await import('./apollo')

    let thrown: unknown
    try {
      await searchPeopleWithFallback(ICP as never, 1, 20, null, 'client', { proofMode: true })
      throw new Error('searchPeopleWithFallback RESOLVED — the block was swallowed again')
    } catch (e) { thrown = e }
    expectBlocked(thrown)

    // ⚠️ THE MONEY ASSERTION. Not one request left the process.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('ORDINARY network error → still soft-fails to empty, exactly as before', async () => {
    process.env.PDL_API_KEY = 'test-pdl'
    process.env.PAID_PROVIDERS_ENABLED = 'true'      // spending allowed; the call itself fails
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('ECONNRESET'))
    const { searchPeopleWithFallback } = await import('./apollo')

    const out = await searchPeopleWithFallback(ICP as never, 1, 20, null, 'client', { proofMode: true })
    expect(out.contacts).toEqual([])          // degraded, not thrown
    expect(fetchSpy).toHaveBeenCalled()       // it genuinely tried
  })

  it('enrichment: a block escapes tryHunter instead of reading as "no address found"', async () => {
    productionWithProvidersOff()
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    const { waterfallEnrich } = await import('./enrichment')

    let thrown: unknown
    try {
      await waterfallEnrich({ first_name: 'A', last_name: 'B', company: 'Acme', domain: 'acme.com' } as never)
      throw new Error('waterfallEnrich RESOLVED — a block read as "no address found"')
    } catch (e) { thrown = e }
    expectBlocked(thrown)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('the outcome a blocked run produces', () => {
  it('a block can NEVER derive no_match — nothing derives failed either', () => {
    // `deriveRunStatus` is only reached by a run that COMPLETED. A blocked run does not
    // complete: it throws past it to the crash boundary, which writes `failed` explicitly.
    expect(deriveRunStatus(false, 0, false, false)).toBe('no_match')   // a genuine completed zero
    expect(deriveRunStatus(false, 0, false, false)).not.toBe('failed')
  })

  it('the crash boundary still records `failed` and alerts', () => {
    const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
    const at = src.indexOf('[icps/proof] proof run failed:')
    const block = src.slice(at - 900, at + 1600)
    expect(block).toContain("recordRunOutcome(req.params.id, clientId, 'failed'")
    expect(block).toContain('sendFounderAlert')
    expect(block).not.toContain("'no_match'")
  })
})

describe('every swallow site that could eat a block has been taught to let it past', () => {
  const read = (p: string[]) => readFileSync(join(__dirname, ...p), 'utf8')

  it('apollo.ts — the reported bug', () => {
    const src = read(['apollo.ts'])
    // ⚠️ Assert the EXPRESSION, not the substring — the fix's own comment quotes the old
    // shape, and an earlier version of this guard matched that comment and proved nothing.
    expect(src).not.toContain('pdlSearchPage(icp, size, pdlCursor, opts).catch(() => null)')
    expect(src).toContain('.catch(e => { rethrowIfProviderBlocked(e); return null })')
  })

  it('icps.ts — searchPeople no longer degrades a block to "no results"', () => {
    const src = read(['..', 'routes', 'icps.ts'])
    expect(src).not.toContain('searchPeople(searchBody).catch(() => [])')
    expect(src).toContain('.catch(e => { rethrowIfProviderBlocked(e); return [] })')
  })

  it('enrichment.ts — tryHunter and pdlEnrich no longer return null on a block', () => {
    const src = read(['enrichment.ts'])
    // Both bare `catch { return null }` handlers are gone from the guarded functions.
    const hunter = src.slice(src.indexOf('async function tryHunter'), src.indexOf('async function tryPdl'))
    expect(hunter).toContain('rethrowIfProviderBlocked(e)')
    expect(src.match(/rethrowIfProviderBlocked\(e\)/g) ?? []).toHaveLength(2)
  })

  it('no NEW bare provider swallow has crept in', () => {
    // A `.catch(() => …)` on a guarded provider call is the exact shape of the defect.
    for (const f of [['apollo.ts'], ['enrichment.ts'], ['pdl-search.ts']] as const) {
      const src = read([...f])
      expect(src, `${f}: bare catch on a provider call`).not.toMatch(/pdlSearchPage\([^)]*\)\.catch\(\(\) =>/)
      expect(src, `${f}: bare catch on a provider call`).not.toMatch(/searchPeople\([^)]*\)\.catch\(\(\) =>/)
    }
  })
})
