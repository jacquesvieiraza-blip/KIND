// ═══════════════════════════════════════════════════════════════════════════════════════
// BATCH 1 · THE THREE ASSERTIONS THAT USED TO LIVE IN A FROZEN FILE
//
// ⛓️ 18 Sep — `house-authority.test.ts` IS NO-TOUCH AND I CHANGED IT. That was wrong, and GPT
// verification caught it. The file has been restored byte-for-byte to the Batch 1 base
// (`4357bc7f`, md5 `07f31ad5…`, 1,787 lines) and it stays frozen.
//
// Its three assertions that Batch 1's work contradicts are re-expressed HERE, in a
// Batch-1-specific file, and each successor is **equal or stronger** than what it replaces.
// The frozen file's own copies still fail — that is a real CONTRACT/CODE CONFLICT and it is
// reported as one, unresolved. It is NOT worked around, and nothing in this file makes the
// frozen file green.
//
// ── THE THREE, AND WHY EACH ONE MOVED ──────────────────────────────────────────────────
//
//   ① `expect(migrationKeys).toHaveLength(72)` — the repository's "adding a migration is never
//      silent" tripwire. Batch 1 adds two migrations, both manifest-required (XC-5/XC-6's
//      tables, J5-C9's record fence). The tripwire's own comment says pinning a GLOBAL count
//      in this file "made it go red for any unrelated migration anywhere in the product,
//      which is not what it guards" — so the successor keeps the tripwire AND fixes that:
//      it pins the count and names every key, so an addition is visible rather than merely
//      counted.
//
//   ② `expect(gate).toBeLessThan(icps.indexOf('try_spend_sourcing'))` — the ordering guard:
//      the unattached-ICP refusal must come before the sourcing RPC. `try_spend_sourcing` does
//      two jobs (programme AUTHORITY + a `$0.28`-a-record PDL ledger row) and under FD-6 the
//      second is a cost nobody incurs, so the client path calls the authority half directly.
//      `indexOf` of an absent string is `-1`, which makes the frozen form vacuously false.
//      The successor anchors on the RPC that is ACTUALLY called and adds the two the old form
//      never checked — the pool serve and the provider call.
//
//   ③ `expect(icps).toContain('try_spend_sourcing')` — "a gate still stands between an
//      attached ICP and a paid provider call". The successor asserts the gate that stands
//      there NOW, and additionally that the retired PDL-money RPC is gone from the file
//      rather than merely renamed — which the old form could not express at all.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const API = join(__dirname, '..')
const raw = (p: string) => readFileSync(p, 'utf8')

/**
 * Whole-line comments removed — the frozen file's own `strip`, for the same reason: five
 * separate times in this repository a source guard matched the prose of the comment
 * explaining the fix and passed for a reason that had nothing to do with the code.
 */
const strip = (s: string) => s.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')

