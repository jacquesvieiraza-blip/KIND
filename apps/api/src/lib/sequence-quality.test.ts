// #612 — THE QUALITY GATE, PROVED BOTH DIRECTIONS.
//
// A linter is uniquely easy to get wrong in a way that looks right: one that flags nothing
// passes every sequence and reads as "our copy is great", and one that flags everything gets
// routed around within a week. So this file proves BOTH edges — a deliberately bad email must
// fail with each rule NAMED, and a genuinely good cold email must pass with zero hard-fails.
//
// The fourth block is the #610 lesson applied: a lint that exists but is never CALLED looks
// implemented, passes its own unit tests, and changes nothing. The wiring is asserted against
// the route source.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  lintSequence, readingGrade, syllables, wordCount, firstTwoLines, refusalMessage, MAX_STEPS,
  enrolDraftGate,
  type QualityStep,
} from './sequence-quality'
import { hasProspectToken } from './sequence-tokens'
import { stripCommentsForEnvScan } from './env-inventory'

// ── THE FIXTURES ──────────────────────────────────────────────────────────────────────────

/**
 * THE BAD ONE. Every hard rule broken at once, on purpose — this is the red proof.
 * Spammy subject · no opt-out anywhere · a link in step 1 · no personalisation in the opening
 * · a bare "just bumping" step · and step 2 landing the same day as step 1.
 */
const BAD: QualityStep[] = [
  {
    subject: 'ACT NOW — this limited time offer is 100% free and risk free, click here',
    body: 'Dear friend,\nWe are the best in the business and I wanted to reach out.\nBook a call at https://calendly.com/kind/30min and see for yourself. Guaranteed results.',
    wait_days: 0,
  },
  {
    subject: 'Bump',
    body: 'Just bumping this to the top of your inbox.',
    wait_days: 0,
  },
]

/**
 * THE GOOD ONE. A real cold email of the kind the top quartile actually sends: personal in the
 * first line, one small ask, no link, plain language, an honest way out, spaced follow-up that
 * carries a NEW angle rather than a bump.
 */
const GOOD: QualityStep[] = [
  {
    subject: '{{company}} + hiring ops',
    body: `Hi {{first_name}},\nSaw {{company}} opened two ops roles in Cape Town this month, which usually means the team is covering a lot by hand.\n\nWe find and qualify the people worth talking to, and you only pay for the ones you approve. Most teams your size see the first meetings inside three weeks.\n\nWorth a look, or is this handled?\n\nJacques\nReply "stop" and I will not write again.`,
    wait_days: 0,
  },
  {
    subject: 'One number, {{first_name}}',
    body: `Hi {{first_name}},\nOne number that might be useful either way: teams we work with approve about one in four of the people we surface, and the rest cost them nothing.\n\nThat ratio is the whole model, and it is why there is no retainer to argue about at the end of the month.\n\nIf it is not a fit, say so and I will close the file.\n\nJacques`,
    wait_days: 4,
  },
]

// ── RED PROOF ① — THE BAD FIXTURE FAILS, WITH EACH RULE NAMED ────────────────────────────
describe('the bad sequence fails, and every rule is named', () => {
  const r = lintSequence(BAD)

  it('does not pass', () => {
    expect(r.ok).toBe(false)
    expect(r.hardFails.length).toBeGreaterThan(0)
  })

  it.each([
    ['spam_vocabulary'],
    ['no_opt_out'],
    ['link_in_step_1'],
    ['no_personalisation'],
    ['empty_followup'],
    ['steps_same_day'],
  ])('names %s', rule => {
    expect(r.hardFails.map(v => v.rule)).toContain(rule)
  })

  it('every violation carries a step and a founder-plain reason', () => {
    for (const v of r.violations) {
      expect(v.why.length).toBeGreaterThan(20)
      expect(v.rule).toMatch(/^[a-z_0-9]+$/)
      if (v.step !== null) expect(v.step).toBeGreaterThan(0)
    }
  })

  it('the spam hits name the actual term found, not a generic message', () => {
    const spam = r.hardFails.filter(v => v.rule === 'spam_vocabulary').map(v => v.why.toLowerCase())
    expect(spam.some(w => w.includes('act now'))).toBe(true)
    expect(spam.some(w => w.includes('click here'))).toBe(true)
  })

  it('the refusal message says how many and what it protects', () => {
    expect(refusalMessage(r)).toMatch(/cannot go live/)
    expect(refusalMessage(r)).toMatch(/domain|reputation/)
  })
})

