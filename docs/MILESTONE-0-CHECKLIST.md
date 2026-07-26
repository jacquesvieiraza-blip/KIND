# ✅ MILESTONE 0 — MASTER CHECKLIST (the FIGSY + Lead-Gen punch-list)

> # 🛑 SUPERSEDED 26 Jul 2026 — THE MONEY LADDER BELOW IS RETIRED (inventory #557)
> **This doc still prices the product on the retired ladder** — `$1 reveal + $3 work = $4`, then `+$1 Milla = $5`, `+$1 Denise = $6`, `Vida inbound $3` — with a hold, a capture-on-booking, a release and a 72h TTL. **None of that is how we charge.**
>
> **Current money model (founder-locked 24–25 Jul · #492/#541):** one dollar wallet per client · first purchase **$99 = the onboarding pack, 100 approved leads included** · then a flat **$4 per approved lead, FINAL** — no split shown, no hold, no capture, no release, **no expiry** · a dead email is never charged · meetings are reported, not refunded · **only the client's 👍 ever spends**. Two gates: **minimum 20 approvals** first time round, and **30 days idle suspends** them.
>
> **Money model of record → [`CASHFLOW-LAB.html`](./CASHFLOW-LAB.html)** · cost detail → `run-costs-and-cashflow.md` · execution → `LAUNCH-PAD.md` · status → `PRODUCT-INVENTORY.md` · why → `KIND-MASTER.md`. **Everything below is the M0 punch-list as it stood; read the honesty/reliability work as record and ignore every price.**

> **This is the working execution list for M0** (linked from LAUNCH-PAD). M0 = make the product **HONEST → RELIABLE → PROVEN** before one real client. Sell **FIGSY + Lead-Gen** ($1 reveal + $3 work); everything else = "coming soon" — and returns as **per-lead layers/engine (#427–#429), not subscriptions**.
> **THE RULE for Move 1: DON'T DELETE. Mark not-real features "Coming soon" + grey/disable** (the #326/#334 pattern — badge + greyed + non-interactive). Code stays for Milestone 4.
> Check items off as done. Each Move ships in reviewable batches. Findings map to PRODUCT-INVENTORY #338–#431.

---

# 💰 THE MONEY MODEL — the M0 spine (LOCKED 8 Jul 2026)

> **This is the most critical M0 build.** Everything else makes the product honest; this makes it *earn*. Full economics = `docs/run-costs-and-cashflow.md` §0. Spec items = PRODUCT-INVENTORY **#420–#431**. Owners: 🤖 Claude · 🧍 founder · 🤝 both.

**The deliverable (LOCKED 8 Jul ~10pm, founder-confirmed, Fable-verified):** *"One price logic across the whole family — **per qualified lead. No subscriptions, no contracts, no order-forms.**"*

**The ladder:**
| Rung | Price | What the client gets |
|---|---|---|
| Reveal (the database) | **$1** | verified contact, theirs to work |
| + FIGSY works it | **$4 total** ($1 reveal + $3 FIGSY) | outreach, client-built sequence ≤10 steps, reply drafts, booking link |
| + Milla | **$5** | an *understood* lead (intelligence layer) |
| + Milla + Denise | **$6** | a *ready-to-send sales motion* (action layer) |
| **Vida inbound** | **$3** | qualified inbound lead (no reveal — inbound has no data cost) |
| Vida + Milla / + Denise | **$4 / $5** | same +$1 layers on the inbound engine |

**Two engines** (FIGSY outbound · Vida inbound) **× two layers** (Milla intelligence · Denise action), each layer +$1/qualified lead. **Milla split:** her per-lead intelligence layer (above) is a *different product* from her account-level VA (doc recall / ask-anything / weekly brief) — **the VA half is KEPT as a separate product, unpriced, parked M4; never billed per-lead.**

**Why:** we pay to *source* (PDL ~$0.28/record at sourcing) and *reveal* (Hunter ~$0.009). The $1 gates Hunter+visibility; PDL is policed by quotas. Full-stack $6 lead ≈ **~92% margin**; each +$1 layer ≈ 95%+ (one Haiku call over already-paid PDL data). Going all-per-lead **retires the entire subscription defect surface** (#340/#341/#342/#357/#386 → #431).

**Logged recommendations (Fable, founder-accepted):**
- **R1 — pricing marketing:** "Two engines. Two layers. One price: per qualified lead." Engine cards (FIGSY buyable · Vida coming-soon, real pricing) + layer cards (Milla/Denise +$1) + comparison FIGSY·Vida·+Milla·+Denise. **No "$X/month" anywhere.** (#430)
- **R2 — FIGSY/Denise boundary:** FIGSY owns **cold → first reply** (outreach copy + sequence live there); Denise owns **reply → close** (objections, proposals, call notes, post-call, buyer intent, urgency, chase/stop). +$1 charged once per lead at enrolment when toggled on.
- **R3 — "qualified lead" definition** *(PROPOSED — needs founder + legal sign-off in Terms, ties #413):* ICP-match + verified contact (email found + verified) + score ≥ threshold (~60). Vida = captured contact + ICP-fit + real intent, spam **never billed**. No refund on outcome.

**Feature-list guardrails (bake into all client copy — Fable verification):** "3-step sequences" → **"client-built sequences, up to 10 steps" (#426)** everywhere (FIGSY + Denise); "reply drafts for approval" only marketable **after #347/#268 ship**; soften "CRM dedup & CSV export" (#416); "GDPR/PECR compliant" needs **legal sign-off** before use (#411 discipline); Milla "company context" must reason over **already-paid PDL data — no new per-lead data buys** (protects the +$1 margin).

**The build conditions — each a small, TESTED, staging-proven PR (the careful money-path work):**
- [ ] **#420** — Umbrella: un-retire the `lead_gen` tier as the **reveal product**; wire the two-charge path end-to-end ($1 reveal + $3 work), two wallets (`credit_balance` reveals · `figsy_credits` work). 🤝
- [ ] **#421** — Atomic **`try_charge_reveal_credit`** RPC, **fail-closed** (only a hard `true` charges; refund-on-failed-reveal). Do NOT reuse the swallow-prone `increment_client_credits`. Supersedes #376. 🤖
- [ ] **#422** — **Reveal gating:** mask the email in browse; unmask ONLY after the $1 charge succeeds. 🤖
- [ ] **#423** — **Sourcing quotas** (the real leak): PDL is spent at sourcing (~$14/run) *before* any charge → cap per client/day + regen cap (#374). Not a charge-gate — a quota. 🤖
- [ ] **#424** — **Charge-once-per-lead:** per-lead idempotency + DB uniques so a lead is never charged $1 twice or $3 twice (today's guard is per-campaign, `figsy.ts:1151`). 🤝
- [ ] **#425** — **Trial credit mix:** the 20 free credits are figsy-only → a trial client can't reveal. Grant a reveal allocation so trials can experience the $1 data step. 🤝
- [ ] **#426** — **Enforce the 10-step sequence cap** (no endless sequences — founder-locked). 🤖
- [ ] **#427** — **Milla per-lead intelligence layer (+$1)** — activates on FIGSY *or* Vida qualified leads; reasons over already-paid PDL data (no new buys); charged once per lead at enrol when toggled. Separate from the account-VA Milla (parked M4). 🤖
- [ ] **#428** — **Denise per-lead action layer (+$1)** — reply→close scope (R2); FIGSY keeps cold→reply. 🤖
- [ ] **#429** — **Vida inbound engine ($3 + add-ons)** — qualifies inbound vs ICP, scores, spam-guard (never bill spam), same +$1 layers → $4/$5. 🤖
- [ ] **#430** — **Pricing page "two engines, two layers" redesign (R1)** — client-facing, **preview-first**; supersedes the #419 rework note. 🤖
- [ ] **#431** — **Retire agent-subscription billing** — reframes #340/#341/#342/#357/#386 to "delete the machinery"; ties #26. 🤝

### 🧩 Agent layer feature specs (#427 Milla · #428 Denise · #429 Vida) — founder-locked 8 Jul
> These feature sets are the **build spec** for the per-lead layers/engine AND the **content to surface** on product pages (#405), pricing + comparison (#430) and portal agent screens (#406), **website + portal**. **Honesty rule:** Milla/Vida/Denise are coming-soon (M4) → shown as **"coming soon" capabilities + intended +$1 / $3 pricing** (greyed layer/engine cards), NOT dressed as live until #427–#429 ship.

**Milla — lead intelligence layer · +$1/qualified lead** — *positioning: "turns a qualified lead into an **understood** lead" (not "AI that answers questions").*
- Explains why this lead is a fit · matches lead to the right product/service · identifies likely pain points · suggests the best outreach angle · pulls company context into the lead card · source-backed reasoning · "what to say to this lead" notes · highlights similar past wins / converting patterns · flags weak-fit / risky leads before outreach · suggests which offer/message to use.
- ⚙️ **Guardrail:** reasons over the **already-paid PDL record — no new per-lead data buys** (protects the +$1 margin). Activates on FIGSY **or** Vida qualified leads.
- 🔀 **Milla split:** the account-level VA (doc recall · ask-anything · weekly brief) is a **separate product, unpriced, parked M4** — never billed per-lead. These per-lead features are the layer.

**Denise — sales action layer · +$1/qualified lead** — *positioning: "turns a qualified lead into a **ready-to-send sales motion**" (not "AI that writes emails").*
- Suggests next best action · generates objection replies · prepares call notes · writes proposal intro/context · creates post-call follow-up drafts · summarises buyer intent · recommends urgency level · flags deals that need chasing · suggests when to stop following up · turns Milla's insights into actual sales copy.
- 🔀 **R2 boundary:** the founder's list also had "writes the first outreach message" + "3-step follow-up pack" — those are **FIGSY's** job (cold → first reply). **Denise = reply → close only.** Don't duplicate FIGSY's outreach in Denise.

**Vida — inbound qualification engine · $3/qualified inbound lead (+$1 Milla / +$1 Denise → $4/$5)** — *positioning: "turns website & WhatsApp visitors into **qualified leads**" (not "AI chatbot").*
- Website chat widget (live-capable) · **WhatsApp inbound (coming-soon, #360 — per-client number not built)** · qualifies inbound against the same ICP rules · captures name/company/email/phone/need · scores 0–100 · detects urgency & buyer intent · **filters spam / bad-fit (never billed)** · summarises the conversation · suggests the next best reply · routes hot leads for immediate follow-up · adds booking link when appropriate · pushes qualified inbound to CRM/export · hands off to Denise (action) + Milla (context).
- ⚙️ **Guardrail:** billed only on **qualified** inbound (spam-guard + the "qualified" definition R3); LLM cost lands on all traffic → qualify-rate is the margin lever.

**Where it must appear (client-visible, both surfaces):** product pages `virtual-assistant.html` (Milla) · `denise.html` · `chatbot-agent.html` (Vida) + `figsy.html` (#405) · pricing "two engines, two layers" + comparison FIGSY·Vida·+Milla·+Denise (#430) · portal agent screens (#406). All preview-first (§11).

**Also wire the wording to match (client-facing → preview first, §11):** un-retire the $1 tier on website + portal billing (#394) · Terms §5 rewritten to the two-charge reveal+work model, no-reply refund residue deleted (#413) · usage "$1/lead overage" panel becomes the REAL reveal charge, not a fake (#385).

**Portal — confirmed:** the non-FIGSY agents (Milla/Vida/Denise/Tony) are disabled with the **same "coming soon" + grey principle as the website** — see Move 1b (🟠 COMING-SOON block) / inventory #406. No new decision needed; it's already scoped, just not yet built in code.

---

# ▶ MOVE 1a — WEBSITE SWEEP (`apps/website/*.html` + `apps/landing`) · 62 pages

**Global claims to hunt on EVERY page** (reword/remove wherever they appear): "250M+ contacts" (#366) · "handles replies autonomously" (#403) · "books meetings into your calendar" (#361) · Apollo-as-source, incl. the **legal sub-processor lists** → PDL+Hunter (#407 internal / **#410** legal pages) · POPIA/SA-only framing · **ALL speed/time promises + any "guarantee" wording — DELETE, unproven (#411):** "first leads in 10 minutes / 7 days", "first campaign live in 5 business days", the "5-day launch guarantee" card, and the 90-day guarantee residue (#348).
> **⚠️ $1 FLIPPED (#394):** "$1 per lead" is **no longer a claim to remove — it's the REVEAL tier, restored.** Under the LOCKED two-charge model $1 reveals a lead + $3 works it = $4. So on client-facing pages, **add the $1 reveal step back** (before $3), don't delete it. See the MONEY MODEL section above.

## Agent pages (heaviest work)
- [ ] **figsy.html** — ⭐ KEEP (the product we sell). Reword: "books meetings/calendar" → "booking link in every email" (#361) · "handles replies autonomously" → "drafts replies for your approval" (#403) · "250M" → "targeted, verified contacts" (#366) · LinkedIn "sends" → "coming soon" (#388) · soften "CRM dedup & CSV export" bullet (#416).
- [ ] **Stripe checkout copy** — `packages/shared/src/constants/index.ts:29` product description repeats "handles replies + meeting booking" (false) → reword to honest FIGSY scope (#414). *(code, not a page — but a client-facing claim at the point of payment.)*
- [ ] **virtual-assistant.html (Milla)** — COMING-SOON the connectors: remove/label the "✓ HubSpot synced ✓ Gmail connected" mock (#395); keep the real "daily brief + ask about your data" framing.
- [ ] **chatbot-agent.html (Vida)** — COMING-SOON: "learns your business / no hallucinations / upload docs" (#362) + "connect your WhatsApp Business number" (#360). Keep only "website chat widget."
- [ ] **denise.html** — COMING-SOON: "trained on your closed-won deals" + "confirms booked meetings / notetaker" (#396). Keep "drafts proposals/follow-ups, you send."

## Core marketing pages
- [~] **index.html** — ▸ *Batch 1 merged:* pricing section → one FIGSY product; FIGSY CTA → `/login` (#990). *(The homepage 5-card + Tony + coming-soon-badge change was **reverted in #993** — wrong for the front page.)* *Remaining:* global claims sweep, speed promises (#411), **$1 reveal tier to ADD BACK before $3 (#394 flipped — see Money Model)**, **two agent-section redesigns: top card grid → 3D carousel (#417)** *(Tony's 5th slide ⏸ on `tony-cut.png`)* + **lower "It takes a village" → orbital selector (#418)**.
- [~] **pricing.html** — ✅ *Batch 1:* collapsed 3 same-price tiers → one FIGSY product; bundles kept ($3 · 20/40/100); Milla/Vida/Denise add-ons → "coming soon" greyed; removed compare-all-plans table + Monthly/Yearly toggle; FIGSY CTA → `/login`. ✅ *Batch 2:* 90-day guarantee removed → true trust signals (#348). ▸ *Next:* **"The family" layout + full feature-comparison table (#419)** — 4 agent cards side-by-side (FIGSY buyable; Milla/Vida/Denise greyed intended price + coming-soon) + comparison matrix; soften CRM/CSV bullet (#416).
- [ ] **about.html** · [~] **story.html** *(Batch 1: coming-soon badges on Milla/Vida/Denise cards)* · [ ] **values.html** · [ ] **solutions.html** · [ ] **use-cases.html** — review each for the global claims + agent name-drops → coming-soon where not FIGSY.
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
- [~] **terms.html** — ✅ *Batch 2:* 90-day guarantee (Section 5A + TOC + cross-refs) removed (#348). *Remaining:* §8 names **Apollo/250M** as sub-processor → PDL+Hunter (#410); any 5-day/speed wording (#411); **⚠️ §5 CRITICAL — rewrite the credit-consumption clause to the LOCKED two-charge model ($1 reveal consumed at reveal · $3 work consumed at enrolment); DELETE the "no-reply / do-not-consume" refund residue that as-written entitles a refund on nearly every lead (#413).**
- [ ] **privacy.html** · [ ] **dpa.html** · [ ] **dpa-us.html** — review; POPIA→global privacy where relevant.

## Tools / lead-magnets / misc
- [ ] **small-business-playbook.html** — bundle/pricing math → the two-charge model ($1 reveal + $3 work = $4); $1 is VALID now, not residue (#394 flipped).
- [ ] **playbook.html** · [ ] **prompt-library.html** · [ ] **pipeline-calculator.html** — review claims/numbers.
- [ ] **partners.html** — partner program → "coming soon" (payouts are manual #398).
- [ ] **demo.html** · [ ] **demo-video.html** · [ ] **figsy-video.html** · [ ] **platform-video.html** · [ ] **platform-video-standalone.html** — review what the videos show vs reality; steer demos to FIGSY only.
- [ ] **solutions.html** (if not covered above) · [ ] **the-drop.html**

## 🟠 `apps/landing` (separate app — may be deployed; sells the $1 tier)
- [ ] **landing/index.html** — sells "$1 per qualified lead · from $20" (#394). **$1 is now VALID (reveal tier)** — align it to the two-charge model ($1 reveal + $3 work = $4), don't strip the $1. Confirm the app is deployed first.
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
- [ ] **usage** — the "$1/lead overage" panel becomes the **REAL reveal charge** (wire it to the live $1 reveal ledger), no longer a fabricated panel (#385 flipped — it's now the truth, not a lie to delete).
- [ ] **settings** · [ ] **config** — verify toggles do what they say (the #326 "Soon" pattern already partly here).

## 🔍 REVIEW / hide
- [ ] **v2** (preview screens → keep hidden) · [ ] **whats-new** · [ ] **documents** · [ ] **deliverability** (redirect) · [ ] **mcp** · [ ] **proposals** (#412 — Denise-adjacent; keep as FIGSY→you-send, or coming-soon)

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
- [x] **Rebuild FIGSY unit economics for the real PDL + Hunter prices (#415 — RESOLVED 8 Jul).** Costed on the real contracts (Fable-verified): PDL Full ~$0.28/record at sourcing · Hunter ~$0.009/reveal · AI+Resend ~$0.06 → **~$0.36/fully-worked lead, ~91% margin at $4** ($1 reveal + $3 work). The sourcing-vs-revenue mismatch is real and handled by **sourcing quotas (#423)**. Full model = `run-costs-and-cashflow.md` §0. *Remaining = the money-path CODE build (#420–#426), not the economics question.*

## Sell
- [ ] Everything above green → sell FIGSY to ONE client → watch it work.

---

**M0 is DONE when:** every box above is checked, **the money model (#420–#431) is built, tested and staging-proven**, each Move-2 fix has a regression test, and Move 3 is proven on staging. *(Progress mirrored in PRODUCT-INVENTORY dots #338–#431; this doc is the working punch-list.)*
