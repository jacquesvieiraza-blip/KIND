// SMARTLEAD — THE PURE HALF: who may be pushed, and what the payload looks like.
//
// Prompt 7, and it is the EXACT MIRROR of Instantly (Prompt 4). Founder-locked 26 Jul:
// **Instantly is OURS, Smartlead is the CLIENTS'** (#577). So every gate here is the inverse
// of `instantly-map.ts`: that file refuses anything that is `not_house_client`, and this one
// refuses anything that IS the house client. Between them, exactly one route can ever accept
// a given lead, and neither can silently take the other's traffic.
//
// Everything here is pure, for the same reason as its twin — *may this lead leave the
// building?* and *what exactly gets sent?* have to be provable without a network, because a
// wrong field name does not throw. It sends a blank first name to a real prospect.
//
// THE GATES ARE UPSTREAM AND UNCHANGED. `is_demo` is still a hard stop, `AUTO_OUTREACH_ENABLED`
// still governs whether anything reaches a real person, and the minimum-20 and money rules are
// untouched. This file only decides whether a lead that has ALREADY passed all of that leaves
// via Smartlead rather than SMTP.

import { applyTokens } from './sequence-apply'
import type { SequenceStep } from './sequence-apply'

/** The per-client sending mode this integration owns. Recorded on `client_inboxes.provider`. */
export const SMARTLEAD_SENDING_MODE = 'smartlead-api' as const

export type SmartleadRefusal =
  | 'no_api_key'
  | 'kill_switch_off'
  | 'is_demo'
  | 'is_house_client'
  | 'no_smartlead_inbox'
  | 'no_email'

export type SmartleadDecision =
  | { ok: true }
  | { ok: false; reason: SmartleadRefusal; detail: string }

/**
 * May this lead be pushed to Smartlead?
 *
 * **Fails closed on every branch**, each with its own reason, so a refusal can be read rather
 * than guessed.
 *
 * Ordered by how bad it would be to get wrong. The demo stop is first and independent of
 * everything else, because a demo reaching a real mailbox is the one failure with a person on
 * the other end of it — and no future reordering can put it behind a cheaper test.
 */
export function canPushToSmartlead(a: {
  hasApiKey: boolean
  killSwitchOn: boolean
  isDemo: boolean
  isHouseClient: boolean
  /** The client has a `client_inboxes` row with provider `smartlead-api`. */
  hasSmartleadInbox: boolean
  leadEmail: string | null | undefined
}): SmartleadDecision {
  if (a.isDemo) {
    return { ok: false, reason: 'is_demo',
      detail: 'This is a demo account. A demo can never reach a real person — every address is .invalid and this is a hard stop, not a setting.' }
  }
  if (!a.killSwitchOn) {
    return { ok: false, reason: 'kill_switch_off',
      detail: 'AUTO_OUTREACH_ENABLED is off, so nothing is pushed to Smartlead. This is the safe default and it governs Smartlead exactly as it governs Instantly and SMTP.' }
  }
  // THE MIRROR OF INSTANTLY'S `not_house_client`, and the reason both exist.
  //
  // Our own outreach goes through Instantly on mailboxes we own. If the house account ever
  // leaked into Smartlead it would send OUR cold email from a mailbox bought for a CLIENT —
  // and their domain would carry our complaints. That is the exact failure RULEBOOK 12.2 is
  // written to prevent, pointed the other way.
  if (a.isHouseClient) {
    return { ok: false, reason: 'is_house_client',
      detail: 'Smartlead sends CLIENT outreach only. Our own outreach goes through Instantly — pushing the house account here would send our email from a mailbox bought for a client, and their domain would carry our complaints (#577).' }
  }
  if (!a.hasApiKey) {
    return { ok: false, reason: 'no_api_key',
      detail: 'SMARTLEAD_API_KEY is not set, so nothing can be pushed. Set it in Railway → @kind/api → Variables.' }
  }
  // A client with no Smartlead mailbox has nothing to send FROM. Pushing anyway would create
  // leads in a campaign that can never deliver — the "looks covered on the board and cannot
  // send a single email" failure that #552 was raised for.
  if (!a.hasSmartleadInbox) {
    return { ok: false, reason: 'no_smartlead_inbox',
      detail: 'This client has no mailbox with provider smartlead-api, so there is nothing to send from. Record the purchased SmartSenders mailbox in Vida → Engine first.' }
  }
  if (!a.leadEmail || !a.leadEmail.trim()) {
    return { ok: false, reason: 'no_email',
      detail: 'This lead has no email address. Pushing it would create an unsendable row in Smartlead and silently inflate the campaign count.' }
  }
  return { ok: true }
}

