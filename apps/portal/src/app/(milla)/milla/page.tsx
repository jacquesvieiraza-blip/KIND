'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

// #497/#503/#506/#495 — MILLA HOME (docs/mv-previews/milla2.html): KPI cards row + Milla
// chat (centre, real-data opener) + masked lead cards (right) + Your ICP (versioned).
// Every number is live: summary → KPIs/opener/ICP, /for-approval → cards. Approve charges
// a flat $4 per approved lead from the one wallet. The wallet ledger (every charge,
// audited) moved to Billing (M4) — New leads stays leads + Milla only.

type MaskedLead = { id: string; role: string; company: string; industry: string | null; country: string | null; score: number | null; why_fits: string | null }
type Revealed = { email: string; charged: boolean }
type IcpVersion = { version: string; current: boolean; name: string; summary: string; created_at: string | null }
type Summary = {
  wallet_balance_usd: number; has_funded: boolean; leads_awaiting: number; meetings_booked: number
  active_campaign: string | null; icp_versions: IcpVersion[]
}
type Msg = { id: string; role: 'user' | 'assistant'; content: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}
function fmt(iso: string | null): string {
  if (!iso) return '—'; const d = new Date(iso); return isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const CHIPS = ['Which look strongest?', 'Find more like these', 'Pause campaign', 'Show my ROI']

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
      const [s, l] = await Promise.all([
        api.get<{ data: Summary }>('/leads/milla-summary', tok),
        api.get<{ data: MaskedLead[] }>('/leads/for-approval', tok),
      ])
      setSummary(s.data); setLeads(l.data)
      const n = s.data.leads_awaiting
      const camp = s.data.active_campaign ? ` for your **${s.data.active_campaign}** campaign` : ''
      setMessages([{ id: 'greet', role: 'assistant', content: n > 0
        ? `Hi 👋 I'm Milla, your campaign partner. FIGSY qualified **${n} new lead${n === 1 ? '' : 's'}**${camp} — they're in the panel on the right. Approve the ones worth pursuing; **nothing is charged until you approve — then a flat $4 per lead, final**. Want me to talk you through them?`
        : `Hi 👋 I'm Milla, your campaign partner. No new leads waiting this moment${camp ? ` — the ${s.data.active_campaign} engine is still sourcing` : ''}. Ask me anything, or tell me who to target next.` }])
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load your dashboard') }
  }, [])

  useEffect(() => { load() }, [load])
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

  async function approve(id: string) {
    setActing(id); setTopUp(null); setError(null)
    try {
      const tok = await token()
      const res = await api.post<{ email: string; charged: boolean }>(`/leads/${id}/approve`, {}, tok)
      setRevealed(r => ({ ...r, [id]: { email: res.email, charged: res.charged } }))
    } catch (e) {
      const err = e as Error & { status?: number }
      if (err.status === 402) setTopUp('You need $4 in your wallet to approve. Top up to continue.')
      // The api helper surfaces the server's `error` CODE as the message — translate the
      // known codes into plain English rather than showing a client "no_campaign".
      else if (err.message === 'no_campaign') setError("Your campaign isn't switched on yet, so we can't start outreach — you have not been charged. We've been alerted and will get it live.")
      else if (err.message === 'already_in_crm') setError('This contact is already in your CRM — no charge.')
      else if (err.message === 'no_email_found') setError('We could not verify an email for this lead — you were not charged.')
      else setError(err.message || 'Could not approve — please try again')
    } finally { setActing(null) }
  }
  async function pass(id: string) {
    setActing(id); setError(null)
    try { await api.post(`/leads/${id}/pass`, {}, await token()); setLeads(ls => (ls ?? []).filter(l => l.id !== id)) }
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

  const pending = (leads ?? []).filter(l => !revealed[l.id])
  const rich = (t: string) => t.split(/(\*\*[^*]+\*\*)/g).map((p, i) => p.startsWith('**') && p.endsWith('**')
    ? <b key={i} className="text-[#7C3AED]">{p.slice(2, -2)}</b> : <span key={i}>{p}</span>)

  const KPI = ({ k, v, s, tone, hero }: { k: string; v: string; s: string; tone?: string; hero?: boolean }) => (
    <div className={`rounded-2xl px-4 py-3.5 border ${hero ? 'text-white border-transparent bg-gradient-to-br from-[#7C3AED] to-[#6d28d9]' : 'bg-white border-[#eee7f7]'}`}>
      <div className={`text-[9.5px] font-extrabold uppercase tracking-wide ${hero ? 'text-[#e9d5ff]' : 'text-[#b3a9cc]'}`}>{k}</div>
      <div className="text-[22px] font-extrabold mt-0.5 leading-tight" style={!hero && tone ? { color: tone } : undefined}>{v}</div>
      <div className={`text-[10.5px] mt-0.5 ${hero ? 'text-[#e9d5ff]' : 'text-[#9b8ec4]'}`}>{s}</div>
    </div>
  )

  return (
    <div className="h-full overflow-y-auto px-5 py-4">
      {/* $99 GO-LIVE banner — shown until the client funds their wallet. Browsing is free;
          this is the step that switches their campaign on. */}
      {needsGoLive && (
        <a href="/milla/billing?start=1" className="block mb-4 rounded-2xl border border-[#7C3AED]/25 bg-gradient-to-r from-[#f3ecff] to-[#fdecf5] px-5 py-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="font-extrabold text-[#5b21b6] text-[15px]">Go live — load your wallet to start your campaign</p>
              <p className="text-[13px] text-[#6b6088] mt-0.5">Your first purchase is <b>$99</b>. Browsing and building your plan is free — nothing sources or sends until you go live. Each approved lead is then a flat $4.</p>
            </div>
            <span className="shrink-0 text-[13px] font-bold text-white rounded-xl px-4 py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899]">Go live — $99 →</span>
          </div>
        </a>
      )}
      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPI hero k="Wallet balance" v={summary ? `$${summary.wallet_balance_usd.toLocaleString()}` : '…'} s="$4 per approved lead" />
        <KPI k="Leads awaiting you" v={summary ? String(summary.leads_awaiting) : '…'} s={summary && summary.leads_awaiting ? '1 tap to approve' : 'all caught up'} tone="#EC4899" />
        <KPI k="Meetings booked" v={summary ? String(summary.meetings_booked) : '…'} s="this month" tone="#059669" />
        <KPI k="Active campaign" v={summary?.active_campaign ?? '—'} s={summary?.icp_versions?.find(v => v.current)?.version ? `ICP ${summary.icp_versions.find(v => v.current)!.version}` : 'no campaign yet'} />
      </div>

      {/* chat + leads */}
      <div className="flex gap-4 mt-4">
        {/* chat */}
        <section className="flex-1 min-w-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col min-h-[440px]">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#eee7f7]">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white font-extrabold text-[12px] flex items-center justify-center">M</span>
            <div><b className="text-[14px]">Milla</b> <span className="text-[#9b8ec4] text-[11.5px]">· conversational &amp; strategic</span></div>
            <span className="ml-auto text-[11.5px] font-semibold text-[#059669] inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Campaign live</span>
          </div>
          <div ref={chatBodyRef} className="flex-1 overflow-y-auto px-4 py-4">
            <div className="max-w-2xl space-y-3">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[86%] rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed whitespace-pre-wrap ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-[#f3ecff] text-[#1f1235]'}`}>{m.role === 'assistant' ? rich(m.content) : m.content}</div>
                </div>
              ))}
              {sending && <div className="flex justify-start"><div className="bg-[#f3ecff] rounded-2xl px-4 py-2.5 text-[#9b8ec4] text-[13px]">Milla is thinking…</div></div>}
            </div>
          </div>
          <div className="px-4 py-3 border-t border-[#eee7f7]">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CHIPS.map(c => <button key={c} onClick={() => send(c)} disabled={sending} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] border border-[#e4d4fb] rounded-full px-3 py-1 hover:bg-[#ebe0fc] disabled:opacity-50">{c}</button>)}
            </div>
            <form onSubmit={e => { e.preventDefault(); send(input) }} className="flex gap-2">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask Milla, request leads, or give feedback…" className="flex-1 text-[13px] rounded-xl border border-[#e4dcf7] px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
              <button type="submit" disabled={sending || !input.trim()} className="text-[13px] font-bold text-white rounded-xl px-5 bg-[#7C3AED] disabled:opacity-50">Send</button>
            </form>
          </div>
        </section>

        {/* lead cards */}
        <aside className="w-[380px] shrink-0 bg-white border border-[#eee7f7] rounded-2xl flex flex-col">
          <div className="px-4 py-3 border-b border-[#eee7f7]"><b className="text-[14px]">New leads</b> <span className="text-[#9b8ec4] text-[11.5px]">· masked · no charge yet</span></div>
          <div className="px-3.5 py-3 overflow-y-auto space-y-2.5">
            {topUp && <div className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{topUp}</div>}
            {error && <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            {!leads && !error && <p className="text-[13px] text-[#9b8ec4]">Loading…</p>}
            {leads?.filter(l => revealed[l.id]).map(l => (
              <div key={l.id} className="bg-white border-[1.5px] border-emerald-200 rounded-2xl p-3.5">
                <div className="flex items-center gap-2"><span className="text-emerald-600">✓</span><b className="text-[13px]">Approved · {l.role} @ {l.company}</b></div>
                <div className="text-[12px] text-[#4c4368] mt-1">Contact: <b>{revealed[l.id].email}</b></div>
                <div className="text-[11px] text-[#7c6f9b] mt-0.5">$4 charged — working it now</div>
              </div>
            ))}
            {leads && pending.length === 0 && Object.keys(revealed).length === 0 && (
              <div className="text-[13px] text-[#9b8ec4] bg-[#faf8ff] border border-[#ece5fb] rounded-2xl px-4 py-10 text-center">No leads waiting right now. We&apos;ll notify you the moment FIGSY qualifies the next. 🎯</div>
            )}
            {pending.map(l => {
              const busy = acting === l.id
              return (
                <div key={l.id} className="border border-[#ece5fb] rounded-2xl p-3.5">
                  <div className="flex items-start gap-2.5">
                    <span className="w-9 h-9 rounded-lg bg-[#efeafc] text-[#7C3AED] flex items-center justify-center shrink-0">🎭</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0"><b className="text-[13px] block leading-tight">{l.role}</b><span className="text-[11.5px] text-[#9b8ec4]">@ {l.company}</span></div>
                        {l.score != null && <span className="ml-auto text-right"><span className="text-[15px] font-extrabold text-[#7C3AED] tabular-nums">{l.score}</span><span className="block text-[9px] uppercase tracking-wide text-[#b3a9cc] font-extrabold">score</span></span>}
                      </div>
                      {l.why_fits && <div className="text-[12px] text-[#5c5279] mt-2 leading-relaxed bg-[#faf8ff] rounded-lg px-2.5 py-2"><b className="text-[#7c6f9b]">Why this fits:</b> {l.why_fits}</div>}
                      <div className="flex gap-1.5 mt-2.5">
                        <button disabled={busy} onClick={() => approve(l.id)} className="flex-1 text-[12px] font-bold text-white rounded-lg py-2 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{busy ? '…' : '✓ Approve qualified lead · $4'}</button>
                        <button disabled={busy} onClick={() => pass(l.id)} className="text-[12px] font-semibold text-[#5c5279] rounded-lg py-2 px-3 border border-[#ece5fb] disabled:opacity-50">Not a fit</button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div className="text-[10.5px] text-[#b3a9cc] px-1 pt-1">$4 per approved lead — final. Reviewing is free.</div>
          </div>
        </aside>
      </div>

      {/* ICP — the ledger moved to Billing (M4): New leads stays leads + Milla only. */}
      <div className="mt-4 bg-white border border-[#eee7f7] rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[#eee7f7] flex items-center text-[13.5px] font-bold">Your ICP <span className="text-[#9b8ec4] font-semibold text-[11px] ml-1.5">· versioned · approved by you</span><a href="/milla/icp" className="ml-auto text-[11.5px] font-bold text-[#7C3AED] hover:underline">Review / approve →</a></div>
        <div className="px-4 py-3.5">
          {!summary?.icp_versions?.length ? (
            <div className="text-[13px] text-[#9b8ec4] py-6 text-center">Your ICP is set during onboarding — it'll show here once approved.</div>
          ) : <>
            <p className="text-[12.5px] text-[#5c5279] leading-relaxed mb-3">{summary.icp_versions.find(v => v.current)?.summary || summary.icp_versions.find(v => v.current)?.name}</p>
            <div className="flex flex-wrap gap-2.5">
              {summary.icp_versions.map(v => (
                <div key={v.version} className={`flex-1 min-w-[150px] border rounded-xl px-3 py-2.5 ${v.current ? 'border-emerald-300 bg-emerald-50/40' : 'border-[#ece5fb]'}`}>
                  <b className="text-[13px]">{v.version}</b>{v.current && <span className="text-[9.5px] font-extrabold text-emerald-600"> · current</span>}
                  <span className="block text-[11px] text-[#9b8ec4] mt-0.5">{fmt(v.created_at)} · approved</span>
                </div>
              ))}
            </div>
          </>}
        </div>
      </div>

      {/* #511f — what Milla's learning for this client (the flywheel) */}
      {nexus && nexus.sample_worked > 0 && (
        <div className="mt-4 bg-gradient-to-br from-[#faf7ff] to-white border border-[#ece5fb] rounded-2xl px-5 py-4">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[15px]">🧠</span>
            <b className="text-[13.5px]">What Milla&apos;s learning for you</b>
            <span className="text-[9.5px] font-extrabold uppercase tracking-wide text-[#9b8ec4] bg-white border border-[#ece5fb] rounded-full px-2 py-0.5 ml-auto">{nexus.confidence}</span>
          </div>
          <p className="text-[13px] text-[#5c5279] leading-relaxed">{nexus.learned}</p>
          <div className="flex flex-wrap gap-2.5 mt-2.5">
            {nexus.top_persona && <span className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">Books best: {nexus.top_persona}</span>}
            <span className="text-[11.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-2.5 py-1">Reply rate {Math.round(nexus.reply_rate * 1000) / 10}%</span>
            <span className="text-[11.5px] font-semibold text-[#5c5279] bg-white border border-[#ece5fb] rounded-full px-2.5 py-1">Meeting rate {Math.round(nexus.meeting_rate * 1000) / 10}%</span>
          </div>
        </div>
      )}
    </div>
  )
}
