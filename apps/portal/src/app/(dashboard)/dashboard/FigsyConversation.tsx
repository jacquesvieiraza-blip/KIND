'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, TrendingUp, Target, Inbox } from 'lucide-react'
import Link from 'next/link'

interface TopLead {
  id: string
  first_name: string
  last_name: string
  company: string
  job_title: string
  score: number
}

interface HotReply {
  id: string
  from_email: string
  leads?: { first_name?: string; last_name?: string; company?: string }
  classification: string
  received_at: string
}

interface Campaign {
  id?: string
  name?: string
  status?: string
  emails_sent?: number
  replies_interested?: number
  leads_enrolled?: number
}

interface Props {
  leadCount: number
  campaignCount: number
  activeCampaignCount: number
  totalEmailsSent: number
  totalInterested: number
  topLeads: TopLead[]
  hotReplies: HotReply[]
  activeCampaigns: Campaign[]
  companyName: string
}

type View = 'none' | 'leads' | 'campaigns' | 'replies'

// ── Scripted conversation states ──────────────────────────────────────────────
function getScript(props: Props) {
  const { leadCount, campaignCount, activeCampaignCount, totalEmailsSent, totalInterested, topLeads, hotReplies } = props

  if (leadCount === 0) {
    return {
      message: "Hi there — I'm FIGSY, your AI outreach agent. I'm ready to start finding leads for you. To do that well, I need to know who you're targeting. What does your ideal customer look like?",
      choices: [
        { label: 'SA SaaS founders and CXOs',     view: 'none' as View, href: '/dashboard/leads/icp?figsy=SA+SaaS+founders+and+CXOs' },
        { label: 'Fintech decision makers, 50–500 employees', view: 'none' as View, href: '/dashboard/leads/icp?figsy=Fintech+decision+makers' },
        { label: 'Let me define my own ICP',       view: 'none' as View, href: '/dashboard/leads/icp' },
      ],
    }
  }

  if (campaignCount === 0) {
    const top = topLeads[0]
    const topName = top ? `${top.first_name} ${top.last_name} at ${top.company}` : 'your top lead'
    const topScore = top?.score ?? 0
    return {
      message: `I've reviewed your ${leadCount} leads and found ${Math.min(topLeads.length, 5)} strong matches. ${top ? `${topName} stands out — ${top.job_title}, score ${topScore}.` : ''} Want me to start reaching out?`,
      choices: [
        { label: 'Show me the top leads',   view: 'leads' as View,    href: null },
        { label: 'Start outreach now',      view: 'none' as View,     href: '/dashboard/figsy' },
        { label: 'Help me write a campaign', view: 'none' as View,    href: '/dashboard/figsy' },
      ],
    }
  }

  if (activeCampaignCount === 0) {
    return {
      message: `You have ${campaignCount} campaign${campaignCount !== 1 ? 's' : ''} drafted but none are active. The moment you activate, I start sending. The pipeline doesn't move until I do.`,
      choices: [
        { label: 'Activate my campaigns',  view: 'campaigns' as View, href: null },
        { label: 'Review my leads first',  view: 'leads' as View,     href: null },
        { label: 'Create a new campaign',  view: 'none' as View,      href: '/dashboard/figsy' },
      ],
    }
  }

  const hot = hotReplies[0]
  const hotName = hot?.leads ? `${hot.leads.first_name ?? ''} ${hot.leads.last_name ?? ''}`.trim() : hot?.from_email ?? ''
  const hotCompany = hot?.leads?.company ? ` at ${hot.leads.company}` : ''

  return {
    message: `${totalEmailsSent} emails sent across ${activeCampaignCount} active campaign${activeCampaignCount !== 1 ? 's' : ''}. ${totalInterested > 0 ? `${totalInterested} lead${totalInterested !== 1 ? 's' : ''} have shown interest${hot ? ` — ${hotName}${hotCompany} is ready to talk` : ''}.` : "No replies yet — sequences are running, give it a day or two."} Here's where things stand.`,
    choices: [
      ...(totalInterested > 0 ? [{ label: `View ${totalInterested} interested repl${totalInterested !== 1 ? 'ies' : 'y'}`, view: 'replies' as View, href: null }] : []),
      { label: 'See campaign details',    view: 'campaigns' as View, href: null },
      { label: 'Launch another campaign', view: 'none' as View,      href: '/dashboard/figsy' },
    ],
  }
}

