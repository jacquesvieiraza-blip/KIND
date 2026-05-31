'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface Props {
  partnerId: string
  partnerName: string
}

export default function PartnerActionButtons({ partnerId, partnerName }: Props) {
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleApprove() {
    const ok = window.confirm(`Approve ${partnerName} as a partner?`)
    if (!ok) return
    setLoading('approve')
    try {
      const res = await fetch(`/api/proxy/partners/admin/${partnerId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(`${partnerName} approved as a partner`, true)
        // Refresh the page after a short delay to reflect new status
        setTimeout(() => window.location.reload(), 1200)
      } else {
        showToast((data as { error?: string }).error || 'Failed to approve partner', false)
      }
    } catch {
      showToast('Network error — is the API deployed?', false)
    }
    setLoading(null)
  }

  async function handleReject() {
    const ok = window.confirm(`Reject (suspend) ${partnerName}'s partner application?`)
    if (!ok) return
    setLoading('reject')
    try {
      const res = await fetch(`/api/proxy/partners/admin/${partnerId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'suspended' }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        showToast(`${partnerName}'s application rejected`, true)
        setTimeout(() => window.location.reload(), 1200)
      } else {
        showToast((data as { error?: string }).error || 'Failed to reject partner', false)
      }
    } catch {
      showToast('Network error — is the API deployed?', false)
    }
    setLoading(null)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white"
        >
          {loading === 'approve' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <CheckCircle2 className="w-3 h-3" />
          )}
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={loading !== null}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors bg-white hover:bg-red-50 border border-red-200 text-red-600 disabled:opacity-60"
        >
          {loading === 'reject' ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <XCircle className="w-3 h-3" />
          )}
          Reject
        </button>
      </div>
      {toast && (
        <div
          className={`absolute left-0 top-10 z-50 px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg border whitespace-nowrap ${
            toast.ok
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.ok ? '✓ ' : '✗ '}{toast.message}
        </div>
      )}
    </div>
  )
}
