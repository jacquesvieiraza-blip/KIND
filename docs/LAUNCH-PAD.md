# 🚀 K.I.N.D — LAUNCH PAD

**As of: Tuesday 23 June 2026** · post-launch (live since 18 Jun) · currency **USD**

> 🧭 **Four-doc contract:** **LAUNCH-PAD** (this) = what to do, when, by whom · **PRODUCT-INVENTORY** = status (the board lives there *only*, script-counted — this doc never copies the numbers, so it can't go stale) · **KIND-MASTER** = strategy + why · **V2-TRACKER** = future.
>
> **Legend:** 🧍 **you** · 🤖 **me (Claude)** · 🤝 **together.** Every line carries its inventory **item ID** + a **done-when**.

---

## ⚡ STATE — the one picture

- **🚀 Live since 18 Jun.** 4 builds are shipped-but-not-yet-walked (112 inbox · 113 A/B · 114 Kanban · 178 voice-shell) + the 140 PDL-waterfall part → **the walk turns them 🟢.**
- **🔥 #1 priority = DELIVERABILITY. Two SEPARATE things — don't confuse them:**
  - **198 · Instantly** = warm **OUR** cold domain so **YOU** can do outreach to win clients. A **~1–2 week clock.** 🧍 **you set it up — Day 1.**
  - **211 · Smartlead = THE ENGINE** = the **CLIENT-facing** sending engine inside the product. 🤖 **I build it**, gated on **your Smartlead API key**.
- **⛔ Do NOT campaign hard until the domain is warmed** (it burns the domain).
- **📊 Status board → PRODUCT-INVENTORY** (run `scripts/count-inventory.sh`). Deliberately not repeated here.

---

## 🗓️ THE 2-WEEK PLAN — day by day (Wed 24 Jun → Tue 7 Jul)

### Wed 24 Jun — Day 1 · START THE CLOCKS
- 🧍 **198 Instantly** — sign up → connect cold-domain mailboxes → **Warmup ON.** · *done-when: warmup is running*
- 🧍 **211 Smartlead key** — put the API key (Pro + white-label) in Railway. · *done-when: key in env → unblocks my build*
- 🧍 **96 / 128** — start the **Vapi key** + the **WhatsApp/Meta app** (Meta approval takes days). · *done-when: applications submitted*
- 🤖 **211 · Phase 1** — Smartlead **spike on staging**: confirm both modes work. · *done-when: I send you a preview showing it works — before I build on it*

### Thu 25 Jun — Day 2 · TRUST WALK + ENGINE SEAM
- 🤝 **Live-feature walkthrough** (`LIVE-FEATURE-WALK.md`) on `app.get-kind.com` — you walk, I fix breaks live. · *done-when: every live feature walked (this gates all demos)*
- 🤖 **211 · Phase 2** — thin `SendingProvider` seam (FIGSY off the hard-wired Resend path).
- 🧍 **126 Google/MS OAuth** registration. · *done-when: registered → unblocks SSO (84/181)*

### Fri 26 Jun — Day 3 · VERIFY BUILDS + WIRE ENGINE
- 🤝 **Verify-or-revert** the 4 shipped builds (112 · 113 · 114 · 178) + the 140 PDL-waterfall → flip to 🟢, or I revert what's wrong.
- 🤖 **211 · Phase 3** — wire **one** client path off shared Resend → **preview link → you approve before it goes live.**
- 🧍 **58** — confirm the live Denise Stripe price = **$39** at checkout. · *done-when: verified → 🟢*

### Sat 27 / Sun 28 Jun — light
- 🧍 Check Instantly warmup is progressing · **194 / 101** real-Gmail placement test.
- 🤖 (background, via preview) **55a** Company RLS · **106–109** company fast-follows (verify the 🩷 ones).

### Mon 29 Jun — Day 4 · ENGINE MODES + SMOKE
- 🤖 **211 · Phase 4** — two modes (managed-SMB / connect-your-own) + reply capture.
- 🧍 **211 decisions** — the **markup model** for managed mailboxes + the **migration** plan for existing Resend clients.
- 🤝 **100** smoke tests T3–T10 (pause · booking · billing · Vida · Milla · invites · partner).

### Tue 30 Jun — Day 5 · MONITORING + BILLING
- 🤖 **211 · Phase 5/6** — deliverability monitoring · **57** Stripe → company-pool billing (preview).
- 🧍 **108 decision** — does budget-edit move pool credits? does deactivate reclaim them? · *(the build is 🩷; this is the open rule)*

### Wed 1 Jul — Day 6 · ONBOARDING + LIFECYCLE
- 🤖 **174–176** onboarding fork (firmographics · seat routing · 14-day trial) · **135 / 137** lifecycle emails + 90-day guarantee.
- 🧍 **196** accounting platform pick (Xero/QB/FreeAgent/Sage) + VAT timing.

### Thu 2 Jul — Day 7 · NAV + NOTION + SELLER DECISION
- 🤖 **118** finish nav rewire · **162 / 93** verify (Prompt Library + The Drop).
- 🧍 **204** set up the Notion workspace · **203** decide **repo + auth/hosting**. · *⚠️ 203 BUILD is GATED on this — I do not build 203 until you decide.*

### Fri 3 Jul — Day 8 · LEGAL + CONTENT PREP
- 🧍 **102** legal pack (D&O insurance · trademark filing · the moved SR01 / registered-office / WHOIS) · DPAs verify · **103** progress Apollo.
- 🤖 **131** funnel instrumentation · **134** social-cut groundwork.

### Sat 4 / Sun 5 Jul — light
- 🧍 Warmup placement check — should be near inbox-ready.

### Mon 6 Jul — Day 9 · DEMO (warm enough) + DOGFOOD
- 🧍 **129** record the platform demo → Drop 01 · **132** dogfood self-outreach · **133** line up 2 design-partner slots.

### Tue 7 Jul — Day 10 · GTM ON + CLOSE THE FORTNIGHT
- 🧍 **127** warm outreach + LinkedIn 1/day *(domain warmed now)* · **142** Product Hunt + G2 prep.
- 🤖 **199** uptime monitor → `/health` · **184** public status page · prune stale branches.
- 🤝 **Fortnight close** — walk the 🩷 builds → flip to 🟢 · reconcile the board.

---

## 🧍 YOUR STANDING LIST *(status of record = PRODUCT-INVENTORY by ID)*
- **Keys:** 211 Smartlead · 96 Vapi · 128 WhatsApp/Meta · 126 OAuth · 136 Flutterwave · 58 Denise price. *(104 Hunter/PDL ✅ already confirmed in Railway.)*
- **Decisions:** 196 accounting + VAT · 203 repo + auth · 108 credit behaviour · 211 markup + migration · 165 visitor-intel · 120 pgvector · 121 Casey voice.
- **Legal:** 102 pack · 103 Apollo ⏸ · SEIS · DPAs.
- **GTM:** 129 demo · 127 outreach · 132 dogfood · 133 partners · 142 Product Hunt · 138 influencer.
- **Seller engine:** 201 hire AE · 202 agreements.

## 🤖 MY QUEUE — buildable now, via preview
55a · 57 · 106–109 · 115 · 118 · 135 · 137 · 174–176 · 97 · 131 · **211 (the ENGINE)** · **212 (FIGSY 3→6-step)** — all previewed before they go live.
**⛔ Gated, NOT building yet:** **203** (waiting on your repo + auth decision).

## ⛔ BLOCKED / WAITING
- **117** drop-subscribe → blocked on Drop content.
- **126** OAuth go-live → your Google/Microsoft registration.
- **103** onboarding default → Apollo's reseller reply.
- **211** ENGINE build → your Smartlead API key in Railway.

---
*Daily rhythm: open this → do today's lines. Status → PRODUCT-INVENTORY. Why → KIND-MASTER. When something ships, its dot flips in the inventory (the only place status is edited).*