// ── RED PROOF ② — THE GOOD FIXTURE PASSES CLEAN ──────────────────────────────────────────
describe('a genuinely good cold email passes untouched', () => {
  const r = lintSequence(GOOD)

  it('has ZERO hard fails', () => {
    // If this ever goes red, read the violations before loosening a rule — a gate that gets
    // relaxed to fit the copy is a gate that stops meaning anything.
    expect(r.hardFails, JSON.stringify(r.hardFails, null, 2)).toEqual([])
    expect(r.ok).toBe(true)
  })

  it('names what it checked rather than passing in silence', () => {
    // The #565/#576 rule: a clean result that renders as nothing is indistinguishable from a
    // check that never ran.
    expect(r.passes.length).toBeGreaterThan(4)
    expect(r.passes.join(' ')).toMatch(/stop/)
    expect(r.passes.join(' ')).toMatch(/spam-trigger/)
  })

  it('a "following up" step that DOES carry a new angle is allowed', () => {
    const withNews: QualityStep[] = [
      GOOD[0],
      { subject: 'Following up, {{first_name}}',
        body: 'Following up on my note. Since then two teams in your sector have started with us, and both said the same thing: the approval step is what made it safe to try. That is the part I would want to show you, because it is the only part that costs you anything. Reply stop if this is not for you.',
        wait_days: 5 },
    ]
    expect(lintSequence(withNews).hardFails.map(v => v.rule)).not.toContain('empty_followup')
  })
})

