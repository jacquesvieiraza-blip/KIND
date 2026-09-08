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
// ⚠️ AND IT IS GATED TO HOUSE BY PROVED IDENTITY. `audienceForClientStrict` answers from the
// AUTH USER and THROWS rather than guessing; a throw is read as "not house". The approved copy
// is Client Zero's — applying it to a paying customer's programme would put M&V's own pitch in
// front of their prospects.
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

export type ApplyResult =
  | { ok: true; sequenceId: string; campaignId: string; created: boolean; steps: number }
  | { ok: false; reason: string }

/**
 * Write the approved sequence, cadence and schedule onto a programme's canonical objects.
 *
 * 🛑 OPERATOR-INVOKED, ONCE, AFTER THE MIGRATIONS. Nothing calls this on import, on boot, on a
 * cron or from a route. Both columns it needs were added by
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
