const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000

// ── #560 — RETIRED PAGES, REDIRECTED AT BOTH FRONT DOORS ─────────────────────────────────
//
// The site is served TWO ways: this Express app on Railway, and Cloudflare Pages using
// `_redirects` (see `_headers` — the CDN is the failover). `_redirects` is a Cloudflare file
// and is completely inert here, so putting the retirements only there would have left every
// retired page fully reachable on the primary host — two files each correct on their own,
// with the bug living in the gap between them. That is the same shape as `normalisePort`
// (#547) and it is why this list exists twice, deliberately, with a test that proves the two
// copies agree (`apps/api/src/lib/website-redirects.test.ts`).
//
// NOTHING IS DELETED — CORE-MAP rule 3 is founder-locked 26 Jul (*"nothing gets deleted"*).
// The files stay on disk; only the route is closed, so removing an entry restores the page.
//
// Targets are the nearest page that answers the same question, never a blanket bounce home:
// somebody who clicked "Pipeline Calculator" wants pricing, not a hero.
const RETIRED = {
  // ── 20 Sep — THE OLD SITE IS RETIRED, FOUNDER-ORDERED ─────────────────────────────────
  //
  // The site was rebuilt on a new design (14 pages, founder-locked). 21 pages from the old
  // site survived the rebuild carrying the OLD chrome, and NOT ONE of them was linked from
  // any of the 14 new pages — verified href by href. The founder's ruling:
  //
  //   "Why would I want these with the old heading and nothing on the new site points to
  //    them... Makes no sense to have two types of websites in one."
  //
  // So they are retired. Three were kept and REBUILT on the new design instead — status,
  // dpa and dpa-us — and those three are linked from the footer of every page, which is
  // what stops this recurring: a page nothing links to is a page that rots.
  //
  // NOTHING IS DELETED — CORE-MAP rule 3, founder-locked 26 Jul (*"nothing gets deleted"*).
  // Every file below is still on disk and `website-redirects.test.ts` proves it. Removing a
  // line here (and its pair in `_redirects`) puts the page back.

  // The Drop — a nine-part content series plus its index. Founder ruled (b) on the overlap
  // question: fold, don't keep two pages doing one job. For Founders is where the same
  // audience and the same argument now live.
  '/the-drop': '/for-founders',
  '/drop-01': '/for-founders',
  '/drop-02': '/for-founders',
  '/drop-03': '/pricing',        // "Pay for results, not promises" IS the pricing model
  '/drop-04': '/for-founders',
  '/drop-05': '/for-founders',
  '/drop-06': '/for-founders',
  '/drop-07': '/for-founders',
  '/drop-08': '/trust',          // "Compliant by default" is answered on Trust & Security
  '/drop-09': '/for-founders',

  // Marketing pages the new design replaced outright.
  '/solutions': '/for-enterprise',        // outbound by industry -> the enterprise page
  '/vs-hiring-an-sdr': '/pricing',        // a cost comparison is a pricing question
  '/pipeline-calculator': '/pricing',     // pricing.html carries the real R81 calculator
  '/demo': '/get-started',                // both are "book time with us"

  // Founder ruling (b), 20 Sep: fold Help Centre into FAQs and Support into Contact rather
  // than keep four pages doing two jobs on two different designs.
  '/help-centre': '/faqs',
  '/support': '/contact',

  // Nexus is the per-client learning brain. It was restored on 1 Aug by founder order
  // (#603/#604) and has been ORPHANED ever since — nothing on the old site or the new site
  // links to it. The founder retired it explicitly on 20 Sep with the rest of the old
  // design. Vida is that engine now, so Vida answers the question the page answered.
  '/nexus': '/vida',

  // 16 Sep — founder: "remove figsy from the site completely... delete figsy.html redirect
  // to vida." FIGSY was the engine's own product page; Vida is that engine now, so Vida is
  // where the question the page answered is still answered. The FILE is left on disk because
  // the 26-Jul CORE-MAP lock is "nothing gets deleted" — the page is off the site, and one
  // removed line here puts it back.
  '/figsy': '/vida',
}


// BEFORE express.static, or static wins and serves the retired page anyway. Both the clean
// URL and the .html form are matched, because `extensions: ['html']` below means the site has
// always answered on both and an old link or a search result may use either.
app.use((req, res, next) => {
  const p = req.path.replace(/\.html$/, '').replace(/\/+$/, '') || '/'
  const target = RETIRED[p]
  if (!target) return next()
  // 301, not 302: search engines transfer the ranking to the replacement rather than
  // re-crawling a page we have retired on purpose.
  res.redirect(301, target)
})

app.use(express.static(path.join(__dirname), {
  extensions: ['html'],
  index: 'index.html',
  setHeaders: (res, filePath) => {
    // HTML must always revalidate so deploys show up immediately (no stale
    // markup behind the CDN/browser cache). Static assets keep long caching.
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate')
    }
  }
}))

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, must-revalidate')
  res.sendFile(path.join(__dirname, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`KIND website running on port ${PORT}`)
})

module.exports = { RETIRED }
