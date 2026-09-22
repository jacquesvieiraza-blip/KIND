// ══════════════════════════════════════════════════════════════════════════════════════════
// AN ANSWER WE CANNOT USE IS A QUESTION MILLA HAS NOT FINISHED ASKING — founder-locked 22 Sep
//
// ── THE DEFECT, AND IT WAS SILENT ───────────────────────────────────────────────────────
//
// A fact counted as HELD the moment it was a non-empty string: `company_size:
// joined(input.companySizes)`. Nothing asked whether those words could become a provider
// value. So a client who answered *"a few dozen people"* or *"whoever runs ops"* finished the
// Brief at eleven of eleven — and then:
//
//   · `deriveProviderReview` could place neither on a closed list, so `icp_review` was set;
//   · `runIcpJob` THROWS while a review is outstanding — *"nothing may be sourced against it
//     until an operator has reviewed it"* — above the reservation, the ledger and the lead;
//   · so there was no provider call, no leads and no Proof, and nothing on the client's
//     screen said why.
//
// 🛑 AND THE QUEUE THAT IS MEANT TO RESCUE THEM HAS NO SCREEN. Promotion writes an
// `icp_review_pending` operator task and `programme-lifecycle.ts` records that it is *"read by
// no surface in Vida"*.
//
// 🛑 THIS SHAPE HAS ALREADY COST SEVEN CLIENTS IN A ROW in the neighbouring field.
// `icp-provider-translation.ts`: Northstar Operations Studio said *"professional services"*,
// the industry list had no such string, a review was owed, **no search was ever made**, and
// seven of the last seven attempts ended the same way. Teaching the translator real words
// shortened that queue; it did not abolish it, and seniority and size still reach it from a
// perfectly ordinary sentence.
//
// ── THE RULING, AND THE LOCK IT AMENDS ──────────────────────────────────────────────────
//
// ⛓️ `s1-runtime-batch.test.ts` held the opposite: *"THE CLIENT NEVER SPEAKS APOLLO — an
// un-normalisable company size still completes"*, because *"our provider vocabulary must not
// refuse the client their Brief"*.
//
// 🛑 FOUNDER-LOCKED 22 Sep, ON THE QUESTION ASKED DIRECTLY: **Milla asks again.** That lock's
// purpose is kept and served better — refusing the client their PROOF for the same reason,
// silently, is the same refusal wearing a later timestamp. One clarifying question, asked of
// the only person who can answer it, while they are still in the conversation, is not our
// vocabulary refusing them.
//
// ⚠️ AND THE OTHER HALF OF THAT LOCK IS UNTOUCHED AND STILL PROVED THERE: the client's phrase
// is never smuggled into a provider filter. Nothing here writes a value anywhere.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { onboardingState, unmappableTargetingFacts } from './onboarding-state'
import { briefDraftFacts } from '@kind/shared'

/** Everything a Brief needs, so a single fact can be the only thing outstanding. */
const COMPLETE = {
  contact_name: 'Jacques', company_name: 'Redmayne Partners', website: 'redmayne.co.uk',
  what_they_do: 'operations consultancy', target_category: 'professional-services firms',
  geographies: ['United Kingdom'], target_company_type: 'consultancies',
  company_sizes: ['11–50'], job_titles: ['Managing Director'],
  exclusions: 'no direct competitors', desired_outcome: 'book meetings',
} as Record<string, unknown>

const held = (facts: Record<string, unknown>) =>
  briefDraftFacts(facts as never, unmappableTargetingFacts(facts as never))

describe('a size we cannot place on the ladder leaves the fact outstanding', () => {
  it('🛑 "a few dozen people" does not complete the Brief', () => {
    const r = held({ ...COMPLETE, company_sizes: ['a few dozen people'] })
    expect(r.missing, 'the Brief completed on a size that maps to no band').toContain('company_size')
    expect(r.complete).toBe(false)
  })

  it('and the state agrees, so Milla keeps the conversation open', () => {
    const s = onboardingState({ ...COMPLETE, company_sizes: ['a few dozen people'] } as never)
    expect(s.state, 'the client was handed to an operator queue mid-sentence').toBe('conversing')
    expect(s.unresolvedLabels).toContain('Company size')
  })

  it('a size that DOES map is held, exactly as before', () => {
    const r = held({ ...COMPLETE, company_sizes: ['11–50'] })
    expect(r.missing).not.toContain('company_size')
    expect(r.complete).toBe(true)
  })

  it('a MIXED answer is held — one usable band is a usable answer', () => {
    // ⚠️ NOT ALL-OR-NOTHING. `translateProviderList` keeps what it could place and reports the
    // rest; a client who said "11–50, and a few bigger ones" has told us something we can
    // search on, and re-asking them would be pedantry rather than care.
    const r = held({ ...COMPLETE, company_sizes: ['11–50', 'and a few bigger ones'] })
    expect(r.missing).not.toContain('company_size')
  })
})

