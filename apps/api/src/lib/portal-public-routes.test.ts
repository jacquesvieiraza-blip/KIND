import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// #560 (PR 2) — THE PORTAL HALF: A ROUTE IS PUBLIC ON PURPOSE, OR IT FAILS THIS TEST.
//
// Three routes were reachable with no session and no comment: `consent`, `invite/accept` and
// `share/[token]`. The problem is not that they are public — all three should be. It is that
// **nothing distinguished "we decided this is public" from "nobody thought about it"**, and
// those two look identical in the one file whose job is deciding who gets in.
//
// That is not hypothetical here. #478 found `partner-preview` — a fake partner dashboard —
// exposed to the whole internet by exactly this shape: a page added, a gate never considered,
// and no reader able to tell the difference afterwards.
//
// So the decision is written down in `middleware.ts` and this test enumerates the real app
// directory. A new page that is neither gated nor documented FAILS THE GATE, which is the
// only version of this that survives the next person in a hurry.

const PORTAL = join(__dirname, '../../../portal/src')
const APP = join(PORTAL, 'app')
const mw = readFileSync(join(PORTAL, 'middleware.ts'), 'utf8')

/** Route-group folders — `(milla)` etc. contribute nothing to the URL. */
const isGroup = (d: string) => d.startsWith('(') && d.endsWith(')')

/** Every top-level URL segment the app can actually serve. */
function topLevelRoutes(): string[] {
  const out = new Set<string>()
  const walk = (dir: string, urlPrefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      if (entry.name === 'api' || entry.name.startsWith('_')) continue
      const nextPrefix = isGroup(entry.name) ? urlPrefix : `${urlPrefix}/${entry.name}`
      if (isGroup(entry.name)) { walk(join(dir, entry.name), nextPrefix); continue }
      if (existsSync(join(dir, entry.name, 'page.tsx'))) out.add(nextPrefix)
      else walk(join(dir, entry.name), nextPrefix)   // a layout-only folder, e.g. invite/
    }
  }
  walk(APP, '')
  if (existsSync(join(APP, 'page.tsx'))) out.add('/')
  return [...out].sort()
}

/** Paths middleware explicitly documents as public. */
const declaredPublic = [...mw.matchAll(/\{\s*path:\s*'([^']+)'/g)].map(m => m[1])

/** Prefixes middleware actually gates (redirects when there is no user, or by allowlist). */
const GATED = ['/dashboard', '/milla', '/partner-preview', '/v2', '/billing/confirm']

const routes = topLevelRoutes()

describe('every route is gated or declared public — never neither', () => {
  it('the app has routes to check at all (the walker is not silently returning nothing)', () => {
    // A test that enumerates nothing passes everything. This is the guard on the guard.
    expect(routes.length).toBeGreaterThan(8)
    expect(routes).toContain('/consent')
    expect(routes).toContain('/milla')
  })

  for (const route of topLevelRoutes()) {
    it(`${route} is accounted for`, () => {
      const gated = GATED.some(g => route === g || route.startsWith(`${g}/`))
      const declared = declaredPublic.some(p => route === p || p.startsWith(`${route}/`) || route.startsWith(`${p}/`))
      expect(
        gated || declared,
        `${route} is neither gated in middleware nor listed in PUBLIC_ROUTES. If it should be public, add it with a reason; if not, gate it.`,
      ).toBe(true)
    })
  }
})

describe('the three #560 named are decided, with the reason recorded', () => {
  const reasonFor = (path: string) => {
    const i = mw.indexOf(`path: '${path}'`)
    expect(i, `${path} is not declared in PUBLIC_ROUTES`).toBeGreaterThan(-1)
    return mw.slice(i, i + 1400)
  }

  it('consent — the prospect has no account, and the TOKEN is the credential', () => {
    const why = reasonFor('/consent')
    expect(why).toContain('no account')
    expect(why).toContain('token')
    // Consent is a legal requirement, not a feature — gating it breaks POPIA collection.
    expect(why).toContain('legal requirement')
  })

  it('invite/accept — a redirect would DESTROY the token it was protecting', () => {
    // The non-obvious reason, and the one most likely to be "fixed" into a bug by someone
    // adding a gate that looks correct.
    const why = reasonFor('/invite/accept')
    expect(why).toContain('DROP THE ?token')
    expect(why).toContain('#266')
  })

  it('share/[token] — public IS the feature, and the dead generator is flagged', () => {
    const why = reasonFor('/share/[token]')
    expect(why).toContain('unguessable')
    // The finding that matters: no client can obtain a share link any more, because the only
    // UI that produces one lives in (dashboard), which this middleware redirects away.
    expect(why).toContain('no NEW link can be generated')
  })

  it('every declared public route carries a WHY — a list without reasons is a shrug', () => {
    // Two details, both learned by this assertion failing:
    //  • `[\s\S]` rather than `.` — the multi-line entries are the LONG ones, i.e. exactly
    //    the reasons that matter most, and `.` stops at a newline and under-counted them.
    //  • a 10-char floor, not 25. "It IS the login." is sixteen characters and is a complete
    //    answer; the bar is meant to catch an empty or placeholder reason, not brevity.
    const entries = [...mw.matchAll(/\{\s*path:\s*'[^']+',[\s\S]{0,40}?why:\s*'[^']{10,}'/g)]
    expect(entries.length).toBe(declaredPublic.length)
  })
})

describe('the gates that already exist still exist', () => {
  it('milla and dashboard require a session', () => {
    expect(mw).toMatch(/!user && pathname\.startsWith\('\/milla'\)/)
    expect(mw).toMatch(/!user && pathname\.startsWith\('\/dashboard'\)/)
  })

  it('partner-preview requires auth — it was public to the whole internet (#478)', () => {
    expect(mw).toMatch(/!user && pathname\.startsWith\('\/partner-preview'\)/)
  })

  it('the v2 mock tree stays behind an explicit allowlist, and unset means NOBODY', () => {
    expect(mw).toContain('V2_PREVIEW_EMAILS')
    expect(mw).toMatch(/if \(!user \|\| !allow\.includes\(email\)\)/)
  })

  it('(dashboard) is REDIRECTED, never deleted — Milla imports from that tree', () => {
    // CORE-MAP: eleven pages of the retired portal are imported directly by Milla's own
    // pages (its billing page is a 13-line wrapper). Deleting it would break Milla.
    expect(mw).toContain("const MAP: Record<string, string>")
    expect(existsSync(join(APP, '(dashboard)/dashboard/billing/page.tsx'))).toBe(true)
  })

  it('the declarative list does NOT short-circuit the middleware', () => {
    // An early return for public routes would skip the session lookup — and `/` and `/login`
    // both need it, because a signed-in client is bounced to /milla from each.
    expect(mw).not.toMatch(/PUBLIC_ROUTES\.(some|includes|find)\([^)]*\)\s*\)?\s*return/)
  })
})
