> ⚠️ **ARCHIVED / HISTORICAL — superseded, kept for the record only.** Product **LAUNCHED 18 Jun 2026**. This doc is pre-launch/dated and is **NOT current**. For current truth use: **LAUNCH-PAD** (daily execution) · **PRODUCT-INVENTORY** (status) · **KIND-MASTER** (strategy + session log) · **V2-TRACKER** (future detail). *(Originally: a 7 Jun 2026 session-handoff + roadmap transfer doc.)*

# 📋 K.I.N.D — SESSION HANDOFF + FULL ROADMAP (7 Jun 2026)

> ⛔ **SUPERSEDED (8 Jun 2026) — DO NOT USE.** Single source of truth is now
> **`docs/KIND-MASTER.md`** (branch `claude/kind-carson-MYhSl`). Historical snapshot only.

> Self-contained transfer doc. Everything decided/diagnosed this session + the complete dated roadmap.
> **Source of truth remains `docs/EVERYTHING.md`** — this mirrors its top sections for transfer.

---

## ⚠️ BRANCH NOTE — READ FIRST
All of today's work + the `EVERYTHING.md` updates are on branch **`claude/kind-carson-MYhSl`** (pushed).
If the other conversation is on a different branch / `main`, **merge `claude/kind-carson-MYhSl` first** or it won't see any of this.

---

## 🔑 WHAT CHANGED TODAY
1. **🚀 Launch rebased: Mon 8 Jun → FRIDAY 19 JUNE 2026.** No half-baked launch — deliverability needs a warmup clock + the paid path is unverified. 12-day plan with a buffer day (Mon 15).
2. **🔴 NEW #1 BLOCKER — Deliverability** (mail going to spam, verified in code). Full detail below.
3. **`EVERYTHING.md` rewritten** — new top sections: LAUNCH ROADMAP + MASTER TIMELINE (every element dated). Old "Mon launch" table superseded.
4. **Market intel re-applied:** MCP `#59` Month 3 → **Month 2**; Denise `#54` confirmed **#1 post-launch**; competitive scan already in PART 5.
5. **Pulled INTO pre-launch:** all 7 cosmetics (Fri 12); `booking_url` paste field (Tue 9); basic Vida in-portal support bubble (Fri 12).

## ✅ VERIFIED FACTS (don't re-investigate)
- All 7 Jun work **is on `main`** (`b35351f`) — earlier "not on main" was a stale cached ref.
- Migrations `010_crm_dedup.sql` + `011_denise.sql` exist in **`packages/db/src/migrations/`** (not `supabase/`).
- Auto-outreach gating real (`icps.ts:171`, off by default).
- `BUILD MARKER` debug still live (`index.ts:165`) — strip Tue 9. `previewCount` is a **real feature**, not debug.

## 📨 FIVE FOUNDER FINDINGS (7 Jun) — all captured
| Finding | Where |
|---|---|
| FIGSY/Milla calendar — agent should onboard w/ FIGSY steps & show calendar connect | `V2-13(b)` (agent-led onboarding) |
| Not just Google (Zoho/Calendly/Microsoft) | `V2-13(a)` + `booking_url` field pulled to pre-launch (Tue 9) |
| Vida live in portal — bottom-right help bubble | `V2-11` Critical + basic version pulled to pre-launch (Fri 12) |
| ICP "New ICP" scroll-past-all-cards | Cosmetic `C6` (Fri 12) |
| Strong dashboards + how "Pipeline Value" card is built | `V2-12` + `C7` — $1,013,000 = sum of AI `estimated_deal_value_usd` (`leads.ts:115`), NOT booked revenue → relabel "Est. pipeline value" |

## ❓ OPEN (founder's call, parked — not blocking)
- Calendar: keep `booking_url` field pre-launch + full Outlook/Zoho OAuth Month 2 (recommended) vs pull full multi-provider forward.
- Vida support bubble: basic pre-launch (recommended) vs Week 1 vs Month 2.

