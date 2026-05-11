# KIND AI Platform — Deployment Guide

**Version:** 1.0 · **Date:** May 2026  
**Time required:** ~90 minutes end-to-end (first time)  
**Prerequisites:** Accounts on Supabase, Vercel, Railway, Paystack, Netlify, Formspree, Anthropic

---

## Before You Start — Collect These Keys First

Open a temporary notepad. You will need all of these before you start. Collect them first, then run the steps in order.

| Key | Where to find it | Variable name |
|-----|-----------------|---------------|
| Supabase Project URL | Supabase → Project Settings → API → Project URL | `SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL` |
| Supabase Anon Key | Supabase → Project Settings → API → anon public | `SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Supabase Service Role Key | Supabase → Project Settings → API → service_role | `SUPABASE_SERVICE_ROLE_KEY` |
| Paystack Secret Key | Paystack → Settings → API Keys & Webhooks → Secret Key | `PAYSTACK_SECRET_KEY` |
| Paystack Public Key | Paystack → Settings → API Keys & Webhooks → Public Key | `PAYSTACK_PUBLIC_KEY` |
| Anthropic API Key | console.anthropic.com → API Keys | `ANTHROPIC_API_KEY` |
| Railway API URL | After deploying API — Railway → your service → Settings → Domain | `NEXT_PUBLIC_API_URL` |
| Vercel Portal URL | After deploying portal — Vercel → Domains | `PORTAL_URL` |

---

## Step 1: Supabase — Database Setup

**Time: ~10 minutes**

### 1a. Run the schema

1. Go to [supabase.com](https://supabase.com) → open your KIND project
2. In the left sidebar click **SQL Editor**
3. Click **New query**
4. Open the file `packages/db/src/schema.sql` from this repo
5. Copy the entire contents and paste it into the SQL editor
6. Click **Run** (or press Ctrl+Enter / Cmd+Enter)
7. You should see: `Success. No rows returned`

> If you see errors about tables already existing, that is fine — the schema uses `CREATE TABLE IF NOT EXISTS`. If you see an error about a specific table or function, check that you pasted the entire file.

### 1b. Create the Storage bucket

1. In Supabase left sidebar click **Storage**
2. Click **New bucket**
3. Name it exactly: `agreement-templates`
4. Toggle **Public bucket** to ON
5. Click **Create bucket**

### 1c. Verify tables were created

1. In Supabase left sidebar click **Table Editor**
2. Confirm you can see these tables:
   - `clients`
   - `subscriptions`
   - `leads`
   - `icps`
   - `opt_out_blocklist`
   - `agreement_templates`
   - `order_forms`
   - `assistant_messages`
   - `chatbot_configs`
   - `usage_metrics`

If any are missing, re-run the SQL editor with the full schema file.

---

## Step 2: Railway — Deploy the API

**Time: ~15 minutes**

### 2a. Deploy

1. Go to [railway.app](https://railway.app) → **New Project**
2. Select **Deploy from GitHub repo** → connect your repo → select `jacquesvieiraza-blip/KIND`
3. Railway will detect the monorepo. Set the **Root directory** to `apps/api`
4. Set **Build command:** `npm run build`
5. Set **Start command:** `npm start`
6. Click **Deploy**

### 2b. Set environment variables

In Railway → your API service → **Variables** tab, add every line from `apps/api/.env.example`:

```
PORT=4000
PORTAL_URL=https://your-portal.vercel.app          ← fill after Step 3
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
ADMIN_EMAILS=your@email.com
```

**Paystack plan codes** — leave these blank for now; you will fill them in Step 5:
```
PAYSTACK_PLAN_LEAD_GEN_STARTER=
PAYSTACK_PLAN_LEAD_GEN_PRO=
PAYSTACK_PLAN_LEAD_GEN_ENTERPRISE=
PAYSTACK_PLAN_VA_STARTER=
PAYSTACK_PLAN_VA_PRO=
PAYSTACK_PLAN_VA_ENTERPRISE=
PAYSTACK_PLAN_CHATBOT_STARTER=
PAYSTACK_PLAN_CHATBOT_PRO=
PAYSTACK_PLAN_CHATBOT_ENTERPRISE=
```

### 2c. Get your Railway API URL

1. Railway → your API service → **Settings** → **Networking** → **Generate Domain**
2. Copy the URL — it will look like `https://kind-api-production-xxxx.railway.app`
3. Save this — you need it for Vercel env vars and Paystack webhook

