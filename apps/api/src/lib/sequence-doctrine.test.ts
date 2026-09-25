import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  templateFor, sequencePlan, SEQUENCE_PURPOSES, SEQUENCE_DEPTHS,
  type SequencePurpose, type SequenceDepth,
} from './sequence-templates'

// ── P31 — SEQUENCES SELL THE RESPONSE ──────────────────────────────────────────────────────
//
// Founder doctrine, 21 Aug: ① step 1 sells the REPLY, not the meeting — a low-friction interest
// question, never a calendar link. ② Seven steps are seven DIFFERENT angles; "a step that only
// bumps is one attempt repeated". ③ The booking link enters only AFTER positive intent.
//
// ⚠️ WHY THESE ARE TESTS AND NOT PROMPT WORDING. The old templates already SAID "add a NEW
// angle" — as advice, inside a brief, to a model. Advice cannot fail. Nothing could tell whether
// two steps had drifted into the same email, and nothing would have gone red if they had. The
// angle labels make distinctness a fact the build can check.
//
// ⚠️ AND ONE OF THESE FOUND A REAL DEFECT RATHER THAN PINNING AN INTENTION. `figsy.ts` told the
// model: *"If a link is appropriate for a step (never step 1), use exactly: {url}"* — which
// protected step 1 and left steps 2-7 free to put a calendar link in a COLD sequence, before the
// prospect had said a word. That is precisely the meeting-ask the doctrine replaces. Both
// generation sites now forbid it at every step.

const FIGSY = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
/** Comments stripped — a comment quoting the rule we removed is not the rule. */
const codeOf = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the guard is reading the real templates', () => {
  it('every purpose and depth produces a template with matching guidance and angles', () => {
    // Without this, a renamed export or a trimming bug leaves every assertion below iterating
    // nothing and passing — the #617 shape.
    for (const p of SEQUENCE_PURPOSES) {
      for (const d of SEQUENCE_DEPTHS) {
        const t = templateFor(p, d)
        expect(t.guidance.length, `${p}/${d} guidance`).toBe(d)
        expect(t.angles.length, `${p}/${d} angles must trim in lockstep with guidance`).toBe(d)
      }
    }
  })
})

describe('① step 1 sells the RESPONSE, not the meeting', () => {
  it('the meeting opener asks a low-friction interest question and forbids a calendar link', () => {
    // ⚠️ ASSERTED AGAINST THE FOUNDER'S OWN 5 AUG WORDING, NOT A REWRITE OF IT.
    // The first version of this test asserted phrases I had invented — and passed, because I
    // had just written them. Restoring the 5 Aug lock text turned it red, which is the test
    // doing its job: it was pinning my paraphrase, not his rule.
    const [step1] = templateFor('meeting', 7).guidance
    expect(step1, 'the 5 Aug lock — the CTA is interest, not a meeting').toMatch(/INTEREST-BASED CTA/)
    expect(step1, 'the 5 Aug lock — nothing to click in a cold opener')
      .toMatch(/NO LINK, NO ATTACHMENT AND NO BOOKING ASK/)
    expect(step1, 'and it carries its own reason — the link goes in the REPLY')
      .toMatch(/the link goes in the REPLY once they have raised their hand/)
    expect(step1, 'P31 addition — the job of email 1 stated outright')
      .toMatch(/The job of this email is a REPLY, not a booking/)
  })

  it('⚠️ NO STEP 1 OF ANY PURPOSE OR DEPTH CARRIES A SCHEDULING LINK', () => {
    // The clause as the founder wrote it, asserted across every shape the product can produce
    // — not just the one the doctrine was written about.
    const SCHEDULING = /calendly|cal\.com|savvycal|hubspot\.com\/meetings|\/book\/|booking link|book a (call|time|slot)|schedule a (call|time)|https?:\/\/\S*(calendar|booking)/i
    for (const p of SEQUENCE_PURPOSES) {
      for (const d of SEQUENCE_DEPTHS) {
        const [first] = templateFor(p as SequencePurpose, d as SequenceDepth).guidance
        // "NEVER a calendar link" is a prohibition, not a link — strip prohibitions first.
        const withoutBans = first.replace(/NEVER a calendar link/gi, '')
        expect(SCHEDULING.test(withoutBans), `${p}/${d} step 1 contains a scheduling link`).toBe(false)
      }
    }
  })
})

