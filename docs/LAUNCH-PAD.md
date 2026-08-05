# 🚀 LAUNCH PAD — zero product → live, the execution list

> **The one page you open.** Every row here either **gets us live** or **unblocks a row that does**. If it isn't on this page, it does not block launch — it lives in V2-TRACKER.
> **No dates on this page.** The founder locked the outside edge — **31 Aug** — and the order below is the order we work. Rows are worked top to bottom inside each block; blocks are worked A → E.
> **Dots are MIRRORED, never typed.** The dot next to each `#id` is stamped from PRODUCT-INVENTORY by `scripts/mirror-launchpad.sh`. Status of record lives **only** in the inventory. Why/history → **KIND-MASTER**. Future → **V2-TRACKER**. Money → **`docs/CASHFLOW-LAB.html`**.

**Board:** 🟢95 · 🩷249 · 🟣2 · 🟡65 · 🔴173 · ⏸5 · **Σ589** · live count: `scripts/count-inventory.sh`

---

## 🛑 HONEST STATE — read this before anything else *(re-swept against the code 2 Aug, #608)*

> **If you have been away and remember nothing, read only this block.** It is rewritten at the end of every working session and it is the state of record for *what is left*. Status per item lives in PRODUCT-INVENTORY; why anything was decided lives in KIND-MASTER.

**Where we actually are (re-swept 4 Aug, end of the mailbox run).** The product finds people, scores them, masks them, surfaces them, takes the client's 👍, charges for it, writes the sequence, routes replies and books the meeting. **And as of 4 Aug it finally has mailboxes: 4 Google boxes on 2 fully-authenticated domains are WARMING in Instantly — clock runs to ~Tue 25 Aug**, confirmed independently by the product's own warm-up reminder. One box (`jacques@kindoutreach.com`) is registered in the engine, encrypted, status `warming`. **Nothing sends until the 25 Aug ladder** — three separate locks (warming status refused by the picker · `AUTO_OUTREACH_ENABLED` unset · the ladder itself) and the counter reads 0 sent, ever. **The plan to send-day is the table below — work it top to bottom.**

### 🔒 THE CONSTRAINT THAT GOVERNS EVERY FUTURE PROMPT — MIGRATIONS CANNOT RUN

