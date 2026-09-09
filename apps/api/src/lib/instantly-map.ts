// INSTANTLY — THE PURE HALF: who may be pushed, and what the payload looks like.
//
// Prompt 4, and it is Client Zero only: **our own outreach**, from the five already-warm
// AirMail mailboxes, through Instantly's API. Client sending is Smartlead and is NOT built
// here (#577).
//
// Everything in this file is pure, because the two things that matter most — *may this lead
// leave the building?* and *what exactly gets sent?* — must be provable without touching
// Instantly. The network half lives in `instantly.ts`.
//
// THE GATES ARE UPSTREAM AND UNCHANGED. Nothing here relaxes anything: `is_demo` is still a
// hard stop, `AUTO_OUTREACH_ENABLED` still governs whether anything reaches a real prospect,
// and the minimum-20 and money rules are untouched. This file only decides whether a lead
// that has ALREADY passed all of that goes out via Instantly rather than SMTP.

import { applyTokens } from './sequence-apply'
import type { SequenceStep } from './sequence-apply'

/** The house client — us. Only this account may use Instantly. */
export const HOUSE_SENDING_MODE = 'instantly-api' as const

export type PushRefusal =
  | 'no_api_key'
  | 'kill_switch_off'
  | 'is_demo'
  | 'not_house_client'
  | 'no_email'
  // BUILD-003 PR2 — the programme is paused, terminal, unapproved, unpaid for Go Live, or its
  // link could not be resolved. Instantly keeps its own copy of the lead, so this is the last
  // gate that can stop a send once the push has happened.
  | 'programme_not_authorised'
  // BUILD-003 item 6 — this path had NO suppression check at all until 29 Aug. These two
  // are refused by the shared send gate, not by canPushToInstantly, because the gate reads
  // the database and this function is deliberately pure.
  | 'do_not_contact'
  | 'opted_out'

export type PushDecision =
  | { ok: true }
  | { ok: false; reason: PushRefusal; detail: string }

/**
 * May this lead be pushed to Instantly?
 *
 * **Fails closed on every branch.** Each refusal is a separate reason so a refusal can be
 * read rather than guessed — the lesson of `pickSendingInbox`, where a single boolean told
 * the operator nothing about which of four things was wrong.
 *
 * Ordered by how bad it would be to get wrong: the demo stop is checked before the client
 * identity, because a demo reaching a real mailbox is the one failure with a person on the
 * other end of it.
 */
export function canPushToInstantly(a: {
  hasApiKey: boolean
  /** ⚠️ HOLDS *PERMITTED*, NOT *ENGAGED*. `true` = the kill-switch is OFF and delivery may proceed. */
  outreachDeliveryPermitted: boolean
  isDemo: boolean
  isHouseClient: boolean
  leadEmail: string | null | undefined
}): PushDecision {
  // A demo can never reach a real mailbox. This is checked FIRST and independently of
  // everything else, so no future reordering can put it behind a cheaper test.
  if (a.isDemo) {
    return { ok: false, reason: 'is_demo',
      detail: 'This is a demo account. A demo can never reach a real person — every address is .invalid and this is a hard stop, not a setting.' }
  }
  if (!a.outreachDeliveryPermitted) {
    return { ok: false, reason: 'kill_switch_off',
      detail: 'The kill-switch is ON (AUTO_OUTREACH_ENABLED is not "true"), so nothing is pushed to Instantly. This is the safe default and it governs Instantly exactly as it governs SMTP.' }
  }
  if (!a.isHouseClient) {
    return { ok: false, reason: 'not_house_client',
      detail: 'Instantly sends OUR outreach only (Client Zero). Client sending goes through Smartlead — see #577.' }
  }
  if (!a.hasApiKey) {
    return { ok: false, reason: 'no_api_key',
      detail: 'INSTANTLY_API_KEY is not set, so nothing can be pushed. Set it in Railway → @kind/api → Variables.' }
  }
  if (!a.leadEmail || !a.leadEmail.trim()) {
    return { ok: false, reason: 'no_email',
      detail: 'This lead has no email address. Pushing it would create an unsendable row in Instantly and silently inflate the campaign count.' }
  }
  return { ok: true }
}

export function refusalLabel(r: PushRefusal): string {
  switch (r) {
    case 'no_api_key':       return 'Instantly API key not set'
    case 'kill_switch_off':  return 'the kill-switch is ON — nothing is delivered on any channel'
    case 'is_demo':          return 'demo account — can never send'
    case 'not_house_client': return 'not the house client — clients send via Smartlead'
    case 'no_email':         return 'lead has no email address'
    case 'do_not_contact':   return 'on the do-not-contact list — never contacted on any channel'
    case 'opted_out':        return 'this person opted out — suppression is global across K.I.N.D'
    case 'programme_not_authorised': return 'the programme does not authorise outreach (paused, terminal, unapproved, or Go-Live payment outstanding)'
  }
}

