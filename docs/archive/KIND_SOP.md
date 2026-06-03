# KIND AI Platform — Standard Operating Procedure

**Version:** 1.1 · **Effective:** May 2026 · **Updated:** 18 May 2026 · **Owner:** Operations

---

## 1. Overview

This SOP covers the end-to-end operating process for KIND AI — from prospect to signed client to live deployment. It is structured in phases so any team member can pick up any stage and execute it without ambiguity.

---

## 2. Client Lifecycle Phases

```
Lead → Discovery Call → Proposal → Order Form → Signature → Payment → Onboarding → Active
```

---

## 3. Phase 1: Lead Generation & Qualification

**Owner:** Sales / Founder  
**Trigger:** Inbound inquiry, Apollo campaign response, referral, or landing page sign-up

### 3.1 Initial Qualification Checklist

Before booking a discovery call, confirm:

- [ ] Company is B2B (sells products/services to other businesses)
- [ ] Company size: 5+ employees or R1M+ annual revenue
- [ ] Has a defined sales function (even if informal)
- [ ] Located in South Africa, Africa, or EMEA (primary market)
- [ ] Use case maps to at least one KIND product

**Disqualify if:** B2C only, under 6 months old with no revenue, or requiring custom dev outside scope.

### 3.2 CRM Entry

Log the prospect in your CRM with:
- Full name + title
- Company + website
- Country
- Source (Apollo / referral / inbound / landing page)
- Products interested in
- Next action + due date

---

## 4. Phase 2: Discovery Call

**Duration:** 30–45 minutes  
**Goal:** Understand the problem, validate fit, identify which products apply

### 4.1 Discovery Question Framework

**Business context:**
1. Walk me through how you currently find and qualify new clients.
2. What does your sales team look like today?
3. What's your average deal size and sales cycle length?

**Pain identification:**
4. Where does your pipeline break down most often — top of funnel, conversion, or speed?
5. Have you tried outbound before? What happened?
6. What does your follow-up process look like?

**Fit validation:**
7. What markets and job titles are you trying to reach?
8. Do you have a CRM? Which one?
9. What's your budget for sales infrastructure this year?

### 4.2 Discovery Call Outcome

| Outcome | Next Step |
|---------|-----------|
| Strong fit — ready to move | Send proposal within 24h |
| Good fit — needs internal sign-off | Send proposal + schedule follow-up in 5 days |
| Weak fit — wrong stage/size | Refer to a more appropriate solution |
| No fit | Politely close and log reason |

---

## 5. Phase 3: Proposal

**Owner:** Sales / Founder  
**SLA:** Sent within 24 hours of a positive discovery call

### 5.1 Proposal Contents

1. **Executive summary** — one paragraph on the client's specific problem and KIND's proposed solution
2. **Recommended product(s)** — Lead Gen / FIGSY Bundle / VA / Chatbot, with tier rationale
3. **Pricing breakdown** — monthly vs annual options, what's included per tier
4. **Timeline** — onboarding week, first leads delivered, first campaign live
5. **Next steps** — "Sign Order Form → Activate payment → We start"

### 5.2 Pricing Reference (May 2026)

| Product | Starter | Advanced | Enterprise |
|---------|---------|----------|------------|
| Lead Gen only | $500/mo | $1,200/mo | Custom |
| Lead Gen + FIGSY | $700/mo | $1,500/mo | Custom |
| FIGSY add-on (existing clients) | +$300/mo | +$800/mo | — |

> All prices in USD. ZAR billing applies exchange rate at date of invoice.

---

## 6. Phase 4: Order Form → Signature

**Owner:** Admin (or Founder for first 10 clients)  
**Platform:** KIND Admin Portal → Clients → [Client] → Send Order Form

### 6.1 Creating the Order Form

1. Log into the Admin Portal (`admin.get-kind.com`)
2. Navigate to **Clients** → find the client record
3. Click **Send Order Form**
4. Fill in:
   - Products and tier for each service
   - Billing interval (monthly / annual)
   - Contract start date
   - Scope notes (any custom terms or deliverables)
5. Review the auto-calculated monthly total
6. Click **Send Order Form to Client** — this sets status to `awaiting_signature` and emails the client a link to their Documents tab

### 6.2 What the Client Sees

