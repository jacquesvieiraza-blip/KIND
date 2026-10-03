// 13c (#2551 · R187 ②) — EVERY CLIENT GETS A SENDING PANEL IN MILLA.
//
// The founder: *"yes both. lock"* · a panel for every client: *"Q6. Yes"*. Sent today and in
// total, left to email, next send, replies, bounces, opt-outs and meetings.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const fail = new Set<string>()
vi.mock('@kind/db', () => {
  const q = (table: string) => {
    const f: Record<string, unknown> = {}
    let head = false
    const filters: string[] = []
    const chain: Record<string, (...a: unknown[]) => unknown> = {}
    for (const m of ['eq', 'in', 'not', 'order', 'limit', 'gte']) chain[m] = (...a: unknown[]) => { filters.push(`${m}:${String(a[0])}`); return chain }
    chain.select = (_c: unknown, o?: { head?: boolean }) => { head = !!o?.head; return chain }
    ;(chain as Record<string, unknown>).then = (ok: (v: unknown) => unknown) => {
      const key = table + (filters.some(x => x.startsWith('gte:sent_at')) ? ':today' : '') + (filters.some(x => x.startsWith('limit:1')) && table === 'figsy_enrollments' ? ':next' : '')
      if (fail.has(table)) return Promise.resolve({ data: null, count: null, error: { message: 'down' } }).then(ok)
      const R: Record<string, unknown> = {
        'figsy_sent_emails:today': { count: 12, data: null, error: null },
        'figsy_sent_emails': head ? { count: 340, data: null, error: null } : { data: [{ leads: { email: 'a@x.com' } }, { leads: { email: 'b@x.com' } }], error: null },
        'figsy_replies': { count: 9, data: null, error: null },
        'figsy_campaigns': { data: [{ id: 'camp1' }], error: null },
        'figsy_enrollments': { count: 160, data: null, error: null },
        'figsy_enrollments:next': { data: [{ next_send_at: '2026-10-05T08:12:00Z' }], error: null },
        'opt_out_blocklist': { count: 1, data: null, error: null },
      }
      void f
      return Promise.resolve(R[key] ?? { data: [], count: 0, error: null }).then(ok)
    }
    return chain
  }
  return { db: { from: q } }
})
vi.mock('./meeting-truth', () => ({ clientMeetingCounts: async () => ({ c1: 2 }) }))
let verdict: unknown = { allowed: true }
vi.mock('./programme-authority', () => ({
  checkProgrammeAuthority: async () => { if (verdict instanceof Error) throw verdict; return verdict },
}))

import { clientSendingPanel, sendingStateFor } from './client-sending-panel'
import { nextSendLabel } from '../../../portal/src/lib/sending-panel-label'

beforeEach(() => { fail.clear(); verdict = { allowed: true } })

describe('13c — the panel', () => {
  it('every number the founder asked for', async () => {
    expect(await clientSendingPanel('c1', new Date('2026-10-02T12:00:00Z'))).toEqual({
      sentToday: 12, sentTotal: 340, leftToEmail: 160, nextSendAt: '2026-10-05T08:12:00Z', sendingState: 'sending',
      replies: 9, bounces: 1, optOuts: 1, meetings: 2,
    })
  })
  it('a number that could not be read is null ("—"), never 0', async () => {
    fail.add('figsy_replies'); fail.add('figsy_campaigns')
    const p = await clientSendingPanel('c1')
    expect(p.replies).toBeNull()
    expect(p.leftToEmail).toBeNull()
    expect(p.sentTotal).toBe(340)
  })
})

// ⚑ 3 Oct (review S12) — a programme that cannot send never reads "Due now".
describe('13c — the next send tells the truth', () => {
  it('paused → no date, and the panel says Paused', async () => {
    verdict = { allowed: false, reason: 'programme_paused' }
    const p = await clientSendingPanel('c1')
    expect(p.nextSendAt).toBeNull()
    expect(p.sendingState).toBe('paused')
    expect(nextSendLabel(p.nextSendAt, new Date(), p.sendingState)).toBe('Paused')
  })
  it('held by the founder\'s check or a changed preparation → On hold, not Due now', async () => {
    verdict = { allowed: false, reason: 'preparation_changed' }
    const p = await clientSendingPanel('c1')
    expect(nextSendLabel(p.nextSendAt, new Date(), p.sendingState)).toBe('On hold — our team is on it')
  })
  it('outside the sending days is not a stop — the next time still shows', () => {
    expect(sendingStateFor({ allowed: false, reason: 'outside_send_window' })).toBe('sending')
  })
  it('finished and not-yet-started read as such', () => {
    expect(sendingStateFor({ allowed: false, reason: 'programme_terminal' })).toBe('finished')
    expect(sendingStateFor({ allowed: false, reason: 'programme_not_live' })).toBe('not_started')
  })
  it('the gate could not be asked → "—", never a date', async () => {
    verdict = new Error('down')
    const p = await clientSendingPanel('c1')
    expect(p.sendingState).toBeNull()
    expect(nextSendLabel(p.nextSendAt, new Date(), p.sendingState)).toBe('—')
  })
  it('only active campaigns are counted for the next send', () => {
    expect(readFileSync(join(__dirname, 'client-sending-panel.ts'), 'utf8'))
      .toContain(".from('figsy_campaigns').select('id').eq('client_id', clientId).eq('status', 'active')")
  })
})

describe('13c — wired in', () => {
  it('Milla shows it once the programme is live, from its own endpoint', () => {
    const page = readFileSync(join(__dirname, '../../../portal/src/app/(milla)/milla/programme/page.tsx'), 'utf8')
    const comp = readFileSync(join(__dirname, '../../../portal/src/components/milla/SendingPanel.tsx'), 'utf8')
    const route = readFileSync(join(__dirname, '../routes/my-programme.ts'), 'utf8')
    expect(page).toMatch(/\(p\.stage === 'Live' \|\| p\.stage === 'Review' \|\| p\.stage === 'Completion'\) && <SendingPanel \/>/)
    expect(comp).toContain("'/my/programme/sending'")
    for (const label of ['Sent today', 'Sent in total', 'Left to email', 'Next send', 'Replies', 'Bounces', 'Opt-outs', 'Meetings']) expect(comp).toContain(`'${label}'`)
    expect(route).toContain("myProgrammeRouter.get('/sending'")
  })
})
