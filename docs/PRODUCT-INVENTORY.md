# 📋 K.I.N.D — COMPLETE PRODUCT INVENTORY
*Everything. Live now → coming after (in order) → every steal. Logged 11 Jun 2026.*
*Companion to `KIND-MASTER.md` (launch) + `V2-TRACKER.md` (roadmap detail). This = the single "everything" list.*
**Legend:** ✅ live & working · 🟡 live but preview/"coming soon" · 🎨 designed/mockup, NOT built · ⬜ planned · 🧍 founder · 🤖 Claude

---

# ░ PART A — LIVE NOW (shipped & working on `main`) ░

## A1–A4 · THE AGENTS
1. **FIGSY — The Opener (AI SDR)** ✅ — finds leads, writes a unique email per lead, sends, follows up 3 steps (Day 0/4/9), books meetings. Autonomous.
2. **Milla — The Brain (AI VA)** ✅ — document drafting, business Q&A, weekly morning-brief intelligence. _(Knowledge/Train-FIGSY upload = 🟡 honest "coming soon" — backend post-launch.)_
3. **Vida — The Connector (Chatbot)** ✅ — website + WhatsApp chatbot, trained on the business, captures + routes leads.
4. **Denise — The Closer (AI AE)** ✅ — warm follow-up drafts + proposal-from-call drafts. Subscription-gated.

