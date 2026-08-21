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

## 🛑 OPERATING PROTOCOL v1 — MANDATORY (founder-locked 21 Aug 2026 · full text: [RULEBOOK §15](./docs/RULEBOOK.md))

1. PAUSE is default (R65). No build/edit/PR/migration/external write before the founder's explicit GO.
2. Every task has ONE MODE: READ-ONLY VERIFY · BUILD · DOC RECONCILIATION · FULL AUDIT (RULEBOOK §13). Unclear → READ-ONLY / PAUSE.
3. Current-truth authority: **PRODUCT-RULES > LAUNCH-PAD > PRODUCT-INVENTORY > KIND-MASTER > V2-TRACKER.** Follow the higher authority automatically; STOP only when the highest relevant one is ambiguous or silent.
4. Historical / struck / quoted / chained / superseded text is **NOT current truth because a search found it.**
5. **BOOTSTRAP ONCE PER SESSION, ANCHORED TO THE BASELINE `origin/main` SHA — not to branch HEAD.** Record the baseline `origin/main` SHA · verify the canonical facts the task needs **once** · keep an ephemeral evidence ledger (never committed) and reuse it. **Your own task commits and branch-HEAD changes do NOT invalidate the ledger.** Re-read a ledger fact ONLY when: (a) the canonical source behind that fact changed; (b) `origin/main` advanced **and** the change could affect this task; or (c) the task needs a fact not yet verified. **Re-reading PRODUCT-RULES or LAUNCH-PAD repeatedly inside one build is a defect, not diligence.**
6. Search first; read only the files/lines/functions the task needs.
7. **V2-TRACKER is NOT read for current-product/launch work** — only on explicit founder request for future work, or when a current rule points into a specific V2 section.
8. Before every BUILD return the **SCOPE CARD** — MODE · GOAL · TASK SIZE · RULES USED · FILES TO READ · FILES TO CHANGE · TESTS · NO-TOUCH · OPEN QUESTIONS — then the **CLAUSE TABLE** (P11), then **WAIT FOR GO**.
9. Size limits: **SMALL** ≤5 substantive files read / ≤3 changed · **MEDIUM** ≤12 read / ≤8 changed. Above either threshold → **STOP** and get founder approval for the expanded scope.
10. After GO the clause table is the **CONTRACT**. No opportunistic cleanup, no unrelated fixes.
11. Test funnel: smallest **RED** proof → targeted **GREEN** → affected package if required → `check.sh` **ONCE** at the end.
12. Re-verification is **DIFF-FIRST**. Never repeat a full audit unless MODE = FULL AUDIT.
13. For **implementation, deployment, configuration, provider-entitlement and runtime** claims, distinguish **CODE VERIFIED · RUNTIME VERIFIED · RUNTIME UNVERIFIED**. Never infer runtime truth from code alone (O5/O6). Ordinary documentation, history and product-rule statements need no such label.
14. Finding states: **OPEN · PARKED/DEFERRED · FIXED BUT UNGUARDED · CLOSED/VERIFIED.**
15. A meaningful fix is **not CLOSED** until regression protection exists, **or** it is explicitly assigned to weekly drift monitoring.
16. New or changed validators must **prove their teeth**: good state PASS → **deliberately bad state FAIL** → restored state PASS. A checker never run against a bad state proves nothing.
17. A PRODUCT-RULES change triggers a **dependency check** (affected current docs, code and tests) before completion.
18. Out-of-scope discoveries: blocks safe completion → **STOP**; otherwise **REPORT** it and continue the scoped work. **Never fix it silently.**
19. The weekly audit is **CHANGE-BASED** from the last persisted `audited-through` SHA — never whole-repo archaeology (RULEBOOK §15.15).
20. **MERGE IS NEVER CLAUDE'S.** After BUILD or DOC RECONCILIATION, Claude produces the PR, diff, tests and evidence — then **STOPS**. The founder routes the result through **GPT-5.6 independent review**, and MERGE requires the founder's authorisation after that review. **Claude's own self-review is never merge authorisation** (extends R41/P3). **GPT-5.6 is NOT a new source of product truth** — it classifies, scopes and reviews founder intent; PRODUCT-RULES and explicit founder decisions remain authoritative.
21. **MEETING_BOOKED** remains the hard downstream product-outcome boundary unless the founder explicitly changes it.
22. No new summary/current-truth document **unless the founder explicitly changes this rule and approves it** (the BUILD-STATUS lesson — RULEBOOK §15.19).

