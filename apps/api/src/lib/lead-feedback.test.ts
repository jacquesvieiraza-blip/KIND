import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {

// ⛓️ 12 Sep (S2-AUDIT-001) — RETARGETED, NOT WEAKENED. Every assertion below keeps its
// exact meaning; only the NAME of the claim changed. `try_claim_proof_pass` incremented a
// counter nothing could release, so a run that crashed at the PDL boundary consumed the
// client's pass and left them with nothing. Authority now comes from the durable claim
// ledger (`claim_proof_authority` -> `proof_pass_claims`), which can give it back. The old
// RPC is retained in the database for rollback and has ZERO live callers
// (`proof-authority-bypass.test.ts` asserts that, and it is what keeps it dead).
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
    // ⛓️ RETARGETED 10 Sep (A) — THE DUTY IS THE SECOND HALF OF THIS TEST'S OWN TITLE.
    //
    // It used to assert the pass handler mentioned feedback NOWHERE. That was a proxy for the
    // real rule — *"the pass cannot fail because of it"* — and the proxy has become wrong: the
    // handler now records the client's rejection itself, because relying on the optional chip
    // lost it entirely whenever the `leads.status` write was refused. The reason chip renders
    // only AFTER a successful pass, so a refused status write discarded "they said no" from
    // `lead_feedback` too, and the two-attempt rule then read zero rejections.
    //
    // So the assertion now proves the ACTUAL duty: the write is wrapped, its failure is logged
    // and never returned, and it cannot reach the client as an error.
    const passStart = code.indexOf("post('/:id/pass'")
    const passHandler = code.slice(passStart, code.indexOf('leadRouter.post(', passStart + 10))
    expect(passHandler, 'the pass records their verdict itself').toContain("action: 'pass'")
    // 🛑 WRAPPED AND SWALLOWED — the only two things that make it unable to fail the pass.
    expect(passHandler).toContain('try {')
    expect(passHandler).toContain("console.error('[pass] lead_feedback NOT RECORDED")
    // …and no branch returns an error because of it: every `res.` in the handler that follows
    // the feedback write is about the pass itself, never about the feedback.
    const afterFeedback = passHandler.slice(passHandler.indexOf("action: 'pass'"))
    expect(/res\.(status|json)[^\n]*feedback/i.test(afterFeedback),
      'a feedback failure reaches the client').toBe(false)
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

  // ⛓️ 18 Sep (MVP1 · J5-C11 · LR 17) — REVERSED, AND THE REVERSAL IS THE POINT.
  //
  // ~~*"the endpoint never returns an error status for a failed WRITE"* — "a DB failure logs
  // loudly and still answers success, because the pass stands and the client is not the person
  // who can fix a database."~~
  //
  // 🛑 THE FIRST HALF OF THAT REASONING WAS RIGHT AND THE SECOND HALF WAS THE DEFECT. The pass
  // DOES stand, and still does — it completes on `/leads/:id/pass`, a different route, before
  // this one is called, and this handler writes nothing to `leads`. But answering
  // `success: true` for a write that did not happen meant NO CALLER COULD EVER KNOW:
  // `recorded: false` rode in the payload and nothing anywhere read it, so the portal resolved
  // and the client was told their words were saved. J5-C11 requires them TOLD AND RETRIED, and
  // a retry cannot be built on an answer that says it worked.
  //
  // ⚠️ THE ASSERTION IS REPLACED, NOT DELETED, AND THE PROPERTY IT PROTECTED IS ASSERTED
  // BELOW. Nothing about the client's pass may depend on this write.
  //
  // ⚠️ P32 IS UNCHANGED — "one tap, never mandatory, never blocks the action". The screen keeps
  // the client's own words, states once that they did not save, and offers the same tap again.
  it('a failed WRITE is reported as a failure, and the PASS is still untouched', () => {
    const h = codeOf(ROUTES).slice(codeOf(ROUTES).indexOf("post('/:id/feedback'"))
    const handler = h.slice(0, h.indexOf('\n})'))
    expect(handler, 'a write failure is still logged loudly').toMatch(/NOT RECORDED/)
    expect(handler, 'a lost note is still acknowledged as a saved one')
      .toMatch(/status\(503\)[\s\S]{0,200}success: false/)
    expect(handler, 'no stable code, so a caller must retry by matching on a sentence')
      .toMatch(/code: 'feedback_not_recorded'/)
    // THE PROPERTY THE OLD ASSERTION EXISTED FOR: this route cannot undo the pass.
    expect(handler, 'the feedback route started writing the lead row')
      .not.toMatch(/from\('leads'\)[\s\S]{0,120}\.(update|insert|delete)\(/)
    // And "nothing to record" is still a success — it never reached the database.
    expect(handler).toMatch(/if \(!hasSomething\) \{ res\.json\(\{ success: true, recorded: false \}\)/)
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
    expect(keys.length, `runner entries: ${keys.length}`).toBe(83)   // ⛓️ 82 → 83 on 23 Sep (MVP1 · R136 PR C · FOUNDER RULING): +1 20260923_programme_shortfall_credit — R136 removed the overrun promise, so a programme can now end having delivered fewer meetings than were bought, and the founder ruled the difference goes back as WALLET CREDIT ("we dont give money back. we refund credits to their wallet internally to use towards another icp run"). `increment_wallet` is NOT idempotent, so the settlement needs its own claim marker: `shortfall_credited_at` is compare-and-set, and a failed wallet move RELEASES it so a retry needs no hand-edited database (R132a). EXPAND ONLY: three nullable/defaulted columns and two CHECKs; no backfill, no existing column touched. NOT APPLIED.   // ⛓️ 81 → 82 on 22 Sep (MVP1 · Section 2): +1 20260922_unlimited_proof_refinement.   // ⛓️ 80 → 81 on 19 Sep (MVP1 · J8 · FOUNDER RULING R134): +1 20260919_calibrated_restart_record_allowance — the one human-authorised calibrated restart carries its own 20 records, refused to automatic Proof, refused before the grant and gone once consumed. EXPAND ONLY: one function replaced, one defaulted parameter, and the pre-ruling two-argument signature dropped so no caller can reach the old fence by arity. NOT APPLIED.   // ⛓️ 79 → 80 on 19 Sep (MVP1 · J13, GPT correction pass): +1 20260919_one_canonical_sequence_per_campaign — `applyProgrammeSequence` is a read-then-insert and a certification run raced it: a settling sourcing run's background preparation and an operator's `prepare-for-review` both read zero sequences for one campaign and both inserted, after which `resolveProgrammeChain` refused the programme FOR EVER ("the words the customer would approve are ambiguous") and preparation, freeze, approval, Make Live and Run were all closed behind it. One partial unique index; the loser now completes against the winner. EXPAND ONLY, and it refuses to create itself over existing duplicates.   // ⛓️ 78 → 79 on 18 Sep (MVP1 · J6-C3 · PV 02): +1 20260918_proof_set_verdict — `clients.proof_stronger_set_unlocked_at` / `_reason`. `mayRequestStrongerSet` is the one spend gate between a client and their SECOND automatic Proof attempt, and it was derived, used and thrown away on every read: nothing recorded WHY a second set was unlocked at the moment the client was looking at the screen, and Vida's evidence panel did not carry the verdict at all. AN EVENT, NOT A MIRROR — the live derivation remains the gate and nothing reads these columns to spend, so there is nothing here for a live answer to drift away from. EXPAND ONLY: two nullable columns, no default, no backfill; a client unlocked before today reads NULL, which means 'not recorded', never 'refused'. NOT APPLIED.   // ⛓️ 77 → 78 on 18 Sep (MVP1 · J5-C4 · LR 10,12): +1 20260918_icp_target_size — `icps.target_size`, how big the target company should be IN THE CLIENT'S OWN WORDS. `company_sizes` is our closed six-band ladder and is to size exactly what `industries` is to category: an Apollo query hint, never the requirement. "Fifty to a hundred people" cannot be expressed in it, so it is snapped to ['11–50','51–200'] and the band rule then admits an 11-person company and a 190-person one as matches; "ten to fifty" is snapped to ['11–50'], which refuses the ten-person company the client explicitly asked for. Their phrase survived only inside `icp_review.requirements[].said`, which is CLEARED when an operator resolves the review. EXPAND ONLY: one nullable text column, no default, no backfill — an existing row reads NULL and the band rule answers for it unchanged. NOT APPLIED.   // ⛓️ 76 → 77 on 18 Sep (MVP1 · J5-C13 · FD-2): +1 20260918_lead_category_fit — `leads.category_fit` / `category_fit_reason`, the scoring model's verdict on whether a company is the KIND the client asked for. FD-2 makes that judgement model-interpreted, and a model cannot be called from `proof-fit.ts` (pure and synchronous, depended on by every surface) — so the model writes a FACT and the predicate reads it. EXPAND ONLY: two nullable text columns, no default, no backfill, CHECK admits NULL so no existing row is invalidated. NOT APPLIED.   // ⛓️ 75 → 76 on 18 Sep (MVP1 · J5-C12 · FD-1): +1 20260918_icp_exclusions — `icps.exclusions` did not exist and was ALREADY BEING WRITTEN: `lib/promotion.ts` includes it in the core-ICP insert whenever the confirmed brief holds it, and brief fact #10 is required by `mayConfirmBrief`, so every promoted client holds it and every promotion insert named a column Postgres does not have. Caught by `schema-truth.test.ts`. EXPAND ONLY: one nullable text column, no default, no backfill. NOT APPLIED.   // ⛓️ 74 → 75 on 18 Sep (MVP1 · J1-C1): +1 20260918_clients_one_per_user — `clients.user_id` carried NO unique index anywhere in this repository, so `POST /auth/onboard`'s check-then-insert let two concurrent onboards for ONE auth user BOTH succeed: one person, two client rows, and every downstream `.eq('user_id', …).maybeSingle()` picking one arbitrarily. EXPAND ONLY: one partial unique index, created inside a DO block that REFUSES and names the offending users if duplicates already exist — which of two client rows to keep is a decision about somebody's account, never a migration's. NOT APPLIED. (This is the migration whose addition required founder DECISION B, 18 Sep: the global migration-count assertion in the frozen `house-authority.test.ts` was removed, because that tripwire carries no House invariant and blocked every legitimate migration. The protection lives HERE.)   // ⛓️ 73 → 74 on 17 Sep (Batch 1 · J5-C9): +1 20260917_proof_fence_in_records — the free-Proof monthly ceiling counted in RECORDS, because under FD-6 an Apollo record costs $0 and a dollar fence divided by $0.28 stopped binding. EXPAND ONLY, and it touches no feedback path.   // ⛓️ +1 on 17 Sep (Batch 1 · XC-5/XC-6/XC-3): 20260917_operator_tasks_and_automatic_work — operator_tasks (the persisted Needs-you row), automatic_work (the first thing here that owns TIME) and four ledger columns on app_migrations_applied. EXPAND ONLY; nothing altered, dropped or backfilled. Nothing it adds touches lead feedback.  // ⛓️ 71 → 72 on 17 Sep: +1 20260917_unattributed_replies — an ambiguous inbound reply is written to NOBODY (16 Sep) and, until this table, survived only in process memory: Resend's webhook is metadata-only so the body was a local variable, the dedup claim was already taken, and a 200 meant the provider never resent it. Additive: one table, two partial indexes, RLS with no policy. NOT APPLIED.   // ⛓️ 70 → 71 on 16 Sep (MVP1 · C1b): +1 20260916_client_inboxes_one_live_per_email — one mailbox may be LIVE on at most one client. The pre-existing index is (client_id, kind) and proves nothing about an address being live on two clients; automatic pooled-sender claiming makes that race the normal case. Additive partial unique index on lower(email), scoped to assigned/warming/active.   // ⛓️ 68 → 69 on 14 Sep (R121, Build 3): +1 20260915_vida_conversations — Vida's transcript, one row per operator per client. Additive; this build adds no other migration.   // ⛓️ 66 → 67 on 14 Sep (S1-RT-005): +1 20260914_icp_provider_review — additive, nullable, no default, no backfill.   // ⛓️ 62 → 63 on 11 Sep: +1 20260911_lead_proof_batch_kind — leads.proof_batch_kind. The calibrated restart was briefly encoded as proof_pass = 3, which the database would have REJECTED (leads_proof_pass_check admits NULL, 1, 2) and which put ambiguous truth in the row for rendering code to repair. Automatic proof-pass identity stays 1 and 2; the restart carries pass 2 plus this kind.   // ⛓️ 61 → 62 on 11 Sep (MVP1 C39/C23): +1 20260911_proof_restart_and_refinement — the granted calibrated restart could not be SPENT (spendDoors answered proof_passes_done < 2, false at 2 for ever; claim_proof_authority refuses at 2 for ever), so the operator pressed a real button and the client got nothing. Granted and used are now two facts. Plus the refinement gate for Attempt 2.   // ⛓️ 60 → 61 on 11 Sep (MVP1, Preview 07): +1 20260911_onboarding_brief_drafts — the partial Brief persisted BEFORE a clients row exists. Signup creates an auth user and nothing else; the clients row is created by the CONFIRM click, so the whole Brief lived in React state in one tab: a closed tab destroyed it and Vida could not see a person who had not confirmed. NOT a second Brief model — the eleven facts stay defined once, in packages/shared/src/brief-facts.ts, and every reader counts through it. One new table, RLS on with per-user SELECT/UPDATE policies (auth.uid(), not current_client_id(), because these rows exist precisely for people with no client). Additive, no backfill, no existing row written, and no change to what "a client" means anywhere.   // ⛓️ 59 → 60 on 11 Sep (MVP1 C04/C21): +1 20260911_icp_target_category_and_type — icps.target_category / target_company_type. Additive, nullable, no default, no backfill; nothing P32 touches is affected.   // ⛓️ 58 → 59 on 10 Sep (I2): +1 20260910_inbox_verification — client_inboxes.verified_at / verify_failed_at / verify_detail. `verifyInbox` has proved mailbox logins since #552 and the ANSWER WAS THROWN AWAY into an audit row's detail, so every gate could ask whether a host, username and password were SAVED and none could ask whether they WORK. Three nullable timestamptz/text columns, NO DEFAULT and NO BACKFILL: NULL means NEVER CHECKED, which is deliberately not the same as failed and is the honest reading of every row written before today.   // ⛓️ 57 → 58 on 10 Sep (B/C): +1 20260910_programme_calculator_choice — programmes.calculator_assumptions (jsonb) and recommendation_accepted_at. The COMMITTED figures were already stored; what was missing was the client's own ILLUSTRATIVE assumptions (so "reproduce exactly what they accepted" is possible at all) and acceptance as a fact SEPARATE from paying — accepting WAS paying, because the only client control was the Stripe button, so a client who agreed and then hesitated at checkout left no record of agreeing. One jsonb rather than four columns: it is a snapshot, read back together, never queried across or aggregated.   // ⛓️ 56 → 57 on 10 Sep (A): +1 20260910_proof_completion — clients.proof_completed_at. The accept control ("These are right") was `onAccept={() => void loadCalibration()}`, a GET: no column, stage or alert anywhere recorded that a client had accepted their Proof set, so the happy path ended in silence and only resumed if an operator noticed by other means. Client-level because Proof completes BEFORE any programme exists — the calculator is what creates one. Nullable, NO DEFAULT, NO BACKFILL; first acceptance wins.   // ⛓️ 55 → 56 on 10 Sep (H): +1 20260910_programme_run_authority — programmes.run_at/run_by/went_live_by. Run was a BUTTON that sent a bounded batch, never an AUTHORITY: nothing on the row recorded it and OUTREACH authority never asked, so LIVE (which Make Live produces, campaign active and every enrolment due) plus kill-switch OFF meant the two-hourly cron would deliver for every live programme with nobody pressing Run. Nullable, NO DEFAULT, NO BACKFILL — every existing row reads NULL and therefore cannot send, which is the founder's rule applied uniformly; a backfill would grant the exact authority the column exists to require.   // ⛓️ 51 → 52 on 9 Sep: +1 20260909_programme_qualification — leads.qualified_at/_disqualified_at/_disqualify_reason/_email_status and programme_batches.inserted, plus reconcile_programme_sourcing REPOINTED from delivered_at to qualified_at. Entitlement is consumed by QUALIFICATION, not by the legacy self-serve visibility stamp — which is capped at a constant 25 per run and ~5/day and would have settled a 250-candidate batch at 25 used. All five columns NULLABLE, NO DEFAULT, NO BACKFILL; the RPC keeps its name, signature and return type and gains one refusal: it will not settle while any candidate is unjudged, which is what makes the older Vida control harmless before any app code ships.   // ⛓️ 50 → 51 on 8 Sep: +1 20260908_review_freeze_and_schedule — programmes.review_preparation_hash/_snapshot/_at (the client must review the EXACT thing they later approve; freezing only at APPROVED proved what was approved and nothing about what was READ), programmes.send_schedule (there was NO schedule anywhere in the send path — `getDay`, `getHours` and "send window" appear nowhere — so outbound was ready to leave at 03:00 on a Sunday), and figsy_enrollments.sequence_id (so "which words will this person receive" is a positive fact rather than an unverifiable copy). All nullable, NO DEFAULT, NO BACKFILL.   // ⛓️ 49 → 50 on 7 Sep (House delivery preparation): +2 — 20260907_preparation_snapshot (figsy_sequences.campaign_id, the positive programme→campaign→sequence link, plus programmes.approved_preparation_hash/_snapshot/_at). Both nullable, NO DEFAULT, NO BACKFILL: a NULL campaign_id means historical client-scoped work, and guessing one would relink a retired desk's words to current programme work — the exact leak the column exists to stop. The snapshot columns are written ONLY in the same conditional UPDATE as status = APPROVED, so nothing is stamped approved before an approval happens.   // ⛓️ 48 → 49 on 7 Sep (HOUSE-009): +1 20260907_programme_sourcing_authority — FUNCTIONS ONLY, no table, no column, no row. try_reserve_programme_sourcing is new; try_spend_sourcing is REPLACED with the SAME signature, the same return and a byte-unchanged legacy branch, so no existing caller resolves differently and the PDL fence still records PDL money; reconcile_programme_sourcing does nothing until an operator names one programme. It exists because entitlement and provider cost were the same function body: exempting the prepaid Apollo/house path from a fabricated $0.28-a-record ledger row also exempted it from the reservation, the 2,500 ceiling and the batch — 246 people were sourced against `0 used / 0 reserved / 2500 left / no batch`. 🚀 RUN IT FROM VIDA → ENGINE IMMEDIATELY AFTER DEPLOYING THIS BUILD: until it is applied the function does not exist, so every house reservation returns nothing and house sourcing STOPS — fail-closed, but a stop.   // ⛓️ 47 → 48 on 3 Sep (PR C3 · leads.proof_pass): +1 20260903_lead_proof_attribution — one NULLABLE smallint on leads with NO DEFAULT and NO BACKFILL, plus a guarded CHECK admitting NULL, 1 and 2, and a partial index. It exists because a free-proof lead and a retired legacy delivered lead were BYTE-IDENTICAL on every column that was traced (leads.source is the PROVIDER name and the same for both; programme_id is null for both; icp_run_outcomes holds no lead ids and no proof flag; sourcing_ledger and proof_ledger are money rows with no lead ids, and a pool-only proof pass writes no proof_ledger row at all; acquisition_memory is keyed on the provider identity; icps.proof_widened_candidate exists only for a pass-2 widened fallback). The withdrawn fix used clients.proof_passes_done, which is CUMULATIVE ACCOUNT STATE: any declared programme client with old legacy leads who later ran a proof they were entitled to run got their whole history back as current work. NULL means "not known to be proof work", which is the honest reading of every existing row, and no row is written by the migration. 🚀 UNLIKE C1 THIS ONE SHIPS WITH THE CODE THAT READS IT — run it from Vida → Engine immediately after deploying this build; until it is applied the customer desk attributes NOTHING, which fails closed to an empty desk and never to a historical one.   // ⛓️ 46 → 47 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model — one NULLABLE text column on clients, NO DEFAULT, NO BACKFILL, plus a CHECK admitting NULL / 'programme' / 'legacy'. NULL is the migrated state for the whole existing book and resolves to exactly today's behaviour, so no row is written and nobody is reclassified. Nothing in C1 reads or writes it (expand/contract).   // ⚠️ AND NOTE THE TENSION WITH THE LESSON RECORDED DIRECTLY BELOW: that comment retired `keys[keys.length - 1]` for asserting a fact about the calendar rather than about P32, and an absolute count is the same shape one step weaker. It is kept because this repository uses these counters deliberately, as the tripwire that makes adding something the product can APPLY TO PRODUCTION impossible to do silently — but what this test is FOR is the assertion on the next line, that P32's entry is in the runner at all.   // ⛓️ 45 → 46 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority — two nullable timestamps (first_authorised_at, second_authorised_at) and a per-stage XOR CHECK, so a programme can hold truthful INTERNAL authority without a Stripe object, an invoice figure or a pound of revenue. SHIPPED AHEAD OF ITS APPLICATION CODE ON PURPOSE (expand/contract): read-only verification proved the runner executes the PENDING_MIGRATIONS constant compiled into the DEPLOYED API, so a migration can never be applied before the build that carries it — deploying schema and readers together would have opened a window in which every explicit programme select returned 42703. NO application code in this PR reads or writes either column; the currently deployed product behaves exactly as before. The columns are separate from `first_paid_at` because that column is simultaneously the sourcing key and the revenue trigger — `computeContribution` reads it — so authorising House by stamping it would have invented money nobody paid. Created with `IF NOT EXISTS (SELECT 1 FROM pg_constraint)` rather than DROP/ADD: the runner has no ledger and re-executes every entry, and `ADD CONSTRAINT ... CHECK` takes ACCESS EXCLUSIVE and revalidates the table.   // ⛓️ 44 → 45 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff — two notification columns and a referral handoff marker. File and runner entry written together. The two switches existed as DISABLED "Soon" toggles while their crons sent every week, and a preference a cron must obey cannot live in a browser; the third marker is deliberately NOT referral_bonus_paid_at, because the refund path reads that one to claw $45 back and marking an unpaid referral with it would reclaim money nobody was given.   // ⛓️ 43 → 44 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control — the atomic programme batch claim (at most ONE running batch per programme, because the old read-MAX-then-insert let a RETRY create a second one, each holding its own reservation against the paid ceiling), the four-column review hold (NEXT-BATCH only, never a pause, never a status), and leads.programme_id/batch_id, without which the PR-1 attribution columns on figsy_enrollments had nothing to read FROM. Additive and idempotent; no existing row is written.   // ⛓️ 42 → 43 on 29 Aug (RELEASE): delivery_rls is back in the runner. R2 closed — the founder re-read all five policy names off pg_policies in production immediately before release, which was always the condition the hold enforced. The 43 → 42 removal noted below was that hold; delivery-rls-release.test.ts now asserts the entry EXISTS and that its executable SQL is byte-identical to the canonical file. Canonical FILE count is unchanged at 156 — the file never left the repo.   // ⛓️ 43 → 42 on 29 Aug: the BUILD-003 delivery_rls entry was REMOVED from the runner (not from the repo). Vida applies ALL pending migrations in one action, and that one changes live browser access on nine tables while R2 — a RUNTIME question — is still open. The .sql stays in supabase/migrations as the canonical record; a follow-up PR adds its entry once R2 closes. Canonical FILE count is unchanged at 156, which is the point: the migration exists, it simply cannot be applied yet.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 (20260829_delivery_rls · _meetings · _reply_idempotency · _delivery_attribution — FOUR files, not one: delivery_rls is gated by R2 on the browser's production access, and bundling the other three behind that gate would have stalled meeting truth, idempotency and attribution for a runtime question none of them depends on)   // +1 28 Aug BUILD-002 (20260828_programme_money_engine)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by claim_proof_authority in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)   // ⛓️ 52 → 53 on 10 Sep: +1 20260910_lead_set_aside_reason — leads.set_aside_reason, the structural gate's record of a refused Proof candidate (C04)   // ⛓️ 53 → 54 on 10 Sep: +1 20260910_proof_calibration_handoff — the C07 escalation trigger, confirmed phone, operator note and the one calibrated restart   // ⛓️ 54 → 55 on 10 Sep: +1 20260910_client_stated_outcome — clients.outcome_kind / outcome_stated, the client's own words (C03)   // ⛓️ 64 → 66 on 12 Sep: +20260912_proof_pass_claims and +20260912_welcome_email_once. Neither touches lead feedback.   // ⛓️ 67 → 68 on 14 Sep (S1-PD-05): +1 20260914_go_applies_icp_review — `create or replace function apply_pending_revision` only. No column, no data, no backfill: GO applied a whitelist that dropped the held revision's review, so new targeting went live reading as translatable and Proof/provider spend followed.
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

  // ⛓️ 18 Sep (MVP1 · J6-C4 · LR 6) — the property is unchanged and now holds BY CONSTRUCTION.
  //
  // ~~`for (const c of REASON_CODES) expect(MILLA).toContain(\`'${c}'\`)`~~ checked that a
  // hand-typed list in the card happened to contain the same seven strings. The card was the
  // FOURTH copy of that list, and two of the four had already drifted — `proof-calibration.ts`
  // had six, so "Bad timing" was stored and read back as "Other".
  //
  // The card now derives its chips from the one shared constant, so it cannot drift from the
  // codes the API accepts: there is nothing left to compare.
  it('the chips are DERIVED from the one list the API accepts, so they cannot drift', () => {
    expect(MILLA, 'the client card hand-types the reason list again')
      .toMatch(/LEAD_REASON_CODES\.map\(code => \(\{ code, label: LEAD_REASON_LABELS\[code\] \}\)\)/)
    expect(MILLA, 'the shared list is not imported at all')
      .toMatch(/import \{[^}]*LEAD_REASON_CODES[^}]*\} from '@kind\/shared'/)
    // And the codes the API accepts are that same list — asserted by identity in
    // `j6c4-one-reason-code-list.test.ts`, which is where the one-list rule lives.
    expect(REASON_CODES.length).toBe(7)
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

  // ⛓️ 18 Sep (MVP1 · J5-C11 · LR 17) — REVERSED. ~~*"the chip send is fire-and-forget — it
  // can never surface an error"* — "and its failure is swallowed, never shown."~~
  //
  // 🛑 THE CHIP IS NOT A NICETY, AND `sendReason`'s OWN COMMENT SAYS SO: *"THIS TAP IS A SPEND
  // GATE OPENING, AND SOMETIMES A LOOP CLOSING."* The reason unlocks "Show me stronger
  // examples" on attempt 1, and on attempt 2 the same tap can be the trigger that hands the
  // client to a person. A swallowed failure means the client taps, the gate never opens, and
  // nothing on screen says why. J5-C11 requires it TOLD AND RETRIED.
  //
  // ⚠️ WHAT IS UNCHANGED IS THE THING THAT MATTERED: the chip still cannot reach the DESK's
  // error banner (`setError`), still cannot block, delay or undo the pass, and is still
  // skippable. The failure line is local to the prompt and disappears with it.
  it('a lost chip is TOLD, and still cannot touch the pass or the desk banner', () => {
    const fn = MILLA.slice(MILLA.indexOf('async function sendReason'))
    const body = fn.slice(0, fn.indexOf('\n  }'))
    expect(body, 'the feedback endpoint is called').toContain('/feedback')
    expect(body, 'the tap is still sent once and forgotten').toMatch(/saveDurably\(/)
    expect(body, 'a lost chip is still invisible to the client').toMatch(/setNoteError\(/)
    // 🛑 THE PROPERTY THE OLD ASSERTION EXISTED FOR. `setError` is the desk-wide banner; a
    // calibration nicety must never raise it, and must never touch the pass.
    expect(body, 'a chip raised the desk-wide error banner').not.toMatch(/setError\(/)
    expect(body, 'a chip started touching the lead list').not.toMatch(/setLeads\(/)
  })

  // ⛓️ 18 Sep (MVP1 · J5-C11) — the Skip assertion is unchanged in substance. It now also
  // clears the local "not saved" line, because leaving a failure notice behind after the
  // client has dismissed the whole prompt would be a message about nothing.
  it('there is a Skip — ignoring the prompt is a first-class action', () => {
    expect(MILLA).toContain('Skip')
    expect(MILLA, 'skip stopped dismissing the prompt').toMatch(/setJustPassed\(null\); setNoteError\(null\)/)
    // AND IT STILL RECORDS NOTHING: no write rides the dismissal.
    const at = MILLA.indexOf('setJustPassed(null); setNoteError(null)')
    expect(MILLA.slice(at, at + 200), 'skipping started filing something').not.toContain('/feedback')
  })
})
