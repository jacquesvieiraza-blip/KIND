'use client'

// R5 (#82, Monday steal) — Certified-Partner badge. Gives active K.I.N.D
// partners a credibility badge they can add straight to their LinkedIn profile
// (LinkedIn's native "add certification" flow) or copy as a caption. A free
// distribution loop — every partner badge on LinkedIn markets K.I.N.D.

import { useState } from 'react'
import { BadgeCheck, Linkedin, Copy, CheckCircle } from 'lucide-react'

export function CertifiedPartnerBadge({ partnerName, tierLabel }: { partnerName: string; tierLabel: string }) {
  const [copied, setCopied] = useState(false)

  function addToLinkedIn() {
    // LinkedIn native "Add to profile" certification deep-link.
    const params = new URLSearchParams({
      startTask:        'CERTIFICATION_NAME',
      name:             `K.I.N.D Certified ${tierLabel} Partner`,
      organizationName: 'K.I.N.D',
    })
    window.open(`https://www.linkedin.com/profile/add?${params.toString()}`, '_blank', 'noopener,noreferrer')
  }

  async function copyCaption() {
    const caption = `Proud to be a K.I.N.D Certified ${tierLabel} Partner 🤝\n\nHelping businesses put AI to work on their sales pipeline. Reach out if you'd like an intro.\n\n#partnership #AI #sales`
    try {
      await navigator.clipboard.writeText(caption)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch { /* ignore */ }
  }

  return (
    <div className="rounded-2xl border border-purple-100 bg-white shadow-sm p-5">
      <div className="flex items-start gap-4">
        {/* Badge mark */}
        <div className="shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] flex items-center justify-center shadow-md shadow-purple-300/40">
          <BadgeCheck className="w-8 h-8 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7C3AED]/60">Certified Partner</p>
          <p className="text-lg font-bold text-[#1E1152] leading-tight">K.I.N.D Certified {tierLabel} Partner</p>
          <p className="text-sm text-gray-500 mt-0.5">{partnerName} — verified and active. Show it off.</p>
          <div className="flex flex-wrap items-center gap-2 mt-3.5">
            <button
              onClick={addToLinkedIn}
              className="inline-flex items-center gap-1.5 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg px-3.5 py-2 hover:bg-[#6D28D9] transition-colors"
            >
              <Linkedin className="w-4 h-4" /> Add to LinkedIn profile
            </button>
            <button
              onClick={copyCaption}
              className="inline-flex items-center gap-1.5 border border-purple-100 text-[#7C3AED] text-sm font-medium rounded-lg px-3.5 py-2 hover:bg-purple-50 transition-colors"
            >
              {copied ? <><CheckCircle className="w-4 h-4 text-green-500" /> Caption copied</> : <><Copy className="w-4 h-4" /> Copy caption</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
