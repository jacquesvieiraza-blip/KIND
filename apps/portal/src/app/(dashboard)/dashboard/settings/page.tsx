'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { SUPPORTED_COUNTRIES } from '@kind/shared'
import { Loader2, Save, CheckCircle, XCircle, Link2, Calendar, MessageCircle, Phone, Pencil, Eye, EyeOff, AlertTriangle, Bell, Users } from 'lucide-react'

const NOTIF_STORAGE_KEY = 'kind_notification_prefs_v1'
const DEFAULT_NOTIF_PREFS = {
  reply_received: true,
  low_credits: true,
  campaign_paused: true,
  weekly_digest: true,
  daily_brief: false,
}
type NotifPrefs = typeof DEFAULT_NOTIF_PREFS

function NotificationPreferences({ serverDailyBrief, onDailyBriefToggle }: {
  serverDailyBrief: boolean | null
  onDailyBriefToggle: (next: boolean) => void
}) {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NOTIF_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<NotifPrefs>
        setPrefs(prev => ({ ...prev, ...parsed }))
      }
    } catch { /* ignore */ }
  }, [])

  function toggle(key: keyof NotifPrefs) {
    // R2 (#27): the daily brief drives a real server-side email cron, so it's
    // persisted to the client record rather than localStorage.
    if (key === 'daily_brief') {
      onDailyBriefToggle(!(serverDailyBrief ?? false))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      return
    }
    setPrefs(prev => {
      const next = { ...prev, [key]: !prev[key] }
      try { localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  // The daily-brief toggle reflects the server value; the rest are local.
  const effective: NotifPrefs = { ...prefs, daily_brief: serverDailyBrief ?? false }

  const items: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    { key: 'reply_received',  label: 'Reply received',      desc: 'When a lead replies to a FIGSY sequence.' },
    { key: 'low_credits',     label: 'Low credits warning', desc: 'When credit balance drops below 10.' },
    { key: 'campaign_paused', label: 'Campaign paused',     desc: 'When a campaign is auto-paused due to low performance.' },
    { key: 'weekly_digest',   label: 'Weekly digest',       desc: 'Summary of outreach results every Monday.' },
    { key: 'daily_brief',     label: 'Daily brief',         desc: 'Morning update on active campaigns and replies.' },
  ]

  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">Notification Preferences</h2>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
      <p className="text-sm text-[#9B8EC4] mb-4">Choose which notifications you receive from K.I.N.D.</p>
      <div className="space-y-3">
        {items.map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{label}</p>
              <p className="text-xs text-[#9B8EC4]">{desc}</p>
            </div>
            <button
              onClick={() => toggle(key)}
              aria-label={`Toggle ${label}`}
              className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 ${
                effective[key] ? 'bg-[#7C3AED]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
                  effective[key] ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

const FIGSY_APPROVE_STORAGE_KEY = 'kind_approve_before_send'

function FigsyOutreachSettings() {
  const [approveBeforeSend, setApproveBeforeSend] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FIGSY_APPROVE_STORAGE_KEY)
      if (raw !== null) setApproveBeforeSend(raw === 'true')
    } catch { /* ignore */ }
  }, [])

  function toggle() {
    setApproveBeforeSend(prev => {
      const next = !prev
      try { localStorage.setItem(FIGSY_APPROVE_STORAGE_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">FIGSY — Outreach Control</h2>
        </div>
        {saved && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" /> Saved
          </span>
        )}
      </div>
      <p className="text-sm text-[#9B8EC4] mb-4">Control how FIGSY sends outbound emails on your behalf.</p>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">Approve emails before sending</p>
          <p className="text-xs text-[#9B8EC4]">
            Review every outbound email before FIGSY sends it. Emails queue here for your approval — nothing goes out without you.
          </p>
        </div>
        <button
          onClick={toggle}
          aria-label="Toggle approve before send"
          className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 ${
            approveBeforeSend ? 'bg-[#7C3AED]' : 'bg-gray-200'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 mt-0.5 ${
              approveBeforeSend ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  )
}

// R12 (#83) — Embeddable lead-capture form. Shows a copy-paste snippet that
// posts to the public /forms/:clientId/submit endpoint → a scored pipeline lead.
function LeadCaptureFormSection({ clientId }: { clientId: string }) {
  const [copied, setCopied] = useState(false)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

  const snippet = `<!-- K.I.N.D lead-capture form -->
<form id="kind-lead-form" style="max-width:380px;font-family:sans-serif;display:flex;flex-direction:column;gap:10px">
  <input name="name" placeholder="Your name" style="padding:10px;border:1px solid #ddd;border-radius:8px" />
  <input name="email" type="email" required placeholder="Email" style="padding:10px;border:1px solid #ddd;border-radius:8px" />
  <input name="company" placeholder="Company" style="padding:10px;border:1px solid #ddd;border-radius:8px" />
  <textarea name="message" placeholder="How can we help?" style="padding:10px;border:1px solid #ddd;border-radius:8px"></textarea>
  <input name="_hp" style="display:none" tabindex="-1" autocomplete="off" />
  <button type="submit" style="padding:11px;background:#7C3AED;color:#fff;border:0;border-radius:8px;font-weight:600;cursor:pointer">Send</button>
  <p id="kind-form-msg" style="font-size:13px;margin:0"></p>
</form>
<script>
(function(){
  var f=document.getElementById('kind-lead-form'),m=document.getElementById('kind-form-msg');
  f.addEventListener('submit',function(e){
    e.preventDefault();
    var d={};new FormData(f).forEach(function(v,k){d[k]=v;});
    m.textContent='Sending…';
    fetch('${apiUrl}/forms/${clientId}/submit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(d)})
      .then(function(r){return r.json();})
      .then(function(r){m.style.color=r.success?'#16a34a':'#dc2626';m.textContent=r.success?'Thanks — we\\'ll be in touch!':(r.error||'Something went wrong.');if(r.success)f.reset();})
      .catch(function(){m.style.color='#dc2626';m.textContent='Network error — please try again.';});
  });
})();
</script>`

  return (
    <div className="border-t border-gray-100 pt-6">
      <div className="flex items-center gap-2 mb-1">
        <Link2 className="w-4 h-4 text-[#9B8EC4]" />
        <h2 className="font-semibold">Lead-Capture Form</h2>
      </div>
      <p className="text-sm text-[#9B8EC4] mb-4">
        Paste this into your website. Every submission becomes a scored lead in your pipeline (source: web form) — deduped by email, spam-protected with a honeypot.
      </p>
      <div className="relative">
        <pre className="text-xs bg-[#1E1B2E] text-gray-200 rounded-lg p-4 overflow-x-auto max-h-64 leading-relaxed"><code>{snippet}</code></pre>
        <button
          onClick={() => { navigator.clipboard.writeText(snippet).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500) }) }}
          className="absolute top-2 right-2 flex items-center gap-1.5 text-xs font-semibold bg-white/10 hover:bg-white/20 text-white rounded-lg px-2.5 py-1.5 transition-colors"
        >
          {copied ? <><CheckCircle className="w-3.5 h-3.5" /> Copied</> : 'Copy'}
        </button>
      </div>
    </div>
  )
}

function TeamSection({ clientId, userRole }: { clientId: string; userRole: string }) {
  const [members, setMembers] = useState<{id:string;email:string;role:string;accepted_at:string|null}[]>([])
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('member')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

  useEffect(() => {
    fetch(`${apiUrl}/team/members?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : []).then(d => setMembers(Array.isArray(d) ? d : [])).catch(() => setMembers([]))
  }, [clientId])

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await fetch(`${apiUrl}/team/invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, email, role }),
    })
    setSending(false)
    setSent(true)
    setEmail('')
    // Refresh list
    fetch(`${apiUrl}/team/members?client_id=${clientId}`)
      .then(r => r.ok ? r.json() : []).then(d => setMembers(Array.isArray(d) ? d : [])).catch(() => setMembers([]))
    setTimeout(() => setSent(false), 3000)
  }

  const canInvite = userRole === 'owner' || userRole === 'admin'

  return (
    <div className="bg-white rounded-2xl border border-purple-100 shadow-sm p-6">
      <div className="flex items-center gap-2 mb-1">
        <Users className="w-4 h-4 text-[#9B8EC4]" />
        <h2 className="text-base font-semibold text-gray-900">Team</h2>
      </div>
      <p className="text-sm text-gray-500 mb-4">Invite teammates to access this workspace.</p>

      {/* Member list */}
      <div className="space-y-2 mb-5">
        {members.map(m => (
          <div key={m.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-medium text-gray-800">{m.email}</p>
              <p className="text-xs text-gray-400">{m.accepted_at ? 'Active' : 'Invited — pending'}</p>
            </div>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              m.role === 'owner' ? 'bg-purple-100 text-purple-700' :
              m.role === 'admin' ? 'bg-blue-100 text-blue-700' :
              m.role === 'viewer' ? 'bg-gray-100 text-gray-600' :
              'bg-green-100 text-green-700'
            }`}>{m.role}</span>
          </div>
        ))}
        {members.length === 0 && <p className="text-sm text-gray-400 italic">No team members yet.</p>}
      </div>

      {/* Invite form */}
      {canInvite && (
        <form onSubmit={invite} className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="teammate@company.com"
            required
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-purple-100 bg-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="px-2 py-2 text-sm rounded-xl border border-purple-100 bg-white focus:outline-none"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
          </select>
          <button
            type="submit"
            disabled={sending}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#7C3AED] text-white hover:bg-[#6D28D9] disabled:opacity-50 transition-colors"
          >
            {sent ? 'Sent!' : sending ? '…' : 'Invite'}
          </button>
        </form>
      )}
    </div>
  )
}

interface ClientData {
  company_name: string
  industry: string
  country: string
  website: string
  phone: string
  company_registration: string
  vat_number: string
  crm_type: string
  crm_api_key: string
  crm_sync_enabled: boolean
  crm_dedup_enabled: boolean
  leads_per_run: number
  daily_drip_rate: number
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
  const [form, setForm] = useState({ company_name: '', industry: '', country: 'South Africa', website: '', phone: '', company_registration: '', vat_number: '', leads_per_run: 20, daily_drip_rate: 5 })
  const [crm, setCrm] = useState({ crm_type: 'none', crm_api_key: '', crm_sync_enabled: false, crm_dedup_enabled: false })
  const [crmSaving, setCrmSaving] = useState(false)
  const [crmSaved, setCrmSaved] = useState(false)
  const [crmTesting, setCrmTesting] = useState(false)
  const [crmTestResult, setCrmTestResult] = useState<{ success: boolean; error?: string } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [crmSaveError, setCrmSaveError] = useState<string | null>(null)
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null)
  const [whatsappStatus, setWhatsappStatus] = useState<{ configured: boolean } | null>(null)
  const [vapiStatus, setVapiStatus] = useState<{ configured: boolean } | null>(null)
  const [writingStyle, setWritingStyle]             = useState('')
  const [writingStyleSaving, setWritingStyleSaving] = useState(false)
  const [writingStyleSaved, setWritingStyleSaved]   = useState(false)
  const [writingStyleError, setWritingStyleError]   = useState<string | null>(null)
  const [signerName, setSignerName]                 = useState('')
  const [signerSaving, setSignerSaving]             = useState(false)
  const [signerSaved, setSignerSaved]               = useState(false)
  const [signerError, setSignerError]               = useState<string | null>(null)
  const [bookingUrl, setBookingUrl]                 = useState('')
  const [bookingSaving, setBookingSaving]           = useState(false)
  const [bookingSaved, setBookingSaved]             = useState(false)
  const [bookingError, setBookingError]             = useState<string | null>(null)
  const [showCrmKey, setShowCrmKey]                 = useState(false)
  const [unsavedProfile, setUnsavedProfile]         = useState(false)
  const [unsavedCrm, setUnsavedCrm]                 = useState(false)
  const [clientId, setClientId]                     = useState<string | null>(null)
  const [userRole, setUserRole]                     = useState<string>('owner')
  const [dailyBriefEnabled, setDailyBriefEnabled]   = useState<boolean | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await api.get<{ data: ClientData & { id: string } }>('/clients/me', session.access_token)
        const c = res.data
        setForm({ company_name: c.company_name || '', industry: c.industry || '', country: c.country || 'South Africa', website: c.website || '', phone: c.phone || '', company_registration: c.company_registration || '', vat_number: c.vat_number || '', leads_per_run: c.leads_per_run ?? 20, daily_drip_rate: c.daily_drip_rate ?? 5 })
        setCrm({ crm_type: c.crm_type || 'none', crm_api_key: c.crm_api_key || '', crm_sync_enabled: c.crm_sync_enabled ?? false, crm_dedup_enabled: c.crm_dedup_enabled ?? false })
        setSignerName((c as { signer_name?: string | null }).signer_name || '')
        setBookingUrl((c as { booking_url?: string | null }).booking_url || '')
        // R2 (#27): daily-brief opt-in is server-backed (defaults TRUE).
        setDailyBriefEnabled((c as { daily_brief_enabled?: boolean | null }).daily_brief_enabled ?? true)
        if (c.id) {
          setClientId(c.id)
          // Fetch the user's role in this team
          const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'
          fetch(`${apiUrl}/team/members?client_id=${c.id}`)
            .then(r => r.ok ? r.json() : Promise.resolve([]))
            .then((members: { email: string; role: string }[]) => {
              const me = members.find(m => m.email === session.user.email)
              if (me) setUserRole(me.role)
            })
            .catch(() => {})
        }
      } catch (e: any) {
        // Partner accounts may not have a client row — treat as empty profile, not an error
        if (e?.status !== 404) setSaveError('Failed to load your profile. Please refresh.')
      }

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

      // Load writing style from localStorage
      const savedStyle = localStorage.getItem('kind_writing_style')
      if (savedStyle) setWritingStyle(savedStyle)

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
      setUnsavedProfile(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save — please try again.')
    }
    setSaving(false)
  }

  async function handleSaveWritingStyle() {
    setWritingStyleSaving(true)
    setWritingStyleError(null)
    try {
      localStorage.setItem('kind_writing_style', writingStyle)
      setWritingStyleSaved(true)
      setTimeout(() => setWritingStyleSaved(false), 3000)
    } catch {
      setWritingStyleError('Failed to save — please try again.')
    }
    setWritingStyleSaving(false)
  }

  async function handleSaveSigner() {
    setSignerSaving(true)
    setSignerError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setSignerSaving(false); return }
      await api.patch('/clients/me', { signer_name: signerName.trim() }, session.access_token)
      setSignerSaved(true)
      setTimeout(() => setSignerSaved(false), 3000)
    } catch (err) {
      setSignerError(err instanceof Error ? err.message : 'Failed to save — please try again.')
    }
    setSignerSaving(false)
  }

  async function handleSaveBooking() {
    setBookingSaving(true)
    setBookingError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setBookingSaving(false); return }
      await api.patch('/clients/me', { booking_url: bookingUrl.trim() }, session.access_token)
      setBookingSaved(true)
      setTimeout(() => setBookingSaved(false), 3000)
    } catch (err) {
      setBookingError(err instanceof Error ? err.message : 'Failed to save — check it\'s a valid URL.')
    }
    setBookingSaving(false)
  }

  async function handleDailyBriefToggle(next: boolean) {
    const prev = dailyBriefEnabled
    setDailyBriefEnabled(next)   // optimistic
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setDailyBriefEnabled(prev); return }
      await api.patch('/clients/me', { daily_brief_enabled: next }, session.access_token)
    } catch {
      setDailyBriefEnabled(prev)  // revert on failure
    }
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
      setUnsavedCrm(false)
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

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" /></div>

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-[#7B6FA0] text-sm mt-1">Manage your business profile and integrations.</p>
      </div>

      {(unsavedProfile || unsavedCrm) && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-700">You have unsaved changes — scroll down and click Save before leaving this page.</p>
        </div>
      )}

      {/* Business Profile */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="font-semibold mb-4">Business Profile</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
            <input type="text" value={form.company_name} onChange={(e) => { setForm({ ...form, company_name: e.target.value }); setUnsavedProfile(true) }}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
            <input type="text" value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
            <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]">
              {SUPPORTED_COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Registration No.</label>
              <input type="text" value={form.company_registration} onChange={(e) => setForm({ ...form, company_registration: e.target.value })}
                placeholder="e.g. 2023/123456/07"
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">VAT Number <span className="text-[#9B8EC4] font-normal">(optional)</span></label>
              <input type="text" value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })}
                placeholder="e.g. 4123456789"
                className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]" />
            </div>
          </div>
          {saved && <p className="text-green-600 text-sm">Saved!</p>}
          {saveError && <p className="text-red-600 text-sm">{saveError}</p>}
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save changes
          </button>
        </form>
      </div>

      {/* Lead Delivery Settings */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-0.5">Lead Delivery</h2>
        <p className="text-gray-500 text-sm mt-0.5 mb-5">Control how many leads you receive and how fast they arrive.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Leads per ICP run <span className="text-gray-400 font-normal">(max)</span></label>
            <input
              type="number" min={1} max={100}
              value={form.leads_per_run ?? 20}
              onChange={(e) => setForm({ ...form, leads_per_run: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">Maximum leads found per ICP run. Must have enough credits.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Daily lead delivery rate</label>
            <input
              type="number" min={1} max={50}
              value={form.daily_drip_rate ?? 5}
              onChange={(e) => setForm({ ...form, daily_drip_rate: Number(e.target.value) })}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <p className="text-xs text-gray-400 mt-1">How many leads are revealed in your dashboard each day.</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">Changes take effect on the next ICP run and daily delivery.</p>
      </div>

      {/* Integrations heading */}
      <div className="border-t border-gray-100 pt-6">
        <h2 className="text-lg font-semibold text-gray-900">Integrations</h2>
        <p className="text-[#7B6FA0] text-sm mt-0.5">Connect external tools to supercharge FIGSY.</p>
      </div>

      {/* Lead-Capture Form — R12 */}
      {clientId && <LeadCaptureFormSection clientId={clientId} />}

      {/* Writing Style — W14 */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Pencil className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">FIGSY Writing Style</h2>
        </div>
        <p className="text-sm text-[#9B8EC4] mb-4">
          Paste 2–3 of your best-performing cold emails below. FIGSY will match your tone and style when generating sequences.
        </p>

        {/* Sign emails as — the name every cold email signs off with */}
        <div className="mb-5 p-4 bg-[#faf9ff] border border-purple-100/80 rounded-lg">
          <label className="block text-sm font-medium text-gray-900 mb-1">Sign emails as</label>
          <p className="text-xs text-[#9B8EC4] mb-2.5">The name every prospect sees at the bottom of your emails. Leave blank and FIGSY picks one.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={signerName}
              onChange={e => setSignerName(e.target.value)}
              maxLength={120}
              placeholder="e.g. Jack from K.I.N.D"
              className="flex-1 border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
            <button
              type="button"
              disabled={signerSaving}
              onClick={handleSaveSigner}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60 shrink-0"
            >
              {signerSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          {signerSaved && <p className="text-green-600 text-xs font-medium mt-2">✓ Saved — every email now signs off as “{signerName.trim() || 'FIGSY'}”</p>}
          {signerError && <p className="text-red-600 text-xs mt-2">{signerError}</p>}
        </div>

        <div className="space-y-3">
          <textarea
            value={writingStyle}
            onChange={e => setWritingStyle(e.target.value)}
            rows={8}
            placeholder={`Paste your best emails here. Example:\n\nSubject: quick question\n\nHi Sarah,\n\nI noticed Acme recently expanded into fintech — we work with companies at exactly that inflection point...\n\n---\n\nPaste another email below`}
            className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none font-mono text-xs leading-relaxed"
          />
          {writingStyleSaved && <p className="text-green-600 text-xs font-medium">✓ Style saved — FIGSY will use this for your next sequence</p>}
          {writingStyleError && <p className="text-red-600 text-xs">{writingStyleError}</p>}
          <button
            type="button"
            disabled={writingStyleSaving}
            onClick={handleSaveWritingStyle}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60"
          >
            {writingStyleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save writing style
          </button>
        </div>
      </div>

      {/* CRM Integration */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Link2 className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">CRM Integration</h2>
        </div>
        <p className="text-sm text-[#9B8EC4] mb-5">
          When a lead gives consent, they're automatically pushed to your CRM.
        </p>
        <form onSubmit={handleCrmSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CRM</label>
            <select
              value={crm.crm_type}
              onChange={e => setCrm({ ...crm, crm_type: e.target.value, crm_api_key: '', crm_sync_enabled: false })}
              className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
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
                <div className="relative">
                  <input
                    type={showCrmKey ? 'text' : 'password'}
                    value={crm.crm_api_key}
                    onChange={e => { setCrm({ ...crm, crm_api_key: e.target.value }); setCrmTestResult(null); setUnsavedCrm(true) }}
                    placeholder={crm.crm_type === 'hubspot' ? 'pat-na1-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx' : 'Your Pipedrive API key'}
                    className="w-full border border-purple-100/80 rounded-lg px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] font-mono"
                  />
                  <button type="button" onClick={() => setShowCrmKey(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                    {showCrmKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-[#9B8EC4] mt-1">
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
                  className="px-4 py-2 border border-purple-100/80 hover:bg-gray-50 disabled:opacity-50 text-sm text-gray-700 rounded-lg transition-colors"
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
                  className="w-4 h-4 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                />
                <span className="text-sm text-gray-700">
                  Auto-sync consented leads to {crm.crm_type === 'hubspot' ? 'HubSpot' : 'Pipedrive'}
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={crm.crm_dedup_enabled}
                  onChange={e => setCrm({ ...crm, crm_dedup_enabled: e.target.checked })}
                  className="w-4 h-4 mt-0.5 rounded border-gray-300 text-[#7C3AED] focus:ring-[#7C3AED]"
                />
                <span className="text-sm text-gray-700">
                  Never contact people already in my {crm.crm_type === 'hubspot' ? 'HubSpot' : 'Pipedrive'}
                  <span className="block text-xs text-[#9B8EC4] mt-0.5">
                    Before FIGSY reaches out, we check your CRM. Existing contacts (or companies already in your account) are skipped — so we never cold-email your customers, and you don&apos;t spend credits on people you already know.
                  </span>
                </span>
              </label>
            </>
          )}

          {crmSaved && <p className="text-green-600 text-sm">CRM settings saved!</p>}
          {crmSaveError && <p className="text-red-600 text-sm">{crmSaveError}</p>}
          <button
            type="submit"
            disabled={crmSaving}
            className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors disabled:opacity-60"
          >
            {crmSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save integration
          </button>
        </form>
      </div>

      {/* Google Calendar */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-[#9B8EC4]" />
          <h2 className="font-semibold">Google Calendar</h2>
          {calendarStatus?.connected && (
            <span className="ml-2 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Connected
            </span>
          )}
        </div>
        <p className="text-sm text-[#9B8EC4] mb-5">
          When FIGSY gets an interested reply, it can generate a calendar booking link to include in the AI reply suggestion.
        </p>
        {calendarStatus?.connected ? (
          <div className="text-sm text-gray-600">
            Connected as <span className="font-medium">{calendarStatus.email}</span>
          </div>
        ) : (
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? 'https://kindapi-production-e64c.up.railway.app'}/calendar/connect`}
            className="inline-flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-5 py-2.5 text-sm transition-colors"
          >
            <Calendar className="w-4 h-4" /> Connect Google Calendar
          </a>
        )}

        {/* Booking link — for clients who don't use Google Calendar (Calendly, etc.) */}
        <div className="mt-5 pt-5 border-t border-gray-100">
          <label className="block text-sm font-medium text-gray-900 mb-1">Or paste a booking link</label>
          <p className="text-xs text-[#9B8EC4] mb-2.5">Using Calendly, Cal.com, or another scheduler? Paste it here and FIGSY will share this link instead.</p>
          <div className="flex gap-2">
            <input
              type="url"
              value={bookingUrl}
              onChange={e => setBookingUrl(e.target.value)}
              placeholder="https://calendly.com/your-name/30min"
              className="flex-1 border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            />
            <button
              type="button"
              disabled={bookingSaving}
              onClick={handleSaveBooking}
              className="flex items-center gap-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors disabled:opacity-60 shrink-0"
            >
              {bookingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
          {bookingSaved && <p className="text-green-600 text-xs font-medium mt-2">✓ Booking link saved</p>}
          {bookingError && <p className="text-red-600 text-xs mt-2">{bookingError}</p>}
        </div>
      </div>

      {/* WhatsApp — only show when active */}
      {whatsappStatus?.configured && (
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="w-4 h-4 text-[#9B8EC4]" />
            <h2 className="font-semibold">WhatsApp Business</h2>
            <span className="ml-2 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          </div>
          <p className="text-sm text-[#9B8EC4] mb-3">
            Vida handles inbound WhatsApp messages — qualifying leads, answering questions, and handing warm prospects to your team.
          </p>
          <p className="text-sm text-green-600">WhatsApp Business API is active. Vida is live on WhatsApp.</p>
        </div>
      )}

      {/* Voice (Vapi) — only show when active */}
      {vapiStatus?.configured && (
        <div className="border-t border-gray-100 pt-6">
          <div className="flex items-center gap-2 mb-1">
            <Phone className="w-4 h-4 text-[#9B8EC4]" />
            <h2 className="font-semibold">Voice Calls (FIGSY)</h2>
            <span className="ml-2 flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
              <CheckCircle className="w-3 h-3" /> Active
            </span>
          </div>
          <p className="text-sm text-[#9B8EC4] mb-3">
            FIGSY places follow-up calls using Vapi.ai — leaving voicemails, qualifying interest, and booking meetings.
          </p>
          <p className="text-sm text-green-600">Vapi is connected. Voice calls are available on demand — automatic in-sequence calling isn&apos;t enabled yet.</p>
        </div>
      )}

      {/* FIGSY — Outreach Control */}
      <FigsyOutreachSettings />

      {/* Notification Preferences */}
      <NotificationPreferences serverDailyBrief={dailyBriefEnabled} onDailyBriefToggle={handleDailyBriefToggle} />

      {/* P2-12 — White-label / Agency Mode */}
      <div className="border-t border-gray-100 pt-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">🏷️</span>
          <h2 className="font-semibold">White-Label & Agency</h2>
          <span className="ml-2 text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
            Scale plan
          </span>
        </div>
        <p className="text-sm text-[#9B8EC4] mb-4">
          Run K.I.N.D under your own brand. Onboard your clients with your logo and domain — powered by KIND underneath.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '🎨', title: 'Custom branding', desc: 'Your logo, brand colours, and domain on every portal' },
            { icon: '👥', title: 'Sub-client management', desc: 'Create and manage portals for each of your clients' },
            { icon: '💰', title: 'Revenue share', desc: '30% recurring on every client you onboard' },
            { icon: '📦', title: 'White-label kit', desc: 'Pre-built sales deck, pricing template, and onboarding guide' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 p-4 rounded-xl border border-purple-50 bg-purple-50/30">
              <span className="text-xl shrink-0">{item.icon}</span>
              <div>
                <p className="text-sm font-semibold text-gray-900">{item.title}</p>
                <p className="text-xs text-[#9B8EC4] mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-[#9B8EC4] mt-3">
          Interested in the agency tier? Email <span className="text-[#7C3AED]">hello@get-kind.com</span> with subject "Agency partnership".
        </p>
      </div>

      {/* Team */}
      {clientId && (
        <div className="border-t border-gray-100 pt-6" id="team">
          <TeamSection clientId={clientId} userRole={userRole} />
        </div>
      )}
    </div>
  )
}