**Do not build anything that ends with "now press Run migrations."** The Supabase dashboard is unreachable (GitHub OAuth, flagged account — a support ticket is open and unanswered), the founder does not have the Postgres password, and `DATABASE_URL` in Railway is a placeholder with no host in it, so the runner resolves nothing. **The schema is frozen for the foreseeable future.** Anything needing a schema change must either work without one or be declared NOT-POSSIBLE up front, before the work starts. *(#607's migration is registered and pending. ⚠️ **The claim that stood here — "the code was deliberately written to work with or without it" — was FALSE, and production proved it on 4 Aug:** the live schema has NOT NULL on `subscriptions.current_period_end`, #607's honest `null` bounced with 23502, and **every new-client signup failed at the front door for two days** until the founder hit it himself, signing up to test the $299. The code now tries the honest null first and retries once with a far-future sentinel — so signup works today AND self-corrects the day the migration runs.)*

### ✅ SHIPPED SINCE THE LAST SWEEP (27 Jul → 2 Aug) — merged to main, which on this repo IS live

- **#607 — the trial is gone.** Signup wrote `status:'trialing'` with a 14-day clock and two crons acted on it daily; **one emailed real people *"Your K.I.N.D trial ends in 4 days — Subscribe now"*** about a product we do not sell. Signup now writes `paused` (dormant until the $99 lands) and **both crons are retired and their endpoints refuse 410** — verified: `auth.ts` calls `signupSubscriptionRow`, `cron.ts` schedules neither job.
- **#604/#605 — the website is restored AND locked.** All **28 pages** serve again with the pre-shrink nav (verified on disk). The site is now **founder-frozen (PRODUCT-RULES P12)**: a manifest pins **110 files** and any change fails the gate until you approve it. **The site cannot change again without you saying so.**
- **#603 — Nexus is back**, with its auto-tune promises corrected to what the code actually does.
- **#406 — the portal sweep.** Four lies off the client's screens, the worst being **an invented unsubscribe number** (`replies × 0.05`) plotted on a chart. Verified: the dead notification bell is gone.
- **#413/#410/#327 — the paper matches the product.** The signup pop-up on **9 pages** promised *"Free to start… No card required"* under a $99-first model; **0 pages say it now** (verified). Terms, sub-processor lists and the CRM claim all corrected.
- **#397 — dead HubSpot code removed** (and the item's own "never called" premise was false — it runs in the reply pipeline).
- **#349 — the money-write remainder.** 11 more swallowed failures closed, including one where **a client who paid would never be credited**.
- **#602/#606 — the doc audit and the founder's 48 rulings.** 14 items tombstoned, 14 redesignated to the ENGINE, 11 re-dotted, Apollo correctly relabelled **[OUR HUNTING]**.

**⚠️ THE ARCHITECTURE (founder, 30 Jul, unchanged).** Of Instantly's bundle we lack exactly one thing — the **warmup network**. Its sequencer, sender and unibox duplicate what we built. So **Instantly drops to Growth (~$37), warmup only**, and **FIGSY + our send path + our unibox do the outreach**. Smartlead deferred until a client is in the works.

### 💸 THE COST FLOOR — REBUILT 3 AUG FROM ACTUAL BILLS. **~$223 was wrong. It is ~$146.**

The founder said ***"i cant afford 470/month… without income coming in this is impossible to maintain"***, and opening the real invoices found the model had been overstating the floor for weeks.

**The error, and it is the biggest single number in this repo:** the *Servers + database* line read **$138** and was tagged **verified**. Actual: **Railway $15.59 + Supabase $35 = $50.59**. **Overstated by $87/mo.** Nothing changed at the vendors — the number was simply never checked against an invoice, and the "verified" tag stopped everyone who read it afterwards from checking. ⚠️ **A confident label on an unread number is worse than no number**, and this is the same defect the 29 Jun audit rule was written for.

**Then the founder's cuts, made the same day** — note what was *not* cut:

| Line | Was | Now | |
|---|---:|---:|---|
| Servers + database | $138 | **$51** | Railway $15.59 + Supabase $35, off the bills. ⚠️ Railway is **usage-based** — that is the idle rate, it climbs with traffic |
| Resend | $20 | **$0** | free tier. ⚠️ ceiling not free lunch: ~3,000/mo and **~100/day** — the daily cap bites first when clients arrive |
| Apollo | $65 | **$0** | drops to the free plan **3 Sep**. August is paid, so **2,500 credits are August's prospecting already bought** |
| Claude Code | ~$152 | **~$23** | downgraded; current plan runs to **20 Aug** |
| Google Workspace | — | **+$28** | **kept** |
| Instantly Growth | $37 | **$37** | **kept** |
| Failover | $12 | $12 → **$0** | teardown now worth doing under cost pressure |

**Product floor ~$146/mo · ~$134 once the failover dies · ~$157 all-in including Claude Code.** Down from ~$470.

**Nothing on the sending path was cut, deliberately.** Killing Google + Instantly saves ~$65 and pushes first revenue further out — which is the actual problem. **At $4/approved lead, ~$134/mo is ~34 approvals a month, or roughly ONE client.** That is the whole race: one client covers the platform, two make it a business.

### 🧍 STRIPE — SMALLER THAN THE BOARD CLAIMED (founder, ~5 min) — ⚠️ CORRECTED 4 AUG

**The 3-Aug version of this block said the product "cannot take a payment at all" until a $299 price was created in Stripe. That was WRONG — corrected by reading `lib/stripe.ts:113-132` instead of assuming.** The pack checkout does not use a dashboard Price object: `createWalletCheckoutSession` builds the charge with **inline `price_data`** — the amount comes from the API at runtime, and the API derives it from `PACK_PRICE_USD`. So the moment #1253 deployed, **the checkout started charging $299 by itself.** There is **no price to create and no env var to point.** *(The "renders the dashboard product" rule — #414 — is true only of the dormant subscription checkout, which is not the pack path. Two checkouts, two rules; the 3-Aug block applied the wrong one.)*

**What actually remains yours in Stripe, both small:**

| ✓ | Do | Where |
|---|---|---|
| ✅ | ~~**Fix the product description you pasted on 3 Aug**~~ **VOID 5 Aug — the same dead claim as A7, killed by the founder's own Product-catalogue screenshot:** 9 active products, 0 archived, **nothing at $99**, every price matching the nine price env vars. Founder: *"we never did it and never had to do it."* And even if stray text existed it could never reach a client — the $299 pack checkout renders **no dashboard product at all** (inline `price_data`). Nothing to edit, nothing to archive. | Stripe |
| ⬜ | **The $299 test purchase on a real card** — proves the derived gate, the pack counter (100), and that the wallet is NOT credited (#562) in one walk | Milla, as a client |

**⚖️ ALSO OWED, NOT URGENT:** the marketing pages now promise the client's domain and mailbox are **"yours to keep"** and that onboarding includes **training**. **Neither is in the Terms**, deliberately — ownership-transfer-on-churn is an obligation nobody has decided (the domain sits on our registrar, the mailbox on our Workspace) and training is a service level. Decide both, then have counsel word them. Flagged in `terms.html`.

**The purchase order — do these in sequence, not at once.** ⚠️ **Founder status on all five is UNKNOWN to this doc** — nothing here can see your Google, Instantly or Apollo accounts. Tick them off when you do them.

| | What | $/mo | Done? |
|---|------|:---:|---|
| ① | ✅ **DONE 4 Aug — 2 domains + 4 Google mailboxes, live.** `kindoutreach.com` + `trykind.org`, each with the full deliverability set (**MX · DKIM 2048 · SPF · DMARC**) in place *before* warmup started. 4 boxes: `jacques@` + `hello@` on each. ⚠️ **GoDaddy pre-seeds a `_dmarc` row** — adding ours alongside left one domain with **two, which means NO DMARC at all**; caught by counting rows. **EDIT that row on future domains, never add.** ⚠️ App Passwords saved for our engine (#600, step 7 pending). Free trial to **18 Aug**, then ~$28/mo. | ~$28 | ✅ **DONE** |
| ② | ✅ **DONE 4 Aug — WARMUP IS RUNNING.** Growth bought (**not** HyperGrowth — that tier only buys a sending API our own engine replaces). All 4 boxes connected **by OAuth**, warmup ON, **zero campaigns**. Settings: +1/day · cap **25** (deliberately above Instantly's suggested 10 — see #198 for why) · reply 30% · weekdays-only · read-emulation on. ⚠️ OAuth needed a Workspace fix: **Security → API controls → trust Instantly's client ID**, org-level so it covered both domains. **CLOCK: 4 Aug → warm ~25 Aug.** | ~$37 | ✅ **DONE** |
| ③ | **Apollo — for OUR hunting only** (PDL + Hunter stay the client-facing stack). | ~$65 | ✅ **CLOSED 3 Aug — Basic Monthly, $65/mo** |
| ④ | **Founder-led outreach DURING the 3–4 week warmup** — 20 personal messages off the MBF demo. Fastest route to clients 1–3, costs nothing. | $0 | ❓ unknown |
| ⑤ | **#553 first-send ladder on OUR boxes** when warm — test send lands in a real inbox, mail-tester ≥9/10, cap on, watched. **Then** flip `AUTO_OUTREACH_ENABLED`. | $0 | ⛔ blocked on ① |

**⏳ WHERE ① ACTUALLY STANDS (3 Aug) — the one thing the whole launch waits on.** The **two cold-send domains are bought**: `kindoutreach.com` and `trykind.org`, **£20.45 one-off at GoDaddy**, deliberately neither `get-kind.com` (carries invoices and client mail — a spam complaint there poisons the business) nor `gettingkind.com` (Resend send + inbound webhook only; **it has no mailbox and no password to give the engine**). Google Workspace is signed up on **`kindoutreach.com` as the primary** — `trykind.org` gets added afterwards as a **secondary domain inside the same subscription**, so it is one bill and one admin login, not two. **Google's domain verification takes ~48h, so ① and ② are parked until ~5 Aug.** Nothing on our side is blocked by us. Cost lands at **~$28/mo** (4 × ~$7 Business Starter) against the **~$25 estimated** — +$3, inside the noise. *(The floor was rewritten the same day, but for an unrelated reason — see the cost-floor block above.)* ⚠️ **When the boxes are created, each needs an App Password** (Google → Security → App Passwords), **not the login password** — Google blocks plain-password SMTP, and this is the step that silently defeats people.

**⚠️ APOLLO — the recorded price was wrong, corrected from the founder's billing screen (3 Aug).** This doc and the 1 Aug session log both say **$49**. The account actually shows **Basic Monthly at $65/mo**, 2,500 credits per month, **0 used**, renewing **3 Sep**. Both facts are kept rather than reconciled: a **$49 charge on 1 Aug** genuinely happened and a **$65/mo plan** is genuinely what renews — whichever way that resolves, **$65 is the number to budget**, and the 2,500 unused credits are prospecting we have already paid for and have not spent.

**The fuel, separate from the rent:** ~**$130–145 per 1,000 prospects** (Apollo at its actual **$65**, corrected 3 Aug) ≈ **one client** at conservative reply rates, burned over ~6 weeks ≈ **~$85/mo while hunting** — and **August's fuel is already paid**: 2,500 unused Apollo credits before the plan goes free on 3 Sep. One client is worth **$299 + ~$153/mo** (re-derived 3 Aug: the price moved to $299 and the per-client inbox line fell from a guessed $40/mo to a real ~$8/mo).

**💷 MONEY — the three founder checks, WORKED THROUGH 3 AUG:**

| | Do | Outcome |
|---|---|---|
| ① | **Hunter + PDL billing** | ✅ **DONE 3 Aug — both confirmed $0.** ⚠️ Still true that a free tier is a **volume ceiling, not a free lunch**: free PDL is ~100 records/month, **half of one client's 200-name pack**, so this becomes a real line the month a proper sourcing run happens. Re-check then, not before. |
| ② | **Failover teardown** — ⓐ **repoint** `api.get-kind.com` to a plain CNAME on Railway (`kindapi-production-e64c.up.railway.app`, proxied) and confirm the portal still loads · ⓑ **delete the Cloudflare** Load Balancer + its health monitor · ⓒ delete/suspend the Render `kind-api-standby` service. **⚠️ The wrong order takes the live product down** — `api.get-kind.com` routes *through* the load balancer today. Setup context (NOT a teardown guide): `docs/render-cloudflare-failover.md`. | ⏸ **PARKED 3 Aug, deliberately — founder-agreed.** It is **$12/mo** against a launch blocked on mailboxes, and step ⓐ carries a real (small, reversible) risk of dropping the portal while DNS is edited. **The trade that makes parking safe: #199's monitor went live the same day**, so an outage is now *noticed* within 5 minutes even though it is no longer *auto-routed around* — and the failover has never actually been tested anyway. Bank the $12 on a quiet afternoon, not on the critical path. |
| ③ | **GoDaddy audit** | ✅ **CLOSED 3 Aug — no action, and that is the right answer.** GoDaddy is the **registrar** for `get-kind.com`; Cloudflare holds the DNS and the load balancer. There is nothing to trim at the registrar, and the two live domains (`get-kind.com` product · `gettingkind.com` cold-send identity) must **never** be touched. |

**✅ ALSO DONE 3 AUG — three founder actions off the board:** **#199** production monitoring is live (UptimeRobot keyword monitor on `/health` — see the item for why *keyword* and not *HTTP status* is the whole point) · **#317** Stripe now sends `charge.refunded` / `charge.dispute.created` / `charge.dispute.closed`, so refund and chargeback code that shipped months ago **can finally run for the first time** · **#414** the Stripe dashboard product description now matches `packages/shared` — the one half of that item no code could ever reach · and **`PAYSTACK_SECRET_KEY` is deleted from Railway** (`FLUTTERWAVE_*` were already gone with #314).

**Built but NOT PROVEN — each needs real activity, not more code.** These are 🟡/🩷 and must not be read as working:

- **#550 Smartlead** — key returns **401**; nothing exercised against a live workspace. ⏸ Parked on purpose until a client is in the works.
- **#366 PDL paging** — needs one ICP run twice with real credits to prove month two finds new people.
- **#340 / #342 subscriptions** — need Stripe test-mode activity to exercise.
- **#298 backup manifest** — built; **take one and save the JSON off this system.** Never done.
- **#599 CSV lead import** — **never run against a real Apollo export.** Press **Check the file** before **Import**: it writes nothing and names every column it read.
- **The 8 items flipped 🩷 on 2 Aug** — merged and live, **walked by nobody**. Each needs your eyes before it can go 🟢 (`FOUNDER_FLIP=1`, founder-only).

**Environment blockers, one root cause — the flagged GitHub account:**

- **CI has never run.** Five workflows registered and `active`, **0 runs ever**. `scripts/check.sh` is not a belt over CI — **it IS the only gate**, and `scripts/ship.sh` is the only deploy.
- **Supabase dashboard unreachable** → no password reset, no restore drill (#298), **no migrations** (see the constraint above). Ticket open, unanswered.
- **✅ Production is now WATCHED (3 Aug, #199).** Until today nothing monitored production and the first person to learn the API had died would have been a client. UptimeRobot checks `/health` every 5 minutes and alerts on the body, not the status code.

**Verified live in production on 27 Jul, not claimed:** RLS clean (82 tables read, no exposed tables · `client_inboxes` had **no RLS at all** and now does) · cron single-run guard in place · 12/12 migrations applied *(the 13th, #607's, is pending and blocked — nothing depends on it)*.

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
| #317 🩷 | **Stripe refund / dispute events subscribed** | The refund, chargeback and dispute-won code all shipped and **none of it can ever fire** until Stripe → Webhooks is subscribed to `charge.refunded` · `charge.dispute.created` · `charge.dispute.closed`. A won dispute currently leaves the client permanently short. | 🧍 |
| #491 🩷 | **Per-cron failure alerting** | All 25 crons die silently if an env var is unset — one blanket alert covers the lot. With real clients sending, a dead cron is a client who stopped being worked and nobody knew. Pairs with #561. | 🤖 |
| #199 🩷 | **Nothing watches production** | There is a health probe at `index.ts:107` and **no monitor pointed at it** — no UptimeRobot, no BetterStack, no Sentry (error capture is a DB insert that swallows its own failure). If the API dies, the first person to find out is a client. | 🧍 |
| #329 🩷 | **Wipe the seed data before the first real client** | Founder-confirmed on the admin walk: *"when we flip over live we clean everything."* Test clients, seeded leads and demo residue must not sit in the database a paying client's numbers are computed from. | 🤝 |
| #298 🩷 | **The restore has never been tested** | Supabase takes backups. Nobody has ever restored one. A backup you have not restored is a belief, not a backup — and this is the only copy of every client's data. One drill, once. | 🤝 |

## 🅲 BLOCK C2 — WHAT WE CLAIM vs WHAT IT DOES (each one is a refund or a complaint waiting)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #413 🩷 | **Terms §5 contradicts the code, and itself, on when a credit is consumed** | The document that governs the money disagrees with the money. It is the one place a client will quote back at us. | 🤝 |
| #414 🩷 | **The Stripe product description oversells at the point of payment** | `packages/shared/src/constants/index.ts:29` — the last thing a client reads before their card is charged, describing something we do not do. | 🤖 |
| #410 🩷 | **The legal pages name the WRONG data sub-processor** | `privacy.html` ×4, including the formal sub-processor list — it names a provider we do not use and omits the ones we do. | 🤖 |
| #327 🩷 | **The website claims integrations that do not exist** | `pricing.html:491` "HubSpot & Salesforce integration" · `virtual-assistant.html:536` "Salesforce, Gmail, Outlook, Google". `lib/hubspot.ts` **is** called — the reply pipeline pushes interested replies into OUR HubSpot (#397, premise corrected 1 Aug) — but that is our CRM, not the client's, and nothing on the page is what a buyer would understand by "integration". Salesforce does not exist at all. | 🤖 |
| #406 🩷 | **The portal has never had a full element sweep** | Every screen, tile, tab, button, toggle and modal on `apps/portal`, checked against what the backend actually does. The showroom strip (#478) took the worst offenders; the sweep itself was never finished, and it is exactly where "the button lies" bugs live. | 🤖 |

## 🅳 BLOCK D — MAKE THE DOCS HOLD (done this session — this is what you are reading)

| # | Item | What it is / why it blocks | Owner |
|---|------|----------------------------|:-----:|
| #555 🟡 | **BUILD-STATUS retired** | It was a **fifth status doc** and its summary line read *"the ONLY items not built: #515 + CI"* while the whole sending spine was 🔴. That one line is why the docs stopped being trustworthy. Moved to `docs/archive/`, marked historical, unlinked from here. Status has one home: PRODUCT-INVENTORY. | 🤖 |
| #556 🟡 | **Cashflow model is canonical, in the repo** | `docs/CASHFLOW-LAB.html` — two needles at the top, every cost line an editable box. Honest platform floor **~$146/mo** — **rebuilt 3 Aug off the actual invoices, and the correction was large**: *Servers + database* had read **$138 tagged verified** against a real **$50.59** (Railway $15.59 + Supabase $35), overstating the floor by **$87/mo** for weeks because nobody opened a bill. Also that day: **Resend → free**, **Apollo → free plan 3 Sep**, **Claude Code downgraded** (~$152 → ~$23, current plan to 20 Aug), **Google Workspace +$28** and the failover teardown re-prioritised (**~$134** once dead). The 30 Jul **idle-tools-bill-nothing** rule still governs the $0 lines: Hunter and PDL until a sourcing run, Smartlead until a client signs. The old ~$190 left out Smartlead, Instantly, Zoho ~$3 and the Anthropic runtime. Two numbers that change how we sell: a client must approve **~13/month just to pay for their own inbox**, and the **$99 pack is −$52 in month one** — the repeat is the business, the pack is the door. | 🤖 |
| #557 🟡 | **Stale flow + preview docs stamped** | `flows/new-client-flow.html` (built on the retired 14-day trial) · `flows/our-outreach-flow.html` (*"manual in Instantly, nothing to code"* — **overruled 26 Jul**) · `MILESTONE-0-CHECKLIST.md` (the retired $1/$3/$5/$6 ladder) · `mv-previews/flow-vida.html` + `home.html` (*"your own warmed inbox"* — describes #211, which is not built). Each now carries a correction banner rather than being silently deleted. | 🤖 |

## 🅴 BLOCK E — THE LIVE GATE (all of it walked, none of it remembered)

| # | Gate — live means every one of these was **walked**, on real data | Owner |
|---|---|:-----:|
| — | **Money walk to the cent:** real card → $299 lands → pack reads 100 → masked lead shows **no email** → pick 20 → 👍 → **$0 charged, counter reads 80** → 101st approval charges **$4** → ledger reconciles exactly · one dead email hands the pack slot back, never credits $4 | 🤝 |
| — | **Send walk:** a client's own assigned inbox sends · **no inbox = refused, visibly** · nothing falls back to our address · the reply comes back to **their** thread in the unibox · booking confirms | 🤝 |
| — | **Client Zero fires:** our own ICP → sourced → we approve **in Milla as the client** → sends leave on our **Instantly** mailbox **through the product** → replies land in the unibox | 🤝 |
| — | **Gates hold under a fetch, not just a click:** minimum-20 refused server-side on `/approve`, `/reveal`, `/approve-batch` · a 30-day-idle client is suspended and un-suspends on their **own** approval | 🤖 |
| — | **Demo is airtight:** MBF reset → walked → nothing sent, every address `.invalid`, no real prospect touched | 🤝 |
| — | **Both consoles walked** — Vida end to end as the operator, Milla as the client sees it. Everything walked flips 🩷 → 🟢, founder-only (`FOUNDER_FLIP=1`). | 🧍 |

---

## 🎯 THE RUNLIST — every live item · description · owner · when *(rewritten 5 Aug on the founder's order: "i work off launchpad — this table needs to be on the launchpad." Updated every session; this table IS the standings report.)*

> **Selling stays OFF this board** (founder, 4 Aug: *"i know how to sell."*). Status of record per item lives in PRODUCT-INVENTORY — rows here reference ids and the dots are script-stamped.

### A — The path to 25 Aug send-day

| # | Item · description | Owner | When |
|---|---|---|---|
| ~~A1~~ | ~~**Preview + merge PR #1269 (#615)**~~ ✅ **DONE 5 Aug — merged to main, so it is LIVE.** ⚠️ Merged without the preview walk, so it went 🟡→🩷 (live, unverified) rather than 🟡→🟣→🩷. **The 6-step walk in the PR body is now a LIVE-site walk** — do it when convenient and it becomes part of the pink walk (A11). | 🧍 | ✅ done |
| ~~A2~~ | ~~**Vida cleanup**~~ ✅ **DONE 5 Aug, founder-walked.** House wallet **$3,999,038 → $0 → $4,000** (the balance reading exactly $4,000 is the proof both writes landed in the right order — a grant without the zero would read $4,003,038). Stripe Test and ACME **deleted**; MBF and Client Zero correctly showed **no Remove button**. **The audit also produced evidence, not assumption:** `figsy_sent_emails` = **0 rows** (nothing has ever been emailed from this account) · `AUTO_OUTREACH_ENABLED` **off** · `jacques@kindoutreach.com` **warming**, refused by the picker. ⚠️ **And it dated the landmine: cold-client clock reads 39 DAYS IDLE** — see A5, and note A4 interacts (approving anyone resets the clock to zero). | 🧍 | ✅ done |
| ~~A3~~ | ~~**Ruling: booking link in email 1**~~ ✅ **RULED 5 Aug — Option A: the gate was right, the prompt was wrong.** *"The first email's job is to earn a reply, not a booking."* `generateSequence` no longer asks for a link in step 1 (step 3 keeps its link); the gate's exemption, its warn and the `bookingUrl` option are all removed, so a booking link in a first touch is now an ordinary hard fail. ⚠️ **Watch on the first real run:** a draft refused twice skips the lead with the reason named in `skip_reasons` — but **no screen renders it**, so a systematic refusal would read as *"no enrolments"* rather than *"every draft refused"*. Surfacing it is C8 below. | 🧍→🤖 | ✅ done |
| ~~A4~~ | ~~**Ruling: the 159 stale approved leads**~~ ✅ **RULED 5 Aug — KEEP THEM.** Founder: *"no they potential clients."* They are real prospects worth working, not test residue, so no clearing build is needed. **Two consequences, both accepted:** ① the onboarding pack stays **used**, so every approval draws the wallet at $4 — funded by the $4,000 granted in A2 (~1,000 approvals). ② **The 39-day cold clock STAYS**, which makes A5 urgent rather than theoretical — see A5. | 🧍 | ✅ ruled |
| ~~A5~~ | ~~**Ruling: cold-cron exemption for the house account**~~ ✅ **RULED AND BUILT 5 Aug (#618).** Founder: *"do a5 i have no idea but do it."* Option ⓐ taken — the house account is now skipped by `cold-check`, resolved by `decideHouseClient` (never by name), decided in ONE pure function the cron asks. **Fails open:** if the house cannot be resolved nobody is exempted and the cron behaves as today. Demo exemption unchanged; a real client on the identical clock is still suspended (asserted by test). ⓑ stays free on the day — approving anyone resets the clock anyway. | 🤖 | ✅ done |
| ~~A6~~ | ~~**Ruling: cap ladder 30→50/day**~~ ✅ **APPLIED BY RULE 5 Aug (#622)** — the standing recommendation stood because the founder stayed silent. **The ladder was already enforced and already topped out at exactly 50/day**; what was missing is that the steps were bare literals, so the ladder ruled on and the ladder enforced matched by coincidence. Now named (`WARMUP_LADDER`), behaviour byte-identical. **Override any time.** | 🧍→🤖 | ✅ done |
| ~~A7~~ | ~~**Stripe: the stale $99 product**~~ ✅ **VOID 5 Aug — founder's catalogue screenshot is the evidence: there is no $99 product and never was.** 9 active products, 0 archived, and every price matches the nine env vars exactly ($20/$40/$100 Lead Gen · $60/$120/$300 FIGSY · $49/$29/$39 subs). Nothing to archive, nothing to edit. The "$99 description" claim was carried forward from a 3-Aug note that his own dashboard now disproves — and even if stray text existed, the pack checkout renders **no dashboard product at all** (inline `price_data`), so no client could ever see it at pay time. **Top-ups verified the same session:** first purchase $299 (server-enforced, derived from `PACK_PRICE_USD` both ends), then bundle top-ups **$40 / $100 / $200** on the billing page → `/stripe/checkout` validates against `TOPUP_PRESETS`, webhook credits the wallet ledger-first. No dashboard SKU involved — by design (*"no bundle SKUs"*). | 🧍 | ✅ void |
| A15 | 🔴 **RUN THE `20260727_cron_claims` MIGRATION** — **Vida → Engine → Database migrations**. The System screen is CHECKED-BROKEN on it: *"MISSING in production — without it two replicas double every email and every charge."* A founder click, no Supabase access needed. **Do before send-day** — a doubled send is unrecoverable reputation damage and a doubled charge is a refund conversation. | 🧍 | **today** |
| A16 | **CONFIRM the Instantly mailbox count** — the System screen reads **9 mailboxes across 3 domains** (`kindoutreach.com`, `trykind.org`, **`nexttrygetkind.com`** — the third appears in no doc). Every plan and the cap ladder assumed **4 boxes on 2 domains**. Confirm which are intended senders; nobody should assume. | 🧍 | before 18 Aug |
| A17 | **Set `pdl_monthly_cap_usd`** (app_settings) — currently absent, so only the code default guards sourcing spend. $2.80 spent this month against nothing to measure it by. | 🧍 | before sourcing at volume |
| A8 | **Item 13 — Google "storage full / 30 GB" anomaly** — still unexplained; look in Google admin | 🧍 | 5 min |
| A9 | **The two walks** — $0 manual-grant money walk · one fresh signup completing clean | 🧍 | 15 min |
| A10 | **Monday Instantly glance** (4 health scores rising, zero disconnects) · **18 Aug Google charge (~$28) succeeds** | 🧍 | weekly · 18 Aug |
| A11 | **Pink walk** — 🩷 → 🟢 on your "good". Now covers #591 too (its dot was corrected 5 Aug) plus the merged #611/#612/#613/#614/#616 | 🧍 | during warmup |
| A12 | **Failover teardown** ($12/mo back) — pinned order in the runbook: DNS repoint FIRST | 🤝 | 10 min |
| A13 | **Terms rulings** — "yours to keep" on churn · what "training" includes → counsel words the Terms | 🧍 | before client #1 |
| A14 | **#553 — THE SEND LADDER** · ✅ **RUNBOOK WRITTEN 5 Aug (#621) → [`docs/SEND-DAY-RUNBOOK.md`](./SEND-DAY-RUNBOOK.md)** — every step read out of the live code, `CHECK:` marks anything the code couldn't confirm. Covers warmup week · pre-flight (**mail-tester ≥9/10 or DO NOT LAUNCH**) · the flip · first-hour watch · **3 tripwires each paired with its kill action** · the kill order · the money walk. ⚠️ **Executed FOUNDER-SOLO** — Claude access ends 18 Aug. | 🤖 written · 🧍 executes | **~25 Aug — the finish line** |

### B — The company's nervous system (UK Ltd, from the 4 Aug expense audit)

| # | Item · description | Owner | When |
|---|---|---|---|
| ~~B1~~ | ~~**ICO registration (~£47/yr by direct debit)**~~ ✅ **DONE 5 Aug — founder registered.** The legal floor for processing prospect data is in place; a named person at a company is personal data even in B2B, and the leads were already in the database, so this closed an exposure that was already running. Keep the confirmation email + the direct-debit reference with the company records (B3's accountant will want both). | 🧍 | ✅ done |
| B2 | **The 30-min browser pass** — your Stripe dashboard FX % (Settings → Payouts) · Stripe intl 3.0 vs 3.25% · FreeAgent multi-currency (the £660/yr question) · Xero price-lock before 1 Sept · ICO fee page. Every "unverified" tag in the artifact + `cost-floor.ts` waits on this | 🧍 | this week |
| B3 | **Get an accountant (~£60–90/mo compliance-only)** — settles VAT timing, salary/dividend split, year-end dates; needed at first year-end even at £0 revenue | 🧍 | before first revenue |
| B4 | **Track overseas software spend monthly** — reverse-charge purchases count toward the £90k VAT threshold with ZERO sales; the meter lives in the cashflow artifact | 🧍 | monthly |
| B5 | **Banking/FX route** — Stripe-settle-USD + Wise (~£3/sale saving); decide at ~20 sales/mo, not before | 🧍 | later |
| B6 | **Insurance** — professional indemnity when a client contract demands it (~£150–300/yr) · employers' liability the day anyone joins payroll (£2,500/day without it) | 🧍 | triggered |

### C — Build items (state after the 4→5 Aug overnight batch)

| # | Item · description | Owner | When |
|---|---|---|---|
| C1 | ✅ **#613 revenue honesty — BUILT, merged.** Settlement stamped per payment + reconcile panel on Billing. Known limits: annotation not columns (schema frozen) · old rows stay list-price · **subscription path still hardcoded** (`stripe.ts:657`, dormant — first job the day subscriptions return) | — | done |
| C2 | ✅ **#614 cost floor as code — BUILT, merged.** `estStack=690`/`95` literals dead; pages read `@kind/shared`; drift test binds `docs/CASHFLOW-LAB.html` to the code; 5 UK-company lines exist, every one tagged unverified until B2 | — | done |
| ~~C3~~ | ~~**#615 VAT onboarding**~~ ✅ **DONE — merged 5 Aug in PR #1269 (= A1).** The row said "awaiting the founder's preview" for a day after it had already shipped; corrected 5 Aug. | — | ✅ done |
| C4 | ⚠️ **#616 seat cap — PARTIAL.** API control, owner-only rule, honest 409, warn-data: done, merged. **The screen where a sysadmin types the number does NOT exist yet** — one input + warn banner in Command Centre, client-facing → preview-first. Rides with C6 | 🤖 | next prompt |
| C5 | ⚠️ **Seat removal — HALF.** Dead "Add member" button fixed (merged). Delete-vs-deactivate is a founder decision; no delete exists | 🧍 ruling | with C4 |
| C6 | 🔴 **D4 — Vida "no tax ID" badge** on the clients list — one line, lands after #1269 merges (uses its shared `vatBadge`) | 🤖 | after A1 |
| ~~C7~~ | ~~**PECR/GDPR pass on the outreach**~~ ✅ **BUILT 5 Aug (#617).** UK sole traders are individual subscribers — refused unless the company name carries a corporate marker, matched on **word boundaries** (a substring match hands a sole trader an exemption they don't have). **Fails SAFE**, the opposite of #618, deliberately. Asked at **THREE** enrol paths before the charge — both `/figsy` routes **and `autoEnrollLead`**, the third found while wiring #620 and the one a client's own approval takes. Plus a send-time net for rows enrolled earlier. 21 tests, red-proved 7 ways. | 🤖 | ✅ done |
| ~~C8~~ | ~~**Surface `skip_reasons`**~~ ✅ **BUILT 5 Aug (#620).** Both enrol routes now persist refusals to `operator_audit_log` (**no migration** — schema frozen) and Vida's cockpit renders `⚠️ last enrol: N enrolled · M skipped — <reasons>` **in words**. Written only when somebody was skipped. 12 tests, red-proved 3 ways incl. the exact original bug (fetch it, never render it). | 🤖 | ✅ done |
### D — Blocked / conditional

| # | Item | Owner | When |
|---|---|---|---|
| ~~D1~~ | ~~**Boxes 3+4 into the engine**~~ ✅ **NOT A BUILD — corrected 5 Aug (#622).** There is **no two-box limit in the code**: the engine already uses every sendable, credentialled mailbox, spreading least-used-first. Boxes 3+4 are held out by one thing — **status `warming`** — and that guard is CORRECT (sending on a warming box un-warms it). **So this is a status flip on the mailbox rows when warmup finishes — a founder action on the day, now in the runbook.** | 🧍 | ✅ ruled |
| D2 | ⏸ Migrations ×2 · Postgres rotation (burned, in git history) · GitHub flag appeal | external | blocked |
| D3 | Railway replica re-check | — | only if ever Pro |
| D4 | **Ruling: `staging` is 46 commits behind `main`** — refresh it from main, or keep previewing client-facing PRs from their branches | 🧍 | with A1 |

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

- **Money (current — ONE WALLET, 24–25 Jul; PRICE RE-LOCKED 3 AUG):** one dollar wallet per client · first purchase **$299 = the fully-onboarded pack, 100 approved leads included**, then a flat **$4 per approved lead, FINAL** · **no time limit on paid leads** · a dead email is never charged · meetings are reported, not refunded · **only the client's 👍 ever spends — operators never**. **Two gates protect it:** at least **20** approvals the first time round, and **30 days with no approvals suspends them**. Full model + the cost floor → **`docs/CASHFLOW-LAB.html`** (canonical) · cost detail → `run-costs-and-cashflow.md`.
- **Instantly is ours. Smartlead is the clients'.** Both run **inside the product** — we use our own product for our own outreach. No CSV hand-off.
- **No new SQL** beyond committed, reviewed, **idempotent** migrations run from Vida → Engine. The Supabase SQL editor is unreachable (GitHub removed the Supabase OAuth app).
- **Before any real send:** `/engine/env` must show `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` · `money_rpcs` installed — **plus** whatever #548 settles on for per-inbox credentials.
- **Architecture (locked):** AI drafts and scores; deterministic code decides and **fails closed**; state advances only after a verified provider/DB success.
- **A demo account never touches a real prospect.** `is_demo` is a hard stop inside the send path, and demo addresses are `.invalid` (RFC 2606).
