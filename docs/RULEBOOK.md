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

## 3. 🎨 THE INVENTORY COLOUR SYSTEM (4 states — never blur them)
Every item in `PRODUCT-INVENTORY.md` carries exactly one dot. Claude must use them honestly:
| Dot | Means | Bar to earn it |
|-----|-------|----------------|
| 🟢 **GREEN** | **LIVE** — in production and **verified working** | deployed + actually run + checked |
| 🟣 **PURPLE** | **APPROVED + LOCKED** — built and signed off, **but not live** | founder approved the design/build; sitting on a branch |
| 🟡 **YELLOW** | **NEEDS VERIFICATION** — built or drafted, **not yet checked/approved** | exists but unproven; pending review or testing |
| 🔴 **RED** | **NOT BUILT** | idea / planned only |
3.1 **🟢 is earned, never claimed.** Nothing is green until it has run live and been verified (Rule 1.6).
3.2 **Don't promote a dot without evidence.** Moving 🔴→🟡→🟣→🟢 requires the proof named in the table.
3.3 **Purple ≠ live.** Built-and-approved is still staging. Don't describe purple work as if customers can see it.

## 4. 🌿 BRANCHES & DOCS
4.1 **Docs live on `main`.** The three source-of-truth docs (`KIND-MASTER.md`, `PRODUCT-INVENTORY.md`, `V2-TRACKER.md`) live on the live branch so logging travels with the code. Never maintain them only on a held branch again (that caused the 13→14 Jun drift).
4.2 **Cut work branches FROM `main`, merge BACK to `main`.** No long-lived parallel doc branches.
4.3 **Log every session.** End of session: update the **SESSION LOG** + **RESUME HERE** in `KIND-MASTER.md`, bump the **Last updated** line on any doc touched, then commit + push.
4.4 **One source of truth wins.** Where docs disagree, `KIND-MASTER.md` is authoritative.
4.5 **`LAUNCH-PAD.md` is DERIVED, never a 4th source.** It's the assembled run-list pulled from the three source docs. **Refresh it in the same session you touch the master** (when a launch item ships, slips, or a date moves) so it never drifts — that's the whole reason the old docs went stale. If the launch pad ever disagrees with the three sources, the sources win and the pad gets corrected, not the other way round.

## 5. 🔗 PULL REQUESTS & MERGES
5.1 **Every time Claude presents something to merge, it includes the GitHub PR link.** No "the PR is up" without the URL.
5.2 **Never open a duplicate PR.** If a branch already has an open PR, push to it and **update that PR's description** — don't create a second one. Check first.
5.3 **Keep the PR body honest and current.** It must match what's actually in the branch (real filenames, real status, known gaps called out — e.g. "destination pages don't exist yet").
5.4 **Branch discipline.** Develop on the assigned feature branch; push with `git push -u origin <branch>`; never push to a different branch without explicit permission.
5.5 **Don't claim merged/unmerged from memory.** Check the PR state via GitHub before saying it.
5.6 **After EVERY push, reconcile against `origin/main` before saying a word.** Run `git fetch origin main` then `git log origin/main..HEAD`. If commits are stranded (pushed to a branch whose PR is already merged/closed, so they're going nowhere), **say so immediately and open a fresh PR** — never tell the founder "merge #X" when #X is already merged, and never tell them work "is on `main` / is done" without grepping `origin/main` and seeing it. *(This rule exists because on 14 Jun Claude pushed the locked launch plan to a branch whose PR was already merged, then told the founder to merge it — the commits were stranded; cost the founder time and trust. Same stranded-commit failure as the 14 Jun admin session. Twice = a rule.)*

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
- [ ] After pushing, did I **reconcile against `origin/main`** and flag any stranded commits? (Rule 5.6)
- [ ] Did I **log the session** if work landed? (Rule 4.3)
- [ ] Am I stating only what I can **prove**? (Rule 1.4)

## 8. 🔄 SESSION START — RECONCILE BEFORE ANYTHING (added 14 Jun, after repeated state discrepancies)
> The founder is tired of opening every session by catching Claude out on what's actually merged. So Claude starts from verified truth, not memory — **every time.**
8.1 **Read the history first.** Review the prior conversation/summary to recover what was decided and what was in flight.
8.2 **Fetch and check the last merges.** `git fetch origin main`; list recent merges (`git log origin/main`), identify the last PR(s) merged and when.
8.3 **Cross-reference history against `main` + the docs on GitHub.** Confirm that what the *previous* session claimed it shipped actually landed on `main` — grep the real files/docs. Hunt specifically for the gap between "what we said" and "what's actually on `main`."
8.4 **Open with a one-line reconciled state.** Before doing new work, tell the founder: the last merge, what's confirmed on `main`, and any stranded/unmerged work — so the session starts from truth. If everything reconciles, say so plainly.

---
_If a rule here is wrong or missing, the founder says so and we edit this doc. This is the contract._
