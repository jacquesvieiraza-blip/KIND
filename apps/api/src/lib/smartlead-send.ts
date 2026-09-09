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
import { normalizeRevealEmail } from './billing-rules'
import { isSuppressed } from './suppression'
import { pecrVerdict } from './pecr'
import { isLaunchSendCountry } from '@kind/shared'
import type { SequenceStep } from './sequence-apply'
import { outreachDeliveryPermitted } from './outreach-kill-switch'

export type SmartleadPushResult =
  | { pushed: true; campaignId: string }
  | { pushed: false; reason: SmartleadRefusal | 'no_sequence' | 'api_error'; detail: string }

/**
 * One campaign per client — named for them, NOT inside a Smartlead client sub-account.
 *
 * ⛓️ The phrase "inside the client's own Smartlead workspace view" stood here and is
 * corrected 29 Aug: it reads as though we assign campaigns to Smartlead whitelabel clients.
 * We do not. Every K.I.N.D campaign is UNASSIGNED, and the client identity below is
 * K.I.N.D's own `clients.id`, not Smartlead's client id. The distinction decides whether a
 * null-scoped block-list entry actually suppresses anyone — see `addToGlobalBlockList`.
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
  // ══ THE PROGRAMME OUTREACH GATE (BUILD-003 PR2) ═══════════════════════════════════════
  //
  // 🛑 FIRST STATEMENT IN THE FUNCTION, AND THAT POSITION IS THE POINT. Smartlead keeps its
  // OWN copy of the lead and sends from it on its own schedule — our blocklist has no reach
  // inside it, which is the whole reason `provider-eviction` exists. So a push is not "queue
  // an email", it is handing a real person to an engine we do not control. Once they are in,
  // pausing the programme here does nothing to them.
  //
  // Both live callers funnel through this one function — `approve-lead.ts` (the live path) and
  // `smartlead-backfill.ts` — so one gate covers both, and the backfill cannot become the door
  // that a paused programme walks out of.
  const { checkProgrammeAuthority } = await import('./programme-authority')
  const authority = await checkProgrammeAuthority(clientId, 'OUTREACH')
  if (!authority.allowed) {
    console.warn(`[smartlead] push REFUSED for lead ${leadId} — programme authority (${authority.reason}). ${authority.message}`)
    return { pushed: false, reason: 'programme_not_authorised',
      detail: `${authority.message} Refused before the push: Smartlead sends from its own copy of the lead, so this is the last gate that can stop it.` }
  }

  const { data: client } = await db.from('clients')
    .select('id, is_demo, company_name').eq('id', clientId).maybeSingle()

  const { data: lead } = await db.from('leads')
    .select('id, first_name, last_name, email, company, job_title, industry, country')
    .eq('id', leadId).eq('client_id', clientId).maybeSingle()

  const { houseClientId } = await import('./instantly-push')

  const row = (lead ?? {}) as {
    email?: string | null; company?: string | null; country?: string | null
  }
  const isDemo = (client as { is_demo?: boolean } | null)?.is_demo === true

  // ── HC-3 — THE SUPPRESSION PROBE, ASKED HERE BECAUSE THE GATE FILE IS PURE ────────────────
  //
  // `smartlead-map.ts` decides; this reads. The blocklist question needs a database round-trip
  // and that file's whole design is that it needs none, so the answer is fetched here and
  // handed down. The other three are pure and could have run in there — they run here too, so
  // all four arrive by one route and nobody has to work out which kind each one is.
  //
  // HC-1 — PROBE WITH THE NORMALISED ADDRESS. `leads.email` is stored raw and the blocklist is
  // stored normalised, so an exact compare between the two is a coin toss on letter case. This
  // is the same probe shape `sendSequenceEmail` and the day-1 batch use.
  //
  // ⚠️ FAILS CLOSED. A rejected blocklist read returns `data: null`, which would read as "not
  // opted out" and push. Smartlead sends what it is given and our net never runs again, so an
  // unanswerable question here is treated as a NO. That is the opposite of how the same read
  // behaves on the SMTP path, deliberately: there, a later cron re-asks; here, there is no later.
  let isBlocklisted = false
  const emailKey = normalizeRevealEmail(row.email ?? null)
  if (!isDemo && emailKey) {
    const { data: blocked, error: blockErr } = await db.from('opt_out_blocklist')
      .select('id').eq('email', emailKey).is('opted_back_in_at', null).maybeSingle()
    if (blockErr) {
      console.error('[smartlead] blocklist read FAILED — refusing the push (fail-closed)', leadId, blockErr.message)
      return { pushed: false, reason: 'opted_out',
        detail: `Could not establish whether this person has opted out (${blockErr.message}). Refused rather than pushed: Smartlead sends from its own engine, so this is the last gate before a real person.` }
    }
    isBlocklisted = !!blocked
  }

  const pecr = pecrVerdict({ country: row.country, companyName: row.company, isDemo })

  const gate = canPushToSmartlead({
    hasApiKey: smartleadConfigured(),
    outreachDeliveryPermitted: outreachDeliveryPermitted(),
    isDemo,
    isHouseClient: houseClientId() !== null && houseClientId() === clientId,
    hasSmartleadInbox: await hasSmartleadInbox(clientId),
    leadEmail: row.email ?? null,
    isBlocklisted,
    // Demo is exempt on all three of these for the reason the demo stop exists at all: a demo
    // address is `.invalid` and can never reach a person, and classifying seeded rows would
    // refuse leads that were never going to send while making the demo output read as broken.
    isDoNotContact: !isDemo && isSuppressed({ email: row.email, company: row.company }),
    pecrAllows: pecr.allow,
    inLaunchCountry: isDemo || isLaunchSendCountry(row.country),
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

  // ── HC-3 — RECORD THAT THIS LEAD IS NOW INSIDE SMARTLEAD ─────────────────────────────────
  //
  // ⚠️ NOTHING USED TO WRITE THIS DOWN. `campaignId` was returned and the caller discarded it,
  // so the product had NO WAY TO KNOW which people were sitting in a Smartlead campaign.
  //
  // That is not bookkeeping. When somebody opts out, our blocklist stops OUR sends — it does
  // nothing to Smartlead's engine, which keeps its own copy of the lead and keeps sending. The
  // only way to stop that is to remove them there, and you cannot remove someone you cannot
  // name. Without this column, an opt-out alert could not even tell the founder WHO to go and
  // remove, or from which campaign.
  //
  // Written AFTER `addLeads` succeeds, never before: a row claiming membership that Smartlead
  // rejected would send an operator hunting for a lead that is not there — and, worse, would
  // make the opt-out alert fire for a person who was never at risk.
  //
  // Best-effort with a LOUD failure, not a swallow. The push genuinely happened; failing the
  // whole thing here would report "not pushed" about a lead that IS in a live campaign, which
  // is the more dangerous of the two wrong answers.
  const { error: markErr } = await db.from('leads')
    .update({ smartlead_campaign_id: String(campaignId) }).eq('id', leadId)
  if (markErr) {
    console.error('[smartlead] lead pushed but the campaign id was NOT recorded — an opt-out cannot be propagated for this person', leadId, markErr.message)
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'A lead is in Smartlead and we did not record it', [
      `Client ${clientId}, lead ${leadId}, Smartlead campaign ${campaignId}.`,
      'The push SUCCEEDED — this person is in a live Smartlead campaign and will be emailed.',
      `But the campaign id could not be saved: ${markErr.message}`,
      'If they opt out, we will not know they are in Smartlead, and our blocklist does not stop Smartlead. Note this lead by hand.',
    ]).catch(() => {})
  }

  return { pushed: true, campaignId: String(campaignId) }
}

// ── HC-3 — WHAT HAPPENS WHEN SOMEBODY IN A SMARTLEAD CAMPAIGN OPTS OUT ─────────────────────
//
// ⚠️ OUR BLOCKLIST DOES NOT STOP SMARTLEAD. That sentence is the whole reason this exists.
// Every one of our send paths re-reads `opt_out_blocklist` before it mails anyone, so writing
// that row genuinely stops US. Smartlead holds its own copy of the lead and sends on its own
// schedule from its own engine; it has never read our table and never will. A person who
// replies STOP is suppressed everywhere except the one place still emailing them.
//
// ⚠️ WHY THIS ALERTS INSTEAD OF CALLING THE API, AND IT IS A DELIBERATE REFUSAL TO GUESS.
// Founder-ruled 20 Aug — *"yes alert not api"*. `smartlead.ts` exports four calls:
// createCampaign, saveSequence, addLeads, listCampaignsTyped. **There is no remove, no stop and
// no lead lookup**, and both Smartlead domains return 403 to this environment, so the endpoint
// cannot be verified. Writing one would be guessing a URL — exactly what that file's own
// NOT_POSSIBLE register forbids, in writing, about this exact situation: *"Guessing an endpoint
// would ship a path that silently returns nothing."*
//
// A silent no-op here would be the worst possible outcome: the product would LOOK like it
// propagates opt-outs, and a suppressed person would keep receiving mail with nobody watching.
// An alert that names the person and the campaign is smaller, uglier, and actually works today.
// It is registered in NOT_POSSIBLE so the gap is known rather than hidden, and the real call
// gets written the day the workspace is live — which is also the first day it could be tested.
//
// Never throws: both callers are suppression paths, and an exception here would abort the
// blocklist write that IS working.

/**
 * Tell the founder that a suppressed person is still inside a live Smartlead campaign.
 *
 * Silent when the address is in no campaign, which is every lead today (Smartlead is
 * unpurchased and returns 401) — this must not fire on ordinary opt-outs, or it becomes the
 * alert everyone learns to ignore.
 */
