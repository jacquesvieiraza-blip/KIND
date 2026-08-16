import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// ── AN AUTH LINK MUST POINT AT A PAGE THAT EXISTS (16 Aug) ──────────────────────────────
//
// The founder walked the Client Partner seat and hit a 404 one click into it. The cause:
// `login/page.tsx` had been sending every password-reset email to `/auth/reset` — a route
// nobody had ever built. Not a regression; it had never worked. So no client had ever
// recovered a password, and a Client Partner seat (whose random password is never told to
// anyone) had no way in at all.
//
// 2,286 tests were green. They were green because the login page is correct on its own and
// the app router is correct on its own — the bug lived in the GAP, in a string pointing at a
// route. That is the same shape as the Vida menu bug fixed in #1342 a few hours earlier, and
// twice in one day is a class, not an accident. So the link targets get resolved against the
// filesystem here.
//
// This test deliberately follows the `?next=` hop as well. After the fix the reset email goes
// to `/auth/callback?next=/auth/reset`, so checking only the first path would prove nothing
// about where the person actually lands.

const PORTAL = join(__dirname, '../../../portal/src')
const APP = join(PORTAL, 'app')
const login = readFileSync(join(APP, '(auth)/login/page.tsx'), 'utf8')
const mw = readFileSync(join(PORTAL, 'middleware.ts'), 'utf8')

const isGroup = (d: string) => d.startsWith('(') && d.endsWith(')')

/** Every URL path the portal can actually serve — pages AND route handlers. */
function servableRoutes(): string[] {
  const out = new Set<string>()
  const walk = (dir: string, urlPrefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith('_')) continue
      const here = join(dir, entry.name)
      const prefix = isGroup(entry.name) ? urlPrefix : `${urlPrefix}/${entry.name}`
      if (!isGroup(entry.name)) {
        if (existsSync(join(here, 'page.tsx'))) out.add(prefix)
        if (existsSync(join(here, 'route.ts'))) out.add(prefix)
      }
      walk(here, prefix)
    }
  }
  walk(APP, '')
  if (existsSync(join(APP, 'page.tsx'))) out.add('/')
  return [...out].sort()
}

/** Every `redirectTo: ${window.location.origin}/…` target in the portal's auth flows. */
function redirectTargets(): string[] {
  return [...login.matchAll(/redirectTo:\s*`\$\{window\.location\.origin\}([^`]+)`/g)].map(m => m[1])
}

const routes = servableRoutes()

describe('every auth redirect points at a route that exists', () => {
  it('the walker actually found routes (a guard that enumerates nothing passes everything)', () => {
    expect(routes.length).toBeGreaterThan(8)
    expect(routes).toContain('/login')
    expect(routes).toContain('/auth/callback')
  })

  it('the auth flows declare redirect targets at all', () => {
    // If someone rewrites these with a different syntax this test would silently check
    // nothing, so assert the extraction still finds them.
    expect(redirectTargets().length).toBeGreaterThanOrEqual(2)
  })

  for (const target of redirectTargets()) {
    it(`redirect target ${target} resolves to a real route`, () => {
      const [path, query = ''] = target.split('?')
      expect(routes, `${path} is a redirect target with no page or route handler on disk`).toContain(path)

      // Follow the hop. `/auth/callback?next=/auth/reset` is only as good as /auth/reset.
      const next = new URLSearchParams(query).get('next')
      if (next) {
        expect(routes, `${target} forwards to ${next}, which does not exist`).toContain(next)
      }
    })
  }

  it('password reset goes THROUGH the callback — the code must be exchanged first', () => {
    // /auth/reset now exists, so a pointer straight at it would pass the resolver above while
    // still being broken: the page would load with no session and tell everyone their link had
    // expired. The route through /auth/callback is the part that makes it work.
    expect(login).toMatch(/resetPasswordForEmail\([\s\S]{0,200}?\/auth\/callback\?next=\/auth\/reset/)
    expect(login).not.toMatch(/redirectTo:\s*`\$\{window\.location\.origin\}\/auth\/reset`/)
  })
})

describe('a Client Partner can reach her own portal', () => {
  it('client-partner survives the /dashboard redirect — it did not, and she landed on Milla', () => {
    // The live bug: `KEEP` listed only partner + developer, so /dashboard/client-partner fell
    // through to `MAP[seg] ?? '/milla'` and she was redirected to the CLIENT lead desk — the
    // one surface R40 says she must never see.
    const keep = mw.match(/const KEEP = new Set\(\[([^\]]+)\]\)/)
    expect(keep, 'the KEEP set is gone or was rewritten — re-point this guard').toBeTruthy()
    expect(keep![1]).toContain("'client-partner'")
  })

  it('her page exists at the path the KEEP set protects', () => {
    expect(existsSync(join(APP, '(seat)/dashboard/client-partner/page.tsx'))).toBe(true)
    expect(routes).toContain('/dashboard/client-partner')
  })

  it('her portal is NOT inside the CLIENT shell — it showed her a wallet and FIGSY', () => {
    // The founder signed in as her and got the client chrome wrapped around her page:
    // a wallet balance, a red "no credits — top up" banner, and the FIGSY panel. Two are
    // client money ("her cut only") and the third is the sourcing tool ("her own network
    // only"). The client layout already carries four `!isPartner` guards and still missed
    // these three, which is the argument against a shared shell rather than for a fifth
    // guard: every new client feature is one more thing that must remember she exists.
    expect(existsSync(join(APP, '(dashboard)/dashboard/client-partner'))).toBe(false)
  })

  it('the seat shell renders no client money and no sourcing tool', () => {
    const shell = readFileSync(join(APP, '(seat)/layout.tsx'), 'utf8')
    const code = shell.split('\n').filter(l => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n')
    for (const forbidden of ['AgentColumn', 'LowCreditsNotice', 'creditBalance', 'wallet', 'Sidebar']) {
      expect(code, `the seat shell references ${forbidden} — that is client surface`).not.toContain(forbidden)
    }
  })

  it('signing in sends a client_partner seat to HER page, not the legacy partner dashboard', () => {
    expect(login).toContain("seat_type === 'client_partner'")
    expect(login).toMatch(/client_partner'[\s\S]{0,80}?\/dashboard\/client-partner/)
  })
})
