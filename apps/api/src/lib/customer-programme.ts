// ═══════════════════════════════════════════════════════════════════════════════════════
// THE CUSTOMER'S PROGRAMME — ONE READER, EVERY CUSTOMER-FACING DOOR.
//
// ⚑ 30 Aug (BUILD-004A-2). Lifted out of `routes/my-programme.ts` UNCHANGED, because Milla's
// chat now needs the same facts the workspace renders and a second reader would be a second
// truth. That is not hypothetical here: the whole shape of the 4A-1 live walk was two
// independent sources disagreeing on one screen — the header said "Paused" from a campaign
// row while the Stage card said "Proof — current" from the programme.
//
// So there is one function. The `/my/programme` route serves it to the browser; the chat
// system prompt describes it to the model. Neither can learn a fact the other does not have.
//
// ⚠️ READ-ONLY, AND SCOPED BY CLIENT ID THE CALLER ALREADY RESOLVED FROM A SESSION. This
// module never reads a request, so there is no tenancy decision to get wrong in it.
//
// ⚠️ `null` IS "UNKNOWN", NEVER "FINE". A failed read returns `null` and every caller must
// treat that as unreadable — never as "this client has no programme". A client who has paid
// being told their programme does not exist is a lie with their money in it.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import {
  millaStage, type MillaStage, STAGE_QUICK_ACTION, MILLA_FAILURE_COPY,
  type EngineProgrammeStatus,
} from '@kind/shared'

/**
 * What the customer's workspace needs to render one stage.
 *
 * ⚠️ EVERY FIELD IS A ROW THAT EXISTS OR A SUBTRACTION OF TWO. No projected completion date,
 * no confidence score, no "on track" — the same rule the operator read model follows, applied
 * where it matters more: a made-up number in front of a client is a promise.
 */
export type CustomerProgramme = {
  stage: MillaStage
  quickAction: string
  /**
   * 🛑 DOES A PROGRAMME ROW ACTUALLY EXIST? `stage` CANNOT ANSWER THIS, and that is the whole
   * reason this field had to be added.
   *
   * `millaStage` maps a DRAFT programme AND no programme at all to the same stage, 'Proof' —
   * correct as a customer-journey stage, and useless as a fact. Milla Home was branching on
   * `stage !== 'Proof'` to decide whether to render the programme workspace or the legacy
   * client-scoped desk, so House — which has no programme — fell into the legacy desk and its
   * ~166 retired leads rendered under a heading that said "Your programme". A DRAFT programme
   * would have done exactly the same.
   */
  hasProgramme: boolean
  /** The open programme's id when one exists — so a surface can positively attribute to it. */
  programmeId: string | null
  /** Orthogonal to stage — a paused programme keeps the stage it will return to. */
  paused: boolean
  /** LOCKED founder copy, sent from the server so the client cannot drift from it. */
  pausedCopy: string | null
  /** A review decision is waiting. Distinct from paused: live delivery continues. */
  reviewOpen: boolean
  outcome: {
    /** 'meetings' today; anything else was captured conversationally and routed to a human. */
    kind: 'meetings' | 'other'
    target: number | null
  }
  progress: {
    /** Delivered against what the programme authorised. Both straight off the row. */
    delivered: number
    authorised: number
    /** Booked meetings — from public.meetings, the sole meeting truth. null = unreadable. */
    outcomesAchieved: number | null
  }
  money: {
    totalCents: number
    firstPaidAt: string | null
    secondPaidAt: string | null
    /**
     * ⚑ 3 Sep — INTERNAL AUTHORITY IS NOT A PAYMENT, AND THE WORKSPACE HAD NO WAY TO SAY SO.
     *
     * House / Client Zero runs on internal P1/P2 authority and makes NO Stripe payment — the
     * founder's standing rule that House must never create a fake payment, invoice or revenue.
     * `money` carried only the two paid timestamps, so House rendered "First 50% not yet paid"
     * for the life of the programme: no fake payment language, and no truth either — it states
     * that money is outstanding when nothing is owed.
     *
     * These are the same two columns A2 added and the authority helpers already read. A
     * PAYING client's fields are untouched and their copy is unchanged.
     */
    firstAuthorisedAt: string | null
    secondAuthorisedAt: string | null
    /**
     * 🛑 THIS PROGRAMME IS SETTLED BY INTERNAL AUTHORITY, NOT BY MONEY.
     *
     * True only for the house account. Before internal P1 both authority stamps are null, so
     * without this the money card fell to its default and told House "First 50% not yet paid"
     * — a debt to itself that does not exist. Nothing on the programmes row can answer it:
     * paid-or-authorised is an operator act taken later, and a paying client's DRAFT row is
     * byte-identical to House's.
     *
     * Identity is the one this repo already settled (#593): the auth user behind
     * `HOUSE_ACCOUNT_EMAIL`, the same discriminator that keeps Client Zero out of every revenue
     * figure. Never a name, never `HOUSE_CLIENT_ID`, never an env flag.
     */
    internalBilling: boolean
  }
  approvedAt: string | null
  wentLiveAt: string | null
}

