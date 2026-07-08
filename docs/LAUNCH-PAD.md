# 🚀 K.I.N.D — LAUNCH PAD

> The **one** day-to-day page: what to do now · who owns it · where it stands. One line per item.
> Status of record → **PRODUCT-INVENTORY** · why/history → **KIND-MASTER** · future detail → **V2-TRACKER** · deep audit → **AUDIT-8JUL-DEEP.md** · M0 punch-list → **MILESTONE-0-CHECKLIST.md**.

**THE PLAN (locked 8 Jul):** sell **FIGSY only**. Everything else = **"coming soon"**, built later in **Milestone 4**. **Milestone 0 is the gate** — make FIGSY *honest → reliable → proven* before one real client.

**Board:** 🟢105 · 🩷88 · 🟣4 · 🟡27 · 🔴192 · ⏸6 · **Σ422**  ·  live count: `scripts/count-inventory.sh`

### 🔑 Legend
**Status:** 🔴 not built · 🟡 built, on a branch/PR · 🟣 approved on preview · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked
**Owner:** 🤖 **Claude** (writes code, opens PRs) · 🧍 **You** (merge · deploy · give access · approve · run prod-SQL) · 🤝 **both**

### ⚠️ HOW THINGS GO LIVE — a merge is NOT a deploy
GitHub is flagged → auto-deploy is off. Each change ships **by hand**: **🧍** merge PR → **🧍** `git pull` → **🧍** `railway up --detach --service "<svc>"`.
Services: **website = `KIND`** · portal = `@kind/portal` · admin = `@kind/admin` · api = `@kind/api`. *(Claude can't deploy — no Railway access.)*

### ▶ DO NOW — in order
| # | Task | Owner | Status |
|---|------|:---:|:---:|
| 1 | Confirm `railway up "KIND"` deployed → walk live site → flip #408/#348 🩷 | 🧍 | ⏳ |
| 2 | `/signup → /login` sweep on the 31 remaining pages (#409) | 🤖 | 🔴 |
| 3 | Run §D prod-DB SQL → turns ~10 findings into facts (5 min) | 🧍 | 🔴 |
| 4 | Redesign homepage agent section (with you) | 🤝 | 🔴 |
| 5 | FIGSY reliability — start **#338 + #339** | 🤖 | 🔴 |

**PRs #990–#994 all merged.** ▶ Next: confirm `railway up "KIND"` deployed the live site → walk it → flip #408/#348 🟡→🩷. New from the 8-Jul docs-vs-code audit: **#410** (legal pages name Apollo, not PDL+Hunter) · **#411** (delete all unproven speed promises) · **#412** (`proposals` screen missing from the sweep).

---

# ⓪ MILESTONE 0 — MAKE FIGSY HONEST → RELIABLE → PROVEN · the gate to selling · owner 🤖 (you merge+deploy)

### Move 1 · HONEST — sweep the site; not-real → "coming soon" + grey, **don't delete**
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #408 | Pricing is now ONE FIGSY product (home + pricing), tiers removed | 🤖 | 🟡 #990 |
| #348 | 90-day guarantee couldn't run → removed, replaced with true signals | 🤖 | 🟡 #991 |
| #409 | 42 "Start free trial" buttons point at dead `/signup` → send to `/login` | 🤖 | 🔴 |
| #405 | Website sweep — every page: mark not-real features "coming soon" | 🤖 | 🔴 |
| #406 | Portal sweep — every screen: same rule | 🤖 | 🔴 |
| #403 | "FIGSY handles replies autonomously" is false (it drafts) → reword | 🤖 | 🔴 |
| #394 | "$1 per lead" residue still animating on the homepage → remove | 🤖 | 🔴 |
| #407 | Docs still say Apollo/250M/$1 in places → clean up | 🤖 | 🔴 |
| #410 | Legal pages (privacy/dpa/terms) name Apollo as sub-processor → it's PDL + Hunter | 🤖 | 🔴 |
| #411 | Delete ALL speed promises — "leads in 10 min / 5-day launch guarantee" (unproven) | 🤖 | 🔴 |
| #412 | `proposals` portal screen missing from the sweep checklist → add it | 🤖 | 🔴 |
| #413 | **Terms §5 entitles a refund on nearly every lead** — contradicts the enrollment charge (rewrite §5) | 🧍 | 🔴 |
| #414 | Stripe checkout description still says "handles replies + books meetings" (false) → reword | 🤖 | 🔴 |
| #416 | Pricing-card "CRM dedup & CSV export" overstates → soften in figsy copy | 🤖 | 🔴 |

### Move 2 · RELIABLE — fix FIGSY's own faults. Each a small **tested** PR. Do #338 + #339 first.
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #338 | FIGSY marks an email "sent" even if the send failed — charges $3 for nothing | 🤖 | 🔴 |
| #339 | The founder alarm can itself fail silently — you'd never know | 🤖 | 🔴 |
| #346 | Client can't enter their business knowledge → generic copy (turn the UI on) | 🤖 | 🔴 |
| #354 | No guard against sending the same email twice | 🤖 | 🔴 |
| #349 | ~140 money writes don't check for failure → the ledger can silently drift | 🤖 | 🔴 |
| #366 | Sourcing stops at ~50 leads (no pagination); also the "250M" wording | 🤖 | 🔴 |
| #358 | If the AI scorer errors, every lead gets a fake score of 50 | 🤖 | 🔴 |
| #367 | If the email-reveal quota runs out, 0 leads deliver with no alert | 🤖 | 🔴 |
| #347 | "Approve before send" queue points at the wrong table → dead | 🤖 | 🔴 |
| #343 | Crons run on every server copy → duplicate sends | 🤖 | 🔴 |
| #344 | The kill-switch doesn't actually stop the cron sends | 🤖 | 🔴 |
| #345 | A client can pull another client's lookalike data (tenant leak) | 🤖 | 🔴 |
| #350 | The `visitor_sessions` table is publicly readable (data leak) | 🤖 | 🔴 |
| #353 | "Your trial has ended" email can send repeatedly | 🤖 | 🔴 |
| #356 | Consent emails aren't inside the outreach gate | 🤖 | 🔴 |
| #363 | `/admin/seed-leads` can overwrite real client leads | 🤖 | 🔴 |
| #365 | A demo endpoint can inject fake KPIs into a client dashboard | 🤖 | 🔴 |
| #371 | Welcome/trial credit grants aren't atomic (race → wrong balance) | 🤖 | 🔴 |
| #373 | Missing uniqueness constraints on FIGSY tables in prod | 🤖 | 🔴 |
| #374 | Intent-signal auto-enroll can drain the wallet unbounded | 🤖 | 🔴 |
| #376 | Delivery can overdraw credits (decrement not checked) | 🤖 | 🔴 |
| #379 | A Stripe refund path returns 500 instead of clawing credits back | 🤖 | 🔴 |
| #383 | Missing DB function to count FIGSY emails sent | 🤖 | 🔴 |
| #384 | Dead portal buttons (Export CSV, etc.) → wire or coming-soon | 🤖 | 🔴 |
| #385 | Usage page shows a fake "$1/lead overage" panel → delete | 🤖 | 🔴 |
| #389 | No migration runner (prod schema is hand-pasted) — risky | 🤖 | 🔴 |
| #390 | No dead-letter/retry table — failures just vanish | 🤖 | 🔴 |
| #400 | "South-African-sounding name" prompt residue → make it global | 🤖 | 🔴 |
| #401 | A few inventory dots were lying → corrected | 🤖 | 🔴 |
| #402 | Small auth nits (team role unvalidated, seat enumeration) | 🤖 | 🔴 |

### Move 3 · PROVEN — prove on staging, then sell to ONE client · 🤝
🔴 a credit actually spent · an email that actually landed · knowledge visibly changes the copy · a real lead sources + sends · the alarm fires on a money failure.
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #415 | **Do we make money at $3?** — rebuild FIGSY unit economics for the real PDL+Hunter prices (old model was Apollo/$1); cost scales with leads *sourced*, revenue with leads *enrolled* | 🧍 | 🔴 |

### M0 originals (#330–#337) — already shipped
| Item | What it is | Status |
|---|---|:---:|
| #330 | Missing FIGSY-credit DB function — added | 🩷 |
| #331 | Free-trial client got leads forever — drip now drains | 🩷 |
| #332 | Enrollment now charges fail-closed (no free work) | 🩷 |
| #333 | Stripe under-grant fixed (client not short-changed) | 🩷 |
| #334 | Dead auto-top-up switch — greyed out | 🩷 |
| #335 | FIGSY knowledge-writing built — UI still off, see #346 | 🟡 |
| #336 | Referral bonus was farmable — purchase-gated | 🟡 |
| #337 | Money-path sweep | 🩷 |

**✅ M0 done when:** Move 1 shipped · Move 2 fixed **+ tested** · Move 3 proven on staging.

---

# ① MILESTONE 1 — Send OUR OWN outreach · owner 🧍 (build done, only the warm-up clock)
| Step | Action | Done when |
|---|---|---|
| 🛑 GATE | Instantly warm-up ≥90% (#198) — check weekly | ≥90% inbox |
| 1 | Upgrade Instantly plan (≥1,500 send) | plan active |
| 2 | Import the 1,461 verified list | 0 errors |
| 3 | Paste 4 emails + footer (`content/our-outreach-us-uk.md`) | Day 0/3/8/10 built |
| 4 | mail-tester.com (#101) | 10/10 aligned |
| 5 | Test-send 10–20 | Primary · bounce <2% |
| 6 | 🚀 FIRE (#127) | running · reply ≥5% d3 |

---

# ② MILESTONE 2 — A paying CLIENT runs it · ⏸ BLOCKED on M0
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #211 | Smartlead — per-client sending isolation (all clients share one identity today) | 🧍→🤖 | 🔴 |
| #28b | $60 live money walk — real money through the whole loop, counters reconcile | 🧍 | 🔴 |
| #212 | Sequence depth (not client-blocking) | 🤖 | 🔴 |
| #199 | Sending monitoring (not client-blocking) | 🤖 | 🔴 |
*Security + honesty for M2 already shipped 6 Jul (🩷).*

---

# ③ MILESTONE 3 — Admin cockpit · 🤝 mostly done (13 screens walked 🟢 on 7 Jul)
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #291 | GTM funnel showed 367% — bug fixed (PR #978), re-walk after deploy | 🤝 | 🩷 |
| #279 | Deliverability graph — needs the bounce/complaint reporting endpoint | 🤖 | 🩷 |
| #289 | NPS — endpoint exists, migration not run + no clients yet | 🤖 | 🔴 |
| #290 | Sentry error tracking — not wired in | 🤖 | 🔴 |
| #364 | Demo data pollutes your founder metrics → exclude it | 🤖 | 🔴 |
*Ops inbox-pool / AE lenses / deliverability data wait on Smartlead (#211).*

---

# ④ MILESTONE 4 — EVERYTHING ELSE · all non-FIGSY findings · FROZEN until FIGSY ships · owner 🤖 (later)
In M0 these are made *honest* (hidden, "coming soon"); **here** they're made *real* — one at a time, each proven before the next. Future build detail → V2-TRACKER.

**Subscriptions (Milla/Vida/Denise billing)**
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #340 | Subscription goes "active" even on a failed/incomplete card | 🤖 | 🔴 |
| #341 | Cancelling a subscription doesn't actually cancel it in Stripe | 🤖 | 🔴 |
| #342 | The subscription "lapse" cron 500s every day | 🤖 | 🔴 |
| #357 | MRR is structurally $0 (the subscription amount is never stored) | 🤖 | 🔴 |
| #386 | Onboarding can double-submit a subscription | 🤖 | 🔴 |

**Partner + referral**
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #351 | Partner commission math wrong (20% recurring, no clawback) | 🤖 | 🔴 |
| #355 | Referral link drops the `?ref=` → referral can't be earned | 🤖 | 🔴 |
| #370 | Partner lookup is injectable (`.ilike` on email) | 🤖 | 🔴 |
| #372 | `allocate_pool_to_rep` destroys pool credits | 🤖 | 🔴 |
| #387 | Referral attribution is swallowed | 🤖 | 🔴 |
| #398 | "Wise integration" — partner payouts are actually manual | 🤖 | 🔴 |

**Other agents — real builds**
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #362 | Vida has no knowledge layer (sold "no hallucinations") | 🤖 | 🔴 |
| #360 | WhatsApp uses one global number — not per-client | 🤖 | 🔴 |
| #359 | WhatsApp webhook is forgeable (no signature check) | 🤖 | 🔴 |
| #361 | Calendar auto-book crashes (`googleapis` not installed) | 🤖 | 🔴 |
| #368 | Calendar OAuth has a CSRF hole (unsigned state) | 🤖 | 🔴 |
| #369 | Voice/Vapi webhook fails open if the secret is unset | 🤖 | 🔴 |
| #396 | Denise false claims ("trained on closed-won / confirms meetings") | 🤖 | 🔴 |
| #395 | Milla page shows a fake "HubSpot/Gmail connected" mock | 🤖 | 🔴 |
| #388 | LinkedIn steps stuck (PhantomBuster not wired) | 🤖 | 🔴 |
| #404 | Lena agent is dead code (never mounted → 404) | 🤖 | 🔴 |

**Auto top-up + integrations + infra + ops**
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #352 | Auto top-up can double-charge a card | 🤖 | 🔴 |
| #399 | Integrations hub — all 8 "Connect" tiles are dead | 🤖 | 🔴 |
| #397 | HubSpot platform sync is dead code | 🤖 | 🔴 |
| #375 | Our own self-outreach sends are dead | 🤖 | 🔴 |
| #377 | Support inbox auto-reply phantom-sends → black hole | 🤖 | 🔴 |
| #378 | `/ae/demo-request` hallucinates availability | 🤖 | 🔴 |
| #380 | Missing tables (`subscribers` / `whatsapp_messages`) | 🤖 | 🔴 |
| #381 | Developer webhooks section is dead (no table) | 🤖 | 🔴 |
| #382 | Churn scoring reads a column that's never written | 🤖 | 🔴 |
| #391 | Cron JSONB writes clobber each other | 🤖 | 🔴 |
| #392 | A/B test "wins" on zero data | 🤖 | 🔴 |
| #393 | Data-moat table gets duplicate rows (no dedup key) | 🤖 | 🔴 |

**✅ M4 done when:** each item is rebuilt (state machine + provider-confirmed + tests) and its "coming soon" is lifted — one at a time.

---

## 📌 Standing notes
- **Money model:** buy credits · **$3 = 1 credit = 1 lead ENROLLED** (browsing leads is free) · bundles 20/$60 · 40/$120 · 100/$300 · 20 free trial. *(PDL + Hunter keys set. No Apollo.)*
- **Before any real send:** check `/engine/env` — `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL`.
- **Architecture (locked):** AI drafts/scores; deterministic code decides + **fails closed**; state advances only after verified provider/DB success. Reasoning → `AUDIT-8JUL-DEEP.md §4–10`.
