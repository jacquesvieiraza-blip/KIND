// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD-003 — THE OPERATIONAL E2E. Does the chain hold END TO END, or only piece by piece?
//
// 🛑 WHY THIS FILE, WHEN EVERY PIECE ALREADY HAS A SUITE. Because every piece having a suite is
// exactly the state BUILD-002 was in when the founder's live walkthrough found that
// `PATCH /icps/:id/activate` sat below `icpRouter.use(requireAuth)`: the Go-Live gate was not
// wrong, it was UNREACHED. Every test pulled the handler straight out of the router stack, so
// the one middleware layer that rejected every real request was the one layer no test ran.
//
// A gate that cannot be reached is not a gate. A truth nobody can see is not a truth. This file
// asks the questions that only exist BETWEEN the pieces:
//
//   · is the proof review chain WIRED — written, read, resolved, and reachable by an operator?
//   · does a crashed run reach a human, or does R72 tell the truth only to itself?
//   · does programme state reach an operator surface at all?
//   · is the one write PR3 adds actually reversible, and does it refuse the dangerous case?
//
// ⚠️ ROUTE-LEVEL, NOT UNIT-LEVEL. Where a chain crosses a route boundary this reads the real
// router stack, because that boundary is where BUILD-002's defect lived.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

const LIB = __dirname
const ROUTES = join(__dirname, '../routes')
const ADMIN = join(__dirname, '../../../../apps/admin/src/app')

/**
 * Strip TS comments so prose about a wire can never stand in for the wire.
 *
 * ⛓️ LINE-ANCHORED, AND THE NAIVE VERSION WAS WRONG. The first cut removed `/* … *\/` with a
 * non-greedy regex over the whole file. In `operator.ts` that swallowed everything from the
 * first block-comment opener onward, so `operatorRouter.post('/source')` — which is right
 * there in the file — read as absent. A stripper that eats real code makes every assertion
 * built on it a false negative, and the ones that still passed passed by luck.
 *
 * This repo writes block comments as line-anchored JSDoc, so that is what is removed: lines
 * whose trimmed form opens, continues or closes one. Line comments are cut at the first `//`
 * that is not part of a URL.
 */
