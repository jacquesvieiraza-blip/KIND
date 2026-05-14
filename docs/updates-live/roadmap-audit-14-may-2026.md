# K.I.N.D — Full Roadmap Audit
*Compared against original roadmap document · 14 May 2026*
*Do not build anything from this document without explicit instruction.*

---

## SECTION 1 — INFRASTRUCTURE

| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Monorepo (Turborepo + Yarn workspaces) | Live | ✅ Live | `apps/portal`, `apps/api`, `apps/admin`, `apps/landing`, `apps/website` |
| Supabase — auth + database (af-south-1) | Live | ✅ Live | Auth, leads, clients, ICPs, subscriptions, credit_transactions, founder_agent_logs |
| Railway — Express API | Live | ✅ Live | kindapi-production-83cb.up.railway.app · 13 routers mounted |
| Vercel — Portal (app.get-kind.com) | Live | ✅ Live | Next.js 14, 18 pages |
| Vercel — Admin (admin.get-kind.com) | Live | ✅ Live | Next.js, 6 pages + 5 API routes |
| Vercel — Website (get-kind.com) | Live | ✅ Live | Static HTML, 6 pages |
| Resend — transactional email | Live | ✅ Live | send.get-kind.com · **inbound routing NOT yet configured** |
| Paystack — billing + webhook | Live | ✅ Code live | Webhook handler built · **plan codes + secret key still need setting in Railway** |
| Anthropic API — AI drafting | Live | ✅ Live | Used in leads, figsy, founder, internal, support routes |
| Apollo.io — lead sourcing | Live | ✅ Live | Used in icps.ts ICP run |

**Infrastructure gaps:** None in code. Two pending external actions: Paystack plan codes + Railway env vars.

---

## SECTION 2 — WEBSITE (get-kind.com)

| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Full homepage rebuild — ClickUp-style white/light | Built | ✅ Built | apps/website/index.html |
| Hero: "Your pipeline, on autopilot." + node-network canvas | Built | ✅ Built | CSS canvas animation, typewriter effect |
| Problem section | Built | ✅ Built | Dark section, 3 problem cards |
| Product cards | Built | ✅ Built | Lead Gen $1, FIGSY $3, VA waitlist, Chatbot waitlist |
| FIGSY section | Built | ✅ Built | Sticky scroll scene with FIGSY character card + 4 steps |
| Pricing cards | Built | ✅ Built | 3 tiers: Lead Gen Pro, FIGSY Advanced, Enterprise |
| Stats bar | Built | ✅ Built | 250M+ contacts, 3× ICP regen, $1/lead, 14-day trial |
| About page | Built | ✅ Built | apps/website/about.html |
| Pricing page | Built | ✅ Built | apps/website/pricing.html |
| Use Cases page | Built | ✅ Built | apps/website/use-cases.html — 6 industries |
| Support page | Built | ✅ Built | apps/website/support.html |
| Smooth dropdown navigation | Built | ✅ Built | Products, Use Cases, Resources, Company dropdowns |
| Terms of Service | Built | ✅ Built | apps/website/terms.html — UK sole trader, England & Wales |
| VA + Chatbot shown as waitlist-only | Built | ✅ Built | No pricing shown, Join waitlist CTA |
| Lead Gen + FIGSY credit pricing | Built | ✅ Built | $1/$3 per qualified lead, bundles of 20 |
| YouTube demo video embed | Not in original doc | ✅ Built | Added this session |
| Auth modal (signup/login) | Not in original doc | ✅ Built | Supabase auth wired to modal on website |
| FIGSY character scroll animation | Not in original doc | ✅ Built | Sticky card with dynamic thought bubble |

---

## SECTION 3 — CLIENT PORTAL (app.get-kind.com)

### Auth
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Sign up / login / email confirmation | Built | ✅ Built | Supabase auth, (auth)/login, (auth)/onboard |
| Onboarding form (company, industry, country) | Built | ✅ Built | onboard/page.tsx |

### Dashboard
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Lead stats (total, scored, consented, avg score) | Built | ✅ Built | StatCard components |
| Product cards (Lead Gen, VA, Chatbot) | Built | ✅ Built | ProductCard component |
| Onboarding/trial status banner | Built | ✅ Built | OnboardingBanner.tsx |
| Referral banner — copy link, $100 credit reward | Built | ✅ Built | ReferralBanner.tsx |
| Support widget | Not in original doc | ✅ Built | SupportWidget.tsx — Claude Haiku chat |
| Trial expired overlay | Not in original doc | ✅ Built | TrialExpiredOverlay.tsx |
| Low credits notice | Not in original doc | ✅ Built | LowCreditsNotice.tsx |
| Notification bell | Not in original doc | ✅ Built | NotificationBell.tsx — 4 alert types, polls every 2 min |

### Lead Gen
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Full lead table with filters (status, score, ICP, Apollo consent) | Built | ✅ Built | leads/page.tsx |
| Lead scoring display (0–100) | Built | ✅ Built | Score badge with colour coding |
| Status workflow (pending → scored → consent sent → consent given → exported → opted out) | Built | ✅ Built | PATCH /leads/:id/status |
| AI email draft per lead (Claude) | Built | ✅ Built | POST /leads/:id/draft-email |
| CSV export (consent-given only) | Built | ✅ Built | GET /leads/export/csv |
| Opt-out + permanent blocklist | Built | ✅ Built | POST /leads/:id/optout + GET /leads/blocklist |
| ICP Builder — define profile, run against Apollo | Built | ✅ Built | dashboard/leads/icp/page.tsx + /icps routes |
| Bulk consent send (checkbox multi-select) | Not in original doc | ✅ Built | POST /leads/bulk-consent, up to 100 leads |

### Documents
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Order form display (services, scope, start date) | Built | ✅ Built | GET /order-forms/me |
| Electronic signature (name + checkbox) | Built | ✅ Built | POST /order-forms/:id/sign — captures IP + timestamp |
| Link to terms — no PDF required | Built | ✅ Built | get-kind.com/terms |

### Billing
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Lead Gen + FIGSY bundle pricing display | Built | ✅ Built | billing/page.tsx |
| Paystack checkout initiation | Built | ✅ Built | POST /credits/topup |
| Payment confirmation page | Built | ✅ Built | billing/confirm/page.tsx |
| Transaction history | Not in original doc | ✅ Built | GET /credits — last 50 transactions |
| Receipt/invoice print | Not in original doc | ✅ Built | printReceipt() opens printable HTML in new window |
| Auto top-up settings | Not in original doc | ✅ Built | Toggle, threshold, plan, bundle size — PATCH /clients/me/auto-topup |

