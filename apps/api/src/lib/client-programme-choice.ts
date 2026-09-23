// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CLIENT CHOOSES THEIR PROGRAMME — the healthy path, from Milla.
//
// ── WHAT THIS REPLACES ──────────────────────────────────────────────────────────────────
//
// The only `programmes` INSERT in the product was `createProgramme(clientId, meetings)`,
// reachable only through `POST /programmes` behind the admin key, fed by an OPERATOR typing a
// number into a Vida text box captioned "Meeting target" — which rendered whenever the client
// had no programme, i.e. while they were still at Proof. Then a second operator press
// (`/recommend`) moved DRAFT → RECOMMENDED, and only then did Milla show the client anything.
//
// So in the flow the founder locked — *"client chooses the target booked meetings"* — the
// client chose nothing, and Vida chose it for them before they had finished Proof.
//
// ⚠️ THE ADMIN ROUTE IS NOT REMOVED. It stays as a recovery door. What changes is that the
// HEALTHY path no longer needs it, and Vida no longer offers programme creation to a client
// who is still in Proof.
//
// ── 🛑 WHAT THIS FUNCTION MAY NOT DO ────────────────────────────────────────────────────
//
//   · It derives NO money. Every figure comes from `calculateProgramme`, which comes from
//     `quoteProgramme`. A second copy of the curve is the R68 defect with a client's price
//     attached.
//   · It takes NO payment and creates no checkout. Choosing is free; P1 is the next step and
//     the client presses it separately.
//   · It sources NOTHING. No provider, no run, no ceiling spent — `sourcing_ceiling` stays 0
//     until P1 authorises it, exactly as before.
//   · It cannot reach another client's ICP, and it cannot re-price a programme the client has
//     already accepted or paid for.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  calculateProgramme, programmeMatchesQuote, ProgrammePricingError,
  type CalculatorInputs, type CalculatorResult,
} from '@kind/shared'
import { createProgramme, openProgrammeForClient, type ProgrammeRow } from './programme'

/** Named so a refusal can point at the outstanding migration rather than a generic error. */
export const CALCULATOR_MIGRATION = '20260910_programme_calculator_choice'

/**
 * The statuses a client may still re-choose from.
 *
 * 🛑 DELIBERATELY SHORT. Once P1 is authorised the programme is being sourced against the
 * volume that price bought, so re-pricing it from a browser would change what was paid for
 * mid-flight. A client who wants a different size after that talks to a person.
 */
const RECHOOSABLE = ['DRAFT', 'RECOMMENDED', 'AWAITING_FIRST_PAYMENT'] as const

export type ChoiceOutcome =
  | { ok: true; programme: ProgrammeRow; result: CalculatorResult; created: boolean }
  | { ok: false; reason: 'proof_incomplete' | 'invalid_target' | 'locked' | 'no_icp' | 'storage' | 'migration_required' | 'over_capacity'; detail: string; committed?: number }

/**
 * Has this client finished Proof? Choosing a programme before that is out of order.
 *
 * ⚠️ FAILS CLOSED. An unreadable answer refuses rather than letting a client past Proof on a
 * database hiccup — the calculator is not reachable from anywhere else, so the cost of being
 * wrong here is one retry, and the cost of being wrong the other way is a programme created
 * for a client who never accepted their examples.
 */
async function proofIsComplete(clientId: string): Promise<boolean> {
  const { data, error } = await db.from('clients')
    .select('proof_completed_at').eq('id', clientId).maybeSingle()
  if (error || !data) return false
  return !!(data as unknown as { proof_completed_at?: string | null }).proof_completed_at
}

/**
 * The ICP this programme will source from: the client's live one, else their newest.
 *
 * 🛑 THE SAME ROW `/icps/revise` CALLS THE CORE — deliberately, so the targeting the client
 * refined during Proof is the targeting the programme runs on. Attaching a different ICP here
 * would source against a profile the client never calibrated.
 */
async function acceptedIcpFor(clientId: string): Promise<{ id: string; name: string | null } | null> {
  const cols = 'id, name, is_active, created_at'
  const { data: live } = await db.from('icps')
    .select(cols).eq('client_id', clientId).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if ((live as { id?: string } | null)?.id) return live as unknown as { id: string; name: string | null }
  const { data } = await db.from('icps')
    .select(cols).eq('client_id', clientId)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return (data as unknown as { id: string; name: string | null } | null) ?? null
}

/**
 * Create or re-choose this client's programme from their calculator inputs.
 *
 * ⚠️ IDEMPOTENT BY SHAPE, NOT BY NONCE. Choosing the same target twice updates the same open
 * programme rather than creating a second one — `openProgrammeForClient` finds it, and the
 * database's one-open-programme index is the backstop underneath. A double-tap or a retried
 * request therefore cannot leave a client with two programmes or two prices.
 */
