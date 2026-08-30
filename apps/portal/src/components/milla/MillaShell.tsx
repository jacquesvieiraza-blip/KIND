'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles, CalendarCheck, Target, FileBarChart, LogOut, TrendingUp, LineChart, Gem, Crosshair, Workflow, GraduationCap,
  LayoutGrid, Users, Star, User, CreditCard, Gauge, FileText, Gift, ChevronDown, MessageSquare,
} from 'lucide-react'
import { MILLA_STAGES, type MillaStage } from '@kind/shared'

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
  meetings_booked: number
  recent_replies: { name: string; classification: string }[]
}

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

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

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false) }
    document.addEventListener('mousedown', onDoc); return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore */ }
    window.location.href = '/login'
  }

  // #513 — onboarding is full-screen (no rail/top bar) until the client's ICP is live.
  if (pathname === '/milla/welcome') return <>{children}</>

  const isLeads = pathname === '/milla'
  const link = (href: string, label: string, Icon: React.ElementType, active: boolean, badge?: number) => (
    <Link key={label} href={href} className={`flex items-center gap-2.5 px-3 py-2 rounded-[10px] text-[14.5px] font-semibold mb-0.5 transition-colors ${
      active ? 'bg-[#f3ecff] text-[#7C3AED]' : 'text-[#5c5279] hover:bg-[#f7f4fd]'
    }`}>
      <Icon className="w-4 h-4 shrink-0" /> {label}
      {badge ? <span className="ml-auto text-[11px] font-bold text-white bg-[#7C3AED] rounded-full px-1.5">{badge}</span> : null}
    </Link>
  )
  const section = (label: string) => (
    <div className="mt-4 mb-1 px-3 text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">{label}</div>
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

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      {/* top bar */}
      <header className="h-[54px] shrink-0 flex items-center gap-3 px-5 border-b border-[#eee7f7] bg-white">
        {/* A1 — the brand is the way home. Clicking it from any rail page returns the client
            to their main screen (new leads + Milla). It used to be static text, so deeper
            pages had no obvious way back. */}
        <Link href="/milla" className="flex items-center gap-3 rounded-lg -mx-1 px-1 py-0.5 hover:opacity-80 transition-opacity" title="Back to your leads">
          <span className="w-8 h-8 rounded-[10px] bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[15px] font-extrabold">M</span>
          <span className="text-[16px] font-extrabold">Milla<span className="text-[#9b8ec4] font-semibold text-[13.5px]">&amp;Vida</span></span>
        </Link>
        <div className="ml-auto flex items-center gap-3.5">
          {/* ⛓️ THE WALLET BALANCE STOOD HERE. Removed, not replaced — see the note at the
              top of this file. */}
          {/* #406 — A BELL ICON USED TO SIT HERE. It had no onClick, no href, no badge and no
              menu: a notification bell that could not be clicked and never showed a count, in
              the top bar of every screen. There is no notification centre behind it — the
              client's real signals are the rail's "Recent replies" and the FLOW badges above,
              both of which are live. An icon that looks like a control and is not one is the
              same defect as a button that lies, so it is removed rather than left decorative. */}
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(o => !o)} className="flex items-center gap-2 h-8 rounded-full border border-[#ece5fb] bg-white pl-1.5 pr-3 text-[14px] font-extrabold hover:bg-[#f7f4fd]">
              <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white text-[11px] font-extrabold flex items-center justify-center">AC</span>
              Account <ChevronDown className={`w-3.5 h-3.5 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-10 z-50 w-56 rounded-xl border border-[#e9e2f8] bg-white shadow-xl py-2">
                <div className="px-3 pb-1.5 pt-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Your ROI</div>
                {ROI.map(([href, label, Icon]) => (
                  <a key={label} href={href} className="flex items-center gap-2.5 px-3 py-2 text-[14px] font-semibold text-[#0e7c86] hover:bg-[#f7f4fd]">
                    <Icon className="w-4 h-4" /> {label}
                  </a>
                ))}
                <div className="my-1.5 border-t border-[#f0eafa]" />
                <div className="px-3 pb-1.5 pt-0.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[#b3a9cc]">Account</div>
                {ACCOUNT.map(([href, label, Icon]) => (
                  <a key={label} href={href} className="flex items-center gap-2.5 px-3 py-2 text-[14px] font-semibold text-[#5c5279] hover:bg-[#f7f4fd]">
                    <Icon className="w-4 h-4 text-[#9b8ec4]" /> {label}
                  </a>
                ))}
                <div className="my-1.5 border-t border-[#f0eafa]" />
                <button onClick={signOut} className="w-full flex items-center gap-2.5 px-3 py-2 text-[14px] font-semibold text-red-500 hover:bg-red-50">
                  <LogOut className="w-4 h-4" /> Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* #501 flow ribbon — the client's journey.
          ── ⚑ 30 Aug (BUILD-004A-1 live-walk, FOUNDER DECISION 1) ────────────────────────
          🛑 THE RIBBON WAS A HARDCODED ARRAY OF THE RETIRED JOURNEY, and it sat two inches
          from the Stage card that already showed the approved lifecycle. It read:

            Sign up › Build plan › We reach out › Replies › You approve › Follow-up ›
            Meeting booked › Results

          Two things were wrong with it. `You approve` is the PER-LEAD approval the programme
          model removed — badged with `leads_awaiting`, the very count 4A-1 had already
          deleted from the rail. And the whole list was a SECOND, INDEPENDENT stage vocabulary
          living beside the approved one, with nothing keeping the two in step.

          THE BAR IS NOW DERIVED, NOT WRITTEN. `MILLA_STAGES` is the single approved
          seven-stage lifecycle (@kind/shared/programme-stage) — the same constant the
          Programme workspace builds its strip from — so there is exactly one place a stage
          name can be added, renamed or reordered, and both surfaces move together.

          ⚠️ NOT ONE LABEL IS TYPED HERE. Nothing is mapped, aliased or supplemented: what
          renders is what the constant holds, in its order. Adding a step that is not a stage
          is what produced the retired list in the first place.

          ⚠️ AND THE BADGES ARE GONE WITH THE STEPS THEY BELONGED TO. `leads_awaiting` badged
          `You approve`, which no longer exists; `meetings_booked` badged `Meeting booked`,
          which is not a stage in the approved lifecycle. Hanging either count on a stage the
          founder did not map it to would be inventing the mapping — so they are dropped
          rather than relocated. Both remain live in the rail, which is where they were
          already read.

          The design, placement, colours, numbering and chevrons are untouched: the current
          step is marked using the ribbon's own existing accent, which is the only thing the
          old bar could not do. */}
      <div className="shrink-0 flex items-center gap-1 overflow-x-auto px-5 py-2 bg-[#2a1747] text-white">
        <span className="text-[11px] font-extrabold tracking-[0.1em] text-[#b9a6e6] mr-2.5">FLOW</span>
        {MILLA_STAGES.map((label, i, arr) => {
          // ⚠️ -1 WHEN THE STAGE IS UNKNOWN, and that is a real state, not a default. A
          // failed or still-loading `/my/programme` marks NOTHING current — the ribbon shows
          // the journey without claiming where the client is in it.
          const at = stage ? arr.indexOf(stage) : -1
          const isCurrent = at >= 0 && i === at
          const isDone    = at >= 0 && i < at
          return (
            <span key={label} className="flex items-center shrink-0">
              <span className={`flex items-center gap-1.5 text-[13px] px-1 ${
                isCurrent ? 'font-extrabold text-white' : isDone ? 'font-semibold text-[#d9cef2]' : 'font-semibold text-[#9c8ac4]'}`}>
                <span className={`w-[18px] h-[18px] rounded-full text-white text-[11px] font-extrabold flex items-center justify-center ${
                  isCurrent ? 'bg-[#EC4899]' : 'bg-[#3d2a63]'}`}>{i + 1}</span>
                {label}
              </span>
              {i < arr.length - 1 && <span className="text-[#5b4785] px-0.5">›</span>}
            </span>
          )
        })}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* rail */}
        <aside className="w-[260px] shrink-0 border-r border-[#eee7f7] bg-[#fdfcff] flex flex-col px-3 py-4 overflow-y-auto">
          <nav>
            {/* ⚑ 30 Aug (BUILD-004A, founder ruling 1) — "New leads" IS now HOME.
                It was the per-lead approval desk, badged with `leads_awaiting`, and the
                programme model has no per-lead approval — so the badge is gone with it. The
                route is unchanged: /milla was always the landing page, and it is now the
                conversational programme home. */}
            {link('/milla', 'Home', Sparkles, isLeads)}
            {link('/milla/pipeline', 'Pipeline', Workflow, pathname.startsWith('/milla/pipeline'))}
            {link('/milla/meetings', 'Meetings', CalendarCheck, pathname.startsWith('/milla/meetings'), s?.meetings_booked || undefined)}
            {link('/milla/programme', 'Programme', Target, pathname.startsWith('/milla/programme'))}
            {/* #644 — THE RAIL HAD NO WAY TO REACH A REPLY. The client could see that a
                prospect had replied (the Recent replies list below) and could not open it:
                that list was plain text, and no rail entry led anywhere near the inbox. The
                reply is the outcome the client is paying for, so it gets a permanent home
                here, badged with the same live count the list is built from. */}
            {link('/milla/replies', 'Replies', MessageSquare, pathname.startsWith('/milla/replies'), s?.recent_replies?.length || undefined)}
            {/* #512 ICP approval + Documents were reachable only from a single link on the
                home page / the account menu — they are part of the client's actual workspace
                (approve the plan, keep their material current), so they belong in the rail. */}
            {link('/milla/icp', 'My ICP', Crosshair, pathname.startsWith('/milla/icp'))}
            {link('/milla/documents', 'Documents', FileText, pathname.startsWith('/milla/documents'))}
            {link('/milla/reports', 'Reports', FileBarChart, pathname.startsWith('/milla/reports'))}
            {/* M9 — we booked the meeting; this is how the client wins it. */}
            {link('/milla/coaching', 'Coaching', GraduationCap, pathname.startsWith('/milla/coaching'))}
          </nav>
          {/* ROI (Performance/Analytics/Your ROI/Command Centre/Teams Hub) moved to the
              top-right "Your ROI" dropdown — the rail stays the client's workspace only. */}
          {section('Recent replies')}
          <div className="px-1">
            {s && s.recent_replies.length === 0 && <div className="text-[12.5px] text-[#b3a9cc] px-2 py-1">No replies yet.</div>}
            {/* #644 — THESE WERE <div>s. Not styled-to-look-unclickable — actually inert: no
                Link, no href, no onClick, no route. A client saw "someone replied · interested"
                and had nowhere to press. Now every entry opens the reply screen. */}
            {(s?.recent_replies ?? []).map((r, i) => (
              <Link
                key={i}
                href="/milla/replies"
                className="flex items-start gap-2 px-2 py-1.5 text-[13px] rounded-lg hover:bg-[#f6f1ff] transition-colors"
              >
                <Star className="w-3.5 h-3.5 text-[#EC4899] shrink-0 mt-0.5" />
                <div className="min-w-0"><b className="font-bold">{r.name}</b> <span className="text-[#9b8ec4]">· {REPLY_TONE[r.classification] ?? r.classification}</span></div>
              </Link>
            ))}
          </div>
          <div className="mt-auto pt-4 text-[12px] text-[#b3a9cc] px-2 leading-relaxed">Tell Milla the outcome. We’ll do the work.</div>
        </aside>
        <main className="flex-1 overflow-hidden">{children}</main>
      </div>
    </div>
  )
}
