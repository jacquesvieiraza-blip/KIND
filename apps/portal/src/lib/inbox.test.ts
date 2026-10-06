// 25 Sep (R165) — THE CLIENT'S INBOX: one conversation per person, read-only, nothing invented.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { buildConversations, inFilter, statusOf, NEXT, STATUS, type ReplyRow, type SentRow } from './inbox'

const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const SCREEN = readFileSync(join(__dirname, '../components/milla/MillaInbox.tsx'), 'utf8')
const SCREEN_CODE = strip(SCREEN)
const MILLA_PAGE = readFileSync(join(__dirname, '../app/(milla)/milla/replies/page.tsx'), 'utf8')
const OLD_PAGE = readFileSync(join(__dirname, '../app/(dashboard)/dashboard/inbox/page.tsx'), 'utf8')
const SHELL = readFileSync(join(__dirname, '../components/milla/MillaShell.tsx'), 'utf8')

const lead = { first_name: 'Priya', last_name: 'Shah', job_title: 'Head of Operations', company: 'Fernhill Foods' }
const reply = (o: Partial<ReplyRow>): ReplyRow => ({
  id: 'r', from_email: 'priya@fernhill.co.uk', from_name: 'Priya Shah', subject: 'Re: hello', body_text: 'Yes please', body: null,
  classification: 'interested', received_at: '2026-09-25T14:12:00Z', processed_at: null, lead_id: 'L1', leads: lead, ...o,
})
const ours = (o: Partial<SentRow>): SentRow => ({ lead_id: 'L1', step: 1, subject: 'Missed follow-ups', body: 'Hi Priya', sent_at: '2026-09-22T09:14:00Z', ...o })

describe('one conversation per person, in order', () => {
  it('our email, their reply and our answer read top to bottom', () => {
    const [c] = buildConversations([
      reply({ id: 'mine', classification: 'sent_reply', from_email: 'jacques@kind.com', body: 'Tuesday 10:00?', body_text: null, received_at: null, processed_at: '2026-09-25T15:00:00Z' }),
      reply({}),
    ], [ours({})])
    expect(c.messages.map(m => m.kind)).toEqual(['ours', 'theirs', 'our_reply'])
    expect(c.messages[0].label).toBe('Your email · step 1')
    expect(c.name).toBe('Priya Shah')
    expect(c.company).toBe('Fernhill Foods')
  })

  it('two replies from one person are ONE conversation, and the latest decides its status', () => {
    const cs = buildConversations([
      reply({ id: 'a', classification: 'out_of_office', received_at: '2026-09-22T10:00:00Z' }),
      reply({ id: 'b', classification: 'hot', received_at: '2026-09-25T10:00:00Z' }),
    ], [])
    expect(cs).toHaveLength(1)
    expect(cs[0].status).toBe('interested')
  })

  it('a booked meeting outranks the classification', () => {
    const [c] = buildConversations([reply({ classification: 'warm', meeting_booked_at: '2026-09-24T13:20:00Z' })], [])
    expect(c.status).toBe('booked')
  })

  it('🛑 our emails to OTHER people never appear in this conversation', () => {
    const [c] = buildConversations([reply({})], [ours({}), ours({ lead_id: 'SOMEONE_ELSE', body: 'not theirs' })])
    expect(c.messages.map(m => m.text)).not.toContain('not theirs')
  })

  it('our answer with no reply from them is not a conversation', () => {
    expect(buildConversations([reply({ classification: 'sent_reply' })], [])).toEqual([])
  })

  it('unreadable context (sent = null) still shows their reply', () => {
    const [c] = buildConversations([reply({})], null)
    expect(c.messages.map(m => m.kind)).toEqual(['theirs'])
  })

  it('newest conversation first', () => {
    const cs = buildConversations([
      reply({ id: 'o', lead_id: 'OLD', received_at: '2026-09-20T10:00:00Z' }),
      reply({ id: 'n', lead_id: 'NEW', received_at: '2026-09-25T10:00:00Z' }),
    ], [])
    expect(cs.map(c => c.key)).toEqual(['NEW', 'OLD'])
  })
})

describe('statuses and the four filters', () => {
  it('every classification the product writes has a plain name', () => {
    expect(statusOf('hot')).toBe('interested')
    expect(statusOf('warm')).toBe('interested')
    expect(statusOf('cold')).toBe('not_interested')
    expect(statusOf('opt_out')).toBe('stop')
    expect(statusOf('unsubscribe')).toBe('stop')
    expect(statusOf('out_of_office')).toBe('away')
    expect(statusOf('something_new')).toBe('other')
    for (const s of Object.keys(STATUS)) expect(NEXT[s as keyof typeof NEXT].title.length).toBeGreaterThan(5)
  })

  it('every conversation is in exactly one of Interested / Meetings booked / Everything else', () => {
    const cs = buildConversations([
      reply({ id: '1', lead_id: 'a', classification: 'hot' }),
      reply({ id: '2', lead_id: 'b', classification: 'warm', meeting_booked_at: 'x' }),
      reply({ id: '3', lead_id: 'c', classification: 'cold' }),
      reply({ id: '4', lead_id: 'd', classification: 'opt_out' }),
    ], [])
    for (const c of cs) {
      expect(['interested', 'booked', 'else'].filter(f => inFilter(c, f as 'interested')).length).toBe(1)
      expect(inFilter(c, 'all')).toBe(true)
    }
  })

  it('an opted-out person is told as the product does it: never emailed again', () => {
    expect(NEXT.stop.title).toBe('They won’t be emailed again')
  })
})

