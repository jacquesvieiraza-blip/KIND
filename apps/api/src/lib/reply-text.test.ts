// ⚑ 6 Oct (row 11 · founder "GO on 11") — A PROSPECT'S REPLY READS AS THEIR WORDS.
//
// The founder's live Inbox screenshot: a prospect's "Stop." arrived as
// "Stop.&nbsp; &nbsp; &nbsp;&nbsp; … Founder &amp; CEO … KIND &lt;hello@…&gt; wrote:" on ONE line.
// All three reply readers (Resend, Smartlead, Instantly) removed the HTML tags but never turned
// `&nbsp;` / `&amp;` / `&lt;` back into characters, and squashed every line break. Every reply a
// client reads would look like that. The fixture below is invented; its SHAPE is the real one.
import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
vi.mock('@kind/db', () => ({ db: {} }))
import { replyText } from '@kind/shared'
import { parseSmartleadInbound } from './smartlead-inbound'
import { fromInstantlyReply } from './instantly-map'

const HTML_REPLY =
  '<div dir="ltr">Stop.&nbsp;</div><div><br></div>' +
  '<div>Sam Doe&nbsp; &nbsp;&nbsp;</div><div>Speaker, Founder &amp; CEO&nbsp; &nbsp;</div>' +
  '<div>EX | Example Services&nbsp;</div><div>www.example.com</div><br>\n' +
  '<div class="gmail_quote">On Oct 4, 2026, at 7:01PM, KIND &lt;hello@kindoutreach.com&gt; wrote:<br>' +
  '<blockquote>Hi Sam &#8212; it&#39;s work M&amp;V can take off their plate.</blockquote></div>'

// What is ALREADY saved for the live reply: tags gone, codes left, one line. It is cleaned when shown.
const STORED_ONE_LINE =
  'Stop.&nbsp; &nbsp; &nbsp;&nbsp; &nbsp; &nbsp; &nbsp;&nbsp;Sam Doe &nbsp; &nbsp; Speaker, Founder &amp; CEO ' +
  '&nbsp; &nbsp; &nbsp;EX | Example Services On Oct 4, 2026, at 7:01PM, KIND &lt;hello@kindoutreach.com&gt; wrote:'

const CODES = /&(nbsp|amp|lt|gt|quot|#\d+|#x[0-9a-f]+);/i

describe('replyText — a reply reads as words, with its lines', () => {
  it('an HTML reply: no codes left, the first line is what they said, the lines are kept', () => {
    const t = replyText(HTML_REPLY)
    expect(t).not.toMatch(CODES)
    expect(t.split('\n')[0]).toBe('Stop.')
    expect(t).toContain('Speaker, Founder & CEO')
    expect(t).toContain('KIND <hello@kindoutreach.com> wrote:')
    expect(t).toContain('Hi Sam — it\'s work M&V can take off their plate.')
    expect(t.split('\n').length).toBeGreaterThan(4)
    expect(t).not.toMatch(/ {2,}/)
    expect(t).not.toMatch(/\n{3,}/)
  })

  it('a reply already saved as one line with codes is cleaned when shown', () => {
    const t = replyText(STORED_ONE_LINE)
    expect(t).not.toMatch(CODES)
    expect(t.startsWith('Stop. Sam Doe Speaker, Founder & CEO')).toBe(true)
    expect(t).not.toMatch(/ {2,}/)
  })

  it('plain text keeps an address in angle brackets and its own line breaks', () => {
    const plain = 'Thanks, not now.\n\nOn Mon, Ann <ann@example.com> wrote:\n> Hi Ann'
    expect(replyText(plain)).toBe(plain)
  })

  it('decodes once — "&amp;lt;" is the text "&lt;", never "<" — and leaves an unknown code alone', () => {
    expect(replyText('a &amp;lt; b')).toBe('a &lt; b')
    expect(replyText('it&#x2019;s &foo; fine')).toBe('it’s &foo; fine')
  })

  it('nothing in, nothing out', () => {
    expect(replyText('')).toBe('')
    expect(replyText(null)).toBe('')
  })
})

describe('every reply reader uses it', () => {
  it('Smartlead: an HTML reply body arrives clean, and still starts "Stop."', () => {
    const r = parseSmartleadInbound({ from_email: 'sam@example.com', reply_body: HTML_REPLY })
    expect(r?.body).not.toMatch(CODES)
    expect(r?.body.split('\n')[0]).toBe('Stop.')
  })

  it('Instantly: an HTML-only reply and a text reply with codes both arrive clean', () => {
    const fromHtml = fromInstantlyReply({ lead_email: 'sam@example.com', reply_html: HTML_REPLY })
    expect(fromHtml?.body).not.toMatch(CODES)
    expect(fromHtml?.body.split('\n')[0]).toBe('Stop.')
    const fromText = fromInstantlyReply({ lead_email: 'sam@example.com', reply_text: STORED_ONE_LINE })
    expect(fromText?.body).not.toMatch(CODES)
  })

  it('Resend: the inbound route turns both the webhook body and the fetched body through replyText', () => {
    const src = readFileSync(join(__dirname, '../routes/figsy.ts'), 'utf8')
    const route = src.slice(src.indexOf('let body = '), src.indexOf('const inbound = {'))
    expect(route).toMatch(/let body = replyText\(/)
    expect(route).toMatch(/body = replyText\(full\.text \|\| full\.html/)
    expect(route).not.toMatch(/replace\(\/<\[\^>\]\+>\/g/)
  })
})
