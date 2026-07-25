// figsy_campaigns.settings is a JSONB grab-bag, and the send path reads the gates from
// INSIDE it — not from the look-alike top-level columns:
//
//   • CO-PILOT  →  settings.review_required   (lib/figsy.ts: sendSequenceEmail enqueues to
//                  figsy_approval_queue and pauses the enrollment when this is true)
//   • DAILY CAP →  settings.daily_send_limit  (routes/internal.ts: the send cron, and the
//                  #511 auto-tune, both read it from settings)
//
// `figsy_campaigns` DOES have `copilot_mode` and `approve_before_send` columns (migration
// 20260531_copilot_mode.sql), and there is no `daily_send_limit` column at all — so writing
// those columns and calling it done would have produced a Co-Pilot toggle the send engine
// never consults: the UI promises "every email waits for you" and the emails go out anyway.
// This module is the one place that knows where the gates really live, so that can't recur.
//
// Two rules it exists to enforce:
//   1. NEVER replace `settings` — merge into it. It also carries send_days, send_hour_utc,
//      ab_subject_b…e, steps (reply branching), system_prompt, intent signals. A whole-object
//      write would silently drop a client's send window or A/B set.
//   2. Only touch the keys actually being changed, so an edit of the name never disturbs the
//      send gate.

export type CampaignGates = {
  /** true = Co-Pilot: every email stops at the approval queue. false = Auto-Pilot. */
  review_required?: boolean
  /** per-campaign daily cap; null clears it back to the platform default. */
  daily_send_limit?: number | null
}

/** The gates as they currently stand, read out of a campaign row's settings JSONB. */
export function readCampaignGates(settings: unknown): { review_required: boolean; daily_send_limit: number | null } {
  const s = (settings && typeof settings === 'object') ? settings as Record<string, unknown> : {}
  const cap = s.daily_send_limit
  return {
    review_required: s.review_required === true,
    daily_send_limit: typeof cap === 'number' && Number.isFinite(cap) ? cap : null,
  }
}

/**
 * Merge gate changes into an existing settings object. Returns a NEW object — the caller
 * writes it back whole, which is safe precisely because every pre-existing key is carried.
 */
export function mergeCampaignGates(existing: unknown, gates: CampaignGates): Record<string, unknown> {
  const base = (existing && typeof existing === 'object') ? { ...(existing as Record<string, unknown>) } : {}
  if (gates.review_required !== undefined) base.review_required = gates.review_required
  if (gates.daily_send_limit !== undefined) base.daily_send_limit = gates.daily_send_limit
  return base
}

/**
 * Normalise an operator-supplied daily cap. Blank/absent means "no change" (undefined);
 * anything unusable means "clear it" (null) rather than writing a nonsense number the cron
 * would then enforce. Capped at 500 to match the client-side contract in routes/figsy.ts.
 */
export function normaliseDailyCap(raw: unknown): number | null | undefined {
  if (raw === undefined) return undefined
  if (raw === null || raw === '') return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.min(500, Math.round(n))
}
