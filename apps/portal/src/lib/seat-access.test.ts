// ⚑ AUTH-002 — AN UNREADABLE ROLE LOOKUP MAY NEVER GRANT PARTNER ACCESS (founder-authorised).
//
// FOUND ON THE MONEY-011 REVIEW. `(seat)/layout.tsx` resolved "is this visitor a partner?" by
// calling `/partners/me` and, in its catch, answered **true**:
//
//     } catch {
//       isPartner = true          // ← a timeout, a DNS failure or a thrown fetch
//     }
//
// The reasoning recorded there was that locking a Client Partner out of her own earnings
// because a fetch was slow is the worse failure. That trade is the wrong way round for an
// ACCESS decision: the cost of failing closed is one person seeing Milla for a few seconds;
// the cost of failing open is an ordinary paying customer landing inside a partner-only
// surface because the network wobbled. **An absence of an answer is not an answer** — the
// same rule R90 and R96/R97 state for commercial model, applied to identity.
//
// ⚠️ WHY THE DECISION MOVED INTO A FUNCTION. The layout is an async Next server component;
// the gate's vitest run cannot execute it (it imports through the portal's `@/` alias, which
// the root vitest config deliberately does not resolve — see vitest.config.ts, "changing that
// here would alter 3,500 tests to fix one"). A source-shape assertion on the catch block is
// not a behavioural proof (R100). So the decision is a pure, dependency-free function that
// the layout calls at the SAME single point, and every branch below is EXECUTED here.
//
// RED PROOF — each of these fails without the correction:
//   • `catch { return true }` in isAuthorisedSeat  → the "throws" and "times out" cases fail
//   • `isPartner = true` restored in the layout    → "the layout has no fail-open path" fails
//   • deleting the `!input.token` guard            → "no session" fails
//
// ⚠️ AND THE ALLOW PATH IS ASSERTED, NOT ONLY THE DENIALS. A function that returns false for
// everything passes every "must be refused" test ever written — that is R92's empty-result
// trap, and it would lock every genuine Client Partner out of her earnings page.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { isAuthorisedSeat } from './seat-access'

const API = 'https://api.example.test'
const TOKEN = 'a-real-session-token'

/** A lookup that answers, as the real API does. */
const answers = (ok: boolean) => async () => ({ ok })
/** A lookup that never answers — a thrown fetch, a DNS failure, a refused connection. */
const throws = (message: string) => async () => { throw new Error(message) }
/** What `AbortSignal.timeout` actually produces when the 4s budget is spent. */
const timesOut = () => async () => {
  const e = new Error('The operation was aborted due to timeout')
  e.name = 'TimeoutError'
  throw e
}

describe('AUTH-002 · isAuthorisedSeat — the seat access decision', () => {
  it('1 · an authorised partner seat is ALLOWED (the allow path is real, not an empty pass)', async () => {
    await expect(isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher: answers(true) })).resolves.toBe(true)
  })

  it('2 · an ordinary signed-in non-partner is REFUSED', async () => {
    // The API answers a non-2xx for a caller with no seat; `ok` is false.
    await expect(isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher: answers(false) })).resolves.toBe(false)
  })

  it('3 · a 404 / not-partner is REFUSED', async () => {
    const notFound = async () => ({ ok: false, status: 404 })
    await expect(isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher: notFound })).resolves.toBe(false)
  })

  it('4 · a THROWN fetch fails CLOSED — this is the defect', async () => {
    await expect(isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher: throws('fetch failed') }))
      .resolves.toBe(false)
  })

  it('4b · and so does a server error the fetch itself survives', async () => {
    const serverError = async () => ({ ok: false, status: 503 })
    await expect(isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher: serverError })).resolves.toBe(false)
  })

  it('5 · a TIMEOUT fails CLOSED — this is the defect', async () => {
    await expect(isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher: timesOut() })).resolves.toBe(false)
  })

  it('6 · no session token is REFUSED without even asking the API', async () => {
    let called = 0
    const spy = async () => { called++; return { ok: true } }
    await expect(isAuthorisedSeat({ token: undefined, apiUrl: API, fetcher: spy })).resolves.toBe(false)
    expect(called).toBe(0)
  })

  it('7 · the request it makes is unchanged, so a genuine partner is unaffected', async () => {
    const seen: { url: string; init: { headers: Record<string, string>; signal?: AbortSignal } }[] = []
    await isAuthorisedSeat({
      token: TOKEN, apiUrl: API,
      fetcher: async (url, init) => { seen.push({ url, init }); return { ok: true } },
    })
    expect(seen).toHaveLength(1)
    expect(seen[0].url).toBe(`${API}/partners/me`)
    expect(seen[0].init.headers.Authorization).toBe(`Bearer ${TOKEN}`)
    expect(seen[0].init.signal).toBeInstanceOf(AbortSignal)
  })

  it('8 · EVERY reachable answer is decided — there is no third state', async () => {
    // A decision that can return undefined would be truthy-tested somewhere and let a
    // visitor through. Assert the type as well as the value.
    for (const fetcher of [answers(true), answers(false), throws('x'), timesOut()]) {
      const r = await isAuthorisedSeat({ token: TOKEN, apiUrl: API, fetcher })
      expect(typeof r).toBe('boolean')
    }
  })
})

// ── THE LAYOUT ITSELF — the decision must be USED, and the fail-open must be gone ─────────
//
// The behavioural tests above prove the function. These prove the layout is wired to it and
// carries no second, unguarded path of its own. Comments are stripped: a comment DESCRIBING
// the removed fail-open must not read as the fail-open.
const SEAT_LAYOUT = readFileSync(join(__dirname, '../app/(seat)/layout.tsx'), 'utf8')
const executable = SEAT_LAYOUT.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

describe('AUTH-002 · the (seat) layout has no fail-open path', () => {
  it('the guard is reading the real file (a guard that reads nothing passes everything)', () => {
    expect(executable).toContain('export default async function SeatLayout')
    expect(executable).toContain("redirect('/milla')")
  })

  it('it decides through isAuthorisedSeat, not an inline catch of its own', () => {
    expect(executable).toContain('isAuthorisedSeat')
  })

  it('no executable line in the layout ever sets the partner flag TRUE', () => {
    expect(executable).not.toMatch(/isPartner\s*=\s*true/)
  })

  it('and every catch in it resolves to a REFUSAL, never to access', () => {
    // Whatever else changes, a catch block here may not contain the word `true`.
    const catches = [...executable.matchAll(/catch\s*(?:\([^)]*\))?\s*\{([^}]*)\}/g)].map(m => m[1])
    for (const body of catches) expect(body).not.toMatch(/\btrue\b/)
  })

  it('unauthenticated behaviour is unchanged — still /login, still before the seat check', () => {
    expect(executable).toContain("if (!user) redirect('/login')")
    // ⚠️ Compare against the CALL, not the import — the import legitimately sits at the top
    // of the file, and matching it here would assert nothing about the order of the checks.
    const call = executable.indexOf('await isAuthorisedSeat(')
    expect(call).toBeGreaterThan(-1)
    expect(executable.indexOf("redirect('/login')")).toBeLessThan(call)
  })
})
