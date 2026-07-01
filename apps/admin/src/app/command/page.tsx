'use client'

/**
 * Command Centre (#274) — per-AE + per-partner oversight.
 * Spec: docs/admin-centre-spec.md. The client Command-Centre shape applied to our
 * own team (AEs: read + manage) and our partners (read-only oversight).
 *
 * Partner data is LIVE (via /api/proxy/partners/admin/*). AE data fills in as we
 * hire (#276 logins). Targets are founder-set (needs Jacques) — until set, the
 * targets/3x-coverage panels show a "set target" state rather than faked numbers.
 */

import { useState, useEffect, useCallback } from 'react'
import { Gauge, Users, Handshake, UserPlus, Target, TrendingUp, FileText, Briefcase, ChevronRight, AlertTriangle } from 'lucide-react'

interface Partner {
  id: string
  name: string
  company: string | null
  country: string | null
  referral_code: string | null
  tier: string | null
  status: string
  referral_count: number
  total_paid_zar: number
  created_at: string
}
interface Deal {
  id: string
  partner_id: string
  company_name: string
  contact_name: string
  estimated_value: number | null
  protected_until: string | null
  status: string
}
interface Commission {
  id: string
  partner_id: string
  period_month: string
  amount_usd: number | null
  amount_zar: number
  status: string
}

type Tab = 'team' | 'partners'

const usd = (n: number) => '$' + Math.round(n).toLocaleString('en-US')
const zar = (n: number | null | undefined) => 'R ' + Number(n ?? 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })
function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export default function CommandCentrePage() {
  const [tab, setTab] = useState<Tab>('partners')
  const [partners, setPartners] = useState<Partner[]>([])
  const [deals, setDeals] = useState<Deal[]>([])
  const [commissions, setCommissions] = useState<Commission[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const [pr, dr, cr] = await Promise.all([
        fetch('/api/proxy/partners/admin/list'),
        fetch('/api/proxy/partners/admin/deals'),
        fetch('/api/proxy/partners/admin/commissions'),
      ])
      if (pr.ok) { const j = await pr.json(); setPartners(j.data ?? j.partners ?? []) }
      if (dr.ok) { const j = await dr.json(); setDeals(j.data ?? j.deals ?? []) }
      if (cr.ok) { const j = await cr.json(); setCommissions(j.data ?? j.commissions ?? []) }
      if (!pr.ok) setErr('Could not load partners (endpoint returned ' + pr.status + ').')
    } catch {
      setErr('Could not reach the partner service.')
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { fetchAll() }, [fetchAll])

  useEffect(() => {
    if (tab === 'partners' && !selected && partners.length) setSelected(partners[0].id)
  }, [tab, partners, selected])

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center"><Gauge className="w-6 h-6" /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">🎖️ Command Centre</h1>
          <p className="text-sm text-gray-500 mt-0.5">The client cockpit shape, for our team &amp; partners — watch every play against target.</p>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="inline-flex gap-1 bg-purple-50/70 rounded-xl p-1">
        {([['partners', 'Partners', Handshake], ['team', 'Our team (AEs)', Users]] as [Tab, string, React.ElementType][]).map(([t, label, Icon]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}>
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}
      </div>

      {tab === 'partners' && (
        <PartnersView
          loading={loading} err={err} partners={partners} deals={deals} commissions={commissions}
          selected={selected} setSelected={setSelected}
        />
      )}
      {tab === 'team' && <TeamView />}
    </div>
  )
}

