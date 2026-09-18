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
    expect(portal).toContain('finishedAt >= serverProofStartedAt(summary)')
  })

  it('⛓️ the start stamp lives on the SERVER now, not in the URL', () => {
    // ⛓️ REWRITTEN 26 Aug, because its premise was replaced rather than adjusted. This used
    // to assert a `?since=` epoch in the URL and a reader for it — the desk's clock before
    // the claim recorded its own. That clock was inference: written only AFTER the /proof
    // POST returned (so a lost response left a claimed run with no start anywhere), scoped
    // to one browser profile, and able to go stale from an older pass.
    //
    // `clients.proof_started_at` is written INSIDE the atomic claim, so a reload cannot
    // resurrect anything — the same server value is read every time.
    expect(portal).toContain("router.push('/milla?finding=1')")
    expect(portal, 'no clock may travel in the URL any more').not.toContain('since=${')
    expect(portal).not.toContain("get('since')")
    // The flag survives as a hint for the moment before the first summary lands, and the
    // legacy `since` param is still stripped so an old link in someone's history tidies up.
    expect(portal).toContain("url.searchParams.delete('since')")
  })

  it('an UNKNOWN server start resolves to TERMINAL, never to an endless spinner', () => {
    // A row predating the column has no start. 0 keeps the old, safe direction: any
    // completed run counts as ours, which ends in a truthful terminal state rather than a
    // spinner nobody can stop. Erring the other way is what shipped once already.
    const fn = portal.slice(
      portal.indexOf('function serverProofStartedAt('),
      portal.indexOf('const FINDING_POLL_MS'),
    )
    expect(fn, 'the server-start reader').not.toBe('')
    expect(fn).toContain('if (!raw) return 0')
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
    // ⛓️ 16 Sep (MVP1 · A1 / founder decision C) — RE-POINTED, AND THE DUTY IS UNCHANGED:
    // a zero must still END the wait rather than read as "nothing has happened yet".
    //
    // What moved is WHICH zero. ~~`terminalRun.total_inserted === 0`~~ asked the RAW sourcing
    // figure, so a run that sourced twenty and had all twenty refused by the structural gate
    // reported 20 — the desk believed it had a result to show and rendered no cards. The
    // question is now asked of `leads_awaiting`, which `milla-summary.ts` builds from the same
    // boundary the card list applies, clause for clause. Zero cards is the zero that matters.
    // ⛓️ RE-POINTED AGAIN 18 Sep (J24-C1) · THE DUTY IS STILL UNCHANGED, AND IS NOW STRICTER.
    // WHAT THIS REPLACED: ~~`'const proofEndedEmpty = !!terminalRun && (summary?.leads_awaiting
    // ?? 0) === 0'`~~. The `??` could not tell three different things apart — not loaded yet,
    // the count failed, and genuinely none — and collapsed all of them to 0, which renders the
    // sentence telling the client their Proof run found nobody. The server now sends `null` for
    // an unreadable count, so the question is asked of a real zero only.
    expect(portal).toContain('const proofEndedEmpty = !!terminalRun && summary?.leads_awaiting === 0')
    // ⚠️ ON CODE, NOT SOURCE. The chained note directly above the line in `milla/page.tsx`
    // quotes the retired expression in order to explain it, so an absence assertion that reads
    // comments asserts against its own documentation. Fifth time in this build.
    const portalCode = portal.split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')
    expect(portalCode, 'the `??` that made an unreadable count look like an empty desk came back')
      .not.toContain('(summary?.leads_awaiting ?? 0) === 0')
    // And the raw figure is still NOT the thing driving it.
    expect(portal).not.toContain('proofEndedEmpty = !!terminalRun && terminalRun.total_inserted === 0')
  })
})

describe('a crashed run is a TERMINAL FACT — founder-approved `failed` (26 Aug)', () => {
  // ⛓️ 15 Sep (S1-RT-004) — THE HAYSTACK IS THE WHOLE PROOF PATH, not one file. The
  // run-and-settle tail moved VERBATIM to `lib/proof-run-launch.ts` so the client route and
  // Vida's review-resolution continuation share ONE implementation. Every assertion below is
  // unchanged — same regexes, same strings, same count — they now read the two production
  // files that together ARE that path, which is where the behaviour they protect lives.
  const proofRoute = route('icps.ts') + '\n' + api('proof-run-launch.ts')
  const crash = () => {
    const at = proofRoute.indexOf("[icps/proof] proof run failed:")
    return proofRoute.slice(at - 900, at + 1600)
  }

  it('persists `failed` at the crash boundary', () => {
    // ⛓️ 15 Sep (S1-RT-004) — same call, same specificity; the shared module names the icp
    // `icpId` instead of re-reading `req.params.id`, because it is no longer inside the route.
    expect(crash()).toContain("recordRunOutcome(icpId, clientId, 'failed'")
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
    expect(portal).toContain('finishedAt >= serverProofStartedAt(summary)')
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
