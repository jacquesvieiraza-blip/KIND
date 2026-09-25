'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, CalendarCheck, Target, FileBarChart, LogOut, TrendingUp, LineChart, Gem, Crosshair, Workflow, GraduationCap,
  LayoutGrid, Users, Star, User, CreditCard, Gauge, FileText, Gift, ChevronDown, MessageSquare,
  Menu, X, ChevronLeft, ChevronUp,
} from 'lucide-react'
// ⛓️ 16 Sep (MVP1 · B1) — THE RIBBON PRINTS THE CANONICAL SIX.
//
// 🛑 `MILLA_STAGES` IS SEVEN AND STARTS AT PROOF. So the client's own ribbon had no Brief on
// it at all — the first thing they ever do was not on their map — and its numbering did not
// match the operator's, which ran on a different eight. `packages/shared/src/mvp1-stage.ts`
// held the founder's six-stage projection for both consoles and NOTHING IMPORTED IT.
//
// ⚠️ `MillaStage` IS STILL THE TRANSPORT. `/my/programme` answers in the engine's own
// customer vocabulary and that is unchanged; only what the ribbon PRINTS is projected.
import {
  MVP1_MILLA_STAGES, mvp1MillaStageFromLegacy, type MillaStage,
} from '@kind/shared'
import { MillaConversationProvider } from '@/components/milla/MillaConversation'

// #490/#510 — the Milla client shell (docs/mv-previews/milla2.html): slim top bar (brand +
// account dropdown), a full client rail (Home · Meetings · Programme · Reports · RECENT
// REPLIES from LIVE data), and the working area.
//
// ⛓️ 30 Aug (BUILD-004A-1 live-walk) — THE WALLET CHIP IS GONE FROM THE TOP BAR. It read
// "$4,000 wallet" on the founder's own live walk. There is no wallet in the programme model:
// no balance, no top-ups, and money is the two 50% programme payments. A retired number in
// the top-right corner of EVERY screen is the most-read stale claim in the product.
//
// ⚠️ NOTHING REPLACES IT. The corner is left to the Account dropdown, which keeps its
// position and design. Inventing a "programme value" or "next payment" chip to fill the gap
// would be a new visible decision nobody approved — and the top bar is not where a customer
// should learn what they owe.