export async function chooseProgramme(
  clientId: string, inputs: CalculatorInputs,
): Promise<ChoiceOutcome> {
  if (!(await proofIsComplete(clientId))) {
    return {
      ok: false, reason: 'proof_incomplete',
      detail: 'Your examples need to be confirmed before we shape the programme. Tell Milla the set is right first.',
    }
  }

  let result: CalculatorResult
  try {
    result = calculateProgramme(inputs)
  } catch (e) {
    if (e instanceof ProgrammePricingError) {
      return { ok: false, reason: 'invalid_target', detail: e.message }
    }
    throw e
  }

  // 🛑 THE ICP IS RESOLVED BEFORE ANYTHING IS WRITTEN. A programme with no targeting cannot
  // source, and the P1 continuation refuses without exactly one attached ICP — so creating one
  // here and discovering that later would strand a client who had already paid.
  const icp = await acceptedIcpFor(clientId)
  if (!icp) {
    return {
      ok: false, reason: 'no_icp',
      detail: 'We could not find the targeting your examples came from, so nothing was created. Talk to Milla and we will sort it out.',
    }
  }

  // ── 🛑 ⚑ 23 Sep (MVP1 stage 3) — THE CAP IS ENFORCED HERE, NOT ONLY ON THE SLIDER ───────
  //
  // 🛑 WHAT WAS WRONG. R136 PR B bound the meetings slider to committed capacity — in the
  // browser. This function took `inputs.meetings` and priced it without ever asking whether the
  // pool could carry it, so a direct POST bought a hundred meetings against a pool of three. The
  // stage-flow document names it: *"Today a client can buy a hundred meetings against a
  // four-thousand-person market and the calculator will price it."*
  //
  // 🛑 FOUNDER-LOCKED 22 Sep: *"we would not offer 10 meetings when we can only deliver 6"* —
  // and 23 Sep: *"if we can only produce 10 but they want more. they need to widen their own
  // ICP."* So a target above capacity is REFUSED with the widen sentence, and a pool too small
  // for a single meeting refuses every target.
  //
  // ⚠️ AN UNKNOWN POOL REFUSES NOTHING, THE SAME RULE THE SLIDER FOLLOWS. An unreachable
  // provider is not the client's market being empty, and capping a paying client at zero
  // because a vendor was slow is the worse of the two failures. It is PINNED as unknown (a
  // moment with no number) so an operator can later tell "chosen blind" from "chosen before
  // this check existed".
  //
  // ⚠️ AND IT IS ONE PROVIDER CALL PER PRESS, not per keystroke — this runs when the client
  // commits to a number, never while they move the slider.
  let pin: { committed_capacity: number | null; capacity_pinned_at: string }
  {
    let known = false
    let committed = 0
    try {
      const { activeIcpFor, clientCapacityFor } = await import('./client-capacity')
      // ⚠️ `activeIcpFor` applies EXACTLY the resolution `acceptedIcpFor` above does (live,
      // else newest) and returns the full row the provider preview needs. Checking capacity
      // against a different ICP than the programme is about to attach would cap the client
      // against a pool their programme never touches.
      const full = await activeIcpFor(clientId)
      if (full && full.id === icp.id) {
        const cap = await clientCapacityFor(clientId, full)
        known = cap.known
        committed = cap.committed
      }
    } catch (e) {
      console.error(`[choose] capacity unreadable for client ${clientId} — not capping`, e)
      known = false
    }
    if (known && result.meetings > committed) {
      const { WIDEN_TO_GO_FURTHER } = await import('@kind/shared')
      return {
        ok: false, reason: 'over_capacity', committed,
        detail: committed <= 0
          ? `Your current targeting does not reach enough people for a programme yet. ${WIDEN_TO_GO_FURTHER}`
          : `Your current targeting carries up to ${committed} booked meeting${committed === 1 ? '' : 's'}. ${WIDEN_TO_GO_FURTHER}`,
      }
    }
    pin = { committed_capacity: known ? committed : null, capacity_pinned_at: new Date().toISOString() }
  }

  const existing = await openProgrammeForClient(clientId)
  let programme: ProgrammeRow

  if (existing) {
    if (!(RECHOOSABLE as readonly string[]).includes(existing.status)) {
      return {
        ok: false, reason: 'locked',
        detail: `Your programme is already under way (${existing.status.toLowerCase().replace(/_/g, ' ')}), so its size cannot be changed from here. Talk to Milla and a person will help.`,
      }
    }
    // ⚠️ RE-PRICED FROM THE CURVE, NOT PATCHED. Every committed figure is rewritten together
    // so a re-choice cannot leave a row holding one target and another target's price.
    const { data, error } = await db.from('programmes').update({
      meeting_target: result.meetings,
      recommended_volume: result.recommendedVolume,
      price_per_meeting_cents: result.quote.pricePerMeetingCents,
      price_total_cents: result.totalCents,
      first_payment_cents: result.firstPaymentCents,
      second_payment_cents: result.secondPaymentCents,
      calculator_assumptions: result.assumptions,
      ...pin,
      status: 'RECOMMENDED',
      updated_at: new Date().toISOString(),
    }).eq('id', existing.id).select().single()
    if (error) return storageRefusal(error.message)
    programme = data as ProgrammeRow
  } else {
    const created = await createProgramme(clientId, result.meetings)
    if (!created.ok || !created.programme) {
      return { ok: false, reason: 'storage', detail: created.reason ?? 'The programme could not be created. Nothing was changed.' }
    }
    // The volume and the assumptions are the client's; `createProgramme` prices from the
    // canonical target and knows nothing about either.
    const { data, error } = await db.from('programmes').update({
      recommended_volume: result.recommendedVolume,
      calculator_assumptions: result.assumptions,
      ...pin,
      status: 'RECOMMENDED',
      updated_at: new Date().toISOString(),
    }).eq('id', created.programme.id).select().single()
    if (error) return storageRefusal(error.message)
    programme = data as ProgrammeRow
  }

  // ── 🛑 THE ICP IS ATTACHED AUTOMATICALLY. NO OPERATOR BUTTON ON THE HEALTHY PATH ──────
  //
  // `icps.programme_id` had exactly one writer — `POST /programmes/:id/attach-icp`, admin-key
  // only, pressed from Vida. The P1 continuation refuses without exactly one attached ICP, so
  // a client could pay and then sit at "Working" for ever waiting for a press nobody knew was
  // needed. Best-effort here and re-proved at P1: an attach failure must not lose the
  // programme the client just chose.
  try {
    const { attachIcpToProgramme } = await import('./programme-icp')
    const att = await attachIcpToProgramme(programme.id, icp.id)
    if (!att.ok) console.error(`[choose] ICP ${icp.id} not attached to programme ${programme.id} — ${att.reason}`)
  } catch (e) {
    console.error(`[choose] ICP attach threw for programme ${programme.id}`, e)
  }

  // 🛑 THE ROW MUST MATCH WHAT THE CLIENT WAS SHOWN. "The client accepted a number" is a
  // commercial claim; if the stored programme and the quote ever disagree, the client agreed
  // to one price and owes another. Compared rather than assumed.
  if (!programmeMatchesQuote(programme as unknown as Record<string, unknown>, result)) {
    return {
      ok: false, reason: 'storage',
      detail: 'The programme we saved did not match the figures you were shown, so nothing has been accepted. Please try once more.',
    }
  }

  return { ok: true, programme, result, created: !existing }
}

