// ═══════════════════════════════════════════════════════════════════════════════════════
// THE APPROVED MILLA + VIDA SHELL — ONE CONVERSATION, AND NOT ONE DESTINATION LOST.
//
// Two defects are pinned here, and they are the same defect on both products:
//
//   ① THE CONVERSATION WAS OWNED BY A ROUTE. Milla's chat was declared inside
//      `app/(milla)/milla/page.tsx` and Vida's inside `app/vida/page.tsx`, so every
//      navigation unmounted it — the transcript, the session, the selected client and
//      anything half-typed all went. Nine Milla routes render in the Milla shell and only
//      one of them had Milla in it.
//
//   ② THE PRODUCT GREW A SECOND ASSISTANT. Milla's My ICP screen carried a drawer with its
//      own transcript, composer and Send; Vida's ICP tab carried the same. Two places to
//      type and two places to read, on one screen, neither aware of the other's turns.
//
// And one preservation rule, because the fix for ① and ② moved a great deal of markup:
// the operator's twenty-five destinations, the customer's nine rail routes, and the Inbox
// REPLY composer — which is not a second Vida at all, it writes a customer email.
//
// Source-level guards, following `vida-board-honesty.test.ts`: neither front-end app has a
// test runner of its own, and these are structural facts about the files rather than
// behaviour that needs a DOM. Comments are stripped wherever a rule could otherwise be
// satisfied by the prose explaining it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const PORTAL = join(__dirname, '../../../portal/src')
const ADMIN  = join(__dirname, '../../../admin/src')
const read = (p: string) => readFileSync(p, 'utf8')
/** Strip line and block comments, so an explanation can never satisfy a guard about code. */
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const MILLA_SHELL = read(join(PORTAL, 'components/milla/MillaShell.tsx'))
const MILLA_CHAT  = read(join(PORTAL, 'components/milla/MillaConversation.tsx'))
const MILLA_HOME  = read(join(PORTAL, 'app/(milla)/milla/page.tsx'))
const MILLA_ICP   = read(join(PORTAL, 'app/(milla)/milla/icp/page.tsx'))

const VIDA_LAYOUT = read(join(ADMIN, 'app/vida/layout.tsx'))
const VIDA_PAGE   = read(join(ADMIN, 'app/vida/page.tsx'))
const VIDA_CHAT   = read(join(ADMIN, 'components/vida/VidaConversation.tsx'))

