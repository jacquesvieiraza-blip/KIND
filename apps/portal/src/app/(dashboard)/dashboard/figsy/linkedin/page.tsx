'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, ExternalLink, Info, Linkedin } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface FigsyLead {
  first_name: string
  last_name: string
  job_title: string
  company: string
}

interface QueueItem {
  id: string
  linkedin_url: string
  connection_note: string
  status: 'pending' | 'approved'
  created_at: string
  figsy_leads: FigsyLead
}

interface QueueResponse {
  queue: QueueItem[]
}

interface ApproveResponse {
  sent: boolean
  method?: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LinkedInQueuePage() {
  const [queue, setQueue] = useState<QueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showManualBanner, setShowManualBanner] = useState(false)
  const [actioningIds, setActioningIds] = useState<Set<string>>(new Set())

  const getToken = useCallback(async (): Promise<string | undefined> => {
    const supabase = createClient()
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token
  }, [])

  const fetchQueue = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const data = await api.get<QueueResponse>('/api/linkedin/queue', token)
      setQueue(data.queue ?? [])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to load queue'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchQueue()
  }, [fetchQueue])

  const handleApprove = useCallback(async (id: string) => {
    setActioningIds(prev => new Set(prev).add(id))
    try {
      const token = await getToken()
      const res = await api.post<ApproveResponse>(`/api/linkedin/approve/${id}`, {}, token)
      if (res.sent === false && res.method === 'manual') {
        setShowManualBanner(true)
      }
      // Optimistically remove from list
      setQueue(prev => prev.filter(item => item.id !== id))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to approve'
      setError(msg)
    } finally {
      setActioningIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [getToken])

  const handleSkip = useCallback(async (id: string) => {
    setActioningIds(prev => new Set(prev).add(id))
    try {
      const token = await getToken()
      await api.post<unknown>(`/api/linkedin/skip/${id}`, {}, token)
      // Optimistically remove from list
      setQueue(prev => prev.filter(item => item.id !== id))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to skip'
      setError(msg)
    } finally {
      setActioningIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }, [getToken])

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">LinkedIn Outreach Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review and approve AI-generated connection requests before they&apos;re sent.
        </p>
      </div>

      {/* Manual-send info banner */}
      {showManualBanner && (
        <div className="flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <span>
            LinkedIn auto-send is not yet configured. Approved steps will be queued — add{' '}
            <code className="rounded bg-blue-100 px-1 font-mono text-xs">PHANTOMBUSTER_API_KEY</code>{' '}
            to Railway to enable auto-dispatch.
          </span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && queue.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white py-20 text-center shadow-sm">
          <Linkedin className="mb-4 h-10 w-10 text-gray-300" />
          <p className="text-sm font-medium text-gray-600">No pending LinkedIn steps.</p>
          <p className="mt-1 text-sm text-gray-400">
            Enqueue leads from a FIGSY campaign to start.
          </p>
          <Link
            href="/dashboard/figsy"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 transition-colors"
          >
            Go to FIGSY
          </Link>
        </div>
      )}

      {/* Queue list */}
      {!loading && queue.length > 0 && (
        <ul className="space-y-4">
          {queue.map(item => {
            const lead = item.figsy_leads
            const isActioning = actioningIds.has(item.id)

            return (
              <li
                key={item.id}
                className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm space-y-3"
              >
                {/* Lead info */}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {lead.job_title}
                      {lead.job_title && lead.company ? ' · ' : ''}
                      {lead.company}
                    </p>
                  </div>
                  <a
                    href={item.linkedin_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    LinkedIn
                  </a>
                </div>

                {/* Connection note */}
                <blockquote className="rounded-xl border-l-4 border-purple-200 bg-purple-50 px-4 py-3 text-sm italic text-gray-700 leading-relaxed">
                  {item.connection_note}
                </blockquote>

                {/* Action buttons */}
                <div className="flex items-center gap-3 pt-1">
                  <button
                    onClick={() => handleApprove(item.id)}
                    disabled={isActioning}
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: '#7c3aed' }}
                    onMouseEnter={e => {
                      if (!isActioning) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#6d28d9'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#7c3aed'
                    }}
                  >
                    {isActioning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Approve
                  </button>
                  <button
                    onClick={() => handleSkip(item.id)}
                    disabled={isActioning}
                    className="inline-flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isActioning ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    Skip
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
