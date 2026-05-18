# KIND AI Platform — Deployment Guide

**Version:** 2.0 · **Date:** May 2026  
**Time required:** ~90 minutes end-to-end (first time)  
**Prerequisites:** Accounts on Supabase, Vercel, Railway, Paystack, Anthropic, Apollo

---

## Before You Start — Collect These Keys First

Open a temporary notepad. Collect all keys before starting, then follow the steps in order.

| Key | Where to find it | Variable name |
|-----|-----------------|---------------|
| Supabase Project URL | Supabase → Project Settings → API → Project URL | `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase Anon Key | Supabase → Project Settings → API → anon public | `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase Service Role Key | Supabase → Project Settings → API → service_role | `SUPABASE_SERVICE_ROLE_KEY` |
| Paystack Secret Key | Paystack → Settings → API Keys & Webhooks → Secret Key | `PAYSTACK_SECRET_KEY` |
| Paystack Public Key | Paystack → Settings → API Keys & Webhooks → Public Key | `PAYSTACK_PUBLIC_KEY` |
| Anthropic API Key | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` |
| Apollo API Key | apollo.io → Settings → Integrations → API | `APOLLO_API_KEY` |
| Resend API Key | resend.com → API Keys | `RESEND_API_KEY` |
| Admin Secret Key | Generate a random string (use `openssl rand -hex 32`) | `ADMIN_SECRET_KEY` |
| Railway API URL | After deploying API — Railway → service → Settings → Domain | `NEXT_PUBLIC_API_URL` |

---

## Step 1: Supabase — Database Setup

**Time: ~15 minutes**

### 1a. Run the schema

1. Go to [supabase.com](https://supabase.com) → open your KIND project
2. In the left sidebar click **SQL Editor** → **New query**
3. Open `packages/db/src/schema.sql` from this repo
4. Copy the entire contents and paste into the SQL editor
5. Click **Run** — you should see `Success. No rows returned`

> If you see errors about tables already existing, that's fine — the schema uses `CREATE TABLE IF NOT EXISTS`.

### 1b. Run all migrations (in order)

In Supabase SQL Editor, run each file in order:

```
supabase/migrations/20260518_enable_rls.sql
supabase/migrations/20260518_demo_environments.sql
supabase/migrations/20260518_credit_transactions_rls.sql      ← CRITICAL security fix
supabase/migrations/20260518_company_registration.sql
```

**Do not skip the credit_transactions_rls migration.** Without it, financial data is exposed across clients.

### 1c. Supabase Auth configuration

1. Supabase → **Authentication** → **URL Configuration**
2. Set **Site URL** to `https://app.get-kind.com`
3. Add to **Redirect URLs**:
   - `https://app.get-kind.com/auth/callback`
   - `https://app.get-kind.com/**`
4. Under **Email** settings → disable **Confirm email** — clients land directly on /onboard with no confirmation step

### 1d. Create the Storage bucket

1. Supabase → **Storage** → **New bucket**
2. Name it: `agreement-templates`
3. Toggle **Public bucket** to ON
4. Click **Create bucket**

### 1e. Verify tables

In Supabase → **Table Editor**, confirm you can see:
`clients`, `subscriptions`, `leads`, `icps`, `opt_out_blocklist`, `credit_transactions`, `figsy_campaigns`, `figsy_emails`, `figsy_replies`, `assistant_messages`, `chatbot_configs`, `usage_metrics`, `partners`

---

## Step 2: Railway — Deploy the API

**Time: ~20 minutes**

### 2a. Deploy

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → connect → select `jacquesvieiraza-blip/KIND`
3. Set **Root directory:** `apps/api`
4. Set **Build command:** `npm run build`
5. Set **Start command:** `npm start`
6. Click **Deploy**

### 2b. Set environment variables

In Railway → API service → **Variables** tab, add every variable below:

