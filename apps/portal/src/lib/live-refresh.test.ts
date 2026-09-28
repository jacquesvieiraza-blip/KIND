// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 28 Sep (R171) — EVERY SCREEN STAYS IN STEP, BOTH WAYS, WITHOUT A REFRESH.
//
// Founder: "everytime i update or push in Vida it needs to auto update Milla. and vica versa."
// Found on the end-to-end walk: the founder set the client's size in Vida and the client's
// price screen stayed on "price pending" until they reloaded. R161 only ever covered the
// programme STATUS, and only once a programme existed.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const portal = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')
const admin = (f: string) => readFileSync(join(__dirname, '../../../admin/src', f), 'utf8')

describe('the one hook, on each side', () => {
  for (const [side, src] of [['Milla', portal('lib/use-live-refresh.ts')], ['Vida', admin('lib/use-live-refresh.ts')]] as const) {
    it(`${side}: every 20s, at once on return to the tab, never while hidden, one read at a time`, () => {
      expect(src).toContain('export const LIVE_REFRESH_MS = 20_000')
      expect(src).toContain('const t = setInterval(() => { void run() }, LIVE_REFRESH_MS)')
      expect(src).toContain("document.addEventListener('visibilitychange', onReturn)")
      expect(src).toContain("window.addEventListener('focus', onReturn)")
      expect(src).toContain("if (inFlight || document.visibilityState === 'hidden') return")
      expect(src, 'and it is torn down with the screen').toContain('clearInterval(t)')
    })
  }
})

describe('🛑 Vida → Milla', () => {
  it('🛑 the price screen re-reads its quote — a size set in Vida shows without a reload', () => {
    const calc = portal('components/milla/ProgrammeCalculator.tsx')
    expect(calc).toContain('useLiveRefresh(() => setFreshness(n => n + 1))')
    expect(calc).toContain('}, [query, freshness])')
    expect(calc, 'a failed background re-read keeps the quote on screen')
      .toContain("if (live && !background) setErr(")
  })

  it('the programme screens reload on ANY change, and before a programme exists too', () => {
    const hook = portal('components/milla/useProgrammeSync.ts')
    expect(hook, 'the old gate, as code (a dated note may still quote it)').not.toMatch(/^\s+if \(!hasProgramme\) return$/m)
    expect(hook).toContain('if (JSON.stringify(shown) !== JSON.stringify(r.data)) await reloadRef.current()')
  })

  it('meetings, pipeline and replies re-read on their own', () => {
    expect(portal('app/(milla)/milla/meetings/page.tsx')).toContain('useLiveRefresh(load)')
    expect(portal('app/(milla)/milla/pipeline/page.tsx')).toContain('useLiveRefresh(load)')
    expect(portal('components/milla/MillaInbox.tsx')).toContain('useLiveRefresh(load)')
  })
})

describe('🛑 Milla → Vida', () => {
  const vida = admin('app/vida/page.tsx')
  it('the open client re-reads quietly — no spinner, no error over what is shown', () => {
    expect(vida).toContain('useLiveRefresh(() => { const id = selectedRef.current; return id ? loadCockpit(id, true) : undefined }, !!selected)')
    expect(vida).toContain('if (!quiet) { setCockpitLoading(true); setCockpitError(null) }')
    expect(vida, 'a late answer for another client is dropped').toContain('if (quiet && selectedRef.current !== clientId) return')
  })

  it('a programme chosen in Milla appears in Vida, and only after the panel said "none"', () => {
    expect(vida).toContain('if (!progRef.current || progRef.current.programme !== null) return')
    expect(vida).toContain('chose a programme in Milla — it is on the Programme tab now.')
    expect(vida).toContain('if (JSON.stringify(shown) !== JSON.stringify(next)) await loadProgramme(clientId)')
  })

  it('the Company size box re-reads, and never touches the form being filled', () => {
    const size = admin('components/vida/ClientSizePanel.tsx')
    expect(size).toContain('useLiveRefresh(load)')
    // `load` sets only the read-back; the band/employees/note inputs are reset on client change alone.
    const load = size.slice(size.indexOf('const load = useCallback'), size.indexOf('}, [clientId])'))
    expect(load).not.toMatch(/setBand|setEmployees|setNote/)
  })
})

describe('read-only, both sides', () => {
  it('neither hook writes anything', () => {
    for (const src of [portal('lib/use-live-refresh.ts'), admin('lib/use-live-refresh.ts')]) {
      expect(src).not.toMatch(/api\.(post|put|patch|delete)|method:\s*'(POST|PUT|PATCH|DELETE)'/)
    }
  })
})
