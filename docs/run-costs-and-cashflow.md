# K.I.N.D — Run Costs & Cashflow Model
`Rebuilt clean 10 Jul 2026 — every number ties to code (packages/shared pricing · sourcing-fences rate · stripe bundles) or a verified live provider dashboard. One truth per figure; no stale layers.`

> ## 💰 THE MODEL OF RECORD IS [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html) *(founder-locked 25 Jul · inventory #556)*
> **Open the lab first.** Two needles at the top (clients · average approvals per client per month), every cost line an editable box, and it recomputes live — the layout the founder locked: *"we can refine numbers but the layout I understand."* **This markdown doc is the workings** — where each figure comes from, what it ties to in code, and the scenario envelope. If the two ever disagree, **the lab is the model and this doc is the bug.**
>
> **The floor is ~$146/month** (rebuilt 3 Aug off the actual invoices — see §5, NOW table). **The correction that matters:** the *Railway + Supabase + Cloudflare* row read **~$138** and was tagged **verified** against a real **$50.59** — overstated by **$87/mo** for weeks, because the number was never checked against a bill and the confident tag stopped anyone re-checking it. **The same day the founder cut what was not the launch** — Resend to free ($20), Apollo to its free plan from 3 Sep ($65, with 2,500 already-paid credits covering August), Claude Code downgraded (~$152 → ~$23) — and **deliberately kept the sending path**: Google Workspace **+$28** and Instantly Growth **$37**, because cutting those saves ~$65 and pushes first revenue further out. **~$134/mo once the failover dies; ~$157 all-in including Claude Code.** The history: a ~$190 figure omitted Smartlead, Instantly, Zoho and the Anthropic runtime; correcting that gave **~$457** (25 Jul); deferring Smartlead and pricing Instantly at its real tier gave **~$423** (30 Jul); the **idle-tools-bill-nothing** rule gave **~$283**; and the **Client Zero architecture lock** gave **~$223** — which the invoices then cut to **~$146**. It rises to **~$490** the day a client signs. PDL is modelled the way it is actually billed — a bought tier with a **$98 floor**, charged as `max(tier, names × $0.28)`, not double-counted as a fixed line *and* a per-name cost.
>
> **Two numbers out of it that changed how we sell:** ① a client must approve **~3 leads a month just to pay for their own sender** (their own Google box is ~$8/mo, not the $40/mo this line used to assume) — the **minimum-20 gate (#542) still stands**, but it is now a commitment filter rather than the thin margin it was sold as; ② the **$299 pack clears ≈ +$165 in month one** against ~$134 of setup, and covers the ~$143 it cost to acquire them as well. ⚠️ **THIS LINE PREVIOUSLY SAID the $99 pack was −$52 in month one, and it was right** — that is exactly why the price moved on 3 Aug: at $99 the founder personally funded ~$78 of every engine-acquired client and ate it whole if they churned after month one.
>
> ⚠️ **One input still unresolved, founder's call:** *names sourced per approval.* Flow v2 says **2**, #415 measured **~7**. At 7 the model roughly halves. It stays an input box until the live measurement (now on Vida's worklist) settles it.

> **HONEST STATUS (10 Jul 2026):** pre-revenue. **0 paying clients.** We are at the **SPRINT** (first paying client). The old May–Jul launch dates were the *anticipated* timeline; the real build ran long, so all forecasts below are **re-based to Month-0 = first paying client**, not calendar months. This doc is the single home for money math — pricing, costs, unit economics, CAC, break-even, the **three-scenario cashflow envelope (§8B)**, growth shape. Strategy → KIND-MASTER · execution → LAUNCH-PAD · future detail → V2-TRACKER.

---

## 1. THE MONEY MODEL — one wallet · $299 onboarding pack · then $4 a lead (PRICE RE-LOCKED 3 AUG)

> ⚠️ **This section was stale until 25 Jul** — it still described the retired two-wallet model ($1 reveal into `credit_balance` + $3 work into `figsy_credits_remaining`). That was superseded by **#492 ONE WALLET** on 24 Jul and the doc never caught up. Corrected here; this is the pricing home, so nothing else should restate it.

Leads arrive **masked** — browsing and building the plan are free. There is **one dollar wallet** per client (`wallet_balance_usd`, moved only by `try_charge_wallet` / `increment_wallet`) and **one money event**.

| Step | Charge | What happens |
|---|---|---|
| **Onboarding pack** | **$99 → 100 leads** (99c each) | the first purchase. Nothing sources or sends until it lands — the ICP stays dormant |
| **Each approved lead** | **$4, flat and final** | the client's 👍 on a scored person. That's when we start working them |
| **Top-ups after the pack** | any amount, $4 a lead | |