```
PORT=4000
PORTAL_URL=https://app.get-kind.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APOLLO_API_KEY=your-apollo-key
PAYSTACK_SECRET_KEY=sk_live_xxxxx                   ← use test key until KYC complete
PAYSTACK_WEBHOOK_SECRET=your-paystack-webhook-secret
ANTHROPIC_API_KEY=sk-ant-xxxxx
RESEND_API_KEY=re_xxxxx
ADMIN_SECRET_KEY=your-random-secret-string
FOUNDER_EMAIL=hello@get-kind.com                    ← your email — all internal agent alerts go here
FIGSY_REPLY_TO=replies@get-kind.com                 ← update after Resend inbound is configured
FIGSY_DAILY_SEND_LIMIT=20                           ← protects domain reputation
```

> **Paystack note:** Use test key (`sk_test_...`) until you complete Paystack KYC. Swap to `sk_live_...` after KYC is approved.

### 2c. Get your Railway API URL

Railway → API service → **Settings** → **Networking** → **Generate Domain**

Copy the URL — it will look like `https://kindapi-production-xxxx.up.railway.app`

> Current live URL: `https://kindapi-production-e64c.up.railway.app`

### 2d. Verify the API is running

Open: `https://your-railway-url.up.railway.app/health`

You should see: `{"status":"ok"}`.

---

## Step 3: Vercel — Deploy the Portal (client-facing)

**Time: ~10 minutes**

### 3a. Deploy

