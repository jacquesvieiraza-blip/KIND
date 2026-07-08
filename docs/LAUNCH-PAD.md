# 🚀 K.I.N.D — LAUNCH PAD

> The **one** day-to-day page: what to do now · who owns it · where it stands.
> Status of record → **PRODUCT-INVENTORY** · why/history → **KIND-MASTER** · future detail → **V2-TRACKER** · find any doc → **DOC-MAP** · deep audit → **AUDIT-8JUL-DEEP.md** · M0 punch-list → **MILESTONE-0-CHECKLIST.md**.

**THE PLAN (locked 8 Jul):** sell **FIGSY only** — everything else is **"coming soon"**, built later in **Milestone 4**. **Milestone 0 is the gate:** make FIGSY *honest → reliable → proven* before one real client.

**Board:** 🟢105 · 🩷88 · 🟣4 · 🟡26 · 🔴186 · ⏸6 · **Σ415**  *(live count: `scripts/count-inventory.sh`)*

### 🔑 Legend
**Status dot:** 🔴 not built · 🟡 built, on a branch · 🟣 approved on preview · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked
**Owner:** 🤖 **Claude** (writes code, opens PRs) · 🧍 **You** (merge · deploy · give access · approve · run prod-SQL) · 🤝 **both**

### ⚠️ HOW THINGS GO LIVE — a merge is NOT a deploy
GitHub is flagged, so **auto-deploy is off**. Every change ships **by hand**:
**🧍 1.** merge the PR → **🧍 2.** `git pull` → **🧍 3.** `railway up --detach --service "<svc>"`
| App | Railway service name |
|---|---|
| Website (`get-kind.com`) | `KIND` |
| Portal (`app.get-kind.com`) | `@kind/portal` |
| Admin (`admin.get-kind.com`) | `@kind/admin` |
| API | `@kind/api` |
*Claude cannot deploy — no Railway access in its environment. Auto-deploy returns when the GitHub flag appeal clears.*

---

## ▶ DO NOW — in order
| # | Task | Owner | Status |
|---|------|:---:|:---:|
| 1 | Website honesty sweep — batch by batch (M0 · Move 1) | 🤖 | 🟡 in progress |
| 2 | Deploy each merged batch: `railway up … "KIND"` | 🧍 | ⏳ |
| 3 | Run §D prod-DB SQL → turns ~10 findings into facts (5 min) | 🧍 | 🔴 |
| 4 | FIGSY reliability — start **#338 + #339** (M0 · Move 2) | 🤖 | 🔴 |
| 5 | Instantly warm-up watch (M1 clock) · GitHub flag appeal | 🧍 | ⏳ |

**Open PRs (you merge, then `railway up`):** #990 ✅ merged (one-product pricing + coming-soon) · **#991 🟡 guarantee removal**.

---

# ⓪ MILESTONE 0 — MAKE FIGSY TRUE → RELIABLE → PROVEN
**The gate to selling anything.** Sell FIGSY only. Punch-list → **MILESTONE-0-CHECKLIST.md** · every item's full text → PRODUCT-INVENTORY #338–#409.

