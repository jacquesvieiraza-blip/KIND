# ✅ MILESTONE 0 — MASTER CHECKLIST (the FIGSY-only punch-list)

> **This is the working execution list for M0** (linked from LAUNCH-PAD). M0 = make the product **HONEST → RELIABLE → PROVEN** before one real client. Sell FIGSY only; everything else = "coming soon."
> **THE RULE for Move 1: DON'T DELETE. Mark not-real features "Coming soon" + grey/disable** (the #326/#334 pattern — badge + greyed + non-interactive). Code stays for Milestone 4.
> Check items off as done. Each Move ships in reviewable batches. Findings map to PRODUCT-INVENTORY #338–#407.

---

# ▶ MOVE 1a — WEBSITE SWEEP (`apps/website/*.html` + `apps/landing`) · 63 pages

**Global claims to hunt on EVERY page** (reword/remove wherever they appear): "250M+ contacts" (#366) · "handles replies autonomously" (#403) · "books meetings into your calendar" (#361) · "$1 per lead" (#394) · Apollo-as-source (#407) · POPIA/SA-only framing · the 90-day guarantee wording (#348).

## Agent pages (heaviest work)
- [ ] **figsy.html** — ⭐ KEEP (the product we sell). Reword: "books meetings/calendar" → "booking link in every email" (#361) · "handles replies autonomously" → "drafts replies for your approval" (#403) · "250M" → "targeted, verified contacts" (#366) · LinkedIn "sends" → "coming soon" (#388).
- [ ] **virtual-assistant.html (Milla)** — COMING-SOON the connectors: remove/label the "✓ HubSpot synced ✓ Gmail connected" mock (#395); keep the real "daily brief + ask about your data" framing.
- [ ] **chatbot-agent.html (Vida)** — COMING-SOON: "learns your business / no hallucinations / upload docs" (#362) + "connect your WhatsApp Business number" (#360). Keep only "website chat widget."
- [ ] **denise.html** — COMING-SOON: "trained on your closed-won deals" + "confirms booked meetings / notetaker" (#396). Keep "drafts proposals/follow-ups, you send."

## Core marketing pages
- [ ] **index.html** — the big one. Reword all global claims above; the $1 stat (#394); agent cards → mark Vida/Milla/Denise "coming soon"; guarantee (#348).
- [ ] **pricing.html** — FIGSY credit bundles KEEP ($3 · 20/40/100). Mark Milla/Vida/Denise subscriptions "coming soon"; rewrite/withhold the 90-day guarantee (#348).
- [ ] **about.html** · [ ] **story.html** · [ ] **values.html** · [ ] **solutions.html** · [ ] **use-cases.html** — review each for the global claims + agent name-drops → coming-soon where not FIGSY.
- [ ] **support.html** — "first leads in 24h / 5 business days" — keep only if true for FIGSY; reword agent claims.
- [ ] **trust.html** · [ ] **status.html** — review claims; status page must not imply live integrations that aren't.

## Comparison pages (5) — check each for Apollo/250M/autonomous claims
- [ ] **vs-apollo.html** · [ ] **vs-salesloft.html** · [ ] **vs-outreach.html** · [ ] **vs-hiring-an-sdr.html** · [ ] **vs-prospecting-manually.html**

## Industry pages (3) — agent claims per vertical → FIGSY-only, coming-soon the rest
- [ ] **for-estate-agents.html** · [ ] **for-financial-advisers.html** · [ ] **for-insurance-brokers.html**

## Blog + The Drop (review each for stale claims: Apollo / 250M / POPIA / $1 / WhatsApp / fabricated data)
- [ ] **blog.html** · [ ] **blog-ai-sdr.html** · [ ] **blog-icp-guide.html** · [ ] **blog-email-reply-rate.html**
- [ ] **blog-african-outbound.html** · [ ] **blog-popia-outbound.html** · [ ] **blog-whatsapp-outreach.html** *(SA/POPIA/WhatsApp framing — reword to global/FIGSY or banner)*
- [ ] **the-drop.html** + **drop-01…09.html** (9) + **blog-drop-01…09.html** (9) — scan for stale claims; banner or reword.

## Legal (careful — these carry contractual weight)
- [ ] **terms.html** — ⚠️ rewrite/withhold the 90-day guarantee (metric can't run) (#348).
- [ ] **privacy.html** · [ ] **dpa.html** · [ ] **dpa-us.html** — review; POPIA→global privacy where relevant.

## Tools / lead-magnets / misc
- [ ] **small-business-playbook.html** — bundle/pricing math ($1 residue) (#394).
- [ ] **playbook.html** · [ ] **prompt-library.html** · [ ] **pipeline-calculator.html** — review claims/numbers.
- [ ] **partners.html** — partner program → "coming soon" (payouts are manual #398).
- [ ] **demo.html** · [ ] **demo-video.html** · [ ] **figsy-video.html** · [ ] **platform-video.html** · [ ] **platform-video-standalone.html** — review what the videos show vs reality; steer demos to FIGSY only.
- [ ] **solutions.html** (if not covered above) · [ ] **the-drop.html**

## 🔴 `apps/landing` (separate app — may be deployed, still sells the RETIRED $1 tier)
- [ ] **landing/index.html** — sells "$1 per qualified lead · from $20" (#394) → fix to $3 FIGSY or take the app down.
- [ ] **landing/demo.html** · [ ] **landing/figsy-video.html** · [ ] **landing/platform-video.html** — review. **First: confirm whether `apps/landing` is even deployed** (if not, lower priority).

---

# ▶ MOVE 1b — PORTAL SWEEP (`apps/portal/.../dashboard/*`) · 34 screens

## ⭐ KEEP (FIGSY core — leave live, just verify honest)
- [ ] **dashboard** (home) · [ ] **figsy** · [ ] **figsy-chat** · [ ] **leads** · [ ] **prospects** · [ ] **inbox** · [ ] **kpis** · [ ] **analytics** · [ ] **roi** · [ ] **activity** · [ ] **messages** · [ ] **templates** — verify no false stats, no dead buttons (#384).
- [ ] **knowledge** — KEEP + this is where Move 2 flips `TRAINING_LIVE` on (#346). In the sweep: ensure it's the FIGSY knowledge screen and reachable.

## 🟠 COMING-SOON (non-FIGSY agents — grey + badge, don't delete)
- [ ] **assistant (Milla)** · [ ] **chatbot (Vida)** · [ ] **denise** · [ ] **agents** · [ ] **marketplace** · [ ] **notetaker**

## 🟠 COMING-SOON (non-FIGSY features)
- [ ] **partner** · [ ] **referral** (link also broken #355) · [ ] **integrations** (all tiles are dead toasts #399) · [ ] **company** · [ ] **team** · [ ] **developer** (keep API keys; webhooks section dead #381 → coming-soon)

## 🔧 FIX (FIGSY-adjacent — not just hide)
- [ ] **billing** — keep FIGSY credit purchase; HIDE Milla/Vida/Denise subscription products + auto-topup (dead Paystack #352/#334); "Cancel" path is subscription (M4).
- [ ] **usage** — DELETE the fabricated "$1/lead overage" panel (#385).
- [ ] **settings** · [ ] **config** — verify toggles do what they say (the #326 "Soon" pattern already partly here).

## 🔍 REVIEW / hide
- [ ] **v2** (preview screens → keep hidden) · [ ] **whats-new** · [ ] **documents** · [ ] **deliverability** (redirect) · [ ] **mcp**

---

# ▶ MOVE 2 — FIGSY RELIABILITY (Top-20 controls · each a small, TESTED PR)

## The core — money-for-send (do FIRST)
- [ ] **#338** — `sendSequenceEmail` checks Resend `{error}`; state advances only on provider-confirmed success (reserve→commit state machine).
- [ ] **#339** — `sendFounderAlert` checks its own send result + durable store + Slack fallback.

## Sending safety
- [ ] **#343** cron singleton (advisory lock / `RUN_CRONS`) · [ ] **#344** kill-switch covers the cron send paths · [ ] **#354** no double-send (atomic claim + `(enrollment_id,step)` unique) · [ ] **#353** trial-expiry sends once · [ ] **#356** consent emails inside the outreach gate.

## Credits + data integrity
- [ ] **#349** checked credit-ledger writes (no swallow) · [ ] **#371** atomic welcome/trial grants · [ ] **#376** delivery charge clamp + alert · [ ] **#379** Stripe refund path returns 500 · [ ] **#383** create `increment_figsy_emails_sent` RPC · [ ] **#373** FIGSY prod uniques verified/added.

## Product honesty (in the app)
- [ ] **#346** flip `TRAINING_LIVE` ON (client can enter knowledge → personalised outreach) · [ ] **#347** fix approve-before-send (`figsy_leads`→`leads`) · [ ] **#358** scoring failure → quarantine, not fake-50 · [ ] **#365** gate the seed-demo reply endpoint · [ ] **#366** paginate sourcing (beyond ~50) · [ ] **#367** alert when delivered=0 of N.

## Tenant + infra underpinning
- [ ] **#345** lookalike derive-client-from-auth · [ ] **#350** drop `visitor_sessions` public policy · [ ] **#363** guard `/admin/seed-leads` · [ ] **#390** observability (durable alerts + DLQ) · [ ] **#389** migration runner + schema-diff CI · [ ] **#400** globalise SA-name prompt · [ ] **#401** honest dots · [ ] **#402** auth nits.

---

# ▶ MOVE 3 — PROVE + SELL (nothing goes 🟢 without this)

## Prove on staging (runtime, not code — audit §K)
- [ ] Resend errors → email NOT marked sent (inject bad domain).
- [ ] Two concurrent send-due runs → exactly one email (constraint holds).
- [ ] Enroll with 0 credits → blocked; with 1 → charged to 0, ledger row written.
- [ ] Client enters knowledge → generated copy visibly changes.
- [ ] A lead actually sources (PDL) → email revealed (Hunter) → delivered.
- [ ] Founder alert actually arrives on a simulated money failure.

## Founder-run facts first (audit §D — 5 min, unblocks Move 2 priorities)
- [ ] Run §D prod-DB SQL (enum · uniques · missing tables · MRR).
- [ ] Confirm Railway API replica count (is #343 live?).
- [ ] Confirm whether `apps/landing` is deployed (#394 priority).

## Sell
- [ ] Everything above green → sell FIGSY to ONE client → watch it work.

---

**M0 is DONE when:** every box above is checked, each Move-2 fix has a regression test, and Move 3 is proven on staging. *(Progress mirrored in PRODUCT-INVENTORY dots #338–#407; this doc is the working punch-list.)*
