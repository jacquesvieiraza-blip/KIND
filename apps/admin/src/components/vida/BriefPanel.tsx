'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ MVP1 (Preview 07) — OPENING SOMEBODY WHOSE BRIEF MILLA IS STILL COLLECTING.
//
// 🛑 WHAT THIS MAKES REACHABLE. Until the client confirms there is no `clients` row, so this
// person had no screen at all: an operator could see nothing between "signed up" and "a client
// appeared". Preview 07 — ten of eleven facts held, confirmation still pending — was not a
// state the product could show.
//
// ⚠️ IT IS THE SAME PANEL SHELL AS A CLIENT'S, ON PURPOSE. `LifecyclePanel` already renders
// fact, ticks and note cards; a second panel component would be a second set of paddings,
// weights and card shapes to keep in step with it. What differs is only what is inside, and
// that comes from `briefPanelCopy`.
//
// ⚠️ AND IT OFFERS NOTHING TO PRESS. `actions={[]}` is the whole interaction design: the brief
// is Milla's to collect and the confirmation is the client's to give. There is no operator
// action that can move either, so there is no control here that could imply otherwise.
//
// ⚠️ ONE REFRESH POLICY IN THIS CONSOLE, NOT TWO. The interval, the hidden-tab rule and the
// "a failed read changes nothing" rule are `@/lib/vida-rail-refresh` — the same module the
// rail beside this panel uses. A panel with its own polling rules would drift from the row
// that opened it, and the operator would see two different answers about one person.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from 'react'
import { LifecyclePanel } from '@/components/vida/LifecyclePanel'
import { briefPanelCopy } from '@/lib/vida-brief-copy'
import { nextRailValue, shouldPollNow, RAIL_REFRESH_MS } from '@/lib/vida-rail-refresh'

/** The projection `/operator/brief-drafts` returns. Never a client — see `VidaClients.tsx`. */
type DraftRow = {
  id: string
  company_name: string | null
  contact_name: string | null
  created_at: string
  brief: { collected: number; total: number; missing: string[]; complete: boolean }
  confirmed_at: string | null
}

/**
 * ⚠️ THREE OUTCOMES, NOT TWO. "Read it and they are there", "read it and they are GONE"
 * (promoted — they are a client now, which is the good ending) and "could not read it at all"
 * are different answers, and collapsing the last two would tell an operator that somebody
 * confirmed when in truth the proxy blinked.
 */
type Reading =
  | { kind: 'draft'; row: DraftRow }
  | { kind: 'gone' }
  | null

export function BriefPanel({ draftId }: { draftId: string }) {
  const [reading, setReading] = useState<Reading>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (alive: () => boolean) => {
    try {
      const j = await fetch('/api/proxy/operator/brief-drafts').then(r => r.json())
      if (!alive()) return
      if (!j?.success) throw new Error(j?.error || 'the API returned no data')
      const row = ((j.data ?? []) as DraftRow[]).find(d => d.id === draftId) ?? null
      // ⚠️ A SUCCESSFUL READ REPLACES, INCLUDING WITH "GONE". The route returns only
      // UNPROMOTED drafts, so an absent row on a good read means this person confirmed and
      // became a client. That must reach the screen; it is the outcome the panel is waiting for.
      setReading(prev => nextRailValue<Reading>(prev, { ok: true, value: row ? { kind: 'draft', row } : { kind: 'gone' } }))
      setError(null)
    } catch (e) {
      if (!alive()) return
      // ⚠️ A FAILED READ CHANGES NOTHING. Blanking the panel on a transient 500 would read as
      // "they are gone", which is precisely the sentence this panel must not say by accident.
      setReading(prev => {
        if (prev === null) setError(e instanceof Error ? e.message : 'Their brief could not be read')
        return nextRailValue<Reading>(prev, { ok: false })
      })
    }
  }, [draftId])

  useEffect(() => {
    let alive = true
    const isAlive = () => alive
    setReading(null); setError(null)
    void load(isAlive)
    const timer = setInterval(() => { if (shouldPollNow(document.hidden)) void load(isAlive) }, RAIL_REFRESH_MS)
    const onVisible = () => { if (!document.hidden) void load(isAlive) }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      alive = false
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  if (reading === null) {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
        <p className="text-[13px] text-[#9b8ec4] max-w-sm">
          {error
            ? `Their brief could not be read (${error}). Nothing has changed, and nothing is sending.`
            : 'Reading their brief…'}
        </p>
      </div>
    )
  }

  if (reading.kind === 'gone') {
    return (
      <div className="flex-1 min-h-0 flex items-center justify-center px-6 text-center">
        <p className="text-[13px] text-[#9b8ec4] max-w-sm">
          They confirmed their brief. They are a client now — pick them out of the list above.
        </p>
      </div>
    )
  }

  const d = reading.row
  const copy = briefPanelCopy({
    collected: d.brief.collected,
    total: d.brief.total,
    missing: d.brief.missing,
    confirmedAt: d.confirmed_at,
  })

  return (
    <LifecyclePanel
      clientName={d.company_name || d.contact_name || 'Signed up'}
      subtitle={copy.subtitle}
      cards={copy.cards}
      actions={[]}
      busy={null}
      message={null}
      onAction={() => { /* there is no action on this panel — see the header */ }}
    />
  )
}