The client logs into their portal and navigates to **Documents**. They see:
- Their specific Order Form (products, pricing, scope, start date)
- An optional "View Terms & Conditions" tab that expands to show all 5 agreement documents with direct PDF links
- A signing section requiring their full legal name + agreement checkbox

### 6.3 Legal Validity

The Order Form incorporates all agreement documents by reference (MSA, POPIA Process, Chatbot SLA, Order Form Ts&Cs, Privacy Policy). Under ECTA (Electronic Communications and Transactions Act), one digital signature on the Order Form binds the client to all incorporated terms. The platform records:
- Full name as typed
- IP address at time of signing
- Exact timestamp (UTC)

### 6.4 After Signature

- Dashboard banner changes to amber: **"Complete payment to activate your account"**
- Status updates to `awaiting_payment`
- Admin is notified (check Admin → Clients)

---

## 7. Phase 5: Payment Activation

**Platform:** KIND Client Portal → Billing tab  
**Processor:** Paystack (ZAR billing, USD pricing)

### 7.1 Client Payment Flow

1. Client navigates to **Billing** in their portal
2. Selects product and tier matching the signed Order Form
3. Clicks **Upgrade** — redirected to Paystack checkout
4. Completes payment via card or EFT
5. Redirected back to `/billing/confirm` — system verifies the payment reference automatically
6. Subscription activates, dashboard banner clears

### 7.2 Trial Clients

Clients on a 14-day trial see a countdown banner. At day 11 (≤3 days remaining) the banner turns red. On day 14, access continues but billing features are gated until payment completes.

### 7.3 Failed Payment

If payment fails:
1. Client remains on `awaiting_payment` status
2. Banner persists — direct them to Billing to retry
3. If unresolved after 7 days, escalate with a direct call

---

## 8. Phase 6: Onboarding (Days 1–5 of Subscription)

**Owner:** Operations / Delivery  
**Goal:** Client is live with at least one active ICP and first lead batch ready within 5 business days

### 8.1 Day 1: Account Setup

> **Note:** Clients now self-onboard. They sign up at get-kind.com, land directly on /onboard (no email confirmation required), and create their own account. The steps below apply to AE-assisted clients where you are walking someone through the process.

- [ ] Confirm Supabase client record exists with correct user_id (auto-created on signup)
- [ ] Confirm trial subscription row is active in DB (auto-created on onboard)
- [ ] Welcome email is auto-sent via Resend on onboard completion
- [ ] Schedule onboarding call (60 min) for Day 2 or 3

### 8.2 Onboarding Call Agenda (60 min)

| Time | Topic |
|------|-------|
| 0–10 min | Portal walkthrough — dashboard, sidebar, key features |
| 10–25 min | Build ICP together — industries, titles, seniority, geographies |
| 25–40 min | Review POPIA process — explain consent filter, opt-out blocklist |
| 40–55 min | Set expectations — lead volume per week, scoring thresholds |
| 55–60 min | Q&A + next steps |

### 8.3 Day 3–5: First Lead Batch

- [ ] Activate ICP in Lead Gen → ICP Builder
- [ ] Run Apollo search against activated ICP
- [ ] Import consented leads (Apollo consent filter = ON)
- [ ] Leads appear in client Lead Gen pipeline with scores
- [ ] Confirm client can see leads and AI email drafts are generating

---

## 9. Phase 7: Ongoing Operations

### 9.1 Weekly Cadence

| Day | Action |
|-----|--------|
| Monday | Review all active client lead pipelines — flag any with 0 new leads |
| Wednesday | Check opt-out blocklist for any new entries — confirm cross-client block is working |
| Friday | Review usage metrics — flag any client with unusually low engagement |

### 9.2 Monthly Cadence

| Action | Owner |
|--------|-------|
| Usage report to clients (leads sourced, scored, contacted) | Operations |
| Subscription renewal check (5 days before renewal) | Finance |
| ICP refresh call with clients (optional but recommended) | Sales |
| Platform update email (new features, fixes) | Product |

### 9.3 Client Success Metrics

Track these per client monthly:

- **Leads sourced:** Target ≥50/mo on Starter, ≥150/mo on Advanced
- **Lead score distribution:** ≥60% of leads scoring above 50
- **Consent rate:** % of leads with Apollo consent or KIND POPIA consent given
- **Opt-out rate:** Should stay below 3%; if higher, review ICP targeting
- **Emails drafted and sent:** Engagement with the AI email feature

