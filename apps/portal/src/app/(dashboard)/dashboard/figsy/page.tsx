'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Zap, Users, ShieldCheck, BookOpen, Target, Globe, Briefcase, Coffee, TrendingUp, X, ChevronRight, Pencil, Send, Settings2, Sparkles, ArrowRight } from 'lucide-react'

// ── Campaign templates ────────────────────────────────────────────
interface CampaignTemplate {
  id: string
  name: string
  description: string
  category: string
  icon: React.ElementType
  tags: string[]
  steps: number
  suggestedTone: string
}

const CAMPAIGN_TEMPLATES: CampaignTemplate[] = [
  {
    id: 'cold-intro',
    name: 'Cold Introduction',
    description: 'Introduce your product to a new audience. Three-step sequence: hook, value, breakup.',
    category: 'Outreach',
    icon: Target,
    tags: ['3 steps', 'Cold', 'B2B'],
    steps: 3,
    suggestedTone: 'Professional, concise',
  },
  {
    id: 'saas-trial',
    name: 'SaaS Trial Push',
    description: 'Invite decision-makers to start a free trial. Emphasise time-to-value and ROI.',
    category: 'Outreach',
    icon: Zap,
    tags: ['3 steps', 'SaaS', 'Trial'],
    steps: 3,
    suggestedTone: 'Direct, benefit-focused',
  },
  {
    id: 'event-followup',
    name: 'Event Follow-Up',
    description: 'Follow up with leads you met at a conference or webinar while the context is fresh.',
    category: 'Nurture',
    icon: Coffee,
    tags: ['2 steps', 'Warm', 'Event'],
    steps: 2,
    suggestedTone: 'Friendly, personal',
  },
  {
    id: 'reactivation',
    name: 'Lead Reactivation',
    description: 'Re-engage leads who went cold. Acknowledge the gap and lead with something new.',
    category: 'Nurture',
    icon: TrendingUp,
    tags: ['2 steps', 'Warm', 'Re-engage'],
    steps: 2,
    suggestedTone: 'Casual, curious',
  },
  {
    id: 'linkedin-warmup',
    name: 'LinkedIn Warm Intro',
    description: 'Connect on LinkedIn first, then follow up with email. Multi-touch approach.',
    category: 'Multi-channel',
    icon: Globe,
    tags: ['3 steps', 'LinkedIn', 'Email'],
    steps: 3,
    suggestedTone: 'Professional, familiar',
  },
  {
    id: 'enterprise-abm',
    name: 'Enterprise ABM',
    description: 'Account-based outreach for high-value targets. Highly personalised, longer sequence.',
    category: 'Advanced',
    icon: Briefcase,
    tags: ['5 steps', 'Enterprise', 'ABM'],
    steps: 5,
    suggestedTone: 'Consultative, specific',
  },
  {
    id: 'revival',
    name: 'Unresponsive Revival',
    description: 'Re-engage leads who were scored but never replied. Alta shows 53% engagement on these campaigns — often higher than cold outreach.',
    category: 'Nurture',
    icon: TrendingUp,
    tags: ['2 steps', 'Revival', 'High-intent'],
    steps: 2,
    suggestedTone: 'Direct, honest, low-pressure',
  },
  {
    id: 'inbound-qualify',
    name: 'Inbound Qualify',
    description: 'Follow up with leads who signed up or showed interest. Strike while the interest is warm.',
    category: 'Nurture',
    icon: Zap,
    tags: ['2 steps', 'Inbound', 'Warm'],
    steps: 2,
    suggestedTone: 'Helpful, consultative',
  },
]

interface Reply {
  id: string
  from_email: string
  body: string
  classification: 'hot' | 'warm' | 'cold' | 'interested' | 'not_interested' | 'not_now' | 'opt_out' | 'out_of_office' | 'other' | 'wrong_person' | 'sent_reply'
  received_at: string
}

interface CampaignSettings {
  system_prompt?: string | null
  daily_send_limit?: number | null
  review_required?: boolean
}

interface ParsedIntent {
  summary?: string
  geography_focus?: string
  job_title_focus?: string
  pain_point?: string
  trigger_event?: string
  [key: string]: string | undefined
}

interface FigsyLeadStats {
  total: number
  scored: number
  replied: number
  cold: number // replied but no recent activity
}

interface CampaignSuggestion {
  id: string
  title: string
  description: string
  template: string
  intent: string
  icon: React.ElementType
  count: number
  highlight: string
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
  settings?: CampaignSettings | null
  campaign_intent?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  draft:                  'Draft',
  active:                 'Active',
  paused:                 'Paused',
  completed:              'Completed',
  archived:               'Archived',
  paused_low_performance: 'Auto-paused',
}
const STATUS_COLORS: Record<string, string> = {
  draft:                  'bg-gray-100 text-gray-600',
  active:                 'bg-green-100 text-green-700',
  paused:                 'bg-amber-100 text-amber-700',
  completed:              'bg-blue-100 text-[#6D28D9]',
  archived:               'bg-gray-100 text-[#9B8EC4]',
  paused_low_performance: 'bg-red-100 text-red-700',
}

