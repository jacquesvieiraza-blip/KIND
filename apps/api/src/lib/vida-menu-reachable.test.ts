// A CONTROL YOU CANNOT FIND IS NOT A CONTROL — the menu-reachability guard.
//
// Twice now a working screen has existed with no way to open it. `/vida/demo` shipped
// invisible (the layout's own comment records it: "the only way to open a demo account was
// to know the URL... the one screen you reach under time pressure in front of a prospect").
// Then on 16 Aug the founder went looking for the screen that creates a Client Partner's
// login, minutes after it shipped, and it was not in his menu either — it lived only in the
// OLD AdminSidebar that the Vida menu replaced.
//
// Rendering was never the problem in either case. REACHABILITY was — the same gap #644 hit
// on the client side, where a reply existed and nothing opened it. So this file asserts the
// menu, not the page.
//
// RED PROOF: delete the '/partners' entry from vida/layout.tsx → "every operator screen is
// in the menu" fails by name.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const ADMIN = join(__dirname, '../../../admin/src')

// ⛓️ RETARGETED 9 Sep — SAME DUTY, THE SOURCE OF TRUTH MOVED. These hrefs used to be read out
// of `vida/layout.tsx`, because that file held the destination arrays. The approved
// two-workspace architecture moved them into `lib/vida-nav.ts` as data, so reading the layout
// now finds only the two workspace links in the operator menu — and every case below would
// pass or fail for reasons that have nothing to do with reachability.
//
// 🛑 THE RULE IS UNCHANGED AND IS THE WHOLE POINT OF THIS FILE: a working screen with no way to
// open it has shipped three times on this console. It is now asked of the nav module.
const nav = readFileSync(join(ADMIN, 'lib/vida-nav.ts'), 'utf8')
const navCode = nav.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
  .join('\n')

/** Every href the two workspaces offer. `route:` entries are retirement receipts, not rows. */
const menuHrefs = [...navCode.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1])

describe('the Vida menu can reach every operator screen that exists', () => {
  it('PARTNERS is in the menu — it creates logins that read commission money (R40)', () => {
    expect(menuHrefs).toContain('/vida/partners')
  })

  // ⛓️ The first fix pointed the menu at `/partners`, the OLD console — one click and the
  // operator left the Vida shell. A menu entry that ejects you from the console it belongs
  // to is the same class of miss as one that isn't there at all.
  it('EVERY menu entry stays inside the Vida console', () => {
    const escapes = menuHrefs.filter(h => h.startsWith('/') && !h.startsWith('/vida'))
    expect(escapes, `menu entries that leave Vida: ${escapes.join(', ')}`).toEqual([])
  })

  it('the seat-creation card is on the Vida page, so the entry leads somewhere useful', () => {
    const page = readFileSync(join(ADMIN, 'app/vida/partners/page.tsx'), 'utf8')
    expect(page).toContain('New Client Partner seat')
    expect(page).toContain('/api/proxy/operator/seats/client-partner')
  })

  it('demo accounts stayed reachable too — the first instance of this bug must not regress', () => {
    expect(menuHrefs).toContain('/vida/demo')
  })

  it('every menu href points at a route that exists on disk', () => {
    // Catches the opposite failure: a menu entry that 404s.
    const missing: string[] = []
    for (const href of menuHrefs) {
      if (!href.startsWith('/')) continue
      const seg = href.replace(/^\//, '')
      const candidates = [
        join(ADMIN, 'app', seg, 'page.tsx'),
        join(ADMIN, 'app', seg, 'page.ts'),
      ]
      if (!candidates.some(existsSync)) missing.push(href)
    }
    expect(missing, `menu entries with no page: ${missing.join(', ')}`).toEqual([])
  })
})
