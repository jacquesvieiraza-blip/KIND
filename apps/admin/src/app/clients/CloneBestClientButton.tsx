'use client'

import { useState } from 'react'
import { Loader2, Copy } from 'lucide-react'

export default function CloneBestClientButton() {
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null)

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok })
    setTimeout(() => setToast(null), 5000)
  }

  async function handleClone() {
    setLoading(true)
    try {
      // Step 1: find the best client
      const bestRes = await fetch('/api/proxy/lookalike/best-client')
      const bestData = await bestRes.json()

      if (!bestData.best_client) {
        showToast('No clients with campaign data found.', false)
        setLoading(false)
        return
      }

      const { id: client_id, company_name } = bestData.best_client

      // Step 2: confirm with user
      const ok = window.confirm(
        `Generate 50 lookalike prospects from ${company_name}'s ICP?`
      )
      if (!ok) {
        setLoading(false)
        return
      }

      // Step 3: generate lookalikes
      const genRes = await fetch('/api/proxy/lookalike/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id }),
      })
      const genData = await genRes.json()

      if (!genRes.ok) {
        showToast(genData.error || 'Failed to generate lookalikes.', false)
      } else {
        showToast(
          `${genData.inserted ?? genData.found ?? 50} lookalike prospects added to ${company_name}'s pipeline`,
          true
        )
      }
    } catch {
      showToast('Network error — is the API deployed?', false)
    }
    setLoading(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleClone}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-60 text-white"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
        Clone Best Client
      </button>

      {toast && (
        <div
          className={`absolute right-0 top-12 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border whitespace-nowrap ${
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