### 2d. Verify the API is running

Open a browser and go to: `https://your-railway-url.railway.app/health`

You should see: `{"status":"ok"}` or similar. If you get a 502/503, check Railway logs for errors.

---

## Step 3: Vercel — Deploy the Portal (Client-facing)

**Time: ~10 minutes**

### 3a. Deploy

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import from GitHub → select `jacquesvieiraza-blip/KIND`
3. Set **Framework Preset:** Next.js
4. Set **Root Directory:** `apps/portal`
5. Click **Deploy** (it will fail on first deploy — that is expected before env vars)

### 3b. Set environment variables

Vercel → your portal project → **Settings** → **Environment Variables**. Add:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
```

### 3c. Redeploy

Vercel → **Deployments** → click the three dots on the latest deployment → **Redeploy**

### 3d. Get your portal URL

Copy the Vercel domain (e.g. `https://kind-portal.vercel.app`) and go back to Railway → update `PORTAL_URL` with this value. Railway will automatically redeploy.

### 3e. Verify

Go to your Vercel portal URL. You should see the login page. If you see a blank page or error, check Vercel's **Function Logs** for the error.

---

## Step 4: Vercel — Deploy the Admin Portal

**Time: ~8 minutes**

### 4a. Deploy

1. Vercel → **Add New Project** → import the same repo again
2. Set **Root Directory:** `apps/admin`
3. Set **Framework Preset:** Next.js
4. Click **Deploy**

### 4b. Set environment variables

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> The admin uses the service role key to bypass RLS — keep this secret. Never expose it client-side.

### 4c. Redeploy after setting vars

Same as Step 3c — Redeploy from Vercel dashboard.

### 4d. Verify

Go to your admin Vercel URL → you should see the admin dashboard. Navigate to **Terms Library** — you should see the 5 required documents listed (all showing as not yet uploaded).

---

## Step 5: Paystack — Plans and Webhook

**Time: ~15 minutes**

### 5a. Create subscription plans

