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

// ⛓️ 16 Sep — THE MAP IS NO LONGER EMPTY, AND "EMPTY" WAS NEVER THE GUARANTEE.
//
// The founder retired FIGSY as a name and as a page: "remove figsy from the site completely...
// delete figsy.html redirect to vida." So `/figsy` is retired at both front doors and this
// file goes back to doing what its own header says it is for — keeping the two doors
// agreeing. Asserting length 0 only ever encoded "nothing is retired TODAY"; the real defect
// #560 found was a page retired at one door and reachable at the other, and that is what is
// asserted below. The 1-Aug restore is still guarded, by name, in RESTORED_1_AUG.
const RETIRED_NOW = [{ from: '/figsy', to: '/vida' }]

describe('retirements are the same at both front doors', () => {
  it('server.js retires exactly what we expect', () => {
    expect(serverPaths).toEqual(RETIRED_NOW)
  })

  it('the CDN 301s exactly the same paths, to the same targets', () => {
    // Both the clean URL and the .html form are matched at the CDN, so the pair list can
    // carry a path twice; what must hold is that the SET agrees with Express.
    const uniq = [...new Map(redirectPairs.map(r => [r.from, r])).values()]
    expect(uniq).toEqual(RETIRED_NOW)
  })

  it('no retired page is still linked from any page on the site', () => {
    const pages = readdirSync(WEB).filter(f => f.endsWith('.html'))
    for (const { from } of RETIRED_NOW) {
      const file = from.slice(1) + '.html'
      for (const page of pages) {
        if (page === file) continue
        expect(readFileSync(join(WEB, page), 'utf8')).not.toContain(`href="${file}"`)
      }
    }
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

  // ⛓️ 20 Sep — TWO SETS, EACH INTERNALLY IDENTICAL, WHILE THE MIGRATION IS HALF DONE.
  //
  // The founder locked a new fourteen-page site and it is now built. Those pages carry the new
  // chrome; the twenty-one legacy pages still carry the old. Asserting ONE nav across all
  // thirty-five would force both CSS systems to be swept in a single change — two incompatible
  // stylesheets, twenty-one working pages, one commit — which is how a site gets broken in the
  // name of a green suite.
  //
  // So the identity requirement is kept in full and applied per set. Drift inside either set
  // still fails, which is the thing this guard was written to catch. What it no longer does is
  // demand that the half-migrated site pretend to be finished.
  //
  // ⚠️ THIS IS A MIGRATION STATE, NOT THE DESTINATION. When the legacy pages take the new
  // chrome, the two sets collapse back into one and this splits back into a single assertion.
  const NEW_SITE = ['index.html', 'milla.html', 'vida.html', 'for-founders.html',
    'for-enterprise.html', 'pricing.html', 'about.html', 'faqs.html', 'trust.html',
    'contact.html', 'terms.html', 'privacy.html', 'cookies.html', 'get-started.html']

  it('every page carries the same nav and the same footer, within its own set', () => {
    for (const [label, set] of [
      ['new site', pages.filter(p => NEW_SITE.includes(p))],
      ['legacy', pages.filter(p => !NEW_SITE.includes(p))],
    ] as [string, string[]][]) {
      expect(set.length, `the ${label} set is empty — this guard is asserting nothing`).toBeGreaterThan(5)
      const navs = new Set<string>(), foots = new Set<string>()
      for (const p of set) {
        const html = readFileSync(join(WEB, p), 'utf8')
        // the new site's header is <header class="site-header"> with <nav class="nav"> inside;
        // the legacy pages use a bare <nav>. Take whichever the page actually has.
        const navStart = html.includes('<header class="site-header">') ? '<header' : '<nav>'
        const navEnd = navStart === '<header' ? '</header>' : '</nav>'
        // The current-page marker is not drift — it is the nav doing its job, and it is what
        // makes the header differ on every page by design. Normalise it away so this compares
        // the SHAPE, which is the thing that must not diverge.
        navs.add(hash(blockOf(html, navStart, navEnd).replace(/class="active"/g, 'class=""')))
        foots.add(hash(blockOf(html, '<footer', '</footer>')))
      }
      expect(navs.size, `${label}: nav has drifted on some page`).toBe(1)
      expect(foots.size, `${label}: footer has drifted on some page`).toBe(1)
    }
  })

  // ⛓️ REWRITTEN 16 Sep (R124 session) — THE NAV WAS DELIBERATELY SHRUNK, SO THE GUARD PINS THE
  // SHRINK INSTEAD OF FORBIDDING IT.
  //
  // This assertion demanded the FULL pre-shrink nav, because the shrink it was written against
  // was an accident nobody had approved. The founder has now ruled the opposite — "Nexus is
  // out. Product all of it is out." — so the assertion, left alone, would have held the
  // correction OUT rather than protecting the site. It failed for seven commits before anyone
  // ran it, which is its own lesson: a guard is only a guard if it is in the set that runs.
  //
  // What it pins now is the founder's nav. The byte-identity check above is unchanged and is
  // what makes one page's worth of truth true for all 29.
  // ⛓️ REWRITTEN 16 Sep — SECTION 1, THE SHARED HEADER. Founder-locked shape:
  //
  //     [M&V]   About Us   Pricing              Client login   [ Book a walkthrough ]
  //
  // The previous version pinned a four-item nav with three dropdowns. The founder has ruled
  // the header down to two links and two actions, so that assertion would now forbid the very
  // shape it is meant to protect. It is re-pointed, not deleted — third time on this file, and
  // each time for the same reason: the guard pins the CURRENT founder-locked nav, whatever it is.
  //
  // ⚠️ THE DESTINATIONS THAT LEFT THE HEADER ARE NOT GONE FROM THE SITE. Solutions, The Drop,
  // Help Centre and Nexus are footer/secondary work in later sections and their files are
  // untouched (P2). This guard deliberately says nothing about where they live — asserting a
  // footer shape here would fail the moment the footer section is built.
  // ⛓️ REWRITTEN 20 Sep — FOURTH TIME, AND FOR THE SAME REASON AS THE OTHER THREE.
  //
  // The founder has locked a new header on the new site:
  //
  //   [M&V]  For Founders  For Enterprise  Pricing  About Us      Client login  [ Get started ]
  //
  // The previous version pinned "About Us, Pricing, and the two actions" with a Book a
  // walkthrough CTA. Left alone it would forbid the very header it exists to protect — exactly
  // what happened in September and in July before that. The guard pins the CURRENT
  // founder-locked nav, whatever it is; that has never changed and is not changing here.
  //
  // ⚠️ CLIENT LOGIN IS ASSERTED ON PURPOSE. The locked previews had no login link at all, and
  // sixty-nine links on the old site pointed at it — an existing client would have had no way
  // in. It was restored during the build and this is what stops it being dropped again.
  it('the nav is the founder-locked header — the four sections, Client login and Get started', () => {
    const header = blockOf(readFileSync(join(WEB, 'index.html'), 'utf8'), '<header', '</header>')
    expect(header, 'nav lost For Founders').toContain('href="for-founders.html"')
    expect(header, 'nav lost For Enterprise').toContain('href="for-enterprise.html"')
    expect(header, 'nav lost Pricing').toContain('href="pricing.html"')
    expect(header, 'nav lost About Us').toContain('href="about.html"')
    expect(header, 'nav lost Client login').toContain('https://app.get-kind.com/login')
    expect(header, 'nav lost Get started').toContain('href="get-started.html"')
    expect(header, 'nav lost the M&V mark').toContain('logo-mv-v2.png')
    for (const label of ['For Founders', 'For Enterprise', 'Pricing', 'About Us',
                         'Client login', 'Get started']) {
      expect(header, `nav lost the "${label}" label`).toContain('>' + label + '<')
    }
  })

  it('🛑 the header carries NO dropdowns and no retired commercial model', () => {
    // Reads the whole <header> now, not the inner <nav> — a dropdown or a price reappearing
    // just outside the <nav> tag would be the same defect and this must still catch it.
    const nav = blockOf(readFileSync(join(WEB, 'index.html'), 'utf8'), '<header', '</header>')
    // Founder: "No dropdowns." The mega-menu markup is the hover-only structure that was
    // unopenable on touch — removing it removes that defect by construction rather than
    // patching it. These assertions are what stop it coming back.
    for (const gone of ['nav-dropdown', 'nav-item', 'chevron', 'mm-link', 'mm-head', 'mm-grid', 'mm-feat', 'mm-new']) {
      expect(nav, `the ${gone} dropdown markup is back in the header`).not.toContain(gone)
    }
    expect(nav, 'the Product mega-menu is back').not.toContain('The product &middot; your AI agents')
    // The mega-menu promo card carried "You only pay $4 when you approve a lead" into the nav
    // of all 29 pages — one of the three shared-chrome strings that put the retired commercial
    // model on every page of the site. It must never return with a restored menu.
    expect(nav, 'the nav is selling the retired per-lead model again').not.toContain('$4')
    expect(nav, 'the retired calculator is linked from the header again').not.toContain('pipeline-calculator.html')
  })

  // 🛑 THE MOBILE HEADER, GUARDED AT THE CASCADE RATHER THAN THE SCREENSHOT.
  //
  // Every page's inline <style> still carries `@media (max-width:768px){ .nav-links{display:none} }`
  // from when the nav was five dropdowns wide. `kind.css` is linked AFTER that block and its
  // `.nav-links{display:flex}` is unconditional, so for as long as both existed the mobile rule
  // was being cancelled by accident rather than by decision — the links rendered on a phone
  // with nothing sizing them. Section 1 makes it deliberate. This pins the deliberate part:
  // if someone deletes the mobile block from kind.css, the inline `display:none` silently wins
  // again and the phone header loses its links with every test still green.
  it('kind.css states the mobile header deliberately, overriding the inline display:none', () => {
    const css = readFileSync(join(WEB, 'kind.css'), 'utf8')
    expect(css, 'the mobile header block is gone from kind.css').toMatch(/@media \(max-width:768px\)\{[\s\S]*?\.nav-links\{ display:flex; \}/)
    expect(css, 'the narrow-phone row split is gone').toMatch(/@media \(max-width:560px\)/)
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
