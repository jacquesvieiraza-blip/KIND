'use client'

/**
 * SALES CHANNEL (#274) — track our own sales, every AE, and every partner.
 * Spec: docs/admin-centre-spec.md. Three lenses (Overall / AEs / Partners) →
 * each with Analytics · Performance · ROI · Pipeline · Targets.
 * Partners are LIVE (/api/proxy/partners/admin/*). Overall + AE analytics use
 * sample data (tagged) until per-entity analytics endpoints + AE logins (#276) land.
 */

import { useState, useEffect, useCallback, type ReactNode } from 'react'
import { Building2, Users, Handshake, UserPlus, Target, FileText, Trophy } from 'lucide-react'

interface Partner { id: string; name: string; company: string | null; country: string | null; tier: string | null; status: string; referral_count: number; total_paid_zar: number; created_at: string }
interface Deal { id: string; partner_id: string; company_name: string; estimated_value: number | null; protected_until: string | null; status: string }
interface Commission { id: string; partner_id: string; amount_usd: number | null; amount_zar: number; status: string }

type Scope = 'overall' | 'team' | 'partners'
type View = 'analytics' | 'performance' | 'roi' | 'pipeline' | 'targets' | 'contracts' | 'plays'

const daysUntil = (iso: string | null) => iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null
const zar = (n: number | null | undefined) => 'R ' + Number(n ?? 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })

// ── sample entities for Overall + AEs (tagged in-UI until wired) ──
interface Ent {
  name: string; kind: 'company' | 'ae' | 'partner'; role?: string; sample?: boolean
  leads?: number; emails?: number; reply?: string; meetings?: number; pipeline?: string; replies?: number; positive?: number; contacted?: number
  reptarget?: number; mtgtarget?: number; book?: string; commission?: string; clients?: number; atrisk?: number; demos?: number
  funnel: [string, number][]; deals: [string, string, string][]
}
const OVERALL: Ent = { name: 'Overall — our company', kind: 'company', sample: true, leads: 600, emails: 1350, reply: '13%', meetings: 16, pipeline: '$1.8M', replies: 169, positive: 70, contacted: 600, reptarget: 200, mtgtarget: 20, demos: 24,
  funnel: [['Total leads', 600], ['Enrolled', 600], ['Emails sent', 1350], ['Replied', 169], ['Interested', 70], ['Meeting', 16]],
  deals: [['Harbour Freight', 'trial', '$267/mo'], ['Greenfield Dental', 'demo', '$237/mo'], ['Pinnacle Acct', 'registered', '$417/mo']] }
const AES: Record<string, Ent> = {
  ama: { name: 'Ama N.', kind: 'ae', role: 'Account Executive · SA', sample: true, leads: 412, emails: 128, reply: '11%', meetings: 6, pipeline: '$3,200', replies: 14, positive: 6, contacted: 128, reptarget: 20, mtgtarget: 8, book: '$890', commission: '$178', demos: 8, funnel: [['Sourced', 412], ['Sent', 128], ['Replied', 14], ['Interested', 6], ['Meeting', 6]], deals: [['Harbour Freight', 'trial', '$267/mo'], ['Greenfield Dental', 'demo', '$237/mo']] },
  ben: { name: 'Ben K.', kind: 'ae', role: 'Account Executive · UK', sample: true, leads: 210, emails: 74, reply: '6%', meetings: 2, pipeline: '$1,400', replies: 5, positive: 2, contacted: 74, reptarget: 20, mtgtarget: 8, book: '$267', commission: '$53', demos: 3, funnel: [['Sourced', 210], ['Sent', 74], ['Replied', 5], ['Interested', 2], ['Meeting', 2]], deals: [['Ledger & Co', 'demo', '$237/mo'], ['Brooks Ltd', 'registered', '$207/mo']] },
  carla: { name: 'Carla R.', kind: 'ae', role: 'SDR · US', sample: true, leads: 560, emails: 203, reply: '13%', meetings: 9, pipeline: '$6,800', replies: 22, positive: 9, contacted: 203, reptarget: 20, mtgtarget: 8, book: '$1,740', commission: '$348', demos: 11, funnel: [['Sourced', 560], ['Sent', 203], ['Replied', 22], ['Interested', 9], ['Meeting', 9]], deals: [['Summit Roofing', 'won', '$417/mo'], ['Delta Movers', 'trial', '$267/mo'], ['Vista Dental', 'demo', '$237/mo']] },
}