---

## 10. POPIA Compliance Protocol

This section is non-negotiable. Every team member touching lead data must follow this.

### 10.1 Consent Rules

| Source | Consent Status | Can Contact? |
|--------|---------------|--------------|
| Apollo (apollo_consented = true) | Pre-consented via Apollo infrastructure | Yes — immediately |
| Apollo (apollo_consented = false) | No Apollo consent | Only after KIND consent request is sent AND confirmed |
| Manually added | Unknown | Only after KIND consent request is sent AND confirmed |
| On blocklist | Opted out | Never — even if they re-appear in Apollo |

### 10.2 Opt-Out Handling

When a lead replies requesting to not be contacted:
1. Go to Lead Gen pipeline → find the lead
2. Click **Block** (skull icon) — this is permanent and cross-client
3. Confirm the lead disappears from ALL client pipelines (system handles this automatically)
4. Do NOT re-add this lead unless they explicitly opt back in writing
5. Log the opt-out request (email/date) in your CRM

### 10.3 Data Hosting Disclosure

When clients ask where their data lives:
- **Client account data + leads:** Supabase PostgreSQL, AWS **af-south-1 (Cape Town, South Africa)** — selected specifically for POPIA compliance
- **AI email drafting:** Anthropic API (US) — no data is stored by Anthropic per their data processing agreement
- **Payments:** Paystack (Nigeria/South Africa)

---

## 11. Agreement Document Library

Five documents must be uploaded to the Terms Library in the Admin Portal before any Order Form can be sent. Navigate to **Admin → Terms Library** to check status and upload.

| # | Document | Status Check |
|---|----------|-------------|
| 1 | Master Services Agreement (MSA) | Should show green tick in Terms Library |
| 2 | POPIA Compliant Process | Should show green tick in Terms Library |
| 3 | Chatbot SLA | Should show green tick in Terms Library |
| 4 | Order Form Terms & Conditions | Should show green tick in Terms Library |
| 5 | Privacy Policy | Should show green tick in Terms Library |

If any document is missing, clients cannot receive an Order Form until it is uploaded. Upload via the Terms Library page as a PDF.

---

## 12. Escalation Matrix

| Situation | First response | Escalate to |
|-----------|---------------|-------------|
| Client payment fails | Check Paystack dashboard, advise retry | Founder if unresolved >7 days |
| Lead pipeline empty | Check ICP is active, run Apollo search | Operations lead |
| Opt-out complaint received | Execute opt-out protocol (§10.2) immediately | Legal if threatening action |
| Data breach suspected | Isolate affected records, log timestamp | Founder + legal within 24h |
| Client wants to cancel | Retention call within 24h | Founder |
| System down (portal/API) | Check Railway/Vercel status pages | Dev lead / Founder |

---

## 13. Infrastructure Reference

| Service | What it runs | Access |
|---------|-------------|--------|
| Supabase | Database + Auth + Storage | supabase.com → KIND project |
| Vercel | Portal + Admin frontends | vercel.com → kind-portal / kind-admin |
| Railway | Express API (apps/api) | railway.app → KIND API service |
| Paystack | Payments + Subscriptions | paystack.com → KIND business |
| Netlify | Landing page (apps/landing) | netlify.com |
| Anthropic | AI email drafting | console.anthropic.com |
| Apollo.io | Lead source + consent | apollo.io |

### 13.1 Required Infrastructure Setup (One-time)

Before going live, these must be completed:

1. **Supabase:** Run `packages/db/src/schema.sql` in the SQL editor. Create `agreement-templates` bucket (public). Enable RLS.
2. **Vercel (Portal):** Set env vars: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. **Vercel (Admin):** Set env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Railway (API):** Set all vars from `apps/api/.env.example`. Set `PORTAL_URL` to Vercel portal URL.
5. **Netlify (Landing):** Deploy `apps/landing/index.html`. Update Formspree form ID in the HTML.
6. **Paystack:** Set webhook URL to `https://your-api.railway.app/webhooks/paystack`. Create subscription plan codes and add to API env vars.

---

## 14. Document Control

| Version | Date | Author | Change |
|---------|------|--------|--------|
| 1.0 | May 2026 | KIND Operations | Initial release |

Review this SOP every 90 days or after any major platform change.
