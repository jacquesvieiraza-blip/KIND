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
  /** which weekdays may send, canonical lowercase 'mon'…'sun'; null/[] = any day. */
  send_days?: string[] | null
  /** earliest UTC hour to send (0–23); null = any hour. */
  send_hour_utc?: number | null
  /** A/B subject variants B–E; null clears one. */
  ab_subject_b?: string | null
  ab_subject_c?: string | null
  ab_subject_d?: string | null
  ab_subject_e?: string | null
}

export const SEND_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const
export type SendDay = typeof SEND_DAYS[number]

/**
 * Normalise a weekday however it was written. `send_days` is only typed `string[]` at the
 * API edge, and the retired self-serve console wrote whatever its checkboxes held — so a
 * legacy 'Monday' or '1' must still be understood rather than treated as "not today",
 * which would silently stop a client's outreach.
 */
export function normaliseSendDay(raw: unknown): SendDay | null {
  const s = String(raw ?? '').trim().toLowerCase()
  if (!s) return null
  const byPrefix = SEND_DAYS.find(d => s.startsWith(d))
  if (byPrefix) return byPrefix
  // 0=Sunday, matching JS getUTCDay(); also accept 1–7 with 7 as Sunday.
  const n = Number(s)
  if (Number.isInteger(n) && n >= 0 && n <= 7) return SEND_DAYS[(n + 6) % 7]
  return null
}

/** The gates as they currently stand, read out of a campaign row's settings JSONB. */
export function readCampaignGates(settings: unknown): {
  review_required: boolean
  daily_send_limit: number | null
  send_days: SendDay[]
  send_hour_utc: number | null
  ab_subject_b: string | null
  ab_subject_c: string | null
  ab_subject_d: string | null
  ab_subject_e: string | null
} {
  const s = (settings && typeof settings === 'object') ? settings as Record<string, unknown> : {}
  const cap = s.daily_send_limit
  const hour = s.send_hour_utc
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim()) ? v : null
  const days = Array.isArray(s.send_days)
    ? Array.from(new Set(s.send_days.map(normaliseSendDay).filter((d): d is SendDay => d !== null)))
    : []
  return {
    review_required: s.review_required === true,
    daily_send_limit: typeof cap === 'number' && Number.isFinite(cap) ? cap : null,
    // Sorted into week order so the UI reads Mon→Sun regardless of how it was stored.
    send_days: SEND_DAYS.filter(d => days.includes(d)),
    send_hour_utc: (typeof hour === 'number' && Number.isInteger(hour) && hour >= 0 && hour <= 23) ? hour : null,
    ab_subject_b: str(s.ab_subject_b), ab_subject_c: str(s.ab_subject_c),
    ab_subject_d: str(s.ab_subject_d), ab_subject_e: str(s.ab_subject_e),
  }
}

/**
 * Is this campaign allowed to send RIGHT NOW?
 *
 * `send_days` / `send_hour_utc` were write-only until this existed: the old console wrote
 * them and nothing on the send path ever read them, so a "Mon–Thu, 07:00" window was
 * decorative. This is the reader.
 *
 * FAILS OPEN on purpose. No window configured, or a window we cannot parse, means SEND —
 * because the real safety gates are the kill-switch, the caps and the approval queue, and a
 * garbled preference field must never silently halt a client's outreach. A window we DO
 * understand is honoured exactly.
 */
export function withinSendWindow(settings: unknown, now: Date): boolean {
  const { send_days, send_hour_utc } = readCampaignGates(settings)
  if (send_days.length > 0 && !send_days.includes(SEND_DAYS[(now.getUTCDay() + 6) % 7])) return false
  if (send_hour_utc !== null && now.getUTCHours() < send_hour_utc) return false
  return true
}

/**
 * Merge gate changes into an existing settings object. Returns a NEW object — the caller
 * writes it back whole, which is safe precisely because every pre-existing key is carried.
 */
export function mergeCampaignGates(existing: unknown, gates: CampaignGates): Record<string, unknown> {
  const base = (existing && typeof existing === 'object') ? { ...(existing as Record<string, unknown>) } : {}
  if (gates.review_required !== undefined) base.review_required = gates.review_required
  if (gates.daily_send_limit !== undefined) base.daily_send_limit = gates.daily_send_limit
  if (gates.send_days !== undefined) {
    // Store canonical days only. An all-days selection is stored as [] ("no restriction")
    // rather than seven entries, so the window check stays a cheap no-op.
    const clean = (gates.send_days ?? []).map(normaliseSendDay).filter((d): d is SendDay => d !== null)
    const uniq = SEND_DAYS.filter(d => clean.includes(d))
    base.send_days = uniq.length === SEND_DAYS.length ? [] : uniq
  }
  if (gates.send_hour_utc !== undefined) {
    const h = gates.send_hour_utc
    base.send_hour_utc = (typeof h === 'number' && Number.isInteger(h) && h >= 0 && h <= 23) ? h : null
  }
  for (const k of ['ab_subject_b', 'ab_subject_c', 'ab_subject_d', 'ab_subject_e'] as const) {
    if (gates[k] !== undefined) {
      const v = gates[k]
      base[k] = (typeof v === 'string' && v.trim()) ? v.trim().slice(0, 200) : null
    }
  }
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
