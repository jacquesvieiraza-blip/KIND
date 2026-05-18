'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { SUPPORTED_COUNTRIES } from '@kind/shared'
import { Loader2, Save, CheckCircle, XCircle, Link2, Calendar, MessageCircle, Phone } from 'lucide-react'

interface ClientData {
  company_name: string
  industry: string
  country: string
  website: string
  phone: string
  crm_type: string
  crm_api_key: string
  crm_sync_enabled: boolean
}

interface CalendarStatus {
  connected: boolean
  email: string | null
}

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({ company_name: '', industry: '', country: 'South Africa', website: '', phone: '' })
  const [crm, setCrm] = useState({ crm_type: 'none', crm_api_key: '', crm_sync_enabled: false })
  const [crmSaving, setCrmSaving] = useState(false)
  const [crmSaved, setCrmSaved] = useState(false)
  const [crmTesting, setCrmTesting] = useState(false)
  const [crmTestResult, setCrmTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [crmSaveError, setCrmSaveError] = useState<string | null>(null)
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null)
  const [whatsappStatus, setWhatsappStatus] = useState<{ configured: boolean } | null>(null)
  const [vapiStatus, setVapiStatus] = useState<{ configured: boolean } | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await api.get<{ data: ClientData }>('/clients/me', session.access_token)
        const c = res.data
        setForm({ company_name: c.company_name || '', industry: c.industry || '', country: c.country || 'South Africa', website: c.website || '', phone: c.phone || '' })
        setCrm({ crm_type: c.crm_type || 'none', crm_api_key: c.crm_api_key || '', crm_sync_enabled: c.crm_sync_enabled ?? false })
      } catch { setSaveError('Failed to load your profile. Please refresh.') }

      // Integration statuses — graceful, these endpoints may not be configured
      try {
        const cal = await api.get<CalendarStatus>('/calendar/status', session.access_token)
        setCalendarStatus(cal)
      } catch {
        setCalendarStatus({ connected: false, email: null })
      }
      try {
        const wa = await api.get<{ configured: boolean }>('/whatsapp/status', session.access_token)
        setWhatsappStatus(wa)
      } catch {
        setWhatsappStatus({ configured: false })
      }
      try {
        const vapi = await api.get<{ configured: boolean }>('/voice/status', session.access_token)
        setVapiStatus(vapi)
      } catch {
        setVapiStatus({ configured: false })
      }

      setLoading(false)
    }
    load()
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setSaving(false); return }
    try {
      await api.patch('/clients/me', form, session.access_token)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save — please try again.')
    }
    setSaving(false)
  }

  async function handleCrmSave(e: React.FormEvent) {
    e.preventDefault()
    setCrmSaving(true)
    setCrmTestResult(null)
    setCrmSaveError(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { setCrmSaving(false); return }
    try {
      await api.patch('/clients/me', crm, session.access_token)
      setCrmSaved(true)
      setTimeout(() => setCrmSaved(false), 3000)
    } catch (err) {
      setCrmSaveError(err instanceof Error ? err.message : 'Failed to save CRM settings — please try again.')
    }
    setCrmSaving(false)
  }

  async function handleCrmTest() {
    if (crm.crm_type === 'none' || !crm.crm_api_key) return
    setCrmTesting(true)
    setCrmTestResult(null)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return
    try {
      const res = await api.post<{ success: boolean; error?: string }>(
        '/clients/me/crm/test',
        { crm_type: crm.crm_type, crm_api_key: crm.crm_api_key },
        session.access_token,
      )
      setCrmTestResult(res)
    } catch {
      setCrmTestResult({ success: false, error: 'Connection test failed' })
    }
    setCrmTesting(false)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-brand-500" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your business profile and integrations.</p>
      </div>

      {/* Business Profile */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold mb-4">Business Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
              {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
          </div>
          {saved && <p className="text-green-600 text-sm">Saved!</p>}
          {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </form>
      </div>

      {/* Integrations heading */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
        <p className="text-gray-500 text-sm mt-0.5">Connect external tools to supercharge FIGSY.</p>
      </div>

      {/* CRM Integration */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold">CRM Integration</h2>
        </div>
        <p className="text-sm text-gray-400 mb-5">
          When a lead gives consent, they're automatically pushed to your CRM.
        </p>
        <form onSubmit={handleCrmSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
            <select
              value={crm.crm_type}
              onChange={e => setCrm({ ...crm, crm_type: e.target.value, crm_api_key: '', crm_sync_enabled: false })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="none">No CRM — not connected</option>
              <option value="hubspot">HubSpot</option>
              <option value="pipedrive">Pipedrive</option>
            </select>
          </div>

          {crm.crm_type !== 'none' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {crm.crm_type === 'hubspot' ? 'HubSpot Private App Token' : 'Pipedrive API Key'}
                </label>
                <input
                  type="password"
                  value={crm.crm_api_key}
                  onChange={e => { setCrm({ ...crm, crm_api_key: e.target.value }); setCrmTestResult(null) }}
                  placeholder={crm.crm_type === 'hubspot' ? 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'Your Pipedrive API key'}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {crm.crm_type === 'hubspot'
                    ? 'Create a Private App in HubSpot → Settings → Integrations → Private Apps. Scopes needed: crm.objects.contacts.write'
                    : 'Find your API key in Pipedrive → Settings → Personal preferences → API'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleCrmTest}
                  disabled={crmTesting || !crm.crm_api_key}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-sm text-gray-700 rounded-lg transition-colors"
                >
                  {crmTesting ? <span className="flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" />Testing…</span> : 'Test connection'}
                </button>
                {crmTestResult && (
                  <span className={`flex items-center gap-1.5 text-sm font-medium ${crmTestResult.success ? 'text-green-600' : 'text-red-500'}`}>
                    {crmTestResult.success
                      ? <><CheckCircle className="w-4 h-4" /> Connected</>
                      : <><XCircle className="w-4 h-4" /> {crmTestResult.error ?? 'Failed'}</>}
                  </span>
                )}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crm.crm_sync_enabled}
                  onChange={e => setCrm({ ...crm, crm_sync_enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-gray-700">
                  Auto-sync consented leads to {crm.crm_type === 'hubspot' ? 'HubSpot' : 'Pipedrive'}
                </span>
              </label>
            </>
          )}

          {crmSaved && <p className="text-green-600 text-sm">CRM settings saved!</p>}
          {crmSaveError && <p className="text-red-600 text-sm">{crmSaveError}</p>}
          <button
            type="submit"
            disabled={crmSaving}
            className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {crmSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save integration
          </button>
        </form>
      </div>

      {/* Google Calendar */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold">Google Calendar</h2>
          {calendarStatus?.connected && (
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Connected
            </span>
          )}
        </div>
        <p className="text-sm text-gray-400 mb-5">
          When FIGSY gets an interested reply, it can generate a calendar booking link to include in the AI reply suggestion.
        </p>
        {calendarStatus?.connected ? (
          <div className="text-sm text-gray-600">
            Connected as <span className="font-medium">{calendarStatus.email}</span>
          </div>
        ) : (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? 'http://kindapi-production-e64c.up.railway.app'}/calendar/connect`}
            className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            <Calendar className="w-4 h-4" /> Connect Google Calendar
          </a>
        )}
      </div>

      {/* WhatsApp — only show when active */}
      {whatsappStatus?.configured && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold">WhatsApp Business</h2>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            Vida handles inbound WhatsApp messages — qualifying leads, answering questions, and handing warm prospects to your team.
          </p>
          <p className="text-sm text-green-600">WhatsApp Business API is active. Vida is live on WhatsApp.</p>
        </div>
      )}

      {/* Voice (Vapi) — only show when active */}
      {vapiStatus?.configured && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-gray-400" />
            <h2 className="font-semibold">Voice Calls (FIGSY)</h2>
            <span className="ml-auto flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          </div>
          <p className="text-sm text-gray-400 mb-3">
            FIGSY places follow-up calls using Vapi.ai — leaving voicemails, qualifying interest, and booking meetings.
          </p>
          <p className="text-sm text-green-600">Vapi is active. FIGSY will call leads on day 4 of the sequence.</p>
        </div>
      )}
    </div>
  )
}
