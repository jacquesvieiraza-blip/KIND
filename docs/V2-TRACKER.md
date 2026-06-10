# 🎯 K.I.N.D — MASTER TRACKER (V2 + Full Roadmap)

**THE single working tracker. Every item, every horizon — so nothing lives only in chat or gets lost across docs.**
Linked from `KIND-MASTER.md` (top). Work top→bottom. _Last updated: 9 Jun 2026 (late)._

**Legend:** ✅ done/live · 🟡 partial · 🎨 mockup only (designed, NOT built) · 🔄 in progress · ⏸ gated/paused · ⬜ not started · 🔴 open issue
**Owner:** 🧍 founder · 🤖 Claude · 🤝 both

---

# ░ BUILD & LAUNCH PLAN (official — locked 10 Jun) ░
**Ship rule for every item:** build on branch → `next build` verify → founder reviews → **founder says "go live"** → merge to `main` → smoke test. **Nothing reaches the live client site until the founder says go live.**

**▶️ PHASE 0 — LAUNCH (now → Fri 19):** ship the proven live core loop (signup→ICP→leads→FIGSY→reply→meeting). No new builds — verify (ST1, ST2, deliverability) + launch Africa-only.

**🏢 PHASE 1 — COMPANY ENGINE (#88) · ~1 wk post-launch (target ~30 Jun):** the per-rep model (1 owner→N seats). 4 flows: 2a company setup · 2b per-rep autonomy · 2c owner command centre · 2d usage & budget. Foundation: workspace→member DB re-arch + per-rep ownership/routing + CRM dedup. (Also delivers Invite / Teams Hub / per-rep calendars.)

**🎨 PHASE 2 — V2 EXPERIENCE (July, on the engine), in order:** 1 Vida bubble · 2 Casey onboarding→Conversational setup · 3 Milla Notetaker · 4 Strong dashboards · 5 Integrations Hub · 6 Sequence Builder · 7 Smart Inbox (fixes "inbox isn't right") · 8 Lead-capture Forms.

**🧠 PHASE 3 — INTELLIGENCE/MOAT (Month 2+):** MCP server · Memory v2 · ICP-that-learns · benchmarks · the 15 Pieces.

**Order logic:** launch the proven loop first → company engine (biggest money + per-rep foundation) → experience layer on it → intelligence.

---

# ░ 🚨 RISK & FIX REGISTER (full-system audit · 10 Jun) ░
**From the all-systems audit (client portal · admin · website · API · docs). Red = act this week · Yellow = scheduled. Owner: 🧍 = founder must do · 🤖 = Claude fixes (branch → founder "go live").**

## 🔴 RED — this week (launch-critical)
| # | Item | Owner |
|---|------|-------|
| R1 | **Rotate the 2 crown-jewel keys** (Stripe secret · Supabase service-role) — from the 4-Jun credential-exposure incident, still "pending rotation" | 🧍 |
| R2 | **ICO registration** — ico.org.uk, £40/yr (~10 min; penalty £400–4k) | 🧍 |
| R3 | **D9 deliverability 10/10** (mail-tester before launch) | 🧍 |
| R4 | **DNC tab: "Failed to save" + hardcoded placeholder rows incl. the employer name** (ST1 find #1 — scrub + fix save) | 🤖 |
| R5 | **Website fabricated stats** — "8.2% reply · 2.7× industry", "156 emails · 12.8%", "5.2% · 4×", blog "3–4% from campaign one" presented as real → label illustrative or remove (credibility/legal; violates our own no-invented-numbers rule) | 🤖 |
| R6 | **Apollo ToS / single-source dependence** — 50-client trigger: email partnerships@apollo.io before client 51; 200+ = key-termination kills product. Mitigation = multi-source (below) | 🧍 (watch) |

## 🟡 YELLOW — scheduled (post-launch / quick wins)
| # | Item | Owner |
|---|------|-------|
| Y1 | Rate-limit public endpoints (signup · OTP/demo-login · demo-request · subscribe · unsubscribe) — only Vida widget is limited today | 🤖 |
| Y2 | FIGSY per-enrollment credit deduction non-atomic (balance vs ledger drift) → switch to checked `increment_client_credits` RPC | 🤖 |
| Y3 | Counter-write sweep — remaining unchecked supabase increments (replies/opted_out/insights/memory/autopilot crons read raw counters) | 🤖 |
| Y4 | Leads page tab pills count the 50-row page, not totals → per-status counts from `/leads/stats` | 🤖 |
| Y5 | Missing cross-links: campaign→its leads (needs `campaign_id` filter on `/leads`) · lead→campaign · ICP→its leads | 🤖 |
| Y6 | Settings prefs are localStorage-only (say "Saved", don't persist) → server-side | 🤖 |
| Y7 | Denise page ungated (every sibling agent gates on subscription) | 🤖 |
| Y8 | developer vs mcp pages: two conflicting MCP tool catalogs | 🤖 |
| Y9 | `roadmap` page hardcodes ~80 features as "Live" → honest statuses or gate it | 🤖 (🧍 decides what's truly live) |
| Y10 | Milla integrations panel = dead "Connect" buttons (looks fake) → hide until built | 🤖 |
| Y11 | "Meetings Booked" card shows "No data yet" subtitle even with data | 🤖 |
| Y12 | Failover standby drift — Render standby env parity unverified + `NEXT_PUBLIC_ADMIN_KEY` delete-vs-keep doc contradiction | 🧍🤖 |
| Y13 | D&O insurance (~£500–1k) · trademarks (UK IPO → ARIPO) — Month-2 legal ring | 🧍 |
| Y14 | Demo seeds write to prod DB (fine pre-launch) → separate staging/demo DB in Batch 2 | 🤖 |

## 🌐 DATA-SOURCE STRATEGY (logged 10 Jun — the Apollo-risk mitigation)
**Finding:** Alta has **no public Apollo agreement** — their sub-processors (AWS/Twilio/Postmark/Slack) list no data vendor; they blend **50+ smaller/signal sources** (BuiltWith, SimilarWeb, StoreLeads, Crunchbase). Their answer to single-provider risk = diversification.
**Our path (in order):**
1. **Light up the already-built waterfall (#42)** — add **PDL** key (built-for-resale, solves the ToS problem) + **Hunter** key (~$49/mo): days of work, makes us 2–3-source. → post-launch quick win 🤖+🧍(keys)
2. **Second discovery source** beside Apollo behind `searchPeopleWithFallback` (Apollo-first → PDL Search; later Cognism w/ explicit reseller programme, ~$15–25k/yr, post-revenue).
3. **Signal sources** (website scans · LinkedIn CSV import · Crunchbase-style signals) — widen coverage with zero ToS exposure.
4. **Manus** — African-SMB deep-research fallback (the potential moat; async, needs dedup+verification). Post-launch.
**Posture goal: "Apollo-first, multi-source" BEFORE the 50-client trigger.**

---

# ░ PART 1 — ACTIVE NOW (cosmetic / V2 build via staging) ░

## A. Cosmetic issues you raised (this session)
| # | Issue | Status |
|---|-------|--------|
| 1 | Profile dot → initials + hover | ✅ done |
| 2 | Sidebar agent lump → switcher (photos+dropdown) | ✅ done |
| 3 | Dashboard not collating real sent emails | ✅ fixed |
| 4 | ICP above People (nav flow) | ✅ fixed (ICP Builder→People) |
| 5 | "This card is not right" (FIGSY agent image crop) | 🔴 open — review all agent-image cards |
| 6 | "Inbox isn't right" | 🎨 = multi-channel Smart Inbox (Part 2, M2) |
| 7 | Company payment system missing | 🎨 mockup only — see C |
| 8 | Vida help bubble (bottom-right) | ⬜ V2-11 |

## A2. Design-match gaps — shipped but NOT matching your design (honest)
| Item | Built | Design wants | Status |
|------|-------|-------------|--------|
| Profile dropdown | initials · My profile/Settings/Sign out | **Usage · Billing · Team · Settings · Developer API · Sign out** | 🟡 partial |
| Top-right header | Credits · Bell · Profile | + **Invite teammate** btn · **Roadmap** icon | 🟡 partial |
| Config Panel | read-only + links | **editable form** + **Save** (Role/Objective/Problem/Tone/Schedule) | 🟡 partial |
| Agent cards | small cropped avatar | full clean portrait (canonical panel) | 🔴 #5 |

## B. Cosmetic QA — every screen × every state (empty · loading · populated · error)
Welcome/Onboard · Signup · Dashboard Home · Sidebar · Leads/People · ICP Builder · Config · Marketplace · Thinking · Inbox · Campaigns/FIGSY · each agent page · agent side-panels/conversations. → full pass pending; matrix tracked.

## C. 🏢 THE COMPANY / PER-REP SYSTEM (#88) — DESIGNED, **NOT BUILT** · target ~26–30 Jun
Source `CLIENT_FLOW.html` Part 2 + `CLIENT_FLOW_PER_REP.html`. Mockups only (`/dashboard/v2/page.tsx`, sample data). Needs workspace→member DB re-arch.

### 🔒 THE MODEL (LOCKED — this is how companies build out their teams on K.I.N.D)
**We do NOT replace a sales org — we AUGMENT it. We give every rep their own AI.** An owner buys a FIGSY *per rep*; each rep runs **autonomously** (own leads, own voice, own calendar); the owner controls the budget **centrally**. *Augment first; efficiency follows.* Positioning line: **"We don't replace your sales team — we give every rep their own AI, and you control the budget. You pay for the seats you use and the work they do."**
**Pricing = HYBRID (seat per rep + usage they consume)** — the durable model (pure flat per-seat is declining 21%→15%; "replace" not viable until ~2027+).

### The four flows (each = a build slice)
| Flow | What it is | Status |
|------|-----------|--------|
| **2a · Company setup** | Owner signs up → buys N FIGSY seats (**ONE company payment**) → invites N reps to the company workspace → each rep connects **their own** calendar → each seat = one autonomous FIGSY | 🎨 |
| **2b · Per-rep autonomy** | Each rep's FIGSY finds **their** ICP/leads · opens in the **rep's voice** (signed as the rep) · reply → meeting booked onto **the REP's own calendar** · Denise closes → **the rep's own pipeline**. Rep 1's FIGSY never touches Rep 2's leads. 10 reps = 10 independent AI SDRs in parallel. | 🎨 |
| **2c · Owner command centre** | Autonomy below, oversight on top: company totals · leaderboard · every rep's leads+bookings · spend per seat. Milla layers "who's hot / what's working / where to coach". | 🎨 |
| **2d · Usage & budget** | Company owns the budget pool (one payment · tops up) → owner allocates credits per seat → rep works → runs low → **rep requests more → owner approves/denies**. "Exactly like an enterprise running Claude." | 🎨 |
| Per-rep lead **ownership/routing** (no two reps hit the same person) + **CRM dedup** | underpins 2b | ⬜ |

**Why it wins:** no company is firing its sales org — we make every rep more effective and the owner controls spend centrally. This *is* the expansion engine (1 owner → N seats → grows as the team grows).

## D. ✅ Shipped & live today
Agent Grid (V2-1) · Thinking (V2-2) · Config (V2-4, partial) · Marketplace (V2-5) · Slim sidebar+switcher+profile chip (V2-6, partial) · Leads C1/C3 · Welcome Spotlight · Signup T&C · Sent-count fix · ICP→People nav.

---

# ░ PART 2 — FULL ROADMAP (101 items, by horizon) ░

## 🔴 NOW · PRE-LAUNCH (by Fri 19 Jun)
| Item | What | Owner | Status |
|------|------|-------|--------|
| D1–D5 | Deliverability fixes (unsubscribe, plain-text, cold-FROM) | 🤖 | ✅ |
| Cold domain + warmup | `gettingkind.com`, SPF/DKIM/DMARC, ramp 10→50/day | 🧍 | ✅ |
| T8 | Deliverability/inbox placement | 🤝 | ✅ |
| T2 | ICP→leads · T3 core send→reply→Hot | 🤝 | ✅ |
| #6 | Migration 010 CRM-dedup | 🧍 | ✅ |
| #7 | Denise Stripe price · DNS app/api/admin live | 🧍 | ✅ |
| CAL-min | Booking-link field in Settings | 🤖 | ✅ |
| **T1** | **Fresh signup → onboarding (never run)** | 🤝 | ⬜ |
| T3 (pause) · T4 booking · T5 billing · T6 Vida · T7 Milla · T9 invite · T10 partner | Smoke Test 2 | 🤝 | ⬜ |
| **D9** | Deliverability 10/10 inbox | 🧍 | ⬜ |
| **#1** | 2 crown-jewel key rotations (Stripe-secret, Supabase-service-role) | 🧍 | 🔄 |
| **#10–#14** | Legal pack (ICO, SR01, registered office, WHOIS, LinkedIn) | 🧍 | ⬜ |
| Go/No-Go | Thu 18 gate: deliverability · ST2 · legal · warmup | 🤝 | ⬜ |
| **#18** | **LAUNCH Africa-only — Fri 19 Jun** | 🤝 | ⬜ |

## 📍 WEEK 1 (Jun 19–28) — 10 items
| # | What | Owner |
|---|------|-------|
| #19 | 10 warm outreach messages (network seed) | 🧍 |
| #20 | LinkedIn content 1/day | 🧍 |
| #21 | LinkedIn outreach activation (PhantomBuster) | 🧍 |
| #22 | Meta/WhatsApp API application (3–7d approval) | 🧍 |
| #23 | Record real product demo (16:9 + 9:16, Pixar family) | 🧍 |
| #24 | Replace homepage hero w/ real product loop | 🤖 ⏸ |
| #25 | Instrument GTM funnel (CAC, trial→paid) | 🤝 |
| #26 | Dogfood self-outreach + competitor ICP | 🧍 |
| #27 | Daily client briefing email | 🤖 |
| #28 | Pre-launch fresh-signup check | 🧍 |

## 📍 WEEKS 2–4 (Jun 29 – Jul 19) — 17 items
| # | What | Owner |
|---|------|-------|
| #29 | 2 design-partner slots (case study + logo) | 🧍 |
| #30 | Cut 9:16 social content | 🤖 |
| #31 | Record 3 onboarding Looms | 🧍 |
| #32 | Onboarding v2 + day-0/3/7 email | 🤖 |
| #33 | Populate proof block w/ real data | 🤖 |
| #34 | Activate Flutterwave (ZAR/NGN/KES/GHS) | 🧍 ⏸ |
| #35 | Launch YouTube channel | 🧍 |
| #36 | Wire playbook email form (ConvertKit) | 🤖 |
| #61a | Performance-guarantee clause (90-day) | 🤖 |
| #61e | Influencer/community distribution | 🧍 |
| #61g | Guarantee sharpened to 90d | 🤖 |
| #62b | "Revenue Playbook Session" onboarding call | 🤖 |
| #62c | Homepage outcome numbers (real data) | 🤖 ⏸ |
| #80 | **Speed-to-lead: Vida → instant FIGSY/Denise handoff** | 🤖 |
| #81 | Milestone share-to-LinkedIn cards | 🤖 |
| #82 | "Certified K.I.N.D Partner" badge + LinkedIn share | 🤖 |

## 📍 MONTH 2 (Late Jul–Aug · GATED 10+ clients) — 38 items
**Prereq: staging env. — already starting (this session).**

**Intelligence layer (#37–53, #59):**
| # | What |
|---|------|
| #37 | Intent signal detection |
| #38 | A/B subject testing |
| #39 | Client morning-brief email |
| #40 | ICP auto-refinement (L2 learning) |
| #41 | Conditional sequence branching |
| #42 | Waterfall enrichment (PDL/Hunter/Clearbit) ⏸ |
| #43 | Deliverability dashboard |
| #44 | Email spam-score pre-send |
| #45 | Adaptive send volume |
| #46 | **FIGSY Memory v2 (pgvector)** — our moat |
| #47 | Milla full-context CRM pull |
| #51 | Configurable agent triggers |
| #52 | Multi-model toggle per campaign |
| #53 | Inbox rotation / multiple sending domains |
| #59 | **MCP server** (distribution unlock) |
| #49 | Product Hunt launch · #50 G2 listing |

**V2 portal redesign (the rest, on the per-rep foundation):**
| # | What | Status |
|---|------|--------|
| V2-3 | Conversational setup (chat w/ Casey) | ⬜ |
| V2-8 | **AI Notetaker → action items (Milla)** | 🎨 mockup · Critical |
| V2-10 | **Casey** onboarding agent | ⬜ |
| V2-11 | **Vida help bubble (bottom-right)** | ⬜ Critical |
| V2-12 | Strong client dashboards + Goals | 🟡 shell |
| #83 | Embeddable lead-capture Forms | ⬜ |
| #84 | **Integrations Hub** (HubSpot/Pipedrive/Cal/WA/LinkedIn) | 🎨 mockup |
| #89 | **Sequence Builder** (visual branching tree, multi-channel) | 🎨 mockup |
| — | Multi-channel Smart Inbox (= "inbox isn't right") | 🎨 mockup |

**Pulled into the #88 per-rep sprint (~Fri 26):** V2-7 invite · V2-9 Teams Hub/Command Centre · V2-13 multi-provider calendar.

## 📍 MONTH 3 (Aug–Sep · GATED margin data) — 17 items
| # | What |
|---|------|
| #54 | **DENISE deep build** (auto-book · call-join notetaker · objections · proposal-from-transcript · Vapi voice #48) |
| #55 | **LENA — Customer Success** (retention/renewals/upsell) |
| #56 | **TONY — Operations** (pipeline hygiene, back-office) |
| #57 | Multi-agent orchestration (shared memory) |
| #58 | 500+ FIGSY skill library |
| #60 | Outcome pricing (per meeting) — gated ≥28% margin |
| #61 | Mobile app (iOS+Android) ⏸ |
| #62 | Built-in CRM (Kanban deal view) ⏸ |
| #63 | Pan-African design partners |
| #69 | Proposal + e-sign (Denise) |
| #70 | Meeting notetaker (Zoom transcribe) |

## 📍 YEAR 2 (2027 · Enterprise) — 9 items
| # | What |
|---|------|
| #64 | Platform cross-client intelligence (L4 benchmarks) |
| #65 | Data licensing marketplace |
| #66 | ICP auto-refine advanced (L3) · #67 Pipeline forecasting · #68 In-portal messaging |
| #71–#74 | ISO 27001 · ISO 42001 · SOC 2 · Vanta triple-cert |
| #75 | 3-type memory model · #76 Visitor de-anon · #77 Churn scoring · #78 Revenue forecasting · #79 Call intelligence |

## 🔒 ONGOING / PARALLEL
Legal (D&O, ODPC/NDPR, AI Risk Register, pen test, trademarks, VAT) · Funding (cloud credits→YC→revenue financing) · Tech-debt (delete Portal-V2, admin RLS refactor) · Master.md cleanup (15 contradictions) · Competitive watch (Revio).

---

# ░ PART 2C — FUTURE RELEASES (the 15 Pieces) + STEALS CATALOG + MCP ░
**Source: `docs/art-of-possible.md` (future-vision/inspiration log).** Gate: most are post-20-clients. ⚠️ that doc's old agent roster (REEVE/OTTO) is superseded → now Denise/Tony/Lena.

## The 15 Pieces (post-loop-proven build list)
| # | Piece | Effort | Trigger |
|---|-------|--------|---------|
| 1 | Multiple pipeline views — **Kanban** · score heatmap · timeline | 2–3d · 1d · 2d | post-20 clients |
| 2 | **Command palette (Cmd+K)** — "New ICP / Pause FIGSY / Hot leads" | 1–3d | any |
| 3 | Real-time activity feed (Supabase LISTEN/NOTIFY) | 3d | 10+ clients |
| 4 | Notification centre (bell + badge) | 3d | any |
| 5 | **Status bar** (sidebar bottom, live pulse) — "build first, near-zero effort" | 4h | now |
| 6 | Custom fields on leads (jsonb) | 4–5d | on request |
| 7 | **Visual automation builder** (React Flow, triggers/actions/conditions) | 2–3wk | 50+ clients |
| 8 | The ICP that learns itself (replies → "narrow your ICP?") | 2d | 3mo data |
| 9 | Personalised images in emails *(Lemlist)* | 2d | Phase 3 |
| 10 | Sequence template library by ICP *(Lemlist)* | 3d | Phase 2 |
| 11 | Voice-first morning brief (TTS) | 1d | after text brief |
| 12 | Network-effect benchmarks ("you're top 15%") | 2d | 20+ clients |
| 13 | White-label / agency channel | 1wk | first agency asks |
| 14 | **MCP server** — K.I.N.D as AI infra (search_leads/run_icp/enroll_lead/get_figsy_stats… map to existing API). Anthropic directory listing = distribution. New developer pricing tier. | 3–5d | 20+ clients |
| 15 | Mobile app (PWA first, then native) | 2d | w/ notifications |
| + | **Revenue Mission Control** (V2 vision: 3-col live ops centre — FIGSY · Pipeline · Intelligence) | — | V2 |

## 🥷 THE STEALS CATALOG (who we learn from → what we take)
| Source | What we steal |
|--------|---------------|
| **Alta** | Touch-Points tree + action library · template gallery · per-agent "Train" tabs · Performance dashboard + Prospect-Status funnel · Unibox reply-tags + "Help me reply" · saved-views + Reps column + "Suggest Campaigns" |
| **ClickUp** | Command palette · multiple views (Kanban/timeline/heatmap) · activity feed · status bar · 500+ skill library (#58) · Goals (KPI targets) · Forms (#83) · Integrations Hub (#84) |
| **Lemlist** | Personalised images · visual sequence builder (#89) · template library by ICP · **community play** (own "B2B outreach in Africa" content — start now, free) |
| **Monday** | Share-to-LinkedIn growth loop (#81/#82) · dense dashboards (V2-12) · Pixar-3D agent warmth (window closing — ship demo fast) |
| **Atlas** | Speed-to-lead 5-min handoff (#80) · 90-day performance guarantee (#61a/g) · influencer distribution (#61e) |
| **Instantly** | Domain warming · auto-pause low performers · adaptive send volume (#45) · inbox rotation (#53) |
| **Clay** | Waterfall enrichment (#42) · ICP-as-filter-layers |
| **Apollo** | Job-change alerts · sequence analytics · AI transparency ("why FIGSY wrote this") · intent signals |
| **Apex** | "Acts, doesn't just respond" framing · approval-mode→autonomy onboarding · digital-twin angle (Milla = AI Chief of Staff) · founder-as-demo on LinkedIn |
| **Glean** | Context/memory moat (#46 pgvector · #47 CRM pull · V2-8 notetaker) · cross-client benchmarks (#64) |
| **Revio** | Bundled coaching onboarding (#62b) · case-study specificity (#62c–e) |
| **Amplemarket / MailerLite / Salesforce / Notion-Linear** | Intent signals (#37) · spam-score pre-send (#44) · AgentExchange marketplace (V2-5) + outcome pricing (#60) · MCP-native (#59) + slim sidebar (V2-6) |

---

# ░ PART 3 — DOC INDEX (stop the sprawl) ░
**This file = the live tracker.** Other docs are reference:
- `KIND-MASTER.md` — strategy bible / session log (links here)
- `CLIENT_FLOW.html` / `CLIENT_FLOW_PER_REP.html` — the journey + #88 per-rep design
- `portalv2preview.html` / `portal-v2-layout.md` — the 8 V2 cosmetic concepts
- `SMOKE_TEST.md` — T1–T10 detail · `DEPLOY-CHECKLIST.md` — deploy steps · `legal.md` — legal pack
- `MASTER_TODO.md` / `EVERYTHING.md` — **older/overlapping → fold into this tracker, then archive.**
