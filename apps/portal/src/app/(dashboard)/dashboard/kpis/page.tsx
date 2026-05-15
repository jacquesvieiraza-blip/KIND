'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, Send, MessageSquare, ThumbsUp, MinusCircle, Users, Star } from 'lucide-react'

interface KPIs {
  totalSent: number
  totalReplied: number
  replyRate: number
  interested: number
  interestedRate: number
  optOuts: number
  activeCampaigns: number
  totalLeads: number
  leadsContacted: number
  avgScore: number
}

export default function KPIsPage() {
  const supabase = createClient()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      try {
        const res = await api.get<{ success: boolean; data: KPIs }>('/figsy/kpis', session.access_token)
        setKpis(res.data)
      } catch { }
      setLoading(false)
    })
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-brand-500" />
      </div>
    )
  }

  const k = kpis ?? {
    totalSent: 0, totalReplied: 0, replyRate: 0, interested: 0,
    interestedRate: 0, optOuts: 0, activeCampaigns: 0,
    totalLeads: 0, leadsContacted: 0, avgScore: 0,
  }

  const oneInEvery = k.interested > 0 ? Math.round(k.totalReplied / k.interested) : null

  const statCards = [
    {
      label: 'Total emails sent',
      value: k.totalSent.toLocaleString(),
      icon: <Send className="w-5 h-5" />,
      color: 'bg-blue-50 text-blue-600',
      highlight: false,
    },
    {
      label: 'Reply rate',
      value: `${(k.replyRate * 100).toFixed(1)}%`,
      icon: <MessageSquare className="w-5 h-5" />,
      color: 'bg-indigo-50 text-indigo-600',
      highlight: false,
    },
    {
      label: 'Interested replies',
      value: k.interested.toLocaleString(),
      icon: <ThumbsUp className="w-5 h-5" />,
      color: k.interested > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-400',
      highlight: k.interested > 0,
    },
    {
      label: 'Opt-outs',
      value: k.optOuts.toLocaleString(),
      icon: <MinusCircle className="w-5 h-5" />,
      color: 'bg-gray-50 text-gray-400',
      highlight: false,
    },
    {
      label: 'Total leads in pipeline',
      value: k.totalLeads.toLocaleString(),
      icon: <Users className="w-5 h-5" />,
      color: 'bg-purple-50 text-purple-600',
      highlight: false,
    },
    {
      label: 'Avg lead score',
      value: Math.round(k.avgScore).toString(),
      icon: <Star className="w-5 h-5" />,
      color: 'bg-amber-50 text-amber-600',
      highlight: false,
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">KPI Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Live performance metrics across FIGSY campaigns and your lead pipeline.
        </p>
      </div>

      {/* Stat cards — 3-column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map(({ label, value, icon, color, highlight }) => (
          <div
            key={label}
            className={`bg-white rounded-xl border p-5 ${highlight ? 'border-green-200' : 'border-gray-100'}`}
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
              {icon}
            </div>
            <p className={`text-2xl font-bold ${highlight ? 'text-green-700' : 'text-gray-900'}`}>{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Insight lines */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Insights</h2>
        <p className="text-sm text-gray-700">
          FIGSY has contacted{' '}
          <span className="font-semibold text-gray-900">{k.leadsContacted.toLocaleString()}</span>
          {' '}of your{' '}
          <span className="font-semibold text-gray-900">{k.totalLeads.toLocaleString()}</span>
          {' '}leads.
        </p>
        <p className="text-sm text-gray-700">
          {oneInEvery !== null
            ? <>1 in every <span className="font-semibold text-gray-900">{oneInEvery}</span> replies is a warm lead.</>
            : <>— No interested replies yet. Keep sending!</>
          }
        </p>
      </div>
    </div>
  )
}
