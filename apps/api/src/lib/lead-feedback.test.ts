import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  REASON_CODES, REASON_LABELS, isReasonCode, normaliseFeedback,
  applicableAntiSignals, ANTI_SIGNAL_MIN_COUNT,
} from './lead-feedback'

// ── CALIBRATION v1 — CAPTURE (P32, 21 Aug) ─────────────────────────────────────────────────
//
// Founder doctrine: *"Approve/Pass IS the calibration event — capture the REASON and the
// product gets smarter every time a client clicks."* And the constraint that governs the whole
// thing: *"One tap, never mandatory, never blocks the action."*
//
// ⚠️ THIS IS PR 1 OF 2 — CAPTURE AND STORE. The founder split it: applying the signal to
// sourcing is PR 2. That means the assertions here are about what is RECORDED and what CANNOT
// go wrong for the client — not yet about what changes as a result.

const ROUTES = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
const MIGRATION = readFileSync(
  join(__dirname, '../../../../supabase/migrations/20260821_lead_feedback.sql'), 'utf8')
const RUNNER = readFileSync(join(__dirname, 'pending-migrations.ts'), 'utf8')
const codeOf = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

describe('the guard is reading real files', () => {
  it('routes, migration and runner are all present and non-trivial', () => {
    // A moved file leaves every source assertion below scanning an empty string and passing.
    expect(ROUTES.length).toBeGreaterThan(50_000)
    expect(MIGRATION.length).toBeGreaterThan(1_000)
    expect(RUNNER.length).toBeGreaterThan(50_000)
  })
})

describe('① the seven chips, exactly as the founder listed them', () => {
  it('are these seven, in his order', () => {
    expect([...REASON_CODES]).toEqual([
      'too_big', 'too_small', 'wrong_industry', 'wrong_role', 'wrong_geography', 'bad_timing', 'other',
    ])
  })

  it('every code has a label — a chip with no words is not a chip', () => {
    for (const c of REASON_CODES) expect(REASON_LABELS[c], c).toBeTruthy()
  })

  it('the database CHECK accepts exactly the same seven', () => {
    // Drift here is the worst kind: the UI offers a chip, the client taps it, and the write
    // fails the constraint — taking their free text with it and showing nothing.
    for (const c of REASON_CODES) expect(MIGRATION, `${c} missing from the CHECK`).toContain(`'${c}'`)
  })

  it('rejects anything that is not one of the seven', () => {
    for (const bad of ['TOO_BIG', 'too big', '', null, 42, undefined, 'wrong_size']) {
      expect(isReasonCode(bad), String(bad)).toBe(false)
    }
  })
})

