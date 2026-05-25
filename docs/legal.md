# K.I.N.D — Legal
*Last updated: 25 May 2026*

---

## TABLE OF CONTENTS

1. [Apollo.io ToS — Data Licensing & Managed Service Structure](#1-apolloio-tos--data-licensing--managed-service-structure)

---

## 1. APOLLO.IO ToS — DATA LICENSING & MANAGED SERVICE STRUCTURE

**Prepared for: Legal counsel**
**Purpose: Instruction to lawyer — data licensing and managed service structure**

---

### What Apollo.io Is

Apollo.io is a B2B contact intelligence platform. It holds a database of approximately 250 million professional contacts — names, job titles, company names, email addresses, LinkedIn URLs, phone numbers, and company data. Businesses subscribe to Apollo to access this data for sales prospecting.

Apollo offers:
- A web interface (app.apollo.io) for manual searching
- An API for programmatic access to the same data
- Plans ranging from free (no API access) to Professional ($99/mo) and Enterprise

K.I.N.D uses Apollo's **API** on the Professional plan.

---

### What Apollo's ToS Says (The Relevant Parts)

Apollo's Terms of Service (apollo.io/terms) contain restrictions standard across data intelligence platforms. The key provisions relevant to K.I.N.D:

**Data use restrictions:**
- Data accessed through Apollo may only be used for the subscriber's own internal business development purposes
- Subscribers may not resell, sublicense, redistribute, or otherwise transfer Apollo data to third parties
- Subscribers may not use Apollo data to build or operate a competing data product

**Third-party use:**
- The account holder (K.I.N.D) is the subscriber. Apollo's contract is with K.I.N.D, not with K.I.N.D's clients.
- Apollo's ToS do not contemplate a managed service model where a single subscriber uses the API to service multiple end clients

**What Apollo explicitly prohibits:**
- Giving clients a CSV of Apollo contacts (data reselling)
- Building a product that re-surfaces Apollo data as its own database
- Allowing multiple companies to query Apollo through a single API key

> **Note to lawyer:** The exact current wording of Apollo's ToS must be reviewed directly at apollo.io/terms. ToS documents change. The principles here are accurate as of 25 May 2026 but must be verified against the live document before forming any legal opinion.

---

### What K.I.N.D Actually Does

This is the critical distinction that determines whether K.I.N.D is in breach.

**What K.I.N.D does:**
1. Client signs up to K.I.N.D and defines an Ideal Customer Profile (ICP) — the types of companies and job titles they want to reach
2. K.I.N.D's platform calls Apollo's API using K.I.N.D's own API key
3. Apollo returns a list of matching contacts
4. K.I.N.D scores those contacts using AI (0–100 fit score)
5. Contacts are stored in K.I.N.D's own database (Supabase, Cape Town) as "leads"
6. K.I.N.D's AI agent (FIGSY) sends outreach emails **on behalf of the client** — from the client's domain, referencing the client's product
7. When a lead replies positively, the client is notified
8. The client never directly downloads or receives a raw data export of Apollo contact records — they receive a notification that a specific named person has expressed interest

**What K.I.N.D does NOT do:**
- Clients cannot export a bulk list of raw Apollo contacts — they can export their own K.I.N.D leads (K.I.N.D's processed records, not Apollo raw data)
- Clients do not have direct access to Apollo's database
- K.I.N.D does not licence or resell Apollo API access to clients
- K.I.N.D does not charge clients per Apollo contact — it charges for the managed outreach service

---

### The Legal Question — Managed Service vs Data Reselling

**The argument that K.I.N.D is NOT reselling data**

K.I.N.D is a managed outreach service. The product K.I.N.D sells is not "Apollo contacts" — it is the outcome of a complete outreach process: ICP definition, lead identification, AI scoring, personalised email sequences, reply management, and meeting booking.

Apollo is one of several inputs into that service, in the same way that:
- A recruitment agency uses LinkedIn to find candidates but does not "resell LinkedIn data" — it sells a hiring service
- A PR firm uses a media database to pitch journalists but does not "resell media database contacts" — it sells a PR service
- A digital marketing agency uses Google Ads data to target audiences but does not "resell Google data" — it sells an advertising service

In each case, a third-party data source is used as infrastructure to deliver a service. The end client receives the **outcome** (a shortlisted candidate, a placed story, a booked meeting), not the underlying data.

**The "qualified lead" is K.I.N.D's product.** A contact becomes a K.I.N.D lead only after:
- Being matched against the client's ICP (K.I.N.D's process)
- Being scored by K.I.N.D's AI (K.I.N.D's IP)
- Being contacted via K.I.N.D's outreach engine (K.I.N.D's work)
- Responding positively (market validation)

What the client receives is not "an Apollo contact" — it is a validated, scored, contacted, and interested prospect. That is a substantially transformed work product.

**The argument that K.I.N.D IS reselling data (the risk)**

Apollo could argue:
- K.I.N.D is using one API subscription to service multiple paying clients — effectively giving multiple companies access to Apollo's database through a single account
- Each K.I.N.D client benefits from Apollo's data without paying Apollo directly
- The "service wrapper" does not change the underlying economic reality: K.I.N.D monetises Apollo data by charging clients

This is the legitimate risk. Apollo's ToS are designed to ensure every company using their data pays for it. K.I.N.D currently has one Apollo subscription covering potentially hundreds of client ICPs. From Apollo's perspective, each of those clients should arguably have their own subscription.

---

### How Similar Companies Handle This

