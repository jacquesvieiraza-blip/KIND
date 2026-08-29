// ═══════════════════════════════════════════════════════════════════════════
// MILLA'S MORNING BRIEF — THE DELIVERY HALF (P33 v3)
//
// ⚠️ SPLIT FROM `morning-brief.ts` ON PURPOSE, AND THE REASON IS THE RED PROOF.
// The moment this file's `@kind/db` import lived alongside the pure functions,
// the whole test file died at load with "Missing SUPABASE_URL" — the rules about
// London days, quiet states and banned numbers became unprovable without a
// database. Same lesson as `ab-winner.ts` (P27): the logic worth guarding is the
// logic that must run without one. `morning-brief.ts` stays importable by any
// test; everything that touches Postgres lives here.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
// BUILD-003 item 2 — public.meetings is the sole source of meeting counts.
import { meetingCounts } from './meeting-truth'
import {
  BRIEF_KIND, briefTag, composeBrief, londonDay, londonWeekStart,
} from './morning-brief'
export type EnsureBriefResult =
  | { status: 'created';   day: string; text: string }
  | { status: 'exists';    day: string }
  | { status: 'skipped';   reason: 'opted_out' | 'nothing_new' }
  | { status: 'failed';    reason: string }

/**
 * Make sure this client has today's brief in their Milla thread. Idempotent.
 *
 * ⚠️ NEVER THROWS. This is called on the client's way INTO /milla. A brief is a
 * nicety; their leads are not. If anything here fails — a query, the insert, the
 * session lookup — the page must still load, so every failure returns a value
 * and the caller ignores it. The one thing that must not happen is a client
 * seeing an error page because a greeting could not be composed.
 *
 * ⚠️ THE RACE IS SETTLED BY THE DATABASE, NOT BY THE CHECK BELOW.
 * The `exists` probe is an optimisation — it saves two counts on the ~99% of
 * loads that happen after the day's first. It is NOT the guarantee. Two tabs
 * opening at the same instant both pass it, both insert, and the partial unique
 * index (migration 20260822) fails the loser with 23505 — which is read here as
 * SUCCESS, because it means the winner's brief is already in the thread.
 */
export async function ensureTodaysBrief(clientId: string, now: Date = new Date()): Promise<EnsureBriefResult> {
  const day = londonDay(now)
  try {
    // The client's own opt-out, already honoured by the email brief (#27/R2).
    // A client who turned briefs off must not get them in-app through a side door.
    const { data: client } = await db.from('clients')
      .select('daily_brief_enabled').eq('id', clientId).maybeSingle()
    if (client && (client as { daily_brief_enabled?: boolean | null }).daily_brief_enabled === false) {
      return { status: 'skipped', reason: 'opted_out' }
    }

    // Cheap probe — see the note above about what this does and does not promise.
    const { data: already } = await db.from('milla_messages')
      .select('id').eq('client_id', clientId)
      .eq('sources->>kind', BRIEF_KIND).eq('sources->>day', day)
      .limit(1).maybeSingle()
    if (already) return { status: 'exists', day }

    // The two numbers. Both tenant-scoped on client_id — the isolation is in the
    // query itself, never in a filter applied afterwards.
    const weekStart = londonWeekStart(now).toISOString()

    // MEETING_BOOKED only: confirmed bookings starting inside the London week.
    // Not pending, not cancelled, and nothing downstream of the booking.
    //
    // ⚠️ THE LEAD COUNT USED TO BE QUERIED HERE AND IS GONE ON PURPOSE. /milla's
    // own greeting already reports it, from a query that mirrors this one's
    // sibling exactly — so printing it again put the same number in two
    // consecutive messages. Founder's call: the greeting keeps it.
    // ⛓️ THIS COUNTED `calendar_bookings` (BUILD-003 item 2). That table is an operational
    // record of what we asked Google to create — it has no notion of a duplicate, a spam
    // booking or a reschedule, so a client whose meeting moved twice was told they had three.
    // public.meetings is the sole count truth, and it knows all three.
    const counts = await meetingCounts({ clientId, since: weekStart })

    // #136a — a number we could not measure must not render as zero. A failed
    // count is not "no meetings"; treating it as one would report a quiet week
    // to a client who had three. No brief beats a false brief.
    // #136a — a number we could not measure must not render as zero. A failed count is not
    // "no meetings"; treating it as one would report a quiet week to a client who had three.
    // No brief beats a false brief — which is exactly why meetingCounts returns null rather
    // than an empty result on failure.
    if (counts === null) return { status: 'failed', reason: 'meetings count unreadable' }

    const text = composeBrief({ meetingsThisWeek: counts.booked })
    // Nothing worth saying today. The greeting already stands on its own, so
    // silence here is the product working, not a failure — and stamping no row
    // means tomorrow gets a fresh chance to have news.
    if (text === null) return { status: 'skipped', reason: 'nothing_new' }

    // Which thread? The newest session — the one /milla opens (GET /milla/sessions
    // orders created_at DESC and the page takes [0]). If they have none yet, make
    // one: the founder ruled the brief goes out on day one ("yes send on day 1"),
    // and a brand-new client has no session until they type something.
    const { data: sessions } = await db.from('milla_sessions')
      .select('id').eq('client_id', clientId)
      .order('created_at', { ascending: false }).limit(1)
    let sessionId = sessions?.[0]?.id as string | undefined
    if (!sessionId) {
      const { data: made, error: makeErr } = await db.from('milla_sessions')
        .insert({ client_id: clientId, title: null }).select('id').single()
      if (makeErr || !made) return { status: 'failed', reason: `session: ${makeErr?.message ?? 'not created'}` }
      sessionId = made.id as string
    }

    const { error: insErr } = await db.from('milla_messages').insert({
      session_id: sessionId,
      client_id:  clientId,
      role:       'assistant',
      content:    text,
      sources:    briefTag(day),
    })
    if (insErr) {
      // 23505 = the unique index did its job. Another request created today's
      // brief microseconds ago. That is the guarantee working, not a failure.
      if ((insErr as { code?: string }).code === '23505') return { status: 'exists', day }
      return { status: 'failed', reason: `insert: ${insErr.message}` }
    }

    return { status: 'created', day, text }
  } catch (err) {
    return { status: 'failed', reason: err instanceof Error ? err.message : 'unknown' }
  }
}