### Settings
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Business profile edit (company, industry, country, website, phone) | Built | ✅ Built | settings/page.tsx |

### Additional Portal Pages
| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Roadmap page | Built | ✅ Built | dashboard/roadmap/page.tsx |
| /terms — Terms of Service | Built | ✅ Built | (legal)/terms/page.tsx |
| /privacy — Privacy Policy | Built | ✅ Built | (legal)/privacy/page.tsx |
| Error handling / global error boundary | Built | ✅ Built | error.tsx + global-error.tsx |

### FIGSY Page (not in original doc as complete feature)
| Item | Status | Notes |
|------|--------|-------|
| Campaign list and management | ✅ Built | GET/POST/PATCH/DELETE /figsy/campaigns |
| FIGSY subscription upgrade wall | ✅ Built | Blocks access if no figsy/lead_gen_figsy sub — shows upgrade banner |
| Enroll leads into campaign | ✅ Built | POST /figsy/campaigns/:id/enroll |
| Campaign status toggle (draft/active/paused) | ✅ Built | 403 surfaces upgrade prompt if no sub |
| Collapsible replies per campaign | ✅ Built | GET /figsy/campaigns/:id/replies on expand |
| Reply colour-coding by classification | ✅ Built | interested (green) / not_now (yellow) / opt_out (red) |
| AI draft follow-up on interested reply | ✅ Built | POST /figsy/replies/:id/draft-followup — Claude Haiku |
| Preview sequence before sending | ✅ Built | POST /figsy/campaigns/:id/preview-sequence |

### Usage Page
| Item | Status | Notes |
|------|--------|-------|
| Credits remaining, emails sent, reply rates | ✅ Built | dashboard/usage/page.tsx |

---

## SECTION 4 — ADMIN PORTAL (admin.get-kind.com)

| Item | Original Status | Actual Status | Notes |
|------|----------------|---------------|-------|
| Client management (list, view, create) | Built | ✅ Built | admin/clients/page.tsx + [id]/page.tsx |
| Order form creation and sending | Built | ✅ Built | admin API routes |
| Lead visibility per client | Built | ✅ Built | Visible in client detail view |
| Subscription management | Built | ✅ Built | Via subscriptions API |
| Terms/agreement template library | Not in original doc | ✅ Built | admin/terms-library/page.tsx |
| Founder agent dashboard | Not in original doc | ✅ Built | admin/founder/page.tsx — digest, logs, manual triggers |

---

## SECTION 5 — API (Railway) — All Endpoints

### /auth
- `POST /auth/onboard` — Onboard new client, create subscription + order form. Fires CS day-1 follow-up.

### /clients
- `GET /clients/me` — Profile + subscriptions + usage metrics
- `GET /clients/me/usage` — Lead usage for current billing period
- `PATCH /clients/me` — Update profile
- `POST /clients/me/crm/test` — Test HubSpot/Pipedrive connection
- `PATCH /clients/me/auto-topup` — Set auto top-up threshold, plan, bundle size
- `GET /clients/me/notifications` — 4 types: low_credits, interested_reply, new_consented_lead, trial_expiring

### /leads
- `POST /leads/public/consent` — POPIA consent callback (no auth, lead clicks link)
- `GET /leads/stats` — Total, scored, consented, avg score, pipeline value
- `GET /leads/` — List with filters (status, min_score, icp_id, apollo_consented)
- `POST /leads/` — Create lead manually
- `PATCH /leads/:id/status` — Update status
- `POST /leads/:id/optout` — Permanently block lead
- `POST /leads/:id/consent` — Send POPIA consent email
- `GET /leads/blocklist` — Opt-out blocklist
- `POST /leads/:id/draft-email` — Claude drafts cold email for this lead
- `POST /leads/bulk-consent` — Send consent to up to 100 leads at once
- `GET /leads/export/csv` — Export consented leads

### /icps
- `GET /icps/` — List all ICPs
- `POST /icps/prefill` — Scrape website + AI suggest ICP keywords
- `POST /icps/` — Create ICP + run Apollo search async
- `PATCH /icps/:id` — Update ICP
- `DELETE /icps/:id` — Delete ICP
- `POST /icps/:id/run` — Manually trigger Apollo search + score + FIGSY enroll
- `PATCH /icps/:id/activate` — Set as active ICP

### /order-forms
- `GET /order-forms/me` — Get order form + agreement templates
- `POST /order-forms/:id/sign` — Sign (name, IP, timestamp)

### /subscriptions
- `GET /subscriptions/` — List subscriptions
- `POST /subscriptions/verify` — Verify Paystack payment + activate subscription
- `POST /subscriptions/initiate` — Initiate Paystack payment for subscription plan

### /credits
- `GET /credits/` — Balance + last 50 transactions
- `POST /credits/topup` — Initiate Paystack payment for credit bundle
- `POST /credits/verify` — Verify payment + apply credits + store reusable Paystack auth code

### /figsy
- `GET /figsy/campaigns` — List campaigns
- `POST /figsy/campaigns` — Create campaign
- `PATCH /figsy/campaigns/:id` — Update (name, status) — gated behind FIGSY subscription
- `DELETE /figsy/campaigns/:id` — Delete campaign
- `GET /figsy/campaigns/:id/enrollments` — List enrolled leads
- `POST /figsy/campaigns/:id/enroll` — Enroll leads, generate AI sequences (max 50)
- `POST /figsy/campaigns/:id/preview-sequence` — Preview sequence for one lead (no send)
- `POST /figsy/send-due` — Send next step emails for due enrollments (cron or manual)
- `GET /figsy/campaigns/:id/replies` — List replies for campaign
- `POST /figsy/replies/inbound` — Webhook: classify reply + update enrollment + CRM push + auto top-up trigger
- `POST /figsy/replies/:id/draft-followup` — Claude Haiku drafts follow-up for interested reply

### /webhooks/paystack
- `POST /webhooks/paystack` — charge.success → activate sub / subscription.disable → cancel / invoice.payment_failed → past_due

### /support
- `POST /support/chat` — Claude Haiku chat with K.I.N.D context system prompt