describe('the same rule for who to reach, and only when seniority is carrying the fact', () => {
  it('🛑 seniority alone, in words we cannot place, leaves target roles outstanding', () => {
    const r = held({ ...COMPLETE, job_titles: [], seniority_levels: ['whoever runs ops'] })
    expect(r.missing, 'the Brief completed on a seniority that maps to nothing')
      .toContain('target_roles')
  })

  it('but a JOB TITLE answers it whatever the seniority says — titles need no translation', () => {
    // Apollo takes free-text titles. "Managing Director" is already the thing we send, so
    // there is nothing to fail to map and nothing to re-ask.
    const r = held({ ...COMPLETE, job_titles: ['Managing Director'], seniority_levels: ['whoever runs ops'] })
    expect(r.missing).not.toContain('target_roles')
  })

  it('and seniority in OUR words is held, exactly as before', () => {
    const r = held({ ...COMPLETE, job_titles: [], seniority_levels: ['C-Suite'] })
    expect(r.missing).not.toContain('target_roles')
  })
})

describe('what this rule deliberately does NOT reach', () => {
  it('the client\'s own category is never re-asked for failing to match our sixteen', () => {
    // 🛑 THE OPPOSITE DECISION, AND IT IS ALREADY MADE. `promotion.ts`: almost no client's own
    // category is one of our sixteen, so owing a review on it would make "every single signup
    // become an operator task — a Needs-you list with everybody on it". The category is
    // canonicalised where it can be and used to ORDER results where it cannot. Re-asking
    // "professional-services firms" until it becomes "Consulting" would be teaching the
    // client our vocabulary, which is exactly what this product does not do.
    const r = held({ ...COMPLETE, target_category: 'professional-services firms' })
    expect(r.missing, 'the client is being made to guess our industry list')
      .not.toContain('target_category')
    expect(r.complete).toBe(true)
  })

  it('silence is still silence — an unstated fact is missing, not unmappable', () => {
    const r = held({ ...COMPLETE, company_sizes: [] })
    expect(r.missing).toContain('company_size')
    expect(unmappableTargetingFacts({ ...COMPLETE, company_sizes: [] } as never))
      .not.toContain('company_size')
  })

  it('and a Brief in our own words is untouched end to end', () => {
    const r = held(COMPLETE)
    expect(r.missing).toEqual([])
    expect(r.complete).toBe(true)
  })
})

describe('the rule is pure, and only reports', () => {
  it('it names the facts it could not use, and translates nothing', () => {
    expect(unmappableTargetingFacts({ ...COMPLETE, company_sizes: ['smallish'] } as never))
      .toEqual(['company_size'])
    expect(unmappableTargetingFacts({
      ...COMPLETE, company_sizes: ['smallish'], job_titles: [], seniority_levels: ['the boss'],
    } as never).sort()).toEqual(['company_size', 'target_roles'])
    expect(unmappableTargetingFacts(COMPLETE as never)).toEqual([])
  })

  it('an empty brief reports nothing unmappable — there is nothing to fail on', () => {
    expect(unmappableTargetingFacts({} as never)).toEqual([])
  })

  it('🛑 and it never puts the client\'s phrase anywhere near a provider value', () => {
    // The other half of the lock this amends, asserted here too so the two cannot drift: the
    // rule REPORTS. It returns fact ids, never values, so there is nothing for it to smuggle.
    const out = unmappableTargetingFacts({ ...COMPLETE, company_sizes: ['small to mid-sized'] } as never)
    expect(out).toEqual(['company_size'])
    expect(JSON.stringify(out), "the client's own phrase came back out of the rule")
      .not.toContain('small to mid-sized')
  })
})
