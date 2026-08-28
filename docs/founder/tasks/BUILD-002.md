# 📦 BUILD-002 — Programme Commercial + Money Engine

> **Execution-evidence packet (R82).** What was investigated, verified, decided, authorised and built. **History and evidence, NOT canonical product truth** — it never competes with PRODUCT-RULES, PRODUCT-INVENTORY, LAUNCH-PAD, KIND-MASTER or V2-TRACKER.
>
> **Appended, never overwritten.** Corrections chain below what they correct.

| | |
|---|---|
| **TASK ID** | **BUILD-002** |
| **TITLE** | Programme Commercial + Money Engine |
| **Founder state** | NOW |
| **Conveyor state** | **BUILDER RETURNED** *(state 8 of 12)* |
| **State history** | NOT SCOUTED → SCOUTING → SCOUT RETURNED → GPT VERIFIED → FOUNDER APPROVED → READY FOR BUILDER → BUILDING → **BUILDER RETURNED** |
| **Next action** | **GPT VERIFICATION** (stage 9), then the founder's merge |
| **Opened** | 28 August 2026 |

---

## 1 · SCOUT

**Scout baseline SHA:** `1cd99357ba801e319b7f7991b8f677ece308f608`

### Hardened findings, and how each was re-verified against current main

| # | Scout finding | Re-verified at `5dfd34dc` |
|---|---|---|
| 1 | `try_spend_sourcing` is the true paid-spend chokepoint | ✅ Defined `supabase/migrations/20260711_sourcing_fences.sql:67`. Called from `icps.ts` and `lookalike.ts`. Free proof uses a **different** RPC (`try_reserve_proof_records`) |
| 2 | `runIcpJob` already loads the ICP row, so `programme_id` is deterministic from it | ✅ `icps.ts:542` — `.from('icps').select('*')`. The programme is a field on a row the job already holds |
| 3 | A programme may hold several ICPs, so `programme_id` belongs on `icps`, not on `clients` | ✅ No contrary evidence. Deriving from the client would guess as soon as a client has two ICPs |
| 4 | Stripe checkout already uses inline `price_data`, so no price object per amount is needed | ✅ `lib/stripe.ts:229`. #414's *"renders the dashboard product"* premise is false of this path and already corrected in-repo |
| 5 | The `23505` unique-reference retry pattern is the house idempotency idiom | ✅ `routes/stripe.ts:354, :494` |
| 6 | Migrations have a dual home: canonical `.sql` **and** a `PENDING_MIGRATIONS` entry | ✅ `migration-home.test.ts` asserts both, and asserts the counts |
| 7 | RLS precedent is **ON with no policies** for server-only tables | ✅ `20260826_acquisition_memory.sql:89` and its reasoning |
| 8 | `partner_commissions` exists and has no basis column | ✅ `20260601_partners.sql:31` |

### ⚠️ DELTA FRESHNESS CHECK — BUILD-001 merged between Scout and Builder

`1cd99357..5dfd34dc` = **9 files, 1,132 insertions, 0 deletions, every path under `docs/`.**

**No material BUILD-002 assumption changed.** No schema, no runtime, no test, no constant. Scout line numbers were **not inherited** — every one above was re-grepped at the new head, and where a line moved (the `try_spend_sourcing` call site shifted with the batch declaration) the current number is the one recorded.

### GPT verification — Scout stage (conveyor 4)

✅ **SATISFIED.** The hardened Scout design was independently reviewed before the Builder started: it settled the schema shape, required the gate to live in the atomic DB function rather than in callers, required reserve/release rather than consume-at-grant, required `DEFAULT NULL` to be explicitly *insufficient*, and separated refund from make-whole. The founder then locked the two open decisions (sourcing authority; per-programme contribution).

---

## 2 · FOUNDER LOCKS — not reopened

1. **Launch destination** — the targeted booked-meeting programme is the model launching **Friday 4 September 2026**. Legacy $299/$4 may remain as fenced legacy implementation during migration; it is **not** the destination.
2. **Sizing** — 250 recommended leads per targeted booked meeting. **Planning benchmark, not a guarantee.**
3. **Pricing** — the R81 curve. **Integer cents.** Total first, `first = floor(total/2)`, `second = total − first`; **the odd cent goes to payment two.**
4. **First 50%** — authorises sourcing up to the **full** recommended volume; execution in controlled ~250 batches; no sourcing beyond programme authority; material quality problems pause further batches.
5. **Second 50%** — at Approve & Go Live. **No campaign before it.** One programme-level approval; no paid per-lead approval.
6. **Value** — client may pause; material ICP change pauses future sourcing; **unused value never expires**; first 50% non-refundable once sourcing is authorised; second 50% not charged if paused before Go Live; after Go Live the full programme is paid; make whole for authorised undelivered value.
7. **Contribution** — **per programme**: revenue − directly attributable acquisition/delivery costs, fixed overhead excluded. Partner = 25% of that. **Never "net profit", never "net margin".**