function storageRefusal(message: string): ChoiceOutcome {
  const missing = /calculator_assumptions|recommendation_accepted_at/.test(message)
  return {
    ok: false,
    reason: missing ? 'migration_required' : 'storage',
    detail: missing
      ? `The programme could not be saved because migration ${CALCULATOR_MIGRATION} has not been run. Nothing was changed.`
      : `The programme could not be saved (${message}). Nothing was changed.`,
  }
}

/**
 * The client accepts the recommendation. A fact, and separate from paying.
 *
 * ⚠️ IT AUTHORISES NOTHING. No money moves, no sourcing starts, no status advances past
 * RECOMMENDED — P1 is still a separate press. What it records is that the client agreed to
 * this exact programme, which before this had no home at all: accepting WAS paying, so a
 * client who agreed and then hesitated at checkout left no trace of having agreed.
 * ⚠️ IDEMPOTENT — the first acceptance is the one recorded.
 */
export async function acceptRecommendation(clientId: string): Promise<
  | { ok: true; acceptedAt: string; alreadyAccepted: boolean; programme: ProgrammeRow }
  | { ok: false; reason: 'no_programme' | 'locked' | 'storage'; detail: string }
> {
  const p = await openProgrammeForClient(clientId)
  if (!p) return { ok: false, reason: 'no_programme', detail: 'There is no programme to accept yet.' }
  if (!(RECHOOSABLE as readonly string[]).includes(p.status)) {
    return { ok: false, reason: 'locked', detail: `This programme is already ${p.status.toLowerCase().replace(/_/g, ' ')}.` }
  }
  const existing = (p as unknown as { recommendation_accepted_at?: string | null }).recommendation_accepted_at
  if (existing) return { ok: true, acceptedAt: existing, alreadyAccepted: true, programme: p }

  const at = new Date().toISOString()
  const { data, error } = await db.from('programmes')
    .update({ recommendation_accepted_at: at, updated_at: at })
    .eq('id', p.id).is('recommendation_accepted_at', null).select()
  if (error) {
    const r = storageRefusal(error.message)
    return { ok: false, reason: r.ok ? 'storage' : (r.reason === 'migration_required' ? 'storage' : 'storage'), detail: r.ok ? '' : r.detail }
  }
  if (!data || data.length === 0) {
    const again = await openProgrammeForClient(clientId)
    const stamped = (again as unknown as { recommendation_accepted_at?: string | null } | null)?.recommendation_accepted_at
    return { ok: true, acceptedAt: stamped ?? at, alreadyAccepted: true, programme: again ?? p }
  }
  return { ok: true, acceptedAt: at, alreadyAccepted: false, programme: (data[0] as ProgrammeRow) }
}
