# 🚀 LAUNCH PAD — what to do now

> **This page is a LIST, not a book** (founder, 21 Aug: *"tracking docs need to be like lists… i cant read 60 000 words in 5 minutes"*). Item · one line · owner. **Why** lives in KIND-MASTER · **status** in PRODUCT-INVENTORY · **later** in V2-TRACKER · **rulings** in PRODUCT-RULES.
> **🆕 28 Aug —** *what needs the founder right now* lives in [`FOUNDER-OPERATING-TRUTH.md`](./FOUNDER-OPERATING-TRUTH.md) (blockers · decisions required · the **two-level task state**, R83) · *where a given truth lives* in [`FOUNDER-TRUTH-REGISTER.md`](./FOUNDER-TRUTH-REGISTER.md) (194 subjects by CMP ID) · *a fresh chat starts at* [`SESSION-BOOTSTRAP.md`](./SESSION-BOOTSTRAP.md). **None of them own status — this page and PRODUCT-INVENTORY still do.**
> ⛓️ **PASSED — the launch day below is history (23 Sep): production has live clients (R135, R138).** ~~**🚀 R76: WE LAUNCH FRIDAY 4 SEPTEMBER 2026 REGARDLESS OF STATE.**~~ ⛓️ *Supersedes R57's 25 August, which is now history — only the date moved; the slip stays on the record and the date is still unconditional.* **R65:** pause is the default — silence is never a go; a build starts only on the founder's "go". Anything that does not aid the live state moves post-live to V2-TRACKER.
> The full pre-surgery page is kept verbatim at [`archive/LAUNCH-PAD-2026-08-21.md`](./archive/LAUNCH-PAD-2026-08-21.md).

## ✅ VERIFIED STATE — 23 Sep 2026 (`origin/main` = `83e9c1b` · live = `6a93c77`)

- **Live = `6a93c77`.** The API, Milla, Vida and the website all report it from their health endpoints (checked 23 Sep). `main` is one merge ahead — #1738 (R142, Apollo seniority values) is merged but not yet shipped; merging does not deploy, `scripts/ship.sh` does. *RUNTIME VERIFIED.*
- **Database matches the code.** All migrations applied, founder-checked in Vida → Engine, 23 Sep. *RUNTIME VERIFIED (founder).*
- **Gate.** `check.sh` passes on `6a93c77` (499 test files · 10,524 tests) **once `@kind/db` is built**; on a fresh clone it fails the type-check and 34 tests because the gate builds `@kind/shared` but never `@kind/db`. *CODE VERIFIED.*
- **Money.** Programme only — **$450 per *qualified* meeting**, 50/50 (R141, 23 Sep) — $299 / $4 retired (R124 16 Sep · R137 23 Sep). **Partners frozen** (R139, 23 Sep).
- **Preview site not in use.** `staging` is 741 commits behind `main`; every change since 20 Aug went straight to live (RULEBOOK §11).
- **GitHub caught up 23 Sep.** 71 obsolete audit issues and 15 finished/superseded inventory issues closed; every remaining open issue (114) carries a dated "where this stands" comment; PRs #1665–#1668 closed as already in `main`.

## ▶️ THIS WEEK — runlist

