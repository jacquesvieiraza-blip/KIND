// item 6 (#2544 · R191 4b) — HOUSE SENDS THE FOUNDER'S APPROVED EMAILS; A LIVE PROGRAMME CAN BE RE-APPROVED.

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.mock('@kind/db', () => ({ db: {} }))

import { needsReapproval } from './live-reword'

const live = { status: 'LIVE', paused_at: '2026-10-02', approved_at: '2026-09-30', review_preparation_hash: 'v2', approved_preparation_hash: 'v1' }

describe('6 — when a live programme waits for re-approval', () => {
  it('live, paused, approved before, and a NEW version → yes', () => {
    expect(needsReapproval(live)).toBe(true)
  })
  it('not paused, same version, never approved, or not live → no', () => {
    expect(needsReapproval({ ...live, paused_at: null })).toBe(false)
    expect(needsReapproval({ ...live, review_preparation_hash: 'v1' })).toBe(false)
    expect(needsReapproval({ ...live, approved_at: null })).toBe(false)
    expect(needsReapproval({ ...live, status: 'APPROVED' })).toBe(false)
  })
})

describe('6 — the rules in the code', () => {
  const src = readFileSync(join(__dirname, 'live-reword.ts'), 'utf8')
  it('changing words needs the programme paused; House\'s emails go only on House', () => {
    expect(src).toContain("if (!p.paused_at) return { ok: false, status: 409, reason: 'Pause the programme first")
    expect(src).toContain("if ((await audienceForClientStrict(p.client_id)) !== 'house') {")
  })
  it('the client re-approves the exact version, only after the founder, with a compare-and-set', () => {
    expect(src).toContain('if (!version || version !== row.review_preparation_hash) {')
    expect(src).toContain('if (!(await founderWordingApproved(programmeId))) {')
    expect(src).toContain(".eq('approved_preparation_hash', row.approved_preparation_hash as string)")
  })
  it('every person keeps their place: their remaining steps are replaced, current_step untouched', () => {
    const update = src.slice(src.indexOf("await db.from('figsy_enrollments').update({"), src.indexOf("await db.from('figsy_enrollments').update({") + 300)
    expect(update).not.toContain('current_step')
    expect(src).toContain(".in('status', ['enrolled', 'in_progress'])")
  })
  it('wired: Vida buttons, Milla shows the approval again, the approve press re-approves', () => {
    const route = readFileSync(join(__dirname, '../routes/programme.ts'), 'utf8')
    const my = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
    const vida = readFileSync(join(__dirname, '../../../admin/src/app/vida/page.tsx'), 'utf8')
    expect(route).toContain("programmeRouter.post('/:id/house-approved-emails'")
    expect(route).toContain("programmeRouter.post('/:id/refreeze-live'")
    expect(my).toContain('const rr = await reapproveLive(clientId, p.id, version || null)')
    // ⛓️ 3 Oct: was '(!review.programme.approved_at || review.reapproval)' — merged with 4a part 2's
    // "show the notice while the founder checks" into one condition; a live new version still opens it.
    expect(page).toContain('? review.reapproval === true && (review.canApprove || review.awaiting_founder === true)')
    expect(vida).toContain("Use House's approved emails")
  })
})

// ⚑ 3 Oct (review B2) — House's approved emails go on its live programme SIGNED, and only on a
// branch that already carries the sign-off (#2572) and the opt-out line at send time (#2571).
describe('6 — House\'s approved emails are signed "The Milla & Vida Team"', () => {
  it('each body passes through ensureSignOff with House\'s sign-off', async () => {
    const { readFileSync } = await import('fs')
    const { join } = await import('path')
    const src = readFileSync(join(__dirname, 'live-reword.ts'), 'utf8')
    expect(src).toContain('const steps = HOUSE_SEQUENCE_STEPS.map(s => ({ ...s, body: ensureSignOff(s.body, HOUSE_SIGN_OFF) }))')
  })
  it('the sign-off and the opt-out line exist on this branch', async () => {
    const { HOUSE_SIGN_OFF } = await import('./house-client')
    const { ensureSignOff } = await import('./sequence-tokens')
    expect(HOUSE_SIGN_OFF).toBe('The Milla & Vida Team')
    expect(ensureSignOff('Hi Sam,\n\nOne question.', HOUSE_SIGN_OFF)).toMatch(/The Milla & Vida Team$/)
  })
})

// ⚑ 3 Oct — seen on the real screens (round previews): the client got the "with our team" card
// TWICE, and after the founder approved the new version, two "Approved — nothing is sent until the
// programme goes Live" cards and no button to approve again.
describe('6 — the live re-approval draws once, with its button', () => {
  it('the approved card is not drawn for a re-approval', () => {
    const c = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx'), 'utf8')
    expect(c).toContain('if (p.approved_at && data.reapproval !== true) {')
  })
  it('the lower panel stays away when the upper one is already showing', () => {
    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
    expect(page).toContain('&& !(review.reapproval === true && (review.canApprove || review.awaiting_founder === true)) && (')
  })
})

describe('6 — a live programme\'s new version never says "nothing has been sent"', () => {
  // ⚑ 3 Oct (real screen): the re-approval card on a LIVE programme said "Nothing has been sent, and
  // nothing will be sent until you approve it" — false for a programme that has been sending.
  it('the re-approval header says the programme is paused and who resumes it', () => {
    const c = readFileSync(join(__dirname, '../../../portal/src/components/milla/ProgrammeApproval.tsx'), 'utf8')
    const at = c.indexOf('<h2>Approve exactly what will go out.</h2>')
    const head = c.slice(at, at + 900)
    expect(head).toContain('data.reapproval === true')
    expect(head).toContain('Your programme is paused while you check this new version, so nothing more is being sent.')
    expect(head).toContain('Once you approve it, our team resumes it.')
  })
})
