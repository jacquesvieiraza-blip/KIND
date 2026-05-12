# K.I.N.D — Run Costs & Cashflow Model
*Last updated: May 2026*

---

## 1. Tech Stack — Fixed Monthly Costs

These run whether you have zero clients or one hundred.

| Service | What it does | Plan | Cost/mo |
|---------|-------------|------|---------|
| Supabase | Database, auth, file storage | Pro (required for Cape Town / af-south-1 — POPIA) | $25 |
| Vercel | Hosts portal + website + admin (3 projects) | Pro (Hobby is non-commercial) | $20 |
| Railway | API server (Node.js backend) | Usage-based | $10–20 |
| Apollo.io | Lead data source — 24,000 credits/mo | Professional | $99 |
| Resend | Transactional email (welcome, POPIA consent) | Free up to 3,000/mo | $0–20 |
| kindai.com domain | Domain registration | Annual ~$15 | $1.25 |
| **Claude Code (development)** | AI-assisted development — building and maintaining the entire platform | Max plan | **$100–200** |
| **Total floor** | | | **$255–385/mo** |

**Note on Claude Code:** This is a founder operating cost — the AI tool used to build and maintain K.I.N.D. It is not a product cost passed to clients. As the platform matures and requires less active development, this cost reduces or stops entirely. It is separate from the Anthropic API cost (which is the in-product cost of L3 lead scoring and F1 FIGSY — those are variable, sub-cent per lead).

**Claude Code plans:**
- Pro: $20/mo — sufficient for light usage
- Max (5x): $100/mo — recommended for active development
- Max (20x): $200/mo — heavy daily builds like the current phase

**When Apollo upgrades:**
- Professional: $99/mo — 24,000 credits — covers ~14,000 delivered leads/mo
- Organization: $149/mo — 48,000 credits — kicks in at ~50 active clients running large ICPs

---

## 2. Variable Costs (scale with usage)

| Cost | Rate | Notes |
|------|------|-------|
| Apollo — cost per delivered lead | ~$0.008 | 24,000 credits ÷ ~60% yield |
| Anthropic (Claude) — lead scoring | ~$0.0004/lead | Claude Haiku — after L3 is built |
| Anthropic (Claude) — FIGSY email | ~$0.01–0.02/email | Claude Haiku — after F1 is built |
| Paystack — payment processing | 2.9% per transaction | Cost of revenue, not fixed |

**Total variable cost per delivered lead: ~$0.009** (sub-cent at any volume)

---

## 3. Pricing

| Product | Charge | Minimum |
|---------|--------|---------|
| AI Lead Generation | $1/lead | $100/mo (100 leads) |
| Lead Gen + FIGSY Bundle | $3/lead | $300/mo (100 leads) |
| Virtual Assistant | $200/mo | Starter tier |
| AI Chatbot Agent | $200/mo | Starter tier |

**Yearly billing: 20% discount on flat-rate products** (VA, Chatbot, FIGSY add-on).
Lead pricing stays $1/lead regardless — you pay per result.

---

## 4. Unit Economics Per Lead

| | Amount |
|-|--------|
| You charge per lead | $1.00 |
| Apollo cost per lead | $0.008 |
| Anthropic cost per lead | $0.001 |
| **Gross margin per lead** | **~$0.99 (99%)** |

The data cost is negligible. Your real cost is the fixed stack spread across all clients.

---

## 5. Cashflow Model — Scaling from 1 Client

### Assumptions
- **Average revenue per client (ARPC):**
  - Lead Gen only: $150/mo average (clients typically run 100–200 leads)
  - FIGSY Bundle: $400/mo average
  - VA / Chatbot: $200/mo
- **Product mix as you scale:**
  - Early (1–10 clients): 90% Lead Gen, 10% Bundle
  - Mid (10–30 clients): 70% Lead Gen, 20% Bundle, 10% VA/Chatbot
  - Scale (30+ clients): 60% Lead Gen, 25% Bundle, 15% VA/Chatbot
- **Blended ARPC used in model:** $180/mo (conservative, Lead Gen-weighted)
- **Fixed stack:** $165/mo (stays flat until Apollo upgrade at ~50 clients)
- **Variable costs:** Apollo ($0.008/lead) + Paystack (2.9% of MRR)

---

### Scenario A — Conservative (Lead Gen only, $150/mo avg)

| Clients | MRR | Apollo cost | Paystack (2.9%) | Fixed stack | Total costs | **Net profit** | **Margin** |
|---------|-----|-------------|-----------------|-------------|-------------|----------------|------------|
| 1 | $150 | $2 | $4 | $165 | $171 | **-$21** | **-14%** |
| 2 | $300 | $4 | $9 | $165 | $178 | **$122** | **41%** |
| 3 | $450 | $6 | $13 | $165 | $184 | **$266** | **59%** |
| 5 | $750 | $10 | $22 | $165 | $197 | **$553** | **74%** |
| 10 | $1,500 | $20 | $44 | $165 | $229 | **$1,271** | **85%** |
| 15 | $2,250 | $30 | $65 | $165 | $260 | **$1,990** | **88%** |
| 20 | $3,000 | $40 | $87 | $165 | $292 | **$2,708** | **90%** |
| 30 | $4,500 | $60 | $131 | $165 | $356 | **$4,144** | **92%** |
| 50 | $7,500 | $100 | $218 | $215* | $533 | **$6,967** | **93%** |
| 75 | $11,250 | $150 | $326 | $215 | $691 | **$10,559** | **94%** |
| 100 | $15,000 | $200 | $435 | $260** | $895 | **$14,105** | **94%** |