- **The client's 👍 is the only thing that ever spends.** Operators never spend.
- A **dead email is never charged** (reversed in-flow). **Meetings are reported, not billed.**
- We **refuse the charge outright** if there's no live campaign to work the lead — never take money for work that can't run.
- A **no-show gets two attempts**; after that the client chooses to pursue it themselves or pay a fresh $4 for a re-run.

**What the $299 pack costs us** (rates in §2, re-derived 3 Aug against confirmed vendor prices): a **pre-warmed Smartlead mailbox $45** so they send on day one · **200 records sourced** at $0.28 = **$56** (they pass on roughly half, so 200 gives them a real choice at 100 approvals) · their own branded domain **$12/yr** and their own Google mailbox **$7/mo**, warming alongside · 100 leads worked at ~$0.07 = **$7** · Stripe on the $299 = **$10.50** → **≈ $134, leaving ≈ $165** against the **~$143** it cost to find them.

⚠️ **THE OLD LINE IS KEPT AS THE RECORD OF THE ERROR** (CORE-MAP rule 3): *"$56 · $6 worked · $3.17 Stripe · their inbox month 1 **$4.50** ≈ $70, leaving ≈ $29 on the $99."* **That $4.50 inbox line was wrong by a factor of ten.** Confirmed 3 Aug: a warmed mailbox is **$45/month**, not $4.50 — and warmth cannot be bought any cheaper, because every mailbox starts cold and "pre-warmed" means somebody began warming it weeks earlier. Costing a warmed inbox at $4.50 is the single reason the $99 ever looked like it covered a client.

> The $56 is the number to watch: **PDL is spent at sourcing whether the client approves or not.** Pool-first sourcing reduces it — anyone already in our pool is free — so $56 is the worst case, and it falls as the pool grows across clients in the same market.

