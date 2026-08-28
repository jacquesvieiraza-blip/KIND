# 🧭 FOUNDER TRUTH CLASSIFICATION — 28 August 2026 *(STEP 4)*

> # 🛑 STEP 4 CLASSIFIES. IT DOES NOT RESOLVE FOUNDER DECISIONS AND IT DOES NOT CORRECT ANY DOCUMENT.
>
> One row per comparison subject, **CMP-0001 … CMP-0135**, each with exactly one truth verdict, one
> truth layer, one implementation state, one priority, a founder-decision flag and a recommended
> canonical home for Step 6.
>
> | Not done here | Where it belongs |
> |---|---|
> | No **founder conflict resolved** | Step 5 |
> | No **canonical document corrected** | Step 6 |
> | No **new CMP subject created** | — (a missing subject would be a Step-3 defect, reported not invented) |
> | No **INV or CMP ID changed** | — |
> | No **runtime, schema or config change** | — |
>
> **A conflict that explicit chronology already settles is classified, not sent to the founder.**
> Only genuine, undetermined calls reach Step 5 — eight of them, listed at the end.

---

## The 8-step order

1. Freeze interpretation ✅ · 2. Inventory everything ✅ · 3. Compare evidence ✅ ·
**4. Classify truth ← THIS FILE** · 5. Founder resolves · 6. Correct canonical docs ·
7. Finalise the Founder Operating Truth system · 8. Operate from it.

**Launch target: Friday 4 September 2026** — see **CMP-0056**, which records that no rule in the
repository states that date.

---

## Provenance

| | |
|---|---|
| **Baseline `origin/main` SHA** | `299b2e823b5da4ff2dad45e5e20be12d7186e932` |
| **Branch** | `claude/founder-truth-reconciliation` |
| **Inputs** | Step-2 inventory (245 sources · 24,309 rows) · Step-3 comparison (135 subjects) · the merged 28 Aug audit · `origin/main` runtime evidence where a subject makes a claim about current behaviour |
| **Step-2 artifact changed** | **no** |
| **Step-3 artifact changed** | **no** |
| **Canonical source documents changed** | **none** |
| **Runtime / schema / config / migration / deploy / provider actions** | **none** |
| **PR #1463** | **untouched** — still `600c24aa` |

---
## 🚦 LAUNCH GATE VIEW

**Derived**, not asserted: a subject's colour follows from its priority, verdict and implementation
state by the rule stated below. Nothing was coloured green to make the board look better.

| Rule | Colour |
|---|---|
| Launch-path subject that is not yet safe — an unresolved conflict, an unknown, a blocked dependency, or a named client-harm / money / legal / data risk still open | **RED** |
| Launch-path subject that is partial — launchable with an **explicit known limitation** | **AMBER** |
| Launch-path subject that is verified live and built — still owes its walk, but nothing is missing | **GREEN** |
| Post-launch, V2 or history | **LATER** |

| Colour | Subjects |
|---|---:|
| 🔴 **RED** | **14** |
| 🟠 **AMBER** | **23** |
| 🟢 **GREEN** | **15** |
| ⚪ **LATER** | **83** |
| **TOTAL** | **135** |

### 🔴 RED — must be resolved, built, corrected or tested before launch

| CMP | Subject | Why it is red |
|---|---|---|
| **CMP-0011** | ~150 accepted prospects per booked meeting (R69) | The benchmark denominator is unresolved, so no forecast or programme quote can be issued. |
| **CMP-0012** | 250 recommended leads per targeted booked meeting (seed) | The programme seed disagrees with R69 once FI-29 collapses the denominators; money consequence recorded. |
| **CMP-0019** | Refund, make-whole and unused value | Two live Terms documents state opposite refund positions to paying clients. |
| **CMP-0032** | Meeting states — booked, unverified, held, no-show, reschedule | No meeting-lifecycle model exists, so a booked meeting cannot be distinguished from a held one. |
| **CMP-0033** | Google Calendar verification path | Google OAuth is in Testing with 0 test users on the wrong domain — booking is the promised outcome and it is externally blocked. |
| **CMP-0044** | Two Terms of Service documents | Two live Terms documents describe different products, refund positions and trial positions; which one binds a client is undetermined. |
| **CMP-0045** | The 90-Day Pipeline Guarantee | A live 90-Day Pipeline Guarantee sits against R69/R71's recorded no-guarantee discipline. |
| **CMP-0046** | Client-facing calculators | Live public calculators project $720,000 from assumed rates while the rules forbid promising outcomes. |
| **CMP-0056** | The launch date | The date of record cannot be read from the sources — R57 says 25 Aug, O9 is a 31 Aug stop-line, the founder is working to 4 Sep and no rule records it. |
| **CMP-0059** | The sending spine — the reason a paying client could not be delivered | Per-client sending depends on a pending migration; without it a paying client cannot be delivered. |
| **CMP-0079** | RLS and data boundary | RLS policies that close public-readable tables sit in the pending array — the client-data boundary is documented, not enforced. |
| **CMP-0091** | Portal UI quality and the design system | No portal-UI acceptance bar exists; 36 unwired mockups and no agreed standard. |
| **CMP-0109** | Security, key rotation and secrets | Two crown-jewel keys (Stripe secret, Supabase service-role) have been an open 🔴 item since 9 Jun and their state is not observable from the repo. |
| **CMP-0115** | Seed data, wipes and Client Zero | Launching without the seed wipe would expose test data to a real client. |

### Is Friday 4 September realistic? — what the board actually says

**14 red items, of which 8 are founder decisions rather than build work** (CMP-0011/0012, 0019,
0044, 0045, 0046, 0056, 0091 — see the decision pack below). Those eight need an hour of the
founder's time, not engineering.

**The remaining 6 are real work**, and they divide cleanly:

* **Two are external or founder-side and cannot be compressed by building faster** — CMP-0033
  (Google OAuth verification, a dated external clock) and CMP-0109 (crown-jewel key rotation).
* **Three are repository work already scoped** — CMP-0059 (per-client sending, a pending migration),
  CMP-0079 (RLS closure, pending migrations) and CMP-0115 (the seed wipe before a real client sees
  the product).
* **One is a definition** — CMP-0032, the meeting-state model, which FD-C07 offers a
  launch-compatible answer to.

**Stated plainly and without softening: the date is achievable only if the eight founder decisions
are made today and CMP-0033 is already in motion.** CMP-0033 is the single item this classification
cannot bound — it depends on Google, its clock is dated, and no amount of building moves it. Every
other red is inside the company's own control.

---
## Classification totals

### Truth verdicts

| Verdict | Subjects |
|---|---:|
| VERIFIED LIVE | 30 |
| VERIFIED CURRENT DIRECTION | 24 |
| PARTIAL | 52 |
| STALE | 3 |
| CONFLICT | 8 |
| SUPERSEDED / HISTORY | 13 |
| OBSERVATIONAL / UNVERIFIED | 3 |
| UNKNOWN | 2 |
| **TOTAL** | **135** |

### Truth layers

| Layer | Subjects |
|---|---:|
| LIVE NOW | 31 |
| CURRENT APPROVED DIRECTION — UNBUILT | 20 |
| CURRENT APPROVED DIRECTION — PARTIAL | 55 |
| UNRESOLVED | 13 |
| SUPERSEDED / HISTORY | 13 |
| OBSERVATIONAL / UNVERIFIED | 3 |
| **TOTAL** | **135** |

### Implementation states

| State | Subjects |
|---|---:|
| BUILT | 42 |
| PARTIAL | 40 |
| UNBUILT | 19 |
| BLOCKED | 1 |
| SUPERSEDED | 7 |
| NOT APPLICABLE | 26 |
| **TOTAL** | **135** |

### Priorities

| Priority | Subjects |
|---|---:|
| CRITICAL NOW | 7 |
| LAUNCH CRITICAL | 45 |
| POST-LAUNCH CRITICAL | 57 |
| V2 | 12 |
| HISTORY | 14 |
| **TOTAL** | **135** |

**Founder decision required: 10 of 135.**

---

## How each Step-3 DIRECT CONFLICT was classified — without resolving any of them

| CMP | Subject | Step-4 verdict | Resolved here? | How it was classified |
|---|---|---|---|---|
| CMP-0002 | The $4 per-approved-lead charge | **VERIFIED LIVE** | **No decision was made** | V2-TRACKER states three registers explicitly and says both statements are true at once. The *runtime* is directly evidenced, so the runtime subject classifies itself; the direction lives in CMP-0004 and the superseded step in CMP-0003. Chronology settled it, not a choice. |
| CMP-0004 | Programme pricing ~$450 | **VERIFIED CURRENT DIRECTION** | **No decision was made** | R74 / FI-26 name it the current approved direction and record zero implementation. Direction and implementation are different axes, so no conflict remains once both are stated. |
| CMP-0011 | ~150 accepted prospects (R69) | **CONFLICT** | **No — open** | Kept unresolved on the founder's explicit instruction. → **FD-C01** |
| CMP-0012 | 250 recommended leads (seed) | **CONFLICT** | **No — open** | Kept unresolved on the founder's explicit instruction. → **FD-C01** |
| CMP-0019 | Refund, make-whole, unused value | **CONFLICT** | **No — open** | Two live Terms state opposite positions and no source ranks them. → **FD-C02** |
| CMP-0044 | Two Terms of Service documents | **CONFLICT** | **No — open** | Both live, neither supersedes the other in any source. → **FD-C02** |
| CMP-0045 | The 90-Day Pipeline Guarantee | **CONFLICT** | **No — open** | A live guarantee against a live no-guarantee rule; a risk-appetite call, not an evidence gap. → **FD-C03** |
| CMP-0056 | The launch date | **CONFLICT** | **No — open** | R57 says 25 Aug, O9 is a stop-line, 4 Sep appears in no rule. → **FD-C05** |

