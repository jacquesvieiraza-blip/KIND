// ═══════════════════════════════════════════════════════════════════════════════════════
// THE HOUSE SEQUENCE, CADENCE AND SEND SCHEDULE — founder-approved 8 Sep, verbatim.
//
// 🛑 THIS FILE IS THE RECORD, AND THE APPLY IS SEPARATE FROM IT. The five messages below are
// the founder's own words, copied exactly. They are held in version control rather than typed
// into a database by hand, so "what did House actually send?" is answerable from the repo and a
// change to them is a diff somebody reviews — not an UPDATE nobody sees.
//
// 🛑 NOTHING HERE WRITES ANYTHING ON IMPORT, and `applyHouseProgrammeSequence` has exactly ONE
// caller: `prepareProgrammeOutreach`, between creating the campaign and enrolling anybody.
//
// ⛓️ IT WAS AN ORPHAN FOR ONE PASS, AND THAT WAS WRONG (founder-corrected 8 Sep). Left uncalled,
// the only route through production was: run preparation (creates the campaign, refuses to
// enrol), remember to apply the sequence, run preparation again. **A production path that
// depends on somebody remembering a magic call order is a path that will one day be run in the
// wrong order** — and the wrong order here means enrolments built from words nobody approved.
//
// 🛑 AND IT IS GATED TO ONE EXACT PROGRAMME, NOT TO A CLASSIFICATION (founder-corrected 8 Sep).
//
// The gate was `audienceForClientStrict(client_id) === 'house'`. That proves the AUDIENCE and
// nothing more — every House programme is House, including a second one created next month, a
// different ICP under Client Zero, and every historical one. **These five messages are the
// LAUNCH sequence for one programme, not a universal House default**, and auto-seeding them
// into any other programme would quietly put October's copy into November's campaign.
//
// So the identifier is the **exact programme id**, configured explicitly:
//
//     HOUSE_LAUNCH_PROGRAMME_ID = <the uuid of the programme being launched>
//
// ⚠️ UNSET MEANS NOTHING SEEDS. The default state of this product is that no programme is
// auto-seeded with anybody's copy — which is the correct default, and it is the state every
// deployment is in until somebody deliberately names one programme.
//
// ⚠️ AND THE AUDIENCE CHECK IS KEPT AS A SECOND CONDITION, not replaced by this one. A uuid
// pasted into an env var can be the wrong uuid; requiring that the named programme ALSO belong
// to a proved House client means a mistyped customer id cannot seed a customer's programme.
// Two independent facts, both required.
//
// ⚠️ NOT a name, not "the newest programme", not the client alone, not the ICP text, not the
// audience alone. Every one of those matches more than one programme.
//
// ⚠️ `channel: 'email'` IS LOAD-BEARING ON EVERY STEP. `sequence-apply.ts` filters stored
// sequences through `emailSteps`, which keeps only `channel === 'email'`. A step without it is
// silently dropped, and a sequence whose steps are all dropped sends the AI draft instead —
// approved words on the row, invented words in the enrolment. Caught before deploy; the chain
// now defaults an absent channel to email, and these state it anyway.
//
// 🛑 ONE LOCKED VALUE WAS *NOT* TAKEN LITERALLY, AND THIS IS THE ONLY PLACE IT COULD BE SAID.
//
// The founder locked the cadence twice, in two notations that do not agree once the code's own
// semantics are applied:
//
//     "[0,3,4,5,6]"                                   ← an array
//     "Step 1 Day 0 · Step 2 Day 3 · Step 3 Day 7 ·
//      Step 4 Day 12 · Step 5 Day 18"                 ← the days
//
// `steps[i].wait_days` in this product is the wait AFTER step i — `send-due.ts` passes the
// CURRENT step's `wait_days` as `waitDaysNext`, and `sendSequenceEmailCore` schedules the next
// send that many days out. Persisting `[0,3,4,5,6]` under that meaning gives waits of 0 then 3
// then 4… i.e. **Day 0 · 0 · 3 · 7 · 12 — two emails to the same prospect on day one.**
//
// The DAYS are the product decision and are stated unambiguously; the array is a notation of
// them. So the days are honoured and the array is re-expressed as the waits that produce them:
//
//     [3, 4, 5, 6, 0]   →   Day 0 · 3 · 7 · 12 · 18
//
// The final value is never read (nothing follows step 5) and is 0 rather than an invented gap.
// ⚠️ FLAGGED TO THE FOUNDER RATHER THAN QUIETLY CHOSEN: if `[0,3,4,5,6]` was meant literally as
// waits, the intended schedule is Day 0 · 0 · 3 · 7 · 12 and this file is wrong.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { db } from '@kind/db'
import type { SendSchedule } from './send-schedule'