describe('🛑 the screen carries nothing invented (R150 · amended 2 Oct by R187 ④)', () => {
  // ⛓️ 2 Oct (R187 ④ amends R150 / R165): ~~"no send, no draft"~~ — *"Replies are answered from
  // the portal: Milla drafts, a person edits and presses Send."* The draft, the box and the one
  // Send press are guarded in `s12-answer-from-milla.test.ts`. What stays banned is unchanged:
  it('no "mark booked" and no old "Help me reply" — a client click never bills', () => {
    for (const banned of ['mark-booked', 'Help me reply']) {
      expect(SCREEN_CODE, `the inbox offers ${banned} again`).not.toContain(banned)
    }
  })

  it('none of the old Unibox clutter', () => {
    for (const banned of ['Unibox', 'LinkedIn', 'Linkedin', 'FIGSY', 'Launch a campaign', 'Archived', 'ICP fit', '/dashboard/']) {
      expect(SCREEN_CODE, `"${banned}" is back on the inbox`).not.toContain(banned)
    }
  })

  it('an empty inbox says why, from the count the API returned', () => {
    expect(SCREEN).toContain("'No replies yet, because no emails have gone out'")
    expect(SCREEN_CODE).toContain('const nothingSent = sentTotal === 0')
    expect(SCREEN).toContain('href="/milla/programme"')
  })

  it('a refused load is shown as refused, not as an empty inbox', () => {
    expect(SCREEN).toContain('data-testid="inbox-error"')
  })
})

describe('it is called Inbox, and there is one of it', () => {
  it('the rail, the section title and the sidebar list say Inbox', () => {
    expect(SHELL).toContain("['Workspace', '/milla/replies', 'Inbox'")
    expect(SHELL).toContain("['/milla/replies', 'Inbox']")
    expect(SHELL).toContain('Latest in your inbox')
    expect(strip(SHELL)).not.toContain("'Replies'")
  })

  it('Milla and the old dashboard route render the SAME component', () => {
    expect(MILLA_PAGE).toContain("import MillaInbox from '@/components/milla/MillaInbox'")
    expect(OLD_PAGE).toContain("import MillaInbox from '@/components/milla/MillaInbox'")
  })
})

// ⚑ 6 Oct (row 11) — the founder's live Inbox showed a "Stop." reply as "Stop.&nbsp; &nbsp; …
// Founder &amp; CEO … &lt;hello@…&gt;" on one line. A reply already SAVED like that reads as words.
describe('a reply saved with codes in it reads as words (row 11)', () => {
  const saved = 'Stop.&nbsp; &nbsp; &nbsp;Sam Doe &nbsp; Founder &amp; CEO On Oct 4, KIND &lt;hello@kindoutreach.com&gt; wrote:'
  it('the message and the list preview show no codes and no runs of spaces', () => {
    const [c] = buildConversations([reply({ body_text: saved, classification: 'opt_out' })], [])
    const theirs = c.messages.find(m => m.kind === 'theirs')!
    for (const t of [theirs.text, c.snippet]) {
      expect(t).not.toMatch(/&(nbsp|amp|lt|gt);/)
      expect(t).not.toMatch(/ {2,}/)
      expect(t.startsWith('Stop. Sam Doe Founder & CEO')).toBe(true)
    }
    expect(theirs.text).toContain('KIND <hello@kindoutreach.com> wrote:')
  })
  it('our own email is shown exactly as it was sent', () => {
    const [c] = buildConversations([reply({})], [ours({ body: 'Hi Priya &amp; team' })])
    expect(c.messages.find(m => m.kind === 'ours')!.text).toBe('Hi Priya &amp; team')
  })
})

// ⚑ 6 Oct (item 6 · founder "yes fix 6") — THE INBOX'S TOP STAYS IN VIEW. The founder's screenshot:
// reading Gina's whole reply meant scrolling the PAGE, which slid the Inbox heading, the "Nothing is
// sent until you press Send" line and the replied/interested/booked counts up under the shell's
// header, half cut off. The cause: the page scrolled as one piece, and the reply pane had no scroll of
// its own. Now the card fills the page and the list and the conversation scroll INSIDE it, so the
// heading and counts stay put. Same components, same words — a layout fix, not a redesign (R167).
describe('the Inbox heading and counts stay in view while a reply is read (item 6)', () => {
  const INBOX_CODE = SCREEN_CODE
  it('the page is a column the card fills — the note sits under it, the page does not scroll as one piece', () => {
    expect(MILLA_PAGE).toContain('className="h-full overflow-y-auto p-5 sm:p-6 flex flex-col"')
    expect(MILLA_PAGE).toContain('data-testid="held-reply-note" className="shrink-0')
  })
  it('the card grows to the page, its one row is the space left, and each side scrolls inside', () => {
    expect(INBOX_CODE).toContain('flex flex-col flex-1 min-h-[560px]" data-testid="milla-inbox"')
    expect(INBOX_CODE).toContain('grid-rows-[minmax(0,1fr)]')
    expect(INBOX_CODE).toContain('<div className="overflow-y-auto flex-1 min-h-0">')
    expect(INBOX_CODE).toMatch(/<section className={`min-w-0 min-h-0 overflow-y-auto flex-col/)
  })
})
