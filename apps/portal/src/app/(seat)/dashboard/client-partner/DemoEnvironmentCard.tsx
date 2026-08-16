'use client'

/**
 * HER DEMO ENVIRONMENT (#654) — the product she is selling, in her own hands.
 *
 * Built already and never given to her: `provisionPartnerSandbox` has always created a full
 * demo client (its own ICP, pool leads, 90-day expiry) and fired only on the LEGACY partner
 * approval path, so a Client Partner had never once seen the thing she was describing.
 *
 * It costs nothing to give her. A demo client is `is_demo`, and #453 makes demo sourcing
 * POOL-ONLY at $0 — no PDL search, no spend, no allowance drawn.
 *
 * ⚠️ THE SAME TWO ENDPOINTS THE LEGACY HUB USES (`/partners/me/sandbox` and
 * `/partners/me/sandbox-login`). Not a second door: a second way into the same environment
 * is a second thing to get wrong, and it is how the wrong-console bugs of 16 Aug happened.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { MonitorPlay, ExternalLink, Loader2 } from 'lucide-react'

type SandboxInfo = { provisioned: boolean; sandbox_client_id?: string; expires_at?: string; reason?: string }

export function DemoEnvironmentCard() {
  const [sandbox, setSandbox] = useState<SandboxInfo | null>(null)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let live = true
    ;(async () => {
      try {
        const { data } = await createClient().auth.getSession()
        const info = await api.get<SandboxInfo>('/partners/me/sandbox', data.session?.access_token)
        if (live) setSandbox(info)
      } catch {
        if (live) setSandbox(null)   // never take the page down for this
      }
    })()
    return () => { live = false }
  }, [])

  async function open() {
    setOpening(true); setError(null)
    try {
      const { data } = await createClient().auth.getSession()
      const res = await api.post<{ data: { magic_link: string | null } }>('/partners/me/sandbox-login', {}, data.session?.access_token)
      const link = res?.data?.magic_link
      if (link) window.open(link, '_blank', 'noopener,noreferrer')
      else setError('Could not open it just now — try again in a moment.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open it just now')
    }
    setOpening(false)
  }

  // Nothing to show until one exists. It is created the moment the founder counter-signs.
  if (!sandbox?.provisioned) return null

  return (
    <div className="rounded-2xl border border-[#e7e2ef] bg-white p-5 mb-6 flex items-start gap-4 flex-wrap">
      <span className="w-10 h-10 rounded-xl bg-[#f1ebff] text-[#5b21b6] flex items-center justify-center shrink-0">
        <MonitorPlay className="w-5 h-5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-bold text-[#1E0A5C]">Your demo environment</h2>
        <p className="text-[13px] text-[#6b6383] leading-relaxed mt-0.5">
          A full working version of the product, loaded with example leads, that is yours to drive.
          Show somebody what they would actually be buying instead of describing it.
          {sandbox.expires_at && (
            <> Available until {new Date(sandbox.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}.</>
          )}
        </p>
        {error && <p className="text-[12.5px] text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</p>}
      </div>
      <button onClick={open} disabled={opening}
        className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm disabled:opacity-60 flex items-center gap-1.5 shrink-0">
        {opening ? <><Loader2 className="w-4 h-4 animate-spin" /> Opening…</> : <>Open it <ExternalLink className="w-3.5 h-3.5" /></>}
      </button>
    </div>
  )
}
