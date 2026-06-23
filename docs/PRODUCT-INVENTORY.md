# 📋 K.I.N.D — COMPLETE PRODUCT INVENTORY (THE single list)

## 📊 STATUS AT A GLANCE — the whole board by colour
*(Counts of the status dots across this doc — **recounted & reconciled 22 Jun**: the table below ties exactly to a `| dot |` count across both table formats. Recount at each verification walk. ~205 dotted rows incl. R-wave + suffixed IDs; items 1–54 are the verified-live core.)*

| 🟢 Live + verified | 🩷 Live, not yet walked | 🟣 Approved, not shipped | 🟡 Built, pending review | 🔴 Not built (the roadmap) | ⏸ Blocked |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **57** | **66** | **6** | **10** | **81** | **7** |

**How to read it:** the **56 🟢** are the proven core, live + verified. The **59 🩷** are shipped but *not yet walked* (incl. 194 — cold content hardened, pending a live re-test; + 182/185/190 deployed 22 Jun) — the **verification walk (Blocks 2/3)** converts most → 🟢. The **81 🔴** are the **forward roadmap** (incl. the 6 steal-sourced items 205–210), gated by client-count milestones. *(22 Jun late: 5 builds MERGED → 🩷 live (pending walk) — 112/113/114/136a/178; the 140 waterfall part also merged #681.)* The ladder is **🔴 → 🟡 → 🟣 → 🩷 → 🟢**. *(Counts live only in the table above — this line describes, it does not re-tally.)*


> **AUTHORITY (operating system — see root `CLAUDE.md`):** this is the ONLY home for product **status** (one dot + one owner per item). Not a task list. For daily execution → `LAUNCH-PAD.md`; for strategy/decisions/history → `KIND-MASTER.md`; for future detail → `V2-TRACKER.md`. **Nothing is 🟢 unless verified live in production** (live-but-unwalked = 🩷). **🟣 = founder approved it on the PREVIEW site, not yet live** (RULEBOOK §11 — client-facing work is previewed before it ships).

> **This is the ONE inventory. Every item lives here with one status dot and one owner.**
> If something is built anywhere (main, staging, a branch), it is in this doc. `V2-TRACKER.md` holds
> only FUTURE detail (roadmap rationale, learning engine, steals); anything it mentions as built points back here.
>
> **Status dots — FIVE states (🩷 pink added 15 Jun).** The ladder: **🔴 → 🟡 → 🟣 → 🩷 → 🟢.**
> - 🟢 **LIVE + VERIFIED** — in production AND walked/confirmed working with real data. The terminal "done" state.
> - 🩷 **LIVE, PENDING VERIFICATION** — shipped to production but NOT yet walked/verified (e.g. the Mon-15 #502 superset items). Earns 🟢 once the feature-verification walk (LAUNCH-PAD §13, Wed 17/Thu 18) confirms real data; drops to 🔴 if found broken.
> - 🟣 **APPROVED + LOCKED** — built, founder design-signed-off, pushed. Design FINAL but **NOT yet shipped/live** (waiting on the launch plan).
> - 🟡 **BUILT, PENDING REVIEW** — code-complete on staging/branch/PR, but NOT yet approved. Needs founder review/sign-off (or a key/migration).
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
| 25 | Credit bundles (Lead Gen $1 · FIGSY $3 · 20/40/100) | 🟡 | ⚠ price tables disagree → item 168 |
| 26 | Agent subscriptions (Vida $29 · Milla $49 · Denise — $39 repricing = 🟡 §2A item 58) | 🟢 | — |
| 27 | Credit system + atomic ledger | 🟡 | ⚠ lead-gen pool atomic; FIGSY pool NOT → item 170 |
| 28 | Usage tracking per client | 🟢 | — |

### 💳 BILLING CORRECTNESS — Tue 16, PRE-CLIENT BLOCKERS (audit 14 Jun, verified vs live code · full detail in `MORNING-FIXLOG.md` → 💳 BILLING CORRECTNESS · gates Fri-19 launch)
**§3 design SIGNED OFF (Jacques 14 Jun): one lead = one charge = one wallet, via explicit `clients.plan` (`lead_gen`|`figsy`). Lead-Gen → $1 lead-gen pool. FIGSY → $3 FIGSY pool, lead included, lead-gen pool untouched. Outreach enrollment stops charging.**
| # | Item | Status | Owner |
|---|------|--------|-------|
| 166 | **FIGSY double-charge** — KILLED: delivery charges one wallet by `clients.plan`; FIGSY charged once at enrollment ($3, not $4). *LIVE on prod (merged #580 + migration applied staging+prod); self-certifies → 🟢 on the next real FIGSY delivery.* | 🩷 | 🤝 |
| 167 | **FIGSY-only bundle can deliver** — FIXED: delivery + drip cap by the plan's pool. *LIVE (#580 + migration); pending next-delivery cert.* | 🩷 | — |
| 168 | **3 price tables reconciled** — code derives from `@kind/shared`; 6 Stripe Prices + 15 env vars set + FIGSY products renamed to 20/40/100 credits. *LIVE.* | 🩷 | — |
| 169 | **`clients.plan` flag** — migration + backfill applied staging+prod (3 figsy / 5 lead_gen verified). *LIVE.* | 🩷 | — |
| 170 | **Atomic FIGSY credit RPC** — `increment_figsy_credits` live (verified present in prod). *LIVE.* | 🩷 | — |
| 171 | **"How credits work" panel honesty** — fixed false "Outreach sent — No credit used" → "FIGSY outreach — 1 FIGSY credit". *LIVE.* | 🩷 | — |
| 172 | **Multi-currency** (founder ask 14 Jun) — let client pick USD/GBP/ZAR; Stripe multi-currency Prices + `clients.preferred_currency`; reconcile with Flutterwave (`flutterwave.ts:146-160`); may be own phase, don't block 166–171 | 🔴 | 🤝 |
| 173 | **Admin FIGSY visibility** — admin shows `credit_balance` only, never `figsy_credits_remaining`; surface it + add top-up | 🔴 | 🤖 |

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

# ░ SECTION 2 — 🟣 APPROVED + LOCKED · 🩷 SHIPPED-PENDING-VERIFICATION (mixed, updated 15 Jun) ░

> The founder has walked and approved these. Design will NOT change.
> **⚠️ 15 Jun:** the #502 superset SHIPPED most of this LIVE — so **2A (Command Centre), 2B (design screens) and 2C (R1–R20) are now 🩷 pink** (live, pending the Wed/Thu verification walk → then 🟢). Items still genuinely on a branch / not shipped stay 🟣. Where a row shows a 🟡 execution note, that's build/config left — not the design (the design is locked).

## 2A — 🚀 MONDAY 15 SHIP — Company Payment Command Centre (the ONLY early production ship)
*(One product: Command Centre + per-rep seats/agent-unlock + its payment system. Layout approved 12 Jun.)*
| # | State | Item | Execution left before Monday | Owner |
|---|-------|------|------------------------------|-------|
| 55 | 🟢 | **Command Centre** (#88) — per-rep workspaces · owner-funded pools · per-seat budgets · request→approve/deny · invite→accept→own workspace · winning-plays library · real per-rep stats | ✅ **LIVE on prod 15 Jun** — merged via #564, prod migrations applied (010·011·012·013·20260603·20260612·companion), portal loads, credits/activity/agent-panel verified. (Walk `/dashboard/company` to confirm command-centre panels before calling the rep-flow fully done.) | — |
| 55a | 🔴 | **⚠️ RLS + Access Control for Company Engine — FAST-FOLLOW (not a launch blocker; founder's call 15 Jun: ship live today, add RLS later)** — owner ONLY sees command centre + all-reps data · reps see ONLY own data (own leads, own campaigns, own calendar) · reps cannot see each other or the command centre. Reps get low-credit notifications & can request top-up, owner approves/denies. **Company Engine SHIPS LIVE Mon 15** without this. **Interim:** until RLS lands, the owner controls who logs in — reps added before RLS would see more than their own data, so the founder gates rep access manually. Build soon after launch. | Design + build RLS policies (row-level security in Supabase) + role/ownership flags + visibility toggles in UI + approval workflow for credit requests. | 🤖 design · 🧍 review |
| 56 | 🟢 | **Per-rep agent unlock** (owner toggles Milla/Vida/Denise per rep → rolled-up bill) — Seats tab | ✅ **Test 7 PASSED (walk, 18 Jun):** invited a rep → invite link generated + 5,000cr per-seat budget applied; toggled **Milla $49 · Vida $29 · Denise $39** ON → **rolled-up company bill computed correctly: +$117/mo** (invite-pending, so no charge fired). | — |
| 57 | 🟡 | **Payment system — Stripe → company pool billing** (owner pays → pools funded) | 🤖 **building now** — single pool first, two-pool next; then 🧍 creates pool-topup products | 🤖 then 🧍 |
| 58 | 🩷 | **Denise $39 Stripe price** (billing prerequisite) | **Founder confirmed 19 Jun: Denise = $39** (code/site/Stripe-lib all $39). 🧍 verify the live `STRIPE_PRICE_DENISE_MONTHLY` env points to the $39 price object at next checkout → then 🟢. *(Product pricing is USD; the £ comp/P&L figures are a separate layer — see 203.)* | 🧍 |
| 59 | 🟡 | Admin "Company demo" provisioning | Create one in admin → open `/dashboard/company` populated | 🧍 |

> **🔒 Monday rule:** the ONLY thing exposed to production Monday is `company`. Rows 57–59 are finishing build/config on the approved product — nothing in §3/§4 is enabled. **⚠️ NOTE: Item 55a (RLS access control) is a FAST-FOLLOW, not a Monday blocker** — founder's call 15 Jun: ship the Company Engine LIVE today, add RLS soon after. Until RLS lands, the owner controls rep access manually (a rep added pre-RLS could see beyond their own data), so the founder gates who logs in during the interim.

## 2B — 🩷 SHIPPED EARLY 15 Jun (via #502/#564) — design-approved screens now LIVE, pending verification
> **⚠️ STATE CHANGE 15 Jun:** opening box **#502** brought these screens live — they're **linked in the merged Sidebar** and the flag is `NEXT_PUBLIC_FEATURE_V2_SCREENS=all`, so they're **reachable in prod now** (not the "orphan URLs" first reported — that was an under-check of the Sidebar). They're all **founder-approved** designs, so this is early progress, not a regression. Status: **🩷 pink — live-but-unverified.** Each is 🩷 until the Wed/Thu walk (LAUNCH-PAD §13) confirms real (not placeholder) data, then → 🟢 (or → 🔴 if broken). **No client risk** (no live clients). Known to verify: What's New (needs real entries), Notetaker/Integrations (may be UI shells). *(84 SSO is 🩷-live but its buttons need OAuth registration to function; 92 already 🟢; 93/98/99 stay as-is — website/reference/design-source, not #502 screens.)*
| # | State | Item | Where it waits | Owner |
|---|-------|------|----------------|-------|
| 80 | 🩷 | **Teams Hub** (`/dashboard/team`) — *✅ approved 12 Jun · co-located in rail* | staging | 🧍 ship post-19 |
| 81 | 🩷 | **AI Notetaker** (`/dashboard/notetaker`) — *✅ approved as-is 12 Jun* | staging | 🧍 ship post-19 |
| 83 | 🩷 | **Integrations Hub** (`/dashboard/integrations`) — *✅ approved as-is (Connect group)* | staging | 🧍 ship post-19 |
| 85 | 🩷 | **Shell — nav redesign** (slim work-only rail + agent switcher) — *✅ founder approved 12 Jun* | staging → merges post-19 | 🤝 |
| 86 | 🩷 | **Shell — profile dropdown → grouped account hub** — *✅ founder approved* | staging | 🤝 |
| 82 | 🩷 | **Visual Sequence Builder** (`/dashboard/figsy/sequence-builder`) — *🎨 design locked 12 Jun · **recolor BUILT 13 Jun** to `previews/sequence-builder-v2.html` (lilac page · dotted canvas · purple-tinted tiles · ink headings · lilac connectors · purple banner)* | branch `claude/kind-carson-MYhSl` → ship post-19 | 🧍 ship post-19 |
| 88 | 🩷 | **Activity feed** (`/dashboard/activity`, #102) — *✅ approved 13 Jun (as-is) → `previews/activity-feed-current.html`*; live workspace timeline (sends/replies/meetings), real client-scoped events, 30s poll | staging → ship post-19 | 🧍 ship post-19 |
| 89 | 🩷 | **Notification centre** (bell · #103) — *✅ approved 13 Jun (as-is) → `previews/notification-centre-current.html`*; 4 types (interested reply · consented lead · low credits · trial expiring) each with a one-tap action, red count badge, 2-min poll | staging → ship post-19 | 🧍 ship post-19 |
| 90 | 🩷 | **Deliverability dashboard** (`/dashboard/deliverability`, #48) — *✅ approved 13 Jun (as-is) → `previews/deliverability-current.html`*; health band (opt-out–derived) · warmup pacing (cap 10→50/day) · engagement metrics (open/reply/opt-outs) · 14-day volume chart · honest (no invented bounce/spam until D9) | staging → ship post-19 | 🧍 ship post-19 |
| 87 | 🩷 | **Shell — status bar** (sidebar footer, #104) — *✅ approved 13 Jun (as-is) → `previews/status-bar-current.html`*; live pulse: FIGSY state (active/idle) · today's sends vs cap (progress bar) · system health (operational/degraded); real endpoints + 60s poll, degrades silently | staging → ship post-19 | 🧍 ship post-19 |
| 84 | 🩷 | **Signup + SSO buttons** (`/v2/signup`, #R25) — *✅ approved 13 Jun (design) → `previews/signup-sso-current.html`*; Google + Microsoft OAuth buttons + email + T&C. Design locked; **go-live still needs 🧍 OAuth app registration (Google Cloud + Azure)** | staging | 🧍 register OAuth apps |
| 91 | 🩷 | **Mobile PWA icons** (#114) — *✅ approved as-is 13 Jun (gradient K + cream splash kept)*; manifest (name · shortcuts to Dashboard/Leads/FIGSY · standalone/portrait · theme #7C3AED) + icon-192/512 + maskable-512 | staging → ship post-19 | 🧍 ship post-19 |
| 92 | 🟢 | **PR #502 — 10-Jun audit batch** (Y1–Y11) — atomic credits · rate-limits · counter-drift kill · dormant PDL · portal fixes | ✅ **LIVE on prod 15 Jun** — merged via #564 (conflict-resolved integration; original #502 superseded, close it) | — |
| 98 | 🟣 | **Offline flow docs** (`CLIENT_FLOW.html` + `CLIENT_FLOW_PER_REP.html`) — *✅ reference, done & cleared 13 Jun* | reference | — |
| 93 | 🟣 | **Marketing: The Drop + Watch** (PR #503, `apps/website/the-drop.html` + `product-videos.html`) — *✅ approved 13 Jun → `previews/marketing-the-drop.html` + `marketing-product-videos.html`*; orphan pages until nav rewire (#123, item 118). Site marketing style (darker than portal) intentional. **🔑 CORRECTED 13 Jun: The Drop is a SERIES — each drop showcases 3–5 products. ✅ BUILT: `apps/website/the-drop.html` = 9 drops (newest-first 09→01), no video. Watch/Product Video page → ⏸️ HELD. Full plan in `KIND-MASTER.md` → Website Resources.** Also built this session: **162 Prompt Library** (`prompt-library.html`, 17 prompts, filter+search+copy), **Tony "Coming Soon"** added (Products dropdown 22pp · home grid · footer · About Us family story — The Order Maker), **The Drop + Prompt Library wired into Resources nav** (17pp), **Visitor tracking snippet** on all 40 pages. ⏳ **Pending: website-only deploy to `main`** (Cloudflare publishes; portal stays parked). **🆕 14 Jun — SHIPPED TO `main` (live): The Drop REVAMPED** to a bold Monday-style show/podcast layout (soft palette · hero card-cluster · filterable Topic+Industry grid · 9 episode cards wired to the existing `drop-01..09` detail pages), PR #544 · **main-page polish** (emoji→inline-SVG sweep · pricing redesign · POPIA soft-mint trust seal · cut Promise Strip + Every Team Wins), PR #542. Episode titles/summaries are drafted placeholders to swap for the real recorded episodes; no video yet (cards "Read story"). | 🤖 built · 🤝 deploy | 🤖 |
| 99 | 🟣 | **`/v2/*` design mockups — WALKED + design-source locked 13 Jun.** 🔒 Decisions: welcome=**Concept B "The Spotlight"** (A/C cut) · **config·thinking·train·leads-polish·invite** approved as design-source (`previews/welcome-concepts.html` · `v2-utility-screens.html` · `v2-leads-invite.html`). Covered elsewhere: agents/inbox/sequences/signup/shell/milla/notetaker/integrations/company/marketplace (already locked). `gallery`=index (no review). `onboarding`/`setup`=Casey, parked on founder voice (item 121). Mockups stay unwired until each feature is built | design source | 🤝 build per-feature |

> Other screens the founder approved are already **🟢 live** (§1): Documents, Referral, Usage, Proposals, Marketplace, Settings, Messages, Partner Hub, What's New, Templates, MCP Connect, Developer API — design-walked + approved 12–13 Jun, no change needed. Milla full chat page approved 13 Jun (live, item 2).

## 2C — 🩷 R1–R20 LIVE, PENDING VERIFICATION via #502 (discovered 15 Jun) — PRs #506–#525 are REDUNDANT → close
> **⚠️ MAJOR STATE CHANGE 15 Jun:** #502's dev branch (`claude/kind-carson-MYhSl`, 213 commits) was a **superset** — it already contained all 20 R-wave features. So merging #502 (#564) shipped **R1–R20 code LIVE on `main`** (verified by grep: VidaHelpBubble, MilestoneCelebration, CommandPalette, speed-to-lead, why-email, evals, spam-check, model-toggle, job-change, templates, whats-new, … all present). **The 20 PRs #506–#525 are therefore redundant — CLOSE them, do NOT merge** (their code is already live; merging = conflicts/no-ops).
> **🗄️ 3 owed migrations — ✅ RUN ON PROD 15 Jun** (R2 `clients.daily_brief_enabled` · R15 `figsy_knowledge` · R20 `leads.job_changed_at`+`previous_company`). All R1–R20 now have full schema on prod.
> **Status:** each R-item is **🩷 pink — LIVE via #502, pending the Wed/Thu feature-verification walk** (LAUNCH-PAD §13). The walk confirms real data → 🟢, or drops it → 🔴 if broken. PRs #506–#525 = redundant, close.
| # | State | Item | Where it waits | Owner |
|---|-------|------|----------------|-------|
| 60 | 🩷 | **R1 demo-bounce guard** — stops emailing fake demo addresses that hard-bounce (protects sender reputation) | live via #502 · verify | 🤝 walk |
| 61 | 🩷 | **R2 daily client brief** — Settings "Daily brief" toggle now server-backed (opt-outs respected) | live via #502 · verify | 🤝 walk |
| 62 | 🩷 | **R3 Vida in-portal help bubble** — floating "ask Vida" for how-to questions | live via #502 · verify | 🤝 walk |
| 63 | 🩷 | **R4 speed-to-lead** — hot Vida visitor → scored pipeline lead + Denise draft | live via #502 · verify | 🤝 walk |
| 64 | 🩷 | **R5 milestone LinkedIn cards + partner badge** — free share-to-grow loops | live via #502 · verify | 🤝 walk |
| 65 | 🩷 | **R6 onboarding day-0/3/7 emails** for paid clients (cron currently skips them) | live via #502 · verify | 🤝 walk |
| 66 | 🩷 | **R7 Unibox "Help me reply"** — real Claude draft from the actual message | live via #502 · verify | 🤝 walk |
| 67 | 🩷 | **R8 saved views** for the leads table (named filter combos) | live via #502 · verify | 🤝 walk |
| 68 | 🩷 | **R9 "Why FIGSY wrote this"** transparency card | live via #502 · verify | 🤝 walk |
| 69 | 🩷 | **R10 Goals** — KPI targets + live progress bars | live via #502 · verify | 🤝 walk |
| 70 | 🩷 | **R11 sequence-template library** by use-case (one-click copy) | live via #502 · verify | 🤝 walk |
| 71 | 🩷 | **R12 embeddable lead-capture forms** → scored pipeline (spam-protected) | live via #502 · verify | 🤝 walk |
| 72 | 🩷 | **R13 Cmd+K upgrade** — quick actions + fixed Inbox link | live via #502 · verify | 🤝 walk |
| 73 | 🩷 | **R14 Meeting-Prep** — Denise pre-call brief on hot replies | live via #502 · verify | 🤝 walk |
| 74 | 🩷 | **R15 Train-FIGSY knowledge backend** — lights up the Knowledge page (was silently 404ing) | live via #502 · verify | 🤝 walk |
| 75 | 🩷 | **R16 internal evals harness** — per-step reply rates + subject-variant performance | live via #502 · verify | 🤝 walk |
| 76 | 🩷 | **R17 spam-score pre-send check** — colour-coded deliverability flag on each draft | live via #502 · verify | 🤝 walk |
| 77 | 🩷 | **R18 multi-model toggle** — Fast (Haiku) / Smart (Sonnet) per campaign | live via #502 · verify | 🤝 walk |
| 78 | 🩷 | **R19 in-product "What's New" feed** — anti-churn changelog | live via #502 · verify | 🤝 walk |
| 79 | 🩷 | **R20 job-change alerts** on leads — "reconnect" badge | live via #502 · verify | 🤝 walk |

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
| 94 | 🩷 | PDL 2nd lead-discovery source — **🩷 LIVE 22 Jun (key confirmed + #681 parallel-waterfall merged)**; 🧍 verify on an ICP run → 🟢 | 🧍 |
| 95 | 🩷 | Hunter waterfall enrichment — **🩷 LIVE 22 Jun (key confirmed + #681 auto-enrich merged)**; 🧍 verify (a no-email lead gets one) → 🟢 | 🧍 |
| 96 | 🟡 | Voice (Vapi) + WhatsApp (code wired) | keys + Meta approval | 🧍 |
| 97 | 🟡 | A/B subject-testing backend #43 (winner-check cron + variants — UI = 🔴 §4) | works, invisible until UI | 🤖 |

---

# ░ SECTION 4 — 🔴 NOT BUILT (future, in build order) ░

## 4A — Launch week (now → Fri 19, NOT code — founder runway)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 100 | 🔴 | Smoke Test 2 — T3 pause · T4 booking · T5 billing · T6 Vida · T7 Milla · T9 invites · T10 partner | 🤝 |
| 101 | 🔴 | **D9 deliverability 10/10** (mail-tester) — ⚠️ **active placement regression, see 194** (cold mail → Newsletter). | 🧍 |
| 102 | 🔴 | Legal pack #10–14 — **#10 ICO ✅ · #14 LinkedIn ✅**; **#11 SR01 · #12 registered office · #13 WHOIS → MOVED TO POST-DELIVERY** (post-launch, founder call 16 Jun) — **no longer a pre-19 gate** | 🧍 |
| 103 | ⏸ | Email `partners@apollo.io` — API reseller agreement — sent 14 Jun · **Apollo replied 15 Jun (overlap review) · founder responded 16 Jun → ⏸ awaiting Apollo's decision** *(was a stray ✅; ⏸ = blocked on external party)* | 🧍 |
| 104 | 🟢 | Hunter.io + PDL keys — **✅ CONFIRMED SET IN RAILWAY 22 Jun** (founder). Activates 94/95/140. | 🧍 |
| 105 | 🔴 | Go/No-Go gate Thu 18 → **🚀 LAUNCH Africa-only Fri 19 (#18)** | 🤝 |

## 4B — Company Engine completion (post-19 unless the demo needs it)
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 106 | 🩷 | Invite **email delivery** (today the link is copy-paste — works for Monday) | 🤖 |
| 107 | 🩷 | Owner **drill-down** into a rep's pipeline/inbox | 🤖 |
| 108 | 🩷 | Edit rep budget directly · deactivate/remove a rep (offboarding) | 🤖 |
| 109 | 🩷 | Manager role fully wired · notifications (owner↔rep) | 🤖 |
| 110 | 🩷 | Per-rep lead ownership/routing + CRM dedup (#88-38) | 🤖 |
| 111 | 🩷 | Per-rep / multi-provider calendars (#88-41, V2-13) | 🤖 |

## 4C — Post-19 near-term build queue (ungated, buildable on founder go)
| # | 🔴 | Item | Owner | 🎨 Preview |
|---|----|------|-------|-----------|
| 112 | 🩷 | **🩷 LIVE 22 Jun (merged #685 → deploying; pending deploy-green + your walk → 🟢)** — Gmail-style Unibox at **`/dashboard/inbox`** (replaced the old page, NOT flag-gated), 5-col, brand-purple, real `figsy_replies` (honest TODOs: channel derived, ICP score "—"). **Alta-style inbox rebuild.**
| 113 | 🩷 | **🩷 LIVE 22 Jun (merged #684; pending deploy-green + walk)** — A/B Test tab on the FIGSY campaign page (variants B–E, winner banner), wired to the live 97 backend; no migration. A/B subject testing **UI** #43 | 🤖  |  |
| 113a | 🟣 | **Agent side-panel = conversational, acts-in-place — BUILT 13 Jun** 🔒 spec locked + prototype approved (`agent-panel-conversational.html`). Founder rule: *every agent does what FIGSY does — conversational in the right rail, input renders in-place + takes action, no navigate-away.* **DONE for FIGSY · Milla · Vida · Denise:** **(1) right agent/panel/screen** = `AgentColumn.tsx` route picker ✓. **(2) conversational in-panel** = `AgentSidePanel` generalized with a `liveChatEndpoint` prop — non-FIGSY agents now hold a live thread instead of `router.push` (legacy `onSend` kept as fallback). **(3) reply renders in place** ✓. **Endpoints (stateless `{message,history}`→`{data:{reply}}`):** Milla `/milla/chat` (new, Milla-sub gated) · Vida `/vida/help` (existing) · Denise `/denise/chat` (new, Denise-sub gated) · Casey `/casey/chat` (new `casey.ts`, mounted). API + portal type-check ✓. **✅ Casey now WIRED LIVE 13 Jun** — `/v2/setup` (Casey's conversational-setup home) holds a real `/casey/chat` thread (replies render in place; the 113a rule applied in Casey's own surface). Casey's panel auto-extends to the rest of onboarding when those screens ship (item 121, gated on founder voice). Portal type-check ✓. Ships post-19 with the rest. | 🤖 |  |
| 114 | 🩷 | **🩷 LIVE 22 Jun (merged #682; pending deploy-green + walk)** — Kanban pipeline polish #100 (brand-violet column ramp, count pills, density, empty states) | 🤖  |  |
| 115 | 🔴 | Configurable agent triggers #53 (send window, weekends, reply delay — **needs backend first**) | 🤖  |  |
| 116 | 🔴 | Activity feed → Home-dashboard widget (touches core screen — design review first) | 🤝  |  |
| 117 | ⏸ | Subscribe-to-the-drop #122 (⏸ Drop content) | 🤖  |  |
| 118 | 🟡 | Site nav/footer rewire #123 (~40 pages, Demo→Watch + The Drop). *🆕 14 Jun — PARTIAL: standalone **Demo tab REMOVED from the top nav site-wide (30 pages)** + **"Live Demo" added to the Resources dropdown (25 pages)** — homepage #543, rest #545, merged to `main`. Still pending: add **Watch** + **The Drop** into the nav/footer across the set.* | 🤖  |  |
| 162 | 🩷 | **Prompt Library** (website, under **Resources**) — *planned 13 Jun (founder ref: ClickUp/Anthropic-style prompt gallery)*. A searchable, filterable gallery of ready-made prompts that unlock more from the K.I.N.D agents (esp. **Milla** + **FIGSY**). **Plan:** ① static page `apps/website/prompt-library.html` linked under the **Resources** nav dropdown · ② header + "Request a prompt" CTA · ③ **Department** filter (Sales · Legal · Ops · CS · All teams) + **Category** filter + search · ④ prompt cards (title · one-line desc · department tag · **Copy**) · ⑤ later: "Use this prompt" deep-link into the portal → opens Milla's panel pre-filled (ties to 113a). Seed ~12–16 prompts (e.g. "Draft a LinkedIn connection request", "Identify contract deviations", "Research a buyer persona", "A/B test plan"). Build post-launch. **⭐ This is THE big multi-item Resource (founder 13 Jun) — while The Drop + video stay consolidated to one each, the Prompt Library is where "lots" lives; seed it richly.** | 🤖 |  |
| 163 | 🔴 | **Product Videos hero refinement** (website Watch page, item 93) — *planned 13 Jun (founder ref image)*. Upgrade the `product-videos.html` hero to a **dotted-grid background + soft multi-colour pastel gradient wash** with a **"▶ Product Videos" pill badge** + centred subhead ("Explore our library of demos and feature deep dives…"). Apply when item 93 (PR #503) is merged/iterated — currently on branch `claude/marketing-drops`, not this branch. Pairs with the Resources nav build (118). **⏸️ HOLD with the rest of the Watch/Product-Video page (founder 13 Jun: don't build the product video yet).** | 🤖 |  |
| 164 | 🔴 | **Social footer links** (X · LinkedIn · Instagram · YouTube icons in the site footer) — *planned 13 Jun (founder ref image)*. Build the markup + icons now, **but HELD from go-live until each profile is genuinely populated** (🔒 **CREDIBILITY RULE**, see master: empty/half-full socials lose trust). Flip live only when every linked channel has real content. | 🤝 build now · founder populates → then live |
| 165 | 🟡 | **Visitor Intelligence — tracking snippet** (admin `/visitors`, ties to #76) — *✅ snippet INSTALLED on all 40 website pages 13 Jun* → **visits + intent scoring live now** (no provider needed). **Company de-anonymisation DEFERRED post-launch** (founder 13 Jun: Clearbit/Breeze not accepting signups). When live: pick an IP→company provider (**IPinfo** easiest · Snitcher/Dealfront better B2B data · ⚠️ thin Africa coverage), set its key in Railway, swap the one lookup in `tracking.ts`. Snippet on-site never changes. | 🧍 pick provider post-launch · 🤖 swap lookup |
| 119 | ⏸ | Revenue Mission Control #115 (3-col live ops — ⏸ confirm direction, ~3–4 days) | 🤝  |  |
| 120 | ⏸ | FIGSY Memory v2 / pgvector #46 (⏸ 🧍 flips pgvector switch, 2 min) | 🤝  |  |
| 121 | ⏸ | Casey conversational onboarding V2-3/10 (⏸ founder voice/tone input — highest-value V2 build) | 🤝  |  |
| 122 | 🔴 | Y16 — kill dead Vercel↔GitHub integration | 🧍  |  |
| 123 | 🔴 | Y12 failover parity check · Y13 D&O + trademarks · Y14 demo-seed isolation | 🤝  |  |
| 124 | 🟡 | Money-path tests — **BUILT (Box B7, PR pending review):** pure `billing-rules.ts` (single source of which-wallet/how-much) + 4 call-sites wired to it + **13 regression tests** locking the no-double-charge invariant (type-check ✓, tests ✓). *(Smoke Test 2 manual scripts = item 100, separate.)* | 🤖  |  |
| 125 | 🟣 | **"Your AI Family" card redesign — BUILT 13 Jun** to [agents-v2.html](./previews/agents-v2.html): feature text moved **off** the photo, square crop fixed, body checklist + clean CTA; **renamed "AI Team"→"AI Family"** (`agents/page.tsx` heading+cards, `Sidebar.tsx` dropdown label; `cmo.ts` already clean). Portal type-check ✓. Ships post-19 | 🤖 | ✅ built |

### 🆕 Onboarding & Segmentation (added 15 Jun — full plan in `run-costs-and-cashflow.md` §13/§14; layers on `ONBOARDING_V2.md` #30 + Company Engine #88)
| # | 🔴 | Item | Owner | 🎨 Preview |
|---|----|------|-------|-----------|
| 174 | 🔴 | **Onboarding — website → own-firmographics read** for routing (PDL company-enrich on the signup domain; feeds 175). *Cashflow §14.* | 🤖 |  |
| 175 | 🔴 | **Onboarding — seat-based auto-routing** (1 seat = self-serve / 2+ seats = concierge track). Company size is a routing **hint**, never a hard gate. *Cashflow §14.* | 🤖 |  |
| 176 | 🔴 | **Onboarding — 14-day company trial on bundled data** (value before any Apollo/implementation ask — lets us engage + sell first). *Cashflow §14.* | 🤖 |  |
| 177 | 🔴 | **Company white-glove implementation flow** — wire CRM + connections + **optional** BYO-Apollo key (forced only if Apollo's ToS requires it; bundled-data is the default). Month-1 company hardening. *Cashflow §13/§14, gated on Apollo's reply.* | 🤝 |  |
| 178 | 🩷 | **🩷 SHELL LIVE 22 Jun (merged #683; mic shows "coming soon" until 🧍 Vapi key)** — voice affordance on `VidaHelpBubble`: mic + speaker + animated waveform + text fallback; real voice transport **guarded behind `NEXT_PUBLIC_VAPI_PUBLIC_KEY`** (🧍 add the Vapi key → it lights up). **Voice ("speak") chat widget.** Voice mode for **Vida** / the agent panel. *Founder ref 16 Jun.* | 🤖 |  |
| 126 | ⏸ | Social login go-live (⏸ Google/Microsoft OAuth registration) | 🧍  |  |

## 4C-CHURN — 🛡️ Retention / anti-churn stack (P1 — pull in as the first clients land)
*Plan of record: `docs/CHURN-PREVENTION-PLAN.md`. Thesis: acquisition is the accelerator, **retention is the brakes + steering** — at ~$80 ARPU and a churn treadmill, every saved client is worth a new-logo win without the CAC. Lena (CS, item 145) is the human/agent owner of this stack and is **elevated to a churn-defense priority** (per the salary/break-even plan). Build only once real clients exist (these need live usage data); none are launch-gating.*
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 190 | 🩷 | **Save / pause / win-back flow** — a graceful **pause** (1–3 mo hold instead of cancel: stop billing, keep data + settings warm) on the cancel path, an **at-risk trigger** (no login N days · usage drop · 0 replies in a cycle) that pings Lena, and a **win-back** nudge for lapsed accounts. **🩷 22 Jun: BUILT + MERGED (#667) + DEPLOYED (#668 green); pause migration RUN live (`20260622_subscription_pause.sql`, enum-fix #671).** `POST /subscriptions/:id/pause`+`/resume` · `GET /admin/win-back`. 🧍 verify pause returns 200 on a live sub → 🟢. *(Churn-plan lever 5.)* | 🤖 |
| 191 | 🩷 | **ROI / value dashboard ("what KIND did for you")** — a per-client surface that totals **leads delivered · meetings booked · replies · pipeline touched · $ value** over time, plus a monthly "here's your return" recap. Retention is killed by *invisible* value; make the value un-ignorable. *(Churn-plan lever 4. Builds on the analytics page — must use REAL data, see 193.)* | 🤖 |
| 192 | 🩷 | **Onboarding activation tracking + nudges** — instrument the first-value path (signup → ICP set → first campaign live → first lead/reply) as explicit **activation milestones**; if a client stalls at a step, auto-nudge (+ flag Lena). Time-to-first-value is the #1 churn predictor; today nothing tracks or rescues a stalled new client. *(Churn-plan lever 1. Verified: no activation funnel exists.)* | 🤖 |
| 193 | 🩷 | **Surface REAL open-tracking + remove the fabricated 28% — SHIPPED & LIVE 17 Jun.** #601 deleted the `emails × 0.28` guess → analytics reads real `opened_at` ("—" when tracking off, never a fake number). #610 made **Campaign Performance** read real send-log rows + added a real **Open Rate** column (so the table agrees with the cards); #609 put **Analytics** in the sidebar (it was orphaned — URL-only). 🧍 `TRACKING_URL=https://api.get-kind.com` set → the open-pixel embeds on **warm/transactional** sends. ⚠️ **UPDATE (18 Jun): the pixel is now REMOVED from COLD sends (#623)** — cold = no pixel (deliverability); open-tracking applies to warm/transactional only. See 194/198. NOTE: the warmup-test account shows "no data" because its "120 sent" is a legacy *counter* with no backing `figsy_sent_emails` rows; real sends + the seeded demo populate normally — needs a real-send confirmation. *(Found 16 Jun · shipped 17 Jun.)* | 🤝 |
| 194 | 🩷 | **Deliverability — REOPENED then DIAGNOSED (18 Jun): it's REPUTATION, not content.** Despite mail-tester **10/10**, a real test landed in **Promotions, then Spam on a 2nd fresh Gmail** — founder's instinct was right. Deeper send-path audit → root cause: the cold domain `gettingkind.com` (~9 days old) has **no Gmail sending reputation yet**; mail-tester scores the *message+auth*, not domain trust. **Content hardened anyway (#623):** near-plain `coldEmailHtml`, **tracking pixel + visible unsub footer REMOVED from cold sends** (kept List-Unsubscribe header + "Reply STOP") → reverses the earlier "pixel ON" call **for cold only**. **The real fix is reputation → split out as item 198 (warmup tool, founder action MONDAY).** 194 = content side (done, 🩷 pending a live re-test); 198 = the reputation side. | 🤝 |
| 195 | 🟢 | **FIGSY metrics — ONE source of truth + 3→2 surfaces. RESOLVED 17 Jun (pages match).** **#613:** Home card reads real send-log rows, not the drifting counter; the counter can't drift above the log again. **#614:** 3 metric surfaces → **2** (Deliverability removed → Performance; sender-health + warmup-pacing moved there; send-volume already on Analytics). **#615:** headline cards use the same head-count Performance uses. **🎯 ROOT CAUSE (audit):** the `opened_at` column (migration `20260531_email_open_tracking.sql`) was never run in prod → Analytics' query *selects* `opened_at` so the fetch errored → 0, while Performance's count survived → 120; this also blocked open-tracking from recording. 🧍 **ran the migration** → Analytics shows real data matching Performance; open-rate populates as real opens land. Debug line removed (#616). | — |
| 196 | 🔴 | **Sales/revenue LEDGER — auditable "money in", reconcilable to processors + the company's HMRC accounting platform** *(founder 17 Jun: (b) total revenue · bill in USD/client-currency, not ZAR · **ultimately cross-referenced to the HMRC accounting platform — accurate sales recording is VITAL / compliance-grade**)*. Bigger than a dashboard: KIND needs a **source-of-truth sales ledger** — one immutable row per real money-in event (sub charge · renewal · credit purchase) carrying **processor (stripe/paystack/flutterwave) + processor txn id** (for reconciliation), product, **amount + currency as charged**, a **normalised amount in the reporting currency at the txn's FX/date** (so historical figures never drift), status (paid/refunded), timestamp. None of this exists today: `credit_transactions` stores **credits not money**, `subscriptions.amount_zar` is a ZAR-only guess Stripe/Flutterwave don't even write. **Build (deliberate — real money + compliance):** ① a `payments` ledger (amount+currency+normalised+processor ref) ; ② the 3 webhooks write a ledger row on every charge; ③ admin Revenue reads the ledger (recurring + one-time · this-month + all-time); ④ backfill; ⑤ export/API connector to the accounting platform (follow-on). **🧍 OPEN DECISIONS:** which platform (Xero / QuickBooks / FreeAgent / Sage)? · **reporting currency = GBP** (UK/HMRC) or USD? · VAT-registered (needs a VAT breakdown)? | 🤝 |
| 197 | 🔴 | **Partner programme — unify "refer & earn" + "manage & earn" into ONE model** *(founder flag 17 Jun · rate LOCKED 19 Jun)*. A single model where a partner **refers AND manages** and is paid on **retention, not a one-off**: **Acquisition 20%** (one-time, new client first-month MRR) **+ Retention 5%** (recurring, active book) — no base, no expand. *(LOCKED by the 19-Jun build brief + partner calculator → supersedes the earlier "25% + 5%".)* Needs: model spec → commission calc → Partner-Hub UI + payout logic (`partners.ts`) → reconcile with the sales ledger (196). **Built concretely under item 203 (the comp engine).** | 🤝 |
| 198 | 🔴 | **Cold-email WARMUP — THE #1 PRIORITY (real fix found 23 Jun).** Root cause of Promotions/Spam (194): `gettingkind.com` is young + **never had real reputation warmup**. **🚨 KEY FINDING (mislabel corrected):** the in-app "warmup" (`FIGSY_WARMUP_START`, 9 Jun) is only a **daily send-CAP (10→50)** — earlier docs wrongly called it "warmup live"; it does **NOT** build inbox reputation. **Architecture (verified in code):** cold mail **sends AND receives via Resend** (FROM `hello@gettingkind.com`; replies via Resend inbound webhook `/figsy/replies/inbound`, MX→Resend) → **NO mailbox on the cold domain**, so a mailbox-based warmup tool (Mailreach) can't connect, and a Zoho mailbox on `gettingkind.com` would break Resend reply-capture (MX conflict). **DECISION (founder 23 Jun): use a dedicated cold-email platform — Instantly — which provisions + auto-warms its own mailboxes + sends.** Content already hardened (#623). **🧍 ACTION NOW: set up Instantly → warm ~1–2 wks → THEN campaign. Do NOT campaign hard until warmed (burns the domain).** *(Runs the founder's outreach separate from the product's FIGSY/Resend.)* **→ the CLIENT-side engine = item 211 (the bigger picture).** | 🧍 |
| 211 | 🔴 | **🚨 THE DELIVERABILITY / SENDING ENGINE — the product's FOUNDATION (core finding 23 Jun, founder).** Without warmed, inbox-landing email the product is **non-viable: SMB market DEAD** (a $20 client can't run their own deliverability) · **mid-market can't scale** · **enterprise won't touch us.** The AI (FIGSY copy + scoring + African data) is the *differentiator*; **deliverability is the foundation it all stands on** — spam = nothing works. **THE COMPOUNDING (the crux):** K.I.N.D's own outreach (~1,000+ prospects/mo · ~5–9 warmed mailboxes at a real 2–3% — see cashflow funnel) **× EVERY client's volume** — and you **cannot share a sender across clients** (Client A's spam complaints poison Client B) → **each client needs isolated, warmed sending** (own domains/mailboxes, warmed, rotated); at 50 clients = dozens of warmed setups in parallel. **CURRENT GAP:** the product sends client cold mail via **Resend (shared)** → the same spam wall, multiplied, clients poisoning each other — **does NOT scale.** **THE DECISION (the big one):** (a) **build** in-house (domains/mailboxes/warmup/rotation/reputation per client — what Instantly/Smartlead spent years building; a detour from our edge) vs **(b) integrate a sending-platform API** (Smartlead white-label for the *product* engine · Instantly for K.I.N.D's own outreach now) with K.I.N.D's brain on top. **🎯 RECOMMENDATION: integrate — don't rebuild the hardest wheel; map & steal the engine, put the AI + African data on a proven sender.** **PRIORITY = THE #1 plan; get this right before scaling anything else.** **✅ RESEARCHED + DECIDED 23 Jun (sourced): INTEGRATE SMARTLEAD** — the one platform doing BOTH our models via one API + white-label: (A) **managed/SMB** = SmartSenders provisions+auto-warms mailboxes (~$4–9/mailbox/mo) · (B) **connect-your-own/enterprise** = attach client's Google/Outlook/SMTP. White-label ~$29/mo/client + `client_id` = per-client domain isolation. Instantly = good API but NO white-label → fallback. Alta = connect-your-own (confirms big-account model). **Full build spec → V2-TRACKER "⚙️ THE ENGINE".** **✅ SMARTLEAD CONFIRMED (founder, 23 Jun)** — Instantly = backup + own outreach. 🧍 UNBLOCK: Smartlead Pro + white-label → API key in Railway → 🤖 build the spike (via preview). | 🤝 |
| 199 | 🔴 | **Production monitoring + alerting (post-launch).** Today nothing pages anyone if prod breaks — the agent can't watch prod (ephemeral + network-blocked from the container; 403 to api/app.get-kind.com) and there's no scheduler. **Build/setup:** ① **✅ `/health` endpoint enriched 22 Jun** (PR `claude/199-health-checks`: DB HEAD-count + email-config check, 503 when DB down; tsc clean) — review/merge · ② 🧍 external uptime monitor (**UptimeRobot / BetterStack**, 1–5 min) on `api.get-kind.com/health` + `app.get-kind.com` → SMS/email/push to the founder · ③ turn on **Railway** deploy/crash alerts · **Supabase** DB/usage alerts · **Resend** bounce/spike alerts. Catches the 4 launch-weekend break modes (site down · API crash · DB · email). *(Founder monitors via laptop in the interim.)* | 🤝 |
| 200 | 🔴 | **Seller-experience rework — ONE foundation, THREE surfaces: partner portal + AE portal + admin-for-both** *(founder flag 18 Jun — DEEP-DIVE post-launch)*. Founder's thesis: **a partner and an AE are the SAME primitive** — both refer, manage, and earn on retention — so build **one seller foundation** rendered as a partner portal, an AE portal, and one admin to manage both (not two drifting systems). **Every seller (partner OR AE) gets:** ① their own **portal** (their docs · comp plan · their book/clients · earnings + payout statements) · ② their own **demo environment(s)** to run live demos when selling · ③ the ability to **source & sell THROUGH the K.I.N.D product itself** (dogfood — use ICP→FIGSY→outreach to build their own pipeline). **The ONE difference: a partner PAYS to use the tool; an AE does NOT** (it's the AE's employed sales kit — free seat). **Pairs with 197** (retention-based 25%+5% partner model) **+ the AE comp plan** (20% land / 5% retain / 5% expansion — same spine on purpose) **+ item 201** (the AE hire). Build: shared seller model + seat type (paid-partner vs free-AE) → partner-portal + AE-portal flows + per-seller demo provisioning + source-through-product access → one admin seller-management UI → payout/reconciliation with the sales ledger (196). **🎯 QUALITY PRINCIPLE (founder 18 Jun): the backend/team portal must be as good, honest, easy-to-use and clear as the CLIENT portal** — internal tooling gets the same craft. **Ties into the "how to run a company" training (next week)** + the Business Command Centre (company-ops → `kind-ops`). **Discovery first** (map what's broken/confusing today); do not change pre-launch. **Full map: `docs/hiring/SELLER-ENGINE-MAP.md`.** | 🤝 |
| 201 | 🔴 | **Hire founding AE (Company & Partner Sales)** *(logged 18 Jun — post-launch)*. Comp plan **v3 + two live 5-yr calculators** in `docs/hiring/` — **LOCKED scenario:** OTE **$112,500** ($67.5k base + $45k variable, 60/40) · target ARPU **$1,500** (multi-seat company deals) · full quota **$4,500/mo new MRR** · hire at **~$10k MRR** · **deal-size floor ~$550** (below it the six-figure base loses money). Commission 20% land / 5% retain / 5% expansion on **collected** MRR + 5% multi-seat & partner override · guarantee 100/100/75/75 · accelerators · earned-when-collected · windfall review. Reconciled to locked pricing 18 Jun (Denise **$39** etc.). Tools: `KIND-AE-COMP-PLAN.md` · `KIND-AE-commission-calculator.html` (5-yr) · `KIND-team-pnl-calculator.html`. **🧍 OPEN:** localize base to hiring market; confirm the Team-P&L roster/timing. *(Map: `docs/hiring/SELLER-ENGINE-MAP.md`.)* Owner 🧍. | 🧍 |
| 202 | 🔴 | **Seller document + HR/legal pack (AE + partner)** *(logged 18 Jun — needed BEFORE issuing any seat)*. **AE pack (UK templates provided 18 Jun):** ① Conditional Offer Letter · ② Contract of Employment (written statement of particulars) · ③ Restrictive Covenants Schedule · ④ Right-to-Work Check Record · ⑤ New Starter Checklist · + comp plan + live calculator. **Partner pack:** partner agreement (commission · white-label/territory) · NDA · referral + payout terms · data-processing. **Shared:** earned-when-collected / no-clawback · refund handling · onboarding order. Modelled on the founder's **Smartsheet FY25 comp framework** (Definitions · Eligibility · Territory · Quota · Comp Overview · Admin/modification). ⚠️ source PDFs render via a custom-font cipher → **legal text NOT transcribed yet** (accuracy); portal **stores/serves the signed PDFs**, templates live in `kind-ops`. **Full V2 spec: V2-TRACKER → "THE SELLER ENGINE" · map: `docs/hiring/SELLER-ENGINE-MAP.md`.** Owner 🤝. | 🤝 |
| 203 | 🔴 | **Comp Engine + live P&L + 3 portals — THE BUILD (founder brief, 19 Jun · NEXT-WEEK, do NOT build yet)**. Authoritative spec captured at `docs/hiring/KIND-CLAUDE-CODE-BRIEF.md` (full artifact set in the founder's `kind handoff` zip — not yet in repo). **System:** Stripe webhooks → attribute each customer (partner code / AE tag / none→house "KIND Agent") → **ONE commission engine** (Land 20% / Retain 5% / Expand 5%; AE base + 60/40 variable + ramp guarantee 100/100/75/75; partners 20%+5% no base; agent = revenue-only) → one DB → **3 portals** (AE · partner · admin = live company P&L Master view) → **founder approves payouts** (human gate) → Stripe/payroll. **Disciplines:** Stripe = single source of truth · attribution captured once at sign-up · comp rules in ONE engine. Test oracle = `KIND-Sales-Commission-Tracker.xlsx`. **AE tiers:** Ent $67.5k base/$112.5k OTE · Mid $45k/$75k · SMB $30k/$50k. **All USD** *(founder decided 22 Jun — GBP-vs-USD RESOLVED → USD; matches product pricing + the filed calculators)*, 93% margin. **✅ 22 Jun: the pure commission-engine MODULE is MERGED (#666) + DEPLOYED (#668 green) + unit-tested (33 cases, USD, no live wiring yet).** *(Item stays 🔴 — the BUILD epic = engine + Stripe attribution + 3 portals + payout gate; only phase-1 engine core is done.)* **Operationalizes 196/197/200/201/202.** **🎯 FOUNDER BUILD PRIORITY:** ① **Admin portal + operating SOP** → ② **Partner portal** → ③ **AE portal** — accounts/auth right from the start. 🧍 STILL OPEN: repo (new vs KIND product), auth provider/hosting. Owner 🤝. | 🤝 |
| 204 | 🟣 | **DECISION (founder, 19 Jun): SEPARATE the CODE layer from the HUMAN layer — GitHub for code, Notion for ops.** *(Approved direction; set up next week.)* **GitHub** keeps: all code + the **canonical product trackers** (LAUNCH-PAD · PRODUCT-INVENTORY · KIND-MASTER · V2-TRACKER) — versioned dev-truth. **Notion** takes: the **human/ops layer** — SOPs · the Business Command Centre · Operating Playbook · hiring/onboarding · compliance calendar · training ("run a company") · partner/AE handbooks. **Start on Notion's FREE tier** (zero cost to begin); upgrade to a paid plan as the team grows / when Notion **AI + Agents** are wanted (those are paid). **Boundary rule (keeps the SSOT clean):** one home per thing — product status stays on GitHub, ops/SOPs live in Notion, **never duplicated**. **Do NOT** put the client-facing AE/partner portals (200/203) in Notion — those are our product. *(Amends the "GitHub-everything" rule → "GitHub for code/product-trackers; Notion for the human layer.")* 🧍 next week: create the Notion workspace + migrate kind-ops/command-centre content. | 🧍 |

## 🥷 COMPETITIVE GAPS — "what to steal" (16 Jun feature-comparison vs Monday/ClickUp/Glean/Alta)
*Genuine gaps only. **Already tracked — NOT re-added:** LinkedIn outreach (#21/127) · voice/calling agent (96 Vapi · 144 Denise · 178 voice chat) · mobile app (#61/148) · A/B testing (97 backend live · 113 UI) · team/multi-user = **Company Engine #88** (live 🩷) · sequence templates (70) · ICP-templates-by-vertical (V2 #10) · Milla-as-intelligence-layer (2/143). MFA · IP-allowlist · data-residency fold into enterprise hardening (151).*
> **⚠️ CODE-VERIFIED 16 Jun (correction):** the gaps below were first added from a docs check only. Grepping the codebase found **179 ALREADY BUILT** (shareable view — now 🩷, not a gap), and **184/185 partly built** (re-scoped above). **True new gaps = 180 · 181 · 182 · 183**, plus the missing slices of **184** (public page) and **185** (outbound). Lesson logged: grep the code before adding/marking an item.*

### 🥷 NOTION — what to steal (researched 19 Jun; current to Notion 3.2, Jan 2026)
*Patterns to copy into the PRODUCT — most map onto items we already have; mapped so we don't re-add. (The "use Notion ourselves?" question is item 204.)*
- **Agents** (autonomous · 20-min multi-step · scheduled / event-triggered · memory in pages/DBs) → study for **FIGSY + the agent family (2/96/144) + agent-panel 113a**; their cron/trigger-driven agent UX mirrors our send-due cron.
- **Workers — sync any API into a DB + webhook triggers** → the exact pattern for the **Stripe→attribution engine (203)** + **Integrations Hub (83)**.
- **Forms: branching logic · auto-create DB entry · custom thank-you** → **lead-capture forms (item 71, live)** — steal branching + auto-create-lead → now logged as **item 205**.
- **Rollups with multi-currency formatting (USD/EUR/%)** → the **admin live P&L (203)** — directly answers our **GBP-vs-USD** rollup need.
- **Calendar: 2-way Google/Outlook sync, tasks from any DB** → **per-rep calendars (41)** + Denise meeting-booking (144).
- **Granular per-page permissions/sharing** → the gold standard for **Company-Engine RLS (55a)** + the seller portals (200).
- **Template gallery flow (gallery → preview → "use this")** → **sequence/ICP/winning-plays libraries (70/162/56)**. **Synced blocks** → winning-plays inherited across reps (56). **People directory** → Company-Engine team/seats (88).
- **Notion Mail / mail-to-pages** → our **inbox rebuild (112)**. **External Agents API** (Claude/Codex in Notion) → validates our agent thesis; possible future integration.
> Genuinely NEW vs our roadmap (candidate gaps if we want them): **branching-logic forms** · **multi-currency rollups in admin** · **template-gallery UX**. The rest map to tracked items above. *(Source: notion.com/releases — 3.0 Agents Sep-25 · 3.2 Jan-26.)*

### 🥷 STEAL-SOURCED ITEMS — logged in red (RULEBOOK §9: every steal gets an item)
*Audited 22 Jun. The catalog steals below had no dedicated item — now logged 🔴 so they can't go missing. (Most other catalog steals already map to tracked/built items — see the STEALS CATALOG audit at the bottom of this doc.)*
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 205 | 🔴 | **Branching-logic lead-capture forms** *(steal: Notion 3.2 Forms)* — extend the live forms (**item 71**) with **conditional branching · auto-create-lead into the scored pipeline · custom thank-you/redirect**. | 🤖 |
| 206 | 🔴 | **Template-gallery UX** *(steal: Notion)* — one consistent **gallery → preview → "use this"** flow across the **sequence / ICP / winning-plays** libraries (70 · 162 · 56) + **synced blocks** (a winning play edited once propagates to every rep). | 🤖 |
| 207 | 🔴 | **Multi-currency rollups in the admin P&L** *(steal: Notion)* — USD/local formatting + FX rollups in the live company P&L; the display layer the seller-engine P&L (**203**) needs (answers the GBP-vs-USD rollup). *(Feeds 203 — logged separately so the steal isn't lost.)* | 🤝 |
| 208 | 🔴 | **Recency-weighted "hot lead" ranking + champion signal** *(steal: Hypo / Amplitude prospecting agent)* — prioritise leads/accounts whose engagement **spiked recently** (last ~30d), not a static score; flag a **"champion-experimenting"** contact (engaged AND touched the advanced/AI surface). Feeds intent signals (**139**). 🧍 needs a behaviour-signal source (lead engagement + client CRM). | 🤖 |
| 209 | 🔴 | **Prospecting play-artifact + progress tracker** *(steal: Hypo)* — FIGSY outputs a clean, trackable **play**: strategy + the named target set + sample cadence + a **tick-through progress tracker** (sent/acted · current step) — plus account **org-threading** (one hot contact → the buying committee). Output-UX upgrade on campaigns. | 🤖 |
| 210 | 🔴 | **Call-coaching agent** *(steal: Glean)* — score a rep's call recording vs criteria → next-call guidance; the "augment the rep" thesis as a feature in the per-rep Company Engine (**#88**) / agent family. *(Was floating in the Glean steal note — now logged.)* | 🤖 |
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 179 | 🩷 | **Shareable stakeholder pipeline view — ALREADY BUILT** *(not a gap; mis-added 16 Jun)*: public `GET /share/:token` (`share.ts`, mounted) + public page `portal/share/[token]` + `CopyShareLink` + dashboard wiring + migration `20260530_client_share_token`. **Live — verify in the walk → 🟢.** | — |
| 180 | 🩷 | **Admin audit log / activity history** — filterable "who sent what, when, to whom" (extend the existing POPIA consent logging to a full activity log). *(Monday/Glean · hard requirement for accounts >~50 people. Verified absent in code.)* | 🤖 |
| 181 | 🔴 | **Enterprise SSO/SAML + SCIM provisioning** (Auth0/WorkOS) — beyond the social-OAuth login (84); the hard IT gate for accounts >~100 people. *(Monday/ClickUp/Glean.)* | 🤝 |
| 182 | 🩷 | **Zapier / Make native integration** — partner listing → 6,000+ apps with no per-connector builds (FIGSY "meeting booked" → Slack). **🩷 22 Jun: BUILT + MERGED (#668) + DEPLOYED green; `webhook_endpoints` migration RUN live.** Served by the same outbound-webhook + `GET /developer/events` polling API as 185. *(ClickUp/Monday.)* 🧍 verify a live delivery → 🟢. | 🤖 |
| 183 | 🩷 | **Campaign kill-switch (account-wide panic button)** — one click halts ALL active campaigns instantly (runaway-send / compromised-account protection). **LIVE on prod 22 Jun** (#643 merged + deployed green): `POST /figsy/campaigns/pause-all` (client-scoped, idempotent, active→paused) + "Pause all campaigns" button on the FIGSY page. → 🧍 verify on prod → 🟢. | 🤖 |
| 184 | 🔴 | **Public customer uptime page** — *internal status snapshots + admin status/health pages ALREADY BUILT (`status.ts` · `platform_status` · admin `/status` `/health` · 3×/day cron). Gap = a PUBLIC, customer-facing uptime page (Statuspage.io/BetterUptime).* | 🧍 |
| 185 | 🩷 | **Outbound webhooks + public event API** — push customer-facing events ("meeting booked", "reply received") to their tools → builder ecosystem. **🩷 22 Jun: BUILT + MERGED (#668) + DEPLOYED green; `webhook_endpoints` migration RUN live.** HMAC-SHA256-signed POSTs from the single `logOutcomeEvent` chokepoint + API-key-authed `GET /developer/events`; register/manage in the portal Developer page. 🧍 verify a live delivery → 🟢. | 🤖 |
| 186 | 🩷 | **Record signup T&C acceptance** — **LIVE (merged #606 + migration run 17 Jun).** New `signup_terms_accepted_at` + `signup_terms_accepted_ip` columns, written at account creation in `/auth/onboard`; the signup T&C tick is carried from the login/signup screen → onboard via `localStorage` and persisted (separate from the purchase-time `terms_accepted_at` so both consents are distinct). A trial user who never pays now has a stored consent record. 🧍 **verify** (a fresh signup writes the timestamp) → 🟢. *(Built + shipped 17 Jun.)* | 🧍 |
| 187 | 🩷 | **Sequence/template → Apply to campaign — email-first. LIVE (merged #607 + migration run 17 Jun).** New `figsy_sequences` library + a working **Sequences** page (`/dashboard/figsy/sequences`): build a reusable email sequence with literal copy + `{{first_name}}`/`{{company}}` tokens → **Apply to campaign → New or Existing**. Engine seam: when a campaign has an applied sequence, enrollment writes that copy (token-substituted) into the send slots — so **email steps actually send** via the existing engine (both `/enroll` + `autoEnrollLead`); AI generation stays the fallback when no sequence is applied. Tested (`sequence-apply.test.ts`, 9/9). LinkedIn/voice/WhatsApp greyed "coming soon". 🧍 **verify a real applied-sequence send** → 🟢. *(Built + shipped 17 Jun.)* | 🧍 |
| 188 | 🩷 | **Enable + seed Denise on the demo account — LIVE (merged #605 + migration run 17 Jun).** Denise is subscription-gated; the demo account had no `denise` sub → it showed the locked state. **Shipped:** demo-create now activates `denise` (`admin.ts`); `seed-showcase` grants the sub + seeds 1 follow-up + 1 proposal draft; migration `20260617_denise_demo.sql` backfilled existing demo accounts. 🧍 **verify** the Denise page is live on the demo → 🟢. *(Built + shipped 17 Jun.)* | 🧍 |
| 189 | 🔴 | **Google Workspace — find a workaround** *(📌 detail TBD, founder 16 Jun eve)*. Flagged as needed work; specifics pending from founder. *(Likely one of: Google OAuth/SSO app verification (84/126) · Google Calendar · or email/domain on Workspace — to confirm.)* | 🤝 |

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
| 136a | 🩷 | **🩷 LIVE 22 Jun (merged #686; pending deploy-green + walk)** — `GET /stripe/invoices` (customer resolved by email) + Invoices section under Company → Documents w/ Download PDF; USD, read-only. *(Follow-up: store `stripe_customer_id` for robustness.)* ⭐ **IMPORTANT** — **Client invoicing — surface Stripe receipts in-portal.** 🔒 **DECISION LOCKED 13 Jun: USD billing · NO VAT until we hit a financial benchmark · Stripe issues the receipt, we only pull & display it.** (Until the benchmark, Stripe shows no VAT line; when we register, Stripe adds VAT automatically — no code change our side.) **We build:** an *Invoices* surface under **Company → Documents** that pulls the client's Stripe invoices via API (`invoices.list`) and lists date / number / amount (USD) / status with a **Download PDF** link to Stripe's hosted PDF (`invoice_pdf` / `hosted_invoice_url`). 🔒 design approved → `previews/invoice-v1.html` (document target) + `previews/invoices-list.html` (in-portal list). | 🤖 |
| 137 | 🔴 | 90-day performance guarantee (#61a/g) · Revenue Playbook call (#62b) · homepage outcome numbers (#62c) | 🤖 |
| 138 | 🔴 | Influencer/community distribution (#61e) | 🧍 |

## 4F — Month 2 (gated 10+ clients) — Intelligence layer
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 139 | 🔴 | Intent signals #37 · A/B→contextual bandit #38 · morning-brief #39 · ICP auto-refinement L2 #40 · conditional branching #41 | 🤖 |
| 140 | 🔴 | **Waterfall enrichment #42 — 🩷 LIVE + ACTIVE 22 Jun (#681 merged + keys CONFIRMED in Railway): PDL now a parallel+deduped source (not Apollo-only-fallback) + auto-Hunter enrichment for missing emails. 🧍 verify on an ICP run → then this part is 🟢.** Rest of the cluster still 🔴 (Month-2): adaptive send volume #45 · Milla CRM pull #47 · inbox rotation/multi-domain #53 (needs warmed domains). | 🤝 |
| 141 | 🔴 | **Context-backed MCP server #59** (client-context-backed, not thin wrappers) | 🤖 |
| 142 | 🔴 | Product Hunt #49 · G2 listing #50 | 🧍 |
| 143 | 🔴 | **The Learning Engine** (build order: ①Train-FIGSY RAG → ③evals → ②outcome feedback loop → bandit → ④recall/memory → ⑤model routing → fine-tuning LAST) — full blueprint in `V2-TRACKER.md` | 🤖 |

## 4G — Month 3 (gated margin data) — the agent family
| # | 🔴 | Item | Owner |
|---|----|------|-------|
| 144 | 🔴 | **DENISE deep build #54** (auto-book · notetaker · objections · proposal-from-transcript · Vapi voice) | 🤖 |
| 145 | 🔴 | **LENA — CS agent #55** ⭐ **CHURN-DEFENSE PRIORITY** (retention = salary — see `SALARY-BREAKEVEN-PLAN.md`; CS is what *holds* the client book) · **TONY — Ops agent #56** | 🤖 |
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
> **🥷 STEALS AUDIT — 22 Jun (RULEBOOK §9: every steal must be logged in red).** Walked the whole catalog: **almost every steal already maps to a tracked/built item** — e.g. ClickUp **Goals → item 69** (built) · ClickUp/Notion **Forms → item 71** (built) + branching now **205** · Instantly **auto-pause → 17/20/21** (built) · Glean **context moat → 46/47**, **benchmarks → 159/150**, **auto-setup → Casey 121**. **Newly logged 🔴 (were floating in prose):** **205** branching forms · **206** template-gallery UX · **207** multi-currency admin rollups · **208** recency-weighted hot-lead ranking + champion signal (Hypo) · **209** prospecting play-artifact + tracker (Hypo) · **210** call-coaching agent (Glean). *Full per-source detail in `V2-TRACKER.md` steals table.*
**Alta** Touch-Points tree · template gallery · Train tabs · funnel dashboard · Unibox reply-tags/"Help me reply" · saved views · **the inbox blueprint (item 112)** · **ClickUp** Cmd+K · views · feed · status bar · Goals · Forms · Integrations Hub · **Lemlist** images · sequence builder · community play · **Monday** share-loop · dense dashboards · Pixar warmth · **Atlas** speed-to-lead · 90-day guarantee · influencers · **Instantly** warmup · auto-pause · adaptive volume · rotation · **Clay** waterfall enrichment · **Apollo** job-change · sequence analytics · transparency · intent · **Apex** acts-not-responds · autonomy onboarding · founder-as-demo · **Glean** context moat · benchmarks · winning-play library · Casey/auto-setup · permission-safety · context-backed MCP · call-coaching agent (210) · **Revio** coaching onboarding · case-study specificity · **Notion** (3.2) branching forms (205) · template-gallery UX (206) · multi-currency rollups (207) · agents/workers/calendar/permissions (mapped to 2/83/41/55a) · **Hypo / Amplitude** (internal prospecting agent) recency-weighted hot-lead ranking + champion signal (208) · play-artifact + progress tracker + org-threading (209).

---
*This inventory is the single complete list (≈199 items — see the colour dashboard at the top). 🟢 = live + verified · 🩷 = live, pending verification (shipped, awaiting the walk) · 🟣 = approved + locked, waiting to ship · 🟡 = built, needs founder review · 🔴 = future, in order. Ladder: 🔴→🟡→🟣→🩷→🟢. Numbers are stable IDs, not sequence. Nothing ships until the founder merges.*
