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
    expect(page).toContain('(!review.programme.approved_at || review.reapproval)')
    expect(vida).toContain("Use House's approved emails")
  })
})
