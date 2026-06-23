# 🚀 K.I.N.D — THE LAUNCH PAD (the daily command sheet)

> ## ⚙️ OPERATING RULE — read once
> **I only work from this doc day-to-day.** Map: `LAUNCH-PAD` = today's runlist · `PRODUCT-INVENTORY` = status truth (one dot, one owner) · `KIND-MASTER` = strategy + decisions + session log · `V2-TRACKER` = future detail · `DOC-MAP` = every other doc + freshness · `CLAUDE.md`/`RULEBOOK` = how I work · GitHub = execution (one PR per shippable change).
> - No task without **owner · action · done-when · source item (ID)**. STATUS lives only in PRODUCT-INVENTORY — this doc references it by ID.
> - **👀 PREVIEW BEFORE LIVE (RULEBOOK §11):** client-facing builds go to the **PREVIEW site** (`heartfelt-essence…railway.app` · `staging` branch) first → **I send you a preview link → you approve (🟣) → THEN it ships to LIVE** (`app.get-kind.com`, 🩷). I never say "merge"/"go live" until you've previewed. *(Docs don't deploy → no preview.)*

> ## 📖 READ-THROUGH MAP
> "what do I do now?" → **here** · "what's built/live/left?" → **PRODUCT-INVENTORY** (colour board) · "where are we + why?" → **KIND-MASTER → RESUME HERE** · "the future?" → **V2-TRACKER** · "what's every other doc?" → **DOC-MAP** · "the tools?" → **TECH-STACK**.

---

## 🎯 THE MISSION — the 2-week sprint (then full-speed selling)
**We've launched. Cold campaigns are throttled until the domain warms (~2 wks). We use that window to get EVERYTHING oiled** — every buildable item live, every video recorded, the business systems standing up — so that when the domain is warm the founder flips to the **main job: new-logo acquisition, 5–6 new clients/month**, with minimal time on code and the majority on selling + running the business.
- **🤖 I build** the buildable backlog → **push to PREVIEW** → hand you a **preview link** (no drip). You approve → it ships to LIVE.
- **🧍 You** merge, run the migrations I flag, walk the live app to turn 🩷→🟢, and clear your founder-only list (keys/decisions/recordings).
- **Honest scope:** "everything" = every **buildable, ungated** item + everything waiting on you. Genuinely client-count/margin-**gated** items stay gated (see the ladder) — but I push you to re-validate each.

---

## 🧭 VERIFIED STATE — what's true right now (22 Jun, post-launch)
- **🚀 LIVE since 18 Jun.** Core loop (signup→ICP→leads→FIGSY→reply→meeting) · **Company Engine COMPLETE** (88 + 106–111) · billing correctness 166–171 · 5-agent family (FIGSY·Milla·Vida·Denise·Casey) · admin OS · marketing site.
- **Board:** **56🟢 / 59🩷 / 6🟣 / 12🟡 / 86🔴 / 7⏸.** *(Absolute totals = hand-reconciled; true tie-out at the next walk.)*
- **Shipped + deployed green, awaiting your verify → 🟢:** 182/185 webhooks · 190 pause/win-back · 203 comp-engine core.
- **🚨 THE one open risk = deliverability/reputation (194/198):** real cold mail lands Promotions/Spam despite mail-tester 10/10 — `gettingkind.com` is young. **Fix = warmup tool (198).** Keep cold volume low until placement = Primary.
- **`main`:** clean · 0 open PRs · no stranded commits. **Currency = USD (locked 22 Jun).**
- **Process locks:** confirm the Supabase project name before every SQL run · one branch = one PR off fresh `main`.

---

## 🛑 TODAY — RESET (23 Jun · warmup-first · read this FIRST)
> **Honest state:** today went off-track. **6 builds got merged to LIVE before you verified them** (against the preview rule we then locked, §11). And **"warmup" was a mess** — what's run since 9 Jun is only a **send-cap**, not real reputation warmup; the cold domain has **no mailbox**, so a normal warmup tool can't plug in. So today = **fix the warmup + rebuild trust in the system.** No demos, nothing customer-facing, until you trust it works.

