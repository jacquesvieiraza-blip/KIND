// ⚑ 26 Aug — THE FIRST-PROOF OUTCOME MATRIX.
//
// THE SYSTEMIC DEFECT. `deriveRunStatus` had no way to know whether the search it was
// summarising had actually COMPLETED. So every non-block provider failure — timeout, 5xx,
// 401/403, two rate limits, a malformed body, out of credits, and the no-API-key exit that
// returns `error: null` — arrived as `totalInserted: 0`, indistinguishable from a search
// that ran perfectly and matched nobody. All of them told a first-time prospect:
//
//     "No leads matched this ICP. Try widening it — broaden the job titles, seniority…"
//
// An empty page is not evidence of an empty audience. `PdlPage.completed` now carries the
// search's own verdict on itself, and the outcome layer reads it.
//
// ⚠️ NO PROVIDER IS CALLED HERE, and none can be: `vitest.setup.ts` deletes every provider
// key before any test runs. `fetch` is mocked; the tests that matter assert it never fired.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveRunStatus, runOutcomeMessage, WIDENED_NO_MATCH_BODY } from './run-outcome'
import { exhaustedMessage } from './pdl-cursor'
// ⛓️ 17 Sep (J5-C14) — section F's arithmetic reads these instead of rebuilding a retired
// provider's ladder from `pdl-search.ts`.
import {
  PROOF_WAIT_MS,
  PROOF_DESK_POLL_MS,
  PROOF_DESK_MAX_CHECKS,
  APOLLO_REQUEST_TIMEOUT_MS,
  APOLLO_PROOF_WORST_CASE_REQUESTS,
} from '@kind/shared'

// ⛓️ R143 (23 Sep) — `pdlSearchPage` now refuses PDL through the retired-provider lock, WITH A
// KEY SET, before any request is built. The cases below drive the RETAINED PDL response
// handling with a mocked `fetch`; that knowledge is kept (retire, don't delete), so the lock
// is lifted for PDL ONLY, in this file only — Hunter and Clearbit stay refused. The same
// pattern as `enrichment.test.ts`. No runtime path changes the fence:
// `one-provider-apollo.test.ts` proves it un-mocked, with the key present.
vi.mock('./retired-providers', async (orig) => {
  const actual = (await orig()) as typeof import('./retired-providers')
  return {
    ...actual,
    refuseRetiredProvider: ((name, where) =>
      name === 'pdl' ? false : actual.refuseRetiredProvider(name, where)) as typeof actual.refuseRetiredProvider,
  }
})

const ICP = { job_titles: ['Head of Ops'], seniority_levels: [], company_sizes: [], geographies: ['United Kingdom'], industries: ['Logistics'] }

/** One JSON response, however malformed. */
const res = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
}) as unknown as Response

/**
 * Source text with WHOLE-LINE COMMENTS REMOVED, for the tests that assert on code.
 *
 * ⚠️ THIS EXISTS BECAUSE THE MISTAKE KEPT RECURRING — five separate times in this build a
 * source-text guard matched the prose of the very comment explaining the fix, and passed
 * (or failed) for a reason that had nothing to do with the code. Two live examples: the
 * portal's ordering guard was matching `No leads waiting right now` inside a comment 1,030
 * lines above the render, and `run-outcome.ts` documents the default it removed as
 * `searchCompleted = true`, which is exactly the string a guard must not find.
 *
 * A guard that a comment can satisfy is not a guard. Assert on code only.
 */
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

