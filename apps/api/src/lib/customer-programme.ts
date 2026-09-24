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
    /**
     * ⚑ 10 Sep (C03) — THE CLIENT'S OWN WORDS, AND THE REASON THIS FIELD EXISTS.
     *
     * `target` is a commercial number that does not exist until a programme is created, so
     * a screen showing the outcome from `target` alone is structurally empty during Proof —
     * which is exactly what a client saw after telling Milla "book qualified meetings with
     * those founders and CEOs". This is client-level, available from the first minute, and
     * survives every ICP revision and every programme.
     */
    stated: string | null
  }
  progress: {
    /** People sourced for this programme — `sourced_used`, straight off the row. */
    delivered: number
    /**
     * ⚑ 23 Sep (R136 ③ · MVP1 Stage 5) — WHETHER SOURCING IS AUTHORISED, NEVER HOW MUCH.
     *
     * 🛑 ⛓️ WAS `authorised: number` = `sourcing_ceiling`, rendered to the client as "People
     * sourced of 4,000 authorised" on three screens and handed to Milla's prompt as "X of Y
     * people authorised". Since R136 the ceiling IS meetings × 400 — the internal limit the
     * founder locked as never disclosed: *"i said 400 internally. we dont disclose this."* One
     * division by the meeting target on the same screen recovered it. The number is no longer
     * on the client wire at all, so no screen, prompt or future component can leak it.
     */
    sourcingAuthorised: boolean
    /** Booked meetings — from public.meetings, the sole meeting truth. null = unreadable. */
    outcomesAchieved: number | null
  }
  /**
   * ⚑ 16 Sep (MVP1 · D2) — IS THIS PROGRAMME ARMED, OR IS IT ACTUALLY RUNNING?
   *
   * 🛑 THE TWO FACTS THAT WERE MISSING, AND THE SENTENCE THAT WENT WRONG WITHOUT THEM. The
   * workspace answered the `Live` stage with *"Running — nothing needed from you"*, and `Live`
   * is simply `status === 'LIVE'` — which MAKE LIVE alone produces. Make Live arms a
   * programme and sends nothing, so a client whose programme was armed and silent was told it
   * was running. The screen could not have known better: neither of these facts reached it,
   * so the status was asked a question it cannot answer.
   *
   * ⚠️ `emailsDelivered` IS REAL SENT ROWS, scoped through THIS programme's campaign — never
   * a status, never a flag, never a queue depth. Under Co-Pilot a programme can hold a full
   * queue awaiting per-email approval and have delivered nothing, and that is not running.
   *
   * ⚠️ `null` MEANS THE COUNT WAS UNREADABLE, and `programmeIsRunning` treats it as NOT
   * running. Claiming delivery we cannot see is the one direction this must never take.
   */
  sending: {
    /** `programmes.run_at` — external delivery authority. Null means armed, not started. */
    runAt: string | null
    emailsDelivered: number | null
  }
  /**
   * ⚑ 10 Sep (B/C) — WHAT THE CLIENT CHOSE, so the Recommendation screen can show the exact
   * thing being accepted. `recommendedVolume` is the lead volume from their own calculator
   * run; before this the client could not see it at all.
   */
  recommendation: {
    recommendedVolume: number | null
    costPerMeetingCents: number | null
    acceptedAt: string | null
    assumptions: { leadsPerMeeting: number; averageClientValue: number; meetingToClientPct: number } | null
  }
  money: {
    totalCents: number
    /**
     * ⚑ 9 Sep — THE TWO HALVES, SO MILLA NEVER DIVIDES A PRICE. Both are stored on the row,
     * priced once from the shared curve at creation. A screen computing `total / 2` is the
     * two-places-one-number defect with a client-visible amount attached, and it would be
     * wrong the day the curve stops splitting evenly.
     */
    firstPaymentCents: number
    secondPaymentCents: number
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
  /**
   * ⚑ 10 Sep (I5) — THE PROGRAMME IS OVER, AND WHICH WAY IT ENDED.
   *
   * ── 🛑 WHY THIS FIELD EXISTS ──────────────────────────────────────────────────────────
   *
   * `millaStage` maps COMPLETED and CANCELLED to the SAME stage, `Completion` — right as a
   * position in the journey (the programme is finished either way) and useless as a fact.
   * `ProgrammeWorkspace` renders `Completion` as the heading **"Programme complete"**, which
   * on a cancelled programme is a false statement to the client about their own account.
   *
   * Founder, 10 Sep: *"Do not casually treat CANCELLED as successful Completion; represent it
   * truthfully using existing cancellation semantics."* So the stage is unchanged — adding a
   * `Cancelled` stage would be a redesign of a founder-locked seven-stage list — and the
   * screen is given the fact instead.
   *
   * ⚠️ NO TIMESTAMP, DELIBERATELY. `programmes` has no `completed_at` or `cancelled_at`
   * column. A nullable `at` that is always null is a field that looks like data and is not,
   * and inventing a column on the evening of a launch to carry a date nothing displays would
   * be scope nobody asked for.
   *
   * `null` for every live programme.
   */
  terminal: 'completed' | 'cancelled' | null
  /**
   * ⚑ 23 Sep (MVP1 Stage 6 · R136 ④ ⑤) — HOW THE PROGRAMME WAS SETTLED, once it has been.
   *
   * Founder: *"they pay for what they recieve"* and *"we dont give money back. we refund credits
   * to their wallet internally to use towards another icp run."* So a finished client is told
   * the meetings delivered against their target, and the wallet credit for any shortfall —
   * the figure `settleProgrammeShortfall` actually credited, never recomputed here.
   *
   * ⛓️ REPLACES the 16 Sep (E2) "N qualified prospects unused — stays on your account and never
   * expires", which was derived from the sourcing ceiling (R136 ③) and described value in
   * prospects rather than the credit R136 ④ owes. `null` = not settled yet.
   */
  settlement?: { deliveredMeetings: number | null; creditCents: number } | null
}