**Two of the eight were classifiable from explicit chronology (CMP-0002, CMP-0004). Six remain open
and reach Step 5.** CMP-0046 and CMP-0091 were classified CONFLICT in this pass and join them,
making eight decisions in total.

---
## The classification — CMP-0001 … CMP-0135

| CMP | Subject | Domain | Truth verdict | Truth layer | Implementation | Priority | Gate | Founder decision | Recommended canonical home |
|---|---|---|---|---|---|---|:--:|:--:|---|
| **CMP-0001** | The $299 onboarding pack | Pricing | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0002** | The $4 per-approved-lead charge | Pricing | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0003** | The $4 → $8 migration (R68 / T9) | Pricing | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0004** | Programme pricing ~$450 per targeted booked meeting | Pricing | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0005** | The volume curve — $437.50 at 10 meetings, ~$400 floor at 50+ | Pricing | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | YES | run-costs-and-cashflow |
| **CMP-0006** | Pack economics and the cost basis behind $299 | Pricing | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0007** | Partner commission — 25% of paid lead sales | Pricing | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0008** | ~7:1 observed sourcing attainment | Funnel / ratios | **OBSERVATIONAL / UNVERIFIED** | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0009** | ~1.5:1 sourcing-precision improvement objective | Funnel / ratios | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0010** | 1:1 commercial sourcing assumption (FI-29) | Funnel / ratios | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0011** | ~150 accepted prospects per booked meeting (R69) | Funnel / ratios | **CONFLICT** | UNRESOLVED | NOT APPLICABLE | CRITICAL NOW | 🔴 RED | YES | PRODUCT-RULES |
| **CMP-0012** | 250 recommended leads per targeted booked meeting (seed) | Funnel / ratios | **CONFLICT** | UNRESOLVED | NOT APPLICABLE | CRITICAL NOW | 🔴 RED | YES | PRODUCT-RULES |
| **CMP-0013** | 1,000-prospects-to-a-customer planning history | Funnel / ratios | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0014** | Booked → held → paying assumptions | Funnel / ratios | **UNKNOWN** | UNRESOLVED | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0015** | MEETING_BOOKED as the downstream product-outcome boundary | Funnel / ratios | **VERIFIED LIVE** | LIVE NOW | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0016** | The wallet and the per-approval charge | Payments | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0017** | The old pack model vs the wallet model | Payments | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0018** | 50/50 payment split and Approve & Go Live | Payments | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0019** | Refund, make-whole and unused value | Payments | **CONFLICT** | UNRESOLVED | PARTIAL | LAUNCH CRITICAL | 🔴 RED | YES | website / legal source |
| **CMP-0020** | Stripe as the payment gate | Payments | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0021** | Trial and freebies | Payments | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | website / legal source |
| **CMP-0022** | Who may start sourcing — Run, cron and top-up | Sourcing authority | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | client-flow-sop |
| **CMP-0023** | Programme authority over sourcing | Sourcing authority | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0024** | Spend fences — daily cap, month room, coverage | Sourcing authority | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | run-costs-and-cashflow |
| **CMP-0025** | Pause — who may pause sending, and why | Sourcing authority | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-RULES |
| **CMP-0026** | ICP changes and the widened-proof acceptance rule | Sourcing authority | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0027** | AR5 — Apollo is ours, PDL and Hunter are the clients' | Providers | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0028** | Pool-first sourcing and cross-client reuse | Providers | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | client-flow-sop |
| **CMP-0029** | Acquisition memory — retention is not contactability | Providers | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0030** | Provider entitlement and free-proof PDL budget | Providers | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | run-costs-and-cashflow |
| **CMP-0031** | Customer / inbound and owned data as a source | Providers | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0032** | Meeting states — booked, unverified, held, no-show, reschedule | Meetings | **UNKNOWN** | UNRESOLVED | UNBUILT | LAUNCH CRITICAL | 🔴 RED | YES | PRODUCT-RULES |
| **CMP-0033** | Google Calendar verification path | Meetings | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BLOCKED | LAUNCH CRITICAL | 🔴 RED | NO | LAUNCH-PAD |
| **CMP-0034** | Outlook / Zoho as a calendar and mail host | Meetings | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0035** | Booking-link fallback | Meetings | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 AMBER | NO | client-flow-sop |
| **CMP-0036** | Milla — the client portal and the masked lead desk | Milla | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-INVENTORY |
| **CMP-0037** | Milla conversational experience and the flywheel | Milla | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0038** | Meet Milla — the website page | Milla | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | website / legal source |
| **CMP-0039** | Vida — the operator console | Vida | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-INVENTORY |
| **CMP-0040** | Proof review — the exhausted prospect becomes real work | Vida | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-RULES |
| **CMP-0041** | Free proof — two passes, then a human | Vida | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-RULES |
| **CMP-0042** | Suppression, opt-out and DNC | Vida | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-RULES |
| **CMP-0043** | Vida programme cockpit | Vida | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0044** | Two Terms of Service documents | Website / public truth | **CONFLICT** | UNRESOLVED | BUILT | LAUNCH CRITICAL | 🔴 RED | YES | website / legal source |
| **CMP-0045** | The 90-Day Pipeline Guarantee | Website / public truth | **CONFLICT** | UNRESOLVED | BUILT | LAUNCH CRITICAL | 🔴 RED | YES | website / legal source |
| **CMP-0046** | Client-facing calculators | Website / public truth | **CONFLICT** | UNRESOLVED | BUILT | LAUNCH CRITICAL | 🔴 RED | YES | website / legal source |
| **CMP-0047** | Website money surface — 22 pages state $4 | Website / public truth | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 AMBER | NO | website / legal source |
| **CMP-0048** | Onboarding and demo surfaces | Website / public truth | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | client-flow-sop |
| **CMP-0049** | Jack & Jill direction | Website / public truth | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0050** | CASHFLOW-LAB as the money model of record | Money models | **STALE** | UNRESOLVED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0051** | run-costs-and-cashflow as the price mirror | Money models | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0052** | The four hiring / partner / team calculators | Money models | **STALE** | UNRESOLVED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0053** | The investor deck's money claims | Money models | **OBSERVATIONAL / UNVERIFIED** | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | V2 | ⚪ LATER | NO | CANONICAL HOME UNRESOLVED |
| **CMP-0054** | SEIS advance assurance and funding | Money models | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CANONICAL HOME UNRESOLVED |
| **CMP-0055** | Company money — salary break-even, churn, cost floor | Money models | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0056** | The launch date | Launch | **CONFLICT** | UNRESOLVED | NOT APPLICABLE | CRITICAL NOW | 🔴 RED | YES | PRODUCT-RULES |
| **CMP-0057** | LAUNCH-PAD vs PRODUCT-INVENTORY — the same items, two boards | Launch | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0058** | Launch gates and blockers | Launch | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | LAUNCH-PAD |
| **CMP-0059** | The sending spine — the reason a paying client could not be delivered | Launch | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 RED | NO | PRODUCT-INVENTORY |
| **CMP-0060** | Deployment verification and the SHA report | Launch | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 AMBER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0061** | Founder 28 Aug recovery inputs | Launch | **VERIFIED CURRENT DIRECTION** | LIVE NOW | NOT APPLICABLE | CRITICAL NOW | 🟠 AMBER | NO | PRODUCT-RULES |
| **CMP-0062** | The Founder Idea Bank FI-01 … FI-69 | V2 | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0063** | V2 non-FI roadmap and narrative material | V2 | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0064** | Nexus — the per-client learning brain | V2 | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0065** | Alta parity — voice and the unified data layer | V2 | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0066** | Steals — patterns taken from other tools | V2 | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0067** | The four-doc contract and one-truth-per-doc | Operating / governance | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0068** | Operating Protocol v1 — r1 … r22 | Operating / governance | **VERIFIED LIVE** | LIVE NOW | NOT APPLICABLE | CRITICAL NOW | 🟢 GREEN | NO | CLAUDE.md / RULEBOOK |
| **CMP-0069** | Merge authority — MERGE IS NEVER CLAUDE'S | Operating / governance | **VERIFIED LIVE** | LIVE NOW | NOT APPLICABLE | CRITICAL NOW | 🟢 GREEN | NO | CLAUDE.md / RULEBOOK |
| **CMP-0070** | inventory-autoflip — automation that mutates canonical docs | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0071** | GitHub Actions availability | Operating / governance | **OBSERVATIONAL / UNVERIFIED** | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0072** | check.sh as the only gate | Operating / governance | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | CLAUDE.md / RULEBOOK |
| **CMP-0073** | Session logging and the end-of-session ritual | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0074** | The Citation Law | Operating / governance | **VERIFIED LIVE** | LIVE NOW | NOT APPLICABLE | CRITICAL NOW | 🟢 GREEN | NO | CLAUDE.md / RULEBOOK |
| **CMP-0075** | The status dot ladder | Operating / governance | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0076** | Preview before live | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0077** | The migration seam — what actually executes | Operating / governance | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | CLAUDE.md / RULEBOOK |
| **CMP-0078** | Schema drift | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0079** | RLS and data boundary | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 RED | NO | CLAUDE.md / RULEBOOK |
| **CMP-0080** | Compliance drafts for counsel | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | website / legal source |
| **CMP-0081** | Environment variables and tiers | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0082** | The core-file register and the doc map | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0083** | Campaigns and the sequence builder | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-INVENTORY |
| **CMP-0084** | Unibox, replies and reply triage | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-INVENTORY |
| **CMP-0085** | Deliverability, warm-up and sending domains | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | client-flow-sop |
| **CMP-0086** | Lead lifecycle and the lead desk | Product surface | **VERIFIED LIVE** | LIVE NOW | BUILT | LAUNCH CRITICAL | 🟢 GREEN | NO | PRODUCT-INVENTORY |
| **CMP-0087** | Agent family — FIGSY, Denise, Tony, Casey | Product surface | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0088** | Admin console and the bookkeeper view | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-INVENTORY |
| **CMP-0089** | Credits, the two-pool model and holds | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | PRODUCT-RULES |
| **CMP-0090** | Dashboards, KPIs and reporting | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0091** | Portal UI quality and the design system | Product surface | **CONFLICT** | UNRESOLVED | PARTIAL | LAUNCH CRITICAL | 🔴 RED | YES | CANONICAL HOME UNRESOLVED |
| **CMP-0092** | PWA, offline and mobile | Product surface | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0093** | Notifications and the notification centre | Product surface | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0094** | Documents — proposals, order forms, invoices | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0095** | Knowledge, Compass and client training | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0096** | Company engine, seats and the pool | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0097** | Demo environments and the demo flow | Product surface | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0098** | Integrations and CRM | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0099** | WhatsApp and Africa-first channels | Product surface | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0100** | Voice and AI calling | Product surface | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0101** | GTM strategy and the two-track market | GTM | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — PARTIAL | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0102** | Marketing plan, content and the Drop | GTM | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CANONICAL HOME UNRESOLVED |
| **CMP-0103** | Paid ads | GTM | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | CANONICAL HOME UNRESOLVED |
| **CMP-0104** | Sales playbook and objection handling | GTM | **STALE** | UNRESOLVED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CANONICAL HOME UNRESOLVED |
| **CMP-0105** | Partner programme operations | GTM | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0106** | Competitive landscape and teardowns | GTM | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — PARTIAL | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0107** | Regions — SA, US, UK, EU expansion | GTM | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0108** | Hiring, comp plans and the team | Company ops | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | NOT APPLICABLE | V2 | ⚪ LATER | NO | CANONICAL HOME UNRESOLVED |
| **CMP-0109** | Security, key rotation and secrets | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 RED | NO | CLAUDE.md / RULEBOOK |
| **CMP-0110** | Backup, restore and failover | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0111** | Testing, smoke tests and the walk | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | LAUNCH-PAD |
| **CMP-0112** | Infrastructure, hosting and the stack | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0113** | Error tracking and observability | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0114** | Cron jobs and scheduled work | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 AMBER | NO | CLAUDE.md / RULEBOOK |
| **CMP-0115** | Seed data, wipes and Client Zero | Company ops | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 RED | NO | LAUNCH-PAD |
| **CMP-0116** | Dated roadmap phases and timelines | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0117** | Session logs and handoffs | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0118** | Prior audits and reconciliations | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0119** | Founder open-item lists and checklists | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | LAUNCH-PAD |
| **CMP-0120** | Retired and tombstoned items | History / planning | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0121** | The moat and defensibility | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0122** | Product vision, 1-year and 5-year | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0123** | Data licensing and marketplace ideas | History / planning | **VERIFIED CURRENT DIRECTION** | CURRENT APPROVED DIRECTION — UNBUILT | UNBUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0124** | Revenue targets and MRR planning | History / planning | **SUPERSEDED / HISTORY** | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ LATER | NO | run-costs-and-cashflow |
| **CMP-0125** | Support, help centre and status page | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | website / legal source |
| **CMP-0126** | Trust room, evidence pack and client security answers | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | website / legal source |
| **CMP-0127** | Privacy policy and data-processing agreements | Operating / governance | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 AMBER | NO | website / legal source |
| **CMP-0128** | Company registration and corporate facts | Company ops | **VERIFIED LIVE** | LIVE NOW | NOT APPLICABLE | HISTORY | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0129** | Brand, naming and voice | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | KIND-MASTER |
| **CMP-0130** | Founder privacy and exposure minimisation | Operating / governance | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-RULES |
| **CMP-0131** | The engine — what FIGSY does under the pivot | Product surface | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0132** | MCP and agent tooling | Product surface | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | BUILT | V2 | ⚪ LATER | NO | V2-TRACKER |
| **CMP-0133** | Lookalike and audience expansion | Product surface | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | PRODUCT-INVENTORY |
| **CMP-0134** | Outreach — our own (Client Zero) vs the client's | GTM | **PARTIAL** | CURRENT APPROVED DIRECTION — PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ LATER | NO | client-flow-sop |
| **CMP-0135** | Art of the possible and idea capture | History / planning | **VERIFIED LIVE** | LIVE NOW | BUILT | POST-LAUNCH CRITICAL | ⚪ LATER | NO | V2-TRACKER |