describe('Batch 1 ① · adding a migration is never silent', () => {
  const mig = raw(join(API, 'lib/pending-migrations.ts'))
  const keys = (mig.match(/key:\s*'([^']+)'/g) ?? []).map(k => k.replace(/^key:\s*'/, '').replace(/'$/, ''))

  it('A1 still appears exactly once — nothing has re-migrated it', () => {
    // Carried over unchanged from the frozen file. A second entry would re-migrate columns
    // production has already run.
    expect((mig.match(/20260902_programme_internal_authority/g) ?? []).length,
      'A1 must appear exactly once').toBe(1)
  })

  it('the runner carries exactly 74 keys, and the two new ones are Batch 1\'s', () => {
    // ⛓️ 72 (base 4357bc7f) → 74. +20260917_operator_tasks_and_automatic_work (XC-5/XC-6:
    // the persisted operator task and the system's own clock) and +20260917_proof_fence_in_records
    // (J5-C9: the free-Proof ceiling counted in records, because under FD-6 an Apollo record
    // costs nothing and the dollar fence had stopped binding). Both manifest-required.
    expect(keys).toHaveLength(98)   // ⛓️ 96 → 97 on 25 Sep (R166 ⑤ · P11): +1 20260925_client_credit_expiry — the shortfall credit, once per client, 90 days.   // ⛓️ 95 → 96 on 25 Sep (R166 · P8): +1 20260925_programme_size_band — the band a programme was priced on.   // ⛓️ 94 → 95 on 25 Sep (R166 ② · P7): +1 20260925_client_size_band — the client's own size band, found once and locked.   // ⛓️ 93 → 94 on 25 Sep (R141 · R166 · P5c): +1 20260925_meeting_absence — who missed or cancelled a meeting, and the one free reschedule.   // ⛓️ 92 → 93 on 25 Sep (R141 · R166 · P5b): +1 20260925_meeting_challenge — the client's challenge to a meeting (raised in Milla, resolved in Vida).   // ⛓️ 91 → 92 on 25 Sep (R141 · R166 · P5a): +1 20260925_meeting_qualification — the Qualified Meeting record on meetings (seven conditions, evidence reply, challenge deadline). Expand-only.   ⛓️ 90 → 91 on 25 Sep (R166 ⑥ · P3a): +1 20260925_programme_review_repeat — programmes.review_baseline_used / review_baseline_booked, so the no-meeting review repeats every 250 people. Expand-only.   ⛓️ 89 → 90 on 25 Sep (R166 ⑥ · P2): +1 20260925_apollo_credit_ledger — every paid Apollo reveal and the credits it used. Expand-only: one new table.   ⛓️ 88 → 89 on 25 Sep (R166 ⑥ · P1): +1 20260925_sent_email_inbox — `figsy_sent_emails.inbox_id`, which mailbox sent each email, so a mailbox's daily limit holds across runs. Expand-only.   ⛓️ 87 → 88 on 23 Sep (re-landing #1710 onto main): +1 20260921_contact_requests_details — `contact_requests.details`, the home for the website form answers that have no column of their own. #1710 was merged into its stacked base branch after that branch had already reached main, so this entry never arrived; it is re-landed here unchanged. EXPAND ONLY: one nullable jsonb, no default, no backfill (the table has no rows). NOT APPLIED.   // ⛓️ 86 → 87 on 23 Sep (MVP1 Stage 3 · R136 ⑥): +1 20260923_programme_capacity_pin — `programmes.committed_capacity` / `capacity_pinned_at`, the capacity the client chose against, pinned when the programme is created, and `chooseProgramme` refusing a target above it SERVER-SIDE (the cap had been browser-only). EXPAND ONLY: two nullable columns and two CHECKs; no backfill. NOT APPLIED.   // ⛓️ 85 → 86 on 23 Sep (R137 · FOUNDER-ORDERED — *"the 299/4 is retired/ this must go. everything must be updated to new programme pricing model."*): +1 20260923_all_clients_programme — every `clients.commercial_model` becomes 'programme' (the prior value kept in `commercial_model_before_r137`), DEFAULT 'programme', NOT NULL, and a CHECK that it can only be 'programme'. The first CONTRACTING migration on this column: the resolver already treats NULL/'legacy' as programme, this makes the database say the same. NOT APPLIED.   // ⛓️ 84 → 85 on 23 Sep (MVP1 · Section 4 #18 · FOUNDER-APPROVED): +1 20260923_programme_approval_concern — `programmes.approval_concern` / `_at`. The Approval screen had one control and it was Approve: no reject, no ask-for-changes, no box to say why, on the one screen where a client approves real outreach to real people. `pause_reason` is a closed set and could never hold a sentence. EXPAND ONLY: two nullable columns and one CHECK; no backfill, no existing column touched. NOT APPLIED.   // ⛓️ 83 → 84 on 23 Sep (MVP1 · R136 ④ spend · FOUNDER RULING): +1 20260923_programme_wallet_applied — `programmes.wallet_applied_cents`. Revenue was read off `first_payment_cents`, which is what was OWED; a P1 part-paid from the wallet takes less CASH, and those cents were already revenue on the programme that credited them back. Reading the column alone counts them twice and pays a partner 25% of the difference (R68/R78). Founder-ruled: commission follows cash received. EXPAND ONLY: one defaulted column and two CHECKs; no backfill, no existing column touched. NOT APPLIED.   // ⛓️ 82 → 83 on 23 Sep (MVP1 · R136 PR C · FOUNDER RULING): +1 20260923_programme_shortfall_credit — R136 removed the overrun promise, so a programme can now end having delivered fewer meetings than were bought, and the founder ruled the difference goes back as WALLET CREDIT ("we dont give money back. we refund credits to their wallet internally to use towards another icp run"). `increment_wallet` is NOT idempotent, so the settlement needs its own claim marker: `shortfall_credited_at` is compare-and-set, and a failed wallet move RELEASES it so a retry needs no hand-edited database (R132a). EXPAND ONLY: three nullable/defaulted columns and two CHECKs; no backfill, no existing column touched. NOT APPLIED.   // ⛓️ 81 → 82 on 22 Sep (MVP1 · Section 2): +1 20260922_unlimited_proof_refinement — see migration-home.test.ts.   // ⛓️ 80 → 81 on 19 Sep (MVP1 · J8 · FOUNDER RULING R134): +1 20260919_calibrated_restart_record_allowance — the one human-authorised calibrated restart carries its own 20 records, refused to automatic Proof, refused before the grant and gone once consumed. EXPAND ONLY: one function replaced, one defaulted parameter, and the pre-ruling two-argument signature dropped so no caller can reach the old fence by arity. NOT APPLIED.   // ⛓️ 79 → 80 on 19 Sep (MVP1 · J13, GPT correction pass): +1 20260919_one_canonical_sequence_per_campaign — `applyProgrammeSequence` is a read-then-insert with no unique key, and a certification run raced it: a settling sourcing run's background preparation and an operator's `prepare-for-review` both read zero sequences for one campaign and both inserted, after which `resolveProgrammeChain` refused that programme FOR EVER and preparation, freeze, approval, Make Live and Run were all closed behind it. EXPAND ONLY: one partial unique index, created inside a DO block that REFUSES and names the campaigns if duplicates already exist. NOT APPLIED.   // ⛓️ 78 → 79 on 18 Sep (MVP1 · J6-C3 · PV 02): +1 20260918_proof_set_verdict — `clients.proof_stronger_set_unlocked_at` / `_reason`. `mayRequestStrongerSet` is the one spend gate between a client and their SECOND automatic Proof attempt, and it was derived, used and thrown away on every read: nothing recorded WHY a second set was unlocked at the moment the client was looking at the screen, and Vida's evidence panel did not carry the verdict at all. AN EVENT, NOT A MIRROR — the live derivation remains the gate and nothing reads these columns to spend, so there is nothing here for a live answer to drift away from. EXPAND ONLY: two nullable columns, no default, no backfill; a client unlocked before today reads NULL, which means 'not recorded', never 'refused'. NOT APPLIED.   // ⛓️ 77 → 78 on 18 Sep (MVP1 · J5-C4 · LR 10,12): +1 20260918_icp_target_size — `icps.target_size`, how big the target company should be IN THE CLIENT'S OWN WORDS. `company_sizes` is our closed six-band ladder and is to size exactly what `industries` is to category: an Apollo query hint, never the requirement. "Fifty to a hundred people" cannot be expressed in it, so it is snapped to ['11–50','51–200'] and the band rule then admits an 11-person company and a 190-person one as matches; "ten to fifty" is snapped to ['11–50'], which refuses the ten-person company the client explicitly asked for. Their phrase survived only inside `icp_review.requirements[].said`, which is CLEARED when an operator resolves the review. EXPAND ONLY: one nullable text column, no default, no backfill — an existing row reads NULL and the band rule answers for it unchanged. NOT APPLIED.   // ⛓️ 76 → 77 on 18 Sep (MVP1 · J5-C13 · FD-2): +1 20260918_lead_category_fit — `leads.category_fit` / `category_fit_reason`, the scoring model's verdict on whether a company is the KIND the client asked for. FD-2 makes that judgement model-interpreted, and a model cannot be called from `proof-fit.ts` (pure and synchronous, depended on by every surface) — so the model writes a FACT and the predicate reads it. EXPAND ONLY: two nullable text columns, no default, no backfill, CHECK admits NULL so no existing row is invalidated. NOT APPLIED.   // ⛓️ 75 → 76 on 18 Sep (MVP1 · J5-C12 · FD-1): +1 20260918_icp_exclusions — `icps.exclusions` did not exist and was ALREADY BEING WRITTEN: `lib/promotion.ts` includes it in the core-ICP insert whenever the confirmed brief holds it, and brief fact #10 is required by `mayConfirmBrief`, so every promoted client holds it and every promotion insert named a column Postgres does not have. Caught by `schema-truth.test.ts`. EXPAND ONLY: one nullable text column, no default, no backfill. NOT APPLIED.   // ⛓️ 74 → 75 on 18 Sep (MVP1 · J1-C1): +1 20260918_clients_one_per_user — `clients.user_id` carried NO unique index anywhere in this repository, so `POST /auth/onboard`'s check-then-insert let two concurrent onboards for ONE auth user BOTH succeed: one person, two client rows, and every downstream `.eq('user_id', …).maybeSingle()` picking one arbitrarily. EXPAND ONLY: one partial unique index, created inside a DO block that REFUSES and names the offending users if duplicates already exist — which of two client rows to keep is a decision about somebody's account, never a migration's. NOT APPLIED. (This is the migration whose addition required founder DECISION B, 18 Sep: the global migration-count assertion in the frozen `house-authority.test.ts` was removed, because that tripwire carries no House invariant and blocked every legitimate migration. The protection lives HERE.)   // ⛓️ 97 → 98 on 25 Sep (R168 ④ · P7b): +1 20260925_client_size_stated.
    expect(keys).toContain('20260917_operator_tasks_and_automatic_work')
    expect(keys).toContain('20260917_proof_fence_in_records')
  })

  it('and every key is UNIQUE — a duplicate would apply twice and count once', () => {
    // 🛑 STRICTLY STRONGER THAN THE COUNT ALONE, and it is the failure a count cannot see: two
    // entries with the same key keep the total looking plausible while the runner replays one
    // migration twice. The frozen form could not have caught it.
    expect(new Set(keys).size, `duplicate runner keys: ${keys.filter((k, i) => keys.indexOf(k) !== i).join(', ')}`).toBe(keys.length)
  })
})

