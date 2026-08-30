// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD-004A-1 — THE CUSTOMER'S PROGRAMME TRUTH, AND THE RULE THAT NO COPY IS INVENTED.
//
// Two things this suite exists to stop, both of which this repo has now shipped once:
//
//   ① A FAILED READ RENDERING AS "YOU HAVE NO PROGRAMME". For an operator that is a quiet
//      console; for a paying customer it is being told their programme does not exist, with
//      their money already taken. The engine has the same defect shape in its history
//      (`.data ?? []`), and here it has the highest possible cost.
//
//   ② CUSTOMER COPY I WROTE. The founder's rule for BUILD-004A is explicit: no new visible
//      copy, flow or navigation decision without sign-off. Copy is the easiest thing in the
//      world to add by accident, so the locked sentences are pinned character-for-character
//      and the stage vocabulary is pinned to the seven the founder specified.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

import {
  millaStage, MILLA_STAGES, STAGE_QUICK_ACTION, MILLA_FAILURE_COPY,
  outcomeIsAutoPriceable, type EngineProgrammeStatus,
} from '@kind/shared'

/**
 * Strip TS/JSX comments.
 *
 * ⛓️ ADDED AFTER MY OWN COMMENTS FAILED MY OWN GUARDS — the sixth time this exact shape has
 * bitten in this repo. The "no wallet language" assertion tripped on the page's own comment
 * saying *"NO WALLET, NO PACK"*, and the "not admin-gated" assertion tripped on the route's
 * comment explaining WHY it is not admin-gated. Prose about a rule is not a violation of it,
 * and a guard that cannot tell the difference reports failures that are not there — which is
 * exactly as useless as one that misses failures that are.
 *
 * Line-anchored, because a non-greedy block regex over a whole file eats real code (that was
 * the fifth time).
 */
