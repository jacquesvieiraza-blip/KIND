# 🚀 K.I.N.D — THE LAUNCH PAD (tomorrow → Sep, every item, numbered)

> **What this is:** the single, exhaustive run-list from **now → launch → the first quarter**, built off a full audit of all three core docs (`KIND-MASTER` · `PRODUCT-INVENTORY` · `V2-TRACKER`), **every** secondary doc in the repo (deploy/deliverability/smoke/legal/GTM/funding), and the **live git + PR state**. Nothing here is from memory.
> **Owner key:** 🧍 founder · 🤖 Claude · 🤝 both · **⏰ = hard deadline / external lead-time** (do early, it can't be rushed later).
> **Created 14 Jun 2026. Today = Sun 14 Jun. Launch = 🚀 Fri 19 Jun 2026.** Where docs conflict, the **12-Jun top-of-master plan governs** (Mon 15 company ship · Fri 19 launch · everything else post-19).

---

## 0 · WHERE WE ACTUALLY ARE RIGHT NOW (verified state)

- **Live on `main`:** the marketing website refresh (The Drop, Prompt Library, Get-a-Demo, AI-Family, POPIA polish) + the **restored Admin Portal** (crash + data-query fixes, #547–#549). That is *all* that's live.
- **The real launch product is NOT live yet** — it's held on **PR #502** (`claude/kind-carson-MYhSl`, ~213 commits ahead, "DO NOT MERGE until go-live"): portal audit fixes, API hardening (rate-limit, atomic credits, counter-drift kill), deliverability D1–D5, warmup cap, dormant PDL multi-source, admin security.
- **The "purple" feature queue = 20 open PRs #506–#525 (R1–R20)** + the V2 staging screens behind the `NEXT_PUBLIC_FEATURE_V2_SCREENS` flag (currently OFF → live product is still v1).
- **Smoke tests T1 done; T3–T7, T9, T10 NOT STARTED** — the single biggest launch risk.
- **Deploy targets:** website → Cloudflare Pages (+ Railway static primary); api/portal/admin → Railway auto-deploy from `main`.

---

## 1 · ⏰ DEADLINE-DRIVEN — START THESE TODAY (they have external clocks)

These do **not** wait for a calendar slot — the lead time is the constraint. All 🧍.

1. ⏰ **Email `partners@apollo.io`** — API reseller/partner agreement. **~1 week lead.** *(Inventory 103.)* Also note the separate **50-client trigger**: before client #51, email `partnerships@apollo.io` for the reseller agreement or the single key risks termination for all clients (`legal.md`).
2. ⏰ **ICO registration** — ico.org.uk, **£40/yr**, "do THIS WEEK," penalty £400–4k. *(Legal #10, `legal-pack.md`.)*
3. ⏰ **SEIS advance assurance** — HMRC takes **4–8 weeks**; needs an accountant to fill the `[INSERT]` placeholders first. Start now if you want funding optionality. *(`seis-advance-assurance-draft.md`.)*
4. ⏰ **Trademark clearance search** — **5–7 working days** before any UKIPO filing; file "KIND" (not "K.I.N.D"); Milla/Vida have distinctiveness risk. *(`legal-pack.md`.)*
5. ⏰ **Meta/WhatsApp Business API application** — **3–7 day** approval window. *(Inventory 128 / #22 — needed for Vida WhatsApp, Month 2.)*
6. ⏰ **F1 funding — free cloud/AI credits** (Microsoft/Google/AWS, tens of $K) — "do this week," zero dilution. *(Master funding F1.)*
7. 🔑 **Sign up hunter.io + peopledatalabs.com** → save both API keys. *(Inventory 104 → lights up 94/95.)*
8. ⚖️ **Corporation Tax registration** — within **3 months** of first trading (so the clock starts at launch). *(`legal-pack.md`.)*

---

## 2 · DAY-BY-DAY TO LAUNCH

### 📅 SUN 14 (today) — 🧍 legal + deliverability + keys
- ⚖️ **Legal pack #10–14:** ICO (£40) · SR01 home-address suppression (free) · registered office/service address (~£20–50/yr) · WHOIS privacy verify · **LinkedIn lockdown**. *(Inventory 102.)*
- 📡 **D9 deliverability 10/10** — run `DELIVERABILITY-D9-CHECKLIST.md` to a mail-tester/GlockApps **10/10**. *(Inventory 101.)*
- ✉️🔑 Section 1 items (Apollo email, hunter/PDL signups) if not already done.

### 📅 MON 15 — 🏢 THE COMPANY SHIP → PROD (the only early ship, ~45 min) 🤝
**Pre-merge migrations, in this exact order (🧍, before merging #502):** `010_crm_dedup` → `011_denise` → `012_signer_and_booking` *(without it `PATCH /clients/me` breaks)* → `013_nullable_sent_email_refs` *(unblocks warmup cap)*. Then the prod keystone **`20260603_schema_reconcile.sql`** *(reply/send/credit pipeline depends on it — skip it and every reply insert fails → "0 replies" everywhere)*.
**Env vars on Railway (🧍) — set before/at merge:** `ADMIN_SECRET_KEY` *(admin dies without it)* · `RESEND_API_KEY` · `RESEND_WEBHOOK_SECRET` · `ANTHROPIC_API_KEY` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` · **`STRIPE_PRICE_DENISE_MONTHLY` (the $39 price — else checkout charges $99)**. **DELETE `NEXT_PUBLIC_ADMIN_KEY`** (it leaks the admin secret into the browser bundle). Leave `TRACKING_URL` UNSET until `api.get-kind.com` DNS resolves.
**The ship (🧍):**
1. Merge `claude/kind-carson-MYhSl` → `staging` (PR base `staging`)
2. Re-paste `staging-schema.sql` in `kind-staging` SQL editor → Run (adds `enabled_agents`)
3. Redeploy **both** `api-staging` + `heartfelt-essence` — do **NOT** re-run the company seed
4. Run `COMPANY-ENGINE-TEST.md` top-to-bottom (incl. Test 7 agent toggles) *(Inventory 55/56)*
5. **Stripe:** create the **$39 Denise price** *(58)* + **pool-topup products** (lead-gen $1 · FIGSY $3) *(57)*
6. **Ship to prod:** run `20260612_company_engine.sql` on prod Supabase → merge `staging`→`main` → set `NEXT_PUBLIC_FEATURE_V2_SCREENS=company` **ONLY** → fund the demo pool → smoke `/dashboard/company` live
7. **Upload the 5 agreement PDFs** via Admin → Terms Library (else no order form can be sent).
**🤖 Claude:** Stripe → company pool billing lands · fix any smoke failures same-day.

### 📅 TUE 16 — 🤖 builds · 🧍 light
- 🤖 **113a agent side-panel** — make all 5 agents (FIGSY/Milla/Vida/Denise/**Casey**) conversational + acts-in-place; build Denise + Casey chat endpoints; wire Casey into the picker. *(Inventory 113a.)*
- 🤖 Start the locked redesigns: inbox-v2 (112) · "AI Family" cards (125) · sequence-builder recolor (82).
- 🧍 Review Tuesday's builds when handed over. **Give me Casey's voice/tone** — it gates the onboarding-agent build (121).

### 📅 WED 17 — 🧪 smoke + builds 🤝
- 🧍 **Smoke tests T3–T7, T9, T10** *(Inventory 100)* — T3 FIGSY send from `hello@gettingkind.com` (cold domain) → reply→hot→pause · T4 booking + `meetings_booked` · T5 billing idempotency + Milla 403 · T6 Vida widget (purple, captures lead) · T7 non-Milla clients get no Milla mail · T9 team invites (~10/workspace) · T10 partner onboarding (Nigeria, referral + commission).
- 🤖 Continue locked redesigns + invoicing 136a scaffold · fix smoke failures same-day.

### 📅 THU 18 — 🚦 GO / NO-GO GATE 🤝
**Green needed:** D9 10/10 · smoke T3–T10 green · legal #10–14 done · warmup ~50/day. **Any red → slip launch to Mon 22** (no half-baked launch).

### 📅 FRI 19 — 🚀 LAUNCH (Africa-only)
- Proven core already on `main`. Go live.
- 🎥 **Drop 01 walkthrough (60s) goes live** in `the-drop.html` (see §4 — record this week).
- 🤖 Stand up week-1 GTM support · monitor · hotfix.

---

## 3 · 🟣 THE PURPLE GO-LIVE — "everything live on/after the 20th"

> Your call: flip the built-but-held queue live right after launch. Mechanically this is a **merge + migrate + flag + smoke** sequence, not one switch. 🧍 merges, 🤖 preps + smokes each.

### 📅 SAT 20 onward — the merge sequence
1. **#502 already merged Mon 15** (company engine). The rest of its portal/API fixes are live with it.
2. **Merge the R1–R20 release train — PRs #506–#525** (🧍 click, 🤖 prep order + run each additive migration: R2/R15/R20 carry migrations). Lands live:
   - R1 demo-bounce guard (#506, inv 60) · R2 daily brief (#507, 61) · R3 Vida help bubble (#508, 62) · R4 speed-to-lead (#509, 63) · R5 milestone share cards (#510, 64) · R6 onboarding emails (#511, 65) · R7 Unibox AI reply (#512, 66) · R8 saved views (#513, 67) · R9 "Why FIGSY wrote this" (#514, 68) · R10 Goals (#515, 69) · R11 template library (#516, 70) · R12 lead-capture forms (#517, 71) · R13 Cmd+K (#518, 72) · R14 Meeting-Prep (#519, 73) · R15 Train-FIGSY backend (#520, 74) · R16 evals (#521, 75) · R17 spam-score (#522, 76) · R18 multi-model toggle (#523, 77) · R19 What's New feed (#524, 78) · R20 job-change alerts (#525, 79).
3. **Flip the V2 staging screens live** by adding keys to `NEXT_PUBLIC_FEATURE_V2_SCREENS` (currently `company` only): Teams Hub (80) · Notetaker (81) · Sequence Builder (82) · Integrations (83) · Shell redesign (85–87) · Activity feed (88) · Notifications (89) · Deliverability (90) · PWA (91) · AI-Family cards (125) · 113a panels. Flip in batches, smoke each.
4. **Signup + SSO (84)** stays held until Google/Microsoft OAuth is registered (126).

### ⚠️ Held by your own Credibility Rule (don't flip empty)
- **The Drop / Watch / Product Videos (93, 163)** — go live only once the **Drop 01 video exists** (§4).
- **Social footer links (164)** — built, hidden until the profiles have real content.
- **Subscribe-to-the-drop (117)** — blocked on Drop content.

---

## 4 · 🎥 VIDEO & CONTENT — the 🧍-only bottleneck (the GTM unlock)

> Infra is built (slots ready). The blocker is **recording — only you can.** Workflow: record → YouTube → paste the video ID → live. Never a code change.

- **This week (for launch):** Drop 01 walkthrough (60s, the live core loop) → live Fri 19. *(Inventory 129.)*
- **This week:** 3 onboarding Looms (90s/2m/90s — signup · ICP builder · first campaign). *(129.)*
- **Week 1–2:** homepage hero loop (90s silent cut of the same footage, 130) · FIGSY full demo (12–15 min, `youtube-plan.md`).
- **Ongoing cadence:** every release wave = **one Drop = one 60s video + one LinkedIn post + one email** ("the release train IS the content calendar"). New drop ~monthly, never empty.
- ⚠️ **Decisions you owe:** confirm the neutral Calendly link (`calendly.com/kind-ai-demo/...`, NOT your personal one — name-exposure) · resolve the `youtube-plan.md` "Jacques on camera" vs faceless-brand conflict · pick the lifecycle email provider (ConvertKit/Mailchimp, #35/36).

---

## 5 · GTM KICKOFF (launch week → Month 1) — the 3 legs

> North-star: cold outreach is necessary but not sufficient. **Content is the missing leg — it's the focus.**

**Leg 1 · Outbound (running):** FIGSY dogfood — scale the warmup; point FIGSY at the competitor-switcher ICPs (`competitor_icps.sql` — 🧍 set `FIGSY_KIND_CLIENT_ID`, replace the placeholder UUID, run, trigger). *(Inventory 132 / #26.)*
**Leg 2 · Content/Inbound (the gap):** Drop 01 + per-drop videos (§4) · founder LinkedIn 1/day build-in-public (127/#20) · blog/SEO · YouTube channel (134/#35).
**Leg 3 · Partners (highest-leverage):** replicate the Demmy model — 1 partner each Kenya + Ghana in month 1–2; partner onboarding tested in T10.

**Week-1 GTM run-list (🧍 unless noted):** 127 — 10 warm outreach + LinkedIn 1/day + activate PhantomBuster (run `20260602_linkedin_queue.sql` + keys) · 128 — Meta/WhatsApp application (⏰ §1) · 131 — 🤝 GTM funnel instrumentation (BLOCKED on 10 analytics decisions in `GTM_FUNNEL_INSTRUMENTATION.md`: PostHog vs GA4, attribution, trial→paid window, UTM columns) · 130 — 🤖 homepage hero = real product loop (blocked on the demo recording) · 132 — dogfood + fresh-signup check.
**Weeks 2–4 GTM:** 133 — 2 design-partner slots → case study + logo · 134 — 9:16 social cuts + YouTube channel · 135 — onboarding v2 emails + playbook form (ConvertKit) · 137 — 90-day guarantee (ToS clause still needed) + Revenue Playbook call + homepage outcome numbers (real data) · 138 — influencer/community distribution · 136 — Flutterwave activation (ZAR/NGN/KES/GHS).
**Africa priority order:** SA → Nigeria → Kenya (fast-follow ~Q4) → Ghana (partner-led) → Egypt (defer). US deferred until ~$10–20k MRR / 25+ clients / >85% retention / beating the US 3.4% reply average.

---

## 6 · MONTH 1 (Fri 19 Jun → ~19 Jul) — LAUNCH + CLEAR THE QUEUE
**Goal: launch clean · onboard first pilots · ship the post-19 queue fast (velocity = the moat).**
**Targets: 5 clients (break-even) · ~£2.5K MRR (design partners) · demo recorded · LinkedIn live.**
- 🤖 **Ship the locked design queue:** Alta-style inbox rebuild (112 — the big one) · "AI Family" cards (125) · sequence-builder recolor (82) · 113a panels · the R1–R20 train · shell redesign.
- 🤖 **Activate the dormant yellows:** PDL (94) + Hunter waterfall (95) once keys are set · A/B subject UI (113) over the live backend (97) · finish site nav rewire (118).
- 🤖 **Money & admin cleanup:** client invoicing live (136a — USD, no VAT until benchmark, Stripe-issued, under Company → Documents) · Partner Hub earnings ZAR→USD · Flutterwave/2nd-processor decision.
- 🤖 **Company-engine hardening:** invite-email delivery (106) · owner drill-down (107) · edit/deactivate rep (108) · manager role + notifications (109) · per-rep routing + CRM dedup (110) · per-rep calendars (111). *Dated target: #88 "Company OS" fully on prod by **Tue 30 Jun**.*
- 🧍 **First clients:** onboard the multi-rep client + partner pipeline; pilot feedback drives the next sprint.
- 🧍 **Decision-gated builds** waiting on you: Casey voice/tone (121) · pgvector switch for Memory v2 (120) · Flutterwave (136).
- 🧍 Y16 — kill the dead Vercel↔GitHub integration (122, post-launch).

---

## 7 · MONTH 2 (late Jul → Aug) — INTELLIGENCE LAYER 🔒 GATED: ~10+ paying clients
**Targets: 10+ clients · ~£12K MRR · Product Hunt · MCP live · V2 redesign ~50%.**
- **The Learning Engine** (build order: Train-FIGSY RAG → evals → outcome feedback loop → contextual bandit → memory/pgvector #46 → model routing; fine-tuning parked last). *None of this blocks the 19th.*
- Intent signals · ICP auto-refine (L2) · conditional branching · adaptive send volume · waterfall enrichment live · Milla CRM pull · multi-model per campaign · inbox rotation.
- **Context-backed MCP server (#59)** — distribution unlock, pulled forward to Month 2 · Product Hunt + G2 listings · ★ shared winning-play library.
- ⚖️ Month-2 legal: D&O insurance (~£500–1k) · trademark filing (after clearance) · NDPR/Kenya ODPC prep.

---

## 8 · MONTH 3 (Aug → Sep) — AGENT FAMILY + PRICING 🔒 GATED: unit margin ≥ ~28%
**Targets: ~50 clients · ~£40K MRR · L2 learning live · ≥28% gross margin (unlocks outcome pricing).**
- **DENISE deep build (#54/144):** auto-book · call-join notetaker · objection handling · proposal-from-transcript · Vapi voice (she owns the phone).
- **LENA** (Customer Success, 145) · **TONY** (Operations) · multi-agent orchestration (146) · 500+ skill library.
- **Outcome pricing per meeting (#60/147)** — gated ≥28% margin ($40/meeting model) · built-in CRM Kanban · mobile PWA (gated MRR >£8K) · pan-African design partners · proposal e-sign + Zoom notetaker (149).
- ⚖️ Pen test (~£2–5k) · Kenya ODPC.

---

## 9 · YEAR 2 (2027) — ENTERPRISE 🔒 GATED: 50+ clients
Cross-client intelligence L4 (150) · data-licensing marketplace · ICP L3 · pipeline forecasting · in-portal messaging · ISO 27001 + 42001 + SOC 2 via Vanta (~£70K, 151) · 3-type memory · visitor de-anon · churn scoring · revenue forecasting · call intelligence (152) · the "15 Pieces" (153–161, each trigger-gated).

---

## 10 · PARALLEL / ONGOING (every week, no single date)
- **Deliverability monitoring** — warmup is a multi-day ramp (started 9 Jun, 10→50/day); full volume ~1–2 weeks post-launch. Deliverability is K.I.N.D's job, never the client's.
- **Funding ladder** — F1 credits now → F2 SA ecosystem (5–10 clients) → F3 YC (paying clients) → F4 revenue-based financing → F5 influencer lever. **Revisit at 20–30 clients (from leverage, not need).**
- **Legal rings** — Corp Tax (3mo) · VAT at £90k · Shareholders' Agreement before any investor · incident register.
- **Content cadence** — 1 shipping moment = 3 pieces (video + LinkedIn + email), monthly Drop.
- **Tech debt** — admin RLS refactor · delete dormant Portal-V2 · key rotation hygiene.

---

## 11 · 🚩 HONESTY & CLEANUP FLAGS (resolve before they bite at launch)
- **Sales deck + `sales-playbook.md` quote Alta's numbers as ours** (6% reply / 53% revival / 4-day / "8% reply" / R420k) — fix or remove before showing clients/investors. *(MASTER.md §20, DOC-MAP.)*
- **`denise` page is ungated** — non-subscribers can reach it (add the subscription check). *(MORNING-FIXLOG.)*
- **Portal `roadmap` page hardcodes ~80 features as "Live" to clients** — needs your call on what it shows.
- **`NEXT_PUBLIC_ADMIN_KEY` contradiction** — DEPLOY-CHECKLIST says DELETE; `portal-admin-failover` still lists it. Follow DELETE.
- **ZAR vs USD pricing** drift in `DEPLOYMENT_GUIDE` (stale) vs canonical USD.
- **4 Jun credential exposure** still "pending rotation" in the incident register — the 2 crown-jewels were rotated 11 Jun; confirm nothing else outstanding.
- **Cron count** unestablished (6 vs 16 vs 19 across docs) — verify the true set at Railway setup.
- **Settings prefs are localStorage-only** (writing-style/notifications don't persist).
- **README.md is empty.**

---

## 12 · OWNER SPLIT AT A GLANCE
- **🧍 Only you can:** all legal/keys/accounts (§1) · the Mon-15 ship clicks + Stripe prices + env vars · smoke tests · video recordings (§4) · LinkedIn/outreach · merge approvals · the decision-gated inputs (Casey voice, pgvector, Flutterwave, funnel analytics).
- **🤖 Only I do:** Stripe pool billing · 113a + locked redesigns · the R-train prep · company-engine hardening · invoicing · activating dormant integrations · drafting all content copy.
- **🤝 Together:** Go/No-Go gate · GTM funnel instrumentation · the purple go-live merge sequence.

---
_Source-of-truth: `KIND-MASTER.md` governs where any doc conflicts. This launch pad is a derived run-list — when an item moves, update the master SESSION LOG + the relevant doc, then this. Built 14 Jun 2026 off a full five-source audit (3 core docs + every secondary doc + live git/PR state)._