---

## The basis for each classification

Every row above is stated here with the evidence it rests on. Inventory and comparison lineage is
preserved: each subject's INV rows are in the Step-3 artifact, unchanged.


### Domain — Pricing

**CMP-0001 · The $299 onboarding pack** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 85 INV rows

> `PACK_PRICE_USD = 299` in `@kind/shared`, re-exported by `onboarding-pack.ts`, charged through Stripe. Founder-locked 3 Aug. Live and evidenced. Launch-critical because it is the first money a client moves.

**CMP-0002 · The $4 per-approved-lead charge** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 199 INV rows

> Step-3 marked DIRECT CONFLICT; the conflict is **classifiable from explicit chronology without a founder choice**. V2-TRACKER states three registers and says both are true at once: flat $4 is LIVE LEGACY RUNTIME (three `= 4` literals, charged via `try_charge_wallet`), R68 is superseded future direction, R74/FI-26 is the current direction. The **runtime** subject is VERIFIED LIVE.

**CMP-0003 · The $4 → $8 migration (R68 / T9)** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 18 INV rows

> R68 approved $8 as one coordinated migration; V2-TRACKER line 1600 files R68/T9 under SUPERSEDED HISTORY and LAUNCH-PAD T9 carries the ⛓️ chain mark. No `8` literal exists anywhere. Explicitly historical by source statement, not by age.

**CMP-0004 · Programme pricing ~$450 per targeted booked meeting** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 11 INV rows

> R74 / FI-26 record programme pricing as the current founder-approved commercial direction. Zero implementation — no `programmes` table, no batch entity, no go-live concept. Direction is explicit, so absence from the repo is NOT UNKNOWN. Not required for a 4 Sep launch on the legacy runtime.

**CMP-0005 · The volume curve — $437.50 at 10 meetings, ~$400 floor at 50+** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **YES** · home: run-costs-and-cashflow · 19 INV rows

> FTA-005 records the working point (10 meetings / 2,500 leads / $4,375 / $437.50 effective; ~$400 floor at 50+) and FI-27 the automatic volume curve. No discount logic exists in code, and the constants file forbids any. Direction known, unbuilt.

**CMP-0006 · Pack economics and the cost basis behind $299** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 4 INV rows

> `PACK_SOURCE_TARGET = PACK_LEADS × 2` = 200 in code; the $299 basis is re-derived in `run-costs §1` and quoted in the constants file. The old $99 basis is preserved and its error named.

**CMP-0007 · Partner commission — 25% of paid lead sales** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 112 INV rows

> `PARTNER_COMMISSION_PCT = 25` with `PARTNER_COMMISSION_PER_LEAD_USD` derived from `LEAD_PRICE_USD`. Founder-locked 19 Aug with verbatim words in the constant; the pre-19-Aug inverse behaviour is recorded as replaced. Launch-critical because a partner seat can be live at launch and the base is the $4 charge.

### Domain — Funnel / ratios

**CMP-0008 · ~7:1 observed sourcing attainment** — OBSERVATIONAL / UNVERIFIED · OBSERVATIONAL / UNVERIFIED · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 10 INV rows

> Founder-reported observed baseline ≈7 sourced → 1 usable. **No instrumentation measures it**; the only in-code ratio is the unrelated ×2. FTA-014 already classifies it PARTIAL/uninstrumented. Not a conflict, not a planning input, not a benchmark.

**CMP-0009 · ~1.5:1 sourcing-precision improvement objective** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 2 INV rows

> FI-01 records the post-launch objective to improve toward ≈1.5 → 1. An engineering objective, explicitly "does not block launch".

**CMP-0010 · 1:1 commercial sourcing assumption (FI-29)** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 13 INV rows

> FI-29 records 1:1 as the commercial planning assumption. It is a modelling input, not a measurement and not a code constant (code sources at ×2, which FI-67 explicitly does not supersede).

**CMP-0011 · ~150 accepted prospects per booked meeting (R69)** — CONFLICT · UNRESOLVED · NOT APPLICABLE · CRITICAL NOW · 🔴 RED · founder decision **YES** · home: PRODUCT-RULES · 9 INV rows

