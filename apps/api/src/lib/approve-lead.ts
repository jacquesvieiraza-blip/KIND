import { db } from '@kind/db'
import { autoEnrollLead } from './figsy'
import { waterfallEnrich } from './enrichment'
import { normalizeRevealEmail } from './billing-rules'
import { isDemoClient } from './demo'
import { sendFounderAlert } from './alerts'
import { PAID_TX_TYPES } from './onboarding-pack'
import { recordLeadSaleCommission } from './lead-sale-commission'

// ONE WALLET — the work model (founder-locked 24 Jul, supersedes #492).
// APPROVE is the ONLY money event: the client's 👍 (in Milla) or an operator
// approve-on-behalf (in Vida) charges a flat $4 from the single wallet, ONCE per
// lead, and that charge is FINAL — no $1/$3 split, no hold, no capture-on-booking,
// no release, no hand-backs. Booking a meeting is a REPORTED outcome, never money.
//
// The atomic `revealed_at` claim is the once-per-lead gate: only the first approve
// of a lead wins the claim and charges the $4; a re-approve is a no-op. If the reveal
// returns no usable email we REVERSE the $4 in the same flow — a dead email is never
// billed. Enrolment then starts the outreach on the already-paid lead (charges nothing).

export const PRICE_PER_LEAD_USD = 4

export type ApproveOutcome =
  | { status: 'approved'; revealed: true; email: string; charged: boolean }
  | { status: 'no_email'; revealed: false }        // dead email — $4 not charged / reversed
  | { status: 'already_in_crm'; revealed: false }  // client owns it — no charge
  | { status: 'insufficient_funds'; revealed: false } // wallet < $4 — nothing moved (402)
  | { status: 'no_campaign'; revealed: false }     // no active campaign → can't work it → NOT charged
  | { status: 'not_found'; revealed: false }

// ── #625 — THE NO-CAMPAIGN RULE, IN ONE PLACE ─────────────────────────────────────────────
//
// Step 3c fails closed when a client has no active campaign: the $4 buys WORK, so if the work
// cannot run we must not take the money. But the **#424 charge-once branch at step 3b sits
// BEFORE that gate and returns early**, so a re-approved contact skipped it entirely —
// revealed, never enrolled, and the caller told "approved".
//
// ⚠️ AND THE SAFETY NET UNDER IT DID NOT FIRE EITHER. 3b wraps `autoEnrollLead` in a `.catch`
// that alerts — but `autoEnrollLead`'s no-campaign branch is a silent `return`, not a throw, so
// the catch never ran. Two guards, both real, and the failure walked between them. The founder
// hit it live on his own money walk: two approvals on Client Zero (no active campaign), stranded
// with no error and no alert, surfaced only by the Integrity panel hours later.
//
// So the campaign question gets ONE answer that both doors ask. Copying the lookup into 3b
// would have been the wrong fix twice over: it would have missed the paused-campaign RESUME
// below, so a client coming back from a cold suspension would be refused at one door and
// rescued at the other.

/**
 * The client's active campaign — resuming a paused one if that is the only reason there isn't
 * one. Returns null when there is genuinely nothing to work the lead with.
 *
 * THE RESUME IS NOT A DETAIL. The 30-day cold check suspends by PAUSING campaigns, and
 * approving is the signal a client is back — so approving must be able to un-suspend them, or
 * they are locked out of the only action that revives them. Only `paused` is touched: a draft
 * was never live and a completed one is finished; neither should spring back to sending because
 * somebody clicked approve.
 */
async function resolveActiveCampaign(clientId: string): Promise<{ id: string } | null> {
  const { data: active } = await db.from('figsy_campaigns')
    .select('id').eq('client_id', clientId).eq('status', 'active').limit(1).maybeSingle()
  if (active) return { id: active.id as string }

  const { data: resumed } = await db.from('figsy_campaigns')
    .update({ status: 'active' }).eq('client_id', clientId).eq('status', 'paused')
    .select('id').limit(1)
  if (resumed && resumed.length > 0) {
    console.log('[approve] client', clientId, 'came back — resumed paused campaign(s)')
    void sendFounderAlert('new_signup', 'A quiet client just came back', [
      `Client ${clientId} approved someone, so their paused campaigns are live again.`,
      'They suspended themselves by going quiet; approving is what brings them back.',
    ]).catch(() => {})
    return { id: resumed[0].id as string }
  }
  return null
}