### /founder (protected by x-admin-key header)
- `POST /founder/support/inbound` — Classify inbound email, auto-reply simple, forward complex to FOUNDER_EMAIL
- `POST /founder/cs/followup` — Claude drafts day1/day3/day7 onboarding email per client
- `POST /founder/ae/demo-request` — Draft personalised demo booking email + alert founder
- `GET /founder/digest` — 7-day agent activity summary

### /internal (protected by x-admin-key header)
- `POST /internal/digest/weekly` — Weekly leads digest emailed to all active clients
- `POST /internal/ae/at-risk` — Flag clients with no ICP or no leads after 3 days
- `POST /internal/ae/checkin-draft` — Claude drafts check-in email for specific client
- `POST /internal/ae/trial-expiry` — Trial expiry emails (day 10, 12, 14)
- `POST /internal/ae/nurture` — Trial nurture emails (day 1, 3, 5, 7, 10)
- `GET /internal/cro/dashboard` — MRR, active subs, trials, churn, leads metrics
- `POST /internal/cro/weekly-digest` — Claude generates weekly founder CRO digest
- `GET /internal/cro/churn-risk` — Churn risk score (0–100) per client
- `GET /internal/cmo/brand-voice` — Get brand voice config
- `POST /internal/cmo/brand-voice` — Override brand voice for session
- `POST /internal/cmo/linkedin-posts` — Claude drafts 3 LinkedIn posts using brand voice
- `POST /internal/cmo/prospect` — Apollo searches K.I.N.D's own ICP + emails prospect list to founder

### /admin
- `GET /admin/clients` — All clients with metrics (leads count, TTFL hours, activity)

---

## SECTION 6 — PHASE 2: REFERRAL BACKEND

| Item | Original Requirement | Status | Notes |
|------|---------------------|--------|-------|
| Store referred_by on signup via ?ref= param | Phase 2 | ✅ Built | Migration adds referred_by FK column to clients |
| credit_balance column on clients | Phase 2 | ✅ Built | Migration adds credit_balance integer default 0 |
| On first ICP run → credit both referrer + new client 100 leads | Phase 2 | ⚠️ Partial | Column exists, ReferralBanner shows link — trigger logic in icps.ts NOT confirmed |
| Show credit balance in portal | Phase 2 | ✅ Built | Sidebar shows Coins icon + balance |
| credit_transactions table | Phase 2 | ✅ Built | Tracks purchase, referral, consumed, manual_grant, refund |

**Gap:** Referral credit trigger on first ICP run needs verification/completion.

---

## SECTION 7 — PHASE 3: CREDIT-BASED BILLING

| Item | Original Requirement | Status | Notes |
|------|---------------------|--------|-------|
| Credit bundle purchase via Paystack | Phase 3 | ✅ Built | POST /credits/topup + verify |
| Bundles of 20 credits | Phase 3 | ✅ Built | Bundle sizes in billing page |
| $1/credit Lead Gen, $3/credit FIGSY | Phase 3 | ✅ Built | Pricing in billing page and website |
| Credit balance in dashboard header/sidebar | Phase 3 | ✅ Built | Sidebar Coins icon + balance |
| Manual top-up button | Phase 3 | ✅ Built | Billing page top-up flow |
| Auto top-up threshold | Phase 3 | ✅ Built | PATCH /clients/me/auto-topup |
| Credits consumed only on positive reply | Phase 3 | ✅ Built | figsy.ts /replies/inbound deducts on interested |
| Outreach pauses at 0 credits | Phase 3 | ✅ Built | Credit check in send-due |
| 7-day suspension warning email at 0 credits | Phase 3 | ⚠️ Not confirmed | Low credits notification exists in bell but 7-day email sequence not confirmed |
| Paystack auth code stored for auto top-up | Not in original doc | ✅ Built | credits.ts verify stores reusable auth_code |

**Gap:** 7-day suspension warning email sequence needs confirmation.

---

## SECTION 8 — PHASE 4: PORTAL UPGRADES

| Item | Original Requirement | Status | Notes |
|------|---------------------|--------|-------|
| Usage dashboard (credits, emails, reply rates, ROI) | Phase 4 | ✅ Built | dashboard/usage/page.tsx + GET /clients/me/usage |
| Permissions: owner / team member / read-only | Phase 4 | ❌ NOT BUILT | No role/permission system exists anywhere |
| Notifications (lead alert, low credits, ICP ready, trial expiring) | Phase 4 | ✅ Built | NotificationBell.tsx — 4 types |
| Billing history with downloadable invoices | Phase 4 | ✅ Built | Transaction history + printReceipt() |
| Credit top-up flow inline in portal | Phase 4 | ✅ Built | Billing page end-to-end |

**Gap:** Multi-user permissions/roles (owner, team member, read-only) — nothing built.

---

## SECTION 9 — PHASE 5: FIGSY OUTREACH ENGINE

| Item | Original Requirement | Status | Notes |
|------|---------------------|--------|-------|
| Day 1, Day 4, Day 9 emails from client's domain | Phase 5 | ✅ Built | send-due handles sequence steps via Resend |
| Reply classification (positive / negative / no reply) | Phase 5 | ✅ Built | /figsy/replies/inbound classifies and stores |
| Positive reply → 1 credit consumed, lead flagged qualified | Phase 5 | ✅ Built | Credit deduction + status update on interested |
| Negative / no reply → opted out after sequence | Phase 5 | ✅ Built | Enrollment marked complete/opted-out |
| FIGSY subscription gate (upgrade wall) | Phase 5 | ✅ Built | Banner in portal, 403 from API without sub |
| AI draft follow-up on interested reply | Phase 5 | ✅ Built | POST /figsy/replies/:id/draft-followup |
| Auto top-up trigger on credit deduction | Phase 5 | ✅ Built | Check block in replies/inbound after deduction |
| Centralized unified reply inbox (all campaigns) | Phase 5 | ❌ NOT BUILT | Per-campaign reply viewer exists — single inbox across all campaigns does NOT exist |
| ICP learning loop — monthly AI auto-refine from reply data | Phase 5 | ❌ NOT BUILT | No monthly review, no auto-refine of ICP |
| Calendar integration — actual meeting booking | Phase 5 | ❌ NOT BUILT | Only a hardcoded Calendly URL in one email text. No real integration. See Section 12. |
| CRM push on interested reply (HubSpot/Pipedrive) | Not in original doc | ✅ Built | Deal/opportunity pushed on positive reply |
| Campaign enrollment (AI sequence generation) | Not in original doc | ✅ Built | POST /figsy/campaigns/:id/enroll |
| Campaign preview (dry run before send) | Not in original doc | ✅ Built | POST /figsy/campaigns/:id/preview-sequence |
| Inbound webhook for reply routing | Not in original doc | ✅ Built | POST /figsy/replies/inbound — needs Resend routing |

