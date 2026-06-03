# K.I.N.D — Run Costs & Cashflow Model
*Last updated: 3 June 2026 — corrected to actual stack (Railway-only hosting, Stripe billing; removed stale Vercel + Paystack entries). Added resilience costs (Render standby + Cloudflare LB).*

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

## 6. Three Scenarios — Month by Month

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
