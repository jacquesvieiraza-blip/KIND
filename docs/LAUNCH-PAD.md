# 🚀 LAUNCH PAD — Milla&Vida, the 14-day build

> 🛠️ **Live item-by-item build status → [`docs/BUILD-STATUS.md`](./BUILD-STATUS.md)** — every page/feature, merged-vs-live, and what's left. Updated after every build.

> **The one daily page.** Everything on it either ships in the 14 days or unblocks them. **If it's not on this page, it does not block launch.**
> Status of record → **PRODUCT-INVENTORY** (#477–#491 + THE NEW MAP) · why/history → **KIND-MASTER** session log · future → **V2-TRACKER** "🛝 MILLA&VIDA FUTURE".

**THE PLAN (founder-locked 22 Jul):** we sell a **managed service** on the FIGSY engine, trading as **Milla&Vida**. **Vida** = OUR operator console (we run ICP → source → draft → send → triage → book). **Milla** = the client portal (masked leads · 👍 approve / ✕ pass · concierge chat · meetings · reports). **Nexus** = per-client private brain. **Money (locked 24 Jul, #492 — ONE WALLET / work model, supersedes the 23-Jul re-time):** a single dollar wallet per client · first purchase **$99**, then free top-ups ($40/$100/$200) · the client's 👍 charges a flat **$4 per approved lead, FINAL** (no $1/$3 split, no hold, no capture-on-booking, no release, no TTL) · a **dead email is never charged** · **meetings are reported, not refunded** · reviewing free · **only the client's 👍 ever spends — operators never**. **Client Zero = us.** Build order: **Website → Vida → Milla.** If days squeeze: **Milla trims first, Vida never, Website never.**

## ✅ VERIFIED STATE (26 Jul) — MERGED AND DEPLOYED
> **Today, in one line:** flow v2 is **21 of 21 closed, merged and live** (PRs #1159, #1160), and a full audit of both consoles found and fixed twelve more things — including two places the product contradicted itself on screen in front of a paying client.
> - **The money model, as it actually runs:** $99 = the onboarding pack (**100 approved leads included**), then a flat **$4 each, no expiry**. Payment starts the work — it sources against the live ICP and puts every person in front of the client with our top 20 marked. Only the client's 👍 ever spends.
> - **Two gates that keep it solvent:** a client approves **at least 20** the first time (server-enforced on every door into the money path, because a disabled button is a suggestion), and **30 days with no approvals suspends them** — campaigns pause, and approving anyone brings them straight back with no operator in the loop.
> - **Vida opens on the step, not the objects:** where this client is, the one thing that moves them, and **the work itself inside that card** — the sequence emails, readable, with Redraft/Edit on them. Plus names-per-approval measured per client and across the book, and Suspended / Going-quiet flags.
> - **MBF** — the demo account. 40 invented people, fixed cast, planted history, one button in Vida → Engine to build or reset it. Nothing can send: `is_demo` is a hard stop in the send path and every address is `.invalid`.
> - **From the 26-Jul audit:** Milla no longer says "Campaign live" while a campaign is dormant or paused; the pack price is consistent everywhere (greeting, cards, footer); the pack counter refreshes after approving; a client's own Milla messages now **page the operator and appear in Vida → Asks** (they previously landed in a table nobody read); the Vida header's "to triage" counts open replies rather than today's arrivals, and excludes demos; and the Bookings tab can finally mark a no-show and give a goodwill rebook.
> - **The ONLY unbuilt items:** 🚩 **#515** (Milla magic-link + SMS — needs an SMS provider + a no-login security call) · ⏸ **Auto-deploy/CI** (blocked — GitHub account flagged).
> - **🧍 Owed by you:** run migration **`20260726_client_contact_name`** from Vida → Engine (additive, safe to re-run; sign-up works without it, the name just doesn't store) · tick Stripe webhook events **`charge.refunded` · `charge.dispute.created` · `charge.dispute.closed`** (without them the refund/chargeback code never fires) · confirm the **Smartlead per-client workspace fee** (~$40 is an estimate and it sets the ~13-approval floor).
> - **Next:** walk it end to end (🩷 → 🟢).

**Board:** 🟢91 · 🩷193 · 🟣1 · 🟡18 · 🔴218 · ⏸5 · **Σ526** · live count: `scripts/count-inventory.sh`

---

## 🧭 THE MAP — one row per day (tick the session it merges)
> **Where each portal lives (no new services, no new logins):** **Milla** = the current client portal, re-skinned → `@kind/portal` (app.get-kind.com, client login) · **Vida** = the current admin app, rebuilt → `@kind/admin` (admin.get-kind.com, your admin login) · they never talk directly — both use the same `@kind/api` + database (the 👍 lands in the DB, Vida sees it instantly).

| Day | Date | Ships | IDs | Owner | ✔ |
|-----|------|-------|-----|:---:|:--:|
| **0** | Wed 23 | **CONFIRMS (~20 min, unblocks everything)** — see the checklist below the map | — | 🧍 | ⬜ |
| **1** | Wed 23 | **Honesty fixes** — scoring crash bug · showroom strip (incl. Team fake add-member) · referral link · lifecycle master switch · Client-Zero→PDL → then 🧍 `railway up` api+portal | #477 #478 #479 #480 #481 | 🤖 build · 🧍 deploy | ✅ |
| **2–4** | Thu 24–Sat 26 | **WEBSITE** — Milla&Vida rebrand on the current framework (nav+footer preserved, zero orphaned pages). **Preview → your 🟣 → merge → 🧍 `railway up KIND`** | #482 | 🤖 build · 🧍 approve+deploy | ✅ |
| **5–9** | Sun 27–Thu 31 | **VIDA — the real part** — client-picker · pipeline board · nervous-system dropdown · operator audit log · approve-gated reveal. Reuses ICP/campaigns/sequences/unibox/calendar/admin → 🧍 `railway up` api+admin+portal *(shipped PRs #1109/#1111/#1112 — deploy #1112 owed)* | #483 #484 #485 #486 #487 | 🤖 build · 🧍 deploy | ✅ |
| **10–13** | Fri 1–Mon 4 Aug | **MONEY RE-TIME then MILLA** — ① #492 money engine *(as built: ONE WALLET, flat $4 at 👍, no hold/capture/TTL — the $1+$3-hold design was superseded on 24 Jul)* → ② #488 lead desk (👍/✕ masked cards, terms printed on the approval card) → ③ #493 Vida: strip operator-spend → "Send to client" + Booked column → ④ #489 concierge chat · #490 nav declutter. **Preview → your 🟣 → merge → 🧍 deploy** | #492 #488 #493 #489 #490 | 🤖 build · 🧍 approve+deploy | ✅ |
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
- **Money (current — ONE WALLET work model, locked 24–25 Jul):** one dollar wallet per client · first purchase **$99 = the onboarding pack, 100 approved leads included**, then a flat **$4 per approved lead, FINAL** · **no time limit on paid leads** · a dead email is never charged · meetings are reported, not refunded · **only the client's 👍 ever spends — operators never**. **Two gates protect it:** a client must approve **at least 20** the first time round (their sender costs us ~$40/mo from day one, so the first ~13 approvals only pay for that), and **30 days with no approvals suspends them** — campaigns pause, they come straight back the moment they approve anyone. *(Retired and kept only as history in KIND-MASTER: two wallets, $1 reveal + $3 hold, capture-at-booking, release-if-never-booked, the 72h TTL.)*
- **Before any real send:** `/engine/env` must show `RESEND_API_KEY` · `ADMIN_SECRET_KEY` · `ANTHROPIC_API_KEY` · `RESEND_WEBHOOK_SECRET` · `FIGSY_COLD_FROM` · `TRACKING_URL` · `money_rpcs` installed.
- **Architecture (locked):** AI drafts/scores; deterministic code decides + fails closed; state advances only after verified provider/DB success.
