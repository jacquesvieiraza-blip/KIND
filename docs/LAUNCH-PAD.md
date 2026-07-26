# 🚀 LAUNCH PAD — zero product → live, the execution list

> **The one page you open.** Every row here either **gets us live** or **unblocks a row that does**. If it isn't on this page, it does not block launch — it lives in V2-TRACKER.
> **No dates on this page.** The founder locked the outside edge — **31 Aug** — and the order below is the order we work. Rows are worked top to bottom inside each block; blocks are worked A → E.
> **Dots are MIRRORED, never typed.** The dot next to each `#id` is stamped from PRODUCT-INVENTORY by `scripts/mirror-launchpad.sh`. Status of record lives **only** in the inventory. Why/history → **KIND-MASTER**. Future → **V2-TRACKER**. Money → **`docs/CASHFLOW-LAB.html`**.

**Board:** 🟢92 · 🩷193 · 🟣1 · 🟡31 · 🔴227 · ⏸5 · **Σ549** · live count: `scripts/count-inventory.sh`

---

## 🛑 HONEST STATE — read this before anything else

**We cannot sell today, and this is the reason.** The product can find people, score them, mask them, show them to a client, take the client's 👍, charge for it, write the sequence, and book the meeting. **What it cannot do is send from the client's own mailbox** — because `figsy.ts:26` is `const FROM = COLD_FROM`, one module-level constant shared by every client on the platform, and there is **no SMTP client in the dependency tree at all**. `client_inboxes` exists and Vida writes a row into it, but **no send path ever reads that table.** So "sends on your own warmed inbox" — which the website, the flow docs and the pitch all promise — is not built. That is **#211**, 🔴 since 30 June, and it is the single reason a paying client cannot be onboarded.

