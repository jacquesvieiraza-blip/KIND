// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R141 · R166 · P5a, board #2351) — WHAT A QUALIFIED MEETING IS, AS DATA.
//
// The seven conditions are R141's, in the order and words the website Terms use. Pure: no
// database — the writer is `qualifyMeeting` in meeting-truth.ts, the one module that writes
// `public.meetings`.
// ═══════════════════════════════════════════════════════════════════════════════════════

export const QUALIFIED_MEETING_CONDITIONS = [
  { key: 'icp_fit',               label: 'Within the client-approved ICP and targeting criteria' },
  { key: 'role_fit',              label: 'Meets the agreed role, seniority or buying-influence criteria' },
  { key: 'agreed_to_meet',        label: 'Has positively agreed to a meeting with the client' },
  { key: 'date_time_set',         label: 'Scheduled for an agreed date and time' },
  { key: 'genuine_relevance',     label: 'Has shown genuine relevance to the client’s offer, problem or service area' },
  { key: 'not_existing_customer', label: 'Not an existing customer, active opportunity or excluded account (where the client made these available)' },
  { key: 'acceptance_evidenced',  label: 'M&V can evidence the acceptance (a reply alone is not a qualified meeting)' },
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
