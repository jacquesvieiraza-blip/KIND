# K.I.N.D — EVERYTHING

> ✅ **THIS IS THE WORKING SOURCE OF TRUTH (as of 4 Jun 2026).** Read this first, update this first. `MASTER.md` is now a historical archive only — kept for context, not canonical. Where the two disagree, THIS document wins.
> **Protocol:** at the start of a session read this file; at the end of a session update it and commit.

**The complete, de-duplicated register of every actionable item, every built feature, every decision, and every known contradiction across MASTER.md.**
Built 4 Jun 2026 from a full end-to-end read of MASTER (8,141 lines). Contradictions reconciled to canonical/correct values (see Part 8 for the list of fixes still owed to the MASTER archive).

> **How to use this:** Parts 1–2 are what you *do*. Parts 3–6 are the current *state* (so nothing is forgotten or rebuilt). Part 7 is recurring ops. Part 8 is the MASTER cleanup backlog.

---

## CANONICAL FACTS (the reconciled truth — supersedes any stale value in MASTER)

- **Launch:** MONDAY, both markets (US + Africa/UK), multiple campaigns.
- **Region:** ONE URL `app.get-kind.com`, ONE Cape Town DB (Supabase af-south-1). US served from Cape Town; US data residency added only on a signed enterprise contract.
- **Hosting:** Railway ONLY. No Vercel. (Portal, API, Admin, Website = 4 Railway services.)
- **Billing:** Stripe primary. Flutterwave Phase 2 (code-complete, needs key). Paystack REMOVED.
- **Pricing:** Lead Gen $1/credit (20/40/100 = $20/$40/$100). FIGSY $3/credit (20/40/100 = $60/$120/$300). Milla $49/mo. **Vida $29/mo** (corrected 3 Jun — NOT $39). Bundle $69/mo.
- **Cron jobs:** 16 live (the 3 status-snapshot crons were planned, never built).
- **Agents live:** FIGSY, Milla, Vida. **DENISE (the closer) = #1 next build, pulled forward. LENA / OTTO = Month 3.** (DENISE was formerly codenamed REEVE.)
- **Models:** Sonnet 4.6 (Milla, FIGSY) + Haiku 4.5 (scoring, scraping).
- **Run cost floor:** ~$125/mo. Break-even: 2 clients (infra) / 5 (all-in). Margin 95%+.

---

# PART 1 — ACTIONABLE (everything to do, by timeframe + owner)

Owner key: 🧍 Founder · 🤖 Claude · 🤝 Both. Status: ⬜ TODO · ⏸ DEFERRED (trigger noted) · ✅ DONE.

