// PAYMENT STARTS THE WORK — the step-3 collapse from flow v2 (founder-locked 25 Jul).
//
// Before this, the chain had no automatic links: the client paid, and then an operator had to
// remember to type "source 20 leads" into a chat box. The ICP the client approved on day one
// sat there saying "never sourced". This is the link.
//
// The founder's rule, in order:
//   • Money gates the spend. Nothing sources until the $99 lands — sourcing costs us and
//     without a sender there is nothing to send from.
//   • Source 200 so they can approve 100. They pass on roughly half, and a client who can
//     only approve everyone we found has no choice at all.
//   • Every sourced person goes to the client, scored, with our top 20 marked. We don't
//     filter first — that adds work and delays the money.
//
// Buying the INBOX stays manual on purpose (founder-locked): it spends real money, so it
// surfaces as the operator's next action rather than happening behind their back.
//
// Safe to call twice: sourcing tops up to the target rather than adding a fresh batch, and
// surfacing only touches leads that aren't already with the client.

import { db } from '@kind/db'
import { sourceTarget, PAID_TX_TYPES } from './onboarding-pack'

/**
 * ONE ICP = ONE CAMPAIGN (flow v2). The campaign is the vehicle for an ICP, not a separate
 * thing you create and then assign people into — so it is born with the ICP and a lead's
 * campaign is decided by the ICP that found them. `figsy_campaigns.icp_id` has existed all
 * along and nothing read it.
 *
 * Idempotent: returns the existing campaign for that ICP if there is one.
 */
/**
 * ONE CLIENT → ONE ACTIVE CAMPAIGN, AND THE INVARIANT FAILS CLOSED
 * (founder-ruled 22 Aug; corrected same day, round 4).
 *
 * `figsy.ts` routes a lead to the campaign matching `leads.icp_id`, and falls back to
 * "whichever active campaign is newest" when there is no match. Both of those are
 * first-match-wins, which is fine with one active campaign and silently arbitrary with two —
 * and nothing in the schema or the code prevented two.
 *
 * ⚠️ THE FIRST IMPLEMENTATION HAD THE RULE BACKWARDS. It let the NEW campaign win and
 * auto-paused the client's others — and when that pause failed it logged and CARRIED ON,
 * so a db hiccup left two live campaigns behind an operation that reported success. The
 * approved rule is the opposite, and it is a refusal, not a repair:
 *
 *   · another ACTIVE campaign for this client → this one is REFUSED, named, untouched.
 *     Pausing the other one is a human's decision (Vida), never a side effect.
 *   · the SAME campaign already active → reused, as ever.
 *   · this ICP's PAUSED campaign → re-activated only when nothing else is live.
 *   · a check or write we cannot complete → null. If we cannot SEE whether another
 *     campaign is live, we do not get to assume there isn't one — proceeding on a failed
 *     read is exactly how a hiccup mints a second live campaign. Callers treat null as
 *     "not done", never as success.
 *   · scoped to THIS client throughout — another client's campaign never blocks anyone.
 *
 * Application-level on purpose (a partial unique index needs a migration against a live
 * table three days before launch); `start-work-one-active.test.ts` exercises this REAL
 * function, because the first implementation shipped behind suites that mocked it away.
 *
 * ⚠️ AND IT HAS TWO MODES, BECAUSE LEARNING IS NOT GO (22 Aug, integration correction).
 * `persistMillaUnderstanding` calls this to park `campaign_intent` on the campaign row —
 * and while this function created ACTIVE, *telling Milla what you want made a campaign
 * live*: before payment, before an operator looked, and it then BLOCKED the operator's own
 * GO through the refusal above. Found by independent review of the assembled journey; no
 * single-piece suite could see it, because each piece was right on its own.
 *
 *   · SCAFFOLD (the default, `activate` omitted or false) — find or create the campaign
 *     row for this ICP as a **draft**, and leave an existing row's status exactly as it
 *     is. Nothing goes live, nothing is paused, and the one-active invariant is not
 *     consulted because a draft cannot collide with anything. `figsy.ts` selects campaigns
 *     `.eq('status','active')`, so a draft's intent is stored and invisible to generation
 *     until GO — which is precisely the behaviour wanted.
 *   · ACTIVATE (`{ activate: true }`) — K.I.N.D's GO, and the only mode that makes a
 *     campaign live: the invariant is checked, a competitor refuses, and this ICP's own
 *     draft or paused campaign is woken.
 *
 * The default is SCAFFOLD deliberately: a caller that forgets the flag can only ever fail
 * to activate, never accidentally activate.
 */
