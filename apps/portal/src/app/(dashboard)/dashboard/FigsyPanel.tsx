'use client'

import { useRouter } from 'next/navigation'
import { AgentSidePanel } from '@/components/ui/AgentSidePanel'

export function FigsyPanel({ leadCount }: { leadCount: number }) {
  const router = useRouter()

  const contextMessage = leadCount > 0
    ? `You have ${leadCount} lead${leadCount !== 1 ? 's' : ''} ready. Your top picks are standing by.`
    : "Let's find your first leads. Tell me who you're targeting and I'll do the rest."

  const chips = leadCount > 0
    ? [
        { label: 'Review my top leads',  onClick: () => router.push('/dashboard/leads') },
        { label: 'Launch outreach',       onClick: () => router.push('/dashboard/figsy') },
        { label: 'Build a new ICP',       onClick: () => router.push('/dashboard/leads/icp') },
      ]
    : [
        { label: 'Who should I target?',  onClick: () => router.push('/dashboard/leads/icp') },
        { label: 'Build my ICP',          onClick: () => router.push('/dashboard/leads/icp') },
        { label: 'How does KIND work?',   onClick: () => router.push('/dashboard/roadmap') },
      ]

  return (
    <AgentSidePanel
      agentId="figsy"
      name="FIGSY"
      role="AI SDR"
      tagline="Your sales agent"
      contextMessage={contextMessage}
      chips={chips}
      onSend={msg => router.push(`/dashboard/leads/icp?figsy=${encodeURIComponent(msg)}`)}
      inputPlaceholder="Ask FIGSY anything…"
    />
  )
}
