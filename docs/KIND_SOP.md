# KIND Agency — Standard Operating Procedure (SOP)

**Version:** 1.0  
**Effective Date:** May 2026  
**Owner:** Operations  

---

## Table of Contents

1. [Overview](#1-overview)
2. [Products & Services](#2-products--services)
3. [The Client Journey — End to End](#3-the-client-journey--end-to-end)
4. [Stage 1: Prospecting & Qualification](#4-stage-1-prospecting--qualification)
5. [Stage 2: Sales & Proposal](#5-stage-2-sales--proposal)
6. [Stage 3: Agreements & Signing](#6-stage-3-agreements--signing)
7. [Stage 4: Onboarding](#7-stage-4-onboarding)
8. [Stage 5: Product Activation](#8-stage-5-product-activation)
9. [Stage 6: Ongoing Management](#9-stage-6-ongoing-management)
10. [Stage 7: Escalation & Issue Resolution](#10-stage-7-escalation--issue-resolution)
11. [Stage 8: Retention, Upsell & Offboarding](#11-stage-8-retention-upsell--offboarding)
12. [POPIA & Data Compliance](#12-popia--data-compliance)
13. [Platform Operations Guide](#13-platform-operations-guide)
14. [Checklists](#14-checklists)

---

## 1. Overview

KIND is an AI-powered business intelligence and growth platform. We help SMEs and growth businesses acquire better leads, deploy intelligent assistants, automate outreach, and access strategic advisory — all from a single managed platform.

### Principles

- **Clarity before complexity.** Every client knows what they're getting, when they're getting it, and what it costs.
- **Documents before delivery.** No product is activated until agreements are signed.
- **Data with dignity.** We comply fully with POPIA. Client data is collected only with consent, stored securely, and never shared without authorisation.
- **Outcomes over activity.** We measure success in results (leads delivered, responses received, bookings made) — not hours logged.

### Tools Used in This SOP

| Tool | Purpose |
|------|---------|
| KIND Admin Portal | Agency-side: manage clients, send documents, monitor products |
| KIND Client Portal | Client-side: view leads, manage settings, sign documents, send messages |
| KIND API (Railway) | Backend powering both portals |
| Supabase | Database and file storage |
| Apollo.io | Lead database and sequencing |

---

## 2. Products & Services

### 2.1 Lead Generation

Targeted B2B lead research and delivery using the KIND intelligence engine.

- **What the client gets:** A verified list of decision-maker contacts matching their Ideal Customer Profile (ICP), delivered in structured batches.
- **How it works:** Client defines ICP in portal → KIND generates and validates leads via Apollo.io → leads delivered to client dashboard.
- **Billing:** Per lead pack or monthly subscription.
- **Activation requirement:** ICP approved by KIND team.

### 2.2 Virtual Assistant (VA)

A dedicated AI-powered assistant handling outreach, follow-up, scheduling, and inbox management.

- **What the client gets:** An AI assistant trained on their brand voice, product/service context, and outreach goals.
- **How it works:** Client provides brand context → KIND configures the VA → VA runs outbound sequences and handles inbound replies.
- **Billing:** Monthly retainer.
- **Activation requirement:** Brand brief, outreach targets approved, sequences drafted.

### 2.3 AI Chatbot

Conversational AI embedded on the client's website or platform to handle enquiries, qualify leads, and book appointments.

- **What the client gets:** A branded chatbot, trained on their FAQs, services, and conversion goals, with a live dashboard.
- **How it works:** Client provides content (FAQs, services, tone) → KIND builds and trains the bot → deploy via embed code → monitor via dashboard.
- **Billing:** Monthly retainer. Setup fee may apply.
- **Activation requirement:** Website access or embed destination confirmed. SLA agreed.
- **SLA document:** Exhibit A – Chatbot SLA governs uptime, response quality, and support terms.

### 2.4 Consulting

Strategic advisory for business growth, AI adoption, and sales process design.

- **What the client gets:** Direct sessions with KIND strategists, tailored recommendations, and implementation support.
- **How it works:** Scope agreed upfront → scheduled sessions → deliverables documented.
- **Billing:** Per session or monthly retainer.
- **Activation requirement:** Scope of work defined in Service Order (Exhibit B).

---

## 3. The Client Journey — End to End

```
PROSPECT
   │
   ▼
QUALIFIED (ICP fit confirmed)
   │
   ▼
PROPOSAL SENT
   │
   ▼
VERBAL CLOSE
   │
   ▼
AGREEMENTS SIGNED (all 5 documents)
   │
   ▼
CLIENT ONBOARDED (portal access granted)
   │
   ▼
PRODUCT ACTIVATED
   │
   ▼
ONGOING DELIVERY
   │
   ├── Monthly check-ins
   ├── Reporting
   └── Upsell / Renewal
```

No product is activated before agreements are signed.  
No agreements are sent before a verbal close.  
No onboarding happens before agreements are fully signed.

---

## 4. Stage 1: Prospecting & Qualification

### 4.1 Lead Sources

- Inbound: website, referrals, social media
- Outbound: KIND's own lead generation and VA product (we eat our own cooking)
- Events, partnerships, and cold outreach

### 4.2 Qualification Criteria

Use this framework to determine whether to invest sales time:

| Criterion | Minimum Threshold |
|-----------|------------------|
| Business size | 5+ employees OR R500k+ annual revenue |
| Industry fit | B2B preferred; B2C with high-volume leads considered |
| Decision-maker | Speaking with owner, director, or department head |
| Budget awareness | Willing to discuss investment (not purely cost-focused) |
| Urgency | Active pain point (growth stalled, leads drying up, time pressured) |
| Tech readiness | Has a website or digital presence |

### 4.3 Disqualify if

- Pure price-shopping with no interest in outcomes
- No decision-making authority and no path to the decision-maker
- Expecting guaranteed results without process compliance
- Business model is unethical, illegal, or violates POPIA

### 4.4 Discovery Call Agenda (30–45 min)

1. **Welcome & context** — who we are, what KIND does (5 min)
2. **Their situation** — what's working, what isn't, what they've tried (10 min)
3. **Their goal** — what success looks like in 90 days (5 min)
4. **Product fit** — which KIND product(s) apply and why (10 min)
5. **Next step** — proposal call or send written proposal (5 min)
6. **Pricing orientation** — give a range, not a fixed price, to gauge reaction

**Discovery Call Notes template:**

```
Company:
Contact:
Title:
Date:
Pain point:
Goal in 90 days:
Current tools/attempts:
Product fit:
Budget reaction:
Next step:
Follow-up date:
```

---

## 5. Stage 2: Sales & Proposal

### 5.1 Proposal Structure

A KIND proposal has three sections:

1. **Their situation** — reflect what you heard; show you listened
2. **Our recommendation** — product(s), rationale, scope, timeline
3. **Investment** — pricing, payment terms, what's included and excluded

Keep it under 5 pages or 10 slides. Clarity over length.

### 5.2 Pricing Principles

- Always tie price to outcome value, not hours
- Offer three tiers where relevant (starter / growth / enterprise)
- Include what happens if they don't act (cost of inaction)
- Never discount without a reason; never apologise for pricing

### 5.3 Proposal Delivery

- Send via email with a verbal walk-through booked (don't email and hope)
- Follow up within 48 hours if no response
- After second follow-up with no response: mark as stalled, schedule a 30-day re-engage

### 5.4 Verbal Close Checklist

Before moving to agreements, confirm all of the following:

- [ ] Client has confirmed they want to proceed
- [ ] Product(s) agreed and scope clear
- [ ] Pricing agreed (including setup fees if any)
- [ ] Payment method discussed (EFT / card via Paystack)
- [ ] Start date agreed
- [ ] Key contacts identified (technical, billing, day-to-day)

---

## 6. Stage 3: Agreements & Signing

### 6.1 Overview

All five agreement documents must be signed before onboarding begins. These are sent from the KIND Admin Portal and signed via the KIND Client Portal.

### 6.2 The Five Documents (in signing order)

| # | Document | Purpose | When to Send |
|---|---------|---------|-------------|
| 1 | **KIND Master Services Agreement (MSA)** | Governs the entire relationship: terms, IP, liability, termination | First — sets the legal foundation |
| 2 | **KIND Client Offer Document** | Specific commercial terms: products, pricing, payment, scope | After MSA — locks in the deal |
| 3 | **Exhibit A — Chatbot SLA** | Uptime, support, performance standards for the chatbot | Only if chatbot is included |
| 4 | **Exhibit B — Service Order** | Specific deliverables, timelines, and owner for consulting work | Only if consulting is included |
| 5 | **KIND POPIA Compliant Process** | Documents how KIND and the client handle personal data | Always — required by law |

**Note:** Documents 3 and 4 are conditional. If the client is only doing lead gen or VA, they sign 1, 2, and 5.

### 6.3 Sending Documents (Admin Portal)

1. Log in to KIND Admin Portal
2. Navigate to the client's profile
3. Go to **Documents**
4. Select the applicable templates from the template library
5. Assign to the client — this makes them visible in their portal
6. Notify the client via the **Messages** tab: "Your agreements are ready to sign in your portal."

### 6.4 Client Signing Flow (Client Portal)

1. Client logs in to KIND Client Portal
2. A banner appears: **"Action Required: Please sign your agreements before your service can begin."**
3. Client navigates to **Documents**
4. Client reviews each document (PDF displayed in-browser)
5. Client types their name and clicks **Sign**
6. Signature is recorded with timestamp and IP address (ECTA-compliant)
7. Signed status is updated in admin portal automatically

### 6.5 Blocking Rule

Products are gated in the client portal until all required documents are signed. The client will see a lock on any product feature with the message: "Complete your agreements to unlock this feature."

### 6.6 What if a Client Delays Signing?

- Day 1 after sending: automated reminder from system
- Day 3: personal message from KIND team via portal messaging
- Day 7: phone call to confirm no concerns; escalate to senior if needed
- Day 14: if no signature, pause onboarding and flag for commercial review

### 6.7 Legal Basis for Electronic Signatures

KIND uses electronic signatures under the **Electronic Communications and Transactions Act (ECTA) 25 of 2002**, which recognises digital signatures as legally binding in South Africa. Each signature captures:

- Signer's name (typed)
- Timestamp
- IP address
- Document version

---

## 7. Stage 4: Onboarding

Onboarding begins **the day after all required agreements are signed**.

### 7.1 Onboarding Kickoff (Day 1–2)

**Admin Actions:**
- [ ] Confirm all required documents are signed in portal
- [ ] Activate client account (set status to `active` if not already)
- [ ] Send welcome message via portal: introduce the team, what happens next, timelines
- [ ] Schedule kickoff call (30 min)

**Kickoff Call Agenda:**
1. Introductions
2. What they've signed up for (recap of products)
3. What we need from them (inputs required per product — see below)
4. Timeline to first delivery
5. Communication norms (how to reach KIND, expected response times)
6. Q&A

### 7.2 Inputs Required Per Product

| Product | Client Must Provide |
|---------|-------------------|
| Lead Generation | ICP details (industry, company size, location, titles, pain points) — entered in portal |
| Virtual Assistant | Brand voice guide, product/service description, target audience, outreach goal |
| Chatbot | FAQ document, services list, brand tone, website embed access |
| Consulting | Goals, current situation summary, availability for sessions |

### 7.3 ICP Setup (Lead Generation)

1. Client logs into portal → **Leads** → **Define Your ICP**
2. Fills in ICP form: industry, size, location, job titles, keywords
3. Saves as draft → KIND team reviews
4. KIND approves or requests changes via messages
5. Once approved, KIND generates first lead batch
6. Client notified via portal message

### 7.4 Onboarding Completion Checklist

- [ ] All agreements signed
- [ ] Kickoff call complete
- [ ] All required inputs received per product
- [ ] ICP submitted and approved (lead gen clients)
- [ ] First delivery timeline confirmed and communicated
- [ ] Client knows how to use the portal (send messages, view leads, check documents)

---

## 8. Stage 5: Product Activation

### 8.1 Lead Generation Activation

**Trigger:** ICP approved in admin portal  
**Timeline:** First lead batch within 3–5 business days of ICP approval

Steps:
1. KIND team runs lead generation using Apollo.io against approved ICP
2. Leads are verified (email validity, relevance check)
3. Leads uploaded and visible in client portal under **Leads**
4. Client notified via portal message: "Your first lead batch is ready."
5. Client reviews leads and provides feedback
6. Next batch scheduled per agreed cadence

**Quality standard:** Minimum 80% email validity on every batch. Leads that bounce are replaced.

### 8.2 Virtual Assistant Activation

**Trigger:** Brand brief and outreach context received  
**Timeline:** VA live within 5–7 business days

Steps:
1. KIND configures VA with client's brand voice and outreach goals
2. Sequences drafted and shared with client for approval
3. Client approves via portal message (or requests edits)
4. VA activated — outreach begins
5. Weekly performance summary sent to client

**Important:** Client must not run parallel outreach to the same contacts during the VA engagement to avoid duplicate contact.

### 8.3 Chatbot Activation

**Trigger:** Content received + Exhibit A – Chatbot SLA signed  
**Timeline:** Chatbot live within 7–10 business days

Steps:
1. KIND builds and trains chatbot on client content
2. Internal QA: test 20+ conversation scenarios
3. Client UAT: client tests the bot and approves
4. Embed code provided to client's developer or pasted directly
5. Chatbot goes live
6. KIND monitors for 7 days post-launch; issues resolved within SLA terms

**Embed code delivery:** Sent via portal message with integration instructions.

### 8.4 Consulting Activation

**Trigger:** Exhibit B – Service Order signed  
**Timeline:** First session within 5 business days

Steps:
1. Confirm session schedule with client
2. Send pre-session brief (what to prepare, what to bring)
3. Conduct session
4. Send session notes and action items within 24 hours via portal message
5. Track deliverables against Service Order

---

## 9. Stage 6: Ongoing Management

### 9.1 Communication Standards

| Channel | Use Case | Response Time |
|---------|---------|--------------|
| KIND Portal (Messages) | Day-to-day updates, lead delivery, documents | Within 24 hours (business days) |
| Email | Billing, formal notices, escalations | Within 24 hours |
| Phone/Video | Monthly check-ins, escalations, strategy sessions | As scheduled |

**Do not use WhatsApp, personal email, or SMS for business communications.** All service-related communication must be on record in the portal.

### 9.2 Monthly Check-in (All Clients)

Schedule a 30-minute call each month to cover:

1. Results to date (leads generated, VA performance, chatbot stats, consulting outcomes)
2. Client satisfaction — any concerns?
3. Upcoming activities this month
4. Any product changes or upsell opportunities
5. Admin: billing, renewals

Send a written summary via portal message after every call.

### 9.3 Lead Generation — Ongoing

- Deliver leads per agreed cadence (weekly / bi-weekly / monthly)
- Send notification in portal when each batch is ready
- Review ICP quarterly with client — update if targeting needs to shift
- Track: total leads delivered, email validity rate, client feedback score

### 9.4 VA — Ongoing

- Weekly performance report: emails sent, reply rate, meetings booked
- Optimise sequences based on reply data (A/B test subject lines monthly)
- Escalate warm replies to client within 2 hours during business hours
- Review and refresh sequences every 30 days

### 9.5 Chatbot — Ongoing

- Monitor for failed conversations weekly
- Update training data when client adds new services or FAQs
- Monthly performance report: conversations handled, handoff rate, resolution rate
- Proactively flag conversation quality issues before client notices

### 9.6 Consulting — Ongoing

- Deliver session notes within 24 hours of each session
- Track action item completion across sessions
- Quarterly: reassess scope against Exhibit B; amend Service Order if needed

---

## 10. Stage 7: Escalation & Issue Resolution

### 10.1 Escalation Levels

| Level | Description | Handled By | Target Resolution |
|-------|------------|-----------|-----------------|
| L1 | General query, minor delay | Account Manager | 24 hours |
| L2 | Product underperformance, client complaint | Senior + Account Manager | 48 hours |
| L3 | System failure, data breach, legal dispute | Director + Technical Lead | Immediate / 4 hours |

### 10.2 L1 — General Issues

Examples: lead batch delayed, chatbot gave a wrong answer, VA reply missed.

Process:
1. Client messages via portal
2. Account Manager acknowledges within 4 hours
3. Investigates and resolves within 24 hours
4. Documents resolution in portal message thread

### 10.3 L2 — Performance Issues

Examples: email open rates below threshold, chatbot not converting, leads not matching ICP.

Process:
1. Account Manager flags to Senior
2. Root cause analysis within 24 hours
3. Remediation plan shared with client within 48 hours
4. If within SLA: fix at no cost. If outside SLA: commercial conversation.
5. Follow-up check 7 days after fix

### 10.4 L3 — Critical Incidents

Examples: system outage, data leak, legal threat from client.

Process:
1. Director notified immediately by phone
2. Client contacted within 1 hour
3. Incident report drafted within 4 hours
4. If data breach: POPIA breach notification process triggered (see Section 12)
5. Post-incident review within 5 business days

### 10.5 Client Complaints — Formal

If a client issues a formal written complaint:
1. Acknowledge in writing within 24 hours
2. Investigate (don't dismiss)
3. Respond in writing with findings and resolution within 5 business days
4. Escalate to legal if complaint mentions litigation

---

## 11. Stage 8: Retention, Upsell & Offboarding

### 11.1 Retention Triggers

Watch for these signals and act proactively:

| Signal | Action |
|--------|--------|
| Client hasn't logged into portal in 14 days | Send check-in message |
| Client asks about pricing/value | Bring forward monthly call |
| Renewal date within 30 days | Start renewal conversation now |
| Client mentions a competitor | Schedule a value conversation immediately |
| Two consecutive months below target | Proactive remediation call |

### 11.2 Upsell Opportunities

Look for natural product expansions:

- Lead gen clients with lots of leads → propose VA to handle outreach
- VA clients getting replies → propose chatbot to handle website enquiries
- Chatbot clients → propose consulting to optimise conversion funnel
- All clients → quarterly strategy sessions (consulting)

**Rule:** Never pitch an upsell unless the client is getting value from their current product first.

### 11.3 Renewal Process

- 60 days before renewal: review performance data; prepare renewal brief
- 30 days before: renewal call — recap value, present next 6 months
- 14 days before: send renewed Offer Document for signing
- Renewal requires: updated Offer Document signed + payment confirmation

### 11.4 Offboarding

If a client does not renew or requests termination:

1. Confirm termination request in writing (portal message)
2. Check MSA for notice period (typically 30 days)
3. Confirm final billing — no refunds for mid-month cancellation unless otherwise agreed in Offer Document
4. Disable product access on expiry date
5. Data retention: retain client data for 12 months per POPIA, then delete
6. Send offboarding summary: what was delivered, final stats, any outstanding items
7. Archive client in admin portal (do not delete — retain for legal records)
8. Send exit survey (optional but valuable)

---

## 12. POPIA & Data Compliance

### 12.1 Principles

KIND processes personal information in accordance with POPIA (Protection of Personal Information Act 4 of 2013). All team members are responsible for compliance.

The eight conditions of lawful processing (we follow all eight):

1. **Accountability** — KIND owns compliance
2. **Processing limitation** — we collect only what we need
3. **Purpose specification** — data is used only for the stated purpose
4. **Further processing limitation** — data is not used for incompatible purposes
5. **Information quality** — we keep data accurate and up to date
6. **Openness** — we are transparent about how we use data
7. **Security safeguards** — data is stored securely (Supabase, encrypted at rest)
8. **Data subject participation** — individuals can access, correct, or delete their data

### 12.2 Client Data Handling

- Client business data (name, email, company) stored in Supabase
- Lead data (third-party contact details) stored in Supabase, shared only with the client who commissioned the research
- No client data is sold, shared with third parties, or used for KIND marketing without consent
- Clients consent to KIND's POPIA Compliant Process document at onboarding (Document 5)

### 12.3 Lead Data

Leads sourced via Apollo.io are publicly available professional data (LinkedIn-sourced). Clients are responsible for ensuring their use of lead data complies with POPIA and applicable spam laws.

Client obligations (documented in POPIA Compliant Process):
- Must have a lawful basis for contacting leads
- Must provide an opt-out mechanism in all outreach
- Must not contact individuals on do-not-contact lists

### 12.4 Data Breach Response

If a data breach is discovered or suspected:

1. **Contain** — isolate affected systems immediately
2. **Assess** — determine what data was affected and how many individuals
3. **Notify KIND Director** — within 1 hour
4. **Notify Regulator** — notify the Information Regulator within 72 hours if the breach is likely to cause harm
5. **Notify Affected Individuals** — as soon as reasonably possible
6. **Document** — full incident report within 48 hours
7. **Review** — security review within 5 business days; remediation plan

### 12.5 POPIA Document

The **KIND POPIA Compliant Process** document (signed at onboarding) covers:
- What data KIND collects and why
- How data is stored and secured
- Client's obligations as a responsible party for leads
- Data retention periods
- How to submit a data access or deletion request

---

## 13. Platform Operations Guide

### 13.1 Admin Portal — Day-to-Day Tasks

**Viewing clients:**  
Dashboard → Clients → select client for full profile view

**Sending documents:**  
Client profile → Documents → Select from template library → Assign to client → Notify via Messages

**Approving an ICP:**  
Client profile → Leads / ICP tab → Review ICP → Approve or Request Changes

**Generating leads:**  
After ICP is approved → Generate (triggers Apollo.io query) → Results appear in client's portal

**Sending a message:**  
Client profile → Messages → Compose → Send (client sees this in their portal)

**Checking subscription status:**  
Client profile → Subscription tab → Trial / Active / Cancelled

### 13.2 Client Portal — What Clients Can Do

| Feature | Where |
|---------|-------|
| View and sign agreements | Documents tab |
| Define or update ICP | Leads tab |
| View lead batches | Leads tab |
| Message KIND team | Messages tab |
| Update business profile | Settings tab |
| View subscription status | Dashboard / Settings |

### 13.3 Admin — Quick Troubleshooting

| Issue | Check |
|-------|-------|
| Client can't log in | Supabase auth — confirm email is verified |
| Documents not showing | Admin: confirm documents assigned to client; Client: refresh portal |
| ICP Generate button missing | Confirm ICP status is `draft` or `approved` in database |
| Messages not sending | Confirm `client_messages` table migration has run in Supabase |
| Settings not saving | Check for error message displayed under save button |
| Admin dashboard showing 0 clients | Confirm `SUPABASE_SERVICE_ROLE_KEY` set in Vercel kind-admin |

---

## 14. Checklists

### 14.1 New Client Master Checklist

**Sales**
- [ ] Discovery call complete; notes documented
- [ ] Proposal sent and walked through
- [ ] Verbal close confirmed
- [ ] Products, scope, and pricing agreed

**Agreements**
- [ ] MSA sent and signed
- [ ] Offer Document sent and signed
- [ ] Chatbot SLA sent and signed (if applicable)
- [ ] Service Order sent and signed (if applicable)
- [ ] POPIA Process document sent and signed

**Onboarding**
- [ ] Client portal account active
- [ ] Welcome message sent via portal
- [ ] Kickoff call held
- [ ] Required inputs received per product
- [ ] ICP submitted (lead gen clients)
- [ ] ICP approved by KIND team

**Activation**
- [ ] First lead batch delivered (lead gen)
- [ ] VA sequences approved and live (VA)
- [ ] Chatbot tested, approved, and deployed (chatbot)
- [ ] First consulting session scheduled (consulting)

**Ongoing**
- [ ] Monthly check-in scheduled
- [ ] Reporting cadence confirmed
- [ ] Renewal date logged

---

### 14.2 Monthly Delivery Checklist

- [ ] Lead batch delivered on schedule
- [ ] VA performance report sent
- [ ] Chatbot monthly report sent
- [ ] Consulting session notes sent
- [ ] Monthly check-in call held
- [ ] Summary message sent via portal after call
- [ ] Any issues from last month resolved and closed

---

### 14.3 Offboarding Checklist

- [ ] Termination confirmed in writing
- [ ] Notice period per MSA observed
- [ ] Final billing confirmed
- [ ] Product access disabled on exit date
- [ ] Data retention policy applied (12 months)
- [ ] Offboarding summary sent to client
- [ ] Client archived in admin portal
- [ ] Exit survey sent (optional)

---

### 14.4 Data Breach Response Checklist

- [ ] Systems contained
- [ ] Breach scope assessed
- [ ] KIND Director notified within 1 hour
- [ ] Information Regulator notified within 72 hours (if harm likely)
- [ ] Affected individuals notified
- [ ] Incident report completed within 48 hours
- [ ] Security review completed within 5 business days

---

*This SOP is a living document. Review quarterly and update when processes, products, or legal requirements change.*

*Questions or suggested improvements: raise via internal portal message to Operations.*
