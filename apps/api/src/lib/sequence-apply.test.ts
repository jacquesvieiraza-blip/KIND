import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { applyTokens, emailSteps, buildDraftFromSequence, buildDraftStepsFromSequence, draftToSteps, emailWaitDays, MAX_SEQUENCE_STEPS, type SequenceStep } from './sequence-apply'
import { sequencePlan, DEFAULT_SEQUENCE_DEPTH } from './sequence-templates'

const lead = { first_name: 'Lerato', last_name: 'Dlamini', company: 'Yoco', job_title: 'Head of Sales', industry: 'Fintech' }

describe('applyTokens', () => {
  it('substitutes known tokens (case/space tolerant)', () => {
    expect(applyTokens('Hi {{first_name}} at {{ COMPANY }}', lead)).toBe('Hi Lerato at Yoco')
  })
  it('falls back to "there" for a missing first name, "" for others', () => {
    expect(applyTokens('Hi {{first_name}}, re {{company}}', { first_name: '', company: '' })).toBe('Hi there, re ')
  })
  it('never leaves a raw placeholder', () => {
    expect(applyTokens('{{unknown_token}}', lead)).toBe('')
  })
  it('supports sender_company', () => {
    expect(applyTokens('We are {{sender_company}}', lead, 'K.I.N.D')).toBe('We are K.I.N.D')
  })
})

describe('emailSteps', () => {
  it('keeps only email steps, in order', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'a', body: 'b' },
      { channel: 'linkedin', body: 'x' },
      { channel: 'email', subject: 'c', body: 'd' },
    ]
    expect(emailSteps(steps).map(s => s.subject)).toEqual(['a', 'c'])
  })
})

describe('buildDraftFromSequence', () => {
  it('maps up to 3 email steps into step1/2/3 with tokens applied', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'Hi {{first_name}}', body: 'About {{company}}', wait_days: 0 },
      { channel: 'linkedin', body: 'connect' },
      { channel: 'email', subject: 'Following up', body: 'Re {{company}}', wait_days: 4 },
    ]
    const draft = buildDraftFromSequence(steps, lead)!
    expect(draft.step1).toEqual({ subject: 'Hi Lerato', body: 'About Yoco' })
    expect(draft.step2).toEqual({ subject: 'Following up', body: 'Re Yoco' })
    expect(draft.step3).toEqual({ subject: '', body: '' }) // unused slot stays empty → engine skips it
  })
  it('returns null when there are no usable email steps', () => {
    expect(buildDraftFromSequence([{ channel: 'linkedin', body: 'x' }], lead)).toBeNull()
    expect(buildDraftFromSequence([{ channel: 'email', subject: '', body: '' }], lead)).toBeNull()
  })
  it('caps at 3 email steps', () => {
    const steps: SequenceStep[] = Array.from({ length: 5 }, (_, i) => ({ channel: 'email' as const, subject: `s${i}`, body: `b${i}` }))
    const draft = buildDraftFromSequence(steps, lead)!
    expect([draft.step1.subject, draft.step2.subject, draft.step3.subject]).toEqual(['s0', 's1', 's2'])
  })
})

describe('buildDraftStepsFromSequence (#212 — full ≤10-step walk)', () => {
  it('maps every usable email step (tokens applied) with per-step cadence', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'Hi {{first_name}}', body: 'About {{company}}', wait_days: 3 },
      { channel: 'linkedin', body: 'connect' },
      { channel: 'email', subject: 'Bump {{first_name}}', body: 'Re {{company}}', wait_days: 5 },
      { channel: 'email', subject: 'Last touch', body: 'Closing out', wait_days: 7 },
    ]
    const out = buildDraftStepsFromSequence(steps, lead)
    expect(out).toHaveLength(3)
    expect(out[0]).toEqual({ subject: 'Hi Lerato', body: 'About Yoco', wait_days: 3 })
    expect(out[1]).toEqual({ subject: 'Bump Lerato', body: 'Re Yoco', wait_days: 5 })
    expect(out[2]).toEqual({ subject: 'Last touch', body: 'Closing out', wait_days: 7 })
  })
  it('defaults wait_days to 4 when unset, clamps + rounds otherwise', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'a', body: 'b' },
      { channel: 'email', subject: 'c', body: 'd', wait_days: 6.6 },
      { channel: 'email', subject: 'e', body: 'f', wait_days: -3 },
    ]
    expect(buildDraftStepsFromSequence(steps, lead).map(s => s.wait_days)).toEqual([4, 7, 0])
  })
  it('caps at MAX_SEQUENCE_STEPS email steps', () => {
    const steps: SequenceStep[] = Array.from({ length: 14 }, (_, i) => ({ channel: 'email' as const, subject: `s${i}`, body: `b${i}` }))
    const out = buildDraftStepsFromSequence(steps, lead)
    expect(out).toHaveLength(MAX_SEQUENCE_STEPS)
    expect(out[out.length - 1].subject).toBe(`s${MAX_SEQUENCE_STEPS - 1}`)
  })
  it('drops email steps missing subject or body, returns [] when none usable', () => {
    expect(buildDraftStepsFromSequence([{ channel: 'email', subject: '', body: 'x' }], lead)).toEqual([])
    expect(buildDraftStepsFromSequence([{ channel: 'linkedin', body: 'x' }], lead)).toEqual([])
  })
})

