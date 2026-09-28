'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 28 Sep (R171) — EVERY VIDA SCREEN STAYS IN STEP WITH MILLA, WITHOUT A REFRESH.
//
// Founder: *"everytime i update or push in Vida it needs to auto update Milla. and vica
// versa."* R161 (25 Sep) did this for the programme status only. Found on the end-to-end walk:
// the founder set the client's size in Vida and the client's price screen sat on "price
// pending" until they reloaded — and meetings, replies and the pipeline never moved either.
//
// WHAT IT DOES: re-runs the screen's own silent read every LIVE_REFRESH_MS, and at once when
// the operator comes back to the tab. Skipped while the tab is hidden. READ-ONLY — it grants,
// charges and sends nothing; it only re-asks the server what the screen already shows.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'

/** How often an open Vida panel re-reads. The same pace as R161's programme sync. */
export const LIVE_REFRESH_MS = 20_000

export function useLiveRefresh(refresh: () => unknown, enabled = true): void {
  const ref = useRef(refresh)
  useEffect(() => { ref.current = refresh }, [refresh])
  useEffect(() => {
    if (!enabled) return
    let inFlight = false
    const run = async () => {
      if (inFlight || document.visibilityState === 'hidden') return
      inFlight = true
      try { await ref.current() } catch { /* the next tick tries again */ } finally { inFlight = false }
    }
    const t = setInterval(() => { void run() }, LIVE_REFRESH_MS)
    const onReturn = () => { if (document.visibilityState === 'visible') void run() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [enabled])
}
