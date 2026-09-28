# How each idea would be built: 5 concept control rooms, 40 sections

> **What this is.** On 28 Sep the founder asked for his five concept pages to be logged exactly as they are, and for a report on how each section would be built. This file is that report. The pages are kept **byte-for-byte** beside it, with a screenshot of every tab in [`2026-09-28_ideas-screens/`](./2026-09-28_ideas-screens/).
>
> **Every section is 🔴 not built.** Nothing here is a decision or a plan of record. It is an idea plus a build assessment. Status of record lives on the Board (R85a).
>
> **How it was checked:** read-only against `origin/main` `d1d652886`. Each tab was read in full, the text matched against the screenshot, and the code searched for what exists. Every "exists today" item is **code verified**. Nothing was checked against the live site.
>
> **Sizes:** **S** = one PR (days) · **M** = 2–4 PRs · **L** = 5+ PRs or a new provider/integration.

| Page (source file) | Tabs | Screens |
|---|---|---|
| 1 · Milla expansion & coaching, [`2026-09-24_milla-expansion-and-coaching_control-room-rebuilt.html`](./2026-09-24_milla-expansion-and-coaching_control-room-rebuilt.html) | 4 | `1-control-room-rebuilt_01..04.png` |
| 2 · Glean ideas, [`2026-09-24_glean-ideas_control-room.html`](./2026-09-24_glean-ideas_control-room.html) | 6 | `2-glean-ideas_01..06.png` |
| 3 · Context Engine, [`2026-09-25_context-engine_control-room.html`](./2026-09-25_context-engine_control-room.html) | 10 | `3-context-engine_01..10.png` |
| 4 · CRM Intelligence, [`2026-09-25_crm-intelligence_control-room.html`](./2026-09-25_crm-intelligence_control-room.html) | 10 | `4-crm-intelligence_01..10.png` |
| 5 · Social Intelligence, [`2026-09-25_social-intelligence_control-room.html`](./2026-09-25_social-intelligence_control-room.html) | 10 | `5-social-intelligence_01..10.png` |

---

## Rules that apply to every section

These rules are already locked. Each was checked in `docs/PRODUCT-RULES.md`.

- **R167, 25 Sep: no UI redesign; a new screen waits for the founder.** Almost every section is drawn as a new screen. Each one either fits inside a screen that already exists or needs the founder's GO for a new one.
- **R161 / R171 (25 and 28 Sep): Milla and Vida stay in step both ways.** Anything shown on one side must update on the other.
- **R141 (23 Sep): qualified meetings.** Every meeting number must be the qualified count.
- **Protocol rule 21 (CLAUDE.md): MEETING_BOOKED is the hard outcome boundary.** Anything past a meeting (opportunities, revenue) needs the founder to widen it.
- **R146 (23 Sep): Apollo is the only data provider.**
- **R35 (12 Aug): email is the outreach channel.**

---

## 1 · Milla expansion & coaching (24 Sep)

> ⚠️ This page is dated the day **before** R166 (pricing) and R167 (no redesign). As drawn, it breaks three locked rules:
> - It shows **"prospects remain"** and **"add 650 prospects → +4 meetings"**. R136 ③ never shows the client the pool, the rate or the limit, and the test `client-ceiling-never-disclosed.test.ts` enforces it.
> - It shows **"£55K–£140K pipeline value"**. R87 says: do not invent revenue or ROI.
> - It uses **£**, but prices are in USD.

| # | Section | What it shows | Exists today | How to build | Size | Blocked by / decision | Status |
|---|---|---|---|---|---|---|---|
| 1.1 | 25% trigger (first expansion moment) | Milla: *"You're now quarter through your programme"*. 3/12 meetings, 11 positive replies. A strip of expansion moments at 25/50/75%, and an offer of +4 meetings with an illustrative value. | The Results panel (`ProgrammeWorkspace.tsx`, `ProgrammeOutcome.tsx`) and the client's own figures (`programmes.calculator_assumptions`). No trigger, no offer record, no way to add meetings. Only one open programme is allowed per client. | New table `programme_expansion_offers`. A job fires once at each threshold. An accept path either (a) raises the target and charges only the extra meetings at the band price, or (b) queues the next programme. One card inside the Results panel, never showing the pool. Vida shows offer state. An `expansion_offer` email. | L | Founder: expand the running programme or queue the next one? Is a proactive offer allowed (R69 "don't tell them to buy more")? Show any value figure at all? Slack/WhatsApp to clients? | 🔴 |
| 1.2 | 50% trigger (mid-programme offer) | Same layout at 6/12, 21 replies, offer of +8 meetings. | As 1.1 | The 50% setting plus its own wording, once 1.1 exists. | S | 1.1. How is "+N meetings" sized, without using the pool? | 🔴 |
| 1.3 | 75% trigger (continuation before Complete) | Same at 9/12, 31 replies, offer of +10: *"the final pre-completion expansion option"*. | As 1.1. Next-programme wording in Vida (`vida-lifecycle-copy.ts`); shortfall credit as wallet credit. | The 75% setting. Accepting uses any wallet credit (R166 ⑤: once only, 90 days). | S | 1.1. Apply the credit automatically? | 🔴 |
| 1.4 | Milla Coaching (second core product) | *"A second core product… higher-value retainer"*: meeting prep, opportunity strategy, objection support, follow-up coaching, deal reviews. | A free meeting-prep brief (M9): `milla/coaching/page.tsx`, `POST /leads/coaching/:leadId/brief`. No paid coaching, no price, no deal reviews. | A coaching plan per client, a named operator, sessions and deal reviews tied to meetings. A price constant in `@kind/shared`, a checkout, deal-review AI built on the M9 brief. Extend the existing Coaching page, plus a coaching queue in Vida. | L (card alone: S) | R39: coaching is the paid P2, "never monthly, usage based", while the page says "retainer". #608: sell before you build. Founder: price, monthly or per use, who the operator is, and does M9 stay free? | 🔴 |

**Order:** founder rulings → 1.1 engine (the payment path last, in its own PR) → 1.2 and 1.3 → 1.4 once a price and a real buyer exist.

---

## 2 · Glean ideas (24 Sep)

