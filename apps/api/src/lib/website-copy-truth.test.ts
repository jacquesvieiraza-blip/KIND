// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R182 · W-2) — THE REST OF THE WEBSITE SAYS ONLY WHAT IS TRUE TODAY.
//
// The 1 Oct website check found claims on live pages that nothing in the product backs: a
// sending domain and warm-up we don't run, MFA and "zero standing access" nobody can evidence,
// "no bot" on replies Milla drafts, a plumbers-and-roofers market we don't sell to, a partner
// enquiry route for a programme that is frozen, an incident history nobody keeps, "no self-serve
// signup" when there is one (W-5), "200+" overlapping Growth's 200, and the shortfall credit
// stated without its limits. The founder: "all yes" (W-2), preview "approved".
// `legal-pages-truth.test.ts` guards the legal pages; this guards everything else a visitor reads.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const WEB = join(__dirname, '../../../website')
const read = (f: string) => readFileSync(join(WEB, f), 'utf8')
const visible = (html: string) => html
  .replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
  .replace(/<[^>]+>/g, ' ').replace(/&rsquo;/g, '’').replace(/&mdash;/g, '—').replace(/&ndash;/g, '–')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ')

/** Pages a visitor can reach: everything on disk minus what server.js retires. */
const LIVE = (() => {
  const src = read('server.js')
  const block = src.slice(src.indexOf('const RETIRED = {'), src.indexOf('\n}', src.indexOf('const RETIRED = {')))
  const retired = new Set([...block.matchAll(/'\/([a-z0-9-]+)':/g)].map(m => m[1] + '.html'))
  return readdirSync(WEB).filter(f => f.endsWith('.html') && !retired.has(f))
})()
const SITE = LIVE.map(f => [f, visible(read(f))] as const)

const BANNED: Array<[RegExp, string]> = [
  [/send\.get-kind\.com/, 'a sending domain we do not send from'],
  [/Domain warming/i, 'a warm-up we do not run'],
  [/MFA enforced/i, 'an MFA claim nobody can evidence'],
  [/Zero standing access/i, 'an access claim nobody can evidence'],
  [/branch-protected/i, 'a repository claim nobody can evidence'],
  [/no bot replying/i, 'Milla drafts replies — a person checks them'],
  [/a person on our team writes the answer/i, 'Milla drafts replies — a person checks them'],
  [/Plumbers, heating engineers/i, 'a market we do not sell to'],
  [/No incidents reported/i, 'an incident history nobody keeps'],
  [/no self-serve signup/i, 'there is a free self-serve account (W-5)'],
  [/Partner \/ other/, 'the partner programme is frozen'],
  [/200\+/, 'Enterprise is 201+ (200 is Growth)'],
]

describe('W-2 — the live website copy says only what is true', () => {
  it('there are live pages to check — otherwise every assertion below is vacuous', () => {
    expect(LIVE.length).toBeGreaterThan(10)
    for (const f of ['index.html', 'trust.html', 'faqs.html', 'contact.html', 'pricing.html']) expect(LIVE).toContain(f)
  })

  for (const [re, why] of BANNED) {
    it(`🛑 no live page says ${re} — ${why}`, () => {
      const hits = SITE.filter(([, t]) => re.test(t)).map(([f]) => f)
      expect(hits, `${re} on ${hits.join(', ')}`).toEqual([])
    })
  }

  it('🛑 every promise of the shortfall credit carries its limit — once per client, 90 days', () => {
    const bare: string[] = []
    for (const [f, t] of SITE) {
      for (const m of t.matchAll(/credited (?:toward|against|to your account toward) your next programme[^.]*\.(?:[^.]*\.)?/g)) {
        if (!/once per client/.test(m[0]) || !/90 days/.test(m[0])) bare.push(`${f}: ${m[0]}`)
      }
    }
    expect(bare).toEqual([])
  })

  it('the true replacements are in place', () => {
    const page = (f: string) => SITE.find(([n]) => n === f)![1]
    expect(page('trust.html')).toMatch(/We source prospects from Apollo\.io, a licensed B2B data provider/)
    expect(page('faqs.html')).toMatch(/Milla drafts the answer and a person on our team checks it/)
    expect(page('get-started.html')).toMatch(/You can create a free account and start with Milla yourself/)
    expect(page('pricing.html')).toMatch(/Enterprise — 201\+ employees/)
  })
})
