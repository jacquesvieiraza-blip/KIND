// ═══════════════════════════════════════════════════════════════════════════════════════
// WHY 246 QUALIFIED HOUSE PROSPECTS RECEIVED NO PROGRAMME ENROLMENT — and both causes.
//
// The founder ran the asynchronous recovery in production. It completed and reported, many
// times over:
//
//     "Lead <id> was not enrolled — no enrolment row exists after the attempt."
//
// That sentence is the SYMPTOM of two independent defects that compound, and neither of them
// is visible from the sentence itself.
//
// ── ① THE SEND GATES WERE ABORTING THE ENROLMENT ────────────────────────────────────────
//
// `autoEnrollLead` was written for the legacy model, where *enrol* means **charge a credit and
// send step one immediately**. So it runs the per-lead SEND gates — do-not-contact, PECR, the
// launch-country hold, and "is Resend configured" — BEFORE the insert, and every one of them
// aborts the enrolment. Correct when an enrolment exists only to send. Wrong for programme
// preparation, which must build the reviewable set BEFORE approval, P2, Make Live or Run, and
// must send nothing. Fourteen of its refusals were a bare `return`, so the caller could only
// look for a row afterwards, fail to find one, and print the same empty sentence for all of
// them.
//
// ── ② "ALREADY ENROLLED" WAS NOT PROGRAMME-SCOPED ───────────────────────────────────────
//
// Preparation asked *does ANY enrolment row exist for this lead* — client-wide, no programme
// filter. House carries ~263 legacy enrolments from the retired per-lead desk, every one with
// `programme_id = NULL`. Each of those leads was counted `alreadyEnrolled` and **no programme
// enrolment was ever created**, while readiness and the review snapshot both count
// `programme_id = <this programme>` and correctly saw nothing. Preparation reported the work
// done; readiness reported an empty audience; nothing named the disagreement.
//
// ⚠️ NOT ONE SEND GATE IS WEAKENED BY THE FIX, and these cases prove it: each one is asserted
// to still stand inside `sendSequenceEmailCore`, which is where a send is actually decided.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})
import { join } from 'node:path'

const LIB = __dirname
const FIGSY = readFileSync(join(LIB, 'figsy.ts'), 'utf8')
const PREP = readFileSync(join(LIB, 'programme-preparation.ts'), 'utf8')
const ADVANCE = readFileSync(join(LIB, 'programme-advance.ts'), 'utf8')
const VIDA = readFileSync(join(LIB, '..', '..', '..', 'admin', 'src', 'app', 'vida', 'page.tsx'), 'utf8')

/**
 * Executable lines only.
 *
 * ⚠️ EVERY ABSENCE PROOF BELOW USES THIS. These files explain themselves at length, and the
 * explanations name the very things the assertions forbid — `assertGoingLive` appears in the
 * comment that says activation stays behind Make live. A bare file search reads that sentence
 * as the violation it was written to rule out.
 */
const code = (src: string): string =>
  src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

/** `autoEnrollLead`'s body only, so a mention in the header prose proves nothing. */
const ENROL = FIGSY.slice(FIGSY.indexOf('export async function autoEnrollLead'))
/** The send core, where every send decision actually lives. */
const SEND_CORE = FIGSY.slice(
  FIGSY.indexOf('async function sendSequenceEmailCore'),
  FIGSY.indexOf('export async function sendSequenceEmail('),
)

