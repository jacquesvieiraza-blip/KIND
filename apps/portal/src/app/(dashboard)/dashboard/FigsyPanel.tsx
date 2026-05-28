'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'

interface FigsyPanelProps {
  leadCount: number
}

const ALL_CHIPS = ['Who should I target?', 'Build my ICP', 'Review my top leads', 'Launch outreach']

export function FigsyPanel({ leadCount }: FigsyPanelProps) {
  const router = useRouter()
  const [input, setInput] = useState('')

  // Pick the 3 most relevant chips based on lead count
  const chips = leadCount === 0
    ? ALL_CHIPS.slice(0, 3)          // Who to target, Build ICP, Review leads
    : ALL_CHIPS.slice(1)             // Build ICP, Review leads, Launch outreach

  const contextMessage = leadCount === 0
    ? "Let's find your first leads. Tell me who you're targeting and I'll do the rest."
    : `You have ${leadCount} leads ready. Your top picks are standing by.`

  function navigate(message: string) {
    if (!message.trim()) return
    router.push(`/dashboard/leads/icp?figsy=${encodeURIComponent(message.trim())}`)
  }

  function handleSend() {
    navigate(input)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSend()
  }

  return (
    <div
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: '#0F0929' }}
    >
      {/* Agent photo */}
      <div className="relative w-full" style={{ height: 160 }}>
        <img
          src="/agents/figsy.png"
          alt="FIGSY"
          className="w-full h-full object-cover object-top"
        />
        {/* Gradient fade at bottom */}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{
            background: 'linear-gradient(to bottom, transparent, #0F0929)',
          }}
        />
      </div>

      {/* Identity */}
      <div className="px-4 pt-1 pb-2">
        <p className="text-white font-bold text-base leading-tight">FIGSY</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          {/* Green pulse dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span className="text-[11px] text-slate-400">AI SDR · Online</span>
        </div>
      </div>

      {/* Context message */}
      <div className="px-4 pb-3">
        <p className="text-[13px] text-slate-300 leading-snug">{contextMessage}</p>
      </div>

      {/* Suggestion chips */}
      <div className="px-4 pb-4 flex flex-col gap-2">
        {chips.map(chip => (
          <button
            key={chip}
            onClick={() => navigate(chip)}
            className="w-full text-left text-[12px] font-medium px-3 py-2 rounded-xl transition-colors"
            style={{
              background: 'rgba(124, 58, 237, 0.18)',
              color: '#C4B5FD',
              border: '1px solid rgba(124, 58, 237, 0.30)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.32)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(124, 58, 237, 0.18)'
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Chat input */}
      <div
        className="mx-3 mb-4 flex items-center gap-2 rounded-xl px-3 py-2"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask FIGSY anything..."
          className="flex-1 bg-transparent text-[12px] text-white placeholder-slate-500 outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim()}
          className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
          style={{ background: '#7C3AED' }}
        >
          <Send className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  )
}
