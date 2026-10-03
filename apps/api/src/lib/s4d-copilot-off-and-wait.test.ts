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

// ⚑ 3 Oct — review S9 and R189 ⑧ (*"their emails go to the top of the founder's Vida list"*).
describe('4d — at once, the demo never, and closed by the approval', () => {
  const fa = readFileSync(join(__dirname, 'founder-approval.ts'), 'utf8')
  const fn = fa.slice(fa.indexOf('export async function alertFounderApprovalWaits'))
  it('the demo is skipped before anything is raised', () => {
    expect(fn.indexOf('if (await isDemoProgrammeClient(p.client_id)) continue')).toBeGreaterThan(0)
    expect(fn.indexOf('if (await isDemoProgrammeClient(p.client_id)) continue')).toBeLessThan(fn.indexOf('raiseOperatorTask('))
  })
  it('a Needs-you row the moment a version waits, BEFORE the one-working-day check', () => {
    const now = fn.indexOf('`founder_approval_waiting:${p.id}:${p.review_preparation_hash}`')
    expect(now).toBeGreaterThan(0)
    expect(now).toBeLessThan(fn.indexOf('oneWorkingDayAfter(new Date(p.review_preparation_at)) > now'))
  })
  it('after a working day it escalates to critical and emails once', () => {
    expect(fn).toContain("severity: 'critical', title, detail")
  })
  it('approving closes both rows for that version', () => {
    const rec = fa.slice(fa.indexOf('export async function recordFounderApproval'))
    expect(rec).toContain("resolveOperatorTasksForCondition('support_escalation', key, `Approved in Vida by ${by}.`)")
    expect(rec).toContain('`founder_approval_waiting:${programmeId}:${version}`, `founder_approval_wait:${programmeId}:${version}`')
  })
})
