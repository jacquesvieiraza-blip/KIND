// ⚑ 1 Oct (R181) — THE PRICING PAGE'S "COMPARE WHAT EACH PLAN INCLUDES" DROP-DOWN.
// The founder asked for a comparison under the prices and took all three recommendations
// ("all your recomednation"): ① only live features plus the first Coaching features, each
// marked "Coming soon" — Deal Coach, Scorecards, Team coaching and the rest stay off the site
// until they are close; ② no Full Coaching price on the site until it is locked; ③ band prices
// unchanged. These guards hold all three, plus R136 (no sourcing figures).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { BAND_PRICE_PER_MEETING_USD } from '@kind/shared'

const html = readFileSync(join(__dirname, '../../../website/pricing.html'), 'utf8')
const start = html.indexOf('<details class="cmp" id="compare">')
const block = start >= 0 ? html.slice(start, html.indexOf('</details>', start) + 10) : ''
const text = block.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/g, ' ').replace(/\s+/g, ' ')

describe('R181 — the plan comparison under the prices', () => {
  it('exists, sits under the three prices, and is closed by default', () => {
    expect(start).toBeGreaterThan(html.indexOf('<div class="plan-grid">'))
    expect(block).not.toMatch(/<details[^>]*\bopen\b/)
    expect(text).toContain('Compare what each plan includes')
  })

  it('heads each column with the band price from @kind/shared', () => {
    for (const p of Object.values(BAND_PRICE_PER_MEETING_USD)) expect(text).toContain(`$${p}`)
  })

  it('② shows no Full Coaching price — "priced when it launches"', () => {
    expect(text).not.toMatch(/\$100|\+\s*\$|uplift/i)
    expect(text).toContain('Full Coaching is priced when it launches')
  })

  it('① every not-yet-built feature is marked Coming soon; later-phase features are not advertised', () => {
    for (const soon of ['What s converting for you', 'Follow-up drafted after each meeting', 'Prep built on your own pitch', 'Meeting debrief with Milla', 'Objection Coach and roleplay']) {
      const at = text.indexOf(soon)
      expect(at, soon).toBeGreaterThan(-1)
      expect(text.slice(at, at + soon.length + 20), soon).toContain('Coming soon')
    }
    for (const later of ['Deal Coach', 'Deal Review', 'Scorecard', 'Team coaching', 'Manager', 'Win / Loss', 'Win/Loss', 'Winning Moments', 'Playbook', 'Conversion Intelligence', 'transcri', 'recording']) {
      expect(text, later).not.toContain(later)
    }
  })

  it('R136 — no sourcing figure appears in the comparison', () => {
    expect(text).not.toMatch(/\b(250|300|400)\b|leads per|prospects/i)
  })
})
