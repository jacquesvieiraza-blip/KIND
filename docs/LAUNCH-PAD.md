# 🚀 K.I.N.D — LAUNCH PAD (open this one daily)

> **🧭 Four-doc contract:** **LAUNCH-PAD** = today / this week (this doc) · **PRODUCT-INVENTORY** = status (one dot, one owner) · **KIND-MASTER** = strategy + why + session log · **V2-TRACKER** = future. *Status truth = PRODUCT-INVENTORY; this doc references items by ID and never re-states status.*

## ⚡ STATE — read in 10 seconds
- **🚀 Live since 18 Jun.** Currency = **USD**.
- **Board** *(script-counted — see PRODUCT-INVENTORY):* **🟢57 · 🩷65 · 🟣6 · 🟡10 · 🔴69 · ⏸7.**
- **#1 risk → deliverability:** cold domain isn't reputation-warmed. **Do NOT campaign hard yet** (item 198). The ENGINE (211, Smartlead) is the fix.
- **Open PRs:** docs truth-reset (this) · #686 (136a invoices — built, **not** live) · #697 (Smartlead render).
- **Trust gate:** 5 builds shipped live, **not yet walked** (112·113·114·178·140) → the walkthrough turns them 🩷→🟢. *(136a is NOT live — it's in PR #686.)*

## 🔜 WHAT'S NEXT — by date (your daily pick is here)

**▶️ TODAY**
- 🔴 **Set up Instantly warmup** — sign up, connect cold-domain mailboxes, Warmup ON. Clock starts; ~1–2 wks → inbox. · 🧍 · *item 198 · done-when: warmup running*
- 🟠 **Live feature walkthrough** (`LIVE-FEATURE-WALK.md`) on `app.get-kind.com` — you walk, I fix breaks on the spot. · 🤝 · *gates all demos · done-when: every live feature walked*
- ⛔ On hold until those two clear: demos (129), anything customer-facing, hard campaigning.

**📆 THIS WEEK (P0)**
- 🤖 **ENGINE build** (211) — Smartlead spike → provider interface → wire FIGSY off shared Resend, via preview. · *gated on your Smartlead key*
- 🤝 **Smoke tests T3–T10** (#100) + **verify the 5 merged builds** → 🟢.
- 🧍 **Keys that unblock me:** Vapi (96) · WhatsApp/Meta app (128 — approval takes days, start now) · Google/MS OAuth (126).
- 🧍 **Decisions:** accounting platform (196) · 203 repo + auth/hosting.

**⛔ BLOCKED / WAITING ON YOU**
- **103 Apollo reseller** — awaiting Apollo's reply (external). · check date: this week.
- **94/95/140 leads** — confirm Hunter/PDL keys live in Railway (item 104 says set — verify).
- **SSO 84/181** — needs Google/MS OAuth (126).
- **Gated (challenge, don't drop):** Learning Engine 143 · routing 139 · Memory 120 (10+ clients) · margin-gated 144–147.

**✅ RECENTLY CLOSED (last 7 days)**
- Docs truth-reset started · ENGINE (211) researched + decided (Smartlead) · reply-rate corrected 8%→2-3% · 6-step sequence · warmup finding logged (198).

---

> ### 📂 DETAIL BELOW — the full 2-week plan, founder to-do, and walk checklist. **The cockpit above is your daily read; open the depth only when you need it.**

---

## 🛑 TODAY — RESET (23 Jun · warmup-first · read this FIRST)
> **Honest state:** today went off-track. **6 builds got merged to LIVE before you verified them** (against the preview rule we then locked, §11). And **"warmup" was a mess** — what's run since 9 Jun is only a **send-cap**, not real reputation warmup; the cold domain has **no mailbox**, so a normal warmup tool can't plug in. So today = **fix the warmup + rebuild trust in the system.** No demos, nothing customer-facing, until you trust it works.

### 🔴 #1 — FIX THE WARMUP (the mess) — 🧍 you, 🤖 guiding
- **Set up Instantly** (instantly.ai) — the real warmup + send platform. Sign up → connect/create sending mailboxes on the cold domain → **Warmup ON.** Clock starts today; ~1–2 wks → inbox. **Do NOT campaign hard until warmed** (burns the domain). · Source **198** *(full finding logged in item 198 + TECH-STACK)*

### 🟠 #2 — REBUILD TRUST: walk the live system — 🧍 you, 🤖 fixes breaks
- **Live feature walkthrough** (`LIVE-FEATURE-WALK.md`) on `app.get-kind.com` — you walk every live feature, I fix what's broken on the spot. **Must happen before any demo / customer-facing.**
- The **5 builds merged live, unverified** (112 inbox · 113 A/B · 114 Kanban · 178 voice · 140 leads): verify in the walk → 🟢, or I **revert** any that aren't right. *(136a invoices is **not** live — it's in open PR #686.)*

### ⏸ ON HOLD until #1 + #2 are cleared (NOT today)
- Recording demos (129) · anything customer-facing · hard campaigning · Vapi/WhatsApp keys · Notion · accounting · 203.

### 🤖 ME — notes only, no building today
- Logged the warmup finding (item 198) + corrected TECH-STACK (the email architecture was wrong — cold = Resend send+inbound, no mailbox). Then: guide your Instantly setup · run the walkthrough with you · fix what it finds. **No new builds. No merge-to-live without your preview.**

---

## 📅 THE 2-WEEK PLAN (23 Jun – 7 Jul) — condensed & ambitious
> **One clock = warmup (~1–2 wks); everything runs in PARALLEL inside it.** I parallelize the whole **buildable** backlog via PREVIEW (far more than a thin list); you run warmup + the walk + keys + ops + legal + GTM + demos. **Every SOFT-gated item is pulled forward; only HARD gates (real client-count / margin / data) stay out** (listed at the end). Owners: 🧍 you · 🤖 me · 🤝 both.

### 🚨 LANE A — THE ENGINE (item 211 — THE #1 plan; everything orbits this)
> The ENGINE = the warmed-sending / deliverability layer (RULEBOOK §12). No engine → **SMB dead · mid-market can't scale · enterprise out.** **✅ RESEARCHED + DECIDED 23 Jun: integrate Smartlead** (both modes via one API + white-label). **Full build spec → V2-TRACKER "⚙️ THE ENGINE".**
1. **198 — Instantly warmup for our OWN outreach** — set up + ON, **Day 1.** 🧍 · *gates our cold campaigning*
2. **211 — ✅ Smartlead CONFIRMED** as the primary engine (Instantly = backup + own outreach, 23 Jun) — open: the **markup model** for managed SMB mailboxes + **migration** of existing Resend clients + your Smartlead API key in Railway. 🧍
3. **211 — 🤖 BUILD via PREVIEW (6 phases, V2 spec):** ① Smartlead spike on staging → ② thin `SendingProvider` interface → ③ wire FIGSY off the Resend-shared path → ④ two modes (managed SMB / connect-your-own enterprise, mirrors §13/§14 data) → ⑤ reply capture → ⑥ deliverability monitoring. **Start 7pm.** 🤖 · *gated on #2*
4. **194/101 — D9 placement check** — real-Gmail test now + again as it warms. 🧍
> **Deliverability rules (non-negotiable):** 1 dedicated domain per client (never shared) · never cold from the primary domain · per-client warmup · ~30–50 sends/mailbox/day.

### 🔐 LANE B — TRUST / WALKTHROUGH (gates demos + customer-facing)
3. **Live feature walkthrough** (`LIVE-FEATURE-WALK.md`) — walk every live feature; I fix breaks → 🟢. 🤝
4. **Smoke tests T3–T10 (#100)** — pause · booking · billing · Vida · Milla · invites · partner. 🧍 + 🤖 fix
5. **Verify-or-revert the 6 merged builds** (112 · 113 · 114 · 136a · 178 · 140). 🤝

### 🤖 LANE C — PRODUCT BUILDS (I condense ALL of these — via preview)
6. **55a** Company RLS + access control. 🤖
7. **106–109** Company-Engine fast-follows (invite email · owner drill-down · budget-edit/offboard · manager notifs) — verify the 🩷 ones, finish the rest. 🤖
8. **57** Stripe → company pool billing → 🧍 then create top-up products. 🤖→🧍
9. **115** configurable triggers (backend). 🤖
10. **174–176** onboarding fork (firmographics · seat routing · 14-day trial). 🤖
11. **135/137** lifecycle emails + 90-day guarantee + homepage outcome copy. 🤖
12. **118** finish nav rewire (Watch · The Drop · Prompt Library). 🤖
13. **117** Drop subscribe form · **162/93** verify (Prompt Library + The Drop, 🩷). 🤝
14. **inbox follow-ups** (112 channel column + ICP-fit score). 🤖
15. **124** money-path tests — merge. 🧍
16. **97/113** A/B subject UI + backend wired *(113 live — verify)*. 🤖
17. *(after the demo)* **134** social cuts + **163** product-videos hero. 🤖

### 🧍 LANE D — YOUR KEYS / DECISIONS (unblock Lane C · Day 1–2)
18. **96 Vapi key** + **128 WhatsApp/Meta app** — start **Day 1** (Meta approval takes days). 🧍
19. **126** Google/MS OAuth (unlocks SSO 84/181) · **136** Flutterwave activation. 🧍
20. **165** visitor-intel provider · **120** flip pgvector · **121** Casey voice. 🧍
21. **108** billing rules (budget-edit / deactivate credit behaviour). 🧍

### 🏢 LANE E — BUSINESS / OPS / FINANCE
22. **204 Notion** — Admin + Command Centre, migrate ops/finance/compliance. 🧍
23. **196 accounting platform** (Xero/QB/FreeAgent/Sage) + USD-bill/GBP-file + VAT timing → 🤖 then builds the sales ledger. 🧍→🤖
24. **Business-model training day** → operating-model SOP in `kind-ops`. 🧍

### ⚖️ LANE F — LEGAL / COMPLIANCE *(ICO ✅ already done)*
25. **102 legal pack** — D&O insurance (~£500–1k) · trademark filing (UK IPO → ARIPO, classes 35/42/45) · SR01/Companies House · WHOIS privacy. 🧍
26. **SEIS advance assurance** (funding readiness — `legal/seis-advance-assurance-draft.md`). 🧍
27. **DPAs** in place (Railway/Supabase/Stripe/Resend/Apollo/Anthropic) — verify. 🧍
28. **103 Apollo reseller** — check their reply, progress the decision. 🧍

### 📣 LANE G — GTM / CONTENT / DEMOS
29. **129 record the platform demo** → Drop 01 (**after** the walk gives trust). 🧍
30. **127 warm outreach + LinkedIn 1/day** (once warmed). 🧍
31. **132 dogfood** self-outreach (competitor ICPs). 🧍
32. **133** line up 2 design-partner slots. 🧍
33. **142 Product Hunt + G2** prep → launch end of Wk 2 *(SOFT gate — pulled forward; it's an acquisition channel)*. 🧍
34. **138** influencer/community (after demo) · **content cadence** (blog ×3 ready · YouTube plan · The Drop episodes). 🤝
35. **131** GTM funnel instrumentation (10 analytics decisions). 🤝

### 🤝 LANE H — SELLER ENGINE (condense the foundation)
36. **203 repo + auth/hosting decision.** 🧍 → unblocks ↓
37. 🤖 **203 build** — ① admin portal + SOP → ② partner portal → ③ AE portal (engine core #666 ready to wire), via preview. 🤖
38. **201 start the AE hire** (JD + post — soft, can begin now) · **202** AE/partner agreements from the HR pack *(partner comp = 20%+5%)*. 🧍

### 🧹 LANE I — HOUSEKEEPING (mine — no action from you)
39. Prune **133 stale branches** · **normalise the dashboard** table format (grep-provable). 🤖
40. **199** uptime monitor → `/health` + **184** public status page · **122** kill dead Vercel · key-rotation doc. 🤖/🧍

### 🗓️ DAILY RHYTHM (5-min open)
Open this doc → pick today's 1–3 · check **Zoho** for replies · check **Stripe** for money · glance **warmup** placement · anything shipped → I render the dot.

### ⛔ GATED ITEMS — 🗓️ CHALLENGE TOMORROW (founder too busy today)
> **Tomorrow: gate-by-gate review.** For EACH item I give a hard answer — **EFFORT gate** (only hours/sequencing → we KILL it, I build it this fortnight) or **REALITY gate** (needs real clients / margin / data / warmed reputation → can't be forced; I give the *cheapest path to reach it sooner*). Push forward everything that's only effort-gated; for the reality ones, accelerate the trigger (e.g. first 10 clients fast via partners → P2 unlocks weeks early). **Nothing here is dropped — parked one day, not abandoned.**
- **P2 (10+ clients / outcome data):** Learning Engine 143 · MCP 141 · intelligent routing 139 · Memory v2 120.
- **P3 (≥28% margin):** Denise deep 144 · outcome pricing 147 · Lena+Tony 145 · orchestration 146.
- **P4 (50+ clients):** cross-client intel 150 · SOC2 151 · advanced moat 152 · the 15 Pieces 153–161.
*(Already pulled FORWARD as soft gates: Product Hunt 142 · Casey-deep 121 groundwork · AE hire 201 — challenge tomorrow for more.)*

---

## 🧍 FOUNDER TO-DO — the complete list (status of record = PRODUCT-INVENTORY by ID)
**🔴 NOW / this week:** **198** warmup · **204** Notion · **129** record demo · **128** WhatsApp app · **96** Vapi key · verification **walk** + **smoke tests** (#100) · Apollo.
**🧠 Decisions only you can make:** **196** accounting platform + VAT timing *(currency = USD, locked)* · **203** repo + auth/hosting · **108** billing rules (budget-edit moves pool credits? deactivate reclaims credits?) · **119** Rev-Mission-Control direction · **121** Casey voice · **120** flip pgvector · **165** visitor-intel provider.
**🔑 Credentials / keys:** **104** confirm Hunter+PDL keys in Railway (unlocks 94/95/140) · **96** Vapi + Meta/WhatsApp keys · **128** Meta/WhatsApp API application · **126** Google/MS OAuth (unlocks SSO 84/181) · **136** Flutterwave · **58** confirm live Denise Stripe price = $39 · **199** wire uptime monitor to `/health`.
**🎥 Demo / content:** **129** record the platform → Drop 01 · **134** social cuts + YouTube · **163** product-videos hero · **117** Drop subscribe.
**📈 GTM:** **127** warm outreach + LinkedIn · **132** dogfood · **133** 2 design-partner slots · **138** influencer · **142** Product Hunt + G2 · **131** funnel instrumentation.
**⚖️ Legal:** **102** legal pack (D&O · trademarks · SR01) · **103** ⏸ Apollo reseller · **151** SOC2/Vanta (gated).
**🤝 Seller engine:** **201** hire AE · **202** sign agreements · **203** confirm build plan.

---

## ⛔ BLOCKED / WAITING
- **🩷 → 🟢 (56, 60–91, 182/185/190 …)** → waiting on the verification walk (🧍 + 🤖).
- **94/95/140 leads** → 🧍 confirm Hunter/PDL keys are in Railway (LAUNCH-PAD said set; inventory says dormant — reconcile).
- **Onboarding 174–177 default** → waiting on Apollo's reseller decision.
- **SSO 84/181 · OAuth go-live** → 🧍 Google/Microsoft OAuth registration (126).
- **pgvector 120 / Casey 121 / visitor-intel 165** → 🧍 input (flip switch / voice / pick provider).

---

## 🔎 Verification checklist (the walk tool — ✅ works · ⚠️ placeholder · 🔴 broken→fix same-day)
- **Company Engine ✅ (18 Jun):** ✅ command centre · ✅ seats+budgets · ⚠️ request→approve (fires at first real rep request) · ✅ winning-plays · ✅ invite · ✅ per-rep unlock (Test 7 → 56🟢).
- **Screens 80–91:** ⬜ Teams Hub · ⬜ Notetaker · ⬜ Integrations · ⬜ Deliverability · ⬜ Activity · ⬜ Sequence Builder · ⬜ Templates · ⬜ What's New · ⬜ KPIs.
- **R1–R20:** ⬜R1 ⬜R2* ✅R3 ⬜R4 ✅R5 ⬜R6 ⬜R7 ⬜R8 ⬜R9 ⬜R10 ⬜R11 ⬜R12 ⬜R13 ⬜R14 ⬜R15* ⬜R16 ⬜R17 ⬜R18 ⬜R19 ⬜R20* *(=migration)*.
- **New (22 Jun):** ⬜ pause→200 · ⬜ webhook delivers signed · ⬜ comp-engine wired (later).
- **Smoke:** ⬜T3 ⬜T4 ⬜T5 ⬜T6 ⬜T7 ⬜T9 ⬜T10 ⬜ D9 10/10.

---
_When an item moves: flip its dot in `PRODUCT-INVENTORY` + append the `KIND-MASTER` session log (= the commit message), then refresh this doc — same session. Status → inventory; strategy → KIND-MASTER; every other doc → DOC-MAP._
