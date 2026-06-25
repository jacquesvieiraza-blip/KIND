# 🚀 K.I.N.D — LAUNCH PAD

**As of: 25 June 2026** · post-launch (live since 18 Jun) · currency **USD**
**🎯 The aim right now: a FULLY OPERATIONAL, SAFE system — not speed, not more features.** Stabilize the foundation, close the gaps, *then* scale.

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = what to do, in what order, by whom · **PRODUCT-INVENTORY** = status (the board lives there only, script-counted) · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future. This doc holds **only the essentials to get operational** — everything else is parked.
> **Legend:** 🧍 you · 🤖 me (Claude) · 🤝 both. Every line carries its inventory **item ID** + a **done-when**. No fixed-day calendar — we move accurately, in order, not against a clock.

---

## 📍 PROGRESS AT A GLANCE — the ONE place to see done vs not
> ✅ done · ⏳ in progress · 🔴 not started · ⏸ waiting on you. **This is the live tracker — look here first.** Detail per step is in the foundation list below.

| Step | What | Status | PR |
|------|------|--------|-----|
| **P0** | Confirm cold-domain · T&C flag · migrations | ✅ done | confirmed live 25 Jun |
| **T1** | Safety — rate-limits · CRM fail-closed · dup migration | ✅ done | #753 |
| **T2a** | Region default + voice copy | ✅ done | #754 |
| **T2b** | Currency stored in USD (`amount_usd`) | ⏳ code ready — **needs migration run** | #756 |
| **T2c** | Kill Paystack | ⏸ waiting on your Paystack-clear check | — |
| **M2** | Pause stops Stripe billing | 🔴 next | — |
| **T3** | Scale — N+1 batch enroll · per-client cap | 🔴 | — |
| **T4** | The 211 sending engine (clients-on-product unlock) | 🔴 | — |
| **T5** | Decide & harden (v2/Casey · monitoring · hygiene) | 🔴 | — |
| **🅐** | Your Instantly US/EMEA outreach (parallel, not blocked) | ⏳ warming | — |

---

## ⚡ THE ONE PICTURE

