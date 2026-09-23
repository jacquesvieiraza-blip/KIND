# Portal + Admin Redundancy — Render Warm Standby + Cloudflare Load Balancer

**Goal:** If Railway dies, the portal (`app.get-kind.com`) and admin (`admin.get-kind.com`)
fail over to warm Render instances — the same pattern already used for the API.

> ⚠️ **AUDIT 24 Jun — config contradiction (code-fix, deferred under freeze):** `render.yaml:169` declares `NEXT_PUBLIC_ADMIN_KEY` on the standby, but a `NEXT_PUBLIC_`-prefixed key is exposed to the browser — exactly what the 8-Jun security fix forbids. Resolve when the freeze lifts: standby admin auth should use the server-only `ADMIN_SECRET`, never `NEXT_PUBLIC_ADMIN_KEY`. _Last-checked: 24 Jun 2026._

> **Is this worth it?** The **API is the critical shared dependency** — if it's down,
> nothing works, which is why the API standby (see `render-cloudflare-failover.md`) is
> the priority. Portal/admin standby is **optional belt-and-suspenders**. Note that
> Next.js standby instances cost more to keep warm than a static site would: these are
> full Node servers (server components, SSR, redirects), so there's no cheap static
> fallback. If budget is tight, do the API standby first and add these later.