---

## 3 · BUILDER

| | |
|---|---|
| **Builder starting SHA** | `5dfd34dc34421d14a4325706c00fa6b51f2f675d` (`origin/main`, BUILD-001 merged) |
| **Branch** | `claude/programme-money-engine` — fresh from current main |
| **PR** | **#1466** |

### What was built, in the authorised order

1. **Additive migration** — `supabase/migrations/20260828_programme_money_engine.sql` + its `PENDING_MIGRATIONS` entry.
2. **Shared curve + legacy fence** — `packages/shared/src/programme-pricing.ts`, `programme-legacy-fence.test.ts`.
3. **Programme service / state** — `apps/api/src/lib/programme.ts`.
4. **Payment stages** — `apps/api/src/lib/programme-checkout.ts`, webhook branch in `routes/stripe.ts`.
5. **Authority gate + reserve/release** — inside `try_spend_sourcing`; call sites in `icps.ts` and `lookalike.ts`.
6. **Go Live** — `mayStartCampaign` / `maySecondCharge`.
7. **Contribution + partner basis** — `computeContribution`, `finaliseContribution`, `writeProgrammePartnerCommission`.
8. **Operator surface** — `apps/api/src/routes/programme.ts`, mounted at `/programmes`.
9. **Tests** — 110 across four files, with RED proofs.

### Design decisions worth reviewing

**The gate decides the regime from the DATABASE, not from the caller.** `DEFAULT NULL` alone is not safe: if an omitted id fell through to legacy, a programme run that forgot the parameter would spend the client's legacy wallet outside programme authority. So the function reads whether the client has an open programme and fails closed on all three mismatches.

**Programme checkout is its own module.** `lib/stripe.ts` imports `PACK_LEADS`. Putting programme checkout there would have forced an exception into the legacy fence — and a partition with an exception is not a partition.

**Reserve/release, not consume-at-grant.** On 25 Aug a run reserved 20 records and PDL returned none. Consuming at grant would have burned paid entitlement for records that never existed.

**The ceiling is a CHECK CONSTRAINT.** Two concurrent batches that each fit individually cannot both commit — the second UPDATE violates the constraint. A TypeScript check would let both through; they would each read the same room.

---

## 4 · TESTS AND EVIDENCE

**110 tests across four new files.** RED proofs performed and restored:

| Guard | RED proof | Result |
|---|---|---|
| Pricing curve | segment boundary moved to `< 10`; round-per-meeting-then-multiply; odd cent to payment one | **8 failures**, each caught by the assertion written for it |
| Legacy fence | forbidden `LEAD_PRICE_USD` import into `programme.ts` | **1 failure**, naming the module |
| Legacy fence | all programme modules removed | **2 failures** — the "checks nothing" guard fired, as designed |
| State machine | pause ignored on second webhook; campaign gate removed; contribution-finalised check removed | **4 failures**, all on the named scenarios |

### Five repo guards fired, and each was a real "you added schema, now declare it" gate

Not noise — every one of them wanted something genuine, and one of them caught a defect I had written.

| Guard | What it wanted | Done |
|---|---|---|
| `migration-home` · `lead-feedback` · `schema-drift` | The runner-entry count, the canonical-file count, the table counts and the snapshot sizes all name their totals as literals **so that adding something the product can apply to production is never a silent edit** | Counts moved 37→38, 150→151, 76→78, 182→183, 93→94, `[11,54,13]`→`[13,54,13]`, each with a dated reason |
| `schema-drift` ① | `packages/db/src/schema.sql` must not fall behind its own migrations | `programmes`, `programme_batches` and `icps.programme_id` declared. ⚠️ `sourcing_ledger` and `partner_commissions` were **deliberately not** declared — neither table is in that file, and an `ALTER` reads as a declaration, which would demand all eighteen of their columns |
| `system-probes-functions` | Every RPC the product calls at runtime must be probed | `settle_programme_batch` registered, probed with a UUID matching no batch |
| `provider-boundary` (AR8) | The fence's arguments are asserted exactly | Updated to include `p_programme_id: null`, with the note that for a client with no programme this **is** the legacy path |
| **`schema-truth`** | **Every column the code names must exist** | ⚠️ **It caught a real defect I wrote.** `routes/programme.ts` selected `clients.email` — **there is no such column**; the legacy checkout reads the address from the authenticated *user's session*, which an operator route does not have. Corrected to `clients.contact_email`. **supabase-js returns `{ error }` rather than throwing and the call site reads `.data`, so this would have sent every programme checkout to a blank address and nothing would have failed.** |

