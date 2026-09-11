import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// #273 — ONE HOME FOR MIGRATIONS, AND A GUARD THAT KEEPS IT ONE.
//
// There were three migration directories — `supabase/migrations` (94 files),
// `apps/api/src/migrations` (19) and `packages/db/src/migrations` (13) — and **not one file
// was in more than one of them**. So "where is the migration that created this table?"
// depended on which directory you happened to open first, with nothing to tell you there
// were two more. Every file now has a canonical copy in `supabase/migrations`.
//
// ── THE PREMISE THAT HAD TO BE CORRECTED FIRST ───────────────────────────────────────────
//
// #273 says to make `supabase/migrations` canonical "because it is what Vida → Engine runs".
// **It is not.** Reading `operator.ts` → `runPendingMigrations` shows the runner executes
// `PENDING_MIGRATIONS`, a TypeScript constant, and `pending-migrations.ts` says explicitly
// why: `.sql` files are not copied into `dist/` by tsc, so a file read would work locally
// and fail in production. **No directory has ever been applied to anything.** Two of the
// runner's own twelve entries had their file in `apps/api/src/migrations`, so the premise
// was not even true of the runner's contents.
//
// That makes RECORDING a migration and RUNNING one two different acts, and this file guards
// the seam between them:
//
//   ① every runner entry has a canonical FILE — because one did not, and a statement the
//      product can apply to production that no file describes is #558 in its purest form;
//   ② a tombstoned original and its canonical copy stay byte-identical — because copying
//      creates two files that can drift, and an unguarded copy is the disease, not the cure.

const REPO = join(__dirname, '../../../..')
const CANON = 'supabase/migrations'
const TOMBSTONED = ['apps/api/src/migrations', 'packages/db/src/migrations']

const sqlFiles = (dir: string) =>
  readdirSync(join(REPO, dir)).filter(f => f.endsWith('.sql')).sort()
const read = (dir: string, name: string) => readFileSync(join(REPO, dir, name), 'utf8')

/** Everything after a leading `--` comment block: the SQL a database would actually see. */
function body(text: string): string {
  const lines = text.split('\n')
  let i = 0
  while (i < lines.length && (lines[i].trim().startsWith('--') || lines[i].trim() === '')) i++
  return lines.slice(i).join('\n').trim()
}

const runnerKeys = (() => {
  const src = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
  return (src.match(/key:\s*'([^']+)'/g) ?? []).map(m => m.slice(m.indexOf("'") + 1, -1))
})()