**Clay.com** — a data enrichment platform using Apollo (among 50+ sources) to enrich contact records for clients. Clay has negotiated formal data partnership agreements with Apollo and is listed as an Apollo integration partner.

**Instantly.ai, Smartlead.ai, Lemlist** — outreach automation platforms. They do not source leads from Apollo — they require clients to bring their own contact lists. This sidesteps the data question entirely.

**SDR-as-a-service agencies** (human-staffed) — agencies running outbound on behalf of clients routinely use Apollo under a single subscription. The industry standard is that the agency is the "business" using Apollo for its own purpose (serving clients is the agency's business). Apollo's commercial team is aware this is common practice.

**The key insight:** There is a spectrum. At one end, raw data reselling is clearly prohibited. At the other end, a fully managed service with a single API key is industry-standard practice. K.I.N.D sits toward the managed service end of that spectrum.

---

### The Four Structural Options

#### Option A — Current Structure (single K.I.N.D API key)
K.I.N.D holds one Apollo Professional subscription. All client ICPs run through this key.

**Risk:** Apollo could terminate K.I.N.D's account if they determine this violates ToS. Low probability at small scale (10–20 clients). Higher probability as K.I.N.D grows.

**Mitigation:** Strong contractual language in K.I.N.D's client agreements clarifying K.I.N.D as a managed service provider, not a data reseller.

---

#### Option B — Apollo Partner Programme *(recommended path)*
Apollo has a formal partner/integration programme. K.I.N.D applies to become a listed Apollo partner. This grants explicit permission to use Apollo data in a multi-client managed service context, typically at a negotiated commercial rate.

This is the cleanest solution. Apollo has approved this use case for other companies. It converts a ToS risk into a commercial agreement.

**Action:** Contact Apollo's partnerships team — partnerships@apollo.io or via the integration partner page on their website.

---

#### Option C — Each Client Provides Their Own Apollo Key
K.I.N.D's platform accepts a client's own Apollo API key for running their ICP searches. K.I.N.D is then a pure software layer — it never holds Apollo data on behalf of clients, it executes searches using each client's own licensed access.

**Risk eliminated entirely.** Each client has their own Apollo contract. K.I.N.D is purely a software/automation layer.

**Downside:** Friction in onboarding. Clients need to buy an Apollo subscription separately (~$49–99/mo). Increases their cost. May reduce conversion. However, this is how many enterprise-grade outreach platforms operate.

**This is the most legally clean option at scale.**

---

#### Option D — Multiple Apollo Accounts (one per client)
K.I.N.D manages one Apollo account per client, billed through K.I.N.D. Each account is contractually associated with one client's use.

**Practically complex.** Does not necessarily solve the ToS issue — Apollo's terms bind the account holder (K.I.N.D), not the end beneficiary.

---

### Questions to Ask the Lawyer

Provide this document and ask:

1. **Does K.I.N.D's current model — single Apollo API key, multi-client managed outreach service — constitute "reselling" or "sublicensing" Apollo data under standard software ToS interpretation?**

2. **What contractual language should K.I.N.D include in its client agreements to clearly establish K.I.N.D as a managed service provider, not a data reseller?** Specifically: should the agreement explicitly state that clients are not receiving Apollo data, but rather K.I.N.D's processed work product?

3. **What is the legal exposure if Apollo terminates K.I.N.D's account for ToS violation?** What notice periods apply? What data continuity obligations would K.I.N.D have to its own clients?

4. **Is Option B (Apollo Partner Programme) preferable to Option C (client-held API keys) from a legal risk perspective?** Does the partner programme agreement override the standard ToS restrictions?

5. **Should K.I.N.D pursue Option C (client API keys) from the start, even at the cost of onboarding friction, given it eliminates this risk entirely?**

6. **What data processing obligations arise from K.I.N.D storing Apollo contact records (names, emails, job titles) in its own database (Supabase, Cape Town)?** Specifically under POPIA (SA), GDPR (UK/EU), and CAN-SPAM (US).

7. **Does Apollo's data include any EU/UK personal data that would require a Data Processing Agreement (DPA) between K.I.N.D and Apollo?**

---

### K.I.N.D's Current Practical Exposure

| Scale | Risk level | Notes |
|---|---|---|
| Under 10 clients, under 500 leads | Negligible | Apollo's enforcement is commercial, not legal. Not actively monitoring small accounts at this stage. |
| 50+ clients running large ICPs | Low–Medium | Apollo's API monitoring may flag unusual usage patterns. A single account generating 50+ simultaneous ICP searches across different company profiles looks unusual. Apollo may contact K.I.N.D to discuss commercial terms. |
| 200+ clients | Material | Apollo terminating K.I.N.D's API access would shut down the core product for all clients simultaneously. Formal resolution required before reaching this scale. |

**Recommended action timeline:**

| When | Action |
|---|---|
| Now | Review and adjust client agreement language (lawyer: 1–2 hours) |
| Before 50 clients | Contact Apollo partnerships team — begin partner programme discussions |
| Before 100 clients | Either partner agreement signed OR client API key model implemented |

---

### The Bottom Line

K.I.N.D's model is defensible as a managed service, not a data reseller. The industry has precedent. The risk is real but manageable with the right structure. The cleanest resolution is a formal Apollo partner agreement, which converts the ToS risk into a commercial relationship.

This should not block the launch. It must be on the legal checklist before reaching 50 clients.

---

*This document is a briefing for legal counsel. It does not constitute legal advice. All ToS references must be verified against current Apollo.io terms before any legal opinion is formed.*

*Last updated: 25 May 2026*
