# K.I.N.D — Master Status Document
*Last updated: May 2026*

---

## DOMAINS

| Property | URL |
|----------|-----|
| Website | get-kind.com |
| Client portal | app.get-kind.com |
| Admin portal | admin.get-kind.com |
| Email | hello@get-kind.com |
| Brand | K.I.N.D — Knowledge. Intelligence. Networks. Delivered. |

---

## WHAT'S BUILT

### Website — get-kind.com
- [x] Full homepage — hero, products, FIGSY deep-dive, how it works, pricing, CTA, footer
- [x] Signup modal — email/password, forgot password, "Book a call" link
- [x] Dropdown nav — Products, Use Cases, Resources, Company, Pricing
- [x] about.html — K.I.N.D acronym, founder story, values, POPIA/GDPR/CAN-SPAM compliance
- [x] pricing.html — monthly/yearly toggle (20% off yearly), FIGSY add-on tiers, FAQ
- [x] use-cases.html — 6 verticals (B2B Sales, Financial Services, Real Estate, Professional Services, SaaS, Recruitment)
- [x] support.html — contact cards, 10-question FAQ, client portal link
- [x] All domain references updated — get-kind.com / app.get-kind.com / hello@get-kind.com

### Client Portal — app.get-kind.com
- [x] Login, signup, forgot password (email reset link)
- [x] Cross-domain auth fixed — signup on get-kind.com, session cookie set on app.get-kind.com via /auth/callback
- [x] Onboarding flow (/onboard) — company name, industry, user details
- [x] 14-day trial auto-starts on signup
- [x] Order form auto-created on signup — client can sign immediately, no admin action needed
- [x] Trial expiry hard gate — blocks dashboard when trial ends; billing and documents remain accessible
- [x] Onboarding banner — shows trial days remaining, prompts order form signature
- [x] Dashboard — leads pipeline, ICP builder, billing, documents, settings
- [x] ICP builder — Run ICP button calls Apollo, deduplicates, inserts scored leads (L1)
- [x] Lead table — status filters, AI email draft, CSV export, opt-out blocklist
- [x] Billing page — Lead Gen ($1/lead, $100/mo min), FIGSY bundle, VA, Chatbot; Paystack payment flow
- [x] Documents tab — order form signing
- [x] Welcome email via Resend fires on onboard

### Admin Portal — admin.get-kind.com
- [x] Client list
- [x] Order form builder
- [x] Terms library
- [x] Roadmap view

### API — Railway
- [x] Auth — signup creates trial subscription + order form + sends welcome email
- [x] ICP run endpoint — Apollo search with full ICP mapping, deduplication, lead insert
- [x] Subscriptions — usage-based tier handled correctly for Lead Gen and FIGSY
- [x] Apollo client — full ICP → Apollo param mapping (seniority, company size, geography, keywords)
- [x] All domain references updated to get-kind.com

### Business Documents
- [x] Run costs & cashflow model — docs/run-costs-and-cashflow.md

---

## WHAT STILL NEEDS TO BE DONE

### SECTION A — INFRASTRUCTURE (you do these on each platform dashboard)

---

**A — DNS** *(your domain registrar — get-kind.com · 10 min)*

| Type | Name | Value | Purpose |
|------|------|-------|---------|
| A | @ | 76.76.21.21 | Root domain → Vercel |
| CNAME | www | cname.vercel-dns.com | Website |
| CNAME | app | cname.vercel-dns.com | Client portal |
| CNAME | admin | cname.vercel-dns.com | Admin portal |

---

**B — VERCEL** *(15 min)*

Portal project (kind-portal):
- Add domain: `app.get-kind.com`
- Add env var: `NEXT_PUBLIC_API_URL=https://your-railway-url` (after Railway is live)
- Redeploy after adding env var

Website project (static):
- Framework: Other
- Root directory: `apps/website`
- Build command: `echo 'static'`
- Output directory: `.`
- Add domains: `get-kind.com` and `www.get-kind.com`

Admin project (kind-admin):
- Add domain: `admin.get-kind.com`

---

**C — SUPABASE** *(5 min)*

Authentication → URL Configuration:
- Site URL: `https://get-kind.com`
- Redirect URLs — ADD:
  - `https://app.get-kind.com/auth/callback`
  - `https://app.get-kind.com/**`

SQL Editor — run:
```sql
alter table public.icps add column if not exists last_run_at timestamptz;
```

---

**D — RAILWAY — Deploy the API** *(20 min)*

- New project → deploy from GitHub → jacquesvieiraza-blip/KIND
- Root directory: `apps/api`
- Build command: `yarn install && yarn build`
- Start command: `node dist/index.js`
- Generate domain (copy this URL — needed for Vercel NEXT_PUBLIC_API_URL and Paystack webhook)

Add all environment variables:

