'use client'

import { useState } from 'react'
import { Send, Loader2 } from 'lucide-react'

export interface AgentChip {
  label: string
  onClick: () => void
}

interface AgentSidePanelProps {
  agentId: string
  name: string
  role: string
  tagline?: string
  contextMessage: string
  chips: AgentChip[]
  onSend: (msg: string) => void
  inputPlaceholder?: string
  online?: boolean
}

export function AgentSidePanel({
  agentId,
  name,
  role,
  tagline,
  contextMessage,
  chips,
  onSend,
  inputPlaceholder = 'Ask anything…',
  online = true,
}: AgentSidePanelProps) {
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)

  function handleSend(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg) return
    setThinking(true)
    onSend(msg)
    setInput('')
    setTimeout(() => setThinking(false), 600)
  }

  return (
    <div className="rounded-2xl overflow-hidden shadow-lg border border-purple-100/30">
      {/* Agent photo */}
      <div className="relative h-56 bg-[#0F0929]">
        <img
          src={`/agents/${agentId}.png`}
          alt={name}
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0F0929] via-[#0F0929]/20 to-transparent" />
      </div>

      {/* Identity + context + actions */}
      <div className="bg-[#0F0929] px-4 pt-3 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-base leading-tight">{name}</p>
            <p className="text-[#9B8EC4] text-xs mt-0.5">
              {role}{tagline ? ` · ${tagline}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
            <span className={`text-[11px] font-medium ${online ? 'text-emerald-400' : 'text-slate-400'}`}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        <p className="text-white/70 text-xs mt-3 leading-relaxed">{contextMessage}</p>

        <div className="flex flex-col gap-1.5 mt-3">
          {chips.map(chip => (
            <button
              key={chip.label}
              onClick={chip.onClick}
              className="w-full text-left text-xs text-[#C4B5FD] bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 rounded-lg px-3 py-2 transition-colors"
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSend() }}
            placeholder={inputPlaceholder}
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
