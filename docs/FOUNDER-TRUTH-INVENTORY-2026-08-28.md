# 📥 FOUNDER TRUTH INVENTORY — 28 August 2026

> # 🛑 STEP 2 INVENTORY ONLY.
> ## PRESENCE HERE DOES NOT MEAN AN ITEM IS CURRENT, CORRECT, LIVE, APPROVED OR LAUNCH-CRITICAL.
> ## CLASSIFICATION OCCURS IN LATER STEPS.
>
> This file is a **raw enumeration** of every material item found in the source documents listed below. It is **not** a truth register, **not** a status board, **not** a priority list and **not** a plan.
>
> **What this pass deliberately did NOT do — each is a later step:**
>
> | Not done here | Where it belongs |
> |---|---|
> | No **priority** assigned to any row | Step 3+ |
> | No **truth layer** assigned (current / superseded / historical) | Step 3+ |
> | No **verdict** on whether an item is right, live or built | Step 3+ |
> | No **deduplication** — the same subject appears once per source that states it | Step 5 |
> | No **conflict resolution** — contradictory rows sit side by side, unreconciled | Step 3+ |
> | No **edit to any source document** | — |
>
> **Two rows describing the same thing is EXPECTED and is not an error in this pass.** The `$4 per approved lead` appears in PRODUCT-RULES, PRODUCT-INVENTORY, LAUNCH-PAD, `run-costs-and-cashflow.md` and the truth audit; all five are listed, because Step 2's job is to find everything, not to decide which one wins.
>
> **The `Exact source status marker` column is transcribed, not interpreted.** Where a source carries a dot, a strike-through, a ⛓️ chain mark, a `CONFLICT`/`MISSING` class or a founder marker, it is reproduced. `(none)` means the source carries no marker — it does **not** mean the item is unmarked in reality.

---

## Provenance

| | |
|---|---|
| **Baseline `origin/main` SHA** | `299b2e823b5da4ff2dad45e5e20be12d7186e932` |
| **Branch** | `claude/founder-truth-reconciliation`, cut from that SHA, 0 ahead / 0 behind at start |
| **Date** | 28 August 2026 |
| **Mutations to any source document** | **none** |
| **Runtime / schema / config / migration / deploy / provider actions** | **none** |
| **PR #1463 (`claude/founder-operating-truth`)** | **untouched** — not edited, not merged, not cherry-picked, not closed |

---
## Source document register

**Every document in this register was read IN FULL.** A `NO` in the `FULLY READ` column blocks Step 2; there are none.

| # | Source document | Lines | FULLY READ | Rows inventoried | Why it is in scope |
|---|---|---:|:---:|---:|---|
| 1 | `CLAUDE.md` | 119 | **YES** | 66 | **Discovered source beyond `docs/`.** Holds founder-locked PROTOCOL v1, the Citation Law, the working method and the end-of-session ritual — material founder operating truth |
| 2 | `docs/PRODUCT-RULES.md` | 407 | **YES** | 212 | Named in the Step 2 scope. The register of founder rulings |
| 3 | `docs/LAUNCH-PAD.md` | 118 | **YES** | 60 | Named in the Step 2 scope. Launch-current execution |
| 4 | `docs/PRODUCT-INVENTORY.md` | 852 | **YES** | 713 | Named in the Step 2 scope. The status board |
| 5 | `docs/V2-TRACKER.md` | 1698 | **YES** | 351 | Named in the Step 2 scope. Future detail + the Founder Idea Bank |
| 6 | `docs/client-flow-sop.md` | 285 | **YES** | 31 | Named in the Step 2 scope. The client-journey SOP |
| 7 | `docs/run-costs-and-cashflow.md` | 579 | **YES** | 63 | Named in the Step 2 scope. Money and economics |
| 8 | `docs/FOUNDER-TRUTH-AUDIT-2026-08-28.md` | 362 | **YES** | 109 | Named in the Step 2 scope. The merged 28 Aug audit |

**Total: 8 source documents · 4420 lines read in full · 1605 inventory rows.**

### Sources considered and NOT inventoried in this pass — reported, not silently dropped

These were enumerated and deliberately left out of Step 2's scope. **Each is a founder call to bring into scope; none was skipped because it could not be read.**

