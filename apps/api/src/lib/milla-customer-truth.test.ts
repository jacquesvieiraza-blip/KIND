// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD-004A-2 — WHAT MILLA TELLS A CUSTOMER, AND WHAT SHE NO LONGER TEACHES.
//
// 🛑 THE PATTERN THIS SUITE EXISTS FOR, THREE WALKS RUNNING. Every guard in the repo was
// green each time the founder opened the deployed product and found retired truth on his own
// screen. Not because the guards were weak — because they asserted about the FILES that had
// been rebuilt, while the retired model survived in the places nobody had re-aimed a test at:
// a shared shell, a summary endpoint, and — this time — the system prompt that puts words in
// Milla's mouth.
//
// A guard that only ever says "the old screen is gone" cannot tell a rebuilt product from a
// deleted one, and it says nothing at all about a sentence generated at runtime.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { MILLA_STAGES, STAGE_QUICK_ACTION } from '@kind/shared'
import { briefIsRepeat, composeBrief, londonDay, londonWeekStart } from './morning-brief'
import { buildMillaChatSystem, PROGRAMME_LIFECYCLE, LIFECYCLE_RULES } from './milla-chat-system'

const REPO   = join(__dirname, '../../../..')
const PORTAL = join(REPO, 'apps/portal/src')
const API    = join(REPO, 'apps/api/src')

/** Strip line comments — every guard here is about CODE, and these files explain at length
 *  what they replaced, quoting the retired strings verbatim while doing it. */
const strip = (s: string) => s.split('\n')
  .filter(l => {
    const t = l.trim()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*')
  }).join('\n')

const read = (p: string) => readFileSync(p, 'utf8')
const code = (p: string) => strip(read(p))