/**
 * Refuse an approval that has nowhere to run: un-claim the lead, tell the operator, and say so
 * honestly to the caller.
 *
 * `wasFree` is TRUE on the charge-once door — that client paid for this contact on an EARLIER
 * approval, so "they were not charged" is true of this request and would be a lie about their
 * account. The alert says which, because an operator reading it needs to know whether money is
 * sitting against a lead that never got worked.
 */
async function refuseNoCampaign(
  // `unclaim` is a supabase thenable, not a real Promise — typed as PromiseLike so the caller
  // can pass its own closure unchanged rather than wrapping it just to satisfy a signature.
  clientId: string, leadId: string, unclaim: () => PromiseLike<void>, wasFree: boolean,
): Promise<ApproveOutcome> {
  await unclaim()
  void sendFounderAlert('sends_stalled', 'Approve blocked — no active campaign', [
    'A client tried to approve a lead but has NO active campaign, so no outreach could run.',
    `Client: ${clientId} · Lead: ${leadId}`,
    wasFree
      ? 'Nothing was charged for this request — they had ALREADY paid for this contact (#424 charge-once), so the money moved on an earlier approval.'
      : 'They were NOT charged.',
    'Start their campaign in Vida (client → Start campaign) to unblock.',
  ]).catch(() => {})
  return { status: 'no_campaign', revealed: false }
}