export type EnsureCampaignResult =
  | { id: string; refused?: undefined }
  | { id?: undefined; refused: { blockingCampaignId: string; blockingName: string | null } }
  // BUILD-002 — a programme client whose programme is not LIVE, is paused, or whose state
  // could not be read. Distinct from the one-active-campaign refusal above because the
  // caller must be able to tell "you already have a live campaign" from "this programme has
  // not been paid for", and a client never sees the same sentence for both.
  | { id?: undefined; refused: { reason: 'programme_not_live' | 'programme_paused' | 'programme_state_unreadable'; message: string } }
  | null

export async function ensureCampaignForIcp(
  clientId: string,
  icpId: string,
  icpName?: string | null,
  opts?: { activate?: boolean; goingLive?: { programmeId: string } },
): Promise<EnsureCampaignResult> {
  const activate = opts?.activate === true

  // ── THE PROGRAMME GO-LIVE GATE (BUILD-002) ───────────────────────────────────────────
  //
  // ⚠️ ENFORCED HERE BECAUSE THIS FUNCTION IS THE ONLY DOOR TO `status: 'active'`. Five
  // call sites reach it — the Milla ICP save, the client activate route, the operator
  // create, and two more — and gating each of them individually is the shape AR8 already
  // proved fails: `lookalike/generate` had no fence at all because it was the caller nobody
  // remembered. One door, one gate.
  //
  // A programme client may not begin SENDING until the second 50% is paid and the programme
  // is LIVE (founder lock 5). Scaffolding is untouched — `activate: false` still creates the
  // draft row, because a draft sends nothing and blocking it would stop Milla working at all.
  //
  // ⚠️ FAIL CLOSED ON A READ ERROR. If we cannot tell whether a programme gates this client,
  // we refuse rather than activate: the cost of a wrong refusal is a delayed campaign, and
  // the cost of a wrong activation is sending on a programme that has not been paid for.
  // ── ⚑ 2 Sep (PR A2) — "GOING LIVE RIGHT NOW" SATISFIES THIS GATE, AND DOES NOT BYPASS IT.
  //
  // 🛑 THE PROBLEM. The gate asks for status LIVE. Preparation must happen BEFORE that status
  // is written, because LIVE is durable evidence that preparation SUCCEEDED — preparing after
  // the transition would leave a LIVE row behind a failed preparation, which every later
  // reader believes. But preparing first asks this gate for a status nobody has written yet.
  //
  // ⚠️ SO THE CONDITION IS RE-PROVEN, NEVER WAIVED. `assertGoingLive` re-reads the programme
  // and requires everything LIVE would have required — APPROVED, an approval recorded, P2
  // authority, not paused, not terminal, and that the caller named THIS client's programme.
  // Only the label is missing, and this call is a step towards writing it. `goingLive` is set
  // by `programme-preparation.ts` alone, and is verified here rather than believed.
  //
  // ⚠️ IT IS A NARROWER FALLBACK, NOT A SHORT-CIRCUIT: the ordinary `checkProgrammeAuthority`
  // gate below runs FIRST and always, and `assertGoingLive` is consulted only after it has
  // already refused. Nothing skips the normal rule.
  if (activate) {
    // ⛓️ 29 Aug (BUILD-003 PR2) — THIS BLOCK USED TO RE-IMPLEMENT THE RULE INLINE, and it was
    // the second copy of a decision `programme.ts` already exported as `mayStartCampaign` and
    // nothing consumed. Two copies of one rule, in two shapes, with two different sentences
    // for the client — which is exactly the drift the founder's "do not scatter slightly
    // different gate logic through multiple routes" forbids.
    //
    // It now calls the ONE module. Behaviour is preserved and slightly tightened: the old copy
    // never checked `approved_at`, so a programme that reached LIVE and was paid for without an
    // approval row would have activated a campaign. "One programme approval" is a founder lock.
    const { checkProgrammeAuthority } = await import('./programme-authority')
    const verdict = await checkProgrammeAuthority(clientId, 'OUTREACH')
    const goingLiveOk = !verdict.allowed && opts?.goingLive
      ? (await (await import('./programme-preparation')).assertGoingLive(clientId, opts.goingLive.programmeId)).ok
      : false
    if (!verdict.allowed) {
      // Mapped onto this function's existing refusal vocabulary so every caller's branching
      // keeps working. `programme_unresolvable` lands on the fail-closed reason it always had.
      const reason =
        verdict.reason === 'programme_paused' ? 'programme_paused' as const
        : verdict.reason === 'programme_unresolvable' ? 'programme_state_unreadable' as const
        : 'programme_not_live' as const
      if (!goingLiveOk) return { refused: { reason, message: verdict.message } }
    }
  }

  try {
    const { data: existing, error: existErr } = await db.from('figsy_campaigns')
      .select('id, status').eq('client_id', clientId).eq('icp_id', icpId).limit(1).maybeSingle()
    if (existErr) throw existErr

    // SCAFFOLD: the row is all that is wanted. An existing one is returned untouched —
    // re-running Milla must never wake a campaign an operator deliberately paused, and it
    // must never demote a live one either.
    if (!activate) {
      if (existing?.id) return { id: existing.id as string }
      const { data: draft, error: draftErr } = await db.from('figsy_campaigns')
        .insert({
          client_id: clientId, icp_id: icpId, status: 'draft',
          name: icpName?.trim() ? icpName.trim().slice(0, 120) : 'Outbound campaign',
          settings: { review_required: true },
          copilot_mode: true, approve_before_send: true,
        })
        .select('id').single()
      if (draftErr || !draft?.id) throw draftErr ?? new Error('campaign scaffold returned no id')
      return { id: draft.id as string }
    }

    // The same campaign staying active is not a second campaign. Answered before the
    // blocking check so a legacy double-active state cannot deadlock its own repair.
    if (existing?.id && existing.status === 'active') return { id: existing.id as string }

    // WHO ELSE IS LIVE? One query, client-scoped, excluding this ICP's own campaign.
    let blockingQuery = db.from('figsy_campaigns')
      .select('id, name').eq('client_id', clientId).eq('status', 'active')
    if (existing?.id) blockingQuery = blockingQuery.neq('id', existing.id)
    const { data: blocking, error: blockErr } = await blockingQuery.limit(1).maybeSingle()
    if (blockErr) throw blockErr
    if (blocking?.id) {
      return { refused: {
        blockingCampaignId: blocking.id as string,
        blockingName: (blocking.name as string | null) ?? null,
      } }
    }

    if (existing?.id) {
      // Re-activating an ICP whose campaign was paused brings that campaign back — the
      // write is checked, because "live with nothing able to work its leads" and "reported
      // live but still paused" are the same failure wearing different clothes.
      const { error: wakeErr } = await db.from('figsy_campaigns')
        .update({ status: 'active' }).eq('id', existing.id)
      if (wakeErr) throw wakeErr
      return { id: existing.id as string }
    }

    // Created ACTIVE: the table default is 'draft', and a draft would leave the client just
    // as blocked as no campaign at all (approve fail-closes without a live one). Nothing
    // sends regardless until the sequence is approved and the operator hits Run.
    const { data: made, error } = await db.from('figsy_campaigns')
      .insert({
        client_id: clientId, icp_id: icpId, status: 'active',
        name: icpName?.trim() ? icpName.trim().slice(0, 120) : 'Outbound campaign',
        settings: { review_required: true },   // Co-Pilot by default — a human sees each email
        copilot_mode: true, approve_before_send: true,
      })
      .select('id').single()
    if (error || !made?.id) throw error ?? new Error('campaign insert returned no id')
    return { id: made.id as string }
  } catch (err) {
    console.error('[start-work] ensureCampaignForIcp failed (fail-closed — nothing activated)', clientId, icpId, err)
    return null
  }
}