function PartnersView({ loading, err, partners, deals, commissions, selected, setSelected }: {
  loading: boolean; err: string | null; partners: Partner[]; deals: Deal[]; commissions: Commission[]
  selected: string | null; setSelected: (id: string) => void
}) {
  if (loading) return <div className="text-sm text-gray-400 py-10 text-center">Loading partners…</div>
  if (err && !partners.length) return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 text-sm text-amber-800 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5" /><div>{err}<p className="text-xs text-amber-600 mt-1">Read-only oversight — nothing to action here.</p></div>
    </div>
  )
  if (!partners.length) return (
    <div className="bg-white border border-purple-100 rounded-2xl p-8 text-center">
      <Handshake className="w-8 h-8 text-purple-200 mx-auto mb-2" />
      <p className="text-sm text-gray-500">No partners yet. When one signs up, they appear here for read-only oversight.</p>
    </div>
  )

  const p = partners.find(x => x.id === selected) ?? partners[0]
  const pDeals = deals.filter(d => d.partner_id === p.id)
  const openDeals = pDeals.filter(d => !['won', 'lost', 'expired'].includes(d.status))
  const openPipeline = openDeals.reduce((s, d) => s + (d.estimated_value ?? 0), 0)
  const paid = commissions.filter(c => c.partner_id === p.id && c.status === 'paid').reduce((s, c) => s + (c.amount_usd ?? c.amount_zar / 18), 0)
  const owed = commissions.filter(c => c.partner_id === p.id && c.status !== 'paid' && c.status !== 'cancelled').reduce((s, c) => s + (c.amount_usd ?? c.amount_zar / 18), 0)

  return (
    <div className="grid md:grid-cols-[240px_1fr] gap-5">
      {/* Partner list */}
      <div className="space-y-2">
        {partners.map(x => (
          <button key={x.id} onClick={() => setSelected(x.id)}
            className={`w-full text-left bg-white rounded-xl border p-3 transition ${x.id === p.id ? 'border-[#7C3AED] ring-2 ring-purple-100' : 'border-purple-100 hover:border-purple-300'}`}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white flex items-center justify-center text-xs font-bold">{x.name.slice(0, 2).toUpperCase()}</div>
              <div className="min-w-0"><p className="text-sm font-semibold text-gray-900 truncate">{x.name}</p><p className="text-[11px] text-gray-400 truncate">{x.tier || x.status} · {x.referral_count} refs</p></div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail */}
      <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b border-purple-100 bg-gradient-to-r from-purple-50/50 to-white">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#4C1D95] text-white flex items-center justify-center font-bold">{p.name.slice(0, 2).toUpperCase()}</div>
          <div className="flex-1"><p className="font-bold text-gray-900">{p.name}</p><p className="text-xs text-gray-500">{p.company || 'Partner'} · {p.country || '—'} · joined {new Date(p.created_at).toLocaleDateString()}</p></div>
          <span className="text-[11px] text-gray-400 border border-gray-200 rounded-full px-2.5 py-1">read-only</span>
        </div>

        <div className="p-4 space-y-4">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-2">
            {[['Referrals', String(p.referral_count)], ['Open deals', String(openDeals.length)], ['Commission paid', usd(paid)], ['Commission owed', usd(owed)]].map(([k, v]) => (
              <div key={k} className="bg-purple-50/50 border border-purple-100 rounded-xl p-3"><p className="text-[10px] uppercase tracking-wide text-gray-400">{k}</p><p className="text-lg font-bold text-gray-900 mt-0.5">{v}</p></div>
            ))}
          </div>

          {/* Targets — needs Jacques */}
          <div>
            <SectionLabel icon={<Target className="w-4 h-4 text-[#7C3AED]" />} text="Targets & tracking" />
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              No targets set for this partner yet. <b>Needs Jacques</b> — set monthly / quarter / annual MRR targets to track against (and unlock 3× pipeline coverage).
            </div>
          </div>

          {/* Pipeline coverage (open pipeline is real; coverage needs a target) */}
          <div>
            <SectionLabel icon={<TrendingUp className="w-4 h-4 text-[#7C3AED]" />} text="Pipeline coverage" />
            <div className="grid grid-cols-3 gap-2">
              <Cover k="Open pipeline" v={zar(openPipeline)} />
              <Cover k="Needed (3× target)" v="set target" muted />
              <Cover k="Coverage" v="—" muted />
            </div>
          </div>

          {/* Mini-CRM — real deals */}
          <div>
            <SectionLabel icon={<Briefcase className="w-4 h-4 text-[#7C3AED]" />} text="Mini-CRM — open deals" />
            {openDeals.length === 0 ? (
              <p className="text-xs text-gray-400 px-1 py-2">No open deals.</p>
            ) : (
              <div className="border border-purple-50 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead><tr className="bg-purple-50/50 text-gray-400"><th className="text-left px-3 py-2 font-semibold uppercase tracking-wide">Prospect</th><th className="text-left px-3 py-2 font-semibold uppercase tracking-wide">Stage</th><th className="text-left px-3 py-2 font-semibold uppercase tracking-wide">Value</th><th className="text-left px-3 py-2 font-semibold uppercase tracking-wide">Protection</th></tr></thead>
                  <tbody className="divide-y divide-purple-50">
                    {openDeals.map(d => { const dl = daysUntil(d.protected_until); return (
                      <tr key={d.id}><td className="px-3 py-2 font-medium text-gray-900">{d.company_name}</td><td className="px-3 py-2 capitalize text-gray-600">{d.status}</td><td className="px-3 py-2 text-gray-700">{zar(d.estimated_value)}</td><td className="px-3 py-2 text-gray-500">{dl != null ? `${dl}d left` : '—'}</td></tr>
                    )})}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Contracts vault */}
          <div>
            <SectionLabel icon={<FileText className="w-4 h-4 text-[#7C3AED]" />} text="Contracts & documents" />
            <div className="space-y-1">
              {['Partner agreement', 'Referral & payout terms (20%+5%)', 'Mutual NDA', 'DPA (POPIA/UK-GDPR)'].map(doc => (
                <div key={doc} className="flex items-center gap-2 text-xs py-1.5 border-b border-purple-50 last:border-0">
                  <FileText className="w-3.5 h-3.5 text-[#7C3AED]/50" /><span className="flex-1 text-gray-700">{doc}</span>
                  <span className="text-[10px] text-gray-400 border border-gray-200 rounded-full px-2 py-0.5">upload</span>
                </div>
              ))}
              <p className="text-[11px] text-gray-400 pt-1">Vault ready — <b>needs Jacques</b>: drop each signed doc to store it per-partner.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function TeamView() {
  return (
    <div className="space-y-4">
      <div className="bg-white border border-purple-100 rounded-2xl p-8 text-center">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center mx-auto mb-3"><UserPlus className="w-6 h-6" /></div>
        <p className="font-semibold text-gray-900">No team members yet</p>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">Your AEs use K.I.N.D themselves to source + work leads. Add your first hire to give them a login and watch their plays here.</p>
        <button className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold opacity-60 cursor-not-allowed" title="Ships with per-staff logins (#276)">
          <UserPlus className="w-4 h-4" /> Add team member
        </button>
        <p className="text-[11px] text-gray-400 mt-2">Add-member ships with per-staff logins &amp; roles (#276).</p>
      </div>

      {/* What each AE will show (the shape, so it's clear what's coming) */}
      <div className="bg-gradient-to-br from-purple-50/60 to-white border border-purple-100 rounded-2xl p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[#7C3AED]/60 mb-3">Each AE&apos;s panel will show</p>
        <div className="grid sm:grid-cols-2 gap-2 text-sm text-gray-700">
          {[
            ['Book MRR + commission', 'what they\'ve closed + earned'],
            ['Targets (mo / qtr / yr)', 'tracked with progress bars'],
            ['Pipeline + 3× coverage', 'enough pipeline to hit target?'],
            ['Mini-CRM', 'their open deals + next step'],
            ['Plays', 'what\'s working / not (kill the losers)'],
            ['Contracts & docs', 'employment · comp · NDA · data-handling'],
          ].map(([t, s]) => (
            <div key={t} className="flex items-start gap-2 bg-white rounded-xl border border-purple-50 p-3">
              <ChevronRight className="w-4 h-4 text-[#7C3AED] mt-0.5 shrink-0" />
              <div><p className="font-medium text-gray-900">{t}</p><p className="text-xs text-gray-400">{s}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionLabel({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="flex items-center gap-2 mb-2">{icon}<span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{text}</span></div>
}
function Cover({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return <div className="bg-white border border-purple-100 rounded-xl p-3 text-center"><p className="text-[10px] uppercase tracking-wide text-gray-400">{k}</p><p className={`text-base font-bold mt-0.5 ${muted ? 'text-gray-300' : 'text-gray-900'}`}>{v}</p></div>
}
