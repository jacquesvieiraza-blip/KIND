// 4d (#2542 · R189 ① · R189 ⑧) — CO-PILOT OFF ONCE APPROVED; THE FOUNDER IS TOLD WHEN A CLIENT WAITS.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { oneWorkingDayAfter } from './founder-approval'

describe('4d — one working day', () => {
  it('Monday → Tuesday; Friday → Monday; Saturday → Monday', () => {
    expect(oneWorkingDayAfter(new Date('2026-10-05T10:00:00Z')).toISOString()).toBe('2026-10-06T10:00:00.000Z')
    expect(oneWorkingDayAfter(new Date('2026-10-02T10:00:00Z')).toISOString()).toBe('2026-10-05T10:00:00.000Z')
    expect(oneWorkingDayAfter(new Date('2026-10-03T10:00:00Z')).toISOString()).toBe('2026-10-05T10:00:00.000Z')
  })
})

describe('4d — wired in', () => {
  const read = (p: string) => readFileSync(join(__dirname, p), 'utf8')
  it('Co-Pilot\'s per-email queue is skipped for a programme send the gate allowed (R189 ①)', () => {
    const f = read('figsy.ts')
    expect(f).toContain("programmeApprovedSend = verdict.mode === 'programme'")
    expect(f).toContain('const reviewRequired = !programmeApprovedSend && (camp?.settings')
  })
  it('the watchdog asks every run, and the founder is told once per version', () => {
    expect(read('../cron.ts')).toContain('await alertFounderApprovalWaits(new Date())')
    const fa = read('founder-approval.ts')
    expect(fa).toContain('`founder_approval_wait:${p.id}:${p.review_preparation_hash}`')
    expect(fa).toContain('if (t.ok && t.alreadyOpen) continue')
  })
})
