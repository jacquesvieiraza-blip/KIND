# K.I.N.D — Master Conversation Handoff for Fable

**Purpose:** preserve the substantive product, compliance, legal, trust, operating and website decisions from the ChatGPT conversation so Fable can review them alongside the latest 19 August Ledger and the attached HTML artifacts.

**Important:** this is a **comprehensive reconstructed handoff**, not a byte-for-byte export of the ChatGPT UI transcript. It captures the substantive conversation context retained in this thread plus the generated artifacts and uploaded ledgers. Where exact wording matters, use the latest Ledger, the source files, the HTML artifacts, and the founder's own rulings as the primary evidence.

**Operating rule for Fable:** READ / VERIFY / CHALLENGE first. Do not build or alter code, docs, website, infrastructure, migrations, secrets or provider configuration unless the founder explicitly authorises a bounded change.

---

## 1. Company / launch context

K.I.N.D (get-kind.com) is an AI-assisted B2B lead-generation / outbound service and software product. The current launch target discussed throughout the thread is **25 August 2026**.

The product's conversion boundary is deliberately narrow:

`MEETING_BOOKED`

K.I.N.D is not currently trying to own held meetings, opportunity creation, closed-won revenue, downstream client close rates or client revenue attribution. Once the meeting is booked into the client's calendar, the reseller/client owns what happens next.

The retention thesis is therefore simple: K.I.N.D remains valuable if it reliably fills client calendars with qualified meetings.

Launch discipline established in the conversation:
- First live clients matter more than broad feature parity.
- First ~10 clients are deliberately used to expose edge cases / “bad eggs”.
- Vida autonomy is **not** to be rushed before that learning period.
- CRM expansion, Social Intent, larger autonomy, Meeting Graph and AI-to-AI buyer introductions are post-launch capability tracks unless the founder explicitly changes scope.

---

## 2. Product characters / operating model

The clearest compact model developed in this conversation is:

**MILLA understands the client. FIGSY understands what should happen. VIDA makes it happen. YOU set the rules.**

### Milla
Client-facing intelligence / relationship layer. Milla should deeply understand what the client sells, who they want to meet, what good/bad fit looks like, their proposition, exclusions, proof, timing signals and meeting objective.

Public website direction became deliberately **Milla-first**. A first-time buyer should not have to understand the K.I.N.D internal organisation chart before understanding the value.

Core public promise direction:
- “Meet Milla. Your pipeline, handled.”
- “An AI agent that finds the people worth meeting and books them into your calendar.”
- Simpler internal test: **“Milla books my meetings.”**

### FIGSY
The defining decision/intelligence engine. It should evolve beyond a 0–100 scorer into the brain that answers:
- WHO should we pursue?
- WHY THEM?
- WHY NOW?
- WHAT should we say?
- HOW should we engage?
- CAN WE legally/contractually do it?
- What confidence do we have?
- Did the action eventually create `MEETING_BOOKED`?

The strategic direction is that FIGSY becomes a proprietary decision system around foundation models, not merely an email-writing wrapper.

### Vida
Operator / execution layer. Today it mainly surfaces information and executes founder/operator initiated work. Future target after the early-client learning period is bounded **Level 3 autonomy**: act inside approved policy, log actions, continue automatically, escalate uncertainty/exceptions.

Target flow:

`event → FIGSY evaluates → policy allows? → VIDA acts/logs → continue`

Human intervention remains mandatory for items such as new jurisdictions/channels, compliance uncertainty, unusual/high-risk replies, major budget changes, policy/suppression changes, security incidents and unusual behaviour.

Hard principle:

**Vida autonomous inside approved policy.**

Deterministic controls must always sit outside the agent: kill switch, DNC, jurisdiction/channel eligibility, employer floor, spend caps, tenant isolation, suppression and other non-overridable rules.

---

## 3. Verified product/code foundations discussed

The earlier code behaviour record and later Fable ledgers established the following important current-state foundations:

