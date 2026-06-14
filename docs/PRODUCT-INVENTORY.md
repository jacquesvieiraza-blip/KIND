# 📋 K.I.N.D — COMPLETE PRODUCT INVENTORY (THE single list)

> **This is the ONE inventory. Every item lives here with one status dot and one owner.**
> If something is built anywhere (main, staging, a branch), it is in this doc. `V2-TRACKER.md` holds
> only FUTURE detail (roadmap rationale, learning engine, steals); anything it mentions as built points back here.
>
> **Status dots — FOUR states (locked 13 Jun):**
> - 🟢 **BUILT + LIVE** — in production, verified working. The terminal "done" state.
> - 🟣 **APPROVED + LOCKED** — built, founder has design-signed-off, pushed. The design is FINAL; it's just waiting to ship (Monday for the Command Centre; post-19 for the rest). A 🟡 becomes 🟣 the moment it's approved + pushed.
> - 🟡 **BUILT, PENDING REVIEW** — code-complete on staging/branch/PR, but NOT yet approved. Needs founder review/sign-off (or a key/migration) before it can go 🟣 then 🟢.
> - 🔴 **NOT BUILT** — future work. *(Some carry a 🔒 **design approved** preview to build to — the design is locked even though the code isn't written.)*
> - *(⏸ marks a 🔴 item that is blocked on something/someone.)*
>
> **Numbers are STABLE IDs, not sequence** — an item keeps its number wherever it moves between sections (so links from `KIND-MASTER.md` / `V2-TRACKER.md` never break).
>
> **Owner = who is responsible for the NEXT step:** 🧍 founder · 🤖 Claude · 🤝 both · — done, no action
>
> **📅 THE PLAN (locked 12 Jun, supersedes "one combined launch"):**
> 1. **Mon 15 Jun — Company Command Centre + payment system → PRODUCTION** (the ONLY early ship; prod flag exposes `company` only)
> 2. **Fri 19 Jun — LAUNCH** (the proven core already live on `main`; D9 + legal + smoke tests + Go/No-Go Thu 18)
> 3. **Post-19 — everything else** (all 25 release PRs, shell redesign, Alta-style inbox, the whole staging review queue)
>
> *Last updated: 14 Jun 2026 · **Now lives on `main`** (was stranded on `claude/kind-carson-MYhSl` — consolidated onto the live branch 14 Jun so logging travels with the live code). Today's website work: The Drop revamped to a Monday-style show layout + main-page polish + Demo removed from top nav site-wide (items 93 · 118) — all merged to `main`, live. · The 3 docs: `KIND-MASTER.md` (the map + founder checklist) · THIS (status of everything) · `V2-TRACKER.md` (future detail). Task tools: `COMPANY-ENGINE-TEST.md` (Monday test) · `STAGING-REVIEW.md` (review log).*

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
| Sequence Builder | `/dashboard/figsy/sequence-builder` | 🟣 recolor BUILT 13 Jun | [sequence-builder-v2](./previews/sequence-builder-v2.html) | 82 🟣 |
| Command Centre | `/dashboard/company` | ✅ layout solid · co-located | — | C1 / §2A |
| Teams Hub | `/dashboard/team` | ✅ layout solid · moved to rail | — | 80 |
| Integrations | `/dashboard/integrations` | ✅ as-is (Connect group) | — | 83 |
| Developer API | `/dashboard/developer` | ✅ as-is (Connect group) | — | 46 |
| MCP Connect | `/dashboard/mcp` | ✅ as-is (Connect group) | — | 45 |
| What's New | `/dashboard/whats-new` | ✅ as-is | — | 78 |
| Templates | `/dashboard/templates` | ✅ as-is | — | 70 |
| Partner Hub | `/dashboard/partner` | ✅ as-is *(⚠️ earnings ZAR → USD)* | — | 37/42 |
| Messages | `/dashboard/messages` | ✅ as-is | — | 38 |
| Marketplace | `/dashboard/marketplace` | ✅ as-is | — | §1 (live) |
| Settings | `/dashboard/settings` | ✅ as-is | — | §1 (live) |
| Milla — chat | `/dashboard/assistant` | ✅ **approved 13 Jun** ("locked") | [milla-chat-current](./previews/milla-chat-current.html) | 2 |
| Agent cards | `/dashboard/agents` | 🎨 locked ("AI Family") | [agents-v2](./previews/agents-v2.html) | 125 |
| Inbox / Unibox | `/dashboard/inbox` | 🎨 redesign locked | [inbox-v2](./previews/inbox-v2.html) | 112 |
| Client invoicing | Company → Documents | 🎨 locked (Stripe-issued) | [invoice-v1](./previews/invoice-v1.html) · [invoices-list](./previews/invoices-list.html) | 136a ⭐ |
| Roadmap | ~~`/dashboard/roadmap`~~ | 🗑️ cut (we show the Drop) | — | — |
| **Agent right-panel** | all screens | ✅ **BUILT 13 Jun** — conversational + acts-in-place for FIGSY/Milla/Vida/Denise (Casey endpoint ready, panel wires with onboarding) | [agent-panel-conversational](./previews/agent-panel-conversational.html) ✅ **LOCKED** | 113a ⭐ |

> **🔒 AGENT-PANEL RULE (locked + prototype APPROVED 13 Jun):** Applies to **all five agents — FIGSY, Milla, Vida, Denise, Casey**. On every screen, the *right* agent sits in the *right rail*. It is **conversational like FIGSY**, and when the client enters an input it **renders in that screen's right area and takes action** — never navigates away. Placement = built for 4 (Casey still needs wiring); conversational + acts-in-place = the 113a build (Tue 16 / post-19), to the approved `agent-panel-conversational.html` prototype.

---

# ░ SECTION 1 — 🟢 BUILT + LIVE (in production, verified working) ░

## The agents
| # | Item | Status | Owner |
|---|------|--------|-------|
| 1 | **FIGSY — The Opener (AI SDR)** — finds leads, unique email per lead, 3-step follow-up (Day 0/4/9), books meetings | 🟢 | — |
| 2 | **Milla — The Brain (AI VA)** — drafting, business Q&A, weekly brief *(Knowledge upload backend = 🟡, see §3A item 74)* | 🟢 | — |
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
| 18 | Inbox / replies view + Unibox (current version — Alta rebuild = 🔴 §4C item 112) | 🟢 | — |
| 19 | Mark-as-booked + KPI unify (meetings from real bookings) | 🟢 | — |
| 20 | Deliverability suite D1–D5 (List-Unsubscribe, plain-text, cold-FROM `gettingkind.com`, warmup auto-ramp 10→50/day, guarded auto-pause) — **T8 inbox placement PASSED** | 🟢 | — |
| 21 | Warmup live + auto-pause hotfix (PR #505 merged) | 🟢 | — |
| 22 | Suggest Campaigns · FIGSY Chat · Kanban pipeline view | 🟢 | — |

## Payments & billing
| # | Item | Status | Owner |
|---|------|--------|-------|
| 23 | Stripe — checkout, idempotent webhooks, 8 price IDs | 🟢 | — |
| 24 | Flutterwave (ZAR/NGN/KES/GHS) — wired; activation ⏸ §4E item 136 | 🟢 | — |
| 25 | Credit bundles (Lead Gen $1 · FIGSY $3 · 20/40/100) | 🟢 | — |
| 26 | Agent subscriptions (Vida $29 · Milla $49 · Denise — $39 repricing = 🟡 §2A item 58) | 🟢 | — |
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

# ░ SECTION 2 — 🟣 APPROVED + LOCKED (built · founder-signed-off · pushed · design FINAL) ░

> The founder has walked and approved these. Design will NOT change. They're not live yet **only** because of the
> launch plan: the **Command Centre ships Monday 15**; everything else ships **after the 19th**. Where a row shows a
> 🟡 execution note, that's build/config left to ship — not the design (the design is locked).

## 2A — 🚀 MONDAY 15 SHIP — Company Payment Command Centre (the ONLY early production ship)
*(One product: Command Centre + per-rep seats/agent-unlock + its payment system. Layout approved 12 Jun.)*
| # | State | Item | Execution left before Monday | Owner |
|---|-------|------|------------------------------|-------|
| 55 | 🟣 | **Command Centre** (#88) — per-rep workspaces · owner-funded pools · per-seat budgets · request→approve/deny · invite→accept→own workspace · winning-plays library · real per-rep stats | Verified on staging 12 Jun ✅ — Monday: merge 7 newer commits → re-test → prod migration + `company` flag | 🧍 test · 🤝 ship |
| 56 | 🟣 | **Per-rep agent unlock** (owner toggles Milla/Vida/Denise per rep → rolled-up bill) — Seats tab | On feature branch — Monday merge + schema re-paste + redeploy, then Test 7 | 🧍 |
| 57 | 🟡 | **Payment system — Stripe → company pool billing** (owner pays → pools funded) | 🤖 **building now** — single pool first, two-pool next; then 🧍 creates pool-topup products | 🤖 then 🧍 |
| 58 | 🟡 | **Denise $39 Stripe price** (billing prerequisite) | 🧍 create $39 Stripe price + set `STRIPE_PRICE_DENISE_MONTHLY` — until then checkout charges $99 | 🧍 |
| 59 | 🟡 | Admin "Company demo" provisioning | Create one in admin → open `/dashboard/company` populated | 🧍 |

> **🔒 Monday rule:** the ONLY thing exposed to production Monday is `company`. Rows 57–59 are finishing build/config on the approved product — nothing in §3/§4 is enabled.

## 2B — 📦 POST-19 — design APPROVED in the founder walk · built on staging · parked until after the 19th
| # | State | Item | Where it waits | Owner |
|---|-------|------|----------------|-------|
| 80 | 🟣 | **Teams Hub** (`/dashboard/team`) — *✅ approved 12 Jun · co-located in rail* | staging | 🧍 ship post-19 |
| 81 | 🟣 | **AI Notetaker** (`/dashboard/notetaker`) — *✅ approved as-is 12 Jun* | staging | 🧍 ship post-19 |
| 83 | 🟣 | **Integrations Hub** (`/dashboard/integrations`) — *✅ approved as-is (Connect group)* | staging | 🧍 ship post-19 |
| 85 | 🟣 | **Shell — nav redesign** (slim work-only rail + agent switcher) — *✅ founder approved 12 Jun* | staging → merges post-19 | 🤝 |
| 86 | 🟣 | **Shell — profile dropdown → grouped account hub** — *✅ founder approved* | staging | 🤝 |
| 82 | 🟣 | **Visual Sequence Builder** (`/dashboard/figsy/sequence-builder`) — *🎨 design locked 12 Jun · **recolor BUILT 13 Jun** to `previews/sequence-builder-v2.html` (lilac page · dotted canvas · purple-tinted tiles · ink headings · lilac connectors · purple banner)* | branch `claude/kind-carson-MYhSl` → ship post-19 | 🧍 ship post-19 |
| 88 | 🟣 | **Activity feed** (`/dashboard/activity`, #102) — *✅ approved 13 Jun (as-is) → `previews/activity-feed-current.html`*; live workspace timeline (sends/replies/meetings), real client-scoped events, 30s poll | staging → ship post-19 | 🧍 ship post-19 |
| 89 | 🟣 | **Notification centre** (bell · #103) — *✅ approved 13 Jun (as-is) → `previews/notification-centre-current.html`*; 4 types (interested reply · consented lead · low credits · trial expiring) each with a one-tap action, red count badge, 2-min poll | staging → ship post-19 | 🧍 ship post-19 |
| 90 | 🟣 | **Deliverability dashboard** (`/dashboard/deliverability`, #48) — *✅ approved 13 Jun (as-is) → `previews/deliverability-current.html`*; health band (opt-out–derived) · warmup pacing (cap 10→50/day) · engagement metrics (open/reply/opt-outs) · 14-day volume chart · honest (no invented bounce/spam until D9) | staging → ship post-19 | 🧍 ship post-19 |
| 87 | 🟣 | **Shell — status bar** (sidebar footer, #104) — *✅ approved 13 Jun (as-is) → `previews/status-bar-current.html`*; live pulse: FIGSY state (active/idle) · today's sends vs cap (progress bar) · system health (operational/degraded); real endpoints + 60s poll, degrades silently | staging → ship post-19 | 🧍 ship post-19 |
| 84 | 🟣 | **Signup + SSO buttons** (`/v2/signup`, #R25) — *✅ approved 13 Jun (design) → `previews/signup-sso-current.html`*; Google + Microsoft OAuth buttons + email + T&C. Design locked; **go-live still needs 🧍 OAuth app registration (Google Cloud + Azure)** | staging | 🧍 register OAuth apps |
| 91 | 🟣 | **Mobile PWA icons** (#114) — *✅ approved as-is 13 Jun (gradient K + cream splash kept)*; manifest (name · shortcuts to Dashboard/Leads/FIGSY · standalone/portrait · theme #7C3AED) + icon-192/512 + maskable-512 | staging → ship post-19 | 🧍 ship post-19 |
| 92 | 🟣 | **PR #502 — 10-Jun audit batch** (Y1–Y11) — *✅ founder cleared to merge 13 Jun (housekeeping, no UI)* · ⚠️ **needs rebase before merge** | open PR | 🧍 rebase + merge post-19 |
| 98 | 🟣 | **Offline flow docs** (`CLIENT_FLOW.html` + `CLIENT_FLOW_PER_REP.html`) — *✅ reference, done & cleared 13 Jun* | reference | — |
| 93 | 🟣 | **Marketing: The Drop + Watch** (PR #503, `apps/website/the-drop.html` + `product-videos.html`) — *✅ approved 13 Jun → `previews/marketing-the-drop.html` + `marketing-product-videos.html`*; orphan pages until nav rewire (#123, item 118). Site marketing style (darker than portal) intentional. **🔑 CORRECTED 13 Jun: The Drop is a SERIES — each drop showcases 3–5 products. ✅ BUILT: `apps/website/the-drop.html` = 9 drops (newest-first 09→01), no video. Watch/Product Video page → ⏸️ HELD. Full plan in `KIND-MASTER.md` → Website Resources.** Also built this session: **162 Prompt Library** (`prompt-library.html`, 17 prompts, filter+search+copy), **Tony "Coming Soon"** added (Products dropdown 22pp · home grid · footer · About Us family story — The Order Maker), **The Drop + Prompt Library wired into Resources nav** (17pp), **Visitor tracking snippet** on all 40 pages. ⏳ **Pending: website-only deploy to `main`** (Cloudflare publishes; portal stays parked). **🆕 14 Jun — SHIPPED TO `main` (live): The Drop REVAMPED** to a bold Monday-style show/podcast layout (soft palette · hero card-cluster · filterable Topic+Industry grid · 9 episode cards wired to the existing `drop-01..09` detail pages), PR #544 · **main-page polish** (emoji→inline-SVG sweep · pricing redesign · POPIA soft-mint trust seal · cut Promise Strip + Every Team Wins), PR #542. Episode titles/summaries are drafted placeholders to swap for the real recorded episodes; no video yet (cards "Read story"). | 🤖 built · 🤝 deploy | 🤖 |
| 99 | 🟣 | **`/v2/*` design mockups — WALKED + design-source locked 13 Jun.** 🔒 Decisions: welcome=**Concept B "The Spotlight"** (A/C cut) · **config·thinking·train·leads-polish·invite** approved as design-source (`previews/welcome-concepts.html` · `v2-utility-screens.html` · `v2-leads-invite.html`). Covered elsewhere: agents/inbox/sequences/signup/shell/milla/notetaker/integrations/company/marketplace (already locked). `gallery`=index (no review). `onboarding`/`setup`=Casey, parked on founder voice (item 121). Mockups stay unwired until each feature is built | design source | 🤝 build per-feature |

> Other screens the founder approved are already **🟢 live** (§1): Documents, Referral, Usage, Proposals, Marketplace, Settings, Messages, Partner Hub, What's New, Templates, MCP Connect, Developer API — design-walked + approved 12–13 Jun, no change needed. Milla full chat page approved 13 Jun (live, item 2).

## 2C — 📦 POST-19 — Release-wave PRs (R1–R20) · ✅ founder-approved 13 Jun · merge after the 19th
*(All coded + build-verified; founder reviewed the plain-English summary of each and approved the wave. Each merges post-19.)*
| # | State | Item | Where it waits | Owner |
|---|-------|------|----------------|-------|
| 60 | 🟣 | **R1 demo-bounce guard** — stops emailing fake demo addresses that hard-bounce (protects sender reputation) | PR #506 | 🧍 merge |
| 61 | 🟣 | **R2 daily client brief** — Settings "Daily brief" toggle now server-backed (opt-outs respected) | PR #507 | 🧍 merge |
| 62 | 🟣 | **R3 Vida in-portal help bubble** — floating "ask Vida" for how-to questions | PR #508 | 🧍 merge |
| 63 | 🟣 | **R4 speed-to-lead** — hot Vida visitor → scored pipeline lead + Denise draft | PR #509 | 🧍 merge |
| 64 | 🟣 | **R5 milestone LinkedIn cards + partner badge** — free share-to-grow loops | PR #510 | 🧍 merge |
| 65 | 🟣 | **R6 onboarding day-0/3/7 emails** for paid clients (cron currently skips them) | PR #511 | 🧍 merge |
| 66 | 🟣 | **R7 Unibox "Help me reply"** — real Claude draft from the actual message | PR #512 | 🧍 merge |
| 67 | 🟣 | **R8 saved views** for the leads table (named filter combos) | PR #513 | 🧍 merge |
| 68 | 🟣 | **R9 "Why FIGSY wrote this"** transparency card | PR #514 | 🧍 merge |
| 69 | 🟣 | **R10 Goals** — KPI targets + live progress bars | PR #515 | 🧍 merge |
| 70 | 🟣 | **R11 sequence-template library** by use-case (one-click copy) | PR #516 | 🧍 merge |
| 71 | 🟣 | **R12 embeddable lead-capture forms** → scored pipeline (spam-protected) | PR #517 | 🧍 merge |
| 72 | 🟣 | **R13 Cmd+K upgrade** — quick actions + fixed Inbox link | PR #518 | 🧍 merge |
| 73 | 🟣 | **R14 Meeting-Prep** — Denise pre-call brief on hot replies | PR #519 | 🧍 merge |
| 74 | 🟣 | **R15 Train-FIGSY knowledge backend** — lights up the Knowledge page (was silently 404ing) | PR #520 | 🧍 merge |
| 75 | 🟣 | **R16 internal evals harness** — per-step reply rates + subject-variant performance | PR #521 | 🧍 merge |
| 76 | 🟣 | **R17 spam-score pre-send check** — colour-coded deliverability flag on each draft | PR #522 | 🧍 merge |
| 77 | 🟣 | **R18 multi-model toggle** — Fast (Haiku) / Smart (Sonnet) per campaign | PR #523 | 🧍 merge |
| 78 | 🟣 | **R19 in-product "What's New" feed** — anti-churn changelog | PR #524 | 🧍 merge |
| 79 | 🟣 | **R20 job-change alerts** on leads — "reconnect" badge | PR #525 | 🧍 merge |

> **⚠️ Merge order note:** several R-wave PRs touch the same files as later work; merge in R-number order post-19 and re-run type-check after each (a few may need a trivial rebase — they were branched off `main` on 11 Jun).

---

# ░ SECTION 3 — 🟡 BUILT, PENDING REVIEW (code-complete · NOT yet approved · needs founder sign-off) ░

> Built and build-verified, but **not yet walked/approved one-by-one**. Each earns 🟣 when reviewed + approved
> (log in `STAGING-REVIEW.md`), then 🟢 when live. **None ship Monday; all are post-19.**
>
> **📍 Status 13 Jun — the screen walk is DONE.** Every reviewable *screen* (§3B) has been walked → 🟣 (see §2B). The
> yellows that remain are **parked by choice, not pending review**: §3A = the 20 R-wave PRs (founder: "skip for now",
> revisit as a batch); §3C = 4 key-gated features (dormant until a key/Meta approval). Nothing here needs a design call.

## 3A — Release-wave PRs (R1–R20)
> ✅ **ALL 20 APPROVED 13 Jun → 🟣 (now in §2C).** Founder reviewed the plain-English summary of each and approved the whole wave to merge post-19. Nothing left pending here.

## 3B — Staging screens + shell awaiting review
> ✅ **ALL CLEARED 13 Jun → 🟣 (now in §2B).** Walked this session: 82 Sequence Builder (recolor built) · 84 Signup+SSO · 87 Status bar · 88 Activity feed · 89 Notification centre · 90 Deliverability · 91 PWA icons · 92 audit batch · 93 marketing pages · 99 v2 mockups. Nothing left pending here.

## 3C — Wired but dormant (need a key / approval to switch on)
| # | 🟡 | Item | Where it waits | Owner |
|---|----|------|----------------|-------|
| 94 | 🟡 | PDL 2nd lead-discovery source (code wired, dormant) | needs `PDL_API_KEY` | 🧍 |
| 95 | 🟡 | Hunter waterfall enrichment (code wired, dormant) | needs `HUNTER_API_KEY` | 🧍 |
| 96 | 🟡 | Voice (Vapi) + WhatsApp (code wired) | keys + Meta approval | 🧍 |
| 97 | 🟡 | A/B subject-testing backend #43 (winner-check cron + variants — UI = 🔴 §4) | works, invisible until UI | 🤖 |

---

# ░ SECTION 4 — 🔴 NOT BUILT (future, in build order) ░

## 4A — Launch week (now → Fri 19, NOT code — founder runway)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 100 | 🔴 | Smoke Test 2 — T3 pause · T4 booking · T5 billing · T6 Vida · T7 Milla · T9 invites · T10 partner | 🤝 |
| 101 | 🔴 | **D9 deliverability 10/10** (mail-tester) | 🧍 |
| 102 | 🔴 | Legal pack #10–14 (ICO £40 · SR01 · registered office · WHOIS · LinkedIn lockdown) | 🧍 |
| 103 | ✅ | Email `partners@apollo.io` — API reseller agreement (~1 wk lead) — **✅ SENT 14 Jun (awaiting reply)** | 🧍 |
| 104 | 🔴 | Hunter.io signup → key · PDL free signup → key | 🧍 |
| 105 | 🔴 | Go/No-Go gate Thu 18 → **🚀 LAUNCH Africa-only Fri 19 (#18)** | 🤝 |

## 4B — Company Engine completion (post-19 unless the demo needs it)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 106 | 🔴 | Invite **email delivery** (today the link is copy-paste — works for Monday) | 🤖 |
| 107 | 🔴 | Owner **drill-down** into a rep's pipeline/inbox | 🤖 |
| 108 | 🔴 | Edit rep budget directly · deactivate/remove a rep (offboarding) | 🤖 |
| 109 | 🔴 | Manager role fully wired · notifications (owner↔rep) | 🤖 |
| 110 | 🔴 | Per-rep lead ownership/routing + CRM dedup (#88-38) | 🤖 |
| 111 | 🔴 | Per-rep / multi-provider calendars (#88-41, V2-13) | 🤖 |

## 4C — Post-19 near-term build queue (ungated, buildable on founder go)
| # | 🔴 | Item | Owner | 🎨 Preview |
|---|----|------|-------|-----------|
| 112 | 🔴 | **Alta-style inbox rebuild** — Gmail-style multi-channel Unibox. **✅ DESIGN APPROVED 13 Jun** ("i approved the new look") · **must be PURPLE/brand** (founder 13 Jun). Build to [inbox-v2.html](./previews/inbox-v2.html): 5 cols (channel rail · labels+tags · conversation list · thread+FIGSY-draft composer · context card w/ ICP-fit + "FIGSY says"). **The big remaining build** — rewires the live 649-line `/dashboard/inbox` (real `Reply` model, classifications, endpoints) into the new shell; do as a dedicated, verified build (post-19). | 🤖 | 🔒 **APPROVED** → [inbox-v2.html](./previews/inbox-v2.html) |
| 113 | 🔴 | A/B subject testing **UI** #43 (backend ready, §3C item 97) | 🤖  |  |
| 113a | 🟣 | **Agent side-panel = conversational, acts-in-place — BUILT 13 Jun** 🔒 spec locked + prototype approved (`agent-panel-conversational.html`). Founder rule: *every agent does what FIGSY does — conversational in the right rail, input renders in-place + takes action, no navigate-away.* **DONE for FIGSY · Milla · Vida · Denise:** **(1) right agent/panel/screen** = `AgentColumn.tsx` route picker ✓. **(2) conversational in-panel** = `AgentSidePanel` generalized with a `liveChatEndpoint` prop — non-FIGSY agents now hold a live thread instead of `router.push` (legacy `onSend` kept as fallback). **(3) reply renders in place** ✓. **Endpoints (stateless `{message,history}`→`{data:{reply}}`):** Milla `/milla/chat` (new, Milla-sub gated) · Vida `/vida/help` (existing) · Denise `/denise/chat` (new, Denise-sub gated) · Casey `/casey/chat` (new `casey.ts`, mounted). API + portal type-check ✓. **✅ Casey now WIRED LIVE 13 Jun** — `/v2/setup` (Casey's conversational-setup home) holds a real `/casey/chat` thread (replies render in place; the 113a rule applied in Casey's own surface). Casey's panel auto-extends to the rest of onboarding when those screens ship (item 121, gated on founder voice). Portal type-check ✓. Ships post-19 with the rest. | 🤖 |  |
| 114 | 🔴 | Kanban pipeline polish #100 | 🤖  |  |
| 115 | 🔴 | Configurable agent triggers #53 (send window, weekends, reply delay — **needs backend first**) | 🤖  |  |
| 116 | 🔴 | Activity feed → Home-dashboard widget (touches core screen — design review first) | 🤝  |  |
| 117 | ⏸ | Subscribe-to-the-drop #122 (⏸ Drop content) | 🤖  |  |
| 118 | 🟡 | Site nav/footer rewire #123 (~40 pages, Demo→Watch + The Drop). *🆕 14 Jun — PARTIAL: standalone **Demo tab REMOVED from the top nav site-wide (30 pages)** + **"Live Demo" added to the Resources dropdown (25 pages)** — homepage #543, rest #545, merged to `main`. Still pending: add **Watch** + **The Drop** into the nav/footer across the set.* | 🤖  |  |
| 162 | 🔴 | **Prompt Library** (website, under **Resources**) — *planned 13 Jun (founder ref: ClickUp/Anthropic-style prompt gallery)*. A searchable, filterable gallery of ready-made prompts that unlock more from the K.I.N.D agents (esp. **Milla** + **FIGSY**). **Plan:** ① static page `apps/website/prompt-library.html` linked under the **Resources** nav dropdown · ② header + "Request a prompt" CTA · ③ **Department** filter (Sales · Legal · Ops · CS · All teams) + **Category** filter + search · ④ prompt cards (title · one-line desc · department tag · **Copy**) · ⑤ later: "Use this prompt" deep-link into the portal → opens Milla's panel pre-filled (ties to 113a). Seed ~12–16 prompts (e.g. "Draft a LinkedIn connection request", "Identify contract deviations", "Research a buyer persona", "A/B test plan"). Build post-launch. **⭐ This is THE big multi-item Resource (founder 13 Jun) — while The Drop + video stay consolidated to one each, the Prompt Library is where "lots" lives; seed it richly.** | 🤖 |  |
| 163 | 🔴 | **Product Videos hero refinement** (website Watch page, item 93) — *planned 13 Jun (founder ref image)*. Upgrade the `product-videos.html` hero to a **dotted-grid background + soft multi-colour pastel gradient wash** with a **"▶ Product Videos" pill badge** + centred subhead ("Explore our library of demos and feature deep dives…"). Apply when item 93 (PR #503) is merged/iterated — currently on branch `claude/marketing-drops`, not this branch. Pairs with the Resources nav build (118). **⏸️ HOLD with the rest of the Watch/Product-Video page (founder 13 Jun: don't build the product video yet).** | 🤖 |  |
| 164 | 🔴 | **Social footer links** (X · LinkedIn · Instagram · YouTube icons in the site footer) — *planned 13 Jun (founder ref image)*. Build the markup + icons now, **but HELD from go-live until each profile is genuinely populated** (🔒 **CREDIBILITY RULE**, see master: empty/half-full socials lose trust). Flip live only when every linked channel has real content. | 🤝 build now · founder populates → then live |
| 165 | 🟡 | **Visitor Intelligence — tracking snippet** (admin `/visitors`, ties to #76) — *✅ snippet INSTALLED on all 40 website pages 13 Jun* → **visits + intent scoring live now** (no provider needed). **Company de-anonymisation DEFERRED post-launch** (founder 13 Jun: Clearbit/Breeze not accepting signups). When live: pick an IP→company provider (**IPinfo** easiest · Snitcher/Dealfront better B2B data · ⚠️ thin Africa coverage), set its key in Railway, swap the one lookup in `tracking.ts`. Snippet on-site never changes. | 🧍 pick provider post-launch · 🤖 swap lookup |
| 119 | ⏸ | Revenue Mission Control #115 (3-col live ops — ⏸ confirm direction, ~3–4 days) | 🤝  |  |
| 120 | ⏸ | FIGSY Memory v2 / pgvector #46 (⏸ 🧍 flips pgvector switch, 2 min) | 🤝  |  |
| 121 | ⏸ | Casey conversational onboarding V2-3/10 (⏸ founder voice/tone input — highest-value V2 build) | 🤝  |  |
| 122 | 🔴 | Y16 — kill dead Vercel↔GitHub integration | 🧍  |  |
| 123 | 🔴 | Y12 failover parity check · Y13 D&O + trademarks · Y14 demo-seed isolation | 🤝  |  |
| 124 | 🔴 | Integration tests on money/credit paths (Y15, week-1 post-launch) | 🤖  |  |
| 125 | 🟣 | **"Your AI Family" card redesign — BUILT 13 Jun** to [agents-v2.html](./previews/agents-v2.html): feature text moved **off** the photo, square crop fixed, body checklist + clean CTA; **renamed "AI Team"→"AI Family"** (`agents/page.tsx` heading+cards, `Sidebar.tsx` dropdown label; `cmo.ts` already clean). Portal type-check ✓. Ships post-19 | 🤖 | ✅ built |
| 126 | ⏸ | Social login go-live (⏸ Google/Microsoft OAuth registration) | 🧍  |  |

## 4D — Week 1 post-launch (Jun 19–28) — GTM
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 127 | 🔴 | 10 warm outreach (#19) · LinkedIn 1/day (#20) · PhantomBuster activation (#21) | 🧍 |
| 128 | 🔴 | Meta/WhatsApp API application (#22) | 🧍 |
| 129 | 🔴 | Record real product demo 16:9+9:16 (#23) + Drop 01 video + 3 onboarding Looms (#31) | 🧍 |
| 130 | ⏸ | Homepage hero = real product loop (#24, ⏸ on #23) · proof block real data (#33) | 🤖 |
| 131 | 🔴 | GTM funnel instrumentation (#25) | 🤝 |
| 132 | 🔴 | Dogfood self-outreach (#26) · fresh-signup check (#28) | 🧍 |

## 4E — Weeks 2–4 (Jun 29 – Jul 19)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 133 | 🔴 | 2 design-partner slots → case study + logo (#29) | 🧍 |
| 134 | 🔴 | 9:16 social cuts (#30) · YouTube channel (#35) | 🤝 |
| 135 | 🔴 | Onboarding v2 emails (#32) · playbook email form (#36) | 🤖 |
| 136 | 🔴 | Flutterwave activation (#34) | 🧍 |
| 136a | 🔴 | ⭐ **IMPORTANT** — **Client invoicing — surface Stripe receipts in-portal.** 🔒 **DECISION LOCKED 13 Jun: USD billing · NO VAT until we hit a financial benchmark · Stripe issues the receipt, we only pull & display it.** (Until the benchmark, Stripe shows no VAT line; when we register, Stripe adds VAT automatically — no code change our side.) **We build:** an *Invoices* surface under **Company → Documents** that pulls the client's Stripe invoices via API (`invoices.list`) and lists date / number / amount (USD) / status with a **Download PDF** link to Stripe's hosted PDF (`invoice_pdf` / `hosted_invoice_url`). 🔒 design approved → `previews/invoice-v1.html` (document target) + `previews/invoices-list.html` (in-portal list). | 🤖 |
| 137 | 🔴 | 90-day performance guarantee (#61a/g) · Revenue Playbook call (#62b) · homepage outcome numbers (#62c) | 🤖 |
| 138 | 🔴 | Influencer/community distribution (#61e) | 🧍 |

## 4F — Month 2 (gated 10+ clients) — Intelligence layer
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 139 | 🔴 | Intent signals #37 · A/B→contextual bandit #38 · morning-brief #39 · ICP auto-refinement L2 #40 · conditional branching #41 | 🤖 |
| 140 | 🔴 | Waterfall enrichment live #42 · adaptive send volume #45 · Milla CRM pull #47 · inbox rotation/multi-domain #53 (needs warmed domains) | 🤝 |
| 141 | 🔴 | **Context-backed MCP server #59** (client-context-backed, not thin wrappers) | 🤖 |
| 142 | 🔴 | Product Hunt #49 · G2 listing #50 | 🧍 |
| 143 | 🔴 | **The Learning Engine** (build order: ①Train-FIGSY RAG → ③evals → ②outcome feedback loop → bandit → ④recall/memory → ⑤model routing → fine-tuning LAST) — full blueprint in `V2-TRACKER.md` | 🤖 |

## 4G — Month 3 (gated margin data) — the agent family
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 144 | 🔴 | **DENISE deep build #54** (auto-book · notetaker · objections · proposal-from-transcript · Vapi voice) | 🤖 |
| 145 | 🔴 | **LENA — CS agent #55** · **TONY — Ops agent #56** | 🤖 |
| 146 | 🔴 | Multi-agent orchestration #57 · 500+ skill library #58 | 🤖 |
| 147 | 🔴 | Outcome pricing per meeting #60 (gated ≥28% margin) | 🤝 |
| 148 | 🔴 | Mobile app #61 · built-in CRM Kanban #62 · pan-African design partners #63 | 🤝 |
| 149 | 🔴 | Proposal e-sign #69 · Zoom notetaker #70 | 🤖 |

## 4H — Year 2 — enterprise + moat
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 150 | 🔴 | Cross-client intelligence L4 #64 · data-licensing marketplace #65 · ICP L3 #66 · pipeline forecasting #67 · in-portal messaging #68 | 🤖 |
| 151 | 🔴 | ISO 27001/42001 · SOC 2 · Vanta (#71–74) | 🤝 |
| 152 | 🔴 | 3-type memory #75 · visitor de-anon #76 · churn scoring #77 · revenue forecasting #78 · call intelligence #79 | 🤖 |

## 4I — The 15 Pieces (UX/platform, post-20-clients — remaining unbuilt)
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
*This inventory is the single complete list (165 stable-ID items). 🟢 = live + checked · 🟣 = approved + locked, waiting to ship · 🟡 = built, needs founder review · 🔴 = future, in order. Numbers are stable IDs, not sequence. Nothing ships until the founder merges.*
