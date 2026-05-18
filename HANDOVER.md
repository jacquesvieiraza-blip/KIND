# KIND Platform — Full Status & Action Plan
**Last updated: 18 May 2026 — commit ef95cfc**

---

## PLATFORM OVERVIEW

| Component | URL | Hosting | Deploy Branch |
|-----------|-----|---------|--------------|
| Portal (client dashboard) | app.get-kind.com | Vercel | `main` |
| Website (marketing) | get-kind.com | Vercel | `main` |
| Admin (internal ops) | admin.get-kind.com | Vercel | `main` |
| API (backend) | kindapi-production-e64c.up.railway.app | Railway | `main` |
| Database | — | Supabase | — |

---

## YOUR IMMEDIATE TO-DO LIST (requires your access)

| Priority | Action | Where |
|----------|--------|-------|
| 🔴 CRITICAL | Run `20260518_credit_transactions_rls.sql` in Supabase SQL Editor | Supabase → SQL Editor |
| 🔴 CRITICAL | Run `20260518_company_registration.sql` in Supabase SQL Editor | Supabase → SQL Editor |
| 🔴 HIGH | Complete Paystack KYC → get live `sk_live_...` key → update Railway env var | dashboard.paystack.com |
| 🔴 HIGH | Set up Google Workspace for get-kind.com (see section below) | workspace.google.com |
| 🟡 MEDIUM | Create calendar booking page (Calendly or Cal.com) → share link with Claude to update "Book a Demo" buttons | calendly.com or cal.com |
| 🟡 MEDIUM | Verify Vercel deployed latest commit `ef95cfc` on all 3 projects | vercel.com |
| 🟡 MEDIUM | Smoke test full signup → ICP → leads flow | app.get-kind.com |
| 🟢 WHEN READY | Test Demo Environments: create demo → Open Demo | admin.get-kind.com/demo |

---

## GOOGLE WORKSPACE SETUP STEPS

You need Google Workspace to have a professional @get-kind.com inbox (hello@get-kind.com). Without it you can't send or receive email from your domain properly.

1. Go to workspace.google.com → **Get started** → Business Starter plan
2. Enter your domain: **get-kind.com**
3. Google gives you **MX records** — add them to your domain DNS (at your registrar: GoDaddy, Cloudflare, Namecheap, etc.)
4. Google gives you a **TXT verification record** — add to DNS → click Verify in Google
5. Create mailbox: **hello@get-kind.com** (primary inbox — sales, support, billing)
6. Create or alias: **privacy@kind.ai** → forward to hello@get-kind.com (required by Privacy Policy)
7. In Google Admin → Gmail → Authenticate email → **Enable DKIM** → add the DKIM TXT record to DNS
8. Add **SPF record**: `v=spf1 include:_spf.google.com ~all` (merge with existing SPF if you have one from Resend)
9. Add **DMARC record** on `_dmarc.get-kind.com`: `v=DMARC1; p=none; rua=mailto:hello@get-kind.com`

**After Workspace is live:** Update `FOUNDER_EMAIL` in Railway to `hello@get-kind.com`.

**Important:** FIGSY outreach emails go through **Resend** (replies@get-kind.com), NOT Google Workspace. Keep them separate to protect your domain reputation.

---

## FULL SECURITY AUDIT RESULTS (completed 18 May 2026)

Security audit run across all tables, routes, middleware, and config. Findings:

