# 📕 K.I.N.D — THE RULEBOOK (how Claude works with the founder)

> **Purpose:** the founder holds Claude accountable to THIS. If Claude breaks a rule here, the founder
> points to the rule number and Claude fixes it — no debate.
> **Read this at the start of every session, before touching anything.**
> _Created 14 Jun 2026. Living doc — add a rule whenever a recurring mistake happens._

---

## 0. THE ONE LINE
**Work off the code, not memory. Verify before you speak. Nothing goes live without the founder. Staging first, always.**

---

## 1. 🔍 VERIFICATION — the #1 rule (this is where Claude keeps failing)
1.0 **NEVER WORK OFF MEMORY — founder-LOCKED 24 Jun.** Memory is not a source. Every claim, status, number, file path, PR state, and "it's done" is proven against the actual files / git / GitHub / command output **before** it is said or written. This is the rule the founder holds Claude to above all others — the repeated drift and false-state came from working off memory.
1.1 **Never report from memory or assumption.** Before stating anything as fact, check it against the actual files / git / GitHub. "I think", "should be", "from before" = not allowed as a basis for a claim.
1.2 **Verify, double-check, triple-check before sending.** Run the check, then re-run it a different way. If the founder can catch it by looking, Claude should have caught it first.
1.3 **Grep the whole repo, not one file.** A site-wide change is verified across *every* affected file (e.g. nav changes = all ~40 pages), never one sample.
1.4 **Prove it with output.** When Claude says "done / fixed / verified", it has run a command whose output shows it — and says what that check was.
1.5 **If unsure, say so.** "I haven't verified X yet" beats a confident wrong answer every time.
1.6 **A task isn't done until it's checked in a real state** — file exists, link resolves, page renders, build passes. Typecheck ≠ verified. Written ≠ shipped.

## 2. 🟣 STAGING FIRST — nothing goes live by surprise
2.1 **Default is staging / branch, NOT live.** Most work is built, reviewed, and held. Pushing to production is a deliberate, founder-approved act.
2.2 **The founder merges. Claude does not.** Claude prepares the PR; the founder clicks merge. Claude never merges to `main` (or anything that deploys) without explicit "go live" / "merge it" for that specific change.
2.3 **Two tracks, kept separate:**
   - **Website (`apps/website`)** → deploys via Cloudflare. Cosmetic site changes can go live when the founder approves.
   - **Product (portal / api / agents)** → held on staging until previewed + founder-approved (post-launch: merging to `main` deploys straight to LIVE — §11). Merging it IS go-live — never a routine sync.
2.4 **State the deploy impact every time.** When presenting work, Claude says plainly: "this goes live on merge" or "this is docs/staging only, nothing deploys."
2.5 **Launched 🚀 19 Jun 2026 (historical).** Every client-facing merge follows the §11 preview loop.

## 3. 🎨 THE INVENTORY COLOUR SYSTEM (5 states — never blur them)
Every item in `PRODUCT-INVENTORY.md` carries exactly one dot. The ladder: **🔴 → 🟡 → 🟣 → 🩷 → 🟢.** Claude must use them honestly:
| Dot | Means | Bar to earn it |
|-----|-------|----------------|
| 🟢 **GREEN** | **LIVE + VERIFIED** — in production and **verified working** | deployed + actually run + checked |
| 🩷 **PINK** | **LIVE, PENDING VERIFICATION** — shipped to prod but **not yet walked/verified** | deployed, awaiting the feature-verification walk (then → 🟢, or → 🔴 if broken) |
| 🟣 **PURPLE** | **APPROVED + LOCKED** — built and signed off, **but not live** | founder approved the design/build; sitting on a branch |
| 🟡 **YELLOW** | **NEEDS VERIFICATION** — built or drafted, **not yet checked/approved** | exists but unproven; pending review or testing |
| 🔴 **RED** | **NOT BUILT** | idea / planned only |
3.1 **🟢 is earned, never claimed.** Nothing is green until it has run live and been **verified** (Rule 1.6). Live-but-unverified is **🩷 pink**, not green.
3.2 **Don't promote a dot without evidence.** Moving 🔴→🟡→🟣→🩷→🟢 requires the proof named in the table.
3.3 **Purple ≠ live · pink = live-but-unproven.** Purple is still on a branch; pink is deployed but unwalked. Don't describe either as verified-working.

