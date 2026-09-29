// ⚑ 29 Sep (R174 · PR 5h) — VIDA'S INBOX LABELS EACH REPLY BY WHAT IT IS, AND "SENT" IS SEEN.
//   · an out-of-office, an opt-out and a "not interested" need nobody — not "needs you";
//   · one shared list decides it, read by the Inbox's labels AND the server's count of replies
//     waiting on a decision (the Inbox badge and Needs you), so the two cannot disagree;
//   · the "Sent." confirmation renders where the operator is after sending: the reply list.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { replyInboxState, replyNeedsNobody, REPLY_NEEDS_NOBODY } from '@kind/shared'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const r = (classification: string | null, extra: Partial<{ qualified_at: string; meeting_booked_at: string }> = {}) =>
  ({ classification, qualified_at: null, meeting_booked_at: null, ...extra })

describe('each reply is labelled by what it is', () => {
  it('booked and qualified are done; the quiet kinds need nobody; the rest need you', () => {
    expect(replyInboxState(r('hot', { meeting_booked_at: 't' }))).toEqual({ label: 'booked', tone: 'done' })
    expect(replyInboxState(r('warm', { qualified_at: 't' }))).toEqual({ label: 'qualified', tone: 'done' })
    expect(replyInboxState(r('out_of_office'))).toEqual({ label: 'out of office', tone: 'quiet' })
    expect(replyInboxState(r('not_interested'))).toEqual({ label: 'not interested', tone: 'quiet' })
    expect(replyInboxState(r('opt_out'))).toEqual({ label: 'opted out', tone: 'quiet' })
    expect(replyInboxState(r('hot'))).toEqual({ label: 'needs you', tone: 'needs' })
    expect(replyInboxState(r(null))).toEqual({ label: 'needs you', tone: 'needs' })
  })
  it('one list, read by the Inbox and by the server count', () => {
    expect(REPLY_NEEDS_NOBODY).toContain('not_interested')
    expect(replyNeedsNobody('interested')).toBe(false)
    const facts = read('apps/api/src/lib/programme-lifecycle-facts.ts')
    // ~~expect(facts).toContain('const AUTO_HANDLED_REPLY = new Set<string>(REPLY_NEEDS_NOBODY)')~~
    // ⛓️ 29 Sep (R174 · fix): the counts ask the one shared rule, which reads the same list.
    expect(facts).toContain('out.repliesAwaitingDecision = replies.filter(r => replyNeedsDecision(r)).length')
    const page = read('apps/admin/src/app/vida/page.tsx')
    expect(page).toContain('const st = replyInboxState(r)')
    expect(page).not.toContain("{r.meeting_booked_at ? 'booked' : r.qualified_at ? 'qualified' : 'needs you'}")
  })
})

describe('the Sent confirmation is seen', () => {
  it('renders on the reply list, where the operator lands after sending', () => {
    const page = read('apps/admin/src/app/vida/page.tsx')
    const list = page.slice(page.indexOf(') : (<>\n                  {/* ⚑ 29 Sep (R174 · 5h) — THE "SENT"'), page.indexOf('{/* APPROVALS — drafts waiting'))
    expect(list).toContain('{replyMsg && <p className="text-[12.5px] font-semibold text-[#0e7c86] mb-2">{replyMsg}</p>}')
    expect(list.indexOf('{replyMsg &&')).toBeLessThan(list.indexOf('cockpit.replies.map('))
  })
})