describe('① every migration has a canonical file', () => {
  it('the two other directories add nothing the canonical one lacks', () => {
    // THE ASSERTION THIS FILE EXISTS FOR. Drop a new .sql into either stale directory and
    // the gate goes red until it also exists in the one place people look.
    const canon = new Set(sqlFiles(CANON))
    const orphans = TOMBSTONED.flatMap(d => sqlFiles(d).filter(f => !canon.has(f)).map(f => `${d}/${f}`))
    expect(orphans, `not in ${CANON}: ${orphans.join(', ')}`).toEqual([])
  })

  it('every entry the runner can apply has a file — one did not', () => {
    // `20260726_campaign_copilot_columns` existed ONLY as a template string inside
    // pending-migrations.ts. The product could apply it to production while nothing in the
    // migration record said it existed. Recovered from the constant, verbatim.
    const canon = new Set(sqlFiles(CANON))
    const fileless = runnerKeys.filter(k => !canon.has(`${k}.sql`))
    expect(fileless, `runner entries with no file in ${CANON}: ${fileless.join(', ')}`).toEqual([])
    // 12 at #273 (31 Jul); 13 from 1 Aug — #607 added `20260801_retire_trial_status`, which
    // converts legacy `trialing` subscriptions to `paused`. The count is asserted rather than
    // derived so that adding something the product can APPLY TO PRODUCTION is never a silent
    // edit — if this number moved and you did not mean it to, a migration was added.
    //
    // 14 from 6 Aug — #627 added `20260806_app_settings`, which CREATES the table the System
    // check and the PDL-cap card had both been reading for months and which existed nowhere.
    // The founder pressed Save and got "Could not find the table 'public.app_settings'". Note
    // where this entry sits: the `fileless` assertion above passed on the first run, because
    // the file and the runner entry were written together. That is the whole discipline of
    // this test, working in the intended direction rather than catching a miss.
    // 17 from 12 Aug — #383 added `20260710_increment_emails_sent`, and this counter is the
    // reason that defect is fixed rather than still hiding. The .sql file was written on
    // 10 Jul and never added here, so the atomic send-counter RPC was never created in
    // production and every send fell through to a racy fallback for a month. The file
    // existing made it LOOK applied. This number moving is what "a migration was added"
    // means — and its NOT moving, for 33 days, is what "a migration was written and never
    // run" looks like. Nothing here can catch that second case; only reading the runner can.
    //
    // 18 from 13 Aug — the SECOND instance of the very same gap, found by auditing every
    // runtime RPC rather than waiting for a symptom: `20260706_pool_atomic` had sat as a .sql
    // file since 6 Jul carrying the line "NOT auto-applied — the founder runs this by hand in
    // the Supabase SQL editor", while that editor has been unreachable the whole time. Both
    // its functions are called by routes/company.ts, which fails soft — so their absence read
    // as "not enough in the pool" rather than as an error. Added to the runner, and #372 (the
    // destroyed-credits bug inside that SQL) fixed in the same entry.
    //
    // 20 from 16 Aug — `20260816_partner_contact_details` (#202). Not a gap this time: the
    // file and the entry were written together, in the same change, which is the shape the
    // two findings above were arguing for. It carries address/country/phone so a partner's
    // contract is TAILORED when the seat is created rather than hand-filled afterwards —
    // the founder's review of the pack: "i should not need to fill anything out."
    //
    // 21 from 16 Aug — `20260816_partner_onboarding_flow` (R42). Same shape again: file and
    // entry written together. It carries the states that decide whether a referral code
    // resolves at all, so a .sql sitting unrun here would mean a partner who has signed
    // everything still cannot go live.
    //
    // 22 from 17 Aug — `20260817_seller_ramp` (#654). File and entry written together again.
    //
    // 23 from 19 Aug — `20260819_rls_advisor_fixes` (HC-7). File and entry written together.
    // This one is different in kind from every entry above it: it was not prompted by a
    // build, a test or a review, but by the FOUNDER opening Supabase's Security Advisor and
    // finding four CRITICAL errors on production — two of them tables created by the 16–17
    // Aug partner arc that shipped with row-level security off. Nothing we owned asked that
    // question, which is why describe ③ below now asks it of every future table.
    //
    // 24 from 19 Aug, the same day — `20260819_pool_pnl_service_role_grant`, the CORRECTION
    // to the entry above. security_invoker cleared the advisor error and simultaneously took
    // auth.users away from the view's own reader, so Money Path's pool section broke on
    // deploy. Chained rather than amended: the first entry stays exactly as it ran in
    // production, and the correction is a separate, dated, readable act.
    expect(runnerKeys).toHaveLength(61)   // ⛓️ 60 → 61 on 11 Sep (MVP1, Preview 07): +1 20260911_onboarding_brief_drafts — the partial Brief persisted BEFORE a clients row exists. Signup creates an auth user and nothing else; the clients row is created by the CONFIRM click, so the whole Brief lived in React state in one tab: a closed tab destroyed it and Vida could not see a person who had not confirmed. NOT a second Brief model — the eleven facts stay defined once, in packages/shared/src/brief-facts.ts, and every reader counts through it. One new table, RLS on with per-user SELECT/UPDATE policies (auth.uid(), not current_client_id(), because these rows exist precisely for people with no client). Additive, no backfill, no existing row written, and no change to what "a client" means anywhere.   // ⛓️ 59 → 60 on 11 Sep (MVP1 C04/C21): +1 20260911_icp_target_category_and_type — icps.target_category / target_company_type. `icps.industries` was the ONLY home for a target market and it is a CLOSED SIXTEEN-VALUE LIST, so a client who said "digital marketing agencies" had nowhere for that phrase: the model either substituted whichever of the sixteen seemed nearest, or omitted the field — and an empty `industries` makes the structural-fit gate return 'yes' for every row on earth. TWO columns because they are TWO facts (founder-locked): the category is the client's own words and is authoritative, the company type is the target's organisational form and is set only from client evidence. Both nullable, NO DEFAULT, NO BACKFILL — an existing row reads NULL, which is the honest "never collected". 🚀 EXPAND/CONTRACT: apply BEFORE the code that writes them ships, same rule as clients.commercial_model.   // ⛓️ 58 → 59 on 10 Sep (I2): +1 20260910_inbox_verification — client_inboxes.verified_at / verify_failed_at / verify_detail. `verifyInbox` has proved mailbox logins since #552 and the ANSWER WAS THROWN AWAY into an audit row's detail, so every gate could ask whether a host, username and password were SAVED and none could ask whether they WORK. Three nullable timestamptz/text columns, NO DEFAULT and NO BACKFILL: NULL means NEVER CHECKED, which is deliberately not the same as failed and is the honest reading of every row written before today.   // ⛓️ 57 → 58 on 10 Sep (B/C): +1 20260910_programme_calculator_choice — programmes.calculator_assumptions (jsonb) and recommendation_accepted_at. The COMMITTED figures were already stored; what was missing was the client's own ILLUSTRATIVE assumptions (so "reproduce exactly what they accepted" is possible at all) and acceptance as a fact SEPARATE from paying — accepting WAS paying, because the only client control was the Stripe button, so a client who agreed and then hesitated at checkout left no record of agreeing. One jsonb rather than four columns: it is a snapshot, read back together, never queried across or aggregated.   // ⛓️ 56 → 57 on 10 Sep (A): +1 20260910_proof_completion — clients.proof_completed_at. The accept control ("These are right") was `onAccept={() => void loadCalibration()}`, a GET: no column, stage or alert anywhere recorded that a client had accepted their Proof set, so the happy path ended in silence and only resumed if an operator noticed by other means. Client-level because Proof completes BEFORE any programme exists — the calculator is what creates one. Nullable, NO DEFAULT, NO BACKFILL; first acceptance wins.   // ⛓️ 55 → 56 on 10 Sep (H): +1 20260910_programme_run_authority — programmes.run_at/run_by/went_live_by. Run was a BUTTON that sent a bounded batch, never an AUTHORITY: nothing on the row recorded it and OUTREACH authority never asked, so LIVE (which Make Live produces, campaign active and every enrolment due) plus kill-switch OFF meant the two-hourly cron would deliver for every live programme with nobody pressing Run. Nullable, NO DEFAULT, NO BACKFILL — every existing row reads NULL and therefore cannot send, which is the founder's rule applied uniformly; a backfill would grant the exact authority the column exists to require.   // ⛓️ 51 → 52 on 9 Sep: +1 20260909_programme_qualification — leads.qualified_at/_disqualified_at/_disqualify_reason/_email_status and programme_batches.inserted, plus reconcile_programme_sourcing REPOINTED from delivered_at to qualified_at. Entitlement is consumed by QUALIFICATION, not by the legacy self-serve visibility stamp — which is capped at a constant 25 per run and ~5/day and would have settled a 250-candidate batch at 25 used. All five columns NULLABLE, NO DEFAULT, NO BACKFILL; the RPC keeps its name, signature and return type and gains one refusal: it will not settle while any candidate is unjudged, which is what makes the older Vida control harmless before any app code ships.   // ⛓️ 50 → 51 on 8 Sep: +1 20260908_review_freeze_and_schedule — programmes.review_preparation_hash/_snapshot/_at (the client must review the EXACT thing they later approve; freezing only at APPROVED proved what was approved and nothing about what was READ), programmes.send_schedule (there was NO schedule anywhere in the send path — `getDay`, `getHours` and "send window" appear nowhere — so outbound was ready to leave at 03:00 on a Sunday), and figsy_enrollments.sequence_id (so "which words will this person receive" is a positive fact rather than an unverifiable copy). All nullable, NO DEFAULT, NO BACKFILL.   // ⛓️ 49 → 50 on 7 Sep (House delivery preparation): +2 — 20260907_preparation_snapshot (figsy_sequences.campaign_id, the positive programme→campaign→sequence link, plus programmes.approved_preparation_hash/_snapshot/_at). Both nullable, NO DEFAULT, NO BACKFILL: a NULL campaign_id means historical client-scoped work, and guessing one would relink a retired desk's words to current programme work — the exact leak the column exists to stop. The snapshot columns are written ONLY in the same conditional UPDATE as status = APPROVED, so nothing is stamped approved before an approval happens.   // ⛓️ 48 → 49 on 7 Sep (HOUSE-009): +1 20260907_programme_sourcing_authority — FUNCTIONS ONLY, no table, no column, no row. try_reserve_programme_sourcing is new; try_spend_sourcing is REPLACED with the SAME signature, the same return and a byte-unchanged legacy branch, so no existing caller resolves differently and the PDL fence still records PDL money; reconcile_programme_sourcing does nothing until an operator names one programme. It exists because entitlement and provider cost were the same function body: exempting the prepaid Apollo/house path from a fabricated $0.28-a-record ledger row also exempted it from the reservation, the 2,500 ceiling and the batch — 246 people were sourced against `0 used / 0 reserved / 2500 left / no batch`. 🚀 RUN IT FROM VIDA → ENGINE IMMEDIATELY AFTER DEPLOYING THIS BUILD: until it is applied the function does not exist, so every house reservation returns nothing and house sourcing STOPS — fail-closed, but a stop.   // ⛓️ 47 → 48 on 3 Sep (PR C3 · leads.proof_pass): +1 20260903_lead_proof_attribution — one NULLABLE smallint on leads with NO DEFAULT and NO BACKFILL, plus a guarded CHECK admitting NULL, 1 and 2, and a partial index. It exists because a free-proof lead and a retired legacy delivered lead were BYTE-IDENTICAL on every column that was traced (leads.source is the PROVIDER name and the same for both; programme_id is null for both; icp_run_outcomes holds no lead ids and no proof flag; sourcing_ledger and proof_ledger are money rows with no lead ids, and a pool-only proof pass writes no proof_ledger row at all; acquisition_memory is keyed on the provider identity; icps.proof_widened_candidate exists only for a pass-2 widened fallback). The withdrawn fix used clients.proof_passes_done, which is CUMULATIVE ACCOUNT STATE: any declared programme client with old legacy leads who later ran a proof they were entitled to run got their whole history back as current work. NULL means "not known to be proof work", which is the honest reading of every existing row, and no row is written by the migration. 🚀 UNLIKE C1 THIS ONE SHIPS WITH THE CODE THAT READS IT — run it from Vida → Engine immediately after deploying this build; until it is applied the customer desk attributes NOTHING, which fails closed to an empty desk and never to a historical one.   // ⛓️ 46 → 47 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model — one NULLABLE text column on clients with NO DEFAULT and NO BACKFILL, plus a CHECK admitting NULL, 'programme' and 'legacy'. It exists because `authorityFor(null)` reads the ABSENCE of a programme row as the positive assertion "this client is legacy", and every commercial decision inherits that: the per-lead approve/reveal routes open, the wallet gates enrolment, low-credit emails send, and Vida tells the operator the account is on the $299 pack. Founder-locked 3 Sep — House and MBF are PROGRAMME-model clients and having no active programme must not make either legacy. NULL is the migrated state for the entire existing book and resolves to exactly today's behaviour, so no row is written and no client is reclassified; a DEFAULT would have stamped historic rows with a claim nobody checked (#599). NOT folded into `clients.plan`, which selects a wallet pool and is read by normalizePlan/canEnroll/deliveryCapBalance. No index: the resolver reads one client by primary key. SHIPPED AHEAD OF ITS APPLICATION CODE (expand/contract) — no application code in C1 reads or writes it.   // ⛓️ 45 → 46 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority — two nullable timestamps (first_authorised_at, second_authorised_at) and a per-stage XOR CHECK, so a programme can hold truthful INTERNAL authority without a Stripe object, an invoice figure or a pound of revenue. SHIPPED AHEAD OF ITS APPLICATION CODE ON PURPOSE (expand/contract): read-only verification proved the runner executes the PENDING_MIGRATIONS constant compiled into the DEPLOYED API, so a migration can never be applied before the build that carries it — deploying schema and readers together would have opened a window in which every explicit programme select returned 42703. NO application code in this PR reads or writes either column; the currently deployed product behaves exactly as before. The columns are separate from `first_paid_at` because that column is simultaneously the sourcing key and the revenue trigger — `computeContribution` reads it — so authorising House by stamping it would have invented money nobody paid. Created with `IF NOT EXISTS (SELECT 1 FROM pg_constraint)` rather than DROP/ADD: the runner has no ledger and re-executes every entry, and `ADD CONSTRAINT ... CHECK` takes ACCESS EXCLUSIVE and revalidates the table.   // ⛓️ 44 → 45 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff — two notification columns and a referral handoff marker. File and runner entry written together. The two switches existed as DISABLED "Soon" toggles while their crons sent every week, and a preference a cron must obey cannot live in a browser; the third marker is deliberately NOT referral_bonus_paid_at, because the refund path reads that one to claw $45 back and marking an unpaid referral with it would reclaim money nobody was given.   // ⛓️ 43 → 44 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control — the atomic programme batch claim (at most ONE running batch per programme, because the old read-MAX-then-insert let a RETRY create a second one, each holding its own reservation against the paid ceiling), the four-column review hold (NEXT-BATCH only, never a pause, never a status), and leads.programme_id/batch_id, without which the PR-1 attribution columns on figsy_enrollments had nothing to read FROM. Additive and idempotent; no existing row is written.   // ⛓️ 42 → 43 on 29 Aug (RELEASE): delivery_rls is back in the runner. R2 closed — the founder re-read all five policy names off pg_policies in production immediately before release, which was always the condition the hold enforced. The 43 → 42 removal noted below was that hold; delivery-rls-release.test.ts now asserts the entry EXISTS and that its executable SQL is byte-identical to the canonical file. Canonical FILE count is unchanged at 156 — the file never left the repo.   // ⛓️ 43 → 42 on 29 Aug: the BUILD-003 delivery_rls entry was REMOVED from the runner (not from the repo). Vida applies ALL pending migrations in one action, and that one changes live browser access on nine tables while R2 — a RUNTIME question — is still open. The .sql stays in supabase/migrations as the canonical record; a follow-up PR adds its entry once R2 closes. Canonical FILE count is unchanged at 156, which is the point: the migration exists, it simply cannot be applied yet.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 — FOUR migrations, not one, and the split is the point: 20260829_delivery_rls (tenant isolation on the nine delivery tables) is gated by R2 on the BROWSER's access to production, so keeping meetings truth, reply idempotency and delivery attribution in the same file would have held all three behind a runtime gate none of them needs. 20260829_meetings (public.meetings — the sole source of meeting truth, replacing a nullable timestamp on a reply row that six call sites each re-counted); 20260829_reply_idempotency (provider_event_key + a PARTIAL unique index — NULL deliberately fail-open); 20260829_delivery_attribution (figsy_enrollments.programme_id + batch_id, additive and inert, the foundation PR 2 needs)   // +1 28 Aug BUILD-002 (20260828_programme_money_engine — programmes + programme_batches + the programme authority branch inside try_spend_sourcing; additive and INERT until a programme row exists, which is the property that lets the legacy $299/$4 model keep running unchanged beside it)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by try_claim_proof_pass in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)   // +1 25 Aug (20260825_proof_widened_candidate — the ONE column that lets a client's accepted widened proof become the targeting they pay for; without it a widened proof is adoptable only by inferring provenance from browser flags, copy or logs, which is not evidence); // +1 20 Aug R46 (governed_documents — R46's single home; versions chain, nothing deletes); +1 20 Aug HC-3 (smartlead_campaign_membership — the column that makes an opt-out reachable into an engine we do not control: Smartlead holds its own copy of the lead and never reads opt_out_blocklist) // +1 21 Aug P32 (20260821_lead_feedback — calibration v1: the REASON behind a Pass, so a client's correction changes their next batch instead of being recorded as a bare no); // +1 21 Aug P33 (20260822_morning_brief_once_per_day — Milla's morning brief lands in the client's own /milla thread, and ONE PER LONDON DAY is a unique index rather than a read-then-write check: two tabs opening the page in the same instant would both see 'no brief yet' and both insert, so the database settles the race and the loser re-reads the winner's row); // +1 21 Aug P34 (20260822_meeting_briefs — the client-level Meeting Brief: versions are immutable in CONTENT so an edit inserts version+1, and the authoritative brief is the highest APPROVED version, never MAX(version) — a draft at v4 must never reach a model); // +1 22 Aug FREE PROOF (20260822_free_proof_acquisition — the acquisition fence: its OWN budget and OWN ledger so free proof can never spend the paid delivery ceiling, and the reservation is taken under a lock on the SINGLETON money_settings row because locking per-client rows alone lets two prospects each read the same monthly room and both spend it);   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)   // ⛓️ 52 → 53 on 10 Sep: +1 20260910_lead_set_aside_reason — leads.set_aside_reason, the structural gate's record of a refused Proof candidate (C04)   // ⛓️ 53 → 54 on 10 Sep: +1 20260910_proof_calibration_handoff — the C07 escalation trigger, confirmed phone, operator note and the one calibrated restart   // ⛓️ 54 → 55 on 10 Sep: +1 20260910_client_stated_outcome — clients.outcome_kind / outcome_stated, the client's own words (C03)
  })

  it('the recovered one says where it came from, and that the constant still rules', () => {
    const f = read(CANON, '20260726_campaign_copilot_columns.sql')
    expect(f).toContain('RECOVERED FROM THE RUNNER')
    expect(f).toContain('copilot_mode')
    expect(f).toContain('approve_before_send')
  })
})

