'use client'

import { useState } from 'react'
import { Gift, Copy, Check, X } from 'lucide-react'

interface Props {
  referralCode: string
}

export function ReferralBanner({ referralCode }: Props) {
  const [dismissed, setDismissed]   = useState(false)
  const [copied, setCopied]         = useState(false)

  if (dismissed) return null

  const referralUrl = `https://app.get-kind.com/login?ref=${referralCode}`

  async function handleCopy() {
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-gradient-to-r from-[#001f4d] to-[#003080] rounded-xl p-5 flex items-start justify-between gap-4 text-white">
      <div className="flex items-start gap-4 flex-1">
        <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center shrink-0 mt-0.5">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-sm">Refer a friend — both of you get $100 in leads</p>
          <p className="text-white/60 text-xs mt-0.5 mb-3">
            Share your link. When they sign up and run their first ICP, you each get 100 credits ($100 worth of leads) added automatically.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-xs text-white/80 font-mono truncate">
              {referralUrl}
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white text-[#001f4d] text-xs font-semibold hover:bg-white/90 transition-colors shrink-0">
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </div>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 hover:bg-white/10 rounded transition-colors shrink-0">
        <X className="w-4 h-4 text-white/50" />
      </button>
    </div>
  )
}
