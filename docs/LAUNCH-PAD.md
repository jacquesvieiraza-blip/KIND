# 🚀 K.I.N.D — THE LAUNCH PAD (the daily command sheet)

> ## ⚙️ OPERATING RULE — read once
> **I only work from this doc day-to-day.** Map: `LAUNCH-PAD` = today's runlist · `PRODUCT-INVENTORY` = status truth (one dot, one owner) · `KIND-MASTER` = strategy + decisions + session log (governs strategy) · `V2-TRACKER` = future detail · root `CLAUDE.md` = agent config · GitHub = execution (one PR per shippable change). **No new core doc unless it replaces an old one.**
> - No task without **owner · action · where · done-when · source item (inventory ID) · GitHub**.
> - No work starts unless it's on TODAY'S RUNLIST or explicitly pulled in.
> - STATUS lives only in PRODUCT-INVENTORY; this doc references it by ID, never holds it.

---

## 🧭 VERIFIED STATE — what's true right now
- **Last verified:** 2026-06-17 (Wed eve). **Launch = 🚀 Fri 19 Jun. ⏰ Everything verified/fixed by THU 18** (founder away Fri).
- **LIVE on prod:** Company Engine (#88) + the **#502 superset** (R1–R20 + design screens 80–91) + **billing correctness 166–171** → all **🩷 pink** (live, pending the Wed/Thu walk / next-delivery cert → then 🟢). Verified-🟢: 55, 92. Marketing site + admin portal live.
- **`main`:** ✅ through Wed-17 — today's 3 builds (#605 188 · #606 186 · #607 187, migrations run) **+ the metrics fix chain #608–#615 merged (one source of truth · Analytics in sidebar · 3→2 surfaces · head-count totals).** #616 (debug-line cleanup) open. Earlier: billing #580 · voice 178 (#579) · story (#598/#599).
- **✅ METRICS SAGA CLOSED (193 · 194 · 195):** mail-tester came back **10/10** → deliverability is clean; the "Newsletter" tab was new-domain warmup + the mail client's heuristic, **not spam** → **194 resolved, open-pixel stays ON.** **195:** FIGSY metrics are now **one source of truth** across Home/Performance/Analytics, and the 3 metric surfaces were consolidated to **2** (Deliverability folded into Performance + Analytics). **The Analytics "0 sent vs 120" root cause = a missing prod migration:** `opened_at` (`20260531_email_open_tracking.sql`) was never run, so Analytics' query — which *selects* `opened_at` — errored to 0 while Performance's count survived → 🧍 ran it → data consistent. (193 open-tracking live; opens populate over coming days.)
- **🩷 SHIPPED, awaiting founder VERIFY → 🟢:** **186** signup T&C · **187** Sequences · **188** Denise on demo.
- **🌙 TONIGHT (Wed eve, founder):** start a **raw Zoom demo recording** (rawness > polish — a full take is unlikely; partial is fine, we gap-mine whatever you capture) · merge **#616** (removes a temp debug line) · optionally verify 186/187/188.
- **NOT done yet (pre-19 gates):** verify 186/187/188 · the verification walk (Wed/Thu) · **D9** (mail-tester **10/10 ✅** — a formal GlockApps pass still nice-to-have) · 🎥 Drop 01 · 📞 reschedule Apollo (Ali no-showed). *(Legal #11–13 → post-delivery.)*
- **Env:** `NEXT_PUBLIC_FEATURE_V2_SCREENS=all` · Hunter+PDL keys set · ICO done. **`TRACKING_URL=https://api.get-kind.com` SET** — open-pixel live and **staying ON** (mail-tester 10/10 confirms it's safe). 🧍 also ran the missing **`20260531_email_open_tracking.sql`** (`opened_at`).
- **After launch:** founder away Sat 20–Sun 21 (no merges) · Mon 22 = Company RLS (55a) before the 50-rep client.
- **Process lock:** confirm the Supabase project name before every SQL run.

---

## ✅ TODAY'S RUNLIST — 📅 WED 17 JUN (the big build + verify day)
> ▶️ **The shape of the day:** 🧍 merge the 4 PRs + set `TRACKING_URL` → 🎥 founder records the raw Zoom demo run-through (say "gap" out loud at each gap) → 🤖 I mine the transcript for gaps + coach your flow → 🤖 build **188 · 186 · 187** → 🤝 verification walk Pt 1 → 📞 Apollo call · 🎥 Drop 01 · 🧍 D9. **Thu 18 = walk Pt 2 + Go/No-Go.**

**1 · Merge the 4 open PRs + set TRACKING_URL** — 🧍 founder, first thing
- Owner: 🧍 founder · Action: merge **#601** (real opens) · **#602** (churn plan) · **#600** (salary/growth) · **#597** (Google note) — any order, all independent. Then set **`TRACKING_URL=https://api.get-kind.com`** on the API env + redeploy → real opens go live. · Done when: 4 merged + env set + Analytics shows a real Open Rate (not "—") · Source: **193/190–193/189** · GitHub: **#601 #602 #600 #597**

**2 · Raw Zoom demo run-through → gap-mine + flow coaching** — 🤝 (🧍 records · 🤖 analyses)
- Owner: 🧍 founder records · 🤖 Claude analyses · Action: founder does a full client-style demo on Zoom, saying **"gap"** out loud wherever something's missing/broken; pastes the transcript → 🤖 turns every gap into a numbered inventory item **and** coaches the demo flow (order, what to say, what to skip). · Done when: gap list logged + flow notes delivered · Source: **129** · GitHub: —

**3 · 188 + 186 + 187 — SHIPPED 🩷 (merged + migrations run 17 Jun)** — 🧍 **VERIFY today → 🟢**
- **188 Denise demo** (#605, migration run): open the demo → Denise page unlocked with a follow-up + proposal draft. · **186 signup T&C** (#606, migration run): a fresh signup writes `clients.signup_terms_accepted_at`. · **187 Sequences** (#607, migration run): Portal → **Sequences** → New → 2 email steps with `{{first_name}}` → Save → **Apply to New campaign** → add leads + activate → the send is your copy.
- Owner: 🧍 founder (after the Apollo call) · Action: eyeball each of the three above · Done when: each confirmed working → flip 🩷→🟢 (🤖 renders the dots once you give the ✅) · Source: **186 · 187 · 188** · GitHub: **#605 #606 #607 (all merged)**

**6 · Verification walk Pt 1** — 🤝
- Owner: 🤝 founder + Claude · Action: walk Company Engine · design screens 80–91 · R1–R6 (use the checklist below); mark ✅/⚠️/🔴 — 🤖 fixes any 🔴 same-day → flip 🩷→🟢 in PRODUCT-INVENTORY. · Done when: Pt-1 rows are ✅ · Source: **80–91 / R1–R6** · GitHub: —

**7 · Apollo reseller call** — 🧍 founder (booked)
- Owner: 🧍 · Action: take the call off the prep sheet (`APOLLO-RESELLER-CALL.md`); the "if-no" fallback is locked. · Done when: Apollo's decision captured → unblocks onboarding 174–177 · Source: **174–177** · GitHub: —

**8 · Record Drop 01** — 🎥 🧍 founder
- Owner: 🧍 · Action: record Drop 01 to the recording bible (`RECORDING-SHOOTING-SCRIPT.md`). · Done when: raw capture done (assembles later) · Source: **129** · GitHub: —

**9 · D9 deliverability → 10/10** *(rolling pre-19 gate)*
- Owner: 🧍 founder (🤖 assist) · Action: run `DELIVERABILITY-D9-CHECKLIST.md` to a clean 10/10 (warmup on track — not at risk). · Where: mail-tester / GlockApps · Done when: 10/10 (the Thu-18 gate) · Source: **101** · GitHub: —

> ✅ **Closed Tue 16:** billing shipped (🩷 #580) · Stripe + 15 env vars · #503 closed · #579 merged · legal #11–13 → post-delivery · FIGSY+Tony on story.html (#598/#599) · churn plan + open-tracking fix written (#601/#602). · **Legal:** #10 ICO ✅ · #14 LinkedIn ✅; **#11 SR01 · #12 registered office · #13 WHOIS → POST-DELIVERY.**

---

## ⛔ BLOCKED / WAITING
- ~~Billing PR can't merge~~ → ✅ **RESOLVED 16 Jun** — merged #580 + migration applied; 🩷 live, self-certifies on next FIGSY delivery.
- **🩷 → 🟢 for items 56, 60–79, 80–91** → waiting on the Wed/Thu verification walk.
- **Onboarding 174–177 final Apollo default** → Apollo **replied 15 Jun** (competitive-overlap review); 🧍 founder sent the response + "if-no" fallback locked → now waiting on Apollo's **decision**.
- **Signup/SSO (84)** → waiting on 🧍 Google/Microsoft OAuth registration.
- **pgvector (120) / Casey (121)** → waiting on 🧍 input (flip the switch / give Casey's voice).
- **GTM funnel instrumentation (131)** → waiting on 10 analytics decisions (`GTM_FUNNEL_INSTRUMENTATION.md`).

---

## 📅 NEXT 7 DAYS
- **Tue 16:** 🤖 billing build (above) · 🧍 legal pack #10–14 (ICO done · SR01 · registered office · WHOIS · LinkedIn lockdown) + trademark search + Meta/WhatsApp API application + recreate Stripe prices.
- **Wed 17:** 🧍 **merge #601/#602/#600/#597 + set `TRACKING_URL`** · 🎥 **raw Zoom demo run-through → 🤖 gap-mine + flow coaching** · 🤝 verification walk Pt 1 (Company Engine · design screens 80–91 · R1–R6) · 🧍 smoke T3–T7 → flip 🩷→🟢 · 🤖 **enable + seed Denise on demo (188)** · 🤖 **record signup T&C acceptance (186)** · 🤖 **build sequence/template → apply-to-campaign (187, email-first)** · 🎥 record Drop 01 · 📞 Apollo call.
- **Thu 18:** 🤝 verification walk Pt 2 (R7–R20) + billing verified · 🧍 smoke T9/T10 · D9 10/10 · 🤖 **187 sequence/template apply-to-campaign LIVE** · 🚦 **GO / NO-GO** (any unresolved 🔴 → slip launch). **🏁 HARD DEADLINE — founder away Fri.**
- **Fri 19:** 🚀 **LAUNCH.** Product already live; 🤖 monitors prod + hotfixes only, **no merges.** Drop 01 video goes live if recorded.
- **Sat 20–Sun 21:** away, **no merges**, 🤖 monitor prod only.
- **Mon 22:** 🤖 build Company RLS / access control (**55a** — before the 50-rep client) · 🧍 GTM week-1 kickoff (warm outreach + LinkedIn 1/day).

### 🔎 Verification checklist (the Wed/Thu tool — mark ✅ works · ⚠️ placeholder · 🔴 broken→fix; 🤖 fixes 🔴 same-day)
- **Company Engine:** ⬜ command centre · ⬜ Seats + budgets · ⬜ request→approve/deny · ⬜ winning-plays · ⬜ invite→accept · ⬜ per-rep agent unlock (Test 7)
- **Screens 80–91:** ⬜ Teams Hub · ⬜ Notetaker · ⬜ Integrations · ⬜ Deliverability · ⬜ Activity · ⬜ Sequence Builder · ⬜ Templates · ⬜ What's New · ⬜ KPIs
- **R1–R20:** ⬜ R1 · ⬜ R2*(migration)* · ✅ R3 · ⬜ R4 · ✅ R5 · ⬜ R6 · ⬜ R7 · ⬜ R8 · ⬜ R9 · ⬜ R10 · ⬜ R11 · ⬜ R12 · ⬜ R13 · ⬜ R14 · ⬜ R15*(migration)* · ⬜ R16 · ⬜ R17 · ⬜ R18 · ⬜ R19 · ⬜ R20*(migration)*
- **Billing (Tue-16):** ⬜ one-charge-one-wallet · ⬜ 3 price tables reconciled · ⬜ Denise $39 · ⬜ FIGSY-only delivers · ⬜ admin FIGSY visibility
- **Smoke:** ⬜ T3 · ⬜ T4 · ⬜ T5 · ⬜ T6 · ⬜ T7 · ⬜ T9 · ⬜ T10 · ⬜ D9 10/10

---

## 📦 PARKED UNTIL AFTER LAUNCH (pull in only when its gate opens)
*Full ranked detail + rationale lives in `PRODUCT-INVENTORY` (status) and `V2-TRACKER` (roadmap). This is the index.*
- **Wk of Mon 22 — P0 stabilize:** Company RLS 55a · money-path tests 124 · onboarding 174–177 · company essentials 106/107/108.
- **Month 1 — P1 revenue/credibility:** inbox rebuild **112** · invoicing **136a** · dormant data 94/95 + A/B 113 · design queue 125/113a/82/85–87 · Prompt Library **162** · nav 118 · company hardening 109/110/111.
- **Gated — P2 Intelligence (~10+ clients):** Learning Engine 143 · MCP 141 · Casey 121 · Product Hunt 142. *(→ V2-TRACKER Month 2.)*
- **Gated — P3 Agent family (≥28% margin):** Denise deep 144 · outcome pricing 147 · Lena/Tony 145 · CRM+mobile 148. *(→ V2-TRACKER Month 3.)*
- **Gated — P4 Enterprise (50+ clients):** cross-client intel 150 · compliance 151 · advanced moat 152 · the 15 Pieces 153–161. *(→ V2-TRACKER Year 2.)*
- **Ongoing (no date):** deliverability warmup ramp · funding ladder (F1 credits now) · content cadence (1 ship = video+LinkedIn+email) · tech debt (admin RLS refactor · delete Portal-V2 · key rotation).
- **Cleanup flags (fix opportunistically):** deck/`sales-playbook` quote Alta's numbers as ours → fix · `denise` page ungated → add sub check · portal `roadmap` page shows ~80 features as "Live" → your call · README empty.

---
_Derived run-list. When an item moves: flip its dot in `PRODUCT-INVENTORY` + append the `KIND-MASTER` session log (= the commit message), then refresh this doc — same session (CLAUDE.md). Where docs conflict: status → inventory, strategy → KIND-MASTER._
