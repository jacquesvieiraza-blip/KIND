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
  // The engine is no longer sold standalone (pivot locked 22 Jul: FIGSY is the engine UNDER
  // Milla&Vida, not a thing you buy). Its page sold exactly that.
  '/figsy': '/milla',
  // A status page with NOTHING monitoring production (#199). One that cannot tell the truth
  // is worse than none.
  '/status': '/support',
  // Overlaps support.html, which is the page we actually maintain.
  '/help-centre': '/support',
  // A marketing calculator; pricing.html already carries the real one.
  '/pipeline-calculator': '/pricing',
  // A cost comparison — the question it answers is a pricing question.
  '/vs-hiring-an-sdr': '/pricing',
  // The company story is on the homepage; the standalone page is not on the buyer's path.
  '/about': '/',
  // Nine pages of content/podcast series. Not the sell, and nine more pages to keep true.
  '/the-drop': '/',
  '/drop-01': '/', '/drop-02': '/', '/drop-03': '/', '/drop-04': '/',
  '/drop-05': '/', '/drop-06': '/', '/drop-07': '/', '/drop-08': '/',
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
