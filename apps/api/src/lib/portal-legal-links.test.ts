// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 1 Oct (R182 · W-2 "broken portal links") — THE PORTAL'S LEGAL PAGES LINK TO PAGES THAT EXIST.
//
// `apps/portal/public/{terms,privacy}.html` are served from app.get-kind.com, but their nav and
// footer linked `pricing.html`, `about.html`, `support.html`, `trust.html`, `dpa.html`,
// `use-cases.html` and `vs-apollo.html` relative to it — where none of them exist, so every one was
// a 404. Website pages now link to get-kind.com; pages that exist nowhere are removed.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const APPS = join(__dirname, '../../..')
const PUBLIC = join(APPS, 'portal/public')
const WEBSITE = join(APPS, 'website')
const retired = (() => {
  const src = readFileSync(join(WEBSITE, 'server.js'), 'utf8')
  const block = src.slice(src.indexOf('const RETIRED = {'), src.indexOf('\n}', src.indexOf('const RETIRED = {')))
  return new Set([...block.matchAll(/'\/([a-z0-9-]+)':/g)].map(m => m[1]))
})()

for (const f of ['terms.html', 'privacy.html']) {
  describe(`portal/public/${f}`, () => {
    const hrefs = [...readFileSync(join(PUBLIC, f), 'utf8').matchAll(/href="([^"]+)"/g)].map(m => m[1])

    it('there are links to check', () => { expect(hrefs.length).toBeGreaterThan(10) })

    it('🛑 every relative link is a file the portal actually serves', () => {
      const bad = hrefs.filter(h => /^[a-z0-9-]+\.html$/.test(h) && !existsSync(join(PUBLIC, h)))
      expect(bad).toEqual([])
    })

    it('🛑 every get-kind.com link is a live website page', () => {
      const bad = hrefs.filter(h => h.startsWith('https://get-kind.com/')).map(h => h.slice('https://get-kind.com/'.length))
        .filter(p => p !== '' && (!existsSync(join(WEBSITE, `${p}.html`)) || retired.has(p)))
      expect(bad).toEqual([])
    })
  })
}