// ── THE PAYLOADS ────────────────────────────────────────────────────────────────────────
//
// Instantly's v2 lead and campaign shapes are documented at developer.instantly.ai. The
// mapping is here and pure so the exact bytes we would send are assertable in a test, with
// no key and no network — which matters because a wrong field name here does not throw, it
// silently sends a blank first name to a real prospect.

export type InstantlyLeadPayload = {
  email: string
  first_name: string
  last_name: string
  company_name: string
  personalization: string
  custom_variables: Record<string, string>
}

export type OurLead = {
  first_name?: string | null
  last_name?: string | null
  email?: string | null
  company?: string | null
  job_title?: string | null
  industry?: string | null
  country?: string | null
}

/**
 * Our lead → Instantly's lead.
 *
 * Every field is trimmed and defaulted to an empty string rather than left undefined:
 * Instantly renders `{{firstName}}` from whatever it holds, so an undefined first name
 * becomes a visible blank in an email to a real person.
 */
export function toInstantlyLead(lead: OurLead): InstantlyLeadPayload {
  const s = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  return {
    email: s(lead.email).toLowerCase(),
    first_name: s(lead.first_name),
    last_name: s(lead.last_name),
    company_name: s(lead.company),
    // Instantly's own personalisation slot. We fill it from what WE know, so the copy can
    // reference it without us handing them our scoring rationale.
    personalization: s(lead.job_title),
    custom_variables: {
      job_title: s(lead.job_title),
      industry: s(lead.industry),
      country: s(lead.country),
    },
  }
}

export type InstantlySequenceStep = { subject: string; body: string; day: number }

/**
 * Our sequence → Instantly's steps, with OUR copy already rendered.
 *
 * **We resolve the tokens, not Instantly.** Our `{{first_name}}` and their `{{firstName}}`
 * are different dialects, and handing them un-rendered copy would either send the literal
 * braces to a prospect or silently drop the value. Rendering here means what the test asserts
 * is exactly what the prospect receives.
 *
 * `day` is cumulative because Instantly schedules from campaign start, while our `wait_days`
 * is the gap since the previous step. Adding them as-is would fire every follow-up early.
 */
export function toInstantlySequence(steps: SequenceStep[], lead: OurLead, senderCompany?: string | null): InstantlySequenceStep[] {
  const emails = (steps ?? []).filter(s => !s.channel || s.channel === 'email')
  const out: InstantlySequenceStep[] = []
  let day = 0
  for (const s of emails) {
    day += Math.max(0, Math.floor(s.wait_days ?? 0))
    out.push({
      subject: applyTokens(s.subject ?? '', lead as never, senderCompany),
      body: applyTokens(s.body ?? '', lead as never, senderCompany),
      day,
    })
  }
  return out
}

// ── REPLIES ─────────────────────────────────────────────────────────────────────────────

export type InstantlyReplyRaw = Record<string, unknown>

/**
 * An Instantly reply → the provider-agnostic `InboundReply` shape from Prompt 2 (#589).
 *
 * It deliberately produces the SAME shape Resend produces, so the reply then flows through
 * `reply-ingest.ts` — the multi-client match, the empty-body alert, the checked opt-out
 * writes. Building a second reply path for Instantly is precisely what #589 existed to
 * prevent.
 *
 * Returns null when the payload carries no usable sender, because a reply we cannot attribute
 * must be ESCALATED by the caller rather than quietly stored against nobody.
 */
export function fromInstantlyReply(raw: InstantlyReplyRaw): {
  fromEmail: string; fromName: string | null; subject: string | null
  body: string; providerMessageId: string | null; provider: 'instantly'
} | null {
  const pick = (...keys: string[]): string => {
    for (const k of keys) {
      const v = raw[k]
      if (typeof v === 'string' && v.trim()) return v.trim()
    }
    return ''
  }
  const email = pick('lead_email', 'from_email', 'email', 'from').toLowerCase()
  if (!email) return null
  const html = pick('reply_html', 'html', 'body_html')
  return {
    fromEmail: email,
    fromName: pick('lead_name', 'first_name', 'from_name') || null,
    subject: pick('reply_subject', 'subject') || null,
    body: pick('reply_text', 'text', 'body_text', 'body') || html.replace(/<[^>]+>/g, ' ').trim(),
    providerMessageId: pick('id', 'message_id', 'reply_id') || null,
    provider: 'instantly',
  }
}
