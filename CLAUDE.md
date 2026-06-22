# CLAUDE.md — K.I.N.D agent operating system

> This file tells the agent how to operate this repo. It is **agent config, not a tracker** — it holds no tasks, no statuses, no roadmap. Keep it short. Detailed working rules live in [`docs/RULEBOOK.md`](./docs/RULEBOOK.md) — read that too.

## The four canonical docs — one truth each
| Doc | Is the ONLY home for | Open it for |
|-----|----------------------|-------------|
| **`docs/LAUNCH-PAD.md`** | **today's / this week's execution** | "what do I do now?" — the only doc the founder opens day-to-day |
| **`docs/PRODUCT-INVENTORY.md`** | **product STATUS** (one dot + one owner per item) | "what's built / live / left?" |
| **`docs/KIND-MASTER.md`** | **strategy, decisions, history, session log** | "why did we decide X?" — governs strategy conflicts |
| **`docs/V2-TRACKER.md`** | **future detail** (roadmap rationale, risks, learning engine, GTM, steals) | "what's the longer-term plan?" |

`CLAUDE.md` = these rules (agent config). `GitHub` = execution (one PR per shippable change). **No fifth core doc** unless it replaces an old one.

## Single source of truth — the one rule that keeps it clean
Each doc is the truth of exactly ONE thing; no other doc may claim that thing.
- **STATUS** lives only in PRODUCT-INVENTORY. LAUNCH-PAD may *reference* an item by ID; KIND-MASTER may *record* that it shipped — neither holds the status of record.
- **TODAY'S EXECUTION** lives only in LAUNCH-PAD.
- **STRATEGY / DECISIONS / HISTORY** live only in KIND-MASTER.
- **FUTURE DETAIL** lives only in V2-TRACKER.
- If two docs describe the same fact, that's a bug — **delete the copy, keep the home.**

**Authority split** (so "which doc governs?" never recurs): KIND-MASTER governs **strategy**; LAUNCH-PAD governs **daily execution**; PRODUCT-INVENTORY is the only authority on **current status**. Each governs one domain only.

## Status dots (5 states) — never blur them. Ladder: 🔴 → 🟡 → 🟣 → 🩷 → 🟢
🟢 live + **verified** in prod · 🩷 live but **not yet verified** · 🟣 approved + locked, not shipped · 🟡 built, pending review · 🔴 not built · ⏸ blocked.
**Nothing is 🟢 unless verified live in production.** Live-but-unwalked is 🩷, not 🟢.

## The one new discipline — render every action
**Any action that changes state is reflected the SAME session in its one owning doc** — flip the inventory dot · update the LAUNCH-PAD runlist · append the KIND-MASTER session-log line. No silent changes, no deferring the doc update to "later."

## End-of-session ritual (run every working session, in order)
1. **Flip the dot(s)** in PRODUCT-INVENTORY for anything that changed — the *only* status edit.
2. **Overwrite the top of LAUNCH-PAD** — VERIFIED STATE + today's / this week's runlist.
3. **Append one line to the KIND-MASTER session log** — and it is the **same sentence as the git commit message** (write it once).
4. Touch KIND-MASTER strategy or V2-TRACKER **only when a decision or future plan actually changes.**

## Steals are vital — log every one (RULEBOOK §9)
A **steal** = any pattern worth taking from another tool (Notion, Glean, competitor demos, internal tools the founder uses…). **Capture on sight, same session, logged in RED** as a 🔴 inventory item (or mapped to an existing item ID). The **STEALS CATALOG** in PRODUCT-INVENTORY is the ledger. **Good steals can't go missing — never leave one floating in prose.**

## GitHub process
- **One PR = one shippable change. One issue = one problem/feature.** No mega-PR unless the founder explicitly approves it (e.g. launch recovery).
- Every PR description has: **Source item** (PRODUCT-INVENTORY ID) · **What changed** · **How to test** · **Screenshots** · **Inventory status update needed** · **Launch-Pad update needed**.
- Labels: `verify` · `fix` · `ship` · `blocked` · `parked` · `post-launch`.
- **Close redundant PRs** whose code is already live via another merge.
- **Do not merge** anything lacking a test path or a done condition.
- The founder merges. After every push, reconcile against `origin/main` and end with the merge-state footer (RULEBOOK 5.6/5.7).

## Session start
Read in order: **LAUNCH-PAD → PRODUCT-INVENTORY → KIND-MASTER → V2-TRACKER**, then `docs/RULEBOOK.md`. Open with a one-line reconciled state (RULEBOOK §8).
