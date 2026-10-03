// R191 ① 4c (#2542) — EACH NEW BATCH IS APPROVED ON ITS OWN; PEOPLE ALREADY APPROVED KEEP GOING.
//
// Founder (R191, 2 Oct): *"Yes, 4 PRs (Recommended)"* — 4c: "each new batch is approved on its own
// (follow-ups to people already emailed continue)". Before: adding batch 2 changed the frozen
// preparation, so EVERY send stopped — batch 1's follow-ups included — until the whole programme
// was approved again.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))
import { onlyPeopleAdded, type PreparationSnapshot } from './preparation-snapshot'
import { founderVerdict, wordingHash } from './founder-approval'

const base: PreparationSnapshot = {
  v: 3, programme_id: 'p1', meeting_target: 10, batch_id: 'b1', batch_lead_ids: ['a', 'b'],
  campaign_id: 'c1', sequence_id: 's1', steps: [{ subject: 'Hi', body: 'One', wait_days: 3 }] as never,
  cadence: [3] as never, send_schedule: null, sender: 'i1|x@p.com', enrolled_lead_ids: ['a', 'b'], sendable_count: 2,
} as PreparationSnapshot
const batch2 = { ...base, batch_id: 'b2', batch_lead_ids: ['c', 'd'], enrolled_lead_ids: ['a', 'b', 'c', 'd'], sendable_count: 4 } as PreparationSnapshot

describe('4c — what a new batch changes', () => {
  it('only people added → the approved people\'s work is unchanged', () => {
    expect(onlyPeopleAdded(base, batch2)).toBe(true)
  })
  it('one word, one wait, the window, the sender or the target changed → a change for everyone', () => {
    expect(onlyPeopleAdded(base, { ...batch2, steps: [{ subject: 'Hi', body: 'Two', wait_days: 3 }] } as never)).toBe(false)
    expect(onlyPeopleAdded(base, { ...batch2, cadence: [4] } as never)).toBe(false)
    expect(onlyPeopleAdded(base, { ...batch2, sender: 'i2|y@p.com' } as never)).toBe(false)
    expect(onlyPeopleAdded(base, { ...batch2, meeting_target: 12 } as never)).toBe(false)
    expect(onlyPeopleAdded(base, { ...batch2, send_schedule: { days: [1] } } as never)).toBe(false)
  })
  it('a person REMOVED is a change too', () => {
    expect(onlyPeopleAdded(base, { ...batch2, enrolled_lead_ids: ['a', 'c'] } as never)).toBe(false)
  })
})

describe('4c — the founder\'s gate lets the approved people through, never the new ones', () => {
  const W = wordingHash([{ subject: 'Hi', body: 'One', wait_days: 3 }])
  const approvals = [{ snapshot_hash: 'v1', wording_hash: W }]
  it('an approved person, not yet emailed, in a programme whose new batch waits → allowed', () => {
    expect(founderVerdict({ gateOn: true, version: 'v2', wording: W, approvals, followUp: false, personApproved: true })).toEqual({ allowed: true })
  })
  it('a new person → waits', () => {
    expect(founderVerdict({ gateOn: true, version: 'v2', wording: W, approvals, followUp: false, personApproved: false }).allowed).toBe(false)
  })
  it('the wording itself changed → everyone waits', () => {
    expect(founderVerdict({ gateOn: true, version: 'v2', wording: 'other', approvals, followUp: true, personApproved: true }).allowed).toBe(false)
  })
})

describe('4c — wired through the one send door', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  it('the sender says who the email is for; the door asks the comparison about that person', () => {
    expect(read('figsy.ts')).toContain('{ ...where, followUp: step > 1, leadId: lead.id ?? null }')
    const auth = read('programme-authority.ts')
    expect(auth).toContain("const drift = await preparationDrift(programme.id, ctx?.leadId ?? null)\n  if (drift.state === 'unchanged') return verdict")
    expect(auth).toContain('founderApprovalVerdict(programme.id, ctx?.followUp === true, ctx?.leadId ?? null)')
  })
  it('only a person in the APPROVED snapshot is unchanged; a new one is told why it waits', () => {
    const snap = read('preparation-snapshot.ts')
    expect(snap).toContain('if (leadId && approvedSnap && onlyPeopleAdded(approvedSnap, now.snapshot)) {')
    expect(snap).toContain("if ((approvedSnap.enrolled_lead_ids ?? []).includes(leadId)) return { state: 'unchanged', hash: p.approved_preparation_hash }")
    expect(snap).toContain('This person is in a new batch that has not been approved yet (R191).')
  })
})