**Monthly cost:** ~$14 extra (2 × $7 Render Starter). Cloudflare LB hostname cost — see
[Cost breakdown](#cost-breakdown) below.

---

## Architecture

```
Browser
   │
   ├── app.get-kind.com ──→ Cloudflare LB ──┬── PRIMARY  Railway portal
   │                                         └── STANDBY  Render kind-portal-standby
   │
   └── admin.get-kind.com ─→ Cloudflare LB ─┬── PRIMARY  Railway admin
                                             └── STANDBY  Render kind-admin-standby
```

Both standby apps call the API through **`https://api.get-kind.com`** (the
load-balanced API domain), **not** the Railway URL — so a Railway API outage doesn't
take the standby frontends down with it. This is already wired into `render.yaml` via
`NEXT_PUBLIC_API_URL=https://api.get-kind.com`.

---

## Step 1 — Deploy portal + admin to Render (~20 min)

Both services are already defined in `render.yaml` at the repo root
(`kind-portal-standby`, `kind-admin-standby`). Render reads them automatically.

1. **Render dashboard → New → Blueprint** (or two separate Web Services if you prefer).
   Connect GitHub → select `jacquesvieiraza-blip/KIND` → branch `main`.
   Render picks up both `web` services from `render.yaml`.

2. **Settings (already populated from `render.yaml`):**
   - Names: `kind-portal-standby`, `kind-admin-standby`
   - Region: Oregon (us-west) — geographically separate from Railway
   - Root directory: *(blank — Render reads `render.yaml` at repo root; each service sets `rootDir: .`)*
   - Build / start commands: *(populated from `render.yaml`, yarn workspace monorepo build)*
   - Plan: **Starter ($7/mo each)** — keeps each Next.js instance warm
   - Auto-deploy: **off** (Railway stays primary; deploy Render manually on demand)

3. **Environment variables** — copy values from Railway. The `value:`-set vars
   (`NODE_ENV`, `PORT`, `NEXT_PUBLIC_API_URL`) are already filled by `render.yaml`;
   add the `sync: false` secrets in the Render dashboard.

   **Portal (`kind-portal-standby`)** — copy from Railway portal service:

   | Variable | Where to get the value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | **`https://api.get-kind.com`** (the LB domain — already set in render.yaml, do NOT use Railway URL) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Railway → portal → Variables |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → anon key |
   | `NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_20` | Railway → portal → Variables |
   | `NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_40` | same |
   | `NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_100` | same |
   | `NEXT_PUBLIC_STRIPE_PRICE_FIGSY_20` | same |
   | `NEXT_PUBLIC_STRIPE_PRICE_FIGSY_40` | same |
   | `NEXT_PUBLIC_STRIPE_PRICE_FIGSY_100` | same |
   | `FEATURE_PORTAL_V2` | optional — copy if set in Railway |

   > These are all `NEXT_PUBLIC_*` (baked into the client bundle at **build** time), so
   > they must be present before the build runs. Add them, then trigger a deploy.

   **Admin (`kind-admin-standby`)** — copy from Railway admin service:

   | Variable | Where to get the value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | **`https://api.get-kind.com`** (already set in render.yaml) |
   | `NEXT_PUBLIC_SUPABASE_URL` | Railway → admin → Variables |
   | `SUPABASE_SERVICE_ROLE_KEY` | Railway → admin → Variables (server-side only) |
   | `ADMIN_SECRET_KEY` | Railway → admin → Variables (server-side only) |
   | `RESEND_API_KEY` | same (admin sends email via Resend) |

   > ⛓️ **23 Sep (checked against main `83e9c1b`):** **the admin table above is missing two variables the admin app requires** (ENVIRONMENT.md 🔴): **`ADMIN_ALLOWED_EMAILS`** (unset = every Vida page 401s) and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** (build-time); neither is in `render.yaml`'s `kind-admin-standby` either. On the portal side the three `NEXT_PUBLIC_STRIPE_PRICE_LEADGEN_*` rows are read by no code, and the FIGSY ones feed a Buy button whose checkout answers 410 (R137). The portal login page is `apps/portal/src/app/(auth)/login`, still served at `/login`. Whether either standby is deployed is RUNTIME UNVERIFIED.

   > ⚠️ **Do NOT set `NEXT_PUBLIC_ADMIN_KEY` on the standby — or anywhere.** It was
   > removed in the 8-Jun security fix: the `NEXT_PUBLIC_` prefix baked the admin secret
   > into the browser bundle (a full auth-bypass). The admin proxy authenticates
   > server-side with `ADMIN_SECRET_KEY` only. (`ADMIN_SECRET` is legacy — copy it to the
   > standby only if it is still set on the live admin service.)

4. **Deploy** → wait for the first build (~5–7 min each — Next.js builds are slower
   than the API). Confirm each responds:
   ```
   GET https://kind-portal-standby.onrender.com/login   → 200 (login page)
   GET https://kind-admin-standby.onrender.com/health   → 200 (status page)
   ```

5. **Note both Render URLs** — you'll need them in Step 2.

> **Why these health paths?** Portal `/` 307-redirects to `/login`, so we health-check
> `/login` directly (a clean 200). Admin `/health` is a dedicated lightweight status
> page (cheaper than the dashboard `/`, which runs heavy Supabase queries).

---

## Step 2 — Cloudflare Load Balancer (~25 min)

> Requires `get-kind.com` managed in Cloudflare, same as the API setup. You'll create
> **two** load balancers — one per hostname — each with a Railway pool + Render pool.

### 2a — Portal: pools + LB for `app.get-kind.com`

1. Cloudflare → zone `get-kind.com` → Traffic → Load Balancing → **Manage Pools → Create pool**
   - Name: `portal-railway-primary`
   - Origin address: *(your Railway portal domain, e.g. `kind-portal-production-xxxx.up.railway.app`)*
   - Port 443, weight 1
   - **Health check:** HTTPS, path `/login`, expected status `200`, interval 30 s, retries 2, timeout 5 s
2. **Create pool**
   - Name: `portal-render-standby`
   - Origin address: `kind-portal-standby.onrender.com`
   - Port 443, weight 1
   - Health check: same (`/login`, 200, 30 s)
3. **Create Load Balancer**
   - Hostname: `app.get-kind.com`
   - Proxied: ✅ (orange cloud)
   - Pools in priority order: `portal-railway-primary` (1), `portal-render-standby` (2)
   - Failover policy: Standard (highest-priority healthy pool)
   - Session affinity: **Cookie** (recommended — keeps a user on one origin through their
     session; portal has logged-in state, unlike the stateless API)

### 2b — Admin: pools + LB for `admin.get-kind.com`

1. **Create pool** `admin-railway-primary`
   - Origin: *(your Railway admin domain)*, port 443
   - Health check: HTTPS, path `/health`, status `200`, 30 s / retries 2 / timeout 5 s
2. **Create pool** `admin-render-standby`
   - Origin: `kind-admin-standby.onrender.com`, port 443
   - Health check: same (`/health`, 200, 30 s)
3. **Create Load Balancer**
   - Hostname: `admin.get-kind.com`, proxied ✅
   - Pools: `admin-railway-primary` (1), `admin-render-standby` (2)
   - Failover: Standard. Session affinity: Cookie.

> Each LB record replaces the existing A/CNAME for that hostname. Make sure the records
> for `app.get-kind.com` / `admin.get-kind.com` currently pointing at Railway are
> superseded by the LB (Cloudflare warns if there's a conflict).

---

## Step 3 — Custom domains on Render (optional but recommended)

For Render to serve `app.get-kind.com` / `admin.get-kind.com` correctly behind the LB
(TLS + host matching), add the custom domain to each Render service:

- Render → `kind-portal-standby` → Settings → Custom Domains → add `app.get-kind.com`
- Render → `kind-admin-standby` → Settings → Custom Domains → add `admin.get-kind.com`

Render will issue a cert. Since traffic arrives via the Cloudflare LB (proxied), this
lets Render accept the host header during failover. (Same as you'd do for Railway.)

---

## Step 4 — Test failover

For each hostname:

1. With the LB live, hit `https://app.get-kind.com/login` and `https://admin.get-kind.com/health`
   — both should respond 200.
2. Cloudflare → Traffic → Load Balancing → disable the **`*-railway-primary`** pool
   (simulates a Railway outage).
3. Within ~30 s, requests route to Render. Confirm the pages still load and that the
   app can talk to the API (the standby's `NEXT_PUBLIC_API_URL` already points at
   `api.get-kind.com`, so this works even if the Railway API is also down).
4. Re-enable the pool.

Repeat for admin.

---

## Step 5 — Keep env vars in sync

Any new `NEXT_PUBLIC_*` var added to the Railway portal/admin **must** also be added to
the matching Render standby **and a redeploy triggered** — `NEXT_PUBLIC_*` vars are
baked in at build time, so a stale standby will ship the old values. Add to the
`full-check.sh` drift check alongside the API standby.

---

## Cost breakdown

| Service | Plan | $/mo |
|---|---|---|
| Render — `kind-portal-standby` | Starter | $7 |
| Render — `kind-admin-standby` | Starter | $7 |
| Cloudflare LB — extra hostnames | see note | varies |
| **Total (Render only)** | | **~$14 extra** |

**Cloudflare LB hostname cost:** the Cloudflare Load Balancing add-on bills per
**load-balanced hostname** (and per origin/health-check volume) beyond what's included
in the base LB plan. The API setup already uses one hostname (`api.get-kind.com`);
adding `app.get-kind.com` and `admin.get-kind.com` are **two more hostnames** and may
push you into additional LB cost depending on your plan tier. Check current Cloudflare
Load Balancing pricing before enabling — the $14/mo above is Render only.

**Why not static?** These are Next.js apps with server components, SSR, and redirects —
there's no cheap static-hosting fallback, so the warm standby is a full $7 Node service
each. Given the API is the critical shared dependency, treat portal/admin standby as
**optional** and add it only if the extra ~$14/mo (plus any CF hostname cost) is worth
the reduced blast radius.
