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
import { deriveRunStatus, runOutcomeMessage } from './run-outcome'

const api = (f: string) => readFileSync(join(__dirname, f), 'utf8')
const route = (f: string) => readFileSync(join(__dirname, '..', 'routes', f), 'utf8')
const portal = readFileSync(
  join(__dirname, '..', '..', '..', 'portal', 'src', 'app', '(milla)', 'milla', 'page.tsx'),
  'utf8',
)

describe('the server records a terminal outcome the desk can actually read', () => {
  it('a completed ZERO run derives a terminal status, not an absence', () => {
    // Not demo, nothing inserted, budget was granted, audience not exhausted.
    expect(deriveRunStatus(false, 0, false, false)).toBe('no_match')
    // Audience finished is a DIFFERENT terminal fact and must stay distinguishable.
    expect(deriveRunStatus(false, 0, false, true)).toBe('audience_exhausted')
    // Refused before it could even try.
    expect(deriveRunStatus(false, 0, true, false)).toBe('quota_exhausted')
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
    const f = portal.indexOf('finding ? (')
    expect(t).toBeGreaterThan(-1)
    expect(f).toBeGreaterThan(-1)
    expect(f, 'the spinner must never be evaluated before the terminal state').toBeGreaterThan(t)
  })

  it('a run only ends THIS wait if it finished after the wait began', () => {
    // Otherwise an outcome left by pass 1 would instantly terminate pass 2's spinner.
    expect(portal).toContain('finishedAt >= findingSince()')
  })

  it('the start stamp lives in the URL, so a RELOAD cannot resurrect the spinner', () => {
    expect(portal).toContain('finding=1&since=${Date.now()}')
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
    expect(portal).toContain('if (!finding || pending.length > 0 || terminalRun) return')
  })

  it('the terminal branch offers NO control that could start another search', () => {
    const start = portal.indexOf('terminalRun ? (')
    const block = portal.slice(start, portal.indexOf(') : finding ? (', start))
    expect(block).not.toContain('api.post')
    expect(block).not.toContain('/proof')
    expect(block).not.toContain('onClick')
  })

  it('the terminal branch shows the SERVER message, not copy written in the desk', () => {
    const start = portal.indexOf('terminalRun ? (')
    const block = portal.slice(start, portal.indexOf(') : finding ? (', start))
    expect(block).toContain('{terminalRun.message}')
  })

  it('zero is treated as a RESULT, not as absence', () => {
    expect(portal).toContain('const proofEndedEmpty = !!terminalRun && terminalRun.total_inserted === 0')
  })
})

describe('a crashed run tells a human, and never fakes a result', () => {
  const proofRoute = route('icps.ts')

  it('alerts on a failed proof run instead of swallowing it', () => {
    const at = proofRoute.indexOf("[icps/proof] proof run failed:")
    expect(at).toBeGreaterThan(-1)
    const block = proofRoute.slice(at - 400, at + 900)
    expect(block).toContain('sendFounderAlert')
  })

  it('does NOT write a fake outcome row for a crash', () => {
    // `no_match` on a run that never asked would tell a prospect their targeting matched
    // nobody. There is no honest status for "crashed", so none is written (R72).
    const at = proofRoute.indexOf("[icps/proof] proof run failed:")
    const block = proofRoute.slice(at, at + 1200)
    expect(block).not.toContain('recordRunOutcome')
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
