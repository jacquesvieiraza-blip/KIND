// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R141 · R166 · P5a, board #2351) — WHAT A QUALIFIED MEETING IS, AS DATA.
//
// The seven conditions are R141's, in the order and words the website Terms use. Pure: no
// database — the writer is `qualifyMeeting` in meeting-truth.ts, the one module that writes
// `public.meetings`.
// ═══════════════════════════════════════════════════════════════════════════════════════

// ⛓️ 25 Sep (P5b) — each condition also carries `clientLabel`: the website Pricing page's own
// sentence, word for word, which is what a client reads in Milla when naming the condition
// they challenge. `label` stays the operator's wording in Vida.
export const QUALIFIED_MEETING_CONDITIONS = [
  { key: 'icp_fit',               label: 'Within the client-approved ICP and targeting criteria',
    clientLabel: 'The prospect falls within your approved ICP and targeting criteria.' },
  { key: 'role_fit',              label: 'Meets the agreed role, seniority or buying-influence criteria',
    clientLabel: 'The individual meets the agreed role, seniority or buying-influence criteria.' },
  { key: 'agreed_to_meet',        label: 'Has positively agreed to a meeting with the client',
    clientLabel: 'The prospect has positively agreed to a meeting with you.' },
  { key: 'date_time_set',         label: 'Scheduled for an agreed date and time',
    clientLabel: 'The meeting has been scheduled for an agreed date and time.' },
  { key: 'genuine_relevance',     label: 'Has shown genuine relevance to the client’s offer, problem or service area',
    clientLabel: 'The prospect has demonstrated genuine relevance to your stated offer, problem or service area.' },
  { key: 'not_existing_customer', label: 'Not an existing customer, active opportunity or excluded account (where the client made these available)',
    clientLabel: 'The prospect is not an existing customer, active opportunity or excluded account, where that information has been made available to us.' },
  { key: 'acceptance_evidenced',  label: 'M&V can evidence the acceptance (a reply alone is not a qualified meeting)',
    clientLabel: 'We can evidence the prospect’s acceptance of the meeting.' },
] as const

export type ConditionKey = typeof QUALIFIED_MEETING_CONDITIONS[number]['key']
export type Qualification = Record<ConditionKey, boolean>

/** R141: a challenge must be raised within 3 business days of the meeting being booked. */
export const CHALLENGE_BUSINESS_DAYS = 3

/** Every condition answered true — nothing less is a qualified meeting. Pure. */
export function allConditionsMet(q: Partial<Record<string, unknown>> | null | undefined): q is Qualification {
  if (!q) return false
  return QUALIFIED_MEETING_CONDITIONS.every(c => q[c.key] === true)
}

/** Which conditions are not met (for the refusal sentence). Pure. */
export function missingConditions(q: Partial<Record<string, unknown>> | null | undefined): string[] {
  return QUALIFIED_MEETING_CONDITIONS.filter(c => !q || q[c.key] !== true).map(c => c.label)
}

/**
 * `from` + N business days (Mon–Fri), at the same time of day. Weekends are skipped; public
 * holidays are not modelled (stated, not hidden). Pure.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const d = new Date(from.getTime())
  let left = days
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    const wd = d.getUTCDay()
    if (wd !== 0 && wd !== 6) left--
  }
  return d
}

/** A condition key the client may name in a challenge. Pure. */
export function isConditionKey(k: unknown): k is ConditionKey {
  return typeof k === 'string' && QUALIFIED_MEETING_CONDITIONS.some(c => c.key === k)
}

/**
 * ⚑ 25 Sep (P5b) — is the client still inside the challenge window? Always computed from
 * `booked_at` (R141: "within 3 business days of the meeting being booked"), never from a
 * stamped column, so a meeting not yet qualified by us has the same window. Pure.
 */
export function challengeDeadline(bookedAt: string | Date): Date {
  return addBusinessDays(new Date(bookedAt), CHALLENGE_BUSINESS_DAYS)
}
export function challengeWindowOpen(bookedAt: string | Date, now: Date = new Date()): boolean {
  return now.getTime() <= challengeDeadline(bookedAt).getTime()
}
