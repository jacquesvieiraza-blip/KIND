export const dynamic = 'force-dynamic'

import { Activity, Mail, ShieldCheck, MessageSquare, CalendarCheck, Coins, Ban } from 'lucide-react'

// ITEM 180 — Admin Activity / Audit log.
// READ-ONLY view that aggregates EXISTING logged data (email sends, outcome
// events, POPIA consent timestamps, credit transactions) via the read-only
// /admin/activity API endpoint. No new table, no new write-path.

interface ActivityEvent {
  id: string
  occurred_at: string
  client_id: string | null
  client_name: string | null
  source: 'email' | 'outcome' | 'consent' | 'credit'
  event_type: string
  recipient: string | null
  summary: string
}

interface ClientLite { id: string; company_name: string }

const API = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || ''

async function getActivity(params: URLSearchParams): Promise<ActivityEvent[]> {
  if (!ADMIN_KEY) return []
  try {
    const res = await fetch(`${API}/admin/activity?${params.toString()}`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json() as { success: boolean; data?: ActivityEvent[] }
    return json.data ?? []
  } catch { return [] }
}

async function getClients(): Promise<ClientLite[]> {
  if (!ADMIN_KEY) return []
  try {
    const res = await fetch(`${API}/admin/clients`, {
      headers: { 'x-admin-key': ADMIN_KEY },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const json = await res.json() as { success: boolean; data?: ClientLite[] }
    return (json.data ?? []).map(c => ({ id: c.id, company_name: c.company_name }))
  } catch { return [] }
}

// Event-type filter options (value = normalised type the API understands).
const EVENT_TYPES: { value: string; label: string }[] = [
  { value: '',               label: 'All events' },
  { value: 'email_sent',     label: 'Email sent' },
  { value: 'reply',          label: 'Reply' },
  { value: 'meeting_booked', label: 'Meeting booked' },
  { value: 'consent_sent',   label: 'Consent requested' },
  { value: 'consent_given',  label: 'Consent given' },
  { value: 'opt_out_lead',   label: 'Lead opted out' },
  { value: 'credit',         label: 'Credit change' },
]

function eventStyle(ev: ActivityEvent): { Icon: React.ElementType; chip: string; label: string } {
  switch (ev.event_type) {
    case 'email_sent':     return { Icon: Mail,          chip: 'bg-purple-50 text-[#7C3AED] border-purple-100', label: 'Email sent' }
    case 'reply':          return { Icon: MessageSquare, chip: 'bg-blue-50 text-blue-700 border-blue-200',     label: 'Reply' }
    case 'meeting_booked': return { Icon: CalendarCheck, chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Meeting booked' }
    case 'consent_sent':   return { Icon: ShieldCheck,   chip: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Consent requested' }
    case 'consent_given':  return { Icon: ShieldCheck,   chip: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Consent given' }
    case 'opt_out':
    case 'opt_out_lead':   return { Icon: Ban,           chip: 'bg-red-50 text-red-600 border-red-200', label: 'Opt-out' }
    case 'credit':         return { Icon: Coins,         chip: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Credit' }
    default:               return { Icon: Activity,      chip: 'bg-gray-50 text-gray-600 border-gray-200', label: ev.event_type.replace(/_/g, ' ') }
  }
}

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short' })
  } catch { return ts }
}

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: { client_id?: string; event_type?: string; from?: string; to?: string }
}) {
  const { client_id = '', event_type = '', from = '', to = '' } = searchParams

  const params = new URLSearchParams()
  if (client_id)  params.set('client_id', client_id)
  if (event_type) params.set('event_type', event_type)
  if (from)       params.set('from', from)
  if (to)         params.set('to', to)
  params.set('limit', '500')

  const [events, clients] = await Promise.all([getActivity(params), getClients()])

  const filtered = client_id || event_type || from || to

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Activity className="w-6 h-6 text-[#7C3AED]" />
            Activity & Audit Log
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Who sent what, when, to whom — aggregated from email sends, outcomes, POPIA consent and credit events.
          </p>
        </div>
        <span className="text-sm text-gray-500">{events.length} event{events.length !== 1 ? 's' : ''}{events.length === 500 ? '+ (capped)' : ''}</span>
      </div>

      {/* Filter bar — plain GET form, no client JS needed (read-only) */}
      <form method="GET" className="bg-white rounded-2xl border border-purple-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</label>
          <select name="client_id" defaultValue={client_id}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Event type</label>
          <select name="event_type" defaultValue={event_type}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400">
            {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">From</label>
          <input type="date" name="from" defaultValue={from}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">To</label>
          <input type="date" name="to" defaultValue={to}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400" />
        </div>
        <div className="flex items-center gap-2">
          <button type="submit"
            className="px-4 py-2 bg-[#7C3AED] hover:bg-purple-700 text-white text-sm font-semibold rounded-lg">
            Filter
          </button>
          {filtered && (
            <a href="/activity" className="text-xs text-gray-500 hover:text-gray-700 underline">Clear</a>
          )}
        </div>
      </form>

      {/* Event table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        {events.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Activity className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No activity {filtered ? 'for these filters' : 'logged yet'}</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-purple-100">
                {['When', 'Event', 'Client', 'To', 'Detail'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-50">
              {events.map(ev => {
                const { Icon, chip, label } = eventStyle(ev)
                return (
                  <tr key={ev.id} className="hover:bg-purple-50/30 transition-colors align-top">
                    <td className="px-5 py-3 text-gray-500 text-xs whitespace-nowrap">{fmt(ev.occurred_at)}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${chip}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-700">{ev.client_name ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-gray-600 text-xs">{ev.recipient ?? <span className="text-gray-300">—</span>}</td>
                    <td className="px-5 py-3 text-gray-600 max-w-md truncate" title={ev.summary}>{ev.summary}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Read-only. Aggregates existing logs — figsy_sent_emails, outcome_events, lead consent timestamps, credit_transactions. Newest 500 matching events.
      </p>
    </div>
  )
}
