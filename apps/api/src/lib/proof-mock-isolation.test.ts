// ═══════════════════════════════════════════════════════════════════════════════════════
// THE REGRESSION PROOF FOR THE 1 SEP SHIP BLOCKER — TEST ISOLATION, NOT PRODUCTION.
//
// 🛑 THE FAILURE. `ship.sh` went red on one test in 4,762:
//
//     proof-review-handoff.test.ts › the third attempt is refused 409 and persists ONE open
//     review  —  expected proof_passes_done to be 2, received 0
//
// ⚠️ AND THE PROOF RULES WERE CORRECT THE WHOLE TIME. The response codes on the failing run
// were still `[200, 200, 409]`: two passes granted, the third refused. Stamping each mock
// store with an id showed what had actually happened —
//
//     rpc store=3   rpc store=3   rpc store=3      <- the three requests wrote HERE
//     assert store=4 passes=0                      <- the assertion read HERE
//
// The route was bound to the PREVIOUS test's `@kind/db` mock. Nothing was lost, nothing was
// racing in the product; two halves of one test were looking at different objects.
//
// ⚠️ THE CAUSE WAS A WELD IN THE HARNESS. The old `installDb(store, rec)` closed over its
// PARAMETERS, so every `vi.doMock` factory was permanently attached to whichever store
// existed when it was registered. `vi.resetModules()` plus vitest's dynamic-import
// sequencing can hand a later test a module built by an earlier factory — and that module
// then writes, correctly and invisibly, into an abandoned store.
//
// ⚠️ THE FIX REMOVES THE WELD RATHER THAN WINNING THE RACE. The factory reads through a
// single `ctx` object that outlives every reset; `beforeEach` swaps its CONTENTS. A stale
// binding is then harmless by construction.
//
// ⚠️ NOT ONE ASSERTION BELOW DEPENDS ON TIMING. No sleep, no retry, no repetition-until-green.
// The stale binding is reproduced DELIBERATELY — a module captured under one store and then
// used under the next — which is exactly what the sequencing did by accident.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ⛓️ 12 Sep (S2-AUDIT-001) — RETARGETED, NOT WEAKENED. Every assertion below keeps its
// exact meaning; only the NAME of the claim changed. `try_claim_proof_pass` incremented a
// counter nothing could release, so a run that crashed at the PDL boundary consumed the
// client's pass and left them with nothing. Authority now comes from the durable claim
// ledger (`claim_proof_authority` -> `proof_pass_claims`), which can give it back. The old
// RPC is retained in the database for rollback and has ZERO live callers
// (`proof-authority-bypass.test.ts` asserts that, and it is what keeps it dead).

type Row = Record<string, any>
type Store = { clients: Row[] }

let seq = 0
const newStore = (): Store => ({ clients: [{ id: 'c1', tag: `store-${++seq}`, writes: 0 }] })

// ── THE OLD SHAPE: the factory closes over its ARGUMENT ────────────────────────────────
function installWelded(store: Store) {
  return { write: () => { store.clients[0].writes += 1; return store.clients[0].tag } }
}

// ── THE NEW SHAPE: the factory reads through a holder that outlives the reset ──────────
const ctx: { store: Store } = { store: newStore() }
function installIndirect() {
  return { write: () => { ctx.store.clients[0].writes += 1; return ctx.store.clients[0].tag } }
}

describe('the stale binding is reproduced deterministically — this is the RED proof', () => {
  it('🛑 THE OLD HARNESS: a module captured under store A writes to A while the test reads B', () => {
    // Test A's lifecycle registers a mock welded to store A, and something captures it.
    const storeA = newStore()
    const dbFromTestA = installWelded(storeA)

    // Test B's lifecycle then makes a NEW store — exactly what `beforeEach` did.
    const storeB = newStore()

    // …and the route ends up holding test A's module. This is the whole bug, made explicit.
    const wroteTo = dbFromTestA.write()

    expect(wroteTo).toBe(storeA.clients[0].tag)          // the write landed in A
    expect(storeB.clients[0].writes).toBe(0)             // …and B, which the assertion reads,
    expect(storeA.clients[0].writes).toBe(1)             //    never saw it. `received 0`.
    expect(wroteTo).not.toBe(storeB.clients[0].tag)
  })

  it('✅ THE FIXED HARNESS: the same stale module writes to whatever the CURRENT store is', () => {
    // Capture the module under one store…
    ctx.store = newStore()
    const capturedUnderA = ctx.store.clients[0].tag
    const dbFromTestA = installIndirect()

    // …then swap the CONTENTS of the holder, as `beforeEach` now does.
    ctx.store = newStore()
    const currentTag = ctx.store.clients[0].tag
    expect(currentTag).not.toBe(capturedUnderA)          // vacuity: it really is a new store

    // The stale module still writes to the store the assertion will read.
    const wroteTo = dbFromTestA.write()
    expect(wroteTo).toBe(currentTag)
    expect(ctx.store.clients[0].writes).toBe(1)
  })

  it('and the holder itself must never be REPLACED, only refilled', () => {
    // Reassigning `ctx` would recreate the weld: the factory would keep the old object.
    // This asserts the property the real harness depends on.
    ctx.store = newStore()
    const db = installIndirect()
    const before = ctx.store
    ctx.store = newStore()
    expect(ctx.store).not.toBe(before)                   // contents swapped
    expect(db.write()).toBe(ctx.store.clients[0].tag)    // …and the module followed
  })
})