### ✅ SECURE — All good
| Area | Status | Detail |
|------|--------|--------|
| RLS — clients | ✅ | `auth.uid() = user_id` policy — each client sees only their own row |
| RLS — icps | ✅ | `client_id = current_client_id()` — re-enabled 18 May |
| RLS — leads | ✅ | `client_id = current_client_id()` |
| RLS — subscriptions | ✅ | `client_id = current_client_id()` |
| RLS — figsy tables | ✅ | All 4 FIGSY tables have proper RLS |
| RLS — milla/vida | ✅ | Service-role bypass only (correct — API enforces filtering) |
| RLS — partners | ✅ | Service-role bypass (correct) |
| RLS — opt_out_blocklist | ✅ | Requires authenticated role |
| API auth — all user routes | ✅ | `requireAuth` middleware on every router |
| API auth — admin routes | ✅ | `requireAdminKey` on all admin endpoints |
| JWT refresh | ✅ | Supabase SSR middleware refreshes tokens on every portal request |
| CORS | ✅ | Strict allowlist: get-kind.com, app.get-kind.com, admin.get-kind.com |
| Subscription gating | ✅ | Both frontend (locked screens) and backend (403 checks) |
| Demo isolation | ✅ | Demo clients are real rows subject to same RLS as paying clients |
| Opt-out blocklist | ✅ | Checked before EVERY lead insert — ICP job + manual insert |
| Env vars | ✅ | All required vars documented and in use |

### 🔴 FIXED — Was broken, now fixed
| Area | Fix |
|------|-----|
| **credit_transactions — NO RLS** | ✅ Fixed: migration `20260518_credit_transactions_rls.sql` — **run this now** |
| **clients — RLS disabled** | ✅ Fixed: `20260518_enable_rls.sql` — already run |
| **icps — RLS disabled** | ✅ Fixed: same migration — already run |

### Minor notes (not security issues)
- Vida widget endpoints (`/widget/*`) are intentionally public — client-side chatbot needs no auth
- FIGSY `/replies/inbound` is intentionally public — webhook from Resend
- `/leads/public/consent` is intentionally public — POPIA opt-in landing page

---

## EVERYTHING THAT IS BUILT & LIVE

### Platform Infrastructure
- ✅ Railway API — Express + Node, all routes live
- ✅ Supabase — database + auth + storage
- ✅ Vercel — portal, admin, website all deploy from `main`
- ✅ JWT refresh middleware on every portal request
- ✅ CORS allowlist — only known origins
- ✅ Admin proxy route — admin portal → Railway (GET, POST, PATCH, DELETE)