// ════════════════════════════════════════════════════════════════════════════════════════
describe('§1 — MILLA CANNOT TEACH THE RETIRED MODEL IN HER OWN VOICE', () => {
  const PROMPT = code(join(API, 'lib/milla-chat-system.ts'))

  it('the sweep is not vacuous — the prompt builder loads and is the real file', () => {
    expect(PROMPT).toContain('export function buildMillaChatSystem')
  })

  it('🛑 she is never given a wallet, a pack or a per-lead price to quote', () => {
    // These were not hallucinations on the founder's walk. Each was a literal string in this
    // file, handed to the model on every single answer.
    for (const retired of ['wallet_balance_usd', 'PACK_PRICE_USD', 'PACK_LEADS', 'LEAD_PRICE_USD']) {
      expect(PROMPT, `the prompt builder reads retired money truth: ${retired}`)
        .not.toContain(retired)
    }
    // And the snapshot interface cannot carry them back in by widening.
    const iface = PROMPT.slice(PROMPT.indexOf('export interface MillaSnapshot'))
      .slice(0, PROMPT.slice(PROMPT.indexOf('export interface MillaSnapshot')).indexOf('}') + 1)
    for (const field of ['wallet_balance_usd', 'leads_awaiting', 'leads_approved_total', 'pack', 'spend_usd']) {
      expect(iface, `retired field back on the chat snapshot: ${field}`).not.toContain(field)
    }
  })

  it('🛑 she cannot send a customer to the retired approval desk', () => {
    // "the New leads page" is the exact answer the founder was given.
    expect(PROMPT).toContain('There is no "New leads" page and no approval queue')
  })

  it('she reads the programme from the SAME reader the workspace does', () => {
    // One reader, two doors. A second reader is a second truth — which is precisely the
    // shape of the 4A-1 finding (a campaign row saying "Paused" beside a programme at Proof).
    expect(PROMPT).toContain("from './customer-programme'")
    // ⛓️ 18 Sep (D-63) — ~~`for (const door of ['routes/milla.ts', 'lib/milla.ts'])`~~. The
    // stateless `POST /milla/chat` was the second door and it is unmounted, so the loop now
    // has one member — and a one-member loop hiding a withdrawn surface is exactly the stale
    // green tick XC-9 exists to refuse. The reader requirement is stated for the door that
    // survives, and the withdrawal of the other is asserted rather than inferred.
    expect(code(join(API, 'lib/milla.ts')), 'the desk chat does not read the customer programme')
      .toContain('readCustomerProgramme')
    expect(code(join(API, 'routes/milla.ts')), 'a second Milla door reads the programme again')
      .not.toContain('readCustomerProgramme')
  })

  it('🛑 an unreadable programme is never rendered as "you have no programme"', () => {
    // The single most damaging sentence available to a client who has paid.
    expect(PROMPT).toContain('do NOT say they have no programme')
    // And the reader that feeds it distinguishes the two states at source.
    const READER = code(join(API, 'lib/customer-programme.ts'))
    expect(READER, 'a failed read is collapsed into "no programme"')
      .toMatch(/if \(error\) \{[\s\S]{0,220}?return null/)
    // ⛓️ RETARGETED 10 Sep (C03) — THE SAME DUTY, ONE FIELD RICHER. This pinned
    // `if (!data) return NO_PROGRAMME`, and the duty is *a genuinely absent programme is
    // Proof, not an error*. It still is — the constant is still what is returned — but the
    // client's STATED OUTCOME is now read onto it, because `NO_PROGRAMME` is a constant and
    // carried `stated: null` for everybody. That is precisely the path every client in Proof
    // takes, and why the OUTCOME card was empty for a client who had just stated one.
    // ⛓️ RESHAPED 10 Sep (A), SAME DUTY. The no-programme path now reads TWO client-level
    // facts together — the stated outcome (C03) and whether Proof is finished — because a
    // client who accepted their set is at the calculator, not still at Proof. The property
    // under test is unchanged: this path reads the outcome from CLIENTS rather than from a
    // programme that does not exist.
    expect(READER).toContain('readStatedOutcomeFor(clientId), proofCompleteFor(clientId),')
    expect(READER).toContain('outcome: { ...NO_PROGRAMME.outcome, stated },')
    expect(READER).toContain("stage: millaStage({ status: null, proofComplete }),")
  })

  it('historical conversations are not rewritten to clean up the wording', () => {
    // 🛑 THE FIX IS WHAT SHE SAYS NEXT. A stored message is the record of what we told them
    // then; editing it would make the product lie about its own history.
    for (const f of ['lib/milla-chat-system.ts', 'lib/milla.ts', 'lib/customer-programme.ts']) {
      const src = code(join(API, f))
      expect(src, `${f} mutates stored conversation rows`)
        .not.toMatch(/from\('milla_messages'\)[\s\S]{0,200}?\.(update|delete)\(/)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// §1b — THE ORDERED LIFECYCLE (31 Aug live walk).
//
// 🛑 THE DEFECT WAS A GAP, NOT A FALSEHOOD. Milla was given the stage ORDER in one paragraph
// and the payment RULE in another, with nothing mapping the payments onto the order. Both
// sentences were true; the join between them was missing, so she interpolated and told the
// founder we "move into sourcing and outreach" and that outreach follows approval which
// follows Proof.
//
// ⚠️ THESE GUARDS ASSERT ORDER BY INDEX, NOT PRESENCE. Every step could appear in the prompt
// in the wrong sequence and a `toContain` sweep would stay green — which is precisely how a
// list of true sentences produced a false answer.
describe('§1b — THE PROGRAMME LIFECYCLE IS ORDERED, AND ITS GATES ARE DISTINCT', () => {
  const sys = buildMillaChatSystem(null, null)
  /** Where each step's text starts inside the assembled prompt. -1 if absent. */
  const at = (needle: string) => sys.indexOf(needle)

  it('the sweep is not vacuous — the lifecycle really is in the assembled prompt', () => {
    expect(sys).toContain('THE PROGRAMME LIFECYCLE, IN ORDER')
    for (const step of PROGRAMME_LIFECYCLE) {
      expect(sys, `a lifecycle step is missing from the prompt: ${step.slice(0, 24)}…`).toContain(step)
    }
    for (const rule of LIFECYCLE_RULES) {
      expect(sys, `a sequencing rule is missing: ${rule.slice(0, 24)}…`).toContain(rule)
    }
  })

  it('🛑 the founder-locked order holds, step by step', () => {
    // Proof → Recommendation → Payment 1 → Sourcing/preparation → client review →
    // ONE approval → Payment 2 → Live/outreach.
    const order = [
      '1. PROOF', '2. RECOMMENDATION', '3. PAYMENT 1', '4. SOURCING / PREPARATION',
      '5. THE CLIENT REVIEWS', '6. APPROVAL', '7. PAYMENT 2', '8. LIVE',
    ]
    for (const label of order) expect(at(label), `missing lifecycle step: ${label}`).toBeGreaterThan(-1)
    for (let i = 1; i < order.length; i++) {
      expect(at(order[i]), `${order[i]} does not follow ${order[i - 1]}`)
        .toBeGreaterThan(at(order[i - 1]))
    }
  })

  it('🛑 SOURCING AND OUTREACH ARE TWO GATES, NOT ONE TRANSITION', () => {
    // The exact false sentence: "we'll move into sourcing and outreach".
    expect(sys).toContain('SOURCING AND OUTREACH ARE NOT THE SAME TRANSITION and never begin together')
    expect(sys).toContain('Never say we "move into sourcing and outreach"')
    // Payment 1 authorises sourcing ONLY; Payment 2 is what authorises outreach.
    expect(sys).toMatch(/PAYMENT 1 — the first 50%\. It authorises SOURCING AND PREPARATION ONLY/)
    expect(sys).toMatch(/PAYMENT 2 — the remaining 50%[\s\S]{0,80}?THIS is what authorises outreach/)
    // And four steps genuinely sit between them in the text.
    expect(at('7. PAYMENT 2') - at('3. PAYMENT 1')).toBeGreaterThan(0)
    for (const between of ['4. SOURCING / PREPARATION', '5. THE CLIENT REVIEWS', '6. APPROVAL']) {
      expect(at(between)).toBeGreaterThan(at('3. PAYMENT 1'))
      expect(at(between)).toBeLessThan(at('7. PAYMENT 2'))
    }
  })

  it('🛑 APPROVAL DOES NOT FOLLOW PROOF', () => {
    expect(sys).toContain('APPROVAL DOES NOT FOLLOW PROOF')
    // Three gates sit between them, and the prompt says which.
    for (const between of ['2. RECOMMENDATION', '3. PAYMENT 1', '4. SOURCING / PREPARATION', '5. THE CLIENT REVIEWS']) {
      expect(at(between), `${between} is not placed between Proof and Approval`)
        .toBeGreaterThan(at('1. PROOF'))
      expect(at(between)).toBeLessThan(at('6. APPROVAL'))
    }
  })

  it('🛑 PAYMENT 2 IS NEVER DESCRIBED WITHOUT WHAT PRECEDES IT', () => {
    expect(sys).toContain('NEVER DESCRIBE PAYMENT 2 OR OUTREACH WITHOUT THE STEPS THAT PRECEDE THEM')
    expect(sys).toMatch(/name Payment 1, sourcing\/preparation and the approval that come first/)
  })

  it('🛑 NOTHING IS CONTACTED BEFORE PAYMENT 2 — including after Payment 1', () => {
    expect(sys).toContain('NOTHING IS CONTACTED BEFORE PAYMENT 2')
    expect(sys).toMatch(/Not during Proof, not after Payment 1, not during sourcing/)
    // Payment 1's own step says it too, so the rule is not the only place it is stated.
    expect(sys).toMatch(/No outreach is authorised by it and nobody is contacted after it/)
  })

  it('the client\'s REVIEW of the prepared work is not the Review STAGE', () => {
    // 🛑 THE TRAP IN THIS SEQUENCE. Step 5 is the client reading what we prepared, before
    // approving. The `Review` stage is a hold on an already-LIVE programme. Merging them is
    // the same class of error as merging sourcing and outreach.
    expect(sys).toContain('This is NOT the "Review" stage, which is a hold raised later on an already-live programme')
  })

  it('the per-client payment lines name the SAME steps as the lifecycle', () => {
    // Two vocabularies for one gate is how the 4A-1 walk produced "Paused" beside "Proof".
    const PROMPT = code(join(API, 'lib/milla-chat-system.ts'))
    expect(PROMPT).toContain('Payment 1 (step 3 — authorises sourcing and preparation only)')
    expect(PROMPT).toContain('Payment 2 (step 7 — after the programme approval at step 6; authorises outreach)')
  })

  it('and the ROI answer that PASSED is not regressed', () => {
    // The House walk got this right: Proof recognised, no target invented, no CPL, no wallet.
    expect(sys).toMatch(/Judge the work by the OUTCOME/)
    expect(sys).toMatch(/never by cost per lead or leads approved/)
    const proofish = buildMillaChatSystem(null, null)
    expect(proofish).toContain('do NOT say they have no programme')
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('§2 — THE SUGGESTION CHIPS KNOW WHAT STAGE THE CLIENT IS IN', () => {
  const HOME = code(join(PORTAL, 'app/(milla)/milla/page.tsx'))
  // ⚑ 4 Sep — RETARGETED, NOT RELAXED. The chip row moved out of the home and into the ONE
  // shell-owned conversation; every assertion below is the same string on the file that now
  // owns it. The home is asserted separately to hold NO second copy, which the old form could
  // not check at all — a duplicate chip row in another file would have passed it.
  const CHAT = code(join(PORTAL, 'components/milla/MillaConversation.tsx'))

  it('🛑 THE HOME DOES NOT OWN A SECOND CHIP ROW', () => {
    for (const dup of ['const chips =', 'PROOF_CHIPS', 'STAGE_QUICK_ACTION[', 'const sendState =']) {
      expect(HOME, `the home still builds its own "${dup}" beside the shell's conversation`).not.toContain(dup)
    }
  })

  it('the stage-specific chip is the founder-approved per-stage wording, not new copy', () => {
    // 🛑 NOTHING IS INVENTED HERE. `STAGE_QUICK_ACTION` is the founder's verbatim per-stage
    // conversation accelerator, already approved for exactly this job.
    expect(CHAT).toContain('STAGE_QUICK_ACTION[prog.stage]')
    expect(CHAT).toMatch(/import \{[^}]*STAGE_QUICK_ACTION[^}]*\} from '@kind\/shared'/)
    // Every stage has one, so no stage can render an empty chip.
    for (const stage of MILLA_STAGES) {
      expect(STAGE_QUICK_ACTION[stage], `no approved chip wording for ${stage}`).toBeTruthy()
    }
  })

  it('the calibration chips are offered at Proof AND ONLY WHEN A SET IS ON THE DESK', () => {
    // The live account sat at Recommendation being asked "Which of these look strongest?" —
    // a question about a proof set it no longer has.
    //
    // ⛓️ TIGHTENED 3 Sep — ~~`...(prog.stage === 'Proof' ? PROOF_CHIPS : [])`~~. The stage
    // guard was necessary and not sufficient: House IS at Proof and has NO set, and was
    // offered all three example chips on the founder's clean-baseline walk. The fact that
    // matters is what is ON THE DESK, not where the programme is — so the condition now
    // carries both, and `STAGE_QUICK_ACTION.Proof` ("Show me stronger examples") is inside
    // the same gate because it names examples too.
    expect(CHAT).toContain("...(prog.stage === 'Proof' && proofSetOnDesk ? PROOF_CHIPS : [])")
    // ⛓️ 24 Sep (R145 step 3b · #26) — the Proof quick action ("Show me stronger examples") is no
    // longer offered as TEXT at all: sent to Milla it asked a chat that cannot source. Its place is
    // the redesign's "Show me another twenty", which runs the panel's own server-gated action and
    // is offered only with a set on the desk AND while the server offers that action.
    expect(CHAT).toContain("...(prog.stage === 'Proof' ? [] : [STAGE_QUICK_ACTION[prog.stage]])")
    expect(CHAT).toContain("...(prog.stage === 'Proof' && proofSetOnDesk && deskActions?.anotherSample ? [CHIP_ANOTHER] : [])")
    expect(CHAT).toContain("'Which of these look strongest?'")
    // 🛑 AND THE DESK FACT IS THE SERVER'S, not a guess from a stage or a spinner.
    expect(CHAT).toContain('summary?.calibration_set_on_desk')
  })

  it('🛑 AN EMPTY CHIP ROW DOES NOT RENDER AS AN EMPTY ROW', () => {
    // Zero honest chips is the right answer for a desk with nothing on it; a bordered strip
    // with no buttons in it is not, and would read as a broken layout on the one screen whose
    // job is to look calm.
    // ⛓️ 24 Sep (R145 — the redesign, founder: *"match everything. colors everything."*): the chip row is now the redesign's quickbar, still rendered only when there
    // are chips (and, as before, not in ICP context).
    expect(CHAT).toContain('chips.length > 0 && (')
  })

  it('🛑 THE EMPTY PROOF DESK POINTS SOMEWHERE, and it does it in approved words', () => {
    // "Nothing to react to right now." is true and stays for every other case. At Proof it is
    // a dead end on the one screen meant to start the conversation, so the per-stage sentence
    // the programme workspace already renders is reused — no new copy is written here.
    expect(HOME).toContain("prog?.stage === 'Proof' ? nextActionFor(prog) : 'Nothing to react to right now.'")
    const ws = readFileSync(join(PORTAL, 'components/milla/ProgrammeWorkspace.tsx'), 'utf8')
    // ⛓️ RETARGETED 10 Sep (C03) — THE APPROVED SENTENCE IS STILL THERE, ON THE BRANCH
    // WHERE IT IS TRUE. It used to be unconditional, so a client who had stated their
    // outcome during onboarding was asked for it again on their own home screen. It now
    // guards the case where we genuinely have nothing, which is the only case it ever
    // described. The duty — the empty Proof desk points somewhere, in approved words — is
    // unchanged, and the words are unchanged.
    expect(ws, 'the approved sentence is gone').toContain("'Tell Milla the outcome you want'")
    expect(ws, 'the sentence is asked unconditionally again').not.toContain("case 'Proof':          return 'Tell Milla the outcome you want'")
  })

  it('🛑 THE EMPTY PROOF DESK POINTS SOMEWHERE, and it does it in approved words', () => {
    // "Nothing to react to right now." is true and stays for every other case. At Proof it is
    // a dead end on the one screen meant to start the conversation, so the per-stage sentence
    // the programme workspace already renders is reused — no new copy is written here.
    expect(HOME).toContain("prog?.stage === 'Proof' ? nextActionFor(prog) : 'Nothing to react to right now.'")
    const ws = readFileSync(join(PORTAL, 'components/milla/ProgrammeWorkspace.tsx'), 'utf8')
    // ⛓️ RETARGETED 10 Sep (C03) — THE APPROVED SENTENCE IS STILL THERE, ON THE BRANCH
    // WHERE IT IS TRUE. It used to be unconditional, so a client who had stated their
    // outcome during onboarding was asked for it again on their own home screen. It now
    // guards the case where we genuinely have nothing, which is the only case it ever
    // described. The duty — the empty Proof desk points somewhere, in approved words — is
    // unchanged, and the words are unchanged.
    expect(ws, 'the approved sentence is gone').toContain("'Tell Milla the outcome you want'")
    expect(ws, 'the sentence is asked unconditionally again').not.toContain("case 'Proof':          return 'Tell Milla the outcome you want'")
  })

  it('pause and ROI are offered only where they are contextually valid', () => {
    // Offering "pause my programme" at Proof invites pausing something that does not exist;
    // offering ROI before anything has been sent asks for a return on nothing.
    expect(CHAT).toContain("const PAUSE_STAGES: MillaStage[] = ['Sourcing', 'Approval', 'Live', 'Review']")
    expect(CHAT).toContain("const ROI_STAGES:   MillaStage[] = ['Live', 'Review', 'Completion']")
  })

  it('an unknown stage falls back to the flat list rather than flickering', () => {
    expect(CHAT).toContain('const chips = !prog ? CHIPS : [')
  })

  it('the row renders the DERIVED list, not the constant', () => {
    // 🛑 THE WHOLE FIX IS ONE IDENTIFIER AT THE RENDER SITE. Building `chips` and then
    // mapping `CHIPS` would leave the live behaviour exactly as the founder found it, with
    // every guard above still green.
    expect(CHAT, 'the chip row still renders the flat constant').toContain('{chips.map(c =>')
    expect(CHAT, 'the chip row still renders the flat constant').not.toContain('{CHIPS.map(c =>')
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('§3 — ONE PIECE OF NEWS IS NOT THREE MESSAGES', () => {
  const DELIVER = code(join(API, 'lib/morning-brief-deliver.ts'))

  // ── ⛓️ CORRECTED BEFORE MERGE (GPT review) — THE WINDOW IS THE WHOLE FIX ──────────────
  //
  // 🛑 MY FIRST CUT WAS GLOBAL CONTENT-ONLY, and it traded one defect for a worse one. It
  // suppressed the real duplicate — three days of one week each saying "2 meetings booked
  // this week" — and ALSO suppressed a legitimate Week-2 brief that truthfully reported 2
  // again. Content-only dedup does not decay: the client would never hear that number again
  // until it changed. Suppressing a client's real news is a larger harm than repeating it.
  //
  // These two assertions are the pair. Neither is meaningful without the other, and the
  // second one is the one my implementation failed.
  describe('the repeat window is ONE LONDON WEEK — the period the fact belongs to', () => {
    const WEEK_1_MON = new Date('2026-08-17T09:00:00Z')
    const WEEK_1_WED = new Date('2026-08-19T09:00:00Z')
    const WEEK_2_MON = new Date('2026-08-24T09:00:00Z')
    const text = composeBrief({ meetingsThisWeek: 2 })!
    const weekStart = (at: Date) => londonDay(londonWeekStart(at))

    it('the fixture is real — this is the exact sentence the founder saw three times', () => {
      expect(text).toBe("Morning. 2 meetings booked this week — they're in your Meetings tab.")
      // And the two dates really are in different London weeks, or the pair below proves nothing.
      expect(weekStart(WEEK_1_MON)).toBe(weekStart(WEEK_1_WED))
      expect(weekStart(WEEK_2_MON)).not.toBe(weekStart(WEEK_1_MON))
    })

    it('③ SUPPRESSED: the same sentence again inside the same week is one piece of news', () => {
      const monday = { content: text, day: londonDay(WEEK_1_MON) }
      expect(briefIsRepeat(text, monday, weekStart(WEEK_1_WED)), 'Wednesday repeated Monday')
        .toBe(true)
    })

    it('④ ALLOWED: the same sentence in a LATER week is a new, true statement', () => {
      // 🛑 THE ASSERTION MY IMPLEMENTATION FAILED. Two meetings in week 2 is not week 1's news.
      const lastWeek = { content: text, day: londonDay(WEEK_1_WED) }
      expect(briefIsRepeat(text, lastWeek, weekStart(WEEK_2_MON)), 'a truthful week-2 brief was suppressed')
        .toBe(false)
    })

    it('different news in the same week always goes out', () => {
      const monday = { content: text, day: londonDay(WEEK_1_MON) }
      const three = composeBrief({ meetingsThisWeek: 3 })!
      expect(briefIsRepeat(three, monday, weekStart(WEEK_1_WED))).toBe(false)
    })

    it('FAILS OPEN: an unknown or malformed stamp never suppresses', () => {
      // Withholding real news on a stamp we cannot read is the larger harm.
      for (const day of [null, '', 'yesterday', '2026-8-1']) {
        expect(briefIsRepeat(text, { content: text, day }, weekStart(WEEK_1_WED)),
          `a ${JSON.stringify(day)} stamp suppressed a brief`).toBe(false)
      }
      expect(briefIsRepeat(text, null, weekStart(WEEK_1_WED))).toBe(false)
    })

    it('the deliverer passes the CURRENT week start, not a rolling window', () => {
      expect(DELIVER).toContain('briefIsRepeat(text, prev, londonDay(londonWeekStart(now)))')
      // And it reads the stamp it compares against, rather than assuming one.
      expect(DELIVER).toContain(".select('content, sources')")
    })
  })

  it('a brief identical to the last one is not posted again', () => {
    // 🛑 THE MISMATCH: the uniqueness key is (client, kind, DAY) while the fact reported is
    // WEEKLY. Monday, Tuesday and Wednesday each composed a byte-identical sentence, each
    // passed the per-day index, and each posted. Three "news" messages, one piece of news.
    expect(DELIVER).toContain(".eq('sources->>kind', BRIEF_KIND)")
    expect(DELIVER).toMatch(/briefIsRepeat\([\s\S]{0,120}?status: 'skipped'/)
    // 🛑 AND IT IS NOT GLOBAL CONTENT-ONLY. That shape suppresses a truthful later week
    // forever — the defect GPT's review caught in my first cut.
    expect(DELIVER, 'the dedupe compares content with no period window')
      .not.toMatch(/\.content === text/)
  })

  it('the per-day index is still the race guarantee — this is a test in front of it', () => {
    // The cheap content check must not replace the database guarantee two simultaneous tabs
    // rely on.
    expect(DELIVER).toContain("if ((insErr as { code?: string }).code === '23505') return { status: 'exists', day }")
  })

  it('and no historical message is deleted or edited to tidy the thread', () => {
    expect(DELIVER, 'the brief deliverer mutates stored conversation rows')
      .not.toMatch(/from\('milla_messages'\)[\s\S]{0,200}?\.(update|delete)\(/)
  })

  it('no migration was added for this', () => {
    // The founder ruled: stop first if one appears necessary. It did not.
    const pending = read(join(API, 'lib/pending-migrations.ts'))
    expect(pending).not.toContain('20260830')
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('EVERYTHING 4A-1 FIXED IS STILL FIXED', () => {
  const HOME  = code(join(PORTAL, 'app/(milla)/milla/page.tsx'))
  const SHELL = code(join(PORTAL, 'components/milla/MillaShell.tsx'))

  it('the FLOW bar is still sourced from MILLA_STAGES', () => {
    /* ⛓️ 16 Sep (MVP1 · B1) — RE-POINTED. These isolation guards prove the Milla FLOW ribbon
       still exists and was not collateral damage; the CONSTANT it maps changed from
       `MILLA_STAGES` (seven, starting at Proof) to the canonical `MVP1_MILLA_STAGES` (six,
       starting at Brief) — the same module Vida's ribbon now reads, so one client has one
       position in both consoles. The duty asserted here is unchanged. */
    expect(SHELL).toContain('{MVP1_MILLA_STAGES.map((label, i, arr) => {')
    expect(SHELL).toContain("'/my/programme'")
  })

  it('the wallet is still gone from the shell', () => {
    expect(SHELL).not.toMatch(/wallet/i)
  })

  it('the Proof calibration mechanics are untouched', () => {
    for (const control of ['👍 Looks right', 'Not a fit', 'Tell Milla why']) {
      expect(HOME, `the calibration control "${control}" is gone`).toContain(control)
    }
    // ⛓️ 22 Sep — ~~`expect(HOME).toContain('proofExhausted &&')`~~. Refinement is unlimited
    // (founder-locked, "2. unlimited now"), so there is no exhausted state to render. What
    // this case is about — the calibration controls are still there and no PAID path came
    // back with them — is asserted above and below, unchanged.
    expect(HOME, 'a proof-exhausted wall came back').not.toContain('proofExhausted &&')
    expect(HOME, 'a paid approve path is back on the home').not.toContain('/leads/approve-batch')
  })

  it('and the customer product is still called a programme where it was renamed', () => {
    // ⚑ 4 Sep — the chip and the send-state label moved with the conversation; the renaming
    // they prove is unchanged, and this now reads the file that renders them.
    const CHAT = code(join(PORTAL, 'components/milla/MillaConversation.tsx'))
    expect(CHAT).toContain("'Please pause my programme'")
    expect(CHAT).toContain("label: 'Programme live'")
  })
})
