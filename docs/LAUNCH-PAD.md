# 🚀 LAUNCH PAD — zero product → live, the execution list

> **The one page you open.** Every row here either **gets us live** or **unblocks a row that does**. If it isn't on this page, it does not block launch — it lives in V2-TRACKER.
> **No dates on this page.** The founder locked the outside edge — **31 Aug** — and the order below is the order we work. Rows are worked top to bottom inside each block; blocks are worked A → E.
> **Dots are MIRRORED, never typed.** The dot next to each `#id` is stamped from PRODUCT-INVENTORY by `scripts/mirror-launchpad.sh`. Status of record lives **only** in the inventory. Why/history → **KIND-MASTER**. Future → **V2-TRACKER**. Money → **`docs/CASHFLOW-LAB.html`**.

**Board:** 🟢92 · 🩷215 · 🟣2 · 🟡64 · 🔴202 · ⏸5 · **Σ580** · live count: `scripts/count-inventory.sh`

---

## 🛑 HONEST STATE — read this before anything else *(swept against the code 27 Jul, end of day)*

> **If you have been away and remember nothing, read only this block.** It is rewritten at the end of every working session and it is the state of record for *what is left*. Status per item lives in PRODUCT-INVENTORY; why anything was decided lives in KIND-MASTER.

**Where we actually are.** The product finds people, scores them, masks them, surfaces them, takes the client's 👍, charges for it, writes the sequence, routes replies to the right client and books the meeting. **Every code item in the sending spine is now built.** What it cannot do is send — because **no mailbox exists for any client** (`LIVE INBOXES · 0`). That is a purchase and a form, not a PR.

**⚠️ THE ARCHITECTURE CHANGED — CLIENT ZERO RUNS ON OUR OWN ENGINE (founder, 30 Jul).** Walked point by point and locked: of Instantly's bundle we lack exactly **one** thing — the **warmup network**. Its sequencer, sender and unibox duplicate the product we built and are trying to prove, and the **$97 HyperGrowth tier was needed only for the API to integrate with a sender we no longer use**. So **Instantly drops to Growth (~$37), warmup only**, and **FIGSY + our send path + our unibox do the outreach**. Amends the founder's own #577 lock. Smartlead unchanged: deferred until a client is in the works. Floor **~$283 → ~$223/mo**. **30 Jul — and the missing door is now built:** our engine can only mail what is in our tables, and there was no way to put a list into them. **#599** is that door — Vida → Engine → **Import leads (CSV)**, so the Apollo export lands as ordinary pending leads and Client Zero runs through the same desk a paying client does.

**The purchase order — do these in sequence, not at once:**

| | What | $/mo | Note |
|---|------|:---:|---|
| ① | **2 new domains + 4 Google mailboxes — BOUGHT DIRECT FROM GOOGLE.** ⚠️ **NOT Instantly's done-for-you boxes**: our engine sends over SMTP and needs `smtp_host`/`smtp_user`/`smtp_pass_enc`, and **#577 records in writing that vendor-provisioned mailboxes expose no SMTP credentials**. Their DFY box is $1 cheaper and **cannot be sent through by our engine at all**. Never on `get-kind.com` — a spam complaint must hit a throwaway domain, not the one carrying invoices. **30 Jul — the screen to enter them now exists: Vida → Engine → Add a mailbox (#600). Set up the house client there first.** | ~$25 | 🧍 |
| ② | **Instantly Growth — connect the 4 boxes, enable warmup, CREATE NO CAMPAIGNS.** Vendor-confirmed 30 Jul that warmup runs on campaign-free and externally-hosted mailboxes. | ~$37 | 🧍 |
| ③ | **Apollo — free tier now** (900 credits/yr). Basic **billed MONTHLY ~$59** only when sending starts; the $49 rate is $588 annual-upfront and waits until the channel proves itself. **Apollo is for OUR hunting only — PDL + Hunter stay the client-facing stack.** | $0 | 🧍 |
| ④ | **Founder-led outreach DURING the 3–4 week warmup** — 20 personal messages off the MBF demo. The funnel maths says this is the fastest route to clients 1–3, and it costs nothing. | $0 | 🧍 |
| ⑤ | **#553 first-send ladder on OUR boxes** when warm — test send lands in a real inbox, mail-tester ≥9/10, cap on, watched. **Then** flip `AUTO_OUTREACH_ENABLED`. | $0 | 🧍 |

