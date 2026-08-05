# 🚀 LAUNCH PAD — zero product → live, the execution list

> **The one page you open.** Every row here either **gets us live** or **unblocks a row that does**. If it isn't on this page, it does not block launch — it lives in V2-TRACKER.
> **No dates on this page.** The founder locked the outside edge — **31 Aug** — and the order below is the order we work.
> **Dots are MIRRORED, never typed.** The dot next to each `#id` is stamped from PRODUCT-INVENTORY by `scripts/mirror-launchpad.sh`. Status of record lives **only** in the inventory. Why/history → **KIND-MASTER**. Future → **V2-TRACKER**. Money → **`docs/CASHFLOW-LAB.html`**.

**Board:** 🟢95 · 🩷251 · 🟣2 · 🟡64 · 🔴173 · ⏸5 · **Σ590** · live count: `scripts/count-inventory.sh`

---

## 🛑 HONEST STATE — five lines, rewritten every session *(6 Aug 2026)*

1. **The product works end to end and cannot send yet.** It sources, scores, masks, surfaces, takes the client's 👍, charges $4, writes the sequence, routes the reply and books the meeting into the client's own calendar. **Nothing has ever been sent** — three independent locks (warming status refused by the picker · `AUTO_OUTREACH_ENABLED` unset · the ladder itself) and the counter reads 0.
2. **The clock is the mailboxes.** Warming since 4 Aug in Instantly → **~Tue 25 Aug**, which is send-day. ⚠️ Instantly shows **9 boxes across 3 domains** and the ladder maths assumed 4 on 2 — **A16 confirms the real count**, and it is not optional: sending from a box you did not mean to warm burns a domain.
3. **The cost floor is $352/mo all-in**, not the ~$146 that headlined this page for weeks — that figure is the **PLATFORM** half only ($146 platform + $206 company = $352, `packages/shared/src/cost-floor.ts`). *(Company lines are `unverified-secondary` until **B2** checks them in a browser.)* At $4/approved lead, the platform half alone is ~37 approvals a month — roughly **one client**.
4. **Nothing runs but `scripts/check.sh`.** GitHub Actions has **never executed** on this repo (five workflows registered and `active`, 0 runs ever) — so the local gate is not a belt over CI, it **is** the only gate, and `scripts/ship.sh` is the only deploy. The Supabase **dashboard is reachable again** (5 Aug, alternate login), but **migrations still cannot run** until `DATABASE_URL` is the session-pooler string — that is **A15**, and it now also blocks the `app_settings` table (#627).
5. **251 items are 🩷 — live and walked by nobody.** A 🩷 is not a working feature, it is a merged one. Only the founder flips 🟢, and only on his own eyes (`FOUNDER_FLIP=1`).

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
| **A18** | **Live-fire reply test** — test send to yourself → reply from another address → it must appear in the Unibox / "to triage" | The only proof of the return path. A dead one reads exactly like "nobody replied" — discovered on send-day otherwise | 🧍 | this week |
| **A16** | **Confirm the mailbox count** — Instantly shows **9 boxes / 3 domains** incl. `nexttrygetkind.com` (in no plan); the ladder maths assumed 4 on 2 | Sending from a box you did not mean to warm burns a domain | 🧍 tell the agent | before 18 Aug |
| **A9** | **The two walks** — ⚠️ Walk 1 half-done (it produced #623 + #625; **the $4 charge has never been seen move on screen** — needs "Source 20 leads" ≈$5.60, then approve ONE fresh lead: $4,000 → $3,996) · Walk 2 = one fresh signup completing clean, not started | Proves the client path end-to-end before a stranger walks it | 🧍 | before 18 Aug |
| **A19** | **Till walk** — Milla → Billing → the $299 button → Stripe page must show **$299** → cancel at the card screen. Free | First real payment must not fail silently | 🧍 | before 18 Aug |
| **A10** | **Monday Instantly glance** (health scores rising, zero disconnects) · **18 Aug Google ~$28 charge succeeds** | Inboxes die quietly if the card fails | 🧍 | Mondays · 18 Aug |
| **A14** | **SEND-DAY — execute the runbook, alone** | The finish line | 🧍 | **~25 Aug** |

### 🟠 IMPORTANT, NOT SEND-BLOCKING — but 🤖 items die on 18 Aug

| # | Item | Status now | Owner | Deadline |
|---|---|---|---|---|
| **A15** | 🔼 **`DATABASE_URL` → the SESSION POOLER string. A 5-minute job that now unblocks THREE things.** The migration runner cannot reach Postgres at all: `DATABASE_URL` resolves to a host literally named **`base`**. It must be Supabase's **session-pooler** string (`postgres.<ref>@aws-0-<region>.pooler.supabase.com:5432`) — the direct host is IPv6-only and Railway has no IPv6 route. **⚠️ THIS IS NO LONGER BLOCKED:** the 5-Aug note said the pooler string was behind the locked Supabase dashboard; the founder got in by an alternate login the same day, so the string is **reachable now**. **Do this:** Supabase → Settings → Database → **Session pooler** → copy → Railway → `@kind/api` → `DATABASE_URL` → paste → redeploy → **Vida → Engine → Run migrations**. ⚠️ **Do not paste the string into chat — it contains a password.** **What it unblocks:** ① `cron_claims` (#343 — only matters above 1 replica, and nothing warns you when that changes) · ② **`app_settings` (#627), which does not exist and is why the PDL-cap card fails on Save** · ③ **A17 below**, which cannot be done until this is. | 🧍 | **5 min — the highest-leverage 5 minutes on this page** |
| B2 | 30-min browser pass — Stripe FX % · intl 3.0/3.25% · FreeAgent multi-currency · **Xero price-lock before 1 Sept** · ICO fee page. The agent writes the verified numbers into `cost-floor.ts` | ⬜ not started | 🧍→🤖 | before 18 Aug |
| A17 | ⛔ **Set the PDL monthly cap — BLOCKED ON A15, and the 5-Aug "2-minute click" here was wrong.** The card is built (#626: **Vida → Engine → "PDL monthly spend cap"**, reads back from the database rather than echoing) — but the founder pressed **Save** on 6 Aug and got *"Could not find the table 'public.app_settings' in the schema cache"*. **The table does not exist and never did**, in the repo or in production; the System check had been reading it for months and reporting *"no usable setting exists — set it"*, which is why nobody noticed. **The migration now exists** (`20260806_app_settings`, #627) and running it needs the runner, which needs **A15**. **So the order is A15 → Run migrations → THEN this**, and both screens now say so instead of naming a fix nobody can perform. ⚠️ **$0 is still refused on purpose** — the check reads 0 as "unset", so a $0 cap would look set while the check said otherwise; use the kill-switch to stop sourcing. | 🧍 | **after A15** |
| C4 | ⚠️ **#616 seat cap — SCREEN BUILT 5 Aug, PREVIEW-FIRST PENDING YOU (RULEBOOK §11).** The Command Centre → Seats tab now shows seats-in-use of the cap, warns before the wall, and lets the **owner** (not a manager) change it; the API's refusal renders verbatim. **CLIENT-FACING, so it has NOT been merged to live on my own say-so** — your call in the morning: preview from the branch, or authorise straight-to-live with an immediate walk (the A1/#615 precedent). | 🧍 decides · 🤖 built | **your call** |
| C5 | ⚠️ **Seat removal — SAFE DEFAULT SHIPPED, RULING STILL OWED.** No delete was built: delete-vs-deactivate is your open decision, and building the destructive half of an undecided question is how it gets decided by accident. The card says removal deactivates and keeps history, and that the ruling is open. **One word from you settles it** — my recommendation stays *deactivate only*. | 🧍 one word | with C4 |
| ~~C6~~ | ~~**Vida "no tax ID" badge**~~ ✅ **BUILT 5 Aug (night batch).** The clients list now carries `vatBadge` in all three tones — amber *no tax ID* · grey *not VAT registered (declared)* · green *tax ID on file* — rendered from the SHARED function with no local rule and no house/demo special case. `vat_number` rides the worklist query that was already being made. 4 of the 18 tests cover it. | 🤖 | ✅ done |
| D4 | Ruling: `staging` is 46 commits behind `main` — refresh it, or keep previewing client-facing PRs from branches? | 🧍 say the word | 🧍→🤖 | by 18 Aug |
| A12 | Failover teardown ($12/mo back) — pinned order in the runbook: DNS repoint FIRST | ⬜ | 🤝 | by 18 Aug |
| A8 | Google "storage full / 30 GB" anomaly — Google Admin, 5 min | ⬜ | 🧍 | 5 min |
| A13 | Terms rulings — "yours to keep" on churn · what "training" includes → counsel words the Terms | ⬜ | 🧍 | before client #1 |
| A11 | Pink walk — 🩷 → 🟢 on your "good". **250 pinks stand unverified**, incl. all 9 shipped 5 Aug. After 18 Aug flip yourself: `FOUNDER_FLIP=1 bash scripts/flip-dots.sh 🟢 <id>` | ⬜ | 🧍 | during warmup |

### 🔁 RECONCILED OFF THE OLD BLOCK A — 6 Aug (#628). Nothing here was lost; each was checked against the code

*The old BLOCK A described the sending spine as unbuilt. It was written before it was built, and it never got rewritten — so seven open ids lived only in prose the founder had stopped reading. Each was re-read against the code, not against the doc. **The dot is still the inventory's word, not this table's.***

| # | Where it actually stands, in the code | Disposition |
|---|---|---|
| #547 | **BUILT.** The shared `const FROM = COLD_FROM` is gone — the sender resolves per client from `client_inboxes` (`lib/sending-inbox.ts`) and goes out over that mailbox's SMTP (`lib/mailer.ts`). A client with no mailbox **does not send**, with deliberately nothing to fall back to. | ✅ **superseded as a build** · proof rides **A14** send-day |
| #551 | **BUILT.** `lib/smartlead-inbound.ts` + its route feed replies from a client's own mailbox into the unibox, routed on the **receiving mailbox** — `routes/smartlead-inbound.route.test.ts` pins the case that matters: two clients emailing the same prospect must never see each other's replies. | ✅ **superseded as a build** · proof rides **A18** |
| #552 | **BUILT.** `sendReadiness()` (`lib/start-work.ts`) backs the Vida **"Cannot send"** panel, and the reason is never assumed to be "no mailbox". | ✅ **superseded as a build** |
| #600 | **BUILT.** Client Zero is set up entirely from Vida — add a mailbox to any client any number of times, adopt the house account rather than minting a second (#584), send-readiness per client. No SQL anywhere. | ✅ **superseded as a build** |
| #599 | **BUILT, NEVER RUN.** `POST /operator/import-leads` exists with two test files, and it has **never been pointed at a real Apollo export**. It is the only door Client Zero's list comes through. Press **Check the file** before **Import** — it writes nothing and names every column it read. | 🟠 **still open — as a PROOF**, not a build · 🧍 · before Client Zero sources |
| #550 | **BUILT, UNPROVEN, PARKED ON PURPOSE.** `smartlead.ts` has the full campaign/sequence/lead API and `smartlead-send.ts` pushes an approved lead — but the key returns **401** and nothing has run against a live workspace. Parked until a client is actually in the works, which is the right call: it buys nothing before then. | ⚪ **still open, deliberately parked** · 🤝 · when a client signs |
| #549 | **GENUINELY NOT DONE — and it is 🔴 for a real reason.** `instantly-push.ts` exists but is gated on `HOUSE_CLIENT_ID`, which **stays unset** (#593), and the vendor question underneath is unresolved: `lib/instantly.ts` reports API v2 needs Growth-or-above *from Instantly's own 402 body*, while Instantly's published plan table lists **API: No** on Growth — the tier the founder bought. **Running our own outreach inside the product may not be buyable at this tier at all.** | ⚪ **still open · UNCERTAIN — needs the founder** (see the PR body) |

### ⚪ NOT LAUNCH-CRITICAL — dated so nothing goes missing

| # | Item | Owner | When |
|---|---|---|---|
| B3 | Accountant (~£60–90/mo, compliance-only) | 🧍 | before first revenue |
| B4 | Track overseas software spend monthly (reverse-charge counts toward the £90k VAT threshold; meter in the cashflow artifact) | 🧍 | monthly |
| B5 | Banking/FX — Stripe-settle-USD + Wise (~£3/sale) | 🧍 | at ~20 sales/mo |
| B6 | Insurance — PI when a contract demands it · EL the day anyone joins payroll | 🧍 | triggered |
| D2 | ⏸ **Postgres password rotation** (burned, in git history) · **GitHub flag appeal** — the flag is what keeps GitHub Actions at **0 runs, ever**. ⚠️ **Supabase access is NO LONGER part of this row:** the dashboard was reachable again from 5 Aug by an alternate login, so migrations are blocked on **A15** (a Railway variable), not on Supabase. | external | blocked |
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

