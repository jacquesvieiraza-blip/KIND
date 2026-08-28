# 📦 BUILD-001 — Step 7 Founder Truth System

> **What this file is.** A durable **execution-evidence packet**: what was investigated, what was verified, what the founder decided, exactly what was authorised, and what was built. **It is history and evidence, NOT canonical product truth** — it never competes with PRODUCT-RULES, PRODUCT-INVENTORY, LAUNCH-PAD, KIND-MASTER or V2-TRACKER.
>
> **Why it exists (founder lock, 28 Aug):** *material founder decisions, Scout findings, frozen Builder prompts, Builder evidence, GPT verification, merge/deploy evidence and superseded material must not exist only in chat.* A transcript is not read at session start and cannot be grepped.
>
> **Appended, never overwritten.** Corrections chain below the thing they correct.

| | |
|---|---|
| **TASK ID** | **BUILD-001** |
| **TITLE** | Step 7 Founder Truth System |
| **Founder state** | NOW |
| **Conveyor state** | **BUILDER RETURNED** *(state 8 of 12)* |
| **Opened** | 28 August 2026 |

---

## 1 · SCOUT

**Scout baseline SHA:** `1cd99357ba801e319b7f7991b8f677ece308f608` — `origin/main` immediately after PR **#1464** merged.

⚠️ **The Step-7 investigation itself ran earlier, on the pre-merge branch.** Its findings were re-checked against this baseline before the build; where a finding depended on Step-6 work, that work is now in `main` and the finding holds. **The two SHAs are recorded separately rather than collapsed**, because a Scout result is only as current as the tree it was taken from.

### Refs inspected