---

# 🚀 LAUNCH ROADMAP → FRIDAY 19 JUNE 2026

## The 5 pre-launch workstreams
0. 🔴 **Deliverability** — #1, the long pole (warmup clock)
1. **Paid path + client-journey verification** (Smoke Test 1 + 2, T1–T7)
2. **Founder infra / security**
3. **Polish + Cosmetic**
4. **Dress rehearsal → Go/No-Go → launch (ramped)**

## 0. 🔴 DELIVERABILITY (the reason the date moved)
**4 verified root causes:** (1) cold outreach sends from the **primary domain** `hello@get-kind.com` (`figsy.ts:9`) → poisons transactional + corporate reputation; (2) **no `List-Unsubscribe`/one-click** (`figsy.ts:378`) → Gmail/Yahoo auto-spam since Feb 2024; (3) tracking pixel can fall back to a raw **Railway URL** (`figsy.ts:363`) → phishing signal; (4) **HTML-only, no plain-text part**. Plus From/Reply-To domain split needs DMARC alignment. **Live SPF/DKIM/DMARC status UNCONFIRMED** — check Resend + GoDaddy.
**Fix — architecture:** `get-kind.com` = transactional/corporate only (never cold); **dedicated cold domain(s)** (lookalikes) for outreach; target state = each client sends from their own domain.
**Fix — DNS (each sending domain):** SPF `v=spf1 include:_spf.resend.com ~all` · DKIM (Resend `resend._domainkey` → Verified) · DMARC `v=DMARC1; p=none; rua=…` → quarantine → reject · custom return-path + tracking domain.
**Fix — warmup (long pole, START DAY 1):** ~2–3 wks, ramp from ~5–10/day, ≤30–50/day per mailbox. At launch domains ~11 days warmed → **cold goes out ramped, not a blast**; transactional live day 1.
**Code (Claude):** D1 List-Unsubscribe+one-click+unsubscribe endpoint · D2 plain-text part · D3 fix tracking pixel · D4 configurable cold-FROM · D5 transactional headers/plaintext.
**Founder:** buy cold domain(s) · SPF/DKIM/DMARC · verify Resend · start warmup · verify get-kind.com auth · confirm `API_URL` set · inbox-placement test (mail-tester/GlockApps → 10/10).

---

# 📆 MASTER TIMELINE — EVERY ELEMENT, DATED
Owner: 🧍 Founder · 🤖 Claude · 🤝 Both. ✅ done · ⬜ todo · ⏳ in progress · ⏸ gated · 🚫 won't.

