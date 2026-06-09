'use client'

/** V2 — INTEGRATIONS HUB (#84). Full-screen preview, sample data. Gated /v2 area. */

import { useState } from 'react'
import { Sparkles } from 'lucide-react'

const BRAND = '#7C3AED'
const card = 'bg-white rounded-2xl border border-gray-200 shadow-sm'

const CATS = ['All', 'Connected', 'CRM', 'Calendar', 'Channels', 'Data', 'Billing']

const TOOLS = [
  { name: 'HubSpot', icon: '🟠', cat: 'CRM', connected: true },
  { name: 'Pipedrive', icon: '🟢', cat: 'CRM', connected: false },
  { name: 'Salesforce', icon: '🔵', cat: 'CRM', connected: false },
  { name: 'Google Calendar', icon: '📅', cat: 'Calendar', connected: true },
  { name: 'Outlook', icon: '📅', cat: 'Calendar', connected: false },
  { name: 'Zoho / Calendly', icon: '📅', cat: 'Calendar', connected: false },
  { name: 'WhatsApp', icon: '🟢', cat: 'Channels', connected: false },
  { name: 'LinkedIn', icon: '🔗', cat: 'Channels', connected: false },
  { name: 'Apollo', icon: '🔭', cat: 'Data', connected: true },
  { name: 'Stripe', icon: '💳', cat: 'Billing', connected: true },
  { name: 'Paystack', icon: '💳', cat: 'Billing', connected: true },
  { name: 'Flutterwave', icon: '💳', cat: 'Billing', connected: false },
]

export default function IntegrationsHub() {
  const [cat, setCat] = useState('All')
  const tools = TOOLS.filter(t => cat === 'All' ? true : cat === 'Connected' ? t.connected : t.cat === cat)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex items-center gap-2 px-6 py-2 text-xs font-semibold text-white" style={{ background: BRAND }}>
        <Sparkles className="w-3.5 h-3.5" /> V2 PREVIEW · Integrations Hub (#84) · sample data
      </div>

      <div className="max-w-6xl mx-auto px-6 py-7 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          <p className="text-sm text-gray-500 mt-0.5">One clean screen for every connection — only the revenue-relevant ones. Calendar connectors are <b>per rep</b> (#88); CRM dedup reads/writes from here.</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} className="text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
              style={cat === c ? { background: BRAND, color: '#fff' } : { background: '#f3eeff', color: BRAND, border: '1px solid #e0d4fb' }}>
              {c}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tools.map(t => (
            <div key={t.name} className={`${card} p-5`}>
              <div className="text-3xl mb-3">{t.icon}</div>
              <p className="font-bold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-400 mb-4">{t.cat}</p>
              <button className={`w-full text-sm font-bold rounded-lg py-2 ${t.connected ? 'bg-emerald-50 text-emerald-700' : 'text-white'}`} style={t.connected ? undefined : { background: BRAND }}>
                {t.connected ? '✓ Connected' : 'Connect →'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
