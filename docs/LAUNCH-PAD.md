# 🚀 K.I.N.D — LAUNCH PAD

**As of: 1 July 2026** · Two fronts. Nothing else on this page.
**Keys:** ✅ done · 🔲 left · 🛑 the one gate · 🧍 you · 🤖 me · 🤝 both · 🔨 needs a BUILD · ⏱ needs a CLOCK/action (no build)

> Status of record = PRODUCT-INVENTORY. Why = KIND-MASTER. Future = V2-TRACKER. This page = what to do now.
> **Rebuilt 1 Jul off a full code + docs audit (3 parallel passes, every claim checked at file:line).** The two questions this page answers: **① what's left for US to 100% run our own outreach · ② what's left for a CLIENT to 100% pay + use the system.**

---

## ① OUTREACH OURSELVES — *sell K.I.N.D via our own cold email*
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

## ② OPERATE A PAID CLIENT + TEAM — *a client pays, then runs the product*
### 👉 Bottom line: payment, billing, the team engine, and **default** lead-finding are **BUILT**. **NOT built:** the client sending engine (**#211 = Smartlead — read-only today, zero sending**), the max-coverage data layer (**#243 = BetterContact aggregator**), and two security holes. Until #211 + security close, we cannot onboard a paying client.

### ✅ Done (code-verified 1 Jul — file:line checked)
| What | Evidence |
|------|----------|
| **Client can PAY** — Stripe credit purchase live; charge-on-delivery + enroll-time charge, both **atomic RPCs** | `increment_client_credits` / `increment_figsy_credits`; `lead-delivery.ts`, `figsy.ts:966` |
| **Lead finding works (default path)** — Apollo primary (3-pass) + PDL discovery + Hunter/Clearbit **enrichment waterfall** + consent gate. *(Apollo-independence is a BUILD — see #243 below.)* | `apollo.ts:251`, `enrichment.ts:1`, `icps.ts` |
| **Non-Apollo path proven (read-only)** — `/engine/leads/test` runs PDL discovery + Hunter/Clearbit with "Apollo NOT used" | `routes/engine.ts:49` (#244) |
| **Company/team engine (#88)** — owner + reps, per-rep live stats, Command Centre, budgets, credit requests | `routes/company.ts`, `seed-company.ts` |
| **Per-client lead data is RLS-isolated** (leads/campaigns/enrollments/replies) | `schema.sql:279`, `002_figsy.sql:118` |
| Paystack is **legacy/inactive** — Stripe is the only live processor | `routes/paystack.ts` (webhook-only, no new charges) |

### 🔲 Left — **the machinery to build** (this is the Wednesday list, ordered)
| # | Item | 🔨/⏱ | Size | Why it blocks a paying client |
|---|------|------|------|-------------------------------|
| 🛑 1 | **#211 sending engine = Smartlead (client-facing)** — per-client isolated + warmed mailboxes | 🔨 | **BIG (multi-day)** | **Smartlead is THE planned client engine — we signed up — but only Phase-1 read-only connectivity is built (`smartlead.ts`: zero sending).** Real sends still go via Resend where **every client shares ONE domain + ONE ~50/day cap.** Phases 2–6 (send seam · modes · reply capture · per-client warmth) = the build. **THE blocker.** *(Smartlead replaces Apollo's SENDING, not its DATA.)* |
| 2 | **#260 blocklist leak** (CRITICAL security) | 🔨 | **small** | `GET /leads/blocklist` has no `client_id` filter **and** RLS allows any authed read → client A sees every client's opt-outs |
| 3 | **#261 RLS + #55a + team-members auth** | 🔨 | small–med | no RLS on `companies`/`seats`/`credit_requests`; `GET /team/members` trusts a `client_id` query param with **no ownership check** → a team isn't DB-isolated |
| 4 | **Per-client send cap** | 🔨 | small | cap is global today; one client can starve the rest |
| 5 | **Lead-Gen retirement → single FIGSY $3 product** | 🔨 | med | simplify `billing-rules.ts` + rewrite pricing page (decided 29 Jun, not built) |
| 6 | **#212 context-rich sequences** (4–6 steps, data-personalized) | 🔨 | med | product is still 3-step; depth for real client campaigns |
| 7 | **#243 Apollo-independence data layer = BetterContact aggregator** — NOT built | 🔨 | med | **This is the "can't rely on Apollo" fix for DATA.** Today Apollo is still primary; we run thin behind it (PDL+Hunter+Clearbit). **BetterContact = 1 integration → 20+ sources** + geo-router (Africa coverage), feeds #212. Productionize the proven non-Apollo path (#244). |
| 8 | **#263 test CI** — LIVE but **RED** (`deliverability.test.ts:64`) | 🔨 | tiny | regressions can merge undetected until green |
| 9 | **Harden** — #199 monitoring · #264 webhook idempotency | 🔨 | med | production safety |
| V | **$60 live money walk** (#28b) | ⏱ | your action | proves billing end-to-end with real money (fund a live account → run leads → watch every credit move) |

**Front ② is done when:** engine isolates each client (#211) + security closed (#260 + #261) + $60 money proven live.

---

## 🗓️ THE DAYS

| Day | Front | What | Owner |
|-----|-------|------|-------|
| **Wed 1 Jul — TODAY** | ② | Full code+docs audit done → LAUNCH-PAD rebuilt with the full checklist. **M2 build starts**: fast security + CI first (**#263 green · #260 blocklist · #261/team-members auth · per-client cap**), then scope the **#211 engine**. *One clean PR per item.* | 🤝 |
| **Thu–Fri 3–4 Jul** | ①/② | Record product demo + Drop 01 (Claude preps demo company + shoot) → upload | 🤝 |
| **Fri 4 Jul** | ① | Generate 12 weeks of LinkedIn posts (no pricing · no traction claims · safe only — `docs/content/linkedin-playbook.md`) | 🤝 |
| **When you fund it** | ② | **$60 live money walk** — proves billing end-to-end (#28b) | 🤝 |
| **Your clock (parallel)** | ① | Instantly warmth ≥90% → import → mail-tester → test-send → **first outreach fired** | 🧍 |

---

*Open this → pick a front → do the next 🔲 in order. ① needs no build (warm + fire). ② needs the build list above. That's the whole page.*
