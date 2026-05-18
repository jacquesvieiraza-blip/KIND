# KIND Platform — Handover & Status Report
**Date: 18 May 2026**

---

## IMMEDIATE ACTIONS (Do These First)

### YOU must do (requires Vercel/Supabase access):

| # | Action | Where | Status |
|---|--------|--------|--------|
| 1 | **Wait for Vercel deploy limit reset** (hit 100/day cap) | Vercel dashboard | Resets ~18:00 tomorrow — next push to `main` will auto-deploy |
| 2 | **Run RLS migration in Supabase** | Supabase → SQL Editor | Paste and run the SQL below |
| 3 | **Create demo account** | Terminal or Postman | Run the API call below |
| 4 | **Smoke test full signup flow** | get-kind.com | Walk through after Vercel deploys |

#### RLS SQL to run in Supabase SQL Editor:
```sql
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icps    ENABLE ROW LEVEL SECURITY;
```
File also exists at: `supabase/migrations/20260518_enable_rls.sql`

#### Create demo account (run once):
```bash
curl -X POST https://kindapi-production-e64c.up.railway.app/admin/setup-demo \
  -H "x-admin-key: YOUR_ADMIN_KEY"
```
Returns: `demo@get-kind.com` credentials + magic link for instant access.
All 4 products activated for 1 year.

---

## WHAT WAS DONE (Last 3 Days)

### Critical Bug Fixes

#### 1. Empty Dashboard Loop (FIXED)
- **Root cause**: `dashboard/page.tsx` and `layout.tsx` were using `createAdminClient()` (service role key) which was silently failing on Vercel because `SUPABASE_SERVICE_ROLE_KEY` was not set correctly.
- **Fix**: Switched both files to use the authenticated Supabase client. RLS policy `auth.uid() = user_id` allows users to read their own row — no service key needed.

#### 2. Signup "Network Error" on get-kind.com (FIXED)
- **Root cause**: Website signup form was calling a broken Railway endpoint with CORS errors.
- **Fix**: Website signup button now redirects straight to `app.get-kind.com/login`. Portal login calls Railway `/auth/signup` directly (CORS allowed from app.get-kind.com). Railway auto-confirms email, returns magic link, user lands in dashboard.

#### 3. Subscription Insert Failing — `amount_usd` column error (FIXED)
- **Root cause**: PostgREST schema cache was stale — `amount_usd` and `amount_zar` columns exist in the DB but were not in the cache, causing PGRST204 errors.
- **Fix**: Removed `amount_usd`/`amount_zar` from all subscription inserts. Both columns have `DEFAULT 0` in schema so this is safe.

#### 4. Subscription insert — wrong tier `usage` (FIXED)
- **Root cause**: Old branch code had `tier: 'usage'` which fails the check constraint.
- **Fix**: Changed to `tier: 'starter'`.

#### 5. ICP "Save & Find Leads" button silently disabled (FIXED)
- **Root cause**: Button had `disabled={saving || !form.name.trim()}` — greyed out when ICP Name field empty, with no feedback to user. User had scrolled past the Name field at top of form.
- **Fix**: Button now always clickable. Clicking with empty name shows red error message and scrolls/focuses the Name field.

#### 6. ICP error showing `[object Object]` (FIXED)
- **Root cause**: API returns Zod validation errors as an array of objects. `new Error(array)` renders as `[object Object]`.
- **Fix**: `apps/portal/src/lib/api.ts` now flattens Zod error arrays to a readable string before throwing.

#### 7. Vercel not deploying (FIXED)
- **Root cause**: All three Vercel projects were set to deploy from `claude/ai-business-roadmap-U3OWJ` branch, not `main`. Branch tracking was hidden under Settings → Environments → Production (not under Git as expected).
- **Fix**: All three projects (portal, website, admin) now set to track `main`. All code is on `main`.

### Features Added

#### Book a Demo CTAs on locked product screens
- FIGSY, Virtual Assistant, and Chatbot locked screens all show:
  - "Upgrade" button → `/dashboard/billing`
  - "Book a demo" button → `https://cal.com/get-kind/demo`

#### System Health Status in Sidebar
- Bottom of sidebar shows live API health: green "All systems operational" / amber "Service disruption"
- Polls `https://kindapi-production-e64c.up.railway.app/health` with 5s timeout

#### Demo Account Endpoint
- `POST /admin/setup-demo` (protected by `x-admin-key` header)
- Creates `demo@get-kind.com` with all 4 products active for 1 year
- Idempotent — safe to run multiple times
- Returns credentials + magic link

#### ICP Creation Error Surfacing
- Previously showed generic "Failed to create ICP"
- Now returns the actual error message from Railway

