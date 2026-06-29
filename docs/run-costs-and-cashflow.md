# K.I.N.D — Run Costs & Cashflow Model
`Last-checked: 22 Jun 2026`

> ### 🟢 22 JUN STATUS UPDATE (read before the body — the model below is sound; this corrects its framing)
> - **🚀 LAUNCHED 18 Jun** — the doc body is written pre-launch ("gate Fri-19" etc.); treat those as historical. The economics (margins, ARPU, break-even, scenarios) are **still valid**.
> - **💵 Currency = USD (locked 22 Jun, "we are USD").** Ignore the ZAR/£ columns — they're illustrative only; we **bill USD**. UK Ltd files GBP to HMRC (accounting platform decision = item 196, open).
> - **✅ Billing items 166–171 are LIVE** (one-charge-one-wallet, separate pools, Denise $39, atomic credits). Every "fix Tue 16 / double-charge to remove" note below is **DONE** — read it as resolved history.
> - **👥 5 agents now** (FIGSY · Milla · Vida · Denise · **Casey** onboarding). The "4-agent" framing is pre-Casey; Casey isn't a paid SKU (onboarding), so the paid line-up + economics are unchanged.
> - **Cross-refs:** the finance *system* (sales ledger, accounting, VAT) lives in item **196**; salary/hiring economics in `SALARY-BREAKEVEN-PLAN.md` (USD) + `docs/hiring/`. **Update-when:** pricing · stack · ARPU · launch/billing status changes.

*Prior header — Last updated **16 June 2026**: prices reconciled to the LOCKED `@kind/shared` constants — **Lead Gen $20/$40/$100, FIGSY $60/$120/$300, flat $1/$3**; Denise $39. Plus §12 $1M goal (math fixed), §13 Apollo strategy, §14 onboarding/segmentation.*
*🔍 **AUDIT FIXES (10 Jun, founder-flagged):** email = **Zoho Mail** (was wrongly "Google Workspace"); **2 domains** now listed (`get-kind.com` + `gettingkind.com`, was 1); **3 agent subscriptions added to §3** (Vida $29 · Milla $49 · Denise $99 + Milla+Vida $69 bundle — previously only the 2 credit products were listed). Also fixed in code/docs (10 Jun sweep): `routes/mcp.ts` + `routes/team.ts` wrong domain `*.kindai.co.za` → `*.get-kind.com`; the admin **"Launch" checklist** rewritten (Google Workspace → **Zoho**, Paystack → **Stripe + Flutterwave**, `privacy@kind.ai` → `privacy@get-kind.com`); `DEPLOYMENT_GUIDE.md` Step 7 → Zoho. **All stale email/domain/processor references now corrected across code + docs.***