// ═══════════════════════════════════════════════════════════════════════════════════════
// ① THE SEND GATES MOVED TO SEND TIME — THEY DID NOT DISAPPEAR
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('① preparation may create an enrolment; only sending is gated on sending', () => {
  it('every gate `prepareOnly` skips is still enforced where the send is decided', () => {
    // 🛑 THIS IS THE WHOLE SAFETY ARGUMENT. If any of these were absent from the send core,
    // skipping it at preparation would genuinely remove a protection rather than relocate one.
    for (const gate of ['pecrVerdict(', 'isLaunchSendCountry(', 'isSuppressed(', 'opt_out_blocklist']) {
      expect(SEND_CORE.includes(gate), `${gate} is NOT enforced at send time — moving it would weaken it`).toBe(true)
    }
  })

  it('preparation skips exactly three send-time gates, and no more', () => {
    // Each is guarded by `!opts?.prepareOnly` and nothing else is.
    expect(ENROL).toContain("!isDemo && !opts?.prepareOnly) {\n      const pecr = pecrVerdict(")
    expect(ENROL).toContain("!isDemo && !opts?.prepareOnly && !isLaunchSendCountry(lead.country)")
    expect(ENROL).toContain("!isDemo && !opts?.prepareOnly && !resend")
    expect((ENROL.match(/!opts\?\.prepareOnly/g) ?? []).length,
      'prepareOnly now bypasses a different number of gates than the three that were reasoned about').toBe(3)
  })

  it('🛑 do-not-contact STILL refuses at preparation — it is about the person, not the timing', () => {
    // The other three decide WHEN or WHETHER an email may go out. This one says we must never
    // build outreach for this person at all, so preparation refuses it by name.
    const at = ENROL.indexOf('isSuppressed({ email: lead.email, company: lead.company })')
    expect(at).toBeGreaterThan(-1)
    const branch = ENROL.slice(at, at + 400)
    expect(branch).toContain("refuse('do_not_contact'")
    expect(branch, 'do-not-contact was made conditional on prepareOnly').not.toContain('prepareOnly')
  })

  it('🛑 creating the enrolment attempts NO outreach, and that is structural', () => {
    const at = ENROL.indexOf('if (opts?.prepareOnly) {')
    const send = ENROL.indexOf('await sendSequenceEmail(')
    expect(at, 'the prepare-only return is gone').toBeGreaterThan(-1)
    expect(send).toBeGreaterThan(-1)
    // The return sits ABOVE the only send call in the function, so preparation cannot reach it.
    expect(at, 'preparation can still fall through to the step-one send').toBeLessThan(send)
  })

  it('the send call is reached only once, and only by the non-prepare path', () => {
    expect((ENROL.match(/await sendSequenceEmail\(/g) ?? []).length).toBe(1)
  })

  it('`next_send_at` is unchanged, so Make live still arms these rows', () => {
    // 🛑 WRITING `null` HERE WOULD LOOK SAFER AND WOULD SILENTLY BREAK GO-LIVE: `send-due`
    // selects on `next_send_at <= now`, nothing re-arms an existing enrolment, and the
    // programme would go live and never send. Inertness comes from the draft campaign, the
    // OUTREACH gate and the kill-switch — not from a null timestamp.
    expect(ENROL).toContain('next_send_at:   isDemo ? null : new Date().toISOString()')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ② NO APPROVAL, NO P2, NO MAKE LIVE, NO RUN — AND NOTHING SENDS
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('② preparation needs none of the later authorities', () => {
  it('`prepareOnly` is passed for the PRE-APPROVAL stage only', () => {
    expect(PREP).toContain("prepareOnly: stage.stage === 'pre_approval',")
    // Post-approval (Make live, the paid P2 webhook) keeps its existing behaviour byte for byte.
    expect(PREP).not.toContain('prepareOnly: true')
  })

  it('the enrolment path consults no approval, P2, LIVE or Run authority', () => {
    const preparePath = code(PREP.slice(PREP.indexOf('export async function prepareProgrammeOutreach')))
    for (const forbidden of [
      'approved_at', 'p2Authorised', 'second_paid_at', 'second_authorised_at',
      'went_live_at', 'goLiveProgramme', 'assertGoingLive',
      'FIGSY_OPERATOR_SEND_ENABLED', 'sendSequenceEmail', 'operatorSendEnabled',
    ]) {
      expect(preparePath.includes(forbidden), `preparation reaches ${forbidden}`).toBe(false)
    }
  })

  it('the pre-approval campaign is still a DRAFT, so the cron cannot even select it', () => {
    expect(PREP).toContain("{ activate: false }")
    // `send-due` only ever looks at active campaigns — the first of the three independent
    // reasons a prepared pre-approval row is inert.
    const SEND_DUE = readFileSync(join(LIB, 'send-due.ts'), 'utf8')
    expect(SEND_DUE).toContain("db.from('figsy_campaigns').select('id, client_id, settings').eq('status', 'active')")
  })

  it('the send core still demands approval + P2 + LIVE through the OUTREACH gate', () => {
    expect(SEND_CORE).toContain("checkEnrollmentAuthority(enrollmentId, 'OUTREACH'")
    expect(SEND_CORE).toContain("return 'deferred'")
  })

  it('and the kill-switch still sits in front of all of it', () => {
    expect(SEND_CORE).toContain('!outreachEnabled()')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ③ PROGRAMME-SCOPED TRUTH — A LEGACY ROW IS NOT A PROGRAMME ENROLMENT
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('③ only THIS programme\'s enrolments count as this programme\'s work', () => {
  it('🛑 the already-enrolled check is scoped by programme_id', () => {
    // Unscoped, House's ~263 legacy NULL-programme rows made preparation skip the very leads
    // it existed to enrol — silently, and reported as success.
    expect(PREP).toContain(".select('lead_id').eq('programme_id', programmeId).in('lead_id', eligible.map(l => l.id))")
  })

  it('🛑 the post-attempt verification is scoped by programme_id', () => {
    expect(PREP).toContain(".select('id').eq('programme_id', programmeId).eq('lead_id', lead.id)")
  })

  it('preparation, readiness and the snapshot now agree on what an enrolment is', () => {
    const READY = readFileSync(join(LIB, 'preparation-readiness.ts'), 'utf8')
    const SNAP = readFileSync(join(LIB, 'preparation-snapshot.ts'), 'utf8')
    // All three count the same population. Before, only two of the three did.
    expect(READY).toContain(".eq('programme_id', programmeId)")
    expect(SNAP).toContain(".eq('programme_id', programmeId)")
    expect(PREP).toContain(".eq('programme_id', programmeId)")
  })

  it('the enrolment row records the programme from the LEAD, never from the caller', () => {
    expect(ENROL).toContain('const attribution = await resolveLeadAttribution(leadId)')
    expect(ENROL).toContain('programme_id:   attribution.programmeId')
    expect(ENROL).toContain('batch_id:       attribution.batchId')
  })

  it('the candidate set stays scoped to the programme, the client and the current batch', () => {
    const preparePath = PREP.slice(PREP.indexOf('export async function prepareProgrammeOutreach'))
    expect(preparePath).toContain(".eq('programme_id', programmeId)")
    expect(preparePath).toContain(".eq('client_id', p.client_id)")
    expect(preparePath).toContain(".eq('batch_id', currentBatchId)")
    expect(preparePath).toContain(".not('qualified_at', 'is', null)")
    expect(preparePath).toContain(".is('disqualified_at', null)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ④ EVERY REFUSAL NAMES ITSELF — NO MORE COUNTING ABSENCES
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('④ a refusal carries its cause', () => {
  it('no bare `return` survives in the enrolment function', () => {
    // 🛑 THE ORIGINAL DEFECT. Every silent `return` was a cause the caller could never learn.
    // The body of `autoEnrollLead` must now return a value on every path — the compiler proves
    // it too, but this states the rule so a future edit cannot quietly reintroduce one.
    const body = ENROL.slice(0, ENROL.indexOf('\n}\n'))
    const bare = (body.match(/^\s*return\s*$/gm) ?? []).length
    expect(bare, 'a refusal path returns nothing again — its cause is unreportable').toBe(0)
  })

  it('preparation counts causes instead of printing one line per prospect', () => {
    expect(PREP).toContain('out.refusals[outcome.code] = (out.refusals[outcome.code] ?? 0) + 1')
    expect(PREP).toContain('could not be enrolled. Nothing was sent.')
    // 🛑 AND THE OLD WALL IS GONE.
    expect(PREP.includes('was not enrolled — no enrolment row exists after the attempt'),
      'the per-prospect wall of identical lines is back').toBe(false)
  })

  it('every refusal code has founder-plain wording', async () => {
    const { ENROL_REFUSAL_TEXT } = await import('./programme-preparation')
    const codes = [...ENROL.matchAll(/refuse\('([a-z_]+)'/g)].map(m => m[1])
    expect(codes.length, 'no refusal codes found — the anchor is wrong').toBeGreaterThan(10)
    for (const c of new Set(codes)) {
      expect(ENROL_REFUSAL_TEXT[c], `refusal code '${c}' would render as a raw code`).toBeTruthy()
    }
  })

  it('the technical evidence is kept, and kept out of the operator sentence', () => {
    // Lead ids go to the audit row; the desk gets counts.
    expect(ADVANCE).toContain('failed_lead_ids: r.failed_lead_ids')
    expect(ADVANCE).toContain('attempted: num(d.attempted)')
    const lastPrep = code(ADVANCE.slice(ADVANCE.indexOf('export async function lastPreparationAttempt')))
    expect(lastPrep.includes('failed_lead_ids:'),
      'lead ids are handed to the screen instead of staying in the audit record').toBe(false)
  })

  it('Vida renders four counts, never a list of ids', () => {
    const at = VIDA.indexOf('attempted ·')
    expect(at, 'the count summary is gone').toBeGreaterThan(-1)
    const block = VIDA.slice(at - 400, at + 400)
    expect(block).toContain('already prepared')
    expect(block).toContain('newly prepared')
    expect(block).toContain('could not be prepared')
    expect(block.includes('failed_lead_ids'), 'lead ids reached the desk').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ NOTHING ELSE MOVED
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('⑤ the fix touches enrolment creation and nothing else', () => {
  it('no entitlement counter is written by preparation or by enrolment', () => {
    const preparePath = code(PREP.slice(PREP.indexOf('export async function prepareProgrammeOutreach')))
    const enrolCode = code(ENROL)
    for (const col of ['sourced_used', 'sourced_reserved', 'sourcing_ceiling', 'settle_programme_batch']) {
      expect(preparePath.includes(col), `preparation writes ${col}`).toBe(false)
      expect(enrolCode.includes(col), `enrolment writes ${col}`).toBe(false)
    }
  })

  it('programme fulfilment still charges nothing', () => {
    expect(ENROL).toContain("(isDemo || opts?.prepaid || programmeFulfilment) ? 'skipped'")
  })

  it('the campaign is returned, never duplicated, when one already exists', () => {
    const START = readFileSync(join(LIB, 'start-work.ts'), 'utf8')
    expect(START).toContain('if (existing?.id) return { id: existing.id as string }')
  })

  it('the canonical sequence is never overwritten by preparation', () => {
    // The House sequence is applied ONLY when the chain resolves none, or when the schedule
    // half of that same write is missing — never as a periodic reset.
    expect(PREP).toContain('if (!chainRes.chain.sequenceId || chainRes.chain.steps.length === 0) {')
    expect(PREP).toContain('if (!isSendSchedule((schedRow as { send_schedule?: unknown } | null)?.send_schedule))')
  })

  it('sender safety is untouched — preparation neither assigns nor bypasses a mailbox', () => {
    const preparePath = code(PREP.slice(PREP.indexOf('export async function prepareProgrammeOutreach')))
    expect(preparePath.includes('programmeSenderSafety'), 'preparation now decides sender safety').toBe(false)
    expect(preparePath.includes('client_inboxes'), 'preparation touches mailboxes').toBe(false)
    const READY = readFileSync(join(LIB, 'preparation-readiness.ts'), 'utf8')
    expect(READY).toContain('programmeSenderSafety')
    expect(READY).toContain("block('no_sender'")
  })

  it('READY_FOR_APPROVAL is still reached only through the unchanged transition', () => {
    expect(ADVANCE).toContain('markReadyForApproval(id)')
    const body = code(ADVANCE.slice(ADVANCE.indexOf('export async function advanceProgrammeToReview')))
    expect(body.includes('setStatus('), 'the orchestrator sets the status itself').toBe(false)
    expect(body.includes("status: 'READY_FOR_APPROVAL'"), 'the orchestrator writes the status itself').toBe(false)
  })

  it('and it refuses to advance while preparation is incomplete', () => {
    const body = ADVANCE.slice(ADVANCE.indexOf('export async function advanceProgrammeToReview'))
    const guard = body.indexOf('if (!prep.complete)')
    const mark = body.indexOf('markReadyForApproval(id)')
    expect(guard).toBeGreaterThan(-1)
    expect(guard, 'the transition is attempted before completeness is checked').toBeLessThan(mark)
  })
})