### Authentication
- ✅ Signup → no email confirmation → direct to /onboard
- ✅ Login → Supabase signInWithPassword
- ✅ Magic link generation for demo accounts
- ✅ Middleware protects all /dashboard/* routes

### Onboarding
- ✅ Company name, industry, country, website, phone, company registration, VAT
- ✅ "Pre-fill ICP from website" — scrapes site → saves to localStorage
- ✅ Referral tracking via `?ref=` param

### Dashboard
- ✅ Company name greeting, stat cards, credit balance
- ✅ Onboarding checklist, trial/payment banner
- ✅ All 4 product cards with lock states
- ✅ Referral banner with unique link
- ✅ No empty dashboard loop — fixed

### Lead Generation
- ✅ Apollo.io integration — real leads from API
- ✅ ICP builder — all criteria fields
- ✅ **AI ICP Suggest** — "Suggest ICP with AI" button calls Claude, auto-fills form
- ✅ ICP auto-name hint from selected criteria
- ✅ ICP prefill from website URL
- ✅ Lead scoring (AI 0–100)
- ✅ Leads table — search, filter, bulk actions, CSV export
- ✅ Opt-out blocklist checked on every insert
- ✅ POPIA consent email workflow

### FIGSY — AI SDR
- ✅ Campaign CRUD — create, activate, pause, clone, delete
- ✅ Day 1 outreach auto-fires on ICP lead insert
- ✅ Replies inbox with AI draft follow-up
- ✅ Locked screen → Upgrade + Book a Demo

### Virtual Assistant (Milla)
- ✅ Document upload + RAG chat
- ✅ Locked screen → Upgrade + Book a Demo

### Chatbot Agent (Vida)
- ✅ Config, conversations, embed code
- ✅ Locked screen → Upgrade + Book a Demo

### Billing
- ✅ Paystack integration (ZAR — currently test key, needs live key after KYC)
- ✅ Stripe integration (USD subscriptions)
- ✅ Credit balance in sidebar and dashboard
- ✅ Auto top-up settings

### Settings
- ✅ Business profile — company name, industry, country, website, phone
- ✅ **Company registration no. + VAT number** (new)
- ✅ CRM integration — HubSpot, Pipedrive
- ✅ Google Calendar connect
- ✅ WhatsApp + Voice status (shown when configured)

### Admin Portal (admin.get-kind.com)
- ✅ Dashboard — total clients, MRR, TTFL, KPI progress bars
- ✅ Clients list — all clients, subscription status, T&Cs
- ✅ **Client detail page** — subscriptions, credit balance, grant/refund credits form, transaction history, company registration, VAT
- ✅ **Demo Environments** — create/open/extend/expire demo accounts
- ✅ Roadmap — Phase 1–4 with milestone tracking
- ✅ Launch checklist — all 13 sections including Google Workspace

### Demo Environments
- ✅ Creates real Supabase user + client + all 4 products
- ✅ Runs real Apollo ICP job → real leads, real scores
- ✅ Magic link → open portal as demo client in new tab
- ✅ Extend / expire controls
- ✅ Leads count updates as ICP job runs

### Credit Management (admin)
- ✅ Grant credits — manual_grant or refund type
- ✅ Transaction history — last 50 transactions per client
- ✅ Balance shown in header of client detail page

### System Health
- ✅ Sidebar green/amber dot — polls Railway /health

---

## WHAT CLAUDE CAN BUILD NEXT (say the word)

| # | Task |
|---|------|
| 1 | Fix "Book a Demo" buttons — share your Calendly/Cal.com link |
| 2 | Chatbot image update — share new image |
| 3 | Paystack end-to-end test after live key is set |
| 4 | FIGSY campaign end-to-end test |
| 5 | Referral flow verification |
| 6 | KIND's own FIGSY campaign setup (dogfooding GTM) |
| 7 | KPIs page in portal (`/dashboard/kpis`) |
| 8 | Usage history page in portal |
| 9 | Fix any error you see — share screenshot |

---

## KEY FILES

```
Portal:
  apps/portal/src/app/(auth)/login/page.tsx               signup + login
  apps/portal/src/app/(auth)/onboard/page.tsx             onboarding + ICP prefill
  apps/portal/src/app/(dashboard)/dashboard/page.tsx      main dashboard
  apps/portal/src/app/(dashboard)/layout.tsx              sidebar, trial overlay
  apps/portal/src/app/(dashboard)/dashboard/leads/icp/page.tsx   ICP builder + AI suggest
  apps/portal/src/app/(dashboard)/dashboard/settings/page.tsx    settings + registration
  apps/portal/src/app/(dashboard)/dashboard/billing/page.tsx     billing + topup
  apps/portal/src/middleware.ts                           JWT refresh
  apps/portal/src/lib/api.ts                              API helper

Admin:
  apps/admin/src/app/page.tsx                             admin dashboard + KPIs
  apps/admin/src/app/clients/page.tsx                     all clients
  apps/admin/src/app/clients/[id]/page.tsx                client detail + credits
  apps/admin/src/app/demo/page.tsx                        demo environments
  apps/admin/src/app/launch/page.tsx                      pre-launch checklist
  apps/admin/src/app/roadmap/page.tsx                     roadmap

API:
  apps/api/src/routes/admin.ts        admin + demo + credit endpoints
  apps/api/src/routes/clients.ts      client CRUD + ICP AI suggest
  apps/api/src/routes/icps.ts         ICP CRUD + Apollo search
  apps/api/src/routes/leads.ts        leads CRUD + scoring
  apps/api/src/routes/figsy.ts        FIGSY campaigns

Migrations run in Supabase:
  supabase/migrations/20260518_enable_rls.sql                    ✅ run
  supabase/migrations/20260518_demo_environments.sql             ✅ run
  supabase/migrations/20260518_credit_transactions_rls.sql       ⚠️ RUN THIS NOW
  supabase/migrations/20260518_company_registration.sql          run when ready
```
