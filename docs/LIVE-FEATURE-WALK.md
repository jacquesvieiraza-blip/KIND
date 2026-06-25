# 🚶 K.I.N.D — LIVE-FEATURE WALK (the verification checklist)
`Last-checked: 25 Jun 2026` _(the "Mon 22" walk-plan dates below are historical; the walk is still pending — status of record = PRODUCT-INVENTORY)_

> **Purpose:** every feature/element that is LIVE in production, in one tickable list — so we confirm **it all works** and move the board from 🩷 → 🟢. Source of record for status stays `PRODUCT-INVENTORY`; this is the *walk tool* that drives the flips.
> **How to use:** walk each item on the live site, mark it, and tell me the IDs. **✅ works → I flip 🩷→🟢** · ⚠️ placeholder → note it · **🔴 broken → I fix same-day** (drops to 🔴 on the board until fixed).
> **Legend:** ⬜ not yet walked · ✅ confirmed working · ⚠️ partial/placeholder · 🔴 broken. *(Source dot: 🟢 = already verified pre-launch · 🩷 = live, needs this walk.)*
> **Sites:** LIVE = `app.get-kind.com` (portal) · `admin.get-kind.com` (admin) · `www.get-kind.com` (site).

---

## 🔬 PASS 1 — CODE-VERIFIED PORTAL AUDIT (25 Jun 2026)
> **Founder reset (25 Jun): "polish every element we have before we build more — a half-built product is worth nothing."** So before any live-walk, every client screen was read in the code. This is the truth of *what is real vs a shell* — the prep that makes the live-walk meaningful.
> **Code verdict:** REAL = fetches live data + renders it · PARTIAL = real + some stub/placeholder · SHELL = static/mock/disabled, no data.
> **Live nav:** ✅ in left sidebar · 👤 in profile menu · 🔒 gated (only shows if that agent/flag is unlocked) · ⛔ **orphan — reachable from NO menu**.
> **Scorecard: 36 REAL · 5 PARTIAL · 7 SHELL across ~48 client screens.** Every screen exists; the gaps are polish + reachability, not absence.