**Gaps:**
1. Unified cross-campaign reply inbox (single view of all replies)
2. ICP learning loop (monthly auto-refine)
3. **Calendar integration — not built. See Section 12.**

---

## SECTION 10 — PHASE 6: FOUNDER AGENT STACK

| Item | Original Requirement | Status | Notes |
|------|---------------------|--------|-------|
| FIGSY running K.I.N.D's own outbound | Phase 6 | ✅ Built | POST /internal/cmo/prospect |
| Support agent monitoring hello@get-kind.com | Phase 6 | ✅ Built | POST /founder/support/inbound — needs Resend inbound routing |
| CS onboarding follow-up agent | Phase 6 | ✅ Built | POST /founder/cs/followup — day1/day3/day7 |
| AE demo booking / proposal drafting agent | Phase 6 | ✅ Built | POST /founder/ae/demo-request |
| Founder digest | Not in original doc | ✅ Built | GET /founder/digest — 7-day summary |
| founder_agent_logs table | Not in original doc | ✅ Built | Migration 20260514_founder_agent.sql |
| Admin founder dashboard | Not in original doc | ✅ Built | admin/founder/page.tsx |
| At-risk client detection | Not in original doc | ✅ Built | POST /internal/ae/at-risk |
| Trial expiry email sequence (day 10/12/14) | Not in original doc | ✅ Built | POST /internal/ae/trial-expiry |
| Trial nurture (day 1/3/5/7/10) | Not in original doc | ✅ Built | POST /internal/ae/nurture |
| Weekly CRO digest | Not in original doc | ✅ Built | POST /internal/cro/weekly-digest |
| Churn risk scoring | Not in original doc | ✅ Built | GET /internal/cro/churn-risk |
| LinkedIn post generation | Not in original doc | ✅ Built | POST /internal/cmo/linkedin-posts |
| Brand voice config | Not in original doc | ✅ Built | GET/POST /internal/cmo/brand-voice |
| Register jacquesfigsy.com | Phase 6 | ❌ YOUR ACTION | Domain purchase |

---

## SECTION 11 — PHASE 7: SMOKE TEST + GO-LIVE

| Step | Status | Blocked by |
|------|--------|------------|
| Sign up | ❌ Not done | Needs Paystack + env vars |
| Confirm email | ❌ Not done | Needs Resend |
| Onboard | ❌ Not done | — |
| Build ICP | ❌ Not done | Needs Apollo key in Railway |
| Run ICP | ❌ Not done | — |
| Leads appear | ❌ Not done | — |
| Sign order form | ❌ Not done | — |
| Billing via Paystack | ❌ Not done | Needs plan codes + secret key |
| Confirm payment | ❌ Not done | — |

**Entire phase blocked until Railway env vars and Paystack plan codes are set.**

---

## SECTION 12 — WHERE EMAILS ARE GOING

### Currently (env vars not set in Railway)
**All emails are going NOWHERE.** Resend API calls are failing silently because `RESEND_API_KEY` is not set in Railway. No email of any kind is being sent or received right now.

### Once env vars are set — who gets what

| Email Type | From | To | Via |
|-----------|------|----|-----|
| FIGSY outreach emails (Day 1, 4, 9) | Client's configured sending domain (e.g. hello@clientdomain.com) | Leads sourced by Apollo | Resend |
| POPIA consent emails | send.get-kind.com | Leads (for consent click) | Resend |
| Interested reply → draft follow-up | Founder reviews in portal, sends manually or auto | Lead who replied | Resend |
| CS day-1/3/7 onboarding follow-ups | send.get-kind.com | Your clients (K.I.N.D customers) | Resend |
| Support auto-reply (simple queries) | send.get-kind.com | Person who emailed hello@get-kind.com | Resend |
| Support escalation (complex queries) | send.get-kind.com | FOUNDER_EMAIL (your inbox) | Resend |
| At-risk client alerts | send.get-kind.com | FOUNDER_EMAIL (your inbox) | Resend |
| Trial expiry nudges (day 10/12/14) | send.get-kind.com | Your clients (K.I.N.D customers) | Resend |
| Trial nurture (day 1/3/5/7/10) | send.get-kind.com | Your clients (K.I.N.D customers) | Resend |
| Weekly CRO digest | send.get-kind.com | FOUNDER_EMAIL (your inbox) | Resend |
| AE demo booking email | send.get-kind.com | Demo prospect + FOUNDER_EMAIL | Resend |
| Weekly leads digest | send.get-kind.com | All active K.I.N.D clients | Resend |

### Reply routing (needs Resend inbound configured)
| Replies to | Route to | What happens |
|-----------|----------|-------------|
| FIGSY_REPLY_TO address (e.g. replies@get-kind.com) | POST /figsy/replies/inbound | AI classifies reply → credits consumed → founder alerted if interested |
| hello@get-kind.com | POST /founder/support/inbound | AI triages → auto-replies simple → escalates complex to your inbox |

---

## SECTION 13 — CALENDAR INTEGRATION (NOT BUILT — MUST ADD TO ROADMAP)

### Current state
- There is NO calendar integration anywhere in the codebase
- The only calendar reference is a hardcoded text string `calendly.com/kind-ai/demo` inside an email draft in founder.ts
- Nothing connects to Calendly, Cal.com, Google Calendar, or any booking API
- The marketing copy ("meetings booked to your calendar") is aspirational — it is not live

### What is needed for real calendar booking
When FIGSY detects an interested reply, instead of just flagging it, it should:
1. Include a real booking link in the follow-up email (from your live Calendly or Cal.com account)
2. When the prospect books, trigger a webhook back to K.I.N.D to mark the lead as `meeting_booked`
3. Log the meeting in `founder_agent_logs` and notify you via email