describe('draftToSteps (#212/R38 — the AI draft → full-step array, default depth 5)', () => {
  // R38 (15 Aug): "sequence and campaigns is what is the converter to meetings booked" —
  // the default was 3 emails against a ruled cap of 7; the converter ran at half depth.
  // RED PROOF: revert draftToSteps to the 3-key loop → the first pin fails by name.
  it('emits a full 5-step draft on the Day 0·4·9·14·21 cadence', () => {
    const out = draftToSteps({
      step1: { subject: 's1', body: 'b1' },
      step2: { subject: 's2', body: 'b2' },
      step3: { subject: 's3', body: 'b3' },
      step4: { subject: 's4', body: 'b4' },
      step5: { subject: 's5', body: 'b5' },
    })
    expect(out).toEqual([
      { subject: 's1', body: 'b1', wait_days: 4 },
      { subject: 's2', body: 'b2', wait_days: 5 },
      { subject: 's3', body: 'b3', wait_days: 5 },
      { subject: 's4', body: 'b4', wait_days: 7 },
      { subject: 's5', body: 'b5', wait_days: 0 },
    ])
  })
  it('the default depth stays UNDER the ruled cap — client-built sequences keep headroom', () => {
    const out = draftToSteps({
      step1: { subject: 's', body: 'b' }, step2: { subject: 's', body: 'b' },
      step3: { subject: 's', body: 'b' }, step4: { subject: 's', body: 'b' },
      step5: { subject: 's', body: 'b' },
    })
    // ⛓️ 25 Sep (R166 ⑥) — the headroom is gone by the founder's choice: the default (5) IS the
    // maximum now. What still must hold is that the default never EXCEEDS it.
    expect(out.length).toBeLessThanOrEqual(MAX_SEQUENCE_STEPS)
  })
  it('an older 3-step draft (no step4/step5) still converts — nothing stored breaks', () => {
    const out = draftToSteps({
      step1: { subject: 's1', body: 'b1' },
      step2: { subject: 's2', body: 'b2' },
      step3: { subject: 's3', body: 'b3' },
    })
    expect(out).toHaveLength(3)
  })
  it('skips empty steps', () => {
    const out = draftToSteps({
      step1: { subject: 's1', body: 'b1' },
      step2: { subject: '', body: '' },
      step3: { subject: '', body: '' },
    })
    expect(out).toHaveLength(1)
    expect(out[0].subject).toBe('s1')
  })
})

describe('R38 source pins — both generators write the 5-step sequence, threaded, one cap', () => {
  const figsy = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  const seqApply = readFileSync(join(__dirname, 'sequence-apply.ts'), 'utf8')

  // ⛓️ #651 (15 Aug) — these two pins used to grep figsy.ts for the literal "5-email
  // sequence" and `"step5"`. The prompt is no longer hard-coded: both generators now build
  // their step brief from the template engine (`sequencePlan`). The GUARANTEE is unchanged
  // and is asserted at its real source instead of at a string that moved.
  it('BOTH generators build their brief from the ONE plan engine — neither hard-codes a depth', () => {
    expect(figsy.match(/const plan = sequencePlan\(/g)?.length).toBe(2)
    expect(figsy.match(/\$\{planBlock\}/g)?.length).toBe(2)
    expect(figsy).not.toMatch(/Write a \d-email sequence:/)   // no literal depth left behind
  })
  it('the default depth is still 5, and the JSON contract follows the plan', () => {
    expect(DEFAULT_SEQUENCE_DEPTH).toBe(5)
    expect(sequencePlan({}).gaps).toEqual([4, 5, 5, 7, 0])
    // Both prompts emit exactly `plan.depth` step keys rather than a fixed list.
    expect(figsy.match(/length: plan\.depth/g)?.length).toBe(2)
  })
  it('every follow-up is threaded — including steps 4 and 5, on BOTH generator paths', () => {
    // The memory path previously skipped threading entirely; both paths now share it.
    expect(figsy.match(/threadFollowUps\(/g)?.length).toBeGreaterThanOrEqual(3) // def + 2 call sites
    // #651 — depth 7 means steps 6 and 7 must thread too, or a deep sequence breaks the thread.
    expect(figsy).toContain("'step6', 'step7'")
  })
  it('THE CAP HAS ONE HOME: sequence-apply re-exports @kind/shared, no local "= 10" (A21 class)', () => {
    // Found 15 Aug: this file declared its own MAX_SEQUENCE_STEPS = 10 while the ruled
    // cap is 7 — so the save endpoints accepted sequences activation would refuse.
    expect(seqApply).not.toMatch(/MAX_SEQUENCE_STEPS\s*=\s*\d/)
    expect(seqApply).toContain("export { MAX_SEQUENCE_STEPS } from '@kind/shared'")
    expect(MAX_SEQUENCE_STEPS).toBe(5)   // ⛓️ 25 Sep (R166 ⑥): the founder set the most emails to one person at 5 (was 7, R3/R38).
  })
})

describe('emailWaitDays', () => {
  it('returns clamped, rounded wait days per email step', () => {
    const steps: SequenceStep[] = [
      { channel: 'email', subject: 'a', body: 'b', wait_days: 0 },
      { channel: 'email', subject: 'c', body: 'd', wait_days: 4.4 },
      { channel: 'email', subject: 'e', body: 'f', wait_days: -2 },
    ]
    expect(emailWaitDays(steps)).toEqual([0, 4, 0])
  })
})
