'use client'

import { useState } from 'react'
import { Link2, Check } from 'lucide-react'

export function CopyShareLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${token}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 text-xs text-[#9B8EC4] hover:text-[#7C3AED] transition-colors"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Link2 className="w-3.5 h-3.5" />}
      {copied ? 'Copied!' : 'Copy share link'}
    </button>
  )
}
