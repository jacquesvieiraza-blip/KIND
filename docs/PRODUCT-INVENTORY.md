# 📋 K.I.N.D — COMPLETE PRODUCT INVENTORY (THE single list)

> **This is the ONE inventory. Every item lives here with one status dot and one owner.**
> If something is built anywhere (main, staging, a branch), it is in this doc. `V2-TRACKER.md` holds
> only FUTURE detail (roadmap rationale, learning engine, steals); anything it mentions as built points back here.
>
> **Status dots — only three:**
> - 🟢 **BUILT + VERIFIED** — live in production, actually checked working
> - 🟡 **BUILT, NOT VERIFIED** — code-complete on staging/branch; needs founder review/sign-off (or a key/migration) before it earns 🟢
> - 🔴 **NOT BUILT** — future work
> - *(⏸ marks a 🔴 item that is blocked on something/someone)*
>
> **Owner = who is responsible for the NEXT step:** 🧍 founder · 🤖 Claude · 🤝 both · — done, no action
>
> **📅 THE PLAN (locked 12 Jun, supersedes "one combined launch"):**
> 1. **Mon 15 Jun — Company Command Centre + payment system → PRODUCTION** (the ONLY early ship; prod flag exposes `company` only)
> 2. **Fri 19 Jun — LAUNCH** (the proven core already live on `main`; D9 + legal + smoke tests + Go/No-Go Thu 18)
> 3. **Post-19 — everything else** (all 25 release PRs, shell redesign, Alta-style inbox, the whole staging review queue)
>
> *Last updated: 12 Jun 2026 · The 3 docs: `KIND-MASTER.md` (the map + founder checklist) · THIS (status of everything) · `V2-TRACKER.md` (future detail). Task tools: `COMPANY-ENGINE-TEST.md` (Monday test) · `STAGING-REVIEW.md` (review log).*

---

# ░ DESIGN-REVIEW LEDGER — locked screens + preview HTML (live since 12 Jun) ░

> One-glance record of the founder design walk. **Verdict:** ✅ approved as-is · 🎨 redesign locked (build to the preview) · 🗑️ cut.
> Per-screen detail + 👍/👎 in `STAGING-REVIEW.md`. Preview files in `docs/previews/`.

