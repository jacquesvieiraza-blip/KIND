# 🚀 LAUNCH PAD — zero product → live, the execution list

> **The one page you open.** Every row here either **gets us live** or **unblocks a row that does**. If it isn't on this page, it does not block launch — it lives in V2-TRACKER.
> **No dates on this page.** The founder locked the outside edge — **31 Aug** — and the order below is the order we work.
> **Dots are MIRRORED, never typed.** The dot next to each `#id` is stamped from PRODUCT-INVENTORY by `scripts/mirror-launchpad.sh`. Status of record lives **only** in the inventory. Why/history → **KIND-MASTER**. Future → **V2-TRACKER**. Money → **`docs/CASHFLOW-LAB.html`**.

**Board:** 🟢96 · 🩷282 · 🟣2 · 🟡45 · 🔴172 · ⏸6 · **Σ603** · live count: `scripts/count-inventory.sh`

---

## 🛑 HONEST STATE — five lines, rewritten every session *(6 Aug 2026)*

1. **The product works end to end and cannot send yet.** It sources, scores, masks, surfaces, takes the client's 👍, charges $4, writes the sequence, routes the reply and books the meeting into the client's own calendar. **Nothing has ever been sent** — three independent locks (warming status refused by the picker · `AUTO_OUTREACH_ENABLED` unset · the ladder itself) and the counter reads 0.
2. **The clock is the mailboxes.** Warming since 4 Aug in Instantly → **~Tue 25 Aug**, which is send-day. ✅ *Closed 11 Aug (R14 — **"ignore airmail. not relevant"**):* **only the 4 Google ladder boxes count** — `jacques@` + `hello@` on `kindoutreach.com` and `trykind.org`. The other boxes Instantly shows are out of scope and no longer get reconciled. They **cannot** be sent through in any case: our path reads `client_inboxes` and requires SMTP credentials (`sending-inbox.ts:63`) that vendor-provisioned boxes do not expose. **Founder-verified 11 Aug:** all four at **100% health, zero disconnects, `0 of 30` sent** — which is a fourth, vendor-side confirmation of line 1.
3. **The cost floor is $352/mo all-in**, not the ~$146 that headlined this page for weeks — that figure is the **PLATFORM** half only ($146 platform + $206 company = $352, `packages/shared/src/cost-floor.ts`). *(Company lines are `unverified-secondary` until **B2** checks them in a browser.)* At $4/approved lead, the platform half alone is ~37 approvals a month — roughly **one client**.
4. **Nothing runs but `scripts/check.sh` — and migrations now DO run.** ⚠️ *Corrected 6 Aug:* Actions **did** run — **788 runs, 25 May → 3 Jul** — then the account flag killed it; the old "0 runs ever" claim came from a blind API check. Nothing has run since 3 Jul and **GitHub support is unresponsive** (3,000+ users report the same flag, D2 = dead end), so the local gate **is** the only gate and `scripts/ship.sh` the only deploy. ✅ **BUT THE SCHEMA IS NO LONGER FROZEN:** A15 landed 6 Aug — `DATABASE_URL` is the session-pooler string, the runner works, **14/14 migrations applied**, and **nothing is outstanding**. Running a migration is now an ordinary founder step, not a blocker to design around.
5. **274 items are 🩷 — live and walked by nobody, and 6 Aug proved what that costs.** A 🩷 is not a working feature, it is a merged one. **#599 (operator CSV import) sat at 🩷 for a week and had never worked once** — the first real file returned *"Could not find the 'source' column of 'leads'"*, 0 rows. Two more queries named columns that do not exist, and the silent one meant **every inbound website-chat visitor who typed in their email failed to become a lead, for weeks.** 2,105 tests missed all of it because nothing compared a query's columns to the schema; a guard now does. Only the founder flips 🟢, and only on his own eyes (`FOUNDER_FLIP=1`). **The rule this earns: the walk is the status, not the merge.**

---

## 🎯 THE RUNLIST — every live item · description · owner · when *(rewritten 5 Aug on the founder's order: "i work off launchpad — this table needs to be on the launchpad." Updated every session; this table IS the standings report.)*

> **Selling stays OFF this board** (founder, 4 Aug: *"i know how to sell."*). Status of record per item lives in PRODUCT-INVENTORY — rows here reference ids and the dots are script-stamped.