// ── THE RULES, ONE AT A TIME ─────────────────────────────────────────────────────────────
describe('hard rules — each fires on its own and not otherwise', () => {
  const base = () => JSON.parse(JSON.stringify(GOOD)) as QualityStep[]

  it('an empty sequence is refused rather than passed as clean', () => {
    const r = lintSequence([])
    expect(r.ok).toBe(false)
    expect(r.hardFails[0].rule).toBe('empty_sequence')
  })

  it(`more than ${MAX_STEPS} steps fails`, () => {
    const many = Array.from({ length: MAX_STEPS + 1 }, () => ({ ...GOOD[1], wait_days: 3 }))
    many[0] = GOOD[0]
    expect(lintSequence(many).hardFails.map(v => v.rule)).toContain('too_many_steps')
  })

  it(`exactly ${MAX_STEPS} steps is allowed — the limit is a limit, not an off-by-one`, () => {
    const exact = Array.from({ length: MAX_STEPS }, () => ({ ...GOOD[1], wait_days: 3 }))
    exact[0] = GOOD[0]
    expect(lintSequence(exact).hardFails.map(v => v.rule)).not.toContain('too_many_steps')
  })

  it('an opt-out anywhere in the sequence satisfies the rule — it need not be in step 1', () => {
    const s = base()
    // Strip step 1's way out entirely; step 2 keeps "say so and I will close the file".
    s[0].body = s[0].body!.replace('Reply "stop" and I will not write again.', '')
    expect(s[0].body).not.toMatch(/stop/i)
    expect(lintSequence(s).hardFails.map(v => v.rule)).not.toContain('no_opt_out')
  })

  it('but NO opt-out in any step fails', () => {
    const s = base()
    s[0].body = s[0].body!.replace('Reply "stop" and I will not write again.', '')
    s[1].body = s[1].body!.replace('If it is not a fit, say so and I will close the file.', '')
    expect(lintSequence(s).hardFails.map(v => v.rule)).toContain('no_opt_out')
  })

  it.each([
    ['unsubscribe', 'You can unsubscribe at any time.'],
    ['opt out', 'Opt out and I will stop.'],
    ['reply stop', 'Reply "stop" and I will not write again.'],
    ['plain english', 'Say the word and I will not bother you again.'],
    ['no longer wish', 'If you no longer wish to hear from me, tell me.'],
  ])('accepts %s as an honest way out', (_label, line) => {
    const s = base()
    s[0].body = `Hi {{first_name}},\nSaw {{company}} is hiring. We find people worth talking to and you only pay for the ones you approve, which is the whole model here.\n\n${line}`
    s[1].body = 'A completely separate follow up with a genuinely new angle about the approval ratio and what it means for the monthly cost of the whole thing being predictable.'
    expect(lintSequence(s).hardFails.map(v => v.rule)).not.toContain('no_opt_out')
  })

  it('personalisation must be about THE PROSPECT, not about us', () => {
    const s = base()
    // Only sender tokens in the opening — this is the trap the shared token contract exists for.
    s[0].subject = 'A note'
    s[0].body = s[0].body!.replace('Hi {{first_name}},', 'Hi there,').replace('{{company}}', '{{sender_company}}')
    expect(lintSequence(s).hardFails.map(v => v.rule)).toContain('no_personalisation')
  })

  it('a token in the SUBJECT counts as personalisation even if the body opens plainly', () => {
    const s = base()
    s[0].body = s[0].body!.replace('Hi {{first_name}},', 'Hi there,').replace('{{company}} opened', 'the team opened')
    expect(s[0].subject).toContain('{{company}}')
    expect(lintSequence(s).hardFails.map(v => v.rule)).not.toContain('no_personalisation')
  })

  it.each([
    ['a bare url', 'Take a look at https://kind.com/demo'],
    ['a www address', 'See www.trykind.org for the details'],
    ['a booking token', 'Grab a slot: {{booking_url}}'],
    ['a markdown link', 'Here is [the deck](https://x.com/deck)'],
    ['an attachment', 'I have attached a one-pager for you'],
  ])('refuses %s in step 1', (_label, line) => {
    const s = base()
    s[0].body = `${s[0].body}\n${line}`
    expect(lintSequence(s).hardFails.map(v => v.rule)).toContain('link_in_step_1')
  })

  it('a link in a LATER step is fine — the rule is about the first touch only', () => {
    const s = base()
    s[1].body = `${s[1].body}\nHere is the detail: https://trykind.org/how-it-works`
    expect(lintSequence(s).hardFails.map(v => v.rule)).not.toContain('link_in_step_1')
  })

  it('"e.g." and "i.e." are not mistaken for domains', () => {
    const s = base()
    s[0].body = s[0].body!.replace('Saw', 'Saw, e.g. in the ops team i.e. the one hiring,')
    expect(lintSequence(s).hardFails.map(v => v.rule)).not.toContain('link_in_step_1')
  })

  it('a follow-up on day 0 fails; step 1 on day 0 does not', () => {
    const s = base()
    expect(s[0].wait_days).toBe(0)
    expect(lintSequence(s).hardFails.map(v => v.rule)).not.toContain('steps_same_day')
    s[1].wait_days = 0
    expect(lintSequence(s).hardFails.map(v => v.rule)).toContain('steps_same_day')
  })
})