function strip(src: string): string {
  let inBlock = false
  return src.split('\n').map(l => {
    const t = l.trim()
    if (inBlock) { if (t.endsWith('*/')) inBlock = false; return '' }
    if (t.startsWith('/*')) { if (!t.endsWith('*/')) inBlock = true; return '' }
    if (t.startsWith('{/*')) { if (!t.endsWith('*/}')) inBlock = true; return '' }
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}

const PORTAL = join(__dirname, '../../../../apps/portal/src')
const read = (p: string) => readFileSync(join(PORTAL, p), 'utf8')
const SHELL = read('components/milla/MillaShell.tsx')
const PROGRAMME_PAGE = read('app/(milla)/milla/programme/page.tsx')
const ROUTE = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')

/** Executable code only — what the customer's browser and the server actually run. */
const PAGE_CODE = strip(PROGRAMME_PAGE)
const ROUTE_CODE = strip(ROUTE)
const SHELL_CODE = strip(SHELL)

describe('the suite is not vacuous', () => {
  it('the sources load and the stage mapper answers', () => {
    expect(SHELL.length).toBeGreaterThan(1000)
    expect(PROGRAMME_PAGE.length).toBeGreaterThan(1000)
    expect(millaStage({ status: 'LIVE' })).toBe('Live')
  })
})

describe('THE SEVEN STAGES ARE THE FOUNDER\'S, AND EVERY ENGINE STATUS MAPS', () => {
  it('the stage list is exactly what was specified', () => {
    expect([...MILLA_STAGES]).toEqual(
      ['Proof', 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion'])
  })

  it('every engine status maps to a stage — the mapper is TOTAL', () => {
    // A status with no stage would render an empty workspace. Enumerated rather than trusted.
    const ALL: EngineProgrammeStatus[] = [
      'DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT', 'SOURCING_AUTHORISED', 'SOURCING',
      'READY_FOR_APPROVAL', 'APPROVED', 'LIVE', 'COMPLETED', 'CANCELLED',
    ]
    for (const s of ALL) {
      expect(MILLA_STAGES, `${s} maps to nothing`).toContain(millaStage({ status: s }))
    }
  })

  it('no programme at all is PROOF, not an error', () => {
    expect(millaStage({ status: null })).toBe('Proof')
  })

  it('🛑 REVIEW OVERRIDES LIVE, AND ONLY LIVE', () => {
    // A review decision is waiting on a running programme — the customer must see it. It must
    // NOT override Completion: a finished programme has nothing to review into.
    expect(millaStage({ status: 'LIVE', reviewOpen: true })).toBe('Review')
    expect(millaStage({ status: 'LIVE', reviewOpen: false })).toBe('Live')
    expect(millaStage({ status: 'COMPLETED', reviewOpen: true })).toBe('Completion')
    expect(millaStage({ status: 'SOURCING', reviewOpen: true })).toBe('Sourcing')
  })

  it('the two money-waiting statuses read as Recommendation, not as separate stages', () => {
    expect(millaStage({ status: 'RECOMMENDED' })).toBe('Recommendation')
    expect(millaStage({ status: 'AWAITING_FIRST_PAYMENT' })).toBe('Recommendation')
  })

  it('every stage has its quick action, and they are the founder\'s words', () => {
    for (const s of MILLA_STAGES) expect(STAGE_QUICK_ACTION[s], s).toBeTruthy()
    expect(STAGE_QUICK_ACTION.Proof).toBe('Show me stronger examples')
    expect(STAGE_QUICK_ACTION.Sourcing).toBe('What are you learning?')
    expect(STAGE_QUICK_ACTION.Live).toBe("What's working?")
    expect(STAGE_QUICK_ACTION.Review).toBe('What should we change?')
    expect(STAGE_QUICK_ACTION.Completion).toBe('What should we do next?')
  })
})

describe('🛑 THE LOCKED CUSTOMER COPY IS EXACT — never paraphrased, never re-derived', () => {
  it('all three sentences are character-for-character what the founder locked', () => {
    expect(MILLA_FAILURE_COPY.sourcingPaused).toBe('Sourcing is paused while we recover.')
    expect(MILLA_FAILURE_COPY.paymentFailed).toBe("Your payment didn't complete. Nothing has started.")
    expect(MILLA_FAILURE_COPY.pipelineFailed).toBe("We couldn't load your pipeline. Nothing has changed.")
  })

  it('each one says what did NOT happen', () => {
    // The whole design: a customer seeing an error needs to know their money and their
    // programme are untouched. A sentence that only reports failure invites the worst reading.
    expect(MILLA_FAILURE_COPY.paymentFailed.toLowerCase()).toContain('nothing has started')
    expect(MILLA_FAILURE_COPY.pipelineFailed.toLowerCase()).toContain('nothing has changed')
  })

  it('the SERVER sends the pause sentence — the client cannot drift from it', () => {
    expect(ROUTE).toContain('MILLA_FAILURE_COPY.sourcingPaused')
    expect(PAGE_CODE, 'the page hard-codes the pause sentence instead of rendering the server\'s')
      .not.toContain('Sourcing is paused while we recover.')
    expect(PROGRAMME_PAGE).toContain('p.pausedCopy')
  })
})

describe('A FAILED READ IS NEVER AN EMPTY PROGRAMME', () => {
  it('the route answers 503 with the locked sentence, not an empty body', () => {
    // 🛑 THE HIGHEST-COST VERSION OF THIS REPO\'S OLDEST DEFECT. Returning `{ programme: null }`
    // on a read error renders the Proof stage to somebody who has paid — telling them their
    // programme does not exist.
    //
    // ⛓️ TIGHTENED AFTER A RED PROOF DID NOT GO RED. The first cut asserted that `res.status(503)`
    // and the locked sentence appeared ANYWHERE in the file — and they do, in the outer catch.
    // So deleting the read-error branch entirely and returning `{ success: true, data: null }`
    // left this green, on the single most damaging failure this file exists to prevent. The
    // assertion now pins the `if (error)` BRANCH, and separately forbids a null success body.
    const errBranch = ROUTE_CODE.slice(ROUTE_CODE.indexOf('if (error) {'))
    expect(ROUTE_CODE, 'the read-error branch is gone').toContain('if (error) {')
    expect(errBranch.slice(0, 500), 'a failed programme read no longer answers 503')
      .toContain('res.status(503)')
    expect(errBranch.slice(0, 500), 'the 503 no longer carries the locked sentence')
      .toContain('MILLA_FAILURE_COPY.pipelineFailed')
    // 🛑 AND NEVER A SUCCESSFUL NULL. `{ success: true, data: null }` renders the Proof stage to
    // somebody who has paid — the exact shape RED 1 introduced and this missed.
    expect(ROUTE_CODE, 'the route can answer success with a null programme')
      .not.toMatch(/success: true, data: null/)
  })

  it('a genuinely absent programme is still a 200 — Proof, not an error', () => {
    // The other half. A prospect with no programme is not a failure state.
    expect(ROUTE).toContain("stage: 'Proof' as MillaStage")
  })

  it('unreadable meeting counts pass through as null, never as 0', () => {
    expect(ROUTE).toContain('outcomesAchieved: number | null')
    expect(ROUTE).toMatch(/counts === null \? null/)
    expect(PROGRAMME_PAGE).toContain('p.progress.outcomesAchieved === null')
    expect(PROGRAMME_PAGE, 'a failed meeting count is coerced to zero on screen')
      .not.toMatch(/outcomesAchieved \?\? 0/)
  })

  it('meetings come from public.meetings — the sole meeting truth', () => {
    expect(ROUTE).toContain('clientMeetingCounts')
  })
})

describe('TENANCY AND SAFETY OF THE CUSTOMER ROUTE', () => {
  it('the client comes from the SESSION, never from the request', () => {
    expect(ROUTE).toContain('getClientId(req.userId!)')
    expect(ROUTE, 'the customer route reads a client_id from the request — a browser could tamper with it')
      .not.toMatch(/req\.(query|body|params)\.client_id/)
  })

  it('it is session-authenticated', () => {
    expect(ROUTE).toContain('requireAuth')
  })

  it('🛑 IT IS READ-ONLY — a status screen must not be able to spend', () => {
    for (const w of ['.insert(', '.update(', '.upsert(', '.delete(', '.rpc(']) {
      expect(ROUTE, `the customer programme route performs a write: ${w}`).not.toContain(w)
    }
  })

  it('it does NOT live in the admin-key-gated operator router', () => {
    // `routes/programme.ts` gates every route behind adminKeyValid at the router level.
    // Putting a customer read in it would mean loosening the last gate that should be loosened.
    expect(ROUTE_CODE).toContain('myProgrammeRouter')
    expect(ROUTE_CODE, 'the customer route calls the admin gate').not.toContain('adminKeyValid(')
  })

  it('no operator vocabulary reaches the customer payload', () => {
    // A client reading "batch 3 is STRANDED, 150 records held" learns only that something is
    // broken and that we talk about them in machine.
    for (const leak of ['stranded', 'reservation', 'reconcile', 'batch_id', 'sourced_reserved']) {
      expect(ROUTE_CODE.toLowerCase(), `operator vocabulary leaked to the customer: ${leak}`)
        .not.toContain(`${leak}:`)
    }
  })
})

describe('THE APPROVED SHELL CHANGES, AND ONLY THOSE', () => {
  it('"New leads" is now Home, and its per-lead badge is gone', () => {
    expect(SHELL).toContain("link('/milla', 'Home'")
    expect(SHELL_CODE, 'the per-lead approval badge survived — the programme model has no per-lead approval')
      .not.toContain("isLeads, s?.leads_awaiting")
  })

  it('"My campaign" is now Programme and points at the new route', () => {
    expect(SHELL).toContain("link('/milla/programme', 'Programme'")
    expect(SHELL_CODE).not.toContain("'My campaign'")
  })

  it('the rail footer is the founder\'s exact words', () => {
    expect(SHELL).toContain('Tell Milla the outcome. We’ll do the work.')
    expect(SHELL_CODE, 'the old per-lead-approval footer survived')
      .not.toContain('You just approve the leads worth pursuing')
  })

  it('Recent replies is KEPT (founder ruling 3)', () => {
    expect(SHELL).toContain('Recent replies')
  })

  it('every approved rail item is present and nothing new was invented', () => {
    for (const item of ['Pipeline', 'Meetings', 'Replies', 'Programme', 'My ICP', 'Documents', 'Reports', 'Coaching']) {
      expect(SHELL, `rail item missing: ${item}`).toContain(`'${item}'`)
    }
  })
})

describe('NO WALLET, NO PACK, NO PER-LEAD PRICE ON THE PROGRAMME SURFACE', () => {
  it('the programme page carries none of the legacy money language', () => {
    for (const legacy of ['wallet', 'PACK_PRICE', 'PACK_LEADS', '$4', 'per lead', 'top up', 'credits']) {
      expect(PAGE_CODE.toLowerCase(), `legacy money language on the programme page: ${legacy}`)
        .not.toContain(legacy.toLowerCase())
    }
  })

  it('the customer payload carries none either', () => {
    for (const legacy of ['wallet_balance', 'sourcing_allowance', 'credits']) {
      expect(ROUTE_CODE, `legacy money field in the customer payload: ${legacy}`).not.toContain(legacy)
    }
  })

  it('no projection or confidence number is rendered', () => {
    // A made-up number in front of a paying client is a promise.
    for (const fake of ['on track', 'projected', 'forecast', 'confidence', 'estimated completion']) {
      expect(PAGE_CODE.toLowerCase(), `an invented figure reached the customer: ${fake}`)
        .not.toContain(fake)
    }
  })
})

describe('OPTION C — ANY OUTCOME IS CAPTURED, ONLY MEETINGS ARE AUTO-PRICED', () => {
  it('meetings price automatically; nothing else does', () => {
    expect(outcomeIsAutoPriceable('meetings')).toBe(true)
    expect(outcomeIsAutoPriceable('other')).toBe(false)
  })

  it('🛑 NO MEETING-EQUIVALENT PRICING IS INVENTED ANYWHERE', () => {
    // The founder ruled this out explicitly: mapping a registration target onto the meeting
    // curve puts a price in front of a customer that no commercial rule supports.
    // ⚠️ CODE ONLY — the module's own comment EXPLAINS why it does not call `quoteProgramme`,
    // and an assertion that cannot tell an explanation from a call fails on the very comment
    // documenting the rule it enforces. Third time in this file alone.
    const shared = strip(readFileSync(join(__dirname, '../../../../packages/shared/src/programme-stage.ts'), 'utf8'))
    for (const invented of ['quoteProgramme(', 'meetingEquivalent', 'pricePerMeeting', 'LEADS_PER_TARGETED_MEETING']) {
      expect(shared, `the stage module reaches into pricing: ${invented}`).not.toContain(invented)
    }
  })
})
