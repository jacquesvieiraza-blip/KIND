'use client'

// #485 — the Vida operator shell. Full-screen, light theme, matching
// docs/mv-previews/vida2.html: a slim top bar (Milla&Vida · operator + live chips +
// account dropdown holding the nervous system), a Vida-only left rail (operations +
// engine-health), and the working area ({children} = the clients panel + pipeline board).
// AdminShell bypasses its old chrome for /vida so this is the only shell here.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Power, LogOut, ChevronDown } from 'lucide-react'
import { VidaConversationProvider } from '@/components/vida/VidaConversation'

type Status = { outreach_enabled: boolean; daily_cap: number | null }
type Health = { sent_today: number; replies_today: number; pending_approvals: number }

// The nervous system — every existing admin page, reachable from the dropdown.
// Order + labels MIRROR docs/mv-previews/vida2.html exactly (Cockpit·Clients /
// Money Path·Billing / Revenue·GTM / Unibox·Health / Ops·Founder). Outreach +
// Compliance are real extra pages appended after the 10 so no nav is lost.
// (The mockup also shows a "⚙ Settings" link — omitted here on purpose: there is
// no /settings page yet, and a dead link would break the honesty rule.)
// The day-to-day OPERATE surfaces. These used to be a left rail, but the rail duplicated
// this same dropdown and cost a whole column — Vida needs that width for the three-column
// console (clients | Vida | cockpit). Same links, one home.
const OPERATE: { href: string; label: string; icon: string }[] = [
  { href: '/vida',             label: 'Clients',           icon: '👥' },
  { href: '/vida/queue',       label: 'Lead queue',        icon: '✦' },
  { href: '/vida/bookings',    label: 'Bookings',          icon: '📅' },
  { href: '/vida/suppression', label: 'Suppression',       icon: '🚫' },
  { href: '/vida/audit',       label: 'Audit log',         icon: '📋' },
  { href: '/vida/reports',     label: 'Reports & billing', icon: '🧾' },
  { href: '/vida/nexus',       label: 'Nexus signals',     icon: '🧠' },
  // /demo has existed all along and was in NEITHER menu, so the only way to open a demo
  // account was to know the URL. That is the one screen you reach under time pressure in
  // front of a prospect.
  { href: '/vida/demo',        label: 'Demo accounts',     icon: '🎬' },
]

const NERVOUS_SYSTEM: { href: string; label: string; icon: string }[] = [
  // FIRST on purpose. It is the one screen that answers "is anything wrong right now" for
  // BOTH halves at once — and a control you cannot find is not a control (the migration-card
  // lesson, #564). Everything below it is a detail view of something this page summarises.
  { href: '/vida/system',     label: 'System',     icon: '🩺' },
  // SECOND on purpose, and it is not the same question as System. System runs on a button and
  // probes every integration — "is everything wired". This one is read-only over writes that
  // already happened and answers "is outreach working RIGHT NOW", which is the question you ask
  // daily once Client Zero is sending (#577/#553). A glance and a probe are different tools.
  { href: '/vida/sending',    label: 'Sending',    icon: '📤' },
  { href: '/vida/engine',     label: 'Engine',     icon: '📡' },
  { href: '/vida/cockpit',    label: 'Cockpit',    icon: '📟' },
  // Was also labelled "Clients", identical to /vida in the menu above — two entries, same
  // word, different screens. This one is the admin table (grants, wallets, flags).
  { href: '/vida/clients-admin',    label: 'Client admin',    icon: '🗂' },
  { href: '/vida/money-path', label: 'Money Path', icon: '💰' },
  { href: '/vida/billing',    label: 'Billing',    icon: '🧾' },
  { href: '/vida/revenue',    label: 'Revenue',    icon: '📈' },
  { href: '/vida/gtm',        label: 'GTM Hub',    icon: '🚀' },
  { href: '/vida/unibox',     label: 'Unibox',     icon: '📥' },
  { href: '/vida/health',     label: 'Health',     icon: '❤️' },
  { href: '/vida/ops',        label: 'Ops',        icon: '🛠' },
  { href: '/vida/founder',    label: 'Founder',    icon: '👑' },
  { href: '/vida/outreach',   label: 'Outreach',   icon: '🎯' },
  { href: '/vida/compliance', label: 'Compliance', icon: '🛡' },
  // ⚠️ THE THIRD TIME THIS EXACT BUG SHIPPED, and the two comments below record the first two.
  // /governed-documents was built 20 Aug (R46), deployed, its migration run — and linked from
  // NOWHERE. The founder opened this menu, could not find it, and said so: "cant find
  // documents." A page reachable only by typing its URL is the same failure as a count nobody
  // renders (#620) — it exists, and no screen shows it.
  //
  // It was also built OUTSIDE the /vida shell, which is the half-fix the /partners comment
  // below warns about — one click and the operator is in the old console. Moved to be
  // Vida-native before it was ever linked, so that mistake is not made a second time either.
  { href: '/vida/governed-documents', label: 'Documents', icon: '📁' },
  // ⚠️ SAME BUG AS /vida/demo ABOVE, found by the founder 16 Aug the day the seat shipped:
  // /partners is a real, working screen — it holds the partner book AND the "New Client
  // Partner seat" card (R40) — but it lived only in the OLD AdminSidebar, which this menu
  // replaced. So the only way to reach the screen that creates a person's login was to
  // already know the URL. A control you cannot find is not a control.
  // (It sits outside the /vida shell, hence the bare path — the screen is unchanged.)
  // ⛓️ And the first fix was half a fix: it pointed at `/partners`, the OLD admin console —
  // one click and the operator was out of the Vida shell entirely, into a different nav with
  // Nora's panel. The founder caught it within a minute of the walk: *"i click partners in
  // the vida and it takes me to the old version this needs to stay on the new version."*
  // This is now a Vida-NATIVE page. The old console still exists for commission detail,
  // deals and payout history; the seat work lives here.
  { href: '/vida/partners',   label: 'Partners',   icon: '🤝' },
]

