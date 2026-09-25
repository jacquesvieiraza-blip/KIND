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

import { millaNoticeLines, type MillaNoticeKind } from '@kind/shared'

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

export type MillaChange = { key: string; kind: MillaNoticeKind; param?: string | null; lines: string[] }

/**
 * What Milla says about a change made elsewhere. Each item is said once, by its key.
 * ⛓️ 25 Sep (R162) — the sentences now come from `millaNoticeLines` in `@kind/shared`, the SAME
 * function the server uses to keep them in the thread, so shown and kept cannot differ.
 */
export function millaChangeLines(prev: MillaSyncFacts, next: MillaSyncFacts): MillaChange[] {
  const out: MillaChange[] = []
  const add = (key: string, kind: MillaNoticeKind, param?: string | null) => {
    const lines = millaNoticeLines(kind, param ?? null)
    if (lines) out.push({ key, kind, ...(param ? { param } : {}), lines })
  }
  if (!prev.firstAt && next.firstAt) add(`sync-first-${next.firstAt}`, 'first')
  if (!prev.secondAt && next.secondAt) add(`sync-second-${next.secondAt}`, 'second')
  if (!prev.wentLiveAt && next.wentLiveAt) add(`sync-live-${next.wentLiveAt}`, 'live')
  if (!prev.paused && next.paused) add(`sync-paused-${next.stage}-${Date.now()}`, 'paused')
  if (prev.paused && !next.paused) add(`sync-resumed-${next.stage}-${Date.now()}`, 'resumed')
  if (out.length === 0 && prev.stage !== next.stage) add(`sync-stage-${next.stage}`, 'stage', next.stage)
  return out
}