// ─────────────────────────────────────────────────────────────────────────────
// A. THE OUTCOME LAYER — every class, decided from facts rather than emptiness
// ─────────────────────────────────────────────────────────────────────────────
describe('A · outcome derivation', () => {
  // (isDemo, inserted, quotaRefused, audienceExhausted, searchCompleted)
  it('SUCCESS — matches exist', () => {
    expect(deriveRunStatus(false, 12, false, false, true)).toBe('served')
  })

  it('PARTIAL SUCCESS — matches exist AND the search died: show what we have', () => {
    // The founder rule, encoded: anything real and safe surfaces, whatever happened to
    // the rest of the batch. Checked BEFORE trustworthiness, deliberately.
    expect(deriveRunStatus(false, 7, false, false, false)).toBe('served')
  })

  it('GENUINE NO MATCH — the search completed and matched nobody', () => {
    expect(deriveRunStatus(false, 0, false, false, true)).toBe('no_match')
  })

  it('EXHAUSTED — the search completed and the audience is finished', () => {
    expect(deriveRunStatus(false, 0, false, true, true)).toBe('audience_exhausted')
  })

  it('FAILED — zero, and the search did NOT complete', () => {
    expect(deriveRunStatus(false, 0, false, false, false)).toBe('failed')
  })

  it('an untrustworthy zero can NEVER be no_match or audience_exhausted', () => {
    for (const exhausted of [false, true]) {
      const s = deriveRunStatus(false, 0, false, exhausted, false)
      expect(s).not.toBe('no_match')
      expect(s).not.toBe('audience_exhausted')
      expect(s).toBe('failed')
    }
  })

  it('quota refusal and demo still win, and are unaffected', () => {
    expect(deriveRunStatus(false, 0, true, false, false)).toBe('quota_exhausted')
    expect(deriveRunStatus(true, 0, false, false, false)).toBe('demo')
  })

  it('⛓️ NO PERMISSIVE DEFAULT — an omitted trust argument fails CLOSED, it does not inherit trust', () => {
    // ⚠️ THIS TEST WAS INVERTED ON 26 AUG, and the inversion is the point. It previously
    // read "DEFAULTS TO TRUSTWORTHY — a caller that never reaches a provider cannot report
    // failure", and asserted that a 4-argument call still produced `no_match`. That default
    // was the same fail-OPEN shape the tri-state had just been built to kill: a future call
    // site that forgot the argument would silently inherit "the search completed" and tell a
    // prospect their targeting matched nobody. The argument is now required — TypeScript
    // rejects the 4-arg form, and if one reaches runtime anyway the missing value is falsy,
    // so it lands on `failed`. Both directions refuse to invent trust.
    expect((deriveRunStatus as unknown as (...a: unknown[]) => string)(false, 0, false, false)).toBe('failed')
    expect((deriveRunStatus as unknown as (...a: unknown[]) => string)(false, 0, false, true)).toBe('failed')

    // Trust is only ever granted by a caller that says so explicitly.
    expect(deriveRunStatus(false, 0, false, false, true)).toBe('no_match')
    expect(deriveRunStatus(false, 0, false, true, true)).toBe('audience_exhausted')
  })

  it('no technical detail reaches the client in any status', () => {
    for (const s of ['served', 'no_match', 'audience_exhausted', 'quota_exhausted', 'failed'] as const) {
      expect(runOutcomeMessage(s, 0), s).not.toMatch(/pdl|apollo|hunter|clearbit|http|\b[45]\d\d\b|stack|timeout/i)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// B. THE PROVIDER LAYER — every failure class reports itself honestly
// ─────────────────────────────────────────────────────────────────────────────
describe('B · PdlPage.completed tells the truth about each failure class', () => {
  const saved = { ...process.env }
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetModules()
    process.env.PDL_API_KEY = 'test-pdl'
    process.env.PAID_PROVIDERS_ENABLED = 'true'   // spending allowed; the CALL is what fails
    delete process.env.SAFE_TEST_MODE
  })
  afterEach(() => {
    fetchSpy?.mockRestore()
    for (const k of ['PDL_API_KEY', 'PAID_PROVIDERS_ENABLED', 'SAFE_TEST_MODE']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
    }
  })

  const page = async () => {
    const { pdlSearchPage } = await import('./pdl-search')
    return pdlSearchPage(ICP, 20, null)
  }

  it('OK with results → completed, and it is a real answer', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      res(200, { data: [{ id: 'p1', first_name: 'A', last_name: 'B', work_email: 'a@b.com' }], scroll_token: null }),
    )
    const p = await page()
    expect(p.completed).toBe(true)
    expect(p.contacts.length).toBe(1)
  })

  it('404 on the FIRST page → completed, matchedNothing — a trustworthy zero, WHEN PDL SAYS SO', async () => {
    // ⛓️ TIGHTENED 26 Aug. This test used to send `res(404, {})` — a bare 404 with no body —
    // and call the result a trustworthy zero. A 404 is only PDL answering "nobody" when PDL's
    // documented `not_found` envelope is actually in the body; a bare 404 is just as likely a
    // proxy, a gateway or a changed route, and treating that as an empty audience is the same
    // false `no_match` in a new costume. The bare-body cases are asserted as `failed` in G.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      res(404, { status: 404, error: { type: 'not_found', message: 'No records were found matching your search' } }))
    const p = await page()
    expect(p.completed).toBe(true)          // we asked, PDL answered "nobody", in its own words
    expect(p.matchedNothing).toBe(true)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('no_match')
  })

  it('TIMEOUT → NOT completed → failed, never no_match', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(Object.assign(new Error('The operation was aborted'), { name: 'TimeoutError' }))
    const p = await page()
    expect(p.completed).toBe(false)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  })

  it('HTTP 5xx → NOT completed → failed', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(503, { error: 'upstream' }))
    const p = await page()
    expect(p.completed).toBe(false)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  })

  it('AUTH failure (401/403) → NOT completed → failed', async () => {
    for (const code of [401, 403]) {
      vi.resetModules()
      fetchSpy?.mockRestore()
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(code, { error: 'bad key' }))
      const p = await page()
      expect(p.completed, `HTTP ${code}`).toBe(false)
      expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
    }
  })

  it('RATE LIMIT twice → NOT completed → failed', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(429, { error: 'slow down' }))
    const p = await page()
    expect(p.completed).toBe(false)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  }, 20000)

  it('MALFORMED body → NOT completed → failed', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200,
      json: async () => { throw new SyntaxError('Unexpected token < in JSON') },
      text: async () => '<html>',
    } as unknown as Response)
    const p = await page()
    expect(p.completed).toBe(false)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  })

  it('OUT OF CREDITS (402 all the way down) → NOT completed → failed', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(402, { error: 'no credits' }))
    const p = await page()
    expect(p.completed).toBe(false)
    expect(p.exhausted).toBe(false)          // our wallet, not their audience
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  })

  it('NO API KEY → NOT completed → failed, and ZERO calls made', async () => {
    // ⚠️ THE SUBTLEST ONE. This exit returns `error: null`, so an `error !== null` test
    // would have called it trustworthy — and its own comment says "we never asked".
    delete process.env.PDL_API_KEY
    fetchSpy = vi.spyOn(globalThis, 'fetch')
    const p = await page()
    expect(p.completed).toBe(false)
    expect(p.error).toBeNull()               // exactly why `error` was the wrong test
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// C. THE WIRING — the run actually carries the fact to the outcome
// ─────────────────────────────────────────────────────────────────────────────
describe('C · runIcpJob carries a FAIL-CLOSED trust state into the persisted status', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  // ⛓️ AMENDED 26 Aug (final review). The first shape was `let searchCompleted = true`,
  // falsified by the error paths we knew about — which meant every path we did NOT know
  // about defaulted to trustworthy and could become a false `no_match`. Trust is now a
  // tri-state that DROPS to 'unproven' the moment a provider answer is required, and is
  // promoted only by explicit positive evidence. A new error path someone adds next year
  // fails closed by doing nothing at all.
  it('trust starts not_required, and the fail-open boolean is gone', () => {
    expect(src).toContain("let searchTrust: 'not_required' | 'unproven' | 'proven' = 'not_required'")
    expect(src).not.toContain('let searchCompleted = true')
  })

  it('entering the provider branch drops trust to unproven BEFORE the call', () => {
    const enter = src.indexOf("searchTrust = 'unproven'")
    // ⛓️ 27 Aug — the exact call now sits inside a try that absorbs ONLY the deliberate
    // spend block; the assignment moved with it. The drop-before-call invariant is unchanged.
    const call = src.indexOf('exact = await searchPeopleWithFallback', enter)
    expect(enter).toBeGreaterThan(-1)
    expect(call, 'the drop must precede the exact search').toBeGreaterThan(enter)
  })

  it('promotion requires POSITIVE evidence: a completed page, or the throwing Apollo path returning', () => {
// ⛓️ 17 Sep (FD-6) — `pdlPage` → `providerPage`, `scrollToken` → `cursor`. With one provider
// the PDL-shaped names stopped describing anything: the page now carries Apollo's own
// completed / exhausted / matchedNothing verdict, which the Apollo branch never reported
// before (it returned null, so no client run could ever reach searchTrust = 'proven').
    // ⛓️ RENAMED 17 Sep (FD-6) — `providerPage` → `providerPage`. The INVARIANT is unchanged and
    // the rename actually strengthens it: the Apollo branch used to return no page at all, so
    // no client run could ever reach 'proven' and every honest empty looked like an outage.
    expect(src).toContain("if (providerPage.completed) searchTrust = 'proven'")
    // ⛓️ 27 Aug — the Apollo promotion is gated on the run NOT having been refused by
    // the zero-spend guard: a blocked run also returns no page and proved nothing.
    // ⛓️ 15 Sep (S2-RT-001A) — and it is keyed on the PROVIDER, not the audience. This
    // asserted `audience === 'house'`, which named the same branch only while Apollo and
    // house were the same thing. Client Proof is Apollo now, so the audience spelling would
    // have left a COMPLETED Apollo search that honestly matched nobody recorded as `failed`
    // — the snag state, for an answer we actually received. The invariant is unchanged:
    // promotion still requires positive evidence, never the mere absence of an error.
    expect(src).toContain("} else if (sourcingProvider === 'apollo' && !paidSourcingBlocked) {")
    // No branch promotes on mere absence of error.
    expect(src).not.toMatch(/searchTrust = 'proven'\s*\/\/ default/)
  })

  it('the widened fallback must prove itself SEPARATELY — the exact proof does not transfer', () => {
    const wideCall = src.indexOf('wide = await searchPeopleWithFallback')
    const wideDrop = src.lastIndexOf("searchTrust = 'unproven'", wideCall)
    expect(wideDrop).toBeGreaterThan(-1)
    expect(wideCall).toBeGreaterThan(wideDrop)
    expect(src).toContain("if (wide?.providerPage?.completed) searchTrust = 'proven'")
  })

  it('the persisted status is derived from the trust reader', () => {
    expect(src).toContain("const trusted = searchTrust !== 'unproven'")
    // ⛓️ 16 Sep (MVP1 · A1) — RE-POINTED, NOT WEAKENED. The count argument moved from the raw
    // `inserted` to `clientUsable` (raw minus structurally set aside), because a batch whose
    // every candidate was refused was deriving `served`. The DUTY this guard protects is
    // unchanged and still asserted: the trust reader, not an absence of error, decides the
    // status, and `trusted` is what carries it in.
    expect(src).toContain('deriveRunStatus(!!clientSettings?.is_demo, clientUsable, false, audienceExhausted, trusted)')
    // And the count it is given is the gated one, derived by the shared pure function.
    expect(src).toContain('const clientUsable = clientUsableCount(inserted, setAsideCount)')
  })

  it('the PROVED-ZERO widened branch stays trustworthy — a real zero is still no_match', () => {
    const at = src.indexOf('didn’t return a second set')
    expect(src.slice(at - 600, at)).toContain('matchedNothing === true')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// D. FOUNDER RULES THAT MUST NOT HAVE MOVED
// ─────────────────────────────────────────────────────────────────────────────
describe('D · the rules this build must not have broken', () => {
  // ⛓️ 15 Sep (S1-RT-004) — same assertion, truthful location: the run-and-settle tail
  // moved VERBATIM to `lib/proof-run-launch.ts` so the route and Vida's continuation share
  // ONE implementation, so the Proof path spans both production files.
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
    + '\n' + readFileSync(join(__dirname, 'proof-run-launch.ts'), 'utf8')

  it('suppression, opt-out and dedupe still gate serving', () => {
    expect(src).toContain('isSuppressed(')
    expect(src).toContain("db.from('opt_out_blocklist')")
  })

  it('exact first, ONE widened fallback, no third automatic pass', () => {
    expect(src).toContain('PROOF PASS 2 — exact targeting matched nobody')
    expect(src).toContain('ONE widened retry')
    expect(src).toContain('proof_widened_candidate')
  })

  it('acquisition memory still fails closed before the client gates', () => {
    expect(src).toContain('rememberAcquiredIdentities')
    const at = src.indexOf('REMEMBER EVERY PAID IDENTITY')
    expect(src.slice(at, src.indexOf('rememberAcquiredIdentities(db as never, memories)'))).not.toMatch(/catch\s*\(/)
  })

  it('the crash boundary still writes `failed` and alerts', () => {
    const at = src.indexOf('[icps/proof] proof run failed:')
    const block = src.slice(at - 900, at + 1600)
    // ⛓️ 15 Sep (S1-RT-004) — same call, same specificity; the shared module names the icp
    // `icpId` instead of re-reading `req.params.id`, because it is no longer inside the route.
    expect(block).toContain("recordRunOutcome(icpId, clientId, 'failed'")
    expect(block).toContain('sendFounderAlert')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// E. THE THREE CORRECTIONS FROM THE FINAL REVIEW (26 Aug)
// ─────────────────────────────────────────────────────────────────────────────
describe('E · suppression must never be reported as a targeting failure', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  // ⛓️ GENERALISED 26 Aug (final review): suppression-all was one instance of a wider
  // truth — a zero that K.I.N.D itself created (suppression, dedupe, insert failure) is
  // never a targeting verdict. One condition now covers every K.I.N.D-side removal.
  it('a completed search whose contacts K.I.N.D removed does NOT derive no_match', () => {
    // ⛓️ 16 Sep (MVP1 · A1) — RE-POINTED, AND THE RULE GOT WIDER RATHER THAN NARROWER.
    //
    // The predicate was inline and asked `inserted === 0`, which caught every K.I.N.D-side
    // removal that happens BEFORE the insert (suppression, dedupe, insert failure) and missed
    // the one that happens after it: the 10-Sep STRUCTURAL GATE. It is now the shared pure
    // `gatesEmptiedTheRun`, asked about the count that actually reached the desk — so the
    // set-aside case joins the very family this test was written to defend.
    expect(src).toContain('const gatesAteEverything = gatesEmptiedTheRun({')
    expect(src).toContain('clientUsable, searchTrusted: trusted, providerContactsReturned,')
    expect(src).toContain("? 'failed'")
  })

  it('the counts come from the gates that actually removed them', () => {
    expect(src).toContain('if (reason !== null) suppressedHere += 1')
    expect(src).toContain('removedByDedupe++')
    expect(src).toContain('providerContactsReturned = contacts.length')
  })

  it('the real cause reaches a HUMAN and never the prospect', () => {
    const at = src.indexOf('A completed search was emptied entirely by K.I.N.D-side gates')
    expect(at).toBeGreaterThan(-1)
    const alert = src.slice(at - 200, at + 700)
    expect(alert).toContain('sendFounderAlert')
    expect(alert).toContain('Their targeting may be correct')
    // The CLIENT copy for this state is the neutral recovery body — no DNC mechanics.
    expect(runOutcomeMessage('failed', 0)).not.toMatch(/suppress|dnc|opt.?out|blocklist/i)
    expect(runOutcomeMessage('failed', 0)).not.toMatch(/widen|narrow|broaden/i)
  })

  it('a genuine completed zero with NO suppression is still no_match', () => {
    expect(runOutcomeMessage('no_match', 0)).toMatch(/widen/i)
    expect(deriveRunStatus(false, 0, false, false, true)).toBe('no_match')
  })
})

describe('E · the desk is bounded — a wait that never resolves ends in recovery', () => {
  const portal = readFileSync(
    join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'), 'utf8')

  it('an exhausted poll shows the approved recovery copy, not "still finding"', () => {
    // ⛓️ 26 Aug (correction pass) — the flag is now `proofWaitEnded`, which is TRUE for an
    // exhausted poll AND for a reopen whose durable stamp is already past the bound. Same
    // copy, same bound, one more way of reaching it honestly.
    // ⛓️ 23 Sep — the founder superseded the 26 Aug recovery copy: *"the i hit a snag is bulsshit. it is so customer unfriendly."*
    expect(portal).toContain("{proofWaitEnded ? 'Your first examples are on their way' : 'Finding your matches now…'}")
    expect(portal).toContain('Your brief is saved and K.I.N.D is finishing your first examples. You do not need to do anything or start again — they will appear here as soon as they are ready.')
    // The old sentence claimed a search was still running when nothing was.
    expect(portal).not.toContain('We’re still finding your matches. You can come back to this page shortly.')
  })

  it('backend truth still wins — the recovery branch only renders with no terminal outcome', () => {
    const t = portal.indexOf('terminalRun ? (')
    const f = portal.indexOf('proofAwaiting ? (')
    expect(t).toBeGreaterThan(-1)
    expect(f).toBeGreaterThan(t)
  })

  it('the poll is bounded and offers no uncontrolled retry', () => {
    // ⛓️ 17 Sep (J5-C14) — WAS `toContain('const FINDING_MAX_CHECKS = 80')`. 80 was PDL's
    // number (see section F) and, more importantly, a LOCALLY TYPED one. The desk now imports
    // its budget, so the assertion is that the cap exists and is DERIVED — a re-typed literal
    // is the defect this stopped being able to catch.
    expect(portal).toContain('const FINDING_MAX_CHECKS = PROOF_DESK_MAX_CHECKS')
    expect(portal).not.toMatch(/const FINDING_MAX_CHECKS = \d/)
    expect(portal).toContain('if (checks >= FINDING_MAX_CHECKS) { clearInterval(timer); setFindingTimedOut(true); return }')
  })
})

describe('E · a short batch states its real size', () => {
  const portal = readFileSync(
    join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'), 'utf8')

  it('the batch heading carries the actual count', () => {
    const at = portal.indexOf("{batchKey(l) === proofBatches[0] ? 'Latest set' : 'Earlier set'}")
    const block = portal.slice(at, at + 900)
    expect(block).toContain("pending.filter(x => batchKey(x) === batchKey(l)).length")
    expect(block).toMatch(/'match' : 'matches'/)
  })

  it('claims no target, promises nothing more, offers no retry', () => {
    const at = portal.indexOf("{batchKey(l) === proofBatches[0] ? 'Latest set' : 'Earlier set'}")
    // ⚠️ STRIP COMMENTS FIRST. The block's own explanation says "offers no retry", and an
    // earlier version of this guard matched that sentence — the third self-match this
    // session. Assert what RENDERS, never what the code says about itself.
    const block = portal.slice(at, at + 900)
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/^\s*\/\/.*$/gm, '')
    expect(block).not.toMatch(/of 20|out of 20|more coming|retry|try again/i)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// F. THE FINAL REVIEW (26 Aug) — collision ruling, dedupe-all, bound math,
//    and the complete status inventory
// ─────────────────────────────────────────────────────────────────────────────
describe('F · the acquisition-memory collision, as the founder ruled it', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
  const block = src.slice(src.indexOf('AMENDED BY FOUNDER RULING'), src.indexOf('for (const contact of contacts) {', src.indexOf('AMENDED BY FOUNDER RULING')))

  it('A · safe pool matches survive a paid memory failure — paid identities do not', () => {
    // The catch empties `contacts`, so the insert loop below it never runs: no paid
    // identity can be inserted, surfaced or served. Pool leads were inserted EARLIER
    // (servePoolLeads) and are untouched — they surface, and `inserted > 0` → served.
    expect(block).toContain('contacts = []')
    expect(block).toContain('pool-served matches')
  })

  it('B · zero pool + memory failure derives failed, never no_match', () => {
    // Trust drops with the withholding, and a zero with unproven trust is `failed`.
    expect(block).toContain("searchTrust = 'unproven'")
    expect(deriveRunStatus(false, 0, false, false, false)).toBe('failed')
  })

  it('C · a CRITICAL alert names the money at risk', () => {
    expect(block).toContain('CRITICAL: paid identities acquired but NOT recorded')
    expect(block).toContain('The provider may bill for these records')
  })

  it('the memory write itself is unchanged — fail-closed with one retry (R67)', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    let attempts = 0
    const broken = {
      from: () => ({
        upsert: async () => { attempts++; return { error: { message: 'boom' } } },
        update: () => ({ eq: () => ({ eq: () => ({ in: async () => ({ error: null }) }) }) }) as never,
      }),
    }
    const { rememberAcquiredIdentities, toMemoryRecord, AcquisitionMemoryWriteError } = await import('./acquisition-memory')
    await expect(rememberAcquiredIdentities(broken as never, [
      toMemoryRecord({ id: 'pdl_x', first_name: 'A' }, { source: 'pdl', costUsd: 0.28 })!,
    ])).rejects.toThrow(AcquisitionMemoryWriteError)
    expect(attempts).toBe(2)
    spy.mockRestore()
  })
})

describe('F · dedupe-all is a neutral review state, not a targeting verdict', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  it('already-owned removals are counted at the gate that removes them', () => {
    const at = src.indexOf('if (existing) { skipped++; removedByDedupe++; continue }')
    expect(at).toBeGreaterThan(-1)
  })

  it('a completed search fully deduped routes to the SAME neutral state as suppression-all', () => {
    // One condition covers every K.I.N.D-side removal: returned > 0, nothing usable, trusted.
    // ⛓️ 16 Sep (A1) — and "nothing usable" now means AFTER the structural gate, not before it.
    expect(src).toContain('const gatesAteEverything = gatesEmptiedTheRun({')
  })

  it('audience_exhausted was REJECTED for this case, with the reason in the source', () => {
    // Its copy says "widen the ICP" and its semantics claim the audience is finished —
    // both false after a dedupe-all, where the cursor advanced and the next page may
    // hold new people. The decision and its why live at the decision site.
    const at = src.indexOf('deliberately does NOT reuse `audience_exhausted`')
    expect(at).toBeGreaterThan(-1)
    expect(exhaustedMessage(0)).toMatch(/widen/i)   // proof the rejection was right
  })

  it('the neutral client copy blames nobody and exposes nothing', () => {
    expect(runOutcomeMessage('failed', 0)).not.toMatch(/widen|narrow|broaden/i)
    expect(runOutcomeMessage('failed', 0)).not.toMatch(/duplicate|dedupe|already (have|own)|database|suppress|dnc/i)
  })
})

describe('F · the polling bound is derived, not picked', () => {
  const portalSrc = codeOnly(readFileSync(
    join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'), 'utf8'))

  // ⛓️ 17 Sep (J5-C14 · FD-6) — THIS SECTION WAS MEASURING A PROVIDER WE DO NOT USE. It read
  // `pdl-search.ts` and rebuilt PDL's worst case from its own constants —
  //
  //     `const PDL_ATTEMPT_TIMEOUT = 15_000; const LADDER_RUNGS = 4;`
  //     `const RATE_LIMIT_RETRY = 2_500 + PDL_ATTEMPT_TIMEOUT; … expect(maxChecks).toBe(80)`
  //
  // — and then asserted the desk's two hand-typed literals against it. Under FD-6 Proof
  // sources from Apollo, which has no size ladder: it pages. The assertions below are the
  // SAME two facts (the bound clears the provider's worst case; the desk cannot declare
  // failure early) re-derived from Apollo, and they no longer read a retired provider's file.
  //
  // ⚠️ AND THE PARSE IS GONE ON PURPOSE. Digging two integers out of the page with a regex
  // only worked because they were typed there. They are imported now, so the assertion is
  // that the page names the shared constants — a literal reappearing is the failure.

  it('the client bound clears the provider worst case with margin', () => {
    const WORST_PROVIDER_TIME = APOLLO_REQUEST_TIMEOUT_MS * APOLLO_PROOF_WORST_CASE_REQUESTS
    expect(PROOF_WAIT_MS, 'bound must exceed the legitimate worst case').toBeGreaterThan(WORST_PROVIDER_TIME)
    expect(PROOF_DESK_POLL_MS * PROOF_DESK_MAX_CHECKS).toBe(PROOF_WAIT_MS)
    // 🛑 THE CONSTANT THE MATH RESTS ON MUST BE APPLIED, not merely declared. `searchPeople`
    // had no timeout at all, and Node's `fetch` has no default — so the "worst case" this
    // whole section computes did not exist until the signal was passed.
    const apollo = readFileSync(join(__dirname, 'apollo.ts'), 'utf8')
    expect(apollo.match(/AbortSignal\.timeout\(APOLLO_REQUEST_TIMEOUT_MS\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(apollo).not.toMatch(/AbortSignal\.timeout\(\s*\d/)
  })

  it('the desk reads the shared budget rather than its own numbers', () => {
    expect(portalSrc).toContain('const FINDING_POLL_MS = PROOF_DESK_POLL_MS')
    expect(portalSrc).toContain('const FINDING_MAX_CHECKS = PROOF_DESK_MAX_CHECKS')
    expect(portalSrc).not.toMatch(/const FINDING_POLL_MS = \d/)
    expect(portalSrc).not.toMatch(/const FINDING_MAX_CHECKS = \d/)
  })

  it('a healthy slow proof cannot be declared failed before the backend could still be working', () => {
    expect(PROOF_DESK_POLL_MS * PROOF_DESK_MAX_CHECKS).toBeGreaterThanOrEqual(180_000)
  })
})

describe('F · the complete status space — no value exists as an untested assumption', () => {
  // ⛓️ 15 Sep (S1-RT-004) — same assertion, truthful location: the run-and-settle tail
  // moved VERBATIM to `lib/proof-run-launch.ts` so the route and Vida's continuation share
  // ONE implementation, so the Proof path spans both production files.
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
    + '\n' + readFileSync(join(__dirname, 'proof-run-launch.ts'), 'utf8')
  const runner = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')

  it('the type, the DB CHECK and the producers agree on exactly six statuses', () => {
    const outcome = readFileSync(join(__dirname, 'run-outcome.ts'), 'utf8')
    expect(outcome).toContain("export type RunStatus = 'served' | 'no_match' | 'quota_exhausted' | 'demo' | 'audience_exhausted' | 'failed'")
    expect(runner).toMatch(/check \(status in \('served','no_match','quota_exhausted','demo','audience_exhausted','failed'\)\)/)
  })

  it('every status has a producer, and every producer writes a status in the enum', () => {
    // The four explicit producers: two quota early-returns, the derived main outcome,
    // and the crash boundary. Derivation covers served/no_match/demo/audience_exhausted/
    // failed; the explicit sites cover quota_exhausted and crash-failed.
    // ⛓️ 5 → 6 on 10 Sep: +1 PRODUCER, and it is the C04 structural gate's refusal. When
    // `leads.set_aside_reason` is absent the gate cannot record which candidates it refused,
    // so the Proof run FAILS CLOSED — and a run that refuses must leave a terminal truth on
    // the desk exactly like every other exit, which is the whole duty this case defends. It
    // writes `'failed'`, an enum value already covered below, so the status space is
    // unchanged; only the number of places that reach it moved.
    // ⛓️ 6 → 7 on 17 Sep (XC-13): +1 PRODUCER, and it is the PROVIDER-FAILURE handler. An
    // Apollo failure used to propagate straight out of `runIcpJob` to the crash boundary, so
    // three things were skipped: the programme reservation stayed open, "out of credits" and
    // "Apollo is down" were the same row, and nobody got a task. It now classifies the
    // failure, releases the reservation, records the run with `verdict.runStatus` — which is
    // `quota_exhausted` or `failed`, NEVER `no_match` — raises a Needs-you task, and then
    // re-throws so the crash boundary still owns the journey outcome. The status space is
    // unchanged; only the number of places that reach it moved.
    // ⛓️ 7 → 8 on 18 Sep (J5-C7): +1 PRODUCER, the UNREADABLE-FUNDING refusal in the proofMode
    // branch of `runIcpJob`. The funding read there dropped its error, so an unreadable state
    // was indistinguishable from "not funded" and the run proceeded. It now records `'failed'`
    // — an enum value already covered below — and returns before any provider call. The status
    // space is unchanged; only the number of places that reach it moved.
    expect((src.match(/recordRunOutcome\(/g) ?? []).length).toBe(8)  // 1 def + 7 producers
    expect(src, 'the provider-failure producer must write the CLASSIFIED status, never no_match')
      .toContain("recordRunOutcome(icpId, clientId, verdict.runStatus, effectiveCap, pool.served, 0)")
    expect(src).toContain("recordRunOutcome(icpId, clientId, 'failed', effectiveCap, pool.served, inserted, 0, didWiden)")
    expect(src).toContain("recordRunOutcome(icpId, clientId, 'quota_exhausted', effectiveCap, 0, 0)")
    // ⛓️ 15 Sep (S1-RT-004) — same call, same specificity; the shared module names the icp
    // `icpId` instead of re-reading `req.params.id`, because it is no longer inside the route.
    expect(src).toContain("recordRunOutcome(icpId, clientId, 'failed', PROOF_PASS_LEADS, 0, 0)")
    // ⛓️ 16 Sep (MVP1 · A1) — RE-POINTED. One argument was APPENDED: the client-usable count,
    // which drives the SENTENCE only. `inserted` is still in the `total_inserted` position, so
    // the raw sourcing figure this guard protects is provably unchanged (founder decision C).
    expect(src).toContain('recordRunOutcome(icpId, clientId, status, effectiveCap, pool.served, inserted, heldFromIcp, didWiden, clientUsable)')
  })

  it('every status carries client copy, and none leaks mechanics', () => {
    for (const st of ['served', 'no_match', 'quota_exhausted', 'demo', 'audience_exhausted', 'failed'] as const) {
      const msg = runOutcomeMessage(st, st === 'served' ? 5 : 0)
      expect(msg, st).toBeTruthy()
      expect(msg, st).not.toMatch(/pdl|apollo|hunter|clearbit|http|stack|constraint|suppress|dedupe/i)
    }
  })

  it('a LOST outcome write now alerts a human on every path, not only the constraint case', () => {
    expect(src).toContain('An ICP run outcome could not be persisted — the client desk has no terminal truth for this run')
    expect(src).toContain('An ICP run outcome could not be persisted (write threw)')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// G. THE FINAL NARROW GATE (26 Aug) — clean-URL strand, house truth, required
//    trust argument, and the 404 contract
// ─────────────────────────────────────────────────────────────────────────────
describe('G · a clean URL cannot strand the first client — and cannot cry failure early', () => {
  const portalSrc = codeOnly(readFileSync(
    join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'), 'utf8'))

  // ⛓️ REWRITTEN 26 Aug (correction pass). These used to assert a `proofStranded ? (`
  // branch that rendered the recovery card as soon as a clean URL loaded. That branch is
  // GONE, because rendering it was the defect: it declared failure with no reference to how
  // long the run had actually been going. The behavioural rule that replaced it is RUN, not
  // pattern-matched, in `apps/portal/src/lib/proof-start.test.ts` — 24 tests covering 30s,
  // 90s, the boundary, reopen, unknown elapsed and clock skew. What remains here is only
  // what a source guard is genuinely good for: that the wiring is present and ordered.

  it('the wait is derived from SERVER state — counter AND clock', () => {
    // Both facts come from the claim itself and survive closing the browser: the counter
    // says a pass was taken, and `proof_started_at` says when. Neither is inferred.
    expect(portalSrc).toContain('proofPassesDone:    summary?.proof_passes_done ?? 0')
    // ⛓️ 26 Aug — the desk now feeds `currentStartedAt`, which is the server's start EXCEPT
    // while reconciling an ambiguous claim, when the visible start belongs to the old pass
    // and is therefore unknown for this one.
    expect(portalSrc).toContain('serverStartedAt:    currentStartedAt')
    expect(portalSrc).toContain('const currentStartedAt = reconciling ? 0 : serverProofStartedAt(summary)')
    expect(portalSrc).toContain('server:             serverState')
  })

  it('⚑ THE BROWSER CLOCK IS GONE — there is no second source of timing to go stale', () => {
    // ⛓️ 26 Aug (durable server truth). The previous pass mirrored a `?since=` stamp into
    // localStorage. It could be written after a lost response, missing on another device, or
    // stale from an older pass — three ways to make a healthy run look failed. Removed
    // outright rather than demoted, so none of them can recur.
    expect(portalSrc).not.toContain('localStorage')
    expect(portalSrc).not.toContain('rememberProofStart')
    expect(portalSrc).not.toContain('storedProofStart')
    expect(portalSrc).not.toContain('findingSince')
    const rule = codeOnly(readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'lib', 'proof-start.ts'), 'utf8'))
    expect(rule).not.toContain('localStorage')
    // Exactly ONE timing input reaches the rule, and it is the server's.
    expect(rule).toContain('serverStartedAt: number')
    expect(rule.match(/^\s+(\w*[Ss]tartedAt)\??:/gm) ?? [], 'one timing field only').toHaveLength(1)
  })

  it('the verdict comes from ONE shared rule, not from JSX conditions written twice', () => {
    expect(portalSrc).toContain('const proofWait = proofWaitState({')
    expect(portalSrc).toContain("const proofAwaiting = proofWait !== 'none'")
    expect(portalSrc).toContain("const proofWaitEnded = proofWait === 'recovery'")
  })

  it('⚑ THE REGRESSION GUARD — a clean URL may never render recovery without consulting elapsed time', () => {
    // The deleted branch's shape. If anything reintroduces a card that decides "snag" from
    // the mere ABSENCE of an outcome, it will reintroduce the bug with it.
    expect(portalSrc).not.toContain('proofStranded')
    // EXACTLY TWO recovery headlines exist, and each is behind a fact rather than an
    // absence: one behind `proofFailed` (the SERVER recorded a crash) and one behind
    // `proofWaitEnded` (the justified bound has passed). A third would be a new way to
    // claim failure, and this count is what makes adding one impossible to do quietly.
    // ⛓️ 23 Sep — the founder superseded the 26 Aug recovery copy: *"the i hit a snag is bulsshit. it is so customer unfriendly."* The count is unchanged: still exactly two, now of the new headline.
    const headlines = portalSrc.split("'Your first examples are on their way'").length - 1
    expect(headlines, 'one server-recorded failure headline + one bounded-wait headline').toBe(2)
    expect(portalSrc).toContain("{proofWaitEnded ? 'Your first examples are on their way' : 'Finding your matches now…'}")
    expect(portalSrc).toContain('{proofFailed')
  })

  it('backend truth and real leads still render before the wait card', () => {
    // ⛓️ 30 Aug (BUILD-004A-1, OPTION B) — THE ANCHOR MOVED, THE RULE DID NOT. The generic
    // empty state used to read "No leads waiting right now. We'll notify you…" — paid-desk
    // copy carrying a notification promise nothing in the product sends. Option B's panel
    // states the same fact and promises nothing. The ORDERING this guards is untouched: the
    // server's terminal verdict first, then the bounded wait, then — and only then — the
    // claim that there is genuinely nothing to react to.
    const t = portalSrc.indexOf('terminalRun ? (')
    const wait = portalSrc.indexOf('proofAwaiting ? (')
    const generic = portalSrc.indexOf('Nothing to react to right now')
    expect(t).toBeGreaterThan(-1)
    expect(generic, 'the generic empty state is gone — this guard would pass vacuously').toBeGreaterThan(-1)
    expect(wait, 'the wait must be evaluated after the terminal state').toBeGreaterThan(t)
    expect(generic, 'and before the generic empty state').toBeGreaterThan(wait)
    // ⚠️ AND IT MAKES NO PROMISE. The retired line said we would notify them; nothing does.
    expect(portalSrc, "the empty state promises a notification again").not.toContain("We'll notify you")
  })

  it('the poll keeps checking while waiting — so an in-flight run resolves it, and a late one still can', () => {
    expect(portalSrc).toContain('if ((!finding && !proofAwaiting) || pending.length > 0 || terminalRun) return')
  })

  it('the elapsed bound and the poll budget are the same number, enforced at load', () => {
    // Two constants that must agree; a hand-typed second copy would drift silently.
    expect(portalSrc).toContain('if (FINDING_POLL_MS * FINDING_MAX_CHECKS !== PROOF_WAIT_MS)')
  })

  it('neither proof flow carries or writes a clock — the claim already recorded one', () => {
    const welcome = codeOnly(readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'welcome', 'page.tsx'), 'utf8'))
    for (const [name, src] of [['desk', portalSrc], ['welcome', welcome]] as const) {
      // ⛓️ 23 Sep — WAS: both files contained `router.push('/milla?finding=1')`. The welcome
      // page no longer navigates when the run STARTS — the founder's rule holds the client in
      // the Brief until their people are ready — so it carries no finding hint at all. The
      // property this test exists for (no clock travels or is stored) is asserted unchanged.
      if (name === 'welcome') expect(src, name).not.toContain('finding=1')
      // But no timestamp travels with it, and none is stored: the run's START was recorded
      // by the claim itself, so there is no browser value left to be lost, missing on
      // another device, or stale from an older pass.
      expect(src, `${name}: no clock in the URL`).not.toContain('since=${')
      // ⚠️ SCOPED TO PROOF TIMING, not to localStorage as a whole — the welcome page
      // legitimately stores a referral code and a terms acceptance, and a blanket ban would
      // fail on those and say nothing about the clock.
      expect(src, `${name}: no stored proof clock`).not.toContain('kind.proof.started_at')
      expect(src, `${name}: no stored proof clock`).not.toContain('rememberProofStart')
      expect(src, `${name}: no stored proof clock`).not.toContain('storedProofStart')
    }
  })

  it('⚑ A SUCCESSFUL PASS-2 CLAIM INVALIDATES THE OLD PROOF SNAPSHOT — and only then', () => {
    // ⚠️ THE DESK IS ALREADY MOUNTED FOR PASS 2, and `router.push('/milla?finding=1')` is a
    // same-route query change: React re-renders, it does not remount. So the Pass 1 summary,
    // the `finding` flag (mount-only effect) and `findingTimedOut` all survive the claim —
    // and Pass 1's outcome would read as terminal for Pass 2 and STOP THE POLL.
    const at = portalSrc.indexOf('await api.post(`/icps/${afterId}/proof`, {}, tk)')
    expect(at, 'the one proof POST on the desk').toBeGreaterThan(-1)
    const push = portalSrc.indexOf("router.push('/milla?finding=1')", at)
    expect(push).toBeGreaterThan(at)
    const afterClaim = portalSrc.slice(at, push)

    // All three stale carriers are cleared, and the new state is fetched at once.
    expect(afterClaim).toContain('setSummary(invalidateProofSnapshot)')
    expect(afterClaim, 'Pass 1 exhausted poll must not end Pass 2').toContain('setFindingTimedOut(false)')
    expect(afterClaim).toContain('void load()')

    // ⚠️ AFTER THE AWAIT, NOT BEFORE. A refused claim (the two-pass ceiling) throws to the
    // catch and never reaches these lines, so a valid Pass 1 desk is never blanked by a
    // refusal. Ordering IS the guarantee here, so it is asserted rather than assumed.
    expect(portalSrc.indexOf('setSummary(invalidateProofSnapshot)')).toBeGreaterThan(at)

    // And the invalidation invents nothing: it clears the two proof facts and no more.
    const rule = codeOnly(readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'lib', 'proof-start.ts'), 'utf8'))
    const fn = rule.slice(rule.indexOf('export function invalidateProofSnapshot'))
    expect(fn).toContain('proof_started_at: null')
    expect(fn).toContain('proof_run: null')
    expect(fn, 'the pass counter is the server\'s — never rewritten in the browser')
      .not.toContain('proof_passes_done')
  })

  it('⚑ AN AMBIGUOUS PASS-2 FAILURE RECONCILES; A DEFINITIVE REFUSAL DOES NOT', () => {
    // A Pass 2 POST can COMMIT on the server and still fail in the browser (15s abort,
    // dropped connection). "We didn't hear back" must not be treated as "nothing happened",
    // which is what left Pass 1's terminal card on screen until a reload.
    const at = portalSrc.indexOf("if (proofAttemptedRef.current && classifyClaimFailure(status) === 'unknown')")
    expect(at, 'the reconciliation branch in the catch').toBeGreaterThan(-1)
    const block = portalSrc.slice(at, at + 400)
    expect(block).toContain('setSummary(invalidateProofSnapshot)')
    expect(block).toContain('setFindingTimedOut(false)')
    expect(block).toContain('void load()')

    // ⚠️ IT MUST BE GATED ON BOTH. Dropping `proofAttemptedRef` would invalidate a Pass 1
    // desk on a stale-preview or save failure that never claimed anything; dropping the
    // classifier would invalidate it on a definitive 409 refusal.
    expect(block.indexOf('setSummary(invalidateProofSnapshot)')).toBeGreaterThan(-1)

    // The classifier is structured — status ranges, never message text.
    const rule = codeOnly(readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'lib', 'proof-start.ts'), 'utf8'))
    const fn = rule.slice(rule.indexOf('export function classifyClaimFailure'))
    expect(fn).toContain("CLAIM_REFUSED_STATUSES.has(status) ? 'refused' : 'unknown'")
    expect(fn, 'no message-string heuristics').not.toMatch(/\.message|includes\(|test\(/)
  })

  it('⚑ A DEFINITIVE 409 SHOWS THE DEFINITIVE COPY, NOT THE AMBIGUITY SENTENCE', () => {
    // ⛓️ ORDERING WAS THE BUG. The `proofAttemptedRef` branch used to be evaluated FIRST, so
    // the two-pass 409 — the one status that PROVES the pass was not claimed — told the
    // client "we could not confirm the new search started". The server had told us plainly,
    // and supplied the wording. The copy itself never changed; only which branch wins.
    // ⚠️ ANCHOR ON THE MULTI-LINE CALL. `setRefineErr(null)` appears earlier in the same
    // function, and slicing from that swept in the reconciliation block above — whose own
    // `proofAttemptedRef.current` then read as the copy branch. The chain call is the only
    // `setRefineErr(` followed by a newline.
    const chain = portalSrc.slice(portalSrc.indexOf('setRefineErr(\n'))
    const definitive = chain.indexOf('status === 409')
    const ambiguous  = chain.indexOf('proofAttemptedRef.current')
    expect(definitive, 'the 409 branch').toBeGreaterThan(-1)
    expect(ambiguous, 'the ambiguity branch').toBeGreaterThan(-1)
    expect(ambiguous, 'a definitive answer must outrank "we do not know"').toBeGreaterThan(definitive)
    // And the definitive branch renders the SERVER's own sentence, not one written here.
    expect(chain.slice(definitive, ambiguous)).toContain('(code ||')

    // The allowlist itself is endpoint-derived and narrow — no blanket 4xx rule survives.
    const rule = codeOnly(readFileSync(
      join(__dirname, '..', '..', '..', 'portal', 'src', 'lib', 'proof-start.ts'), 'utf8'))
    expect(rule).toContain('const CLAIM_REFUSED_STATUSES: ReadonlySet<number> = new Set([409])')
    expect(rule, 'a status-range rule is an assumption, not endpoint evidence')
      .not.toMatch(/status >= 400 && status < 500/)
  })

  it('⚑ THE DESK APPLIES THE RECONCILIATION GATE — an older pass cannot be current truth', () => {
    // ⚠️ THIS GUARD EXISTS BECAUSE A RED-PROOF SLIPPED THROUGH. The pure-rule tests model
    // the gate in their own helper, so deleting it from the PAGE broke nothing — the rule
    // stayed right while the desk stopped obeying it. Both halves are asserted now.
    //
    // `terminalRun` must return null while reconciling: it is the single value the render,
    // the poll guard and `proofWaitState` all read, so gating it there corrects all three.
    const memo = portalSrc.slice(portalSrc.indexOf('const terminalRun = useMemo('))
    const body = memo.slice(0, memo.indexOf('}, ['))
    expect(body, 'the reconciliation gate, first thing in the memo').toContain('if (reconciling) return null')
    expect(body.indexOf('if (reconciling) return null'), 'before any outcome is read')
      .toBeLessThan(body.indexOf('summary?.proof_run'))
    // And it must actually re-run when reconciliation resolves.
    expect(memo.slice(memo.indexOf('}, ['), memo.indexOf('}, [') + 40)).toContain('reconciling')

    // The marker is captured from the SERVER value we already held, BEFORE invalidation —
    // asserted inside the ambiguous block, because `setSummary(invalidateProofSnapshot)`
    // also appears earlier on the SUCCESS path and a file-wide indexOf finds that one.
    const ambiguous = portalSrc.slice(
      portalSrc.indexOf("classifyClaimFailure(status) === 'unknown'"))
    expect(ambiguous).toContain('setReconcileFrom(serverProofStartedAt(summary))')
    expect(ambiguous.indexOf('setReconcileFrom(serverProofStartedAt(summary))'),
      'the old start must be captured before it is cleared')
      .toBeLessThan(ambiguous.indexOf('setSummary(invalidateProofSnapshot)'))
    // ⚠️ AND IT IS ONLY EVER SET ON THE AMBIGUOUS PATH — a definitive 409 must not reconcile.
    expect((portalSrc.match(/setReconcileFrom\(/g) ?? []), 'exactly one setter').toHaveLength(1)
  })

  it('the summary carries the durable start, read from the column the claim writes', () => {
    const summary = codeOnly(readFileSync(join(__dirname, 'milla-summary.ts'), 'utf8'))
    expect(summary).toContain("select('wallet_balance_usd, proof_passes_done, proof_started_at')")
    expect(summary).toContain('proof_started_at: string | null')
  })
})

describe('G · house/Apollo — every untrustworthy exit throws; only a real zero returns', () => {
  const saved = { ...process.env }
  let fetchSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetModules()
    process.env.APOLLO_API_KEY = 'test-apollo'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    delete process.env.SAFE_TEST_MODE
    delete process.env.PDL_API_KEY          // house: PDL never consulted anyway
  })
  afterEach(() => {
    fetchSpy?.mockRestore()
    for (const k of ['APOLLO_API_KEY', 'PAID_PROVIDERS_ENABLED', 'SAFE_TEST_MODE', 'PDL_API_KEY']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
    }
  })

  const house = async () => {
    const { searchPeopleWithFallback } = await import('./apollo')
    return searchPeopleWithFallback(ICP as never, 1, 20, null, 'house')
  }

  it('timeout / network → THROWS (never a soft zero)', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'))
    await expect(house()).rejects.toThrow()
  })

  it('HTTP 5xx → THROWS', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(503, 'upstream down'))
    await expect(house()).rejects.toThrow(/Apollo API 503/)
  })

  it('auth 401/403 → THROWS', async () => {
    for (const code of [401, 403]) {
      vi.resetModules(); fetchSpy?.mockRestore()
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(code, 'bad key'))
      await expect(house()).rejects.toThrow(new RegExp(`Apollo API ${code}`))
    }
  })

  it('rate limit → THROWS the named error', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(429, ''))
    await expect(house()).rejects.toThrow(/rate limit/i)
  })

  it('unparseable body → THROWS', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true, status: 200,
      json: async () => { throw new SyntaxError('bad json') },
      text: async () => '<html>',
    } as unknown as Response)
    await expect(house()).rejects.toThrow()
  })

  it('⚑ 200 with an UNRECOGNISED shape → THROWS — this was the one soft path', async () => {
    // Neither "contacts" nor "people": a proxy page or schema change, not a zero.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, { unexpected: true }))
    await expect(house()).rejects.toThrow(/unrecognised body/)
  })

  it('a GENUINE completed zero returns normally — the key present, the array empty', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(200, { contacts: [] }))
    const out = await house()
    expect(out.contacts).toEqual([])            // returning IS the evidence, now truthfully
    expect(out.relaxed).toMatch(/no contacts found/i)
  })
})

describe('G · the trust argument is REQUIRED — forgetting it cannot compile into no_match', () => {
  it('deriveRunStatus has no default for searchCompleted', () => {
    // ⚠️ `codeOnly` is load-bearing here, not tidiness: the function's own doc comment
    // NAMES the default it deleted (`searchCompleted = true`), so a raw-source guard would
    // fail on the very sentence recording the fix.
    const src = codeOnly(readFileSync(join(__dirname, 'run-outcome.ts'), 'utf8'))
    expect(src).toContain('searchCompleted: boolean,')
    expect(src).not.toContain('searchCompleted = true')
  })

  it('the single production call site passes the trust reader explicitly', () => {
    const src = codeOnly(readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8'))
    const calls = src.match(/deriveRunStatus\([^)]*\)/g) ?? []
    expect(calls).toHaveLength(1)
    expect(calls[0]).toContain('trusted')
  })
})

describe('G · PDL 404 is a provider zero ONLY when the body says not_found', () => {
  const saved = { ...process.env }
  let fetchSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    vi.resetModules()
    process.env.PDL_API_KEY = 'test-pdl'
    process.env.PAID_PROVIDERS_ENABLED = 'true'
    delete process.env.SAFE_TEST_MODE
  })
  afterEach(() => {
    fetchSpy?.mockRestore()
    for (const k of ['PDL_API_KEY', 'PAID_PROVIDERS_ENABLED', 'SAFE_TEST_MODE']) {
      if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]
    }
  })
  const page = async () => {
    const { pdlSearchPage } = await import('./pdl-search')
    return pdlSearchPage(ICP, 20, null)
  }

  const paged = async () => {
    const { pdlSearchPage } = await import('./pdl-search')
    return pdlSearchPage(ICP, 20, 'a-real-scroll-token')
  }

  it('1 · the documented no-records 404 → trustworthy completed zero', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      res(404, { status: 404, error: { type: 'not_found', message: 'No records were found matching your search' } }))
    const p = await page()
    expect(p.completed).toBe(true)
    expect(p.matchedNothing).toBe(true)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('no_match')
  })

  // ⛓️ THE CORRECTION, AND IT IS THE WHOLE POINT OF THIS BLOCK. The predicate was
  //     type === 'not_found' || /no records/i.test(message)
  // so `type: 'not_found'` ON ITS OWN was enough. Every row below carries exactly that
  // type — and each one means something entirely different from "your search matched
  // nobody". Under the old OR, all of them became a trusted zero and told a prospect to
  // widen targeting we had never actually tested. BOTH halves are now required.
  it('2 · ⚑ `not_found` with an ENDPOINT/RESOURCE message → NOT a zero → failed', async () => {
    const impostors = [
      { status: 404, error: { type: 'not_found', message: 'Endpoint not found' } },
      { status: 404, error: { type: 'not_found', message: 'The requested resource was not found' } },
      { status: 404, error: { type: 'not_found', message: 'Dataset not found' } },
      { status: 404, error: { type: 'not_found', message: 'API version not found' } },
      { status: 404, error: { type: 'not_found' } },                       // type, no message at all
      { status: 404, error: { type: 'not_found', message: '' } },          // type, empty message
    ]
    for (const body of impostors) {
      vi.resetModules(); fetchSpy?.mockRestore()
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(404, body))
      const p = await page()
      expect(p.completed, JSON.stringify(body)).toBe(false)
      expect(p.matchedNothing, JSON.stringify(body)).toBe(false)
      expect(p.exhausted, JSON.stringify(body)).toBe(false)
      expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed), JSON.stringify(body)).toBe('failed')
    }
  })

  it('3–5 · a bare, malformed or gateway-style 404 is never a zero', async () => {
    const notZeros = [
      {},                                                  // 3 · bare 404
      { error: 'not found' },                              // 4 · malformed — error is a string
      { error: { message: 'no records were found' } },      // 4 · right words, NO type
      { message: 'No records were found' },                 // 4 · right words, wrong envelope
      { error: { type: 'gateway_error', message: 'Bad gateway' } },   // 5 · proxy/gateway
      { error: { type: 'internal_error', message: 'upstream failure' } },
    ]
    for (const body of notZeros) {
      vi.resetModules(); fetchSpy?.mockRestore()
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(404, body))
      const p = await page()
      expect(p.completed, JSON.stringify(body)).toBe(false)
      expect(p.matchedNothing, JSON.stringify(body)).toBe(false)
      expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed), JSON.stringify(body)).toBe('failed')
    }
  })

  it('4b · an UNPARSEABLE 404 body is not a zero either', async () => {
    // `res.json()` rejects — an HTML error page from a proxy is the everyday shape of this.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false, status: 404,
      json: async () => { throw new SyntaxError('Unexpected token <') },
      text: async () => '<html>404 Not Found</html>',
    } as unknown as Response)
    const p = await page()
    expect(p.completed).toBe(false)
    expect(p.matchedNothing).toBe(false)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
  })

  it('6 · a PAGED 404 obeys the SAME evidence standard before claiming the audience is finished', async () => {
    // `audience_exhausted` tells a client "we found all of them, you already have every
    // one" — a terminal claim about their whole market. A gateway 404 on page four is no
    // more evidence of that than it is of a zero, so it must clear the same bar.
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      res(404, { status: 404, error: { type: 'not_found', message: 'Endpoint not found' } }))
    const bad = await paged()
    expect(bad.exhausted, 'a generic not_found must NOT declare the audience finished').toBe(false)
    expect(bad.completed).toBe(false)
    expect(deriveRunStatus(false, 0, false, bad.exhausted, bad.completed)).toBe('failed')

    // And the documented body still does declare it — #366 is unchanged for real evidence.
    vi.resetModules(); fetchSpy.mockRestore()
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      res(404, { status: 404, error: { type: 'not_found', message: 'No records were found matching your search' } }))
    const good = await paged()
    expect(good.exhausted).toBe(true)
    expect(good.completed).toBe(true)
    expect(deriveRunStatus(false, 0, false, good.exhausted, good.completed)).toBe('audience_exhausted')
  })

  it('the predicate is an AND — no single half can carry a 404 on its own', () => {
    const src = codeOnly(readFileSync(join(__dirname, 'pdl-search.ts'), 'utf8'))
    const at = src.indexOf('const saidNoRecords')
    expect(at, 'the 404 predicate').toBeGreaterThan(-1)
    const predicate = src.slice(at, src.indexOf('\n', src.indexOf('test(', at)))
    expect(predicate).toContain('&&')
    expect(predicate, 'an OR here is the defect this block exists for').not.toContain('||')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// H. THE ZERO THAT COMES AFTER WE ALREADY WIDENED (26 Aug)
//
// THE DEFECT, and it was reachable. The PERSISTED message is derived from `status` alone
// (`recordRunOutcome` → `runOutcomeMessage`), and `relaxed` — the honest sentence the run
// builds for this exact branch — is returned to a fire-and-forget caller and discarded. So a
// pass-2 widened search that COMPLETED and genuinely matched nobody derived `no_match`, whose
// sentence is "Try widening it — broaden the job titles, seniority, industries or regions."
// The desk renders the server's message, so a client who had just been through the ONE
// approved widened fallback was told to go and widen again — advice they cannot act on and
// which contradicts the founder rule that a widened zero ends at a human.
// ─────────────────────────────────────────────────────────────────────────────
describe('H · a completed zero AFTER the one widened fallback never advises widening again', () => {
  it('⚑ THE DEFECT — the un-widened no_match still says "try widening", and should', () => {
    // Unchanged for a FIRST-pass zero: nothing has been widened, so the advice is real.
    const first = runOutcomeMessage('no_match', 0, 0, false)
    expect(first).toMatch(/widening/i)
  })

  it('⚑ THE FIX — once the fallback has run, the sentence goes to a human instead', () => {
    const after = runOutcomeMessage('no_match', 0, 0, true)
    expect(after, 'never advise a widening we already did').not.toMatch(/widen/i)
    expect(after).toBe(WIDENED_NO_MATCH_BODY)
    expect(after).toContain('K.I.N.D will review it with you')
    // It also claims nothing else untrue: no exhausted audience, no timing, no retry.
    expect(after).not.toMatch(/already have|exhaust|try again|shortly|minutes/i)
  })

  it('the status itself is UNCHANGED and still true — no new status for a copy problem', () => {
    // The search completed and matched nobody. `no_match` is the honest state; only the
    // sentence differs. Inventing a status would have widened the CHECK constraint and the
    // whole outcome space for what is a wording defect.
    expect(deriveRunStatus(false, 0, false, false, true)).toBe('no_match')
  })

  it('no OTHER status is touched by the flag', () => {
    for (const s of ['served', 'audience_exhausted', 'quota_exhausted', 'demo', 'failed'] as const) {
      expect(runOutcomeMessage(s, 3, 0, true), s).toBe(runOutcomeMessage(s, 3, 0, false))
    }
  })

  it('and NO status ever tells a widened client to widen again', () => {
    for (const s of ['served', 'no_match', 'audience_exhausted', 'quota_exhausted', 'demo', 'failed'] as const) {
      expect(runOutcomeMessage(s, 0, 0, true), s).not.toMatch(/broaden the job titles/i)
    }
  })

  it('the run records the fact, and records it BEFORE the widened search can exit', () => {
    const src = codeOnly(readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8'))
    // Set at the top of the `canWiden` branch, so every exit below it — proved zero,
    // unproven zero, or matches — carries it.
    const branch = src.indexOf('if (canWiden) {')
    const flag = src.indexOf('didWiden = true', branch)
    const search = src.indexOf('searchPeopleWithFallback(widened', branch)
    expect(branch).toBeGreaterThan(-1)
    expect(flag, 'the flag is set inside the widen branch').toBeGreaterThan(branch)
    expect(flag, 'and BEFORE the search, so every exit carries it').toBeLessThan(search)
    // And it reaches the persisted message through the single record call.
    // ⛓️ 16 Sep (A1) — the tail call gained the client-usable count; `didWiden` still reaches
    // the persisted message through that single record call, which is this guard's whole point.
    expect(src).toContain('heldFromIcp, didWiden, clientUsable)')
    // ⛓️ 16 Sep (A1) — the message now derives from the CLIENT-USABLE count rather than the raw
    // one. `alreadyWidened` still travels with it, unchanged, and `total_inserted` is asserted
    // separately (below) to still be written from the raw figure.
    expect(src).toContain('runOutcomeMessage(status, Math.max(0, Math.round(clientUsable)), alreadyHeld, alreadyWidened)')
    expect(src).toContain('total_inserted: Math.max(0, Math.round(totalInserted)),')
  })

  it('THE WIDENED FALLBACK IS STILL REACHED — an exact trustworthy zero leads into it', () => {
    // The one approved fallback is untouched: this change reads a fact, it does not gate one.
    const src = codeOnly(readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8'))
    expect(src).toContain('if (canWiden) {')
    // ONE widened search in the whole run — no third automatic attempt was introduced.
    expect((src.match(/searchPeopleWithFallback\(widened/g) ?? []), 'exactly one widened search')
      .toHaveLength(1)
  })

  it('a widened UNTRUSTWORTHY zero stays failed and neutral — not no_match at all', () => {
    // The widened call resets trust to 'unproven'; without positive evidence the run derives
    // `failed`, whose copy is the approved recovery line. No widening advice either way.
    expect(deriveRunStatus(false, 0, false, false, false)).toBe('failed')
    expect(runOutcomeMessage('failed', 0, 0, true)).not.toMatch(/widen/i)
    expect(runOutcomeMessage('failed', 0, 0, true)).toBe(runOutcomeMessage('failed', 0, 0, false))
  })

  it('valid safe partial matches still surface and win, widened or not', () => {
    // The founder's partial rule is checked before trust and is unaffected by any of this.
    expect(deriveRunStatus(false, 7, false, false, false)).toBe('served')
    expect(deriveRunStatus(false, 7, false, true, true)).toBe('served')
    expect(runOutcomeMessage('served', 7, 0, true)).toMatch(/7 leads/i)
  })
})
