import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// #560 — SHRINK THE SURFACE TO WHAT WE SELL.
//
// Sixteen marketing pages were reachable that no longer describe anything a buyer can buy —
// a page selling FIGSY standalone (we sell Milla&Vida), a status page with nothing monitoring
// production (#199), a nine-part content series. Every one is a page a buyer can land on from
// a search result and a place a bug hides.
//
// THE DEFECT THIS FILE EXISTS TO PREVENT is not the retirement — it is the SPLIT. The site is
// served two ways: Express on Railway (`server.js`) and Cloudflare Pages (`_redirects`).
// `_redirects` is a Cloudflare file and is completely inert under Express, so retiring a page
// in only one place leaves it fully reachable on the other host. Two files each correct on
// their own, with the bug living in the gap — the exact shape of `normalisePort` (#547),
// where the transport did its own `Number()` while a tested guard sat unused next door.
//
// These tests read the REAL files, so the two lists cannot drift apart silently.

const WEB = join(__dirname, '../../../website')
const redirects = readFileSync(join(WEB, '_redirects'), 'utf8')
const server = readFileSync(join(WEB, 'server.js'), 'utf8')

/** The retired paths as `server.js` declares them. */
const serverPaths = (() => {
  const block = server.slice(server.indexOf('const RETIRED = {'), server.indexOf('\n}', server.indexOf('const RETIRED = {')))
  return [...block.matchAll(/'(\/[a-z0-9-]+)':\s*'(\/[a-z0-9-]*)'/g)].map(m => ({ from: m[1], to: m[2] }))
})()

/** The 301 lines in `_redirects`, ignoring the clean-URL/.html duplication. */
const redirectPairs = [...redirects.matchAll(/^(\/[a-z0-9-]+)(?:\.html)?\s+(\/[a-z0-9-]*)\s+301$/gm)]
  .map(m => ({ from: m[1], to: m[2] }))

describe('the two front doors agree — the split this file exists to prevent', () => {
  it('every page retired in server.js is also retired at the CDN', () => {
    const cdn = new Set(redirectPairs.map(r => r.from))
    for (const { from } of serverPaths) expect(cdn.has(from), `${from} missing from _redirects`).toBe(true)
  })

  it('and nothing is retired at the CDN that Express still serves', () => {
    // The dangerous direction: Cloudflare 301s it, Railway serves it, and which one a buyer
    // gets depends on where the DNS points that week.
    const exp = new Set(serverPaths.map(r => r.from))
    for (const { from } of redirectPairs) expect(exp.has(from), `${from} missing from server.js`).toBe(true)
  })

  it('they send you to the SAME place', () => {
    const cdn = new Map(redirectPairs.map(r => [r.from, r.to]))
    for (const { from, to } of serverPaths) expect(cdn.get(from), from).toBe(to)
  })

  // 16 on 29 Jul (#560); 15 from 1 Aug — the founder asked for Nexus back, so `/nexus` was
  // un-retired and the page rejoined KEPT below. The count is asserted rather than derived
  // precisely so an un-retirement has to be a decision someone writes down, not a quiet edit.
  it('fifteen pages are retired — one fewer since Nexus came back', () => {
    expect(serverPaths).toHaveLength(15)
  })
})

describe('the redirects are useful, not a blanket bounce home', () => {
  it('a retired page goes to the nearest page that answers the same question', () => {
    const to = new Map(serverPaths.map(r => [r.from, r.to]))
    // Somebody who clicked "Pipeline Calculator" wants pricing, not a hero.
    expect(to.get('/pipeline-calculator')).toBe('/pricing')
    expect(to.get('/vs-hiring-an-sdr')).toBe('/pricing')
    expect(to.get('/help-centre')).toBe('/support')
    expect(to.get('/status')).toBe('/support')
    // FIGSY is the engine UNDER Milla&Vida, not a thing you buy (pivot locked 22 Jul).
    expect(to.get('/figsy')).toBe('/milla')
  })

  it('every target is a page we KEPT — a redirect into another redirect is a loop', () => {
    const retired = new Set(serverPaths.map(r => r.from))
    for (const { from, to } of serverPaths) {
      expect(retired.has(to), `${from} redirects to ${to}, which is itself retired`).toBe(false)
    }
  })

  it('301, never 302 — the ranking should transfer, not be re-crawled forever', () => {
    expect(redirects).not.toMatch(/^\/[a-z0-9-]+.*\s302$/m)
    expect(server).toContain('res.redirect(301')
  })
})

describe('the catch-all cannot swallow the redirects', () => {
  it('the /* fallback is the LAST rule in _redirects', () => {
    // Cloudflare takes the FIRST matching rule. A `/*` above the 301s would swallow every one
    // of them and the whole retirement would silently do nothing.
    const lines = redirects.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    expect(lines[lines.length - 1]).toMatch(/^\/\*\s+\/index\.html\s+200$/)
  })

  it('the Express redirect runs BEFORE express.static, or static serves the page anyway', () => {
    // Anchored on `app.use(express.static`, the CODE — not the bare string `express.static`,
    // which also appears in the comment ABOVE the redirect explaining why the order matters.
    // Matching the comment made this assert that the redirect came before its own rationale,
    // which is always true and proves nothing. (It failed on first run and caught itself.)
    expect(server.indexOf('RETIRED[p]')).toBeLessThan(server.indexOf('app.use(express.static'))
  })

  it('both the clean URL and the .html form are caught', () => {
    // The site answers on both (`extensions: ['html']`), so an old link or a search result
    // may use either.
    expect(server).toContain("replace(/\\.html$/, '')")
    expect(redirects).toContain('/figsy.html')
  })
})

// ── THE PAGES WE KEPT MUST NOT LINK TO THE PAGES WE RETIRED ──────────────────────────────
// A live link that 301s is not broken, but it is a dead end mid-journey: the buyer clicks
// "Nexus" in the nav and lands somewhere else, which reads as a broken site.
describe('no kept page links to a retired one', () => {
  const KEPT = ['index', 'pricing', 'milla', 'vida', 'demo', 'solutions', 'support', 'trust',
                'terms', 'privacy', 'dpa', 'dpa-us', 'nexus']
  const retired = serverPaths.map(r => r.from.slice(1))

  for (const page of KEPT) {
    it(`${page}.html has no link to a retired page`, () => {
      const html = readFileSync(join(WEB, `${page}.html`), 'utf8')
      const bad = retired.filter(r => new RegExp(`href="/?${r}(\\.html)?["#]`).test(html))
      expect(bad, `${page}.html still links to: ${bad.join(', ')}`).toEqual([])
    })
  }

  it('the kept set is exactly what is left reachable', () => {
    const onDisk = readdirSync(WEB).filter(f => f.endsWith('.html')).map(f => f.replace('.html', ''))
    expect(onDisk.sort()).toEqual([...KEPT, ...retired].sort())
  })

  it('NOTHING WAS DELETED — every retired file is still on disk', () => {
    // CORE-MAP rule 3, founder-locked 26 Jul: "nothing gets deleted". Retiring a route is
    // reversible by removing one line; deleting the file is not.
    const onDisk = new Set(readdirSync(WEB).filter(f => f.endsWith('.html')))
    for (const r of retired) expect(onDisk.has(`${r}.html`), `${r}.html was deleted`).toBe(true)
  })
})
