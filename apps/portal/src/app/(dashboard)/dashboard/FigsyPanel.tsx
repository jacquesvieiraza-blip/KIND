'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send, Loader2 } from 'lucide-react'

const CHIPS_NO_LEADS = [
  'Who should I target?',
  'Build my ICP',
  'How does KIND work?',
]

const CHIPS_HAS_LEADS = [
  'Review my top leads',
  'Launch outreach',
  'Build a new ICP',
]

export function FigsyPanel({ leadCount }: { leadCount: number }) {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const chips = leadCount > 0 ? CHIPS_HAS_LEADS : CHIPS_NO_LEADS

  const contextMessage = leadCount > 0
    ? `You have ${leadCount} lead${leadCount !== 1 ? 's' : ''} ready. Your top picks are standing by.`
    : "Let's find your first leads. Tell me who you're targeting and I'll do the rest."

  function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setThinking(true)
    setTimeout(() => {
      router.push(`/dashboard/leads/icp?figsy=${encodeURIComponent(msg)}`)
    }, 400)
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-purple-100/30">
      {/* FIGSY photo */}
      <div className="relative h-52 bg-[#0F0929]">
        <img
          src="/agents/figsy.png"
          alt="FIGSY"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0929] via-transparent to-transparent" />
      </div>

      {/* Identity + chat */}
      <div className="bg-[#0F0929] px-4 pt-2 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base leading-tight">FIGSY</p>
            <p className="text-[#9B8EC4] text-xs mt-0.5">AI SDR · Your sales agent</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-400 font-medium">Online</span>
          </div>
        </div>

        <p className="text-white/70 text-xs mt-3 leading-relaxed">{contextMessage}</p>

        <div className="flex flex-col gap-1.5 mt-3">
          {chips.map(chip => (
            <button
              key={chip}
              onClick={() => handleSend(chip)}
              className="w-full text-left text-xs text-[#C4B5FD] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg px-3 py-2 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder="Ask FIGSY anything…"
            className="flex-1 text-xs bg-white/[0.08] border border-white/10 rounded-lg px-3 py-2 text-white placeholder-white/30 focus:outline-none focus:border-purple-400/50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || thinking}
            className="w-8 h-8 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded-lg flex items-center justify-center transition-colors shrink-0"
          >
            {thinking
              ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              : <Send className="w-3.5 h-3.5 text-white" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