## ① PRE-LAUNCH · Mon 8 → Fri 19 Jun (firm dates)
| Date | Element | Owner |
|------|---------|-------|
| **Mon 8** | Deliverability code **D1–D5** | 🤖 |
| **Mon 8** | **D6–D8** buy cold domain(s); SPF/DKIM/DMARC; verify Resend; **START warmup**; verify get-kind.com auth; confirm `API_URL` | 🧍 |
| **Mon 8** | Start **#1** TIER-0 credential rotation (Stripe, Supabase service-role, DATABASE_URL, anon, Anthropic, Resend×2, HubSpot, Admin secret, Stripe webhook; Apollo ✅) | 🧍 |
| **Tue 9** | **#6** migration `010_crm_dedup.sql` · **#7** Denise Stripe price + redeploy · **#7/8** DNS app/api/admin/status → `NEXT_PUBLIC_API_URL` + Resend webhook · finish **#1** | 🧍 |
| **Tue 9** | **DEPLOY** pipeline fix · **P-b** strip `BUILD MARKER` · **P-a** "sign emails as" · **#2** delete dead Portal-V2 + flag · **CAL-min** `booking_url` paste field (T3/T4 depend on it for non-Google clients) | 🤖 |
| **Tue 9** | Smoke Test 1A: **T1** (fresh email) · **T2** 8–9 · **T3** 10–13 (incl. step 13 pause→no send) | 🧍 |
| **Wed 10** | Smoke Test 1B: **T4** booking+KPI · **T5** billing (single-charge, webhook idempotency, Milla 403) · **T6** Vida widget · **T7** Milla cron leak | 🧍 |
| **Wed 10** | **#17** fix smoke failures same-day (✅ **#17b** data floor shipped) | 🤖 |
| **Fri 12** | **Cosmetics C1–C7** (ICP-above-People · agent-card consistency · ICP banner copy · agent panels→FIGSY layout · ClickUp-style signup · New-ICP opens at top · "Est. pipeline value" relabel) | 🤖 |
| **Fri 12** | **VIDA-support** basic in-portal help bubble (reuse existing Vida embed) | 🤖 |
| **Sat 13** | **Smoke Test 2** — full clean re-run T1–T7 green | 🤝 |
| **Sun 14** | Legal: **#10** ICO £40 · **#11** SR01 · **#12** registered office + service address · **#13** WHOIS privacy · **#14** LinkedIn lockdown · **#9** Calendly + `version.txt` | 🧍 |
| **Sun 14** | **D9** inbox-placement test → fix auth gaps | 🤖 |
| **Mon 15** | **Buffer** — slip absorption, re-runs, cosmetic spillover | 🤝 |
| **Tue 16** | Dress rehearsal — fresh-signup end-to-end (not dogfood); warmup review | 🧍 |
| **Wed 17** | Final fixes; prep launch campaigns (ramp); confirm `AUTO_OUTREACH_ENABLED` | 🤝 |
| **Thu 18** | **Go/No-Go** sign-off; set ramped send volume | 🤝 |
| **Fri 19** | 🚀 **LAUNCH** both markets (transactional live; cold ramped) | 🤝 |
| Parallel | **F1** free cloud/AI credits (Microsoft/Google/AWS) · **SEIS** advance assurance (file soon) | 🧍 |

## ② WEEK 1 · ~22–28 Jun
**#19** 10 warm outreach · **#20** LinkedIn 1/day (anon handle) · **#21** activate LinkedIn outreach (queue SQL + PhantomBuster) · **#22** Meta/WhatsApp API application · **#23** record real demo (16:9+9:16) · **#24** replace hero animation (blocked on #23) · **#25** instrument GTM funnel · **#26** dogfood self-outreach + competitor-switcher ICP · daily client briefing email. **Ops begin:** daily Admin/Unibox/brief; weekly Fri review; sales SOP.

## ③ WEEKS 2–4 · ~29 Jun–19 Jul
**#27** 2 design-partner slots · **#28** 9:16 social cuts · **#29** 3 onboarding Looms · **#30** onboarding v2 + day-0/3/7 sequence · **#31** proof block real numbers · **#33** Flutterwave · **#34** YouTube · **#35** playbook email form. **Steals:** 61a/g guarantee clause · 61e influencer/community · 62b Revenue Playbook Session · 62c homepage outcome numbers. **Legal:** ODPC/NDPR ⏸ on first NG/KE client.

