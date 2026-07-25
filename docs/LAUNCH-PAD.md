# 🚀 LAUNCH PAD — Milla&Vida, the 14-day build

> 🛠️ **Live item-by-item build status → [`docs/BUILD-STATUS.md`](./BUILD-STATUS.md)** — every page/feature, merged-vs-live, and what's left. Updated after every build.

> **The one daily page.** Everything on it either ships in the 14 days or unblocks them. **If it's not on this page, it does not block launch.**
> Status of record → **PRODUCT-INVENTORY** (#477–#491 + THE NEW MAP) · why/history → **KIND-MASTER** session log · future → **V2-TRACKER** "🛝 MILLA&VIDA FUTURE".

**THE PLAN (founder-locked 22 Jul):** we sell a **managed service** on the FIGSY engine, trading as **Milla&Vida**. **Vida** = OUR operator console (we run ICP → source → draft → send → triage → book). **Milla** = the client portal (masked leads · 👍 approve / ✕ pass · concierge chat · meetings · reports). **Nexus** = per-client private brain. **Money (locked 24 Jul, #492 — ONE WALLET / work model, supersedes the 23-Jul re-time):** a single dollar wallet per client · first purchase **$99**, then free top-ups ($40/$100/$200) · the client's 👍 charges a flat **$4 per approved lead, FINAL** (no $1/$3 split, no hold, no capture-on-booking, no release, no TTL) · a **dead email is never charged** · **meetings are reported, not refunded** · reviewing free · **only the client's 👍 ever spends — operators never**. **Client Zero = us.** Build order: **Website → Vida → Milla.** If days squeeze: **Milla trims first, Vida never, Website never.**

## ✅ VERIFIED STATE (25 Jul) — THE LAUNCH PATH IS BUILT, on a branch, not yet merged
> **Today, in one line:** the flow walk found the **shell** was live and the **features** were not — so the whole launch path is now built (#520–#537, 🟡 on branch). **Nothing here needs SQL.**
> - **What the walk found:** everything the old self-serve console could do — ICP by conversation, generate people, assign them, suggest a campaign, edit a sequence, send a test, hit run — was gated by `requireAuth` (a **client** JWT). Vida proxies with an admin key and **no client session**, so the operator could look at a campaign but never propose, fill, preview, test or run one.
> - **Vida now does the work end to end:** build/refine the ICP **by talking** → pick the people (multi-select) → **Vida proposes the campaign, you approve** → edit it (brief · daily cap · **Auto-Pilot / Co-Pilot**) → **Vida drafts the sequence, you approve** → preview it as the prospect reads it → **email yourself a test** → **Run it** → see who's in it and where each of them is. Plus the **bell** (new client's first ICP · ICP revised under a live campaign · replies to answer) and **Ask them for these**, which now lands in the client's own Milla thread.
> - **Milla's half:** their thread persists so an ask is waiting for them (and their answer comes back to us) · they **revise their ICP by conversation** and it goes **live** (we get told, because anyone already enrolled was picked against the old profile) · they **see the sequence, read-only**.
> - **Two honesty fixes** worth knowing, both of which would have read as working: assign counted successful calls, not enrolments (would have said "12 added" when 3 were), and assigning to a paused campaign silently did nothing. Both now tell the truth.
> - **Next:** one PR → your review → merge → `bash scripts/ship.sh` → walk it (🟡 → 🩷 → 🟢). **Deferred by you:** refining the approval gates.
>
> **Where the 14-day build stands:** shipped and live (🩷 — deployed, awaiting your walk-through). Item-by-item detail → **BUILD-STATUS**.
> - **Vida** ✅ — client picker · pipeline board · gates (Qualify #494 · gate chips #493c) · Bookings + no-show → 2 rebooks → keep $3 (#499/#499m) · one-click sourcing w/ pool-aware confirm (#498b) · live blockers strip (#505) · **12 native engine pages + Engine rail (#502/#530–541) — old-admin exit CLOSED** · **🧠 Nexus signals panel**.
> - **Milla** ✅ — masked cards · 👍/✕ approve · concierge chat · onboarding · ICP gate · reports · **11 native pages — old-portal exit CLOSED** · "why this fits" · **🧠 Nexus flywheel card**. *(Only #515 magic-link + SMS outstanding — flagged.)*
> - **Combined** ✅ — money rails $1+$3 (#492) · off-ramps E1–E12 (E1 stale-hold sweep · E7 risky-reply escalate · E9 booking retry · E5 ruled = keep refunding) · #517 unified operating record.
> - **🧠 Nexus** ✅ **COMPLETE** — all 12 items (compute · signals · guardrails · gated copy+sourcing tune · flywheel); every tuning path **default-OFF** behind the per-client kill-switch + confidence gate + fence.
> - **The ONLY unbuilt items:** 🚩 **#515** (Milla magic-link + SMS — needs an SMS provider + a no-login security call) · ⏸ **Auto-deploy/CI** (blocked — GitHub account flagged).
> - **Next:** Fable verifies the full session → founder end-to-end walk (🩷 → 🟢). **Migrations owed on prod:** `20260724_nexus_autotune_flag.sql` (+ confirm the other 24-Jul migrations ran).

**Board:** 🟢91 · 🩷185 · 🟣1 · 🟡20 · 🔴218 · ⏸5 · **Σ520** · live count: `scripts/count-inventory.sh`

---

## 🧭 THE MAP — one row per day (tick the session it merges)
> **Where each portal lives (no new services, no new logins):** **Milla** = the current client portal, re-skinned → `@kind/portal` (app.get-kind.com, client login) · **Vida** = the current admin app, rebuilt → `@kind/admin` (admin.get-kind.com, your admin login) · they never talk directly — both use the same `@kind/api` + database (the 👍 lands in the DB, Vida sees it instantly).

| Day | Date | Ships | IDs | Owner | ✔ |
|-----|------|-------|-----|:---:|:--:|
| **0** | Wed 23 | **CONFIRMS (~20 min, unblocks everything)** — see the checklist below the map | — | 🧍 | ⬜ |
| **1** | Wed 23 | **Honesty fixes** — scoring crash bug · showroom strip (incl. Team fake add-member) · referral link · lifecycle master switch · Client-Zero→PDL → then 🧍 `railway up` api+portal | #477 #478 #479 #480 #481 | 🤖 build · 🧍 deploy | ✅ |
| **2–4** | Thu 24–Sat 26 | **WEBSITE** — Milla&Vida rebrand on the current framework (nav+footer preserved, zero orphaned pages). **Preview → your 🟣 → merge → 🧍 `railway up KIND`** | #482 | 🤖 build · 🧍 approve+deploy | ✅ |
| **5–9** | Sun 27–Thu 31 | **VIDA — the real part** — client-picker · pipeline board · nervous-system dropdown · operator audit log · approve-gated reveal. Reuses ICP/campaigns/sequences/unibox/calendar/admin → 🧍 `railway up` api+admin+portal *(shipped PRs #1109/#1111/#1112 — deploy #1112 owed)* | #483 #484 #485 #486 #487 | 🤖 build · 🧍 deploy | ✅ |
| **10–13** | Fri 1–Mon 4 Aug | **MONEY RE-TIME then MILLA** — ① #492 money engine ($1+$3-hold at 👍 · capture at booking · 2-strike no-show · release if never booked · 72h TTL; **SQL migration owed 🧍**) → ② #488 lead desk (👍/✕ masked cards, terms printed on the approval card) → ③ #493 Vida: strip operator-spend → "Send to client" + Booked column → ④ #489 concierge chat · #490 nav declutter. **Preview → your 🟣 → merge → 🧍 deploy** | #492 #488 #493 #489 #490 | 🤖 build · 🧍 approve+deploy | ✅ |
| **14** | Tue 5 Aug | **LAUNCH GATE + pilot** — the gate checklist below, walked to the cent · Client-Zero dogfood fires · first paying pilot | — | 🤝 | ⬜ |

### 🧍 DAY-0 CONFIRMS — yours, ~20 min, so we never stall mid-build
| ✓ | Confirm | How |
|---|---|---|
| ⬜ | **Migration `20260722_review_gate_producer.sql` run on prod** (co-pilot approve queue) | Supabase SQL editor → run (idempotent) |
| ⬜ | **Migration `20260722_calendar_booking_live.sql` run on prod** (calendar booking) | Supabase SQL editor → run (idempotent) |
| ⬜ | **Migration `20260717_pool_pnl_exclude_house_demo.sql` run on prod** (kills phantom pool revenue) | Supabase SQL editor → run (idempotent) |
| ⬜ | **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` set on @kind/api** (you set these 22 Jul — confirm they're live) | Railway → @kind/api → Variables |
| ⬜ | **`NEXT_PUBLIC_TRAINING_LIVE=true` on @kind/portal** (turns the knowledge page ON — the operator needs it to write client copy; flips #346) | Railway → @kind/portal → Variables |
| ⬜ | **`AUTO_OUTREACH_ENABLED` = OFF, on purpose, until Day 14** (nothing sends while we build) | Railway → @kind/api → Variables |
| ⬜ | **API runs 1 replica** (if >1, crons double-fire — #343 becomes urgent; if 1, it stays parked) | Railway → @kind/api → Settings |

### 💰 PAYDAY (lands with Day 14)
① PDL credits ($98 tier) · ② Instantly reactivate — OUR outreach inboxes (~4 wks warm) · ③ Smartlead pre-warmed inbox for the pilot client · ④ the live money walk (below) · ⑤ kill-switch ON, cap 20/day.

### ✅ DAY-14 LAUNCH GATE — live = ALL of these, walked, not remembered
| ✓ | Gate |
|---|---|
| ⬜ | **Money walk to the cent:** real card → credits land → masked lead → 👍 approve → **$1 charged + $3 HELD** → booking confirmed → **$3 captured** → ledger + holds reconcile exactly · plus one never-books lead → **$3 released** |
| ⬜ | **Approve-then-reveal proven:** a lead shows NO email before 👍; 👍 reveals + charges; ✕ costs nothing |
| ⬜ | **Client-Zero fires:** our own ICP → FIGSY sources via PDL → we approve **in MILLA as the client** (operators never spend) → sends go out on the Instantly rig → replies land in the unibox |
| ⬜ | **mail-tester ≥9/10** on a test send · sequence copy founder-approved once · `AUTO_OUTREACH_ENABLED` flipped ON **deliberately** · cap 20/day · kill-switch ON |
| ⬜ | **You walk both portals** — Vida end-to-end as the operator, Milla as a client would see it |
| ⬜ | **Pilot onboarded** — prepaid credits in, Smartlead inbox live, first leads sourced |

---

## 📌 After Day 14 (queued, one line each — detail lives elsewhere)
- **Data-engine widening** #450 #451 #452 — fires when the pilot pays (inventory).
- **⚖️ Legal sign-offs** #432–#436 · #410/#413/#414 — lawyer/accountant track, always-on, never blocks the build; **required before external use** (inventory).
- **Glide to co-pilot/self-serve · Nexus auto-tuning · Smartlead API (#211 Ph2-3) · old Blocks 3–5 upgrades** → V2-TRACKER "🛝 MILLA&VIDA FUTURE".
- **Vida ops depth** #491 per-cron alerting · #349 money-write sweep verify · #373/#389 migration hygiene (inventory).

## 🔑 Legend + how things go LIVE
**Owner:** 🤖 Claude (code, PRs) · 🧍 you (merge · deploy · run SQL · approve previews · money) · 🤝 both.
**Dots (status lives in the inventory only):** 🔴 not built · 🟡 built, on PR · 🟣 you approved the preview · 🩷 live, not walked · 🟢 live + you verified it.
**A merge is NOT a deploy.** Every ship = 🧍 merge PR → `git pull` → `railway up --detach --service "<svc>"`. Services: website=`KIND` · portal=`@kind/portal` · admin=`@kind/admin` · api=`@kind/api`. Client-facing work is **previewed here first** — you approve before anything merges.

## 📌 Standing notes
- **Money (pivot spine, re-timed 23 Jul — #492):** two wallets stay ($1 reveal `credit_balance` · $3 work `figsy_credits`); the client's 👍 charges $1 + **holds** $3; **capture at booking**, 2-strike no-show keep, release if never booked, 72h TTL. Reviewing free · dead-email $1 auto-refund (built) · prepaid only, never chase. Old charge-both-at-approve wording → superseded, history in KIND-MASTER.
- **Before any real send:** `/engine/env` must show `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` · `money_rpcs` installed.
- **Architecture (locked):** AI drafts/scores; deterministic code decides + fails closed; state advances only after verified provider/DB success.
