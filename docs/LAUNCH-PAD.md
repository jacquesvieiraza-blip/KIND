# 🚀 K.I.N.D — LAUNCH PAD

> The **one** day-to-day page: what to do now · who owns it · where it stands. One line per item.
> Status of record → **PRODUCT-INVENTORY** · why/history → **KIND-MASTER** · future detail → **V2-TRACKER** · deep audits → **AUDIT-8JUL-DEEP.md** (code) + **AUDIT-8JUL-STALE-SWEEP.md** (docs) · M0 punch-list → **MILESTONE-0-CHECKLIST.md**.

**THE PLAN (locked 8 Jul):** **one price logic across the whole family — per qualified lead. No subscriptions, no contracts, no order-forms.** Ladder: **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**; **Vida inbound $3** + same add-ons → $4/$5. Sell **FIGSY + Lead-Gen** now; **Milla · Vida · Denise · Tony STAY on site + portal marked "coming soon" + greyed** (built in **M4**, never deleted). **Milestone 0 is the gate** — make FIGSY + Lead-Gen *honest → work fully → proven* before one real client.

**Board:** 🟢98 · 🩷85 · 🟣3 · 🟡23 · 🔴221 · ⏸5 · **Σ435**  ·  live count: `scripts/count-inventory.sh`

### 🔑 Legend
**Status:** 🔴 not built · 🟡 built, on a branch/PR · 🟣 approved on preview · 🩷 live, not verified · 🟢 live + verified · ⏸ blocked
**Owner:** 🤖 **Claude** (writes code, opens PRs) · 🧍 **You** (merge · deploy · give access · approve · run prod-SQL) · 🤝 **both**