---

## 5 · MERGE / DEPLOY — **PENDING**

| Field | State |
|---|---|
| GPT verification (Builder stage, conveyor 9) | ⏳ **PENDING** |
| Founder merged (conveyor 10) | ⏳ **PENDING** |
| Merge SHA | ⏳ pending |
| Deploy verified (conveyor 11) | ⏳ **PENDING** — ⚠️ **the migration has NOT been applied to production.** 🚀 **RUN THE MIGRATION FIRST (Vida → Engine, O3: no ad-hoc SQL), THEN DEPLOY THE API.** ⛓️ *This reverses the first submission's instruction, which was wrong — see §7.* |
| Complete (conveyor 12) | ⏳ **PENDING** |

⚠️ **NOTHING IN THIS BUILD IS LIVE COMMERCIAL TRUTH.** The programme model is code that exists, not a model that runs. **The live commercial truth remains $299 pack · first 100 approvals included · $4 per approved lead**, and none of the programme model may be quoted to a client, a partner or the website until the founder ships it.

---

## 6 · APPEND LOG

- **28 Aug — packet opened at BUILDER RETURNED.** Conveyor stage 4 satisfied before the build. Stage 9 owed.
- **28 Aug — delta freshness check passed:** BUILD-001 merged docs-only between Scout and Builder; no assumption moved.
- **28 Aug — `check.sh` RED, reported not manufactured.** Final run: **1 failed / 4,104 passed**, `kind-owns-go.test.ts:292` — *"THE FIRST-LEADS EMAIL GOES TO THE CLIENT OWNER"*, `expected undefined to be true`. ⚠️ **The same test passes in isolation, in its own group, and in a full standalone API run (4,021/4,021) — both WITH and WITHOUT this branch's changes**, which were checked by stashing them. It is a full-suite ordering artifact, and it is the second intermittent in this repo alongside `proof-review-handoff`. **Recorded as unresolved rather than explained away, and `check.sh` was NOT re-run to obtain green.**

---

## 7 · GPT CLOSURE — the four evidence gaps (28 Aug)

**Two of the four were real gaps. Both are patched; both now have tests that fail if the guard is removed.**

### GAP 1 · the full-suite RED — **NOT a BUILD-002 regression**