#### Supabase Middleware
- Added Next.js middleware at `apps/portal/src/middleware.ts`
- Refreshes Supabase JWT on every request — fixes session expiry issues

---

## WHAT STILL NEEDS TO BE DONE

### Done (added today):

| # | Task | Status |
|---|------|--------|
| 1 | **ICP auto-name suggestion** | ✅ Done — shows clickable "✨ Use: C-Suite · South Africa · Fintech" hint when criteria selected but name empty |
| 2 | **Lead export to CSV** | ✅ Already existed — "Export CSV" button in leads page header |
| 3 | **Onboarding website prefill** | ✅ Already existed — "Pre-fill ICP from website" button in onboard form, saves to localStorage, applied when creating first ICP |
| 4 | **Admin dashboard UI** | ✅ Already exists at admin.get-kind.com — full KPI tracking, client pipeline health, MRR progress, TTFL metrics |

### Pending (still to do):

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 1 | **Billing / Paystack integration smoke test** | Medium | Verify topup flow works end-to-end with real card |
| 2 | **FIGSY campaign creation end-to-end test** | Medium | Create campaign, verify Day 1 outreach fires |
| 3 | **Email notifications for new leads** | Medium | First-leads email exists but needs testing |
| 4 | **Referral tracking smoke test** | Small | Referral credit logic written, needs verification |

### Pending (you need to do):

| # | Task | Where |
|---|------|--------|
| 1 | Run RLS SQL in Supabase | SQL Editor |
| 2 | Create demo account via API call | Terminal |
| 3 | Verify Vercel deploys after limit resets tomorrow | Vercel dashboard |
| 4 | Smoke test full signup → onboard → dashboard → ICP creation flow | get-kind.com |
| 5 | Test "Book a demo" CTA links on FIGSY/VA/Chatbot locked screens | app.get-kind.com |

---

## ARCHITECTURE OVERVIEW

| Component | Hosting | Branch | URL |
|-----------|---------|--------|-----|
| Portal (Next.js) | Vercel | `main` | app.get-kind.com |
| Website (static HTML) | Vercel | `main` | get-kind.com |
| Admin (Next.js) | Vercel | `main` | admin.get-kind.com |
| API (Express/Node) | Railway | `main` | kindapi-production-e64c.up.railway.app |
| Database | Supabase | — | (Supabase project) |

### Key environment variables needed on Vercel (portal):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` = `https://kindapi-production-e64c.up.railway.app`

### Key environment variables needed on Railway (API):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `APOLLO_API_KEY`
- `ADMIN_SECRET_KEY`
- `OPENAI_API_KEY`
- `RESEND_API_KEY`

---

## SMOKE TEST CHECKLIST (Run After Deploy)

- [ ] Visit get-kind.com — signup form redirects to app.get-kind.com/login
- [ ] Sign up with new email — receives no confirmation email, lands on /onboard
- [ ] Complete onboard — company name, website URL → dashboard loads with stats
- [ ] Dashboard shows company name greeting, credit balance, stat cards
- [ ] Create ICP — fill Name + criteria → Save & Find Leads → leads appear
- [ ] FIGSY locked screen shows "Book a demo" button
- [ ] VA locked screen shows "Book a demo" button
- [ ] Chatbot locked screen shows "Book a demo" button
- [ ] Sidebar shows green "All systems operational"
- [ ] Sign out → redirected to /login
- [ ] Sign back in → dashboard loads correctly

---

## FILES CHANGED (Key Files)

```
apps/portal/src/app/(dashboard)/dashboard/page.tsx       — use auth client, not admin client
apps/portal/src/app/(dashboard)/layout.tsx               — use auth client, not admin client
apps/portal/src/app/(auth)/login/page.tsx                — signup calls Railway directly
apps/portal/src/app/(dashboard)/dashboard/leads/icp/page.tsx — ICP name validation
apps/portal/src/lib/api.ts                               — fix [object Object] Zod errors
apps/portal/src/middleware.ts                            — Supabase JWT refresh middleware
apps/api/src/routes/auth.ts                              — onboard subscription insert fix
apps/api/src/routes/admin.ts                             — demo account endpoint
apps/api/src/routes/icps.ts                              — surface real error messages
apps/website/index.html                                  — signup redirects to portal
supabase/migrations/20260518_enable_rls.sql              — RLS re-enable (run manually)
```

---

## WHAT I (CLAUDE) CAN DO NEXT

1. **Smoke test scripts** — automated checks for signup → dashboard → ICP flow
2. **Billing / Paystack smoke test** — step through topup with test card, verify credit balance updates
3. **FIGSY end-to-end** — create campaign, verify Day 1 outreach fires to inserted leads
4. **Referral tracking verification** — sign up with referral code, verify both accounts get 100 credits
5. **Fix any new errors** — just share a screenshot
