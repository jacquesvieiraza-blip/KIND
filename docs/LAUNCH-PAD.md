# 🚀 K.I.N.D — THE LAUNCH PAD (the daily command sheet)

> ## ⚙️ OPERATING RULE — read once
> **I only work from this doc day-to-day.** Map: `LAUNCH-PAD` = today's runlist · `PRODUCT-INVENTORY` = status truth (one dot, one owner) · `KIND-MASTER` = strategy + decisions + session log (governs strategy) · `V2-TRACKER` = future detail · root `CLAUDE.md` = agent config · GitHub = execution (one PR per shippable change). **No new core doc unless it replaces an old one.**
> - No task without **owner · action · where · done-when · source item (inventory ID) · GitHub**.
> - No work starts unless it's on TODAY'S RUNLIST or explicitly pulled in.
> - STATUS lives only in PRODUCT-INVENTORY; this doc references it by ID, never holds it.

> ## 📖 READ-THROUGH MAP — where to look (founder quick-nav)
> - **"What do I do now / this week?"** → **THIS doc** (VERIFIED STATE + RUNLIST below).
> - **"What's built / live / left?"** → **[`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md)** — the colour board at the top (🟢🩷🟣🟡🔴⏸).
> - **"Where are we + the full picture + why we decided X?"** → **[`KIND-MASTER.md`](./KIND-MASTER.md) → "▶️ RESUME HERE — LIVE STATUS"** (the cold-start read-through) + the 3-MONTH PLAN + session log.
> - **"The full forward vision / roadmap / risks?"** → **[`V2-TRACKER.md`](./V2-TRACKER.md)** (seller engine · learning engine · GTM · the 15 Pieces).

---

## 🧭 VERIFIED STATE — what's true right now
- **Last updated:** 2026-06-22 (Mon eve, POST-LAUNCH). **🚀 LIVE since 18 Jun.** Today shipped the seller-engine core + integrations; **rest of the runlist → tomorrow.**
- **LIVE on prod:** the core loop (signup→ICP→leads→FIGSY→reply→meeting) · **Company Engine COMPLETE** (#88 + items **106–111**: seats · budgets · approve · manager role · routing+dedup · calendars) · **billing correctness 166–171** · 5-agent family · admin OS · marketing site. **Board: 56🟢 / 59🩷 / 6🟣 / 12🟡 / 80🔴 / 7⏸.**
- **🔌 SHIPPED + DEPLOYED GREEN TONIGHT (🩷, awaiting founder VERIFY → 🟢):** **182/185** outbound webhooks + public event API (#668) · **190** subscription pause / win-back (#667) · **203** commission-engine **core module** (#666 — pure USD 20/5/5, 33 tests, **not yet wired**). **Both migrations run live** (`subscription_pause` enum-fixed via #671 · `webhook_endpoints`).
- **`main`:** ✅ clean — tonight merged **#665 #666 #667 #668 #670 #671 #672**. **Zero open PRs · no stranded commits.** @kind/api deploy GREEN (#668 ACTIVE). *(The two interim deploy reds were transient Railway yarn-cache corruption on install — self-healed next build, not our code.)*
- **🚨 DELIVERABILITY (194 + 198) — THE one open risk:** mail-tester **10/10** BUT real cold tests land **Promotions/Spam** — **REPUTATION, not content** (`gettingkind.com` young, no Gmail trust). #623 hardened cold content. **Real fix = a warmup tool (Instantly/Mailreach) → item 198, founder action.** Keep cold volume low until placement = Primary.
- **▶️ TOMORROW (founder):** ① verify pause + a webhook delivery → flip 🩷→🟢 · ② warmup tool (198) · ③ Notion (204) · ④ decide 203 repo+auth · ⑤ Apollo · ⑥ verification walk Blocks 2/3 + dashboard recount. **🤖 mine:** branch cleanup · optional `package-lock.json` removal.
- **Env:** `NEXT_PUBLIC_FEATURE_V2_SCREENS=all` · Hunter+PDL keys set · ICO done · `TRACKING_URL` set (open-pixel warm/transactional only).
- **Process lock:** confirm the Supabase project name before every SQL run · one branch = one PR off fresh `main` (stranded-commit rule).

---

## ✅ RUNLIST — 🌙 TONIGHT 7:15PM (Mon 22 Jun — **updated mid-session: ship-work DONE, here's what's left**)
> ▶️ **Where we are:** the 4 build PRs are **merged + deployed green** and **both migrations are run live**. What remains tonight = merge 2 doc PRs · you verify the 2 new features · your 3 high-leverage moves (warmup · Notion · 203) · housekeeping. **TUE 23:** raw demo + Drop 01 · Apollo follow-through.

### ✅ DONE this session (no action)
- ✅ **Merged #665 #666 #667 #668** → all on `main`.
- ✅ **@kind/api deploy GREEN** (#668 ACTIVE). *(#666/#667's two reds = transient Railway **yarn-cache corruption** on install — a different random package each, prettier then realtime-js; self-healed on the next build. NOT our code.)*
- ✅ **Both migrations RUN live:** `20260622_subscription_pause.sql` (enum-fixed via #671) + `20260622_webhook_endpoints.sql`.
- ✅ **Colours rendered** → 182/185/190 🔴→🩷; dashboard `56🟢/59🩷/6🟣/12🟡/80🔴/7⏸` (PR #672).

### 🔻 WHAT'S LEFT — in order
**1 · Merge the 2 doc PRs** — 🧍 founder
- **#670** (this runlist) + **#672** (the 182/185/190 render). Docs only — safe. · Source: **launch-pad · inventory**

**2 · Verify the 2 new features** — 🧍 founder (turns 🩷 → 🟢)
- Billing page shows **"Pause for a month"** and pause returns **200** (not 409). Register a test webhook in `/dashboard/developer` and fire an event → confirm signed delivery. · Source: **190 · 182 · 185**

**3 · Connect the cold-email warmup tool (198)** — 🧍 founder
- Instantly/Mailreach on `hello@gettingkind.com` · ramp 20→40/day · keep cold volume LOW — domain still warming. Clock starts on connect. · Source: **198**

**4 · Set up Notion (204)** — 🧍 founder
- Free workspace · migrate ops/command-centre content · **code + product-trackers stay on GitHub** (boundary rule). · Source: **204**

**5 · Decide 203 repo + auth/hosting** — 🧍 founder (USD already locked)
- New `kind-ops`-style repo vs a module in the KIND product · auth provider · hosting. Unblocks the next 203 phase (Stripe → engine → admin portal). Engine core (#666) is ready to plug in. · Source: **203 · brief §0/§9**

**6 · 🤖 Housekeeping (mine — no merge needed)** — 🤖
- Prune the ~40 stale merged/closed `claude/*` branches (verified no lost work). · Optional: tiny PR to remove the stray `package-lock.json` (kills the "mixed package managers" build warning, reduces install-flake surface). · Source: **hygiene**

> ⚠️ **Honest caveat:** the dashboard absolute totals are a hand-reconciled tally — my render *delta* (+3🩷/−3🔴) is exact, but a full absolute tie-out is deferred to the verification **walk recount** (Blocks 2/3). Don't treat the totals as grep-proven.

> ✅ **LAUNCHED Thu 18 (the big day):** Company Engine walk Block 1 done (**56 🟢**) · **188** Denise demo verified · **FIGSY switcher** fixed+verified (#627) · **"Alta"** scrubbed (#626) · docs self-audited · seller-engine (197/200/201/202) + AE comp pack mapped · all PRs merged, board clean → **GO LIVE.**
> ✅ **Closed Wed 17:** 3 builds (186/187/188 + migrations) · metrics saga closed (193/194/195) · mail-tester 10/10 · `kind-ops` built · item 196 logged.
> ✅ **Closed Tue 16:** billing #580 · Stripe + 15 env vars · #579 · legal #11–13 → post-delivery · story #598/#599 · churn/open-tracking #601/#602.

---

## 🧍 FOUNDER TO-DO — the complete list (status of record = PRODUCT-INVENTORY by ID)
*Audited 22 Jun. This is everything that needs YOU. Grouped by type; merge order + dailies are in the RUNLIST above.*

**🔴 NOW / this week**
- **198** connect the **warmup tool** (deliverability clock — hold campaign volume until it lands) · **204** set up **Notion** (free) + migrate ops content · **Apollo 5pm** · verification **walk Blocks 2/3** (with 🤖) · **smoke tests** (#100)

**🧠 Decisions only you can make**
- **GBP vs USD** (comp/P&L is £, product pricing is $ — gates **203**) · **203** repo (new vs KIND-product) + auth provider + hosting · **196** accounting platform + reporting currency + VAT? · **108** billing (should budget-edit move pool credits? should deactivate reclaim credits / halt billing?) · **119** Rev-Mission-Control direction · **121** Casey voice · **120** flip pgvector

**🔑 Credentials / keys / external**
- **104** Hunter + PDL keys (unlocks 94/95) · **96** Vapi + Meta/WhatsApp keys · **128** Meta/WhatsApp API application · **126** Google/MS OAuth registration (unlocks SSO 84/181) · **136** Flutterwave activation · **58** confirm live Denise Stripe price = $39 · **199** wire the uptime monitor to `/health`

**🎥 Demo videos / content** *(plan: `RECORDING-SHOOTING-SCRIPT.md`)*
- **129** record the whole platform once (Screen Studio) → **Drop 01** (60s, 16:9 + 9:16) · **134** 9:16 social cuts + YouTube · **163** product-videos hero · **117** Drop subscribe content · re-shoot **scene 2.1 per vertical**

**📈 GTM / growth**
- **127** warm outreach + LinkedIn 1/day · **132** dogfood self-outreach · **133** 2 design-partner slots · **138** influencer/community · **142** Product Hunt + G2 · **131** GTM funnel instrumentation (10 analytics decisions)

**⚖️ Legal / compliance**
- **102** legal pack (D&O · trademarks · SR01 · WHOIS) · **103** ⏸ awaiting Apollo reseller decision · **151** SOC2/ISO/Vanta (gated, later)

**🤝 Seller engine / hiring** *(next-week build, your sign-off)*
- **201** hire founding AE · **202** sign AE+partner agreements · **203** confirm the build plan before any code

**🟡 Built — your review/merge**
- **124** money-path tests · **97** A/B subject backend · **59** company-demo provisioning

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
- **Thu 18 — ✅ LAUNCHED.** Walk Block 1 (56 🟢) · 188 verified · FIGSY switcher + Alta fixed · seller-engine mapped · all PRs merged.
- **Fri 19:** 🚀 live; 🧍 monitors via laptop · **no merges** · founder away Sat/Sun.
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
- **Post-launch builds (logged 18 Jun):** **199** production monitoring + alerting (`/health` → UptimeRobot/BetterStack + Railway/Supabase/Resend → page the founder).
- **🤝 NEXT WEEK — THE COMP ENGINE + PORTALS BUILD (item 203 · founder brief 19 Jun · `docs/hiring/KIND-CLAUDE-CODE-BRIEF.md`):** Stripe → attribution → **ONE commission engine** (20/5/5 · ramp guarantee 100/100/75/75 · partners 20%+5% · KIND-Agent house = revenue-only) → **3 portals**, founder-approved payouts. **🎯 Build order: ① Admin portal + operating SOP → ② Partner portal → ③ AE portal**, account/auth systems right from the start. All **£ GBP**. **Confirm the plan before any code.** Ties together **196** (Stripe ledger) · **197** (partner 20%+5%, LOCKED) · **200** (portals) · **201** (AE hire) · **202** (HR/legal pack). Full map: `docs/hiring/SELLER-ENGINE-MAP.md`.
- **Ongoing (no date):** deliverability warmup ramp · funding ladder (F1 credits now) · content cadence (1 ship = video+LinkedIn+email) · tech debt (admin RLS refactor · delete Portal-V2 · key rotation).
- **Cleanup flags (fix opportunistically):** deck/`sales-playbook` quote Alta's numbers as ours → fix · `denise` page ungated → add sub check · portal `roadmap` page shows ~80 features as "Live" → your call · README empty.

---
_Derived run-list. When an item moves: flip its dot in `PRODUCT-INVENTORY` + append the `KIND-MASTER` session log (= the commit message), then refresh this doc — same session (CLAUDE.md). Where docs conflict: status → inventory, strategy → KIND-MASTER._
