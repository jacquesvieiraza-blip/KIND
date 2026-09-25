// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ⑥ · P1, board #2347) — A MAILBOX'S DAILY LIMIT HOLDS FOR THE WHOLE DAY.
//
// The founder: *"i am very seriouos about how many leads we also try and attempt. the barriers
// need to be there."*
//
// 🛑 WHAT WAS WRONG. `client_inboxes.daily_cap` was counted IN MEMORY, per send run, starting
// from zero every time — `figsy_sent_emails` had no column naming the mailbox that sent. The
// send cron runs every two hours, so a box capped at 30 a day could send ~30 PER RUN. And a
// blank cap meant no cap at all.
//
// Now every send records its mailbox (`figsy_sent_emails.inbox_id`), and the limit is read
// back from what the box has ACTUALLY sent since midnight (UTC, as every other daily cap here).
//
// ⚠️ UNREADABLE MEANS STOP. If today's count cannot be read, nothing is sent from that box: a
// limit that gives way whenever the database hiccups is not a limit.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

/** A mailbox with no limit set gets this one (the Vida form's own default). Never "unlimited". */
export const DEFAULT_MAILBOX_DAILY_CAP = 30

/** The limit a box is actually held to. Blank → the default; an explicit number (even 0) stands. */
export function mailboxDailyCap(cap: number | null | undefined): number {
  return typeof cap === 'number' && Number.isFinite(cap) && cap >= 0 ? Math.floor(cap) : DEFAULT_MAILBOX_DAILY_CAP
}

export function startOfUtcDay(now: Date = new Date()): string {
  const d = new Date(now)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

/**
 * How many emails each mailbox has sent today. `null` = could not be read, and the caller
 * must then send nothing from these boxes.
 */
export async function mailboxSentToday(inboxIds: string[]): Promise<Map<string, number> | null> {
  const counts = new Map<string, number>(inboxIds.map(id => [id, 0]))
  if (inboxIds.length === 0) return counts
  let data: unknown[] | null = null
  let error: { message: string } | null = null
  try {
    const r = await db.from('figsy_sent_emails')
      .select('inbox_id').in('inbox_id', inboxIds).gte('sent_at', startOfUtcDay()).limit(20000)
    data = (r.data ?? null) as unknown[] | null
    error = r.error ? { message: r.error.message } : null
  } catch (e) {
    error = { message: e instanceof Error ? e.message : String(e) }
  }
  if (error) {
    console.error('[mailbox-cap] today\'s per-mailbox send count could not be read — holding these mailboxes:', error.message)
    return null
  }
  for (const r of (data ?? []) as { inbox_id: string | null }[]) {
    if (r.inbox_id && counts.has(r.inbox_id)) counts.set(r.inbox_id, (counts.get(r.inbox_id) ?? 0) + 1)
  }
  return counts
}

type Slot = { id: string; dailyCap: number | null; sentThisBatch: number }

/**
 * Start a run's rotation from what each box has already sent today, with every box held to a
 * real limit. `null` = unreadable → the caller sends nothing from these boxes this run.
 */
export async function seedRotationFromToday<T extends Slot>(slots: T[]): Promise<T[] | null> {
  const sent = await mailboxSentToday(slots.map(s => s.id))
  if (!sent) return null
  return slots.map(s => ({ ...s, dailyCap: mailboxDailyCap(s.dailyCap), sentThisBatch: sent.get(s.id) ?? 0 }))
}

/**
 * The last check before an email leaves a mailbox, on EVERY send path — including the ones
 * that never go through a rotation. `'unreadable'` must be treated exactly like `'at_cap'`.
 */
export async function mailboxCapState(inbox: { id?: string | null; daily_cap?: number | null }): Promise<'room' | 'at_cap' | 'unreadable'> {
  if (!inbox.id) return 'unreadable'
  const sent = await mailboxSentToday([String(inbox.id)])
  if (!sent) return 'unreadable'
  return (sent.get(String(inbox.id)) ?? 0) >= mailboxDailyCap(inbox.daily_cap) ? 'at_cap' : 'room'
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R166 ⑥ · P4) — A MAILBOX WHOSE BOUNCES REACH 3% STOPS SENDING.
//
// The founder: *"3%"*. Measured over the last 7 days, on the addresses THIS mailbox sent to
// (P1's `inbox_id`), against the blocklist's hard bounces and spam complaints. Only judged once
// the box has sent at least 20 in the window — one bounce in five sends is noise, not a signal.
// While the rate is at or above 3% every send from the box is held and the founder is told; as
// the window moves on (or a person acts) it recovers. Unreadable → held.
// ═══════════════════════════════════════════════════════════════════════════════════════
export const MAILBOX_BOUNCE_LIMIT = 0.03
export const MAILBOX_BOUNCE_MIN_SENDS = 20
export const MAILBOX_BOUNCE_WINDOW_DAYS = 7

/** Pure: may a box with this record keep sending? */
export function bounceVerdict(sent: number, bounced: number): 'ok' | 'too_many_bounces' {
  if (sent < MAILBOX_BOUNCE_MIN_SENDS) return 'ok'
  return bounced / sent >= MAILBOX_BOUNCE_LIMIT ? 'too_many_bounces' : 'ok'
}

export async function mailboxBounceState(inboxId: string | null | undefined): Promise<{ state: 'ok' | 'too_many_bounces' | 'unreadable'; sent: number; bounced: number }> {
  if (!inboxId) return { state: 'unreadable', sent: 0, bounced: 0 }
  try {
    const since = new Date(Date.now() - MAILBOX_BOUNCE_WINDOW_DAYS * 86_400_000).toISOString()
    const { data: sends, error: sErr } = await db.from('figsy_sent_emails')
      .select('lead_id').eq('inbox_id', String(inboxId)).gte('sent_at', since).limit(20000)
    if (sErr) return { state: 'unreadable', sent: 0, bounced: 0 }
    const leadIds = [...new Set(((sends ?? []) as { lead_id: string | null }[]).map(r => r.lead_id).filter((x): x is string => !!x))]
    const sent = (sends ?? []).length
    if (sent < MAILBOX_BOUNCE_MIN_SENDS || leadIds.length === 0) return { state: 'ok', sent, bounced: 0 }
    const { data: leads, error: lErr } = await db.from('leads').select('email').in('id', leadIds)
    if (lErr) return { state: 'unreadable', sent, bounced: 0 }
    // HC-1 — every blocklist probe goes through the one normaliser, so case can never hide a bounce.
    const { normalizeRevealEmails } = await import('./billing-rules')
    const rawEmails = ((leads ?? []) as { email: string | null }[]).map(l => l.email)
    if (normalizeRevealEmails(rawEmails).length === 0) return { state: 'ok', sent, bounced: 0 }
    const { data: bad, error: bErr } = await db.from('opt_out_blocklist')
      .select('email').in('email', normalizeRevealEmails(rawEmails)).in('reason', ['hard_bounce', 'spam_complaint'])
    if (bErr) return { state: 'unreadable', sent, bounced: 0 }
    const bounced = (bad ?? []).length
    return { state: bounceVerdict(sent, bounced), sent, bounced }
  } catch {
    return { state: 'unreadable', sent: 0, bounced: 0 }
  }
}