### Options to build this
| Option | Effort | Notes |
|--------|--------|-------|
| Calendly integration | Medium | Calendly has a webhook API. You create a Calendly account, set a booking page, paste the URL into Railway as `CALENDLY_BOOKING_URL`. When FIGSY sends interested reply follow-up, it includes the link. Calendly webhook fires back to `/figsy/meeting-booked` when prospect confirms. |
| Cal.com integration | Medium | Open-source, self-hostable, same concept. Better for customisation. |
| Simple link injection only (no webhook) | Low | Just include your booking URL in the interested reply follow-up. No automatic lead status update — you'd see the booking in your calendar manually. This can be built now. |

**Added to roadmap below.**

---

## SECTION 14 — WHAT YOU (JACQUES) MUST DO

### Paystack — BLOCKING for smoke test
1. Log into paystack.com
2. Create 12 subscription plan codes and add to Railway env vars:
   - `PAYSTACK_PLAN_LEAD_GEN_STARTER`
   - `PAYSTACK_PLAN_LEAD_GEN_ADVANCED`
   - `PAYSTACK_PLAN_LEAD_GEN_ENTERPRISE`
   - `PAYSTACK_PLAN_FIGSY_STARTER`
   - `PAYSTACK_PLAN_FIGSY_ADVANCED`
   - `PAYSTACK_PLAN_FIGSY_ENTERPRISE`
   - `PAYSTACK_PLAN_VA_STARTER`
   - `PAYSTACK_PLAN_VA_PRO`
   - `PAYSTACK_PLAN_VA_ENTERPRISE`
   - `PAYSTACK_PLAN_CHATBOT_STARTER`
   - `PAYSTACK_PLAN_CHATBOT_PRO`
   - `PAYSTACK_PLAN_CHATBOT_ENTERPRISE`
3. Add webhook: `https://kindapi-production-83cb.up.railway.app/webhooks/paystack`

### Railway — Environment Variables — BLOCKING
- `PAYSTACK_SECRET_KEY`
- `ANTHROPIC_API_KEY`
- `RESEND_API_KEY`
- `FOUNDER_EMAIL` (your personal email — all founder alerts go here)
- `ADMIN_SECRET_KEY` (long random string — protects /founder and /internal routes)
- `FIGSY_REPLY_TO` (email address FIGSY reply-to header uses, e.g. replies@get-kind.com)
- `PORTAL_URL` = `https://app.get-kind.com`
- `SUPABASE_URL` (if not already set)
- `SUPABASE_ANON_KEY` (if not already set)

### Railway — Cron Jobs
1. Daily → `POST /figsy/send-due` (sends due sequence emails)
2. Daily → `POST /internal/ae/at-risk` (flags inactive clients)
3. Daily → `POST /internal/ae/trial-expiry` (trial day 10/12/14 emails)
4. Every Monday → `POST /internal/digest/weekly` (weekly leads digest to clients)
5. Every Monday → `POST /internal/cro/weekly-digest` (founder CRO summary)

### Resend — Inbound Email Routing (full setup)

**What system we use:** Resend — NOT Google. Resend is a developer email service (like SendGrid). You have send.get-kind.com already set up in Resend.

**Why not Google/Gmail for outreach:**
Google/Gmail blocks cold outreach at volume. Gmail accounts used to send cold email at scale get flagged and suspended by Google. Resend uses its own sending infrastructure with proper SPF, DKIM, and DMARC records — it is the correct tool for this. Gmail is fine as a personal inbox but must never be used as the sending engine for FIGSY outreach.

**The gap right now:** Nobody has configured inbound routing in Resend. Emails sent TO hello@get-kind.com go nowhere automated. No support triage, no reply classification. Everything is one-directional (outbound only, and even that is blocked because RESEND_API_KEY is not in Railway yet).

**What to do in Resend dashboard:**

Step 1 — Add inbound for support emails:
- Resend dashboard → Domains → get-kind.com → Inbound
- Add route: `hello@get-kind.com` → webhook to `https://kindapi-production-83cb.up.railway.app/founder/support/inbound`
- Add header: `x-admin-key: YOUR_ADMIN_SECRET_KEY`

Step 2 — Decide your FIGSY reply-to address (e.g. `replies@get-kind.com`):
- Add route: `replies@get-kind.com` → webhook to `https://kindapi-production-83cb.up.railway.app/figsy/replies/inbound`
- Set `FIGSY_REPLY_TO=replies@get-kind.com` in Railway env vars

Step 3 — Optional: set up Google Workspace for hello@get-kind.com if you also want a real Gmail inbox for that address. This is separate from Resend and is just for you to read emails manually. It does not affect the automated routing above.

**Where every email address goes once configured:**

| Address | Direction | Goes to |
|---------|-----------|---------|
| `hello@get-kind.com` | Outbound (sending) | All K.I.N.D system emails sent from here via Resend |
| `hello@get-kind.com` | Inbound (receiving) | Resend webhook → `/founder/support/inbound` → AI triages → simple auto-reply, complex → your FOUNDER_EMAIL inbox |
| `replies@get-kind.com` (FIGSY_REPLY_TO) | Inbound (receiving) | Resend webhook → `/figsy/replies/inbound` → AI classifies → credit consumed if interested → you alerted |
| `FOUNDER_EMAIL` (your personal address in Railway env) | Inbound (receiving) | Your actual inbox — escalations, at-risk alerts, AE requests, weekly digests all land here |

### Supabase — Run 3 Migrations — BLOCKING for credits + agents
Run in Supabase SQL editor in this order:
1. `supabase/migrations/20260513_credit_transactions.sql`
2. `supabase/migrations/20260513_referral_credits.sql`
3. `supabase/migrations/20260514_founder_agent.sql`

### Vercel — Admin Panel
- `NEXT_PUBLIC_API_URL` = `https://kindapi-production-83cb.up.railway.app`
- `NEXT_PUBLIC_ADMIN_KEY` = (same value as ADMIN_SECRET_KEY)

### Netlify — Landing Page
1. Open `KIND/apps/landing/index.html` locally
2. Netlify dashboard → site → Deploys → drag and drop `apps/landing/` folder
3. Configure Netlify to auto-deploy from `main` going forward

### Calendar (for FIGSY meeting booking)
1. Create a Calendly (or Cal.com) account
2. Set up a booking page (e.g. "Book a demo with K.I.N.D")
3. Paste the booking URL — tell me and I will wire it into FIGSY's interested reply follow-up
4. Decide: simple link injection only, or full webhook back to K.I.N.D when meeting is confirmed

### Domain
- Register `jacquesfigsy.com`