**Two docs were lying about it and are now corrected:** `BUILD-STATUS.md` said *"the ONLY items not built: #515 + CI"* while the entire sending spine was 🔴 (retired → `docs/archive/`, #555), and the flow/preview docs describe per-client warmed sending as done (#557).

**What IS real and works:** the money model ($99 pack = 100 approvals, then $4, one wallet, only the client's 👍 spends) · the minimum-20 gate, server-enforced on every door · 30-days-idle suspends and un-suspends on their own click · sourcing fences (allowance × 2, 100/client/day, $300/mo global) · the **MBF demo account** (40 fixed invented people, cannot send, one button to build or reset) · both consoles, native, no old-shell escapes.

**What this means for selling:** the **demo** is sellable now (MBF needs no migration, no inbox, no send). **Delivery is not.** So Block A is the whole job.

---

## 🅰 BLOCK A — THE SENDING SPINE (nothing else matters until this is done)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #547 🟡 | **Send path uses the account's own inbox — or does not send** | `figsy.ts:26 const FROM = COLD_FROM` feeds both `resend.emails.send` calls. Replace with a per-client resolve off `client_inboxes`. **No inbox = no send**, fail closed, operator alerted. **Never** a silent fallback to our address — that is how one client's bounce rate burns every other client. | 🤖 |
| #548 🟡 | **A transport that can speak AS a client mailbox** | Resend is the only mail transport installed and it sends only from **our** verified domain. No SMTP client exists. Until this lands, #547's resolve has nothing to hand the message to. Shape is a founder call: provider send API (Smartlead/Instantly) vs SMTP-per-inbox credentials. | 🤝 |
| #550 🔴 | **Smartlead = CLIENT sending, assigned per client** | `lib/smartlead.ts` is a key-verification stub — no mailbox call, no campaign, no send. Provision/assign a Smartlead mailbox per client, persist it on `client_inboxes`, show its state in Vida. This is what a paying client is buying. | 🤝 |
| #549 🔴 | **Instantly = OUR outreach, run INSIDE the product** | Client Zero. Our Instantly mailbox attached to the K.I.N.D account so our own prospecting runs through Milla/Vida exactly like a client's — not in a separate tab. Founder-locked 26 Jul: *"we use instantly for us, smartlead for clients."* No CSV export — we use our own product. | 🤝 |
| #551 🔴 | **Replies land back against the right inbox** | Every reply today arrives through **one** Resend inbound webhook. The moment clients send from their own mailboxes, replies arrive **there** — so without per-provider ingestion mapped inbox → client → lead → thread, the unibox goes silent for every paying client and we miss the meeting we charged for. | 🤖 |
| #552 🔴 | **Inbox state on screen, and it gates the work** | Vida shows each client's inbox — none / warming / live / paused — and "Start work" refuses without one. Milla says which address their mail goes from. Without this, #547 failing closed looks like a broken product instead of a missing inbox. | 🤖 |
| #553 🔴 | **First-send ladder before the kill-switch flips** | `AUTO_OUTREACH_ENABLED` is OFF and stays off until: test send lands in a real **inbox** (not spam) · mail-tester ≥9/10 · cap on · one client, one day, watched. Flipping it is deliberate and founder-only. | 🤝 |

## 🅱 BLOCK B — SELL WHILE A IS BUILDING (the demo is the only thing that is ready)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #544 🩷 | **MBF demo account** | Built and live. 40 invented people, fixed cast — 12 being worked, **22 waiting** (≥20 on purpose so the minimum-20 gate demos), 6 visibly worse fits. Planted history, ledger rows that agree with the on-screen counter. **Cannot send:** `is_demo` is a hard stop inside the send path, every address is `.invalid`. One button: Vida → Engine → Build/Reset MBF. | 🤖 |
| #559 🔴 | **The nine screens, walked and shrunk to a script** | Read the buyer's path screen by screen against MBF and fix what a buyer would see. *"5 demos = 1 sale"* — the stage must never move, so the walk gets rehearsed, not improvised. | 🤝 |
| #560 🔴 | **Shrink the surface to what we sell** | The retired trees are still reachable and unread: the website's 30+ static pages, the 50 retired `(dashboard)` pages, `(v2)`/`partner-preview`/`consent`/`invite`/`share`, `packages/db`, `packages/shared`. Every one is a page a buyer can land on and a place a bug hides. Delete or gate. | 🤖 |

## 🅲 BLOCK C — BEFORE A REAL PROSPECT IS EMAILED (safety we do not ship without)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #554 🔴 | **RLS policies — never audited** | Seven migration files touch row-level security and **none has been read end-to-end**. The API uses the service-role key so RLS is defence-in-depth — but the anon key is public and **#350 proved one policy was `USING(true)`**, anon-readable. This is the only true breach risk still open. | 🤖 |
| #558 🔴 | **The repo's migrations no longer describe the live DB** | The live `credit_transactions` type CHECK was widened **by hand in production** — the committed constraint forbids `wallet_topup` / `wallet_charge` / `wallet_reverse`, which every wallet write uses. Payments work, so the DB is ahead of the repo. **Re-running `20260603_schema_reconcile.sql` would break every wallet transaction.** `20260726_wallet_tx_types.sql` re-states the live truth idempotently; the reconcile file needs a do-not-run banner. | 🤝 |
| #317 🟡 | **Stripe refund / dispute events subscribed** | The refund, chargeback and dispute-won code all shipped and **none of it can ever fire** until Stripe → Webhooks is subscribed to `charge.refunded` · `charge.dispute.created` · `charge.dispute.closed`. A won dispute currently leaves the client permanently short. | 🧍 |
| #491 🔴 | **Per-cron failure alerting** | All 25 crons die silently if an env var is unset — one blanket alert covers the lot. With real clients sending, a dead cron is a client who stopped being worked and nobody knew. | 🤖 |

## 🅳 BLOCK D — MAKE THE DOCS HOLD (done this session — this is what you are reading)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #555 🟡 | **BUILD-STATUS retired** | It was a **fifth status doc** and its summary line read *"the ONLY items not built: #515 + CI"* while the whole sending spine was 🔴. That one line is why the docs stopped being trustworthy. Moved to `docs/archive/`, marked historical, unlinked from here. Status has one home: PRODUCT-INVENTORY. | 🤖 |
| #556 🟡 | **Cashflow model is canonical, in the repo** | `docs/CASHFLOW-LAB.html` — two needles at the top, every cost line an editable box. Honest platform floor **~$457/mo** (the old ~$190 left out Smartlead ~$94, Instantly ~$37, Zoho ~$3 and the Anthropic runtime). Two numbers that change how we sell: a client must approve **~13/month just to pay for their own inbox**, and the **$99 pack is −$52 in month one** — the repeat is the business, the pack is the door. | 🤖 |
| #557 🟡 | **Stale flow + preview docs stamped** | `flows/new-client-flow.html` (built on the retired 14-day trial) · `flows/our-outreach-flow.html` (*"manual in Instantly, nothing to code"* — **overruled 26 Jul**) · `MILESTONE-0-CHECKLIST.md` (the retired $1/$3/$5/$6 ladder) · `mv-previews/flow-vida.html` + `home.html` (*"your own warmed inbox"* — describes #211, which is not built). Each now carries a correction banner rather than being silently deleted. | 🤖 |

## 🅴 BLOCK E — THE LIVE GATE (all of it walked, none of it remembered)

| # | Gate — live means every one of these was **walked**, on real data | Owner |
|---|---|:-----:|
| — | **Money walk to the cent:** real card → $99 lands → pack reads 100 → masked lead shows **no email** → pick 20 → 👍 → **$0 charged, counter reads 80** → 101st approval charges **$4** → ledger reconciles exactly · one dead email hands the pack slot back, never credits $4 | 🤝 |
| — | **Send walk:** a client's own assigned inbox sends · **no inbox = refused, visibly** · nothing falls back to our address · the reply comes back to **their** thread in the unibox · booking confirms | 🤝 |
| — | **Client Zero fires:** our own ICP → sourced → we approve **in Milla as the client** → sends leave on our **Instantly** mailbox **through the product** → replies land in the unibox | 🤝 |
| — | **Gates hold under a fetch, not just a click:** minimum-20 refused server-side on `/approve`, `/reveal`, `/approve-batch` · a 30-day-idle client is suspended and un-suspends on their **own** approval | 🤖 |
| — | **Demo is airtight:** MBF reset → walked → nothing sent, every address `.invalid`, no real prospect touched | 🤝 |
| — | **Both consoles walked** — Vida end to end as the operator, Milla as the client sees it. Everything walked flips 🩷 → 🟢, founder-only (`FOUNDER_FLIP=1`). | 🧍 |

---

## 🧍 OWED BY THE FOUNDER — nothing above can finish without these

| ✓ | Yours | Where |
|---|-------|-------|
| ⬜ | **Run migration `20260726_client_contact_name`** (additive, safe to re-run; sign-up works without it, the name just doesn't store) | Vida → Engine → Database migrations |
| ⬜ | **Run migration `20260726_wallet_tx_types`** (#558 — makes the repo agree with the live wallet CHECK) | Vida → Engine → Database migrations |
| ⬜ | **Tick Stripe webhook events** `charge.refunded` · `charge.dispute.created` · `charge.dispute.closed` (#317 — without them none of that code ever fires) | Stripe → Developers → Webhooks |
| ⬜ | **One $99 test purchase on a real card** — proves the pack, the counter and the ledger agree | Milla, as a client |
| ⬜ | **Set `INBOX_SECRET_KEY`** — generate with `openssl rand -hex 32`. It encrypts the mailbox passwords, and **no key = no send, by design** (#548). Don't lose it: changing it means re-entering every password | Railway → @kind/api → Variables |
| ⬜ | **SMTP details for the mailbox you ALREADY OWN — buy nothing** — `hello@get-kind.com` on Zoho (already paid for, ~$3/mo): host `smtp.zoho.com` · port `465` · user `hello@get-kind.com` · password = an **App Password** from Zoho → My Account → Security. That is enough to prove a real send end to end (#548) at **$0**. **The $45 Zapmail/SmartSenders pack is NOT on the critical path** — a client mailbox is bought only when a client has paid their $99, so it comes out of *their* money, never speculatively. ⚠️ Google needs an App Password and Microsoft needs SMTP AUTH enabled per mailbox — both block plain passwords by default | Zoho (already ours) |
| ⬜ | **Instantly: mailbox + how it sends** — SMTP credentials, and whether the rig is warm (#549) | Instantly |
| ⬜ | **Smartlead: account state + per-client workspace fee** — ~$40/client/month is an **estimate** and it is what sets the ~13-approval floor in the cashflow (#550/#556) | Smartlead |
| ⬜ | **Deliverability check** — send yourself a test and say whether it landed in **Inbox or Spam** (#553) | Any real mailbox |
| ⬜ | **Appeal the GitHub account flag** — until it clears, auto-deploy/CI stays ⏸ and every ship is `bash scripts/ship.sh` | GitHub support |
| ⬜ | **Rotate the Postgres password** — it is in git history and is treated as **burned**; rotate the moment Supabase access is back | Supabase |
| ⬜ | **Call the two open numbers:** names sourced per approval (flow v2 says **2**, #415 measured **~7** — at 7 the model roughly halves) and the SMS/no-login security decision behind #515 | — |

---

## 📤 MOVED OFF THIS PAGE (it was here, it does not get us live)

Everything below left the launch pad this session. It is **not deleted** — it has a home, and the home is named.

| What | Where it went | Why it left |
|------|---------------|-------------|
| The 14-day map (Day 0 → Day 14, dated rows) | **KIND-MASTER** session log | The dates expired; the outside edge is now 31 Aug and the order is Blocks A→E, not days |
| Day-0 confirms that are already done (Google OAuth, `TRAINING_LIVE`, replica count, the three June/July migrations) | **KIND-MASTER** history | Confirmed or superseded; the two migrations that are still owed moved into 🧍 above |
| The old money walk ($1 reveal + $3 held + capture-on-booking + release) | **KIND-MASTER** — retired model, kept as history | Superseded 24 Jul by ONE WALLET / flat $4. It was still printed on this page as a live gate |
| #515 Milla magic-link + SMS | **V2-TRACKER** | Email + password works today. Needs an SMS provider and a no-login security call — neither gets us live |
| Nexus auto-tuning (#511 family, all built, default-off) | **V2-TRACKER** | Built and fenced. Nothing about it blocks a first paying client |
| Data-engine widening #450 #451 #452 · Alta-parity #475 #476 · Jack&Jill steals #437–#443 | **V2-TRACKER** | Fires after the pilot pays |
| ⚖️ Legal sign-offs #432–#436 · #410/#413/#414 | **PRODUCT-INVENTORY** (own rows) | Founder ruling: *"ignore legal, stop bringing it up"* — off this page, not off the inventory |
| #494 qualification gate · #495 ICP versioning · #349 money-write sweep · #373/#389 migration hygiene | **PRODUCT-INVENTORY** | Real work, not launch-blocking |
| ⏸ Auto-deploy / CI | **PRODUCT-INVENTORY** (⏸, blocked) | Blocked on the GitHub flag appeal — a 🧍 item, above |

---

## 🩺 BLOCK M — THE MEASUREMENT SYSTEM (built 26 Jul — the instruments, before any more building)

*Founder-locked: **"I will not merge any open PR until I can measure the product."** These are the instruments. They fix nothing themselves — they make everything after them provable.*

| # | Item | What it gives you | Owner |
|---|------|-------------------|:-----:|
| #573 🟡 | **The core map** | The 90k-line problem, solved by **fencing not deleting**. 216 files / 50,394 lines are the CORE — traced by following real imports from real entry points, not by judgement. Audit coverage is now stated as **% of the core**, so 100% is reachable. It also proved two assumptions wrong: `(dashboard)` is CORE (Milla imports it — deleting breaks Milla), and `voice`/`whatsapp` are CORE (mounted, so their security holes are live) | 🤖 |
| #574 🟡 | **The gate** | `scripts/check.sh` → type-check, full test suite, both app builds, doc-lint. Wired into `ship.sh` so **a red build physically cannot deploy**. Proven green → red → refused → green, with the deploy step never reached | 🤖 |
| #575 🟡 | **The integrity check** | The retroactive half: **what the already-shipped bugs actually did, and to whom.** Eight questions about real rows, read-only, naming which clients. A check that errors renders **UNANSWERED, never clean** | 🤖 |
| #576 🟡 | **The System screen** | `/vida/system` — everything live, **both halves**, one button. Every row is CHECKED-OK / CHECKED-BROKEN / **NOT-MEASURED with the reason**. Nothing green unless probed. Finally answers which migrations are actually applied in production | 🤖 |
| #577 🟢 | **Sending architecture, locked** | Both vendors confirmed in writing they keep the mailbox passwords. So **our product gives the orders and theirs drive the van**: Instantly by API for us, Smartlead by API for clients, direct SMTP kept for enterprise. **$0 new for us, $0 for clients until one pays.** Every gate still sits upstream of the hand-off | 🧍 |

**How you use them, in order:** merge → `bash scripts/ship.sh` (the gate now guards it) → **Vida → System → Run full check** → that is your baseline → *then* decide the four money PRs → run it again and compare.

## 🔑 Legend + how anything goes live

**Owner:** 🤖 Claude (code, PRs) · 🧍 founder (merge · deploy · run SQL · approve previews · money · 🟢) · 🤝 both.
**Dots** — status lives in the **inventory** only; the dots on this page are stamped by script: 🔴 not built · 🟡 built, on a PR · 🟣 founder approved it on **preview** · 🩷 live, nobody has walked it · 🟢 live **and** walked. ⏸ blocked.
**A merge is a deploy on this repo** — `main` is the live site clients use. So **every client-facing build is previewed first**: preview link → founder 🟣 → merge → 🩷 → walk → 🟢. Docs don't deploy, so docs don't need a preview.
**Ship:** `bash scripts/ship.sh`. Services: website=`KIND` · portal=`@kind/portal` · admin=`@kind/admin` · api=`@kind/api`.

## 📌 Standing notes

- **Money (current — ONE WALLET, founder-locked 24–25 Jul):** one dollar wallet per client · first purchase **$99 = the onboarding pack, 100 approved leads included**, then a flat **$4 per approved lead, FINAL** · **no time limit on paid leads** · a dead email is never charged · meetings are reported, not refunded · **only the client's 👍 ever spends — operators never**. **Two gates protect it:** at least **20** approvals the first time round, and **30 days with no approvals suspends them**. Full model + the cost floor → **`docs/CASHFLOW-LAB.html`** (canonical) · cost detail → `run-costs-and-cashflow.md`.
- **Instantly is ours. Smartlead is the clients'.** Both run **inside the product** — we use our own product for our own outreach. No CSV hand-off.
- **No new SQL** beyond committed, reviewed, **idempotent** migrations run from Vida → Engine. The Supabase SQL editor is unreachable (GitHub removed the Supabase OAuth app).
- **Before any real send:** `/engine/env` must show `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` · `money_rpcs` installed — **plus** whatever #548 settles on for per-inbox credentials.
- **Architecture (locked):** AI drafts and scores; deterministic code decides and **fails closed**; state advances only after a verified provider/DB success.
- **A demo account never touches a real prospect.** `is_demo` is a hard stop inside the send path, and demo addresses are `.invalid` (RFC 2606).
