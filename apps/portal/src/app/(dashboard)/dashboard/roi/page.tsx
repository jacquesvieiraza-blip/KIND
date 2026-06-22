'use client'

// ── Item 191 — ROI / value dashboard ("What K.I.N.D did for you") ──────────────
// A per-client, READ-ONLY surface that totals the real value K.I.N.D delivered:
// leads delivered · meetings booked · replies · pipeline touched · $ value, plus a
// monthly "here's your return" recap.
//
// Every number here is sourced from an EXISTING endpoint — no metric is invented:
//   • /leads/stats     → leads delivered (total), pipeline value (pipeline_value_usd)
//   • /figsy/kpis      → emails sent, replies, positive replies, meetings booked, leads contacted
//   • /leads/analytics → byMonth[] (leads / emails / opened / replies / interested) for the recap
// If a metric has no real source it is OMITTED rather than faked (rulebook: no invented data).

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import {
  Loader2, Users, Calendar, MessageSquare, ThumbsUp, DollarSign,
  TrendingUp, Send, Sparkles, ArrowRight,
} from 'lucide-react'

// ── Types (mirror the existing endpoints exactly) ─────────────────────────────
interface LeadStats {
  total: number
  scored: number
  consented: number
  exported: number
  opted_out: number
  avg_score: number
  pipeline_value_usd: number
}

interface FigsyKPIs {
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
  meetingsBooked?: number
  meetingBookedRate?: number
  totalOpened?: number
  openRate?: number
  period?: string
}

interface MonthPoint {
  month:      string
  leads:      number
  emails:     number
  opened:     number
  replies:    number
  interested: number
}

interface AnalyticsData {
  byMonth: MonthPoint[]
}

// ── $ formatting (matches the KPIs page convention) ───────────────────────────
function fmtUsd(v: number): string {
  if (v <= 0) return '$0'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `$${Math.round(v / 1000)}k`
  return `$${Math.round(v)}`
}