| Candidate | Count | Why it is out of scope for Step 2 |
|---|---:|---|
| `docs/archive/**` | 27 files | Explicitly archived history. `MASTER.md` alone is 8,141 lines. Inventorying archive would flood Step 2 with items the repo has already retired |
| `docs/**` non-canonical operational docs (`RULEBOOK.md`, `KIND-MASTER.md`, `CORE-MAP.md`, `DOC-MAP.md`, `SCHEMA-DRIFT.md`, `ENVIRONMENT.md`, `TECH-STACK.md`, runbooks, compliance, legal, marketing, hiring, strategy, content, drafts) | ~120 files | Material, and several are **strong candidates for Step 2b** — in particular `KIND-MASTER.md` (1,185 lines, strategy + session log) and `RULEBOOK.md` (336 lines), both named in CLAUDE.md's four-doc contract. Not in the founder's Step 2 list |
| `docs/**/*.html` artifacts (`CASHFLOW-LAB.html`, `kind-pitch-deck.html`, previews, mv-previews, strategy verifications) | 60 files | `CASHFLOW-LAB.html` is the **money model of record (#556)** and the truth audit marks it 🔴 STALE — a real Step 2b candidate. The rest are design/preview artifacts |
| `apps/website/**`, `apps/portal/public/**`, `apps/landing/**` | 30 HTML files | Client-facing marketing surface, not founder-truth prose. The audit already inventories their state (FTA-053…FTA-057) |
| `README.md`, `AGENT_AVATARS.md`, migration READMEs, `supabase/seeds/competitor_icps_readme.md` | 6 files | Thin or purely technical |
| Code, schema, migrations, tests | — | Not documents. Step 2 inventories **stated items**, not implementation |

⚠️ **This table is a REPORT, not a decision.** If the founder wants any of these in the inventory, that is Step 2b and it is his call — Claude has excluded nothing on its own authority beyond the scope his prompt set.

---

## Item type vocabulary used in this pass

`RULE` · `IDEA` · `FEATURE` · `TASK` · `GATE` · `DEFECT` · `RISK` · `COMMERCIAL` · `MONEY` · `ARCHITECTURE` · `EXPERIENCE` · `OPERATING` · `HISTORY` · `QUESTION` · `CONFLICT` · `OTHER`

⚠️ **Item type is a description of the row's SHAPE, not a judgement about its truth or importance.** A `RULE` row may be superseded; a `FEATURE` row may be unbuilt; a `MONEY` row may be stale. None of that is decided here.

---

---

# CLAUDE.md — agent operating system

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-0001 | Header | (none) | CLAUDE.md is agent config, not a tracker — no tasks, no statuses, no roadmap | OPERATING | (none) | (none) | Points to docs/RULEBOOK.md for detailed working rules |
| INV-0002 | The four canonical docs | (none) | LAUNCH-PAD is the ONLY home for today's / this week's execution | OPERATING | (none) | (none) | Four-doc contract row 1 |
| INV-0003 | The four canonical docs | (none) | PRODUCT-INVENTORY is the ONLY home for product STATUS (one dot + one owner) | OPERATING | (none) | (none) | Four-doc contract row 2 |
| INV-0004 | The four canonical docs | (none) | KIND-MASTER is the ONLY home for strategy, decisions, history, session log | OPERATING | (none) | (none) | Four-doc contract row 3 |
| INV-0005 | The four canonical docs | (none) | V2-TRACKER is the ONLY home for future detail | OPERATING | (none) | (none) | Four-doc contract row 4 |
| INV-0006 | The four canonical docs | (none) | No fifth core doc unless it replaces an old one | RULE | (none) | (none) | Cited by Protocol r22 and R75 |
| INV-0007 | OPERATING PROTOCOL v1 | Protocol r1 | PAUSE is default (R65). No build/edit/PR/migration/external write before the founder's explicit GO | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0008 | OPERATING PROTOCOL v1 | Protocol r2 | Every task has ONE MODE: READ-ONLY VERIFY · BUILD · DOC RECONCILIATION · FULL AUDIT | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0009 | OPERATING PROTOCOL v1 | Protocol r3 | Current-truth authority: PRODUCT-RULES > LAUNCH-PAD > PRODUCT-INVENTORY > KIND-MASTER > V2-TRACKER | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0010 | OPERATING PROTOCOL v1 | Protocol r4 | Historical / struck / quoted / chained / superseded text is NOT current truth because a search found it | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0011 | OPERATING PROTOCOL v1 | Protocol r5 | BOOTSTRAP ONCE PER SESSION, anchored to the baseline origin/main SHA — ephemeral evidence ledger | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0012 | OPERATING PROTOCOL v1 | Protocol r6 | Search first; read only the files/lines/functions the task needs | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0013 | OPERATING PROTOCOL v1 | Protocol r7 | V2-TRACKER is NOT read for current-product/launch work | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0014 | OPERATING PROTOCOL v1 | Protocol r8 | SCOPE CARD then CLAUSE TABLE then WAIT FOR GO before BUILD / DOC RECONCILIATION / FULL AUDIT | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0015 | OPERATING PROTOCOL v1 | Protocol r9 | Size limits: SMALL ≤5 read / ≤3 changed · MEDIUM ≤12 read / ≤8 changed | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0016 | OPERATING PROTOCOL v1 | Protocol r10 | After GO the clause table is the CONTRACT — no opportunistic cleanup | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0017 | OPERATING PROTOCOL v1 | Protocol r11 | Test funnel: smallest RED proof → targeted GREEN → affected package → check.sh ONCE at the end | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0018 | OPERATING PROTOCOL v1 | Protocol r12 | Re-verification is DIFF-FIRST | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0019 | OPERATING PROTOCOL v1 | Protocol r13 | Distinguish CODE VERIFIED · RUNTIME VERIFIED · RUNTIME UNVERIFIED | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0020 | OPERATING PROTOCOL v1 | Protocol r14 | Finding states: OPEN · PARKED/DEFERRED · FIXED BUT UNGUARDED · CLOSED/VERIFIED | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0021 | OPERATING PROTOCOL v1 | Protocol r15 | A meaningful fix is not CLOSED until regression protection exists | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0022 | OPERATING PROTOCOL v1 | Protocol r16 | New or changed validators must prove their teeth (good PASS → bad FAIL → restored PASS) | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0023 | OPERATING PROTOCOL v1 | Protocol r17 | A PRODUCT-RULES change triggers a dependency check | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0024 | OPERATING PROTOCOL v1 | Protocol r18 | Out-of-scope discoveries: STOP if blocking, otherwise REPORT and continue — never fix silently | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0025 | OPERATING PROTOCOL v1 | Protocol r19 | The weekly audit is CHANGE-BASED from the last persisted audited-through SHA | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0026 | OPERATING PROTOCOL v1 | Protocol r20 | MERGE IS NEVER CLAUDE'S — founder routes through GPT-5.6 independent review | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0027 | OPERATING PROTOCOL v1 | Protocol r21 | MEETING_BOOKED remains the hard downstream product-outcome boundary | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0028 | OPERATING PROTOCOL v1 | Protocol r22 | No new summary/current-truth document unless the founder explicitly changes this rule | RULE | MANDATORY | founder-locked 21 Aug 2026 | Full text: RULEBOOK §15 |
| INV-0029 | Single source of truth | (none) | STATUS lives only in PRODUCT-INVENTORY | RULE | (none) | (none) |  |
| INV-0030 | Single source of truth | (none) | TODAY'S EXECUTION lives only in LAUNCH-PAD | RULE | (none) | (none) |  |
| INV-0031 | Single source of truth | (none) | STRATEGY / DECISIONS / HISTORY live only in KIND-MASTER | RULE | (none) | (none) |  |
| INV-0032 | Single source of truth | (none) | FUTURE DETAIL lives only in V2-TRACKER | RULE | (none) | (none) |  |
| INV-0033 | Single source of truth | (none) | If two docs describe the same fact that is a bug — delete the copy, keep the home | RULE | (none) | (none) |  |
| INV-0034 | Single source of truth | (none) | Authority split — KIND-MASTER strategy · LAUNCH-PAD daily · PRODUCT-INVENTORY status | RULE | (none) | (none) | Each governs one domain only |
| INV-0035 | Status dots | (none) | Five status dots, ladder 🔴 → 🟡 → 🟣 → 🩷 → 🟢, plus ⏸ blocked | GATE | (none) | (none) | Definitions of each dot |
| INV-0036 | Status dots | (none) | Iron rule: nothing is 🟢 unless verified live in production | GATE | (none) | (none) | Live-but-unwalked is 🩷 |
| INV-0037 | Preview before live | (none) | Client-facing work is previewed FIRST — preview → founder 🟣 → live 🩷 | GATE | (none) | RULEBOOK §11 | Merging to main = shipping. Docs do not deploy |
| INV-0038 | Render every action | (none) | Any state-changing action is reflected the SAME session in its one owning doc | RULE | (none) | (none) | No silent changes, no deferring |
| INV-0039 | End-of-session ritual | ritual 1 | Flip the dot(s) in PRODUCT-INVENTORY — the only status edit | TASK | (none) | (none) |  |
| INV-0040 | End-of-session ritual | ritual 2 | Overwrite the top of LAUNCH-PAD; item-table rows MIRROR the inventory dots | TASK | (none) | (none) | Script-generated by scripts/mirror-launchpad.sh |
| INV-0041 | End-of-session ritual | ritual 3 | Append one line to the KIND-MASTER session log = the git commit message | TASK | (none) | (none) |  |
| INV-0042 | End-of-session ritual | ritual 4 | Touch KIND-MASTER strategy or V2-TRACKER only when a decision actually changes | TASK | (none) | (none) |  |
| INV-0043 | End-of-session ritual | ritual 4b | Any founder ruling in chat → a row in PRODUCT-RULES the SAME session | RULE | (none) | (none) | Quote verbatim; supersession chains, never deletes |
| INV-0044 | End-of-session ritual | ritual 5 | Run scripts/doc-lint.sh before committing any doc change | GATE | ⚠️ CI DOES NOT RUN IT | corrected 6 Aug | Actions ran 788× 25 May–3 Jul then the account flag killed it |
| INV-0045 | Steals | (none) | Every steal captured on sight, same session, logged in RED as a 🔴 inventory item | RULE | (none) | RULEBOOK §9 | STEALS CATALOG in PRODUCT-INVENTORY is the ledger |
| INV-0046 | GitHub process | (none) | NEVER STRAND A COMMIT — fresh branch off current origin/main before every commit | RULE | (none) | (none) | Prove 0-behind / ≥1-ahead after push |
| INV-0047 | GitHub process | (none) | One PR = one shippable change. One issue = one problem/feature | RULE | (none) | (none) |  |
| INV-0048 | GitHub process | (none) | Every PR description carries six named sections | RULE | (none) | (none) | Source item · What changed · How to test · Screenshots · Inventory update · Launch-Pad update |
| INV-0049 | GitHub process | (none) | Every PR shipping inventory items carries a Flips: #id line | RULE | ⚠️ inventory-autoflip HAS NEVER RUN — 0 executions since 9 Jul | (none) | Flip the dot by hand with scripts/flip-dots.sh |
| INV-0050 | GitHub process | (none) | 🟢 stays founder-only (FOUNDER_FLIP=1), never in CI | GATE | (none) | (none) |  |
| INV-0051 | GitHub process | (none) | Labels: verify · fix · ship · blocked · parked · post-launch | OPERATING | (none) | (none) |  |
| INV-0052 | GitHub process | (none) | Close redundant PRs whose code is already live via another merge | RULE | (none) | (none) |  |
| INV-0053 | GitHub process | (none) | Do not merge anything lacking a test path or a done condition | GATE | (none) | (none) |  |
| INV-0054 | GitHub process | (none) | The founder merges; reconcile against origin/main and end with the merge-state footer | RULE | (none) | RULEBOOK 5.6/5.7 |  |
| INV-0055 | Audit yourself | (none) | AUDIT YOURSELF BEFORE REPORTING ANY DELIVERABLE — locate, count, report actual, never from memory | RULE | founder-LOCKED | 29 Jun | Earned by the 2k pull reported as 2,000 names with 0 verified emails |
| INV-0056 | The working method | method 1 | Verify, then speak — no number, status, file fact or ref from memory | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0057 | The working method | method 2 | Read the function before describing it | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0058 | The working method | method 3 | Founder-plain language — one recommendation, walkthroughs one step at a time | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0059 | The working method | method 4 | Status reports build nothing — report, then wait for the word | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0060 | The working method | method 5 | Builds: fresh branch · check.sh green both ends · red proof · one PR · prove ahead/behind | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0061 | The working method | method 6 | The founder's screenshots are production evidence and outrank the gate | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0062 | The working method | method 7 | Money sentences are interpolated, never typed — derive from @kind/shared | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0063 | The working method | method 8 | When corrected, record it — same session, in the session log, without ceremony | RULE | STILL IN FORCE, extended by Protocol v1 | founder-locked 4 Aug |  |
| INV-0064 | Session start | (none) | Session start amended — baseline SHA → PRODUCT-RULES once → only the LAUNCH-PAD rows the task touches | RULE | ⛓️ AMENDED | 21 Aug by Protocol v1 | The one place the protocol REVERSES an older instruction |
| INV-0065 | THE CITATION LAW | (none) | Verify a founder-locked decision ONCE per task and record rule ID + date in the ledger | RULE | ⛓️ AMENDED — duty unchanged, frequency changed | founder-ordered 6 Aug, amended 21 Aug | Verbatim quotes always require checking exact founder wording |
| INV-0066 | THE CITATION LAW | (none) | What earned it — the 6 Aug #549 / #577 contradiction that merged with every check green | HISTORY | (none) | 6 Aug | doc-lint verifies counts and copies, never whether a sentence is TRUE |

---

# docs/PRODUCT-RULES.md — the register of locks

> **190 rule rows** were extracted, across every section of the register, with **no duplicate IDs**. The `Exact source status marker` column reproduces the chain marks (⛓️), strike-throughs (~~), warnings (⚠️), stops (🛑), locks (🔒) and completions (✅) that the source row actually carries.

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-0067 | Header | (none) | THE REGISTER OF LOCKS — the founder's memory, externalised | OPERATING | READ THIS FIRST, EVERY SESSION | 6 Aug | Exists because "i cant remember everything fable" |
| INV-0068 | THE CHAIN RULE | (none) | A superseded decision is NEVER deleted — it is chained, both dated, LATEST WINS | RULE | (none) | 6 Aug | An un-chained supersession on this page is a live trap |
| INV-0069 | The rules about these rules | rule 1 | Cite by date — no sentence about a locked decision without citing its date | RULE | (none) | (none) |  |
| INV-0070 | The rules about these rules | rule 2 | This is a REGISTER, not a new home for truth — status lives only in PRODUCT-INVENTORY | RULE | (none) | (none) |  |
| INV-0071 | The rules about these rules | rule 3 | Same-session capture — a chat ruling becomes a row here that session | RULE | (none) | (none) | CLAUDE.md ritual 4b |
| INV-0072 | The rules about these rules | rule 4 | Verbatim beats paraphrase | RULE | (none) | (none) |  |
| INV-0073 | 1 · MONEY | M1 | The $299 pack is 100 approvals included. Not 99, not 124. *(price re-locked 3 Aug; the 100 never moved)* | MONEY | (none) | founder-locked 24 Jul → 3 Aug |  |
| INV-0074 | 1 · MONEY | M2 | After the included 100, it is a flat $4 per approved lead. FINAL — no $1/$3 split shown, no hold, no capture-a… | MONEY | (none) | founder-locked 24 Jul |  |
| INV-0075 | 1 · MONEY | M3 | The pack purchase buys the pack ONLY — never wallet credit as well. One payment must not pay out twice. ⛓️ *Wr… | MONEY | (none) | 6 Aug |  |
| INV-0076 | 1 · MONEY | M4 | ONE WALLET. One dollar wallet per client. No parallel credit columns. | MONEY | (none) | founder-locked 25 Jul |  |
| INV-0077 | 1 · MONEY | M5 | A lead is charged at most once, ever. | MONEY | (none) | (none) |  |
| INV-0078 | 1 · MONEY | M6 | Repeat business is wallet top-ups, not a second pack. *(Costed 25 Jul when a renewing pack lost money at ~$105… | MONEY | (none) | 25 Jul → 3 Aug |  |
| INV-0079 | 1 · MONEY | M7 | Money the client is owed is never silently lost. A failed write returns the money, releases the claim, and ale… | MONEY | (none) | (none) |  |
| INV-0080 | 1b · PRICING | PR1 | The first purchase is $299 — the fully-onboarded pack, 100 approved leads included, then $4 each. ~~*24–25 Jul… | MONEY | ⛓️ carries a ~~struck~~ chain | 3 Aug |  |
| INV-0081 | 1b · PRICING | PR2 | Discounts are founder discretion, by hand in Stripe — NEVER in code, on the site, or in the product. | MONEY | (none) | 3 Aug |  |
| INV-0082 | 1b · PRICING | PR3 | Base + Advanced — two packages, ONE engine. Not two products, not two codebases; what differs is entitlement a… | MONEY | (none) | locked 31 Jul → 2 Aug |  |
| INV-0083 | 1b · PRICING | PR4 | Coaching stays as-is and stays FREE — a value-add on a booked meeting, which makes it a retention lever rather… | MONEY | (none) | 31 Jul → 2 Aug |  |
| INV-0084 | 1b · PRICING | PR5 | The funnel model stays at 1,000:1 contacts-to-win. It does not move on vendor marketing (Apollo's 50,000 is on… | MONEY | (none) | 4 Aug |  |
| INV-0085 | 1b · PRICING | PR6 | CASHFLOW-LAB.html is the money model of record, in the repo — two needles at the top, every cost line an edita… | MONEY | (none) | 25 Jul |  |
| INV-0086 | 1b · PRICING | PR7 | The cost floor: what was cut, and what deliberately was NOT. Resend → free · Apollo → free from 3 Sep · Claude… | MONEY | ⛓️ | 3 Aug → 6 Aug |  |
| INV-0087 | 1b · PRICING | PR8 | NO real-money $299 walkthrough. The money walk splits: a $0 manual_grant proves the pack tiles, the wallet sta… | MONEY | (none) | 5 Aug |  |
| INV-0088 | 1b · PRICING | PR9 | A7 is VOID — there is no Stripe dashboard product to fix. His own catalogue screenshot: 9 active products, 0 a… | MONEY | (none) | 5 Aug |  |
| INV-0089 | 1b · PRICING | PR10 | SUPERSEDED 19 Aug BY R47, AND RE-CONFIRMED 26 Aug — "20% acquisition + 5% retention" IS NOT CURRENT TRUTH. ~~*… | MONEY | ~~SUPERSEDED~~ ⛓️ | 19 Jun → 26 Aug |  |
| INV-0090 | 2 · SAFETY — the rules that protect a real person | S1 | A demo account can NEVER touch a real prospect. is_demo is a hard stop inside the send path, and every demo ad… | RULE | (none) | (none) |  |
| INV-0091 | 2 · SAFETY — the rules that protect a real person | S2 | The kill-switch is OFF until the founder says otherwise. Nothing reaches a real prospect while it is off — inc… | RULE | (none) | (none) |  |
| INV-0092 | 2 · SAFETY — the rules that protect a real person | S3 | Minimum 20 approvals before work starts. A lifetime commitment, not per batch. | RULE | (none) | (none) |  |
| INV-0093 | 2 · SAFETY — the rules that protect a real person | S4 | A paying client with no approvals for 30 days is suspended (warned at 23). | RULE | (none) | (none) |  |
| INV-0094 | 2 · SAFETY — the rules that protect a real person | S5 | Never cold-email from the primary domain. ⛓️ ENFORCED 20 Aug (HC-4) — this column read — for 25 days. The cons… | RULE | (none) | founder 26 Jul → 20 Aug |  |
| INV-0095 | 2 · SAFETY — the rules that protect a real person | S6 | Opt-outs are global, checked at sourcing, across every client. ⛓️ PARTLY ENFORCED 20 Aug (HC-4) — and this col… | RULE | (none) | verified 26 Jul → 20 Aug |  |
| INV-0096 | 3 · SENDING — who drives the van | D1 | CHAINED — read the whole chain before writing one word about Instantly. ~~26 Jul: *Instantly sends for US — ou… | RULE | ⛓️ carries a ~~struck~~ chain | founder-locked 26 Jul → 6 Aug |  |
| INV-0097 | 3 · SENDING — who drives the van | D2 | Smartlead sends for CLIENTS — mailbox bought per client only when they pay. Built 27 Jul (#550) and NOT PROVEN… | RULE | (none) | founder-locked 26 Jul |  |
| INV-0098 | 3 · SENDING — who drives the van | D6 | The two routes are mutually exclusive by construction. canPushToInstantly refuses anything that is not the hou… | RULE | (none) | 27 Jul |  |
| INV-0099 | 3 · SENDING — who drives the van | D7 | A reply belongs to the mailbox that received it. Routing is inbox → client → lead → thread. An unknown inbox f… | RULE | (none) | 27 Jul |  |
| INV-0100 | 3 · SENDING — who drives the van | D3 | Enterprise later — a client's own mailbox, sent directly by our product over SMTP. | RULE | (none) | (none) |  |
| INV-0101 | 3 · SENDING — who drives the van | D4 | Our product decides who, what and whether. Their engine executes the schedule. Every safety gate sits upstream… | RULE | (none) | (none) |  |
| INV-0102 | 3 · SENDING — who drives the van | D5 | We do not build mail infrastructure. Both vendors confirmed in writing they release no SMTP credentials. | RULE | (none) | 23 Jun → 26 Jul |  |
| INV-0103 | 4 · THE DEMO | X1 | One demo environment, always: MBF. The demo factory is gone. | RULE | (none) | (none) |  |
| INV-0104 | 4 · THE DEMO | X2 | The stage never moves. *"5 demos = 1 sale"* only holds if demo fifty shows the same people as demo one. No ran… | RULE | (none) | (none) |  |
| INV-0105 | 4 · THE DEMO | X3 | No real people in a demo. Real names on a sales call is the thing being prevented. | RULE | (none) | (none) |  |
| INV-0106 | 5 · PROCESS — how work reaches the founder | P1 | Nobody builds without the founder's go. Anything outside the authorised list: report it, do not build it. | RULE | (none) | (none) |  |
| INV-0107 | 5 · PROCESS — how work reaches the founder | P2 | NOTHING GETS DELETED. Out-of-play code is fenced, labelled, and left exactly where it is. | RULE | (none) | founder-locked 26 Jul |  |
| INV-0108 | 5 · PROCESS — how work reaches the founder | P3 | The founder merges. Claude does not. | RULE | (none) | (none) |  |
| INV-0109 | 5 · PROCESS — how work reaches the founder | P4 | Client-facing work is previewed before it goes live. On this repo, merging to main IS shipping. | RULE | (none) | (none) |  |
| INV-0110 | 5 · PROCESS — how work reaches the founder | P5 | is founder-only and means verified live in production. Live-but-unwalked is 🩷. | RULE | (none) | (none) |  |
| INV-0111 | 5 · PROCESS — how work reaches the founder | P6 | Every claim is proven by pasted command output, or labelled UNVERIFIED. Memory is not a source. | RULE | (none) | (none) |  |
| INV-0112 | 5 · PROCESS — how work reaches the founder | P7 | A full audit states its coverage as a % of the core. *"No issues found"* without a coverage statement is not a… | RULE | (none) | (none) |  |
| INV-0113 | 5 · PROCESS — how work reaches the founder | P8 | One PR = one shippable change. | RULE | (none) | (none) |  |
| INV-0114 | 5 · PROCESS — how work reaches the founder | P9 | If unsure, ask. Do not just build. Flag it. | RULE | (none) | (none) |  |
| INV-0115 | 5 · PROCESS — how work reaches the founder | P10 | READ THE PATH END TO END. Do not grep and move on. Grep can prove a thing exists; it can never prove a thing i… | RULE | (none) | founder 26 Jul |  |
| INV-0116 | 5 · PROCESS — how work reaches the founder | P11 | Every prompt is answered with a CLAUSE TABLE — built before the work, reported after it. See §5a. A prompt is … | RULE | (none) | founder 26 Jul |  |
| INV-0117 | 5 · PROCESS — how work reaches the founder | P12 | THE WEBSITE DOES NOT CHANGE. EVER. Without the founder's explicit, clear command. Verbatim: *"lock in the site… | RULE | 🔒 | founder-locked 1 Aug |  |
| INV-0118 | 6 · OPERATIONS | O1 | Deploy is always bash scripts/ship.sh. Merging does not deploy; Railway is not automatic. | OPERATING | (none) | verified 26 Jul |  |
| INV-0119 | 6 · OPERATIONS | O2 | A red gate cannot deploy. check.sh runs first and refuses, and it is the ONLY gate. ⛓️ ~~*27 Jul: "CI has neve… | OPERATING | carries a ~~struck~~ chain | 6 Aug |  |
| INV-0120 | 6 · OPERATIONS | O3 | No new SQL beyond committed, reviewed, idempotent migrations run from Vida → Engine. | OPERATING | (none) | (none) |  |
| INV-0121 | 6 · OPERATIONS | O4 | Secrets go in Railway, never pasted in chat. | OPERATING | (none) | (none) |  |
| INV-0122 | 6 · OPERATIONS | O5 | Nothing shows green unless it was actually probed. NOT-MEASURED is a real answer; treating it as green is the … | OPERATING | (none) | (none) |  |
| INV-0123 | 6 · OPERATIONS | O6 | Check the live database, not the repo. Three migration directories and two schema snapshots disagree with each… | OPERATING | (none) | 27 Jul |  |
| INV-0124 | 6 · OPERATIONS | O7 | A failed check must never render as a pass. Not an empty list, not a calm zero, not silence. Five instances th… | OPERATING | (none) | 27 Jul |  |
| INV-0125 | 6 · OPERATIONS | O8 | A guard asserts the INTENT, not the literal. A test pinned the exact SQL of a migration; fixing the migration … | OPERATING | (none) | 27 Jul |  |
| INV-0126 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A1 | NOTHING about how we work changes before live. The GitHub board/issues migration was examined at length on 6 A… | RULE | (none) | (from rule text) 6 Aug |  |
| INV-0127 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A2 | The company-GitHub migration is the FIRST post-live project. An org owned by the Ltd, work as issues/board/mil… | RULE | (none) | 26 August |  |
| INV-0128 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A3 | 18 Aug is an ACCESS CHECKPOINT, not a cliff. Agent access can be renewed. No deadline pressure may be derived … | RULE | (none) | (from rule text) 18 Aug |  |
| INV-0129 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A4 | D2 — the GitHub flag appeal is a DEAD END. Nothing may queue behind it. Support is unresponsive and the proble… | RULE | (none) | (none) |  |
| INV-0130 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A5 | C5 — seat removal DEACTIVATES. Permanently. No delete will ever be built. A seat's sent mail, replies and meet… | RULE | (none) | (none) |  |
| INV-0131 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A6 | A16 — CLOSED, no risk. The 9 Instantly mailboxes are 4 Google on 2 domains warming (the ladder's) + 5 older Ai… | RULE | (none) | (none) |  |
| INV-0132 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A7 | Growth is sufficient, and Instantly is load-bearing for clients — permanently. See D1, where the full chain li… | RULE | (none) | (none) |  |
| INV-0133 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A8 | Docs keep a place — for KNOWLEDGE, not status. Things with a finish line become work items; things you consult… | RULE | (none) | (none) |  |
| INV-0134 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b | A9 | NOT A RULING — an agent working practice, recorded here so it is never mistaken for one. *"Trust screens, not … | RULE | ⚠️ | (from rule text) 6 Aug |  |
| INV-0135 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b › 7b · THE 6 AUGUST RULINGS, PART TWO — four open questions closed in on | A10 | THE SEQUENCE CAP IS 7. The 8-Jul lock said 10 (*"no it is 10. we know this"*). The 7 came from deliverability … | RULE | (none) | (from rule text) 4 Aug |  |
| INV-0136 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b › 7b · THE 6 AUGUST RULINGS, PART TWO — four open questions closed in on | A11 | THE 2 STRANDED PAID LEADS GET ENROLLED — *"enrol — they were paid for."* Approved on Client Zero during the 5-… | RULE | (none) | (none) |  |
| INV-0137 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b › 7b · THE 6 AUGUST RULINGS, PART TWO — four open questions closed in on | A12 | #301 IS MOOT. The Denise $39-vs-$99 conflict has been open since 3 Jul, waiting on a price for a product that … | RULE | (none) | (from rule text) 3 Jul |  |
| INV-0138 | 7 · THE 6 AUGUST RULINGS — captured the same session, per ritual 4b › 7b · THE 6 AUGUST RULINGS, PART TWO — four open questions closed in on | A13 | #630 goes 🩷 — the probe fix is live and verified on the founder's own System screen (cron_claims.job CHECKED-O… | RULE | (none) | (none) |  |
| INV-0139 | 8 · ARCHITECTURE | AR1 | The company trades as Milla&Vida — one engine, two portals. K.I.N.D is the registered company. FIGSY is the EN… | ARCHITECTURE | ⛓️ | founder-locked 22 Jul |  |
| INV-0140 | 8 · ARCHITECTURE | AR2 | Milla and Vida are CONSOLES; the intelligence belongs to FIGSY. 14 agent-era brain items moved into THE BRAIN … | ARCHITECTURE | (none) | 1 Aug |  |
| INV-0141 | 8 · ARCHITECTURE | AR3 | THE NEXUS LOCK — no cross-client learning, EVER. What one client's data teaches may never reach another. #150 … | ARCHITECTURE | 🔒 | 1 Aug |  |
| INV-0142 | 8 · ARCHITECTURE | AR4 | Nexus auto-tune is DEFAULT-DENY, per client — and even enabled, needs a confident profile (3+ booked meetings,… | ARCHITECTURE | (none) | 1 Aug |  |
| INV-0143 | 8 · ARCHITECTURE | AR5 | Apollo is OURS. PDL + Hunter are the CLIENTS'. The same mirror as Instantly/Smartlead. A 1-Aug audit tagged Ap… | ARCHITECTURE | ⚠️ | locked 30 Jul → 1 Aug |  |
| INV-0144 | 8 · ARCHITECTURE | AR6 | CHAINED — THE SCHEMA IS NO LONGER FROZEN. ~~*30 Jul → 5 Aug: "never build anything that ends 'now press Run mi… | ARCHITECTURE | ⛓️ carries a ~~struck~~ chain | 6 Aug |  |
| INV-0145 | 8 · ARCHITECTURE | AR7 | THE CORE MAP — work happens inside the core, and coverage is stated as % of it. Fenced code is not in play: ne… | ARCHITECTURE | (none) | founder-locked 26 Jul |  |
| INV-0146 | 8 · ARCHITECTURE | AR8 | Every PDL dollar is pre-funded by collected cash. Sourcing spends only against an allowance accrued from money… | ARCHITECTURE | (none) | founder-locked 10 Jul |  |
| INV-0147 | 8 · ARCHITECTURE | AR9 | CHAINED — THE CLIENT STILL REVISES FREELY, BUT NO LONGER PRESSES GO. ~~*25 Jul: "The client revises their own … | ARCHITECTURE | ⛓️ carries a ~~struck~~ chain | 25 Jul → 22 Aug |  |
| INV-0148 | 8 · ARCHITECTURE | AR10 | Build the lead pool now, WITHOUT waiting for the PDL-licence legal review. Risk accepted deliberately — revisi… | ARCHITECTURE | ⚖️ | founder ruling 10 Jul |  |
| INV-0149 | 8 · ARCHITECTURE | AR11 | Jack&Jill patterns: STEAL ONLY, do not build. Logged as 7 red items + a STEALS CATALOG line. | ARCHITECTURE | (none) | 10 Jul |  |
| INV-0150 | 8 · ARCHITECTURE | AR12 | POOL FIRST — FOR EVERYONE. Prospect sourcing serves matches from the lead pool we already own before any exter… | ARCHITECTURE | 🪣 | founder-ruled 21 Aug |  |
| INV-0151 | 8 · ARCHITECTURE | AR13 | COMPANY-NAME SEARCH IS HOUSE-ONLY, FOR NOW. POST /leads/find-at-companies is refused for normal clients with a… | ARCHITECTURE | 🚧 | founder-ruled 21 Aug |  |
| INV-0152 | 8 · ARCHITECTURE | AR14 | THE ICP PREVIEW IS EXTERNAL-ONLY. /icps/preview-count reports what an external provider can see and never adds… | ARCHITECTURE | 👁️ | founder-ruled 21 Aug → 22 Aug |  |
| INV-0153 | 8 · ARCHITECTURE | AR15 | THE LEGACY APOLLO DRAIN — a bounded, deliberate exception to AR5. Normal-client leads that already carry an ap… | ARCHITECTURE | ⛓️ carries a ~~struck~~ chain | founder-ruled 21 Aug |  |
| INV-0154 | 8 · ARCHITECTURE | AR16 | HUNTER IS NOT FENCED OFF FROM THE HOUSE — a narrow clarification of AR5, not a change to it. AR5's *"PDL + Hun… | ARCHITECTURE | ⛓️ | founder-ruled 22 Aug |  |
| INV-0155 | 8 · ARCHITECTURE | AR17 | FREE REAL-LEAD PROOF — THE LAUNCH ACQUISITION MOTION, AND ITS FENCE. A prospect is shown REAL masked leads bef… | ARCHITECTURE | 🎁 | founder-set 22 Aug |  |
| INV-0156 | 8 · ARCHITECTURE | AR18 | FREE ACQUISITION AND PAID DELIVERY ARE SEPARATE BUDGETS — neither may starve the other. Free proof has its own… | ARCHITECTURE | 💰 | founder-ruled 22 Aug |  |
| INV-0157 | 9 · MORE SENDING — the rules that were never on this page | D8 | Option B: WE press send, through the mailbox the provider warmed. He overruled my Option-A recommendation and … | RULE | 🔒 | 26 Jul |  |
| INV-0158 | 9 · MORE SENDING — the rules that were never on this page | D9 | NO CAMPAIGNS IN INSTANTLY. EVER. It is a warm-up utility. A campaign there sends outside our engine, our appro… | RULE | ⚠️ | 4 Aug |  |
| INV-0159 | 9 · MORE SENDING — the rules that were never on this page | D10 | Warm-up daily cap is 25, deliberately ABOVE Instantly's suggested 10. A box warmed to 10/day has reputation fo… | RULE | (none) | 4 Aug |  |
| INV-0160 | 9 · MORE SENDING — the rules that were never on this page | D11 | Instantly connects by OAuth, NOT App Password — reversing my advice. App passwords are *"more prone to disconn… | RULE | (none) | 4 Aug |  |
| INV-0161 | 9 · MORE SENDING — the rules that were never on this page | D12 | The booking link LEAVES email 1 — Option A: the gate is right, the prompt was wrong. The repo carried two live… | RULE | ⛓️ | 5 Aug |  |
| INV-0162 | 9 · MORE SENDING — the rules that were never on this page | D13 | "Our sequence and outreach must be world class." A copy gate before a warm box ever sends. HARD rules block ac… | RULE | (none) | 4 Aug |  |
| INV-0163 | 9 · MORE SENDING — the rules that were never on this page | D14 | RULED 6 Aug — THE CAP IS 7. ~~*8 Jul: "sequences cap at 10 email steps" — the founder's own words, "no it is 1… | RULE | ⛓️ carries a ~~struck~~ chain | founder 6 Aug |  |
| INV-0164 | 9 · MORE SENDING — the rules that were never on this page | D15 | A reply belongs to the mailbox that received it. An unknown inbox falls back to the fan-out; a known inbox wit… | RULE | (none) | 27 Jul |  |
| INV-0165 | 9 · MORE SENDING — the rules that were never on this page | D16 | Build reply/opt-out logic PROVIDER-AGNOSTIC, in a shared spine — otherwise each provider grows its own copy of… | RULE | (none) | 27 Jul |  |
| INV-0166 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S7 | PECR — never cold-email a UK sole trader. A UK lead that cannot be proven corporate is refused. Fails SAFE (th… | RULE | (none) | 5 Aug |  |
| INV-0167 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S8 | VAT + company registration captured at onboarding, for ALL clients. "Not registered" is an explicit recorded a… | RULE | (none) | 4 Aug |  |
| INV-0168 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S9 | Remove ALL speed and time-to-result promises. No "guarantee". No replacement number until one is proven. | RULE | (none) | founder-locked 8 Jul |  |
| INV-0169 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S10 | No fake logos, quotes or numbers ship. The whole social-proof system ships hidden until real data exists. Unbu… | RULE | (none) | 8 Jul → 28 Jun |  |
| INV-0170 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S11 | Honest-label beats fake capability. Where the portal claimed what it could not do, he chose labelling it hones… | RULE | (none) | 6 Jul |  |
| INV-0171 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S12 | Admin gets a real auth gate — Supabase login + founder-email allowlist, on both the pages and the /api/proxy r… | RULE | (none) | 6 Jul |  |
| INV-0172 | 10 · MORE SAFETY, PROCESS & OPERATIONS | S13 | The go-live seed wipe is FOUNDER-ONLY, and exclusion beats deletion. Four protections checked in order — real … | RULE | (none) | 27 Jul |  |
| INV-0173 | 10 · MORE SAFETY, PROCESS & OPERATIONS | P13 | Report, don't purge. Nothing gets actioned until I say go. The 1-Aug audit read 579 rows and 90 docs, re-verif… | RULE | (none) | 1 Aug |  |
| INV-0174 | 10 · MORE SAFETY, PROCESS & OPERATIONS | P14 | Don't report back unless it's green. Fixes are proven, not claimed — red-proved against the old code first. | RULE | (none) | 26 Jul |  |
| INV-0175 | 10 · MORE SAFETY, PROCESS & OPERATIONS | P15 | A change to a fenced file needs its reason stated OUT LOUD, before the change. | RULE | (none) | 27 Jul |  |
| INV-0176 | 10 · MORE SAFETY, PROCESS & OPERATIONS | P16 | One method for every model. The Fable/Opus split is retired; the discipline lives in CLAUDE.md for whoever run… | RULE | (none) | 4 Aug |  |
| INV-0177 | 10 · MORE SAFETY, PROCESS & OPERATIONS | P17 | "I will not merge any open PR until I can measure the product." BLOCK M's four instruments came first. Dischar… | RULE | (none) | 26 Jul |  |
| INV-0178 | 10 · MORE SAFETY, PROCESS & OPERATIONS | O9 | 31 Aug is the outside edge. | RULE | (none) | founder-locked 26 Jul |  |
| INV-0179 | 10 · MORE SAFETY, PROCESS & OPERATIONS | O10 | Selling is the founder's, and it stays OFF the board. Not forgotten — deliberately absent. He uses his own pri… | RULE | (none) | 4 Aug |  |
| INV-0180 | 10 · MORE SAFETY, PROCESS & OPERATIONS | O11 | IDLE TOOLS BILL NOTHING. The cost register records actual current spend, and every $0 line carries the trigger… | RULE | (none) | 30 Jul |  |
| INV-0181 | 10 · MORE SAFETY, PROCESS & OPERATIONS | O12 | Railway @kind/api runs 1 replica — guarded by the billing tier, not by discipline. Re-check the day Railway go… | RULE | (none) | 4 Aug |  |
| INV-0182 | 10 · MORE SAFETY, PROCESS & OPERATIONS | O13 | DNS: EDIT the existing _dmarc record, never ADD a second. GoDaddy pre-seeds one, and a domain publishing two h… | RULE | (none) | 4 Aug |  |
| INV-0183 | 10 · MORE SAFETY, PROCESS & OPERATIONS | O14 | The failover teardown is PARKED, founder-agreed — $12/mo against a launch blocked on mailboxes, and step ⓐ ris… | RULE | (none) | 3 Aug |  |
| INV-0184 | 11 · REPORTING — the standings report is a LOCKED FORMAT | RPT1 | One report shape, forever. The standings report is ALWAYS the same template — numbered sections (✅ shipped & c… | OPERATING | (none) | 6 Aug |  |
| INV-0185 | 11 · REPORTING — the standings report is a LOCKED FORMAT | RPT2 | The report states what is on main versus what is waiting on the founder — two board lines. Nothing pushed coun… | OPERATING | (none) | 6 Aug |  |
| INV-0186 | 11 · REPORTING — the standings report is a LOCKED FORMAT | RPT3 | No item ever silently disappears between reports. Anything in the previous report appears in the next — closed… | OPERATING | (none) | 6 Aug |  |
| INV-0187 | 11 · REPORTING — the standings report is a LOCKED FORMAT | RPT4 | The founder's saved prompt below IS the request — when he pastes it, RPT1–RPT3 bind the answer, and every numb… | OPERATING | (none) | 6 Aug |  |
| INV-0188 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R1 | The free-10 entry offer is a SALES TOOL, not a product rule. It is offered on the fly in a call or demo and bu… | RULE | (none) | 6 Aug |  |
| INV-0189 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R2 | Stealth is NARROWED, not lifted. A LinkedIn company page is allowed. No personal announcement. Outreach goes t… | RULE | (none) | 6 Aug |  |
| INV-0190 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R3 | AMENDED 6 Aug, SAME DAY — THE AUDIT FOUND IT WAS NOT FOUR PAGES AND NOT ONLY COPY. ~~*As ruled: four live page… | RULE | ⛓️ carries a ~~struck~~ chain | 6 Aug |  |
| INV-0191 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R4 | RULEBOOK §11 (preview-before-live) IS OVERRIDDEN FOR R3 ONLY. The site fix ships without a staging preview, be… | RULE | ⛓️ | 6 Aug |  |
| INV-0192 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R5 | Kevin is UNCERTAIN — not committed, not rejected. No agreement, no access, no counsel spend until the founder … | RULE | (none) | 6 Aug |  |
| INV-0193 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R6 | IDs #632–#636 ARE RESERVED AND MUST NOT BE RE-USED — #632 marketing playbook · #633 owner's manual · #634 IP p… | RULE | (none) | 6 Aug |  |
| INV-0194 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R7 | A9 (the money walk) and A19 (the till walk) are re-dated to "WHEN FUNDS ALLOW", not "before 18 Aug". Both requ… | RULE | (none) | 6 Aug |  |
| INV-0195 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R8 | IS A CRITICAL STATE, NOT A BACKLOG STATE — and A11 moves to the CRITICAL band. 281 items are live in productio… | RULE | (none) | 6 Aug |  |
| INV-0196 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R9 | The M&V brand hierarchy on the site is KILLED — not parked, not deferred. Cosmetic, adds nothing pre-revenue, … | RULE | (none) | 6 Aug |  |
| INV-0197 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R10 | #426 IS SUPERSEDED AND LEAVES THE 🔴 COUNT. It asked for a 10-step cap; the founder ruled 7, and 7 is enforced.… | RULE | (none) | 6 Aug |  |
| INV-0198 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION | R11 | ALL DOCS MUST BE CURRENT — the ~70 false claims are fixed NOW, not after launch. They do not touch the site, s… | RULE | (none) | 6 Aug |  |
| INV-0199 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION › 12b · What the founder's own screenshot settled | R12 | "Unlimited email warmup" IS included on Instantly GROWTH — vendor-confirmed, not our note. The founder's scree… | RULE | ✅ | 6 Aug |  |
| INV-0200 | 12 · THE 6 AUGUST RULINGS — SECOND SESSION › 12b · What the founder's own screenshot settled | R13 | TWO GROWTH CAPS ARE NOW KNOWN, AND WHETHER THEY BIND US IS NOT. The same screenshot shows Growth at 5,000 emai… | RULE | ⚠️ | 6 Aug |  |
| INV-0201 | 13 · THE 11 AUGUST RULINGS | R14 | THE AIRMAIL MAILBOXES ARE OUT OF SCOPE — stop reconciling them. Instantly shows 9 boxes; only the 4 Google lad… | RULE | (none) | 11 Aug |  |
| INV-0202 | 13 · THE 11 AUGUST RULINGS | R15 | THE VA HIRE TRIGGER IS 4 CLIENTS AND 400 ACCEPTED LEADS A MONTH — and the second half is a CONCENTRATION rule,… | RULE | (none) | 11 Aug |  |
| INV-0203 | 13 · THE 11 AUGUST RULINGS | R16 | FOUR AREAS GET HIRED. EVERYTHING ELSE IS OUTSOURCED OR AN AI AGENT. The four: Account Executives · Customer Su… | RULE | (none) | 11 Aug |  |
| INV-0204 | 13 · THE 11 AUGUST RULINGS | R17 | THE TARGET ORG IS 13 HIRES, AND LEAD ROLES COME LAST. 4 Account Executives · 4 Customer Success managers · 2 V… | RULE | (none) | 1 Marketing |  |
| INV-0205 | 13 · THE 11 AUGUST RULINGS | R18 | HIRING GOES IN CRITICAL STAGES — never a SaaS peak-and-cut. Past 45–50 clients and still growing, hire to matc… | RULE | (none) | 11 Aug |  |
| INV-0206 | 13 · THE 11 AUGUST RULINGS | R19 | DEPTH BEATS BREADTH — this is the operating principle, not a growth preference. Ten clients accepting 200 lead… | RULE | (none) | 11 Aug |  |
| INV-0207 | 13 · THE 11 AUGUST RULINGS | R20 | R2 IS RE-AFFIRMED, NOT LIFTED — and the marketing system ships with its public half switched OFF. Asked direct… | RULE | ⛓️ | 11 Aug |  |
| INV-0208 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R21 | R1 STANDS — the free-10 is discretionary, personal, and stays OFF the site. The bundle's public free-10 landin… | RULE | (none) | 12 Aug |  |
| INV-0209 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R22 | CORRECTED SAME DAY — I read the founder's ruling upside down, and the LIVE SITE proved it. My first write-up o… | RULE | ⛓️ carries a ~~struck~~ chain | 12 Aug |  |
| INV-0210 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R23 | THE LAUNCH ICP IS GLOBAL — US/UK primary, agencies & consultancies ~5–30 staff, referral-dependent. Supersedes… | RULE | (none) | 12 Aug |  |
| INV-0211 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R24 | PAID ADS AND THE ACTRESS ARE PARKED UNTIL REVENUE — R7 stands. The bundle's ~£400/mo plan and on-camera actres… | RULE | (none) | 12 Aug |  |
| INV-0212 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R25 | DAY 1 A CLIENT USES THE SYSTEM — FULL STOP. #550 IS UN-PARKED. The month-one rented Smartlead box is the sendi… | RULE | (none) | 12 Aug |  |
| INV-0213 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R26 | #444 SETTLED THE SAME WAY: the PDL $98/mo tier (~350 names), bought THE SAME DAY as Smartlead — the day a clie… | RULE | (none) | 12 Aug |  |
| INV-0214 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R27 | THE SITE IS NOT TOUCHED — RULED ON A FLAGGED FALSE CLAIM, AND THE RULING STANDS OVER THE FLAG. Auditing the ma… | RULE | (none) | 12 Aug |  |
| INV-0215 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R28 | THE SITE IS OPEN AGAIN FOR MARKETING LINKS — the founder overruled R27 the same day he made it, and the distin… | RULE | (none) | 12 Aug |  |
| INV-0216 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R29 | THE NEWSLETTER IS PARKED. THE CHANNEL IS YOUTUBE — the DROP becomes video: product, launches, updates, "same a… | RULE | (none) | 12 Aug |  |
| INV-0217 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R30 | STATS MAY BE PUBLISHED — BUT ONLY FROM A SOURCE THAT CAN BE CHECKED. This NARROWS R11; it does not delete it. … | RULE | (none) | 12 Aug |  |
| INV-0218 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R31 | CADENCE IS FIXED: two posts a week, plus ONE stats post a month. The weekly rhythm does not change — two brand… | RULE | (none) | 12 Aug |  |
| INV-0219 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R32 | NEW IMAGERY IS ALLOWED — CASE BY CASE, ON THE FOUNDER'S WORD. The site library stays the DEFAULT. Generating o… | RULE | (none) | 12 Aug |  |
| INV-0220 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R33 | VIDEO MAY CARRY A THIRD-PARTY VOICEOVER — the SCRIPT stays brand-voiced. A hired/synthetic voice is fine. The … | RULE | (none) | 12 Aug |  |
| INV-0221 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R34 | THE CHANNELS ARE LINKEDIN NOW, PLUS YOUTUBE AND TIKTOK WITH DEMO CONTENT — releasing soon; all three get foote… | RULE | (none) | 12 Aug |  |
| INV-0222 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R35 | "EMAIL-ONLY" ON THE TRUST PAGE STANDS BESIDE THE SOCIAL CHANNELS — F7 CLOSED, NO EDIT. RPT6 flagged a possible… | RULE | (none) | 14 Aug |  |
| INV-0223 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R36 | VIDA THE CHARACTER IS PUBLIC; VIDA THE CONSOLE NEVER IS. The animation brief for Nexus stalled on a real contr… | RULE | (none) | 15 Aug |  |
| INV-0224 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R37 | EVERY FINISHED PHASE IS A DROP — shipping is marketing, bound to the phase ladder. The post-launch roadmap (V2… | RULE | (none) | 15 Aug |  |
| INV-0225 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R38 | SEQUENCES ARE THE CONVERTER — 3 STEPS IS TOO SHALLOW. The founder ruled depth on 15 Aug, and the same-hour cod… | RULE | (none) | 15 Aug |  |
| INV-0226 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R39 | THE THREE-PRODUCT MODEL — one engine, three ways to pay, and the client pays on APPROVAL at every tier. P1 · M… | RULE | (none) | 15 Aug |  |
| INV-0227 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R40 | THE CLIENT PARTNER SEAT — commission-only, own network, her cut only. The first person other than the founder … | RULE | (none) | 15 Aug |  |
| INV-0228 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R41 | FABLE NEVER BUILDS — set rule, not a preference. Fable verifies, reports, renders previews and writes the prom… | RULE | (none) | 16 Aug |  |
| INV-0229 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R42 | NO LIVE PARTNER WITHOUT BOTH SIGNATURES — the flow is invite → they complete their own pack → they sign → the … | RULE | (none) | 16 Aug |  |
| INV-0230 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R43 | THE OUTREACH BOOK IS GLOBAL — there is no home market and no market split. This is a COMPLIANCE fact before it… | RULE | 🌍 | 16 Aug |  |
| INV-0231 | 14 · THE 12 AUGUST RULINGS — the Cowork marketing bundle reconciled | R44 | OPUS BUILDS ONLY ON AN EXPLICIT INSTRUCTION TO BUILD — a report is a report, and "Go" after one is not authori… | RULE | 🛑 | 16 Aug |  |
| INV-0232 | 15 · THE 19 AUGUST RULINGS | R45 | SUPERSEDED 20 Aug BY R54 — SOUTH AFRICA IS NOT CONDITIONAL. This row recorded SA as joining *"via the POPIA s6… | RULE | ~~SUPERSEDED~~ ⛓️ | 19 Aug |  |
| INV-0233 | 15 · THE 19 AUGUST RULINGS | R46 | VIDA IS THE SINGLE HOME FOR GOVERNED DOCUMENTS. Anything that must be created, held or governed lives in the V… | RULE | 📁 | 17 Aug → 19 Aug |  |
| INV-0234 | 15 · THE 19 AUGUST RULINGS | R47 | AMENDED AND BUILT 19 Aug 2026 — the open question is CLOSED and the wording is now the founder's own, verbatim… | RULE | ~~SUPERSEDED~~ ✅ | 17 Aug → 19 Aug |  |
| INV-0235 | 15 · THE 19 AUGUST RULINGS | R48 | THE OPUS PROTOCOL — how the founder runs Opus when Fable is away. Full text: docs/RULEBOOK.md §14. The split (… | RULE | 🤖 | 19 Aug |  |
| INV-0236 | 15 · THE 19 AUGUST RULINGS | R49 | POOL-FIRST STANDS — AND CROSS-CLIENT SERVING IS GATED ON PDL's PAPER. The order the code executes is correct a… | RULE | 🏊 | 19 Aug |  |
| INV-0237 | 15 · THE 19 AUGUST RULINGS | R50 | THE LAUNCH ALLOWLIST IS A HOLD, IT IS NEVER A CHARGE, AND IT REACHES BACK TO THE TARGET LIST. Three separate r… | RULE | 🌍 | locked 20 Aug |  |
| INV-0238 | 15 · THE 19 AUGUST RULINGS | R51 | NO TRACKING — THE PIXEL IS OFF AND THE SITE CARRIES NO ANALYTICS (HC-6, 20 Aug). Two rulings taken together af… | RULE | 🚫 | 20 Aug |  |
| INV-0239 | 15 · THE 19 AUGUST RULINGS | R52 | A STATUS CODE HAS NO INHERENT PRIVACY MEANING — upstream refusals are read PER PROVIDER, from that provider's … | RULE | ⛓️ | 20 Aug |  |
| INV-0240 | 15 · THE 19 AUGUST RULINGS | R53 | THE POSTAL ADDRESS ON EVERY COLD EMAIL — founder-supplied, never invented (20 Aug). CAN-SPAM §7704(a)(5)(A)(ii… | RULE | 📮 | 20 Aug |  |
| INV-0241 | 15 · THE 19 AUGUST RULINGS | R54 | THE LAUNCH LIST IS US, UK AND SOUTH AFRICA — and the list is a dial the founder turns, not a gate anyone else … | RULE | 🌍 | 20 Aug |  |
| INV-0242 | 15 · THE 19 AUGUST RULINGS | R55 | REAL CALENDAR BOOKING IS LAUNCH-REQUIRED — the client's calendar, written by us, visible to us, before 25 Aug.… | RULE | 🔐 | 20 Aug |  |
| INV-0243 | 15 · THE 19 AUGUST RULINGS | R56 | THE SITE MAY NOT CLAIM WHAT THE INFRASTRUCTURE DOES NOT DO — and "compliant" is not ours to award. Founder-app… | RULE | 📝 | 20 Aug |  |
| INV-0244 | 15 · THE 19 AUGUST RULINGS | R57 | WE LAUNCH 25 AUGUST REGARDLESS OF STATE — and the slip from 31 May is ON THE RECORD. The original launch day w… | RULE | 🚀 | 20 Aug |  |
| INV-0245 | 15 · THE 19 AUGUST RULINGS | R58 | THE FIGSY OBSERVABILITY WORK IS DESIGNED, DOCUMENTED AND NOT BUILT — post-launch, for review (20 Aug). Three b… | RULE | 🔬 | 20 Aug |  |
| INV-0246 | 15 · THE 19 AUGUST RULINGS | R59 | THE MILLA HOMEPAGE IS APPROVED FOR LIVE — scope locked to the page itself (20 Aug, P30). Twenty-three previews… | RULE | (none) | 20 Aug |  |
| INV-0247 | 15 · THE 19 AUGUST RULINGS | R60 | DAY 1 POST-LAUNCH: WE REDESIGN HOW WE OPERATE — founder standing order (20 Aug, end of the P30 day). His words… | RULE | 🛠️ | 20 Aug |  |
| INV-0248 | 15 · THE 19 AUGUST RULINGS | R61 | EVERY PR IS HANDED OVER WITH ITS SHIP COMMAND — no PR link without the command underneath it (21 Aug). The fou… | RULE | 🖥️ | 21 Aug |  |
| INV-0249 | 15 · THE 19 AUGUST RULINGS | R62 | THE PRODUCT KEEPS UK TIME — Europe/London, not South Africa (21 Aug). Every piece of logic that needs to know … | RULE | 🇬🇧 | 21 Aug |  |
| INV-0250 | 15 · THE 19 AUGUST RULINGS | R63 | THE WEBSITE CONVERGES ON THE APPROVED HOMEPAGE — five pages before launch, the rest after (21 Aug, item #698).… | RULE | 🎨 | 21 Aug |  |
| INV-0251 | 15 · THE 19 AUGUST RULINGS | R64 | PROVE THE SURFACE BEFORE YOU BUILD INTO IT — check the LIVE code, never the prompt's claim (21 Aug). Before bu… | RULE | 🔍 | 21 Aug |  |
| INV-0252 | 15 · THE 19 AUGUST RULINGS | R65 | THE PAUSE AND THE 25TH CUT (21 Aug evening). ① Pause is the default state. Fable never builds; silence is neve… | RULE | 🛑 | 21 Aug |  |
| INV-0253 | 15 · THE 19 AUGUST RULINGS | R66 | PAID TESTING FREEZE — NO LIVE PROVIDER SEARCH MAY BE SPENT MERELY TO TEST PRODUCT BEHAVIOUR (25 Aug). Launch t… | RULE | 🧪 | 25 Aug |  |
| INV-0254 | 15 · THE 19 AUGUST RULINGS | R67 | RETENTION IS NOT CONTACTABILITY — EVERY PAID PROVIDER RECORD IS REMEMBERED, AND DNC STILL NEVER GETS CONTACTED… | RULE | 💾 | 25 Aug |  |
| INV-0255 | 15 · THE 19 AUGUST RULINGS | R68 | THE RECURRING APPROVED-LEAD PRICE IS APPROVED TO BECOME $8 — ONE COORDINATED MIGRATION, NEVER A PARTIAL ONE (2… | RULE | 💵 | 26 Aug |  |
| INV-0256 | 15 · THE 19 AUGUST RULINGS | R69 | THE FORECAST IS TO A BOOKED MEETING, NOT TO A SALE — ~150 ACCEPTED PROSPECTS PER BOOKED MEETING, AND IT IS A P… | RULE | 🎯 | 26 Aug |  |
| INV-0257 | 15 · THE 19 AUGUST RULINGS | R70 | THE DOOR COMES BEFORE THE INTERVIEW — ACCOUNT FIRST, MILLA OWNS THE DISCOVERY (24–25 Aug). Order of entry: aut… | RULE | 🚪 | 25 Aug |  |
| INV-0258 | 15 · THE 19 AUGUST RULINGS | R71 | MILLA KNOWS WHAT SHE KNOWS — KNOWN · MISSING · CONTRADICTORY, AND SHE NEVER GUESSES TO FILL A GAP (25 Aug). Mi… | RULE | 🧠 | 25 Aug |  |
| INV-0259 | 15 · THE 19 AUGUST RULINGS | R72 | PROOF PROVES FIT, AND PROOF IS NOT ACTIVATION (25 Aug). ① Free proof proves TARGETING FIT, not deliverability … | RULE | 🎁 | 25 Aug |  |
| INV-0260 | 15 · THE 19 AUGUST RULINGS | R73 | K.I.N.D-OWNED DATA — INCLUDING APOLLO-ACQUIRED — MAY FEED THE SHARED POOL (27 Aug). The founder's ruling, verb… | RULE | 🏊 | 27 Aug |  |
| INV-0261 | 15 · THE 19 AUGUST RULINGS | R74 | THE PROGRAMME COMMERCIAL MODEL — CURRENT FOUNDER-APPROVED PRODUCT/COMMERCIAL DIRECTION, UNIMPLEMENTED (27 Aug)… | RULE | 💰 | 27 Aug |  |
| INV-0262 | 15 · THE 19 AUGUST RULINGS | R75 | NO MATERIAL FOUNDER IDEA OR DECISION MAY EXIST ONLY IN CHAT (27 Aug). Every material idea, direction or decisi… | RULE | 🗂️ | 27 Aug |  |
| INV-0263 | 5a · THE CLAUSE TABLE | (none) | The CLAUSE TABLE is a REQUIRED ARTIFACT, not a promise | GATE | (none) | 26 Jul | Missing from the PR = sent back without reading a line of code |
| INV-0264 | 5a · THE CLAUSE TABLE | (none) | The 6-clause pasted template the founder puts before a work prompt | OPERATING | (none) | 26 Jul | READ-DON'T-GREP · TABLE FIRST · REPORT AGAINST IT · ❌ FIRST LINE · NEVER DONE WITHOUT IT · NOT-POSSIBLE |
| INV-0265 | 5a · THE CLAUSE TABLE | (none) | The two clauses that were earned, not designed (clause 2 and clause 4) | HISTORY | (none) | 26 Jul | Prompt 4 reported complete while nothing called it |
| INV-0266 | 11 · REPORTING | (none) | THE SAVED PROMPT (RPT4) — the founder pastes exactly this for a standings report | OPERATING | LOCKED FORMAT | founder-locked 6 Aug |  |
| INV-0267 | Open — the founder has not ruled on these | (none) | Paystack — RULED 27 Jul: remove | QUESTION | ~~struck~~ RULED | 27 Jul | Removed (#352); saved auto_topup prefs and billing history kept |
| INV-0268 | Open — the founder has not ruled on these | (none) | C5 seat removal delete-or-deactivate — RULED 6 Aug: deactivate only | QUESTION | ~~struck~~ RULED | 6 Aug | See §7 A5 |
| INV-0269 | Open — the founder has not ruled on these | (none) | D4 refresh staging or keep previewing from branches — RULED 6 Aug: refresh | QUESTION | ~~struck~~ RULED | 6 Aug |  |
| INV-0270 | Open — the founder has not ruled on these | (none) | The three security holes in disabled agent routes (#359, #369, #360) — delete or keep disabled? | QUESTION | OPEN | (none) |  |
| INV-0271 | Open — the founder has not ruled on these | (none) | #549 the dogfooding item — retire, or pay for HyperGrowth to dogfood? | QUESTION | OPEN | (none) | Agent recommendation: retire after launch, keep code parked |
| INV-0272 | Open — the founder has not ruled on these | (none) | Does VAT evidence gate anything BEYOND onboarding? (#615) | QUESTION | OPEN | (none) | Deliberately not taken in code |
| INV-0273 | Open — the founder has not ruled on these | (none) | Is 50 the right lead-desk window, or should the panel page? (#570) | QUESTION | OPEN | (none) | "a founder call, not code" — the only thing keeping that row 🟡 |
| INV-0274 | Open — the founder has not ruled on these | (none) | The share-link generator (#560) — retiring would break links clients already sent | QUESTION | OPEN | (none) |  |
| INV-0275 | Open — the founder has not ruled on these | (none) | A paid PDL plan (#444) — RULED 12 Aug (R26): the $98/mo tier | QUESTION | ~~struck~~ RULED | 12 Aug |  |
| INV-0276 | Open — the founder has not ruled on these | (none) | Instantly Growth mailbox cap — UNVERIFIED, our own 26-Jul research note | QUESTION | UNVERIFIED | (none) | One founder glance before client #1 |
| INV-0277 | Open — the founder has not ruled on these | (none) | Where this page lives — merge into RULEBOOK.md or stand alone? | QUESTION | OPEN | (none) |  |
| INV-0278 | Footer | (none) | Approved by the founder 26 Jul ("its good. i agree"); updated 27 Jul | HISTORY | (none) | 26–27 Jul |  |

---

# docs/LAUNCH-PAD.md — launch-current execution

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-0279 | Header | (none) | This page is a LIST, not a book | OPERATING | (none) | founder, 21 Aug | "i cant read 60 000 words in 5 minutes" |
| INV-0280 | Header | (none) | Board mirror: 🟢106 · 🩷308 · 🟣2 · 🟡51 · 🔴187 · ⏸6 · Σ660 | OPERATING | script-counted | (none) | Live count: scripts/count-inventory.sh |
| INV-0281 | 🛑 THE 25TH CUT — the only work between here and live | C1 | Google Calendar runbook steps 3–5 — test connection · Search Console TXT · submit · add clien… | TASK | 🧍 · now | (none) |  |
| INV-0282 | 🛑 THE 25TH CUT — the only work between here and live | C2 | Docs reconciliation — ✅ done, PR #1428 | TASK | 🤖 · ✅ | (none) |  |
| INV-0283 | 🛑 THE 25TH CUT — the only work between here and live | C3 | J3 money walk + A9 — the $4 seen moving on screen · one clean fresh signup | TASK | 🧍 · pre-25 | (none) |  |
| INV-0284 | 🛑 THE 25TH CUT — the only work between here and live | C4 | A10 — Instantly glance · Google ~$28 charge · reconcile the #198 25-vs-30 drift | TASK | 🧍 · Sun/Mon 24 | (none) |  |
| INV-0285 | 🛑 THE 25TH CUT — the only work between here and live | C5 | B2 — company-cost lines checked in a real browser | TASK | 🧍 · pre-25 | (none) |  |
| INV-0286 | 🛑 THE 25TH CUT — the only work between here and live | C6 | 🤝 Partner pre-live — H31 lifetime-clause wording · W1 partner walk, one sitting | TASK | 🧍 · pre-25 | (none) |  |
| INV-0287 | 🛑 THE 25TH CUT — the only work between here and live | C7 | W18 counsel booked · PDL Order Form found | TASK | 🧍 · pre-25 | (none) |  |
| INV-0288 | 🛑 THE 25TH CUT — the only work between here and live | C8 | ⏳ Triggered — A22 unlock pair · A23 pool-first proof · P15/P16 on counsel's word | TASK | 🧍 · on trigger | (none) |  |
| INV-0289 | 🛑 THE 25TH CUT — the only work between here and live | C9 | A14 — SEND DAY: execute [SEND-DAY-RUNBOOK.md](./SEND-DAY-RUNBOOK.md), alone | TASK | 🧍 · 25 Aug | (none) |  |
| INV-0290 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T1 | PASS 1 IS NOT COMPLETE — do not mark it green on the 25 Aug live attempt. That run reserved 20 … | TASK | 🤖 · Wed | (none) |  |
| INV-0291 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T2 | PASS 2 IS NOT COMPLETE — required journey end to end: pass 1 → refinement → exact pass-2 search… | TASK | 🤖 · Wed | (none) |  |
| INV-0292 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T3 | PROOF TERMINAL STATE — BUILT 26 Aug (partial). The desk decided *"still finding"* from a URL fl… | TASK | 🤖 · ✅ | (none) |  |
| INV-0293 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T4 | SAFE TESTING ONLY (R66) — BUILT 26 Aug. SAFE_TEST_MODE=1 makes every paid provider call throw a… | TASK | 🤖 · ✅ | (none) |  |
| INV-0294 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T5 | ACQUISITION RETENTION (R67) — BUILT 26 Aug. acquisition_memory retains every paid identity befo… | TASK | 🤖 · ✅ code | (none) |  |
| INV-0295 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T6 | BOUNDARIES RE-VERIFIED — payment, reveal, K.I.N.D GO and the send ladder all stay downstream … | TASK | 🤖/🧍 · Wed–Thu | (none) |  |
| INV-0296 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T7 | #553 OWN-LEAD SEND LADDER → controlled GO | TASK | 🧍 · Thu | (none) |  |
| INV-0297 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T8 | COMMERCIAL PACK FOR FRIDAY — worst-case CAC · per-client unit economics · 5-clients/month scena… | TASK | 🤖/🧍 · Thu, COB | (none) |  |
| INV-0298 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T9 | $4 → $8 RECURRING LEAD PRICE — ONE COORDINATED MIGRATION (R68). ⛓️ 27 AUG — SUPERSEDED FUTURE D… | TASK | 🤖 · this week | (none) |  |
| INV-0299 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T10 | PROOF RUNTIME FAILURE — THE WHOLE PATH, NOT A SEGMENT (FI-10). It has failed more than once, … | TASK | 🤖 · Open | (none) |  |
| INV-0300 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T11 | THE CONTROLLED EXIT FROM ZERO-SPEND (FI-11). PAID_PROVIDERS_ENABLED stays OFF for all safe pr… | TASK | 🧍 · Before first real test | (none) |  |
| INV-0301 | 🔴 25 AUG — THE PROOF JOURNEY IS NOT DONE, AND THIS IS THE PLAN TO FINISH IT | T12 | PRE-LAUNCH CLEANUP — AUDIT BEFORE DELETE (FI-12). Production must start clean of fake/test ac… | TASK | 🧍 · Before live | (none) |  |
| INV-0302 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M1 | Worst-case client acquisition cost on conservative outbound run rates, response/conversion rate… | QUESTION | 🤖 | (none) |  |
| INV-0303 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M2 | Per-client economics — $299 · first 100 approved included · $4 after · provider/data cost · mai… | QUESTION | 🤖 | (none) |  |
| INV-0304 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M3 | 5 new clients per month planning scenario | QUESTION | 🤖 | (none) |  |
| INV-0305 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M4 | Partner channel — economics where a partner introduces and scales clients without K.I.N.D runni… | QUESTION | 🤖 | (none) |  |
| INV-0306 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M5 | Pricing-model review — $299 + $4/approved-lead against real unit economics, margin, value perce… | QUESTION | 🤖 | (none) |  |
| INV-0307 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M6 | Willingness-to-pay / value perception research | QUESTION | 🤖 | (none) |  |
| INV-0308 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M7 | RECORDS-PER-APPROVAL SENSITIVITY — run M2 at 1.5 · 3 · 7, not at one number. Every per-client f… | QUESTION | 🤖 | (none) |  |
| INV-0309 | 💰 BEFORE FRIDAY'S PARTNER MEETING — the commercial pack | M8 | RESOLVE THE CLIENT-SENDER COST MODEL BEFORE M2 IS PRESENTED — the two docs disagree; see the ⚠️… | QUESTION | 🤖 | (none) |  |
| INV-0310 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F1 | pdl_cursor retry — can a retried sourcing run charge twice? | QUESTION | (none) | (none) |  |
| INV-0311 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F2 | Does an opt-out stop us re-SCORING that person, or only stop the sends? (GDPR Art. 21) | QUESTION | (none) | (none) |  |
| INV-0312 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F3 | Booking path: timezone-mismatch behaviour still unverified (the rest was line-read and proved l… | QUESTION | (none) | (none) |  |
| INV-0313 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F4 | pending-migrations.ts header claims the Supabase dashboard cannot be opened — no longer true | QUESTION | (none) | (none) |  |
| INV-0314 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F5 | Residency — is aws-0-eu-west-1 the only place client data lives? (backups · PITR · vendor sub-r… | QUESTION | (none) | (none) |  |
| INV-0315 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F9 | opted_back_in_at applied to 10 of 13 blocklist probes — fails closed, but inconsistent | QUESTION | (none) | (none) |  |
| INV-0316 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F10 | suppressOptOut writes a normalised blocklist row but updates leads with the raw address | QUESTION | (none) | (none) |  |
| INV-0317 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F11 | figsy.ts:463 drops a read error on the on-reply path — an unreadable campaign keeps sending | QUESTION | (none) | (none) |  |
| INV-0318 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F12 | Nothing refuses a secret that is obviously not a secret (UNSUBSCRIBE_SECRET held a sentence) | QUESTION | (none) | (none) |  |
| INV-0319 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F13 | PDL licence — cross-client reuse unconfirmed against the Order Form (counsel, W18) | QUESTION | (none) | (none) |  |
| INV-0320 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F15 | Apollo terms — no Apollo-sourced record delivered to any paying client without a written right | QUESTION | (none) | (none) |  |
| INV-0321 | 🔮 OPEN QUESTIONS FOR FABLE — one line each, cleared Wednesdays | F17 | Does any compliance document still rest on the SA precondition R45 invented? | QUESTION | (none) | (none) |  |
| INV-0322 | 📌 THE RULES THAT GOVERN THIS PAGE | R57 | 25 Aug is unconditional — nothing moves the date | RULE | (none) | (none) |  |
| INV-0323 | 📌 THE RULES THAT GOVERN THIS PAGE | R65 | Pause is the default · silence is never a go · not-live-aiding → V2 · LAUNCH-PAD updated in the… | RULE | (none) | (none) |  |
| INV-0324 | 📌 THE RULES THAT GOVERN THIS PAGE | R64 | Prove which route renders a surface before building into it (scripts/dead-surfaces.sh) | RULE | (none) | (none) |  |
| INV-0325 | 📌 THE RULES THAT GOVERN THIS PAGE | R62 | The product keeps UK time — Europe/London | RULE | (none) | (none) |  |
| INV-0326 | 📌 THE RULES THAT GOVERN THIS PAGE | §11 | Client-facing work is previewed first — the founder approves 🟣 before it goes live | RULE | (none) | (none) |  |
| INV-0327 | 📌 THE RULES THAT GOVERN THIS PAGE | O3 | No ad-hoc SQL — migrations run from Vida → Engine only | RULE | (none) | (none) |  |
| INV-0328 | THE 25TH CUT | C2b | Canonical truth — outside audit found the canonical layer contradicting itself | TASK | ✅ (⛓️ CORRECTED 25 Aug — MERGED) | 25 Aug | #1428/#1429/#1430 all in origin/main |
| INV-0329 | THE 25TH CUT | C2c | AR5 provider boundary (#699) — four live doors chose provider by which API keys existed | TASK | ✅ (⛓️ CORRECTED 25 Aug — MERGED) | 25 Aug | Three GPT-5.6 review rounds recorded |
| INV-0330 | THE 25TH CUT | C2d | Launch coherence (#700) — five approved items | TASK | ✅ code · ⏳ dot | 25 Aug | Merged as PR #1438; item #700 still 🟡 — the flip is the founder's |
| INV-0331 | THE 25TH CUT | (none) | Everything else is post-live → V2-TRACKER § THE 25TH CUT — PARKED POST-LIVE | RULE | (none) | 21 Aug |  |
| INV-0332 | 25 AUG — THE PROOF JOURNEY | (none) | Tuesday is plan-lock and document reconciliation only — no engineering, no paid testing | RULE | (none) | 25 Aug |  |
| INV-0333 | BEFORE FRIDAY'S PARTNER MEETING | (none) | Known costs used as known; every assumption labelled; no invented cost presented as fact | RULE | (none) | (none) |  |
| INV-0334 | BEFORE FRIDAY'S PARTNER MEETING | (none) | SCOPE OF THIS PACK — the Founder OS is deliberately NOT in it | RULE | ⚠️ excluded deliberately | (none) | V2-TRACKER §1 is post-launch operating work |
| INV-0335 | THE FACTS THAT MUST NOT DRIFT | fact 1 | Cost floor is $352/mo all-in — $146 platform + $206 company | MONEY | guarded by cost-floor-drift.test.ts | (none) | Model of record: CASHFLOW-LAB.html |
| INV-0336 | THE FACTS THAT MUST NOT DRIFT | A12 | Failover teardown ($12/mo back) — DNS repoint FIRST, then tear down | TASK | guarded by cost-floor-drift.test.ts | (none) | Getting the order backwards breaks production |
| INV-0337 | OPEN QUESTIONS FOR FABLE | (none) | Closed: F6 · F7 · F8 · F14 · F16 | QUESTION | Closed | (none) | Detail in KIND-MASTER session log |
| INV-0338 | Footer | (none) | Dates live in git — this page carries no "last updated" stamp by design | OPERATING | (none) | (none) |  |

---

# docs/PRODUCT-INVENTORY.md — the status board

> **Reconciliation of this section against the script-counted board.** 680 item rows are listed: **660 counted** (matching the `<!-- BOARD: … Σ660 -->` marker exactly) · **6 uncounted pointer rows** kept only for their stable IDs (#24, #25, #27, #55c, #108b, #136) · **14 🪦 tombstoned rows** below the `COUNT:END` marker. The two board-summary table rows are not items and are excluded.

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-0339 | Header | (none) | GROUPED BY AGENT — the 9-Jul FIGSY-only / family-frozen lock is retired | ARCHITECTURE | founder-locked | 21 Jul | Filed under FIGSY · MILLA · VIDA; dots unchanged by the regrouping |
| INV-0340 | Header | (none) | WHAT WE SELL — a managed cold-outreach service trading as Milla&Vida | ARCHITECTURE | ⛓️ corrected | 21 Aug | Client approves in Milla, we operate in Vida, FIGSY is the engine — not a product a client buys |
| INV-0341 | Header | (none) | The money: $299 onboarding pack, first 100 approvals included, then $4 per approved lead | MONEY | LIVE | PR1, 3 Aug, #609 | Coaching (P2) and full SaaS (P3) remain future products |
| INV-0342 | STATUS BOARD | (none) | Script-counted board — 🟢106 · 🩷308 · 🟣2 · 🟡51 · 🔴187 · ⏸6 · Σ660 | GATE | do NOT hand-edit | (none) | Generated by scripts/count-inventory.sh; --check verifies |
| INV-0343 | The ladder | (none) | One dot per item — 🔴 → 🟡 → 🟣 → 🩷 → 🟢, ⏸ = a 🔴 blocked on something | GATE | (none) | (none) | Iron rule: nothing is 🟢 until walked live in production |
| INV-0344 | The ladder | (none) | Numbers are stable IDs, not sequence — links from other docs depend on them | RULE | (none) | (none) | Owner = who owns the next step: 🧍 founder · 🤖 Claude · 🤝 both |
| INV-0345 | FOUR-DOC CONTRACT | (none) | Status truth lives here, nowhere else; money model of record is CASHFLOW-LAB.html | RULE | (none) | #556 | BUILD-STATUS.md was a fifth status doc and is RETIRED (#555) |
| INV-0346 | THE ONE THING BLOCKING REVENUE | (none) | A paying client still cannot be delivered end to end | DEFECT | reconciled 21 Aug | 21 Aug | #211 🔴 parent; #549 🔴 · #550 🟡 · #553 🔴; AUTO_OUTREACH_ENABLED OFF (S2) |
| INV-0347 | THE ONE THING BLOCKING REVENUE | (none) | The 26-Jul ARCHITECTURE description is superseded and both its claims are now false in code | HISTORY | ⛓️ superseded | 21 Aug | #547/#548/#551/#552 all 🩷 |
| INV-0348 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #477 | [ENGINE · Day 1] Scoring crash-path fake-score fix — scoring.ts:166 catch stamps a fake 50/$5,0… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0349 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #478 | [PORTAL · Day 1] Showroom strip (honesty) — hide/relabel the surfaces that oversell: MCP canned… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0350 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #479 | [ENGINE · Day 1] Referral share-link fix — link points at app root but credit only captures on … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0351 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #480 | [ENGINE · Day 1] Lifecycle-email master switch — ~12 daily client cron emails gate only on RESE… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0352 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #481 | [ENGINE · Day 1] Client-Zero self-outreach → PDL — the weekly /cmo/self-outreach job calls dead… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0353 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #482 | [WEBSITE · Days 2–4] Milla&Vida rebrand — re-skin the existing site framework: homepage story (… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0354 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #483 | [VIDA · Days 5–9] Client-picker context — operator selects any managed client and drives their … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0355 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #484 | [VIDA · Days 5–9] Pipeline board — Sourced → Needs approval → Sending → Replied → Qualified·$4,… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0356 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #485 | [VIDA · Days 5–9] Nervous-system dropdown — fold the admin cockpit (Cockpit/Money Path/Revenue/… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0357 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #486 | [VIDA · Days 5–9] Operator identity + audit log — replace the single shared admin key with per-… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0358 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #487 | [ENGINE · Days 5–9] Approve-gated reveal ($4 trigger) — leads stay masked (no email, no charge)… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0359 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #488 | [MILLA · Days 10–13] Lead desk — masked lead cards + 👍 approve-to-pursue / ✕ not-a-fit, on the … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0360 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #489 | [MILLA · Days 10–13] Concierge chat — Milla chat (re-skin of the existing ICP-builder chat; un-… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0361 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #490 | [MILLA · Days 10–13] Nav declutter — left rail is workspace-only (New leads/Meetings/My campaig… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0362 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #491 | [VIDA · post-14-days] Per-cron failure alerting — audit gap: all 25 cron jobs die silently if a… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0363 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #492 | [ENGINE] ONE WALLET / WORK MODEL (founder-locked 24 Jul — supersedes the 23-Jul re-time) — a si… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0364 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #493 | [VIDA · Days 10–13] Strip operator-spend + Booked column — delete Vida's "Approve — $4" (operat… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0365 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #494 | [ENGINE/VIDA · post-14-days] Qualification gate — explicit operator "mark qualified" human step… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0366 | 🆕 MILLA&VIDA PIVOT — the 14-day build (22 Jul · #477–#491) | #495 | [ENGINE · post-14-days] ICP versioning — ICP changes become versions (v1/v2…) with history; cam… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0367 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #520 | [BOTH · A1] Brand is the way home — top-left Milla&Vida is a link back to the main screen in bo… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0368 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #521 | [VIDA · V1] The onboarding checklist IS the setup guide — each gap is a door: click it and land… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0369 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #522 | [VIDA · V2] Build / refine the ICP by conversation — POST /operator/icp/chat, seeded with the c… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0370 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #523 | [VIDA · V3] "Ask them for these" actually reaches Milla — POST /operator/ask writes into the cl… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0371 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #524 | [VIDA · V4] Multi-select people — GET /operator/people returns the whole pool (masked emails st… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0372 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #525 | [VIDA · V5] Assign the PICKED people — POST /operator/campaign/:id/assign, prepaid so assigning… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0373 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #526 | [VIDA · V6] AI proposes the campaign, the operator approves — /operator/campaign/suggest (deter… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0374 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #527 | [VIDA · V7a] Edit the campaign — name, the brief every email is written from, daily cap (clampe… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0375 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #515 | [MILLA] Passwordless sign-in — magic link + SMS — the last unbuilt Milla item. | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0376 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #546 | [AUDIT] Both consoles told the truth about themselves — a full audit found the product contradi… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0377 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #545 | [MILLA] The client's own messages reach an operator — Milla's chat mutates nothing (verified: z… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0378 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #544 | [DEMO] MBF — the demo account, one fixed cast — *"5 demos = 1 sale"*, so the stage must never m… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0379 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #543 | [MONEY] Cold clients — 30 days with no approvals suspends them — *"we're not a free service."* … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0380 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #542 | [MONEY] The minimum-20 gate — the cashflow model made it concrete: a client's inbox costs ~$40/… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0381 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #541 | [MONEY] The $99 onboarding pack — 100 leads included, then $4 — (founder-locked 25 Jul, after w… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0382 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #540 | [VIDA v2] The console opens on the step, not the objects — Vida had eight tabs for a five-actio… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0383 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #538 | [VIDA · V7b] Send window + A/B subjects — the punch list's V7 also names *send days/hours* and … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0384 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #528 | [VIDA · V8] Auto-Pilot / Co-Pilot — Co-Pilot writes approve_before_send, so every email stops a… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0385 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #529 | [VIDA · V9] AI proposes the sequence, the operator approves — /operator/sequence/suggest drafts… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0386 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #530 | [VIDA · V11] Preview the sequence as the prospect reads it — GET /operator/sequence/:id/preview… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0387 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #531 | [VIDA · V12] Test email — POST /operator/campaign/:id/test: read step 1 exactly as it will send… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0388 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #532 | [VIDA · V13] Run it / pause it — from the campaign row. | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0389 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #533 | [VIDA · V14] Who's in this campaign — GET /operator/campaign/:id/enrollments: every enrolled pe… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0390 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #534 | [VIDA · V17] The bell — GET /operator/alerts, derived live from real rows (no notifications tab… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0391 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #535 | [MILLA · M2] The client answers our asks — the Milla thread now persists across visits, so an a… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0392 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #536 | [MILLA · M4] The client revises their ICP by conversation — POST /icps/revise supersedes the cu… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0393 | 🚀 THE LAUNCH PATH (25 Jul flow walk — founder-locked · #520–#537) | #537 | [MILLA · M5] The client SEES the sequence, read-only — every email we send in their name, on "M… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0394 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #547 | [ENGINE · A1] The send path resolves the account's own inbox — or does not send — the FROM modu… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0395 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #548 | [ENGINE · A2] A transport that can send AS a client mailbox — the physical gap behind #547: Res… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0396 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #549 | [ENGINE · A3] Instantly = OUR outreach, run INSIDE the product — Client Zero. ⛓️ "* This supers… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0397 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #599 | [ENGINE · A3a] Prospects can get INTO the product — operator CSV import — *(30 Jul, built for C… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0398 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #600 | [ENGINE · A3b] Client Zero is set up entirely through Vida — no SQL, because there is no SQL ed… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0399 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #550 | [ENGINE · A4] Smartlead = CLIENT sending, assigned per client — lib/smartlead.ts verifies a key… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0400 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #551 | [ENGINE · A5] Replies land back against the right inbox — every reply today arrives through one… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0401 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #552 | [VIDA · A6] Mailbox details go IN, and the board says who can actually send — the founder hit t… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0402 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #553 | [SAFETY · A7] First-send ladder before the kill-switch flips — AUTO_OUTREACH_ENABLED is OFF and… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0403 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #554 | [SECURITY] RLS policies have never been audited — seven migration files touch row-level securit… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0404 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #555 | [DOCS] BUILD-STATUS.md retired — it was a fifth status doc, and it was wrong — its summary read… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0405 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #556 | [DOCS] The cashflow model is canonical and in the repo — docs/CASHFLOW-LAB.html (founder-locked… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0406 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #557 | [DOCS] Stale flow + preview docs stamped, not silently deleted — four docs describe a product t… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0407 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #558 | [MIGRATIONS] The repo's migrations no longer describe the live database — the live credit_trans… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0408 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #559 | [SELL] The nine screens, walked and rehearsed against MBF — *"5 demos = 1 sale"*, so the stage … | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0409 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #573 | [MEASURE · 1 of 4] THE CORE MAP — the 90k-line problem, fenced not deleted — *(founder-locked 2… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0410 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #574 | [MEASURE · 2 of 4] THE GATE — a broken build cannot be deployed — there is no CI (GitHub Action… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0411 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #578 | [MEASURE] The gate found a real fault on its FIRST run — on the founder's Mac, not ours — *(26 … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0412 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #579 | [MEASURE] Third instance of the same bug shape — a doc check that reported OK without ever runn… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0413 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #598 | [PROMPT 5 → FIXES] THE SIX THE FULL AUDIT FOUND — all fixed, all proven red first — *(prompt 5 … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0414 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #597 | [P3-1] EVERY ERROR IN THE VIDA COCKPIT RENDERED AS A SUCCESS — fifteen of them, not one — *(fou… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0415 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #596 | [P2-2] THE ALERT BLAMED THE PROSPECT WHEN THE FAILURE WAS OURS — *(found by reading figsy.ts 19… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0416 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #595 | [P2-1] THE AI CLASSIFIER WAS INSIDE THE PER-CLIENT LOOP — I put it there fixing R1 | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0417 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #594 | [RULES] THE CLAUSE TABLE — the discipline that catches what grep never can, made a REQUIRED ART… | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0418 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #593 | [PROMPT 4] INSTANTLY DRIVES OUR OWN OUTREACH — code-complete, and BLOCKED on Instantly's billin… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0419 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #592 | [MEASURE] THE GATE WAS GREEN FOR A REASON THAT DID NOT REPRODUCE — caught on the founder's Mac,… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0420 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #591 | [PROMPT 3 · B of B — MILLA · CLIENT-FACING, preview first] THE SCREENS THAT TOLD A PAYING CLIEN… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0421 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #590 | [PROMPT 3 · A of B — VIDA] THE CONSOLE THAT LIED TWICE: a log that recorded the opposite, and a… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0422 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #589 | [PROMPT 2] THE REPLY CHAIN — five defects fixed once, in the spine EVERY provider will flow thr… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0423 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #588 | [BASELINE] EVERY INTEGRITY CHECK NOW IGNORES OUR OWN INVENTED DATA — one shared rule, not six p… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0424 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #587 | [BASELINE] THE DEMO WROTE VALUES THE PRODUCT NEVER WRITES — and a green test was ENFORCING one … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0425 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #586 | [BASELINE · fix 8 of 8] THE SYSTEM SCREEN REPORTED OUR OWN TEST DATA AS THE BUSINESS — *(founde… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0426 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #585 | [BASELINE · fix 1 of 8, part 2] THE DEMO REBUILD FAILED ON A COLUMN PRODUCTION DOES NOT HAVE — … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0427 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #584 | [BASELINE · fix 1 of 8] THE DEMO ACCOUNT NO CONTROL IN VIDA COULD TOUCH — *(found by the first … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0428 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #583 | [RULES · founder-approved 26 Jul] THE PRODUCT RULES — one page, the non-negotiables, in the fou… | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0429 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #582 | [MEASURE] Prompt 1 re-audited clause by clause against its pasted text — SIX more gaps, includi… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0430 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #581 | [MEASURE] Fourth instance — and this one was caused by the fix for the first — *(26 Jul, found … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0431 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #580 | [MEASURE] Prompt 1 audited against its OWN spec — one thing never built, three answers that wer… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0432 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #575 | [MEASURE · 3 of 4] THE INTEGRITY CHECK — what the already-shipped bugs actually did, and to who… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0433 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #576 | [MEASURE · 4 of 4] THE SYSTEM SCREEN — everything live, both halves, one button | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0434 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #577 | [ARCHITECTURE · founder-locked 26 Jul] SENDING — our product gives the orders, the vendors driv… | FEATURE | 🟢 | (none) | Owner: 🧍 |
| INV-0435 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #562 | [MONEY · CRITICAL] The $99 is paid out TWICE — the pack AND the wallet — *(found 26 Jul by READ… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0436 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #563 | [MILLA] The money screen cannot tell the truth — it has no concept of the pack — billing/page.t… | FEATURE | 🟢 | (none) | Owner: 🤖 ✅ WALKED 🟢 12 Aug — FO |
| INV-0437 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #564 | [VIDA · CRITICAL] Run and Pause swallow refusals, and the audit log records the wrong action — … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0438 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #565 | [VIDA] A failed load reads as "nothing to do" — vida/page.tsx:617-622 fires status, alerts and … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0439 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #566 | [MONEY · CRITICAL] The $99 pack delivers NINETY-NINE free approvals, not 100 — *(found 26 Jul b… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0440 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #567 | [MONEY · CRITICAL] A repeat purchase sources NOBODY — the 200 is a lifetime cap, not a top-up —… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0441 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #568 | [MONEY · HIGH] Three swallowed writes on the approve path, each one "$4 taken, nothing delivere… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0442 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #569 | [MONEY · MED] A re-approve of a FREE pack lead tells the client "$4 charged" — approve-lead.ts:… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0443 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #570 | [MILLA] Four gaps on the client's own desk — *(found 26 Jul reading milla/page.tsx lines 1-254.… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0444 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #571 | [ENGINE] Two silent caps in sourcing — *(found 26 Jul reading start-work.ts end to end.)* ① :87… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0445 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #561 | [INFRA] The environment is undocumented — — 100 variables (headline corrected 1 Aug #606; the 6… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0446 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #560 | [SURFACE] Shrink the product to what we sell — still reachable and still unread: the website's … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0447 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #603 | [WEBSITE] NEXUS IS BACK ON THE SITE — and the reason it was pulled had to be fixed first — *(1 … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0448 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #604 | [WEBSITE] THE FULL SITE IS RESTORED — 28 pages, the pre-shrink nav and footer, founder order — … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0449 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #605 | [RULES] 🔒 THE WEBSITE IS FOUNDER-LOCKED — it does not change without his explicit command, and … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0450 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #606 | [DOCS] THE FOUNDER RULED ON THE AUDIT — all 48 decisions executed in one pass — *(1 Aug; the de… | FEATURE | 🟡 | (none) | Owner: 🤝 |
| INV-0451 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #607 | [ENGINE] THE TRIAL STATE IS RETIRED — and it was still emailing real people about it — *(1 Aug,… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0452 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #602 | [DOCS] THE DOC AUDIT — a report the founder rules on, not a purge — *(1 Aug; founder: "any prod… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0453 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #608 | [DOCS] THE DOC SYNC — the paper catches up to six days of shipped code ⛓️ Replaced; the superse… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0454 | 📮 THE SENDING SPINE — the reason we cannot onboard a paying client (26 | #609 | [MONEY · founder-locked 3 Aug] THE $299 SIGN-UP — the door stops costing the founder money — *(… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0455 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #2 | Milla — The Brain (Agent · coming soon) — code substantially built (mounted doc-RAG, DB-backed,… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0456 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #3 | Vida — The Host (Agent · coming soon) — inbound qualification. Functional chatbot built (captur… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0457 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #4 | Denise — The Closer (sales-action, reply→close) — built (mounted backend + live AI draft endpoi… | FEATURE | 🔴 | (none) | Owner: — |
| INV-0458 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #81 | AI Notetaker — OUT OF PLAY (coming-soon list; FIGSY + Lead-Gen only, locked 8 Jul; code parked … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0459 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #120 | FIGSY Memory v2 / pgvector (enabled on staging) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0460 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #139 | Intelligence cluster — contextual-bandit (4/5 already live) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0461 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #141 | Context-backed MCP server… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0462 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #143 | The Learning Engine (RAG → evals → feedback → bandit → memory → routing) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0463 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #150 | SCOPE CUT ON ARRIVAL: per-client ONLY. — The old title says "cross-client intelligence" — the N… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0464 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #152 | 3-type memory · visitor de-anon · churn scoring · call intelligence… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0465 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #210 | Call-coaching agent (Glean) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0466 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #144 | DENISE deep build (auto-book · notetaker · objections · voice) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0467 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #149 | Proposal e-sign · Zoom notetaker… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0468 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #362 | AR-24 HIGH · Vida no knowledge layer — sold "no hallucinations / your KB"; only name + freetext… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0469 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #1 | FIGSY — The Opener (AI SDR): finds leads, unique email/lead, follow-up — drafts replies (not au… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0470 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #5 | Conversational ICP Builder (AI-suggested ICP from chat) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0471 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #6 | Lead sourcing — PDL primary (keys set) + Hunter email-reveal; Apollo is an optional BYO-key cod… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0472 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #7 | AI lead scoring 0–100 (Claude) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0473 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #8 | Lead delivery drip + charge-on-delivery… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0474 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #9 | POPIA consent + opt-out blocklist (suppressed at all send paths) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0475 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #10 | Lead enrichment (single + waterfall, key-gated) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0476 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #11 | LinkedIn CSV import + scoring… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0477 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #12 | Lookalike leads… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0478 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #13 | Lead cross-links + real per-status stats… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0479 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #14 | Campaigns — create/activate/pause/resume/clone/delete… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0480 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #15 | Auto-Pilot / Co-Pilot modes — ⚠️ re-dotted 🟢→🩷 2 Jul (audit refuted the review-gate): the mode … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0481 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #16 | AI sequences, personalised + threaded (→ item 212) — cap = 10 steps (#426, locked 8 Jul) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0482 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #17 | Reply classification hot/warm/cold/opt-out (auto-pause on hot) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0483 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #18 | Inbox / replies view (current; rebuild = 112) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0484 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #19 | Mark-as-booked + KPI unify (meetings from real bookings) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0485 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #20 | Deliverability suite D1–D5 (List-Unsub, plain-text, cold-FROM, warmup ramp, auto-pause) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0486 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #21 | Warmup live + auto-pause hotfix… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0487 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #22 | Suggest Campaigns · FIGSY Chat · Kanban view… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0488 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #44 | Google Calendar booking + KPI — BUILT 22 Jul via Block 1.4 (#361b/#368, PRs #1101/#1103): googl… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0489 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #60 | R1 demo-bounce guard (skips synthetic demo mailboxes) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0490 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #66 | R7 Unibox "Help me reply" (Claude draft) | FEATURE | 🩷 | (none) | Owner: 🧍 walk ⛓️ LOCATION CORRE |
| INV-0491 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #68 | R9 "Why FIGSY wrote this" card… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0492 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #70 | R11 sequence-template library (one-click copy) — verified 30 Jun: copy works… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0493 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #76 | R17 spam-score pre-send check… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0494 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #77 | R18 multi-model toggle (Haiku/Sonnet per campaign) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0495 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #79 | R20 job-change alerts on leads… | FEATURE | 🔴 | (none) | Owner: 🧍 walk |
| INV-0496 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #82 | Visual Sequence Builder — walk 26 Jun: confirmed shell ("coming live #89"); REMOVED from live n… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0497 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #90 | Deliverability dashboard (redirects to Performance) — verified 30 Jun: legacy URL redirects to … | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0498 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #94 | PDL 2nd discovery source (parallel waterfall) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0499 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #95 | Hunter waterfall email enrichment… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0500 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #97 | A/B subject-testing backend (winner cron + variants) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0501 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #101 | D9 deliverability 10/10 (gated on reputation, 198) | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0502 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #103 | [OUR HUNTING — kept, founder 1 Aug] — *(Apollo is OUR lead source and is paid + in use; PDL + H… | FEATURE | ⏸ | (none) | Owner: 🧍 |
| INV-0503 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #104 | Hunter.io + PDL keys confirmed in Railway… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0504 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #111 | Per-rep / multi-provider calendars — *walk 30 Jun: per-rep calendar architecture confirmed (eac… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0505 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #112 | Unibox inbox rebuild (Alta-style) — *walk 26 Jun: founder unsure (no live reply to test); verif… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0506 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #113 | A/B subject-testing UI (campaign A/B tab) — verified 30 Jun: tab loads, A auto-generated per le… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0507 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #113b | FIGSY auto-generates A/B variant suggestions — "Generate variants" button inside the A/B tab: F… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0508 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #114 | Kanban pipeline — verified 30 Jun: real cards load, drag-to-Replied/Completed marks via PATCH e… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0509 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #127 | 10 warm outreach · LinkedIn 1/day · PhantomBuster — audit 26 Jun: the parked /dashboard/figsy/l… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0510 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #132 | Dogfood self-outreach · fresh-signup check… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0511 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #140 | Waterfall cluster — rest (adaptive volume · CRM pull · inbox rotation) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0512 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #153 | Score heatmap + timeline views… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0513 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #154 | Custom lead fields (jsonb) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0514 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #155 | Visual automation builder (React Flow) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0515 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #156 | Self-learning ICP ("narrow your ICP?") | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0516 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #157 | Personalised email images (Lemlist) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0517 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #166 | FIGSY double-charge killed (one wallet by clients.plan) — ⚠️ SUPERSEDED by #420/#394 (8 Jul): $… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0518 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #167 | FIGSY-only bundle can deliver (capped by plan pool) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0519 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #168 | 3 price tables reconciled (derive from @kind/shared) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0520 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #169 | clients.plan flag (migration + backfill) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0521 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #170 | Atomic FIGSY credit RPC (increment_figsy_credits) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0522 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #171 | "How credits work" panel honesty… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0523 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #179 | Shareable stakeholder pipeline view (public share token) — verified 30 Jun: "Copy share link" s… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0524 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #183 | Campaign kill-switch (pause-all panic button) — verified 30 Jun: "Pause all campaigns" pauses e… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0525 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #187 | Sequence/template → apply-to-campaign (email-first) — *walk 26 Jun: manual build+apply works; c… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0526 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #191 | ROI / value dashboard ("what KIND did for you") — walk-confirmed 26 Jun (the value screen, real… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0527 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #193 | Real open-tracking — pixel re-enabled 29 Jun (PR #814). TRACKING_URL set in Railway; trackingBa… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0528 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #194 | Deliverability content hardened (reputation fix = 198) | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0529 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #195 | FIGSY metrics — one source of truth (no drift) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0530 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #198 | Cold-email WARMUP — 4 Google mailboxes across 2 domains, warming in Instantly Growth. — jacques… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0531 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #208 | Recency-weighted hot-lead ranking + champion signal (Hypo) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0532 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #209 | Prospecting play-artifact + progress tracker (Hypo) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0533 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #211 | Per-client isolated + warmed sending engine — THE #1 gate for paid clients, and still 🔴 on 26 J… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0534 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #212 | 22-Jul Fable: code-verified fixed + deployed → 🩷 (walk owed). ⬆ M2→M0 (founder-locked 9 Jul: "i… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0535 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #229 | FIGSY voice-calling backend (mounted, dormant on Vapi key) — OUT OF PLAY (M4; FIGSY + Lead-Gen … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0536 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #240 | C6 — settings voice copy fixed (no longer claims auto day-4 calling) — DONE via T2a #754, walk … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0537 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #242 | [OUR HUNTING — kept, founder 1 Aug] — *(Apollo is OUR lead source and is paid + in use; PDL + H… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0538 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #243 | Apollo-independence — code SHIPPED 1 Jul — (PR #864): the main ICP run already fell back to PDL… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0539 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #244 | PDL/Hunter lead-source test diagnostic (SA 1,360 / US 71,123) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0540 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #247 | [OUR HUNTING — kept, founder 1 Aug] — *(Apollo is OUR lead source and is paid + in use; PDL + H… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0541 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #249 | Open-rate 0% → honest "n/a" — FIX BUILT 26 Jun (🔴→🟡, pending preview). — Root: cold sends carry… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0542 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #250 | FIGSY inbound webhook — BACKEND NOW BUILT (was a shell). — POST /figsy/webhook/enrol now exists… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0543 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #260 | Blocklist list scoped to caller's client — SHIPPED 1 Jul: — GET /leads/blocklist now derives cl… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0544 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #267 | Bounce handling — SHIPPED 1 Jul — (PR #863): Resend email.bounced/email.complained now suppress… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0545 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #268 | Approval-queue silent-fail — FIXED honest/fail-closed (6 Jul). — The approve route no longer ma… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0546 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #283 | M1 · Website $1 Lead-Gen retirement → single $3 FIGSY — LIVE (merged #883 = deployed to the liv… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0547 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #284 | M1+M2 · website↔product pricing mismatch — RESOLVED — (verified in code 6 Jul; was the Fable 2 … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0548 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #300 | FIGSY Tasks — live API, was undocumented — (3 Jul audit). | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0549 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #302 | 🐛 FIGSY enrol charge not idempotent — (3 Jul audit, figsy.ts autoEnrollLead ~986-1022) — no ide… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0550 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #310 | T2 · C1 — FIGSY outreach sends for $0 on the UI enroll path. — increment_figsy_credits + canEnr… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0551 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #311 | T2 · C5 — dead Resend key is invisible. — sendSequenceEmail (figsy.ts:449-495) writes the "sent… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0552 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #312 | T2 · Unsubscribe never suppressed (POPIA/legal). — Inbound handler acts only on classification=… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0553 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #320 | T3 · Send caps fair per-client — FIXED + MERGED (PR #960, 6 Jul; api deployed 6 Jul PM — 🩷 walk… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0554 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #326 | HIGH (client-facing → PREVIEW-FIRST) · Settings page no-op controls lie — (settings/page.tsx): … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0555 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #330 | SHIPPED live 7 Jul (PR #985) · M0 · Staging DB missing increment_figsy_credits — (Fable money a… | FEATURE | 🩷 | (none) | Owner: 🤖 +🧍 SQL run |
| INV-0556 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #331 | SHIPPED live 7 Jul (PR #985) · M0 · Drip never drains — free-trial client gets leads FOREVER — … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0557 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #332 | SHIPPED live 7 Jul (PR #985) · M0 · Fail-closed enrollment charging — chargeFigsyEnroll swallow… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0558 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #337 | SHIPPED live 7 Jul (PR #985) · M0 · Money-path sweep — ① uncharged enrollment insert (internal.… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0559 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #338 | 22-Jul Fable: code-verified fixed + deployed → 🩷 (walk owed). AR-01 CRITICAL · Phantom sends — … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0560 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #344 | 22-Jul Fable: code-verified fixed + deployed → 🩷 (walk owed). AR-07 CRITICAL · Kill-switch gap … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0561 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #345 | AR-08 CRITICAL · lookalike cross-tenant IDOR — body client_id trusted, no ownership check (rout… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0562 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #347 | 22-Jul Fable: code-verified fixed + deployed → 🩷 (walk owed). AR-10 CRITICAL · Approve-before-s… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0563 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #354 | AR-16 HIGH · Double-send — no atomic claim before send + no (enrollment_id,step) unique → same … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0564 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #356 | 22-Jul Fable: code-verified fixed + deployed → 🩷 (walk owed). AR-18 HIGH · Consent emails ungat… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0565 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #358 | AR-20 HIGH · Fake scores — Anthropic error → all leads score 50 + $5000 value, status='scored',… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0566 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #361 | CRITICAL · Calendar booking → M0 DIFFERENTIATOR — (moved M4→M0, founder-locked 8 Jul: *"FIGSY b… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0567 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #365 | AR-27 HIGH · Fake KPI injection — /figsy/replies/seed-demo fabricates a 'hot' reply into real s… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0568 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #366 | AR-29 · THE REPEAT-BUSINESS KILLER — one ICP only ever sees PAGE ONE of the data, forever. — *(… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0569 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #367 | AR-30 HIGH · Reveal-down silent zero-delivery — Hunter quota/key failure → 0 leads delivered, n… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0570 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #368 | HIGH · Calendar OAuth CSRF — (moved M4→M0 — ships with the #361b calendar-booking build) — stat… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0571 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #374 | AR-37 HIGH · Intent-signals wallet drain — unbounded auto-enroll on static attributes, no per-r… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0572 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #375 | AR-38 HIGH · Self-outreach dead sends — /cmo/self-outreach inserts + charges + cold-emails Apol… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0573 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #376 | AR-39 HIGH · Delivery overdraw — lead-gen credit decrement swallowed on failure + no SQL floor … | FEATURE | 🩷 | (none) | Owner: 🤖 ⛓️ FLIPPED 🟢 THEN REVE |
| INV-0574 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #383 | AR-45 MED · Missing send-counter RPC — increment_figsy_emails_sent exists in no schema → the ra… | FEATURE | 🟢 | (none) | Owner: 🤖 ⛓️ FLIPPED 🟢 THEN REVE |
| INV-0575 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #385 | AR-47 MED · $1/lead usage panel → NOW REAL (FLIPPED 8 Jul) — was "fake overage, delete it"; und… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0576 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #388 | AR-53 MED · LinkedIn limbo — PhantomBuster steps stuck approved forever on API error/unset key,… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0577 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #391 | AR-61 MED · Cron JSONB clobber — adaptive-send/ab-winner write {...settings} wholesale, racing … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0578 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #392 | AR-62 MED · AB resolves on zero data — first variant "wins" with no opens if TRACKING_URL unset… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0579 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #394 | AR-48 · $1 on site → RESTORE, don't remove (FLIPPED 8 Jul) — was "remove $1 residue"; under the… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0580 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #400 | AR-58 LOW · #337④ SA-name residue — "South African-sounding name" sign-off still in the prompts… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0581 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #403 | AR-66 HIGH · "FIGSY handles all replies autonomously" is FALSE — (3-question audit, 8 Jul) — th… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0582 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #413 | *(🔴→🟡 1 Aug, on PREVIEW; 🟣 when walked.)* PAPER MATCHES THE PRODUCT (1 Aug, #413/#410/#327 swep… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0583 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #414 | M0 HIGH · Stripe product description oversells at the point of payment — (8 Jul FIGSY audit) — … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0584 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #415 | M0 HIGH · FIGSY unit economics never rebuilt for PDL+Hunter @ $3 — (8 Jul FIGSY audit) — run-co… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0585 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #416 | M0 LOW · Pricing-card bullet "CRM deduplication & CSV export" overstates — (8 Jul FIGSY audit) … | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0586 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #426 | M0 HIGH · Enforce 10-step sequence cap — (founder-locked 8 Jul) — sequences are client-configur… | FEATURE | ⏸ | (none) | Owner: 🤖 |
| INV-0587 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #444 | SPRINT line-8 find · PDL sourcing resilience — (10 Jul — first live sourcing run returned ZERO … | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0588 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #445 | MONEY FENCES · sourcing pre-funded by collected cash — (founder-locked 10 Jul — the PDL-exposur… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0589 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #446 | Sourcing efficiency · ask-size = keep-size + preview cache — (part of #445). searchPeopleWithFa… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0590 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #447 | SPRINT 8a/PR2 · Portal onboarding + reveal push — (client-facing → PREVIEW FIRST). | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0591 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #449 | SPRINT 8a/PR3+PR4 · LEAD POOL — records become inventory (cross-client reuse) — . ⛓️ RETIRED 24… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0592 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #450 | [OUR HUNTING — kept, founder 1 Aug] — *(Apollo is OUR lead source and is paid + in use; PDL + H… | FEATURE | 🔴 | (none) | Owner: 🧍 key · 🤖 verify |
| INV-0593 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #451 | POST-SPRINT (founder-ruled 10 Jul: "not a stopper — after the sprint") · Execute Clearbit + enf… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0594 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #452 | SPRINT line 11 · MORE DISCOVERY ENGINES beyond PDL — (founder-ruled 10 Jul: critical, first-aft… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0595 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ THE BRAIN — redesignated from the agent era | #468 | 22-Jul Fable: code-verified fixed + deployed → 🩷 (walk owed). T2 · Unibox manual reply bypasses… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0596 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ Client-readiness fixes (21 Jul — 🩷 shipped #1085–#1090, live 22 Jul) | #470 | 22-Jul: merged + deployed → 🩷 (walk owed). PR-A — silent 0-lead sourcing surfaced. runIcpJob re… | FEATURE | 🩷 | (none) | Owner: 🤖 build · 🧍 merge |
| INV-0597 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ Client-readiness fixes (21 Jul — 🩷 shipped #1085–#1090, live 22 Jul) | #471 | 22-Jul: merged + deployed → 🩷 (walk owed). PR-B — out-of-credits on enrol made visible. enroll-… | FEATURE | 🩷 | (none) | Owner: 🤖 build · 🧍 merge |
| INV-0598 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ Client-readiness fixes (21 Jul — 🩷 shipped #1085–#1090, live 22 Jul) | #472 | 22-Jul: merged + deployed → 🩷 (walk owed). PR-C — hot replies email the founder (not just clien… | FEATURE | 🩷 | (none) | Owner: 🤖 build · 🧍 merge |
| INV-0599 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ Client-readiness fixes (21 Jul — 🩷 shipped #1085–#1090, live 22 Jul) | #473 | 22-Jul: merged + deployed → 🩷 (walk owed). PR-D (#377) — support escalation. "Talk to a human" … | FEATURE | 🩷 | (none) | Owner: 🤖 build · 🧍 merge ⛓️ FLI |
| INV-0600 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ Client-readiness fixes (21 Jul — 🩷 shipped #1085–#1090, live 22 Jul) | #474 | 22-Jul: merged + deployed → 🩷 (walk owed). PR-E (#468) — unibox manual reply respects the block… | FEATURE | 🩷 | (none) | Owner: 🤖 build · 🧍 merge |
| INV-0601 | ⚙️ FIGSY — THE ENGINE (does the heavy lifting · powers Milla & Vida) › ↳ Alta-parity gaps (21 Jul competitive teardown — 🔴 net-new, absent fr | #475 | VOICE / AI calling — the missing channel. — Alta's Katie cold-calls and Alex qualifies inbound … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0602 | 💜 MILLA — CLIENT PORTAL (what the client sees) | #74 | R15 Train-FIGSY knowledge (UI built; TRAINING_LIVE=false, saves noop) — *walk 26 Jun: honest "c… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0603 | 💜 MILLA — CLIENT PORTAL (what the client sees) | #151 | ISO 27001/42001 · SOC 2 · Vanta… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0604 | 💜 MILLA — CLIENT PORTAL (what the client sees) | #248 | Milla outputs — render fix — OUT OF PLAY (Milla; FIGSY + Lead-Gen only, locked 8 Jul; code park… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0605 | 💜 MILLA — CLIENT PORTAL (what the client sees) | #335 | SHIPPED live 7 Jul (PR #985) · M0 · FIGSY doesn't know the client's business — the sequence wri… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0606 | 💜 MILLA — CLIENT PORTAL (what the client sees) | #346 | AR-09 CRITICAL · #335 inert — knowledge-entry UI hard-disabled TRAINING_LIVE=false (portal know… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0607 | 💜 MILLA — CLIENT PORTAL (what the client sees) | #395 | AR-49 LOW · Milla mock UI — "✓ HubSpot synced ✓ Gmail connected" is a fabricated screenshot; no… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0608 | 💜 MILLA — CLIENT PORTAL (what the client sees) › ↳ DENISE — sales-action (reply→close) · absorbs into → MILLA | #58 | Denise $39 Stripe price — OUT OF PLAY (FIGSY + Lead-Gen only, locked 8 Jul; code parked M4; por… | FEATURE | 🔴 | (none) | Owner: 🧍… |
| INV-0609 | 💜 MILLA — CLIENT PORTAL (what the client sees) › ↳ DENISE — sales-action (reply→close) · absorbs into → MILLA | #73 | R14 Meeting-Prep (Denise pre-call brief) — OUT OF PLAY (Denise; FIGSY + Lead-Gen only, locked 8… | FEATURE | 🩷 | (none) | Owner: 🧍… |
| INV-0610 | 💜 MILLA — CLIENT PORTAL (what the client sees) › ↳ DENISE — sales-action (reply→close) · absorbs into → MILLA | #188 | Denise enabled + seeded on demo account — OUT OF PLAY (Denise; FIGSY + Lead-Gen only, locked 8 … | FEATURE | 🩷 | (none) | Owner: 🧍… |
| INV-0611 | 💜 MILLA — CLIENT PORTAL (what the client sees) › ↳ DENISE — sales-action (reply→close) · absorbs into → MILLA | #301 | 🐛 Denise price conflict — $39/mo (portal) vs $99/mo (website denise.html:616/678) — , and Denis… | FEATURE | 🩷 | (none) | Owner: MILLA |
| INV-0612 | 💜 MILLA — CLIENT PORTAL (what the client sees) › ↳ DENISE — sales-action (reply→close) · absorbs into → MILLA | #396 | AR-50 LOW · Denise false claims — "trained on your closed-won deals" + "confirms booked meeting… | FEATURE | 🩷 | (none) | Owner: MILLA |
| INV-0613 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #62 | R3 Vida in-portal help bubble — OUT OF PLAY (Vida-branded; FIGSY + Lead-Gen only, locked 8 Jul;… | FEATURE | 🟢 | (none) | Owner: 🧍 |
| INV-0614 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #63 | R4 speed-to-lead (hot visitor → scored lead + Denise draft) — OUT OF PLAY (Denise path; FIGSY +… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0615 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #71 | R12 embeddable lead-capture forms → scored pipeline… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0616 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #96 | Voice (Vapi) + WhatsApp (code wired, dormant on keys) — OUT OF PLAY (M4; FIGSY + Lead-Gen only,… | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0617 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #128 | Meta/WhatsApp API application… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0618 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #165 | Visitor Intelligence tracking snippet (on 43/62 pages; de-anon deferred) | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0619 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #178 | Voice ("speak") chat widget (shell; Vapi parked) — audit 26 Jun: now shows a VISIBLE "Voice · c… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0620 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #205 | Branching-logic lead-capture forms (Notion) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0621 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #359 | AR-21 HIGH · WhatsApp webhook forgeable — no X-Hub-Signature-256 check (routes/whatsapp.ts:32) … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0622 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #360 | AR-22 HIGH · WhatsApp not multi-tenant — one global number via env (lib/whatsapp.ts:6); site se… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0623 | 🖥 VIDA — OPERATOR CONSOLE (we run the client's outbound) | #369 | AR-32 HIGH · Vapi webhook fail-open — signature skipped if secret unset + route returns 201 on … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0624 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #23 | Stripe — checkout, idempotent webhooks, price IDs — re-verified 29 Jun: credit purchase confirm… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0625 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #26 | Agent subscriptions (Vida $29 · Milla $49 · Denise $39) — OUT OF PLAY (must not be purchasable;… | FEATURE | 🟡 | (none) | Owner: — |
| INV-0626 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #28 | Usage tracking per client — *displays, but founder unsure it's calculating right → NOT verified… | FEATURE | 🩷 | (none) | Owner: 🧍 test |
| INV-0627 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #28b | CRITICAL real-money walk owed — prove lead usage deducts. — Code VERIFIED 30 Jun: prod DOES ded… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0628 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #29 | Admin OS — dark shell, key-protected (constant-time) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0629 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #30 | Clients list + per-client management… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0630 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #31 | Revenue + Cohorts + Analytics (MRR, retention, funnels) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0631 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #32 | Showcase Demo — GONE: the 12-Jul clean-slate purge (#456) deleted the showcase client + its ~60… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0632 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #33 | Compliance + Data-Moat + Scalability dashboards… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0633 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #34 | CMO (dogfood lead-gen) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0634 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #35 | Founder dashboard + Health + Status… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0635 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #36 | Launch checklist runbook… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0636 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #37 | Partners management (approve, sandbox, commissions) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0637 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #38 | Admin Unibox + Visitors + Messages… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0638 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #39 | Proposals + Order-forms + Terms-library… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0639 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #40 | Smoke-test + Seed + Docs viewer… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0640 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #41 | Supabase auth (signup, login, onboarding gate, RLS) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0641 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #42 | Partner Programme (apply→approve→sandbox→portal→commission) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0642 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #43 | CRM integration (HubSpot/Pipedrive dedup + deal push) — ⚠️ *flag 8 Jul: conflicts with #399 (po… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0643 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #45 | MCP server (find_leads · stats · suggest · milla_ask) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0644 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #46 | Developer API (key management + MCP guide) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0645 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #47 | Webhooks — Stripe/Resend/Vapi (signature-verified; *Flutterwave DELETED 6 Jul, #314*) — *the pl… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0646 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #48 | Outcome-event data floor (append-only log) — *table was missing on prod (fake-green caught 25 J… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0647 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #49 | Rate limiting (signup/demo/subscribe/unsubscribe) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0648 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #50 | Push notifications (hot-reply web push) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0649 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #51 | Failover (Render standby + Cloudflare LB) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0650 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #52 | Key rotations (Stripe secret + Supabase service-role) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0651 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #53 | Marketing site — 40+ pages… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0652 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #54 | Staging environment (isolated DB + banner) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0653 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #55 | Command Centre — verified 30 Jun on the demo company: loads with company KPIs + rep roll-up (re… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0654 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #55a | Company-Engine RLS — rep-data isolation API-enforced only (audit 30 Jun): companies/seat_credit… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0655 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #55d | Demo billing coherence — FIX BUILT 30 Jun (🔴→🟡, pending verify on a fresh demo): (1) /credits n… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0656 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #56 | Per-rep agent unlock (rolled-up bill) — OUT OF PLAY (sells non-FIGSY agents; FIGSY + Lead-Gen o… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0657 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #57 | Company payment system — Stripe → pool billing… | FEATURE | 🟡 | (none) | Owner: 🤝 |
| INV-0658 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #59 | Admin "Company demo" provisioning — verified 30 Jun: spun up a demo company (owner + 3 reps + l… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0659 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #61 | R2 daily client brief toggle (server-backed) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0660 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #64 | R5 milestone cards + partner badge… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0661 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #65 | R6 onboarding day-0/3/7 emails (paid clients) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0662 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #67 | R8 saved views (localStorage, per-browser) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0663 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #69 | R10 Goals (localStorage, per-browser) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0664 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #72 | R13 Cmd+K quick actions — verified 30 Jun: palette opens + jumps… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0665 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #75 | R16 internal evals harness (admin; reads real data) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0666 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #78 | R19 "What's New" feed — verified 30 Jun: renders, newest-first; works as designed (manual chang… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0667 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #78b | "What's New" feed — dates + auto-generate — add a date to each entry and auto-append a line on … | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0668 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #80 | Teams Hub — verified 30 Jun: overview loads, "Add member" lands on settings#team (fixed PR #828… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0669 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #80b | Teams Hub vs Command Centre overlap — a company owner sees TWO "team" surfaces: Teams Hub (/das… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0670 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #83 | Integrations Hub — verified 30 Jun: status list loads; Connect "coming soon" by design… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0671 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #84 | Signup + SSO buttons (built; gated off until OAuth registered, item 126) | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0672 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #85 | Shell — slim nav + agent switcher — verified 30 Jun: switches cleanly; no duplicate of current … | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0673 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #86 | Shell — profile dropdown account hub — verified 30 Jun: all account links work… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0674 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #87 | Shell — status bar — walk-confirmed 26 Jun (live status shows on every screen) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0675 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #88 | Activity feed standalone page — verified 30 Jun: loads (also lives as Home widget 116) | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0676 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #89 | Notification centre (bell) — walk-confirmed 26 Jun | FEATURE | 🟢 | (none) | Owner: — |
| INV-0677 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #91 | Mobile PWA icons + manifest — verified 30 Jun: installs to home screen + opens standalone… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0678 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #93 | Marketing: The Drop + Watch (The Drop live; Watch held) | FEATURE | 🟣 | (none) | Owner: 🤖 |
| INV-0679 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #98 | Offline flow docs (reference) | FEATURE | 🩷 | (none) | Owner: — |
| INV-0680 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #99 | /v2/* design mockups (design-source locked) | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0681 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #100 | Smoke Test 2 (manual pass/booking/billing/agents) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0682 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #102 | Legal pack #10–14 (ICO✅, LinkedIn✅; rest post-delivery) | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0683 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #106 | Rep invite email — verified 30 Jun: "Add a rep" → Invite produces a copy-paste invite link (Res… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0684 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #107 | Owner drill-down into a rep's pipeline/inbox — verified 30 Jun: Command Centre → click a rep ro… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0685 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #108 | Edit rep budget · deactivate/remove a rep — verified 30 Jun: edit + deactivate work *(credit-re… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0686 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #109 | Manager role + owner↔rep notifications — verified 30 Jun: "Make manager" promotes a rep to mana… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0687 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #110 | Per-rep lead routing + CRM dedup — verified 30 Jun: each rep owns a distinct lead book (9/14/18… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0688 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #113a | Agent side-panel — conversational, acts-in-place (5 agents) — OUT OF PLAY (multi-agent; FIGSY +… | FEATURE | 🟣 | (none) | Owner: 🤖 |
| INV-0689 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #115 | Configurable agent triggers (needs backend) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0690 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #116 | Activity feed → Home widget (walk-confirmed 25 Jun) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0691 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #117 | Subscribe-to-the-drop (on Drop content) | FEATURE | ⏸ | (none) | Owner: 🤖 |
| INV-0692 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #118 | Site nav/footer rewire (partial — Demo removed; Watch/Drop pending) | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0693 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #119 | Revenue Mission Control (confirm direction) | FEATURE | ⏸ | (none) | Owner: 🤝 |
| INV-0694 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #121 | Casey conversational onboarding V2 (voice/tone captured) — audit 26 Jun: the /dashboard/v2 demo… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0695 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #122 | Kill dead Vercel↔GitHub integration… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0696 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #123 | Failover parity · D&O+trademarks · demo-seed isolation… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0697 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #124 | Money-path tests (billing-rules.ts + 13 regression tests) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0698 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #125 | "Your AI Family" agents hub (4 agents + unlock) — OUT OF PLAY (contradicts FIGSY-only; FIGSY + … | FEATURE | 🟢 | (none) | Owner: — |
| INV-0699 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #126 | Social login — Google/MS OAuth registration (unblocks 84/181) | FEATURE | ⏸ | (none) | Owner: 🧍 |
| INV-0700 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #129 | Record product demo + Drop 01 video + onboarding Looms… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0701 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #130 | Homepage hero = real product loop (on item 129) | FEATURE | ⏸ | (none) | Owner: 🤖 |
| INV-0702 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #131 | GTM funnel instrumentation… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0703 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #133 | 2 design-partner slots → case study + logo… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0704 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #134 | 9:16 social cuts · YouTube channel… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0705 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #135 | Onboarding v2 emails · playbook email form… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0706 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #136a | Client invoicing + agreements — walk-confirmed 26 Jun (T&C+Privacy+DPA+acceptance record+invoic… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0707 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #137 | 90-day guarantee · Revenue Playbook · homepage numbers… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0708 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #138 | Influencer/community distribution… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0709 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #142 | Product Hunt · G2 listing… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0710 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #146 | Multi-agent orchestration + skill library… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0711 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #147 | Outcome pricing per meeting (gated ≥28% margin) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0712 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #148 | Mobile app · built-in CRM Kanban · pan-African design partners… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0713 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #158 | Voice-first morning brief (TTS) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0714 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #159 | Network benchmarks ("top 15%") | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0715 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #160 | White-label / agency channel… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0716 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #161 | MCP dev tier + directory listing… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0717 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #162 | Prompt Library (website Resources) — verified 30 Jun: renders + searchable… | FEATURE | 🟢 | (none) | Owner: 🧍 walk |
| INV-0718 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #163 | Product Videos hero refinement (held with Watch page) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0719 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #164 | Social footer links (build now, live when channels populated) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0720 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #172 | Multi-currency (client picks USD/GBP/ZAR) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0721 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #173 | Admin FIGSY credit visibility + top-up… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0722 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #174 | Onboarding — website → firmographics read (routing) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0723 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #175 | Onboarding — seat-based auto-routing (1 vs 2+ seats) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0724 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #177 | Company white-glove implementation flow… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0725 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #180 | Admin audit log (backend exists; no UI) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0726 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #181 | Enterprise SSO/SAML + SCIM provisioning… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0727 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #182 | Zapier / Make integration (built; migration unrun) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0728 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #184 | Public uptime/status page (built, ⚠️ unlinked from nav) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0729 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #185 | Outbound webhooks + public event API (built; migration unrun) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0730 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #186 | Record signup T&C acceptance (timestamp + IP) | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0731 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #189 | Google Workspace workaround (specifics TBD) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0732 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #190 | Save / pause / win-back flow — BUILT #769; migration RUN on prod 28 Jun → pause works end-to-en… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0733 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #192 | Onboarding activation tracking + nudges… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0734 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #196 | Sales/revenue ledger — auditable money-in, HMRC-reconcilable (USD) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0735 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #197 | Partner programme — unify refer+manage (20% acq + 5% retention) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0736 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #199 | Production monitoring + alerting (UptimeRobot/BetterStack) | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0737 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #200 | Seller-experience rework — one foundation, 3 surfaces (partner/AE/admin) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0738 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #201 | Hire founding AE (Company & Partner Sales) | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0739 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #202 | Seller document + HR/legal pack (AE + partner) — the CONTRACT PACK is built and served (16 Aug,… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0740 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #203 | Comp Engine + live P&L + 3 portals (the build) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0741 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #204 | Notion for ops/human layer — DEFERRED 26 Jun (🟣→🔴, trigger-gated). Reviewed against the actual … | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0742 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #206 | Template-gallery UX + synced blocks (Notion) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0743 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #207 | Multi-currency rollups in admin P&L (Notion) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0744 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #213 | Partner income forecaster (in-portal) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0745 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #214 | Source-through-product for sellers… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0746 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #215 | Partner client-health + churn-save tools… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0747 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #216 | ALEX — seller-portal AI (channel agent; demo built) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0748 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #217 | White-label tier + partner teams/sub-accounts… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0749 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #218 | Partner academy + certification + tiers… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0750 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #219 | Partner pipeline CRM-lite + notifications… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0751 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #220 | Partner portal — earnings backend (commission types + MRR + USD) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0752 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #221 | Partner portal — earnings split UI (20% vs 5%) | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0753 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #222 | Partner portal — recurring-income hero… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0754 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #223 | Partner portal — the book view… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0755 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #224 | Partner portal — payout statements + trust… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0756 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #225 | Partner portal — per-seller docs vault… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0757 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #226 | Partner portal — in-portal sell-through… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0758 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #227 | Proactive "what should I work on next" across the agent family… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0759 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #228 | Partner-recruiter seller type (recurring override) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0760 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #231 | EPIC — Content/Recording Engine… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0761 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #232 | EPIC — Legal-Filing Calendar… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0762 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #233 | EPIC — Partner-recruiting motion (stealth, email/brand-led) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0763 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #234 | EPIC — SEIS / Investor Prep… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0764 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #235 | C1 — partner code shows OLD tiered rates → 20%+5%… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0765 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #236 | C2 — kill fmtZAR in partner dashboard → USD… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0766 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #237 | C3 — Paystack: KILL → Stripe-only (Flutterwave already DELETED 6 Jul, #314; founder to confirm … | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0767 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #238 | C4 — subscriptions now write amount_usd (source of truth) — DONE via T2b #756 + migration; amou… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0768 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #241 | Migration hygiene — dup 20260611 deleted (T1 #753); still: crm-fields migration + subscriptions… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0769 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #245 | Internal exec-brief generator (built, admin-only, unwalked) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0770 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #246 | In-platform "K.I.N.D Support" AI assistant (built, unwalked) | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0771 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #251 | Documents moved to Account — FIX BUILT 26 Jun (🔴→🟡, pending preview). — The trust vault (T&C/DP… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0772 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #252 | Agent Village — 3D brand-world hero (Clay ball-pit) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0773 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #253 | Social-proof display system — SCAFFOLD LIVE + founder-verified 28 Jun (🔴→🟢) — visible-on-data. … | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0774 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #254 | "See each agent work" detailed showcase — LIVE + founder-verified 28 Jun via #798. — The dashbo… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0775 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #255 | Pricing depth — compare-all-plans matrix BUILT 28 Jun (🔴→🟢, founder-verified 28 Jun). — Added a… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0776 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #256 | Education flywheel — K.I.N.D Academy / email course off the Playbook + feature Prompt Library (… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0777 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #257 | Interactive "what do you want FIGSY to find?" prompt hook (Clay build box) — flagged risky… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0778 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #258 | Regional data residency — US (us-east-1) + UK/EU (eu-west-1) Supabase projects + per-client reg… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0779 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #259 | Homepage de-clutter — 3 agent stacks → 1 (LIVE + founder-verified 28 Jun via #797). — Removed t… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0780 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #261 | Ownership leaks closed + RLS enabled — done 1 Jul. — App-level ownership checks now on signals.… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0781 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #262 | Pause migration applied to prod — (1 Jul, "Success") — subscription_status enum now has paused … | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0782 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #263 | Test CI — .github/workflows/test.yml runs the vitest suite (82 tests) on every push/PR; green +… | FEATURE | 🟢 | (none) | Owner: — |
| INV-0783 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #264 | Resend webhook replay idempotency — MERGED #884, code LIVE on prod API (🟡→🩷 re-dotted by the 2-… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0784 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #265 | Stripe credit-GRANT now atomic + idempotent — SHIPPED 1 Jul: — ledger-first insert (unique inde… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0785 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #266 | /team router authenticated + workspace derived from the authed user — verified LIVE 1 Jul (PR #… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0786 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #269 | Rate-limit gaps — (carved from #263, 1 Jul) — Claude-calling endpoints + API-key routes limit o… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0787 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #272 | M3 · Admin Centre rebuild — the cockpit — (spec = docs/admin-centre-spec.md) — SHIPPED live 1 J… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0788 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #273 | Schema-source consolidation — (carved from #262, 1 Jul) — THREE migration dirs (supabase/migrat… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0789 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #274 | M3 · Sales Channel (per-AE + per-partner) — *(was "Command Centre")* — SHIPPED live 1 Jul (PRs … | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0790 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #275 | M3 · Nora — The Keeper (admin co-pilot) — SHIPPED live 1 Jul (PR #870): context-aware, live cha… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0791 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #276 | M3 · Per-staff (AE) logins + role matrix — each hire gets their own login; role-scoped (founder… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0792 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #277 | M3 · Admin adopts the client-portal design system — (1 Jul; audit) — admin looks/works inconsis… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0793 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #278 | M3 · Admin GTM rebuild — (1 Jul; audit) — GTM Strategy · GTM Results · Winning plays (from winn… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0794 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #279 | M3 · Admin Engine health graph — (1 Jul; audit) — bounce/complaint % over time + warmup + cron,… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0795 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #280 | M3 · Admin Ops — (1 Jul; audit) — Inbox pool management (stock · provisioning · day-29 switches… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0796 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #281 | M3 · Admin Clients rebuild — (1 Jul; audit) — ▶ Slice E MERGED #897 (2 Jul): Clients hub restyl… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0797 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #282 | M3 · Admin single-source dedup — (1 Jul; audit) — metrics duplicated across screens. ▶ Cohorts … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0798 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #285 | M3 · Push alerting — the nervous system — [CEO/COO gap] — nothing pushes to the founder; every … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0799 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #286 | M3 · Dunning / failed-payment workflow — [CFO gap] — a failed Stripe payment today just silentl… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0800 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #287 | M3 · MRR analytics — MoM growth trend + movement waterfall — [CEO/CFO gap] — admin shows point-… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0801 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #288 | M3 · Sales analytics — [Sales Director gap] — no win-rate (won÷closed), sales-cycle/velocity, f… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0802 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #289 | M3 · NPS collection — [CS gap] — CS target ">50 NPS" exists with no mechanism to collect it any… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0803 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #290 | M3 · Error tracking — ⚠️ DESCRIPTION WAS FALSE until 25 Jul (it read *"exceptions vanish into R… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0804 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #291 | M3 · Funnel join + source attribution — [CMO gap] — Visitors · signups · Activation exist but a… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0805 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #292 | M3 · Per-client usage trend — [CS gap] — admin shows point-in-time only (leads 14d, sends 7d); … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0806 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #293 | M3 · At-risk save playbook → Nora — [CS gap] — the churn engine shows risk + reasons but nothin… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0807 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #294 | M3 · Sales-Channel Coverage/Needed — FIXED (was hardcoded lies). — The literal Coverage 2.1× ✓ … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0808 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #295 | M3 · Admin invoice/receipt ledger — [CFO gap] — product invoices exist client-side; the founder… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0809 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #296 | M3 · Refunds tracking — [CFO gap] — no admin view/record of refunds anywhere; they don't reconc… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0810 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #297 | M3 · Renewal / expansion signals — [CS gap] — no surface for upcoming renewals or expansion opp… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0811 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #298 | M3 · Backup-restore drill — [CTO gap] — Supabase backs up, but a restore has never been tested.… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0812 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #299 | M3 · 🐛 6 dead icon imports in AdminSidebar.tsx — LayoutDashboard · Map · BookOpen · BarChart2 ·… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0813 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #303 | 🐛 Company top-up sends legacy creditType: 'lead_gen' — (was #55c; re-confirmed 3 Jul company/pa… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0814 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #304 | M3 · Engine cron run-history panel — (3 Jul) — callInternal() instrumented to log each cron run… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0815 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #305 | #108b · Deactivating a rep returns credits to pool — (3 Jul) — returnRepCreditsToPool() on seat… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0816 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #306 | T1 · C4 — /mcp/call + /mcp/guide unauthenticated Claude drain — FIXED + deployed (PR #949): AI … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0817 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #307 | T1 · Visitor-PII auth bypass — FIXED + deployed (PR #949): — tracking.ts now ADMIN_SECRET_KEY +… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0818 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #308 | T1 · C3 — admin app authentication — FIXED, DEPLOYED + WALKED (PR #950, 6 Jul): — Supabase logi… | FEATURE | 🟢 | (none) | Owner: 🤝→🤖 |
| INV-0819 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #309 | T1 · Admin secret in URL — FIXED + deployed (PR #949): — engine.ts is header-only now; morgan c… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0820 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #313 | T2 · C2 — Stripe checkout credit-mint — (stripe.ts:117-121): if (expectedPriceId && …) skips va… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0821 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #314 | T2 · C6 — Flutterwave grant-without-payment + double-grant — (flutterwave.ts:102,156-186): hash… | FEATURE | 🩷 | (none) | Owner: 🤝→🤖 |
| INV-0822 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #315 | T2 · Auto-top-up double-charges the card — on two concurrent hot-replies (figsy.ts:335-382) — n… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0823 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #316 | T2 · Company credit-pool races — (company.ts:433-469): non-atomic read-then-write; double-click… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0824 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #317 | T2 · Refund / chargeback handling — ⚠️ TITLE WAS FALSE until 25 Jul (it read *"No refund/charge… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0825 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #318 | T3 · Client-facing deception — HONEST-LABELLED, PREVIEW-APPROVED + MERGED (PR #963, 6 Jul). — F… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0826 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #319 | T3 · Pause lies — FIXED + MERGED (PR #959, 6 Jul; api deployed 6 Jul PM — 🩷 walk owed). — subsc… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0827 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #321 | T3 · Authed Claude endpoints throttled — FIXED + MERGED (PR #961, 6 Jul; api deployed 6 Jul PM … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0828 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #322 | T3 · Board/docs integrity — FIXED + MERGED (PR #962, 6 Jul; docs/tooling = live on merge). — co… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0829 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #323 | LOW (re-classified 6 Jul after reading mount order — NOT the live critical first reported) · de… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0830 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #324 | MED · internal-briefs.ts:21-27 admin-key guard fails OPEN + accepts ?admin_key= query param — w… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0831 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #325 | MED · Paystack /subscriptions/verify + /credits/verify trust unbound metadata — (subscriptions.… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0832 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #327 | *(🔴→🟡 1 Aug, on PREVIEW; 🟣 when walked.)* BOTH LINES #327 CITED ARE GONE — the item outlived it… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0833 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #328 | LOW · #284 residue in the portal: — auto-topup modal still offers + defaults to the retired "$1… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0834 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #329 | Go-live seed-data wipe — before the FIRST real client — (logged 7 Jul, founder-confirmed on the… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0835 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #333 | SHIPPED live 7 Jul (PR #985) · M0 · Stripe under-grant hurts the CLIENT — webhook returns 200 e… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0836 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #334 | SHIPPED live 7 Jul (PR #985) · M0 · Auto-top-up is a dead switch — requires a saved *Paystack* … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0837 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #336 | SHIPPED live 7 Jul (PR #985) · M0 · Referral bonus farmable + pays dead currency — +100 credits… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0838 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #339 | AR-02 CRITICAL · Blind alarm — FIXED — (21-Jul audit): sendFounderAlert now checks Resend's ret… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0839 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #340 | AR-03 CRITICAL · Subscription status→active — any incomplete/past_due/failed sub coerced to act… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0840 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #341 | AR-04 CRITICAL · Cancel doesn't cancel — cancel only marks the DB row, no Stripe call, no billi… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0841 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #342 | AR-05 CRITICAL · Lapse cron 500s daily — writes status='lapsed', a value not in the prod subscr… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0842 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #343 | AR-06 CRITICAL · No cron singleton — startCrons() runs on every API process, no lock/env gate (… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0843 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #348 | AR-11 CRITICAL · 90-day guarantee inoperable → REMOVED — terms keyed the refund to an auto cale… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0844 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #349 | AR-12 CRITICAL · ~140 unchecked money-table writes — subscription/credit/enrollment/partner DB … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0845 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #350 | AR-28 CRITICAL · visitor_sessions anon-readable — RLS policy admin_read_visits is {public} SELE… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0846 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #351 | AR-13 HIGH · Partner commission wrong — pays 20% recurring not 20%-once-then-5%; no refund claw… | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0847 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #352 | AR-14 HIGH · Auto-topup double card charge — TOCTOU cooldown + hardcoded ×19 ZAR Paystack charg… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0848 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #353 | AR-15 HIGH · Trial-expiry spam — "Your trial has ended" sent daily forever, no terminal state, … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0849 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #355 | AR-17 HIGH · #336 referral unearnable — ?ref= dropped at /→/login (portal page.tsx:14) → attrib… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0850 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #357 | AR-19 HIGH · MRR structurally $0 — subscription amount never written (routes/stripe.ts:428) → F… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0851 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #363 | AR-25 HIGH · seed-leads clobber — /admin/seed-leads overwrites a real client's credit_balance=5… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0852 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #364 | AR-26 HIGH · Demo pollutes founder metrics — CRO dashboard/weekly digest/active-paying counts i… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0853 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #370 | AR-33 HIGH · partners ilike-injection — .ilike(email) resolves partner identity (routes/partner… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0854 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #371 | AR-34 HIGH · Racy welcome/trial grants — credit_balance/figsy_credits = (x??0)+N read-modify-wr… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0855 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #372 | AR-35 HIGH · Pool credits destroyed — allocate_pool_to_rep returns true even when the rep updat… | FEATURE | 🟢 | (none) | Owner: 🤝 |
| INV-0856 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #373 | AR-36 HIGH · Prod constraint gaps — subscriptions(client_id,product) / partner_commissions / pa… | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0857 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #377 | AR-40 HIGH · Support black hole — auto-reply phantom-sends then suppresses the founder-forward … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0858 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #378 | AR-41 HIGH · Hallucinated availability — /ae/demo-request auto-sends a Claude email with invent… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0859 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #379 | AR-54 HIGH · Webhook catch→200 — FIXED — (21-Jul audit): the Stripe webhook now returns 500 on … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0860 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #380 | AR-42 MED · Missing tables — subscribers/whatsapp_messages/figsy_sessions created in no migrati… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0861 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #381 | AR-43 MED · Developer webhooks dead — webhook_endpoints migration in a non-canonical dir, unapp… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0862 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #382 | AR-44 MED · Churn scoring dead — clients.last_seen_at read but created nowhere (routes/internal… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0863 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #384 | AR-46 MED · Dead portal buttons — Export CSV → /leads/export 404 (real /export/csv); "Request d… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0864 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #386 | AR-55 MED · Onboarding double-submit — no prod subscriptions(client_id,product) unique → double… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0865 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #387 | AR-56 MED · Referral attribution swallowed — partner_referrals unique differs between schema fi… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0866 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #389 | AR-59 MED · Migration hygiene — no runner (prod = hand-pasted); 20260525 re-paste DROPs amount_… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0867 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #390 | AR-60 MED · Observability gaps — no dead-letter/retry table; dashboards don't distinguish real/… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0868 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #393 | AR-63 MED · Data-moat dup rows — no dedup key; re-run/overlap duplicates all 500 rows incl. dem… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0869 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #397 | AR-51 · HubSpot dead code — THE ITEM'S OWN PREMISE WAS THE DEFECT, and it pointed a delete inst… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0870 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #398 | AR-52 LOW · Wise "integration" — partner payouts are a manual admin-typed wise_reference field … | FEATURE | 🔴 | (none) | Owner: 🧍 |
| INV-0871 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #399 | AR-57 LOW · Integrations hub shell — all 8 "Connect" tiles → "coming soon" toast (portal integr… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0872 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #402 | AR-65 LOW · Auth/observability nits — team invite role unvalidated (team.ts:32); /company/overv… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0873 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #405 | M0 · MOVE 1 · WEBSITE full element sweep — (8 Jul, founder-locked) — go through every page/sect… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0874 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #406 | *(🔴→🟡 1 Aug — swept and fixed, on PREVIEW; 🟣 when the founder walks it.)* M0 · PORTAL ELEMENT S… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0875 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #407 | M0 · Docs stale-info sweep — (8 Jul docs audit) — clean residue that contradicts the audit: Apo… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0876 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #408 | M0 · Website pricing = ONE product — (8 Jul, founder-locked) — home + pricing.html sold three t… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0877 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #409 | M0 · Dead /signup CTAs site-wide — (8 Jul website sweep) — app.get-kind.com/signup 404s (no /si… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0878 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #410 | *(🔴→🟡 1 Aug, on PREVIEW; 🟣 when walked.)* #410's stated defect was ALREADY FIXED — privacy/dpa/… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0879 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #411 | M0 · REMOVE all speed / time-to-result promises — (8 Jul, founder-locked: "remove all — we have… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0880 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #412 | M0 · proposals portal screen missing from the sweep checklist — (8 Jul) — apps/portal/.../dashb… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0881 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #417 | MERGED #999 (3D carousel live in index.html); 🔴→🟡 8 Jul — deploy railway up "KIND" + walk → 🩷. … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0882 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #418 | MERGED #999+#1000 (orbital live in index.html); 🔴→🟡 8 Jul — deploy + walk → 🩷. — M0 · "It takes… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0883 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #419 | MERGED #1000 (family cards live in pricing.html); 🔴→🟡 8 Jul — deploy + walk → 🩷. ⚠️ Phase-1 rew… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0884 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #430 | M0 · Pricing page "two engines, two layers" redesign — (R1, founder-locked 8 Jul; client-facing… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0885 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #431 | M0 · Retire agent-subscription billing — (founder-locked 8 Jul — consequence of #420) — with ev… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0886 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #432 | M0 CRITICAL · LEGAL — legal.md — 🟡 8 Jul: SUPERSEDE banner added (Apollo retired → PDL+Hunter; … | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0887 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #433 | M0 CRITICAL · LEGAL — legal/legal-pack.md — 🟡 8 Jul: DPA sub-processor list fixed (Apollo→PDL+H… | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0888 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #434 | M0 CRITICAL · LEGAL — legal/seis-advance-assurance-draft.md — 🟡 8 Jul: revenue model rewritten … | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0889 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #435 | M0 CRITICAL · LEGAL — legal/partner-agreement.md — 🟡 8 Jul: comp re-expressed on collected per-… | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0890 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #436 | M0 CRITICAL · LEGAL — legal/it-security-pack.md + key-rotation-runbook.md — 🟡 8 Jul: Apollo rem… | FEATURE | 🟡 | (none) | Owner: 🧍 |
| INV-0891 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #448 | SPRINT 8a/PR3 · Admin Money Path page — (admin+api). | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0892 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #453 | DEMO MODE · free, pool-only sales demos + Money Path shows REAL economics only — (api+admin+mig… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0893 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #454 | SPRINT 8c · GUIDED ONBOARDING TOUR — (founder-ruled INTO the sprint 10 Jul — "critical before o… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0894 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #455 | FOUNDER OUTREACH SCOREBOARD — (admin) — weekly hustle tracker so after a month the founder sees… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0895 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #456 | CLEAN SLATE — client purge + pool integrity + honest admin — (founder found fake records in lea… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0896 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra | #469 | Homepage rebuild — FIGSY-first, honest family section — *(21 Jul)* — apps/website/index.html re… | FEATURE | 🩷 | (none) | Owner: 🧍 walk |
| INV-0897 | 🛠 SHARED PLATFORM — engine · admin · website · billing · infra › ↳ Alta-parity gap — the shared brain (21 Jul competitive teardown — 🔴  | #476 | UNIFIED DATA LAYER / shared agent brain — THE moat. — Alta's real strength isn't three agents, … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0898 | 🗄 ARCHIVE / HISTORY | #24 | Flutterwave~~ DELETED 6 Jul (#314, founder call: Stripe-only) — route + lib removed; uncounted … | FEATURE | — · uncounted pointer | (none) | Owner: — |
| INV-0899 | 🗄 ARCHIVE / HISTORY | #25 | Credit bundles → single $3 FIGSY (retire $1)~~ SUPERSEDED 8 Jul by #420/#421 — the two-charge m… | FEATURE | — · uncounted pointer | (none) | Owner: 🤖 |
| INV-0900 | 🗄 ARCHIVE / HISTORY | #27 | Credit system single pool (retire credit_balance)~~ SUPERSEDED 8 Jul by #420/#421 — two wallets… | FEATURE | — · uncounted pointer | (none) | Owner: 🤖 |
| INV-0901 | 🗄 ARCHIVE / HISTORY | #55c | Dup of #303 (shipped) — company top-up funds FIGSY, not lead_gen. Status single-homed on #303; … | FEATURE | — · uncounted pointer | (none) | Owner: — |
| INV-0902 | 🗄 ARCHIVE / HISTORY | #92 | PR #502 — 10-Jun audit batch (Y1–Y11) | FEATURE | 🟢 | (none) | Owner: — |
| INV-0903 | 🗄 ARCHIVE / HISTORY | #105 | Go/No-Go launch gate (history — launched 18 Jun) | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0904 | 🗄 ARCHIVE / HISTORY | #108b | Dup of #305 (shipped) — deactivate returns rep credits to pool. Status single-homed on #305; ro… | FEATURE | — · uncounted pointer | (none) | Owner: — |
| INV-0905 | 🗄 ARCHIVE / HISTORY | #136 | Flutterwave activation~~ VOID — Flutterwave DELETED 6 Jul (#314); uncounted pointer row for the… | FEATURE | — · uncounted pointer | (none) | Owner: — |
| INV-0906 | 🗄 ARCHIVE / HISTORY | #239 | C5 — unify price tables to @kind/shared — superseded Wed 1 Jul by Lead Gen retirement (one prod… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0907 | 🗄 ARCHIVE / HISTORY | #401 | AR-64 LOW · Lying inventory dots — corrected this pass: #44 Calendar 🟢→⏸, #26 subs 🟢→🟡, #311 ph… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0908 | 🗄 ARCHIVE / HISTORY | #404 | AR-67 MED · Lena agent is dead code — (3-question audit, 8 Jul) — routes/lena.ts is a real Anth… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0909 | 🗄 ARCHIVE / HISTORY | #437 | STEAL (Jack & Jill, 10 Jul) · "Why this lead, why now" surfaced — cheapest win of the steal: sc… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0910 | 🗄 ARCHIVE / HISTORY | #438 | STEAL (Jack & Jill, 10 Jul) · ICP interview → living customer model — replace the static ICP fo… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0911 | 🗄 ARCHIVE / HISTORY | #439 | STEAL (Jack & Jill, 10 Jul) · Widen the learning loop (outcomes → beliefs) — figsy_memory alrea… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0912 | 🗄 ARCHIVE / HISTORY | #440 | STEAL (Jack & Jill, 10 Jul) · Per-prospect buyer memory — figsy_memory is per-CLIENT; leads car… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0913 | 🗄 ARCHIVE / HISTORY | #441 | STEAL (Jack & Jill, 10 Jul) · FIGSY coaching mode — package what exists (Monday digest · auto-p… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0914 | 🗄 ARCHIVE / HISTORY | #442 | STEAL (Jack & Jill, 10 Jul) · Autonomous reply conversations — today a reply is classified with… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0915 | 🗄 ARCHIVE / HISTORY | #443 | STEAL (Jack & Jill, 10 Jul) · Two-sided intelligence (seller-model × buyer-model) — architectur… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0916 | 🗄 ARCHIVE / HISTORY | #457 | Milla reframe — rename the FIGSY portal surface → "Milla, powered by FIGSY" (label only; FIGSY … | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0917 | 🗄 ARCHIVE / HISTORY | #458 | Milla Overview home — two engines → one pipeline (FIGSY outbound *current build* + Vida inbound… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0918 | 🗄 ARCHIVE / HISTORY | #459 | "Vida matches" lead bucket — new inbound source in the existing leads/inbox; leads.source='vida… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0919 | 🗄 ARCHIVE / HISTORY | #460 | Vida↔Milla matcher — LLM maps a Vida problem ↔ the business's "problems we solve" (figsy_knowle… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0920 | 🗄 ARCHIVE / HISTORY | #461 | Premium-reveal billing (Vida match) — charge the business on accept via existing credit rails; … | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0921 | 🗄 ARCHIVE / HISTORY | #462 | leads.source='vida' + pool fence — CHECK add 'vida'; a Vida match never enters lead_pool (a spe… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0922 | 🗄 ARCHIVE / HISTORY | #463 | Vida portal (demand intake) — free; Jack &amp; Jill layout in K.I.N.D colours, simple; problem→… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0923 | 🗄 ARCHIVE / HISTORY | #464 | Website two doors — "Find help (free)" (Vida) + "Get matched demand + FIGSY" (business); matche… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0924 | 🗄 ARCHIVE / HISTORY | #465 | Admin — Vida ops — demand pool by category · match/accept rate · time-to-first-good-match · con… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0925 | 🗄 ARCHIVE / HISTORY | #466 | Vida login — LinkedIn as ONE optional method — (not mandatory) alongside email/Google; identity… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0926 | 🗄 ARCHIVE / HISTORY | #467 | Vida company/context capture — via intake conversation, not OAuth scrape — "who do you work for… | FEATURE | 🔴 | (none) | Owner: 🤝 |
| INV-0927 | 🗄 ARCHIVE / HISTORY | #610 | *"inbox x 2 yes for now but volume is key"* — hello@kindoutreach.com takes the pooled slot as a… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0928 | 🗄 ARCHIVE / HISTORY | #615 | [CLIENT-FACING · #615] VAT EVIDENCE AT ONBOARDING — the default state of every client was "undo… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0929 | 🗄 ARCHIVE / HISTORY | #611 | [VIDA] THE HOUSE-ACCOUNT AUDIT — an instrument, because there is no console to look in | FEATURE | 🩷 | (none) | Owner: 🤝 |
| INV-0930 | 🗄 ARCHIVE / HISTORY | #612 | [ENGINE · FOUNDER-RULED 4 Aug] THE SEQUENCE QUALITY GATE — world-class copy, enforced before a … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0931 | 🗄 ARCHIVE / HISTORY | #613 | [MONEY · #613] REVENUE RECORDED HONESTLY — what Stripe SETTLED, not the price list — *(4 Aug, f… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0932 | 🗄 ARCHIVE / HISTORY | #614 | [MONEY · #614] THE COST FLOOR AS CODE, NOT TYPED-IN NUMBERS — *(4 Aug.)* cockpit/page.tsx compu… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0933 | 🗄 ARCHIVE / HISTORY | #616 | [SEATS · #616] THE SEAT LIMIT GETS A CONTROL — it was enforced, invisible AND unchangeable — *(… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0934 | 🗄 ARCHIVE / HISTORY | #618 | [ENGINE · FOUNDER-RULED 5 Aug] THE COLD-CLIENT RULE STOPS POINTING AT US — *the collision two i… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0935 | 🗄 ARCHIVE / HISTORY | #619 | [MONEY · VIDA · #619] THE CLIENT BOARD STOPS LYING ABOUT MONEY AND ABOUT SUSPENSION — *two fals… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0936 | 🗄 ARCHIVE / HISTORY | #617 | [LEGAL · #617] THE PECR PASS — we must not cold-email a UK sole trader — *(5 Aug, the only pre-… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0937 | 🗄 ARCHIVE / HISTORY | #620 | [OPS · #620] A REFUSED LEAD MUST NEVER LOOK LIKE SILENCE — *(5 Aug.)* The enrol paths named eve… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0938 | 🗄 ARCHIVE / HISTORY | #621 | [LAUNCH · #621] THE SEND-DAY RUNBOOK — the founder executes it ALONE — *(5 Aug, forced by a dat… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0939 | 🗄 ARCHIVE / HISTORY | #622 | [ENGINE · #622] SEND CAPACITY — and the read-first pass changed the build — *(5 Aug, under A6's… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0940 | 🗄 ARCHIVE / HISTORY | #623 | [MONEY · #623] THE "$ IN" FIGURE WAS CALCULATED, NOT COUNTED — and the founder's own money walk… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0941 | 🗄 ARCHIVE / HISTORY | #624 | [LAUNCH · #624] THE REPLY-PATH ROW ANSWERED HALF THE QUESTION — and the half it skipped is the … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0942 | 🗄 ARCHIVE / HISTORY | #625 | [MONEY · #625] A FREE RE-APPROVE STRANDED THE LEAD — two guards, and the failure walked between… | FEATURE | 🟢 | (none) | Owner: 🤖 ✅ WALKED 🟢 12 Aug — TH |
| INV-0943 | 🗄 ARCHIVE / HISTORY | #626 | [OPS · #626] THE SCREEN NAMED A FIX NOBODY COULD PERFORM — *(5 Aug, night batch.)* The System c… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0944 | 🗄 ARCHIVE / HISTORY | #627 | [OPS · #627] app_settings DID NOT EXIST, AND THE CHECK THAT SHOULD HAVE CAUGHT IT WAS WHY NOBOD… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0945 | 🗄 ARCHIVE / HISTORY | #628 | [MILLA · #628] THE SETTINGS PAGE WAS OVERSELLING AND UNDERSELLING IN THE SAME SCROLL — AND A SY… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0946 | 🗄 ARCHIVE / HISTORY | #629 | [DOCS · #629] THE MEMORY FIX — the founder's memory stops being the last line of defence ⛓️ md … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0947 | 🗄 ARCHIVE / HISTORY | #630 | [OPS · #630] THE SYSTEM PAGE CALLED A LIVE GUARD MISSING — AND CONTRADICTED ITSELF FOUR SECTION… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0948 | 🗄 ARCHIVE / HISTORY | #631 | [VIDA · #631] THE ALERT SAID "ENROL IT FROM VIDA" AND THERE WAS NO WAY TO DO THAT — *(6 Aug, fo… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0949 | 🗄 ARCHIVE / HISTORY | #637 | [AUDIT · A1] figsy_sent_emails.client_id — read by 5 surfaces, created by NO migration, written… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0950 | 🗄 ARCHIVE / HISTORY | #638 | [AUDIT · A2] TWO SELECTS READ A COLUMN FROM THE WRONG TABLE — both silently. — ① leads.ts:485 s… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0951 | 🗄 ARCHIVE / HISTORY | #639 | [AUDIT · A3] THE WEBSITE LEAD-CAPTURE FORM IS THE THIRD WRITER OF leads.source — and its insert… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0952 | 🗄 ARCHIVE / HISTORY | #640 | [AUDIT · B1] THE ADMIN CLIENT-DETAIL USAGE CHART HAS NEVER RENDERED — a double-prefix 404. — cl… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0953 | 🗄 ARCHIVE / HISTORY | #641 | [AUDIT · B2] EIGHT MORE COLUMNS/TABLES THE CODE READS THAT NO MIGRATION CREATES — every failure… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0954 | 🗄 ARCHIVE / HISTORY | #642 | [AUDIT · GUARD] KILL THE CLASS: generalize the column-truth guard to EVERY table and add the de… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0955 | 🗄 ARCHIVE / HISTORY | #643 | [AUDIT · PROBE] SCHEMA-PROBE EXTENSION — one press turns every audit ❓ into a fact. — #558's pr… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0956 | 🗄 ARCHIVE / HISTORY | #632 | [MARKETING · founder-ordered 11 Aug] THE MARKETING PLAN — how K.I.N.D gets known, and the recur… | FEATURE | 🩷 | (none) | Owner: 🧍 |
| INV-0957 | 🗄 ARCHIVE / HISTORY | #644 | [A11 WALK · CLIENT-FACING · FOUND 12 Aug] A CLIENT CANNOT REACH THEIR OWN REPLIES FROM MILLA — … | FEATURE | 🟢 | (none) | Owner: 🤖 ✅ FIXED AND WALKED 🟢 1 |
| INV-0958 | 🗄 ARCHIVE / HISTORY | #645 | [A11 WALK · FOUND 12 Aug] #66's INVENTORY ROW SENDS YOU TO THE WRONG APP — "Unibox 'Help me rep… | FEATURE | 🩷 | (none) | Owner: 🤖 ✅ FIXED 12 Aug — #66's |
| INV-0959 | 🗄 ARCHIVE / HISTORY | #646 | [OPS · FOUND + FIXED 12 Aug on the A11 walk] THE COCKPIT SHOWED A RAND EXCHANGE RATE TO A UK FO… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0960 | 🗄 ARCHIVE / HISTORY | #647 | [OPS · FOUND 12 Aug, deliberately NOT fixed the same day] THE REVENUE PAGE STILL HEADLINES "MRR… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0961 | 🗄 ARCHIVE / HISTORY | #648 | [OPS · FOUND + FIXED 12 Aug on the A11 walk] TWO OPERATOR SCREENS SAID "AWAITING" ABOUT COMPLET… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0962 | 🗄 ARCHIVE / HISTORY | #649 | [MILLA · FOUND 12 Aug on the founder's own screenshot, demo-prep] MILLA'S CHAT WAS BLIND, STALE… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0963 | 🗄 ARCHIVE / HISTORY | #650 | [SYSTEM · FOUND 13 Aug by auditing every db.rpc( call, not by waiting for a symptom] TWELVE OF … | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0964 | 🗄 ARCHIVE / HISTORY | #651 | [ENGINE · R38-amended + R39, founder-ruled 15 Aug] THE INDUSTRY/PURPOSE SEQUENCING ENGINE — seq… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0965 | 🗄 ARCHIVE / HISTORY | #652 | [AUTH · found on the founder's walk, 16 Aug] THE PASSWORD-RESET SCREEN THAT WAS NEVER BUILT — a… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0966 | 🗄 ARCHIVE / HISTORY | #653 | [R42, founder-ruled 16 Aug] THE PARTNER ONBOARDING FLOW — invite → she completes her pack → she… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0967 | 🗄 ARCHIVE / HISTORY | #654 | [#654, founder-ruled 16 Aug] THE SELLER RAMP — structured onboarding for ANY seller (partner, e… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0968 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #655 | STEAL (Alta, 19 Aug) · Closed-lost revival — a lost opportunity becomes a re-engagement candida… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0969 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #656 | STEAL (Alta, 19 Aug) · Condition-based campaign branching — a sequence that REACTS: positive → … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0970 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #657 | STEAL (Artisan, 19 Aug) · Re-engagement + cross-sell targeting from client CRM — closed-won acc… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0971 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #658 | STEAL (Unify, 19 Aug) · Signal-triggered plays — a signal (job change, hiring spike, funding, p… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0972 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #659 | STEAL (Amplemarket, 19 Aug) · Social selling / community-signal workflows, human-in-the-loop — … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0973 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #660 | STEAL (Jack & Jill, 19 Aug) · ANTI-SIGNALS as first-class data — the product must learn why a p… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0974 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #661 | STEAL (Jack & Jill, 19 Aug) · Explainable structured criteria, not an opaque score — FIGSY shou… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0975 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #662 | STEAL (Jack & Jill / Milla pattern, 19 Aug) · The morning brief inside ONE continuous conversat… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-0976 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #663 | THE LAUNCH-COUNTRY ALLOWLIST — R45 stops being a sentence and becomes six gates (20 Aug). — R45… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0977 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #664 | HC-3 · THE SMARTLEAD PATH HAD NONE OF OUR SUPPRESSION NETS — and it is the month-one send path … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0978 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #665 | HC-4 · THE CONSENT EMAIL BROKE TWO FOUNDER LOCKS AT ONCE — S5 and S6 (20 Aug). — sendConsentEma… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0979 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #666 | HC-6 · THE TRACKING THAT NOBODY WAS TOLD ABOUT — the pixel is off, GA is gone, and the privacy … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0980 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #667 | UPSTREAM DSR PROPAGATION — the pool never heard a provider deletion, and one signal now lands (… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0981 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #668 | CAN-SPAM AUDIT — the postal address every cold email was missing, and the five rows beside it (… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0982 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #669 | THE COUNT pecr.ts PROMISED FOR TWO MONTHS AND NEVER DELIVERED (20 Aug). — unknown_country carri… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0983 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #670 | DSAR & ERASURE RUNBOOK — every place one person lives, and the one row we deliberately keep (20… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-0984 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #671 | THE FIVE CONSENT DOORS NOW READ THE MAILER'S VERDICT — HC-4 gated the send and the callers went… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0985 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #672 | SOUTH AFRICA JOINS THE LAUNCH LIST — and the third country exposed a grammar defect two coun… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0986 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #673 | /health SHOULD RETURN THE DEPLOYED COMMIT SHA — today nothing served by the live API says which… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0987 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #674 | THE HASH-SESSION CALL IS PINNED AGAINST CODE, NOT AGAINST TEXT (20 Aug). — partner-onboarding/p… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0988 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #675 | /consent/bulk REPORTS A VERIFIED EMAIL AS "already consented" (found 20 Aug, founder ruled: lea… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0989 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #676 | apollo_consented STOPS LYING TO READERS — a comments-only pass over every site (20 Aug). — The … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0990 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #677 | THE "✓ GDPR" BADGE IS FALSE, AND A PAYING CLIENT READS IT (found 20 Aug — the most serious inst… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0991 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #678 | GOVERNED DOCUMENTS LIVE IN VIDA — R46 built the smallest honest way (20 Aug). — Founder-ruled 1… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0992 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #679 | 🧭 THE DOCUMENTS SCREEN WAS LINKED FROM NOWHERE — the third time this console shipped an unreach… | FEATURE | 🟢 | (none) | Owner: 🤖 |
| INV-0993 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #680 | 🗣 THE ERROR THAT COULD NOT SAY "PRESS RUN MIGRATIONS" — found by a walk, not by a test (20 Aug)… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0994 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #681 | 🔔 A DROPPED AUDIT ROW IS NEVER SILENT (20 Aug). — writeOperatorAudit is the ONLY record of who … | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0995 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #682 | THE APOLLO POOL TRIPWIRE — a guard that refuses nothing today, which is the point (20 Aug, F15)… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0996 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #683 | WE STOPPED ASKING TO READ CLIENTS' CALENDARS (20 Aug, Prompt 29). — The Google consent screen i… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0997 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #684 | GOOGLE OAUTH IS UNVERIFIED — no CLIENT can connect a calendar, and the app is on a domain we do… | FEATURE | 🟡 | (none) | Owner: 🤝 |
| INV-0998 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #685 | THE WEBSITE STOPPED CLAIMING WHAT THE INFRASTRUCTURE DOES NOT DO — 56 false sentences removed (… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-0999 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #686 | THE WEBSITE CANNOT NAME ITS OWN BUILD — and that cost two opposite wrong statuses in one day (2… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1000 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #687 | THE $4 IS DEFINED TWICE, AND THE COPY THAT CHARGES THE WALLET IS THE LOCAL ONE (found 20 Aug, W… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1001 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #688 | THE DECISION THAT WON A MEETING IS DESTROYED BY THE NEXT RESCORE — A2a, the additive half (20… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1002 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #689 | A2b — THE FULL DECISION HISTORY, and the one link that does not exist (20 Aug). — Completes #… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1003 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #690 | 48 HARD-CODED MODEL IDS AND 32 SEPARATE ANTHROPIC CLIENTS — one seam, one pass (20 Aug, A1). … | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1004 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #691 | model_runs — durable telemetry that can never take the product down (20 Aug). — Zero token usag… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1005 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #692 | outcome_events IS A LOG WEARING A LEDGER'S DESCRIPTION — settle it BEFORE approve/reject events… | FEATURE | 🔴 | (none) | Owner: 🧍 + 🤖 |
| INV-1006 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #693 | 👍👎 APPROVE AND REJECT ARE NOT CAPTURED AS OUTCOMES — and one of them has no product surface at … | FEATURE | 🔴 | (none) | Owner: 🧍 + 🤖 |
| INV-1007 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #694 | THE TENANT FENCE FOR ROUTING METADATA — three tiers, not one rule (20 Aug). — ⛓️ Corrects my ow… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1008 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #695 | SHADOW MODEL EVALUATION — compare alternatives on real workloads without changing customer outp… | FEATURE | 🔴 | (none) | Owner: 🤖 |
| INV-1009 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #696 | 🎛 DYNAMIC FIGSY ROUTING — the last step, and only on evidence (20 Aug). — Route on required qua… | FEATURE | 🔴 | (none) | Owner: 🧍 + 🤖 |
| INV-1010 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #697 | THE MILLA HOMEPAGE (P30) — LIVE. Merged to main 20 Aug; not yet founder-walked in production. ⛓… | FEATURE | 🩷 | (none) | Owner: 🤖 |
| INV-1011 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #698 | WEBSITE CONSISTENCY PASS — PHASE 1 BUILT 21 Aug, on branch, pending the founder's preview (R63)… | FEATURE | 🟡 | (none) | Owner: 🧍 + 🤖 |
| INV-1012 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #699 | THE AR5 PROVIDER BOUNDARY — enforced in code, not in labels (21 Aug). — A read-only audit found… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-1013 | 🗄 ARCHIVE / HISTORY › STEALS — the 19 Aug handoff-bundle sweep (RULEBOOK §9: logged in red,  | #700 | LAUNCH COHERENCE — FREE REAL-LEAD PROOF, K.I.N.D-ONLY GO, AND MILLA'S UNDERSTANDING REACHING FI… | FEATURE | 🟡 | (none) | Owner: 🤖 |
| INV-1014 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #420 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤝 |
| INV-1015 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #421 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1016 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #422 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1017 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #423 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1018 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #424 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤝 |
| INV-1019 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #425 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤝 |
| INV-1020 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #427 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1021 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #428 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1022 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #429 | TOMBSTONED 1 Aug (founder decision, #606): superseded 24 Jul by ONE WALLET — $99 pack + $4/appr… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1023 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #176 | TOMBSTONED 1 Aug (founder decision, #606): no trial exists in the $99 model. *(Text preserved v… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1024 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #270 | TOMBSTONED 1 Aug (founder decision, #606): no trial exists in the $99 model. *(Text preserved v… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤝 |
| INV-1025 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #271 | TOMBSTONED 1 Aug (founder decision, #606): no trial exists in the $99 model. *(Text preserved v… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤝 |
| INV-1026 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #230 | TOMBSTONED 1 Aug (founder decision, #606): duplicate of #404 — one defect, two rows. *(Text pre… | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1027 | 🪦 TOMBSTONED — founder-ruled removals (BELOW the count markers on purp | #145 | TOMBSTONED 1 Aug (founder decision, #606): Lena/Tony have no home in the 22 Jul four-home map. … | FEATURE | 🪦 · 🪦 TOMBSTONED (below the count markers) | (none) | Owner: 🤖 |
| INV-1028 | THE NEW MAP | (none) | FIGSY — THE ENGINE: find → reveal → write → send → reply → book, no longer sold standalone | ARCHITECTURE | founder-locked | 22 Jul |  |
| INV-1029 | THE NEW MAP | (none) | VIDA — OPERATOR CONSOLE: where we run a client end-to-end; admin/nervous-system folds in | ARCHITECTURE | founder-locked | 22 Jul |  |
| INV-1030 | THE NEW MAP | (none) | MILLA — CLIENT PORTAL: masked leads, 👍/✕ approve, concierge chat, meetings, reports | ARCHITECTURE | founder-locked | 22 Jul | Reviews only — never drives |
| INV-1031 | THE NEW MAP | (none) | NEXUS — each client's private learning brain, never shared | ARCHITECTURE | founder-locked | 22 Jul |  |
| INV-1032 | THE NEW MAP | (none) | WEBSITE — the Milla&Vida marketing site | ARCHITECTURE | founder-locked | 22 Jul |  |
| INV-1033 | THE NEW MAP | (none) | Glide path: managed → co-pilot → self-serve (only who clicks approve changes) | ARCHITECTURE | (none) | 22 Jul | Build order: Website → Vida → Milla |
| INV-1034 | THE NEW MAP | (none) | Nothing was deleted or renumbered in this reorg | RULE | (none) | 22 Jul | 14 new build items #477–#490 minted; retired scope noted, not removed |
| INV-1035 | MILLA&VIDA PIVOT section banner | (none) | The 14-day build (22 Jul · #477–#491) — ~70% is reuse of what is already built | ARCHITECTURE | (none) | 22 Jul |  |
| INV-1036 | THE LAUNCH PATH section banner | (none) | The 25-Jul flow walk found the shell was built and the FEATURES were not | HISTORY | founder-locked | 25 Jul | No new SQL — every item uses tables that already exist |
| INV-1037 | THE SENDING SPINE section banner | (none) | The finding, in one paragraph — one shared FROM address, client_inboxes read nowhere, no SMTP client | DEFECT | ⛓️ superseded by #547/#548 | 26 Jul | "sends on your own warmed inbox" did not exist |
| INV-1038 | FIGSY — THE ENGINE section banner | (none) | Section re-headed 22 Jul; rows unchanged | OPERATING | (none) | 22 Jul |  |
| INV-1039 | THE BRAIN | (none) | 14 agent-era rows redesignated to THE BRAIN under THE ENGINE | ARCHITECTURE | founder, #606 | 1 Aug | Moving a row is not building it — dots unchanged |
| INV-1040 | Client-readiness fixes | (none) | The A–F block that flipped self-serve readiness from NOT-READY to READY | HISTORY | 🩷 shipped #1085–#1090 | 21–22 Jul |  |
| INV-1041 | Alta-parity gaps | (none) | Two capabilities that define Alta and that K.I.N.D has ZERO of | RISK | 🔴 net-new | 21 Jul | Absent from every doc before the 21 Jul teardown |
| INV-1042 | MILLA — CLIENT PORTAL banner | (none) | Milla reframed 22 Jul as the client-facing portal, not the Mind/Brain agent | ARCHITECTURE | (none) | 22 Jul | Old agent-scope rows kept for history |
| INV-1043 | DENISE | (none) | DENISE — sales-action (reply→close) absorbs into MILLA | ARCHITECTURE | founder | 21 Jul | Destination column on each row |
| INV-1044 | TONY | (none) | TONY — ops / pipeline-hygiene absorbs into MILLA; no backend built | ARCHITECTURE | founder | 21 Jul | Table is empty of rows |
| INV-1045 | VIDA — OPERATOR CONSOLE banner | (none) | Vida reframed 22 Jul as the operator console with the admin nervous system folded in | ARCHITECTURE | (none) | 22 Jul |  |
| INV-1046 | SHARED PLATFORM banner | (none) | Auth · billing · admin OS · infra · website · legal · partner · API · NEXUS (#476) | ARCHITECTURE | (none) | (none) |  |
| INV-1047 | STEALS — 19 Aug sweep banner | (none) | Twelve steals from the founder's GPT strategy bundle; four mapped to existing ids | RULE | 🔴 logged in red on sight | 19 Aug | RULEBOOK §9 |
| INV-1048 | TOMBSTONED | (none) | Tombstoned rows are BELOW the count markers on purpose — history, not work | RULE | 🪦 uncounted | founder decision 1 Aug, #606 | Do not build, do not count, do not resurrect without a founder order |
| INV-1049 | REFERENCE — STEALS CATALOG | (none) | The main STEALS CATALOG — Alta · ClickUp · Lemlist · Monday · Atlas · Instantly · Clay · Apollo · Apex · Glean · Notion · Hypo · Jack & Jill | IDEA | ledger | (none) | Most entries already map to built/tracked items |
| INV-1050 | REFERENCE — STEALS CATALOG | (none) | 19 AUG HANDOFF-BUNDLE SWEEP — 8 new (655–662) + 4 MAPPED, not duplicated | IDEA | ledger | 19 Aug | Clay→140/243 · J&J onboarding→438 · calibration→439 · positive signals→437 |
| INV-1051 | Footer | (none) | Footer claims "the single complete list (250 items)" | OPERATING | ⚠️ stale figure vs the script-counted Σ660 | (none) | Recorded verbatim as found — not corrected in this pass |

---

# docs/V2-TRACKER.md — future detail + the Founder Idea Bank

> **351 rows** — 282 hand-read narrative and roadmap items plus the **69 Founder Idea Bank rows FI-01 … FI-69**, all present, none duplicated. The V2 historical fence at the top of the source applies to every row from this document and is itself inventoried as a row.

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-1052 | HISTORICAL FENCE | (none) | This page is restored historical roadmap plus future thinking — NOT current truth | RULE | 🚧 HISTORICAL FENCE | 21 Aug | If this page and PRODUCT-RULES / LAUNCH-PAD / PRODUCT-INVENTORY disagree, this page loses |
| INV-1053 | HISTORICAL FENCE | (none) | Seven named classes of known superseded language left in deliberately | HISTORY | superseded | 21 Aug | launch dates · Milla/Vida "coming soon" · 10-step cap · booking "Soon" · old sender architecture · Apollo "retired" · blanket compliance wording |
| INV-1054 | HISTORICAL FENCE | (none) | This fence is a fence, not an edit — the body has NOT been re-fact-checked | RULE | ⚠️ deliberate | founder, 21 Aug |  |
| INV-1055 | RESTORED VERBATIM | (none) | Restored byte-for-byte from git after the 21-Aug S1 cut reduced it to a 690-word skeleton | HISTORY | restored | 21 Aug | Skeleton lives in git history at 346b54dd |
| INV-1056 | AUTHORITY | (none) | Four-doc contract restated — no live status here | RULE | (none) | (none) |  |
| INV-1057 | THE POST-LAUNCH BUILD PHASES | (none) | Phases are triggered by EVIDENCE, never by date | RULE | the one law | 15 Aug | Compiled from a full sweep of every doc in the repo |
| INV-1058 | THE POST-LAUNCH BUILD PHASES | R37 | EVERY FINISHED PHASE IS A DROP — one shipping moment = three content pieces | RULE | founder-ruled | 15 Aug | Drop write-up + card on the-drop.html + LinkedIn post |
| INV-1059 | 20 AUG ADDITIONS | (none) | Rename apollo_consented to the honest name (and ICP.apollo_only_consented) | TASK | Phase 1, first quiet week | 20 Aug | #676 — 28 sites carry the canonical warning comment until then |
| INV-1060 | 20 AUG ADDITIONS | (none) | Testimonial truth sweep — figsy.html carries invented customers | DEFECT | flagged, out of that pass's scope | 20 Aug | May be superseded by the P30 homepage rebuild — check before building |
| INV-1061 | 20 AUG ADDITIONS | H30 | Counsel rider — SCC commitment at dpa.html:296 and the POPIA-first DPA framing | RISK | counsel's, not an agent's | 20 Aug |  |
| INV-1062 | 20 AUG ADDITIONS | (none) | Backup posture — confirm Supabase backup region; decide whether to pay for PITR | TASK | two micro-actions | 20 Aug | PITR tab is beta/unenabled; the site deliberately does not claim it |
| INV-1063 | 20 AUG ADDITIONS | (none) | Per-client retention controls — the site promised a setting that does not exist | DEFECT | deleted 20 Aug, #685 | 20 Aug | Never rebuild the sentence before the feature |
| INV-1064 | 20 AUG ADDITIONS | L2/P47 | Google OAuth verification — the post-submission half is post-launch by nature | TASK | post-launch | 20 Aug | R55 context: #684 |
| INV-1065 | 20 AUG ADDITIONS | #698 | WEBSITE CONSISTENCY PASS — the homepage and the other 28 pages are two different sites | DEFECT | logged, not scheduled | 20 Aug | "lots of inconsistencies" — founder's call which design language wins |
| INV-1066 | 20 AUG ADDITIONS | R60 | DAY 1 POST-LAUNCH — the operating-model session, before any new build | TASK | founder standing order | 20 Aug | "i cant work like this. its slow. it burns. it is not scalable." |
| INV-1067 | 20 AUG ADDITIONS | (none) | /health commit check folded into ship.sh so every deploy self-verifies | TASK | small | 20 Aug | #673 built the endpoint |
| INV-1068 | FIGSY OBSERVABILITY + MODEL ROUTING | R58 | Everything designed; three items built and REVERTED unbuilt on the founder's ruling | ARCHITECTURE | none of this is live | 20 Aug | "all post launch for review" |
| INV-1069 | FIGSY OBSERVABILITY + MODEL ROUTING | (none) | The finding that reorders the thesis — the decision that won a meeting is destroyed by the next rescore | DEFECT | post-launch | 20 Aug | scoring.ts:173 single mutable columns |
| INV-1070 | FIGSY OBSERVABILITY + MODEL ROUTING | (none) | The immutable chain diagram — leads → lead_decisions → approvals/enrollments → replies → bookings | ARCHITECTURE | design only | 20 Aug | Three properties carry it: pin never recomputed · FKs RESTRICT · figsy_replies gains enrollment_id |
| INV-1071 | FIGSY OBSERVABILITY + MODEL ROUTING | (none) | The sequence for review — five ordered groups #686…#696 | ARCHITECTURE | for review, not authorised | 20 Aug |  |
| INV-1072 | FIGSY OBSERVABILITY + MODEL ROUTING | (none) | Decisions only the founder can make — #692 ledger-or-log · #693 taxonomy · #696 quality floors · #689 snapshot-vs-hash | QUESTION | founder decision | 20 Aug |  |
| INV-1073 | FIGSY OBSERVABILITY + MODEL ROUTING | (none) | Two things already true that must not be rebuilt; and Nexus is not the router | RULE | (none) | 20 Aug | #694 — opposites on the tenant fence, must never share a table |
| INV-1074 | FIGSY OBSERVABILITY + MODEL ROUTING | (none) | From the Founder-Operator OS — §09 founder absence mode has no code; §51 would be hand-typed; §55 is an assumption | RISK | (none) | 20 Aug | Only the $4 is a constant (#687) |
| INV-1075 | Phase 0 | #651 | THE CURRENT VERSION'S OWN WORK — the industry/purpose sequencing engine | FEATURE | not a phase gate — ships before/with client #1 | 15 Aug | v1 = templates by industry AND purpose, date-aware cadence, per-campaign depth 3/5/7 |
| INV-1076 | Phase 1 | (none) | PROVE IT — trigger: client #1 in the works → paying | TASK | phase gate | (none) | A22→A23→#550 · #452/#450/#451 · TRAINING_LIVE · #192 · #28b/#559 · #341/#357 via #431 · #647 · #479/#355/#351/#370 · #142/#49/#50 · #415 |
| INV-1077 | Phase 2 | (none) | DEEPEN IT — trigger: client #1 retained, proof accumulating | TASK | phase gate | (none) | #191 · #190 · WhatsApp pings · #212 · #437/#438 · onboarding tour · #233 · Advanced tier #608 · marketing gates |
| INV-1078 | Phase 3 | (none) | COMPOUND IT — trigger: 4 clients · ~400 approvals/mo (the R15/R16 line) | TASK | phase gate | (none) | First hire = customer success · #276/#204 · Lena #145/#293 · Nexus auto-tuning · paid-ads gate · GitHub org migration · #203/#200/#202 |
| INV-1079 | Phase 4 | (none) | SCALE IT — trigger: ~10 clients, real outcome data flowing | TASK | phase gate | (none) | #37–53/#143/#120 · #476 · #141/#59 · the 15 Pieces · #160/#217 · #258 · #475 · #181/#151 |
| INV-1080 | The clean-up shelf | (none) | Settle, don't build — deletes wearing red dots, doc-truth fixes, orphans to re-home | TASK | clean-up | (none) | #431 · #404 · #359/#369; four docs still carry the retired ladder/trial |
| INV-1081 | Decisions only the founder can make | (none) | Six decisions, each blocking one phase item, none blocking launch | QUESTION | founder decision | (none) | Advanced tier price/shape · R2 public posting · analytics provider · inbox pool model · client-API-key vs vendor agreements · B2 |
| INV-1082 | THE THREE-PRODUCT FUTURE | R39 | P1 MANAGED (live) — $4/approved lead, $299 start incl. 100, usage only, we operate | COMMERCIAL | live | founder-ruled 15 Aug | Client never touches sequences — locked |
| INV-1083 | THE THREE-PRODUCT FUTURE | R39 | P2 COACHING — everything in P1 plus a named operator, plays, Nexus auto-tuning ON | COMMERCIAL | the second paid product, price NOT locked | founder-ruled 15 Aug | $8 is the founder's EXAMPLE, not a locked price; usage only, never monthly |
| INV-1084 | THE THREE-PRODUCT FUTURE | R39 | P3 FULL SaaS — monthly + a usage rate, the client operates it themselves | COMMERCIAL | later | founder-ruled 15 Aug | The one subscription in the model; Alta-style visual flow is its client surface |
| INV-1085 | THE THREE-PRODUCT FUTURE | #608 | The 31-Jul two-model lock (Base + Advanced) — kept verbatim, FILLED by R39 | HISTORY | ⛓️ chained | 31 Jul | Advanced is sold before it is built, deliberately |
| INV-1086 | THE THREE-PRODUCT FUTURE | (none) | Candidate content for Advanced — none of it decided | IDEA | undecided | 31 Jul | higher included count · the brain · higher-touch operator time · Nexus auto-tuning |
| INV-1087 | THE THREE-PRODUCT FUTURE | (none) | The open questions, all founder's — price points, more-leads vs more-attention vs more-intelligence | QUESTION | founder decision | 31 Jul | Do not resolve these in code |
| INV-1088 | THE THREE-PRODUCT FUTURE | (none) | The constraint — revenue per client is a throughput dial we operate | COMMERCIAL | (none) | 31 Jul | More approvals need more mailboxes (~$6/mo each) — cheap and linear |
| INV-1089 | AGENT CAPABILITY SPECS | (none) | FIGSY — qualified B2B lead sourcing, the core qualification engine | FEATURE | M0 live/building | founder-locked 9 Jul | Soon: books meetings into calendar (#361) · LinkedIn outreach (#388) |
| INV-1090 | AGENT CAPABILITY SPECS | #427 | Milla — lead intelligence layer, ten named per-lead capabilities | FEATURE | 🔴 M0 build scope | founder-locked 9 Jul | Turns a qualified lead into an understood lead |
| INV-1091 | AGENT CAPABILITY SPECS | #428 | Denise — sales action layer, twelve named capabilities | FEATURE | 🔴 M0 build scope | founder-locked 9 Jul | Boundary R2: FIGSY owns cold→first-reply, Denise owns reply→close |
| INV-1092 | AGENT CAPABILITY SPECS | #429 | Vida — inbound qualification layer, twelve named capabilities | FEATURE | 🔴 M0 build scope | founder-locked 9 Jul | Turns website + WhatsApp visitors into qualified leads |
| INV-1093 | ALTA PARITY | #475 | VOICE / AI calling — the missing channel | FEATURE | 🔴 net-new, non-optional for parity | 21 Jul | Needs a real Vapi integration, consent/recording compliance, a per-minute cost model |
| INV-1094 | ALTA PARITY | #476 | UNIFIED DATA LAYER / shared agent brain — THE moat | ARCHITECTURE | 🔴 net-new | 21 Jul | FIGSY/Milla/Vida/Denise are islands; biggest hole in the docs |
| INV-1095 | ALTA PARITY | (none) | Verdict — on raw capability Alta wins outright today | RISK | (none) | 21 Jul | Our answer is completeness on our three roles + the shared brain, not out-featuring on breadth |
| INV-1096 | JACK & JILL STEAL | (none) | The one lesson — separate understanding from execution | IDEA | parked behind SPRINT line 10 | 10 Jul |  |
| INV-1097 | JACK & JILL STEAL | (none) | What the audit found — FIGSY is NOT the dumb executor the brief assumes | HISTORY | (none) | 10 Jul | The gap is deepening to per-prospect and surfacing it |
| INV-1098 | JACK & JILL STEAL | (none) | Build order (Fable-ruled) — #437 → #438 → #439 → #440 → #442 → #443, #441 anywhere | TASK | parked | 10 Jul | Cheapest-to-real first, NOT the brief's order |
| INV-1099 | JACK & JILL STEAL | (none) | Load-bearing risks (why parked) — sprint bleed · unit economics · autonomous replies · PDL spend · Milla boundary | RISK | parked | 10 Jul |  |
| INV-1100 | MILLA&VIDA FUTURE | (none) | The glide path — managed → co-pilot → self-serve, no migration ever | ARCHITECTURE | (none) | 22 Jul | Only who clicks 👍 approve changes |
| INV-1101 | MILLA&VIDA FUTURE | (none) | Nexus auto-tuning — the per-client brain that sharpens itself | FEATURE | post-build | 22 Jul | Cost model first, same guard as #440 |
| INV-1102 | MILLA&VIDA FUTURE | 2b | WhatsApp client notifications — opt-in pings, never outreach | IDEA | founder idea, logged | 15 Aug | Clients only, never prospects; Meta bans unsolicited B2B, UK PECR treats WhatsApp like SMS |
| INV-1103 | PROJECT 1 POST-LIVE | A2 | MIGRATE TO A COMPANY GITHUB ORG — the first post-live project | TASK | a plan, not a queue | founder-ruled 6 Aug | "the system with 4 docs is insane. so i want to migrate post live." |
| INV-1104 | PROJECT 1 POST-LIVE | (none) | Why an ORG — the company should own its own asset; a fresh org is the only chance of reviving CI | RISK | (none) | 6 Aug | The codebase sits on a personal login that is flagged and getting no support |
| INV-1105 | PROJECT 1 POST-LIVE | (none) | The 30-minute scratch test — FIRST, before anything real moves | GATE | the gate on everything else | 6 Aug | Answers both unknowns: does Actions run, can Railway re-authorize on an org |
| INV-1106 | PROJECT 1 POST-LIVE | (none) | Why the repo transfer is PARKED until after live | RISK | PARKED | 6 Aug | Re-authorizing Railway's GitHub connection is exactly what the flag blocks |
| INV-1107 | PROJECT 1 POST-LIVE | (none) | The target shape — Issues+board · Milestones · Labels incl. live-unverified vs verified · a docs library | ARCHITECTURE | plan | 6 Aug | 🩷-vs-🟢 must survive the move or the whole ladder is lost |
| INV-1108 | PROJECT 1 POST-LIVE | (none) | The sorting rule — "if it has a done it's a card; if it has no done it's a doc" | RULE | founder's own words | 6 Aug | ⚠️ A8 records this shorthand as Claude's formulation, not the founder's words |
| INV-1109 | PROJECT 1 POST-LIVE | (none) | Migration order — scratch test → transfer → only OPEN work becomes cards → one week both | TASK | plan | 6 Aug | Not 592 rows of history |
| INV-1110 | 3. Sending | (none) | This section was wrong and it cost us weeks — sending is not future detail | HISTORY | 🛑 corrected, then superseded 30 Jul | 26 Jul | #211 → #547–#553; D1 amended: our own engine sends, Instantly is warm-up |
| INV-1111 | 3. Sending | (none) | What genuinely remains future — inbox pool management, multi-provider routing, warmup orchestration | FEATURE | future | 26 Jul | #280 |
| INV-1112 | 3b. RECEIVED FROM LAUNCH-PAD | #515 | Milla passwordless sign-in (magic link + SMS) | FEATURE | 🔴 | 26 Jul | Blocked on an SMS provider and the security call on link-only login |
| INV-1113 | 3b. RECEIVED FROM LAUNCH-PAD | #511a–f | Nexus, the whole family — twelve items built and live, all default-deny | FEATURE | built + live | 26 Jul | Auto-tuning depth is where it goes next |
| INV-1114 | 3b. RECEIVED FROM LAUNCH-PAD | (none) | Data-engine widening #450 #451 #452 — fires when the pilot pays | TASK | 🔴 | 26 Jul |  |
| INV-1115 | 3b. RECEIVED FROM LAUNCH-PAD | (none) | #494 qualification gate · #495 ICP versioning · #491 per-cron alerting · #349 · #373/#389 | TASK | not launch-blocking | 26 Jul | #491 was pulled BACK onto LAUNCH-PAD Block C |
| INV-1116 | 3b. RECEIVED FROM LAUNCH-PAD | (none) | The expired 14-day map and the retired money walk → KIND-MASTER history | HISTORY | retired | 26 Jul | Decisions, not roadmap |
| INV-1117 | 4. Old Blocks 3–5 | (none) | The 22-Jul 5-block roadmap superseded as the organizing frame; Block 3–5 detail survives | HISTORY | superseded frame, detail survives | 22 Jul |  |
| INV-1118 | MILLA & VIDA TWO-SIDED | (none) | The two-sided problem marketplace is PARKED — founder decided against | ARCHITECTURE | 🛑 PARKED / SUPERSEDED | 14 Jul | Verdict: one product (FIGSY); borrow J&J ideas as features, not its marketplace shape |
| INV-1119 | MILLA & VIDA TWO-SIDED | (none) | The model — Milla business side · Vida demand side · FIGSY the shared engine | ARCHITECTURE | history | 11 Jul | Do not build |
| INV-1120 | MILLA & VIDA TWO-SIDED | (none) | Decisions 2026-07-11 — layer onto the existing portal; spec now, build after first paying client | HISTORY | history | 11 Jul | Billing: Vida free always; Milla pays per accepted match |
| INV-1121 | MILLA & VIDA TWO-SIDED | #457–#459 | SPEC 1 — Milla business portal, three additive preview-first changes | FEATURE | 🔴 history | 11 Jul | Vida matches never enter lead_pool |
| INV-1122 | MILLA & VIDA TWO-SIDED | #463 | SPEC 2 — Vida demand portal, free, J&J layout in K.I.N.D colours | FEATURE | 🔴 history | 11 Jul | Route-group in the existing app, not a new app |
| INV-1123 | MILLA & VIDA TWO-SIDED | #466/#467 | Login & profile capture — LinkedIn is ONE optional method; company context via intake conversation | FEATURE | 🔴 history, fact-checked | 12 Jul | LinkedIn OIDC returns name/email/photo only; Partner Program is not self-serve |
| INV-1124 | MILLA & VIDA TWO-SIDED | #464 | SPEC 3 — Website two doors | FEATURE | 🔴 history | 11 Jul |  |
| INV-1125 | MILLA & VIDA TWO-SIDED | #465 | SPEC 4 — Admin, read-only Vida ops | FEATURE | 🔴 history | 11 Jul |  |
| INV-1126 | WHAT'S BUILT — MOVED | (none) | 15 Jun — the whole product is live; #502 shipped Company Engine + R1–R20 | HISTORY | history | 15 Jun | PRs #506–#525 redundant → close, don't merge |
| INV-1127 | BUILD & LAUNCH PLAN | (none) | Ship rule for every item — build → verify → founder reviews → "go live" → merge → smoke test | RULE | re-locked | 12 Jun |  |
| INV-1128 | BUILD & LAUNCH PLAN | (none) | PHASE 0a Company Engine + payments → production Mon 15 Jun | HISTORY | done | 12 Jun |  |
| INV-1129 | BUILD & LAUNCH PLAN | (none) | PHASE 0b LAUNCH Fri 19 — the proven live core loop | HISTORY | done | 12 Jun | Superseded by R57: launch is 25 Aug |
| INV-1130 | BUILD & LAUNCH PLAN | (none) | PHASE 2 V2 EXPERIENCE — eight ordered items | HISTORY | post-19 | 12 Jun | Vida bubble · Casey · Notetaker · dashboards · Integrations · Sequence Builder · Smart Inbox · Forms |
| INV-1131 | BUILD & LAUNCH PLAN | (none) | Design-review locks 12–13 Jun — build to the named previews | HISTORY | 🔒 locked | 12–13 Jun | Invoicing: USD · no VAT until benchmark · Stripe-issued |
| INV-1132 | BUILD & LAUNCH PLAN | (none) | PHASE 3 INTELLIGENCE/MOAT (Month 2+) | HISTORY | future | 12 Jun | MCP server · Memory v2 · ICP-that-learns · benchmarks · the 15 Pieces |
| INV-1133 | THE ENGINE | #211 | THE ENGINE is the deliverability/sending architecture — the foundation of the product | ARCHITECTURE | 🟢 spec good, now LAUNCH work not roadmap | 23 Jun, re-scoped 26 Jul | Build-plan phases map to #547–#553 |
| INV-1134 | THE ENGINE | (none) | Decision: INTEGRATE Smartlead, do NOT build the infra | ARCHITECTURE | decided | 23 Jun | Smartlead primary · Instantly fallback · Alta = connect-your-own |
| INV-1135 | THE ENGINE | (none) | The two operational models — A MANAGED (SMB) · B CONNECT-YOUR-OWN (mid-market/enterprise) | ARCHITECTURE | decided | 23 Jun | Segmented by ACV |
| INV-1136 | THE ENGINE | (none) | Five non-negotiable deliverability rules baked into the build | RULE | non-negotiable | 23 Jun | 1 domain per client · never cold from primary · per-client warmup · volume math |
| INV-1137 | THE ENGINE | (none) | Smartlead spec (verified) — REST API, SmartSenders, white-label ~$29/mo/client, Pro ~$94/mo | ARCHITECTURE | verified | 23 Jun |  |
| INV-1138 | THE ENGINE | (none) | BUILD PLAN — six phases from spike to deliverability monitoring | TASK | phases | 23 Jun |  |
| INV-1139 | THE ENGINE | (none) | Open decisions (founder) — confirm Smartlead primary · markup model · migration of Resend clients | QUESTION | founder decision | 23 Jun |  |
| INV-1140 | THE ENGINE | (none) | Still owed by the founder — confirm ~$40/client/mo Smartlead figure; hand over Instantly credentials | QUESTION | owed | 26 Jul | ⚠️ The $40 is retired elsewhere in run-costs as an unconfirmed guess |
| INV-1141 | MARKET STRATEGY | (none) | TWO-TRACK GTM — US/UK/EMEA our own outreach · Africa direct + partners | COMMERCIAL | decided | 25 Jun | Supersedes "Africa-first, US deferred" |
| INV-1142 | MARKET STRATEGY | (none) | The evidence — market size, cold-outreach legality by country, deliverability as the moat | COMMERCIAL | evidence | 25 Jun | Lead with US · UK · IE · FR · NL; Germany/Poland strict |
| INV-1143 | MARKET STRATEGY | (none) | Tool fit — Instantly and Smartlead policies read and VERIFIED | COMMERCIAL | ✅ VERIFIED | 25 Jun | Binding constraints are operational discipline, not capability |
| INV-1144 | MARKET STRATEGY | (none) | The four risks — AI-SDR backlash · no data edge in US/EMEA · deliverability do-or-die · focus dilution | RISK | be honest | 25 Jun |  |
| INV-1145 | MARKET STRATEGY | (none) | How the data layer feeds each track — US/EMEA coverage solved, Africa ~52× thinner, email reveal is the real gap | COMMERCIAL | ⚙️ MEASURED | 25 Jun | PDL: 1,360 SA vs 71,123 US matching people |
| INV-1146 | MARKET STRATEGY | (none) | What it changes in the roadmap — 211+198 rise to the unlock; park the heavy parallel builds | TASK | (none) | 25 Jun |  |
| INV-1147 | MARKET STRATEGY | (none) | PARKED — Qualified.com competitor analysis (Manus) | IDEA | ⏸ PARKED | 25 Jun | Maps to ONE agent (Vida); three cheap wins to mine when revisited |
| INV-1148 | THE SELLER ENGINE | (none) | A partner and an AE are the same primitive — one seller seat, two types | ARCHITECTURE | V2 SPEC, gated post-launch | 18 Jun | seat_type flag: partner_paid or ae_free |
| INV-1149 | THE SELLER ENGINE | #203 | Phase 1 — the commission-engine module, merged, USD, 33 tests, NOT YET WIRED | FEATURE | merged (#666), unwired | 18 Jun |  |
| INV-1150 | THE SELLER ENGINE | (none) | Three surfaces on one foundation — partner portal · AE portal · admin | ARCHITECTURE | spec | 18 Jun |  |
| INV-1151 | THE SELLER ENGINE | (none) | What every seller gets — portal · demo environments · sell-through-the-product · enablement | FEATURE | spec | 18 Jun |  |
| INV-1152 | THE SELLER ENGINE | (none) | The money — partner R47 25% of paid approved-lead spend (current); AE comp plan | COMMERCIAL | ⛓️ R47 current, 20%+5% historical | 19 Aug | Both retention-weighted; earned-when-collected |
| INV-1153 | THE SELLER ENGINE | #202 | The document & legal layer — needed BEFORE issuing seats | GATE | needed first | 18 Jun | AE pack · partner pack · shared clauses · onboarding doc pack |
| INV-1154 | THE SELLER ENGINE | (none) | Payout & reconciliation — earnings from collected MRR, reconciled to the #196 ledger | ARCHITECTURE | spec | 18 Jun |  |
| INV-1155 | THE SELLER ENGINE | (none) | Build phases — seven ordered steps, post-launch, gated on first clients | TASK | gated | 18 Jun |  |
| INV-1156 | THE SELLER ENGINE | (none) | Dependencies / gates — #196 ledger · #197 model · #202 agreements before any seat | GATE | gated | 18 Jun |  |
| INV-1157 | PARTNER GTM | (none) | 3–5 STRONG partners, not 10 thin ones — depth over volume | COMMERCIAL | founder-ruled | 10 Jul | Supersedes "10 in year 1"; recruiting starts AFTER the sprint |
| INV-1158 | PARTNER GTM | (none) | The "strong" bar — four conditions a partner must clear | GATE | founder-ruled | 10 Jul | ≥10 active B2B SMB clients · sells outcomes · 1 pilot in 30 days · weekly cadence |
| INV-1159 | PARTNER GTM | (none) | What 3–5 strong partners are worth — 30–50 retained clients at ~$0 cash CAC | COMMERCIAL | per §5f economics | 10 Jul |  |
| INV-1160 | PARTNER GTM | (none) | The motion, in order — six steps; count ACTIVATED partners, not signups | TASK | founder-led | 10 Jul |  |
| INV-1161 | PARTNER GTM | (none) | Partner ICP and the pitch; channels ranked, STEALTH-CONSTRAINED | COMMERCIAL | ⚠️ stealth | 25 Jun | No founder LinkedIn / no public founder identity |
| INV-1162 | PARTNER PORTAL v2 | #200 | The partner side is substantially built; v2 makes it recruiting-grade | FEATURE | spec | 23 Jun |  |
| INV-1163 | PARTNER PORTAL v2 | #220 | Honest data gap — partner_commissions has no type and no per-client MRR | DEFECT | ⚠️ backend step first | 23 Jun | A split + book-value hero cannot be a frontend skin (the 136a trap) |
| INV-1164 | PARTNER PORTAL v2 | (none) | Slices 0–4 and the think-bigger unicorn layer (#214–#219) | FEATURE | spec | 23 Jun |  |
| INV-1165 | PARTNER PORTAL v2 | #712 | v2 DEMO portal at /partner-preview — 5 tabs, Alex assistant, all labelled demo data | FEATURE | shipped demo | 24 Jun | Next = #220 |
| INV-1166 | RISK & FIX REGISTER | (none) | Full-system audit 10 Jun — RED this week, YELLOW scheduled | RISK | audit | 10 Jun | R1–R11 red · Y1–Y16 yellow |
| INV-1167 | DATA-SOURCE STRATEGY | (none) | The Apollo-risk mitigation — Alta blends 50+ smaller sources, diversification is their answer | COMMERCIAL | background research | 10 Jun | Our path in four ordered steps |
| INV-1168 | DATA-SOURCE STRATEGY | (none) | ACV-segmented data + onboarding decision — bundle for SMB, BYO-key for company/partner | COMMERCIAL | ⚠️ SUPERSEDED 8 Jul | 15 Jun | Pricing is per-qualified-lead; no trials |
| INV-1169 | PART 1 | (none) | Current build status moved to the inventory | OPERATING | moved | (none) |  |
| INV-1170 | PART 2 — WEEK 1 | (none) | Week 1 (Jun 19–28) — 10 items #19–#28 | TASK | history | 12 Jun |  |
| INV-1171 | PART 2 — WEEKS 2–4 | (none) | Weeks 2–4 (Jun 29 – Jul 19) — 17 items #29–#82 | TASK | history | 12 Jun | Includes #34a client invoicing, 🔒 decision locked 13 Jun |
| INV-1172 | THE LEARNING ENGINE | (none) | Two honest truths — "training" ≠ fine-tuning; for cold outreach the model is ~¼ of the result | ARCHITECTURE | strategy | 10 Jun | Targeting > deliverability > timing > copy |
| INV-1173 | THE LEARNING ENGINE | (none) | PHASE 1 — the ROI ladder, six rungs from Context/RAG to fine-tuning | ARCHITECTURE | post-launch | 10 Jun | Fine-tuning is LAST and parked |
| INV-1174 | THE LEARNING ENGINE | (none) | PHASE 2 — contextual bandits; the reward signal already exists in outcome_events | ARCHITECTURE | post-launch | 10 Jun | Thompson sampling; "contextual" is the moat |
| INV-1175 | THE LEARNING ENGINE | (none) | Recall — two memory tiers, per-client and cross-segment (aggregate patterns ONLY) | ARCHITECTURE | post-launch | 10 Jun | POPIA / data-isolation; ⚠️ AR3 Nexus lock forbids cross-client learning |
| INV-1176 | THE LEARNING ENGINE | (none) | Usage patterns — the other reward stream (about the product, not the emails) | ARCHITECTURE | post-launch | 10 Jun |  |
| INV-1177 | THE LEARNING ENGINE | (none) | 2b → 2c — where real model training finally earns it | ARCHITECTURE | much later | 10 Jun | 10k+ labelled outcomes → DPO/RLHF |
| INV-1178 | THE LEARNING ENGINE | (none) | The moat — the African outcome-data flywheel | COMMERCIAL | strategy | 10 Jun | ⚠️ Pre-dates R23/R43 (the ICP and the book are global) |
| INV-1179 | THE LEARNING ENGINE | (none) | Four caveats that break naïve RL — Goodhart · sample size · deliverability confound · feedback delay | RISK | strategy | 10 Jun |  |
| INV-1180 | THE LEARNING ENGINE | (none) | Build order (post-launch) and roadmap integration | TASK | post-launch | 10 Jun |  |
| INV-1181 | MONTH 2 | (none) | Intelligence layer #37–#53, #59 — 15 named items, gated 10+ clients | TASK | GATED | history | #59 MCP server carries the Glean 2.5× insight |
| INV-1182 | MONTH 2 | (none) | V2 portal redesign — V2-3 · V2-8 · V2-10 · V2-11 · V2-12 · #83 · #84 · #89 · Smart Inbox | TASK | built/started per row | history | Status of record → PRODUCT-INVENTORY |
| INV-1183 | MONTH 3 | (none) | Month 3 (GATED margin data) — 11 items #54–#70 | TASK | GATED | history |  |
| INV-1184 | YEAR 2 | (none) | Year 2 (2027 · Enterprise) — 9 items #64–#79 | TASK | GATED | history |  |
| INV-1185 | ONGOING / PARALLEL | (none) | Legal · funding · tech-debt · master cleanup · competitive watch | TASK | ongoing | history |  |
| INV-1186 | GTM & CONTENT ENGINE | (none) | The 3-legged GTM — outbound · content/inbound · partners | COMMERCIAL | founder | 11 Jun | Content is the missing leg and the focus |
| INV-1187 | GTM & CONTENT ENGINE | (none) | Why content isn't optional — content de-risks every cold email; cold resets, content compounds | COMMERCIAL | founder | 11 Jun |  |
| INV-1188 | GTM & CONTENT ENGINE | (none) | The content engine — infra built vs the content itself (founder-produced, faceless) | TASK | 🔴 the content | 11 Jun | Video · brand LinkedIn · blog/SEO · YouTube #35 |
| INV-1189 | GTM & CONTENT ENGINE | (none) | The realistic minimum — a weekly rhythm, two moves | TASK | don't over-scope | 11 Jun |  |
| INV-1190 | GTM & CONTENT ENGINE | (none) | Product Drops = the flywheel; positioning to carry through all content | COMMERCIAL | founder | 11 Jun | ⚠️ "Africa-first" positioning pre-dates R23 |
| INV-1191 | GTM & CONTENT ENGINE | (none) | VIDEO ACTION PLAN — six numbered videos with source material and landing place | TASK | 🧍 bottleneck is RECORDING | 11 Jun |  |
| INV-1192 | MARKETING SITE | (none) | "The Drop" — a product-drop archive, the honest replacement for the hidden roadmap | FEATURE | built + approved | 10 Jun | Cadence rule: never publish empty or stale |
| INV-1193 | MARKETING SITE | (none) | "Watch" / Product Videos — product-videos.html does NOT exist in the repo | DEFECT | ⚠️ corrected 2 Jul | 2 Jul | Status of record = inventory #93 🟣 "Watch held" |
| INV-1194 | MARKETING SITE | (none) | Lean footer — keep it tight, every link a real page | RULE | (none) | 10 Jun |  |
| INV-1195 | MARKETING SITE | (none) | HELD — site-wide nav/footer rewire across ~40 pages | TASK | HELD | 10 Jun | Applied when the founder says wire-it-in |
| INV-1196 | PART 2C — The 15 Pieces | (none) | The 15 Pieces (post-loop-proven build list) plus Revenue Mission Control | FEATURE | gated, most post-20-clients | history | Source: docs/art-of-possible.md |
| INV-1197 | PART 2C — STEALS CATALOG | (none) | The steals catalog by source — 14 named sources and what we take from each | IDEA | ledger | history | Alta · ClickUp · Lemlist · Monday · Atlas · Instantly · Clay · Apollo · Apex · Glean · Revio · Notion · Hypo · Amplemarket |
| INV-1198 | RED-ITEM BOX MAP | (none) | The boxes rule — every box is ONE self-contained independently-shippable PR | RULE | the #502 lesson | history | Build to 🟡 → preview → 🟣 → live → 🩷 → 🟢 |
| INV-1199 | RED-ITEM BOX MAP | (none) | BUILDABLE NOW — boxes B1…B7 with their items and independence rationale | TASK | B7 shipped, B2 partial, rest not started | 16 Jun | Resume order: B2-remainder → B1 → B3 → B5 → B6 → B4 |
| INV-1200 | RED-ITEM BOX MAP | (none) | BLOCKED — nine items, one input unlocks each | TASK | 🔴 blocked | history | 181 · 120 · 121 · 126 · 177 · 184 · 128/136/104 · 116/119 · 178 |
| INV-1201 | RED-ITEM BOX MAP | (none) | BIG EPICS — multi-week boxes sequenced in V2, not "now" | TASK | sequenced | history | ⚡ The effort/input-gated subset was pulled forward 23 Jun |
| INV-1202 | RED-ITEM BOX MAP | (none) | STEAL-SOURCED — 205 · 206 · 207 · 208 · 209 · 210 · 227 | IDEA | buildable-now unless noted | 22 Jun | RULEBOOK §9 |
| INV-1203 | RED-ITEM BOX MAP | (none) | FOUNDER / CONTENT — not a Claude build (11 items) | TASK | 🧍 | history |  |
| INV-1204 | RED-ITEM BOX MAP | (none) | Recommended order (post-launch, ONE PR per box) | TASK | recommendation | history |  |
| INV-1205 | PART 3 — DOC INDEX | (none) | Doc index — stop the sprawl | OPERATING | map | history |  |
| INV-1206 | PART 3 — DOC INDEX | #610 | Multi-mailbox sending (4+ boxes/client) — blocked on the frozen schema | TASK | blocked | 4 Aug | ⚠️ AR6 retired the schema freeze on 6 Aug |
| INV-1207 | THE 25TH CUT — PARKED POST-LIVE | (none) | Every item below failed the one test — does it aid the live state on the 25th? | RULE | PARKED post-live | founder-ordered 21 Aug | None is forgotten; none is worked before launch |
| INV-1208 | THE RUNNING ORDER | order 1 | Founder-Operator OS — the operational fix (incl. hiring / scale triggers) | TASK | FIRST session after launch | founder-set 22 Aug |  |
| INV-1209 | THE RUNNING ORDER | order 2 | Website consistency / cleanup (incl. the Milla + Vida homepage) | TASK | Second session | founder-set 22 Aug |  |
| INV-1210 | THE RUNNING ORDER | order 3 | Forecasting — the numbers we plan against, and what we track | TASK | Ongoing discipline | founder-set 22 Aug |  |
| INV-1211 | THE RUNNING ORDER | order 4 | Founder economics / cashflow calculators refresh (all three together) | TASK | Feeds 3 | founder-set 22 Aug |  |
| INV-1212 | THE RUNNING ORDER | order 5 | Cost / economics audits — Anthropic · Hunter · Stripe · Google | TASK | Feeds 4 | founder-set 22 Aug |  |
| INV-1213 | THE RUNNING ORDER | order 6 | Website intelligence — later | TASK | Improvement | founder-set 22 Aug |  |
| INV-1214 | THE RUNNING ORDER | order 7 | ICP / targeting evolution — later | TASK | Improvement | founder-set 22 Aug |  |
| INV-1215 | THE RUNNING ORDER | order 8 | Proof / acquisition optimisation — later | TASK | Improvement | founder-set 22 Aug |  |
| INV-1216 | THE RUNNING ORDER | order 9 | FIGSY evolution — later | TASK | Improvement | founder-set 22 Aug |  |
| INV-1217 | THE RUNNING ORDER | order 10 | Reply / handoff evolution — later | TASK | Improvement | founder-set 22 Aug |  |
| INV-1218 | THE RUNNING ORDER | order 11 | Vida / operator scaling — later | TASK | Improvement | founder-set 22 Aug |  |
| INV-1219 | Parked builds | P34 | P34's screens — PR #1427, OPEN and PARKED | TASK | OPEN and PARKED | 21 Aug | The merged half #1426 is verified inert in production |
| INV-1220 | Parked builds | P35 | The Proof Pack — founder-only outcomes report in vida/reports | TASK | parked | 21 Aug | HTML only — no PDF lib exists |
| INV-1221 | Parked builds | P36 | Social Intent v1 — client-owned inbound | TASK | parked | 21 Aug | The "employer floor" term correction is already in its prompt |
| INV-1222 | Parked builds | P37 | CRM v1 — HELD harder than parked | TASK | HELD | 21 Aug | Requires the founder to first record R-CRM-DOWNSTREAM in PRODUCT-RULES (verified absent) |
| INV-1223 | Parked builds | P45 | The Warm-Reply Cockpit | TASK | parked | 21 Aug | Must reuse the freebusy LIB, not the two dead calendar routes |
| INV-1224 | Parked builds | P46 | The Bad-Egg Log — alert taxonomy pinned at 9 kinds | TASK | parked | 21 Aug | Ships WITH its nav link |
| INV-1225 | 1. FOUNDER-OPERATOR OS | (none) | The purpose is not a feature — it is to fix how the founder actually operates K.I.N.D | OPERATING | ⛓️ supersedes the one-line PR #1436 entry | 23 Aug | The PR is judged against the operational fix, not simply merged |
| INV-1226 | 1. FOUNDER-OPERATOR OS | (none) | TWO LINKED LAYERS — Company Operating Map and Founder Operating System | ARCHITECTURE | ADOPTED, not research | 23 Aug | An attention layer with nothing underneath becomes a second copy of the company |
| INV-1227 | 1. FOUNDER-OPERATOR OS | (none) | The operating chain — IDEA → RECORD → CLASSIFY → PARK/PRIORITISE → OWNER → ACTION → STATUS → COMPLETION/LEARNING | ARCHITECTURE | adopted | 23 Aug |  |
| INV-1228 | 1. FOUNDER-OPERATOR OS | (none) | The property being built for — one home · one owner · one state · one next action · one trigger · one history trail | RULE | adopted | 23 Aug |  |
| INV-1229 | 1. FOUNDER-OPERATOR OS | (none) | The Founder-Operator OS visual — location corrected, not repeated | DEFECT | ⚠️ verified 22 Aug | 22 Aug | founder-operator-os-v8.html is NOT on main; the .png does not exist anywhere in the repo |
| INV-1230 | 1a. HIRING AND SCALE TRIGGERS | (none) | Six questions the OS must make operational, not merely written down | OPERATING | core operating control | 23 Aug | When the founder stops absorbing · what triggers a hire · which role next · what they own · how ownership moves · the two failure modes |
| INV-1231 | 1a. HIRING AND SCALE TRIGGERS | (none) | The Company Operating Map is also the future org chart | ARCHITECTURE | adopted | 23 Aug | Transfer ownership of a function inside the existing model; do not redesign the company per hire |
| INV-1232 | 1a. HIRING AND SCALE TRIGGERS | (none) | Hire on repeated evidence — six conditions that together justify the transfer | GATE | adopted | 23 Aug |  |
| INV-1233 | 1b. THE OPERATING ARCHITECTURE | (none) | The layered diagram — Founder/CEO → Founder OS/Notion → six systems → Claude/GPT | ARCHITECTURE | adopted, base for pass 1 | 23 Aug |  |
| INV-1234 | 1c. THE SIX SYSTEMS | system 1 | NOTION / FOUNDER OS — where the founder RUNS the company day to day | ARCHITECTURE | adopted | 23 Aug | Owns attention, not every piece of company data; two databases only, Work + Company Functions |
| INV-1235 | 1c. THE SIX SYSTEMS | system 2 | VIDA — the CLIENT operating system, system of record for the client lifecycle | ARCHITECTURE | adopted | 23 Aug | DO NOT build a second CRM in Notion; worked Acme example given |
| INV-1236 | 1c. THE SIX SYSTEMS | system 3 | VIDA — management finance / operating economics | ARCHITECTURE | adopted | 23 Aug | ⚠️ NOT automatically the statutory accounting ledger |
| INV-1237 | 1c. THE SIX SYSTEMS | system 4 | ACCOUNTING / BOOKKEEPING — a separate system owns the books | ARCHITECTURE | adopted | 23 Aug | Vida's operating numbers should reconcile to those actuals |
| INV-1238 | 1c. THE SIX SYSTEMS | system 5 | REPO + GITHUB — product and engineering truth | ARCHITECTURE | adopted | 23 Aug | ⚠️ The repo is NOT the founder's daily operating interface. DOCUMENT EXISTENCE NEVER EQUALS WORKLOAD |
| INV-1239 | 1c. THE SIX SYSTEMS | system 6 | GOOGLE WORKSPACE — communication and calendar reality | ARCHITECTURE | adopted | 23 Aug |  |
| INV-1240 | 1c. THE SIX SYSTEMS | (none) | CLAUDE / GPT — workers and reviewers, never systems of record | RULE | adopted | 23 Aug | The existing merge and review protocol is unchanged |
| INV-1241 | 1c. THE SIX SYSTEMS | (none) | THE FOUNDER HOME / COCKPIT — COMPANY TODAY, then YOUR ATTENTION, then TRIGGERS | ARCHITECTURE | adopted | 23 Aug | Success test: the founder knows what matters without reading the repo tree |
| INV-1242 | 1d. THE COMPANY FUNCTIONS | (none) | Ten functions, each with outcome · truth location · owner today | ARCHITECTURE | adopted | 23 Aug | Strategy · Marketing · Sales · Onboarding · Delivery · Product · Finance · Legal · People · Knowledge |
| INV-1243 | 1d. THE COMPANY FUNCTIONS | (none) | ONE ACCOUNTABLE OWNER PER FUNCTION — support is not co-ownership | RULE | ⛓️ corrected | 23 Aug | Three rows first read "Founder + X"; corrected to one owner with the support relationship named |
| INV-1244 | 1e. DOC-MAP AS SOURCE REGISTRY | (none) | Four classes A/B/C/D for every mapped document and folder | RULE | 🛑 HARD RULE: DOCUMENT EXISTENCE ≠ WORK | 23 Aug | EXECUTION SOURCE · GOVERNING TRUTH · EVIDENCE/REFERENCE · HISTORY/ARCHIVE |
| INV-1245 | 1f. RUNBOOKS | (none) | Runbooks are dormant until their trigger fires | RULE | adopted | 23 Aug | SEND-DAY · BACKUP-RESTORE-DRILL · LEGAL/COMPLIANCE ACTION |
| INV-1246 | 1g. THE FOUNDER EXECUTION QUEUE | (none) | Six priority tiers, live risk first | RULE | adopted | 23 Aug | Nothing enters the queue merely because it exists in a document |
| INV-1247 | 1h. HOW THIS GETS IMPLEMENTED | Pass 1 | DESIGN THE OPERATING MODEL — founder + GPT, walked against ten real scenarios | TASK | pass 1 | 23 Aug | Do not build until the model makes sense to the founder |
| INV-1248 | 1h. HOW THIS GETS IMPLEMENTED | Pass 2 | BUILD THE NOTION SHELL, BY HAND — no heavy automation | TASK | pass 2 | 23 Aug |  |
| INV-1249 | 1h. HOW THIS GETS IMPLEMENTED | Pass 3 | RECONCILE THE EXISTING COMPANY — a Claude READ-ONLY sweep beginning at DOC-MAP | TASK | pass 3 | 23 Aug | Do not import the repo into Notion |
| INV-1250 | 1h. HOW THIS GETS IMPLEMENTED | Pass 4 | MAP VIDA PROPERLY — audit what Vida already holds, identify genuine gaps | TASK | pass 4 | 23 Aug | Do not rebuild existing capability |
| INV-1251 | 1h. HOW THIS GETS IMPLEMENTED | (none) | KNOWN GAP CARRIED INTO PASS 4 — abandoned signup has no Vida record | DEFECT | 🔴 founder-accepted at launch | 24 Aug | Do NOT solve by inserting a partial/placeholder clients row; Pass 4 decides the prospect representation |
| INV-1252 | 1h. HOW THIS GETS IMPLEMENTED | Pass 5 | AUTOMATE ONLY PROVEN MOVEMENTS | TASK | pass 5 | 23 Aug | No clever automation before the manual model works |
| INV-1253 | 1i. DO NOT ADD SOFTWARE | (none) | Do not assume K.I.N.D needs Salesforce · HubSpot · Jira · Monday · Asana · ClickUp | RULE | adopted | 23 Aug |  |
| INV-1254 | 1j. SUCCESS CRITERIA | (none) | Ten success criteria for the redesign | GATE | adopted | 23 Aug |  |
| INV-1255 | 1k. THE CENTRAL OPERATING RULE | (none) | THE UNDERLYING SYSTEMS HOLD THE TRUTH. THE FOUNDER OS TELLS THE FOUNDER WHERE ATTENTION GOES | RULE | adopted | 23 Aug | After the redesign the founder must not need to inspect the repository tree |
| INV-1256 | 2. WEBSITE CONSISTENCY | (none) | One end-to-end pass — messaging, terminology, structure, tone, hierarchy, CTA, pricing, agent descriptions | TASK | second session after launch | 22 Aug | The site is already strong — not a redesign, not pre-launch work |
| INV-1257 | 2a. HOMEPAGE | (none) | Milla + Vida side by side (J&J-style) as the paired core system | IDEA | belongs to the consistency pass | 22 Aug | Comes AFTER the operational fix |
| INV-1258 | 3. FORECASTING | (none) | Contact volume per paying customer — ~250–400 initially, ~100–200 once proof works | MONEY | ⚠️ WORKING PLANNING ASSUMPTION, not proven | 22 Aug |  |
| INV-1259 | 3. FORECASTING | (none) | Acquisition rate — 2–5/mo realistic · 5–10 very good · 10–15 strong; target prove 5/mo | MONEY | planning assumption | 22 Aug |  |
| INV-1260 | 3. FORECASTING | (none) | Free-acquisition economics — $300/mo budget · PDL $0.28 · max 40 records · max $11.20 per prospect | MONEY | fenced by AR17/AR18, live in code | 22 Aug | Pool-first can reduce actual cost |
| INV-1261 | 3. FORECASTING | (none) | Paid-client principle — ceilings are safety, not permanent caps; nothing raises them automatically | RULE | (none) | 22 Aug |  |
| INV-1262 | 3a. THE RULE THAT DECIDES | (none) | Industry benchmarks inform planning; K.I.N.D's own funnel data becomes primary evidence | RULE | (none) | 22 Aug | An external benchmark must never silently replace it |
| INV-1263 | 3b. WHAT WE TRACK | (none) | K.I.N.D's own funnel — sixteen named metrics | OPERATING | the primary evidence | 22 Aug |  |
| INV-1264 | 3c. MONTHLY BENCHMARK TRACKING | (none) | Six industry benchmarks tracked monthly, with the translation written down | OPERATING | the secondary evidence | 22 Aug |  |
| INV-1265 | 4. CALCULATORS REFRESH | (none) | Refresh all three calculators TOGETHER against verified current economics | TASK | ⚠️ current outputs are NOT canon until this is done | 22 Aug | AE commission · partner · team P&L; they share inputs |
| INV-1266 | 5. COST / ECONOMICS AUDITS | (none) | Four audits that turn the UNKNOWNs into numbers — Anthropic · Hunter · Stripe · Google/mailbox | TASK | post-live | 22 Aug |  |
| INV-1267 | 6. WEBSITE INTELLIGENCE — LATER | (none) | Website intelligence beyond targeting · case-study extraction · automated contradiction detection | IDEA | LATER | 22 Aug | /icps/prefill reads the site once and stores nothing |
| INV-1268 | 7. ICP / TARGETING EVOLUTION — LATER | (none) | ICP version history · multiple ICPs/campaigns · richer negative targeting · richer geography · job-function targeting | IDEA | LATER | 22 Aug | There is still NO exclusion field of any kind in the ICP |
| INV-1269 | 8. PROOF / ACQUISITION OPTIMISATION — LATER | (none) | Proof conversion analytics · trial scoring · adaptive batch sizing · acquisition-cost optimisation | IDEA | LATER | 22 Aug | ⚠️ The launch rule 20 → one refinement → 20 → a human does NOT change now |
| INV-1270 | 9. FIGSY EVOLUTION — LATER | (none) | Regeneration of frozen sequence copy · operator copy editing | IDEA | LATER | 22 Aug | Copy is written at enrolment and kept; Vida can Release or Reject but not edit |
| INV-1271 | 10. REPLY / HANDOFF EVOLUTION — LATER | (none) | Autonomous reply handling · advanced automated outcome handoff | IDEA | LATER | 22 Aug | ⚠️ Launch stays: any reply stops the sequence, a K.I.N.D human takes over |
| INV-1272 | 11. VIDA / OPERATOR SCALING — LATER | (none) | Deeper operator tooling · readiness scoring · scaling the human layer · operator scaling automation | IDEA | LATER | 22 Aug | Everything above assumes the founder is the operator |
| INV-1273 | Smaller parked items | (none) | W1 phases 2–3 · welcome-transcript capture · brief-message removal control · the email morning-brief's two defects | TASK | parked, none urgent | 21 Aug | en-ZA locale contradicts R62; button points at the retired /dashboard |
| INV-1274 | Cleanups from the 21-Aug verification | (none) | Retire or fence the old /dashboard page family | DEFECT | structural finding | 21 Aug | Reachable only by typed URL; the layer that keeps misleading build prompts |
| INV-1275 | Cleanups from the 21-Aug verification | (none) | Review the ~40 orphan endpoints no screen calls | DEFECT | structural finding | 21 Aug | scripts/dead-surfaces.sh is the catalogue |
| INV-1276 | 23 AUG IDEA BANK | (none) | Logging an idea does not adopt it — the founder must explicitly decide | RULE | research bank | 23 Aug | Interesting does not mean roadmap |
| INV-1277 | 23 AUG IDEA BANK | (none) | ⚠️ This bank is NOT the numbered ladder and must never be read as an extension of it | RULE | research only | 23 Aug | Nothing here has a priority, a date, an owner or an approved build |
| INV-1278 | The decision filter | (none) | RESEARCH → DISCUSS → CHALLENGE → FILTER THE NOISE → THE FOUNDER DECIDES: ADOPT OR REJECT | RULE | the filter | 23 Aug | Must materially improve REVENUE · RETENTION · EXPANSION · SYSTEM QUALITY |
| INV-1279 | 1. CALENDAR / MEETINGS | 1.1 | Calendar connection is hidden in Settings | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1280 | 1. CALENDAR / MEETINGS | 1.2 | Keep the Meetings list, and explore a calendar view beside it | IDEA | NOT ADOPTED | 23 Aug | ⚠️ Record no assumption that the list view should be replaced |
| INV-1281 | 1. CALENDAR / MEETINGS | 1.3 | Meetings as an outcome surface | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1282 | 2. GUIDED NEW-CLIENT ONBOARDING | 2 | Use real product actions to get the client operational — not a product tour | IDEA | NOT ADOPTED | 23 Aug | ⚠️ Do NOT turn this into a hard technical gate |
| INV-1283 | 3. GLEAN.COM | 3 | Glean is research and inspiration, NOT authority | RULE | ⚠️ not roadmap authority | 23 Aug | Central hypothesis: THE CLIENT SHOULD FEEL THE OUTCOME, NOT THE MACHINERY |
| INV-1284 | 3. GLEAN.COM | 3.1 | Context as a possible moat — Milla's accumulated understanding as an enduring context layer | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1285 | 3. GLEAN.COM | 3.2 | One obvious front door — whether Milla increasingly feels like the natural way in | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1286 | 3. GLEAN.COM | 3.3 | Stage-aware home / next action | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1287 | 3. GLEAN.COM | 3.4 | Guided real onboarding — people may understand a product by accomplishing real work | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1288 | 3. GLEAN.COM | 3.5 | Meetings as visible value | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1289 | 3. GLEAN.COM | 3.6 | One continuous journey across the whole chain | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1290 | 3. GLEAN.COM | 3.7 | Progressive disclosure — keep the machinery underneath | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1291 | 3. GLEAN.COM | 3.8 | Human-in-the-loop as a strength — changes no current control rule | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1292 | 3. GLEAN.COM | 3.9 | Visible value / proof — never invent proof, never use a name without permission | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1293 | 3. GLEAN.COM | 3.10 | Same context across capabilities — avoid isolated intelligence silos | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1294 | 3. GLEAN.COM | 3.11 | Website — lead with the proposition, not the plumbing | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1295 | 3. GLEAN.COM | 3.12 | Website — real product visuals rather than generic AI/SaaS artwork | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1296 | 3. GLEAN.COM | 3.13 | Proof architecture — measurable outcomes as a storytelling layer | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1297 | 3. GLEAN.COM | 3.14 | Start narrow; expand only from the core loop | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1298 | 3. GLEAN.COM | 3.15 | Land and expand — depth in an existing client | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1299 | 3. GLEAN.COM | 3.16 | K.I.N.D runs on K.I.N.D — dogfooding is learning evidence, not customer proof | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1300 | 3. GLEAN.COM | 3.17 | Visible product momentum — no fixed cadence, never change to demonstrate activity | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1301 | 3. GLEAN.COM | 3.18 | Work where the user already is | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1302 | 3. GLEAN.COM | 3.19 | WHAT NOT TO COPY — recorded explicitly, because the temptation is the point | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1303 | 3. GLEAN.COM | 3.20 | Complexity caution — simplicity may need to be a hard product constraint | IDEA | NOT ADOPTED | 23 Aug |  |
| INV-1304 | 4. OBSERVED LIVE — MILLA | 4 | Milla's "lost that response" appears, then the answer arrives anyway | DEFECT | ⚠️ NOT AN IDEA — a defect observed on a real journey | 25 Aug | millaReplyFailed() 503 retryable; what recovered it is NOT known. Post-launch UX/reliability debt |
| INV-1305 | 5. OBSERVED LIVE — PASS-2 DESK | 5.1 | The "What's off about this batch?" control is tiny and disconnected | DEFECT | not a launch blocker | 25 Aug | All four items are presentation; none changes what the server does |
| INV-1306 | 5. OBSERVED LIVE — PASS-2 DESK | 5.2 | Duplicate-submit and recovery behaviour — unestablished | DEFECT | unestablished | 25 Aug | Chains §4 |
| INV-1307 | 5. OBSERVED LIVE — PASS-2 DESK | 5.3 | Incident-specific Hunter credit audit — NOT DONE | TASK | NOT DONE | 25 Aug | An assumption is not an audit |
| INV-1308 | 5. OBSERVED LIVE — PASS-2 DESK | 5.4 | PDL within-run backfill — an open economic question | QUESTION | no decision taken | 25 Aug | Buy more to reach the cap, or deliver short? Both cost something |
| INV-1309 | 5. OBSERVED LIVE — PASS-2 DESK | 5.5 | PDL skip / rejection instrumentation — nothing records WHICH gate ate them | DEFECT | open | 25 Aug | skipped is counted in runIcpJob and never written to icp_run_outcomes |
| INV-1310 | 5. OBSERVED LIVE — PASS-2 DESK | 5.6 | Willingness-to-pay and value perception | TASK | research only | 25 Aug | Feeds LAUNCH-PAD M5/M6; PR1's $299 lock stands |
| INV-1311 | 6. COMMERCIAL SHAPE | 6.1 | Should Milla recommend a VOLUME and a SPEND, not just targeting? | IDEA | IDEA, NOT DECISION | 25 Aug | Every open question is open; nothing designed, nothing approved |
| INV-1312 | 6. COMMERCIAL SHAPE | 6.2 | The long-term move away from a flat $299 entry | IDEA | ⚠️ NOT a pricing proposal | 25 Aug | A standing instruction to re-examine once there is data |
| INV-1313 | 6. COMMERCIAL SHAPE | 6.3 | CRM REACTIVATION — the client's own dead pipeline as a lead source | IDEA | not designed | 25 Aug | Removes ONE cost category, never makes a lead free; pricing not decided |
| INV-1314 | 6. COMMERCIAL SHAPE | 6.3b | CRM SUPPRESSION / ADVISOR INTELLIGENCE | IDEA | not designed, not built | 25 Aug | A safety lever before it is a margin lever |
| INV-1315 | 6. COMMERCIAL SHAPE | 6.4 | V2 SOCIAL / INTENT SIGNALS | IDEA | not priced, not designed, not built | 25 Aug |  |
| INV-1316 | 6. COMMERCIAL SHAPE | 6.5 | MUCH LATER — explore removing the $299 upfront fee entirely | IDEA | ⚠️ NOT a plan and NOT a proposal | 25 Aug | The $299 is founder-locked (PR1) |
| INV-1317 | 6. COMMERCIAL SHAPE | 6.6 | THE POST-LAUNCH MARGIN LEVERS — six, in one place | IDEA | none priced, designed or approved | 25 Aug | CRM reactivation · reusable inventory · sourcing efficiency · intent signals · retention · premium expansion |
| INV-1318 | 6b. THREE MORE | 6b.1 | A shared agent-identity registry so Milla and FIGSY cannot drift screen by screen | IDEA | nothing designed, nothing built | 24–25 Aug | The risk is structural — surfaces hard-code their own agent assets |
| INV-1319 | 6b. THREE MORE | 6b.2 | check.sh / workspace preflight — an unbuilt package dist masquerades as hundreds of TS errors | DEFECT | logged, not built | 24–25 Aug | Costs debugging time on the one gate the repo has |
| INV-1320 | 6b. THREE MORE | 6b.3 | Conversational refinement after launch, once it is safe | IDEA | deliberately after launch | 26 Aug | Widens what a client can change without a human seeing it |
| INV-1321 | 7. THE FOUNDER OPERATING MODEL | 7 | ⚠️ This is NOT the Founder OS product — do not confuse the two | RULE | post-launch action #1 | 26 Aug |  |
| INV-1322 | 7. THE FOUNDER OPERATING MODEL | 7.1 | What the operating model has to cover — nineteen named areas | OPERATING | post-launch | 26 Aug | Most authority is ALREADY RULED — R65, Protocol r20, R61, R60 |
| INV-1323 | 7. THE FOUNDER OPERATING MODEL | 7.2 | Artefacts to locate and reconcile BEFORE anything is rebuilt | TASK | ⚠️ verified 26 Aug: none are in the repo | 26 Aug | Founder OS html · os-v8.png · company operating map · partner earnings page · partner calculator |
| INV-1324 | 7. THE FOUNDER OPERATING MODEL | 7.3 | MUCH LATER — Founder OS as a commercial product | IDEA | not a launch item, not costed | 26 Aug | Explicitly excluded from launch economics |
| INV-1325 | THE IDEA-BANK CLOSING RULE | (none) | K.I.N.D does not change for the sake of changing | RULE | closing rule | 23 Aug | None of research/competitors/interfaces justifies ADOPTION by itself |
| INV-1326 | NOTHING ABOVE IS LAUNCH SCOPE | (none) | Every item on this page is parked; launch remains exactly ten named things | RULE | 🛑 founder-restated | 22 Aug | "correctness and control matter more than automation" |
| INV-1327 | THE FOUNDER IDEA BANK | (none) | Why this section exists — 69 ideas that existed only in chat | RULE | master control record | 27 Aug | A ruling that lives only in a transcript will be contradicted |
| INV-1328 | THE FOUNDER IDEA BANK | (none) | This section sits below the "nothing above is launch scope" line and does NOT inherit it | RULE | ⚠️ two kinds of item | 27 Aug | LAUNCH-CURRENT: FI-10/11/12 (owned in LAUNCH-PAD T10/T11/T12) · POST-LAUNCH: every other FI |
| INV-1329 | THE FOUNDER IDEA BANK | (none) | NOTHING HERE IS BUILT — every entry is LOGGED, not started | RULE | ⚠️ | 27 Aug |  |
| INV-1330 | THE FOUNDER IDEA BANK | (none) | The programme commercial model (FI-26…FI-45) CONTRADICTS the current locked pricing | CONFLICT | both preserved | 27 Aug | The reconciliation is R74, and it is a founder decision |
| INV-1331 | THE FOUNDER IDEA BANK | (none) | Verified tally — FOUND 7 · PARTIAL 15 · MISSING 39 · CONFLICT 1 · SUPERSEDED 7 = 69 | OPERATING | verified, no duplicates | 27 Aug | ⛓️ Corrected from 5 conflicts to 1 on founder review |
| INV-1332 | I · PROGRAMME COMMERCIAL MODEL | (none) | THE PRICING CHRONOLOGY — three registers, not three options | RULE | ⛓️ chronology | 27 Aug | LIVE NOW legacy · SUPERSEDED HISTORY (R68 $4→$8) · CURRENT DIRECTION (programme, unimplemented) |
| INV-1333 | The "do not change pricing yet" reconciliation | (none) | The 27 Aug instruction was scoped to PR1A and PR2, not a decision to keep flat-$4 | RULE | ⛓️ reconciliation | 27 Aug | Both statements are true at once, in different registers |
| INV-1334 | A · SOURCING — post-launch / V2 | FI-01 | Sourcing attainment — OBSERVED / OPERATIONAL. Today roughly 7 sourced → 1 usable/accepted. Post… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) · run-costs-and-cashflow.md |
| INV-1335 | A · SOURCING — post-launch / V2 | FI-02 | Vida Lead Pool operator view — counts · filters · provenance · usability · contactability · wha… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1336 | A · SOURCING — post-launch / V2 | FI-03 | Vida suppression / DNC visibility — operator view of suppression, DNC and opt-out state/invento… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1337 | A · SOURCING — post-launch / V2 | FI-04 | Acquisition-memory operator visibility. Keep acquisition_memory, the reusable serving pool and … | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1338 | A · SOURCING — post-launch / V2 | FI-05 | Future sourcing architecture. Pool first → Apollo when it can produce a complete usable lead ch… | FEATURE | PARTIAL | 27 Aug | Canonical home: V2 (here) · PRODUCT-RULES R49, R73 |
| INV-1339 | A · SOURCING — post-launch / V2 | FI-06 | Apollo economics planning case. 1,050 contacted · Apollo $65/mo · 2,500 credits · 1 contactable… | FEATURE | MISSING | 27 Aug | Canonical home: run-costs-and-cashflow.md ← detail · V2 (here) ← index |
| INV-1340 | A · SOURCING — post-launch / V2 | FI-07 | Post-launch Apollo optimisation — as an optimisation source, a search/discovery source, and a c… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1341 | A · SOURCING — post-launch / V2 | FI-08 | Provider-neutral routing on cost · completeness · geography · reliability · actual usable outpu… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1342 | A · SOURCING — post-launch / V2 | FI-09 | Additional future acquisition sources — LinkedIn · social · YouTube · other public/intent sourc… | FEATURE | PARTIAL | 27 Aug | Canonical home: V2 (here) · V2 §data-engine widening (#452) |
| INV-1343 | B · LAUNCH / PROOF / OPERATING | FI-10 | Recurrent proof runtime failure — the full path: proof claim → job dispatch → pool lookup → pai… | TASK | PARTIAL | 27 Aug | Canonical home: LAUNCH-PAD ← current work · PRODUCT-RULES R72③ |
| INV-1344 | B · LAUNCH / PROOF / OPERATING | FI-11 | Paid-provider go-live rule. PAID_PROVIDERS_ENABLED stays OFF through safe proof testing. Before… | TASK | MISSING | 27 Aug | Canonical home: LAUNCH-PAD · PRODUCT-RULES R66 |
| INV-1345 | B · LAUNCH / PROOF / OPERATING | FI-12 | Pre-launch cleanup — delete fake/test accounts and data so production starts clean. First: audi… | TASK | PARTIAL | 27 Aug | Canonical home: LAUNCH-PAD · SEED-WIPE-PLAN.md |
| INV-1346 | C · FUNNEL / PREMIUM PRODUCT | FI-13 | Booked → paying conversion tracking, for both K.I.N.D acquisition and client programmes: accept… | FEATURE | PARTIAL | 27 Aug | Canonical home: PRODUCT-RULES R69 · V2 (here) |
| INV-1347 | C · FUNNEL / PREMIUM PRODUCT | FI-14 | 15% booked → paying. Planning hypothesis only — must NOT be locked as a benchmark. | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1348 | C · FUNNEL / PREMIUM PRODUCT | FI-15 | Premium conversion-coaching product. Core K.I.N.D = targeting → approved leads → outreach → boo… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1349 | C · FUNNEL / PREMIUM PRODUCT | FI-16 | Milla/AI conversion coaching — diagnose funnel leakage · learn which ICPs, messages and meeting… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1350 | D · GLEAN / CONTEXT / MULTI-PLAYER AI | FI-17 | Glean investigation as a possible context layer under Milla — internal K.I.N.D knowledge, later… | IDEA | PARTIAL | 27 Aug | Canonical home: V2 §competitor bank · V2 (here) |
| INV-1351 | D · GLEAN / CONTEXT / MULTI-PLAYER AI | FI-18 | K.I.N.D Multi-player AI (VERY IMPORTANT V2/PREMIUM). A team workspace where multiple humans and… | IDEA | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1352 | D · GLEAN / CONTEXT / MULTI-PLAYER AI | FI-19 | Multi-player AI core features — interactive dashboard · proactive task management · team chat ·… | IDEA | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1353 | E · MODEL ROUTING / AI ECONOMICS | FI-20 | Internal model routing — cheaper/faster models for routine work; frontier models where intellig… | ARCHITECTURE | FOUND | 27 Aug | Canonical home: V2 §"FIGSY observability + model routing" (R58, 20 Aug) |
| INV-1354 | E · MODEL ROUTING / AI ECONOMICS | FI-21 | AI economics controls — retrieval-first context · caching · context reuse · token budgets · esc… | ARCHITECTURE | PARTIAL | 27 Aug | Canonical home: V2 §R58 · V2 (here) |
| INV-1355 | F · ENGINEERING OPS | FI-22 | CodeRabbit evaluation as an independent second machine reviewer after Claude-generated PRs. Ass… | TASK | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1356 | G · MILLA VOICE | FI-23 | Milla voice — speech-to-text · spoken responses · seamless voice/text switching inside the same… | FEATURE | PARTIAL | 27 Aug | Canonical home: V2 #475 (voice / AI calling) · V2 (here) |
| INV-1357 | H · SLACK | FI-24 | Slack integration (initial idea) — internal communication layer for operational events, alerts,… | IDEA | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1358 | H · SLACK | FI-25 | Slack as the primary interaction layer (stronger direction). Clients and internal team talk to … | IDEA | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1359 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-26 | Programme pricing anchored around ~$450 per targeted booked meeting, replacing flat $4/approved… | COMMERCIAL | MISSING | 27 Aug | Canonical home: PRODUCT-RULES R74 · V2 (here) |
| INV-1360 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-27 | Automatic volume discounts at higher programme volume. Normal flow must not depend on manual ne… | COMMERCIAL | MISSING | 27 Aug | Canonical home: PRODUCT-RULES R74 |
| INV-1361 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-28 | Contribution-margin protection ≈ 70%, eventually a real money guard, not spreadsheet commentary… | COMMERCIAL | MISSING | 27 Aug | Canonical home: run-costs-and-cashflow.md · V2 (here) |
| INV-1362 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-29 | Commercial sourcing assumption = 1:1 (1 provider result ≈ 1 usable/contacted lead). Supersedes … | COMMERCIAL | SUPERSEDED | 27 Aug | Canonical home: run-costs-and-cashflow.md · V2 (here) |
| INV-1363 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-30 | Milla meeting target — the client tells Milla how many targeted booked meetings they want. | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1364 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-31 | Starting recommendation: 250 leads per targeted booked meeting (10 meetings → ~2,500 leads). No… | COMMERCIAL | CONFLICT | 27 Aug | Canonical home: PRODUCT-RULES R69, R74 · V2 (here) |
| INV-1365 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-32 | Client-specific learning — replace the seed benchmark with the client's actual lead→booked perf… | COMMERCIAL | FOUND | 27 Aug | Canonical home: PRODUCT-RULES R69 |
| INV-1366 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-33 | Performance deterioration → stop/review. Never blindly recommend more spend. | COMMERCIAL | FOUND | 27 Aug | Canonical home: PRODUCT-RULES R69 |
| INV-1367 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-34 | Benchmark transparency — show the starting benchmark and the client's actual benchmark. | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1368 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-35 | Client-facing programme calculator — targeted meetings · recommended leads · automated discount… | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1369 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-36 | 50/50 payment — 50% upfront authorises bounded sourcing/preparation; 50% at Approve & Go Live. | COMMERCIAL | MISSING | 27 Aug | Canonical home: PRODUCT-RULES R74 · V2 (here) |
| INV-1370 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-37 | Programme-level approval — one approval, not thousands of individual paid-lead approvals. | COMMERCIAL | SUPERSEDED | 27 Aug | Canonical home: PRODUCT-RULES R74 |
| INV-1371 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-38 | Controlled execution batches after Go Live, ~250 leads, batch size configurable. | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1372 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-39 | Batch progression — healthy batch continues automatically; material problem auto-pauses for rev… | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1373 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-40 | Client Pause Programme control — must stop sourcing and sending. | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1374 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-41 | Material ICP change auto-pauses future sourcing until reconfirmed or reviewed. | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1375 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-42 | Programme authority — no sourcing or spend outside explicit programme authority. | COMMERCIAL | PARTIAL | 27 Aug | Canonical home: V2 (here) · PR #1459 |
| INV-1376 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-43 | Unused programme value never expires. | COMMERCIAL | PARTIAL | 27 Aug | Canonical home: V2 (here) |
| INV-1377 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-44 | Refund/payment boundary — first 50% non-refundable once sourcing is authorised; second 50% not … | COMMERCIAL | MISSING | 27 Aug | Canonical home: PRODUCT-RULES R74 · legal sweep FI-56 |
| INV-1378 | I · PROGRAMME COMMERCIAL MODEL — current unbuilt direction | FI-45 | If K.I.N.D cannot deliver authorised undelivered value, make the client whole for it. | COMMERCIAL | MISSING | 27 Aug | Canonical home: PRODUCT-RULES R74 · FI-56 |
| INV-1379 | J · MEETING TRUTH / CALENDAR | FI-46 | Booked and Held are separate metrics. | FEATURE | PARTIAL | 27 Aug | Canonical home: PRODUCT-RULES R69 · V2 (here) |
| INV-1380 | J · MEETING TRUTH / CALENDAR | FI-47 | New state: Booked — unverified (prospect agreed a date/time, no native verification). | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1381 | J · MEETING TRUTH / CALENDAR | FI-48 | Meeting counting rules — reschedules count once · duplicates, spam and outside-ICP do not count… | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1382 | J · MEETING TRUTH / CALENDAR | FI-49 | Native Microsoft/Outlook calendar support. | FEATURE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1383 | J · MEETING TRUTH / CALENDAR | FI-50 | Other calendars — client booking-link fallback where native support is unavailable. | FEATURE | PARTIAL | 27 Aug | Canonical home: V2 (here) |
| INV-1384 | J · MEETING TRUTH / CALENDAR | FI-51 | Manual meeting confirmation — client can later mark Held or No-show. | FEATURE | PARTIAL | 27 Aug | Canonical home: V2 (here) |
| INV-1385 | K · MILLA / VIDA PRODUCT SURFACES | FI-52 | Proof Pass-2 exhaustion must create a real Vida/human handoff, not customer-facing copy alone. | EXPERIENCE | PARTIAL | 27 Aug | Canonical home: PR #1460 (open, unmerged) · PRODUCT-RULES R72 |
| INV-1386 | K · MILLA / VIDA PRODUCT SURFACES | FI-53 | Preserve the Milla Jack-and-Jill conversational shell. Programme actions execute around the con… | EXPERIENCE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1387 | K · MILLA / VIDA PRODUCT SURFACES | FI-54 | Preserve the Vida conversational/operator shell; add evidence and controls around it. | EXPERIENCE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1388 | K · MILLA / VIDA PRODUCT SURFACES | FI-55 | Vida programme cockpit — programme state · batch state · payment state · remaining programme va… | EXPERIENCE | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1389 | L · PUBLIC / PRODUCT TRUTH SWEEP | FI-56 | Full-system sweep when the programme model is implemented — website pricing · public calculator… | TASK | MISSING | 27 Aug | Canonical home: V2 (here) |
| INV-1390 | L · PUBLIC / PRODUCT TRUTH SWEEP | FI-57 | Re-record the demo video — the current Pick / Not-a-fit + $4 paid flow becomes false under the … | TASK | MISSING | 27 Aug | Canonical home: V2 (here) · RECORDING-SHOOTING-SCRIPT.md |
| INV-1391 | M · PARTNER | FI-58 | Partner commission = 25% of programme CONTRIBUTION, not of gross programme revenue. | COMMERCIAL | MISSING | 27 Aug | Canonical home: PRODUCT-RULES R74 · R47 ← legacy |
| INV-1392 | M · PARTNER | FI-59 | "Programme contribution" must be defined explicitly before implementation. Not invented here. | COMMERCIAL | MISSING | 27 Aug | Canonical home: V2 (here) · PRODUCT-RULES R74 |
| INV-1393 | N · LAUNCH PROVIDER TRUTH | FI-60 | PDL remains the launch external sourcing provider. | ARCHITECTURE | FOUND | 27 Aug | Canonical home: PRODUCT-RULES AR5 |
| INV-1394 | N · LAUNCH PROVIDER TRUTH | FI-61 | Apollo live API remains parked for launch. | ARCHITECTURE | FOUND | 27 Aug | Canonical home: PRODUCT-RULES AR5 · R66 |
| INV-1395 | N · LAUNCH PROVIDER TRUTH | FI-62 | Eligible K.I.N.D-owned Apollo pool data remains usable under normal geography, provenance, qual… | ARCHITECTURE | FOUND | 27 Aug | Canonical home: PRODUCT-RULES R73 |
| INV-1396 | O · VALUE PROPOSITION / RECOMMENDATIONS | FI-63 | BDR comparison — K.I.N.D is sales capacity the customer funds upfront. Never imply guaranteed m… | COMMERCIAL | PARTIAL | 27 Aug | Canonical home: V2 (here) · PRODUCT-RULES R69 |
| INV-1397 | O · VALUE PROPOSITION / RECOMMENDATIONS | FI-64 | Evidence-driven recommendations — increasingly client-specific rather than generic industry ass… | COMMERCIAL | FOUND | 27 Aug | Canonical home: PRODUCT-RULES R71 |
| INV-1398 | P · EXPLICITLY SUPERSEDED — preserve as history, do not build | FI-65 | Individual paid-lead Accept → charge at live scale | HISTORY | FI-37 (one programme-level approval) | 27 Aug | Canonical home: The per-lead charge (try_charge_wallet) is still current tru |
| INV-1399 | P · EXPLICITLY SUPERSEDED — preserve as history, do not build | FI-66 | One-by-one replacement approval at live scale | HISTORY | FI-38/FI-39 (controlled batches, auto-progression) | 27 Aug | Canonical home: (none) |
| INV-1400 | P · EXPLICITLY SUPERSEDED — preserve as history, do not build | FI-67 | The old 7:1 / 2:1 sourcing assumptions as *commercial planning* inputs | HISTORY | FI-29 (1:1 for commercial planning) | 27 Aug | Canonical home: ⚠️ Superseded as a planning input only. The 2:1 in code (PAC |
| INV-1401 | P · EXPLICITLY SUPERSEDED — preserve as history, do not build | FI-68 | Flat $4 pricing at all volumes — the commercial *architecture* | HISTORY | FI-26/FI-27 (programme price + automatic volume discounts) | 27 Aug | Canonical home: ⚠️ LEAD_PRICE_USD = 4 IS STILL LIVE LEGACY RUNTIME and stays |
| INV-1402 | P · EXPLICITLY SUPERSEDED — preserve as history, do not build | FI-69 | Source-first / pay-on-outcome mechanics | HISTORY | FI-36 (50/50 authorised programme) | 27 Aug | Canonical home: (none) |

---

# docs/client-flow-sop.md — the client-flow SOP

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-1403 | TRUTH BANNER | (none) | A full sweep found 15 of 17 factual claims FALSE on this page | DEFECT | ⚠️ TRUTH BANNER | 6 Aug 2026, #629 | This page has been wrong for weeks and may still be wrong where the sweep missed |
| INV-1404 | TRUTH BANNER | (none) | Price — $299 first purchase, 100 approved leads included, then $4; reviewing is FREE | MONEY | THE TRUTH (source of record) | 6 Aug | → packages/shared/src/constants/index.ts |
| INV-1405 | TRUTH BANNER | (none) | No trial, no freebies — signup writes paused with a $0 wallet and $0 sourcing allowance | MONEY | THE TRUTH | 6 Aug, #607 (1 Aug) | No "free to start", no card-free trial, no 14-day clock |
| INV-1406 | TRUTH BANNER | (none) | The retired ladder ($1 reveal → +$3 → +$1 Milla → +$1 Denise → Vida $3) is DEAD | HISTORY | DEAD, superseded 24 Jul | 6 Aug | Any page still quoting it describes a model we do not sell |
| INV-1407 | TRUTH BANNER | (none) | Who sends — OUR OWN ENGINE over SMTP; Instantly warm-up only; Smartlead deferred and unproven | ARCHITECTURE | THE TRUTH | 6 Aug | Resend carries system mail + the inbound reply webhook only |
| INV-1408 | TRUTH BANNER | (none) | Flutterwave / Paystack — never wired / removed. Stripe only | MONEY | THE TRUTH | 6 Aug |  |
| INV-1409 | TRUTH BANNER | (none) | Why this banner exists — "i have not read a doc for 2 weeks because i dont trust it" | HISTORY | founder | 6 Aug |  |
| INV-1410 | Header | (none) | Last-checked 1 Jul 2026; the 7 signup/billing paths further down are unchanged | OPERATING | ⚠️ stale note | 1 Jul | Its own note describes per-qualified-lead pricing, itself retired |
| INV-1411 | Header | (none) | This is the SOP — it owns the procedures/flows; status lives in PRODUCT-INVENTORY | OPERATING | (none) | (none) | Linked from DOC-MAP |
| INV-1412 | SENDING & ONBOARDING MODEL | (none) | The locked sending & onboarding model — M1 us, M2 client, M3 operations | ARCHITECTURE | 🔒 locked | 1 Jul 2026 | Cost model: pooled inbox ~$45 · client branded $13/yr + $4.50/mo |
| INV-1413 | A · Our own outreach | (none) | Milestone 1 (Instantly) — one domain, founder-run, nothing to build | ARCHITECTURE | 🔒 locked | 1 Jul | Gated only on the inbox warmth clock; seven-step flow |
| INV-1414 | B · New-client sending | (none) | Milestone 2 (Smartlead) — the pool → branded model | ARCHITECTURE | ⚠️ THE INBOX LIFECYCLE IS CURRENT, THE TRIAL IT HANGS OFF IS NOT | flagged 25 Aug, not rewritten | Schema-backed: client_inboxes kind/status/unique index |
| INV-1415 | B · New-client sending | (none) | What does NOT hold — steps 1–5 are written around a 14-day trial that no longer exists | DEFECT | ⚠️ does not hold | 25 Aug | Tombstoned 1 Aug (#606, items 270/271); the price it names is two moves out of date |
| INV-1416 | B · New-client sending | (none) | The warm-up clock is a REMINDER, not a gate | DEFECT | 🏷️ CODE VERIFIED (25 Aug, baseline e62c6c8c) | 25 Aug | Every reader displays warmup_ready_at; nothing in the send path refuses on it |
| INV-1417 | B · New-client sending | (none) | THE REPLACEMENT OPERATING SEQUENCE — free proof → accepted → payment → sender → campaign → K.I.N.D GO → controlled send | ARCHITECTURE | logged 26 Aug | 26 Aug | The numbered steps below the banner are the stale trial version |
| INV-1418 | B · New-client sending | (none) | Six safety properties riding on the sequence, each already ruled elsewhere | RULE | none changed here | 26 Aug | AR17 · #700 one active campaign · frozen sequence · D16 reply stops · AR9 GO · S2 global switch |
| INV-1419 | B · New-client sending | (none) | The sender concept restated — pooled → branded warms alongside → safe switch → pooled released | ARCHITECTURE | current and schema-backed | 26 Aug |  |
| INV-1420 | B · New-client sending | (none) | UNRESOLVED — warmup_ready_at runtime enforcement has never been proven | QUESTION | 🏷️ RUNTIME UNVERIFIED | 25 Aug | Treat the warm-up clock as a reminder until someone proves a send path refuses on it |
| INV-1421 | B · New-client sending | (none) | POST-LAUNCH REVIEW ITEM — the numbered steps are deliberately not rewritten here | TASK | 🏷️ post-launch review | 25 Aug | That is a product decision, not a doc edit |
| INV-1422 | B · New-client sending | (none) | The five numbered trial steps (signup → trial → convert → day-29 switch → no convert) | HISTORY | ⚠️ stale — built on a retired trial | 1 Jul | Plus the mermaid flowchart of the same journey |
| INV-1423 | C · Operations | (none) | Milestone 3 (Admin Centre) — pool management, the two triggers, financial flow, Command Centre + Nora | ARCHITECTURE | builds LIVE | 1 Jul | Full structure = admin-centre-spec.md |
| INV-1424 | Path 1 | (none) | Self-service trial (most common) — 9 steps from get-kind.com to webhook | HISTORY | ⚠️ stale — trial retired 1 Aug (#607) | 1 Jul | Doc itself notes "code still grants a 14-day trial until #425/#431 land" |
| INV-1425 | Path 2 | (none) | AE-assisted — client self-registers, AE walks them through signing | HISTORY | ⚠️ stale — trial framing | 1 Jul |  |
| INV-1426 | Path 3 | (none) | Skip trial, pay on day 1 | HISTORY | ⚠️ stale — trial framing | 1 Jul |  |
| INV-1427 | Path 4 | (none) | Credit balance empty, client never paid — account sits idle | HISTORY | ⚠️ stale — credit framing | 1 Jul |  |
| INV-1428 | Path 5 | (none) | Active client upgrades (Lead Gen → bundle) | HISTORY | ⚠️ LEGACY-ONLY — retired from sale 3 Jul (#284/#911) | 3 Jul | No new client can enter it |
| INV-1429 | Path 6 | (none) | Active client adds FIGSY as an add-on — intentionally manual | HISTORY | ⚠️ stale — subscription framing | 1 Jul |  |
| INV-1430 | Path 7 | (none) | Sales team demo — AE creates a demo environment from admin | FEATURE | 7 steps | 1 Jul | ⚠️ X1 locks one demo environment (MBF); the demo factory is gone |
| INV-1431 | Summary table | (none) | The 7-path summary table — who · credits · AE involved · works today | OPERATING | ⚠️ all rows framed on retired credits/subscriptions | 1 Jul |  |
| INV-1432 | Flowchart | (none) | The mermaid flowchart of all 7 paths | ARCHITECTURE | ⚠️ contains Trial Day 14 / trial-expired states | 1 Jul |  |
| INV-1433 | Footer | (none) | Update this document whenever a new client path is added or changes | RULE | (none) | (none) |  |

---

# docs/run-costs-and-cashflow.md — money and economics

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-1434 | Header | (none) | THE MODEL OF RECORD IS CASHFLOW-LAB.html — this markdown is the workings | RULE | founder-locked, inventory #556 | 25 Jul | If the two disagree, the lab is the model and this doc is the bug |
| INV-1435 | Header | (none) | CORRECTED — the floor is $352/month all-in ($146 platform + $206 company) | MONEY | ⚠️ CORRECTED | 6 Aug, #628 | The code was right and the prose never caught up, with a green gate over it |
| INV-1436 | Header | (none) | The $138 "verified" row was overstated by $87/mo against a real $50.59 | DEFECT | ⚠️ largest single error in this model | 3 Aug | A confident tag stops people re-checking |
| INV-1437 | Header | (none) | The 3 Aug cuts and the deliberate keeps (Google Workspace +$28, Instantly $37) | MONEY | founder decision | 3 Aug | Cutting the sending path saves ~$65 and pushes first revenue further out |
| INV-1438 | Header | (none) | Two numbers that changed how we sell — ~3 leads/mo pays a sender; $299 clears ≈ +$165 month one | MONEY | (none) | 3 Aug | At $99 the founder personally funded ~$78 of every engine-acquired client |
| INV-1439 | Header | (none) | One input still unresolved — names sourced per approval: flow v2 says 2, #415 measured ~7 | QUESTION | ⚠️ founder's call | 10 Jul | At 7 the model roughly halves |
| INV-1440 | Header | (none) | HONEST STATUS — pre-revenue, 0 paying clients, forecasts re-based to Month-0 | MONEY | honest status | 10 Jul 2026 |  |
| INV-1441 | 1. THE MONEY MODEL | (none) | One wallet · $299 onboarding pack · then $4 a lead | MONEY | PRICE RE-LOCKED | 3 Aug | One dollar wallet, one money event; the 👍 is the only thing that ever spends |
| INV-1442 | 1. THE MONEY MODEL | (none) | What the $299 pack costs us — ≈$134, leaving ≈$165 against ~$143 acquisition | MONEY | re-derived | 3 Aug | $45 pre-warmed mailbox · $56 sourcing · $12/yr domain · $7/mo box · $7 working · $10.50 Stripe |
| INV-1443 | 1. THE MONEY MODEL | (none) | THE OLD LINE KEPT AS THE RECORD OF THE ERROR — the $4.50 inbox line was wrong by 10× | HISTORY | ⚠️ kept per CORE-MAP rule 3 | 3 Aug | A warmed mailbox is $45/month; costing it at $4.50 is why $99 ever looked viable |
| INV-1444 | 1. THE MONEY MODEL | (none) | How the pack is implemented — a counted quota, not a wallet credit | ARCHITECTURE | built | 25 Jul | lib/onboarding-pack.ts derives it from rows that already exist |
| INV-1445 | 1. THE MONEY MODEL | (none) | No time limit on paid leads | RULE | founder-locked | 25 Jul | The old 72h approval TTL silently ate what clients had bought |
| INV-1446 | 1. THE MONEY MODEL | (none) | No monthly subscriptions | RULE | (none) | #431 parked | ⚠️ packages/shared still carries legacy $49/$29/$39 monthly prices |
| INV-1447 | 2. WHAT IT COSTS US | (none) | Per-lead cost lines — PDL $0.28/record · Hunter ~$0.003 · Haiku ~$0.05 · Resend ~$0.009 · Calendar $0 · Stripe ~$0.17 | MONEY | verified live | 10 Jul |  |
| INV-1448 | 2. WHAT IT COSTS US | (none) | Per fully-worked lead — COGS all-in ~$0.51, gross margin ~87% | MONEY | verified live | 10 Jul |  |
| INV-1449 | 2. WHAT IT COSTS US | (none) | The bundle is load-bearing — never move billing to per-lead card charges | RULE | (none) | 10 Jul | A per-lead $1 card charge would lose 33¢/dollar to Stripe |
| INV-1450 | 2. WHAT IT COSTS US | (none) | The one cost that lands BEFORE revenue: PDL sourcing | RISK | ⚠️ fenced (§10) | 10 Jul | The sourced-vs-approved ratio is the number to watch |
| INV-1451 | 3. PRICING | (none) | Reveal $1.00 flat and FIGSY work $3.00 flat, packs 20/40/100 | HISTORY | ⚠️ retired ladder — superseded 24 Jul | 10 Jul | Section not updated; §1 is the current pricing home |
| INV-1452 | 4. UNIT ECONOMICS | (none) | Reveal-only vs fully-worked — ~50% vs ~87% margin | HISTORY | ⚠️ retired ladder | 10 Jul | "Reveals keep us safe; FIGSY makes us rich" |
| INV-1453 | 5. FIXED MONTHLY COSTS | (none) | THE RULE: IDLE TOOLS BILL NOTHING — every $0 line carries its switch-on trigger | RULE | founder | 30 Jul | O11 |
| INV-1454 | 5. FIXED MONTHLY COSTS | (none) | NOW table — the pre-first-client spend, line by line | MONEY | PLATFORM FLOOR — NOW ~$146/mo | 3 Aug | Railway+Supabase+CF ~$51 · Instantly $37 · Zoho $3 · Domains $3 · Failover $12 · Anthropic $10 · Google $28 |
| INV-1455 | 5. FIXED MONTHLY COSTS | (none) | Apollo — CORRECTED 25 Aug: renewed at $65/mo, the drop to free did NOT happen | MONEY | ⚠️ 🏷️ FOUNDER DECISION | 25 Aug | The floor totals below still carry the old $0 and have NOT been re-derived |
| INV-1456 | 5. FIXED MONTHLY COSTS | (none) | COMPANY FLOOR ~$206/mo — every line unverified-secondary until B2 | MONEY | ⚠️ includes an unheld PI-insurance line | 4 Aug, corrected 25–26 Aug | K.I.N.D holds NO business insurance today: none, $0. Banking Wise $0. ICO £52/yr (£47 DD) |
| INV-1457 | 5. FIXED MONTHLY COSTS | (none) | ALL-IN FLOOR — $352/mo, what actually leaves the bank | MONEY | added 6 Aug, #628 | 6 Aug |  |
| INV-1458 | 5. FIXED MONTHLY COSTS | (none) | Claude Code is a build tool, not product infrastructure — outside the platform floor | RULE | (none) | 3 Aug | £119.99 → ~£18; all-in out of pocket ~$470 → ~$157 |
| INV-1459 | 5. FIXED MONTHLY COSTS | (none) | FUTURE table — first client onward, PLATFORM FLOOR ~$490/mo | MONEY | triggered | 10 Jul | Smartlead +$94 · Hunter +$34 · PDL +$98 · Anthropic +$30 · Instantly boxes +$23 |
| INV-1460 | 5. FIXED MONTHLY COSTS | (none) | THE FUEL — ~$127–137 per 1,000 prospects, ~$85/month while hunting | MONEY | separate from the rent | 10 Jul |  |
| INV-1461 | 5. FIXED MONTHLY COSTS | (none) | RECONCILED BY R69 — ~1,000 contacted ≈ 1 client survives as a sales-planning assumption | RULE | ⛓️ 🏷️ FOUNDER DECISION | R69, 26 Aug | NOT the booked-meeting forecast; Milla must never present it as one |
| INV-1462 | 5. FIXED MONTHLY COSTS | (none) | Scales with the work — seven per-client / per-unit lines | MONEY | $8/client/mo in use; $40 struck | 13 Aug | PDL $0.28 · $98 tier floor · 2 names per approval (⚠️ #415 measured ~7) · $0.07 working · Stripe ~3.5% |
| INV-1463 | 5. FIXED MONTHLY COSTS | (none) | THE CLIENT-SENDER COST MODEL IS NOT RESOLVED — three documents, three sets of figures | CONFLICT | 🏷️ UNKNOWN / NEEDS VERIFICATION | logged 25 Aug | Smartlead $94 vs ~$39; pre-warmed mailbox $45 one-off vs $45/mo vs $9/mo. LAUNCH-PAD M8 owns settling it |
| INV-1464 | 5. FIXED MONTHLY COSTS | (none) | THE SIX ECONOMIC LAYERS — never mixed, never renamed | RULE | logged 26 Aug | 26 Aug | SETUP · LEAD · PARTNER LEAD · COMPANY · VAT/TAX · CASH |
| INV-1465 | 5. FIXED MONTHLY COSTS | (none) | LANGUAGE RULE — a partial lead contribution is NEVER called "net margin" | RULE | not cosmetic | 26 Aug | Contribution / contribution margin · operating profit · after-tax profit |
| INV-1466 | 5. FIXED MONTHLY COSTS | (none) | Seven follow-ups from the 26-Aug Money Control Room verification | TASK | follow-ups | 26 Aug | Smartlead double-count · VAT symmetry · ratio selector · new-vs-mature counting · run-rate labelling · the ~$7 work cost stays in · Stripe audit |
| INV-1467 | 5. FIXED MONTHLY COSTS | (none) | THE CASH LAYER — founder envelope ≈$400/month, NOT a permanent business ceiling | MONEY | logged 26 Aug | 26 Aug | Customer receipts replenish the operating cash pot; the founder's contribution is starting working capital |
| INV-1468 | 5. FIXED MONTHLY COSTS | (none) | REPLACING ASSUMPTIONS WITH MEASUREMENT — track the actual sourced-per-approved ratio | TASK | placeholders | 26 Aug | 1.5× / 3× / 7× remain planning scenarios; 7× is the only measured one (#415) |
| INV-1469 | 5. FIXED MONTHLY COSTS | (none) | VAT / REVERSE-CHARGE MONITORING — the £90,000 rolling-12 threshold is a live exposure | RISK | 🏷️ UNKNOWN / NEEDS VERIFICATION | 26 Aug | Overseas-service purchases can pull K.I.N.D over it through the reverse charge |
| INV-1470 | 5. FIXED MONTHLY COSTS | (none) | Correction history — $138 → $203 → ~$175–190 → ~$457 → ~$423 → ~$223 → ~$490 at first client | HISTORY | correction history | (none) |  |
| INV-1471 | 6. BREAK-EVEN | (none) | A client must approve ~13 leads a month just to pay for their own inbox | MONEY | rebuilt on the real floor | 26 Jul | ⚠️ Written on the retired ~$40/mo inbox assumption; §5 now says ~$8 |
| INV-1472 | 6. BREAK-EVEN | (none) | Break-even on the whole business — ~2 / ~4 / ~6 clients at three floors | MONEY | rebuilt | 26 Jul | Their first month now pays for itself — what the 3-Aug price move bought |
| INV-1473 | 7. CAC | (none) | Three acquisition channels — FIGSY cold outbound ~$68 · inbound trial ~$18 · agency partner ~$0 | MONEY | alternatives per client, do not sum | 10 Jul | ⚠️ Channel ③ quotes the retired 20%+5% share (PR10/R47) |
| INV-1474 | 7B. THE FOUNDER FUNNEL | (none) | 1 paid client a week, by hand — the weekly quota is 5 demos held | COMMERCIAL | ⚠️ all planning numbers | 10 Jul | Blended week ~15h: 6 warm asks + 75 DMs + 150 cold emails |
| INV-1475 | 7B. THE FOUNDER FUNNEL | (none) | Scoreboard — track only four weekly: outreach sent · positive replies · demos held · closes | OPERATING | (none) | 10 Jul |  |
| INV-1476 | 8. THE DOGFOOD UNIT MODEL | (none) | What 1 client via our own product actually is — 200 sourced → ~1 client | MONEY | ⚠️ 2–3% reply rate and 6-month lifetime are PLANNING numbers | 10 Jul | Win rate ≈0.4–0.6% of sourced leads |
| INV-1477 | 8. THE DOGFOOD UNIT MODEL | (none) | LTV:CAC ≈ 6:1 conservative; the floor case is real (−$51 vs CAC) | MONEY | ⚠️ planning | 10 Jul | Usage IS retention — there is no contract |
| INV-1478 | 8. THE DOGFOOD UNIT MODEL | (none) | The first 5–10 clients, depth-first | MONEY | founder-locked | 10 Jul | The lever is spend-per-client, not logo count |
| INV-1479 | 8B. CASHFLOW ENVELOPE | (none) | RE-DERIVED 11 AUG AGAINST $299 + $4 — the 6-Aug banner is discharged | MONEY | ✅ re-derived from code constants | 11 Aug | One dial now, not two |
| INV-1480 | 8B. CASHFLOW ENVELOPE | (none) | Per-lead contribution derived, not quoted — $3.17 per approved lead | MONEY | derived | 11 Aug | $4.00 − PDL $0.56 − work $0.06 − reveal $0.01 − Stripe $0.20 |
| INV-1481 | 8B. CASHFLOW ENVELOPE | (none) | CORRECTED 13 Aug — there is one floor and it is $352; "once-live floor" is RETIRED | MONEY | ⛓️ corrected | 13 Aug, per R19 | Smartlead and Hunter are client-triggered, never a floor |
| INV-1482 | 8B. CASHFLOW ENVELOPE | (none) | The envelope — 10 clients steady state, Conservative +$202 · Middle +$994 · Higher +$2,738 | MONEY | corrected 13 Aug | 13 Aug | The with-tools month is the italic row: +$86 / +$878 / +$2,622 |
| INV-1483 | 8B. CASHFLOW ENVELOPE | (none) | The Conservative line is FAR thinner than the retired model claimed | RISK | ⚠️ the most important thing the re-derivation changed | 11–13 Aug | +$202 at ~25%, not +$240 at ~43% |
| INV-1484 | 8B. CASHFLOW ENVELOPE | (none) | Break-even corrected twice over — every figure understated it because the table ignored the PDL tier | MONEY | ⛓️ corrected | 13 Aug | At ten clients break-even is 17.3 approvals/client; MIN_BATCH_APPROVALS = 20 sits just above it |
| INV-1485 | 8B. CASHFLOW ENVELOPE | (none) | Why depth beats breadth, in one row — one deep client nets $72 more than ten shallow ones | MONEY | ⛓️ corrected 13 Aug | 13 Aug, per R19 | Three clients at the minimum are −$250 |
| INV-1486 | 8B. CASHFLOW ENVELOPE | (none) | The RETIRED per-qualified-lead model, kept in a details block — do not quote | HISTORY | ⛓️ RETIRED, superseded 11 Aug | 11 Aug | Blends, envelope, LTV per scenario, how-to-read |
| INV-1487 | 9. GROWTH SHAPE | (none) | Five stages from first client to partner-scaled — illustrative, re-based to Month-0 | MONEY | NOT a dated forecast | 10 Jul | The three levers: reply-rate · spend-per-client · partners |
| INV-1488 | 10. THE MONEY FENCES | (none) | Every PDL dollar pre-funded by collected cash — five named fences | GATE | LIVE, battle-proven | 10 Jul | k=2 · trial pool ≤20 lifetime · $300/mo ceiling · 100/client/day · try_spend_sourcing |
| INV-1489 | 10. THE MONEY FENCES | (none) | THE POOL (#449) — every purchased record lands in a shared lead_pool at $0 marginal | ARCHITECTURE | building — founder-ruled build-now | 10 Jul | PDL commercial-tier alignment deferred until revenue |
| INV-1490 | 11. KEY RISKS & LEVERS | (none) | Five risks with mitigations, and the 3 levers | RISK | (none) | 10 Jul | PDL exhausted · reply rate · churn after one pack · deliverability · founder hours |
| INV-1491 | 12. ARCHIVED | (none) | Five retired models kept only in git history | HISTORY | retired — do not use | 10 Jul | May–Dec tables · $138/$203 stack · $1/client data cost · Apollo strategy · agent subscriptions |
| INV-1492 | 27 AUG — PROGRAMME-MODEL ECONOMICS | (none) | NOT YET IMPLEMENTED — but this IS the current founder-approved commercial direction | COMMERCIAL | ⛓️ planning only · NOT current pricing | 27 Aug | Three registers, never collapsed. Nothing here may be quoted to a client |
| INV-1493 | 27 AUG — PROGRAMME-MODEL ECONOMICS | FI-06 | The Apollo economics planning case — ≈$32.50 data CAC/client vs $147 on PDL | MONEY | a planning case, never a guaranteed runtime outcome | 27 Aug | Apollo was parked for geography/completeness reliability, NOT for poor economics |
| INV-1494 | 27 AUG — PROGRAMME-MODEL ECONOMICS | (none) | What the 27 Aug diagnostic proved — Apollo returns only has_country booleans | DEFECT | ⚠️ blocks the case | 27 Aug | The geography that makes a lead servable is inside the credit, not before it. See FI-07 |
| INV-1495 | 27 AUG — PROGRAMME-MODEL ECONOMICS | FI-29 | The commercial sourcing assumption — 1:1, superseding 2:1 / 7:1 | MONEY | commercial planning baseline | 27 Aug | Three different things: observed attainment (FI-01) · today's code · the modelling input |
| INV-1496 | 27 AUG — PROGRAMME-MODEL ECONOMICS | FI-28 | The margin arithmetic behind the ~70% target — COGS ceiling ~$135 per meeting | MONEY | ⚠️ THE BENCHMARK IS THE MARGIN | 27 Aug | PDL alone consumes ~52% of the allowance; at 500 leads/meeting contribution goes negative |

---

# docs/FOUNDER-TRUTH-AUDIT-2026-08-28.md — the merged 28 Aug audit

| Inventory ID | Source section / heading | Source stable ID | Short title | Item type | Exact source status marker | Source date / version clue | Notes |
|---|---|---|---|---|---|---|---|
| INV-1497 | Header | (none) | This file is an AUDIT, not a source of truth | RULE | changes nothing, decides nothing, supersedes nothing | 28 Aug 2026 |  |
| INV-1498 | 1. Audit metadata | (none) | Audited origin/main SHA fecaefde; branch claude/founder-truth-audit, 0 ahead / 0 behind | HISTORY | metadata | 28 Aug | Merges confirmed: #1459, #1461, #1460 |
| INV-1499 | 1. Audit metadata | (none) | Scope and not-in-scope stated explicitly | RULE | metadata | 28 Aug | Not in scope: complete codebase audit, production DB inspection, any provider call |
| INV-1500 | 1. Audit metadata | (none) | Explicit statement on canonicity — no document was treated as true because it is a document | RULE | ⚠️ | 28 Aug | No missing history was reconstructed |
| INV-1501 | 1. Audit metadata | (none) | CORRECTED — repo absence is not the same as unknown truth; two independent columns | RULE | ⛓️ corrected | 28 Aug | A · does the repo contain it · B · what is its truth verdict |
| INV-1502 | 1. Audit metadata | (none) | RECOVERY REQUIRED means one thing only: the truth cannot currently be established safely | RULE | ⛓️ corrected | 28 Aug | Never used because a current founder decision is absent from GitHub |
| INV-1503 | 1. Audit metadata | (none) | Mutations performed: none | GATE | none | 28 Aug | No code, schema, config or migration changed |
| INV-1504 | 2. Executive truth summary | (none) | Major VERIFIED LIVE truths — five named | OPERATING | VL | 28 Aug | Money model · two-pass proof cap · nightly top-up removed · pool-first/R66/AR5 · handoff built |
| INV-1505 | 2. Executive truth summary | (none) | Major APPROVED-BUT-UNBUILT truths — the entire programme model; Booked/Held/unverified; Outlook | OPERATING | VCD, unbuilt | 28 Aug | Zero implementation. No programmes table, no batch entity, no go-live concept |
| INV-1506 | 2. Executive truth summary | (none) | Major STALE areas — client-flow-sop, every financial artifact except run-costs, the public website | OPERATING | STALE | 28 Aug |  |
| INV-1507 | 2. Executive truth summary | (none) | Major CONFLICTS — 2 genuine, both requiring the founder | CONFLICT | 2 | 28 Aug | The 150-vs-250 benchmark; the definition of programme contribution |
| INV-1508 | 2. Executive truth summary | (none) | RECOVERY REQUIRED — none, after the 28 Aug taxonomy corrections | OPERATING | 0 | 28 Aug | The repo is behind and some metrics are uninstrumented; neither is unrecoverable truth |
| INV-1509 | 2. Executive truth summary | (none) | MIGRATION STATE — Vida → Engine reported 36 of 37 applied; 20260727_pdl_cursor FAILED | DEFECT | founder operational evidence | 28 Aug | 20260827_proof_review_handoff is among those applied |
| INV-1510 | 3. Canonical-doc inventory | (none) | Sixteen source rows with apparent purpose, state and major concern | OPERATING | doc inventory | 28 Aug | PRODUCT-RULES current · LAUNCH-PAD mixed · V2 current · INVENTORY current · KIND-MASTER historical · client-flow-sop 🔴 STALE … |
| INV-1511 | 3. Canonical-doc inventory | (none) | Migration run history — recorded NOWHERE in the repo | DEFECT | 🔴 MISSING | 28 Aug | Migration outcomes survive only as founder recollection — the class of loss this audit exists to address |
| INV-1512 | 4. Master truth matrix | (none) | Verdict tally — VL 18 · VCD 26 · PARTIAL 10 · STALE 6 · CONFLICT 2 · SUPERSEDED 1 · RR 0 · FDR 1 = 64 | OPERATING | reconciles exactly | 28 Aug | Corrected across three passes |
| INV-1513 | 4.1 Commercial / money | FTA-001 | $4 per approved lead | OTHER | VL | 28 Aug |  |
| INV-1514 | 4.1 Commercial / money | FTA-002 | $299 pack, first 100 included | OTHER | VL | 28 Aug |  |
| INV-1515 | 4.1 Commercial / money | FTA-003 | $4→$8 migration | OTHER | SUP | 28 Aug |  |
| INV-1516 | 4.1 Commercial / money | FTA-004 | Programme pricing ~$450/targeted booked meeting | OTHER | VCD | 28 Aug |  |
| INV-1517 | 4.1 Commercial / money | FTA-005 | Working point: 10 meetings / 2,500 leads / $4,375 / $437.50 effective; floor ~$400 at 50+ | OTHER | VCD | 28 Aug |  |
| INV-1518 | 4.1 Commercial / money | FTA-006 | Automatic volume discount curve | OTHER | VCD | 28 Aug |  |
| INV-1519 | 4.1 Commercial / money | FTA-007 | 70% contribution-margin protection as a real money guard | OTHER | VCD | 28 Aug |  |
| INV-1520 | 4.1 Commercial / money | FTA-008 | 50% upfront / 50% at Go Live | OTHER | VCD | 28 Aug |  |
| INV-1521 | 4.1 Commercial / money | FTA-009 | Programme-level approval, not per-lead | OTHER | VCD | 28 Aug |  |
| INV-1522 | 4.1 Commercial / money | FTA-010 | Partner commission = 25% of programme contribution | OTHER | VCD | 28 Aug |  |
| INV-1523 | 4.1 Commercial / money | FTA-011 | Definition of "programme contribution" | OTHER | FDR | 28 Aug |  |
| INV-1524 | 4.1 Commercial / money | FTA-012 | Coverage k=2 sourcing authority from dollars | OTHER | VL | 28 Aug |  |
| INV-1525 | 4.1 Commercial / money | FTA-013 | 2:1 sourcing in code | OTHER | VL | 28 Aug |  |
| INV-1526 | 4.1 Commercial / money | FTA-014 | Sourcing attainment ≈ 7 sourced → 1 usable/accepted | OTHER | PAR | 28 Aug |  |
| INV-1527 | 4.2 Benchmark / recommendation | FTA-015 | 150 accepted prospects per booked meeting | OTHER | CF | 28 Aug |  |
| INV-1528 | 4.2 Benchmark / recommendation | FTA-016 | 250 recommended leads per targeted booked meeting (seed) | OTHER | CF | 28 Aug |  |
| INV-1529 | 4.2 Benchmark / recommendation | FTA-017 | Client actual benchmark replaces the seed | OTHER | PAR | 28 Aug |  |
| INV-1530 | 4.2 Benchmark / recommendation | FTA-018 | Poor performance → stop/review, never auto-upsell | OTHER | VCD | 28 Aug |  |
| INV-1531 | 4.2 Benchmark / recommendation | FTA-019 | Show starting and actual benchmark to client | OTHER | VCD | 28 Aug |  |
| INV-1532 | 4.3 Programme execution / authority | FTA-020 | Programme entity (target meetings, quantity, price, status, remaining value) | OTHER | VCD | 28 Aug |  |
| INV-1533 | 4.3 Programme execution / authority | FTA-021 | 250-lead controlled batches, configurable | OTHER | VCD | 28 Aug |  |
| INV-1534 | 4.3 Programme execution / authority | FTA-022 | Healthy batch continues / material issue auto-pauses | OTHER | VCD | 28 Aug |  |
| INV-1535 | 4.3 Programme execution / authority | FTA-023 | Client Pause Programme stops sourcing and sending | OTHER | VCD | 28 Aug |  |
| INV-1536 | 4.3 Programme execution / authority | FTA-024 | Material ICP change pauses future sourcing until reconfirmed | OTHER | VCD | 28 Aug |  |
| INV-1537 | 4.3 Programme execution / authority | FTA-025 | No spend outside explicit programme authority | OTHER | PAR | 28 Aug |  |
| INV-1538 | 4.3 Programme execution / authority | FTA-026 | Unattended nightly paid top-up | OTHER | VL | 28 Aug |  |
| INV-1539 | 4.3 Programme execution / authority | FTA-027 | Unrestricted client "Run" sourcing | OTHER | VL | 28 Aug |  |
| INV-1540 | 4.3 Programme execution / authority | FTA-028 | Unused programme value never expires | OTHER | PAR | 28 Aug |  |
| INV-1541 | 4.4 Free proof | FTA-029 | Pass 1 ≤20 → one refinement → Pass 2 ≤20 → stop | OTHER | VL | 28 Aug |  |
| INV-1542 | 4.4 Free proof | FTA-030 | No Pass 3 | OTHER | VL | 28 Aug |  |
| INV-1543 | 4.4 Free proof | FTA-031 | Proof exhaustion → real operator handoff | OTHER | PAR | 28 Aug |  |
| INV-1544 | 4.4 Free proof | FTA-032 | Proof terminal state ("finding" vs "no match") | OTHER | PAR | 28 Aug |  |
| INV-1545 | 4.4 Free proof | FTA-033 | Recurrent end-to-end proof runtime failure | OTHER | PAR | 28 Aug |  |
| INV-1546 | 4.5 Sourcing / providers | FTA-034 | Pool first, always | OTHER | VL | 28 Aug |  |
| INV-1547 | 4.5 Sourcing / providers | FTA-035 | PDL is the launch provider; Apollo API parked | OTHER | VL | 28 Aug |  |
| INV-1548 | 4.5 Sourcing / providers | FTA-036 | Apollo-acquired pool data remains servable | OTHER | VL | 28 Aug |  |
| INV-1549 | 4.5 Sourcing / providers | FTA-037 | PAID_PROVIDERS_ENABLED OFF; controlled exit condition | OTHER | VL | 28 Aug |  |
| INV-1550 | 4.5 Sourcing / providers | FTA-038 | Apollo geography incapability | OTHER | VL | 28 Aug |  |
| INV-1551 | 4.5 Sourcing / providers | FTA-039 | Suppression / DNC enforcement | OTHER | VL | 28 Aug |  |
| INV-1552 | 4.6 Meetings / calendar | FTA-040 | Booked and Held separate | OTHER | Current approved | 28 Aug |  |
| INV-1553 | 4.6 Meetings / calendar | FTA-041 | Booked — unverified state | OTHER | VCD | 28 Aug |  |
| INV-1554 | 4.6 Meetings / calendar | FTA-042 | Counting rules: reschedule once; duplicate/spam/outside-ICP excluded; no-show stays Booked not … | OTHER | VCD | 28 Aug |  |
| INV-1555 | 4.6 Meetings / calendar | FTA-043 | Outlook / Microsoft calendar | OTHER | VCD | 28 Aug |  |
| INV-1556 | 4.6 Meetings / calendar | FTA-044 | Booking-link fallback; client confirms Held/No-show | OTHER | PAR | 28 Aug |  |
| INV-1557 | 4.6 Meetings / calendar | FTA-045 | MEETING_BOOKED as the downstream boundary | OTHER | VL | 28 Aug |  |
| INV-1558 | 4.7 Product surfaces / experience | FTA-046 | Milla Jack & Jill conversational shell preserved | OTHER | VL | 28 Aug |  |
| INV-1559 | 4.7 Product surfaces / experience | FTA-047 | Vida conversational/operator shell preserved | OTHER | VL | 28 Aug |  |
| INV-1560 | 4.7 Product surfaces / experience | FTA-048 | Conversational flywheel (conversation → understanding → recommendation → decision → action → fe… | OTHER | VCD | 28 Aug |  |
| INV-1561 | 4.7 Product surfaces / experience | FTA-049 | Client never experiences "give info → handoff → wait" | OTHER | VCD | 28 Aug |  |
| INV-1562 | 4.7 Product surfaces / experience | FTA-050 | Vida lead-pool / suppression / DNC operator visibility | OTHER | VCD | 28 Aug |  |
| INV-1563 | 4.7 Product surfaces / experience | FTA-051 | Portal UI quality | OTHER | VCD | 28 Aug |  |
| INV-1564 | 4.7 Product surfaces / experience | FTA-052 | Website → Milla → programme → Vida consistency | OTHER | VCD | 28 Aug |  |
| INV-1565 | 4.8 Website / public truth | FTA-053 | Public pricing page | OTHER | ST | 28 Aug |  |
| INV-1566 | 4.8 Website / public truth | FTA-054 | Public calculator | OTHER | ST | 28 Aug |  |
| INV-1567 | 4.8 Website / public truth | FTA-055 | Terms / legal | OTHER | ST | 28 Aug |  |
| INV-1568 | 4.8 Website / public truth | FTA-056 | "Meet Milla" / "Meet Vida" treatment | OTHER | VCD | 28 Aug |  |
| INV-1569 | 4.8 Website / public truth | FTA-057 | Demo video | OTHER | ST | 28 Aug |  |
| INV-1570 | 4.9 Docs / operating | FTA-058 | client-flow-sop.md describes a trial funnel | OTHER | ST | 28 Aug |  |
| INV-1571 | 4.9 Docs / operating | FTA-059 | Founder Operating Truth is needed because docs are insufficient | OTHER | VCD | 28 Aug |  |
| INV-1572 | 4.9 Docs / operating | FTA-060 | No material idea lives only in chat | OTHER | VL | 28 Aug |  |
| INV-1573 | 4.9 Docs / operating | FTA-061 | Weekend allocation: 12h Saturday + 12h Sunday | OTHER | VCD | 28 Aug |  |
| INV-1574 | 4.9 Docs / operating | FTA-062 | Production fake/test account cleanup | OTHER | VCD | 28 Aug |  |
| INV-1575 | 4.9 Docs / operating | FTA-063 | RAILWAY_GIT_COMMIT_SHA unset → deploy state unverifiable | OTHER | ST | 28 Aug |  |
| INV-1576 | 4.9 Docs / operating | FTA-064 | 20260727_pdl_cursor migration FAILED | OTHER | PAR | 28 Aug |  |
| INV-1577 | 4. Master truth matrix | (none) | Abbreviation key for verdict, priority and state columns | OPERATING | key | 28 Aug |  |
| INV-1578 | 5. Founder inputs | (none) | Repo reconciliation tally — FOUND 0 · PARTIAL 5 · MISSING 6 · CONFLICT 0 | OPERATING | tally | 28 Aug | Truth verdict tally: VERIFIED CURRENT DIRECTION 11 of 11 |
| INV-1579 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-01 | Meet Milla / Meet Vida use Jack & Jill structural language | OTHER | repo: PARTIAL · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1580 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-02 | Conversational flywheel; never "give info → handoff → wait" | OTHER | repo: MISSING · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1581 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-03 | Founder Operating Truth is vital; docs insufficient | OTHER | repo: MISSING · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1582 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-04 | Portal UI quality vital | OTHER | repo: PARTIAL · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1583 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-05 | Consistency website → Milla → programme → Vida | OTHER | repo: MISSING · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1584 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-06 | Review V2/post-launch for promotion | OTHER | repo: PARTIAL · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1585 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-07 | Simple docs; four bands CRITICAL NOW / LAUNCH / POST-LAUNCH / V2 | OTHER | repo: MISSING · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1586 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-08 | One indexed view of every material item | OTHER | repo: MISSING · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1587 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-09 | All financial docs reconciled to the programme model | OTHER | repo: PARTIAL · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1588 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-10 | 12h Saturday + 12h Sunday founder build days | OTHER | repo: MISSING · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1589 | 5. Founder inputs — FRT-01 … FRT-11 | FRT-11 | Website and UI critical before launch | OTHER | repo: PARTIAL · truth: VERIFIED CURRENT DIRECTION | 28 Aug |  |
| INV-1590 | 6. Financial truth audit | (none) | Fourteen material pricing/economics models found, each with its state | MONEY | financial audit | 28 Aug | LIVE LEGACY · SUPERSEDED HISTORY · CURRENT DIRECTION · PARTIAL · CONFLICT · STALE |
| INV-1591 | 6. Financial truth audit | (none) | The margin arithmetic still stands and still bites | MONEY | ⚠️ | 27–28 Aug | At 500 leads per meeting, PDL alone is $140 and contribution goes negative |
| INV-1592 | 7. V2 promotion candidates | (none) | Ten rows — Claude has promoted nothing; each is a recommendation only | QUESTION | recommendation only | 28 Aug | 5 PROMOTION CANDIDATE · 2 FOUNDER DECISION REQUIRED · 2 KEEP launch-current · 1 KEEP LATER |
| INV-1593 | 8. Conflicts | CONF-1 | The benchmark — R69 ~150 accepted prospects vs the programme seed of 250 recommended leads | CONFLICT | 🛑 FOUNDER DECISION REQUIRED | 28 Aug | Money consequence: at 500 leads/meeting the programme is loss-making |
| INV-1594 | 8. Conflicts | CONF-2 | "Programme contribution" — the direction is settled, the accounting definition is not | CONFLICT | 🛑 FOUNDER DECISION REQUIRED | 28 Aug | Meanwhile any per-lead price change silently rewrites partner earnings |
| INV-1595 | 9. Recovery required | (none) | NONE — the category is empty after three correction passes | OPERATING | ✅ NONE | 28 Aug | Two situations were wrongly filed under it; neither qualifies |
| INV-1596 | 9. Recovery required | ADJ-1 | 20260727_pdl_cursor migration failed — the fact is established, the cause is not diagnosed | DEFECT | known-but-undiagnosed | 28 Aug | pdl-cursor.ts is the audience-exhaustion cursor |
| INV-1597 | 9. Recovery required | ADJ-2 | Proof-exhaustion E2E journey — built, deployed, migration applied; the walk has not been performed | TASK | known-but-undiagnosed | 28 Aug | An untested path, not an unknown truth |
| INV-1598 | 9. Recovery required | ADJ-3 | Portal UI acceptance bar — the direction is settled, no bar has been defined | QUESTION | FOUNDER DECISION REQUIRED | 28 Aug |  |
| INV-1599 | 9. Recovery required | ADJ-4 | Sourcing attainment telemetry — no production metric measures the real sourced→usable ratio | DEFECT | known-but-undiagnosed | 28 Aug | ~7:1 is a founder-reported observational baseline, not telemetry-verified |
| INV-1600 | 9. Recovery required | (none) | ~7:1 is four separate concepts and conflating them is how a margin gets modelled on a number nothing produces | RULE | ⚠️ | 28 Aug | Not VL · not FI-29's 1:1 · not the programme ratio · not the 150:1/250:1 benchmark |
| INV-1601 | 10. Proposed canonical architecture | (none) | Five-layer proposal — Detail · Index · Operating view · Visual · Bootstrap | ARCHITECTURE | recommendation only, no edits made | 28 Aug | ⚠️ Only safe if the register and operating view INDEX rather than restate |
| INV-1602 | 10. Proposed canonical architecture | (none) | Taxonomy conflict to settle first (FRT-07) — three incompatible schemes are live, the founder's four are a fourth | CONFLICT | settle first | 28 Aug | V2 Phase 0–4 · LAUNCH-PAD T-numbers · PRODUCT-INVENTORY dots |
| INV-1603 | 11. Recommended next bounded task | (none) | Recommended: reconcile docs/client-flow-sop.md — a recommendation for the founder to accept, reorder or reject | TASK | ⛓️ CORRECTED — not started | 28 Aug | Claude does not choose the company's next task |
| INV-1604 | 11. Recommended next bounded task | (none) | Four other candidates the founder may prefer instead | TASK | recommendation | 28 Aug | Write down FRT-01…11 · diagnose pdl_cursor · walk proof exhaustion E2E · settle CONF-1 |
| INV-1605 | Footer | (none) | Audit produced 28 Aug 2026 against origin/main fecaefde; no canonical truth changed | HISTORY | footer | 28 Aug | No conflict resolved, no history rewritten |

---

## Coverage proof

### Rows per source document

| Source document | Rows | Reconciliation |
|---|---:|---|
| `CLAUDE.md` | 66 | 6 four-doc-contract + 22 Protocol v1 + 6 single-source + 2 dots + 1 preview + 1 render + 6 ritual + 1 steals + 9 GitHub + 1 audit-yourself + 8 method + 3 session-start/citation |
| `docs/PRODUCT-RULES.md` | 212 | **190 extracted rule rows** (M·PR·S·D·X·P·O·A·AR·RPT·R series, no duplicate IDs) + 22 hand-read non-tabular items |
| `docs/LAUNCH-PAD.md` | 60 | 47 extracted table rows (C1–C9 incl. C2b/c/d, T1–T12, M1–M8, F-questions, governing rules) + 13 hand-read items |
| `docs/PRODUCT-INVENTORY.md` | 713 | **680 item rows** = 660 counted + 6 uncounted pointers + 14 tombstoned; + 33 hand-read structural items |
| `docs/V2-TRACKER.md` | 351 | 282 hand-read narrative/roadmap items + **69 FI rows (FI-01 … FI-69, all present)** |
| `docs/client-flow-sop.md` | 31 | 31 hand-read items — truth banner, sending/onboarding model, the 7 paths, summary table, flowchart |
| `docs/run-costs-and-cashflow.md` | 63 | 63 hand-read items across §1–§12 plus the 27 Aug programme-economics section |
| `docs/FOUNDER-TRUTH-AUDIT-2026-08-28.md` | 109 | **64 FTA rows + 11 FRT rows** (both complete, no gaps) + 34 hand-read items incl. ADJ-1…4 and CONF-1/2 |
| **TOTAL** | **1605** | |

### Rows per item type

| Item type | Rows |
|---|---:|
| FEATURE | 723 |
| RULE | 263 |
| TASK | 107 |
| ARCHITECTURE | 82 |
| OTHER | 75 |
| MONEY | 59 |
| IDEA | 54 |
| OPERATING | 47 |
| COMMERCIAL | 44 |
| HISTORY | 42 |
| QUESTION | 42 |
| DEFECT | 26 |
| GATE | 17 |
| RISK | 14 |
| CONFLICT | 6 |
| EXPERIENCE | 4 |
| **TOTAL** | **1605** |

### Stable-ID series captured in full

| Series | Source | Expected | Found | Complete? |
|---|---|---:|---:|:---:|
| Founder rulings (M · PR · S · D · X · P · O · A · AR · RPT · R) | `PRODUCT-RULES.md` | all rows | **190** | ✅ no duplicate IDs |
| Inventory item IDs | `PRODUCT-INVENTORY.md` | Σ660 counted | **660 + 6 + 14 = 680** | ✅ reconciles to the board marker |
| Founder Idea Bank | `V2-TRACKER.md` | FI-01 … FI-69 | **69** | ✅ none missing, none duplicated |
| Truth-audit matrix | `FOUNDER-TRUTH-AUDIT-2026-08-28.md` | FTA-001 … FTA-064 | **64** | ✅ |
| Founder restatements | `FOUNDER-TRUTH-AUDIT-2026-08-28.md` | FRT-01 … FRT-11 | **11** | ✅ |
| Launch-current work | `LAUNCH-PAD.md` | C1–C9 · T1–T12 · M1–M8 | **29** | ✅ incl. C2b / C2c / C2d |
| Operating protocol | `CLAUDE.md` | r1 … r22 | **22** | ✅ |


### Structural observations recorded during the read — REPORTED, not fixed

Protocol r18: out-of-scope discoveries are reported and the scoped work continues. **None of these was changed, and none is a classification.** They are facts about how the source documents are physically laid out, recorded because they affect how any later step reads them.

| # | Observation | Where |
|---|---|---|
| 1 | **70 item rows sit physically under the `🗄 ARCHIVE / HISTORY` banner, and 46 more under the `STEALS — 19 Aug sweep` sub-heading — including recent items #610…#700.** The nearest preceding markdown heading is what this inventory records, so those rows are attributed to those headings. Whether they belong there is a document-structure question, not a status question — **status of record is still each row's own dot.** | `PRODUCT-INVENTORY.md` |
| 2 | **141 rows are attributed to `FIGSY — THE ENGINE › ↳ THE BRAIN`** for the same reason: `↳ THE BRAIN` is the last markdown heading before a long run of tables that continue past it. | `PRODUCT-INVENTORY.md` |
| 3 | **`#106` appears twice** — once as an item row and once inside the board-summary table (`| **106** | **308** | …`). The board-summary rows are excluded from the inventory as non-items. | `PRODUCT-INVENTORY.md` |
| 4 | **The document footer says "the single complete list (250 items)"** while the script-counted board says **Σ660**. Both are transcribed as found. | `PRODUCT-INVENTORY.md` |
| 5 | **190 rule rows exist**, across eighteen sections and five ID series. Any later step that assumes a smaller register will under-count. | `PRODUCT-RULES.md` |
| 6 | **`D1`–`D7` appear out of numeric order** in §3 (D1, D2, D6, D7, D3, D4, D5) — recorded as found; nothing renumbered. | `PRODUCT-RULES.md` |
| 7 | **Rule `PR7` contains the string "Apollo → free from 3 Sep"**, which a naive date scrape reads as the rule's own date. The date clue in this inventory is taken from the source/date **column**, not from rule prose, for exactly this reason. | `PRODUCT-RULES.md` |
| 8 | **The Founder Idea Bank sits below V2's "NOTHING ABOVE IS LAUNCH SCOPE" line and explicitly does not inherit it.** Both the line and the exemption are inventoried as separate rows so neither can be read without the other. | `V2-TRACKER.md` |

### What a reader must NOT conclude from this file

1. **That anything here is current.** Rows carry their source's marker; markers are transcribed, not verified.
2. **That anything here is launch scope.** V2-TRACKER's own fence and its "NOTHING ABOVE IS LAUNCH SCOPE" line both apply to every row taken from that document, and both are inventoried as rows.
3. **That two similar rows are a contradiction that needs fixing.** Duplication across sources is the expected output of a no-deduplication pass.
4. **That an absent row means an absent item.** Six source classes were reported as out of scope above — most materially `KIND-MASTER.md`, `RULEBOOK.md` and `CASHFLOW-LAB.html`.
5. **That Claude has prioritised anything.** No row was ordered, ranked, promoted or demoted. Rows appear in source-document order, then in document order within each source.

---

*Step 2 inventory produced 28 Aug 2026 against `origin/main` `299b2e82`. No source document was edited. No item was classified, prioritised, deduplicated or resolved.*
