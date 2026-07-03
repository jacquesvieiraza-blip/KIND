export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { Receipt, RotateCcw, CalendarClock, AlertTriangle } from 'lucide-react'

/**
 * BILLING LEDGER (#295 invoices/receipts · #296 refunds · #297 renewals).
 * The founder had no admin view of what clients were billed, what was refunded,
 * or what renews next. This joins the real money ledger (credit_transactions) +
 * subscription period ends. NO fake data — honest empty states where a source is
 * empty. Money = credits × plan rate ($1 lead_gen / $3 figsy) as a labelled est.
 */

interface Txn { client_id: string; amount: number; type: string; plan: string | null; note: string | null; created_at: string }
interface Sub { client_id: string; product: string | null; status: string; current_period_end: string | null; trial_ends_at: string | null; amount_usd: number | null }

const rate = (plan: string | null) => (plan === 'figsy' ? 3 : 1)
const usd = (n: number) => '$' + Math.round(n).toLocaleString()
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const daysUntil = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000) : null)

async function getBilling() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

  const [{ data: purchases }, { data: refunds }, { data: subs }, { data: clients }] = await Promise.all([
    supabase.from('credit_transactions').select('client_id, amount, type, plan, note, created_at').eq('type', 'purchase').order('created_at', { ascending: false }).limit(100),
    supabase.from('credit_transactions').select('client_id, amount, type, plan, note, created_at').eq('type', 'refund').order('created_at', { ascending: false }).limit(100),
    supabase.from('subscriptions').select('client_id, product, status, current_period_end, trial_ends_at, amount_usd').in('status', ['active', 'trialing', 'past_due']),
    supabase.from('clients').select('id, company_name'),
  ])

  const name = new Map((clients ?? []).map((c: { id: string; company_name: string | null }) => [c.id, c.company_name || '—']))
  const nameOf = (id: string) => name.get(id) || id.slice(0, 8)

  const receipts = (purchases ?? []) as Txn[]
  const refundRows = (refunds ?? []) as Txn[]
  const receiptsUsd = receipts.reduce((s, t) => s + t.amount * rate(t.plan), 0)
  const refundsUsd = refundRows.reduce((s, t) => s + Math.abs(t.amount) * rate(t.plan), 0)

  // Renewals — active subs whose period ends within 30d; expiring trials within 14d.
  const activeSubs = (subs ?? []).filter((s: Sub) => s.status === 'active') as Sub[]
  const renewals = activeSubs
    .filter(s => { const d = daysUntil(s.current_period_end); return d !== null && d <= 30 })
    .sort((a, b) => (new Date(a.current_period_end!).getTime()) - (new Date(b.current_period_end!).getTime()))
  const trials = (subs ?? []).filter((s: Sub) => s.status === 'trialing') as Sub[]
  const expiringTrials = trials
    .filter(s => { const d = daysUntil(s.trial_ends_at); return d !== null && d <= 14 })
    .sort((a, b) => (new Date(a.trial_ends_at!).getTime()) - (new Date(b.trial_ends_at!).getTime()))
  const pastDue = (subs ?? []).filter((s: Sub) => s.status === 'past_due') as Sub[]

  return { receipts, refundRows, receiptsUsd, refundsUsd, renewals, expiringTrials, pastDue, nameOf }
}