## ④ MONTH 2 · ~late Jul–Aug (GATED: 10+ clients)
**PREREQ (Part 4B):** stand up **staging** before any V2 touches main.
**Intelligence:** #37 intent signals · #38 A/B subjects · #39 morning brief · #40 ICP auto-refine (L2) · #41 conditional branching · #42 waterfall enrichment · #43 deliverability dashboard · #44 email score pre-send · #45 adaptive volume · #46 FIGSY Memory v2 (pgvector) · #47 Milla full-context CRM · #48 Vapi voice · #49 Product Hunt · #50 G2 · #51 configurable triggers · #52 multi-model · #53 inbox rotation.
**#59 MCP server — PULLED FWD M3→M2** (1st milestone: one endpoint to start a FIGSY campaign).
**V2 portal redesign (13):** V2-1 card grid · V2-2 thinking state · V2-3 conversational setup · V2-4 config panel · V2-5 marketplace · V2-6 slim sidebar · V2-7 invite teammate · **V2-8 AI Notetaker (Critical)** · **V2-9 Teams Hub (Critical)** · V2-10 Casey onboarding agent · **V2-11 🔴 Vida in-portal help bubble (Critical)** *(basic pulled to pre-launch)* · **V2-12 🔴 strong client dashboards (Monday-style)** · V2-13 multi-provider calendar — Outlook/Zoho OAuth + agent-led onboarding *(booking_url min pulled to pre-launch)*.
**Legal:** D&O insurance · trademarks (K.I.N.D+FIGSY+Milla+Vida).

## ⑤ MONTH 3 · ~late Aug–Sep (GATED: family build + margin data)
**#54 DENISE deep build (#1)** — Calendly auto-book · call notetaker · live objection extraction · proposal-from-transcript · pipeline follow-up · persona prompt · admin card. *Build deep or don't ship.*
**#55** LENA · **#56** OTTO · **#57** orchestration (shared memory) · **#58** 500+ skill library · **#60** outcome pricing ⏸ GATED ≥28% margin · **#61** mobile app · **#62** built-in CRM (Kanban) · **#63** pan-African design partners · **#64** cross-client intelligence (L4) · **#65** data licensing · **#66** advanced ICP refine · **#67** pipeline forecasting · **#68** in-portal messaging · **#69** proposal + e-sign · **#70** meeting notetaker. **Legal:** pen test.

## ⑥ YEAR 2 · 2027
**#71** ISO 27001 · **#72** ISO 42001 · **#73** SOC 2 Type II · **#74** Vanta triple-cert · **#75** 3-type memory · **#76** visitor de-anon · **#77** churn-risk · **#78** revenue forecasting · **#79** call intelligence.

## ⑦ ONGOING / PARALLEL (trigger-based)
**Legal:** AI Risk Register (start now) · VAT at £90k · IR35/IP (first hire) · SeedLegals IP (at raise) · annual filings · scrub founder name from internal mockups · Cloudflare WAF AS46582 (once proxied). **Funding:** F1 credits NOW → F2 SA ecosystem (5–10 clients) → F3 YC → F4 revenue financing → F5 influencer; revisit raise at 20–30 clients. **Tech-debt:** delete dormant Portal-V2 · Apollo keyword picker · tighten ICP prompt · admin proxy URL · commit signing. **MASTER.md cleanup:** 15 contradictions (Part 8). **Competitive watch:** monitor Revio (B2B cold outbound = enters FIGSY lane); hold specialisation lane; use warmth window now.

## ⑧ ⏸ BLOCKED — credentials only
Milla/Vida Stripe price IDs · Flutterwave · HubSpot · Vapi · WhatsApp (Meta) · Google Calendar OAuth · Clearbit · PhantomBuster · Cloudflare · Render standbys + UptimeRobot.

## 🚫 WILL NOT BUILD / PARKED
Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts · 50+ data sources (50+ clients) · African-language (after WhatsApp). *(LinkedIn "never" SUPERSEDED — backend built, activates Week 1.)*

## 📈 TARGETS
| When | Clients | MRR |
|------|---------|-----|
| Launch (19 Jun) | 0 | £0 |
| Week 2–3 | 2–3 design partners | ~£2,500 |
| Month 1 | 5 (break-even) | ~£4,000 |
| Month 2 | 20 + Product Hunt | ~£12,000 |
| Month 3 | 50 + agent family | ~£40,000 |

---

## ▶️ WHERE TO RESUME
**Workstream 0 (deliverability) on Mon 8** — nothing implemented yet (founder's call). First artifacts: exact DNS records + cold-domain shopping list, then code D1–D5.
