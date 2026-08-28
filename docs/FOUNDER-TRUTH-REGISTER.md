# 🧭 K.I.N.D FOUNDER TRUTH REGISTER

> **The register indexes truth. It does not replace the canonical documents it points to.**

Every row points back to a deeper source. Nothing here is a new product rule, a new decision, or a new source of truth — **`docs/PRODUCT-RULES.md` remains the register of founder rulings**, `LAUNCH-PAD` remains today's execution, `PRODUCT-INVENTORY` remains the status of record, `V2-TRACKER` remains future detail, and `run-costs-and-cashflow.md` remains the money detail. This file exists so a founder or a fresh session can find *which* of those to open, without reading all of them.

| | |
|---|---|
| **Derived from** | [`docs/FOUNDER-TRUTH-AUDIT-2026-08-28.md`](./FOUNDER-TRUTH-AUDIT-2026-08-28.md) (merged, PR #1462) |
| **Snapshot `main` SHA** | `299b2e823b5da4ff2dad45e5e20be12d7186e932` |
| **Rows** | **64** — TR-001 … TR-064, one per audited material item, none split, none merged |
| **Audit lineage** | Every row carries its original **FTA** ID |

⚠️ **The 64 audit classifications were carried over, not re-decided.** Verdicts, priorities and implementation states are the merged audit's. The **Truth layer** column is the one new dimension, mapped mechanically from verdict + implementation state by the rule below.

**Truth-layer mapping rule** — `VERIFIED LIVE → LIVE NOW` · `VERIFIED CURRENT DIRECTION → CURRENT APPROVED DIRECTION — UNBUILT` (or **PARTIAL** where the audit's implementation state is PARTIAL/UNKNOWN) · `PARTIAL → CURRENT APPROVED DIRECTION — PARTIAL` · `CONFLICT` and `FOUNDER DECISION REQUIRED → UNRESOLVED` · `SUPERSEDED → SUPERSEDED / HISTORY` · `STALE → SUPERSEDED / HISTORY` where the item is an artifact still stating a superseded model.

⚠️ **One mapping is imperfect and is flagged rather than smoothed over: TR-063 / FTA-063** (`RAILWAY_GIT_COMMIT_SHA` unset). The audit's verdict is **STALE** — about the *documentation* of deploy verifiability — but the *truth* (the variable is unset right now) is a live operational fact, so its layer reads **LIVE NOW**. **FOUNDER DECISION REQUIRED if you want the layer changed**; the audit verdict is unchanged either way.

---

## Master register — TR-001 … TR-064

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
| **TR-063** | FTA-063 | `RAILWAY_GIT_COMMIT_SHA` unset → deploy state unverifiable | `ENVIRONMENT.md` | LIVE NOW | CRITICAL NOW | BUILT | STALE | No | **YES** | — | ⚠️ Every "is it deployed?" is unanswerable by the service, which is why deployment state in this audit rests on founder report rather than instrumentation |
| **TR-064** | FTA-064 | **`20260727_pdl_cursor` migration FAILED** | LAUNCH-PAD | CURRENT APPROVED DIRECTION — PARTIAL | LAUNCH CRITICAL | BLOCKED | PARTIAL | No | **YES** | — | 🔴 **Establish why it failed and what it leaves unbuilt.** `pdl-cursor.ts` is the audience-exhaustion cursor; a failed migration there may mean the cursor state it depends on is absent. **Not … |

---

# Views

These reference **TR IDs only** — the master table above is the single home for the detail.

## A · CRITICAL NOW (5)
**TR-031** · **TR-059** · **TR-060** · **TR-061** · **TR-063**

The operating foundation itself (TR-059), the capture rule that makes it stick (TR-060), the weekend allocation (TR-061), the proof handoff awaiting end-to-end proof (TR-031), and the deploy-verifiability gap (TR-063).

## B · LAUNCH CRITICAL (53)
**TR-001** · **TR-002** · **TR-004** · **TR-005** · **TR-006** · **TR-007** · **TR-008** · **TR-009** · **TR-010** · **TR-011** · **TR-012** · **TR-015** · **TR-016** · **TR-017** · **TR-018** · **TR-019** · **TR-020** · **TR-021** · **TR-022** · **TR-023** · **TR-024** · **TR-025** · **TR-026** · **TR-027** · **TR-028** · **TR-029** · **TR-030** · **TR-032** · **TR-033** · **TR-034** · **TR-035** · **TR-036** · **TR-037** · **TR-039** · **TR-040** · **TR-041** · **TR-042** · **TR-043** · **TR-044** · **TR-045** · **TR-046** · **TR-047** · **TR-048** · **TR-049** · **TR-051** · **TR-052** · **TR-053** · **TR-054** · **TR-055** · **TR-056** · **TR-058** · **TR-062** · **TR-064**

## C · POST-LAUNCH CRITICAL (5)
**TR-013** · **TR-014** · **TR-038** · **TR-050** · **TR-057**

## D · V2 (0 in this register)

**No audited FTA item carries V2 priority.** V2 detail lives where it already lives — **`docs/V2-TRACKER.md` §Founder Idea Bank, FI-01 … FI-69**. The register indexes the *audited* set; it does not duplicate the idea bank. Items the audit expects to stay V2: Glean · Multi-player AI · Milla voice · Slack front door · premium conversion coaching · CodeRabbit · additional sourcing channels.

## E · FOUNDER DECISION REQUIRED (4)
**TR-011** · **TR-015** · **TR-016** · **TR-051**

- **TR-015 / TR-016** — ~150 accepted prospects per booked meeting (R69) vs the 250 recommended-leads seed. **UNRESOLVED. Do not silently reconcile.**
- **TR-011** — the exact accounting definition of *"programme contribution"*. **UNRESOLVED.**
- **TR-051** — the portal UI **acceptance bar**. The direction is settled; the bar to build against is not defined.

## F · KNOWN-BUT-UNDIAGNOSED (9)
**TR-014** · **TR-023** · **TR-027** · **TR-031** · **TR-033** · **TR-051** · **TR-055** · **TR-063** · **TR-064**

These are **established facts with follow-up owed** — **not** recovery-required, and **not** unknown truth.

| TR | What is established | What is not |
|---|---|---|
| **TR-064** | `20260727_pdl_cursor` failed in the 28 Aug Vida → Engine run (36 of 37 applied) | The cause, and what it leaves unbuilt |
| **TR-031** | Proof handoff built, deployed, migration founder-reported applied | The end-to-end production journey has not been walked |
| **TR-014** | Founder-reported observational baseline ≈ 7 sourced → 1 usable | No telemetry measures the real ratio |
| **TR-051** | Portal UI quality is launch-critical direction | No acceptance bar exists to audit against |
| **TR-023** | `start-work.ts:303` logs `SOURCING ANYWAY` when send-readiness fails | Whether it has cost anything in practice |
| **TR-027** | The client Run button still sources freely, outside programme authority | — |
| **TR-033** | The end-to-end proof runtime path is named in LAUNCH-PAD T10 | Whether it is actually closed |
| **TR-055** | Two copies of Terms live in the portal | Which is served |
| **TR-063** | `RAILWAY_GIT_COMMIT_SHA` is unset; `/health` reports `commit: unknown` | Which build is actually running |

## G · SUPERSEDED / HISTORY (6)
**TR-003** · **TR-053** · **TR-054** · **TR-055** · **TR-057** · **TR-058**

Preserved, never deleted. **TR-003** ($4→$8, superseded future direction) · **TR-053/054/055/057** (public and legal surfaces still stating the legacy model) · **TR-058** (`client-flow-sop.md`, a trial funnel that no longer exists).

---

## Tallies

| Truth layer | Count |
|---|---|
| LIVE NOW | 19 |
| CURRENT APPROVED DIRECTION — UNBUILT | 22 |
| CURRENT APPROVED DIRECTION — PARTIAL | 13 |
| UNRESOLVED | 3 |
| SUPERSEDED / HISTORY | 6 |
| OBSERVATIONAL / UNVERIFIED | 1 |
| **Total** | **64** |

| Priority | Count |
|---|---|
| CRITICAL NOW | 5 |
| LAUNCH CRITICAL | 53 |
| POST-LAUNCH CRITICAL | 5 |
| HISTORY | 1 |
| **Total** | **64** |

*Register generated 28 Aug 2026 from the merged audit at `299b2e82`. Classifications carried over, not re-decided.*

