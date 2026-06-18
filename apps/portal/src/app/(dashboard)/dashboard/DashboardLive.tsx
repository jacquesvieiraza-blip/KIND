'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Mail, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface DashboardLiveProps {
  clientId: string
  initialLeadCount: number
  initialTotalSent: number
  initialTotalReplies: number
  initialTotalInterested: number
  initialTotalMeetings: number
  initialActiveCampaignCount: number
  initialReplyRate: number
  initialSparkPoints: number[]
}

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null
  const max = Math.max(...points, 1)
  const w = 80, h = 28
  const step = w / (points.length - 1)
  const coords = points.map((v, i) => `${i * step},${h - (v / max) * h}`)
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={coords.join(' ')} />
    </svg>
  )
}

export function DashboardLive({
  clientId,
  initialLeadCount,
  initialTotalSent,
  initialTotalReplies,
  initialTotalInterested,
  initialTotalMeetings,
  initialActiveCampaignCount,
  initialReplyRate,
  initialSparkPoints,
}: DashboardLiveProps) {
  const [leadCount, setLeadCount] = useState(initialLeadCount)
  const [totalSent, setTotalSent] = useState(initialTotalSent)
  const [totalReplies, setTotalReplies] = useState(initialTotalReplies)
  const [totalInterested, setTotalInterested] = useState(initialTotalInterested)
  const [totalMeetings] = useState(initialTotalMeetings)
  const [activeCampaignCount, setActiveCampaignCount] = useState(initialActiveCampaignCount)
  const [replyRate, setReplyRate] = useState(initialReplyRate)
  const [sparkPoints, setSparkPoints] = useState(initialSparkPoints)

  useEffect(() => {
    if (!clientId) return
    const supabase = createClient()

    const refetchLeads = async () => {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
      if (count !== null) setLeadCount(count)
    }

    const refetchEmails = async () => {
      const { count } = await supabase
        .from('figsy_sent_emails')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId)
      if (count !== null) {
        setTotalSent(count)
        setReplyRate(count > 0 ? Math.round((totalReplies / count) * 100) : 0)
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        const { data: sparkData } = await supabase
          .from('figsy_sent_emails')
          .select('sent_at')
          .eq('client_id', clientId)
          .gte('sent_at', sevenDaysAgo)
        const dayMap: Record<string, number> = {}
        for (let i = 6; i >= 0; i--) {
          const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          dayMap[d.toISOString().split('T')[0]] = 0
        }
        for (const row of sparkData ?? []) {
          const key = (row.sent_at as string).split('T')[0]
          if (key in dayMap) dayMap[key]++
        }
        setSparkPoints(Object.values(dayMap))
      }
    }

    const refetchCampaigns = async () => {
      const { data } = await supabase
        .from('figsy_campaigns')
        .select('status')
        .eq('client_id', clientId)
      if (data) setActiveCampaignCount(data.filter(c => c.status === 'active').length)
    }

    const refetchReplies = async () => {
      const [repliesRes, emailsRes] = await Promise.all([
        supabase.from('figsy_replies').select('classification').eq('client_id', clientId),
        supabase.from('figsy_sent_emails').select('*', { count: 'exact', head: true }).eq('client_id', clientId),
      ])
      if (repliesRes.data) {
        const total = repliesRes.data.length
        const interested = repliesRes.data.filter(r => r.classification === 'interested' || r.classification === 'hot').length
        const sentCount = emailsRes.count ?? 0
        setTotalReplies(total)
        setTotalInterested(interested)
        // Use freshly-fetched sentCount — not the stale closure value of totalSent
        setReplyRate(sentCount > 0 ? Math.round((total / sentCount) * 100) : 0)
      }
    }

    const channel = supabase
      .channel('dashboard-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, () => { refetchLeads() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'leads', filter: `client_id=eq.${clientId}` }, () => { refetchLeads() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'figsy_sent_emails', filter: `client_id=eq.${clientId}` }, () => { refetchEmails() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'figsy_sent_emails', filter: `client_id=eq.${clientId}` }, () => { refetchEmails() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'figsy_campaigns', filter: `client_id=eq.${clientId}` }, () => { refetchCampaigns() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'figsy_campaigns', filter: `client_id=eq.${clientId}` }, () => { refetchCampaigns() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'figsy_campaigns', filter: `client_id=eq.${clientId}` }, () => { refetchCampaigns() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'figsy_replies', filter: `client_id=eq.${clientId}` }, () => { refetchReplies() })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'figsy_replies', filter: `client_id=eq.${clientId}` }, () => { refetchReplies() })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [clientId])

  if (totalSent === 0) return null

  const bookingRate = totalSent > 0 ? ((totalMeetings / totalSent) * 100).toFixed(1) : '0.0'

  const stats = [
    { label: 'Emails sent',     value: totalSent.toLocaleString(),       color: 'text-slate-700',   bg: 'bg-white',          border: 'border-[#EDE9FE]',    trend: sparkPoints, trendColor: '#7C3AED' },
    { label: 'Reply rate',      value: `${replyRate}%`,                  color: replyRate >= 8 ? 'text-emerald-600' : 'text-slate-700', bg: replyRate >= 8 ? 'bg-emerald-50/50' : 'bg-white', border: replyRate >= 8 ? 'border-emerald-200' : 'border-[#EDE9FE]', sub: replyRate >= 8 ? '↑ above avg' : 'avg 8%' },
    { label: 'Interested',      value: totalInterested.toLocaleString(), color: 'text-amber-600',   bg: totalInterested > 0 ? 'bg-amber-50/40' : 'bg-white', border: totalInterested > 0 ? 'border-amber-200' : 'border-[#EDE9FE]', sub: 'warm leads' },
    { label: 'Meetings booked', value: totalMeetings.toLocaleString(),   color: 'text-[#7C3AED]',   bg: totalMeetings > 0 ? 'bg-[#F5F0FF]' : 'bg-white',    border: 'border-[#EDE9FE]', sub: `Industry avg: 3–5%` },
  ] as { label: string; value: string; color: string; bg: string; border: string; sub?: string; trend?: number[]; trendColor?: string }[]

  return (
    <>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-medium text-emerald-600">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(({ label, value, color, bg, border, sub, trend, trendColor }) => (
          <div key={label} className={`rounded-xl border ${bg} ${border} px-4 py-3 flex flex-col gap-1`}>
            <p className="text-[11px] text-slate-400 font-medium">{label}</p>
            <div className="flex items-end justify-between gap-1">
              <p className={`text-2xl font-bold tracking-tight leading-none ${color}`}>{value}</p>
              {trend && trendColor && <MiniSparkline points={trend} color={trendColor} />}
            </div>
            {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#EDE9FE] px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span className="text-xs font-semibold text-slate-500">Pipeline</span>
            </div>
            {[
              { label: 'Total leads',  value: leadCount.toLocaleString() },
              { label: 'Emails sent',  value: totalSent.toLocaleString() },
              { label: 'Replies',      value: totalReplies.toLocaleString() },
              { label: 'Interested',   value: totalInterested.toLocaleString() },
              { label: 'Meetings',     value: totalMeetings.toLocaleString() },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-[#1E0A5C]">{value}</span>
                <span className="text-xs text-slate-400">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/dashboard/kpis" className="text-xs text-[#7C3AED] font-semibold hover:underline flex items-center gap-0.5">
              Full report <ArrowRight className="w-3 h-3" />
            </Link>
            <Link href="/dashboard/inbox" className="text-xs text-[#7C3AED] font-semibold hover:underline flex items-center gap-0.5">
              <Mail className="w-3 h-3" /> Inbox
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