// ── Headline value card ───────────────────────────────────────────────────────
function ValueCard({
  label, value, sub, icon, hero = false,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ReactNode
  hero?: boolean
}) {
  if (hero) {
    return (
      <div className="col-span-full sm:col-span-2 rounded-2xl border-2 border-[#7C3AED]/20 bg-[#F5F0FF] p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-[#7C3AED] uppercase tracking-wider mb-1">{label}</p>
            <p className="text-4xl font-bold text-[#1E0A5C]">{value}</p>
            {sub && <p className="text-sm text-[#7C3AED]/70 mt-1">{sub}</p>}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-purple-100/60 bg-white p-5">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[#7C3AED]/10 text-[#7C3AED] mb-3">
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
      {sub && <p className="text-xs text-[#9B8EC4] mt-1">{sub}</p>}
    </div>
  )
}

export default function RoiPage() {
  const supabase = createClient()
  const [leads, setLeads]   = useState<LeadStats | null>(null)
  const [figsy, setFigsy]   = useState<FigsyKPIs | null>(null)
  const [months, setMonths] = useState<MonthPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return }
      const tok = session.access_token
      // allSettled so one failing call doesn't blank the whole surface.
      const [statsRes, kpisRes, analyticsRes] = await Promise.allSettled([
        api.get<{ success: boolean; data: LeadStats }>('/leads/stats', tok),
        api.get<{ success: boolean; data: FigsyKPIs }>('/figsy/kpis?period=all', tok),
        api.get<{ data: AnalyticsData }>('/leads/analytics', tok),
      ])
      if (statsRes.status === 'fulfilled')     setLeads(statsRes.value.data)
      if (kpisRes.status === 'fulfilled')      setFigsy(kpisRes.value.data)
      if (analyticsRes.status === 'fulfilled') setMonths(analyticsRes.value.data.byMonth ?? [])
      setLoading(false)
    })
  }, [supabase])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-[#7C3AED]" />
      </div>
    )
  }

  const l: LeadStats = leads ?? { total: 0, scored: 0, consented: 0, exported: 0, opted_out: 0, avg_score: 0, pipeline_value_usd: 0 }
  const f: FigsyKPIs = figsy ?? { totalSent: 0, totalReplied: 0, replyRate: 0, interested: 0, interestedRate: 0, optOuts: 0, activeCampaigns: 0, totalLeads: 0, leadsContacted: 0, avgScore: 0 }

  const meetingsBooked = f.meetingsBooked ?? 0
  const pipelineValue  = fmtUsd(l.pipeline_value_usd)
  const hasAnyValue    = l.total > 0 || f.totalSent > 0 || f.totalReplied > 0 || meetingsBooked > 0 || l.pipeline_value_usd > 0

  // ── Latest active month for the "here's your return" recap. ─────────────────
  // byMonth is oldest→newest; pick the most recent month that has any activity,
  // else fall back to the last bucket so the recap still renders a (zero) month.
  const recapMonth: MonthPoint | null = months.length
    ? ([...months].reverse().find(m => m.leads + m.emails + m.replies + m.interested > 0) ?? months[months.length - 1])
    : null

  const recapHasData = !!recapMonth && (recapMonth.leads + recapMonth.emails + recapMonth.replies + recapMonth.interested) > 0

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#7C3AED]" />
          <h1 className="text-2xl font-bold text-gray-900">What K.I.N.D did for you</h1>
        </div>
        <p className="text-[#7B6FA0] text-sm mt-1">
          Your return on K.I.N.D — every lead delivered, reply earned, meeting booked and dollar of pipeline touched, all time.
        </p>
      </div>

      {!hasAnyValue ? (
        <div className="rounded-2xl border border-purple-100/60 bg-white p-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-[#7C3AED]" />
          </div>
          <p className="text-gray-900 font-semibold">Your return is just getting started</p>
          <p className="text-sm text-[#7B6FA0] mt-1 max-w-md mx-auto">
            Once K.I.N.D delivers leads and FIGSY starts outreach, this page totals the real value created for you — leads, replies, meetings and pipeline.
          </p>
          <a href="/dashboard/figsy-chat"
            className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-sm font-semibold text-white bg-[#7C3AED] hover:bg-[#6D28D9] rounded-xl transition-colors">
            Start with FIGSY <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      ) : (
        <>
          {/* Headline value grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ValueCard
              hero
              label="Pipeline value touched"
              value={pipelineValue}
              sub={l.pipeline_value_usd > 0 ? 'Estimated deal value across delivered leads' : 'No estimated value yet'}
              icon={<DollarSign className="w-6 h-6 text-[#7C3AED]" />}
            />
            <ValueCard
              label="Leads delivered"
              value={l.total.toLocaleString()}
              sub="Sourced & delivered to you"
              icon={<Users className="w-4 h-4" />}
            />
            <ValueCard
              label="Meetings booked"
              value={meetingsBooked.toLocaleString()}
              sub={meetingsBooked > 0 ? 'Real bookings from outreach' : 'None booked yet'}
              icon={<Calendar className="w-4 h-4" />}
            />
            <ValueCard
              label="Replies earned"
              value={f.totalReplied.toLocaleString()}
              sub={f.totalSent > 0 ? `${(f.replyRate * 100).toFixed(1)}% reply rate` : 'No replies yet'}
              icon={<MessageSquare className="w-4 h-4" />}
            />
            <ValueCard
              label="Positive replies"
              value={f.interested.toLocaleString()}
              sub={f.totalSent > 0 ? `${(f.interestedRate * 100).toFixed(1)}% of sent` : 'Warm interest'}
              icon={<ThumbsUp className="w-4 h-4" />}
            />
            <ValueCard
              label="Outreach sent"
              value={f.totalSent.toLocaleString()}
              sub="Personalised emails FIGSY sent for you"
              icon={<Send className="w-4 h-4" />}
            />
            <ValueCard
              label="Leads contacted"
              value={f.leadsContacted.toLocaleString()}
              sub="Put into active outreach"
              icon={<Users className="w-4 h-4" />}
            />
          </div>

          {/* "Here's your return" — monthly recap */}
          <div className="rounded-2xl border border-purple-200/60 bg-gradient-to-br from-[#F5F0FF]/60 to-white p-6">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#7C3AED]" />
              <h2 className="text-sm font-bold text-gray-900">Here&apos;s your return</h2>
              {recapMonth && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED]">
                  {recapMonth.month}
                </span>
              )}
            </div>

            {recapHasData && recapMonth ? (
              <>
                <p className="text-sm text-[#7B6FA0] mb-4">
                  In <span className="font-semibold text-gray-900">{recapMonth.month}</span>, here&apos;s what K.I.N.D delivered for you.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: 'Leads delivered',  value: recapMonth.leads },
                    { label: 'Emails sent',      value: recapMonth.emails },
                    { label: 'Replies',          value: recapMonth.replies },
                    { label: 'Positive replies', value: recapMonth.interested },
                  ].map(s => (
                    <div key={s.label}>
                      <p className="text-2xl font-bold text-[#1E0A5C]">{s.value.toLocaleString()}</p>
                      <p className="text-xs text-[#7B6FA0] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* 6-month trend strip — leads + replies per month (real byMonth data) */}
                <div className="mt-6">
                  <p className="text-xs font-semibold text-[#9B8EC4] uppercase tracking-wider mb-3">Last 6 months</p>
                  <div className="space-y-2.5">
                    {months.map(m => {
                      const max = Math.max(...months.map(x => Math.max(x.leads, x.replies)), 1)
                      const leadW  = Math.max(Math.round((m.leads / max) * 100), m.leads > 0 ? 3 : 0)
                      const replyW = Math.max(Math.round((m.replies / max) * 100), m.replies > 0 ? 3 : 0)
                      return (
                        <div key={m.month} className="flex items-center gap-3">
                          <span className="w-14 text-right text-xs text-[#7B6FA0] shrink-0">{m.month}</span>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#7C3AED] rounded-full" style={{ width: `${leadW}%` }} />
                              </div>
                              <span className="text-[11px] text-gray-600 w-16 shrink-0">{m.leads} leads</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-green-400 rounded-full" style={{ width: `${replyW}%` }} />
                              </div>
                              <span className="text-[11px] text-gray-600 w-16 shrink-0">{m.replies} replies</span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-[#7B6FA0]">
                No monthly activity yet — once leads are delivered and FIGSY sends outreach, your monthly return shows up here.
              </p>
            )}
          </div>

          {/* Plain-English summary line — only facts already shown above */}
          <div className="rounded-xl border border-purple-100/60 bg-white p-5">
            <p className="text-sm text-gray-700 leading-relaxed">
              All time, K.I.N.D delivered <span className="font-bold text-gray-900">{l.total.toLocaleString()}</span> lead{l.total !== 1 ? 's' : ''} and FIGSY sent{' '}
              <span className="font-bold text-gray-900">{f.totalSent.toLocaleString()}</span> personalised email{f.totalSent !== 1 ? 's' : ''} on your behalf, earning{' '}
              <span className="font-bold text-gray-900">{f.totalReplied.toLocaleString()}</span> repl{f.totalReplied !== 1 ? 'ies' : 'y'}
              {f.interested > 0 && <> (<span className="font-bold text-green-700">{f.interested.toLocaleString()}</span> positive)</>}
              {meetingsBooked > 0 && <> and <span className="font-bold text-gray-900">{meetingsBooked.toLocaleString()}</span> booked meeting{meetingsBooked !== 1 ? 's' : ''}</>}.
              {l.pipeline_value_usd > 0 && <> That&apos;s an estimated <span className="font-bold text-green-700">{pipelineValue}</span> of pipeline value touched.</>}
            </p>
          </div>

          <p className="text-[11px] text-[#9B8EC4]">
            All figures are live totals from your account. Pipeline value is the estimated deal value across delivered leads; metrics with no data source are omitted rather than estimated.
          </p>
        </>
      )}
    </div>
  )
}