- Internal company/lead pool is served first at zero incremental data cost; remaining sourcing uses providers under a spend model.
- PDL + Hunter are the day-to-day production sourcing stack in the latest ledger; Apollo is optional/BYO, Clearbit optional.
- Employer-floor suppression exists and is checked in sourcing/send paths.
- Claude/Haiku scores leads 0–100 and stores a one-sentence reason.
- Approval causes the per-lead commercial charge where applicable; unusable email is not charged/reversed according to the documented paths.
- Enrolment includes kill switch, DNC, CRM duplicate control and UK PECR logic.
- Client SMTP/mailbox is used; warming mailbox is protected; sequence caps exist.
- RFC8058 unsubscribe + STOP/body opt-out routes converge into a global suppression structure.
- Replies are stored/classified; risky replies are escalated; AI-drafted replies are human-approved today.
- Calendar booking is genuinely wired to Google, with event creation and meeting attribution.
- Tenant isolation includes a Nexus guard and RLS as a second layer.
- Operator audit structures exist, though the ledger identified best-effort audit behaviour as insufficient for future autonomy.
- Signed document snapshots exist for some governed documentation.

The current ledger is the primary source for exact file/line evidence.

---

## 4. Global compliance architecture developed in the conversation

A major recurring conclusion is that **lawful basis for processing personal data is separate from permission to use a channel in a specific jurisdiction**.

Do not collapse these into a generic statement such as:

“Legitimate interests means global cold email is lawful.”

The target compliance model is:

`ALLOW / DENY / REVIEW`

for every person / country / channel combination.

Unknown or unsupported jurisdiction must not silently default to send.

The founder's current launch-country decision is:

- **US** → evaluate US rules
- **UK** → evaluate UK rules
- **all other jurisdictions** → HOLD
- **unknown country** → HOLD / REVIEW

The conversation repeatedly rejected fail-open treatment for unknown jurisdiction.

Long-term architectural target:

`OUTREACH REQUEST → GLOBAL ELIGIBILITY ENGINE → ALLOW / DENY / REVIEW → DECISION SNAPSHOT → transport`

Transport/provider (native mail, Smartlead, future provider) must never create its own legal eligibility. It only executes a decision that has already been allowed by the authoritative policy layer.

---

## 5. High-severity current compliance / trust defects tracked in the latest Ledger

Fable's latest Ledger has moved to an **AMBER** launch verdict and now records six hard-check findings.

The important ones discussed across the thread include:

### HC-1 — suppression email normalisation
Mixed-case/raw email storage can break exact-match global suppression. A person who opted out can potentially be contacted again if different case representations are used.

Expected launch treatment: normalise all writers/readers and existing rows; independently verify.

### HC-2 — unsubscribe signing secret
Production unsubscribe signing can fall back to another-purpose secret or a published development constant.

Expected treatment: dedicated `UNSUBSCRIBE_SECRET`, mandatory in production, runtime-confirmed as SET (never disclose value).

### HC-3 — Smartlead bypass
The month-one Smartlead route can exist outside K.I.N.D's native compliance chokepoint, potentially bypassing suppression / PECR / refusal logic and not propagating later opt-outs.

Expected treatment: no Smartlead production unlock until this path is brought under the same eligibility and suppression controls and runtime-verified.

### HC-4 — dormant consent route
Consent-request path currently uses the primary domain and can bypass global suppression. It is dormant and should remain disabled until corrected and jurisdictionally validated.

### HC-5 — website data-residency / compliance truth
The website has made storage/residency/compliance claims that do not match verified infrastructure/current capability. Example: Cape Town / `af-south-1` claims versus production evidence pointing at Ireland, plus a claimed US-region capability not actually present.

This is treated as a **trust blocker**: false legal/security statements matter even before outbound begins.

### HC-6 — tracking truth
The current privacy page says K.I.N.D does not use Google Analytics while GA runs across the site, with no consent gate. The code also includes identifiable email open-tracking, which feeds an A/B winner function that optimises open rate even though the founder's North Star is meetings.

Conversation recommendation: remove or correctly consent-gate site tracking and align policy with reality. For cold UK outreach, open tracking should be treated conservatively and may simply be disabled because it is strategically unnecessary.

---

## 6. UK compliance posture

The conversation deliberately split UK compliance into two questions:

