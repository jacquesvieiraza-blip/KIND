# 🗂️ FOUNDER TRUTH REGISTER — the index over the reconciliation

> **THIS PAGE IS AN INDEX. IT IS NOT A SOURCE OF TRUTH.**
> Every row points at the doc that owns the truth. **No canonical truth is restated here** — that is the rule this page exists under, and it is the whole reason it is safe to keep. If a row and its canonical home disagree, **the canonical home wins and the row is a bug** (fix the row, same session).
>
> **Authority order, unchanged:** **PRODUCT-RULES > LAUNCH-PAD > PRODUCT-INVENTORY > KIND-MASTER > V2-TRACKER.**
>
> ## Why this exists, and what it deliberately is not
> The 28-Aug reconciliation produced **245 sources → 24,309 inventoried items → 197 comparison subjects → 194 classified truths**. That evidence chain is **frozen** and is the proof:
> [`FOUNDER-TRUTH-INVENTORY-2026-08-28.md`](./FOUNDER-TRUTH-INVENTORY-2026-08-28.md) · [`FOUNDER-TRUTH-COMPARISON-2026-08-28.md`](./FOUNDER-TRUTH-COMPARISON-2026-08-28.md) · [`FOUNDER-TRUTH-CLASSIFICATION-2026-08-28.md`](./FOUNDER-TRUTH-CLASSIFICATION-2026-08-28.md) · [`FOUNDER-TRUTH-AUDIT-2026-08-28.md`](./FOUNDER-TRUTH-AUDIT-2026-08-28.md).
> **Nothing in those four files may be edited.** This register is a *lookup* built over them, so a future session can answer *"where does truth X live, and is it built?"* without re-reading 24,309 rows.
>
> ⚠️ **THE IDs ARE THE FROZEN CMP IDs. There is no second ID system.** An earlier draft of this page (parked PR #1463) invented a **second, parallel ID series** over the same subjects — two IDs for one truth, which is how a register starts lying. **That model is not revived, and none of its identifiers appear anywhere on this page.** CMP IDs are stable, they are the ones the evidence chain uses, and they are the only ones here.
>
> ⚠️ **THE FOUR FOUNDER DECISIONS ARE APPLIED HERE AS LABELLED OVERRIDES, NOT BY EDITING THE EVIDENCE.** The Step-4 artifact records the state **before** the founder ruled — it correctly shows three CONFLICTs. The founder then resolved them (Step 5/6, **R77 · R78 · R79 · R80**). This index shows the **current** verdict and names the decision in the FD column. **The frozen file still says CONFLICT, and that is correct — it is evidence of a moment, not a live board.**

## The board, after the founder decisions

| Truth verdict | Count |  | Launch gate | Count |
|---|---:|---|---|---:|
| VERIFIED CURRENT DIRECTION | 68 |  | 🔴 launch-blocking | 39 |
| PARTIAL | 59 |  | 🟠 needs work | 29 |
| VERIFIED LIVE | 34 |  | 🟢 proved | 20 |
| SUPERSEDED / HISTORY | 18 |  | ⚪ not a launch gate | 106 |
| STALE | 11 |  |  |  |
| OBSERVATIONAL / UNVERIFIED | 4 |  |  |  |
| **CONFLICT** | **0** |  | **Total** | **194** |

⚠️ **ZERO CONFLICTS MEANS THE FOUNDER HAS RULED ON EVERY RECORDED CONTRADICTION. IT DOES NOT MEAN ANYTHING IS BUILT.** 57 of 194 subjects are **UNBUILT**. ⛓️ **23 Sep: the programme is the only live commercial model — R124 (16 Sep) retired $299/$4 by decision and R137 (23 Sep) in the code.** ~~The live commercial truth is still **$299 pack · first 100 approvals included · $4 per approved lead**.~~

## The seven subjects that needed a founder decision — all now answered

| CMP | Subject | Decision | Rule | What it settled |
|---|---|---|---|---|
| `CMP-0011` | ~150 accepted prospects per booked meeting (R69) | **FD-01** | R77 | ~150 superseded as the planning figure; R69 review trigger survives |
| `CMP-0012` | 250 recommended leads per targeted booked meeting (seed) | **FD-01** | R77 | 250 is the benchmark |
| `CMP-0007` | Partner commission — 25% of paid lead sales | **FD-02** | R47 / R78 | LIVE LEGACY — superseded as the destination |
| `CMP-0140` | Partner commission on programme revenue | **FD-02** | R78 | partner = 25% of programme contribution |
| `CMP-0197` | PROGRAMME CONTRIBUTION — DEFINITION | **FD-02** | R78 | contribution defined; overhead excluded |
| `CMP-0091` | Portal UI quality and the design system | **FD-03** | R79 | quality is NOT V2 — launch-critical |
| `CMP-0195` | Per-client data-retention controls | **FD-04** | R80 | post-launch; phrase stays absent |

**Legend.** *Verdict* — the truth state after the founder decisions. *Impl* — whether code does it. *Priority / Gate* — from the frozen Step-4 classification unless a founder decision moved it. *FD* — the founder decision that governs, if any. *Rule* — the governing rule where one is named in the evidence; `—` means the canonical home carries the authority and no single rule ID does.

⚠️ **`Impl` = NOT APPLICABLE means the subject is a policy, ratio or decision that no code was ever meant to implement** — it is not a gap.

---

## The index — 194 subjects

| CMP | Subject | Canonical home | Verdict | Impl | Priority | Gate | FD | Rule |
|---|---|---|---|---|---|---|---|---|
| `CMP-0001` | The $299 onboarding pack | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0002` | The $4 per-approved-lead charge | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0003` | The $4 → $8 migration (R68 / T9) | V2-TRACKER | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | R68 |
| `CMP-0004` | Programme pricing ~$450 per targeted booked meeting | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0005` | The volume curve — $437.50 at 10 meetings, ~$400 floor at 50+ | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0006` | Pack economics and the cost basis behind $299 | run-costs-and-cashflow | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0007` | Partner commission — 25% of paid lead sales | PRODUCT-RULES | VERIFIED LIVE | BUILT | CRITICAL NOW | 🟢 | FD-02 | R47 / R78 |
| `CMP-0008` | ~7:1 observed sourcing attainment | run-costs-and-cashflow | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0009` | ~1.5:1 sourcing-precision improvement objective | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0010` | 1:1 commercial sourcing assumption (FI-29) | run-costs-and-cashflow | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | FI-29 |
| `CMP-0011` | ~150 accepted prospects per booked meeting (R69) | PRODUCT-RULES | SUPERSEDED / HISTORY | NOT APPLICABLE | CRITICAL NOW | ⚪ | FD-01 | R77 |
| `CMP-0012` | 250 recommended leads per targeted booked meeting (seed) | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | CRITICAL NOW | 🟠 | FD-01 | R77 |
| `CMP-0013` | 1,000-prospects-to-a-customer planning history | run-costs-and-cashflow | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0014` | Booked → held → paying assumptions | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0015` | MEETING_BOOKED as the downstream product-outcome boundary | CLAUDE.md / RULEBOOK | VERIFIED LIVE | NOT APPLICABLE | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0016` | The wallet and the per-approval charge | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0017` | The old pack model vs the wallet model | PRODUCT-RULES | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0018` | 50/50 payment split and Approve & Go Live | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0019` | Refund, make-whole and unused value | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0020` | Stripe as the payment gate | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0021` | Trial and freebies | website / legal source | STALE | PARTIAL | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0022` | Who may start sourcing — Run, cron and top-up | client-flow-sop | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0023` | Programme authority over sourcing | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0024` | Spend fences — daily cap, month room, coverage | run-costs-and-cashflow | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0025` | Pause — who may pause sending, and why | PRODUCT-RULES | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0026` | ICP changes and the widened-proof acceptance rule | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0027` | AR5 — Apollo is ours, PDL and Hunter are the clients' | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | AR5 |
| `CMP-0028` | Pool-first sourcing and cross-client reuse | client-flow-sop | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0029` | Acquisition memory — retention is not contactability | PRODUCT-RULES | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0030` | Provider entitlement and free-proof PDL budget | run-costs-and-cashflow | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0031` | Customer / inbound and owned data as a source | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0032` | Meeting states — booked, unverified, held, no-show, reschedule | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0033` | Google Calendar verification path | LAUNCH-PAD | PARTIAL | BLOCKED | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0034` | Outlook / Zoho as a calendar and mail host | PRODUCT-RULES | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0035` | Booking-link fallback | client-flow-sop | PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0036` | Milla — the client portal and the masked lead desk | PRODUCT-INVENTORY | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0037` | Milla conversational experience and the flywheel | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0038` | Meet Milla — the website page | website / legal source | PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0039` | Vida — the operator console | PRODUCT-INVENTORY | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0040` | Proof review — the exhausted prospect becomes real work | PRODUCT-RULES | PARTIAL | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0041` | Free proof — two passes, then a human | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0042` | Suppression, opt-out and DNC | PRODUCT-RULES | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0043` | Vida programme cockpit | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0044` | Two Terms of Service documents | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0045` | The 90-Day Pipeline Guarantee | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0046` | Client-facing calculators | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0047` | Website money surface — 22 pages state $4 | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0048` | Onboarding and demo surfaces | client-flow-sop | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0049` | Jack & Jill direction | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0050` | CASHFLOW-LAB as the money model of record | run-costs-and-cashflow | STALE | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0051` | run-costs-and-cashflow as the price mirror | run-costs-and-cashflow | PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0052` | The four hiring / partner / team calculators | run-costs-and-cashflow | STALE | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0053` | The investor deck's money claims | CANONICAL HOME UNRESOLVED | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | V2 | ⚪ | — | — |
| `CMP-0054` | SEIS advance assurance and funding | CANONICAL HOME UNRESOLVED | PARTIAL | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0055` | Company money — salary break-even, churn, cost floor | run-costs-and-cashflow | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0056` | The launch date | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | CRITICAL NOW | 🟠 | — | — |
| `CMP-0057` | LAUNCH-PAD vs PRODUCT-INVENTORY — the same items, two boards | PRODUCT-INVENTORY | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0058` | Launch gates and blockers | LAUNCH-PAD | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0059` | The sending spine — the reason a paying client could not be delivered | PRODUCT-INVENTORY | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0060` | Deployment verification and the SHA report | CLAUDE.md / RULEBOOK | PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0061` | Founder 28 Aug recovery inputs | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | CRITICAL NOW | 🟠 | — | — |
| `CMP-0064` | Nexus — the per-client learning brain | V2-TRACKER | VERIFIED CURRENT DIRECTION | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0066` | Steals — patterns taken from other tools | PRODUCT-INVENTORY | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0067` | The four-doc contract and one-truth-per-doc | CLAUDE.md / RULEBOOK | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0068` | Operating Protocol v1 — r1 … r22 | CLAUDE.md / RULEBOOK | VERIFIED LIVE | NOT APPLICABLE | CRITICAL NOW | 🟢 | — | — |
| `CMP-0069` | Merge authority — MERGE IS NEVER CLAUDE'S | CLAUDE.md / RULEBOOK | VERIFIED LIVE | NOT APPLICABLE | CRITICAL NOW | 🟢 | — | — |
| `CMP-0070` | inventory-autoflip — automation that mutates canonical docs | CLAUDE.md / RULEBOOK | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0071` | GitHub Actions availability | CLAUDE.md / RULEBOOK | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0072` | check.sh as the only gate | CLAUDE.md / RULEBOOK | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0073` | Session logging and the end-of-session ritual | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0074` | The Citation Law | CLAUDE.md / RULEBOOK | VERIFIED LIVE | NOT APPLICABLE | CRITICAL NOW | 🟢 | — | — |
| `CMP-0075` | The status dot ladder | PRODUCT-INVENTORY | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0076` | Preview before live | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0077` | The migration seam — what actually executes | CLAUDE.md / RULEBOOK | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0078` | Schema drift | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0079` | RLS and data boundary | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0080` | Compliance drafts for counsel | website / legal source | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0081` | Environment variables and tiers | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0082` | The core-file register and the doc map | CLAUDE.md / RULEBOOK | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0083` | Campaigns and the sequence builder | PRODUCT-INVENTORY | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0084` | Unibox, replies and reply triage | PRODUCT-INVENTORY | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0085` | Deliverability, warm-up and sending domains | client-flow-sop | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0086` | Lead lifecycle and the lead desk | PRODUCT-INVENTORY | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0087` | Agent family — FIGSY, Denise, Tony, Casey | PRODUCT-INVENTORY | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0088` | Admin console and the bookkeeper view | PRODUCT-INVENTORY | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0089` | Credits, the two-pool model and holds | PRODUCT-RULES | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0090` | Dashboards, KPIs and reporting | PRODUCT-INVENTORY | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0091` | Portal UI quality and the design system | CANONICAL HOME UNRESOLVED | VERIFIED CURRENT DIRECTION | PARTIAL | LAUNCH CRITICAL | 🔴 | FD-03 | R79 |
| `CMP-0092` | PWA, offline and mobile | V2-TRACKER | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0093` | Notifications and the notification centre | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0094` | Documents — proposals, order forms, invoices | PRODUCT-INVENTORY | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0095` | Knowledge, Compass and client training | PRODUCT-INVENTORY | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0096` | Company engine, seats and the pool | PRODUCT-INVENTORY | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0097` | Demo environments and the demo flow | PRODUCT-INVENTORY | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0098` | Integrations and CRM | PRODUCT-INVENTORY | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0099` | WhatsApp and Africa-first channels | V2-TRACKER | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0100` | Voice and AI calling | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0101` | GTM strategy and the two-track market | KIND-MASTER | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0102` | Marketing plan, content and the Drop | CANONICAL HOME UNRESOLVED | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0103` | Paid ads | CANONICAL HOME UNRESOLVED | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0104` | Sales playbook and objection handling | CANONICAL HOME UNRESOLVED | STALE | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0105` | Partner programme operations | PRODUCT-RULES | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0106` | Competitive landscape and teardowns | KIND-MASTER | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0107` | Regions — SA, US, UK, EU expansion | PRODUCT-RULES | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0108` | Hiring, comp plans and the team | CANONICAL HOME UNRESOLVED | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | V2 | ⚪ | — | — |
| `CMP-0109` | Security, key rotation and secrets | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0110` | Backup, restore and failover | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0111` | Testing, smoke tests and the walk | LAUNCH-PAD | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0112` | Infrastructure, hosting and the stack | CLAUDE.md / RULEBOOK | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0113` | Error tracking and observability | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0114` | Cron jobs and scheduled work | CLAUDE.md / RULEBOOK | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0115` | Seed data, wipes and Client Zero | LAUNCH-PAD | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0116` | Dated roadmap phases and timelines | KIND-MASTER | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0117` | Session logs and handoffs | KIND-MASTER | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0118` | Prior audits and reconciliations | KIND-MASTER | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0119` | Founder open-item lists and checklists | LAUNCH-PAD | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0120` | Retired and tombstoned items | PRODUCT-INVENTORY | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0121` | The moat and defensibility | KIND-MASTER | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0122` | Product vision, 1-year and 5-year | KIND-MASTER | SUPERSEDED / HISTORY | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0123` | Data licensing and marketplace ideas | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0124` | Revenue targets and MRR planning | run-costs-and-cashflow | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0125` | Support, help centre and status page | website / legal source | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0126` | Trust room, evidence pack and client security answers | website / legal source | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0127` | Privacy policy and data-processing agreements | website / legal source | PARTIAL | BUILT | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0128` | Company registration and corporate facts | KIND-MASTER | VERIFIED LIVE | NOT APPLICABLE | HISTORY | ⚪ | — | — |
| `CMP-0129` | Brand, naming and voice | KIND-MASTER | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0130` | Founder privacy and exposure minimisation | PRODUCT-RULES | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0131` | The engine — what FIGSY does under the pivot | PRODUCT-INVENTORY | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0132` | MCP and agent tooling | V2-TRACKER | PARTIAL | BUILT | V2 | ⚪ | — | — |
| `CMP-0133` | Lookalike and audience expansion | PRODUCT-INVENTORY | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0134` | Outreach — our own (Client Zero) vs the client's | client-flow-sop | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0135` | Art of the possible and idea capture | V2-TRACKER | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0136` | First 100 approved leads included — the legacy pack entitlement | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0137` | Programme working point — $437.50 effective at 10 meetings | run-costs-and-cashflow | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0138` | Programme floor — ~$400 effective at 50+ meetings | run-costs-and-cashflow | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0139` | Flat $4 as the superseded commercial architecture | V2-TRACKER | SUPERSEDED / HISTORY | SUPERSEDED | HISTORY | ⚪ | — | — |
| `CMP-0140` | Partner commission on programme revenue | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | CRITICAL NOW | ⚪ | FD-02 | R78 |
| `CMP-0141` | Unused programme value never expires | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0142` | Programme refund boundary — the first 50% | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0143` | Make-whole when K.I.N.D cannot deliver authorised units | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0144` | Individual paid-lead accept-and-charge — superseded mechanic | V2-TRACKER | SUPERSEDED / HISTORY | BUILT | HISTORY | ⚪ | — | — |
| `CMP-0145` | Source-first / pay-on-outcome — superseded mechanic | V2-TRACKER | SUPERSEDED / HISTORY | UNBUILT | HISTORY | ⚪ | — | — |
| `CMP-0146` | Programme-level approval — one approval, not per lead | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0147` | Controlled execution batches after Go Live | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0148` | Programme pause — client control and material-ICP-change auto-pause | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0149` | Performance deterioration → stop / review | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0150` | One-by-one replacement approval at live volume — superseded | V2-TRACKER | SUPERSEDED / HISTORY | UNBUILT | HISTORY | ⚪ | — | — |
| `CMP-0151` | Paid-provider go-live rule (PAID_PROVIDERS_ENABLED) | PRODUCT-RULES | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0152` | Booked and Held as separate metrics | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0153` | Booked — unverified as a new meeting state | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0154` | Meeting counting rules — reschedules and no-shows | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0155` | Manual meeting confirmation by the client | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0156` | Native Microsoft / Outlook calendar support | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0157` | Booked → paying conversion tracking | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0158` | 15% booked → paying planning hypothesis | run-costs-and-cashflow | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0159` | Milla meeting target — the client states the target | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0160` | Client-specific learning replaces the generic benchmark | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0161` | Benchmark transparency — starting vs actual | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0162` | Vida Lead Pool operator view | PRODUCT-INVENTORY | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0163` | Vida suppression / DNC operator visibility | PRODUCT-RULES | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0164` | Acquisition-memory operator visibility | PRODUCT-INVENTORY | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0165` | Recurrent proof runtime failure | LAUNCH-PAD | PARTIAL | PARTIAL | LAUNCH CRITICAL | 🟠 | — | — |
| `CMP-0166` | Proof pass-2 exhaustion must create real work | PRODUCT-RULES | PARTIAL | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0167` | Preserve the Vida conversational / operator direction | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0168` | Preserve the Milla Jack-and-Jill conversational direction | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0169` | Apollo economics planning case | run-costs-and-cashflow | OBSERVATIONAL / UNVERIFIED | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0170` | Post-launch Apollo optimisation | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0171` | Provider-neutral routing on cost and coverage | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0172` | Additional future acquisition sources | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0173` | Eligible K.I.N.D-owned Apollo pool data | PRODUCT-RULES | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0174` | PDL as the launch external sourcing provider | PRODUCT-RULES | VERIFIED LIVE | BUILT | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0175` | Apollo live API parked for launch | PRODUCT-RULES | VERIFIED LIVE | NOT APPLICABLE | LAUNCH CRITICAL | 🟢 | — | — |
| `CMP-0176` | Future sourcing architecture — pool first, then paid | client-flow-sop | VERIFIED LIVE | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0177` | Pre-launch cleanup — delete fake and test data | LAUNCH-PAD | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0178` | Full-system sweep when the programme model lands | LAUNCH-PAD | VERIFIED CURRENT DIRECTION | UNBUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0179` | Re-record the demo video | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0180` | Website consistency pass (#698) | website / legal source | STALE | BUILT | LAUNCH CRITICAL | 🔴 | — | — |
| `CMP-0181` | Premium conversion-coaching product | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0182` | Milla / AI conversion-coaching diagnostics | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0183` | Evidence-driven recommendations | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0184` | Glean investigation as a context layer | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0185` | K.I.N.D multi-player AI | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0186` | Internal model routing and AI cost economics | run-costs-and-cashflow | PARTIAL | PARTIAL | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0187` | CodeRabbit as an independent second reviewer | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0188` | Milla voice — speech-to-text and spoken replies | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0189` | Slack as an interaction layer | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0190` | Alta parity — the unified data layer / shared agent brain | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | — |
| `CMP-0191` | The three-product model (R39) | V2-TRACKER | VERIFIED CURRENT DIRECTION | UNBUILT | V2 | ⚪ | — | R39 |
| `CMP-0192` | Evidence-triggered phase ladder — PROVE IT / COMPOUND IT / SCALE IT | V2-TRACKER | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0193` | The Drop as a content programme | CANONICAL HOME UNRESOLVED | PARTIAL | BUILT | POST-LAUNCH CRITICAL | ⚪ | — | — |
| `CMP-0194` | Day-1 post-launch operating-model session (R60) | PRODUCT-RULES | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | POST-LAUNCH CRITICAL | ⚪ | — | R60 |
| `CMP-0195` | Per-client data-retention controls | website / legal source | VERIFIED CURRENT DIRECTION | UNBUILT | POST-LAUNCH CRITICAL | ⚪ | FD-04 | R80 |
| `CMP-0196` | The stealth constraint (R2) | PRODUCT-RULES | VERIFIED LIVE | NOT APPLICABLE | LAUNCH CRITICAL | 🟢 | — | R2 |
| `CMP-0197` | PROGRAMME CONTRIBUTION — DEFINITION | run-costs-and-cashflow | VERIFIED CURRENT DIRECTION | NOT APPLICABLE | CRITICAL NOW | 🟠 | FD-02 | R78 |

---

*Regenerated only from the frozen Step-4 classification plus the labelled founder-decision overrides above. **Adding a truth means adding a CMP ID to the evidence chain first** — never a new ID here. Status of record for product items stays in PRODUCT-INVENTORY; this column set is about TRUTH, not about dots.*
