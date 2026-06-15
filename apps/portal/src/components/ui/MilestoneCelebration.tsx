'use client'

// R5 (#81, Monday steal) — Milestone share cards. When a client crosses a
// notable lead milestone, celebrate it and give them a one-tap way to post the
// win to LinkedIn (a free, founder-led growth loop). Each milestone is shown
// once; the last-celebrated threshold is remembered in localStorage. Purely
// additive — renders nothing until a new milestone is crossed.

import { useState, useEffect } from 'react'
import { Linkedin, Copy, X, PartyPopper, CheckCircle } from 'lucide-react'

const STORAGE_KEY = 'kind_milestone_celebrated_v1'
const MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000]

function copyText(milestone: number, companyName: string): string {
  const who = companyName ? `At ${companyName}, we` : 'We'
  if (milestone === 1) {
    return `${who} just sourced our first AI-qualified sales lead with K.I.N.D 🚀\n\nLetting AI handle the prospecting so the team can focus on closing. Excited for what's next.\n\n#sales #AI #B2B`
  }
  return `${who}'ve now reached ${milestone.toLocaleString()} AI-sourced sales leads with K.I.N.D 🎉\n\nOur AI SDR finds and qualifies prospects around the clock — the pipeline keeps filling itself.\n\n#sales #AI #B2B #growth`
}

export function MilestoneCelebration({ leadCount, companyName }: { leadCount: number; companyName: string }) {
  const [milestone, setMilestone] = useState<number | null>(null)
  const [copied, setCopied]       = useState(false)

  useEffect(() => {
    // Highest milestone the client has crossed.
    const reached = [...MILESTONES].reverse().find(m => leadCount >= m)
    if (!reached) return
    let lastCelebrated = 0
    try { lastCelebrated = Number(localStorage.getItem(STORAGE_KEY) || '0') } catch { /* ignore */ }
    if (reached > lastCelebrated) setMilestone(reached)
  }, [leadCount])

  function dismiss() {
    if (milestone != null) {
      try { localStorage.setItem(STORAGE_KEY, String(milestone)) } catch { /* ignore */ }
    }
    setMilestone(null)
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(copyText(milestone!, companyName))
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  function shareLinkedIn() {
    const url = encodeURIComponent('https://get-kind.com')
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'noopener,noreferrer')
  }

  if (milestone == null) return null

  const headline = milestone === 1
    ? 'You sourced your first lead! 🎉'
    : `You've reached ${milestone.toLocaleString()} leads! 🎉`

  return (
    <div className="relative overflow-hidden rounded-2xl border border-purple-200 bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white shadow-lg shadow-purple-400/30 p-5">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-white/70 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <PartyPopper className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-bold leading-tight">{headline}</p>
          <p className="text-sm text-white/80 mt-0.5">
            That's a real milestone — share the win and let your network know what K.I.N.D is doing for you.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            <button
              onClick={shareLinkedIn}
              className="inline-flex items-center gap-1.5 bg-white text-[#7C3AED] text-sm font-semibold rounded-lg px-3.5 py-2 hover:bg-purple-50 transition-colors"
            >
              <Linkedin className="w-4 h-4" /> Share on LinkedIn
            </button>
            <button
              onClick={copy}
              className="inline-flex items-center gap-1.5 bg-white/15 text-white text-sm font-medium rounded-lg px-3.5 py-2 hover:bg-white/25 transition-colors"
            >
              {copied ? <><CheckCircle className="w-4 h-4" /> Caption copied</> : <><Copy className="w-4 h-4" /> Copy caption</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
