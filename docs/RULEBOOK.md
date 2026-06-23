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
   - **Product (portal / api / agents)** → held on the staging branch (`claude/kind-carson-MYhSl`, PR #502) until **go-live after Fri 19 Jun**. Merging it IS go-live — never a routine sync.
2.4 **State the deploy impact every time.** When presenting work, Claude says plainly: "this goes live on merge" or "this is docs/staging only, nothing deploys."
2.5 **Launch date is 🚀 Fri 19 Jun 2026.** Held work is post-19 unless the founder names an exception (e.g. the Company Command Centre).

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
4.7 **The status board is SCRIPT-GENERATED, never hand-typed.** `scripts/count-inventory.sh` is the only source of the PRODUCT-INVENTORY dashboard (it counts real item rows between the `COUNT:START/END` markers, both table formats). Hand-typing it caused a 227-vs-214 drift + a false-live item. Run `--check` before every docs PR.
4.8 **Reconcile against `main` at session close.** Before ending: `git log origin/main..HEAD` (nothing stranded), run the count `--check`, and confirm what the docs claim matches what's actually on `main`. State the reconciled merge-state. Never report a fix from a branch that isn't merged.
4.3 **Log every session.** End of session: update the **SESSION LOG** + **RESUME HERE** in `KIND-MASTER.md`, bump the **Last updated** line on any doc touched, then commit + push.
4.4 **One source of truth wins.** Where docs disagree, `KIND-MASTER.md` is authoritative.
4.5 **`LAUNCH-PAD.md` governs daily execution** (the only doc the founder opens day-to-day). It references inventory items by ID and pulls strategy from the master; if it ever disagrees on **status** the inventory wins, on **strategy** the master wins.
4.6 **Render every action in its one owning doc — same session, no silent changes.** Any state change is reflected immediately: flip the **PRODUCT-INVENTORY** dot (the only status edit) · update the **LAUNCH-PAD** runlist · append the **KIND-MASTER** session-log line (= the git commit message, written once). **Single source of truth:** STATUS only in PRODUCT-INVENTORY · EXECUTION only in LAUNCH-PAD · STRATEGY/HISTORY only in KIND-MASTER · FUTURE only in V2-TRACKER. If two docs state the same fact, delete the copy and keep the home. The agent operating-system map lives in root **`CLAUDE.md`**.

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
> When the founder asks for an "audit / teardown / full check / make sure we're done," work through **every** section below and report on each — including the ones that come back clean. *(Origin: a 2-Jun "full teardown" missed that all Railway services have no failover, because it was scoped to "what I built this session" not "the whole system." An audit covers the system, never one session's diff.)*
13.1 **Single points of failure / redundancy** — what dies if Railway / Supabase / Resend / Anthropic is down? Any failover, status page, uptime monitor, tested DB restore?
13.2 **Standing commitments not yet built** — reason over conversation + docs for things *discussed* but never built ("backup plan", "Phase 2", "later"). Grep can't find absence — you must.
13.3 **Dead / duplicate / redundant code & config** — dead config, duplicate files, mounted-but-dead routes, orphan pages, env-var-crash-on-startup.
13.4 **Stubs / TODOs / fake data** — inventory every `TODO/FIXME/STUB/mock/placeholder`; which are intentional vs accidental gaps?
13.5 **Doc reconciliation** — does PRODUCT-INVENTORY reflect every real item (one dot, one owner)? Run `scripts/count-inventory.sh --check`. Anything built this session missing from the docs? Anything marked pending that's actually done?
13.6 **Build health** — `tsc --noEmit` clean on portal/api/admin? Anything uncommitted or unpushed? Broken internal links / visible placeholders?
13.7 **Brand / consistency locks** — purple `#7c3aed` only (zero stray blues)? Agent images Pixar-3D not photorealistic? Calendly consistent? No Vercel-as-current-fact?
13.8 **Report format — every audit ends with three explicit lists:** ✅ LIVE & VERIFIED (checked on disk/main) · 🛑 STOPPED / NOT BUILT (with the reason) · ⏳ PENDING (split founder-action vs Claude-build-queue). Never present "what I built" as a complete audit.

---
_If a rule here is wrong or missing, the founder says so and we edit this doc. This is the contract._