/** No programme row is a REAL answer, not a failure: this client is at Proof. */
export const NO_PROGRAMME: CustomerProgramme = {
  stage: 'Proof',
  quickAction: STAGE_QUICK_ACTION.Proof,
  hasProgramme: false,
  programmeId: null,
  paused: false, pausedCopy: null, reviewOpen: false,
  outcome: { kind: 'meetings', target: null },
  progress: { delivered: 0, authorised: 0, outcomesAchieved: 0 },
  money: {
    totalCents: 0, firstPaidAt: null, secondPaidAt: null,
    firstAuthorisedAt: null, secondAuthorisedAt: null, internalBilling: false,
  },
  approvedAt: null, wentLiveAt: null,
}

/**
 * Read this client's programme.
 *
 * @returns the programme, `NO_PROGRAMME` when they have not started one, or `null` when the
 *   read FAILED — which callers must render as the locked failure sentence, never as absence.
 */
export async function readCustomerProgramme(clientId: string): Promise<CustomerProgramme | null> {
  const { data, error } = await db.from('programmes')
    .select('id, status, meeting_target, price_total_cents, sourcing_ceiling, sourced_used, ' +
            'first_paid_at, second_paid_at, first_authorised_at, second_authorised_at, ' +
            'approved_at, went_live_at, paused_at, ' +
            'review_required_at, review_resolved_at')
    .eq('client_id', clientId)
    .not('status', 'in', '(COMPLETED,CANCELLED)')
    .limit(1).maybeSingle()

  // 🛑 supabase-js RETURNS `{ error }` RATHER THAN THROWING. A `data ?? []` shorthand here
  // would turn a database failure into "no programme" silently — the recurring defect shape
  // in this codebase, and the one that matters most on this particular row.
  if (error) {
    console.error('[customer-programme] read failed for client', clientId, error.message)
    return null
  }
  if (!data) return NO_PROGRAMME

  const p = data as unknown as Record<string, unknown>
  const reviewOpen = Boolean(p.review_required_at) && !p.review_resolved_at
  const stage = millaStage({ status: p.status as EngineProgrammeStatus, reviewOpen })

  // ⚠️ MEETINGS COME FROM `public.meetings` AND NOWHERE ELSE — the sole meeting truth
  // (BUILD-003 PR1). `null` means unreadable and is passed through as null: rendering a
  // storage failure as "0 meetings booked" would tell a client their programme has produced
  // nothing, which is the most damaging possible false statement on this screen.
  //
  // ⛓️ POSITIVELY ATTRIBUTED (3 Sep). This counted EVERY meeting the client has ever booked —
  // `clientMeetingCounts([clientId])`, no programme filter — so House's historical meetings
  // would have been reported as the new programme's progress the moment it was created. The
  // meetings table already carries `programme_id` and `meetingCounts` already accepts it; the
  // filter was simply never passed. History is preserved and still counted everywhere it
  // legitimately belongs (Reports, all-time totals) — it is just not this programme's result.
  // ⚠️ RESOLVED ONCE, ALONGSIDE THE MEETING COUNT. Fails open to `false` — a wrong `true`
  // would tell a PAYING client they owe us nothing, which is a false statement about their
  // money; a wrong `false` shows House the wording it has had all along.
  let internalBilling = false
  try {
    const { isHouseClient } = await import('./house-client')
    internalBilling = await isHouseClient(clientId)
  } catch (err) {
    console.error('[customer-programme] house check failed for', clientId, err)
  }

  let outcomesAchieved: number | null = null
  try {
    const { meetingCounts } = await import('./meeting-truth')
    const counts = await meetingCounts({ clientId, programmeId: p.id as string })
    outcomesAchieved = counts === null ? null : counts.booked
  } catch (err) {
    console.error('[customer-programme] meeting counts unreadable for', clientId, err)
  }

  return {
    stage,
    quickAction: STAGE_QUICK_ACTION[stage],
    hasProgramme: true,
    programmeId: (p.id as string | null) ?? null,
    paused: Boolean(p.paused_at),
    pausedCopy: p.paused_at ? MILLA_FAILURE_COPY.sourcingPaused : null,
    reviewOpen,
    // Option C: only a meetings programme exists in the engine today. A non-meeting outcome
    // is captured in conversation and routed to a human — it never reaches this row, so a
    // row that exists is always a meetings programme. Stated as data rather than assumed.
    outcome: { kind: 'meetings', target: Number(p.meeting_target ?? 0) || null },
    progress: {
      delivered: Number(p.sourced_used ?? 0),
      authorised: Number(p.sourcing_ceiling ?? 0),
      outcomesAchieved,
    },
    money: {
      totalCents: Number(p.price_total_cents ?? 0),
      firstPaidAt: (p.first_paid_at as string | null) ?? null,
      secondPaidAt: (p.second_paid_at as string | null) ?? null,
      firstAuthorisedAt: (p.first_authorised_at as string | null) ?? null,
      secondAuthorisedAt: (p.second_authorised_at as string | null) ?? null,
      internalBilling,
    },
    approvedAt: (p.approved_at as string | null) ?? null,
    wentLiveAt: (p.went_live_at as string | null) ?? null,
  }
}
