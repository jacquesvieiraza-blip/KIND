import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

// #604 — THE FULL SITE IS RESTORED, AND THIS FILE NOW GUARDS THE RESTORATION.
//
// History, because this file has now asserted two opposite things and the flip must be
// explainable: #560 (29 Jul) retired 16 pages and this file pinned the retirement; #603
// (1 Aug) brought Nexus back and the count went to 15; then the founder ruled on the rest —
// *"you shrunk it. i want it back now"* — and #604 emptied the RETIRED map entirely. All 28
// pages are served again with the pre-shrink nav and footer.
//
// The RETIRE MECHANISM is deliberately kept in both front doors (`server.js` RETIRED map,
// `_redirects`) so a future retirement is still one line in each — these tests keep the two
// doors agreeing, which was always the real defect (#560: a page retired at the CDN alone
// stays fully reachable on Express, and vice versa).

const WEB = join(__dirname, '../../../website')
const redirects = readFileSync(join(WEB, '_redirects'), 'utf8')
const server = readFileSync(join(WEB, 'server.js'), 'utf8')

const serverPaths = (() => {
  const block = server.slice(server.indexOf('const RETIRED = {'), server.indexOf('\n}', server.indexOf('const RETIRED = {')))
  return [...block.matchAll(/'(\/[a-z0-9-]+)':\s*'(\/[a-z0-9-]*)'/g)].map(m => ({ from: m[1], to: m[2] }))
})()
const redirectPairs = [...redirects.matchAll(/^(\/[a-z0-9-]+)(?:\.html)?\s+(\/[a-z0-9-]*)\s+301$/gm)]
  .map(m => ({ from: m[1], to: m[2] }))

describe('the full site is restored — founder order, 1 Aug', () => {
  it('NOTHING is retired in server.js', () => {
    expect(serverPaths).toHaveLength(0)
  })

  it('NOTHING is 301d at the CDN', () => {
    expect(redirectPairs).toHaveLength(0)
  })

  // ⛓️ 15 Aug — this asserted `toHaveLength(28)`, which made ADDING a page fail a guard whose
  // subject is DELETION. The restore guarantee is "none of the 28 ever disappeared again", so
  // it is now named rather than counted: every restored page must still be on disk, and new
  // pages (Drop episodes, new surfaces) are free to arrive without tripping it.
  const RESTORED_1_AUG = [
    'about.html', 'demo.html', 'dpa-us.html', 'dpa.html',
    'drop-01.html', 'drop-02.html', 'drop-03.html', 'drop-04.html',
    'drop-05.html', 'drop-06.html', 'drop-07.html', 'drop-08.html',
    'figsy.html', 'help-centre.html', 'index.html', 'milla.html', 'nexus.html',
    'pipeline-calculator.html', 'pricing.html', 'privacy.html', 'solutions.html',
    'status.html', 'support.html', 'terms.html', 'the-drop.html', 'trust.html',
    'vida.html', 'vs-hiring-an-sdr.html',
  ]

  it('every one of the 28 restored pages is STILL on disk — the shrink never deleted', () => {
    const onDisk = new Set(readdirSync(WEB).filter(f => f.endsWith('.html')))
    expect(RESTORED_1_AUG).toHaveLength(28)
    for (const page of RESTORED_1_AUG) expect(onDisk.has(page), `${page} has gone missing`).toBe(true)
  })
})

describe('the two front doors still cannot split — the mechanism survives the restore', () => {
  it('every page retired in server.js (if any ever is again) is also retired at the CDN', () => {
    const cdn = new Set(redirectPairs.map(r => r.from))
    for (const { from } of serverPaths) expect(cdn.has(from), `${from} missing from _redirects`).toBe(true)
  })

  it('and nothing is retired at the CDN that Express still serves', () => {
    const exp = new Set(serverPaths.map(r => r.from))
    for (const { from } of redirectPairs) expect(exp.has(from), `${from} missing from server.js`).toBe(true)
  })

  it('the RETIRED mechanism still exists in server.js, ahead of express.static', () => {
    // Emptied, not removed — a future retirement must not require re-inventing the wiring,
    // and the redirect check must still run BEFORE static serving or it can never fire.
    expect(server).toContain('const RETIRED = {')
    expect(server.indexOf('RETIRED[p]')).toBeLessThan(server.indexOf('app.use(express.static'))
  })

  it('the /* fallback is the LAST rule in _redirects', () => {
    const lines = redirects.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    expect(lines[lines.length - 1]).toMatch(/^\/\*\s+\/index\.html\s+200$/)
  })
})

// ── ONE NAV, ONE FOOTER, EVERY PAGE ─────────────────────────────────────────────────────
// The pre-shrink site kept nav and footer byte-identical across all 28 pages, and that
// identity is what made both the shrink and the restore a single exact replacement instead
// of 28 hand edits. Guard it: a page whose nav drifts becomes un-restorable the same way.
describe('nav and footer are byte-identical across the whole site', () => {
  const pages = readdirSync(WEB).filter(f => f.endsWith('.html'))
  const blockOf = (html: string, start: string, end: string) => {
    const i = html.indexOf(start)
    const j = html.indexOf(end, i)
    expect(i, `missing ${start}`).toBeGreaterThanOrEqual(0)
    return html.slice(i, j + end.length)
  }
  const hash = (s: string) => createHash('md5').update(s).digest('hex')

  it('every page carries the same nav and the same footer', () => {
    const navs = new Set<string>(), foots = new Set<string>()
    for (const p of pages) {
      const html = readFileSync(join(WEB, p), 'utf8')
      navs.add(hash(blockOf(html, '<nav>', '</nav>')))
      foots.add(hash(blockOf(html, '<footer', '</footer>')))
    }
    expect(navs.size, 'nav has drifted on some page').toBe(1)
    expect(foots.size, 'footer has drifted on some page').toBe(1)
  })

  it('the nav is the FULL pre-shrink nav — Nexus, Product, Solutions, Resources, Company', () => {
    const nav = blockOf(readFileSync(join(WEB, 'index.html'), 'utf8'), '<nav>', '</nav>')
    for (const link of ['nexus.html', 'figsy.html', 'milla.html', 'vida.html', 'about.html', 'the-drop.html', 'help-centre.html']) {
      expect(nav, `nav lost its ${link} link`).toContain(`href="${link}"`)
    }
  })

  it('every internal link on every page resolves to a file on disk — no dead ends anywhere', () => {
    const onDisk = new Set(pages)
    for (const p of pages) {
      const html = readFileSync(join(WEB, p), 'utf8')
      const hrefs = [...html.matchAll(/href="([a-z0-9-]+\.html)/g)].map(m => m[1])
      const dead = hrefs.filter(h => !onDisk.has(h))
      expect(dead, `${p} links to missing pages: ${[...new Set(dead)].join(', ')}`).toEqual([])
    }
  })
})