export async function approveLead(leadId: string, clientId: string): Promise<ApproveOutcome> {
  const now = new Date().toISOString()

  // 1. Atomic claim — only the FIRST approve of this lead wins. This is the
  //    once-per-lead gate for the $4 charge.
  const { data: claimedRows, error: claimErr } = await db.from('leads')
    .update({ revealed_at: now })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('*')
  if (claimErr) throw claimErr
  const claim = (claimedRows ?? [])[0] as Record<string, any> | undefined

  // Lost the claim → already approved (idempotent). Return the existing state; never
  // a second charge.
  if (!claim) {
    const { data: existing } = await db.from('leads')
      .select('email, revealed_at, crm_existing').eq('id', leadId).eq('client_id', clientId).maybeSingle()
    if (!existing) return { status: 'not_found', revealed: false }
    if (existing.email) {
      // `charged: true` was hardcoded here, so a double-click, a retry or a refresh on a
      // lead covered by the included 100 told the client "$4 charged" for an approval that
      // cost nothing. #541 fixed that on the first-approval path and missed this one.
      // Ask the ledger what actually happened instead of assuming: a wallet charge writes
      // `lead:<id>`, a pack approval writes `pack_<id>` at $0.
      const { data: charge } = await db.from('credit_transactions')
        .select('id').eq('client_id', clientId)
        .eq('reference', `lead:${leadId}`).eq('type', 'wallet_charge')
        .limit(1).maybeSingle()
      return { status: 'approved', revealed: true, email: existing.email as string, charged: !!charge }
    }
    return { status: 'no_email', revealed: false }
  }

  const unclaim = () => db.from('leads').update({ revealed_at: null }).eq('id', claim.id).then(() => {}, () => {})

  // 2. Demo mode: free, off-ledger.
  if (await isDemoClient(clientId)) {
    const demoEmail = (claim.email as string | null) ?? null
    if (!demoEmail) { await unclaim(); return { status: 'no_email', revealed: false } }
    // #568 — THIS SWALLOW IS DELIBERATE. LEAVE IT.
    //
    // The other two enrol sites in this file alert on failure because a paid lead that never
    // enters a sequence is a client waiting for outreach that will never arrive. Here nobody
    // paid and nothing will ever be sent: `is_demo` is a hard stop inside the send path and
    // every demo address is `.invalid`. So a failed enrol on a demo lead costs a walkthrough
    // one seeded row, and paging the founder about it would train them to ignore the alert
    // that means a real client is stuck. Rebuild the demo instead (Vida → Engine → MBF).
    await autoEnrollLead(leadId, clientId, { force: true, prepaid: true }).catch(() => {})
    return { status: 'approved', revealed: true, email: demoEmail, charged: false }
  }

  // 3. Already in the client's own CRM → they own it → no charge.
  if (claim.crm_existing) { await unclaim(); return { status: 'already_in_crm', revealed: false } }

  // 3b. #424 charge-once — this client already paid for this contact → free re-approve.
  const knownEmail = normalizeRevealEmail(claim.email)
  if (knownEmail) {
    const { data: owned } = await db.rpc('reveal_is_owned', { p_client_id: clientId, p_email_norm: knownEmail })
    if (owned === true) {
      // #568④ — THE LAST SWALLOWED ENROL, and the one that hid the longest.
      //
      // `charged: false` below makes this look like a free path, so it read as harmless. It is
      // not: `reveal_is_owned` is true precisely BECAUSE this client already paid for this
      // contact. The money moved on an earlier approval; what the re-approve buys is the WORK.
      // Swallowed, they have paid and the lead enters no sequence — the same "paid, never
      // worked" outcome the no-campaign gate at step 3c fails closed to prevent, and that the
      // paid path at step 8 alerts on. Two of three sites guarded and this one silent meant
      // the failure simply moved to whichever door the client happened to come through.
      //
      // Found by a test harness, not by reading: returning `reveal_is_owned: true` sent an
      // assertion down this branch, where it passed while proving nothing.
      //
      // ⚠️ #625 — THE SAME GATE 3c APPLIES, APPLIED HERE TOO. This branch returns before 3c
      // ever runs, so without this a re-approve on a client with no active campaign revealed
      // the lead, enrolled nothing, and reported "approved". Free does not mean harmless: the
      // client paid for this contact earlier, and a lead in no sequence is somebody waiting on
      // outreach that will never arrive.
      if (!(await resolveActiveCampaign(clientId))) {
        return refuseNoCampaign(clientId, leadId, unclaim, true)
      }

      await autoEnrollLead(leadId, clientId, { force: true, prepaid: true }).catch((e: unknown) => {
        console.error('[approve] ENROL FAILED on a re-approve of an already-paid contact — the lead will never be worked', clientId, leadId, e)
        void sendFounderAlert('sends_stalled', 'An already-paid lead was never enrolled — no outreach will run', [
          `Client ${clientId}, lead ${leadId}.`,
          'No new charge was made — this client had ALREADY paid for this contact (#424 charge-once), so the money moved on an earlier approval and this re-approve was for the work.',
          `Reason: ${e instanceof Error ? e.message : String(e)}`,
          'The lead is approved and revealed, but it is in no sequence — enrol it from Vida or nothing will ever be sent.',
        ]).catch(() => {})
      })
      return { status: 'approved', revealed: true, email: claim.email as string, charged: false }
    }
  }

  // 3c. NO ACTIVE CAMPAIGN → we cannot do the work, so we must not take the money.
  //     The $4 buys WORK (we enrol the lead and run the outreach). autoEnrollLead below
  //     bails silently when the client has no ACTIVE campaign — so without this guard the
  //     wallet is debited, no enrolment row is ever written, and nothing is ever sent:
  //     the client pays $4 for nothing, with no error and no refund. Fail closed instead,
  //     exactly like the insufficient-funds gate, and alert us so an operator starts the
  //     campaign in Vida. (Deliberately placed AFTER the free paths — demo / already-in-CRM
  //     / already-owned never charge, so they are unaffected.)
  // #625 — one shared resolver (lookup + paused-campaign resume) so this door and the
  // charge-once door at 3b can never disagree about whether a client has somewhere to run.
  const activeCampaign = await resolveActiveCampaign(clientId)
  if (!activeCampaign) return refuseNoCampaign(clientId, leadId, unclaim, false)

  // 4. Charge — unless this approval is still covered by the $99 onboarding pack.
  //
  // The pack is 100 INCLUDED approvals (founder-locked 25 Jul), counted rather than faked
  // into the wallet: crediting $499 for a $99 payment so that "$4 a lead" happened to reach
  // 100 would have made the balance fiction and the revenue untrustworthy. So the first 100
  // approvals cost nothing and the 101st charges $4 exactly as before.
  //
  // Both facts are derived from rows that already exist — no new columns:
  //   • bought the pack → a purchase row in credit_transactions
  //   • used so far     → leads already revealed for this client (an approval reveals)
  const { packState } = await import('./onboarding-pack')
  const [{ count: purchaseCount }, { count: approvedCount }] = await Promise.all([
    db.from('credit_transactions').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PAID_TX_TYPES),
    db.from('leads').select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).not('revealed_at', 'is', null),
  ])
  // OFF BY ONE — THE PACK GAVE 99 FREE APPROVALS, NOT 100.
  //
  // The atomic claim above (step 1) sets `revealed_at` BEFORE this counts rows where
  // `revealed_at is not null` — so the count includes the lead being approved right now.
  // At approval #100 that read 100, packState returned left=0, and the client was charged
  // $4 for the hundredth of the hundred they had already paid for. The number "100
  // included" is printed on the lead card, in Milla's greeting, on the billing page, in
  // this ledger note and in the terms.
  //
  // Subtract this lead rather than moving the count above the claim: the claim is what
  // makes the once-per-lead charge atomic, and reading before it would let two concurrent
  // approvals both see 99 and both go free.
  //
  // `onboarding-pack.test.ts` asserts packState(true, 99).left === 1 and passes — it calls
  // the PURE FUNCTION with 99 while this route handed it 100. Same shape as the min-20
  // gate whose 18 unit tests passed on a bypassable route, which is why the test added for
  // this drives approveLead itself.
  const priorApprovals = Math.max(0, (approvedCount ?? 0) - 1)
  const pack = packState((purchaseCount ?? 0) > 0, priorApprovals)

  if (pack.left > 0) {
    // Covered by the pack — nothing moves in the wallet. Logged so the ledger still shows
    // every approval, at $0, rather than the work appearing from nowhere.
    await db.from('credit_transactions').insert({
      client_id: clientId, type: 'usage', amount: 0, plan: 'work_model',
      reference: `pack_${leadId}`,
      note: `Onboarding pack — approval ${pack.used + 1} of ${pack.included} included (lead ${leadId})`,
    }).then(() => {}, () => {})   // best-effort: a ledger hiccup must never block the reveal
  } else {
    const { data: charged, error: chargeErr } = await db.rpc('try_charge_wallet', { p_client_id: clientId, p_amount: PRICE_PER_LEAD_USD })
    if (chargeErr) { await unclaim(); throw chargeErr }
    if (charged !== true) { await unclaim(); return { status: 'insufficient_funds', revealed: false } }
  }

  // 4b. Milla says "$4 charged" on a re-approve of a FREE lead — the honest flag, computed
  //     once here so the first-approval return and the idempotent re-approve path cannot
  //     disagree. #541 fixed this at the bottom of this function and missed the lost-claim
  //     branch at the top, so a double-click on a pack-covered lead reported a charge that
  //     never happened.
  const moneyMoved = pack.left === 0

  // 5. Reveal the email (Hunter waterfall only when we don't already have one).
  let email: string | null = claim.email ?? null
  if (!email) {
    try {
      const enriched = await waterfallEnrich({
        first_name: claim.first_name, last_name: claim.last_name,
        company: claim.company, linkedin_url: claim.linkedin_url,
      })
      email = enriched.email ?? null
    } catch { email = null }
  }

  // 6. No usable email → REVERSE the $4 (never bill a dud) + un-claim.
  //
  // ONLY reverse what was actually taken. A pack approval charged nothing, so crediting $4
  // here would hand the client money they never paid — a dud lead would literally pay them.
  // Instead the pack slot is handed back by removing the usage row, so the approval doesn't
  // count against their 100.
  if (!email) {
    if (pack.left > 0) {
      await db.from('credit_transactions').delete().eq('reference', `pack_${leadId}`).then(() => {}, () => {})
    } else {
      const { error: revErr } = await db.rpc('increment_wallet', { p_client_id: clientId, p_amount: PRICE_PER_LEAD_USD })
      if (revErr) console.error('[approve] $4 REVERSAL FAILED for client', clientId, 'lead', claim.id, revErr)
    }
    await unclaim()
    return { status: 'no_email', revealed: false }
  }

  // 7. Persist the email + write the single $4 ledger row (once per lead).
  //
  // THE EMAIL WRITE IS THE PRODUCT. It was `.then(() => {}, () => {})` — swallowed — while
  // the comment immediately below explained why swallowing the LEDGER write was dangerous.
  // If this write fails silently: the $4 is gone, `revealed_at` is set, the email is never
  // stored, and the atomic claim blocks any retry — so the lead can NEVER be re-revealed.
  // The client paid for a contact we then lost, permanently, with no error anywhere.
  //
  // So: put the money back the same way the dead-email path does, release the claim so a
  // retry can work, and tell the client plainly rather than handing them a revealed lead
  // whose email we failed to keep.
  const { error: emailErr } = await db.from('leads')
    .update({ email, apollo_consented: true }).eq('id', claim.id)
  if (emailErr) {
    if (pack.left > 0) {
      await db.from('credit_transactions').delete().eq('reference', `pack_${leadId}`).then(() => {}, () => {})
    } else {
      const { error: revErr } = await db.rpc('increment_wallet', { p_client_id: clientId, p_amount: PRICE_PER_LEAD_USD })
      if (revErr) console.error('[approve] $4 reversal failed after an email-write failure', clientId, claim.id, revErr)
    }
    await unclaim()
    console.error('[approve] EMAIL WRITE FAILED — money returned, claim released', clientId, claim.id, emailErr.message)
    void sendFounderAlert('charge_failed', 'Approve rolled back — the revealed email could not be stored', [
      `Client ${clientId}, lead ${claim.id}. We found the email and failed to save it.`,
      `Reason: ${emailErr.message}`,
      pack.left > 0 ? 'Their pack slot was handed back.' : 'The $4 was returned to their wallet.',
      'The lead is un-claimed, so approving again will retry cleanly.',
    ]).catch(() => {})
    return { status: 'no_email', revealed: false }
  }
  const emailNorm = normalizeRevealEmail(email)
  if (emailNorm) {
    // Keep the #424 once-per-email reveal record for cross-client dedup bookkeeping.
    await db.rpc('record_reveal_or_refund', { p_client_id: clientId, p_email_norm: emailNorm, p_lead_id: claim.id }).then(() => {}, () => {})
  }
  // THIS ROW IS LOAD-BEARING — it is not just bookkeeping.
  //
  // `chargeFigsyEnroll` asks "has this lead already been paid for?" by looking for exactly
  // this row. If the insert fails and we swallow it, the $4 has left the wallet and nothing
  // records it — so a later enrol path sees an unpaid lead and charges the client AGAIN.
  // It was swallowed with `.then(() => {}, () => {})`, which is why that could happen
  // silently. Now it alerts, because a missing ledger row is a double-charge waiting to be
  // triggered rather than a cosmetic gap.
  const { error: ledgerErr } = await db.from('credit_transactions').insert({
    client_id: clientId, amount: -PRICE_PER_LEAD_USD, type: 'wallet_charge', plan: 'work_model',
    reference: `lead:${claim.id}`, note: 'Approved lead worked ($4)', created_at: now,
  })
  // 23505 is the UNIQUE index on credit_transactions.reference doing its job: a row for
  // `lead:<id>` already exists, so this lead is already recorded as paid. That is the dedup
  // working, not a failure — alerting on it would page the founder every time a retry landed.
  if (ledgerErr && ledgerErr.code !== '23505') {
    console.error('[approve] LEDGER ROW FAILED after charging $4 — double-charge risk', clientId, claim.id, ledgerErr.message)
    void sendFounderAlert('charge_failed', 'Charged $4 but the ledger row failed', [
      `Client ${clientId}, lead ${claim.id}. The money left the wallet; the record of it did not.`,
      `Reason: ${ledgerErr.message}`,
      'This lead now reads as UNPAID to the enrol guard, so it could be charged a second time. Check credit_transactions_type_check allows wallet_charge (migration 20260726_wallet_tx_types).',
    ]).catch(() => {})
  }

  // PARTNER COMMISSION (founder-locked 19 Aug) — *"she earns on leads purchased not when
  // they top up."* 25% of this $4, once per lead, for the lifetime of the account.
  //
  // PLACED HERE DELIBERATELY, AFTER THE LEDGER ROW. Everything that can undo the charge has
  // already returned above: a dead email refunds the $4 (step 6) and a failed email write
  // refunds it too (step 7), and both `return` before reaching this line. So arriving here
  // means the money moved and stayed moved.
  //
  // `moneyMoved` is false for a pack-covered approval, which is how *"nor the 100 leads we
  // give"* is honoured — the included 100 never charge, so they never commission.
  //
  // Fire-and-forget: a commission problem is ours, never the client's. It cannot fail, delay
  // or alter this approval; the founder is alerted instead.
  void recordLeadSaleCommission(clientId, claim.id, moneyMoved)

  // W5 — TRIAL sourcing drip: a real reveal unlocks +2 more sourced records (our PDL
  // budget), so a trial client learns the loop by playing it. The RPC caps lifetime
  // trial grants at 20 records, so this is self-limiting and a no-op once out of trial.
  void db.rpc('add_sourcing_allowance', { p_client_id: clientId, p_records: 2, p_trial: true })
    .then(() => {}, (e: unknown) => console.error('[approve] trial sourcing drip failed (non-fatal):', e))

  // 8. Start the outreach on the already-paid lead — charges nothing (prepaid).
  //
  // This was `.catch(() => {})`. A failed enrol produces the EXACT outcome the no-campaign
  // gate at step 3c fails closed to prevent — $4 taken, no enrolment row, nothing ever sent
  // — but silently, bypassing the guard that looks like the protection. The lead stays
  // approved (they asked for it and we have their email, so un-revealing it would lose the
  // contact they paid for), but the operator is told, because a paid lead that never entered
  // a sequence is a client waiting for outreach that will never arrive.
  const enrolled = await autoEnrollLead(leadId, clientId, { force: true, prepaid: true })
    .then(() => true)
    .catch((e: unknown) => {
      console.error('[approve] ENROL FAILED after charging — the lead will never be worked', clientId, leadId, e)
      void sendFounderAlert('sends_stalled', 'A paid lead was never enrolled — no outreach will run', [
        `Client ${clientId}, lead ${leadId}.`,
        moneyMoved ? 'They were charged $4.' : 'It came out of their included pack.',
        `Reason: ${e instanceof Error ? e.message : String(e)}`,
        'The lead is approved and revealed, but it is in no sequence — enrol it from Vida or nothing will ever be sent.',
      ]).catch(() => {})
      return false
    })
  if (!enrolled) console.warn('[approve] lead approved but not enrolled —', leadId)

  // 9. HAND THE LEAD TO INSTANTLY — our own outreach only (Client Zero, #593).
  //
  // ⏸ PARKED 30 Jul, AND DORMANT BY ITS OWN DESIGN — DO NOT "FIX" THIS.
  //
  // The founder amended #577 after walking Instantly's bundle: OUR OWN ENGINE sends our
  // outreach now (FIGSY + the #547/#548 send path + our unibox), and Instantly is only a
  // warmup utility. So nothing should be pushed here.
  //
  // No switch was added to park it, because the item already had one: `HOUSE_CLIENT_ID` is
  // UNSET, and unset means nothing is ever pushed. That was built as a fail-closed safety
  // property — guessing the house client wrong would email real people from the wrong
  // account — and it now doubles as the park. Setting that env var is what would wake this.
  //
  // Kept, not removed (CORE-MAP rule 3): if our own deliverability fails the #553 ladder,
  // reviving this is an afternoon — upgrade to HyperGrowth, set the var — not a rebuild.
  //
  // This is the wiring Prompt 4 shipped without: the client and the mapping existed, and
  // nothing called them. Placed after the enrol because the lead must be paid for, revealed
  // and in a sequence before anyone sends on its behalf.
  //
  // It CANNOT affect the approve. Every gate is re-checked inside — demo, kill-switch, house
  // client, key present — and the whole thing is wrapped, because this runs after the client
  // has already been charged and an exception here would surface as a failed approve on a
  // lead they have paid for.
  //
  // Silent on the four EXPECTED refusals (demo · kill-switch off · a client, who goes via
  // Smartlead · no key). Alerting on those would page the founder on every approval and train
  // them to ignore it. Only a real API failure or a missing sequence is news.
  if (enrolled) {
    try {
      const { pushApprovedLeadToInstantly, pushRefusalIsNews } = await import('./instantly-push')
      const push = await pushApprovedLeadToInstantly(leadId, clientId)
      if (!push.pushed && pushRefusalIsNews(push.reason)) {
        console.error('[approve] Instantly push failed', clientId, leadId, push.detail)
        void sendFounderAlert('sends_stalled', 'A paid lead was not handed to Instantly', [
          `Client ${clientId}, lead ${leadId}.`,
          `Reason: ${push.detail}`,
          'The lead is approved, revealed and enrolled — but it is not in the Instantly campaign, so nothing goes out from our own mailboxes for it.',
        ]).catch(() => {})
      }
    } catch (e) {
      // Never let this break an approve the client has already paid for.
      console.error('[approve] Instantly push threw (non-fatal)', clientId, leadId, e)
    }

    // ── PROMPT 7 — THE CLIENT'S HALF. Instantly is OURS, Smartlead is the CLIENTS' (#577).
    //
    // BOTH pushes are attempted, and that is safe by construction rather than by ordering:
    // `canPushToInstantly` refuses anything that is NOT the house client, and
    // `canPushToSmartlead` refuses anything that IS. Exactly one can ever accept a given
    // lead. Written as two independent attempts rather than an if/else on purpose — an
    // if/else would put the routing decision HERE, in the money path, where a future edit
    // could quietly send a client's lead from our mailboxes. The mutual exclusion lives in
    // the two gate functions, where it is unit-tested.
    //
    // Silent on the five EXPECTED refusals (demo · kill-switch off · the house account, which
    // goes via Instantly · no key · client has no Smartlead mailbox yet). Only a real API
    // failure or a missing sequence is news.
    try {
      const { pushApprovedLeadToSmartlead, smartleadRefusalIsNews } = await import('./smartlead-send')
      const push = await pushApprovedLeadToSmartlead(leadId, clientId)
      if (!push.pushed && smartleadRefusalIsNews(push.reason)) {
        console.error('[approve] Smartlead push failed', clientId, leadId, push.detail)
        void sendFounderAlert('sends_stalled', 'A paid lead was not handed to Smartlead', [
          `Client ${clientId}, lead ${leadId}.`,
          `Reason: ${push.detail}`,
          'The lead is approved, revealed and enrolled — but it is not in the client\'s Smartlead campaign, so nothing goes out from THEIR mailbox for it.',
        ]).catch(() => {})
      }
    } catch (e) {
      console.error('[approve] Smartlead push threw (non-fatal)', clientId, leadId, e)
    }
  }

  // `charged` reflects whether money actually moved — a pack approval is free, and Milla
  // says so on the card rather than claiming a $4 that never happened.
  return { status: 'approved', revealed: true, email, charged: moneyMoved }
}

// Pass = client says "not a fit". No charge, no reveal; mark the lead so it leaves the queue.
export async function passLead(leadId: string, clientId: string): Promise<{ status: 'passed' | 'not_found' }> {
  const { data } = await db.from('leads')
    .update({ status: 'passed', passed_at: new Date().toISOString() })
    .eq('id', leadId).eq('client_id', clientId).is('revealed_at', null)
    .select('id').maybeSingle()
  return { status: data ? 'passed' : 'not_found' }
}