| # | Action *(GitHub # = issue on github.com · inventory # = PRODUCT-INVENTORY row)* | Owner |
|---|---|---|
| W1 | Confirm `POOLED_SENDERS_JSON` is set on Railway — unset, every programme stops at Prepare (GitHub #1484 · inventory #710) | 🧍 |
| W2 | GO / no-GO: a sequence keeps sending if its campaign settings can't be read (GitHub #1527) | 🧍 |
| W3 | GO / no-GO: `check.sh` must build `@kind/db` so it passes on any machine (GitHub #1548) | 🧍 |
| W4 | Retention-clock ruling (GitHub #1472 · inventory #704) · engage the accountant before revenue (GitHub #1600) | 🧍 |

*Settled 23 Sep by R141 — no longer on the list: the website may show $450, and "qualified meeting" has its rule.*

**Board:** 🟢106 · 🩷357 · 🟣2 · 🟡23 · 🔴179 · ⏸7 · **Σ674** · live count: `scripts/count-inventory.sh`

---

## 🛑 THE CUT — the only work between here and live

> ⛓️ **HISTORY (23 Sep): the launch day has passed — the cut below is kept verbatim, not current work.** C2f merged as #1701 / #1702 · C3's $4 money walk is retired (R137) · C6's partner work is frozen (R139) · C9's send day was 4 Sep. Current work is the runlist above.

> ⛓️ **RE-DATED 28 Aug (R76): this was "THE 25TH CUT". The launch day is now FRIDAY 4 SEPTEMBER 2026.** The list below is unchanged in content — the same work, against a new day. Rows still reading "pre-25" mean **pre-launch**; C9's send day moves to 4 Sep.

| # | Action | Owner | When |
|---|---|---|---|
| C1 | 📅 Google Calendar runbook steps 3–5 — test connection · Search Console TXT · submit · add client test users. **The 20-Aug token dies ~27 Aug.** [`runbooks/GOOGLE-VERIFICATION.md`](./runbooks/GOOGLE-VERIFICATION.md) | 🧍 | **now** |
| C2 | 📚 Docs reconciliation — ✅ done, PR #1428 | 🤖 | ✅ |
| C2b | 🔒 **Canonical truth** — an outside audit found the canonical layer contradicting itself. Fixed: KIND-MASTER $99→**$299** · inventory intro off-era → managed/Milla-first · README puts PRODUCT-RULES first · DOC-MAP indexes `compliance/`+`runbooks/` (12 files it never listed) · legal-pack's false *"DPAs ✅ in place"* → **not held** · APOLLO-ENGINE banner → **AR5, Apollo is OURS**. Plus V2-TRACKER restored verbatim (690 → 18,138 words). ~~**Two open PRs — #1430 (V2 restore) + this one. Founder merges.**~~ ⛓️ **CORRECTED 25 Aug — BOTH ARE MERGED.** `#1428` (`346b54dd`), `#1429` (`fd6b5c25`) and `#1430` (`c3969ad2`) are all in `origin/main` at baseline `e62c6c8c`; the only PRs still open on the repo are **#1436** and **#1427**. This row read *"⏳ open"* for merged work. | 🤖 | ✅ |
| C2c | 🔒 **AR5 provider boundary** (#699) — four live doors chose Apollo-vs-PDL by which API keys existed, so clients' sourcing spent K.I.N.D's Apollo and house hunting spent the clients' PDL. Now one audience→provider decision, key-blind, fails closed to `client`. Rulings recorded: **AR12** pool-first · **AR13** company-name house-only · **AR14** preview external-only · **AR15** legacy drain. **22 Aug — GPT-5.6 review caught a second open door:** PDL leads carry a `pdl_…` id, which the paid Apollo reveal treated as truthy, so client records still went to our Apollo. Guard added at that door; `lead-delivery.ts` still untouched. **Second round: the AR8 PDL cash fence was gating the HOUSE** — a Client-Zero Milla run with no PDL allowance said *"Sourcing paused"* and never reached Apollo. Audience now resolves before the fence; the client's AR8 path is unchanged. **AR16** — Hunter is fine for the house too. **Third round: the money followed the provider and AR8 did not** — `lookalike/generate` was spending PDL with no fence (~$14/click); now on the client's allowance, house unfenced. Preview gets the existing rate limiter. ~~**PR open — founder merges.**~~ ⛓️ **CORRECTED 25 Aug — MERGED.** `apps/api/src/lib/provider-boundary.ts` is on `origin/main` at baseline `e62c6c8c`. | 🤖 | ✅ |
| C2d | 🎁 **Launch coherence** (#700) — five approved items. **K.I.N.D owns GO** (AR9 amended: a client edit could start unwatched sourcing; now admin-gated with a GO button in Vida) · **one active campaign** per client · **Milla's understanding now reaches FIGSY** (the conversation was discarded, so every cold email was written blind) · **permissioned proof** — a named customer or a metric only reaches outreach if the client said yes · **free real-lead proof**: real masked leads before payment, two passes, **40 PDL records / $11.20 max per prospect**, **$300/mo acquisition ceiling with its own budget and ledger** so it can never eat paid delivery (**AR17/AR18**). `try_spend_sourcing` and `TRIAL_LIFETIME_CAP` untouched. 31 new tests, 2,994 green. ~~**PR open — founder merges after GPT review.**~~ ⛓️ **CORRECTED 25 Aug — MERGED** as PR **#1438** (`a0366e80`); `apps/api/src/lib/start-work-one-active.test.ts` is on `origin/main` at baseline `e62c6c8c`. ⚠️ **The CODE is merged; the STATUS is not flipped — item #700 is still 🟡 in PRODUCT-INVENTORY and the flip is the founder's** (`bash scripts/flip-dots.sh 🩷 700`). Merged ≠ 🩷. | 🤖 | ✅ code · ⏳ dot |
| C2e | 🗣️ **Milla + Vida conversational correction** (#707, R121/R122) — the product behaved like a form wearing a chat UI. Five builds on branch, nothing pushed: **0** Sonnet on every human-facing surface · **1** Milla onboarding becomes a real conversation · **3** Vida becomes model-backed with tools · **2** one Milla · **4** last word-list retired. **Founder walks Milla and Vida on PREVIEW before anything ships.** | 🤖 | pre-live |
| C2f | 🧩 **MVP1 end-to-end alignment + launch-safety closeout** (R127–R132) — the locked six-stage MVP1 flow now actually runs: Proof truth is the client-usable count not the raw sourcing count · zero-eligible Proof is a Vida task, not client calibration · no programme before Proof · automatic sender prep · Make Live ≠ Run ≠ Running · **one external reply can never reach two clients (fails closed, operator exception)** · no client can be handed K.I.N.D's own sending address. **ON BRANCH `claude/mvp1-full-alignment-16sep`, UNMERGED, UNDEPLOYED.** Needs: founder review → GPT-5.6 independent review → founder merge. Plus: an unattributable reply is now **retained in full** and decided by a human in Vida (attribute / discard), so the fan-out fix is no longer paid for in lost mail. ⚠️ **TWO MIGRATIONS UNAPPLIED** — `20260916_client_inboxes_one_live_per_email` and `20260917_unattributed_replies`; founder runs both from Vida → Engine. | 🧍 | **now** |
| C3 | 💰 J3 money walk + A9 — the $4 seen moving on screen · one clean fresh signup | 🧍 | pre-25 |
| C4 | 🔎 A10 — Instantly glance · Google ~$28 charge · reconcile the #198 25-vs-30 drift | 🧍 | Sun/Mon 24 |
| C5 | 🧾 B2 — company-cost lines checked in a real browser | 🧍 | pre-25 |
| C6 | 🤝 Partner pre-live — H31 lifetime-clause wording · W1 partner walk, one sitting | 🧍 | pre-25 |
| C7 | ⚖️ W18 counsel booked · PDL Order Form found | 🧍 | pre-25 |
| C8 | ⏳ Triggered — A22 unlock pair · A23 pool-first proof · P15/P16 on counsel's word | 🧍 | on trigger |
| C9 | 🗓️ **A14 — SEND DAY: execute [`SEND-DAY-RUNBOOK.md`](./SEND-DAY-RUNBOOK.md), alone** | 🧍 | **Fri 4 Sep** |

**Everything else is post-live** → [`V2-TRACKER.md`](./V2-TRACKER.md) § THE 25TH CUT — PARKED POST-LIVE. *(That V2 section keeps its original name — it is a historical heading, not a live date.)*

---

## 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT

> ⛓️ **HISTORY (23 Sep, checked against main `83e9c1b`): this was the plan for a 4 Sep launch.** The Proof journey has since been rebuilt on Apollo — client Proof sources through Apollo (AR19, 15 Sep), PDL is retired (FD-6, 17 Sep), the one calibrated restart carries its own 20 records (R134, 19 Sep) and Proof opens only when 20 people are ready (R138, 23 Sep; inventory #709). The PDL-era steps below (T1, T2, T9, T11) are moot. Kept verbatim.

> Founder-set 25 Aug, after the live pass-1 attempt. ⛓️ **28 Aug: the DATE moved to Friday 4 September (R76) — the discipline did not. The date still does not bend.** What this section records is that the free-proof journey itself is not complete, and the exact order it is being finished in. Rulings behind it: **R66** (paid testing freeze) · **R67** (retention ≠ contactability) · **R79** (the launch experience must be finished, not merely working).

| # | Action | Owner | When |
|---|---|---|---|
| **T1** | 🛑 **PASS 1 IS NOT COMPLETE** — do not mark it green on the 25 Aug live attempt. That run reserved 20 records, PDL returned nothing, the reservation was released, and the desk never left *"Finding your matches now…"* | 🤖 | Wed |
| **T2** | 🛑 **PASS 2 IS NOT COMPLETE** — required journey end to end: pass 1 → refinement → exact pass-2 search → on a proved zero, ONE widened fallback → second surfaced batch → correct Latest/Earlier behaviour → the accepted latest widened batch updates the SAME ICP → **no third automatic query or pass** | 🤖 | Wed |
| **T3** | ✅ **PROOF TERMINAL STATE — BUILT 26 Aug (partial).** The desk decided *"still finding"* from a URL flag and *"finished"* only from leads arriving, so a run that ended with **zero** spun forever. It now reads the `icp_run_outcomes` row `runIcpJob` already writes, carried on the summary it already polls, and renders the server's own canonical copy. The start moment is stamped into the URL so a **reload cannot resurrect the spinner**, and a terminal outcome **stops the poll** — no second search, ever. ✅ **FAILURE STATE CLOSED 26 Aug (founder-approved).** `icp_run_outcomes.status` gains **`failed`**, written only at the crash boundary and **never derived** — a crash can no longer be recorded as `no_match` (which would claim the targeting matched nobody when the query never ran). The prospect sees the approved recovery copy — *"We hit a snag confirming your matches"* / *"Your setup is saved and has been flagged for K.I.N.D review. You won't need to start again."* — never the word *failed*, and **no provider name, status code or stack**. No retry offered, no second search, human still alerted. ⚠️ **Migration `20260826_run_outcome_failed` must be run after the deploy.** | 🤖 | ✅ |
| **T4** | ✅ **SAFE TESTING ONLY (R66) — BUILT 26 Aug.** `SAFE_TEST_MODE=1` makes every paid provider call throw at the `fetch` boundary (PDL · Apollo · Hunter · Clearbit). ⚠️ **Fail-closed: providers are OFF unless `PAID_PROVIDERS_ENABLED=true` is set deliberately** — so forgetting a variable refuses a call instead of spending. Safe data exhausted ⇒ the run **fails loudly**, never buys. ⚠️ **DEPLOYMENT ACTION: set `PAID_PROVIDERS_ENABLED=true` on @kind/api or live sourcing will not run.** | 🤖 | ✅ |
| **T5** | ✅ **ACQUISITION RETENTION (R67) — BUILT 26 Aug.** `acquisition_memory` retains every paid identity before any client gate can discard it, emailless ones included; retention ≠ contactability. ⚠️ **Migration NOT yet applied to production** — deploy the API first, then run it (the runner executes code compiled into the deployed build). Cost-avoidance from re-acquisition remains **RESEARCH**, unproven. | 🤖 | ✅ code |
| **T6** | 💳 **BOUNDARIES RE-VERIFIED** — payment, reveal, K.I.N.D GO and the send ladder all stay downstream of a successful proof. `AUTO_OUTREACH_ENABLED` stays **off** until #553's first-send ladder passes | 🤖/🧍 | Wed–Thu |
| **T7** | 🚀 **#553 OWN-LEAD SEND LADDER → controlled GO** | 🧍 | Thu |
| **T8** | 💰 **COMMERCIAL PACK FOR FRIDAY** — worst-case CAC · per-client unit economics · 5-clients/month scenario · partner-channel scenario · pricing-model review. Detail in the table below | 🤖/🧍 | Thu, COB |
| **T9** | 💵 **$4 → $8 RECURRING LEAD PRICE — ONE COORDINATED MIGRATION (R68).** ⛓️ **27 AUG — SUPERSEDED FUTURE DIRECTION. This migration is history, not pending work.** The chronology, in three registers: **$4 is LIVE LEGACY runtime** (operational, unchanged) · **this $4→$8 migration is SUPERSEDED** — an earlier future direction, preserved and not deleted · **the CURRENT founder-approved direction is the programme model (R74)** — ~$450 per targeted booked meeting with automatic volume discounts, **unimplemented**. Legacy runtime stays operational until the coordinated programme migration is built, tested, founder-approved and deployed. **Do not start the $8 migration.** See **R74** · **V2 §Founder Idea Bank FI-26/FI-68**. ⚠️ **LIVE TODAY = $4. TARGET = $8. $8 IS NOT LIVE.** $299 and the included first 100 do **not** change. **No partial rollout: never advertise $8 while charging $4, or charge $8 while a surface still says $4.** **THREE price literals must move together** — `packages/shared/src/constants/index.ts:219` · `apps/api/src/lib/integrity-checks.ts:50` (both `LEAD_PRICE_USD = 4`, defect **#687**) · and **`apps/api/src/lib/approve-lead.ts:22` `PRICE_PER_LEAD_USD = 4`, which is the one that actually charges the wallet**. ⚠️ **Commission derives from the SHARED constant, the charge from the LOCAL one — moving one alone pays a partner $2 on a $4 sale.** Then: wallet/billing · Stripe products/prices · website · portal · Milla · Vida · reporting assumptions · tests/fixtures · docs. **Verification targets: approval 101 charges exactly $8, and the partner commission row for it is exactly $2.** 🛑 **NOT IMPLEMENTED — awaiting founder GO** | 🤖 | **this week** |
| **T10** | 🔁 **PROOF RUNTIME FAILURE — THE WHOLE PATH, NOT A SEGMENT (FI-10).** It has failed more than once, and each fix so far closed one segment. The path that must be proved end to end: **proof claim → job dispatch → pool lookup → paid-provider guard → failure boundary → `icp_run_outcomes` persistence → Milla summary → portal terminal state.** ⚠️ **Do not mark resolved without repo evidence** — a green segment is not a green journey. Related: **T1/T2/T3**, R72③, and PR #1460 (the Pass-2 human handoff, open). | 🤖 | Open |
| **T11** | 🔌 **THE CONTROLLED EXIT FROM ZERO-SPEND (FI-11).** `PAID_PROVIDERS_ENABLED` stays **OFF** for all safe proof testing (**R66**, fail-closed). Before the first deliberate real sourcing test it is enabled **only** under **controlled K.I.N.D house use**, **founder-approved**, knowingly accepting **real provider spend**. ⚠️ This is the one authorised way the guard comes off; nothing else may switch it. | 🧍 | Before first real test |
| **T12** | 🧹 **PRE-LAUNCH CLEANUP — AUDIT BEFORE DELETE (FI-12).** Production must start clean of fake/test accounts. **But not casually:** ① audit exactly which accounts are fake/test · ② inspect dependent/cascade records · ③ identify launch evidence and ops data that must be preserved · ④ delete **only with founder approval**. See `SEED-WIPE-PLAN.md`. ⚠️ `clients` cascades to leads, ICPs, campaigns and ledgers — a casual delete removes the evidence of the launch it was meant to clean up for. | 🧍 | Before live |

*(The 26-Aug line that stood here — "Tuesday (today) is plan-lock…" — was a one-day instruction, not a standing rule. Removed 28 Aug rather than left to read as current. **R65 is the standing rule: pause is the default and a build starts only on the founder's "go".**)*

---

## 🧭 28 AUG — THE FOUNDER TRUTH RESET: THE FOUR DECISIONS AND WHAT THEY CHANGE

> ⛓️ **23 Sep (checked against main `83e9c1b`):** D1's launch date has passed. D6's curve is **built** and is the only live price (`packages/shared/src/programme-pricing.ts`; R137, R141 — sold per *qualified* meeting). D3's partner share is frozen with partners (R139). D2 is re-set by R136 (250 expected, 400 limit, never shown to the client). #706 (trial copy in the Vida playbook) is **still true** — 7 lines in `apps/admin/src/app/playbook/page.tsx` (GitHub #1494). Kept as the record of 28 Aug.

> The founder ran an eight-step reconciliation of the whole repo. Evidence chain (frozen, do not edit): [`FOUNDER-TRUTH-INVENTORY-2026-08-28.md`](./FOUNDER-TRUTH-INVENTORY-2026-08-28.md) · [`FOUNDER-TRUTH-COMPARISON-2026-08-28.md`](./FOUNDER-TRUTH-COMPARISON-2026-08-28.md) · [`FOUNDER-TRUTH-CLASSIFICATION-2026-08-28.md`](./FOUNDER-TRUTH-CLASSIFICATION-2026-08-28.md). Rulings: **R76 … R81** in PRODUCT-RULES.
> ⚠️ **A DECISION RECORDED IS NOT A BUILD AUTHORISED (R75/R65).** Everything below marked UNBUILT stays unbuilt until the founder says go.

| # | Decision | State |
|---|---|---|
| **D1** | 🚀 **LAUNCH IS FRIDAY 4 SEPTEMBER 2026** (**R76**) — supersedes R57's 25 Aug; the slip stays on the record, the date stays unconditional | ✅ recorded |
| **D2** | 🎯 **FD-01 — 250 recommended leads per targeted booked meeting** (**R77**), a planning benchmark, never a promise. ⚠️ **R69's 250–300-with-no-meeting CAMPAIGN REVIEW TRIGGER survives** — a one-meeting programme therefore sits *at* the review threshold by design | ✅ recorded · 🔴 unbuilt |
| **D3** | 💰 **FD-02 — programme contribution = programme revenue − directly attributable acquisition and delivery costs; fixed overhead excluded; partner = 25% of contribution** (**R78**). ⚠️ **$4-tied partner economics (R47, `PARTNER_COMMISSION_PER_LEAD_USD`) are LIVE LEGACY and SUPERSEDED as the destination** | ✅ recorded · 🔴 unbuilt · **#702** |
| **D4** | ✨ **FD-03 — Milla, Vida and the website launch as ONE finished, premium, conversational experience. QUALITY IS NOT V2** (**R79**) — finish is launch-critical and may not be deferred as polish | ✅ recorded · 🔴 requirement, not built |
| **D5** | 💾 **FD-04 — client-configurable retention is POST-LAUNCH** (**R80**). The phrase **"retention settings" stays absent** (banned by `website-residency-claims.test.ts`); **no purge job exists**; **RETENTION ≠ CONTACTABILITY (R67) is untouched** | ✅ recorded · 🔴 post-launch · **#703** |
| **D6** | 📐 **THE PROGRAMME PRICING CURVE, EXACT** (**R81**): 1 mtg **$450** · 10 **$437.50** · 50 **$400** · 50+ **$400 floor**. `PPM = 450 − ((m−1)×12.50/9)` for 2–10 · `PPM = 437.50 − ((m−10)×37.50/40)` for 11–50 · price = m × PPM · leads = m × 250. **50/50 payment · controlled ~250 batches · pause / unused value never expires / make-whole.** ⚠️ **LIVE TRUTH IS STILL $299 + 100 included + $4** | 🔴 **unbuilt · unquotable** · **#701** |

**🛑 THE ONE BLOCKER STEP 6 RETURNED — founder + legal, item #704.** Four live surfaces state **four different retention clocks** (90 days · 12 months · 24 months, with the DPA inverting the privacy policy). **No authoritative basis exists in the repo to choose**, so Step 6 did not choose. Corrected without waiting on it: the false *"automatically purged"* claim and the false *af-south-1 / Cape Town* region claim. See **R80** and the Open list in PRODUCT-RULES.

**⚠️ THE WEBSITE FREEZE (#605) WAS RE-STAMPED — ONE LINE, AND IT IS FLAGGED HERE SO IT IS NOT SILENT.** Correcting the false *"automatically purged"* claim touched `apps/website/privacy.html`, which is founder-frozen, so `website-freeze.test.ts` went **RED — the lock working, exactly as designed.** The founder's own Step-6 instruction names this change in plain words, which is the approval the lock requires, so `scripts/freeze-website.sh` was re-run (124 files re-hashed). **The diff on the live site is one line:** *"12 months, then automatically purged"* → *"retained for 12 months, then deleted on request or on account closure"*. **No other website file changed.** ⚠️ **It is a client-facing change and it has NOT been previewed or shipped** — it sits in PR #1464 for the founder (RULEBOOK §11).

**✅ CORRECTED — item #705 (the founder ruled this WAS in Step-6 scope).** The portal Terms no longer promise a **14-day free trial** (§3 → *Access & Activation*: the account starts **paused**, $0 balance, $0 sourcing allowance until first purchase) or the **90-Day Pipeline Guarantee** (§5A → *No Outcome Guarantee*; the §5/§10 "sole exception" cross-references are gone). **R64 caught a second live surface:** `/terms` and `/privacy` are ALSO rendered by `apps/portal/src/app/(legal)/*/page.tsx`, **alongside** the static `/terms.html` that the signup consent checkbox actually links to — both were live, both disagreed, both are corrected. Four `apps/landing` pages had trial claims removed (**liveness unproven — no build or deploy config; corrected anyway**). ⚠️ **Removing §5A deletes a refund commitment from a live agreement — no client has ever claimed under it, but the Terms-change notice and any rights of a client who signed under the old wording are for counsel (W18).** ⚠️ **Not shipped — awaiting the founder (§11).**

**🛑 STILL FALSE, OPERATOR-FACING — item #706.** `apps/admin/src/app/playbook/page.tsx` still scripts the dead **14-day trial** to AEs in six places, including two prospect email templates. Not a client-facing surface — but it is what a human then says to a prospect. **Not rewritten: the replacement script is a commercial call for the founder** (live offer = $299 · 100 included · $4; the programme model is unbuilt and unquotable).

**📍 REGION — PROVED, AND ONE LIMIT STATED.** `eu-west-1` (Dublin) is the **primary database region**, evidenced by a **working production pooler connection** on 6 Aug (`aws-0-eu-west-1.pooler.supabase.com:5432`, 14/14 migrations applied) and the founder's own dashboards on 20 Aug (R56). **Compute is Railway US West.** ⚠️ **NOT proved that it is the ONLY place data lives** — backups/PITR/sub-regions remain open question **F5**, and no `.env` exists in the repo, so today's value is founder-dashboard-verified, not code-verified. Full evidence: PRODUCT-RULES Open list.

---

## 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack

> ⛓️ **HISTORY (23 Sep): the meeting date has passed and partners are frozen (R139, 23 Sep), so M4 is moot. M5's "$299 + $4" review is overtaken — R124 (16 Sep) and R137 (23 Sep) retired that model; the price is R141's $450 per qualified meeting on the R81 curve.** Any per-client economics now start from the programme. Kept verbatim.

> Model of record stays [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html); partner maths stays [`hiring/KIND-partner-calculator.html`](./hiring/KIND-partner-calculator.html). **Nothing here changes pricing** — PR1's $299 lock stands until the founder rules otherwise after reading the evidence.
> ⛓️ **28 Aug — READ THIS BEFORE THE TABLE. The founder HAS since ruled on the direction, and it does not change what is live.** The **programme model** is the approved commercial destination with an exact locked curve (**R81**) and a defined contribution basis (**R78**) — **and none of it is built.** **The live commercial truth this pack must model is unchanged: $299 pack · first 100 approvals included · $4 per approved lead.** M5 below is therefore no longer *"the founder decides any change"* — the direction is decided; what M5 still owes is the **evidence** that the curve and the ~70% contribution target survive real unit economics. **M7 and M8 remain UNRESOLVED and still block M2.**

| # | The question to answer | Owner |
|---|---|---|
| M1 | **Worst-case client acquisition cost** on conservative outbound run rates, response/conversion rates and win rates | 🤖 |
| M2 | **Per-client economics** — ⛓️ *re-base on the programme (R137, 23 Sep); the $299/$4 inputs are retired* · ~~$299 · first 100 approved included · $4 after~~ · provider/data cost · mailbox + domain · warm-up allocation · known AI/provider cost · gross profit · gross margin · contribution margin · CAC payback · LTV/CAC · cash to sustain growth | 🤖 |
| M3 | **5 new clients per month** planning scenario | 🤖 |
| M4 | **Partner channel** — economics where a partner introduces and scales clients without K.I.N.D running its own outbound engine. ⚠️ **CAC is never described as zero** unless the model states the partner/channel cost, the servicing cost and the commercial share | 🤖 |
| M5 | **Pricing-model review** — $299 + $4/approved-lead against real unit economics, margin, value perception and willingness-to-pay evidence. **Evidence only; the founder decides any change** | 🤖 |
| M6 | **Willingness-to-pay / value perception** research | 🤖 |
| M7 | ⚠️ **RECORDS-PER-APPROVAL SENSITIVITY — run M2 at 1.5 · 3 · 7, not at one number.** Every per-client figure hangs off it, and the repo does not agree with itself: `run-costs-and-cashflow.md` §5 carries **2** (*"flow v2"*) while its own warning says **#415 measured nearer 7**. At $0.28/record that is the difference between ~$0.56 and ~$1.96 of data per approved lead — on a $4 lead. **Do not present a single-point per-client margin until this is resolved.** 🏷️ UNKNOWN / NEEDS VERIFICATION | 🤖 |
| M8 | ⚠️ **RESOLVE THE CLIENT-SENDER COST MODEL BEFORE M2 IS PRESENTED** — the two docs disagree; see the ⚠️ conflict note in [`run-costs-and-cashflow.md`](./run-costs-and-cashflow.md) § *Scales with the work*. M2 cannot be sound while its mailbox line is unresolved. 🏷️ UNKNOWN / NEEDS VERIFICATION | 🤖 |

**Known costs are used as known. Every assumption is labelled as an assumption. No invented cost is presented as a fact.**

⚠️ **SCOPE OF THIS PACK — the FOUNDER OS IS NOT IN IT.** The Founder-Operator OS and the Company Operating Map (V2-TRACKER §1) are **post-launch operating work**, and neither their build effort nor any tooling they need belongs in these launch economics. They are excluded deliberately, not overlooked — recorded here so a later reader does not "find" a missing cost line and add one.

---

## 📊 THE FACTS THAT MUST NOT DRIFT — guarded by `cost-floor-drift.test.ts`

| Fact | The number / the order |
|---|---|
| Cost floor | The cost floor is **$352/mo all-in** — $146 platform + $206 company. ⛓️ *23 Sep: the $4 per lead is retired (R137) — the programme now carries this floor, and a per-client break-even needs re-basing on it.* ~~At $4/approved lead the platform half alone is ~37 approvals a month, roughly one client.~~ *(Model of record: [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html).)* |
| A12 · Failover teardown | Failover teardown ($12/mo back) — **DNS repoint FIRST**, then tear down; the order is in [`render-cloudflare-failover.md`](./render-cloudflare-failover.md) and getting it backwards breaks production. 🧍 |

---

## 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays

| # | The question |
|---|---|
| F1 | ⛓️ **Moot 23 Sep — PDL retired (FD-6, 17 Sep).** ~~`pdl_cursor` retry — can a retried sourcing run charge twice?~~ |
| F2 | Does an opt-out stop us re-SCORING that person, or only stop the sends? (GDPR Art. 21) |
| F3 | Booking path: timezone-mismatch behaviour still unverified (the rest was line-read and proved live) |
| F4 | ⛓️ **Closed — fixed in `f9e89d56` (19 Aug); the header now says the dashboard is reachable.** ~~`pending-migrations.ts` header claims the Supabase dashboard cannot be opened — no longer true~~ |
| F5 | Residency — is `aws-0-eu-west-1` the only place client data lives? (backups · PITR · vendor sub-regions) |
| F9 | `opted_back_in_at` applied to 10 of 13 blocklist probes — fails closed, but inconsistent |
| F10 | `suppressOptOut` writes a normalised blocklist row but updates `leads` with the raw address — ⛓️ **still true 23 Sep** (`apps/api/src/lib/reply-ingest.ts:183-196`) |
| F11 | `figsy.ts:463` drops a read error on the on-reply path — an unreadable campaign keeps sending — ⛓️ **still true 23 Sep; the code is now at `apps/api/src/lib/figsy.ts:520-533`** (GitHub #1527) |
| F12 | Nothing refuses a secret that is obviously not a secret (`UNSUBSCRIBE_SECRET` held a sentence) |
| F13 | ⛓️ **Moot 23 Sep — PDL retired (FD-6, 17 Sep); the Apollo half is F15.** ~~PDL licence — cross-client reuse unconfirmed against the Order Form (counsel, W18)~~ |
| F15 | Apollo terms — no Apollo-sourced record delivered to any paying client without a written right |
| F17 | Does any compliance document still rest on the SA precondition R45 invented? |

**Closed:** F6 (R51 — GA gone, pixel off) · F7 (R47 ruled + built) · F8 (repo-side complete) · F14 (P27 — opens never read) · F16 (#683 — scopes narrowed). Detail: KIND-MASTER session log.

---

## 📌 THE RULES THAT GOVERN THIS PAGE

| Rule | In one line |
|---|---|
| R76 | ⛓️ **Passed — history.** ~~**Friday 4 September 2026** is unconditional — nothing moves the date *(supersedes R57's 25 Aug)*~~ |
| R82 | The **repo** is the durable source of truth and execution evidence — material history is chained or appended, never silently deleted |
| R83 | A task carries **two** states: founder attention (NOW/NEXT/WAITING/PARKED/RESEARCH/DONE) **and** the Scout/Builder conveyor. **Merged ≠ deployed ≠ proved** |
| R84 | Notion is an **interface**, never canonical and never the only copy |
| R79 | Milla + Vida + website launch as ONE finished, premium, conversational experience — **quality is not V2** |
| R81 | The programme curve is locked — ⛓️ **built and the only live model since 23 Sep (R137); sold per *qualified* meeting (R141)**; ~~unbuilt — the live commercial truth is still $299 + 100 included + $4~~ |
| R65 | Pause is the default · silence is never a go · not-live-aiding → V2 · LAUNCH-PAD updated in the same PR as every merge |
| R64 | Prove which route renders a surface before building into it (`scripts/dead-surfaces.sh`) |
| R62 | The product keeps UK time — Europe/London |
| §11 | Client-facing work is previewed first — the founder approves 🟣 before it goes live |
| O3 | No ad-hoc SQL — migrations run from Vida → Engine only |

*Dates live in git. This page carries no "last updated" stamp by design.*