### Channel eligibility / PECR
The UK corporate-subscriber gate is a real and relatively strong current control, but must cover every send route. Sole traders / certain partnerships and uncertain subscriber status require more cautious treatment.

### UK GDPR processing
Still requires evidence/documentation, including:
- written LIA / legitimate interests assessment;
- Article 14 transparency for indirectly sourced data;
- correct controller/processor role wording;
- retention schedule;
- rights/erasure process;
- DPIA / accountability evidence where applicable.

The latest Ledger therefore correctly moved from “UK compliant” toward:

**CHANNEL RULE ENFORCED · PROCESSING WORK OPEN**

The conversation's presentation rule is never to make a blanket “GDPR compliant” assertion. Show the processing, purpose, basis, controls and evidence instead.

---

## 7. US compliance posture

The earlier narrow postal-address check was expanded during the conversation into a full CAN-SPAM audit.

Fable's current Prompt 5 now checks:
- accurate routing/header information;
- non-deceptive subject lines;
- identification as advertising/commercial mail where required;
- valid physical postal address;
- working opt-out / honoring requests;
- multi-party sender designation across K.I.N.D, the client, the client's mailbox and Smartlead.

Important: responsibility cannot simply be contractually pushed away; the client/K.I.N.D/provider roles need counsel analysis.

Separately, the conversation elevated US **data-broker** analysis. Because K.I.N.D purchases/holds third-party prospect data, creates inferences and commercially exposes approved prospects to clients, counsel should determine whether and when K.I.N.D falls within California / Texas / Oregon / other state data-broker rules. California's DROP obligations were specifically raised as a present 2026 consideration if K.I.N.D qualifies.

---

## 8. South Africa posture

South Africa remains a counsel-gated route.

The conversation moved beyond “just send a consent email” and established that the existing consent flow must be compared with POPIA section 69 requirements and **Form 4** before it is reused.

Current SA legal/trust questions include:
- Information Officer registration / applicability to the UK entity operating in SA;
- PAIA manual applicability/publication;
- POPIA s69 consent-first approach;
- Form 4 compatibility;
- section 72 international transfer basis if data is hosted outside SA;
- CPA direct-marketing/cooling-off implications where relevant.

SA cold outreach should remain held until counsel confirms the route and the code only admits SA to the consent-first path.

---

## 9. Controller / processor / data-sharing position

A critical architectural fact verified by Fable is that the reusable `lead_pool` is cross-client by design.

The conversation repeatedly concluded that K.I.N.D is likely acting as **controller for the purposes/means of the independently sourced pooled data**, even if K.I.N.D may act as processor or in another role for particular client-specific activities.

Therefore roles should be mapped **by processing activity**, not globally stamped “controller” or “processor”.

Another late-stage finding: when K.I.N.D acts as controller of a pooled record and provides it to a client who independently determines later use, this may be controller-to-controller sharing rather than processor activity. A standalone data-sharing agreement is good practice, but the key requirement is that the contract correctly documents the sharing relationship, purpose, lawful basis, rights, retention, security and responsibilities.

The public DPA language must match the real activity model.

---

## 10. Provider-licence / commercial-data rights — one of the most important external risks

The conversation's latest cross-check elevated provider licensing to a major risk because technical/privacy compliance does not override vendor contract restrictions.

### PDL
The latest external review of PDL's current terms found provisions that may restrict displaying cached API data to more than one end user and may require deletion of cached data on termination, subject to the actual Order Form / Solution Provider arrangement.

This could directly conflict with the intended K.I.N.D model:

`purchase once → store in lead_pool → reuse across unrelated clients → reveal to approved client → charge`

Therefore the current recommendation is:

**Treat PDL licence compatibility with cross-client reuse as a contractual launch/client-1 gate until K.I.N.D's actual Order Form is reviewed and PDL confirms the exact architecture in writing.**

“Purchased” does not automatically mean unrestricted ownership or perpetual cross-client resale rights.

### Apollo
Apollo's standard terms were assessed as materially more restrictive around resale/distribution/third-party incorporation.

Target rule:

`SOURCE = APOLLO → NO cross-client reusable pool / commercial reveal unless a separate written Apollo agreement explicitly allows it.`

