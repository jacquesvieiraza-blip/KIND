'use client'

// #485 — the Vida operator shell. Full-screen, light theme, matching
// docs/mv-previews/vida2.html: a slim top bar (Milla&Vida · operator + live chips +
// account dropdown holding the nervous system), a Vida-only left rail (operations +
// engine-health), and the working area ({children} = the clients panel + pipeline board).
// AdminShell bypasses its old chrome for /vida so this is the only shell here.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Power, LogOut, ChevronDown } from 'lucide-react'
import { VidaConversationProvider, useVidaConversation } from '@/components/vida/VidaConversation'
import { VidaClients } from '@/components/vida/VidaClients'

type Status = { outreach_enabled: boolean; daily_cap: number | null }
type Health = { sent_today: number; replies_today: number; pending_approvals: number }

// ── ⚑ 9 Sep — THE TWO WORKSPACES REPLACE THE TWO FLAT LISTS ─────────────────────────────
//
// ⛓️ WHAT WAS HERE. `OPERATE` (8) and `NERVOUS_SYSTEM` (17) — twenty-five destinations in two
// lists whose headings were "Operate" and "Run the business". Every destination was reachable,
// which was the win of 4 Sep, and none of them said whether you were looking at ONE CLIENT or
// at THE BUSINESS. Bookings sat beside Money Path; Client admin sat beside Unibox.
//
// 🛑 THE APPROVED ARCHITECTURE IS THAT DISTINCTION, MADE STRUCTURAL. Two workspaces —
// **Clients** (one client, their lifecycle, the one action genuinely required) and **Command
// Centre** (the business: delivery · money · system · growth · company) — switched from the
// operator menu, never mixed in one rail.
//
// The lists themselves live in `@/lib/vida-nav`, as data, so the founder's named retirements
// (Ops, Compliance, and Bookings out of the Command Centre) are assertable rather than merely
// visible. Nothing was deleted to achieve them: every retired page still resolves.
import { CLIENTS_WORKSPACE, COMMAND_CENTRE, type NavItem } from '@/lib/vida-nav'
import { killSwitchChipLabel } from '@/lib/vida-lifecycle-copy'

type Workspace = 'clients' | 'command'

/**
 * ── ⚑ 4 Sep (UI-010) — WHERE VIDA PAINTS ON AN OPERATOR DESTINATION ─────────────────────
 *
 * 🛑 THE DEFECT THIS CLOSES. `setSlot` was called in exactly ONE file — the clients console —
 * so opening Lead queue, System, Bookings or any of the other twenty-three destinations left
 * the operator with no assistant at all. The state survived (the provider never unmounts);
 * nothing painted it.
 *
 * ⚠️ NOT A SECOND VIDA. This mounts no conversation and holds no state: it hands the shell an
 * element and publishes what is TRUE HERE — which is nothing. `blockers`, `outreachEnabled`
 * and `boardError` are facts the CONSOLE read, and this route has not read them; the handlers
 * are empty, so the three console-only launch shortcuts are not offered for surfaces that are
 * not on screen. The transcript, the composer and the selected client are untouched.
 */
function VidaOuterColumn() {
  const c = useVidaConversation()
  useEffect(() => {
    c.publish({ blockers: null, outreachEnabled: null, boardError: null, programmeSourcing: null, lifecycle: null }, {})
  }, [c])
  return (
    // ⛓️ 24 Sep (R145 step 7 · #55) — ON THE RIGHT, 430px, as the redesign draws Vida. WAS 540px on the left.
    <section className="mv-vida-chat w-[430px] shrink-0 flex flex-col min-h-0">
      <div className="flex-1 min-h-0 flex flex-col" ref={c.setSlot} />
    </section>
  )
}

function initials(email: string): string {
  const name = email.split('@')[0] || 'OP'
  return name.slice(0, 2).toUpperCase()
}

// Friendly display name for the account button: "jacques.vieiraza@…" → "Jacques".
function displayName(email: string): string {
  const local = (email.split('@')[0] || '').split('.')[0]
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Operator'
}


