'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, XCircle, ExternalLink, AlertTriangle, Flame, RefreshCw } from 'lucide-react'

type CheckState = 'pending' | 'pass' | 'fail'

interface Check {
  id: string
  area: string
  label: string
  detail: string
  url?: string
}

const CHECKS: Check[] = [
  // Portal
  { id: 'portal-load',    area: 'Portal',   label: 'Portal loads',              detail: 'app.get-kind.com opens without error',         url: 'https://app.get-kind.com' },
  { id: 'portal-login',   area: 'Portal',   label: 'Login works',               detail: 'Sign in with email + password completes' },
  { id: 'portal-dash',    area: 'Portal',   label: 'Dashboard loads',           detail: 'No blank screen, metrics visible' },
  { id: 'portal-icp',     area: 'Portal',   label: 'ICP builder opens',         detail: '/dashboard/leads/icp loads + form works' },
  { id: 'portal-leads',   area: 'Portal',   label: 'Leads page loads',          detail: 'Lead table renders, no error' },
  { id: 'portal-figsy',   area: 'Portal',   label: 'FIGSY campaigns page',      detail: '/dashboard/figsy loads, create campaign button visible' },
  { id: 'portal-billing', area: 'Portal',   label: 'Billing page loads',        detail: 'Plans visible, Stripe checkout button works' },
  { id: 'portal-inbox',   area: 'Portal',   label: 'Inbox page loads',          detail: '/dashboard/inbox renders' },
  // FIGSY flow
  { id: 'figsy-create',   area: 'FIGSY',    label: 'Create campaign',           detail: 'Can create a new campaign draft' },
  { id: 'figsy-email',    area: 'FIGSY',    label: 'Test email sends',          detail: 'Click Send Test Email — arrives in inbox within 2 min' },
  { id: 'figsy-launch',   area: 'FIGSY',    label: 'Launch campaign',           detail: 'Campaign moves from Draft → Active' },
  { id: 'figsy-replies',  area: 'FIGSY',    label: 'Reply classification',      detail: 'Send a test reply — appears in unibox classified' },
  // Admin
  { id: 'admin-load',     area: 'Admin',    label: 'Admin portal loads',        detail: 'Admin home shows KPIs, no crash',                url: 'https://kindadmin-production.up.railway.app' },
  { id: 'admin-clients',  area: 'Admin',    label: 'Clients list',              detail: 'Clients page shows rows' },
  { id: 'admin-unibox',   area: 'Admin',    label: 'Unibox loads',              detail: 'Admin unibox shows replies across all clients' },
  { id: 'admin-analytics',area: 'Admin',    label: 'Analytics loads',           detail: 'Campaign analytics table renders' },
  // API
  { id: 'api-health',     area: 'API',      label: 'API health check',          detail: '/health returns 200 OK',                         url: 'https://kindapi-production-e64c.up.railway.app/health' },
  { id: 'api-leads',      area: 'API',      label: 'Leads endpoint',            detail: 'GET /leads returns data without 500' },
  { id: 'api-figsy',      area: 'API',      label: 'FIGSY KPIs endpoint',       detail: 'GET /figsy/kpis returns without 500' },
  // Auth
  { id: 'auth-signup',    area: 'Auth',     label: 'New user signup',           detail: 'Register a test account end to end' },
  { id: 'auth-reset',     area: 'Auth',     label: 'Password reset email',      detail: 'Resend sends reset email within 2 min' },
  // Payments
  { id: 'stripe-portal',  area: 'Billing',  label: 'Stripe checkout opens',     detail: 'Click upgrade → Stripe page loads' },
  { id: 'stripe-webhook', area: 'Billing',  label: 'Stripe webhook active',     detail: 'Webhook shows in Stripe dashboard as enabled' },
]

const AREAS = ['Portal', 'FIGSY', 'Admin', 'API', 'Auth', 'Billing']

