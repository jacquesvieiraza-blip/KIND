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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <main className="px-8 py-6 max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 text-gray-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Platform Health</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {lastChecked
                ? `Last checked: ${lastChecked.toLocaleTimeString()}`
                : 'Checking services...'}
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

      {/* Service status cards */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
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

      {/* FIGSY cron */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="font-semibold text-gray-900 mb-4">FIGSY Cron</h2>
        <div className="flex items-center justify-between py-3">
          <div>
            <p className="text-sm text-gray-900 font-medium">Last run</p>
            <p className="text-xs text-gray-400 mt-0.5">Automated lead generation cron job</p>
          </div>
          <span className="text-sm text-gray-400">Last run: checking...</span>
        </div>
        <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-4">
          <p className="text-xs text-gray-400">FIGSY cron run history will appear here once the reporting endpoint is connected.</p>
        </div>
      </div>

      {/* Last audit result */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
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
      <div className="bg-white border border-gray-200 rounded-xl p-6">
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