describe('the real harness is wired that way — structural guard', () => {
  // Comments stripped: an explanation of the pattern must not satisfy a check for it.
  const src = readFileSync(join(__dirname, 'proof-review-handoff.test.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

  it('installDb takes no store argument — there is nothing left to weld to', () => {
    expect(src).toMatch(/function installDb\(\)\s*\{/)
    expect(src, 'the welded signature is back').not.toMatch(/function installDb\(store: Store, rec: Rec\)/)
  })

  it('the mock reads the CURRENT store through the holder, never a captured one', () => {
    expect(src).toMatch(/\(ctx\.store as any\)\[table\]/)
    expect(src).toMatch(/const c = ctx\.store\.clients\[0\]/)
    expect(src).toMatch(/ctx\.rec\.rpcs\.push/)
  })

  it('beforeEach refills the holder and never reassigns it', () => {
    expect(src).toMatch(/ctx\.store = newStore\(\)/)
    expect(src).toMatch(/ctx\.rec = \{/)
    expect(src, 'reassigning ctx rebuilds the weld').not.toMatch(/^\s*ctx = /m)
    // The old free variables must be gone, or two sources of truth exist side by side.
    expect(src).not.toMatch(/^let store: Store$/m)
    expect(src).not.toMatch(/^let rec: Rec$/m)
  })

  it('the assertions read the SAME holder the route writes through', () => {
    expect(src).toMatch(/const client = \(\) => ctx\.store\.clients\[0\]/)
    expect(src).toMatch(/const escalations = \(\) => ctx\.rec\.alerts/)
  })
})

describe('the Proof business rules are untouched by the harness change', () => {
  const src = readFileSync(join(__dirname, 'proof-review-handoff.test.ts'), 'utf8')
  // ⛓️ 15 Sep (S1-RT-004) — reads the whole Proof path: the run-and-settle tail moved VERBATIM
  // to `lib/proof-run-launch.ts` so the client route and Vida's continuation share ONE
  // implementation. Same assertion, same specificity, truthful location.
  const icps = readFileSync(join(__dirname, '../routes/icps.ts'), 'utf8')
    + '\n' + readFileSync(join(__dirname, 'proof-run-launch.ts'), 'utf8')

  it('the suite still asserts 200, 200, 409 and a pass count of exactly 2', () => {
    expect(src).toContain('expect(codes).toEqual([200, 200, 409])')
    expect(src).toContain('expect(client().proof_passes_done).toBe(2)')
  })

  it('and still asserts exactly one open review, alerted once', () => {
    expect(src).toContain('expect(open()).toBe(true)')
    expect(src).toContain('expect(escalations()).toHaveLength(1)')
  })

  it('the two-pass ceiling is still the database call, not the harness', () => {
    expect(src).toContain('claim_proof_authority')
    expect(src).toMatch(/if \(done >= 2\) return \{ data: 0, error: null \}/)
  })

  it('PRODUCTION IS UNCHANGED — the route keeps its fire-and-forget dispatch', () => {
    // 🛑 THE FLOOR. Three earlier attempts changed `icps.ts` to chase this failure; none of
    // them closed it, and all were reverted. The defect is in the harness, and production
    // must carry no residue of the hunt.
    // ⛓️ 11 Sep — the dispatch now also names the batch KIND (automatic vs the one calibrated
    // restart). Same call, same fire-and-forget shape, same `.catch` — only the options widen.
    // ⛓️ 12 Sep (S2-AUDIT-001) — STILL FIRE-AND-FORGET, which is what this test guards: the
    // prospect gets an immediate answer and the batch lands when the run finishes. What was
    // ADDED is a `.then` beside the `.catch`, because settling only on a throw missed two real
    // non-throwing failure paths (the structural gate, and a provider search that did not
    // complete) — both of which used to consume the client's Proof attempt silently.
        // ⛓️ 15 Sep (S1-RT-004) — same assertion, truthful location: the run-and-settle tail moved
    // VERBATIM to `lib/proof-run-launch.ts` so the route and Vida share ONE implementation.
    expect(icps).toMatch(/runIcpJob\(icpId, clientId, userId, PROOF_PASS_LEADS, \{ proofPass: claimed, proofKind: batchKind \}\)\n\s*\.then\(/)
    expect(icps, 'the dispatch is no longer fire-and-forget').not.toMatch(/await runIcpJob\(icpId, clientId, userId, PROOF_PASS_LEADS/)
    expect(icps).toMatch(/\.catch\(async e => \{/)
    expect(icps, 'a background-ownership wrapper was left in production').not.toMatch(/trackBackground/)
  })
})

afterEach(() => { vi.restoreAllMocks() })
beforeEach(() => { seq = seq })
