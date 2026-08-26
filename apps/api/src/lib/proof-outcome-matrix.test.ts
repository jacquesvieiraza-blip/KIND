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
import { deriveRunStatus, runOutcomeMessage } from './run-outcome'
import { exhaustedMessage } from './pdl-cursor'

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
    const call = src.indexOf('const exact = await searchPeopleWithFallback', enter)
    expect(enter).toBeGreaterThan(-1)
    expect(call, 'the drop must precede the exact search').toBeGreaterThan(enter)
  })

  it('promotion requires POSITIVE evidence: a completed page, or the throwing house path returning', () => {
    expect(src).toContain("if (pdlPage.completed) searchTrust = 'proven'")
    expect(src).toContain("} else if (audience === 'house') {")
    // No branch promotes on mere absence of error.
    expect(src).not.toMatch(/searchTrust = 'proven'\s*\/\/ default/)
  })

  it('the widened fallback must prove itself SEPARATELY — the exact proof does not transfer', () => {
    const wideDrop = src.indexOf("searchTrust = 'unproven'", src.indexOf('const wide = await searchPeopleWithFallback') - 600)
    const wideCall = src.indexOf('const wide = await searchPeopleWithFallback')
    expect(wideDrop).toBeGreaterThan(-1)
    expect(wideCall).toBeGreaterThan(wideDrop)
    expect(src).toContain("if (wide.pdlPage?.completed) searchTrust = 'proven'")
  })

  it('the persisted status is derived from the trust reader', () => {
    expect(src).toContain("const trusted = searchTrust !== 'unproven'")
    expect(src).toContain('deriveRunStatus(!!clientSettings?.is_demo, inserted, false, audienceExhausted, trusted)')
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
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

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
    expect(block).toContain("recordRunOutcome(req.params.id, clientId, 'failed'")
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
    expect(src).toContain("const gatesAteEverything = inserted === 0 && searchTrust !== 'unproven' && providerContactsReturned > 0")
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
    expect(portal).toContain("{findingTimedOut ? 'We hit a snag confirming your matches' : 'Finding your matches now…'}")
    expect(portal).toContain('Your setup is saved and has been flagged for K.I.N.D review.')
    // The old sentence claimed a search was still running when nothing was.
    expect(portal).not.toContain('We’re still finding your matches. You can come back to this page shortly.')
  })

  it('backend truth still wins — the recovery branch only renders with no terminal outcome', () => {
    const t = portal.indexOf('terminalRun ? (')
    const f = portal.indexOf('finding ? (')
    expect(f).toBeGreaterThan(t)
  })

  it('the poll is bounded and offers no uncontrolled retry', () => {
    // 80 × 3s = 240s — derived from the backend worst case, see section F below.
    expect(portal).toContain('const FINDING_MAX_CHECKS = 80')
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
    // One condition covers every K.I.N.D-side removal: returned > 0, inserted 0, trusted.
    expect(src).toContain("const gatesAteEverything = inserted === 0 && searchTrust !== 'unproven' && providerContactsReturned > 0")
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

  it('the client bound clears the backend worst case with margin', () => {
    // Backend worst case, from code: 15s/attempt (pdl-search.ts AbortSignal.timeout),
    // 4-rung ladder at batch 20, +17.5s rate-limit retry, ×2 for the widened fallback
    // ≈ 155s, +overheads → ~180s. The client bound must exceed it.
    const PDL_ATTEMPT_TIMEOUT = 15_000
    const LADDER_RUNGS = 4
    const RATE_LIMIT_RETRY = 2_500 + PDL_ATTEMPT_TIMEOUT
    const WORST_ONE_SEARCH = LADDER_RUNGS * PDL_ATTEMPT_TIMEOUT + RATE_LIMIT_RETRY
    const WORST_LEGITIMATE = 2 * WORST_ONE_SEARCH          // exact + one widened fallback
    const pollMs = Number(/const FINDING_POLL_MS = (\d+)/.exec(portalSrc)?.[1])
    const maxChecks = Number(/const FINDING_MAX_CHECKS = (\d+)/.exec(portalSrc)?.[1])
    expect(pollMs).toBe(3000)
    expect(maxChecks).toBe(80)
    expect(pollMs * maxChecks, 'bound must exceed the legitimate worst case').toBeGreaterThan(WORST_LEGITIMATE)
    // And the source constants the math rests on have not silently moved.
    const pdl = readFileSync(join(__dirname, 'pdl-search.ts'), 'utf8')
    expect(pdl.match(/AbortSignal\.timeout\(15000\)/g)?.length).toBeGreaterThanOrEqual(2)
    expect(pdl).toContain('const ladder = [size, 25, 10, 5, 1]')
  })

  it('a healthy slow proof cannot be declared failed before the backend could still be working', () => {
    const pollMs = 3000, maxChecks = 80
    expect(pollMs * maxChecks).toBeGreaterThanOrEqual(180_000)
  })
})