## 4. 🌿 BRANCHES & DOCS
4.1 **Docs live on `main`.** The **four** core docs (`LAUNCH-PAD.md`, `PRODUCT-INVENTORY.md`, `KIND-MASTER.md`, `V2-TRACKER.md`) live on the live branch so logging travels with the code. Never maintain them only on a held branch again (that caused the 13→14 Jun drift). *(Was wrongly written "three source docs" — LAUNCH-PAD is the 4th core, not a derived run-list. The four-doc contract is canonical; see CLAUDE.md + §4.6.)*
4.2 **Cut work branches FROM `main`, merge BACK to `main`. No micro-branches.** Batch a session's doc edits onto ONE branch/PR — do not spin a new branch per tiny edit (that sprawl left fixes stranded on branches that never merged, so `main` stayed stale while we believed it was fixed). No long-lived parallel doc branches.
4.3 **Log every session.** End of session: update the **SESSION LOG** + **RESUME HERE** in `KIND-MASTER.md`, bump the **Last updated** line on any doc touched, then commit + push.
4.4 **One source of truth wins.** Where docs disagree, `KIND-MASTER.md` is authoritative.
4.5 **`LAUNCH-PAD.md` governs daily execution** (the only doc the founder opens day-to-day). It references inventory items by ID and pulls strategy from the master; if it ever disagrees on **status** the inventory wins, on **strategy** the master wins.
4.6 **Render every action in its one owning doc — same session, no silent changes.** Any state change is reflected immediately: flip the **PRODUCT-INVENTORY** dot (the only status edit) · update the **LAUNCH-PAD** runlist · append the **KIND-MASTER** session-log line (= the git commit message, written once). **Single source of truth:** STATUS only in PRODUCT-INVENTORY · EXECUTION only in LAUNCH-PAD · STRATEGY/HISTORY only in KIND-MASTER · FUTURE only in V2-TRACKER. If two docs state the same fact, delete the copy and keep the home. The agent operating-system map lives in root **`CLAUDE.md`**.
4.7 **The status board is SCRIPT-GENERATED, never hand-typed.** `scripts/count-inventory.sh` is the only source of the PRODUCT-INVENTORY dashboard (it counts real item rows between the `COUNT:START/END` markers, both table formats). Hand-typing it caused a 227-vs-214 drift + a false-live item. Run `--check` before every docs PR.
4.8 **Reconcile against `main` at session close.** Before ending: `git log origin/main..HEAD` (nothing stranded), run the count `--check`, and confirm what the docs claim matches what's actually on `main`. State the reconciled merge-state. Never report a fix from a branch that isn't merged.

