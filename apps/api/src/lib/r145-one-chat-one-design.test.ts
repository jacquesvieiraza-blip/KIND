// ═══════════════════════════════════════════════════════════════════════════════════════
// R145 (24 Sep) — ONE CHAT FROM SIGN-UP TO COMPLETE, ONLY THE RIGHT SIDE CHANGES, AND THE
// FOUNDER'S REDESIGN MATCHED EXACTLY
//
// Founder, verbatim: *"we never leave one chat to go to another. not how it workss. evern the
// first part. the only change is the right screen."* · *"i clicked looks right to all and nothing
// happened after this… we need to get past to get to the next stage."* · *"this is the vision of
// the product… build every section both in milla and vida to this"* · *"match everything. colors
// everything."* · *"dont forget in Milla you need to keep top right drop down."*
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PORTAL = join(__dirname, '../../../portal/src')
const ADMIN = join(__dirname, '../../../admin/src')
const read = (p: string) => readFileSync(p, 'utf8')
/** Comments out, so an explanation can never satisfy a guard about code. */
const code = (p: string) => read(p).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const SHELL = code(join(PORTAL, 'components/milla/MillaShell.tsx'))
const CHAT = code(join(PORTAL, 'components/milla/MillaConversation.tsx'))
const WELCOME = code(join(PORTAL, 'app/(milla)/milla/welcome/page.tsx'))
const HOME = code(join(PORTAL, 'app/(milla)/milla/page.tsx'))
const CSS = read(join(PORTAL, '../../../packages/shared/src/design/mv-design.css'))

describe('R145 · one chat — the Brief speaks in the shell\'s column, never a second one', () => {
  it('🛑 the shell\'s column can no longer be stood down', () => {
    expect(CHAT).not.toContain('chatHidden')
    expect(SHELL).not.toContain('chatHidden')
    expect(SHELL.match(/<MillaConversationProvider[\s>]/g) ?? []).toHaveLength(1)
  })

  it('🛑 the Brief claims the column body and renders into it through a portal', () => {
    expect(WELCOME).toContain('useEffect(() => claimChatSlot(), [claimChatSlot])')
    expect(WELCOME).toContain('conversation.chatSlot ? createPortal(')
    // Its composer is INSIDE the portal — there is no second composer on the page.
    const portalAt = WELCOME.indexOf('createPortal(')
    const formAt = WELCOME.indexOf('<form onSubmit')
    expect(formAt).toBeGreaterThan(portalAt)
    expect(WELCOME.match(/<form onSubmit/g) ?? []).toHaveLength(1)
    // …and no conversation column of its own.
    expect(WELCOME).not.toContain('md:w-[600px]')
  })

  it('🛑 handing the column back re-reads the thread, so the conversation carries on', () => {
    expect(CHAT).toContain('setRestoreNonce(n => n + 1)')
    expect(CHAT).toMatch(/\}, \[restoreNonce\]\)/)
    expect(CHAT).toContain('if (slotClaimedRef.current) return')
  })

  it('🛑 the Brief is shown first — the information is carried', () => {
    const briefAt = CHAT.indexOf("'/milla/brief-draft', tok)")
    const sessionsAt = CHAT.indexOf("api.get<{ data: { id: string }[] }>('/milla/sessions', tok)\n")
    expect(briefAt).toBeGreaterThan(-1)
    expect(sessionsAt).toBeGreaterThan(briefAt)
    // A client with a Brief behind them is mid-conversation — not greeted as new.
    expect(CHAT).toContain('restoreView({ ok: true, count: rows.length + briefRows.length })')
  })

  it('🛑 "no account yet" is not "could not load your earlier conversation"', () => {
    expect(CHAT).toContain("if (failureOf(e).status === 404) return { data: [] as { id: string }[] }")
  })
})

describe('R145 · after Proof the right side IS the Programme, and Milla says so', () => {
  it('🛑 a client who has just confirmed their Proof sees the Programme screen in place', () => {
    expect(HOME).toContain("(prog.hasProgramme !== false || prog.stage === 'Recommendation') ? (")
    expect(HOME).toContain('<ProgrammeScreen />')
    expect(HOME).toContain("import ProgrammeScreen from './programme/page'")
  })

  it('🛑 confirming Proof moves the right side on and Milla announces it in the one chat', () => {
    const at = HOME.indexOf("await api.post('/leads/proof/complete', {}, await token())")
    expect(at).toBeGreaterThan(-1)
    const after = HOME.slice(at, at + 600)
    expect(after).toContain('conversation.announce(')
    expect(after).toContain('conversation.refreshStage()')
    expect(after.indexOf('conversation.announce(')).toBeLessThan(after.indexOf('} catch'))
  })
})

describe('R145 · the redesign, matched from its own stylesheet', () => {
  it('🛑 one stylesheet, loaded by BOTH portals', () => {
    for (const g of [join(PORTAL, 'app/globals.css'), join(ADMIN, 'app/globals.css')]) {
      expect(read(g), g).toContain("@import '../../../../packages/shared/src/design/mv-design.css'")
    }
  })

  it('🛑 it holds the redesign\'s own values — colours, frame, bars, columns', () => {
    for (const v of ['--mv-accent:#6f3df4', '--mv-accent2:#d84ca5', '--mv-ink:#17141c', '--mv-page:#f6f4f8',
      'grid-template-rows:64px 42px 1fr', 'grid-template-columns:180px minmax(470px,560px) minmax(430px,1fr)',
      'grid-template-columns:180px minmax(560px,1fr) 430px', 'border-radius:20px']) {
      expect(CSS, v).toContain(v)
    }
  })

  it('🛑 the Milla shell is built from those classes', () => {
    for (const c of ['mv-root', 'mv-app-shell', 'mv-topbar', 'mv-stagebar', 'mv-portal-milla', 'mv-leftnav', 'mv-workspace']) {
      expect(SHELL, c).toContain(c)
    }
    for (const c of ['mv-conversation', 'mv-conversation-head', 'mv-chat', 'mv-msg', 'mv-bubble', 'mv-composer']) {
      expect(CHAT, c).toContain(c)
    }
  })

  it('🛑 the top-right drop-down is kept, with every destination and Sign out', () => {
    const menuAt = SHELL.indexOf('{menuOpen && (')
    expect(menuAt).toBeGreaterThan(-1)
    const menu = SHELL.slice(menuAt, menuAt + 2000)
    expect(menu).toContain('{ROI.map(')
    expect(menu).toContain('{ACCOUNT.map(')
    expect(menu).toContain('onClick={signOut}')
    for (const d of ["'/milla/performance', 'Performance'", "'/milla/analytics', 'Analytics'", "'/milla/roi', 'Your ROI'",
      "'/milla/command-centre', 'Command Centre'", "'/milla/teams', 'Teams Hub'", "'/milla/settings', 'Settings'",
      "'/milla/billing', 'Billing'", "'/milla/usage', 'Usage'", "'/milla/referral', 'Referral'"]) {
      expect(SHELL, d).toContain(d)
    }
  })
})
