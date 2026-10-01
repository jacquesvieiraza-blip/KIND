// ⚑ 1 Oct (placement) — THE RIGHT PRODUCT IN THE RIGHT AREA. Founder, verbatim: *"make sure the right
// product is in the right area. coaching for example is coaching and not programme."*
//
// Coaching pieces live on the Coaching screen: What's converting (#2494), the follow-up drafts and
// coach (#2495 · #2502), the debrief (#2501) and Enterprise's Coaching Review #1 (#2518).
// "How did it go?" (F1) stays on Meetings; the plan (PlanOverview) and the 25/50/75 moment stay on
// Programme. Source-level: a component rendered on the wrong screen fails here.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..', '..', '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')
const COACHING = read('apps/portal/src/app/(milla)/milla/coaching/page.tsx')
const MEETINGS = read('apps/portal/src/app/(milla)/milla/meetings/page.tsx')
const PROGRAMME = read('apps/portal/src/components/milla/ProgrammeOutcome.tsx')
const MOMENT = read('apps/portal/src/components/milla/ExpansionMoment.tsx')

describe('🛑 Coaching is coaching, not programme', () => {
  it('the Coaching screen renders What’s converting, the follow-up and the debrief', () => {
    expect(COACHING).toContain('<WhatsConverting />')
    expect(COACHING).toContain('<MeetingFollowUp meetingId={m.id} followUp={m.followUp} onSaved={loadAfter} />')
    expect(COACHING).toContain('<MeetingDebrief meetingId={m.id} debrief={m.debrief} onSaved={loadAfter} />')
    // From the same read the Meetings screen uses, and only for meetings the client answered.
    expect(COACHING).toContain("api.get<{ data: AfterMeeting[] }>('/leads/meetings'")
    expect(COACHING).toContain('After your meetings')
  })

  it('Meetings no longer renders them — "How did it go?" stays, with one quiet line pointing to Coaching', () => {
    expect(MEETINGS).not.toMatch(/<MeetingFollowUp\b/)
    expect(MEETINGS).not.toMatch(/<MeetingDebrief\b/)
    expect(MEETINGS).toContain('<MeetingOutcomeAsk meetingId={m.id} onSaved={load} />')
    expect(MEETINGS).toContain('href="/milla/coaching"')
    // A Founders client without Coaching sees nothing extra on Meetings (level 'none' → no line).
    expect(MEETINGS).toContain("const follow = !!m.followUp && m.followUp.level !== 'none'")
  })

  it('Programme no longer renders What’s converting; the plan and the moment stay', () => {
    expect(PROGRAMME).not.toMatch(/<WhatsConverting\b/)
    expect(PROGRAMME).not.toMatch(/import WhatsConverting/)
    expect(PROGRAMME).toContain('<PlanOverview />')
    expect(PROGRAMME).toContain('<ExpansionMoment />')
  })

  it('Coaching Review #1 is on Coaching, first; the 25% moment only points there', () => {
    expect(COACHING).toContain('data-testid="coaching-review"')
    expect(COACHING).toContain("'/my/programme/coaching/review'")
    expect(MOMENT).not.toContain('data-testid="coaching-review"')
    expect(MOMENT).toContain('Your first Coaching Review is ready in Coaching.')
    expect(MOMENT).toContain('href="/milla/coaching"')
  })

  it('the order on Coaching: Review · sales context · what’s converting · after your meetings · Objection Coach · Roleplay · prep', () => {
    const body = COACHING.slice(COACHING.indexOf('return (\n    <div className="h-full'))
    const at = [
      'data-testid="coaching-review"', '<SalesContextCard />', '<WhatsConverting />',
      'data-testid="after-your-meetings"', '<ObjectionCoachCard', '<RoleplayCard', 'Prep me for this meeting',
    ].map(s => body.indexOf(s))
    expect(at.every(i => i > -1)).toBe(true)
    expect([...at].sort((a, b) => a - b)).toEqual(at)
  })
})