export type StartWorkResult = {
  started: boolean
  reason?: 'not_paid' | 'no_icp' | 'no_user' | 'already_stocked'
  sourced: number
  surfaced: number
  recommended: number
  /** Set when the sourcing run THREW. `sourced: 0` alone cannot be trusted without it. */
  sourcingError?: string
  /** #552 — set when the client has no mailbox to send from. Sourcing still happened. */
  sendWarning?: SendWarning
}

export type SendWarning = { headline: string; label: string; detail: string; reason: string }

export type SendReadiness = { canSend: true } | { canSend: false; warning: SendWarning }

/**
 * #552 — CAN THIS CLIENT SEND? A WARNING, NOT A GATE.
 *
 * The ambiguity this resolves: LAUNCH-PAD said *"Start work refuses without an inbox"* and the
 * code did not — the refusal only ever fired at SEND time (`figsy.ts`). One of the two was
 * wrong and nobody had decided which.
 *
 * **Decided: warn loudly, do not block.** Sourcing and sending fail in opposite directions:
 *
 *   • Sourcing spends OUR data budget and fills the client's desk. Blocking it on a mailbox
 *     idles onboarding for a client who has already paid — their $99 buys people, and the
 *     mailbox is bought separately, often days later. A hard refusal here would mean paying
 *     clients sit with an empty desk because a purchase we control has not happened yet.
 *   • Sending touches a real prospect from a real mailbox, and THAT is where fail-closed
 *     belongs. It already is: `figsy.ts` refuses and rolls the step back, with no fallback.
 *
 * So the gate stays where the danger is, and this makes the state VISIBLE instead of leaving
 * an operator to discover it when the first send silently defers.
 *
 * REUSES `resolveSendingInbox` — the same call the send path makes — deliberately. A
 * re-implemented check ("does a row exist in client_inboxes?") would drift the moment the
 * send path's rules changed, and then Vida would show a green light over a mailbox that
 * cannot actually send: a warming branded inbox, a row with no SMTP credentials, or a missing
 * INBOX_SECRET_KEY. Those are three separate refusal reasons and none of them is "no row".
 *
 * Never throws: this is a warning, and a warning that breaks the thing it annotates is worse
 * than no warning.
 */
