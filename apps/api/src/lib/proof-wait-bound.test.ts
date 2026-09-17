// ═══════════════════════════════════════════════════════════════════════════════════════
// J5-C14 · THE PROOF WAIT BOUND COMES FROM APOLLO, AND FROM A REAL TIMEOUT
//
// The desk chooses between "Finding your matches now…" and the approved recovery copy on
// the strength of this one number. The old one was 240s and its written derivation was
// entirely PDL's: *"one PDL attempt is a 15s timeout, the size ladder at batch 20 is four
// attempts, one global rate-limit retry adds 2.5s + 15s"*. Apollo has no size ladder — it
// pages, and a Proof batch of 20 fits in one page — so the bound was measuring a different
// machine.
//
// 🛑 AND THE WORST CASE DID NOT EXIST. `searchPeople` had NO timeout on its fetch, and
// Node's `fetch` has no default, so "Apollo's worst case" was UNBOUNDED. A bound derived
// from an unbounded call is arithmetic about nothing. These cases prove the timeout is
// applied, not merely declared.
// ═══════════════════════════════════════════════════════════════════════════════════════

// `apollo.ts` reaches `@kind/db`, whose client refuses to construct without these. No
// request is made and no real project is addressed — `fetch` is stubbed in every case below.
process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  PROOF_WAIT_MS,
  PROOF_DESK_POLL_MS,
  PROOF_DESK_MAX_CHECKS,
  APOLLO_REQUEST_TIMEOUT_MS,
  APOLLO_PROOF_WORST_CASE_REQUESTS,
  PROOF_OVERHEAD_MS,
} from '@kind/shared'

describe('J5-C14 · the bound is DERIVED, not typed', () => {
  it('equals Apollo\'s worst case plus overhead, rounded to a whole number of polls', () => {
    const expected =
      Math.ceil(
        (APOLLO_REQUEST_TIMEOUT_MS * APOLLO_PROOF_WORST_CASE_REQUESTS + PROOF_OVERHEAD_MS) /
          PROOF_DESK_POLL_MS,
      ) * PROOF_DESK_POLL_MS
    expect(PROOF_WAIT_MS).toBe(expected)
  })

  it('clears the provider worst case with real margin', () => {
    const providerWorstCase = APOLLO_REQUEST_TIMEOUT_MS * APOLLO_PROOF_WORST_CASE_REQUESTS
    expect(PROOF_WAIT_MS).toBeGreaterThan(providerWorstCase)
    // A bound that only just clears the worst case declares failure on a slow-but-healthy
    // run — the "we hit a snag" lie, in the direction nobody notices.
    expect(PROOF_WAIT_MS - providerWorstCase).toBeGreaterThanOrEqual(30_000)
  })

  it('is a whole number of desk polls, so the desk can express it', () => {
    expect(PROOF_WAIT_MS % PROOF_DESK_POLL_MS).toBe(0)
    expect(PROOF_DESK_MAX_CHECKS).toBe(PROOF_WAIT_MS / PROOF_DESK_POLL_MS)
  })

  it('carries no PDL timing anywhere in its derivation', () => {
    const src = readFileSync(
      join(__dirname, '../../../../packages/shared/src/proof-wait.ts'), 'utf8',
    )
    // The header EXPLAINS the retired PDL derivation on purpose — a bound whose history is
    // unreadable is a bound nobody dares change — so the assertion is on code, not prose.
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*') && !l.trim().startsWith('/*')).join('\n')
    expect(code).not.toMatch(/PDL|pdl/)
    expect(code).toMatch(/APOLLO_REQUEST_TIMEOUT_MS/)
  })

  it('the desk derives its poll budget from the same module, not from its own numbers', () => {
    const page = readFileSync(
      join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8',
    )
    // 🛑 TWO INDEPENDENTLY TYPED NUMBERS IS THE DEFECT. The page used to declare
    // `FINDING_POLL_MS = 3000` and `FINDING_MAX_CHECKS = 80` and then ASSERT their product
    // matched the bound — which catches drift but only after somebody has typed it. They are
    // now imported, so there is nothing to drift.
    expect(page).toMatch(/PROOF_DESK_POLL_MS/)
    expect(page).toMatch(/PROOF_DESK_MAX_CHECKS/)
    expect(page, 'the assertion that the two agree must survive').toMatch(/PROOF_WAIT_MS/)
  })
})

describe('J5-C14 · the timeout is APPLIED, which is what makes the worst case real', () => {
  const prev = { ...process.env }
  afterEach(() => {
    process.env = { ...prev }
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('searchPeople passes an abort signal, bounded by the shared constant', async () => {
    vi.resetModules()
    process.env.APOLLO_API_KEY = 'k'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    let sawSignal: unknown = undefined
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init: { signal?: unknown } = {}) => {
      sawSignal = init.signal
      return { ok: true, status: 200, json: async () => ({ people: [] }) } as never
    }))
    const { searchPeople } = await import('./apollo')
    await searchPeople({ page: 1, per_page: 5 } as never)
    // 🛑 AN UNBOUNDED PROVIDER CALL IS THE "started and never came back" CONDITION XC-6's
    // detector exists to find. Better not to create it.
    expect(sawSignal, 'searchPeople issued an unbounded fetch').toBeDefined()
  })

  it('bulkMatchEmails passes one too — the reveal is the other half of a Proof run', async () => {
    vi.resetModules()
    process.env.APOLLO_API_KEY = 'k'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    const signals: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init: { signal?: unknown } = {}) => {
      signals.push(init.signal)
      return { ok: true, status: 200, json: async () => ({ matches: [] }) } as never
    }))
    const { bulkMatchEmails } = await import('./apollo')
    await bulkMatchEmails(['55f0f0f0f0f0f0f0f0f0f0f0'])
    expect(signals.length).toBeGreaterThan(0)
    for (const s of signals) expect(s).toBeDefined()
  })

  it('the source names the shared timeout rather than a local literal', () => {
    const src = readFileSync(join(__dirname, 'apollo.ts'), 'utf8')
    expect(src).toMatch(/APOLLO_REQUEST_TIMEOUT_MS/)
    // A second copy of the number is a second truth. The desk's bound is computed from this
    // one, so a local literal here would silently invalidate it.
    expect(src).not.toMatch(/AbortSignal\.timeout\(\s*\d/)
  })
})
