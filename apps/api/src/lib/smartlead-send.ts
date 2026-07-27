// THE HAND-OFF — where an approved lead is actually given to Smartlead, for a CLIENT.
//
// The mirror of `instantly-push.ts`. Founder-locked 26 Jul: **Instantly is OURS, Smartlead is
// the CLIENTS'** (#577), and both run inside our own product — no CSV hand-off.
//
// It sits AFTER the enrol in `approve-lead.ts`, in the same slot the Instantly push occupies,
// because a lead must already be paid for, revealed and in a sequence before anyone sends on
// its behalf. The two are mutually exclusive by construction: `canPushToInstantly` refuses
// anything that is not the house client, `canPushToSmartlead` refuses anything that is. One
// route, or neither — never both.
//
// PROMPT 4'S LESSON IS BUILT IN HERE. That prompt shipped a client and a mapping and wired
// neither into anything; the grep for callers returned *tests only*. So this file is written
// alongside its caller, and a test asserts the caller exists — because a hand-off nothing
// calls is not an integration, it is a folder.

import { db } from '@kind/db'
import {
  canPushToSmartlead, smartleadRefusalLabel, toSmartleadLead, toSmartleadSequence,
  chunkLeads, SMARTLEAD_SENDING_MODE, type SmartleadRefusal,
} from './smartlead-map'
import { smartleadConfigured, createCampaign, saveSequence, addLeads, listCampaignsTyped } from './smartlead'
import type { SequenceStep } from './sequence-apply'

export type SmartleadPushResult =
  | { pushed: true; campaignId: string }
  | { pushed: false; reason: SmartleadRefusal | 'no_sequence' | 'api_error'; detail: string }

/**
 * One campaign per client, inside the client's own Smartlead workspace view.
 *
 * Named from the client id rather than the company name. A company name is a label a human
 * edits — and renaming a client would orphan their campaign and silently start a second one,
 * which is the `MBF Holdings` vs `MBF Demo` failure (#584/#582) with a sending account
 * attached to it.
 */
export function campaignNameFor(clientId: string): string {
  return `K.I.N.D — ${clientId}`
}

/** Does this client have a mailbox recorded with provider `smartlead-api`? */
export async function hasSmartleadInbox(clientId: string): Promise<boolean> {
  const { data } = await db.from('client_inboxes')
    .select('id').eq('client_id', clientId).eq('provider', SMARTLEAD_SENDING_MODE)
    .in('status', ['assigned', 'warming', 'active']).limit(1).maybeSingle()
  return !!data
}

/**
 * Give one approved lead to Smartlead, to be sent by the client's own mailbox.
 *
 * **Never throws.** It is called from the money path after the client has already been
 * charged; an exception here would surface as a failed approve on a lead they have paid for.
 * Every failure is returned, and the caller decides whether it is news.
 *
 * Every gate is re-checked HERE rather than trusted from the caller, because this function is
 * one import away from being called by something new that forgot one.
 */
export async function pushApprovedLeadToSmartlead(leadId: string, clientId: string): Promise<SmartleadPushResult> {
  const { data: client } = await db.from('clients')
    .select('id, is_demo, company_name').eq('id', clientId).maybeSingle()

  const { data: lead } = await db.from('leads')
    .select('id, first_name, last_name, email, company, job_title, industry, country')
    .eq('id', leadId).eq('client_id', clientId).maybeSingle()

  const { houseClientId } = await import('./instantly-push')

  const gate = canPushToSmartlead({
    hasApiKey: smartleadConfigured(),
    killSwitchOn: process.env.AUTO_OUTREACH_ENABLED === 'true',
    isDemo: (client as { is_demo?: boolean } | null)?.is_demo === true,
    isHouseClient: houseClientId() !== null && houseClientId() === clientId,
    hasSmartleadInbox: await hasSmartleadInbox(clientId),
    leadEmail: (lead as { email?: string | null } | null)?.email ?? null,
  })
  if (!gate.ok) return { pushed: false, reason: gate.reason, detail: gate.detail }

  // Our own sequence copy — Smartlead sends OUR words, it does not write them, and the copy is
  // rendered before it leaves so their templating is never relied on.
  const { data: seq } = await db.from('figsy_sequences')
    .select('steps').eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  const steps = ((seq as { steps?: SequenceStep[] } | null)?.steps ?? []) as SequenceStep[]
  const rendered = toSmartleadSequence(steps, lead as never, (client as { company_name?: string | null } | null)?.company_name ?? null)
  if (rendered.length === 0) {
    return { pushed: false, reason: 'no_sequence',
      detail: 'This client has no email sequence, so there is nothing for Smartlead to send. Write one before pushing.' }
  }

  // Find this client's campaign, or make it. Named lookup because Smartlead has no concept of
  // our ids — and the name is derived from the client id, never the company name.
  const wanted = campaignNameFor(clientId)
  const list = await listCampaignsTyped()
  if (!list.ok) return { pushed: false, reason: 'api_error', detail: `Could not list campaigns: ${list.error}` }
  let campaignId = list.data.find(c => c.name === wanted)?.id ?? null

  if (campaignId === null) {
    const made = await createCampaign(wanted)
    if (!made.ok) return { pushed: false, reason: 'api_error', detail: `Could not create the campaign: ${made.error}` }
    campaignId = made.data?.id ?? null
    if (campaignId === null || campaignId === undefined) {
      return { pushed: false, reason: 'api_error', detail: 'Smartlead created the campaign but returned no id.' }
    }
    // Only save the sequence on CREATE. Re-saving on every approval would overwrite the
    // campaign's copy mid-flight for every prospect already in it, and a prospect midway
    // through a sequence would suddenly receive step 2 of a different email.
    const saved = await saveSequence(String(campaignId), rendered)
    if (!saved.ok) return { pushed: false, reason: 'api_error', detail: `Campaign created but the sequence could not be saved: ${saved.error}` }
  }

  // One lead per approval today, but chunked anyway: the 400 cap is Smartlead's, and a
  // caller that later batches would otherwise be silently truncated at 400 with no error.
  const batches = chunkLeads([toSmartleadLead(lead as never)])
  for (const batch of batches) {
    const added = await addLeads(String(campaignId), batch)
    if (!added.ok) return { pushed: false, reason: 'api_error', detail: `Could not add the lead: ${added.error}` }
  }
  return { pushed: true, campaignId: String(campaignId) }
}

/**
 * Is a refusal worth telling the founder about?
 *
 * **No, for the five that are the system working.** A demo, the kill-switch, the house
 * account (which goes via Instantly), a missing key and a client who has not bought a mailbox
 * yet are all EXPECTED states. Alerting on them would fire on every single approval and train
 * the founder to ignore the alert, which is how a real one gets missed.
 *
 * Only a genuine API failure or a missing sequence is news.
 */
export function smartleadRefusalIsNews(reason: string): boolean {
  return reason === 'api_error' || reason === 'no_sequence'
}

export { smartleadRefusalLabel }
