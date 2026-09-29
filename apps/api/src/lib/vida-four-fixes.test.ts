// ⚑ 29 Sep (R174 · fix, founder's live walk) — FOUR THINGS VIDA GOT WRONG ON THE DEMO.
//   1. "4 replies to decide" beside an Inbox with one "needs you" — booked replies were counted;
//   2. Vida named a booked prospect (Owen) as waiting — same cause;
//   3. the grey line under each Inbox name printed the classifier's codes (not_interested, hot);
//   4. the demo showed a "Source 250 leads" shortcut and two internal blockers it can never clear.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { replyNeedsDecision, replyInboxState } from '@kind/shared'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')

describe('1 + 2 · one rule for "needs a decision", the Inbox label\'s', () => {
  it('booked, qualified, ours and needs-nobody replies need no decision; an open interested one does', () => {
    expect(replyNeedsDecision({ classification: 'hot', meeting_booked_at: '2026-09-21T10:00:00Z' })).toBe(false)
    expect(replyNeedsDecision({ classification: 'hot', qualified_at: 't' })).toBe(false)
    expect(replyNeedsDecision({ classification: 'out_of_office' })).toBe(false)
    expect(replyNeedsDecision({ classification: 'not_interested' })).toBe(false)
    expect(replyNeedsDecision({ classification: 'sent_reply' })).toBe(false)
    expect(replyNeedsDecision({ classification: 'warm' })).toBe(true)
  })
  it('the demo\'s Results inbox: exactly one reply needs a decision, the same one the Inbox labels', () => {
    const inbox = [
      { classification: 'not_interested', qualified_at: null, meeting_booked_at: null },
      { classification: 'out_of_office', qualified_at: null, meeting_booked_at: null },
      { classification: 'hot', qualified_at: null, meeting_booked_at: 't1' },
      { classification: 'warm', qualified_at: null, meeting_booked_at: null },
      { classification: 'hot', qualified_at: null, meeting_booked_at: 't2' },
      { classification: 'hot', qualified_at: null, meeting_booked_at: 't3' },
    ]
    expect(inbox.filter(r => replyNeedsDecision(r)).length).toBe(1)
    expect(inbox.filter(r => replyInboxState(r).label === 'needs you').length).toBe(1)
  })
  it('every counting site in the lifecycle asks the one rule (the count, the board and the reply Vida names)', () => {
    const f = read('apps/api/src/lib/programme-lifecycle-facts.ts')
    expect(f).toContain('out.repliesAwaitingDecision = replies.filter(r => replyNeedsDecision(r)).length')
    expect(f).toContain('const first = rows.find(r => replyNeedsDecision(r))')
    expect(f).toContain('if (!replyNeedsDecision(r)) continue')
    expect((f.match(/meeting_booked_at/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(f).not.toMatch(/^const AUTO_HANDLED_REPLY/m)
  })
})

describe('3 + 4 · Vida\'s words and the demo', () => {
  const page = read('apps/admin/src/app/vida/page.tsx')
  it('the grey line under each Inbox name is plain words', () => {
    expect(page).toContain("{r.classification ? replyWord(r.classification) : 'not yet read'} · {fmtDate(r.received_at)}")
    expect(page).not.toContain("{r.classification || 'unclassified'} · ")
  })
  it('the demo shows no internal blockers and no sourcing shortcut; a real client keeps both', () => {
    expect(page).toContain('const stuck = isDemo ? [] : [')
    expect(page).toContain('blockers: blockers ? blockerStrip(blockers, lc, selectedIsDemo()) : null,')
    expect(page).toContain('programmeSourcing: selectedIsDemo() ? null : programmeSourcingAction(prog),')
  })
})