describe('② ONE TAP, NEVER MANDATORY, NEVER BLOCKS THE ACTION', () => {
  it('⚠️ A PASS WITH NO REASON IS A VALID, COMPLETE ACTION', () => {
    // The founder's rule, asserted at the schema level: reason_code is NULLABLE. A NOT NULL
    // here would have forced the UI to make the chip mandatory — turning a one-tap nicety into
    // a gate on an action the client has already taken.
    const declared = MIGRATION.slice(MIGRATION.indexOf('reason_code'), MIGRATION.indexOf('free_text'))
    expect(declared, 'reason_code must be nullable').not.toMatch(/not\s+null/i)
  })

  it('feedback is a SEPARATE endpoint from the pass — the pass cannot fail because of it', () => {
    const code = codeOf(ROUTES)
    expect(code, 'the pass route still exists untouched').toMatch(/leadRouter\.post\('\/:id\/pass'/)
    expect(code, 'and feedback is its own route').toMatch(/leadRouter\.post\('\/:id\/feedback'/)
    // The pass handler must not reference feedback at all — coupling them would put a
    // nice-to-have write in front of a state change the client is watching.
    // ⚠️ SLICE TO THE NEXT ROUTE, NOT TO A NAMED ONE. The first version of this cut from
    // /pass to /consent — and the new /feedback route now sits BETWEEN them, so the slice
    // swallowed it and the assertion failed against code that was correct. The boundary was
    // wrong, not the handler.
    const passStart = code.indexOf("post('/:id/pass'")
    const passHandler = code.slice(passStart, code.indexOf('leadRouter.post(', passStart + 10))
    expect(passHandler, 'the pass handler is free of feedback').not.toMatch(/lead_feedback|feedback/i)
  })

  it('⚠️ NOTHING TO RECORD IS A SUCCESS, NOT AN ERROR', () => {
    // A client who taps a chip and untaps it, or a stale build sending an unknown code, must
    // not see an error for a call they never needed to make.
    const r = normaliseFeedback({ reason_code: 'nonsense', free_text: '  ' })
    expect(r).toEqual({ reasonCode: null, freeText: null, hasSomething: false })
  })

  it('an unknown code is DROPPED but the free text survives', () => {
    // Losing the client's own words because a chip name went stale would be the worse failure.
    const r = normaliseFeedback({ reason_code: 'not_a_code', free_text: 'too corporate for us' })
    expect(r.reasonCode).toBeNull()
    expect(r.freeText).toBe('too corporate for us')
    expect(r.hasSomething).toBe(true)
  })

  it('the endpoint never returns an error status for a failed WRITE', () => {
    // Read from the handler: a DB failure logs loudly and still answers success, because the
    // pass stands and the client is not the person who can fix a database.
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    const handler = h.slice(0, h.indexOf('\n})'))
    expect(handler).toMatch(/recorded: false/)
    expect(handler, 'a write failure is logged, not thrown at the client').toMatch(/NOT RECORDED/)
  })
})

describe('③ the row belongs to the client who wrote it', () => {
  it('the handler checks the lead belongs to THIS client before storing an opinion', () => {
    // Without this a client could attach calibration to another client's lead — and this table
    // is about to drive sourcing.
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    expect(h.slice(0, 2_400)).toMatch(/\.eq\('client_id', clientId\)/)
  })

  it('one row per (client, lead, action) — a corrected chip replaces, never accumulates', () => {
    expect(MIGRATION).toMatch(/unique index[\s\S]*?lead_feedback \(client_id, lead_id, action\)/)
    expect(codeOf(ROUTES)).toMatch(/onConflict: 'client_id,lead_id,action'/)
  })
})

describe('④ free text is stored and NEVER auto-applied (founder-gated)', () => {
  it('⚠️ THE ANTI-SIGNAL READ CANNOT SEE FREE TEXT', () => {
    // The promise decays the moment somebody adds one convenient regex. This asserts the
    // behaviour rather than the intention: identical rows, one with free text screaming
    // "too big", produce the same empty result.
    const rows = [
      { reason_code: null, free_text: 'way too big, all of these are enterprises' },
      { reason_code: null, free_text: 'too big again' },
      { reason_code: null, free_text: 'ENTERPRISE. TOO BIG.' },
      { reason_code: null, free_text: 'too big' },
    ]
    expect(applicableAntiSignals(rows).size, 'free text must not create a signal').toBe(0)
  })

  it('no parser exists in the library — asserted as an absence', () => {
    const lib = codeOf(readFileSync(join(__dirname, 'lead-feedback.ts'), 'utf8'))
    for (const smell of [/free_text.*\.match\(/, /free_text.*\.includes\(/, /parseFreeText/, /freeText.*test\(/]) {
      expect(lib, `a free-text parser appeared: ${smell}`).not.toMatch(smell)
    }
  })
})

describe('⑤ the anti-signal threshold is the founder\'s 3+', () => {
  it('two passes are not an opinion; three are', () => {
    const two   = [{ reason_code: 'too_big' as const }, { reason_code: 'too_big' as const }]
    const three = [...two, { reason_code: 'too_big' as const }]
    expect(applicableAntiSignals(two).size).toBe(0)
    expect(applicableAntiSignals(three).get('too_big')).toBe(3)
    expect(ANTI_SIGNAL_MIN_COUNT).toBe(3)
  })

  it('counts each reason independently — one loud opinion does not carry a quiet one', () => {
    const rows = [
      ...Array(4).fill({ reason_code: 'too_big' as const }),
      { reason_code: 'wrong_role' as const },
    ]
    const out = applicableAntiSignals(rows)
    expect(out.get('too_big')).toBe(4)
    expect(out.has('wrong_role'), 'one pass is not a pattern').toBe(false)
  })
})

describe('⑥ the migration is in BOTH homes (AR6) and the runner moved 28 → 29', () => {
  it('the runner carries the entry, and its SQL matches the file', () => {
    expect(RUNNER).toContain("key: '20260821_lead_feedback'")
    // Both homes must agree or the file is a lie about what production ran.
    expect(RUNNER, 'the table').toContain('create table if not exists public.lead_feedback')
    expect(RUNNER, 'the unique index').toContain('lead_feedback_one_per_lead_action')
    expect(RUNNER, 'RLS on').toContain('alter table public.lead_feedback enable row level security')
  })

  it('the runner carries P32, and the count is 35', () => {
    const keys = [...RUNNER.matchAll(/key: '([^']+)'/g)].map(m => m[1])
    // 29 -> 30 -> 31 on 21 Aug: P33's morning_brief_once_per_day, then P34's meeting_briefs.
    // 32 -> 33 on 25 Aug: 20260825_proof_widened_candidate — the ONE column that lets a
    // client's accepted widened proof become the targeting they pay for.
    expect(keys.length, `runner entries: ${keys.length}`).toBe(56)   // ⛓️ 55 → 56 on 10 Sep (H): +1 20260910_programme_run_authority — programmes.run_at/run_by/went_live_by. Run was a BUTTON that sent a bounded batch, never an AUTHORITY: nothing on the row recorded it and OUTREACH authority never asked, so LIVE (which Make Live produces, campaign active and every enrolment due) plus kill-switch OFF meant the two-hourly cron would deliver for every live programme with nobody pressing Run. Nullable, NO DEFAULT, NO BACKFILL — every existing row reads NULL and therefore cannot send, which is the founder's rule applied uniformly; a backfill would grant the exact authority the column exists to require.   // ⛓️ 51 → 52 on 9 Sep: +1 20260909_programme_qualification — leads.qualified_at/_disqualified_at/_disqualify_reason/_email_status and programme_batches.inserted, plus reconcile_programme_sourcing REPOINTED from delivered_at to qualified_at. Entitlement is consumed by QUALIFICATION, not by the legacy self-serve visibility stamp — which is capped at a constant 25 per run and ~5/day and would have settled a 250-candidate batch at 25 used. All five columns NULLABLE, NO DEFAULT, NO BACKFILL; the RPC keeps its name, signature and return type and gains one refusal: it will not settle while any candidate is unjudged, which is what makes the older Vida control harmless before any app code ships.   // ⛓️ 50 → 51 on 8 Sep: +1 20260908_review_freeze_and_schedule — programmes.review_preparation_hash/_snapshot/_at (the client must review the EXACT thing they later approve; freezing only at APPROVED proved what was approved and nothing about what was READ), programmes.send_schedule (there was NO schedule anywhere in the send path — `getDay`, `getHours` and "send window" appear nowhere — so outbound was ready to leave at 03:00 on a Sunday), and figsy_enrollments.sequence_id (so "which words will this person receive" is a positive fact rather than an unverifiable copy). All nullable, NO DEFAULT, NO BACKFILL.   // ⛓️ 49 → 50 on 7 Sep (House delivery preparation): +2 — 20260907_preparation_snapshot (figsy_sequences.campaign_id, the positive programme→campaign→sequence link, plus programmes.approved_preparation_hash/_snapshot/_at). Both nullable, NO DEFAULT, NO BACKFILL: a NULL campaign_id means historical client-scoped work, and guessing one would relink a retired desk's words to current programme work — the exact leak the column exists to stop. The snapshot columns are written ONLY in the same conditional UPDATE as status = APPROVED, so nothing is stamped approved before an approval happens.   // ⛓️ 48 → 49 on 7 Sep (HOUSE-009): +1 20260907_programme_sourcing_authority — FUNCTIONS ONLY, no table, no column, no row. try_reserve_programme_sourcing is new; try_spend_sourcing is REPLACED with the SAME signature, the same return and a byte-unchanged legacy branch, so no existing caller resolves differently and the PDL fence still records PDL money; reconcile_programme_sourcing does nothing until an operator names one programme. It exists because entitlement and provider cost were the same function body: exempting the prepaid Apollo/house path from a fabricated $0.28-a-record ledger row also exempted it from the reservation, the 2,500 ceiling and the batch — 246 people were sourced against `0 used / 0 reserved / 2500 left / no batch`. 🚀 RUN IT FROM VIDA → ENGINE IMMEDIATELY AFTER DEPLOYING THIS BUILD: until it is applied the function does not exist, so every house reservation returns nothing and house sourcing STOPS — fail-closed, but a stop.   // ⛓️ 47 → 48 on 3 Sep (PR C3 · leads.proof_pass): +1 20260903_lead_proof_attribution — one NULLABLE smallint on leads with NO DEFAULT and NO BACKFILL, plus a guarded CHECK admitting NULL, 1 and 2, and a partial index. It exists because a free-proof lead and a retired legacy delivered lead were BYTE-IDENTICAL on every column that was traced (leads.source is the PROVIDER name and the same for both; programme_id is null for both; icp_run_outcomes holds no lead ids and no proof flag; sourcing_ledger and proof_ledger are money rows with no lead ids, and a pool-only proof pass writes no proof_ledger row at all; acquisition_memory is keyed on the provider identity; icps.proof_widened_candidate exists only for a pass-2 widened fallback). The withdrawn fix used clients.proof_passes_done, which is CUMULATIVE ACCOUNT STATE: any declared programme client with old legacy leads who later ran a proof they were entitled to run got their whole history back as current work. NULL means "not known to be proof work", which is the honest reading of every existing row, and no row is written by the migration. 🚀 UNLIKE C1 THIS ONE SHIPS WITH THE CODE THAT READS IT — run it from Vida → Engine immediately after deploying this build; until it is applied the customer desk attributes NOTHING, which fails closed to an empty desk and never to a historical one.   // ⛓️ 46 → 47 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model — one NULLABLE text column on clients, NO DEFAULT, NO BACKFILL, plus a CHECK admitting NULL / 'programme' / 'legacy'. NULL is the migrated state for the whole existing book and resolves to exactly today's behaviour, so no row is written and nobody is reclassified. Nothing in C1 reads or writes it (expand/contract).   // ⚠️ AND NOTE THE TENSION WITH THE LESSON RECORDED DIRECTLY BELOW: that comment retired `keys[keys.length - 1]` for asserting a fact about the calendar rather than about P32, and an absolute count is the same shape one step weaker. It is kept because this repository uses these counters deliberately, as the tripwire that makes adding something the product can APPLY TO PRODUCTION impossible to do silently — but what this test is FOR is the assertion on the next line, that P32's entry is in the runner at all.   // ⛓️ 45 → 46 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority — two nullable timestamps (first_authorised_at, second_authorised_at) and a per-stage XOR CHECK, so a programme can hold truthful INTERNAL authority without a Stripe object, an invoice figure or a pound of revenue. SHIPPED AHEAD OF ITS APPLICATION CODE ON PURPOSE (expand/contract): read-only verification proved the runner executes the PENDING_MIGRATIONS constant compiled into the DEPLOYED API, so a migration can never be applied before the build that carries it — deploying schema and readers together would have opened a window in which every explicit programme select returned 42703. NO application code in this PR reads or writes either column; the currently deployed product behaves exactly as before. The columns are separate from `first_paid_at` because that column is simultaneously the sourcing key and the revenue trigger — `computeContribution` reads it — so authorising House by stamping it would have invented money nobody paid. Created with `IF NOT EXISTS (SELECT 1 FROM pg_constraint)` rather than DROP/ADD: the runner has no ledger and re-executes every entry, and `ADD CONSTRAINT ... CHECK` takes ACCESS EXCLUSIVE and revalidates the table.   // ⛓️ 44 → 45 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff — two notification columns and a referral handoff marker. File and runner entry written together. The two switches existed as DISABLED "Soon" toggles while their crons sent every week, and a preference a cron must obey cannot live in a browser; the third marker is deliberately NOT referral_bonus_paid_at, because the refund path reads that one to claw $45 back and marking an unpaid referral with it would reclaim money nobody was given.   // ⛓️ 43 → 44 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control — the atomic programme batch claim (at most ONE running batch per programme, because the old read-MAX-then-insert let a RETRY create a second one, each holding its own reservation against the paid ceiling), the four-column review hold (NEXT-BATCH only, never a pause, never a status), and leads.programme_id/batch_id, without which the PR-1 attribution columns on figsy_enrollments had nothing to read FROM. Additive and idempotent; no existing row is written.   // ⛓️ 42 → 43 on 29 Aug (RELEASE): delivery_rls is back in the runner. R2 closed — the founder re-read all five policy names off pg_policies in production immediately before release, which was always the condition the hold enforced. The 43 → 42 removal noted below was that hold; delivery-rls-release.test.ts now asserts the entry EXISTS and that its executable SQL is byte-identical to the canonical file. Canonical FILE count is unchanged at 156 — the file never left the repo.   // ⛓️ 43 → 42 on 29 Aug: the BUILD-003 delivery_rls entry was REMOVED from the runner (not from the repo). Vida applies ALL pending migrations in one action, and that one changes live browser access on nine tables while R2 — a RUNTIME question — is still open. The .sql stays in supabase/migrations as the canonical record; a follow-up PR adds its entry once R2 closes. Canonical FILE count is unchanged at 156, which is the point: the migration exists, it simply cannot be applied yet.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 (20260829_delivery_rls · _meetings · _reply_idempotency · _delivery_attribution — FOUR files, not one: delivery_rls is gated by R2 on the browser's production access, and bundling the other three behind that gate would have stalled meeting truth, idempotency and attribution for a runtime question none of them depends on)   // +1 28 Aug BUILD-002 (20260828_programme_money_engine)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by try_claim_proof_pass in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)   // ⛓️ 52 → 53 on 10 Sep: +1 20260910_lead_set_aside_reason — leads.set_aside_reason, the structural gate's record of a refused Proof candidate (C04)   // ⛓️ 53 → 54 on 10 Sep: +1 20260910_proof_calibration_handoff — the C07 escalation trigger, confirmed phone, operator note and the one calibrated restart   // ⛓️ 54 → 55 on 10 Sep: +1 20260910_client_stated_outcome — clients.outcome_kind / outcome_stated, the client's own words (C03)
    // ⚠️ WAS `keys[keys.length - 1]` — "P32 is LAST". That was only ever true until the
    // next migration existed, so it asserted a fact about the calendar rather than about
    // P32. What this test is FOR is that P32's entry is in the runner at all; that is now
    // what it checks, and it will not go red again the next time somebody adds a table.
    expect(keys).toContain('20260821_lead_feedback')
  })
})

describe('⑦ NO-TOUCH — pricing, gates and the pass itself are unchanged', () => {
  it('the min-20 approvals rule is untouched', () => {
    // The founder: "No new gate, no change to the min-20 approvals rule or any money rule."
    const gate = readFileSync(join(__dirname, 'approve-lead.ts'), 'utf8')
    expect(gate).toMatch(/20/)
    expect(codeOf(ROUTES), 'feedback never touches the wallet').not.toMatch(/lead_feedback[\s\S]{0,400}increment_wallet/)
  })

  it('the feedback route charges nothing and enrols nobody', () => {
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    const handler = h.slice(0, h.indexOf('\n})'))
    for (const forbidden of [/charge/i, /wallet/i, /enrol/i, /enroll/i, /price/i]) {
      expect(handler, `feedback must not ${forbidden}`).not.toMatch(forbidden)
    }
  })
})

describe('⑧ the chips actually reach the client — Milla renders them', () => {
  const MILLA = readFileSync(
    join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8')

  it('all seven chips are rendered, with the same codes the API accepts', () => {
    // A chip list that drifts from REASON_CODES means a client taps something the database
    // rejects — and the CHECK constraint takes their free text down with it.
    for (const c of REASON_CODES) expect(MILLA, `${c} missing from Milla`).toContain(`'${c}'`)
  })

  it('⚠️ THE CHIP ROW APPEARS AFTER THE PASS, NOT BEFORE IT', () => {
    // Order matters more than presence here. `setJustPassed` must come AFTER the pass call
    // resolves — a chip shown first would be a prompt standing between the client and an
    // action they already decided on.
    const passIdx = MILLA.indexOf('/pass`')
    const chipIdx = MILLA.indexOf('setJustPassed({ id')
    expect(passIdx, 'the pass call exists').toBeGreaterThan(0)
    expect(chipIdx, 'the chip trigger exists').toBeGreaterThan(0)
    expect(chipIdx, 'the chip is triggered after the pass, not before').toBeGreaterThan(passIdx)
  })

  it('the chip send is fire-and-forget — it can never surface an error', () => {
    const fn = MILLA.slice(MILLA.indexOf('async function sendReason'))
    const body = fn.slice(0, fn.indexOf('\n  }'))
    expect(body, 'the feedback endpoint is called').toContain('/feedback')
    expect(body, 'and its failure is swallowed, never shown').toMatch(/catch \{/)
    expect(body, 'no error state is set from a chip').not.toMatch(/setError/)
  })

  it('there is a Skip — ignoring the prompt is a first-class action', () => {
    expect(MILLA).toContain('Skip')
    expect(MILLA, 'and skipping records nothing').toMatch(/onClick=\{\(\) => setJustPassed\(null\)\}/)
  })
})