## Single source of truth — the one rule that keeps it clean
Each doc is the truth of exactly ONE thing; no other doc may claim that thing.
- **STATUS** lives only in PRODUCT-INVENTORY. LAUNCH-PAD may *reference* an item by ID; KIND-MASTER may *record* that it shipped — neither holds the status of record.
- **TODAY'S EXECUTION** lives only in LAUNCH-PAD.
- **STRATEGY / DECISIONS / HISTORY** live only in KIND-MASTER.
- **FUTURE DETAIL** lives only in V2-TRACKER.
- If two docs describe the same fact, that's a bug — **delete the copy, keep the home.**

**Authority split** (so "which doc governs?" never recurs): KIND-MASTER governs **strategy**; LAUNCH-PAD governs **daily execution**; PRODUCT-INVENTORY is the only authority on **current status**. Each governs one domain only.

## Status dots (5 states) — never blur them. Ladder: 🔴 → 🟡 → 🟣 → 🩷 → 🟢
🟢 live + **verified** in prod · 🩷 live but **not yet verified** · 🟣 **approved by the founder on the PREVIEW site, not yet live** · 🟡 built, on preview/branch, pending review · 🔴 not built · ⏸ blocked.
**Nothing is 🟢 unless verified live in production.** Live-but-unwalked is 🩷, not 🟢.

