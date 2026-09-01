// ═══════════════════════════════════════════════════════════════════════════════════════
// FIRE-AND-FORGET WORK HAS AN OWNER — the regression guard for the 1 Sep ship blocker.
//
// 🛑 WHAT WENT RED, AND IT WAS ONE TEST IN 4,762:
//
//     proof-review-handoff.test.ts › the third attempt is refused 409 and persists ONE open
//     review  —  expected client().proof_passes_done to be 2, received 0
//
// **Zero, not one and not three.** Nothing decremented the counter — all three requests
// incremented a store the assertion was no longer looking at. A short count would have been a
// race in the counter; a count of zero is a race in the WIRING.
//
// ⚠️ THE MECHANISM, PROVEN FROM THE CODE RATHER THAN FROM THE TEST NAME. `POST /icps/:id/proof`
// starts `runIcpJob` without awaiting it. `runIcpJob` then performs FOUR dynamic
// `await import(...)` calls inside its body — `../lib/onboarding-pack` (icps.ts:657, reached
// early), `../lib/programme` twice, `../lib/programme-authority`. Nothing held a reference to
// that promise, so when the next test ran `vi.resetModules()` and re-imported `routes/icps`,
// the leaked job was very likely still inside one of those imports, touching the same module
// registry. The re-imported route could then bind to the PREVIOUS test's `@kind/db` mock —
// and every write landed in the previous test's store.
//
// ⚠️ THE FIX IS OWNERSHIP, NOT WAITING, AND THESE TESTS HOLD THAT DISTINCTION. Production is
// unchanged: the route still does not await the job and the prospect still gets an instant
// answer. What is new is that the promise is REGISTERED, so a boundary can be drawn.
//
// ⚠️ NOT ONE ASSERTION IN THIS FILE DEPENDS ON TIMING. There is no sleep, no timer, no
// retry-until-green. Every wait is on a promise this file controls, and "has not resolved
// yet" is proven by flushing MICROTASKS, which is deterministic.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { trackBackground, backgroundCount, settleBackgroundWork } from './background'

