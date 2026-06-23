'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Zap, Mail, Clock, ChevronRight, Edit3,
  Save, Loader2, Plus, Trash2, Check, Sparkles,
  Settings2, Users, AlertTriangle, Play, Pause,
  GitBranch, MoreHorizontal, Copy, FlaskConical, Trophy,
} from 'lucide-react'
import Link from 'next/link'

// ── Email Score Badge (P0-8) ──────────────────────────────────────────────────
interface EmailScore { score: number; issues: string[]; suggestions: string[] }

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null
  const cls = score >= 80 ? 'bg-green-100 text-green-700 border-green-200'
    : score >= 50 ? 'bg-amber-100 text-amber-700 border-amber-200'
    : 'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {score}/100
    </span>
  )
}

// A/B subject testing (item 97 backend). Variant A = the AI-generated step1_subject;
// B–E are operator-authored overrides stored in settings. The daily winner-check cron
// writes ab_test_resolved + ab_test_winner once it has enough sends per variant.
interface CampaignSettings {
  ab_subject_b?: string | null
  ab_subject_c?: string | null
  ab_subject_d?: string | null
  ab_subject_e?: string | null
  ab_test_resolved?: boolean
  ab_test_winner?: 'a' | 'b' | 'c' | 'd' | 'e'
  review_required?: boolean
}

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived'
  leads_enrolled: number
  emails_sent: number
  replies_total: number
  replies_interested: number
  opted_out: number
  created_at: string
  step1_subject?: string | null
  settings?: CampaignSettings | null
}

interface SequenceStep {
  step: number
  label: string
  delay_days: number
  subject_hint: string
  body_hint: string
  channel: 'email' | 'linkedin' | 'sms'
  condition?: 'no_reply' | 'opened' | 'clicked' | 'always'
  promptOverride?: string
  on_reply: 'stop' | 'skip_next' | 'continue'
}

const DEFAULT_STEPS: SequenceStep[] = [
  {
    step: 1,
    label: 'First touch',
    delay_days: 0,
    channel: 'email',
    subject_hint: 'Personalised opening — reference their company or role',
    body_hint: 'Introduce yourself, state your value prop clearly, end with a soft CTA. Under 80 words.',
    condition: undefined,
    on_reply: 'stop',
  },
  {
    step: 2,
    label: 'Follow-up',
    delay_days: 4,
    channel: 'email',
    subject_hint: 'Re: original subject or new angle',
    body_hint: 'Reference the first email briefly. Add one new value point or social proof. Under 60 words.',
    condition: 'no_reply',
    on_reply: 'stop',
  },
  {
    step: 3,
    label: 'Final touch',
    delay_days: 9,
    channel: 'email',
    subject_hint: 'Breakup email',
    body_hint: 'Acknowledge they may be busy. Leave the door open. Under 50 words.',
    condition: 'no_reply',
    on_reply: 'stop',
  },
]