const AREA_COLORS: Record<string, string> = {
  Portal:  'bg-[#7C3AED]/10 text-[#7C3AED] border-[#7C3AED]/20',
  FIGSY:   'bg-blue-50 text-blue-700 border-blue-200',
  Admin:   'bg-indigo-50 text-indigo-700 border-indigo-200',
  API:     'bg-emerald-50 text-emerald-700 border-emerald-200',
  Auth:    'bg-amber-50 text-amber-700 border-amber-200',
  Billing: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function SmokeTestPage() {
  const [states, setStates] = useState<Record<string, CheckState>>(
    Object.fromEntries(CHECKS.map(c => [c.id, 'pending']))
  )
  const [notes, setNotes] = useState<Record<string, string>>({})

  const toggle = (id: string) => {
    setStates(s => {
      const next: CheckState = s[id] === 'pending' ? 'pass' : s[id] === 'pass' ? 'fail' : 'pending'
      return { ...s, [id]: next }
    })
  }

  const reset = () => {
    setStates(Object.fromEntries(CHECKS.map(c => [c.id, 'pending'])))
    setNotes({})
  }

  const total   = CHECKS.length
  const passed  = Object.values(states).filter(s => s === 'pass').length
  const failed  = Object.values(states).filter(s => s === 'fail').length
  const pct     = Math.round((passed / total) * 100)
  const allDone = passed + failed === total

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧪 Smoke Test</h1>
          <p className="text-sm text-gray-500 mt-1">
            Morning checklist — 27 May 2026 · Click each item to mark pass ✓ or fail ✗
          </p>
        </div>
        <button onClick={reset}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors">
          <RefreshCw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-semibold text-gray-900">
              {allDone
                ? failed === 0 ? '✅ All systems go' : `⚠️ ${failed} item${failed > 1 ? 's' : ''} need attention`
                : `${passed} / ${total} checked`}
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{passed} passed · {failed} failed · {total - passed - failed} remaining</p>
          </div>
          <span className="text-3xl font-bold text-gray-900">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`h-2.5 rounded-full transition-all ${failed > 0 ? 'bg-red-500' : 'bg-[#7C3AED]'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-6 gap-2">
          {AREAS.map(area => {
            const areaChecks = CHECKS.filter(c => c.area === area)
            const areaPassed = areaChecks.filter(c => states[c.id] === 'pass').length
            const areaFailed = areaChecks.filter(c => states[c.id] === 'fail').length
            return (
              <div key={area} className="text-center">
                <p className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${AREA_COLORS[area]}`}>{area}</p>
                <p className="text-xs text-gray-500 mt-1">{areaPassed}/{areaChecks.length}</p>
                {areaFailed > 0 && <p className="text-xs text-red-500 font-semibold">{areaFailed} ✗</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Checks grouped by area */}
      {AREAS.map(area => {
        const areaChecks = CHECKS.filter(c => c.area === area)
        return (
          <div key={area} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${AREA_COLORS[area]}`}>{area}</span>
              <span className="text-xs text-gray-400 ml-auto">
                {areaChecks.filter(c => states[c.id] === 'pass').length}/{areaChecks.length} passed
              </span>
            </div>
            <div className="divide-y divide-gray-50">
              {areaChecks.map(check => {
                const state = states[check.id]
                return (
                  <div key={check.id} className="px-5 py-3.5 flex items-start gap-3 hover:bg-gray-50/50 transition-colors">
                    <button onClick={() => toggle(check.id)} className="mt-0.5 shrink-0">
                      {state === 'pass'
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : state === 'fail'
                          ? <XCircle className="w-5 h-5 text-red-500" />
                          : <Circle className="w-5 h-5 text-gray-300 hover:text-gray-400" />
                      }
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold ${
                          state === 'pass' ? 'text-gray-500 line-through' :
                          state === 'fail' ? 'text-red-700' : 'text-gray-900'
                        }`}>{check.label}</p>
                        {check.url && (
                          <a href={check.url} target="_blank" rel="noopener noreferrer"
                            className="text-gray-300 hover:text-[#7C3AED] transition-colors">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{check.detail}</p>
                      {state === 'fail' && (
                        <input
                          type="text"
                          placeholder="Note the error..."
                          value={notes[check.id] ?? ''}
                          onChange={e => setNotes(n => ({ ...n, [check.id]: e.target.value }))}
                          className="mt-2 w-full text-xs border border-red-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-red-400 bg-red-50 text-red-800 placeholder-red-300"
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Failures summary */}
      {failed > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h3 className="font-semibold text-red-700">Items to fix</h3>
          </div>
          <ul className="space-y-1">
            {CHECKS.filter(c => states[c.id] === 'fail').map(c => (
              <li key={c.id} className="flex items-start gap-2 text-sm text-red-700">
                <span className="font-medium">{c.area} →</span>
                <span>{c.label}</span>
                {notes[c.id] && <span className="text-red-500 italic">— {notes[c.id]}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

    </div>
  )
}
