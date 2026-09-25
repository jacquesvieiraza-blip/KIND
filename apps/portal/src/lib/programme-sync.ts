// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R161) — MILLA HEARS WHAT HAPPENED IN VIDA, WITHOUT A REFRESH.
//
// The founder: *"again. one does not push info unless i keep refreshing. this should be bi
// directional sync. milla does something vida needs it needs to up me in vida and vica versa."*
//
// The programme page re-reads the programme every SYNC_CHECK_MS and on return to the tab. This
// decides what moved and what Milla tells the client — once per event (the key carries the
// timestamp). Pure, so it is tested directly. Nothing here grants, charges or sends anything.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const SYNC_CHECK_MS = 20_000

export type MillaSyncFacts = {
  stage: string
  firstAt: string | null
  secondAt: string | null
  approvedAt: string | null
  wentLiveAt: string | null
  paused: boolean
}

type Source = {
  stage: string; paused: boolean; approvedAt: string | null; wentLiveAt: string | null
  money: { firstPaidAt: string | null; secondPaidAt: string | null; firstAuthorisedAt?: string | null; secondAuthorisedAt?: string | null }
}

export function millaFacts(p: Source): MillaSyncFacts {
  return {
    stage: p.stage,
    firstAt: p.money.firstPaidAt ?? p.money.firstAuthorisedAt ?? null,
    secondAt: p.money.secondPaidAt ?? p.money.secondAuthorisedAt ?? null,
    approvedAt: p.approvedAt,
    wentLiveAt: p.wentLiveAt,
    paused: p.paused,
  }
}

export function sameMillaFacts(a: MillaSyncFacts, b: MillaSyncFacts): boolean {
  return a.stage === b.stage && a.firstAt === b.firstAt && a.secondAt === b.secondAt
    && a.approvedAt === b.approvedAt && a.wentLiveAt === b.wentLiveAt && a.paused === b.paused
}

/** What Milla says about a change made elsewhere. Each item is said once, by its key. */
export function millaChangeLines(prev: MillaSyncFacts, next: MillaSyncFacts): { key: string; lines: string[] }[] {
  const out: { key: string; lines: string[] }[] = []
  if (!prev.firstAt && next.firstAt) {
    out.push({ key: `sync-first-${next.firstAt}`, lines: ['Your programme is authorised — I’m finding and preparing your people now. Nothing is sent until you approve.'] })
  }
  if (!prev.secondAt && next.secondAt) {
    out.push({ key: `sync-second-${next.secondAt}`, lines: ['Your programme is fully authorised. It goes live next — nothing is sent until then.'] })
  }
  if (!prev.wentLiveAt && next.wentLiveAt) {
    out.push({ key: `sync-live-${next.wentLiveAt}`, lines: ['Your programme is now live.'] })
  }
  if (!prev.paused && next.paused) out.push({ key: `sync-paused-${next.stage}-${Date.now()}`, lines: ['Your programme is paused. Nothing is being sent.'] })
  if (prev.paused && !next.paused) out.push({ key: `sync-resumed-${next.stage}-${Date.now()}`, lines: ['Your programme has resumed.'] })
  if (out.length === 0 && prev.stage !== next.stage) {
    out.push({ key: `sync-stage-${next.stage}`, lines: [`Your programme has moved on to ${next.stage} — this screen has updated.`] })
  }
  return out
}
