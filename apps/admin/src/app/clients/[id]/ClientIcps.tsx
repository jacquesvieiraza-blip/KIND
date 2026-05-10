'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, Loader2, Clock } from 'lucide-react'

const ADMIN_API = '/api/admin'

interface ICP {
  id: string
  industries: string[]
  job_titles: string[]
  company_sizes: string[]
  locations: string[]
  keywords: string[]
  status: string
  review_notes: string | null
  created_at: string
  reviewed_at: string | null
}

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-500',
  pending_review: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
}

export function ClientIcps({ icps: initialIcps }: { clientId: string; icps: ICP[] }) {
  const [icps, setIcps] = useState(initialIcps)
  const [actioning, setActioning] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState<Record<string, string>>({})

  async function handleAction(icpId: string, status: 'approved' | 'rejected') {
    setActioning(icpId)
    try {
      const res = await fetch(`${ADMIN_API}/icps/${icpId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, review_notes: rejectNote[icpId] }),
      })
      const data = await res.json() as { success: boolean; data: ICP }
      if (data.success) {
        setIcps((prev) => prev.map((i) => i.id === icpId ? data.data : i))
      }
    } catch { /* ignore */ }
    setActioning(null)
  }

  return (
    <div className="space-y-4">
      {icps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400 text-sm">
          No ICPs created yet
        </div>
      ) : icps.map((icp) => (
        <div key={icp.id} className="bg-white rounded-xl border border-gray-100 p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex flex-wrap gap-1.5">
              {icp.industries.map((i) => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">{i}</span>
              ))}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-md capitalize ${STATUS_BADGE[icp.status]}`}>
                {icp.status.replace('_', ' ')}
              </span>
            </div>
            <p className="text-xs text-gray-400 whitespace-nowrap shrink-0">
              {new Date(icp.created_at).toLocaleDateString('en-ZA')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
            <div>
              <p className="text-gray-400 mb-0.5">Job Titles</p>
              <p>{icp.job_titles.join(', ')}</p>
            </div>
            {icp.locations.length > 0 && (
              <div>
                <p className="text-gray-400 mb-0.5">Locations</p>
                <p>{icp.locations.join(', ')}</p>
              </div>
            )}
            {icp.company_sizes.length > 0 && (
              <div>
                <p className="text-gray-400 mb-0.5">Company Sizes</p>
                <p>{icp.company_sizes.join(', ')}</p>
              </div>
            )}
            {icp.keywords.length > 0 && (
              <div>
                <p className="text-gray-400 mb-0.5">Keywords</p>
                <p>{icp.keywords.join(', ')}</p>
              </div>
            )}
          </div>

          {icp.review_notes && (
            <p className="text-xs text-red-500 mb-3 flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5" /> {icp.review_notes}
            </p>
          )}

          {icp.status === 'pending_review' && (
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Rejection notes (optional)"
                value={rejectNote[icp.id] ?? ''}
                onChange={(e) => setRejectNote((prev) => ({ ...prev, [icp.id]: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAction(icp.id, 'approved')}
                  disabled={actioning === icp.id}
                  className="flex items-center gap-1.5 text-sm font-medium bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  {actioning === icp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  Approve
                </button>
                <button
                  onClick={() => handleAction(icp.id, 'rejected')}
                  disabled={actioning === icp.id}
                  className="flex items-center gap-1.5 text-sm font-medium bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          )}

          {icp.status === 'approved' && (
            <div className="flex items-center gap-1.5 text-green-600 text-xs">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved {icp.reviewed_at ? `on ${new Date(icp.reviewed_at).toLocaleDateString('en-ZA')}` : ''}
            </div>
          )}

          {icp.status === 'draft' && (
            <div className="flex items-center gap-1.5 text-gray-400 text-xs">
              <Clock className="w-3.5 h-3.5" />
              Not yet submitted for review
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