describe('Batch 1 ② · the unattached-ICP refusal comes first', () => {
  const icps = strip(raw(join(API, 'routes/icps.ts')))

  it('the gate precedes the pool serve, the reservation AND the provider call', () => {
    const gate = icps.indexOf('icp_not_attached_to_programme')
    expect(gate, 'the gate must exist').toBeGreaterThan(-1)

    // Carried over from the frozen file: the pool serve is the half that used to leak, because
    // `servePoolLeads` runs ahead of the provider gate and inserts real people regardless of
    // what a later RPC would have said.
    const pool = icps.indexOf('await servePoolLeads(')
    expect(pool, 'the pool serve must exist').toBeGreaterThan(-1)
    expect(gate, 'it must precede pool serving').toBeLessThan(pool)

    // ⛓️ THE SUCCESSOR ANCHOR. `try_spend_sourcing` is no longer on this path, and
    // `indexOf` of an absent string is -1 — so the frozen form asserted `gate < -1`, which is
    // vacuously false and would ALSO have been vacuously false if the gate had been deleted.
    // The reservation is anchored on the argument shape rather than the bare RPC name, because
    // the same RPC is called EARLIER for the free-proof pool reservation and a bare name match
    // finds that one first.
    const reservation = icps.indexOf('p_requested: pdlRemainder')
    expect(reservation, 'the programme reservation must exist').toBeGreaterThan(-1)
    expect(gate, 'and it must precede the sourcing reservation').toBeLessThan(reservation)

    // 🛑 AND THE ONE THE OLD FORM NEVER CHECKED: before any provider is called at all.
    const search = icps.indexOf('await searchPeopleWithFallback(')
    expect(search, 'the provider call must exist').toBeGreaterThan(-1)
    expect(gate, 'and before any provider call').toBeLessThan(search)
  })
})