You need one plan per product per tier. Go to [paystack.com](https://paystack.com) → **Products** → **Plans** → **Create Plan** for each:

| Plan name | Amount | Interval | Plan code (copy after creating) |
|-----------|--------|----------|--------------------------------|
| KIND Lead Gen Starter | ZAR 9,500 (~$500) | Monthly | `PLN_xxx` |
| KIND Lead Gen Advanced | ZAR 22,800 (~$1,200) | Monthly | `PLN_xxx` |
| KIND Lead Gen + FIGSY Starter | ZAR 13,300 (~$700) | Monthly | `PLN_xxx` |
| KIND Lead Gen + FIGSY Advanced | ZAR 28,500 (~$1,500) | Monthly | `PLN_xxx` |
| KIND VA Starter | ZAR 3,800 (~$200) | Monthly | `PLN_xxx` |
| KIND VA Pro | ZAR 9,500 (~$500) | Monthly | `PLN_xxx` |
| KIND Chatbot Starter | ZAR 3,800 (~$200) | Monthly | `PLN_xxx` |
| KIND Chatbot Pro | ZAR 7,600 (~$400) | Monthly | `PLN_xxx` |

> Exchange rate used: 1 USD = 19 ZAR. Adjust for current rate.

### 5b. Update Railway env vars with plan codes

Go back to Railway → API service → Variables. Fill in the plan codes you copied:

```
PAYSTACK_PLAN_LEAD_GEN_STARTER=PLN_xxxx
PAYSTACK_PLAN_LEAD_GEN_PRO=PLN_xxxx
PAYSTACK_PLAN_VA_STARTER=PLN_xxxx
PAYSTACK_PLAN_VA_PRO=PLN_xxxx
PAYSTACK_PLAN_CHATBOT_STARTER=PLN_xxxx
PAYSTACK_PLAN_CHATBOT_PRO=PLN_xxxx
```

Railway will automatically redeploy with the new variables.

### 5c. Set the webhook URL

1. Paystack → **Settings** → **API Keys & Webhooks** → **Webhooks**
2. Click **Add Webhook**
3. Enter URL: `https://your-railway-url.railway.app/webhooks/paystack`
4. Select events: `charge.success`, `subscription.create`, `subscription.disable`, `invoice.update`
5. Click **Save**

### 5d. Test the webhook

Paystack provides a test mode. Use their test card (`4084084084084081`, expiry any future date, CVV `408`) to make a test payment on the portal billing page. Check Railway logs — you should see the webhook hit arrive.

---

## Step 6: Landing Page — Netlify

**Time: ~5 minutes**

### 6a. Create a Formspree form

1. Go to [formspree.io](https://formspree.io) → **Sign up** (free plan is fine)
2. Click **New Form** → name it "KIND Landing Page Enquiries"
3. Copy the form ID — it looks like `xpwzabcd`

### 6b. Update the landing page HTML

Open `apps/landing/index.html` in any text editor.

Find this line (around line 250):
```html
action="https://formspree.io/f/YOUR_FORM_ID"
```

Replace `YOUR_FORM_ID` with your actual Formspree form ID:
```html
action="https://formspree.io/f/xpwzabcd"
```

Save the file.

### 6c. Deploy to Netlify

**Option A — Drag and drop (fastest):**
1. Go to [netlify.com](https://netlify.com) → **Sites**
2. Drag the `apps/landing/` folder onto the drag-and-drop zone
3. Netlify deploys it instantly — you get a URL like `https://kind-landing.netlify.app`

**Option B — GitHub deploy (auto-updates on push):**
1. Netlify → **Add new site** → **Import from Git**
2. Select the KIND repo
3. Set **Base directory:** `apps/landing`
4. Set **Publish directory:** `.` (the landing folder itself)
5. Click **Deploy**

### 6d. Set a custom domain (optional)

Netlify → **Domain settings** → **Add custom domain** → enter your domain (e.g. `kind.africa`). Follow DNS instructions.

---

## Step 7: Upload Agreement Documents

**Time: ~5 minutes**

This must be done before you can send any Order Form to a client.

1. Log into your admin portal (`https://your-admin.vercel.app`)
2. Navigate to **Terms Library** in the sidebar
3. You will see 5 required documents listed — all showing as not yet uploaded:
   - Master Services Agreement (MSA)
   - POPIA Compliant Process
   - Chatbot SLA
   - Order Form Terms & Conditions
   - Privacy Policy
4. For each document: click **Upload** → select the PDF from your computer → confirm
5. Once all 5 show green ticks, the system is ready to send Order Forms

> The PDFs are stored in your Supabase `agreement-templates` bucket and linked in the database. Clients will see live PDF links when they view their Documents tab.

---

## Step 8: Create Your First Client

**Time: ~3 minutes**

### 8a. Create the Supabase Auth user

1. Supabase → **Authentication** → **Users** → **Invite user**
2. Enter the client's email address
3. They receive an email with a "Set password" link — this is their portal login

### 8b. Create the client record

After they set their password, the `clients` table should auto-populate via the auth trigger. If not, run this in Supabase SQL Editor:

```sql
INSERT INTO clients (user_id, name, company, email, country)
VALUES (
  '[their-user-uuid-from-auth-table]',
  'Client Full Name',
  'Company Name',
  'client@company.com',
  'South Africa'
);
```

### 8c. Build and send the Order Form

1. Go to Admin Portal → **Clients** → find the new client
2. Click into their record
3. Fill in the Order Form: select products, tier, billing interval, start date, any scope notes
4. Click **Send Order Form to Client**
5. The client's dashboard banner will now prompt them to sign

---

## Step 9: Smoke Test — Full Flow

Run through this checklist before going live with a real client.

### Authentication
- [ ] Can sign up with a new email on the portal
- [ ] Receive confirmation email and can verify
- [ ] Can log in and see the dashboard
- [ ] Logout works correctly

### Order Form Flow
- [ ] Admin can create and send an Order Form
- [ ] Client sees the "Sign your Order Form" red banner on dashboard
- [ ] Client can view T&C documents in the Documents tab
- [ ] Client can sign the form with their full name + checkbox
- [ ] After signing, banner changes to amber "Complete payment"

### Payment Flow
- [ ] Client goes to Billing → clicks Upgrade
- [ ] Paystack checkout opens correctly
- [ ] Test payment completes (use Paystack test mode)
- [ ] Redirected to `/billing/confirm` — shows "Payment confirmed"
- [ ] Subscription row created in Supabase → status: active
- [ ] Dashboard banner clears

### Lead Gen
- [ ] Client can create an ICP in Lead Gen → ICP Builder
- [ ] Can activate the ICP
- [ ] Leads can be manually added
- [ ] AI email draft button generates an email

### Admin
- [ ] Client shows correct status badge in Clients list
- [ ] Order form status updates correctly after signing

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Portal shows blank page | Missing env vars | Check Vercel env vars, redeploy |
| Login works but dashboard errors | API not reachable | Check `NEXT_PUBLIC_API_URL` in Vercel, verify Railway is running |
| "Client not found" errors | Client row missing | Run INSERT into clients table manually |
| Payment verify fails | Wrong Paystack key | Confirm test vs live keys match your environment |
| Webhook not arriving | Wrong URL or no events selected | Re-check Paystack → Webhooks URL and event types |
| Terms Library shows upload errors | Bucket missing or not public | Create `agreement-templates` bucket in Supabase Storage and set to public |
| Order form "sign" fails | Order form row not in DB | Admin must send the form first before client can sign |
| AI email draft returns error | Missing Anthropic key | Check `ANTHROPIC_API_KEY` is set in Railway |

---

## Environment Variable Reference

### `apps/api` (Railway)

```env
PORT=4000
PORTAL_URL=https://your-portal.vercel.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYSTACK_PLAN_LEAD_GEN_STARTER=PLN_xxx
PAYSTACK_PLAN_LEAD_GEN_PRO=PLN_xxx
PAYSTACK_PLAN_LEAD_GEN_ENTERPRISE=PLN_xxx
PAYSTACK_PLAN_VA_STARTER=PLN_xxx
PAYSTACK_PLAN_VA_PRO=PLN_xxx
PAYSTACK_PLAN_VA_ENTERPRISE=PLN_xxx
PAYSTACK_PLAN_CHATBOT_STARTER=PLN_xxx
PAYSTACK_PLAN_CHATBOT_PRO=PLN_xxx
PAYSTACK_PLAN_CHATBOT_ENTERPRISE=PLN_xxx
ANTHROPIC_API_KEY=sk-ant-xxxxx
ADMIN_EMAILS=you@kind.africa
```

### `apps/portal` (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=https://your-railway-url.railway.app
```

### `apps/admin` (Vercel)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

---

## Deployment Order Summary

```
1. Supabase (schema + bucket)     ← no dependencies
2. Railway (API)                  ← needs Supabase keys
3. Vercel Portal                  ← needs Railway URL + Supabase keys
4. Vercel Admin                   ← needs Supabase keys (service role)
5. Railway: update PORTAL_URL     ← needs Vercel portal URL
6. Paystack plans + webhook       ← needs Railway URL for webhook
7. Railway: update plan codes     ← needs Paystack plan codes
8. Netlify landing page           ← needs Formspree ID
9. Upload 5 PDFs via Admin        ← needs Admin deployed + Storage bucket
10. Create first client           ← all systems must be live
```

Follow this exact order. Steps 3 and 4 can be done in parallel. Steps 6 and 8 are independent of each other.
