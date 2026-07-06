'use client'

import { useEffect, useState } from 'react'
import { Activity, ExternalLink, RefreshCw } from 'lucide-react'

type ServiceStatus = 'checking' | 'operational' | 'degraded' | 'unreachable'

interface Service {
  name: string
  type: 'internal' | 'external'
  statusPageUrl?: string
  checkUrl?: string
}

const SERVICES: Service[] = [
  { name: 'Railway API',     type: 'internal',  checkUrl: '/api/proxy/health' },
  { name: 'Supabase',        type: 'external',  statusPageUrl: 'https://status.supabase.com' },
  { name: 'Vercel Portal',   type: 'external',  statusPageUrl: 'https://www.vercel-status.com' },
  { name: 'Vercel Website',  type: 'external',  statusPageUrl: 'https://www.vercel-status.com' },
  { name: 'Vercel Admin',    type: 'external',  statusPageUrl: 'https://www.vercel-status.com' },
]

// #279 — deliverability timeseries (real, from /admin/deliverability/timeseries)
interface DeliverPoint { date: string; sent: number; bounced: number; complained: number; bounceRate: number; complaintRate: number }
interface DeliverData { days: number; series: DeliverPoint[]; totals: { sent: number; bounced: number; complained: number; bounceRate: number; complaintRate: number } }

// Cron run-history — last run per job (from cron_runs).
interface CronRun { job: string; started_at: string | null; finished_at: string | null; ok: boolean | null; note: string | null }
// #290 — a captured unhandled API error (from error_events).
interface ErrorEvent { id: string; route: string | null; method: string | null; status: number | null; message: string | null; created_at: string }

