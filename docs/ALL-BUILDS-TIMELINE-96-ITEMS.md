# 📦 ALL FUTURE BUILDS (#1–96) — COMPLETE TIMELINE & ALIGNMENT

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