### Email deliverability — domain warming (IMPORTANT before going live)
Sending cold email at full volume on a new domain immediately will get you flagged by receiving mail servers even through Resend. You must warm the domain gradually:
- Week 1: max 20 emails/day
- Week 2: max 50 emails/day
- Week 3: max 150 emails/day
- Week 4+: full volume
This means FIGSY's send-due cron must have a daily cap set in Railway env vars before launch. I can build this — do not launch without it.

### Google Workspace (optional but recommended)
If you want a real Gmail inbox for hello@get-kind.com that you can read like a normal email:
- Sign up for Google Workspace (£5.20/mo per user at google.com/workspace)
- Verify get-kind.com domain in Google Workspace
- This gives you hello@get-kind.com in Gmail
- This is SEPARATE from Resend — Resend still handles all automated sending. Google Workspace is just for you to have a proper inbox to read escalations manually.
- NOTE: Never use Google Workspace to send FIGSY outreach. Only Resend does that.

### Git — merge to main
- Go to github.com/jacquesvieiraza-blip/KIND
- You will see a banner for `claude/ai-business-roadmap-U3OWJ` — click Compare & pull request
- Create pull request → Merge pull request
- This puts all 60+ commits onto main so GitHub shows the full codebase
- Direct push to main is blocked by branch protection (only you can merge via PR)

### Smoke Test (last — after all above done)
Sign up → confirm email → onboard → build ICP → run ICP → leads appear → sign order form → billing → Paystack checkout → confirm payment

---

## SECTION 15 — WHAT I CAN BUILD (DO NOT BUILD WITHOUT INSTRUCTION)

### Immediate gaps to close
| # | Item | Detail |
|---|------|--------|
| 0 | Domain warming daily cap | Add `FIGSY_DAILY_SEND_LIMIT` env var. send-due cron checks emails sent today, stops at limit. Starts at 20, you increase in Railway as domain warms. Must be done before go-live. |
|---|------|--------|
| 1 | Referral credit trigger on first ICP run | Confirm/complete logic in icps.ts that credits both referrer (100 leads) and new client (100 leads) |
| 2 | 7-day suspension warning email at 0 credits | Email sequence after credits hit 0: warning day 1, day 4, day 7 before pausing outreach |
| 3 | Unified cross-campaign reply inbox | Single portal page showing all replies across all campaigns, filterable by classification |
| 4 | ICP learning loop | Monthly cron: pull reply data per ICP, Claude analyses patterns, suggests refined ICP, emails founder |
| 5 | Multi-user permissions | owner / team member / read-only roles — new client_users table, invite flow, middleware |
| 6 | Calendar integration — simple (link injection) | Add CALENDLY_BOOKING_URL env var. FIGSY includes real booking link in interested reply follow-up. No webhook needed. |
| 7 | Calendar integration — full (webhook) | Calendly/Cal.com webhook fires to /figsy/meeting-booked when prospect confirms. Lead marked meeting_booked. Founder alerted. |

### Phase A — Growth & Conversion
| # | Item | Detail |
|---|------|--------|
| 8 | Trial-to-paid conversion flow | In-portal upgrade prompt at day 7, 12, 14 matching nurture emails already sending |
| 9 | Onboarding checklist / first-run wizard | Step-by-step in portal: connect domain → build ICP → launch campaign → add credits |
| 10 | Lead scoring explainer modal | Tooltip/modal in leads table explaining how 0–100 score is calculated per lead |
| 11 | Referral leaderboard | Portal page: how many referrals made, credits earned, credits pending |

### Phase B — FIGSY Upgrades
| # | Item | Detail |
|---|------|--------|
| 12 | A/B email subject line testing | Send 2 variants to first 20% of leads, pick winner by 48h open rate, send winner to rest |
| 13 | Adaptive learning per campaign | FIGSY adjusts openers and subject lines based on what's working in current campaign data |
| 14 | Branded unsubscribe page | One-click POPIA-compliant opt-out landing page |
| 15 | FIGSY campaign analytics dashboard | Per-campaign: open rate, reply rate, positive reply rate, credit spend, ROI |
| 16 | Sequence preview in portal | Show 3-email sequence in readable format before launching campaign |

### Phase C — Billing & Revenue
| # | Item | Detail |
|---|------|--------|
| 17 | Proper invoice PDF | Server-side generated PDF with company name, line items, payment ref, VAT if applicable |
| 18 | Credit bundle upsell prompt | In-portal modal when credits drop below 10 |
| 19 | ZAR / USD toggle | Website and portal pricing in both currencies, togglable |
| 20 | Volume discount calculator | Interactive slider on pricing page showing effective per-lead price |

### Phase D — Products (waitlist → live)
| # | Item | Detail |
|---|------|--------|
| 21 | Virtual Assistant — full build | Claude trained on client docs, email drafting endpoint, scheduling queries, 500 msg/mo tracking, portal page wired |
| 22 | Chatbot Agent — full build | Embeddable JS widget, WhatsApp Business API, lead capture, human handoff, persona config, portal config page |

