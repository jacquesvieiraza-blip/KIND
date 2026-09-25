'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R161) — THE ONE PROGRAMME SYNC, USED BY EVERY MILLA SCREEN THAT SHOWS A PROGRAMME.
//
// ⛓️ WAS INLINE IN `milla/programme/page.tsx` ONLY. The founder tested the two-way sync from
// Milla HOME — the screen a client actually lives on — and Home never re-read anything. One hook,
// so the two screens cannot drift: re-read `/my/programme` every SYNC_CHECK_MS and on return to
// the tab; if something moved elsewhere, reload the screen and have Milla say it once per event —
// ⛓️ and (R162) KEEP it in the thread, so a refresh does not lose it.
// Read-only: it grants, charges and sends nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useEffect, useRef } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
import type { CustomerProgramme } from '@/components/milla/ProgrammeWorkspace'
import { SYNC_CHECK_MS, millaFacts, sameMillaFacts, millaChangeLines } from '@/lib/programme-sync'
import type { MillaNoticeKind } from '@kind/shared'

export function useProgrammeSync(
  p: CustomerProgramme | null,
  reload: () => unknown,
  keepNotice: (key: string, kind: MillaNoticeKind, param?: string | number | null) => void,
): void {
  const pRef = useRef<CustomerProgramme | null>(p)
  useEffect(() => { pRef.current = p }, [p])
  const reloadRef = useRef(reload)
  useEffect(() => { reloadRef.current = reload }, [reload])
  const sayRef = useRef(keepNotice)
  useEffect(() => { sayRef.current = keepNotice }, [keepNotice])

  const hasProgramme = !!p?.hasProgramme
  useEffect(() => {
    if (!hasProgramme) return
    let stopped = false
    const check = async () => {
      try {
        const { data: { session } } = await createClient().auth.getSession()
        const r = await api.get<{ data: CustomerProgramme }>('/my/programme', session?.access_token)
        const shown = pRef.current
        if (stopped || !r.data || !shown) return
        const before = millaFacts(shown), after = millaFacts(r.data)
        if (sameMillaFacts(before, after)) return
        await reloadRef.current()
        for (const c of millaChangeLines(before, after)) sayRef.current(c.key, c.kind, c.param)
      } catch { /* the next tick tries again */ }
    }
    const t = setInterval(() => { void check() }, SYNC_CHECK_MS)
    const onReturn = () => { if (document.visibilityState === 'visible') void check() }
    document.addEventListener('visibilitychange', onReturn)
    window.addEventListener('focus', onReturn)
    return () => {
      stopped = true
      clearInterval(t)
      document.removeEventListener('visibilitychange', onReturn)
      window.removeEventListener('focus', onReturn)
    }
  }, [hasProgramme])
}