1. Vercel → **Add New Project** → import `jacquesvieiraza-blip/KIND`
2. Set **Framework Preset:** Next.js
3. Set **Root Directory:** `apps/portal`
4. Click **Deploy** (first deploy may fail before env vars — that's expected)

### 3b. Set environment variables

Vercel → portal project → **Settings** → **Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
```

### 3c. Add custom domain

Vercel → portal → **Settings** → **Domains** → add `app.get-kind.com`

### 3d. Redeploy

Vercel → **Deployments** → three dots on latest → **Redeploy**

### 3e. Verify

Go to `https://app.get-kind.com` → you should see the login page.

---

## Step 4: Vercel — Deploy the Admin Portal

**Time: ~8 minutes**

### 4a. Deploy

1. Vercel → **Add New Project** → import same repo
2. Set **Root Directory:** `apps/admin`
3. Set **Framework Preset:** Next.js
4. Click **Deploy**

### 4b. Set environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-railway-url.up.railway.app
ADMIN_SECRET_KEY=your-admin-secret-key              ← same value as Railway
```

> The admin portal routes all management calls through the API using ADMIN_SECRET_KEY. The service role key is NOT used client-side in admin — all admin operations proxy through Railway.

### 4c. Add custom domain

Vercel → admin project → **Settings** → **Domains** → add `admin.get-kind.com`

### 4d. Redeploy and verify

Go to `https://admin.get-kind.com` → you should see the admin dashboard.

---

## Step 5: Vercel — Deploy the Website

**Time: ~5 minutes**

### 5a. Deploy

1. Vercel → **Add New Project** → import same repo
2. Set **Framework Preset:** Other
3. Set **Root Directory:** `apps/website`
4. Set **Build command:** (leave empty or `echo done`)
5. Set **Output directory:** `.`
6. Click **Deploy**

### 5b. Add custom domains

Vercel → website project → **Settings** → **Domains**:
- Add `get-kind.com`
- Add `www.get-kind.com`

### 5c. Verify

Go to `https://get-kind.com` → you should see the marketing homepage.

---

## Step 6: Paystack — Plans and Webhook

**Time: ~15 minutes**

### 6a. Complete KYC first

Before creating live plans, complete Paystack KYC:
- dashboard.paystack.com → **Settings** → **Compliance**
- Submit business documents (business registration, ID, bank details)
- Approval typically takes 1–3 business days

> Until KYC is complete, only test payments work. Use test key `sk_test_...` in Railway.

### 6b. Set the webhook URL

1. Paystack → **Settings** → **API Keys & Webhooks** → **Webhooks**
2. Click **Add Webhook**
3. URL: `https://kindapi-production-e64c.up.railway.app/webhooks/paystack`
4. Events: `charge.success`, `subscription.create`, `subscription.disable`, `invoice.update`
5. Click **Save**

### 6c. Test the webhook

Use Paystack test card (`4084084084084081`, any future expiry, CVV `408`) to make a test payment on the portal billing page. Check Railway logs — you should see the webhook arrive.

---

## Step 7: Google Workspace — Professional Email

**Time: ~30 minutes**

This is required to send and receive email from hello@get-kind.com.

1. Go to [workspace.google.com](https://workspace.google.com) → **Get started** → Business Starter plan (~$12/mo)
2. Enter domain: `get-kind.com`
3. Google provides **MX records** → add them to your domain DNS (at GoDaddy/Cloudflare/Namecheap)
4. Google provides a **TXT verification record** → add to DNS → click Verify in Google
5. Create mailbox: **hello@get-kind.com** (primary inbox — sales, support, billing)
6. In Google Admin → Gmail → Authenticate email → **Enable DKIM** → add the DKIM TXT record to DNS
7. Add **SPF record**: `v=spf1 include:_spf.google.com ~all` (merge with any existing Resend SPF)
8. Add **DMARC record** on `_dmarc.get-kind.com`: `v=DMARC1; p=none; rua=mailto:hello@get-kind.com`

**After Workspace is live:** Update `FOUNDER_EMAIL` in Railway to `hello@get-kind.com`.

> **Note:** FIGSY outreach emails go through Resend (replies@get-kind.com), NOT Google Workspace. Keep them separate to protect your domain reputation.

---

## Step 8: Upload Agreement Documents

**Time: ~5 minutes** (if PDFs are already prepared)

Before sending any Order Form to a client, upload all 5 agreement documents:

1. Log into `https://admin.get-kind.com`
2. Navigate to **Terms Library** in the sidebar
3. Upload each document:
   - Master Services Agreement (MSA)
   - POPIA Compliant Process
   - Chatbot SLA
   - Order Form Terms & Conditions
   - Privacy Policy
4. Once all 5 show green ticks, Order Forms can be sent

PDFs are stored in the Supabase `agreement-templates` bucket.

---

## Step 9: Railway Cron Jobs

**Time: ~5 minutes**

Set up these 6 cron jobs in Railway → API service → **Cron**. All need the header `x-admin-key: {ADMIN_SECRET_KEY}`.

| Schedule | Endpoint | Purpose |
|----------|----------|---------|
| `0 8 * * *` | `POST /internal/ae/nurture` | Trial nurture emails (day 1/3/5/7/10) |
| `0 8 * * *` | `POST /internal/ae/at-risk` | At-risk client alerts |
| `0 8 * * *` | `POST /internal/ae/trial-expiry` | Trial expiry emails (day 10/12/14) |
| `0 8 * * *` | `POST /figsy/send-due` | FIGSY step 2 + 3 emails |
| `0 7 * * 1` | `POST /internal/digest/weekly` | Weekly leads digest to clients (Monday 7am) |
| `0 7 * * 1` | `POST /internal/cro/weekly-digest` | Weekly founder digest to you (Monday 7am) |

---

## Step 10: Smoke Test — Full Flow

Run through this checklist before going live with a real client.

### New Client Self-Service
- [ ] Sign up at `app.get-kind.com` with a test email
- [ ] **No confirmation email required** — lands directly on /onboard
- [ ] Complete onboarding: company name, industry, country, phone, website
- [ ] Dashboard loads with trial banner (14 days)

### AI ICP Suggest
- [ ] Go to Lead Gen → ICP Builder
- [ ] Click "Suggest ICP with AI" — form auto-fills from company profile
- [ ] Manually adjust if needed → Save ICP

### Lead Generation
- [ ] Build ICP → Save → Apollo search fires automatically
- [ ] Leads appear within minutes to 2 hours
- [ ] All leads have AI scores (0–100) with reasoning

### Billing
- [ ] Go to Billing → select a plan → Paystack checkout opens
- [ ] Test payment completes → subscription flips to `active`
- [ ] Trial overlay gone → full access

### Admin Portal
- [ ] Log into `admin.get-kind.com`
- [ ] Client visible in Clients list with correct status
- [ ] Click client → detail page shows subscriptions, credit balance, company registration
- [ ] Grant 10 credits to test client → transaction appears in history

### Demo Environments
- [ ] Admin → Demo Environments → create new demo
- [ ] Fill in prospect name, company, industry, AE name, expiry
- [ ] System creates user + runs Apollo ICP → leads appear
- [ ] "Open Demo" → portal opens in new tab as demo client

### Settings
- [ ] Go to portal Settings → update Company Registration No. → Save
- [ ] Reload — value persists

### Export
- [ ] Lead Gen pipeline → select leads → Export CSV → file downloads

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Portal shows blank page | Missing env vars | Check Vercel env vars, redeploy |
| Login works but dashboard errors | API not reachable | Check `NEXT_PUBLIC_API_URL` in Vercel, verify Railway is running |
| "Client not found" errors | RLS policy blocking | Confirm migrations ran, check client row exists in `clients` table |
| Payment verify fails | Wrong Paystack key | Confirm test vs live keys match. Complete KYC for live key. |
| Webhook not arriving | Wrong URL or no events | Re-check Paystack → Webhooks URL and event types |
| Admin proxy 403 | ADMIN_SECRET_KEY mismatch | Confirm same value in Railway and Vercel admin env vars |
| AI ICP Suggest returns error | Missing Anthropic key | Check `ANTHROPIC_API_KEY` is set in Railway |
| Demo leads not appearing | Apollo rate limit or quota | Check Railway logs for Apollo errors |
| Terms Library shows upload errors | Bucket missing or not public | Create `agreement-templates` bucket in Supabase Storage (public) |

---

## Environment Variable Reference

### `apps/api` (Railway)

```env
PORT=4000
PORTAL_URL=https://app.get-kind.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
APOLLO_API_KEY=your-apollo-key
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_WEBHOOK_SECRET=your-webhook-secret
ANTHROPIC_API_KEY=sk-ant-xxxxx
RESEND_API_KEY=re_xxxxx
ADMIN_SECRET_KEY=your-random-secret-string
FOUNDER_EMAIL=hello@get-kind.com
FIGSY_REPLY_TO=replies@get-kind.com
FIGSY_DAILY_SEND_LIMIT=20
```

### `apps/portal` (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://kindapi-production-e64c.up.railway.app
```

### `apps/admin` (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://kindapi-production-e64c.up.railway.app
ADMIN_SECRET_KEY=your-random-secret-string
```

### `apps/website` (Vercel)

No environment variables needed. Static HTML.

---

## Deployment Order Summary

```
1. Supabase (schema + migrations + auth config + bucket)   ← no dependencies
2. Railway (API + env vars)                                ← needs Supabase keys
3. Vercel Portal                                           ← needs Railway URL + Supabase keys
4. Vercel Admin                                            ← needs Railway URL + ADMIN_SECRET_KEY
5. Vercel Website                                          ← no dependencies
6. Google Workspace                                        ← needs domain DNS access
7. Paystack KYC + webhook                                  ← needs Railway URL for webhook
8. Upload 5 PDFs via Admin → Terms Library                 ← needs Admin deployed + Storage bucket
9. Set up 6 Railway cron jobs                              ← needs API deployed
10. Smoke test                                             ← all systems must be live
```

Steps 3, 4, and 5 can run in parallel. Steps 6 and 7 are independent of each other.
