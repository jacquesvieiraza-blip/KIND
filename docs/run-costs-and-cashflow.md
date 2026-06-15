# K.I.N.D — Run Costs & Cashflow Model
*Last updated: **16 June 2026** — BILLING CORRECTNESS BUILD: price tables reconciled (Stripe ↔ code), Denise $39 restored, double-charge eliminated. Corrected for: the 4-agent line-up, the per-rep company engine (#88), multi-source data (PDL), the verified Apollo-ToS picture.*
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

### Credit Bundles (current model — corrected 16 Jun)
*Stripe backend pricing (source of truth: `apps/api/src/lib/stripe.ts`). Lead Gen unit cost: $1.00–2.20/lead; FIGSY unit cost: $2.50–3.00/lead.*

| Product | Credits | Price USD | Price ZAR | Backend ✓ | Portal UI |
|---|---|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 | ✓ | ✓ |
| K.I.N.D AI — Lead Gen Pro | 40 | **$38** | R722 | ✓ | ❌ shows $40 |
| K.I.N.D AI — Lead Gen Pro | 100 | **$88** | R1,672 | ✓ | ❌ shows $100 |
| FIGSY Advanced | 20 | **$60** | R1,140 | ✓ | ❌ shows $20 |
| FIGSY Advanced | 40 | **$110** | R2,090 | ✓ | ❌ shows $40 |
| FIGSY Advanced | 100 | **$250** | R4,750 | ✓ | ❌ shows $100 |

**🚨 CRITICAL BUG AUDIT (16 Jun):** Portal hardcodes wrong prices (`apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx` line 66–73 + company/page.tsx). Customers see $20/$40/$100 for FIGSY (should be $60/$110/$250). **TUE 16 build must fix portal UI to match backend before going live.**

→ Lead Gen = **$1.00–2.20/lead** (by bundle size) · FIGSY Advanced = **$2.50–3.00/lead** (no double-charge).

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

## 4. Unit Economics By Bundle Tier (detailed audit 16 Jun)

### 4a. Lead Gen Pro — STANDALONE (per lead)
*Customers buy 20/40/100 credits per bundle. These are separate from FIGSY (no double-charge post-correction).*

| Bundle | Credits | Price | Per-lead cost | Variable cost* | Per-lead margin | % margin |
|---|---|---|---|---|---|---|
| 20 credits | 20 | $20 | **$1.00** | ~$0.008 | ~$0.992 | **99.2%** |
| 40 credits | 40 | $38 | **$0.95** | ~$0.008 | ~$0.942 | **99.2%** |
| 100 credits | 100 | $88 | **$0.88** | ~$0.008 | ~$0.872 | **99.2%** |
| **Blended** | — | — | **~$0.90** | ~$0.008 | ~$0.89 | **99%** |

\* Variable = Apollo delivery verification (~$0.008) + negligible scoring. Data cost is nearly zero — your margin scales to fixed overhead.

### 4b. FIGSY Advanced — STANDALONE (per lead)
*Customers buy 20/40/100 credits per bundle. These are separate from Lead Gen (no stacking).*

| Bundle | Credits | Price | Per-lead cost | Variable cost* | Per-lead margin | % margin |
|---|---|---|---|---|---|---|
| 20 credits | 20 | $60 | **$3.00** | ~$0.024 | ~$2.976 | **99.2%** |
| 40 credits | 40 | $110 | **$2.75** | ~$0.024 | ~$2.726 | **99.2%** |
| 100 credits | 100 | $250 | **$2.50** | ~$0.024 | ~$2.476 | **99.2%** |
| **Blended** | — | — | **~$2.70** | ~$0.024 | ~$2.68 | **99%** |

\* Variable = Apollo lead cost (~$0.008) + Claude Haiku email generation (~$0.012) + Claude scoring (~$0.0004) + Resend send (~negligible) = **~$0.024/lead**. Customers with 100-credit bundles (lowest per-unit cost) + high send volume enjoy the best unit economics.

### 4c. The Double-Charge Bug (fixed 16 Jun)
**Before:** A client buying both Lead Gen 100 ($88) + FIGSY 20 ($60) was charged BOTH per lead — $1 per Lead Gen lead AND $3 per FIGSY lead, totalling $4/lead when running both. This broke pricing credibility.

**After:** Lead Gen and FIGSY are separate products. Client chooses:
- Lead Gen **only** → $0.88–1.00/lead (pure lead delivery, no outreach)
- FIGSY **only** → $2.50–3.00/lead (FIGSY finds, qualifies, and emails on their own)
- **Both** → combined separate credits (e.g., Starter finds 100 leads @ $88, runs 20 FIGSY emails @ $60 = $148 for mixed flow, not $4/lead stacking) ✓

---

## 4d. What a Customer Actually Pays (mixed scenarios)

| Scenario | What they buy | Cost | Lead units | FIGSY units | Effective cost/lead |
|---|---|---|---|---|---|
| **Starter** | Lead Gen 20 | $20 | 20 leads | — | $1.00/lead |
| **Lead Gen Optimize** | Lead Gen 100 | $88 | 100 leads | — | $0.88/lead |
| **FIGSY Entry** | FIGSY 20 | $60 | — | 20 emails | $3.00/email |
| **FIGSY Optimize** | FIGSY 100 | $250 | — | 100 emails | $2.50/email |
| **Growth blend** | Lead Gen 100 + FIGSY 20 | $148 | 100 leads | 20 emails | $88 LG + $60 FIGSY |
| **Scale blend** | Lead Gen 100 + FIGSY 100 | $338 | 100 leads | 100 emails | $88 LG + $250 FIGSY |

---

## 5. Unit Economics Summary (FIGSY Advanced, blended)

| | Amount |
|---|---|
| Blended per-lead cost (FIGSY 100-credit bundle) | **$2.50** |
| Apollo cost per lead | $0.008 |
| Anthropic cost per lead (generation + scoring) | ~$0.015 |
| Resend send cost | ~negligible |
| **Total variable cost per lead** | **~$0.024** |
| **Gross margin per lead** | **~$2.48 (99%)** |

The data cost is negligible. Your real cost is the fixed stack (~$138/mo) spread across all clients and all their leads.

---

## 5a. ARPU Assumptions (corrected 16 Jun)

| Client Type | Monthly Spend (USD) | Profile |
|---|---|---|
| Starter | $20 | Lead Gen 20 credits only |
| Growth | $148 | Lead Gen 100 ($88) + FIGSY 20 ($60) credits |
| Growth+ | $187 | Lead Gen 100 + FIGSY 20 + Denise ($39) |
| Scale | $338 | Lead Gen 100 ($88) + FIGSY 100 ($250) credits |
| Scale+ | $377 | Lead Gen 100 + FIGSY 100 + Denise ($39) |
| **Blended ARPU** | **~$75** | Mixed client base, conservative (50% starter, 30% growth, 20% scale) |

The difference between conservative and optimistic scenarios is primarily ARPU. If the average client spends $160 instead of $75 (Growth profile), all MRR figures increase ~2.1×. Denise upsell ($39) is the highest-lever add-on after first leads land.

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

### Contribution per client (corrected 16 Jun)
At **$75 blended ARPU** (corrected pricing): Stripe takes ~$2.48 (2.9% + 30¢) + ~$1 data (Apollo+Anthropic) → **net ~$71.50/client/mo**.
At **$148 ARPU** (Growth profile): net ~$143/client/mo.
At **$187 ARPU** (Growth+ w/ Denise): net ~$180/client/mo.

### 🎯 SALES TARGET LADDER — the numbers to hit (corrected 16 Jun)
*Clients needed to clear each milestone. Three columns: blended ARPU ($75, conservative), Growth profile ($148), Growth+ w/ Denise ($187).*

| Milestone | What it means | @ $75 ARPU | @ $148 ARPU | @ $187 ARPU |
|---|---|---|---|---|
| **Break-even (infra only)** | Stack pays for itself | **2** | **1** | **1** |
| **Break-even (infra + failover)** | Resilient + self-funding | **2** | **1** | **1** |
| **Break-even (incl. Claude Code dev)** | Whole operation self-funding | **4** | **2** | **1** |
| **$1,000 MRR** | Comfortable; reinvest | **14** | **7** | **5** |
| **$5,000 MRR** | Founder salary begins | **70** | **34** | **27** |
| **$10,000 MRR** | First hire possible | **140** | **68** | **54** |
| **$25,000 MRR** | Series A conversations | **350** | **169** | **134** |

### 🎯 Your funnel targets (to convert outreach → paying clients)
*Base assumption: 40% trial→paid. So each paying client needs ~2.5 trials.*

| To land… | You need ~trials | Rough outreach (at ~4% reply→trial) |
|---|---|---|
| 1 paying client | 2.5 trials | ~60 quality touches |
| 5 paying (all-in break-even) | ~13 trials | ~315 touches |
| 13 paying ($1k MRR) | ~33 trials | ~815 touches |

> The dogfood engine (FIGSY self-outreach) + warm network are how you hit the touch counts without paying for ads. One good agency **partner** can deliver ~10 clients/month alone — the single fastest lever.

### Net profit by client count (ARPU $75, operating+failover $138/mo — corrected 16 Jun)
| Clients | MRR | Stripe+data | Fixed | **Net/mo** | Margin |
|---|---|---|---|---|---|
| 1 | $75 | $3.48 | $138 | **−$66.48** | — |
| **2** | $150 | $6.95 | $138 | **+$5** | 3% |
| 3 | $225 | $10.43 | $138 | **+$76.57** | 34% |
| 5 | $375 | $17.38 | $138 | **+$219.62** | 59% |
| 10 | $750 | $34.75 | $138 | **+$677.25** | 90% |
| 20 | $1,500 | $69.50 | $138 | **+$1,292.50** | 86% |
| 50 | $3,750 | $172.50 | $222* | **+$3,355.50** | 89% |
| 100 | $7,500 | $345 | $242** | **+$6,913** | 92% |
| 165 | $12,375 | $570.75 | $242 | **+$11,562** | 93% |

\* Apollo → Organization ($149) at ~50 clients · \** + Resend higher tier at scale. *Note: slightly lower ARPU ($75 vs. $80) reflects corrected pricing mix (lower FIGSY bundles, lower Denise); break-even still ~2 clients, margin >90% at scale.*

**Break-even: 2 clients (infra) · 5 clients (incl. Claude Code dev).** After ~10 clients it's 78%+ margin — the model is almost pure margin once the fixed stack is covered. **The lever that matters is ARPU: a FIGSY client ($160+) is worth ~2× a starter ($80).** Push FIGSY upsell after first leads land.

---

## 5c. COST PER PRODUCT — what each agent costs to serve (16 Jun corrected)
*The founder's question: "cost per product." Here's the variable cost to actually run each agent for a client. Headline: **only FIGSY's data is a meaningful cost. The other three agents are near-free to serve** on Claude Haiku.*

| Product | What drives the cost | Est. variable cost to serve | What you charge | Gross margin |
|---|---|---|---|---|
| **FIGSY** (AI SDR) | Apollo data (~$0.008/lead) + Claude Haiku 3-email generation (~$0.012) + scoring (~$0.0004) + Resend send (~negligible) | **~$0.02–0.10 per lead** fully processed | ~$2.50–3.00 / lead (FIGSY Advanced, corrected bundles) | **~97%** |
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
- **(b) Client-brings-own-Apollo-key** (Agency sub-accounts): **K.I.N.D's Apollo cost → ~$0** — each client pays Apollo directly. **This is the margin-maximising AND compliance-solving choice** — it removes the only meaningful variable cost *and* fixes the ToS. Trade-off: a little signup friction. **For the per-rep company model (a company getting one Apollo account for its seats) this is very natural.** → Strongly favour (b) as the default; (a) for clients who won't manage a key.
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
*Note: net-profit columns below use the OLD $203 fixed stack and $80 ARPU — directional only. **Use §5b for current break-even ($75 ARPU, $138 fixed)**. Client-growth assumptions still hold. Corrected pricing (16 Jun) shifts ARPU to ~$75, which improves break-even timeline slightly (hit 2-client break-even sooner).*

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

### Net profit by client count (ARPU $75–148, fixed stack $138–242/mo)

| Total Clients | MRR | Stripe fee | Data cost | Fixed | Total costs | **Net profit** | **Margin** |
|---|---|---|---|---|---|---|---|
| 1 | $75 | $2.48 | $1 | $138 | $141.48 | **−$66.48** | **—** |
| **2** | $150 | $4.95 | $2 | $138 | $144.95 | **+$5** | **3%** |
| 3 | $225 | $7.43 | $3 | $138 | $148.43 | **+$76.57** | **34%** |
| 5 | $375 | $12.38 | $5 | $138 | $155.38 | **+$219.62** | **59%** |
| 10 | $750 | $24.75 | $10 | $138 | $172.75 | **+$577.25** | **77%** |
| 20 | $1,500 | $49.50 | $20 | $138 | $207.50 | **+$1,292.50** | **86%** |
| 30 | $2,250 | $74.25 | $30 | $142* | $246.25 | **+$2,003.75** | **89%** |
| 50 | $3,750 | $123.75 | $50 | $222** | $395.75 | **+$3,354.25** | **89%** |
| 75 | $5,625 | $185.63 | $75 | $242 | $502.63 | **+$5,122.37** | **91%** |
| 100 | $7,500 | $247.50 | $100 | $242 | $589.50 | **+$6,910.50** | **92%** |
| 165 | $12,375 | $408.75 | $165 | $242 | $815.75 | **+$11,559.25** | **94%** |
| 350 | $26,250 | $858.75 | $350 | $298*** | $1,506.75 | **+$24,743.25** | **94%** |

\* Add basic monitoring at ~30 clients
\** Apollo upgrade to Organization ($149) at ~50 clients; Resend Pro ($20) at scale
\*** Additional infra costs at 300+ clients

**Break-even: 2 clients** at $75 blended ARPU / $138 fixed stack.
**Break-even: 1 client** if ARPU is $148 (Growth profile) or $187 (Growth+ w/ Denise).

---

## 8. Revenue Milestones & GTM (16 Jun audit)
*Timelines are directional based on §6 scenarios; corrected pricing ($75 ARPU vs $80) slightly accelerates attainment.*

| Milestone | What it unlocks | Conservative | Base | Optimistic |
|---|---|---|---|---|
| **$1,000 MRR** | Platform pays for itself | Month 7 | Month 3 | Month 2 |
| **$5,000 MRR** | Founder salary begins | Month 12 | Month 5 | Month 3 |
| **$10,000 MRR** | First hire possible | Year 2 | Month 7 | Month 4 |
| **$25,000 MRR** | Series A conversations | Year 2+ | Month 11 | Month 6 |
| **$100,000 MRR** | Market leader, SA dominant | Year 3 | Month 24 | Month 15 |

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
| **Break-even (tech stack, $75 ARPU)** | **2 clients** |
| **Break-even (tech stack, $148 ARPU — Growth)** | **1 client** |
| **Break-even (tech stack, $187 ARPU — Growth+ Denise)** | **1 client** |
| Gross margin per lead (FIGSY) | ~99% |
| Margin at 10 clients ($75 ARPU) | ~90% |
| Margin at 50 clients ($75 ARPU) | ~89% |
| Margin at 165 clients (Base Year 1 end) | ~94% |
| Year 1 total cash — Conservative | ~$22,000 |
| Year 1 total cash — Base | ~$72,000 |
| Year 1 total cash — Optimistic | ~$138,000 |

The model scales almost entirely as pure margin after the first 2 clients. The biggest lever is not cost reduction — it's ARPU. A Growth+ client on FIGSY + Denise (~$187/mo) generates 9× the margin of a starter client ($20/mo). **FIGSY-only clients** (~$60/mo, bundle price) generate 3× the margin.

The biggest single cost threat at scale is not technology — it's **payment processing** (~2.9% Stripe / ~3.8% Flutterwave of revenue). At $15,000 MRR that's ~$440–570/mo. Negotiate a custom rate above $10k MRR.

---

**🟢 16 JUN UPDATE SUMMARY:** Stripe pricing now matches code (FIGSY $60/$110/$250 bundles, Lead Gen $20/$38/$88). Denise pricing corrected to actual $39 (was displaying $99). Double-charge bug eliminated (Lead Gen + FIGSY are now separate products, not stacked). All break-even / ARPU / margin calculations updated. Break-even improves to **2 clients** at blended ARPU.

---

*Document owner: K.I.N.D founding team*
*Last updated: **16 June 2026** — Billing Correctness Build (pricing reconciliation, Denise fix, double-charge elimination)*
*Previous: 10 June 2026 — Cost Per Product & Scaling Map*
*Review this model quarterly as pricing and client mix evolves.*
