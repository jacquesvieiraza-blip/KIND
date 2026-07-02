# 🚀 K.I.N.D — LAUNCH PAD

**As of: 1 July 2026** · Three milestones. Nothing else on this page.
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

## 🎯 THIS WEEK — HYPER-FOCUS (full-system audit, 2 Jul · machine checks: tsc ×3 clean, 82/82 tests)
**Only these four blocks + Friday's GTM. Everything else waits.**

**1 · M1 blockers — fix BEFORE any prospect lands or any send** 🔴
| # | Blocker | Where |
|---|---------|-------|
| 1a | ✍️ **DRAFTED 2 Jul** (branch `claude/pr5-outreach-compliance`) — added the REQUIRED CAN-SPAM/GDPR footer (opt-out link + reply-to-opt-out + postal address) to §4, to set as the Instantly campaign footer · **⛔ you confirm the real registered POSTAL ADDRESS before first send** (placeholder in place) | `our-outreach-us-uk.md` §4 |
| 1b | ✍️ **DRAFTED 2 Jul** — §4 relabelled honestly to **3 emails (Day 0/3/10) + 1 manual LinkedIn (Day 6)**; paste the 3 emails into Instantly · **⛔ optional Day-8 4th email drafted — you confirm copy if you want a 4-email cadence** | `our-outreach-us-uk.md` §4 |
| 1c | ✅ **BUILT 2 Jul → website $1→$3 single-FIGSY** (#283, merged to main #883, **pending your preview**) · ⛔ ToS $3-only wording drafted, needs your legal sign-off before go-live | `figsy.html:831` `terms.html` §2/§4/§6 |

**2 · Demo prep — cheap, do before ANY face-to-face** ⚠️
Test the magic-link "Open Demo" flow beforehand (OTP dependency, `admin.ts:267-275`) · create the demo BEFORE the meeting (seeding runs inline) · never reopen an expired demo · steer around **Knowledge · Team · Integrations** (live nav, say "coming soon") · don't quote the demo form's numbers (says ~1,750 emails, seeds ~1,350).

**3 · M2 hard gates — before ANY paying client** 🔴
**#211** one shared sending domain (one bad client poisons all) · **#268** review-gate is a FALSE PROMISE (toggle saved, no send path reads it — fix or hide) · **#264** ✅ webhook replay idempotency **BUILT + merged (#884)** — **⛔ run migration `20260702_webhook_idempotency.sql` on prod** to activate (safe no-op until then) · 💰 **charge-without-send** if `RESEND_API_KEY` unset (`lib/figsy.ts:443,998`) — **verify prod env in one click: open `/engine/env?key=<ADMIN_SECRET_KEY>`** (booleans only, no secrets; `ready.sending`=M1, `ready.billing`=M2 — BUILT 2 Jul, branch `claude/pr4-env-readiness`) · *(doc: inventory #15 re-dotted 🩷 — its review-gate is #268)*.

**4 · M3 admin build (today)** 🔴 — *in progress, build-live, one slice per PR*
Build order: **#277** portal design adoption (theme + kit + Nora on `AgentSidePanel`) → walk-critical fixes (fake charts in live Partners lens · cut HubSpot · unify Sales-Channel naming) → **#282** dedup → **#281/#278/#279/#280**.
- ▶ **Slice A — design-system foundation: BUILT 2 Jul** (branch `claude/admin-a-design-system`, tsc + build green) — admin Tailwind now the portal violet ramp + Inter + gradients + dark; token system + `.ds-*` in globals; `ui.tsx` real kit (Button + StatCard + MarkdownLite); recharts in. Sidebar already slim/violet. **Next: Slice B — Nora on `AgentSidePanel` + Cockpit restyle.**

**GTM — Fri 3 Jul (tomorrow):** 12 weeks of LinkedIn posts → creates `docs/content/linkedin-playbook.md`.

---

## ① OUTREACH OURSELVES — Milestone 1 · *sell K.I.N.D via our own cold email*
### 👉 Bottom line *(corrected by the 2 Jul audit)*: the ENGINE is done, but **three content/site fixes gate ①** — CAN-SPAM opt-out+address in the cold emails (1a) · the 3-vs-4-step sequence fix (1b) · website $1→$3 (#283). After those → it's only the **Instantly warmth clock** + your manual import/test/fire.

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
> **1c — Pricing (#283) — ✅ BUILT 2 Jul (merged to main #883, pending your preview):** retired the **$1 Lead-Gen tier** + stale **$20 entry** across the whole site → single **$3 FIGSY** (entry $60; bundles 20/40/100 = $60/$120/$300). Fixed `index.html`, `pricing.html` (cards + compare matrix + FAQ + JS + add-on reframe), `figsy.html`, `vs-hiring-an-sdr.html`, `use-cases.html`, `solutions.html`, `partners.html`; dead footer `#products` link fixed (55 pages); footer "Lead Gen" entry relabelled (56 pages). **⛔ ToS $3-only wording drafted in `terms.html` §2/§4/§6 — needs your legal sign-off before it goes live.** Ties #239. **Next: you preview on staging → approve → it ships.**

**Front ① is done when:** website priced correctly (#283) · Instantly warm · first send fired.

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

### 🔲 Left — the build list, ranked (Wednesday order: security → money → isolation → data → depth)
| # | Item | Size | Why it blocks a paying client |
|---|------|------|-------------------------------|
| 🛑 1 | 🛑 **#211 sending engine = Smartlead** — per-client isolated + warmed mailboxes | **BIG (multi-day)** | we signed up, but only Phase-1 read-only is built (`smartlead.ts`, zero sending). Real sends share ONE domain + ONE global cap. **Smartlead replaces Apollo's SENDING, not its DATA.** *(tomorrow)* |
| 2 | **Lead-Gen → single $3 FIGSY** · **#212 sequence depth** · **#268 approval-send stub** · **#199 monitoring** · **#264 webhook idempotency** · **#269 rate limits** · **#273 schema consolidation** | med | product simplification + depth + hardening. |
| V | **$60 live money walk** (#28b) | ⏱ your action | prove every credit movement with real money. *(tomorrow)* |

**Front ② is done when:** security closed (✅#266 + ✅#261 + ✅#260) · money-grant atomic (✅#265) · each client isolated (#211) · $60 proven live. *(✅ = #266/#261/#262/#263 done · #260/#265/#267/#243 🩷 shipped, your env/webhook action to finish.)*

---

## ③ ADMIN CENTRE + OPERATIONS — Milestone 3 · *the cockpit we run the business from*
### 👉 Bottom line: M2 makes the product usable *by a client*; **M3 is how WE actually onboard, operate, and get paid.** Onboarding triggers + finance + team/partner oversight + Nora (admin co-pilot) live here. **Full spec: `docs/admin-centre-spec.md`.** *(The clickthrough preview was a session artifact shared in-chat — not stored in the repo.)*
### 🏗️ Build mode = **LIVE.** Admin is internal (not client-facing) → no preview gate. I build → push live → **you beta-test in the live system** → verify → next piece.

### 📊 FULL BUILD AUDIT (1 Jul — the complete M3 picture)
Ladder: 🔴 not built · 🟡 built (pending) · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked. *(Status of record = PRODUCT-INVENTORY #272/#274/#275/#276/#277–#282; full structure = `admin-centre-spec.md`.)*

**🎨 Design foundation**
| Item | Status |
|---|---|
| Portal theme adopted (violet/Inter/gradients/dark) | 🔴 |
| Shared kit — StatCard | 🟡 |
| Shared kit — Card / Button / Pill / Table | 🟡 |
| Shared kit — MarkdownLite | 🔴 |
| Slim collapsible sidebar (portal look) | 🔴 *(a basic collapse/pin exists — the portal-look rebuild is what's outstanding)* |
| Recharts added | 🔴 |

**🤖 Nora**
| Item | Status |
|---|---|
| Nora right rail (bespoke `NoraRail`) | 🩷 |
| Nora context-aware per screen | 🩷 |
| Nora live chat endpoint (`/founder/nora`) | 🩷 |
| Nora rebuilt on portal `AgentSidePanel` | 🔴 |

**🩺 Cockpit**
| Item | Status |
|---|---|
| Pulse — MRR | 🩷 |
| Pulse — Cash & runway | 🩷 ⏸ |
| Pulse — Clients | 🩷 |
| Pulse — This week | 🩷 |
| Pulse — System health | 🩷 *(static "Healthy" label, not a live check)* |
| Pulse — Pool stock | 🩷 ⏸ |
| Needs you now — at-risk (live) | 🩷 |
| Needs you now — trigger rows (signup/payment/switch/pool) | 🔴 |
| Unit economics — margin | 🩷 |
| Unit economics — net | 🩷 |
| Cockpit layout → portal kit | 🔴 |

**👥 Clients**
| Item | Status |
|---|---|
| Client list | 🩷 |
| Client drill-down | 🩷 |
| Summary tiles | 🔴 |
| Fold in Activity | 🔴 |
| Fold in Activation | 🔴 |
| Fold in Messages | 🔴 |
| Rebuilt layout → kit | 🔴 |

**🎖️ Sales Channel**
| Item | Status |
|---|---|
| Lens — Overall | 🩷 (sample) |
| Lens — per-AE | 🩷 (sample) |
| Lens — per-Partner | 🩷 (live) |
| Tab — Analytics | 🩷 *(tiles real · charts hardcoded — fake even in the LIVE partner lens, `command/page.tsx:157-167`)* |
| Tab — Performance | 🩷 |
| Tab — ROI | 🩷 |
| Tab — Pipeline | 🩷 |
| Tab — Targets (KPI/monthly/core) | 🩷 |
| Demos + closure | 🩷 |
| Book MRR + commission | 🩷 |
| Targets per person (mo/qtr/yr) | 🔴 *(corrected 2 Jul — Targets tab shows the same company-wide numbers for every AE/partner; no per-person UI)* |
| 3× pipeline coverage | 🩷 *(hardcoded shell — "2.1×" is a literal string, not computed)* |
| Mini-CRM | 🩷 |
| Contracts vault | 🔴 *(corrected 2 Jul — zero code; was overclaimed)* |
| Winning plays (per person) | 🔴 *(corrected 2 Jul — zero code; was overclaimed)* |
| Partner management folded (approve/deals/commissions) | 🔴 |
| Proposals folded | 🔴 |
| AEs real + logins | 🔴 |

**💷 Finance**
| Item | Status |
|---|---|
| Track — Xero | 🩷 ⏸ |
| Track — Wise | 🩷 ⏸ |
| Track — Stripe | 🩷 ⏸ |
| Revenue — MRR live | 🩷 |
| Revenue — Active paying subs | 🩷 |
| Revenue — Blended ARPU | 🩷 |
| Risk — revenue at risk | 🩷 |
| Scenario tracker | 🩷 |
| 90-day forecast | 🩷 |
| ARPU breakdown | 🩷 |
| Credit sales | 🩷 *(empty placeholder — no data path until the billing webhook wires in)* |
| Cost stack | 🩷 |
| Finance layout → kit | 🔴 *(corrected 2 Jul — the kit `ui.tsx` is imported nowhere; was overclaimed)* |
| Cohorts duplication removed | 🔴 |

**📣 GTM**
| Item | Status |
|---|---|
| CMO tools | 🩷 |
| Our replies (unibox) | 🩷 |
| Visitor intelligence | 🩷 |
| GTM Strategy | 🔴 |
| GTM Results | 🔴 |
| Winning plays | 🔴 |
| Content calendar | 🔴 |
| HubSpot removed | 🔴 |
| GTM layout → kit | 🔴 |

**⚙️ Engine**
| Item | Status |
|---|---|
| Send status (cron / volume / bounce) | 🩷 *(service dots live · cron block + volume/bounce are placeholders)* |
| Env readiness checklist | 🩷 |
| Health graph | 🔴 |
| Engine layout → kit | 🔴 |

**🛠️ Ops**
| Item | Status |
|---|---|
| Sales Demo | 🟢 |
| Inbox pool management | 🔴 |
| Onboarding ops | 🔴 |
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