const CHANNEL_META = {
  email:    { label: 'Email',    color: 'bg-blue-100 text-[#6D28D9]',   dot: 'bg-[#7C3AED]' },
  linkedin: { label: 'LinkedIn', color: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  sms:      { label: 'SMS',     color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
}

const CONDITION_LABEL: Record<string, string> = {
  no_reply: 'If no reply',
  opened:   'If email opened',
  clicked:  'If link clicked',
  always:   'Always (regardless of opens)',
}

const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-[#6D28D9]',
  archived:  'bg-gray-100 text-[#9B8EC4]',
}

function StepCard({
  step,
  index,
  onUpdate,
  onDelete,
  token,
}: {
  step: SequenceStep
  index: number
  onUpdate: (s: SequenceStep) => void
  onDelete: () => void
  token: string
}) {
  const [expanded, setExpanded] = useState(index === 0)
  const [editingPrompt, setEditingPrompt] = useState(false)
  const [emailScore, setEmailScore] = useState<EmailScore | null>(null)
  const [scoring, setScoring] = useState(false)
  const channelMeta = CHANNEL_META[step.channel]

  const scoreEmail = useCallback(async () => {
    if (!token || !step.subject_hint || !step.body_hint) return
    setScoring(true)
    try {
      const res = await api.post<{ data: EmailScore }>('/figsy/score-email', {
        subject: step.subject_hint,
        body: step.body_hint,
      }, token)
      setEmailScore(res.data)
    } catch { /* silently ignore */ }
    setScoring(false)
  }, [token, step.subject_hint, step.body_hint])

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 shadow-sm overflow-hidden">
      {/* Step header */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        {/* Step number badge */}
        <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0 shadow-md shadow-purple-200">
          <span className="text-white font-bold text-sm">{step.step}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900 text-sm">{step.label}</span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${channelMeta.color}`}>
              {channelMeta.label}
            </span>
            {step.condition && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                {CONDITION_LABEL[step.condition]}
              </span>
            )}
          </div>
          <p className="text-xs text-[#9B8EC4] mt-0.5">
            {step.delay_days === 0 ? 'Sends immediately' : `Sends on Day ${step.delay_days}`}
            {step.promptOverride ? ' · Custom prompt' : ' · FIGSY default'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {scoring ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#9B8EC4]" />
          ) : (
            <ScoreBadge score={emailScore?.score ?? null} />
          )}
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
            title="Remove step"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <ChevronRight className={`w-4 h-4 text-gray-300 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Step body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Channel */}
            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Channel</label>
              <select
                value={step.channel}
                onChange={e => onUpdate({ ...step, channel: e.target.value as SequenceStep['channel'] })}
                className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
              >
                <option value="email">📧 Email</option>
                <option value="linkedin" disabled>💼 LinkedIn (coming soon)</option>
                <option value="sms" disabled>📱 SMS (coming soon)</option>
              </select>
            </div>
            {/* Delay */}
            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">
                Send on day
              </label>
              <input
                type="number"
                min={0}
                max={90}
                value={step.delay_days}
                onChange={e => onUpdate({ ...step, delay_days: parseInt(e.target.value) || 0 })}
                className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>

          {/* Condition */}
          {index > 0 && (
            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Send condition</label>
              <select
                value={step.condition ?? 'no_reply'}
                onChange={e => onUpdate({ ...step, condition: e.target.value as SequenceStep['condition'] })}
                className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
              >
                <option value="no_reply">If no reply to previous step</option>
                <option value="opened">If previous email was opened</option>
                <option value="clicked">If link was clicked</option>
                <option value="always">Always (regardless of opens)</option>
              </select>
            </div>
          )}

          {/* On reply */}
          <div>
            <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">When prospect replies to this step</label>
            <select
              value={step.on_reply}
              onChange={e => onUpdate({ ...step, on_reply: e.target.value as SequenceStep['on_reply'] })}
              className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 bg-white"
            >
              <option value="stop">Stop sequence — reply received ✓</option>
              <option value="skip_next">Skip next step, continue later</option>
              <option value="continue">Keep sending next steps</option>
            </select>
          </div>

          {/* Hints */}
          <div className="space-y-2">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-[#7B6FA0]">Subject guidance</label>
                {emailScore && <ScoreBadge score={emailScore.score} />}
              </div>
              <input
                value={step.subject_hint}
                onChange={e => onUpdate({ ...step, subject_hint: e.target.value })}
                onBlur={scoreEmail}
                className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200"
                placeholder="What should the subject line achieve?"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1">Body guidance</label>
              <textarea
                value={step.body_hint}
                onChange={e => onUpdate({ ...step, body_hint: e.target.value })}
                onBlur={scoreEmail}
                rows={2}
                className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-none"
                placeholder="What should the body achieve? Tone, length, CTA?"
              />
            </div>
            {/* Score issues */}
            {emailScore && emailScore.issues.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {emailScore.issues.map(issue => (
                  <span key={issue} className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
                    {issue}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Prompt override */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-[#7B6FA0]">Custom prompt override</label>
              <button
                onClick={() => setEditingPrompt(e => !e)}
                className="text-xs text-[#7C3AED] hover:underline"
              >
                {editingPrompt ? 'Done' : 'Edit prompt'}
              </button>
            </div>
            {editingPrompt ? (
              <textarea
                value={step.promptOverride ?? ''}
                onChange={e => onUpdate({ ...step, promptOverride: e.target.value || undefined })}
                rows={4}
                placeholder="Leave blank to use FIGSY default. Override here to control exactly how this step is written…"
                className="w-full text-sm border border-purple-100/80 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-200 resize-y"
              />
            ) : (
              <p className="text-xs text-[#9B8EC4] bg-[#F5EEFF]/60 rounded-lg px-3 py-2">
                {step.promptOverride ? `"${step.promptOverride.slice(0, 80)}…"` : 'Using FIGSY default prompt — click Edit prompt to override'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CampaignDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const supabase = createClient()
  const id = params.id as string

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading]   = useState(true)
  const [steps, setSteps]       = useState<SequenceStep[]>(DEFAULT_STEPS)
  const [saving, setSaving]     = useState(false)
  const [saved, setSaved]       = useState(false)
  const [token, setToken]       = useState('')
  const [activatingId, setActivatingId] = useState(false)
  const [sendingTest, setSendingTest]   = useState(false)
  const [sendingNow, setSendingNow]     = useState(false)
  const [enrolling, setEnrolling]       = useState(false)
  const [activeTab, setActiveTab] = useState<'sequence' | 'audience' | 'abtest' | 'settings'>('sequence')

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Audience controlled state
  const [minScore, setMinScore]     = useState(50)
  const [maxScore, setMaxScore]     = useState(100)
  const [dailyLimit, setDailyLimit] = useState(5)
  const [savingAudience, setSavingAudience] = useState(false)

  // Settings controlled state
  const [campaignName, setCampaignName] = useState('')
  const [copilotMode, setCopilotMode] = useState(false)
  const [modelPref, setModelPref] = useState<'haiku' | 'sonnet'>('haiku')   // R18 multi-model
  const [savingSettings, setSavingSettings] = useState(false)
  const [archiving, setArchiving]           = useState(false)

  // A/B subject-line testing (item 97). Variant A is read-only (the AI's step1_subject);
  // B–E are operator overrides. Empty string = unset (sent as null to the backend).
  const [variantA, setVariantA] = useState('')
  const [abVariants, setAbVariants] = useState({ b: '', c: '', d: '', e: '' })
  const [abResolved, setAbResolved] = useState(false)
  const [abWinner, setAbWinner] = useState<'a' | 'b' | 'c' | 'd' | 'e' | null>(null)
  const [savingAb, setSavingAb] = useState(false)

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3500)
  }

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: Campaign }>(`/figsy/campaigns/${id}`, session.access_token)
        setCampaign(res.data)
        setCampaignName(res.data.name)
        // Initialize audience sliders from campaign if fields exist
        const c = res.data as Campaign & { min_score?: number; max_score?: number; daily_limit?: number; model_preference?: 'haiku' | 'sonnet' | null }
        setMinScore(c.min_score ?? 50)
        setMaxScore(c.max_score ?? 100)
        setDailyLimit(c.daily_limit ?? 5)
        setCopilotMode(c.settings?.review_required ?? false)
        setModelPref(c.model_preference ?? 'haiku')
        // A/B subject testing (item 97)
        const s = c.settings ?? {}
        setVariantA(c.step1_subject ?? '')
        setAbVariants({
          b: s.ab_subject_b ?? '',
          c: s.ab_subject_c ?? '',
          d: s.ab_subject_d ?? '',
          e: s.ab_subject_e ?? '',
        })
        setAbResolved(s.ab_test_resolved ?? false)
        setAbWinner(s.ab_test_winner ?? null)
      } catch {
        // campaign not found — go back
      }
      setLoading(false)
    }
    load()
  }, [id])

  function updateStep(index: number, updated: SequenceStep) {
    setSteps(prev => prev.map((s, i) => i === index ? updated : s))
  }

  function addStep() {
    const last = steps[steps.length - 1]
    setSteps(prev => [...prev, {
      step: prev.length + 1,
      label: `Step ${prev.length + 1}`,
      delay_days: (last?.delay_days ?? 0) + 5,
      channel: 'email',
      subject_hint: 'Continue the conversation',
      body_hint: 'Add new value. Keep it brief.',
      condition: 'no_reply',
      on_reply: 'stop',
    }])
  }

  function removeStep(index: number) {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, step: i + 1 })))
  }

  async function saveSequence() {
    if (!token) return
    setSaving(true)
    try {
      await api.put(`/figsy/campaigns/${id}/sequence`, { steps }, token)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      showToast('Sequence saved')
    } catch (err) {
      showToast((err as Error).message || 'Failed to save sequence', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveAudience() {
    if (!token) return
    setSavingAudience(true)
    try {
      await api.put(`/figsy/campaigns/${id}/audience`, {
        min_score: minScore,
        max_score: maxScore,
        daily_limit: dailyLimit,
      }, token)
      showToast('Audience settings saved')
    } catch (err) {
      showToast((err as Error).message || 'Failed to save audience settings', 'error')
    } finally {
      setSavingAudience(false)
    }
  }

  async function saveSettings() {
    if (!token) return
    setSavingSettings(true)
    try {
      const res = await api.patch<{ data: Campaign }>(`/figsy/campaigns/${id}`, { name: campaignName, review_required: copilotMode, model_preference: modelPref }, token)
      setCampaign(res.data)
      showToast('Settings saved')
    } catch (err) {
      showToast((err as Error).message || 'Failed to save settings', 'error')
    } finally {
      setSavingSettings(false)
    }
  }

  // Save A/B subject variants B–E to settings (item 97 PATCH contract).
  // Trimmed empty strings → null so the winner-check cron ignores unset variants.
  async function saveAbVariants() {
    if (!token) return
    setSavingAb(true)
    try {
      const res = await api.patch<{ data: Campaign }>(`/figsy/campaigns/${id}`, {
        ab_subject_b: abVariants.b.trim() || null,
        ab_subject_c: abVariants.c.trim() || null,
        ab_subject_d: abVariants.d.trim() || null,
        ab_subject_e: abVariants.e.trim() || null,
      }, token)
      setCampaign(res.data)
      const s = res.data.settings ?? {}
      setAbResolved(s.ab_test_resolved ?? false)
      setAbWinner(s.ab_test_winner ?? null)
      showToast('A/B variants saved')
    } catch (err) {
      showToast((err as Error).message || 'Failed to save A/B variants', 'error')
    } finally {
      setSavingAb(false)
    }
  }

  async function archiveCampaign() {
    if (!token) return
    setArchiving(true)
    try {
      await api.patch(`/figsy/campaigns/${id}`, { status: 'archived' }, token)
      router.push('/dashboard/figsy')
    } catch (err) {
      showToast((err as Error).message || 'Failed to archive campaign', 'error')
      setArchiving(false)
    }
  }

  async function enrollAllLeads() {
    if (!token) return
    setEnrolling(true)
    try {
      const res = await api.post<{ data: { enrolled: number; skipped: number } }>(
        `/figsy/campaigns/${id}/enroll-consented`, {}, token
      )
      showToast(`Enrolled ${res.data.enrolled} leads — sequences generating now`)
      const updated = await api.get<{ data: Campaign }>(`/figsy/campaigns/${id}`, token)
      setCampaign(updated.data)
    } catch (err) {
      showToast((err as Error).message || 'Failed to enroll leads', 'error')
    }
    setEnrolling(false)
  }

  async function sendTestEmail() {
    if (!token) return
    // Optional recipient: blank = your own inbox; or paste a mail-tester.com address
    // (for a deliverability score) / any Gmail/Outlook (to check inbox placement).
    const to = window.prompt('Send the test to which address?\n\n• Leave blank to send to your own inbox\n• Or paste a mail-tester.com address to score deliverability')
    if (to === null) return // cancelled
    const toEmail = to.trim()
    setSendingTest(true)
    try {
      await api.post(`/figsy/campaigns/${id}/test-email`, toEmail ? { to_email: toEmail } : {}, token)
      showToast(`Test email sent${toEmail ? ` to ${toEmail}` : ''} — arrives in ~2 min`)
    } catch (err) {
      showToast((err as Error).message || 'Failed to send test email', 'error')
    }
    setSendingTest(false)
  }

  async function sendNow() {
    if (!token) return
    setSendingNow(true)
    try {
      const res = await api.post<{ data: { sent: number; due_count: number } }>(
        `/figsy/campaigns/${id}/send-now`, {}, token
      )
      const { sent, due_count } = res.data
      showToast(sent > 0
        ? `Sent ${sent} email${sent === 1 ? '' : 's'} now`
        : due_count === 0 ? 'No emails due right now — all caught up' : 'No emails sent (check RESEND_API_KEY)')
      const updated = await api.get<{ data: Campaign }>(`/figsy/campaigns/${id}`, token)
      setCampaign(updated.data)
    } catch (err) {
      showToast((err as Error).message || 'Failed to send emails', 'error')
    }
    setSendingNow(false)
  }

  async function toggleStatus() {
    if (!campaign || !token) return
    setActivatingId(true)
    const newStatus = campaign.status === 'active' ? 'paused' : 'active'
    try {
      const res = await api.patch<{ data: Campaign }>(`/figsy/campaigns/${id}`, { status: newStatus }, token)
      setCampaign(res.data)
      // After activation, poll for enrollment progress for 30 seconds
      if (newStatus === 'active') {
        showToast('Campaign activated — FIGSY is enrolling leads now')
        let polls = 0
        const interval = setInterval(async () => {
          polls++
          try {
            const updated = await api.get<{ data: Campaign }>(`/figsy/campaigns/${id}`, token)
            setCampaign(updated.data)
          } catch { /* ignore */ }
          if (polls >= 6) clearInterval(interval) // stop after 30s
        }, 5000)
      }
    } catch { /* ignore */ }
    setActivatingId(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-24 text-[#9B8EC4]">
        <p>Campaign not found.</p>
        <Link href="/dashboard/figsy" className="text-[#7C3AED] hover:underline text-sm mt-2 block">← Back to campaigns</Link>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all ${
          toast.type === 'error'
            ? 'bg-red-600 text-white'
            : 'bg-[#7C3AED] text-white'
        }`}>
          {toast.type === 'error' ? <AlertTriangle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          {toast.message}
        </div>
      )}

      {/* Back link + header */}
      <div>
        <Link href="/dashboard/figsy" className="flex items-center gap-1.5 text-sm text-[#9B8EC4] hover:text-gray-700 transition-colors mb-3">
          <ArrowLeft className="w-4 h-4" /> All campaigns
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{campaign.name}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[campaign.status] ?? 'bg-gray-100 text-[#7B6FA0]'}`}>
              {campaign.status}
            </span>
            {copilotMode && campaign.status === 'active' && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                Pending approval
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:shrink-0">
            {campaign.status === 'active' && (
              <>
                <button
                  onClick={enrollAllLeads}
                  disabled={enrolling}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-emerald-600 text-sm font-semibold rounded-xl border border-emerald-200 transition-colors"
                >
                  {enrolling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4" />}
                  Enroll Leads
                </button>
                <button
                  onClick={sendNow}
                  disabled={sendingNow}
                  className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-blue-600 text-sm font-semibold rounded-xl border border-blue-200 transition-colors"
                >
                  {sendingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  Send Now
                </button>
              </>
            )}
            <button
              onClick={sendTestEmail}
              disabled={sendingTest}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-50 text-[#7C3AED] text-sm font-semibold rounded-xl border border-[#EDE9FE] transition-colors"
            >
              {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              Send Test Email
            </button>
            {(campaign.status === 'draft' || campaign.status === 'paused') && (
              <button
                onClick={toggleStatus}
                disabled={activatingId}
                className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {activatingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {campaign.status === 'paused' ? 'Resume' : 'Activate'}
              </button>
            )}
            {campaign.status === 'active' && (
              <button
                onClick={toggleStatus}
                disabled={activatingId}
                className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {activatingId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                Pause
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Enrolled',   value: campaign.leads_enrolled },
          { label: 'Sent',      value: campaign.emails_sent },
          { label: 'Replies',   value: campaign.replies_total },
          { label: 'Interested',value: campaign.replies_interested },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-4 text-center">
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-[#9B8EC4] mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {([
          { value: 'sequence', label: 'Sequence', icon: GitBranch },
          { value: 'audience', label: 'Audience', icon: Users },
          { value: 'abtest', label: 'A/B Test', icon: FlaskConical },
          { value: 'settings', label: 'Settings', icon: Settings2 },
        ] as const).map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => setActiveTab(value)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-[#7B6FA0] hover:text-gray-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Sequence tab ─────────────────────────────────────────── */}
      {activeTab === 'sequence' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Email Sequence</h2>
              <p className="text-xs text-[#9B8EC4] mt-0.5">Configure how FIGSY reaches out to each lead over time.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={saveSequence}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#7C3AED] hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? (
                  <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</>
                ) : saved ? (
                  <><Check className="w-3.5 h-3.5" /> Saved</>
                ) : (
                  <><Save className="w-3.5 h-3.5" /> Save sequence</>
                )}
              </button>
            </div>
          </div>

          {/* Draft warning */}
          {campaign.status === 'draft' && (
            <div className="mb-4 flex items-start gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">Configure your sequence, then activate the campaign when ready. FIGSY will enroll consented leads automatically.</p>
            </div>
          )}

          {/* Sequence flow */}
          <div className="flex flex-col">
            {steps.map((step, index) => {
              const isLast = index === steps.length - 1
              return (
                <div key={step.step}>
                  <StepCard
                    step={step}
                    index={index}
                    onUpdate={updated => updateStep(index, updated)}
                    onDelete={() => removeStep(index)}
                    token={token}
                  />
                  {!isLast && (
                    <div className="relative flex flex-col items-center my-1">
                      {/* vertical line */}
                      <div className="w-0.5 h-4 bg-[#EDE9FE]" />
                      {/* branch pill */}
                      <div className="flex items-center gap-3 py-1.5 px-3 rounded-full bg-[#F5F0FF] border border-[#EDE9FE] text-[10px] font-semibold">
                        <span className="text-emerald-600">If replied → {step.on_reply === 'stop' ? 'Stop' : step.on_reply === 'skip_next' ? 'Skip next' : 'Continue'}</span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[#7C3AED]">If no reply → Next step</span>
                      </div>
                      {/* vertical line */}
                      <div className="w-0.5 h-4 bg-[#EDE9FE]" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Add step */}
          {steps.length < 7 && (
            <button
              onClick={addStep}
              className="mt-6 w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-100/80 rounded-xl text-sm font-medium text-[#9B8EC4] hover:border-[#7C3AED]/40 hover:text-[#7C3AED] transition-all"
            >
              <Plus className="w-4 h-4" /> Add step
            </button>
          )}
        </div>
      )}

      {/* ── Audience tab ─────────────────────────────────────────── */}
      {activeTab === 'audience' && (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Audience configuration</h2>
            <p className="text-xs text-[#9B8EC4] mb-4">FIGSY auto-enrolls all consented leads that match these criteria.</p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Minimum lead score</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={0} max={100} step={5}
                    value={minScore}
                    onChange={e => setMinScore(Number(e.target.value))}
                    className="flex-1 accent-[#7C3AED]"
                  />
                  <span className="text-sm font-bold text-gray-900 w-8">{minScore}</span>
                </div>
                <p className="text-xs text-[#9B8EC4] mt-1">Only enroll leads with score ≥ {minScore}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Daily enrollment limit</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range" min={1} max={50} step={1}
                    value={dailyLimit}
                    onChange={e => setDailyLimit(Number(e.target.value))}
                    className="flex-1 accent-[#7C3AED]"
                  />
                  <span className="text-sm font-bold text-gray-900 w-12">{dailyLimit}/day</span>
                </div>
                <p className="text-xs text-[#9B8EC4] mt-1">Control the rate of new enrollments to avoid spikes</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#7B6FA0] mb-2">Source filter</label>
                <div className="flex flex-wrap gap-2">
                  {['All consented leads', 'Apollo only', 'High score (80+)', 'Specific ICP'].map(src => (
                    <button
                      key={src}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        src === 'All consented leads'
                          ? 'bg-[#7C3AED] text-white border-[#7C3AED]'
                          : 'bg-white text-gray-600 border-purple-100/80 hover:border-gray-300'
                      }`}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-gray-50">
              <button
                onClick={saveAudience}
                disabled={savingAudience}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#7C3AED] hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {savingAudience ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save audience settings'}
              </button>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-1">Enrolled leads</h2>
            <p className="text-xs text-[#9B8EC4] mb-3">{campaign.leads_enrolled} leads currently enrolled in this campaign.</p>
            {campaign.leads_enrolled === 0 ? (
              <p className="text-sm text-[#9B8EC4]">
                No leads enrolled yet. Activate the campaign to start auto-enrolling consented leads.
              </p>
            ) : (
              <div className="flex gap-3">
                <div className="flex-1 bg-purple-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-[#7C3AED]">{campaign.leads_enrolled}</p>
                  <p className="text-xs text-purple-600">Enrolled</p>
                </div>
                <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-700">{campaign.emails_sent}</p>
                  <p className="text-xs text-green-600">Sent</p>
                </div>
                <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-amber-700">{campaign.replies_total}</p>
                  <p className="text-xs text-amber-600">Replied</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── A/B Test tab ─────────────────────────────────────────── */}
      {activeTab === 'abtest' && (
        <div className="space-y-4">
          {/* Winner banner — shown once the daily cron resolves the test (item 97) */}
          {abResolved && abWinner && (
            <div className="flex items-start gap-3 px-5 py-4 bg-emerald-50 border border-emerald-200 rounded-2xl">
              <Trophy className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-emerald-800">
                  Winner: Variant {abWinner.toUpperCase()}
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  {(() => {
                    const subj = abWinner === 'a' ? variantA : abVariants[abWinner as 'b' | 'c' | 'd' | 'e']
                    return subj ? `"${subj}" had the best open rate and is now the primary subject line.` : 'This variant had the best open rate.'
                  })()}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-5">
            <div className="flex items-center gap-2 mb-1">
              <FlaskConical className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-bold text-gray-900">Subject-line A/B testing</h2>
            </div>
            <p className="text-xs text-[#9B8EC4] mb-4">
              Add up to four alternative subject lines. FIGSY splits step-1 sends evenly across all variants, then
              the daily winner check picks the best open rate after 48h and ≥5 sends per variant.
            </p>

            <div className="space-y-3">
              {/* Variant A — the AI-written subject, read-only */}
              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-[#7B6FA0] mb-1.5">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#7C3AED] text-white text-[10px] font-bold">A</span>
                  Variant A · written by FIGSY
                  {abResolved && abWinner === 'a' && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                      <Trophy className="w-3 h-3" /> Winner
                    </span>
                  )}
                </label>
                <input
                  value={variantA}
                  readOnly
                  placeholder="Generated per lead at send time"
                  className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Variants B–E — operator overrides */}
              {(['b', 'c', 'd', 'e'] as const).map(key => (
                <div key={key}>
                  <label className="flex items-center gap-2 text-xs font-semibold text-[#7B6FA0] mb-1.5">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-[#EDE9FE] text-[#7C3AED] text-[10px] font-bold">{key.toUpperCase()}</span>
                    Variant {key.toUpperCase()} <span className="font-normal text-[#9B8EC4]">(optional)</span>
                    {abResolved && abWinner === key && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        <Trophy className="w-3 h-3" /> Winner
                      </span>
                    )}
                  </label>
                  <input
                    value={abVariants[key]}
                    onChange={e => setAbVariants(v => ({ ...v, [key]: e.target.value }))}
                    maxLength={200}
                    disabled={abResolved}
                    placeholder={`Alternative subject line ${key.toUpperCase()}`}
                    className="w-full text-sm border border-purple-100/80 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-200 disabled:bg-gray-50 disabled:text-gray-400"
                  />
                </div>
              ))}
            </div>

            {abResolved ? (
              <p className="text-xs text-[#9B8EC4] mt-4">
                This test is resolved — variants are locked. Variant {abWinner?.toUpperCase()} is now used for new sends.
              </p>
            ) : (
              <div className="mt-5 pt-4 border-t border-gray-50">
                <button
                  onClick={saveAbVariants}
                  disabled={savingAb}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#7C3AED] hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {savingAb ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save A/B variants'}
                </button>
                <p className="text-xs text-[#9B8EC4] mt-2 text-center">
                  Add at least one variant (B–E) to start the test on the next send.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Settings tab ─────────────────────────────────────────── */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-purple-100/60 p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-900">Campaign settings</h2>

            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Campaign name</label>
              <input
                value={campaignName}
                onChange={e => setCampaignName(e.target.value)}
                className="w-full border border-purple-100/80 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-2">Sending mode</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCopilotMode(false)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    !copilotMode
                      ? 'border-2 border-[#7C3AED] bg-purple-50 text-[#7C3AED]'
                      : 'border border-purple-100/80 text-gray-600 hover:border-[#7C3AED]/40'
                  }`}
                >
                  <Zap className="w-4 h-4" /> Auto-Pilot
                </button>
                <button
                  onClick={() => setCopilotMode(true)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    copilotMode
                      ? 'border-2 border-amber-500 bg-amber-50 text-amber-700'
                      : 'border border-purple-100/80 text-gray-600 hover:border-amber-400'
                  }`}
                >
                  <Users className="w-4 h-4" /> Co-Pilot
                </button>
              </div>
              {copilotMode ? (
                <p className="text-xs text-amber-600 mt-2 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
                  All emails require your approval before sending — they will show as <strong>Pending approval</strong>.
                </p>
              ) : (
                <p className="text-xs text-[#9B8EC4] mt-2">FIGSY sends emails automatically on schedule without approval.</p>
              )}
            </div>

            {/* R18 — Writing model (multi-model toggle) */}
            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Writing model</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { id: 'haiku',  name: 'Fast',  desc: 'Quick & efficient. Great for high volume.' },
                  { id: 'sonnet', name: 'Smart', desc: 'Most capable. Sharper, more nuanced copy.' },
                ] as const).map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelPref(m.id)}
                    className={`text-left rounded-xl border px-3 py-2.5 transition-colors ${
                      modelPref === m.id ? 'border-[#7C3AED] bg-[#7C3AED]/[0.06]' : 'border-purple-100/80 hover:border-purple-200'
                    }`}
                  >
                    <p className={`text-sm font-semibold ${modelPref === m.id ? 'text-[#7C3AED]' : 'text-gray-800'}`}>{m.name}</p>
                    <p className="text-[11px] text-[#9B8EC4] mt-0.5">{m.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#7B6FA0] mb-1.5">Sending window</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-[#9B8EC4] mb-1">Send between</p>
                  <select className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200">
                    <option>08:00</option>
                    <option>09:00</option>
                    <option>10:00</option>
                  </select>
                </div>
                <div>
                  <p className="text-xs text-[#9B8EC4] mb-1">and</p>
                  <select className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-purple-200">
                    <option>17:00</option>
                    <option>18:00</option>
                    <option>19:00</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#7C3AED] hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {savingSettings ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…</> : 'Save settings'}
              </button>
              {campaign.status !== 'active' && (
                <button
                  onClick={archiveCampaign}
                  disabled={archiving}
                  className="flex items-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-600 text-sm font-medium rounded-xl transition-colors border border-red-100"
                >
                  {archiving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Archive campaign
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