function Stat({ icon, label, value, sub, tone = 'default' }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone?: 'default' | 'warn' | 'good' }) {
  const cls = tone === 'warn' ? 'bg-amber-50 text-amber-600' : tone === 'good' ? 'bg-emerald-50 text-emerald-600' : 'bg-purple-50 text-[#7C3AED]'
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${cls}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Section({ title, children }: { title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-brand-200/60 overflow-hidden">
      <p className="text-sm font-semibold text-gray-900 px-5 py-3.5 border-b border-purple-50">{title}</p>
      {children}
    </div>
  )
}

const empty = (msg: string) => <p className="px-5 py-6 text-sm text-gray-400">{msg}</p>

export default async function BillingPage() {
  const b = await getBilling()

  if (!b) {
    return <div className="px-8 py-6 max-w-6xl mx-auto"><h1 className="text-2xl font-bold text-gray-900">Billing</h1>
      <p className="mt-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 inline-block">Supabase env not set here — billing can&apos;t load.</p></div>
  }

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Receipt className="w-6 h-6 text-[#7C3AED]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing ledger</h1>
          <p className="text-sm text-gray-500 mt-0.5">Receipts, refunds and upcoming renewals — the money view the Cockpit glances at.</p>
        </div>
      </div>

      {/* headline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={<Receipt className="w-5 h-5" />} label="Receipts (all-time)" value={usd(b.receiptsUsd)} sub={`${b.receipts.length} purchase rows`} tone="good" />
        <Stat icon={<RotateCcw className="w-5 h-5" />} label="Refunds (all-time)" value={usd(b.refundsUsd)} sub={`${b.refundRows.length} refund rows`} tone={b.refundRows.length ? 'warn' : 'default'} />
        <Stat icon={<CalendarClock className="w-5 h-5" />} label="Renewals ≤30d" value={String(b.renewals.length)} sub="active subs due" />
        <Stat icon={<AlertTriangle className="w-5 h-5" />} label="Past due" value={String(b.pastDue.length)} sub={b.pastDue.length ? 'needs dunning' : 'all current'} tone={b.pastDue.length ? 'warn' : 'good'} />
      </div>

      {/* renewals */}
      <Section title={<>Upcoming renewals <span className="text-gray-400 font-normal">· next 30 days</span></>}>
        {b.renewals.length === 0 ? empty('No active subscriptions renewing in the next 30 days.') : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/60 text-gray-400 text-[10px] uppercase tracking-wide"><th className="text-left px-5 py-2">Client</th><th className="text-left px-5 py-2">Product</th><th className="text-left px-5 py-2">Renews</th><th className="text-right px-5 py-2">MRR</th></tr></thead>
            <tbody>{b.renewals.map((s, i) => { const d = daysUntil(s.current_period_end); return (
              <tr key={i} className="border-t border-purple-50">
                <td className="px-5 py-2.5 font-medium text-gray-900">{b.nameOf(s.client_id)}</td>
                <td className="px-5 py-2.5 text-gray-500 capitalize">{s.product || '—'}</td>
                <td className="px-5 py-2.5 text-gray-600">{fmtDate(s.current_period_end)} <span className={`text-[11px] ${d !== null && d <= 7 ? 'text-amber-600' : 'text-gray-400'}`}>({d}d)</span></td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{s.amount_usd ? usd(Number(s.amount_usd)) : '—'}</td>
              </tr>) })}</tbody>
          </table>
        )}
      </Section>

      {/* expiring trials (expansion signal) */}
      <Section title={<>Trials ending soon <span className="text-gray-400 font-normal">· next 14 days · convert-or-churn</span></>}>
        {b.expiringTrials.length === 0 ? empty('No trials ending in the next 14 days.') : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/60 text-gray-400 text-[10px] uppercase tracking-wide"><th className="text-left px-5 py-2">Client</th><th className="text-left px-5 py-2">Product</th><th className="text-left px-5 py-2">Trial ends</th></tr></thead>
            <tbody>{b.expiringTrials.map((s, i) => { const d = daysUntil(s.trial_ends_at); return (
              <tr key={i} className="border-t border-purple-50">
                <td className="px-5 py-2.5 font-medium text-gray-900">{b.nameOf(s.client_id)}</td>
                <td className="px-5 py-2.5 text-gray-500 capitalize">{s.product || '—'}</td>
                <td className="px-5 py-2.5 text-gray-600">{fmtDate(s.trial_ends_at)} <span className={`text-[11px] ${d !== null && d <= 3 ? 'text-red-600' : 'text-amber-600'}`}>({d}d)</span></td>
              </tr>) })}</tbody>
          </table>
        )}
      </Section>

      {/* receipts */}
      <Section title={<>Receipts <span className="text-gray-400 font-normal">· credit purchases, newest first</span></>}>
        {b.receipts.length === 0 ? empty('No purchases recorded yet.') : (
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50/60 text-gray-400 text-[10px] uppercase tracking-wide"><th className="text-left px-5 py-2">Date</th><th className="text-left px-5 py-2">Client</th><th className="text-left px-5 py-2">Note</th><th className="text-right px-5 py-2">Credits</th><th className="text-right px-5 py-2">≈ Value</th></tr></thead>
            <tbody>{b.receipts.slice(0, 40).map((t, i) => (
              <tr key={i} className="border-t border-purple-50">
                <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                <td className="px-5 py-2.5 font-medium text-gray-900">{b.nameOf(t.client_id)}</td>
                <td className="px-5 py-2.5 text-gray-500 max-w-xs truncate">{t.note || '—'}{t.plan ? <span className="text-[10px] text-gray-400"> · {t.plan}</span> : null}</td>
                <td className="px-5 py-2.5 text-right text-gray-600">{t.amount.toLocaleString()}</td>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">{usd(t.amount * rate(t.plan))}</td>
              </tr>))}</tbody>
          </table>
        )}
      </Section>

      {/* refunds */}
      <Section title={<>Refunds <span className="text-gray-400 font-normal">· credit_transactions type=refund</span></>}>
        {b.refundRows.length === 0
          ? empty('No refunds recorded. Refunds are logged via the client credit-adjust (admin) and appear here.')
          : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50/60 text-gray-400 text-[10px] uppercase tracking-wide"><th className="text-left px-5 py-2">Date</th><th className="text-left px-5 py-2">Client</th><th className="text-left px-5 py-2">Note</th><th className="text-right px-5 py-2">≈ Value</th></tr></thead>
              <tbody>{b.refundRows.map((t, i) => (
                <tr key={i} className="border-t border-purple-50">
                  <td className="px-5 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(t.created_at)}</td>
                  <td className="px-5 py-2.5 font-medium text-gray-900">{b.nameOf(t.client_id)}</td>
                  <td className="px-5 py-2.5 text-gray-500 max-w-xs truncate">{t.note || '—'}</td>
                  <td className="px-5 py-2.5 text-right font-semibold text-amber-700">−{usd(Math.abs(t.amount) * rate(t.plan))}</td>
                </tr>))}</tbody>
            </table>
          )}
      </Section>

      <p className="text-[11px] text-gray-400">Values are estimated from credits × plan rate ($1 lead_gen · $3 figsy). Authoritative money lives in Stripe; connect Stripe/Xero for reconciled figures.</p>
    </div>
  )
}