export default function SalesChannelPage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [scope, setScope] = useState<Scope>('overall')
  const [entity, setEntity] = useState<string>('overall')
  const [view, setView] = useState<View>('analytics')

  const fetchAll = useCallback(async () => {
    try {
      const [pr, dr, cr] = await Promise.all([
        fetch('/api/proxy/partners/admin/list'), fetch('/api/proxy/partners/admin/deals'), fetch('/api/proxy/partners/admin/commissions'),
      ])
      if (pr.ok) { const j = await pr.json(); setPartners(j.data ?? j.partners ?? []) }
      if (dr.ok) { const j = await dr.json(); setDeals(j.data ?? j.deals ?? []) }
      if (cr.ok) { const j = await cr.json(); setCommissions(j.data ?? j.commissions ?? []) }
    } catch { /* read-only; empty states handle it */ }
  }, [])
  useEffect(() => { fetchAll() }, [fetchAll])

  function partnerEnt(p: Partner): Ent {
    const pd = deals.filter(d => d.partner_id === p.id)
    const open = pd.filter(d => !['won', 'lost', 'expired'].includes(d.status))
    const paid = commissions.filter(c => c.partner_id === p.id && c.status === 'paid').reduce((s, c) => s + (c.amount_usd ?? c.amount_zar / 18), 0)
    const owed = commissions.filter(c => c.partner_id === p.id && !['paid', 'cancelled'].includes(c.status)).reduce((s, c) => s + (c.amount_usd ?? c.amount_zar / 18), 0)
    const demos = pd.filter(d => ['demo', 'trial', 'won'].includes(d.status)).length
    const won = pd.filter(d => d.status === 'won').length
    return { name: p.name, kind: 'partner', role: `${p.tier || 'Partner'} · ${p.country || '—'}`, clients: p.referral_count, book: '$' + Math.round(paid + owed).toLocaleString(), commission: '$' + Math.round(owed).toLocaleString(),
      pipeline: zar(open.reduce((s, d) => s + (d.estimated_value ?? 0), 0)), atrisk: 0, demos, meetings: won,
      funnel: [['Registered', pd.filter(d => d.status === 'registered').length], ['Demo', pd.filter(d => d.status === 'demo').length], ['Trial', pd.filter(d => d.status === 'trial').length], ['Won', pd.filter(d => d.status === 'won').length]],
      deals: open.map(d => [d.company_name, d.status, (daysUntil(d.protected_until) ?? '—') + 'd left']) as [string, string, string][] }
  }

  const ent: Ent = scope === 'overall' ? OVERALL : scope === 'team' ? (AES[entity] ?? AES.ama)
    : (partners.find(p => p.id === entity) ? partnerEnt(partners.find(p => p.id === entity)!) : { name: 'No partners yet', kind: 'partner', funnel: [], deals: [] })

  const chips = scope === 'team' ? Object.entries(AES).map(([id, e]) => ({ id, ini: e.name.slice(0, 2).toUpperCase(), name: e.name }))
    : scope === 'partners' ? partners.map(p => ({ id: p.id, ini: p.name.slice(0, 2).toUpperCase(), name: p.name })) : []

  function pick(s: Scope) { setScope(s); setEntity(s === 'team' ? 'ama' : s === 'partners' ? (partners[0]?.id ?? '') : 'overall') }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">🎖️ Sales Channel</h1>
      <p className="text-sm text-gray-500 mt-0.5">Track our own sales, every AE, and every partner — Analytics · Performance · ROI · Pipeline, against target.</p>

      {/* scope */}
      <div className="mt-4">
        <div className="inline-flex gap-1 bg-purple-50/70 rounded-xl p-1">
          {([['overall', '🏢 Overall', Building2], ['team', '👤 Our team (AEs)', Users], ['partners', '🤝 Partners', Handshake]] as [Scope, string, React.ElementType][]).map(([s, label]) => (
            <button key={s} onClick={() => pick(s)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${scope === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>{label}</button>
          ))}
        </div>
        {chips.length > 0 && (
          <div className="flex gap-2 flex-wrap mt-3">
            {chips.map(c => (
              <button key={c.id} onClick={() => setEntity(c.id)} className={`flex items-center gap-2 rounded-full pl-1.5 pr-3 py-1.5 text-sm bg-white border ${entity === c.id ? 'border-[#7C3AED] ring-2 ring-purple-100' : 'border-purple-100'}`}>
                <span className="w-6 h-6 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white flex items-center justify-center text-[11px] font-bold">{c.ini}</span>{c.name}
              </button>
            ))}
            {scope === 'team' && <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm border border-dashed border-[#7C3AED]/50 text-[#7C3AED]"><UserPlus className="w-4 h-4" /> Add team member</span>}
          </div>
        )}
      </div>

      {/* tabs */}
      <div className="flex gap-0.5 border-b border-gray-200 mt-5 mb-4 overflow-x-auto">
        {(['analytics', 'performance', 'roi', 'pipeline', 'targets', 'contracts', 'plays'] as View[]).map(v => (
          <button key={v} onClick={() => setView(v)} className={`px-4 py-2.5 text-sm font-semibold capitalize whitespace-nowrap border-b-2 ${view === v ? 'text-[#7C3AED] border-[#7C3AED]' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>{v === 'plays' ? 'Winning plays' : v}</button>
        ))}
      </div>

      {/* entity header */}
      {ent.kind !== 'company' && (
        <div className="flex items-center gap-3 bg-white border border-purple-100 rounded-2xl p-4 mb-4">
          <span className="w-11 h-11 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white flex items-center justify-center font-bold">{ent.name.slice(0, 2).toUpperCase()}</span>
          <div className="flex-1"><p className="font-bold text-gray-900">{ent.name}</p><p className="text-xs text-gray-500">{ent.role}{ent.book ? ` · book ${ent.book}` : ''}{ent.commission ? ` · commission ${ent.commission}` : ''}</p></div>
          <span className={`text-[11px] rounded-full px-2.5 py-1 border ${ent.kind === 'partner' ? 'border-amber-200 text-amber-700 bg-amber-50' : 'border-purple-200 text-[#7C3AED] bg-purple-50'}`}>{ent.kind === 'partner' ? 'read-only' : 'read + manage'}</span>
        </div>
      )}
      {ent.sample && <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3 inline-block">Sample data — live per‑entity analytics wire in with the reporting endpoint</div>}

      <View_ ent={ent} view={view} />
    </div>
  )
}

/* ── view renderers ── */
function Tiles({ items }: { items: [string, ReactNode, string?][] }) {
  return <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0,1fr))` }}>
    {items.map(([k, v, s], i) => <div key={i} className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-gray-400">{k}</p><p className="text-2xl font-bold text-gray-900 mt-1">{v}</p>{s && <p className="text-[11px] text-gray-400 mt-0.5">{s}</p>}</div>)}
  </div>
}
function Bars({ data, max }: { data: [string, number][]; max?: number }) {
  const m = max ?? Math.max(1, ...data.map(d => d[1]))
  return <div>{data.map(([k, v]) => <div key={k} className="my-2"><div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{k}</span><b className="text-gray-900">{v.toLocaleString()}</b></div><div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${Math.round(v / m * 100)}%` }} /></div></div>)}</div>
}
function GoalBar({ label, val, target }: { label: string; val: number; target: number }) {
  const pct = Math.min(100, Math.round(val / target * 100)); const col = pct >= 100 ? '#059669' : pct >= 60 ? '#b45309' : '#dc2626'
  return <div className="my-2.5"><div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{label}</span><b>{val.toLocaleString()} / {target.toLocaleString()} · <span style={{ color: col }}>{pct}%</span></b></div><div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} /></div></div>
}
const STG: Record<string, string> = { won: 'bg-emerald-50 text-emerald-700', trial: 'bg-amber-50 text-amber-700', demo: 'bg-blue-50 text-blue-700', registered: 'bg-purple-50 text-[#7C3AED]' }

function View_({ ent, view }: { ent: Ent; view: View }) {
  if (view === 'analytics') {
    const t: [string, ReactNode, string?][] = ent.kind === 'partner'
      ? [['Live clients', ent.clients ?? 0], ['Book', ent.book ?? '—'], ['Commission', ent.commission ?? '—'], ['Open pipeline', ent.pipeline ?? '—'], ['At‑risk', ent.atrisk ?? 0]]
      : [['Total leads', ent.leads ?? 0], ['Emails sent', (ent.emails ?? 0).toLocaleString()], ['Open rate', 'n/a', 'cold'], ['Reply rate', ent.reply ?? '—'], ['Meetings', ent.meetings ?? 0]]
    const clos = (ent.demos && typeof ent.meetings === 'number') ? Math.round((ent.meetings / ent.demos) * 100) + '%' : '—'
    return <div className="space-y-4">
      <Tiles items={t} />
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-gray-400">🎬 Demos done</p><p className="text-2xl font-bold text-gray-900 mt-1">{ent.demos ?? 0}</p><p className="text-[11px] text-gray-400 mt-0.5">{ent.kind === 'company' ? 'across team + partners' : 'this month'}</p></div>
        <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-gray-400">🎯 Closure rate</p><p className="text-2xl font-bold text-emerald-600 mt-1">{clos}</p><p className="text-[11px] text-gray-400 mt-0.5">{ent.kind === 'partner' ? 'won per demo' : 'meetings won per demo'}</p></div>
      </div>
      {/* Slice C honesty: these charts are hardcoded sample visuals — show them ONLY
         on sample-tagged entities (Overall/AEs, banner shown). A LIVE entity (partner
         today; AEs once #276 lands) gets an honest wire-in state, never fake data. */}
      {ent.sample ? (
        <>
          <div className="bg-white border border-purple-100 rounded-2xl p-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-2">Outreach over time <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">sample</span></p>
            <svg viewBox="0 0 600 150" width="100%" height="150">
              <polyline fill="none" stroke="#2563eb" strokeWidth="2" points="0,140 100,138 200,128 300,80 400,25 500,55 600,110" />
              <polyline fill="none" stroke="#059669" strokeWidth="2" points="0,146 100,144 200,140 300,130 400,112 500,120 600,132" />
            </svg>
            <p className="text-[11px] text-gray-400">— emails sent · — replies (last 6 mo)</p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-3">Prospect status <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">sample</span></p>
              <div className="flex items-center gap-4"><div className="w-28 h-28 rounded-full" style={{ background: 'conic-gradient(#8b5cf6 0 40%,#2563eb 40% 80%,#f59e0b 80% 92%,#059669 92% 100%)' }} />
                <div className="text-xs space-y-1.5 text-gray-600"><div>🟣 New · 240</div><div>🔵 Pending · 240</div><div>🟠 Interested · 54</div><div>🟢 Meeting · 16</div></div></div></div>
            <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-3">Top industries <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">sample</span></p><Bars data={[['SaaS', 132], ['Logistics', 122], ['Insurtech', 117], ['Fintech', 115], ['E‑commerce', 114]]} /></div>
          </div>
        </>
      ) : (
        <div className="bg-white border border-dashed border-purple-200 rounded-2xl p-5 text-sm text-gray-500">
          📈 Charts for this {ent.kind === 'partner' ? 'partner' : 'entity'} (outreach over time · prospect status · industries) wire in with the per-entity reporting endpoint — the numbers above are live.
        </div>
      )}
    </div>
  }
  if (view === 'performance') {
    if (ent.kind === 'partner') return <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-2">Book health</p>
      <p className="text-sm text-gray-500">Per‑client health + upsell/at‑risk signals appear here as the partner&apos;s book grows.</p></div>
    return <div className="space-y-4">
      <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-2">Goals vs target</p><GoalBar label="Replies" val={ent.replies ?? 0} target={ent.reptarget ?? 1} /><GoalBar label="Meetings booked" val={ent.meetings ?? 0} target={ent.mtgtarget ?? 1} /></div>
      <Tiles items={[['FIGSY sent', (ent.emails ?? 0).toLocaleString()], ['Reply rate', ent.reply ?? '—'], ['Positive', ent.positive ?? 0], ['Meetings', ent.meetings ?? 0]]} />
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-2">Pipeline funnel</p><Bars data={ent.funnel} /></div>
        <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-2">Deliverability {ent.sample && <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">sample</span>}</p>
          {ent.sample
            ? [['Sender health', 'Healthy'], ['Warmup', 'passing'], ['Bounce', '0.4%'], ['Spam', '0.0%']].map(r => <div key={r[0]} className="flex justify-between text-sm py-1 border-b border-dashed border-purple-50 last:border-0"><span className="text-gray-500">{r[0]}</span><b className="text-emerald-600">{r[1]}</b></div>)
            : <p className="text-sm text-gray-500">Wires in with the per-entity reporting endpoint (Engine owns deliverability — #279).</p>}</div>
      </div>
    </div>
  }
  if (view === 'roi') {
    return <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-5"><p className="text-[11px] uppercase tracking-wide text-[#7C3AED]">Pipeline value touched</p><p className="text-3xl font-extrabold text-gray-900 mt-1">{ent.pipeline ?? '—'}</p><p className="text-[11px] text-gray-400 mt-1">estimated deal value across delivered leads</p></div>
        <div className="bg-white border border-purple-100 rounded-2xl p-5"><p className="text-[11px] uppercase tracking-wide text-gray-400">Leads delivered</p><p className="text-2xl font-bold mt-1">{ent.leads ?? ent.clients ?? 0}</p></div>
        <div className="bg-white border border-purple-100 rounded-2xl p-5"><p className="text-[11px] uppercase tracking-wide text-gray-400">Meetings booked</p><p className="text-2xl font-bold mt-1">{ent.meetings ?? 0}</p></div>
      </div>
      <Tiles items={[['Replies earned', ent.replies ?? '—'], ['Positive', ent.positive ?? '—'], ['Outreach sent', (ent.emails ?? 0).toLocaleString()], ['Contacted', ent.contacted ?? ent.clients ?? 0]]} />
      {ent.sample
        ? <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-2">Return — last 6 months <span className="ml-1 text-[9px] font-bold text-amber-600 bg-amber-50 rounded-full px-1.5 py-0.5">sample</span></p><Bars data={[['Feb', 0], ['Mar', 0], ['Apr', 0], ['May', 159], ['Jun', 441], ['Jul', 0]]} max={441} /></div>
        : <div className="bg-white border border-dashed border-purple-200 rounded-2xl p-5 text-sm text-gray-500">📊 Return-over-time wires in with the per-entity reporting endpoint — commissions above are live.</div>}
    </div>
  }
  if (view === 'pipeline') {
    return <div className="space-y-4">
      <Tiles items={[['Open pipeline', ent.pipeline ?? '—'], ['Needed (3×)', ent.kind === 'ae' ? '$4,500' : 'set target'], ['Coverage', ent.kind === 'ae' ? '2.1× ✓' : '—']]} />
      <div className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-sm font-semibold text-gray-900 mb-2">Funnel</p><Bars data={ent.funnel} /></div>
      <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
        <p className="text-sm font-semibold text-gray-900 p-4 pb-2">Mini‑CRM — open deals</p>
        <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wide"><th className="text-left px-4 py-2">{ent.kind === 'partner' ? 'Prospect' : 'Company'}</th><th className="text-left px-4 py-2">Stage</th><th className="text-left px-4 py-2">{ent.kind === 'partner' ? 'Protection' : 'Value'}</th></tr></thead>
          <tbody>{ent.deals.length === 0 ? <tr><td colSpan={3} className="px-4 py-4 text-gray-400 text-xs">No open deals.</td></tr> : ent.deals.map((d, i) => <tr key={i} className="border-t border-purple-50"><td className="px-4 py-2 font-medium text-gray-900">{d[0]}</td><td className="px-4 py-2"><span className={`text-[10px] font-bold rounded-full px-2 py-0.5 capitalize ${STG[d[1]] || 'bg-purple-50 text-[#7C3AED]'}`}>{d[1]}</span></td><td className="px-4 py-2 text-gray-600">{d[2]}</td></tr>)}</tbody></table>
      </div>
    </div>
  }
  // Winning plays — shell (needs AE data #276)
  if (view === 'plays') return (
    <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-2xl p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mx-auto mb-4"><Trophy className="w-6 h-6" /></div>
      <h2 className="text-lg font-bold text-gray-900">Winning plays</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">The pitches, sequences and objection-handles that close — captured per person so the whole team can run the best play.</p>
      <span className="inline-block mt-5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Wire-in · needs AE data (#276)</span>
    </div>
  )
  // Contracts vault — shell (needs AE data #276)
  if (view === 'contracts') return (
    <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-2xl p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mx-auto mb-4"><FileText className="w-6 h-6" /></div>
      <h2 className="text-lg font-bold text-gray-900">Contracts vault</h2>
      <p className="text-sm text-gray-500 mt-2 max-w-md mx-auto">Signed AE / partner agreements, commission terms and renewal dates — one place per person.</p>
      <span className="inline-block mt-5 text-[11px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">Wire-in · needs AE data (#276)</span>
    </div>
  )
  // targets — the ladder is the founder's real reference; ACTUALS deliberately live
  // in Finance only (#282 single-source: MRR → Finance; this tab links, never copies).
  return <div className="space-y-4">
    <div className="inline-block"><span className="text-[10px] font-bold uppercase tracking-wide bg-purple-50 text-[#7C3AED] rounded-full px-2.5 py-1">Target‑based sales · moved from Finance</span></div>
    {ent.kind !== 'company' && (
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1"><p className="text-sm font-semibold text-gray-900">Per‑person targets — {ent.name}</p><span className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">needs AE data (#276)</span></div>
        <p className="text-sm text-gray-500">Monthly / quarterly / yearly targets per person wire in with per‑AE logins (#276). The company ladder below is live today.</p>
      </div>
    )}
    <div className="bg-white border border-purple-100 rounded-2xl p-4"><div className="flex items-center gap-2 mb-1"><Target className="w-4 h-4 text-[#7C3AED]" /><p className="text-sm font-semibold text-gray-900">Progress vs target</p></div>
      <p className="text-sm text-gray-500">Live MRR + client actuals have ONE home — <a href="/revenue" className="text-[#7C3AED] font-semibold hover:underline">Finance</a> (single-source #282). This tab holds the target ladder.</p></div>
    <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden"><p className="text-sm font-semibold text-gray-900 p-4 pb-2">Monthly revenue targets</p>
      <table className="w-full text-sm"><thead><tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wide"><th className="text-left px-4 py-2">Month</th><th className="text-left px-4 py-2">MRR target</th><th className="text-left px-4 py-2">Clients</th></tr></thead>
        <tbody>{[['May', '$500', '8'], ['Jun', '$2,000', '15'], ['Jul (now)', '$5,000', '30'], ['Aug', '$10,000', '55'], ['Sep', '$17,000', '80'], ['Oct', '$26,000', '120'], ['Nov', '$36,000', '160'], ['Dec', '$48,000', '200']].map(r => <tr key={r[0]} className="border-t border-purple-50"><td className="px-4 py-2 font-medium text-gray-900">{r[0]}</td><td className="px-4 py-2 text-gray-700">{r[1]}</td><td className="px-4 py-2 text-gray-500">{r[2]} clients</td></tr>)}</tbody></table></div>
    <div><p className="text-sm font-semibold text-gray-900 mb-2">Core KPI targets</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">{[['TTFL', '< 4 hrs', 'Time to First Lead'], ['CVR', '> 40%', 'Trial → Paid'], ['CHURN', '< 5%', 'Monthly churn'], ['REPLY', '> 3%', 'FIGSY reply'], ['INT.', '> 0.5%', 'FIGSY interested'], ['NPS', '> 50', 'NPS']].map(k => <div key={k[0]} className="bg-white border border-purple-100 rounded-2xl p-4"><p className="text-[11px] uppercase tracking-wide text-gray-400">{k[0]}</p><p className="text-xl font-bold text-gray-900 mt-0.5">{k[1]}</p><p className="text-[11px] text-gray-400">{k[2]}</p></div>)}</div></div>
  </div>
}
