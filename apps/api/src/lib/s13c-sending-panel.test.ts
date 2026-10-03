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

import { clientSendingPanel } from './client-sending-panel'

beforeEach(() => fail.clear())

describe('13c — the panel', () => {
  it('every number the founder asked for', async () => {
    expect(await clientSendingPanel('c1', new Date('2026-10-02T12:00:00Z'))).toEqual({
      sentToday: 12, sentTotal: 340, leftToEmail: 160, nextSendAt: '2026-10-05T08:12:00Z',
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
