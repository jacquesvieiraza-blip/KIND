# 🚀 K.I.N.D — THE LAUNCH PAD (the daily command sheet)

> ## ⚙️ OPERATING RULE — read once
> **I only work from this doc day-to-day.** Map: `LAUNCH-PAD` = today's runlist · `PRODUCT-INVENTORY` = status truth (one dot, one owner) · `KIND-MASTER` = strategy + decisions + session log (governs strategy) · `V2-TRACKER` = future detail · root `CLAUDE.md` = agent config · GitHub = execution (one PR per shippable change). **No new core doc unless it replaces an old one.**
> - No task without **owner · action · where · done-when · source item (inventory ID) · GitHub**.
> - No work starts unless it's on TODAY'S RUNLIST or explicitly pulled in.
> - STATUS lives only in PRODUCT-INVENTORY; this doc references it by ID, never holds it.

---

## 🧭 VERIFIED STATE — what's true right now
- **Last verified:** 2026-06-18 (Thu, launch-eve). **Launch = 🚀 tonight/Fri 19 — "no matter what we go live."** Founder away Sat/Sun; back **Mon 22**.
- **LIVE on prod:** Company Engine (#88) + the **#502 superset** (R1–R20 + design screens 80–91) + **billing correctness 166–171** → all **🩷 pink** (live, pending the Wed/Thu walk / next-delivery cert → then 🟢). Verified-🟢: 55, 92. Marketing site + admin portal live.
- **`main`:** ✅ through Thu-18 — **#625 merged** (FIGSY trial-gate). Open to merge: **#620** (docs reconcile) · **#626** (Alta scrub) · **#627** (agent-switcher visibility). **Close (superseded by #620): #616 · #617 · #618 · #619.** Earlier on main: 186/187/188 (#605/#606/#607) · metrics chain #608–#615 · billing #580 · voice 178 (#579).
- **✅ METRICS SAGA CLOSED (193 · 195):** FIGSY metrics are now **one source of truth** across Home/Performance/Analytics; 3 metric surfaces consolidated to **2**. Root cause of "0 sent vs 120" = a missing prod migration `opened_at` (`20260531_email_open_tracking.sql`), now run → data consistent.
- **🚨 DELIVERABILITY (194 + new 198) — the one open risk:** mail-tester **10/10** BUT real tests landed in **Promotions, then Spam** on fresh Gmails. **Diagnosis: REPUTATION, not content** — `gettingkind.com` is ~9 days old, no Gmail trust yet. **#623 hardened the content** (near-plain HTML, **pixel + footer removed from COLD sends**, kept List-Unsubscribe + "Reply STOP"). **The real fix = a warmup tool (Instantly/Mailreach) ~1–2 wks → item 198, founder action MONDAY.** Until placement = Primary, keep cold-sending minimal.
- **🩷 SHIPPED, awaiting founder VERIFY → 🟢:** **186** signup T&C · **187** Sequences. *(**188** Denise demo ✅ verified 18 Jun; **56** per-rep unlock ✅ verified 18 Jun.)*
- **🌙 TONIGHT (Thu eve, founder):** merge **#620 · #626 · #627** + close #616–#619 → 🚦 **GO → live.** Optionally verify 186/187.
- **NOT done yet:** verify 186/187 · **verification walk Blocks 2 (screens 80–91) + 3 (R1–R20) → MON 22** (Block 1 Company Engine ✅ done) · 🎥 Drop 01 **→ TUE 23** · 📞 Apollo **→ MON 22, 5pm CONFIRMED.** **D9:** mail-tester **10/10 ✅**. *(Legal #11–13 → post-delivery.)*
- **Env:** `NEXT_PUBLIC_FEATURE_V2_SCREENS=all` · Hunter+PDL keys set · ICO done. **`TRACKING_URL=https://api.get-kind.com` SET** — open-pixel on **warm/transactional only** (#623 removed it from COLD sends). 🧍 ran the missing **`20260531_email_open_tracking.sql`** (`opened_at`).
- **After launch:** founder away Sat 20–Sun 21 (no merges) · Mon 22 = Company RLS (55a) before the 50-rep client.
- **Process lock:** confirm the Supabase project name before every SQL run.

---

## ✅ RUNLIST — 📅 THU 18 JUN (verify → Go/No-Go → launch Fri)
> ▶️ **The shape of the day (trimmed for launch-eve):** 🧍 verify 186/187/188 → 🤝 verification walk (Company Engine · screens 80–91 · R-wave) → 🤖 scrub "Alta" (PR pending) → merge PRs → 🚦 **GO → live tonight/Fri.** **Smoke tests → MON · raw demo/Drop 01 → TUE · Apollo → MON 5pm (confirmed).**

**1 · Verify 186 · 187 · 188 → 🟢** — 🧍 founder (🤖 renders the dots)
- Action: eyeball each — Denise demo unlocked (✅ 188 verified) · a fresh signup stamps T&C · Sequences build→apply→the send is your copy. · Done when: ✅ given → I flip 🩷→🟢 · Source: **186 · 187 · 188**

**2 · Verification walk** — 🤝 founder + Claude
- ✅ **Block 1 — Company Engine DONE (18 Jun):** all 6 checks; **item 56 → 🟢** (Test 7: per-rep unlock toggles + **$117/mo roll-up** on the company bill). **Blocks 2 (screens 80–91) + 3 (R1–R20) → MON 22** — founder's call, don't rush 28 screens on launch-eve. · Source: **56 ✅ · 60–79 · 80–91**

**3 · Scrub "Alta" off the Performance page** — 🤖 Claude — ✅ **DONE → PR #626**
- Removed every client-facing competitor "Alta" (Performance benchmark + 2 data-citations) → neutral "Industry" wording; kept the deliberate `/v2/train` positioning. · GitHub: **#626** (awaiting merge)

**4 · Merge the open PRs → GO** — 🧍 founder
- **#620** (docs reconcile · 9 commits) · **#626** (Alta scrub) · **#627** (agent-switcher visibility fix). **#625 already merged.** After #626/#627 deploy → 🧍 re-check the FIGSY "Switch agent" button is visible + Performance reads "Industry". · GitHub: **#620 · #626 · #627**

**5 · 🚦 GO / NO-GO → GO live** — 🤝, end of today
- Any unresolved 🔴 from the walk → fix same-day or slip. Else **GO → live tonight / Fri 19.** *(Founder: we go live no matter what.)* · Source: **105**

### ↪️ MOVED OFF TODAY (founder call, 18 Jun)
- **→ MON 22:** **Smoke tests** T3–T7 + T9/T10 (`docs/SMOKE_TEST.md`) — 🧍 · **Reschedule Apollo → done: MON 22, 5pm meeting CONFIRMED** (Ali) — 🧍.
- **→ TUE 23:** **Raw Zoom demo → gap-mine + Drop 01** — 🤝 (🧍 records · 🤖 analyses; say **"gap"** out loud).
- **D9 deliverability:** mail-tester **10/10 ✅**; formal GlockApps pass = nice-to-have, not a blocker.

> ✅ **Closed Wed 17 (big day):** 3 builds shipped (186/187/188 + migrations) · the **metrics saga closed** (193/194/195 — real opens, Analytics fixed, root-cause = a missing `opened_at` migration, now run) · mail-tester **10/10** · **`kind-ops`** company-ops repo built + sent · item **196** (HMRC-grade sales ledger) logged · founder business-model training parked post-launch.
> ✅ **Closed Tue 16:** billing #580 · Stripe + 15 env vars · #579 · legal #11–13 → post-delivery · story #598/#599 · churn/open-tracking #601/#602.

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
- **Thu 18 (today, launch-eve):** 🧍 verify 186/187/188 · 🤝 verification walk · 🤖 scrub "Alta" (`claude/scrub-alta-performance`) + merge #620/#625/Alta-PR · 🚦 **GO → live tonight/Fri.**
- **Fri 19:** 🚀 **LAUNCH.** Product already live; 🤖 monitors prod + hotfixes only, **no merges.**
- **Sat 20–Sun 21:** founder away, **no merges**, 🤖 monitor prod only.
- **Mon 22:** 🤝 **verification walk Blocks 2 (screens 80–91) + 3 (R1–R20)** + 🤖 **normalize & recount the inventory STATUS dashboard** (unify the 🟢-dot / ✅ marking, then a true count) · 🤖 **compile a one-screen ROADMAP view** — every 🔴 future item phase-ordered (now → 4C → 4D/4E → 4F → 4G → 4H → 4I) in ONE ranked list, as a new section inside `V2-TRACKER.md` (its rightful home — NOT a new core doc); so "everything coming, in order" is one scroll · 🧍 **smoke tests** T3–T7 + T9/T10 (`docs/SMOKE_TEST.md`) · 📞 **Apollo — 5pm meeting CONFIRMED** (Ali) · 🧍 **connect the cold-email warmup tool (item 198)** · 🤖 build Company RLS / access control (**55a** — before the 50-rep client) · 🧍 GTM week-1 kickoff (warm outreach + LinkedIn 1/day).
- **Tue 23:** 🎥 **raw Zoom demo → 🤖 gap-mine + Drop 01** (say "gap" out loud) · continue P0 stabilize.

### 🔎 Verification checklist (the Wed/Thu tool — mark ✅ works · ⚠️ placeholder · 🔴 broken→fix; 🤖 fixes 🔴 same-day)
- **Company Engine ✅ (18 Jun):** ✅ command centre · ✅ Seats + budgets · ⚠️ request→approve/deny (fires at first real rep request) · ✅ winning-plays · ✅ invite (link generated; accept needs the rep) · ✅ per-rep agent unlock (Test 7 → 56 🟢)
- **Screens 80–91:** ⬜ Teams Hub · ⬜ Notetaker · ⬜ Integrations · ⬜ Deliverability · ⬜ Activity · ⬜ Sequence Builder · ⬜ Templates · ⬜ What's New · ⬜ KPIs
- **R1–R20:** ⬜ R1 · ⬜ R2*(migration)* · ✅ R3 · ⬜ R4 · ✅ R5 · ⬜ R6 · ⬜ R7 · ⬜ R8 · ⬜ R9 · ⬜ R10 · ⬜ R11 · ⬜ R12 · ⬜ R13 · ⬜ R14 · ⬜ R15*(migration)* · ⬜ R16 · ⬜ R17 · ⬜ R18 · ⬜ R19 · ⬜ R20*(migration)*
- **Billing (Tue-16):** ⬜ one-charge-one-wallet · ⬜ 3 price tables reconciled · ⬜ Denise $39 · ⬜ FIGSY-only delivers · ⬜ admin FIGSY visibility
- **Smoke:** ⬜ T3 · ⬜ T4 · ⬜ T5 · ⬜ T6 · ⬜ T7 · ⬜ T9 · ⬜ T10 · ⬜ D9 10/10

---

## 📦 PARKED UNTIL AFTER LAUNCH (pull in only when its gate opens)
*Full ranked detail + rationale lives in `PRODUCT-INVENTORY` (status) and `V2-TRACKER` (roadmap). This is the index.*
- **🧍 MON 22 — FIRST THING (item 198):** connect a real cold-email **warmup tool** (Instantly / Mailreach) on `hello@gettingkind.com`, ramp 20→40/day, ~30% reply — keep real cold-sending OFF until placement = Primary (~1–2 wks). Clock starts Monday.
- **Wk of Mon 22 — P0 stabilize:** Company RLS 55a · money-path tests 124 · onboarding 174–177 · company essentials 106/107/108.
- **Month 1 — P1 revenue/credibility:** inbox rebuild **112** · invoicing **136a** · dormant data 94/95 + A/B 113 · design queue 125/113a/82/85–87 · Prompt Library **162** · nav 118 · company hardening 109/110/111.
- **Gated — P2 Intelligence (~10+ clients):** Learning Engine 143 · MCP 141 · Casey 121 · Product Hunt 142. *(→ V2-TRACKER Month 2.)*
- **Gated — P3 Agent family (≥28% margin):** Denise deep 144 · outcome pricing 147 · Lena/Tony 145 · CRM+mobile 148. *(→ V2-TRACKER Month 3.)*
- **Gated — P4 Enterprise (50+ clients):** cross-client intel 150 · compliance 151 · advanced moat 152 · the 15 Pieces 153–161. *(→ V2-TRACKER Year 2.)*
- **Founder-ops (post-launch):** **🧍 business-model training day** (the operating model end-to-end → write `operating-model.md` in **kind-ops** + SOPs) · **196** HMRC-grade sales ledger (needs 3 decisions: accounting platform · reporting currency · VAT-registered) · finish **kind-ops** setup + connect Stripe/Mettle → FreeAgent.
- **Post-launch builds (logged 18 Jun):** **199** production monitoring + alerting (`/health` endpoint → UptimeRobot/BetterStack + Railway/Supabase/Resend alerts → page the founder) · **200** partner-experience rework (partner portal + admin-for-partners "doesn't make sense" → discovery, then rebuild **with the 197 commission model**).
- **Ongoing (no date):** deliverability warmup ramp · funding ladder (F1 credits now) · content cadence (1 ship = video+LinkedIn+email) · tech debt (admin RLS refactor · delete Portal-V2 · key rotation).
- **Cleanup flags (fix opportunistically):** deck/`sales-playbook` quote Alta's numbers as ours → fix · `denise` page ungated → add sub check · portal `roadmap` page shows ~80 features as "Live" → your call · README empty.

---
_Derived run-list. When an item moves: flip its dot in `PRODUCT-INVENTORY` + append the `KIND-MASTER` session log (= the commit message), then refresh this doc — same session (CLAUDE.md). Where docs conflict: status → inventory, strategy → KIND-MASTER._