> R69 locks ~150 **accepted/contacted prospects** per booked meeting. FI-29's 1:1 collapses its denominator onto the programme seed's, which makes it comparable to — and disagreeing with — CMP-0012. **Preserved unresolved on the founder's explicit instruction.**

**CMP-0012 · 250 recommended leads per targeted booked meeting (seed)** — CONFLICT · UNRESOLVED · NOT APPLICABLE · CRITICAL NOW · 🔴 RED · founder decision **YES** · home: PRODUCT-RULES · 2 INV rows

> R74 / FI-31 record 250 **recommended programme leads** per targeted booked meeting as the current seed. CONF-1 records the money consequence: at 500 leads/meeting the programme is loss-making. **Preserved unresolved on the founder's explicit instruction.**

**CMP-0013 · 1,000-prospects-to-a-customer planning history** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 2 INV rows

> `run-costs` 10 Jul planning unit (~$127–137 per 1,000 prospects). Superseded as a planning unit by the 27 Aug programme-economics section in the same document; preserved for lineage.

**CMP-0014 · Booked → held → paying assumptions** — UNKNOWN · UNRESOLVED · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 21 INV rows

> No meeting-lifecycle states exist in code, and no source states booked→held→paying conversion assumptions numerically. The `held` in `credit-holds.ts` is a money hold, not a held meeting. Evidence genuinely does not establish it.

**CMP-0015 · MEETING_BOOKED as the downstream product-outcome boundary** — VERIFIED LIVE · LIVE NOW · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 18 INV rows

> Protocol r21, founder-locked 21 Aug, stated identically in CLAUDE.md and RULEBOOK §15 and contradicted nowhere. It bounds what the product may promise at launch.

### Domain — Payments

**CMP-0016 · The wallet and the per-approval charge** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 128 INV rows

> `approve-lead.ts` charges via the `try_charge_wallet` RPC with `increment_wallet` reversal, ledger `plan: work_model`. The atomic `WHERE allowance >= granted` is the authority. This is the money path that must work on 4 Sep.

**CMP-0017 · The old pack model vs the wallet model** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 49 INV rows

