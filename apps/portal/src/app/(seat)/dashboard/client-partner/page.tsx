'use client'

/**
 * R40 — THE CLIENT PARTNER PORTAL (founder-ruled 15 Aug).
 *
 * Her own page, deliberately NOT the legacy partner dashboard, because her view is a
 * different thing: she runs customer success as well as selling, and the founder ruled
 * exactly what she may see — *"her cut only"*. So this page shows WHICH clients are hers
 * and how they are doing, and her own earnings — and never what a client spends. The API
 * enforces that too (`/partners/me` stops selecting `credit_balance` for this seat type);
 * this page simply has nowhere to put such a number.
 *
 * Comp, per R40: 20% of the pack when a client she landed pays, then her seat's retain rate
 * every month she holds them. Every figure below is interpolated from the shared constants
 * or from the API — no money is typed into this file (method rule 7).
 */

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { SellerRamp } from './SellerRamp'
import { DemoEnvironmentCard } from './DemoEnvironmentCard'
import { PACK_PRICE_USD } from '@kind/shared'
import {
  Loader2, ChevronDown, FileText, ShieldCheck, Wallet, Receipt, Landmark, LogOut, X,
} from 'lucide-react'

type Referral = {
  id: string
  client_id: string
  status: string
  first_payment_at: string | null
  created_at: string
  clients?: { company_name?: string | null } | { company_name?: string | null }[] | null
}
type Commission = {
  id: string
  period_month: string
  amount_usd: number | null
  commission_type: 'land' | 'retain' | null
  client_id: string | null
  status: string
  paid_at: string | null
}
type PartnerDoc = {
  id: string
  title: string
  version: string
  updated: string
  signatureRequired: boolean
  summary: string
  body: string
  live?: boolean
}
type Me = {
  partner: { id: string; name: string; email: string; referral_code: string; retain_rate: number | null }
  seat_type: string
  /** Rates travel with the seat so this page never types a percentage (method rule 7). */
  land_rate?: number
  retain_rate?: number
  referrals: Referral[]
  commissions: Commission[]
  stats: {
    clients_held: number
    earned_this_month_usd: number
    recurring_this_month_usd: number
    total_earned_usd: number
    total_pending_usd: number
  }
}

const usd = (n: number) => `$${(n || 0).toFixed(2)}`
const usd0 = (n: number) => `$${Math.round(n || 0).toLocaleString('en-US')}`

function companyOf(r: Referral): string {
  const c = Array.isArray(r.clients) ? r.clients[0] : r.clients
  return c?.company_name || 'Client'
}

