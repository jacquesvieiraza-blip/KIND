// ⚑ 28 Sep (R173 · 3 of 3) — two screens that told a programme client's story wrong, found
// walking the Northwind demo. Both are true for every programme client, not only the demo.
//  ① Vida's "Booked" (the pipeline tile, the Bookings tab and Vida's own chat) counted
//     `calendar_bookings` — so it read 0 while the same client's Milla said "3 meetings", and its
//     "Mark no-show" / "Rebook" wrote to a table no count reads any more.
//  ② Documents told every programme client "No purchase yet … complete your first purchase on
//     the Billing page" — they have no `subscriptions` row, and they had already paid.
// The live proof is the demo walk (`scripts/fullstack/demo-walk.mjs`): Vida's Booked = Milla's
// meetings at Results (3) and Complete (8). These guard the source.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const code = (rel: string) => readFileSync(join(__dirname, '../../..', rel), 'utf8')
  .split('\n').filter(l => !l.trim().startsWith('//')).join('\n')

const OPERATOR = code('api/src/routes/operator.ts')
const route = (head: string) => {
  const at = OPERATOR.indexOf(head)
  expect(at, `${head} is gone`).toBeGreaterThan(-1)
  const next = OPERATOR.indexOf('\noperatorRouter.', at + 1)
  return OPERATOR.slice(at, next > at ? next : undefined)
}

describe('① Vida\'s Booked is the meetings table — the client\'s own meetings', () => {
  const board = route("operatorRouter.get('/board'")

  it('the board reads meetingsForClient and clientMeetingCounts, never calendar_bookings', () => {
    expect(board).toContain('meetingsForClient({ clientId: cid, limit: SAMPLE })')
    expect(board).toContain('clientMeetingCounts([cid])')
    expect(board).not.toContain("from('calendar_bookings')")
  })

  it('an unreadable meetings read is a null count, never 0', () => {
    expect(board).toMatch(/const bookedCount = meetingRows === null \|\| meetingCounts === null \? null/)
    expect(board).toContain('booked:        { count: bookedCount, cards: bookedCards }')
  })

  it('Vida\'s chat is given the same count', () => {
    const at = OPERATOR.indexOf('const [sourced, needs, sending, replied, booked] = await Promise.all([')
    expect(at).toBeGreaterThan(-1)
    const block = OPERATOR.slice(at, OPERATOR.indexOf('} catch { return null }', at))
    expect(block).toContain('clientMeetingCounts([cid])')
    expect(block).not.toContain("from('calendar_bookings')")
    expect(block).toContain("if (booked === null) throw new Error('meetings unreadable')")
  })

  const vida = code('admin/src/app/vida/page.tsx')
  const tab = vida.slice(vida.indexOf("{shownTab === 'Bookings' && (<>"), vida.indexOf("{shownTab === 'Programme' && (<>"))

  it('the Bookings tab lists meetings and sends every action to the meetings panel', () => {
    expect(tab).toContain("onClick={() => setTab('Programme')}")
    expect(tab).toContain('MEETING_STATE_LABEL[c.state]')
    expect(vida).not.toContain('actBooking')
    expect(vida).not.toContain('/operator/bookings/')
  })

  it('it says when the meetings could not be read, and the tile shows "?" rather than 0', () => {
    expect(tab).toContain('Meetings could not be read')
    // ⛓️ 29 Sep (R174 · 5b) — ~~`['Booked', cols ? cols.booked.count : 0, 'Bookings']`~~: the chip is
    // now "Meetings", from the programme's own counts (`programmeCount`), and an unreadable count
    // is still "?" — the lifecycle names `meetings` as unreadable instead of passing a silent 0.
    expect(vida).toContain("['Meetings', programmeCount(lc, 'meetings'), 'Bookings']")
    expect(vida).toContain("{n === undefined ? '—' : n ?? '?'} {label}")
    expect(code('api/src/lib/programme-lifecycle-facts.ts')).toContain("out.unreadable.push('meetings')")
  })
})

describe('② Documents tells a programme client when they accepted the terms', () => {
  const docs = code('portal/src/app/(dashboard)/dashboard/documents/page.tsx')

  it('no client is sent to a Billing page to "complete a first purchase"', () => {
    expect(docs).not.toContain('No purchase yet')
    expect(docs).not.toContain('first purchase on the Billing page')
  })

  it('the signup acceptance is shown, with its date', () => {
    expect(docs).toContain('signup_terms_accepted_at')
    expect(docs).toContain('When you created your account on')
  })

  it('the proof sentence no longer says the acceptance was a payment', () => {
    expect(docs).not.toContain('acceptance via payment')
    expect(docs).not.toContain('payment timestamp')
  })

  it('the demo client accepted the terms at signup, like every client', () => {
    expect(code('api/src/lib/demo-northwind-data.ts')).toContain('signup_terms_accepted_at: iso(30)')
  })
})