### ⚠️ HOW THINGS GO LIVE — a merge is NOT a deploy
GitHub is flagged → auto-deploy is off. Each change ships **by hand**: **🧍** merge PR → **🧍** `git pull` → **🧍** `railway up --detach --service "<svc>"`.
Services: **website = `KIND`** · portal = `@kind/portal` · admin = `@kind/admin` · api = `@kind/api`. *(Claude can't deploy — no Railway access.)*

### ▶ DO NOW — in order (only the true next actions)
| # | Task | Owner | Status |
|---|------|:---:|:---:|
| 1 | Deploy `railway up "KIND"` → walk live site → flip **#417 · #418 · #419 · #408 · #348** 🟡→🩷 | 🧍 | ⏳ |
| 2 | Review + merge the reconciliation PR **#1002** (docs single-source-of-truth) | 🧍 | ⏳ |
| 3 | Run §D prod-DB SQL → turns ~10 findings into facts (5 min) | 🧍 | 🔴 |
| 4 | FIGSY reliability — start **#338 + #339** (Phase 3) | 🤖 | 🔴 |

---

# ⓪ MILESTONE 0 — make FIGSY + Lead-Gen *honest → work fully → proven* · the gate to selling · owner 🤖 (you merge+deploy)

## PHASE 1 · TRUTH SWEEP — site + portal say ONLY what FIGSY + Lead-Gen ($1 reveal) actually do; everything else STAYS, marked "coming soon" + greyed. **Client-facing → preview first (§11).**

### STEP 1 — WEBSITE up to date
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #405 | Website sweep — every page: not-real features → "coming soon" + grey (don't delete) | 🤖 | 🔴 |
| #394 | **Restore the $1 reveal tier** — add the $1 section back **BEFORE** $3 (two-charge $4); it is NOT residue to remove | 🤖 | 🔴 |
| #408 | Pricing was collapsed to ONE FIGSY product — **rework to show $1 reveal + $3 FIGSY = $4** (merged #990, walk→🩷 then rework) | 🤖 | 🟡 #990 |
| #419 | Pricing page "The family" cards + comparison — **must show FIGSY buyable + $1 Lead-Gen reveal**, others greyed coming-soon (merged #1000, rework owed) | 🤖 | 🟡 #1000 |
| #430 | Pricing page **"two engines, two layers" redesign** (R1) — FIGSY + Vida engine cards; Milla/Denise = +$1 layer cards (no $/month); comparison cols FIGSY·Vida·+Milla·+Denise (supersedes #419 note) — **preview-first** | 🤖 | 🔴 |
| #417 | Homepage top grid → 3D carousel (merged #999 — deploy + walk → 🩷) | 🤖 | 🟡 #999 |
| #418 | Lower "village" section → orbital selector (merged #999+#1000 — deploy + walk → 🩷) | 🤖 | 🟡 #999 |
| #348 | 90-day guarantee removed → true signals (merged #991 — deploy + walk → 🩷) | 🤖 | 🟡 #991 |
| #403 | "FIGSY handles replies autonomously" is false (it drafts) → reword | 🤖 | 🔴 |
| #409 | 42 "Start free trial" buttons → dead `/signup` → send to `/login` | 🤖 | 🔴 |
| #366 | Sourcing "250M" wording → "targeted, verified contacts" (PDL+Hunter) | 🤖 | 🔴 |
| #411 | Delete ALL speed promises — "leads in 10 min / 5-day launch guarantee" (unproven) | 🤖 | 🔴 |
| #410 | Legal pages (privacy/dpa/terms) name Apollo as sub-processor → PDL + Hunter | 🤖 | 🔴 |
| #413 | **Terms §5 entitles a refund on nearly every lead** — rewrite to the two-charge model ($1 reveal / $3 work) | 🧍 | 🔴 |
| #414 | Stripe checkout description "handles replies + books meetings" (false) → reword | 🤖 | 🔴 |
| #416 | Pricing-card "CRM dedup & CSV export" overstates → soften | 🤖 | 🔴 |
| #407 | Docs still say Apollo/250M/$1 in places → clean up *(ledger: `AUDIT-8JUL-STALE-SWEEP.md`)* | 🤖 | 🔴 |

### STEP 2 — PORTAL up to date (same principle)
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #406 | Portal sweep — every screen: not-real → "coming soon" + grey. **Milla/Vida/Denise/Tony + notetaker greyed; agent subs (#26) unbuyable; billing shows only the two real wallets ($1 reveal · $3 FIGSY).** | 🤖 | 🔴 |
| #385 | Usage page "$1/lead overage" panel → wire it to the **REAL $1 reveal ledger** (was a fake panel) | 🤖 | 🔴 |
| #384 | Dead portal buttons (Export CSV, etc.) → wire or coming-soon | 🤖 | 🔴 |
| #412 | `proposals` portal screen missing from the sweep checklist → add it | 🤖 | 🔴 |

## PHASE 2 · MONEY PATH — build the two-charge model. Each a small **tested, staging-proven** PR. Spec = `run-costs-and-cashflow.md` §0.
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| **#420** | **TWO-CHARGE MONEY MODEL — $1 reveal + $3 work = $4** (umbrella #421–#426; two wallets; un-retire lead_gen as reveal tier) | 🤝 | 🔴 |
| #421 | Atomic `try_charge_reveal_credit` + fail-closed refund-on-failed-reveal (supersedes #376) | 🤖 | 🔴 |
| #422 | Reveal gating — mask email in browse; reveal only on the $1 charge | 🤖 | 🔴 |
| #423 | Sourcing quotas — PDL spent at *sourcing* (~$14/run); cap per client/day + regen cap (#374) | 🤖 | 🔴 |
| #424 | Charge-once-per-lead — per-lead idempotency + DB uniques ($1 once, $3 once) | 🤝 | 🔴 |
| #425 | Trial credit mix — reveal + work credits (20 free are FIGSY-only today) | 🤝 | 🔴 |
| #426 | Enforce 10-step sequence cap (bounds per-lead work cost) | 🤖 | 🔴 |
| #427 | Milla per-lead intelligence layer +$1 (FIGSY/Vida leads; reasons over paid PDL data — no new buys; separate from account-VA Milla, parked M4) | 🤖 | 🔴 |
| #428 | Denise per-lead action layer +$1 (reply→close scope; FIGSY owns cold→reply) | 🤖 | 🔴 |
| #429 | Vida inbound engine $3/qualified inbound + add-ons ($4/$5); spam-guard + "qualified" definition (R3) | 🤖 | 🔴 |
| #431 | Retire agent-subscription billing (reframes #340/#341/#342/#357/#386; ties #26) | 🤝 | 🔴 |

## PHASE 3 · RELIABLE — fix FIGSY's own faults so it *works fully*. Each a small **tested** PR. **Do #338 + #339 first.**
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #338 | FIGSY marks an email "sent" even if the send failed — charges $3 for nothing | 🤖 | 🔴 |
| #339 | The founder alarm can itself fail silently — you'd never know | 🤖 | 🔴 |
| #346 | Client can't enter their business knowledge → generic copy (turn the UI on) | 🤖 | 🔴 |
| #354 | No guard against sending the same email twice | 🤖 | 🔴 |
| #349 | ~140 money writes don't check for failure → the ledger can silently drift | 🤖 | 🔴 |
| #366 | Sourcing stops at ~50 leads (no pagination) *(wording half in Phase 1)* | 🤖 | 🔴 |
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
| #374 | Intent-signal auto-enroll can drain the wallet unbounded *(ties #423)* | 🤖 | 🔴 |
| #376 | Delivery can overdraw credits (decrement not checked) *(→ superseded by #421)* | 🤖 | 🔴 |
| #379 | A Stripe refund path returns 500 instead of clawing credits back | 🤖 | 🔴 |
| #383 | Missing DB function to count FIGSY emails sent | 🤖 | 🔴 |
| #389 | No migration runner (prod schema is hand-pasted) — risky | 🤖 | 🔴 |
| #390 | No dead-letter/retry table — failures just vanish | 🤖 | 🔴 |
| #400 | "South-African-sounding name" prompt residue → make it global | 🤖 | 🔴 |
| #401 | A few inventory dots were lying → corrected | 🤖 | 🔴 |
| #402 | Small auth nits (team role unvalidated, seat enumeration) | 🤖 | 🔴 |
| #361 | **DIFFERENTIATOR — FIGSY books the meeting into your calendar** (founder-locked M4→M0): install googleapis + prospect-facing booking page. *#361a interim = booking-link coming-soon* | 🤝 | 🔴 |
| #368 | Calendar OAuth security (HMAC-sign state) — ships with #361 | 🤖 | 🔴 |

## PHASE 4 · PROVE + SELL — prove on staging, then sell to ONE client · 🤝
🔴 a credit actually spent · an email that actually landed · knowledge visibly changes the copy · a real lead sources + reveals ($1) + sends ($3) · the alarm fires on a money failure.
| Item | What it is | Owner | Status |
|---|---|:---:|:---:|
| #415 | **Do we make money?** — RESOLVED 8 Jul: ~$0.36/worked lead → ~91% margin at $4 (`run-costs-and-cashflow.md` §0). *Remaining = prove it live.* | 🧍 | 🩷 |

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

**✅ M0 done when:** Phase 1 shipped (site + portal honest) · Phase 2 money path built **+ staging-proven** · Phase 3 fixed **+ tested** · Phase 4 proven on staging → one paying client.

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
In M0 these are made *honest* (kept, "coming soon"); **here** they're made *real* — one at a time, each proven before the next. Future build detail → V2-TRACKER. **The agents flipped 🔴 OUT OF PLAY in the inventory (Milla #2 · Vida #3 · Denise #4 · agent subs #26 · per-rep unlock #56 · family hub #125 · side-panel #113a · voice #96/#229 · notetaker #81 · Milla-render #248 · Denise seeds #58/#63/#73/#188) live here — code parked, portal-disabled via #406.**

> **M4 FIGSY-relevance audit (8 Jul):** **#361 + #368 (calendar booking) sit in M0** — founder-locked differentiator. The rest are genuinely non-FIGSY **except** these **FIGSY-adjacent** ones, which stay M4 only because the features they belong to are *coming-soon at launch* — **promote any to M0 on your word:** #388 (LinkedIn channel) · #352 (FIGSY credit auto-top-up, currently disabled #334) · #391/#392/#393 (FIGSY A/B + adaptive-send + Campaign-Intelligence cluster) · #397/#399 (CRM-connect, behind the "CRM dedup" claim).

**Subscriptions (Milla/Vida/Denise billing)** — ⚠️ **RETIRING (#431):** the whole family moved to per-qualified-lead (#420). These five are no longer "fix" work — they become **delete the subscription machinery** (zero real subscribers).
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
- **Money model (LOCKED 8 Jul ~10pm, Fable-verified — per qualified lead, no subscriptions):** **$1 reveal → +$3 FIGSY = $4 → +$1 Milla = $5 → +$1 Denise = $6**; **Vida inbound $3** + same add-ons → $4/$5. **Two engines** (FIGSY outbound · Vida inbound) **× two layers** (Milla intelligence · Denise action). Charged once each per lead; no refund on outcome. Two wallets ($1 reveal `credit_balance` + $3 work `figsy_credits`); +$1 layers charged at enroll when toggled. Full stack $6 ≈ **~92% margin**; +$1 layers ≈ 95%+ (one Haiku call, reasons over already-paid PDL data). $1 gates Hunter+visibility; **PDL spent at sourcing → quotas, not the charge.** Spec = #420–#431. *(PDL+Hunter keys set. No Apollo.)*
  - **R1 (pricing marketing):** "Two engines. Two layers. One price: per qualified lead." Engine cards (FIGSY buyable · Vida coming-soon) + layer cards (Milla/Denise +$1) + comparison FIGSY·Vida·+Milla·+Denise. No "$/month" anywhere (#430).
  - **R2 (FIGSY/Denise boundary):** FIGSY owns **cold → first reply** (outreach copy + sequence); Denise owns **reply → close** (objections, proposals, post-call, chase).
  - **R3 (qualified-lead definition — needs founder+legal sign-off, ties #413):** ICP-match + verified contact + score ≥ threshold (~60); Vida = captured contact + ICP-fit + real intent, spam never billed.
- **Sell FIGSY + Lead-Gen only; everything else STAYS "coming soon."** The non-FIGSY agents are 🔴 OUT OF PLAY in the inventory (code parked M4) — NOT deleted from site/portal, just greyed + coming-soon (#405/#406). When they return they come back as **per-lead layers/engine (#427–#429), not subscriptions.**
- **Before any real send:** check `/engine/env` — `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL`.
- **Architecture (locked):** AI drafts/scores; deterministic code decides + **fails closed**; state advances only after verified provider/DB success. Reasoning → `AUDIT-8JUL-DEEP.md §4–10`.
