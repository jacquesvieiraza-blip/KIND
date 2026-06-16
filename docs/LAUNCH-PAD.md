# 🚀 K.I.N.D — THE LAUNCH PAD (the daily command sheet)

> ## ⚙️ OPERATING RULE — read once
> **I only work from this doc day-to-day.** Map: `LAUNCH-PAD` = today's runlist · `PRODUCT-INVENTORY` = status truth (one dot, one owner) · `KIND-MASTER` = strategy + decisions + session log (governs strategy) · `V2-TRACKER` = future detail · root `CLAUDE.md` = agent config · GitHub = execution (one PR per shippable change). **No new core doc unless it replaces an old one.**
> - No task without **owner · action · where · done-when · source item (inventory ID) · GitHub**.
> - No work starts unless it's on TODAY'S RUNLIST or explicitly pulled in.
> - STATUS lives only in PRODUCT-INVENTORY; this doc references it by ID, never holds it.

---

## 🧭 VERIFIED STATE — what's true right now
- **Last verified:** 2026-06-16 09:00 UTC. **Launch = 🚀 Fri 19 Jun. ⏰ Everything verified/fixed by THU 18** (founder away Fri).
- **LIVE on prod:** Company Engine (#88) + the **#502 superset** = R1–R20 + design screens 80–91 → all **🩷 pink** (live, pending the Wed/Thu walk → then 🟢). Verified-🟢: 55, 92. Marketing site (The Drop, Prompt Library) + admin portal live.
- **`main`:** ✅ merged through **#575** — operating system (`CLAUDE.md`) · 🩷 pink state · this clean daily doc · Apollo-reply + "if-no" fallback logged (KIND-MASTER). Stale marketing PR **#503 closed**.
- **NOT done yet:** billing correctness 166–173 (Tue-16) · the verification walk (Wed/Thu) · **legal #11–13** (#10 ICO ✅ · #14 LinkedIn ✅) · D9 10/10.
- **Env:** `NEXT_PUBLIC_FEATURE_V2_SCREENS=all` · Hunter+PDL keys set · ICO done (C1959926).
- **After launch:** founder away Sat 20–Sun 21 (no merges) · Mon 22 = Company RLS (55a) before the 50-rep client.
- **Process lock:** confirm the Supabase project name before every SQL run.

---

## ✅ TODAY'S RUNLIST
> ▶️ **TOMORROW (Tue 16) — start here:** task 1 (billing build, 🤖) · task 2 (recreate Stripe prices, 🧍) · task 3 (D9 10/10) · then legal pack + close #503.

**1 · Billing correctness build** *(the pre-client blocker — gates Fri 19)*
- Owner: 🤖 Claude · Action: build in order **169 → 167 → 166 → 170 → 168 → 171 → 173** (clients.plan flag → pool-aware delivery → kill double-charge → atomic FIGSY RPC → reconcile prices to constants → honest credits panel → admin FIGSY visibility) · Where: `api` + `portal`, fresh branch off `main` · Done when: smoke test green + screenshots, one PR **open, not merged** · Source: **166–173** · GitHub: _new PR_

**2 · Recreate the Stripe Prices at the locked flat values**
- Owner: 🧍 founder · Action: recreate the 6 Price objects — Lead Gen **$20/$40/$100**, FIGSY **$60/$120/$300** ($1/$3 flat); confirm `STRIPE_PRICE_DENISE_MONTHLY` = **$39** · Where: Stripe dashboard + Railway env · Done when: checkout charges the locked prices · Source: **168 / 58** · GitHub: —

**3 · D9 deliverability to 10/10**
- Owner: 🧍 founder (🤖 assist) · Action: run `DELIVERABILITY-D9-CHECKLIST.md` to a clean 10/10 · Where: mail-tester / GlockApps · Done when: 10/10 (the Thu-18 launch gate) · Source: **101** · GitHub: —

**4 · Close the stale marketing PR** — ✅ **DONE 16 Jun**
- Owner: 🧍 founder · Action: closed (The Drop already live via #544; the Watch page stays held as inventory 163) · Where: GitHub · Done when: closed ✅ · Source: 93/163 · GitHub: **#503 closed**

**5 · Legal pack #10–14** *(do with a clear head)* — **#11–13 left** (#10 ICO ✅ · #14 LinkedIn ✅)
- Owner: 🧍 founder · Action: **#11 SR01 · #12 registered office + service address · #13 WHOIS privacy** · Where: Companies House / formation agent / GoDaddy · Done when: #11–13 filed · Source: **102** · GitHub: — · _Note: trademark = Month 2–3, Meta/WhatsApp API = pipeline window — neither gates Fri 19._

---

## ⛔ BLOCKED / WAITING
- **Billing PR can't merge** → waiting on 🧍 Stripe prices + sign-off (task 4, item 168).
- **🩷 → 🟢 for items 56, 60–79, 80–91** → waiting on the Wed/Thu verification walk.
- **Onboarding 174–177 final Apollo default** → Apollo **replied 15 Jun** (competitive-overlap review); 🧍 founder sent the response + "if-no" fallback locked → now waiting on Apollo's **decision**.
- **Signup/SSO (84)** → waiting on 🧍 Google/Microsoft OAuth registration.
- **pgvector (120) / Casey (121)** → waiting on 🧍 input (flip the switch / give Casey's voice).
- **GTM funnel instrumentation (131)** → waiting on 10 analytics decisions (`GTM_FUNNEL_INSTRUMENTATION.md`).

---

## 📅 NEXT 7 DAYS
- **Tue 16:** 🤖 billing build (above) · 🧍 legal pack #10–14 (ICO done · SR01 · registered office · WHOIS · LinkedIn lockdown) + trademark search + Meta/WhatsApp API application + recreate Stripe prices.
- **Wed 17:** 🤝 verification walk Pt 1 (Company Engine · design screens 80–91 · R1–R6) · 🧍 smoke T3–T7 → flip 🩷→🟢 as each passes.
- **Thu 18:** 🤝 verification walk Pt 2 (R7–R20) + billing verified · 🧍 smoke T9/T10 · D9 10/10 · 🚦 **GO / NO-GO** (any unresolved 🔴 → slip launch). **🏁 HARD DEADLINE — founder away Fri.**
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
