// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R182 · W-6) — THE PORTAL TERMS SELL THE SAME THING AS THE WEBSITE: A QUALIFIED MEETING.
//
// The portal Terms (`public/terms.html` — what the sign-up checkbox links to, so what a client
// actually agrees to — and the `/terms` summary route) still said "booked meetings", and counted a
// meeting the moment it was "booked … and recorded on your account". The website Terms count a
// meeting only when it meets SEVEN conditions. Two definitions of the thing being sold is the
// dispute the 23 Sep ruling exists to prevent. The founder: "all yes" (W-6), preview "approved".
// ⛓️ Lifts the 23/25 Sep "not the portals" scope note in `terms-r166.test.ts` for this section.
//
// The seven are READ from `apps/website/terms.html`, never retyped, so the two contracts cannot
// drift apart word by word.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const APPS = join(__dirname, '../../..')
const raw = (p: string) => readFileSync(join(APPS, p), 'utf8')
const text = (s: string) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&mdash;/g, '—').replace(/&rsquo;/g, '’')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ')

// ⛓️ 8 Oct (precision model, founder GO) — WAS "the portal Terms count QUALIFIED meetings". Both Terms now
// sell a HELD meeting: £500 only for a meeting that took place and meets all seven conditions. The portal's
// full Terms carry the website's text word for word, so the duty below (same seven, same no-show and
// challenge rules) is unchanged; the wording it checks is the held-meeting wording.
const SEVEN = (() => {
  const terms = raw('website/terms.html')
  const at = terms.indexOf('A <strong>held meeting</strong> is a meeting that meets all seven')
  if (at < 0) return []
  const ol = terms.slice(terms.indexOf('<ol>', at), terms.indexOf('</ol>', at))
  return [...ol.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => text(m[1]).trim())
})()

const FULL = 'portal/public/terms.html'
const SUMMARY = 'portal/src/app/(legal)/terms/page.tsx'

describe('W-6 — the portal Terms count held meetings, as the website does', () => {
  it('the website still carries its seven — otherwise the checks below are vacuous', () => {
    expect(SEVEN).toHaveLength(7)
  })

  for (const f of [FULL, SUMMARY]) {
    it(`🛑 ${f} never sells a "booked meeting"`, () => {
      const t = text(raw(f))
      expect(t).not.toMatch(/booked meetings/i)
      expect(t).not.toMatch(/meetings booked/i)
      expect(t).toMatch(/held meeting/)
    })
  }

  it('🛑 the full Terms count a meeting only when all seven conditions are met — the same seven, word for word', () => {
    const t = text(raw(FULL))
    expect(t).not.toMatch(/counts towards your programme when it is booked with a prospect/)
    expect(t).toMatch(/A held meeting is a meeting that meets all seven of the following conditions/)
    for (const c of SEVEN) expect(t, c).toContain(c)
    expect(t).toMatch(/A reply on its own is not a held meeting/)
  })

  it('the full Terms state no-shows and the 3-business-day challenge, from the meeting taking place', () => {
    const t = text(raw(FULL))
    expect(t).toMatch(/we will make reasonable efforts to reschedule the meeting once/)
    expect(t).toMatch(/the meeting is charged as a held meeting unless you give us at least 24 hours’ notice/)
    expect(t).toMatch(/within 3 business days of the meeting taking place/)
  })

  it('no retired wording: no "3-sequence", no "qualified leads", Google Workspace named as a sub-processor', () => {
    const t = text(raw(FULL))
    expect(t).not.toMatch(/3-sequence/)
    expect(t).not.toMatch(/qualified leads/i)
    expect(t).toMatch(/Google Workspace \(sending mailboxes/)
  })
})