describe('② a copy that can drift is the disease, not the cure', () => {
  it('every tombstoned file is byte-identical to its canonical copy', () => {
    // Consolidating by COPY leaves two files that can drift — which is exactly the problem
    // #273 is about. This turns that risk into a guard: edit one without the other and the
    // gate fails, naming the pair.
    const drifted: string[] = []
    for (const dir of TOMBSTONED) {
      for (const name of sqlFiles(dir)) {
        if (body(read(dir, name)) !== body(read(CANON, name))) drifted.push(`${dir}/${name}`)
      }
    }
    expect(drifted, `body differs from the canonical copy: ${drifted.join(', ')}`).toEqual([])
  })

  it('nothing was rewritten on the way in — 32 files moved, bodies untouched', () => {
    const moved = TOMBSTONED.reduce((n, d) => n + sqlFiles(d).length, 0)
    // THIS is the number that must never move. The tombstoned directories are frozen: new
    // migrations land in the canonical directory ONLY, so 32 stays 32 forever while the
    // canonical count below grows.
    expect(moved).toBe(32)
    // The canonical directory is the 94 that were there + 32 consolidated + 1 recovered
    // = 127 at #273, + 1 (#607's 20260801_retire_trial_status) + 1 (#627's
    // 20260806_app_settings) = 129; +1 (20260806_leads_source, #599) = 130;
    // +1 (20260806_audit_columns, #637/#641) = 131; +1 (20260815_client_partner_seat,
    // R40 — the Client Partner seat + commission types + the #351 unique) = 132;
    // +1 (20260816_partner_contact_details, #202 — address/country/phone, so the document
    // pack is tailored at seat creation instead of carrying [ADDRESS] placeholders) = 133;
    // +1 (20260816_partner_onboarding_flow, R42 — the invite→sign→counter-sign states and
    // the frozen signed-document table) = 134;
    // +1 (20260817_seller_ramp, #654 — the seller's own contact notebook behind the ramp) = 135.
    // +1 (20260819_rls_advisor_fixes, HC-7 — RLS on the two partner tables and error_events,
    // and lead_pool_pnl stops running with its creator's rights) = 136.
    // +1 (20260819_pool_pnl_service_role_grant — the same-day correction) = 137.
    // +1 (20260819_blocklist_email_normalize — HC-1: the opt-out blocklist held two email
    //     shapes, so a mixed-case opt-out was unmatchable by every send-path probe) = 138.
    // +1 (20260819_lead_sale_commission — the partner commission moves off Stripe payments
    //     onto the $4 lead sale; widens commission_type to accept 'lead_sale') = 139.
    expect(sqlFiles(CANON)).toHaveLength(174)   // ⛓️ 173 → 174 on 11 Sep (MVP1, Preview 07): +1 supabase/migrations/20260911_onboarding_brief_drafts.sql — canonical home of the runner entry above, written in the same change.   // ⛓️ 172 → 173 on 11 Sep (MVP1 C04/C21): +1 supabase/migrations/20260911_icp_target_category_and_type.sql — the canonical home of the runner entry above, written in the same change.   // ⛓️ 171 → 172 on 10 Sep (I2): +1 supabase/migrations/20260910_inbox_verification.sql — file and runner entry added together, as every migration in this repo must be.   // ⛓️ 170 → 171 on 10 Sep (B/C): +1 supabase/migrations/20260910_programme_calculator_choice.sql — file and runner entry added together.   // ⛓️ 169 → 170 on 10 Sep (A): +1 supabase/migrations/20260910_proof_completion.sql — file and runner entry added together, same additive body: clients.proof_completed_at.   // ⛓️ 168 → 169 on 10 Sep (H): +1 supabase/migrations/20260910_programme_run_authority.sql — file and runner entry added together, same additive body: programmes.run_at/run_by/went_live_by.   // ⛓️ 164 → 165 on 9 Sep: +1 supabase/migrations/20260909_programme_qualification.sql — file and runner entry written together.   // ⛓️ 163 → 164 on 8 Sep: +1 supabase/migrations/20260908_review_freeze_and_schedule.sql — file and runner entry written together.   // ⛓️ 162 → 163 on 7 Sep: +2 — 20260907_preparation_snapshot.sql alongside its runner entry (the shape this file argues for).   // ⛓️ 161 → 162 on 7 Sep (HOUSE-009): +1 supabase/migrations/20260907_programme_sourcing_authority.sql — the canonical home of the runner entry above, written in the same change (the shape this file argues for). The runner entry carries the same SQL with its comment lines stripped, because every backtick in the canonical file sits inside a `--` comment and one backtick would terminate the template literal.   // ⛓️ 160 → 161 on 3 Sep (PR C3 · leads.proof_pass): +1 supabase/migrations/20260903_lead_proof_attribution.sql — the canonical home of the runner entry above, written in the same change (the shape this very file argues for). One nullable smallint, one guarded CHECK, one partial index; no default, no backfill, no row touched.   // ⛓️ 159 → 160 on 3 Sep (PR C1 · SCHEMA FIRST): +1 20260903_client_commercial_model.sql — the canonical record of clients.commercial_model. File and runner entry written together, which is the shape #383 argues for: a .sql on disk LOOKS applied and runs nothing.   // ⛓️ 158 → 159 on 2 Sep (PR A1 · SCHEMA FIRST): +1 20260902_programme_internal_authority.sql — the canonical record of the two internal-authority columns and the per-stage XOR CHECKs. File and runner entry written together, which is the shape #383 argues for: a .sql on disk LOOKS applied and runs nothing.   // ⛓️ 157 → 158 on 31 Aug (BUILD-004A-2D): +1 20260831_notification_prefs_and_referral_handoff.sql — file and runner entry written together.   // ⛓️ 156 → 157 on 29 Aug (BUILD-003 PR2): +1 20260829_programme_delivery_control.   // +1 29 Aug BUILD-003 item 6 completion (20260829_provider_eviction — the send gate refuses NEW sends to a suppressed person; it can do nothing about one already inside Smartlead, which sends from its own copy. alertSmartleadStillSending only ALERTS, and an email is not a tracked blocker. Five nullable columns that make the unclosed risk countable)   // +4 29 Aug BUILD-003 PR 1 — FOUR migrations, not one, and the split is the point: 20260829_delivery_rls (tenant isolation on the nine delivery tables) is gated by R2 on the BROWSER's access to production, so keeping meetings truth, reply idempotency and delivery attribution in the same file would have held all three behind a runtime gate none of them needs. 20260829_meetings (public.meetings — the sole source of meeting truth, replacing a nullable timestamp on a reply row that six call sites each re-counted); 20260829_reply_idempotency (provider_event_key + a PARTIAL unique index — NULL deliberately fail-open); 20260829_delivery_attribution (figsy_enrollments.programme_id + batch_id, additive and inert, the foundation PR 2 needs)   // +1 28 Aug BUILD-002 (20260828_programme_money_engine — file and runner entry written together, the shape this test argues for)   // +1 26 Aug (20260826_proof_started_at — clients.proof_started_at, stamped by try_claim_proof_pass in the SAME atomic update as the counter: the proof desk's clock stops being inferred from the browser, where a lost POST response, another device or a stale older-pass stamp could each make a healthy run look failed)   // +1 26 Aug (20260826_run_outcome_failed — status gains 'failed', R72)   // +1 26 Aug (20260826_acquisition_memory — company memory of every PAID identity, R67)   // +1 25 Aug (20260825_proof_widened_candidate — file and runner entry written together, the shape this test argues for); // +1 20 Aug R46 (20260820_governed_documents — governed documents live in Vida as the sole source of truth; the rule was ruled 17 Aug and unbuilt until now); +1 20 Aug HC-3 (20260820_smartlead_campaign_membership — records WHICH leads are inside a Smartlead campaign; nothing wrote it down before, so an opt-out could not name who to remove, and our blocklist does not stop Smartlead sending) // +1 21 Aug P32 (20260821_lead_feedback — calibration v1: the REASON behind a Pass, so a client's correction changes their next batch instead of being recorded as a bare no); // +1 21 Aug P33 (20260822_morning_brief_once_per_day — Milla's morning brief lands in the client's own /milla thread, and ONE PER LONDON DAY is a unique index rather than a read-then-write check: two tabs opening the page in the same instant would both see 'no brief yet' and both insert, so the database settles the race and the loser re-reads the winner's row); // +1 21 Aug P34 (20260822_meeting_briefs — the client-level Meeting Brief: versions are immutable in CONTENT so an edit inserts version+1, and the authoritative brief is the highest APPROVED version, never MAX(version) — a draft at v4 must never reach a model); // +1 22 Aug FREE PROOF (20260822_free_proof_acquisition — the acquisition fence: its OWN budget and OWN ledger so free proof can never spend the paid delivery ceiling, and the reservation is taken under a lock on the SINGLETON money_settings row because locking per-client rows alone lets two prospects each read the same monthly room and both spend it);   // +1 27 Aug PR2 (20260827_proof_review_handoff — the exhausted prospect becomes real work: a client who has used BOTH free proof passes and comes back for another persists a review request, and an operator is told once. The ASK is the trigger, never the pass count — proof_passes_done >= 2 alone is the healthy end of a proof that worked, so deriving the handoff from it would raise one against every prospect the moment pass 2 rendered)   // ⛓️ 165 → 166 on 10 Sep: +1 supabase/migrations/20260910_lead_set_aside_reason.sql — the canonical copy of the runner entry above   // ⛓️ 166 → 167 on 10 Sep: +1 supabase/migrations/20260910_proof_calibration_handoff.sql — the canonical copy of the runner entry above   // ⛓️ 167 → 168 on 10 Sep: +1 supabase/migrations/20260910_client_stated_outcome.sql — the canonical copy of the runner entry above
  })

  it('every consolidated file names its origin, and every original names its replacement', () => {
    // A copy with no provenance is indistinguishable from a duplicate somebody made by
    // accident — and the whole point is that you can trace it back.
    for (const dir of TOMBSTONED) {
      for (const name of sqlFiles(dir)) {
        expect(read(CANON, name), `${CANON}/${name}`).toContain(`original: ${dir}/${name}`)
        expect(read(dir, name), `${dir}/${name}`).toContain(`SUPERSEDED`)
        expect(read(dir, name), `${dir}/${name}`).toContain(`supabase/migrations/${name}`)
      }
    }
  })
})

