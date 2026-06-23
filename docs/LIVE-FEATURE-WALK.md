# 🚶 K.I.N.D — LIVE-FEATURE WALK (the verification checklist)
`Last-checked: 22 Jun 2026`

> **Purpose:** every feature/element that is LIVE in production, in one tickable list — so we confirm **it all works** and move the board from 🩷 → 🟢. Source of record for status stays `PRODUCT-INVENTORY`; this is the *walk tool* that drives the flips.
> **How to use:** walk each item on the live site, mark it, and tell me the IDs. **✅ works → I flip 🩷→🟢** · ⚠️ placeholder → note it · **🔴 broken → I fix same-day** (drops to 🔴 on the board until fixed).
> **Legend:** ⬜ not yet walked · ✅ confirmed working · ⚠️ partial/placeholder · 🔴 broken. *(Source dot: 🟢 = already verified pre-launch · 🩷 = live, needs this walk.)*
> **Sites:** LIVE = `app.get-kind.com` (portal) · `admin.get-kind.com` (admin) · `www.get-kind.com` (site).

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
- ⬜ **178** Voice widget — Vida bubble ("coming soon" until Vapi key) 🩷
- ⬜ **140** Leads waterfall (backend) — confirm Hunter/PDL keys in Railway → see PDL/Hunter leads on an ICP run 🩷

---

## 🤖 The 5 agents (client portal)
- ⬜ **1 FIGSY** (AI SDR) — finds leads, unique email/lead, 3-step follow-up *(→ 6-step planned, item 212)*, books meetings 🟢
- ⬜ **2 Milla** (Brain/VA) — drafting, Q&A, weekly brief 🟢
- ⬜ **3 Vida** (Connector) — website + WhatsApp chatbot, captures/routes 🟢
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
- ⬜ 45 MCP server 🟢 · ⬜ 46 Developer API 🟢 · ⬜ 47 webhooks (Stripe/Flutterwave/Resend/Vapi) 🟢
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