type Summary = {
  // ⛓️ `leads_awaiting` IS NOT READ HERE ANY MORE. It badged the rail's "New leads" (removed
  // by 4A-1 ruling 1) and then the FLOW bar's "You approve" (removed by Decision 1). The
  // endpoint still returns it; this shell no longer has a place to put a per-lead approval
  // count, and leaving it in the type is an invitation to find one.
  /**
   * ⚑ 18 Sep (J24-C1) — `null` when the count could not be read.
   *
   * ⚠️ THE BADGE BELOW ALREADY DID THE RIGHT THING BY ACCIDENT AND NOW DOES IT ON PURPOSE:
   * `s?.meetings_booked || undefined` renders no badge for `null`, which is correct — an
   * unreadable count has no number to show, and showing "0" would be the fabrication.
   */
  meetings_booked: number | null
  recent_replies: { name: string; classification: string }[]
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

/** The "M · Milla" return chip, drawn once so the button and the link cannot drift apart. */
const MILLA_CHIP = 'ml-auto flex items-center gap-1.5 h-7 rounded-full border border-[#e8e3ec] bg-white pl-1 pr-2.5 text-[12.5px] font-bold text-[#342e3b]'
const MILLA_CHIP_DOT = 'w-5 h-5 rounded-full bg-gradient-to-br from-[#6f3df4] to-[#d84ca5] text-white text-[10px] font-extrabold flex items-center justify-center'

const REPLY_TONE: Record<string, string> = {
  hot: 'interested', warm: 'interested', interested: 'interested',
  cold: 'not now', opt_out: 'opted out', unsubscribe: 'opted out',
  wrong_person: 'wrong person', referral: 'referral', out_of_office: 'out of office',
}

export function MillaShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [s, setS] = useState<Summary | null>(null)
  // ⚑ 30 Aug (BUILD-004A-1 live-walk, founder Decision 1) — the FLOW bar's ONE fact. The
  // stage comes from the same endpoint the home and the Programme page read, so the ribbon
  // cannot say one thing while the Stage card says another — which was finding 5's shape.
  const [stage, setStage] = useState<MillaStage | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  // ── ⚑ 4 Sep (UI-008) — THE APPROVED PHONE BEHAVIOUR: "the section covers her" ──────────
  //
  // 🛑 THE BLOCKER THIS CLOSES. Below ~900px the shell laid a 260px rail and a 600px
  // conversation side by side with `shrink-0`, so `<main>` resolved to ZERO width: the
  // workspace did not exist on a phone, and the conversation was clipped by `overflow-hidden`.
  //
  // ⚠️ COVERED, NEVER UNMOUNTED. `nav` opens the sections over the screen; `cover` draws the
  // workspace over the conversation. The conversation stays in the DOM either way, which is
  // what keeps the transcript, the session and anything half-typed exactly where the customer
  // left them — and is also why the cover is a LAYER and not `hidden`: a hidden element has
  // `scrollHeight` 0, and the transcript's scroll-to-bottom reads that.
  const [navOpen, setNavOpen] = useState(false)
  const [cover, setCover] = useState(false)

  useEffect(() => {
    ;(async () => {
      const tok = await token()
      // ⚠️ SETTLED SEPARATELY. The rail's live counts and the programme stage are different
      // facts; one failing must not blank the other.
      const [sr, pr] = await Promise.allSettled([
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: { stage: MillaStage } }>('/my/programme', tok),
      ])
      if (sr.status === 'fulfilled') setS(sr.value.data)
      // ⚠️ A FAILED READ LEAVES THE STAGE UNKNOWN, NOT "Proof". The ribbon then marks NO
      // step current rather than asserting a stage nobody confirmed — the same rule the
      // Programme page follows, and the reason a 503 there renders the locked sentence
      // instead of an empty programme.
      if (pr.status === 'fulfilled') setStage(pr.value.data.stage)
    })()
  }, [])
  // ⚑ 24 Sep — WHOSE PORTAL THIS IS, as the redesign draws it in the top-right corner and the
  // rail's foot. A client still in their Brief has no client row yet, so this is simply absent
  // and the corner says "Account" — never a guessed name.
  const [companyName, setCompanyName] = useState<string | null>(null)
  useEffect(() => {
    ;(async () => {
      try {
        const r = await api.get<{ data?: { company_name?: string | null } }>('/clients/me', await token())
        const n = r?.data?.company_name?.trim(); if (n) setCompanyName(n)
      } catch { /* no client row yet, or unreadable — the corner says "Account" */ }
    })()
  }, [pathname])

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  // The drawer closes on any navigation; so does an in-place cover, because arriving at a
  // section IS the cover — a stale `cover` would put Home's workspace over another route's.
  useEffect(() => { setNavOpen(false); setCover(false) }, [pathname])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  // ── 🛑 ⚑ 22 Sep — THE CLIENT LANDS IN THE PORTAL, AND THE FIRST RUN HAPPENS INSIDE IT ──
  //
  // ⛓️ WAS: ~~`if (pathname === '/milla/welcome') return <>{children}</>`~~ — #513's rule that
  // *"onboarding is full-screen (no rail/top bar) until the client's ICP is live"*.
  //
  // 🛑 FOUNDER-LOCKED 22 Sep: *"the client lands after sign up and lands in Milla portal. they
  // speak there and see there."* The first run was already a Milla CONVERSATION — that part
  // was right and is untouched — but it took the whole screen, so a client talking to her had
  // nothing beside her: no rail, no flow ribbon, and **no workspace filling as she understood
  // them**. Seeing what she has understood, while they are still there to correct it, is the
  // point of the panel; a full-screen conversation cannot show it.
  //
  // ⚠️ THIS ALSO CLOSES S1-RT-001 AT ITS SOURCE. That item added a second Sign out to the
  // onboarding header *because* this early return hid the product's only one. The rail is now
  // present from the first second, so the canonical control is back and the duplicate is gone
  // — one sign-out path again, which is what the item wanted and could not have while this
  // line existed.
  //
  // ⚠️ THE ROUTE IS UNCHANGED. `/milla/welcome` still owns the first-run conversation and all
  // of its logic; what changed is the frame around it. Nothing about WHERE the brief is
  // collected, stored or promoted moved.
  const isOnboarding = pathname === '/milla/welcome'
  const isLeads = pathname === '/milla'
  const link = (href: string, label: string, Icon: React.ElementType, active: boolean, badge?: number) => (
    <Link key={label} href={href} className={`mv-nav-item ${active ? 'active' : ''}`}>
      <Icon className="w-4 h-4 shrink-0 text-[#8d8495]" /> {label}
      {badge ? <span className="mv-badge">{badge}</span> : null}
    </Link>
  )

  const ACCOUNT: [string, string, React.ElementType][] = [
    // #628 — this row read 'My profile'. The founder went looking for Settings on his own
    // product and could not find it: the page at /milla/settings holds account settings, not a
    // profile, and the rail was the only place that named it. Named for what it is.
    ['/milla/settings', 'Settings', User], ['/milla/billing', 'Billing', CreditCard],
    ['/milla/usage', 'Usage', Gauge], ['/milla/referral', 'Referral', Gift],
  ]
  // The ROI / insights surface lives in the top-right dropdown (not the left rail) so the
  // rail stays purely the client's workspace. Still kept — this is how we prove the ROI.
  const ROI: [string, string, React.ElementType][] = [
    ['/milla/performance', 'Performance', TrendingUp], ['/milla/analytics', 'Analytics', LineChart],
    ['/milla/roi', 'Your ROI', Gem], ['/milla/command-centre', 'Command Centre', LayoutGrid],
    ['/milla/teams', 'Teams Hub', Users],
  ]

  // ⚑ 4 Sep — WHAT THE PHONE'S COVER BAR IS CALLED. Longest prefix wins, so /milla/icp does
  // not answer to the /milla row. On Home the cover is Home's own workspace, which the
  // approved preview names by what is under it: the programme.
  const SECTION_LABEL: [string, string][] = [
    ['/milla/pipeline', 'Pipeline'], ['/milla/meetings', 'Meetings'], ['/milla/programme', 'Programme'],
    ['/milla/replies', 'Inbox'], ['/milla/icp', 'My ICP'], ['/milla/documents', 'Documents'],
    ['/milla/reports', 'Reports'], ['/milla/coaching', 'Coaching'], ['/milla/performance', 'Performance'],
    ['/milla/analytics', 'Analytics'], ['/milla/roi', 'Your ROI'], ['/milla/command-centre', 'Command Centre'],
    ['/milla/teams', 'Teams Hub'], ['/milla/settings', 'Settings'], ['/milla/billing', 'Billing'],
    ['/milla/usage', 'Usage'], ['/milla/referral', 'Referral'],
  ]
  const sectionLabel = SECTION_LABEL
    .filter(([href]) => pathname.startsWith(href))
    .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ?? 'Programme'

  // ── ⚑ 4 Sep (UI-008) — IS THE WORKSPACE COVERING HER RIGHT NOW? (phone only) ───────────
  //
  // A SECTION is a cover by definition: the customer asked for it and it is the screen. HOME
  // is the conversation, and its own workspace comes up on the handle. One boolean, so the
  // cover bar, the layer and the handle cannot disagree about which state we are in.
  const covering = !isLeads || cover

  // ⚑ 24 Sep — WHAT THE CORNER AND THE RAIL'S FOOT SAY. Two letters from the company, or "AC"
  // (account) until there is one.
  const who = companyName ?? 'Account'
  const initials = companyName
    ? companyName.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('')
    : 'AC'
  // ⚑ 24 Sep — THE STAGE THE TOP BAR NAMES and the workspace's subtitle, from the same position
  // the FLOW bar marks. Unknown names nothing, exactly like the bar.
  const stageAt = isOnboarding ? 0 : stage ? MVP1_MILLA_STAGES.indexOf(mvp1MillaStageFromLegacy(stage)) : -1
  const stageName = stageAt >= 0 ? MVP1_MILLA_STAGES[stageAt] : null
  // The redesign's own subtitle for each stage's Live workspace, word for word — IN STAGE ORDER,
  // indexed by position. ⚠️ No stage label is typed here: the names come only from
  // `MVP1_MILLA_STAGES`, so a retired journey cannot slip back in through this list.
  const WORKSPACE_SUB: readonly string[] = [
    'Your brief updates live as you talk.',
    'Proof before payment: see the market, calibrate it, then choose.',
    'Buy the outcome, not lead volume.',
    'One exact version. Nothing sends against anything else.',
    'M&V keeps working. You only step in when judgement matters.',
    'Delivered, closed and preserved — no automatic restart.',
  ]
  const onHome = isOnboarding || isLeads
  const workspaceTitle = onHome ? 'Live workspace' : sectionLabel
  const workspaceSub = onHome && stageAt >= 0 ? WORKSPACE_SUB[stageAt] ?? '' : ''

  // The redesign's rail: two groups, its own glyphs, the live counts as badges.
  const RAIL: [string, string, string, string, number | undefined][] = [
    ['Workspace', '/milla', 'Home', '⌂', undefined],
    ['Workspace', '/milla/pipeline', 'Pipeline', '↗', undefined],
    ['Workspace', '/milla/meetings', 'Meetings', '◫', s?.meetings_booked || undefined],
    ['Workspace', '/milla/programme', 'Programme', '◇', undefined],
    // #644 — THE REPLY IS THE OUTCOME THE CLIENT IS PAYING FOR, so it keeps a permanent home here,
    // badged with the same live count the old "Recent replies" list was built from.
    // ⛓️ 25 Sep (R165) — CALLED "INBOX", NOT "REPLIES" (founder: *"this also needs to be lablled
    // inbox. not replies."*). Same route, same badge.
    ['Workspace', '/milla/replies', 'Inbox', '✉', s?.recent_replies?.length || undefined],
    ['Your programme', '/milla/icp', 'My ICP', '◎', undefined],
    ['Your programme', '/milla/documents', 'Documents', '□', undefined],
    ['Your programme', '/milla/reports', 'Reports', '↗', undefined],
    // M9 — we booked the meeting; this is how the client wins it.
    ['Your programme', '/milla/coaching', 'Coaching', '◌', undefined],
  ]
  const railActive = (href: string) => href === '/milla' ? (isLeads || isOnboarding) : pathname.startsWith(href)

  return (
    // ⚠️ `h-dvh`, NOT `h-screen`. `100vh` does not shrink when the phone keyboard opens, so
    // the composer at the foot of the conversation was pushed under it. The dynamic viewport
    // unit is the whole fix; on desktop the two are identical.
    // ── ⚑ 24 Sep — THE REDESIGN'S FRAME, CLASS FOR CLASS ─────────────────────────────────────
    // Founder: *"this is the vision of the product… you need to build every section both in
    // milla and vida to this"* · *"match everything. colors everything."* The frame, the 64px top
    // bar, the 42px FLOW bar and the 180 | 470–560 | rest columns are the redesign's own rules
    // (`@kind/shared/design/mv-design.css`), not a re-typing of them.
    <div className="mv-root h-dvh flex flex-col overflow-hidden">
      <div className="mv-app-shell">
      {/* top bar */}
      <header className="mv-topbar">
        {/* A1 — the brand is the way home. Clicking it from any rail page returns the client to
            their main screen. */}
        <Link href="/milla" className="mv-brand" title="Back to Milla">
          <div className="mv-mark">M</div>
          <div className="mv-brand-name">Milla<span>&amp;Vida</span></div>
        </Link>
        {stageName ? (
          <div className="mv-stage-title"><strong>{stageName}</strong><span>Client portal · Stage {stageAt + 1}</span></div>
        ) : null}
        <div className="mv-top-spacer" />
        {/* ⚑ 4 Sep (UI-008) — THE PHONE'S WAY INTO THE NINE SECTIONS, and into the account.
            The Account chip is hidden below the breakpoint (approved), so every destination it
            held — Your ROI, Settings, Billing, Usage, Referral and Sign out — is repeated in
            the drawer this opens. Nothing became unreachable; it moved behind one control. */}
        <button onClick={() => setNavOpen(true)} aria-label="Open menu"
          className="md:hidden -mr-1 p-2 rounded-lg text-[#342e3b] hover:bg-[#f6f4f8]">
          <Menu className="w-5 h-5" />
        </button>
        {/* ⚑ 24 Sep — THE ACCOUNT DROP-DOWN STAYS. Founder: *"dont forget in Milla you need to keep
            top right drop down."* Same two groups, same destinations, restyled as the redesign's
            corner (initials + company ▾). */}
        <div className="hidden md:flex items-center">
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)} className="mv-account">
              <span className="mv-account-dot">{initials}</span>
              {who} <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-56 rounded-xl border border-[#e8e3ec] bg-white shadow-[0_18px_60px_rgba(31,18,47,.075),0_2px_10px_rgba(31,18,47,.035)] py-2">
                <div className="mv-nav-label pt-1">Your ROI</div>
                {ROI.map(([href, label, Icon]) => (
                  <a key={label} href={href} className="mv-nav-item">
                    <Icon className="w-4 h-4 text-[#8d8495]" /> {label}
                  </a>
                ))}
                <div className="my-1.5 border-t border-[#e8e3ec]" />
                <div className="mv-nav-label pt-1">Account</div>
                {ACCOUNT.map(([href, label, Icon]) => (
                  <a key={label} href={href} className="mv-nav-item">
                    <Icon className="w-4 h-4 text-[#8d8495]" /> {label}
                  </a>
                ))}
                <div className="my-1.5 border-t border-[#e8e3ec]" />
                <button onClick={signOut} className="mv-nav-item text-[#bb3c48]">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* #501 flow ribbon — the client's journey, now the redesign's FLOW bar.
          THE BAR IS DERIVED, NOT WRITTEN: ⛓️ 16 Sep (B1) the constant is `MVP1_MILLA_STAGES` — the
          founder's canonical SIX in @kind/shared/mvp1-stage, the same module Vida's ribbon reads.
          ⚠️ NOT ONE LABEL IS TYPED HERE. What renders is what the constant holds, in its order.
          ⚑ 24 Sep — finished stages carry ✓, the current one the accent ring, as the redesign draws
          them. ⚠️ DESKTOP ONLY on a phone (founder-approved, UI-008). */}
      <div className="mv-stagebar hidden md:flex">
        <div className="mv-label">FLOW</div>
        <div className="mv-steps">
        {MVP1_MILLA_STAGES.map((label, i, arr) => {
          // ⚠️ -1 WHEN THE STAGE IS UNKNOWN, and that is a real state, not a default. A failed or
          // still-loading `/my/programme` marks NOTHING current.
          // ── 🛑 ⚑ 22 Sep — THE FIRST RUN IS BRIEF, AND IT IS THE ROUTE THAT SAYS SO ──────
          // ⚠️ SO THE EXCEPTION IS KEYED ON `isOnboarding`, NEVER ON A NULL STAGE.
          const at = isOnboarding ? 0 : stage ? arr.indexOf(mvp1MillaStageFromLegacy(stage)) : -1
          const isCurrent = at >= 0 && i === at
          const isDone    = at >= 0 && i < at
          return (
            <span key={label} className="flex items-center gap-1.5 shrink-0">
              <div className={`mv-step ${isCurrent ? 'on' : isDone ? 'done' : ''}`}><i>{isDone ? '✓' : i + 1}</i>{label}</div>
              {i < arr.length - 1 && <span className="mv-sep" />}
            </span>
          )
        })}
        </div>
      </div>

      <div className="mv-portal-milla relative">
        {/* ⚑ 4 Sep (UI-008) — ONE RAIL, TWO PRESENTATIONS. Below the breakpoint it is the drawer
            the burger opens, over the screen; above it, it is the column it has always been. */}
        {navOpen && (
          <button aria-label="Close menu" onClick={() => setNavOpen(false)}
            className="md:hidden absolute inset-0 z-40 bg-[#17141c]/30" />
        )}
        <aside className={`mv-leftnav ${
          navOpen ? 'absolute inset-y-0 left-0 z-50 w-[260px] shadow-2xl md:static md:w-auto md:shadow-none' : 'hidden md:flex'}`}>
          <button onClick={() => setNavOpen(false)} aria-label="Close menu"
            className="md:hidden self-end m-2 p-1.5 rounded-lg text-[#a29aa9] hover:bg-[#f0eafd]">
            <X className="w-4.5 h-4.5" />
          </button>
          <nav className="mv-nav-scroll">
            {(['Workspace', 'Your programme'] as const).map(group => (
              <div key={group} className="mv-nav-group">
                <div className="mv-nav-label">{group}</div>
                {RAIL.filter(r => r[0] === group).map(([, href, label, ico, badge]) => (
                  <Link key={href} href={href} className={`mv-nav-item ${railActive(href) ? 'active' : ''}`}>
                    <span className="mv-ico">{ico}</span>{label}
                    {badge ? <span className="mv-badge">{badge}</span> : null}
                  </Link>
                ))}
              </div>
            ))}
            {/* ── ⚑ 24 Sep — RECENT REPLIES STAYS (founder ruling 3, 30 Aug) ─────────────────
                The redesign's rail has no such list; the founder's ruling keeps it, so it is here,
                in the redesign's rail styling. #644 — every entry opens the reply screen. */}
            <div className="mv-nav-group">
              {/* ⛓️ 25 Sep (R165) — the list STAYS (ruling 3); only its name follows the Inbox. */}
              <div className="mv-nav-label">Latest in your inbox</div>
              {s && s.recent_replies.length === 0 && <div className="px-2.5 text-[9px] text-[#a29aa9]">Nothing yet.</div>}
              {(s?.recent_replies ?? []).map((r, i) => (
                <Link key={i} href="/milla/replies" className="mv-nav-item">
                  <Star className="w-3.5 h-3.5 text-[#d84ca5] shrink-0" />
                  <span className="min-w-0 truncate"><b>{r.name}</b> <span className="text-[#a29aa9]">· {REPLY_TONE[r.classification] ?? r.classification}</span></span>
                </Link>
              ))}
            </div>
            {/* ⚑ 4 Sep (UI-008) — WHAT THE PHONE'S HIDDEN ACCOUNT CHIP HELD, kept reachable, from
                the SAME `ROI` and `ACCOUNT` arrays the desktop dropdown uses. */}
            <div className="md:hidden">
              <div className="mv-nav-group">
                <div className="mv-nav-label">Your ROI</div>
                {ROI.map(([href, label, Icon]) => link(href, label, Icon, pathname.startsWith(href)))}
              </div>
              <div className="mv-nav-group">
                <div className="mv-nav-label">Account</div>
                {ACCOUNT.map(([href, label, Icon]) => link(href, label, Icon, pathname.startsWith(href)))}
                <button onClick={signOut} className="mv-nav-item text-[#bb3c48]">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            </div>
          </nav>
          <div className="mv-nav-foot">Tell Milla the outcome.<br />We’ll do the work.
            <div className="mv-nav-profile"><div className="mv-round">{initials}</div><div><b>{who}</b><div style={{ fontSize: 8, marginTop: 2 }}>Account</div></div></div>
          </div>
        </aside>
        {/* ── ⚑ 4 Sep — THE CONVERSATION IS THE SHELL'S, NOT THE ROUTE'S ──────────────────
            ⚠️ ONE INSTANCE. Mounted here, once, beside the working area — so every route is the
            SAME conversation, and none of them may build a second one.
            ⚑ 24 Sep — AND THE BRIEF TOO. The first run no longer stands this column down; it
            renders INTO it (`claimChatSlot`), so it is one chat from sign-up to Complete. */}
        <MillaConversationProvider
          handleOpen={() => setCover(true)}
          handleHidden={covering}
        >
          {/* ── ⚑ 4 Sep (UI-008) — ON A PHONE THE SECTION COVERS HER ────────────────────
              ⚠️ A LAYER, NOT A REPLACEMENT — and deliberately not `hidden`. The conversation
              below stays mounted and LAID OUT, so the transcript, the session and the composer
              are exactly where the customer left them when they come back. */}
          <main className={`mv-workspace flex-1 min-w-0 overflow-hidden ${
            covering ? 'absolute inset-0 z-30 flex flex-col md:static md:z-auto' : 'hidden md:flex md:flex-col'}`}>
            {/* THE WAY BACK. Both controls the approved preview draws — the back arrow and
                the "M · Milla" chip — and they do the same thing: reveal the conversation that
                was never gone. */}
            <div className="md:hidden shrink-0 flex items-center gap-2 px-3 h-[46px] border-b border-[#e8e3ec] bg-white">
              {isLeads ? (<>
                <button onClick={() => setCover(false)} aria-label="Back to Milla"
                  className="p-1.5 -ml-1 rounded-lg text-[#342e3b] hover:bg-[#f6f4f8]"><ChevronLeft className="w-5 h-5" /></button>
                <b className="text-[15.5px]">{sectionLabel}</b>
                <button onClick={() => setCover(false)} className={MILLA_CHIP}>
                  <span className={MILLA_CHIP_DOT}>M</span> Milla
                </button>
              </>) : (<>
                <Link href="/milla" aria-label="Back to Milla"
                  className="p-1.5 -ml-1 rounded-lg text-[#342e3b] hover:bg-[#f6f4f8]"><ChevronLeft className="w-5 h-5" /></Link>
                <b className="text-[15.5px]">{sectionLabel}</b>
                <Link href="/milla" className={MILLA_CHIP}>
                  <span className={MILLA_CHIP_DOT}>M</span> Milla
                </Link>
              </>)}
            </div>
            {/* ⚑ 24 Sep — THE REDESIGN'S WORKSPACE HEAD: what this side is, and that it moves with
                the conversation. On Home it is the Live workspace of the stage; elsewhere it names
                the section. */}
            <div className="mv-workspace-head hidden md:flex">
              <div><b>{workspaceTitle}</b>{workspaceSub ? <span>{workspaceSub}</span> : null}</div>
              {onHome ? <div className="mv-context">Milla updates this as you talk</div> : null}
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
          </main>
        </MillaConversationProvider>
      </div>
      </div>
    </div>
  )
}
