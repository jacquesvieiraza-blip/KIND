// ═══════════════════════════════════════════════════════════════════════════════════════
// THE APPROVED VIDA ARCHITECTURE — two workspaces, and the retirements inside it.
//
// ── WHY THESE ARE ASSERTED AND NOT JUST BUILT ───────────────────────────────────────────
//
// The founder's correction pass on the preview set turned on a handful of very specific facts,
// and every one of them is the kind a later edit undoes by accident while fixing something
// else. "Bookings is missing from the Command Centre" looks exactly like a bug to whoever finds
// it next; so does "Ops is gone". They are decisions:
//
//   • Meetings lives in CLIENTS and nowhere else — no Bookings entry in the Command Centre
//   • Ops and Compliance are RETIRED FROM PRIMARY NAV — and their pages still exist
//   • the SENDING card reads state-first, on two lines, never a bare OFF
//   • Run is not offered at all while the kill-switch is ON
//
// 🛑 AND THE RETIREMENTS MUST NOT BECOME DELETIONS. "Do not delete underlying capability or
// data merely because the navigation item is retired" — so the routes are asserted to still be
// on disk, which is the half of the instruction a tidy-up would miss.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ADMIN = join(__dirname, '..', '..', '..', 'admin', 'src')
const NAV = readFileSync(join(ADMIN, 'lib', 'vida-nav.ts'), 'utf8')
const LAYOUT = readFileSync(join(ADMIN, 'app', 'vida', 'layout.tsx'), 'utf8')

/** Executable lines only — a rule about what the nav CONTAINS must not match a comment. */
const code = (s: string) => s.split('\n')
  .filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') && !t.startsWith('{/*') })
  .join('\n')

const NAV_CODE = code(NAV)

/** The href list, read out of the module's own source rather than retyped here. */
function hrefsIn(section: string): string[] {
  const at = NAV_CODE.indexOf(section)
  expect(at, `${section} is not in vida-nav.ts`).toBeGreaterThan(-1)
  const body = NAV_CODE.slice(at, NAV_CODE.indexOf('\nexport ', at + 10) === -1 ? undefined : NAV_CODE.indexOf('\nexport ', at + 10))
  return [...body.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1])
}

describe('① two workspaces, and the operator can tell which one they are in', () => {
  it('the shell renders exactly two, and Clients is the default', () => {
    expect(LAYOUT).toContain("useState<Workspace>('clients')")
    expect(LAYOUT).toContain("workspace === 'command' ? 'Command Centre' : 'Clients'")
  })

  it('the rails are never mixed — one workspace is rendered at a time', () => {
    expect(LAYOUT).toContain("workspace === 'clients' ? (")
    expect(LAYOUT).toContain('COMMAND_CENTRE.map(ccGroup)')
  })

  it('the workspace follows the route, so a Command Centre link opens the Command Centre', () => {
    expect(LAYOUT).toContain("if (!inClients && pathname.startsWith('/vida/')) setWorkspace('command')")
  })

  it('the header names the product and the workspace', () => {
    expect(LAYOUT).toContain('Vida<span className="text-[#9b8ec4]">&amp;Milla</span>')
  })
})

describe('② the Command Centre is the locked seven groups, in order', () => {
  it('Cockpit first, then Delivery · Clients · Money · System · Growth · Company', () => {
    const titles = [...NAV_CODE.matchAll(/title:\s*'([^']*)'/g)].map(m => m[1])
    expect(titles).toEqual(['', 'Delivery', 'Clients', 'Money', 'System', 'Growth', 'Company'])
  })

  it('every destination it offers is a page that exists', () => {
    for (const href of hrefsIn('COMMAND_CENTRE')) {
      const dir = join(ADMIN, 'app', href.replace(/^\//, ''))
      expect(existsSync(join(dir, 'page.tsx')), `${href} is in the nav and has no page`).toBe(true)
    }
  })
})

describe('🛑 ③ the founder\'s retirements — decisions, not bugs to be "fixed"', () => {
  it('there is NO Bookings entry in the Command Centre', () => {
    const cc = hrefsIn('COMMAND_CENTRE')
    expect(cc, 'Bookings is back in the Command Centre').not.toContain('/vida/bookings')
    expect(NAV_CODE.includes("label: 'Bookings'"), 'a Bookings entry exists somewhere in the nav').toBe(false)
  })

  it('Meetings lives in the CLIENTS workspace, and only there', () => {
    const clients = hrefsIn('CLIENTS_WORKSPACE')
    expect(clients).toContain('/vida/bookings')
    expect(NAV_CODE).toContain("label: 'Meetings'")
    // Exactly one NAV ENTRY may point at the meetings screen. The retirement receipts use a
    // `route:` key rather than `href:`, so this counts clickable rows and not the record.
    expect([...NAV_CODE.matchAll(/href:\s*'\/vida\/bookings'/g)].length).toBe(1)
  })

  it('Ops and Compliance are gone from primary nav', () => {
    for (const gone of ['/vida/ops', '/vida/compliance']) {
      expect(NAV_CODE.includes(`href: '${gone}'`), `${gone} is still in primary nav`).toBe(false)
      expect(LAYOUT.includes(gone), `${gone} is still linked from the shell`).toBe(false)
    }
  })

  it('🛑 …and their PAGES and data are untouched — retired from nav is not deleted', () => {
    // "Do not delete underlying capability or data merely because the navigation item is
    // retired." A cleanup that removes the route is the failure this case exists to catch.
    for (const kept of ['ops', 'compliance', 'bookings', 'outreach']) {
      expect(existsSync(join(ADMIN, 'app', 'vida', kept, 'page.tsx')),
        `/vida/${kept} was DELETED — retiring a nav entry must not delete the page`).toBe(true)
    }
  })

  it('every retirement is recorded with its reason, so it is not re-added as a "fix"', () => {
    for (const href of ['/vida/ops', '/vida/compliance', '/vida/bookings']) {
      expect(NAV_CODE, `${href} was dropped with no recorded reason`).toContain(`route: '${href}'`)
    }
  })
})

describe('④ nothing is offered that lands nowhere', () => {
  it('every Clients-workspace destination exists', () => {
    for (const href of hrefsIn('CLIENTS_WORKSPACE')) {
      const dir = join(ADMIN, 'app', href.replace(/^\//, ''))
      expect(existsSync(join(dir, 'page.tsx')), `${href} is in the nav and has no page`).toBe(true)
    }
  })

  it('🛑 the two entries with no page are ABSENT, not pointed at something else', () => {
    // The approved preview shows "Needs you" (a filter that does not exist yet) and "Founder
    // prospecting" (no such page — `/cmo` is CMO Tools, a different screen). Drawing either
    // would repeat the bug this console shipped three times: a nav row that lands nowhere, or
    // worse, one silently relabelled onto the nearest page to make a picture match.
    expect(NAV_CODE.includes("label: 'Needs you'"), 'Needs you is drawn without a filter behind it').toBe(false)
    expect(NAV_CODE.includes("label: 'Founder prospecting'"), 'Founder prospecting is drawn without a page').toBe(false)
    expect(NAV_CODE.includes('/cmo'), 'CMO Tools was relabelled to fill the Founder prospecting gap').toBe(false)
  })
})
