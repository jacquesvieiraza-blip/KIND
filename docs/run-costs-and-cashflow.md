# K.I.N.D — Run Costs & Cashflow Model
*Last updated: **10 June 2026** — added §5c Cost Per Product · §5d Future Costs & Scaling Map. Corrected for: the 4-agent line-up (FIGSY/Milla/Vida/Denise), the per-rep company engine (#88, the ARPU multiplier), multi-source data (PDL wired), and the verified Apollo-ToS picture (the structural data decision = the single biggest cost lever at scale).*

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
| Google Workspace | Pro email `@get-kind.com` | Business Starter | $12–18 |
| Render | API warm standby (crash failover) | Starter | $7 |
| Cloudflare | Load balancer → routes to standby on outage | LB Basic | $5 |
| get-kind.com domain | Domain registration | Annual ~$15 | $1.25 |
| **Group B subtotal** | | | **~$25–31/mo** |

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

### Credit Bundles (current model)

| Product | Credits | Price USD | Price ZAR |
|---|---|---|---|
| K.I.N.D AI — Lead Gen Pro | 20 | $20 | R380 |
| K.I.N.D AI — Lead Gen Pro | 40 | $40 | R760 |
| K.I.N.D AI — Lead Gen Pro | 100 | $100 | R1,900 |
| FIGSY Advanced | 20 | $60 | R1,140 |
| FIGSY Advanced | 40 | $120 | R2,280 |
| FIGSY Advanced | 100 | $300 | R5,700 |

**Phase 2 billing evolution:** Credit bundles → recurring monthly subscription model once value is proven.

---

## 4. Unit Economics Per Lead

| | Amount |
|---|---|
| You charge per lead | $1.00 |
| Apollo cost per lead | $0.008 |
| Anthropic cost per lead | $0.001 |
| **Gross margin per lead** | **~$0.99 (99%)** |

The data cost is negligible. Your real cost is the fixed stack spread across all clients.

---

## 5. ARPU Assumptions

| Client Type | Monthly Spend (USD) | Profile |
|---|---|---|
| Starter | $20 | Lead Gen 20 credits only |
| Growth | $160 | Lead Gen 100 + FIGSY 20 credits |
| Scale | $400 | Lead Gen 100 + FIGSY 100 credits |
| **Blended ARPU** | **~$80** | Mixed client base, conservative estimate |

The difference between conservative and optimistic scenarios is primarily ARPU. If the average client spends $160 instead of $80 (Growth profile), all MRR figures double.

---

## 5b. UPDATED CASHFLOW & SALES TARGETS — ACTUAL COSTS (3 June 2026)
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

### Contribution per client
At **$80 blended ARPU**: Stripe takes ~$2.62 (2.9% + 30¢) + ~$1 data (Apollo+Anthropic) → **net ~$76/client/mo**.
At **$160 ARPU** (Growth profile): net ~$154/client/mo.

### 🎯 SALES TARGET LADDER — the numbers to hit
*Clients needed to clear each milestone. Two columns because ARPU is the biggest lever.*

| Milestone | What it means | Clients @ $80 ARPU | Clients @ $160 ARPU |
|---|---|---|---|
| **Break-even (infra only)** | Stack pays for itself | **2** | **1** |
| **Break-even (infra + failover)** | Resilient + self-funding | **2** | **1** |
| **Break-even (incl. Claude Code dev)** | Whole operation self-funding | **5** | **3** |
| **$1,000 MRR** | Comfortable; reinvest | **13** | **7** |
| **$5,000 MRR** | Founder salary begins | **63** | **31** |
| **$10,000 MRR** | First hire possible | **125** | **63** |
| **$25,000 MRR** | Series A conversations | **313** | **156** |

### 🎯 Your funnel targets (to convert outreach → paying clients)
*Base assumption: 40% trial→paid. So each paying client needs ~2.5 trials.*

| To land… | You need ~trials | Rough outreach (at ~4% reply→trial) |
|---|---|---|
| 1 paying client | 2.5 trials | ~60 quality touches |
| 5 paying (all-in break-even) | ~13 trials | ~315 touches |
| 13 paying ($1k MRR) | ~33 trials | ~815 touches |

> The dogfood engine (FIGSY self-outreach) + warm network are how you hit the touch counts without paying for ads. One good agency **partner** can deliver ~10 clients/month alone — the single fastest lever.

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

\* Apollo → Organization ($149) at ~50 clients · \** + Resend higher tier at scale

**Break-even: 2 clients (infra) · 5 clients (incl. Claude Code dev).** After ~10 clients it's 78%+ margin — the model is almost pure margin once the fixed stack is covered. **The lever that matters is ARPU: a FIGSY client ($160+) is worth ~2× a starter ($80).** Push FIGSY upsell after first leads land.

---

## 5c. COST PER PRODUCT — what each agent costs to serve (10 Jun)
*The founder's question: "cost per product." Here's the variable cost to actually run each agent for a client. Headline: **only FIGSY's data is a meaningful cost. The other three agents are near-free to serve** on Claude Haiku.*

| Product | What drives the cost | Est. variable cost to serve | What you charge | Gross margin |
|---|---|---|---|---|
| **FIGSY** (AI SDR) | Apollo data (~$0.008/lead) + Claude Haiku 3-email generation (~$0.012) + scoring (~$0.0004) + Resend send (~negligible) | **~$0.02–0.10 per lead** fully processed | ~$3.00 / lead (FIGSY Advanced credits) | **~97%** |
| **Milla** (Brain/VA) | Claude tokens per question/draft (Haiku/Sonnet) | **~$0.01–0.03 per query** | Subscription (bundled) | **~95%+** |
| **Vida** (Chatbot) | Claude tokens per conversation turn | **~$0.01–0.03 per conversation** | $29/mo | **~90%+** (a 100-chat/mo client ≈ $1–3 cost) |
| **Denise** (Closer) | Claude tokens per follow-up/proposal draft (longer outputs) | **~$0.02–0.05 per draft** | $99/mo | **~95%** *(until voice — see §5d)* |

**The one cost that matters is Apollo (FIGSY's data).** Everything else is sub-cent Claude inference. So: protect FIGSY's data economics (§5d), keep generation on Haiku (cheap) with prompt caching, and the whole platform sits at ~95% gross margin.
*Numbers are estimates on current Haiku pricing — confirm against real Anthropic + Apollo invoices once volume is live; the structure won't change.*

---

## 5d. FUTURE COSTS & THE SCALING MAP (10 Jun)
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

## 6. Three Scenarios — Month by Month
*Note: net-profit columns below use the OLD $203 fixed stack — directional only. Use §5b for current break-even. Client-growth assumptions still hold.*

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

## 7. Profitability at Scale

### Net profit by client count (Base ARPU $80, fixed stack $203/mo)

| Total Clients | MRR | Apollo cost | Paystack (2.9%) | Fixed stack | Total costs | **Net profit** | **Margin** |
|---|---|---|---|---|---|---|---|
| 1 | $80 | $1 | $2 | $203 | $206 | **-$126** | **-** |
| 3 | $240 | $2 | $7 | $203 | $212 | **+$28** | **12%** |
| 5 | $400 | $4 | $12 | $203 | $219 | **+$181** | **45%** |
| 10 | $800 | $8 | $23 | $203 | $234 | **+$566** | **71%** |
| 20 | $1,600 | $16 | $46 | $203 | $265 | **+$1,335** | **83%** |
| 30 | $2,400 | $24 | $70 | $203 | $297 | **+$2,103** | **88%** |
| 50 | $4,000 | $40 | $116 | $223* | $379 | **+$3,621** | **91%** |
| 75 | $6,000 | $60 | $174 | $223 | $457 | **+$5,543** | **92%** |
| 100 | $8,000 | $80 | $232 | $248** | $560 | **+$7,440** | **93%** |
| 165 | $13,200 | $132 | $383 | $248 | $763 | **+$12,437** | **94%** |
| 350 | $28,000 | $280 | $812 | $298*** | $1,390 | **+$26,610** | **95%** |

\* Apollo upgrade to Organization ($149) at ~50 clients
\** Resend Pro added (~$20) at scale
\*** Additional infra costs at 300+ clients

**Break-even: 3 clients** at $80 ARPU / $203 fixed stack.
**Break-even: 2 clients** if ARPU is $160 (Growth profile).

---

## 8. Revenue Milestones

| Milestone | What it unlocks | Conservative | Base | Optimistic |
|---|---|---|---|---|
| **$1,000 MRR** | Platform pays for itself | Month 7 | Month 3 | Month 2 |
| **$5,000 MRR** | Founder salary begins | Month 12 | Month 5 | Month 3 |
| **$10,000 MRR** | First hire possible | Year 2 | Month 7 | Month 4 |
| **$25,000 MRR** | Series A conversations | Year 2+ | Month 11 | Month 6 |
| **$100,000 MRR** | Market leader, SA dominant | Year 3 | Month 24 | Month 15 |

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
| Paystack processing fees at scale | Low | At $15,000 MRR = $435/mo to Paystack. Negotiate custom rate above $10k MRR. |
| ARPU stays at $20 (starter only) | Medium | Actively upsell FIGSY after first leads delivered. Upgrade prompt built into portal. |

---

## 11. Summary

| Metric | Value |
|---|---|
| Launch floor (Group A: Supabase+Railway+Resend+Apollo) | ~$114/mo |
| Launch + email + failover (A + B) | ~$139/mo |
| All-in including Claude Code dev | ~$239–395/mo |
| Break-even (tech stack, $80 ARPU) | 3 clients |
| Break-even (tech stack, $160 ARPU) | 2 clients |
| Gross margin per lead | ~99% |
| Margin at 10 clients | ~71% |
| Margin at 50 clients | ~91% |
| Margin at 165 clients (Base Year 1 end) | ~94% |
| Year 1 total cash — Conservative | ~$22,000 |
| Year 1 total cash — Base | ~$72,000 |
| Year 1 total cash — Optimistic | ~$138,000 |

The model scales almost entirely as pure margin after the first 3 clients. The biggest lever is not cost reduction — it's ARPU. A client on FIGSY ($300/mo) generates 3.75× the margin of a starter client ($20/mo).

The biggest single cost threat at scale is not technology — it's Paystack (2.9% of revenue). At $15,000 MRR that's $435/mo. Negotiate a custom rate above $10k MRR.

---

*Document owner: K.I.N.D founding team*
*Last updated: 25 May 2026*
*Review this model quarterly as pricing and client mix evolves.*
