# 🗺️ K.I.N.D — DOC MAP (full cross-reference · every doc audited in full)

**Purpose:** every doc in the repo, what UNIQUE content it holds, and its status — so nothing is lost and every piece is findable.
**Method:** all docs read in FULL (4-way parallel audit, 9 Jun 2026). Re-run when docs change.

## ✅ Why nothing is lost
Clean supersession chain: `MASTER.md (4 Jun archive)` → `EVERYTHING.md (8 Jun superseded)` → **`KIND-MASTER.md` (LIVE)**. Live forward roadmap = **`V2-TRACKER.md`**. This map indexes the UNIQUE content of every other doc so you always know where each piece lives.

---

## 🟢 TIER 1 — LIVE / AUTHORITATIVE (edit these)
- **`docs/KIND-MASTER.md`** — strategy bible, session log, 101-item roadmap, status.
- **`docs/V2-TRACKER.md`** — forward roadmap: releases · steals · V2 · company #88 · 15 Pieces · MCP.
- **`docs/DOC-MAP.md`** — this cross-reference.

---

## 🔵 TIER 2 — REFERENCE (LIVE, holds unique content NOT in the master — do not delete)

### Sales & money
- **`docs/sales-playbook.md`** 🔑 *only sales manual in repo.* Qualification (3 musts / disqualifiers) · 5-Q discovery framework · 6-step demo flow w/ timeboxes · **9 verbatim objection rebuttals** · proposal 3-tier (Starter500/Growth1.5k/Pro5k cr) · 3 follow-up emails · 8 loss-reasons · weekly win-metrics (50 outreach→1 close, R50k pipeline/wk; conv 10/60/67/50%).
- **`docs/run-costs-and-cashflow.md`** 🔑 *only financial model.* Fixed stack ~$125–138/mo itemised · per-lead cost ~$0.009 (≈99% margin) · Apollo plan ladder · credit price grid USD/ZAR · ARPU tiers (blended $80) · **sales-target ladder** (break-even 2/$80; $1k=13; $5k=63; $10k=125) · 3 cashflow scenarios (base ~165 clients/$13.2k MRR) · margin-by-client curve.
- **`docs/drafts/AI_REVENUE_OS_POSITIONING.md`** — **LOCKED hero = Option B** "You close the deals. We'll bring you the meetings… From $20." · "the number we own = **$20** not $29" · anti-copy list (don't borrow Atlas/Revio/Glean lines) · 6-slide deck skeleton.
- **`docs/drafts/GTM_FUNNEL_INSTRUMENTATION.md`** — #25 detail: per-stage fire-points (table+route) · gaps (no utm/source cols; no ad-spend store) · `gtm_events` schema option · **$69 bundle / 14-day+20-credit trial** · 10 open decisions.

### Product flow, demo & onboarding (designed copy/specs)
- **`docs/demo-walkthrough-script.html`** 🔑 *verbatim 12-scene demo (for #23/#31 videos).* Honesty rule (no invented numbers) · hook "price of a couple of coffees" · sign-off **"You close the deals. We'll bring you the meetings."** · "start for $20, no approval."
- **`docs/drafts/ONBOARDING_V2.md`** — 6-step flow w/ copy · 3 Loom briefs (90s/2m/90s) · **3 lifecycle emails Day-0/3/7** (subjects+branch logic+merge vars) · "first leads in <10 min" · use neutral calendly link (name-exposure).
- **`docs/setup-dashboard-preview.html`** — `/dashboard/setup` mockup: 6 onboarding steps + "Watch 60-sec demo" modals + Casey host + per-rep upsell (Google/Outlook/Zoho).
- **`docs/client-flow-sop.md`** — 7 onboarding/billing paths (self-serve/AE/pay-day-1/expired/upgrade/add-on/demo); Path-6 FIGSY add-on intentionally manual; demo creation inputs.
- **`docs/GETTING_STARTED.md`** — client 10-min onboarding guide; agent roster one-liners; support `hello@get-kind.com`.
- **`docs/CLIENT_FLOW.html` / `CLIENT_FLOW_PER_REP.html`** — journey + **#88 per-rep design** (fully in V2-TRACKER §C); agent pricing legend (FIGSY pay-per-result · Milla $49 · Vida $29 · Denise $99).
- **`docs/portal-v2-layout.md` / `docs/portal-v2-preview.html`** — V2 concept specs + build notes (reuse FIGSY chat for conversational setup; thinking-state polls status endpoints). **portal-v2-preview** also has: profile-dropdown exact items, Invite modal, Notetaker (.txt/.mp3→owner+deadline), Teams Hub tabs, **Casey full design (coral #ea6a3a, portal-only)**, Train-FIGSY tabs (Persona/Knowledge/Guardrails/Approvals/Test), Smart-Inbox 8-tag taxonomy + "Help me reply", Sequence-builder 8 presets (AI Magic Beta…).
- **`docs/content/blog-articles.md`** — 3 publish-ready posts (WhatsApp-B2B-Africa · cold-reply-rates-Africa · AI-vs-human-SDR) w/ slugs+meta.
- **`docs/content/youtube-plan.md`** — 10-video plan (titles/briefs/CTAs). ✅ reframed to faceless brand voice (no founder name/face) per the faceless-brand decision.

### Ops, deploy, infra, legal, security
- **`docs/SMOKE_TEST.md`** 🔑 *step-level T1–T10 (master only has names).* Pre-flight migration `20260603_schema_reconcile.sql` + `RESEND_WEBHOOK_SECRET`; per-test specifics (T3 send-from `gettingkind.com`; T6 Vida purple-not-blue; T8 mail-tester 10/10; T9 `client_members`; T10 partner sandbox).
- **`docs/DEPLOY-CHECKLIST.md`** — migration order 010→013 + why; **DELETE `NEXT_PUBLIC_ADMIN_KEY`** (browser-bundle secret leak); build marker `KIND API build:<sha>`; rollback plan.
- **`docs/DEPLOYMENT_GUIDE.md`** — 90-min deploy; full env-var-per-service; **6 Railway crons** w/ schedules+endpoints; Workspace SPF/DKIM/DMARC values; disable email-confirm. ⚠️ dated 2 Jun, partly stale (refs old MASTER.md).
- **`docs/legal.md`** 🔑 — Apollo ToS exposure; **50-CLIENT TRIGGER** (email partnerships@apollo.io before client 51); 4 structural options; 7 lawyer questions; data-source comparison (Cognism/ZoomInfo/Clay/Hunter).
- **`docs/legal/legal-pack.md`** 🔑 — Co.No **17260532**; **ICO reg PENDING "do this week" £40/yr** (penalty £400–4k); 72-hr breach window; DPAs (Railway/Supabase/Stripe/Resend/Apollo/Anthropic); NDPR >1k NG subjects; Kenya ODPC M3; **D&O ins £500–1k M2**; trademark plan (UK IPO→ARIPO, classes 35/42/45); VAT £90k; **Clause 17.2 employment risk accepted**.
- **`docs/legal/it-security-pack.md`** 🔑 — 4-tier data classification; **LIVE incident register: 4 Jun T1 credential exposure ("keys pasted in chat") → pending rotation** (origin of the 2-crown-jewel item); RTO 4h/RPO 24h; retention schedule (billing 7yr); pen-test M3 £2–5k.
- **`docs/legal/seis-advance-assurance-draft.md`** — **registered office 33 Townsend Road, Stratford-upon-Avon CV37 7DE**; SEIS conditions (≤£200k assets, <25 FTE, £150k cap); UKIPO trademark table £170/class (file "KIND" not "K.I.N.D"; Milla/Vida distinctiveness risk).
- **`docs/render-cloudflare-failover.md`** — API standby (~$12/mo, Render Oregon `kind-api-standby`, `render.yaml`); Cloudflare LB health-check `/health` 30s; env-var copy list.
- **`docs/portal-admin-failover.md`** — portal/admin standby (~$14/mo); health paths `/login` & `/health`. ⚠️ still lists `NEXT_PUBLIC_ADMIN_KEY` (contradicts DEPLOY-CHECKLIST delete).
- **`FULL_CHECK.md`** — mandatory audit protocol (`bash scripts/full-check.sh`); brand locks (#7c3aed only, no cropped agent imgs); dead-code targets.
- **`AGENT_AVATARS.md`** 🔑 — verbatim Midjourney/DALL-E prompts for FIGSY/Milla/Vida (only home of avatar prompts); PNG 512/1024 → `apps/portal/public/agents/`.
- **`supabase/seeds/competitor_icps_readme.md`** — 4 competitor-targeting ICP configs (Lemlist/Instantly/Clay/Apollo users, 60–115 leads/run) for #26 dogfood.
- **`CHANGELOG.md`** — granular V2 UI spec: 9 reply-classification codes+colours; 6 campaign templates; Compass 7 tabs; brand tokens. (Note: older `#0066FF` FIGSY blue — superseded by purple #7c3aed.)

---

## ⚫ TIER 3 — SUPERSEDED / ARCHIVE (DO NOT USE; mined — unique bits noted)
- **`MASTER.md`** (root) 🗄️ — **sole home of the full §20 ALTA DEEP AUDIT** (Rachelle's 26-min Fathom demo · 13 subsystems from 28 screenshots · Alta's real numbers 60,845 prospects/158 meetings/**6% reply/53% revival/4-day** — *these are the source of the pitch-deck claims*). → fold a pointer into V2-TRACKER steals.
- **`docs/EVERYTHING.md`** 🗄️ — sole home of: **#60 outcome-pricing full math** (28% margin floor, $15/reply, $40/meeting) · #54 DENISE persona (codename REEVE) · macro-stat list · Atlas/Revio deep-scrape · **F1–F5 funding table** · **PART 8 = 15 MASTER.md contradictions to fix** · staging PART 4B detail.
- **`docs/archive/KIND_Roadmap.md`** 🗄️ — LLM model-routing table (Haiku vs Sonnet) · 5-yr revenue vision · full credit-bundle grid · internal-agent endpoints.
- **`docs/archive/KIND_SOP.md`** 🗄️ — full 7-phase sales SOP · 9-Q discovery · ECTA Order-Form signature flow · POPIA consent matrix · escalation matrix. (Pre-pivot DFY pricing.)
- **`docs/updates-live/roadmap-audit-14-may-2026.md`** 🗄️ — **most complete API/endpoint catalogue (50+ across 13 routers)** · founder-agent stack detail · "calendar integration absent (hardcoded calendly string)" gap.
- **`docs/updates-live/client-journey-flowchart.html`** 🗄️ — deep **FIGSY Voice (Vapi+Twilio +27) + WhatsApp (Day-2 template→free-form) + Partner/white-label** design; POPIA legitimate-interest specifics. (Paystack-era.)
- **`docs/client-flow-visual.html`** 🗄️ — cron schedule (Milla 07:30 UTC etc.) · credit mechanics · risk events. (Vida $39 = stale.)
- **`docs/roadmap-flowchart.html`** 🗄️ — 57-step smoke suite · Stripe test card 4242 · edge thresholds. (31-May/REEVE-era.)
- **`AUDIT.md` / `BUILD_STATUS.md`** 🗄️ — May sprint (avatar SVG descriptions; 34-item build list). Mostly duplicate CHANGELOG.
- **`docs/MASTER_TODO.md` / `docs/SESSION-HANDOFF-7JUN.md`** 🗄️ — stale redirects; SESSION-HANDOFF has one unique bit: Pipeline-value $1,013,000 = est not booked → "Est. pipeline value" relabel.
- **`docs/KIND_DECK.html`** (4.2 MB) / `docs/kind-pitch-deck.html` 🗄️/⚠️ — investor deck. **⚠️ HONESTY FLAG: pitch-deck "6% reply / 53% revival / 4-day" are ALTA's account numbers, not K.I.N.D's** — must not present as our results.

---

## 🧹 TIER 4 — CLEANUP / CONTRADICTIONS TO RESOLVE
1. `README.md` (root) — **EMPTY** → add repo intro + link KIND-MASTER.
2. **Vida price:** $29 (CLIENT_FLOW/master, authoritative) vs **$39** (client-flow-visual, roadmap-flowchart, AGENT_AVATARS era). Fix the $39 refs.
3. **`NEXT_PUBLIC_ADMIN_KEY`:** DELETE (DEPLOY-CHECKLIST) vs still-listed (portal-admin-failover). Reconcile.
4. **Cron count:** 16 (master) vs 19 (pitch deck) vs 6 (DEPLOYMENT_GUIDE). Establish true count.
5. **Pitch-deck Alta-number provenance** (above) — relabel or remove.
6. ✅ **RESOLVED** — `youtube-plan` reframed to faceless brand voice (no founder name/face).
7. Milla wording: "The Brain" vs "Virtual Assistant".
8. The **15 MASTER.md contradictions** (EVERYTHING.md Part 8) — full cleanup list.
9. Move root `MASTER.md`/`AUDIT.md`/`BUILD_STATUS.md` → `docs/archive/`.

---

## 📌 NOT roadmap docs (live product/site — leave alone)
`apps/website/*.html`, `apps/landing/*.html`, `apps/portal/public/{terms,privacy}.html`.