export async function sendReadiness(clientId: string): Promise<SendReadiness> {
  try {
    const { resolveSendingInbox, refusalLabel } = await import('./sending-inbox')
    const r = await resolveSendingInbox(clientId)
    if (r.ok) return { canSend: true }
    return {
      canSend: false,
      warning: {
        headline: 'This client cannot SEND yet',
        label: refusalLabel(r.reason),
        detail: r.detail,
        reason: r.reason,
      },
    }
  } catch (err) {
    // Unknowable is NOT the same as fine. Reporting `canSend: true` because the check itself
    // broke would put a green light over an unknown state, which is the failure this repo has
    // spent the week removing.
    const why = err instanceof Error ? err.message : String(err)
    console.error('[start-work] sendReadiness check failed for', clientId, why)
    return {
      canSend: false,
      warning: {
        headline: 'Whether this client can SEND is UNKNOWN',
        label: 'The mailbox check itself failed',
        detail: `The check that reads this client's mailboxes could not run (${why}). This is not evidence that a mailbox is missing — it is evidence that we cannot tell.`,
        reason: 'check_failed',
      },
    }
  }
}

/** How many of the surfaced people we mark as "we'd start with these". */
export const RECOMMEND_TOP = 20

/**
 * #571 — SPLIT THE SOURCING TARGET ACROSS EVERY ACTIVE ICP.
 *
 * Sourcing used to read `.order('created_at', desc).limit(1).maybeSingle()` — the single
 * NEWEST active ICP. A client with two live ICPs therefore had one of them silently ignored
 * forever: no error, no log, no empty run to notice. They approved it, it says "never
 * sourced", and nothing in the product ever explains why.
 *
 * THE SPLIT RULE, stated once so it is not re-derived from the code later:
 *
 *   • The target is divided EVENLY, because we have no basis for ranking one approved ICP
 *     above another. They are all the client's stated intent; weighting by ICP age or by how
 *     many leads each has already produced would quietly turn a preference into a policy.
 *   • The REMAINDER goes to the newest ICPs first (the list arrives newest-first). If a
 *     client adds an ICP today, the odd lead lands on the one they were most recently
 *     thinking about.
 *   • When there are more ICPs than leads to fetch, the first `want` ICPs get one each and
 *     the rest get zero — a zero share is skipped entirely rather than issuing an empty run,
 *     because an empty run still costs an API call and writes a confusing outcome row.
 *
 * Pure, so the arithmetic is provable without a database or a sourcing provider.
 */