describe('warnings advise, they never block', () => {
  it('a warn-only sequence still activates', () => {
    const s = JSON.parse(JSON.stringify(GOOD)) as QualityStep[]
    s[0].subject = 'A really quite long subject line about several different things at once'
    const r = lintSequence(s)
    expect(r.warnings.map(v => v.rule)).toContain('subject_too_long')
    expect(r.ok).toBe(true)           // ← the whole point: style never stops a send
  })

  it('flags a too-short and a too-long body', () => {
    const short = lintSequence([{ subject: '{{company}}', body: 'Hi {{first_name}}, worth a look? Reply stop to opt out.', wait_days: 0 }])
    expect(short.warnings.map(v => v.rule)).toContain('body_length')
  })

  it('flags more than one ask', () => {
    const s = JSON.parse(JSON.stringify(GOOD)) as QualityStep[]
    s[0].body = s[0].body!.replace('Worth a look, or is this handled?', 'Worth a look? Are you the right person? Would you like me to send the detail?')
    expect(lintSequence(s).warnings.map(v => v.rule)).toContain('multiple_ctas')
  })

  it('flags consultancy prose and passes plain English', () => {
    const dense = 'Notwithstanding the aforementioned considerations, our organisation facilitates comprehensive optimisation of procurement infrastructure, leveraging sophisticated methodologies which substantially accelerate operational transformation initiatives across multinational enterprise environments.'
    expect(readingGrade(dense)).toBeGreaterThan(8)
    expect(readingGrade('Saw you are hiring. We find people worth talking to. You pay only for the ones you like.')).toBeLessThanOrEqual(8)
  })

  it.each([
    ['I hope this finds you well. '],
    ['I wanted to reach out about something. '],
    ['Quick question for you. '],
  ])('flags the weak opener %s', opener => {
    const s = JSON.parse(JSON.stringify(GOOD)) as QualityStep[]
    s[0].body = opener + s[0].body
    expect(lintSequence(s).warnings.map(v => v.rule)).toContain('weak_opener')
  })
})

describe('the text helpers behave', () => {
  it('counts a merge token as one word, not as punctuation', () => {
    expect(wordCount('Hi {{first_name}}, saw {{company}} hiring')).toBe(5)
  })

  it('takes the first two NON-EMPTY lines', () => {
    expect(firstTwoLines('\n\nHi there\n\nSecond line\nThird line')).toBe('Hi there\nSecond line')
  })

  it('counts syllables well enough to grade', () => {
    expect(syllables('the')).toBe(1)
    expect(syllables('hiring')).toBe(2)
    expect(syllables('opportunity')).toBeGreaterThanOrEqual(4)
  })

  it('an empty body grades 0 rather than dividing by zero', () => {
    expect(readingGrade('')).toBe(0)
  })

  it('the prospect-token contract excludes sender tokens', () => {
    expect(hasProspectToken('Hi {{first_name}}')).toBe(true)
    expect(hasProspectToken('From {{sender_name}} at {{sender_company}}')).toBe(false)
  })
})

// ── RED PROOF ④ — THE WIRING. A lint nothing calls looks implemented. ────────────────────
describe('the gate is CALLED, not merely available', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))

  it('the sequence save path lints', () => {
    expect(src).toContain('lintSequence')
  })

  it('ALL THREE activation paths refuse on hard fails', () => {
    // `sequenceGateFor` is the one helper every activation route calls.
    //
    // ⚠️ COUNTS `await sequenceGateFor(`, NOT `sequenceGateFor(` — and that distinction is the
    // whole test. The first version counted the bare name, which also matches the function's
    // own DEFINITION, so `>= 3` was satisfied by 1 definition + 2 calls: deleting a gate from
    // a live route left the test green. Found by red-proving rather than by reading it, which
    // is the only reason it is right now.
    const calls = src.split('await sequenceGateFor(').length - 1
    expect(calls, 'every activation path must ask the gate — /campaign/save, /campaign/:id/status and /campaign/start').toBe(3)
  })

  it('refuses with 422 and hands back the violations, not just a message', () => {
    // A refusal that says "no" without saying which rules broke sends the operator back to
    // guess. Every gate site must return both.
    const gateBlocks = src.split('await sequenceGateFor(').slice(1)
    expect(gateBlocks).toHaveLength(3)
    for (const block of gateBlocks) {
      const near = block.slice(0, 300)
      expect(near).toContain('422')
      expect(near).toContain('violations')
    }
  })

  it('PAUSING is never gated — stopping bad copy must stay one click away', () => {
    const statusRoute = src.indexOf("operatorRouter.post('/campaign/:id/status'")
    const body = src.slice(statusRoute, statusRoute + 1200)
    expect(body).toContain("status === 'active'")
  })

  it('FIGSY\'s own draft is linted before it is returned', () => {
    const suggest = src.indexOf("operatorRouter.post('/sequence/suggest'")
    const nextRoute = src.indexOf('operatorRouter.', suggest + 10)
    expect(suggest).toBeGreaterThan(-1)
    expect(src.slice(suggest, nextRoute)).toContain('lintSequence')
  })
})