| Route | Item | Live nav | Code | Gap to polish |
|-------|------|----------|------|---------------|
| `/dashboard` | 116 | ✅ Home | REAL | — |
| `/dashboard/leads` | 13/18 | ✅ People | REAL | bulk ops use raw `fetch` → fail silently |
| `/dashboard/leads/overview` | — | ⛔ orphan | REAL | built, linked from nowhere |
| `/dashboard/leads/icp` | 5 | ✅ ICP Builder | REAL | vertical templates hardcoded (gated) |
| `/dashboard/leads/icp/builder` | 121 | 🔒 flag | PARTIAL | Milla chat behind feature flag |
| `/dashboard/leads/linkedin` | 11 | ✅ LinkedIn Import | REAL | client-side CSV parse only |
| `/dashboard/prospects` | — | ⛔ orphan | REAL | built, linked from nowhere |
| `/dashboard/figsy` | 14 | ✅🔒 FIGSY | REAL | — |
| `/dashboard/figsy/[id]` | 14/113 | (from list) | REAL | — |
| `/dashboard/figsy/replies` | 18 | ⛔ orphan | REAL | superseded by `/inbox` — decide cut |
| `/dashboard/figsy/sequences` | 70/187 | ✅ Sequences | REAL | — |
| `/dashboard/figsy/sequence-builder` | 82 | ✅ Seq Builder | **SHELL** | ⚠️ **"coming live in #89" MOCK sits in the LIVE nav** |
| `/dashboard/figsy/kanban` | 114 | ⛔ orphan | REAL | built, not linked |
| `/dashboard/figsy/linkedin` | 127 | ⛔ orphan | REAL | needs Phantombuster key |
| `/dashboard/figsy/webhooks` | 47 | ✅ Webhooks | REAL | — |
| `/dashboard/figsy-chat` | 22 | ✅ Chat w/FIGSY | REAL | — |
| `/dashboard/inbox` | 112 | ✅ Inbox | **PARTIAL** | ⚠️ ICP-score `—` hardcoded · archive folder dead · "booked" not persisted |
| `/dashboard/templates` | 70 | ✅ Templates | SHELL | static library (acceptable; no save) |
| `/dashboard/agents` | 125 | ✅ KIND AI | REAL | — |
| `/dashboard/assistant` | 2 | ✅🔒 Milla | REAL | integrations row all "coming soon" |
| `/dashboard/denise` | 4 | ✅🔒 Denise | REAL | — |
| `/dashboard/chatbot` | 3 | ✅🔒 Vida | REAL | — |
| `/dashboard/knowledge` | 74 | ✅🔒 FIGSY | **PARTIAL** | ⚠️ `TRAINING_LIVE=false` → every Save is a noop |
| `/dashboard/notetaker` | 81 | ✅🔒 Milla | REAL | export-to-Slack / add-to-tasks stubbed |
| `/dashboard/kpis` | 195 | ✅ Performance | REAL | — |
| `/dashboard/analytics` | 193 | ✅ Analytics | REAL | — |
| `/dashboard/roi` | 191 | ✅ Your ROI | REAL | — |
| `/dashboard/deliverability` | 90 | ⛔ (redirect) | redirect→kpis | intentional consolidation |
| `/dashboard/activity` | 88 | ⛔ orphan | REAL | also lives as a Home widget (116) |
| `/dashboard/billing` | 23 | ✅ Billing | REAL | — |
| `/dashboard/documents` | 136a/186 | ✅🔒 Milla | REAL | ✓ surfaces T&C+Privacy+DPA + signed-acceptance record + invoices — **gated behind Milla** |
| `/dashboard/usage` | 28 | ✅ Usage | REAL | — |
| `/dashboard/proposals` | 39 | ✅ Proposals | REAL | — |
| `/dashboard/settings` | 41 | ✅ Settings | REAL | — |
| `/dashboard/messages` | 38 | ✅ Messages | REAL | — |
| `/dashboard/referral` | — | 👤 profile | PARTIAL | referrals-table endpoint may not exist |
| `/dashboard/marketplace` | — | 👤 profile/flag | REAL | Lena/Tony "coming soon" cards |
| `/dashboard/config` | — | ⛔ orphan/flag | REAL | built, not linked |
| `/dashboard/company` | 55 | ⛔ orphan | REAL | ⚠️ **the whole Command Centre is reachable from NO client menu** |
| `/dashboard/team` | 80 | ✅ Team | **PARTIAL** | ⚠️ Analytics/Activity/Permissions tabs "coming soon" · Create-team = `alert()` |
| `/dashboard/partner` | 37/42 | ✅🔒 partner | REAL | — |
| `/dashboard/partner/deck` | — | (from hub) | SHELL | static slides (collateral) |
| `/dashboard/partner/onboarding` | — | (from hub) | SHELL | static steps (collateral) |
| `/dashboard/partner/pricing` | — | (from hub) | SHELL | ⚠️ **shows ZAR (R1,500–3,500) — pricing is USD-locked** |
| `/dashboard/integrations` | 83 | ✅ Integrations | REAL | Connect button = "coming soon" toast |
| `/dashboard/developer` | 46 | ✅ Developer API | REAL | — |
| `/dashboard/mcp` | 45 | ✅ MCP Connect | REAL | — |

### 🎯 What Pass 1 found — the "half-built" reality, in priority order
**P1 — in the live nav but broken/shell (a client WILL hit these):**
1. **Sequence Builder (82)** — a "coming live in #89" mock sits in the FIGSY menu. Click → dead. *Either wire it or pull it from nav.*
2. **Knowledge (74)** — `TRAINING_LIVE=false`; every Save silently does nothing, despite the inventory saying the backend lit it up. *Enable or honestly gate.*
3. **Inbox (112)** — real, but ICP-score is a hardcoded `—`, the Archive folder does nothing, "mark booked" isn't saved. *Fix the 3 TODOs.*
4. **Team (80)** — 3 of 4 tabs say "coming soon"; "Create team" is a browser `alert()`.
5. **Stubbed buttons on otherwise-real pages** — Assistant integrations, Notetaker export, Integrations Connect all "coming soon".

**P2 — orphans (built, polished, but reachable from no menu):** `company` (55 — the Command Centre!), `figsy/kanban` (114), `activity` (88), `figsy/replies`, `figsy/linkedin`, `leads/overview`, `prospects`, `config`. *Each: wire into nav or consciously cut.*

**P3 — stale content:** `partner/pricing` still in ZAR; pricing is USD-locked.

**Note on your Documents ask:** the Documents page **already does** what you wanted — it surfaces Terms + Privacy + DPA *and* the signed-acceptance record from signup, plus Stripe invoices. The only catch: it's hidden unless **Milla** is unlocked. That's a P1-reachability call, not a build.

> **Pass 2 = the live-walk** (below). Pass 1 tells us which screens are worth walking and which need a fix first.

---

