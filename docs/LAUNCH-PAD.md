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

> ⚠️ **The "warm and nothing happens" trap (env, silent no-ops):** if `RESEND_API_KEY` is unset, rows say "sent" but **no mail leaves** (`figsy.ts:414`); if `ADMIN_SECRET_KEY` is unset, **every cron silently skips** → only step 1 ever sends (`cron.ts:8`). Also confirm `ANTHROPIC_API_KEY`, `RESEND_WEBHOOK_SECRET`, `FIGSY_COLD_FROM` (NOT the transactional domain), `FIGSY_WARMUP_START`, `TRACKING_URL`. **Verify these BEFORE any real send.**

### 🔲 Left — the build list, ranked (Wednesday order: security → money → isolation → data → depth)
| # | Item | Size | Why it blocks a paying client |
|---|------|------|-------------------------------|
| 🛑 1 | **#266 `/team` router is UNAUTHENTICATED** — `invite`/`members`/`member/:id` | **small** | **Live hole today:** anyone can invite themselves as **admin** to any workspace (account takeover), read any team's emails, delete any member. `routes/team.ts`, no `requireAuth`. |
| 🛑 2 | **#261 RLS is bypassed (service-role root cause)** + #55a | med | API uses the **service-role key** (`db/src/client.ts:16`) → **all RLS is ignored**; app-level ownership checks are the only guard. Fix = ownership checks on every route + enable RLS as defense-in-depth (4 PII tables have none). |
| 🛑 3 | **#260 blocklist leak** | **small** | `GET /leads/blocklist` returns **every client's** opt-outs (no `client_id` filter). |
| 4 | **#265 Stripe purchase-grant race** | small | non-atomic `Promise.all` + no unique constraint → webhook retry can **double-grant credits**. Mirror Paystack's ledger-first+RPC. |
| 5 | 🛑 **#211 sending engine = Smartlead** — per-client isolated + warmed mailboxes | **BIG (multi-day)** | we signed up, but only Phase-1 read-only is built (`smartlead.ts`, zero sending). Real sends share ONE domain + ONE global cap. **Smartlead replaces Apollo's SENDING, not its DATA.** |
| 6 | **Per-client send cap** + **#267 bounce handling** | small–med | cap is global (one client starves the rest); no bounce webhook → mails dead addresses, burns credits + reputation. |
| 7 | **#243 Apollo-independence (DATA)** | med | discovery is **Apollo-only** (PDL dormant → crash if Apollo pulled). Fix = set `PDL_API_KEY` + PDL fallback on 3 endpoints. BetterContact (20+ enrichment) = breadth, decided/not-built. |
| 8 | **#262 schema/prod drift** | small | `20260622_subscription_pause` may **not be applied on prod** (pause fails); 8 tables missing from staging schema. Confirm + apply. |
| 9 | **Lead-Gen → single $3 FIGSY** · **#212 sequence depth** · **#268 approval-send stub** · **#263 CI green** · **#199 monitoring** · **#264 webhook idempotency** | med | product simplification + depth + hardening. |
| V | **$60 live money walk** (#28b) | ⏱ your action | prove every credit movement with real money. |

**Front ② is done when:** security closed (#266 + #261 + #260) · money-grant atomic (#265) · each client isolated (#211) · $60 proven live.

---

## 🗓️ THE DAYS

| Day | Front | What | Owner |
|-----|-------|------|-------|
| **Wed 1 Jul — TODAY** | ② | 6-agent code audit done → **all docs reconciled to verified code** (4 new 🔴 logged: #265/#266/#267/#268). **M2 build starts security-first**: **#266 /team auth · #260 blocklist · #261 ownership checks · #265 Stripe grant**, then per-client cap + **#211 engine**. *One clean PR per item.* | 🤝 |
| **Thu–Fri 3–4 Jul** | ①/② | Record product demo + Drop 01 (Claude preps demo company + shoot) → upload | 🤝 |
| **Fri 4 Jul** | ① | Generate 12 weeks of LinkedIn posts (no pricing · no traction claims · safe only — `docs/content/linkedin-playbook.md`) | 🤝 |
| **When you fund it** | ② | **$60 live money walk** — proves billing end-to-end (#28b) | 🤝 |
| **Your clock (parallel)** | ① | Instantly warmth ≥90% → import → mail-tester → test-send → **first outreach fired** | 🧍 |

---

*Open this → pick a front → do the next 🔲 in order. ① needs no build (warm + fire). ② needs the build list above. That's the whole page.*
