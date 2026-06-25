# ⚙️ K.I.N.D — THE APOLLO ENGINE (outbound OS → FIGSY)

> **What this is:** the playbook we learned from auditing Apollo's full platform (their API is the documentation), turned into the spec for how FIGSY should source, sequence, send, and optimise outbound. **Apollo the *vendor* is optional/BYOK; Apollo the *playbook* is free and is what makes FIGSY's sequences actually convert.**
>
> **Status of record → PRODUCT-INVENTORY** (epic **242** Apollo Outbound OS → FIGSY · **243** data-source router + BYOK · **244** PDL/Hunter lead-source test). This doc holds the detail; the dots live in the inventory.
>
> **Last-checked: 25 Jun 2026** · stale-after: when item 242/243 ships, or Apollo's deck/Zoom transcript lands. *(Living sub-doc — reconcile when 211/212/139/140/103 change, per RULEBOOK §10 + DOC-MAP.)* · **25 Jun: §3A aggregator research (→BetterContact) · §3B data-sources action (3→more, Clay re-look, better-process) · §3C sequences VITAL flag (rebuild 212).**

---

## 0. THE DECISION CONTEXT (24 Jun)
- **Apollo reseller = APPROVED, under evaluation.** Entry tier = a **basic starter pack ~$7,500/yr** — being weighed, **not committed**.
- **How we run NOW (no $7,500):** data via **PDL + Hunter** (untested → item 244 tests it); the Apollo **playbook below is adopted into FIGSY regardless**; Apollo stays **BYOK** (clients bring their own key) / a parked lever.
- **Source-labeling (Ali's reseller term):** *if* we activate the reseller, leads surfaced under a client must show their data source (PDL/Hunter/Apollo). **Disintermediation risk** (clients can go direct). **DECISION:** we are **not** required to expose source for PDL/Hunter (Apollo-only obligation) → **keep the source server-side, never shown to clients.** `enrichment.ts` already stamps a `source` field internally — we control its visibility. Revisit only if Apollo is activated (a reason to keep Apollo BYOK/optional, not our default surface).

---

## 1. THE 6-STAGE OUTBOUND OS (what Apollo runs — and we should)
**TARGET → ENRICH → SEQUENCE → SEND → MEASURE → OPTIMISE.** We have 1–3 partially; 4–6 are the gaps.

### ① TARGET — *timing signals, not just firmographics*
Apollo's search is rich + **free** (no credit). The lesson: filter on **intent/timing**, not static traits.
- `organization_headcount_growth_range` (+ window months) — growing now.
- `organization_job_posted_at_range` + `q_organization_job_titles` + the **Organization Job-Postings** endpoint — hiring for the role you sell to.
- `person_days_in_current_title_range` — new-in-role (≤90d = buying mode).
- funding stage/amount/**date**, `revenue_range`, department headcounts, NAICS/SIC, tech-stack (using / **not** using), `total_yoe`, `market_segments`.
- **K.I.N.D today** (`apollo.ts`): titles/seniority/size/geo/industry + a few intent tags only.
- **→ build:** add these timing filters to the ICP builder = **item 139** made concrete (growing + hiring + new-in-role + recently-funded = the warm list).

### ② ENRICH — *search hard, reveal narrow, status-gate*
- **Search is free; the credit is the email reveal** (1/match, 0 if not found). So filter to a qualified list, then enrich only that subset.
- **Match strength = identifiers supplied** (Apollo id > email > LinkedIn > name+domain). Names are masked in search → match-by-**id** is the reliable reveal (our `bulk_match` already does this).
- **Send only to `verified` / `likely_to_engage`** statuses.
- **Org enrichment** (revenue/funding/tech) feeds the personalised first line.
- **→ build:** formalise the waterfall (**item 140**) as filter→enrich-subset→status-gate; pull org-firmographics into personalisation.

### ③ SEQUENCE — *the proven blueprint (the biggest lesson)*
Apollo's sequence engine ships their best practice as defaults:
- **4–6 steps, multi-channel, escalating:** `auto_email → auto_email → LinkedIn view-profile → LinkedIn message → call`. Not email-only.
- **≤50-word emails** for cold — Apollo states **+23% reply rate** vs longer (range 25–85).
- **Subject ≤9 words**, concrete, single CTA, dynamic vars (`{{first_name}}`, `{{company}}`).
- **3-day spacing**; step 1 fires at wait 0.
- **Follow-ups reply in the same thread** (`reply_to_thread`, no new subject).
- **Soft LinkedIn touches** (view-profile, no message) warm between emails.
- **A/B variants ≤3 per step**; always testing.
- **AI personalised opener per recipient + generic fallback** (skip or use-generic on failure).
- **Tone** setting: Direct / Formal / Casual.
- **Create inactive → review → activate** (human gate).
- **K.I.N.D today:** FIGSY = **3-step, email-only**.
- **→ build:** this IS the rewrite spec for **item 212 (3→6-step)**.

### ④ SEND — *deliverability is operational, not magic*
- **Multi-mailbox rotation** · **send-schedules** (business-hours/weekday windows, timezone) · **per-mailbox daily caps** (`email_daily_limit`) · verify-before-enroll.
- **K.I.N.D today:** single Resend path; in-app "warmup" is only a send-cap.
- **→ build:** the **211 Engine** (Smartlead) adopts rotation + schedules + per-mailbox caps as first-class. Apollo confirms the pattern.

### ⑤ MEASURE — *the analytics engine we don't have*
Apollo exposes **55+ dimensions**: reply rate **by step, by A/B variant, by send hour/day, by ICP segment (title/seniority/industry), by sending domain/mailbox** (deliverability health), plus meetings-held, win-rate, sales-cycle, **job-change** counts.
- **K.I.N.D today:** basic open/reply (193/194); no segment/step/variant/time breakdowns.
- **→ build (part of 242):** a FIGSY performance layer — "which step/variant/send-time/ICP/mailbox is winning." How clients trust + tune the engine.

### ⑥ OPTIMISE — *close the loop automatically*
- Sort contacts by **last-opened / last-clicked / last-activity** (work the warmest first); **job-change** re-engagement trigger; A/B-winner promotion; engagement-stage progression.
- **K.I.N.D today:** scoring exists; no engagement-recency priority or auto A/B promotion.
- **→ build (part of 242):** recency-weighted prioritisation (steal **item 208**) + auto-promote A/B winners + job-change re-engagement (**item 79** + Apollo's `num_contacts_with_job_change`).

---

## 2. ENDPOINT REFERENCE (grounded from the live API contract)
| Endpoint | Purpose | Credit |
|---|---|---|
| People Search (`mixed_people/api_search`) | net-new prospecting; **no email, masked names**; 50k cap | **FREE** |
| **People Enrichment** | reveal 1 person's verified work email (id/email/name/domain/LinkedIn) | 1 / match · 0 if not found |
| Bulk People Enrichment | same, up to **10/call** | 1 / matched |
| Org Enrichment (+ bulk 10) | by domain → industry/revenue/employees/funding/phone/location | 1 / matched |
| Company Search | firmographic + intent search | 1 / request w/ results |
| Org Job-Postings | a company's live job posts (growth signal) | 1 / request |
| **Sequences** (create/update/search/add-contacts/approve/remove) | full multi-channel outbound engine, API-driven | — |
| Analytics (sync-report) | 55+ dimensions of outbound performance | — |
| Schedules · Email-Accounts · Tasks · Contacts · Accounts | sending windows · mailboxes · cadence tasks · CRM | — |

**Sequences unlock:** for BYOK/enterprise, Apollo can be the **engine** (find→enrich→enroll→send on the client's key + mailboxes), shrinking what 211 must build for that tier.

---

## 3. THE DATA ARCHITECTURE (three tiers)
| Tier | Data | Sending engine |
|---|---|---|
| **🪙 SMB (managed)** | **PDL + Hunter** (PDL returns email in-search, no per-reveal credit; Hunter backfills) | **Smartlead** (211, managed mailboxes) |
| **🏢 Mid (BYOK data)** | client's **Apollo key** (search free + enrich on their credits) | Smartlead connect-your-own |
| **🏆 Enterprise (full BYOK)** | client's Apollo key | **Apollo Sequences** — FIGSY drives their Apollo engine |

- **PDL** = the only non-Apollo **discovery** source (`pdl-search.ts`; returns `work_email`). **Hunter** = **enrichment-only** (`email-finder`; needs name+domain) — it cannot discover.
- **Data-source router (item 243):** route SMB→PDL/Hunter, BYOK→client Apollo key. The router is what would let us actually "choose PDL/Hunter" — it does **not** exist yet.

---

## 3A. AGGREGATOR RESEARCH — item 243 (web research, 25 Jun)

> **Why:** the founder's worry was "Alta claims 50+ sources, we have 3 → we're thin / risk drying up per-ICP." This research splits that worry into the two things it actually contains.

### ⚠️ The reframe (the key finding)
Clay / FullEnrich / BetterContact are all **enrichment**, not **discovery**. They take a lead you *already have* (name + company) and waterfall many providers to return a verified **email/phone**. **None of them find net-new leads matching an ICP.** So:
- **What an aggregator buys us:** a higher **email/phone fill-rate** behind our existing dedup'd waterfall — one integration = 20–150 underlying providers. This is exactly what "Alta's 50+ sources" actually *is* (a waterfall enrichment count). **We can match that claim with ONE integration.**
- **What it does NOT fix:** the **discovery** breadth (net-new African leads per ICP) — that's the genuinely scarce axis, and it's still on **PDL** (+ BYOK Apollo, + LinkedIn/Sales-Nav/web discovery later). Don't let an enrichment aggregator masquerade as a discovery fix.

### The three candidates
| Tool | Providers | Embeddable API? | Entry price | Africa-relevant edge |
|---|---|---|---|---|
| **BetterContact** ✅ rec | 20+ | **Yes — purpose-built for product embedding** (single endpoint, async + webhook) | **$15/mo** (1 credit/email · 10/phone); enterprise from $799 | **AI routing layer picks the provider by geography/industry/company-size** before spending — directly helps Africa's patchy coverage |
| **FullEnrich** (close 2nd) | 15–20+ | **Yes** — clean REST, Bearer auth, bulk async (100/req, 6000/min), webhook | $69/mo (500 cr) → $149 (2k) → $359 (6k) | Same waterfall pattern; solid docs; no explicit geo-router |
| **Clay** ❌ out for us | 100–150+ | **No public REST API for embedding** — HTTP integration is in-platform only ("the dealbreaker for product-building companies") | $185/mo → $495/mo | Most breadth, but built for in-Clay spreadsheets, not behind our product |

**Pick: BetterContact** — it wins on the only axis that matters for 243 (a clean, async, webhook-based API *designed to be embedded in a product*, same shape as our existing `enrichment.ts` waterfall) **plus** an AI geo-router that's tailor-made for Africa's thin, uneven coverage, at the lowest entry cost. **FullEnrich is the fallback** (near-identical architecture, pricier). **Clay is ruled out** — no embeddable API; its 100+ providers can't reach our product.

### Africa reality (sets expectations)
Africa is the **worst-covered region in sales intelligence** — single-provider coverage runs ~30–45% in Sub-Saharan markets; combining providers is "the difference between a usable list and an empty spreadsheet." So a waterfall **matters more here**, not less — but it only lifts fill-rate on leads we already discovered. For **discovery depth** in NG/ZA/KE the real levers (separate spend decision, not this aggregator): keep **PDL**, evaluate **Apollo (BYOK)**, and the premium ZA/NG direct-dial sets (**Cognism**, human-verified **SalesIntel**) if a client's ICP demands it.

### Recommendation for the 243 build
1. **Integrate BetterContact** as one more stage at the **end** of the existing dedup'd waterfall (`enrichment.ts` already stamps a server-side `source`) — only fires when PDL+Hunter miss, so credits are spent sparingly. Source stays **server-side, never shown to clients** (disintermediation decision, §0).
2. **Don't** treat it as a discovery fix — log the discovery gap as the next, separate lever.
3. **Gate on the item-244 test result first:** if PDL+Hunter already clear ~70%+ deliverable on a real African ICP, BetterContact is a thin top-up (start on the $15 tier). If they come back thin, BetterContact moves up the priority list.

*Sources: Clay/FullEnrich/BetterContact pricing + API reviews (SyncGTM, Landbase, Prospeo, Cleanlist, Deepline), FullEnrich + BetterContact API docs, SyncGTM "Best B2B Databases for Sub-Saharan Africa," Cognism vs Apollo (2026).*

---

## 4. TEST PLAN — PDL/Hunter without Apollo (item 244)
- **Built:** a read-only admin diagnostic `GET /engine/leads/test` (admin-key gated, `?key=` browser-openable) — runs **PDL discovery** for a sample ICP + the **Hunter/Clearbit waterfall** on one lead; returns the leads + per-lead **source label** + email-validity. **Apollo not touched, no sends.** Needs `PDL_API_KEY`/`HUNTER_API_KEY` (in Railway, item 104).
- **Run it:** `https://api.get-kind.com/engine/leads/test?key=<ADMIN_SECRET_KEY>` → judge: do PDL leads have real titles/geo + deliverable `work_email`? what `email_status`? does the waterfall recover an email + which source?
- **Then:** take a handful of those emails through verification (Hunter verify / mail-tester) to measure **bounce risk before they touch the warmed domain** — untested lists can torch deliverability.

---

## 3B. DATA SOURCES — 🎯 THE FOCUS (founder, 25 Jun): use ALL sources to penetrate Africa DIRECT

> **Founder directive (sharpened 25 Jun):** *"We need a way to penetrate Africa OTHER than partners. That's why I referenced the other data sources — Clay, ZoomInfo, and many more. We need to use ALL. This is a focus."* **Status of record → PRODUCT-INVENTORY item 243** (the trackable focus). **Do NOT duplicate into a new item.**

### The strategic shift
**Africa is no longer partners-only.** Stacking **every** data source in a waterfall is the lever that lets us run **our OWN outbound into Africa** — partners then cover relationships + whatever data can't reach. So the data layer powers **direct outreach everywhere** (US/EMEA *and* Africa) and is specifically the **Africa-direct unlock.** Honest ceiling: most providers are US/EU-weighted, so even fully stacked Africa stays thinner than the US — **go as far as data takes us direct, partners pick up the residual.** (244 proved African data is real, not empty: 1,360 SA founders on PDL alone.)

### Where we are
- **We have 3:** Apollo (BYOK) · **PDL** (discovery — verified working, 244) · **Hunter** (email enrichment).
- **Coverage math (sourced):** a single source covers ~40–60% of a list; a **waterfall** of several pushes it to **80%+**. With 3 we leave a lot on the table — and risk drying up per-ICP, exactly the founder's worry.

### Use ALL — the source list + how each comes in
- **Wire into the product (API):** Apollo (BYOK) · PDL · Hunter · **Cognism** (EMEA + verified mobiles) · Clearbit · Lusha · RocketReach · **Proxycurl** (LinkedIn discovery) — behind the existing dedup'd waterfall.
- **One integration = 20+ at once:** **BetterContact** (embeddable async/webhook aggregator) — the fastest way to "many sources" (§3A).
- **ZoomInfo** — strongest raw coverage but **enterprise contract (~$15–40k/yr, annual)** → a cost decision, not a quick wire. Park until the spend is justified.
- **Clay** — 150+ providers but **no embeddable API** → use as **our internal list-builder** (pull max-coverage Africa/US lists now) **+ the blueprint** for our waterfall ordering/validation logic.

### Clay — the fresh look (25 Jun)
- **What Clay is:** an **orchestration layer** over **150+ data providers** (marketplace; ~75+ core integrations) with built-in **waterfall**. It is the reference for "many sources from one place."
- **Why we still can't *embed* it:** Clay has **no public REST API** for calling from inside our product (confirmed again). So Clay is **not** our in-product engine. *(BetterContact/FullEnrich remain the embeddable waterfall options — §3A.)*
- **How Clay can still help us — two real uses:**
  1. **As OUR internal tool** (not embedded): run Clay ourselves to **build + enrich our own US/UK outreach lists** (the 🅱️ fast-cash track) — fastest way to a high-coverage list today, no build.
  2. **As the blueprint to copy:** Clay's waterfall *ordering + validation + fall-through* logic is exactly what our `enrichment.ts` waterfall should do across more providers.

### The action — add sources behind our waterfall (extends 243)
Candidate providers to add behind the existing dedup'd waterfall (sourced shortlist):
- **Cognism** — EMEA depth + GDPR + verified mobiles (the US/EMEA direct track).
- **Clearbit · Lusha · RocketReach · Proxycurl (LinkedIn) · Crunchbase** — email/phone/firmographic fill + LinkedIn discovery.
- **An embeddable aggregator (BetterContact)** = the single-integration way to get 20+ at once (§3A recommendation).
**Sequence:** (1) wire the **email-reveal** step the 244 test proved we're missing (PDL Enrich/Hunter/BetterContact) → (2) add 1–2 discovery sources for breadth (Proxycurl/LinkedIn + a regional one) → (3) a **source router** (SMB→PDL/Hunter · BYOK→Apollo · EMEA→Cognism), source kept server-side.

### Better the process (data pipeline) — using the 244 findings
The 244 test proved **discovery works (PDL), email-reveal is the gap**. So the pipeline should be:
**discover (PDL/Proxycurl) → dedupe → REVEAL email via waterfall (Hunter→BetterContact→Clearbit, stop on first valid) → verify (bounce-check before the warmed domain) → status-gate (only campaign verified).**
🐛 **Fix in the build:** `waterfallEnrich` currently takes PDL's boolean `work_email` as if it were an address instead of falling through to the next provider — fix so it only accepts a real string and cascades otherwise.

*Sources (25 Jun): clay.com (waterfall + marketplace), lelab0/Cleanlist (Clay provider counts), Apollo/Amplemarket/Findymail (waterfall coverage 40–60%→80%+), Cognism (EMEA DaaS).*

---

## ⚠️ 3C. SEQUENCES — VITAL LEARNING (founder flag, 25 Jun): "our sequences are not great"

> **Founder, flagged loud:** our current FIGSY sequences are weak. The Apollo doc's §1③ blueprint is the fix. **This is high-leverage — a better sequence lifts reply rate on every lead we already pay to source.** Status/action → PRODUCT-INVENTORY **212** (rewrite) + **242** (analytics/optimise); execution → LAUNCH-PAD.

**What "good" looks like (the blueprint to rebuild 212 to):**
- **4–6 multi-channel steps** (email + LinkedIn), not a couple of generic emails.
- **≤50-word emails** (short copy = measurably higher reply), **one clear ask** per email.
- **In-thread follow-ups** (reply on the same thread, not new sends).
- **A genuinely personalised opener line** (one researched detail > five polished paragraphs).
- **A/B variants** per step + **timing/intent** targeting (ties 139).
- **An analytics + optimise loop** (242): reply-rate by step/variant/time/segment/domain → promote winners, drop losers, re-engage job-changers.

**Why it's vital now:** the two-track plan runs on outreach (our own US/UK machine + clients'). Deliverability gets the email *seen*; the **sequence** is what gets a *reply*. Weak sequences waste every warmed inbox and every sourced lead. **Rebuild 212 to this blueprint before we scale sends.**

---

## 5. THE PLAN (build order)
1. **Rewrite item 212** = the §1③ sequence blueprint (highest leverage — the core product gets measurably better). Freeze-safe as spec/design first.
2. **Sharpen 139** = warm-timing targeting filters.
3. **Formalise 140** = filter→enrich-subset→status-gate + org-firmographic personalisation.
4. **Fold into 211** = mailbox rotation + schedules + per-mailbox caps.
5. **242 analytics layer** = reply-rate by step/variant/time/segment/domain (needs volume → after engine hot).
6. **242 optimise loop** = recency-sort + A/B-winner promotion + job-change re-engagement.
7. **243 data-source router + BYOK**; **244 PDL/Hunter test** (built — verify on Railway).

**Pending from Apollo's deck/Zoom:** API **rate limits** + reseller **per-credit price** → tune tier-④ economics + the keep/narrow/drop call on the $7,500 starter pack. Does not block this product plan.
