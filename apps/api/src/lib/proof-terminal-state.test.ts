// ⚑ 26 Aug — A FINISHED PROOF RUN MUST LOOK FINISHED.
//
// THE DEFECT. The proof desk decided "still finding" from a URL flag and "finished" from
// leads appearing. A run that genuinely ended with ZERO cleared neither: no leads ever
// arrived, so the flag stood, and after ~60s the copy only softened to "we're still
// finding your matches" — which was false. The run had ended. A reload re-read the flag
// and restarted the whole loop.
//
// ⚠️ NO PROVIDER IS CALLED ANYWHERE IN THIS FILE, and none can be: `vitest.setup.ts`
// deletes every provider API key before any test runs. These tests read the shipped
// source and exercise pure outcome logic.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveRunStatus, runOutcomeMessage, FAILED_RUN_HEADLINE, FAILED_RUN_BODY } from './run-outcome'

const api = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const route = (f: string) => readFileSync(join(__dirname, '..', 'routes', f), 'utf8')
const portal = readFileSync(
  join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'),
  'utf8',
)

describe('the server records a terminal outcome the desk can actually read', () => {
  it('a completed ZERO run derives a terminal status, not an absence', () => {
    // Not demo, nothing inserted, budget was granted, audience not exhausted — and the
    // search COMPLETED, which since 26 Aug is stated rather than defaulted.
    expect(deriveRunStatus(false, 0, false, false, true)).toBe('no_match')
    // Audience finished is a DIFFERENT terminal fact and must stay distinguishable.
    expect(deriveRunStatus(false, 0, false, true, true)).toBe('audience_exhausted')
    // Refused before it could even try — decided ahead of trust, so it is unaffected.
    expect(deriveRunStatus(false, 0, true, false, true)).toBe('quota_exhausted')
  })

  it('a completed run WITH matches is served', () => {
    expect(deriveRunStatus(false, 7, false, false)).toBe('served')
    // Even when the audience finished on the same run — they got people today.
    expect(deriveRunStatus(false, 7, false, true)).toBe('served')
  })

  it('every terminal status carries canonical client copy — the desk invents none', () => {
    for (const s of ['no_match', 'audience_exhausted', 'quota_exhausted', 'served'] as const) {
      expect(runOutcomeMessage(s, 0), s).toBeTruthy()
    }
    // And a quota outage never blames the client's targeting.
    expect(runOutcomeMessage('quota_exhausted', 0)).not.toMatch(/narrow|widen/i)
  })

  it('the summary the desk already polls carries the last completed run', () => {
    const src = api('milla-summary.ts')
    expect(src).toContain("db.from('icp_run_outcomes')")
    expect(src).toContain('proof_run')
    // finished_at is what lets the desk tell THIS run from an earlier pass.
    expect(src).toContain('finished_at')
    // Read across the client, newest first — one row, not a scan.
    expect(src).toMatch(/order\('created_at', \{ ascending: false \}\)\s*\.limit\(1\)/)
  })
})

