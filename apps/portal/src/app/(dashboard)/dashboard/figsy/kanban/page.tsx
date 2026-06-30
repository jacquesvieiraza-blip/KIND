'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, ArrowLeft, Users, Mail, MessageSquare, CheckCircle2, XCircle } from 'lucide-react'

interface KanbanLead {
  id: string
  enrollment_id: string
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
  { key: 'enrolled',   label: 'Enrolled',    icon: Users,          color: 'border-brand-100 bg-brand-50/40',       dot: 'bg-[#9B8EC4]',     count: 'text-[#7B6FA0]',    droppable: false },
  { key: 'step1_sent', label: 'Step 1 Sent', icon: Mail,           color: 'border-brand-200/70 bg-brand-50/60',    dot: 'bg-brand-300',     count: 'text-brand-600',    droppable: false },
  { key: 'step2_sent', label: 'Step 2 Sent', icon: Mail,           color: 'border-brand-200 bg-[#F5EEFF]/70',      dot: 'bg-brand-400',     count: 'text-brand-600',    droppable: false },
  { key: 'step3_sent', label: 'Step 3 Sent', icon: Mail,           color: 'border-brand-300/70 bg-[#F0E8FF]/80',   dot: 'bg-brand-500',     count: 'text-brand-700',    droppable: false },
  { key: 'replied',    label: 'Replied',     icon: MessageSquare,  color: 'border-emerald-200/70 bg-emerald-50/50', dot: 'bg-emerald-500',   count: 'text-emerald-600',  droppable: true  },
  { key: 'completed',  label: 'Completed',   icon: CheckCircle2,   color: 'border-gray-200 bg-gray-50/60',         dot: 'bg-gray-300',      count: 'text-gray-500',     droppable: true  },
] as const

type ColKey = typeof COLUMNS[number]['key']

function LeadCard({ lead, onDragStart }: { lead: KanbanLead; onDragStart: (e: React.DragEvent, lead: KanbanLead) => void }) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, lead)}
      className="bg-white rounded-xl border border-gray-100 px-3 py-2.5 shadow-sm hover:shadow-md hover:border-brand-200 hover:-translate-y-px transition-all cursor-grab active:cursor-grabbing active:opacity-60 active:scale-95"
    >
      <p className="text-sm font-semibold text-gray-900 truncate leading-snug">{lead.first_name} {lead.last_name}</p>
      {lead.job_title && <p className="text-xs text-[#7B6FA0] truncate mt-0.5 leading-snug">{lead.job_title}</p>}
      {lead.company && <p className="text-xs text-gray-500 truncate leading-snug">{lead.company}</p>}
      {lead.next_send_at && new Date(lead.next_send_at) > new Date() && (
        <p className="text-[10px] font-medium text-brand-500/80 mt-1.5">
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
  const [dragOver, setDragOver] = useState<ColKey | null>(null)
  const dragLead = useRef<KanbanLead | null>(null)

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

  function handleDragStart(e: React.DragEvent, lead: KanbanLead) {
    dragLead.current = lead
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e: React.DragEvent, colKey: ColKey) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colKey)
  }

  async function handleDrop(e: React.DragEvent, colKey: ColKey) {
    e.preventDefault()
    setDragOver(null)
    const lead = dragLead.current
    dragLead.current = null
    if (!lead || !token || !data) return
    if (lead.status === colKey) return

    // Optimistic update
    setData(prev => {
      if (!prev) return prev
      const next = { ...prev, columns: { ...prev.columns } }
      const fromKey = Object.keys(next.columns).find(k =>
        (next.columns as Record<string, KanbanLead[]>)[k].some(l => l.enrollment_id === lead.enrollment_id)
      ) as ColKey | undefined
      if (fromKey) {
        next.columns = {
          ...next.columns,
          [fromKey]: (next.columns as Record<string, KanbanLead[]>)[fromKey].filter(l => l.enrollment_id !== lead.enrollment_id),
          [colKey]: [...(next.columns as Record<string, KanbanLead[]>)[colKey], { ...lead, status: colKey }],
        }
      }
      return next
    })

    try {
      await api.patch(`/figsy/enrollments/${lead.enrollment_id}/status`, { status: colKey }, token)
    } catch {
      // Revert on failure
      api.get<{ data: KanbanData }>(`/figsy/campaigns/${selectedCampaign}/kanban`, token)
        .then(res => setData(res.data))
        .catch(() => {})
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAFBFF] to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center gap-3 mb-6">
          <a href="/dashboard/figsy" className="text-[#9B8EC4] hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Sequence Pipeline</h1>
            <p className="text-sm text-[#7B6FA0]">Track every lead · drag to <span className="font-medium text-emerald-600">Replied</span> or <span className="font-medium text-gray-500">Completed</span> to mark manually</p>
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
            <div className="flex gap-3 overflow-x-auto pb-4 -mx-1 px-1">
              {COLUMNS.map(col => {
                const leads = (data.columns as Record<string, KanbanLead[]>)[col.key] ?? []
                const Icon = col.icon
                const isOver = dragOver === col.key
                return (
                  <div
                    key={col.key}
                    className="flex-shrink-0 w-56"
                    onDragOver={col.droppable ? e => handleDragOver(e, col.key) : e => e.preventDefault()}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={col.droppable ? e => handleDrop(e, col.key) : undefined}
                  >
                    <div className={`rounded-2xl border p-3 h-full transition-all ${col.color} ${isOver ? 'ring-2 ring-offset-1 ring-emerald-400 scale-[1.02]' : ''}`}>
                      <div className="flex items-center justify-between mb-3 px-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${col.dot}`} />
                          <Icon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="text-xs font-semibold text-gray-700 truncate">{col.label}</span>
                        </div>
                        <span className={`text-[11px] font-bold ${col.count} bg-white/90 px-1.5 py-0.5 rounded-full border border-white/80 shadow-sm flex-shrink-0`}>
                          {leads.length}
                        </span>
                      </div>
                      {col.droppable && (
                        <p className="text-[10px] text-gray-400 mb-2 text-center">Drop here to mark</p>
                      )}
                      <div className="space-y-2 min-h-[3rem] max-h-[62vh] overflow-y-auto pr-0.5">
                        {leads.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-6 text-center">
                            <Icon className="w-5 h-5 text-gray-300/70 mb-1.5" />
                            <p className="text-[11px] text-gray-400">No leads here yet</p>
                          </div>
                        ) : (
                          leads.map(lead => (
                            <LeadCard key={lead.enrollment_id} lead={lead} onDragStart={handleDragStart} />
                          ))
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
