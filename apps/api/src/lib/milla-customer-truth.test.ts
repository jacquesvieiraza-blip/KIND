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
    for (const door of ['routes/milla.ts', 'lib/milla.ts']) {
      expect(code(join(API, door)), `${door} does not read the customer programme`)
        .toContain('readCustomerProgramme')
    }
  })

  it('🛑 an unreadable programme is never rendered as "you have no programme"', () => {
    // The single most damaging sentence available to a client who has paid.
    expect(PROMPT).toContain('do NOT say they have no programme')
    // And the reader that feeds it distinguishes the two states at source.
    const READER = code(join(API, 'lib/customer-programme.ts'))
    expect(READER, 'a failed read is collapsed into "no programme"')
      .toMatch(/if \(error\) \{[\s\S]{0,220}?return null/)
    expect(READER).toContain('if (!data) return NO_PROGRAMME')
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
describe('§2 — THE SUGGESTION CHIPS KNOW WHAT STAGE THE CLIENT IS IN', () => {
  const HOME = code(join(PORTAL, 'app/(milla)/milla/page.tsx'))

  it('the stage-specific chip is the founder-approved per-stage wording, not new copy', () => {
    // 🛑 NOTHING IS INVENTED HERE. `STAGE_QUICK_ACTION` is the founder's verbatim per-stage
    // conversation accelerator, already approved for exactly this job.
    expect(HOME).toContain('STAGE_QUICK_ACTION[prog.stage]')
    expect(HOME).toMatch(/import \{[^}]*STAGE_QUICK_ACTION[^}]*\} from '@kind\/shared'/)
    // Every stage has one, so no stage can render an empty chip.
    for (const stage of MILLA_STAGES) {
      expect(STAGE_QUICK_ACTION[stage], `no approved chip wording for ${stage}`).toBeTruthy()
    }
  })

  it('the calibration chips are offered at Proof and nowhere else', () => {
    // The live account sat at Recommendation being asked "Which of these look strongest?" —
    // a question about a proof set it no longer has.
    expect(HOME).toContain("...(prog.stage === 'Proof' ? PROOF_CHIPS : [])")
    expect(HOME).toContain("'Which of these look strongest?'")
  })

  it('pause and ROI are offered only where they are contextually valid', () => {
    // Offering "pause my programme" at Proof invites pausing something that does not exist;
    // offering ROI before anything has been sent asks for a return on nothing.
    expect(HOME).toContain("const PAUSE_STAGES: MillaStage[] = ['Sourcing', 'Approval', 'Live', 'Review']")
    expect(HOME).toContain("const ROI_STAGES:   MillaStage[] = ['Live', 'Review', 'Completion']")
  })

  it('an unknown stage falls back to the flat list rather than flickering', () => {
    expect(HOME).toContain('const chips = !prog ? CHIPS : [')
  })

  it('the row renders the DERIVED list, not the constant', () => {
    // 🛑 THE WHOLE FIX IS ONE IDENTIFIER AT THE RENDER SITE. Building `chips` and then
    // mapping `CHIPS` would leave the live behaviour exactly as the founder found it, with
    // every guard above still green.
    expect(HOME, 'the chip row still renders the flat constant').toContain('{chips.map(c =>')
    expect(HOME, 'the chip row still renders the flat constant').not.toContain('{CHIPS.map(c =>')
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
    expect(SHELL).toContain('{MILLA_STAGES.map((label, i, arr) => {')
    expect(SHELL).toContain("'/my/programme'")
  })

  it('the wallet is still gone from the shell', () => {
    expect(SHELL).not.toMatch(/wallet/i)
  })

  it('the Proof calibration mechanics are untouched', () => {
    for (const control of ['👍 Looks right', 'Not a fit', 'Tell Milla why']) {
      expect(HOME, `the calibration control "${control}" is gone`).toContain(control)
    }
    expect(HOME).toContain('proofExhausted &&')
    expect(HOME, 'a paid approve path is back on the home').not.toContain('/leads/approve-batch')
  })

  it('and the customer product is still called a programme where it was renamed', () => {
    expect(HOME).toContain("'Please pause my programme'")
    expect(HOME).toContain("label: 'Programme live'")
  })
})