| Evidence | Result |
|---|---|
| Clean `origin/main` worktree, exact `check.sh` invocation (`npx vitest run --reporter=dot` from repo root) | **3 runs, 3 green** — the failure did **not** reproduce on baseline |
| This branch, same invocation | **3 runs, 3 green** |
| This branch, same invocation under full CPU saturation (4 busy loops on 4 cores, mimicking `check.sh`'s warm/loaded machine) | **green, 4,105/4,105** |
| Architectural exclusion | **`runIcpJob` is not awaited by the activate route.** `started = true` is assigned, the job is dispatched fire-and-forget with `.catch`, and `res.json({… sourcing: started …})` runs on the synchronous continuation. Every BUILD-002 line in `icps.ts` is inside `runIcpJob`. `sourcing: undefined` means the handler threw — and no BUILD-002 code can execute before `sourcing` is computed or reach that catch. |

**Verdict: BASELINE / ORDERING FLAKE — BUILD-002 EXCLUDED BY CONSTRUCTION.** ⚠️ **Stated precisely, because the distinction matters:** BUILD-002 is excluded by proof, but **the flake itself was not reproduced on either tree** (0 occurrences in 7 attempts). It remains an unexplained intermittent, the second in this repo alongside `proof-review-handoff`. The architectural property is now **pinned as a test** (`programme-closure.test.ts` GAP 1) rather than left as an argument — if anyone later awaits `runIcpJob` there, the exclusion silently stops holding, and that test goes red.

### GAP 2 · controlled ~250 batches — **GAP CONFIRMED AND PATCHED**

The verification's warning was exact: *"do not confuse total programme ceiling with per-batch execution control."*

**What was wrong:** the gate granted `LEAST(p_requested, remaining_ceiling)`. A 1,000-record request against a 2,500 ceiling was granted **1,000**; a 2,500 request was granted **2,500** — the whole programme in one uncontrolled batch. The ceiling was enforced; batching was not. `nextBatchSize` existed but was only a read-out on the operator screen.

**Why it mattered beyond tidiness:** *"material quality/performance problems pause further batches"* has nothing left to pause once the whole programme has gone out.

**Patched:** `v_batch_cap int := 250` inside the gate, and `v_granted := LEAST(p_requested, COALESCE(v_room, 0), v_batch_cap)`. In **both** migration homes. `v_room` stays in the `LEAST`, so the final batch is the remainder (100, not 250) — controlled batching never becomes a way to exceed the ceiling.

### GAP 3 · Go-Live bypass — **CLOSED, at the door rather than the callers**

Two families reach sending. `ensureCampaignForIcp(..., { activate: true })` is the **only** code that writes `status: 'active'`, and five call sites reach it. `startWorkForClient` has **exactly one** executable caller — the legacy payment webhook.

**The gate went into `ensureCampaignForIcp`, not into the five callers** — gating callers is the shape AR8 already proved fails, when `lookalike/generate` ran unfenced for months because it was the caller nobody remembered. It refuses on **not-live**, **not-paid**, **paused**, and **on a read error** (not knowing is not the same as knowing it is fine). Scaffolding (`activate: false`) is untouched: a draft sends nothing, and blocking it would stop Milla persisting an ICP at all.

**The legacy webhook is gated separately and before the import**, because `startWorkForClient` also reaches campaign activation — relying on the downstream sourcing refusal to protect an upstream door is exactly how the AR8 hole survived.

⚠️ **The two refusals are distinguishable.** *"You already have a live campaign"* is a scheduling problem fixable in a minute; *"this programme has not been paid for"* must not be worked around. One sentence for both is how someone tries the wrong fix.

### GAP 4 · Stripe identifiers, email, deployment order

**A.** Session ids stored on the programme row, with **partial unique indexes** as the idempotency key. **B.** Payment **intent** ids stored separately — refunds and disputes key on the intent, not the session (#317 already had to resolve one from the other).

**C — this was a real gap.** The email was `contact_email ?? ''`. **Stripe accepts a session with no `customer_email`**, so a blank string does not error: the checkout would be created, the operator would hand over a link, and the client would never receive a receipt at an address we hold. Now `clientEmailOrRefuse` — a missing, blank or unreadable address **refuses the checkout with a 400 before Stripe is called**.

**D — THE DEPLOYMENT ORDER WAS WRONG, AND THIS IS THE MOST CONSEQUENTIAL FINDING.**

The first submission said *"API first, migration second."* **That would have taken the product down for every existing client:**

| # | What API-first breaks | Effect |
|---|---|---|
| ① | `try_spend_sourcing` called with **three** arguments against a **two**-argument function | PostgREST returns "function not found", the caller reads a non-number, `grantedSize = 0` — **every legacy client's sourcing silently refuses** |
| ② | `ensureCampaignForIcp` reads `public.programmes` on the activate path **for every client** | Missing table → error branch → the new fail-closed logic **refuses every campaign activation**, legacy included |

**Corrected order: RUN THE MIGRATION FIRST, THEN DEPLOY THE API.** Migration-first is safe in both directions — nothing in the deployed API reads the new tables or columns.

⚠️ **And one more hazard that ordering alone did not fix.** `CREATE OR REPLACE` with a new defaulted parameter creates a **second** function rather than replacing the first, leaving both `(uuid, int)` and `(uuid, int, uuid DEFAULT NULL)` able to accept a two-argument call — PostgreSQL's documented ambiguity case, and an ambiguous call on the sourcing gate is a hard error on the live money path. The migration now **drops the two-argument overload**, leaving one function whose default resolves cleanly for the old API (two args → NULL → legacy branch) and the new one (three args → programme authority). The DROP and CREATE are in the same statement batch, so the gate is never absent.

*(This is the only DROP of anything in the migration, it drops no data, and the additive assertion was narrowed to permit exactly it — with the reason attached.)*

### RED proofs for the closure patches

| Guard | RED proof | Result |
|---|---|---|
| Batch cap | removed `v_batch_cap` from the `LEAST` — the original gap, restored | **failed**, naming the grant line |
| Go-Live gate | replaced the not-live refusal with `if (false)` | **failed**, structural **and** behavioural |
| Legacy webhook gate | replaced the programme check with `if (false)` | **failed** |
| Non-vacuity | a LIVE+paid programme, and a legacy client, must **not** be refused | both assert the gate lets them through — without these, a gate that refused everyone would pass |

**8 · APPEND LOG**

- **28 Aug — GPT closure pass.** Two real gaps found and patched (controlled batching; fail-open checkout email). One wrong instruction corrected (deployment order) plus a function-overload ambiguity it exposed. Full-suite RED excluded from BUILD-002 by construction and pinned as a test; the flake itself remains unreproduced and unexplained.