### ✅ CLOSED — done and verified *(collapsed; full detail lives in the inventory rows + KIND-MASTER session log)*

| # | Item | Outcome |
|---|---|---|
| A1–A7 | #615 merge · Vida cleanup · Option A ruling · the 159 stay · #618 · cap ladder #622 (D1 = a status flip on the day, in the runbook) · $99-product VOID | ✅ all closed 5 Aug |
| B1 | ICO registration (~£47/yr) | ✅ **founder registered 5 Aug** — keep the confirmation for the accountant |
| C3 · C7 · C8 | #615 shipped · PECR pass #617 · skip_reasons surfaced #620 | ✅ built + merged 5 Aug |
| A14→runbook | [`docs/SEND-DAY-RUNBOOK.md`](./SEND-DAY-RUNBOOK.md) (#621) — every step code-verified | ✅ written; execution stays below |
| #619 #623 #624 #625 | Board honesty · "$ in" from the ledger · reply-path probe · stranded-lead fix | ✅ built + merged 5 Aug — three of the four found by the founder's own walks |
| — | 5 Aug totals | **9 builds · 11 PRs merged · 1,995 tests green · 44 red proofs** |

### 🔴 CRITICAL TO LAUNCH-DAY LIVE — these must be nailed, in this order

| # | Item · what it is | Why critical | Owner | Deadline |
|---|---|---|---|---|
| ~~A18~~ | ✅ **PASSED IN FULL 6 Aug — founder-tested end to end: *"tested A18 in full works perfect."*** The whole return path ran live for the first time: CSV import planted the lead (#599's fix + migration, proven working in production) → real email from an outside address to `hello@gettingkind.com` → Resend inbound MX → signed webhook → matched on `leads.email` → classified → **visible in the Unibox**. Step 0 had already proven: domain verified, receiving ON, webhook Enabled listening for `email.received`, signing secret matching Railway. **The reply path is no longer theoretical.** *(And the test's Step-1 failure is what exposed #599 + the audit batch #637–#643.)* | The return path is PROVEN — the send-day risk left is the SEND half (A14) | 🧍 ✅ | ✅ done |
| ~~**A20**~~ | ✅ **CLOSED 11 Aug — MERGED AND THE MIGRATION IS APPLIED.** Code merged 6 Aug in [#1299](https://github.com/jacquesvieiraza-blip/KIND/pull/1299); the founder ran the migrations 11 Aug and Vida reported **16 of 16 applied** via `aws-0-eu-west-1.pooler.supabase.com:5432` — `20260806_audit_columns` among them, founder-screenshot-verified. **#637 was the send-day one:** without `figsy_sent_emails.client_id` the client's dashboard would have read "0 sent" forever no matter how much we sent. That failure mode is gone. ⚠️ **The seven items stay 🩷, NOT 🟢** — a migration proves the schema is right; only a walk proves the behaviour. They ride **A11**. *(Original row below, kept per the chain rule.)* **THE AUDIT REPAIR BATCH — #637–#643. ✅ BUILT 6 Aug, awaiting your merge + migration.** Migration `20260806_audit_columns` (both homes) creates `figsy_sent_emails.client_id`/`.status` + four `clients` columns and backfills; the send path now writes `client_id` on **both** inserts; four wrong-name selects fixed rather than columns invented (`emails_sent`→`current_step` · `step1_subject` deleted, the A/B check never read it · `reply_count`/`enrolled_count`→`replies_total`/`leads_enrolled` · `locations`→`geographies`); `figsy_sessions` → distinct clients in `figsy_chat_messages`; #349 checks on the web form + seeders; the admin usage chart's double prefix gone; `lena.ts` deleted. **#642 guards now sweep EVERY table, every button, every RPC — and caught four bugs in themselves first.** 2,134 tests, gate 6/6. | **#637 was the send-day one** — the client's dashboard would have read 0 sent forever | 🤖 ✅ built · 🧍 merge + Run migrations + Schema probe | **next** |
| ~~**A21**~~ | ✅ **CLOSED — MERGED 6 Aug** in [#1302](https://github.com/jacquesvieiraza-blip/KIND/pull/1302). *(This row read "awaiting merge" for five days after it had merged. Corrected 11 Aug — `doc-lint` checks dots and counts, never prose, so a stale sentence in a table is invisible to every automated check we have.)* **ONE STEP LIMIT + DOCS CURRENT (R3/R11) — built 6 Aug.** The website was never the bug: **four different step limits were live at once** (activation 7 · operator save 10 · two hard-coded 7s · a client page capped at 3 saying *"(max 3)"*) while six pages promised 10. Cured with ONE constant in `@kind/shared` + `website-step-claims.test.ts` binding every claim to it. Docs: the **sales playbook** carried a "PRICING (locked)" header quoting the RETIRED $1/$3 ladder — fixed, and `doc-lint`'s doc list widened so selling docs are linted at all. | A client could read 10, be shown 3, and be enforced at 7 | 🤖 ✅ built · 🧍 merge | **next** |
| **A11** | **THE PINK WALK — 281 items are LIVE and no human has ever walked one.** *(Founder-ruled 6 Aug, register R8: "all pink items must be in critical… customer facing we screwed.")* **ALL 281, in sessions, RANKED most-critical first** — money and send path (charge · wallet · enrol · send · reply · suppression) before the rest, and **all are vital**. A 🩷 means merged, not working: **every defect found on 6 Aug (#599, #637–#641, and A18's own blocker) was a 🩷 that turned out to be broken.** You flip 🟢 yourself on your own eyes: `FOUNDER_FLIP=1 bash scripts/flip-dots.sh 🟢 <id>` | **The single largest launch risk left** — a client arriving before these walks is trusting 281 untested claims | 🧍 walks · 🤖 ranks the list | **rolling, from now** |
| ~~A16~~ | ⛓️ **SUPERSEDED 11 Aug BY R14 — *"ignore airmail. not relevant."*** The domain question this row existed to answer is retired: **only the 4 Google ladder boxes are in scope** and the rest are never reconciled again. *(Kept, not deleted, per the chain rule. The original close below was itself imprecise — it placed the AirMail set on one domain when the 23-Jun order records two — which is exactly why the founder retired the question rather than let it be re-litigated.)* ✅ **CLOSED 6 Aug — the 9 boxes are explained and there is nothing to do.** Instantly holds **4 Google boxes on 2 domains, warming since 4 Aug** (the ladder's boxes) **+ 5 older AirMail-provisioned boxes on `nexttrygetkind.com`, which are PAUSED** — founder-confirmed. The ladder maths was right all along; the count looked wrong because nothing recorded that the AirMail set still existed. *(`lib/instantly.ts` has always described "the five already-warm AirMail boxes" — the doc simply never reconciled the two sets.)* ⚠️ **They stay paused:** they are not part of the warm-up clock and must never be picked for a send. | Resolved — no domain risk | 🧍 ✅ | ✅ done |
| **A9** | **The two walks** — ⚠️ Walk 1 half-done (it produced #623 + #625; **the $4 charge has never been seen move on screen** — needs "Source 20 leads" ≈$5.60, then approve ONE fresh lead: $4,000 → $3,996) · Walk 2 = one fresh signup completing clean, not started | Proves the client path end-to-end before a stranger walks it | 🧍 | **when funds allow** *(R7 — real money must move; not a slip)* |
| **A19** | **Till walk** — Milla → Billing → the $299 button → Stripe page must show **$299** → cancel at the card screen. Free | First real payment must not fail silently | 🧍 | **when funds allow** *(R7)* |
| **A10** | **Monday Instantly glance** (health scores rising, zero disconnects) · **18 Aug Google ~$28 charge succeeds**. ✅ *Week of 11 Aug: DONE* — founder screenshot shows all **4 ladder boxes at 100% health, zero disconnects, `0 of 30` sent**; warm-up counts 17–20. ⚠️ One drift to glance at before 25 Aug: **#198 records a daily cap of 25; Instantly shows 30.** Not a risk — a number in a doc that no longer matches the vendor screen. | Inboxes die quietly if the card fails | 🧍 | Mondays · 18 Aug |
| **A14** | **SEND-DAY — execute the runbook, alone** | The finish line | 🧍 | **~25 Aug** |

### 🟠 IMPORTANT, NOT SEND-BLOCKING — 18 Aug is the 🤖 access checkpoint *(founder-ruled 6 Aug: "i can pay for you to stay" — a renewal decision, NOT a cliff. The "die on 18 Aug" framing that stood here was wrong.)*

| # | Item | Status now | Owner | Deadline |
|---|---|---|---|---|
| ~~A15~~ | ✅ **DONE 6 Aug — and it was the biggest single unblock of this project.** The founder pasted Supabase's **session-pooler** string into Railway → `@kind/api` → `DATABASE_URL`, redeployed, and ran the migrations: **14 of 14 applied.** Proven live before any schema changed — the RLS audit opened a real Postgres connection and reported reading `aws-0-eu-west-1.pooler.supabase.com:5432`. *(The old direct host is IPv6-only and Railway has no IPv6 route — that was the whole bug.)* ⚠️ The founder's DB password contained `@`, which is the URI delimiter between password and host; it was **reset to alphanumeric** rather than percent-encoded, because a mis-encoded character fails with a misleading DNS/tenant error. | 🧍 ✅ | ✅ done |
| B2 | 30-min browser pass — Stripe FX % · intl 3.0/3.25% · FreeAgent multi-currency · **Xero price-lock before 1 Sept** · ICO fee page. The agent writes the verified numbers into `cost-floor.ts` | ⬜ not started | 🧍→🤖 | before 18 Aug |
| ~~A17~~ | ✅ **DONE 6 Aug, immediately after A15.** Vida → Engine → PDL monthly spend cap → **"Saved. Sourcing is now capped at $100 a month."** The same card threw *"Could not find the table 'public.app_settings' in the schema cache"* twenty-four hours earlier — #627 wrote the migration, A15 let it run. | 🧍 ✅ | ✅ done |
| C4 | ⚠️ **#616 seat cap — SCREEN BUILT 5 Aug, PREVIEW-FIRST PENDING YOU (RULEBOOK §11).** The Command Centre → Seats tab now shows seats-in-use of the cap, warns before the wall, and lets the **owner** (not a manager) change it; the API's refusal renders verbatim. **CLIENT-FACING, so it has NOT been merged to live on my own say-so** — your call in the morning: preview from the branch, or authorise straight-to-live with an immediate walk (the A1/#615 precedent). | 🧍 decides · 🤖 built | **your call** |
| ~~C5~~ | ✅ **RULED 6 Aug — DEACTIVATE ONLY, permanently.** No permanent seat deletion will be built. A seat's sent mail, replies and meetings are the client's own record and are never destroyed. The client-facing card no longer says *"that ruling is still open"* — it now states the policy and that history stays theirs. | 🧍 ruled · 🤖 copy | ✅ done |
| ~~C6~~ | ~~**Vida "no tax ID" badge**~~ ✅ **BUILT 5 Aug (night batch).** The clients list now carries `vatBadge` in all three tones — amber *no tax ID* · grey *not VAT registered (declared)* · green *tax ID on file* — rendered from the SHARED function with no local rule and no house/demo special case. `vat_number` rides the worklist query that was already being made. 4 of the 18 tests cover it. | 🤖 | ✅ done |
| ~~D4~~ | ✅ **DONE 6 Aug — `staging` refreshed.** It was **131 commits behind** `main` and carried one commit main did not (`da5be128`, the #413/#410/#327 copy fixes). **Verified before touching it:** that work is already on `main` by another route — the false *"No card required"* line it removed is gone from `main`, and staging's 9,562 "deletions" were simply files it never received (`cost-floor.ts`, `company-details.ts`). Nothing was lost. `staging` now == `main`, so the preview site is a true preview again. | 🤖 ✅ | ✅ done |
| A12 | Failover teardown ($12/mo back) — pinned order in the runbook: DNS repoint FIRST | ⬜ | 🤝 | by 18 Aug |
| A8 | Google "storage full / 30 GB" anomaly — Google Admin, 5 min | ⬜ | 🧍 | 5 min |
| A13 | Terms rulings — "yours to keep" on churn · what "training" includes → counsel words the Terms | ⬜ | 🧍 | before client #1 |

### 🔁 RECONCILED OFF THE OLD BLOCK A — 6 Aug (#628). Nothing here was lost; each was checked against the code

*The old BLOCK A described the sending spine as unbuilt. It was written before it was built, and it never got rewritten — so seven open ids lived only in prose the founder had stopped reading. Each was re-read against the code, not against the doc. **The dot is still the inventory's word, not this table's.***

| # | Where it actually stands, in the code | Disposition |
|---|---|---|
| #547 🩷 | **BUILT.** The shared `const FROM = COLD_FROM` is gone — the sender resolves per client from `client_inboxes` (`lib/sending-inbox.ts`) and goes out over that mailbox's SMTP (`lib/mailer.ts`). A client with no mailbox **does not send**, with deliberately nothing to fall back to. | ✅ **superseded as a build** · proof rides **A14** send-day |
| #551 🩷 | **BUILT.** `lib/smartlead-inbound.ts` + its route feed replies from a client's own mailbox into the unibox, routed on the **receiving mailbox** — `routes/smartlead-inbound.route.test.ts` pins the case that matters: two clients emailing the same prospect must never see each other's replies. | ✅ **superseded as a build** · proof rides **A18** |
| #552 🩷 | **BUILT.** `sendReadiness()` (`lib/start-work.ts`) backs the Vida **"Cannot send"** panel, and the reason is never assumed to be "no mailbox". | ✅ **superseded as a build** |
| #600 🩷 | **BUILT.** Client Zero is set up entirely from Vida — add a mailbox to any client any number of times, adopt the house account rather than minting a second (#584), send-readiness per client. No SQL anywhere. | ✅ **superseded as a build** |
| #599 🟢 | **BUILT, NEVER RUN.** `POST /operator/import-leads` exists with two test files, and it has **never been pointed at a real Apollo export**. It is the only door Client Zero's list comes through. Press **Check the file** before **Import** — it writes nothing and names every column it read. | 🟠 **still open — as a PROOF**, not a build · 🧍 · before Client Zero sources |
| #550 🩷 | **BUILT, UNPROVEN, PARKED ON PURPOSE.** `smartlead.ts` has the full campaign/sequence/lead API and `smartlead-send.ts` pushes an approved lead — but the key returns **401** and nothing has run against a live workspace. Parked until a client is actually in the works, which is the right call: it buys nothing before then. | ⚪ **still open, deliberately parked** · 🤝 · when a client signs |
| #549 🔴 | **GENUINELY NOT DONE — and it is 🔴 for a real reason.** `instantly-push.ts` exists but is gated on `HOUSE_CLIENT_ID`, which **stays unset** (#593), and the vendor question underneath is unresolved: `lib/instantly.ts` reports API v2 needs Growth-or-above *from Instantly's own 402 body*, while Instantly's published plan table lists **API: No** on Growth — the tier the founder bought. **Running our own outreach inside the product may not be buyable at this tier at all.** | ⚪ **still open · UNCERTAIN — needs the founder** (see the PR body) |

### 🗝️ WHAT A15 UNBLOCKED IN PRODUCTION — 6 Aug (each still owes its walk before 🟢)

*These were not new builds. The code shipped weeks ago and could not reach a database that matched it. Applying the migrations turned six long-standing defects off at once.*

| Class | What was actually wrong until 6 Aug |
|---|---|
| **#343** | `cron_claims` absent — the cron single-run guard. Two replicas would double **every email and every charge**. This is the reason A15 existed |
| **#342** | `subscriptions.status` had no `lapsed` value, so the lapse cron **threw 500 every night, silently, since the day it shipped** |
| **#340** | The status enum rejected the real Stripe states — a **declined card was being written as `active`** |
| **#366** | `icps.pdl_scroll_token` absent, so every sourcing run re-read page one: **a repeat client's second month found ZERO new people** |
| **#554b** | `client_inboxes` had **no RLS at all** |
| **#350** | `USING(true)` policies left tables **anon-readable in production** |
| **#627** | `app_settings` created — the PDL cap became settable (A17) |
| — | `figsy_campaigns.copilot_mode` + `approve_before_send` — both halves of the human-in-the-loop gate the first paying client needs |

⚠️ **None of these flips a dot to 🟢.** The migration means the schema is right; the walk is what proves the behaviour.

### 🧭 RULED 6 AUG (SECOND ROUND) — the last four open questions closed

| # | Ruling | State |
|---|---|---|
| **Sequence cap** | **7, not 10.** The 8-Jul lock (*"no it is 10. we know this"*) predates the 22-Jul pivot; the #612 gate has HARD-blocked above 7 since 4 Aug. **#426 superseded — nothing to build.** The Vida editor offered a 10th step it would then refuse to activate; now capped at 7, and a test binds the two numbers | ✅ closed |
| **2 stranded paid leads** | **Enrol — they were paid for.** Built as **#631**: an operator button on the integrity row that reports them. ⚠️ Until now that alert said *"enrol it from Vida"* and **no such control existed** | ✅ built · 🧍 press it |
| **#301 Denise price** | **Moot.** Open since 3 Jul waiting on a price for a product that is not sold | ✅ closed |
| **#630** | Flipped 🩷 — verified live on the System page | ✅ done |

### 🧭 RULED 6 AUG — decisions closed, nothing left hanging

| # | Ruling | What it means |
|---|---|---|
| **C5** | **Deactivate only. Permanently.** | No seat-delete will ever be built. A seat's mail, replies and meetings are the client's record and are never destroyed. Client-facing copy now states the policy instead of saying the ruling is open. |
| **D4** | **Refresh `staging`.** ✅ done | It was 131 commits behind. Verified nothing unique was lost, then fast-forwarded. The preview site is a true preview again. |
| **Dots** | **Flip them.** ✅ 19 flipped 🟡 → 🩷 | #547 #548 #550 #551 #552 #555 #556 #557 #558 #561 #564 #570 #571 #573 #574 #575 #576 #599 #600 — each verified against the code first, not the doc. 🟡 dropped 64 → 45. |
| **A16** | **Closed — no risk.** ✅ | The 9 boxes are 4 Google warming + 5 paused AirMail. Ladder maths was always right. |
| **#549** | ⚠️ **CORRECTED 6 Aug — the morning version of this row was WRONG and the founder caught it from memory.** It said Growth was a tier we were "blocked" behind and that clients don't depend on Instantly. **The truth, per the founder's own #577 lock (30 Jul): Growth is the correct and SUFFICIENT purchase — HyperGrowth's API was only ever needed to drive a sender we deliberately stopped using.** And **Instantly IS load-bearing for clients, permanently**: every client mailbox is Google-direct (our engine needs SMTP credentials, vendor boxes expose none) and starts **cold** — the Instantly Growth warmup is what warms them, which is why the per-client cost line carries no separate warm-up charge. *"We use Instantly even later for clients because of the way we set up"* — **correct.** What is narrowly still 🔴: only the original "push our leads into an Instantly campaign by API" dogfooding form, which #577's amendment **superseded** (our engine sends our outreach). Retiring the ITEM never means retiring Instantly. ⚠️ One unverified edge flagged in the row: "unlimited warmup on Growth" is our own research note, not a vendor letter — worth one glance before client #1. |

### ⚪ NOT LAUNCH-CRITICAL — dated so nothing goes missing

| # | Item | Owner | When |
|---|---|---|---|
| **#632** | **MARKETING — the plan and its daily/weekly/monthly actions now have a home: [`docs/marketing/`](./marketing/README-marketing.md).** Founder-ordered 11 Aug. **Not launch-blocking and deliberately so** — R20 (11 Aug) keeps R2 in force, so the public half ships switched off and **warm outreach runs first**: $0, no ruling needed, and the only channel that can produce a paying client inside 20 days. ⚠️ **Actions live in `MARKETING-PLAN.md` §3, not here** — this row is a pointer, because daily execution for *launch* is what this page governs. ⚠️ **Two rules worth reading before touching beehiiv:** never authenticate the warming domains, never change `gettingkind.com` MX. | 🧍 | **warm outreach: now** · public: gated on client #1 + A11 money walks |
| B3 | Accountant (~£60–90/mo, compliance-only) | 🧍 | before first revenue |
| B4 | Track overseas software spend monthly (reverse-charge counts toward the £90k VAT threshold; meter in the cashflow artifact) | 🧍 | monthly |
| B5 | Banking/FX — Stripe-settle-USD + Wise (~£3/sale) | 🧍 | at ~20 sales/mo |
| B6 | Insurance — PI when a contract demands it · EL the day anyone joins payroll | 🧍 | triggered |
| D2 | ⏸ **Postgres password rotation** (burned, in git history) · **GitHub flag appeal — ruled a DEAD END 6 Aug.** The flag killed Actions on **3 Jul** (788 runs before it, zero since) and blocks third-party OAuth (the Supabase login path). **Support is unresponsive — 3,000+ users report the same flag on community boards. Nothing may queue behind this appeal.** The escape route, post-live: a company GitHub org + the 30-min scratch test (does the flag follow?), then transfer — parked deliberately because re-authorizing Railway's deploy connection on a new org is exactly what the flag blocks, and a broken deploy link mid-sprint stalls the launch. ⚠️ Also noted: the Cloudflare Pages website-failover copy stopped updating 3 Jul — **≥34 days stale, predates the 2 Aug site restore + freeze**; if DNS ever flips to it, it serves a July site. | external | dead end — plan around it |
| D3 | Railway replica re-check | — | only if ever Pro |
| — | Subscription path hardcoded price (`stripe.ts:657`, dormant) | 🤖 | the day subscriptions return |
| — | Dead `handleSubscribe` (#563/#431) | 🤖 | with subscriptions |

## 🔑 Legend + how anything goes live

**Owner:** 🤖 Claude (code, PRs) · 🧍 founder (merge · deploy · run SQL · approve previews · money · 🟢) · 🤝 both.
**Dots** — status lives in the **inventory** only; the dots on this page are stamped by script: 🔴 not built · 🟡 built, on a PR · 🟣 founder approved it on **preview** · 🩷 live, nobody has walked it · 🟢 live **and** walked. ⏸ blocked.
**A merge is a deploy on this repo** — `main` is the live site clients use. So **every client-facing build is previewed first**: preview link → founder 🟣 → merge → 🩷 → walk → 🟢. Docs don't deploy, so docs don't need a preview.
**Ship:** `bash scripts/ship.sh`. Services: website=`KIND` · portal=`@kind/portal` · admin=`@kind/admin` · api=`@kind/api`.

## 📌 Standing notes

- **Money (current — ONE WALLET, 24–25 Jul; PRICE RE-LOCKED 3 AUG):** one dollar wallet per client · first purchase **$299 = the fully-onboarded pack, 100 approved leads included**, then a flat **$4 per approved lead, FINAL** · **no time limit on paid leads** · a dead email is never charged · meetings are reported, not refunded · **only the client's 👍 ever spends — operators never**. **Two gates protect it:** at least **20** approvals the first time round, and **30 days with no approvals suspends them**. Full model + the cost floor → **`docs/CASHFLOW-LAB.html`** (canonical) · cost detail → `run-costs-and-cashflow.md`.
- **Instantly is ours. Smartlead is the clients'.** Both run **inside the product** — we use our own product for our own outreach. No CSV hand-off.
- **No new SQL** beyond committed, reviewed, **idempotent** migrations run from Vida → Engine. The Supabase SQL editor is unreachable (GitHub removed the Supabase OAuth app).
- **Before any real send:** `/engine/env` must show `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` · `money_rpcs` installed — **plus** whatever #548 settles on for per-inbox credentials.
- **Architecture (locked):** AI drafts and scores; deterministic code decides and **fails closed**; state advances only after a verified provider/DB success.
- **A demo account never touches a real prospect.** `is_demo` is a hard stop inside the send path, and demo addresses are `.invalid` (RFC 2606).

---

## 🗄️ WHAT USED TO BE ON THIS PAGE

The 2–4 Aug honest-state prose, the cost-floor rebuild, the Stripe block, **BLOCKS A–E**, the
"moved off this page" ledger and **BLOCK M** were retired to **KIND-MASTER → "RETIRED FROM
LAUNCH-PAD — 6 Aug 2026"** on 6 Aug (#628). They were **moved verbatim, not deleted**: two
hundred lines of superseded prose sat between the top of this page and the runlist the founder
actually works off.

**Every open `#id` in those blocks was reconciled against the inventory AND the code before it
moved** — the dispositions are in the 6 Aug session-log entry and in each item's own inventory
row. Nothing left this page without a home. Status of record for all of them is, as always,
**PRODUCT-INVENTORY**.