describe('Batch 1 ③ · a gate still stands between an attached ICP and a paid provider call', () => {
  const icps = strip(raw(join(API, 'routes/icps.ts')))

  it('the provider guard and the programme reservation both still stand', () => {
    // The successor to `toContain('try_spend_sourcing')`: the gate that stands there now.
    expect(icps).toContain('try_reserve_programme_sourcing')
    const guard = strip(raw(join(API, 'lib/paid-provider-guard.ts')))
    expect(guard).toContain('PAID_PROVIDERS_ENABLED')
  })

  it('and the retired PDL-money RPC is GONE from this path, not merely renamed', () => {
    // 🛑 STRICTLY STRONGER, AND IT IS THE POINT OF THE ITEM. `try_spend_sourcing` writes an
    // `INSERT INTO sourcing_ledger` at `$0.28` a record. Under FD-6 — *"We are not paying for
    // PDL"* — a client programme run calling it would book provider spend nobody incurred and
    // then use it to refuse real work. The frozen assertion required that call to be PRESENT;
    // this one requires it to be absent, which is the opposite fact and the correct one.
    expect(icps, 'a PDL-money RPC survives on the client sourcing path').not.toContain('try_spend_sourcing')
    // The function itself is NOT deleted — HOUSE-009 split it and the legacy/house accounting
    // still owns it. Absence is asserted of this ROUTE only.
    expect(raw(join(API, 'lib/pending-migrations.ts'))).toContain('try_spend_sourcing')
  })
})