// ═══ #612 PART B ═══════════════════════════════════════════════════════════════════════════
//
// Part A gated templates and the drafts an operator READS. It did not gate the copy stored on
// the enrollment — which is the row the send loop actually emails from. Found by verifying the
// shipped PR, not by anything going red: a green gate said nothing about the enrol path.

describe('rendered mode — the trap that would have skipped every single lead', () => {
  // `generateSequence` writes copy against ONE real person, so there are no {{tokens}} left.
  // Judged by the TEMPLATE rules, every draft the product writes fails on `no_personalisation`
  // — 100% of leads skipped, reported as a copy problem. This block is the proof that does not
  // happen.
  //
  // ⚠️ THE FIXTURE MOVED ON 5 AUG, AND WHY MATTERS. It used to carry the booking link in STEP 1,
  // because our own prompt ordered one there and the linter exempted it. The founder ruled the
  // other way (Option A): the prompt stopped asking, the exemption is gone, and a booking link
  // in a first touch is now an ordinary hard fail. So the link moved to step 2 — the fixture has
  // to stay a genuinely GOOD example of what the product writes, not a historical one.
  const BOOKING = 'https://cal.kind.com/b/abc123'
  const LEAD = { first_name: 'Sarah', last_name: 'Nkosi', job_title: 'Head of Ops', company: 'Rivo' }

  const realDraft: QualityStep[] = [
    { subject: 'Rivo + hiring ops',
      body: `Hi Sarah,\nSaw Rivo opened two ops roles this month, which usually means the team is covering a lot by hand.\n\nWe find and qualify the people worth talking to, and you only pay for the ones you approve.\n\nWorth a look, or is this handled?\n\nJacques\nReply stop and I will not write again.`,
      wait_days: 0 },
    { subject: 'One number, Sarah',
      body: `Hi Sarah, one number that might be useful either way: teams we work with approve about one in four of the people we surface, and the rest cost them nothing at all. That ratio is the whole model and it is why there is no retainer to argue about.\n\nIf it is worth a look, grab a slot:\n${BOOKING}`,
      wait_days: 4 },
  ]

  it('TEMPLATE rules reject this correct copy — the bug, proved', () => {
    // The tokens have already been replaced by the time this copy exists, so the template rule
    // sees a blast. (It no longer also trips `link_in_step_1` — since the 5 Aug ruling the
    // fixture carries no step-1 link, because the product no longer writes one.)
    const wrong = lintSequence(realDraft)
    expect(wrong.ok).toBe(false)
    expect(wrong.hardFails.map(v => v.rule)).toContain('no_personalisation')
  })

  it('RENDERED rules accept it — same copy, right question', () => {
    const r = lintSequence(realDraft, { mode: 'rendered', renderedFor: LEAD })
    expect(r.hardFails, JSON.stringify(r.hardFails, null, 2)).toEqual([])
    expect(r.ok).toBe(true)
  })

  // ── THE 5 AUG RULING, PINNED ────────────────────────────────────────────────────────────
  //
  // This test used to assert the OPPOSITE: that a booking link in step 1 was allowed through as
  // a `booking_link_in_step_1` WARN. That was not a bug — it was a deliberate exemption with a
  // "ruling owed" note, because our own prompt ordered the link into step 1 and enforcing the
  // rule would have skipped every lead. **The founder ruled the gate was right and the prompt
  // was wrong** (Option A, 5 Aug): *"the first email's job is to earn a reply, not a booking."*
  //
  // Recorded rather than silently inverted, so the next reader does not conclude the old
  // behaviour was a mistake. It was a superseded decision.
  it('a booking link in step 1 is now an ORDINARY HARD FAIL — the exemption is gone', () => {
    const withLinkInStep1 = JSON.parse(JSON.stringify(realDraft)) as QualityStep[]
    withLinkInStep1[0].body = `${withLinkInStep1[0].body}\n\nGrab a slot if useful:\n${BOOKING}`
    const r = lintSequence(withLinkInStep1, { mode: 'rendered', renderedFor: LEAD })
    expect(r.ok).toBe(false)
    expect(r.hardFails.map(v => v.rule)).toContain('link_in_step_1')
  })

  it('the booking_link_in_step_1 rule no longer exists in ANY report the linter can produce', () => {
    // An exemption left behind as a dormant warn is an invitation to re-introduce it.
    const withLinkInStep1 = JSON.parse(JSON.stringify(realDraft)) as QualityStep[]
    withLinkInStep1[0].body = `${withLinkInStep1[0].body}\n${BOOKING}`
    for (const report of [
      lintSequence(realDraft, { mode: 'rendered', renderedFor: LEAD }),
      lintSequence(withLinkInStep1, { mode: 'rendered', renderedFor: LEAD }),
      lintSequence(realDraft),
      lintSequence(GOOD),
      lintSequence(BAD),
    ]) {
      expect(report.violations.map(v => v.rule)).not.toContain('booking_link_in_step_1')
    }
    // And the rule name is gone from the source, not merely unreachable.
    const src = stripCommentsForEnvScan(readFileSync(join(__dirname, './sequence-quality.ts'), 'utf8'))
    expect(src).not.toContain("'booking_link_in_step_1'")
  })

  it('the booking link in a LATER step is still fine — the ruling was about the first touch only', () => {
    const r = lintSequence(realDraft, { mode: 'rendered', renderedFor: LEAD })
    expect(r.hardFails, JSON.stringify(r.hardFails, null, 2)).toEqual([])
    expect(realDraft[1].body).toContain(BOOKING)
  })

  it('a link that is NOT the booking url still hard-fails in rendered mode', () => {
    const s = JSON.parse(JSON.stringify(realDraft)) as QualityStep[]
    s[0].body = `${s[0].body}\nAlso see https://some-other-site.com/deck`
    expect(lintSequence(s, { mode: 'rendered', renderedFor: LEAD }).hardFails.map(v => v.rule))
      .toContain('link_in_step_1')
  })

  it('rendered copy that never names the person still fails', () => {
    const s = JSON.parse(JSON.stringify(realDraft)) as QualityStep[]
    s[0].subject = 'A note'
    s[0].body = s[0].body!.replace('Hi Sarah,', 'Hi there,').replace('Saw Rivo opened', 'Saw you opened')
    expect(lintSequence(s, { mode: 'rendered', renderedFor: LEAD }).hardFails.map(v => v.rule))
      .toContain('no_personalisation')
  })

  it('every other rule is unchanged by the mode — spam and opt-out still bite', () => {
    const s = JSON.parse(JSON.stringify(realDraft)) as QualityStep[]
    s[0].body = s[0].body!.replace('Reply stop and I will not write again.', 'Act now, this is a limited time offer.')
    s[1].body = 'Just bumping this.'
    const r = lintSequence(s, { mode: 'rendered', renderedFor: LEAD })
    const rules = r.hardFails.map(v => v.rule)
    expect(rules).toContain('spam_vocabulary')
    expect(rules).toContain('no_opt_out')
    expect(rules).toContain('empty_followup')
  })

  it('a one-letter name cannot prove personalisation', () => {
    const s = JSON.parse(JSON.stringify(realDraft)) as QualityStep[]
    s[0].subject = 'A note'
    s[0].body = 'Hi there,\nA generic opening with no detail at all about who this is for.\n\nReply stop to opt out.'
    expect(lintSequence(s, { mode: 'rendered', renderedFor: { first_name: 'A', company: 'X' } }).hardFails.map(v => v.rule))
      .toContain('no_personalisation')
  })
})