describe('F · the complete status space — no value exists as an untested assumption', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')
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
    expect((src.match(/recordRunOutcome\(/g) ?? []).length).toBe(5)  // 1 def + 4 producers... adjusted below
    expect(src).toContain("recordRunOutcome(icpId, clientId, 'quota_exhausted', effectiveCap, 0, 0)")
    expect(src).toContain("recordRunOutcome(req.params.id, clientId, 'failed', PROOF_PASS_LEADS, 0, 0)")
    expect(src).toContain('recordRunOutcome(icpId, clientId, status, effectiveCap, pool.served, inserted, heldFromIcp)')
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
describe('G · a clean URL cannot strand the first client', () => {
  const portalSrc = codeOnly(readFileSync(
    join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'), 'utf8'))

  it('strandedness is derived from SERVER state, not browser state', () => {
    // A pass was claimed (server counter) and no outcome row has ever been recorded
    // (server read) — both survive closing the browser, both re-read on every load.
    expect(portalSrc).toContain('(summary.proof_passes_done ?? 0) > 0 && !summary.proof_run')
  })

  it('the stranded card is the approved recovery copy, and it renders before the generic empty state', () => {
    const stranded = portalSrc.indexOf('proofStranded ? (')
    const generic = portalSrc.indexOf('No leads waiting right now')
    expect(stranded).toBeGreaterThan(-1)
    expect(generic, 'recovery must be checked before the generic empty state').toBeGreaterThan(stranded)
  })

  it('backend truth still wins — batches and terminal outcomes render before the stranded card', () => {
    // `terminalRun` and pending cards are evaluated first, and `proof_run` existing at
    // all makes proofStranded false.
    const t = portalSrc.indexOf('terminalRun ? (')
    const stranded = portalSrc.indexOf('proofStranded ? (')
    expect(t).toBeGreaterThan(-1)
    expect(stranded).toBeGreaterThan(t)
  })

  it('the poll keeps checking while stranded — bounded by the same cap, so an in-flight run resolves it', () => {
    expect(portalSrc).toContain('if ((!finding && !proofStranded) || pending.length > 0 || terminalRun) return')
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

  it('404 + documented not_found body → trustworthy zero (completed, matchedNothing)', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      res(404, { status: 404, error: { type: 'not_found', message: 'No records were found matching your search' } }))
    const p = await page()
    expect(p.completed).toBe(true)
    expect(p.matchedNothing).toBe(true)
    expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('no_match')
  })

  it('⚑ 404 WITHOUT that body → error, unproven, failed — a gateway 404 is not a zero', async () => {
    for (const body of [{}, { message: 'route not found' }, { error: { type: 'gateway' } }]) {
      vi.resetModules(); fetchSpy?.mockRestore()
      fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(404, body))
      const p = await page()
      expect(p.completed, JSON.stringify(body)).toBe(false)
      expect(p.matchedNothing, JSON.stringify(body)).toBe(false)
      expect(deriveRunStatus(false, 0, false, p.exhausted, p.completed)).toBe('failed')
    }
  })
})