export interface HouseStep {
  channel: 'email'
  subject: string
  body: string
  /** Days to wait AFTER this step before the next one. The last value is never read. */
  wait_days: number
}

/**
 * The five approved messages. Founder-locked 8 Sep — **do not edit without a new lock.**
 *
 * Each has a distinct job: pain, mechanism, insight, control, close. They carry no customer
 * proof, no ROI figure, no meeting count and no invented case study, because we have none.
 */
export const HOUSE_SEQUENCE_STEPS: readonly HouseStep[] = [
  {
    channel: 'email',
    subject: "{{first_name}}, who's building your pipeline this quarter?",
    body:
      "Hi {{first_name}} — if your senior people are still spending time finding prospects, they're doing work M&V can take off their plate.\n\n" +
      "We build and run the pipeline so they can spend that time selling, delivering and growing the business.\n\n" +
      'Worth fifteen minutes?',
    wait_days: 3,
  },
  {
    channel: 'email',
    subject: 'How this actually works',
    body:
      'Two halves.\n\n' +
      "Milla talks to you — what you're trying to achieve, who's worth talking to, what a good meeting looks like — and shapes the programme around it.\n\n" +
      'Vida runs the operation behind the scenes: finding, qualifying, preparing, sending and following up.\n\n' +
      "You're involved at the points that matter and nowhere else.\n\n" +
      "Want to see the programme we'd shape for {{company}}?",
    wait_days: 4,
  },
  {
    channel: 'email',
    subject: 'Why outbound usually stops',
    body:
      'Outbound usually becomes difficult when the list drifts, follow-up stops after one email, or whoever owns it gets pulled onto something more urgent.\n\n' +
      "That's the operational problem M&V is built to take away.\n\n" +
      'Which of those is closest to {{company}}?',
    wait_days: 5,
  },
  {
    channel: 'email',
    subject: 'You approve it before it goes out',
    body:
      "Nothing goes out that you haven't seen.\n\n" +
      "You get the actual prospects and the actual wording, and outreach can't start until you've approved both — and if anything material changes afterwards it stops and comes back to you.\n\n" +
      'Your ICP stays yours: we hold every criterion you gave us rather than quietly widening it when results are thin.\n\n' +
      'Happy to show you the approval view.',
    wait_days: 6,
  },
  {
    channel: 'email',
    subject: 'Closing the loop, {{first_name}}',
    body:
      "I'll leave it here.\n\n" +
      "If pipeline isn't the constraint right now, ignore this.\n\n" +
      "If it is and the timing's wrong, tell me when and I'll come back then.\n\n" +
      'Good luck either way.',
    wait_days: 0,
  },
]

/** Day 0 · 3 · 7 · 12 · 18, expressed as the wait AFTER each step — see the header. */
export const HOUSE_CADENCE: readonly number[] = HOUSE_SEQUENCE_STEPS.map(s => s.wait_days)

/**
 * Monday–Friday, 08:30–17:00, in the RECIPIENT's own local time.
 *
 * ⚠️ `default_tz` IS FOR DISPLAY AND GRANTS NOTHING. The guard resolves the recipient's own
 * zone — a persisted zone, else a region, else the intersection of every zone their country
 * spans — and refuses when it cannot. Judging an American in London would be the same defect as
 * judging them in New York, which is where this whole guard was corrected from.
 */
