'use client'

/** One-wallet explainer (#447) — teaches the money model before the client's first
 *  purchase: one wallet, $99 to start, a flat $4 per approved lead (final). Shows until
 *  they've funded the wallet (hasPurchase) or dismiss it. */

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { PACK_PRICE_USD } from '@kind/shared'

interface Props {
  clientId: string
  hasPurchase: boolean
}

export function OneWalletExplainer({ clientId, hasPurchase }: Props) {
  const dismissKey = `kind_wallet_explainer_dismissed_${clientId || 'anon'}`
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try { if (localStorage.getItem(dismissKey) === '1') setDismissed(true) } catch { /* ignore */ }
  }, [dismissKey])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(dismissKey, '1') } catch { /* ignore */ }
  }

  // Once the client has funded their wallet they know the model — stop showing it.
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
      <p className="text-xs font-bold uppercase tracking-wider text-[#9B8EC4] mb-2.5">How your wallet works</p>
      <div className="space-y-2 text-sm">
        <p className="flex items-start gap-2 text-gray-700">
          <span className="shrink-0">👛</span>
          <span><span className="font-semibold text-[#7C3AED]">One wallet.</span> ${PACK_PRICE_USD} to start, then free top-ups whenever you need them.</span>
        </p>
        <p className="flex items-start gap-2 text-gray-700">
          <span className="shrink-0">✅</span>
          <span>Each approved lead is a flat <span className="font-semibold text-[#7C3AED]">$4</span> — final. Reviewing leads is free.</span>
        </p>
      </div>
    </div>
  )
}
