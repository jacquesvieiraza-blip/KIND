# 🚀 K.I.N.D — THE LAUNCH PAD (tomorrow → Sep, every item, numbered)

> ## 🧭 VERIFIED STATE — read this first
> _Single source of ground truth. Update this block whenever state changes so a cold resume (me, Manus, or you) never has to guess._
> - **Last verified:** 2026-06-15 13:13 UTC (Mon — **end of day, ship complete**). **⏰ HARD DEADLINE — everything verified + fixed by THU 18 (founder away Fri 19).** The product is already live; the week = prove + fix, not merge.
> - **✅ MON 15 DONE:** Company Engine + #502 superset (R1–R20) LIVE · 3 R-train migrations run · Hunter+PDL keys set · 21 PRs closed · Denise $39 · 5 terms docs uploaded. **Only open product PR: #503 (website).** Next = TUE 16 billing correctness.
> - **`main` HEAD:** `288230b` (Merge #565). **#502 shipped to prod via #564 + hotfix #565.**
> - **✅ LIVE ON PROD — #502 was a SUPERSET, so the WHOLE product shipped:** 🏢 Company Engine · API/portal hardening · design screens 80–91 · **AND all 20 R-wave features R1–R20** (their code was on the #502 dev branch — verified by grep). Portal loads, credits (999,839) + activity + FIGSY panel verified. **Everything else = pending the feature-verification walk (§2).**
> - **➡️ R-train PRs #506–#525 are REDUNDANT → CLOSE them** (code already live; merging = conflicts). Also close old **#502** (superseded by #564).
> - **🗄️ 3 prod migrations still owed** (code live, schema missing): **R2** `clients.daily_brief_enabled` · **R15** `figsy_knowledge` · **R20** `leads.job_changed_at`+`previous_company`. Run on the PRODUCTION project.
> - **✅ DONE today:** prod migrations applied to PRODUCTION project (morning runs had gone to staging — fixed, recovered) · ICO (C1959926) · #563/#564/#565 merged.
> - **🔑 Pending env:** set `HUNTER_API_KEY` + `PDL_API_KEY` on Railway `api`.
> - **⬜ Still sealed:** only the website box **#503**.
> - **Flag:** `NEXT_PUBLIC_FEATURE_V2_SCREENS = all`.
> - **RLS / per-rep access control = FAST-FOLLOW** (55a / R11) — before onboarding the 50-rep client.
> - **Process lock:** **confirm the Supabase project name before every SQL run** (morning runs hit staging — recovered).
> - **The 4 canonical docs:** `KIND-MASTER` (governs) · this `LAUNCH-PAD` (the wake-up runlist) · `PRODUCT-INVENTORY` · `V2-TRACKER`. No fifth doc.

> **What this is:** the single, exhaustive run-list from **now → launch → the first quarter**, built off a full audit of all three core docs (`KIND-MASTER` · `PRODUCT-INVENTORY` · `V2-TRACKER`), **every** secondary doc in the repo (deploy/deliverability/smoke/legal/GTM/funding), and the **live git + PR state**. Nothing here is from memory.
> **Owner key:** 🧍 founder · 🤖 Claude · 🤝 both · **⏰ = hard deadline / external lead-time** (do early, it can't be rushed later).
> **Created 14 Jun 2026 · revised 15 Jun (Company Ship in progress). Launch = 🚀 Fri 19 Jun 2026.** Where docs conflict, **KIND-MASTER governs**; the 🧭 VERIFIED STATE block above is the current live truth.

---

## 0 · WHERE WE ACTUALLY ARE RIGHT NOW (verified state)

- **Live on `main`:** the marketing website refresh (The Drop, Prompt Library, Get-a-Demo, AI-Family, POPIA polish) + the **restored Admin Portal** (crash + data-query fixes, #547–#549). That is *all* that's live.
- **The real launch product is NOT live yet** — it's held on **PR #502** (`claude/kind-carson-MYhSl`, ~213 commits ahead, "DO NOT MERGE until go-live"): portal audit fixes, API hardening (rate-limit, atomic credits, counter-drift kill), deliverability D1–D5, warmup cap, dormant PDL multi-source, admin security.
- **The "purple" feature queue = 20 open PRs #506–#525 (R1–R20)** — pulled forward to Wed 17 / Thu 18 (see §2). The V2 screen flag `NEXT_PUBLIC_FEATURE_V2_SCREENS = all` (exposes `company` + the live cosmetics; leave as-is).
- **Smoke tests T1 done; T3–T7, T9, T10 NOT STARTED** — the single biggest launch risk.
- **Deploy targets:** website → Cloudflare Pages (+ Railway static primary); api/portal/admin → Railway auto-deploy from `main`.

---

## 1 · ⏰ DEADLINE-DRIVEN — START THESE TODAY (they have external clocks)

These do **not** wait for a calendar slot — the lead time is the constraint. All 🧍.

1. ✅ **Email `partners@apollo.io`** — API reseller/partner agreement. **~1 week lead. ✅ SENT 14 Jun (awaiting reply).** *(Inventory 103.)* **Note (corrected per KIND-MASTER 10 Jun):** there is **no 50-client rule** — that threshold was invented; reselling Apollo data off one account violates ToS **from client #1**, so the reseller agreement (or client-brings-own-key) is the structural fix from day one, not a future trigger.
2. ✅ **ICO registration — DONE 15 Jun (application `C1959926`, direct debit set).** *(Legal #10, `legal-pack.md`.)*
3. ⏰ **SEIS advance assurance** — HMRC takes **4–8 weeks**; needs an accountant to fill the `[INSERT]` placeholders first. Start now if you want funding optionality. *(`seis-advance-assurance-draft.md`.)*
4. ⏰ **Trademark clearance search** — **5–7 working days** before any UKIPO filing; file "KIND" (not "K.I.N.D"); Milla/Vida have distinctiveness risk. *(`legal-pack.md`.)*
5. ⏰ **Meta/WhatsApp Business API application** — **3–7 day** approval window. *(Inventory 128 / #22 — needed for Vida WhatsApp, Month 2.)*
6. ⏰ **F1 funding — free cloud/AI credits** (Microsoft/Google/AWS, tens of $K) — "do this week," zero dilution. *(Master funding F1.)*
7. 🔑 **Sign up hunter.io + peopledatalabs.com** → save both API keys → paste to Claude (sets `HUNTER_API_KEY` + `PDL_API_KEY` on Railway `api`). **STILL PENDING.** *(Inventory 104 → lights up 94/95.)*
8. ⚖️ **Corporation Tax registration** — within **3 months** of first trading (so the clock starts at launch). *(`legal-pack.md`.)*

---

## 2 · DAY-BY-DAY TO LAUNCH

### 📅 SUN 14 (today) — 🧍 KEEP IT LIGHT (clear-mind decision 14 Jun)
> **Nothing here has a hard *same-day* deadline** — the "start today" framing was about lead times, not the calendar. So today stays light; the legal pack moves to **Tue 16** to be done with a clear head. Only do these today if you've got the energy:
- ✅ **Apollo email — DONE** (sent 14 Jun).
- 📡 **D9 deliverability 10/10** — run `DELIVERABILITY-D9-CHECKLIST.md` to a mail-tester/GlockApps **10/10** (🤖-assisted; it's the Thu-18 launch gate, so worth nudging this week). *(Inventory 101.)*
- *(Optional)* 🔑 hunter.io + PDL signups if you're at the desk — otherwise Tue.
- **→ Moved to Tue 16:** the whole legal pack #10–14 (ICO, SR01, registered office, WHOIS, LinkedIn) + trademark search + Meta/WhatsApp application.

### 📅 MON 15 — 🏢 THE COMPANY SHIP → PROD (straight to prod, no staging — decided 15 Jun) 🤝
**✅ DONE this session:**
- ✅ **All 7 prod migrations applied** in order: `010_crm_dedup` → `011_denise` → `012_signer_and_booking` → `013_nullable_sent_email_refs` → keystone `20260603_schema_reconcile.sql` → `20260612_company_engine.sql` *(NOT 20260611 — superseded; verified the deployed code uses the 20260612 `companies` model)* → companion tables (linkedin_queue · approval_queue · chat_messages · push_subscriptions · calendar_bookings).
- ✅ **Env vars verified** — `api` has all 6 required (`ADMIN_SECRET_KEY · RESEND_API_KEY · RESEND_WEBHOOK_SECRET · ANTHROPIC_API_KEY · SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY`); `NEXT_PUBLIC_ADMIN_KEY` already absent (nothing to delete); `STRIPE_PRICE_DENISE_MONTHLY` exists (⚠️ verify it's the $39 price in the Stripe step).
- ✅ **Flag** `NEXT_PUBLIC_FEATURE_V2_SCREENS = all` — **leave as-is** (already exposes `company`; "company only" would regress live screens).

**✅ MON 15 COMPLETE (end of day):**
- ✅ #563/#564/#565/#566 merged → Company Engine + the whole #502 superset (incl. R1–R20) LIVE; portal loop hotfixed; credits verified (999,839).
- ✅ **3 owed migrations run on PRODUCTION** (R2 `daily_brief_enabled` · R15 `figsy_knowledge` · R20 `job_changed_at`).
- ✅ **`HUNTER_API_KEY` + `PDL_API_KEY` set** on Railway `api` (multi-source + enrichment now active).
- ✅ **21 redundant PRs closed** (old #502 + R-train #506–#525).
- ✅ **Denise = $39 confirmed in Stripe.**
- ✅ **5 agreement docs uploaded** → Terms Library (live in portal + admin).
- 🔄 **Deferred:** create + fund the **demo company pool** → rolls into the **Wed Company-Engine walk** (need a demo company first, item 59). · Stripe **pool-topup products ($1/$3) → Tue-16 billing** (entangled with the price-table reconciliation).

### 📅 TUE 16 — 🤖 builds · 🧍 LEGAL CATCH-UP DAY (clear mind)
- 💳 **🤝 BILLING CORRECTNESS — the pre-client blocker (the day's headline build).** Fix before any client touches the product; gates Fri 19. Full plan + every file:line in `MORNING-FIXLOG → 💳 BILLING CORRECTNESS`. §3 design **SIGNED OFF (Jacques 14 Jun): one lead = one charge = one wallet** via an explicit `clients.plan` (`lead_gen`|`figsy`). Order: (1) reconcile the **3 disagreeing price tables** → constants, recreate the real Stripe Prices · (2) add `clients.plan` + backfill · (3) pool-aware delivery kills the **$1+$3 double-charge** *and* the **structurally-broken FIGSY-only bundle** (FIGSY-only client currently gets 0 leads); outreach stops charging · (4) Denise $39 · (5) honest "How credits work" panel · (6) atomic FIGSY credit RPC · (7) multi-currency USD/GBP/ZAR (may be its own phase — reconcile w/ Flutterwave, don't let it block 1–5) · (8) admin FIGSY visibility. **No merge to `main` until the smoke test is green + screenshots.** 🧍 = recreate Stripe Prices + sign-off; 🤖 = all code.
- ⚖️ **🧍 Legal pack #10–14 (moved from Sun 14, do with a clear head):** ICO (£40, ico.org.uk/registration, Tier 1) · SR01 home-address suppression (free) · registered office/service address (~£20–50/yr) · WHOIS privacy verify · **LinkedIn lockdown**. *(Inventory 102.)* ⚠️ Use the service address on the ICO form, not home. Plus the longer-lead items: 🔍 trademark search · 📲 Meta/WhatsApp API application.
- 🤖 **113a agent side-panel** — make all 5 agents (FIGSY/Milla/Vida/Denise/**Casey**) conversational + acts-in-place; build Denise + Casey chat endpoints; wire Casey into the picker. *(Inventory 113a.)*
- 🤖 Start the locked redesigns: inbox-v2 (112) · "AI Family" cards (125) · sequence-builder recolor (82).
- 🧍 Review Tuesday's builds when handed over. **Give me Casey's voice/tone** — it gates the onboarding-agent build (121).

### 📅 WED 17 — 🔎 FEATURE-VERIFICATION WALK · Part 1 (the new core — everything's live, so PROVE it) 🤝
> The whole product shipped via #502. The job is no longer "merge boxes" — it's **walk every live feature and confirm it works with REAL data, not placeholder.** Use the **§13 VERIFICATION CHECKLIST** — mark each ✅ works / 🔴 broken→fix / ⚠️ placeholder. 🤖 fixes 🔴s same-day.
- 🔎 **Company Engine** — `/dashboard/company`: command centre panels · Seats tab + per-rep budgets · request→approve/deny · winning plays · invite flow.
- 🔎 **Design screens** — Teams Hub · Notetaker · Integrations · Deliverability · Activity feed · Sequence Builder · Templates · What's New · KPIs (flag any showing placeholder/empty).
- 🔎 **R1–R6** — demo-bounce guard · daily-brief toggle (needs R2 migration) · Vida bubble · speed-to-lead · milestone cards · onboarding emails.
- 🧍 **Smoke tests T3–T7** alongside *(Inventory 100)*.

### 📅 THU 18 — 🔎 FEATURE-VERIFICATION WALK · Part 2 + 🚦 GO / NO-GO 🤝
- 🔎 **R7–R20** — inbox AI draft · saved views · why-email · goals · templates · lead-capture forms · Cmd+K · meeting-prep · train-FIGSY (needs R15 migration) · evals · spam-check · model toggle · what's new · job-change (needs R20 migration).
- 🔎 **Billing correctness** verified (the Tue-16 build) + 🧍 **Smoke T9, T10**.
- 🚦 **GO/NO-GO:** every live feature ✅ or its 🔴 fixed · D9 10/10 · billing green · legal done · warmup ~50/day. **Any unresolved 🔴 → slip launch** (don't launch broken-but-live features).

### 📅 THU 18 — 🏁 HARD DEADLINE: everything done (founder away Fri)
**By EOD Thu, all must be true:** every §13 feature ✅ (or its 🔴 fixed) · billing correctness green · 3 owed migrations run · Hunter/PDL keys set · Stripe ($39 Denise + pool products) · 5 PDFs uploaded · legal done · D9 10/10. This is the real finish line.

### 📅 FRI 19 — 🚀 LAUNCH / 🧍 FOUNDER AWAY
- Product is already live (shipped Mon 15). Launch = GTM moment; 🤖 monitors prod + hotfixes only — **no new merges while you're away.**
- 🎥 **Drop 01 walkthrough (60s)** goes live in `the-drop.html` if recorded (see §4).

---

## 3 · 🟣 THE PURPLE GO-LIVE — R-train pulled forward to Wed–Thu (revised 15 Jun)

> **Revised 15 Jun (no live clients):** the original "rehearse on staging Mon 22 → replay prod Tue 23" existed to protect a *live client* during the flip. With **zero clients**, that safety reason is gone, so the **R-train (R1–R20) moves to Wed 17 + Thu 18** (see §2), merged in 2 waves with conflict-resolution + the 3 migrations + smoke each wave. **Next week (Mon 22–Tue 23) is freed for the RLS access-control build** (the fast-follow). The only hard rule that stays: **no merges over the weekend** (away Sat 20–Sun 21).

### 📅 SAT 20–SUN 21 — AWAY. No merges. 🤖 monitors prod only (escalation path, no changes).

### 📅 MON 22–TUE 23 — 🔴 BUILD THE COMPANY-ENGINE RLS / ACCESS CONTROL (item 55a / R11) 🤝
The fast-follow, before the 50-rep client is onboarded: owner sees command centre + all-reps data · reps see ONLY own data · reps can't see each other or the command centre · reps get low-credit alerts + request top-up (owner approves/denies). 🤖 design the RLS policies (Supabase row-level security) + ownership flags + UI visibility toggles + credit-request approval workflow; 🧍 review + approve. Plus GTM kickoff (§5).

### 📅 TUE 23 — 🟣 PROD GO-LIVE (4–5 hr block, 🤝)
Replay the proven sequence on prod. Founder on standby for hotfix till ~6pm; 🤖 watches each merge + patches any break same-day.
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
- ✅ **Already decided (just verify, nothing to choose):** Calendly = neutral `calendly.com/kind-ai-demo/new-meeting` (personal link retired — name-exposure; verify-live is task #9, Sun 14) · YouTube/content runs **faceless brand voice** (no founder face — `youtube-plan.md` reframed) · lifecycle email provider = **Zoho** (#35/36).

---

## 5 · GTM KICKOFF (launch week → Month 1) — the 3 legs

> North-star: cold outreach is necessary but not sufficient. **Content is the missing leg — it's the focus.**

**Leg 1 · Outbound (running):** FIGSY dogfood — scale the warmup; point FIGSY at the competitor-switcher ICPs (`competitor_icps.sql` — 🧍 set `FIGSY_KIND_CLIENT_ID`, replace the placeholder UUID, run, trigger). *(Inventory 132 / #26.)*
**Leg 2 · Content/Inbound (the gap):** Drop 01 + per-drop videos (§4) · **brand LinkedIn** 1/day build-in-public (anonymous brand handle, 127/#20) · blog/SEO · YouTube channel (134/#35).
**Leg 3 · Partners (highest-leverage):** replicate the Demmy model — 1 partner each Kenya + Ghana in month 1–2; partner onboarding tested in T10.

**Week-1 GTM run-list (🧍 unless noted):** 127 — 10 warm outreach + LinkedIn 1/day + activate PhantomBuster (run `20260602_linkedin_queue.sql` + keys) · 128 — Meta/WhatsApp application (⏰ §1) · 131 — 🤝 GTM funnel instrumentation (BLOCKED on 10 analytics decisions in `GTM_FUNNEL_INSTRUMENTATION.md`: PostHog vs GA4, attribution, trial→paid window, UTM columns) · 130 — 🤖 homepage hero = real product loop (blocked on the demo recording) · 132 — dogfood + fresh-signup check.
**Weeks 2–4 GTM:** 133 — 2 design-partner slots → case study + logo · 134 — 9:16 social cuts + YouTube channel · 135 — onboarding v2 emails + playbook form (Zoho) · 137 — 90-day guarantee (ToS clause still needed) + Revenue Playbook call + homepage outcome numbers (real data) · 138 — influencer/community distribution · 136 — Flutterwave activation (ZAR/NGN/KES/GHS).
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

## 11 · 🚩 FAST-FOLLOW (build soon after launch — not a Monday blocker)

**🔴 Company Engine RLS + Access Control (Inventory 55a / V2-TRACKER R11):** The Command Centre **ships LIVE Monday 15** (founder's call 15 Jun). Access control is a **fast-follow**, not a launch blocker. Target model: owner sees command centre + all-reps data · reps see ONLY own data (their leads, campaigns, calendar) · reps cannot see each other or the command centre · reps get low-credit notifications + request top-up (owner approves/denies in admin). **Interim until RLS lands:** the owner controls who logs in — a rep added before RLS could see beyond their own data, so the founder gates rep access manually. 🤖 design the RLS policy + UI toggles; 🧍 review + approve.

---

## 12 · 🚩 HONESTY & CLEANUP FLAGS (resolve before they bite at launch)
- **Sales deck + `sales-playbook.md` quote Alta's numbers as ours** (6% reply / 53% revival / 4-day / "8% reply" / R420k) — fix or remove before showing clients/investors. *(MASTER.md §20, DOC-MAP.)*
- **`denise` page is ungated** — non-subscribers can reach it (add the subscription check). *(MORNING-FIXLOG.)*
- **Portal `roadmap` page hardcodes ~80 features as "Live" to clients** — needs your call on what it shows.
- **`NEXT_PUBLIC_ADMIN_KEY` contradiction** — DEPLOY-CHECKLIST says DELETE; `portal-admin-failover` still lists it. Follow DELETE.
- **💳 Pricing is mis-wired in 3 places** (verified 14 Jun, full plan in `MORNING-FIXLOG → 💳 BILLING CORRECTNESS`): FIGSY clients are **double-charged** ($1+$3/lead vs the deck's $3 all-in); the **FIGSY-only bundle can't deliver leads**; and the FIGSY price is **shown $20/$40/$100, charged $60/$110/$250, "locked" at $60/$120/$300** — three different tables. Plus no multi-currency (USD/GBP/ZAR). **Pre-client blocker — Tue 16.**
- **4 Jun credential exposure** still "pending rotation" in the incident register — the 2 crown-jewels were rotated 11 Jun; confirm nothing else outstanding.
- **Cron count** unestablished (6 vs 16 vs 19 across docs) — verify the true set at Railway setup.
- **Settings prefs are localStorage-only** (writing-style/notifications don't persist).
- **README.md is empty.**

---

## 13 · 🔎 FEATURE-VERIFICATION CHECKLIST — walk every LIVE feature by THU 18 (founder away Fri)
> Since #502 shipped the whole product, this is the week's core: confirm each works with **real data**. Mark **✅ works · ⚠️ placeholder/empty · 🔴 broken→fix**. 🤖 fixes 🔴s same-day. Update this in-place as you walk.

**🏢 Company Engine** — ⬜ command centre renders · ⬜ Seats tab + per-seat budgets · ⬜ request→approve/deny · ⬜ winning-plays · ⬜ invite→accept flow · ⬜ per-rep agent unlock (Test 7)
**🖥️ Design screens (80–91)** — ⬜ Teams Hub · ⬜ Notetaker · ⬜ Integrations · ⬜ Deliverability · ⬜ Activity feed · ⬜ Sequence Builder · ⬜ Templates · ⬜ What's New · ⬜ KPIs
**🚂 R-train (already live via #502)** — ⬜ R1 demo-bounce · ⬜ R2 daily-brief *(run migration)* · ⬜ R3 Vida bubble ✅ *(confirmed live)* · ⬜ R4 speed-to-lead · ⬜ R5 milestone cards ✅ *(confirmed live)* · ⬜ R6 onboarding emails · ⬜ R7 inbox AI draft · ⬜ R8 saved views · ⬜ R9 why-email · ⬜ R10 goals · ⬜ R11 templates · ⬜ R12 lead-capture forms · ⬜ R13 Cmd+K · ⬜ R14 meeting-prep · ⬜ R15 train-FIGSY *(run migration)* · ⬜ R16 evals · ⬜ R17 spam-check · ⬜ R18 model toggle · ⬜ R19 what's new · ⬜ R20 job-change *(run migration)*
**💳 Billing (Tue-16 build)** — ⬜ one-charge-one-wallet · ⬜ 3 price tables reconciled · ⬜ Denise $39 · ⬜ FIGSY-only delivers leads · ⬜ admin FIGSY visibility
**🧪 Smoke tests** — ⬜ T3 · ⬜ T4 · ⬜ T5 · ⬜ T6 · ⬜ T7 · ⬜ T9 · ⬜ T10 · ⬜ D9 10/10

---

## 14 · OWNER SPLIT AT A GLANCE
- **🧍 Only you can:** all legal/keys/accounts (§1) · the ship clicks + Stripe prices + env vars · smoke tests · video recordings (§4) · LinkedIn/outreach · merge approvals · the decision-gated inputs (Casey voice, pgvector, Flutterwave, funnel analytics).
- **🤖 Only I do:** Stripe pool billing · 113a + locked redesigns · company-engine hardening · invoicing · activating dormant integrations · drafting all content copy · the feature-verification fixes.
- **🤝 Together:** the feature-verification walk · Go/No-Go gate · GTM funnel instrumentation.

---
_Source-of-truth: `KIND-MASTER.md` governs where any doc conflicts. This launch pad is a derived run-list — when an item moves, update the master SESSION LOG + the relevant doc, then this. Built 14 Jun 2026 off a full five-source audit (3 core docs + every secondary doc + live git/PR state)._