### Hunter / other providers
Provider-specific restrictions and privacy/deletion signals must be normalised by provider, not guessed generically.

---

## 11. Upstream and downstream privacy-right propagation

A mature K.I.N.D rights model must operate across the entire lifecycle, not only at send time.

Proposed lifecycle rule:

**source → licence → storage → enrichment → AI processing → tracking → outreach → reply → deletion**

When a person exercises a right, every relevant copy, inference, recipient, client, campaign and vendor should respond appropriately.

### Upstream provider rights
If a person deletes/opts out at PDL/Hunter after K.I.N.D has cached them, the local pool must not keep circulating stale/deleted data forever.

Fable's current Prompt 24 introduces provider DSR propagation and Hunter's documented `451 claimed_email` handling.

Latest cross-check refinement: do **not** turn any generic HTTP 451 from any future provider into a universal legal conclusion. Map provider + provider-specific response/documentation to a normalised privacy event.

### Downstream recipients
A person may already have been copied to:
- a client's K.I.N.D tenant;
- client CRM;
- Smartlead campaign;
- exports;
- other processors.

A recipient ledger should ultimately exist so erasure / rectification / restriction can propagate where required.

### Derived data
Rights/SAR treatment must include not only raw contact rows but also:
- FIGSY score;
- `score_reasoning`;
- reply classification;
- campaign membership;
- profiling/inference information;
- suppression status;
- recipients;
- source information.

---

## 12. Data locations, storage, logs, backups and AI vendors

The conversation moved from “where is Supabase?” to “where does the person's data actually exist?”

The transfer/data-location map should include, where applicable:
- Supabase primary DB and backups/PITR;
- Railway runtime/logs;
- Resend;
- Anthropic API processing;
- Google Calendar;
- Smartlead / Instantly;
- PDL / Hunter / Apollo;
- Stripe where relevant;
- support tooling;
- founder alert emails;
- CSV exports;
- application/error logs.

Important Fable finding: many logging sites contain prospect email addresses, reply snippets or AI/raw output. Logs are therefore a real data store and require retention/security treatment.

LLM calls are also a processing/data-location issue. FIGSY sends prospect information and reply content to Anthropic for scoring/classification/generation. The RoPA and transfer/vendor pack must say so. Production PII should never be copied into personal consumer AI accounts for debugging.

Deletion/retention policy must explicitly address live databases, backups, logs, exports and vendor-held transient copies.

---

## 13. Sensitive data / field minimisation

The current schema/provider mapping was found to persist a business-field allowlist rather than obvious special-category fields. That is good.

But this needs to be written as a durable rule before Social Intent / broader AI ingestion:
- do not intentionally collect/target/infer health;
- ethnicity/race;
- religion;
- political opinions;
- trade-union membership;
- sexual orientation/sex-life;
- biometrics/genetic data;
- criminal-history information;
- or other sensitive categories without an explicit lawful approved use.

Prospects can also reveal sensitive information incidentally in replies. FIGSY currently classifies reply bodies. Rule: never target/score/infer from incidental sensitive data, minimise visibility and define retention.

---

## 14. Security / trust evidence

The conversation concluded that the remaining risk is increasingly **evidence coherence**, not merely missing code.

K.I.N.D should be able to present evidence for:
- tenant isolation / RLS / Nexus fencing;
- MFA on critical founder/admin accounts;
- privileged access model;
- production access;
- secrets management / encryption;
- TLS / at-rest controls via providers;
- backups and restore tests;
- audit logs;
- patching / vulnerability handling;
- joiner/leaver process;
- logging retention;
- incident response;
- send-safety controls;
- vendor security evidence.

Do not say K.I.N.D itself is SOC 2 certified unless it actually is. It may accurately say it uses infrastructure providers with relevant certifications where supported by current evidence.

A real incident tabletop should be run before client volume, e.g. “Supabase credential compromised”, to prove incident → data map → affected clients/prospects → controller/processor analysis → notification decision.

---

## 15. Trust Room / presentation model

Fable correctly rejected the idea of creating endless parallel master artifacts. The conversation converged on **one governed Trust Room / Vida document home**.

