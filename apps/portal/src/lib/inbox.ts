// ⚑ 25 Sep (R165) — THE INBOX'S RULES, PURE: one conversation per person, and what each
// status is called and what happens next. Kept out of the component so they are tested
// without a browser (inbox.test.ts). The screen is `components/milla/MillaInbox.tsx`.
export type ReplyRow = {
  id: string
  from_email: string
  from_name: string | null
  subject: string | null
  body_text: string | null
  body: string | null
  classification: string
  received_at: string | null
  processed_at: string | null
  lead_id?: string | null
  meeting_booked_at?: string | null
  leads?: { first_name: string | null; last_name: string | null; job_title: string | null; company: string | null } | null
}
export type SentRow = { lead_id: string; step: number | null; subject: string | null; body: string | null; sent_at: string | null }

export type InboxStatus = 'interested' | 'booked' | 'not_interested' | 'away' | 'stop' | 'wrong_person' | 'referral' | 'other'
export type InboxFilter = 'all' | 'interested' | 'booked' | 'else'

export type Message = { kind: 'ours' | 'theirs' | 'our_reply'; label: string; subject: string | null; text: string; at: string | null }
export type Conversation = {
  key: string; name: string; role: string | null; company: string | null
  status: InboxStatus; lastAt: string | null; snippet: string; messages: Message[]
}

export const STATUS: Record<InboxStatus, { label: string; tone: string }> = {
  interested:     { label: 'Interested',                  tone: 'bg-[#f1eafe] text-[#6d28d9]' },
  booked:         { label: 'Meeting booked',              tone: 'bg-[#e7f6ed] text-[#166534]' },
  not_interested: { label: 'Not interested',              tone: 'bg-[#eef0f3] text-[#4b5563]' },
  away:           { label: 'Out of office',               tone: 'bg-[#eef0f3] text-[#4b5563]' },
  stop:           { label: 'Asked not to be contacted',   tone: 'bg-[#fdecea] text-[#9f1f18]' },
  wrong_person:   { label: 'Wrong person',                tone: 'bg-[#eef0f3] text-[#4b5563]' },
  referral:       { label: 'Pointed us to someone else',  tone: 'bg-[#eef0f3] text-[#4b5563]' },
  other:          { label: 'Replied',                     tone: 'bg-[#eef0f3] text-[#4b5563]' },
}

// ⚠️ EVERY SENTENCE IS WHAT THE PRODUCT DOES. Opt-out is the blocklist + enrolment stop in
// `suppressOptOut`; everything else is R150's "replies stay with us".
export const NEXT: Record<InboxStatus, { title: string; text: string; meetings?: boolean }> = {
  interested:     { title: 'We’re replying for you', text: 'We answer them to agree a time. When a meeting is booked it shows here and in', meetings: true },
  booked:         { title: 'Meeting booked', text: 'The time and details are in', meetings: true },
  not_interested: { title: 'Nothing for you to do', text: 'They’ve said no for now. We handle this reply.' },
  away:           { title: 'Nothing for you to do', text: 'They’re away. We handle this reply.' },
  stop:           { title: 'They won’t be emailed again', text: 'They asked not to be contacted, so we’ve removed them from all outreach.' },
  wrong_person:   { title: 'Nothing for you to do', text: 'They say they’re not the right person. We handle this reply.' },
  referral:       { title: 'Nothing for you to do', text: 'They pointed us to someone else. We handle this reply.' },
  other:          { title: 'Nothing for you to do', text: 'We handle this reply.' },
}

export function statusOf(classification: string): InboxStatus {
  switch (classification) {
    case 'hot': case 'warm': case 'interested': return 'interested'
    case 'cold': case 'not_interested': return 'not_interested'
    case 'out_of_office': return 'away'
    case 'opt_out': case 'unsubscribe': return 'stop'
    case 'wrong_person': return 'wrong_person'
    case 'referral': return 'referral'
    default: return 'other'
  }
}

export function inFilter(c: Conversation, f: InboxFilter): boolean {
  if (f === 'all') return true
  if (f === 'interested') return c.status === 'interested'
  if (f === 'booked') return c.status === 'booked'
  return c.status !== 'interested' && c.status !== 'booked'
}

const when = (r: { received_at?: string | null; processed_at?: string | null }) => r.received_at ?? r.processed_at ?? null
const ms = (s: string | null) => (s ? new Date(s).getTime() : 0)
const textOf = (r: { body_text?: string | null; body?: string | null }) => (r.body_text ?? r.body ?? '').trim()

/**
 * One conversation per person: our emails, their replies and our answers, oldest first.
 * Pure, so the grouping and the status rules are tested without a browser.
 */
export function buildConversations(rows: ReplyRow[], sent: SentRow[] | null | undefined): Conversation[] {
  const byKey = new Map<string, ReplyRow[]>()
  for (const r of rows) {
    const key = r.lead_id ?? `email:${r.from_email.toLowerCase()}`
    byKey.set(key, [...(byKey.get(key) ?? []), r])
  }
  const out: Conversation[] = []
  for (const [key, group] of byKey) {
    const inbound = group.filter(r => r.classification !== 'sent_reply')
      .sort((a, b) => ms(when(a)) - ms(when(b)))
    // Our answer with no reply from them is not a conversation the client has — skip it.
    if (inbound.length === 0) continue
    const latest = inbound[inbound.length - 1]
    const lead = group.find(r => r.leads)?.leads ?? null
    const name = [lead?.first_name, lead?.last_name].filter(Boolean).join(' ').trim()
      || latest.from_name?.trim() || latest.from_email
    const booked = group.some(r => !!r.meeting_booked_at)

    const messages: Message[] = []
    for (const s of (sent ?? []).filter(s => key === s.lead_id)) {
      messages.push({ kind: 'ours', label: s.step ? `Your email · step ${s.step}` : 'Your email', subject: s.subject, text: (s.body ?? '').trim(), at: s.sent_at })
    }
    for (const r of group) {
      messages.push(r.classification === 'sent_reply'
        ? { kind: 'our_reply', label: 'Our reply', subject: null, text: textOf(r), at: when(r) }
        : { kind: 'theirs', label: r.from_name?.trim() || name, subject: r.subject, text: textOf(r), at: when(r) })
    }
    messages.sort((a, b) => ms(a.at) - ms(b.at))

    out.push({
      key, name,
      role: lead?.job_title ?? null,
      company: lead?.company ?? null,
      status: booked ? 'booked' : statusOf(latest.classification),
      lastAt: when(latest),
      snippet: textOf(latest).replace(/\s+/g, ' ').slice(0, 160),
      messages,
    })
  }
  return out.sort((a, b) => ms(b.lastAt) - ms(a.lastAt))
}
