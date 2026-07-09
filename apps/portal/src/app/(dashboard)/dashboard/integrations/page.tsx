'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, CheckCircle, ArrowRight, Plug } from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────

type Category = 'All' | 'Connected' | 'CRM' | 'Calendar' | 'Channel' | 'Data' | 'Billing'

interface Integration {
  id: string
  name: string
  category: 'CRM' | 'Calendar' | 'Channel' | 'Data' | 'Billing'
  description: string
  connected: boolean
}

// ── Static logo / colour config ───────────────────────────────────────────────

const INTEGRATION_META: Record<string, { emoji: string; color: string; bg: string }> = {
  hubspot:         { emoji: '🟠', color: '#FF7A59', bg: '#FFF3EE' },
  pipedrive:       { emoji: '🟢', color: '#2ECC71', bg: '#EDFAF3' },
  google_calendar: { emoji: '📅', color: '#4285F4', bg: '#EBF2FF' },
  outlook_zoho:    { emoji: '📆', color: '#0078D4', bg: '#E6F3FF' },
  whatsapp:        { emoji: '💬', color: '#25D366', bg: '#E8FBF0' },
  linkedin:        { emoji: '🔗', color: '#0A66C2', bg: '#E8F1FB' },
  apollo:          { emoji: '🚀', color: '#7C3AED', bg: '#F5F0FF' },
  stripe:          { emoji: '💳', color: '#635BFF', bg: '#EEEDFF' },
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#1E1152] text-white text-sm font-medium px-5 py-3 rounded-full shadow-xl shadow-purple-900/20 flex items-center gap-2.5">
      <Plug className="w-4 h-4 text-[#A78BFA]" />
      {message}
    </div>
  )
}

// ── Integration Card ──────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  onConnect,
}: {
  integration: Integration
  onConnect: (name: string) => void
}) {
  const meta = INTEGRATION_META[integration.id] ?? { emoji: '🔌', color: '#7C3AED', bg: '#F5F0FF' }

  return (
    <div
      className={`relative flex flex-col rounded-2xl border overflow-hidden transition-shadow hover:shadow-md hover:shadow-purple-100/50 bg-white ${
        integration.connected ? 'border-emerald-200' : 'border-purple-100/60'
      }`}
    >
      <div className="flex-1 p-5">
        {/* Logo */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4 select-none"
          style={{ background: meta.bg }}
        >
          {meta.emoji}
        </div>

        {/* Name + category */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="text-[15px] font-semibold text-[#1E1152] leading-tight">
            {integration.name}
          </h3>
          <span
            className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ color: meta.color, background: meta.bg }}
          >
            {integration.category}
          </span>
        </div>

        <p className="text-xs text-[#7B6FA0] leading-relaxed">{integration.description}</p>
      </div>

      {/* Footer */}
      {integration.connected ? (
        <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 border-t border-emerald-100">
          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="text-[13px] font-semibold text-emerald-700">Connected</span>
        </div>
      ) : (
        <div className="px-5 pb-5">
          <button
            onClick={() => onConnect(integration.name)}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl border border-[#7C3AED]/20 text-[#7C3AED] hover:bg-[#7C3AED] hover:text-white hover:border-[#7C3AED] transition-all duration-150"
          >
            Connect
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Category filter pills ─────────────────────────────────────────────────────

const CATEGORIES: Category[] = ['All', 'Connected', 'CRM', 'Calendar', 'Channel', 'Data', 'Billing']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IntegrationsPage() {
  const supabase = createClient()
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [toast, setToast]               = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ success: boolean; integrations: Integration[] }>(
          '/integrations/status',
          session.access_token,
        )
        if (res.success) setIntegrations(res.integrations)
        else setError('Could not load integrations. Please refresh.')
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load integrations.')
      }
      setLoading(false)
    }
    load()
  }, [supabase])

  function handleConnect(name: string) {
    setToast(`Coming soon — contact support to connect ${name}`)
  }

  const filtered =
    activeCategory === 'All'
      ? integrations
      : activeCategory === 'Connected'
        ? integrations.filter(i => i.connected)
        : integrations.filter(i => i.category === activeCategory)

  const connectedCount = integrations.filter(i => i.connected).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Could not load integrations</p>
          <p className="text-sm text-[#7B6FA0] mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#7C3AED] text-white rounded-lg text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1E1152]">Integrations Hub <span className="text-xs font-semibold text-gray-400 align-middle ml-1">· Coming soon</span></h1>
          {/* #399 — the hub is a preview; no connectors are live yet. */}
          <p className="text-[#7B6FA0] text-sm mt-1">
            Direct connectors are coming soon. FIGSY already dedups against your CRM on export.
          </p>
        </div>
        {connectedCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full self-start sm:self-auto">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span className="text-[12px] font-semibold text-emerald-700">
              {connectedCount} connected
            </span>
          </div>
        )}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const isActive = cat === activeCategory
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all duration-150 border ${
                isActive
                  ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-sm shadow-purple-200'
                  : 'bg-white text-[#7B6FA0] border-purple-100/70 hover:border-[#7C3AED]/30 hover:text-[#7C3AED]'
              }`}
            >
              {cat}
              {cat === 'Connected' && connectedCount > 0 && (
                <span
                  className={`ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-white/25 text-white' : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {connectedCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-[#7B6FA0] text-sm">
          No integrations found in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(integration => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={handleConnect}
            />
          ))}
        </div>
      )}

      {/* Footer note */}
      <p className="text-[11px] text-[#9B8EC4] leading-relaxed border-t border-purple-50 pt-4">
        Calendar connectors are per rep (#88) — each rep links their own calendar under their profile.
        CRM dedup, push, and sync reads/writes from the connected CRM above.
      </p>

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
