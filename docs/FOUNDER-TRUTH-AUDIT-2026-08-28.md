# 🔎 FOUNDER TRUTH AUDIT — 28 August 2026

> **This file is an AUDIT, not a source of truth.** It records what was found, where, and how far it can be trusted. It changes nothing, decides nothing and supersedes nothing.

---

## 1. Audit metadata

| | |
|---|---|
| **Date** | 28 August 2026 |
| **Audited `origin/main` SHA** | `fecaefde3a7780b9afd3a4a8a378cc13f0c09ab0` |
| **Branch** | `claude/founder-truth-audit`, cut from `origin/main`, **0 ahead / 0 behind** at audit start |
| **Merges confirmed present** | PR #1459 (`5d39fa1d`), PR #1461 (`fae0a726`, `cf7daa1a`, `992a0520`), PR #1460 (`a1686cd9`, `7da52ded`, `43640ede`) — each verified with `git merge-base --is-ancestor` |
| **Scope** | Canonical docs, financial artifacts, website copy, and *targeted* runtime/schema inspection sufficient to test documented claims |
| **Not in scope** | A complete codebase audit; production database inspection; any provider call |

### ⚠️ Explicit statement on canonicity

**No document was treated as true because it is a document.** Every material claim below was tested against runtime code, schema, or a dated founder decision. Where a doc's claim could not be corroborated, the verdict is **STALE**, **CONFLICT**, **RECOVERY REQUIRED** or **UNKNOWN** — never "probably fine".

**No missing history was reconstructed.** A founder conversation of 27 August may have been lost. Nothing in this audit fills that gap by inference. Items known only from the founder's 28 August restatement are marked as such and are **not** presented as pre-existing repo truth.

### ⛓️ CORRECTED 28 Aug — repo absence is not the same as unknown truth

The first pass of this audit conflated **"missing from the repo"** with **"RECOVERY REQUIRED"**. They are different questions and are now answered in separate columns:

| Question | Values |
|---|---|
| **A · Does the repo currently contain it?** | FOUND · PARTIAL · MISSING · CONFLICT |
| **B · What is its truth verdict?** | VERIFIED LIVE · VERIFIED CURRENT DIRECTION · PARTIAL · STALE · CONFLICT · SUPERSEDED · RECOVERY REQUIRED · FOUNDER DECISION REQUIRED |

**FRT-01 … FRT-11 were explicitly restated by the founder on 28 August.** A founder direction the founder has just stated is **VERIFIED CURRENT DIRECTION** even when the repo has no record of it — the repo is behind, the truth is not unknown. The correct reading of such an item is *"repo: MISSING · truth: VERIFIED CURRENT DIRECTION"*, and the action is **to write it down**, not to recover it.

**RECOVERY REQUIRED now means one thing only: the truth cannot currently be established safely.** It is never used because a current founder decision is absent from GitHub.

⚠️ **Every FTA row carries exactly ONE primary verdict.** Live evidence, current direction and implementation state have their own columns and must not be smuggled into the verdict.

**Mutations performed: none.** No code, schema, config or migration changed. No migration run. No deploy. No provider call. No paid action.

---

## 2. Executive truth summary

