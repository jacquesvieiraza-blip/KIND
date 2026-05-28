'use client'

import { usePathname, useRouter } from 'next/navigation'
import { AgentSidePanel } from '@/components/ui/AgentSidePanel'

interface Props {
  hasFigsy: boolean
  hasMilla: boolean
  hasVida: boolean
  leadCount: number
  creditBalance: number
}

export function AgentColumn({ hasFigsy, hasMilla, hasVida, leadCount, creditBalance }: Props) {
  const pathname = usePathname()
  const router   = useRouter()

  // ICP builder manages its own integrated agent panel
  if (pathname.startsWith('/dashboard/leads/icp')) return null

  // ── Milla takes over ────────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard/assistant') || pathname.startsWith('/dashboard/documents')) {
    return (
      <div className="w-72 shrink-0 sticky top-6 self-start">
        <AgentSidePanel
          agentId="milla"
          name="Milla"
          role="Virtual Assistant"
          tagline="Your AI assistant"
          contextMessage="I help you draft documents, manage your business knowledge, and answer questions — so you can focus on what matters."
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

  // ── Vida takes over ─────────────────────────────────────────────────────────
  if (pathname.startsWith('/dashboard/chatbot')) {
    return (
      <div className="w-72 shrink-0 sticky top-6 self-start">
        <AgentSidePanel
          agentId="vida"
          name="Vida"
          role="Chatbot Agent"
          tagline="Your website chatbot"
          contextMessage="I live on your website and handle customer enquiries 24/7 — trained on your business, always on."
          chips={[
            { label: 'Configure chatbot',   onClick: () => router.push('/dashboard/chatbot') },
            { label: 'View conversations',  onClick: () => router.push('/dashboard/chatbot') },
          ]}
          onSend={msg => router.push(`/dashboard/chatbot?q=${encodeURIComponent(msg)}`)}
          inputPlaceholder="Ask Vida anything…"
          online={hasVida}
        />
      </div>
    )
  }

  // ── FIGSY everywhere else ───────────────────────────────────────────────────
  let contextMessage: string
  let chips: { label: string; onClick: () => void }[]

  if (pathname.startsWith('/dashboard/figsy') || pathname.startsWith('/dashboard/inbox') || pathname.startsWith('/dashboard/kpis')) {
    contextMessage = leadCount > 0
      ? `I'm ready to reach out to your ${leadCount} leads. Create a campaign and I'll start sending immediately.`
      : "Create your first campaign and I'll start personalised outreach the moment it's live."
    chips = [
      { label: 'New campaign',        onClick: () => router.push('/dashboard/figsy') },
      { label: 'Check inbox',         onClick: () => router.push('/dashboard/inbox') },
      { label: 'Performance report',  onClick: () => router.push('/dashboard/kpis') },
    ]
  } else if (pathname.startsWith('/dashboard/leads/linkedin')) {
    contextMessage = "Upload a LinkedIn export or company list and I'll map the columns and suggest your next move automatically."
    chips = [
      { label: 'What format do I need?',    onClick: () => {} },
      { label: 'Build ICP from this data',  onClick: () => router.push('/dashboard/leads/icp') },
    ]
  } else if (pathname.startsWith('/dashboard/leads')) {
    contextMessage = leadCount > 0
      ? `You have ${leadCount} leads scored and ready. I'd start with the highest scores — those are your warmest opportunities.`
      : "No leads yet. Let me find your ideal customers — start by defining who you want to target."
    chips = [
      { label: 'Find more leads',      onClick: () => router.push('/dashboard/leads/icp') },
      { label: 'Launch outreach',      onClick: () => router.push('/dashboard/figsy') },
      { label: 'Import from LinkedIn', onClick: () => router.push('/dashboard/leads/linkedin') },
    ]
  } else if (pathname.startsWith('/dashboard/billing')) {
    contextMessage = creditBalance > 0
      ? `You have ${creditBalance} credits — that's roughly ${Math.floor(creditBalance / 3)} complete outreach sequences. Let's use them well.`
      : "Top up credits and I'll start reaching out to your leads right away. No setup needed."
    chips = [
      { label: 'What can I do with my credits?', onClick: () => router.push('/dashboard/figsy') },
      { label: 'See my usage',                   onClick: () => router.push('/dashboard/usage') },
    ]
  } else if (pathname.startsWith('/dashboard/settings')) {
    contextMessage = "The more I know about your business, your tone, and your goals — the better I represent you in every email I send."
    chips = [
      { label: 'Set my writing style', onClick: () => {} },
      { label: 'Connect my CRM',       onClick: () => {} },
      { label: 'Connect calendar',     onClick: () => {} },
    ]
  } else if (pathname.startsWith('/dashboard/usage')) {
    contextMessage = "Here's a full picture of everything I've done for you — credits used, leads contacted, sequences running."
    chips = [
      { label: 'See my campaigns',  onClick: () => router.push('/dashboard/figsy') },
      { label: 'Top up credits',    onClick: () => router.push('/dashboard/billing') },
    ]
  } else if (pathname.startsWith('/dashboard/roadmap')) {
    contextMessage = "This is my evolution — what's live, what I'm building, and where I'm headed. I get smarter every week."
    chips = [
      { label: "What's coming for outreach?", onClick: () => {} },
      { label: 'Request a feature',           onClick: () => {} },
    ]
  } else {
    // Homepage + default
    contextMessage = leadCount > 0
      ? `You have ${leadCount} leads ready. I've reviewed them — your top picks are standing by.`
      : "Let's find your first leads. Tell me who you're targeting and I'll do the rest."
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
    <div className="w-72 shrink-0 sticky top-6 self-start">
      <AgentSidePanel
        agentId="figsy"
        name="FIGSY"
        role="AI SDR"
        tagline="Your sales agent"
        contextMessage={contextMessage}
        chips={chips}
        onSend={msg => router.push(`/dashboard/leads/icp?figsy=${encodeURIComponent(msg)}`)}
        inputPlaceholder="Ask FIGSY anything…"
        online={hasFigsy}
      />
    </div>
  )
}