The Trust Room index should cover roughly:
- RoPA;
- role/data-sharing map;
- DPIA;
- Data Boundary;
- security/TOMs;
- incident pack;
- rights/SAR/erasure system;
- retention schedule;
- OAuth/platform audit;
- sensitive-data policy;
- signed subprocessor/vendor contracts;
- privacy-change gate.

Presentation rule adopted:

**K.I.N.D does not say “we are GDPR compliant.”**

It says, in substance:

“Here is what we process, why we process it, where it goes, the lawful basis and channel rule we apply, the controls we enforce, the rights process we operate, and the evidence we retain.”

Accountability is demonstrated, not asserted.

A particularly valuable enterprise answer now code-proved by Fable:

**The reusable pool is purchase-only. Client CRM data, replies, Meeting-Brief knowledge, credentials and calendar data do not enter the cross-client pool today.**

That should be preserved as an architectural trust boundary.

---

## 16. Client-confidential vs reusable data model

The preferred four buckets are:

### 1. CLIENT-CONFIDENTIAL
Examples: CRM data, replies, Meeting Brief, client-uploaded contacts, credentials, calendar data, campaign strategy.

Rule: tenant-scoped; never cross-client.

### 2. K.I.N.D INDEPENDENTLY SOURCED
Licensed/purchased/public prospect evidence collected independently by K.I.N.D.

Rule: reuse only where privacy law, provider licence, provenance, suppression and contract permit.

### 3. SUPPRESSION / LEGAL EVIDENCE
Minimal records deliberately retained to honour objections / demonstrate compliance / maintain audit evidence.

### 4. AGGREGATE LEARNING
Currently locked. If this ever opens, it must not leak client secrets or identifiable prospect/client information. Contract and privacy design come before capability.

---

## 17. Retention / accuracy / expiry

Do not use one arbitrary retention number for every category.

A real schedule should identify:
- category;
- purpose;
- lawful/legal reason;
- retention period;
- review trigger;
- deletion method;
- exceptions.

Suppression records may intentionally outlive marketing data. Accounting/tax/security/audit evidence can have different clocks.

Separate but related: pooled data can become factually stale. Future Evidence Graph design should include at least:

`observed_at · verified_at · expires_at · source · confidence`

This is both a data-accuracy control and a product-quality improvement.

---

## 18. Website / product positioning history

The earlier public website made the buyer learn too much internal machinery: Milla, Vida, FIGSY, Nexus, enrichment, outreach and compliance.

The website direction developed in this conversation moved to:

`YOU WANT MEETINGS → MEET MILLA → tell her who → approve people → meeting booked`

Important recommendations that led to the new preview:
- Milla-first hero;
- large product demo showing the workflow instead of explaining architecture;
- four core cards rather than a feature dump;
- customer journey focused on finding → approval → conversation → meeting;
- “See it happen” showing a prospect card, why-now, approval and `MEETING BOOKED`;
- simple $4 approved-person pricing language;
- no fake proof / placeholder customer stats on the live site;
- Meeting Brief / calibration copy must not outrun current product capability;
- FIGSY should not be introduced early in the homepage story;
- compliance statements must describe real controls rather than blanket “compliant” claims.

A full standalone Milla website preview HTML was created and is included in this bundle.

---

## 19. Jack & Jill inspiration

Jack & Jill was used as product-design inspiration because the experience is simple and agent-led, not because K.I.N.D should copy recruitment.

Useful transfer principles:
- conversational understanding instead of configuration-heavy ICP setup;
- a structured living brief;
- calibration through normal yes/no use;
- strong signals AND anti-signals;
- simple public character roles;
- explainable structured criteria rather than opaque scoring;
- product demonstrates itself inline.

K.I.N.D translation:
- future **Meeting Brief** as a central living object;
- Milla learns what a good meeting looks like;
- client sees example prospects and corrects direction;
- one client can eventually have multiple Missions;
- future Meeting Graph links source/signal/persona/timing/angle/sequence to `MEETING_BOOKED`.

Critical difference: outbound prospects did not ask to be sold to. Any future buyer-agent/agent-to-agent model must be permissioned and buyer-controlled, not automated spam.