| Screen | Route | Verdict | Preview HTML | Inv. item |
|--------|-------|---------|--------------|-----------|
| AI Notetaker | `/dashboard/notetaker` | ✅ as-is | [notetaker-current](./previews/notetaker-current.html) | 81 |
| Documents & Agreements | `/dashboard/documents` | ✅ as-is | [documents-current](./previews/documents-current.html) | §1 (live) |
| Referral | `/dashboard/referral` | ✅ as-is | [referral-current](./previews/referral-current.html) | §1 (live) |
| Usage | `/dashboard/usage` | ✅ as-is | [usage-current](./previews/usage-current.html) | 28 |
| Proposals | `/dashboard/proposals` | ✅ as-is *(e-sign capture = #69)* | [proposals-current](./previews/proposals-current.html) | 39 |
| Sequence Builder | `/dashboard/figsy/sequence-builder` | 🎨 recolor locked | [sequence-builder-v2](./previews/sequence-builder-v2.html) | 82 |
| Command Centre | `/dashboard/company` | ✅ layout solid · co-located | — | C1 / §2A |
| Teams Hub | `/dashboard/team` | ✅ layout solid · moved to rail | — | 80 |
| Integrations | `/dashboard/integrations` | ✅ as-is (Connect group) | — | 83 |
| Developer API | `/dashboard/developer` | ✅ as-is (Connect group) | — | 46 |
| MCP Connect | `/dashboard/mcp` | ✅ as-is (Connect group) | — | 45 |
| What's New | `/dashboard/whats-new` | ✅ as-is | — | 78 |
| Templates | `/dashboard/templates` | ✅ as-is | — | 70 |
| Partner Hub | `/dashboard/partner` | ✅ as-is *(⚠️ earnings in ZAR → GBP)* | — | 37/42 |
| Messages | `/dashboard/messages` | ✅ as-is | — | 38 |
| Marketplace | `/dashboard/marketplace` | ✅ as-is | — | §1 (live) |
| Settings | `/dashboard/settings` | ✅ as-is | — | §1 (live) |
| Milla — chat | `/dashboard/assistant` | 🔄 in review | [milla-chat-current](./previews/milla-chat-current.html) | 2 |
| Agent cards | `/dashboard/agents` | 🎨 locked ("AI Family") | [agents-v2](./previews/agents-v2.html) | 125 |
| Inbox / Unibox | `/dashboard/inbox` | 🎨 redesign locked | [inbox-v2](./previews/inbox-v2.html) | 112 |
| Client invoicing | Company → Documents | 🎨 locked (Stripe-issued) | [invoice-v1](./previews/invoice-v1.html) · [invoices-list](./previews/invoices-list.html) | 136a ⭐ |
| Roadmap | ~~`/dashboard/roadmap`~~ | 🗑️ cut (we show the Drop) | — | — |
| **Agent right-panel** | all screens | 🔒 **pattern locked** — right agent / right screen / right panel, conversational, acts-in-place (FIGSY screenshot 13 Jun) | — | 113a ⭐ |

> **🔒 AGENT-PANEL RULE (locked 13 Jun):** On every screen, the *right* agent sits in the *right rail*. It is **conversational like FIGSY**, and when the client enters an input it **renders in that screen's right area and takes action** — never navigates away. Placement = built; conversational + acts-in-place = the 113a build (Tue 16 / post-19).

---

# ░ SECTION 1 — 🟢 BUILT + VERIFIED (live in production) ░

## The agents
| # | Item | Status | Owner |
|---|------|--------|-------|
| 1 | **FIGSY — The Opener (AI SDR)** — finds leads, unique email per lead, 3-step follow-up (Day 0/4/9), books meetings | 🟢 | — |
| 2 | **Milla — The Brain (AI VA)** — drafting, business Q&A, weekly brief *(Knowledge upload = 🟡, see §2)* | 🟢 | — |
| 3 | **Vida — The Connector** — website + WhatsApp chatbot, captures + routes leads | 🟢 | — |
| 4 | **Denise — The Closer** — warm follow-up + proposal drafts, subscription-gated | 🟢 | — |

## Lead gen & data engine
| # | Item | Status | Owner |
|---|------|--------|-------|
| 5 | Conversational ICP Builder (AI-suggested ICP from chat) | 🟢 | — |
| 6 | Apollo lead sourcing (3-pass, 250M+ contacts, preview-count) | 🟢 | — |
| 7 | AI lead scoring 0–100 (Claude) | 🟢 | — |
| 8 | Lead delivery drip + charge-on-delivery | 🟢 | — |
| 9 | POPIA consent + opt-out blocklist (suppression at all 6 send paths) | 🟢 | — |
| 10 | Lead enrichment (single + waterfall, key-gated) | 🟢 | — |
| 11 | LinkedIn CSV import + scoring | 🟢 | — |
| 12 | Lookalike leads | 🟢 | — |
| 13 | Lead cross-links + real per-status stats | 🟢 | — |

## Outreach engine (FIGSY)
| # | Item | Status | Owner |
|---|------|--------|-------|
| 14 | Campaigns — create/activate/pause/resume/clone/delete | 🟢 | — |
| 15 | Auto-Pilot / Co-Pilot modes | 🟢 | — |
| 16 | 3-step AI sequences (personalised, threaded) | 🟢 | — |
| 17 | Reply classification hot/warm/cold/opt-out (auto-pause on hot) | 🟢 | — |
| 18 | Inbox / replies view + Unibox (current version — Alta rebuild = 🔴 §3) | 🟢 | — |
| 19 | Mark-as-booked + KPI unify (meetings from real bookings) | 🟢 | — |
| 20 | Deliverability suite D1–D5 (List-Unsubscribe, plain-text, cold-FROM `gettingkind.com`, warmup auto-ramp 10→50/day, guarded auto-pause) — **T8 inbox placement PASSED** | 🟢 | — |
| 21 | Warmup live + auto-pause hotfix (PR #505 merged) | 🟢 | — |
| 22 | Suggest Campaigns · FIGSY Chat · Kanban pipeline view | 🟢 | — |

## Payments & billing
| # | Item | Status | Owner |
|---|------|--------|-------|
| 23 | Stripe — checkout, idempotent webhooks, 8 price IDs | 🟢 | — |
| 24 | Flutterwave (ZAR/NGN/KES/GHS) — wired; activation ⏸ §3 | 🟢 | — |
| 25 | Credit bundles (Lead Gen $1 · FIGSY $3 · 20/40/100) | 🟢 | — |
| 26 | Agent subscriptions (Vida $29 · Milla $49 · Denise — $39 repricing = 🟡 §2) | 🟢 | — |
| 27 | Credit system + atomic ledger | 🟢 | — |
| 28 | Usage tracking per client | 🟢 | — |

## Admin OS (internal)
| # | Item | Status | Owner |
|---|------|--------|-------|
| 29 | Admin OS — dark shell, key-protected (constant-time) | 🟢 | — |
| 30 | Clients list + per-client management | 🟢 | — |
| 31 | Revenue + Cohorts + Analytics (MRR, retention, funnels) | 🟢 | — |
| 32 | Showcase Demo (600 leads / ~$1.8M pipeline seeded demo) | 🟢 | — |
| 33 | Compliance + Data-Moat + Scalability dashboards | 🟢 | — |
| 34 | CMO (K.I.N.D's own dogfood lead-gen) | 🟢 | — |
| 35 | Founder dashboard + Health + Status | 🟢 | — |
| 36 | Launch checklist runbook | 🟢 | — |
| 37 | Partners management (approve, sandbox, commissions) | 🟢 | — |
| 38 | Admin Unibox + Visitors + Messages | 🟢 | — |
| 39 | Proposals + Order-forms + Terms-library | 🟢 | — |
| 40 | Smoke-test + Seed + Docs viewer | 🟢 | — |

## Platform / infra
| # | Item | Status | Owner |
|---|------|--------|-------|
| 41 | Supabase auth (signup, login, onboarding gate, magic links, RLS) — T1 fresh signup PASSED 11 Jun | 🟢 | — |
| 42 | Partner Programme (apply→approve→auto-sandbox→portal→20% commission — Demmy live) | 🟢 | — |
| 43 | CRM integration (HubSpot/Pipedrive dedup + deal push) | 🟢 | — |
| 44 | Google Calendar booking + KPI | 🟢 | — |
| 45 | MCP server (figsy_find_leads · figsy_get_campaign_stats · figsy_suggest_campaign · milla_ask) | 🟢 | — |
| 46 | Developer API (key management + MCP guide) | 🟢 | — |
| 47 | Webhooks — Stripe, Flutterwave, Resend inbound, Vapi (all signature-verified) | 🟢 | — |
| 48 | Outcome-event data floor (append-only log — the training fuel) | 🟢 | — |
| 49 | Rate limiting (signup/demo/subscribe/unsubscribe) | 🟢 | — |
| 50 | Push notifications (hot-reply web push) | 🟢 | — |
| 51 | Failover (Render standby + Cloudflare LB; parity check owed — Y12) | 🟢 | — |
| 52 | 2 crown-jewel key rotations (Stripe secret + Supabase service-role) — done 11 Jun | 🟢 | — |
| 53 | Marketing site — 40+ pages (pricing, per-agent, vs-pages, blog, legal) | 🟢 | — |
| 54 | **Staging environment** — sealed: separate Supabase `kind-staging` + `api-staging` + portal `heartfelt-essence…railway.app` + banner + seed. Isolation proven | 🟢 | — |

---

# ░ SECTION 2 — 🟡 BUILT, NOT VERIFIED (needs founder action to earn its 🟢) ░

> **🔒 SET RULE (locked): the ONLY thing that goes to production Monday 15 is the Company Payment
> Command Centre (§2A — items 55–59, all ONE product). EVERY other yellow (§2B, items 60–99) ships
> AFTER the 19th — no exceptions.** The Monday prod flag exposes `company` only; nothing else in §2B
> is enabled until per-feature sign-off post-launch.

## 2A — 🚀 THE COMPANY PAYMENT COMMAND CENTRE — the ONE product shipping to production Monday 15 Jun
*(All five rows below are the same single ship: the Command Centre + its per-rep seats/agent-unlock + its payment system. This is the only early production ship.)*
| # | 🟡 | Item | What's left to verify | Owner |
|---|----|------|----------------------|-------|
| 55 | 🟡 | **Command Centre** (#88 foundation) — per-rep private workspaces · owner-funded pools · per-seat budgets · request→approve/deny loop · invite→accept→own workspace · per-seat autonomy · winning-plays library · real per-rep stats | Command Centre already verified on staging 12 Jun ✅ — Monday: merge 7 newer commits → re-test → prod migration + merge + `company` flag | 🧍 test · 🤝 ship |
| 56 | 🟡 | **Per-rep agent unlock** (owner toggles Milla/Vida/Denise per rep → rolled-up company bill) — part of the Command Centre Seats tab | On feature branch, **not yet on staging** — Monday merge + schema re-paste + redeploy, then Test 7 | 🧍 |
| 57 | 🟡 | **Payment system — Stripe → company pool billing** (owner pays → pools funded) | 🤖 **building now** — single pool first, two-pool right after; then 🧍 creates pool-topup products | 🤖 then 🧍 |
| 58 | 🟡 | **Denise $39 Stripe price** (billing prerequisite for the company bill — code already $39 everywhere) | 🧍 create the $39 Stripe price + set `STRIPE_PRICE_DENISE_MONTHLY` — until then checkout charges $99 | 🧍 |
| 59 | 🟡 | Admin "Company demo" provisioning (to demo the Command Centre) | Create one in admin → open `/dashboard/company` populated | 🧍 |

## 2B — 📦 POST-19 QUEUE — built + build-verified, but does NOT ship Monday; all parked until AFTER the 19th (review via `STAGING-REVIEW.md`)
| # | 🟡 | Item | Where it waits | Owner |
|---|----|------|----------------|-------|
| 60 | 🟡 | **Wave 1 — R1 demo-bounce guard** | PR #506 | 🧍 review+merge |
| 61 | 🟡 | R2 daily client brief (server-backed opt-in) | PR #507 | 🧍 |
| 62 | 🟡 | R3 Vida in-portal help bubble | PR #508 | 🧍 |
| 63 | 🟡 | R4 speed-to-lead (Vida hot lead → pipeline + Denise draft) | PR #509 | 🧍 |
| 64 | 🟡 | R5 milestone share-to-LinkedIn cards + partner badge | PR #510 | 🧍 |
| 65 | 🟡 | R6 onboarding day-0/3/7 emails for paid clients | PR #511 | 🧍 |
| 66 | 🟡 | **Wave 2 — R7 Unibox "Help me reply"** (real Claude draft) | PR #512 | 🧍 |
| 67 | 🟡 | R8 saved views for leads table | PR #513 | 🧍 |
| 68 | 🟡 | R9 "Why FIGSY wrote this" transparency card | PR #514 | 🧍 |
| 69 | 🟡 | R10 Goals — KPI targets + progress bars | PR #515 | 🧍 |
| 70 | 🟡 | R11 sequence-template library by use-case | PR #516 | 🧍 |
| 71 | 🟡 | R12 embeddable lead-capture forms | PR #517 | 🧍 |
| 72 | 🟡 | R13 Cmd+K upgrade (quick actions) | PR #518 | 🧍 |
| 73 | 🟡 | R14 Meeting-Prep (Denise pre-call brief) | PR #519 | 🧍 |
| 74 | 🟡 | R15 Train-FIGSY knowledge backend | PR #520 | 🧍 |
| 75 | 🟡 | R16 internal evals harness (per-variant reply rates) | PR #521 | 🧍 |
| 76 | 🟡 | R17 spam-score pre-send check | PR #522 | 🧍 |
| 77 | 🟡 | R18 multi-model toggle (Fast/Smart) per campaign | PR #523 | 🧍 |
| 78 | 🟡 | R19 in-product "What's New" feed | PR #524 | 🧍 |
| 79 | 🟡 | R20 job-change alerts on leads | PR #525 | 🧍 |
| 80 | 🟡 | **Tier 3 — R21 Teams Hub** (`/dashboard/team`) | staging | 🧍 |
| 81 | 🟡 | R22 AI Notetaker (`/dashboard/notetaker`) — *design ✅ approved as-is 12 Jun* | staging | 🧍 |
| 82 | 🟡 | R23 visual Sequence Builder (`/dashboard/figsy/sequence-builder`) — *design 🎨 **LOCKED** 12 Jun → `previews/sequence-builder-v2.html` (brand recolor); build to this when #89 wires it* | staging | 🧍 |
| 83 | 🟡 | R24 Integrations Hub (`/dashboard/integrations`) | staging | 🧍 |
| 84 | 🟡 | R25 SSO signup buttons (needs OAuth app registration to go live) | staging | 🧍 |
| 85 | 🟡 | **Shell — nav redesign** (slim work-only rail + agent switcher) — *founder approved 12 Jun* | staging → merges post-19 | 🤝 |
| 86 | 🟡 | Shell — profile dropdown → grouped account hub — *founder approved* | staging | 🤝 |
| 87 | 🟡 | Shell — status bar #104 (FIGSY active · sent · health) | staging review | 🧍 |
| 88 | 🟡 | Activity feed #102 (`/dashboard/activity`, live timeline) | staging review | 🧍 |
| 89 | 🟡 | Notification centre #103 (real bell wired) | staging review | 🧍 |
| 90 | 🟡 | Deliverability dashboard #48 | staging review | 🧍 |
| 91 | 🟡 | Mobile PWA icons #114 | staging review | 🧍 |
| 92 | 🟡 | PR #502 — 10-Jun audit batch (Y1–Y11 etc.) ⚠️ needs rebase before merge | open PR | 🧍 |
| 93 | 🟡 | PR #503 — The Drop + Product Videos pages (+ site nav rewire held on it) | open PR | 🧍 |
| 94 | 🟡 | PDL 2nd lead-discovery source (code wired, dormant) | needs `PDL_API_KEY` | 🧍 |
| 95 | 🟡 | Hunter waterfall enrichment (code wired, dormant) | needs `HUNTER_API_KEY` | 🧍 |
| 96 | 🟡 | Voice (Vapi) + WhatsApp (code wired) | keys + Meta approval | 🧍 |
| 97 | 🟡 | A/B subject-testing backend #43 (winner-check cron + variants — UI = 🔴) | works, invisible until UI | 🤖 |
| 98 | 🟡 | Offline flow docs `CLIENT_FLOW.html` + `CLIENT_FLOW_PER_REP.html` | reference, done | — |
| 99 | 🟡 | `/v2/*` design mockups (23 screens — sequences, inbox, gallery…) — clickable designs, NOT wired | design exploration | 🧍 review |

---

# ░ SECTION 3 — 🔴 NOT BUILT (future, in build order) ░

## 3A — Launch week (now → Fri 19, NOT code — founder runway)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 100 | 🔴 | Smoke Test 2 — T3 pause · T4 booking · T5 billing · T6 Vida · T7 Milla · T9 invites · T10 partner | 🤝 |
| 101 | 🔴 | **D9 deliverability 10/10** (mail-tester) | 🧍 |
| 102 | 🔴 | Legal pack #10–14 (ICO £40 · SR01 · registered office · WHOIS · LinkedIn lockdown) | 🧍 |
| 103 | 🔴 | Email `partners@apollo.io` — API reseller agreement (~1 wk lead) | 🧍 |
| 104 | 🔴 | Hunter.io signup → key · PDL free signup → key | 🧍 |
| 105 | 🔴 | Go/No-Go gate Thu 18 → **🚀 LAUNCH Africa-only Fri 19 (#18)** | 🤝 |

## 3B — Company Engine completion (post-19 unless the demo needs it)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 106 | 🔴 | Invite **email delivery** (today the link is copy-paste — works for Monday) | 🤖 |
| 107 | 🔴 | Owner **drill-down** into a rep's pipeline/inbox | 🤖 |
| 108 | 🔴 | Edit rep budget directly · deactivate/remove a rep (offboarding) | 🤖 |
| 109 | 🔴 | Manager role fully wired · notifications (owner↔rep) | 🤖 |
| 110 | 🔴 | Per-rep lead ownership/routing + CRM dedup (#88-38) | 🤖 |
| 111 | 🔴 | Per-rep / multi-provider calendars (#88-41, V2-13) | 🤖 |

## 3C — Post-19 near-term build queue (ungated, buildable on founder go)
| # | 🔴 | Item | Owner | 🎨 Preview |
|---|----|------|-------|-----------|
| 112 | 🔴 | **Alta-style inbox rebuild** — Gmail-style multi-channel Unibox (founder 👎 12 Jun "inbox is not great" → redesign **locked** 12 Jun) | 🤖 | [inbox-v2.html](./previews/inbox-v2.html) ✅ **LOCKED** — build to this when pushed |
| 113 | 🔴 | A/B subject testing **UI** #43 (backend ready, §2 #97) | 🤖  |  |
| 113a | 🔴 | 📅 **TUESDAY 16 Jun** — **Agent side-panel = conversational, acts-in-place** 🔒 **SPEC LOCKED 13 Jun**. Founder rule: *"Milla, Vida and Denise should all do exactly what FIGSY does — conversational agents. In the exact screen the client is in, the right agent is there on the right panel. It is conversational, and if an input is done it renders in the right area on that screen and takes action."* Three parts: **(1) right agent / right panel / right screen** = ✅ ALREADY BUILT (`AgentColumn.tsx:65-68` picks agent by route; sticky right rail). **(2) conversational in-panel** = 🔴 BUILD — today `onSend` redirects (`router.push`, lines 119/143/168/355); make it a live thread like FIGSY for all four. **(3) input renders in the screen's right area & takes action** = 🔴 BUILD — reply + action render in place, no navigate-away. Endpoints: Milla→`/milla`, Vida→`/support`/`/vida`; ⚠️ **Denise needs a general chat endpoint** (only draft-followup/proposal today). Each panel keeps its screen-specific purpose/chips. | 🤖 |  |
| 114 | 🔴 | Kanban pipeline polish #100 | 🤖  |  |
| 115 | 🔴 | Configurable agent triggers #53 (send window, weekends, reply delay — **needs backend first**) | 🤖  |  |
| 116 | 🔴 | Activity feed → Home-dashboard widget (touches core screen — design review first) | 🤝  |  |
| 117 | ⏸ | Subscribe-to-the-drop #122 (⏸ Drop content) | 🤖  |  |
| 118 | 🔴 | Site nav/footer rewire #123 (~40 pages, Demo→Watch + The Drop) | 🤖  |  |
| 119 | ⏸ | Revenue Mission Control #115 (3-col live ops — ⏸ confirm direction, ~3–4 days) | 🤝  |  |
| 120 | ⏸ | FIGSY Memory v2 / pgvector #46 (⏸ 🧍 flips pgvector switch, 2 min) | 🤝  |  |
| 121 | ⏸ | Casey conversational onboarding V2-3/10 (⏸ founder voice/tone input — highest-value V2 build) | 🤝  |  |
| 122 | 🔴 | Y16 — kill dead Vercel↔GitHub integration | 🧍  |  |
| 123 | 🔴 | Y12 failover parity check · Y13 D&O + trademarks · Y14 demo-seed isolation | 🤝  |  |
| 124 | 🔴 | Integration tests on money/credit paths (Y15, week-1 post-launch) | 🤖  |  |
| 125 | 🔴 | **"Your AI Family" card redesign** (was #5 crop) — feature text off the photo, crop fixed + **rename "AI Team"→"AI Family"** (3 files: `agents/page.tsx`, `Sidebar.tsx`, `cmo.ts`) | 🤖 | [agents-v2.html](./previews/agents-v2.html) ✅ **LOCKED** |
| 126 | ⏸ | Social login go-live (⏸ Google/Microsoft OAuth registration) | 🧍  |  |

## 3D — Week 1 post-launch (Jun 19–28) — GTM
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 127 | 🔴 | 10 warm outreach (#19) · LinkedIn 1/day (#20) · PhantomBuster activation (#21) | 🧍 |
| 128 | 🔴 | Meta/WhatsApp API application (#22) | 🧍 |
| 129 | 🔴 | Record real product demo 16:9+9:16 (#23) + Drop 01 video + 3 onboarding Looms (#31) | 🧍 |
| 130 | ⏸ | Homepage hero = real product loop (#24, ⏸ on #23) · proof block real data (#33) | 🤖 |
| 131 | 🔴 | GTM funnel instrumentation (#25) | 🤝 |
| 132 | 🔴 | Dogfood self-outreach (#26) · fresh-signup check (#28) | 🧍 |

## 3E — Weeks 2–4 (Jun 29 – Jul 19)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 133 | 🔴 | 2 design-partner slots → case study + logo (#29) | 🧍 |
| 134 | 🔴 | 9:16 social cuts (#30) · YouTube channel (#35) | 🤝 |
| 135 | 🔴 | Onboarding v2 emails (#32) · playbook email form (#36) | 🤖 |
| 136 | 🔴 | Flutterwave activation (#34) | 🧍 |
| 136a | 🔴 | ⭐ **IMPORTANT** — **Client invoicing — surface Stripe VAT invoices in-portal.** Decision (12 Jun): **Stripe issues the official UK VAT invoices** (enable Stripe Tax + Invoicing, add K.I.N.D Ltd details + GB VAT no + branding in Stripe dashboard — founder config). **We build:** an *Invoices* surface under **Company → Documents** that pulls the client's Stripe invoices via API (`invoices.list`) and lists date / number / amount / status with a **Download PDF** link to Stripe's hosted PDF (`invoice_pdf` / `hosted_invoice_url`). `previews/invoice-v1.html` = the document/branding target for the Stripe PDF; in-portal **list** design → `previews/invoices-list.html`. ⚠️ Founder: confirm VAT-registered status + currency (code bills USD; UK co). | 🤖 |
| 137 | 🔴 | 90-day performance guarantee (#61a/g) · Revenue Playbook call (#62b) · homepage outcome numbers (#62c) | 🤖 |
| 138 | 🔴 | Influencer/community distribution (#61e) | 🧍 |

## 3F — Month 2 (gated 10+ clients) — Intelligence layer
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 139 | 🔴 | Intent signals #37 · A/B→contextual bandit #38 · morning-brief #39 · ICP auto-refinement L2 #40 · conditional branching #41 | 🤖 |
| 140 | 🔴 | Waterfall enrichment live #42 · adaptive send volume #45 · Milla CRM pull #47 · inbox rotation/multi-domain #53 (needs warmed domains) | 🤝 |
| 141 | 🔴 | **Context-backed MCP server #59** (client-context-backed, not thin wrappers) | 🤖 |
| 142 | 🔴 | Product Hunt #49 · G2 listing #50 | 🧍 |
| 143 | 🔴 | **The Learning Engine** (build order: ①Train-FIGSY RAG → ③evals → ②outcome feedback loop → bandit → ④recall/memory → ⑤model routing → fine-tuning LAST) — full blueprint in `V2-TRACKER.md` | 🤖 |

## 3G — Month 3 (gated margin data) — the agent family
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 144 | 🔴 | **DENISE deep build #54** (auto-book · notetaker · objections · proposal-from-transcript · Vapi voice) | 🤖 |
| 145 | 🔴 | **LENA — CS agent #55** · **TONY — Ops agent #56** | 🤖 |
| 146 | 🔴 | Multi-agent orchestration #57 · 500+ skill library #58 | 🤖 |
| 147 | 🔴 | Outcome pricing per meeting #60 (gated ≥28% margin) | 🤝 |
| 148 | 🔴 | Mobile app #61 · built-in CRM Kanban #62 · pan-African design partners #63 | 🤝 |
| 149 | 🔴 | Proposal e-sign #69 · Zoom notetaker #70 | 🤖 |

## 3H — Year 2 — enterprise + moat
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 150 | 🔴 | Cross-client intelligence L4 #64 · data-licensing marketplace #65 · ICP L3 #66 · pipeline forecasting #67 · in-portal messaging #68 | 🤖 |
| 151 | 🔴 | ISO 27001/42001 · SOC 2 · Vanta (#71–74) | 🤝 |
| 152 | 🔴 | 3-type memory #75 · visitor de-anon #76 · churn scoring #77 · revenue forecasting #78 · call intelligence #79 | 🤖 |

## 3I — The 15 Pieces (UX/platform, post-20-clients — remaining unbuilt)
| # | 🔴 | Item | Trigger |
|---|----|------|---------|
| 153 | 🔴 | Score heatmap + timeline views (Kanban exists) | post-20 clients |
| 154 | 🔴 | Custom lead fields (jsonb) | on request |
| 155 | 🔴 | Visual automation builder (React Flow) | 50+ clients |
| 156 | 🔴 | Self-learning ICP ("narrow your ICP?") | 3 mo data |
| 157 | 🔴 | Personalised email images (Lemlist) | Phase 3 |
| 158 | 🔴 | Voice-first morning brief (TTS) | after text brief |
| 159 | 🔴 | Network benchmarks ("top 15%") | 20+ clients |
| 160 | 🔴 | White-label / agency channel | first agency asks |
| 161 | 🔴 | MCP dev tier + directory listing | 20+ clients |

---

# ░ REFERENCE — THE STEALS CATALOG (who we learn from → what we take) ░
*(unchanged — full per-source detail in `V2-TRACKER.md` steals table)*
**Alta** Touch-Points tree · template gallery · Train tabs · funnel dashboard · Unibox reply-tags/"Help me reply" · saved views · **the inbox blueprint (item 112)** · **ClickUp** Cmd+K · views · feed · status bar · Goals · Forms · Integrations Hub · **Lemlist** images · sequence builder · community play · **Monday** share-loop · dense dashboards · Pixar warmth · **Atlas** speed-to-lead · 90-day guarantee · influencers · **Instantly** warmup · auto-pause · adaptive volume · rotation · **Clay** waterfall enrichment · **Apollo** job-change · sequence analytics · transparency · intent · **Apex** acts-not-responds · autonomy onboarding · founder-as-demo · **Glean** context moat · benchmarks · winning-play library · Casey/auto-setup · permission-safety · context-backed MCP · **Revio** coaching onboarding · case-study specificity.

---
*This inventory is the single complete list (161 numbered items). 🟢 = earned, live + checked. 🟡 = needs the named verification. 🔴 = future, in order. Nothing ships until the founder merges.*
