// ⚑ 1 Oct (R181) — THE PRICING PAGE'S "COMPARE WHAT EACH PLAN INCLUDES" DROP-DOWN.
// The founder asked for a comparison under the prices and took all three recommendations
// ("all your recomednation"): ① only live features plus the first Coaching features, each
// marked "Coming soon" — Deal Coach, Scorecards, Team coaching and the rest stay off the site
// until they are close; ② no Full Coaching price on the site until it is locked; ③ band prices
// unchanged. These guards hold all three, plus R136 (no sourcing figures).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BAND_PRICE_PER_MEETING_USD, PRECISION_SETUP_FEE_USD, PRECISION_PER_HELD_MEETING_USD, formatUsdWhole } from '@kind/shared'

// ⛓️ 8 Oct (precision model, founder GO) — THERE ARE NO PLANS TO COMPARE ANY MORE: one setup fee and
// one price per held meeting for every client. The drop-down stays, under the price cards and closed,
// and now shows what the setup fee, the monthly (no fee) and each held meeting include. ② holds: no
// Coaching price until it launches. ① is AMENDED by the founder's 8 Oct note, verbatim: "pricing needs
// to have coaching coming soon too. this is vital to growth" — the approved preview shows Coaching's
// first features (a deal coach, a deeper debrief, roleplay) marked Coming soon, so "Deal coach" is no
// longer on the not-advertised list. Everything else later-phase stays off the site.

const html = readFileSync(join(__dirname, '../../../website/pricing.html'), 'utf8')
const start = html.indexOf('<details class="cmp" id="compare">')
const block = start >= 0 ? html.slice(start, html.indexOf('</details>', start) + 10) : ''
const text = block.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ')

describe('R181, amended 8 Oct — what the price includes, under the price cards', () => {
  it('exists, sits under the price cards, and is closed by default', () => {
    expect(start).toBeGreaterThan(html.indexOf('<div class="plan-grid">'))
    expect(block).not.toMatch(/<details[^>]*\bopen\b/)
    expect(text).toContain('See everything that s included')
  })

  it('heads the columns with the setup fee and the price per held meeting from @kind/shared, and no band', () => {
    expect(text).toContain(`Setup ${formatUsdWhole(PRECISION_SETUP_FEE_USD)}`)
    expect(text).toContain('Monthly No fee')
    expect(text).toContain(`Meeting held ${formatUsdWhole(PRECISION_PER_HELD_MEETING_USD)}`)
    for (const p of Object.values(BAND_PRICE_PER_MEETING_USD)) expect(text, `the $${p} band is back`).not.toContain(`$${p}`)
  })

  it('② shows no Coaching price — "priced per held meeting when it launches"', () => {
    // ⛓️ 8 Oct (later, R201 ⑥) — WAS no dollar figure at all. In dollars now: the only figures are the two prices.
    const dollars = [...text.matchAll(/\$\s?[\d,]*\d/g)].map(m => m[0].replace(/\s/g, ''))
    expect(dollars.filter(d => d !== formatUsdWhole(PRECISION_SETUP_FEE_USD) && d !== formatUsdWhole(PRECISION_PER_HELD_MEETING_USD))).toEqual([])
    expect(text).not.toMatch(/£\s?\d|\+\s*\$|uplift/i)
    // The Coaching rows run from their group heading to the note under the table; no figure inside them.
    const coaching = text.slice(text.indexOf('Coaching, optional'), text.indexOf('You pay '))
    expect(coaching.length, 'the Coaching rows are gone').toBeGreaterThan(40)
    expect(coaching, 'a Coaching price is on the site').not.toMatch(/[£$]\s?\d/)
    expect(text).toContain('Coaching is optional, is priced per held meeting when it launches')
  })

  it('① every not-yet-built feature is marked Coming soon; later-phase features are not advertised', () => {
    for (const soon of ['Meeting card: who and why now', 'How did it go? after every meeting', 'Deal coach, built on your pitch', 'A deeper debrief with Milla', 'Roleplay on upcoming meetings']) {
      const at = text.indexOf(soon)
      expect(at, soon).toBeGreaterThan(-1)
      expect(text.slice(at, at + soon.length + 20), soon).toContain('Coming soon')
    }
    for (const later of ['Deal Review', 'Scorecard', 'Team coaching', 'Manager', 'Win / Loss', 'Win/Loss', 'Winning Moments', 'Playbook', 'Conversion Intelligence', 'transcri', 'recording']) {
      expect(text, later).not.toContain(later)
    }
  })

  it('R136 — no sourcing figure appears in the comparison', () => {
    expect(text).not.toMatch(/\b(250|300|400)\b|leads per|prospects/i)
  })
})