---

## 20. Competitive / aggressive business vision

Fresh market research in the conversation found the generic AI-SDR race already crowded by companies such as Artisan, 11x, Alta, Regie.ai and others. White-label AI SDR models also already exist.

Therefore the aggressive vision is not “best AI SDR”.

Long-term category ambition developed:

**K.I.N.D becomes infrastructure for creating B2B conversations / an Autonomous Meeting Network.**

Near-to-far progression:
1. first 10 clients teach operational edge cases;
2. Vida becomes bounded Level 3 operator;
3. partners/resellers become distribution;
4. Meeting Graph compounds source/signal/campaign/booking learning;
5. future machine-readable Buyer Pack / Offer Passport;
6. eventual permissioned seller-agent ↔ buyer-agent introductions → human meeting.

Memorable strategic frame:

“Don't build the best machine for sending sales emails. Build the infrastructure that makes sales emails increasingly unnecessary.”

This is long-term direction, **not launch scope**.

---

## 21. CRM strategy

The client usually already has a CRM. Current code is more capable than initially assumed: HubSpot/Pipedrive contact/deal push and dedup plumbing exist, but client-side closed-won/lost opportunity intelligence is not yet represented as the future strategy requires.

Future approach:
- CRM remains system of record;
- K.I.N.D becomes system of action;
- first native integration should lean read-only ingestion/segmentation;
- Closed Won can create expansion targeting;
- Closed Lost can create re-engagement candidates, but never automatic outreach eligibility;
- all imported/reactivated records must still pass suppression/jurisdiction/channel rules.

CSV remains an interim bridge.

---

## 22. Social Intent strategy

Social should be an intent layer, not a replacement for data providers.

Future conceptual path:

`SOCIAL SIGNAL → intent classification → person/company resolution → data verification/enrichment → permission policy → FIGSY → campaign → MEETING_BOOKED`

Use authorised APIs/client-owned page activity/lead forms and contractually permitted sources. Avoid browser scraping/session-cookie techniques.

Social engagement does not automatically create permission to email or DM.

This remains post-launch.

---

## 23. Provider / platform policy considerations

Beyond privacy law, K.I.N.D must respect provider/platform terms.

Important current issues:
- PDL actual licence/Order Form for cross-client reuse is a priority legal/commercial check.
- Apollo should not feed a reusable commercial pool without explicit written rights.
- Google Calendar OAuth scopes currently include `calendar.events`, `calendar.readonly`, `userinfo.email`. Fable verified the code but the latest cross-check recommends leaving **scope minimisation OPEN** until broad `calendar.readonly` is justified against narrower availability scopes such as `calendar.freebusy`.
- Google OAuth verification status should be checked in the Cloud Console before client dependency on the integration.
- Future social integrations must follow platform rules/authorised APIs.

---

## 24. Client contract / partner contract issues

Client terms should establish, among other things:
- campaign instruction/authority;
- client's responsibility for product/service claim truth;
- sender identity/postal-address responsibilities where applicable;
- duty to relay complaints/opt-outs received outside K.I.N.D;
- no suppression override;
- warranty that client-uploaded data may lawfully be supplied/processed;
- client termination / data return/delete/retention split;
- controller/processor/controller-to-controller position by activity;
- confidentiality and future aggregate-learning boundaries;
- what AI may and may not promise/commit.

Partner/reseller programme issues include:
- currently partners should not need prospect PII access;
- sanctions screening of clients/partners on a risk basis;
- anti-bribery / conduct policy;
- no kickbacks, fake testimonials, unapproved discounts/terms, public-official inducements, unapproved subcontracting;
- commission/rate rules should be governed from one source.

---

## 25. AI authority ceiling

Milla/Vida should have explicit action classes before autonomy:

- INFORMATIONAL — may be autonomous;
- OPERATIONAL — autonomous inside policy;
- COMMERCIAL COMMITMENT — human approval;
- LEGAL REPRESENTATION — prohibited;
- PRICING CHANGE — approval;
- WARRANTY/GUARANTEE — prohibited.

