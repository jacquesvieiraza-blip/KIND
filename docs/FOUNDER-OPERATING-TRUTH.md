# 🎛️ FOUNDER OPERATING TRUTH — the daily operating layer

> **What this is.** The one page the founder opens to answer *"what is happening right now, and what needs me?"* It is the **operating** layer: today, this week, who is doing what, what is blocked, what needs a decision.
>
> **What it is NOT — and this is the rule that keeps it honest.** It **does not own any canonical truth**. Product status lives in **PRODUCT-INVENTORY**. Rulings live in **PRODUCT-RULES**. Strategy and history live in **KIND-MASTER**. Future detail lives in **V2-TRACKER**. Daily execution lists live in **LAUNCH-PAD**. **Where this page and a canonical home disagree, the canonical home wins and this page is the bug.**
>
> **Authority order:** **PRODUCT-RULES > LAUNCH-PAD > PRODUCT-INVENTORY > KIND-MASTER > V2-TRACKER.**
>
> **Where to look things up:** [`FOUNDER-TRUTH-REGISTER.md`](./FOUNDER-TRUTH-REGISTER.md) indexes all 194 reconciled truths by CMP ID. [`SESSION-BOOTSTRAP.md`](./SESSION-BOOTSTRAP.md) is the 60-second entry point for a fresh chat. [`founder/operating-centre.html`](./founder/operating-centre.html) is a **non-canonical rendered view** of this page.

---

## 🚀 TODAY