/**
 * The CLIENTS rail — the four destinations, then the client list.
 *
 * ⚠️ IT EXISTS SO THE QUERY IS READ IN ONE SMALL PLACE. `useSearchParams` makes its caller
 * client-only; called in the layout it would have taken every Command Centre page with it.
 */
function ClientsRail({
  navLink, openClients, toggleClients, groupHead,
}: {
  navLink: (item: NavItem, needsFiltering: boolean) => React.ReactNode
  openClients: boolean
  toggleClients: () => void
  groupHead: (title: string, open: boolean, toggle: () => void, count?: number) => React.ReactNode
}) {
  const needsFiltering = useSearchParams().get('needs') === '1'
  return (
    <>
      {CLIENTS_WORKSPACE.map(i => navLink(i, needsFiltering))}
      <div className="h-px bg-[#f0ebfa] my-2 mx-2" />
      {/* ⚠️ THE CLIENT LIST IS THE ONE FOLD, because it is the one unbounded thing in the
          rail. Collapsed it still says who is selected. */}
      {groupHead('Clients', openClients, toggleClients)}
      <VidaClients open={openClients} />
    </>
  )
}

export default function VidaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [status, setStatus] = useState<Status | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [email, setEmail] = useState<string>('')
  // ⚑ 4 Sep — TWO INDEPENDENT GROUPS, and the operator's choice survives a reload. Both open
  // by default: a destination that is collapsed on first paint is a destination the operator
  // has to discover, and the whole reason this panel exists is that twenty-five of them were
  // hidden behind one dropdown.
  // ⚑ 4 Sep (UI-009) — THREE groups now. Clients moved out of a dedicated 380px column and
  // into the nav as a group of its own, which is what gives the workspace its width back.
  // ⚑ 9 Sep — WHICH WORKSPACE, AND THE CLIENT LIST'S OWN FOLD.
  //
  // ⚠️ CLIENTS IS THE DEFAULT, EXPLICITLY. The operator's day is one client at a time; the
  // Command Centre is where you go to ask about the business. Defaulting the other way would
  // make the rarer question the one you have to dismiss every morning.
  const [workspace, setWorkspace] = useState<Workspace>('clients')
  const [openClients, setOpenClients] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    try {
      const w = localStorage.getItem('vida:workspace')
      if (w === 'command' || w === 'clients') setWorkspace(w)
      const raw = localStorage.getItem('vida:nav-groups')
      if (raw) {
        const v = JSON.parse(raw) as { clients?: boolean }
        if (typeof v.clients === 'boolean') setOpenClients(v.clients)
      }
    } catch { /* private mode, or nothing stored — Clients, list open */ }
  }, [])
  useEffect(() => {
    try {
      localStorage.setItem('vida:workspace', workspace)
      localStorage.setItem('vida:nav-groups', JSON.stringify({ clients: openClients }))
    } catch { /* private mode — the panel still works, it just forgets */ }
  }, [workspace, openClients])

  // ⚠️ THE WORKSPACE FOLLOWS THE ROUTE, NOT THE OTHER WAY AROUND. Landing on a Command Centre
  // URL — a bookmark, a link in a report — must not show the Clients rail with the Command
  // Centre's page beside it. The rail is derived from where the operator actually is.
  useEffect(() => {
    const inClients = CLIENTS_WORKSPACE.some(i => i.href === '/vida' ? pathname === '/vida' : pathname.startsWith(i.href))
    if (!inClients && pathname.startsWith('/vida/')) setWorkspace('command')
  }, [pathname])

  // ⚑ 9 Sep — THE NEEDS-YOU COUNT, FROM THE SERVER'S OWN LIFECYCLE BOARD.
  //
  // 🛑 THE SAME DERIVATION THE PANEL USES. The badge and the client's own screen must never
  // disagree about whether somebody is needed, so neither of them decides it — both render
  // `deriveLifecycle`'s verdict. A badge computed in a browser is a second opinion, and the
  // one that would be wrong is the one nobody opens to check.
  const [needsYouCount, setNeedsYouCount] = useState<number | null>(null)
  useEffect(() => {
    fetch('/api/proxy/operator/lifecycle-board').then(r => r.json())
      .then(j => { if (j?.success) setNeedsYouCount(Number(j.meta?.needs_you ?? 0)) })
      // ⚠️ A FAILED READ SHOWS NO BADGE. It must never show a stale or invented number: an
      // operator who trusts a count that is not real is worse off than one with no count.
      .catch(() => setNeedsYouCount(null))
  }, [pathname])

  useEffect(() => {
    fetch('/api/proxy/operator/status').then(r => r.json()).then(j => { if (j?.success) setStatus(j.data) }).catch(() => {})
    fetch('/api/proxy/operator/health').then(r => r.json()).then(j => { if (j?.success) setHealth(j.data) }).catch(() => {})
    fetch('/api/proxy/operator/whoami').then(r => r.json()).then(j => { if (j?.success) setEmail(j.data.email) }).catch(() => {})
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  // ⛓️ 9 Sep — RENAMED FROM `on`, AND THAT NAME IS HALF THE BUG. `on` sat beside the word
  // "Kill-switch" and read as the switch's state; it holds the opposite — whether DELIVERY is
  // permitted, which is the switch being OFF. `null` while the status request is in flight, so
  // the chip can say it does not know instead of guessing.
  const outreachPermitted = status ? status.outreach_enabled === true : null
  const isConsole = pathname === '/vida'

  // ⛓️ 4 Sep — DEAD SCAFFOLDING REMOVED, NOT REVIVED. `ENGINE_RAIL`, `railLink`, `isClients`,
  // `isAudit`, `isQueue`, `isBookings`, `isSuppression`, `isReports` and `pendingCount` were
  // each declared exactly once and rendered nowhere: the remains of a left rail that was
  // deleted when the dropdown replaced it. They described five destinations out of
  // twenty-five, in a different order, with a different component — so building the real left
  // panel out of them would have shipped a nav that disagreed with the menu it replaced.
  // ⚑ 9 Sep — the panel below is built from `CLIENTS_WORKSPACE` and `COMMAND_CENTRE` in
  // `@/lib/vida-nav`, which superseded the two flat lists. Same discipline: the shell holds no
  // second copy of the destinations, so it cannot fall behind what the product navigates by.

  /** The group HEADER, used by the one remaining fold (the client list). */
  const groupHead = (title: string, open: boolean, toggle: () => void, count?: number) => (
    <button onClick={toggle} aria-expanded={open}
      className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#b3a9cc] hover:text-[#7C3AED] transition-colors">
      <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      <span className="truncate">{title}</span>
      {count !== undefined && <span className="ml-auto text-[10px] font-bold text-[#cfc4e8]">{count}</span>}
    </button>
  )

  /** One destination row. Shared by both workspaces so they cannot drift apart visually. */
  const navLink = (item: NavItem, needsFiltering: boolean) => {
    // ⚠️ EXACT MATCH FOR `/vida`, PREFIX FOR THE REST. `/vida` is a prefix of every other
    // operator route, so a `startsWith` here would mark Clients current on all of them.
    //
    // ⚑ 9 Sep — AND TWO ROWS NOW SHARE `/vida`. Clients and Needs you are the same screen with
    // and without a filter, so the query is what tells them apart; matching on the path alone
    // would light both, and the operator could not see which view they were in.
    const active = item.href === '/vida'
      ? pathname === '/vida' && needsFiltering === (item.query === 'needs=1')
      : pathname.startsWith(item.href)
    const count = item.badge === 'needs_you' ? needsYouCount : null
    return (
      <Link key={`${item.href}?${item.query ?? ''}`} href={item.query ? `${item.href}?${item.query}` : item.href}
        className={`flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13.5px] font-semibold transition-colors ${
          active ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#4c4368] hover:bg-[#f7f4fd]'}`}>
        <span className="w-4 shrink-0 text-center">{item.icon}</span>
        <span className="truncate">{item.label}</span>
        {/* ⚠️ ZERO DRAWS NOTHING. A badge reading "0" is a claim that something was counted and
            found empty, permanently on screen — which is how a real count stops being read. */}
        {count !== null && count > 0 && (
          <span className="ml-auto text-[11px] font-extrabold text-white bg-[#7C3AED] rounded-full px-1.5 min-w-[18px] text-center">{count}</span>
        )}
      </Link>
    )
  }

  /**
   * A Command Centre group.
   *
   * ⚠️ NOT COLLAPSIBLE, AND THAT IS THE APPROVED DESIGN. Seven short groups fit without
   * folding, and a fold is a place for a destination to hide — which is the defect the 4 Sep
   * panel was built to end. The Clients workspace keeps ONE fold, on the client list, because
   * that list is unbounded and the rest of the rail is three rows.
   */
  const ccGroup = (g: { title: string; items: NavItem[] }) => (
    <div key={g.title || 'top'}>
      {g.title && (
        <div className="px-2.5 pt-3 pb-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#b3a9cc]">
          {g.title}
        </div>
      )}
      {g.items.map(i => navLink(i, false))}
    </div>
  )

  return (
    // ⛓️ 24 Sep (R145 step 7 · #53 #55) — THE REDESIGN'S FRAME: the rounded app shell, a 64px top bar,
    // the menu, the operator truth and Vida on the right. Founder: *"match everything. colors
    // everything."* Every control that was here is still here — workspace switch, kill-switch
    // state, operator menu — restyled, not replaced.
    <div className="mv-root h-screen overflow-hidden">
    <div className="mv-app-shell !grid-rows-[64px_minmax(0,1fr)] text-[color:var(--mv-ink)]">
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="mv-topbar">
        {/* A1 — the brand is the way home. Wherever you are in Vida, clicking it lands you
            back on the clients console. It was static text, so a sub-page was a dead end. */}
        <Link href="/vida" className="flex items-center gap-3 rounded-lg -mx-1 px-1 py-0.5 hover:opacity-80 transition-opacity" title="Back to the clients console">
          <span className="mv-mark">V</span>
          {/* ⚑ 9 Sep — THE APPROVED HEADER: the brand, then a pill naming WHICH WORKSPACE you
              are in. "· operator" said who you were, which the chip on the right already says;
              the thing an operator cannot otherwise tell at a glance is whether this rail is
              about one client or about the business. */}
          <span className="text-[16px] font-extrabold">Vida<span className="text-[#9b8ec4]">&amp;Milla</span></span>
        </Link>
        <span className="text-[12.5px] font-bold text-[#7C3AED] bg-[#f3ecff] rounded-full px-3 py-1">
          {workspace === 'command' ? 'Command Centre' : 'Clients'}
        </span>

        <div className="ml-auto flex items-center gap-2">
          {/* Engine health — was the rail's "ENGINE HEALTH · FIGSY" box. */}
          <span className="hidden md:inline-flex items-center gap-2 text-xs font-semibold text-[#5c5279] bg-[#f6f2fd] border border-[#e4dcf7] rounded-full px-3 py-1"
            title="Sent today · open replies to triage · drafts awaiting your approval. Demos and house accounts excluded.">
            <span>{health?.sent_today ?? '—'} sent</span>
            <span className="text-[#cfc4e8]">·</span>
            <span>{health?.replies_today ?? '—'} to triage</span>
            <span className="text-[#cfc4e8]">·</span>
            <span>{health?.pending_approvals ?? '—'} to approve</span>
          </span>

          {/* 🛑 Kill-switch chip — THE WORDING IS NOT WRITTEN HERE. It comes from the module
              that owns "ON means blocked" (`killSwitchChipLabel`, beside `sendingCard`),
              because this chip and the programme SENDING card said opposite things about the
              same boolean for seven weeks. One surface inverting on its own is what broke. */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border ${
            outreachPermitted ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
          }`} title="Global outreach kill-switch (AUTO_OUTREACH_ENABLED)">
            <Power className="w-3.5 h-3.5" /> {killSwitchChipLabel(outreachPermitted)}
          </span>
          {/* Cap chip — neutral "…" until status loads (never assert "no cap" on unknown),
              amber only when status has loaded AND no cap is configured, purple with the cap. */}
          <span className={`inline-flex items-center text-xs font-bold rounded-full px-3 py-1 border ${
            !status ? 'text-[#9b8ec4] bg-[#f6f2fd] border-[#e4dcf7]'
              : status.daily_cap == null ? 'text-amber-700 bg-amber-50 border-amber-200'
              : 'text-[#7C3AED] bg-purple-50 border-purple-200'
          }`} title="Global daily cold-send cap (FIGSY_COLD_DAILY_CAP / warm-up ramp)">
            {!status ? 'Cap …' : status.daily_cap == null ? '⚠ No send cap set' : `Cap ${status.daily_cap}/day`}
          </span>

          {/* ── ⚑ 4 Sep — THE OPERATOR CHIP KEEPS ITS PLACE; ITS MENU DOES NOT ──────────
              🛑 THE NAVIGATION PANEL THAT HUNG HERE IS GONE. Twenty-five destinations lived
              in a 280px dropdown, two columns wide, behind a chip that looks like an account
              menu — so the founder went looking for Documents in his own product and could
              not find it. Every one of those twenty-five is now a permanent row in the LEFT
              PANEL below, under the same two group headings this menu used.

              ⚠️ THE CHIP ITSELF IS PRESERVED, EXACTLY AS IT WAS: the avatar initials and the
              operator's name, in the same corner, at the same size. It says who is signed in,
              which is the one thing it was truthfully doing.

              ⚠️ AND NO NEW ACCOUNT MENU IS INVENTED TO REPLACE THE OLD ONE. Sign out moved to
              the left panel's footer — the only control the dropdown held that was not a
              destination — and nothing else was added. */}
          {/* ── ⚑ 9 Sep — THE CHIP BECOMES THE WORKSPACE SWITCH ────────────────────────
              ⚠️ AND IT IS NOT THE OLD TWENTY-FIVE-LINK DROPDOWN COMING BACK. That menu was
              removed on 4 Sep because navigation hidden behind an account chip is navigation
              the founder could not find. This holds exactly TWO destinations — the two
              workspaces — plus who is signed in and sign out. Every page is still a permanent
              row in the rail below; nothing is reachable only from here. */}
          <div className="relative">
            <button onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen}
              className="flex items-center gap-2 rounded-full border border-[#e4dcf7] bg-[#f6f2fd] py-1 pl-1 pr-2.5 hover:bg-[#f0eafb] transition-colors"
              title={email || 'Operator'}>
              <span className="w-7 h-7 rounded-full bg-[#151033] text-white flex items-center justify-center text-[12px] font-bold">{email ? initials(email) : 'OP'}</span>
              <span className="text-[14px] font-semibold text-[#1f1235]">{email ? displayName(email) : 'Operator'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-[#9b8ec4] transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-[280px] z-20 bg-white border border-[#eee7f7] rounded-xl shadow-lg py-2">
                  <div className="px-3 pt-1 pb-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#b3a9cc]">Workspace</div>
                  {([
                    { key: 'clients' as const, label: 'Clients', hint: 'Selected client · Vida · lifecycle', href: '/vida' },
                    { key: 'command' as const, label: 'Command Centre', hint: 'The business · delivery · money · system', href: '/vida/cockpit' },
                  ]).map(w => (
                    <Link key={w.key} href={w.href} onClick={() => { setWorkspace(w.key); setMenuOpen(false) }}
                      className={`block px-3 py-2 hover:bg-[#f7f4fd] ${workspace === w.key ? 'bg-[#f3ecff]' : ''}`}>
                      <span className={`flex items-center gap-2 text-[14px] font-bold ${workspace === w.key ? 'text-[#7C3AED]' : 'text-[#1f1235]'}`}>
                        {w.label}{workspace === w.key && <span className="ml-auto text-[12px]">✓</span>}
                      </span>
                      <span className="block text-[12px] text-[#9b8ec4]">{w.hint}</span>
                    </Link>
                  ))}
                  <div className="h-px bg-[#f0ebfa] my-1.5 mx-3" />
                  <div className="px-3 pb-1 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#b3a9cc]">Account</div>
                  <div className="px-3 pb-1.5 text-[13.5px] font-semibold text-[#1f1235] truncate">{email || 'Operator'}</div>
                  <button onClick={signOut}
                    className="w-full text-left px-3 py-2 text-[13.5px] font-bold text-red-500 hover:bg-red-50 transition-colors">
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY: the operator nav | the working area ─────────────────────────
          ── ⚑ 4 Sep — THE CANONICAL LEFT PANEL (founder-approved) ──────────────────────────
          🛑 IT DID NOT EXIST. This row held a comment about a rail and one `<main>`; the whole
          operator navigation was the top-right dropdown. Twenty-five destinations, two clicks
          deep, in a menu shaped like an account menu.

          ── ⚑ 9 Sep — AND NOW IT IS TWO PANELS, ONE AT A TIME ──────────────────────────
          The 4 Sep panel made all twenty-five destinations permanent, which was the fix for a
          founder who could not find Documents in his own product. What it could not say was
          whether a destination was about ONE CLIENT or about THE BUSINESS — Bookings sat
          beside Money Path. The approved architecture splits them into two workspaces and
          renders whichever one the operator is in.

          ⚠️ NOTHING WENT BACK BEHIND A MENU. Every destination is still a permanent row; the
          operator menu holds the two workspaces and sign out, and no page is reachable only
          from it. Ops, Compliance and the Command Centre's Bookings entry are gone on the
          founder's explicit decision — their pages and data are untouched.

          ⚠️ 216px, AND NO ICON RAIL. The approved width, implemented as approved. A 56px
          icon-only breakpoint was NOT approved and is not invented here. */}
      {/* ⚠️ THE PROVIDER WRAPS THE NAV TOO, and that is not cosmetic nesting. The CLIENTS
          group IS the client switcher now, so it calls `setSelected` — outside the provider it
          would read the inert context and every click would be a silent no-op. */}
      <VidaConversationProvider>
      <div className="flex min-h-0 overflow-hidden">
        <nav className="mv-leftnav w-[180px] shrink-0 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {/* ── ⚑ 9 Sep — ONE RAIL, WHICHEVER WORKSPACE IS OPEN ─────────────────────────
                🛑 THE TWO ARE NEVER MIXED. That is the whole architecture: a rail that shows
                Client admin beside Meetings cannot tell you whether you are looking at one
                client or at the business, which is the question this console exists to answer
                first. The workspace is chosen from the operator menu above, and it also
                follows the route — a Command Centre bookmark opens the Command Centre. */}
            {workspace === 'clients' ? (
              // ⚠️ SUSPENSE, AND IT IS NOT DECORATION. `Needs you` is a filter carried in the
              // URL, and reading the query opts a component out of static prerendering — this
              // shell wraps twenty-seven pages, so without the boundary the whole Command
              // Centre fails to build. The boundary keeps the cost where the query is read.
              <Suspense fallback={<div className="px-2.5 py-2 text-[12px] text-[#b3a9cc]">Clients…</div>}>
                <ClientsRail
                  navLink={navLink}
                  openClients={openClients}
                  toggleClients={() => setOpenClients(o => !o)}
                  groupHead={groupHead}
                />
              </Suspense>
            ) : (
              COMMAND_CENTRE.map(ccGroup)
            )}
          </div>
          {/* ⚑ 9 Sep — THE FOOTER'S SIGN OUT MOVED INTO THE OPERATOR MENU, where the approved
              design puts it, beside the account it signs out of. It is not duplicated here:
              two sign-out buttons is two things to keep in step for no gain. */}
          <div className="shrink-0 border-t border-[#eee7f7] px-3 py-2 text-[11px] text-[#b3a9cc]">
            {workspace === 'command' ? 'The business, not one client.' : 'Vida runs the work. You decide the exceptions.'}
          </div>
        </nav>
          {/* ⚑ 4 Sep (UI-010) — THE CONSOLE OWNS ITS OWN COMPOSITION; EVERY OTHER DESTINATION
              GETS THE COLUMN FROM HERE. `/vida` places the conversation itself, between the
              client context it draws and its eleven-tab workspace. Anywhere else, the shell
              paints it — same provider, same transcript, same composer. */}
          <main className="mv-ops-main flex-1 min-w-0 overflow-hidden">{children}</main>
          {!isConsole && <VidaOuterColumn />}
        </div>
      </VidaConversationProvider>
    </div>
    </div>
  )
}