export const HOUSE_SEND_SCHEDULE: SendSchedule = {
  days: [1, 2, 3, 4, 5],
  start: '08:30',
  end: '17:00',
  default_tz: 'Europe/London',
}

/** A uuid, and nothing that merely looks like one. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * The one programme these five messages may be seeded into, or `null`.
 *
 * ⚠️ READ AT CALL TIME, NEVER CACHED AT MODULE SCOPE. A module-scope constant would freeze
 * whatever the environment held when the process booted, so a corrected value would need a
 * redeploy to take effect — and the value that mattered would be the one nobody could see.
 */
export function houseLaunchProgrammeId(): string | null {
  const raw = (process.env.HOUSE_LAUNCH_PROGRAMME_ID ?? '').trim()
  return UUID.test(raw) ? raw.toLowerCase() : null
}

/**
 * Is THIS programme the one the approved launch sequence belongs to?
 *
 * 🛑 TWO INDEPENDENT FACTS, BOTH REQUIRED: it is the configured programme, AND its client is a
 * proved House client. Either alone is a classification that matches more than one programme —
 * and `audienceForClientStrict` throws rather than guessing, which is read here as NO.
 */
export async function isHouseLaunchProgramme(programmeId: string, clientId: string): Promise<boolean> {
  const configured = houseLaunchProgrammeId()
  if (!configured || configured !== programmeId.trim().toLowerCase()) return false
  try {
    const { audienceForClientStrict } = await import('./provider-boundary')
    return (await audienceForClientStrict(clientId)) === 'house'
  } catch {
    // Identity unprovable ⇒ NO. Never a reason to seed somebody else's programme.
    return false
  }
}

export type ApplyResult =
  | { ok: true; sequenceId: string; campaignId: string; created: boolean; steps: number }
  | { ok: false; reason: string }

/**
 * Write the approved sequence, cadence and schedule onto a programme's canonical objects.
 *
 * 🛑 ONE CALLER: `prepareProgrammeOutreach`, between creating the campaign and enrolling
 * anybody. Nothing calls it on import, on boot, on a cron or from a route, and it runs only for
 * the one programme `isHouseLaunchProgramme` proves. Both columns it needs were added by
 * `20260908_review_freeze_and_schedule` and do not exist in production yet.
 *
 * ⚠️ IT REFUSES RATHER THAN CREATING A CAMPAIGN. A campaign is created by preparation, under
 * the programme's own authority and as a DRAFT; making one here would be a second door to the
 * object the whole positive-linkage argument rests on.
 *
 * ⚠️ IDEMPOTENT. A second run updates the same row rather than adding a rival sequence — and a
 * rival sequence on one campaign is precisely what `resolveProgrammeChain` refuses to choose
 * between, so creating one would break the programme rather than duplicate it.
 *
 * ⚠️ IT TOUCHES TWO ROWS AND NOTHING ELSE: the canonical `figsy_sequences` row, and
 * `programmes.send_schedule`. No status, no approval, no enrolment, no campaign settings — the
 * programme path no longer reads `figsy_campaigns.settings.sequence`, and writing the words
 * there too would recreate the dual truth this package spent a pass removing.
 */