describe('enrolDraftGate — the decision the enrol loop makes per lead', () => {
  const LEAD = { first_name: 'Sarah', company: 'Rivo' }
  const good: QualityStep[] = [
    { subject: 'Rivo + ops', body: 'Hi Sarah,\nSaw Rivo is hiring in ops, which usually means a lot is being covered by hand right now.\n\nWe find the people worth talking to and you pay only for the ones you approve.\n\nWorth a look?\n\nReply stop and I will not write again.', wait_days: 0 },
  ]
  const bad: QualityStep[] = [
    { subject: 'ACT NOW limited time', body: 'Dear friend, click here to buy now.', wait_days: 0 },
  ]

  it('allows good rendered copy', () => {
    expect(enrolDraftGate({ steps: good, renderedFor: LEAD, isDemo: false }).allow).toBe(true)
  })

  it('refuses bad copy and NAMES the rules', () => {
    const v = enrolDraftGate({ steps: bad, renderedFor: LEAD, isDemo: false })
    expect(v.allow).toBe(false)
    if (!v.allow) {
      expect(v.rules).toContain('spam_vocabulary')
      expect(v.rules).toContain('no_opt_out')
      expect(v.reason).toMatch(/^copy_rejected:/)
    }
  })

  it('de-duplicates the rules — one broken rule is one problem, not four', () => {
    const v = enrolDraftGate({ steps: bad, renderedFor: LEAD, isDemo: false })
    if (!v.allow) expect(v.rules.length).toBe(new Set(v.rules).size)
  })

  // ── RED PROOF ④ — THE DEMO PATH IS UNTOUCHED ────────────────────────────────────────────
  it('DEMO is exempt — even copy this bad enrols, because a demo can never send', () => {
    // #453 leaves `next_send_at` null on demo enrollments so the cron never fires them, and
    // #329 already settled that breaking the demo removes the sales tool. Exempting a path
    // that cannot reach a human costs nothing.
    expect(enrolDraftGate({ steps: bad, renderedFor: LEAD, isDemo: true }).allow).toBe(true)
  })
})