describe('the desk stops guessing', () => {
  it('renders the TERMINAL state before it renders the spinner', () => {
    // Order is the guard: `terminalRun ?` must be evaluated ahead of `finding ?`, because
    // `finding` only ever says what we started, never how it ended.
    // ⚠️ SEARCH FROM THE START, NOT FROM THE TERMINAL BRANCH. An earlier version passed
    // `t` as fromIndex, so a spinner branch inserted ABOVE the terminal one slipped
    // straight through — the guard proved only that SOME `finding` branch existed later.
    // The FIRST spinner in the file is the one that decides what a client sees.
    const t = portal.indexOf('terminalRun ? (')
    const f = portal.indexOf('proofAwaiting ? (')
    expect(t).toBeGreaterThan(-1)
    expect(f).toBeGreaterThan(-1)
    expect(f, 'the spinner must never be evaluated before the terminal state').toBeGreaterThan(t)
  })

  it('a run only ends THIS wait if it finished after the wait began', () => {
    // Otherwise an outcome left by pass 1 would instantly terminate pass 2's spinner.
    expect(portal).toContain('finishedAt >= findingSince()')
  })

  it('the start stamp lives in the URL, so a RELOAD cannot resurrect the spinner', () => {
    expect(portal).toContain('finding=1&since=${startedAt}')
    expect(portal).toContain("new URLSearchParams(window.location.search).get('since')")
    // And it is cleared with the flag when leads arrive.
    expect(portal).toContain("url.searchParams.delete('since')")
  })

  it('a missing stamp resolves to TERMINAL, never to an endless spinner', () => {
    const fn = portal.slice(portal.indexOf('function findingSince()'), portal.indexOf('const FINDING_POLL_MS'))
    // 0 makes any completed run count as ours — the safe direction.
    expect(fn).toContain('return Number.isFinite(n) && n > 0 ? n : 0')
  })

  it('a terminal outcome STOPS the poll — no extra sourcing attempt', () => {
    // ⛓️ 26 Aug — `terminalRun` remains the LAST clause and still short-circuits the whole
    // guard, so a recorded outcome stops the poll exactly as before. The added
    // `&& !proofAwaiting` only widens who KEEPS polling; it can never restart a finished run.
    expect(portal).toContain('if ((!finding && !proofAwaiting) || pending.length > 0 || terminalRun) return')
  })

  it('the terminal branch offers NO control that could start another search', () => {
    const start = portal.indexOf('terminalRun ? (')
    const block = portal.slice(start, portal.indexOf(') : proofAwaiting ? (', start))
    expect(block).not.toContain('api.post')
    expect(block).not.toContain('/proof')
    expect(block).not.toContain('onClick')
  })

  it('the terminal branch shows the SERVER message, not copy written in the desk', () => {
    const start = portal.indexOf('terminalRun ? (')
    const block = portal.slice(start, portal.indexOf(') : proofAwaiting ? (', start))
    expect(block).toContain('{terminalRun.message}')
  })

  it('zero is treated as a RESULT, not as absence', () => {
    expect(portal).toContain('const proofEndedEmpty = !!terminalRun && terminalRun.total_inserted === 0')
  })
})

