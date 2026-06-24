# ⚙️ K.I.N.D — THE APOLLO ENGINE (outbound OS → FIGSY)

> **What this is:** the playbook we learned from auditing Apollo's full platform (their API is the documentation), turned into the spec for how FIGSY should source, sequence, send, and optimise outbound. **Apollo the *vendor* is optional/BYOK; Apollo the *playbook* is free and is what makes FIGSY's sequences actually convert.**
>
> **Status of record → PRODUCT-INVENTORY** (epic **242** Apollo Outbound OS → FIGSY · **243** data-source router + BYOK · **244** PDL/Hunter lead-source test). This doc holds the detail; the dots live in the inventory.
>
> **Last-checked: 24 Jun 2026** · stale-after: when item 242/243 ships, or Apollo's deck/Zoom transcript lands. *(Living sub-doc — reconcile when 211/212/139/140/103 change, per RULEBOOK §10 + DOC-MAP.)*

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

## 4. TEST PLAN — PDL/Hunter without Apollo (item 244)
- **Built:** a read-only admin diagnostic `GET /engine/leads/test` (admin-key gated, `?key=` browser-openable) — runs **PDL discovery** for a sample ICP + the **Hunter/Clearbit waterfall** on one lead; returns the leads + per-lead **source label** + email-validity. **Apollo not touched, no sends.** Needs `PDL_API_KEY`/`HUNTER_API_KEY` (in Railway, item 104).
- **Run it:** `https://api.get-kind.com/engine/leads/test?key=<ADMIN_SECRET_KEY>` → judge: do PDL leads have real titles/geo + deliverable `work_email`? what `email_status`? does the waterfall recover an email + which source?
- **Then:** take a handful of those emails through verification (Hunter verify / mail-tester) to measure **bounce risk before they touch the warmed domain** — untested lists can torch deliverability.

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
