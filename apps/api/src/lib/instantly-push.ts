// THE HAND-OFF — where an approved lead is actually given to Instantly.
//
// Prompt 4 built the client (`instantly.ts`) and the judgement (`instantly-map.ts`) and then
// **wired neither into anything**: the founder asked, I grepped for callers, and the answer
// was *tests only*. This is that missing wiring, and it is the reason P10/P11 now exist.
//
// It sits AFTER the enrol in `approve-lead.ts` step 8, because the lead must already be paid
// for, revealed and in a sequence before anyone sends on its behalf.
//
// WHO IS THE HOUSE CLIENT — and why it is an env var, not a name match.
//
// Twice now an exact-string match has cost us: `MBF Holdings` vs the live `MBF Demo` broke
// both the demo reset and the stray-account check (#584, #582). A company name is a label a
// human edits; an id is not. So the house client is `HOUSE_CLIENT_ID`, set once in Railway.
// **Unset means there is no house client and nothing is ever pushed** — fail closed, because
// the failure mode of guessing wrong is emailing real people from the wrong account.

import { db } from '@kind/db'
import { canPushToInstantly, refusalLabel, toInstantlyLead, toInstantlySequence, type PushRefusal } from './instantly-map'
import { instantlyConfigured, listCampaigns, createCampaign, addLead } from './instantly'
import type { SequenceStep } from './sequence-apply'

export type PushResult =
  | { pushed: true; campaignId: string }
  | { pushed: false; reason: PushRefusal | 'no_sequence' | 'api_error'; detail: string }

/** The campaign name we own inside Instantly. One per house account, found by name. */
export const HOUSE_CAMPAIGN_NAME = 'K.I.N.D — Client Zero'

export function houseClientId(): string | null {
  const v = process.env.HOUSE_CLIENT_ID
  return v && v.trim() ? v.trim() : null
}

/**
 * Give one approved lead to Instantly.
 *
 * **Never throws.** It is called from the money path after the client has already been
 * charged; an exception here would surface as a failed approve on a lead they have paid for.
 * Every failure is returned, and the caller alerts.
 *
 * Every gate is re-checked HERE rather than trusted from the caller, because this function is
 * one import away from being called by something new that forgot one.
 */
export async function pushApprovedLeadToInstantly(leadId: string, clientId: string): Promise<PushResult> {
  const { data: client } = await db.from('clients')
    .select('id, is_demo').eq('id', clientId).maybeSingle()

  const { data: lead } = await db.from('leads')
    .select('id, first_name, last_name, email, company, job_title, industry, country')
    .eq('id', leadId).eq('client_id', clientId).maybeSingle()

  const gate = canPushToInstantly({
    hasApiKey: instantlyConfigured(),
    killSwitchOn: process.env.AUTO_OUTREACH_ENABLED === 'true',
    isDemo: (client as { is_demo?: boolean } | null)?.is_demo === true,
    isHouseClient: houseClientId() !== null && houseClientId() === clientId,
    leadEmail: (lead as { email?: string | null } | null)?.email ?? null,
  })
  if (!gate.ok) return { pushed: false, reason: gate.reason, detail: gate.detail }

  // Our own sequence copy — Instantly sends OUR words, it does not write them.
  const { data: seq } = await db.from('figsy_sequences')
    .select('steps').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const steps = ((seq as { steps?: SequenceStep[] } | null)?.steps ?? []) as SequenceStep[]
  const rendered = toInstantlySequence(steps, lead as never)
  if (rendered.length === 0) {
    return { pushed: false, reason: 'no_sequence',
      detail: 'This client has no email sequence, so there is nothing for Instantly to send. Write one before pushing.' }
  }

  // Find our campaign, or make it. Named lookup because Instantly has no concept of our ids.
  const list = await listCampaigns()
  if (!list.ok) return { pushed: false, reason: 'api_error', detail: `Could not list campaigns: ${list.error}` }
  let campaignId = list.data.find(c => c.name === HOUSE_CAMPAIGN_NAME)?.id ?? null

  if (!campaignId) {
    const made = await createCampaign(HOUSE_CAMPAIGN_NAME, rendered)
    if (!made.ok) return { pushed: false, reason: 'api_error', detail: `Could not create the campaign: ${made.error}` }
    campaignId = made.data?.id ?? null
    if (!campaignId) return { pushed: false, reason: 'api_error', detail: 'Instantly created the campaign but returned no id.' }
  }

  const added = await addLead(campaignId, toInstantlyLead(lead as never))
  if (!added.ok) return { pushed: false, reason: 'api_error', detail: `Could not add the lead: ${added.error}` }
  return { pushed: true, campaignId }
}

/**
 * Is a refusal worth telling the founder about?
 *
 * **No, for the four that are the system working.** A demo, the kill-switch, a client (who
 * goes via Smartlead) and a missing key are all EXPECTED states — alerting on them would page
 * the founder on every single approval and train them to ignore the alert, which is how a
 * real one gets missed. Only a genuine API failure or a missing sequence is news.
 */
export function pushRefusalIsNews(reason: PushResult extends { pushed: false } ? never : string): boolean {
  return reason === 'api_error' || reason === 'no_sequence'
}

export { refusalLabel }