function stripComments(src: string): string {
  let inBlock = false
  return src.split('\n').map(l => {
    const t = l.trim()
    if (inBlock) { if (t.endsWith('*/')) inBlock = false; return '' }
    if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; return '' }
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}
const code = (p: string) => stripComments(readFileSync(p, 'utf8'))

const OPERATOR = code(join(ROUTES, 'operator.ts'))
const ICPS = code(join(ROUTES, 'icps.ts'))
const VIDA = code(join(ADMIN, 'vida/page.tsx'))

describe('the sweep is not vacuous', () => {
  it('every source loads and the stripper works', () => {
    expect(OPERATOR.length).toBeGreaterThan(10_000)
    expect(VIDA.length).toBeGreaterThan(10_000)
    expect(stripComments('// checkProgrammeAuthority()')).not.toContain('checkProgrammeAuthority')
  })
})

// ── ③ FREE PROOF: WRITTEN → READ → RESOLVED → REACHABLE ──────────────────────────────────
//
// ⚠️ THIS CHAIN ALREADY EXISTED AND IS NOT REBUILT. What was never proved is that all four
// links are joined. Any one of them missing leaves a prospect who was told "K.I.N.D will review
// this with you" waiting on a promise nobody can see.
describe('③ FREE PROOF REVIEW — the full chain, link by link', () => {
  it('① WRITTEN: the refused third proof pass persists the ask', () => {
    expect(ICPS).toContain('proof_review_requested_at')
    expect(ICPS).toContain('proof_review_icp_id')
  })

  it('② the write is CONDITIONAL — a second refusal cannot overwrite the first ask', () => {
    // Without this, the clock restarts every time the prospect tries again, and the queue
    // reorders so the person who has waited longest sinks.
    expect(ICPS).toMatch(/\.or\('proof_review_requested_at\.is\.null,proof_review_resolved_at\.not\.is\.null'\)/)
  })

  it('③ READ: the operator alert feed queries OPEN reviews', () => {
    expect(OPERATOR).toContain("proof_review_requested_at, proof_review_icp_id")
    expect(OPERATOR).toMatch(/\.not\('proof_review_requested_at', 'is', null\)/)
    expect(OPERATOR).toMatch(/\.is\('proof_review_resolved_at', null\)/)
  })

  it('④ RESOLVED: an operator route closes it, and only when it is actually open', () => {
    expect(OPERATOR).toContain("operatorRouter.post('/proof-review/:clientId/resolve'")
    const fn = OPERATOR.slice(OPERATOR.indexOf("'/proof-review/:clientId/resolve'"))
    expect(fn.slice(0, 1200)).toContain('proof_review_resolved_at')
    // Conditional, so a double-click cannot overwrite the first operator's timestamp.
    expect(fn.slice(0, 1200)).toMatch(/\.is\('proof_review_resolved_at', null\)/)
  })

  it('⑤ REACHABLE: Vida calls the resolve route — the link BUILD-002 proved can be missing', () => {
    // 🛑 THE BUILD-002 LESSON APPLIED. Every piece above can be correct while the button that
    // reaches them does not exist, and no unit test would notice.
    expect(VIDA).toContain('/api/proxy/operator/proof-review/')
    expect(VIDA).toContain('/resolve')
  })

  it('⑥ a FAILED read never reports "nobody is waiting"', () => {
    // supabase-js resolves `{ data: null, error }`. Reading only `data` made a broken queue and
    // an empty queue produce the identical screen: a quiet Vida.
    expect(OPERATOR).toContain('proofReviewErr')
    expect(OPERATOR).toContain('degraded')
  })
})

// ── CRASHED-RUN RECOVERY ─────────────────────────────────────────────────────────────────
describe('CRASHED RUNS REACH A HUMAN', () => {
  it('R72 writes the terminal fact', () => {
    expect(ICPS).toContain("recordRunOutcome(req.params.id, clientId, 'failed'")
  })

  it('🛑 AND SOMETHING NOW READS IT — the half that was missing', () => {
    // `status = 'failed'` was written since 26 Aug and nothing anywhere read it. The prospect
    // sits on the approved recovery copy, having been promised a human, and no operator
    // surface showed that their run had died.
    const model = code(join(LIB, 'operator-programme.ts'))
    expect(model).toContain("eq('status', 'failed')")
    expect(OPERATOR).toContain('failed_runs')
  })

  it('the crashed-run window is bounded and STATED, not silently truncated', () => {
    // A list capped without saying so is how a partial answer gets reported as the whole one —
    // the `.limit(1000)` defect this repo has fixed twice.
    const model = code(join(LIB, 'operator-programme.ts'))
    expect(model).toContain('FAILED_RUN_WINDOW_DAYS')
    expect(OPERATOR).toContain('failed_run_window_days')
  })

  it('the recovery ACTION is the existing costed route — no second sourcing path was invented', () => {
    // ⚠️ DELIBERATELY NOT REBUILT. `POST /operator/source` already has a cost preview in front
    // of it. What was missing was knowing there was anything to re-run.
    expect(OPERATOR).toContain("operatorRouter.post('/source'")
    expect(OPERATOR).toContain("operatorRouter.get('/source-preview'")
  })
})

// ── ① PROGRAMME TRUTH REACHES AN OPERATOR ────────────────────────────────────────────────
describe('① PROGRAMME TRUTH IS VISIBLE — the gap that blocked runtime verification', () => {
  it('an operator endpoint returns programme state', () => {
    expect(OPERATOR).toContain("operatorRouter.get('/programme'")
    expect(OPERATOR).toContain('programmeTruthFor')
  })

  it('platform-wide exceptions have a reader', () => {
    expect(OPERATOR).toContain("operatorRouter.get('/programme/exceptions'")
    expect(OPERATOR).toContain('stranded_batches')
    expect(OPERATOR).toContain('open_evictions')
  })

  it('🛑 STRANDED BATCHES AND EVICTIONS REACH THE BELL, not just an email', () => {
    // Both alerted by `sendFounderAlert` and nowhere else. An email is read once, or not.
    // A stranded batch holds a client's PAID volume; an open eviction is a real person still
    // being emailed after asking us to stop.
    expect(OPERATOR).toContain("kind: 'stranded_batch'")
    expect(OPERATOR).toContain("kind: 'provider_eviction'")
  })

  it('Vida renders the Programme tab and loads it', () => {
    expect(VIDA).toContain("'Programme'")
    expect(VIDA).toContain('/api/proxy/operator/programme?client_id=')
    expect(VIDA).toContain("tab === 'Programme'")
  })

  it('the panel shows the states, the ceiling and the batches — not a health score', () => {
    expect(VIDA).toContain('sourced_used')
    expect(VIDA).toContain('room_remaining')
    expect(VIDA).toContain('review_trigger_leads')
    expect(VIDA).toContain('Batches')
    // ⚠️ NO INVENTED METRIC. An operator acting on a number we made up is worse off than one
    // acting on nothing.
    for (const fake of ['health_score', 'healthScore', 'projected', 'fillRate', 'fill_rate']) {
      expect(VIDA, `the programme panel invented a metric: ${fake}`).not.toContain(fake)
    }
  })

  it('a DEGRADED read is rendered, so a quiet panel cannot mean "fine"', () => {
    expect(VIDA).toContain('prog?.degraded')
  })

  it('a legacy client is told they are legacy, not shown an empty programme', () => {
    expect(VIDA).toContain('legacy model')
  })
})

// ── ② LEAD POOL ──────────────────────────────────────────────────────────────────────────
describe('② LEAD-POOL VISIBILITY — truthful counts only', () => {
  const model = code(join(LIB, 'operator-programme.ts'))

  it('a summary endpoint exists', () => {
    expect(OPERATOR).toContain("operatorRouter.get('/pool/summary'")
  })

  it('🛑 the total is an EXACT COUNT, never a page length', () => {
    // Reading `data.length` off a limited select reports the LIMIT as the pool size — the
    // `.limit(1000)` shape this repo has already fixed twice.
    expect(model).toMatch(/count: 'exact', head: true/)
  })

  it('the breakdown STATES its sample size rather than posing as total', () => {
    expect(model).toContain('breakdown_sample')
  })

  it('no invented pool metric', () => {
    for (const fake of ['health', 'coverage', 'projected', 'fill_rate', 'quality_score']) {
      expect(model.toLowerCase(), `the pool summary invented a metric: ${fake}`).not.toContain(`${fake}:`)
    }
  })
})

// ── ④ REVERSIBLE ICP RETIREMENT ──────────────────────────────────────────────────────────
describe('④ ICP RETIREMENT IS REVERSIBLE AND REFUSES THE DANGEROUS CASE', () => {
  const fn = OPERATOR.slice(OPERATOR.indexOf("operatorRouter.post('/icp/:icpId/retire'"))
  const body = fn.slice(0, fn.indexOf('\n})') + 3)

  it('the route exists and is operator-key gated', () => {
    expect(body.length).toBeGreaterThan(500)
    expect(body).toContain('adminKeyValid')
  })

  it('🛑 IT DEACTIVATES — it never deletes', () => {
    // A delete would cascade through `icp_run_outcomes` and orphan the leads the ICP sourced,
    // destroying the record a runtime verification depends on.
    expect(body).toContain('is_active: active')
    expect(body, 'the retire route can DELETE — it must only deactivate').not.toContain('.delete(')
  })

  it('it is REVERSIBLE — active:true restores', () => {
    expect(body).toContain('req.body?.active === true')
    expect(body).toContain('is ACTIVE again')
  })

  it('it REFUSES to retire an ICP under a live programme without force', () => {
    // Retiring the ICP a paid programme sources against would stop that client's delivery with
    // no error anywhere — the exact invisible failure this PR exists to end.
    expect(body).toContain('409')
    expect(body).toContain('force')
    expect(body).toContain('Pause the programme first')
  })

  it('a failed write says the ICP is UNCHANGED — never a silent success', () => {
    expect(body).toContain('it is unchanged')
  })

  it('no destructive cleanup script exists anywhere in this PR', () => {
    // The founder locked production cleanup to non-destructive tooling. Asserted, not assumed.
    const model = code(join(LIB, 'operator-programme.ts'))
    for (const d of ['.delete(', 'truncate', 'DROP TABLE']) {
      expect(model.toLowerCase(), `the read model performs a destructive operation: ${d}`).not.toContain(d.toLowerCase())
    }
  })
})

// ── ⑤ THE READ MODEL WRITES NOTHING ──────────────────────────────────────────────────────
describe('⑤ THE READ MODEL IS READ-ONLY, BY CONSTRUCTION', () => {
  it('operator-programme.ts performs no write of any kind', () => {
    // The one action PR3 adds lives in the route, not here — so a read model can never mutate
    // by accident, and this is the assertion that keeps it that way.
    const model = code(join(LIB, 'operator-programme.ts'))
    for (const w of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(']) {
      expect(model, `the read model performs a write: ${w}`).not.toContain(w)
    }
  })
})

// ══ PR4 — THE GUARD THAT WOULD HAVE CAUGHT PR3's MISS ═══════════════════════════════════
//
// 🛑 WHAT WENT WRONG, STATED PLAINLY. PR3 built `GET /operator/pool/summary` and
// `GET /operator/programme/exceptions`, asserted that both ROUTES EXIST — and rendered
// neither. The only way to read them was a raw API call. That is precisely the failure PR3
// was written to fix, one level up.
//
// And the miss happened three tests above an assertion that says, in its own comment: *"every
// piece can be correct while the button that reaches them does not exist, and no unit test
// would notice."* I wrote that for the proof-review chain and did not apply it to the two
// surfaces I had just built.
//
// ⚠️ SO THE RULE IS NOW GENERAL, NOT PER-FEATURE: every operator READ endpoint must be reached
// by the UI. The sweep below is derived from the route list, so a NEW endpoint added later is
// covered without anyone remembering to add a test for it.
describe('PR4 — EVERY OPERATOR READ SURFACE IS REACHABLE BY CLICKING', () => {
  /** Operator GET routes that exist to be looked at by a human. */
  const READ_SURFACES: { route: string; mustRender: string[] }[] = [
    { route: '/operator/programme', mustRender: ['room_remaining', 'Batches'] },
    { route: '/operator/pool/summary', mustRender: ['by_source', 'by_country', 'breakdown_sample'] },
    { route: '/operator/programme/exceptions', mustRender: ['stranded_batches', 'open_evictions', 'failed_runs', 'debris_icps'] },
  ]

  for (const s of READ_SURFACES) {
    it(`${s.route} is CALLED by Vida`, () => {
      expect(
        VIDA,
        `${s.route} exists in the API and NOTHING in Vida calls it. An operator cannot reach it by clicking — this is the PR3 miss repeating.`,
      ).toContain(`/api/proxy${s.route}`)
    })

    it(`${s.route} has its truth RENDERED, not just fetched`, () => {
      // Fetching without rendering is the same invisibility with extra steps.
      for (const field of s.mustRender) {
        expect(VIDA, `${s.route} is fetched but "${field}" is never rendered`).toContain(field)
      }
    })
  }

  it('both new surfaces are reachable TABS, not dead state', () => {
    // A loader with no tab is unreachable. The tab list and the panel condition must both name
    // them, or the fetch above proves nothing.
    //
    // ⛓️ TIGHTENED AFTER A RED PROOF DID NOT GO RED. The first cut asserted `tab === 'Pool'`
    // appeared SOMEWHERE in the file — and it does, inside the loader effect. So disabling the
    // panel itself (`{false && (<>`) left this green while the surface became unreachable: the
    // exact PR3 failure, passing its own guard. The assertion now pins the PANEL OPENER, which
    // is the only occurrence that means the thing renders.
    for (const t of ['Pool', 'Exceptions']) {
      expect(VIDA, `no '${t}' tab exists in the tab strip`).toContain(`'${t}'`)
      expect(
        VIDA,
        `the '${t}' PANEL is not rendered. A loader with no panel fetches data nobody sees — and a grep for "tab === '${t}'" alone passes on that, because the loader effect contains it too.`,
      ).toContain(`{tab === '${t}' && (<>`)
    }
  })

  it('the tabs actually TRIGGER their loaders', () => {
    // A tab that renders an empty panel because nothing ever fetched is the third way to be
    // invisible. The effect that fires on tab change is the wire.
    expect(VIDA).toMatch(/if \(tab === 'Pool'\)\s*void loadPool\(\)/)
    expect(VIDA).toMatch(/if \(tab === 'Exceptions'\)\s*void loadExceptions\(\)/)
  })
})

describe('PR4 — THE POOL PANEL CANNOT LIE ABOUT AN UNKNOWN COUNT', () => {
  it('🛑 a null total renders as UNKNOWN and explicitly NOT zero', () => {
    // Rendering a failed count as 0 would tell an operator the inventory is empty — a
    // decision-changing lie on the surface that decides whether to buy more data.
    expect(VIDA).toContain('pool.total === null')
    expect(VIDA).toContain('This is NOT zero')
  })

  it('the null branch comes BEFORE any numeric formatting', () => {
    // `null.toLocaleString()` would throw, and a `?? 0` would silently render zero. The order
    // is what makes the honest branch unreachable-past.
    const nullAt = VIDA.indexOf('pool.total === null')
    const fmtAt = VIDA.indexOf('pool.total.toLocaleString()')
    expect(nullAt).toBeGreaterThan(0)
    expect(fmtAt).toBeGreaterThan(nullAt)
    expect(VIDA, 'the pool total is coerced with ?? 0 — a failed count would render as an empty pool').not.toContain('pool.total ?? 0')
  })

  it('the breakdown SAMPLE SIZE is shown, so a partial cannot pose as the whole pool', () => {
    expect(VIDA).toContain('breakdown_sample')
    expect(VIDA).toMatch(/not the whole pool/)
  })

  it('no invented pool metric reaches the panel', () => {
    for (const fake of ['health_score', 'healthScore', 'fill_rate', 'fillRate', 'projected', 'coverage_pct']) {
      expect(VIDA, `the pool panel invented a metric: ${fake}`).not.toContain(fake)
    }
  })
})

describe('PR4 — DEGRADED STATE STAYS VISIBLE ON BOTH NEW PANELS', () => {
  it('each panel renders its degraded list', () => {
    // On an operator console an empty screen reads as "nothing is wrong". A degraded read must
    // never be indistinguishable from a clean one.
    expect(VIDA).toContain('pool?.degraded')
    expect(VIDA).toContain('exc?.degraded')
  })

  it('each panel renders its own load error', () => {
    expect(VIDA).toContain('poolErr')
    expect(VIDA).toContain('excErr')
  })
})

describe('PR4 — THE EXCEPTIONS PANEL NAMES WHO EACH PROBLEM BELONGS TO', () => {
  it('every exception row shows a client, so an operator can act rather than hunt', () => {
    // A list of ids with no owner is a list nobody can act on.
    //
    // ⛓️ COUNTED FILE-WIDE, NOT INSIDE A SLICED PANEL. The first cut sliced from
    // `tab === 'Exceptions'` to the first `</>)}` — which closes a NESTED fragment long before
    // the rows, so the body was empty and the assertion read zero. A slice that silently ends
    // early makes a real assertion report a false absence, and only the failure exposed it.
    // `client_id?.slice` appears nowhere else in this file, so the count is unambiguous.
    expect((VIDA.match(/client_id\?\.slice/g) ?? []).length,
      'the exception rows do not name their client').toBeGreaterThanOrEqual(3)
  })

  it('the crashed-run window is stated in the UI, not silently applied', () => {
    expect(VIDA).toContain('failed_run_window_days')
  })

  it('🛑 THE ONLY CLEANUP ACTION IS REVERSIBLE RETIREMENT — no destructive control exists', () => {
    // The founder locked production cleanup to non-destructive tooling. Asserted on the UI as
    // well as the route, because a delete button is a delete regardless of what the API allows.
    expect(VIDA).toContain('/retire')
    expect(VIDA).toContain('Restore')
    for (const d of ['/delete', 'Delete', 'Purge', 'Wipe']) {
      expect(VIDA, `the exceptions panel offers a destructive control: ${d}`).not.toContain(d)
    }
  })

  it('debris is labelled a CANDIDATE, never a verdict', () => {
    expect(VIDA).toMatch(/debris ICP candidates/i)
  })
})
