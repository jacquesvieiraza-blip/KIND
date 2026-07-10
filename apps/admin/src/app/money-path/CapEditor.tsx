'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui'

// Founder action — edit the global monthly PDL budget. PATCHes through the admin
// proxy (/api/proxy → API /money-path/cap, which injects the admin key server-side;
// the secret never touches the browser). Confirm step gates the write (#448).
export default function CapEditor({ current }: { current: number }) {
  const router = useRouter()
  const [value, setValue] = useState<string>(String(current))
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    const n = Number(value)
    if (!Number.isFinite(n) || n <= 0) {
      setError('Cap must be a positive number')
      return
    }
    if (!window.confirm(`Set the global monthly PDL budget to $${n.toLocaleString()}? This caps ALL sourcing platform-wide.`)) {
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/proxy/money-path/cap', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdl_monthly_cap_usd: n }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Save failed (${res.status})`)
      }
      setEditing(false)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">
          Monthly PDL budget: <b className="text-gray-900">${current.toLocaleString()}</b>
        </span>
        <Button size="sm" variant="outline" onClick={() => { setValue(String(current)); setEditing(true) }}>
          Edit cap
        </Button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-600">Monthly PDL budget $</span>
      <input
        type="number"
        min={1}
        step={1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-28 h-8 px-2 text-sm border border-brand-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
        disabled={saving}
      />
      <Button size="sm" variant="primary" onClick={save} disabled={saving}>
        {saving ? 'Saving…' : 'Save'}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setError(null) }} disabled={saving}>
        Cancel
      </Button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}