- **Two completed teardowns are the spine of this plan:** the **Inventory rebuild** (clean, honest board — PR #749) and the **Launchpad/operational teardown** (this doc's fix order). Both said the same thing: *the core is real; close the foundation gaps before scaling.*
- **🅐 vs 🅑 — the distinction that drives everything:**
  - **🅐 YOUR outreach** (you emailing US/EMEA prospects to win clients) runs through **Instantly on separate warmed domains (198)** — *not* the product. **Safe to ramp the moment Instantly is warm. Not blocked by anything below.**
  - **🅑 CLIENTS sending through the product** runs through a shared, unwarmed sender with no rate limits and engine **211 unbuilt**. **Gated** until the foundation fixes land.
- **So the path is:** finish the walkthrough → close the foundation fixes (in order) → 🅐 ramps in parallel as the domain warms → 🅑 (paying clients on the product) opens only when its blockers clear.
- **📊 Status board → PRODUCT-INVENTORY** (`scripts/count-inventory.sh`). Not copied here, so it can't go stale.

---

## ✅ ACTIVE NOW — the only things in flight

1. **Merge PR #749** (walkthrough + clean inventory rebuild). 🧍 — done-when: merged to main.
2. **Finish the trust walkthrough** — `app.get-kind.com`, flip the remaining **🩷 → 🟢** in `LIVE-FEATURE-WALK.md` (I flip dots live as you confirm), fixing orphans/shells as we hit them. 🤝 — done-when: every live item is walked (🟢 or honestly dropped).
3. **Then the inventory walkthrough proper** — re-walk the rest of the board against reality. 🤝 — done-when: board fully reconciled.

---

## 🧱 THE OPERATIONAL FOUNDATION — ordered fix list
*This is the heart of the new Launchpad — the ONE source of truth for the fix plan. Nothing past a tier starts until the tier before it is done. Evidence + file:line detail → `SYSTEM-HEALTH-AUDIT.md` (linked in DOC-MAP). Each tier ships as ONE checked PR when we reach it — no drip.*

### P0 — CONFIRM ✅ DONE (25 Jun) — evidence in SYSTEM-HEALTH-AUDIT
- ✅ **`FIGSY_COLD_FROM`** = `hello@gettingkind.com` (dedicated cold domain) — transactional `get-kind.com` is NOT being burned.
- ✅ **Signup T&C flag** = `NEXT_PUBLIC_FEATURE_V2_SCREENS=ALL` → consent renders + is captured.
- ✅ **Prod-migration state confirmed + fixed:** ran the 3 missing that matter — `outcome_events` (data floor, item 48 — was a fake-green) · `leads.research_summary` · `figsy_chat_messages`. Double-charge guard confirmed live; bad dup `611` never ran (deleted in T1); `webhook_endpoints` present (not unrun); `linkedin_queue` skipped (parked).

### T1 — SAFETY ✅ DONE (PR #753, merged) *(gate: before ANY client sends on the product)*
- ✅ **Per-user rate-limits** on the 4 expensive endpoints (H1) — 429 past the cap.
- ✅ **CRM dedup fail-closed** (M3) — a broken/unreachable CRM skips the lead, never emails.
- ✅ **Deleted dead dup migration 611** (part of H3) — confirmed via P0 it never ran on prod.
- ✅ **M5 verified NOT a bug** (intended global cron) → dropped; the real per-client cap is T3.
- ↪️ *Carries into T2b:* `subscriptions.tier` CHECK reconcile + migration-dir consolidation. (`webhook_endpoints` already present per P0 — moot.)

### T2 — REGION & MONEY *(gate: before US/EMEA *paying* clients)*
- ✅ **T2a (PR #754, merged):** killed the South-Africa signup default (region modelled true) + fixed the overstated voice copy (C6/240).
- ⏳ **T2b — currency storage (#756, code ready):** `amount_usd` write wired in subscriptions + signup (C4/238) — **🧍 run the migration, then merge.** Remaining (with the T2c migration pass): unify price tables to `@kind/shared` (C5/239) · reconcile `subscriptions.tier` CHECK.
- 🔴 **T2c — kill Paystack (C3/237):** 🧍 confirm no client mid-sub on Paystack → 🤖 remove the router + ZAR write paths.
- 🔴 **M2 — pause stops Stripe billing:** today pause only handles Paystack. 🤖.
- ↪️ **C1/C2 (partner rates + partner-dashboard ZAR) MOVED to item 220** (partner earnings backend, PARKED) — the dashboard *stores* earnings in ZAR; the fix belongs with 220, not T2.

### T3 — SCALE SAFETY *(🤖 preview · gate: before volume)*
- **N+1 batch enrollment** — M4: serial per-lead loop times out ~1,000 leads. — done-when: a 1,000-lead enroll completes without timeout.
- **Per-client send cap** — today the cap is global (one client starves others). — done-when: each client/rep has its own daily cap.

### T4 — THE ENGINE *(🤝 preview, phased · the real unlock for 🅑 clients-on-product)*
- **211 — per-client isolated + warmed sending** (no shared sender), via Smartlead (today a read-only stub). — done-when: a client sends from an isolated, warmed sender, verified.

### T5 — DECIDE & HARDEN *(🤝)*
- **v2/Casey (121) — wire-or-cut.** Built but dev-only/half-wired; classic onboarding already works. — done-when: decided + executed (no orphan flow left).
- **199 monitoring + alerting** (UptimeRobot/BetterStack on api · app · DB · Resend). — done-when: an outage pages you.
- **100 Smoke Test 2** (pause · booking · billing · Vida · Milla · invites · partner). — done-when: all paths pass.
- **Code/UX hygiene:** mount-or-delete `lena.ts` (230) · the 11 dead agent-panel buttons · missing `/figsy/stats` · the knowledge/inbox/team stubs (74/112/80). — done-when: no dead controls in the live product.

---

## 🅐 YOUR OUTREACH TRACK — runs in parallel, NOT blocked by the above
*This is the fast-cash track. It uses Instantly + separate warmed domains, independent of the product's sending path.*
- **198 — warm the Instantly domains** (~1–2 wk clock, in motion). 🧍 — done-when: health ~90%, inbox-placement test passes (101/194).
- **Build the list while it warms** — a 200–500 lead US/UK list via the data engine (243) + `content/our-outreach-us-uk.md`. 🤝 — done-when: list ready.
- **Load the sequence** (dogfood angle + free-sample CTA) into Instantly. 🤖 — done-when: sequence + list attached, ready to fire.
- **Fire on warm** (127) — low, ramped volume → replies → demos → first clients. 🤝 — done-when: first US/UK outreach sent.

---

## ⏸ PARKED — NOT on the path to a fully operational system
*Rule: nothing builds unless it's (a) a foundation fix above, (b) the walkthrough, or (c) the 🅐 outreach track. Everything else carries until the system is solid and a real client/revenue pulls it in.*
- **Feature builds:** 120 memory · 144 Denise-deep · 141 context-MCP · 145 LENA/TONY · 157/158 images+voice-brief · 212 FIGSY 6-step (beyond the 🅐 copy) · 162 prompt library polish.
- **Partner/seller engine:** 197 · 200 · 203 · 213–226 · 228 — the whole partner UI/comp build. (Stealth recruiting 233 = list-build only, no founder identity.)
- **Channels:** 96 Vapi voice · 128 WhatsApp · 178 voice widget — parked (not on the cash path).
- **Later/gated:** 139/143 intelligence · 147 outcome pricing · 150/151/155/156/159/160/161 scale · 165 visitor-intel · 55a RLS migration (app-layer holding) · enterprise SSO 181.

---

## 🧍 YOUR STANDING LIST (decisions + keys the founder owns)
- **Confirm now (P0):** `FIGSY_COLD_FROM` · signup T&C flag.
- **Keys:** 126 Google OAuth · 136 Flutterwave · 58 Denise price. *(104 Hunter/PDL ✅ confirmed · Smartlead key ✅ live.)*
- **Decisions:** 211 (mailbox markup + Resend-client migration) · 196 accounting platform + VAT (USD reporting) · 203 repo + auth (parked) · v2/Casey wire-or-cut (T5).
- **Legal:** 102 pack · SEIS · DPAs · trademark (own track, founder-led).

## ⛔ DO-NOT-PROCEED BLOCKERS
- ⛔ **Do NOT let clients send through the product** until T1 (rate limits) + T3 (per-client cap) + T4 (211 isolated warmed sending).
- ⛔ **Do NOT onboard US/EMEA *paying* clients** until T2 (region/currency) is fixed — today they're modelled as ZAR/South Africa.
- ⚠️ **Confirm `FIGSY_COLD_FROM` immediately** — possible live reputation burn.
- ✅ **NOT blocked: your own Instantly-based US/EMEA outreach (🅐)** — ramp when warm.

---

## 🗂️ MOVED OUT OF THIS REWRITE — full sight, nothing lost
*This rewrite stripped LAUNCH-PAD to the operational essentials. Below is everything removed from the old plan and exactly where it now lives. **Nothing is deleted — every item's status of record still lives in PRODUCT-INVENTORY (the complete 250-item board).** "Moved out of LAUNCH-PAD" only means "not part of getting-operational right now."*

*Audited old vs new (25 Jun) against the real inventory IDs — every old reference is accounted for below.*

| What was in the old LAUNCH-PAD | Now lives in | Why moved out |
|--------------------------------|--------------|---------------|
| **The day-by-day 2-week sprint** (Wed 24 → Tue 7 Jul calendar) | Replaced by the **P0 + T1–T5 fix plan** above | Fixed-day cram was the over-compression you're undoing — order matters, dates don't |
| **🟢 LIVE core product** — agents + lead engine + outreach + admin + infra + billing (items **1–56, 92, 104, 195, 244**) | **PRODUCT-INVENTORY** (status home) | Already live; the walkthrough re-verifies them. Not forward work |
| **🩷 live-not-walked** — 59 · 80 · 106–109 · 112–114 · 245 · 246 · R-wave 60–79 | **ACTIVE → "finish the walkthrough"** | These ARE the walkthrough — flipped 🩷→🟢 there |
| **Feature builds** — 27 · 57 · 97 · 115 · 118 · 131 · 135 · 137 · 162 · 174–176 | **⏸ PARKED** + inventory | Not required for a fully operational, safe system |
| **212 FIGSY 6-step rebuild** | **PARKED** — *except* the US/EMEA copy in the **🅐 track** | Only the copy serves first revenue; the rebuild waits |
| **Data layer** — 242 · 243 (FOCUS) · 140 (waterfall rest) | **🅐 track** (list-build) + inventory | Email-reveal already works; widening sources isn't a foundation blocker |
| **Partner / seller engine** — 197 · 200 · 201 · 202 · 203 · 204 · 213–226 · 228 · 235 | **PARKED** + V2-TRACKER | Whole channel/seller build; not on the operational/first-revenue path |
| **Channels** — 96 Vapi · 128 WhatsApp · 178 voice widget · 229 voice backend | **PARKED** + inventory | Not on the cash path (parked 25 Jun) |
| **Intelligence + scale** — 120 · 141 · 143 · 144 · 145 · 147 · 150–161 · 165 · 227 | **PARKED** + inventory | Client/margin/scale-gated; pulled in when a signed client needs them |
| **GTM detail** — 129 · 132 · 133 · 134 · 138 · 142 | **🧍 standing list** + 🅐 track | Sit behind first outreach; surfaced when 🅐 is live |
| **Founder-led EPIC tracks** — 231 Content · 232 Legal · 234 SEIS · 103 Apollo ⏸ · 117 drop ⏸ · 123 Y12–14 | **🧍 founder-owned** + inventory | Off the build path; you drive these |
| **Code-fix / housekeeping** — 230 lena (T5) · 235/240 (T2) · 241 migrations (T1) · 55a RLS (parked) | **T1 / T2 / T5** above + PARKED | Honesty fixes fold into T2; migrations into T1; hygiene into T5; RLS app-layer holding |

> **The safety net:** PRODUCT-INVENTORY is the full 250-item board — if it's not in LAUNCH-PAD, it's still there with its true dot. LAUNCH-PAD is only ever "what to do now"; this ledger is the bridge so **nothing falls through** (audited 25 Jun: every old reference accounted for).

---
*Daily rhythm: open this → do the top of the ACTIVE list + the next foundation fix in order. Status flips live in PRODUCT-INVENTORY (the only place status is edited). Why → KIND-MASTER. Future → V2-TRACKER.*