// ── RED PROOF ③ — THE ENROL-SITE WIRING ─────────────────────────────────────────────────
describe('the enrol loops actually call the gate', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8'))

  it('BOTH enrol loops gate the draft', () => {
    const calls = src.split('enrolDraftGate({').length - 1
    expect(calls, 'both enrol paths must gate — one covered and one not is not a gate').toBe(4)
  })

  it('the gate runs BEFORE the charge — no credit taken for a lead we then refuse', () => {
    // The money rule. A charge-then-refuse churns the ledger for copy we already knew was bad.
    //
    // ⚠️ SCOPED TO EACH LOOP BODY, NOT TO THE WHOLE FILE. The first version split on
    // `enrolDraftGate({` and compared indexes in slices that ran to the end of the source — so
    // when I moved the charge ABOVE the gate to red-prove it, the comparison found the OTHER
    // loop's charge hundreds of lines later and stayed green. An ordering assertion has to be
    // bounded by the thing whose order it is asserting.
    const bodies: string[] = []
    let from = 0
    for (;;) {
      const start = src.indexOf('let didCharge = false', from)
      if (start === -1) break
      const charge = src.indexOf('chargeFigsyEnroll', start)
      expect(charge, 'every enrol body reaches the charge').toBeGreaterThan(start)
      bodies.push(src.slice(start, charge))
      from = charge
    }
    expect(bodies, 'both enrol loops found').toHaveLength(2)
    for (const body of bodies) {
      expect(body, 'the gate must sit between the draft and the charge').toContain('enrolDraftGate({')
      expect(body, 'a refused lead is skipped before any money moves').toContain('noteSkip(')
    }
  })

  it('a refused lead is skipped with a NAMED reason, never silently', () => {
    expect(src).toContain('noteSkip(skipReasons, verdict.reason)')
    expect(src).toContain('skip_reasons: skipReasons')
  })

  it('the applied-sequence branch is NOT per-lead gated — it is already gated at save and activation', () => {
    expect(src).toContain('if (!appliedSequence) {')
  })
})

