// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 30 Sep (#2473) — A PROSPECT'S STATE, KEPT AND READ, SO EACH IS EMAILED IN THEIR OWN ZONE.
//
// 🛑 WHAT HAPPENED. House's first sends were deferred all morning: all 234 prospects are in the
// United States and none had a state on file, so `maySendNow` had to find the 08:30–17:00
// window open in EVERY US zone at once — Honolulu to New York — which is only 18:30–21:00 UTC.
// Apollo's reveal already returns the person's state; nothing kept it.
//
// ── TWO RULES THIS FILE KEEPS ──────────────────────────────────────────────────────────────
// ① IT NEVER BREAKS THE PATH IT SITS ON. The `leads.state` column arrives with migration
//   `20260930_lead_state`. Until that is applied the write fails and the read fails — both are
//   swallowed here, so the reveal still stores what it paid for and the send still happens,
//   judged exactly as before (the whole-country window). A missing state is today's behaviour,
//   never a new refusal.
// ② A STATE IS ONLY USED FOR A US PROSPECT. The region table in `send-schedule.ts` is US states,
//   and a region like "WA" also means Western Australia. So the state is handed to the window
//   check only when the prospect's country is the United States.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'

const US_SPELLINGS = new Set(['united states', 'united states of america', 'usa', 'us'])

/** Is this one of the spellings we treat as the United States? */
export function isUsCountry(country: string | null | undefined): boolean {
  return typeof country === 'string' && US_SPELLINGS.has(country.trim().toLowerCase())
}

/**
 * The region to hand the send window: the stored state for a US prospect, otherwise null.
 * Pure, so the rule is testable without a database.
 */
export function windowRegionFor(country: string | null | undefined, state: string | null | undefined): string | null {
  if (!isUsCountry(country)) return null
  const s = typeof state === 'string' ? state.trim() : ''
  return s ? s : null
}

/** Store a revealed state on a lead. Best-effort: never throws, never blocks the caller. */
export async function saveLeadState(leadId: string, state: string | null | undefined): Promise<void> {
  const s = typeof state === 'string' ? state.trim() : ''
  if (!leadId || !s) return
  try {
    const { error } = await db.from('leads').update({ state: s }).eq('id', leadId)
    if (error) console.warn(`[lead-state] state not stored for lead ${leadId} (${error.message}) — is migration 20260930_lead_state applied? The lead keeps the whole-country send window.`)
  } catch (err) {
    console.warn(`[lead-state] state not stored for lead ${leadId}:`, err instanceof Error ? err.message : err)
  }
}

/** Read a lead's state for the send window. Best-effort: any failure reads as "no state". */
export async function readLeadState(leadId: string | null | undefined): Promise<string | null> {
  if (!leadId) return null
  try {
    const { data, error } = await db.from('leads').select('state').eq('id', leadId).maybeSingle()
    if (error || !data) return null
    const s = (data as { state?: string | null }).state
    return typeof s === 'string' && s.trim() ? s.trim() : null
  } catch {
    return null
  }
}