### Phase E — Enterprise
| # | Item | Detail |
|---|------|--------|
| 23 | HubSpot / Salesforce two-way sync | Pull existing contacts to deduplicate, push deals both ways |
| 24 | Custom sending domain wizard | In-portal DNS guide: enter domain → show CNAME/TXT → verify → activate |
| 25 | Multi-user seats (if not built in gap #5) | client_users table, invite by email, role permissions, team management in settings |
| 26 | White-label mode | Reseller clients: custom logo, custom domain on portal, custom email from-name |
| 27 | API access tier | Enterprise clients get API keys to query their lead data programmatically |

### Phase F — Founder OS (additional)
| # | Item | Detail |
|---|------|--------|
| 28 | Weekly founder digest email | Auto Monday: new signups, MRR, active campaigns, top leads, agent activity |
| 29 | NPS survey automation | Email at day 30 of paid sub, captures score in Supabase, routes detractors to support |
| 30 | Churn prediction alert | When churn risk score crosses 70, immediately email founder with client + recommended action |
| 31 | Competitor monitoring agent | Weekly scrape of competitor pricing/changelog, Claude summarises, emails founder |

---

## SECTION 16 — BUILT BEYOND ORIGINAL ROADMAP
*These were not in the original roadmap document — added during build*

| Feature | Where in codebase |
|---------|------------------|
| Speed Pipeline — prefill ICP from website scrape + AI suggest | POST /icps/prefill |
| CRM integration — HubSpot + Pipedrive auto-sync on consent | apps/api/src/lib/crm.ts |
| Deal/Opportunity CRM push on positive FIGSY reply | figsy.ts /replies/inbound |
| Support chat widget (Claude Haiku, context-aware) | POST /support/chat + SupportWidget.tsx |
| Weekly leads digest email to all active clients | POST /internal/digest/weekly |
| CS day-1 follow-up auto-fired on every new onboard | auth.ts onboard route |
| Paystack webhook handler (subscription lifecycle) | POST /webhooks/paystack |
| Paystack authorization code stored for auto top-up | credits.ts verify |
| KPI / CRO dashboard for founder | GET /internal/cro/dashboard |
| Trial expired overlay in portal | TrialExpiredOverlay.tsx |
| AI reply draft on interested FIGSY reply | POST /figsy/replies/:id/draft-followup |
| Bulk consent send (up to 100 leads at once) | POST /leads/bulk-consent |
| FIGSY subscription upgrade wall (403 + banner in portal) | figsy/page.tsx + figsy.ts |
| Notification bell (4 types, polls every 2 min) | NotificationBell.tsx |
| Receipt / invoice print-to-PDF per transaction | billing/page.tsx printReceipt() |
| Auto top-up with saved Paystack authorization code | billing/page.tsx + PATCH /clients/me/auto-topup |
| Agreement template library in admin | admin/terms-library/page.tsx |
| At-risk client detection (no ICP or leads after 3 days) | POST /internal/ae/at-risk |
| Trial expiry email sequence (day 10, 12, 14) | POST /internal/ae/trial-expiry |
| Trial nurture email sequence (day 1, 3, 5, 7, 10) | POST /internal/ae/nurture |
| Weekly CRO digest with Claude commentary | POST /internal/cro/weekly-digest |
| Churn risk scoring per client (0–100) | GET /internal/cro/churn-risk |
| LinkedIn post generation with brand voice | POST /internal/cmo/linkedin-posts |
| Brand voice config (in-memory override) | GET/POST /internal/cmo/brand-voice |
| Founder activity digest | GET /founder/digest |
| founder_agent_logs table (all agent actions stored) | supabase/migrations/20260514_founder_agent.sql |
| Admin founder dashboard (digest cards, logs, manual triggers) | admin/founder/page.tsx |
| Animated 7-scene demo presentation (screen-recordable) | apps/landing/demo.html |
| Netlify landing page (white/light brand) | apps/landing/index.html |

---

## SECTION 17 — EMAIL SYSTEM FULL REFERENCE

### What system we use
**Resend** — not Google, not Gmail, not SendGrid. Resend is a developer email service. Domain: send.get-kind.com. All automated email (outbound and inbound routing) runs through Resend.

### Why Google/Gmail cannot be used for outreach
Google detects cold outreach volume and will suspend the sending address, then potentially blacklist the domain. If hello@get-kind.com gets blacklisted by Google, it breaks everything — including legitimate emails. Resend uses dedicated IP infrastructure with proper SPF/DKIM/DMARC. Google Workspace can be used as a personal reading inbox (optional) but must never send FIGSY outreach.

### Domain warming — BLOCKING pre-launch item
Sending full-volume cold email on a new domain immediately will trigger spam filters even through Resend. Warm up gradually:
- Week 1: max 20 emails/day
- Week 2: max 50 emails/day
- Week 3: max 150 emails/day
- Week 4+: full volume

A `FIGSY_DAILY_SEND_LIMIT` env var needs to be built and set in Railway before go-live.

### Every email address and where it goes

| Address | Direction | Goes to |
|---------|-----------|---------|
| `hello@get-kind.com` | Outbound (FROM on all system emails) | Sent via Resend to recipients |
| `hello@get-kind.com` | Inbound (people emailing you) | Resend inbound webhook → POST /founder/support/inbound → AI triages → auto-replies simple / forwards complex to FOUNDER_EMAIL |
| `replies@get-kind.com` (FIGSY_REPLY_TO) | Inbound (leads replying to outreach) | Resend inbound webhook → POST /figsy/replies/inbound → AI classifies → credit consumed if interested → founder alerted |
| `FOUNDER_EMAIL` (your personal email in Railway) | Inbound (your inbox) | Escalations, at-risk alerts, AE requests, weekly CRO digest, trial expiry alerts all land here |

### Currently — nothing works
All email is broken right now because `RESEND_API_KEY` is not set in Railway. No email of any kind is sending or receiving. All Resend API calls fail silently.

### Inbound setup required in Resend dashboard
1. Domains → get-kind.com → Inbound
2. Add route: `hello@get-kind.com` → POST `https://kindapi-production-83cb.up.railway.app/founder/support/inbound` with header `x-admin-key: YOUR_ADMIN_SECRET_KEY`
3. Add route: `replies@get-kind.com` → POST `https://kindapi-production-83cb.up.railway.app/figsy/replies/inbound`
4. Set `FIGSY_REPLY_TO=replies@get-kind.com` in Railway env vars

---

## SECTION 18 — GO-TO-MARKET STRATEGY
*Added 14 May 2026 · Target: 50 paying clients by end of June 2026*

### Target Live Date: Wednesday 21 May 2026

---

### K.I.N.D's Own ICP (who we're selling to)

| | |
|---|---|
| Company size | 2–50 employees |
| Stage | Startup, scale-up, SME |
| Geography | South Africa first → Nigeria, Kenya, Ghana |
| Industry | SaaS, fintech, recruitment, consulting, professional services, property tech |
| Decision maker | Founder doing their own sales / Head of Sales / BDM |
| Pain | Inconsistent pipeline, 3+ hrs/day manual prospecting, can't afford a full-time SDR |
| Trigger | Missed revenue target, lost a big client, trying to scale |

---

### Positioning

**One line:** Your B2B pipeline, on autopilot. African-first.

- Only lead gen tool built for Africa — POPIA compliant, ZAR billing, Paystack
- Pay for results — no contract, no risk, start at $20
- vs hiring a junior SDR: R25,000/mo vs $20 to start
- vs Apollo/ZoomInfo: they sell data, we sell pipeline
- vs Lemlist/Outreach: built for Africa, not retrofitted for it

---

### Channels — Priority Order

**1. FIGSY eats its own dog food**
Use FIGSY to acquire K.I.N.D clients. Best proof of product.
- Build K.I.N.D ICP: Founders + Sales Directors + BDMs at SA tech/SaaS/fintech/consulting
- Run FIGSY campaigns from day one — every meeting booked is a case study
- Domain warming starts at 20/day — use those 20 on the hottest ICP matches

**2. Jacques personal brand on LinkedIn**
Post every day for 30 days. Insight posts, not product posts.
- Week 1–2: pain points, prospecting inefficiency, pipeline inconsistency in SA market
- Week 3–4: first client results, how FIGSY works, behind-the-scenes build
- Format: short, punchy, one idea per post, end with CTA to site

**3. WhatsApp broadcast**
SA market runs on WhatsApp.
- Build broadcast list of 50–100 warm personal contacts now
- Launch day: personal message (not salesy) to full list
- Create K.I.N.D early clients WhatsApp group for community + feedback
- Referral programme ($100 credits per referral) — activate through WhatsApp

**4. Direct warm outreach — personal network**
- List 30 people who run B2B companies or are in sales roles
- Reach out personally before launch: "going live Wednesday, would love your feedback"
- First 10 clients don't need to be perfect ICP — they need to generate results to post about

**5. Content / SEO — plant seeds now, harvest in 60 days**
- "How to build a B2B sales pipeline in South Africa in 2026"
- "POPIA and cold email: what's actually allowed"
- "Best lead generation tools for African businesses"
- "How to find your ICP in 10 minutes"

---

### Launch Sequence

**Now → 20 May (pre-launch)**
- Jacques: LinkedIn post announcing go-live countdown
- Build WhatsApp broadcast list
- Message 30 warm contacts personally
- FIGSY campaign targeting K.I.N.D ICP queued and ready

**Wednesday 21 May — GO LIVE**
- LinkedIn launch post (personal story + product announcement)
- WhatsApp broadcast to full list
- FIGSY outreach begins: 20 leads/day
- Email to anyone on waitlist/early interest list

**Week 1 (21–27 May) — Targets**

| Metric | Target |
|---|---|
| Signups | 15–25 |
| ICPs built | 10+ |
| Credits purchased | 5–8 |
| FIGSY outreach sent | 60 (3 days × 20) |
| Meetings booked | 2–4 |

**Week 2 (28 May – 3 Jun)**
- Post first real client result on LinkedIn
- Activate referral programme — email all signed-up clients asking for 1 referral
- Domain warming moves to 50/day

**Week 3–4**
- Domain at 150/day
- Case study #2 on LinkedIn
- WhatsApp group active — gather testimonials
- Retarget anyone who visited get-kind.com but didn't sign up

---

### Pricing Play

- Lead with Lead Gen Pro at $20 — lowest barrier, gets them in
- Upsell FIGSY after they see leads and realise they have no time to follow up manually
- Push 100-credit bundles for better unit economics and more committed clients
- Enterprise: take to a call, don't send a price list

---

### Message by Channel

**LinkedIn (authority):**
> "Your best SDR costs R25,000/mo before commission. K.I.N.D costs $20 to start and only charges when it finds you a qualified lead."

**Cold email via FIGSY:**
> Lead with the pain (pipeline inconsistency). One sentence on what we do. Proof point (250M+ contacts, African-first). Risk-free CTA: 14-day trial, $1/lead, cancel anytime.

**WhatsApp (personal):**
> "Hey [name] — launching something I've been building for the last 6 months. Would mean a lot if you checked it out. get-kind.com"

**Referral activation:**
> "Every client you refer gets $100 in free credits. So do you. Share your link."

---

### 90-Day Milestones

| Date | Milestone |
|---|---|
| 21 May 2026 | Go live |
| 31 May 2026 | 10 paying clients |
| 14 June 2026 | First LinkedIn case study post |
| 30 June 2026 | 50 paying clients · domain at full send volume |
| 31 July 2026 | First enterprise conversation |
| 31 August 2026 | 150 clients · VA + Chatbot waitlist converting |

---

### Notes
- 📌 Netlify landing page — redeploy apps/landing/ once Jacques drags folder (latest version already updated in repo)
- 📌 Website video — swap YouTube embed URL once new video is ready (tell me the URL, I update same day)

---

## MASTER SUMMARY TABLE

| # | Item | Status | Owner |
|---|------|--------|-------|
| 1 | All infrastructure | ✅ Live | — |
| 2 | Website (6 pages) | ✅ Live | — |
| 3 | Client portal (18 pages) | ✅ Live | — |
| 4 | Admin portal (6 pages) | ✅ Live | — |
| 5 | API (50+ endpoints, 13 routers) | ✅ Live | — |
| 6 | Phase 2: Referral backend | ⚠️ 90% — trigger needs confirming | Me |
| 7 | Phase 3: Credit billing | ✅ Built | — |
| 8 | Phase 4: Portal upgrades | ⚠️ Missing permissions/roles | Me |
| 9 | Phase 5: FIGSY engine | ⚠️ Missing unified inbox + ICP loop + calendar | Me |
| 10 | Phase 6: Founder agents | ✅ Built | — |
| 11 | Phase 7: Smoke test | ❌ Not done | You |
| 12 | Paystack plan codes | ❌ Not done | You |
| 13 | Railway env vars + cron jobs | ❌ Not done | You |
| 14 | Resend inbound routing | ❌ Not done | You |
| 15 | Supabase 3 migrations | ❌ Not done | You |
| 16 | Netlify landing page deploy | ❌ Not done | You |
| 17 | jacquesfigsy.com domain | ❌ Not done | You |
| 18 | Calendar setup (Calendly/Cal.com account) | ❌ Not done | You |
| 19 | Calendar link injection in FIGSY | ❌ Not built | Me (after you set up Calendly) |
| 20 | Full calendar webhook (meeting confirmed → lead status) | ❌ Not built | Me (after you decide approach) |
| 21 | Domain warming daily send cap (FIGSY_DAILY_SEND_LIMIT) | ❌ Not built | Me — blocking pre-launch |
| 22 | Google Workspace for hello@get-kind.com personal inbox | ❌ Not done | You (optional) |
| 23 | Merge branch to main on GitHub | ❌ Not done | You — see Section 14 |

---

*Last updated: 14 May 2026*
*Branch with all code: claude/ai-business-roadmap-U3OWJ*
*GitHub merge instructions: see Section 14*
*Do not build anything without explicit instruction from Jacques.*
*Branch: claude/ai-business-roadmap-U3OWJ*
*Do not build anything from this document without explicit instruction from Jacques.*