export function smartleadRefusalLabel(r: SmartleadRefusal): string {
  switch (r) {
    case 'no_api_key':          return 'Smartlead API key not set'
    case 'kill_switch_off':     return 'outreach is switched off'
    case 'is_demo':             return 'demo account — can never send'
    case 'is_house_client':     return 'the house account — our own outreach goes via Instantly'
    case 'no_smartlead_inbox':  return 'client has no Smartlead mailbox to send from'
    case 'no_email':            return 'lead has no email address'
  }
}

// ── THE PAYLOADS ────────────────────────────────────────────────────────────────────────
//
// VERIFIED against Smartlead's published API reference (checked 27 Jul): the add-leads body
// wraps an array in `lead_list`, each entry carrying `email` (required) plus optional
// `first_name`, `last_name`, `company_name` and a `custom_fields` object; max 400 per request.
//
// NOT verified: the sequence step shape. See `NOT_POSSIBLE` in `smartlead.ts` — it is stated
// there rather than guessed here.

export type SmartleadLeadPayload = {
  email: string
  first_name: string
  last_name: string
  company_name: string
  custom_fields: Record<string, string>
}

/**
 * One lead, in Smartlead's shape.
 *
 * Empty strings rather than nulls for the optional names: Smartlead renders `{{first_name}}`
 * into the email body, and a null becomes the literal text "null" in a real prospect's inbox
 * while an empty string collapses to nothing. Neither is good — which is why
 * `toSmartleadSequence` renders our copy with `applyTokens` BEFORE it ever reaches them, so
 * their templating is never relied on.
 */
export function toSmartleadLead(lead: {
  email?: string | null
  first_name?: string | null
  last_name?: string | null
  company?: string | null
  job_title?: string | null
  industry?: string | null
  country?: string | null
}): SmartleadLeadPayload {
  const custom: Record<string, string> = {}
  if (lead.job_title) custom.job_title = lead.job_title
  if (lead.industry) custom.industry = lead.industry
  if (lead.country) custom.country = lead.country
  return {
    email: (lead.email ?? '').trim(),
    first_name: (lead.first_name ?? '').trim(),
    last_name: (lead.last_name ?? '').trim(),
    company_name: (lead.company ?? '').trim(),
    custom_fields: custom,
  }
}

export type SmartleadStep = { seq_number: number; seq_delay_details: { delay_in_days: number }; subject: string; email_body: string }

/**
 * Our sequence, rendered, in Smartlead's step shape.
 *
 * **The copy is rendered HERE, with our own `applyTokens`, before it leaves.** Smartlead has
 * its own templating and we deliberately do not use it: a token their engine does not
 * recognise is delivered literally, so `{{first_name}}` reaches a real prospect as those
 * characters. Rendering first means what we send is exactly what we reviewed.
 *
 * Steps with no subject AND no body are dropped rather than sent as blanks.
 */
export function toSmartleadSequence(
  steps: SequenceStep[],
  lead: Parameters<typeof applyTokens>[1],
  senderCompany?: string | null,
): SmartleadStep[] {
  // NON-EMAIL STEPS ARE DROPPED, exactly as `toInstantlySequence` drops them. A sequence can
  // carry LinkedIn or call steps; letting one through would turn "connect on LinkedIn" into an
  // email to a real prospect, in our client's name.
  const emails = (steps ?? []).filter(s => !s.channel || s.channel === 'email')
  const out: SmartleadStep[] = []
  for (const s of emails) {
    const subject = applyTokens(s.subject ?? '', lead, senderCompany).trim()
    const body = applyTokens(s.body ?? '', lead, senderCompany).trim()
    if (!subject && !body) continue
    out.push({
      seq_number: out.length + 1,
      // `wait_days` is days since the PREVIOUS step, which is exactly what Smartlead's
      // `delay_in_days` means — so it passes through directly. (Instantly's `day` is
      // cumulative, which is why `toInstantlySequence` accumulates and this does not. Getting
      // that backwards would either fire a whole sequence at once or stretch it over months.)
      // The first step always sends immediately, whatever wait it carries.
      seq_delay_details: { delay_in_days: out.length === 0 ? 0 : Math.max(0, Math.floor(s.wait_days ?? 0)) },
      subject,
      email_body: body,
    })
  }
  return out
}

/** Smartlead caps a single add-leads request at 400. Chunk rather than silently truncate. */
export const SMARTLEAD_MAX_LEADS_PER_REQUEST = 400

export function chunkLeads<T>(leads: T[], size = SMARTLEAD_MAX_LEADS_PER_REQUEST): T[][] {
  if (leads.length === 0) return []
  const out: T[][] = []
  for (let i = 0; i < leads.length; i += size) out.push(leads.slice(i, i + size))
  return out
}