// ── RED PROOF ② — THE GATE JUDGES WHAT WILL ACTUALLY SEND ───────────────────────────────
describe('the activation gate reads the APPLIED sequence, not the newest saved one', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/operator.ts'), 'utf8'))

  it('reads the campaign settings first and falls back to the newest row', () => {
    const fn = src.slice(src.indexOf('async function sequenceGateFor'), src.indexOf('async function sequenceGateFor') + 1400)
    expect(fn).toContain('figsy_campaigns')
    expect(fn).toContain('sequence')
    const campaignRead = fn.indexOf('figsy_campaigns')
    const fallback = fn.indexOf('figsy_sequences')
    expect(campaignRead).toBeLessThan(fallback)
  })

  it('the two routes that KNOW the campaign pass it', () => {
    expect(src).toContain('sequenceGateFor(client.id, b.campaign_id as string | undefined)')
    expect(src).toContain('sequenceGateFor(client.id, req.params.id)')
  })

  it('/campaign/start has no campaign yet, so it asks without one', () => {
    const start = src.indexOf("post('/campaign/start'")
    const next = src.indexOf('operatorRouter.', start + 10)
    expect(src.slice(start, next)).toContain('sequenceGateFor(client.id)')
  })
})

// ── THE 5 AUG RULING, ENFORCED AT THE SOURCE ─────────────────────────────────────────────
//
// The gate refusing a step-1 link is only half the ruling. The other half is that the product
// must stop WRITING one — otherwise every draft hard-fails, the enrol path regenerates once and
// then skips the lead, and send-day produces zero enrolments instead of emails.
describe('generateSequence no longer asks for a link in the first touch', () => {
  // #651 (15 Aug) — the per-step brief moved OUT of figsy.ts into the template engine, so
  // this guard reads both homes. That makes it stronger, not weaker: the 5 Aug ruling must
  // hold wherever the instruction lives, and a future third home would have to be added
  // here to pass.
  const src = [
    stripCommentsForEnvScan(readFileSync(join(__dirname, './figsy.ts'), 'utf8')),
    stripCommentsForEnvScan(readFileSync(join(__dirname, './sequence-templates.ts'), 'utf8')),
  ].join('\n')

  it('neither system prompt instructs a step-1 booking link', () => {
    // Both phrasings the two prompt sites used, verbatim.
    expect(src).not.toContain('invite them to grab a 15-minute slot and include this exact booking link')
    expect(src).not.toContain('invite them to book a 15-min slot and include this exact link')
  })

  it('step 1 asks for an INTEREST-based CTA and says why, in the prompt itself', () => {
    // The instruction carries its own reason: an LLM told "no link" without a reason is one
    // rewrite away from helpfully adding one back.
    expect(src).toContain('INTEREST-BASED CTA')
    expect(src).toMatch(/NO LINK, NO ATTACHMENT AND NO BOOKING ASK/)
  })

  it('a LATER step still carries the link — the ruling was about the first touch only', () => {
    // #651 made this purpose-aware: the meeting brief still offers the link on a later step
    // and the event brief puts the RSVP link on step 2. What must never happen is step 1.
    expect(src).toMatch(/If a link is appropriate for a step \(never step 1\)/)
    expect(src).toMatch(/now include the joining\/RSVP link/i)
  })
})

// ⚠️ AN HONEST LIMIT, RECORDED RATHER THAN ASSUMED (#612 Part C, 5 Aug).
//
// When a draft is refused twice the lead is skipped and the reason is counted into
// `skip_reasons` on the enrol response — `copy_rejected:link_in_step_1`. That is the right
// shape: named, never silent.
//
// **But nothing renders it.** A grep of `apps/portal` and `apps/admin` for `skip_reasons`
// returns ZERO hits, and the enrol endpoints are machine-facing (the CSV import and the
// webhook), so the count reaches an HTTP response nobody reads.
//
// So on send-day a systematic refusal would look like "no enrolments happened" rather than
// "every draft was refused for this rule". The reason exists in the response and in the server
// log; it does not exist on a screen. Surfacing it is a follow-up, not something this PR
// pretends to have done.
describe('the skip reason exists in the response, and is NOT on any screen', () => {
  it('the enrol response carries skip_reasons', () => {
    const routes = stripCommentsForEnvScan(readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8'))
    expect(routes).toContain('skip_reasons: skipReasons')
  })

  it('and this test exists to record that no UI reads it yet', () => {
    // If someone builds that surface, this assertion is the breadcrumb telling them the data
    // was already there — and it should be deleted in the same PR that renders it.
    expect(true).toBe(true)
  })
})