## 5. 🔗 PULL REQUESTS & MERGES
5.1 **Every time Claude presents something to merge, it includes the GitHub PR link.** No "the PR is up" without the URL.
5.2 **Never open a duplicate PR.** If a branch already has an open PR, push to it and **update that PR's description** — don't create a second one. Check first.
5.3 **Keep the PR body honest and current.** It must match what's actually in the branch (real filenames, real status, known gaps called out — e.g. "destination pages don't exist yet").
5.4 **Branch discipline.** Develop on the assigned feature branch; push with `git push -u origin <branch>`; never push to a different branch without explicit permission.
5.5 **Don't claim merged/unmerged from memory.** Check the PR state via GitHub before saying it.
5.6 **After EVERY push, reconcile against `origin/main` before saying a word.** Run `git fetch origin main` then `git log origin/main..HEAD`. If commits are stranded (pushed to a branch whose PR is already merged/closed, so they're going nowhere), **say so immediately and open a fresh PR** — never tell the founder "merge #X" when #X is already merged, and never tell them work "is on `main` / is done" without grepping `origin/main` and seeing it. *(14 Jun launch-plan stranded · 18 Jun #631→rescued #632 · 22 Jun #638→rescued #645. THREE times — the founder caught every one. This is Claude's #1 recurring failure.)*

5.6a **ROOT CAUSE FIX — never push onto a branch after its PR may have merged.** The trap is always the same: keep adding commits to a feature branch while its PR gets merged underneath. **So: (1)** one branch = one PR = one shippable change; when that change is presented for merge, **start a NEW branch off fresh `main` for the next piece** — do not pile follow-up commits onto the presented branch. **(2)** Before pushing ANY commit to an existing branch, run `git log origin/main..origin/<branch>` and confirm the branch's PR is still **open**; if it merged, branch off `main` and cherry-pick. **(3)** This is part of the §7 pre-send checklist — run it EVERY time, unprompted; the founder must never have to remind Claude to reconcile.
5.7 **Standing merge-state footer — report it, never wait to be asked.** After every push, run the Rule 5.6 reconcile and **end the message with a one-line footer**, verified from git/GitHub (never memory):
   **`📦 Merge state — PR #<n> <open|merged> · on main: <what's confirmed landed> · unmerged: <commit(s) or none>`**
   Built from `git fetch origin main` + `git log origin/main..HEAD` + the PR's live state. If the branch's PR is already merged and new commits are stranded, **open a fresh PR and put its number in the footer.** Right after creating any PR, verify its commits/diff before presenting it. *(Added 16 Jun: Claude updated an already-merged PR #567's body and told the founder to "merge it", then presented #568 without checking it — the founder should never have to ask "is it merged?")*

## 6. 💬 COMMUNICATION
6.1 **Lead with the answer, then the proof.** Short, direct, no narrating options Claude won't take.
6.2 **Own mistakes plainly.** When Claude got it wrong (assumption, invented filename, wrong branch), say what went wrong and why — no spin.
6.3 **Honest status only.** If tests failed, say so with the output. If a step was skipped, say it. "Done" means done and verified.
6.4 **No invented data.** No fake metrics, no borrowed logos, no made-up thresholds/filenames. Placeholders are labelled as placeholders.
6.5 **Ask only when it's genuinely the founder's call.** Decisions Claude can resolve from the code or sensible defaults, Claude makes — and says so. Real forks (design direction, go-live) → ask.
6.6 **The founder dictates the clock — NEVER tell him it's late, to rest, or to stop (added 24 Jun, founder-LOCKED).** No "it's late, bank it," no "pick this up fresh tomorrow," no assuming time-of-day or energy. He decides when a session ends and can work an all-nighter. Claude's job is to keep the work moving and surface the next step — stopping is the founder's call, never Claude's suggestion. (Flagging a *technical* reason to pause — "this migration shouldn't be rushed, here's the risk" — is fine; that's about the work, not the hour.)

## 7. ✅ THE PRE-SEND CHECKLIST (run this before every "here you go")
- [ ] Did I **verify against the actual code/git/GitHub**, not memory? (Rule 1)
- [ ] Did I **check the whole scope**, not one file? (Rule 1.3)
- [ ] Is this **staging or live** — did I say which? (Rule 2.4)
- [ ] Are any **inventory dots** I touched honest? (Rule 3)
- [ ] If there's a merge, did I include the **PR link** and confirm **no duplicate**? (Rule 5)
- [ ] **⛔ STRANDED-COMMIT GATE (Rule 5.6/5.6a — Claude's #1 recurring failure):** did I run `git fetch origin main` + `git log origin/main..origin/<branch>` and `list_pull_requests` **BEFORE presenting** — confirm nothing is stranded behind an already-merged PR, and confirm I didn't push follow-up commits onto a presented branch? **The founder must never have to remind me to reconcile.**
- [ ] Did I end with the **merge-state footer** (PR state · on main · unmerged), verified not from memory? (Rule 5.7)
- [ ] Did I **log the session** if work landed? (Rule 4.3)
- [ ] Am I stating only what I can **prove**? (Rule 1.4)

## 8. 🔄 SESSION START — RECONCILE BEFORE ANYTHING (added 14 Jun, after repeated state discrepancies)

> ⛓️ **AMENDED 21 Aug (R65):** silence is NEVER a go, and reading a response is never a go — a build starts only on the founder's explicit "go" with the switch to Opus. Pause is the default. Full ruling: PRODUCT-RULES R65.
> ⛓️ **EXTENDED 21 Aug by §15.6.** This reconciliation still runs at every session start — but the facts it establishes now go into the **session evidence ledger**, anchored to the baseline `origin/main` SHA, and are **not re-read** while that SHA and the source are unchanged. §8 is how the session *starts*; §15.6 is why it does not start over mid-build.
> The founder is tired of opening every session by catching Claude out on what's actually merged. So Claude starts from verified truth, not memory — **every time.**
8.1 **Read the history first.** Review the prior conversation/summary to recover what was decided and what was in flight.
8.2 **Fetch and check the last merges.** `git fetch origin main`; list recent merges (`git log origin/main`), identify the last PR(s) merged and when.
8.3 **Cross-reference history against `main` + the docs on GitHub.** Confirm that what the *previous* session claimed it shipped actually landed on `main` — grep the real files/docs. Hunt specifically for the gap between "what we said" and "what's actually on `main`."
8.4 **Open with a one-line reconciled state.** Before doing new work, tell the founder: the last merge, what's confirmed on `main`, and any stranded/unmerged work — so the session starts from truth. If everything reconciles, say so plainly.

## 9. 🥷 STEALS — every steal gets logged (added 22 Jun — "good steals can't go missing")
> A "steal" = any pattern/feature worth taking from another tool (Notion, Glean, Hypo, Alta, ClickUp, competitor demos, internal tools the founder uses, etc.). These are vital IP and they kept getting mentioned in passing and lost.
9.1 **Capture on sight.** The moment a steal is identified, it gets logged — same session, no "later."
9.2 **Logged in RED.** Every steal becomes a tracked **🔴 inventory item** (or maps to an existing item, with the ID written down). If it's already built, note which item realised it. **Nothing stays floating in prose only.**
9.3 **The STEALS CATALOG is the ledger** (`PRODUCT-INVENTORY.md` → "🥷 STEALS CATALOG / what to steal"): source → what we take → item ID. Add the source + the row when a new steal lands.
9.4 **Audit on request.** When the founder says "audit the steals," walk the catalog and confirm each line maps to a logged item; mint 🔴 items for any that don't.

## 10. 🗺️ DOC FRESHNESS — sub-docs don't rot (added 22 Jun — "we keep coming up with stale docs")
> The founder lives off the 4 core docs, but the many living sub-docs that branch off them were going stale silently. `DOC-MAP.md` is the freshness index; this rule keeps it true.
10.1 **One owner of truth per fact.** Status → PRODUCT-INVENTORY · today → LAUNCH-PAD · strategy → KIND-MASTER · future → V2-TRACKER. A sub-doc may *explain* a fact but never *own* a status — so there's only ever one place to update.
10.2 **Update-on-change.** When a fact changes, update its owning doc the **same session**. For a **sub-doc**, when the thing it describes changes, either update it or **flag it stale at the top + drop its STATUS to ⚠️ in DOC-MAP** — never leave it silently wrong.
10.3 **`Last-checked` discipline.** Every living sub-doc carries a `Last-checked: <date>` near the top; `DOC-MAP.md` carries the STATUS verdict (✅/⚠️/🛠️/🗄️) + an UPDATE-WHEN trigger per doc.
10.4 **Weekly doc-freshness sweep.** At each weekly close, re-verify the sub-docs the week's work touched, bump their `Last-checked`, update DOC-MAP. **Verify against the code/reality — never declare a doc fresh from memory** (the 22-Jun audit found 2 agent-flagged "stale" docs were actually fine — check before editing).
10.5 **Stale ≠ delete.** A superseded doc gets an archive banner + drops to the ARCHIVE tier in DOC-MAP; it's never left in place to mislead.

## 11. 👀 PREVIEW BEFORE LIVE — nothing client-facing ships unseen (added 22 Jun — the founder LOCKED this in)
> Post-launch, merging to `main` deploys **straight to the LIVE site clients use** — there is no gate. So every client-facing change must be **previewed by the founder on the staging site FIRST.** *(Tonight 6 builds went live unseen because I said "merge" instead of "preview" — never again.)*
11.1 **Two environments.** **LIVE (clients):** portal `app.get-kind.com` · api `api.get-kind.com` · admin `admin.get-kind.com` · site `www.get-kind.com` — this is the **`main`** branch. **PREVIEW (founder only):** staging portal `heartfelt-essence…railway.app` + `api-staging-production-2185.up.railway.app`, on the **`staging`** branch + the **`kind-staging`** Supabase. **Clients never see PREVIEW.**
11.2 **The loop — every client-facing feature:** 🤖 build → push to the **`staging` branch** (PREVIEW) → send the founder the **preview URL** → 🧍 founder reviews on PREVIEW → 👍 approve → 🤖 merge to `main` (LIVE) → 🧍 confirm on LIVE. 👎 → fix, back to PREVIEW.
11.3 **I never say "merge"/"ship" until the founder has previewed and approved.** Build PRs sit at 🟡 **with a preview link**; "go live" is the founder's explicit word AFTER previewing — never a default.
11.4 **Colour mapping for this loop:** 🟡 built, on PREVIEW (not live) · 🟣 founder approved on PREVIEW (still not live) · 🩷 shipped to LIVE (not yet re-confirmed) · 🟢 confirmed working on LIVE.
11.5 **Exceptions:** docs / non-deploying changes (the 4 core docs, RULEBOOK, etc.) don't deploy → no preview, normal PR + founder merge. Backend-only changes with no client-visible surface get previewed on `api-staging` where feasible, else the risk is called out explicitly.

## 12. ⚙️ THE ENGINE — the deliverability/sending engine IS the business (named 23 Jun, founder)
> When we say **"the ENGINE,"** we mean the **warmed-sending / deliverability engine** — the infrastructure that actually gets cold email into the inbox at scale. **It is the product's foundation, tracked as item 211.** The term is canonical: "the ENGINE" = item 211 everywhere (docs, chat, planning).
12.1 **Why it's THE thing.** The AI (FIGSY copy + scoring + African data) is the *differentiator*; the ENGINE is the *foundation* — if email lands in spam, nothing else matters. **Without it: SMB market dead · mid-market can't scale · enterprise won't touch us.**
12.2 **It compounds.** K.I.N.D's own outreach volume **× every client's** — and you **cannot share a sender across clients** (one client's spam complaints poison the rest). **Each client needs isolated, warmed sending** (own domains/mailboxes, warmed, rotated).
12.3 **It is the #1 priority.** Nothing scales cold without it — get the ENGINE right *before* scaling anything else.
12.4 **Build vs integrate** (founder decides): current lean = **integrate** a sending-platform API (**Smartlead** white-label for the product engine · **Instantly** for our own outreach now), put the AI + African data on top — don't rebuild the hardest wheel.

## 13. 🔍 AUDIT PROTOCOL — what "a full audit" must cover (folded in from FULL_CHECK, 23 Jun)
> ⛓️ **SCOPED 21 Aug — THIS SECTION DEFINES `MODE = FULL AUDIT`, AND NOTHING ELSE.**
> 🛑 **A FULL AUDIT NEVER STARTS AUTOMATICALLY.** Milestones, pre-release/pre-launch and major architecture, data or compliance changes are **reasons for Claude or GPT-5.6 to RECOMMEND one — then PAUSE.** They are not triggers that start it. Even the founder's explicit *"audit / teardown / full check"* establishes **intent only**: Claude scopes it first (Scope Card + Clause Table, §15.8) and **waits for GO** before the expensive work begins. A full audit is the most costly thing in this repo and must never begin on inference.
> **The WEEKLY audit is a different thing entirely** — change-based from the last persisted `audited-through` SHA (§15.15) — and **does not invoke this section.** The distinction matters: §13.2's *"reason over the whole system, grep can't find absence"* is right for a full audit and would be whole-repo archaeology every seven days.
> When the founder asks for an "audit / teardown / full check / make sure we're done," work through **every** section below and report on each — including the ones that come back clean. *(Origin: a 2-Jun "full teardown" missed that all Railway services have no failover, because it was scoped to "what I built this session" not "the whole system." An audit covers the system, never one session's diff.)*
13.1 **Single points of failure / redundancy** — what dies if Railway / Supabase / Resend / Anthropic is down? Any failover, status page, uptime monitor, tested DB restore?
13.2 **Standing commitments not yet built** — reason over conversation + docs for things *discussed* but never built ("backup plan", "Phase 2", "later"). Grep can't find absence — you must.
13.3 **Dead / duplicate / redundant code & config** — dead config, duplicate files, mounted-but-dead routes, orphan pages, env-var-crash-on-startup.
13.4 **Stubs / TODOs / fake data** — inventory every `TODO/FIXME/STUB/mock/placeholder`; which are intentional vs accidental gaps?
13.5 **Doc reconciliation** — does PRODUCT-INVENTORY reflect every real item (one dot, one owner)? Run `scripts/count-inventory.sh --check`. Anything built this session missing from the docs? Anything marked pending that's actually done?
13.6 **Build health** — `tsc --noEmit` clean on portal/api/admin? Anything uncommitted or unpushed? Broken internal links / visible placeholders?
13.7 **Brand / consistency locks** — purple `#7c3aed` only (zero stray blues)? Agent images Pixar-3D not photorealistic? Calendly consistent? No Vercel-as-current-fact?
13.8 **Report format — every audit ends with three explicit lists:** ✅ LIVE & VERIFIED (checked on disk/main) · 🛑 STOPPED / NOT BUILT (with the reason) · ⏳ PENDING (split founder-action vs Claude-build-queue). Never present "what I built" as a complete audit.

## 14. 🤖 HOW THE FOUNDER RUNS OPUS WHEN FABLE IS AWAY (founder-locked 19 Aug)
> ⛓️ **CHAINED 21 Aug — THE DAILY LOOP BELOW IS SUPERSEDED BY §15.2; EVERYTHING ELSE HERE STANDS.** This section is the 19-Aug record and is kept in full. What changed: **GPT-5.6 now sits on both sides of the build** — classifying and scoping the prompt before it, and independently reviewing the diff and evidence before any merge (§15.1/§15.2). So "THE DAILY LOOP" below, which runs founder↔Opus with no GPT step, is **no longer the current method**. Read §15 for how the day actually runs.
> **What survives unchanged and is carried into §15 by reference, not duplicated:** the FIVE STANDING RULES · the EVIDENCE BAR · the FABLE QUEUE · the TRIPWIRES (extended to eight in §15.9) · the PRIVACY-CHANGE GATE (§15.18).
> ⚠️ **One stale fact corrected in place:** the evidence bar below says *"pasted `check.sh` **6/6**"*. **The gate has been SEVEN stages since 21 Aug** (#1434 added `[7] Board tooling regression`). Read it as **7/7** — the requirement is a green gate, not a particular number, and the number will move again.

> Added 19 Aug 2026. Fable's availability is roughly weekly; the week runs on Opus. This section exists so the founder never has to hold the method in his head — *"opus does heavy lifting. you are reassurance."*

**THE SPLIT.** Opus does the heavy lifting — builds, doc chores, bounded mechanical verification. Fable is reassurance — architecture truth, compliance interpretation, independent review of Opus's work, launch-critical calls. Fable is available ~weekly; the week runs on Opus under this protocol.

**THE FIVE STANDING RULES (existing locks, one place):**
1. **R44:** Opus builds only on an explicit instruction to build. A report is a report; "go" after a report is not authorisation — Opus states what it intends to build and gets a yes first.
2. **R41:** verification requests go to the Fable queue unless bounded and mechanical; Opus never self-certifies its own build.
3. **P11:** every prompt gets a clause table, quoted from the founder's words, shown BEFORE building.
4. **THE EVIDENCE BAR** — no Opus work is accepted without all seven: the clause table · pasted red-proof output (not a claim of one) · pasted `check.sh` 6/6 · pasted 0 behind / ≥1 ahead of `origin/main` · the PR link · every file touched, listed · **RUNTIME PROOF where applicable** — anything touching migrations, Railway secrets, OAuth, Smartlead, Supabase region or real mail sending is not done at merge: the migration is seen applied in production, the secret is seen SET (never its value), the integration actually connects, the region is visually confirmed. Code truth and runtime truth are different truths (O5/O6). Any file outside the named scope = rejected unread.
5. **One prompt = one bounded change**, with named no-touch zones (default: `apps/website` (P12) · `docs/PRODUCT-RULES.md` · anything money-path unless named).

**THE FABLE QUEUE.** Anything Opus flags as uncertain, architectural, compliance-interpretive or contradictory goes into a running list at the top of LAUNCH-PAD (**"🔮 FOR FABLE"**) — not into action. Fable clears it each Wednesday. If it cannot wait a week, the founder decides with Opus's uncertainty stated in the FIRST line — never buried.

**THE DAILY LOOP.** ① founder states the goal in his own words → ② Opus returns the clause table + what it will touch → ③ founder says yes → ④ Opus builds, red-proves, runs the gate → ⑤ Opus reports against the clause table with the evidence bar → ⑥ founder merges → ⑦ same session: dot flip, LAUNCH-PAD, session-log line (one sentence = the commit message), rulings quoted verbatim into the register.

**THE TRIPWIRES — Opus stops and asks, never proceeds, when:** a fix wants to touch a second file class · a test needs weakening to pass · a doc contradicts the code · the instruction is one word · anything wants to write to `PRODUCT-RULES.md` or the frozen site.

**THE PRIVACY-CHANGE GATE (adopted 19 Aug).** Any prompt that introduces a new data source, new purpose, new recipient, new country, new channel, new provider, new FIGSY inference class or new autonomous Vida action triggers this checklist BEFORE the clause table: new data? → new purpose? → new recipient? → new country/transfer? → new lawful basis or channel rule? → DPIA impact? → privacy-notice update? → retention entry? → contract/vendor permission? Opus answers each in one line and the founder sees the answers before any yes.

---

## 15. 🤖 K.I.N.D CLAUDE OPERATING PROTOCOL v1 — founder-locked 21 Aug 2026

> **What this is.** The detailed operating reference for how the founder, GPT-5.6 and Claude Code work together. The short mandatory version lives in [`CLAUDE.md`](../CLAUDE.md) so it can be read every session without spending context; this is where the reasoning lives. **This section consolidates §8, §13 and §14 — it does not compete with them**, and none of that history is deleted.
>
> **Why it exists.** The same defects kept recurring at the founder's expense: whole-repo re-reads for small tasks, scope drifting mid-build, fixes that were never protected and had to be rediscovered, and claims from code that were never true at runtime. Those are process defects, not content problems.

### 15.1 ROLES

| Who | Does |
|---|---|
| **FOUNDER** | States intent in plain English. Gives **GO / MERGE / HOLD**. The only merge authority. |
| **GPT-5.6** | Classifies founder intent · designs the Claude prompt · reviews Claude's scope card and clause table **before** the build · **independently reviews the final diff and evidence** · recommends **GO / HOLD / MERGE / DO NOT MERGE**. |
| **CLAUDE CODE** | Repo inspection · evidence · bounded implementation · tests · PR. **Never merges.** |

⚠️ **GPT-5.6 is NOT a new source of product truth.** It classifies, scopes and reviews founder intent. **PRODUCT-RULES and explicit founder decisions remain authoritative** — a GPT recommendation never outranks a lock, and never becomes one. If GPT and PRODUCT-RULES disagree, PRODUCT-RULES wins and the disagreement is reported.

This is **the founder's current pre-launch operating method.**

### 15.2 THE DAILY FLOW

**Founder intent → GPT-5.6 classifies/scopes → Claude prompt → Claude SCOPE CARD + CLAUSE TABLE → founder GO → bounded implementation → targeted tests → `check.sh` once → PR → ⛔ CLAUDE STOPS → GPT-5.6 diff/evidence review → founder MERGE/HOLD.**

🛑 **THE STOP IS THE POINT.** After BUILD or DOC RECONCILIATION, Claude produces the PR, diff, tests and evidence — and **stops**. **Claude's own self-review is never merge authorisation**, however green the gate is (extends **R41**: Claude never self-certifies its own build; and **P3**: the founder merges). Every merge is authorised by the founder **after** GPT-5.6's independent review. ⚠️ **There is no small-task or docs-only exemption** — founder-ruled 21 Aug. A one-line docs PR goes through the same review as a money-path change, because the errors that reached `main` this month were one-line docs errors.

### 15.3 IDEAS VS DECISIONS — the distinction that stops half-decisions becoming product

**The founder has an idea but has NOT decided** → log it in **V2-TRACKER** as **UNRULED / DO NOT BUILD**, in his own wording, with no product implication. It is not a rule, not a status, and nothing downstream may cite it.

**The founder explicitly decides** → it becomes a **PRODUCT-RULES chained ruling** (old text struck and dated, new beneath, latest wins — never overwritten) → run the **dependency check** (§15.12) → **and the resulting product/code change is NOT built until separately approved.** Recording a ruling and building it are two different approvals.

### 15.4 TRUTH AUTHORITY

**PRODUCT-RULES > LAUNCH-PAD > PRODUCT-INVENTORY > KIND-MASTER > V2-TRACKER.**

| Doc | Its authority |
|---|---|
| **PRODUCT-RULES** | Founder rulings, verbatim and dated. **Beats every other document, always.** |
| **LAUNCH-PAD** | Current execution — what is being done now. |
| **PRODUCT-INVENTORY** | Implementation status. **The dots are the status of record**, not prose anywhere else. |
| **KIND-MASTER** | Strategy, decisions, history, session log — the *why*. |
| **V2-TRACKER** | Post-live roadmap and restored historical material. Fenced; never current authority. |

**Follow the higher authority automatically.** Do not ask which doc wins — the order above answers it. **STOP and ask only when the highest relevant authority is itself ambiguous or silent** on the question.

### 15.5 CHAIN-AWARE READING

**A search hit is not a live claim.** This repo chains history rather than deleting it, so old false sentences survive inside labelled ⛓️ correction quotes, struck text and dated supersession notes. Before reporting any string as a defect, **read what surrounds it**. Repeatedly re-reporting known historical text as a live error wastes the founder's time and trains him to ignore reports.

### 15.6 SESSION EVIDENCE LEDGER — anchored to the baseline SHA

**At bootstrap, record the baseline `origin/main` SHA.** Verify each canonical fact the task needs **once**, and hold it in an ephemeral ledger in session context. **The ledger is never committed.**

**Your own task commits and branch-HEAD movement do NOT invalidate the ledger.** A commit you just made cannot change what PRODUCT-RULES says.

**Re-read a ledger fact ONLY when:**
1. the canonical source supporting that fact changed;
2. `origin/main` advanced **and** the change could plausibly affect this task; or
3. the task now needs a fact that was never verified.

⚠️ **Named failure mode: re-reading PRODUCT-RULES or LAUNCH-PAD several times inside a single build is a defect, not diligence.** It burns the context the task needs and produces no new truth.

🔒 **How this reconciles with THE CITATION LAW** (CLAUDE.md, founder-ordered 6 Aug, chain-amended 21 Aug). The law's **duty is unchanged**: every founder ruling is cited by rule ID and date, and never paraphrased into a lock. What the ledger changes is **frequency** — verify the lock **once, at first use in the task**, record rule ID + date in the ledger, and reuse that evidence for every later sentence, PR body and report until a rule-5 trigger fires. ⚠️ **One thing always requires going back to the source: presenting text as a VERBATIM QUOTE.** A ledger entry records that a rule exists and what it means; it is not permission to reconstruct the founder's exact words from memory.

### 15.7 TASK MODES + TASK SIZES

**Modes:** `READ-ONLY VERIFY` · `BUILD` · `DOC RECONCILIATION` · `FULL AUDIT` (§13 defines the last). **If the mode is unclear, default to READ-ONLY / PAUSE** — never to BUILD.

**BUILD, DOC RECONCILIATION and FULL AUDIT all require the Scope Card + Clause Table and an explicit GO before they start** (§15.8). **READ-ONLY VERIFY is the only mode that may proceed on the founder's original prompt alone**, and only within the bounds that prompt set.

**Sizes:** **SMALL** ≤5 substantive files read / ≤3 changed · **MEDIUM** ≤12 read / ≤8 changed · **LARGE** anything above either threshold, which **requires explicit founder approval for the expanded scope before it starts.**

### 15.8 SCOPE CARD + CLAUSE TABLE — the pre-work contract

**Required before every BUILD, every DOC RECONCILIATION and every FULL AUDIT** — all three spend the founder's money and all three can drift. Return: **MODE · GOAL · TASK SIZE · RULES USED · FILES TO READ · FILES TO CHANGE · TESTS · NO-TOUCH · OPEN QUESTIONS**, then the **CLAUSE TABLE** (P11 — every clause quoted from the founder's words, never paraphrased), then **WAIT FOR GO**.

**READ-ONLY VERIFY is the one mode that may proceed without a second GO** — and only **inside the exact read-only bounds the founder's prompt already set**. Widening those bounds is a new task and needs the card.

**After GO, the clause table IS the contract.** Anything not in it is out of scope — including improvements that are obviously correct. No opportunistic cleanup.

### 15.9 SCOPE-CREEP TRIPWIRES — stop, do not proceed

Stop and ask before: **>12 substantive reads** · **>8 changed files** · touching a **second unrelated subsystem** · a **new provider, data source, channel or country** · an unapproved **money / send / suppression / tenancy** boundary · **weakening a test** to make it pass · a **missing founder ruling** · **runtime proof is required but inaccessible**.

*(Extends §14's five tripwires to eight; §14's originals — second file class, test weakening, doc-contradicts-code, one-word instruction, writes to PRODUCT-RULES or the frozen site — all still apply.)*

### 15.10 TESTING FUNNEL

**Smallest RED proof → targeted GREEN → affected package if required → `check.sh` ONCE at the end.** Never open with the full gate; never run it repeatedly to see if something changed.

### 15.11 REGRESSION / DRIFT PROTECTION — and the incident that proves the rule

A finding travels: **OPEN → FIXED → regression-protected OR weekly-monitored → CLOSED.** A fix with no protection is **FIXED BUT UNGUARDED**, never CLOSED.

🔧 **THE BOARD-TOOLING INCIDENT (21 Aug) — the pattern to remember.** The inventory's visible status table sat **79 items stale** while **every gate reported green**. Cause: the writer (`update-board.sh`, `$done ||=`) and the checker (`count-inventory.sh`, `head -1`) were **both first-match-only** — they shared one blind spot, so the writer kept the checker happy and the drift lived in the gap between them. Worse, the checker's own header already described that exact drift class as the reason it had been hardened; the hardening was written with `head -1` and reproduced the blind spot one row lower.

**Therefore: a new or changed validator must be tested against a DELIBERATELY BAD STATE** — good state PASS → bad state **FAIL** → restored state PASS. A checker that has only ever seen a good state proves nothing. **A validator and the thing it validates must not be written from the same assumption.**

### 15.12 PRODUCT-RULES DEPENDENCY CHECK

Whenever a founder rule is added or superseded: **identify the superseded rule** → **search current dependent docs** → **identify affected code and tests** → **report the dependency set to the founder**. **Do not silently update unrelated surfaces** — the report is the deliverable; the updates are a separate approval.

### 15.13 CODE VS RUNTIME TRUTH — where the labels apply

For **implementation, deployment, configuration, provider-entitlement and runtime** claims, state which of these applies:

- **CODE VERIFIED** — read in the source; true of the code.
- **RUNTIME VERIFIED** — observed in the running system (migration seen applied, secret seen SET, integration seen connecting, region visually confirmed).
- **RUNTIME UNVERIFIED** — the code says so; nobody has watched it happen.

**Never infer runtime truth from code alone** (O5/O6). ⚠️ **Ordinary documentation, history and product-rule statements are NOT labelled** — labelling everything devalues the label exactly where it matters.

### 15.14 FINDING STATES

**OPEN** · **PARKED / DEFERRED** · **FIXED BUT UNGUARDED** · **CLOSED / VERIFIED.**

**A PARKED finding is not rediscovered and re-reported** unless: the founder asks · a dependency changed · or files touched by the current task could invalidate it. Re-surfacing known parked items as new findings is noise.

### 15.15 THE WEEKLY AUDIT — change-based, with a persistent checkpoint

Once a week. **CHANGE-BASED from the previously persisted `audited-through` SHA** — not a whole-repo pass, and **it does not invoke §13**.

**Covers:** files changed that week · PRODUCT-RULES changes and dependency drift · canonical consistency · OPEN/PARKED/CLOSED regressions · test and checker health · stale runtime assumptions · **2–3 adversarial truth samples** · whether anything previously CLOSED has resurfaced.

**Output: GREEN / AMBER / RED.**

📌 **THE CHECKPOINT — how continuity survives a Claude with no memory.** At the end of each **approved** weekly audit, one compact line is recorded in **LAUNCH-PAD's existing current-execution layer**:

```
WEEKLY AUDIT · <date> · audited-through <origin/main SHA> · GREEN|AMBER|RED · open finding IDs
```

**The detailed audit report is NOT copied into LAUNCH-PAD.** The next weekly audit begins from that persisted `audited-through` SHA. This gives continuity across sessions **without creating another truth or audit document** (§15.19) — the line lives in a doc that already exists and is already read every day.

⚠️ **Writing that line is a future task under the normal scoped GO process. LAUNCH-PAD was NOT changed by the protocol install itself.**

### 15.16 FULL AUDITS — recommended, never auto-started

🛑 **A FULL AUDIT NEVER STARTS AUTOMATICALLY.** The four situations below are **reasons to RECOMMEND one**, not triggers that fire one: **major milestone** · **pre-release / pre-launch** · **major architecture, data or compliance change** · **explicit founder request**.

**The sequence, every time:**
1. Claude or GPT-5.6 **recommends** a full audit and says why.
2. **Claude PAUSES.**
3. If the founder wants it, Claude returns the **Scope Card + Clause Table** (§15.8).
4. **The audit begins only on the founder's explicit GO.**

Even the founder's own *"full audit / teardown / full check"* establishes **intent, not authorisation to start** — it goes through steps 3 and 4 like anything else, because the phrase does not say how deep, how wide, or how much of the week it consumes. **§13 defines what a full audit must cover** once authorised. **A full audit is never the default response to the word "check".**

### 15.17 COMPACT REPORTING

The normal report is: **VERDICT · CLAUSES · FILES · TESTS · EVIDENCE · OPEN ITEMS · PR/MERGE STATE.** No enormous logs unless the evidence itself requires them — pasted output is required where a rule demands proof (the §14 evidence bar), not as a substitute for a conclusion.

### 15.18 PRIVACY-CHANGE GATE

Runs **only** when introducing a **new data source · purpose · recipient · provider · country · transfer · channel · FIGSY inference class · autonomous Vida action**. The checklist is §14's and is not restated here: new data? → new purpose? → new recipient? → new country/transfer? → new lawful basis or channel rule? → DPIA impact? → privacy-notice update? → retention entry? → contract/vendor permission? Answered in one line each, **before** the clause table.

### 15.19 NO NEW SOURCE OF TRUTH

**No new summary or current-truth document — unless the founder explicitly changes this rule and approves it.** The default is no; the authority to change it is his, not the protocol's.

*(Why the default is no: `BUILD-STATUS.md` became a fifth status doc and claimed "the ONLY items not built: #515 + CI · Nothing left" while the entire sending spine was 🔴. That single line is what made the founder stop trusting the docs. Retired 26 Jul, #555.)*

### 15.20 THE CORE PRINCIPLE — founder's words

> **"Claude should prove only what the task needs, read only what the task needs, change only what the founder approved, and never reconstruct the whole company unless the founder explicitly requests a FULL AUDIT."**

> **"A problem we fix repeatedly is a process defect, not merely another content problem. Protect the fix so the founder does not pay to rediscover it."**

---
_If a rule here is wrong or missing, the founder says so and we edit this doc. This is the contract._
