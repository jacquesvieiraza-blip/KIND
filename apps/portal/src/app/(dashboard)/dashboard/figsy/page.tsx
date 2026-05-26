'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { VoiceMicButton } from '@/components/VoiceMicButton'

interface Reply {
  id: string
  from_email: string
  body: string
  classification: 'interested' | 'not_now' | 'opt_out' | 'out_of_office' | 'other'
  received_at: string
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
  campaign_intent?: string | null
  intent_mapped_at?: string | null
}

interface ParsedIntent {
  geography_focus: string | null
  job_title_focus: string | null
  pain_point: string | null
  trigger_event: string | null
  avoid: string | null
  summary: string
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
  completed:              'bg-blue-100 text-blue-700',
  archived:               'bg-gray-100 text-gray-400',
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIntent, setNewIntent] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [hasFigsySub, setHasFigsySub] = useState(true)
  const [hasfigsyAccess, setHasfigsyAccess] = useState<boolean | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<string | null>(null)
  const [campaignReplies, setCampaignReplies] = useState<Record<string, Reply[]>>({})
  const [replyDraft, setReplyDraft] = useState<{ replyId: string; draft: string } | null>(null)
  const [draftingId, setDraftingId] = useState<string | null>(null)
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [campaignIntentFlag, setCampaignIntentFlag] = useState(false)
  const [intentSummaries, setIntentSummaries] = useState<Record<string, ParsedIntent>>({})
  const [parsingIntentId, setParsingIntentId] = useState<string | null>(null)

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { setHasfigsyAccess(false); return }
      api.get<{ success: boolean; data: { balance: number; transactions: { plan: string | null }[] } }>('/credits', session.access_token)
        .then(res => {
          const hasFigsyTx = (res.data?.transactions ?? []).some(t => t.plan === 'figsy')
          setHasfigsyAccess(hasFigsyTx)
        })
        .catch(() => setHasfigsyAccess(false))
    })
  }, [supabase])

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

  async function parseIntent(campaignId: string, intent: string, token: string | undefined) {
    setParsingIntentId(campaignId)
    try {
      const res = await api.post<{ success: boolean; data: { parsed: ParsedIntent; summary: string } }>(
        `/figsy/campaigns/${campaignId}/parse-intent`,
        { intent },
        token,
      )
      setIntentSummaries(prev => ({ ...prev, [campaignId]: res.data.parsed }))
    } catch {
      // silently ignore parse errors — the intent is still saved
    }
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

  const activeCampaign = campaigns.find(c => c.status === 'active')

  /* ── Upgrade wall ─────────────────────────────────────────────── */
  if (!loading && !hasFigsySub) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 max-w-lg w-full p-8 text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Unlock FIGSY — Your AI Outreach Agent
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-5">
            From R 60 / 20 outreach credits
          </p>

          {/* CTAs */}
          <div className="flex flex-col gap-3">
            <a
              href="/dashboard/billing"
              className="inline-block w-full bg-[#0066FF] hover:bg-blue-700 text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors text-center"
            >
              Upgrade to FIGSY →
            </a>
            <a
              href="https://calendly.com/jacques-vieiraza/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold rounded-xl px-6 py-3 text-sm transition-colors text-center border border-gray-200"
            >
              Book a demo
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (hasfigsyAccess === null) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <p className="text-sm text-gray-400">Loading…</p>
    </div>
  )

  if (!hasfigsyAccess) return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#001f4d] flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
          </div>
          <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            Upgrade to unlock
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">FIGSY — AI SDR</h1>
          <p className="text-gray-500 text-sm">Autonomous outreach, follow-up and meeting booking. Your free trial includes Lead Gen. Purchase FIGSY credits to activate AI outreach.</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-5 mb-6 space-y-3">
          {[
            'Personalised emails written by AI',
            '3-step automated follow-up sequences',
            'Reply detection and classification',
            'Auto-books meetings in your calendar',
          ].map(f => (
            <div key={f} className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              </div>
              {f}
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl p-4 mb-5 flex justify-between items-center">
          <div>
            <p className="text-sm font-semibold text-gray-900">FIGSY Credits</p>
            <p className="text-xs text-gray-500 mt-0.5">20 outreach credits — $60</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-900">$60</p>
            <p className="text-xs text-gray-400">per 20 credits</p>
          </div>
        </div>
        <div className="space-y-3">
          <a href="/dashboard/billing" className="flex items-center justify-center gap-2 w-full bg-[#001f4d] hover:bg-[#002a6e] text-white font-semibold rounded-xl px-6 py-3 text-sm transition-colors">
            Buy FIGSY Credits →
          </a>
          <a href="/dashboard/billing" className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:border-gray-300 rounded-xl px-6 py-3 text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Request a Demo instead
          </a>
        </div>
        <p className="text-xs text-gray-400 text-center mt-4">Credits never expire · 1 credit = 1 personalised outreach sequence</p>
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-4xl">
      {/* FIGSY Agent Identity Card */}
      <div className="bg-gradient-to-br from-[#001f4d] to-[#003080] rounded-2xl p-6 mb-6 flex items-start gap-5">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-2xl">
            🤖
          </div>
          {/* green pulse dot */}
          <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-[#001f4d]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-white font-bold text-lg tracking-tight">FIGSY</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 border border-green-400/20">
              Active
            </span>
          </div>
          <p className="text-white/40 text-xs mb-4">Your AI outreach agent — running 24/7 on your behalf</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-white/30 text-xs mb-1">Active campaigns</p>
              <p className="text-white font-bold text-lg">{campaigns.filter(c => c.status === 'active').length}</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-white/30 text-xs mb-1">Emails sent</p>
              <p className="text-white font-bold text-lg">{campaigns.reduce((s, c) => s + c.emails_sent, 0).toLocaleString()}</p>
            </div>
            <div className="bg-white/5 rounded-xl px-4 py-3">
              <p className="text-white/30 text-xs mb-1">Interested replies</p>
              <p className="text-white font-bold text-lg">{campaigns.reduce((s, c) => s + c.replies_interested, 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🤖 FIGSY <span className="text-sm font-normal text-gray-400 ml-1">— AI SDR</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Automated outreach sequences for your scored, consented leads.
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New campaign
        </button>
      </div>

      {/* --- removed old inline upgrade banner (replaced by full-page wall above) --- */}

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">New campaign</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div className="flex gap-3">
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Campaign name (e.g. Q2 SaaS CTO Outreach)"
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                autoFocus
              />
            </div>
            {campaignIntentFlag && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  What are we hunting? <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <textarea
                    value={newIntent}
                    onChange={e => setNewIntent(e.target.value)}
                    placeholder="e.g. CFOs at logistics companies in Nigeria struggling with manual month-end reporting — avoid anyone I've already emailed this quarter"
                    rows={3}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
                  />
                  <VoiceMicButton
                    onTranscript={text => setNewIntent(prev => prev ? `${prev} ${text}` : text)}
                  />
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(''); setNewIntent('') }}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-sm text-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
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
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">Loading campaigns…</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-sm font-medium text-red-600 mb-1">Could not load campaigns</p>
          <p className="text-xs text-gray-500 mb-4">{loadError}</p>
          <button onClick={loadCampaigns} className="px-4 py-2 bg-[#0066FF] text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Retry
          </button>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <span className="text-4xl mb-3 block">🤖</span>
          <p className="text-gray-600 font-medium mb-1">No campaigns yet</p>
          <p className="text-sm text-gray-400 mb-4">
            Create a campaign to start sending personalised outreach to your consented leads.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            + Create first campaign
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map(campaign => (
            <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{campaign.name}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[campaign.status]}`}>
                      {STATUS_LABELS[campaign.status]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Created {new Date(campaign.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                    className="px-3 py-1.5 bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-500 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
                    title="Clone campaign"
                  >
                    {cloningId === campaign.id ? '…' : 'Clone'}
                  </button>
                  {campaign.status !== 'active' && (
                    <button
                      onClick={() => handleDelete(campaign.id)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-500 text-xs font-medium rounded-lg transition-colors"
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
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-lg font-bold text-gray-900">{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>

              {/* How it works — only on draft campaigns */}
              {campaign.status === 'draft' && (
                <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs font-semibold text-blue-800 mb-2">How FIGSY works once you activate:</p>
                  <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                    <li>Every consented lead is automatically enrolled</li>
                    <li>Claude generates a personalised 3-step email sequence per lead</li>
                    <li>Step 1 sends immediately — step 2 after 4 days, step 3 after 9 days</li>
                    <li>Replies are classified: interested, not now, opt-out, OOO</li>
                    <li>Opt-outs are instantly suppressed across the whole platform</li>
                  </ol>
                </div>
              )}

              {/* Replies toggle */}
              <div className="mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    if (expandedReplies === campaign.id) { setExpandedReplies(null) }
                    else { setExpandedReplies(campaign.id); loadReplies(campaign.id) }
                  }}
                  className="text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
                >
                  {expandedReplies === campaign.id ? '▲' : '▼'} View replies ({campaign.replies_total ?? 0})
                </button>

                {expandedReplies === campaign.id && (
                  <div className="mt-3 space-y-2">
                    {!campaignReplies[campaign.id] ? (
                      <p className="text-xs text-gray-400">Loading…</p>
                    ) : campaignReplies[campaign.id].length === 0 ? (
                      <p className="text-xs text-gray-400">No replies yet.</p>
                    ) : (
                      campaignReplies[campaign.id].map(reply => (
                        <div key={reply.id} className={`rounded-lg px-3 py-2.5 text-xs border ${
                          reply.classification === 'interested' ? 'bg-green-50 border-green-200' :
                          reply.classification === 'opt_out'    ? 'bg-red-50 border-red-100' :
                          'bg-gray-50 border-gray-100'
                        }`}>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <span className="font-medium text-gray-800">{reply.from_email}</span>
                              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                                reply.classification === 'interested' ? 'bg-green-200 text-green-800' :
                                reply.classification === 'opt_out'    ? 'bg-red-200 text-red-700' :
                                'bg-gray-200 text-gray-600'
                              }`}>{reply.classification.replace('_', ' ')}</span>
                            </div>
                            {reply.classification === 'interested' && (
                              <button
                                onClick={() => draftFollowup(reply.id)}
                                disabled={draftingId === reply.id}
                                className="flex items-center gap-1 px-2 py-1 bg-white border border-green-300 text-green-700 rounded-md hover:bg-green-50 disabled:opacity-40 text-[11px] font-medium transition-colors shrink-0"
                              >
                                {draftingId === reply.id ? '…' : '✨ Draft reply'}
                              </button>
                            )}
                          </div>
                          <p className="text-gray-500 mt-1 leading-relaxed line-clamp-2">{reply.body.slice(0, 200)}</p>
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

      {replyDraft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="font-semibold text-gray-900 mb-3">✨ AI-drafted follow-up</h3>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap leading-relaxed mb-4 max-h-64 overflow-y-auto">{replyDraft.draft}</div>
            <div className="flex gap-3">
              <button onClick={() => { navigator.clipboard.writeText(replyDraft.draft) }} className="flex-1 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-colors">Copy to clipboard</button>
              <button onClick={() => setReplyDraft(null)} className="px-4 py-2.5 border border-gray-200 text-sm font-medium rounded-xl hover:border-gray-400 transition-colors">Close</button>
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">Review before sending. Add your name and signature.</p>
          </div>
        </div>
      )}
    </div>
  )
}
