# KIND Platform — Handover & Status Report
**Date: 18 May 2026**

---

## IMMEDIATE ACTIONS (Do These First)

### YOU must do (requires Vercel/Supabase access):

| # | Action | Where | Status |
|---|--------|--------|--------|
| 1 | **Upgrade Vercel to Pro** | vercel.com/billing | Hit 100 deploys/day free limit — upgrade to Pro (~$20/mo per project) or wait 24h each day |
| 2 | **RLS migration** | Supabase → SQL Editor | ✅ Done |
| 3 | **Demo columns migration** | Supabase → SQL Editor | ✅ Done |
| 4 | **Smoke test full platform** | get-kind.com + app.get-kind.com | After next Vercel deploy |

---

## WHAT WAS DONE (Last 3 Days)

### Critical Bug Fixes

#### 1. Empty Dashboard Loop (FIXED)
- **Root cause**: `dashboard/page.tsx` and `layout.tsx` using `createAdminClient()` which silently failed on Vercel.
- **Fix**: Both files now use the authenticated Supabase client. RLS `auth.uid() = user_id` allows it.

#### 2. Signup "Network Error" on get-kind.com (FIXED)
- **Root cause**: Website signup form calling broken Railway endpoint with CORS errors.
- **Fix**: Website signup redirects to `app.get-kind.com/login`. Portal calls Railway `/auth/signup` directly.

#### 3. Subscription Insert Failing — `amount_usd` column error (FIXED)
- **Root cause**: PostgREST schema cache stale — PGRST204.
- **Fix**: Removed `amount_usd`/`amount_zar` from all subscription inserts (both have `DEFAULT 0`).

#### 4. Subscription insert — wrong tier `usage` (FIXED)
- **Fix**: Changed to `tier: 'starter'`.

#### 5. ICP "Save & Find Leads" button silently disabled (FIXED)
- **Fix**: Button always clickable. Clicking with empty name shows error + scrolls to Name field.

#### 6. ICP error showing `[object Object]` (FIXED)
- **Fix**: `api.ts` now flattens Zod error arrays to readable string.

#### 7. Vercel not deploying (FIXED)
- **Fix**: All three projects now track `main` branch (was `claude/ai-business-roadmap-U3OWJ`).

### Features Added

#### ICP Auto-name Suggestion
- When criteria are selected but Name is empty, shows clickable "✨ Use: C-Suite · South Africa · Fintech" hint

#### Book a Demo CTAs on locked product screens
- FIGSY, Virtual Assistant, Chatbot locked screens → "Upgrade" + "Book a demo" (cal.com/get-kind/demo)

#### System Health Status in Sidebar
- Live API health dot: green "All systems operational" / amber "Service disruption"

#### Demo Environments (admin.get-kind.com → Demo Envs)
- Create a fully live demo for any prospect — real account, all 4 products, auto-ICP runs Apollo
- "Open Demo" generates a magic link and opens portal as that client in a new tab (sales team only, prospect never sees link)
- Extend / Expire per demo, tracks who created it
- Requires: `PATCH` and `DELETE` added to admin proxy route

#### Admin Dashboard UI
- Full KPI tracking, client pipeline health, MRR progress bars, TTFL metrics at admin.get-kind.com

#### Supabase Middleware
- JWT refresh on every request — fixes session expiry

---

## WHAT STILL NEEDS TO BE DONE

### Pending (you need to do):

| # | Task | Where |
|---|------|--------|
| 1 | **Upgrade Vercel to Pro** | vercel.com/billing — remove 100 deploys/day cap |
| 2 | **Smoke test** signup → onboard → dashboard → ICP → leads | get-kind.com after deploy |
| 3 | **Test Demo Environments** — create demo, run ICP, click Open Demo | admin.get-kind.com after deploy |
| 4 | **Test "Book a demo"** on FIGSY/VA/Chatbot locked screens | app.get-kind.com |

### Pending (Claude can do):

| # | Task | Effort | Notes |
|---|------|--------|-------|
| 1 | **Paystack billing smoke test** | Medium | Step through topup, verify credit balance updates |
| 2 | **FIGSY end-to-end test** | Medium | Create campaign, verify Day 1 outreach fires to leads |
| 3 | **Email notification test** | Medium | First-leads email — verify it fires and renders correctly |
| 4 | **Referral tracking verification** | Small | Sign up with ref code, verify both accounts get 100 credits |
| 5 | **Add more sales team members to Demo Envs** | Small | Currently hardcoded: Jacques, Sales Engineer, Other — easy to expand |

---

## ARCHITECTURE OVERVIEW

| Component | Hosting | Branch | URL |
|-----------|---------|--------|-----|
| Portal (Next.js) | Vercel | `main` | app.get-kind.com |
| Website (static HTML) | Vercel | `main` | get-kind.com |
| Admin (Next.js) | Vercel | `main` | admin.get-kind.com |
| API (Express/Node) | Railway | `main` | kindapi-production-e64c.up.railway.app |
| Database | Supabase | — | (Supabase project) |

### Key environment variables — Vercel (portal):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL` = `https://kindapi-production-e64c.up.railway.app`

### Key environment variables — Railway (API):
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- `APOLLO_API_KEY`, `ADMIN_SECRET_KEY`
- `OPENAI_API_KEY`, `RESEND_API_KEY`
- `PORTAL_URL` = `https://app.get-kind.com`

---

## SMOKE TEST CHECKLIST

- [ ] get-kind.com signup → redirects to app.get-kind.com/login
- [ ] Sign up → no email confirmation → lands on /onboard
- [ ] Complete onboard → dashboard loads with greeting + stats
- [ ] Create ICP → fill criteria → name suggestion appears → Save & Find Leads → leads appear
- [ ] FIGSY / VA / Chatbot locked screens show "Book a demo" button
- [ ] Sidebar shows green "All systems operational"
- [ ] Sign out → /login, sign back in → dashboard loads
- [ ] Admin: create demo env → ICP runs → leads count updates → Open Demo opens portal in new tab
- [ ] Admin: extend demo date → Expire demo → status changes

---

## KEY FILES CHANGED

```
apps/portal/src/app/(dashboard)/dashboard/page.tsx         — auth client, not admin client
apps/portal/src/app/(dashboard)/layout.tsx                 — auth client, not admin client
apps/portal/src/app/(auth)/login/page.tsx                  — signup calls Railway directly
apps/portal/src/app/(dashboard)/dashboard/leads/icp/page.tsx — name validation + auto-suggest
apps/portal/src/lib/api.ts                                 — fix [object Object] Zod errors
apps/portal/src/middleware.ts                              — Supabase JWT refresh
apps/api/src/routes/auth.ts                                — onboard subscription fix
apps/api/src/routes/admin.ts                               — demo environment endpoints
apps/api/src/routes/icps.ts                                — export runIcpJob, real error messages
apps/admin/src/app/demo/page.tsx                           — Demo Environments UI (new)
apps/admin/src/components/AdminNav.tsx                     — added Demo Envs nav item
apps/admin/src/app/api/proxy/[...path]/route.ts            — added PATCH + DELETE
apps/website/index.html                                    — signup redirects to portal
supabase/migrations/20260518_enable_rls.sql                — RLS re-enable ✅ run
supabase/migrations/20260518_demo_environments.sql         — demo columns ✅ run
```