| | |
|---|---|
| **Launch date** | **Friday 4 September 2026** — unconditional (**R76**, supersedes R57's 25 Aug) |
| **Current objective** | Finish the launch experience to **one finished, premium, conversational standard** across Milla, Vida and the website (**R79** — quality is NOT V2) |
| **Current Builder task** | **BUILD-002 · Programme Commercial + Money Engine** — packet at [`founder/tasks/BUILD-002.md`](./founder/tasks/BUILD-002.md) · conveyor state **BUILDER RETURNED** · next: **GPT verification (stage 9)** |
| **Current Scout task** | *none open* — BUILD-002's scouting completed and was consumed by the build |
| **Next READY task** | **NONE.** The READY FOR BUILDER queue is empty. ⚠️ **BUILD-002 is NOT ready** — it is still being scouted, and scouting is four conveyor stages short of READY |
| **Board** | 🟢106 · 🩷309 · 🟣2 · 🟡51 · 🔴191 · ⏸7 · **Σ666** *(status of record: PRODUCT-INVENTORY · live count: `scripts/count-inventory.sh`)* |

## 📅 THIS WEEK

The launch cut is in **LAUNCH-PAD** and that page owns it — this is the shape, not the list.

- **The proof journey (T1/T2/T10)** is still not proved end to end. A green segment is not a green journey.
- **The 4 Sep send day (C9 / A14)** runs from `SEND-DAY-RUNBOOK.md`, alone.
- **Founder-only items** — C1 Google verification, C3 money walk, C5 cost lines, C6 partner pre-live, C7 counsel/W18.
- **Nothing new gets built without an explicit go** (**R65** — pause is the default; silence is never a go).

---

## 🚦 THE TWO LEVELS OF TASK STATE — founder-locked 28 Aug

**A task has TWO states at once, and they answer different questions. Neither replaces the other.**

### Level 1 · FOUNDER ATTENTION — *does this need me?*

The existing six states. **Unchanged.**

| State | Means |
|---|---|
| **NOW** | being worked, this is the focus |
| **NEXT** | queued behind NOW |
| **WAITING** | blocked on someone or something else |
| **PARKED** | deliberately not now |
| **RESEARCH** | needs investigation before it can be scoped |
| **DONE / LEARNED** | finished, and what it taught is recorded |

### Level 2 · THE CONVEYOR — *where in the pipeline is it?*

The Scout/Builder execution lifecycle, **underneath** the six states. This is new; it does **not** replace them.

| # | Conveyor state | Means |
|---:|---|---|
| 1 | **NOT SCOUTED** | nobody has investigated it yet |
| 2 | **SCOUTING** | investigation in progress |
| 3 | **SCOUT RETURNED** | findings are back, unverified |
| 4 | **GPT VERIFIED** | independent review of the Scout findings passed |
| 5 | **FOUNDER APPROVED** | the founder has approved the scope |
| 6 | **READY FOR BUILDER** | frozen scope, waiting for a builder |
| 7 | **BUILDING** | build in progress |
| 8 | **BUILDER RETURNED** | build is back with evidence, unverified |
| 9 | **GPT VERIFIED** | independent review of the build passed |
| 10 | **FOUNDER MERGED** | the founder merged it |
| 11 | **DEPLOY VERIFIED** | proved working in production, not just merged |
| 12 | **COMPLETE** | done |
| ⚠️ | **FOUNDER DECISION REQUIRED** | can enter at **any** stage and stops the conveyor until answered |

⚠️ **Two things this model exists to prevent, both of which have actually happened here:**
- **MERGED ≠ DEPLOYED ≠ WORKING.** States 10, 11 and 12 are deliberately separate. Item #700's code merged on 22 Aug and its dot stayed 🟡 — merged is not shipped, and shipped is not proved.
- **GPT VERIFIED appears TWICE (4 and 9), on purpose.** The Scout's findings and the Builder's output are different claims and each needs its own independent review. **Claude's own self-review is never merge authorisation** (Protocol rule 20).

**One task carries both.** Example, live right now:

| Task | Founder state | Conveyor state |
|---|---|---|
| **BUILD-002** · Programme Commercial + Money Engine | **NOW** | **BUILDER RETURNED** — next: GPT verification |
| **BUILD-001** · Step 7 Founder Truth System | DONE/LEARNED | **FOUNDER MERGED** *(in `main` at `5dfd34dc`)* |
| **#704** · retention duration | **WAITING** | **FOUNDER DECISION REQUIRED** |
| **#706** · AE playbook trial script | **WAITING** | **NOT SCOUTED** — waiting on the programme model, not on a decision |

---

## 📥 READY FOR BUILDER — the queue

**Empty.** No task is currently frozen and waiting for a builder.

*A task enters this queue only after **SCOUT RETURNED → GPT VERIFIED → FOUNDER APPROVED**. Anything here has a frozen scope; a builder does not renegotiate it.*

---

## 🛑 BLOCKERS

| # | Blocker | Owner | Why it is blocked |
|---|---|---|---|
| **#704** | **The data-retention duration** — four live surfaces state four different clocks (90 days · 12 months · 24 months, with the DPA inverting the privacy policy) | 🧍 founder + counsel (**W18**) | **No authoritative basis exists in the repo to choose.** Choosing would be inventing a legal position. **Unresolved is the correct state.** |
| **F13 / W18** | PDL Order Form — cross-client reuse right | 🧍 counsel | The signed paper has not been found |
| **F5** | Is `eu-west-1` the **only** place client data lives? (backups · PITR · sub-regions) | 🧍 | Unverified — see *Product truth* below |
| **T10** | The proof runtime path, end to end | 🤖 | Each fix so far closed one segment; the journey is unproved |
| **#706** | **The AE sales playbook still scripts the dead 14-day trial** — six places in `apps/admin/src/app/playbook/page.tsx`, including two prospect email templates | 🤖 | ⛓️ **NOT a founder decision — corrected 28 Aug.** The direction is already settled: **no launch free trial · no 90-Day Pipeline Guarantee · the programme model is the launch commercial destination.** This is **implementation / operator-surface cleanup**, waiting on an implementation dependency rather than on an answer. ⚠️ Operator-facing, so not a live client-facing claim — but it is what a human then says to a prospect |

## ✋ FOUNDER DECISIONS REQUIRED

| # | Decision | Why it cannot be taken by an agent |
|---|---|---|
| **#704** | Retention duration: 90 days / 12 months / 24 months | A legal position, not a fact in the repo |
| **#705** | Whether the removed 90-Day Pipeline Guarantee needs a Terms-change notice, and the rights of anyone who signed under it | Counsel (W18), not an agent |

---

## 🔀 ACTIVE PRs · GPT VERIFICATION · MERGE STATE · DEPLOY STATE

**Verified live against GitHub at the time of writing. Never quote a PR number without re-checking it is open.**

| PR | What | Conveyor state | Note |
|---|---|---|---|
| **#1466** | **BUILD-002 · Programme commercial + money engine** | **BUILDER RETURNED** → next **GPT verification** | ⚠️ **The migration is NOT applied to production.** Nothing in it is live commercial truth — $299/100/$4 still runs |
| ~~#1465~~ | BUILD-001 · Step 7 founder truth system | **FOUNDER MERGED** | ✅ **Independent review returned PASS, subject to operating-state corrections — all applied.** `check.sh` **ACCEPTED AMBER**: the only failure was the known intermittent `proof-review-handoff` assertion, and BUILD-001 changes `docs/**` only. **Awaiting the founder's merge.** |
| **#1463** | Founder Operating Truth — register, operating view, bootstrap, visual surface | **PARKED** | ⚠️ **Do not merge as-is.** Its second parallel ID series is superseded; only its **visual shell** was reused (see BUILD-001) |
| **#1436** | Log the post-launch Founder-Operator OS idea | **BUILDER RETURNED** | Not touched by Step 7 |
| **#1427** | P34's screens | **BUILDER RETURNED** | Not touched by Step 7 |

**GPT verification.** **BUILD-001 / PR #1465 — reviewed and PASSED**, subject to the operating-state correction now applied. **Both verification stages are satisfied: stage 4** (the Scout handoff was independently reviewed before the Builder started, and the founder then approved J1/J2/J3) **and stage 9** (this build). ⛓️ *An earlier version of this line claimed stage 4 had never happened — that was wrong, and the correction is kept in the packet at §9 rather than quietly swapped.* **The conveyor has no missing stage; the next action is the founder's merge.**

**Merge state.** PR **#1464** (Founder truth reconciliation, Steps 2–6) is **MERGED** into `main` at `1cd99357`. PR **#1465** is **open and unmerged**. **MERGE IS NEVER CLAUDE'S** (Protocol rule 20) — the founder merges, after independent review.

**Deploy state.** ⚠️ **UNVERIFIED for the Step-6 client-facing corrections.** The corrected portal Terms, privacy pages and landing pages are **merged, not proved live**. Merged is not deployed and deployed is not walked. **GitHub Actions has not run since 3 Jul 2026** — `scripts/check.sh` is the only gate.

## 🎯 LAUNCH GATES

From the Register: **39 launch-blocking (🔴) · 29 needs-work (🟠) · 20 proved (🟢)**. The gate column in [`FOUNDER-TRUTH-REGISTER.md`](./FOUNDER-TRUTH-REGISTER.md) is the list; **PRODUCT-INVENTORY dots remain the status of record.**

⚠️ **Nothing is 🟢 until walked live in production.** Live-but-unwalked is 🩷.

---

## 📦 PRODUCT TRUTH — pointers, not restatements

| Subject | Where it lives |
|---|---|
| All 194 reconciled truths, by CMP ID | [`FOUNDER-TRUTH-REGISTER.md`](./FOUNDER-TRUTH-REGISTER.md) |
| Every founder ruling (**R1 … R81**) | [`PRODUCT-RULES.md`](./PRODUCT-RULES.md) — **wins every conflict** |
| Status of record (the dots) | [`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md) |
| Today's execution list | [`LAUNCH-PAD.md`](./LAUNCH-PAD.md) |
| Strategy, decisions, session log | [`KIND-MASTER.md`](./KIND-MASTER.md) |
| **Infrastructure location** | Database **`eu-west-1` (Dublin)**, compute **Railway US West** — proved by a working production pooler connection (6 Aug) and the founder's own dashboards (20 Aug, R56). ⚠️ **NOT proved that it is the only location** — open question **F5**. Evidence: PRODUCT-RULES Open list |

## 💰 COMMERCIAL TRUTH — three registers, never collapsed

| Register | What | Where |
|---|---|---|
| **LIVE NOW** | **$299 onboarding pack · first 100 approved leads included · $4 per approved lead thereafter.** Reviewing is free. One wallet. | `packages/shared/src/constants/index.ts` — **money sentences are interpolated, never typed** |
| **SUPERSEDED HISTORY** | The $1/+$3 ladder (dead 24 Jul) · **R68's $4 → $8 migration** (superseded 27 Aug — **do not start it**) | **R68** · LAUNCH-PAD **T9** |
| **CURRENT DIRECTION — UNBUILT** | The **programme model**: priced per targeted booked meeting on the locked curve (**R81**), 250 leads per targeted meeting (**R77**), contribution defined (**R78**) | **R74 · R77 · R78 · R81** · V2 Founder Idea Bank |

⚠️ **NOTHING IN THE PROGRAMME MODEL IS BUILT, AND NONE OF IT MAY BE QUOTED** to a client, a partner or the website until it ships. ⚠️ **NO OUTCOME GUARANTEE** — meetings are targets and planning estimates, never promises (**R69 / R77**).

**💵 Money and economics** → [`run-costs-and-cashflow.md`](./run-costs-and-cashflow.md) · model of record [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html) (**PR6** — if the lab and the workings disagree, the lab wins).

## 🔮 V2 / POST-LAUNCH

[`V2-TRACKER.md`](./V2-TRACKER.md) — **not read for current-product or launch work** unless the founder asks for future work or a current rule points into it.

⚠️ **ONE THING MAY NOT BE PARKED THERE: quality (R79).** Finish and coherence across Milla, Vida and the website are launch-critical. Moving them to V2 does not make them V2 — it makes V2 wrong.

## 💡 IDEA INBOX

**No material founder idea or decision may exist only in chat (R75).** Every idea is written into its canonical home the same session, with a stable ID, date, state and canonical home. The master backlog is the **Founder Idea Bank (FI-01 … FI-69)** in V2-TRACKER. **No competing "ideas" document may be created.**

⚠️ **A RECORDED IDEA IS NOT AN APPROVED ONE.** Logging never converts an idea into scope, into "built", or into launch readiness.

## 🛟 RECOVERY REQUIRED

*Things that are known-broken or known-unproved and need someone to go back to them.*

| What | State |
|---|---|
| **Step-6 client-facing corrections** | Merged, **deploy unverified** — the corrected Terms and privacy pages have not been walked live |
| **#700** launch-coherence dot | Code merged 22 Aug, dot still 🟡 — the flip is the founder's (`bash scripts/flip-dots.sh 🩷 700`) |
| **T5** `acquisition_memory` migration | Code shipped; **migration not applied to production** |
| **T3** run-outcome `failed` migration | `20260826_run_outcome_failed` **must be run after the deploy** |
| **T4** paid providers | `PAID_PROVIDERS_ENABLED=true` must be set on @kind/api or live sourcing will not run |
| **GitHub Actions** | **Dead since 3 Jul 2026** (account flag; support unresponsive). `scripts/check.sh` is the only gate — a red lint is fixed, never bypassed |

---

*This page is the operating layer. It restates no canonical truth, and it is regenerated by hand each session as part of the end-of-session ritual. Dates live in git.*