export async function applyHouseProgrammeSequence(programmeId: string): Promise<ApplyResult> {
  const { resolveProgrammeChain } = await import('./programme-chain')
  const chainRes = await resolveProgrammeChain(programmeId)
  if (!chainRes.ok) return { ok: false, reason: chainRes.degraded }
  const { clientId, campaignId, sequenceId } = chainRes.chain

  // 🛑 THE SCOPE GATE, RE-ASSERTED HERE AND NOT ONLY AT THE CALLER. This function is exported;
  // a future caller that checked nothing would otherwise seed whatever it was handed. The
  // caller checks too — two checks of one fact, because the cost of the redundant one is a
  // function call and the cost of missing it is a customer receiving M&V's own pitch.
  if (!(await isHouseLaunchProgramme(programmeId, clientId))) {
    return {
      ok: false,
      reason: 'This is not the configured House launch programme, so the approved launch sequence was not applied. These five messages belong to one programme; every other programme — including another House one — must have its own sequence authored. Nothing was changed.',
    }
  }

  if (!campaignId) {
    return {
      ok: false,
      reason: 'This programme has no campaign yet (programme → ICP → campaign), so there is nothing to attach the sequence to. Run preparation first — it creates the campaign as a draft under the programme\'s own authority.',
    }
  }

  const steps = HOUSE_SEQUENCE_STEPS.map(s => ({ ...s }))

  if (sequenceId) {
    const { error } = await db.from('figsy_sequences')
      .update({ steps, campaign_id: campaignId, updated_at: new Date().toISOString() })
      .eq('id', sequenceId)
    if (error) return { ok: false, reason: `The canonical sequence could not be updated (${error.message}). Nothing was changed.` }
  } else {
    const { data, error } = await db.from('figsy_sequences')
      .insert({ client_id: clientId, campaign_id: campaignId, name: 'House programme sequence', steps })
      .select('id').single()
    if (error || !data) return { ok: false, reason: `The canonical sequence could not be created (${error?.message ?? 'no row returned'}). Nothing was changed.` }
    return await withSchedule(programmeId, String(data.id), campaignId, true, steps.length)
  }

  return await withSchedule(programmeId, sequenceId, campaignId, false, steps.length)
}

/**
 * Write ONLY the approved send schedule — never the words.
 *
 * ⛓️ 9 Sep — THE REPAIR FOR A HALF-APPLIED APPLY, AND IT MUST NOT BE `applyHouseProgrammeSequence`.
 *
 * 🛑 THE TWO WRITES CAN SEPARATE. `applyHouseProgrammeSequence` writes the sequence row and THEN
 * the schedule, as two statements; a process stopped between them — which is exactly what a
 * killed request does — leaves the sequence present and the schedule missing. The auto-apply in
 * preparation runs only when NO sequence resolves, so every retry would then skip it and be
 * refused at readiness with `no_send_schedule` for ever.
 *
 * 🛑 AND THE OBVIOUS REPAIR IS THE WRONG ONE. Calling the full apply to fix the schedule would
 * also UPDATE the sequence steps back to the approved copy — silently discarding an edit an
 * operator had made since. The 8 Sep lock is explicit that the approved copy is a SEED for an
 * empty programme and never a periodic reset, so the repair writes the one column that is
 * actually missing and touches nothing else.
 *
 * ⚠️ SAME SCOPE GATE. Only the proved House launch programme, for the same reason the sequence
 * apply is scoped: this schedule belongs to one programme, not to every House one.
 */
export async function applyHouseSendSchedule(programmeId: string, clientId: string): Promise<ApplyScheduleResult> {
  if (!(await isHouseLaunchProgramme(programmeId, clientId))) {
    return {
      ok: false,
      reason: 'This is not the configured House launch programme, so the approved send schedule was not applied. Nothing was changed.',
    }
  }
  const { error } = await db.from('programmes')
    .update({ send_schedule: HOUSE_SEND_SCHEDULE, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
  if (error) return { ok: false, reason: `The send schedule could not be written (${error.message}). Nothing was changed.` }
  return { ok: true }
}

export type ApplyScheduleResult = { ok: true } | { ok: false; reason: string }

/**
 * The schedule is written in the same operation as the words, and a failure to write it is a
 * failure of the whole apply — a programme holding approved messages it may never send at any
 * hour is a half-applied state somebody would have to notice.
 */
async function withSchedule(
  programmeId: string, sequenceId: string, campaignId: string, created: boolean, steps: number,
): Promise<ApplyResult> {
  const { error } = await db.from('programmes')
    .update({ send_schedule: HOUSE_SEND_SCHEDULE, updated_at: new Date().toISOString() })
    .eq('id', programmeId)
  if (error) {
    return { ok: false, reason: `The sequence was written but the send schedule was not (${error.message}). The programme cannot send until the schedule is applied — re-run this.` }
  }
  return { ok: true, sequenceId, campaignId, created, steps }
}