## 🗓️ THE PLAN — walk everything by Monday next week (~120 items, ~1 area/day)
- **Today (Mon 22) — tonight's 6 new builds + the agents/lead-gen core** (the highest-value + newest).
- **Tue 23 — Outreach / FIGSY + the Inbox.**
- **Wed 24 — Billing & payments + the Company Engine (teams).**
- **Thu 25 — The rest of the client-portal screens (design screens 80–91 + R-wave 60–79).**
- **Fri 26 — Admin OS + Marketing site + Developer/integrations.**
- **Mon 29 — Platform/infra + the leads waterfall (after keys) + final sweep → board fully 🟢.**
*(As each chunk is confirmed, I render those IDs 🩷→🟢 the same session.)*

---

## ⭐ TONIGHT'S 6 NEW BUILDS — walk these FIRST (live since 22 Jun)
- ⬜ **112** NEW Unibox inbox — `/dashboard/inbox` (Gmail-style, 5-col, brand-purple) 🩷
- ⬜ **113** A/B subject UI — FIGSY campaign → **A/B Test** tab 🩷
- ⬜ **114** Kanban polish — `/dashboard/figsy/kanban` 🩷
- ⬜ **136a** Invoices — Company → Documents → Invoices 🩷
- ⬜ **178** Voice widget — Vida bubble (⏸ **Vapi PARKED 25 Jun** — not on the revenue path; shell only) 🩷
- ⬜ **140** Leads waterfall (backend) — confirm Hunter/PDL keys in Railway → see PDL/Hunter leads on an ICP run 🩷

---

## 🤖 The 5 agents (client portal)
- ⬜ **1 FIGSY** (AI SDR) — finds leads, unique email/lead, 3-step follow-up *(→ 6-step planned, item 212)*, books meetings 🟢
- ⬜ **2 Milla** (Brain/VA) — drafting, Q&A, weekly brief 🟢
- ⬜ **3 Vida** (Connector) — website chat widget, captures/routes 🟢 *(WhatsApp PARKED — not a cold channel; inbound-only if ever)*
- ⬜ **4 Denise** (Closer) — warm follow-up + proposals, sub-gated 🟢
- ⬜ **Casey** (onboarding) — conversational setup (`/v2/setup`)

## 🎯 Lead gen & data
- ⬜ 5 ICP builder 🟢 · ⬜ 6 Apollo sourcing (3-pass) 🟢 · ⬜ 7 AI scoring 0–100 🟢
- ⬜ 8 delivery + charge-on-delivery 🟢 · ⬜ 9 POPIA opt-out (6 paths) 🟢 · ⬜ 10 enrichment 🟢
- ⬜ 11 LinkedIn CSV 🟢 · ⬜ 12 lookalike 🟢 · ⬜ 13 cross-links + stats 🟢
- ⬜ 67 saved views (R8) 🩷 · ⬜ 79 job-change alerts (R20) 🩷 · ⬜ 71 lead-capture forms (R12) 🩷

## 📣 Outreach / FIGSY
- ⬜ 14 campaigns CRUD 🟢 · ⬜ 15 Auto/Co-pilot 🟢 · ⬜ 16 3-step sequences 🟢 *(→ 6-step planned, item 212)*
- ⬜ 17 reply classification 🟢 · ⬜ 19 mark-booked + KPI 🟢 · ⬜ 22 Suggest Campaigns · FIGSY Chat 🟢
- ⬜ 20 deliverability suite D1–D5 🟢 · ⬜ 21 warmup 🟢
- ⬜ 68 "Why FIGSY wrote this" (R9) 🩷 · ⬜ 69 Goals (R10) 🩷 · ⬜ 70 sequence-template library (R11) 🩷
- ⬜ 75 evals (R16) 🩷 · ⬜ 76 spam-score (R17) 🩷 · ⬜ 77 Fast/Smart toggle (R18) 🩷 · ⬜ 74 Train-FIGSY knowledge (R15) 🩷
- ⬜ 82 Visual Sequence Builder 🩷 · ⬜ 113 A/B UI 🩷 · ⬜ 114 Kanban 🩷

## 📥 Inbox & replies
- ⬜ 112 NEW Unibox 🩷 · ⬜ 66 "Help me reply" (R7) 🩷 · ⬜ 72 Cmd+K (R13) 🩷 · ⬜ 89 Notification centre 🩷 · ⬜ 50 push notifications 🟢

## 💳 Billing & payments
- ⬜ 23 Stripe checkout + webhooks 🟢 · ⬜ 24 Flutterwave wired 🟢 · ⬜ 26 agent subs (Vida $29/Milla $49/Denise $39) 🟢 · ⬜ 28 usage tracking 🟢
- ⬜ 166 double-charge killed 🩷 · ⬜ 167 FIGSY-only delivers 🩷 · ⬜ 168 price tables reconciled 🩷 · ⬜ 169 plan flag 🩷 · ⬜ 170 atomic credits 🩷 · ⬜ 171 credits-panel honesty 🩷
- ⬜ 58 Denise $39 price 🩷 · ⬜ 136a Invoices 🩷 · ⬜ 190 pause / win-back 🩷