export function splitSourceTarget(want: number, icpCount: number): number[] {
  if (icpCount <= 0 || want <= 0) return new Array(Math.max(0, icpCount)).fill(0)
  const base = Math.floor(want / icpCount)
  const remainder = want % icpCount
  return Array.from({ length: icpCount }, (_, i) => base + (i < remainder ? 1 : 0))
}

/**
 * Source against the client's live ICP and put everyone in front of them.
 *
 * Never throws — this runs off a Stripe webhook and a payment must never fail because
 * sourcing had a bad day. Returns what actually happened so the caller can log it.
 */
export async function startWorkForClient(clientId: string): Promise<StartWorkResult> {
  const empty: StartWorkResult = { started: false, sourced: 0, surfaced: 0, recommended: 0 }
  try {
    // ── Money gate. No purchase, no spend. ──────────────────────────────────
    const { count: purchases } = await db.from('credit_transactions')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).in('type', PAID_TX_TYPES)
    if ((purchases ?? 0) === 0) return { ...empty, reason: 'not_paid' }

    // #571 — EVERY active ICP, not just the newest. This was `.limit(1).maybeSingle()`, so a
    // client with two live ICPs had one silently ignored forever — no error, no empty run,
    // nothing to notice. Newest first, because that is the order the remainder is handed out
    // in (see splitSourceTarget).
    const { data: icpRows } = await db.from('icps')
      .select('id').eq('client_id', clientId).eq('is_active', true)
      .order('created_at', { ascending: false })
    const icps = ((icpRows ?? []) as { id: string }[]).filter(i => i?.id)
    if (icps.length === 0) return { ...empty, reason: 'no_icp' }

    // runIcpJob bills and attributes against the owning user.
    const { data: client } = await db.from('clients').select('user_id').eq('id', clientId).maybeSingle()
    if (!client?.user_id) return { ...empty, reason: 'no_user' }

    // #552 — CAN THEY SEND? Checked here, NOT enforced here. See `sendReadiness` for why the
    // gate belongs at send time and the warning belongs here. Deliberately placed after the
    // money/ICP/user gates so it never masks a more fundamental refusal, and before the spend
    // so the warning is attached to the run that caused it.
    const readiness = await sendReadiness(clientId)
    const sendWarning = readiness.canSend ? undefined : readiness.warning
    if (sendWarning) {
      console.warn(`[start-work] ${clientId}: SOURCING ANYWAY — ${sendWarning.headline}. ${sendWarning.label}. ${sendWarning.detail}`)
    }

    // ── Source, topping the DESK up to the target ──────────────────────────
    //
    // This counted every lead the client had ever held, which made 200 a LIFETIME cap. The
    // model is $99 once for 100 included, then top-ups in bundles at $4 a lead — so a client
    // who worked through their desk and topped up $200 to approve fifty more got `want = 0`
    // and **nobody new to approve**. They had paid and there was nothing to spend it on.
    //
    // Count only what is still AWAITING A DECISION: not yet approved (`revealed_at` null) and
    // not passed. Approved and passed leads are finished business and must not hold slots
    // open against the client forever.
    //
    // Safe against over-sourcing because that is not this function's job: `try_spend_sourcing`
    // holds the client's pre-funded allowance, the per-client daily cap and the global monthly
    // ceiling. Asking for people we cannot afford is refused there.
    const { count: awaiting } = await db.from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId).is('revealed_at', null).neq('status', 'passed')
    const want = sourceTarget(awaiting ?? 0)

    // A SOURCING FAILURE MUST NOT READ AS "NOTHING TO DO".
    //
    // This `.catch` returned null, the function carried on, and the caller got
    // `{ started: true, sourced: 0 }` — indistinguishable from a client who was already
    // stocked. The client had just PAID. Nobody was told, because it only reached
    // `console.error`. (Audit 27 Jul.)
    let sourced = 0
    let sourcingFailed: string | null = null
    if (want > 0) {
      const { runIcpJob } = await import('../routes/icps')
      const shares = splitSourceTarget(want, icps.length)
      const failures: string[] = []

      // SEQUENTIAL, NOT `Promise.all`. Every run spends the same pre-funded allowance through
      // `try_spend_sourcing`, and firing them together would race that check — two runs each
      // reading "enough left" and both spending it. Sourcing is a background job off a
      // webhook; there is nothing to gain by making it concurrent and a budget to lose.
      for (let i = 0; i < icps.length; i++) {
        const share = shares[i]
        if (share <= 0) continue      // more ICPs than leads to fetch — an empty run helps nobody
        const run = await runIcpJob(icps[i].id, clientId, client.user_id as string, share)
          .catch(e => {
            const why = e instanceof Error ? e.message : String(e)
            failures.push(`${icps[i].id}: ${why}`)
            console.error('[start-work] sourcing failed for', clientId, 'icp', icps[i].id, e)
            return null
          })
        sourced += run?.inserted ?? 0
      }

      // ONE ICP FAILING IS STILL A FAILURE WORTH REPORTING, even when another succeeded —
      // that ICP's audience is simply not being sourced, and a partial result is exactly the
      // shape that reads as success on every board.
      if (failures.length > 0) {
        sourcingFailed = failures.join(' · ')
        const { sendFounderAlert } = await import('./alerts')
        void sendFounderAlert('source_down', 'A paying client asked for people and sourcing FAILED', [
          `Client ${clientId} has paid, and ${failures.length} of ${icps.length} ICP run(s) for ${want} record(s) failed.`,
          `Reason: ${sourcingFailed}`,
          sourced > 0
            ? `${sourced} record(s) DID land from the other ICP(s) — so this will look like a normal, slightly small delivery unless you read this.`
            : 'Their desk is not being filled.',
          'This does NOT look like an error anywhere else — it reads as "nothing to do" on every board until it is fixed.',
          'Re-run start-work for them once the cause is cleared.',
        ]).catch(() => {})
      }
    }

    // ── Everyone goes to the client, top 20 marked ─────────────────────────
    const { surfaced, recommended } = await surfaceEverything(clientId)
    // The warning rides on BOTH exits. An already-stocked client with no mailbox is exactly
    // the one an operator would otherwise assume is fine — nothing to source, nothing to
    // report, and a desk full of people nobody can be emailed about.
    if (want === 0 && surfaced === 0) {
      return { ...empty, started: true, reason: 'already_stocked', ...(sendWarning ? { sendWarning } : {}) }
    }

    return {
      started: true, sourced, surfaced, recommended,
      ...(sourcingFailed ? { sourcingError: sourcingFailed } : {}),
      ...(sendWarning ? { sendWarning } : {}),
    }
  } catch (err) {
    console.error('[start-work] failed for client', clientId, err)
    return empty
  }
}

