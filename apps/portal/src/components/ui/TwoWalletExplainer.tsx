'use client'

/** Two-wallet explainer (#447) — teaches the two-charge money model before the
 *  client's first purchase. Shows until they've bought credits (hasPurchase) or
 *  dismiss it. Mirrors the two credit pills in the layout header/sidebar:
 *    🪙 Reveal credits ($1)   ⚡ FIGSY credits ($3). */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  clientId: string
  hasPurchase: boolean
}

export function TwoWalletExplainer({ clientId, hasPurchase }: Props) {
  const dismissKey = `kind_wallet_explainer_dismissed_${clientId || 'anon'}`
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem(dismissKey) === '1') setDismissed(true) } catch { /* ignore */ }
  }, [dismissKey])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(dismissKey, '1') } catch { /* ignore */ }
  }

  // Once the client has purchased they know the model — stop showing it.
  if (hasPurchase || dismissed) return null

  return (
    <div className="relative bg-white rounded-xl border border-purple-100/60 shadow-sm px-5 py-4">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-[#9B8EC4] hover:text-[#7C3AED] transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <p className="text-xs font-bold uppercase tracking-wider text-[#9B8EC4] mb-2.5">How your credits work</p>
      <div className="space-y-2 text-sm">
        <p className="flex items-start gap-2 text-gray-700">
          <span className="shrink-0">🪙</span>
          <span><span className="font-semibold text-amber-700">Reveal credits</span> — $1 shows you exactly who a lead is.</span>
        </p>
        <p className="flex items-start gap-2 text-gray-700">
          <span className="shrink-0">⚡</span>
          <span><span className="font-semibold text-[#7C3AED]">FIGSY credits</span> — $3 puts him to work on them: writes, sends, chases, books.</span>
        </p>
      </div>
    </div>
  )
}
