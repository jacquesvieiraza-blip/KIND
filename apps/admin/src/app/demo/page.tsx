'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminNav } from '@/components/AdminNav'
import { Plus, ExternalLink, Calendar, Trash2, Loader2, Users, RefreshCw, CheckCircle, Clock, XCircle } from 'lucide-react'

interface Demo {
  id: string
  company_name: string
  industry: string
  country: string
  created_at: string
  prospect_name: string
  created_by: string
  expires_at: string
  leads_count: number
  expired: boolean
}

const SALES_TEAM = ['Jacques', 'Sales Engineer', 'Other']

const SUPPORTED_COUNTRIES = [
  'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt', 'United Kingdom',
  'United States', 'Australia', 'Canada', 'Germany', 'Netherlands',
]

const INDUSTRIES = [
  'Fintech', 'Healthtech', 'E-commerce', 'SaaS', 'Logistics', 'Agriculture',
  'Education', 'Manufacturing', 'Real Estate', 'Media', 'Consulting', 'Retail',
  'Banking', 'Insurance', 'Telecoms', 'Energy',
]

function StatusBadge({ demo }: { demo: Demo }) {
  const now = new Date()
  const exp = new Date(demo.expires_at)
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / 86400000)

  if (demo.expired || daysLeft <= 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500"><XCircle className="w-3 h-3" />Expired</span>
  if (daysLeft <= 3)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700"><Clock className="w-3 h-3" />Expires in {daysLeft}d</span>
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" />Active · {daysLeft}d left</span>
}

const defaultExpiry = () => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