| # | Section | What it shows | Exists today | How to build | Size | Blocked by / decision | Status |
|---|---|---|---|---|---|---|---|
| 2.1 | Milla Home: next action + AI activity | A "Today" panel. Next best action: *"Prepare for tomorrow's 2 meetings"* (Open meeting brief / Ask Milla why). "What M&V is doing now" progress bars (FIGSY 43/63, Milla 7/17 openers, Vida 12 replies), memory chips, 6/10 meetings, Needs you 0. | Milla Home's four cards; `nextActionFor()` (`ProgrammeWorkspace.tsx`); meeting briefs (`/leads/coaching/:leadId/brief`); `automatic-work.ts` records every job the system starts by itself. | One read-only `GET /milla/activity` (open jobs, sourcing progress, drafting, reply counts; unknown never shown as 0). An activity card plus a "meetings tomorrow" action inside the existing panel. | M | R167 (adds to an existing screen). R141 (qualified meetings). | 🔴 |
| 2.2 | Multiplayer team workspace | A group chat: Priya (Founder), Alex (Sales Director), Milla, Vida. Milla turns a request into a ranking signal and assigns tasks (Running / Waiting for Alex / Remembered). | `client_members` and the invite flow (`routes/team.ts`, `/milla/teams`), **but only the team page reads it**. Every other route finds the client by the owner's login, so an invited teammate sees nothing. Chat messages have no author. | One "which client does this user belong to" function used by every route, with role checks. Add an author to messages, a `programme_tasks` table, row-level security. Author on chat bubbles, a task list, and who approved what in Vida. | L | #2164 (parked post-launch). Founder: which roles may approve or pay? One shared chat, or one each? Risk: one missed route leaks one client's data to another. | 🔴 |
| 2.3 | Living Memory profile | A Profile screen reading out what M&V remembers: ideal customer, strong-prospect signals, messaging preference, meeting learnings. *"Same memory, every surface"*. "20+ employees from now on" leaves the live programme unchanged. | A versioned brief (`meeting_briefs`, `lib/meeting-brief.ts`, `GET/POST /milla/brief`), **unused by any screen**. `onboarding_brief_drafts` is read by Milla and Vida. Also `nexus_profiles`, `icps` versions, `figsy_knowledge`, `lead_feedback`. | Mostly reuse. Add a "from now on vs this programme" flag and a history read. A read-out card with edit (writes a new brief version) in Milla, the same card read-only in Vida. | M | R167. Founder: a new Profile item, or a card in My ICP? | 🔴 |
| 2.4 | Vida AI routing + cost control | Tasks today 2,814, high-reasoning 4.2%, context reuse 78%. Routine vs escalated routing. $18.42 today, $2.31 per client, cache saved 31% (illustrative). | Two fixed models (`lib/models.ts`, R122a). **No token or cost tracking**; 87 separate places call the AI directly. `model_runs` was designed, then moved post-launch (R58, #686–#696). | One wrapper around every AI call that records model, tokens and cost to `model_runs`, never blocking the work. An AI cost page in Vida under System. | M (tracking) / L (auto-routing) | R58 post-launch. R122a (moving work to the stronger model is the founder's cost call). | 🔴 |
| 2.5 | Slack + Glean integrations | "Slack connected, #growth". Alex approves prospects from Slack. Email connected, WhatsApp soon, Glean *"research only, not a second memory"*. | Slack only mirrors founder alerts (`alerts.ts`). Signed outgoing webhooks exist (`lib/webhooks.ts`, 4 events). No Glean. | A `slack_installs` table (encrypted token), Slack sign-in, notification rules, and a signed endpoint for Slack button clicks that calls the existing approval route. A Slack tile in Milla, install status in Vida. | L | R166 (one approval per programme, not per prospect). Glean needs a cost and permissions study. Founder: which moments go to Slack? Drop Glean for now? | 🔴 |
| 2.6 | Website live proof + customer stories | *"Proof, not promises"*: a counter (2,486 meetings, DEMO), 184 this month, 38 active programmes, and two placeholder quotes. | Static website, founder-locked (#605, `website-freeze.test.ts`). `GET /stats/platform` is live but unused; it counts demo and House accounts and turns errors into 0. No stories page. | Rewrite the stats route to count **qualified** meetings, excluding demo and House, and return "unknown" on failure. A counter block and stories section with a truth test. | M | Website freeze. Real approved quotes. Founder: qualified or booked? Show a number at all while volume is small? | 🔴 |

**Order:** 2.1 → 2.3 (its backend is already built) → 2.4 tracking only → 2.6 once real numbers and quotes exist → 2.5 after a ruling on approvals → 2.2 last.

---

## 3 · Context Engine (25 Sep)

| # | Section | What it shows | Exists today | How to build | Size | Blocked by / decision | Status |
|---|---|---|---|---|---|---|---|
| 3.1 | Context Home (one client, one context) | *"One client, one context, many systems"*: 9 connected systems, 4,812 identity matches, 126 live signals, 7 plays. Who? Why now? What next? | Nothing. None of the counters has a source. | A read-only summary endpoint over 3.2–3.8, plus Milla chat answers. | S (once the rest exists) | Everything below. R167: a Home panel or chat only? | 🔴 |
| 3.2 | Connected Stack (their tech + ours) | Their CRM, email and calendar, knowledge tools (Glean/Drive/Notion), Slack/Teams and website, beside Milla, Vida, FIGSY, Plays and Nexus. "Data flows both ways." | Connected yes/no for HubSpot, Pipedrive, Google Calendar, Outlook/Zoho, WhatsApp, LinkedIn, Apollo, Stripe (`routes/integrations.ts`). CRM is a **pasted API key**. No Glean, Notion, Teams or email-history reading. | One connector per source (sign-in, token, scheduled pull, last-synced time), shown as rows in Milla Settings. | L (M per connector) | Founder: which sources first (CRM recommended)? Move from pasted keys to sign-in? | 🔴 |
| 3.3 | Identity Graph (people + accounts) | One person resolved across LinkedIn, email, CRM and calendar with a confidence level. Low confidence means "Needs review" and Vida holds the action. | Partial matching only: `acquisition_memory` (provider id and email) and `checkCrmDuplicate` (exact email or domain). No canonical person, no confidence, no hold. | `entities` and `entity_links` tables. Exact email/domain matching first. A fuzzy match raises an `identity_review` task. The send check refuses anyone below the threshold. | L | 3.2. Founder: the threshold; can a person merge records, or only rules? | 🔴 |
| 3.4 | Relationship (commercial memory) | The account's state (closed-lost on timing, 3 meetings, no owner, suppression clear, OK to reactivate) and how it changes the play. | CRM dedupe only ("does this contact exist?"), `leads.crm_existing`. Opt-outs covered (`opt_out_blocklist`, `checkSendAllowed`). A `reactivation` sequence type exists. No deal stage, loss reason or owner is read. | `account_relationship` table filled by a CRM pull. Extend the send check: open opportunity or customer means refuse; closed-lost inside the waiting window means refuse. Show the state on Vida's lead rows. | M–L | A CRM read connector. Founder: the reactivation window, and who sets it? | 🔴 |
| 3.5 | Live Intent (what changed now?) | Fresh signals for one account (hiring, new CRO, pricing-page visit, social), each with freshness and strength. "Intent is evidence, not certainty." | `agent_signals` is only our internal event log. `visitor_sessions` tracks visitors to *our* site. No hiring, job-change or social feeds. | `account_signals` table (type, source, observed, strength, expiry). One feed per paid provider, behind the paid-provider check. | L | Provider choice and cost. Same as Social 5.3–5.5. | 🔴 |
| 3.6 | Knowledge (shared client context) | Six knowledge areas: what they sell, who converts, proof, objections, client corrections, connected knowledge tools. | Most of it, in pieces: `figsy_knowledge` (7 kinds), `client-offer.ts`, `describeBriefMemory`, `lead_feedback`, `nexus_profiles.objections`. The only editor screen is switched off. No "client corrections" store. | Add a `corrections` kind. Milla saves "never contact X" or "use this wording" from chat, with an undo. Feed the knowledge into both Milla's and Vida's instructions. | M | Nothing, so it can start now. Founder: save silently, or read each one back? | 🔴 |
| 3.7 | Account Context (one contextual object) | Acme as a single object: identity, fit, relationship, intent, knowledge, allowed to contact, recommended play, confidence. | Nothing. Today's objects are leads, not accounts. | A read-only builder combining 3.3–3.6 and eligibility; every field names its source, and unknown is never "clear". Shown in Vida's open client and in Milla chat. | L | 3.3–3.6. **Strategy:** do we move from leads to accounts? | 🔴 |
| 3.8 | Recommended Play (what should M&V do?) | Milla recommends a "changed-circumstances reactivation" with reasons and confidence; Approve / Review audience / Why. Vida finds the contacts, prepares the messages and checks eligibility. | Building blocks only: the `reactivation` sequence type, Vida's tool proposals, the send check, and programme approval. | A rule-based chooser reading 3.7. A Milla card inside the programme flow. The approved audience must pass the send check and stay inside R166's sourcing and contact limits. | M–L | 3.7, 3.4, R166. Founder: is a play a new programme or a batch inside one? | 🔴 |
| 3.9 | Action Sync (stay aligned) | Outcomes written back: meeting booked, a new opportunity pauses prospecting, a "no" is remembered, a correction is inherited. | Inside M&V: the R161/R171 re-reads. To the CRM: a deal on an "interested" reply, and new leads pushed. Opt-outs are stored. **No booked-meeting or reply-category writeback, and nothing reads a newly opened opportunity.** | A writeback outbox, retried and never duplicated. A CRM poll: "opportunity opened → pause". A failed write becomes a Vida task. | M | CRM read connector. Founder: which outcomes; whose data wins? | 🔴 |
| 3.10 | Learning Loop (everything improves) | Context → play → response → meeting → CRM outcome → learning (increase / learn / reduce). | Nexus: `nexus_profiles` and `lib/nexus.ts` (reply rate, meeting rate, winning angle, persona, objections), on a Vida Nexus page. It doesn't record which play or context caused a result. | Record a play/context id on each enrolment; add results per play type to Nexus, shown in Vida's Nexus page and in Milla. | L | 3.8. "CRM outcome" crosses MEETING_BOOKED (founder). | 🔴 |

**Order:** one eligibility check → CRM read connector → 3.4 → 3.3 (exact matching first) → 3.6, which can run alongside → 3.9 → 3.7 → 3.5 → 3.8 → 3.10 → 3.1/3.2 last.

---

## 4 · CRM Intelligence (25 Sep)

> What exists today:
> - A basic **HubSpot/Pipedrive API-key** connection (`clients.crm_type`, `crm_api_key`, `lib/crm.ts`).
> - A live "already in your CRM?" check before outreach (`figsy.ts`).
> - A push of hot replies into the client's CRM.
> - A global opt-out block on every send (`send-gate.ts`).
>
> What doesn't exist: **no Salesforce, no CRM sign-in (OAuth), no sync job, and no stored CRM contacts or opportunities.** Issue #1817 (CRM history) sits under #1473 (data rights, waiting on a lawyer). R73 ② keeps CRM imports out of the shared lead pool.

| # | Section | What it shows | Exists today | How to build | Size | Blocked by / decision | Status |
|---|---|---|---|---|---|---|---|
| 4.1 | CRM Home (extended BDR team) | "Your CRM is not just a database anymore." 18,420 contacts, 4,870 companies, 147 closed-lost, 632 suppressed (demo). Protect the relationship (Always), second chances (Opportunity), react to events (Future). | Nothing. The nearest is the integrations status route. | A counts endpoint over the synced tables. A card inside an existing Milla screen, and connection health in Vida. | S (once data exists) | 4.2–4.4. R167 new screen? | 🔴 |
| 4.2 | Connect CRM (authorised sync) | Salesforce "Connected", HubSpot and Pipedrive "Available". Separate switches for contacts, opportunities, activity (limited) and write-back. "Read and write are separate authorities." | API-key connection (`PATCH /clients/me`, `POST /me/crm/test`). Read (dedupe) and write (sync) are already separate switches. **The key is stored as plain text and returned to the browser** (see "found in passing"). | **Start with HubSpot**: its contact, company and deal APIs are already used, and its OAuth and webhooks are free. `crm_connections` table (encrypted tokens, scopes, read/write flags), reusing the OAuth pattern in `lib/gcal.ts`. Connect and disconnect routes. | L | HubSpot app registration; Salesforce needs a Connected App and possibly its security review. Founder: HubSpot first? Retire API keys? | 🔴 |
| 4.3 | Database (contacts + opportunities) | 18,420 contacts indexed. Never worked 8,420, previously contacted 5,110, closed-lost 147. States: customer (protect), open opportunity (sales owns), closed-lost (analyse). | None. Only a live lookup per lead; nothing is stored. | `crm_contacts`, `crm_companies`, `crm_opportunities` (minimum fields, client-scoped). A first full sync, then a job that pulls only changes. A relationship-state function and a Vida sync log. | L | 4.2, #1473, data protection (retention, deletion). R73 ②: never enters the shared pool. Founder: how long we keep it; what happens on disconnect? | 🔴 |
| 4.4 | Suppression (never re-contact) | 632 protected. Previous "no", opt-out, customer, open opportunity. Audit: 2,500 candidates, 214 removed, 2,286 safe. | **A lot:** the global `opt_out_blocklist` (fed by replies), the send gate (fails closed), the do-not-contact floor (`suppression.ts`), and a Vida viewer. Missing: per-client exclusions, customer and open-opportunity rules, the pre-programme audit. | A `client_exclusions` table plus the CRM-derived rule inside the **one** gate (`checkSendAllowed`). A removal report per programme. | M | Founder: is a CRM "no" a global block or per-client only? | 🔴 |
| 4.5 | Closed-Lost (revival plays) | 147 closed-lost, 42 lost on timing, average 11 months old, 9 suppressed. Loss reason timing, window elapsed, new play required. | None. | Map each CRM's loss reason to our categories, add a client-set revival window, pass everything through the gate. Shown inside the programme flow. | M | 4.3, 4.4, 4.8. Founder: the window; does a revival count against R166's 5 emails per person? | 🔴 |
| 4.6 | New Plays (Milla suggestions) | Timing play (42), dormant "what changed" (31), champion moved company (future, needs verification). "One database does not mean one play." | Programme and sequence generation, with no CRM input. | Feed each group into the programme brief; the client approves through the existing approval step. | M (champion tracking L) | Founder: is a CRM play a new programme (priced under R166) or part of one? | 🔴 |
| 4.7 | Real-Time (trigger plays) | Closed-lost → queue, new opportunity → suppress, dormant activity → review, expansion → optional. "Real-time means timely, not reckless." | Generic webhook handling and duplicate-event protection only; no CRM webhooks. | HubSpot webhook subscriptions (signature-checked). "Suppress" acts immediately; everything else only queues a recommendation. | L | Founder: can a trigger ever start outreach without a fresh client approval? | 🔴 |
| 4.8 | Eligibility (safe to contact?) | One decision per person: previous "no" → block, open opportunity → block, customer → protect, unclear history → hold. 2,286 clear / 198 blocked / 16 held. | The pieces run separately: the dedupe gate at enrolment and `checkSendAllowed` at send. **No "hold" state and no decision record.** | An `eligibility_decisions` record (clear/block/hold plus reason). A Vida queue for held people; extend the existing send-paths test sweep. | M | Founder: who resolves a hold, the client or Vida? | 🔴 |
| 4.9 | Intelligence (CRM insights) | Best segment UK SaaS; top loss reason timing (32%); revival pool 42; loss-reason chart. "Recommendations, not analytics homework." | None. | Summaries worked out in advance over synced opportunities joined to meetings. Milla shows recommendations with their source (R56). | M | 4.3, 4.10. | 🔴 |
| 4.10 | Writeback (one source of truth) | Meeting booked (write), reply disposition (write), play attribution (link). "Real ROI only when the source data supports it." | A hot reply creates a contact and deal in the client's CRM; leads are pushed. `meetings` is the only record of meetings. **Meetings are not written back.** | A writeback outbox (tracked, retried) writing only approved fields; meetings come from `meetings`, never re-counted. | M | Founder: write BOOKED, or only R141 qualified? | 🔴 |

**Order:** 4.2 HubSpot OAuth → 4.4 + 4.8 one eligibility gate → 4.10 writeback → 4.3 sync → 4.5/4.6 → 4.9 → 4.7 → 4.1. Steps 2–3 can ship on today's live lookup before a full sync exists.

---

## 5 · Social Intelligence (25 Sep)

> **Platforms, honestly (general knowledge, not tested here):**
> - **LinkedIn** APIs are partner-gated. At best they give the client's own page and Lead Gen Form leads, never other people's posts, likes or profiles. Scraping is banned.
> - **Meta** and **TikTok**: the client's own business account only.
> - **YouTube**: public data, but commenters are channel names, not identifiable buyers.
>
> Only Apollo (hiring from job postings, company news) gives real "why now" signals inside R146.

| # | Section | What it shows | Exists today | How to build | Size | Blocked by / decision | Status |
|---|---|---|---|---|---|---|---|
| 5.1 | Social Home (Social Radar) | "Fit tells us who. Signals help tell us when." 186 signals (7 days), 41 target accounts, 12 strong why-now, 7 plays. Vida detects → M&V checks → Milla recommends. | Only a bare internal signal table (`agent_signals`, `routes/signals.ts`); nothing social writes to it. | A summary endpoint over the new signal table (5.3). One card in Milla Home, a count in Vida. | S (once 5.3 exists) | 5.3, 5.8. R167: card in Home, or a new Social screen? | 🔴 |
| 5.2 | Connect (authorised platforms) | LinkedIn, Instagram/Meta and YouTube connected, TikTok limited, approved providers optional. Data-authority labels: Authorised, Source shown, Contracted, Do not use. | No social connection code. `leads/linkedin` is a CSV import only. | OAuth per platform, plus a connection table carrying each connection's data-authority label. | L (M per platform) | LinkedIn partner approval, Meta app review, privacy policy and DPA updates. **Recommendation: none for v1, and say so to clients.** | 🔴 |
| 5.3 | Signal Feed (Vida detects) | Hiring burst at Acme (4 GTM roles in 10 days); a founder post about outbound; 2 contacts engaging on YouTube; a weak-signal cluster at Nova Group. | A daily 11:00 job (`/figsy/check-intent-signals`) that fires on *static* traits, not changes; its own code says it "needs a signal-source feed". `icps.settings.social_signals` is saved but never read. `leads.job_changed_at` is set by hand only. | A signal table (account, person, type, source, authority, evidence link, time). A daily job over Apollo job postings for target accounts, storing only what changed. **Drop "founder post" and "YouTube engagement": no permitted source.** | M | Whether our Apollo plan includes job postings (not checked live), and the credit cost. Founder: replace or retire the old daily job? | 🔴 |
| 5.4 | Buying Signals (why now?) | Acme: Fit Strong, Intent High, Timing Now, Relationship Known (lost 11 months ago on timing). Evidence: hiring, CRM history, eligibility clear. | ICP intent choices only shape Apollo's search filters (`apollo.ts`), with no scoring. Fit checking exists (`icp-qualification.ts`). No CRM deal history is read. | A shared scoring module with an explainable rating per signal. HubSpot/Pipedrive deal-history reads (stage, lost reason, date). Evidence only from stored rows. Shown the same in Milla and Vida. | M | Founder: sell "intent" at all while hiring is the only real signal? | 🔴 |
| 5.5 | Account Radar (cluster signals) | Acme strong why-now; Northstar worth review (5 events, 2 senior); Vertex has an open opportunity, so "do nothing, sales owns it". | No grouping by account. | Group signals by company domain; an open-deal lookup protects the account (R141 condition ⑥, shared check). | M | none new | 🔴 |
| 5.6 | Milla Plays (recommended action) | Closed-lost + hiring (42 similar); new-role intro; engaged-with-us follow-up; account cluster play. | Sequences and templates; no play chosen by signal type. | A small play catalogue matched to signal types, each turning into an **email** sequence draft for approval. | M | The "LinkedIn" channel clashes with R35, and the PhantomBuster sender breaks LinkedIn's terms (founder ruling). "Engaged-with-us" needs 5.2. | 🔴 |
| 5.7 | CRM + Social (history + intent) | Acme lost on timing 11 months ago, and hiring now → a "what changed?" reactivation. Checks: no previous "no", no open deal, source clear, the play is different. | No CRM history reads. Acquisition memory keeps everyone we paid for but never makes anyone contactable. | CRM history reads (as 5.4), plus a reactivation play with previous-"no" and open-deal checks. | M | Founder: reactivate only the client's own CRM contacts, or also people from earlier programmes? | 🔴 |
| 5.8 | Safety (eligibility + source) | Required: source known, right to use clear, CRM clear, channel clear. Uncertain identity → hold; uncertain source → block. 126 clear / 37 held / 23 blocked. | **Strongest foundation:** one gate every send path uses (`checkSendAllowed`), `suppression.ts`, the kill switch. | Add source, authority and identity-confidence checks to one pure function before any signal reaches a play: fails closed, an audit row per decision, a test proving it blocks. | M | A lawful basis (legitimate-interest assessment) for signal data. Founder: who clears "held"? | 🔴 |
| 5.9 | Intelligence (market learning) | Strongest pre-meeting signal: GTM hiring. Buyer theme: capacity. Best play: timing reactivation. A signal→meeting chart. Feeds the Living Client Profile. | No Living Client Profile. `icp-refine-context.ts` is the closest. | Only after 5.10 has real outcomes; no learned claim before there's enough data. | L | 5.10. R145's 90-day retention limits history. | 🔴 |
| 5.10 | Performance (signals → meetings) | Hiring → 42 accounts / 8 meetings / 3 opportunities; new role 31/5/2; engaged 18/6/2; generic 95/2/0. *Opportunities need verified CRM data. | Qualified meetings are real (`meeting-qualification.ts`, `meeting-truth.ts`, R141). | Stamp each play and send with the signal that caused it; count R141 **qualified** meetings per signal type; opportunities only from verified CRM data. | M | MEETING_BOOKED boundary. | 🔴 |

**Order:** 5.3 Apollo hiring signals → 5.8 safety gate → 5.4/5.7 CRM history reads → 5.5 → 5.6 (email only) → 5.10 → 5.1 (after R167 GO) → 5.9 → 5.2 later or never. Steps 1–6 use Apollo only, so they stay inside R146.

---

## Build these once: the shared foundations

The five pages overlap heavily. Built once, these foundations serve most of the 40 sections:

| Foundation | Serves sections | Starts from (exists today) | Size |
|---|---|---|---|
| **A · One eligibility gate** (clear / block / hold, with a reason and an audit row) | 3.3, 3.4, 4.4, 4.8, 5.5, 5.8, and every play | `checkSendAllowed` (`send-gate.ts`), `opt_out_blocklist`, `suppression.ts` | M |
| **B · CRM connection + read** (HubSpot sign-in first; contacts, deals, loss reasons, owners) | 3.2, 3.4, 4.2, 4.3, 4.5, 5.4, 5.7 | API-key HubSpot/Pipedrive (`lib/crm.ts`), OAuth pattern (`lib/gcal.ts`) | L |
| **C · Writeback outbox** (retried, never doubled) | 3.9, 4.10, 2.5 | Hot-reply CRM push, `webhook-idempotency.ts` | M |
| **D · Signal store + Apollo hiring feed** | 3.5, 5.1, 5.3–5.5, 5.10 | `agent_signals` (internal), Apollo job postings | M |
| **E · Living Client Profile** (one memory, every surface; client corrections) | 2.3, 3.6, 3.7, 5.9, 1.4 | `meeting_briefs` (built, unused), `figsy_knowledge`, `onboarding_brief_drafts`, `nexus_profiles` | M |
| **F · Play catalogue + attribution** (which signal/context caused which qualified meeting) | 3.8, 3.10, 4.5–4.7, 5.6, 5.10, 1.1 | `reactivation` sequence type, programme approval, Nexus | L |

**Recommended overall order:** A → E → B → C → D → F, then the screens (each after its R167 GO). A and E can start with nothing new outside; B needs the HubSpot app and #1473 (data rights).

---

## Found in passing: reported, not fixed

These are outside the scope of this report and need their own cards and rulings.

1. **The client's CRM API key is sent to their browser.** `GET /clients/me` (`apps/api/src/routes/clients.ts`) does `select('*')` on `clients`, which includes `crm_api_key` in plain text. It only reaches the client's own browser, but it is a stored secret that should never leave the server.
2. **A LinkedIn sender that breaks LinkedIn's terms.** `apps/api/src/lib/linkedin.ts` launches PhantomBuster agents. It is behind the kill switch in tests, and whether it can send in production was not checked. It also sits next to R35 (email is the channel). **Needs a founder ruling.**
3. **Invited teammates can't see the workspace.** Only `routes/team.ts` reads `client_members`; every other route finds the client by the owner's login (see 2.2).
4. **The only client screen for editing knowledge is off.** The `figsy_knowledge` editor sits behind a switch that is off, and a redirect.
5. **Pipedrive dedupe checks the person only, never the company.** HubSpot checks both.
6. **`GET /stats/platform` counts demo and House accounts and turns errors into 0** (see 2.6).

---
---

# PASS 2 (28 Sep, later): every tab re-read line by line

> **Why this pass exists.** The founder's verdict on pass 1: *"u missed connecting to slack etc."* and *"you skimming past a lot… this time go critically into detail."* He was right. Pass 1 described each tab's main idea and dropped the details around it:
> - the channel strip on every page-1 tab;
> - the Slack/Teams/knowledge rows on the Context page;
> - every chat button;
> - every status label;
> - the side menus;
> - the numbers that don't add up.
>
> This pass re-reads all 40 tabs in full (chat, quick buttons, input boxes, badges, every card, footers) and checks the new items against code at `origin/main` `d489fe8b4`. **Everything is still 🔴. Report only, nothing built.**

## P2-A · What pass 1 missed or got wrong

| # | Where | Pass 1 said | What the page actually shows / the truth | Effect |
|---|---|---|---|---|
| 1 | Page 1, all 4 tabs | Slack/WhatsApp reduced to one question in 1.1 | Every tab has a **"Triggered across channels"** strip: *"Bring the offer to the client where they already are"*. Milla chat **sent**, Email **sent**, Slack **soon**, WhatsApp **soon**. | New section **6 · Channels** below. The offer engine must send through the channel layer, not just the portal. |
| 2 | Page 2 tab 3 | Not mentioned | *"Same memory, every surface"*: Milla portal · Vida operator · Email · Slack · WhatsApp (soon). Milla: *"Vida, Slack and future WhatsApp interactions all read the same authorised context."* | Section 6 (C10). |
| 3 | Page 3 tab 2 | "one connector per source", one line | The client's stack has five rows, **each with an authority label**: CRM = **Truth** · Email + Calendar = **Context** · Knowledge (**Glean, Drive, Notion, SharePoint**) = **Knowledge** · **Slack / Teams** = **Surface** · Website + inbound = **Signal**. M&V's stack: Milla = Strategist, Vida = Operator, FIGSY = Research, Plays = Action, Nexus = Learning. *"Data flows both ways."* | Section 6 (C4, C6–C8). The authority labels become a data field. |
| 4 | Page 2 tab 1 | "no morning message" (implied) | Milla opens with *"Morning. Your programme is running cleanly…"*. **A daily morning brief already exists, sent by email** (`lib/morning-brief-deliver.ts`, P33). What's missing is the same brief *inside the chat*. | 2.1 is smaller than pass 1 said. |
| 5 | Page 2 tab 2 | Lookalikes not mentioned | *"I've asked FIGSY to find more firms that look like Ashcroft."* `routes/lookalike.ts` exists, but it is **admin-only** and scores the *best client*. It does not find companies like one account. | New row 2.2b. |
| 6 | Page 2 tab 4 | "no cost tracking" | Also: *"Context reused 78% · retrieval/cache avoided rebuild"*. **No AI call in the code uses caching** (no `cache_control` anywhere). That is a real cost saving on its own, separate from the dashboard. | New row 2.4b. |
| 7 | Page 2 tab 4 | "two fixed models" | The page draws **three** routes: low-cost *Routine*, mid-tier *Standard*, high-reasoning *Escalated*. Today there are two (R122a). | Founder decision. |
| 8 | Page 3 tab 5 | "no website feed" | *"Pricing page revisited"* means the **client's** website. **Apollo sells website-visitor tracking** (its tools list includes a visitor tracker), so this could come from inside R146. **Not checked on our plan.** | 3.5 may be buildable inside the Apollo-only rule. |
| 9 | Page 4 tab 2 | "start with HubSpot" | The page shows **Salesforce as the connected CRM**; HubSpot and Pipedrive are "Available". My HubSpot-first advice departs from the drawing. | **Founder decision:** which CRM first. |
| 10 | Page 4 tab 6 | Two plays | Milla's chat names a **third**: *"Budget-loss opportunities get a changed-economics play only where appropriate."* It is in the chat, not the cards. | Added to 4.6. |
| 11 | Page 4 tab 9 | "loss-reason chart" | The chart has exactly **five loss reasons**: Timing · Budget · Priority · No decision · Competitor. Plus a **"Find whitespace"** button. | That is the loss-reason list each CRM's reasons map into. |
| 12 | Page 1 | "breaks R87" | The page's own footer says: *"show the value, never invent the value… must use the client's economics plus verified M&V performance, or be explicitly labelled illustrative."* So the rule clash is only with **these demo figures**. The idea is fine if the range is worked out from the client's own numbers (`programmes.calculator_assumptions` exists). | Softer than pass 1. The pool/rate clash with R136 ③ still stands. |
| 13 | Side menu, pages 2–5 | Not mentioned | Pages 2–5 put **"Profile"** where today's menu has **"Documents"** (today: Home · Pipeline · Meetings · Programme · Inbox · My ICP · Documents · Reports · Coaching, `MillaShell.tsx`). Every page says **"Replies"** where today says **"Inbox"** (R165). The 6-step Flow matches today's (`mvp1-stage.ts`). | A menu change → R167 GO. |

## P2-B · Numbers inside the concepts that don't add up

These are things to settle before anyone builds from the drawings:

1. **Page 1 offer sizes follow no single rule.**
   - +4 meetings for 650 prospects (≈162 per meeting);
   - +8 for 1,200 (150);
   - +10 for 900 (90).

   A real offer needs one sizing rule. That rule must not reveal the pool or the rate (R136 ③).
2. **Page 1 asks to "add more prospects" while showing thousands still remaining.** It shows 2,420, then 1,860, then 1,140 remaining, yet still offers to add 650, 1,200 and 900. If the audience is still available, the offer is really "more meetings", not "more prospects".
3. **Page 1 badges never change.** The Meetings badge says **6** on every tab, even at 3/12 and 9/12. The Replies badge says **41** while positive replies read 11, 21 and 31. That's fine for a drawing; the real badges must read live data.
4. **Page 1: Coaching and trigger 2 both fire at 50%** (the Coaching tab shows "6 of 12 · Trigger 2 · now"). Which one wins at 50%, or do they both show?
5. **Page 2 tab 2:** *"Priya's current programme stays unchanged; the next batch will prioritise it."* A "next batch" usually means inside the running programme, which contradicts "unchanged". R166 fixes a programme at approval. Does team feedback change the running programme's sourcing or only the next programme?
6. **Page 2 tab 6:** the counter is *"pulled from verified booked-meeting events"*. Under R141 a public count must be **qualified** meetings.
7. **Page 5 tab 6:** the play is labelled *"Recommended · CRM + LinkedIn"*. R35 makes email the channel, and the only LinkedIn sender in the code is the PhantomBuster one (found in passing, pass 1).

## P2-C · Every detail, page by page

For each tab: every element that was skipped, and what it needs. Sections already fully covered in pass 1 are not repeated.

### Page 1 · Milla expansion & coaching

| Tab | Element (as shown) | What it needs | Exists today |
|---|---|---|---|
| all | Milla header *"Your pipeline strategist"*, status *"Running · 3 of 12"* | The running meetings count against the target | Yes. The workspace shows meetings against target (Stage 5 build) |
| all | Chat buttons **"Review expansion offer" · "Show me the assumptions" · "Not now"** (Coaching: **"Show me coaching" · "How would the retainer work?" · "Keep this for later"**) | "Assumptions" needs a readable view of what the offer is based on. "Not now"/"Keep this for later" must record a **decline or snooze**, so Milla doesn't ask again (R69) | Client economics stored (`calculator_assumptions`); no offer state |
| all | Milla's answer to *"What is this based on?"*: *"Meetings delivered, positive replies, remaining audience, ICP performance and the programme pace."* | Each input must come from real data. "Remaining audience" is the pool, which R136 ③ keeps hidden | Meetings, replies and pace exist; the pool must not be shown |
| all | Input box *"Ask Milla, request leads, or give feedback…"* | none (wording only) | n/a |
| all | Right panel header *"Live workspace… Milla updates this as you talk"* | The panel re-reads as the chat moves | Yes (R161/R171 live refresh) |
| all | **Expansion moments** strip: *"Three planned opportunities before Complete"*, 25/50/75% with "· now" on the active one | A three-step strip in the Results panel | No |
| all | Four tiles: target *"current programme"* · delivered *"verified by M&V"* · positive replies *"real programme signal"* · remaining audience *"still available"* | The fourth tile breaks R136 ③ | 3 of 4 exist |
| all | *"Keep momentum moving for roughly 3 / 5 / 6 more weeks"* | A duration estimate from real pace | Pace data exists; no estimate |
| all | Value box *"Potential opportunity · illustrative"*, *"Possible additional pipeline value"*, *"not a forecast or guarantee"* | Worked out only from the client's own economics, or not shown | Economics exist; no value calculation |
| all | Channel strip (see section 6) | The channel layer (G) | Email only |
| all | Buttons **"Review expansion offer" · "Discuss with Milla"** | An offer view plus a chat hand-off | No |
| 4 | *"+ close rate"*, *"Growth layer"*, *"Higher-value conversion support"* | A close-rate claim needs outcomes after the meeting, which crosses MEETING_BOOKED | No |

### Page 2 · Glean ideas

| Tab | Element | What it needs | Exists today |
|---|---|---|---|
| 1 | Chat: *"Morning… 6 of 10 meetings booked, and there's one thing worth looking at today"* | The morning brief shown inside the chat, once a day | **Email morning brief exists** (P33) |
| 1 | *"Review the two strongest positive replies before tomorrow's meetings. I've pulled both into the right panel"* | Rank positive replies by strength and link them to tomorrow's meetings | Reply classification exists; no ranking |
| 1 | *"FIGSY is researching the next batch and Vida is classifying replies"* | Live job state | `automatic-work.ts` |
| 1 | Buttons **"Show tomorrow's meetings" · "What changed today?" · "Show me the two replies"** | "What changed today?" needs a daily change log | Meetings list exists; no change log |
| 1 | Badges **"Programme running"**, **"Shared memory active"** | Status flags | Programme status exists |
| 1 | *"Vida classified 12 replies · 11 handled automatically · 1 soft-positive routed into tomorrow's prep"* | A route from a soft-positive reply into the meeting brief | Classification exists; no route into the brief |
| 1 | Memory chips **43 company facts · 12 ICP learnings · 8 messaging preferences · 6 meeting outcomes**, *"not a separate profile you must maintain"* | Counts per memory type (needs E) | Pieces exist, uncounted |
| 1 | **"Needs you 0 · M&V is handling the rest"** | Open client-action count | Partly (Needs-you exists in Vida, not as a client count) |
| 2 | Participants with roles: **Priya Shah, Founder · commercial decisions** · **Alex Morgan, Sales Director · prospect review** · Milla *Strategy · context · coordination* · Vida *Execution · replies · operations* | A **role per team member** that limits what they may do | Invites exist; no roles, and teammates can't see the workspace (pass 1) |
| 2 | *"I've turned that into a ranking signal, not a hard exclusion"* | Feedback as a **soft ranking weight**, separate from the ICP's hard filters | ICP filters are hard; `lead_feedback` exists |
| 2b | *"Find more firms that look like Ashcroft"* → task **"Find 10 lookalikes to Ashcroft Legal · Running"** | Search for companies like one account (Apollo company search by the account's industry, size and location) | Admin-only `lookalike.ts`; nothing per account |
| 2 | **"Review first 10 new prospects · assigned to Alex when FIGSY finishes · Waiting"** | A task handed to a named human when a job completes | No |
| 2 | **"Keep law firms in · Remembered"** | A decision saved to memory (E) | No |
| 2 | Buttons **"@Milla assign this" · "Show team decisions" · "What changed?"**; input *"Message your team and Milla…"* | @-mentions and a decision log | No |
| 3 | Milla header *"Your persistent business memory"*, status *"Memory synced"*, *"Last updated just now"* | A timestamp on the memory | Brief versions have timestamps |
| 3 | Scope: *"20+ employees across the next programme **and anywhere else this targeting is reused**. I've left the current live programme unchanged because you asked for this 'from now on'."* | Every change carries a scope (this programme / from now on), read from the client's words | The next-programme copy exists (`attachIcpForNextProgramme`, #2392); no scope flag |
| 3 | Four memory rows with **provenance tags**: Ideal customer *Updated* · Strong prospect *Learned* · Messaging preference *8 signals* · Meeting learning *6 outcomes* | Each memory item records where it came from and how much evidence it has | No |
| 3 | *"editable · history preserved"*; buttons **"Show what you remember" · "Correct my ICP" · "Show memory history"**; input *"Tell Milla something to remember or correct…"* | Edit creates a new version; history view | Versioned `meeting_briefs`, unused |
| 4 | Vida menu: SYSTEM *Autonomous · Safe defaults · Human exceptions*; Operations: *Clients · AI operations · Needs you 0 · Meetings · Reports*; System: ***Providers · AI cost · Audit***; operator *"A. Cassidy"* | "AI operations" and "AI cost" are new Vida pages; Audit exists | `/vida/audit` exists |
| 4 | Four routing rows with task counts: reply classification *1,204 · Routine*; opener drafting *611 · Standard, "using cached company + prospect context"*; ICP synthesis *6 · Escalated*; meeting coaching brief *3 · Escalated* | Per-task-type counts from the cost log | No |
| 4b | *"Context reused 78%"*, *"Cache saved 31%"* | **Turn on prompt caching** for the repeated company/prospect context | **None: nothing is cached today** |
| 4 | Vida chat: *"184 delivery actions today, 12 replies classified, zero operator exceptions"*; *"Why was the ICP synthesis expensive?"* → explanation; buttons **"Show costly tasks" · "Show exceptions" · "Run"**; input *"Ask Vida about operations…"* | Vida answers cost questions from the cost log | No cost log |
| 4 | *"Client never sees model names"*, *"Clients buy the outcome"* | A rule (a test that model names never reach the portal) | Not checked |
| 5 | See section 6 | | |
| 6 | Website nav **How it works · Why M&V · Customer stories · Pricing**; button **"See who M&V finds"**; *"Proof, not promises"*; *"Pipeline without the work of building pipeline."*; *"M&V finds the people, runs the work and books the meetings."* | A copy change on a frozen site (#605) | Website frozen |
| 6 | **184 this month · 38 active programmes · 12 customer stories** (all "demo") | Three live counts plus a stories page | Stats route live, unused, counts demo accounts |

### Page 3 · Context Engine

| Tab | Element | What it needs | Exists today |
|---|---|---|---|
| all | Milla header *"Your contextual selling strategist"*; input *"Ask Milla about the client context, account or next play…"* | Milla answers from the account context (3.7) | No |
| 1 | Three questions: **Who?** *"identity, fit, relationship and ownership"* · **Why now?** *"social, CRM, website and commercial events"* · **What next?** *"Milla proposes the motion; Vida executes inside rules and permissions"* | | |
| 1 | Buttons **"Show connected stack" · "Show account context" · "Show recommended play"**; *"Synchronise the truth, not the software."* | | |
| 2 | Authority labels per source (see P2-A #3); buttons **"Show data authority" · "Show M&V stack" · "Show sync direction"** | Every stored fact carries its source and authority type | No |
| 3 | John Smith resolved across **LinkedIn profile · john@acme.com · HubSpot Contact #4821 · Calendar attendee (3 historical meetings)**; Acme across **acme.com · CRM Account #3478 · social company page · website visitor match** | Calendar attendee history means reading the client's past calendar | Calendar is connected for booking only |
| 3 | Sarah Jones conflict: CRM *"Sales Director"* vs social *"Sarah J. · VP Sales"* → **Hold**; buttons **"Show identity matches" · "Show conflicts" · "Review low confidence"** | A conflict list and a hold queue | No |
| 4 | **Eight relationship states**: customer · open opportunity · closed-lost · dormant · explicit no · former customer · previously contacted · net new | One field per contact from the CRM plus our history | `crm_existing` yes/no only |
| 4 | Six facts: Status (lost 11 months ago, reason timing) · Prior engagement (*3 meetings with Sarah, the client's AE*) · Last position (*"Email history indicates positive fit but poor timing"*) · Current owner · Suppression · Reactivation rule (*client-approved window passed*) | "Last position" needs **email history** (C7) | No |
| 4 | Rules **Remember · Adapt · Protect**: *"If an opportunity reopens, Vida stops conflicting prospecting automatically"* | An automatic pause on CRM change | No |
| 5 | Four signals, each with **source · freshness · strength**: GTM hiring (*Professional · Fresh · Strong*) · New CRO (*Role change · 23 days · Strong*) · Pricing page revisited (*Website · This week · Medium*) · Topic activity (*Social context · 3 people · Supportive*); Milla also names **event activity** and **CRM events** | Freshness and strength fields on every signal | No |
| 6 | Six knowledge areas in full: **Business truth** (offer, positioning, products, pricing logic, *claims M&V may or may not make*) · **ICP learning** · **Proof + evidence** (case studies, stories, quantified outcomes, *approved proof points*) · **Objections** (*and where the product should not overclaim*) · **Client corrections** (*"No micro agencies", "use this language", "never contact this category"*) · **Connected knowledge** | A list of **approved claims and proof points** that message writing may use; an **"allowed claims"** check | `figsy_knowledge` covers most kinds; no approved-claims list |
| 6 | *"Knowledge should be inherited, not re-entered. Every new programme starts with the accumulated context."* | | Targeting copies to the next programme (#2392); knowledge is per client already |
| 7 | Ten parts (per the chat): identity · fit · relationship · history · signals · knowledge (*"Internal notes show the previous opportunity centred on Product X"*) · eligibility · recommended play · current action · outcome; **Confidence: High, "multiple independent sources"** | Reading **CRM notes** (4.2 scope) | No |
| 8 | Reason chips **History · Now · Intent · Fit · Safety · Motion**; guidance *"Do not repeat the original cold sequence and do not mention every observed signal"* | A writing rule: use signals for timing, never quote them | Sequence linting exists (`sequence-quality.ts`) |
| 8 | Vida's three steps: **Resolve the right contacts** (*"current buying committee"*) · **Prepare the new message** (*"without creepy over-personalisation"*) · **Run Message QA + eligibility** (*"truth, tone, permissions and relationship protection"*) | A buying-committee search per account | Sequence quality check plus the send check exist |
| 9 | Pipeline **Client stack → M&V (Milla reasons, Vida acts, FIGSY researches) → Writeback** (meetings, dispositions, status, play attribution, client corrections); buttons **"Show writeback rules" · "Show conflict handling" · "Show last sync"** | Conflict handling: whose data wins | No |
| 10 | Chain ends in the **"Client Brain"**; buttons **"Show what changed" · "Show best context pattern" · "Show what to stop"** | "Client Brain" = the Living Client Profile (E) | Nexus exists |

### Page 4 · CRM Intelligence

| Tab | Element | What it needs | Exists today |
|---|---|---|---|
| all | Milla header *"Your CRM-aware pipeline strategist"*; input *"Ask Milla about your CRM, audience or next play…"*; footer *"Illustrative concept data only · production truth and permissions would come from the client's authorised systems."* | | |
| 1 | Buttons **"Show CRM health" · "Show suppressed people" · "Find closed-lost plays"**; *"Your CRM gives me commercial history"*, *"extended BDR team"* | CRM health = last sync time plus errors | No |
| 2 | **Salesforce "Connected"**, HubSpot/Pipedrive "Available" (see P2-A #9) | | |
| 2 | Four scope switches: **Contacts + companies On** · **Opportunities On** (*stage, close reason, timing*) · **Activity history Limited** (*"only the fields needed"*) · **Write-back Separate** | Four stored permissions per connection | Two switches today (read, write) |
| 2 | Buttons **"Review permissions" · "Test sync" · "Disconnect"** | "Test sync" exists as a key test | `POST /me/crm/test` |
| 3 | Three segments: **Never worked 8,420** *"potential prospecting pool"* · **Previously contacted 5,110** *"needs history check"* · **Closed-lost 147** | ⚠️ "Never worked" CRM contacts as a *prospecting pool* touches R73 ② (CRM imports never enter the shared pool). Using them only for the same client is a different question | Decision |
| 3 | *"Existing customer: protected unless the client defines an approved expansion use case"* | A per-client "allow customer expansion" switch | No |
| 4 | *"The suppression follows the person across programmes"* and *"across future programmes **and channels**"* | Opt-outs must cover every channel, not just email | The send check covers email and WhatsApp numbers (`send-gate.ts`) |
| 4 | Buttons **"Show suppression rules" · "Review exceptions" · "Audit blocked records"** | | Vida suppression viewer exists |
| 5 | *"'The timing wasn't right then — what has changed now?'"*; buttons **"Show the 42" · "Review new play" · "Exclude an account"** | Per-account exclusion from a play | No |
| 6 | **Budget-loss → "changed-economics play only where appropriate"** (chat); **Dormant champions → relationship-led check-in**; cards **Review / Review / Explore** | Three plays, not two | No |
| 7 | Buttons **"Show trigger rules" · "Pause all triggers" · "Review approvals"**; *"The trigger never means 'blast automatically'"* | A **pause-all switch** for triggers | Kill switch exists for sending |
| 8 | Buttons **"Show blocked examples" · "Review gate rules" · "See audit trail"**; *"whatever channel rules apply"* | | |
| 9 | Five loss reasons (P2-A #11); **"Find whitespace"** = segments that fit but were never worked | | No |
| 10 | Writeback fields: meeting (*date, contact, programme source*) · disposition (*positive, not now, not interested, other client-approved state*) · **contact status** · play attribution (*link*); buttons **"Review writeback fields" · "Show attribution" · "Turn writeback off"** | Contact status writeback as well | Write switch exists |

### Page 5 · Social Intelligence

| Tab | Element | What it needs | Exists today |
|---|---|---|---|
| all | Milla header *"Social-aware pipeline strategist"*; input *"Ask Milla about social signals, accounts or plays…"*; footer *"…signals, permissions, attribution and contact eligibility must come from authorised sources and verified client systems."* | | |
| 1 | Three steps **Detect → Reconcile → Decide**; *"If there is no meaningful signal… nothing changes. More data is not the goal. Better timing is."* | | |
| 2 | LinkedIn *"Company/admin, lead and authorised engagement context where supported"* · Instagram/Meta *"business account activity, engagement and authorised lead surfaces"* · YouTube *"within platform rules"* · TikTok **Limited** · **Approved signal providers · Optional** | "Approved provider" = Apollo under R146 | Apollo |
| 2 | Four authority labels **Authorised · Source shown · Contracted · Do not use (Vida holds)**; buttons **"Review permissions" · "Test connections" · "Show data scope"** | Same field as page 3's authority labels | No |
| 3 | Tags per signal: *Strong timing · LinkedIn · ICP fit* / *Context signal · Public post* / *Medium · YouTube* / *Account cluster · 3 people*; *"Milla can use the language as context, not copy it blindly"*; buttons **"Show high-signal only" · "Show source detail" · "Dismiss a signal"**; per-row **Review / Open account** | Dismiss writes a "not useful" mark back into learning | No |
| 4 | *"Score the signal, not… a magical universal lead score"* | Four separate ratings, never one number | No |
| 5 | Three accounts with fields: Acme (*Hiring 4 GTM roles · People 3 active · CRM Lost · timing*) · Northstar (*Engagement 5 events · People 2 senior · CRM Net new*) · Vertex (*Signals 8 events · CRM Open opp · Action Protect*); buttons **"Show hot accounts" · "Open Acme Systems" · "Compare signal clusters"** | | |
| 6 | New-role play *"only where the role change is permitted signal context"*; engaged-with-us *"directly engaged with the client's connected content or lead surface"* | | |
| 7 | *"Uses the fresh signal only as timing/context — not as a creepy surveillance reference"* | The same writing rule as 3.8 | |
| 8 | Six rules: **source known · use authority clear · CRM relationship clear · channel eligibility clear** (all *Required*) · identity uncertain → **Hold** · source uncertain → **Block**; buttons **"Show held signals" · "Review source authority" · "View audit trail"** | "Channel eligibility clear" = the contact may be reached on *this* channel | Send check is per channel for email and WhatsApp |
| 9 | Chart categories **Hiring · New role · Engagement · Topic pain · General post**; learning includes *"what language buyers use"* | Store buyer phrases from replies | Reply text is stored |
| 10 | *"Start with verified meetings and opportunities. If CRM later gives us verified revenue outcomes, we can connect the chain."*; conclusions **Keep / Reduce**; buttons **"Show best signal type" · "Show meeting attribution" · "Show CRM-linked outcomes"** | | |

## 6 · Channels and connected tools: the section pass 1 missed

Drawn on page 1 (all tabs), page 2 (tabs 3 and 5) and page 3 (tab 2). **All 🔴.**

| # | Channel / tool | What the pages show | Exists today (code verified) | How to build | Size | Blocked by / decision | Status |
|---|---|---|---|---|---|---|---|
| C1 | **Milla chat** | The main surface; every other channel is *"another doorway into the same M&V context"*; *"the portal remains the full record"* | Yes | The anchor: every channel's decisions land back in the chat thread | n/a | | 🔴 (as a hub for other channels) |
| C2 | **Email to the client** | *"Important notifications and commercial moments · Connected"*; offer *"Email · sent"* | **Yes:** client emails, the daily morning brief (P33) and server-side Notification Preferences on Milla Settings | Add the new moments (expansion offer, coaching) as email types under the same preferences | S | none | 🔴 |
| C3 | **Slack (client workspace)** | *"Slack connected · #growth"*; **"Send test to Slack"**; **"Notification rules"**; *"approvals and important programme moments… not every notification"*; Alex **approves prospects from Slack** and *"the same decision lands back here"*; Milla interaction in Slack; offer *"Slack · soon"* | **Founder alerts only:** one `SLACK_WEBHOOK_URL` mirrors alerts to *us* (`alerts.ts`). No client Slack at all. | A Slack app with per-client install (sign-in, encrypted token, channel picker) → test message → notification rules → **interactive buttons** (signature-checked endpoint calling the existing approval route) → map the Slack user to a team member (needs 2.2 membership) → **two-way chat with Milla** (Slack events → the client's Milla thread). | L | R166 (approval is per programme, not per prospect). 2.2 (who is Alex?). **Founder:** which moments go to Slack; is chatting with Milla in Slack in scope, or notifications and approvals only? | 🔴 |
| C4 | **Microsoft Teams** | *"Slack / Teams · Approvals, conversations and working decisions · Surface"* (page 3) | None (only Outlook mailbox and calendar connections) | The same design as C3 on the Teams app/bot platform, reusing C3's rules and approval endpoint | L | C3 first. **Founder:** do clients use Teams enough to matter? | 🔴 |
| C5 | **WhatsApp (to the client)** | *"Future interaction surface using the same client context · Soon"*; offer *"WhatsApp · soon"*; *"future WhatsApp interactions all read the same authorised context"* | WhatsApp exists **for prospects only**: Meta webhook plus send (`routes/whatsapp.ts`, `lib/whatsapp.ts`), behind the send check. Nothing sends WhatsApp to a *client*. | A separate client-facing number or template set. Meta requires **pre-approved templates** for business-started messages (general knowledge, not tested here). Client opt-in per person; inbound client messages routed to their Milla thread. | M–L | **Founder:** one number or two (prospects vs clients)? Which moments? | 🔴 |
| C6 | **Knowledge tools: Glean, Google Drive, Notion, SharePoint** | *"Glean, Drive, Notion, SharePoint and internal company context"*; *"enrich context without becoming a second memory"*; Glean *"Research cost, permissions and value before build · Research"* | None | Per tool: read-only sign-in → import chosen documents into the client's knowledge (E) as a "connected" kind with source and date. **Import, don't live-query**, so it never becomes a second memory. | M per tool (Glean L) | **Founder:** which first? (Recommend Google Drive: our Google sign-in pattern already exists.) Glean needs a cost study. | 🔴 |
| C7 | **Email + calendar history** | *"Conversation history, meetings and seller activity · Context"*; used for *"Last position: email history indicates positive fit but poor timing"* and *"Calendar attendee · 3 historical meetings"* | Calendar connected **for booking only**; client email is never read | Read-only history scopes on the existing Google/Outlook connections; store only summaries per account. Google's restricted mail scopes need a security review (general knowledge, not tested). | L | Privacy (DPA and lawyer, #1473); founder: worth it? | 🔴 |
| C8 | **Website + inbound (client's own site)** | *"Forms, engagement and authorised intent context · Signal"*; *"Pricing page revisited"* | `visitor_sessions` tracks **our** site only | Apollo's website-visitor tracker (inside R146 if our plan includes it; **not checked**) or a client form webhook into the signal store (D) | M | Whether our Apollo plan includes it | 🔴 |
| C9 | **Notification rules** | **"Notification rules"** button; *"Only meaningful approvals, exceptions, briefings and next actions should surface there"* | **Yes, for email:** server-side preferences on Milla Settings (`programme-notifications.ts`) | Extend the same preferences into a moment × channel grid | S–M | C3/C5 | 🔴 |
| C10 | **"Same memory, every surface"** | Milla portal · Vida operator · Email · Slack · WhatsApp all read one memory; *"a correction made once should not need to be repeated in every channel"* | Milla and Vida share data (R161/R171) | Every channel goes through foundation **G** below, which reads memory **E** | M | E, G | 🔴 |

**Order:** C2 → G → C9 → C3 (notifications and approval buttons, then chat) → C6 (Drive) → C5 → C8 → C4 → C7.

## Foundation G · one channel layer (new)

| Foundation | Serves | Starts from | Size |
|---|---|---|---|
| **G · Channel layer**: one **outbound dispatcher** (event → client's rules → channel) and one **inbound router** (Slack/Teams/WhatsApp message or button → the client's Milla thread or the existing approval route) | 1.1–1.4 channel strip, 2.3 surfaces, 2.5, 3.2, C2–C10 | Client emails plus notification preferences, `alerts.ts`, signed webhooks (`lib/webhooks.ts`) | M |

**Revised overall order:** A (eligibility) → E (Living Client Profile) → **G (channels)** → B (CRM) → C (writeback) → D (signals) → F (plays).

## P2-D · New founder decisions this pass surfaced

1. Which CRM first: Salesforce (as drawn) or HubSpot (my recommendation, since its APIs are already in use)?
2. Slack: notifications and approval buttons only, or full chat with Milla inside Slack?
3. WhatsApp to clients: a separate number from prospect outreach?
4. Knowledge tools: Google Drive first? Glean parked until a cost study?
5. Three AI routes (as drawn) or keep two (R122a)? And turn on AI caching now, which is a pure cost saving?
6. Page 1: one sizing rule for "+N meetings"; which offer wins at 50%?
7. Team feedback: changes the running programme, or only the next one?
8. "Never worked" CRM contacts as a same-client prospecting pool: allowed under R73 ②?
9. Menu: "Profile" in place of "Documents"?
