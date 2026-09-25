// ═══════════════════════════════════════════════════════════════════════════════════════
// 25 Sep (R166 ⑥ · P4, board #2350) — BOUNCES ARE CAUGHT, AND A MAILBOX STOPS AT 3%.
//
// ① A delivery-failure notice that comes back to a client mailbox is a bounce, not a reply:
//    the dead address is blocklisted and the notice is never filed in anyone's Inbox.
// ② A mailbox whose last-7-day bounces reach 3% (after at least 20 sends) sends nothing more.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

type Row = Record<string, unknown>
const state = vi.hoisted(() => ({
  upserts: [] as Row[], upsertError: false,
  sends: [] as Row[], leads: [] as Row[], bad: [] as Row[], readError: '' as string,
  alerts: [] as string[],
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: any = {
        select: () => q, eq: () => q, gte: () => q, limit: () => q, in: () => q,
        upsert: async (row: Row) => { state.upserts.push(row); return { error: state.upsertError ? { message: 'down' } : null } },
        then: (r: (v: unknown) => unknown) => {
          if (state.readError === table) return Promise.resolve({ data: null, error: { message: 'down' } }).then(r)
          const data = table === 'figsy_sent_emails' ? state.sends : table === 'leads' ? state.leads : table === 'opt_out_blocklist' ? state.bad : []
          return Promise.resolve({ data, error: null }).then(r)
        },
      }
      return q
    },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: async (_k: string, s: string) => { state.alerts.push(s); return {} } }))

import { isBounceNotice, failedRecipient, recordBounceNotice } from './bounce-notice'
import { bounceVerdict, mailboxBounceState, MAILBOX_BOUNCE_LIMIT, MAILBOX_BOUNCE_MIN_SENDS } from './mailbox-daily-cap'

beforeEach(() => { state.upserts = []; state.upsertError = false; state.sends = []; state.leads = []; state.bad = []; state.readError = ''; state.alerts = [] })

const GMAIL_DSN = `Address not found
Your message wasn't delivered to dana@gone-company.com because the address couldn't be found.

Final-Recipient: rfc822; dana@gone-company.com
Action: failed
Status: 5.1.1`

describe('① a returned-email notice is a bounce', () => {
  it('recognised by sender or subject; an ordinary reply is not', () => {
    expect(isBounceNotice({ fromEmail: 'mailer-daemon@googlemail.com', subject: 'Delivery Status Notification (Failure)' })).toBe(true)
    expect(isBounceNotice({ fromEmail: 'postmaster@outlook.com', subject: 'x' })).toBe(true)
    expect(isBounceNotice({ fromEmail: 'noreply@corp.com', subject: 'Undeliverable: Missed follow-ups' })).toBe(true)
    expect(isBounceNotice({ fromEmail: 'priya@fernhill.co.uk', subject: 'Re: Missed follow-ups' })).toBe(false)
  })

  it('the failed address is read from the standard report — never the mailbox it came to', () => {
    expect(failedRecipient(GMAIL_DSN, ['jacques@client.com'])).toBe('dana@gone-company.com')
    expect(failedRecipient('The email could not be delivered to <tom@old.co.uk>.', [])).toBe('tom@old.co.uk')
    expect(failedRecipient('Final-Recipient: rfc822; jacques@client.com', ['jacques@client.com'])).toBeNull()
    expect(failedRecipient('Something went wrong.', [])).toBeNull()
  })

  it('🛑 the dead address is blocklisted as a hard bounce', async () => {
    expect(await recordBounceNotice({ fromEmail: 'mailer-daemon@googlemail.com', toEmail: 'jacques@client.com', subject: 'Delivery Status Notification (Failure)', body: GMAIL_DSN })).toBe('blocklisted')
    expect(state.upserts).toEqual([{ email: 'dana@gone-company.com', reason: 'hard_bounce' }])
  })

  it('an unreadable address blocklists nobody and tells a person', async () => {
    expect(await recordBounceNotice({ fromEmail: 'mailer-daemon@x.com', subject: 'Undeliverable', body: 'nope' })).toBe('address_unreadable')
    expect(state.upserts).toEqual([])
    expect(state.alerts.join()).toContain('could not be read')
  })

  it('the reply pipeline drops it BEFORE looking for the lead — it is never a reply', () => {
    const src = readFileSync(join(__dirname, 'reply-pipeline.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export async function processInboundReply('))
    const bounce = fn.indexOf('if (isBounceNotice(inbound)) {')
    const match = fn.indexOf('matches = await findLeadMatches(')
    expect(bounce).toBeGreaterThan(-1)
    expect(bounce).toBeLessThan(match)
    expect(fn).toContain("dropped: `bounce_notice_${outcome}`")
  })
})

describe('② a mailbox stops at 3% bounces', () => {
  it('the rule: 3%, judged only after 20 sends', () => {
    expect(MAILBOX_BOUNCE_LIMIT).toBe(0.03)
    expect(MAILBOX_BOUNCE_MIN_SENDS).toBe(20)
    expect(bounceVerdict(19, 5)).toBe('ok')
    expect(bounceVerdict(100, 2)).toBe('ok')
    expect(bounceVerdict(100, 3)).toBe('too_many_bounces')
  })

  it('measured on the addresses THIS mailbox sent to, against hard bounces and complaints', async () => {
    state.sends = Array.from({ length: 40 }, (_, i) => ({ lead_id: `l${i}` }))
    state.leads = Array.from({ length: 40 }, (_, i) => ({ email: `p${i}@co.com` }))
    state.bad = [{ email: 'p1@co.com' }, { email: 'p2@co.com' }]
    expect(await mailboxBounceState('box1')).toEqual({ state: 'too_many_bounces', sent: 40, bounced: 2 })
    state.bad = [{ email: 'p1@co.com' }]
    expect((await mailboxBounceState('box1')).state).toBe('ok')
  })

  it('🛑 an unreadable record holds the mailbox', async () => {
    state.readError = 'figsy_sent_emails'
    expect((await mailboxBounceState('box1')).state).toBe('unreadable')
    expect((await mailboxBounceState(null)).state).toBe('unreadable')
  })

  it('every send checks it, after the daily limit and before anything is logged or sent', () => {
    const figsy = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    const fn = figsy.slice(figsy.indexOf('async function sendSequenceEmailCore('))
    const cap = fn.indexOf('await mailboxCapState(sendingInbox)')
    const bounce = fn.indexOf('await mailboxBounceState(sendingInbox.id)')
    const insert = fn.indexOf("db.from('figsy_sent_emails').insert(")
    expect(bounce).toBeGreaterThan(cap)
    expect(bounce).toBeLessThan(insert)
    expect(fn).toContain("if (bounce.state !== 'ok') {")
  })
})