/**
 * Put every un-surfaced lead in front of the client and mark the top 20 by score.
 *
 * No TTL: paid leads have no time limit (founder-locked). The old 72h clock never expired
 * anything — it just made leads vanish off the desk — so nothing is stamped here beyond the
 * surfaced marker itself.
 */
export async function surfaceEverything(clientId: string): Promise<{ surfaced: number; recommended: number }> {
  // #571 — THE SECOND SILENT CAP. This read was `.limit(1000)` inside a function whose whole
  // contract is "everyone". A client past a thousand undecided leads had the rest left
  // invisible — not surfaced, not delivered, no error — and the caller reported the truncated
  // figure to the founder as "sent N to them". Exactly the failure the `delivered_at` comment
  // below already describes, arriving through a different door.
  //
  // Paged with the shared pager (same one the Vida worklist uses) rather than a bigger limit,
  // because a bigger limit is the same bug with a later trigger.
  //
  // ORDERED BY `id`, NOT BY SCORE, and that is a fix rather than a regression: paging needs a
  // stable, unique key or pages can skip and repeat rows, and `score` is neither (nullable,
  // and ties are common). The score ordering here never mattered — it only decided WHICH
  // thousand survived the truncation, and there is no truncation now. "Recommended" is
  // derived from score at read time in `/leads/for-approval`, which is where it belongs.
  const { pageRows } = await import('./page-rows')
  let fresh: { id: string }[]
  let complete: boolean
  try {
    const read = await pageRows<{ id: string }>('leads',
      q => {
        // The builder is chainable; describe it as such so each link stays typed rather
        // than collapsing to `unknown` (or being waved through with `any`).
        type Chain = {
          select: (c: string) => Chain
          eq: (c: string, v: unknown) => Chain
          is: (c: string, v: unknown) => Chain
          neq: (c: string, v: unknown) => Chain
        }
        return (q as unknown as Chain)
          .select('id')
          .eq('client_id', clientId)
          .is('surfaced_for_approval_at', null)
          .is('revealed_at', null)
          .neq('status', 'passed')
      },
      { orderBy: 'id', label: `surfaceEverything:${clientId}` })
    fresh = read.rows
    complete = read.complete
  } catch (err) {
    // `pageRows` THROWS on a read error, where the old `.limit()` read swallowed it into an
    // undefined and returned a calm zero. A read failure is not "nothing to surface".
    const why = err instanceof Error ? err.message : String(err)
    console.error('[start-work] could not read leads to surface for client', clientId, why)
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'Could not read a client\'s leads to put on their desk', [
      `Client ${clientId}: the query that finds un-surfaced leads failed.`,
      `Reason: ${why}`,
      'This reports ZERO surfaced, which is indistinguishable from a client who is already stocked — hence this alert.',
      'Nothing is lost: re-running start-work will retry.',
    ]).catch(() => {})
    return { surfaced: 0, recommended: 0 }
  }

  const ids = fresh.map(l => l.id)
  if (ids.length === 0) return { surfaced: 0, recommended: 0 }
  if (!complete) {
    // The pager hit its ceiling. Say so rather than let a partial answer be reported as the
    // whole desk — the same honesty the pager itself logs, escalated because this one is a
    // paying client's delivery.
    console.warn(`[start-work] surfacing for ${clientId} is PARTIAL — the pager ceiling was reached at ${ids.length} leads.`)
  }

  const now = new Date().toISOString()
  // SURFACING **IS** DELIVERY IN THE MANAGED MODEL — the second silent cap.
  //
  // `/leads/for-approval` requires `delivered_at`, and leads are inserted with it null on
  // purpose: the old self-serve product had a nightly drip release `daily_drip_rate ?? 5`
  // a day so a trial user couldn't hoover up a database. In the managed model WE decide
  // what is on a client's desk, and this function is that decision — so a lead we have
  // just put in front of them but left "undelivered" was invisible to them, and would have
  // trickled onto the desk five a day. On a 200-lead pack that is forty days.
  //
  // Set together, so surfaced and visible can never disagree. Untouched if already set.
  //
  // BOTH WRITES ARE CHECKED NOW. They were bare `await`s with no `.error` read, and the
  // function then returned `surfaced: ids.length` regardless — so a failed `delivered_at`
  // write left the leads invisible to the client (`/for-approval` requires it) while the
  // operator's alert read "sent 200 to them". Reporting a delivery that did not happen is
  // the exact invisibility the comment above exists to fix.
  const { error: surfErr } = await db.from('leads').update({ surfaced_for_approval_at: now }).in('id', ids)
  const { error: delErr } = await db.from('leads').update({ delivered_at: now }).in('id', ids).is('delivered_at', null)
  if (surfErr || delErr) {
    const why = surfErr?.message ?? delErr?.message ?? 'unknown'
    console.error('[start-work] surfacing FAILED for client', clientId, why)
    const { sendFounderAlert } = await import('./alerts')
    void sendFounderAlert('sends_stalled', 'Leads were sourced but NOT put on the client\'s desk', [
      `Client ${clientId}: ${ids.length} lead(s) could not be surfaced.`,
      `Reason: ${why}`,
      surfErr && !delErr ? 'They are not marked as surfaced.' : '',
      delErr ? 'They are marked surfaced but NOT delivered — which means the client cannot see them at all.' : '',
      'Nothing is lost: re-running start-work will retry. But their desk is empty until it does.',
    ].filter(Boolean)).catch(() => {})
    // Report ZERO rather than a number nobody delivered — the caller logs this figure to the
    // founder as "sent N to them".
    return { surfaced: 0, recommended: 0 }
  }

  // "Recommended" is derived from score at read time (see /leads/for-approval) rather than
  // stored, so it needs no column and can never go stale against a re-score.
  return { surfaced: ids.length, recommended: Math.min(RECOMMEND_TOP, ids.length) }
}
