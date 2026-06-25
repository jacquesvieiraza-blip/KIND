# 🚀 K.I.N.D — LAUNCH PAD

**As of: Thursday 25 June 2026** *(Day 2 of the 2-week plan)* · post-launch (live since 18 Jun) · currency **USD** · 🔥 **build freeze LIFTED**

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = what to do, when, by whom · **PRODUCT-INVENTORY** = status (the board lives there *only*, script-counted — this doc never copies the numbers, so it can't go stale) · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future.
>
> **Legend:** 🧍 **you** · 🤖 **me (Claude)** · 🤝 **together.** Every line carries its inventory **item ID** + a **done-when**.

---

## ⚡ STATE — the one picture

- **✅ DONE (Wed 24, merged):** the full **doc↔code reconciliation** — **#719** (audit) · **#721** (audit fixes) · **#723** (P0 truth-fixes · P1 dots-match-code · P2 untracked items 229–234 · P3 code-fix backlog 235–241) · **#725** (Apollo Engine doc + items 242–244). Board now **Σ249** (`--check` OK — items 245/246 logged 25 Jun). *(Earlier: 198 ordered · 211 Phase 1 verified · portal v2 #712 + Alex · steal 227 · items 220/228 logged.)*
- **🔥 BUILD FREEZE LIFTED (24 Jun).** Build resumes — **every client-facing change previews first (§11); the founder merges, never Claude.**
- **🔖 RESUME BOOKMARK (25 Jun — pick up HERE):** **✅ done + verified:** 244 verdict (SA 1,360/US 71,123) · 243 **email-reveal boolean bug FIXED LIVE** (#740, 8/8 tests, prod-verified) · staging branch REPAIRED (deployed OK, build e272bf5) · 220/Paystack/96/128/Qualified decided · 243→🎯 FOCUS · 212 vital · full doc reconciliation + `SYSTEM-FLOW.md`. **⏭ NEXT BIG THING — 🤖 me:** **243 email-reveal DEPTH** (real domain → Hunter → actual emails return). **⏭ 🧍 you (pending):** set staging env-vars on Railway (`ANTHROPIC_API_KEY`, `ADMIN_SECRET_KEY` — see image findings) · finish 126 OAuth · fire 233 openers. **Cadence: each result → verify → update docs → then next.**
- **▶️ TODAY (Thu 25) — your actions:** ① **finish 126** Google OAuth setup (Parts A–D) · ② **fire 3–5 LinkedIn partner openers (233)** — the Africa track, live today · 🤖 I begin **C1/C2** partner fix + the **Paystack→Stripe/Flutterwave cutover (237/C3)** on preview branches.
- **🌍 GTM FRAME — TWO TRACKS (decided 25 Jun · detail → KIND-MASTER + V2-TRACKER "🌍 MARKET STRATEGY"):**
  - **🌍 US / UK / EMEA → OUR OWN OUTREACH (the fast-cash track).** Data-rich + deliverability-driven → we dogfood FIGSY to win clients. *Build the outreach machine DURING the warmup window so we fire the day the domain's warm.*
  - **🌍 AFRICA → DIRECT (data-powered) + PARTNERS *(sharpened 25 Jun — NOT partners-only)*.** Stack ALL data sources (243) to run our OWN outbound into Africa *as far as data reaches*; **partners** cover relationships + the residual. Founder-led LinkedIn partner recruiting needs no engine → **start NOW**; the data layer (243) opens the direct route.
- **🎯 GOAL (reframed): FIRST REVENUE, not "engine hot."** Engine (211) + warmup (198) are the **entry ticket** to the US/EMEA market, not the finish line. **Critical path = warm domain + an engine good enough to deliver the first clients** (NOT all 6 phases before we sell). ✅ **The `staging`-branch repair — the hard gate for every engine phase — is DONE (25 Jun, pulled ~4 days early); 🧍 founder finishes the Railway redeploy.** Engine previews now unblocked.
- **🚀 Live since 18 Jun.** 4 builds are shipped-but-not-yet-walked (112 inbox · 113 A/B · 114 Kanban · 178 voice-shell) + the 140 PDL-waterfall part → **the walk turns them 🟢.**
- **🔥 #1 priority = DELIVERABILITY. Two SEPARATE things — don't confuse them:**
  - **198 · Instantly** = warm **OUR** cold domain so **YOU** can do outreach to win clients. A **~1–2 week clock.** 🧍 **you set it up — Day 1.**
  - **211 · Smartlead = THE ENGINE** = the **CLIENT-facing** sending engine inside the product. 🤖 **I build it.** ✅ **key live + Phase 1 verified (24 Jun)** → next Phase 2 (SendingProvider seam, previewed).
- **⛔ Do NOT campaign hard until the domain is warmed** (it burns the domain).
- **📊 Status board → PRODUCT-INVENTORY** (run `scripts/count-inventory.sh`). Deliberately not repeated here.

---

## 🗓️ THE 2-WEEK PLAN — day by day (Wed 24 Jun → Tue 7 Jul) · 🎯 FIRST REVENUE via two tracks

> 🔥 **Freeze lifted 24 Jun.** **CRITICAL REVISION (25 Jun, two-track strategy):** the old plan poured almost all capacity into *building* (engine + 8 parallel lanes) and pushed selling to "after engine hot." That's backwards for "sell fast." **New shape = THREE tracks, revenue-first:**
> - **🅰️ ENTRY TICKET (🤖):** engine (211) right-sized to deliver the *first* clients + warmup (198) — *not* all 6 phases before we sell.
> - **🅱️ FAST-CASH (🤝):** build OUR US/UK outreach machine *during* the warmup window — ICP + lists (243 + Apollo/Cognism) · US/EMEA FIGSY copy (242/212) · offer/demo (129) → fire the day the domain's warm.
> - **🅲 MOAT (🧍):** Africa partner recruiting — founder-led LinkedIn, **runnable NOW, no engine needed** (233).
> - **⏸ PARKED behind first revenue (critical cut):** 120 memory · 144 Denise-deep · 141 MCP · 145 churn · 157/158 — none are on the path to first cash. They carry. *(See the PARKED section below — this is the deliberate de-scope.)*
> 🧍 you · 🤖 me · 🤝 both.

### Wed 24 Jun — Day 1 · AUDIT → RECONCILE ✅ DONE
- ✅ 198 ordered · 211 Phase 1 done · portal v2 #712 + Alex · steal 227 + item 228 logged · **full doc↔code audit (2 passes, cross-checked).**
- ✅ **RECONCILE MERGED** — #719 (audit) · #721 (audit fixes) · **#723** (P0 truth-fixes · P1 dot flips · P2 untracked items 229–234 · P3 code-fix backlog 235–241). Board **Σ244**, dots match code. **Freeze lifted.**

### Thu 25 Jun — Day 2 · DECISIONS + 🔓 STAGING UNBLOCK
- ✅ 🤝 **STAGING BRANCH REPAIRED today** (force-reset `staging`→`main`; the 1,300-commit stale lineage cleared, nothing live lost). **This was THE critical-path gate for the whole engine — now cleared, ~4 days early.** 🧍 finish on Railway: redeploy the staging service + confirm `kind-staging` DB → preview URL loads. **→ 211 Phase 2 unblocked NOW (pulled earlier than Mon 29).**
- ✅ 🤖 **243 — email-reveal fix SHIPPED + VERIFIED LIVE (#740, 8/8 tests).** The `email: true` boolean bug is dead in prod (244 re-run: `enrichmentWaterfall` = `{source:pdl}`, no `true`). **Bug fixed — but emails still empty** (free PDL gates the address + Hunter has no real domain) → next ↓.
- ✅ 🤖 **243 — email-reveal: WORKING LIVE, end-to-end verified.** Pipeline proven on prod: PDL finds person + domain → `resolveDomain` → **Hunter reveals the real email** (`samantha@samsalesconsulting.com`, score 96). Root blocker was a **bad `HUNTER_API_KEY`** in Railway (401) — 🧍 founder fixed it. *"Found 71k US founders → can email them" is LIVE.* *(Africa reveal-rate lower — Hunter is US/EU-weighted; that's the data-coverage/two-track point, not a code issue.)*
- ✅ **Decided today:** 220 (staging-preview + keep 3 commission types) · **Paystack → KILL** · **96 Vapi + 128 WhatsApp → PARKED** · 244 run (verdict in).
- 🧍 finish **126 Google OAuth** setup · fire **233 LinkedIn partner openers** (Africa moat track, live today).
- 🤖 begin **C1/C2** partner fix (rates→20/5 + kill ZAR) on a preview branch.
- ✅ 🧍 **APOLLO/244 test RUN** → verdict: PDL works (**SA 1,360 / US 71,123**), real cos; **email-reveal is the gap** (free PDL gates emails everywhere). African data is real, just thinner → **Africa-direct is viable via stacked sources** (243), partners cover the rest.
- ✅ 🤖 **aggregators researched (243→§3A)** → BetterContact (enrichment-only). **243 now elevated to 🎯 THE FOCUS** (max-coverage data → Africa-direct + US/EMEA — see NEW ACTION ITEMS).
- 🅲 **MOAT — start NOW (no engine needed):** 🧍 founder-led **LinkedIn partner outreach (233)** — first 2–3 warm agency conversations this week. Done-when: 3 partner convos opened.
- 📋 *Items 245 (internal exec-brief generator) + 246 (in-portal support AI) logged this session — both 🟡 built, not yet walked.*

### Fri 26 Jun — Day 3 · TRUST WALK + ENGINE
- ✅ **243 email-reveal boolean fix** done 25 Jun (#740). **243 email-reveal DEPTH** (real domain → Hunter) carries from Thu 25 → verify real emails return.
- 🤖🔴 **211 Phase 2** SendingProvider seam → preview *(staging repaired → no longer blocked)*.
- 🤝 **Live walk** `app.get-kind.com` — walk the **🩷 live-not-walked set** (65 items; `LIVE-FEATURE-WALK.md`) → flip 🟢. *(Biggest single 🩷→🟢 unlock.)*
- 🤖 build **220** real-data backend → preview · 🧍 confirm Denise **$39** checkout (58).

### Sat 27 / Sun 28 Jun — light (FAST-CASH + DATA STACK start here)
- 🤖🔴 **243 — add first new source** behind the waterfall: **BetterContact** (1 integration = 20+ providers) → preview. 🧍 Cognism key if EMEA depth wanted.
- 🅱️ 🤝 **OUR outreach machine — kickoff:** pull a first **lead list** from `content/our-outreach-us-uk.md` (PDL + stack). Done-when: a 200–500 lead US/UK list exists.
- 🤖 (preview) finish C1/C2 partner fix · 55a RLS clarify · 106–109 verify.
- 🧍 warmup progress · **194/101** real-Gmail placement test.

### Mon 29 Jun — Day 4 · SEQUENCES + ENGINE WIRE
- ✅ ~~staging repair~~ **DONE 25 Jun** (pulled forward — was the gate).
- 🤖🔴 **212 — rebuild FIGSY sequences STARTS** → the Apollo blueprint (4–6 multi-channel, ≤50-word in-thread, personalised opener, A/B). Target **done ~Fri 3**.
- 🤖🔴 **211 Phase 3** — wire ONE client path off shared Resend → preview · **C4** USD ledger + kill dup migration 611.

### Tue 30 Jun — Day 5 · ENGINE WIRE + DATA STACK
- 🤖🔴 **211 Phase 4** — two modes (managed / connect-your-own) + reply capture → preview.
- 🤖🔴 **243 — 2nd source + source router** (SMB→PDL/Hunter · BYOK→Apollo · EMEA→Cognism), source kept server-side.
- 🤖 **C5** unify price tables → `@kind/shared` · 🧍 **196** accounting platform + VAT.

### Wed 1 Jul — Day 6 · SEQUENCES + SMOKE
- 🤖🔴 **212 — FIGSY sequence rebuild continues** (variants + analytics hooks) → preview.
- 🤝 **100** smoke tests T3–T10 · 🧍 **211 decisions** (mailbox markup + Resend-client migration) · **108** credit rule · **203** repo+auth.

### Thu 2 Jul — Day 7 · BILLING + NAV
- 🤖 **57** Stripe→company-pool billing (preview) · **118** nav rewire · **C6** settings copy + migration hygiene (crm_dedup · tier CHECK).
- 🧍 **204** start the Notion workspace.

### Fri 3 Jul — Day 8 · SEQUENCES DONE + FAST-CASH COPY
- 🤖🔴 **212 — sequence rebuild DONE** → 🧍 approve. *(Now FIGSY sends the Apollo-blueprint sequence, not the weak 3-step.)*
- 🅱️ 🤖 **OUR outreach machine — copy:** load the 4-step sequence from **`content/our-outreach-us-uk.md`** into Instantly (dogfood angle + free-sample CTA). Done-when: sequence loaded + list attached, ready to fire on warm.
- 🧍 legal calendar: **102** pack · SEIS · trademark (resolve the L192/L305 contradiction) · D&O · DPAs · ARIPO.
- 🤖 **131** funnel instrumentation *(needs 🧍 the 10-analytics decision)* · **134** social-cut groundwork.

### Sat 4 / Sun 5 Jul — light
- 🧍 warmup placement check (near inbox-ready) · publish the 3 ready blog articles **(+ a US/EMEA-angled variant — the blog is Africa-flavoured today).**
- 🅲 🧍 partner recruiting continues — aim 1 activated agency conversation → agreement.

### Mon 6 Jul — Day 9 · ENGINE PHASES 5/6 🔥
- 🤖 **211 Phase 5/6** deliverability monitoring + the live client sending path → preview → 🧍 approve → **GO LIVE.**
- 🧍 **199** wire UptimeRobot/BetterStack + Railway/Supabase/Resend alerts.

### Tue 7 Jul — Day 10 · 🔥 FIRE THE OUTREACH (the whole point)
- 🅱️ 🤝 domain warmed (~90%) → **start OUR US/UK outreach** (127): load the list (Sat 27) + the sequence (Fri 3) into Instantly → send at low, ramped volume. **This is the first-revenue motion going live.**
- 🤝 fortnight-close walk → flip remaining 🩷→🟢, reconcile the board · prune stale branches.
- 🧍 **142** Product Hunt/G2 prep.

### ▶️ AFTER FIRST OUTREACH (from ~8 Jul)
- 🅱️ 🤝 **iterate the cash track:** reply-handling → demo → close the first US/UK clients (132 dogfood · 133 design partners) · **138** influencer.
- 🅲 🧍 **scale partners:** founder LinkedIn → ~50-agency dogfood list → ~1 activated partner/mo (233 · PARTNER GTM in V2).
- 🤖 **only then** the PARKED builds (120/144/141/145/157/158) + remaining **partner UI** (221–226) + intelligence layer (139/143, client-gated) — pulled in as a *signed client* needs them.
- 🤝 seller engine real build (200/202/203) + **228** recruiter override · business-model training day → operating SOP (204).

---

## ⏸ PARKED BEHIND FIRST REVENUE — the deliberate de-scope *(critical revision, 25 Jun)*
**The 24-Jun plan tried to run 8 parallel build lanes beside the engine. That's over-scoped for a small team chasing "sell fast" — it's how we'd ship a lot and sell nothing.** New rule: **nothing builds unless it's on the path to first revenue (entry-ticket, fast-cash, or moat) OR a signed client needs it.** These carry — they're good, just not now:
- **120** Memory v2/pgvector · **144** Denise-deep · **141** Context-MCP · **145** LENA+TONY churn · **157/158** personalised images + voice brief — *no first-client depends on these.*
- **96** Vapi (voice calling) + **128** WhatsApp/Meta — **parked 25 Jun** (not on the cold-email cash path; WhatsApp isn't even a cold channel per our own blog). Revisit post-first-revenue.
- **121** Casey onboarding V2 — pull in only when the first client actually onboards (then it earns its place fast).
- **212** FIGSY 6-step / **174–176** onboarding fork — *partially* in scope: the **US/EMEA sequence copy** (242/212) IS the fast-cash track (Fri 3); the rest of the 6-step rebuild waits.
- **221–226** partner real-data UI — wait until we have activated partners with real numbers to show (220 backend first).
- ⏸ **165** Visitor Intelligence — deferred (thin Africa coverage).
- ⏸ **Qualified competitor program (Manus analysis)** — **PARKED 25 Jun** (focus own product first). It's an inbound/enterprise build = maps only to **Vida's future**; revisit when outbound drives inbound traffic. Analysis in Drive (not imported). 3 cheap wins noted in V2 "PARKED" for when we revisit.
> **Still genuinely client/data/margin-gated (unchanged):** 143 Learning Engine · 147 outcome pricing · 150/155/156/159/161 scale · 151 SOC2 · 160 white-label.

## 🆕 NEW ACTION ITEMS (25 Jun · from the 244 data test + Apollo-doc review)
- **🤖🎯 243 — THE FOCUS: max-coverage data layer → penetrate Africa DIRECT + feed US/EMEA.** Africa is **not** partners-only — stacking ALL sources lets us run our own outbound into Africa too. 3 sources is too few (single ~40–60% → waterfall 80%+). **Use all:** Apollo·PDL·Hunter·**Cognism**·Clearbit·Lusha·RocketReach·Proxycurl + **BetterContact** (20+ in one); **ZoomInfo** = enterprise cost-call; **Clay** = our internal list-builder + blueprint (no embeddable API). **Build order: ① email-reveal fix (the 244 gap — `waterfallEnrich` bug) → ② add sources → ③ source router.** Honest ceiling: stacked Africa still thinner than US → direct as far as data reaches, partners cover the rest. **Detail → `APOLLO-ENGINE.md §3B`.**
- **🤖 212 — REBUILD FIGSY SEQUENCES (vital, founder flag: "our sequences are not great").** Rework to the Apollo blueprint: 4–6 multi-channel steps · ≤50-word in-thread emails · personalised opener · A/B · analytics+optimise loop (242). Highest-leverage product fix — lifts reply on every lead. **Detail → `APOLLO-ENGINE.md §3C`.**

## 🧍 YOUR STANDING LIST *(status of record = PRODUCT-INVENTORY by ID)*
- **Keys:** 211 Smartlead · 126 OAuth · 136 Flutterwave · 58 Denise price. *(104 Hunter/PDL ✅ confirmed in Railway · 96 Vapi + 128 WhatsApp → PARKED.)*
- **Decisions:** 196 accounting + VAT · 203 repo + auth · 108 credit behaviour · 211 markup + migration · 165 visitor-intel · 120 pgvector · 121 Casey voice.
- **Legal:** 102 pack · 103 Apollo ⏸ · SEIS · DPAs.
- **🅱️ GTM — US/EMEA (OUR OUTREACH, fast-cash):** 127 outreach (US/UK/IE/FR/NL — avoid DE/PL) · 129 demo/offer · 132 dogfood · 133 design partners · 142 Product Hunt · 138 influencer. *Fires when the domain's warm.*
- **🅲 GTM — AFRICA (PARTNERS, moat · recruit 10/yr — strat in V2-TRACKER; pitch = `PARTNER-BRIEF.md`):** ① founder-led LinkedIn (warm — **NOW**, no engine needed) · ② Demmy 2–3 intros · ③ dogfood a ~50-agency list. *Count activated partners.*
- **Seller engine:** 201 hire AE · 202 agreements (incl. **partner agreement** — to be drafted) · 200 partner+AE portal.
- **Business/ops:** Business-model training day → operating-model SOP (Notion, 204) + the partner/AE **earnings-capture** model (Day 6).

## 🤖 MY QUEUE — buildable now, via preview
55a · 57 · 106–109 · 115 · 118 · 135 · 137 · 174–176 · 97 · 131 · **211 (the ENGINE)** · **212 (FIGSY 3→6-step)** · **ex-gated: 120 · 121 · 141 · 144 · 145 · 157 · 158 · 165** — all previewed before they go live.
**🤝 PARTNER PORTAL v2 (200 + new items 213–226):** **✅ full DEMO portal SHIPPED to prod `/partner-preview` (#712, founder-approved 24 Jun) — 5 tabs incl. Alex (216) right-rail + co-pilot.** Still demo data → **NEXT: Slice 0 backend (220** type+MRR+USD, migration flagged, gated on your 2 confirms**)** → then Slice 1 reads real numbers (**221/222/223**) → **213** forecaster + **226** sell-through → trust/docs (**224/225**) → unicorn layer (**214/215/217/218/219**). *(Spec + GTM → V2-TRACKER.)*
**⛔ Gated, NOT building yet:** **203** (waiting on your repo + auth decision).

## ⛔ BLOCKED / WAITING
- **117** drop-subscribe → blocked on Drop content.
- **126** OAuth go-live → your Google/Microsoft registration.
- **103** onboarding default → Apollo's reseller reply.
- **211** ENGINE Phase 2 — ✅ **UNBLOCKED** (staging repaired 25 Jun; key + Phase 1 done 24 Jun). Only remaining gate: 🧍 the Railway staging redeploy.

---
*Daily rhythm: open this → do today's lines. Status → PRODUCT-INVENTORY. Why → KIND-MASTER. When something ships, its dot flips in the inventory (the only place status is edited).*