**How the pack is implemented (built 25 Jul):** a **counted quota**, not a wallet credit. `lib/onboarding-pack.ts` derives it from rows that already exist — bought the pack (a purchase row) and used so far (leads with `revealed_at`) — so there is no column to keep in sync and no fiction in the balance. The first 100 approvals charge **nothing**; the 101st charges $4 exactly as before. *(The alternative was crediting $499 for a $99 payment so "$4 a lead" happened to reach 100 — a balance that is mostly invention and a revenue figure you can't trust.)* A dead email on a pack approval **hands the slot back** rather than crediting $4 the client never paid.

**No time limit on paid leads (founder-locked 25 Jul).** The old 72h approval TTL never *expired* anything — a surfaced lead simply stopped appearing on the client's desk, with no notice to anyone. Against a 100-lead pack that would have silently eaten most of what they'd bought. Removed: they keep every person we send until they pick or pass.

- **No monthly subscriptions.** (The agent family Milla/Vida/Denise is parked; when it returns it prices per-qualified-lead, not $/mo — #431. ⚠️ *Code note: `packages/shared` still carries legacy $49/$29/$39 monthly prices for those parked products; reconcile when #431 builds.*)

---

## 2. WHAT IT COSTS US — per lead (verified live 10 Jul)

*Every rate re-checked against the real provider dashboards + code on the first funded run.*

| Cost line | When | Rate | Basis (verified) |
|---|---|---|---|
| **PDL** — sourcing | at SOURCING (per record pulled) | **$0.28/record** | $98 ÷ 350 (or $280 ÷ 1,000) self-serve tier — confirmed on dashboard |
| **Hunter** — email fallback | at REVEAL, only when PDL misses the email (~30%) | **~$0.011/find → ~$0.003/lead** | Growth £87/mo ÷ 10k finds; code-verified it's a fallback behind PDL's own `work_email` |
| **Claude Haiku** — scoring + ≤10 emails | at WORK | **~$0.05/lead** | code-verified all FIGSY writing runs Haiku, never Opus/Sonnet |
| **Resend** — sends | at WORK | **~$0.009/lead** | ~$0.0009/email × ~10 |
| **Google Calendar** — booking | at WORK | **$0** | free API |
| **Stripe** — payment fee | at CHARGE | **~$0.17/fully-worked lead** | 2.9%+30¢ amortised over a $20 pack = 4.4% |

**Per fully-worked lead ($4 revenue):**
| | |
|---|---|
| COGS pre-fee (PDL 0.28 + Hunter 0.003 + Haiku 0.05 + Resend 0.009) | **~$0.34** |
| + Stripe payment fee | ~$0.17 |
| **COGS all-in** | **~$0.51** |
| **Gross margin** | **~87% all-in** (~91% pre-fee) |

> **The bundle is load-bearing.** Credits are sold in $20/$40/$100 packs, so Stripe's fixed 30¢ amortises to ~4.4%. A per-lead $1 card charge would lose 33¢/dollar to Stripe — **never move billing to per-lead charges.**

> ⚠️ **The one cost that lands BEFORE revenue: PDL sourcing.** Every $0.28 record is spent whether the client reveals it or not. This is fenced (§10) so it can never run unfunded — but the **sourced-vs-revealed ratio is the number to watch**: a client must reveal ≥ 1-in-~3.5 sourced records for the $1 reveals alone to cover their PDL.

---

## 3. PRICING (from `packages/shared/src/constants/index.ts` — the source of truth)

| Product | Pack | Price | Per-lead |
|---|---|---|---|
| **Reveal** (Lead-Gen) | 20 · 40 · 100 | $20 · $40 · $100 | **$1.00** flat |
| **FIGSY work** | 20 · 40 · 100 | $60 · $120 · $300 | **$3.00** flat |

Flat pricing, no volume discounts. **Signup grant (welcome mix, no expiry):** 20 reveal credits + 5 FIGSY credits + a 10-record trial sourcing seed (§10).

---

## 4. UNIT ECONOMICS — reveal-only vs fully-worked

| | Reveal-only ($1) | **Fully-worked ($4)** |
|---|---|---|
| Revenue/lead | $1 | $4 |
| COGS/lead (all-in) | ~$0.30 (PDL + Hunter + Stripe) | ~$0.51 |
| **Margin** | ~50% typical (39% floor) | **~87%** |
| **Profit/lead** | **~$0.50** | **~$3.48** |

**A fully-worked lead makes ~7× the profit of a reveal-only lead** — same sourced record, same client; the only difference is whether they press the $3 button (which costs us ~6¢ to deliver). **Reveals keep us safe; FIGSY makes us rich.** Reveal-only clients are a healthy ~50%-margin data business that structurally can't go negative — but the profit engine is the $3 work charge, which is what onboarding (#447) exists to drive.

---

## 5. FIXED MONTHLY COSTS — NOW and FUTURE

> ### ⚖️ THE RULE: IDLE TOOLS BILL NOTHING (founder, 30 Jul)
>
> This is funded out of the founder's pocket, so **the NOW table is what is actually being spent**, not what the model spends at client scale. **A tool that is not doing work this month bills nothing this month**, and every $0 line carries the trigger that switches it back on:
>
> | Tool | Switches on when |
> |---|---|
> | **Hunter** · **PDL** | a sourcing run happens — they verify and find people, and do nothing between runs |
> | **Smartlead** | a client signs — it exists to send *for clients* |
> | **Failover** (Render + CF LB) | there are clients who would feel an outage |
>
> The earlier ~$457 and ~$423 figures were never wrong about client scale — they were wrong about *today*.

### NOW — pre-first-client

| Service | What it is | Cost/mo |
|---|---|---|
| Railway + Supabase + Cloudflare | Servers, database, DNS/CDN — the product being alive. **Railway $15.59 + Supabase $35, read off the actual invoices 3 Aug.** ⚠️ **THIS ROW SAID ~$138 AND WAS MARKED VERIFIED** — overstated by **$87/mo**, the largest single error in this model, and it survived because a confident tag stops people re-checking. ⚠️ Railway bills by **usage**: $15.59 is the idle rate with no clients. Cloudflare DNS is free tier; the paid Load Balancer is in the failover row. | **~$51** |
| **Instantly — Growth** | **WARMUP UTILITY ONLY** (#577 amended 30 Jul). Vendor-confirmed that warmup runs on mailboxes with *no* Instantly campaigns, including externally-hosted ones. **Not HyperGrowth $97** — that tier's API existed only to let Instantly *send*, and our own engine sends now. Warmup is the single part of their bundle we do not already own. | **~$37** ⚠️ until first invoice |
| Sending domains + mailboxes | For OUR outreach. **⚠️ BUY DIRECT FROM GOOGLE (~$6/box), NOT Instantly's done-for-you boxes.** Our engine sends over SMTP and `sending-inbox.ts` requires `smtp_host`+`smtp_user`+`smtp_pass_enc`; **#577 records in writing that vendor-provisioned mailboxes expose no SMTP credentials**, so a DFY box saves $1 and cannot be sent through at all. 4 boxes + 2 domains ≈ **$25/mo**. | **$0** → ~$25 on purchase |
| Resend | ⏸ **MOVED TO FREE TIER 3 Aug** (was $20 Pro). Transactional volume is near zero with no clients and cold send off. ⚠️ **Ceiling, not a free lunch:** ~3,000 emails/month and **~100/day** — the daily cap bites first when client traffic starts, and it returns to $20 then. | **$0** ⏸ |
| **Zoho Mail** | `hello@get-kind.com` — the human mailbox, website inbound | ~$3 ⚠️ estimate |
| **Domains (GoDaddy)** | `get-kind.com` renewal ÷ 12. Founder confirming renewal prices and killing auto-renew on unused domains. *(GoDaddy renews ~2× Cloudflare Registrar's at-cost pricing — a possible ~$10/yr/domain saving if the transfer hassle is ever worth it.)* | ~$3 ⚠️ estimate |
| **Failover — Render standby + CF Load Balancer** | ⏳ **BEING CANCELLED 30 Jul.** $7 Render `kind-api-standby` + $5 Cloudflare Load Balancer. Zero clients means insurance on an empty house. **⚠️ DNS REPOINT FIRST** — `api.get-kind.com` routes *through* the LB, so deleting it before repointing to Railway takes the live product down (steps: `render-cloudflare-failover.md`). `render.yaml` and the runbook **stay in the repo** — rule 3, and they are the recipe to bring it back. | **~$12** → $0 |
| **Smartlead** | **THE ENGINE — runs every client inbox.** ⏸ **DEFERRED** — not bought until a client is in the works. | **$0** ⏸ |
| **Hunter** | Email verification behind PDL. ⏸ **IDLE = $0** — returns at ~$34 Starter the month a sourcing run happens. *(The old ~$110 was Growth at client scale.)* | **$0** ⏸ |
| **PDL** | Sourcing. ⏸ **IDLE = $0** — the $98 tier must **not** auto-renew in months with no sourcing run. Founder confirming. | **$0** ⏸ |
| **Anthropic** | Claude API at runtime (scoring + writing). **$10 is actual at our-own-volume**; ~$45 was client scale. | ~$10 ⚠️ watch |
| **Apollo — OUR hunting** | **Basic Monthly $65/mo**, 2,500 credits, **0 used**. ⏸ **Founder moved it to the FREE plan from 3 Sep** under cost pressure — August is already paid, so those 2,500 credits are August's prospecting at no further cost. Re-subscribe only with evidence it found clients. ⚠️ Apollo is **OUR** source, never the client stack (PDL + Hunter, locked 30 Jul). | **$0** ⏸ from 3 Sep |
| **Google Workspace — the 4 sending mailboxes** | 4 × Business Starter on `kindoutreach.com` (primary) + `trykind.org` (secondary domain, **same subscription** — one bill). Domains **£20.45 once** at GoDaddy, 3 Aug. ⏳ Google verification ~48h. ⚠️ **MUST BE BOUGHT DIRECT FROM GOOGLE** — see the sending-domains row above for why a done-for-you box cannot be sent through. ⚠️ Each box needs an **App Password**. | **~$28** |
| **PLATFORM FLOOR — NOW** | *(pre-first-client, failover still billing)* | **~$146/mo** |

*Claude Code was **£119.99/mo ≈ $152** and was **downgraded 3 Aug to ~£18 ≈ $23** — the current plan runs to **20 Aug**, then the lower rate applies. The heavy build phase is done; what remains is small edits and walking setup screens. Upgrade for a month if a heavy build returns — it is fully reversible. It is the founder's **build tool, not product infrastructure**, so it sits outside the platform floor: the product does not need it to run for a client, only to be built. **All-in out of pocket: ~$470/mo before the 3 Aug cuts → ~$157/mo after.***

### FUTURE — first client onward

| Line | Adds | Trigger |
|---|---|---|
| Everything in NOW | ~$223 | — |
| **Smartlead** main account | +$94 | a client signs |
| **Hunter** Starter | +$34 | first sourcing run |
| **PDL** tier | +$98 | first sourcing run |
| **Anthropic** at client volume | +~$30 | scales with leads worked |
| Instantly mailboxes (once purchased) | +~$23 | on purchase |
| **PLATFORM FLOOR — FUTURE** | **~$490/mo** | |
| *Client's own inbox* | *+$8 per client/month* | **paid out of THEIR $299** — never speculative. ⚠️ **This row said +$40**, an unconfirmed guess at a Smartlead workspace fee; the real ongoing cost is their own Google box ($7) + domain (~$1). The **$45 pre-warmed box is month ONE only** and transitions away at ~day 21–29 |

**~$490 is covered at ~4 clients** averaging 50 approvals a month (~$121 contribution each). The failover is deliberately **not** added back at one client — it returns when an outage would cost real revenue.

### THE FUEL — separate from the rent

The floors above are **rent**: what runs whether or not we are hunting. Finding clients costs **fuel** on top, and it is priced per thousand prospects contacted rather than per month:

| Per 1,000 prospects (≈3,000 emails, a 3-step sequence) | Cost |
|---|---|
| Sourcing — **Apollo** (free 900/yr → Basic **billed MONTHLY** ~$59; the $49 rate is annual-upfront $588 and waits until the channel proves) | ~$49–59 |
| Verification — pay-as-you-go (~$8/1,000), **not** a Hunter subscription | ~$8 |
| AI writing + scoring — Anthropic at $0.07/lead | ~$70 |
| Sending — **our own engine**, through our own mailboxes | **$0** |
| **Total fuel per 1,000 prospects** | **~$127–137** |

**Rate of burn:** 4 warm mailboxes send ~100 emails/day, so 1,000 prospects takes **~6 weeks** — roughly **$85/month** while hunting, not a lump sum.

**Payback:** industry cold-outbound benchmarks put 1,000 contacted prospects at **≈1 client** conservatively (1% positive reply → ~10 meetings → ~7 demos → ~15–20% close). One client is worth **$99 + ~$121/month**. **The acquisition maths works even at the pessimistic end** — and Apollo rather than PDL is what makes it work: the same 1,000 names on PDL would be **$280**, turning ~$130 of fuel into ~$384. **PDL and Hunter remain the client-facing stack; Apollo is for our own hunting only** — the exact mirror of *Instantly for us, Smartlead for clients*.

**Scales with the work, NOT fixed:**

| Line | Amount |
|---|---|
| Per client, per month — their inbox + workspace | **~$40** ⚠️ confirm the workspace fee with Smartlead. **$0 today** — deferred with Smartlead until the first client. |
| Per client, once — setup (a warmed inbox from our pool) | ~$45 · a raw inbox is ~$9 + 2 weeks warming |
| PDL — per name sourced | **$0.28** (`PDL_RATE_USD`) |
| PDL — monthly plan floor | **$98** buys ~350 names. Billed as `max(tier, names × $0.28)` — a floor, not an extra |
| Names sourced per approval | **2** (flow v2). ⚠️ #415 measured nearer **7** — Vida now measures it live; do not change this without the data |
| Working one lead | $0.07 (`REVEAL_MARGINAL_COST_USD` $0.01 + `WORK_MARGINAL_COST_USD` $0.06) |
| Stripe | ~3.5% of every dollar in |

- **Claude Code** (building the product) ~$150/mo — **separate; a build investment, not an operating cost.**
- **PDL is a bought tier**, so it is modelled as a floor rather than double-counted as both a fixed line and a per-name cost.

> **Correction history.** Earlier versions carried **$138**, then **$203**, then **~$175–190**. Every one of them left out **Smartlead (~$94 — the product's deliverability foundation, running every client inbox), Instantly (~$37), Zoho Mail (~$3 — the very tool `TECH-STACK.md` calls out as "the one that went missing") and the Anthropic runtime.** The honest floor was **~$457**, became **~$423** with the Instantly-first decision, and is **~$223** today under the idle-tools rule plus the Client Zero architecture lock — rising to ~$490 at the first client. The lines marked ⚠️ are estimates until the real invoices are read; the interactive model at `docs/CASHFLOW-LAB.html` makes every one of them an editable box for exactly that reason.

---

## 6. BREAK-EVEN (rebuilt 26 Jul on the real floor)

**The floor on a client, before any share of the platform.** Their inbox costs us ~$40/month from the day they sign. At $4 a lead, minus Stripe, working, and 2 names of sourcing, each approval nets ~$3.24 — so:

> **A client must approve ~13 leads a month just to pay for their own inbox.** Below that they cost us money and **no amount of scale fixes it** — every extra client makes us poorer. This is why the **minimum-20 gate** and the **30-day cold suspension** exist.

**Break-even on the whole business**, at an average of 50 approvals per client per month (~$121 contribution each):

| To cover… | Fixed | Clients needed |
|---|---|---|
| Platform floor — **NOW** *(pre-first-client)* | ~$223 | **~2 clients** |
| Platform floor — **FUTURE** *(first client onward)* | ~$490 | **~4 clients** |
| + Claude Code dev (**£119.99 ≈ $152**) | ~$642 | **~6 clients** |

**Their first month now pays for itself — that is what the 3-Aug price move bought.** The $299 pack costs us ~$56 sourcing (200 names) + ~$7 working + ~$10.50 Stripe + $45 pre-warmed inbox (month one only) + ~$15 their own domain and box ≈ **$134 — so month one clears about +$165**, enough to cover the ~$143 acquisition too. **Under the old $99 it ran at about −$52**, and the founder carried that loss outright whenever a client left after month one. Month two onward contributes ~$153 at 50 approvals. **The repeat is still the business; the pack is now a door that pays for itself.**

> Interactive version, with every line editable: **`docs/CASHFLOW-LAB.html`**.

---
---|---|
| Core floor (no PDL tier, no dev) | ~$190 | **~3 clients** |
| + entry PDL tier ($98) | ~$288 | **~4 clients** |
| + Claude Code dev ($150) | ~$438 | **~6 clients** |

> **Break-even is ~3–4 paying clients for the operating stack (≈$4 more expensive than the old "2 clients" claim, which understated fixed cost). ~6 clients also covers the dev tool.** Above that, every client is ~87% margin — the fixed stack barely moves from 5 to 50 clients.

---

## 7. CAC — what it costs US to get a client

*Channels are alternatives per client — don't sum. Funnel = §8.*

| Channel | Cash CAC | Founder time | Made of |
|---|---|---|---|
| **① FIGSY cold outbound** (dogfood — the machine sells itself) | **~$68** | ~3–4 h (~5 demos) | 200 records × $0.28 = $56 · Haiku+sends ~$12 |
| **② Inbound self-serve trial** | **~$18** | ~0 h | trial COGS ≤ ~$6 (fenced) × ~3 trials/conversion |
| **③ Agency partner** | **~$0 upfront** | relationship time | 20%+5% revenue-share on collected; 1 partner ≈ 10 clients |

- **Payback is inside month 1** on every channel (a $80/mo client returns ~$70/mo).
- **The pool (§10) drops ① toward ~$25–40** once sourced records are reused across clients.
- **The real constraint is founder hours, not cash** — which is why partners (§9) are the scale lever.

---

## 7B. THE FOUNDER FUNNEL — 1 paid client a week, by hand

*You selling, not FIGSY. Rates: 20–25% of demos close · ~25% of booked demos no-show · cold-email reply 2–3% (§8). ⚠️ All planning numbers — this funnel IS how they get measured.*

**The chain:** 1 client ← **5 demos held** ← 7 booked ← the outreach below. **The weekly quota is 5 demos held. That's the whole game.**

| If you ONLY used this channel | Rate | For 5 demos/week |
|---|---|---|
| **Warm intros / network** | ~half of asks take a demo | **~10 asks** |
| **LinkedIn DMs** | ~1 demo per 20–25 sent | **~100–125 DMs** |
| **Cold email** (manual, ≤30/day off the main domain) | 2–3% reply → demo | **~200–300 emails** |

**The blended week (~15 h):** 6 warm asks + 75 LinkedIn DMs + 150 cold emails → **~6–7 demos → ~1.2 clients/week.**

**Scoreboard — track only these 4, weekly:** outreach sent · positive replies · demos held · closes. After 2–3 weeks the real rates replace the guesses. If demos aren't closing, fix the demo or the offer — not the volume.

---

## 8. THE DOGFOOD UNIT MODEL (what 1 client via our own product actually is)

| Funnel stage | Rate | Count |
|---|---|---|
| Leads sourced (PDL) | — | **200** |
| → emailable | ~92% | ~185 |
| → reply (cold 6-step, young domain) | **2–3%** | ~4–6 |
| → demo | most replies | ~5 |
| → **paying client** | **~20% of replies** | **1** |

**Win rate ≈ 0.4–0.6% of sourced leads → 1 client per ~170–250 leads.** Internal cost **~$68 + 3–4 founder hours.**

⚠️ **The 2–3% reply rate and the 6-month lifetime below are PLANNING numbers — we have zero measured history.** SPRINT line 9 (FIGSY runs our own outreach) is the **calibration run** that makes them real.

### 1 conservative client returns (~$80/mo · ~87% margin)
| Timeline | Revenue | Profit | vs $68 CAC |
|---|---|---|---|
| Month 1 | $80 | ~$70 | **paid back** |
| 6 months *(a guess until real data)* | $480 | ~$418 | **~6×** |
| 12 months | $960 | ~$835 | ~12× |

**LTV:CAC ≈ 6:1 conservative** (3:1 is the healthy benchmark). ⚠️ **Floor case is real:** a one-$20-pack-and-vanish client = **−$51 vs CAC** — there is no contract, revenue is usage, so **usage IS retention.** Onboarding + FIGSY actually delivering replies is the retention mechanism, not a nice-to-have.

### The first 5–10 clients (depth-first — founder-locked: "5–10 GOOD clients over volume")
*PDL counted as the bought tier (no double-count); variable = ~$0.23/fully-worked lead ex-PDL.*

| | 5 clients | 10 clients |
|---|---|---|
| Revenue /mo (~$80 each) | $400 | $800 |
| Variable COGS (ex-PDL, ~$0.23/lead) | −$23 | −$46 |
| Core fixed + failover | −$190 | −$190 |
| PDL tier | −$98 ($98/350) | −$280 ($280/1,000) |
| **Net /mo** | **≈ +$89** | **≈ +$284** |

**5–10 conservative clients = the machine pays for itself, not yet the founder.** What they really buy: **proof** (real reply/retention numbers + case studies for partners), **calibration** (true LTV), and **pool seeds**. The lever is **spend-per-client, not logo count** — the same 10 clients at the **$160 Growth blend ≈ +$930/mo net**; at $400/mo ≈ +$3,000. Growing a retained client is ~87%-margin revenue at ~$0 CAC.

> **The plan in one line:** land 5–10 GOOD clients (~$340–680 + partner intros) → retain by making FIGSY perform → grow them $80 → $160+ → ~$1k/mo net on ten logos + proof in hand → then 3–5 STRONG partners scale it without touching the cost base.

---

## 8B. THREE-SCENARIO CASHFLOW ENVELOPE — Conservative · Middle · Higher

The rest of this doc uses **one** client shape (~$80/mo). Reality is a **range**. Here's the same business run three ways — cautious · expected · optimistic — all on **one blended product**, so you see the floor and the ceiling, not a single guess. **Same 10 logos, same fixed stack — only client behaviour changes.**

### What "blended product" means
No client buys pure $1 reveals *or* pure $4 fully-worked leads — they buy a **MIX**. Two dials set it:
- **Volume** — how many leads they reveal per month (each costs them **$1**).
- **Work-attach** — of those revealed, what % they let FIGSY work (**+$3 → $4** all-in).

> **Blended $/lead = $1 + ($3 × attach%)** · **Blended $/client = revealed leads × blended $/lead.** That single blended number is what flows through the cashflow below.

### The three blends (the dials → the product)
| Dial | 🟦 Conservative | 🟩 Middle *(expected)* | 🟪 Higher |
|---|---|---|---|
| Revealed leads / client / mo | 20 | 45 | 100 |
| Work-attach (reveal → $3) | 60% | 78% | 90% |
| → worked leads ($4 each) | 12 | 35 | 90 |
| → reveal-only ($1 each) | 8 | 10 | 10 |
| **Blended $/lead** | **$2.80** | **$3.34** | **$3.70** |
| **Blended $/client / mo** | **~$56** | **~$150** | **~$370** |

### The cashflow envelope — at the 10-client depth point (§8's anchor)
*PDL counted as the bought tier (no double-count); variable ex-PDL ≈ $0.23/worked lead + ~$0.05/reveal-only (Hunter + Stripe, amortised on packs).*

| /mo, 10 clients | 🟦 Conservative | 🟩 Middle *(expected)* | 🟪 Higher |
|---|---|---|---|
| Revenue | $560 | $1,500 | $3,700 |
| − Variable COGS (ex-PDL) | −$32 | −$86 | −$212 |
| − Core fixed + failover (§5) | −$190 | −$190 | −$190 |
| − PDL tier (§5) | −$98 | −$280 | −$560 |
| **NET / mo** | **≈ +$240** | **≈ +$945** | **≈ +$2,740** |
| Margin on revenue | ~43% | ~63% | ~74% |

**Every scenario is net-positive at 10 clients.** The floor (Conservative) still clears **~$240/mo**; the expected case (Middle) clears **~$945**; a power-user book (Higher) clears **~$2,740** — on the *same ten logos and the same fixed stack.* The only thing that moved is how hard each client used FIGSY.

### LTV per scenario (per single retained client)
*⚠️ 6-month lifetime is a PLANNING guess until line-9 calibration — see §8. CAC ≈ $68 (§7).*

| Per retained client | 🟦 Conservative | 🟩 Middle | 🟪 Higher |
|---|---|---|---|
| Contribution / mo (rev − variable) | ~$51 | ~$138 | ~$345 |
| Payback vs $68 CAC | ~1.3 mo | <1 mo | immediate |
| 6-mo LTV | ~$306 | ~$828 | ~$2,070 |
| **LTV : CAC** | **~4.5 : 1** | **~12 : 1** | **~30 : 1** |

All three beat the healthy **3:1** benchmark — even the cautious floor.

### How to read this
- **🟩 Middle (~$150/client, +$945/mo at ten) is the new expected planning case.** The lone **"$80 conservative client"** used in §6/§8 sits **between Conservative and Middle** — treat those $80-based figures as a **cautious-mid floor**, and Middle as the number to plan against going forward.
- **🟦 Conservative is the safety net** — if attach and volume both stay low, the machine *still* pays for itself at 10 clients (+$240/mo). It structurally can't go negative once the fences (§10) hold.
- **🟪 Higher is the shape once retained clients grow.** You won't land many power-users on day 1 — you *grow into* this by making FIGSY perform so clients push the $3 button more often. Moving the book from Middle → Higher is **~$0-CAC, ~74%-margin** revenue.
- **The three levers that decide which line you land on are unchanged (§11):** ① FIGSY reply-rate (line 9) · ② spend-per-client — *which is exactly the Conservative→Higher axis* · ③ partners. **The pool (§10) lifts all three nets over time** as PDL cost/record collapses toward pennies.

> **One line:** the floor is profitable, the expected case funds the founder conversation at ten logos, and the ceiling is a ~74%-margin machine — all on the same cost base. The work is moving clients *up the blend*, not adding logos.

---

## 9. GROWTH SHAPE (illustrative — re-based to Month-0 = first paying client)

*NOT a dated forecast (the old May–Dec tables are retired — see §12). This is the shape once the machine is calibrated. "Month-N" counts from the first paying client, whenever the sprint delivers it.*

| Stage | Clients | ~Revenue/mo | ~Net/mo | What it means |
|---|---|---|---|---|
| **First client** | 1 | $80 | −$110 | proof of the loop; below break-even by design |
| **Break-even** | 3–4 | $240–320 | ~$0 | the stack pays for itself |
| **First-10 depth** | 10 | $800 | ~+$284 | proof + calibration + pool seeds |
| **10 at Growth blend** | 10 | $1,600 | ~+$930 | founder salary conversation begins |
| **Partner-scaled** | 30–50 | $2.4k–4k ($80) · $4.8k–8k ($160) | 75%+ margin | 3–5 strong partners, ~$0 cash CAC |

**The three levers that decide which line you land on:** ① FIGSY reply-rate (calibrated line 9) · ② spend-per-client ($80 → $160+) · ③ partners (1 strong ≈ 10 clients). Cost is not the constraint — logos and retention are.

---

## 10. THE MONEY FENCES — sourcing can never run unfunded (LIVE, battle-proven)

Every PDL dollar is **pre-funded by cash already collected** (`20260711_sourcing_fences.sql`, live in prod):
- **Coverage k=2** — a paid client's sourcing allowance grows by 2 records per $1 collected, accrued **only at the payment webhook** (never at spend → no double-count).
- **Trial pool** — 10 records seeded at signup + 2 per reveal, **hard-capped at 20 lifetime** → **≤$5.60 max exposure per free signup, once ever.**
- **Global ceiling** — admin-editable **$300/mo** platform-wide PDL budget; alert at 80%, hard pause at 100%.
- **Daily cap** — 100 records/client/day.
- **Enforced** by the atomic fail-closed `try_spend_sourcing` RPC; **proven** on the first live run (granted 10 → PDL empty → auto-refunded, $0 lost).

**No client mix — free, paid, malicious, 1 or 1,000 — can make us net-negative on data.** FIGSY's $3 is unaffected (only enrols revealed leads → no data cost).

**THE POOL (#449, building — founder-ruled build-now):** every purchased record lands in a shared `lead_pool`; ICP runs serve pool matches at **$0 marginal** and buy only the remainder. Charge-once is per-(client,email), so one $0.28 record earns $1 from **every** client who reveals it → at scale, effective $/record collapses toward pennies and sourced data becomes owned inventory with a per-record P&L. *(PDL commercial-tier alignment deferred until revenue — Apollo-reseller precedent.)*

---

## 11. KEY RISKS & LEVERS

| Risk | Impact | Mitigation |
|---|---|---|
| PDL exhausted / sourcing down | zero leads = zero revenue | fences + **line-11 multi-engine widening** (Apollo/Cognism/aggregator) so no single vendor can zero us |
| Reply rate below plan (2–3% unproven) | CAC balloons, funnel stalls | line-9 calibration measures it before we scale spend |
| Client churns after one pack | −$51 vs CAC | usage = retention → onboarding (#447) + FIGSY delivering replies |
| Deliverability (young domain) | sends land in spam | warm domain before volume; ≤30 sends/inbox/day |
| Founder hours (not cash) | caps client count | partners (3–5 strong) buy hours back |

**The 3 levers:** FIGSY reply-rate · spend-per-client · partner channel. Margin is already solved (~87%); the work is logos + retention.

---

## 12. ARCHIVED (retired — do not use)

Superseded by this rebuild; kept only in git history (`git log docs/run-costs-and-cashflow.md`):
- **May–Dec 2026 month-by-month scenario tables** — anchored to a launch date we missed; re-based to §9.
- **"$138 / $203 fixed stack"** — understated; corrected to §5 (~$175–190 core).
- **"$1/client data cost"** and **~91%-only margin** — Apollo-era; corrected to §2 (~$0.51/lead all-in, ~87%).
- **Apollo data-sourcing strategy (old §13)** — Apollo retired from the data path; PDL+Hunter is the stack, multi-engine widening is line 11.
- **Milla/Vida/Denise monthly subscription pricing** — replaced by the per-qualified-lead model (#431, parked).