describe('a crashed run is a TERMINAL FACT — founder-approved `failed` (26 Aug)', () => {
  const proofRoute = route('icps.ts')
  const crash = () => {
    const at = proofRoute.indexOf("[icps/proof] proof run failed:")
    return proofRoute.slice(at - 900, at + 1600)
  }

  it('persists `failed` at the crash boundary', () => {
    expect(crash()).toContain("recordRunOutcome(req.params.id, clientId, 'failed'")
  })

  it('NEVER records a crash as no_match or audience_exhausted', () => {
    // The query did not complete, so claiming it matched nobody — or that the client
    // already holds everyone — would be false (R72).
    expect(crash()).not.toContain("'no_match'")
    expect(crash()).not.toContain("'audience_exhausted'")
  })

  it('`failed` is never derived from EMPTINESS — only from an explicit not-completed fact', () => {
    // ⛓️ AMENDED 26 Aug. This used to assert that `deriveRunStatus` could never return
    // `failed` at all, which was right while there was no way to tell a completed zero
    // from a broken search. There is now: `PdlPage.completed`. The founder ruled that an
    // unclassified failure must FAIL CLOSED to the approved recovery path rather than be
    // reported as "nobody matched".
    //
    // The invariant that survives, and it is the one that matters: **emptiness alone can
    // never produce `failed`.** Only an explicit "the search did not complete" can.
    //
    // ⛓️ AMENDED AGAIN, 26 Aug (final gate). This table used to carry a sixth row —
    // `[false, 0, false, false]`, labelled "legacy 4-arg caller — defaults to trustworthy" —
    // asserting that omitting the trust argument still produced a non-`failed` status. That
    // row is REMOVED because the founder ruled the permissive default out: a caller that
    // forgets the argument must not silently inherit "the search completed". Every row below
    // now states its trust explicitly, and the fail-closed behaviour of an omitted argument
    // is asserted directly in `proof-outcome-matrix.test.ts` (section A) instead.
    for (const args of [
      [false, 0, false, false, true],   // completed zero
      [false, 0, false, true,  true],   // completed, audience finished
      [false, 0, true,  false, true],   // refused before it ran
      [false, 5, false, false, true],   // matches
      [true,  0, false, false, true],   // demo
    ] as const) {
      expect(deriveRunStatus(...(args as Parameters<typeof deriveRunStatus>)), JSON.stringify(args)).not.toBe('failed')
    }

    // And a run that DID have matches never reports failure, however badly the rest went —
    // the founder's partial-proof rule.
    expect(deriveRunStatus(false, 7, false, false, false)).toBe('served')

    // Only this produces it.
    expect(deriveRunStatus(false, 0, false, false, false)).toBe('failed')
  })

  it('still alerts a human', () => {
    expect(crash()).toContain('sendFounderAlert')
  })

  it('the approved recovery copy is what a prospect sees — verbatim, and no technical detail', () => {
    expect(FAILED_RUN_HEADLINE).toBe('We hit a snag confirming your matches')
    expect(FAILED_RUN_BODY).toBe('Your setup is saved and has been flagged for K.I.N.D review. You won’t need to start again.')
    // The server message for a failure IS that body — so the desk renders it like any
    // other terminal state, with nothing written locally.
    expect(runOutcomeMessage('failed', 0)).toBe(FAILED_RUN_BODY)
    // No provider name, status code or stack may reach the prospect.
    expect(runOutcomeMessage('failed', 0)).not.toMatch(/pdl|apollo|hunter|clearbit|error|\b5\d\d\b|stack/i)
  })

  it('the desk renders the approved headline and never the word "failed"', () => {
    const start = portal.indexOf('terminalRun ? (')
    const block = portal.slice(start, portal.indexOf(') : proofAwaiting ? (', start))
    expect(block).toContain('We hit a snag confirming your matches')
    expect(block).toContain('{terminalRun.message}')
    expect(block.toLowerCase()).not.toContain('>failed')
    expect(block).not.toMatch(/Failed</)
  })

  it('a failed run is terminal, so it stops the poll and cannot revert to running', () => {
    // `terminalRun` is status-agnostic: any completed outcome — failed included — both
    // ends the wait and halts the interval.
    expect(portal).toContain('if ((!finding && !proofAwaiting) || pending.length > 0 || terminalRun) return')
    const t = portal.indexOf('terminalRun ? (')
    const f = portal.indexOf('proofAwaiting ? (')
    expect(f).toBeGreaterThan(t)
    expect(portal).toContain("const proofFailed = terminalRun?.status === 'failed'")
  })

  it('a failed run offers no retry and starts no second search', () => {
    const start = portal.indexOf('terminalRun ? (')
    const block = portal.slice(start, portal.indexOf(') : proofAwaiting ? (', start))
    expect(block).not.toMatch(/retry|try again/i)
    expect(block).not.toContain('api.post')
    expect(block).not.toContain('/proof')
    expect(block).not.toContain('onClick')
  })

  it('survives a reload — the terminal decision reads the server, not component state', () => {
    // `terminalRun` derives from `summary.proof_run`, refetched on every load, and the
    // wait's start moment lives in the URL. Neither resets on refresh.
    expect(portal).toContain('const r = summary?.proof_run')
    expect(portal).toContain('finishedAt >= findingSince()')
  })

  it('the runner and the schema both allow the new value', () => {
    const runner = api('pending-migrations.ts')
    expect(runner).toContain('20260826_run_outcome_failed')
    expect(runner).toMatch(/check \(status in \('served','no_match','quota_exhausted','demo','audience_exhausted','failed'\)\)/)
  })
})

describe('nothing this build touched can spend, send or charge', () => {
  it('adds no provider call anywhere', () => {
    for (const f of ['milla-summary.ts']) {
      const src = api(f)
      expect(src).not.toContain('pdlSearch')
      expect(src).not.toContain('searchPeople')
      expect(src).not.toContain('fetch(')
    }
  })

  it('leaves the widened-proof machinery untouched', () => {
    const src = route('icps.ts')
    // The exact→widened fallback, its candidate and its single-attempt lock all survive.
    expect(src).toContain('proof_widened_candidate')
    expect(src).toContain('PROOF PASS 2 — exact targeting matched nobody')
    expect(src).toContain('ONE widened retry')
  })

  it('leaves the acquisition-memory and zero-spend guards untouched', () => {
    const src = route('icps.ts')
    expect(src).toContain('rememberAcquiredIdentities')
    expect(api('paid-provider-guard.ts')).toContain('PAID_PROVIDERS_ENABLED')
  })
})
