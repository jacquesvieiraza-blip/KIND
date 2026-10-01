// ⚑ 28 Sep — two client-facing defects found walking the Northwind demo in a real browser.
// Both are true for every programme client, not only the demo.
//  ① Milla's chat chip said "Not started" (red) on a LIVE programme — it still asked the retired
//     "go live — load $99" question (a legacy wallet top-up) — and "Outreach hasn't started" at
//     Complete, under "8 / 8 · Target met".
//  ② The Meetings page filed every meeting under PAST and badged it "Confirmed" — its upcoming
//     test compared against `status === 'confirmed'`, a value `/leads/meetings` never sends.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PORTAL = join(__dirname, '../../../portal/src')
const code = (rel: string) => readFileSync(join(PORTAL, rel), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

describe('① the chat chip tells a programme client the truth', () => {
  const src = code('components/milla/MillaConversation.tsx')
  const state = src.slice(src.indexOf('const sendState = (() => {'), src.indexOf('})()', src.indexOf('const sendState = (() => {')))

  it('the go-live ("Not started") test never applies to a client with a programme', () => {
    expect(state).toMatch(/if \(needsGoLive && prog\.hasProgramme !== true\) return \{ label: 'Not started'/)
    expect(state).not.toMatch(/if \(needsGoLive\) return/)
  })

  it('a finished programme reads "Programme finished", decided before the campaign status', () => {
    const done = state.indexOf("if (prog.stage === 'Completion') return { label: 'Programme finished'")
    expect(done).toBeGreaterThan(-1)
    expect(done).toBeLessThan(state.indexOf('const st = summary?.campaign_status'))
  })
})

describe('② the Meetings page splits upcoming from past by the meeting itself', () => {
  const src = code('app/(milla)/milla/meetings/page.tsx')

  it('upcoming = a BOOKED meeting whose time is still ahead — never a status the API does not send', () => {
    expect(src).not.toMatch(/status === 'confirmed'/)
    expect(src).toMatch(/const UPCOMING_STATES = \['BOOKED', 'BOOKED_UNVERIFIED'\]/)
    expect(src).toMatch(/new Date\(m\.start_time\)\.getTime\(\) >= now && UPCOMING_STATES\.includes\(m\.state \?\? ''\)/)
  })

  it('the badge is the API\'s own label, not a hard-coded "Confirmed"', () => {
    expect(src).not.toMatch(/'Confirmed'/)
    // ⛓️ 1 Oct (Coaching F1) — WAS `{m.status || 'Booked'}`. The badge now reads "How did it go?" while the
    // client is being asked, then their answer; otherwise still the API's own label, never "Confirmed".
    expect(src).toContain("(m.status || 'Booked')")
  })

  it('a page file exports nothing but the page (Next.js refuses other exports)', () => {
    expect(src).not.toMatch(/^export (?!default)/m)
  })
})
