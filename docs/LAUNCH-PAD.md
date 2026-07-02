# 🚀 K.I.N.D — LAUNCH PAD

**As of: 2 July 2026 (PM — Fable regroup, post-merge)** · Three milestones. Nothing else on this page.
**This pass:** all M1 fixes + all 9 M3 build slices merged to `main`; the two Finance defects FIXED (commit `45fb71b`); the **7-officer executive-lens gap report** logged in full below (§③) and minted as tracked items **#285–#299**.
**Keys:** ✅ done · 🔲 left · 🛑 the one gate · 🧍 you · 🤖 me · 🤝 both · 🔨 needs a BUILD · ⏱ needs a CLOCK/action (no build)

> Status of record = PRODUCT-INVENTORY. Why = KIND-MASTER. Future = V2-TRACKER. Procedures/flows = SOP (`client-flow-sop.md`). This page = what to do now.

---

## 🧠 IN ONE MINUTE (read this, then the detail below is optional)

**We're trying to do three things. Here's exactly where each stands.**

**① Use K.I.N.D to send OUR OWN cold outreach.**
The product works, the 1,461-person list is ready, the emails are written. **Nothing to build.** The only thing in the way is the inboxes finishing warm-up in Instantly (~1–2 weeks, your side). When warm → import the list → test → send. *(Detail: Front ① below.)*

**② Let a PAYING CLIENT log in and run it themselves.**
The product itself works for them — they can find leads, send, get replies, use the agents. **But don't put a paying client on yet — two things aren't built:**
- **Security** — with more than one client, one could see or mess with another's account. Not safe yet. *(Quick to fix.)*
- **Separate sending** — today every client sends from the *same* email identity, so one client's spam hurts everyone's delivery. This is the big build ("Smartlead"). *(Detail: Front ② below.)*

**③ Run the business behind it (our Admin Centre).**
The onboarding triggers (signup → assign an inbox · payment → provision + switch), finances (Xero · banking · HMRC), **oversight of every AE + partner (the Command Centre)**, **Nora (our admin co-pilot)**, and future staff logins all live in a **rebuilt Admin Centre.** *(Detail: Milestone 3 below.)*

**So:** ① = wait for warm-up (no build). ② = build security + the Smartlead sending engine. ③ = rebuild the Admin Centre as our operational + financial cockpit.

---

## 🎯 THIS WEEK — HYPER-FOCUS (Fable regroup audit, 2 Jul PM · machine checks: tsc clean, 88/88 tests · runway: Fable until **7 Jul**)
**Only these four blocks + Friday's GTM. Everything else waits.**

