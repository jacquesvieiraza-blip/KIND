# 🚀 K.I.N.D — LAUNCH PAD

**As of: Thursday 25 June 2026** *(Day 2 of the 2-week plan)* · post-launch (live since 18 Jun) · currency **USD** · 🔥 **build freeze LIFTED**

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = what to do, when, by whom · **PRODUCT-INVENTORY** = status (the board lives there *only*, script-counted — this doc never copies the numbers, so it can't go stale) · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future.
>
> **Legend:** 🧍 **you** · 🤖 **me (Claude)** · 🤝 **together.** Every line carries its inventory **item ID** + a **done-when**.

---

## ⚡ STATE — the one picture

- **✅ DONE (Wed 24, merged):** the full **doc↔code reconciliation** — **#719** (audit) · **#721** (audit fixes) · **#723** (P0 truth-fixes · P1 dots-match-code · P2 untracked items 229–234 · P3 code-fix backlog 235–241) · **#725** (Apollo Engine doc + items 242–244). Board now **Σ249** (`--check` OK — items 245/246 logged 25 Jun). *(Earlier: 198 ordered · 211 Phase 1 verified · portal v2 #712 + Alex · steal 227 · items 220/228 logged.)*
- **🔥 BUILD FREEZE LIFTED (24 Jun).** Build resumes — **every client-facing change previews first (§11); the founder merges, never Claude.**
- **▶️ TODAY (Thu 25) — your actions:** ① **confirm 220** (`kind-staging`? + keep `expansion`?) · ② submit **Vapi (96) · WhatsApp-Meta (128) · Google OAuth (126)** keys (long-lead, start now) · ③ **decide Paystack** keep/kill (gates C3 / item 237). · 🤖 I begin **C1/C2** partner fix (rates→20%+5% + kill ZAR) on a preview branch.
- **🌍 GTM FRAME — TWO TRACKS (decided 25 Jun · detail → KIND-MASTER + V2-TRACKER "🌍 MARKET STRATEGY"):**
  - **🌍 US / UK / EMEA → OUR OWN OUTREACH (the fast-cash track).** Data-rich + deliverability-driven → we dogfood FIGSY to win clients. *Build the outreach machine DURING the warmup window so we fire the day the domain's warm.*
  - **🌍 AFRICA → PARTNERS (the moat track).** Thin data → partners sell relationship-first. **Founder-led LinkedIn recruiting needs no engine → start NOW.**
- **🎯 GOAL (reframed): FIRST REVENUE, not "engine hot."** Engine (211) + warmup (198) are the **entry ticket** to the US/EMEA market, not the finish line. **Critical path = warm domain + an engine good enough to deliver the first clients** (NOT all 6 phases before we sell). The `staging`-branch repair (Mon 29) still gates engine previews.
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

### Thu 25 Jun — Day 2 · KEYS + DECISIONS
- 🧍 submit **Vapi (96)** · **WhatsApp/Meta (128)** · **Google OAuth (126)** — long-lead, start now.
- 🧍 confirm **220** (run on `kind-staging`? + keep 3 commission types?) · 🤝 decide **Paystack** keep/kill (gates C3).
- 🤖 begin **C1/C2** partner fix (rates→20/5 + kill ZAR display) on a preview branch.
- 🧍 **APOLLO ENGINE (244):** run `api.get-kind.com/engine/leads/test?key=<ADMIN_SECRET_KEY>` → open in browser, judge lead quality + source labels. Done-when: verdict on PDL/Hunter Africa coverage → tells us whether to build 243 (aggregator) or BYOK-only. *(No Apollo spend, no sends — read-only.)*
- ✅ 🤖 **aggregators researched (243):** recommend **BetterContact** (enrichment-only; for US/EMEA coverage = BetterContact + Apollo BYOK + Cognism · Africa stays partner-led). Detail → `APOLLO-ENGINE.md §3A`.
- 🅲 **MOAT — start NOW (no engine needed):** 🧍 founder-led **LinkedIn partner outreach (233)** — first 2–3 warm agency conversations this week. Done-when: 3 partner convos opened.
- 📋 *Items 245 (internal exec-brief generator) + 246 (in-portal support AI) logged this session — both 🟡 built, not yet walked.*

### Fri 26 Jun — Day 3 · TRUST WALK + 220
- 🤝 **Live walk** `app.get-kind.com` — walk the **🩷 live-not-walked set** (65 items; checklist = `LIVE-FEATURE-WALK.md`) → flip 🟢 or I revert. *(Biggest single unlock.)*
- 🤖 build **220** real-data backend → preview · 🧍 confirm Denise **$39** checkout (58).

### Sat 27 / Sun 28 Jun — light (but the FAST-CASH track starts here)
- 🅱️ 🤝 **OUR outreach machine — kickoff:** define the **US/UK ICP** (who we sell to) + pull a first **lead list** (PDL + Apollo BYOK; Cognism for EMEA) → the fuel for when the domain's warm. Done-when: a 200–500 lead US/UK list exists.
- 🤖 (preview) finish C1/C2 partner fix · 55a RLS clarify · 106–109 verify.
- 🧍 warmup progress · **194/101** real-Gmail placement test.

### Mon 29 Jun — Day 4 · ENGINE SEAM
- 🤖 **repair the `staging` branch** (prereq for every engine preview).
- 🤖 **211 Phase 2** SendingProvider seam → preview · **C4** USD ledger + kill dup migration 611.

### Tue 30 Jun — Day 5 · ENGINE WIRE
- 🤖 **211 Phase 3** — wire ONE client path off shared Resend → preview → 🧍 approve before live.
- 🤖 **C5** unify price tables → `@kind/shared` · 🧍 **196** accounting platform + VAT.

### Wed 1 Jul — Day 6 · MODES + SMOKE
- 🤖 **211 Phase 4** two modes (managed / connect-your-own) + reply capture.
- 🤝 **100** smoke tests T3–T10 · 🧍 **211 decisions** (mailbox markup + Resend-client migration) · **108** credit rule · **203** repo+auth.

### Thu 2 Jul — Day 7 · BILLING + NAV
- 🤖 **57** Stripe→company-pool billing (preview) · **118** nav rewire · **C6** settings copy + migration hygiene (crm_dedup · tier CHECK).
- 🧍 **204** start the Notion workspace.

### Fri 3 Jul — Day 8 · FAST-CASH CONTENT + LEGAL
- 🅱️ 🤖 **OUR outreach machine — copy:** US/UK **FIGSY sequences** on the Apollo playbook (242/212) — ≤50-word emails, in-thread follow-ups, the "we used FIGSY to land you" angle + a clear offer/demo (129). Done-when: a 4-step US/UK sequence is drafted + ready to load.
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
- **121** Casey onboarding V2 — pull in only when the first client actually onboards (then it earns its place fast).
- **212** FIGSY 6-step / **174–176** onboarding fork — *partially* in scope: the **US/EMEA sequence copy** (242/212) IS the fast-cash track (Fri 3); the rest of the 6-step rebuild waits.
- **221–226** partner real-data UI — wait until we have activated partners with real numbers to show (220 backend first).
- ⏸ **165** Visitor Intelligence — deferred (thin Africa coverage).
> **Still genuinely client/data/margin-gated (unchanged):** 143 Learning Engine · 147 outcome pricing · 150/155/156/159/161 scale · 151 SOC2 · 160 white-label.

## 🧍 YOUR STANDING LIST *(status of record = PRODUCT-INVENTORY by ID)*
- **Keys:** 211 Smartlead · 96 Vapi · 128 WhatsApp/Meta · 126 OAuth · 136 Flutterwave · 58 Denise price. *(104 Hunter/PDL ✅ already confirmed in Railway.)*
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
- **211** ENGINE Phase 2 (client-facing seam) → **staging branch repair** (the §11 preview path; key + Phase 1 ✅ done 24 Jun).

---
*Daily rhythm: open this → do today's lines. Status → PRODUCT-INVENTORY. Why → KIND-MASTER. When something ships, its dot flips in the inventory (the only place status is edited).*