describe('the READMEs say the thing that is easiest to get wrong', () => {
  const readme = (dir: string) => readFileSync(join(REPO, dir, 'README.md'), 'utf8')

  it('all three directories have one', () => {
    for (const d of [CANON, ...TOMBSTONED]) expect(readme(d).length).toBeGreaterThan(400)
  })

  it('each stale one is marked historical and points at the canonical home', () => {
    for (const d of TOMBSTONED) {
      expect(readme(d)).toContain('do not add migrations here')
      expect(readme(d)).toContain('supabase/migrations')
      // Rule 3 is founder-locked and the reason these files still exist at all.
      expect(readme(d)).toContain('nothing gets deleted')
    }
  })

  it('all three say recording a migration is NOT running one', () => {
    // The single most expensive misunderstanding available here: putting a file in the
    // canonical directory and believing production will get it. Nothing reads the directory.
    for (const d of [CANON, ...TOMBSTONED]) {
      expect(readme(d), d).toContain('pending-migrations.ts')
      expect(readme(d), d).toMatch(/TypeScript constant|the constant/)
    }
  })

  it('the canonical README carries the #554c lesson that cost a production run', () => {
    // DROP POLICY IF EXISTS guards the POLICY, not the TABLE — and one bad line rolls back
    // the whole file, because node-postgres sends multi-statement SQL as one transaction.
    const r = readme(CANON)
    expect(r).toContain('guards the POLICY, not the TABLE')
    expect(r).toContain('to_regclass')
    // Case-insensitive on purpose. `expect(a) || expect(b)` does NOT work — expect THROWS on
    // failure, so the right-hand side is dead code and only the first assertion runs. Written
    // that way here first; caught by red-proving.
    expect(r.toLowerCase()).toContain('idempotent')
  })

  it('the packages/db README carries its own warning — those tables may never have been created', () => {
    // #554c's finding. Treating them as present is how a migration written against them
    // fails in production.
    const r = readme('packages/db/src/migrations')
    expect(r).toContain('never created in production')
    expect(r).toContain('unverified in production')
    expect(r).toContain('#554c')
  })
})

