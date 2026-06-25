# 🚀 K.I.N.D — LAUNCH PAD

**As of: 25 June 2026** · post-launch (live since 18 Jun) · currency **USD**
**🎯 The aim right now: a FULLY OPERATIONAL, SAFE system — not speed, not more features.** Stabilize the foundation, close the gaps, *then* scale.

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = what to do, in what order, by whom · **PRODUCT-INVENTORY** = status (the board lives there only, script-counted) · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future. This doc holds **only the essentials to get operational** — everything else is parked.
> **Legend:** 🧍 you · 🤖 me (Claude) · 🤝 both. Every line carries its inventory **item ID** + a **done-when**. No fixed-day calendar — we move accurately, in order, not against a clock.

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
*This is the heart of the new Launchpad. Nothing past a step starts until the steps before it are done. Source of detail = the Launchpad teardown.*

### P0 — Confirm today (founder, ~0 build) — these may be live risks RIGHT NOW
- **Confirm `FIGSY_COLD_FROM` is set in Railway.** If unset, the product is sending cold mail from the transactional domain → **burning `get-kind.com` reputation now** (hurts even your own brand mail). 🧍 — done-when: confirmed set to a dedicated cold domain (or set it).
- **Confirm the signup T&C / consent flag is on in prod** (`FEATURE_V2_SCREENS=signup`) so legal consent is captured at signup (item 186). 🧍 — done-when: a fresh signup records `signup_terms_accepted_at`.

### P1 — Before ANY client sends through the product (security/abuse)
- **Rate-limit the expensive authed endpoints** (`/leads`, `/campaigns/:id/enroll`, `/icps/:id/run`, `/figsy/send-due`) — today a valid account can drain credits / abuse. 🤖 (preview) — done-when: per-user cap returns 429 under load.
- **Defense-in-depth `client_id` checks** — add explicit `.eq('client_id', clientId)` to the `figsy_enrollments` queries + `autoEnrollLead` (safe today via wrappers, but a latent cross-tenant gap). 🤖 (preview) — done-when: every tenant query is filtered at the query layer.

### P2 — Before onboarding US/EMEA *paying* clients (region/currency truth)
- **Kill the Africa/ZAR assumptions:** signup defaults to "South Africa" + writes `amount_zar` only; model **USD** at signup. 🤖 (preview) — done-when: a US/EMEA signup is modelled in USD with the right region.
- **Currency/honesty backlog (folds in here):** C1/235 partner code shows old tiered rates → 20/5 · C2/236 kill `fmtZAR` in partner dashboard · C3/237 retire Paystack → Stripe (US/EMEA) + Flutterwave (Africa) · C4/238 subscriptions store USD not ZAR · C5/239 unify price tables to `@kind/shared` · C6/240 settings copy overstates voice automation. 🤖 (preview) — done-when: no ZAR write paths remain; one USD price source; no overstated copy.

### P3 — Before scale (volume safety)
- **Fix the N+1 enrollment loop** — batch-insert instead of a serial per-lead loop (times out ~1,000 leads today). 🤖 (preview) — done-when: a 1,000-lead enroll completes without timeout.
- **Per-client send cap** — today the cap is global (one client starves others). 🤖 (preview) — done-when: each client/rep has its own daily cap.

### P4 — The real unlock for 🅑 (clients sending through the product)
- **211 — the sending engine:** per-client **isolated, warmed** sending (no shared sender), via Smartlead integration. The current Smartlead module is a read-only stub. 🤝 (preview, phase by phase) — done-when: a client can send from an isolated warmed sender, verified.

### P5 — Decide, then act (no half-built limbo)
- **v2 onboarding / Casey (121):** built but dev-only, unreachable, half-wired. **Decide: wire it into the live signup flow OR cut it** (the classic onboarding already works). 🤝 — done-when: decision made + executed (no orphaned flow left sitting).

### P-OPS — Operability essentials (fold in alongside the above)
- **199 — production monitoring + alerting** (UptimeRobot/BetterStack on api + app + DB + Resend) — today nothing pages you if prod breaks. 🧍+🤖 — done-when: an outage triggers an alert to you.
- **100 — Smoke Test 2** (pause · booking · billing · Vida · Milla · invites · partner) on the live system. 🤝 — done-when: all paths pass.
- **241 — migration hygiene** (dup company-engine migration · crm fields · subscriptions CHECK). 🤖 — done-when: migrations clean + verified on prod.

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
- **Decisions:** 211 (mailbox markup + Resend-client migration) · 196 accounting platform + VAT (USD reporting) · 203 repo + auth (parked) · v2/Casey wire-or-cut (P5).
- **Legal:** 102 pack · SEIS · DPAs · trademark (own track, founder-led).

## ⛔ DO-NOT-PROCEED BLOCKERS
- ⛔ **Do NOT let clients send through the product** until P1 (rate limits) + P3 (per-client cap) + P4 (211 isolated warmed sending).
- ⛔ **Do NOT onboard US/EMEA *paying* clients** until P2 (region/currency) is fixed — today they're modelled as ZAR/South Africa.
- ⚠️ **Confirm `FIGSY_COLD_FROM` immediately** — possible live reputation burn.
- ✅ **NOT blocked: your own Instantly-based US/EMEA outreach (🅐)** — ramp when warm.

---

## 🗂️ MOVED OUT OF THIS REWRITE — full sight, nothing lost
*This rewrite stripped LAUNCH-PAD to the operational essentials. Below is everything removed from the old plan and exactly where it now lives. **Nothing is deleted — every item's status of record still lives in PRODUCT-INVENTORY (the complete 250-item board).** "Moved out of LAUNCH-PAD" only means "not part of getting-operational right now."*

*Audited old vs new (25 Jun) against the real inventory IDs — every old reference is accounted for below.*

| What was in the old LAUNCH-PAD | Now lives in | Why moved out |
|--------------------------------|--------------|---------------|
| **The day-by-day 2-week sprint** (Wed 24 → Tue 7 Jul calendar) | Replaced by the **priority-ordered fix list** above | Fixed-day cram was the over-compression you're undoing — order matters, dates don't |
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
| **Code-fix / housekeeping** — 230 lena dead-code · 235/240 (also in P2) · 241 migrations · 55a RLS | **P2 / P-OPS** above + PARKED | Honesty fixes fold into P2; RLS app-layer is holding |

> **The safety net:** PRODUCT-INVENTORY is the full 250-item board — if it's not in LAUNCH-PAD, it's still there with its true dot. LAUNCH-PAD is only ever "what to do now"; this ledger is the bridge so **nothing falls through** (audited 25 Jun: every old reference accounted for).

---
*Daily rhythm: open this → do the top of the ACTIVE list + the next foundation fix in order. Status flips live in PRODUCT-INVENTORY (the only place status is edited). Why → KIND-MASTER. Future → V2-TRACKER.*
