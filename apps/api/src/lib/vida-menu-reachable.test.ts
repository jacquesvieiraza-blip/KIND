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
const layout = readFileSync(join(ADMIN, 'app/vida/layout.tsx'), 'utf8')

/** Every href the Vida account menu offers. */
const menuHrefs = [...layout.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1])

describe('the Vida menu can reach every operator screen that exists', () => {
  it('PARTNERS is in the menu — it creates logins that read commission money (R40)', () => {
    expect(menuHrefs).toContain('/partners')
  })

  it('and the page it points at is really there', () => {
    expect(existsSync(join(ADMIN, 'app/partners/page.tsx'))).toBe(true)
  })

  it('the seat-creation card is on that page, so the menu entry leads somewhere useful', () => {
    const page = readFileSync(join(ADMIN, 'app/partners/page.tsx'), 'utf8')
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