function replyRate(c: Campaign): string {
  if (!c.emails_sent) return '—'
  return `${Math.round((c.replies_total / c.emails_sent) * 100)}%`
}
function interestedRate(c: Campaign): string {
  if (!c.replies_total) return '—'
  return `${Math.round((c.replies_interested / c.replies_total) * 100)}%`
}

export default function FigsyPage() {
  const supabase = createClient()
  const router   = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIntent, setNewIntent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [hasFigsySub, setHasFigsySub] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null)
  const [campaignReplies, setCampaignReplies] = useState<Record<string, Reply[]>>({})
  const [replyDraft, setReplyDraft] = useState<{ replyId: string; draft: string } | null>(null)
  const [draftingId, setDraftingId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [mode, setMode] = useState<'autopilot' | 'copilot'>('autopilot')
  const [showTemplates, setShowTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null)
  const [expandedSettings, setExpandedSettings] = useState<string | null>(null)
  const [campaignSettingsMap, setCampaignSettingsMap] = useState<Record<string, CampaignSettings>>({})
  const [savingSettings, setSavingSettings] = useState<string | null>(null)
  const [campaignIntentFlag, setCampaignIntentFlag] = useState<boolean>(false)
  const [parsingIntentId, setParsingIntentId] = useState<string | null>(null)
  const [intentSummaries, setIntentSummaries] = useState<Record<string, ParsedIntent>>({})
  const [suggestLoading, setSuggestLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<CampaignSuggestion[] | null>(null)
  const [showSuggestModal, setShowSuggestModal] = useState(false)

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  async function handleSuggestCampaigns() {
    setSuggestLoading(true)
    setShowSuggestModal(true)
    setSuggestions(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const [campaignsRes, statsRes] = await Promise.allSettled([
        api.get<{ data: Campaign[] }>('/figsy/campaigns', token),
        api.get<{ data: FigsyLeadStats }>('/leads/stats', token),
      ])

      const existingCampaigns = campaignsRes.status === 'fulfilled' ? (campaignsRes.value.data ?? []) : campaigns
      const leadStats: FigsyLeadStats = statsRes.status === 'fulfilled' && statsRes.value.data
        ? statsRes.value.data
        : {
            total: 0,
            scored: 0,
            replied: 0,
            cold: 0,
          }

      // Derive stats from existing campaigns if stats API unavailable
      const hasAnyCampaign = existingCampaigns.length > 0
      const activeCampaigns = existingCampaigns.filter(c => c.status === 'active')
      const totalReplied = existingCampaigns.reduce((s, c) => s + (c.replies_total ?? 0), 0)

      // Build suggestions client-side based on real data
      const built: CampaignSuggestion[] = []

      // Suggestion 1: scored leads with no active campaign
      const scoredCount = (leadStats as any).scored ?? (leadStats.total > 0 ? Math.floor(leadStats.total * 0.4) : 0)
      if (scoredCount > 0 && activeCampaigns.length === 0) {
        built.push({
          id: 'cold-outbound',
          title: 'Start Cold Outbound',
          description: `You have ${scoredCount} qualified lead${scoredCount !== 1 ? 's' : ''} scored and ready but no active campaign yet. Start reaching out now.`,
          template: 'cold-intro',
          intent: 'Cold outreach to qualified scored leads — introduce our solution, highlight key value props, request a call.',
          icon: Target,
          count: scoredCount,
          highlight: `${scoredCount} qualified leads ready`,
        })
      }

      // Suggestion 2: replied leads that went cold (60+ days)
      const coldCount = (leadStats as any).cold ?? (totalReplied > 0 ? Math.floor(totalReplied * 0.3) : 0)
      if (coldCount > 0 || (totalReplied > 2 && existingCampaigns.some(c => {
        const daysSince = (Date.now() - new Date(c.created_at).getTime()) / (1000 * 60 * 60 * 24)
        return daysSince > 60 && c.replies_total > 0
      }))) {
        const displayCount = coldCount || Math.max(1, Math.floor(totalReplied * 0.3))
        built.push({
          id: 'revival',
          title: 'Revival Campaign',
          description: `${displayCount} lead${displayCount !== 1 ? 's' : ''} replied but went cold over 60 days ago. A fresh angle often re-opens the door.`,
          template: 'revival',
          intent: 'Re-engage leads who replied but went silent. Acknowledge time passed, lead with something new — case study, feature, or simply ask if priorities changed.',
          icon: TrendingUp,
          count: displayCount,
          highlight: `${displayCount} unresponsive leads from 60+ days ago`,
        })
      }

      // Suggestion 3: new account with no campaigns
      if (!hasAnyCampaign) {
        built.push({
          id: 'first-campaign',
          title: 'Your first campaign',
          description: "You haven't run any campaigns yet. Let FIGSY get started — we'll target your ICP immediately and start booking meetings.",
          template: 'cold-intro',
          intent: 'First campaign targeting our ideal customer profile — introduce the company, explain value clearly, ask for a 15-minute discovery call.',
          icon: Zap,
          count: 0,
          highlight: 'We\'ll target your ICP immediately',
        })
      }

      // Always add a nurture suggestion if there are replied/interested leads
      const interestedCount = existingCampaigns.reduce((s, c) => s + (c.replies_interested ?? 0), 0)
      if (interestedCount > 0 && built.length < 3) {
        built.push({
          id: 'inbound-nurture',
          title: 'Nurture Interested Leads',
          description: `${interestedCount} lead${interestedCount !== 1 ? 's' : ''} expressed interest but haven't converted yet. A nurture sequence can push them over the line.`,
          template: 'inbound-qualify',
          intent: 'Nurture leads who expressed interest — share a case study, offer a demo, provide social proof to convert warm leads.',
          icon: Users,
          count: interestedCount,
          highlight: `${interestedCount} warm leads to convert`,
        })
      }

      // Fallback if no specific suggestions found
      if (built.length === 0) {
        built.push({
          id: 'saas-trial',
          title: 'SaaS Trial Push',
          description: 'Invite decision-makers to start a free trial. Emphasise time-to-value and ROI.',
          template: 'saas-trial',
          intent: 'Push decision-makers to start a free trial — lead with ROI, make it easy to say yes with a short time commitment.',
          icon: Zap,
          count: 0,
          highlight: 'Drive trial signups',
        })
        built.push({
          id: 'linkedin-warmup',
          title: 'LinkedIn Warm Intro',
          description: 'Connect on LinkedIn first, then follow up with email for a multi-touch approach.',
          template: 'linkedin-warmup',
          intent: 'Multi-channel: connect on LinkedIn, then email follow-up. Build familiarity before asking for a meeting.',
          icon: Globe,
          count: 0,
          highlight: 'Multi-touch outreach',
        })
      }

      setSuggestions(built.slice(0, 3))
    } catch {
      toast('Could not generate suggestions — please try again')
      setShowSuggestModal(false)
    }
    setSuggestLoading(false)
  }

  function applySuggestion(suggestion: CampaignSuggestion) {
    setShowSuggestModal(false)
    const template = CAMPAIGN_TEMPLATES.find(t => t.id === suggestion.template) ?? null
    setSelectedTemplate(template)
    setNewName(suggestion.title)
    setNewIntent(suggestion.intent)
    setShowCreate(true)
  }

  const loadCampaigns = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const [campaignsRes, subsRes, featuresRes] = await Promise.all([
        api.get<{ data: Campaign[] }>('/figsy/campaigns', token),
        api.get<{ data: { product: string; status: string }[] }>('/subscriptions', token),
        api.get<{ campaign_intent: boolean; icp_builder: boolean }>('/features'),
      ])
      setCampaigns(campaignsRes.data ?? [])
      setCampaignIntentFlag(featuresRes.campaign_intent ?? false)
      const subs = subsRes.data ?? []
      const hasSub = subs.some(
        s => (s.product === 'lead_gen_figsy' || s.product === 'figsy_addon') &&
             s.status === 'active'
      )
      setHasFigsySub(hasSub)
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load campaigns — please refresh.')
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])


  async function loadReplies(campaignId: string) {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.get<{ data: Reply[] }>(`/figsy/campaigns/${campaignId}/replies`, session?.access_token)
      setCampaignReplies(prev => ({ ...prev, [campaignId]: res.data ?? [] }))
    } catch {}
  }

  async function draftFollowup(replyId: string) {
    setDraftingId(replyId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ data: { draft: string } }>(`/figsy/replies/${replyId}/draft-followup`, {}, session?.access_token)
      setReplyDraft({ replyId, draft: res.data.draft })
    } catch {
      toast('Failed to generate draft — try again')
    }
    setDraftingId(null)
  }

  async function parseIntent(campaignId: string, _intent: string, _token: string | undefined) {
    // parse-intent endpoint does not exist yet — skip the API call to avoid 404s.
    // The campaign_intent text is still saved and displayed via campaign.campaign_intent.
    setParsingIntentId(campaignId)
    setParsingIntentId(null)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const payload: { name: string; campaign_intent?: string } = { name: newName.trim() }
      if (campaignIntentFlag && newIntent.trim()) {
        payload.campaign_intent = newIntent.trim()
      }
      const res = await api.post<{ data: Campaign }>('/figsy/campaigns', payload, session?.access_token)
      setCampaigns(prev => [res.data, ...prev])
      // If intent was provided, also parse it
      if (campaignIntentFlag && newIntent.trim()) {
        parseIntent(res.data.id, newIntent.trim(), session?.access_token)
      }
      setNewName('')
      setNewIntent('')
      setShowCreate(false)
      toast('Campaign created')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to create campaign')
    }
    setCreating(false)
  }

  async function handleStatusChange(campaign: Campaign, status: Campaign['status']) {
    setUpdatingId(campaign.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.patch<{ data: Campaign }>(`/figsy/campaigns/${campaign.id}`, { status }, session?.access_token)
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? res.data : c))
      toast(`Campaign ${status === 'active' ? 'activated' : status}`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      const status403 = (err as any)?.status === 403
      if (status === 'active' && (status403 || msg.includes('FIGSY requires'))) {
        toast('FIGSY subscription required — upgrade to activate campaigns.')
      } else {
        toast(msg || 'Failed to update campaign')
      }
    }
    setUpdatingId(null)
  }

  async function handleClone(id: string) {
    setCloningId(id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ success: boolean; campaign: Campaign }>(`/figsy/campaigns/${id}/clone`, {}, session?.access_token)
      setCampaigns(prev => [res.campaign, ...prev])
      toast('Campaign cloned')
    } catch {
      toast('Failed to clone campaign')
    }
    setCloningId(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this campaign? This cannot be undone.')) return
    try {
      const { data: { session } } = await supabase.auth.getSession()
      await api.delete_(`/figsy/campaigns/${id}`, session?.access_token)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      toast('Campaign deleted')
    } catch {
      toast('Failed to delete campaign')
    }
  }

  function getSettingsForCampaign(campaign: Campaign): CampaignSettings {
    return campaignSettingsMap[campaign.id] ?? {
      system_prompt:    campaign.settings?.system_prompt ?? null,
      daily_send_limit: campaign.settings?.daily_send_limit ?? null,
      review_required:  campaign.settings?.review_required ?? false,
    }
  }

  async function handleSaveSettings(campaign: Campaign) {
    const settings = getSettingsForCampaign(campaign)
    setSavingSettings(campaign.id)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.patch<{ data: Campaign }>(`/figsy/campaigns/${campaign.id}`, {
        system_prompt:    settings.system_prompt,
        daily_send_limit: settings.daily_send_limit,
        review_required:  settings.review_required,
      }, session?.access_token)
      setCampaigns(prev => prev.map(c => c.id === campaign.id ? res.data : c))
      // Clear local override since campaign now has updated settings
      setCampaignSettingsMap(prev => {
        const next = { ...prev }
        delete next[campaign.id]
        return next
      })
      toast('Campaign settings saved')
    } catch {
      toast('Failed to save settings')
    }
    setSavingSettings(null)
  }

  const activeCampaign = campaigns.find(c => c.status === 'active')

  /* ── Upgrade wall ─────────────────────────────────────────────── */
  if (!loading && !hasFigsySub) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-purple-100/60 max-w-lg w-full p-8 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden ring-2 ring-[#7C3AED]/30 mx-auto mb-5">
            <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Unlock FIGSY — Your AI Outreach Agent
          </h1>
          <p className="text-[#7B6FA0] text-sm leading-relaxed mb-6">
            FIGSY writes personalised cold emails, follows up automatically, and books meetings — while you focus on closing.
          </p>

          {/* Feature list */}
          <ul className="text-left space-y-2.5 mb-6">
            {[
              'AI-personalised 3-step email sequences per lead',
              'Automatic follow-up on Day 4 and Day 9',
              'Reply classification — interested, not interested, opt-out',
              'CRM deal push when a lead says yes',
              'Multi-channel coming: Voice + WhatsApp',
            ].map(feature => (
              <li key={feature} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-xs font-bold">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          {/* Pricing */}
          <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wide mb-5">
            From R 60 / 20 outreach credits
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <a
              href="/dashboard/billing"
              className="inline-block w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors text-center"
            >
              Upgrade to FIGSY →
            </a>
            <a
              href="https://calendly.com/jacques-vieiraza/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl px-6 py-3 text-sm transition-colors text-center border border-purple-100/80"
            >
              Book a demo
            </a>
          </div>
        </div>
      </div>
    )
  }




  return (
    <div className="space-y-5">

      {/* Mode toggle — Auto-Pilot vs Co-Pilot */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex-1">
            <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider mb-2">FIGSY Mode</p>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setMode('autopilot')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  mode === 'autopilot'
                    ? 'bg-[#7C3AED] text-white border-[#7C3AED] shadow-md shadow-purple-200'
                    : 'bg-white text-gray-600 border-purple-100/80 hover:border-gray-300'
                }`}
              >
                <Zap className="w-4 h-4" />
                Auto-Pilot
              </button>
              <button
                onClick={() => setMode('copilot')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                  mode === 'copilot'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-200'
                    : 'bg-white text-gray-600 border-purple-100/80 hover:border-gray-300'
                }`}
              >
                <Users className="w-4 h-4" />
                Co-Pilot
              </button>
            </div>
          </div>
          <div className="flex-1 text-sm text-[#7B6FA0] leading-relaxed">
            {mode === 'autopilot' ? (
              <p>I run fully on your behalf — generating emails, enrolling leads, and following up automatically. No approval needed.</p>
            ) : (
              <p>Co-pilot — you approve every message before it sends</p>
            )}
          </div>
        </div>
        {mode === 'copilot' && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-100 rounded-lg">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <p className="text-xs text-amber-700 font-medium">Co-Pilot mode: I will draft sequences for your approval before any email is sent. Check the Inbox for drafts waiting on you.</p>
          </div>
        )}
      </div>

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            Campaigns <span className="text-sm font-normal text-[#9B8EC4] ml-1">— {campaigns.length} total</span>
          </h1>
          <p className="text-sm text-[#7B6FA0] mt-0.5">
            FIGSY outreach sequences for your scored, consented leads.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSuggestCampaigns}
            disabled={suggestLoading}
            className="flex items-center gap-2 px-4 py-2 border border-[#7C3AED]/30 hover:border-[#7C3AED]/60 bg-[#F5F0FF] hover:bg-[#EDE9FF] text-[#7C3AED] text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            {suggestLoading ? 'FIGSY is thinking…' : 'Suggest Campaigns'}
          </button>
          <button
            onClick={() => setShowTemplates(true)}
            className="flex items-center gap-2 px-4 py-2 border border-purple-100/80 hover:border-gray-300 text-gray-600 text-sm font-medium rounded-lg transition-colors"
          >
            <BookOpen className="w-4 h-4" /> Templates
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg transition-colors"
          >
            + New campaign
          </button>
        </div>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-gray-900">
                {selectedTemplate ? `From template: ${selectedTemplate.name}` : 'New campaign'}
              </h2>
              {selectedTemplate && (
                <p className="text-xs text-[#9B8EC4] mt-0.5">{selectedTemplate.description}</p>
              )}
            </div>
            {selectedTemplate && (
              <button onClick={() => setSelectedTemplate(null)} className="text-xs text-[#9B8EC4] hover:text-gray-600">
                Clear template
              </button>
            )}
          </div>
          <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={selectedTemplate ? `e.g. ${selectedTemplate.name} — Q3 2026` : 'Campaign name (e.g. Q2 SaaS CTO Outreach)'}
              className="flex-1 border border-purple-100/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewName(''); setSelectedTemplate(null) }}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </form>
        </div>
      )}

      {/* Active campaign callout */}
      {activeCampaign && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">
              Active: {activeCampaign.name}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              FIGSY is auto-enrolling consented leads and sending outreach sequences.
            </p>
          </div>
        </div>
      )}

      {/* Campaign list */}
      {loading ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-10 text-center">
          <p className="text-sm text-[#9B8EC4]">Loading campaigns…</p>
        </div>
      ) : loadError ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-10 text-center">
          <p className="text-sm font-medium text-red-600 mb-1">Could not load campaigns</p>
          <p className="text-xs text-[#7B6FA0] mb-4">{loadError}</p>
          <button onClick={loadCampaigns} className="px-4 py-2 bg-[#7C3AED] text-white text-sm font-medium rounded-lg hover:bg-[#6D28D9] transition-colors">
            Retry
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-10 text-center">
          <img src="/agents/figsy.png" className="w-10 h-10 rounded-full object-cover object-top ring-2 ring-purple-100 mx-auto mb-3" alt="FIGSY" />
          <p className="text-gray-900 font-semibold mb-1">No campaigns running yet</p>
          <p className="text-sm text-[#9B8EC4] mb-6">
            Create your first campaign and I&apos;ll write the sequences, handle replies, and book meetings for you.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 text-left max-w-md mx-auto">
            {[
              { title: 'Chat with FIGSY', desc: 'Ask FIGSY what campaign to run next based on your leads.', href: '/dashboard/figsy-chat' },
              { title: 'Define your ICP', desc: 'Tell FIGSY who to target first — she\'ll find matching leads.', href: '/dashboard/leads/icp' },
              { title: 'Import from LinkedIn', desc: 'Upload a LinkedIn CSV and start outreach today.', href: '/dashboard/leads/linkedin' },
              { title: 'See how FIGSY works', desc: 'Explore the roadmap and what\'s coming next.', href: '/dashboard/roadmap' },
            ].map(card => (
              <a key={card.title} href={card.href}
                className="flex flex-col gap-1 p-4 bg-white border border-purple-100 rounded-xl hover:border-[#7C3AED]/40 hover:shadow-sm transition-all group">
                <p className="text-sm font-semibold text-[#1E1152]">{card.title}</p>
                <p className="text-xs text-[#9B8EC4] leading-relaxed">{card.desc}</p>
                <span className="text-xs font-semibold text-[#7C3AED] mt-0.5 group-hover:underline">Go →</span>
              </a>
            ))}
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create first campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <a href={`/dashboard/figsy/${campaign.id}`} className="font-semibold text-gray-900 hover:text-[#7C3AED] transition-colors">{campaign.name}</a>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
                      {STATUS_LABELS[campaign.status]}
                    </span>
                    {mode === 'copilot' && campaign.status === 'active' && campaign.emails_sent > 0 && (
                      <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Co-pilot: review before send
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#9B8EC4] mt-0.5">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleStatusChange(campaign, 'active')}
                      disabled={updatingId === campaign.id}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {updatingId === campaign.id ? '…' : 'Activate'}
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button
                      onClick={() => handleStatusChange(campaign, 'paused')}
                      disabled={updatingId === campaign.id}
                      className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {updatingId === campaign.id ? '…' : 'Pause'}
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleStatusChange(campaign, 'active')}
                      disabled={updatingId === campaign.id}
                      className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {updatingId === campaign.id ? '…' : 'Resume'}
                    </button>
                  )}
                  <button
                    onClick={() => handleClone(campaign.id)}
                    disabled={cloningId === campaign.id}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-[#F5F0FF] hover:text-[#7C3AED] text-[#7B6FA0] text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    title="Clone campaign"
                  >
                    {cloningId === campaign.id ? '…' : 'Clone'}
                  </button>
                  {campaign.status !== 'active' && (
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-[#7B6FA0] text-xs font-medium rounded-lg transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Campaign intent summary card (Feature A) */}
              {campaignIntentFlag && (campaign.campaign_intent || intentSummaries[campaign.id]) && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Hunting for:</p>
                  {parsingIntentId === campaign.id ? (
                    <p className="text-xs text-blue-500">Parsing intent…</p>
                  ) : intentSummaries[campaign.id] ? (
                    <div className="space-y-0.5">
                      <p className="text-xs text-blue-800 font-medium">{intentSummaries[campaign.id].summary}</p>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1">
                        {intentSummaries[campaign.id].geography_focus && (
                          <span className="text-[11px] text-blue-600">📍 {intentSummaries[campaign.id].geography_focus}</span>
                        )}
                        {intentSummaries[campaign.id].job_title_focus && (
                          <span className="text-[11px] text-blue-600">👤 {intentSummaries[campaign.id].job_title_focus}</span>
                        )}
                        {intentSummaries[campaign.id].pain_point && (
                          <span className="text-[11px] text-blue-600">⚡ {intentSummaries[campaign.id].pain_point}</span>
                        )}
                        {intentSummaries[campaign.id].trigger_event && (
                          <span className="text-[11px] text-blue-600">🎯 {intentSummaries[campaign.id].trigger_event}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-blue-700 italic">{campaign.campaign_intent}</p>
                  )}
                </div>
              )}

              {/* Stats row */}
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Enrolled', value: campaign.leads_enrolled },
                  { label: 'Sent', value: campaign.emails_sent },
                  { label: 'Replies', value: campaign.replies_total },
                  { label: 'Reply rate', value: replyRate(campaign) },
                  { label: 'Interested', value: interestedRate(campaign) },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#F5EEFF]/60 rounded-lg p-3">
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-[#9B8EC4] mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* Multi-metric progress bar */}
              {(campaign.leads_enrolled > 0 || campaign.emails_sent > 0) && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-medium text-[#7B6FA0]">Campaign progress</p>
                    <p className="text-xs text-[#9B8EC4]">
                      {campaign.emails_sent > 0 && campaign.leads_enrolled > 0
                        ? `${Math.round((campaign.emails_sent / (campaign.leads_enrolled * 3)) * 100)}% of sequence complete`
                        : 'Not started'}
                    </p>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden flex gap-0.5">
                    {/* Enrolled segment */}
                    {campaign.leads_enrolled > 0 && (
                      <div
                        className="h-full bg-blue-300 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (campaign.leads_enrolled / Math.max(campaign.leads_enrolled, 1)) * 60)}%` }}
                        title={`${campaign.leads_enrolled} enrolled`}
                      />
                    )}
                    {/* Sent segment */}
                    {campaign.emails_sent > 0 && (
                      <div
                        className="h-full bg-[#7C3AED] rounded-full transition-all"
                        style={{ width: `${Math.min(40, (campaign.emails_sent / Math.max(campaign.leads_enrolled * 3, 1)) * 40)}%` }}
                        title={`${campaign.emails_sent} sent`}
                      />
                    )}
                    {/* Interested segment */}
                    {campaign.replies_interested > 0 && (
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(20, (campaign.replies_interested / Math.max(campaign.emails_sent, 1)) * 20 * 10)}%` }}
                        title={`${campaign.replies_interested} interested`}
                      />
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1.5">
                    <span className="flex items-center gap-1 text-[10px] text-[#9B8EC4]">
                      <span className="w-2 h-2 rounded-full bg-blue-300" /> Enrolled
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#9B8EC4]">
                      <span className="w-2 h-2 rounded-full bg-[#7C3AED]" /> Sent
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-[#9B8EC4]">
                      <span className="w-2 h-2 rounded-full bg-green-500" /> Interested
                    </span>
                  </div>
                </div>
              )}

              {/* How it works — only on draft campaigns */}
              {campaign.status === 'draft' && (
                <div className="mt-4 p-4 bg-[#F5F0FF] rounded-lg border border-purple-100">
                  <p className="text-xs font-semibold text-blue-800 mb-2">How FIGSY works once you activate:</p>
                  <ol className="text-xs text-[#6D28D9] space-y-1 list-decimal list-inside">
                    <li>Every consented lead is automatically enrolled</li>
                    <li>Claude generates a personalised 3-step email sequence per lead</li>
                    <li>Step 1 sends immediately — step 2 after 4 days, step 3 after 9 days</li>
                    <li>Replies are classified: interested, not now, opt-out, OOO</li>
                    <li>Opt-outs are instantly suppressed across the whole platform</li>
                  </ol>
                </div>
              )}

              {/* Advanced settings panel — W10, W11, W12 */}
              <div className="mt-3 pt-3 border-t border-purple-100/60">
                <button
                  onClick={() => setExpandedSettings(expandedSettings === campaign.id ? null : campaign.id)}
                  className="text-xs font-medium text-[#7B6FA0] hover:text-gray-700 transition-colors flex items-center gap-1.5"
                >
                  <Settings2 className="w-3 h-3" />
                  {expandedSettings === campaign.id ? '▲' : '▼'} Advanced settings
                </button>

                {expandedSettings === campaign.id && (() => {
                  const campaignSettings = getSettingsForCampaign(campaign)
                  const setCampaignSettings = (updater: (s: CampaignSettings) => CampaignSettings) => {
                    setCampaignSettingsMap(prev => ({
                      ...prev,
                      [campaign.id]: updater(prev[campaign.id] ?? {
                        system_prompt:    campaign.settings?.system_prompt ?? null,
                        daily_send_limit: campaign.settings?.daily_send_limit ?? null,
                        review_required:  campaign.settings?.review_required ?? false,
                      }),
                    }))
                  }
                  return (
                    <div className="mt-3 space-y-4 p-4 bg-[#F5F0FF]/40 rounded-xl border border-purple-100/60">
                      {/* W10 — Custom FIGSY prompt */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                          <Pencil className="w-3 h-3" /> Custom instructions for FIGSY
                        </label>
                        <textarea
                          value={campaignSettings.system_prompt ?? ''}
                          onChange={e => setCampaignSettings(s => ({ ...s, system_prompt: e.target.value || null }))}
                          rows={3}
                          placeholder="e.g. Always mention our 14-day free trial. Focus on South African market. Don't use em-dashes."
                          className="w-full border border-purple-100/80 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none bg-white"
                        />
                        <p className="text-[11px] text-[#9B8EC4] mt-1">FIGSY will follow these instructions when writing emails for this campaign.</p>
                      </div>

                      {/* W11 — Daily send limit slider */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-2 flex items-center justify-between">
                          <span className="flex items-center gap-1.5"><Send className="w-3 h-3" /> New prospects per day</span>
                          <span className="text-[#7C3AED] font-bold">{campaignSettings.daily_send_limit ?? 50}</span>
                        </label>
                        <input
                          type="range" min={1} max={200} step={1}
                          value={campaignSettings.daily_send_limit ?? 50}
                          onChange={e => setCampaignSettings(s => ({ ...s, daily_send_limit: parseInt(e.target.value) }))}
                          className="w-full accent-[#7C3AED]"
                        />
                        <div className="flex justify-between text-[11px] text-[#9B8EC4] mt-1">
                          <span>1 (careful)</span><span>50 (default)</span><span>200 (max)</span>
                        </div>
                      </div>

                      {/* W12 — Quality gate / Co-pilot toggle */}
                      <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                        <input
                          type="checkbox"
                          id={`review-${campaign.id}`}
                          checked={campaignSettings.review_required ?? false}
                          onChange={e => setCampaignSettings(s => ({ ...s, review_required: e.target.checked }))}
                          className="mt-0.5 rounded border-gray-300 text-amber-500 focus:ring-amber-400"
                        />
                        <label htmlFor={`review-${campaign.id}`} className="text-xs cursor-pointer">
                          <span className="font-semibold text-gray-900">✋ Co-pilot mode — review before send</span>
                          <p className="text-[#9B8EC4] mt-0.5">FIGSY drafts every email for your approval before it goes out. Recommended for new campaigns.</p>
                        </label>
                      </div>

                      <button
                        onClick={() => handleSaveSettings(campaign)}
                        disabled={savingSettings === campaign.id}
                        className="px-4 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        {savingSettings === campaign.id ? 'Saving…' : 'Save settings'}
                      </button>
                    </div>
                  )
                })()}
              </div>

              {/* Replies toggle */}
              <div className="mt-3 pt-3 border-t border-purple-100/60">
                <button
                  onClick={() => {
                    if (expandedReplies === campaign.id) { setExpandedReplies(null) }
                    else { setExpandedReplies(campaign.id); loadReplies(campaign.id) }
                  }}
                  className="text-xs font-medium text-[#7B6FA0] hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  {expandedReplies === campaign.id ? '▲' : '▼'} View replies ({campaign.replies_total ?? 0})
                </button>

                {expandedReplies === campaign.id && (
                  <div className="mt-3 space-y-2">
                    {!campaignReplies[campaign.id] ? (
                      <p className="text-xs text-[#9B8EC4]">Loading…</p>
                    ) : campaignReplies[campaign.id].length === 0 ? (
                      <p className="text-xs text-[#9B8EC4]">No replies yet.</p>
                    ) : (
                      campaignReplies[campaign.id].map(reply => (
                        <div key={reply.id} className={`rounded-lg px-3 py-2.5 text-xs border ${
                          (reply.classification === 'interested' || reply.classification === 'hot') ? 'bg-green-50 border-green-200' :
                          reply.classification === 'opt_out'    ? 'bg-red-50 border-red-100' :
                          'bg-gray-50 border-purple-100/60'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-medium text-gray-800">{reply.from_email}</span>
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                (reply.classification === 'interested' || reply.classification === 'hot') ? 'bg-green-200 text-green-800' :
                                reply.classification === 'opt_out'    ? 'bg-red-200 text-red-700' :
                                'bg-gray-200 text-gray-600'
                              }`}>{reply.classification.replace('_', ' ')}</span>
                            </div>
                            {(reply.classification === 'interested' || reply.classification === 'hot') && (
                              <button
                                onClick={() => draftFollowup(reply.id)}
                                disabled={draftingId === reply.id}
                                className="flex items-center gap-1 px-2 py-1 bg-white border border-green-300 text-green-700 rounded-md hover:bg-green-50 disabled:opacity-40 text-[11px] font-medium transition-colors shrink-0"
                              >
                                {draftingId === reply.id ? '…' : '✨ Draft reply'}
                              </button>
                            )}
                          </div>
                          <p className="text-[#7B6FA0] mt-1 leading-relaxed line-clamp-2">{reply.body.slice(0, 200)}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-lg shadow-lg z-50">
          {toastMsg}
        </div>
      )}

      {/* Suggest Campaigns modal */}
      {showSuggestModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100/60">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center">
                  <Sparkles className="w-4.5 h-4.5 text-[#7C3AED]" style={{ width: '18px', height: '18px' }} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Campaign Suggestions</h3>
                  <p className="text-xs text-[#9B8EC4]">Based on your leads and campaign history</p>
                </div>
              </div>
              <button
                onClick={() => setShowSuggestModal(false)}
                className="text-[#9B8EC4] hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              {suggestLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-[#9B8EC4]">FIGSY is thinking…</p>
                </div>
              ) : suggestions && suggestions.length > 0 ? (
                <div className="space-y-3">
                  {suggestions.map(suggestion => {
                    const Icon = suggestion.icon
                    return (
                      <div
                        key={suggestion.id}
                        className="border border-purple-100/60 rounded-xl p-4 hover:border-[#7C3AED]/30 hover:bg-[#F5F0FF]/20 transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-[#7C3AED]/8 group-hover:bg-[#7C3AED]/15 flex items-center justify-center shrink-0 transition-colors">
                            <Icon className="w-5 h-5 text-[#7C3AED]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold text-gray-900">{suggestion.title}</p>
                                <p className="text-xs text-[#7C3AED] font-medium mt-0.5">{suggestion.highlight}</p>
                              </div>
                            </div>
                            <p className="text-sm text-[#7B6FA0] mt-1.5 leading-relaxed">{suggestion.description}</p>
                            <button
                              onClick={() => applySuggestion(suggestion)}
                              className="mt-3 flex items-center gap-1.5 text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors group/btn"
                            >
                              Start this campaign
                              <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-sm">No suggestions available — try creating a campaign manually.</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-purple-100/60 flex items-center justify-between">
              <p className="text-xs text-[#9B8EC4]">Suggestions are based on your current lead data.</p>
              <button
                onClick={() => setShowSuggestModal(false)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Template library modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-purple-100/60">
              <div>
                <h3 className="font-bold text-gray-900 text-lg">Campaign Templates</h3>
                <p className="text-sm text-[#9B8EC4] mt-0.5">Pick a template to pre-configure your campaign strategy.</p>
              </div>
              <button onClick={() => setShowTemplates(false)} className="text-[#9B8EC4] hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CAMPAIGN_TEMPLATES.map(template => {
                const Icon = template.icon
                return (
                  <button
                    key={template.id}
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowTemplates(false)
                      setShowCreate(true)
                      setNewName(template.name)
                    }}
                    className="text-left p-4 rounded-xl border border-purple-100/60 hover:border-[#7C3AED]/30 hover:bg-[#F5F0FF]/30 transition-all group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[#7C3AED]/8 group-hover:bg-[#7C3AED]/15 flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="w-4.5 h-4.5 text-[#7C3AED]" style={{ width: '18px', height: '18px' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-sm text-gray-900">{template.name}</p>
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-[#7C3AED] transition-colors shrink-0" />
                        </div>
                        <p className="text-xs text-[#7B6FA0] mt-0.5 leading-relaxed">{template.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tags.map(tag => (
                            <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[#7B6FA0] font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
            <div className="px-6 py-4 border-t border-purple-100/60 flex items-center justify-between">
              <p className="text-xs text-[#9B8EC4]">Or create a blank campaign without a template.</p>
              <button
                onClick={() => { setShowTemplates(false); setShowCreate(true) }}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                Skip template →
              </button>
            </div>
          </div>
        </div>
      )}

      {replyDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="font-semibold text-gray-900 mb-3">✨ AI-drafted follow-up</h3>
            <div className="bg-[#F5EEFF]/60 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4 max-h-64 overflow-y-auto">{replyDraft.draft}</div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(replyDraft.draft) }} className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">Copy to clipboard</button>
              <button onClick={() => setReplyDraft(null)} className="px-4 py-2.5 border border-purple-100/80 text-sm font-medium rounded-xl hover:border-gray-400 transition-colors">Close</button>
            </div>
            <p className="text-xs text-[#9B8EC4] mt-3 text-center">Review before sending. Add your name and signature.</p>
          </div>
        </div>
      )}

    </div>
  )
}