*Apollo upgrade to Organization ($149) at ~50 clients
**Resend Pro added at scale ($20 extra)

**Break-even: 2 clients.**

---

### Scenario B — Base case (mixed products, $220/mo blended ARPC)

| Clients | MRR | Apollo cost | Paystack (2.9%) | Fixed stack | Total costs | **Net profit** | **Margin** |
|---------|-----|-------------|-----------------|-------------|-------------|----------------|------------|
| 1 | $220 | $3 | $6 | $165 | $174 | **$46** | **21%** |
| 3 | $660 | $9 | $19 | $165 | $193 | **$467** | **71%** |
| 5 | $1,100 | $15 | $32 | $165 | $212 | **$888** | **81%** |
| 10 | $2,200 | $30 | $64 | $165 | $259 | **$1,941** | **88%** |
| 20 | $4,400 | $60 | $128 | $165 | $353 | **$4,047** | **92%** |
| 30 | $6,600 | $90 | $191 | $165 | $446 | **$6,154** | **93%** |
| 50 | $11,000 | $150 | $319 | $215 | $684 | **$10,316** | **94%** |
| 100 | $22,000 | $300 | $638 | $260 | $1,198 | **$20,802** | **95%** |

**Break-even: 1 client.**

---

### Scenario C — Optimistic (FIGSY-heavy, $350/mo blended ARPC)

| Clients | MRR | Apollo cost | Paystack (2.9%) | Fixed stack | Total costs | **Net profit** | **Margin** |
|---------|-----|-------------|-----------------|-------------|-------------|----------------|------------|
| 1 | $350 | $5 | $10 | $165 | $180 | **$170** | **49%** |
| 5 | $1,750 | $25 | $51 | $165 | $241 | **$1,509** | **86%** |
| 10 | $3,500 | $50 | $102 | $165 | $317 | **$3,183** | **91%** |
| 20 | $7,000 | $100 | $203 | $165 | $468 | **$6,532** | **93%** |
| 50 | $17,500 | $250 | $508 | $215 | $973 | **$16,527** | **94%** |
| 100 | $35,000 | $500 | $1,015 | $260 | $1,775 | **$33,225** | **95%** |

---

## 6. Annual Revenue Trajectory (Base Case — adding 3 new clients/month)

| Month | Total clients | MRR | Cumulative revenue |
|-------|--------------|-----|-------------------|
| 1 | 1 | $220 | $220 |
| 2 | 4 | $880 | $1,100 |
| 3 | 7 | $1,540 | $2,640 |
| 4 | 10 | $2,200 | $4,840 |
| 5 | 13 | $2,860 | $7,700 |
| 6 | 16 | $3,520 | $11,220 |
| 9 | 25 | $5,500 | $30,360 |
| 12 | 37 | $8,140 | $62,920 |

**Year 1 ARR at month 12: ~$97,680** (annualising month 12 MRR)
**Year 1 total cash collected: ~$62,920**

---

## 7. Key Risks to the Model

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Apollo ToS — restricts reselling their data | High | Legal distinction: you sell a managed service, not Apollo data. Confirm with a lawyer at scale. |
| Apollo API rate limits | Medium | Queue ICP runs with rate limiting — a small code change needed at 20+ clients |
| Apollo plan upgrade | Low | Each upgrade is covered by 1–2 additional clients. The jump from $99 → $149 happens when you're doing $7,500+/mo. |
| Churn — client cancels after 1 month | Medium | Minimum contracts via order form help. Focus on quality of leads delivered. |
| Lead yield below 60% | Low | Apollo has strong email verification. Adjust ICP filters if yield drops. |

---

## 8. Summary

- **Floor cost to operate (tech stack only):** ~$165/mo
- **Floor cost including Claude Code development:** ~$265–385/mo
- **Break-even (tech stack only):** 1–2 clients depending on product mix
- **Break-even (including Claude Code):** 2–3 clients depending on product mix
- **Margin at 10 clients:** 85–91%
- **Margin at 50 clients:** 93–94%
- **Margin at 100 clients:** 94–95%

The model scales almost entirely as pure margin after the first 2–3 clients. Apollo at $99/mo covers 24,000 lead searches — you won't hit that ceiling until you have 15–20 active clients all running large ICPs simultaneously.

The biggest single cost at scale is not technology — it's Paystack (2.9% of revenue). At $15,000 MRR that's $435/mo to process payments. Consider negotiating a custom Paystack rate at higher volumes.

---

*Document owner: K.I.N.D founding team*
*Review this model quarterly as pricing and client mix evolves.*