/** A promise this file opens and closes by hand — the only way to test a race without luck. */
function deferred<T = void>() {
  let resolve!: (v: T) => void
  let reject!: (e: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

/** Let every queued microtask run. Deterministic; NOT a sleep — no timer is involved. */
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

beforeEach(async () => {
  // Leave the registry empty for the next test even if one of these fails mid-way.
  await settleBackgroundWork().catch(() => {})
})

describe('the boundary actually holds work — this is the RED proof', () => {
  it('settleBackgroundWork does NOT resolve while tracked work is still running', async () => {
    // 🛑 THIS IS THE ASSERTION THAT FAILS UNDER THE OLD IMPLEMENTATION. Before the fix there
    // was no registry at all: a fire-and-forget job was unreachable, so any "wait for
    // background work" would have returned immediately with work still in flight — which is
    // exactly the leak, expressed as a test.
    const job = deferred()
    trackBackground(job.promise)
    expect(backgroundCount()).toBe(1)

    let done = false
    const draining = settleBackgroundWork().then(() => { done = true })

    await flush()
    expect(done, 'the drain returned while a tracked job was still running').toBe(false)

    job.resolve()
    await draining
    expect(done).toBe(true)
    expect(backgroundCount()).toBe(0)
  })

  it('and it waits for work that work itself starts — one generation is not enough', async () => {
    // `runIcpJob` starts further work, so a single `Promise.all` would return while the
    // second generation was still in flight: the same leak with an extra step.
    const first = deferred()
    const second = deferred()
    trackBackground(first.promise.then(() => { trackBackground(second.promise) }))

    let done = false
    const draining = settleBackgroundWork().then(() => { done = true })

    first.resolve()
    await flush()
    expect(done, 'the drain returned after generation 1 while generation 2 was running').toBe(false)

    second.resolve()
    await draining
    expect(backgroundCount()).toBe(0)
  })

  it('a REJECTED background job still clears the boundary and never poisons the drain', async () => {
    // ⛓️ THIS TEST'S FIRST DRAFT PROVED NOTHING, AND ITS OWN RED PROOF EXPOSED IT. It tracked
    // `job.promise.catch(() => 'handled')` — an ALREADY-HANDLED promise that resolves — so
    // swapping `Promise.allSettled` for `Promise.all` in the drain changed nothing and the
    // guard stayed green. It was asserting the happy shape, not the requirement.
    //
    // ⚠️ SO IT NOW TRACKS A GENUINELY REJECTING PROMISE, which is what reaches the registry
    // the day a call site forgets its `.catch`. A drain built on `Promise.all` adopts that
    // rejection and fails whichever test happened to be tidying up — turning one unowned job
    // into a failure somewhere unrelated, which is this whole bug's signature.
    const job = deferred()
    trackBackground(job.promise)
    // The drain attaches its handlers FIRST, so the rejection below is never unhandled.
    const draining = settleBackgroundWork()
    job.reject(new Error('the provider is down'))
    await expect(draining).resolves.toBeUndefined()
    expect(backgroundCount()).toBe(0)
  })

  it('an already-settled promise is registered and cleared, not leaked', async () => {
    // The `.finally` callback is a microtask while `inflight.add` is synchronous, so the add
    // always wins. Asserted rather than reasoned about.
    trackBackground(Promise.resolve('immediate'))
    expect(backgroundCount()).toBe(1)
    await settleBackgroundWork()
    expect(backgroundCount()).toBe(0)
  })

  it('endless respawning fails loudly instead of hanging until the test timeout', async () => {
    // A drain that spun forever would be reported as "timed out" with no cause named.
    let live = true
    const respawn = () => { if (live) trackBackground(Promise.resolve().then(respawn)) }
    respawn()
    await expect(settleBackgroundWork(5)).rejects.toThrow(/respawning without end/)
    live = false
    await settleBackgroundWork().catch(() => {})
  })
})

describe('every fire-and-forget runIcpJob is owned — the structural guard', () => {
  // Comments stripped: an explanation of the pattern must never satisfy a check for the
  // pattern. This repo has shipped that mistake eleven times.
  const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

  it('there are still fire-and-forget call sites — production UX was NOT changed', () => {
    // 🛑 THE FLOOR. The cheap way to pass every assertion below is to `await` the job at each
    // call site — which would make the prospect watch a spinner while a batch is sourced, and
    // would silently change the product to make a test green. This fails if that happens.
    const tracked = src.match(/trackBackground\(runIcpJob\(/g) ?? []
    expect(tracked.length, 'the fire-and-forget call sites were awaited away').toBe(3)

    // ⛓️ THE COUNT ALONE DID NOT CATCH THE CHEAT, AND ITS RED PROOF SAID SO. Writing
    // `await trackBackground(runIcpJob(...))` leaves the count at three while making the
    // prospect wait for the whole sourcing run — the product changed to make a test green,
    // which is the one outcome this file exists to prevent. Pinned structurally.
    const awaited = src.match(/await\s+trackBackground\(runIcpJob\(/g) ?? []
    expect(awaited, 'a fire-and-forget job was turned into a blocking await').toEqual([])
  })

  it('and NO runIcpJob call is left unowned', () => {
    const calls = src.split('\n')
      .map((l, i) => ({ l, n: i + 1 }))
      .filter(({ l }) => /(?<![\w.])runIcpJob\s*\(/.test(l))
      .filter(({ l }) => !/export async function runIcpJob/.test(l))
    expect(calls.length, 'no runIcpJob call sites found — the guard is reading the wrong file').toBeGreaterThan(0)

    const unowned = calls.filter(({ l }) => !/await runIcpJob|trackBackground\(runIcpJob/.test(l))
    expect(
      unowned.map(c => `icps.ts:${c.n}`),
      'every runIcpJob call must be awaited or wrapped in trackBackground',
    ).toEqual([])
  })

  it('the boundary is GLOBAL — every test file gets it, not the three that went red', () => {
    // ⛓️ THE FIRST FIX DRAINED IN THREE `afterEach` HOOKS AND THAT WAS TOO NARROW.
    // **Thirty test files import `routes/icps`**, so instrumenting the three that happened to
    // fail would have left the same race live in twenty-seven others — and a shuffled-order
    // baseline run proved it, going red in files the three-file fix never touched.
    // Three hand-copied hooks is also the "second copy of a rule" defect this repo logs
    // repeatedly. One boundary, in the setup file every test already loads.
    // ⛓️ COMMENTS STRIPPED, AND ITS OWN RED PROOF IS WHY. The first version read the raw
    // file, so commenting the drain OUT left the words `await settleBackgroundWork()` sitting
    // in a `//` line and the guard stayed green — a check satisfied by the explanation of the
    // thing rather than the thing. That is the twelfth time this exact shape has bitten here.
    const setup = readFileSync(join(__dirname, '../../../../vitest.setup.ts'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')
    expect(setup, 'the global drain is gone from vitest.setup.ts').toContain('settleBackgroundWork()')
    expect(setup).toMatch(/afterEach\(async \(\) => \{[\s\S]{0,240}await settleBackgroundWork\(\)/)
  })

  it('the registry survives vi.resetModules() — otherwise the drain is a no-op', () => {
    // 🛑 THE TRAP THIS PINS. A module-scoped `Set` is destroyed by `vi.resetModules()` — the
    // very call whose race is being closed. A drain running afterwards would import a fresh
    // module, find an empty set, and return immediately while the leaked job carried on:
    // a boundary that looks right and does nothing.
    const src = readFileSync(join(__dirname, 'background.ts'), 'utf8')
    expect(src).toMatch(/Symbol\.for\('kind\.background\.inflight'\)/)
    expect(src).toMatch(/globalThis as Global/)
    // A bare module-level `new Set()` as the registry is the regression.
    expect(src).not.toMatch(/^const inflight = new Set/m)
  })
})

describe('the Proof business rules are untouched by this fix', () => {
  const src = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')

  it('the two-pass ceiling still lives in the database call, not in the route', () => {
    expect(src).toContain('try_claim_proof_pass')
    expect(src).toContain('PROOF_PASS_LEADS')
  })

  it('the third attempt still refuses with 409 and still raises exactly one handoff', () => {
    expect(src).toContain('res.status(409)')
    expect(src).toContain('proof_review_requested_at:')
    // Exactly one writer of the handoff column — the invariant proof-review-handoff asserts.
    const writes = src.split('\n').filter(l => !l.trim().startsWith('//'))
      .join('\n').split('proof_review_requested_at:').length - 1
    expect(writes).toBe(1)
  })

  it('the route still answers before the job finishes — the response is not awaited on it', () => {
    // `res.json({ ... finding: true })` must still come AFTER the tracked call and not be
    // gated on it: a prospect gets an immediate answer, which is the UX being preserved.
    const at = src.indexOf('trackBackground(runIcpJob(req.params.id, clientId, req.userId!, PROOF_PASS_LEADS')
    expect(at).toBeGreaterThan(-1)
    const after = src.slice(at, at + 2600)
    expect(after).toContain("res.json({ success: true, data: { pass: claimed, of: 2, finding: true } })")
    expect(after).not.toContain('await trackBackground')
  })
})

// Keep vitest's mock state clean for whatever runs next in this file's worker.
vi.restoreAllMocks()