### Move 1 · HONEST 🤖 — sweep website + portal; not-real → "coming soon" + grey. **DON'T delete** (code stays for M4).
| Batch | What | Status |
|---|------|:---:|
| 1 | one-FIGSY-product pricing (home + pricing) · story/home coming-soon badges + Tony · FIGSY → `/login` (#408 #409) | 🟡 PR #990 merged |
| 2 | 90-day guarantee removed → true trust signals (#348) | 🟡 PR #991 |
| 3 | agent-page "Get started" CTAs · global claims (#403 #394 #366 #395 #396 #360 #361) · **portal** screens (#405 #406) | 🔴 next |

### Move 2 · RELIABLE 🤖 — fix FIGSY's own faults. Each a small **tested** PR, in this order:
🔴 **#338** send-before-charge → **#339** real alarm → #346 knowledge ON → #354 no double-send → #349 checked ledger → #366 pagination → #358 score-fail quarantine → #367 reveal-down alert → #347 approve-queue → #343 cron singleton → #344 kill-switch → #345 tenant isolation → #350 visitor_sessions → #353 · #356 · #363 · #365 · #371 · #373 · #374 · #376 · #379 · #383 · #389 · #390 · #400 · #401 · #402.

### Move 3 · PROVEN 🤝 — prove on staging, then sell to **ONE** client:
🔴 a credit actually spent · an email that actually landed · knowledge visibly changes the copy · a real lead sources + sends · the alarm fires on a money failure.

**Original 8:** #330–#333 🩷 done · #334/#335/#336/#337 folded into Moves 1–2 (residue → #352 #346 #355 #400).
**✅ M0 is DONE when:** Move 1 shipped · Move 2 fixed **+ tested** · Move 3 proven on staging.

---

# ① MILESTONE 1 — Send OUR OWN outreach · owner 🧍 (build done)
Build 100% done — nothing left for Claude. **The only gate is the Instantly warm-up clock.**
| Step | Action | Done when |
|---|---|---|
| 🛑 GATE | Instantly warm-up ≥90% (#198) — check weekly | ≥90% inbox placement |
| 1 | Upgrade Instantly plan (≥1,500 send) | plan active |
| 2 | Import the 1,461 verified list | all rows, 0 errors |
| 3 | Paste 4 emails + footer (`content/our-outreach-us-uk.md`) | Day 0/3/8/10 built |
| 4 | mail-tester.com (#101) | 10/10, SPF/DKIM/DMARC aligned |
| 5 | Test-send 10–20 | lands Primary · bounce <2% |
| 6 | 🚀 **FIRE** (#127) | running · reply ≥5% d3 / ≥10% d7 |

---

# ② MILESTONE 2 — A paying CLIENT runs it · ⏸ BLOCKED on M0
Not true yet: FIGSY can charge and not send (#338), copy is generic (#346). Becomes true only **after** M0 Moves 1+2 land + Move 3 proves it. Then:
| # | Blocker | Owner | Status |
|---|---|:---:|:---:|
| 🛑 1 | **#211 Smartlead** — per-client sending isolation (today all clients share ONE identity; one bad actor poisons everyone) | 🧍 access → 🤖 build | 🔴 |
| 2 | **$60 live money walk** (#28b) — real money through the whole loop, counters reconcile | 🧍 | 🔴 |
| 3 | depth (not client-blocking): #212 sequences · #199 monitoring | 🤖 | 🔴 |
*Security + honesty for M2 already shipped 6 Jul (🩷, audit waves #306–#328).*

---

# ③ MILESTONE 3 — Admin cockpit we run the business from · 🤝 mostly done
13 screens walked **🟢** on 7 Jul. Remaining:
| Item | What | Owner | Status |
|---|---|:---:|:---:|
| #291 | GTM funnel — 367% bug fixed (PR #978); re-walk after deploy | 🤝 | 🩷 |
| #279 | deliverability graph — needs bounce/complaint reporting endpoint | 🤖 | 🩷 |
| #289 | NPS — migration not run + 0 clients to survey | 🤖 | 🔴 |
| #290 | Sentry error tracking — not wired (`@sentry` absent) | 🤖 | 🔴 |
| #364 | exclude demo data from founder metrics | 🤖 | 🔴 |
*Ops inbox-pool / AE lenses / deliverability data wait on Smartlead (#211 → #270 #271 #276 #280).*

---

# ④ MILESTONE 4 — EVERYTHING ELSE · all non-FIGSY findings · FROZEN until FIGSY ships · 🤖 later
Every non-FIGSY agent, integration, and money-path. In **M0** these are made *honest* (hidden, "coming soon"); **here** they're made *real* — one at a time, each proven before the next. All **🔴**. Future build detail → **V2-TRACKER**.
| Area | Build these (later) |
|---|---|
| **Subscriptions** (Milla/Vida/Denise billing) | #340 status→active · #341 real Stripe cancel · #342 lapse cron · #357 MRR amount · #386 double-sub · #379 sub-side |
| **Partner + referral** | #351 commission (20/5 + clawback) · #355 referral link + payout · #370 partner lookup · #372 pool credits · #387 attribution |
| **Auto top-up** | #352 (Stripe off-session, or remove) |
| **Other agents — real builds** | Vida knowledge #362 · WhatsApp multi-tenant #359 #360 · Calendar booking #361 #368 · Voice/Vapi #369 · Denise closed-won #396 · Milla connectors #395 · LinkedIn #388 · Lena mount #404 |
| **Integrations · infra · ops** | #375 self-outreach · #377 support inbox · #378 demo availability · #380 missing tables · #381 dev webhooks · #382 churn scoring · #391 cron JSONB · #392 A/B guard · #393 data-moat dedup · #397 HubSpot sync · #399 integrations hub |

**✅ M4 is DONE when:** each area is rebuilt on the deterministic architecture (state machine + provider-confirmed + tests) and its "coming soon" is lifted — one at a time.

---

## 📌 Standing notes
- **Money model:** buy credits · **$3 = 1 credit = 1 lead ENROLLED** (browsing leads is free) · bundles 20/$60 · 40/$120 · 100/$300 · 20 free trial credits. *(PDL discovery + Hunter reveal keys set in Railway. Apollo not used.)*
- **Before any real send** (the "warm and nothing happens" trap): check `/engine/env` — `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL`.
- **Demo prep:** build the demo before the meeting · test the magic-link first · never reopen an expired demo · steer around Knowledge/Team/Integrations (coming soon).
- **Architecture (locked):** deterministic workflows — AI drafts/scores/classifies; deterministic code decides + **fails closed**; state advances only after verified provider/DB success. Full reasoning → `AUDIT-8JUL-DEEP.md §4–10`.
