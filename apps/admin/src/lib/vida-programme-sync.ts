// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R161) — VIDA HEARS WHAT THE CLIENT DID IN MILLA, WITHOUT A REFRESH.
//
// The founder: *"this should be bi directional sync. milla does something vida needs it needs to
// up me in vida and vica versa."* Vida re-reads the selected client's programme every
// VIDA_SYNC_MS and on return to the tab; this decides whether it moved and what Vida says.
// Only a change the operator did NOT make is ever compared here — their own actions already
// re-read the programme before the next check. Pure, so it is tested directly.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const VIDA_SYNC_MS = 20_000

export type VidaSyncFacts = {
  status: string
  approved_at: string | null
  first_at: string | null
  second_at: string | null
  went_live_at: string | null
  paused_at: string | null
}

/**
 * What the page hands over. ⚠️ ALREADY RESOLVED BY THE PAGE: whether P1/P2 are in place (paid or
 * internally authorised) is read in `vida/page.tsx`, which is on the internal-authority
 * allowlist (`programme-authority-schema.test.ts`). This module never names those columns.
 */
export type VidaSyncSource = {
  status: string; approved_at: string | null; paused_at: string | null
  went_live_at?: string | null; first_at?: string | null; second_at?: string | null
}

export function vidaFacts(p: VidaSyncSource | null | undefined): VidaSyncFacts | null {
  if (!p) return null
  return {
    status: p.status,
    approved_at: p.approved_at ?? null,
    first_at: p.first_at ?? null,
    second_at: p.second_at ?? null,
    went_live_at: p.went_live_at ?? null,
    paused_at: p.paused_at ?? null,
  }
}

export function sameVidaFacts(a: VidaSyncFacts, b: VidaSyncFacts): boolean {
  return a.status === b.status && a.approved_at === b.approved_at && a.first_at === b.first_at
    && a.second_at === b.second_at && a.went_live_at === b.went_live_at && a.paused_at === b.paused_at
}

/** What Vida says in its chat about a change that came from elsewhere. */
export function vidaChangeLines(prev: VidaSyncFacts, next: VidaSyncFacts, name: string): string[] {
  const who = name.trim() || 'The client'
  const out: string[] = []
  if (!prev.approved_at && next.approved_at) {
    out.push(`${who} approved their programme in Milla.${next.second_at ? '' : ' Next: the second half (P2).'}`)
  }
  if (!prev.second_at && next.second_at) out.push(`${who}'s second half (P2) is now in place.`)
  if (!prev.first_at && next.first_at) out.push(`${who}'s first half (P1) is now in place.`)
  if (!prev.went_live_at && next.went_live_at) out.push(`${who}'s programme is now live.`)
  if (!prev.paused_at && next.paused_at) out.push(`${who}'s programme was paused.`)
  if (prev.paused_at && !next.paused_at) out.push(`${who}'s programme was resumed.`)
  if (out.length === 0 && prev.status !== next.status) out.push(`${who}'s programme moved from ${prev.status} to ${next.status}.`)
  return out
}