describe('the premise in #273 was wrong, and the correction is written down', () => {
  it('the runner reads a constant, not a directory — asserted against the code', () => {
    // If somebody ever DOES add a directory reader, this fails and the READMEs need
    // rewriting — which is the correct outcome, not a nuisance.
    const runner = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    expect(runner).toContain('NOT read from disk')
    expect(runner).not.toMatch(/readdirSync|readFileSync\([^)]*migrations/)
  })

  it('two of the runner\'s twelve entries had their file OUTSIDE the canonical dir', () => {
    // So "supabase/migrations is what Vida runs" was not even true of the runner's own
    // contents. Both are canonical now; this pins that they stayed that way.
    for (const k of ['20260726_inbox_smtp', '20260725_client_inboxes']) {
      expect(sqlFiles(CANON)).toContain(`${k}.sql`)
      expect(read(CANON, `${k}.sql`)).toContain('original: apps/api/src/migrations')
    }
  })
})

// ── ③ A NEW TABLE SHIPS WITH RLS ON, OR THE GATE GOES RED ───────────────────────────────
//
// HC-7 (19 Aug): Supabase's own Security Advisor reported four CRITICAL errors on
// production — two of them "RLS Disabled in Public" on `partner_ramp_contacts` and
// `partner_signed_documents`. Both were created by the 16–17 Aug partner arc. Both went
// through review, tests and a green gate. Nothing we own asked the one question that
// mattered: does this new table ship with row-level security on?
//
// It was found by the FOUNDER opening a dashboard. That is the gap this guard closes.
//
// WHY THIS IS THE RIGHT SHAPE. The 27-Jul hardening (`20260727_rls_close_public_policies`,
// `20260727_rls_live_findings`) enumerated the tables that existed THEN. An enumeration
// cannot protect a table created later, so the same hole reopens on the next CREATE TABLE
// — including the governed-document vault that is already drafted. A rule about the SHAPE
// of a migration protects tables nobody has thought of yet.
//
// O8 — the guard asserts the INTENT (a created table is RLS-protected), never the literal
// SQL of any one migration. Rewrite these migrations however you like; the assertion only
// cares that the pairing holds.
describe('③ every table the runner creates also gets RLS', () => {
  const runnerSrc = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')

  /** Table names in `CREATE TABLE [IF NOT EXISTS] public.<name>`, however spaced or cased. */
  const created = new Set(
    [...runnerSrc.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?public\.([a-z_]+)/gi)]
      .map(m => m[1].toLowerCase()),
  )

  /** Table names in `ALTER TABLE [IF EXISTS] public.<name> ENABLE ROW LEVEL SECURITY`. */
  const secured = new Set(
    [...runnerSrc.matchAll(/alter\s+table\s+(?:if\s+exists\s+)?public\.([a-z_]+)\s+enable\s+row\s+level\s+security/gi)]
      .map(m => m[1].toLowerCase()),
  )

  it('no table is created without row-level security in the same runner', () => {
    const unprotected = [...created].filter(t => !secured.has(t)).sort()
    expect(
      unprotected,
      `created by PENDING_MIGRATIONS with no ENABLE ROW LEVEL SECURITY anywhere in it: ` +
      `${unprotected.join(', ')}. A table exposed to PostgREST with RLS off is readable by ` +
      `anyone holding the public anon key — apps/portal ships that key to every browser.`,
    ).toEqual([])
  })

  it('the three HC-7 tables are the ones this was written for', () => {
    // Named so a future reader knows which real finding produced the rule. partner_ramp_contacts
    // and partner_signed_documents were advisor-flagged; error_events was not, and is here on
    // the founder's explicit 19-Aug choice — the runner creates it and never secured it, so the
    // guard counted it correctly and he chose to close it rather than allowlist a belief.
    for (const t of ['partner_ramp_contacts', 'partner_signed_documents', 'error_events']) {
      expect(created, `${t} should be created by the runner`).toContain(t)
      expect(secured, `${t} must be RLS-protected by the runner`).toContain(t)
    }
  })
})