## Preview before live — client-facing work is previewed FIRST (RULEBOOK §11)
On this repo **merging to `main` = shipping to the LIVE site clients use.** So every client-facing build goes to the **PREVIEW site** (`heartfelt-essence…railway.app` / `staging` branch / `kind-staging` DB) first → **I send a preview link → founder approves (🟣) → THEN it ships to LIVE (🩷).** I never say "merge"/"go live" before the founder has previewed. *(Docs don't deploy → no preview needed.)*

## The one new discipline — render every action
**Any action that changes state is reflected the SAME session in its one owning doc** — flip the inventory dot · update the LAUNCH-PAD runlist · append the KIND-MASTER session-log line. No silent changes, no deferring the doc update to "later."

## End-of-session ritual (run every working session, in order)
1. **Flip the dot(s)** in PRODUCT-INVENTORY for anything that changed — the *only* status edit.
2. **Overwrite the top of LAUNCH-PAD** — VERIFIED STATE + today's / this week's runlist. **LAUNCH-PAD item-table rows MIRROR the inventory dots** — the stamp is script-generated by `scripts/mirror-launchpad.sh` (chained inside `update-board.sh`); never hand-type a dot in LAUNCH-PAD. Status of record still lives ONLY in the inventory — LAUNCH-PAD just reflects it so the two can't drift.
3. **Append one line to the KIND-MASTER session log** — and it is the **same sentence as the git commit message** (write it once).
4. Touch KIND-MASTER strategy or V2-TRACKER **only when a decision or future plan actually changes.**
4b. **Any ruling the founder made in chat this session → a row in `docs/PRODUCT-RULES.md`, the SAME session.** A ruling that lives only in a chat transcript is a ruling that will be contradicted — the transcript is not read at session start and cannot be grepped. Quote his words verbatim; a paraphrase drifts on the first re-read. Superseding an existing rule **chains** it (old → amended, both dated, latest wins) and never deletes it: #549 was contradicted on 6 Aug precisely because the 26-Jul lock was remembered and its 30-Jul amendment was not.
5. **Run `scripts/doc-lint.sh` before committing any doc change** — it fails on status-column drift, board drift, duplicate IDs and banned stale claims. **⚠️ CI DOES NOT RUN IT.** *(Corrected 6 Aug: the "never executed, 0 runs ever" claim that stood here was FALSE — Actions ran **788 times from 25 May to 3 Jul**, then the account flag killed it; the 27 Jul API check behind the old claim was blind — it reads 0 where the founder's own Actions tab shows 788. The operative truth is unchanged: nothing has run since 3 Jul, GitHub support is unresponsive to the flag appeal, so this is permanent.)* **`scripts/check.sh` is not a belt over CI — it IS the only gate**, and a red lint = fix the doc, never bypass.

## Steals are vital — log every one (RULEBOOK §9)
A **steal** = any pattern worth taking from another tool (Notion, Glean, competitor demos, internal tools the founder uses…). **Capture on sight, same session, logged in RED** as a 🔴 inventory item (or mapped to an existing item ID). The **STEALS CATALOG** in PRODUCT-INVENTORY is the ledger. **Good steals can't go missing — never leave one floating in prose.**

## GitHub process
- **🛑 NEVER STRAND A COMMIT — the founder merges FAST, assume the last PR is ALREADY MERGED.** This has bitten repeatedly. So: **before every new commit**, `git fetch origin` → `git checkout -B <branch> origin/main` (branch fresh off the *current* main) → only then edit/commit. **Never add a commit on top of a branch that already carried an opened PR.** After pushing, **before reporting**, prove it: `git rev-list --count HEAD..origin/main` must be **0** and `git rev-list --count origin/main..HEAD` must be **≥1**. **Never name a PR number you haven't just re-verified is open** via `list_pull_requests state=open` — and always give the clickable URL. If you find a commit stranded: fresh branch off current `origin/main`, `git cherry-pick` it, push (`--force-with-lease` if the branch diverged), open a NEW PR with its link.
- **One PR = one shippable change. One issue = one problem/feature.** No mega-PR unless the founder explicitly approves it (e.g. launch recovery).
- Every PR description has: **Source item** (PRODUCT-INVENTORY ID) · **What changed** · **How to test** · **Screenshots** · **Inventory status update needed** · **Launch-Pad update needed**.
- **Every PR that ships inventory items carries a `Flips: #id #id` line in its body.** On merge, the `inventory-autoflip` workflow is *supposed* to flip those dots → 🩷, regenerate the boards and append the session-log line. **⚠️ IT HAS NEVER RUN — 0 executions since it was added on 9 Jul.** Keep the `Flips:` line (it costs nothing and works the day Actions does), but **flip the dot by hand in the same session** with `scripts/flip-dots.sh 🩷 <id>`. Every 🩷 in the inventory was set by hand. **🟢 stays founder-only** — flip it with `scripts/flip-dots.sh 🟢 <id>` (needs `FOUNDER_FLIP=1`) only on the founder's explicit "good", never in CI.
- Labels: `verify` · `fix` · `ship` · `blocked` · `parked` · `post-launch`.
- **Close redundant PRs** whose code is already live via another merge.
- **Do not merge** anything lacking a test path or a done condition.
- The founder merges. After every push, reconcile against `origin/main` and end with the merge-state footer (RULEBOOK 5.6/5.7).

## 🛑 AUDIT YOURSELF BEFORE REPORTING ANY DELIVERABLE (founder-LOCKED 29 Jun)
Before reporting the state of any previously-built deliverable (CSV list, file, count, enrichment result, feature):
1. **Locate the actual file** — `ls` the scratchpad / repo path. If it doesn't exist, say so.
2. **Verify the real numbers** — `wc -l`, `grep`, `head` — not what was said last session.
3. **Report what the file actually contains**, not what was claimed when it was built.
4. **Never say "we have X leads / Y rows / Z emails" without running the count live** — memory of a prior build is not evidence.
This rule exists because the 2k pull was reported as "2,000 names" when it had **0 verified emails** — a useless file for outreach. The founder caught it. Never again.

## The working method — EVERY model, every session (founder-locked 4 Aug)
> ⛓️ **STILL IN FORCE, and EXTENDED (not replaced) by PROTOCOL v1 above (21 Aug).** The eight rules below are the behaviour; the protocol adds the *shape* — modes, scope card, size limits, evidence ledger, finding states, merge authority. Where they overlap, the protocol carries the operative wording: rule 1's *"verify, then speak"* is scoped by protocol rule 13 (CODE / RUNTIME labels on implementation and runtime claims), and rule 5's build discipline is executed through protocol rules 8–11 (scope card → contract → test funnel). **Nothing here is retired.**

The founder is done switching models to get two behaviours. **One method, whoever is running:**
1. **Verify, then speak.** No number, status, file fact or branch/PR state from memory — run the count, read the file, `git fetch` before naming any ref. *(Three stale-ref incidents and a "$138 · verified" line nobody had checked against a bill are why.)*
2. **Read the function before describing it.** A rule remembered from a different context is not a fact about this one — #414's "no code can reach the checkout" was true of one checkout and false of the one that mattered.
3. **Founder-plain language.** No jargon, no option-soups: one recommendation, then do it. Walkthroughs go ONE step at a time — give the step, wait for "done". Never assert the wall-clock time.
4. **Status reports build nothing.** Report, then wait for the word.
5. **Builds:** fresh branch off *current* `origin/main` · `check.sh` green both ends · red proof for every new guard · one PR per change · prove 0-behind/≥1-ahead after push · every report ends with the PR link + `cd ~/KIND && bash scripts/ship.sh`.
6. **The founder's screenshots are production evidence.** A human walking the real path outranks the gate — the gate is necessary, never sufficient (4 Aug: one signup walk found two live bugs 1,604 tests missed).
7. **Money sentences are interpolated, never typed.** Every price a client can read derives from the constants in `@kind/shared`.
8. **When corrected, record it** — same session, in the session log, without ceremony.

## Session start
⛓️ **AMENDED 21 Aug by PROTOCOL v1 (rules 5–7 above) — and this is the one place the protocol REVERSES an older instruction rather than extending it.** ~~*"Read in order: `docs/PRODUCT-RULES.md` (THE LOCKS — first, always) → LAUNCH-PAD → PRODUCT-INVENTORY → KIND-MASTER → V2-TRACKER, then `docs/RULEBOOK.md`."*~~ Reading all five canonical docs every session spent most of the context before the work started, and pulled **V2-TRACKER** — 18,000 words of fenced historical roadmap — into tasks that had nothing to do with it.

**Now:** record the baseline `origin/main` SHA → read **`docs/PRODUCT-RULES.md` once** (still first, still always) → read **only the LAUNCH-PAD rows the task touches** → read PRODUCT-INVENTORY / KIND-MASTER **only when the task needs them** → **V2-TRACKER is not read at all** unless the founder asks for future work or a current rule points into it (rule 7). Hold the verified facts in the session evidence ledger (rule 5, RULEBOOK §15.6) and do not re-read them while the baseline SHA and the source are unchanged. Open with a one-line reconciled state (RULEBOOK §8, which is unchanged and still applies).

### 🔒 THE CITATION LAW — founder-ordered 6 Aug, and it exists because of a specific failure
**Before writing ANY sentence about a founder-locked decision — in a doc, a PR body, or a chat report — re-read that lock in `docs/PRODUCT-RULES.md` and cite it by date.** A lock paraphrased from memory is not a lock, it is a guess wearing a lock's authority.

**What earned this.** On 6 Aug I wrote that #549 was *"blocked by a vendor tier"* and that *"nothing about sending to CLIENTS depends on this"* — the **opposite** of the founder's own 30-Jul amendment to #577, which says Growth is sufficient and that HyperGrowth's API was only ever needed to drive a sender we deliberately stopped using. It merged. **Every automated check stayed green**, because doc-lint verifies counts and copies, never whether a sentence is TRUE. The only check that fired was the founder's memory — and his answer to that was *"i cant remember everything… things slip far too often."* The register exists so his memory is no longer the last line of defence, and this law is what makes me actually read it.