**1 · M1 blockers — fix BEFORE any prospect lands or any send** 🔴
| # | Blocker | Where |
|---|---------|-------|
| 1a | ✅ **CLEARED (2 Jul, PR #913)** — CAN-SPAM/GDPR footer now carries the real registered **postal address** (33 Townsend Road, Tidington, CV37 7DE, UK). Set it once as the Instantly campaign footer. | `our-outreach-us-uk.md` §4 |
| 1b | ✅ **CLEARED (2 Jul, PR #913)** — cadence **LOCKED by founder = 4 emails (Day 0/3/8/10) + 1 manual LinkedIn (Day 6)**; Day-8 email promoted to Step 4, breakup → Step 5. Paste the 4 emails into Instantly. | `our-outreach-us-uk.md` §4 |
| 1c | 🩷 **LIVE — website $1→$3 single-FIGSY** (#283) · **✅ $3 ToS approved by founder (2 Jul)** · wording defects fixed in PR #908 (`vs-salesloft` + "Lead Gen" name) — merge to finish. | live site · `terms.html` |
| **1d** | ✅ **#284 FIXED (PR #911, merging)** — signup → FIGSY plan + 20 FIGSY trial credits; portal billing FIGSY-only. `STRIPE_PRICE_FIGSY_40` confirmed in Railway. (Stripe price ID was already set — the earlier "owed" note was stale.) | `auth.ts` · portal `billing/page.tsx` |

**2 · Demo prep — cheap, do before ANY face-to-face** ⚠️
Test the magic-link "Open Demo" flow beforehand (OTP dependency, `admin.ts:267-275`) · create the demo BEFORE the meeting (seeding runs inline) · never reopen an expired demo · steer around **Knowledge · Team · Integrations** (live nav, say "coming soon") · don't quote the demo form's numbers (says ~1,750 emails, seeds ~1,350).

**3 · M2 hard gates — before ANY paying client** 🔴
**#284** product still on $1 lead_gen (see 1d — also an M2 gate: never charge a paying client on the wrong plan) · **#211** one shared sending domain (one bad client poisons all) · **#268** review-gate is a FALSE PROMISE (toggle saved, no send path reads it — fix or hide) · **#264** 🩷 webhook replay idempotency **LIVE (#884)** — **⛔ run migration `20260702_webhook_idempotency.sql` on prod** to activate (safe no-op until then); *audit hardening owed: idempotency key on the Paystack charge + record-after-success (mid-crash retry currently loses the reply)* · 💰 **charge-without-send** if `RESEND_API_KEY` unset (`lib/figsy.ts:443,998`) — **verify prod env in one click: open `/engine/env?key=<ADMIN_SECRET_KEY>`** (live, merged #885; *audit gap: `ready.billing` doesn't check `STRIPE_PRICE_*`/`PAYSTACK_PLAN_*` ids — can read true while checkout would fail*) · *(doc: inventory #15 re-dotted 🩷 — its review-gate is #268)*.

**4 · M3 admin build** 🩷 — *ALL 9 slices MERGED to `main` 2 Jul (build-live, one PR each). Walk the admin; 2 Finance defects + the shells' data wires remain.*
Build order (done): **#277** design adoption (A/B/C/C.2) → **#282** dedup (D) → **#281** Clients (E) → **#277** Finance→kit (F) → **#278** GTM (G) → **#279** Engine (H) → **#274** Sales Channel (I) → **#280** Ops.
- ▶ **Slice A — design-system foundation: MERGED #887** — kit + tokens + recharts (invisible plumbing; admin was already violet, so nothing changed on screen — by design).
- ▶ **Slice B — Nora + Cockpit: MERGED #888 (founder saw it live)** — Nora on the `AgentSidePanel` look, admin on the `kind-gradient` backdrop, Cockpit on frosted cards.
- ▶ **Slice C — honesty + defect sweep: MERGED #890** — fake charts gated to sample-tagged lenses only · HubSpot cut · System-health = real `/health` probe · **Cockpit MRR fixed** (`amount_usd` source-of-truth) · dead `KpiTargetsSection` deleted · Nora float/fallback. *(C.1 crop fix folded into C.2.)*
- ▶ **Slice C.2 — chrome parity: MERGED #893** — Nora rebuilt as a **docked collapsible right-rail** (portal `AgentColumn` parity) **+ sidebar slim-by-default** (`pinned` default `true→false`); #892 closed redundant.
- ▶ **Slice D — Cohorts dedup: MERGED #896 (#282)** — Finance's hardcoded sample cohorts table removed; `/cohorts` (real query) is the sole home.
- ▶ **Slice E — Clients rebuild: MERGED #897 (#281 🔴→🩷)** — Clients hub to the kit + **At-risk** tile + Activity/Activation/Messages folded into a `ClientsTabs` bar (3 loose sidebar rows dropped).
- ▶ **Slice F — Finance → kit: MERGED #898 (#277)** — all 16 revenue cards frosted to the kit.
- ▶ **Slice G — GTM Hub shells: MERGED #899 (#278)** — new `/gtm` route + sidebar row · Strategy/Results/Winning-plays/Content-calendar as honest wire-in shells (no fake data). Stays 🔴 pending real data.
- ▶ **Slice H — Engine graph shell: MERGED #900 (#279)** — Deliverability-over-time frosted card (empty axes + "needs reporting endpoint", no fake points) + Engine cards to kit. Stays 🔴 pending endpoint.
- ▶ **Slice I — Sales Channel shells: MERGED #901 (#274)** — Contracts vault + Winning plays tabs + per-person targets card, all labelled "needs AE data (#276)". Stays 🔴 pending #276.
- ▶ **Slice Ops — Admin Ops shells: MERGED #902 (#280)** — new `/ops` route + sidebar row · inbox-pool/day-29/onboarding cards labelled "needs Smartlead access". Stays 🔴/⏸ pending Smartlead.
- ✅ **AUDIT (2 Jul PM) — the 2 Finance defects are now FIXED** (commit `45fb71b`): MRR prefers `amount_usd` (was `amount_zar`-only → $0 with USD subs); retired "$20 Lead Gen" ARPU tier cards removed (real Blended ARPU kept). **Open admin 🐛 now: (1) Sales-Channel Coverage "2.1× ✓" + Needed "$4,500" are hardcoded literal strings** (`command/page.tsx:212` → **#294**); **(2) 6 dead icon imports** in `AdminSidebar.tsx` (**#299**).
- 🕳️ **AUDIT (2 Jul PM) — the executive-lens gap report (§③ below):** 9 nervous-system holes logged as tracked items — **#285 alerting · #286 dunning · #287 MRR waterfall · #288 sales analytics · #289 NPS · #290 error-tracking · #291 funnel-join · #292 usage-trend · #293 at-risk-playbook** (+ #295 invoices · #296 refunds · #297 renewals · #298 backup-drill). All 🤖 buildable now except #298 (🤝 drill). **The pattern: we have a good dashboard; what's missing is the nervous system — nothing tells you anything, you must go look.**

**GTM — Fri 3 Jul (tomorrow):** 12 weeks of LinkedIn posts → creates `docs/content/linkedin-playbook.md`.

---

## ① OUTREACH OURSELVES — Milestone 1 · *sell K.I.N.D via our own cold email*
### 👉 Bottom line *(Fable regroup, 2 Jul PM · post-merge)*: the ENGINE is done and **every build blocker is now cleared** — 1a postal address + 1b 4-email cadence + ToS $3 all LOCKED (merged #913), site repriced to $3 (#912), **#284 lead_gen retired in the product** (signup now creates a FIGSY plan, portal sells FIGSY-only — merged #911). **What now gates ① is ONLY the Instantly warm-up clock (your side) + your manual import/test/fire.** Nothing left for me to build here except the 2 tiny wording defects (to re-verify).

### 🔲 WHAT'S LEFT (the full drill — all 🧍 you, all ⏱ no-build, in strict order)
| # | What's left | Dot | Owner |
|---|-------------|-----|-------|
| 🛑 GATE | Instantly inbox warm-up ≥90% (#198) — the #1 gate, 1–2 wk clock | ⏸ | 🧍 you |
| 1 | Upgrade Instantly plan (capacity ≥1,500 sends) | 🔴 | 🧍 you |
| 2 | Import the 1,461-person list | 🔴 | 🧍 you |
| 3 | Load the **4 emails + 1 LinkedIn** sequence into Instantly (Day 0/3/6-LI/8/10) | 🔴 | 🧍 you |
| 4 | mail-tester 10/10 (#101) | 🔴 | 🧍 you |
| 5 | Test-send 10–20 → check inbox placement (Primary, bounce <2%, spam <0.3%) | 🔴 | 🧍 you |
| 6 | 🚀 Fire first outreach (#127) + dogfood monitor (#132) | 🔴 | 🧍 you |
| 7 | 2 tiny wording defects `vs-salesloft:351,354` ("$60 total") | 🐛 | 🤖 me (re-verify if still live) |

**Cleared this pass:** 1a address · 1b 4-email cadence · ToS $3 (#913) · 1c/1d website $3 + #284 lead_gen retired (#911/#912).

### ✅ Done (code-verified 1 Jul)
| What | Evidence |
|------|----------|
| Product built + fully walked (Section A 17 🟢 + Section B engine) | the thing we sell works |
| Outreach list — **1,461 verified US emails**, 6 cols, 0 blanks/dups | `kind_instantly_import.csv` *(last counted live 29 Jun; file is PII-protected, off-repo)* |
| Cold sequence written, ≤50 words — **3 emails (Day 0/3/10) + 1 manual LinkedIn (Day 6)**; CAN-SPAM/GDPR footer drafted 2 Jul (**⛔ postal address to confirm**) | `docs/content/our-outreach-us-uk.md` (in repo; 3 emails paste-ready once address is set) |
| Deliverability code D1–D5 — List-Unsubscribe + 1-click, plain-text alt, tracking-pixel phishing guard, cold-FROM, warmup ramp, spam-score check | `apps/api/src/lib/deliverability.ts` |
| Cold domain `gettingkind.com` — SPF/DKIM/DMARC (`p=quarantine`) verified; MX→Resend inbound (replies webhook to app) | verified 29 Jun (Resend + Cloudflare) |
| Cold-send env set in Railway — `FIGSY_COLD_FROM` · `FIGSY_COLD_REPLY_TO` · `TRACKING_URL` | set 29 Jun |
| GA4 (`G-0BCMTW9HSK`) on all 62 pages · Stripe credit purchase verified live | PR #812 / #814 |

### 🔲 Left — all 🧍 you, **all ⏱ (no build)**, in strict order
| # | Step | Done-condition |
|---|------|----------------|
| 🛑 **GATE** | ⏱ **Confirm Instantly inbox warmth ≥90%** (#198) — the #1 gate; 1–2 wk clock | Instantly dashboard shows ≥90% inbox placement on seed sends |
| 1 | ⏱ Upgrade Instantly plan (capacity for ≥1,500 sends) | paid plan active |
| 2 | ⏱ Import the 1,461 list | `kind_instantly_import.csv` uploaded, all rows ingested, 0 errors |
| 3 | ⏱ Load the 4-step sequence | all 4 steps (Day 0/3/6/10) created in Instantly, pasted from `our-outreach-us-uk.md` |
| 4 | ⏱ **mail-tester 10/10** (#101) | real send from warm domain → mail-tester.com = 10/10, SPF/DKIM/DMARC aligned |
| 5 | ⏱ Test-send 10–20 → check placement | Primary (not Promotions), bounce <2%, spam <0.3%, replies land in unibox |
| 6 | 🚀 ⏱ **Fire first outreach** (#127) → dogfood monitor (#132) | campaign running; reply rate tracked (target ≥5% d3 / ≥10% d7) |

> 🛑 **BUILD BLOCKERS before prospects land (audit 2 Jul) — the three 1a/1b/1c items from HYPER-FOCUS:**
> **1a — CAN-SPAM — ✍️ DRAFTED 2 Jul (branch `claude/pr5-outreach-compliance`):** added the REQUIRED email footer to §4 (opt-out link + reply-to-opt-out + physical postal address) — because the FIGSY List-Unsubscribe header is code-only and does NOT apply via Instantly. Set it as the Instantly campaign footer. **⛔ still needs the real registered POSTAL ADDRESS (placeholder in place) — not legal to fire at the US list until filled.**
> **1b — Sequence math — ✍️ DRAFTED 2 Jul:** §4 relabelled to **3 emails (Day 0/3/10) + 1 manual LinkedIn (Day 6)**; the 3 emails are what you paste into Instantly. An **optional Day-8 4th email** is drafted for a 4-email cadence (⛔ confirm copy).
> **1c — Pricing (#283) — 🩷 LIVE (merged #883 = deployed; audit-verified 2 Jul PM):** retired the **$1 Lead-Gen tier** + stale **$20 entry** site-wide → single **$3 FIGSY** (entry $60; bundles 20/40/100 = $60/$120/$300); zero stale pricing confirmed by sweep; dead footer link fixed (55 pages) + footer entry relabelled (56). **⛔ Owed: you walk the live pages · ToS legal sign-off (`terms.html` §2/§4/§6 — the wording is my draft and it is ALREADY LIVE)** · 2 tiny wording defects queued (`vs-salesloft:351,354` "$60 total"). Ties #239.
> **1d — #284 website↔product mismatch — 🛑 THE gate:** the product still signs clients up on **$1 lead_gen** and sells **$20/$40/$100 Lead-Gen bundles** in the portal, contradicting the live site. Retire lead_gen in the product (shared `PRICING` · `billing-rules` default · portal Billing UI · signup product) — **needs you for the Stripe 40/$120 price ID + the trial-credits decision (20 free $1 credits → what in the $3 world?).**

**Front ① is done when:** product matches the site (#284) · postal address in the footer (1a) · Instantly warm · first send fired.

---

## ② OPERATE A PAID CLIENT + TEAM — Milestone 2 · *a client pays, then runs the product*
### 👉 Bottom line: the client **revenue loop works end-to-end** (log in → build ICP → find leads → FIGSY sends on a 2-hourly scheduler → replies classified → 4 agents → billing → ROI → Command Centre). **NOT ready** because of **security holes that leak/hijack across clients**, **no per-client sending isolation (#211=Smartlead, read-only today)**, a **Stripe purchase-grant race**, and **Apollo-only discovery**. Security is now the #1 gate — above #211.

### ✅ Done — genuinely works (code-verified 1 Jul, file:line)
| What | Evidence |
|------|----------|
| **Full client UI loop** — leads · ICP · FIGSY campaigns · unibox/replies · all 4 agents (Figsy/Milla/Denise/Vida) · billing · ROI · Command Centre | portal audit — no dead buttons on the money path |
| **Sequences actually drip** — a 2-hourly cron sends due steps; auto-enroll sends step 1 on enroll | `cron.ts:41`, `figsy.ts:993` *(gated on `RESEND_API_KEY` + `ADMIN_SECRET_KEY` — see ⚠️ env)* |
| **Replies captured + AI-classified** — inbound webhook, hot→pause+CRM, opt-out→blocklist | `figsy.ts:118` |
| **Client can PAY + charges are correct** — Stripe checkout live; **deduction** is atomic (charge-on-delivery + enroll-charge via RPCs); no delivery-without-charge leak; pause stops billing (#190) | `lead-delivery.ts:104`, `figsy.ts:969` |
| **Lead finding works (Apollo default)** + enrichment waterfall PDL→Hunter→Clearbit | `apollo.ts:251`, `enrichment.ts:1` |
| **Company/team engine (#88)** — owner + reps, per-rep live stats, budgets, credit requests | `routes/company.ts` |
| Lead-Gen double-charge (#166) killed; `plan` column shipped; Paystack legacy | migration `20260616`, `routes/paystack.ts` |
| ✅ **Shipped 1 Jul** — 🟢 **#266** /team auth · 🟢 **#261** ownership+RLS · 🟢 **#263** CI · 🟢 **#262** pause migration · 🩷 **#260** blocklist · 🩷 **#265** Stripe grant · 🩷 **cap+#267** bounce · 🩷 **#243** Apollo-independence | PRs #855/#859/#861/#863/#864 *(🩷 = your env/webhook action to finish)* |

> ⚠️ **The "warm and nothing happens" trap (env, silent no-ops):** if `RESEND_API_KEY` is unset, rows say "sent" but **no mail leaves** (`figsy.ts:414`); if `ADMIN_SECRET_KEY` is unset, **every cron silently skips** → only step 1 ever sends (`cron.ts:8`). Also confirm `ANTHROPIC_API_KEY`, `RESEND_WEBHOOK_SECRET`, `FIGSY_COLD_FROM` (NOT the transactional domain), `FIGSY_WARMUP_START`, `TRACKING_URL`. **Verify these BEFORE any real send.**

### 🔲 WHAT'S LEFT (the full drill — two real gates + hardening; revenue loop itself 🟢 works)
| # | What's left | Dot | Size | Owner |
|---|-------------|-----|------|-------|
| 🛑 1 | **#211 sending engine = Smartlead** — per-client isolated + warmed mailboxes. Only Phase-1 read-only built (`smartlead.ts`, zero sending); real sends share ONE domain + ONE global cap. **Smartlead replaces Apollo's SENDING, not its DATA.** | 🔴 | **BIG (multi-day)** | 🤝 blocked on you giving Smartlead access → then I build |
| 🛑 2 | **#264 run migration** `20260702_webhook_idempotency.sql` on prod — code is LIVE, safe no-op until the migration runs (then webhook replay is idempotent). | 🩷→needs run | ⏱ | 🧍 you |
| 3 | **$60 live money walk** (#28b) — add $60 to a LIVE account → prove every credit movement (pool fund · rep allocate · approve · delivery/enroll deduct · deactivate return · counters reconcile). | 🔴 | ⏱ | 🧍 you (when funded) |
| 4 | **Depth + hardening:** #212 sequence depth · #199 monitoring · #269 rate limits · #273 schema consolidation. | 🔴 | med | 🤖 me |
| 5 | **Audit hardening** — idempotency key on the Paystack charge + record-after-success (a mid-crash retry currently loses the reply). | 🐛 | small | 🤖 me |

**Cleared this pass:** #268 review-gate false-promise **hidden** (#907, toggle no longer shown) · **charge-without-send guard added** (#906, refuses to enroll/charge if `RESEND_API_KEY` unset) · security 🟢 #266/#261/#262/#263 · 🩷 #260/#265/#267/#243.

**Front ② is done when:** each client isolated (#211) · #264 migration run on prod · $60 proven live. *(Security + money-grant already closed: ✅#266/#261/#262/#263 · 🩷#260/#265/#267/#243.)*

---

## ③ ADMIN CENTRE + OPERATIONS — Milestone 3 · *the cockpit we run the business from*
### 👉 Bottom line: M2 makes the product usable *by a client*; **M3 is how WE actually onboard, operate, and get paid.** Onboarding triggers + finance + team/partner oversight + Nora (admin co-pilot) live here. **Full spec: `docs/admin-centre-spec.md`.** *(The clickthrough preview was a session artifact shared in-chat — not stored in the repo.)*
### 🏗️ Build mode = **LIVE.** Admin is internal (not client-facing) → no preview gate. I build → push live → **you beta-test in the live system** → verify → next piece.

### 📊 FULL BUILD AUDIT (1 Jul — the complete M3 picture)
Ladder: 🔴 not built · 🟡 built (pending) · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked. *(Status of record = PRODUCT-INVENTORY #272/#274/#275/#276/#277–#282; full structure = `admin-centre-spec.md`.)*

**🎨 Design foundation** *(Slice A merged #887 · Slice B merged #888 — 2 Jul)*
| Item | Status |
|---|---|
| Portal theme adopted (violet/Inter/gradients/dark + `kind-gradient` backdrop) | 🩷 *(live #887/#888)* |
| Shared kit — StatCard | 🩷 *(portal-parity StatCard added #887; kit not yet consumed by screens)* |
| Shared kit — Card / Button / Pill / Table | 🩷 *(Button added #887; kit not yet consumed by screens)* |
| Shared kit — MarkdownLite | 🩷 *(copied + re-exported #887; used by Nora)* |
| Slim collapsible sidebar (portal look) | 🩷 *(already existed — audit confirmed; no rebuild needed)* |
| Recharts added | 🩷 *(installed #887; first consumer = #279 Engine graph)* |

**🤖 Nora**
| Item | Status |
|---|---|
| Nora right rail | 🩷 |
| Nora context-aware per screen | 🩷 |
| Nora live chat endpoint (`/founder/nora`) | 🩷 |
| Nora rebuilt on portal `AgentSidePanel` look | 🩷 *(now a **docked collapsible right-rail** — #893, 2 Jul; portal `AgentColumn` parity · `localStorage` collapse · slim avatar strip top-right · lives inside scrolled `<main>`)* |

**🩺 Cockpit**
| Item | Status |
|---|---|
| Pulse — MRR | 🩷 |
| Pulse — Cash & runway | 🩷 ⏸ |
| Pulse — Clients | 🩷 |
| Pulse — This week | 🩷 |
| Pulse — System health | 🩷 *(real `/health` probe since Slice C — Healthy/Degraded/Unreachable)* |
| Pulse — Pool stock | 🩷 ⏸ |
| Needs you now — at-risk (live) | 🩷 |
| Needs you now — trigger rows (signup/payment/switch/pool) | 🔴 |
| Unit economics — margin | 🩷 |
| Unit economics — net | 🩷 |
| Cockpit layout → portal kit | 🩷 *(frosted portal cards #888 · MRR fixed to `amount_usd` + `KpiTargetsSection` deleted, Slice C #890)* |

**👥 Clients**
| Item | Status |
|---|---|
| Client list | 🩷 |
| Client drill-down | 🩷 |
| Summary tiles (incl. At-risk) | 🩷 *(Slice E #897)* |
| Fold in Activity | 🩷 *(ClientsTabs #897)* |
| Fold in Activation | 🩷 *(ClientsTabs #897)* |
| Fold in Messages | 🩷 *(ClientsTabs #897)* |
| Rebuilt layout → kit | 🩷 *(frosted cards #897)* |

**🎖️ Sales Channel**
| Item | Status |
|---|---|
| Lens — Overall | 🩷 (sample) |
| Lens — per-AE | 🩷 (sample) |
| Lens — per-Partner | 🩷 (live) |
| Tab — Analytics | 🩷 *(tiles real · sample charts now gated to `ent.sample` only — live partner lens gets honest wire-in states, Slice C)* |
| Tab — Performance | 🩷 |
| Tab — ROI | 🩷 |
| Tab — Pipeline | 🩷 |
| Tab — Targets (KPI/monthly/core) | 🩷 |
| Demos + closure | 🩷 |
| Book MRR + commission | 🩷 |
| Targets per person (mo/qtr/yr) | 🔴 *(shell built #901 — per-person card in Targets tab, labelled "needs AE data #276"; not functional until #276)* |
| 3× pipeline coverage | 🐛 *(**#294** — Coverage "2.1× ✓" + Needed "$4,500" are hardcoded literal strings on the AE lens, `command/page.tsx:212`, NOT computed. The real open admin bug. Fix: compute or honest `—`. Full compute = #288.)* |
| Mini-CRM | 🩷 |
| Contracts vault | 🔴 *(shell built #901 — wire-in tab, "needs AE data #276")* |
| Winning plays (per person) | 🔴 *(shell built #901 — wire-in tab, "needs AE data #276")* |
| Partner management folded (approve/deals/commissions) | 🔴 |
| Proposals folded | 🔴 |
| AEs real + logins | 🔴 |

**💷 Finance**
| Item | Status |
|---|---|
| Track — Xero | 🩷 ⏸ |
| Track — Wise | 🩷 ⏸ |
| Track — Stripe | 🩷 ⏸ |
| Revenue — MRR live | 🩷 *(FIXED 2 Jul, commit `45fb71b` — now prefers `amount_usd` source-of-truth + zar fallback, `revenue/page.tsx:126`; was `amount_zar`-only → $0 with USD subs. Live, not walked.)* |
| Revenue — Active paying subs | 🩷 |
| Revenue — Blended ARPU | 🩷 |
| Risk — revenue at risk | 🩷 |
| Scenario tracker | 🩷 |
| 90-day forecast | 🩷 |
| ARPU breakdown (tiers card) | 🩷 *(FIXED 2 Jul, commit `45fb71b` — retired "$20 Starter · Lead Gen" tier cards removed; real Blended ARPU kept, `revenue/page.tsx`. Live, not walked.)* |
| Credit sales | 🩷 *(empty placeholder — no data path until the billing webhook wires in)* |
| Cost stack | 🩷 |
| Finance layout → kit | 🩷 *(all 16 revenue cards frosted, Slice F #898)* |
| Cohorts duplication removed | 🩷 *(Finance sample table removed, `/cohorts` sole home, Slice D #896 · churn/MRR single-homing still open → #282)* |

**📣 GTM**
| Item | Status |
|---|---|
| CMO tools | 🩷 |
| Our replies (unibox) | 🩷 |
| Visitor intelligence | 🩷 |
| GTM Strategy | 🔴 *(shell built #899 — `/gtm` wire-in tab; needs strategy sign-off)* |
| GTM Results | 🔴 *(shell built #899 — wire-in; needs our outreach live, M1)* |
| Winning plays | 🔴 *(shell built #899 — wire-in; needs the plays feed)* |
| Content calendar | 🔴 *(shell built #899 — wire-in; needs the content feed)* |
| HubSpot removed | 🩷 *(cut in Slice C — nav + page deleted)* |
| GTM layout → kit | 🩷 *(new `/gtm` hub built in the kit #899 · existing cmo/unibox/visitors not yet restyled)* |

**⚙️ Engine**
| Item | Status |
|---|---|
| Send status (cron / volume / bounce) | 🩷 *(service dots live · cron block + volume/bounce are placeholders)* |
| Env readiness checklist | 🩷 |
| Health graph | 🔴 *(shell built #900 — Deliverability-over-time empty frame; needs reporting endpoint)* |
| Engine layout → kit | 🩷 *(all Engine cards frosted to kit, Slice H #900)* |

**🛠️ Ops**
| Item | Status |
|---|---|
| Sales Demo | 🟢 |
| Inbox pool management | 🔴 ⏸ *(shell built #902 — `/ops` cards "needs Smartlead access")* |
| Onboarding ops | 🔴 *(shell built #902 — `/ops` onboarding runbook, mirrors SOP)* |
| Founder-agent → Nora | 🔴 |

**🛡️ Compliance**
| Item | Status |
|---|---|
| Compliance | 🟢 |
| Terms | 🟢 |

**🧪 Dev (hidden)**
| Item | Status |
|---|---|
| Seed | 🩷 |
| Smoke test | 🩷 |

**🔌 Data wiring — blocked (needs reporting endpoint)**
| Item | Status |
|---|---|
| AE / Overall analytics live | ⏸ |
| Engine health graph live | ⏸ |
| Content calendar live | ⏸ |
| Winning plays live | ⏸ |

**🧍 Founder-blocked (connect / creds)**
| Item | Status |
|---|---|
| Connect Xero | ⏸ |
| Connect Wise | ⏸ |
| Connect Stripe | ⏸ |
| Smartlead pool access | ⏸ |
| Trigger #270 signup→assign | 🔴 |
| Trigger #271 payment→provision | 🔴 |
| Day-29 switch | 🔴 |
| PDL_API_KEY (#243) | ⏸ |
| Resend bounce events (#267) | ⏸ |
| Set targets per AE/partner | 🧍 |
| Contract templates | 🧍 |

**🏗️ Bigger build**
| Item | Status |
|---|---|
| Per-staff AE logins + roles (#276) | 🔴 |

### 🩺 EXECUTIVE-LENS GAP REPORT — the nervous-system holes (Fable audit, 2 Jul · full drill, not condensed)
**Framing:** you are CEO / CFO / COO / CMO / CTO / CS **+ Sales Director** in one person. The admin IS your entire executive team. Each lens = "what that officer must know to not fly blind," what you HAVE, and the HOLE. *(Every 🔴 HOLE / 🐛 below is now a tracked item — #285–#299.)*

#### 1 · CEO lens — "is the business winning?"
| Need | Have | Verdict |
|------|------|---------|
| One-screen company pulse | Cockpit: MRR, clients, signups-7d, system health, at-risk | 🩷 works (real data) |
| Targets vs actuals | Targets ladder (Sales Channel) + Finance progress bars | 🩷 works |
| Unit economics | Cockpit margin/net card | 🩷 works — cost side is an estimate until Xero |
| Growth trend (MoM MRR, net new) | ❌ nowhere — only point-in-time MRR | 🔴 HOLE (**#287**) |
| Cash & runway | "Connect Wise" placeholder | ⏸ you (Wise) |
| Decision log | KIND-MASTER (docs) | 🟢 |
| Being told when something breaks | ❌ nothing pushes to you — every screen is pull | 🔴 **BIGGEST HOLE (#285)** |

#### 2 · CFO lens — "where's the money?"
| Need | Have | Verdict |
|------|------|---------|
| MRR of record | Finance page | 🩷 **FIXED** (`45fb71b` — was 🐛 ZAR-only) |
| MRR movements (new/expansion/contraction/churn waterfall) | ❌ | 🔴 HOLE (**#287**) — can't see *why* MRR moved |
| ARPU / pricing tiers | ARPU card | 🩷 **FIXED** (`45fb71b` — retired $20 tiers removed) |
| Revenue-at-risk | Real (churn engine) | 🩷 works |
| Scenario / forecast | Conservative/Base/Optimistic + 90-day | 🩷 works (model, not data) |
| Cost stack (real) | Estimate table | ⏸ Xero |
| Cash position / burn | ❌ | ⏸ Wise |
| Failed payments / dunning | Cockpit *counts* past_due — no workflow, no retry, no alert | 🔴 HOLE (**#286**) — a failed payment silently sits |
| Invoice/receipt ledger | ❌ no admin view (client-side exists) | 🔴 HOLE (**#295**) |
| Refunds tracking | ❌ | 🔴 HOLE (**#296**) |
| Partner commission payouts | Partners + Sales Channel (real) | 🩷 works |

**CFO verdict:** the two money bugs are FIXED; cash is still invisible (⏸ Wise/Xero) and there's no dunning/invoice/refund view.

#### 3 · COO lens — "does the machine run?"
| Need | Have | Verdict |
|------|------|---------|
| Onboarding pipeline (signup→value) | Activation funnel — real milestones, stall flags | 🩷 works, genuinely good |
| Client lifecycle triggers | Cockpit queue + Ops shells | 🔴 ⏸ Smartlead (#270/#271) |
| Capacity (inbox pool) | Ops shell | 🔴 ⏸ Smartlead (#280) |
| Delivery SLA (time-to-first-lead) | TTFL per client on Cockpit | 🩷 works |
| Engine health | Real `/health` probe + env checklist + `/engine/env` | 🩷 works |
| Audit trail | Activity log — real, filterable | 🩷 works |
| Incident response — know within minutes if sends fail / API dies | ❌ `/health` only answers when YOU open it | 🔴 HOLE (**#285**) |
| Runbooks/SOP | `client-flow-sop.md` | 🟢 |

#### 4 · CMO lens — "where do customers come from?"
| Need | Have | Verdict |
|------|------|---------|
| Funnel: visitor→signup→trial→paid | Pieces exist (Visitors, signups, Activation) — never joined | 🔴 HOLE (**#291**) — no conversion rates, no attribution |
| CAC by channel | ❌ | 🔴 HOLE (**#291** — needs spend data + attribution) |
| Campaign results (our outreach) | GTM Results shell | 🔴 (#278 — waits on M1 live; correct sequencing) |
| Content calendar | Shell | 🔴 (#278 — Friday's LinkedIn playbook feeds it) |
| Winning plays | Shell | 🔴 (#278 — needs data) |
| Reply management | Unibox | 🩷 works |
| Website intel | Visitors | 🩷 works |

**CMO verdict:** correctly mostly-shells — can't measure marketing before you DO marketing (M1). The visitor→paid funnel join (#291) is the one buildable-now piece.

#### 5 · CTO lens — "is it safe and up?"
| Need | Have | Verdict |
|------|------|---------|
| Uptime awareness | `/health` probe (pull) | 🩷 partial (#199 = uptime pings) |
| Error tracking (exceptions in prod) | ❌ no Sentry/equivalent | 🔴 HOLE (**#290**) — prod errors vanish into Railway logs |
| Env/config readiness | `/engine/env` | 🩷 |
| Security posture | Route scoping sound; rate-limit gaps (#269); admin key in URL | 🐛 two knowns (#269) |
| Deploy status | Railway auto-deploy (outside admin) | 🟢 acceptable |
| Backups/restore | ❌ never tested | 🔴 HOLE (**#298**) — Supabase backs up, restore untested |
| Smoke test | `/smoketest` | 🩷 |

#### 6 · Customer Success lens — "do clients stay?"
| Need | Have | Verdict |
|------|------|---------|
| Health scores + churn risk | Real churn engine, reasons, scores | 🩷 works — best-in-class for your stage |
| At-risk workflow | List + "Open client" — no playbook/next-action | 🐛 half (**#293**) — you see risk, nothing guides the save |
| Onboarding progress per client | Activation | 🩷 works |
| Support inbox | Messages (2-way) | 🩷 works — no SLA tracking |
| NPS / feedback | Target ">50" exists — no collection mechanism | 🔴 HOLE (**#289**) — a KPI you cannot measure |
| Usage trends per client | Point-in-time only (leads 14d, sends 7d) | 🐛 no trend (**#292**) — can't see a client fading |
| Renewal/expansion signals | ❌ | 🔴 HOLE (**#297** — early-stage acceptable) |

#### 7 · Sales Director lens — "is the pipeline going to close?"
| Need | Have | Verdict |
|------|------|---------|
| Pipeline value by stage (weighted $) | Mini-CRM stages (won/lost/demo/trial/registered/expired); "Open pipeline" per rep | 🩷 partner side real · 🔴 AE side sample (⏸ #276) |
| Coverage ratio (pipeline ÷ target) | "Coverage 2.1× ✓" on screen | 🐛 **FAKE** (**#294**) — hardcoded string (`command/page.tsx:212`), not computed |
| Quota / target attainment per rep | "Needed (3×) $4,500" on screen | 🐛 **FAKE** (**#294**) — hardcoded string; no target table, no attainment math |
| Win rate (won ÷ closed) | stages exist in data | 🔴 HOLE (**#288**) — never computed |
| Sales-cycle length / velocity | deal timestamps exist | 🔴 HOLE (**#288**) — never computed |
| Forecast (this month/quarter close) | ❌ | 🔴 HOLE (**#288**) |
| Stalled / at-risk deals (no movement N days) | ❌ (the at-risk playbook is CS-churn, not deal-stall) | 🔴 HOLE (**#288**) |
| Per-rep leaderboard / activity | AES entities `sample:true` (tagged) | 🔴 shell (⏸ #276) |
| Partner-sourced pipeline | live from `/api/proxy/partners/admin/*` | 🩷 works |

**Sales Director verdict:** the screen exists (#274 — 7 tabs) but is partner-live / AE-sample-shell, and two headline numbers — **Coverage and Needed — are hardcoded fictions (#294), not honest shells.** More dangerous than a missing chart: a Sales Director makes headcount calls on a "2.1× ✓ coverage" that was typed by hand. Shares CFO's old disease — the number lies.

#### 🕳️ THE HOLES — ranked (what should be here and isn't)
| # | Hole | Officer | Item | Why it matters | Unblock |
|---|------|---------|------|----------------|---------|
| 1 | No push alerting — payment fails / sends die / API down / churn → silence | CEO/COO | **#285** | You run the business by remembering to look; one missed day = silent damage | 🤖 buildable now |
| 2 | Sales Channel lies — Coverage "2.1×✓" + Needed "$4,500" hardcoded | Sales Dir | **#294** | Headcount/quota calls off a typed-in number | 🤖 buildable now |
| 3 | No dunning / failed-payment workflow | CFO | **#286** | Churn you never see = revenue leak | 🤖 buildable now |
| 4 | No MRR movement waterfall + MoM trend | CFO/CEO | **#287** | "MRR moved" without the why | 🤖 buildable now |
| 5 | No sales analytics — win-rate/velocity/forecast/stalled-deal | Sales Dir | **#288** | Can't tell if pipeline will actually close (deal data already exists) | 🤖 buildable now |
| 6 | No NPS collection | CS | **#289** | KPI exists, measurement doesn't | 🤖 small build |
| 7 | No error tracking | CTO | **#290** | Prod exceptions invisible | 🤖 small (Sentry free tier) |
| 8 | Funnel not joined (visitor→paid) + CAC | CMO | **#291** | Can't compute conversion/CAC | 🤖 buildable now |
| 9 | No per-client usage trend | CS | **#292** | Can't see fading clients before churn engine fires | 🤖 buildable |
| 10 | At-risk save playbook | CS | **#293** | Risk visible, action isn't (fold into Nora) | 🤖 buildable |
| 11 | No admin invoice/receipt ledger | CFO | **#295** | Can't see what clients were billed | 🤖 buildable |
| 12 | No refunds tracking | CFO | **#296** | Refunds don't reconcile against revenue | 🤖 buildable |
| 13 | No renewal/expansion signals | CS | **#297** | Early-stage acceptable, but a named hole | 🤖 buildable |
| 14 | 6 dead sidebar imports | CTO | **#299** | Lint/bundle hygiene | 🤖 tiny |
| 15 | Cash/runway · real costs | CFO | ⏸ | Flying on estimates | ⏸ you — Wise + Xero |
| 16 | Pool/triggers/provisioning | COO | #270/#271/#280 | The onboarding machine | ⏸ you — Smartlead |
| 17 | Per-AE pipeline / leaderboard / real coverage | Sales Dir | #276 | Rep-level management | ⏸ #276 (real AE logins + data) |
| 18 | Backup restore never tested | CTO | **#298** | Existential, low-likelihood | 🤝 one-time drill |

**The pattern:** what you HAVE is a good dashboard company. What's MISSING is the **nervous system** — nothing tells you anything; you must go look. And where a number *is* shown, one officer (Sales Director) is still shown a lie (#294 — CFO's two lies are now fixed). Holes 1–5 are the difference between a dashboard and an operating system, and all five are buildable without waiting on Smartlead, Xero, or anyone. **Recommended order once M1/M2 are clear: #294 (kill the last lie) → #285 (alerting) → #286 (dunning) → #287 (waterfall) → #288 (sales analytics).**

### 🧍 What you do (unblocks the live data + verifies)
| Item | Why |
|------|-----|
| Connect **Xero** (OAuth) + **Wise** | Finance cards go live (P&L, VAT, cash, runway) |
| Give **Smartlead** pool access/API (ties to #211) | Pool-stock tile + provision/switch triggers work |
| Set **PDL_API_KEY** (#243) + enable **Resend bounce events** (#267) | Engine section shows green |
| **Set targets** per AE / partner | the numbers Nora + Command Centre track against |
| Provide **contract/doc templates** (AE agreement · partner agreement) | wire into the per-person vault |
| **Beta-test each shipped piece in the live admin → verify → flip the dot** | build-live rhythm |

### 🤝 What we do together (decide before I build)
| Item | Decision needed |
|------|-----------------|
| **Action Queue rules** | exact thresholds — pool-low count · at-risk definition · day-29 timing |
| **Role matrix** | what a founder vs AE vs SDR can see/do |
| **Nora's scope + tone** | what she opens with per screen (all-round agreed; refine starters) |
| **Sequencing** | ship order (list above) — you test each live before the next |

**Milestone 3 is done when:** a client signs up → we're alerted → inbox assigned → on payment, branded inbox provisioned + switched — all run from the Admin Centre, with finance (Xero/Wise) tied in, the Command Centre watching every AE + partner against target, and Nora on the right rail.

---

## 🗓️ THE DAYS

| Day | Front | What | Owner |
|-----|-------|------|-------|
| **Wed 1 Jul** | ② | **M2 security+sending sweep — shipped one-by-one:** 🟢 #266 /team auth · 🟢 #261 ownership+RLS · 🟢 #263 CI · 🟢 #262 pause-migration · 🩷 #260 blocklist · 🩷 #265 Stripe grant · 🩷 cap+#267 bounce · 🩷 #243 Apollo-independence. Locked the **#211 client-sending model** (SOP). Lead-Gen→$3 parked to Thu. | 🤝 |
| **Thu 2 Jul — TODAY** | ①②③ | **THE HYPER-FOCUS (top of this doc):** **1** M1 blockers (1a CAN-SPAM opt-out+address · 1b sequence 3-vs-4 fix · 1c website $1→$3 #283 + Lead-Gen→$3 #239, client-facing → preview) · **3** M2 gates (#211 isolation · #268 fix-or-hide review toggle · #264 webhook idempotency · verify prod env keys) · **4** M3 admin build (#277 design adoption + walk-critical fixes → #282 dedup → #281/#278/#279/#280). *(#270/#271 triggers + #276 logins need Smartlead/role decisions · $60 walk when funded.)* | 🤝 |
| **Fri 3 Jul — TOMORROW** | ① | **GTM:** 12 weeks of LinkedIn posts (no pricing · no traction claims · safe only) → **output to create: `docs/content/linkedin-playbook.md`** *(doesn't exist yet — this task creates it)*. Plus **demo prep** (HYPER-FOCUS block 2) ahead of recording. | 🤝 |
| **Fri–Sat 3–4 Jul** | ①/② | Record product demo + Drop 01 (Claude preps demo company + shoot) → upload | 🤝 |
| **When you fund it** | ② | **$60 live money walk** — proves billing end-to-end (#28b) | 🤝 |
| **Your clock (parallel)** | ① | Instantly warmth ≥90% → import → mail-tester → test-send → **first outreach fired** | 🧍 |

---

*Open this → pick a milestone → do the next 🔲 in order. ① warm + fire (no build) · ② build the client sending engine + security · ③ build the Admin Centre cockpit. That's the whole page.*
