'use client'

import { useState } from 'react'
import { RefreshCw, Loader2 } from 'lucide-react'

interface Props {
  agentId: string
  agentName: string
}

interface BriefData {
  brief: string
  generated_at: string
}

export default function AgentBriefSection({ agentId, agentName }: Props) {
  const [briefData, setBriefData] = useState<BriefData | null>(null)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  async function fetchBrief() {
    setLoading(true)
    setError(null)
    try {
      const adminKey = process.env.NEXT_PUBLIC_ADMIN_KEY || ''
      const res = await fetch(`/api/proxy/internal/briefs/${agentId}`, {
        headers: adminKey ? { 'x-admin-key': adminKey } : {},
        cache: 'no-store',
      })
      const json = await res.json()
      if (json.success && json.data) {
        setBriefData({ brief: json.data.brief, generated_at: json.data.generated_at })
      } else {
        const msg = json.error || 'Failed to generate brief'
        if (msg.includes('Unauthorized') || msg.includes('ADMIN')) {
          setError('Brief unavailable — set ADMIN_API_KEY in Railway')
        } else {
          setError(msg)
        }
      }
    } catch {
      setError('Brief unavailable — check API connection')
    }
    setLoading(false)
    setHasFetched(true)
  }

  const bullets = briefData?.brief
    ? briefData.brief.split('\n').filter(line => line.trim().length > 0)
    : []

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${briefData ? 'bg-emerald-400' : 'bg-white/20'}`} />
          <h2 className="font-semibold text-white">Today&apos;s Brief</h2>
        </div>
        <div className="flex items-center gap-3">
          {briefData?.generated_at && (
            <span className="text-xs text-white/30">
              Generated {new Date(briefData.generated_at).toLocaleTimeString('en-GB', { timeStyle: 'short' })}
            </span>
          )}
          <button
            onClick={fetchBrief}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] rounded-lg text-xs text-white/60 hover:text-white/80 transition-colors disabled:opacity-50"
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <RefreshCw className="w-3.5 h-3.5" />}
            {hasFetched ? 'Regenerate' : 'Generate Brief'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="bg-amber-400/[0.06] border border-amber-400/20 rounded-lg p-4">
          <p className="text-amber-400/80 text-sm">{error}</p>
        </div>
      ) : briefData ? (
        <div className="space-y-2">
          {bullets.map((line, i) => (
            <p
              key={i}
              className="text-sm text-white/70 pl-4 border-l-2 border-white/10 py-1 leading-relaxed"
            >
              {line.replace(/^[•\-]\s*/, '')}
            </p>
          ))}
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5 text-center">
          <p className="text-white/40 text-sm">
            Click &quot;Generate Brief&quot; to get {agentName}&apos;s daily briefing using live platform data.
          </p>
          <p className="text-white/20 text-xs mt-2">
            Powered by Claude Haiku · Data from Supabase
          </p>
        </div>
      )}
    </div>
  )
}
