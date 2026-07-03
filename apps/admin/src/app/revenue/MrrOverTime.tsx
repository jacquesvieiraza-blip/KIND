// #287 — MRR over time + movement (new / churned / expansion / contraction).
// Reads the daily snapshots written by /internal/metrics/snapshot into
// metrics_daily. Server component — fetches its own data so the revenue page
// just renders <MrrOverTime />. HONEST empty states: if the table doesn't exist
// yet (migration not run) or <2 snapshots exist, it says so instead of crashing.
import { createClient } from '@supabase/supabase-js'
import { TrendingUp, ArrowUpRight, ArrowDownRight, UserPlus, UserMinus } from 'lucide-react'

interface SubEntry { client_id: string; amount_usd: number }
interface Snapshot { date: string; mrr_usd: number; active_subs: number; subs_json: SubEntry[] }

async function getMrrHistory(): Promise<Snapshot[] | null> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  )
  // Newest 30 snapshots. If metrics_daily doesn't exist yet the query returns an
  // error (not a throw) — degrade to an honest empty state.
  const { data, error } = await supabase
    .from('metrics_daily')
    .select('date, mrr_usd, active_subs, subs_json')
    .order('date', { ascending: false })
    .limit(30)
  if (error || !data) return null
  return (data as Snapshot[]).map(s => ({
    ...s,
    mrr_usd: Number(s.mrr_usd) || 0,
    subs_json: Array.isArray(s.subs_json) ? s.subs_json : [],
  }))
}

interface Movement {
  newRevenue: number; newCount: number
  churnedRevenue: number; churnedCount: number
  expansion: number; expansionCount: number
  contraction: number; contractionCount: number
  net: number
}

// Diff the two most recent snapshots (curr = newer, prev = older).
function computeMovement(curr: Snapshot, prev: Snapshot): Movement {
  const prevMap = new Map(prev.subs_json.map(s => [s.client_id, s.amount_usd || 0]))
  const currMap = new Map(curr.subs_json.map(s => [s.client_id, s.amount_usd || 0]))
  const m: Movement = {
    newRevenue: 0, newCount: 0, churnedRevenue: 0, churnedCount: 0,
    expansion: 0, expansionCount: 0, contraction: 0, contractionCount: 0, net: 0,
  }
  for (const [id, amt] of currMap) {
    if (!prevMap.has(id)) { m.newRevenue += amt; m.newCount++; continue }
    const before = prevMap.get(id)!
    if (amt > before) { m.expansion += amt - before; m.expansionCount++ }
    else if (amt < before) { m.contraction += before - amt; m.contractionCount++ }
  }
  for (const [id, amt] of prevMap) {
    if (!currMap.has(id)) { m.churnedRevenue += amt; m.churnedCount++ }
  }
  m.net = m.newRevenue + m.expansion - m.churnedRevenue - m.contraction
  return m
}

export default async function MrrOverTime() {
  const history = await getMrrHistory()

  // Honest empty states.
  if (history === null || history.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-5 h-5 text-purple-500" />
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">MRR over time &amp; movement</h2>
          <span className="rounded-full text-[10px] uppercase tracking-wider bg-gray-100 text-gray-400 px-2 py-0.5 font-semibold">Live snapshots</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">A daily MRR snapshot with new / churned / expansion / contraction movement.</p>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-center">
          <p className="text-gray-400 text-sm">No snapshots yet — the daily cron writes one row/day into <code className="text-gray-500">metrics_daily</code>.</p>
          <p className="text-gray-400 text-xs mt-2">Run migration <code>20260703_metrics_daily.sql</code>, then this fills in from the next 04:00 UTC snapshot.</p>
        </div>
      </div>
    )
  }

  // Oldest → newest for the chart.
  const chrono = [...history].reverse()
  const maxMrr = Math.max(...chrono.map(s => s.mrr_usd), 1)
  const latest = history[0]
  const previous = history[1]
  const movement = history.length >= 2 ? computeMovement(latest, previous) : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-2 mb-1">
        <TrendingUp className="w-5 h-5 text-purple-500" />
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">MRR over time &amp; movement</h2>
        <span className="rounded-full text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 px-2 py-0.5 font-semibold">Live snapshots</span>
      </div>
      <p className="text-xs text-gray-400 mb-5">Last {chrono.length} daily snapshot{chrono.length > 1 ? 's' : ''} of MRR (USD) · movement diffs the two most recent days.</p>

      {/* MRR bar chart — one bar per snapshot day */}
      <div className="flex items-end gap-1 h-32 mb-2">
        {chrono.map(s => {
          const h = Math.max(4, Math.round((s.mrr_usd / maxMrr) * 100))
          return (
            <div key={s.date} className="flex-1 flex flex-col justify-end group relative" title={`${s.date}: $${s.mrr_usd.toLocaleString()} · ${s.active_subs} active`}>
              <div className="w-full bg-purple-400/70 group-hover:bg-purple-500 rounded-t transition-colors" style={{ height: `${h}%` }} />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] text-gray-400 mb-6">
        <span>{chrono[0].date}</span>
        <span>peak ${maxMrr.toLocaleString()}</span>
        <span>{chrono[chrono.length - 1].date}</span>
      </div>

      {/* Movement waterfall — diff of the two most recent snapshots */}
      {!movement ? (
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">Movement needs at least 2 daily snapshots — check back tomorrow.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Movement · {previous.date} → {latest.date}</span>
            <span className={`text-sm font-bold ${movement.net >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {movement.net >= 0 ? '+' : '−'}${Math.abs(movement.net).toLocaleString()} net
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'New',         icon: UserPlus,       amount: movement.newRevenue,    count: movement.newCount,        sign: '+', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Expansion',   icon: ArrowUpRight,   amount: movement.expansion,     count: movement.expansionCount,  sign: '+', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
              { label: 'Contraction', icon: ArrowDownRight, amount: movement.contraction,   count: movement.contractionCount, sign: '−', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100' },
              { label: 'Churned',     icon: UserMinus,      amount: movement.churnedRevenue, count: movement.churnedCount,   sign: '−', color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100' },
            ].map(({ label, icon: Icon, amount, count, sign, color, bg, border }) => (
              <div key={label} className={`rounded-lg border p-4 ${bg} ${border}`}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
                </div>
                <p className={`text-lg font-bold ${amount > 0 ? color : 'text-gray-400'}`}>{amount > 0 ? `${sign}$${amount.toLocaleString()}` : '$0'}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">{count} client{count === 1 ? '' : 's'}</p>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">Diffed from the subscription set snapshotted each day — real movement, not projections.</p>
        </>
      )}
    </div>
  )
}