export async function alertSmartleadStillSending(email: string, reason: string): Promise<void> {
  try {
    const key = normalizeRevealEmail(email)
    if (!key) return
    // Raw-vs-normalised: `leads.email` is stored raw (HC-1/F10), so match case-insensitively
    // rather than exactly — an opt-out that misses here is an opt-out nobody ever actions.
    const { data: rows } = await db.from('leads')
      .select('id, email, client_id, smartlead_campaign_id')
      .not('smartlead_campaign_id', 'is', null)
      .ilike('email', key)
    const hits = (rows ?? []) as { id: string; client_id: string | null; smartlead_campaign_id: string | null }[]
    if (hits.length === 0) return

    const { sendFounderAlert } = await import('./alerts')
    await sendFounderAlert('support_escalation',
      `🛑 STILL IN SMARTLEAD AFTER OPTING OUT — ${email}`, [
        `${email} opted out (${reason}) and is in ${hits.length === 1 ? 'a live Smartlead campaign' : `${hits.length} live Smartlead campaigns`}.`,
        'OUR blocklist stops OUR sends. It does NOTHING to Smartlead, which holds its own copy of this lead and will keep emailing them.',
        '',
        ...hits.map(h => `• Remove lead ${h.id} from Smartlead campaign ${h.smartlead_campaign_id}${h.client_id ? ` (client ${h.client_id})` : ''}`),
        '',
        'Do this in the Smartlead dashboard. We cannot do it by API — the remove endpoint is unverified from here and is listed in NOT_POSSIBLE rather than guessed.',
      ])
  } catch (err) {
    // The blocklist write is the thing that matters and it has already happened. Say so and
    // move on rather than letting an alert failure take the suppression down with it.
    console.error('[smartlead] could not check Smartlead membership on opt-out —', email, err instanceof Error ? err.message : err)
  }
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
 *
 * ⚠️ HC-3 — AND THE FOUR SUPPRESSION REFUSALS ARE NOT NEWS EITHER, for the same reason. An
 * opted-out, do-not-contact, PECR-risk or launch-held lead being refused is the gate DOING ITS
 * JOB, and on a book where most leads are held (R50) it would fire on nearly every approval.
 *
 * The one case that could hide behind this is the fail-closed blocklist read: an unanswerable
 * database read returns `opted_out` and would be silent here. It is not silent — it writes a
 * `console.error` naming the lead and the driver message, the same treatment C7's review-gate
 * failure gets. If that ever needs to page rather than log, it needs its own reason, not a
 * loosening of this function.
 */
export function smartleadRefusalIsNews(reason: string): boolean {
  return reason === 'api_error' || reason === 'no_sequence'
}

export { smartleadRefusalLabel }
