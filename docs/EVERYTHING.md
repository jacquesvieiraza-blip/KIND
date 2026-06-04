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
- **Agents live:** FIGSY, Milla, Vida. **REEVE / LENA / OTTO = Month 3.**
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

## 🟨 MONTH 2 — intelligence layer (Tier 2 build queue, 10+ clients)
37 Intent signal detection · 38 A/B subject testing · 39 Client morning brief email · 40 ICP auto-refinement · 41 Conditional sequence branching · 42 Waterfall enrichment (Apollo→PDL→Hunter→Clearbit; needs PDL+Hunter keys) · 43 Deliverability dashboard (SPF/DKIM/DMARC+bounce+blacklist) · 44 Email score pre-send · 45 Adaptive send volume · 46 **FIGSY Memory v2 (pgvector)** · 47 Milla full-context CRM pull · 48 Vapi voice calling · 49 Product Hunt (with proof) · 50 G2 listing (5 reviews) · 51 Configurable agent triggers · 52 Multi-model toggle per campaign · 53 Inbox rotation / multiple sending domains (Instantly steal)

## 🟦 MONTH 3 — agent family + platform (Tier 3/4)
54 **REEVE** · 55 **LENA** · 56 **OTTO** · 57 Multi-agent orchestration (shared memory) · 58 500+ FIGSY skill library · 59 **MCP server** (K.I.N.D as AI infrastructure) · 60 Outcome pricing ("per meeting booked") · 61 Mobile app iOS+Android · 62 Built-in CRM (persistent prospect DB / Kanban deal view) · 63 Pan-African design partners (NG/KE/GH/EG/RW) · 64 Platform-level cross-client intelligence · 65 Data licensing marketplace · 66 ICP auto-refinement advanced · 67 Pipeline forecasting · 68 In-portal messaging · 69 Proposal + e-sign · 70 Meeting notetaker

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
6. **REEVE/LENA/OTTO Month 3 vs Year 2** — §0/§19 Month 3; §28/§32/§34 Year 2. → Month 3.
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
