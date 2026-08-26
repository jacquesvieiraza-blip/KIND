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

const ICP = { job_titles: ['Head of Ops'], seniority_levels: [], company_sizes: [], geographies: ['United Kingdom'], industries: ['Logistics'] }

/** One JSON response, however malformed. */
const res = (status: number, body: unknown) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body),
}) as unknown as Response

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

  it('DEFAULTS TO TRUSTWORTHY — a caller that never reaches a provider cannot report failure', () => {
    // Old 4-arg call sites keep their exact behaviour.
    expect(deriveRunStatus(false, 0, false, false)).toBe('no_match')
    expect(deriveRunStatus(false, 0, false, true)).toBe('audience_exhausted')
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

  it('404 on the FIRST page → completed, matchedNothing — a trustworthy zero', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(res(404, {}))
    const p = await page()
    expect(p.completed).toBe(true)          // we asked, PDL answered "nobody"
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
describe('C · runIcpJob threads trustworthiness into the persisted status', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'icps.ts'), 'utf8')

  it('starts trustworthy and is only ever falsified by a provider verdict', () => {
    expect(src).toContain('let searchCompleted = true')
    expect(src).toContain('if (!pdlPage.completed) searchCompleted = false')
  })

  it('a client run with NO page at all is untrustworthy (house/Apollo is not)', () => {
    expect(src).toContain("} else if (audience === 'client') {")
  })

  it('the UNPROVEN widened zero agrees with its own sentence', () => {
    const at = src.indexOf('couldn’t confirm a second set')
    expect(src.slice(at, at + 500)).toContain('searchCompleted = false')
  })

  it('the persisted status is derived WITH it', () => {
    expect(src).toContain('deriveRunStatus(!!clientSettings?.is_demo, inserted, false, audienceExhausted, searchCompleted)')
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

  it('a completed search emptied entirely by suppression does NOT derive no_match', () => {
    expect(src).toContain('const suppressionAte = inserted === 0 && searchCompleted && allRemovedBySuppression')
    expect(src).toContain("? 'failed'")
  })

  it('the count comes from the reason the memory pass already resolved', () => {
    expect(src).toContain("if (reason !== null) suppressedHere += 1")
    expect(src).toContain('suppressedHere === contacts.length) allRemovedBySuppression = true')
  })

  it('the real cause reaches a HUMAN and never the prospect', () => {
    const at = src.indexOf('A completed search was emptied entirely by suppression')
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
    expect(portal).toContain('const FINDING_MAX_CHECKS = 20')
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