export default function ClientPartnerPage() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [docs, setDocs] = useState<PartnerDoc[]>([])
  const [openDoc, setOpenDoc] = useState<PartnerDoc | null>(null)

  // Forecaster inputs. The spend figure is an ASSUMPTION and is labelled as one — she
  // cannot see real client spend, so this must never look like a reading of live data.
  const [fcClients, setFcClients] = useState(2)
  const [fcSpend, setFcSpend] = useState(400)
  const [fcMonths, setFcMonths] = useState(6)

  useEffect(() => {
    ;(async () => {
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        const token = session?.access_token
        const data = await api.get<Me>('/partners/me', token)
        setMe(data)
        // Her document pack. A failure here must never take down her earnings page — the
        // menu simply says the documents could not be loaded.
        try {
          const pack = await api.get<{ documents: PartnerDoc[] }>('/partners/documents', token)
          setDocs(pack.documents ?? [])
        } catch { setDocs([]) }
      } catch {
        setErr('We could not load your earnings just now. Refresh in a moment, or tell us if it keeps happening.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const retainRate = Number(me?.retain_rate ?? me?.partner?.retain_rate) || 0
  const landRate = Number(me?.land_rate) || 0
  const landPerClose = PACK_PRICE_USD * landRate

  // Her 8% per client this month, derived from HER commission rows — never from client spend.
  const retainByClient = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    const map: Record<string, number> = {}
    for (const c of me?.commissions ?? []) {
      if (c.commission_type === 'retain' && c.period_month === month && c.client_id) {
        map[c.client_id] = (map[c.client_id] || 0) + Number(c.amount_usd || 0)
      }
    }
    return map
  }, [me])

  const closes = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7)
    return (me?.commissions ?? []).filter(c => c.commission_type === 'land' && c.period_month === month)
  }, [me])

  const statements = useMemo(() => {
    const byMonth: Record<string, { land: number; retain: number; paid: boolean }> = {}
    for (const c of me?.commissions ?? []) {
      const m = c.period_month
      byMonth[m] = byMonth[m] || { land: 0, retain: 0, paid: true }
      if (c.commission_type === 'retain') byMonth[m].retain += Number(c.amount_usd || 0)
      else byMonth[m].land += Number(c.amount_usd || 0)
      if (c.status !== 'paid') byMonth[m].paid = false
    }
    return Object.entries(byMonth).sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12)
  }, [me])

  const forecast = useMemo(() => {
    const held = fcClients * fcMonths
    const fromCloses = fcClients * landPerClose
    const recurring = held * fcSpend * (retainRate || 0)
    return { held, fromCloses, recurring, total: fromCloses + recurring }
  }, [fcClients, fcSpend, fcMonths, landPerClose, retainRate])

  if (loading) {
    return <div className="flex items-center justify-center py-24 text-[#7b7190]"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your earnings…</div>
  }
  if (err || !me) {
    return <div className="max-w-xl mx-auto mt-16 rounded-xl border border-[#e7e2ef] bg-white p-6 text-[#3d3358]">{err ?? 'Not a Client Partner account.'}</div>
  }

  const s = me.stats

  return (
    <div className="max-w-6xl mx-auto px-5 pb-24">
      {openDoc && <DocumentReader doc={openDoc} onClose={() => setOpenDoc(null)} />}
      {/* header + her document vault */}
      <header className="flex items-center gap-4 flex-wrap pt-7 pb-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#5b21b6] bg-[#f1ebff] rounded-full px-3 py-1.5">Client Partner</span>
        <div className="ml-auto relative">
          <button onClick={() => setMenuOpen(v => !v)}
            className="flex items-center gap-2.5 font-semibold text-[#1E0A5C]">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7C3AED] to-[#D6357C]" />
            {me.partner.name}
            <ChevronDown className="w-4 h-4 text-[#a9a1ba]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] min-w-[292px] bg-white border border-[#e7e2ef] rounded-2xl shadow-xl p-2 z-20">
              <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a9a1ba] px-2.5 pt-2 pb-1.5">Your documents</div>
              {docs.length === 0 && (
                <div className="px-2.5 py-2.5 text-[12.5px] text-[#9b8ec4]">Your documents could not be loaded just now.</div>
              )}
              {docs.map(d => (
                <VaultItem
                  key={d.id}
                  icon={ICON_FOR[d.id] ?? <FileText className="w-3.5 h-3.5" />}
                  label={d.title}
                  note={d.signatureRequired ? 'to sign' : undefined}
                  onClick={() => {
                    // A statement is derived from her commission rows, so it is not a document
                    // to open — it is the table already on this page.
                    setMenuOpen(false)
                    if (d.live) { document.getElementById('payout-statements')?.scrollIntoView({ behavior: 'smooth' }); return }
                    setOpenDoc(d)
                  }}
                />
              ))}
              <div className="h-px bg-[#e7e2ef] my-1.5 mx-1" />
              <VaultItem icon={<LogOut className="w-3.5 h-3.5" />} label="Profile & sign out" />
            </div>
          )}
        </div>
      </header>

      {/* #654 — the ramp leads until the first client is live, because until then the money
          numbers below are all zero and a screen of zeros reads as failure. */}
      <SellerRamp />

      <DemoEnvironmentCard />

      {/* the four numbers */}
      <div className="grid gap-3 mb-6" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))' }}>
        <div className="rounded-2xl p-4 px-5 bg-gradient-to-br from-[#7C3AED] to-[#5b21b6] text-white">
          <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] opacity-75 mb-2">Earned this month</div>
          <div className="text-[26px] font-extrabold tabular-nums">{usd(s.earned_this_month_usd)}</div>
          <div className="text-xs opacity-75 mt-1.5">closes + your share of what your clients spend</div>
        </div>
        <Stat label="Recurring this month" value={usd(s.recurring_this_month_usd)} sub={`${Math.round(retainRate * 100)}% of your clients' spend`} />
        <Stat label="Clients held" value={String(s.clients_held)} sub="each one pays you monthly while they stay" />
        <Stat label="Awaiting payout" value={usd(s.total_pending_usd)} sub="paid monthly, on collected money only" />
      </div>

      {/* her book — HER CUT ONLY. There is deliberately no client-spend column. */}
      <h2 className="text-[16px] font-bold text-[#1E0A5C] mt-7 mb-1">Your book</h2>
      <p className="text-[12.5px] text-[#7b7190] mb-3">Every client you landed and hold. You earn every month they stay with us.</p>
      <div className="overflow-x-auto bg-white border border-[#e7e2ef] rounded-2xl">
        <table className="w-full min-w-[560px] text-[13.5px]">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a9a1ba]">
              <th className="text-left px-4 py-3 border-b-2 border-[#e7e2ef]">Client</th>
              <th className="text-left px-4 py-3 border-b-2 border-[#e7e2ef]">Status</th>
              <th className="text-left px-4 py-3 border-b-2 border-[#e7e2ef]">Landed</th>
              <th className="text-right px-4 py-3 border-b-2 border-[#e7e2ef]">Your share this month</th>
            </tr>
          </thead>
          <tbody>
            {me.referrals.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-[#7b7190]">No clients yet. Your first close shows up here.</td></tr>
            )}
            {me.referrals.map(r => (
              <tr key={r.id}>
                <td className="px-4 py-3 border-b border-[#e7e2ef] font-semibold text-[#1E0A5C]">{companyOf(r)}</td>
                <td className="px-4 py-3 border-b border-[#e7e2ef]">
                  <span className={`inline-block text-[10.5px] font-bold rounded-full px-2.5 py-1 ${r.status === 'active' ? 'bg-[#e8f7f1] text-[#0b7a55]' : 'bg-[#f1ebff] text-[#5b21b6]'}`}>
                    {r.status === 'active' ? 'Active' : 'Onboarding'}
                  </span>
                </td>
                <td className="px-4 py-3 border-b border-[#e7e2ef] text-[#3d3358]">
                  {r.first_payment_at ? new Date(r.first_payment_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                </td>
                <td className="px-4 py-3 border-b border-[#e7e2ef] text-right tabular-nums font-bold text-[#0b7a55]">
                  {usd(retainByClient[r.client_id] || 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3.5 mt-3.5" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))' }}>
        <div className="bg-white border border-[#e7e2ef] rounded-2xl p-5">
          <h3 className="text-[14px] font-bold text-[#1E0A5C] mb-2.5">Closes this month</h3>
          {closes.length === 0
            ? <p className="text-[13px] text-[#7b7190]">No new clients started this month yet.</p>
            : closes.map(c => (
              <div key={c.id} className="flex justify-between text-[13.5px] py-1.5 border-b border-[#f1ebff] last:border-0">
                <span className="text-[#3d3358]">A client you landed started</span>
                <span className="tabular-nums font-bold text-[#0b7a55]">{usd(Number(c.amount_usd || 0))}</span>
              </div>
            ))}
          <p className="text-[12px] text-[#7b7190] mt-2.5">{usd(landPerClose)} per client who starts — 20% of the {usd0(PACK_PRICE_USD)} starting pack.</p>
        </div>

        <div className="bg-white border border-[#e7e2ef] rounded-2xl p-5">
          <h3 className="text-[14px] font-bold text-[#1E0A5C] mb-2.5">How you&rsquo;re paid</h3>
          <Rule>{usd(landPerClose)} the moment a client you landed starts — 20% of the pack.</Rule>
          <Rule>{Math.round(retainRate * 100)}% of everything they spend, every month, for as long as you hold them.</Rule>
          <Rule>Earned when collected, no clawback. If the money landed, your share is yours.</Rule>
          <Rule>Paid monthly against your invoice.</Rule>
        </div>
      </div>

      {/* forecaster */}
      <div className="rounded-2xl border border-[#e7e2ef] bg-gradient-to-br from-[#f1ebff] to-white p-6 mt-4">
        <h3 className="text-[15px] font-bold text-[#1E0A5C] mb-1">What you could earn</h3>
        <p className="text-[12.5px] text-[#7b7190] mb-5">Drag the sliders. The spend figure is an <b>assumption</b> about how active an average client is, not a reading of anyone&rsquo;s account.</p>
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))' }}>
          <Slider label="Clients you land per month" value={fcClients} display={String(fcClients)} min={0} max={8} step={1} onChange={setFcClients} />
          <Slider label="Assumed client spend / month" value={fcSpend} display={usd0(fcSpend)} min={100} max={1200} step={50} onChange={setFcSpend} />
          <Slider label="Months from now" value={fcMonths} display={String(fcMonths)} min={1} max={18} step={1} onChange={setFcMonths} />
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))' }}>
          <Out label="Clients held by then" value={String(forecast.held)} />
          <Out label="From new closes" value={usd0(forecast.fromCloses)} sub="per month" />
          <Out label="Recurring by then" value={usd0(forecast.recurring)} sub="per month, growing" />
          <Out label="Monthly income by then" value={usd0(forecast.total)} hero />
        </div>
      </div>

      {/* statements */}
      <h2 id="payout-statements" className="text-[16px] font-bold text-[#1E0A5C] mt-8 mb-3 scroll-mt-6">Payout statements</h2>
      <div className="overflow-x-auto bg-white border border-[#e7e2ef] rounded-2xl">
        <table className="w-full min-w-[520px] text-[13.5px]">
          <thead>
            <tr className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#a9a1ba]">
              <th className="text-left px-4 py-3 border-b-2 border-[#e7e2ef]">Period</th>
              <th className="text-right px-4 py-3 border-b-2 border-[#e7e2ef]">Closes</th>
              <th className="text-right px-4 py-3 border-b-2 border-[#e7e2ef]">Recurring</th>
              <th className="text-right px-4 py-3 border-b-2 border-[#e7e2ef]">Total</th>
              <th className="text-left px-4 py-3 border-b-2 border-[#e7e2ef]">Status</th>
            </tr>
          </thead>
          <tbody>
            {statements.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[#7b7190]">Your first statement appears after your first close.</td></tr>
            )}
            {statements.map(([month, v]) => (
              <tr key={month}>
                <td className="px-4 py-3 border-b border-[#e7e2ef] font-semibold text-[#1E0A5C]">{month}</td>
                <td className="px-4 py-3 border-b border-[#e7e2ef] text-right tabular-nums">{usd(v.land)}</td>
                <td className="px-4 py-3 border-b border-[#e7e2ef] text-right tabular-nums">{usd(v.retain)}</td>
                <td className="px-4 py-3 border-b border-[#e7e2ef] text-right tabular-nums font-bold text-[#0b7a55]">{usd(v.land + v.retain)}</td>
                <td className="px-4 py-3 border-b border-[#e7e2ef]">
                  <span className={`inline-block text-[10.5px] font-bold rounded-full px-2.5 py-1 ${v.paid ? 'bg-[#e8f7f1] text-[#0b7a55]' : 'bg-[#f1ebff] text-[#5b21b6]'}`}>
                    {v.paid ? 'Paid' : 'Accruing'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white border border-[#e7e2ef] rounded-2xl p-4 px-5">
      <div className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a9a1ba] mb-2">{label}</div>
      <div className="text-[26px] font-extrabold text-[#1E0A5C] tabular-nums">{value}</div>
      <div className="text-xs text-[#7b7190] mt-1.5">{sub}</div>
    </div>
  )
}

function Rule({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2.5 mb-2.5 text-[13.5px] text-[#3d3358]">
      <span className="w-2 h-2 rounded-full bg-[#7C3AED] mt-1.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}

function Slider({ label, value, display, min, max, step, onChange }: {
  label: string; value: number; display: string; min: number; max: number; step: number; onChange: (n: number) => void
}) {
  return (
    <div>
      <label className="flex justify-between text-[11px] font-bold uppercase tracking-[0.06em] text-[#7b7190] mb-2">
        {label}<output className="text-[13px] font-extrabold text-[#5b21b6]">{display}</output>
      </label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-[#7C3AED]" />
    </div>
  )
}

function Out({ label, value, sub, hero }: { label: string; value: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`rounded-xl p-4 border ${hero ? 'bg-gradient-to-br from-[#7C3AED] to-[#5b21b6] border-transparent text-white' : 'bg-white border-[#e7e2ef]'}`}>
      <div className={`text-[10px] font-bold uppercase tracking-[0.09em] mb-1.5 ${hero ? 'opacity-75' : 'text-[#a9a1ba]'}`}>{label}</div>
      <div className={`text-[22px] font-extrabold tabular-nums ${hero ? '' : 'text-[#1E0A5C]'}`}>{value}</div>
      {sub && <div className={`text-xs mt-1 ${hero ? 'opacity-80' : 'text-[#7b7190]'}`}>{sub}</div>}
    </div>
  )
}

const ICON_FOR: Record<string, React.ReactNode> = {
  'commission-agreement': <FileText className="w-3.5 h-3.5" />,
  'nda':                  <ShieldCheck className="w-3.5 h-3.5" />,
  'ip-assignment':        <ShieldCheck className="w-3.5 h-3.5" />,
  'comp-plan':            <Wallet className="w-3.5 h-3.5" />,
  'payout-statements':    <Receipt className="w-3.5 h-3.5" />,
  'payment-details':      <Landmark className="w-3.5 h-3.5" />,
}

function VaultItem({ icon, label, note, onClick }: {
  icon: React.ReactNode; label: string; note?: string; onClick?: () => void
}) {
  return (
    <button type="button" onClick={onClick}
      className="w-full text-left flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg text-[13px] font-semibold text-[#1E0A5C] hover:bg-[#faf7ff] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7C3AED]/40">
      <span className="w-6.5 h-6.5 rounded-lg bg-[#f1ebff] text-[#5b21b6] flex items-center justify-center shrink-0 p-1.5">{icon}</span>
      <span className="flex-1">{label}</span>
      {note && <span className="text-[10px] font-bold uppercase tracking-wider text-[#b9781f] bg-[#fdf3e2] rounded-full px-2 py-0.5">{note}</span>}
    </button>
  )
}

// The document reader. The body is rendered as the exact text that is stored — no markdown
// transformation between what a person signs and what a person reads. For a contract that is
// a feature, not a shortcut.
function DocumentReader({ doc, onClose }: { doc: PartnerDoc; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
      role="dialog" aria-modal="true" aria-label={doc.title} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-start gap-3 px-6 py-4 border-b border-[#eee9f7] sticky top-0 bg-white rounded-t-2xl">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#1E0A5C] truncate">{doc.title}</h2>
            <p className="text-[12px] text-[#9b8ec4]">
              Version {doc.version}{doc.updated ? ` · ${doc.updated}` : ''}{doc.signatureRequired ? ' · needs signing' : ''}
            </p>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="ml-auto shrink-0 text-[#9b8ec4] hover:text-[#1E0A5C] p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5">
          <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-[#2c2440]">{doc.body}</pre>
        </div>
        <div className="px-6 py-4 border-t border-[#eee9f7] flex flex-wrap gap-3 items-center">
          <button onClick={() => window.print()}
            className="text-[13px] font-bold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-lg px-4 py-2">Print</button>
          <span className="text-[12px] text-[#9b8ec4]">Printing gives you a copy to sign and return.</span>
        </div>
      </div>
    </div>
  )
}
