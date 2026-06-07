# 🟣 K.I.N.D — MASTER SOURCE OF TRUTH

> ✅ **THIS IS THE ONE SOURCE. Read this first, update this first, work off this only.**
> Supersedes `EVERYTHING.md`, `SESSION-HANDOFF-7JUN.md`, and all earlier roadmap fragments.
> Where any other doc disagrees, **THIS document wins.**
>
> **Protocol:** at the start of a session read this file; at the end of a session update it + commit.
>
> **Launch date:** 🚀 **FRIDAY 19 JUNE 2026** (firm — deferred from Mon 8 Jun until deliverability + Smoke Test 2 pass).
> **Last updated:** 7 Jun 2026.

---

## 📑 TABLE OF CONTENTS

- **CHAPTER 1 — STRATEGY & COMPETITIVE** (landscape, 5 reads, moat, funding, what to steal)
- **CHAPTER 2 — DAILY ACTION PLAN** (Mon 8 → Fri 19, day-by-day, owner-by-owner)
- **CHAPTER 3 — ALL 96 BUILDS** (every item #1–96, timeline, owner, status, gates)
- **CHAPTER 4 — OPERATIONS, LEGAL, INFRA & BUILT INVENTORY** (4 legal rings, staging, recurring ops, blocked-on-creds, full inventory, financials)

---


# ═══════════════════════════════════════════════════════════════
# CHAPTER 1 — STRATEGY & COMPETITIVE
# ═══════════════════════════════════════════════════════════════


> **Source of truth for competitive positioning, future builds, and strategic priorities.**
> Synthesises EVERYTHING.md, SESSION-HANDOFF-7JUN.md, and 5 Jun competitive research.
> Supersedes scattered planning documents. All items, all detail, all priorities.

---

## 🌍 THE COMPETITIVE LANDSCAPE (What the World Shipped in May–Jun 2026)

### THE BIG PLAYERS — What They Shipped

| Company | What | Strategic Signal | K.I.N.D Response |
|---------|------|-----------------|------------------|
| **Glean** ($7.2B) | Enterprise Graph (memory + connectors + personal/org graphs + governance). "Enterprise AI coworker" — proactively manages tasks, runs multiple workstreams, personalises per employee. Agent Development Lifecycle (ADLC) framework. Full MCP adoption. | **Context always wins.** The agent with the most context beats on quality every time. | We *can't* compete on enterprise context (not 7.2B ARR). But we own outcome data (who replied/converted by angle/vertical). That's a *different* moat. Build it at 10+ clients (L2 learning). |
| **Monday.com** | Full relaunch as "AI Work Platform." Native agents any team member can configure — draft campaigns, qualify leads, close support, onboard, process POs, 24/7. Claude + OpenAI + MS365 Copilot via single AI Platform Gateway. | "Agents sit inside a single structured platform with context across the entire business." General-purpose, context-native. | Monday is platform-first (agents inside the workspace). We're product-first (agents *are* the product). Different bet. Hold specialisation: named family, POPIA, $20 entry, outcome focus. |
| **ClickUp** | Acquired Codegen (Cursor competitor). "Super Agents" — autonomous project completion, 500+ work skills, human-level memory that learns from every interaction. 3,000 internal AI agents at 3:1 AI:human ratio. **Laid off 22% of staff.** Million-dollar bands for 100x humans who manage AI systems. | Most aggressive "agents replace headcount" bet. General-purpose. | We're not trying to replace ClickUp's users. We're replacing the SDR/AE for *one specific job* (outbound + close). Narrow moat = defensible. |
| **Notion** | Custom Agents (team-wide bots on schedules + triggers). MCP-native: Linear, HubSpot, Figma, Slack, Attio CRM. "Notion Workers" hosted runtime — agents run sandboxed custom code, no server needed. | Workspace = the agent runtime. MCP is the wiring. | **CRITICAL:** MCP is now distribution, not just product. Pulled forward to Month 2. K.I.N.D exposes one MCP endpoint: "Start a FIGSY campaign." Notion/Linear/Slack agents call it — no K.I.N.D UI needed. Free distribution. |
| **Linear** | Linear Agent: triages new work, assesses it, routes to the right team, Code Intelligence (controlled codebase access). The PM tool becomes the intelligence layer that directs work. | Product intelligence, not just tracking. | Linear is inside Linear. We're a standalone revenue team. Different positioning. No conflict. |
| **Salesforce** | AgentExchange — agent marketplace. "$6 trillion digital labour market." $2/AI conversation (vs $30–50 human agent cost). Agentforce on Slack up 300% since Jan 2026. | Outcome pricing at enterprise scale. Pricing by result, not seat. | Outcome pricing is validated (item #60). Build when we have margin data (Month 3+). Salesforce market ≠ our market ($2/conversation is enterprise math; we're SMB). |
| **Intercom Fin** | $0.99 per fully-resolved support ticket. Zero cost if unresolved. Pure outcome model. Working. | **The clearest pricing proof point in the market — outcome pricing is proven and live.** | This is the moat signal. Outcome pricing de-risks the buyer ("pay only for results"). We're already on the right curve (credit wallets, per-action). Outcome is the next step once we have 5+ clients + margin data. |

### MACRO NUMBERS (5 Jun 2026)
- **40%** of enterprise apps will have task-specific agents by end of 2026 (was <5% in 2025)
- **50%+** of B2B sales teams will be smaller than in 2025 (agents replacing SDRs/AEs)
- **AI handling 40–60% of initial customer interactions**
- **Outcome-based pricing:** <10% adoption today → **dominant model by 2027**
- **Credit wallets + usage-based:** 43% of SaaS on hybrid models → 61% projected by year end

### INDIRECT COMPETITORS SHIPPING NOW

#### **Atlas (youratlas.com)** — Done-for-You AI Revenue Engine
- **What:** $5,000+ setup, 7–14-day white-glove build, 90-day perf guarantee. Agency model.
- **Two agents:** (1) Demand Creation (CTV ads), (2) Demand Response (voice AI + iMessage at 92% open rate)
- **Team:** ~74 employees. Pre-seed (BDev Ventures). Founder: Omer Jamal (3rd-time, ex-Scotiabank).
- **Distribution:** Dan Martell (SaaS Academy). His endorsement = their acquisition engine.
- **Claimed:** 10,000+ businesses. Law firm: $28K in 90 days. Plumbing: 28% no-shows → 6% in 60 days.
- **Where they beat us:** Voice AI, iMessage novelty, CTV ads, 90-day guarantee, DFY removes friction.
- **Where we beat them:** $29/mo vs $5,000+. Self-serve. Multi-agent + shared memory. DENISE. Full revenue lifecycle. Live in minutes not 14 days.
- **Strategic read:** Different buyer (appointment-driven services). Not direct competition. BUT: their messaging (ROI calculator, 90-day guarantee, coaching bundled) is worth stealing. Items #61a–61g capture this.
- **What we're stealing:** Atlas's performance guarantee framing (#61a), 90-day language (#61g), influencer distribution channel (find our Dan-Martell equivalent for SA/US SMBs — #61e).

#### **Revio (getrevio.com)** — AI Social Selling CRM
- **What:** Instagram/Facebook DM automation for creators/coaches. Scores leads, auto-sends DMs, AI co-pilot suggests replies from closed-won transcripts. Bundled human coaching (group calls, 1:1 setup).
- **Pricing:** ~$500/mo (no public pricing). High-touch sales.
- **ICP:** Solopreneurs + small teams (1–10) in creator economy with existing followings.
- **Claimed:** 50% conversion increase. 30,065 IG leads in 1 month (case study). $60K/month in 7 months.
- **Distribution:** Dan Martell (same as Atlas).
- **Where they beat us:** Depth of social workflow. Coaching layer. Tight niche. Battle-tested replies from deals.
- **Where we beat them:** Autonomous agents (vs co-pilot). Cold outbound without audience. Full lifecycle. $29 vs $500. SA market. Broader ICP.
- **Watch signal:** LinkedIn outreach on roadmap. If they ship B2B cold outreach, they enter FIGSY's territory.
- **Strategic read:** Different buyer (creator economy vs SMB). NOT direct threat yet. BUT: their coaching model (bundled onboarding, 1:1 setup) + case study specificity are worth stealing. Items #62a–62e capture this.
- **What we're stealing:** Coaching layer in onboarding (Revenue Playbook Session bundled, #62b). Case study specificity (measured outcomes, not vanity metrics — #62c–62e). Revio's "trained on closed-won deals" credibility hook (#62a).

---

## 🎯 FIVE STRATEGIC READS FOR K.I.N.D (5 Jun 2026)

### **1. We launched on the right pricing curve.**
Credit wallets, usage-based, per-action — **every major player is migrating toward this.** We launched there on day 1. Outcome pricing (#60) is the right next step. It stays gated until we have margin data (≥28% gross), but the direction is confirmed by Salesforce, Intercom, and Stripe themselves.

**Action:** Don't second-guess pricing. Stay on the curve.

### **2. The warmth window is narrow — use it now.**
Monday/Notion/ClickUp all now talk about "agents as team members." We've had named personalities and a family narrative since Day 1 (Pixar 3D, family names). That emotional layer is *stronger* than corporate "agent platform" language — **but the window where we look differentiated (not just different) is shrinking** as everyone humanises their UX.

**Action:** Differentiate on warmth *now*. Record real demo (Week 1 / item #21). Use the Pixar family in every asset. When everyone has agents, personality is the moat.

### **3. MCP is being pulled forward — it's distribution, not just product.**
Glean, Notion, Linear, Salesforce are all wiring MCP natively. Item #59 (MCP server) was Month 3. **Given this market signal, it moves to Month 2.** Being MCP-compatible means other tools' agents can call K.I.N.D without a K.I.N.D sales team. That is **free distribution.**

**Action:** Month 2, build one MCP endpoint: "Start a FIGSY campaign." A Notion/Linear bot can trigger a K.I.N.D outreach campaign by calling one tool. No UI, no sales call needed.

### **4. Our defensible lane is specialisation, not breadth.**
Monday and ClickUp are building general-purpose platforms. We're building a specialised revenue team: African market data, POPIA compliance, $20 entry point, named family agents. **They cannot replicate the data moat or compliance posture without years of presence.**

**Action:** Hold specialisation. Don't try to match Monday's breadth. Own the revenue-team lane so deeply that generalists can't catch up.

### **5. The risk is speed, not direction.**
K.I.N.D's product direction is correct — the market is validating it in real time. **The danger is the window where a small fast team can build what the big players haven't yet shipped into our market. That window is shrinking.** DENISE (#54) is the highest-value next build because she extends the existing FIGSY pipeline (no new front opened, max leverage).

**Action:** Build deep, not wide. One agent at a time, fully. DENISE first (Month 3).

---

## 📅 MASTER TIMELINE — EVERY BUILD, DATED

Owner: 🧍 Founder · 🤖 Claude · 🤝 Both

### **PHASE 1: PRE-LAUNCH (Mon 8 → Fri 19 Jun)**

| Date | Item # | What | Owner | Why |
|------|--------|------|-------|-----|
| **Mon 8** | **D1–D5** | **Deliverability code fixes:** List-Unsubscribe + one-click unsubscribe · plain-text MIME · fix tracking pixel · configurable cold-FROM · transactional headers | 🤖 | Mail going to spam (verified). Long pole. |
| **Mon 8** | **Mon–Sun** | **Buy 1–2 cold domains** (lookalikes) · SPF/DKIM/DMARC · verify Resend · **START warmup** (5–10 → 30–50/day over 2–3 wks) · verify `API_URL` · verify get-kind.com auth | 🧍 | `get-kind.com` = transactional only. Cold = separate domain(s). |
| **Mon 8** | **#1** | **TIER-0 credential rotation** (Stripe secret, Supabase service-role, DATABASE_URL, anon, Anthropic, Resend×2, HubSpot, Admin secret, Stripe webhook; Apollo ✅ done) | 🧍 | Security. Finish by Tue 9. |
| **Tue 9** | **#6** | Migration `010_crm_dedup.sql` | 🧍 | CRM deduping before real clients. |
| **Tue 9** | **#7** | Denise Stripe $99/mo price → `STRIPE_PRICE_DENISE_MONTHLY` on Railway + redeploy | 🧍 | Needed for T5 smoke test (billing). |
| **Tue 9** | **#7/8** | DNS: `app`/`api`/`admin`/`status`.get-kind.com (Railway CNAME) → update `NEXT_PUBLIC_API_URL` + Resend webhook | 🧍 | Routing. |
| **Tue 9** | **#2** | Delete dormant Portal-V2 build + `FEATURE_PORTAL_V2` flag (currently breaks if flipped) | 🤖 | Risk mitigation. |
| **Tue 9** | **Deploy pipeline** | Fix "KIND System Audit" GitHub Action (fails every push, blocks Railway auto-deploy) | 🤖 | CI/CD reliability. |
| **Tue 9** | **CAL-min** | `booking_url` paste field (non-Google calendar clients) | 🤖 | T3/T4 smoke tests need this. |
| **Tue 9** | **P-a** | "Sign emails as {name}" setting (stop AI-invented signers) | 🤖 | UX. |
| **Tue 9** | **P-b** | Strip `BUILD MARKER` line (`index.ts:165`) | 🤖 | Debug cleanup. |
| **Tue 9** | **Smoke Test 1A** | T1 (fresh email) · T2 (steps 8–9) · T3 (steps 10–13, incl. pause→no send) | 🧍 | Paid path verification begins. |
| **Wed 10** | **Smoke Test 1B** | T4 (booking+KPI) · T5 (billing: single-charge, idempotency, Milla 403) · T6 (Vida widget) · T7 (Milla cron leak) | 🧍 | Finish Smoke Test 1. |
| **Wed 10** | **#17** | Fix any Smoke Test 1 failures same-day | 🤖 | Speed. |
| **Fri 12** | **C1–C7** | **Cosmetics:** ICP-above-People · agent-card consistency · ICP banner copy · agent panels→FIGSY layout · ClickUp signup · New-ICP scroll fix · "Est. Pipeline Value" relabel | 🤖 | Polish before launch. |
| **Fri 12** | **VIDA-11** | Vida in-portal help bubble (basic: bottom-right, reuse embed) | 🤖 | Day-1 self-serve support. |
| **Sat 13** | **Smoke Test 2** | Full re-run T1–T7, green | 🤝 | Verification. |
| **Sun 14** | **Legal** | ICO £40 · SR01 suppression · registered office + service address · WHOIS privacy · LinkedIn lockdown · Calendly verify · `version.txt` deploy marker | 🧍 | Compliance + safety. |
| **Sun 14** | **D9** | Inbox-placement test (mail-tester / GlockApps) → verify 10/10 → fix gaps | 🤖 | Deliverability gate. |
| **Mon 15** | **Buffer** | Slip absorption, re-runs, spillover | 🤝 | Risk mitigation. |
| **Tue 16** | **Dress rehearsal** | Fresh signup (not dogfood) → ICP → leads → campaign → reply → verify · check warmup status | 🤝 | Live test. |
| **Wed 17** | **Final fixes** | Any remaining issues · prep launch campaigns (ramp strategy) | 🤝 | Spillover. |
| **Thu 18** | **Go/No-Go** | Deliverability 10/10 ✅, Smoke Test 2 green ✅, all founder items ✅ → sign off | 🤝 | Release gate. |
| **Fri 19** | 🚀 **LAUNCH** | Both markets — transactional live from `get-kind.com`; cold ramped from warmup domain | 🚀 | **THE DAY.** |

### **PHASE 2: WEEK 1 POST-LAUNCH (Jun 19–28)**

| Item # | What | Owner | Why |
|--------|------|-------|-----|
| **#17** | 10 warm outreach messages (network) | 🧍 | Seed launches, accelerate launches. |
| **#18** | LinkedIn content 1/day via anonymous brand handle | 🧍 | Thought leadership. |
| **#19** | Activate LinkedIn outreach — run `20260602_linkedin_queue.sql` + PhantomBuster keys | 🧍 | Distribution unlock (LinkedIn cold outreach backend is built). |
| **#20** | Start Meta/WhatsApp Business API application (3–7 day window) | 🧍 | Pipeline for Month 2. |
| **#21** | Record real product demo ("shoot once, cut many", 16:9 + 9:16) | 🧍 | Asset for social + website. Use Pixar family prominently (warmth moat). |
| **#22** | #44 Replace homepage hero animation with real product loop | 🤖 (blocked on #21) | Authenticity > animation. |
| **#23** | Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid) | 🤝 | Data for Month 2 strategy. |
| **#24** | Activate dogfood self-outreach engine + point FIGSY at competitor-switcher ICP | 🧍 | Eat our own dogfood. Prove the product. |
| **#25** | Daily client briefing email (Apex steal) | 🤖 | Quick win. Apex insight. |
| **#26** | One pre-launch fresh-signup check (smoke test used dogfood) | 🧍 | Verify real onboarding path. |

### **PHASE 3: WEEKS 2–4 (Jun 29 – Jul 19)**

| Item # | What | Owner | Why |
|--------|------|-------|-----|
| **#27** | Open 2 design-partner slots (case study + logo) | 🧍 | Social proof + revenue. |
| **#28** | Cut social content from demo footage (9:16) | 🤖 | TikTok/Reels asset. |
| **#29** | Record 3 onboarding Loom videos | 🧍 | Customer education. |
| **#30** | Onboarding v2 + day-0/3/7 email sequence | 🤖 | Reduce churn (Revio insight). |
| **#31** | Populate proof block + homepage outcome numbers with REAL data (#62c) | 🤖 | No fabrication. Wait for first results. |
| **#32** | Activate Flutterwave (needs key — ZAR/NGN/KES/GHS) | 🧍 | Africa-first revenue. |
| **#33** | Launch YouTube channel (10-video plan exists) | 🧍 | Long-tail SEO. |
| **#34** | Wire playbook email form (ConvertKit/Mailchimp) | 🤖 | Lead magnet. |
| **#35** | #61a/g Performance-guarantee clause in terms.html + ToS update | 🤖 | Atlas steal. "90-day results or you don't pay" framing. |
| **#36** | #61e Atlas steal — influencer/community distribution (find our Dan-Martell) | 🧍 | Distribution moat. SA + US equiv. Worth more than seed round. |
| **#37** | #61g Atlas steal — sharpen guarantee language | 🤖 | Messaging. |
| **#38** | #62b Revio steal — bundle "Revenue Playbook Session" (30-min) into onboarding | 🤖 | Coaching layer. Reduces churn. Revio moat. |
| **#39** | Scheduled report emails (S4 steal) | 🤖 | Weekly digest. Engagement. |

### **PHASE 4: MONTH 2 (Late Jul – Aug, GATED: 10+ clients)**

**PREREQUISITE:** Set up staging environment before any V2 touches main (Part 4B — Supabase `kind-staging`, Railway staging services, `staging` branch, auto-deploy on push).

#### **Intelligence Layer (#37–53 + #59)**
| Item # | What | Why | Competitive Signal |
|--------|------|-----|-------------------|
| **#37** | Intent signal detection | Signal which leads are *ready to buy* (not just interested). | Amplemarket moat. Reduce wasted outreach. |
| **#38** | A/B subject testing | Test subject lines (FIGSY picks the winner automatically). | Monday/ClickUp testing. Personalisation = conversion. |
| **#39** | Client morning-brief email | Daily summary: lead activity, reply rates, anomalies (Apex/S4 steal). | Engagement hook. Brings clients back to portal. |
| **#40** | ICP auto-refinement (L2 learning layer) | Monthly AI review: "your replies came from these verticals / these company sizes." Refine ICP without user touching builder. | Glean's "context wins" + our outcome data moat. |
| **#41** | Conditional sequence branching | "If no reply in 5 days, branch to escalation." | Monday/ClickUp automation. Reduces manual work. |
| **#42** | Waterfall enrichment (Apollo → PDL → Hunter → Clearbit) | Fallback pipeline when Apollo returns <200 leads. | Clay insight. Enterprise richness for SMB price. |
| **#43** | Deliverability dashboard (SPF/DKIM/DMARC + bounce + blacklist) | Real-time deliverability monitoring. | Monday insight. Transparency = trust. |
| **#44** | Email score pre-send | AI scores subject + body for spam signal before send. | MailerLite moat. Reduce complaints. |
| **#45** | Adaptive send volume | Ramp sends based on reply rate (not fixed 20/day). | Instantly moat. Responsive to feedback. |
| **#46** | **FIGSY Memory v2 (pgvector)** | Semantic embeddings (episodic / long-term / preference). | Our moat. L2 learning needs pgvector. Build at 10+ clients. |
| **#47** | Milla full-context CRM pull | Milla reads client's Pipedrive/HubSpot history when writing. | Glean moment. Context always wins. |
| **#48** | Vapi voice calling | FIGSY can dial prospects (warm follow-up). | Atlas/Revio moat. Voice = higher conversion. Optional / premium. |
| **#49** | Product Hunt launch (with proof) | Launch with 2–3 design-partner case studies. | Proof moat. Network effect. |
| **#50** | G2 listing (5 reviews) | Build social proof. | SMB buying signal. |
| **#51** | Configurable agent triggers | "Send after X days without reply." "Escalate if human reply." | Monday/ClickUp. Power users unlock value. |
| **#52** | Multi-model toggle per campaign | "Use Opus for this ICP, Sonnet for this one." | Experimentation. Cost optimisation. |
| **#53** | Inbox rotation / multiple sending domains (Instantly steal) | Auto-rotate which domain sends next message (evades spam filters). | Instantly moat. Deliverability on steroids. |
| **#59 (pulled fwd)** | **MCP server** (distribution unlock) | Expose one endpoint: "Start a FIGSY campaign." Notion/Linear/Slack agents call it — no K.I.N.D UI. | **MCP is distribution.** Glean/Notion/Linear all wired it. We need it. Month 2, not Month 3. |

#### **V2 Portal Redesign (#V2-1 through #V2-13)**
| Item | What | Why | Competitive Signal |
|------|------|-----|-------------------|
| **V2-1** | Agent card grid (dashboard home) | Replace dashboard left-nav + empty space. Show all 4 agents in a card grid. | Monday/ClickUp clean layout. High. |
| **V2-2** | Agent thinking/working state | Show when FIGSY/Milla is working ("Writing 17 emails…", "Parsing reply…"). | ClickUp "Super Agents" insight. Transparency. High. |
| **V2-3** | Conversational agent setup | Instead of forms, chat with Casey (onboarding agent): "Tell me your ICP" → agent asks clarifying questions. | ClickUp/Notion + Revio coaching. Medium. |
| **V2-4** | Structured agent config panel (Role/ICP/Tone/Schedule/Knowledge) | Clean cards for each agent setting. Replace dense text inputs. | Monday/ClickUp. Medium. |
| **V2-5** | Agent marketplace ("Meet your AI Revenue Team") | Month 3+. Show all agents, what each does, cross-sell. | Salesforce AgentExchange. Month 3 (gated on volume). |
| **V2-6** | Slim sidebar + top-right header | Move Profile/Billing/Settings/Team to top-right dropdown. Sidebar shows nav only. | Notion/Linear slim layout. High. |
| **V2-7** | Invite teammate (growth loop) | "Invite your co-founder" modal in header. Referral structure. | Monday growth. High. |
| **V2-8** | **AI Notetaker → action items (Milla)** | Milla reads all portal activity (leads, replies, activity) → nightly email: "Here's what your team did, here are 3 actions." | Glean moment. AI reads your activity, tells you what to do. Critical. |
| **V2-9** | **Teams Hub (members, activity, per-person usage)** | See who on your team is using FIGSY/Milla/Vida, how many leads/campaigns each. Admin oversight. | Linear/Notion team features. Critical. |
| **V2-10** | **Casey — Onboarding agent** (non-family, portal-only) | Dedicated warm bot (not FIGSY/Milla/Vida — separate identity, ClickUp-style). Guides setup: biz profile → ICP → first leads → first campaign. Portal only (never on website). Warm Pixar 3D style. Has `casey.png`. | ClickUp's approach (specialist per role). Revio's coaching model. High. |
| **V2-11** | **Vida in-portal help bubble** (pulled forward, basic pre-launch Fri 12) | Bottom-right corner, always visible. Reuses existing Vida embed. Month 2 = deep integration (context-aware, pulls live data). | Support moat. Reduces TTSR. Critical. |
| **V2-12** | **Strong client dashboards (Monday-style)** | Replace current sparse leads page. Show: ICP cards (active, paused, archived) · campaign performance (sent, replied, booked) · pipeline value (with "Est." label) · credit usage · month-over-month trends. | Monday's dashboard density. V2 priority. |
| **V2-13** | **Multi-provider calendar** (Outlook/Zoho OAuth + agent-led onboarding) | **(a)** Full OAuth for Outlook, Zoho, Calendly native, Microsoft Exchange. **(b)** During onboarding, Casey asks "Do you use Google, Outlook, Zoho?" and guides OAuth. | Non-Google clients unlocked. Month 2 feature gap. Critical. |

### **PHASE 5: MONTH 3 (Late Aug – Sep, GATED: family build + margin data)**

| Item # | What | Why | Competitive Signal |
|--------|------|-----|-------------------|
| **#54** | **DENISE deep build (#1 next agent)** — Calendly auto-book · call-join transcription/notetaker · live objection extraction · proposal-from-transcript · pipeline follow-up · persona/system prompt · admin card. Build deep or don't ship. | Closes FIGSY → booked seam. Max leverage (no new front opened). Extends existing pipeline. | Monday/ClickUp "meet booked" → close. Atlas/Revio booked → revenue. DENISE = our answer. #1. |
| **#55** | **LENA** (Month 3, not Month 1) | Once DENISE is solid. | Broadens agent family. |
| **#56** | **OTTO** (Month 3, not Month 1) | Once LENA is solid. | Closes the operations loop. |
| **#57** | Multi-agent orchestration (shared memory) | FIGSY → DENISE → Milla (handoff + context). | Monday/ClickUp multi-agent orchestration. Platform moat. |
| **#58** | 500+ FIGSY skill library | Prompt library. "Open doors with competitive intel." "Negotiate discounts." Etc. | ClickUp 500+ work skills. Depth. |
| **#60** | **Outcome pricing** (per meeting booked) — GATED on ≥28% gross margin | Build only after margin data proves it works. Pure outcome model ($40/meeting, K.I.N.D eats failed outreach). | Salesforce + Intercom proved the model. We're ready to move toward it. Gated on data. |
| **#61** | Mobile app (iOS + Android) | Nice-to-have. Build if MRR >£8K. | Competitive hygiene. Month 3+. |
| **#62** | Built-in CRM (persistent prospect DB / Kanban deal view) | FIGSY stores every prospect she touches. Clients see Kanban (leads → replied → booked → closed). | Monday/ClickUp/Linear integrated CRM. Nice-to-have. |
| **V2-5** | Agent marketplace ("Meet your AI Revenue Team") | Show all agents, what each does, why you'd use them together. | Salesforce AgentExchange. Month 3+. |
| **#63** | Pan-African design partners (NG/KE/GH/EG/RW) | Deepen regional presence. | Our specialisation lane. Month 3. |
| **#64** | Platform-level cross-client intelligence (L4 moat) | Benchmarks: "You're in the 80th percentile for reply rate in your vertical." Predictive ICP. | Glean's enterprise moat, adapted to SMB. Our real long-term differentiation. Year 2+. |
| **#65** | Data licensing marketplace | Sell anonymised outcome data (reply rates, angles, verticals, regions). | New revenue stream. Year 2+. Gated on data volume + ethics review. |
| **#66** | ICP auto-refinement advanced (L3) | Real-time: as replies come in, refine ICP automatically. | Data moat. Year 2+. |
| **#67** | Pipeline forecasting | "Given reply rate + deal size, you'll close X by Q4." | Linear insight (product intelligence). Year 2+. |
| **#68** | In-portal messaging | Slack-style chat for team (FIGSY, Milla, humans, clients can chat). | Monday/Notion. Year 2+. |
| **#69** | Proposal + e-sign | DENISE drafts proposal from call; client signs in portal. | Salesforce moat. Year 2+. |
| **#70** | Meeting notetaker | Auto-transcribe Zoom (client + prospect). Extract objections live. | Glean/Linear moat. Year 2+. |

### **PHASE 6: YEAR 2 (Enterprise)**

| Item # | What | Why |
|--------|------|-----|
| **#71–74** | ISO 27001 + 42001 + SOC 2 Type II via Vanta | Enterprise compliance. ~£70K total. | 
| **#75** | 3-type memory model (episodic / long-term / preference) | Sophistication (after pgvector foundation, Month 2). |
| **#76** | Visitor de-anonymisation (Clearbit) | See who's on the website before they sign up. |
| **#77–79** | Churn-risk scoring · revenue forecasting · call intelligence | Data layer sophistication. |

---

## 🔐 THE MOAT — What Actually Defends K.I.N.D

Three layers, in order of defensibility:

### **Layer 1: Specialisation (RIGHT NOW)**
- African market data (POPIA + NDPR + DPA + CCPA compliance baked in from day 1)
- $20 entry point (lowest price in market)
- Named family agents (Pixar 3D, founded-by-family storyline)
- **Moat:** Generalists (Monday/ClickUp) can't replicate this without years of regional presence

### **Layer 2: Outcome Data (Month 2–3, GATED: 10+ clients)**
- Append-only raw log of every send, reply, deal outcome, by angle/vertical/region
- L2 learning (monthly ICP auto-refinement based on actual replies)
- L3 adaptive (real-time A/B per campaign)
- **Moat:** This data is *cross-client* (unlike Glean, which is per-customer). Every client makes the platform smarter for the next one in their vertical. Network effect.

### **Layer 3: Platform Intelligence (Year 2, GATED: 50+ clients)**
- L4 benchmarks ("Your reply rate is 8.2%, SA average is 6.4%")
- Predictive ICP ("Given your deal size + reply rate, you'll close X in Q3")
- Revenue forecasting
- **Moat:** Nobody else has outcome data + SMB vertical penetration + compliance depth. Unique.

---

## 💰 FUNDING STRATEGY (Decided 5 Jun, DO NOT CHANGE)

**THE DECISION: Bootstrap to traction first. Do not chase funding yet.**

Why: K.I.N.D is lean, software-only, $29/mo self-serve, near-zero marginal cost. Atlas runs 74 employees burning hard *pre-revenue* — only works because they raised. We can reach ramen-profitability without diluting.

**Routes, in priority order:**
1. **F1 (NOW):** Free cloud/AI credits (Microsoft/Google/AWS) — tens of $K, zero downside. Extends runway. Do this week.
2. **F2 (5–10 clients):** SA ecosystem (Grindstone, Startupbootcamp AfriTech, Endeavor) — low/no equity. Cape Town base is advantage.
3. **F3 (paying clients):** YC / remote accelerators — ~7% standard. We fit thesis.
4. **F4 (predictable MRR):** Revenue-based financing (no dilution, debt model) — better SaaS fit than VC.
5. **F5 (ongoing):** Influencer lever (find our Dan-Martell equivalent) — worth more than seed round.

**Tension to resolve:** Fundraising requires reputation. You can pitch under your real name in investor meetings while keeping the K.I.N.D brand faceless. Do not try to raise while invisible to *everyone*. Separate the two: invisible to customers, visible to investors (when/if needed).

**Revisit decision at 20–30 paying clients.** From leverage, not need.

---

## 🚨 CRITICAL PATHS (CANNOT SHIP WITHOUT THESE)

1. **Deliverability (long pole, Mon 8 – Sun 14)** — mail to spam = launch failure. Warmup domain + DNS + code fixes + 10/10 inbox-placement test. Non-negotiable.

2. **Smoke Test 1 + 2 (Tue 9 – Sat 13)** — one real failure un-fixed = launch blocker. T1 fresh signup (never tested), T2–T7 full path. Must be green.

3. **MCP Month 2 (ASAP after 10 clients)** — market signal is strong. Glean/Notion/Linear all wired it. We need it or we're leaving distribution on the table.

4. **DENISE Month 3 (#54)** — extends FIGSY pipeline at the seam (booked → close). Highest leverage next agent. Build deep or don't ship.

---

## 🎯 SUCCESS CRITERIA (What "Done" Looks Like)

### **Launch (Fri 19 Jun)**
- ✅ Deliverability 10/10 (mail-tester score)
- ✅ Smoke Test 2 green (T1–T7 all pass)
- ✅ Fresh signup path works end-to-end
- ✅ FIGSY sends + prospect replies + reply classified 🔥 Hot
- ✅ Founder can onboard & demo to a real prospect

### **Month 1 (by mid-Jul)**
- ✅ 5 clients (break-even all-in)
- ✅ ~£2.5K MRR from design partners
- ✅ Real demo recorded (Week 1 item #21)
- ✅ LinkedIn content live (1/day)

### **Month 2 (by mid-Aug)**
- ✅ 10+ clients (gated: Intelligence Layer + MCP + V2 portal start)
- ✅ ~£12K MRR
- ✅ Product Hunt launch
- ✅ MCP server live (one endpoint: "Start FIGSY campaign")
- ✅ V2 portal redesign 50% complete

### **Month 3 (by mid-Sep)**
- ✅ 50 clients
- ✅ ~£40K MRR
- ✅ DENISE deep build complete (Calendly + notetaker + proposal + follow-up)
- ✅ L2 learning live (ICP auto-refinement working)
- ✅ Data shows ≥28% gross margin (outcome pricing unlocked)

---

## 📋 EVERYTHING BUILT (don't rebuild)

**Platform:** Supabase RLS, auth (no email-confirm), 16 crons, TSC clean.
**Lead Gen:** ICP builder, AI ICP Suggest, website scan, Apollo 3-pass, Claude scoring, opt-out blocklist, POPIA consent, first-leads email, weekly digest, drip 10/day, CRM dedup (HubSpot/Pipedrive).
**FIGSY:** 19 API endpoints, campaign CRUD, 3-step sequences, reply classification, FIGSY Memory, Unibox two-way, opt-out, CRM push, escalation, identity card, weekly digest, paused_low_performance, self-outreach cron. **Inbound reply pipeline:** Resend inbound, Svix auth, body fetch, classification to 🔥 Hot.
**Milla:** doc RAG + source attribution (subscription wired).
**Vida:** config/embed/WhatsApp (subscription wired).
**Billing:** Stripe credit + subscriptions, auto-topup, trial overlay, credits-at-delivery, overspend fix, low-credit warning.
**Admin (13 routes)** + **Portal (15 routes)** + **Website (30+ pages)** + **PWA**.
**LinkedIn outreach backend:** Built, activates Week 1.

---

## 🚫 WILL NOT BUILD

Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts · 50+ data sources (before 50+ clients) · African-language (after WhatsApp).

---

## 🔄 WHAT TO STEAL (ITEMS #61–62, COMPETITIONS' PLAYBOOKS)

### **Atlas Steals (#61a–g)**
| # | What | How | Your Edge |
|---|------|-----|-----------|
| **#61a** | 90-day performance guarantee ("results or don't pay") | Put it in terms.html + ToS. Founder signs off visibly. | Ours is credit-based (less risk than DFY). Messaging is confidence. |
| **#61b** | "$20" as the one number you own | Entry price everyone remembers. Landing pages, pricing, deck, everywhere. | True entry price (pay-per-result). Atlas is $5,000. Ours is 250x cheaper. |
| **#61c** | "Clone yourself" narrative | FIGSY learns your voice → writes emails like you. | Original copy. Atlas positioning. We've had it since day 1. Use it more. |
| **#61d** | Cold CRM re-engagement angle | "The list you gave up on is still worth money. FIGSY warms them." | Revio's list freshness insight. We own it better (autonomous, not co-pilot). |
| **#61e** | Influencer distribution (find our Dan-Martell) | Atlas + Revio both grew on 1 person (Dan Martell: SaaS Academy, Buy Back Your Time). | Find the SA equiv (5–10 person network who know SMB leaders) + US equiv. Worth more than seed round. |
| **#61f** | ROI calculator | User enters own leads + deal value → calculator shows revenue lost to slow follow-up + upside if FIGSY closes 8%. | Atlas tool. We have it (`pipeline-calculator.html`). Use it on landing pages. Lead magnet. |
| **#61g** | Guarantee sharpened from 30d to 90d | "90 days gives enough campaign data to show results. Stronger signal than 30 days." | Revio insight (outcomes take time to measure). |

### **Revio Steals (#62a–e)**
| # | What | How | Your Edge |
|---|------|-----|-----------|
| **#62a** | "Trained on closed-won deals" credibility hook | FIGSY: "trained on your business, your ICP, every campaign." Denise: "trained on relationship selling + your closed-won deals." | Original copy. Real training (no fake numbers). Populate real numbers as data comes in. |
| **#62b** | Coaching layer bundled into onboarding | "Revenue Playbook Session" (30-min call): founder or Casey guides client through campaign setup, ICP, first sequence. Reduces churn (Revio's insight). | Revio = human coaching ($500/mo). Ours = AI (Casey) + optional founder call. Scales better. |
| **#62c** | Homepage outcome numbers | 2–3 concrete stats: "30,065 leads last month" specificity. Do NOT fabricate — hold the slot, populate when real. | Revio case study detail. We're honest (no fakes). Population with real data Month 2+. |
| **#62d** | "Revenue Blueprint Session" demo framing | Renamed all 29 demo CTAs: "Book a Demo" → "Book a Revenue Blueprint Session." | ✅ Already done. Messaging shift. |
| **#62e** | Vertical landing pages + case studies | Estate agents, insurance brokers, financial advisers (Africa-specific + US equivalents). Each with pain + FIGSY solution + compliance note. | ✅ Already done (Africa: 3 verticals). US Month 2. Revio strategy (own the niche). |

---

## 🎬 FINAL NOTE: WHAT'S DIFFERENT ABOUT K.I.N.D

In a market where:
- **Glean** = enterprise context layer ($7.2B — not for us)
- **Monday/ClickUp** = general-purpose agent platforms (we can't compete on breadth)
- **Atlas/Revio** = done-for-you / creator-specific (different buyers)

**K.I.N.D** is:
- **Specialised revenue team** (not a platform that does everything)
- **$29/mo self-serve** (not $5,000+ or $500+)
- **Outcome-driven** (not seat-based)
- **Regional moat** (African market data + compliance)
- **Warm + human** (named family agents, Pixar, founded-by-family) — while everyone else talks about "AI coworkers," we talk about "your sales team"
- **Data moat** (cross-client outcome learning, not per-customer isolation)

**The window is closing.** Big players are humanising agents. Get the warmth + specialisation right *now*, before that becomes table stakes.

---

**Document Version:** 7 Jun 2026, 12:00 UTC
**Next Update:** After Smoke Test 2 passes (expected Sat 13 Jun)
**Audience:** Founder, Claude (session context), occasional investors / accelerators / advisors

# ═══════════════════════════════════════════════════════════════
# CHAPTER 2 — DAILY ACTION PLAN (MON 8 → FRI 19 JUN)
# ═══════════════════════════════════════════════════════════════


> **Working document.** Updated daily. What you do, what Claude does, blocking order.
> Assume we are starting **Mon 8 Jun** at 08:00 UTC.
> Launch date: **Fri 19 Jun** (firm, 12-day countdown).

---

## 🗺️ CURRENT STATE (as of end of 7 Jun / start of Mon 8 Jun)

### ✅ SHIPPING (verified on `main` / deployed to Railway)
- Apollo email enrichment (bulk_match by id) — real emails now delivered
- FIGSY inbound reply pipeline — end-to-end working, 🔥 Hot classification verified live
- Compliance suppression guard — hard-coded at all 6 outreach paths
- ICP run async — portal 15s timeout fixed
- Schema drift — lead_status ENUM reconciled on live DB
- Auto-outreach gating — `AUTO_OUTREACH_ENABLED=true` default OFF

### 🔴 BLOCKING NEXT 5 DAYS
1. **Deliverability (D1–D5 code + D6–D8 founder infra) — THE LONG POLE**
   - Code: List-Unsubscribe header + one-click unsubscribe · plain-text MIME · tracking pixel fix · cold-FROM config · transactional headers
   - Founder: Buy cold domain(s) · SPF/DKIM/DMARC · start warmup (5–10 → 30–50/day) · verify `API_URL` + get-kind.com auth
   - Gate: Nothing launches without 10/10 inbox-placement test (Sun 14 evening)

2. **Smoke Test 1A (Tue 9) — T1, T2, T3 partial**
   - Gate: BLOCKING Tue 9. Cannot wait.
   - Needs: `booking_url` paste field (CAL-min, Tue 9), Denise Stripe price (Tue 9)

3. **TIER-0 credential rotation (Mon 8 → Tue 9)**
   - Gate: Finish all 9 keys by Tue 9 (Apollo already rotated 6 Jun)

### ⬜ NOT DONE YET (Smoke Test 1 / 2)
- T1 fresh signup (never run end-to-end — used dogfood account so far)
- T3 step 13 (pause campaign → verify no send)
- T4 booking + KPI increment
- T5 Stripe billing (single charge, webhook idempotency, Milla 403)
- T6 Vida widget
- T7 Milla cron hygiene
- Full Smoke Test 2 (complete re-run)

---

## 📋 DAILY BREAKDOWN (Mon 8 → Fri 19)

### **🚨 MON 8 JUN — START**

#### Owner: 🧍 YOU (founder)
| Task | What | File/Action | Timeline | Blocker? |
|------|------|------------|----------|----------|
| **D6–D8** | **Buy 1–2 cold domains** (lookalikes for outreach) | E.g., `get-kind-outreach.com` or similar. Register on GoDaddy/Namecheap. | Today | **YES — warmup ramp starts NOW (2–3 wks before Fri 19)** |
| **D6–D8** | **SPF record for cold domain** | `v=spf1 include:_spf.resend.com ~all` | Today | YES — DNS propagation takes 24h |
| **D6–D8** | **DKIM for cold domain** | Ask Resend for DKIM public key, add to DNS `resend._domainkey.get-kind-outreach.com` → Verify in Resend | Today | YES — DNS |
| **D6–D8** | **DMARC for cold domain** | `v=DMARC1; p=none; rua=mailto:dmarc@...` (start in monitoring mode) | Today | YES — DNS |
| **D6–D8** | **Verify `get-kind.com` auth** (transactional domain) | Check Resend shows `get-kind.com` verified for both SPF + DKIM | Today | YES — no sending until confirmed |
| **D6–D8** | **Verify `API_URL` environment variable** | Check Railway API service: `NEXT_PUBLIC_API_URL` = `https://api.get-kind.com` (or whatever DNS resolves to) | Today | YES — portal routing |
| **#1 cred rotation** | Rotate: `STRIPE_SECRET_KEY` | New key from Stripe dashboard → add to Railway API service | Today | YES (9 keys) — finish by Tue 9 |
| **#1 cred rotation** | Rotate: `SUPABASE_SERVICE_ROLE_KEY` | New key from Supabase project settings → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `DATABASE_URL` password | Supabase `Connection pooling` tab → get new password string → update Railway `DATABASE_URL` | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `SUPABASE_ANON_KEY` | New from Supabase settings → Railway + Portal service | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `ANTHROPIC_API_KEY` | New from console.anthropic.com → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `RESEND_API_KEY` (live key) | New from Resend dashboard → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `RESEND_WEBHOOK_SECRET` | New secret from Resend webhook config → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `HUBSPOT_API_KEY` | New from HubSpot settings → Railway | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `ADMIN_SECRET_KEY` | Generate new UUID → Railway API service | Today | YES (9 keys) |
| **#1 cred rotation** | Rotate: `STRIPE_WEBHOOK_SECRET` | New from Stripe webhook settings → Railway | Today | YES (9 keys) |
| **D6–D8** | **START warmup** | Configure email service to ramp cold domain: Day 1 = 5/day, Day 2 = 7/day, Day 3 = 10/day, ... Day 21 = 50/day. Monitor bounce rate + spam complaints. | **Start 8 Jun — run for 11 days** (until Fri 19) | **CRITICAL — determines launch deliverability** |
| **D6–D8** | **Log all actions** | Create a checklist file: `deliverability-checklist-mon8.txt` (which domains, which DNS records added, warmup volume by day) | EOD | No |

#### Owner: 🤖 CLAUDE (me)
| Task | What | File(s) to Edit | Timeline | Blocker? |
|------|------|-----------------|----------|----------|
| **D1–D5** | **List-Unsubscribe header** | `apps/api/src/routes/figsy.ts` line ~378 → add header: `List-Unsubscribe: <https://api.get-kind.com/leads/unsubscribe?email={email}>, <mailto:unsubscribe@get-kind.com?subject={email}>` | Today | **YES — required by Gmail/Yahoo since Feb 2024** |
| **D1–D5** | **One-click unsubscribe endpoint** | New route: `GET /leads/unsubscribe?email=X` → marks lead opted_out (RLS scoped) → returns "You've been unsubscribed" | Today | YES — RFC 8058 compliance |
| **D1–D5** | **Plain-text MIME part** | `figsy.ts` line ~363 → convert HTML template to multipart: `text/plain` + `text/html` (use `nodemailer.createTransport()` or Resend's multipart support) | Today | YES — Gmail/Yahoo require both |
| **D1–D5** | **Fix tracking pixel** | `figsy.ts` line ~363 → instead of raw Railway URL, use custom domain: `https://t.get-kind-outreach.com/p/X.gif` (domain alias to tracking service, not Railway internal) | Today | YES — phishing signal |
| **D1–D5** | **Configurable cold-FROM** | Add env var: `FIGSY_COLD_FROM_DOMAIN` (default = `hello@get-kind-outreach.com`) + `FIGSY_COLD_FROM_NAME` (default = "FIGSY Team"). Read in `figsy.ts` line ~100. | Today | YES — separate cold + transactional |
| **D1–D5** | **Transactional headers** | Add headers to onboarding/support emails: `X-Priority: high`, `Importance: high`, remove tracking pixel from transactional, keep SPF alignment to `get-kind.com` | Today | YES — transactional ≠ cold |
| **Code test** | Quick local test: send to yourself at GmailOrOutlook. Verify: `List-Unsubscribe` header present, plain-text rendering, tracking pixel custom domain. | `curl -X POST http://localhost:4000/figsy/send-test` | Today PM | No (but good to check) |

#### **Status: Mon 8 — 17:00 UTC**
- Deliverability D1–D5: ⬜ Started, coding in progress
- Founder infra D6–D8: ⬜ Domains registered, DNS started (propagation pending), warmup ramp starting
- TIER-0 rotation: ⬜ 9 keys, 2 done, 7 in progress

---

### **🚨 TUE 9 JUN — SMOKE TEST 1A + CRITICAL INFRA**

#### Owner: 🧍 YOU (founder)
| Task | What | File/Action | Timeline | Blocker? |
|------|------|------------|----------|----------|
| **#1 finish** | Finish 9 TIER-0 key rotations | Last 3 keys (if not done Mon PM) | Morning | YES — unrotated keys = security risk |
| **#6** | Run migration `010_crm_dedup.sql` | Supabase SQL editor → `packages/db/src/migrations/010_crm_dedup.sql` → run in production DB | Morning | YES — T5 smoke test (billing) needs CRM dedup |
| **#7** | Create Denise Stripe price | Stripe dashboard → Products → KIND → create new price: `$99 USD / month, recurring` → note the price ID (e.g., `price_1QkXxxx`) | Morning | YES — T5 needs `STRIPE_PRICE_DENISE_MONTHLY` |
| **#7** | Add Denise price to Railway | Railway `@kind/api` service → Env vars → add `STRIPE_PRICE_DENISE_MONTHLY=price_1QkXxxx` → redeploy | Morning | YES — billing test needs this |
| **#7/8** | DNS: `app.get-kind.com` | GoDaddy: create CNAME `app` → Railway `<railway-url>` (ask Railway for production domain target) | Morning | YES — portal routing |
| **#7/8** | DNS: `api.get-kind.com` | GoDaddy: create CNAME `api` → Railway `<railway-url>` | Morning | YES — API routing |
| **#7/8** | DNS: `admin.get-kind.com` | GoDaddy: create CNAME `admin` → Railway `<railway-url>` | Morning | YES — Admin routing |
| **#7/8** | DNS: `status.get-kind.com` | GoDaddy: create CNAME `status` → Railway `<railway-url>` | Morning | YES — Status page routing |
| **#7/8** | Update `NEXT_PUBLIC_API_URL` Portal | Railway `@kind/portal` service → Env vars → `NEXT_PUBLIC_API_URL=https://api.get-kind.com` → redeploy | Morning | YES — portal API calls |
| **#7/8** | Update `NEXT_PUBLIC_API_URL` Admin | Railway `@kind/admin` service → Env vars → `NEXT_PUBLIC_API_URL=https://api.get-kind.com` → redeploy | Morning | YES — admin API calls |
| **#7/8** | Update Resend inbound webhook URL | Resend → Incoming email → Webhook → change URL from old to `https://api.get-kind.com/figsy/replies/inbound` → save | Morning | YES — reply routing |
| **Warmup check** | Verify warmup ramp Mon 8 → Tue 9 (should be at ~10/day by Tue AM) | Check email service logs (if available) or test mailbox. Monitor bounce rate. | Morning | No (monitoring only) |
| **Pre-test comms** | Send yourself a test email from `get-kind-outreach.com` to verify delivery (should go to inbox, not spam) | Use any email testing tool | Morning | No (verification) |

#### Owner: 🤖 CLAUDE (me)
| Task | What | File(s) to Edit | Timeline | Blocker? |
|------|------|-----------------|----------|----------|
| **CAL-min** | Add `booking_url` paste field | `apps/portal/src/app/(dashboard)/agents/[agentId]/settings.tsx` → add text input: "Your booking link (Calendly/Zoho/etc.)" → stores in agent settings `booking_url` → update Supabase schema if needed | Morning | **YES — T3/T4 tests need this** |
| **P-a** | "Sign emails as {name}" setting | `apps/portal/src/app/(dashboard)/agents/[agentId]/settings.tsx` → add text input: "Email signature name" (default = agent name) → pass to FIGSY prompt | Morning | No (cosmetic, but nice) |
| **P-b** | Strip `BUILD MARKER` debug | `apps/api/src/index.ts` line 165 → delete or comment out the `BUILD MARKER` console.log | Morning | No (cleanup) |
| **#2** | Delete dormant Portal-V2 build + flag | Delete `apps/portal/src/app/(dashboard)/v2/` folder (or mark 🚫 in README) · Remove `FEATURE_PORTAL_V2` env var from Railway. Check codebase for any references to the flag. | Morning | YES — if flag is on, it breaks live portal |
| **Deploy pipeline** | Investigate `KIND System Audit` GitHub Action | `.github/workflows/daily-audit.yml` → why does it fail on every push? Run locally, debug. Either fix it or make it non-blocking (doesn't stop deploy). | Morning | **YES — causes stale builds** |
| **Code review** | All D1–D5 changes (List-Unsubscribe, MIME, tracking, cold-FROM, headers) → test locally, push to branch. | Branches in PR, request review | Morning | No (parallel to Founder D6–D8) |
| **Deploy D1–D5 + CAL-min + P-a + P-b + #2** | Once all code merged, Railway auto-deploy or manual trigger | Verify on Railway logs that new code is live | Lunch time | YES — Smoke Test 1A needs all this |

#### **SMOKE TEST 1A — TUE 9 PM (or Wed 10 AM)**
| Test | What | Owner | Timeline | Pass/Fail? |
|------|------|-------|----------|-----------|
| **T1** | Fresh email signup → onboard → dashboard loads | 🧍 | Tue evening or Wed AM | ⬜ Not done yet |
| **T2 steps 8–9** | Set active ICP · CSV export | 🧍 | Tue evening | ⬜ Not done yet |
| **T3 steps 10–13** | FIGSY send campaign · recipient replies · reply arrives 🔥 Hot · pause campaign → send again → verify NO emails | 🧍 | Tue evening (or splits to Wed) | ⬜ Mostly done, step 13 todo |

#### **Status: Tue 9 — 17:00 UTC**
- Deliverability D1–D5: ✅ Deployed
- Founder infra D6–D8: ✅ DNS live, warmup ramping, Denise price added
- CAL-min: ✅ Deployed
- Smoke Test 1A: ⬜ In progress or complete

---

### **🚨 WED 10 JUN — SMOKE TEST 1B + FIXES**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline |
|------|------|----------|
| **T4** | Book a meeting (connect Google Cal or "Mark as booked") → verify `meetings_booked` increments | All day |
| **T5** | Stripe: buy credit bundle (test mode) → verify credits added once · replay webhook → verify no double-charge · Milla subscribe → verify unlock · non-subscriber → verify 403 | All day |
| **T6** | Vida widget: copy embed snippet → paste in test page → verify purple bubble renders · send test message → verify lead captured | All day |
| **T7** | Check Milla cron: non-Milla client should NOT receive morning briefs | All day |
| **Log results** | Document T4–T7 results: "T4-Step-14: ✅ Booked, meetings_booked=1" etc. | EOD |

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline | Blocker? |
|------|------|----------|----------|
| **#17** | Fix any Smoke Test 1 failures **same-day** (speed is critical) | As failures reported | YES — cannot move forward if red |
| **Code commit** | Commit all Tue work (D1–D5, CAL-min, P-a, P-b, #2, deploy-pipeline) | Wed AM | No |
| **Prepare cosmetics** | Review C1–C7 (Fri 12 batch). Sketch code changes needed. | Wed PM | No (prep only) |

#### **Status: Wed 10 — 17:00 UTC**
- Smoke Test 1: ⬜ Mostly complete (failures being fixed in parallel)
- Fixes: 🔁 Rolling (as issues surface)

---

### **🚨 THU 11 JUN — BUFFER + FINAL PREP**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline |
|------|------|----------|
| **Verify all fixes** | Rerun any failed Smoke Test 1 tests | Morning |
| **Check warmup progress** | Verify ramp at ~30–40/day by Thu (should be on track for 50/day by Fri) | Morning |
| **DNS cache flush** | Verify all four domains (`app`, `api`, `admin`, `status`) resolve to Railway | Morning |
| **Prepare launch strategy** | Decide: which 2–3 design partners to approach first? Which LinkedIn contacts to warm outreach? | All day |

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline | Blocker? |
|------|------|----------|----------|
| **Cosmetics C1–C7** | Implement all 7: ICP-above-People · agent card consistency · ICP banner · agent panels · ClickUp signup · New-ICP scroll · "Est. Pipeline Value" | All day | No (not blocking launch, but nice) |
| **VIDA-11** | Vida in-portal help bubble (bottom-right, reuse embed) | All day | No |
| **Code commit** | Commit cosmetics + VIDA-11 | EOD | No |

#### **Status: Thu 11 — 17:00 UTC**
- Smoke Test 1: ✅ All green
- Cosmetics: ⬜ Implemented, deployed
- Warmup: 🔄 On track

---

### **🚨 FRI 12 JUN — COSMETICS DEPLOYMENT**

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline |
|------|------|----------|
| **Deploy cosmetics** | Merge C1–C7 + VIDA-11 to `main` → Railway auto-deploys | Morning |
| **Verify UI** | Portal load → check: ICP above People, agent cards, "Est. Pipeline", Vida bubble all live | Morning |
| **Test Vida bubble** | Click Vida bubble → chatbot opens → ask test question → Vida responds | Morning |

#### **Status: Fri 12 — 17:00 UTC**
- Cosmetics: ✅ Live
- Portal UX: ✅ Polished

---

### **🚨 SAT 13 JUN — SMOKE TEST 2 (FULL RE-RUN)**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline | Pass gate? |
|------|------|----------|-----------|
| **Fresh email** | Sign up with NEW email (not dogfood) | Morning | YES — must be new email (T1) |
| **Full path T1–T7** | Signup → onboard → dashboard → build ICP → source leads → FIGSY send → recipient reply → book meeting → buy credits → Vida widget → verify Milla cron | All day | YES — all tests must be green |
| **Log results** | "Smoke Test 2: T1 ✅, T2 ✅, T3 ✅, T4 ✅, T5 ✅, T6 ✅, T7 ✅" | EOD | YES — go/no-go gate |

#### **Status: Sat 13 — 17:00 UTC**
- Smoke Test 2: ✅ GREEN (gate passed)

---

### **🚨 SUN 14 JUN — LEGAL + DELIVERABILITY FINAL**

#### Owner: 🧍 YOU (founder)
| Task | What | Timeline |
|------|------|----------|
| **#10** | ICO registration (ico.org.uk £40) | Morning |
| **#11** | SR01 home-address suppression (free form) | Morning |
| **#12** | Registered office + director service address (~£20–50) | Morning |
| **#13** | WHOIS privacy verify (GoDaddy) | Morning |
| **#14** | LinkedIn lockdown (private, no K.I.N.D on profile) | Morning |
| **#9** | Verify Calendly `kind-ai-demo/new-meeting` live + `version.txt` deploy marker | Morning |
| **Warmup check** | Verify ~50/day by Sun (ready for full launch) | Morning |
| **Backup plan** | If warmup not ready, shift launch date to Mon 22 (but don't) — should be ready | EOD |

#### Owner: 🤖 CLAUDE (me)
| Task | What | Timeline | Blocker? |
|------|------|----------|----------|
| **D9** | Inbox-placement test (mail-tester.com or GlockApps) | Morning | **MUST BE 10/10** |
| **Fix gaps** | If test <10/10, fix remaining issues (headers, auth alignment, etc.) | Morning → Afternoon | YES — go/no-go gate |
| **Final commit** | Commit all Sun changes → push to `main` | EOD | No |

#### **Status: Sun 14 — 17:00 UTC**
- Legal: ✅ All items done
- Deliverability: ✅ 10/10 verified
- **GO/NO-GO GATE: PASS**

---

### **🚨 MON 15 JUN — BUFFER (slip absorption)**

#### Owner: 🤝 Both
| Task | What | Timeline |
|------|------|----------|
| **Spillover** | Any remaining fixes from Sun evening | Morning |
| **Final check** | Redeploy if any last-minute code pushed | Morning |
| **Plan Wed launch** | If any issues, what's the mitigation? (delay to Mon 22? unlikely) | All day |

#### **Status: Mon 15 — 17:00 UTC**
- All tests: ✅ Green
- All legal: ✅ Done
- Deliverability: ✅ Verified

---

### **🚨 TUE 16 JUN — DRESS REHEARSAL**

#### Owner: 🤝 Both
| Task | What | Timeline | Owner |
|------|------|----------|-------|
| **Fresh signup** | Founder signs up with NEW email (not dogfood, not test) | Morning | 🧍 |
| **Full campaign** | Build real ICP → source leads → send FIGSY → verify reply arrives → book meeting | All day | 🤝 |
| **Warmup review** | Check bounce rate, spam complaints. If >5% bounce, investigate. | Morning | 🧍 |
| **Set AUTO_OUTREACH_ENABLED** | Turn to `true` on Railway (default OFF → ON for launch) | Lunch | 🧍 |
| **Final checklist** | Go/No-Go gates: deliverability ✅, Smoke Test 2 ✅, legal ✅, warmup ✅, AUTO_OUTREACH ✅ | EOD | 🤝 |

#### **Status: Tue 16 — 17:00 UTC**
- **GO/NO-GO DECISION READY**

---

### **🚨 WED 17 JUN — FINAL FIXES + LAUNCH PREP**

#### Owner: 🤝 Both
| Task | What | Timeline | Owner |
|------|------|----------|-------|
| **Fix any rehearsal issues** | Anything found in dress rehearsal → fix same-day | All day | 🤖 |
| **Prep launch campaigns** | Decide: Week 1 outreach list (10 warm contacts) + LinkedIn schedule (1/day posts) | All day | 🧍 |
| **Verify all systems** | Portal, API, website all live and responsive | Morning | 🤖 |
| **Currency check** | Verify all pricing in USD, not Rand, not mixed | Morning | 🤖 |

#### **Status: Wed 17 — 17:00 UTC**
- Ready for launch

---

### **🚨 THU 18 JUN — GO/NO-GO FINAL DECISION**

#### Owner: 🤝 Both
| Decision Point | Criteria | Status | Decision |
|---|---|---|---|
| **Deliverability** | Mail-tester 10/10 OR inbox consistently Inbox (not Spam/Promotions) | ✅ | GO |
| **Smoke Test 2** | All T1–T7 green | ✅ | GO |
| **Legal** | All #10–#14 done | ✅ | GO |
| **Warmup** | ~50/day ramped, bounce <5%, complaints <0.5% | ✅ | GO |
| **Schema** | No enum errors, CRM dedup working | ✅ | GO |
| **Founder sign-off** | "I'm confident we launch Fri 19" | ⬜ PENDING | ??? |

#### **DECISION: GO/NO-GO (Founder + Claude consensus)**

If ALL green: **LAUNCH FRI 19 ✅**
If ANY red: **DELAY TO MON 22** (no half-baked launch)

#### **Status: Thu 18 — 17:00 UTC**
- **LAUNCH DECISION MADE**

---

### **🚀 FRI 19 JUN — LAUNCH DAY**

#### Owner: 🤝 Both
| Task | What | Timeline | Owner |
|------|------|----------|-------|
| **Final deploy** | Verify latest code on Railway (no pending commits) | 08:00 | 🤖 |
| **Monitor systems** | API / Portal / Website all responsive (no 500 errors) | 08:00 | 🤖 |
| **Set AUTO_OUTREACH_ENABLED=true** | Cold emails now go out (if not already set Tue 16) | 08:00 | 🧍 |
| **Day 1 warmup check** | First warm outreach (10 network contacts) | 09:00 | 🧍 |
| **Monitor replies** | Watch for inbound prospects + Portal notifications | All day | 🧍 |
| **Commit launch marker** | Git commit: "🚀 Launch: Fri 19 Jun 2026" → push to main | 17:00 | 🤖 |
| **Celebrate** | You earned it | Evening | 🤝 |

#### **Status: Fri 19 — 17:00 UTC**
- 🚀 **LIVE**

---

## 🚨 CRITICAL DEPENDENCIES (do not skip)

| Blocker | Why | Caused By | If Missed |
|---------|-----|-----------|-----------|
| **D6–D8 (cold domain + DNS + warmup)** | Mail goes to spam without proper setup | Founder infra | Launch fails (all mail bounces) |
| **D1–D5 (List-Unsubscribe + plain-text + tracking pixel fix)** | Gmail/Yahoo auto-spam since Feb 2024 | Code | Launch fails (mail filtered) |
| **CAL-min (`booking_url` paste field)** | T3/T4 tests need non-Google calendar support | Code | Smoke Test 1 hangs on T3/T4 |
| **#6 (CRM dedup migration)** | T5 billing test needs clean data | DB | Smoke Test 1 fails on T5 |
| **#7 (Denise Stripe price)** | T5 needs the price ID | Founder + code | Smoke Test 1 fails on T5 |
| **#7/8 (DNS: app/api/admin/status + NEXT_PUBLIC_API_URL)** | Portal routing breaks without proper DNS | Founder infra | Portal 404s when accessing from new domains |
| **Smoke Test 1A (Tue 9)** | Must run before Smoke Test 2 | Tests | Cannot proceed to T4–T7 if T1–T3 fail |
| **Smoke Test 2 (Sat 13)** | Go/No-Go gate for launch | Tests | If red, delay launch to Mon 22 |
| **D9 (inbox-placement 10/10)** | Final deliverability verification | Code + founder | If <10/10, fix gaps Sun morning or delay |
| **Warmup ramp (2–3 wks, started Mon 8)** | Mail reputation takes time to build | Founder ops | If ramp not done by Fri 19, mail still goes to spam |

---

## 📊 TRACKING (tick off daily)

```
MON 8 JUN:   D1–D5 ⬜ D6–D8 ⬜ TIER-0×9 ⬜
TUE 9 JUN:   #1✅ #6✅ #7✅ #7/8✅ CAL-min✅ P-a⬜ P-b⬜ #2⬜ Deploy⬜ T1-3⬜
WED 10 JUN:  T4⬜ T5⬜ T6⬜ T7⬜ #17⬜
FRI 12 JUN:  C1-C7⬜ VIDA-11⬜ Deploy✅
SAT 13 JUN:  SMOKE TEST 2 ⬜
SUN 14 JUN:  Legal✅ D9⬜
MON 15 JUN:  Buffer⬜
TUE 16 JUN:  Dress rehearsal⬜
THU 18 JUN:  GO/NO-GO ⬜
FRI 19 JUN:  🚀 LAUNCH ⬜
```

---

## 🎯 SUCCESS METRICS

- ✅ Deliverability: Mail-tester 10/10
- ✅ Smoke Test 2: All T1–T7 green
- ✅ Fresh email works end-to-end
- ✅ FIGSY sends + prospect replies + reply lands 🔥 Hot
- ✅ Founder can demo to real prospect without errors
- ✅ All legal done (ICO, SR01, registered office, WHOIS, LinkedIn)
- ✅ Warmup: ~50/day ramped, bounce <5%, complaints <0.5%

---

**Document Version:** 7 Jun 2026
**Last Updated:** (you update this daily as you progress)
**Audience:** Founder + Claude (session context)

# ═══════════════════════════════════════════════════════════════
# CHAPTER 3 — ALL 96 BUILDS (#1–96)
# ═══════════════════════════════════════════════════════════════


> **Master reference for every build, item, owner, timeline, and status.**
> Review this to see the full 18-month roadmap at a glance.
> Owner: 🧍 Founder · 🤖 Claude · 🤝 Both.
> Status: ⬜ TODO · ✅ DONE · 🔄 IN PROGRESS · ⏸ GATED · 🚫 WON'T BUILD

---

## 🚀 PHASE 0 — PRE-LAUNCH (Mon 8 Jun → Fri 19 Jun)

| # | Item | What | Owner | Status | Timeline | Blocked By |
|---|------|------|-------|--------|----------|-----------|
| **D1–D5** | Deliverability code fixes | List-Unsubscribe + one-click · plain-text MIME · tracking pixel fix · cold-FROM config · transactional headers | 🤖 | 🔄 | Mon 8 | None |
| **D6–D8** | Deliverability founder infra | Buy cold domain(s) · SPF/DKIM/DMARC · verify Resend · start warmup (5→50/day) · verify `API_URL` + get-kind.com auth | 🧍 | 🔄 | Mon 8–Sun 14 | None |
| **D9** | Inbox-placement test | mail-tester.com / GlockApps → verify 10/10 score | 🤖 | ⬜ | Sun 14 | D1–D5 + D6–D8 |
| **#1** | TIER-0 credential rotation | Stripe secret · Supabase service-role · DATABASE_URL · anon · Anthropic · Resend×2 · HubSpot · Admin secret · Stripe webhook (Apollo ✅) | 🧍 | 🔄 | Mon 8 – Tue 9 | None |
| **#2** | Delete Portal-V2 + flag | Remove dormant `FEATURE_PORTAL_V2` build + flag (breaks if flipped) | 🤖 | ⬜ | Tue 9 | None |
| **#3** | Dogfood account (hello@get-kind.com) | ✅ DONE 6 Jun — all 4 agents, 999,999 credits, subscriptions to 2099 | ✅ | ✅ | ✅ | — |
| **#4** | Grant FIGSY + credits (dogfood) | ✅ DONE 6 Jun via SQL | ✅ | ✅ | ✅ | — |
| **#6** | Migration `010_crm_dedup.sql` | Run in Supabase (before real clients) | 🧍 | ⬜ | Tue 9 | None |
| **#7** | Denise Stripe price ($99/mo) | Create product + recurring price → `STRIPE_PRICE_DENISE_MONTHLY` env var + redeploy | 🤖 + 🧍 | ⬜ | Tue 9 | None |
| **#7/8** | DNS: app/api/admin/status.get-kind.com | Railway CNAMEs + update `NEXT_PUBLIC_API_URL` (Portal/Admin) + Resend webhook | 🧍 | ⬜ | Tue 9 | None |
| **#9** | Confirm Calendly + `version.txt` | Verify `kind-ai-demo/new-meeting` live · ensure deploy marker works | 🧍 | ⬜ | Sun 14 | None |
| **#10** | ICO registration (£40) | ico.org.uk before launch | 🧍 | ⬜ | Sun 14 | None |
| **#11** | SR01 suppression | Home-address removal (free) | 🧍 | ⬜ | Sun 14 | None |
| **#12** | Registered office + service address | ~£20–50/yr (e.g., Speednames) | 🧍 | ⬜ | Sun 14 | None |
| **#13** | WHOIS privacy verify | Hide director name on GoDaddy | 🧍 | ⬜ | Sun 14 | None |
| **#14** | LinkedIn lockdown | Private profile, no K.I.N.D, no outreach requests | 🧍 | ⬜ | Sun 14 | None |
| **#15** | Smoke Test 1 (57-step) | T1–T7 full run: signup, ICP, leads, FIGSY send, reply, booking, billing, Vida, Milla | 🧍 | ⬜ | Tue 9 – Wed 10 | #7, CAL-min |
| **#16** | Smoke Test 2 (full re-run) | Clean T1–T7 with fresh email | 🧍 | ⬜ | Sat 13 | #15 green |
| **#17** | Fix smoke failures same-day | Any red from #15 or #16 → fix immediately | 🤖 | ⬜ | Wed 10 (if needed) | #15 results |
| **#17b** | Outcome-event data floor | ✅ DONE — append-only log (send/reply/opt_out/meeting_booked), fire-and-forget | ✅ | ✅ | ✅ | — |
| **#18** | LAUNCH both markets | Transactional live from `get-kind.com`, cold ramped from warmup domain | 🤝 | ⬜ | **Fri 19 Jun** | All above green |
| **CAL-min** | `booking_url` paste field | Non-Google calendar clients (pre-launch min) | 🤖 | ⬜ | Tue 9 | None |
| **P-a** | "Sign emails as {name}" setting | Stop AI-invented signers (Thandeka/Thabo) | 🤖 | ⬜ | Tue 9 | None |
| **P-b** | Strip `BUILD MARKER` debug | API startup log cleanup | 🤖 | ⬜ | Tue 9 | None |
| **C1–C7** | Cosmetics batch (Fri 12) | ICP-above-People · agent cards · ICP banner · agent panels · ClickUp signup · New-ICP scroll · "Est. Pipeline Value" | 🤖 | ⬜ | Fri 12 | None |
| **VIDA-11** | Vida in-portal help bubble | Bottom-right, reuses existing embed (basic pre-launch) | 🤖 | ⬜ | Fri 12 | None |
| **Deploy pipeline** | Fix `KIND System Audit` GitHub Action | Failing on every push, blocks Railway auto-deploy | 🤖 | ⬜ | Tue 9 | None |

**PRE-LAUNCH TOTAL:** 28 items, all critical.

---

## 📍 PHASE 1 — WEEK 1 POST-LAUNCH (Jun 19–28)

| # | Item | What | Owner | Status | Timeline | Notes |
|---|------|------|-------|--------|----------|-------|
| **#19** | 10 warm outreach messages | Network → seed launches + accelerators | 🧍 | ⬜ | Week 1 | Quick wins |
| **#20** | LinkedIn content 1/day | Anonymous brand handle | 🧍 | ⬜ | Week 1 ongoing | Thought leadership |
| **#21** | LinkedIn outreach activation | Run `20260602_linkedin_queue.sql` + PhantomBuster keys | 🧍 | ⬜ | Week 1 | Distribution unlock |
| **#22** | Meta/WhatsApp API application | Start 3–7 day approval window | 🧍 | ⬜ | Week 1 | Pipeline |
| **#23** | Record real product demo | "Shoot once, cut many" (16:9 + 9:16) — use Pixar family prominently | 🧍 | ⬜ | Week 1 | Warmth moat |
| **#24** | Replace homepage hero animation | Real product loop (blocked on #23) | 🤖 | ⏸ | Week 1 | Authenticity |
| **#25** | Instrument GTM funnel | Channel → reply → demo → close · CAC · trial→paid | 🤝 | ⬜ | Week 1 | Data for Month 2 |
| **#26** | Dogfood self-outreach + competitor ICP | Eat own dogfood, prove product | 🧍 | ⬜ | Week 1 | Proof |
| **#27** | Daily client briefing email | Apex steal · quick win | 🤖 | ⬜ | Week 1 | Engagement |
| **#28** | Pre-launch fresh-signup check | Verify real onboarding (smoke test used dogfood) | 🧍 | ⬜ | Week 1 | Validation |

**WEEK 1 TOTAL:** 10 items.

---

## 📍 PHASE 2 — WEEKS 2–4 (Jun 29 – Jul 19)

| # | Item | What | Owner | Status | Timeline | Notes |
|---|------|------|-------|--------|----------|-------|
| **#29** | 2 design-partner slots | Case study + logo (early proof) | 🧍 | ⬜ | Weeks 2–4 | Social proof |
| **#30** | Cut 9:16 social content | TikTok/Reels from demo footage | 🤖 | ⬜ | Weeks 2–4 | Distribution |
| **#31** | Record 3 onboarding Looms | Customer education | 🧍 | ⬜ | Weeks 2–4 | Reduce churn (Revio moat) |
| **#32** | Onboarding v2 + day-0/3/7 email | Reduce churn | 🤖 | ⬜ | Weeks 2–4 | Engagement |
| **#33** | Populate proof block with real data | Do NOT fabricate — hold slot, populate with real results | 🤖 | ⬜ | Weeks 2–4 (wait for results) | Honesty |
| **#34** | Activate Flutterwave | Needs key (ZAR/NGN/KES/GHS) | 🧍 | ⏸ | Weeks 2–4 | Africa-first revenue |
| **#35** | Launch YouTube channel | 10-video plan exists | 🧍 | ⬜ | Weeks 2–4 | Long-tail SEO |
| **#36** | Wire playbook email form | ConvertKit/Mailchimp | 🤖 | ⬜ | Weeks 2–4 | Lead magnet |
| **#61a** | Performance-guarantee clause | Terms.html + ToS: "90-day results or you don't pay" (Atlas steal) | 🤖 | ⬜ | Weeks 2–4 | Confidence signal |
| **#61e** | Influencer/community distribution | Find SA + US equivalents of Dan Martell (Worth more than seed round) | 🧍 | ⬜ | Weeks 2–4 ongoing | Distribution moat |
| **#61g** | Guarantee sharpened to 90d | Messaging adjustment | 🤖 | ⬜ | Weeks 2–4 | Messaging |
| **#62b** | "Revenue Playbook Session" bundled | 30-min call during onboarding (Revio moat + coaching layer) | 🤖 | ⬜ | Weeks 2–4 | Churn reduction |
| **#62c** | Homepage outcome numbers | Specific client results (real data only) | 🤖 | ⏸ | Weeks 2–4 (wait for data) | Proof |
| **#62d** | "Revenue Blueprint Session" CTAs | ✅ DONE — 29 CTAs renamed | ✅ | ✅ | ✅ | — |
| **#62e** | Vertical landing pages | Estate agents, brokers, advisers (SA + US) + case studies (Revio moat) | ✅ | ✅ (Africa) | Weeks 2–4 (US) | Specialisation |

**WEEKS 2–4 TOTAL:** 14 items.

---

## 📍 PHASE 3 — MONTH 2 (Late Jul – Aug, GATED: 10+ clients)

**PREREQUISITE:** Set up staging environment (Part 4B) before any V2 touches main.

### Intelligence Layer (#37–53)

| # | Item | What | Owner | Status | Timeline | Why / Signal |
|---|------|------|-------|--------|----------|--------------|
| **#37** | Intent signal detection | Which leads are ready to buy (not just interested) | 🤖 | ⬜ | Month 2 | Amplemarket moat · reduce wasted outreach |
| **#38** | A/B subject testing | Auto-pick winning subject line per campaign | 🤖 | ⬜ | Month 2 | Monday/ClickUp testing · personalization = conversion |
| **#39** | Client morning-brief email | Daily summary: lead activity, reply rates, anomalies (Apex/S4 steal) | 🤖 | ⬜ | Month 2 | Engagement hook |
| **#40** | ICP auto-refinement (L2 learning) | Monthly AI review: refine ICP based on actual replies (no user touching builder) | 🤖 | ⬜ | Month 2 | Glean "context wins" + our outcome data moat |
| **#41** | Conditional sequence branching | "If no reply in 5d, escalate." Auto-responses. | 🤖 | ⬜ | Month 2 | Monday/ClickUp automation |
| **#42** | Waterfall enrichment | Apollo → PDL → Hunter → Clearbit (needs keys) | 🤖 | ⏸ | Month 2 | Clay moat · enterprise richness for SMB price |
| **#43** | Deliverability dashboard | SPF/DKIM/DMARC + bounce + blacklist (live monitoring) | 🤖 | ⬜ | Month 2 | Transparency = trust |
| **#44** | Email score pre-send | AI scores subject + body for spam signal before send | 🤖 | ⬜ | Month 2 | MailerLite moat · reduce complaints |
| **#45** | Adaptive send volume | Ramp based on reply rate (not fixed 20/day) | 🤖 | ⬜ | Month 2 | Instantly moat · responsive to feedback |
| **#46** | FIGSY Memory v2 (pgvector) | Semantic embeddings (episodic / long-term / preference) | 🤖 | ⬜ | Month 2 | **Our moat.** L2 learning needs pgvector. |
| **#47** | Milla full-context CRM pull | Milla reads Pipedrive/HubSpot history when writing | 🤖 | ⬜ | Month 2 | Glean moment · context always wins |
| **#48** | Vapi voice calling | FIGSY dials prospects (warm follow-up) | 🤖 | ⬜ | Month 2 (optional) | Atlas/Revio moat · voice = higher conversion |
| **#49** | Product Hunt launch | With 2–3 design-partner case studies | 🤖 | ⬜ | Month 2 | Proof · network effect |
| **#50** | G2 listing (5 reviews) | Social proof · SMB buying signal | 🤖 | ⬜ | Month 2 | Competitive hygiene |
| **#51** | Configurable agent triggers | "Send after X days" "Escalate if human reply" — power users unlock value | 🤖 | ⬜ | Month 2 | Monday/ClickUp depth |
| **#52** | Multi-model toggle per campaign | "Use Opus for this ICP, Sonnet for that" — cost optimization | 🤖 | ⬜ | Month 2 | Experimentation · margin |
| **#53** | Inbox rotation / multiple sending domains | Auto-rotate domains to evade spam filters (Instantly steal) | 🤖 | ⬜ | Month 2 | Deliverability on steroids |
| **#59 (pulled fwd)** | **MCP server** (distribution unlock) | Expose one endpoint: "Start FIGSY campaign." Notion/Linear/Slack agents call it. | 🤖 | ⬜ | Month 2 | **MCP is distribution.** Glean/Notion/Linear all wired it. (Was Month 3, moved to M2.) |

### V2 Portal Redesign (#V2-1 through #V2-13)

| # | Item | What | Owner | Status | Timeline | Priority |
|---|------|------|-------|--------|----------|----------|
| **V2-1** | Agent card grid | Dashboard home: replace left-nav + empty space with card grid (all 4 agents) | 🤖 | ⬜ | Month 2 | High |
| **V2-2** | Agent thinking state | Show when working ("Writing 17 emails…") — transparency | 🤖 | ⬜ | Month 2 | High |
| **V2-3** | Conversational agent setup | Chat with Casey instead of forms ("Tell me your ICP" → agent clarifies) | 🤖 | ⬜ | Month 2 | Medium |
| **V2-4** | Structured agent config panel | Clean cards: Role/ICP/Tone/Schedule/Knowledge (replace dense text) | 🤖 | ⬜ | Month 2 | Medium |
| **V2-5** | Agent marketplace | "Meet your AI Revenue Team" (Month 3+, gated on volume) | 🤖 | ⏸ | Month 3 | Medium |
| **V2-6** | Slim sidebar + top-right header | Profile/Billing/Settings/Team in dropdown (Notion/Linear style) | 🤖 | ⬜ | Month 2 | High |
| **V2-7** | Invite teammate / growth loop | "Invite your co-founder" modal in header (referral structure) | 🤖 | ⬜ | Month 2 | High |
| **V2-8** | **AI Notetaker → action items (Milla)** | Milla reads all portal activity → nightly: "Here's what happened, 3 actions" (Glean moment) | 🤖 | ⬜ | Month 2 | **Critical** |
| **V2-9** | **Teams Hub** | Members, activity, per-person usage (admin oversight) | 🤖 | ⬜ | Month 2 | **Critical** |
| **V2-10** | **Casey — Onboarding agent** | Non-family support bot (ClickUp-style + Revio coaching model). Portal only. Warm Pixar 3D. | 🤖 | ⬜ | Month 2 | High |
| **V2-11** | **Vida in-portal help bubble** | Bottom-right, context-aware, pulls live data (basic pre-launch Fri 12, deep Month 2) | 🤖 | ⬜ | Month 2 | **Critical** |
| **V2-12** | **Strong client dashboards** | Monday-style: ICP cards · campaign perf · pipeline value · credit usage · trends | 🤖 | ⬜ | Month 2 | Critical |
| **V2-13** | **Multi-provider calendar** | **(a)** Outlook/Zoho/Calendly OAuth · **(b)** agent-led onboarding (Casey asks "Google or Outlook?") | 🤖 | ⬜ | Month 2 | Critical |

**MONTH 2 TOTAL:** 36 items (Intelligence 18 + MCP 1 + V2 17).

---

## 📍 PHASE 4 — MONTH 3 (Late Aug – Sep, GATED: family build + margin data)

| # | Item | What | Owner | Status | Timeline | Gated By | Why |
|---|------|------|-------|--------|----------|----------|-----|
| **#54** | **DENISE deep build (#1 agent)** | Calendly auto-book · call-join transcription/notetaker · live objection extraction · proposal-from-transcript · pipeline follow-up · persona/system prompt · admin card. **Build deep or don't ship.** | 🤖 | ⏸ | Month 3 | 10+ clients + margin data | Closes FIGSY → booked seam. Max leverage (extends existing pipeline, no new front). |
| **#55** | **LENA** | Once DENISE solid | 🤖 | ⏸ | Month 3 | DENISE complete | Broadens agent family |
| **#56** | **OTTO** | Once LENA solid | 🤖 | ⏸ | Month 3 | LENA complete | Operations loop |
| **#57** | Multi-agent orchestration (shared memory) | FIGSY → DENISE → Milla handoff + context | 🤖 | ⏸ | Month 3 | DENISE + LENA + OTTO | Platform moat |
| **#58** | 500+ FIGSY skill library | Prompt library: "Open doors with competitive intel" "Negotiate discounts" etc. | 🤖 | ⏸ | Month 3 | FIGSY stable | ClickUp 500+ work skills depth |
| **#60** | **Outcome pricing** (per meeting booked) — GATED | Build only after margin data proves ≥28% gross. Pure outcome model ($40/meeting, K.I.N.D eats failed outreach). | 🤖 | ⏸ | Month 3+ | ≥28% gross margin data | Salesforce + Intercom proved the model. (Was blocked, now gated on margin.) |
| **#61** | Mobile app (iOS + Android) | Nice-to-have if MRR >£8K | 🤖 | ⏸ | Month 3+ | Volume | Competitive hygiene |
| **#62** | Built-in CRM (persistent prospect DB / Kanban deal view) | FIGSY stores every prospect she touches. Clients see Kanban (leads → replied → booked → closed). | 🤖 | ⏸ | Month 3+ | Volume | Monday/ClickUp/Linear CRM (nice-to-have) |
| **#63** | Pan-African design partners | Deepen regional presence (NG/KE/GH/EG/RW) | 🧍 | ⏸ | Month 3 | Volume | Our specialisation lane |
| **#64** | Platform-level cross-client intelligence (L4 moat) | Benchmarks: "You're 80th percentile" + predictive ICP. | 🤖 | ⏸ | Year 2+ | 50+ clients + L2/L3 working | **Glean's enterprise moat, adapted to SMB.** Real long-term differentiation. |
| **#65** | Data licensing marketplace | Sell anonymised outcome data (reply rates, angles, verticals, regions). | 🤖 | ⏸ | Year 2+ | Data volume + ethics review | New revenue stream |
| **#66** | ICP auto-refinement advanced (L3) | Real-time: as replies come in, refine ICP automatically. | 🤖 | ⏸ | Year 2+ | Data moat | Data moat |
| **#67** | Pipeline forecasting | "Given reply rate + deal size, close X by Q4." | 🤖 | ⏸ | Year 2+ | Data depth | Linear insight (product intelligence) |
| **#68** | In-portal messaging | Slack-style chat for team (FIGSY, Milla, humans, clients). | 🤖 | ⏸ | Year 2+ | Volume | Monday/Notion collab |
| **#69** | Proposal + e-sign | DENISE drafts → client signs in portal. | 🤖 | ⏸ | Year 2+ | DENISE complete | Salesforce moat |
| **#70** | Meeting notetaker | Auto-transcribe Zoom (client + prospect). Extract objections live. | 🤖 | ⏸ | Year 2+ | Volume | Glean/Linear moat |

**MONTH 3 TOTAL:** 17 items.

---

## 📍 PHASE 5 — YEAR 2 (Enterprise, Certifications)

| # | Item | What | Owner | Status | Timeline | Gated By |
|---|------|------|-------|--------|----------|----------|
| **#71** | ISO 27001 | Enterprise compliance (~£15–25k) | 🧍 | ⏸ | Year 2 | Enterprise sales signal |
| **#72** | ISO 42001 (AI Governance) | Enterprise compliance (~£10–15k) | 🧍 | ⏸ | Year 2 | Enterprise + AI regulation |
| **#73** | SOC 2 Type II | Enterprise compliance (~$50k, Vanta) | 🧍 | ⏸ | Year 2 | Enterprise sales signal |
| **#74** | Vanta triple-cert | ISO 27001 + 42001 + SOC 2 (~70% shared controls) | 🧍 | ⏸ | Year 2 | Enterprise sales signal |
| **#75** | 3-type memory model | Episodic / long-term / preference (sophistication after pgvector M2) | 🤖 | ⏸ | Year 2 | pgvector + volume |
| **#76** | Visitor de-anonymisation | Clearbit (see who's on website before signup) | 🤖 | ⏸ | Year 2 | Key needed |
| **#77** | Churn-risk scoring | Predict which clients will churn | 🤖 | ⏸ | Year 2 | Data depth |
| **#78** | Revenue forecasting | Predict pipeline close timing | 🤖 | ⏸ | Year 2 | Data depth |
| **#79** | Call intelligence | Auto-transcribe + analyze calls | 🤖 | ⏸ | Year 2 | Volume + Vapi integration |

**YEAR 2 TOTAL:** 9 items.

---

## 🔒 ONGOING / PARALLEL (trigger-based, non-phase)

| Item | What | Owner | Timeline |
|------|------|-------|----------|
| **Legal (Part 2)** | D&O insurance (~£500–1k M2) · ODPC Kenya / NDPR (first NG/KE client) · AI Risk Register (start now) · pen test (~£2–5k M3) · trademarks K.I.N.D+FIGSY+Milla+Vida (~£320 M2–3) · IR35/contractor IP (first hire) · SeedLegals IP (~£600 at raise) · VAT at £90k · annual filings | 🧍 | Ongoing |
| **Funding (Part 5C)** | F1 cloud credits (NOW) → F2 SA ecosystem (5–10 clients) → F3 YC (paying clients) → F4 revenue financing (predictable MRR) → F5 influencer (ongoing). Revisit at 20–30 clients. | 🧍 | Ongoing |
| **Tech-debt** | Delete Portal-V2 · Apollo keyword picker · tighten ICP prompt · admin proxy URL · commit signing | 🤖 | Ongoing |
| **MASTER.md cleanup** | 15 contradictions (Part 8) — Vercel refs, launch-day, Vida price, pricing tables, cron count, LinkedIn "never" (built!), duplicates, Calendly link, done/pending, cashflow, us.app, eu-west-1, fake "built" routes, old smoke test | 🤖 | After launch |
| **Competitive watch** | Monitor Revio (B2B cold outbound roadmap). Hold specialisation lane. Use warmth window NOW. | 🧍 | Ongoing |

---

## 🚫 WILL NOT BUILD

Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts · 50+ data sources (before 50+ clients) · African-language (after WhatsApp).

---

## 📊 SUMMARY BY PHASE

| Phase | Count | Timeline | Status |
|-------|-------|----------|--------|
| **Phase 0** (pre-launch) | 28 | Mon 8 – Fri 19 Jun | 🔄 In progress |
| **Phase 1** (Week 1) | 10 | Jun 19–28 | ⬜ Pending |
| **Phase 2** (Weeks 2–4) | 14 | Jun 29 – Jul 19 | ⬜ Pending |
| **Phase 3** (Month 2) | 36 | Late Jul – Aug | ⏸ Gated on 10+ clients |
| **Phase 4** (Month 3) | 17 | Late Aug – Sep | ⏸ Gated on margin data |
| **Phase 5** (Year 2) | 9 | 2027 | ⏸ Enterprise only |
| **Ongoing** | 5 | Parallel | 🔄 Continuous |
| **Won't build** | — | — | 🚫 Out of scope |
| **TOTAL** | **96** | — | — |

---

## 🎯 CRITICAL DEPENDENCY MAP

```
LAUNCH (Fri 19) ←
  ├─ Smoke Test 2 green (Sat 13) ←
  │   ├─ Smoke Test 1A green (Tue 9–Wed 10) ←
  │   │   ├─ CAL-min (#booking_url) (Tue 9)
  │   │   ├─ #7 (Denise Stripe price) (Tue 9)
  │   │   ├─ #6 (migration 010) (Tue 9)
  │   │   └─ D1–D5 deployed (Tue 9)
  │   └─ T4–T7 all pass
  ├─ D9 (inbox-placement 10/10) (Sun 14) ←
  │   ├─ D1–D5 deployed
  │   └─ D6–D8 (warmup ramp started Mon 8)
  ├─ Legal #10–#14 (Sun 14)
  └─ AUTO_OUTREACH_ENABLED=true (Fri 19)

MONTH 2 INTELLIGENCE (37–53) ←
  └─ 10+ clients (gated)

MONTH 2 V2 PORTAL (V2-1 through V2-13) ←
  └─ Staging environment set up

MONTH 3 DENISE (#54, #1 next) ←
  └─ 10+ clients + margin data (≥28% gross)

MONTH 3 OUTCOME PRICING (#60) ←
  └─ Margin data ≥28%

YEAR 2 ENTERPRISE (#71–79) ←
  └─ 50+ clients + revenue stable
```

---

## 🔄 HOW TO USE THIS DOCUMENT

1. **Review before each phase:** "What's next? What are the gates?"
2. **Track progress:** Mark items ✅ as they complete, update `Status` column
3. **Watch for gates:** If a downstream item is blocked, find the upstream item that's red
4. **Align with team:** "This phase needs X from founder, Y from Claude. Which week?"
5. **Quarterly review:** Every 3 months, reconcile this against EVERYTHING.md + SESSION-HANDOFF

---

**Document Version:** 7 Jun 2026
**Next Update:** After Smoke Test 2 passes (Sat 13 Jun)
**Audience:** Founder + Claude (session context)

# ═══════════════════════════════════════════════════════════════
# CHAPTER 4 — OPERATIONS, LEGAL, INFRA & BUILT INVENTORY
# ═══════════════════════════════════════════════════════════════


> **The 4th reference doc.** Covers what the roadmap docs deliberately leave out:
> Legal rings (full detail), staging environment (step-by-step), recurring operations,
> blocked-on-credentials inventory, full built inventory, and the financial targets.
>
> **Companion to:**
> - `STRATEGIC-ROADMAP-19JUN-2026.md` (strategy + competitive)
> - `DAILY-ACTION-PLAN-TO-LAUNCH.md` (day-by-day tactical)
> - `ALL-BUILDS-TIMELINE-96-ITEMS.md` (every build #1–96)
>
> Source: EVERYTHING.md Parts 2, 3, 4, 4B, 7 + NUMBERS table.

---

# PART A — ⚖️ LEGAL & COMPLIANCE (4 RINGS, FULL DETAIL)

> The legal posture is structured as 4 concentric "rings" — from the founder's personal
> shield outward to contractual/IP. Each ring has what's ✅ locked and what's ⬜ still open.

## 🔵 RING 1 — Corporate & Personal Shield

**Purpose:** Protect the founder personally. Limit liability. Keep the founder's identity
out of the customer-facing brand (deliberate "invisible founder" decision).

### ✅ LOCKED
- **Ltd company formed** — Company number **17260532**, England & Wales
- **Limited-liability shield** in place (company, not founder, bears liability)
- **Employment ring-fence** — after-hours / personal-kit separation; Smartsheet employment
  clause 17.2 reviewed + accepted (no conflict with current employment)
- **`docs/legal/legal-pack.md`** exists

### ⬜ OPEN (before launch — Sun 14 Jun in the daily plan)
| Item | What | Cost | When |
|------|------|------|------|
| **SR01 home-address suppression** | File SR01 with Companies House to remove home address from public record | Free | Sun 14 |
| **Registered office + director service address** | Replace home address with a service address (e.g., a formation agent's address) | ~£20–50/yr | Sun 14 |
| **WHOIS privacy** | Verify domain registration hides the founder's name (GoDaddy privacy) | Included | Sun 14 |
| **LinkedIn lockdown** | Personal profile private; no K.I.N.D mention; don't accept "Bradley-type" connection requests (competitor recon) | Free | Sun 14 |
| **All public contact = business email** | `hello@get-kind.com` everywhere; never personal email | Free | ✅ mostly done |
| **Press attributed to "K.I.N.D team"** | Never founder's name in press/PR | Free | Policy |
| **D&O insurance** | Directors & Officers liability insurance | ~£500–1,000/yr | **Month 2** |

### 📌 HARD FLOOR (cannot be changed)
**PSC (Person of Significant Control) director name is permanently public** — Companies House
requires it, cannot be removed. The "invisible founder" is brand/customer-facing only; the
legal record will always show the director. (This is fine for fundraising — investors meet you
under your real name; customers see only K.I.N.D.)

---

## 🟢 RING 2 — Data Protection

**Purpose:** Compliance across every market K.I.N.D touches (UK, EU, SA, Nigeria, Kenya, US).
This is a genuine moat — generalist competitors can't match the multi-jurisdiction posture.

### ✅ LOCKED
- **UK GDPR + DPA 2018 + Data Use & Access Act 2025** — compliant
- **POPIA** (South Africa) — compliant
- **NDPR (Nigeria) + Kenya DPA 2019** — compliant
- **CCPA/CPRA + US state laws** — `dpa-us.html` catch-all published
- **DPA published** + **DPA-US** published
- **Data residency locked** — Cape Town (Supabase af-south-1); US enterprise on request
- **Data classification T1–T4** — tiered data sensitivity model in place
- **Sub-processor register** — consistent (fixed 4 Jun: Paystack/Vercel → Stripe/Railway)

### ⬜ OPEN
| Item | What | Cost | When |
|------|------|------|------|
| **ICO registration** | UK Information Commissioner's Office registration (legal requirement to process personal data) | £40/yr | **Before launch — Sun 14** |
| **ODPC Kenya / NDPR DPCO** | Kenya Office of Data Protection + Nigeria DPCO registration | TBD | **First NG/KE client** (gated) |

---

## 🟠 RING 3 — Information Security

**Purpose:** Protect client data + the platform. Foundation for future enterprise certs (Year 2).

### ✅ LOCKED
- **RLS (Row-Level Security)** on all tables (credit_transactions fixed)
- **API auth** — `requireAuth` + `requireAdminKey` middleware
- **Strict CORS** — allowlist only (get-kind.com domains + localhost + Railway/Vercel previews)
- **JWT refresh** — token rotation in place
- **TLS 1.3 / AES-256** — encryption in transit + at rest
- **Secrets in Railway env only** (hard rule — never in code/repo)
- **Incident response plan + register** (logged 4 Jun)
- **BCP (Business Continuity Plan)** — RTO 4h / RPO 24h / daily backups 30-day retention
- **`docs/legal/it-security-pack.md`** exists

### ⬜ OPEN — 🔴 TIER-0 CREDENTIAL ROTATION (Mon 8 → Tue 9 in daily plan)
> These keys were exposed (some pasted in chat). Rotate ALL. Apollo ✅ already rotated 6 Jun.

| Key | Where | Priority |
|-----|-------|----------|
| `STRIPE_SECRET_KEY` (sk_live) | Stripe dashboard → Railway API | 1st (live payment key) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase settings → Railway | 2nd (full DB access) |
| `DATABASE_URL` (password exposed) | Supabase connection pooling → Railway | 3rd (DB password) |
| `SUPABASE_ANON_KEY` | Supabase settings → Railway + Portal | 4th |
| `ANTHROPIC_API_KEY` | console.anthropic.com → Railway | 5th |
| `RESEND_API_KEY` | Resend dashboard → Railway | 6th |
| `RESEND_WEBHOOK_SECRET` | Resend webhook config → Railway | 7th |
| `APOLLO_API_KEY` | ✅ **DONE 6 Jun** | — |
| `HUBSPOT_API_KEY` | HubSpot settings → Railway | 8th |
| `ADMIN_SECRET_KEY` | Generate new UUID → Railway | 9th |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook settings → Railway | 10th |
| Paystack test keys | Hygiene (Paystack removed) | optional |

### ⬜ OPEN — Future security
| Item | What | Cost | When |
|------|------|------|------|
| **AI Risk Register** | Start now — foundation for ISO 42001 | Free | Start now |
| **Pen test** | Third-party penetration test | ~£2–5k | **Month 3** |
| **SOC 2 / ISO 27001 / ISO 42001** | Enterprise certs | ~£70k total | **Year 2** |

---

## 🟣 RING 4 — Contractual & IP

**Purpose:** Protect the company's contracts with clients + own all IP (code, brand, agents, data).

### ✅ LOCKED
- **Client T&Cs** — liability capped at 3-months fees; no-refund; England & Wales jurisdiction
- **AAA arbitration** for US clients (§12)
- **IP ownership** — company owns all code, brand, agent names (FIGSY/Milla/Vida/Denise), dataset

### ⬜ OPEN
| Item | What | Cost | When |
|------|------|------|------|
| **SEIS advance assurance** | Tax relief scheme for investors — draft ready, file soon | Free | **Soon (parallel)** |
| **Trademarks** | K.I.N.D + FIGSY + Milla + Vida | ~£320 | **Month 2–3, before PR** |
| **IR35 / contractor IP-assignment** | When first contractor hired | TBD | **First hire** |
| **SeedLegals IP assignment** | Formal IP assignment at fundraise | ~£600 | **At raise** |
| **VAT registration** | At £90k revenue threshold | Free | **At £90k** |
| **Annual confirmation statement + accounts + CT return** | Companies House + HMRC filings | TBD | **Annual** |

### ⚠️ Performance-Guarantee Clause (links to #61a/g — Weeks 2–4)
The pricing page shows a **"90-Day Pipeline Guarantee"** band. **The matching ToS clause is NOT
yet written.** Founder TODO: add a clause to terms.html that defines:
- What counts as a "qualified meeting"
- Refund mechanics ("results or you don't pay")
- Minimum lead volume the client must run for the guarantee to apply

Currently the guarantee copy points to ToS that doesn't yet contain it. **Close this gap before
making the guarantee a headline marketing claim.**

---

# PART B — 🧪 STAGING ENVIRONMENT (PART 4B — FULL CHECKLIST)

> **Why:** Once real clients are live on production, every V2 feature + future launch MUST be
> built + smoke-tested on staging before touching `main`. **Clients cannot be the ones who find
> the bugs.** ~$10–15/mo extra on Railway, ~20 min one-time setup.
>
> **When:** Set up BEFORE the first V2 work post-launch (i.e., before Month 2 Intelligence/V2 builds).

## Architecture

```
feature branch → auto-deploy → staging (staging.app.get-kind.com)
                                  ↓ smoke test passes
                              merge to main → production (app.get-kind.com)
```

**Three isolated pieces — staging never shares data or keys with production:**
- **Railway staging services** (Portal + API, pointing at `staging` branch)
- **Supabase `kind-staging` project** (separate DB — no client data, no cross-contamination)
- **Stripe test-mode keys** (staging always test mode; production always live mode)

## Setup Checklist (one-time, ~20 min)

### Step 1 — Supabase staging project
- [ ] Create new project: `kind-staging` in Supabase (af-south-1, same region)
- [ ] Run all migrations (001 → latest) in the staging SQL editor
- [ ] Save staging-only values: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`

### Step 2 — Railway staging services
- [ ] Duplicate `@kind/api` → rename `kind-api-staging`
  - Source branch: `staging`
  - Env vars → staging values (staging Supabase URL/keys, Stripe **test** keys, `NODE_ENV=staging`)
  - Custom domain: `api-staging.get-kind.com` (or Railway-generated URL)
- [ ] Duplicate `@kind/portal` → rename `kind-portal-staging`
  - Source branch: `staging`
  - `NEXT_PUBLIC_API_URL` → staging API URL
  - `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` → staging values
  - All `NEXT_PUBLIC_STRIPE_PRICE_*` → Stripe **test-mode** price IDs
  - Custom domain: `staging.app.get-kind.com`

### Step 3 — Create `staging` branch in GitHub
- [ ] `git checkout -b staging && git push -u origin staging`
- [ ] On Railway: both staging services watch this branch (auto-deploy on push to `staging`)

### Step 4 — Verify
- [ ] Push a harmless change to `staging` → both Railway staging services rebuild
- [ ] Visit `staging.app.get-kind.com` → sign up with test email → dashboard loads
- [ ] Confirm production DB untouched (check Supabase production project — zero new rows)

## Development Workflow (every V2 feature from here)

```
1. Build on a feature branch  (e.g. claude/v2-agent-cards)
2. Push feature branch → open PR into `staging`
3. Staging Railway auto-deploys
4. Run smoke test on staging.app.get-kind.com
5. Pass → merge staging → main → production auto-deploys
```

## Hard Rules (never break)
- **Production = `main` only.** No direct pushes to main for V2 work.
- **Staging DB is throwaway.** Wipe/re-seed any time — no client data ever lives there.
- **Stripe always test-mode on staging.** No live charges on staging, ever.
- **Hotfix path:** security/broken-live-path fix goes `hotfix/branch` → test on staging →
  fast-merge to main. Never patch production directly.

## Cost
- 2 extra Railway services (~$10–15/mo, sleep when idle)
- 1 extra Supabase project (free tier covers staging)
- **Total: ~$10–15/mo — cheaper than one client churn event.**

---

# PART C — 🔄 RECURRING OPERATIONS (PART 7)

> The operational cadence once clients are live. This is the "running the business" layer,
> separate from the build roadmap.

## Daily
- Open **Admin dashboard** + **/unibox** (two-way inbox) + **/founder brief**
- **TTFL (Time To First Lead) > 4h → intervene** (a client waiting too long for leads is a churn risk)
- Founder morning brief arrives **07:05 SAST** (already built)

## Before Every Sales Call
- Create a **demo environment** (isolated demo data)
- Review the **demo playbook** (11-scene script)
- Bookmark the **magic link** (instant demo login)
- **Pre-demo setup S1–S12:** real signup · onboard · unlock SQL · 10,000 credits · real ICP ·
  Demo Campaign · Milla doc loaded · Vida configured · clean browser

## After Every Demo
- Clear test leads
- Archive the campaign
- Check credits
- Note any breaks/bugs
- Log objections (feeds sales SOP + product priorities)

## Weekly (Friday)
- KPI check
- Clients review
- Roadmap milestones review
- Scalability check
- HubSpot deals review
- **MRR behind target → HubSpot follow-up**
- **Past-due accounts → email**

## Sales SOP (6 phases)
```
Qualification → Discovery (5 questions) → Demo → Proposal → Payment → Onboarding
```

---

# PART D — ⏸ BLOCKED ON CREDENTIALS (PART 4 — NO BUILD NEEDED)

> These features are **code-complete**. They just need an API key / approval to switch on.
> No engineering work — purely a credential/access gate.

| Feature | Blocked On | Unlocks | Phase |
|---------|-----------|---------|-------|
| **Milla + Vida subscriptions** | Stripe price IDs (verify in T5 smoke test) | Subscription billing for both agents | Pre-launch (verify) |
| **Flutterwave** | API key | ZAR/NGN/KES/GHS payments (Africa) | Weeks 2–4 |
| **HubSpot CRM sync** | `HUBSPOT_API_KEY` | CRM dedup + push | Week 1 |
| **Voice (Vapi)** | Vapi keys | FIGSY voice calling | Month 2 |
| **WhatsApp** | Meta approval + number | WhatsApp outreach channel | Week 1 (apply) → Month 2 (live) |
| **Google Calendar OAuth** | `GOOGLE_CLIENT_ID/SECRET/REDIRECT` | Auto-booking into Google Calendar | Month 2 (V2-13) |
| **Clearbit visitor de-anon** | `CLEARBIT_API_KEY` | See who's on the website before signup | Year 2 (#76) |
| **LinkedIn auto-dispatch** | PhantomBuster keys | LinkedIn cold outreach (backend built) | Week 1 (#21) |
| **Cloudflare CDN failover** | `CLOUDFLARE_API_TOKEN` / `ACCOUNT_ID` | CDN + WAF (AS46582 block rule) | Post-launch |
| **Render standbys + UptimeRobot** | Setup | Failover hosting + uptime monitoring | Post-launch |

---

# PART E — 📦 FULL BUILT INVENTORY (PART 3 — DO NOT REBUILD)

> Everything that already ships and works. Cross-reference before building anything to avoid
> duplicating existing functionality.

## Platform
- Supabase + RLS (Row-Level Security on all tables)
- Auth (no email-confirm flow — instant signup)
- **16 cron jobs** live (NOT 19 — the 3 status-snapshot crons were planned, never built)
- TSC (TypeScript) clean — no type errors

## Lead Gen
- ICP builder
- AI ICP Suggest (auto-suggest ICP from a prompt)
- ICP website scan (extract ICP from a company URL)
- Apollo 3-pass search
- Claude scoring (Haiku 4.5)
- Leads table
- Opt-out blocklist
- POPIA consent
- First-leads email
- Weekly digest
- Drip 10/day
- CRM dedup (HubSpot + Pipedrive — needs migration 010)
- **Apollo email enrichment** (bulk_match by id — fixed 7 Jun, real emails now delivered)
- **`enrichAndDeliverLeads()`** — only charges credits for leads that get a real email

## FIGSY (The Opener · AI SDR)
- 19 API endpoints
- Campaign CRUD
- 3-step sequences
- Reply classification (🔥 Hot / Warm / etc.)
- FIGSY Memory (L1 per-client: best subjects, winning angles, reply rates)
- Unibox two-way
- Opt-out
- CRM push
- Escalation
- Identity card
- Weekly digest
- `paused_low_performance` (auto-pause underperforming campaigns)
- Self-outreach cron (dogfood)
- **🔴 Inbound reply pipeline (built + verified live 7 Jun):** Resend inbound subdomain
  `reply.get-kind.com` → Svix HMAC-SHA256 webhook auth → body fetch via `/emails/receiving/{id}`
  → classification → 🔥 Hot in portal Inbox
- **Compliance suppression guard (7 Jun):** hard-coded floor (smartsheet.com, brandfolder.com,
  outfit.io, slopeapp.com) + `SUPPRESSED_DOMAINS` env, enforced at all 6 outreach paths

## Milla (The Brain · VA · $49/mo)
- Doc RAG + source attribution
- Subscription billing wired (awaiting price-ID confirm in T5)

## Vida (The Connector · Chatbot · $29/mo)
- Config / embed / WhatsApp
- Subscription wired

## Denise (The Closer · AI AE · $99/mo) — LIVE & transactional as of 5 Jun
- Own dedicated page (denise.html)
- Billing ($99/mo)
- Workspace
- API routes
- ⚠️ **Go-live needs 2 founder actions:** (1) Stripe $99/mo price → `STRIPE_PRICE_DENISE_MONTHLY`;
  (2) migration `011_denise.sql` (✅ done)

## Billing
- Stripe credit + subscriptions
- Auto-topup
- Trial overlay
- Credits-at-delivery (charge when lead delivered, not when sourced)
- Overspend fix
- Low-credit warning
- Subscription-lapse handling

## Admin (13 routes)
`/` · clients · clients/[id] · demo · launch · roadmap · cmo · founder · playbook ·
terms-library · hubspot · scalability · unibox (+ analytics, revenue, compliance, partners)

## Portal (15 routes)
login · onboard · dashboard · leads · figsy (+ LinkedIn queue UI) · assistant · chatbot ·
documents · kpis · usage · billing · billing/confirm · roadmap · referral · settings

## Website (30+ pages)
homepage · about · pricing · support · terms · privacy · trust · dpa · dpa-us · use-cases ·
partners · story · values · blog · playbook · figsy · chatbot-agent · virtual-assistant ·
demo · demo-video · figsy-video · platform-video (+standalone) · vs-apollo · vs-outreach ·
vs-salesloft · vs-hiring-an-sdr · vs-prospecting-manually · denise.html · 3 vertical landing
pages (estate-agents, insurance-brokers, financial-advisers) · pipeline-calculator.html

## Other
- PWA (install banner, push-ready)
- Demo Environments
- 7 internal Founder Agent endpoints
- Partner Programme
- Founder morning brief (07:05 SAST)
- Cloudflare Pages CDN (built, needs activation)
- Portal V2 (built, **dormant** — `FEATURE_PORTAL_V2`, DO NOT enable, delete it)
- **LinkedIn outreach backend** — built (`lib/linkedin.ts`, 4 routes, queue migration, portal UI),
  needs PhantomBuster keys + SQL run. *(Supersedes old "never build LinkedIn" decision.)*

---

# PART F — 📈 FINANCIAL TARGETS & UNIT ECONOMICS

## Pricing (canonical — supersedes any stale value)
| Product | Price |
|---------|-------|
| **Lead Gen** | $1/credit (20/40/100 bundles = $20/$40/$100) |
| **FIGSY** | $3/credit (20/40/100 = $60/$120/$300) |
| **Milla** | $49/mo |
| **Vida** | **$29/mo** (NOT $39 — common stale value) |
| **Denise** | **$99/mo** (premium closer, decided 5 Jun) |
| **Bundle** | $69/mo |
| **The "one number"** | **"$20"** — true entry price (pay-per-result) on homepage hero |

## Unit Economics
- **Run cost floor:** ~$125/mo
- **Break-even:** 2 clients (infra) / 5 clients (all-in)
- **Margin:** 95%+
- **Models:** Sonnet 4.6 (Milla, FIGSY) + Haiku 4.5 (scoring, scraping)

## Growth Targets
| When | Clients | MRR | Milestone |
|------|---------|-----|-----------|
| **Launch (Fri 19 Jun)** | 0 | £0 | Both markets live |
| **Week 2–3** | 2–3 design partners | ~£2,500 | Case studies + logos |
| **Month 1** | 5 (break-even all-in) | ~£4,000 | Sustainable |
| **Month 2** | 20 + Product Hunt | ~£12,000 | Intelligence layer + MCP + V2 |
| **Month 3** | 50 + agent family | ~£40,000 | DENISE deep build live |
| **Month 3+** | 100+ + platform intelligence | £100,000+ | L4 cross-client moat |

## Outcome Pricing (#60 — gated, NOT live)
- **Gate:** ≥28% gross margin data required before enabling
- **The unlock number:** *average credits consumed to produce one booked meeting*
  - ~8 credits → cost ≈ $24 → charge $40 → ~40% margin ✅
  - ~20 credits → cost ≈ $60 → charge $40 → lose $20/meeting ❌ (bankrupts at scale)
- **Model:** separate menu (client picks ONE: credit OR outcome, never both)
  - Lead Gen (outcome): $15 / qualified reply
  - FIGSY (outcome): $40 / confirmed meeting (calendar event = billable, no-shows not refunded)
- **Proven by:** Intercom Fin ($0.99/resolved ticket), Salesforce ($2/AI conversation)

---

# PART G — 🚫 WILL NOT BUILD / PARKED (PART 6)

**Never:** Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat ·
multi-year contracts

**Gated:** 50+ data sources (only at 50+ clients) · African-language support (after WhatsApp)

⚠️ **Note:** "LinkedIn automation — never build" is **SUPERSEDED.** The backend is built and
activates Week 1. Remove the contradictory "never" lines from MASTER.md.

---

# PART H — ⚠️ MASTER.md CONTRADICTIONS TO CLEAN (PART 8 — post-launch hygiene)

> None block launch. All should be cleaned so the historical MASTER.md stops contradicting itself.
> (EVERYTHING.md is the source of truth; MASTER.md is archive.)

1. **Vercel still listed as a host** → Railway only
2. **Launch day printed 3 ways** (Mon/Tue/historical) → was Monday, **now Fri 19 Jun**
3. **Vida price $39 vs $29** → $29
4. **Pricing tables disagree** ($20/$38/$88 vs $1/credit flat) → $1/credit canonical
5. **Cron count 16 vs 19** → 16 (3 status crons never built)
6. **DENISE/LENA/OTTO Month 3 vs Year 2** → DENISE #1 next build; LENA/OTTO Month 3
7. **LinkedIn "never build" vs built** → built, activating Week 1
8. **Duplicate sections** (24–28 twice; 5-day plan twice) → delete duplicates
9. **Calendly personal link** (`jacques-vieiraza/30min`) → neutral `kind-ai-demo/new-meeting` (name-exposure risk)
10. **"Done vs pending" conflicts** → reconcile to actual Railway/Supabase state
11. **Cashflow §14** ("Vercel Pro $20" + "Apollo Basic $99") → ~$125 floor, Apollo $49–65
12. **us.app / separate-stack remnants** → single URL/DB
13. **eu-west-1 stale note** → af-south-1
14. **Admin cohort analytics "Built" vs "route doesn't exist"** → not built
15. **15-step smoke test vs 57-step** → 57-step `docs/SMOKE_TEST.md`

---

# 📅 TIMELINE REVIEW — WHEN EACH OPERATIONAL ITEM LANDS

| Item | Phase | Date | Owner |
|------|-------|------|-------|
| TIER-0 credential rotation (Ring 3) | Pre-launch | Mon 8 – Tue 9 | 🧍 |
| ICO registration (Ring 2) | Pre-launch | Sun 14 | 🧍 |
| SR01 + registered office + WHOIS + LinkedIn (Ring 1) | Pre-launch | Sun 14 | 🧍 |
| SEIS advance assurance (Ring 4) | Parallel | Soon | 🧍 |
| Performance-guarantee ToS clause (Ring 4) | Weeks 2–4 | Jun 29+ | 🤖 |
| **Staging environment (Part B)** | **Before Month 2** | **Late Jul** | 🤝 |
| HubSpot key (Part D) | Week 1 | Jun 19–28 | 🧍 |
| LinkedIn PhantomBuster keys (Part D) | Week 1 | Jun 19–28 | 🧍 |
| Flutterwave key (Part D) | Weeks 2–4 | Jun 29+ | 🧍 |
| D&O insurance (Ring 1) | Month 2 | Late Jul | 🧍 |
| Trademarks (Ring 4) | Month 2–3 | Aug | 🧍 |
| Google Calendar OAuth (Part D) | Month 2 | Late Jul | 🧍 |
| Vapi voice keys (Part D) | Month 2 | Late Jul | 🧍 |
| WhatsApp Meta approval (Part D) | Week 1 apply → Month 2 live | Jun 19 → Aug | 🧍 |
| Pen test (Ring 3) | Month 3 | Sep | 🧍 |
| ODPC Kenya / NDPR (Ring 2) | First NG/KE client | Gated | 🧍 |
| VAT registration (Ring 4) | At £90k | Gated | 🧍 |
| ISO 27001 / 42001 / SOC 2 (Ring 3) | Year 2 | 2027 | 🧍 |
| MASTER.md cleanup (Part H) | Post-launch | After Fri 19 | 🤖 |

---

**Document Version:** 7 Jun 2026
**Companion docs:** STRATEGIC-ROADMAP-19JUN-2026.md · DAILY-ACTION-PLAN-TO-LAUNCH.md · ALL-BUILDS-TIMELINE-96-ITEMS.md
**Source:** EVERYTHING.md Parts 2, 3, 4, 4B, 7 + NUMBERS
**Next Update:** After Smoke Test 2 (Sat 13 Jun)
