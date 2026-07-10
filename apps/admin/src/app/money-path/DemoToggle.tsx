'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

// #453 — founder action: flag/unflag a client as a demo account. PATCHes through the
// admin proxy (/api/proxy → API /money-path/client/:id/demo, which injects the admin
// key server-side; the secret never touches the browser). Confirm step gates the write.
// Follows the CapEditor pattern exactly.
export default function DemoToggle({
  clientId,
  companyName,
  isDemo,
}: {
  clientId: string
  companyName: string | null
  isDemo: boolean
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function toggle() {
    const next = !isDemo
    const name = companyName || 'this client'
    const msg = next
      ? `Mark ${name} as a DEMO account? Demo accounts cost $0 (pool-only sourcing, free reveals, sandboxed FIGSY), can never email a real prospect, and are excluded from real economics.`
      : `Remove the demo flag from ${name}? It will resume charging real money and count in the real-economics roll-ups.`
    if (!window.confirm(msg)) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/proxy/money-path/client/${clientId}/demo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_demo: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Save failed (${res.status})`)
      }
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" variant={isDemo ? 'outline' : 'ghost'} onClick={toggle} disabled={saving}>
        {saving ? 'Saving…' : isDemo ? 'Unset demo' : 'Mark demo'}
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