| Ref | What was read | Why |
|---|---|---|
| `600c24aa` (PR **#1463**, parked) | `docs/FOUNDER-TRUTH-REGISTER.md` (461 lines) · `docs/FOUNDER-OPERATING-TRUTH.md` (378) · `docs/SESSION-BOOTSTRAP.md` (47) · `docs/founder/operating-centre.html` (490) | The only prior attempt at this system — to reuse what worked and identify what must not be revived |
| `1cd99357` | `FOUNDER-TRUTH-CLASSIFICATION-2026-08-28.md` master table, lines 227–422 | The 194 classified truths the register indexes |
| `1cd99357` | `FOUNDER-TRUTH-COMPARISON-2026-08-28.md` | To verify every register CMP ID exists in the evidence chain |
| `1cd99357` | `PRODUCT-RULES.md` R57 · R69 · R74 · R76–R81 · Open list | Current rulings and the open blockers |
| `1cd99357` | `LAUNCH-PAD.md` · `PRODUCT-INVENTORY.md` items #700–#706 | Current execution state and board |
| GitHub API | `list_pull_requests state=open` | PR state verified live, not remembered |

### Scout result

1. **PR #1463 invented a second, parallel ID series over the same subjects** — **237 occurrences** across its register. Two IDs for one truth is how a register starts lying: a later reader cannot tell which ID the evidence chain uses. ➜ **Do not revive. Build over the frozen CMP IDs.**
2. **Its visual shell is genuinely good and fully self-contained** — 131 lines of CSS, system font stack, **zero external requests** (no `<script>`, no `<link>`, no `@import`, no web fonts). ➜ **Reuse the shell, discard the content.**
3. **Its truth content is stale.** Written before the founder's four decisions, so it predates R76–R81 and still carries the 25 Aug launch date. ➜ **Discard.**
4. **The frozen Step-4 table has exactly the columns an index needs** — CMP · subject · domain · verdict · truth layer · implementation · priority · gate · FD flag · canonical home. ➜ **The register can be generated, not hand-typed.**
5. **Seven subjects carry `FD = YES`** — CMP-0007, 0011, 0012, 0091, 0140, 0195, 0197. All seven map onto FD-01…FD-04. ➜ **Zero founder decisions remain outstanding on the reconciliation.**
6. **The frozen artifact records three CONFLICTs, which is correct for the moment it was taken.** The founder has since resolved all three. ➜ **The register must show current state via labelled overrides and must NOT edit the evidence.**

### GPT verification — Scout stage

**Not performed as a separate pass.** The Scout findings were verified by **direct re-derivation against the frozen artifacts** at the baseline SHA: the 194-row count, the 7 `FD = YES` rows, the 237 legacy-ID occurrences and the zero-external-request property of the shell were each **re-counted live** rather than accepted.

⚠️ **This is a gap in the conveyor and it is recorded as one, not glossed.** Conveyor state 4 (GPT VERIFIED, Scout stage) was **not independently satisfied** for BUILD-001. The founder routed straight from investigation to a frozen Builder scope. **Stage 9 (GPT VERIFIED, Builder stage) is still owed before merge.**

---

## 2 · FOUNDER DECISIONS — the three Step-7 blockers

Recorded verbatim in substance; the durable ruling text lives in **PRODUCT-RULES §17**.

### J1 · Source of truth and preservation
**The repo is the durable source of truth and execution evidence.** Authorised paths: `docs/FOUNDER-TRUTH-REGISTER.md` · `docs/FOUNDER-OPERATING-TRUTH.md` · `docs/founder/operating-centre.html` · `docs/SESSION-BOOTSTRAP.md` · and durable execution packets at `docs/founder/tasks/BUILD-*.md`. **Task packets are execution/history evidence, NOT competing canonical product truth.** Material founder decisions, Scout findings, frozen Builder prompts, Builder evidence, GPT verification, merge/deploy evidence and superseded material **must not exist only in chat**. **Corrections and supersessions are chained or appended; material history is never silently deleted or overwritten.**

### J2 · Two levels of task state
**The existing six founder-attention states stay** — NOW · NEXT · WAITING · PARKED · RESEARCH · DONE/LEARNED. **A separate execution conveyor is added underneath them**, not in place of them: NOT SCOUTED → SCOUTING → SCOUT RETURNED → GPT VERIFIED → FOUNDER APPROVED → READY FOR BUILDER → BUILDING → BUILDER RETURNED → GPT VERIFIED → FOUNDER MERGED → DEPLOY VERIFIED → COMPLETE, plus **FOUNDER DECISION REQUIRED** which can enter at any stage. **One task carries both states at once.**

### J3 · Repo vs Notion
**The repo owns durable company truth and execution evidence.** Notion may later provide a founder-facing interface or view. **Notion is NOT canonical and must never be the only copy** of decisions, truth, task history or evidence. Any existing wording giving Notion exclusive ownership of founder attention is **superseded/fenced**.

---

## 3 · THE FROZEN BUILDER SCOPE

Exactly what was authorised. **A builder does not renegotiate a frozen scope.**

**BUILD:**
1. `docs/FOUNDER-TRUTH-REGISTER.md` — rebuild over the frozen CMP IDs. **INDEX ONLY**: CMP ID · subject · canonical home · verdict · implementation state · priority · launch gate · founder-decision reference · governing rule. **Do not restate canonical truth. Do not revive the old ID model.**
2. `docs/FOUNDER-OPERATING-TRUTH.md` — the founder daily operating layer, including TODAY · THIS WEEK · current objective · current Builder task · current Scout task · READY FOR BUILDER queue · blockers · founder decisions required · active PRs · GPT verification · merge state · deploy state · launch gates · product truth · commercial truth · money pointer · V2/post-launch · idea inbox · recovery required. **Persist the conveyor here.**
3. `docs/founder/operating-centre.html` — reuse the useful visual shell from **#1463**, **not** its stale truth. Self-contained, no external HTTP, clearly marked **NON-CANONICAL / derived**.
4. `docs/SESSION-BOOTSTRAP.md` — **45–60 lines maximum**; the entry point for a completely fresh chat.
5. `docs/founder/tasks/BUILD-001.md` — this packet.

**NO-TOUCH:** frozen Step 2–6 evidence artifacts · the old ID register · PR **#1463** (source material for the visual shell only; **not merged as-is**) · PR **#1436** · PR **#1427** · runtime code, schema, migrations, providers, Stripe, sending, deploy logic · **#704** retention duration (**do not resolve**).

**Standing:** quality is not V2 (**R79**).

---

## 4 · BUILDER

| | |
|---|---|
| **Builder starting SHA** | `1cd99357ba801e319b7f7991b8f677ece308f608` (`origin/main`) |
| **Branch** | `claude/founder-truth-system` — **fresh from current `main`**, not a continuation of the reconciliation branch |
| **PR** | **#1465** — https://github.com/jacquesvieiraza-blip/KIND/pull/1465 *(number confirmed live after opening)* |
| **Commit** | `09774020` |

### What was built

| File | New / changed | Note |
|---|---|---|
| `docs/FOUNDER-TRUTH-REGISTER.md` | **new** | 194 CMP rows, generated from the frozen Step-4 table. Index only. |
| `docs/FOUNDER-OPERATING-TRUTH.md` | **new** | Operating layer + the two-level state model. |
| `docs/founder/operating-centre.html` | **new** | Reused shell, new content, self-contained. |
| `docs/SESSION-BOOTSTRAP.md` | **new** | 50 lines. |
| `docs/founder/tasks/BUILD-001.md` | **new** | This packet. |
| `docs/PRODUCT-RULES.md` | changed | **§17 · R82 · R83 · R84** — the three founder locks, durably recorded. |
| `docs/LAUNCH-PAD.md` | changed | Pointer to the new operating layer + the conveyor. |
| `docs/KIND-MASTER.md` | changed | Session-log line. |

### Reuse vs discarded — PR #1463

| Reused | Discarded |
|---|---|
| The 131-line CSS shell (gradient header, card grid, pill/status vocabulary, hero Q&A rows, flow rail, scroll table, responsive rules) — **verbatim except one class rename**, `.tr` → `.cid`, so the retired ID model leaves no trace | **All truth content** — written before the founder's decisions, still carrying the 25 Aug launch date |
| The four-file structure (register · operating truth · bootstrap · HTML view) | **The second parallel ID series** — 237 occurrences, superseded |
| The "non-canonical derived view" framing | Its register model, which restated truth instead of indexing it |

---

## 5 · VALIDATION EVIDENCE

Filled in by the Builder. **A claim without evidence beside it is not a result.**

| Check | Result |
|---|---|
| No legacy TR-style IDs introduced | **0 occurrences** across all five new/changed truth-system files |
| Every register CMP exists in the evidence chain | **194 unique CMP IDs**, `comm -23` against the frozen comparison returns **0 missing** |
| Frozen Step 2–6 evidence modified | **None** — `git diff --stat` against the four frozen artifacts and both packet directories is **empty** |
| Operating-centre HTML self-contained | **0** matches for `http(s)://`, `<script`, `<link`, `<img`, `@import`, `url(`, `fetch(` |
| Runtime / schema / migration / provider changes | **None** — every changed path is under `docs/` |
| `git diff --check` | clean |
| `scripts/doc-lint.sh` | OK |
| Board consistency | 🟢106 · 🩷309 · 🟣2 · 🟡51 · 🔴191 · ⏸7 · **Σ666** — unchanged |
| `scripts/check.sh` | ⚠️ **RED — reported, not re-run.** 6 of 7 stages green; **API tests 3,994 passed / 1 failed**: `proof-review-handoff.test.ts:261` — *"the third attempt is refused 409 and persists ONE open review"*, `expected +0 to be 2`. **The same test, the same line, the same assertion that has failed intermittently before.** This build changed **nine files, all under `docs/`** — the test file and every runtime path it touches are untouched, so this change cannot be its cause. **It was NOT re-run to obtain green** (founder instruction: report the single final result faithfully; and standing instruction not to diagnose this test further). |
| Fresh-GPT continuity test | **14/14** from `SESSION-BOOTSTRAP.md` alone — see §6 |

---

## 6 · MERGE / DEPLOY — **PENDING**

Left deliberately blank. **MERGE IS NEVER CLAUDE'S** (Protocol rule 20).

| Field | State |
|---|---|
| GPT verification (Builder stage, conveyor 9) | ⏳ **PENDING** — owed before merge |
| Founder merged (conveyor 10) | ⏳ **PENDING** |
| Merge SHA | ⏳ pending |
| Deploy verified (conveyor 11) | ⏳ **PENDING** — docs do not deploy, so this reduces to "the founder has read it" |
| Complete (conveyor 12) | ⏳ **PENDING** |

---

## 7 · APPEND LOG

*Corrections and later evidence are appended here, chained to what they correct. Nothing above is overwritten.*

- **28 Aug — packet opened at conveyor state BUILDER RETURNED.** Recorded honestly: **conveyor state 4 (GPT verification of the Scout stage) was not independently satisfied** — the findings were re-derived rather than independently reviewed. Stage 9 is still owed.