## 🚨 THIS WEEK — launch
| # | Item | Owner | Status |
|---|------|-------|--------|
| 1 | Rotate exposed credentials — TIER 0 (full list in Part 2 / Ring 3) | 🧍 | ⬜ FIRST |
| 2 | Move `FEATURE_PORTAL_V2=true` API → Portal service | 🧍 | ⬜ |
| 3 | Create dogfood account → ping Claude | 🧍 | ⬜ |
| 4 | Grant FIGSY + credits, set `FIGSY_KIND_CLIENT_ID` + `booking_url` | 🤖 | ⬜ (on #3) |
| 5 | Merge branch `claude/ai-business-roadmap-U3OWJ` | 🧍 | ⬜ |
| 6 | Run migration `010_crm_dedup.sql` | 🧍 | ⬜ |
| 7 | DNS: `app` / `api` / `admin` / `status`.get-kind.com (Railway + CNAME) | 🧍 | ⬜ |
| 8 | After DNS: update `NEXT_PUBLIC_API_URL` (Portal+Admin) + Resend inbound webhook URL | 🧍 | ⬜ |
| 9 | Confirm Calendly `calendly.com/kind-ai-demo/new-meeting` live | 🧍 | ⬜ |
| 10 | ICO registration — ico.org.uk £40/yr | 🧍 | ⬜ before launch |
| 11 | SR01 home-address suppression (free) | 🧍 | ⬜ |
| 12 | Registered office + director service address (~£20-50/yr) | 🧍 | ⬜ |
| 13 | Domain WHOIS privacy verify | 🧍 | ⬜ |
| 14 | LinkedIn lockdown (don't accept Bradley-type requests; no K.I.N.D on personal) | 🧍 | ⬜ |
| 15 | **Sat** smoke test 1 (57-step suite, `docs/SMOKE_TEST.md`) → log `T#-Step#` | 🧍 | ⬜ |
| 16 | **Sun** smoke test 2 → confirm fixes | 🧍 | ⬜ |
| 17 | Fix smoke failures same-day | 🤖 | ⬜ |
| 17b | **Raw outcome-event capture — append-only log (THE DATA FLOOR, see memory spec below). The only thing that can't be back-filled. Cheap. Build before first campaign sends.** | 🤖 | ⬜ NOW |
| 18 | **MON — LAUNCH both markets, multiple campaigns** | 🤝 | ⬜ |

## ✅ DONE THIS SESSION (4 Jun — verified in repo)
- terms.html sub-processor bug (Paystack/Vercel → Stripe/Railway) · AAA arbitration §12
- privacy.html honest residency (Cape Town; US enterprise on request) + purple fix
- Homepage dual-market trust bar + OG · Pricing USD strip
- #45 proof block (removed fabricated "4/8" stat → honest Live state)
- #46 homepage throughline (founder-approved, live)
- Deployment SOP single-region + dual-region future rule
- Region architecture locked; MASTER US section + risk flags reconciled
- Earlier 4 Jun: company number ×4, FOUNDER_EMAIL, Resend inbound, Stripe 8 price IDs + pricing fix, Calendly 40+ buttons, API build crash, CRM dedup built, 3 blog articles, YouTube plan, SEIS+trademark draft, chat backup

## 🟥 WEEK 1 POST-LAUNCH
| # | Item | Owner |
|---|------|-------|
| 19 | 10 warm outreach messages (network) | 🧍 |
| 20 | LinkedIn content 1/day via **anonymous brand handle** (dogfood story) | 🧍 |
| 21 | Activate LinkedIn outreach — run `20260602_linkedin_queue.sql` + `PHANTOMBUSTER_API_KEY` + `PHANTOMBUSTER_LINKEDIN_AGENT_ID` | 🧍 |
| 22 | Start Meta/WhatsApp Business API application (3–7 day window) | 🧍 |
| 23 | Record real product demo — "shoot once, cut many" (16:9 + 9:16) | 🧍 |
| 24 | #44 — replace homepage animation with real product loop | 🤝 (blocked on #23) |
| 25 | Instrument GTM funnel (channel→reply→demo→close, CAC, trial→paid) | 🤝 |
| 26 | Activate dogfood self-outreach engine + point FIGSY at competitor-switcher ICP | 🧍 |

## 🟧 WEEKS 2–4
| # | Item | Owner |
|---|------|-------|
| 27 | Open 2 design-partner slots (case study + logo) | 🧍 |
| 28 | Cut social content from demo footage (9:16) | 🤝 |
| 29 | Record 3 onboarding Loom videos | 🧍 |
| 30 | Onboarding v2 + Loom slots + day-0/3/7 email sequence | 🤖 (gated on run-through) |
| 31 | Populate proof block with real dogfood numbers (#45 block is built) | 🤖 |
| 32 | **Website consistency pass** — 32 pages (nav/footer/colour `#7C3AED`/type/CTA) **+ #47 Compare nav** | 🤖 (post-smoke) |
| 33 | Activate Flutterwave (needs key — ZAR/NGN/KES/GHS) | 🧍 |
| 34 | Launch YouTube channel (10-video plan exists) | 🧍 |
| 35 | Wire playbook email form (needs provider: ConvertKit/Mailchimp) | 🤝 |
| 36 | "AI Revenue OS" positioning copy rewrite (Apex steal — hero/pricing/deck) | 🤖 |
| 61a | **Atlas steal #1 — Performance guarantee copy** · Add "30-day results guarantee" to FIGSY pricing page + portal onboarding. "Results or your money back." Near-zero cost at $29/mo, removes purchase friction entirely. | 🤖 |
| 61b | **Atlas steal #2 — "60-second" specificity hook** · Pick one concrete number and own it across all hero copy. Options: "Your first meeting booked within 24 hours." / "FIGSY replies to every new lead in under 60 seconds." Run A/B. | 🤝 |
| 61c | **Atlas steal #3 — "Clone yourself" framing** · Sharpen FIGSY copy from generic "AI SDR" to personal: "FIGSY prospects the way you would — in your voice, at 3am, to every lead on your list." Update hero + about copy. | 🤖 |
| 61d | **Atlas steal #4 — Cold CRM re-engagement angle** · Add explicit use case to FIGSY page + use-cases.html: "Have 200 leads going cold? FIGSY re-engages them all — tonight." High-urgency, high-pain, every SMB has this problem. | 🤖 |
| 61e | **Atlas steal #5 — Influencer/community distribution** · Identify 1–2 SA SMB communities (Startup Grind CPT, specific trades/services forums) + 1–2 US equivalents. Pursue co-marketing or endorsement. Dan Martell is Atlas's real acquisition channel — we need ours. | 🧍 |

## 🟨 MONTH 2 — intelligence layer (Tier 2 build queue, 10+ clients)
37 Intent signal detection · 38 A/B subject testing · 39 Client morning brief email · 40 ICP auto-refinement · 41 Conditional sequence branching · 42 Waterfall enrichment (Apollo→PDL→Hunter→Clearbit; needs PDL+Hunter keys) · 43 Deliverability dashboard (SPF/DKIM/DMARC+bounce+blacklist) · 44 Email score pre-send · 45 Adaptive send volume · 46 **FIGSY Memory v2 (pgvector)** · 47 Milla full-context CRM pull · 48 Vapi voice calling · 49 Product Hunt (with proof) · 50 G2 listing (5 reviews) · 51 Configurable agent triggers · 52 Multi-model toggle per campaign · 53 Inbox rotation / multiple sending domains (Instantly steal)

### MEMORY = THE MOAT — architecture + the data floor (clarified 5 Jun)

**Two threads, do not conflate them:**
- **Thread A — the Learning Stack (what gets smarter, the product):** L1 per-client memory ✅ BUILT (`figsy_memory`: best subjects, winning angles, reply rates) → L2 ICP auto-refinement (monthly AI review of who actually replies, ~Month 6, 10+ clients) → L3 adaptive per-campaign (real-time A/B within a campaign) → L4 platform/cross-client intelligence (benchmarks, predictive ICP — Year 3, 500+ clients).
- **Thread B — the substrate (how it's stored, the plumbing):** flat `figsy_memory` table today → pgvector (semantic embeddings) → 3-type split (episodic / long-term / preference). Build at ~10 clients. **Plumbing does NOT make FIGSY smarter on its own — it only lets L2–L4 scale. Do not pull engineering here before client volume exists.**

**Our moat is rarer than Glean's — and that changes the strategy.** Glean's moat is per-customer context (locks in each client, no benefit to the next). Ours is **outcome data** (who replied/converted, which angle, which African vertical) — a **cross-customer** moat where every client makes the platform smarter for the next one in their industry. Glean doesn't have that network effect. But it only exists *if we capture the data to feed it.*

**THE DATA FLOOR (item 17b — pre-launch, the one irreversible thing):** an **append-only raw outcome-event log** — every lead, send, exact reply text, timing, and outcome, stored row-level and **never discarded or pre-aggregated away.** L4 in 2028 can only learn from data we start keeping in 2026. Aggregates (`avg_reply_rate_30d`, `last_winning_angle`) are summaries — you **cannot back-fill** the granular truth you threw away. Cheap on one Cape Town DB. This is the only memory work that must ship before the first campaign sends.

**The accelerant rule:** you do NOT accelerate the moat by building the top of the stack faster. Pre-revenue, memory compounds on N — one client's memory is worthless. **The accelerant = (1) capture raw data at full fidelity now, (2) get clients.** The smart layers (L2–L4, pgvector, 3-type) are worthless without volume and a dangerous distraction before it. Build the *capture* layer early; build the *smart* layers at 10+ clients.

## 🟦 MONTH 3 — agent family + platform (Tier 3/4)
54 **DENISE** (the closer — PULLED FORWARD, see priority spec below) · 55 **LENA** · 56 **OTTO** · 57 Multi-agent orchestration (shared memory) · 58 500+ FIGSY skill library · 59 **MCP server** (K.I.N.D as AI infrastructure) · 60 **Outcome pricing ("per meeting booked") — GATED, see spec below** · 61 Mobile app iOS+Android · 62 Built-in CRM (persistent prospect DB / Kanban deal view) · 63 Pan-African design partners (NG/KE/GH/EG/RW) · 64 Platform-level cross-client intelligence · 65 Data licensing marketplace · 66 ICP auto-refinement advanced · 67 Pipeline forecasting · 68 In-portal messaging · 69 Proposal + e-sign · 70 Meeting notetaker

### #54 DENISE — the closer (PRIORITY: #1 build after launch stabilises — pulled forward from Month 3)

**Decision (5 Jun): DENISE goes next.** Not LENA, not OTTO — DENISE first, built deep. Reason: she extends FIGSY's *existing* pipeline instead of opening a new front. FIGSY currently dies at the exact seam "meeting booked → human takes over." DENISE eats that seam. That one handoff is worth more than launching LENA + OTTO shallow. Codename was REEVE; renamed DENISE.

**Persona / storyline (her character — load-bearing for tone, copy, and prompt):**
DENISE is the closer. Named after the founder's mother — a woman who **built a successful sales business from the ground up** and is a **huge, warm, unforgettable personality** in the room. That's the character: she's the one who walks into the deal and people *remember her*. Not a slick, pushy closer — a relationship closer. She makes the prospect feel handled, follows up like she genuinely cares (because the person she's modelled on did), and never lets a warm lead go cold. Confident, warm, a little bit of charm, zero desperation. The kind of salesperson who closes because people *like* her, not because she cornered them.
- **Voice:** warm authority. Big personality, but never loud or salesy. "Let's get you sorted" energy.
- **Why this matters commercially:** FIGSY opens the door; DENISE is who you'd actually want walking through it. The persona is the product — clients aren't buying "an AE agent," they're buying *Denise*.

**Role & capabilities (from MASTER, confirmed):**
- Books the discovery call to Calendly **automatically** (removes today's manual founder handoff)
- Joins the discovery call as an **AI notetaker** — surfaces objections live
- **Drafts the proposal from the call transcript**
- Follows up the pipeline — chases warm leads so none go cold
- The handoff seam she owns: `Meeting booked → DENISE` (today the client takes over here)

**Why deep-not-shallow:** the whole bet is that DENISE *feels* like a real closer. A half-built AE that just dumps a Calendly link is not Denise — it's a worse FIGSY. Build the notetaker + objection-surfacing + proposal-draft loop properly or don't ship her.

**Build checklist (post-launch, ahead of LENA/OTTO):** Calendly auto-book on positive FIGSY reply · call-join + transcription (notetaker) · live objection extraction · proposal draft from transcript · pipeline follow-up sequencer · DENISE persona/system prompt (the storyline above, written tight) · admin `/agents/denise` identity card.

---

### #60 Outcome pricing — spec (DO NOT BUILD YET — gated on data + cash)

**Decision (5 Jun): parked. Not now. We need wins, then data, then a data-informed call.**
Reason it waits is not the code — it's that outcome pricing moves result-risk onto K.I.N.D, and a pre-revenue company offering outcome pricing is offering free labour with extra steps. Build only after: (a) paying wins on credit pricing, (b) dogfood + real campaigns give the one number this whole model needs.

**The one number that unlocks it:** *average credits consumed to produce one booked meeting.* Without it, the price is a guess.
- If ~8 credits → cost ≈ $24 → charge $40 → ~40% margin. Works.
- If ~20 credits → cost ≈ $60 → charge $40 → lose $20/meeting. Bankrupts at scale.
- **Margin floor to proceed: 28% gross.** Below that, do not enable.

**It is a separate menu, NOT an add-on. Client picks ONE plan, never both:**
| Plan | Client pays | Risk bearer |
|---|---|---|
| Credit (live today) | $1/action (Lead Gen), $3/conversation (FIGSY) | Client eats the waste |
| Outcome (this item) | $0 per action — pays ONLY on result | K.I.N.D eats failed outreach |

**Critical rule — no double-charge across the pipeline:** on the outcome plan, a client running Lead Gen→FIGSY is billed for the **final outcome only (the meeting)**. The per-qualified-reply price ($15) exists *strictly* for Lead-Gen-only clients who never touch FIGSY. Never charge reply + meeting on the same prospect.
- Lead Gen (standalone, outcome plan): **$15 / qualified reply** (intent signal, not "unsubscribe"). Anchor: agencies charge $35–80.
- FIGSY (outcome plan): **$40 / confirmed meeting**. Anchor: human SDR = $75–200.

**"Confirmed" must be machine-decided, never a human judgment call** (or every charge becomes an argument): calendar event created via the FIGSY booking link = billable, full stop. No-shows are NOT refunded (stated in ToS — same logic as Intercom not refunding re-opened tickets). Cancellation after booking = still billable.

**Build checklist when greenlit (Month 3+):** `outcome_events(id, client_id, type, metadata, billed_at, amount)` table · Calendly/Cal.com webhook → confirm → Stripe charge · reply-qualifier LLM call at inbound · Stripe metered billing switch · pricing-page toggle behind flag · ToS clause (no no-show refunds).

## 🔵 YEAR 2 — certifications + enterprise
71 ISO 27001 (~£15–25K) · 72 ISO 42001 AI Governance (~£10–15K) · 73 SOC 2 Type II (~$50K, Vanta) · 74 Triple-cert via Vanta (~70% shared controls) · 75 3-type memory model · 76 Visitor de-anonymisation (Clearbit) · 77 Churn-risk scoring · 78 Revenue forecasting · 79 Call intelligence

---

# PART 2 — ⚖️ LEGAL & COMPLIANCE RING-FENCE (4 rings)

### 🔵 RING 1 — Corporate & Personal Shield
✅ Ltd formed (17260532, England & Wales) · ✅ Limited-liability shield · ✅ Employment ring-fence (after-hours/personal-kit; Smartsheet clause 17.2 reviewed+accepted) · ✅ `docs/legal/legal-pack.md`
⬜ SR01 home-address suppression · ⬜ Registered office + director service address · ⬜ WHOIS privacy · ⬜ LinkedIn lockdown / anonymous brand-only coverage · ⬜ All public contact = business email · ⬜ Press attributed to "K.I.N.D team" · ⬜ **D&O insurance** (~£500–1,000/yr, Month 2)
📌 Hard floor: PSC director name is permanently public — cannot be removed.

### 🟢 RING 2 — Data Protection
✅ UK GDPR + DPA 2018 + Data Use & Access Act 2025 · ✅ POPIA · ✅ NDPR + Kenya DPA 2019 · ✅ CCPA/CPRA + US state laws (dpa-us.html catch-all) · ✅ DPA published + DPA-US · ✅ Data residency locked (Cape Town; US on request) · ✅ Data classification T1–T4 · ✅ Sub-processor register consistent (fixed 4 Jun)
⬜ **ICO registration** (£40/yr — before launch) · ⏸ ODPC Kenya / NDPR DPCO (first NG/KE client)

### 🟠 RING 3 — Information Security
✅ RLS all tables (credit_transactions fixed) · ✅ API auth (requireAuth + requireAdminKey) · ✅ Strict CORS · ✅ JWT refresh · ✅ TLS 1.3 / AES-256 · ✅ Secrets in Railway env only (rule) · ✅ Incident response plan + register (4 Jun logged) · ✅ BCP (RTO 4h / RPO 24h / daily backups 30-day) · ✅ `docs/legal/it-security-pack.md`
⬜ **Rotate exposed credentials (TIER 0):** `STRIPE_SECRET_KEY`(sk_live) → `SUPABASE_SERVICE_ROLE_KEY` → `DATABASE_URL` (password exposed) → `SUPABASE_ANON_KEY` → `ANTHROPIC_API_KEY` · `RESEND_API_KEY` · `RESEND_WEBHOOK_SECRET` · `APOLLO_API_KEY` · `HUBSPOT_API_KEY` · `ADMIN_SECRET_KEY` · `STRIPE_WEBHOOK_SECRET` → Paystack test keys (hygiene)
⬜ AI Risk Register (free, start now — ISO 42001 foundation) · ⏸ Pen test (~£2–5K, Month 3) · ⏸ SOC 2 / ISO 27001 / ISO 42001 (Year 2)

### 🟣 RING 4 — Contractual & IP
✅ Client T&Cs (liability capped 3-mo fees, no-refund, England & Wales) · ✅ AAA arbitration for US clients · ✅ IP ownership (company owns code/brand/agent names/dataset)
⬜ **SEIS advance assurance** (free, draft ready — file soon) · ⏸ Trademarks K.I.N.D+FIGSY+Milla+Vida (~£320, Month 2–3, before PR) · ⏸ IR35/contractor IP-assignment (first hire) · ⏸ SeedLegals IP assignment (~£600, at raise) · ⬜ VAT registration at £90k threshold · ⬜ Annual confirmation statement + accounts + CT return

---

# PART 3 — WHAT'S BUILT (live inventory — do not rebuild)

**Platform:** Supabase+RLS, auth (no email-confirm), 16 cron jobs, TSC clean.
**Lead Gen:** ICP builder, AI ICP Suggest, ICP website scan, Apollo 3-pass, Claude scoring, leads table, opt-out blocklist, POPIA consent, first-leads email, weekly digest, drip 10/day, CRM dedup (HubSpot+Pipedrive — needs migration 010).
**FIGSY:** 19 API endpoints, campaign CRUD, 3-step sequences, reply classification, FIGSY Memory, Unibox two-way, opt-out, CRM push, escalation, identity card, weekly digest, paused_low_performance, self-outreach cron.
**Milla:** doc RAG + source attribution (subscription billing wired — awaiting price IDs confirm in T5).
**Vida:** config/embed/WhatsApp (subscription wired).
**Billing:** Stripe credit + subscriptions, auto-topup, trial overlay, credits-at-delivery, overspend fix, low-credit warning, subscription-lapse.
**Admin (13 routes):** /, clients, clients/[id], demo, launch, roadmap, cmo, founder, playbook, terms-library, hubspot, scalability, unibox (+ analytics, revenue, compliance, partners, etc. per repo).
**Portal (15 routes):** login, onboard, dashboard, leads, figsy (+ linkedin queue UI), assistant, chatbot, documents, kpis, usage, billing, billing/confirm, roadmap, referral, settings.
**Website (30+ pages):** homepage, about, pricing, support, terms, privacy, trust, dpa, dpa-us, use-cases, partners, story, values, blog, playbook, figsy, chatbot-agent, virtual-assistant, demo, demo-video, figsy-video, platform-video(+standalone), vs-apollo, vs-outreach, vs-salesloft, vs-hiring-an-sdr, vs-prospecting-manually.
**Other:** PWA (install banner, push-ready), Demo Environments, 7 internal Founder Agent endpoints, Partner Programme, Founder morning brief 07:05 SAST, Cloudflare Pages CDN (built, needs activation), Portal V2 (built, dormant — `FEATURE_PORTAL_V2`).
**LinkedIn outreach backend:** built (`lib/linkedin.ts`, 4 routes, queue migration, portal UI) — needs PhantomBuster keys + SQL run. *(Supersedes the old "never build LinkedIn" decision.)*

---

# PART 4 — BLOCKED (needs credentials only, no build)
⏸ Milla + Vida subscriptions — Stripe price IDs (verify) · ⏸ Flutterwave — key · ⏸ HubSpot — `HUBSPOT_API_KEY` · ⏸ Voice — Vapi keys · ⏸ WhatsApp — Meta approval + number · ⏸ Google Calendar OAuth — `GOOGLE_CLIENT_ID/SECRET/REDIRECT` · ⏸ Clearbit visitor de-anon — `CLEARBIT_API_KEY` · ⏸ LinkedIn auto-dispatch — PhantomBuster keys · ⏸ Cloudflare CDN failover — `CLOUDFLARE_API_TOKEN/ACCOUNT_ID` · ⏸ Render standbys + UptimeRobot.

---

# PART 5 — COMPETITIVE STEAL-NOW (action items extracted from §20/24/25/26/33)
✅ Already taken: command palette, activity feed, shareable dashboards, sequence-branching UI, Meetings-Booked KPI, Mission Control, agent photos, warm palette, AskFigsyButton, benchmark, anomaly alerts, Unibox two-way, demo narration.
⬜ Now (zero/low build): "AI Revenue OS" positioning (Apex) · daily client briefing (Apex, Month 1) · scheduled report emails (S4).
⏸ Later: 3-type memory (10+), configurable agent triggers (20+), multi-model toggle (20+), Kanban deal view (20+), waterfall enrichment (Clay), inbox rotation (Instantly), multichannel single-agent (Reply.io), intent signals (Amplemarket), email warmup infra, pre-send inbox-placement test, personalised images per lead, template/recipe library, MCP server.
📌 NOT stealing: Glean "platform/layer" narrative (we're product-level — would break honest positioning).

---

# PART 5B — COMPETITIVE LANDSCAPE + STRATEGIC POSITION (synthesised 5 Jun)

> Source: deep research run 5 Jun covering Glean, Monday.com, ClickUp, Notion, Linear, Salesforce Agentforce, Intercom Fin, and macro SaaS AI pricing data. youratlas.com added 5 Jun (see §Atlas below).

## What the outside world shipped (May–Jun 2026)

| Company | What they shipped | Strategic signal |
|---|---|---|
| **Glean ($7.2B)** | Enterprise Graph (memory + connectors + personal + org graphs + governance). "Enterprise AI coworker" — proactively manages tasks, runs multiple workstreams, personalises per employee. Agent Development Lifecycle (ADLC) framework. Full MCP adoption. | Context always wins. The agent with the most context beats on quality every time. |
| **Monday.com** | Full relaunch as "AI Work Platform." Native agents any team member can configure — draft campaigns, qualify leads, close support, onboard, process POs, 24/7. Claude + OpenAI + MS365 Copilot via single AI Platform Gateway. | "Agents sit inside a single structured platform with context across the entire business." General-purpose, context-native. |
| **ClickUp** | Acquired Codegen (Cursor competitor). "Super Agents" — autonomous project completion, 500+ work skills, human-level memory that learns from every interaction. 3,000 internal AI agents at 3:1 AI:human ratio. **Laid off 22% of staff.** Million-dollar bands for 100x humans who manage AI systems. | Most aggressive "agents replace headcount" bet. General-purpose. |
| **Notion** | Custom Agents (team-wide bots on schedules + triggers). MCP-native: Linear, HubSpot, Figma, Slack, Attio CRM. "Notion Workers" hosted runtime — agents run sandboxed custom code, no server needed. | Workspace = the agent runtime. MCP is the wiring. |
| **Linear** | Linear Agent: triages new work, assesses it, routes to the right team, Code Intelligence (controlled codebase access). The PM tool becomes the intelligence layer that directs work. | Product intelligence, not just tracking. |
| **Salesforce** | AgentExchange — agent marketplace. "$6 trillion digital labour market." $2/AI conversation (vs $30–50 human agent cost). Agentforce on Slack up 300% since Jan 2026. | Outcome pricing at enterprise scale. Pricing by result, not seat. |
| **Intercom Fin** | $0.99 per fully-resolved support ticket. Zero cost if unresolved. Pure outcome model. Working. | The clearest pricing proof point in the market — outcome pricing is proven and live. |

## Macro numbers (5 Jun 2026)
- 40% of enterprise apps will have task-specific agents by end of 2026 (was <5% in 2025)
- 50%+ of B2B sales teams will be smaller than in 2025
- AI handling 40–60% of initial customer interactions
- Outcome-based pricing: <10% adoption today → projected dominant model by 2027
- Credit wallets + usage-based already standard: 43% of SaaS on hybrid models → 61% projected by year end

## Five strategic reads for K.I.N.D

**1. We launched on the right pricing curve.** Credit wallets, usage-based, per-action — every major player is migrating toward this. We launched there. Outcome pricing (#60) is the right next step — Intercom and Salesforce proved the model. It stays gated until we have margin data, but the direction is confirmed.

**2. The warmth window is narrow — use it now.** Monday/Notion/ClickUp all now talk about "agents as team members." We've had named personalities and a family narrative since Day 1 (Pixar 3D, named by founder's family). That emotional layer is actually a *stronger* narrative than corporate "agent platform" language — but the window where we look differentiated (not just different) is shrinking as everyone humanises their agent UX. Differentiate on warmth *now*, before it becomes table stakes.

**3. MCP is being pulled forward — it's distribution, not just product.** Glean, Notion, Linear, Salesforce are all wiring MCP natively. Item #59 (MCP server — K.I.N.D as AI infrastructure) was Month 3. Given this signal, it moves to Month 2. Being MCP-compatible means other tools' agents (Notion, Linear, Slack) can call K.I.N.D agents without a K.I.N.D sales team. That is free distribution. **MCP is now Month 2, not Month 3.**

**4. Our defensible lane is specialisation, not breadth.** Monday and ClickUp are building general-purpose agent platforms. We're building a specialised revenue team: African market data, POPIA compliance, $20 entry point, named family agents. They cannot replicate the data moat or the compliance posture without years of presence. That specialisation is the lane — hold it, don't try to match their breadth.

**5. The risk is speed, not direction.** K.I.N.D's product direction is correct — the market is validating it in real time. The danger is the window where a small fast team can build what the big players haven't yet shipped into our market. That window is shrinking. DENISE (the "meeting booked → close" seam) is the highest-value next build because it extends the existing FIGSY pipeline — no new front opened, maximum leverage on what's already working.

## MCP pulled forward — updated
Item #59 MCP server moved from Month 3 → Month 2 (alongside pgvector and FIGSY v2). First milestone: K.I.N.D exposes a single MCP endpoint that lets external agents call FIGSY to start a campaign. That's the distribution unlock — no UI required, no sales call needed. A Notion agent or Linear bot can trigger a K.I.N.D campaign by calling one tool. Build after 10+ clients (so there's a pipeline to trigger).

---

## §Atlas — youratlas.com (researched 5 Jun 2026)

**What they are:** Done-for-you AI Revenue Engine. Agency model, not SaaS. $5,000+ setup, 14-day white-glove build, performance guarantee ("results or you don't pay"). Target: US appointment-driven service businesses (healthcare, trades, home services, clinics).

**Three weapons:** (1) Voice AI — answers every inbound call in <30 seconds, qualifies, books, syncs CRM. (2) iMessage Outreach — clones owner's voice/style into iMessage (92% claimed open rate, contacts every new lead within 3 seconds). (3) CRM Re-engagement — works dormant lead lists automatically.

**Tagline:** "Clone your best humans." **Hook:** "60 seconds — that's where fortunes are won." **Social proof:** Dan Martell endorsement, 15,000+ businesses claimed. **No public pricing tiers.**

**Where they beat us:** Voice AI (genuine moat for call-heavy businesses), iMessage channel (novel, high open rate), done-for-you removes all friction for non-technical buyers.

**Where we beat them:** Price (not close — $29/mo vs $5,000+), self-serve, multi-agent ecosystem with shared memory, Milla, DENISE (coming), full revenue lifecycle vs one vertical, SA+US vs US-only, live in minutes not 14 days.

**Strategic read:** Different buyer, different price point — not a direct competitor today. But their *messaging discipline* (one number, one fear, one promise) is sharper than ours. Steal the copy craft, not the product. Items #61a–61e capture the steals.

---

# PART 6 — WILL NOT BUILD / PARKED
⏸ Collaborative docs · whiteboards · self-hosted · custom emoji · internal team chat · multi-year contracts (Never) · 50+ data sources (50+ clients) · African-language (after WhatsApp).
⚠️ **Note:** "LinkedIn automation — never build" is SUPERSEDED — backend is built and activates Week 1. Remove the contradictory "never" lines from MASTER (Part 8).

---

# PART 7 — RECURRING OPS (from §16, §35, §36)
**Daily:** open Admin / + /unibox + /founder brief. TTFL >4h → intervene.
**Before sales call:** create demo env, review demo playbook (11-scene script), bookmark magic link. Pre-demo setup S1–S12 (real signup, onboard, unlock SQL, 10,000 credits, real ICP, Demo Campaign, Milla doc, Vida config, clean browser).
**After every demo:** clear test leads, archive campaign, check credits, note breaks, log objections.
**Weekly (Fri):** KPI check, clients review, roadmap milestones, scalability, HubSpot deals. MRR behind → HubSpot follow-up. Past-due → email.
**Sales SOP (6 phases):** Qualification → Discovery (5 questions) → Demo → Proposal → Payment → Onboarding.

---

# PART 8 — ⚠️ CONTRADICTIONS TO FIX IN MASTER (cleanup backlog)
Found in the full read. None block launch; all should be cleaned so MASTER stops contradicting itself.

1. **Vercel still listed as a host** — §21 decisions table (L3803) literally says "Supabase + Railway + Vercel"; also L1199/1214/1775/3147 + Quick-Reference "NEXT_PUBLIC Stripe vars in Vercel ✅". → Railway only. Self-flagged at L1193–1207, not yet fixed.
2. **Launch day printed 3 ways** — §0 "MON LAUNCH" (correct) vs §19 "Launch Tuesday" (L3471) vs historical "Monday 8 June" (L1708). → Monday.
3. **Vida price $39 vs $29** — canonical $29 (corrected 3 Jun) but $39 still in Stripe product refs (L975/1395/1410), demo script (L7509), §32/§34. → $29.
4. **Pricing tables disagree** — §12 (L3023) shows $20/$38/$88 + $60/$110/$250 vs canonical $1/credit flat. → canonical.
5. **Cron count 16 vs 19** — §17/§0 say 19; bug log (L1488) + §1 say 16 (3 status crons never built). → 16.
6. **DENISE(REEVE)/LENA/OTTO Month 3 vs Year 2** — §0/§19 Month 3; §28/§32/§34 Year 2. → DENISE = #1 next build (pulled forward); LENA/OTTO = Month 3. (All MASTER "REEVE" refs = DENISE.)
7. **LinkedIn "never build" vs built** — backend exists + activates Week 1, but "never build" lines persist (L420/1772/2317/2936/§27). → built/activating.
8. **Duplicate sections** — 24/25/26/27/28 appear twice (draft L3988–4734 vs canonical L4735–6040); §27 means two different things. 5-day-plan printed twice (L2060 + L2354). → delete the draft/duplicate set + one 5-day plan.
9. **Calendly personal link残** — `calendly.com/jacques-vieiraza/30min` still in Quick-Ref (L2341/2588) though scrubbed everywhere else to `kind-ai-demo/new-meeting`. → neutral link (also a name-exposure risk — Part 2 Ring 1).
10. **"Done vs pending" conflicts** — FIGSY_KIND_CLIENT_ID / HubSpot / Calendly / migrations listed both ✅ (L1031) and ⬜ (§2/§10). → reconcile to actual Railway/Supabase state during launch.
11. **Cashflow §14** still lists "Vercel Pro $20" + "Apollo Basic $99" vs corrected (~$125 floor, Apollo $49–65). → corrected.
12. **us.app / separate-stack remnants** in the duplicated 5-day/quick-ref blocks (main copy already fixed). → single URL/DB.
13. **eu-west-1** stale note acknowledged (L419) — ensure no residual. → af-south-1.
14. **Admin cohort analytics / Portal Analytics** — some "Built" entries vs §1 "route does not exist" (never built). → not built.
15. **15-step smoke test** (old) vs 57-step suite (current). → 57-step `docs/SMOKE_TEST.md`.

---

# NUMBERS
| When | Clients | MRR |
|------|---------|-----|
| Launch (Mon) | 0 | £0 |
| Week 2–3 | 2–3 design partners | ~£2,500 |
| Month 1 | 5 (break-even all-in) | ~£4,000 |
| Month 2 | 20 + Product Hunt | ~£12,000 |
| Month 3 | 50 + agent family | ~£40,000 |
| Month 3+ | 100+ + platform intelligence | £100,000+ |
