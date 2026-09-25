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