export default function DemoPage() {
  const [demos, setDemos]         = useState<Demo[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [creating, setCreating]   = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [expiringId, setExpiringId] = useState<string | null>(null)
  const [extendId, setExtendId]   = useState<string | null>(null)
  const [extendDate, setExtendDate] = useState('')
  const [toast, setToast]         = useState<string | null>(null)

  const [form, setForm] = useState({
    prospect_name: '',
    company_name:  '',
    industry:      'Fintech',
    country:       'South Africa',
    website_url:   '',
    expires_at:    defaultExpiry(),
    created_by:    SALES_TEAM[0],
  })

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const loadDemos = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/proxy/admin/demos')
      const data = await res.json()
      setDemos(data.data || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { loadDemos() }, [loadDemos])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/proxy/admin/demos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Failed to create demo')
      setShowForm(false)
      setForm({ prospect_name: '', company_name: '', industry: 'Fintech', country: 'South Africa', website_url: '', expires_at: defaultExpiry(), created_by: SALES_TEAM[0] })
      showToast(`Demo created for ${data.data.company_name} — ICP running in background`)
      loadDemos()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create demo')
    }
    setCreating(false)
  }

  async function openDemo(id: string) {
    setOpeningId(id)
    try {
      const res = await fetch(`/api/proxy/admin/demos/${id}/login`, { method: 'POST' })
      const data = await res.json()
      if (!data.success || !data.data?.magic_link) throw new Error('No magic link returned')
      window.open(data.data.magic_link, '_blank')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to open demo')
    }
    setOpeningId(null)
  }

  async function expireDemo(id: string, name: string) {
    if (!confirm(`Expire the demo for "${name}"? This will cancel their access immediately.`)) return
    setExpiringId(id)
    try {
      const res = await fetch(`/api/proxy/admin/demos/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast('Demo expired')
      loadDemos()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to expire demo')
    }
    setExpiringId(null)
  }

  async function extendDemo(id: string) {
    if (!extendDate) return
    try {
      const res = await fetch(`/api/proxy/admin/demos/${id}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expires_at: new Date(extendDate).toISOString() }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      showToast('Demo extended')
      setExtendId(null)
      setExtendDate('')
      loadDemos()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to extend demo')
    }
  }

  // Default expiry to 30 days from now
  const defaultExpiry = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminNav />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium bg-gray-900 text-white">
          {toast}
        </div>
      )}

      <main className="px-8 py-8 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Demo Environments</h2>
            <p className="text-gray-500 text-sm mt-1">Create a fully live demo for a prospect — real leads pulled from Apollo.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadDemos} className="p-2 rounded-lg border border-gray-200 hover:border-gray-400 text-gray-500 transition-colors">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={() => { setShowForm(true); setCreateError(null) }}
              className="flex items-center gap-2 px-4 py-2 bg-[#0066FF] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
              <Plus className="w-4 h-4" />New Demo
            </button>
          </div>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-5">Create Demo Environment</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prospect / Company Name *</label>
                  <input required type="text" value={form.prospect_name}
                    onChange={e => setForm(f => ({ ...f, prospect_name: e.target.value }))}
                    placeholder="e.g. Acme Corp — John Smith"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Demo Company Name * <span className="text-gray-400 font-normal">(shown in portal)</span></label>
                  <input required type="text" value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="e.g. Acme Corp"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {SUPPORTED_COUNTRIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Demo Expiry *</label>
                  <input required type="date" value={form.expires_at || defaultExpiry}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website URL <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="url" value={form.website_url}
                    onChange={e => setForm(f => ({ ...f, website_url: e.target.value }))}
                    placeholder="https://..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created by *</label>
                  <select value={form.created_by} onChange={e => setForm(f => ({ ...f, created_by: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    {SALES_TEAM.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-700">
                <strong>What happens:</strong> A real client account is created with all 4 products active. An ICP is auto-built from the industry + country and run against Apollo — real leads with real scores will appear within minutes. Click "Open Demo" to launch the portal as this client in a new tab.
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{createError}</div>
              )}

              <div className="flex items-center gap-3 pt-1">
                <button type="submit" disabled={creating}
                  className="flex items-center gap-2 px-5 py-2.5 bg-[#0066FF] text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Creating…' : 'Create Demo Environment'}
                </button>
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 border border-gray-200 text-sm font-medium rounded-lg hover:border-gray-400 transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Demo table */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : demos.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium text-gray-600">No demo environments yet</p>
              <p className="text-xs mt-1">Create one to show a prospect the full K.I.N.D platform with real leads.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Prospect', 'Demo Company', 'Industry / Country', 'Leads', 'Created by', 'Expiry', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demos.map(demo => (
                  <tr key={demo.id} className={`hover:bg-gray-50 transition-colors ${demo.expired ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-900">{demo.prospect_name}</td>
                    <td className="px-4 py-3 text-gray-700">{demo.company_name}</td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{demo.industry}</p>
                      <p className="text-xs text-gray-400">{demo.country}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${demo.leads_count > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                        {demo.leads_count > 0 ? demo.leads_count : '—'}
                      </span>
                      {demo.leads_count === 0 && <p className="text-xs text-gray-400">running…</p>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{demo.created_by}</td>
                    <td className="px-4 py-3">
                      {extendId === demo.id ? (
                        <div className="flex items-center gap-2">
                          <input type="date" value={extendDate}
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={e => setExtendDate(e.target.value)}
                            className="border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <button onClick={() => extendDemo(demo.id)}
                            className="text-xs text-blue-600 hover:underline font-medium">Save</button>
                          <button onClick={() => { setExtendId(null); setExtendDate('') }}
                            className="text-xs text-gray-400 hover:underline">Cancel</button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs text-gray-600">{new Date(demo.expires_at).toLocaleDateString('en-ZA')}</p>
                          {!demo.expired && (
                            <button onClick={() => { setExtendId(demo.id); setExtendDate(new Date(demo.expires_at).toISOString().slice(0, 10)) }}
                              className="text-xs text-blue-500 hover:underline flex items-center gap-0.5 mt-0.5">
                              <Calendar className="w-3 h-3" />Extend
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge demo={demo} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {!demo.expired && (
                          <button onClick={() => openDemo(demo.id)} disabled={openingId === demo.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
                            {openingId === demo.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ExternalLink className="w-3 h-3" />}
                            Open Demo
                          </button>
                        )}
                        {!demo.expired && (
                          <button onClick={() => expireDemo(demo.id, demo.prospect_name)} disabled={expiringId === demo.id}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors disabled:opacity-40" title="Expire demo">
                            {expiringId === demo.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  )
}