## 🏢 Company Engine / teams
- ⬜ 55 Command Centre 🟢 · ⬜ 56 per-rep agent unlock 🟢 · ⬜ 80 Teams Hub 🩷
- ⬜ 106 invite email 🩷 · ⬜ 107 owner drill-down 🩷 · ⬜ 108 edit rep budget 🩷 · ⬜ 109 manager role 🩷 · ⬜ 110 per-rep routing + dedup 🩷 · ⬜ 111 per-rep calendars 🩷

## 🖥️ Other client-portal screens
- ⬜ 81 AI Notetaker 🩷 · ⬜ 83 Integrations Hub 🩷 · ⬜ 88 Activity feed 🩷 · ⬜ 90 Deliverability dashboard 🩷
- ⬜ 85 slim nav + agent switcher 🩷 · ⬜ 86 profile dropdown hub 🩷 · ⬜ 87 status bar 🩷 · ⬜ 91 mobile PWA icons 🩷 · ⬜ 84 Signup + SSO 🩷
- ⬜ 60 demo-bounce guard (R1) 🩷 · ⬜ 61 daily brief toggle (R2) 🩷 · ⬜ 62 Vida help bubble (R3) 🩷 · ⬜ 63 speed-to-lead (R4) 🩷 · ⬜ 64 milestone cards (R5) 🩷 · ⬜ 65 onboarding day-0/3/7 emails (R6) 🩷 · ⬜ 73 Meeting-Prep (R14) 🩷 · ⬜ 78 "What's New" feed (R19) 🩷
- ⬜ 178 voice widget 🩷 · ⬜ 191 ROI dashboard 🩷 · ⬜ 192 activation nudges 🩷 · ⬜ 162 Prompt Library 🩷 · ⬜ 179 shareable pipeline view 🩷

## 🛠️ Developer / integrations
- ⬜ 45 MCP server 🟢 · ⬜ 46 Developer API 🟢 · ⬜ 47 webhooks (Stripe/Flutterwave/Resend) 🟢 *(Vapi webhook ⏸ parked)*
- ⬜ 182 Zapier/Make + 185 outbound webhooks + event API 🩷 · ⬜ 183 campaign kill-switch 🩷

## 🔐 Admin OS (`admin.get-kind.com`)
- ⬜ 29 dark shell key-protected 🟢 · ⬜ 30 clients list 🟢 · ⬜ 31 Revenue/Cohorts/Analytics 🟢 · ⬜ 32 Showcase demo 🟢
- ⬜ 33 Compliance/Moat/Scalability 🟢 · ⬜ 34 CMO dogfood 🟢 · ⬜ 35 founder dashboard + health/status 🟢 · ⬜ 37 Partners mgmt 🟢
- ⬜ 38 Unibox + Visitors + Messages 🟢 · ⬜ 39 Proposals/Orders/Terms 🟢 · ⬜ 40 Smoke/Seed/Docs 🟢
- ⬜ 180 admin audit log 🩷 · ⬜ 188 Denise on demo 🩷 · ⬜ 192 activation admin view 🩷

## 🌐 Marketing site (`www.get-kind.com`)
- ⬜ 53 40+ pages (pricing, per-agent, vs-pages, blog, legal) 🟢 · ⬜ 162 Prompt Library (Resources) 🩷 · ⬜ 163 product-videos hero

## ⚙️ Platform / infra (behind the scenes)
- ⬜ 41 auth (signup/login/RLS) 🟢 · ⬜ 42 Partner Programme 🟢 · ⬜ 43 CRM integration 🟢 · ⬜ 44 Google Calendar 🟢
- ⬜ 48 outcome-event data floor 🟢 · ⬜ 49 rate limiting 🟢 · ⬜ 51 failover 🟢 · ⬜ 52 key rotations 🟢 · ⬜ 54 staging env 🟢
- ⬜ 186 signup T&C record 🩷 · ⬜ 187 sequence→apply-to-campaign 🩷 · ⬜ 193 real open-tracking 🩷 · ⬜ 195 metrics one-source 🟢
- ⚠️ **194 deliverability** — the known open risk (warmup tool 198 is the fix)

---
*When a chunk is confirmed, I render those IDs 🩷→🟢 in `PRODUCT-INVENTORY` + bump this doc's `Last-checked`. Goal: every item ✅ by Mon 29 Jun.*