## A5–A14 · LEAD GEN & DATA ENGINE
5. **Conversational ICP Builder** ✅ — describe your customer in chat → AI suggests the ICP.
6. **Apollo lead sourcing** ✅ — 3-pass search across 250M+ contacts, preview-count before running.
7. **PDL 2nd discovery source** 🟡 — wired, **dormant** until a `PDL_API_KEY` is set (PR #502).
8. **AI lead scoring** ✅ — every lead scored 0–100 for ICP fit (Claude).
9. **Lead delivery (drip)** ✅ — daily drip + charge-on-delivery (only pay for delivered leads).
10. **POPIA consent + opt-out blocklist** ✅ — consent-aware sourcing, suppression at all 6 send paths.
11. **Lead enrichment** ✅ — single + waterfall enrich (PDL/Hunter/Clearbit, key-gated).
12. **LinkedIn CSV import** ✅ — upload + score your network.
13. **Lookalike leads** ✅ — find more like your best.
14. **Lead cross-links + stats** ✅ — campaign↔leads, lead→campaign, ICP→leads, real per-status totals.

## A15–A22 · OUTREACH ENGINE (FIGSY)
15. **Campaigns** ✅ — create, activate, pause, resume, clone, delete.
16. **Auto-Pilot / Co-Pilot modes** ✅ — fully autonomous OR approval-gated.
17. **3-step AI sequences** ✅ — personalised, zero templates, threaded follow-ups.
18. **Reply classification** ✅ — hot / warm / cold / opt-out (auto-pauses on hot).
19. **Inbox / replies view + Unibox** ✅ — all replies, classified.
20. **Mark-as-booked + KPI unify** ✅ — meetings tracked from real bookings.
21. **Deliverability suite (D1–D5)** ✅ — List-Unsubscribe one-click, plain-text alt, anti-phishing pixel guard, dedicated cold-FROM (`gettingkind.com`), warmup auto-ramp (10→50/day), auto-pause low performers (now age+volume-guarded).
22. **Suggest Campaigns + Templates** ✅ · **FIGSY Chat** ✅ · **Kanban pipeline view** ✅.

## A23–A28 · PAYMENTS & BILLING
23. **Stripe (global)** ✅ — checkout, webhooks (idempotent), 8 price IDs live.
24. **Flutterwave (Africa)** ✅ — ZAR/NGN/KES/GHS card + transfer.
25. **Credit bundles** ✅ — Lead Gen ($1/lead) + FIGSY Advanced ($3/lead), 20/40/100.
26. **Agent subscriptions** ✅ — Vida $29 · Milla $49 · Denise $99 · Milla+Vida $69/mo.
27. **Credit system + ledger** ✅ — balance, transactions, atomic deduction (can't desync).
28. **Usage tracking** ✅ — per-client usage + billing visibility.

## A29–A40 · COMMAND CENTRE (Admin OS) — internal
29. **Admin OS** ✅ — dark slim sidebar + header, key-protected (constant-time).
30. **Clients** ✅ — list + per-client detail/management.
31. **Revenue + Cohorts + Analytics** ✅ — MRR, retention, funnels.
32. **Showcase Demo** ✅ — impressive seeded demo env (600 leads / ~$1.8M pipeline) for sales.
33. **Compliance + Data-Moat + Scalability** ✅ — internal dashboards.
34. **CMO** ✅ — K.I.N.D's own lead-gen (dogfood).
35. **Founder dashboard + Health + Status** ✅.
36. **Launch checklist** ✅ — the deploy runbook (Zoho/Stripe/Flutterwave corrected).
37. **Partners management** ✅ — approve, sandbox, commissions.
38. **Unibox + Visitors + Messages** ✅.
39. **Proposals + Order-forms + Terms-library** ✅.
40. **Smoke-test + Seed + Docs viewer** ✅.

## A41–A52 · PLATFORM / INFRA
41. **Supabase auth** ✅ — signup, login, onboarding gate, magic links, RLS.
42. **Partner Programme** ✅ — apply→approve→auto-sandbox→partner portal→20% commission (Demmy live).
43. **CRM integration** ✅ — HubSpot/Pipedrive dedup + deal push.
44. **Google Calendar booking** ✅ — connect + book + KPI.
45. **MCP server** ✅ — use K.I.N.D agents from Claude.ai/Cursor (figsy_find_leads, figsy_get_campaign_stats, figsy_suggest_campaign, milla_ask).
46. **Developer API** ✅ — key management + MCP setup guide.
47. **Webhooks** ✅ — Stripe, Flutterwave, Resend (inbound replies), Vapi — all signature-verified.
48. **Outcome-event data floor** ✅ — append-only log of every send/reply/meeting (the training fuel).
49. **Rate limiting** ✅ — signup/demo-request/subscribe/unsubscribe.
50. **Push notifications** ✅ — hot-reply alerts (web push).
51. **Failover** ✅ — Render standby + Cloudflare LB designed (parity check owed).
52. **Voice (Vapi) + WhatsApp** 🟡 — wired, key-gated.

## A53 · MARKETING SITE — live
53. **40+ pages** ✅ — homepage · pricing · per-agent pages (FIGSY/Milla/Vida/Denise) · vs-Apollo/Outreach/Salesloft/SDR/manual · blog (7 articles) · playbook · demo + 4 video pages · use-cases · for-estate-agents/financial-advisers/insurance-brokers · about · story · values · trust · partners · support · terms/privacy/dpa · pipeline-calculator.

---

# ░ AUDIT — 11 Jun evening · EVERYTHING BUILT, INDEPENDENTLY VERIFIED ✅ ░
*🤖 re-verified every branch against GitHub (not from memory): each release branch is exactly **1 commit**, touches **only its claimed files**, and **contains its key code** (35/35 marker checks passed). Every branch type-checked (`tsc`) and/or `next build` verified at build time. **Nothing merged · nothing live · founder reviews each PR.***

| ✔ | What | Where | Verified how |
|---|---|---|---|
| ✅ | **Wave 1 — R1–R6** (6 releases) | PRs **#506–#511** | diff markers + scope + build |
| ✅ | **Wave 2 — R7–R20** (14 releases) | PRs **#512–#525** | diff markers + scope + build |
| ✅ | **#88 sales/video preview** — Winning-Plays tab + autonomy badges added to `/v2/company` | branch `claude/company-preview` (**no PR yet** — founder said stop) | diff marker + build |
| ✅ | **#88 COMPANY ENGINE (real, flag-gated)** — migration (seat autonomy/budget · `seat_credit_requests` · `winning_plays`) + `/company` API (overview · seat PATCH · request/approve credits · plays CRUD/push) + real Command-Centre page `/dashboard/company` | branch `claude/company-engine` (**no PR yet**) | diff markers + tsc + build |
| ✅ | **portalv2preview.html — all 10 concepts** exist as gated `/v2` previews: agents grid (§1) · thinking (§2) · conversational setup (§3) · config (§4) · marketplace (§5) · slim shell (§6) · invite (§7) · notetaker (§8) · Teams Hub/company (§9) · sequence builder (§12) · integrations hub (§13) · smart inbox (§14) · train (§16) · SSO signup | `apps/portal/src/app/(v2)/v2/*` + `/v2/gallery` index | route-by-route check |

**Honest gaps (not done, by design or dependency):** #88 items **38** (per-rep lead ownership/routing + CRM dedup — the deep data re-architecture) and **41** (multi-provider calendars) — the Command Centre's per-rep outreach stats stay seat-level until 38 lands. The `/v2` previews for sequence-builder/smart-inbox/integrations/notetaker are **clickable designs, not wired backends** (Wave 5 — founder-design gated). SSO buttons need Google/Microsoft OAuth app registration (🧍). **"Verified" = code + build verified — NOT click-tested in a running app and mostly untested by automated tests.**

> **🌿 11 Jun LATE — everything above is now PREVIEWABLE ON STAGING.** All 29 branches merged into `staging` (conflicts hand-resolved, build green) + deployed: **`heartfelt-essence-production-1434.up.railway.app`** (account `test@get-kind.com`). Pages reachable by direct URL (flags only hide sidebar links). ⚠️ Staging shares prod DB → company-engine tables not migrated → its data calls return empty until the 12-Jun staging-DB-isolation step (separate Supabase project + 50-rep fake seed). Detail: `KIND-MASTER.md` resume block.

# ░ PART B0 — 🚂 THE RELEASE TRAIN (the map of ALL releases · logged 11 Jun) ░
*Every future release from the master + tracker + this inventory, mapped into merge-ready bundles. **Model: 🤖 pre-builds each release on its own branch → its own PR → 🧍 founder merges ("push go") whenever ready → that release ships → it gets added to The Drop (weekly).** Nothing deploys until the founder's merge. Waves = build order; gates = why something can't be pre-built yet.*

## 🟢 IN FLIGHT — already built, waiting on founder
| PR | Contents | State |
|---|---|---|
| **#502** | The 10-Jun audit batch (Y1–Y11 · R4/R5 · data-integrity · PDL dormant · docs) | merge at Thu-18 Go/No-Go ⚠️ based on older main — rebase before merge |
| **#503** | The Drop + Product Videos pages (+ video slot per drop) | preview → merge post-launch |
| **#505** | Warmup auto-pause hotfix | ✅ MERGED 11 Jun (live) |
| *(branch)* | #88 sales/video preview — `claude/company-preview` | pushed · **no PR** — founder review first |
| *(branch)* | #88 company engine (flag-gated) — `claude/company-engine` | pushed · **no PR** — founder review first |

## 🌊 WAVE 1 — ✅ ALL BUILT — 6 PRs open & build-verified, waiting for your merge (11 Jun)
| R# | Release | Source / roadmap # | Status |
|---|---|---|---|
| **R1** | Demo-bounce guard — `isRealRecipient()` + `is_demo` exclusion on the Milla brief/signal crons | warmup hygiene | ✅ **PR #506** |
| **R2** | Daily client briefing — made the opt-in real (server-backed `daily_brief_enabled`, cron honours it) | #27 · Week 1 | ✅ **PR #507** |
| **R3** | Vida in-portal help bubble — floating product-help assistant (`POST /vida/help`, claude-haiku) | V2-11 | ✅ **PR #508** |
| **R4** | Speed-to-lead — Vida hot lead → real pipeline lead + instant Denise draft in the alert | #80 · Atlas steal | ✅ **PR #509** |
| **R5** | Milestone share-to-LinkedIn cards + Certified-Partner badge (free growth loops) | #81/#82 · Monday steal | ✅ **PR #510** |
| **R6** | Onboarding activation sequence — day-0/3/7 emails for PAID clients (gap: nurture skips them) | #32 | ✅ **PR #511** |

> Each PR is its own branch off `main`, type-checked + build-verified, **nothing deploys until you merge.** Merge in any order — they don't depend on each other. Merge → it ships → it gets added to The Drop.

## 🌊 WAVE 2 — ✅ ALL BUILT — 14 PRs open & build-verified, waiting for your merge (11 Jun)
| R# | Release (as shipped) | Source | Status |
|---|---|---|---|
| **R7** | Unibox "Help me reply" — real Claude draft off the prospect's actual message | Alta | ✅ **PR #512** |
| **R8** | Saved views for the leads table (full filter combo, named, 1-click) | Alta | ✅ **PR #513** |
| **R9** | "Why FIGSY wrote this" — personalization signals shown under each draft | Apollo | ✅ **PR #514** |
| **R10** | Goals — KPI targets + live progress bars (V2-12) | ClickUp | ✅ **PR #515** |
| **R11** | Sequence-template library by use-case (copy → campaign) | Lemlist/Alta | ✅ **PR #516** |
| **R12** | Embeddable lead-capture forms → scored pipeline leads (honeypot + rate limit) | #83 · ClickUp | ✅ **PR #517** |
| **R13** | Cmd+K upgrade — quick actions + more destinations | ClickUp / 15 Pieces | ✅ **PR #518** |
| **R14** | Meeting-Prep — Denise briefs the human for a booked call | Glean → #54 | ✅ **PR #519** |
| **R15** | Train-FIGSY knowledge backend — lights up the page (additive migration) | Learning Engine ① | ✅ **PR #520** |
| **R16** | Internal evals harness — per-step + per-variant reply rates, class distribution | Learning Engine ③ | ✅ **PR #521** |
| **R17** | Spam-score pre-send check under every draft | #43/#44 · Instantly | ✅ **PR #522** |
| **R18** | Multi-model toggle (Fast/Smart) per campaign — exposes existing backend | #52 | ✅ **PR #523** |
| **R19** | In-product "What's New" feed (anti-churn) | Glean | ✅ **PR #524** |
| **R20** | Job-change alerts on leads (migration + signal + badge) | Apollo | ✅ **PR #525** |

> **Reps column (R8)** and **conditional branching / configurable triggers (R18)** deferred: Reps belongs to the gated #88 engine; branching already ships via `applyReplyBranching` + per-step `on_reply`. The **deliverability *dashboard*** (R17) is a heavier surface; the pre-send scorer shipped, the warmup/bounce dashboard is a later slice.

**Waves 1–2 are now fully pre-built: 20 merge-ready PRs (#506–#525).** That's the entire ungated backlog. Waves 3–8 below cannot be honestly pre-built — they're gated on live data, external keys, founder design input, or real content (see each wave's gate).

## 🔒 WAVE 3 — GATED ON DATA (needs live campaigns/clients to learn from — building early = waste)
A/B→contextual bandit (#38) · ICP auto-refinement (#40) · Memory v2 tuning (#46) · adaptive-volume tuning (#45) · outcome feedback loop · cross-segment recall · network benchmarks ("top 15%") · outcome pricing (#60) · self-learning ICP · churn scoring (#77) · revenue forecasting (#78) · DPO/RLHF fine-tuning (last).

## 🔑 WAVE 4 — GATED ON KEYS / EXTERNAL APPROVALS (🧍 unblocks)
WhatsApp outreach (Meta approval #22) · Vapi voice (#48) · PDL/Hunter activation (keys — code already wired) · inbox rotation/multi-domain #53 (needs extra warmed domains) · Flutterwave activation (#34) · Apollo reseller agreement (`partners@apollo.io`).

## 🎨 WAVE 5 — GATED ON FOUNDER DESIGN INPUT / EVIDENCE (big builds — approve direction before weeks of UI)
**#88 Company/Per-Rep Engine** (2a setup · 2b autonomy · 2c Command Centre · 2d payments/budget · routing · ★ winning-play library · V2-7 invite · V2-13 calendars) — **held until the first client's 10 seats teach us real usage** (demo screens can be cut earlier as sales assets) · **Casey conversational setup** (V2-3/10 — highest-value V2 build, wants founder's voice in the design) · **Sequence Builder** (#89 🎨) · **Multi-channel Smart Inbox** (🎨 — "inbox isn't right") · **Integrations Hub** (#84 🎨 — also needs OAuth app registrations) · Milla Notetaker (V2-8 🎨).

## 📹 WAVE 6 — GATED ON REAL CONTENT/DATA (the honesty rule — no invented numbers)
Homepage hero = real product loop (#24) · proof block real data (#33) · homepage outcome numbers (#62c) · founder videos (#23/#29/#31/#35) · 9:16 social cuts (#30).

## 🤖 WAVE 7 — MONTH 3+ (agent family · gated on margin data + real client patterns)
Denise deep build (#54) · **Lena** CS agent (#55) · **Tony** Ops agent (#56) · multi-agent orchestration (#57) · 500+ skill library (#58) · mobile app (#61/PWA) · built-in CRM Kanban (#62) · proposal e-sign (#69) · Zoom notetaker (#70) · visual automation builder (React Flow) · white-label/agency.

## 🏛️ WAVE 8 — YEAR 2 (enterprise + moat)
Cross-client intelligence/L4 (#64) · data-licensing marketplace (#65) · L3 ICP (#66) · pipeline forecasting (#67) · in-portal messaging (#68) · ISO 27001/42001 · SOC 2 · Vanta (#71–74) · 3-type memory (#75) · visitor de-anon (#76) · call intelligence (#79) · Revenue Mission Control.

**≈20 merge-ready releases (Waves 1–2) before any gate is hit — months of weekly "push go" drops. The Drop page is the icing: each merged release gets added there weekly.**

---

# ░ PART B0b — 🔜 NEXT STAGING QUEUE (ungated · buildable now · no external deps) ░
*Everything here can go on a branch → staging → founder preview with no keys, no data, no design calls needed. Sorted by effort. Status: ⬜ not started · 🔨 built on staging · ✅ live on main.*
*Cross-ref: items 🟢 in the B list below are already on staging from the 11-Jun sprint. These are what's left.*

## 🟢 Quick wins — ½ day or less each
| # | What | Why it matters | Effort |
|---|------|---------------|--------|
| Q1 | **Status bar** (sidebar bottom — live pulse: FIGSY active · warmup count · credits left) | Inventory says "build first, near-zero effort." Makes platform feel alive instantly. Data already exists. | ~4 hrs · ⬜ |
| Q2 | **Profile dropdown — full build** (Usage · Billing · Team · Settings · Developer API · Sign out) | Currently partial. All target pages exist — just navigation wiring. | ~2 hrs · ⬜ |
| Q3 | **Mobile PWA** (manifest.json + service worker on portal) | Makes portal installable on mobile. Zero new features, big perception win for Africa's mobile-first market. | ~4 hrs · ⬜ |
| Q4 | **Subscribe-to-the-drop** (#122) | Email capture form on website → Resend list. Ties The Drop content engine together. | ~3 hrs · ⬜ |
| Q5 | **Site nav/footer rewire** (#123) | Update ~40 landing pages: Demo→Watch, add The Drop to nav + footer. Was held post-launch deliberately. | ~4 hrs · ⬜ |

## 🟡 Medium builds — 1–2 days each
| # | What | Why it matters | Effort |
|---|------|---------------|--------|
| M1 | **Deliverability dashboard** (#48) | Warmup cap, daily sent, bounce rate, spam complaints — all data exists, just needs a UI. Critical for ongoing health post-launch. | ~1 day · ⬜ |
| M2 | **Kanban pipeline view** (#100) | Alternative view on leads — drag cards between New → Contacted → Hot → Meeting → Closed. Data exists; view layer only. | ~1 day · ⬜ |
| M3 | **Real-time activity feed** (#102) | Supabase realtime LISTEN/NOTIFY → sidebar panel: "FIGSY sent to Kamau · 2 min ago", "Hot reply from Zainab". Makes platform feel live. | ~1.5 days · ⬜ |
| M4 | **A/B subject testing UI** (#43) | Two subject variants per sequence step, 50/50 split, winner surfaced. Evals harness (R16) already collects the data — this adds the UI. | ~1.5 days · ⬜ |
| M5 | **Configurable agent triggers** (#53) | Settings panel: time-of-day send window, pause on weekends, reply delay. Some already in backend — needs a settings surface. | ~1 day · ⬜ |
| M6 | **Notification centre** (#103) | Bell icon top-right + slide-out panel. Hook into existing hot-reply and meeting-booked events in the DB. | ~1 day · ⬜ |

## 🔴 Bigger builds — possible, but confirm direction first
| # | What | Condition |
|---|------|-----------|
| B1 | **Revenue Mission Control** (#115) — 3-col live ops: FIGSY pipeline · active conversations · intelligence | Most impressive thing on staging. ~3–4 days. Confirm layout before starting. |
| B2 | **FIGSY Memory v2 / pgvector** (#51) — FIGSY remembers what worked on past leads | 🧍 enable pgvector in Supabase dashboard (2 min), then Claude builds the memory layer. The moat item. |
| B3 | **Casey — conversational onboarding** (V2-3/10) — chat-based setup instead of a form | Highest-value V2 build. Needs founder's voice/tone input first — it's what every new client sees. |

## ❌ Cannot build yet — gated (honest)
| Gate | What's blocked |
|------|---------------|
| 🔒 Wave 3 — needs live data | A/B bandit · ICP auto-refine · adaptive send volume · network benchmarks ("top 15%") · contextual bandits · churn scoring |
| 🔑 Wave 4 — needs keys/approvals | WhatsApp (Meta approval) · Vapi voice (key) · PDL/Hunter (keys, code already wired) · inbox rotation (warmed domains) · Flutterwave (🧍 activate) |
| 🎨 Wave 5 — needs founder design input | Casey (founder voice) · Company 2a setup + 2b per-rep routing (wait for first real 10-seat client) · per-rep calendars |
| 📹 Wave 6 — needs real content | Homepage hero (you record V1) · proof block (real numbers) · outcome stats (real data) |
| 🤖 Wave 7–8 — gated on margin/scale | Denise deep build · Lena/Tony agents · visual automation builder · ISO/SOC2 · enterprise features |

---

# ░ PART B — COMING, IN ORDER ░

## B-LAUNCH · by Fri 19 Jun
1. T1 fresh-signup smoke test ✅ (passed 11 Jun) · 2. Smoke Test 2 (T3–T7,T9,T10) ⬜ · 3. **D9 deliverability 10/10** ⬜🧍 · 4. 2 key rotations ✅ · 5. Legal pack #10–14 (ICO·SR01·reg office·WHOIS·LinkedIn) ⬜🧍 · 6. Go/No-Go Thu 18 · 7. **🚀 LAUNCH Africa-only (#18)** · 8. Merge the audit-fix batch (PR #502).

## B-WEEK 1 · Jun 19–28
9. 10 warm outreach (#19) · 10. LinkedIn 1/day (#20) · 11. LinkedIn outreach via PhantomBuster (#21) · 12. Meta/WhatsApp API apply (#22) · 13. Record real product demo 16:9+9:16 (#23) · 14. Homepage hero = real product loop (#24) · 15. GTM funnel instrumentation (#25) · 16. Dogfood self-outreach (#26) · 17. Daily client briefing email (#27) · 18. Fresh-signup check (#28).

## B-WEEKS 2–4 · Jun 29 – Jul 19
19. 2 design-partner slots → case study+logo (#29) · 20. 9:16 social cuts (#30) · 21. **3 onboarding Looms (#31)** · 22. Onboarding v2 + day-0/3/7 emails (#32) · 23. Real proof-block data (#33) · 24. Flutterwave activate (#34) · 25. **YouTube channel (#35)** · 26. Playbook email form (#36) · 27. 90-day performance guarantee (#61a/g) · 28. Influencer/community distribution (#61e) · 29. Revenue Playbook onboarding call (#62b) · 30. Homepage outcome numbers (#62c) · 31. **Speed-to-lead: Vida→FIGSY/Denise instant handoff (#80)** · 32. Milestone share-to-LinkedIn cards (#81) · 33. Certified-Partner badge (#82).

## B-MONTH 2 · Late Jul–Aug (gated 10+ clients) — Intelligence + V2 + Company Engine
**🏢 #88 COMPANY / PER-REP ENGINE** (the ARPU multiplier — 1 owner → N seats):
34. Company setup (2a) · 35. Per-rep autonomy (2b) · 36. **Owner Command Centre / Teams Hub (2c, V2-9)** · 37. Usage & budget — request/approve credits per seat (2d) · 38. Per-rep lead ownership/routing + CRM dedup · 39. **★ Shared winning-play library** (owner perfects → every seat inherits) · 40. Invite teammate (V2-7) · 41. Multi-provider calendars (V2-13).

**Intelligence layer:**
42. Intent signal detection (#37) · 43. A/B subject testing→bandit (#38) · 44. Client morning-brief (#39) · 45. ICP auto-refinement / L2 learning (#40) · 46. Conditional sequence branching (#41) · 47. Waterfall enrichment live (#42) · 48. Deliverability dashboard (#43) · 49. Spam-score pre-send (#44) · 50. Adaptive send volume (#45) · 51. **FIGSY Memory v2 / pgvector — the moat (#46)** · 52. Milla full-context CRM pull (#47) · 53. Configurable agent triggers (#51) · 54. Multi-model toggle (#52) · 55. Inbox rotation / multi-domain (#53) · 56. **Context-backed MCP server (#59)** · 57. Product Hunt (#49) · 58. G2 listing (#50).

**V2 Experience layer:**
59. **Casey — conversational AI setup (V2-3/V2-10)** ⬜ *highest-value V2 build* · 60. **Milla AI Notetaker → action items (V2-8)** 🎨 · 61. **Vida help bubble (V2-11)** ⬜ · 62. Strong dashboards + Goals (V2-12) 🟡 · 63. Lead-capture Forms (#83) ⬜ · 64. **Integrations Hub (#84)** 🎨 · 65. **Sequence Builder — visual branching (#89)** 🎨 · 66. **Multi-channel Smart Inbox** 🎨 *(fixes "inbox isn't right")*.

## B-MONTH 3 · Aug–Sep (gated margin) — the agent family expands
67. **DENISE deep build** — auto-book · call notetaker · objections · proposal-from-transcript · Vapi voice (#54) · 68. **LENA — Customer Success** agent (retention/renewals/upsell) (#55) · 69. **TONY — Operations** agent (pipeline hygiene/back-office) (#56) · 70. Multi-agent orchestration / shared memory (#57) · 71. 500+ FIGSY skill library (#58) · 72. Outcome pricing per meeting (#60) · 73. Mobile app iOS+Android (#61) · 74. Built-in CRM Kanban (#62) · 75. Pan-African design partners (#63) · 76. Proposal + e-sign (#69) · 77. Meeting notetaker / Zoom transcribe (#70).

## B-YEAR 2 · 2027 — Enterprise + moat
78. Cross-client intelligence / L4 benchmarks (#64) · 79. Data-licensing marketplace (#65) · 80. ICP auto-refine L3 (#66) · 81. Pipeline forecasting (#67) · 82. In-portal messaging (#68) · 83. ISO 27001 (#71) · 84. ISO 42001 (#72) · 85. SOC 2 (#73) · 86. Vanta (#74) · 87. 3-type memory model (#75) · 88. Visitor de-anon (#76) · 89. Churn scoring (#77) · 90. Revenue forecasting (#78) · 91. Call intelligence (#79).

## B-THE LEARNING ENGINE (intelligence/moat — turns outcome data into compounding wins)
92. Context/RAG (Train-FIGSY knowledge) · 93. Outcome feedback loop · 94. Evals/measurement · 95. Memory recall (#46) · 96. Model routing · 97. Contextual bandits (Thompson) · 98. Cross-segment recall (the network moat) · 99. (later) DPO/RLHF fine-tuning.

## B-THE 15 PIECES (UX/platform, post-20-clients)
100. Kanban/heatmap/timeline views · 101. **Command palette (Cmd+K)** · 102. Real-time activity feed · 103. Notification centre · 104. Status bar (live pulse) · 105. Custom lead fields · 106. **Visual automation builder (React Flow)** · 107. Self-learning ICP · 108. Personalised email images · 109. ICP sequence-template library · 110. Voice-first morning brief · 111. Network benchmarks ("top 15%") · 112. White-label/agency channel · 113. MCP dev tier · 114. Mobile PWA · 115. **Revenue Mission Control (3-col live ops centre)**.

## B-GTM CONTENT ENGINE (the marketing motion — outreach alone won't cut it)
116. **The Drop** page (built, video-per-drop) · 117. **Product Videos / "Watch"** page (built) · 118. Founder YouTube walkthroughs (🧍) · 119. Founder LinkedIn build-in-public (🧍) · 120. Monthly drop cadence (video+post+email) · 121. In-product "What's New" feed (anti-churn) · 122. Subscribe-to-the-drop wiring · 123. Site nav/footer rewire (Demo→Watch, add The Drop).

---

# ░ PART C — THE STEALS CATALOG (who we learn from → what we take) ░
C1. **Alta** — Touch-Points tree · template gallery · per-agent "Train" tabs · Performance + Prospect-Status funnel · Unibox reply-tags + "Help me reply" · saved-views + Reps column + "Suggest Campaigns."
C2. **ClickUp** — command palette · multi-views · activity feed · status bar · 500+ skill library · Goals · Forms · Integrations Hub.
C3. **Lemlist** — personalised images · visual sequence builder · ICP template library · **community play** ("B2B outreach in Africa" content).
C4. **Monday** — share-to-LinkedIn growth loop · dense dashboards · Pixar-3D agent warmth.
C5. **Atlas** — speed-to-lead 5-min handoff · 90-day guarantee · influencer distribution.
C6. **Instantly** — domain warming · auto-pause low performers · adaptive send volume · inbox rotation.
C7. **Clay** — waterfall enrichment · ICP-as-filter-layers.
C8. **Apollo** — job-change alerts · sequence analytics · AI transparency ("why FIGSY wrote this") · intent signals.
C9. **Apex** — "acts, doesn't just respond" · approval→autonomy onboarding · digital-twin (Milla = AI Chief of Staff) · founder-as-demo on LinkedIn.
C10. **Glean** — context/memory moat · cross-client benchmarks · agent-per-workflow-step (dogfooded) · research-driven personalization · Call-Coaching agent · CRM-from-transcript · **AI-assisted agent setup (→Casey)** · Workflow-vs-Auto principle · permission-safety · context-backed MCP (2.5×) · the ★ shared winning-play library. *Validated (don't rebuild): Thinking panel · gated approval queue · agent chips.*
C11. **Revio** — bundled coaching onboarding · case-study specificity.
C12. **Amplemarket / MailerLite / Salesforce / Notion-Linear** — intent signals · spam-score pre-send · AgentExchange marketplace + outcome pricing · MCP-native + slim sidebar.

---
*This inventory is the single complete list. Live = `main`. Order = the build sequence. Nothing ships until founder merges.*
