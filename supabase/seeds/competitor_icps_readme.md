# Competitor ICP Seed Configs

Four ICP configurations targeting users of competing cold outreach tools in Africa.
Run these against KIND's own `FIGSY_KIND_CLIENT_ID` client row to generate self-outreach leads.

---

## What Each ICP Targets

### 1. Lemlist Users — Africa SaaS SDRs
**Competitor:** Lemlist (cold email + LinkedIn sequences, ~$50-100/mo)
**Persona:** SDRs, Sales Managers, Growth Hackers, BDMs
**Company profile:** Tech/SaaS companies, 11–500 employees
**Why they switch:** Lemlist is expensive for Africa-based teams, has poor local support, and lacks AI-native personalisation. KIND offers FIGSY AI sequences at a lower price point in ZAR/NGN/KES.
**Apollo search signals:** `cold email`, `outbound sales`, `email sequences`, `Lemlist` in tech stack
**Expected leads per run:** 15–30 (ZA heavy, NG/KE secondary)

---

### 2. Instantly.ai Users — Africa Agencies & Founders
**Competitor:** Instantly.ai (high-volume cold email, agency-focused, ~$37-97/mo)
**Persona:** Agency owners, founders, SDRs, email marketing managers
**Company profile:** Bootstrapped SaaS, digital agencies, 1–200 employees
**Why they switch:** Instantly is built for US senders — deliverability and compliance for Africa senders is poor, no POPIA/NDPR awareness, no local pricing. KIND has Africa-first infrastructure and POPIA-compliant outreach.
**Apollo search signals:** `cold email agency`, `email warm-up`, `bootstrapped SaaS`, `Instantly` in tech stack
**Expected leads per run:** 20–40 (NG/GH/EG have large agency ecosystems)

---

### 3. Clay Users — Africa RevOps & GTM Engineers
**Competitor:** Clay (data enrichment + workflow automation, $149-800/mo)
**Persona:** RevOps Managers, GTM Engineers, Demand Gen, Growth Analysts
**Company profile:** Series A–C funded startups, 51–1,000 employees
**Why they switch:** Clay requires significant technical setup and a large data budget. KIND bundles Apollo enrichment + AI sequencing into a single workflow at a fraction of the cost, with no-code setup. Especially compelling for Africa-based ops teams with limited headcount.
**Apollo search signals:** `lead enrichment`, `RevOps`, `Series A/B/C`, `GTM stack`, `Clay` in tech stack
**Expected leads per run:** 10–20 (smaller pool — niche technical persona)

---

### 4. Apollo Sequences Users — Africa Mid-Market Sales
**Competitor:** Apollo.io Sequences (built-in sequencing tool inside Apollo, ~$49-119/user/mo)
**Persona:** AEs, SDRs, Sales Ops, Sales Enablement, VP/Director of Sales
**Company profile:** Mid-market tech companies, 200–1,000+ employees
**Why they switch:** Apollo's sequencing is generic, lacks AI personalisation, and is bundled with a costly seat licence. KIND's FIGSY generates memory-driven, account-specific sequences. Sales teams in Africa also face Apollo's USD-only pricing.
**Apollo search signals:** `Apollo sequences`, `sales cadence`, `outbound pipeline`, `Apollo.io` in tech stack
**Expected leads per run:** 15–25 (solid mid-market pool in ZA/NG)

---

## How to Use

### Step 1 — Find FIGSY_KIND_CLIENT_ID
This is the `id` in the `clients` table for KIND's own outreach client row.
You can find it in Railway environment variables (`FIGSY_KIND_CLIENT_ID`) or by running:

```sql
SELECT id, company_name FROM public.clients WHERE company_name ILIKE '%kind%' LIMIT 5;
```

### Step 2 — Replace the placeholder client_id
In `competitor_icps.sql`, do a find-and-replace:

```
Find:    00000000-0000-0000-0000-000000000000
Replace: <paste FIGSY_KIND_CLIENT_ID here>
```

### Step 3 — Run in Supabase SQL Editor
1. Open [Supabase Dashboard](https://supabase.com/dashboard) → your KIND project
2. Go to **SQL Editor**
3. Paste the entire contents of `competitor_icps.sql` (after replacing client_id)
4. Click **Run**

### Step 4 — Trigger the ICP runs
After insertion, either:
- Go to the Admin Dashboard → ICPs → Run each one manually
- Or call the API for each inserted ICP ID:

```bash
curl -X POST https://kindapi-production-e64c.up.railway.app/icps/<ICP_ID>/run \
  -H "Authorization: Bearer <KIND_ADMIN_JWT>"
```

### Step 5 — Monitor leads
Check the `leads` table filtered by `client_id = FIGSY_KIND_CLIENT_ID` to see inserted leads.
FIGSY will auto-enroll them in the active self-outreach campaign (if one exists) or fall back to Day 1 outreach.

---

## Expected Lead Volume Per Run

| ICP | Expected leads/run | Best markets |
|---|---|---|
| Lemlist Users | 15–30 | ZA, NG |
| Instantly.ai Users | 20–40 | NG, GH, EG |
| Clay Users | 10–20 | ZA, KE |
| Apollo Sequences Users | 15–25 | ZA, NG |
| **Total** | **60–115** | All 5 markets |

> Note: These are estimates based on Apollo's typical Africa data density for these personas.
> The 3-pass fallback in `searchPeopleWithFallback` will relax filters if initial results are thin.
> Actual delivery is gated by `leads_per_run` and `credit_balance` on the client row.