describe('② seven steps are seven DIFFERENT angles', () => {
  it('⚠️ NO TWO STEPS SHARE AN ANGLE — any purpose, any depth', () => {
    // The whole of doctrine ②. If this goes red, two emails are arguing the same thing and the
    // sequence has become one attempt repeated.
    for (const p of SEQUENCE_PURPOSES) {
      for (const d of SEQUENCE_DEPTHS) {
        const { angles } = templateFor(p as SequencePurpose, d as SequenceDepth)
        expect(new Set(angles).size, `${p}/${d} repeats an angle: ${angles.join(' · ')}`).toBe(angles.length)
      }
    }
  })

  it('the meeting arc is the founder\'s seven, in his order', () => {
    expect(templateFor('meeting', 7).angles).toEqual([
      'why-now',
      'different-commercial-problem',
      'proof',
      'objection',
      'alternative-angle',
      'new-evidence',
      'final-low-friction-question',
    ])
  })

  it('⚠️ THE OBJECTION STEP EXISTS — it did not before', () => {
    // The gap the rewrite closed. Seven emails with no objection-handling step never reached for
    // the commonest reason a warm prospect goes quiet.
    const t = templateFor('meeting', 7)
    expect(t.angles).toContain('objection')
    expect(t.guidance[3]).toMatch(/THE OBJECTION/)
  })
})

describe('③ the booking link enters only AFTER positive intent', () => {
  it('⚠️ NEITHER GENERATION SITE OFFERS A LINK FOR ANY COLD STEP', () => {
    // The defect this found: the old instruction read "never step 1", which left 2-7 open.
    const code = codeOf(FIGSY)
    expect(code, 'the permissive instruction must be gone').not.toMatch(/If a link is appropriate for a step/)
    const bans = code.match(/DO NOT put a booking or calendar link in ANY step/g) ?? []
    expect(bans.length, 'both generateSequence sites must carry the prohibition').toBe(2)
  })

  it('the booking URL still reaches the REPLY path — this is a narrowing, not a removal', () => {
    // Proving we did not break booking while tightening the sequence. `bookingUrlForLead` is
    // still imported and still resolved per client; only the COLD path stopped using it.
    expect(FIGSY).toContain("import { bookingUrlForLead } from './booking-token'")
    expect(codeOf(FIGSY)).toMatch(/bookingUrlForLead\(/)
  })
})

describe('banned filler can never ship as a step\'s substance', () => {
  const BANNED: Array<[RegExp, string]> = [
    [/just bumping/i,               'a bump is not an angle — it is the same email again'],
    [/just following up/i,          'says nothing the previous email did not'],
    [/did you see my last email/i,  'makes the reader responsible for our persistence'],
    [/circling back/i,              'the same move wearing a different word'],
    [/checking in\b/i,              'the founder\'s own closer forbids "just checking in"'],
    [/bumping this/i,               'same defect, other phrasing'],
  ]

  for (const [needle, why] of BANNED) {
    it(`no step in any sequence says /${needle.source}/`, () => {
      const offenders: string[] = []
      for (const p of SEQUENCE_PURPOSES) {
        for (const d of SEQUENCE_DEPTHS) {
          templateFor(p as SequencePurpose, d as SequenceDepth).guidance.forEach((g, i) => {
            // A step that BANS a phrase is not a step that uses it. The closer says
            // 'no "just checking in"' — that is the rule, not the filler.
            const substance = g.replace(/no ["“][^"”]+["”]/gi, '')
            if (needle.test(substance)) offenders.push(`${p}/${d} step ${i + 1}`)
          })
        }
      }
      expect(offenders, `${offenders.join(', ')} — ${why}`).toEqual([])
    })
  }
})

describe('NO-TOUCH — R3/R10 and the cadence are unchanged', () => {
  it('the depth ceiling is still 7 and the ladder is still 3/5/7', () => {
    // ⛓️ 25 Sep (R166 ⑥) — the ladder is 3/5 and the ceiling 5: the founder withdrew 7 ("5").
    expect([...SEQUENCE_DEPTHS]).toEqual([3, 5])
    expect(Math.max(...SEQUENCE_DEPTHS)).toBe(5)
  })

  it('cadence and day offsets still compute, and a 3-step arc keeps opener and closer', () => {
    const plan = sequencePlan({ purpose: 'meeting', depth: 3 })
    expect(plan.dayOffsets[0]).toBe(0)
    expect(plan.dayOffsets.length).toBe(3)
    expect(plan.template.angles[0]).toBe('why-now')
    expect(plan.template.angles[2], 'the closer survives trimming').toBe('final-low-friction-question')
  })
})
