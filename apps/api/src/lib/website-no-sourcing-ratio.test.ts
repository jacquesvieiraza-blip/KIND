// ⚑ 1 Oct (C2, card #2038) — THE WEBSITE NEVER TELLS A PROSPECT HOW MANY LEADS WE SOURCE PER MEETING.
// R136 ③ (24 Sep): the client never sees the sourcing rate — *"we dont disclose this"*. The
// founder, asked whether to remove the "around 250 leads per meeting" line: *"C2 yes"*.
// The calculator's "Leads we source for it" row printed meetings × 250, which is the same
// number by arithmetic, so it goes too.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const site = (f: string) => readFileSync(join(__dirname, '../../../website', f), 'utf8')
const visible = (html: string) => html
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--[\s\S]*?-->/g, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&[a-z]+;/g, ' ')
  .replace(/\s+/g, ' ')

describe('C2 — no sourcing ratio on the website', () => {
  for (const page of ['pricing.html', 'pipeline-calculator.html']) {
    it(`${page} states no leads-per-meeting figure`, () => {
      const text = visible(site(page))
      expect(text).not.toMatch(/around\s+250/i)
      expect(text).not.toMatch(/250\s+(leads|people|prospects)/i)
      expect(text).not.toMatch(/(for|per)\s+every\s+targeted/i)
    })
  }

  it('the pricing calculator no longer prints the leads it sources (meetings × 250)', () => {
    const html = site('pricing.html')
    expect(html).not.toContain('c-leads')
    expect(html).not.toMatch(/Leads we source/i)
    expect(html).not.toMatch(/\*\s*250/)
  })
})