Today this boundary largely exists de facto because sends/replies/operations remain human-controlled; it should become an explicit future rule before Vida Level 3.

---

## 26. Privacy-change gate for every future feature

This was adopted as a standing architectural/process tripwire.

Any feature involving new:
- data;
- purpose;
- recipient;
- country;
- channel;
- inference;
- provider;

should trigger review before build:

`lawful basis? channel rule? data minimisation? source/licence? recipient/transfer? retention? privacy notice? DPIA impact? contracts? deletion propagation?`

This prevents compliance being rebuilt separately for every new integration.

---

## 27. Latest cross-check corrections to send back to Fable

The most recent external cross-check after Fable's update identified the following refinements:

1. **PDL licence compatibility should be escalated.** Standard current terms appear potentially incompatible with re-serving one cached API record to multiple end-user clients. Review actual K.I.N.D Order Form and obtain explicit written PDL confirmation for the exact cross-client pool architecture before commercial reliance.

2. **Apollo data should be hard-provenanced as non-reusable across clients** unless a separate written agreement explicitly permits the model.

3. Remove the top-line sentence implying that because no outbound was sent, nothing unlawful has happened. Website GA and other upstream personal-data processing already exist. Better: no outbound marketing has yet been sent, giving K.I.N.D the opportunity to remediate outreach defects before first send; that does not prove all existing processing/tracking is compliant.

4. Prompt 24 should treat privacy/refusal responses **provider-specifically**. Hunter's `451 claimed_email` can become DO-NOT-PROCESS because Hunter documents it that way; a generic future provider HTTP 451 must not automatically create the same legal meaning.

5. Controller-to-controller terms must be correct, but a standalone DSA is not necessarily legally mandatory. It can be integrated into the wider client agreement; separate DSA is strong practice.

6. Google OAuth least-privilege conclusion should stay OPEN until broad `calendar.readonly` is justified versus narrower availability scopes.

7. Email-pixel wording should be technically precise: assess the implementation under PECR storage/access rules and avoid overclaiming a universal rule without classifying the mechanism; operationally disabling cold-outbound open tracking remains the simplest/lowest-value-sacrifice path.

---

## 28. What Fable should treat as launch / client-1 priorities

This handoff is not authorisation to build. Priority verification/order should follow the founder's current Ledger/Opus process.

Conceptually the highest-risk items are:
- HC-1 suppression normalisation;
- HC-3 Smartlead compliance bypass before Smartlead unlock;
- C7 human-review fail-open;
- Day-1 PECR bypass;
- US/UK-only allowlist with unknown held;
- truthful website claims / HC-5;
- HC-6 GA/privacy contradiction and tracking decision;
- written UK LIA;
- Article 14 notice/privacy content;
- full CAN-SPAM audit;
- provider licence confirmation (especially PDL cross-client pool rights);
- provider/data-broker/counsel analysis where applicable;
- runtime proof of environment/migrations/integrations;
- Trust Room evidence / client contract role clarity before client #1.

Post-launch architecture should not be allowed to distract from these.

---

## 29. Source-of-truth hierarchy for Fable

When documents disagree, use this order:

1. **Founder rulings** that are explicitly logged/governed.
2. **Current repository/runtime evidence** for what the system actually does.
3. **Latest 19 August Ledger** for the verified map of current state/open work.
4. **Current official regulator/vendor terms** for external law/platform/licence facts, with counsel for legal interpretation.
5. **Generated strategy HTMLs/PDFs** for product direction/history, not as proof of current implementation.
6. Earlier compliance documents are targets/history where the latest ledger says they are not current-state proof.

Never allow a marketing page or AI-generated strategy artifact to override the code/runtime/legal evidence.

---

## 30. Included artifacts in this bundle

See `FILES.txt` and `START_HERE.html`.

The bundle includes:
- all unique K.I.N.D HTML strategy/verification artifacts available in this conversation;
- PDF versions of those HTMLs;
- the latest and earlier pasted Fable/source ledgers;
- compliance V2/V2.1 PDF/DOCX artifacts;
- the earlier source PDF about company compliance;
- website-preview screenshots;
- this master conversation handoff;
- a current cross-check note and artifact manifest.

