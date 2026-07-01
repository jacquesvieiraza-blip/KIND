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

## ① OUTREACH OURSELVES — Milestone 1 · *sell K.I.N.D via our own cold email*
### 👉 Bottom line: **ZERO code left to build.** Front ① is gated only on the **Instantly warmth clock** + your manual import/test/fire. Everything the code needs is done.

### ✅ Done (code-verified 1 Jul)
| What | Evidence |
|------|----------|
| Product built + fully walked (Section A 17 🟢 + Section B engine) | the thing we sell works |
| Outreach list — **1,461 verified US emails**, 6 cols, 0 blanks/dups | `kind_instantly_import.csv` *(last counted live 29 Jun; file is PII-protected, off-repo)* |
| 4-step cold sequence written, ≤50 words, Day 0/3/6/10, compliance baked in | `docs/content/our-outreach-us-uk.md` (in repo, ready to paste) |
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

**Front ① is done when:** Instantly warm + first send fired. **No engineering blocks this — only your warmth clock + these 6 steps.**

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
### 👉 Bottom line: M2 makes the product usable *by a client*; **M3 is how WE actually onboard, operate, and get paid.** Onboarding triggers + finance + team/partner oversight + Nora (admin co-pilot) live here. **Full spec: `docs/admin-centre-spec.md`.** Preview: `scratchpad/admin-centre-preview.html`.
### 🏗️ Build mode = **LIVE.** Admin is internal (not client-facing) → no preview gate. I build → push live → **you beta-test in the live system** → verify → next piece.

### 🔨 What I build (🤖 me — ship each live, one at a time)
| # | Item | What ships |
|---|------|-----------|
| 1 | **#272 Cockpit** | Pulse (6 tiles) + Action Queue + unit economics; consolidate 19 pages; cut 8 dev/vanity pages |
| 🛑 2 | **#270 + #271 Action Queue triggers** | signup→assign pooled inbox · payment→provision branded + schedule day-29 switch · pool-low · at-risk (surfaced in admin + email) |
| 3 | **#272 Finance** | Xero + Wise cards (hyperlinked) · cost stack · cash/runway · margin-per-client |
| 4 | **#274 Command Centre** | per-AE + per-partner: book MRR + commission · targets (mo/qtr/yr) tracking · pipeline + 3× coverage · mini-CRM · plays · contracts/docs vault · add-team-member · read-only partner view |
| 5 | **#275 Nora — The Keeper** | right-rail admin co-pilot, all-round, context-aware per screen |
| 6 | **#276 Per-staff logins + roles** | each AE their own login; role-scoped (founder vs AE vs SDR) |

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
| **Wed 1 Jul — TODAY** | ② | **M2 security+sending sweep — shipped one-by-one:** 🟢 #266 /team auth · 🟢 #261 ownership+RLS · 🟢 #263 CI · 🟢 #262 pause-migration · 🩷 #260 blocklist · 🩷 #265 Stripe grant · 🩷 cap+#267 bounce · 🩷 #243 Apollo-independence. Locked the **#211 client-sending model** (SOP). Lead-Gen→$3 parked to Thu. | 🤝 |
| **Thu 2 Jul** | ②/③ | **(a) Lead-Gen → single $3 FIGSY** *(parked from today)* — multi-front: API `billing-rules` + portal `billing` + **website `pricing.html`** + docs; **client-facing → preview.** **(b) Milestone 3 kickoff — Admin Centre rebuild** *(build-LIVE; full spec `docs/admin-centre-spec.md`)*: Cockpit (**#272**) · triggers into admin+email (**#270** signup→assign · **#271** payment→provision+switch) · **Command Centre per-AE/partner (#274)** · **Nora admin co-pilot (#275)** · per-staff logins (**#276**) · finance (Xero/Wise/HMRC). *(#211 engine + $60 walk also queued.)* | 🤝 |
| **Thu–Fri 3–4 Jul** | ①/② | Record product demo + Drop 01 (Claude preps demo company + shoot) → upload | 🤝 |
| **Fri 4 Jul** | ① | Generate 12 weeks of LinkedIn posts (no pricing · no traction claims · safe only — `docs/content/linkedin-playbook.md`) | 🤝 |
| **When you fund it** | ② | **$60 live money walk** — proves billing end-to-end (#28b) | 🤝 |
| **Your clock (parallel)** | ① | Instantly warmth ≥90% → import → mail-tester → test-send → **first outreach fired** | 🧍 |

---

*Open this → pick a milestone → do the next 🔲 in order. ① warm + fire (no build) · ② build the client sending engine + security · ③ build the Admin Centre cockpit. That's the whole page.*
