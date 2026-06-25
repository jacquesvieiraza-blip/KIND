# API Redundancy — Render Warm Standby + Cloudflare Load Balancer
`Last-checked: 25 Jun 2026`

**Goal:** If Railway API goes dark, Cloudflare detects it within ~30 s and routes all
traffic to a warm Render instance. Portal and admin keep working transparently.

**Monthly cost:** ~$12 ($7 Render Starter + $5 Cloudflare LB)

---

## Architecture

```
Portal / Admin
     │
     ▼
Cloudflare Load Balancer (health-checks every 30 s)
     │
     ├─── PRIMARY ──→  Railway API   (kindapi-production-e64c.up.railway.app)
     │
     └─── STANDBY ──→  Render API    (kind-api-standby.onrender.com)
```

Cloudflare's custom domain `api.get-kind.com` sits in front. Portal/admin always
call `https://api.get-kind.com/…`. When Railway is healthy it routes there with zero
overhead. When Railway's `/health` fails twice in a row Cloudflare silently switches
to Render and pages the founder (optional: configure Cloudflare notification).

---

## Step 1 — Deploy to Render (~15 min)

1. **Create account** at render.com (free to sign up).

2. **New Web Service → Connect GitHub → select `jacquesvieiraza-blip/kind`**

3. **Settings:**
   - Name: `kind-api-standby`
   - Region: Oregon (us-west)
   - Branch: `main`
   - Root directory: *(leave blank — Render reads `render.yaml` from repo root)*
   - Build command: *(populated from render.yaml)*
   - Start command: *(populated from render.yaml)*
   - Plan: **Starter ($7/mo)** — keeps instance alive, no cold-start delay

4. **Environment variables** — add every variable below (copy values from Railway):

   | Variable | Where to get the value |
   |---|---|
   | `SUPABASE_URL` | Railway → API service → Variables |
   | `SUPABASE_SERVICE_ROLE_KEY` | same |
   | `NEXT_PUBLIC_SUPABASE_URL` | same (same value as SUPABASE_URL) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key |
   | `JWT_SECRET` | Railway → API service → Variables |
   | `SUPABASE_JWT_SECRET` | same |
   | `ANTHROPIC_API_KEY` | Railway → API service → Variables |
   | `RESEND_API_KEY` | same |
   | `STRIPE_SECRET_KEY` | same |
   | `STRIPE_WEBHOOK_SECRET` | same |
   | `ADMIN_SECRET_KEY` | same |
   | `API_URL` | `https://api.get-kind.com` (the LB domain, not the Render URL) |
   | `PORTAL_URL` | `https://app.get-kind.com` |
   | `NEXT_PUBLIC_APP_URL` | `https://app.get-kind.com` |

   Optional (add if set in Railway):
   `PHANTOMBUSTER_API_KEY`, `PHANTOMBUSTER_LINKEDIN_AGENT_ID`,
   `FLUTTERWAVE_SECRET_KEY`, `EXTRA_ALLOWED_ORIGINS` *(PAYSTACK_SECRET_KEY removed — Paystack killed 25 Jun)*

5. **Deploy** → wait for first build (~4 min). Confirm:
   ```
   GET https://kind-api-standby.onrender.com/health
   → {"status":"ok","service":"kind-api"}
   ```

6. **Note the Render URL** — you'll need it in Step 2.

---

## Step 2 — Cloudflare Load Balancer (~20 min)

> Requires a Cloudflare account with `api.get-kind.com` (or `get-kind.com`) managed
> there. If your DNS is elsewhere, first transfer the zone or add a CNAME.

### 2a — Add origin pool: Railway

1. Cloudflare dashboard → your zone (`get-kind.com`) → Traffic → Load Balancing
2. **Manage Pools → Create pool**
   - Name: `railway-primary`
   - Origin name: `railway`
   - Origin address: `kindapi-production-e64c.up.railway.app`
   - Port: 443, weight: 1
   - **Health check:**
     - Type: HTTPS
     - Path: `/health`
     - Expected status: 200
     - Interval: 30 s, Retries: 2, Timeout: 5 s
3. Save

### 2b — Add origin pool: Render

1. **Manage Pools → Create pool**
   - Name: `render-standby`
   - Origin name: `render`
   - Origin address: `kind-api-standby.onrender.com`
   - Port: 443, weight: 1
   - Health check: same as above (`/health`, 200, 30 s)
2. Save

### 2c — Create Load Balancer

1. **Create Load Balancer**
   - Hostname: `api.get-kind.com`
   - Proxied: ✅ (orange cloud)
2. **Add pools in order:**
   1. `railway-primary` (priority 1 — always-first when healthy)
   2. `render-standby` (priority 2 — failover)
3. **Failover policy:** Standard (route to highest-priority healthy pool)
4. **Session affinity:** None (the API is stateless — fine to switch mid-session)
5. Save → the LB record replaces any existing A/CNAME for `api.get-kind.com`

### 2d — Update CORS in Railway + Render

The existing ALLOWED_ORIGINS list in `apps/api/src/index.ts` already allows
`*.railway.app` and `*.up.railway.app`. Add the Render URL to `EXTRA_ALLOWED_ORIGINS`
on **both** Railway and Render:

```
EXTRA_ALLOWED_ORIGINS=https://kind-api-standby.onrender.com
```

---

## Step 3 — Update portal + admin API base URL

Everywhere the portal and admin call the API they should now use `api.get-kind.com`
(the LB domain) instead of the Railway URL directly.

Check your Railway portal/admin env vars:
```
NEXT_PUBLIC_API_URL=https://api.get-kind.com
API_URL=https://api.get-kind.com
```

If they currently point directly at the Railway URL, update them and redeploy.

---

## Step 4 — Test failover

1. With the LB live, hit `https://api.get-kind.com/health` — should respond.
2. In Cloudflare → Traffic → Load Balancing → mark `railway-primary` pool as **disabled**
   (simulates Railway outage).
3. Within ~30 s, requests should route to Render. Confirm:
   ```
   GET https://api.get-kind.com/health → 200
   ```
4. Re-enable the pool.

---

## Step 5 — Keep env vars in sync

Any new env var added to Railway API **must** also be added to Render. Claude will
check for the Render standby in every `full-check.sh` run and flag if it's missing.

---

## Ongoing — Stripe webhooks

Stripe webhooks are sent to a hardcoded URL. If Railway is down, Stripe retries for
72 h — you won't lose events. After failover is stable, optionally add the Render URL
as a second webhook endpoint in Stripe dashboard (for belt-and-suspenders).

The `STRIPE_WEBHOOK_SECRET` is different per endpoint — set a separate
`STRIPE_WEBHOOK_SECRET_RENDER` in Render and handle it in a future code change.
For now, Railway remains the Stripe webhook target; Render handles all other traffic.

---

## Cost breakdown

| Service | Plan | $/mo |
|---|---|---|
| Render Web Service | Starter | $7 |
| Cloudflare Load Balancer | Basic | $5 |
| **Total** | | **$12** |

Cloudflare LB requires at least a Free plan zone. The LB itself is a paid add-on.