| Variable | Value | Where to get it |
|----------|-------|----------------|
| SUPABASE_URL | https://lwtadfdaoyvjmjhrfkgs.supabase.co | Supabase → Settings → API |
| SUPABASE_ANON_KEY | eyJhbGci... | Supabase → Settings → API |
| SUPABASE_SERVICE_ROLE_KEY | (secret) | Supabase → Settings → API → service_role |
| DATABASE_URL | (postgres URI) | Supabase → Settings → Database → URI |
| APOLLO_API_KEY | (from step E) | apollo.io |
| PAYSTACK_SECRET_KEY | (from step F) | paystack.com |
| PORTAL_URL | https://app.get-kind.com | Fixed |
| RESEND_API_KEY | (from step G) | resend.com |
| ANTHROPIC_API_KEY | (from console) | console.anthropic.com |

---

**E — APOLLO** *(5 min)*

- apollo.io → Settings → Integrations → API → Create key
- Paste as `APOLLO_API_KEY` in Railway

---

**F — PAYSTACK** *(10 min)*

- paystack.com → Settings → API Keys → copy Live Secret Key
- Paste as `PAYSTACK_SECRET_KEY` in Railway
- Webhooks → Add: `https://your-railway-url.up.railway.app/webhook/paystack`

---

**G — RESEND** *(15 min)*

- resend.com → Domains → Add domain: `get-kind.com`
- Add the DNS records they provide to your domain registrar
- Wait for green verification tick
- API Keys → Create key
- Paste as `RESEND_API_KEY` in Railway

---

**H — UPLOAD T&CS** *(your content)*

- Admin portal → Terms Library
- Upload: MSA, POPIA policy, service terms as PDFs
- These appear inside every client's order form before they sign

---

**I — SMOKE TEST** *(before any real client)*

Run through this exact flow before giving the URL to anyone:

1. Visit get-kind.com → click Start free trial
2. Sign up with a test email
3. Confirm email → should land on app.get-kind.com/onboard
4. Complete onboard → check Supabase: `subscriptions` row + `order_forms` row both created
5. Documents tab → sign the order form
6. ICP builder → create ICP → click Run ICP → leads appear in pipeline
7. Billing → click Get started → Paystack opens in ZAR
8. If anything fails, fix before a real client touches it

---

### SECTION B — CODE (next build sessions, in recommended order)

---

**CRM CONNECTOR** *(build first — before L2)*

What: Before inserting Apollo leads, check the client's CRM (HubSpot, Salesforce, Pipedrive). If the contact already exists there, skip it — don't deliver it, don't charge for it.

Why: Protects clients from paying for leads they already have. Critical for trust.

Depends on: Nothing — can build now.

---

**L2 — POPIA CONSENT EMAIL**

What: Before a lead is moved to `approved` status and delivered to the client pipeline, send the lead a consent email via Resend. Include an opt-out link. Only promote to approved if they consent. Opt-out updates the shared blocklist immediately and permanently.

Why: Legal requirement for South African outreach. Also applies to GDPR (EU) and CAN-SPAM (US). Without this, leads are delivered without documented consent.

Depends on: Resend live (step G above).

---

**L3 — AI LEAD SCORING**

What: Claude (Haiku) scores each lead 0–100 against the client's ICP automatically on insert. Factors: job title match, seniority, company size, industry alignment, geography. Currently leads arrive with no score.

Why: Clients need to prioritise who to contact first. Score drives pipeline value.

Depends on: Anthropic API key in Railway (step D above).

Cost: ~$0.0004 per lead scored — negligible.

---

**L4 — USAGE COUNTER**

What: Track the number of leads delivered per client per billing month. Feed this count into the Paystack billing calculation. Without this, billing above the $100/mo minimum ($1/lead) cannot happen automatically.

Why: Core to the business model — $1/lead above 100 leads cannot be charged without knowing how many leads were delivered.

Depends on: L2 or L3 done first (leads need status = approved before counting).

---

**F1 — FIGSY OUTREACH ENGINE**

What: Autonomous AI SDR. Picks up each scored, approved lead. Writes a unique personalised email per lead (role, company, industry — not a template). Sends from client's domain. Reads the reply. Follows up twice with fresh angles. Books meeting when lead is ready. Client gets a notification and shows up.

Why: The highest-value product in the stack. Unlocks the Lead Gen + FIGSY bundle at $3/lead.

Depends on: L2 (consent), L3 (scoring), L4 (usage tracking) all done first.

---

**Recommended build order:**

```
CRM Connector → L2 (POPIA consent) → L3 (AI scoring) → L4 (usage billing) → F1 (FIGSY)
```

---

## CLIENT FLOW — START TO FINISH

For reference: what a client experiences once everything above is live.

1. Finds get-kind.com → clicks Start free trial
2. Signs up → confirms email → lands on app.get-kind.com/onboard
3. Completes onboarding (company name, industry)
4. Banner: "14 days left — sign your Service Agreement"
5. Documents → reads and signs order form
6. Leads → Build ICP → sets target (industry, title, size, geography)
7. Clicks Run ICP → leads appear within minutes
8. *(L2)* Leads receive consent email — approved leads surface in pipeline
9. *(L3)* Each lead has an AI score 0–100
10. *(F1)* FIGSY picks up leads and starts outreach automatically
11. Trial ends → Billing → chooses plan → Paystack processes payment
12. Live — paying client, pipeline running

---

*Document owner: K.I.N.D founding team*
*Update this document after each build session.*