// ════════════════════════════════════════════════════════════════════════════════════════
describe('MILLA — ONE INSTANCE, ONE TRANSCRIPT, ONE COMPOSER', () => {
  it('the SHELL mounts the conversation, so it survives every navigation', () => {
    const code = strip(MILLA_SHELL)
    expect(code, 'the shell does not import the conversation').toContain(
      "import { MillaConversationProvider } from '@/components/milla/MillaConversation'")
    // Mounted ONCE. Two mounts would be two transcripts with two session ids.
    expect(code.match(/<MillaConversationProvider>/g) ?? [], 'the conversation is mounted more than once')
      .toHaveLength(1)
    // …and the working area is INSIDE it, which is what makes `useMillaConversation()` reach
    // the same instance from every route.
    expect(code).toMatch(/<MillaConversationProvider>\s*<main[^>]*>\{children\}<\/main>\s*<\/MillaConversationProvider>/)
  })

  it('the onboarding screen is still bare — the shell returns before the conversation', () => {
    const code = strip(MILLA_SHELL)
    const welcome = code.indexOf("if (pathname === '/milla/welcome') return <>{children}</>")
    expect(welcome, '/milla/welcome no longer bypasses the shell').toBeGreaterThan(-1)
    expect(code.indexOf('<MillaConversationProvider>'), 'the conversation is mounted above the welcome bypass')
      .toBeGreaterThan(welcome)
  })

  it('ALL NINE RAIL ROUTES still reach the shell, so all nine keep the assistant', () => {
    const code = strip(MILLA_SHELL)
    for (const href of ['/milla', '/milla/pipeline', '/milla/meetings', '/milla/programme',
      '/milla/replies', '/milla/icp', '/milla/documents', '/milla/reports', '/milla/coaching']) {
      expect(code, `the rail lost ${href}`).toContain(`'${href}'`)
    }
  })

  it('🛑 THE HOME NO LONGER OWNS A CONVERSATION', () => {
    const code = strip(MILLA_HOME)
    // The transcript, the composer, the session and the send. Every one of these was in this
    // file and is the reason a customer lost Milla by clicking Meetings.
    for (const [needle, what] of [
      ['messages.map(', 'the transcript'],
      ['setMessages(', 'the transcript state'],
      ['chatBodyRef', 'the chat scroll container'],
      ['/milla/sessions', 'the chat transport'],
      ['MILLA_GREETING', 'the opening line'],
      ['const sendState', 'the send-state pill'],
      ['const chips', 'the chip row'],
    ] as [string, string][]) {
      expect(code, `${what} (${needle}) is still owned by the Milla home`).not.toContain(needle)
    }
  })

  it('🛑 AND THE CONVERSATION IT LOST IS THE ONE THAT MOVED — not a rewrite', () => {
    const code = strip(MILLA_CHAT)
    expect(code).toContain('Ask Milla, request leads, or give feedback…')
    expect(code).toContain("api.post<{ reply: string }>(`/milla/sessions/${sid}/chat`")
    expect(code).toContain('conversational &amp; strategic')
    // ONE composer, ONE Send, in the ONE place.
    expect(code.match(/<form onSubmit/g) ?? [], 'the conversation has more than one composer').toHaveLength(1)
  })

  it('🛑 NO MILLA ROUTE BUILDS A SECOND TRANSCRIPT OR A SECOND COMPOSER', () => {
    // ⚠️ THE WHOLE SURFACE, NOT THE TWO FILES THIS CHANGE TOUCHED. A duplicate assistant is
    // exactly the kind of thing that reappears on a route nobody was looking at.
    const routes = ['page.tsx', 'icp/page.tsx', 'meetings/page.tsx', 'programme/page.tsx',
      'reports/page.tsx', 'documents/page.tsx', 'coaching/page.tsx', 'pipeline/page.tsx']
    for (const r of routes) {
      const code = strip(read(join(PORTAL, 'app/(milla)/milla', r)))
      expect(code, `${r} carries a second Milla transcript`).not.toMatch(/chat\.map\(|messages\.map\(/)
      expect(code, `${r} carries a second Milla composer`).not.toContain('Milla is thinking…')
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('MILLA · MY ICP — THE DRAWER IS GONE, THE TARGETING FLOW IS NOT', () => {
  const code = strip(MILLA_ICP)

  it('🛑 the second transcript, composer and Send are removed', () => {
    for (const [needle, what] of [
      ['chat.map(', 'the drawer transcript'],
      ['setChat(', 'the drawer transcript state'],
      ['What should change?', 'the drawer composer'],
      ['reviseOpen', 'the drawer itself'],
    ] as [string, string][]) {
      expect(code, `${what} (${needle}) is still on the My ICP screen`).not.toContain(needle)
    }
    // ⚠️ NO FORM AT ALL ON THIS SCREEN. It had exactly one and it was the duplicate composer.
    expect(code, 'a composer is back on My ICP').not.toContain('<form onSubmit')
  })

  it('"Change who we target" FOCUSES THE ONE CONVERSATION, in ICP context', () => {
    expect(code).toContain("conversation.focus('icp')")
    expect(code).toContain('↻ Change who we target — talk to Milla')
    expect(code).toContain("import { useMillaConversation } from '@/components/milla/MillaConversation'")
  })

  it('🛑 THE #1643 SEMANTICS SURVIVE THE MOVE, all of them', () => {
    const chat = strip(MILLA_CHAT)
    // The two endpoints, both still called, and the save still explicit.
    expect(chat, 'the targeting draft transport is gone').toContain("'/icps/chat-build'")
    expect(chat, 'the explicit save is gone').toContain("api.post('/icps/revise'")
    expect(chat, 'the save is no longer a deliberate press').toContain('Save — make this live')
    // FRESH IS NOT REFINE. A brand-new definition is not seeded from the current one — it
    // still goes to the onboarding conversation, exactly as before.
    expect(code, 'the fresh-start entry point is gone').toContain('Build fresh targeting with Milla')
    expect(code).toContain("router.push('/milla/welcome')")
    // ⚠️ AND NO SIDE EFFECT WAS ADDED. Saving targeting must not attach a programme, start
    // sourcing, claim a proof pass or send anything.
    for (const banned of ['/proof', 'approve-batch', 'attach', 'enrol']) {
      expect(strip(chat.slice(chat.indexOf('async function saveIcpDraft'), chat.indexOf('const needsGoLive'))),
        `saving targeting now also calls ${banned}`).not.toContain(banned)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('VIDA — THE LEFT PANEL, AND ALL 25 DESTINATIONS', () => {
  const code = strip(VIDA_LAYOUT)

  /** The operator's destinations, pinned as data. A list that only lives in the file it
   *  guards proves nothing — the founder's own audit found three missing from a written one. */
  const OPERATE = ['/vida', '/vida/queue', '/vida/bookings', '/vida/suppression', '/vida/audit',
    '/vida/reports', '/vida/nexus', '/vida/demo']
  const BUSINESS = ['/vida/system', '/vida/sending', '/vida/engine', '/vida/cockpit',
    '/vida/clients-admin', '/vida/money-path', '/vida/billing', '/vida/revenue', '/vida/gtm',
    '/vida/unibox', '/vida/health', '/vida/ops', '/vida/founder', '/vida/outreach',
    '/vida/compliance', '/vida/governed-documents', '/vida/partners']

  it('🛑 NOT ONE DESTINATION DISAPPEARED — 8 + 17 = 25', () => {
    expect(OPERATE).toHaveLength(8)
    expect(BUSINESS).toHaveLength(17)
    for (const href of [...OPERATE, ...BUSINESS]) {
      expect(code, `the operator destination ${href} is gone from Vida`).toContain(`href: '${href}'`)
    }
    // ⚠️ AND THE PANEL RENDERS THE ARRAYS, NOT A THIRD COPY. Retyping the list in the nav is
    // exactly how three destinations went missing from an audit of it.
    expect(code).toContain('{group(\'Operate\', OPERATE,')
    expect(code).toContain('{group(\'Run the business\', NERVOUS_SYSTEM,')
  })

  it('the panel is the approved 216px, with two INDEPENDENT collapsible groups', () => {
    expect(code, 'the approved width is not implemented').toContain('w-[216px]')
    // ⚠️ NO 56px ICON RAIL. That breakpoint was NOT approved and must not be invented.
    expect(code, 'an unapproved icon-rail breakpoint was invented').not.toContain('w-[56px]')
    // Two separate pieces of state — one toggle for both groups would not be independent.
    expect(code).toContain('const [openOperate, setOpenOperate] = useState(true)')
    expect(code).toContain('const [openBusiness, setOpenBusiness] = useState(true)')
    // 🛑 BOTH OPEN BY DEFAULT. A group collapsed on first paint hides destinations from an
    // operator who has never touched the control — which is the defect this panel replaces.
    expect(code, 'a group starts collapsed, hiding destinations by default')
      .not.toMatch(/useState<boolean>\(false\)|setOpenOperate\] = useState\(false\)|setOpenBusiness\] = useState\(false\)/)
  })

  it('🛑 THE DROPDOWN NAVIGATION PANEL IS GONE, and no new account menu replaced it', () => {
    expect(code, 'the dropdown panel is still there').not.toContain('menuOpen')
    expect(code, 'a new account menu was invented').not.toContain('setMenuOpen')
    // Sign out is the one non-destination the dropdown held, and it moved to the footer.
    expect(code).toContain('Sign out')
    const nav = code.indexOf('<nav className="w-[216px]')
    expect(code.indexOf('onClick={signOut}'), 'Sign out is not in the left panel').toBeGreaterThan(nav)
  })

  it('the top bar KEEPS what the founder listed', () => {
    expect(code, 'the wordmark is gone').toContain('Milla&amp;Vida <span')
    expect(code, 'the sent/triage/approve pill is gone').toContain('sent</span>')
    expect(code, 'the send-cap pill is gone').toContain('Cap ${status.daily_cap}/day')
    expect(code, 'the operator avatar/name chip is gone').toContain('{email ? displayName(email) : \'Operator\'}')
  })

  it('🛑 DEAD SCAFFOLDING WAS NOT REVIVED TO BUILD THE PANEL', () => {
    // Each of these was declared once and rendered nowhere — the remains of a rail that
    // described five destinations out of twenty-five, in a different order.
    for (const dead of ['ENGINE_RAIL', 'railLink', 'isClients', 'isAudit', 'isQueue',
      'isBookings', 'isSuppression', 'isReports', 'pendingCount']) {
      expect(code, `dead scaffolding "${dead}" was revived`).not.toContain(dead)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
describe('VIDA — ONE INSTANCE, ONE TRANSCRIPT, ONE COMPOSER', () => {
  it('the SHELL mounts the conversation, so the selected client survives navigation', () => {
    const code = strip(VIDA_LAYOUT)
    expect(code).toContain("import { VidaConversationProvider } from '@/components/vida/VidaConversation'")
    expect(code.match(/<VidaConversationProvider>/g) ?? [], 'the conversation is mounted more than once')
      .toHaveLength(1)
  })

  it('🛑 THE CONSOLE NO LONGER OWNS THE CONVERSATION', () => {
    const code = strip(VIDA_PAGE)
    for (const [needle, what] of [
      ['cmdLog', 'the transcript'],
      ['setCmdBusy', 'the busy state'],
      ['async function runCommand', 'the command router'],
      ['parseSourceIntent', 'the sourcing intent parser'],
      ['async function confirmSource', 'the sourcing confirm'],
      ['icpInput', 'the duplicate ICP composer'],
    ] as [string, string][]) {
      expect(code, `${what} (${needle}) is still owned by the Vida console`).not.toContain(needle)
    }
    // The selected client is the shell's, because the conversation is scoped to it.
    expect(code).toContain('const { selected, setSelected } = conversation')
  })

  it('🛑 THE VIDA ICP TAB HAS NO SECOND TRANSCRIPT AND NO SECOND SEND', () => {
    const code = strip(VIDA_PAGE)
    expect(code, 'the duplicate ICP bubble list is back').not.toContain('icpChat.map(')
    expect(code, 'the duplicate ICP composer is back').not.toContain('setIcpInput')
    // ⚠️ THE TRANSPORT AND THE BUSINESS LOGIC STAY. Only the duplicate UI went.
    expect(code, 'the ICP chat transport was deleted with the widget').toContain("'/api/proxy/operator/icp/chat'")
    expect(code, 'the explicit save was deleted with the widget').toContain('async function approveProposal')
    // ⚠️ AND ITS TURNS LAND IN THE ONE TRANSCRIPT, or the operator cannot read the answer.
    expect(code).toContain("conversation.say('vida', j.data.message)")
  })

  it('🛑 THE INBOX REPLY COMPOSER IS PRESERVED — it writes a CUSTOMER EMAIL', () => {
    // It is not a second Vida and must never be deleted as one. This is the one composer on
    // the console that is allowed to exist beside the conversation.
    const code = strip(VIDA_PAGE)
    expect(code, 'the Inbox reply composer was removed').toContain('setDraft(e.target.value)')
    expect(code, 'the Inbox send-reply control was removed').toContain('onClick={sendReply}')
    expect(code).toContain('async function sendReply()')
  })

  it('🛑 AND THE CONVERSATION THAT MOVED IS THE ONE THAT WAS THERE — not a rewrite', () => {
    const code = strip(VIDA_CHAT)
    expect(code).toContain('Command Vida in ${surface?.clientName || \'client\'} context…')
    expect(code).toContain("'/api/proxy/operator/command'")
    // The sourcing rules came across verbatim: a verb AND a noun, never one of them.
    expect(code).toContain("if (!/\\b(source|find|pull|get|prospect)\\b/.test(lc) || !/\\b(lead|leads|prospect|prospects)\\b/.test(lc)) return null")
    // ONE composer.
    expect(code.match(/<form onSubmit/g) ?? [], 'the conversation has more than one composer').toHaveLength(1)
  })
})
