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
const VIDA_CLIENTS = read(join(ADMIN, 'components/vida/VidaClients.tsx'))

// ════════════════════════════════════════════════════════════════════════════════════════
describe('MILLA — ONE INSTANCE, ONE TRANSCRIPT, ONE COMPOSER', () => {
  it('the SHELL mounts the conversation, so it survives every navigation', () => {
    const code = strip(MILLA_SHELL)
    expect(code, 'the shell does not import the conversation').toContain(
      "import { MillaConversationProvider } from '@/components/milla/MillaConversation'")
    // Mounted ONCE. Two mounts would be two transcripts with two session ids.
    expect(code.match(/<MillaConversationProvider[\s>]/g) ?? [], 'the conversation is mounted more than once')
      .toHaveLength(1)
    // …and the working area is INSIDE it, which is what makes `useMillaConversation()` reach
    // the same instance from every route. (UI-008 wrapped `{children}` in the phone cover's
    // bar and body; the nesting this asserts — main inside the provider — is unchanged.)
    expect(code).toMatch(/<MillaConversationProvider[\s\S]{0,400}?<main[\s\S]*?\{children\}[\s\S]*?<\/main>\s*<\/MillaConversationProvider>/)
  })

  it('the onboarding screen is still bare — the shell returns before the conversation', () => {
    const code = strip(MILLA_SHELL)
    const welcome = code.indexOf("if (pathname === '/milla/welcome') return <>{children}</>")
    expect(welcome, '/milla/welcome no longer bypasses the shell').toBeGreaterThan(-1)
    expect(code.indexOf('<MillaConversationProvider'), 'the conversation is mounted above the welcome bypass')
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
// UI-008 — THE APPROVED PHONE BEHAVIOUR: "Milla is the screen, the section covers her."
//
// 🛑 WHAT WAS BROKEN. Neither `MillaShell.tsx` nor `MillaConversation.tsx` contained a single
// responsive class. The body row laid a 260px rail and a 600px conversation side by side with
// `shrink-0` at EVERY width, so on a 390px phone `<main>` resolved to ZERO width: the
// workspace did not exist, and `overflow-hidden` clipped the rest.
// ════════════════════════════════════════════════════════════════════════════════════════
describe('MILLA · PHONE — the section covers her, and never unmounts her', () => {
  const shell = strip(MILLA_SHELL)
  const chat  = strip(MILLA_CHAT)

  it('🛑 THE TWO FIXED COLUMNS NO LONGER BOTH RENDER ON A PHONE', () => {
    // The rail is the drawer below the breakpoint, and the conversation takes the screen.
    expect(shell, 'the 260px rail still occupies a phone').toContain("navOpen ? 'absolute inset-y-0 left-0 z-50 shadow-2xl md:static md:shadow-none' : 'hidden md:flex'")
    expect(chat, 'the conversation is still a fixed 600px on a phone').toContain('w-full md:w-[600px] shrink-0')
    // 🛑 AND THE REGRESSION ITSELF, BY ITS EXACT MARKUP.
    expect(chat, 'the unconditional 600px column is back').not.toContain('className="w-[600px] shrink-0')
  })

  it('DESKTOP IS UNCHANGED — 260 | 600 | flex-1 above the breakpoint', () => {
    expect(shell).toContain('w-[260px] shrink-0 border-r border-[#eee7f7] bg-[#fdfcff]')
    expect(chat).toContain('md:w-[600px]')
    expect(shell).toContain('flex-1 min-w-0 overflow-hidden')
  })

  it('🛑 THE WORKSPACE COVERS HER — IT DOES NOT HIDE HER, AND THAT IS NOT COSMETIC', () => {
    // A covering LAYER keeps the conversation laid out, so the transcript, the session and
    // anything half-typed survive. `hidden` would give it `scrollHeight` 0 and silently break
    // the scroll-to-bottom the transcript depends on.
    expect(shell).toContain("covering ? 'absolute inset-0 z-30 bg-[#faf8ff] flex flex-col md:static md:z-auto' : 'hidden md:flex md:flex-col'")
    // The conversation itself is never given a hiding class at any width.
    const section = chat.slice(chat.indexOf('<section data-tour="chat"'), chat.indexOf('<section data-tour="chat"') + 400)
    expect(section, 'the conversation is hidden rather than covered').not.toMatch(/\bhidden\b/)
  })

  it('RETURNING IS THE SAME MOUNTED CONVERSATION — both controls the preview draws', () => {
    expect(shell, 'the back arrow is gone').toContain('aria-label="Back to Milla"')
    expect(shell, 'the "M · Milla" chip is gone').toContain('const MILLA_CHIP =')
    // On Home the cover is state, so returning is a state change; on a section it is the
    // route, so returning is a link and the phone's own back button lands in the same place.
    expect(shell).toContain('onClick={() => setCover(false)}')
    expect(shell).toContain('<Link href="/milla" aria-label="Back to Milla"')
    // 🛑 THE STRUCTURAL FACT THAT MAKES ANY OF IT TRUE: the conversation is a SIBLING of the
    // route's workspace inside the provider, so covering it cannot unmount it.
    expect(chat).toMatch(/<\/section>\s*\{children\}/)
  })

  it('PROGRAMME AND MY ICP ARE BOTH REACHABLE ON A PHONE', () => {
    // From the drawer (the same rail markup, one component) and from the handle.
    for (const href of ['/milla/programme', '/milla/icp']) {
      expect(shell, `${href} is unreachable on a phone`).toContain(`'${href}'`)
    }
    expect(chat).toContain('<Link href="/milla/icp"')
  })

  it('🛑 THE HANDLE FOLLOWS THE FOUNDER\'S RULE, AND ASKS THE ENDPOINT THAT KNOWS', () => {
    // A PROPOSAL WAITING → MY ICP. OTHERWISE → PROGRAMME.
    expect(chat).toContain('icpWaiting ? (')
    expect(chat).toContain('<b className="text-[13.5px]">My ICP</b>')
    expect(chat).toContain('<b className="text-[13.5px]">Programme</b>')
    // ⚠️ "WAITING" IS READ FROM `/icps`, NOT INFERRED FROM `icp_versions[].current` — which is
    // positional (`i === length - 1`) and names the newest row, not an activated one.
    expect(chat).toContain("api.get<{ data: Icp[] }>('/icps', tok)")
    expect(chat).toContain('const icpWaiting = !!newestIcp && newestIcp.is_active !== true')
    // 🛑 UNKNOWN FALLS TO PROGRAMME. `icps === null` (unread, or the read failed) must never
    // put "a proposal is waiting" on a customer's screen.
    expect(chat).toContain('const newestIcp = icps && icps.length > 0 ? icps[0] : null')
    // ...and the handle is part of the column, so it cannot collide with the composer.
    expect(chat).toContain("const HANDLE = 'md:hidden shrink-0 block w-full border-t")
  })

  it('FLOW AND THE ACCOUNT CHIP ARE HIDDEN ON THE PHONE ONLY', () => {
    expect(shell, 'the FLOW ribbon is not phone-gated').toContain('hidden md:flex shrink-0 items-center gap-1 overflow-x-auto px-5 py-2 bg-[#2a1747]')
    expect(shell, 'the Account chip is not phone-gated').toContain('ml-auto hidden md:flex items-center gap-3.5')
    // 🛑 AND NEITHER IS HIDDEN ON DESKTOP — the guard above would pass on a deletion, this
    // one would not: both must still carry their desktop markup.
    expect(shell).toContain('{MILLA_STAGES.map((label, i, arr) => {')
    expect(shell).toContain('Account <ChevronDown')
  })

  it('🛑 NOTHING THE HIDDEN ACCOUNT CHIP HELD BECAME UNREACHABLE', () => {
    const drawer = shell.slice(shell.indexOf('<div className="md:hidden">'), shell.indexOf('Tell Milla the outcome'))
    expect(drawer, 'the ROI screens are gone from the phone').toContain('{ROI.map(')
    expect(drawer, 'Settings/Billing/Usage/Referral are gone from the phone').toContain('{ACCOUNT.map(')
    expect(drawer, 'Sign out is gone from the phone').toContain('onClick={signOut}')
    // From the SAME arrays the desktop dropdown renders — a phone-only copy is how a
    // destination goes missing from one of them.
    expect(shell).toContain('const ACCOUNT: [string, string, React.ElementType][]')
    expect(shell).toContain('const ROI: [string, string, React.ElementType][]')
    // ...and the burger is what opens it.
    expect(shell).toContain('onClick={() => setNavOpen(true)}')
  })

  it('THE COMPOSER SURVIVES THE KEYBOARD — dynamic viewport, not 100vh', () => {
    // `100vh` does not shrink when the phone keyboard opens, so the composer at the foot of
    // the conversation was pushed underneath it.
    expect(shell, 'the shell is still 100vh').toContain('h-dvh flex flex-col')
    expect(shell, 'h-screen is back').not.toContain('h-screen')
  })

  it('🛑 THE TOUR DOES NOT POINT AT A COVERED CONVERSATION', () => {
    const tour = strip(read(join(PORTAL, 'components/ProductTour.tsx')))
    // "Rendered" and "on screen" stopped being the same thing the moment the workspace could
    // cover the conversation without unmounting it. The hit-test is the only question that
    // separates "behind the workspace" from "visible".
    expect(tour).toContain('function lookable(')
    expect(tour).toContain('document.elementFromPoint(')
    expect(tour).toContain('if (lookable(document.querySelector<HTMLElement>(`[data-tour="${live[i]?.target}"]`))) return')
    // 🛑 THE OLD BAIL-OUT, BY ITS EXACT TEXT. It returned the moment the element EXISTED, so a
    // covered target parked the tour on a step with no card and no way forward.
    expect(tour, 'the tour advances on existence again').not.toContain("const el = document.querySelector(`[data-tour=")
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
    // ⛓️ 7 Sep — RETARGETED, NOT WEAKENED. The refine save was the literal
    // `api.post('/icps/revise'`; it is now `api.post(fresh ? '/icps/fresh' : '/icps/revise'`
    // because a FRESH definition saves to a different route. The ASSERTION IS THE SAME FACT:
    // an ICP context still saves through `/icps/revise`, still by an explicit `api.post`.
    expect(chat, 'the explicit save is gone').toMatch(/api\.post\([^)]*'\/icps\/revise'/)
    expect(chat, 'the save is no longer a deliberate press').toContain('Save — make this live')
    // FRESH IS NOT REFINE — and since 7 Sep it no longer LEAVES THE PORTAL to say so. Both
    // existing-client entry points focus the ONE conversation; only a ZERO-ICP client still
    // reaches the onboarding wizard, which is the founder's decision and is asserted in
    // `portal/src/lib/icp-fresh-routing.test.ts` control by control.
    expect(code, 'the fresh-start entry point is gone').toContain('Build fresh targeting with Milla')
    expect(code, 'fresh targeting no longer enters fresh ICP mode').toContain("focus('icp-fresh')")
    expect(code, 'zero-ICP onboarding was removed as a side effect').toContain("router.push('/milla/welcome')")
    // ⚠️ AND NO SIDE EFFECT WAS ADDED. Saving targeting must not attach a programme, start
    // sourcing, claim a proof pass or send anything.
    for (const banned of ['/proof', 'approve-batch', 'attach', 'enrol']) {
      expect(strip(chat.slice(chat.indexOf('async function saveIcpDraft'), chat.indexOf('const needsGoLive'))),
        `saving targeting now also calls ${banned}`).not.toContain(banned)
    }
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// ⛓️ RETARGETED 9 Sep — THE PANEL BECAME TWO WORKSPACES, AND THE DUTIES SURVIVED THE MOVE.
//
// This section was written on 4 Sep, when twenty-five destinations came out of a top-right
// dropdown and became one permanent left panel of two groups. It pinned that shape hard: the
// exact two arrays, their two independent toggles, and "no new account menu was invented".
//
// 🛑 WHAT THE FOUNDER APPROVED ON 9 Sep CHANGES THE SHAPE AND KEEPS EVERY DUTY. Two workspaces
// — Clients and Command Centre — because a rail that shows Client admin beside Meetings cannot
// say whether you are looking at one client or at the business. So:
//
//   • the destination lists moved to `lib/vida-nav.ts` and are asserted there and in
//     `vida-workspaces.test.ts`; this file stops holding a third copy of them
//   • "8 + 17 = 25" is no longer the count: Ops, Compliance and Outreach were RETIRED FROM
//     PRIMARY NAV by explicit founder decision, and their pages still exist (asserted in
//     `vida-workspaces.test.ts`, which is where that decision now lives)
//   • the two independent toggles became ONE fold, on the client list, because seven short
//     Command Centre groups fit without folding and a fold is a place to hide a destination
//   • an operator menu exists again — holding TWO workspaces and sign out, and nothing else.
//     The 4 Sep rule was never "no menu", it was **no navigation reachable only from a menu**,
//     and that is what is asserted below now.
describe('VIDA — THE SHELL, AFTER THE TWO-WORKSPACE MOVE', () => {
  const code = strip(VIDA_LAYOUT)

  it('🛑 the shell holds NO copy of the destination list — it renders the nav module', () => {
    // Retyping the list in the nav is exactly how three destinations went missing from an
    // audit of it. The lists live in one place and the shell imports them.
    expect(code).toContain("from '@/lib/vida-nav'")
    // ⛓️ 9 Sep — the rail moved into a `ClientsRail` child so that reading the Needs-you
    // filter from the URL (`useSearchParams`) opts ONE small component out of prerendering
    // rather than the shell that wraps twenty-seven static pages.
    expect(code).toContain('CLIENTS_WORKSPACE.map(i => navLink(i, needsFiltering))')
    expect(code).toContain('COMMAND_CENTRE.map(ccGroup)')
    // ⚠️ AND NO INLINE ARRAY CREPT BACK IN.
    expect(code, 'a destination array was re-declared inside the shell').not.toMatch(/const (OPERATE|NERVOUS_SYSTEM)\s*[:=]/)
  })

  it('the panel is still the approved 216px, and the client list is the one fold', () => {
    expect(code, 'the approved width is not implemented').toContain('w-[216px]')
    // ⚠️ NO 56px ICON RAIL. That breakpoint was NOT approved and must not be invented.
    expect(code, 'an unapproved icon-rail breakpoint was invented').not.toContain('w-[56px]')
    expect(code).toContain('const [openClients, setOpenClients] = useState(true)')
    // 🛑 OPEN BY DEFAULT. A list collapsed on first paint hides clients from an operator who
    // has never touched the control — the defect the 4 Sep panel was built to end.
    expect(code, 'the client list starts collapsed, hiding clients by default')
      .not.toMatch(/setOpenClients\] = useState\(false\)/)
  })

  it('🛑 NO DESTINATION IS REACHABLE ONLY FROM THE OPERATOR MENU', () => {
    // ⛓️ THE 4 SEP RULE, RESTATED CORRECTLY. It read "no new account menu was invented", which
    // was a proxy for the real duty: the founder went looking for Documents and could not find
    // it, because twenty-five destinations lived behind a chip shaped like an account menu.
    // A menu holding exactly the two WORKSPACES does not recreate that — every page is still a
    // permanent row. What must never come back is a page you can only reach from the chip.
    const menuStart = code.indexOf('{menuOpen && (')
    expect(menuStart, 'the operator menu is gone entirely — the workspace switch lives there').toBeGreaterThan(-1)
    const menu = code.slice(menuStart, code.indexOf('</header>'))
    // The rows are mapped from a small literal array, so the destinations are its `href:` keys.
    const menuHrefs = [...menu.matchAll(/href:\s*'([^']+)'/g)].map(m => m[1])
    // Only the two workspace entry points, and both are also rails you can navigate to.
    expect(menuHrefs.sort()).toEqual(['/vida', '/vida/cockpit'])
    expect(menu, 'sign out is the one non-destination the menu may hold').toContain('signOut')
  })

  it('the top bar KEEPS what the founder listed, and names the workspace', () => {
    // ⛓️ The wordmark changed to the approved `Vida&Milla` + a workspace pill; "· operator"
    // went because the chip on the right already says who you are, and what an operator cannot
    // otherwise tell at a glance is WHICH RAIL this is.
    expect(code, 'the wordmark is gone').toContain('Vida<span className="text-[#9b8ec4]">&amp;Milla</span>')
    expect(code, 'the workspace is not named').toContain("workspace === 'command' ? 'Command Centre' : 'Clients'")
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
    expect(code).toContain("import { VidaConversationProvider, useVidaConversation } from '@/components/vida/VidaConversation'")
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
    expect(code).toContain('const { selected, selectedName, setSelected } = conversation')
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
    expect(code).toContain('Command Vida in ${selectedName || \'client\'} context…')
    expect(code).toContain("'/api/proxy/operator/command'")
    // The sourcing rules came across verbatim: a verb AND a noun, never one of them.
    expect(code).toContain("if (!/\\b(source|find|pull|get|prospect)\\b/.test(lc) || !/\\b(lead|leads|prospect|prospects)\\b/.test(lc)) return null")
    // ONE composer.
    expect(code.match(/<form onSubmit/g) ?? [], 'the conversation has more than one composer').toHaveLength(1)
  })
})

// ════════════════════════════════════════════════════════════════════════════════════════
// UI-009 · UI-010 · UI-011 — THE FINAL OPERATOR SHELL.
//
// Three measured defects, closed together:
//   ① 380px of Clients column left the cockpit 304px at 1440, so eight of eleven tabs sat
//      off-screen behind a scroll with no affordance — and at 1920 it was STILL clipped.
//   ② `setSlot` was called in exactly one file, so twenty-four operator destinations had no
//      assistant at all; and `publish` never wrote an empty handlers object back, so an
//      unmounted console's shortcuts and blockers outlived it.
//   ③ Pool and Exceptions were rendered AFTER the `</aside>` and the `{selected && (<>` that
//      close the console, so they painted across Vida at page width.
// ════════════════════════════════════════════════════════════════════════════════════════
describe('VIDA · UI-009 — Clients is a nav group, and the workspace got its width back', () => {
  const layout  = strip(VIDA_LAYOUT)
  const clients = strip(VIDA_CLIENTS)
  const page    = strip(VIDA_PAGE)

  // ⛓️ RETARGETED 9 Sep — THREE GROUPS BECAME TWO WORKSPACES AND ONE FOLD. The duty was never
  // "three toggles"; it was **nothing is hidden from an operator who has never touched the
  // control**. Seven short Command Centre groups fit unfolded, so there is nothing to hide;
  // the client list is the one unbounded thing in the rail and keeps its fold, open by default.
  it('the client list is the one fold, and it starts OPEN', () => {
    expect(layout, 'the client list has no open state').toContain('const [openClients, setOpenClients] = useState(true)')
    expect(layout).toContain("groupHead('Clients', openClients, toggleClients)")
    expect(layout, 'the toggle no longer reaches the state it folds').toContain('toggleClients={() => setOpenClients(o => !o)}')
    expect(layout, 'the client list starts collapsed, hiding clients by default')
      .not.toMatch(/setOpenClients\] = useState\(false\)/)
    // 🛑 AND THE COMMAND CENTRE GROUPS ARE NOT FOLDABLE AT ALL — a fold is a place to hide a
    // destination, and this rail exists because twenty-five of them were once hidden.
    expect(layout, 'a Command Centre group became collapsible').not.toMatch(/openDelivery|openMoney|openGrowth|openCompany/)
  })

  it('🛑 THE DEDICATED CLIENTS COLUMN IS GONE — and no rail replaced it', () => {
    expect(page, 'the 380px clients column is still in the console').not.toContain('w-[380px]')
    expect(page, 'the client list is still rendered by the console').not.toContain('visibleClients')
    // ⚠️ AND NOT REPLACED BY THE THING THE FOUNDER REJECTED.
    for (const rail of ['w-[64px]', 'w-[56px]', 'w-16']) {
      expect(page + layout + clients, `a ${rail} client rail was invented`).not.toContain(rail)
    }
  })

  // ⛓️ RETARGETED 9 Sep — THE ROW BECAME THE APPROVED SHAPE, AND NOTHING LEFT THE PRODUCT.
  //
  // This case was written on 4 Sep when the client list moved out of a 380px column into the
  // nav, and its duty was *nothing was lost in the move*. It listed the row's indicators one by
  // one: the actor dot, the next-action sentence, the cold states, the VAT badge, the house
  // chip, the filter.
  //
  // 🛑 THE FOUNDER THEN LOCKED THE ROW AT **name · stage · needs you** — "NO giant metrics in
  // list rows" — because four judgements were competing with the client's own name at 216px.
  // So the duty could not stay "every indicator is on the row". It is what it always meant:
  // **nothing became unreachable.** The cold state and the VAT evidence moved to the selected
  // client's truth panel (the Account card in `page.tsx`), which is where client facts belong;
  // the filter moved to the Clients rail as a URL. Each is asserted at its new home below.
  it('CLIENT SWITCHING SURVIVES, and nothing the row carried became unreachable', () => {
    expect(layout).toContain("import { VidaClients } from '@/components/vida/VidaClients'")
    expect(layout).toContain('<VidaClients open={openClients} />')
    expect(clients, 'selecting a client no longer scopes the conversation').toContain('setSelected(c.id, c.company_name)')
    // What the approved row still carries.
    expect(clients, 'the actor dot is gone').toContain("bg-[#EC4899]")
    expect(clients, 'the stage word is gone').toContain('stage_label')
    expect(clients, 'the needs-you marker is gone').toContain('· needs you')
    expect(clients, 'the house/demo chip is gone').toContain("c.is_demo ? 'demo' : 'house'")
    // 🛑 AND WHAT MOVED, ASSERTED AT ITS NEW HOME. #615's lesson is that a fact nobody renders
    // is a fact nobody has — neither of these is drawn anywhere else in the console, so if the
    // Account card ever goes, they go with it.
    expect(page, 'the VAT evidence is gone from the product').toContain('vatBadge({ vat_number: selectedClient.vat_number ?? null })')
    expect(page, 'the cold states are gone from the product').toContain('cold?.cold')
    expect(page, 'the going-quiet state is gone from the product').toContain('cold?.warn')
    expect(page, 'the account facts are drawn with no home').toContain("label: 'Account'")
    // The filter is the rail's now, and it is a URL rather than a component's own state.
    expect(clients, 'the Needs-you filter is gone').toContain("get('needs') === '1'")
    // ⚠️ THE URL DEEP LINK STILL PICKS A CLIENT, and only ONE place reads it now — two would
    // race, and only one of them carries the name.
    expect(clients).toContain("new URLSearchParams(window.location.search).get('client')")
    expect(page, 'the console reads ?client= as well, which races the nav').not.toContain('rows.some(r => r.id === urlClient)')
  })

  // ⛓️ RETARGETED 9 Sep — THE COUNT CHANGED BY DECISION, THE DUTY DID NOT. Ops, Compliance and
  // Outreach were retired from primary nav on the founder's explicit instruction, and their
  // pages still exist. So "all 25" is no longer the claim; **every page that is still in the
  // product is still reachable** is. The destination list itself is asserted in
  // `vida-workspaces.test.ts`, against `lib/vida-nav.ts`, which is where it now lives.
  it('🛑 EVERY NON-RETIRED DESTINATION IS STILL REACHABLE, and the 11 tabs still WRAP', () => {
    const nav = read(join(ADMIN, 'lib/vida-nav.ts'))
    const RETIRED = ['/vida/ops', '/vida/compliance', '/vida/outreach']
    for (const href of ['/vida', '/vida/queue', '/vida/bookings', '/vida/suppression', '/vida/audit',
      '/vida/reports', '/vida/nexus', '/vida/demo', '/vida/system', '/vida/sending', '/vida/engine',
      '/vida/cockpit', '/vida/clients-admin', '/vida/money-path', '/vida/billing', '/vida/revenue',
      '/vida/gtm', '/vida/unibox', '/vida/health', '/vida/founder',
      '/vida/governed-documents', '/vida/partners']) {
      expect(RETIRED, 'this list must not contain a retired route').not.toContain(href)
      expect(nav, `the operator destination ${href} is gone`).toContain(`href: '${href}'`)
    }
    expect(page).toContain("const COCKPIT_TABS = ['Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence', 'Asks', 'Bookings', 'Programme', 'Pool', 'Exceptions'] as const")
    // 🛑 WRAPPING, NOT SCROLLING. The strip needs 894px; a scroll with no affordance is how
    // eight tabs became undiscoverable.
    expect(page).toContain('flex flex-wrap items-end gap-0.5 px-3 pt-2.5 border-b border-[#eee7f7]')
    const stripAt = page.indexOf('flex flex-wrap items-end gap-0.5')
    expect(page.slice(stripAt, stripAt + 200), 'the tab strip still hides tabs behind a scroll')
      .not.toContain('overflow-x-auto')
  })
})

describe('VIDA · UI-010 — one Vida on every operator destination, with nothing stale on it', () => {
  const layout = strip(VIDA_LAYOUT)
  const chat   = strip(VIDA_CHAT)
  const page   = strip(VIDA_PAGE)

  it('AN OUTER ROUTE GETS THE COLUMN FROM THE SHELL — not from a second assistant', () => {
    expect(layout).toContain('function VidaOuterColumn()')
    expect(layout).toContain('ref={c.setSlot}')
    expect(layout).toContain('{!isConsole && <VidaOuterColumn />}')
    expect(layout).toContain("const isConsole = pathname === '/vida'")
    // 🛑 IT BUILDS NO CONVERSATION. No transcript, no composer, no state of its own.
    // ⚠️ BOUNDED TO THE FUNCTION, not a character window. A window that overruns the thing it
    // is about is the anti-pattern this codebase keeps re-learning.
    const at = layout.indexOf('function VidaOuterColumn()')
    const body = layout.slice(at, layout.indexOf('\nfunction ', at + 10))
    for (const banned of ['useState', 'cmdLog', '<form', 'placeholder']) {
      expect(body, `the outer column grew its own ${banned}`).not.toContain(banned)
    }
    // …and the provider is still mounted exactly once.
    expect(layout.match(/<VidaConversationProvider[\s>]/g) ?? []).toHaveLength(1)
  })

  it('🛑 CLIENT IDENTITY IS PERSISTENT — it is not lent by a workspace', () => {
    // Publishing the name meant clearing a stale surface also erased the client, and the
    // composer degraded to "Command Vida in client context…" the moment the console left.
    expect(chat, 'clientName is published again').not.toContain('clientName: string | null')
    expect(chat).toContain('const [selectedName, setSelectedName] = useState<string | null>(null)')
    expect(chat).toContain('placeholder={`Command Vida in ${selectedName || \'client\'} context…`}')
    // ⚠️ `undefined` MEANS "I DID NOT SAY", so an id-only caller cannot blank a known name.
    expect(chat).toContain('if (name !== undefined) setSelectedName(name)')
  })

  it('🛑 THE WORKSPACE TAKES ITS SURFACE BACK WHEN IT UNMOUNTS', () => {
    expect(chat, 'there is no way to un-publish').toContain('const unpublish = useCallback(() => { handlers.current = {}; setSurface(null) }, [])')
    expect(page, 'the console never gives its surface back').toContain('useEffect(() => () => conversation.unpublish(), [])')
    // 🛑 AND IT CLEARS ONLY THE WORKSPACE'S CONTRIBUTION. Clearing the transcript, the
    // composer or the selected client would be a different and much worse bug.
    const at = chat.indexOf('const unpublish =')
    const body = chat.slice(at, at + 200)
    for (const persistent of ['setCmdLog', 'setCmd(', 'setSelectedId', 'setSelectedName']) {
      expect(body, `unpublish also wipes ${persistent}`).not.toContain(persistent)
    }
  })

  it('🛑 A CLEARED SURFACE DRAWS NO ROW OF ZEROS', () => {
    // `{surface && …}` rendered "0 Send gate · 0 Money gate · 0 Unsent sourced · 0 To triage"
    // for ANY published surface, so a workspace that cleared its contribution still left a row
    // of confident zeros nobody had read.
    expect(chat).toContain('{surface?.blockers && (')
    expect(chat, 'the strip is guarded on the object again').not.toContain('{surface && (')
  })

  it('the provider-owned commands stay, because they are valid off the console', () => {
    // These post to `/operator/command` with the persistent selected client; sourcing is the
    // provider's too. Only the console's own launch shortcuts are gated on its handlers.
    //
    // ⛓️ 7 Sep (HOUSE-008) — RETARGETED, SAME FACT. This asserted the literal three-item array
    // `["What's blocking?", 'Status', 'Source 20 leads']`. The sourcing shortcut is no longer a
    // literal: for a programme client its label is the programme's own next batch size, so it
    // left the array and became a button whose text is derived. What this test protects is
    // UNGATED-NESS — that all three survive off the console — and that is asserted directly
    // now instead of through a string that happened to encode it.
    expect(chat).toContain('["What\'s blocking?", \'Status\']')
    expect(chat, 'the sourcing shortcut is gone').toContain('sourcingChipLabel(surface?.programmeSourcing ?? null)')
    //
    // ⚠️ THE WINDOW IS SIZED TO THE ELEMENT, NOT GUESSED. At 300 characters this did not bite:
    // the gate-to-label distance across the button's onClick and className is larger than that,
    // so gating the shortcut still passed. Proved by breaking it.
    expect(chat, 'the sourcing shortcut is now gated on a console handler, so it vanishes off the console')
      .not.toMatch(/handlers\.current\.\w+ && \([\s\S]{0,900}sourcingChipLabel/)
    for (const gated of ['handlers.current.buildIcp &&', 'handlers.current.buildCampaign &&', 'handlers.current.draftSequence &&']) {
      expect(chat, `a console-only shortcut is no longer gated (${gated})`).toContain(gated)
    }
  })
})

describe('VIDA · UI-011 — Pool and Exceptions belong to the workspace', () => {
  const page = strip(VIDA_PAGE)

  it('🛑 BOTH RENDER INSIDE THE TAB CONTAINER, not as siblings of the console', () => {
    const aside = page.indexOf('</aside>')
    const pool  = page.indexOf("{tab === 'Pool' && (<>")
    const exc   = page.indexOf("{tab === 'Exceptions' && (<>")
    const inbox = page.indexOf("{tab === 'Inbox' && (")
    for (const [at, what] of [[pool, 'Pool'], [exc, 'Exceptions']] as [number, string][]) {
      expect(at, `${what} is missing`).toBeGreaterThan(-1)
      // 🛑 THE WHOLE DEFECT IN ONE COMPARISON: they used to sit AFTER the closing tag.
      expect(at, `${what} still renders outside the workspace aside`).toBeLessThan(aside)
      expect(at, `${what} is not in the tab-content container with the other nine`).toBeGreaterThan(inbox)
    }
  })

  it('AND NOTHING IN THEM WAS REMOVED OR RESTYLED', () => {
    for (const kept of [
      'Platform-wide — not scoped to this client.',
      'Records in the pool', 'By source', 'By country', 'breakdown_sample',
      'Stranded batches', 'Someone opted out and is still inside a provider',
      'Crashed runs (last', 'Test / debris ICP candidates',
      "retireBusy === d.id ? '…' : d.is_active ? 'Retire' : 'Restore'",
    ]) {
      expect(page, `Pool/Exceptions lost "${kept}"`).toContain(kept)
    }
  })
})
