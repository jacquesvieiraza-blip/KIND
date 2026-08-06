# KIND AI Platform — Deployment Guide

> # ⚠️ TRUTH BANNER — 6 Aug 2026 (#629). READ BEFORE YOU QUOTE ANYTHING FROM THIS PAGE.
>
> A full sweep of this document against the code on 6 Aug found **15 of 22 factual claims FALSE**. They are being corrected in place, but **this page has been wrong for weeks and may still be wrong in places the sweep missed.**
>
> **The facts that override anything below:**
> | Topic | THE TRUTH (source of record) |
> |---|---|
> | **Price** | **$299** first purchase = the onboarding pack, **100 approved leads included**, then **$4 per approved lead**. Reviewing is FREE. → `packages/shared/src/constants/index.ts` |
> | **No trial, no freebies** | Signup writes `paused` with a **$0 wallet and $0 sourcing allowance**. Nothing sources, approves or sends until the $299 lands. There is **no "free to start"**, no card-free trial, no 14-day clock. → `auth.ts` (#607, 1 Aug) |
> | **The retired ladder** | *$1 reveal → +$3 FIGSY → +$1 Milla → +$1 Denise → Vida $3* is **DEAD** (superseded 24 Jul, price re-locked 3 Aug). Any page still quoting it is describing a model we do not sell. |
> | **Who sends** | **OUR OWN ENGINE**, over SMTP — `figsy.ts` → `lib/mailer.ts` → the inbox from `lib/sending-inbox.ts`. **Instantly = warm-up utility only** (Growth tier). **Smartlead = client sending, deferred and unproven** (key 401s). Resend now carries system mail + the inbound reply webhook only. |
> | **Flutterwave / Paystack** | **Never wired / removed.** Stripe only. |
>
> **Why this banner exists.** The founder, 6 Aug: *"i have not read a doc for 2 weeks because i dont trust it… things slip far to often."* He was right. Locks and rulings now live in **[`PRODUCT-RULES.md`](./PRODUCT-RULES.md)** — read that first, always.


`Last-checked: 24 Jun 2026`

> 🟢 **22 JUN CORRECTIONS (current stack — `docs/TECH-STACK.md` is the source of truth):**
> - **Email:** **Resend** sends (system + FIGSY cold, `RESEND_API_KEY` + `FIGSY_COLD_FROM`); **Zoho Mail** hosts the company mailboxes (replies/webmail). *(Not Google Workspace.)*
> - **Payments:** **Stripe** (US/EMEA, primary) + **Flutterwave** (Africa). Currency = **USD everywhere, no ZAR**. *(Paystack KILLED 25 Jun — see item 237.)*
> - **Open-tracking:** set **`TRACKING_URL`** (e.g. `https://api.get-kind.com`) — open-pixel on warm/transactional only.
> - `MASTER.md` is archived — current truth lives in the 4 core docs + `TECH-STACK.md`. The env-var/cron detail below is still broadly correct; re-verify against Railway before a deploy.

> *(Historical header — Last updated 2 June 2026; Paystack removed 27 May → Stripe.)*

**Version:** 2.1 · **Date:** June 2026  
**Time required:** ~90 minutes end-to-end (first time)  
**Prerequisites:** Accounts on Supabase, Railway, Stripe, Anthropic, PDL, Hunter, Resend

> ⚠️ **HOSTING: Railway ONLY.** Portal, Admin, API, and Website are all deployed as separate Railway services from the same monorepo (each with its own Root Directory). There is NO Vercel. If any older copy of this guide mentions Vercel, it is stale — follow the Railway steps below.

---

## Before You Start — Collect These Keys First

Open a temporary notepad. Collect all keys before starting, then follow the steps in order.

| Key | Where to find it | Variable name |
|-----|-----------------|---------------|
| Supabase Project URL | Supabase → Project Settings → API → Project URL | `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase Anon Key | Supabase → Project Settings → API → anon public | `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase Service Role Key | Supabase → Project Settings → API → service_role | `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe Secret Key | Stripe dashboard → Developers → API Keys → Secret key | `STRIPE_SECRET_KEY` |
| Stripe Webhook Secret | Stripe dashboard → Developers → Webhooks → signing secret | `STRIPE_WEBHOOK_SECRET` |
| Anthropic API Key | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` |
| PDL API Key | peopledatalabs.com → Settings → API | `PDL_API_KEY` |
| Hunter API Key | hunter.io → API → API Keys | `HUNTER_API_KEY` |
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

> ℹ️ **SINGLE-REGION AT LAUNCH (decided 4 Jun).** K.I.N.D launches with **one** Supabase project: `kind` (af-south-1, Cape Town) on a **single URL** `app.get-kind.com`, serving all clients (Africa, UK, US, rest of world). The US has no data-residency requirement for B2B SaaS, so one Cape Town database is legally clean for all markets.
>
> **FUTURE — when a US enterprise contract requires US data residency:** provision a second Supabase project `kind-us` (us-east-1, Virginia). The client URL never changes (`app.get-kind.com`); region is selected by the client at signup/login and the app routes to the correct database. At that point, **every migration must run on BOTH projects, in the same order, kept byte-identical** — a migration applied to only one region silently breaks that region. Do NOT build this until a signed contract requires it.

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
`clients`, `subscriptions` (legacy, pre-per-lead), `leads`, `icps`, `opt_out_blocklist`, `credit_transactions`, `figsy_campaigns`, `figsy_emails`, `figsy_replies`, `assistant_messages`, `chatbot_configs`, `usage_metrics`, `partners`

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
ANTHROPIC_API_KEY=sk-ant-xxxxx
RESEND_API_KEY=re_xxxxx
ADMIN_SECRET_KEY=your-random-secret-string          ← ALSO powers the FIGSY send cron — unset = nothing sends on schedule
FOUNDER_EMAIL=hello@get-kind.com                    ← your email — all internal agent alerts go here

# --- Lead engine (we run PDL + Hunter, NOT Apollo) ---
PDL_API_KEY=your-pdl-key                            ← PRIMARY lead sourcing (required for us)
HUNTER_API_KEY=your-hunter-key                      ← email reveal (required for us)
APOLLO_API_KEY=                                     ← OPTIONAL / BYO-key — not used day-to-day

# --- FIGSY cold sending / replies ---
FIGSY_COLD_FROM=K.I.N.D <cold@cold-domain.com>      ← REQUIRED: unset = cold mail poisons get-kind.com
FIGSY_REPLY_TO=replies@get-kind.com                 ← update after Resend inbound is configured
RESEND_WEBHOOK_SECRET=whsec_xxxxx                   ← required to RECEIVE replies (else inbound rejected)
FIGSY_DAILY_SEND_LIMIT=20                           ← protects domain reputation

# --- Stripe (payments). BOTH the API price IDs here AND the NEXT_PUBLIC_ twins on the portal are required ---
STRIPE_SECRET_KEY=sk_live_xxxxx                     ← use test key until go-live
STRIPE_WEBHOOK_SECRET=whsec_xxxxx
STRIPE_PRICE_LEADGEN_20=price_xxxxx
STRIPE_PRICE_LEADGEN_40=price_xxxxx
STRIPE_PRICE_LEADGEN_100=price_xxxxx
STRIPE_PRICE_FIGSY_20=price_xxxxx
STRIPE_PRICE_FIGSY_40=price_xxxxx
STRIPE_PRICE_FIGSY_100=price_xxxxx
# Pricing is per qualified lead (no subscriptions) — there are NO monthly agent price IDs. (legacy `_MONTHLY` price vars still exist in `stripe.ts` pending #431 — do not create them in Stripe)
```

> **⚠️ Silent-failure warning (hard-code audit 28 Jun):** the app boots fine even when the Stripe price IDs, `STRIPE_WEBHOOK_SECRET`, `ADMIN_SECRET_KEY`, or `FIGSY_COLD_FROM` are missing — it just quietly doesn't charge / doesn't send / poisons the domain. Confirm every var above on the live deploy; cross-check the **🔑 GO-LIVE CONFIG** section in LAUNCH-PAD.
> **Stripe note:** the **API** needs `STRIPE_PRICE_*` (above) to build checkout; the **portal** needs the matching `NEXT_PUBLIC_STRIPE_PRICE_*` (Step 3b) to enable the Buy button. Both sets, same price IDs.

### 2c. Get your Railway API URL

Railway → API service → **Settings** → **Networking** → **Generate Domain**

Copy the URL — it will look like `https://kindapi-production-xxxx.up.railway.app`

> Current live URL: `https://kindapi-production-e64c.up.railway.app`

### 2d. Verify the API is running

Open: `https://your-railway-url.up.railway.app/health`

You should see: `{"status":"ok"}`.

---

## Step 3: Railway — Deploy the Portal (client-facing)

**Time: ~10 minutes**

### 3a. Deploy

1. Railway → your project → **New** → **GitHub Repo** → select `jacquesvieiraza-blip/KIND`
2. On the new service → **Settings** → **Root Directory:** `apps/portal`
3. Railway auto-detects Next.js. First deploy may fail before env vars — that's expected.

### 3b. Set environment variables

Railway → portal service → **Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-railway-api-url.up.railway.app
# Stripe price IDs — the Buy button is DISABLED without these (same price IDs as the API)
NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40=price_xxxxx
NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100=price_xxxxx
```

### 3c. Add custom domain

Railway → portal service → **Settings** → **Networking** → **Custom Domain** → add `app.get-kind.com` (then add the shown CNAME at your DNS provider).

### 3d. Redeploy

Railway → portal service → **Deployments** → **Redeploy** latest.

### 3e. Verify

Go to `https://app.get-kind.com` → you should see the login page.

---

## Step 4: Railway — Deploy the Admin Portal

**Time: ~8 minutes**

### 4a. Deploy

1. Railway → project → **New** → **GitHub Repo** → same repo
2. New service → **Settings** → **Root Directory:** `apps/admin`
3. Railway auto-detects Next.js → it builds automatically.

### 4b. Set environment variables

Railway → admin service → **Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-railway-api-url.up.railway.app
ADMIN_SECRET_KEY=your-admin-secret-key              ← same value as the API service
```

> The admin portal routes all management calls through the API using ADMIN_SECRET_KEY. The service role key is NOT used client-side in admin — all admin operations proxy through the API on Railway.

### 4c. Add custom domain

Railway → admin service → **Settings** → **Networking** → **Custom Domain** → add `admin.get-kind.com`.

### 4d. Redeploy and verify

Go to `https://admin.get-kind.com` → you should see the admin dashboard.

---

## Step 5: Railway — Deploy the Website

**Time: ~5 minutes**

### 5a. Deploy

1. Railway → project → **New** → **GitHub Repo** → same repo
2. New service → **Settings** → **Root Directory:** `apps/website`
3. It's a static site — set **Build Command** to empty (or `echo done`) and serve the directory. Railway's static/Nixpacks build will serve `apps/website` directly.

### 5b. Add custom domains

Railway → website service → **Settings** → **Networking** → **Custom Domain**:
- Add `get-kind.com`
- Add `www.get-kind.com`

### 5c. Verify

Go to `https://get-kind.com` → you should see the marketing homepage.

> **Note:** Website is a Railway Express service (`apps/website`). Cloudflare provides DNS + CDN/failover only — not Pages hosting.

---

## Step 6: Stripe — Products and Webhook

**Time: ~15 minutes**

### 6a. Create products in Stripe

Pricing is **per qualified lead — no subscriptions.** Create the pay-per-lead / credit products only, not monthly agent plans:

1. Stripe → **Products** → **Add product** — create the **Lead-gen** (reveal) and **FIGSY** credit bundles (20 / 40 / 100).
2. After creating each product, copy the **Price ID** (`price_xxx...`).
3. Add the price IDs as Railway env vars (never in code) — the `STRIPE_PRICE_LEADGEN_*` / `STRIPE_PRICE_FIGSY_*` set (see Step 2b / 3b). Milla, Vida and Denise bill per qualified lead when they ship — there are **no `_MONTHLY` recurring products.** (code still defines `_MONTHLY` vars until #431 lands)

### 6b. Set the webhook URL

1. Stripe → **Developers** → **Webhooks** → **Add endpoint**
2. URL: `https://kindapi-production-e64c.up.railway.app/webhooks/stripe`
3. Events to listen for: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (legacy until #431 — per-lead needs only checkout.session.completed + invoice events), `invoice.payment_succeeded`, `invoice.payment_failed`
4. Click **Add endpoint** → copy the **Signing secret** (`whsec_xxx...`) → add to Railway as `STRIPE_WEBHOOK_SECRET`

### 6c. Test the webhook

Use Stripe test card `4242 4242 4242 4242`, any future expiry, any CVV. Make a test checkout from the portal billing page. Check Railway logs — you should see the webhook arrive.

---

## Step 7: Zoho Mail — Professional Email

**Time: ~30 minutes**

This is required to send and receive email from hello@get-kind.com. **(We use Zoho Mail, not Google Workspace.)**

1. Go to [zoho.com/mail](https://www.zoho.com/mail/) → **Sign up** → add `get-kind.com` (Mail Lite / free tier is fine)
2. Zoho provides a **TXT (or CNAME) verification record** → add to DNS → click Verify in Zoho
3. Zoho provides **MX records** (`mx.zoho.com` / `mx2.zoho.com` / `mx3.zoho.com`) → add them to your domain DNS (GoDaddy/Cloudflare/Namecheap)
4. Create mailbox: **hello@get-kind.com** (primary inbox — sales, support, billing) + **privacy@get-kind.com** (POPIA requests)
5. In Zoho Admin → Email Configuration → **DKIM** → generate → add the CNAME/TXT to DNS
6. Add **SPF record**: `v=spf1 include:zoho.com ~all` (merge with any existing SPF into one record)
7. Add **DMARC record** on `_dmarc.get-kind.com`: `v=DMARC1; p=none; rua=mailto:hello@get-kind.com`

**After Zoho is live:** Update `FOUNDER_EMAIL` in Railway to `hello@get-kind.com`.

> **Note:** FIGSY cold outreach goes through Resend (from the `gettingkind.com` cold domain), NOT Zoho. Keep them separate to protect the `get-kind.com` reputation.

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
- [ ] Build ICP → Save → PDL + Hunter search fires automatically
- [ ] Leads appear within minutes to 2 hours
- [ ] All leads have AI scores (0–100) with reasoning

### Billing
- [ ] Go to Billing → select a plan → Stripe checkout opens
- [ ] Test payment completes (card: 4242 4242 4242 4242) → subscription flips to `active`
- [ ] Trial overlay gone → full access

### Admin Portal
- [ ] Log into `admin.get-kind.com`
- [ ] Client visible in Clients list with correct status
- [ ] Click client → detail page shows subscriptions, credit balance, company registration
- [ ] Grant 10 credits to test client → transaction appears in history

### Demo Environments
- [ ] Admin → Demo Environments → create new demo
- [ ] Fill in prospect name, company, industry, AE name, expiry
- [ ] System creates user + runs the PDL + Hunter ICP → leads appear
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
| Portal shows blank page | Missing env vars | Check Portal service Variables in Railway, redeploy |
| Login works but dashboard errors | API not reachable | Check `NEXT_PUBLIC_API_URL` in the Portal service (Railway), verify the API service is running |
| "Client not found" errors | RLS policy blocking | Confirm migrations ran, check client row exists in `clients` table |
| Payment verify fails | Wrong Stripe key | Confirm test vs live keys match. Check STRIPE_SECRET_KEY in Railway. |
| Webhook not arriving | Wrong URL, no events, or missing signing secret | Re-check Stripe → Webhooks URL, event list, and STRIPE_WEBHOOK_SECRET value |
| Admin proxy 403 | ADMIN_SECRET_KEY mismatch | Confirm same value in the API service and Admin service (both on Railway) |
| AI ICP Suggest returns error | Missing Anthropic key | Check `ANTHROPIC_API_KEY` is set in Railway |
| Demo leads not appearing | PDL / Hunter rate limit or quota | Check Railway logs for PDL / Hunter errors |
| Terms Library shows upload errors | Bucket missing or not public | Create `agreement-templates` bucket in Supabase Storage (public) |

---

## Environment Variable Reference

> **➡️ MOVED — the environment now has one home: [`ENVIRONMENT.md`](./ENVIRONMENT.md) (#561, 30 Jul).**
>
> What used to be here was a **partial copy that had gone wrong**, which is worse than no copy: it listed roughly 20 variables out of the **100** the three apps actually read, and it told you to set **`NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20/40/100` on the portal — three variables nothing in the codebase reads.** Anyone following it would have configured a deploy against a list that was both short and partly fictional, and had no way to know.
>
> `ENVIRONMENT.md` carries every variable, its tier, **what breaks when it is unset**, and which Railway service holds it — and a test (`env-doc-drift.test.ts`) fails the gate if a new `process.env` read appears that it does not list, or if it lists one nothing reads. That guard is why the fact lives there and is referenced here (RULEBOOK §10.1 — one owner per fact).

---

## Deployment Order Summary

```
1. Supabase (schema + migrations + auth config + bucket)   ← no dependencies
2. Railway API service (+ env vars)                        ← needs Supabase keys
3. Railway Portal service                                  ← needs Railway API URL + Supabase keys
4. Railway Admin service                                   ← needs Railway API URL + ADMIN_SECRET_KEY
5. Railway Website service                                 ← no dependencies
6. Zoho Mail                                               ← needs domain DNS access
7. Stripe products + webhook                               ← needs Railway URL for webhook
8. Upload 5 PDFs via Admin → Terms Library                 ← needs Admin deployed + Storage bucket
9. Set up 6 Railway cron jobs                              ← needs API deployed
10. Smoke test                                             ← all systems must be live
```

Steps 3, 4, and 5 can run in parallel. Steps 6 and 7 are independent of each other.
