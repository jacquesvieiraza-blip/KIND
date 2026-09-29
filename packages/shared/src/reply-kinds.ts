// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 29 Sep (R174 · 5h) — WHICH REPLIES NEED A PERSON, AND WHAT TO CALL THE REST.
//
// Vida's Inbox marked an out-of-office and a "not interested" as "needs you", while the
// lifecycle's own count of replies waiting on a decision left out-of-office alone — two rules
// for one question. This is the one list, read by the server's count (the Inbox badge, Needs
// you) and by the Inbox's labels, so the badge and the list cannot disagree.
//
// A reply of one of these kinds needs nobody: the pipeline has already handled it (an opt-out
// or unsubscribe is suppressed; an out-of-office resumes on its own), or the prospect has said
// no. Anything else that is not yet qualified or booked is waiting on a person.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const REPLY_NEEDS_NOBODY = ['opt_out', 'unsubscribe', 'out_of_office', 'not_interested', 'cold'] as const

/**
 * ⚑ 29 Sep (R174 · 6c) — OUR OWN REPLY. When an operator answers a prospect, the email is
 * recorded in the same replies table with this classification. It is not a reply FROM a
 * prospect, so it is never counted as one — not in Milla's totals, not in the replies waiting
 * on a decision. (It was: a client's "Replies" went up when WE wrote back.)
 */
export const OUR_SENT_REPLY = 'sent_reply'
export function isOurOwnReply(classification: string | null | undefined): boolean {
  return classification === OUR_SENT_REPLY
}

const QUIET_LABEL: Record<string, string> = {
  opt_out: 'opted out', unsubscribe: 'opted out', out_of_office: 'out of office',
  not_interested: 'not interested', cold: 'not interested',
}

export function replyNeedsNobody(classification: string | null | undefined): boolean {
  return (REPLY_NEEDS_NOBODY as readonly string[]).includes(String(classification ?? ''))
}

/** The Inbox pill for one reply: done (booked/qualified), quiet (needs nobody) or needs you. */
export function replyInboxState(r: { classification: string | null; qualified_at: string | null; meeting_booked_at: string | null }):
  { label: string; tone: 'done' | 'quiet' | 'needs' } {
  if (r.meeting_booked_at) return { label: 'booked', tone: 'done' }
  if (r.qualified_at) return { label: 'qualified', tone: 'done' }
  if (isOurOwnReply(r.classification)) return { label: 'our reply', tone: 'quiet' }
  if (replyNeedsNobody(r.classification)) return { label: QUIET_LABEL[String(r.classification)] ?? 'no action', tone: 'quiet' }
  return { label: 'needs you', tone: 'needs' }
}

/**
 * ⚑ 29 Sep (R174 · 6a) — A REPLY'S KIND, IN PLAIN WORDS. Client screens printed the internal
 * labels (`hot`, `out_of_office`); this is the one place they become words a client reads.
 */
const REPLY_WORD: Record<string, string> = {
  hot: 'interested', warm: 'interested', interested: 'interested', positive: 'interested',
  cold: 'not interested', not_interested: 'not interested',
  opt_out: 'opted out', unsubscribe: 'opted out',
  out_of_office: 'out of office', wrong_person: 'wrong person', referral: 'referral',
  sent_reply: 'our reply',
}
export function replyWord(classification: string | null | undefined): string {
  return REPLY_WORD[String(classification ?? '')] ?? 'reply'
}
