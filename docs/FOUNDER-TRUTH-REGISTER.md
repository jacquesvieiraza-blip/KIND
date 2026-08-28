# 🧭 K.I.N.D FOUNDER TRUTH REGISTER

> **The register indexes truth. It does not replace the canonical documents it points to.**

Every row points back to a deeper source. Nothing here is a new product rule, a new decision, or a new source of truth — **`docs/PRODUCT-RULES.md` remains the register of founder rulings**, `LAUNCH-PAD` remains today's execution, `PRODUCT-INVENTORY` remains the status of record, `V2-TRACKER` remains future detail, and `run-costs-and-cashflow.md` remains the money detail. This file exists so a founder or a fresh session can find *which* of those to open, without reading all of them.

| | |
|---|---|
| **Derived from** | [`docs/FOUNDER-TRUTH-AUDIT-2026-08-28.md`](./FOUNDER-TRUTH-AUDIT-2026-08-28.md) (merged, PR #1462) + the canonical docs |
| **Snapshot `main` SHA** | `299b2e823b5da4ff2dad45e5e20be12d7186e932` |
| **Audit-derived truth rows** | **64** — TR-001 … TR-064, one per audited material item, **stable and never renumbered** |
| **Additional distinct truth rows** | **18** — TR-065 … TR-082, added because they are materially distinct truths no audit row represented |
| **Total truth rows** | **82** |
| **Canonical source items indexed** | **203** — see the Canonical Coverage Index |

⚠️ **The 64 audit classifications were carried over, not re-decided.** The 18 additional rows take their classification from the canonical source they index (**V2-TRACKER §Founder Idea Bank**), not from a fresh judgement.

**Truth-layer mapping rule** — `VERIFIED LIVE → LIVE NOW` · `VERIFIED CURRENT DIRECTION → CURRENT APPROVED DIRECTION — UNBUILT` (or **PARTIAL** where implementation state is PARTIAL/UNKNOWN) · `PARTIAL → CURRENT APPROVED DIRECTION — PARTIAL` · `CONFLICT` and `FOUNDER DECISION REQUIRED → UNRESOLVED` · `SUPERSEDED → SUPERSEDED / HISTORY` · `STALE → SUPERSEDED / HISTORY` where the item is an artifact still stating a superseded model.

---

## A · Master material truth table — TR-001 … TR-082

| TR | Audit | Material item | Canonical / source home | Truth layer | Priority | Implementation state | Current verdict | Founder decision? | Known issue? | Supersedes / history | Next reconciliation action |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **TR-001** | FTA-001 | $4 per approved lead | PRODUCT-RULES R74 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | R68→$8 superseded; R74 replaces | Keep until programme migration |
| **TR-002** | FTA-002 | $299 pack, first 100 included | PRODUCT-RULES R74 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | R74 | As above |
| **TR-003** | FTA-003 | $4→$8 migration | LAUNCH-PAD T9 | SUPERSEDED / HISTORY | HISTORY | SUPERSEDED | SUPERSEDED | No | No | R74 | Do not start |
| **TR-004** | FTA-004 | Programme pricing ~$450/targeted booked meeting | PRODUCT-RULES R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Supersedes flat-$4 | Design before build |
| **TR-005** | FTA-005 | Working point: 10 meetings / 2,500 leads / **$4,375** / **$437.50** effective; floor **~$400** at 50+ | `run-costs-and-cashflow.md` | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Write it down — the repo is behind, the truth is not unknown |
| **TR-006** | FTA-006 | Automatic volume discount curve | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Supersedes 3 Aug "no discount logic in code" lock | Curve must be specified (see FTA-005) |
| **TR-007** | FTA-007 | ~70% contribution-margin protection as a **real money guard** | `run-costs-and-cashflow.md` | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Define the guard's trigger |
| **TR-008** | FTA-008 | 50% upfront / 50% at Go Live | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Supersedes single-charge | Needs schema (FTA-020) |
| **TR-009** | FTA-009 | Programme-level approval, not per-lead | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Supersedes per-lead accept | — |
| **TR-010** | FTA-010 | Partner commission = 25% of **programme contribution** | R74 / R47 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | R47 becomes legacy | Blocked on FTA-011 |
| **TR-011** | FTA-011 | Definition of "programme contribution" | R74 | UNRESOLVED | LAUNCH CRITICAL | UNBUILT | FOUNDER DECISION REQUIRED | **YES** | No | — | **Founder must define** |
| **TR-012** | FTA-012 | Coverage k=2 sourcing authority from dollars | R74 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | FI-42 | Replace with programme authority |
| **TR-013** | FTA-013 | 2:1 sourcing in code | `run-costs` | LIVE NOW | POST-LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | FI-29/FI-67 | Leave until programme |
| **TR-014** | FTA-014 | **Sourcing attainment ≈ 7 sourced → 1 usable/accepted** | `run-costs` / V2 FI-01 | OBSERVATIONAL / UNVERIFIED | POST-LAUNCH CRITICAL | UNINSTRUMENTED | PARTIAL | No | **YES** | Not a conflict with FI-29 | ⛓️ **CORRECTED 28 Aug — this is NOT recovery required.** The founder reported the observed baseline contemporaneously; a missing telemetry pipeline does not erase a reported observation. **~7:1 is … |
| **TR-015** | FTA-015 | **~150 accepted prospects per booked meeting** | R69 / R74 | UNRESOLVED | LAUNCH CRITICAL | UNBUILT | CONFLICT | **YES** | No | — | **See FTA-016** |
| **TR-016** | FTA-016 | **250 recommended leads per targeted booked meeting** (seed) | R74 | UNRESOLVED | LAUNCH CRITICAL | UNBUILT | CONFLICT | **YES** | No | — | 🛑 **FOUNDER DECISION REQUIRED.** Denominators were tested: R69 counts *accepted/contacted prospects*, the seed counts *recommended programme leads* — different stages, **except the 1:1 planning … |
| **TR-017** | FTA-017 | Client actual benchmark replaces the seed | R69 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | UNBUILT | PARTIAL | No | No | — | Persist per-client benchmark |
| **TR-018** | FTA-018 | Poor performance → stop/review, never auto-upsell | R69 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | — |
| **TR-019** | FTA-019 | Show starting **and** actual benchmark to client | V2 FI-34 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Part of the calculator |
| **TR-020** | FTA-020 | Programme entity (target meetings, quantity, price, status, remaining value) | R74 + new migration | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | **Schema first** — additive, inert |
| **TR-021** | FTA-021 | ~250-lead controlled batches, configurable | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | After FTA-020 |
| **TR-022** | FTA-022 | Healthy batch continues / material issue auto-pauses | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | — |
| **TR-023** | FTA-023 | Client **Pause Programme** stops sourcing **and** sending | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | **YES** | — | ⚠️ The `SOURCING ANYWAY` path is live today |
| **TR-024** | FTA-024 | Material ICP change pauses future sourcing until reconfirmed | R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | — |
| **TR-025** | FTA-025 | No spend outside explicit programme authority | R74 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | PARTIAL | No | No | — | Authority object |
| **TR-026** | FTA-026 | Unattended nightly paid top-up | — | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | Superseded | Done |
| **TR-027** | FTA-027 | Unrestricted client "Run" sourcing | R74 / V2 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | **YES** | — | ⚠️ Survives PR #1459 |
| **TR-028** | FTA-028 | Unused programme value never expires | R74 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | UNBUILT | PARTIAL | No | No | — | After FTA-020 |
| **TR-029** | FTA-029 | Pass 1 ≤20 → one refinement → Pass 2 ≤20 → stop | R72 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | — |
| **TR-030** | FTA-030 | **No Pass 3** | R72 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | — |
| **TR-031** | FTA-031 | Proof exhaustion → real operator handoff | R72 | CURRENT APPROVED DIRECTION — PARTIAL | CRITICAL NOW | PARTIAL | PARTIAL | No | **YES** | Supersedes copy-only | **BUILT / DEPLOYED / E2E VERIFICATION PENDING.** ⚠️ The real production journey — exhausted prospect → Vida alert → Mark reviewed → alert clears — **has not been walked**. Not claimed VERIFIED LIVE … |
| **TR-032** | FTA-032 | Proof terminal state ("finding" vs "no match") | R72 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | PARTIAL | No | No | — | T3 |
| **TR-033** | FTA-033 | Recurrent end-to-end proof runtime failure | LAUNCH-PAD T10 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | PARTIAL | No | **YES** | — | Prove end to end, not per segment |
| **TR-034** | FTA-034 | Pool first, always | R49 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | — |
| **TR-035** | FTA-035 | PDL is the launch provider; Apollo API parked | AR5 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | FI-08 supersedes long-term | — |
| **TR-036** | FTA-036 | Apollo-acquired pool data remains servable | R73 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | Chains F15 | — |
| **TR-037** | FTA-037 | `PAID_PROVIDERS_ENABLED` OFF; controlled exit condition | R66 / T11 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | ⛓️ **Single primary verdict.** The guard is what is LIVE; the exit rule lives in the direction column and is not yet exercised. Founder-approved house test only |
| **TR-038** | FTA-038 | Apollo geography incapability | `run-costs` | LIVE NOW | POST-LAUNCH CRITICAL | BLOCKED | VERIFIED LIVE | No | No | — | Needs enrichment economics |
| **TR-039** | FTA-039 | Suppression / DNC enforcement | — | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | Visibility is FTA-050 |
| **TR-040** | FTA-040 | Booked and Held separate | R74/R69 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | UNBUILT | PARTIAL | No | No | — | CHECK widening |
| **TR-041** | FTA-041 | **Booked — unverified** state | V2 FI-47 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | With FTA-040 |
| **TR-042** | FTA-042 | Counting rules: reschedule once; duplicate/spam/outside-ICP excluded; no-show stays Booked not Held | V2 FI-48 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Define before reporting |
| **TR-043** | FTA-043 | **Outlook / Microsoft calendar** | V2 FI-49 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | New adapter |
| **TR-044** | FTA-044 | Booking-link fallback; client confirms Held/No-show | V2 | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | PARTIAL | No | No | — | — |
| **TR-045** | FTA-045 | MEETING_BOOKED as the downstream boundary | CLAUDE.md | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | Not a conflict |
| **TR-046** | FTA-046 | Milla Jack & Jill conversational shell preserved | V2 FI-53 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | Standing constraint |
| **TR-047** | FTA-047 | Vida conversational/operator shell preserved | V2 FI-54 | LIVE NOW | LAUNCH CRITICAL | BUILT | VERIFIED LIVE | No | No | — | — |
| **TR-048** | FTA-048 | **Conversational flywheel** (conversation → understanding → recommendation → decision → action → feedback → learning) | PRODUCT-RULES (new rule) | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | VERIFIED CURRENT DIRECTION | No | No | — | Record as a rule — it governs every programme surface |
| **TR-049** | FTA-049 | Client never experiences "give info → handoff → wait" | PRODUCT-RULES | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | VERIFIED CURRENT DIRECTION | No | No | — | With FTA-048; verify E2E |
| **TR-050** | FTA-050 | Vida lead-pool / suppression / DNC operator visibility | V2 | CURRENT APPROVED DIRECTION — UNBUILT | POST-LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | See §7 |
| **TR-051** | FTA-051 | Portal UI quality | New | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | UNKNOWN | VERIFIED CURRENT DIRECTION | **YES** | **YES** | — | The *direction* is settled; the **acceptance bar is a founder decision**, not an unknown |
| **TR-052** | FTA-052 | Website → Milla → programme → Vida consistency | New | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Gate cannot pass until the programme exists (FTA-020) |
| **TR-053** | FTA-053 | Public pricing page | FI-56 | SUPERSEDED / HISTORY | LAUNCH CRITICAL | BUILT | STALE | No | No | — | Sweep after FTA-004 |
| **TR-054** | FTA-054 | Public calculator | FI-35/56 | SUPERSEDED / HISTORY | LAUNCH CRITICAL | BUILT | STALE | No | No | — | Rebuild |
| **TR-055** | FTA-055 | Terms / legal | FI-56 | SUPERSEDED / HISTORY | LAUNCH CRITICAL | BUILT | STALE | No | **YES** | — | ⚠️ Highest-risk surface; **two copies of Terms in one app** |
| **TR-056** | FTA-056 | **"Meet Milla" / "Meet Vida"** treatment | New | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | PARTIAL | VERIFIED CURRENT DIRECTION | No | No | — | The asymmetry is real and measured; the direction is settled and needs writing down |
| **TR-057** | FTA-057 | Demo video | FI-57 | SUPERSEDED / HISTORY | POST-LAUNCH CRITICAL | BUILT | STALE | No | No | — | After FTA-004 |
| **TR-058** | FTA-058 | **`client-flow-sop.md` describes a trial funnel** | `client-flow-sop.md` | SUPERSEDED / HISTORY | LAUNCH CRITICAL | SUPERSEDED | STALE | No | No | — | 🔴 Rewrite or mark historical — it is the client-journey doc and it describes a product that no longer exists |
| **TR-059** | FTA-059 | Founder Operating Truth is needed because docs are insufficient | New (this audit is step 1) | CURRENT APPROVED DIRECTION — UNBUILT | CRITICAL NOW | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | The *artifact* is missing; the *direction* is not |
| **TR-060** | FTA-060 | No material idea lives only in chat | R75 | LIVE NOW | CRITICAL NOW | BUILT | VERIFIED LIVE | No | No | — | Apply to FRT-01…11 |
| **TR-061** | FTA-061 | Weekend allocation: 12h Saturday + 12h Sunday | LAUNCH-PAD | CURRENT APPROVED DIRECTION — UNBUILT | CRITICAL NOW | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Write it into LAUNCH-PAD. **Explicitly NOT recovery** — the founder stated it |
| **TR-062** | FTA-062 | Production fake/test account cleanup | LAUNCH-PAD T12 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Audit first |
| **TR-063** | FTA-063 | **Deploy state is not verifiable from the service.** **CURRENT LIVE STATE:** `RAILWAY_GIT_COMMIT_SHA` is unset, so `/health` returns `"commit":"unknown"` — this is what the runtime and config do right now. **DOCUMENT VERDICT:** the deploy documentation is **STALE** — nothing records the gap. | `ENVIRONMENT.md` · `apps/api/src/index.ts:150` | LIVE NOW | CRITICAL NOW | BUILT | STALE | No | **YES** | — | ⛓️ **No founder decision is needed here** — the two dimensions simply describe different things and are both stated. The live state is a fact; the documentation verdict is about the record of it. Set the variable and the gap closes. Until then every deployment claim in this repo rests on founder report, not instrumentation |
| **TR-064** | FTA-064 | **`20260727_pdl_cursor` migration FAILED** | LAUNCH-PAD | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | BLOCKED | PARTIAL | No | **YES** | — | 🔴 **Establish why it failed and what it leaves unbuilt.** `pdl-cursor.ts` is the audience-exhaustion cursor; a failed migration there may mean the cursor state it depends on is absent. **Not … |
| **TR-065** | — (from FI-05) | Future sourcing architecture — pool → Apollo when cheap+complete → PDL fallback | V2-TRACKER FI-05 · R49 · AR5 | CURRENT APPROVED DIRECTION — UNBUILT | POST-LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Reverses AR5 ordering long-term | Post-launch only; AR5 governs launch |
| **TR-066** | — (from FI-06) | Apollo economics planning case — $32.50 vs $147 data CAC/client | run-costs-and-cashflow.md · FI-06 | OBSERVATIONAL / UNVERIFIED | POST-LAUNCH CRITICAL | UNBUILT | PARTIAL | No | No | — | A planning example, never a guaranteed runtime outcome |
| **TR-067** | — (from FI-09) | Additional acquisition sources — LinkedIn · social · YouTube · intent | V2-TRACKER FI-09 · #452 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Extends #452 | Rights and economics must permit |
| **TR-068** | — (from FI-13) | Booked → paying conversion tracking incl. opportunity/proposal stage | V2-TRACKER FI-13 · R69 | CURRENT APPROVED DIRECTION — PARTIAL | V2 | PARTIAL | VERIFIED CURRENT DIRECTION | No | No | R69 already tracks booked→held→paying | New part is the opportunity/proposal stage |
| **TR-069** | — (from FI-14) | ~15% booked → paying — PLANNING HYPOTHESIS ONLY | V2-TRACKER FI-14 | OBSERVATIONAL / UNVERIFIED | V2 | UNBUILT | PARTIAL | No | No | — | ⚠️ Must never be locked as a benchmark |
| **TR-070** | — (from FI-16) | Milla/AI conversion coaching — diagnose funnel leakage, coach around meetings | V2-TRACKER FI-16 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Depends on TR-068 data existing |
| **TR-071** | — (from FI-17) | Glean investigation as a context layer under Milla | V2-TRACKER FI-17 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Not a dependency, not a Milla replacement |
| **TR-072** | — (from FI-18) | ⭐ K.I.N.D Multi-player AI — humans + agents on one shared context | V2-TRACKER FI-18 · #476 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Builds on #476 | Audit found no launch dependency |
| **TR-073** | — (from FI-19) | Multi-player AI core features — dashboard · tasks · team chat · role-aware | V2-TRACKER FI-19 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Strong fit with TR-079 |
| **TR-074** | — (from FI-20) | Internal model routing — cheap for routine, frontier where it changes outcomes | V2-TRACKER FI-20 · R58 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | R58 (20 Aug) | Already recorded post-launch |
| **TR-075** | — (from FI-21) | AI economics controls — caching · budgets · per-workflow/customer/agent cost | V2-TRACKER FI-21 · R58 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Extends R58 | Per-customer attribution is new |
| **TR-076** | — (from FI-22) | CodeRabbit evaluation as a second machine reviewer | V2-TRACKER FI-22 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | ⚠️ Never a substitute for founder merge authority |
| **TR-077** | — (from FI-23) | Milla voice — speech-to-text, spoken replies, seamless switching | V2-TRACKER FI-23 · #475 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | #475 is outbound calling — different feature | Both kept |
| **TR-078** | — (from FI-24) | Slack integration — internal ops events and alerts | V2-TRACKER FI-24 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | — | Initial framing |
| **TR-079** | — (from FI-25) | Slack as the primary interaction layer — front door vs portal control surface | V2-TRACKER FI-25 | CURRENT APPROVED DIRECTION — UNBUILT | V2 | UNBUILT | VERIFIED CURRENT DIRECTION | No | No | Supersedes TR-078 framing | ⚠️ Open question: how it relates to the Jack+Jill Milla shell |
| **TR-080** | — (from FI-44) | Refund boundary — first 50% non-refundable once sourcing authorised; second not charged if paused pre-Go-Live | V2-TRACKER FI-44 · R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | **YES** | — | ⚠️ Terms describe the wallet/$4 model — legal copy change required (TR-055) |
| **TR-081** | — (from FI-45) | If K.I.N.D cannot deliver, make the client whole for undelivered authorised value | V2-TRACKER FI-45 · R74 | CURRENT APPROVED DIRECTION — UNBUILT | LAUNCH CRITICAL | UNBUILT | VERIFIED CURRENT DIRECTION | No | **YES** | — | Only a Stripe refund claw-back exists today |
| **TR-082** | — (from FI-63) | Value proposition — sales capacity the customer funds upfront, never guaranteed outcomes | V2-TRACKER FI-63 · R69 | CURRENT APPROVED DIRECTION — PARTIAL | POST-LAUNCH CRITICAL | PARTIAL | VERIFIED CURRENT DIRECTION | No | No | No-guarantee half is R69 | Positioning sentence recorded for the first time |

---

## B · Canonical coverage index — every individually tracked item, findable

**203 canonical source items** across five documents. Several source IDs may map to **one** TR truth where they genuinely describe the same underlying thing — that is deduplication, not loss.

**Coverage status:** `MAPPED` · `PARTIALLY MAPPED` · `NEW TR REQUIRED` · `SUPERSEDED / HISTORY` · `FOUNDER DECISION REQUIRED`

### B1 · V2-TRACKER — Founder Idea Bank (69 items, FI-01 … FI-69, all present, none duplicated)

| Source doc | Source ID | Item | TR | Priority | Truth layer | State | Coverage |
|---|---|---|---|---|---|---|---|
| V2-TRACKER | **FI-01** | Sourcing attainment — OBSERVED / OPERATIONAL. Today roughly 7 sourced → 1 usab | TR-014 | POST-LAUNCH CRITICAL | OBSERVATIONAL / UNVERIFIED | UNINSTRUMENTED | MAPPED |
| V2-TRACKER | **FI-02** | Vida Lead Pool operator view — counts · filters · provenance · usability · con | TR-050 | POST-LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-03** | Vida suppression / DNC visibility — operator view of suppression, DNC and opt- | TR-050 | POST-LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-04** | Acquisition-memory operator visibility. Keep acquisition_memory, the reusable  | TR-050 | POST-LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-05** | Future sourcing architecture. Pool first → Apollo when it can produce a comple | TR-065 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-065** |
| V2-TRACKER | **FI-06** | Apollo economics planning case. 1,050 contacted · Apollo $65/mo · 2,500 credit | TR-066 | NEW | OBSERVATIONAL / UNVERIFIED | UNBUILT | NEW TR REQUIRED — **added as TR-066** |
| V2-TRACKER | **FI-07** | Post-launch Apollo optimisation — as an optimisation source, a search/discover | TR-038 | POST-LAUNCH CRITICAL | LIVE NOW | BLOCKED | MAPPED |
| V2-TRACKER | **FI-08** | Provider-neutral routing on cost · completeness · geography · reliability · ac | TR-035 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-09** | Additional future acquisition sources — LinkedIn · social · YouTube · other pu | TR-067 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-067** |
| V2-TRACKER | **FI-10** | Recurrent proof runtime failure — the full path: proof claim → job dispatch →  | TR-033 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | MAPPED — same truth |
| V2-TRACKER | **FI-11** | Paid-provider go-live rule. `PAID_PROVIDERS_ENABLED` stays OFF through safe pr | TR-037 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED — same truth |
| V2-TRACKER | **FI-12** | Pre-launch cleanup — delete fake/test accounts and data so production starts c | TR-062 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED — same truth |
| V2-TRACKER | **FI-13** | Booked → paying conversion tracking, for both K.I.N.D acquisition and client p | TR-068 | NEW | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | NEW TR REQUIRED — **added as TR-068** |
| V2-TRACKER | **FI-14** | ~15% booked → paying. Planning hypothesis only — must NOT be locked as a bench | TR-069 | NEW | OBSERVATIONAL / UNVERIFIED | UNBUILT | NEW TR REQUIRED — **added as TR-069** |
| V2-TRACKER | **FI-15** | Premium conversion-coaching product. Core K.I.N.D = targeting → approved leads | TR-045 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-16** | Milla/AI conversion coaching — diagnose funnel leakage · learn which ICPs, mes | TR-070 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-070** |
| V2-TRACKER | **FI-17** | Glean investigation as a possible context layer under Milla — internal K.I.N.D | TR-071 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-071** |
| V2-TRACKER | **FI-18** | ⭐ K.I.N.D Multi-player AI (VERY IMPORTANT V2/PREMIUM). A team workspace where  | TR-072 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-072** |
| V2-TRACKER | **FI-19** | Multi-player AI core features — interactive dashboard · proactive task managem | TR-073 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-073** |
| V2-TRACKER | **FI-20** | Internal model routing — cheaper/faster models for routine work; frontier mode | TR-074 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-074** |
| V2-TRACKER | **FI-21** | AI economics controls — retrieval-first context · caching · context reuse · to | TR-075 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-075** |
| V2-TRACKER | **FI-22** | CodeRabbit evaluation as an independent second machine reviewer after Claude-g | TR-076 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-076** |
| V2-TRACKER | **FI-23** | Milla voice — speech-to-text · spoken responses · seamless voice/text switchin | TR-077 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-077** |
| V2-TRACKER | **FI-24** | Slack integration (initial idea) — internal communication layer for operationa | TR-078 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-078** |
| V2-TRACKER | **FI-25** | Slack as the primary interaction layer (stronger direction). Clients and inter | TR-079 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-079** |
| V2-TRACKER | **FI-26** | Programme pricing anchored around ~$450 per targeted booked meeting, replacing | TR-004 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-27** | Automatic volume discounts at higher programme volume. Normal flow must not de | TR-006 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-28** | Contribution-margin protection ≈ 70%, eventually a real money guard, not sprea | TR-007 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-29** | Commercial sourcing assumption = 1:1 (1 provider result ≈ 1 usable/contacted l | TR-013, TR-014, TR-016 | POST-LAUNCH CRITICAL | SUPERSEDED / HISTORY | BUILT | SUPERSEDED / HISTORY |
| V2-TRACKER | **FI-30** | Milla meeting target — the client tells Milla how many targeted booked meeting | TR-020 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-31** | Starting recommendation: 250 leads per targeted booked meeting (10 meetings →  | TR-016 | LAUNCH CRITICAL | UNRESOLVED | UNBUILT | MAPPED |
| V2-TRACKER | **FI-32** | Client-specific learning — replace the seed benchmark with the client's actual | TR-017 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — PARTIAL | UNBUILT | MAPPED |
| V2-TRACKER | **FI-33** | Performance deterioration → stop/review. Never blindly recommend more spend. | TR-018 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-34** | Benchmark transparency — show the starting benchmark and the client's actual b | TR-019 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-35** | Client-facing programme calculator — targeted meetings · recommended leads · a | TR-054 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | BUILT | MAPPED |
| V2-TRACKER | **FI-36** | 50/50 payment — 50% upfront authorises bounded sourcing/preparation; 50% at Ap | TR-008, TR-020 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED — spans 2 TR |
| V2-TRACKER | **FI-37** | Programme-level approval — one approval, not thousands of individual paid-lead | TR-009 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | UNBUILT | SUPERSEDED / HISTORY |
| V2-TRACKER | **FI-38** | Controlled execution batches after Go Live, ~250 leads, batch size configurabl | TR-021 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-39** | Batch progression — healthy batch continues automatically; material problem au | TR-022 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-40** | Client Pause Programme control — must stop sourcing and sending. | TR-023 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-41** | Material ICP change auto-pauses future sourcing until reconfirmed or reviewed. | TR-024 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-42** | Programme authority — no sourcing or spend outside explicit programme authorit | TR-012, TR-025, TR-026 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED — spans 3 TR |
| V2-TRACKER | **FI-43** | Unused programme value never expires. | TR-020, TR-028 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED — spans 2 TR |
| V2-TRACKER | **FI-44** | Refund/payment boundary — first 50% non-refundable once sourcing is authorised | TR-080 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-080** |
| V2-TRACKER | **FI-45** | If K.I.N.D cannot deliver authorised undelivered value, make the client whole  | TR-081 | NEW | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | NEW TR REQUIRED — **added as TR-081** |
| V2-TRACKER | **FI-46** | Booked and Held are separate metrics. | TR-040 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — PARTIAL | UNBUILT | MAPPED |
| V2-TRACKER | **FI-47** | New state: Booked — unverified (prospect agreed a date/time, no native verific | TR-041 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-48** | Meeting counting rules — reschedules count once · duplicates, spam and outside | TR-042 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-49** | Native Microsoft/Outlook calendar support. | TR-043 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-50** | Other calendars — client booking-link fallback where native support is unavail | TR-044 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | MAPPED |
| V2-TRACKER | **FI-51** | Manual meeting confirmation — client can later mark Held or No-show. | TR-044 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | MAPPED |
| V2-TRACKER | **FI-52** | Proof Pass-2 exhaustion must create a real Vida/human handoff, not customer-fa | TR-031 | CRITICAL NOW | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | MAPPED |
| V2-TRACKER | **FI-53** | Preserve the Milla Jack-and-Jill conversational shell. Programme actions execu | TR-046 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-54** | Preserve the Vida conversational/operator shell; add evidence and controls aro | TR-047 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-55** | Vida programme cockpit — programme state · batch state · payment state · remai | TR-020 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-56** | Full-system sweep when the programme model is implemented — website pricing ·  | TR-053, TR-054, TR-055 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | BUILT | MAPPED — spans 3 TR |
| V2-TRACKER | **FI-57** | Re-record the demo video — the current Pick / Not-a-fit + $4 paid flow becomes | TR-057 | POST-LAUNCH CRITICAL | SUPERSEDED / HISTORY | BUILT | MAPPED |
| V2-TRACKER | **FI-58** | Partner commission = 25% of programme CONTRIBUTION, not of gross programme rev | TR-010 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | MAPPED |
| V2-TRACKER | **FI-59** | "Programme contribution" must be defined explicitly before implementation. Not | TR-011 | LAUNCH CRITICAL | UNRESOLVED | UNBUILT | MAPPED |
| V2-TRACKER | **FI-60** | PDL remains the launch external sourcing provider. | TR-035 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-61** | Apollo live API remains parked for launch. | TR-035 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-62** | Eligible K.I.N.D-owned Apollo pool data remains usable under normal geography, | TR-036 | LAUNCH CRITICAL | LIVE NOW | BUILT | MAPPED |
| V2-TRACKER | **FI-63** | BDR comparison — K.I.N.D is sales capacity the customer funds upfront. Never i | TR-082 | NEW | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | NEW TR REQUIRED — **added as TR-082** |
| V2-TRACKER | **FI-64** | Evidence-driven recommendations — increasingly client-specific rather than gen | TR-017 | LAUNCH CRITICAL | CURRENT APPROVED DIRECTION — PARTIAL | UNBUILT | MAPPED — same truth |
| V2-TRACKER | **FI-65** | Individual paid-lead Accept → charge at live scale | TR-009 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | UNBUILT | SUPERSEDED / HISTORY |
| V2-TRACKER | **FI-66** | One-by-one replacement approval at live scale | TR-009 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | UNBUILT | SUPERSEDED / HISTORY |
| V2-TRACKER | **FI-67** | The old 7:1 / 2:1 sourcing assumptions as *commercial planning* inputs | TR-013 | POST-LAUNCH CRITICAL | SUPERSEDED / HISTORY | BUILT | SUPERSEDED / HISTORY |
| V2-TRACKER | **FI-68** | Flat $4 pricing at all volumes — the commercial *architecture* | TR-001 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | BUILT | SUPERSEDED / HISTORY |
| V2-TRACKER | **FI-69** | Source-first / pay-on-outcome mechanics | TR-008 | LAUNCH CRITICAL | SUPERSEDED / HISTORY | UNBUILT | SUPERSEDED / HISTORY |

### B2 · PRODUCT-RULES — 103 stable rulings (R · AR · F · PR · W series)

⚠️ **Coverage finding, surfaced not resolved:** only **13** of the 103 rulings are represented by a TR truth row today, because the 28 Aug audit was scoped to *current operating truth*, not to the whole rule history. **90 rulings are indexed here and findable, but carry no TR row.** Whether the register should grow to cover all rulings, or stay scoped to operating truth, is **a founder decision about register scope** — it is not resolved here, and nothing was invented to close the gap.

| Source doc | Source ID | Rule | TR | Coverage |
|---|---|---|---|---|
| PRODUCT-RULES | **PR1** | The first purchase is $299 | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR2** | **Discounts are founder discretion, by hand in Stripe — NEVER in code, on the si | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR3** | Base + Advanced — two packages, ONE engine | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR4** | Coaching stays as-is and stays FREE | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR5** | The funnel model stays at 1,000:1 | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR6** | `CASHFLOW-LAB.html` is the money model of record | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR7** | The cost floor: what was cut, and what deliberately was NOT | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR8** | NO real-money $299 walkthrough | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR9** | A7 is VOID — there is no Stripe dashboard product to fix | — | NEW TR REQUIRED |
| PRODUCT-RULES | **PR10** | ~~*"Partner comp: 20% acquisition + 5% retention = 25%."*~~ The two models arriv | TR-010 | SUPERSEDED / HISTORY |
| PRODUCT-RULES | **AR1** | The company trades as Milla&Vida — one engine, two portals | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR2** | Milla and Vida are CONSOLES; the intelligence belongs to FIGSY | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR3** | THE NEXUS LOCK — no cross-client learning, EVER | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR4** | Nexus auto-tune is DEFAULT-DENY, per client | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR5** | Apollo is OURS. PDL + Hunter are the CLIENTS' | TR-035 | MAPPED |
| PRODUCT-RULES | **AR6** | CHAINED — THE SCHEMA IS NO LONGER FROZEN | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR7** | THE CORE MAP — work happens inside the core, and coverage is stated as % of it | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR8** | Every PDL dollar is pre-funded by collected cash | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR9** | CHAINED — THE CLIENT STILL REVISES FREELY, BUT NO LONGER PRESSES GO | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR10** | Build the lead pool now, WITHOUT waiting for the PDL-licence legal review | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR11** | Jack&Jill patterns: STEAL ONLY, do not build | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR12** | POOL FIRST — FOR EVERYONE | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR13** | COMPANY-NAME SEARCH IS HOUSE-ONLY, FOR NOW | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR14** | THE ICP PREVIEW IS EXTERNAL-ONLY | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR15** | THE LEGACY APOLLO DRAIN — a bounded, deliberate exception to AR5 | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR16** | HUNTER IS NOT FENCED OFF FROM THE HOUSE — a narrow clarification of AR5, not a c | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR17** | FREE REAL-LEAD PROOF — THE LAUNCH ACQUISITION MOTION, AND ITS FENCE | — | NEW TR REQUIRED |
| PRODUCT-RULES | **AR18** | FREE ACQUISITION AND PAID DELIVERY ARE SEPARATE BUDGETS — neither may starve the | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R1** | The free-10 entry offer is a SALES TOOL, not a product rule | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R2** | Stealth is NARROWED, not lifted | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R3** | AMENDED 6 Aug, SAME DAY — THE AUDIT FOUND IT WAS NOT FOUR PAGES AND NOT ONLY COP | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R4** | RULEBOOK §11 (preview-before-live) IS OVERRIDDEN FOR R3 ONLY | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R5** | Kevin is UNCERTAIN — not committed, not rejected | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R6** | IDs #632–#636 ARE RESERVED AND MUST NOT BE RE-USED | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R7** | **A9 (the money walk) and A19 (the till walk) are re-dated to "WHEN FUNDS ALLOW" | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R8** | 🩷 IS A CRITICAL STATE, NOT A BACKLOG STATE — and A11 moves to the CRITICAL band | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R9** | The M&V brand hierarchy on the site is KILLED | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R10** | #426 IS SUPERSEDED AND LEAVES THE 🔴 COUNT | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R11** | ALL DOCS MUST BE CURRENT — the ~70 false claims are fixed NOW, not after launch | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R12** | "Unlimited email warmup" IS included on Instantly GROWTH — vendor-confirmed, not | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R13** | TWO GROWTH CAPS ARE NOW KNOWN, AND WHETHER THEY BIND US IS NOT | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R14** | THE AIRMAIL MAILBOXES ARE OUT OF SCOPE — stop reconciling them | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R15** | The test is: lose any one client and the VA is still covered | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R16** | FOUR AREAS GET HIRED. EVERYTHING ELSE IS OUTSOURCED OR AN AI AGENT | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R17** | THE TARGET ORG IS 13 HIRES, AND LEAD ROLES COME LAST | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R18** | HIRING GOES IN CRITICAL STAGES — never a SaaS peak-and-cut | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R19** | DEPTH BEATS BREADTH — this is the operating principle, not a growth preference | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R20** | Asked directly whether to lift stealth for founder-led marketing, the founder ch | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R21** | R1 STANDS — the free-10 is discretionary, personal, and stays OFF the site | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R22** | CORRECTED SAME DAY — I read the founder's ruling upside down, and the LIVE SITE  | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R23** | THE LAUNCH ICP IS GLOBAL | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R24** | PAID ADS AND THE ACTRESS ARE PARKED UNTIL REVENUE — R7 stands | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R25** | DAY 1 A CLIENT USES THE SYSTEM — FULL STOP. #550 IS UN-PARKED | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R26** | **#444 SETTLED THE SAME WAY: the PDL $98/mo tier (~350 names), bought THE SAME D | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R27** | THE SITE IS NOT TOUCHED — RULED ON A FLAGGED FALSE CLAIM, AND THE RULING STANDS  | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R28** | R27 (this morning) refused a change to a *claim*. This is different: | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R29** | beehiiv is | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R30** | A number may go into public copy when | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R31** | CADENCE IS FIXED: two posts a week, plus ONE stats post a month | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R32** | **NEW IMAGERY IS ALLOWED — CASE BY CASE, ON THE FOUNDER'S WORD. The site library | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R33** | VIDEO MAY CARRY A THIRD-PARTY VOICEOVER — the SCRIPT stays brand-voiced | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R34** | **Extends R29 | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R35** | "EMAIL-ONLY" ON THE TRUST PAGE STANDS BESIDE THE SOCIAL CHANNELS — F7 CLOSED, NO | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R36** | VIDA THE CHARACTER IS PUBLIC; VIDA THE CONSOLE NEVER IS | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R37** | EVERY FINISHED PHASE IS A DROP — shipping is marketing, bound to the phase ladde | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R38** | SEQUENCES ARE THE CONVERTER — 3 STEPS IS TOO SHALLOW | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R39** | **P1 · MANAGED (live, locked): | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R40** | THE CLIENT PARTNER SEAT — commission-only, own network, her cut only | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R41** | FABLE NEVER BUILDS — set rule, not a preference | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R42** | payout details | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R43** | THE OUTREACH BOOK IS GLOBAL — there is no home market and no market split | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R44** | report | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R45** | SUPERSEDED 20 Aug BY R54 — SOUTH AFRICA IS NOT CONDITIONAL | — | SUPERSEDED / HISTORY |
| PRODUCT-RULES | **R46** | VIDA IS THE SINGLE HOME FOR GOVERNED DOCUMENTS | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R47** | **A wallet payment is a FUNDING event, not the COMMISSION event | TR-010 | SUPERSEDED / HISTORY |
| PRODUCT-RULES | **R48** | THE OPUS PROTOCOL — how the founder runs Opus when Fable is away | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R49** | POOL-FIRST STANDS — AND CROSS-CLIENT SERVING IS GATED ON PDL's PAPER | TR-034 | MAPPED |
| PRODUCT-RULES | **R50** | THE LAUNCH ALLOWLIST IS A HOLD, IT IS NEVER A CHARGE, AND IT REACHES BACK TO THE | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R51** | NO TRACKING — THE PIXEL IS OFF AND THE SITE CARRIES NO ANALYTICS (HC-6, 20 Aug) | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R52** | HTTP 451 covers a copyright takedown, a geo-block, a sanctions listing | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R53** | THE POSTAL ADDRESS ON EVERY COLD EMAIL — founder-supplied, never invented (20 Au | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R54** | Supersedes | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R55** | 🔐 **REAL CALENDAR BOOKING IS LAUNCH-REQUIRED — the client's calendar, written by | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R56** | "Privacy controls built in" | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R57** | WE LAUNCH 25 AUGUST REGARDLESS OF STATE — and the slip from 31 May is ON THE REC | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R58** | The code written under the first go was reverted, not merged and not parked on a | TR-074, TR-075 | MAPPED |
| PRODUCT-RULES | **R59** | THE MILLA HOMEPAGE IS APPROVED FOR LIVE — scope locked to the page itself (20 Au | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R60** | What feeds the session: | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R61** | The shape, every time: | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R62** | THE PRODUCT KEEPS UK TIME — Europe/London, not South Africa (21 Aug) | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R63** | 217 times in index.html and ZERO times on all 28 other pages | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R64** | Before building into any client-facing surface, prove | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R65** | THE PAUSE AND THE 25TH CUT (21 Aug evening) | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R66** | Launch testing runs on | TR-037 | MAPPED |
| PRODUCT-RULES | **R67** | before client-specific rejection can destroy the asset | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R68** | Shipped truth at `e62c6c8c` is | TR-003 | MAPPED |
| PRODUCT-RULES | **R69** | The operational funnel is | TR-015, TR-016 | MAPPED |
| PRODUCT-RULES | **R70** | THE DOOR COMES BEFORE THE INTERVIEW — ACCOUNT FIRST, MILLA OWNS THE DISCOVERY (2 | — | NEW TR REQUIRED |
| PRODUCT-RULES | **R71** | Milla's understanding carries three states, not one: | TR-018 | MAPPED |
| PRODUCT-RULES | **R72** | PROOF PROVES FIT, AND PROOF IS NOT ACTIVATION (25 Aug) | TR-029, TR-030, TR-031 | MAPPED |
| PRODUCT-RULES | **R73** | K.I.N.D-OWNED DATA — INCLUDING APOLLO-ACQUIRED — MAY FEED THE SHARED POOL (27 Au | TR-036 | MAPPED |
| PRODUCT-RULES | **R74** | The founder set out a new commercial architecture: | TR-004 … TR-011 | MAPPED |
| PRODUCT-RULES | **R75** | NO MATERIAL FOUNDER IDEA OR DECISION MAY EXIST ONLY IN CHAT (27 Aug) | TR-060 | MAPPED |

### B3 · LAUNCH-PAD — 12 tracked tasks (T1 … T12)

| Source doc | Source ID | Item | TR | Coverage |
|---|---|---|---|---|
| LAUNCH-PAD | **T1** | Pass 1 not complete | TR-029 | MAPPED |
| LAUNCH-PAD | **T2** | Pass 2 not complete | TR-029 | MAPPED |
| LAUNCH-PAD | **T3** | Proof terminal state | TR-032 | MAPPED |
| LAUNCH-PAD | **T4** | Safe testing only (R66) | TR-037 | MAPPED |
| LAUNCH-PAD | **T5** | Acquisition retention (R67) | TR-036 | MAPPED |
| LAUNCH-PAD | **T6** | Boundaries re-verified | TR-045 | MAPPED |
| LAUNCH-PAD | **T7** | #553 own-lead send ladder | TR-039 | MAPPED |
| LAUNCH-PAD | **T8** | Commercial pack | TR-004 | MAPPED |
| LAUNCH-PAD | **T9** | $4→$8 migration — SUPERSEDED | TR-003 | SUPERSEDED / HISTORY |
| LAUNCH-PAD | **T10** | Proof runtime failure — whole path | TR-033 | MAPPED |
| LAUNCH-PAD | **T11** | Controlled exit from zero-spend | TR-037 | MAPPED |
| LAUNCH-PAD | **T12** | Pre-launch cleanup — audit before delete | TR-062 | MAPPED |

### B4 · client-flow-sop — 7 tracked client paths

⚠️ **The whole document describes a trial-based funnel that no longer exists** (TR-058). All seven paths inherit that.

| Source doc | Source ID | Item | TR | Coverage |
|---|---|---|---|---|
| client-flow-sop | **Path 1** | Client journey path 1 — trial-era | TR-058 | SUPERSEDED / HISTORY |
| client-flow-sop | **Path 2** | Client journey path 2 — trial-era | TR-058 | SUPERSEDED / HISTORY |
| client-flow-sop | **Path 3** | Client journey path 3 — trial-era | TR-058 | SUPERSEDED / HISTORY |
| client-flow-sop | **Path 4** | Client journey path 4 — trial-era | TR-058 | SUPERSEDED / HISTORY |
| client-flow-sop | **Path 5** | Client journey path 5 — trial-era | TR-058 | SUPERSEDED / HISTORY |
| client-flow-sop | **Path 6** | Client journey path 6 — trial-era | TR-058 | SUPERSEDED / HISTORY |
| client-flow-sop | **Path 7** | Client journey path 7 — trial-era | TR-058 | SUPERSEDED / HISTORY |

### B5 · run-costs-and-cashflow — 12 numbered sections

| Source doc | Source ID | Item | TR | Coverage |
|---|---|---|---|---|
| run-costs-and-cashflow | **§1** | Money/economics section 1 | TR-001, TR-002 | MAPPED |
| run-costs-and-cashflow | **§2** | Money/economics section 2 | TR-013 | MAPPED |
| run-costs-and-cashflow | **§3** | Money/economics section 3 | TR-012 | MAPPED |
| run-costs-and-cashflow | **§4** | Money/economics section 4 | TR-007 | MAPPED |
| run-costs-and-cashflow | **§5** | Money/economics section 5 | TR-007 | MAPPED |
| run-costs-and-cashflow | **§6** | Money/economics section 6 | TR-014 | MAPPED |
| run-costs-and-cashflow | **§7** | Money/economics section 7 | TR-004 | MAPPED |
| run-costs-and-cashflow | **§8** | Money/economics section 8 | TR-005 | MAPPED |
| run-costs-and-cashflow | **§9** | Money/economics section 9 | TR-004 | MAPPED |
| run-costs-and-cashflow | **§10** | Money/economics section 10 | TR-066 | MAPPED |
| run-costs-and-cashflow | **§11** | Money/economics section 11 | TR-014 | MAPPED |
| run-costs-and-cashflow | **§12** | Money/economics section 12 | TR-053 | MAPPED |

---

## C · Views

These reference **TR IDs** — the master table is the single home for detail.

### C1 · CRITICAL NOW (5)
**TR-031** · **TR-059** · **TR-060** · **TR-061** · **TR-063**

### C2 · LAUNCH CRITICAL (55)
**TR-001** · **TR-002** · **TR-004** · **TR-005** · **TR-006** · **TR-007** · **TR-008** · **TR-009** · **TR-010** · **TR-011** · **TR-012** · **TR-015** · **TR-016** · **TR-017** · **TR-018** · **TR-019** · **TR-020** · **TR-021** · **TR-022** · **TR-023** · **TR-024** · **TR-025** · **TR-026** · **TR-027** · **TR-028** · **TR-029** · **TR-030** · **TR-032** · **TR-033** · **TR-034** · **TR-035** · **TR-036** · **TR-037** · **TR-039** · **TR-040** · **TR-041** · **TR-042** · **TR-043** · **TR-044** · **TR-045** · **TR-046** · **TR-047** · **TR-048** · **TR-049** · **TR-051** · **TR-052** · **TR-053** · **TR-054** · **TR-055** · **TR-056** · **TR-058** · **TR-062** · **TR-064** · **TR-080** · **TR-081**

### C3 · POST-LAUNCH CRITICAL (8)
**TR-013** · **TR-014** · **TR-038** · **TR-050** · **TR-057** · **TR-065** · **TR-066** · **TR-082**

### C4 · V2 (13) — with real item references

| TR | From | Item |
|---|---|---|
| **TR-067** | FI-09 | Additional acquisition sources — LinkedIn · social · YouTube · intent |
| **TR-068** | FI-13 | Booked → paying conversion tracking incl. opportunity/proposal stage |
| **TR-069** | FI-14 | ~15% booked → paying — PLANNING HYPOTHESIS ONLY |
| **TR-070** | FI-16 | Milla/AI conversion coaching — diagnose funnel leakage, coach around meetings |
| **TR-071** | FI-17 | Glean investigation as a context layer under Milla |
| **TR-072** | FI-18 | ⭐ K.I.N.D Multi-player AI — humans + agents on one shared context |
| **TR-073** | FI-19 | Multi-player AI core features — dashboard · tasks · team chat · role-aware |
| **TR-074** | FI-20 | Internal model routing — cheap for routine, frontier where it changes outcomes |
| **TR-075** | FI-21 | AI economics controls — caching · budgets · per-workflow/customer/agent cost |
| **TR-076** | FI-22 | CodeRabbit evaluation as a second machine reviewer |
| **TR-077** | FI-23 | Milla voice — speech-to-text, spoken replies, seamless switching |
| **TR-078** | FI-24 | Slack integration — internal ops events and alerts |
| **TR-079** | FI-25 | Slack as the primary interaction layer — front door vs portal control surface |

**V2 coverage of the Founder Idea Bank, by the numbers:**

| | Count |
|---|---|
| Canonical V2/idea-bank items (FI-01 … FI-69) | **69** |
| Map to an existing TR truth (audit-derived) | **44** |
| Map to an existing TR by topic, no new row needed | **7** |
| Required a new TR row | **18** |
| Remain **V2** priority | **13** |
| Are **POST-LAUNCH CRITICAL** | **3** (TR-065, TR-066, TR-082) |
| Are **LAUNCH CRITICAL** | **2** (TR-080, TR-081 — programme money) |
| Promotion candidates awaiting founder decision | **7** (see Operating Truth §Possible promotion) |
| Carry an unresolved founder decision | **1** (FI-31 → TR-016) |

⚠️ **Nothing was promoted to fill a category.** TR-080/TR-081 are LAUNCH CRITICAL because they are part of the programme commercial model the audit already classifies LAUNCH CRITICAL (TR-004 … TR-011). **This disagrees with the FI bank's own blanket line that everything except FI-10/11/12 is not launch scope — surfaced, not resolved.**

### C5 · FOUNDER DECISION REQUIRED (4)
**TR-011** · **TR-015** · **TR-016** · **TR-051**

- **TR-015 / TR-016** — ~150 accepted prospects per booked meeting (R69) vs the 250 recommended-leads seed. **UNRESOLVED. Do not silently reconcile.**
- **TR-011** — the exact accounting definition of *"programme contribution"*. **UNRESOLVED.**
- **TR-051** — the portal UI **acceptance bar**. Direction settled; the bar is not defined.

### C6 · KNOWN-BUT-UNDIAGNOSED (11)
**TR-014** · **TR-023** · **TR-027** · **TR-031** · **TR-033** · **TR-051** · **TR-055** · **TR-063** · **TR-064** · **TR-080** · **TR-081**

Established facts with follow-up owed — **not** recovery-required, **not** unknown truth.

| TR | Established | Not established |
|---|---|---|
| **TR-064** | `20260727_pdl_cursor` failed (36 of 37 applied) | The cause, and what it leaves unbuilt |
| **TR-031** | Proof handoff built, deployed, migration applied | The end-to-end journey has not been walked |
| **TR-014** | Founder-reported baseline ≈ 7 sourced → 1 usable | No telemetry measures the real ratio |
| **TR-051** | Portal UI quality is launch-critical | No acceptance bar exists |
| **TR-023** | `SOURCING ANYWAY` fires when a client cannot send | Whether it has cost anything |
| **TR-027** | Run button sources outside programme authority | — |
| **TR-033** | The proof runtime path is named in LAUNCH-PAD T10 | Whether it is closed |
| **TR-055** | Two copies of Terms live in the portal | Which is served |
| **TR-063** | `RAILWAY_GIT_COMMIT_SHA` unset | Which build is running |
| **TR-080 / TR-081** | Refund boundary and make-whole are approved direction | Terms still describe the wallet/$4 model |

### C7 · SUPERSEDED / HISTORY (6)
**TR-003** · **TR-053** · **TR-054** · **TR-055** · **TR-057** · **TR-058**

Preserved, never deleted. Plus **7 superseded FI items** (FI-29, FI-37, FI-65 … FI-69), **3 struck rules**, **T9**, and **all 7 client-flow-sop paths**.

---

## D · Tallies

| Truth layer | Count |
|---|---|
| CURRENT APPROVED DIRECTION — UNBUILT | 36 |
| LIVE NOW | 19 |
| CURRENT APPROVED DIRECTION — PARTIAL | 15 |
| SUPERSEDED / HISTORY | 6 |
| UNRESOLVED | 3 |
| OBSERVATIONAL / UNVERIFIED | 3 |
| **Total** | **82** |

| Priority | Count |
|---|---|
| LAUNCH CRITICAL | 55 |
| V2 | 13 |
| POST-LAUNCH CRITICAL | 8 |
| CRITICAL NOW | 5 |
| HISTORY | 1 |
| **Total** | **82** |

| Coverage | Count |
|---|---|
| Audit-derived truth rows (TR-001 … TR-064) | **64** |
| Additional distinct truth rows (TR-065 … TR-082) | **18** |
| **Total truth rows** | **82** |
| Canonical source items indexed | **203** — 69 FI · 103 rules · 12 LAUNCH-PAD · 7 client-flow paths · 12 run-costs sections |
| Source items MAPPED | **106**+ (see B1–B5) |
| Source items needing a TR row (all PRODUCT-RULES) | **89** — register-scope decision |

*Register generated 28 Aug 2026 from the merged audit at `299b2e82` plus the canonical docs. Audit classifications carried over, not re-decided.*