### 🔴 #1 — FIX THE WARMUP (the mess) — 🧍 you, 🤖 guiding
- **Set up Instantly** (instantly.ai) — the real warmup + send platform. Sign up → connect/create sending mailboxes on the cold domain → **Warmup ON.** Clock starts today; ~1–2 wks → inbox. **Do NOT campaign hard until warmed** (burns the domain). · Source **198** *(full finding logged in item 198 + TECH-STACK)*

### 🟠 #2 — REBUILD TRUST: walk the live system — 🧍 you, 🤖 fixes breaks
- **Live feature walkthrough** (`LIVE-FEATURE-WALK.md`) on `app.get-kind.com` — you walk every live feature, I fix what's broken on the spot. **Must happen before any demo / customer-facing.**
- The **6 builds merged today, unverified** (112 inbox · 113 A/B · 114 Kanban · 136a invoices · 178 voice · 140 leads): verify in the walk → 🟢, or I **revert** any that aren't right.

### ⏸ ON HOLD until #1 + #2 are cleared (NOT today)
- Recording demos (129) · anything customer-facing · hard campaigning · Vapi/WhatsApp keys · Notion · accounting · 203.

### 🤖 ME — notes only, no building today
- Logged the warmup finding (item 198) + corrected TECH-STACK (the email architecture was wrong — cold = Resend send+inbound, no mailbox). Then: guide your Instantly setup · run the walkthrough with you · fix what it finds. **No new builds. No merge-to-live without your preview.**

---

## ✅ THE BROADER PLAN (paused until TODAY's reset is cleared)
> **Priority spine:** P0 make-it-sell → P1 the missing channels → P2 business systems → P3 GTM. Owner tags: 🤖 me · 🧍 you · 🤝 both.

### 🔴 P0 — make the live product actually sell (do first)
1. **🧍 Connect the warmup tool (198)** — Instantly/Mailreach on `hello@gettingkind.com`, ramp 20→40/day. **Done:** connected, clock running.
2. **🤖 Real leads — the data waterfall (140 / 94 / 95)** — make PDL a true **parallel** source (not Apollo-only-fallback) + auto-run Hunter enrichment for missing emails. **Done:** PDL+Hunter contribute leads on every ICP run → 🟡 for your review. *(This is "why aren't we using their leads" — fixed.)*
3. **🤝 Verify the 2 shipped features → 🟢** — pause returns 200 on a live sub · register a webhook + fire an event → signed delivery. **Done:** 190/182/185 → 🟢.
4. **🤝 Verification walk Blocks 2+3** — screens 80–91 + R1–R20; I fix 🔴 same-day + recount the dashboard. **Done:** 🩷→🟢.

### 🟠 P1 — the channels we haven't built yet (the "not progressing")
5. **🤖 Inbox rebuild (112)** — the Gmail-style Unibox (design approved, brand-purple). **Done:** built to 🟡 for review. *(Your flagged priority.)*
6. **🧍 WhatsApp (128 + 96)** — submit Meta/WhatsApp Business API application + keys. **🤖 then** wires Vida-on-WhatsApp. **Done:** app submitted.
7. **🧍 Voice/Vapi (96 → 144/178)** — create Vapi account + key. **🤖 then** builds the voice ("speak") widget (178). **Done:** key set; widget to 🟡.
8. **🧍 Record the platform demo (129)** — Screen Studio, one take → Drop 01 (60s, 16:9+9:16). **🤖 then** cuts 134/163. **Done:** raw capture done.

### 🟡 P2 — stand up the business layer
9. **🧍 Notion (204)** — free workspace · Admin Centre + Command Centre · migrate ops/finance/compliance. **Done:** page-tree live.
10. **🧍 Accounting platform (196)** — pick Xero/QB/FreeAgent/Sage · confirm bill-USD/file-GBP + VAT timing. **🤖 then** builds the sales ledger. **Done:** platform chosen.
11. **🧍 Apollo reseller decision** — gates the SMB data default.