/** No programme row is a REAL answer, not a failure: this client is at Proof. */
export const NO_PROGRAMME: CustomerProgramme = {
  stage: 'Proof',
  quickAction: STAGE_QUICK_ACTION.Proof,
  hasProgramme: false,
  programmeId: null,
  paused: false, pausedCopy: null, reviewOpen: false,
  // ⚑ 10 Sep (I5) — a client with no programme has not finished one either.
  terminal: null,
  outcome: { kind: 'meetings', target: null, stated: null },
  // ⚑ 16 Sep (D2) — no programme, so no authority and nothing delivered. Stated, not omitted.
  sending: { runAt: null, emailsDelivered: 0 },
  progress: { delivered: 0, sourcingAuthorised: false, outcomesAchieved: 0 },
  recommendation: { recommendedVolume: null, costPerMeetingCents: null, acceptedAt: null, assumptions: null },
  money: {
    totalCents: 0, firstPaymentCents: 0, secondPaymentCents: 0, firstPaidAt: null, secondPaidAt: null,
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
/**
 * The client's own words for what they want, or null.
 *
 * ⚠️ FAILS SOFT TO NULL. An unreadable answer must read as "not stated" rather than throwing:
 * the outcome is one card on a screen full of other truth, and the caller has a correct
 * rendering for its absence (Milla asks for it).
 */
async function readStatedOutcomeFor(clientId: string): Promise<string | null> {
  try {
    const { data, error } = await db.from('clients')
      .select('outcome_stated').eq('id', clientId).maybeSingle()
    if (error || !data) return null
    const v = (data as unknown as { outcome_stated?: string | null }).outcome_stated
    return typeof v === 'string' && v.trim() ? v.trim() : null
  } catch { return null }
}

/**
 * ⚑ 10 Sep (A) — has this client finished Proof? `clients.proof_completed_at`.
 *
 * ⚠️ IT DECIDES A STAGE, SO IT FAILS SOFT TO `false`. An unreadable answer keeps the client at
 * Proof, which is the state they were already in; promoting them to the calculator on a failed
 * read would be inventing a decision they may not have made.
 */
async function proofCompleteFor(clientId: string): Promise<boolean> {
  try {
    const { data, error } = await db.from('clients')
      .select('proof_completed_at').eq('id', clientId).maybeSingle()
    if (error || !data) return false
    return !!(data as unknown as { proof_completed_at?: string | null }).proof_completed_at
  } catch { return false }
}

export async function readCustomerProgramme(clientId: string): Promise<CustomerProgramme | null> {
  const { data, error } = await db.from('programmes')
    // ── 🛑 10 Sep — THE TWO PAYMENT AMOUNTS AND THE VOLUME WERE READ BUT NEVER SELECTED ──
    //
    // ⛓️ THE `$0` DEFECT, AND IT WAS ON A MONEY SCREEN. `money.firstPaymentCents` and
    // `secondPaymentCents` are built a few lines below from `p.first_payment_cents` /
    // `p.second_payment_cents` — columns this select did not ask for. They came back
    // `undefined`, `Number(undefined ?? 0)` gave 0, and `ProgrammePayment.tsx` rendered
    // `programmeMoney(halfCents)` as the HERO FIGURE: a client was shown **$0** above "Start
    // your programme". The Stripe charge was always correct (derived from `meeting_target`),
    // so nothing was mischarged — the client was simply told the wrong price.
    //
    // ⚠️ `recommended_volume` JOINS THEM for the recommendation screen: the client chose a
    // lead volume in the calculator and could not see it on the programme they were accepting.
    .select('id, status, meeting_target, recommended_volume, price_total_cents, ' +
            'price_per_meeting_cents, first_payment_cents, second_payment_cents, ' +
            'calculator_assumptions, recommendation_accepted_at, ' +
            'sourcing_ceiling, sourced_used, ' +
            'first_paid_at, second_paid_at, first_authorised_at, second_authorised_at, ' +
            // ⚑ 16 Sep (MVP1 · D2) — `run_at` IS THE AUTHORITY, and it was never selected. Without it the
            // client's screen could not tell an armed programme from a started one.
            'approved_at, went_live_at, run_at, paused_at, ' +
            'review_required_at, review_resolved_at, created_at, ' +
            // ⚑ 23 Sep (MVP1 Stage 6) — the R136 ④ settlement, shown on a finished programme.
            'shortfall_credited_at, shortfall_credit_cents, delivered_meetings')
    .eq('client_id', clientId)
    // ── 🛑 ⚑ 10 Sep (I5) — THE TERMINAL FILTER IS GONE, AND THE ORDER IS NEW ─────────────
    //
    // ⛓️ WHAT `.not('status','in','(COMPLETED,CANCELLED)')` DID. It made a finished client
    // INVISIBLE TO THEMSELVES. Their programme completed, this read returned nothing, and the
    // handler below fell through to `NO_PROGRAMME` — so Milla put a client who had just
    // finished a programme back on the PROOF screen: "Tell Milla the outcome you want". The
    // whole record of what we delivered for them vanished from their own workspace.
    //
    // Founder, 10 Sep: "COMPLETED must remain visible in Milla."
    //
    // ⚠️ AND THE ORDER MATTERED ALL ALONG. There was no `.order(...)` at all, so `.limit(1)`
    // took whichever row the database happened to return first — a client with two programmes
    // could see either one. Newest first, and the pick below prefers a LIVE programme over a
    // finished one, which mirrors `currentProgramme` in the operator's own lifecycle facts.
    .order('created_at', { ascending: false })
    .limit(50)

  // 🛑 supabase-js RETURNS `{ error }` RATHER THAN THROWING. A `data ?? []` shorthand here
  // would turn a database failure into "no programme" silently — the recurring defect shape
  // in this codebase, and the one that matters most on this particular row.
  if (error) {
    console.error('[customer-programme] read failed for client', clientId, error.message)
    return null
  }

  // ⚠️ THE OPEN PROGRAMME WINS. A client who finished one programme and started another is
  // working on the new one; the finished one is history and is reached from the report, not
  // from the workspace heading. Only when EVERY programme is over does the newest finished one
  // become what the workspace shows.
  const all = (data ?? []) as unknown as Record<string, unknown>[]
  const TERMINAL = ['COMPLETED', 'CANCELLED']
  const open = all.find(r => !TERMINAL.includes(String(r.status))) ?? null

  // ── 🛑 ⚑ 16 Sep (MVP1 · A4) — A TERMINAL ROW MAY OWN THE WORKSPACE ONLY IF THE CLIENT
  //    ACTUALLY FINISHED A JOURNEY ─────────────────────────────────────────────────────────
  //
  // 🛑 WHAT `?? all[0]` DID ON ITS OWN. It fell back to ANY historical row, so a client whose
  // only programme is COMPLETED or CANCELLED read as `hasProgramme: true` — and Milla rendered
  // the ProgrammeWorkspace over a client who is mid-PROOF. The A3 defect makes that ordinary
  // rather than exotic: until today an operator could create a programme for a client who had
  // never seen a Proof set, and cancelling it left exactly this row behind.
  //
  // ⚠️ THE 10-SEP RULE IS PRESERVED EXACTLY, NOT TRADED AWAY. Founder, 10 Sep: *"COMPLETED
  // must remain visible in Milla"* — a finished client must never be put back on the Proof
  // screen. That client NECESSARILY completed Proof (it is how they reached a calculator at
  // all), so `proofCompleted` is true for them and the terminal row still wins.
  //
  // ⚠️ AND IT IS PANEL SELECTION ONLY. Nothing is deleted, nothing is filtered from the
  // query, the row is still read and still reportable, and an OPEN programme is untouched in
  // every case. The only thing that changes is which row is CURRENT.
  //
  // ⚠️ `proofCompleteFor` FAILS SOFT TO `false`, which here means "show them Proof". That is
  // the safe direction: a client wrongly shown Proof sees the stage they were in, whereas a
  // mid-Proof client wrongly shown a dead programme has no way back.
  const terminalMayOwnWorkspace = open ? true : await proofCompleteFor(clientId)
  const data0 = open ?? (terminalMayOwnWorkspace ? (all[0] ?? null) : null)

  if (!data0) {
    // ── 🛑 ⚑ 10 Sep (C03) — THIS IS THE PROOF SCREEN, AND IT IS WHERE THE DEFECT SHOWED ──
    //
    // No programme yet, which is every client during Proof. `NO_PROGRAMME` is a constant, so
    // it carried `stated: null` for everybody — and the OUTCOME card, fed by the programme
    // alone, was structurally empty at exactly the moment the client most wanted to see that
    // we had heard them. Their sentence exists from onboarding, so it is read here too.
    // ⚑ 10 Sep (A) — AND WHETHER PROOF IS FINISHED, which decides whether this screen is
    // still Proof or already the calculator. Both facts are client-level and read together.
    // ⛓️ 24 Sep (R152) — AND WHETHER THIS IS THE HOUSE. It was only resolved once a programme
    // row existed, so on the first Programme screen — no row yet — House was shown "Pay P1" and
    // its first Accept opened a live Stripe page (the founder's walk, 24 Sep). Resolved here
    // too, failing to `false` exactly as the programme path does.
    const [stated, proofComplete, internalBilling] = await Promise.all([
      readStatedOutcomeFor(clientId), proofCompleteFor(clientId),
      internalBillingFor(clientId),
    ])
    return {
      ...NO_PROGRAMME,
      stage: millaStage({ status: null, proofComplete }),
      outcome: { ...NO_PROGRAMME.outcome, stated },
      money: { ...NO_PROGRAMME.money, internalBilling },
    }
  }

  const p = data0
  // ── ⚑ 10 Sep (C03) — THE CLIENT'S STATED OUTCOME, READ FROM THE CLIENT ─────────────────
  //
  // ⚠️ A SEPARATE READ, AND IT MUST NOT FAIL THE PROGRAMME. The outcome lives on `clients`
  // because it predates and outlives every programme; if that read errors the programme is
  // still returned with `stated: null`, which reads correctly as "we do not have it" rather
  // than blanking a screen that has plenty else to say.
  const stated = await readStatedOutcomeFor(clientId)
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
  const internalBilling = await internalBillingFor(clientId)

  let outcomesAchieved: number | null = null
  try {
    const { meetingCounts } = await import('./meeting-truth')
    const counts = await meetingCounts({ clientId, programmeId: p.id as string })
    outcomesAchieved = counts === null ? null : counts.booked
  } catch (err) {
    console.error('[customer-programme] meeting counts unreadable for', clientId, err)
  }

  // ── ⚑ 16 Sep (MVP1 · D2) — REAL DELIVERIES FOR THIS PROGRAMME, AND ONLY THIS ONE ──────
  //
  // 🛑 SCOPED THROUGH THE PROGRAMME'S OWN CAMPAIGN, never through `client_id`. A client-wide
  // send count rendered beside a programme reads as that programme's result — the exact House
  // defect `current-workspace.ts` exists to stop, and this is a number a client reads.
  //
  // ⚠️ `null` ON AN UNREADABLE COUNT, and `programmeIsRunning` reads that as NOT running. A
  // zero would assert "nothing has been sent", which is a different claim from "we could not
  // count", and the difference is what the client is told about their own programme.
  //
  // 🛑 ⚑ 16 Sep — CORRECTED BEFORE IT SHIPPED, AND THE GUARD THAT CAUGHT IT IS THE POINT.
  // My first cut read ~~`figsy_campaigns.programme_id`~~ — A COLUMN NO MIGRATION CREATES.
  // `schema-truth.test.ts` named it exactly: supabase-js returns `{ error }` rather than
  // throwing, so a rejected query renders identically to an empty one. The count would have
  // come back 0 for every programme on earth, Milla would have said "Ready to start" for ever,
  // and nothing would have broken loudly enough to notice. The programme→campaign link is
  // `resolveProgrammeChain`, which is how every other reader in this repo asks.
  let emailsDelivered: number | null = null
  try {
    const { resolveProgrammeChain } = await import('./programme-chain')
    const chain = await resolveProgrammeChain(String(p.id))
    if (!chain.ok) throw new Error(chain.degraded)
    const campaignId = chain.chain.campaignId
    if (!campaignId) {
      // No campaign for this programme means nothing can have been sent for it. That is a
      // measured zero, not an unreadable one.
      emailsDelivered = 0
    } else {
      const { count, error: sentErr } = await db.from('figsy_sent_emails')
        .select('id', { count: 'exact', head: true })
        .eq('campaign_id', campaignId)
      if (sentErr) throw new Error(sentErr.message)
      emailsDelivered = count ?? 0
    }
  } catch (err) {
    console.error('[customer-programme] programme-scoped send count unreadable for', clientId, err)
  }

  return {
    stage,
    quickAction: STAGE_QUICK_ACTION[stage],
    hasProgramme: true,
    sending: {
      runAt: (p.run_at as string | null) ?? null,
      emailsDelivered,
    },
    programmeId: (p.id as string | null) ?? null,
    paused: Boolean(p.paused_at),
    pausedCopy: p.paused_at ? MILLA_FAILURE_COPY.sourcingPaused : null,
    reviewOpen,
    // Option C: only a meetings programme exists in the engine today. A non-meeting outcome
    // is captured in conversation and routed to a human — it never reaches this row, so a
    // row that exists is always a meetings programme. Stated as data rather than assumed.
    // ⚠️ `kind` STILL COMES FROM THE ENGINE'S CAPABILITY, not from the client's sentence:
    // only a meetings programme exists today, so a programme that exists is a meetings
    // programme. `stated` is the client's own words and is orthogonal to both.
    outcome: { kind: 'meetings', target: Number(p.meeting_target ?? 0) || null, stated },
    progress: {
      delivered: Number(p.sourced_used ?? 0),
      // ⚑ 23 Sep (R136 ③) — a yes/no, never the ceiling. See the type.
      sourcingAuthorised: Number(p.sourcing_ceiling ?? 0) > 0,
      outcomesAchieved,
    },
    recommendation: {
      recommendedVolume: p.recommended_volume == null ? null : Number(p.recommended_volume),
      costPerMeetingCents: p.price_per_meeting_cents == null ? null : Number(p.price_per_meeting_cents),
      acceptedAt: (p.recommendation_accepted_at as string | null) ?? null,
      // ⚠️ PASSED THROUGH, NOT RE-DERIVED. These are the client's own figures as they stood
      // when they accepted; recomputing them from anything would be inventing their answer.
      assumptions: (p.calculator_assumptions as CustomerProgramme['recommendation']['assumptions']) ?? null,
    },
    money: {
      totalCents: Number(p.price_total_cents ?? 0),
      firstPaymentCents: Number(p.first_payment_cents ?? 0),
      secondPaymentCents: Number(p.second_payment_cents ?? 0),
      firstPaidAt: (p.first_paid_at as string | null) ?? null,
      secondPaidAt: (p.second_paid_at as string | null) ?? null,
      firstAuthorisedAt: (p.first_authorised_at as string | null) ?? null,
      secondAuthorisedAt: (p.second_authorised_at as string | null) ?? null,
      internalBilling,
    },
    approvedAt: (p.approved_at as string | null) ?? null,
    wentLiveAt: (p.went_live_at as string | null) ?? null,
    // ── ⚑ 10 Sep (I5) — WHICH WAY IT ENDED, STATED RATHER THAN INFERRED FROM THE STAGE ──
    //
    // 🛑 `stage` CANNOT ANSWER THIS. COMPLETED and CANCELLED are both `Completion`, and the
    // workspace renders that heading as "Programme complete" — a false statement to a client
    // about their own cancelled programme. Founder, 10 Sep: "Do not casually treat CANCELLED
    // as successful Completion."
    terminal: p.status === 'COMPLETED' ? 'completed'
      : p.status === 'CANCELLED' ? 'cancelled'
        : null,
    // ⚑ 23 Sep (MVP1 Stage 6) — see the type. The credited figure, straight off the row.
    settlement: p.shortfall_credited_at
      ? { deliveredMeetings: p.delivered_meetings == null ? null : Number(p.delivered_meetings),
          creditCents: Number(p.shortfall_credit_cents ?? 0) }
      : null,
  }
}

/**
 * ⚑ 24 Sep (R152) — IS THIS THE HOUSE, FOR MONEY WORDING ONLY. One helper for both paths (no
 * programme yet, and a programme row), so House is recognised on the first Programme screen as
 * well as after it. ⚠️ Money only: it never decides a stage or a terminal state. Fails to
 * `false` — a wrong `true` would tell a paying client they owe nothing; a wrong `false` shows
 * House the ordinary wording.
 */
async function internalBillingFor(clientId: string): Promise<boolean> {
  try {
    const { isHouseClient } = await import('./house-client')
    return await isHouseClient(clientId)
  } catch (err) {
    console.error('[customer-programme] house check failed for', clientId, err)
    return false
  }
}
