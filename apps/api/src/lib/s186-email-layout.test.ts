// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R186 ① · R189 ⑥ · card #2543 · S3a) — EVERY EMAIL IS LAID OUT LIKE A PROFESSIONAL
// WROTE IT, AND HOUSE'S EMAILS CARRY HOUSE'S OWN LEGAL LINE.
//
// The founder, on the 1 Oct email: *"its all 4. thats not how a normal person writes. one jamm
// packed email. incorrect lower case grammar. we professoinals here. and this is subject to
// every sequence ever built and sent."* · *"the emails are fine. its the layout in the email."*
// R186 ①: a blank line between paragraphs · a gap before the sign-off · the opt-out line and
// postal address small at the bottom — for every sequence, including ones already built.
// R189 ⑥: *"our house account needs to end with the Milla & Vida Team"* · *"for House. It is
// Milla and Vida and Our address"*.
//
// The layout is applied when the email is SENT, so it reaches every sequence already stored —
// nothing stored is rewritten. (The subject and the AI writing rules are part 2 of this card.)
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { POSTAL_FOOTER_LINE, HOUSE_POSTAL_FOOTER_LINE } from '@kind/shared'
import { coldEmailText, coldEmailHtml } from './deliverability'

/** The 1 Oct shape: every line jammed under the last, STOP and the sign-off run on at the end. */
const JAMMED = 'Hi Sam,\nAs a founder your week is full.\nWe take the pipeline off your plate.\nWorth fifteen minutes?\nReply STOP to opt out.\nK.I.N.D'

describe('① the layout every email is sent with', () => {
  it('🛑 a blank line between paragraphs, a gap before the sign-off, and the opt-out + address together at the bottom', () => {
    expect(coldEmailText(JAMMED)).toBe(
      'Hi Sam,\n\nAs a founder your week is full.\n\nWe take the pipeline off your plate.\n\nWorth fifteen minutes?\n\nK.I.N.D' +
      `\n\nReply STOP to opt out.\n${POSTAL_FOOTER_LINE}`)
  })

  it('🛑 the HTML puts each paragraph in its own block and the opt-out line in the small footer, never in the body', () => {
    const html = coldEmailHtml(JAMMED)
    expect((html.match(/<p /g) ?? []).length).toBe(5)       // greeting · two lines · question · sign-off
    const [body, footer] = html.split('font-size:12px')
    expect(body, 'the STOP line is still jammed in the body').not.toContain('Reply STOP')
    expect(footer).toContain('Reply STOP to opt out.')
    expect(footer).toContain(POSTAL_FOOTER_LINE)
    expect(body.indexOf('Worth fifteen minutes?')).toBeLessThan(body.indexOf('K.I.N.D'))
  })

  it('an email with no opt-out line still gets one at the bottom', () => {
    const out = coldEmailText('Hi Sam,\n\nShort note.\n\nThe Milla & Vida Team')
    expect(out.endsWith(`Reply STOP to opt out.\n${POSTAL_FOOTER_LINE}`)).toBe(true)
    expect(coldEmailHtml('Hi Sam,\n\nShort note.')).toContain('Reply STOP to opt out.')
  })

  it('a sign-off with a closing word stays together ("Thanks," then the name)', () => {
    const out = coldEmailText('Hi Sam,\nShort note.\nThanks,\nThe Milla & Vida Team')
    expect(out).toContain('Short note.\n\nThanks,\nThe Milla & Vida Team\n\n')
  })

  it('copy already written in paragraphs (the founder\'s 8 Sep House emails) keeps exactly its paragraphs', () => {
    const body = 'Two halves.\n\nMilla talks to you.\n\nVida runs the operation.'
    expect(coldEmailText(body)).toBe(`${body}\n\nReply STOP to opt out.\n${POSTAL_FOOTER_LINE}`)
  })

  it('stays near-plain: no image, no link, no templated shell', () => {
    const html = coldEmailHtml(JAMMED, 'email-1')
    expect(html).not.toContain('<img')
    expect(html).not.toContain('<a ')
    expect(html).not.toContain('max-width')
  })
})

describe('R189 ⑥ — House\'s own legal line (its sign-off, "The Milla & Vida Team", is part 2)', () => {
  it('🛑 the words are the founder\'s, exactly', () => {
    expect(HOUSE_POSTAL_FOOTER_LINE).toBe('Milla & Vida · K.I.N.D Technologies Ltd, 33 Townsend Road, CV37 7DE, United Kingdom')
  })

  it('a House email carries House\'s legal line at the bottom, in both parts', () => {
    expect(coldEmailText('Hi Sam,\n\nShort note.', HOUSE_POSTAL_FOOTER_LINE).endsWith(HOUSE_POSTAL_FOOTER_LINE)).toBe(true)
    expect(coldEmailHtml('Hi Sam,\n\nShort note.', null, HOUSE_POSTAL_FOOTER_LINE)).toContain('Milla &amp; Vida · K.I.N.D Technologies Ltd')
  })

  const code = (f: string) => readFileSync(join(__dirname, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) }).join('\n')

  it('🛑 the send path chooses House\'s line for House and K.I.N.D\'s for everyone else', () => {
    const figsy = code('figsy.ts')
    expect(figsy).toContain('isHouseClient(')
    expect(figsy).toContain('text:     coldEmailText(body, footerLine)')
    expect(figsy).toContain('html:     coldEmailHtml(body, emailId, footerLine)')
  })

})