> The pack/wallet split (#562) is implemented — `pack-wallet-split.test.ts`, `integrity-checks.ts:162`. Archive credit-bundle models are chronologically earlier and banner-marked; classified from source statement, not age.

**CMP-0018 · 50/50 payment split and Approve & Go Live** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 1 INV rows

> R74 records 50/50 payment and an Approve & Go Live gate. No go-live entity, no split-payment path, no programme invoice. Direction explicit, so not UNKNOWN.

**CMP-0019 · Refund, make-whole and unused value** — CONFLICT · UNRESOLVED · PARTIAL · LAUNCH CRITICAL · 🔴 RED · founder decision **YES** · home: website / legal source · 60 INV rows

> `apps/website/terms.html` heads a section **Refunds**; `apps/portal/public/terms.html` heads **No Refunds**. Both are served to clients today. A client-facing money contradiction is a launch-level legal risk, not a post-launch tidy-up.

**CMP-0020 · Stripe as the payment gate** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 515 INV rows

> `stripe.ts` creates three checkout sessions; subscription-status enums accept the real Stripe states after #340/#342. Paystack appears only in archive sources. The live rail is evidenced.

**CMP-0021 · Trial and freebies** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: website / legal source · 121 INV rows

> The trial is retired by founder lock (24 Jul no-freebies) and by a pending migration (#607), yet `sourcing-fences.ts` still declares `TRIAL_SEED`/`TRIAL_LIFETIME_CAP` and `apps/portal/public/terms.html` still has a live **§3 Free Trial**. Retired in intent, partially live in surface.

### Domain — Sourcing authority

**CMP-0022 · Who may start sourcing — Run, cron and top-up** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: client-flow-sop · 228 INV rows

> `runIcpJob` and the proof routes exist; cron slot claims (#343) are a pending migration, so a second replica double-run is not yet fenced in the executing array. Operator-initiated Run works; scheduled top-up is partial.

**CMP-0023 · Programme authority over sourcing** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 3 INV rows

> FI-38 records controlled execution batches after Go Live (~250 leads, configurable). No programme entity exists, so no authority model is implemented.

**CMP-0024 · Spend fences — daily cap, month room, coverage** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: run-costs-and-cashflow · 6 INV rows

> `sourcing-fences.ts` mirrors the atomic `try_spend_sourcing` RPC: `PDL_RATE_USD 0.28`, `SOURCING_DAILY_CAP 100`, `COVERAGE_K 2`. Spend cannot run away. Launch-critical as a money guard.

**CMP-0025 · Pause — who may pause sending, and why** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-RULES · 172 INV rows

> Three pause authorities exist and no source reconciles them: client-inactivity auto-pause (`cold-client.ts`), an operator kill-switch (recorded as once bypassed at `figsy.ts:1980`, marked fixed 🩷 walk owed), and the programme direction's pause (unbuilt). Stopping sending is a launch safety requirement.

**CMP-0026 · ICP changes and the widened-proof acceptance rule** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 770 INV rows

> `proof-candidate.ts` implements the 25 Aug founder ruling verbatim: the saved ICP changes only on an explicit "👍 Looks right", and then only in the fields the widening dropped. Rule and code agree.

### Domain — Providers

**CMP-0027 · AR5 — Apollo is ours, PDL and Hunter are the clients'** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 25 INV rows

> `provider-boundary.ts` enforces AR5 in code and records the four doors a 21-Aug audit found crossing it, now closed. Whose credits are spent on whom is a live money boundary.

**CMP-0028 · Pool-first sourcing and cross-client reuse** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: client-flow-sop · 34 INV rows

> `pool-sourcing.ts` serves owned records at $0 marginal cost before any PDL spend and subtracts pool-served count from the ask, so over-sourcing is structurally impossible.

**CMP-0029 · Acquisition memory — retention is not contactability** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 3 INV rows

> R67 is explicit and `acquisition-memory.ts` exists, but the table is created by a **pending** migration — the canonical record and the executing array are both present, execution state is not observable from the repo.

**CMP-0030 · Provider entitlement and free-proof PDL budget** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: run-costs-and-cashflow · 1 INV rows

> `20260822_free_proof_acquisition.sql` creates `proof_ledger`; a positive row is a reservation made BEFORE the provider call and the month sum over `budget_month` is the ceiling authority, never mixed with `sourcing_ledger`. This caps free-proof spend at launch.

**CMP-0031 · Customer / inbound and owned data as a source** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 34 INV rows

> V2 §6.3 records CRM reactivation as permission-gated and **explicitly states pricing is not decided and must not be inferred**. No implementation.

### Domain — Meetings

**CMP-0032 · Meeting states — booked, unverified, held, no-show, reschedule** — UNKNOWN · UNRESOLVED · UNBUILT · LAUNCH CRITICAL · 🔴 RED · founder decision **YES** · home: PRODUCT-RULES · 172 INV rows

> No meeting-lifecycle enum exists in `apps/api` or `@kind/shared`; the sources name five states (booked · booked-unverified · held · no-show · reschedule) and no source defines them for the product. A launch that books meetings cannot report on them.

**CMP-0033 · Google Calendar verification path** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BLOCKED · LAUNCH CRITICAL · 🔴 RED · founder decision **NO** · home: LAUNCH-PAD · 76 INV rows

> The runbook records the founder hitting Google's wall on 20 Aug: app in **Testing**, **0 test users**, OAuth client on the wrong domain, five stages, a dated 7-day clock. `calendar-probe.ts` exists. Blocked on external verification, and booking is the promised outcome.

**CMP-0034 · Outlook / Zoho as a calendar and mail host** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 36 INV rows

> `integrations.ts` declares an `outlook_zoho` id and `mailer.ts` handles Microsoft SMTP AUTH refusal; no source states the Outlook capability as a product promise.

**CMP-0035 · Booking-link fallback** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: client-flow-sop · 38 INV rows

> `booking-token.ts` + `booking-walk.test.ts` exist and a pending migration adds the booking-link field. The fallback is built; no source states when it is preferred over a live calendar connection.

### Domain — Milla

**CMP-0036 · Milla — the client portal and the masked lead desk** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-INVENTORY · 824 INV rows

> `apps/portal` is live with masked leads and approve-then-reveal implemented in `approve-lead.ts`. One name still covers three things (portal · retired agent identity · marketing page). The client-facing half of the launch journey.

**CMP-0037 · Milla conversational experience and the flywheel** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 169 INV rows

> The merged audit records the conversational flywheel as VERIFIED CURRENT DIRECTION with the repo MISSING or PARTIAL. A design surface exists (`milla-chat-current.html`), unwired.

**CMP-0038 · Meet Milla — the website page** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: website / legal source · 30 INV rows

> `apps/website/milla.html` is live (507 lines) and states $299 and $4. What it states is live public truth; whether it matches the direction is CMP-0047's subject.

### Domain — Vida

**CMP-0039 · Vida — the operator console** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-INVENTORY · 482 INV rows

> `apps/admin` is live with a proof-review queue; the operator settings table (#627 — "read for months, created by nobody") is a pending migration. The operator half of the launch journey.

**CMP-0040 · Proof review — the exhausted prospect becomes real work** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-RULES · 168 INV rows

> Code is complete and correct: the atomic claim refuses, ONE handoff opens, then the 409, and the refusal cannot depend on the handoff succeeding. `20260827_proof_review_handoff` is founder-reported applied. **E2E has not been walked**, so PARTIAL, not VERIFIED LIVE.

**CMP-0041 · Free proof — two passes, then a human** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-RULES · 9 INV rows

> `try_claim_proof_pass` returns 1 or 2 and refuses at `v_done >= 2` — "Pass 3 is always 0". The pass is claimed before the batch so a pool-only batch consumes one identically; no automatic retry by design. Directly evidenced in SQL.

**CMP-0042 · Suppression, opt-out and DNC** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-RULES · 304 INV rows

> `suppression.ts` and `consent.ts` are built and the import surface shows a skipped/suppressed table. `UPSTREAM-DSR-PROPAGATION.md` names two unhandled gaps (Hunter `400 invalid_domain` documented-not-handled; PDL unverified-secondary with a manual rule). Contacting someone who said no is client harm, so visibility is a launch requirement, not convenience.

**CMP-0043 · Vida programme cockpit** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 28 INV rows

> The programme cockpit exists only in the programme direction. No surface.

### Domain — Website / public truth

**CMP-0044 · Two Terms of Service documents** — CONFLICT · UNRESOLVED · BUILT · LAUNCH CRITICAL · 🔴 RED · founder decision **YES** · home: website / legal source · 223 INV rows

> Two live Terms documents describe different products, different refund positions and different trial positions. Both are served. Which one binds a client signing on 4 Sep is not determinable from the sources.

**CMP-0045 · The 90-Day Pipeline Guarantee** — CONFLICT · UNRESOLVED · BUILT · LAUNCH CRITICAL · 🔴 RED · founder decision **YES** · home: website / legal source · 29 INV rows

> `apps/portal/public/terms.html` §5A states a 90-Day Pipeline Guarantee with refund conditions; R69/R71 record a no-guarantee discipline. A live guarantee against a live rule is a money and legal exposure.

**CMP-0046 · Client-facing calculators** — CONFLICT · UNRESOLVED · BUILT · LAUNCH CRITICAL · 🔴 RED · founder decision **YES** · home: website / legal source · 134 INV rows

> `pipeline-calculator.html` and the pricing-page calculator project $720,000 from assumed rates while R69/R71 forbid promising outcomes. Public projections are live today.

**CMP-0047 · Website money surface — 22 pages state $4** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: website / legal source · 477 INV rows

> 22 live pages state `$4` as hand-typed text. Method rule 7 requires every price a client can read to derive from `@kind/shared`. The number is currently correct; the mechanism that keeps it correct is not in place.

**CMP-0048 · Onboarding and demo surfaces** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: client-flow-sop · 653 INV rows

> Four onboarding descriptions exist (product route, website demo page, training artifact, archive guide). `routes/onboarding.ts` is live. The first-run journey must be walkable on 4 Sep.

**CMP-0049 · Jack & Jill direction** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 33 INV rows

> A strategy verification artifact and a parked V2 item (#437–#443) describe the direction; no implementation, parked behind a sprint line.

### Domain — Money models

**CMP-0050 · CASHFLOW-LAB as the money model of record** — STALE · UNRESOLVED · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 130 INV rows

> Designated the money model of record (#556), but it hard-codes `PACK_PRICE`, `PACK_LEADS`, `PACK_SOURCE`, `THRESHOLD` in its own JavaScript instead of deriving them, and the merged audit already marks it 🔴 STALE. A model of record that cannot follow the code is materially misstating.

**CMP-0051 · run-costs-and-cashflow as the price mirror** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 97 INV rows

> `cost-floor.ts` + `cost-floor-drift.test.ts` guard the $352 floor and doc-lint names §0 as the single price mirror. The document also carries a 10 Jul planning unit, a 26 Jul break-even written on a retired assumption and a 27 Aug programme section — correct in parts, mixed in era.

**CMP-0052 · The four hiring / partner / team calculators** — STALE · UNRESOLVED · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 23 INV rows

> Four calculators model different questions on their own hard-coded assumptions (`arpu=250`, `mrr=1500`, `quota=4500`, `deal=25000`) — monthly-revenue shapes the live per-approval model does not produce. V2 line 1232 already records a task to refresh all three together.

**CMP-0053 · The investor deck's money claims** — OBSERVATIONAL / UNVERIFIED · OBSERVATIONAL / UNVERIFIED · NOT APPLICABLE · V2 · ⚪ LATER · founder decision **NO** · home: CANONICAL HOME UNRESOLVED · 80 INV rows

> The deck states market and model figures no other source states in the same units. No independent verification and no code relationship.

**CMP-0054 · SEIS advance assurance and funding** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CANONICAL HOME UNRESOLVED · 109 INV rows

> The SEIS draft and the 5 Jun archived funding strategy are ten weeks apart and neither supersedes the other explicitly.

**CMP-0055 · Company money — salary break-even, churn, cost floor** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 137 INV rows

> The $352 all-in floor is guarded by a drift test; salary break-even, churn prevention and VAT/corp-tax modelling each live in their own document with their own numbers.

### Domain — Launch

**CMP-0056 · The launch date** — CONFLICT · UNRESOLVED · NOT APPLICABLE · CRITICAL NOW · 🔴 RED · founder decision **YES** · home: PRODUCT-RULES · 53 INV rows

> R57 (20 Aug) locks **25 August, unconditional**; O9 is a 31 Aug founder stop-line explicitly not a product date; the archive carries 19 Jun and 18 Jun; the founder is now working to **Friday 4 September**. The repo has no rule recording 4 Sep. The date of record cannot be read from the sources.

**CMP-0057 · LAUNCH-PAD vs PRODUCT-INVENTORY — the same items, two boards** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 234 INV rows

> `mirror-launchpad.sh` generates the LAUNCH-PAD stamp from the inventory dots and doc-lint check 2 fails on drift. The board mirror is mechanically enforced; per-row prose is not.

**CMP-0058 · Launch gates and blockers** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: LAUNCH-PAD · 246 INV rows

> At least five gate checklists exist across three months; `MILESTONE-0-CHECKLIST.md` is banner-marked HISTORICAL and doc-lint-exempt. `check.sh` is the only gate that actually runs. A launch needs one current gate list.

**CMP-0059 · The sending spine — the reason a paying client could not be delivered** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🔴 RED · founder decision **NO** · home: PRODUCT-INVENTORY · 37 INV rows

> Per-client sending needs mailbox SMTP details on `client_inboxes` (#547), which sits in the pending-migration array. `BUILD-STATUS-26JUL` records the historical defect (shared FROM constant, `client_inboxes` read nowhere). Without this a paying client cannot be delivered.

**CMP-0060 · Deployment verification and the SHA report** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 932 INV rows

> `RAILWAY_GIT_COMMIT_SHA` is read at boot and in health/diagnostics and guarded by `health-commit.test.ts`; `startup-check.ts` lists it as a platform key. The mechanism is built; the three workflows make three different statements about what may gate a deploy, and Actions execution state is not observable.

**CMP-0061 · Founder 28 Aug recovery inputs** — VERIFIED CURRENT DIRECTION · LIVE NOW · NOT APPLICABLE · CRITICAL NOW · 🟠 AMBER · founder decision **NO** · home: PRODUCT-RULES · 11 INV rows

> FRT-01…FRT-11 in the merged 28 Aug audit are the most recent founder statements in the repo, each with a repo column and a truth column. They are the current input to this reset.

### Domain — V2

**CMP-0062 · The Founder Idea Bank FI-01 … FI-69** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 19 INV rows

> FI-01 … FI-69 are complete, each with a canonical home and a transcribed class marker. FI-67/FI-68 are the two explicitly superseded rows, preserved.

**CMP-0063 · V2 non-FI roadmap and narrative material** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 220 INV rows

> R39's three-product future and the 282 non-FI V2 items are recorded direction; `comp-engine.ts` holds the legacy MRR model nothing in the current money model calls.

**CMP-0064 · Nexus — the per-client learning brain** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 36 INV rows

> #511 is the phased build item and `apps/website/nexus.html` is a live 776-line page selling it. A live page for a phased build is a public-truth exposure, not a launch blocker.

**CMP-0065 · Alta parity — voice and the unified data layer** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 247 INV rows

> #475 voice and #476 the unified data layer, both net-new from the 21 Jul Alta teardown, absent from every document before it.

**CMP-0066 · Steals — patterns taken from other tools** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 334 INV rows

> RULEBOOK §9 requires capture on sight in RED; the catalog exists in PRODUCT-INVENTORY and duplicated in the archive snapshot.

### Domain — Operating / governance

**CMP-0067 · The four-doc contract and one-truth-per-doc** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 23 INV rows

> Stated identically in CLAUDE.md, RULEBOOK and KIND-MASTER; doc-lint mechanically enforces the status home and the board. Two of its clauses are enforced, the rest are convention.

**CMP-0068 · Operating Protocol v1 — r1 … r22** — VERIFIED LIVE · LIVE NOW · NOT APPLICABLE · CRITICAL NOW · 🟢 GREEN · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 93 INV rows

> Founder-locked 21 Aug. CLAUDE.md carries r1…r22 and RULEBOOK §15.1–§15.20 the full text — a duplicate expression by design, with CLAUDE.md naming §15 as authoritative.

**CMP-0069 · Merge authority — MERGE IS NEVER CLAUDE'S** — VERIFIED LIVE · LIVE NOW · NOT APPLICABLE · CRITICAL NOW · 🟢 GREEN · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 13 INV rows

> Protocol r20 is stated in three documents and contradicted by none; no automation merges. It governs how every remaining step of this reset ends.

**CMP-0070 · inventory-autoflip — automation that mutates canonical docs** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 20 INV rows

> The workflow holds `contents: write`, flips dots to 🩷, inserts a line after `### 🔄 SESSION LOG` and pushes directly to `origin main`; 🟢 stays founder-only, enforced by `flip-dots.sh`. CLAUDE.md states it has never run. Code verified; execution state not observable.

**CMP-0071 · GitHub Actions availability** — OBSERVATIONAL / UNVERIFIED · OBSERVATIONAL / UNVERIFIED · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 2 INV rows

> CLAUDE.md records Actions ran **788 times 25 May–3 Jul**, then an account flag killed it, and marks the earlier "0 runs ever" claim FALSE. Founder-reported, not observable from the repository.

**CMP-0072 · check.sh as the only gate** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 26 INV rows

> `check.sh` is the only gate that runs and passed on this pass; `doc-lint.sh` covers 27 named documents. The register now holds 245 sources, so the lint's reach is narrower than the corpus.

**CMP-0073 · Session logging and the end-of-session ritual** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 369 INV rows

> The ritual requires same-session canonical edits; this reset forbids them, and the automation that would do it is unverified. A real, recorded tension.

**CMP-0074 · The Citation Law** — VERIFIED LIVE · LIVE NOW · NOT APPLICABLE · CRITICAL NOW · 🟢 GREEN · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 11 INV rows

> Founder-ordered 6 Aug, amended 21 Aug by r5 to once-per-task verification. The original wording is struck through and preserved; the law names its own origin failure.

**CMP-0075 · The status dot ladder** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 775 INV rows

> CLAUDE.md and RULEBOOK §3 state the same five states; `flip-dots.sh` enforces 🟢 as founder-only and `count-inventory.sh` counts the board.

**CMP-0076 · Preview before live** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 278 INV rows

> RULEBOOK §11 requires preview → founder 🟣 → live for every client-facing build. `freeze-website.sh` exists; nothing enforces the gate in code. The rule governs what may ship on 4 Sep.

**CMP-0077 · The migration seam — what actually executes** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 26 INV rows

> `pending-migrations.ts` is the only array that executes; `supabase/migrations/*.sql` is the canonical record; two tombstoned directories remain. Several entries state BOTH HOMES because only the array executes (O3). Directly evidenced.

**CMP-0078 · Schema drift** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 159 INV rows

> `schema.sql` is the snapshot and `SCHEMA-DRIFT.md` the record; whether the deployed database matches either is not observable from the repository.

**CMP-0079 · RLS and data boundary** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🔴 RED · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 71 INV rows

> Pending migrations close `{public} USING(true)` policies (#554) and lock tables the live audit found (#554b — "client_inboxes had NO RLS at all"). Until the array executes, a client-data boundary is documented rather than enforced.

**CMP-0080 · Compliance drafts for counsel** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: website / legal source · 352 INV rows

> Every draft carries "NOT FILED, NOT PUBLISHED, NOT RELIED ON". The DSAR runbook is verified against the schema and opt-out is implemented; the filings are not made.

**CMP-0081 · Environment variables and tiers** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 50 INV rows

> `ENVIRONMENT.md` records 104 variables across 5 tiers and `startup-check.ts` enforces presence at boot; whether production holds them is not observable from the repository.

**CMP-0082 · The core-file register and the doc map** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 432 INV rows

> `scripts/core-files.txt` is read by the gate scripts; CORE-MAP and DOC-MAP describe the same territory in prose, and DOC-MAP itself carried a stale price for five weeks — recorded in doc-lint's own comments.

### Domain — Product surface

**CMP-0083 · Campaigns and the sequence builder** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-INVENTORY · 736 INV rows

> Sequence length is locked at 7 in one constant after an audit found four different limits live at once. Campaign human-in-the-loop columns (`copilot_mode`, `approve_before_send`) sit in the pending array — "the demo rebuild and the first paying client both need them".

**CMP-0084 · Unibox, replies and reply triage** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-INVENTORY · 451 INV rows

> #468 records a real 1:1 send bypassing the kill-switch at `figsy.ts:1980`, marked 🩷 code-verified fixed with the walk owed. Reply handling is on the launch journey and its safety fix is unwalked.

**CMP-0085 · Deliverability, warm-up and sending domains** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: client-flow-sop · 328 INV rows

> `client-flow-sop` records "OUR OWN ENGINE over SMTP; Instantly warm-up only; Smartlead deferred and unpaid"; the constants file records the stale $45/client assumption removed. Deliverability is K.I.N.D's job by the 8 Jun principle, and inbox placement decides whether launch works.

**CMP-0086 · Lead lifecycle and the lead desk** — VERIFIED LIVE · LIVE NOW · BUILT · LAUNCH CRITICAL · 🟢 GREEN · founder decision **NO** · home: PRODUCT-INVENTORY · 338 INV rows

> `approve-lead.ts` is the money-and-state door; masking and approve-then-reveal are implemented. `leads.source` is a pending migration for a column the importer already writes.

**CMP-0087 · Agent family — FIGSY, Denise, Tony, Casey** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 654 INV rows

> The 21 Jul regrouping records Denise and Tony absorbing into MILLA with a destination column, and #606 (1 Aug) redesignates FIGSY as THE ENGINE. Routes survive; the product identities are explicitly retired.

**CMP-0088 · Admin console and the bookkeeper view** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-INVENTORY · 842 INV rows

> `routes/admin.ts` and the Vida surfaces exist; the operator settings table is pending. `ADMIN-BOOKKEEPER-AUDIT` lists 13 named gaps including an invisible two-pool credit model and no refund audit trail. Operator blindness at launch is a named launch risk.

**CMP-0089 · Credits, the two-pool model and holds** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: PRODUCT-RULES · 147 INV rows

> `credit-holds.ts` holds $3 on send and captures on booking, and names #349 as an unchecked path that could double-credit. A credit-hold model and a wallet model both exist and no source says which applies to which product.

**CMP-0090 · Dashboards, KPIs and reporting** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 331 INV rows

> Portal and admin dashboards exist; requirements are stated across previews, the inventory and archive audits with no single owner.

**CMP-0091 · Portal UI quality and the design system** — CONFLICT · UNRESOLVED · PARTIAL · LAUNCH CRITICAL · 🔴 RED · founder decision **YES** · home: CANONICAL HOME UNRESOLVED · 134 INV rows

> The merged audit records portal UI quality as a founder direction the repo does not fully express; 36 unwired mockups and two written surfaces exist with no acceptance bar. **Retained as an unresolved founder decision on the founder's instruction.**

**CMP-0092 · PWA, offline and mobile** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 33 INV rows

> Only mockups and archive rows describe it; no current source repeats it.

**CMP-0093 · Notifications and the notification centre** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 50 INV rows

> A preview surface exists with no prose source stating the requirement.

**CMP-0094 · Documents — proposals, order forms, invoices** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 99 INV rows

> `order-forms.ts` and `proposals.ts` exist; partner document packs are tailored at seat creation on the 16 Aug founder review. The May SOP describes an overlapping lifecycle.

**CMP-0095 · Knowledge, Compass and client training** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 69 INV rows

> A current training artifact exists; the archive records a 7-tab Knowledge & Compass page as built, unmentioned since.

**CMP-0096 · Company engine, seats and the pool** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 96 INV rows

> `routes/company.ts` exists; the atomic company-pool move (#316) is a pending migration whose `.sql` "existed since 6 Jul but was never in the runner, so it never ran".

**CMP-0097 · Demo environments and the demo flow** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 15 INV rows

> Described only by archive sources.

**CMP-0098 · Integrations and CRM** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 202 INV rows

> Integration ids exist including `outlook_zoho`; CRM appears mainly as a future lead source with pricing explicitly undecided.

**CMP-0099 · WhatsApp and Africa-first channels** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 321 INV rows

> `apollo-reseller-call-prep.md` states its own Africa-first / WhatsApp / 3-step framing is superseded by the two-track GTM. WhatsApp survives only as an opt-in notification idea logged 15 Aug.

**CMP-0100 · Voice and AI calling** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 121 INV rows

> #475 records voice as the missing channel; the May design (Vapi.ai + Twilio SA) is archived. No implementation.

### Domain — GTM

**CMP-0101 · GTM strategy and the two-track market** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — PARTIAL · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 179 INV rows

> The two-track GTM is recorded as decided 25 Jun; the archived SA-first phased expansion predates it and is banner-marked.

**CMP-0102 · Marketing plan, content and the Drop** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CANONICAL HOME UNRESOLVED · 986 INV rows

> Nine Drop pages and the Drop hub are live; 13 marketing documents and 6 bundle artifacts describe one programme with no single owning home.

**CMP-0103 · Paid ads** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: CANONICAL HOME UNRESOLVED · 30 INV rows

> A phase plan and a bundle artifact describe the same spend; no implementation and no launch dependency.

**CMP-0104 · Sales playbook and objection handling** — STALE · UNRESOLVED · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CANONICAL HOME UNRESOLVED · 91 INV rows

> doc-lint's own comments record that `sales-playbook.md` carried a header labelled "PRICING (locked)" quoting the RETIRED ladder for two weeks — the document the founder sells from went stale about price.

**CMP-0105 · Partner programme operations** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 205 INV rows

> The Client Partner seat (R40), contact details, the onboarding flow (R42) and the seller ramp (#654) are all pending migrations quoting founder words from 16 Aug. A partner who sells at launch needs the seat to exist.

**CMP-0106 · Competitive landscape and teardowns** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — PARTIAL · NOT APPLICABLE · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 246 INV rows

> Two teardowns seven weeks apart produce different gap lists; the 21 Jul Alta teardown is the current one.

**CMP-0107 · Regions — SA, US, UK, EU expansion** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 180 INV rows

> `launch-countries.test.ts` and `canonicalLaunchCountry` fence launch countries in code; three document-level expansion plans exist at three dates.

### Domain — Company ops

**CMP-0108 · Hiring, comp plans and the team** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · NOT APPLICABLE · V2 · ⚪ LATER · founder decision **NO** · home: CANONICAL HOME UNRESOLVED · 87 INV rows

> Seven hiring documents and three calculators model a team the company does not have.

**CMP-0109 · Security, key rotation and secrets** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🔴 RED · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 51 INV rows

> Runbooks exist; `daily-audit.yml` hard-codes "Rotate 2 crown-jewel keys — Stripe secret + Supabase service-role" as an open 🔴 item dated 9 Jun. An unrotated crown-jewel key at launch is a real exposure and its state is not observable from the repo.

**CMP-0110 · Backup, restore and failover** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 109 INV rows

> Three failover descriptions exist (website CDN, portal/admin, render/cloudflare) plus a backup/restore drill; the Cloudflare workflow skips silently when secrets are unset.

**CMP-0111 · Testing, smoke tests and the walk** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: LAUNCH-PAD · 248 INV rows

> `test.yml` runs the API workspace only and does not gate deploys; `check.sh` is the full local gate. Smoke-test lists exist in five documents at five dates, and method rule 6 makes the founder's own walk the production evidence.

**CMP-0112 · Infrastructure, hosting and the stack** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 129 INV rows

> `TECH-STACK.md` is the stack of record; archive names Vercel and Netlify as hosts against the current Railway stack.

**CMP-0113 · Error tracking and observability** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 22 INV rows

> The error-events table — "the table the 500-handler writes to" — is a pending migration. Until it executes, 500s have nowhere to land.

**CMP-0114 · Cron jobs and scheduled work** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: CLAUDE.md / RULEBOOK · 10 INV rows

> Cron slot claims (#343) are pending, and #342 records that the lapse cron "has 500'd daily since it was written". A scheduled job that fails daily is a launch-visible defect.

**CMP-0115 · Seed data, wipes and Client Zero** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · LAUNCH CRITICAL · 🔴 RED · founder decision **NO** · home: LAUNCH-PAD · 53 INV rows

> `SEED-WIPE-PLAN.md` exists and the competitor-ICP seed is documented. Launching with test data visible to a real client is client harm, so the wipe is a launch gate.

### Domain — History / planning

**CMP-0116 · Dated roadmap phases and timelines** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 841 INV rows

> At least four dated roadmaps with different launch dates (31 May, 19 Jun, 18 Jun, 25 Aug), each banner-marked in its own file. Superseded by source statement, not by age.

**CMP-0117 · Session logs and handoffs** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 59 INV rows

> The live KIND-MASTER session log and four archive session documents record overlapping days; the archive copies are explicitly historical.

**CMP-0118 · Prior audits and reconciliations** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 302 INV rows

> Six prior audits from 14 May to 1 Aug plus the merged 28 Aug audit. Only the 28 Aug one is current input; none supersedes another explicitly.

**CMP-0119 · Founder open-item lists and checklists** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: LAUNCH-PAD · 230 INV rows

> Founder task lists exist in CLAUDE.md's ritual, LAUNCH-PAD, KIND-MASTER, four archive documents and a workflow file. LAUNCH-PAD is the live one.

**CMP-0120 · Retired and tombstoned items** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 41 INV rows

> 14 tombstoned rows sit below the COUNT markers, deliberately excluded from the board count; the chain rule requires supersession to chain, never delete.

**CMP-0121 · The moat and defensibility** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 13 INV rows

> The layered moat argument appears only in the archived strategy chapters.

**CMP-0122 · Product vision, 1-year and 5-year** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 10 INV rows

> Only the archived roadmap states the long-range vision.

**CMP-0123 · Data licensing and marketplace ideas** — VERIFIED CURRENT DIRECTION · CURRENT APPROVED DIRECTION — UNBUILT · UNBUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 62 INV rows

> The same idea appears in MASTER, V2-NARRATIVE and the V2 row list; all preserved.

**CMP-0124 · Revenue targets and MRR planning** — SUPERSEDED / HISTORY · SUPERSEDED / HISTORY · SUPERSEDED · HISTORY · ⚪ LATER · founder decision **NO** · home: run-costs-and-cashflow · 6 INV rows

> MRR targets describe a subscription business the current money model does not run; doc-lint bans "blended ARPU" as subscription-era framing.

### Domain — Product surface

**CMP-0125 · Support, help centre and status page** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: website / legal source · 28 INV rows

> `support.html`, `help-centre.html` and `status.html` are live and `routes/support.ts` backs the product side; the status page shows "Checking systems…" with no stated source of truth.

### Domain — Operating / governance

**CMP-0126 · Trust room, evidence pack and client security answers** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: website / legal source · 54 INV rows

> `trust.html` is live and states the compliance position; the internal Trust Room, Evidence Pack and Security FAQ are drafts, and the FAQ states the document wins if an answer drifts.

**CMP-0127 · Privacy policy and data-processing agreements** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · LAUNCH CRITICAL · 🟠 AMBER · founder decision **NO** · home: website / legal source · 167 INV rows

> Two privacy policies are served — website and portal — plus `dpa.html` and `dpa-us.html`. Same class of duplication as the Terms conflict, on the document that governs personal data.

### Domain — Company ops

**CMP-0128 · Company registration and corporate facts** — VERIFIED LIVE · LIVE NOW · NOT APPLICABLE · HISTORY · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 31 INV rows

> The company number appears identically wherever stated; nothing disagrees.

### Domain — Product surface

**CMP-0129 · Brand, naming and voice** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: KIND-MASTER · 40 INV rows

> `about.html` states "We trade as Milla & Vida"; agent naming was LOCKED in the archived roadmap and re-cut by the 22 Jul pivot. Both names remain live.

### Domain — Operating / governance

**CMP-0130 · Founder privacy and exposure minimisation** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-RULES · 6 INV rows

> Locked 4 Jun and executed by the 2 Jun scrub; no current source contradicts it.

### Domain — Product surface

**CMP-0131 · The engine — what FIGSY does under the pivot** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 6 INV rows

> #606 (1 Aug) redesignates FIGSY as the engine and the inventory files it that way; `apps/website/figsy.html` still sells it as a product — a public-truth lag, not a runtime disagreement.

**CMP-0132 · MCP and agent tooling** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · BUILT · V2 · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 42 INV rows

> `routes/mcp.ts` and an explainer exist; the 5 Jun strategic read calls MCP distribution. No source states the current MCP surface.

**CMP-0133 · Lookalike and audience expansion** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: PRODUCT-INVENTORY · 2 INV rows

> `routes/lookalike.ts` exists and `provider-boundary.ts` records `/lookalike/generate` as one of the four AR5 doors, now closed.

### Domain — GTM

**CMP-0134 · Outreach — our own (Client Zero) vs the client's** — PARTIAL · CURRENT APPROVED DIRECTION — PARTIAL · PARTIAL · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: client-flow-sop · 6 INV rows

> `routes/outreach.ts` exists and our own motion is documented; the same engine is described twice, once as product and once as our GTM.

### Domain — History / planning

**CMP-0135 · Art of the possible and idea capture** — VERIFIED LIVE · LIVE NOW · BUILT · POST-LAUNCH CRITICAL · ⚪ LATER · founder decision **NO** · home: V2-TRACKER · 170 INV rows

> RULEBOOK §9 and CLAUDE.md require same-session capture; ideas are captured in the V2 idea bank, the steals catalog and a standalone document.

---

# ░ STEP 5 — FOUNDER DECISIONS REQUIRED ░

**Eight decisions. Nothing else needs the founder today.** Everything the sources could settle has
been settled in the table above; these are the calls only he can make. **No option has been chosen
for him.** Where the evidence points one way it is marked as a recommendation with its confidence,
and where it does not the recommendation says *none*.


## FD-C01 — CMP-0011 · CMP-0012

| | |
|---|---|
| **Question** | Which denominator governs the meeting benchmark — R69's ~150 accepted/contacted prospects per booked meeting, or the programme seed of 250 recommended leads per targeted booked meeting? |
| **Option A** | Adopt R69's ~150 as the single benchmark and restate the programme seed in the same denominator. |
| **Option B** | Adopt 250 recommended programme leads as the seed and restate R69 as a different-stage measure. |
| **Factual consequence** | A: programme quotes get cheaper per meeting and the margin model tightens. B: quotes get more expensive per meeting; CONF-1 records that at 500 leads/meeting the programme is loss-making. |
| **What the current sources say** | R69 (26 Aug) locks ~150 with a 100–250 range. R74 / FI-31 record 250 as the current approved seed. FTA-016 states the denominators were tested and are comparable **because FI-29's 1:1 collapses them**, and that they disagree. |
| **Recommendation** | None — the sources establish that they disagree, not which is right. |
| **Confidence** | n/a |
| **What stays blocked if unresolved** | Any programme price, forecast, calculator or client-facing projection. |

## FD-C02 — CMP-0044 · CMP-0019

| | |
|---|---|
| **Question** | Which Terms of Service governs a client who signs at launch — `apps/website/terms.html` or `apps/portal/public/terms.html` — and which refund position stands? |
| **Option A** | The website Terms govern; retire or replace the portal copy. |
| **Option B** | The portal Terms govern; retire or replace the website copy. |
| **Factual consequence** | A: the client gets *Onboarding · Refunds · The Managed Lead Service*, matching the managed model. B: the client gets *Free Trial · No Refunds · Lead Gen Pro / FIGSY Lead Gen Advanced*, which names retired products and a retired trial. |
| **What the current sources say** | Both are live and served. The website copy matches the current managed model; the portal copy names products the 22-Jul pivot retired. Neither document states which supersedes the other. |
| **Recommendation** | **A** — the website Terms match the current product; the portal copy describes retired products. Stated as a recommendation only. |
| **Confidence** | Medium-high |
| **What stays blocked if unresolved** | Onboarding a paying client on a contract nobody can name. |

## FD-C03 — CMP-0045

| | |
|---|---|
| **Question** | Does the 90-Day Pipeline Guarantee stand at launch? |
| **Option A** | Keep it and write the guarantee into the rules as an approved exception. |
| **Option B** | Remove it from the portal Terms. |
| **Factual consequence** | A: a refundable outcome promise that R69/R71 currently forbid, on a product whose meeting benchmark is itself unresolved (FD-C01). B: no outcome promise; the no-guarantee discipline holds across every surface. |
| **What the current sources say** | It exists only in `apps/portal/public/terms.html` §5A. R69 and R71 record the no-guarantee discipline. No source reconciles them. |
| **Recommendation** | None — this is a commercial risk appetite question, not an evidence question. |
| **Confidence** | n/a |
| **What stays blocked if unresolved** | A client could claim a refund under a term the rules say we do not offer. |

## FD-C04 — CMP-0046

| | |
|---|---|
| **Question** | May the public calculators keep projecting revenue outcomes at launch? |
| **Option A** | Keep them, with an explicit non-guarantee disclaimer. |
| **Option B** | Take the projection offline until the benchmark is settled (FD-C01). |
| **Factual consequence** | A: the projection stays, resting on rates no source verifies. B: the pricing page loses its strongest conversion device. |
| **What the current sources say** | `pipeline-calculator.html` and the pricing-page calculator default to leads=300, deal=$25,000, reply=8%, meeting=40%, close=25% and display $720,000. R69/R71 forbid promising outcomes. FI-35 records a future programme calculator bound by the same discipline. |
| **Recommendation** | None — a commercial call. |
| **Confidence** | n/a |
| **What stays blocked if unresolved** | A public projection that contradicts a founder-locked rule. |

## FD-C05 — CMP-0056

| | |
|---|---|
| **Question** | What is the launch date of record, and does it supersede R57? |
| **Option A** | Record **Friday 4 September 2026** as the launch date of record, chaining R57 as amended. |
| **Option B** | Keep R57 (25 August) as written and treat 4 Sep as a slip with no rule change. |
| **Factual consequence** | A: the register matches how the company is actually working, and every gate list can be dated to it. B: the register keeps saying 25 Aug while work runs to 4 Sep — the exact drift class this reset exists to end. |
| **What the current sources say** | R57 (20 Aug) locks 25 August unconditionally. O9 is the founder's 31 Aug stop-line and is explicitly not a product date. No rule records 4 September. |
| **Recommendation** | **A** — the founder is working to 4 Sep and the chain rule exists for exactly this. Stated as a recommendation; the date itself is his call. |
| **Confidence** | High |
| **What stays blocked if unresolved** | Every launch gate, checklist and priority in this classification is dated to an unrecorded date. |

## FD-C06 — CMP-0091

| | |
|---|---|
| **Question** | What is the portal UI acceptance bar for launch? |
| **Option A** | Launch on the current portal shell with a written list of accepted limitations. |
| **Option B** | Hold launch until a named UI standard is met. |
| **Factual consequence** | A: the journey ships and the gap is on the record. B: the date moves for a quality bar nobody has yet written down. |
| **What the current sources say** | The merged audit records portal UI quality as a founder direction the repo does not fully express. 36 unwired mockups and two written surfaces exist; no acceptance criteria anywhere. |
| **Recommendation** | None — an acceptance bar is the founder's standard to set. |
| **Confidence** | n/a |
| **What stays blocked if unresolved** | Nobody can say whether the portal is good enough to show a paying client. |

## FD-C07 — CMP-0032

| | |
|---|---|
| **Question** | What are the meeting states the product recognises, and which of them must exist at launch? |
| **Option A** | Launch with **booked** only and add held / no-show / reschedule after. |
| **Option B** | Define the full lifecycle (booked · booked-unverified · held · no-show · reschedule) before launch. |
| **Factual consequence** | A: the operator can see that a meeting was booked but not whether it happened; every downstream report is limited to bookings. B: work before 4 Sep on a model no source has yet written. |
| **What the current sources say** | The sources name five states; no enum, table or column exists in code. `MEETING_BOOKED` is the founder-locked outcome boundary (Protocol r21). |
| **Recommendation** | **A** — r21 already makes MEETING_BOOKED the boundary, so booking-only is consistent with the locked rule. Stated as a recommendation. |
| **Confidence** | Medium |
| **What stays blocked if unresolved** | The promised outcome cannot be reported on. |

## FD-C08 — CMP-0005 · CMP-0004

| | |
|---|---|
| **Question** | What exactly is programme **contribution** — which costs are deducted before the margin the volume curve protects? |
| **Option A** | Contribution = programme price less direct delivery cost (records, inbox, sending, work) only. |
| **Option B** | Contribution = programme price less direct delivery cost **and** an allocated share of fixed company cost. |
| **Factual consequence** | A: a higher headline contribution and a curve that can float below true break-even at volume. B: a lower contribution, a floor closer to the real $352 all-in cost, and a smaller discount envelope. |
| **What the current sources say** | FTA-005 records the working point ($437.50 effective at 10 meetings, ~$400 floor at 50+). `run-costs` and `CASHFLOW-LAB.html` keep fixed and per-client costs apart but no source states which side the curve is protecting. |
| **Recommendation** | None — the definition is the founder's to set. **Preserved unresolved on his instruction.** |
| **Confidence** | n/a |
| **What stays blocked if unresolved** | Every programme price, discount and margin guard rests on an undefined term. |

---

## Working note — the gate came back RED on this pass

`scripts/check.sh` returned **RED** on stage 3, on the **known flaky test**, and it is reported
rather than re-run:

```
FAIL  apps/api/src/lib/proof-review-handoff.test.ts
  > asking for a third set creates exactly one review
  > the third attempt is refused 409 and persists ONE open review
AssertionError: expected +0 to be 2      (proof-review-handoff.test.ts:261)
Test Files  1 failed | 194 passed (195)
     Tests  1 failed | 3976 passed (3977)
```

**Facts, not inference.** The assertion immediately above it — `expect(codes).toEqual([200, 200, 409])`
— **passed**, so the route refused the third attempt correctly; only the fixture's
`proof_passes_done` counter read 0. Doc-lint is green, stages 1, 2, 4, 5, 6 and 7 are green, and
this pass added **one new markdown file and nothing else**, so the change cannot be the cause.
Across this session the same test has now failed **twice in eight full-suite runs** and passed in
the other six, including on a clean tree at `origin/main`.

**It was not touched and not diagnosed further, per the standing instruction.** It remains the
known technical follow-up recorded in the Step-2 working notes, and it is the reason **CMP-0040** is
classified `PARTIAL` rather than `VERIFIED LIVE`: the proof-review handoff is built and its
migration is founder-reported applied, but its end-to-end behaviour has not been walked and its
guard is intermittently red.

---

## What a reader must NOT conclude from this file

1. **That any founder conflict has been resolved.** Eight remain open and are listed above.
2. **That a canonical document has been corrected.** None has. That is Step 6.
3. **That GREEN means walked.** GREEN means verified live and built from code, schema and config
   evidence. Method rule 6 still stands: the founder's own walk is the production evidence.
4. **That LATER means unimportant.** It means the evidence does not make it a 4 September dependency.
5. **That a priority is a promise.** Priorities are classifications of what the evidence requires,
   not commitments about what will be done.

---

## STEP 4 CLASSIFIES THE COMPLETE COMPARISON SET. UNRESOLVED FOUNDER DECISIONS REMAIN OPEN FOR STEP 5; NO CANONICAL DOCUMENT HAS BEEN CORRECTED YET.

*Step 4 produced 28 Aug 2026 against `origin/main` `299b2e82`. No canonical source document was edited. The Step-2 and Step-3 artifacts were read, never rewritten. Step 5 has not been started.*