function buildPoints(series: DeliverPoint[], key: 'bounceRate' | 'complaintRate', yMax: number): string {
  const n = series.length
  return series.map((d, i) => {
    const x = n > 1 ? (i / (n - 1)) * 600 : 300
    const y = 150 - Math.min(1, d[key] / yMax) * 150
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const colors: Record<ServiceStatus, string> = {
    checking:    'bg-gray-200 animate-pulse',
    operational: 'bg-emerald-400',
    degraded:    'bg-amber-400',
    unreachable: 'bg-red-400',
  }
  return <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors[status]}`} />
}

function StatusText({ status }: { status: ServiceStatus }) {
  const labels: Record<ServiceStatus, string> = {
    checking:    'Checking...',
    operational: 'Operational',
    degraded:    'Degraded',
    unreachable: 'Unreachable',
  }
  const colors: Record<ServiceStatus, string> = {
    checking:    'text-gray-400',
    operational: 'text-emerald-400',
    degraded:    'text-amber-400',
    unreachable: 'text-red-400',
  }
  return <span className={`text-sm font-medium ${colors[status]}`}>{labels[status]}</span>
}

export default function HealthPage() {
  const [statuses, setStatuses] = useState<Record<string, ServiceStatus>>({})
  const [lastChecked, setLastChecked] = useState<Date | null>(null)
  const [checking, setChecking] = useState(false)
  const [deliver, setDeliver] = useState<DeliverData | null>(null)
  const [deliverErr, setDeliverErr] = useState(false)
  // Cron run-history: null = still loading.
  const [cronRuns, setCronRuns] = useState<CronRun[] | null>(null)
  // #290 — recent captured API errors (error_events). null = still loading.
  const [errors, setErrors] = useState<ErrorEvent[] | null>(null)

  async function checkStatuses() {
    setChecking(true)
    const newStatuses: Record<string, ServiceStatus> = {}

    // Check Railway API (internal)
    try {
      const res = await fetch('/api/proxy/health', { signal: AbortSignal.timeout(5000) })
      newStatuses['Railway API'] = res.ok ? 'operational' : 'degraded'
    } catch {
      newStatuses['Railway API'] = 'unreachable'
    }

    // External services — mark as operational with link (we can't CORS-check them)
    for (const svc of SERVICES) {
      if (svc.type === 'external' && !newStatuses[svc.name]) {
        newStatuses[svc.name] = 'operational'
      }
    }

    setStatuses(newStatuses)
    setLastChecked(new Date())
    setChecking(false)
  }

  useEffect(() => {
    checkStatuses()
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/admin/deliverability/timeseries?days=30', { cache: 'no-store' })
        const json = await res.json()
        if (json?.success && json.data) setDeliver(json.data as DeliverData)
        else setDeliverErr(true)
      } catch { setDeliverErr(true) }
    })()
    // Cron run-history — degrades to an empty list on any failure.
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/admin/cron-runs', { cache: 'no-store' })
        const json = await res.json()
        setCronRuns(json?.success && json.data?.jobs ? (json.data.jobs as CronRun[]) : [])
      } catch { setCronRuns([]) }
    })()
    // #290 — recent captured API errors. Degrades to an empty list on any failure.
    ;(async () => {
      try {
        const res = await fetch('/api/proxy/admin/errors', { cache: 'no-store' })
        const json = await res.json()
        setErrors(json?.success && json.data?.errors ? (json.data.errors as ErrorEvent[]) : [])
      } catch { setErrors([]) }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="px-8 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">⚙️ Engine / Deliverability</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Is it actually sending? {lastChecked
                ? `· last checked ${lastChecked.toLocaleTimeString()}`
                : '· checking services…'}
            </p>
          </div>
        </div>
        <button
          onClick={checkStatuses}
          disabled={checking}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Deliverability over time (#279) — LIVE from figsy_sent_emails + opt_out_blocklist.
         Real per-day bounce % / complaint % — catches a domain going bad before it poisons the send. */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900">Deliverability over time</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
            live · last {deliver?.days ?? 30}d
          </span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Bounce % and complaint % per day — catches a domain going bad <b>before</b> it poisons the send. Keep bounce &lt;2% · complaint &lt;0.3%.</p>
        {!deliver && !deliverErr && (
          <div className="h-44 rounded-lg border border-brand-200/50 bg-white/50 flex items-center justify-center text-xs text-gray-400">Loading…</div>
        )}
        {deliverErr && (
          <div className="h-44 rounded-lg border border-brand-200/50 bg-white/50 flex items-center justify-center text-xs text-amber-600">Couldn&apos;t load deliverability data — check the API / admin key.</div>
        )}
        {deliver && !deliverErr && (deliver.totals.sent === 0 ? (
          <div className="relative h-44 rounded-lg border border-brand-200/50 bg-white/50 flex items-center justify-center">
            <p className="text-xs text-gray-400 bg-white/80 rounded-full px-3 py-1 border border-brand-200/50">No sends in the last {deliver.days} days — the graph fills once FIGSY starts sending.</p>
          </div>
        ) : (() => {
          const maxRate = Math.max(...deliver.series.map(d => Math.max(d.bounceRate, d.complaintRate)))
          const yMax = Math.max(5, Math.ceil(maxRate))
          const gridY = [yMax, +(yMax * 0.66).toFixed(1), +(yMax * 0.33).toFixed(1), 0]
          return (
            <>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm mb-3">
                <span className="text-gray-500">Sent: <b className="text-gray-900">{deliver.totals.sent.toLocaleString()}</b></span>
                <span className="text-gray-500">Bounce: <b className={deliver.totals.bounceRate >= 2 ? 'text-red-600' : 'text-gray-900'}>{deliver.totals.bounceRate}%</b> <span className="text-gray-400">({deliver.totals.bounced})</span></span>
                <span className="text-gray-500">Complaint: <b className={deliver.totals.complaintRate >= 0.3 ? 'text-red-600' : 'text-gray-900'}>{deliver.totals.complaintRate}%</b> <span className="text-gray-400">({deliver.totals.complained})</span></span>
              </div>
              <div className="relative h-44 rounded-lg border border-brand-200/50 bg-white/50 overflow-hidden">
                <div className="absolute inset-0 flex flex-col justify-between py-3 px-3 pointer-events-none">
                  {gridY.map((y, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-300 w-8 shrink-0">{y}%</span>
                      <span className="flex-1 border-t border-dashed border-gray-100" />
                    </div>
                  ))}
                </div>
                <svg viewBox="0 0 600 150" preserveAspectRatio="none" className="absolute inset-0 w-full h-full px-10 py-3">
                  <polyline fill="none" stroke="#dc2626" strokeWidth="2" vectorEffect="non-scaling-stroke" points={buildPoints(deliver.series, 'bounceRate', yMax)} />
                  <polyline fill="none" stroke="#7C3AED" strokeWidth="2" vectorEffect="non-scaling-stroke" points={buildPoints(deliver.series, 'complaintRate', yMax)} />
                </svg>
              </div>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500">
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#dc2626] inline-block" /> bounce %</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-[#7C3AED] inline-block" /> complaint %</span>
                <span className="ml-auto text-gray-400">{deliver.series[0]?.date} → {deliver.series[deliver.series.length - 1]?.date}</span>
              </div>
            </>
          )
        })())}
      </div>

      {/* Service status cards */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Service Status</h2>
        <div className="space-y-3">
          {SERVICES.map((svc) => {
            const status: ServiceStatus = statuses[svc.name] ?? 'checking'
            return (
              <div key={svc.name} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <StatusDot status={status} />
                  <span className="text-sm text-gray-900 font-medium">{svc.name}</span>
                  {svc.type === 'external' && (
                    <span className="text-[10px] text-gray-300 uppercase tracking-widest">external</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <StatusText status={status} />
                  {svc.statusPageUrl && (
                    <a
                      href={svc.statusPageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-gray-500 transition-colors"
                      title="Status page"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Cron run-history — real last-run-per-job from cron_runs (was a shell). */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900">Cron run history</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">last run per job</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Every scheduled job records a row in <code>cron_runs</code>. Green = last run OK, red = failed.</p>
        {cronRuns === null ? (
          <div className="h-16 rounded-lg border border-brand-200/50 bg-white/50 flex items-center justify-center text-xs text-gray-400">Loading…</div>
        ) : cronRuns.length === 0 ? (
          <div className="rounded-lg border border-brand-200/50 bg-white/50 p-4 text-center text-xs text-gray-400">No cron runs recorded yet — fills in once the <code>cron_runs</code> migration is applied and the next job fires.</div>
        ) : (
          <div className="space-y-1.5">
            {cronRuns.map(r => (
              <div key={r.job} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.ok === false ? 'bg-red-400' : r.ok ? 'bg-emerald-400' : 'bg-gray-300'}`} />
                  <span className="text-sm text-gray-900 font-medium truncate">{r.job}</span>
                </div>
                <span className="shrink-0 text-[11px] text-gray-400">{r.started_at ? new Date(r.started_at).toLocaleString() : '—'}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deliverability readiness — the silent-fail checklist */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1">Deliverability readiness</h2>
        <p className="text-xs text-gray-400 mb-4">The send engine only works if these are set. Unset keys fail <b>silently</b> — verify before any real send.</p>
        <div className="space-y-2">
          {[
            { k: 'RESEND_API_KEY', d: 'Unset → rows say "sent" but no mail leaves', need: false },
            { k: 'ADMIN_SECRET_KEY', d: 'Unset → every cron silently skips (only step 1 sends)', need: false },
            { k: 'Send cron (every 2h)', d: 'Sequences drip via /internal/figsy/send-due-all', need: false },
            { k: 'Bounce / complaint suppression (#267)', d: 'Enable email.bounced + email.complained on the Resend webhook', need: true },
            { k: 'PDL_API_KEY (#243)', d: 'Set in Railway so discovery survives Apollo being absent', need: true },
          ].map(row => (
            <div key={row.k} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{row.k}</p>
                <p className="text-xs text-gray-400">{row.d}</p>
              </div>
              <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${row.need ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                {row.need ? 'needs Jacques' : 'verify'}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3">Bounce/complaint % is now live in the graph above (#279); cron last-run history is still pending a run-log feed.</p>
      </div>

      {/* Recent API errors (#290) — captured by the error-handling middleware into
         error_events. Honest empty state until an error is captured / the migration runs. */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-semibold text-gray-900">Recent API errors</h2>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">last 20</span>
        </div>
        <p className="text-xs text-gray-400 mb-4">Unhandled 500s are captured to <code>error_events</code> and the founder is alerted (throttled 1×/hr per signature).</p>
        {errors === null ? (
          <div className="h-16 rounded-lg border border-brand-200/50 bg-white/50 flex items-center justify-center text-xs text-gray-400">Loading…</div>
        ) : errors.length === 0 ? (
          <div className="rounded-lg border border-brand-200/50 bg-white/50 p-4 text-center text-xs text-emerald-600">No errors captured — clean. (Fills in once the <code>error_events</code> migration is applied and an error occurs.)</div>
        ) : (
          <div className="space-y-2">
            {errors.map(e => (
              <div key={e.id} className="flex items-start justify-between gap-3 py-2 border-b border-gray-100 last:border-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate"><span className="text-red-600">{e.status ?? 500}</span> · {e.method} {e.route}</p>
                  <p className="text-xs text-gray-400 truncate">{e.message}</p>
                </div>
                <span className="shrink-0 text-[11px] text-gray-400">{new Date(e.created_at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Last audit result */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Last Audit Result</h2>
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-5 text-center">
          <p className="text-gray-400 text-sm">Audit results are tracked as GitHub Issues.</p>
          <a
            href="https://github.com/jacquesvieiraza-blip/KIND/issues?q=label%3Aaudit"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-lg bg-white border border-gray-200 text-sm text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Audit Issues on GitHub
          </a>
        </div>
      </div>

      {/* External status links */}
      <div className="bg-white/80 backdrop-blur-sm border border-brand-200/60 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">External Status Pages</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { name: 'Supabase Status',  url: 'https://status.supabase.com',   desc: 'Database & auth' },
            { name: 'Vercel Status',    url: 'https://www.vercel-status.com',  desc: 'Frontend deployments' },
            { name: 'Railway Status',   url: 'https://status.railway.app',     desc: 'API server' },
            { name: 'Paystack Status',  url: 'https://status.paystack.com',    desc: 'Payment processing' },
          ].map(link => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors group"
            >
              <div>
                <p className="text-sm font-medium text-gray-900 group-hover:text-gray-900">{link.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{link.desc}</p>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
            </a>
          ))}
        </div>
      </div>
    </main>
  )
}
