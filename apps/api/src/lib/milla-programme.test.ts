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
    // ⛓️ THE EXIT MUST ACCEPT `*/}` TOO. JSX comments close with `*/}`, not `*/`, so an exit
    // testing only `*/` never fires: the stripper enters the block and eats the ENTIRE REST OF
    // THE FILE. The `outcomesAchieved === null` guard then failed on a line that was right
    // there. Seventh time a comment-handling bug in this repo has produced a false result —
    // and the fifth where the stripper itself was the fault, not the code it was reading.
    if (inBlock) { if (t.endsWith('*/') || t.endsWith('*/}')) inBlock = false; return '' }
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
// ⛓️ 30 Aug (BUILD-004A-2) — THE READ MOVED, THE RULES DID NOT. Milla's chat now needs the
// same programme facts this route serves, so the query was lifted into a shared reader; a
// second reader would have been a second truth. These guards follow the LOGIC to where it
// lives rather than being deleted for pointing at a file that no longer holds it — the whole
// pattern this repo keeps paying for is a guard re-aimed at nothing.
const READER = readFileSync(join(__dirname, 'customer-programme.ts'), 'utf8')
const READER_CODE = strip(READER)
/** The customer programme READ, wherever it lives: the route and the reader it delegates to. */
const CUSTOMER_READ = ROUTE + '\n' + READER
const CUSTOMER_READ_CODE = ROUTE_CODE + '\n' + READER_CODE
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
    expect(CUSTOMER_READ).toContain('MILLA_FAILURE_COPY.sourcingPaused')
    expect(PAGE_CODE, 'the page hard-codes the pause sentence instead of rendering the server\'s')
      .not.toContain('Sourcing is paused while we recover.')
    // ⛓️ REPOINTED: the pause banner moved into the shared ProgrammeWorkspace when the home
    // and the Programme page were made to render one implementation.
    expect(strip(readFileSync(join(PORTAL, 'components/milla/ProgrammeWorkspace.tsx'), 'utf8')))
      .toContain('p.pausedCopy')
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
    // ⛓️ THE BRANCH IS NOW IN TWO HALVES, AND BOTH ARE PINNED. The reader turns a failed
    // query into `null`; the route turns `null` into the 503 with the locked sentence. Either
    // half collapsing back to "no programme" is the same defect it always was.
    const errBranch = READER_CODE.slice(READER_CODE.indexOf('if (error) {'))
    expect(READER_CODE, 'the read-error branch is gone from the reader').toContain('if (error) {')
    expect(errBranch.slice(0, 400), 'a failed read no longer returns null (unknown)')
      .toContain('return null')
    expect(ROUTE_CODE, 'the route no longer answers 503 on an unreadable programme')
      .toMatch(/if \(data === null\) \{[\s\S]{0,200}?res\.status\(503\)/)
    expect(ROUTE_CODE, 'the 503 no longer carries the locked sentence')
      .toContain('MILLA_FAILURE_COPY.pipelineFailed')
    // 🛑 AND NEVER A SUCCESSFUL NULL. `{ success: true, data: null }` renders the Proof stage to
    // somebody who has paid — the exact shape RED 1 introduced and this missed.
    expect(CUSTOMER_READ_CODE, 'the route can answer success with a null programme')
      .not.toMatch(/success: true, data: null/)
  })

  it('a genuinely absent programme is still a 200 — Proof, not an error', () => {
    // The other half. A prospect with no programme is not a failure state.
    // The reader names it: no row is a real answer, and it is Proof.
    expect(CUSTOMER_READ).toContain("stage: 'Proof'")
    expect(READER_CODE).toContain('if (!data) return NO_PROGRAMME')
  })

  it('unreadable meeting counts pass through as null, never as 0', () => {
    expect(CUSTOMER_READ).toContain('outcomesAchieved: number | null')
    expect(CUSTOMER_READ).toMatch(/counts === null \? null/)
    // ⛓️ REPOINTED: the figure moved into the shared ProgrammeWorkspace, and the HOME renders
    // its own card from the same rule — so both are asserted. The page no longer contains it.
    const ws = strip(readFileSync(join(PORTAL, 'components/milla/ProgrammeWorkspace.tsx'), 'utf8'))
    const home = strip(readFileSync(join(PORTAL, 'app/(milla)/milla/page.tsx'), 'utf8'))
    expect(ws).toContain('p.progress.outcomesAchieved === null')
    expect(home, 'the home card does not distinguish an unreadable meeting count from zero')
      .toContain('prog.progress.outcomesAchieved === null')
    for (const src of [ws, home]) {
      expect(src, 'a failed meeting count is coerced to zero on screen')
        .not.toMatch(/outcomesAchieved \?\? 0/)
    }
  })

  it('meetings come from public.meetings — the sole meeting truth', () => {
    expect(CUSTOMER_READ).toContain('clientMeetingCounts')
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

// ══ THE HOME ITSELF — THE GUARDS WHOSE ABSENCE LET ME REPORT 4A-1 AS DONE ═══════════════
//
// 🛑 THE MISS THIS EXISTS FOR. PR #1613's first cut built the stage model, the customer
// endpoint and a NEW `/milla/programme` page — and never touched `/milla/page.tsx`, the screen
// a customer actually lands on. The PR body said "Home replaces New leads", which described a
// RAIL LABEL, and I let that stand in for the home rebuild in my own report. The founder caught
// it from the changed-file list.
//
// Meanwhile the live landing screen still read: "Your $299 includes 100 approved leads", "a
// flat $4 per lead, final" IN MILLA'S OPENING GREETING, a wallet balance, and the per-lead
// approval desk the programme model removes. Every one of those was one merge from a customer.
//
// So the home is now asserted directly, by file, and the legacy symbols are forbidden by name.
const HOME = readFileSync(join(PORTAL, 'app/(milla)/milla/page.tsx'), 'utf8')
const HOME_CODE = strip(HOME)
// ⚑ 4 Sep — the ONE shell-owned Milla conversation. It was declared inside the home until
// today; the guards that describe the CONVERSATION now read the file that renders it, and the
// home is asserted below to hold no second copy.
const CHAT = readFileSync(join(PORTAL, 'components/milla/MillaConversation.tsx'), 'utf8')
const CHAT_CODE = strip(CHAT)
const WORKSPACE = readFileSync(join(PORTAL, 'components/milla/ProgrammeWorkspace.tsx'), 'utf8')
const WORKSPACE_CODE = strip(WORKSPACE)
const PROG_PAGE_CODE = strip(PROGRAMME_PAGE)

describe('THE MILLA HOME IS THE PROGRAMME HOME', () => {
  it('the sweep is not vacuous — the home loads and is the real file', () => {
    expect(HOME.length).toBeGreaterThan(20_000)
    expect(HOME_CODE).toContain('export default function')
  })

  it('① the home CALLS /my/programme', () => {
    expect(HOME_CODE, 'the landing screen does not load programme truth at all — this is the PR #1613 miss')
      .toContain("'/my/programme'")
  })

  it('② the four approved cards render — outcome, stage, progress, next', () => {
    // Exactly the four the founder specified. A fifth would be an invented card.
    for (const card of ['"Outcome"', '"Stage"', '"Progress"', '"Next"']) {
      expect(HOME_CODE, `the ${card} card is missing from the home`).toContain(`k=${card}`)
    }
  })

  it('③ the home renders the SHARED ProgrammeWorkspace', () => {
    expect(HOME_CODE).toContain('<ProgrammeWorkspace')
    expect(HOME_CODE).toContain("from '@/components/milla/ProgrammeWorkspace'")
  })

  it('④ /milla/programme renders the SAME component — the two cannot drift', () => {
    // 🛑 TWO RENDERINGS OF ONE TRUTH DRIFT. One gets a fix, the other does not, and the
    // customer sees different numbers for one programme depending which screen they are on.
    expect(PROG_PAGE_CODE).toContain('<ProgrammeWorkspace')
    // ...and the workspace is the only place the stage strip is built.
    expect(WORKSPACE_CODE).toContain('MILLA_STAGES.indexOf')
    expect(HOME_CODE, 'the home re-implements the stage strip instead of using the component')
      .not.toContain('MILLA_STAGES.indexOf')
  })

  it('⑤ the approved greeting is used EXACTLY, and is not assembled from anything', () => {
    // ⚑ 4 Sep — RETARGETED, NOT RELAXED. The greeting moved with the transcript it opens, to
    // the ONE shell-owned conversation. Same sentence, same "not a template" rule — plus the
    // home is now required to hold NO copy, so the opener cannot be said twice.
    expect(CHAT_CODE).toContain('Hi, I’m Milla. Tell me what you’re trying to achieve, and I’ll help shape the right programme from there.')
    // Not a template: no interpolation, so no future edit can slip a price back into it.
    expect(CHAT_CODE).toContain('const MILLA_GREETING')
    expect(CHAT_CODE).not.toMatch(/MILLA_GREETING\s*=\s*`/)
    expect(HOME_CODE, 'the home greets the customer a second time').not.toContain('MILLA_GREETING')
  })
})

describe('🛑 NO LEGACY MONEY TRUTH SURVIVES ON THE MILLA HOME', () => {
  // Every one of these was rendering on the live landing screen when the founder asked.
  const FORBIDDEN: [string, string][] = [
    ['PACK_PRICE_USD',  'the $299 pack price'],
    ['PACK_LEADS',      'the 100-included-leads pack'],
    ['wallet_balance',  'the wallet balance'],
    ['shortfallMessage','the wallet top-up prompt'],
    ['deskCoverage',    'the lead-desk coverage figure'],
    ['$299',            'the pack price in copy'],
    ['$4',              'the per-lead price in copy'],
  ]
  for (const [symbol, what] of FORBIDDEN) {
    it(`${what} is gone from the home`, () => {
      expect(HOME_CODE, `${what} (${symbol}) is still rendered on the Milla home`).not.toContain(symbol)
    })
  }

  it('🛑 THE PAID PER-LEAD APPROVAL DESK CANNOT RETURN SILENTLY', () => {
    // ⛓️ 30 Aug (OPTION B) — THIS GUARD WAS TOO WIDE, AND ITS WIDTH WAS A DEFECT, NOT RIGOUR.
    // Its first form forbade `/leads/for-approval` and `proof-accept` outright. But those two
    // are the FREE PROOF CALIBRATION's fetch and signal — they carry no money at all — so
    // forbidding them by name is what made deleting the customer's reaction look like passing
    // the guard. What actually made that screen a DESK was the paid half: revealing a contact
    // and charging $4 for it, one lead at a time, plus the batch approve and its wallet.
    //
    // So the paid half is named, and only the paid half.
    expect(HOME_CODE, 'the per-lead paid approve is back on the home').not.toContain('/approve`')
    expect(HOME_CODE, 'the paid batch approve is back on the home').not.toContain('/leads/approve-batch')
    expect(HOME_CODE, 'the batch approve handler is back on the home').not.toContain('approveSelected')
    expect(HOME_CODE, 'the minimum-20 paid gate is back on the home').not.toContain('batch_minimum')
    // The reveal is the charge made visible — a contact address on a calibration card means
    // somebody paid for it. No writer for `revealed` may exist on this screen.
    expect(HOME_CODE, 'a reveal writer is back on the home').not.toContain('setRevealed')
    // And no paid approval LANGUAGE, whatever the code does. The founder forbade these words
    // on this surface by name; the calibration verbs are "Looks right" and "Not a fit".
    expect(HOME_CODE, 'paid approval language is back on the home').not.toMatch(/approve qualified lead/i)
    expect(HOME_CODE, 'the paid approve receipt is back on the home').not.toContain('Approved · ')
  })

  // ── ⚑ 30 Aug (BUILD-004A-1, OPTION B) — THE CONVERSATIONAL CALIBRATION IS GUARDED ────────
  //
  // 🛑 WHAT THESE EXIST FOR. Removing the approval desk removed the Free Proof reaction with
  // it — fifteen guards went red and the founder ruled the rebuild (Option B). A guard that
  // only ever says "the desk is gone" cannot tell an intentional replacement from a deletion.
  // These say what must be THERE, so the same regression cannot recur silently.
  describe('AT PROOF THE CLIENT CAN STILL REACT — AND IT COSTS NOTHING', () => {
    it('a Proof-stage client is given a calibration surface, not the programme workspace', () => {
      // ⛓️ CORRECTED 3 Sep — THE STAGE WAS NEVER THE RIGHT QUESTION. `millaStage` maps a DRAFT
      // programme AND no programme at all to 'Proof', so branching on the stage sent a client
      // WITH a programme into the legacy client-scoped desk and rendered their history as
      // current programme work. What this guard actually protects is unchanged: a prospect who
      // has NOT bought a programme must land on the calibration surface, not on a workspace
      // describing a programme they do not have. `hasProgramme` is that question, asked directly.
      expect(HOME_CODE, 'the home no longer branches on whether a programme exists').toContain('prog.hasProgramme !== false')
      expect(HOME_CODE, 'the calibration set is not fetched').toContain('/leads/for-approval')
    })

    it('the three founder-specified controls are on every card', () => {
      // ⚠️ PINNED TO THE CONTROL, NOT THE STRING. A first cut asserted `toContain('Tell Milla
      // why')` and PASSED with the button deleted — the same words survive as the input's
      // placeholder attribute, so the guard matched a hint on a box nothing could open. Each
      // of the three is anchored on the element that actually does the thing.
      expect(HOME_CODE, '"Looks right" is gone from the calibration card')
        .toMatch(/>\s*\{busy \? 'Saving…' : reacted\[l\.id\] === 'approve' \? 'Noted' : '👍 Looks right'\}\s*</)
      expect(HOME_CODE, '"Not a fit" is gone from the calibration card')
        .toMatch(/pass\(l\.id\)[\s\S]{0,200}?>Not a fit<\/button>/)
      expect(HOME_CODE, '"Tell Milla why" is gone from the calibration card')
        .toMatch(/>\s*Tell Milla why\s*<\/button>/)
      // …and the control it opens actually files something.
      expect(HOME_CODE, 'the note box opens nothing').toContain("setNoteFor(l.id); setNoteText('')")
    })

    it('"Looks right" records the signal and takes the client nowhere', () => {
      // The signal is `proof-accept`, which reveals nothing and charges nothing. What it must
      // NOT do is what it used to: push straight to the $299 pack checkout.
      expect(HOME_CODE).toContain('/proof-accept`')
      expect(HOME_CODE, 'the pack checkout is back behind "Looks right"').not.toContain('from=proof')
      expect(HOME_CODE, 'the pack checkout is back behind "Looks right"').not.toContain('billing?start=1')
    })

    it('"Tell Milla why" is optional, free text, and attached to the right verdict', () => {
      expect(HOME_CODE).toContain('async function sendNote')
      expect(HOME_CODE, 'the note is not sent as free text').toContain('free_text: text')
      // Filing a note about a prospect they LIKED under `pass` puts their words on the
      // opposite verdict — `lead_feedback` is keyed on (client_id, lead_id, action).
      expect(HOME_CODE, 'the note is filed against a fixed verdict')
        .toContain("action: reacted[leadId] === 'approve' ? 'approve' : 'pass'")
      // Optional in the strict sense: nothing waits on it and no failure reaches the client.
      expect(HOME_CODE, 'a failed note now surfaces an error to the client')
        .not.toMatch(/sendNote[\s\S]{0,600}catch\s*\{[^}]*setError/)
    })

    it('the two-pass stop is stated, and offers no third action', () => {
      // The server grants exactly two proof passes. A client who has spent both is told so
      // here — rebuilding the panel dropped this once already.
      expect(HOME_CODE).toContain('proofExhausted &&')
      expect(strip(HOME).includes('We’ve used both proof passes. K.I.N.D will review this with you.')
          || HOME.includes('We&rsquo;ve used both proof passes. K.I.N.D will review this with you.'))
        .toBe(true)
    })

    it('the terminal and recovery states still win over the calibration set', () => {
      // A finished or crashed run is the server's verdict and outranks anything this screen
      // would otherwise render. Deleting these is how a client gets a spinner forever.
      expect(HOME_CODE).toContain('terminalRun ?')
      expect(HOME_CODE).toContain('proofAwaiting ?')
      expect(HOME_CODE).toContain('We hit a snag confirming your matches')
    })
  })

  it('the workspace carries no legacy money truth either', () => {
    for (const [symbol] of FORBIDDEN) {
      expect(WORKSPACE_CODE, `legacy money truth in the shared workspace: ${symbol}`).not.toContain(symbol)
    }
  })
})

// ═══ THE LIVE WALK (30 Aug) — FOUR THINGS THE GATE PASSED AND A HUMAN DID NOT ═══════════
//
// 🛑 EVERY GUARD IN THIS FILE WAS GREEN when the founder opened the deployed `/milla` and
// found: "$4,000 wallet" in the top bar of every screen · "Paused — we'll tell you why" two
// inches above "Proof — current" · outreach-performance learning at a stage where nothing has
// been sent · "Please pause my campaign" on a product renamed Programme.
//
// The reason each survived is the same: the guards above assert about ONE FILE, the home, and
// three of these four live outside it or arrive from an endpoint the home does not own. This
// block asserts across the surface a customer actually sees.
describe('THE MILLA SHELL CARRIES NO RETIRED COMMERCIAL TRUTH', () => {
  const SHELL = readFileSync(join(PORTAL, 'components/milla/MillaShell.tsx'), 'utf8')
  const SHELL_CODE = strip(SHELL)

  it('the sweep is not vacuous — the shell loads and is the real file', () => {
    expect(SHELL_CODE).toContain('export function MillaShell')
  })

  it('① the wallet balance is gone from the top bar', () => {
    // It rendered on EVERY Milla screen, which makes it the most-read stale claim there was.
    expect(SHELL_CODE, 'the wallet chip is back in the Milla top bar').not.toContain('wallet_balance_usd')
    expect(SHELL_CODE, 'the word "wallet" is back in the Milla shell').not.toMatch(/wallet/i)
  })

  // ── ⚑ FOUNDER DECISION 1 (30 Aug) — THE FLOW BAR IS DERIVED, NOT WRITTEN ─────────────
  //
  // 🛑 THE RIBBON WAS A SECOND STAGE VOCABULARY. A hardcoded array — Sign up › Build plan ›
  // We reach out › Replies › You approve › Follow-up › Meeting booked › Results — rendered
  // two inches from the Stage card that already showed the approved seven. Nothing kept the
  // two in step, and `You approve` was the per-lead approval the programme model removed.
  //
  // These guards exist because "derive it from the constant" is a promise that decays the
  // moment somebody adds one convenient extra step to the array.
  describe('THE FLOW BAR IS THE APPROVED LIFECYCLE, AND ONLY THAT', () => {
    it('⑦ it is sourced from MILLA_STAGES, and the shared constant is the seven stages', () => {
      expect(SHELL_CODE, 'the FLOW bar no longer maps the shared stage constant')
        .toContain('{MILLA_STAGES.map((label, i, arr) => {')
      expect(SHELL_CODE, 'MILLA_STAGES is not imported from the shared package')
        .toMatch(/import \{[^}]*MILLA_STAGES[^}]*\} from '@kind\/shared'/)
      // ⚠️ AND THE CONSTANT IS THE REAL ONE. A guard that only checks the shell would pass if
      // someone declared a local `MILLA_STAGES` beside it — which is the exact defect (a
      // second vocabulary) this decision removed.
      expect(SHELL_CODE, 'the shell declares its own MILLA_STAGES').not.toMatch(/const MILLA_STAGES/)
      expect(MILLA_STAGES).toEqual(
        ['Proof', 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion'])
    })

    it('⑧ the retired journey cannot silently return — no label is typed into the ribbon', () => {
      // Every step of the old array, forbidden by name. `Replies` is deliberately NOT in this
      // list: it is a legitimate rail entry on this same file, and forbidding the word would
      // guard the wrong thing.
      for (const retired of ['Sign up', 'Build plan', 'We reach out', 'You approve', 'Follow-up', 'Results']) {
        expect(SHELL_CODE, `the retired FLOW step "${retired}" is back in the shell`).not.toContain(retired)
      }
      // And no stage name is hand-typed either — the whole point is that they are derived.
      for (const stage of MILLA_STAGES) {
        expect(SHELL_CODE, `the stage "${stage}" is hand-typed into the shell instead of derived`)
          .not.toContain(`'${stage}'`)
      }
      // The per-lead approval count has no home here any more, badge or otherwise.
      expect(SHELL_CODE, 'the retired per-lead approval count is back in the shell')
        .not.toContain('leads_awaiting')
    })

    it('⑨ the ACTUAL programme stage drives the current step, from the same endpoint as the rest', () => {
      // One source of stage truth. The home, /milla/programme and this ribbon all read
      // /my/programme, so the ribbon cannot say one thing while the Stage card says another —
      // which was the shape of the "Paused vs Proof — current" finding.
      expect(SHELL_CODE, 'the shell no longer reads the programme stage').toContain("'/my/programme'")
      expect(SHELL_CODE, 'the current step is not derived from the live stage')
        .toContain('const at = stage ? arr.indexOf(stage) : -1')
      expect(SHELL_CODE).toContain('const isCurrent = at >= 0 && i === at')
      // 🛑 AN UNKNOWN STAGE MARKS NOTHING CURRENT. Defaulting to index 0 would tell every
      // client whose read failed that they are at Proof — a claim about their programme made
      // from a network error.
      expect(SHELL_CODE, 'a failed stage read now defaults to a stage').not.toMatch(/indexOf\(stage\)\s*(?:\|\||\?\?)\s*0/)
      expect(SHELL_CODE, 'the stage is set from something other than the programme read')
        .toMatch(/if \(pr\.status === 'fulfilled'\) setStage\(pr\.value\.data\.stage\)/)
    })

    it('⑩ the ribbon keeps its design and placement — this was not a redesign', () => {
      // Same container, same numbering, same chevrons, same FLOW label, same position:
      // directly after the top bar's </header> and before the rail.
      expect(SHELL_CODE).toContain('bg-[#2a1747] text-white')
      expect(SHELL_CODE).toContain('text-[#b9a6e6] mr-2.5">FLOW<')
      expect(SHELL_CODE).toContain('{i + 1}')
      expect(SHELL_CODE).toContain('text-[#5b4785] px-0.5">›<')
      expect(SHELL_CODE.indexOf('</header>')).toBeLessThan(SHELL_CODE.indexOf('MILLA_STAGES.map'))
      expect(SHELL_CODE.indexOf('MILLA_STAGES.map')).toBeLessThan(SHELL_CODE.indexOf('<aside'))
      // The current marker reuses the ribbon's OWN existing accent — no new colour entered
      // the design to satisfy "show the current stage".
      expect(SHELL_CODE).toContain("isCurrent ? 'bg-[#EC4899]' : 'bg-[#3d2a63]'")
    })
  })

  it('② and nothing was invented to fill the corner it left', () => {
    // The fix is a REMOVAL. A "programme value" or "next payment" chip put there to balance
    // the layout would be a new visible decision nobody approved.
    for (const invented of ['programme value', 'next payment', 'amount due', 'balance']) {
      expect(SHELL_CODE.toLowerCase(), `invented top-bar copy: ${invented}`).not.toContain(invented)
    }
    // The Account dropdown keeps its position and its contents.
    expect(SHELL_CODE).toContain('Account <ChevronDown')
    expect(SHELL_CODE).toContain("['/milla/settings', 'Settings', User]")
  })
})

describe('THE HOME STATES NOTHING THAT ITS STAGE CANNOT SUPPORT', () => {
  // ⚠️ THE SHAPE OF ALL THREE. Each is a claim about OUTREACH — sending, pausing, reply
  // rates — rendered on a screen whose stage says outreach has not started. The fix in every
  // case is the GATE, never the words: no label, sentence or number below was rewritten.
  it('③ the send-state header is gated on the programme stage, not on a campaign row', () => {
    // ⚑ 4 Sep — the send-state pill moved into the ONE conversation. Same assertions, same
    // strictness, on the file that derives it.
    expect(CHAT_CODE, 'the outreach-stage gate is gone from sendState')
      .toContain("const OUTREACH_STAGES: MillaStage[] = ['Live', 'Review', 'Completion']")
    // ⛓️ TIGHTENED 3 Sep — THE GATE WAS `prog && !OUTREACH_STAGES...`, WHICH SKIPPED ITSELF
    // WHEN `prog` WAS NULL. While `/my/programme` was loading or after it failed, the guard
    // did not run and the campaign-derived labels were reached — the one moment we knew least
    // was the moment it asserted most. Unknown is now idle, and a client with NO programme is
    // idle whatever their stage says (DRAFT and none are both 'Proof'). This assertion is
    // STRICTER than the one it replaces: it requires both refusals ahead of `needsGoLive`.
    expect(CHAT_CODE, 'sendState reads campaign_status at every stage again')
      .toMatch(/if \(!prog \|\| !OUTREACH_STAGES\.includes\(prog\.stage\)\) return idle[\s\S]{0,400}?if \(prog\.hasProgramme === false\) return idle[\s\S]{0,200}?if \(needsGoLive\)/)
    // 🛑 THE CONTRADICTION ITSELF: "Paused" must be unreachable before Live. The gate returns
    // first, so the paused branch cannot be evaluated at Proof, Recommendation, Sourcing or
    // Approval — which is the whole finding.
    const from = CHAT_CODE.indexOf('const sendState = (() => {')
    const gate = CHAT_CODE.indexOf('OUTREACH_STAGES.includes(prog.stage)', from)
    // ⚠️ THE LITERAL BACKSLASH-u, because that is what the source file contains — the .tsx
    // writes the apostrophe as an escape. Searching for the decoded character finds
    // nothing, and the vacuity assertion below is what caught exactly that.
    const paused = CHAT_CODE.indexOf('Paused — we\\u2019ll tell you why', from)
    expect(from, 'sendState is gone').toBeGreaterThan(-1)
    expect(paused, 'the paused label is gone — this guard would pass vacuously').toBeGreaterThan(-1)
    expect(gate, 'the stage gate no longer precedes the paused branch').toBeGreaterThan(from)
    expect(paused, 'the paused branch can be reached before the stage gate').toBeGreaterThan(gate)
  })

  it('④ the outreach-learning card does not render before outreach exists', () => {
    // `/leads/nexus-summary` is entirely outreach performance — reply rate, meeting rate,
    // best-converting persona. Its only condition was a LIFETIME sample count, so legacy
    // history rendered message-performance learning at Proof.
    expect(HOME_CODE, 'the learning card lost its stage gate')
      .toContain('{nexus && nexus.sample_worked > 0 && prog && OUTREACH_STAGES.includes(prog.stage) && (')
  })

  it('⑤ the customer product is called a programme where the founder named it', () => {
    expect(CHAT_CODE, 'the pause chip says "campaign" again').toContain("'Please pause my programme'")
    expect(CHAT_CODE, 'the retired chip wording is back').not.toContain('Please pause my campaign')
    expect(HOME_CODE, 'the retired chip wording is back on the home').not.toContain('Please pause my campaign')
  })

  it('⑥ the wallet top-up state cannot be re-wired on the home', () => {
    // It could only ever be null once the paid approve paths went; what it rendered was a
    // wallet shortfall prompt.
    expect(HOME_CODE, 'the wallet top-up state is back on the home').not.toContain('setTopUp')
  })

  // ── ⚑ FOUNDER DECISION 3 (30 Aug) — THE CUSTOMER BOUGHT A PROGRAMME ──────────────────
  //
  // "Campaign" is OUR word for how we run the work — `figsy_campaigns` is a real internal
  // object and its name is untouched. These two labels are the only place a CUSTOMER read it
  // on this header, and they now say what the customer bought.
  it('⑪ the send-state header names the programme, not the campaign', () => {
    expect(CHAT_CODE, 'the live label reverted to "Campaign live"').toContain("label: 'Programme live'")
    expect(CHAT_CODE, 'the finished label reverted to "Campaign finished"').toContain("label: 'Programme finished'")
    // ⚠️ STRIPPED SOURCE. A comment on this same file legitimately QUOTES the retired
    // hardcoded "● Campaign live" it replaced (the history of why this widget reads real
    // state at all), so an unstripped scan binds to the explanation instead of the code.
    expect(CHAT_CODE, '"Campaign live" is back as customer-facing header copy')
      .not.toContain('Campaign live')
    expect(CHAT_CODE, '"Campaign finished" is back as customer-facing header copy')
      .not.toContain('Campaign finished')
    // 🛑 AND THE RENAME DID NOT LEAK INWARDS. The state still comes from the campaign object;
    // renaming the READ would have been the blind rename the founder ruled out.
    expect(CHAT_CODE, 'the internal campaign read was renamed along with the label')
      .toContain('const st = summary?.campaign_status')
  })

  // ── ⚑ FOUNDER DECISION 2 (30 Aug) — PROOF LEARNING STAYS HIDDEN ──────────────────────
  //
  // APPROVED AS THE ANSWER, not as a placeholder: `/leads/nexus-summary` is outreach
  // performance and is not truthful during calibration. So the guard is that nothing was
  // built to fill the gap — no Proof metric, no new sentence, no new data model in 4A-1.
  it('⑫ no Proof-stage learning metric or sentence was invented to fill the hidden card', () => {
    // The gate itself is guard ④; this is the other half — that it stayed a GATE.
    expect(HOME_CODE, 'a second learning surface appeared on the home')
      .not.toMatch(/calibration (?:score|progress|confidence)|learning (?:score|progress)/i)
    // The endpoint gained no proof branch, and the home reads no new learning field.
    const NEXUS = strip(readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8'))
    const from = NEXUS.indexOf("leadRouter.get('/nexus-summary'")
    expect(from, 'the nexus route is gone').toBeGreaterThan(-1)
    // ⛓️ TIGHTENED 4 Sep — ~~`NEXUS.slice(from, from + 2_000)`~~. A fixed BYTE window is a
    // proxy for "this route's body", and it stopped being one the moment the NEXT route grew:
    // the D2 pipeline correction pushed legitimate words ("proof", "scope") into the window and
    // failed a guard about a route that had not changed at all. Bounded to the real end of the
    // handler instead, so it asserts about `/nexus-summary` and nothing else — the assertion
    // itself is unchanged and is now harder to trip accidentally, not easier.
    const rest = NEXUS.slice(from + 1)
    const nextRoute = rest.search(/\nleadRouter\.(get|post|patch|delete)\(/)
    const body = nextRoute >= 0 ? rest.slice(0, nextRoute) : rest
    expect(body, 'a Proof/calibration branch was added to the outreach-learning endpoint')
      .not.toMatch(/proof|calibrat|stage/i)
  })
})

// ── ⚑ FOUNDER DECISION 4 (30 Aug) — THE FIRST SCREEN OF THE PRODUCT ────────────────────
//
// 🛑 A PROSPECT MET THE RETIRED ECONOMICS BEFORE THEY HAD SEEN A SINGLE PERSON. The welcome
// proposal panel read "a recommended **credit plan** here. You approve before anything
// starts." — wrong on both counts: "credit plan" is the wallet/pack model the programme
// replaced, and "You approve" is the per-lead approval it also removed.
describe('THE WELCOME PANEL STATES THE PROGRAMME, NOT THE RETIRED CREDIT MODEL', () => {
  const WELCOME = readFileSync(join(PORTAL, 'app/(milla)/milla/welcome/page.tsx'), 'utf8')
  const WELCOME_CODE = strip(WELCOME)

  it('the sweep is not vacuous — the welcome page loads and is the real file', () => {
    expect(WELCOME_CODE).toContain('export default function')
  })

  it('⑬ the approved sentence is present, word for word', () => {
    expect(WELCOME_CODE, "the founder's approved welcome copy is not on the page").toContain(
      'As we chat, Milla builds your <b>ICP</b> (who to target) and a recommended <b>programme</b> here. You&rsquo;ll review it before anything starts.')
  })

  it('⑭ the stale credit-plan copy cannot return', () => {
    expect(WELCOME_CODE, 'the retired credit-plan sentence is back on the welcome page')
      .not.toContain('credit plan')
    expect(WELCOME_CODE, 'the per-lead approval promise is back on the welcome page')
      .not.toContain('You approve before anything starts')
  })

  it('⑮ and no retired money truth came back with it', () => {
    // The panel is the FIRST thing a prospect reads. None of these may appear on it.
    for (const forbidden of ['credit plan', 'wallet', '$299', '$4', 'PACK_PRICE_USD', 'PACK_LEADS']) {
      expect(WELCOME_CODE, `retired money truth on the welcome panel: ${forbidden}`)
        .not.toContain(forbidden)
    }
  })
})