function initials(email: string): string {
  const name = email.split('@')[0] || 'OP'
  return name.slice(0, 2).toUpperCase()
}

// Friendly display name for the account button: "jacques.vieiraza@…" → "Jacques".
function displayName(email: string): string {
  const local = (email.split('@')[0] || '').split('.')[0]
  return local ? local.charAt(0).toUpperCase() + local.slice(1) : 'Operator'
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
  const [openOperate, setOpenOperate] = useState(true)
  const [openBusiness, setOpenBusiness] = useState(true)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('vida:nav-groups')
      if (!raw) return
      const v = JSON.parse(raw) as { operate?: boolean; business?: boolean }
      if (typeof v.operate === 'boolean') setOpenOperate(v.operate)
      if (typeof v.business === 'boolean') setOpenBusiness(v.business)
    } catch { /* private mode, or nothing stored — both groups stay open */ }
  }, [])
  useEffect(() => {
    try { localStorage.setItem('vida:nav-groups', JSON.stringify({ operate: openOperate, business: openBusiness })) }
    catch { /* private mode — the panel still works, it just forgets */ }
  }, [openOperate, openBusiness])

  useEffect(() => {
    fetch('/api/proxy/operator/status').then(r => r.json()).then(j => { if (j?.success) setStatus(j.data) }).catch(() => {})
    fetch('/api/proxy/operator/health').then(r => r.json()).then(j => { if (j?.success) setHealth(j.data) }).catch(() => {})
    fetch('/api/proxy/operator/whoami').then(r => r.json()).then(j => { if (j?.success) setEmail(j.data.email) }).catch(() => {})
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  const on = status?.outreach_enabled === true

  // ⛓️ 4 Sep — DEAD SCAFFOLDING REMOVED, NOT REVIVED. `ENGINE_RAIL`, `railLink`, `isClients`,
  // `isAudit`, `isQueue`, `isBookings`, `isSuppression`, `isReports` and `pendingCount` were
  // each declared exactly once and rendered nowhere: the remains of a left rail that was
  // deleted when the dropdown replaced it. They described five destinations out of
  // twenty-five, in a different order, with a different component — so building the real left
  // panel out of them would have shipped a nav that disagreed with the menu it replaced.
  // The panel below is built from OPERATE and NERVOUS_SYSTEM, which are the lists the
  // dropdown itself used, so nothing can be lost in the move.

  /**
   * One collapsible group of the left panel.
   *
   * ⚠️ IT IS HANDED THE LIST, IT DOES NOT KNOW ONE. Both groups render through this, from
   * `OPERATE` and `NERVOUS_SYSTEM` — so the panel has no second copy of the destinations and
   * cannot fall behind the arrays the product actually navigates by.
   */
  const group = (title: string, items: { href: string; label: string; icon: string }[], open: boolean, toggle: () => void) => (
    <div>
      <button onClick={toggle} aria-expanded={open}
        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#b3a9cc] hover:text-[#7C3AED] transition-colors">
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="truncate">{title}</span>
        <span className="ml-auto text-[10px] font-bold text-[#cfc4e8]">{items.length}</span>
      </button>
      {open && items.map(item => {
        // ⚠️ EXACT MATCH FOR `/vida`, PREFIX FOR THE REST. `/vida` is a prefix of every other
        // operator route, so a `startsWith` here would mark Clients current on all 25.
        const active = item.href === '/vida' ? pathname === '/vida' : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href}
            className={`flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[13.5px] font-semibold transition-colors ${
              active ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#4c4368] hover:bg-[#f7f4fd]'}`}>
            <span className="w-4 shrink-0 text-center">{item.icon}</span>
            <span className="truncate">{item.label}</span>
          </Link>
        )
      })}
    </div>
  )

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      {/* ── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header className="h-[52px] shrink-0 flex items-center gap-3 px-4 border-b border-[#eee7f7] bg-white">
        {/* A1 — the brand is the way home. Wherever you are in Vida, clicking it lands you
            back on the clients console. It was static text, so a sub-page was a dead end. */}
        <Link href="/vida" className="flex items-center gap-3 rounded-lg -mx-1 px-1 py-0.5 hover:opacity-80 transition-opacity" title="Back to the clients console">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[14px] font-extrabold">V</span>
          <span className="text-[16px] font-extrabold">Milla&amp;Vida <span className="text-[#9b8ec4] font-semibold text-[14px]">· operator</span></span>
        </Link>

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

          {/* Kill-switch chip */}
          <span className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1 border ${
            on ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200'
          }`} title="Global outreach kill-switch (AUTO_OUTREACH_ENABLED)">
            <Power className="w-3.5 h-3.5" /> Kill-switch {status ? (on ? 'ON' : 'OFF') : '…'}
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
          <span className="flex items-center gap-2 rounded-full border border-[#e4dcf7] bg-[#f6f2fd] py-1 pl-1 pr-3" title={email || 'Operator'}>
            <span className="w-7 h-7 rounded-full bg-[#151033] text-white flex items-center justify-center text-[12px] font-bold">{email ? initials(email) : 'OP'}</span>
            <span className="text-[14px] font-semibold text-[#1f1235]">{email ? displayName(email) : 'Operator'}</span>
          </span>
        </div>
      </header>

      {/* ── BODY: the operator nav | the working area ─────────────────────────
          ── ⚑ 4 Sep — THE CANONICAL LEFT PANEL (founder-approved) ──────────────────────────
          🛑 IT DID NOT EXIST. This row held a comment about a rail and one `<main>`; the whole
          operator navigation was the top-right dropdown. Twenty-five destinations, two clicks
          deep, in a menu shaped like an account menu.

          ⚠️ ALL 25, AND THE SAME 25. The panel renders `OPERATE` (8) and `NERVOUS_SYSTEM`
          (17) — the very arrays the dropdown rendered, in their order, with their labels and
          their icons. Not one entry is retyped here, so a destination cannot be dropped in
          the move and the two lists cannot disagree.

          ⚠️ 216px, AND NO ICON RAIL. The approved width, implemented as approved. A 56px
          icon-only breakpoint was NOT approved and is not invented here.

          ⚠️ COLLAPSIBLE, NOT COLLAPSED. Each group toggles independently and both start open,
          so nothing is hidden from an operator who has never touched the control. */}
      <div className="flex-1 flex overflow-hidden">
        <nav className="w-[216px] shrink-0 border-r border-[#eee7f7] bg-[#fdfcff] flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-2 py-3">
            {group('Operate', OPERATE, openOperate, () => setOpenOperate(o => !o))}
            <div className="h-px bg-[#f0ebfa] my-2 mx-2" />
            {group('Run the business', NERVOUS_SYSTEM, openBusiness, () => setOpenBusiness(o => !o))}
          </div>
          {/* THE ONE NON-DESTINATION THE OLD DROPDOWN HELD. */}
          <div className="shrink-0 border-t border-[#eee7f7] px-2 py-2">
            <button onClick={signOut} className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-[13.5px] font-semibold text-red-500 hover:bg-red-50 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Sign out
            </button>
          </div>
        </nav>
        {/* ── ⚑ 4 Sep — THE ONE VIDA CONVERSATION IS THE SHELL'S ────────────────────────
            It was declared inside `app/vida/page.tsx`, so every operator destination the
            founder opened destroyed the transcript and the selected client. The provider is
            mounted HERE, once, and never unmounts while Vida is open — so the conversation,
            the client it is scoped to and anything half-typed all survive navigation.

            ⚠️ WHERE IT PAINTS IS A ROUTE'S DECISION, WHO OWNS IT IS NOT. The console hands
            back the column between the client list and the workspace; a full-width operator
            table hands back nothing, so it keeps its width. Either way there is exactly one
            instance, one transcript and one composer. */}
        <VidaConversationProvider>
          <main className="flex-1 min-w-0 overflow-hidden">{children}</main>
        </VidaConversationProvider>
      </div>
    </div>
  )
}
