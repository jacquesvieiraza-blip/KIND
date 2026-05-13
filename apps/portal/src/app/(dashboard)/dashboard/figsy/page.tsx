'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

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
}

const STATUS_LABELS: Record<string, string> = {
  draft:     'Draft',
  active:    'Active',
  paused:    'Paused',
  completed: 'Completed',
  archived:  'Archived',
}
const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-600',
  active:    'bg-green-100 text-green-700',
  paused:    'bg-amber-100 text-amber-700',
  completed: 'bg-blue-100 text-blue-700',
  archived:  'bg-gray-100 text-gray-400',
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
  const [showCreate, setShowCreate] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const toast = (msg: string) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3500)
  }

  const loadCampaigns = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      const res = await api.get<{ data: Campaign[] }>('/figsy/campaigns', token)
      setCampaigns(res.data ?? [])
    } catch {
      // silently ignore
    }
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadCampaigns() }, [loadCampaigns])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await api.post<{ data: Campaign }>('/figsy/campaigns', { name: newName.trim() }, session?.access_token)
      setCampaigns(prev => [res.data, ...prev])
      setNewName('')
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
      toast(err instanceof Error ? err.message : 'Failed to update campaign')
    }
    setUpdatingId(null)
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

  return (
    <div className="space-y-6 max-w-4xl">
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

      {/* Create form */}
      {showCreate && (
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">New campaign</h2>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Campaign name (e.g. Q2 SaaS CTO Outreach)"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
              autoFocus
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-4 py-2 bg-[#0066FF] hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => { setShowCreate(false); setNewName('') }}
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
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <p className="text-sm text-gray-400">Loading campaigns…</p>
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
    </div>
  )
}
