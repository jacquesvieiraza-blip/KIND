'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import ProductTour from '@/components/ProductTour'
import { shortfallMessage, deskCoverage, PACK_PRICE_USD, PACK_LEADS } from '@kind/shared'

// #497/#503/#506/#495 — MILLA HOME (docs/mv-previews/milla2.html): KPI cards row + Milla
// chat as the SPINE (centre, full height, real-data opener) + masked lead cards (right).
// Every number is live: summary → KPIs/opener, /for-approval → cards. Approve charges a
// flat $4 per approved lead from the one wallet. The wallet ledger moved to Billing (M4)
// and the ICP card to its own rail page (/milla/icp) — this screen is leads + Milla only.

type MaskedLead = { id: string; role: string; company: string; industry: string | null; country: string | null; score: number | null; why_fits: string | null; recommended?: boolean }
type Revealed = { email: string; charged: boolean }
type IcpVersion = { version: string; current: boolean; name: string; summary: string; created_at: string | null }
type Pack = { active: boolean; included: number; used: number; left: number; nextLeadCostUsd: number }
type Summary = {
  wallet_balance_usd: number; has_funded: boolean; leads_awaiting: number; meetings_booked: number
  active_campaign: string | null; icp_versions: IcpVersion[]
  /** The newest campaign's real state, whatever it is — drives the live/paused badge. */
  campaign_name?: string | null
  campaign_status?: 'draft' | 'active' | 'paused' | 'paused_low_performance' | 'completed' | 'archived' | null
  /** Every lead they have ever approved — releases the minimum-20 gate at 20. */
  leads_approved_total?: number
  pack?: Pack
}
type Msg = { id: string; role: 'user' | 'assistant'; content: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
// Milla answers; she does not act. "Pause campaign" and "Find more like these" used to read
// as buttons that did those things — they don't, and the message went into a table nobody
// read. It now pages the operator and appears in Vida → Asks, so these are honest REQUESTS
// rather than controls: phrased as asking us, because that is what actually happens.
const CHIPS = [
  'Which of these look strongest?',
  'Please find more like these',
  'Please pause my campaign',
  'How is my ROI looking?',
]

export default function MillaHomePage() {
  const router = useRouter()
  const [summary, setSummary] = useState<Summary | null>(null)
  // #511f — the client's own Nexus, surfaced (the flywheel: they see Milla getting sharper).
  const [nexus, setNexus] = useState<{ learned: string; top_persona: string | null; reply_rate: number; meeting_rate: number; confidence: string; sample_worked: number } | null>(null)
  const [leads, setLeads] = useState<MaskedLead[] | null>(null)
  const [acting, setActing] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Record<string, Revealed>>({})
  const [topUp, setTopUp] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const chatBodyRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const tok = await token()
      // #570 — allSettled, not all. With `Promise.all`, ONE failing endpoint rejected the
      // pair and the client's entire dashboard went blank — including the half that had
      // loaded fine. The billing page already used allSettled; the desk did not.
      const [sr, lr] = await Promise.allSettled([
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: MaskedLead[] }>('/leads/for-approval', tok),
      ])
      if (sr.status === 'rejected' && lr.status === 'rejected') {
        throw sr.reason instanceof Error ? sr.reason : new Error('Failed to load your dashboard')
      }
      if (sr.status === 'rejected') setError('Some of your figures could not be loaded just now — the leads below are still correct.')
      if (lr.status === 'rejected') setError('Your leads could not be loaded just now — this is not the same as having none. Refresh in a moment.')
      const s = sr.status === 'fulfilled' ? sr.value : null
      const l = lr.status === 'fulfilled' ? lr.value : null
      if (!s) { setLeads(l?.data ?? []); return }
      if (l) setLeads(l.data)
      setSummary(s.data)
      const n = s.data.leads_awaiting
      const camp = s.data.active_campaign ? ` for your **${s.data.active_campaign}** campaign` : ''
      // The greeting quoted "a flat $4 per lead, final" to every client, including one
      // holding 100 free approvals. It was written before the pack existed.
      const left = s.data.pack?.active ? (s.data.pack.left ?? 0) : 0
      const priceLine = left > 0
        ? `**${left} of your ${s.data.pack!.included} included leads** are still yours — approving costs nothing until they run out`
        : '**nothing is charged until you approve — then a flat $4 per lead, final**'
      // Functional update, and the greeting is keyed 'greet': the thread-history effect
      // below races this one, and whichever lands second must not wipe the other.
      setMessages(m => [{ id: 'greet', role: 'assistant', content: n > 0
        ? `Hi 👋 I'm Milla, your campaign partner. FIGSY qualified **${n} new lead${n === 1 ? '' : 's'}**${camp} — they're in the panel on the right. Approve the ones worth pursuing; ${priceLine}. Want me to talk you through them?`
        : `Hi 👋 I'm Milla, your campaign partner. No new leads waiting this moment${camp ? ` — the ${s.data.active_campaign} engine is still sourcing` : ''}. Ask me anything, or tell me who to target next.` },
        ...m.filter(x => x.id !== 'greet')])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your dashboard') }
  }, [])

  useEffect(() => { load() }, [load])

  // M2 — the thread persists, so anything WE asked them (Vida's "Ask them for these" writes
  // straight into this thread) is waiting here when they next open Milla, and their answer
  // lands in the same thread where we read it. Without this the chat started blank every
  // visit and an ask could never be seen, let alone answered.
  useEffect(() => {
    (async () => {
      try {
        const tok = await token()
        const list = await api.get<{ data: { id: string }[] }>('/milla/sessions', tok)
        const sid = list.data?.[0]?.id
        if (!sid) return
        setSessionId(sid)
        const hist = await api.get<{ data: { id: string; role: 'user' | 'assistant'; content: string }[] }>(
          `/milla/sessions/${sid}/messages`, tok)
        const rows = (hist.data ?? []).slice(-20)
        if (rows.length > 0) {
          setMessages(m => [...m, ...rows.map(r => ({ id: r.id, role: r.role, content: r.content }))])
        }
      } catch { /* no thread yet — the greeting stands on its own */ }
    })()
  }, [])
  // #511f — best-effort Nexus summary (never blocks the dashboard).
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<{ data: typeof nexus }>('/leads/nexus-summary', await token())
        setNexus(r.data)
      } catch { /* silent — the card just doesn't render */ }
    })()
  }, [])
  // #513 wiring — a client with no ICP yet hasn't onboarded: send them to Milla's
  // conversational setup. Once they approve an ICP (v1 exists) they stay on the dashboard.
  useEffect(() => {
    if (summary && summary.icp_versions.length === 0) router.replace('/milla/welcome')
  }, [summary, router])
  // $99 AT GO-LIVE (founder-locked) — a client who hasn't paid can still onboard, build
  // their plan and browse their masked leads FREE. They're NOT walled out. The $99 is the
  // GO-LIVE step: nothing sources or sends until it's paid (money rails enforce $0 = no
  // work), and a "Go live — load $99" banner sits on the dashboard until they do.
  const needsGoLive = !!summary && summary.icp_versions.length > 0 && !summary.has_funded
  // Scroll the CHAT container only — never the page (that would hide the KPI row).
  useEffect(() => { const el = chatBodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages])

  // THE MINIMUM-20 GATE (founder-locked 25 Jul). We can't run a real campaign off five
  // people, and a client's sender costs us ~$40/month from the day they sign — so the first
  // time round they choose at least 20. The server refuses below the minimum regardless of
  // what this UI does; these are the words that make the refusal make sense.
  async function approveSelected() {
    const ids = [...picked]
    if (ids.length === 0) return
    setActing('batch'); setTopUp(null); setError(null)
    try {
      const tok = await token()
      const res = await api.post<{ approved: number; attempted: number; message: string;
        results: Array<{ id: string; status: string; email?: string | null; charged?: boolean }> }>(
        '/leads/approve-batch', { lead_ids: ids }, tok)
      setRevealed(r => {
        const next = { ...r }
        for (const x of res.results) if (x.status === 'approved') next[x.id] = { email: x.email ?? '', charged: !!x.charged }
        return next
      })
      // Only the ones that actually went through leave the selection. Clearing everything
      // made a client re-find the leads they still needed to retry.
      const done = new Set(res.results.filter(x => x.status === 'approved').map(x => x.id))
      setPicked(p => new Set([...p].filter(id => !done.has(id))))
      if (res.approved < res.attempted) setError(res.message)
      // The pack counter is the number they watch most, and it was stale until a manual
      // refresh — approve 20 and the hero still read "100 included".
      void load()
    } catch (e) {
      const err = e as Error & { status?: number }
      // #570 — the figure is no longer invented in the browser. `ids.length * 4` ignored the
      // wallet balance AND the leads still inside the included pack, so it named a total we
      // could not stand behind on a payment screen. Use the server's numbers when it sends
      // them; otherwise state the rule rather than a made-up total.
      if (err.status === 402) setTopUp(shortfallMessage({
        count: ids.length,
        neededUsd: (err as { needed_usd?: number }).needed_usd,
        balanceUsd: (err as { balance_usd?: number }).balance_usd,
      }))
      else if (err.message === 'batch_minimum') setError(`Choose ${gate.required} to start — we need enough people to run a real campaign.`)
      else setError(err.message || 'Could not approve — please try again')
    } finally { setActing(null) }
  }

  async function approve(id: string) {
    setActing(id); setTopUp(null); setError(null)
    try {
      const tok = await token()
      const res = await api.post<{ email: string; charged: boolean }>(`/leads/${id}/approve`, {}, tok)
      setRevealed(r => ({ ...r, [id]: { email: res.email, charged: res.charged } }))
      void load()   // keep the pack counter honest — see approveSelected

    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 402) setTopUp(shortfallMessage({
        count: 1,
        neededUsd: (err as { needed_usd?: number }).needed_usd,
        balanceUsd: (err as { balance_usd?: number }).balance_usd,
      }))
      // The api helper surfaces the server's `error` CODE as the message — translate the
      // known codes into plain English rather than showing a client "no_campaign".
      else if (err.message === 'no_campaign') setError("Your campaign isn't switched on yet, so we can't start outreach — you have not been charged. We've been alerted and will get it live.")
      else if (err.message === 'already_in_crm') setError('This contact is already in your CRM — no charge.')
      else if (err.message === 'no_email_found') setError('We could not verify an email for this lead — you were not charged.')
      else setError(err.message || 'Could not approve — please try again')
    } finally { setActing(null) }
  }
  // ── CALIBRATION v1 (P32) — the reason chip ────────────────────────────────────────────
  // Founder doctrine (Jack&Jill K.2): "Approve/Pass IS the calibration event — capture the
  // REASON and the product gets smarter every time a client clicks."
  //
  // ⚠️ FIRE-AND-FORGET, DELIBERATELY. The pass has already succeeded. If this call fails, is
  // slow, or is never made, the client's action stands and their screen is unaffected — which
  // is the whole difference between a calibration prompt and a gate.
  const [justPassed, setJustPassed] = useState<{ id: string; at: number } | null>(null)
  const REASON_CHIPS: { code: string; label: string }[] = [
    { code: 'too_big',         label: 'Too big' },
    { code: 'too_small',       label: 'Too small' },
    { code: 'wrong_industry',  label: 'Wrong industry' },
    { code: 'wrong_role',      label: 'Wrong role' },
    { code: 'wrong_geography', label: 'Wrong geography' },
    { code: 'bad_timing',      label: 'Bad timing' },
    { code: 'other',           label: 'Other' },
  ]
  async function sendReason(leadId: string, code: string) {
    setJustPassed(null)                       // acknowledge the tap at once — no spinner on a nicety
    try { await api.post(`/leads/${leadId}/feedback`, { action: 'pass', reason_code: code }, await token()) }
    catch { /* never surfaced: the pass stands, and a lost chip is not the client's problem */ }
  }

  // #570 — pass() now reloads. It removed the row locally and never refreshed, so the KPI
  // still read "3 leads awaiting" after the client had passed all three — and with a desk
  // capped at 50, passing one never pulled the next one in. The screen disagreed with itself.
  async function pass(id: string) {
    setActing(id); setError(null)
    try {
      await api.post(`/leads/${id}/pass`, {}, await token())
      setLeads(ls => (ls ?? []).filter(l => l.id !== id))   // instant, so the row goes at once
      // ── CALIBRATION v1 (P32) — ask WHY, after the fact, never before ──────────────────
      // The pass is DONE by this line. The chip row is a second, optional call; the founder's
      // rule is "one tap, never mandatory, never blocks the action". Nothing below can undo,
      // delay or fail the pass the client just made.
      setJustPassed({ id, at: Date.now() })
      void load()                                          // then the real counts, from the server
    }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not pass — please try again') }
    finally { setActing(null) }
  }
  async function send(text: string) {
    const msg = text.trim(); if (!msg || sending) return
    setInput(''); setSending(true); setMessages(m => [...m, { id: `u-${Date.now()}`, role: 'user', content: msg }])
    try {
      const tok = await token(); let sid = sessionId
      if (!sid) {
        const list = await api.get<{ data: { id: string }[] }>('/milla/sessions', tok).catch(() => null)
        sid = list?.data?.[0]?.id ?? null
        if (!sid) { const c = await api.post<{ sessionId: string }>('/milla/sessions', {}, tok); sid = c.sessionId }
        setSessionId(sid)
      }
      const res = await api.post<{ reply: string }>(`/milla/sessions/${sid}/chat`, { message: msg }, tok)
      setMessages(m => [...m, { id: `a-${Date.now()}`, role: 'assistant', content: res.reply }])
    } catch { setMessages(m => [...m, { id: `e-${Date.now()}`, role: 'assistant', content: 'I hit a snag reaching the engine — please try again in a moment.' }]) }
    finally { setSending(false) }
  }

  // While the pack has leads left an approval costs nothing — a card that still says

  // "$4" is the difference between a client working through 100 leads and stopping.

  const freeApproval = !!summary?.pack?.active && (summary.pack.left ?? 0) > 0
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const togglePick = (id: string) => setPicked(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })


  const pending = (leads ?? []).filter(l => !revealed[l.id])
  // Mirrors lib/approval-batch.ts on the server. `approvedEver` comes from the summary, so a
  // client already past 20 gets one-tap approve back — the gate starts the relationship, it
  // doesn't nag someone already working with us.
  const approvedEver = summary?.leads_approved_total ?? 0
  const gate = (() => {
    const MIN = 20
    if (approvedEver >= MIN) return { required: 1, batch: false }
    return { required: Math.min(MIN - approvedEver, pending.length), batch: pending.length > 0 }
  })()
  // What is actually happening with their sending, in the client's words. Ordered by what
  // matters most to them: unpaid beats paused, because paying is what unblocks it.
  const sendState = (() => {
    if (needsGoLive) return { label: `Not started — waiting on your $${PACK_PRICE_USD}`, tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    const st = summary?.campaign_status
    if (st === 'active') return { label: 'Campaign live', tone: 'text-[#059669]', dot: 'bg-emerald-500' }
    if (st === 'paused' || st === 'paused_low_performance') return { label: 'Paused — we\u2019ll tell you why', tone: 'text-[#b45309]', dot: 'bg-amber-500' }
    if (st === 'completed' || st === 'archived') return { label: 'Campaign finished', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    if (st === 'draft') return { label: 'Being set up', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
    return { label: 'Nothing sending yet', tone: 'text-[#5c5279]', dot: 'bg-[#b3a9cc]' }
  })()

  const rich = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-[#7C3AED]">{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)

  const KPI = ({ k, v, s, tone, hero, tour }: { k: string; v: string; s: string; tone?: string; hero?: boolean; tour?: string }) => (
    <div data-tour={tour} className={`rounded-2xl px-4 py-3.5 border ${hero ? 'text-white border-transparent bg-gradient-to-br from-[#7C3AED] to-[#6d28d9]' : 'bg-white border-[#eee7f7]'}`}>
      <div className={`text-[10.5px] font-extrabold uppercase tracking-wide ${hero ? 'text-[#e9d5ff]' : 'text-[#b3a9cc]'}`}>{k}</div>
      <div className="text-[22px] font-extrabold mt-0.5 leading-tight" style={!hero && tone ? { color: tone } : undefined}>{v}</div>
      <div className={`text-[11.5px] mt-0.5 ${hero ? 'text-[#e9d5ff]' : 'text-[#9b8ec4]'}`}>{s}</div>
    </div>
  )

  return (
    <div className="h-full flex flex-col overflow-hidden px-5 py-4">
      {/* THE WALKTHROUGH (flow v2 step 1) — once, on their first visit, then never again.
          Steps whose element isn't on screen skip themselves, so a fresh account with an
          empty lead desk still gets a coherent tour. */}
      <ProductTour steps={[
        { target: 'kpi-pack',  title: 'What you have', body: `Your $${PACK_PRICE_USD} includes ${PACK_LEADS} approved leads. This counts down as you approve — nothing else is charged until it runs out.` },
        { target: 'leads',     title: 'This is your job', body: "Everyone we find lands here, scored and masked. Pick the ones worth talking to — we start work the moment you do. The first time round, choose 20 so there are enough people to run a real campaign." },
        { target: 'chat',      title: 'Milla, any time', body: "Ask for more people, change who we're targeting, or tell me a lead was wrong. I'm how you steer it — there are no forms." },
        { target: 'kpi-meetings', title: 'What it comes back as', body: 'Booked meetings. We answer the replies, qualify them and put the meeting in your calendar — you just turn up.' },
      ]} />
      {/* $99 GO-LIVE banner — shown until the client funds their wallet. Browsing is free;
          this is the step that switches their campaign on. */}
      {needsGoLive && (
        <a href="/milla/billing?start=1" className="block mb-4 rounded-2xl border border-[#7C3AED]/25 bg-gradient-to-r from-[#f3ecff] to-[#fdecf5] px-5 py-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-extrabold text-[#5b21b6] text-[16px]">Go live — your first {PACK_LEADS} leads are ${PACK_PRICE_USD}</p>
              <p className="text-[14px] text-[#6b6088] mt-0.5">Your first purchase is <b>${PACK_PRICE_USD}</b> and it includes <b>{PACK_LEADS} approved leads</b>. Browsing and building your plan is free — nothing sources or sends until you go live. After the first 100 it&rsquo;s a flat $4 a lead.</p>
            </div>
            <span className="shrink-0 text-[14px] font-bold text-white rounded-xl px-4 py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899]">Go live — ${PACK_PRICE_USD} · {PACK_LEADS} leads →</span>
          </div>
        </a>
      )}
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* While the $99 pack has leads left, THAT is the number that matters to the client —
            a wallet reading $0 next to "100 included" reads as broken. Falls back to the
            wallet once the pack is used. */}
        {summary?.pack?.active && summary.pack.left > 0
          ? <KPI hero tour="kpi-pack" k="Leads included" v={`${summary.pack.left}`} s={`of your ${summary.pack.included} · then $4 each`} />
          : <KPI hero tour="kpi-pack" k="Wallet balance" v={summary ? `$${summary.wallet_balance_usd.toLocaleString()}` : '…'} s="$4 per approved lead" />}
        <KPI k="Leads awaiting you" v={summary ? String(summary.leads_awaiting) : '…'} s={summary && summary.leads_awaiting ? '1 tap to approve' : 'all caught up'} tone="#EC4899" />
        <KPI tour="kpi-meetings" k="Meetings booked" v={summary ? String(summary.meetings_booked) : '…'} s="this month" tone="#059669" />
        {/* DORMANT (flow v2 step 2). An approved ICP with no $99 behind it is live on paper
            and doing nothing in practice — nothing sources, nothing sends. Saying "—" here
            let a client sit for days assuming we were working. */}
        {needsGoLive && (summary?.icp_versions?.length ?? 0) > 0
          ? <KPI k="Your targeting" v="Dormant" s={`approved — waiting on your $${PACK_PRICE_USD}`} tone="#b45309" />
          : <KPI k="Active campaign" v={summary?.active_campaign ?? '—'} s={summary?.icp_versions?.find(v => v.current)?.version ? `ICP ${summary.icp_versions.find(v => v.current)!.version}` : 'no campaign yet'} />}
      </div>

      {/* Milla is the SPINE: she fills the console, leads canvas beside her. */}
      <div className="flex-1 flex gap-4 mt-4 min-h-0">
        {/* chat — FIXED width. A conversation column past ~600px is 170+ characters a line,
            which reads badly however full it is. */}
        <section data-tour="chat" className="w-[600px] shrink-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col min-h-0">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#eee7f7]">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-[13px] flex items-center justify-center">M</span>
            <div><b className="text-[15px]">Milla</b> <span className="text-[#9b8ec4] text-[12.5px]">· conversational &amp; strategic</span></div>
            {/* Was hardcoded "● Campaign live" with no condition on it, sitting inches from
                the KPI that correctly said "Dormant" — the product contradicting itself on
                one screen. Now it reads the real campaign state. */}
            <span className={`ml-auto text-[12.5px] font-semibold inline-flex items-center gap-1.5 ${sendState.tone}`}>
              <span className={`w-2 h-2 rounded-full ${sendState.dot}`} /> {sendState.label}
            </span>
          </div>
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-2xl space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-[#f3ecff] text-[#1f1235]'}`}>{m.role === 'assistant' ? rich(m.content) : m.content}</div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="bg-[#f3ecff] rounded-2xl px-4 py-2.5 text-[#9b8ec4] text-[14px]">Milla is thinking…</div></div>}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-[#eee7f7]">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CHIPS.map(c => <button key={c} onClick={() => send(c)} disabled={sending} className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{c}</button>)}
            </div>
            <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Milla, request leads, or give feedback…" className="flex-1 text-[14px] rounded-xl border border-[#e4dcf7] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              <button type="submit" disabled={sending || !input.trim()} className="text-[14px] font-bold text-white rounded-xl px-5 bg-[#7C3AED] disabled:opacity-50">Send</button>
            </form>
          </div>
        </section>

        {/* lead cards */}
        {/* LEADS — this is what the client is here to DO, so it gets the room. It FLEXES and
            the conversation is fixed; the other way round meant every extra pixel of a bigger
            monitor went to the chat while the work stayed pinned at 380px. Cards flow into
            columns once there's width for them. */}
        <aside data-tour="leads" className="flex-1 min-w-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col min-h-0">
          <div className="px-4 py-3 border-b border-[#eee7f7] flex items-center gap-2 flex-wrap">
            <b className="text-[15px]">New leads</b>
            <span className="text-[#9b8ec4] text-[12.5px]">· masked · no charge yet</span>
            {gate.batch && gate.required > 1 && (
              <span className="ml-auto text-[12.5px] font-bold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1">
                Pick {gate.required} to start
              </span>
            )}
          </div>
          <div className="px-3.5 py-3 overflow-y-auto grid gap-2.5 grid-cols-1 [@media(min-width:1100px)]:grid-cols-2 [@media(min-width:1600px)]:grid-cols-3 items-start content-start">
            {topUp && <div className="text-[13px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{topUp}</div>}
            {error && <div className="text-[13px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            {!leads && !error && <p className="text-[14px] text-[#9b8ec4]">Loading…</p>}
            {/* #570 — the KPI counts EVERY lead awaiting a decision; this list is capped at
                50. A client with 120 waiting read "120 leads awaiting you" above a list of
                50, with nothing explaining the other 70 — which reads as us having lost them. */}
            {(() => {
              const note = summary && leads ? deskCoverage({ awaiting: summary.leads_awaiting, shown: leads.length }) : null
              return note ? <div className="text-[12.5px] text-[#5c5279] bg-[#faf8ff] border border-[#ece5fb] rounded-xl px-3 py-2">{note}</div> : null
            })()}
            {/* ── CALIBRATION v1 (P32) — the reason chip row ─────────────────────────────
                Appears ONLY after a pass, above the list, and disappears on any tap. It is
                skippable by ignoring it: nothing here blocks the next action, and the pass it
                refers to has already completed. "One tap, never mandatory." */}
            {justPassed && (
              <div className="bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-3.5">
                <div className="text-[13px] text-[#4c4368] font-semibold">Passed. What was off about them?</div>
                <div className="text-[12px] text-[#9b8ec4] mt-0.5">Optional — it tunes what I find you next.</div>
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {REASON_CHIPS.map(c => (
                    <button key={c.code}
                      onClick={() => void sendReason(justPassed.id, c.code)}
                      className="text-[12.5px] font-bold text-[#7C3AED] bg-white border-[1.5px] border-[#e4d4fb] rounded-lg px-2.5 py-1.5">
                      {c.label}
                    </button>
                  ))}
                  <button onClick={() => setJustPassed(null)}
                    className="text-[12.5px] font-semibold text-[#9b8ec4] px-2.5 py-1.5">
                    Skip
                  </button>
                </div>
              </div>
            )}
            {leads?.filter(l => revealed[l.id]).map(l => (
              <div key={l.id} className="bg-white border-[1.5px] border-emerald-200 rounded-2xl p-3.5">
                <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span><b className="text-[14px]">Approved · {l.role} @ {l.company}</b></div>
                <div className="text-[13px] text-[#4c4368] mt-1">Contact: <b>{revealed[l.id].email}</b></div>
                <div className="text-[12px] text-[#7c6f9b] mt-0.5">{revealed[l.id].charged ? '$4 charged' : 'Included in your 100'} — working it now</div>
              </div>
            ))}
            {leads && pending.length === 0 && Object.keys(revealed).length === 0 && (
              <div className="text-[14px] text-[#9b8ec4] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">No leads waiting right now. We&apos;ll notify you the moment FIGSY qualifies the next. 🎯</div>
            )}
            {pending.map(l => {
              const busy = acting === l.id
              return (
                <div key={l.id} onClick={() => gate.batch && gate.required > 1 && togglePick(l.id)}
                  className={`rounded-2xl p-3.5 transition-shadow ${gate.batch && gate.required > 1 ? 'cursor-pointer' : ''} ${
                    picked.has(l.id) ? 'border-[1.5px] border-[#7C3AED] bg-[#f7f2ff] shadow-sm'
                    : l.recommended ? 'border-[1.5px] border-[#d9c4fb] bg-[#fcfaff]' : 'border border-[#ece5fb]'}`}>
                  {/* WE'D START HERE — the API ranks everyone we sourced and marks its top 20.
                      It was computing this and the client never saw it, which left them facing
                      200 identical cards with no steer. */}
                  {l.recommended && <div className="text-[11px] font-extrabold uppercase tracking-wide text-[#7C3AED] mb-2">★ We&apos;d start here</div>}
                  <div className="flex items-start gap-2.5">
                    <span className="w-9 h-9 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center shrink-0">🎭</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0"><b className="text-[14px] block leading-tight">{l.role}</b><span className="text-[12.5px] text-[#9b8ec4]">@ {l.company}</span></div>
                        {l.score != null && <span className="ml-auto text-right"><span className="text-[16px] font-extrabold text-[#7C3AED] tabular-nums">{l.score}</span><span className="block text-[10px] uppercase tracking-wide text-[#b3a9cc] font-extrabold">score</span></span>}
                      </div>
                      {l.why_fits && <div className="text-[13px] text-[#5c5279] mt-2 leading-relaxed bg-[#faf8ff] rounded-lg px-2.5 py-2"><b className="text-[#7c6f9b]">Why this fits:</b> {l.why_fits}</div>}
                      <div className="flex gap-1.5 mt-2.5">
                        {/* Under the gate the card is a CHOICE, not an action — you pick your
                            20 and start them together. Past it, one tap approves as before. */}
                        {gate.batch && gate.required > 1 ? (
                          <button onClick={e => { e.stopPropagation(); togglePick(l.id) }}
                            className={`flex-1 text-[13px] font-bold rounded-lg py-2 border-[1.5px] ${picked.has(l.id)
                              ? 'text-white bg-[#7C3AED] border-[#7C3AED]'
                              : 'text-[#7C3AED] bg-white border-[#e4d4fb]'}`}>
                            {picked.has(l.id) ? '✓ Picked' : 'Pick this one'}
                          </button>
                        ) : (
                          <button disabled={busy} onClick={e => { e.stopPropagation(); approve(l.id) }} className="flex-1 text-[13px] font-bold text-white rounded-lg py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{busy ? '…' : freeApproval ? '✓ Approve · included' : '✓ Approve qualified lead · $4'}</button>
                        )}
                        <button disabled={busy} onClick={e => { e.stopPropagation(); pass(l.id) }} className="text-[13px] font-semibold text-[#5c5279] rounded-lg py-2 px-3 border border-[#ece5fb] disabled:opacity-50">Not a fit</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            {/* Said "$4 per approved lead" even while the button above it said "included" —
                two prices on one screen. */}
            <div className="text-[11.5px] text-[#b3a9cc] px-1 pt-1">
              {freeApproval
                ? `Included in your ${summary?.pack?.included ?? 100} — nothing charged until the pack runs out. Reviewing is free.`
                : '$4 per approved lead — final. Reviewing is free.'}
            </div>
          </div>
          {/* THE START BAR — sticks to the bottom of the lead desk while the gate is on, so
              "how many more" is never something the client has to count for themselves. */}
          {gate.batch && gate.required > 1 && (
            <div className="shrink-0 border-t border-[#eee7f7] bg-[#faf8ff] px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="text-[13.5px] text-[#5c5279]">
                <b className="text-[#1f1235]">{picked.size} of {gate.required} picked</b>
                <span className="block text-[12px] text-[#9b8ec4]">
                  {picked.size >= gate.required
                    ? freeApproval ? 'All included in your 100 — nothing extra to pay.' : `That's $${picked.size * 4}.`
                    : 'We start with a full batch so the campaign has enough people to work.'}
                </span>
              </span>
              <button onClick={approveSelected} disabled={picked.size < gate.required || acting === 'batch'}
                className="ml-auto text-[14px] font-bold text-white rounded-xl px-5 py-2.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-40">
                {acting === 'batch' ? 'Starting…' : `Start work on ${picked.size || gate.required} →`}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* #511f — what Milla's learning for this client (the flywheel) */}
      {nexus && nexus.sample_worked > 0 && (
        <div className="mt-4 bg-gradient-to-br from-[#faf7ff] to-white border border-[#ece5fb] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[16px]">🧠</span>
            <b className="text-[14.5px]">What Milla&apos;s learning for you</b>
            <span className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#9b8ec4] bg-white border border-[#ece5fb] rounded-full px-2 py-0.5 ml-auto">{nexus.confidence}</span>
          </div>
          <p className="text-[14px] text-[#5c5279] leading-relaxed">{nexus.learned}</p>
          <div className="flex flex-wrap gap-2.5 mt-2.5">
            {nexus.top_persona && <span className="text-[12.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">Books best: {nexus.top_persona}</span>}
            <span className="text-[12.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-2.5 py-1">Reply rate {Math.round(nexus.reply_rate * 1000) / 10}%</span>
            <span className="text-[12.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-2.5 py-1">Meeting rate {Math.round(nexus.meeting_rate * 1000) / 10}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
