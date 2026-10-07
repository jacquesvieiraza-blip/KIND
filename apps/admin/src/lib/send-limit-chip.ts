// ⚑ 6 Oct (N2) — WHAT VIDA'S TOP-BAR LIMIT CHIP SAYS.
//
// ⛓️ WAS: the overall warm-up cap only, so with it unset the chip said "⚠ No send cap set" while
// every client was held to FIGSY_PER_CLIENT_DAILY_CAP and every mailbox to its own limit. Now it
// shows the limits that actually hold. Mailbox limits differ per box and live on the Engine page.

export type SendStatus = {
  outreach_enabled: boolean
  /** Overall cold-send cap a day (FIGSY_COLD_DAILY_CAP / warm-up ramp). null = not set. */
  daily_cap: number | null
  /** Per-client cap a day (FIGSY_PER_CLIENT_DAILY_CAP). null = not set; absent = older API. */
  per_client_cap?: number | null
}

export type LimitChip = { label: string; tone: 'unknown' | 'set' | 'warn'; title: string }

const TITLE = 'Daily sending limits. Overall: FIGSY_COLD_DAILY_CAP / warm-up ramp. Per client: FIGSY_PER_CLIENT_DAILY_CAP. Each mailbox also keeps its own limit (Engine page).'

export function sendLimitChip(s: SendStatus | null): LimitChip {
  if (!s) return { label: 'Limit …', tone: 'unknown', title: TITLE }
  const parts: string[] = []
  if (s.daily_cap != null) parts.push(`${s.daily_cap}/day overall`)
  if (s.per_client_cap != null) parts.push(`${s.per_client_cap}/day per client`)
  if (parts.length === 0) {
    return { label: '⚠ No overall or per-client limit set', tone: 'warn', title: `${TITLE} Each mailbox still holds its own limit.` }
  }
  return { label: `Limit ${parts.join(' · ')}`, tone: 'set', title: TITLE }
}