// ── Inline views ──────────────────────────────────────────────────────────────
function LeadsView({ leads }: { leads: TopLead[] }) {
  if (leads.length === 0) return null
  return (
    <div className="bg-white rounded-2xl border border-[#EDE9FE] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9FE]">
        <p className="text-xs font-semibold text-[#1E0A5C]">Your top leads</p>
        <Link href="/dashboard/leads" className="text-xs text-[#7C3AED] font-medium hover:underline flex items-center gap-0.5">
          All leads <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="divide-y divide-[#F5F0FF]">
        {leads.slice(0, 5).map(lead => (
          <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-full bg-[#7C3AED]/10 flex items-center justify-center shrink-0">
              <span className="text-[11px] font-bold text-[#7C3AED]">{lead.first_name[0]}{lead.last_name[0]}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#1E0A5C] truncate">{lead.first_name} {lead.last_name}</p>
              <p className="text-xs text-slate-400 truncate">{lead.job_title} · {lead.company}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5">
              <div className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${lead.score >= 80 ? 'bg-green-100 text-green-700' : lead.score >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                {lead.score}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="px-4 py-3 bg-[#F5F0FF]/40">
        <Link href="/dashboard/figsy" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
          <Target className="w-4 h-4" />
          Start outreach with these leads
        </Link>
      </div>
    </div>
  )
}

function CampaignsView({ campaigns }: { campaigns: Campaign[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE9FE] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9FE]">
        <p className="text-xs font-semibold text-[#1E0A5C]">Your campaigns</p>
        <Link href="/dashboard/figsy" className="text-xs text-[#7C3AED] font-medium hover:underline flex items-center gap-0.5">
          Manage <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {campaigns.length === 0 ? (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-slate-400 mb-3">No campaigns yet</p>
          <Link href="/dashboard/figsy" className="text-xs font-semibold text-[#7C3AED] hover:underline">
            Create your first campaign →
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-[#F5F0FF]">
          {campaigns.slice(0, 4).map((c, i) => {
            const sent = c.emails_sent ?? 0
            const enrolled = c.leads_enrolled ?? 0
            const pct = enrolled > 0 ? Math.min(100, Math.round((sent / enrolled) * 100)) : 0
            return (
              <div key={c.id ?? i} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-sm font-medium text-[#1E0A5C] truncate">{c.name ?? 'Campaign'}</p>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ml-2 shrink-0 ${
                    c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>{c.status === 'active' ? 'Active' : 'Draft'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-[#EDE9FE]">
                  <div className="h-full rounded-full bg-[#7C3AED] transition-all" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{sent} sent of {enrolled} enrolled</p>
              </div>
            )
          })}
        </div>
      )}
      <div className="px-4 py-3 bg-[#F5F0FF]/40">
        <Link href="/dashboard/figsy" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
          <TrendingUp className="w-4 h-4" />
          View all campaigns
        </Link>
      </div>
    </div>
  )
}

function RepliesView({ replies }: { replies: HotReply[] }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EDE9FE] overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EDE9FE]">
        <p className="text-xs font-semibold text-[#1E0A5C]">Interested replies</p>
        <Link href="/dashboard/inbox" className="text-xs text-[#7C3AED] font-medium hover:underline flex items-center gap-0.5">
          Open inbox <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
      {replies.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-slate-400">No interested replies yet</div>
      ) : (
        <div className="divide-y divide-[#F5F0FF]">
          {replies.slice(0, 5).map(r => {
            const name = r.leads ? `${r.leads.first_name ?? ''} ${r.leads.last_name ?? ''}`.trim() || r.from_email : r.from_email
            return (
              <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#1E0A5C] truncate">{name}</p>
                  {r.leads?.company && <p className="text-xs text-slate-400 truncate">{r.leads.company}</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="px-4 py-3 bg-[#F5F0FF]/40">
        <Link href="/dashboard/inbox" className="flex items-center justify-center gap-2 text-sm font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">
          <Inbox className="w-4 h-4" />
          Go to inbox
        </Link>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function FigsyConversation(props: Props) {
  const router = useRouter()
  const [activeView, setActiveView] = useState<View>('none')
  const [responded, setResponded] = useState(false)
  const [chosenLabel, setChosenLabel] = useState('')

  const script = getScript(props)

  function handleChoice(choice: { label: string; view: View; href: string | null }) {
    setChosenLabel(choice.label)
    setResponded(true)
    if (choice.href) {
      router.push(choice.href)
    } else {
      setActiveView(choice.view)
    }
  }

  return (
    <div className="space-y-3">
      {/* FIGSY message */}
      <div className="bg-white rounded-2xl border border-[#EDE9FE] px-5 py-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-[#7C3AED]/20">
              <img src="/agents/figsy.png" alt="FIGSY" className="w-full h-full object-cover object-top" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-slate-400 mb-1">FIGSY · AI SDR</p>
            <p className="text-sm text-[#1E0A5C] leading-relaxed">{script.message}</p>
          </div>
        </div>

        {/* Choices or response */}
        <div className="mt-4 pl-[52px]">
          {!responded ? (
            <div className="flex flex-col gap-2">
              {script.choices.map(choice => (
                <button
                  key={choice.label}
                  onClick={() => handleChoice(choice)}
                  className="text-left text-sm text-[#7C3AED] bg-[#F5F0FF] hover:bg-[#EDE9FE] border border-[#EDE9FE] hover:border-[#7C3AED]/30 rounded-xl px-4 py-2.5 font-medium transition-all flex items-center justify-between group"
                >
                  {choice.label}
                  <ArrowRight className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-[#F5F0FF] rounded-xl border border-[#EDE9FE]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                <span className="text-sm text-[#7C3AED] font-medium">{chosenLabel}</span>
              </div>
              <button
                onClick={() => { setResponded(false); setActiveView('none'); setChosenLabel('') }}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inline content pulled up by FIGSY */}
      {activeView === 'leads'     && <LeadsView     leads={props.topLeads} />}
      {activeView === 'campaigns' && <CampaignsView campaigns={props.activeCampaigns} />}
      {activeView === 'replies'   && <RepliesView   replies={props.hotReplies} />}
    </div>
  )
}
