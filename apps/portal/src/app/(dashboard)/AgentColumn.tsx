'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AgentSidePanel } from '@/components/ui/AgentSidePanel'

const COLLAPSE_KEY = 'kind_agent_col_v1'

interface Props {
  hasFigsy: boolean
  hasMilla: boolean
  hasVida: boolean
  leadCount: number
  creditBalance: number
  isNewUser?: boolean
}

export function AgentColumn({ hasFigsy, hasMilla, hasVida, leadCount, creditBalance, isNewUser = false }: Props) {
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

  // ICP builder manages its own integrated agent panel
  if (pathname.startsWith('/dashboard/leads/icp')) return null

  // Home page has FigsyConversation — no duplicate panel needed
  if (pathname === '/dashboard') return null

  // FIGSY full chat page is itself a dedicated chat — no side panel needed
  if (pathname.startsWith('/dashboard/figsy-chat')) return null

  const agentId: 'figsy' | 'milla' | 'vida' =
    pathname.startsWith('/dashboard/assistant') || pathname.startsWith('/dashboard/documents') ? 'milla' :
    pathname.startsWith('/dashboard/chatbot') ? 'vida' : 'figsy'

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

  // ── FIGSY (everywhere else) ─────────────────────────────────────────────────
  let contextMessage: string
  let chips: { label: string; onClick: () => void }[]

  const isCampaignDetail = /^\/dashboard\/figsy\/[^/]+$/.test(pathname)

  if (isCampaignDetail) {
    contextMessage = "This is your live campaign. Click Enroll Leads to add your consented contacts, then Send Test Email to preview what they'll receive."
    chips = [
      { label: 'Enroll my leads',    onClick: () => router.push('/dashboard/figsy') },
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
          { label: 'How does KIND work?',  onClick: () => router.push('/dashboard/roadmap') },
        ]
  }

  return (
    <div className="w-full lg:w-64 lg:shrink-0 lg:sticky lg:top-6 lg:self-start">
      {collapseBtn}
      <AgentSidePanel
        agentId="figsy"
        name="FIGSY"
        subtitle="The Closer"
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
