'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, ArrowLeft, Users, Mail, MessageSquare, CheckCircle2, XCircle } from 'lucide-react'

interface KanbanLead {
  id: string
  first_name: string
  last_name: string
  company: string | null
  job_title: string | null
  current_step: number
  status: string
  enrolled_at: string
  next_send_at: string | null
}

interface KanbanData {
  campaign: { id: string; name: string }
  columns: {
    enrolled: KanbanLead[]
    step1_sent: KanbanLead[]
    step2_sent: KanbanLead[]
    step3_sent: KanbanLead[]
    replied: KanbanLead[]
    completed: KanbanLead[]
  }
}

const COLUMNS = [
  { key: 'enrolled',   label: 'Enrolled',    icon: Users,          color: 'border-gray-200 bg-gray-50',   dot: 'bg-gray-400' },
  { key: 'step1_sent', label: 'Step 1 Sent',  icon: Mail,           color: 'border-blue-100 bg-blue-50/30', dot: 'bg-blue-400' },
  { key: 'step2_sent', label: 'Step 2 Sent',  icon: Mail,           color: 'border-indigo-100 bg-indigo-50/30', dot: 'bg-indigo-400' },
  { key: 'step3_sent', label: 'Step 3 Sent',  icon: Mail,           color: 'border-purple-100 bg-purple-50/30', dot: 'bg-purple-400' },
  { key: 'replied',    label: 'Replied',       icon: MessageSquare,  color: 'border-green-100 bg-green-50/30', dot: 'bg-green-400' },
  { key: 'completed',  label: 'Completed',     icon: CheckCircle2,   color: 'border-gray-100 bg-gray-50/30', dot: 'bg-gray-300' },
] as const

function LeadCard({ lead }: { lead: KanbanLead }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md hover:border-purple-100 transition-all cursor-default">
      <p className="text-sm font-semibold text-gray-900 truncate">{lead.first_name} {lead.last_name}</p>
      {lead.job_title && <p className="text-xs text-[#9B8EC4] truncate mt-0.5">{lead.job_title}</p>}
      {lead.company && <p className="text-xs text-gray-500 truncate">{lead.company}</p>}
      {lead.next_send_at && new Date(lead.next_send_at) > new Date() && (
        <p className="text-[10px] text-[#9B8EC4] mt-1.5">
          Next: {new Date(lead.next_send_at).toLocaleDateString('en-ZA', { dateStyle: 'short' })}
        </p>
      )}
    </div>
  )
}

export default function KanbanPage() {
  const supabase = createClient()
  const [token, setToken] = useState<string | null>(null)
  const [campaigns, setCampaigns] = useState<{ id: string; name: string }[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<string>('')
  const [data, setData] = useState<KanbanData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return
      setToken(session.access_token)
      try {
        const res = await api.get<{ data: { id: string; name: string; status: string }[] }>(
          '/figsy/campaigns', session.access_token
        )
        const active = (res.data ?? []).filter(c => c.status !== 'archived')
        setCampaigns(active)
        if (active.length > 0) setSelectedCampaign(active[0].id)
      } catch {}
    })
  }, [])

  useEffect(() => {
    if (!selectedCampaign || !token) return
    setLoading(true)
    api.get<{ data: KanbanData }>(`/figsy/campaigns/${selectedCampaign}/kanban`, token)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [selectedCampaign, token])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBFF] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <a href="/dashboard/figsy" className="text-[#9B8EC4] hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Sequence Pipeline</h1>
            <p className="text-sm text-[#7B6FA0]">Track every lead through the FIGSY sequence</p>
          </div>
          {campaigns.length > 1 && (
            <select
              value={selectedCampaign}
              onChange={e => setSelectedCampaign(e.target.value)}
              className="border border-purple-100/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-white"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-6 h-6 text-[#7C3AED] animate-spin" />
          </div>
        ) : !data ? (
          <div className="text-center py-24">
            <XCircle className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">No campaign data available</p>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-700 mb-4">{data.campaign.name}</p>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {COLUMNS.map(col => {
                const leads = (data.columns as Record<string, KanbanLead[]>)[col.key] ?? []
                const Icon = col.icon
                return (
                  <div key={col.key} className="flex-shrink-0 w-52">
                    <div className={`rounded-2xl border p-3 ${col.color}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${col.dot}`} />
                          <span className="text-xs font-semibold text-gray-700">{col.label}</span>
                        </div>
                        <span className="text-xs font-bold text-gray-500 bg-white/80 px-1.5 py-0.5 rounded-full border border-gray-100">
                          {leads.length}
                        </span>
                      </div>
                      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                        {leads.length === 0 ? (
                          <p className="text-xs text-gray-300 text-center py-4">Empty</p>
                        ) : (
                          leads.map(lead => <LeadCard key={lead.id} lead={lead} />)
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