**The fuel, separate from the rent:** ~**$127–137 per 1,000 prospects** (Apollo + ~$8 verification + ~$70 AI writing; sending is $0 because it is ours) ≈ **one client** at conservative reply rates, burned over ~6 weeks ≈ **~$85/mo while hunting**. One client is worth $99 + ~$121/mo.

**💷 MONEY — three checks the founder owns, worth up to ~$220/mo (30 Jul, self-funded):**

| | Do | Why |
|---|---|---|
| ① | **Check Hunter + PDL billing.** Both are on **free tiers** (founder-confirmed 30 Jul) — verify nothing has silently upgraded. | Confirmed $0. ⚠️ **But free tier is a VOLUME CEILING, not a free lunch**: free PDL is ~100 records/month, which is half of one client's 200-name pack. The paid tier switches on the month a real sourcing run happens. |
| ② | **Failover teardown — IN THIS ORDER.** ⓐ repoint `api.get-kind.com` to a plain CNAME on Railway (`kindapi-production-e64c.up.railway.app`, proxied) and confirm the portal still loads · ⓑ delete the Cloudflare Load Balancer + its health monitor · ⓒ delete/suspend the Render `kind-api-standby` service. | **−$12/mo.** ⚠️ **Wrong order takes the live product down** — `api.get-kind.com` currently routes *through* the load balancer. Steps: `docs/render-cloudflare-failover.md`. Check Render's billing first: if it is already on a free tier only the $5 Cloudflare line is real. |
| ③ | **GoDaddy audit.** List every domain on the account, confirm what each renews at, kill auto-renew on any we no longer use. | Retired pages are 301s now (#560) but **a domain nobody visits still renews** at ~$20/yr. |

**Built but NOT PROVEN — each needs real activity, not more code.** These are 🟡/🩷 and must not be read as working:

- **#550 Smartlead** — built 27 Jul, key returns **401**. Nothing exercised against a live workspace. The sequence *step shape* is unverified (their docs 403 us) — **check it in Smartlead's UI after the first push.** ⏸ **Deliberately parked 30 Jul** — not bought until a client is in the works, so this stays unproven on purpose rather than by neglect.
- **#366 PDL paging** — needs one ICP run twice with real credits to prove month two finds new people.
- **#340 / #342 subscriptions** — need Stripe test-mode activity to exercise.
- **#298 backup manifest** — built; **take one and save the JSON off this system.** Never done.
- **#599 CSV lead import** — built 30 Jul, **never run against a real Apollo export.** 38 tests, but a real export's headers are the one thing tests cannot supply. First real use: press **Check the file** before **Import** — it writes nothing and tells you exactly which columns it read.

**Environment blockers, one root cause — the flagged GitHub account:**

- **CI has never run.** All five workflows registered and `active`, **0 runs ever** — re-confirmed against the GitHub API on **1 Aug** (`doc-lint.yml` 0 · `test.yml` 0 · `inventory-autoflip.yml` 0). `scripts/check.sh` is not a belt over CI — **it IS the only gate.** *(1 Aug: `DOC-MAP.md` was still telling readers CI ran doc-lint on every docs PR — corrected in #602.)*
- **Supabase dashboard unreachable.** Blocks the restore drill (#298), the Postgres password rotation, and forces every migration through Vida → Engine.
- **`DATABASE_URL` is mangled** (a placeholder ref was pasted in). Breaks *Run migrations*, *RLS audit*, *Backup manifest*. **Nothing client-facing.** The error now names the right value.

**Verified live in production on 27 Jul, not claimed:** RLS clean (82 tables read, no exposed tables · `client_inboxes` had **no RLS at all** and now does) · cron single-run guard in place · seed report reads MBF and K.I.N.D as protected, ACME eligible · 12/12 migrations applied.

**⏸ WAITING ON THE FOUNDER — the doc audit (#602, 1 Aug).** All 579 inventory rows and 90 docs were audited and the deliverable is a **report, not a purge**: `docs/reports/PRODUCT-AUDIT-1AUG.md`. **57 items are flagged and NOT ONE was touched** — nothing removed, re-scoped, archived or re-dotted. It ends in a **13-line decision list** and nothing moves until those are ruled on. The two worth reading first: **#397** says `lib/hubspot.ts` is *"never called"* and offers *"wire or delete"*, but it is imported by `reply-pipeline.ts:34` and `internal.ts:24` — the cheap branch deletes live reply-path code; and **`trialing` is still a real state in production** (`auth.ts:191` on every signup, two crons daily at `cron.ts:281/290`) under a model whose only door is the $99 pack. The biggest single group is the **#420 family — 9 rows still marked M0 CRITICAL** describing the 8 Jul two-wallet price ladder that ONE WALLET superseded on 24 Jul.

**So: the demo is sellable today. Delivery needs a mailbox, the ladder, and the bill.**


## 🅰 BLOCK A — THE SENDING SPINE (nothing else matters until this is done)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #547 🟡 | **Send path uses the account's own inbox — or does not send** | `figsy.ts:26 const FROM = COLD_FROM` feeds both `resend.emails.send` calls. Replace with a per-client resolve off `client_inboxes`. **No inbox = no send**, fail closed, operator alerted. **Never** a silent fallback to our address — that is how one client's bounce rate burns every other client. | 🤖 |
| #548 🟡 | **A transport that can speak AS a client mailbox** | Resend is the only mail transport installed and it sends only from **our** verified domain. No SMTP client exists. Until this lands, #547's resolve has nothing to hand the message to. Shape is a founder call: provider send API (Smartlead/Instantly) vs SMTP-per-inbox credentials. | 🤝 |
| #550 🟡 | **Smartlead = CLIENT sending, assigned per client** | `lib/smartlead.ts` is a key-verification stub — no mailbox call, no campaign, no send. Provision/assign a Smartlead mailbox per client, persist it on `client_inboxes`, show its state in Vida. This is what a paying client is buying. | 🤝 |
| #549 🔴 | **Instantly = OUR outreach, run INSIDE the product** | Client Zero. Our Instantly mailbox attached to the K.I.N.D account so our own prospecting runs through Milla/Vida exactly like a client's — not in a separate tab. Founder-locked 26 Jul: *"we use instantly for us, smartlead for clients."* No CSV export — we use our own product. | 🤝 |
| #599 🟡 | **Prospects can get INTO the product — operator CSV import** | Built 30 Jul. Client Zero's list comes out of Apollo as a CSV and there was **no door**: the only inbound lead path (`/figsy/webhook/enrol`) is per-client-key-authed and **charges on the way in**. Now: **Vida → Engine → Import leads (CSV)**, operator-authed, **no money moves**, 1,000 rows/file. Every row passes the **same gates a sourced lead passes** (blocklist → do-not-contact → already-owned → within-file dupe) and lands `pending`/`delivered_at:null` — identical to a sourced lead, so it flows approve → enrol → send. Demo clients refused; both DB reads fail **closed**; every skipped row named with its spreadsheet line. | 🤖 |
| #600 🟡 | **Client Zero is set up entirely through Vida — no SQL** | Built 30 Jul, for tomorrow's four Google mailboxes. There is **no SQL editor** on this account, so every step had to be a control. Three gaps closed: ① **Add a mailbox** for ANY client, any number of times — the old button lived inside the "Cannot send" list and **vanished the moment mailbox #1 worked**, with three still to add; ② **Set up the house client** — adopts the account your login already owns rather than minting a second (#584), comps it so sourcing is not refused; ③ **Send readiness for every client**, pass or fail, with a missing `INBOX_SECRET_KEY` and an unknown state in RED because neither is one client's problem. Password never stored, returned or audited in plaintext; key unset = refused, nothing written. ⚠️ **`HOUSE_CLIENT_ID` STAYS UNSET** — it gates the parked Instantly push (#593), not our sending. | 🤝 |
| #551 🟡 | **Replies land back against the right inbox** | Every reply today arrives through **one** Resend inbound webhook. The moment clients send from their own mailboxes, replies arrive **there** — so without per-provider ingestion mapped inbox → client → lead → thread, the unibox goes silent for every paying client and we miss the meeting we charged for. | 🤖 |
| #552 🟡 | **Inbox state on screen, and it gates the work** | Vida shows each client's inbox — none / warming / live / paused — and "Start work" refuses without one. Milla says which address their mail goes from. Without this, #547 failing closed looks like a broken product instead of a missing inbox. | 🤖 |
| #553 🔴 | **First-send ladder before the kill-switch flips** | `AUTO_OUTREACH_ENABLED` is OFF and stays off until: test send lands in a real **inbox** (not spam) · mail-tester ≥9/10 · cap on · one client, one day, watched. Flipping it is deliberate and founder-only. | 🤝 |

## 🅱 BLOCK B — SELL WHILE A IS BUILDING (the demo is the only thing that is ready)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #544 🩷 | **MBF demo account** | Built and live. 40 invented people, fixed cast — 12 being worked, **22 waiting** (≥20 on purpose so the minimum-20 gate demos), 6 visibly worse fits. Planted history, ledger rows that agree with the on-screen counter. **Cannot send:** `is_demo` is a hard stop inside the send path, every address is `.invalid`. One button: Vida → Engine → Build/Reset MBF. | 🤖 |
| #559 🔴 | **The nine screens, walked and shrunk to a script** | Read the buyer's path screen by screen against MBF and fix what a buyer would see. *"5 demos = 1 sale"* — the stage must never move, so the walk gets rehearsed, not improvised. | 🤝 |
| #560 🟡 | **Shrink the surface to what we sell** | The retired trees are still reachable and unread: the website's 30+ static pages, the 50 retired `(dashboard)` pages, `(v2)`/`partner-preview`/`consent`/`invite`/`share`, `packages/db`, `packages/shared`. Every one is a page a buyer can land on and a place a bug hides. Delete or gate. | 🤖 |

## 🅑 BLOCK B2 — THE DELIVERY BLOCKER NOBODY HAD ON A LIST

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #366 🩷 | **One ICP only ever sees PAGE ONE of the data — forever** | Found in the 26-Jul sweep, and the code says it out loud: `pdl-search.ts:117` — *"PDL deprecated `from`-based pagination… **Page 1 only for now**; deeper pages need `scroll_token`."* No `scroll_token` exists anywhere. So an ICP returns one page, we dedup against everything that client already holds, and then **the same ICP returns zero people for that client permanently** — silently, no error, just an empty run. **The cashflow says the repeat IS the business** (the $99 pack is −$52 in month one and only recovers if they come back). Month two needs 200 more people against the same ICP. This is the thing that cannot deliver them. Also makes the site's "250M+ contacts" false in practice. | 🤖 |

## 🅑 BLOCK B3 — FOUND BY READING, NOT SEARCHING (26 Jul — the method change)

*Every previous audit was a grep, and a grep only returns what you already suspected. These four came out of reading files top to bottom. The prompt that produced them is `docs/AUDIT-PROMPT.md`.*

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #562 🩷 | **The $99 is paid out TWICE — the pack AND the wallet** | `stripe.ts:343` credits **$99 to the wallet**. `approve-lead.ts:134` reads the **same purchase row** and grants the **pack — 100 free approvals**. So they approve 100 free, wallet untouched at $99, then approval 101 onward spends that $99 → **~24 more leads. One $99 buys ~124 leads, not 100 — ~$96 given away per client.** The pack is already −$52 in month one; this makes it ≈−$148. **#541 states the design as "a counted quota, NOT a wallet credit"** — so this is a defect, not a decision. Neither file is wrong alone; no keyword joins them. | 🤝 |
| #564 🟡 | **Vida's Run button swallows refusals — and the audit log records the wrong action** | `startCampaign` and `setCampaignStatus` **discard the API response**; the endpoints genuinely refuse (400/404/500), so a refused Run shows **nothing** and the operator believes the client is live. The next-action Run also fires **with no confirmation** — one click starts real email — and silently no-ops when there's no campaign. And the route writes `action:'pause_campaign'` hardcoded, so **the audit log says "paused" when someone pressed Run.** | 🤖 |
| #563 🩷 | **The money screen cannot tell the truth** | `billing/page.tsx` fetches only `/credits` and **never reads pack state**, so it structurally cannot know the client holds 100 free approvals. It says *"$4 per approved lead"* in four places and *"Fund your wallet"* on the $99 — to someone whose first hundred are free. The screen a client opens right after paying. | 🤖 |
| #565 🩷 | **A failed load in Vida reads as "nothing to do"** | The worklist fetch is `.catch(() => {})`, so a failure renders **no clients needing attention** — identical to a quiet day. It's the screen that decides what the operator does next. | 🤖 |
| #566 🩷 | **The pack delivers 99 free approvals, not 100** | `approve-lead.ts:36` sets `revealed_at` **before** `:132` counts it — so the count includes the lead being approved. The **100th** of "100 included" is **charged $4**. The unit test passes because it calls the pure function with 99 while the route hands it 100 — the same failure as the min-20 gate's 18 passing tests. The ledger note is off by one in the same block: the first approval is recorded as *"approval 2 of 100"*. **Founder-recommended: fix it — 100 must mean 100.** | 🤖 |
| #567 🩷 | **A repeat purchase sources NOBODY** | `start-work.ts:97-99` counts every lead the client has **ever** held, so `sourceTarget` returns 0 once they hold 200 — a lifetime cap, not a top-up. The pack doesn't renew either. **A second $99 buys no people, no included leads, and (per #562) ~24 leads of wallet.** The cashflow says the repeat IS the business. **Founder-recommended 26 Jul: change no prices.** `sourceTarget` counts only leads *awaiting a decision*, so working through 100 makes them short 100 and we source 100 more off the allowance they already paid for. Renewing the pack each $99 was rejected on the numbers (≈$105 cost against $99 — a monthly loss); wallet top-ups yield **+$123 on $200**, which is the model already locked. Needs #366 too, or it re-serves the same page. | 🤝 |
| #568 🩷 | **Three swallowed writes on the approve path — "$4 taken, nothing delivered"** | The **email write** (`approve-lead.ts:180`), the **enrol** (`:217`) and the **two surface updates** (`start-work.ts:151-152`) all discard their failure. Each one ends with the client charged and nothing to show for it — and ③ makes the operator's alert read *"sent 200 to them"* while the client's desk is empty | 🤖 |
| #569 🩷 | **A re-approve of a FREE lead says "$4 charged"** | `approve-lead.ts:48` returns `charged: true` unconditionally on the idempotent path. #541 fixed this on the first-approval path and missed this one | 🤖 |
| #570 🟡 | **Four gaps on the client's own desk** | `Promise.all` blanks the whole desk if either endpoint fails · `pass()` never reloads so the KPI stays stale · `/for-approval` is capped at 50 while the KPI counts more · the 402 message invents a figure client-side | 🤖 |
| #571 🟡 | **Two silent caps in sourcing** | Only the **newest** active ICP is ever sourced from (a client with two gets one, silently) · `surfaceEverything` reads `.limit(1000)` inside a function whose job is "everyone" | 🤖 |

## 🅲 BLOCK C — MONEY + SAFETY BEFORE A REAL PROSPECT IS EMAILED

*Every row here was **re-verified in the code on 26 Jul**, not carried across from an old audit label. The line numbers are where it actually is today.*

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #343 🩷 | **No cron singleton — two API replicas double-send every prospect** | `index.ts:229` calls `startCrons()` unconditionally, and `cron.ts` (216 lines) has **no lock, no env gate, no advisory lock — nothing**. One replica is the only thing preventing every cron firing twice, including the send cron. The Day-0 confirm *"API runs 1 replica"* was **never ticked**, so it is currently unproven — and the failure mode is emailing a prospect twice from their own client's mailbox. | 🤖 |
| #340 🩷 | **Any broken subscription is written to our DB as `active`** | `stripe.ts:516`: `sub.status === 'active' \|\| sub.status === 'trialing' ? sub.status : 'active'` — so `past_due`, `incomplete`, `unpaid` and `canceled` all land as **active**. A failed card reads as a paying client. Subscriptions are being retired (#431), but **this code is live on the webhook today**. | 🤖 |
| #342 🩷 | **The lapse cron 500s every day** | `internal.ts:2320` writes `status: 'lapsed'`, and **`'lapsed'` appears in no migration in any of the three migration directories** — so the value is not in the production enum and the write throws. Nightly, silently, since it shipped. | 🤖 |
| #352 🩷 | **A retired payment processor can still charge a card** | `figsy.ts:427` still calls Paystack `charge_authorization` for auto-topup, and `index.ts:97` still mounts a raw Paystack webhook. Paystack was supposed to be killed (#237 — Stripe only). A live card-charging path, in ZAR, on a processor we do not intend to use, is the worst kind of dead code. | 🤝 |
| #349 🩷 | **~140 money-table writes ignore their error** | Subscription / credit / enrollment / partner writes that never check `.error`, so a failed write reads as success and the ledger drifts from reality. **29 Jul — the wallet half and the named tail are both closed on branch** (the partner/subscription family swept exhaustively: 27 sites, 12 already checked, 15 fixed; plus the list-unsubscribe path, where a swallowed blocklist write told the recipient they were unsubscribed and kept emailing them). What remains is the rest of the ~140 outside these families. | 🤖 |
| #554 🩷 | **RLS policies — never audited** | Seven migration files touch row-level security and **none has been read end-to-end**. The API uses the service-role key so RLS is defence-in-depth — but the anon key is public and **#350 proved one policy shipped as `USING(true)`**, anon-readable in production. The only true breach risk still open. | 🤖 |
| #558 🟡 | **The migrations no longer describe production — mapped, and the repo made honest** | Done 30 Jul: **`docs/SCHEMA-DRIFT.md`**, all 77 tables. **The finding is bigger than the example: 126 migration files in three directories, and ONE runner that applies TWELVE.** The other 114 were pasted into the Supabase SQL editor by hand, unrecorded — and that editor can no longer be opened. **Fixed:** `schema.sql` was missing **76 columns its own migrations add**, including `wallet_balance_usd`, `is_demo`, `leads.delivered_at` and `leads.revealed_at` — the money column and the timestamps the whole approve loop turns on. **Five ❓ unknowables**, worst is **`leads.source`** (nothing in the repo declares it; **#599's CSV import writes it**). **30 Jul — CORRECTED: that doc told you to paste 8 queries into a SQL runner that does not exist.** Six of them are now **one button: Vida → Engine → "Schema probe (#558)"** — it asks the live database directly, no SQL, read-only, safe to press any time. **Your action: press it.** The two it cannot answer (the live CHECK definition, the full table census) need **`DATABASE_URL` fixed in Railway → @kind/api** — one paste, and it also unblocks Run migrations, the RLS audit and the backup manifest. ⚠️ **Do NOT press Run migrations until the probe has answered** — it counts `hold`/`release` rows and says plainly whether it is safe; if any exist, `20260726_wallet_tx_types` throws. | 🤝 |
| #273 🟡 | **Three migration directories become one home** | Done 31 Jul. **The item's premise was wrong and reading the runner was step one:** Vida → Engine → Run migrations executes a **TypeScript constant** (`PENDING_MIGRATIONS`), not a directory — `.sql` files are not copied into `dist/`, so a file read would work locally and fail in production. **No directory has ever been applied to anything.** The split was 94 · 19 · 13 with **zero overlap**, so which migration you found depended on which folder you opened. All 32 outside files are now in **`supabase/migrations/`** with provenance headers and **byte-identical bodies**; originals kept (rule 3) with tombstone headers; READMEs in all three. **⚠️ One migration had NO FILE — it existed only as a string in the runner**, so the product could apply it to production while nothing described it. Recovered. **Nothing for you to do** — no production writes. ⚠️ Consolidating fixes *where things live*, not *what production has*: that is still #558, and the **Schema probe** answers six of it. | 🤖 |
| #561 🟡 | **The environment, documented — 100 vars, one table** | Done 30 Jul: **`docs/ENVIRONMENT.md`** — every variable the three apps read, its tier, **what breaks when it is unset**, and which Railway service holds it. **The old "69" was wrong twice:** a `process.env` grep cannot see the 12 vars reached by indirection, and my own scanner's comment-stripper was not regex-aware and undercounted by four. `startup-check.ts` covered **22 of 83** API vars — all 83 now carry a tier, plus two new ones: `platform` (Railway sets it, never nagged about) and **`parked`, where being SET is the fault** — `HOUSE_CLIENT_ID` un-parks #593. **Found doing it:** `INBOX_SECRET_KEY` was missing from the go-live SENDING check (✅ while nothing could send), `SUPABASE_ANON_KEY` was effectively required and listed nowhere, and `DEPLOYMENT_GUIDE.md` told you to set three portal variables **nothing reads**. **Your action: delete `PAYSTACK_SECRET_KEY` + `FLUTTERWAVE_*` from Railway, and set `INBOX_SECRET_KEY` before entering tomorrow's mailboxes.** | 🤝 |
| #317 🟡 | **Stripe refund / dispute events subscribed** | The refund, chargeback and dispute-won code all shipped and **none of it can ever fire** until Stripe → Webhooks is subscribed to `charge.refunded` · `charge.dispute.created` · `charge.dispute.closed`. A won dispute currently leaves the client permanently short. | 🧍 |
| #491 🩷 | **Per-cron failure alerting** | All 25 crons die silently if an env var is unset — one blanket alert covers the lot. With real clients sending, a dead cron is a client who stopped being worked and nobody knew. Pairs with #561. | 🤖 |
| #199 🔴 | **Nothing watches production** | There is a health probe at `index.ts:107` and **no monitor pointed at it** — no UptimeRobot, no BetterStack, no Sentry (error capture is a DB insert that swallows its own failure). If the API dies, the first person to find out is a client. | 🧍 |
| #329 🩷 | **Wipe the seed data before the first real client** | Founder-confirmed on the admin walk: *"when we flip over live we clean everything."* Test clients, seeded leads and demo residue must not sit in the database a paying client's numbers are computed from. | 🤝 |
| #298 🩷 | **The restore has never been tested** | Supabase takes backups. Nobody has ever restored one. A backup you have not restored is a belief, not a backup — and this is the only copy of every client's data. One drill, once. | 🤝 |

## 🅲 BLOCK C2 — WHAT WE CLAIM vs WHAT IT DOES (each one is a refund or a complaint waiting)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #413 🟡 | **Terms §5 contradicts the code, and itself, on when a credit is consumed** | The document that governs the money disagrees with the money. It is the one place a client will quote back at us. | 🤝 |
| #414 🟡 | **The Stripe product description oversells at the point of payment** | `packages/shared/src/constants/index.ts:29` — the last thing a client reads before their card is charged, describing something we do not do. | 🤖 |
| #410 🟡 | **The legal pages name the WRONG data sub-processor** | `privacy.html` ×4, including the formal sub-processor list — it names a provider we do not use and omits the ones we do. | 🤖 |
| #327 🟡 | **The website claims integrations that do not exist** | `pricing.html:491` "HubSpot & Salesforce integration" · `virtual-assistant.html:536` "Salesforce, Gmail, Outlook, Google". `lib/hubspot.ts` is written and **never called** (#397). Nothing is integrated. | 🤖 |
| #406 🔴 | **The portal has never had a full element sweep** | Every screen, tile, tab, button, toggle and modal on `apps/portal`, checked against what the backend actually does. The showroom strip (#478) took the worst offenders; the sweep itself was never finished, and it is exactly where "the button lies" bugs live. | 🤖 |

## 🅳 BLOCK D — MAKE THE DOCS HOLD (done this session — this is what you are reading)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #555 🟡 | **BUILD-STATUS retired** | It was a **fifth status doc** and its summary line read *"the ONLY items not built: #515 + CI"* while the whole sending spine was 🔴. That one line is why the docs stopped being trustworthy. Moved to `docs/archive/`, marked historical, unlinked from here. Status has one home: PRODUCT-INVENTORY. | 🤖 |
| #556 🟡 | **Cashflow model is canonical, in the repo** | `docs/CASHFLOW-LAB.html` — two needles at the top, every cost line an editable box. Honest platform floor **~$223/mo** (30 Jul — the **idle-tools-bill-nothing** rule plus the **Client Zero architecture lock**: Hunter, PDL and the failover $0 until they do work, Smartlead $0 until a client signs, Instantly down to **Growth $37 for warmup only** because our own engine sends. Rises to **~$490** at the first client; Claude Code is £119.99 ≈ $152 on top, a build tool not product infra). The old ~$190 left out Smartlead, Instantly, Zoho ~$3 and the Anthropic runtime. Two numbers that change how we sell: a client must approve **~13/month just to pay for their own inbox**, and the **$99 pack is −$52 in month one** — the repeat is the business, the pack is the door. | 🤖 |
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
| ⬜ | **Run migration `20260726_wallet_tx_types`** (#558 — makes the repo agree with the live wallet CHECK) ⚠️ **30 Jul — PRESS "SCHEMA PROBE (#558)" FIRST** (Vida → Engine; it counts the rows and tells you). That migration DROPS `hold`/`release` from the CHECK, and `ADD CONSTRAINT` validates existing rows — so if a single `type='hold'` ledger row exists (#492's lifecycle was live before one-wallet), pressing this **throws**. | Vida → Engine → Database migrations |
| ⬜ | **Tick Stripe webhook events** `charge.refunded` · `charge.dispute.created` · `charge.dispute.closed` (#317 — without them none of that code ever fires) | Stripe → Developers → Webhooks |
| ⬜ | **Fix the CHECKOUT description in Stripe (#414)** — the repo copy is now honest, but **no code change can reach the checkout**: it renders the Stripe *product* behind the Price ID, not anything in this repo. Whatever those products say today is what a client reads with their card out. Suggested: *"We run your outbound: we find and score your buyers, you approve the ones you want, and we do the outreach. Reviewing is free — $99 includes your first 100 approved leads, then $4 per approved lead."* | Stripe → Products |
| ⬜ | **One $99 test purchase on a real card** — proves the pack, the counter and the ledger agree | Milla, as a client |
| ⬜ | **Set `INBOX_SECRET_KEY`** — generate with `openssl rand -hex 32`. It encrypts the mailbox passwords, and **no key = no send, by design** (#548). Don't lose it: changing it means re-entering every password | Railway → @kind/api → Variables |
| ⬜ | **SMTP details for the mailbox you ALREADY OWN — buy nothing** — `hello@get-kind.com` on Zoho (already paid for, ~$3/mo): host `smtp.zoho.com` · port `465` · user `hello@get-kind.com` · password = an **App Password** from Zoho → My Account → Security. That is enough to prove a real send end to end (#548) at **$0**. **The $45 Zapmail/SmartSenders pack is NOT on the critical path** — a client mailbox is bought only when a client has paid their $99, so it comes out of *their* money, never speculatively. ⚠️ Google needs an App Password and Microsoft needs SMTP AUTH enabled per mailbox — both block plain passwords by default | Zoho (already ours) |
| ⬜ | **Instantly: mailbox + how it sends** — SMTP credentials, and whether the rig is warm (#549) | Instantly |
| ⬜ | **Smartlead: account state + per-client workspace fee** — ~$40/client/month is an **estimate** and it is what sets the ~13-approval floor in the cashflow (#550/#556) | Smartlead |
| ⬜ | **Deliverability check** — send yourself a test and say whether it landed in **Inbox or Spam** (#553) | Any real mailbox |
| ⬜ | **Point a monitor at the health probe** (#199) — the endpoint exists, nothing watches it. UptimeRobot's free tier is enough. Without it, the first person to notice the API is down is a client | UptimeRobot / BetterStack |
| ⬜ | **Confirm the API runs exactly ONE replica** (#343) — it is the only thing stopping every cron firing twice, including the send cron. This was a Day-0 confirm and it was **never ticked**, so it is currently unproven | Railway → @kind/api → Settings |
| ⬜ | **Decide Paystack: delete it** (#352/#237) — `charge_authorization` can still charge a card in ZAR and a raw Paystack webhook is still mounted. Say the word and the code and the key go | — |
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
| #573 🟡 | **The core map** | The 90k-line problem, solved by **fencing not deleting**. 221 files / 51,470 lines are the CORE — traced by following real imports from real entry points, not by judgement. Audit coverage is now stated as **% of the core**, so 100% is reachable. It also proved two assumptions wrong: `(dashboard)` is CORE (Milla imports it — deleting breaks Milla), and `voice`/`whatsapp` are CORE (mounted, so their security holes are live) | 🤖 |
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
