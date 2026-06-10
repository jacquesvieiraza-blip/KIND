'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AgentSidePanel } from '@/components/ui/AgentSidePanel'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'

const COLLAPSE_KEY = 'kind_agent_col_v1'

interface Props {
  hasFigsy: boolean
  hasMilla: boolean
  hasVida: boolean
  hasDenise: boolean
  leadCount: number
  creditBalance: number
  isNewUser?: boolean
  partnerStatus?: string
  partnerDealCount?: number
}

export function AgentColumn({ hasFigsy, hasMilla, hasVida, hasDenise, leadCount, creditBalance, isNewUser = false, partnerStatus = '', partnerDealCount = 0 }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(COLLAPSE_KEY) === 'true' } catch { return false }
  })

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    try { localStorage.setItem(COLLAPSE_KEY, String(next)) } catch {}
  }

  // Actually enrol the current campaign's verified leads (instead of just navigating).
  async function enrollCurrentCampaign() {
    const match = pathname.match(/^\/dashboard\/figsy\/([^/]+)$/)
    if (!match) { router.push('/dashboard/figsy'); return }
    try {
      const { data: { session } } = await createClient().auth.getSession()
      if (!session) { router.push('/login'); return }
      const res = await api.post<{ data: { enrolled: number } }>(`/figsy/campaigns/${match[1]}/enroll-consented`, {}, session.access_token)
      window.alert(`Enrolling ${res.data?.enrolled ?? 0} verified leads — outreach starts shortly. Refresh to see the count.`)
      router.refresh()
    } catch {
      window.alert('Could not enrol. Make sure the campaign is active and you have verified leads.')
    }
  }

  // ICP builder manages its own integrated agent panel
  if (pathname.startsWith('/dashboard/leads/icp')) return null

  // Home page has FigsyConversation — no duplicate panel needed
  if (pathname === '/dashboard') return null

  // FIGSY full chat page is itself a dedicated chat — no side panel needed
  if (pathname.startsWith('/dashboard/figsy-chat')) return null

  // Agents overview page manages its own layout
  if (pathname.startsWith('/dashboard/agents')) return null

  const agentId: 'figsy' | 'milla' | 'vida' | 'denise' =
    pathname.startsWith('/dashboard/assistant') || pathname.startsWith('/dashboard/documents') ? 'milla' :
    pathname.startsWith('/dashboard/chatbot') ? 'vida' :
    pathname.startsWith('/dashboard/denise') ? 'denise' : 'figsy'

  // Collapsed: narrow strip with avatar + expand chevron
  if (collapsed) {
    return (
      <div className="hidden lg:flex lg:flex-col lg:w-10 lg:shrink-0 lg:sticky lg:top-6 lg:self-start items-center pt-1">
        <button
          onClick={toggle}
          title="Expand agent panel"
          className="flex flex-col items-center gap-2.5 p-1.5 rounded-xl hover:bg-white/70 transition-colors group"
        >
          <div className="w-7 h-7 rounded-lg overflow-hidden ring-1 ring-purple-200 shadow-sm">
            <img src={`/agents/${agentId}.png`} alt={agentId} className="w-full h-full object-cover object-top" />
          </div>
          <ChevronRight className="w-3 h-3 text-[#7C3AED]/30 group-hover:text-[#7C3AED] transition-colors" />
        </button>
      </div>
    )
  }

  // Collapse button shown above the panel
  const collapseBtn = (
    <div className="hidden lg:flex justify-end mb-1.5">
      <button
        onClick={toggle}
        className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-[#7C3AED]/40 hover:text-[#7C3AED] hover:bg-white/60 transition-colors"
        title="Collapse panel"
      >
        <ChevronLeft className="w-3 h-3" />
        Collapse
      </button>
    </div>
  )

  // ── Milla ───────────────────────────────────────────────────────────────────
  if (agentId === 'milla') {
    return (
      <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
        {collapseBtn}
        <AgentSidePanel
          agentId="milla"
          name="Milla"
          subtitle="The Brain"
          role="Virtual Assistant · Business Operations"
          tagline="I reach out. You close."
          contextMessage="I know your business inside and out. Draft documents, instant answers from your knowledge base, and everything organised — done."
          chips={[
            { label: 'Draft a document',  onClick: () => router.push('/dashboard/documents') },
            { label: 'Ask me anything',   onClick: () => router.push('/dashboard/assistant') },
            { label: 'Upload knowledge',  onClick: () => router.push('/dashboard/knowledge') },
          ]}
          onSend={msg => router.push(`/dashboard/assistant?q=${encodeURIComponent(msg)}`)}
          inputPlaceholder="Ask Milla anything…"
          online={hasMilla}
        />
      </div>
    )
  }

  // ── Vida ────────────────────────────────────────────────────────────────────
  if (agentId === 'vida') {
    return (
      <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
        {collapseBtn}
        <AgentSidePanel
          agentId="vida"
          name="Vida"
          subtitle="The Connector"
          role="Chatbot Agent · Inbound Specialist"
          tagline="Your website chatbot"
          contextMessage="I'm always here when your visitors need me — trained on your business, real answers not scripts. I spot good leads and route them straight to your team."
          chips={[
            { label: 'Configure chatbot',  onClick: () => router.push('/dashboard/chatbot') },
            { label: 'View conversations', onClick: () => router.push('/dashboard/chatbot') },
          ]}
          onSend={msg => router.push(`/dashboard/chatbot?q=${encodeURIComponent(msg)}`)}
          inputPlaceholder="Ask Vida anything…"
          online={hasVida}
        />
      </div>
    )
  }

  // ── Denise ──────────────────────────────────────────────────────────────────
  if (agentId === 'denise') {
    return (
      <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
        {collapseBtn}
        <AgentSidePanel
          agentId="denise"
          name="Denise"
          subtitle="The Closer"
          role="AI Account Executive · Closing"
          tagline="I close what FIGSY opens."
          contextMessage="FIGSY books the meeting — I take it from there. Give me the context and I'll draft the warm follow-up or turn your call notes into a proposal. No pressure, all relationship."
          chips={[
            { label: 'Draft a warm follow-up', onClick: () => router.push('/dashboard/denise') },
            { label: 'Proposal from a call',   onClick: () => router.push('/dashboard/denise') },
            { label: 'See my drafts',          onClick: () => router.push('/dashboard/denise') },
          ]}
          onSend={() => router.push('/dashboard/denise')}
          inputPlaceholder="Ask Denise to draft…"
          online={hasDenise}
        />
      </div>
    )
  }

  // ── FIGSY (everywhere else) ─────────────────────────────────────────────────
  let contextMessage: string
  let chips: { label: string; onClick: () => void }[]

  const isCampaignDetail = /^\/dashboard\/figsy\/[^/]+$/.test(pathname)
    && !/^\/dashboard\/figsy\/(replies|kanban|linkedin|webhooks)$/.test(pathname)
  const isWebhooks = pathname.startsWith('/dashboard/figsy/webhooks')

  if (isWebhooks) {
    contextMessage = "Webhooks let your other tools know when something happens — a reply, a positive lead, a meeting booked. Connect Zapier, Make, or your own endpoint here."
    chips = [
      { label: 'Test my webhook',     onClick: () => {} },
      { label: 'See active campaigns', onClick: () => router.push('/dashboard/figsy') },
      { label: 'Check my inbox',       onClick: () => router.push('/dashboard/inbox') },
    ]
  } else if (isCampaignDetail) {
    contextMessage = "This is your live campaign. Click Enroll Leads to add your consented contacts, then Send Test Email to preview what they'll receive."
    chips = [
      { label: 'Enroll my leads',    onClick: enrollCurrentCampaign },
      { label: 'Check replies',      onClick: () => router.push('/dashboard/inbox') },
      { label: 'View all campaigns', onClick: () => router.push('/dashboard/figsy') },
    ]
  } else if (pathname.startsWith('/dashboard/inbox')) {
    contextMessage = "These are your hot replies — people who responded to my outreach. Reply fast, the window is short."
    chips = [
      { label: 'Draft a reply',      onClick: () => router.push('/dashboard/inbox') },
      { label: 'See all campaigns',  onClick: () => router.push('/dashboard/figsy') },
      { label: 'Performance report', onClick: () => router.push('/dashboard/kpis') },
    ]
  } else if (pathname.startsWith('/dashboard/kpis')) {
    contextMessage = "Here's how my outreach is performing. Open rate, reply rate, and pipeline value — I track it all so you don't have to."
    chips = [
      { label: 'See my campaigns',    onClick: () => router.push('/dashboard/figsy') },
      { label: 'Check inbox',         onClick: () => router.push('/dashboard/inbox') },
      { label: 'Launch new campaign', onClick: () => router.push('/dashboard/figsy') },
    ]
  } else if (pathname.startsWith('/dashboard/figsy')) {
    contextMessage = leadCount > 0
      ? `I'm ready to reach out to your ${leadCount} leads. Activate a campaign and I'll start sending personalised sequences immediately.`
      : "Create your first campaign and I'll start personalised outreach the moment it's live."
    chips = [
      { label: 'New campaign',       onClick: () => router.push('/dashboard/figsy') },
      { label: 'Check inbox',        onClick: () => router.push('/dashboard/inbox') },
      { label: 'Performance report', onClick: () => router.push('/dashboard/kpis') },
    ]
  } else if (pathname.startsWith('/dashboard/leads/linkedin')) {
    contextMessage = "Drop your LinkedIn CSV here. I'll map the columns, score everyone against your ICP, and flag your top 10 immediately."
    chips = [
      { label: 'What format do I need?', onClick: () => {} },
      { label: 'Build ICP first',        onClick: () => router.push('/dashboard/leads/icp') },
    ]
  } else if (pathname.startsWith('/dashboard/leads')) {
    contextMessage = leadCount > 0
      ? `You have ${leadCount} leads scored and ready. I'd start with the highest scores — those are your warmest opportunities right now.`
      : "No leads yet. Let me find your ideal customers — start by defining who you want to target."
    chips = [
      { label: 'Find more leads',      onClick: () => router.push('/dashboard/leads/icp') },
      { label: 'Start outreach',       onClick: () => router.push('/dashboard/figsy') },
      { label: 'Import from LinkedIn', onClick: () => router.push('/dashboard/leads/linkedin') },
    ]
  } else if (pathname.startsWith('/dashboard/billing')) {
    contextMessage = creditBalance > 0
      ? `You have ${creditBalance} credits — roughly ${Math.floor(creditBalance / 3)} complete outreach sequences. Tell me when to fire.`
      : "Top up credits and I'll start reaching out immediately. Each sequence is 3 personalised emails per lead."
    chips = [
      { label: 'How are credits used?', onClick: () => router.push('/dashboard/figsy') },
      { label: 'See my usage',          onClick: () => router.push('/dashboard/usage') },
    ]
  } else if (pathname.startsWith('/dashboard/settings')) {
    contextMessage = "The more you tell me about your business, tone, and goals — the sharper every email I write becomes. This is worth 5 minutes."
    chips = [
      { label: 'Update company info', onClick: () => {} },
      { label: 'Connect my CRM',      onClick: () => {} },
      { label: 'Start outreach',      onClick: () => router.push('/dashboard/figsy') },
    ]
  } else if (pathname.startsWith('/dashboard/usage')) {
    contextMessage = "Every credit spent, every email sent, every reply received. Here's my full record of work for you."
    chips = [
      { label: 'See my campaigns', onClick: () => router.push('/dashboard/figsy') },
      { label: 'Top up credits',   onClick: () => router.push('/dashboard/billing') },
    ]
  } else if (pathname.startsWith('/dashboard/roadmap')) {
    contextMessage = "This is my evolution — what's live, what I'm building next. I get smarter every week. Voice and WhatsApp are coming."
    chips = [
      { label: "What's coming next?", onClick: () => {} },
      { label: 'Request a feature',   onClick: () => {} },
      { label: 'Start outreach now',  onClick: () => router.push('/dashboard/figsy') },
    ]
  } else if (pathname.startsWith('/dashboard/team')) {
    contextMessage = "Your team members share the same pipeline. Invite colleagues to review leads, approve campaigns, or manage replies — everyone sees the same data, I keep running in the background."
    chips = [
      { label: 'Invite a team member',  onClick: () => router.push('/dashboard/team') },
      { label: 'See my campaigns',      onClick: () => router.push('/dashboard/figsy') },
      { label: 'Review top leads',      onClick: () => router.push('/dashboard/leads') },
    ]
  } else if (pathname.startsWith('/dashboard/messages')) {
    contextMessage = "This is your direct line to the K.I.N.D team. Ask anything — account questions, strategy, ICP advice, or just say hi. A real person replies within 24 hours."
    chips = [
      { label: 'Ask about my ICP',      onClick: () => {} },
      { label: 'Request a feature',     onClick: () => {} },
      { label: 'See my campaigns',      onClick: () => router.push('/dashboard/figsy') },
    ]
  } else if (pathname.startsWith('/dashboard/mcp')) {
    contextMessage = "Connect me to Claude.ai or Cursor and run lead searches, check campaign stats, and launch outreach — all from inside your AI assistant, no portal login needed."
    chips = [
      { label: 'Connect Claude.ai',       onClick: () => router.push('/dashboard/developer') },
      { label: 'Get my API key',           onClick: () => router.push('/dashboard/developer') },
      { label: 'Test: find me 10 leads',  onClick: () => router.push('/dashboard/figsy-chat') },
    ]
  } else if (pathname.startsWith('/dashboard/knowledge')) {
    contextMessage = "Everything you upload here trains me to write better emails. Your tone, your product, your pricing, your competitors — the more I know, the sharper every sequence I write."
    chips = [
      { label: 'Upload a document',       onClick: () => router.push('/dashboard/knowledge') },
      { label: 'Add company background',  onClick: () => router.push('/dashboard/knowledge') },
      { label: 'Launch a campaign',        onClick: () => router.push('/dashboard/figsy') },
    ]
  } else if (pathname.startsWith('/dashboard/developer')) {
    contextMessage = "Your KIND MCP Server lets you call me from Claude.ai, Cursor, or any MCP-enabled tool. Use figsy_find_leads, figsy_suggest_campaign, and figsy_get_campaign_stats — all from inside your AI assistant."
    chips = [
      { label: 'Copy MCP endpoint',        onClick: () => {} },
      { label: 'Open in Claude.ai',        onClick: () => window.open('https://claude.ai', '_blank') },
      { label: 'Test: find me 10 leads',   onClick: () => router.push('/dashboard/figsy-chat') },
    ]
  } else if (pathname.startsWith('/dashboard/partner')) {
    if (partnerStatus === 'pending') {
      contextMessage = "Your application is under review. While you wait — explore the onboarding guide and prepare your pitch deck so you're ready to close your first deal the day you're approved."
      chips = [
        { label: 'View onboarding guide', onClick: () => router.push('/dashboard/partner/onboarding') },
        { label: 'Explore value deck',    onClick: () => router.push('/dashboard/partner/deck') },
      ]
    } else if (partnerDealCount === 0) {
      contextMessage = "You're live! Start by registering your first deal for 60-day protection, then share your referral link. The sooner you register, the sooner commissions start."
      chips = [
        { label: 'Register first deal', onClick: () => {} },
        { label: 'Get selling tips',    onClick: () => router.push('/dashboard/partner/deck') },
        { label: 'View onboarding',     onClick: () => router.push('/dashboard/partner/onboarding') },
      ]
    } else {
      contextMessage = `You have ${partnerDealCount} registered deal${partnerDealCount !== 1 ? 's' : ''}. Keep adding prospects for 60-day protection — and share your referral link to convert more referrals to monthly commissions.`
      chips = [
        { label: 'Register new deal', onClick: () => {} },
        { label: 'View pitch deck',   onClick: () => router.push('/dashboard/partner/deck') },
        { label: 'View onboarding',   onClick: () => router.push('/dashboard/partner/onboarding') },
      ]
    }
  } else if (pathname.startsWith('/dashboard/proposals')) {
    contextMessage = "I can help you win this deal. Tell me about the prospect and I'll draft a proposal — subject line, pitch, pricing, and sign link — ready to send in 60 seconds."
    chips = [
      { label: 'Draft a proposal',      onClick: () => {} },
      { label: 'View sent proposals',   onClick: () => router.push('/dashboard/proposals') },
      { label: 'Check my hot leads',    onClick: () => router.push('/dashboard/inbox') },
    ]
  } else if (pathname.startsWith('/dashboard/figsy-tasks')) {
    contextMessage = "Assign me a task and I'll plan it, execute it, and report back. I work best with specific goals — 'Find 20 CTOs in Cape Town' or 'Suggest a new sequence angle for fintech leads'."
    chips = [
      { label: 'Assign me a task',      onClick: () => {} },
      { label: 'Find more leads',       onClick: () => router.push('/dashboard/leads/icp') },
      { label: 'Launch outreach',       onClick: () => router.push('/dashboard/figsy') },
    ]
  } else {
    contextMessage = leadCount > 0
      ? `You have ${leadCount} leads ready. I've reviewed them and your top picks are standing by — ready when you are.`
      : "Let's find your first leads. Tell me who you're targeting and I'll build your prospect list."
    chips = leadCount > 0
      ? [
          { label: 'Review my top leads', onClick: () => router.push('/dashboard/leads') },
          { label: 'Launch outreach',     onClick: () => router.push('/dashboard/figsy') },
          { label: 'Build a new ICP',     onClick: () => router.push('/dashboard/leads/icp') },
        ]
      : [
          { label: 'Who should I target?', onClick: () => router.push('/dashboard/leads/icp') },
          { label: 'Build my ICP',         onClick: () => router.push('/dashboard/leads/icp') },
        ]
  }

  return (
    <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
      {collapseBtn}
      <AgentSidePanel
        agentId="figsy"
        name="FIGSY"
        subtitle="The Opener"
        role="AI SDR · Outbound Sales Specialist"
        tagline="I reach out. You close."
        contextMessage={contextMessage}
        chips={chips}
        onSend={msg => router.push(`/dashboard/leads/icp?figsy=${encodeURIComponent(msg)}`)}
        inputPlaceholder="Ask FIGSY anything…"
        online={hasFigsy}
        isNewUser={isNewUser}
      />
    </div>
  )
}