### 🟢 P3 — GTM kickoff
12. **🧍 Warm outreach + LinkedIn 1/day (127)** · dogfood self-outreach (132) · line up 2 design-partner slots (133).

### 🗓️ DAILY RHYTHM (the 5-minute open — the habit)
**Every morning:** ① open this doc → pick today's 1–3 · ② check **Zoho** inbox for replies · ③ check **Stripe** for new money · ④ glance **warmup** placement · ⑤ anything shipped → I render the dot same session.

---

## 🔧 THE MOMENTUM BOARD — everything that can move (so nothing sits)
> The point: no buildable item sits idle. **I drive the 🤖 column to 🟡; you action your columns.**

**✅ BUILT 22 Jun late → 🟡, batched PRs to merge:** **#681** 140 data waterfall (PDL parallel + auto-Hunter) · **#685** 112 inbox rebuild · **#686** 136a invoicing · **#684** 113 A/B subject UI · **#682** 114 Kanban polish · **#683** 178 voice widget shell. *(All audited: builds green on the real deploy path, no migrations, 1-ahead/0-behind main.)*
**🤖 STILL TO BUILD (next batch):** **55a** Company RLS · **115** configurable triggers (backend) · **174–176** onboarding fork · **135/137** lifecycle + guarantee copy · **118** finish nav rewire. *(162/180 already merged 🩷; 124 built 🟡 — your merge.)*

**🟡 ADVANCE (sitting in yellow):** **124** money-path tests (just needs your merge) · **57** Stripe pool billing (🤖 finishing) · **97** A/B backend (🤖 + UI above) · **59** company-demo provisioning (🧍 create one in admin) · **94/95** PDL/Hunter (🧍 confirm keys → then 140 above) · **96** Vapi/WhatsApp (🧍 keys) · **165** visitor-intel provider (🧍 pick) · **118** nav (🤖).

**🩷 VERIFY → 🟢 (needs you in the live app — the walk):** the 53 pinks — screens 80–91 · R1–R20 · 182/185/190 · 162/180/191/192 · 106–111 · etc. *(I have no prod access; this column only moves with you.)*

**🧍 YOUR UNBLOCKS (each a ~5-min action — I'll spec on request):** keys — Vapi 96 · WhatsApp 128 · Google/MS OAuth 126 · Flutterwave 136 · confirm Hunter/PDL 104; decisions — accounting 196 · 203 repo+auth; actions — warmup 198 · Notion 204 · demo 129 · Apollo.

---

## 🪜 POST-LAUNCH PRIORITY LADDER (replaces "PARKED" — we've launched, gates are open)
> Active now → near-term → genuinely gated. **Gated stays gated, but each is challenged (see the morning report).**

- **P0 — NOW (this week):** warmup 198 · data waterfall 140 · verify 182/185/190 · walk Blocks 2/3 · RLS 55a · money-path 124.
- **P1 — next (revenue/credibility):** inbox 112 · invoicing 136a · WhatsApp 128 · voice 178 · demo 129 · onboarding 174–177 · company hardening (109–111 built, verify) · Prompt Library 162 · nav 118.
- **P2 — gated ~10+ clients (Intelligence):** Learning Engine 143 · MCP 141 · Casey deep 121 · Product Hunt 142.
- **P3 — gated ≥28% margin / clients (Agent family):** Denise deep 144 · outcome pricing 147 · Lena/Tony 145 · CRM+mobile 148.
- **P4 — gated 50+ clients (Enterprise):** cross-client intel 150 · compliance/SOC2 151 · advanced moat 152 · the 15 Pieces 153–161.
- **🧍 Founder-ops (now):** Notion 204 · accounting 196 · sales ledger 196 · business-model training day.
- **🤝 Seller engine (item 203, founder build-order ① admin+SOP → ② partner → ③ AE):** USD · confirm plan before code. Ties 196·197·200·201·202. Map: `docs/hiring/SELLER-ENGINE-MAP.md`.

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