**Major VERIFIED LIVE truths**
- The money model in code is **$299 pack · first 100 approvals included · $4 per approved lead**, charged per lead at reveal (`approve-lead.ts:290`).
- Free proof is **hard-capped at two passes** in the database (`try_claim_proof_pass`), 20 leads each. **There is no pass 3.**
- **Unattended nightly paid sourcing no longer exists** (PR #1459).
- **Pool-first sourcing, the R66 zero-spend guard and the AR5 provider boundary are all real and enforced.**
- The **proof-exhaustion operator handoff is built and deployed**, and its migration is **founder-reported applied** — **end-to-end production verification is still pending** (FTA-031).

**Major APPROVED-BUT-UNBUILT truths**
- The **entire programme commercial model** (R74) — $450/meeting, volume discounts, 50/50 payment, Go-Live gate, batches, pause, programme authority. **Zero implementation. No `programmes` table, no batch entity, no go-live concept.**
- **Booked vs Held vs Booked-unverified**, and **Outlook calendar support**. None exist.

**Major STALE areas**
- **`docs/client-flow-sop.md` describes a trial-based funnel that no longer exists.** Trials were retired (#607); signup writes `status: 'paused'`.
- **Every financial artifact except `run-costs-and-cashflow.md` predates the programme model** and contains zero reference to it.
- **The public website sells the legacy model exclusively.**

**Major CONFLICTS** — 2 genuine, both requiring the founder.
- **R69's ~150 accepted prospects per booked meeting vs the programme seed of 250 recommended leads.**
- **The accounting definition of "programme contribution"** on which partner commission now depends.

**RECOVERY REQUIRED** — **none.** After the 28 Aug taxonomy corrections there is no item whose truth cannot be established safely. Two classes were wrongly filed here in earlier passes: ① founder directions absent from the repo (the programme price curve, the conversational flywheel, Meet Milla/Meet Vida, the weekend allocation, the Founder Operating Truth artifact, portal UI quality) — these are **VERIFIED CURRENT DIRECTION with the repo MISSING or PARTIAL**, a writing task; ② the **~7:1 sourcing attainment (FTA-014)** — a **founder-reported observational baseline** that is simply **not telemetry-backed**, which makes it **PARTIAL**, not unknown. **The repo is behind and some metrics are uninstrumented; neither is the same as truth being unrecoverable.**

**MIGRATION STATE (founder operational evidence, 28 Aug)** — Vida → Engine reported **36 of 37 applied**. `20260827_proof_review_handoff` is **among those applied**. **`20260727_pdl_cursor` failed** and is open follow-up (FTA-064).

---

## 3. Canonical-doc inventory

| Path | Apparent purpose | State | Major concern |
|---|---|---|---|
| `docs/PRODUCT-RULES.md` | The register of founder rulings (AR/R/F/PR series, R1–R75) | **Current** | Carries both legacy and current direction by design. R74/R75 added 27 Aug. The register is the most trustworthy doc in the repo |
| `docs/LAUNCH-PAD.md` | Today's / this week's execution (T1–T12) | **Mixed** | T9 now correctly marks the $8 migration superseded. Dated "25 Aug" section is being worked past its own date |
| `docs/V2-TRACKER.md` | Future detail + the new Founder Idea Bank FI-01…FI-69 | **Current** | 1,700 lines. The FI bank is new (27 Aug) and internally consistent. Older sections retain historic roadmap language |
| `docs/PRODUCT-INVENTORY.md` | Status of record (the only home for dots) | **Current** | Σ660 items; doc-lint enforces board consistency |
| `docs/KIND-MASTER.md` | Strategy, decisions, session log | **Mixed/historical by design** | 1,185 lines, largely append-only history. Not a current-truth surface |
| `docs/client-flow-sop.md` | Client journey SOP, 7 paths | **🔴 STALE** | Trial-based. `$99` appears at line 42. No mention of free proof as the entry, **zero** mention of programme |
| `docs/run-costs-and-cashflow.md` | Money/economics | **Mixed — the only reconciled one** | Carries both legacy §0 and the new 27 Aug programme-economics section |
| `apps/website/pricing.html` | Public pricing | **🔴 STALE (public)** | `$299` ×7, `$4` ×17, programme ×0 |
| `apps/website/pipeline-calculator.html` | Public calculator | **🔴 STALE (public)** | `$4` ×3, programme ×0 |
| `docs/CASHFLOW-LAB.html` | Cashflow model | **🔴 STALE** | `$299` ×9, `$4` ×7, programme ×0 |
| `docs/SALARY-BREAKEVEN-PLAN.md` | Breakeven planning | **🔴 STALE** | Built on per-lead revenue |
| `docs/PARTNER-BRIEF.md` | Partner-facing | **🔴 STALE** | `$299` ×7, `$4` ×8; PR10 already flags stale partner copy |
| `docs/DESIGN-REFERENCE.md`, `docs/portal-v2-layout.md`, `docs/onboarding-tour-buildplan.md` | UI/design | **UNKNOWN currency** | Not tested against the shipped portal in this audit |
| `docs/strategy/*.html` | Jack & Jill / positioning verifications | **Historical artifacts** | Contain the Jack & Jill structural language FRT-01 refers to |
| `docs/RULEBOOK.md`, `CLAUDE.md` | Agent operating rules | **Current** | Protocol v1 |
| *(no file)* | **Migration run history** | **🔴 MISSING** | The Vida → Engine run of 28 Aug (**36 of 37 applied**, `20260727_pdl_cursor` failed) is **recorded nowhere in the repo**. Migration outcomes currently survive only as founder recollection — the same class of loss this audit exists to address |

---

## 4. Master truth matrix

**Verdict tally — 64 rows, 64 verdicts, one primary verdict per row, reconciles exactly:**

| VL | VCD | PARTIAL | STALE | CONFLICT | SUPERSEDED | RECOVERY REQUIRED | FOUNDER DECISION | Total |
|---|---|---|---|---|---|---|---|---|
| 18 | **26** | **10** | 6 | 2 | 1 | **0** | 1 | **64** |

⛓️ **CORRECTED 28 Aug, in two passes.** Pass 1: 63 rows, RECOVERY REQUIRED 9, one dual verdict (FTA-037). Pass 2 added FTA-064 (the failed `20260727_pdl_cursor` migration), reduced RECOVERY 9 → 1 (eight were founder directions absent from the repo, now VCD), gave FTA-037 a single primary verdict, and moved the `(legacy)` qualifier out of five verdict cells into the direction and supersession columns that already carry it. Pass 3 reclassified **FTA-014 from RECOVERY REQUIRED to PARTIAL** — a founder-reported observational baseline that lacks telemetry is *partial*, not *unknown*.

**RECOVERY REQUIRED is now 0.** Nothing in this audit is truth that cannot be established safely.

Abbreviations — Verdict: **VL** verified live · **VCD** verified current direction · **PAR** partial · **ST** stale · **CF** conflict · **SUP** superseded · **RR** recovery required · **FDR** founder decision required. Priority: **CN** critical now · **LC** launch critical · **PLC** post-launch critical · **V2** · **H** history. State: **B** built · **P** partial · **U** unbuilt · **BL** blocked · **S** superseded · **UNK** unknown.

### 4.1 Commercial / money

| ID | Material item | Source location | Live evidence | Docs say | Current direction | Supersession | Verdict | Pri | State | Conflict | Founder decision | Recovery | Canonical home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-001 | $4 per approved lead | `packages/shared/src/constants/index.ts:219` | `LEAD_PRICE_USD = 4`; charged at `approve-lead.ts:290` `try_charge_wallet` | Live legacy (R74) | Superseded as architecture | R68→$8 superseded; R74 replaces | **VL** | LC | **B** | No | No | No | PRODUCT-RULES R74 | Keep until programme migration |
| FTA-002 | $299 pack, first 100 included | `constants/index.ts:215-217` | `PACK_LEADS=100`, `PACK_PRICE_USD=299`; `packState()` in `approve-lead.ts:279` | Live legacy | Replaced by programme | R74 | **VL** | LC | **B** | No | No | No | PRODUCT-RULES R74 | As above |
| FTA-003 | $4→$8 migration | `LAUNCH-PAD` T9, R68 | Not implemented; three `= 4` literals still live | T9 now marks it **superseded** | Superseded | R74 | **SUP** | H | **S** | No | No | No | LAUNCH-PAD T9 | Do not start |
| FTA-004 | Programme pricing ~$450/targeted booked meeting | PRODUCT-RULES **R74**; V2 FI-26 | **None.** No price constant, no programme entity | Direction, unimplemented | Current approved | Supersedes flat-$4 | **VCD** | LC | **U** | No | No | No | PRODUCT-RULES R74 | Design before build |
| FTA-005 | Working point: 10 meetings / 2,500 leads / **$4,375** / **$437.50** effective; floor **~$400** at 50+ | Founder input 28 Aug | None | **Repo: MISSING — absent from every doc** | Current approved (founder 28 Aug) | — | **VCD** | LC | **U** | No | No | No | `run-costs-and-cashflow.md` | Write it down — the repo is behind, the truth is not unknown |
| FTA-006 | Automatic volume discount curve | R74; FI-27 | None | Direction | Current approved | Supersedes 3 Aug "no discount logic in code" lock | **VCD** | LC | **U** | No | No | No | R74 | Curve must be specified (see FTA-005) |
| FTA-007 | ~70% contribution-margin protection as a **real money guard** | R74; FI-28; `run-costs` §27 Aug | None — `cost-floor.ts` is reporting only | Direction | Current approved | — | **VCD** | LC | **U** | No | No | No | `run-costs-and-cashflow.md` | Define the guard's trigger |
| FTA-008 | 50% upfront / 50% at Go Live | R74; FI-36 | **None.** `stripe.ts` takes one full charge | Direction | Current approved | Supersedes single-charge | **VCD** | LC | **U** | No | No | No | R74 | Needs schema (FTA-020) |
| FTA-009 | Programme-level approval, not per-lead | R74; FI-37/FI-65 | Per-lead approval is the only model (`leads.ts` `/:id/approve`) | Direction | Current approved | Supersedes per-lead accept | **VCD** | LC | **U** | No | No | No | R74 | — |
| FTA-010 | Partner commission = 25% of **programme contribution** | R74; FI-58 | `PARTNER_COMMISSION_PCT=25` derived from `LEAD_PRICE_USD` (`constants/index.ts:249`) | Direction (gross-vs-contribution settled) | Current approved | R47 becomes legacy | **VCD** | LC | **U** | No | No | No | R74 / R47 | Blocked on FTA-011 |
| FTA-011 | Definition of "programme contribution" | R74; FI-59 | None | Explicitly undefined | **Unresolved** | — | **FDR** | LC | **U** | **Yes** | **Yes** | No | R74 | **Founder must define** |
| FTA-012 | Coverage k=2 sourcing authority from dollars | `20260711_sourcing_fences.sql` §5 | `add_sourcing_allowance` grants 2 records per $1 | Live | Superseded by programme authority | FI-42 | **VL** | LC | **B** | No | No | No | R74 | Replace with programme authority |
| FTA-013 | 2:1 sourcing in code | `onboarding-pack.ts:23` | `PACK_SOURCE_TARGET = PACK_LEADS × 2` = 200 | Recorded in `run-costs` | 1:1 for planning | FI-29/FI-67 | **VL** | PLC | **B** | No | No | No | `run-costs` | Leave until programme |
| FTA-014 | **Sourcing attainment ≈ 7 sourced → 1 usable/accepted** | Founder recovery input; **V2 FI-01** (*"POST-LAUNCH CRITICAL — sourcing attainment"*) · `run-costs` | **No instrumentation currently proves the actual sourced→usable ratio.** The only in-code ratio is the unrelated `PACK_SOURCE_TARGET = ×2` | FI-01 records the baseline and the objective; **not telemetry-backed** | **Founder-reported approximate observed baseline ≈ 7 → 1.** Direction: improve sourcing precision toward **≈ 1.5 → 1** post-launch, ultimately as close to 1:1 as real data allows | Not a conflict with FI-29 | **PAR** | **PLC** | **UNINSTRUMENTED** | No | No | No | `run-costs` / V2 FI-01 | ⛓️ **CORRECTED 28 Aug — this is NOT recovery required.** The founder reported the observed baseline contemporaneously; a missing telemetry pipeline does not erase a reported observation. **~7:1 is preserved as a founder-reported observational baseline, not a telemetry-verified metric.** ⚠️ It must NOT be converted into VERIFIED LIVE, into the commercial planning assumption (**FI-29 is 1:1**), into the programme recommendation ratio, or into the 150:1 / 250:1 meeting benchmark — **four separate concepts.** Next action: instrument it |

### 4.2 Benchmark / recommendation

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-015 | **~150 accepted prospects per booked meeting** | PRODUCT-RULES **R69** (26 Aug) | No forecasting surface | R69 locks it, range 100–250; 250–300 triggers campaign review | — | — | **CF** | LC | **U** | **Yes** | **Yes** | No | R69 / R74 | **See FTA-016** |
| FTA-016 | **250 recommended leads per targeted booked meeting** (seed) | R74; FI-31; founder 28 Aug | None | FI-31 marks the conflict | Current approved seed | — | **CF** | LC | **U** | **Yes** | **Yes** | No | R74 | 🛑 **FOUNDER DECISION REQUIRED.** Denominators were tested: R69 counts *accepted/contacted prospects*, the seed counts *recommended programme leads* — different stages, **except the 1:1 planning assumption (FI-29) collapses them onto the same denominator.** Comparable, and they disagree. **Not resolved here** |
| FTA-017 | Client actual benchmark replaces the seed | R69; FI-32 | `nexus` computes `meeting_rate` (display only) | R69 already requires it | Current approved | — | **PAR** | LC | **U** | No | No | No | R69 | Persist per-client benchmark |
| FTA-018 | Poor performance → stop/review, never auto-upsell | R69; FI-33 | None | R69: *"do NOT automatically tell the client to buy more"* | Current approved | — | **VCD** | LC | **U** | No | No | No | R69 | — |
| FTA-019 | Show starting **and** actual benchmark to client | FI-34; founder 28 Aug | None | FI-34 only | Current approved | — | **VCD** | LC | **U** | No | No | No | V2 FI-34 | Part of the calculator |

### 4.3 Programme execution / authority

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-020 | Programme entity (target meetings, quantity, price, status, remaining value) | R74; FI-30/36/43/55 | **Nothing.** grep for `programme`/`go_live`/`batch_status` across `apps/api/src` + `supabase/migrations` returns 1 unrelated hit | FI bank records all of it | Current approved | — | **VCD** | LC | **U** | No | No | No | R74 + new migration | **Schema first** — additive, inert |
| FTA-021 | ~250-lead controlled batches, configurable | R74; FI-38 | `start-work.ts` tops a desk to 200; no batch entity | FI-38 | Current approved | — | **VCD** | LC | **U** | No | No | No | R74 | After FTA-020 |
| FTA-022 | Healthy batch continues / material issue auto-pauses | R74; FI-39 | None | FI-39 | Current approved | — | **VCD** | LC | **U** | No | No | No | R74 | — |
| FTA-023 | Client **Pause Programme** stops sourcing **and** sending | R74; FI-40 | **None.** Campaign pause ≠ sourcing pause; `start-work.ts:303` logs `SOURCING ANYWAY` when send-readiness fails | FI-40 | Current approved | — | **VCD** | **LC** | **U** | No | No | No | R74 | ⚠️ The `SOURCING ANYWAY` path is live today |
| FTA-024 | Material ICP change pauses future sourcing until reconfirmed | R74; FI-41 | **None.** `icps.ts` `PATCH /:id` writes and nothing else | FI-41 | Current approved | — | **VCD** | LC | **U** | No | No | No | R74 | — |
| FTA-025 | No spend outside explicit programme authority | R74; FI-42 | **Partial.** PR #1459 removed the unattended nightly top-up; `try_spend_sourcing` fences remain dollar-derived | FI-42 | Current approved | — | **PAR** | LC | **P** | No | No | No | R74 | Authority object |
| FTA-026 | Unattended nightly paid top-up | `cron.ts` (retired), `internal.ts` 410 | **Removed.** No `cron.schedule` references it; endpoint answers 410 | LAUNCH-PAD / FI-42 | Removed | Superseded | **VL** | LC | **B** | No | No | No | — | Done |
| FTA-027 | Unrestricted client "Run" sourcing | `icps.ts` `POST /:id/run` | **LIVE.** Free, no quantity, rate-limited 10/min; passes `credit_balance` as a record count | Not recorded as a defect anywhere | Superseded by programme authority | — | **VL** | LC | **B** | No | No | No | R74 / V2 | ⚠️ Survives PR #1459 |
| FTA-028 | Unused programme value never expires | R74; FI-43 | Credits never expire (no expiry logic; trial-expiry cron retired). **Programme value is not representable** | FI-43 | Current approved | — | **PAR** | LC | **U** | No | No | No | R74 | After FTA-020 |

### 4.4 Free proof

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-029 | Pass 1 ≤20 → one refinement → Pass 2 ≤20 → stop | `20260822_free_proof_acquisition.sql`; `PROOF_PASS_LEADS` | **LIVE.** `try_claim_proof_pass` returns 0 when `proof_passes_done >= 2`, under `FOR UPDATE` | R72; LAUNCH-PAD T1/T2 | Unchanged | — | **VL** | LC | **B** | No | No | No | R72 | — |
| FTA-030 | **No Pass 3** | same | **LIVE and enforced in the database** | R72 | Unchanged | — | **VL** | LC | **B** | No | No | No | R72 | — |
| FTA-031 | Proof exhaustion → real operator handoff | PR #1460 | **BUILT** — merged into `origin/main` (`icps.ts`, `operator.ts`, `vida/page.tsx`). **DEPLOYED** — founder-reported. **MIGRATION APPLIED** — founder-reported via Vida → Engine (36 of 37) | FI-52 | Current approved | Supersedes copy-only | **PAR** | **CN** | **P** | No | No | No | R72 | **BUILT / DEPLOYED / E2E VERIFICATION PENDING.** ⚠️ The real production journey — exhausted prospect → Vida alert → Mark reviewed → alert clears — **has not been walked**. Not claimed VERIFIED LIVE until it is |
| FTA-032 | Proof terminal state ("finding" vs "no match") | R72③; LAUNCH-PAD T3 | Partially built (26 Aug) | R72③ marks it **OPEN** | — | — | **PAR** | LC | **P** | No | No | No | R72 | T3 |
| FTA-033 | Recurrent end-to-end proof runtime failure | LAUNCH-PAD **T10** | Path spans claim → dispatch → pool → guard → failure boundary → outcome → Milla → portal | T10 records it, unresolved | — | — | **PAR** | **LC** | **P** | No | No | No | LAUNCH-PAD T10 | Prove end to end, not per segment |

### 4.5 Sourcing / providers

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-034 | Pool first, always | PRODUCT-RULES **R49** | **LIVE** — `pool-sourcing.ts`, enforced in `icps.ts` | R49 | Unchanged | — | **VL** | LC | **B** | No | No | No | R49 | — |
| FTA-035 | PDL is the launch provider; Apollo API parked | **AR5**; `provider-boundary.ts` | **LIVE** — `searchProviderFor(audience)` | AR5; FI-60/61 | Unchanged for launch | FI-08 supersedes long-term | **VL** | LC | **B** | No | No | No | AR5 | — |
| FTA-036 | Apollo-acquired pool data remains servable | **R73** (27 Aug) | **LIVE** — `POOL_ELIGIBLE_SOURCES = ['pdl','apollo']` | R73; FI-62 | Current | Chains F15 | **VL** | LC | **B** | No | No | No | R73 | — |
| FTA-037 | `PAID_PROVIDERS_ENABLED` OFF; controlled exit condition | **R66**; LAUNCH-PAD **T11** | Guard is fail-closed and enforced (`paid-provider-guard.ts`) | T11 records the exit rule (new, 27 Aug) | The controlled exit condition is current approved direction, unbuilt | — | **VL** | LC | **B** | No | No | No | R66 / T11 | ⛓️ **Single primary verdict.** The guard is what is LIVE; the exit rule lives in the direction column and is not yet exercised. Founder-approved house test only |
| FTA-038 | Apollo geography incapability | 27 Aug diagnostic; `run-costs` | No-credit search returns only `has_country` booleans | Recorded in `run-costs` + FI-07 | Blocks Apollo re-entry | — | **VL** | PLC | **BL** | No | No | No | `run-costs` | Needs enrichment economics |
| FTA-039 | Suppression / DNC enforcement | `suppression.ts`, `opt_out_blocklist` | **LIVE** in the send path | Multiple | Unchanged | — | **VL** | LC | **B** | No | No | No | — | Visibility is FTA-050 |

### 4.6 Meetings / calendar

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-040 | Booked and Held separate | R69; FI-46 | **Cannot be expressed.** `calendar_bookings.status` CHECK is `pending\|confirmed\|cancelled` (`007_calendar.sql:40-41`) | R69 tracks them as rates | Current approved | — | **PAR** | LC | **U** | No | No | No | R74/R69 | CHECK widening |
| FTA-041 | **Booked — unverified** state | FI-47; founder 28 Aug | Does not exist | FI-47 | Current approved | — | **VCD** | LC | **U** | No | No | No | V2 FI-47 | With FTA-040 |
| FTA-042 | Counting rules: reschedule once; duplicate/spam/outside-ICP excluded; no-show stays Booked not Held | FI-48; founder 28 Aug | `no_show_at` exists (operator-set, `20260724_vida_qualify_and_noshow.sql:34`); no counting rules | FI-48 | Current approved | — | **VCD** | LC | **U** | No | No | No | V2 FI-48 | Define before reporting |
| FTA-043 | **Outlook / Microsoft calendar** | FI-49; founder 28 Aug | **Does not exist.** Only `outlook_zoho` — a **CRM** id (`integrations.ts:15`). Calendar is Google-only (`google_event_id`, `google_calendar_*`) | FI-49 | Current approved | — | **VCD** | LC | **U** | No | No | No | V2 FI-49 | New adapter |
| FTA-044 | Booking-link fallback; client confirms Held/No-show | FI-50/51 | `/book/[token]` exists; not positioned as fallback; no client confirmation | FI-50/51 | Current approved | — | **PAR** | LC | **P** | No | No | No | V2 | — |
| FTA-045 | MEETING_BOOKED as the downstream boundary | `CLAUDE.md` protocol r21 | Boundary holds | FI-15 marks premium expansion beyond it as post-launch | Unchanged for launch | — | **VL** | LC | **B** | No | No | No | CLAUDE.md | Not a conflict |

### 4.7 Product surfaces / experience

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-046 | Milla Jack & Jill conversational shell preserved | FI-53 | `(milla)/milla/page.tsx` — conversation + right panel, 1,445 lines | FI-53 | Current constraint | — | **VL** | LC | **B** | No | No | No | V2 FI-53 | Standing constraint |
| FTA-047 | Vida conversational/operator shell preserved | FI-54 | `admin/vida/page.tsx` — command box + cockpit tabs, 2,320 lines | FI-54 | Current constraint | — | **VL** | LC | **B** | No | No | No | V2 FI-54 | — |
| FTA-048 | **Conversational flywheel** (conversation → understanding → recommendation → decision → action → feedback → learning) | **Founder 28 Aug (FRT-02)** | **Partial.** Conversation, understanding (R71 KNOWN/MISSING/CONTRADICTORY) and refinement exist. **Recommendation and learning loops do not.** | **Repo: MISSING** — the flywheel as a named product principle is in no doc | Current approved (founder 28 Aug) | — | **VCD** | **LC** | **P** | No | No | No | PRODUCT-RULES (new rule) | Record as a rule — it governs every programme surface |
| FTA-049 | Client never experiences "give info → handoff → wait" | Founder 28 Aug (FRT-02) | ⛓️ **Corrected.** The proof-exhaustion instance is **built and deployed with its migration applied** (FTA-031). It is **no longer simply live as a defect** — but the end-to-end journey is unverified, so the principle is not yet demonstrated either | **Repo: MISSING** | Current approved (founder 28 Aug) | — | **VCD** | LC | **P** | No | No | No | PRODUCT-RULES | With FTA-048; verify E2E |
| FTA-050 | Vida lead-pool / suppression / DNC operator visibility | FI-02/03/04 | **No operator view exists** for any of the three | FI bank, post-launch | Post-launch | — | **VCD** | **PLC** | **U** | No | No | No | V2 | See §7 |
| FTA-051 | Portal UI quality | **Founder 28 Aug (FRT-04/FRT-11)** | Not assessed in this audit | **Repo: PARTIAL** — 3 UI docs exist, currency untested; **no quality bar recorded** | Current approved (founder 28 Aug) | — | **VCD** | LC | **UNK** | No | **Yes** | No | New | The *direction* is settled; the **acceptance bar is a founder decision**, not an unknown |
| FTA-052 | Website → Milla → programme → Vida consistency | **Founder 28 Aug (FRT-05)** | **Cannot be satisfied today** — the programme stage does not exist in code or schema | **Repo: MISSING** | Current approved (founder 28 Aug) | — | **VCD** | **LC** | **U** | No | No | No | New | Gate cannot pass until the programme exists (FTA-020) |

### 4.8 Website / public truth

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-053 | Public pricing page | `apps/website/pricing.html` | `$299` ×7, `$4` ×17, programme ×0 | — | Will be false under programme | — | **ST** | LC | **B** | No | No | No | FI-56 | Sweep after FTA-004 |
| FTA-054 | Public calculator | `apps/website/pipeline-calculator.html` | `$4` ×3, programme ×0 | — | Superseded by FI-35 | — | **ST** | LC | **B** | No | No | No | FI-35/56 | Rebuild |
| FTA-055 | Terms / legal | `apps/website/terms.html`; `apps/portal/src/app/(legal)/terms/page.tsx`; **duplicate** `apps/portal/public/terms.html` | Wallet/$4 language; `$4` at `terms.html:154` | — | Must change for 50/50 + non-refundable | — | **ST** | **LC** | **B** | No | No | No | FI-56 | ⚠️ Highest-risk surface; **two copies of Terms in one app** |
| FTA-056 | **"Meet Milla" / "Meet Vida"** treatment | **Founder 28 Aug (FRT-01)** | `"Meet Milla"` ×3 in `index.html`; **`"Meet Vida"` appears ONCE, in `nexus.html` only — not on `index.html`, and there is no Meet-Vida page treatment.** `milla.html` (507 lines) and `vida.html` (502) contain **zero `<h1>`/`<h2>`** | **Repo: PARTIAL** — the direction is recorded nowhere | Current approved (founder 28 Aug) | — | **VCD** | **LC** | **P** | No | No | No | New | The asymmetry is real and measured; the direction is settled and needs writing down |
| FTA-057 | Demo video | `RECORDING-SHOOTING-SCRIPT.md`; FI-57 | Shows Pick/Not-a-fit + $4 | FI-57 | Re-record after programme | — | **ST** | PLC | **B** | No | No | No | FI-57 | After FTA-004 |

### 4.9 Docs / operating

| ID | Material item | Source | Live | Docs | Direction | History | Verdict | Pri | State | Conflict | FDR | Recovery | Home | Next action |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| FTA-058 | **`client-flow-sop.md` describes a trial funnel** | `docs/client-flow-sop.md` | **Trials are retired.** `SIGNUP_SUBSCRIPTION_STATUS = 'paused'` (`signup-subscription.ts:65`); the two trial crons were removed (#607) | 7 paths built on "self-service trial", `$99` at line 42, `Paystack` at line 14 (Paystack is retired), **programme ×0**, proof ×3 | Superseded twice over | — | **ST** | **LC** | **S** | No | No | No | `client-flow-sop.md` | 🔴 Rewrite or mark historical — it is the client-journey doc and it describes a product that no longer exists |
| FTA-059 | Founder Operating Truth is needed because docs are insufficient | **Founder 28 Aug (FRT-03)** | No Founder-OS doc exists on main | **Repo: MISSING** — only scattered mentions in KIND-MASTER / V2 | Current approved (founder 28 Aug) | — | **VCD** | **CN** | **U** | No | No | No | New (this audit is step 1) | The *artifact* is missing; the *direction* is not |
| FTA-060 | No material idea lives only in chat | **R75** (27 Aug) | Rule exists; V2 FI bank is its instance | R75 | Current | — | **VL** | CN | **B** | No | No | No | R75 | Apply to FRT-01…11 |
| FTA-061 | Weekend allocation: 12h Saturday + 12h Sunday | **Founder 28 Aug (FRT-10)** | **Repo: MISSING.** Searched LAUNCH-PAD and KIND-MASTER; only false-positive prose hits | **Repo: MISSING** | **Current founder planning truth**, supplied 28 Aug | — | **VCD** | CN | **U** | No | No | No | LAUNCH-PAD | Write it into LAUNCH-PAD. **Explicitly NOT recovery** — the founder stated it |
| FTA-062 | Production fake/test account cleanup | LAUNCH-PAD **T12**; `SEED-WIPE-PLAN.md` | Not performed | T12 adds audit-before-delete | Current | — | **VCD** | LC | **U** | No | No | No | LAUNCH-PAD T12 | Audit first |
| FTA-063 | `RAILWAY_GIT_COMMIT_SHA` unset → deploy state unverifiable | `apps/api/src/index.ts:150`; live `/health` returns `"commit":"unknown"` | **Confirmed** | Not recorded anywhere | — | — | **ST** | **CN** | **B** | No | No | No | `ENVIRONMENT.md` | ⚠️ Every "is it deployed?" is unanswerable by the service, which is why deployment state in this audit rests on founder report rather than instrumentation |
| FTA-064 | **`20260727_pdl_cursor` migration FAILED** | Founder operational evidence, 28 Aug — Vida → Engine reported **36 of 37 applied** | The runner reported one failure: `20260727_pdl_cursor`. **No repo record of the failure or its reason** | Not recorded | Open follow-up | — | **PAR** | **LC** | **BL** | No | No | No | LAUNCH-PAD | 🔴 **Establish why it failed and what it leaves unbuilt.** `pdl-cursor.ts` is the audience-exhaustion cursor; a failed migration there may mean the cursor state it depends on is absent. **Not diagnosed in this audit** — no production access, and the runner output was not captured in the repo |

---

## 5. Founder inputs — FRT-01 … FRT-11

⛓️ **CORRECTED 28 Aug.** Two independent columns. **Repo reconciliation** answers *"does the repo contain it?"*; **truth verdict** answers *"how far can it be trusted?"*. A direction the founder stated on 28 August is **VERIFIED CURRENT DIRECTION** whatever the repo says — the repo being behind is a writing task, not an unknown.

| FRT | Item | Repo reconciliation | Truth verdict | Exact repo evidence |
|---|---|---|---|---|
| **FRT-01** | Meet Milla / Meet Vida use Jack & Jill structural language | **PARTIAL** | **VERIFIED CURRENT DIRECTION** | `"Meet Milla"` ×3 in `apps/website/index.html` (1804, 1812, 1919). **`"Meet Vida"` appears exactly once, in `apps/website/nexus.html`** — not on the homepage. `milla.html`/`vida.html` (507/502 lines) contain **zero `<h1>`/`<h2>`**. J&J language lives in `docs/strategy/get-kind_jack_and_jill_product_model_verification.html`, `KIND-MASTER.md`, `PRODUCT-RULES.md` — never applied to the website |
| **FRT-02** | Conversational flywheel; never "give info → handoff → wait" | **MISSING** | **VERIFIED CURRENT DIRECTION** | The seven-stage pattern appears in **no** repo doc. Nearest relatives: **R71** (KNOWN/MISSING/CONTRADICTORY) and **R72⑦** (refinement reflected back). ⛓️ The proof-exhaustion instance is now **BUILT · DEPLOYED · migration applied** (FTA-031) — **E2E verification pending** |
| **FRT-03** | Founder Operating Truth is vital; docs insufficient | **MISSING** | **VERIFIED CURRENT DIRECTION** | No `FOUNDER-OPERATING-*` file on `origin/main`. `grep -rl "Founder Operating"` returns only passing mentions in `KIND-MASTER.md`, `V2-TRACKER.md`, `PRODUCT-RULES.md`, `LAUNCH-PAD.md`. The **artifact** is missing; the **direction** is not |
| **FRT-04** | Portal UI quality vital | **PARTIAL** | **VERIFIED CURRENT DIRECTION** | `DESIGN-REFERENCE.md`, `portal-v2-layout.md`, `onboarding-tour-buildplan.md` exist; currency untested here. ⚠️ **No quality bar or acceptance criteria recorded** → that gap is **FOUNDER DECISION REQUIRED** (FTA-051), not unknown truth |
| **FRT-05** | Consistency website → Milla → programme → Vida | **MISSING** | **VERIFIED CURRENT DIRECTION** | Not recorded. **Cannot be satisfied today**: the *programme* stage does not exist (FTA-020). The chain today is website → Milla → **per-lead approval** → Vida |
| **FRT-06** | Review V2/post-launch for promotion | **PARTIAL** | **VERIFIED CURRENT DIRECTION** | `V2-TRACKER.md` §Founder Idea Bank (FI-01…FI-69, 27 Aug) already splits launch-current (FI-10/11/12 → T10/T11/T12) from post-launch. The review itself is **§7** |
| **FRT-07** | Simple docs; four bands CRITICAL NOW / LAUNCH / POST-LAUNCH / V2 | **MISSING** | **VERIFIED CURRENT DIRECTION** | No doc uses those bands. `V2-TRACKER` uses *Phase 0–4*; `LAUNCH-PAD` uses T-numbers; `PRODUCT-INVENTORY` uses dots. **Three incompatible taxonomies; the founder's four are a fourth** |
| **FRT-08** | One indexed view of every material item | **MISSING** | **VERIFIED CURRENT DIRECTION** | No index exists. Closest is the FI bank (69 items, V2-scoped) — it does not index PRODUCT-RULES, LAUNCH-PAD or the money docs. §4 here is the first cross-doc matrix |
| **FRT-09** | All financial docs reconciled to the programme model | **PARTIAL** | **VERIFIED CURRENT DIRECTION** | **Only `run-costs-and-cashflow.md` carries programme content** (`programme` ×3, `450` ×3). Zero programme references in `pricing.html` ($299×7, $4×17), `pipeline-calculator.html` ($4×3), `CASHFLOW-LAB.html` ($299×9, $4×7), `SALARY-BREAKEVEN-PLAN.md`, `PARTNER-BRIEF.md` ($299×7, $4×8) |
| **FRT-10** | 12h Saturday + 12h Sunday founder build days | **MISSING** | **VERIFIED CURRENT DIRECTION** | Not in the repo — searched `LAUNCH-PAD.md`, `KIND-MASTER.md`; the only "Sunday" hit is unrelated send-cadence prose. ⛓️ **Explicitly NOT recovery required**: supplied 28 Aug as *"current founder planning truth"*. The action is to write it into LAUNCH-PAD |
| **FRT-11** | Website and UI critical before launch | **PARTIAL** | **VERIFIED CURRENT DIRECTION** | **LAUNCH-PAD T1–T12 contain no website or UI item.** The 25 Aug cut lists proof, sending, boundaries, commercial pack, pricing — while FTA-053/054/055 show public surfaces stating a superseded model |

**Repo reconciliation tally:** FOUND 0 · PARTIAL 5 · MISSING 6 · CONFLICT 0.
**Truth verdict tally:** **VERIFIED CURRENT DIRECTION 11 of 11.** None is RECOVERY REQUIRED.

---

## 6. Financial truth audit

**Every material pricing/economics model found, and its state:**

| Model | Where | State |
|---|---|---|
| **$299 pack · 100 included · $4/approved lead** | `constants/index.ts:215-219`; `approve-lead.ts:290` | **LIVE LEGACY — operational** |
| **$4 → $8 migration** | R68; LAUNCH-PAD T9 | **SUPERSEDED HISTORY** — T9 now says *"Do not start the $8 migration"* |
| **Programme: ~$450/targeted booked meeting + auto volume discount** | R74; V2 FI-26/27 | **CURRENT DIRECTION — UNIMPLEMENTED** |
| **Working point 10 mtgs / 2,500 leads / $4,375 / $437.50 · floor ~$400 at 50+** | Founder 28 Aug only | **🔴 RECOVERY REQUIRED — in no document** |
| **Coverage k=2** (2 sourcing records per $1 collected) | `20260711_sourcing_fences.sql` §5 | **LIVE LEGACY** — dollar-derived authority, superseded by programme authority |
| **2:1 pack sourcing** (`PACK_SOURCE_TARGET`) | `onboarding-pack.ts:23` | **LIVE LEGACY** |
| **1:1 commercial planning assumption** | FI-29; `run-costs` 27 Aug | **CURRENT DIRECTION** |
| **~7:1 observed attainment** | Founder observation | **RECOVERY REQUIRED — unmeasured in repo** |
| **~150 accepted prospects per booked meeting** | R69 | **🛑 CONFLICT with the 250 seed** |
| **~70% contribution margin** | R74; `run-costs` | **CURRENT DIRECTION — no guard exists** |
| **Partner 25% of $4 lead spend** | R47; `constants/index.ts:249` | **LIVE LEGACY** — derived from `LEAD_PRICE_USD` |
| **Partner 25% of programme contribution** | R74; FI-58 | **CURRENT DIRECTION — blocked on FTA-011** |
| **Cashflow / breakeven / partner models** | `CASHFLOW-LAB.html`, `SALARY-BREAKEVEN-PLAN.md`, `PARTNER-BRIEF.md` | **STALE — zero programme content** |
| **Public pricing + calculator** | `pricing.html`, `pipeline-calculator.html` | **STALE — client-visible** |

⚠️ **The margin arithmetic recorded 27 Aug still stands and still bites:** at $450 and 70% contribution the COGS ceiling is ~$135; at the 250 seed and 1:1 sourcing, PDL alone is ~$70 (≈52% of the allowance). **At 500 leads per meeting, PDL alone is $140 and contribution goes negative.** This is why FTA-015/016 is a money decision, not a wording decision.

---

## 7. V2 / post-launch promotion candidates

**Claude has promoted nothing.** Each row is a recommendation only.

| Item | Current classification | Evidence | Risk if left post-launch | Recommendation |
|---|---|---|---|---|
| **Vida lead-pool visibility** (FI-02) | V2 | No operator view exists | Operator cannot see what inventory is servable before enabling PDL; geography-servable pool was recently ~0 | **PROMOTION CANDIDATE** — operability + money risk |
| **Suppression / DNC visibility** (FI-03) | V2 | Enforcement is live; **visibility is not** | Cannot prove to a client or regulator who was suppressed and why; no operator check before a first real send | **PROMOTION CANDIDATE** — trust + compliance risk |
| **Money / margin visibility** (FI-28) | V2 | No guard, no surface | Programme could be sold below contribution with nothing to detect it | **FOUNDER DECISION REQUIRED** — depends on whether programme ships at launch |
| **Milla/Vida conversational experience** (FRT-02) | Not classified anywhere | Flywheel unrecorded; anti-pattern live at proof exhaustion | This is the product's core differentiator; a handoff-and-wait experience undermines the whole proposition | **PROMOTION CANDIDATE** — founder named it LAUNCH CRITICAL |
| **Portal UI consistency** (FRT-04/11) | Not on LAUNCH-PAD | T1–T12 contain no UI item | Client's first impression; founder named it launch critical | **FOUNDER DECISION REQUIRED** — no quality bar defined to build against |
| **Meet Milla / Meet Vida website** (FRT-01) | Not recorded | "Meet Vida" absent from homepage | Asymmetric product story on the public site at launch | **PROMOTION CANDIDATE** |
| **Production fake/test cleanup** (FI-12 / T12) | Already on LAUNCH-PAD T12 | Not performed | Launch metrics polluted; cascade deletes risk destroying launch evidence | **KEEP — already launch-current** |
| **Controlled provider/spend visibility** (FI-11 / T11) | Already on LAUNCH-PAD T11 | Guard live; exit rule newly recorded | First real spend without a visible ledger view | **KEEP — already launch-current**, consider pairing with FI-02 |
| **Booked/Held/unverified + Outlook** (FI-46–49) | V2 | Schema cannot express Held; Outlook absent | If meetings are the commercial unit (**$450/meeting**), the product cannot *measure the thing it charges for* | **PROMOTION CANDIDATE — strongest case in this table** |
| Glean · Multi-player AI · Milla voice · Slack front door · premium coaching · CodeRabbit · extra sources | V2 | FI-17–25, FI-15/16, FI-22, FI-09 | None at launch | **KEEP LATER** — no launch dependency found |

---

## 8. Conflicts requiring founder decision

Only two survive scrutiny. Everything else resolved as a supersession chain.

**CONF-1 — the benchmark (FTA-015 / FTA-016).**
R69 (26 Aug) locks **~150 accepted prospects per booked meeting**, range 100–250, and makes **250–300 with no booked meeting a campaign-review trigger**. The programme seed is **250 recommended leads per targeted booked meeting**. Denominators were tested, not assumed: R69 counts *accepted/contacted prospects*; the seed counts *recommended programme leads* — different stages, **except that the 1:1 commercial planning assumption (FI-29) collapses them onto the same denominator**. They are therefore comparable and they disagree, and the seed places every client at R69's review threshold on day one. **Money consequence: at 500 leads/meeting the programme is loss-making.** Not resolved here.

**CONF-2 — "programme contribution" (FTA-011).**
Partner commission moves to **25% of programme contribution** — that direction is settled. **What counts as contribution is not**: which costs are deducted, at what point, and whether it is measured per programme or per period. Until defined, FI-58 cannot be built or quoted to a partner. Meanwhile the legacy path still derives `PARTNER_COMMISSION_PER_LEAD_USD` from `LEAD_PRICE_USD`, so **any per-lead price change silently rewrites partner earnings**.

---

## 9. Recovery required

## ✅ NONE.

⛓️ **CORRECTED 28 Aug across three passes.** The first pass listed six items here. **All six have been reclassified, and the category is now empty.**

**RECOVERY REQUIRED means one thing: the truth cannot currently be established safely.** Two different situations were wrongly filed under it, and neither qualifies:

| Situation | Why it is not recovery | Where those items went |
|---|---|---|
| **A founder direction the repo does not record** | The founder stated it on 28 August. The repo is behind; the truth is known. The action is **to write it down** | **VERIFIED CURRENT DIRECTION** — FTA-005, 048, 049, 051, 052, 056, 059, 061 (see §5) |
| **A founder-reported observation without telemetry** | The observation was reported contemporaneously. **Missing instrumentation does not erase a reported baseline** — it limits confidence, which is what PARTIAL means | **PARTIAL** — FTA-014 |

### Known-but-undiagnosed — established facts, incomplete follow-up

These are **not** unknown truths. Each is a fact that is established, with work still owed.

| # | Item | State |
|---|---|---|
| **ADJ-1** | **`20260727_pdl_cursor` migration failed** (FTA-064) | The *fact* is established from founder operational evidence (36 of 37 applied). **The cause is not diagnosed** — no production access in this audit, and the runner output is not captured in the repo. `pdl-cursor.ts` is the audience-exhaustion cursor, so the failure may leave state it depends on absent |
| **ADJ-2** | **Proof-exhaustion E2E journey** (FTA-031) | Built, deployed, migration applied — all established. **The end-to-end production walk has not been performed**, so it is not claimed VERIFIED LIVE. An untested path, not an unknown truth |
| **ADJ-3** | **Portal UI acceptance bar** (FTA-051) | The direction is settled. **No bar has been defined to audit against** — a **FOUNDER DECISION REQUIRED**, not a recovery |
| **ADJ-4** | **Sourcing attainment telemetry** (FTA-014) | The baseline (~7 → 1) is founder-reported and preserved as such. **No production metric measures the real sourced→usable ratio.** Instrumenting it is the follow-up; the reported baseline stands in the meantime |

⚠️ **~7:1 is preserved as a founder-reported observational baseline, not a telemetry-verified metric** — and it is **not** the commercial planning assumption (**FI-29 is 1:1**), **not** the programme recommendation ratio, and **not** the 150:1 / 250:1 meeting benchmark. Four separate concepts; conflating them is how a margin gets modelled on a number nothing produces.

---

## 10. Proposed canonical architecture — recommendation only, no edits made

| Layer | File | Holds | Rule |
|---|---|---|---|
| **Detail** | existing canonical docs (`PRODUCT-RULES`, `LAUNCH-PAD`, `PRODUCT-INVENTORY`, `KIND-MASTER`, `V2-TRACKER`, `run-costs`) | Full reasoning and history | Unchanged. Still the only home for their one truth each |
| **Index** | `FOUNDER-TRUTH-REGISTER.md` *(not created)* | One row per material item, pointing at its canonical home | Never restates detail — points to it. Would carry the FTA IDs from §4 |
| **Operating view** | `FOUNDER-OPERATING-TRUTH.md` *(not created)* | Only what the founder needs to act on now, in FRT-07's four bands: **CRITICAL NOW · LAUNCH CRITICAL · POST-LAUNCH CRITICAL · V2** | Short. Derived from the register, never a second source |
| **Visual** | Founder Operating Centre *(not created)* | The same four bands, rendered | Reads the register; holds no independent truth |
| **Bootstrap** | `SESSION-BOOTSTRAP.md` *(not created)* | The minimum a new session must read | Points at the register first |

⚠️ **CLAUDE.md's no-fifth-doc rule and R75 both apply.** The register and operating view are only safe if they **index** rather than restate — the moment either holds a fact of its own, the repo has two truths again, which is the BUILD-STATUS failure.

⚠️ **Taxonomy conflict to settle first (FRT-07).** Three incompatible schemes are live: V2's *Phase 0–4*, LAUNCH-PAD's *T-numbers*, PRODUCT-INVENTORY's *dots*. The founder's four bands are a **fourth**. Mapping must be decided before a register is built, or it will inherit all four.

---

## 11. Recommended next bounded task — founder decides

⛓️ **CORRECTED 28 Aug.** This is a **recommendation for the founder to accept, reorder or reject.** Claude does not choose the company's next task, and **this task has not been started.**

**Recommended: reconcile `docs/client-flow-sop.md`.**

Why it is the recommendation: it is the client-journey document, it describes a **trial-based funnel that no longer exists**, it names `$99`, it references retired Paystack, and it contains **zero** reference to free proof as the entry point or to the programme model. It describes *what the client experiences* — the exact area FRT-02 and FRT-05 concern.

Bounded shape if accepted: one file, docs-only, no runtime, no schema. Either rewrite it against verified current runtime (proof → acceptance → payment → per-lead approval, honestly labelled legacy), **or** mark it HISTORICAL and state where the current journey actually lives. **Which of those two is a founder call.**

**Other candidates the founder may prefer instead**, each independently bounded:
- **Write down the 11 founder directions** from §5 that the repo is missing (FRT-01…11) — the largest gap between stated truth and recorded truth.
- **Diagnose `20260727_pdl_cursor`** (FTA-064) — a failed migration with an undiagnosed cause.
- **Walk the proof-exhaustion journey end to end** (FTA-031) — turns a BUILT/DEPLOYED claim into a verified one.
- **Settle CONF-1** (the 150 vs 250 benchmark) — blocks the programme's money model.

**Prioritisation is the founder's.** Nothing above is scheduled.

---

*Audit produced 28 Aug 2026 against `origin/main` `fecaefde`. No canonical truth was changed. No conflict was resolved. No history was rewritten.*