> ### 🧭 READ FIRST — the lay of the land (10 Jun)
> **The model is ~95% gross margin and stays there.** Costs are almost entirely *fixed* (infra ~$140/mo) + a *tiny* variable (data + AI per lead). Revenue scales ~linearly with clients/seats while costs stay near-flat → margin climbs toward 95%+ after a handful of clients. **The whole game is revenue growth, not cost control.**
> **Two things can dent margin at scale, both manageable:** ① **Apollo data** (the only real variable cost — and the structural fix, "clients bring their own key", drives it toward **$0** while solving the ToS — see §5d); ② **payment processing** (~2.9% Stripe / ~3.8% Flutterwave — the largest %-of-revenue cost at scale).
> **The biggest GROWTH lever is the per-rep company engine (#88):** a 10-seat company is ~10× a single-seat client at almost the same cost-to-serve. **Stale-figure note:** older sections (§7/§10/§11) still say "Paystack" — actual processors are **Stripe (global) + Flutterwave (Africa)**; and the "$80 ARPU" is *single-seat* — the per-rep model multiplies it.

---

## 1. Tech Stack — Fixed Monthly Costs

These run whether you have zero clients or one hundred. **Hosting is Railway only — there is no Vercel.** Billing is Stripe (no fixed fee — see §2).

### Group A — Upgrade NOW (launch floor)
| Service | What it does | Plan | Cost/mo |
|---|---|---|---|
| Supabase | Database, auth, file storage **+ daily backups** (Free plan has NO backups) | Pro (af-south-1 Cape Town / POPIA) | $25 |
| Railway | Hosts API + portal + admin + website (all 4 services) | Pro + usage | ~$20 |
| Resend | FIGSY + transactional email — Free caps at 100/day, hits day 1 | Pro | $20 |
| Apollo.io | Lead data source — Free plan blocks the API entirely (zero leads) | Basic ($49) · Pro recommended ($99) | $49–99 |
| **Group A subtotal** | | | **~$114–164/mo** |

### Group B — Soon (first weeks / before real volume)
| Service | What it does | Plan | Cost/mo |
|---|---|---|---|
| **Zoho Mail** | Business email on `@get-kind.com` (**we use Zoho, NOT Google Workspace** — corrected 10 Jun) | Mail Lite / free tier | **~$0–4** |
| Render | API warm standby (crash failover) | Starter | $7 |
| Cloudflare | Load balancer → routes to standby on outage | LB Basic | $5 |
| **2 domains** | **`get-kind.com`** (transactional) + **`gettingkind.com`** (cold sending) | ~$15/yr each | **~$2.50** |
| **Group B subtotal** | | | **~$14–19/mo** |

### Group C — Development
| Service | What it does | Plan | Cost/mo |
|---|---|---|---|
| Claude Code | AI-assisted development of the entire platform | Max | $100–200 |

| **Total** | | |
|---|---|---|
| **Launch floor (Group A only)** | | **~$114/mo** |
| **Launch + email + failover (A + B)** | | **~$139/mo** |
| **All-in incl. Claude Code dev** | | **~$239–395/mo** |

> ### ⚙️ THE ENGINE — new cost line (item 211, decided 23 Jun)
> The deliverability/sending engine (Smartlead) is the product's foundation and a **new, scaling** cost: **~$94/mo (Smartlead Pro API)** + **~$5/mailbox/mo** + **~$29/mo per client (white-label)**.
> - **Managed (SMB):** K.I.N.D carries the mailbox cost (~$5/mailbox; ~10 inboxes per ~350 sends/day) and **marks it up** — it's a billable input, not just overhead.
> - **Connect-your-own (mid/enterprise):** the **client carries their own mailbox cost → near-zero to K.I.N.D.**
> Net: the engine adds a low-hundreds/mo base + a small per-client variable that's largely **passed through / marked up**. Full spec: V2-TRACKER "⚙️ THE ENGINE".

> ⚠️ **Apollo free plan = $0/mo but API access is fully blocked.** The `/mixed_people/search` endpoint requires at minimum the Basic plan ($49/mo). The platform cannot find a single lead without this. Upgrade at app.apollo.io → Settings → Plan & Billing.
> ⚠️ **Supabase Free plan has NO database backups** (confirmed 3 June). One bad query = total data loss. Pro is non-negotiable before onboarding paying clients.
> ℹ️ **Stripe has no fixed monthly cost** — it charges per transaction (~2.9% + 30¢). "Going live" = switch from test to live keys + add price IDs. See §2.

**Apollo plan guide:**
- Basic: $49/mo — API access unlocked, ~9,600 credits/mo — sufficient for first 10 clients
- Professional: $99/mo — 24,000 credits/mo (~14,000 delivered leads) — recommended from day 1
- Organization: $149/mo — 48,000 credits/mo — when you hit ~50 active clients

**Claude Code plans:**
- Pro: $20/mo — sufficient for light usage
- Max (5×): $100/mo — recommended for active development
- Max (20×): $200/mo — heavy daily builds like the current phase

---

## 2. Variable Costs (scale with usage)

| Cost | Rate | Notes |
|---|---|---|
| Apollo — cost per delivered lead | ~$0.008 | 24,000 credits ÷ ~60% yield |
| Anthropic (Claude) — lead scoring | ~$0.0004/lead | Claude Haiku |
| Anthropic (Claude) — FIGSY email generation | ~$0.01–0.02/email | Claude Haiku |
| Stripe — payment processing | ~2.9% + 30¢ per transaction | Cost of revenue, not a fixed fee. Free until money flows. |

**Total variable cost per delivered lead: ~$0.009** (sub-cent at any volume)

---

## 3. Pricing Model

**All pricing is locked. Never changed. Never increased or decreased.**

### Credit Bundles (LOCKED model — source of truth: `packages/shared/src/constants/index.ts`)
*Flat pricing: **Lead Gen $1/credit · FIGSY $3/credit — no volume discounts** (annual plans only). Founder-confirmed 16 Jun as the reconciliation target for item 168.*

| Product | Credits | Price USD | Price ZAR | Per-lead |
|---|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 | $1.00 |
| K.I.N.D AI — Lead Gen Pro | 40 | $40 | R760 | $1.00 |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 | $1.00 |
| FIGSY Advanced | 20 | $60 | R1,140 | $3.00 |
| FIGSY Advanced | 40 | $120 | R2,280 | $3.00 |
| FIGSY Advanced | 100 | $300 | R5,700 | $3.00 |

**🚨 PRICE-TABLE BUG (item 168) — three tables disagree, fix Tue 16:**
- 🔒 **LOCKED constants** (`@kind/shared`): Lead Gen $20/$40/$100 · FIGSY $60/$120/$300 ← **the target (this table)**
- ❌ **Stripe** (`stripe.ts`): Lead Gen $20/$38/$88 · FIGSY $60/$110/$250 ← discounted values, **recreate to match locked**
- ❌ **Portal UI** (`billing/page.tsx`, `company/page.tsx`): FIGSY shown $20/$40/$100 ← wrong, **import `@kind/shared`**

→ Lead Gen = **$1/lead flat** · FIGSY Advanced = **$3/lead flat** (separate products — no double-charge after item 166).

### Agent Subscriptions — monthly (added to doc 10 Jun · live in Stripe)
*The doc previously listed only the two credit products. These three monthly agents are also live (`STRIPE_PRICE_VIDA/MILLA/DENISE_MONTHLY`).*

| Product | Price USD/mo | What it is |
|---|---|---|
| **Vida** (The Connector) | **$29** | Website + WhatsApp chatbot — converts inbound 24/7 |
| **Milla** (The Brain) | **$49** | Intelligence, document drafting, knowledge Q&A |
| **Milla + Vida bundle** | **$69** | (save $9/mo) |
| **Denise** (The Closer) | **$39** | Warm follow-ups, proposals, confirms meetings *(corrected 16 Jun from $99 display)* |

**Phase 2 billing evolution:** Credit bundles → recurring monthly subscription model once value is proven.

---

## 4. Unit Economics Per Lead (flat pricing)

*Pricing is **flat** — $1/lead Lead Gen, $3/lead FIGSY, at every bundle size. No volume discounts. So the per-lead economics are the same whether a client buys 20 or 100 credits.*

### 4a. Lead Gen Pro — per lead
| | Amount |
|---|---|
| You charge per lead (flat, all bundles) | **$1.00** |
| Apollo delivery/verification | ~$0.008 |
| Scoring (Claude Haiku) | ~$0.0004 |
| **Variable cost** | **~$0.008** |
| **Gross margin per lead** | **~$0.99 (99%)** |

### 4b. FIGSY Advanced — per lead
| | Amount |
|---|---|
| You charge per lead (flat, all bundles) | **$3.00** |
| Apollo lead cost | ~$0.008 |
| Claude Haiku 3-email generation | ~$0.012 |
| Claude scoring | ~$0.0004 |
| Resend send | ~negligible |
| **Variable cost** | **~$0.024** |
| **Gross margin per lead** | **~$2.98 (99%)** |

### 4c. The Double-Charge Bug (item 166 — fix Tue 16)
**Bug:** a client running FIGSY is charged BOTH — lead-gen $1 on delivery (`lead-delivery.ts:64`) AND FIGSY $3 on enrolment (`figsy.ts:907-921`) on the same lead = **$4/lead**; the deck promises **$3 all-in**.

**Fix:** Lead Gen and FIGSY are separate products charged from separate pools (item 169 `clients.plan`). Client chooses:
- Lead Gen **only** → **$1/lead** (pure lead delivery, no outreach)
- FIGSY **only** → **$3/lead** (FIGSY finds, qualifies, emails — one pool, item 167)
- **Both** → each pool charged once, never stacked on the same lead.

### 4d. What a customer actually pays (flat)
| Scenario | What they buy | Cost | What they get |
|---|---|---|---|
| **Starter** | Lead Gen 20 | $20 | 20 leads ($1 each) |
| **Lead Gen heavy** | Lead Gen 100 | $100 | 100 leads ($1 each) |
| **FIGSY entry** | FIGSY 20 | $60 | 20 enrolled ($3 each) |
| **FIGSY heavy** | FIGSY 100 | $300 | 100 enrolled ($3 each) |
| **Growth blend** | Lead Gen 100 + FIGSY 20 | $160 | 100 leads + 20 FIGSY |
| **Scale blend** | Lead Gen 100 + FIGSY 100 | $400 | 100 leads + 100 FIGSY |

---

## 5. Unit Economics Summary

| | Lead Gen | FIGSY |
|---|---|---|
| Charge per lead | $1.00 | $3.00 |
| Variable cost | ~$0.008 | ~$0.024 |
| **Gross margin per lead** | **~99%** | **~99%** |

The data cost is negligible. Your real cost is the fixed stack (~$138/mo) spread across all clients and all their leads.

---

## 5a. ARPU Assumptions (flat pricing, 16 Jun)

| Client Type | Monthly Spend (USD) | Profile |
|---|---|---|
| Starter | $20 | Lead Gen 20 credits only |
| Growth | $160 | Lead Gen 100 ($100) + FIGSY 20 ($60) |
| Growth+ | $199 | Lead Gen 100 + FIGSY 20 + Denise ($39) |
| Scale | $400 | Lead Gen 100 ($100) + FIGSY 100 ($300) |
| Scale+ | $439 | Lead Gen 100 + FIGSY 100 + Denise ($39) |
| **Blended ARPU** | **~$80** | Mixed client base, conservative (50% starter, 30% growth, 20% scale) |

The difference between conservative and optimistic scenarios is primarily ARPU. If the average client spends $160 (Growth) instead of $80 blended, all MRR figures roughly double. Denise upsell ($39) is the highest-lever add-on after first leads land.

---

## 5b. UPDATED CASHFLOW & SALES TARGETS — ACTUAL COSTS (16 Jun corrected)
*Rebuilt on the real locked-in stack, replacing the old $203 / Paystack assumptions. This is the version to set sales targets against.*

### Locked monthly costs (actuals)
| Line | Cost/mo |
|---|---|
| Supabase Pro | $25.00 |
| Railway Pro (+usage) | ~$20.00 |
| Resend Pro | $15.46 |
| Apollo Basic | $65.00 |
| **Operating floor (live now)** | **~$125/mo** |
| + Render standby $7 + Cloudflare LB $5 + domain $1.25 (failover, soon) | +$13 |
| **Operating floor + failover** | **~$138/mo** |
| Claude Code (build investment, separate) | $100–200 |
| Stripe processing | NOT fixed — ~2.9% + $0.30 per transaction |

### Contribution per client (flat pricing)
At **$80 blended ARPU**: Stripe takes ~$2.62 (2.9% + 30¢) + ~$1 data (Apollo+Anthropic) → **net ~$76/client/mo**.
At **$160 ARPU** (Growth profile): net ~$154/client/mo.
At **$199 ARPU** (Growth+ w/ Denise): net ~$192/client/mo.

### 🎯 SALES TARGET LADDER — the numbers to hit (flat pricing)
*Clients needed to clear each milestone. Three columns: blended ARPU ($80, conservative), Growth ($160), Growth+ w/ Denise ($199).*

| Milestone | What it means | @ $80 ARPU | @ $160 ARPU | @ $199 ARPU |
|---|---|---|---|---|
| **Break-even (infra only)** | Stack pays for itself | **2** | **1** | **1** |
| **Break-even (infra + failover)** | Resilient + self-funding | **2** | **1** | **1** |
| **Break-even (incl. Claude Code dev)** | Whole operation self-funding | **5** | **3** | **2** |
| **$1,000 MRR** | Comfortable; reinvest | **13** | **7** | **5** |
| **$5,000 MRR** | Founder salary begins | **63** | **31** | **25** |
| **$10,000 MRR** | First hire possible | **125** | **63** | **51** |
| **$25,000 MRR** | Series A conversations | **313** | **157** | **126** |

### 🎯 Your funnel targets — REALISTIC (cold, 6-step sequence, 2–3% reply)
*Base: **40% trial→paid → ~2.5 trials/client**. Reply→trial ~50%. So **prospects/client = 5 ÷ reply-rate.** ⚠️ The old "~60 touches @ 8%" assumed an **unvalidated 8% reply** (see `sales-playbook.md` — never measured). Plan on **2–3%** on a young cold domain. Sequence moves to **6 steps** (was 3) to capture slow responders — **requires a FIGSY product change (currently 3-step Day 0/4/9 — tracked as item 212).***

| Reply rate | Prospects / client | **5–6 clients/mo (goal)** | Sends/mo (6-step, ~5 ea) | ~Sends/day | Warmed mailboxes (~40/day) |
|---|---|---|---|---|---|
| **3%** (target) | ~167 | **~835–1,000** | ~4,200–5,000 | ~190–225 | **~5–6** |
| **2%** (conservative) | ~250 | **~1,250–1,500** | ~6,250–7,500 | ~285–340 | **~7–9** |
| *(8% — optimistic, unvalidated)* | ~60 | ~300–360 | ~1,500–1,800 | ~50–60 | ~2 |

**The conversion chain — per 1 client** *(rates: reply→trial ~50% · trial→paid 40%)*:
> **~167 prospects** (at 3%) → **~5 interested replies** → **~5 demos/meetings** → **~2.5 trials** → **1 paid client.**
> Per-client rates are **fixed** (~5 replies · ~2.5 trials · 1 client); only the **prospect count** moves with reply rate (~167 at 3% · ~250 at 2%). A *"demo"* = the meeting that turns an interested reply into a trial.

**To reach the 5–6 clients/month goal:** **~13–15 trials · ~25–30 demos/meetings · ~835–1,500 prospects** (3%→2%) · **~5–9 warmed mailboxes.** **Shortcut → 1 agency partner ≈ 10 clients/month** (bypasses the cold funnel entirely — see Partner strategy below / item 197).

> **Implication:** cold-only at a real 2–3% needs **~5–9 warmed mailboxes in rotation** (multiple sending domains) — a proper cold rig (Instantly), **not** one mailbox. One agency **partner ≈ 10 clients/month** from a single relationship — far cheaper than ~1,000+ cold prospects. **Lead with partners + warm network + dogfood while the rig warms; cold scales after.**

### Net profit by client count (ARPU $80, operating+failover $138/mo)
| Clients | MRR | Stripe+data | Fixed | **Net/mo** | Margin |
|---|---|---|---|---|---|
| 1 | $80 | $4 | $138 | **−$62** | — |
| **2** | $160 | $7 | $138 | **+$15** | 9% |
| 3 | $240 | $11 | $138 | **+$91** | 38% |
| 5 | $400 | $18 | $138 | **+$244** | 61% |
| 10 | $800 | $36 | $138 | **+$626** | 78% |
| 20 | $1,600 | $73 | $138 | **+$1,389** | 87% |
| 50 | $4,000 | $181 | $222* | **+$3,597** | 90% |
| 100 | $8,000 | $362 | $242** | **+$7,396** | 92% |
| 165 | $13,200 | $597 | $242 | **+$12,361** | 94% |

\* Apollo → Organization ($149) at ~50 clients · \** + Resend higher tier at scale.

**Break-even: 2 clients (infra) · 5 clients (incl. Claude Code dev).** After ~10 clients it's 78%+ margin — the model is almost pure margin once the fixed stack is covered. **The lever that matters is ARPU: a FIGSY client ($160+) is worth ~2× a starter ($80).** Push FIGSY upsell after first leads land.

---

## 5c. COST PER PRODUCT — what each agent costs to serve (16 Jun corrected)
*The founder's question: "cost per product." Here's the variable cost to actually run each agent for a client. Headline: **only FIGSY's data is a meaningful cost. The other three agents are near-free to serve** on Claude Haiku.*

| Product | What drives the cost | Est. variable cost to serve | What you charge | Gross margin |
|---|---|---|---|---|
| **FIGSY** (AI SDR) | Apollo data (~$0.008/lead) + Claude Haiku 3-email generation (~$0.012) + scoring (~$0.0004) + Resend send (~negligible) | **~$0.02–0.10 per lead** fully processed | $3.00 / lead (FIGSY Advanced, flat) | **~97%** |
| **Milla** (Brain/VA) | Claude tokens per question/draft (Haiku/Sonnet) | **~$0.01–0.03 per query** | $49/mo | **~95%+** |
| **Vida** (Chatbot) | Claude tokens per conversation turn | **~$0.01–0.03 per conversation** | $29/mo | **~90%+** (a 100-chat/mo client ≈ $1–3 cost) |
| **Denise** (Closer) | Claude tokens per follow-up/proposal draft (longer outputs) | **~$0.02–0.05 per draft** | $39/mo | **~95%+** *(corrected 16 Jun from $99 display; actual cost was always $39; until voice — see §5d)* |

**The one cost that matters is Apollo (FIGSY's data).** Everything else is sub-cent Claude inference. So: protect FIGSY's data economics (§5d), keep generation on Haiku (cheap) with prompt caching, and the whole platform sits at ~95% gross margin.
*Numbers are estimates on current Haiku pricing — confirm against real Anthropic + Apollo invoices once volume is live; the structure won't change.*

---

## 5d. FUTURE COSTS & THE SCALING MAP (16 Jun, verified 10 Jun baseline)
*"How we actually start scaling." The cost structure barely moves as you grow — here's what comes online, when, and the one structural decision that decides everything.*

### 🔑 The single biggest cost lever at scale: the Apollo data decision
Verified 10 Jun: reselling Apollo data off one account violates ToS **from client #1** (not at "50 clients" — that figure was wrong). Two compliant structures, with **opposite cost profiles**:
- **(a) Apollo API Reseller / Data-Licensing agreement** (`partners@apollo.io`): a contract (likely higher Apollo spend or a revenue share) — but it legitimises one-account-many-clients and Apollo cost stays on K.I.N.D's books, growing with usage.
- **(b) Client-brings-own-Apollo-key** (Agency sub-accounts): **K.I.N.D's Apollo cost → ~$0** — each client pays Apollo directly. It removes the only meaningful variable cost *and* fixes the ToS. Trade-off: **signup friction** — a deal-killer for self-serve SMB. **For the per-rep company model (a company getting one Apollo account for its seats) this is very natural.** → **REVISED 16 Jun (see §13/§14): NOT a blanket default. Segment it — bundle data for self-serve SMB (friction kills conversion; data is only ~2% of cost), reserve BYO-key for company/partner accounts where it's low-friction and de-risks scale.** Final SMB stance gated on Apollo's partner reply.
- **(c) Multi-source (PDL wired, dormant):** PDL free tier → paid (pay-as-you-go), Hunter ~$49/mo. Cuts single-vendor risk + fills African coverage gaps; not the compliance fix on its own.

### Costs that come online as you grow
| Stage | Clients | New cost online | Monthly impact |
|---|---|---|---|
| **0 · Launch** | 1–10 | Current floor (Supabase/Railway/Resend/Apollo) | **~$138/mo** + Apollo. Break-even 2–5 clients. |
| **1 · Per-rep companies (#88)** | 10–50 | Apollo grows with usage **(or → ~$0 if client-keys)** · slightly more Railway/Supabase compute | Marginal — ARPU jumps far faster (a 10-seat company ≈ 10× a single seat) |
| **2 · Scaling** | 50–100 | Apollo **Organization tier** (or reseller/client-keys resolved) · PDL/Hunter if multi-source on · possibly 1st support hire | Infra still <$300/mo; biggest line becomes **payment fees** (~3% of revenue) |
| **3 · Intelligence + voice** | 100+ | **Vapi** (Denise voice ~$0.05–0.15/min — the next real variable cost) · Memory v2 (pgvector = Supabase compute) · Learning-engine inference (Haiku, cheap) | Still <5% of revenue; voice is the one to meter as it scales |

### How we actually start scaling (the levers, in order)
1. **Partner channel** — 1 good agency partner ≈ 10 clients/month. The single fastest lever; nearly free. (Demmy/Nigeria live.)
2. **Per-rep company engine (#88)** — the ARPU multiplier. Move from selling single seats to selling *teams*. This is the revenue inflection.
3. **Dogfood (FIGSY sells K.I.N.D)** — the warmup campaign already does this; scale it. Near-zero CAC.
4. **ARPU uplift** — push FIGSY + Denise onto Lead-Gen starters after first leads land.

**The scaling truth:** revenue can 10× while monthly costs go from ~$140 to maybe ~$400. **You are not cost-constrained — you are growth-constrained.** Pour energy into partners + the per-rep engine, resolve the Apollo structure (favour client-keys), and the margin takes care of itself.

---

## 6. Three Scenarios — Month by Month (directional, use §5b for current numbers)
*Note: net-profit columns below use the OLD $203 fixed stack — directional only. **Use §5b/§7 for current break-even ($80 ARPU, $138 fixed)**. Client-growth assumptions still hold.*

### 🔵 Conservative
*Assumptions: 30% trial→paid conversion, 5% monthly churn, $80 blended ARPU*

| Month | New Paid | Churned | Total Clients | MRR (USD) | Net Profit |
|---|---|---|---|---|---|
| May 2026 | 3 | 0 | 3 | $240 | +$37 |
| Jun 2026 | 4 | 0 | 7 | $560 | +$357 |
| Jul 2026 | 6 | 0 | 13 | $1,040 | +$837 |
| Aug 2026 | 7 | 1 | 19 | $1,520 | +$1,295 |
| Sep 2026 | 9 | 1 | 27 | $2,160 | +$1,902 |
| Oct 2026 | 10 | 1 | 36 | $2,880 | +$2,585 |
| Nov 2026 | 12 | 2 | 46 | $3,680 | +$3,341 |
| Dec 2026 | 13 | 2 | 57 | $4,560 | +$4,180 |
| **Year 1 end** | | | **~60 clients** | **~$4,800 MRR** | |

**Year 1 total cash collected: ~$22,000**
**Break-even: Month 2**

---

### 🟡 Base
*Assumptions: 40% trial→paid conversion, 3% monthly churn, $80 blended ARPU*

| Month | New Paid | Churned | Total Clients | MRR (USD) | Net Profit |
|---|---|---|---|---|---|
| May 2026 | 8 | 0 | 8 | $640 | +$437 |
| Jun 2026 | 12 | 0 | 20 | $1,600 | +$1,370 |
| Jul 2026 | 16 | 1 | 35 | $2,800 | +$2,554 |
| Aug 2026 | 20 | 1 | 54 | $4,320 | +$4,029 |
| Sep 2026 | 24 | 2 | 76 | $6,080 | +$5,746 |
| Oct 2026 | 28 | 2 | 102 | $8,160 | +$7,779 |
| Nov 2026 | 32 | 3 | 131 | $10,480 | +$10,044 |
| Dec 2026 | 36 | 4 | 163 | $13,040 | +$12,553 |
| **Year 1 end** | | | **~165 clients** | **~$13,200 MRR** | |

**Year 1 ARR (annualising Month 12): ~$158,000**
**Year 1 total cash collected: ~$72,000**
**Break-even: Month 1**

---

### 🟢 Optimistic
*Assumptions: 50% trial→paid conversion, 2% monthly churn, $80 blended ARPU*
*Requires: Partner channel active, Product Hunt listing, strong word of mouth*

| Month | New Paid | Churned | Total Clients | MRR (USD) | Net Profit |
|---|---|---|---|---|---|
| May 2026 | 15 | 0 | 15 | $1,200 | +$997 |
| Jun 2026 | 25 | 1 | 39 | $3,120 | +$2,870 |
| Jul 2026 | 35 | 2 | 72 | $5,760 | +$5,472 |
| Aug 2026 | 45 | 2 | 115 | $9,200 | +$8,866 |
| Sep 2026 | 50 | 3 | 162 | $12,960 | +$12,582 |
| Oct 2026 | 60 | 5 | 217 | $17,360 | +$16,927 |
| Nov 2026 | 70 | 6 | 281 | $22,480 | +$21,987 |
| Dec 2026 | 75 | 8 | 348 | $27,840 | +$27,278 |
| **Year 1 end** | | | **~350 clients** | **~$28,000 MRR** | |

**Year 1 ARR (annualising Month 12): ~$334,000**
**Year 1 total cash collected: ~$138,000**
**Break-even: Month 1**

---

## 7. Profitability at Scale (16 Jun audit)

### Net profit by client count (ARPU $80, fixed stack $138–242/mo)

| Total Clients | MRR | Stripe fee | Data cost | Fixed | Total costs | **Net profit** | **Margin** |
|---|---|---|---|---|---|---|---|
| 1 | $80 | $2.62 | $1 | $138 | $141.62 | **−$61.62** | **—** |
| **2** | $160 | $5.24 | $2 | $138 | $145.24 | **+$14.76** | **9%** |
| 3 | $240 | $7.86 | $3 | $138 | $148.86 | **+$91.14** | **38%** |
| 5 | $400 | $13.10 | $5 | $138 | $156.10 | **+$243.90** | **61%** |
| 10 | $800 | $26.20 | $10 | $138 | $174.20 | **+$625.80** | **78%** |
| 20 | $1,600 | $52.40 | $20 | $138 | $210.40 | **+$1,389.60** | **87%** |
| 30 | $2,400 | $78.60 | $30 | $142* | $250.60 | **+$2,149.40** | **90%** |
| 50 | $4,000 | $131.00 | $50 | $222** | $403.00 | **+$3,597.00** | **90%** |
| 75 | $6,000 | $196.50 | $75 | $242 | $513.50 | **+$5,486.50** | **91%** |
| 100 | $8,000 | $262.00 | $100 | $242 | $604.00 | **+$7,396.00** | **92%** |
| 165 | $13,200 | $432.30 | $165 | $242 | $839.30 | **+$12,360.70** | **94%** |
| 350 | $28,000 | $917.00 | $350 | $298*** | $1,565.00 | **+$26,435.00** | **94%** |

\* Add basic monitoring at ~30 clients
\** Apollo upgrade to Organization ($149) at ~50 clients; Resend Pro ($20) at scale
\*** Additional infra costs at 300+ clients

**Break-even: 2 clients** at $80 blended ARPU / $138 fixed stack.
**Break-even: 1 client** if ARPU is $160 (Growth profile) or $199 (Growth+ w/ Denise).

---

## 8. Revenue Milestones & GTM (16 Jun audit)
*Timelines are directional based on §6 scenarios at ~$80 blended ARPU (flat pricing).*

| Milestone | What it unlocks | Conservative | Base | Optimistic |
|---|---|---|---|---|
| **$1,000 MRR** | Platform pays for itself | Month 7 | Month 3 | Month 2 |
| **$5,000 MRR** | Founder salary begins | Month 12 | Month 5 | Month 3 |
| **$10,000 MRR** | First hire possible | Year 2 | Month 7 | Month 4 |
| **$25,000 MRR** | Series A conversations | Year 2+ | Month 11 | Month 6 |
| **$100,000 MRR** | Market leader across both tracks (US/UK/EMEA + Africa) | Year 3 | Month 24 | Month 15 |

*Note: break-even now hits at Month 1 even in conservative, vs. Month 2 before.*

---

## 9. The 4 Levers That Determine Which Scenario You Land In

| Lever | Impact | Status |
|---|---|---|
| **1. Apollo plan live** | Zero leads without API access = zero product = zero revenue | ⚠️ Needs upgrade now |
| **2. FIGSY self-outreach running** | Automated pipeline — K.I.N.D finds its own clients every Monday | ⚠️ Needs `FIGSY_KIND_CLIENT_ID` in Railway |
| **3. Partner channel** | 1 good agency partner = 10 new clients/month. Moves conservative → optimistic alone. | ⏳ Pending |
| **4. ARPU uplift** | If average client spends $160 instead of $80, all scenarios double | Driven by FIGSY adoption |

---

## 10. Key Risks to the Model

| Risk | Impact | Mitigation |
|---|---|---|
| Apollo free plan (current) | **CRITICAL** — no leads at all | Upgrade to Basic ($49) or Professional ($99) immediately |
| RESEND_API_KEY not set | High — zero emails, no nurture, clients go cold | Confirm set in Railway environment variables |
| Apollo ToS — restricts reselling data | High | Legal distinction: you sell a managed service, not Apollo data. Confirm with lawyer at scale. |
| Apollo API rate limits | Medium | Queue ICP runs — a small code change at 20+ clients |
| Churn — client cancels after 1 month | Medium | Focus on quality of leads. At-risk alerts built in. Onboarding call on day 2. |
| Lead yield below 60% | Low | Apollo strong email verification. Adjust ICP filters if yield drops. |
| Payment processing fees at scale | Low | ~2.9% Stripe / ~3.8% Flutterwave (Africa). At $15,000 MRR ≈ $440–570/mo. Negotiate a custom rate above $10k MRR. |
| ARPU stays at $20 (starter only) | Medium | Actively upsell FIGSY after first leads delivered. Upgrade prompt built into portal. |

---

## 11. Summary (corrected 16 Jun)

| Metric | Value |
|---|---|
| Launch floor (Group A: Supabase+Railway+Resend+Apollo) | ~$114/mo |
| Launch + email + failover (A + B) | ~$138/mo |
| All-in including Claude Code dev | ~$239–395/mo |
| **Break-even (tech stack, $80 ARPU)** | **2 clients** |
| **Break-even (tech stack, $160 ARPU — Growth)** | **1 client** |
| **Break-even (tech stack, $199 ARPU — Growth+ Denise)** | **1 client** |
| Gross margin per lead (Lead Gen & FIGSY) | ~99% |
| Margin at 10 clients ($80 ARPU) | ~78% |
| Margin at 50 clients ($80 ARPU) | ~90% |
| Margin at 165 clients (Base Year 1 end) | ~94% |
| Year 1 total cash — Conservative | ~$22,000 |
| Year 1 total cash — Base | ~$72,000 |
| Year 1 total cash — Optimistic | ~$138,000 |

The model scales almost entirely as pure margin after the first 2 clients. The biggest lever is not cost reduction — it's ARPU. A Growth+ client on FIGSY + Denise (~$199/mo) generates ~9× the margin of a starter client ($20/mo). **FIGSY-only clients** (~$60/mo entry bundle) generate ~3× the margin.

The biggest single cost threat at scale is not technology — it's **payment processing** (~2.9% Stripe / ~3.8% Flutterwave of revenue). At $15,000 MRR that's ~$440–570/mo. Negotiate a custom rate above $10k MRR.

---

**🟢 16 JUN UPDATE SUMMARY:** Pricing reconciled to the LOCKED `@kind/shared` constants (founder-confirmed): **Lead Gen $20/$40/$100 ($1 flat) · FIGSY $60/$120/$300 ($3 flat) — no volume discounts**. Stripe ($20/$38/$88, $60/$110/$250) and the portal UI are the bugs to fix Tue 16 (item 168). Denise corrected to $39 (was displaying $99). Double-charge (item 166) to be eliminated (separate pools). All ARPU/break-even/margin restored to the flat model; blended ARPU ~$80, break-even ~2 clients. *(An earlier pass this session wrongly treated Stripe's discounted values as the target — reverted.)*

---

## 12. The $1,000,000 ARR Goal — What It Takes

*Annual Recurring Revenue target: $1M ARR = a real revenue business.*
*⚠️ **CORRECTED 16 Jun (PM):** an earlier draft of this section had a 10× arithmetic error (divided $1M by `ARPU × 12` but dropped a zero) and a fabricated cost table that wrongly showed a loss. Both fixed below. The truth: **$1M ARR is ~93% gross margin — roughly $900k profit — and the binding constraint is sales volume (logos), NOT margin.***

> ### 💡 Plain-English: do we ever lose money? **No.**
> Costs are almost all **fixed** (~$138/mo) plus a **tiny variable** (~2% of revenue — data + payment fees). So once you pass **2 clients**, every extra client is almost pure profit, and margin climbs toward **~93%** and *stays there*. **There is no point where more revenue turns into a loss** — bigger is always more profit. The only thing that gets harder as you grow is **how many clients you must sign** to hit a target ($1M ARR = ~1,042 clients at $80 ARPU, or just 347 at $240). That's a *sales-volume* problem, never a *losing-money* problem. *(The earlier "you lose at $1M" was an arithmetic mistake, now fixed.)*

### How $1M ARR breaks down
**$1M ARR = $83,333 MRR.** Clients needed = MRR ÷ monthly ARPU (flat pricing):

| ARPU Profile | Monthly ARPU | **Clients for $1M ARR** |
|---|---|---|
| **Blended** (conservative, mostly starters) | $80 | **1,042** |
| **Growth** (Lead Gen 100 + FIGSY 20) | $160 | **521** |
| **Growth+** (+ Denise) | $199 | **419** |
| **Partner-blend** (70% Growth+ / 30% Scale) | $240 | **347** |
| **Scale** (Lead Gen 100 + FIGSY 100) | $400 | **208** |
| **Outcome pricing** (per meeting booked) | $500 | **167** |

*Higher ARPU doesn't change your margin (already ~93%) — it changes how many logos you must close. That's the whole game.*

### Cost Structure at $1M ARR (corrected — costs are % of revenue, so client count doesn't change them)
| Cost category | Annual | % of revenue |
|---|---|---|
| **Stripe payment processing** (2.9% + 30¢/txn) | ~$32,000 | ~3.2% |
| **Data** (Apollo + Claude Haiku — **→ ~$0 if client-keys/§5d**) | ~$20,000 | ~2% |
| **Fixed infra** (Supabase/Railway/Resend/Apollo Org at scale) | ~$5,000 | ~0.5% |
| **Infra scaling** (compute, pgvector, backups) | ~$15,000 | ~1.5% |
| **Hard costs (pre-payroll)** | **~$72,000** | **~7%** |
| **GROSS PROFIT (pre-payroll)** | **~$928,000** | **~93%** ✅ |
| *Optional: 1–2 support/CS hires* | $60k–144k | 6–14% |
| **Net with 2 hires** | **~$784,000** | **~78%** |

✅ **This reconciles with §7** (94% margin at 165 clients). The single biggest cost line at scale is **Stripe (~3%)**, not data (~2%). Data only matters because it's the one cost that *grows with volume* — which is exactly why client-keys (§5d) is attractive at scale (drives it to ~0).

### The real lesson: $1M is a SALES-VOLUME problem, not a margin problem
- **At $80 ARPU you must close ~1,042 clients.** At ~20 net new/month that's ~52 months. Slow.
- **At $240 ARPU (partners + company engine) only ~347.** At ~20/month via partners that's ~18 months. Viable.
- **At $500 (outcome pricing) only ~167.** The fastest path — but gated on having outcome data first.

**So the three levers for $1M ARR (in priority order):**
1. **ARPU uplift** — fewer logos to sell. Denise ($39) + FIGSY upsell turns a $20 starter into a $160–199 client. This is the cheapest lever (existing base).
2. **Partner channel + company engine (#88)** — sell *teams*, not seats. A 10-seat company at ~$240 ARPU = ~3 single clients' worth, one sale.
3. **Outcome pricing** (gated ≥28% margin, post-launch) — collapses the logo count to ~167. The real inflection.

**Margin is already solved (~93%). The work is ARPU + a repeatable way to add logos (partners/companies), not cost control.**

---

## 13. The Apollo / Data-Sourcing Strategy — how we work around the ToS

### The problem (one line)
Reselling Apollo data from ONE K.I.N.D account to many clients may breach Apollo's ToS (§5d, risk from client #1) — and Apollo data is the only cost that *grows with volume*. So we need a data architecture that is **(a) ToS-clean** and **(b) low-friction**.

### What this is NOT
Data is only **~2% of revenue** (§4, §12). Working around Apollo is **not a profit play** — it saves ~2 margin points, not "profits like crazy." It's a **compliance + scale-resilience** play. Don't trade away signup conversion for it where it doesn't matter.

### The decision: SEGMENT BY ACV — don't use one model for everyone
| Segment | ACV | Data model | Friction | Why |
|---|---|---|---|---|
| **Self-serve SMB** (solo, $20–75) | Low | **K.I.N.D bundles the data** (we hold the Apollo/multi-source layer) | **Zero — "just works"** | A $20 client will not go create an Apollo account. Friction kills self-serve. We eat ~2% data cost — trivial. |
| **Company (#88)** (10–50 seats) | High | **BYO Apollo key** — one account per company, like their CRM, wired once at onboarding | Low — they tolerate a setup call | Sophisticated + high-value + already human-onboarded. ToS-clean AND zeroes our cost on the highest-volume accounts. |
| **Partners** (agencies) | High | **BYO Apollo / their own data ops** | Low — they already run data | Agencies have their own stack and expect to use it. Natural fit. |

**→ Your instinct ("a client/partner uses their own Apollo like their own CRM") is right — for companies and partners.** It's the wrong default for self-serve SMB, where BYO-key is a conversion-killer.

### On "free implementation" (the founder's idea)
Smart — **but only for high-ACV.** Wiring a client's Apollo key + CRM in a setup call is worth your time at $240+ ARPU (company/partner). It is **not** affordable on a $20–75 self-serve plan — every white-glove onboarding is human time. *(This is exactly why Alta, which does heavy white-glove onboarding, charges enterprise prices.)*

### What Alta actually does (competitor read, 16 Jun — public info, partly inferred)
- Alta **bundles a multi-source data layer** (50+ sources: BuiltWith, SimilarWeb, StoreLeads, intent signals, CRM, job postings). Clients are told *"you don't need to source your own data."* It is **not just an Apollo wrapper.**
- Alta is **enterprise / custom-priced** with **high-touch onboarding** (dedicated session, ICP + CRM + playbook, live in days). They can afford to bundle costly data + human onboarding because **they charge a lot**.
- **Public info is ambiguous** on whether Alta ever uses a client's own Apollo workspace. Weight of evidence: they bundle their own data layer and integrate a client's existing tools where present — they do **not** primarily make SMB clients BYO-Apollo.
- **Takeaway:** Alta proves *bundled-data + white-glove + premium* works — but that's a **different market** (enterprise) than our SMB/African self-serve. Copy the **bundling** for SMB and the **white-glove** only for high-ACV. Don't bolt enterprise onboarding cost onto $20 plans.

### The structural hedge (already half-built): multi-source waterfall
PDL is wired but dormant; Hunter ~$49/mo (§5d). A **waterfall across PDL → Hunter → Apollo** (the Clay/Alta philosophy) removes single-vendor ToS risk entirely, raises match rates, and fills African coverage gaps. This is the long-term answer that makes us **not hostage to Apollo at all.**

### The gate: wait for Apollo's reply before locking the SMB path
The `partners@apollo.io` email (sent 14 Jun) decides it:
- **If Apollo grants a reseller/partner agreement** → bundle data for SMB **ToS-clean**, keep zero friction. Best of both worlds.
- **If not** → push BYO-key further down-market and/or lean on the multi-source waterfall for SMB.

**RECOMMENDATION:** Bundle for SMB (pending Apollo's terms) · BYO-key for company/partner with free setup · build the multi-source waterfall as the hedge. **Do not force BYO-key on self-serve SMB — it costs more in lost conversions than the ~2% data it saves.**

---

## 14. Onboarding & Segmentation Plan — self-serve SMB vs. white-glove company

> 🚧 **STRATEGY / PLAN (not built). Founder-approved direction 16 Jun; layers on top of the existing onboarding draft (`docs/drafts/ONBOARDING_V2.md`, item #30) and the live Company Engine (#88).** Self-serve SMB flow already drafted; this adds the *company fork* + the data-segmentation rule. Nothing here ships before founder sign-off on a real signup run-through.

### The one rule
**Segment on SEATS REQUESTED, not headcount.** Company size (auto-read at signup) is a *hint* for routing/guessing, never a hard wall.
- **1 seat → self-serve track** (Track A). Zero friction, we bundle the data.
- **2+ seats / "team" intent → concierge track** (Track B). Free white-glove setup, optional BYO-Apollo.

*(Headcount alone lies — a 15-person agency can be your best team customer; a 40-person firm may want one seat. Seats = the true signal.)*

### Shared front door (both tracks)
1. **Client enters their website at signup.** We auto-read their company data (firmographics incl. employee-size) — the existing **ICP website-scan** (per `ONBOARDING_V2.md`) extended to also capture the client's *own* size via **PDL** (`apps/api/src/lib/pdl-search.ts` — wired, has `job_company_size`; keys set 15 Jun).
2. **Auto-route:** size + seats → suggest Track A (self-serve) or Track B (concierge). Client can override.
3. **Everyone starts on K.I.N.D-bundled data immediately** — first scored leads in <10 min (the onboarding north-star). **No Apollo account required to start, in either track.**

### Track A — Self-serve SMB (1 seat)
- The existing `ONBOARDING_V2.md` flow verbatim: signup → ICP → first leads (our Apollo/multi-source) → first FIGSY campaign → first reply.
- **Data: always bundled by K.I.N.D.** Client never touches Apollo. We absorb the ~2% cost — trivial.
- Friction: **zero.** This is the volume engine + the upsell base (push FIGSY/Denise after first leads).

### Track B — Company / Team (2+ seats) — the #88 Company Engine
- **Day 0–14: trial on bundled data, no implementation gate.** They get real leads + value *before* any setup ask. This is the wedge that lets us "start engaging, onboarding and selling" while the deal warms.
- **After value is shown: free white-glove implementation** (the concierge call) — wire CRM + connections, configure pools/seats (#88's two-pool model: lead-gen $1 / FIGSY $3), and **optionally** connect the company's own Apollo key (one account for all seats, like their CRM).
- **Implementation is a sales/relationship moment, never a hurdle** — "we build your revenue engine for you, free." It's *why* a company pays ~10× an SMB.

### The Apollo decision per track (the only genuinely open question)
| Track | Default | BYO-Apollo? |
|---|---|---|
| **A — SMB** | **Bundled (we hold data)** | No — never forced |
| **B — Company/Partner** | **Bundled to start (trial)** | **Optional**, offered at implementation — mandatory only for very-high-volume accounts or if Apollo's ToS requires it at their scale |

**Gated on `partners@apollo.io` reply (sent 14 Jun):**
- **Apollo says yes (reseller/partner terms)** → bundle for *everyone* ToS-clean; BYO-key becomes a pure concierge option. Lowest friction everywhere.
- **Apollo says no** → BYO-key becomes the compliance path for high-volume company/partner accounts; SMB leans harder on the **PDL→Hunter→Apollo waterfall** (§13) so self-serve stays friction-free and ToS-safe.

### Build status (honest — Rule 3)
| Piece | Status | Notes |
|---|---|---|
| SMB self-serve flow (Track A) | 🟡 drafted | `ONBOARDING_V2.md` #30 — gated on launch run-through |
| Company Engine, two-pool, seats (Track B core) | 🟢 live | #88 shipped to prod Mon 15 |
| Website→ICP autofill | 🟡 referenced built | confirm endpoint during run-through |
| Website→**own-firmographics** read for routing | 🔴 new | extend scan / use PDL company enrich |
| Seat-based auto-routing (A vs B) | 🔴 new | the segmentation switch |
| 14-day company trial on bundled data | 🔴 new | trial logic before implementation |
| White-glove implementation flow (CRM + optional Apollo) | 🔴 new | post-launch (company hardening, Month 1) |
| Multi-source waterfall (PDL→Hunter→Apollo) | 🟡 half-wired | PDL dormant-capable; keys set 15 Jun |

**Sequence:** ship Track A (self-serve) at launch → add seat-routing + company trial → build white-glove implementation post-launch (already in Month-1 "company hardening") → finalise the Apollo default once Apollo replies.

---

## 15. Execution Tickets — Tue-16 billing + onboarding build

> Derived run-list (pulls from `PRODUCT-INVENTORY.md` items 166–173 + §14). Inventory is the source of truth for status; this is the *do-it order* with file refs. Owners: 🧍 founder · 🤖 Claude · 🤝 both.

### A. BILLING CORRECTNESS — Tue 16 (pre-client blockers, gate Fri-19) — items 166–173
*Build order respects dependencies: the `plan` flag + pool model underpin the charge fixes; price reconciliation + admin visibility follow; multi-currency is a separate phase.*

| # | Ticket | Files | Owner | Order |
|---|---|---|---|---|
| **169** | `clients.plan` flag — migration + backfill (FIGSY campaign/credits → `figsy`, else `lead_gen`); delivery reads it, charges **one** pool | new migration + delivery path | 🤖 | **1** |
| **167** | FIGSY-only bundle can deliver — pool-aware delivery (not capped by lead-gen balance) + FIGSY-pool trial grant | `icps.ts:151-152` | 🤖 | **2** |
| **166** | Kill the double-charge — stop charging lead-gen $1 AND FIGSY $3 on the same lead ($4→$3) | `lead-delivery.ts:64`, `figsy.ts:907-921` | 🤖 | **3** |
| **170** | Atomic FIGSY credit RPC — replace read-modify-write with `increment_figsy_credits` RPC | `figsy.ts:909-912` | 🤖 | **4** |
| **168** | **Reconcile 3 price tables → LOCKED constants** ($20/$40/$100 · $60/$120/$300). Code: portal imports `@kind/shared`. **Founder: recreate the 6 Stripe Price objects at locked values.** | `constants/index.ts` (source), `billing/page.tsx:70-74`, `company/page.tsx`, `stripe.ts:26-30` | 🤝 | **5** |
| **171** | "How credits work" panel honesty — fix false "Outreach sent — No credit used" + show FIGSY pool | `billing/page.tsx:303-306` | 🤖 | **6** |
| **173** | Admin FIGSY visibility — surface `figsy_credits_remaining` (admin shows `credit_balance` only) + add top-up | admin client view | 🤖 | **7** |
| **172** | Multi-currency USD/GBP/ZAR — Stripe multi-currency Prices + `clients.preferred_currency`; reconcile w/ Flutterwave. **Own phase — does NOT block 166–171.** | `flutterwave.ts:146-160` | 🤝 | later |

**Founder's two actions for the billing build:** ① recreate the 6 Stripe Price objects at the locked values (item 168); ② decide multi-currency scope (item 172).

### B. ONBOARDING & SEGMENTATION — from §14 (mostly post-launch / Month-1 company hardening)
| Ref | Ticket | Status | Owner |
|---|---|---|---|
| #30 | SMB self-serve flow (Track A) | 🟡 drafted (`ONBOARDING_V2.md`), gated on launch run-through | 🤝 |
| #88 | Company Engine, two-pool, seats (Track B core) | 🟢 live (prod Mon 15) | — |
| **174** | Website → read client's **own firmographics** for routing (PDL company enrich) | 🔴 new | 🤖 |
| **175** | Seat-based auto-routing (1 = self-serve / 2+ = concierge) | 🔴 new | 🤖 |
| **176** | 14-day company trial on bundled data (before any Apollo implementation) | 🔴 new | 🤖 |
| **177** | White-glove implementation flow (CRM + **optional** BYO-Apollo) | 🔴 new — Month-1 company hardening | 🤝 |
| 94/95/140 | Multi-source waterfall PDL→Hunter→Apollo (activate) | 🟡 half-wired (keys set 15 Jun) | 🤖 |

*(Inventory IDs 174–177 added 15 Jun. The earlier "O1–O5" labels are retired — these are the canonical numbers across all docs.)*

### C. Gated on Apollo's reply (`partners@apollo.io`, sent 14 Jun)
- **Final SMB data default** — bundle (if Apollo grants reseller/partner terms) vs. lean on multi-source waterfall (if not). Until then: **bundle for SMB, BYO-key optional for company/partner** (§13/§14).

**Critical path to Fri-19:** items **169 → 167 → 166 → 170 → 168 → 171 → 173** (billing correctness). Onboarding A/B and the Apollo default are **post-launch** — they do not gate the 19th.

---

---

## 16. How to Run the Company — Business Training

*Delivered 29 Jun 2026. Operational reference for running K.I.N.D day-to-day — business model, money flow, company ops status, and weekly rhythm.*

### What this business actually is

K.I.N.D is a SaaS platform that sells AI sales automation to SMBs. You make money two ways:

1. **Credit bundles** (one-time purchases) — clients buy lead-gen or outreach credits and consume them
2. **Agent subscriptions** (recurring monthly) — clients pay monthly for AI agents (Milla, Vida, Denise)

The model is ~95% gross margin. Fixed costs are ~$138/month. Break-even is **2 clients**. After that, almost every dollar of revenue is profit.

### The five products and what they charge

| Product | Type | Price |
|---|---|---|
| Lead Gen (K.I.N.D AI) | Credits | $20 / $40 / $100 bundles ($1/lead flat) |
| FIGSY | Credits | $60 / $120 / $300 bundles ($3/lead flat) |
| Milla (VA / Brain) | Subscription | $49/month |
| Vida (Chatbot) | Subscription | $29/month |
| Denise (AI Account Executive) | Subscription | $39/month |

Highest-leverage upsell: $20 Lead Gen starter → FIGSY ($60+) → Denise ($39) = ~$199/month client, ~10× the margin of a starter.

### Break-even and salary target

- **Break-even (infra only):** 2 clients at $80 blended ARPU
- **Break-even (incl. dev costs):** 5 clients
- **Salary target (£75k/year gross):** ~$5,000 MRR — ~63 clients at $80 blended, or ~25 clients at $199 (FIGSY + Denise mix)
- **Churn is the treadmill:** at 5% monthly churn you replace ~3 clients/month forever. Quality of first leads matters more than volume for retention.

### How money flows

```
Client pays → Stripe (global) or Flutterwave (Africa)
                ↓
        Credits land in wallet / subscription activates
                ↓
        Revenue sits in Stripe/Flutterwave balance
                ↓
        Stripe pays out → Wise Business (UK sort code + USD balance)
                ↓
        You pay fixed stack (~$138/mo) from Wise
                ↓
        Profit → withdraw to personal account as salary/dividend
```

### Company ops — current status (29 Jun 2026)

| Item | Status | Next action |
|---|---|---|
| UK Ltd (Companies House) | ✅ Active | File confirmation statement annually |
| ICO registration (data protection) | ✅ C1959926 | Renew annually |
| Business bank account | ✅ Wise Business (primary) | Save sort code + account number |
| Stripe payouts | ✅ → Wise Business | Done |
| Flutterwave (Africa) | ✅ Wired | Confirm payout destination |
| Wise (partner/AE commission payouts) | ✅ Open | Use for partner commissions |
| Accounting platform (item 196) | ⏸ Xero — open on first paying client | Connect Stripe + Wise same day as first client pays |
| Bookkeeping cadence | ⏸ Blocked on Xero | Monthly reconciliation — starts on first client |
| VAT registration | Not yet | Threshold: £90k/year UK turnover — nowhere near it |
| HMRC (corp tax) | Active obligation | Xero + accountant handles this once connected |

**Xero — why it's the right choice and when to open it:**
- Connects directly to Stripe (auto-imports every payment) and to Wise
- Handles USD revenue reconciled to GBP for HMRC filing
- Standard for UK Ltd — most UK accountants work in it
- Start on Xero Starter (~£15/mo) on the day first client pays; it backfills Stripe history from day one

### Weekly numbers rhythm (15 min/week, every Monday)

| Metric | What it tells you | Where to check |
|---|---|---|
| MRR | Is the business growing? | Stripe dashboard |
| New clients this week | Lead indicator | Admin portal |
| Churn (cancellations) | Are you keeping clients? | Admin portal |
| ARPU | Are clients upgrading or staying on $20 starter? | Admin portal |
| Credits consumed vs. purchased | Are clients active or stalled? | Admin portal |
| Stripe balance / payout | Cash in hand | Stripe + Wise |

If MRR is flat and churn is rising — focus on client success before new sales.

### The three levers that determine which scenario you land in (recap from §5d)

1. **ARPU uplift** — push FIGSY + Denise after first leads land. Turns a $20 starter into $199/month.
2. **Partner channel** — 1 good agency partner ≈ 10 clients/month. Bypasses the whole cold funnel.
3. **Per-rep company engine (#88)** — sell teams, not seats. A 10-seat company ≈ 10× a single client at almost the same cost to serve.

---

*Document owner: K.I.N.D founding team*
*Last updated: **29 Jun 2026** — §16 added: How to Run the Company (business training delivered)*
*Previous: 16 June 2026 — prices reconciled to LOCKED flat constants + $1M ARR goal + §13 Apollo strategy + §14 Onboarding/Segmentation + §15 Execution tickets*
*Review this model quarterly as pricing, client mix, and ARPU evolves.*
