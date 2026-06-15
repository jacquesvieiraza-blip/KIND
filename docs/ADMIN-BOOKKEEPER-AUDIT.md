# 📊 Admin Portal Bookkeeper Audit — Current State + Gaps

**Date:** 2026-06-14  
**Scope:** Client billing management, credit tracking, revenue per client, plan management  
**Goal:** Transform admin portal from **visibility tool** → **operational bookkeeper dashboard**

---

## ✅ What Currently Exists

### Clients Page (`/admin/clients`)
- **Health scoring:** Green/amber/red risk classification (low credits, inactive 14d+, no campaigns)
- **Summary metrics:** Active clients, trial clients, at-risk count, no-credits count, T&Cs accepted
- **Churn risk overlay:** ⚠️ Risk labels (75/100 = churn alert) with reason tooltips
- **Last login tracking:** Days since last sign-in (pulled from Supabase auth)
- **Leads velocity:** Leads sourced in last 14 days (per client)
- **FIGSY activity:** Active campaign count, emails sent in last 7 days (per client)
- **MRR attribution:** Credit purchases this month (per client) — aggregated to `mrr_this_month`

### Client Detail Page (`/admin/clients/[id]`)
- **Subscription list:** Product + tier + amount + status (active/trialing/past_due)
- **Credit balance:** Single `credit_balance` display (lead-gen pool only)
- **Credit grant form:** Manual add/refund with optional note (form works; calls `/api/proxy/admin/clients/[id]/credits`)
- **Transaction history:** Type, amount, note, date (scrollable, last 50 rows max-h-64)
- **Leads summary:** Total count, this-month count, top-scored lead (company + score)
- **FIGSY campaigns:** Active + inactive campaign list with enrolled count and created date
- **ICPs:** List with last-run date
- **T&Cs acceptance:** Date + IP address of acceptance

### Revenue Page (`/admin/revenue`)
- **Live MRR:** USD + ZAR (from active subscriptions only)
- **Blended ARPU:** USD per active client
- **Monthly targets:** Base/conservative/optimistic scenarios vs. current
- **KPI tracker:** Leading indicators (TTFL, CVR, Churn, FIGSY reply rate, NPS)
- **Monthly revenue targets:** May → Dec 2026 ramp
- **ARPU tiers:** Starter ($20), Growth ($160), Scale ($400) — hardcoded reference
- **90-day forecast:** Conservative/base/optimistic growth rates

---

## 🔴 Critical Gaps for Bookkeeper Use

### 1. **Two-Pool Credit Model is Invisible**

**Current state:**
- Only `credit_balance` displayed (lead-gen pool)
- `figsy_credits_remaining` never shown anywhere in admin
- No way to know if a client has FIGSY credits or how many are left
- No way to top-up FIGSY credits manually

**Impact:**
- Admin can't manage FIGSY budgets for clients
- Can't verify if FIGSY pool is depleted (will silently block outreach)
- Can't spot clients who bought FIGSY but have 0 credits left

**Fix needed:**
- Display `figsy_credits_remaining` on client detail page (next to `credit_balance`)
- Add FIGSY credit grant form (mirror the lead-gen form)
- Add column to clients list showing `figsy_credits_remaining` (or FIGSY health dot)

---

### 2. **No Plan Visibility (`clients.plan` Flag)**

**Current state:**
- Admin sees subscriptions + credits, but no `clients.plan` field
- Can't tell if client is on "lead_gen" vs. "figsy" plan
- Can't audit which clients should be charged from which pool

**Impact:**
- Can't verify billing correctness (is lead-gen client being charged from wrong pool?)
- Can't spot transition errors (client upgraded from lead_gen → figsy, but old charges still apply)

**Fix needed:**
- Display `clients.plan` on client detail page (lead_gen | figsy)
- Add filter on clients list: "Plan: Lead Gen / FIGSY / Both"
- Log plan changes in transaction history

---

### 3. **No Billing Period / Revenue Reconciliation**

**Current state:**
- Transaction history shows `type` (lead_delivery, manual_grant, figsy_enroll, etc.) but no billing period
- Can't see "what was charged in June" vs. "what was charged in July"
- No way to filter transactions by billing period
- No monthly invoice or statement per client

**Impact:**
- Can't reconcile a client's payment to what they were charged for
- Can't debug "why did you charge me on the 7th if my billing period starts the 1st"
- No audit trail for disputes

**Fix needed:**
- Add billing period start/end date to subscriptions + display
- Filter transaction history by date range
- Generate a "monthly statement" view per client (charges + credits + net)

---

### 4. **Credit Transactions Lack Context**

**Current state:**
- Transaction history shows `amount`, `type`, `note`, `created_at`
- Missing `plan` (which pool was charged: lead_gen or figsy?)
- Missing `reference` (which campaign/ICP/lead triggered this?)
- Missing `units` (was this 1 lead delivered, 10 leads, 100 leads?)

**Impact:**
- Can't drill down from transaction → campaign/ICP that caused it
- Can't verify if a transaction matches what was advertised ("$1 per lead delivered")
- Hard to debug refund disputes

**Fix needed:**
- Add `plan` column to transaction display (lead_gen | figsy | subscription)
- Add `reference` link (campaign_id → clickable link to campaign, ICP id, lead id)
- Add `units_affected` or `lead_count` where applicable
- Show which client.plan was in effect at time of charge (in case it changed mid-month)

---

### 5. **No Subscription Payment History / Invoice Trail**

**Current state:**
- Subscriptions table shows current status only
- No payment history (when was R{amount} charged? was it successful?)
- No invoice links
- No retry/failure tracking

**Impact:**
- Can't answer "did the June payment go through?"
- Can't verify Stripe webhook idempotency (was the same charge logged twice?)
- No way to issue refunds linked to a specific payment

**Fix needed:**
- Link to Stripe invoice for each subscription (pull from webhook data)
- Payment history timeline per subscription (attempted → success / failed → retry / success)
- Link to Stripe charge ID + amount charged

---

### 6. **No Lead-Gen vs. FIGSY Revenue Split**

**Current state:**
- Revenue page shows only total MRR
- Can't see how much came from lead-gen subscriptions vs. FIGSY subscriptions
- Can't see credit top-ups vs. recurring subscriptions

**Impact:**
- Can't verify if the deck's "$3 all-in for FIGSY" is actually delivering 80% of revenue (vs. lead-gen)
- Can't forecast accurately by product line

**Fix needed:**
- Break down revenue page by product (lead_gen_subscriptions + figsy_subscriptions + credit_topups)
- Show client count + ARPU per product line

---

### 7. **No Multi-Currency Tracking**

**Current state:**
- Subscriptions show `amount_zar` only
- Portal client-facing prices are hardcoded USD
- No `clients.preferred_currency` field

**Impact:**
- Can't track which clients are on USD vs. ZAR pricing
- Can't audit if displayed prices match charged amounts in different currencies
- Can't reconcile Flutterwave (ZAR/NGN/KES/GHS) vs. Stripe (USD) transactions

**Fix needed:**
- Add `currency` to subscriptions + display
- Show both ZAR and USD for each subscription
- Add `clients.preferred_currency` field + display
- Add currency filter to revenue page

---

### 8. **No Refund / Adjustment Audit Trail**

**Current state:**
- Manual grants can include "refund" type + optional note
- But no way to link a refund to the original charge
- No approval workflow (anyone with admin access can refund anything)

**Impact:**
- Can't track who refunded what and why (audit failure)
- Can't prevent duplicate refunds
- Can't see if a "manual_grant" was actually a support refund or a promotional credit

**Fix needed:**
- Add `refund_for_transaction_id` field (link refund → original charge)
- Add `approved_by` + `approval_date` to refunds (log who approved)
- Add refund summary per client (total refunded this month, reasons)
- Require approval for refunds > some threshold

---

### 9. **No Discount / Promo Code Tracking**

**Current state:**
- No discount field in subscriptions
- No way to track if a client got a $50 off promo

**Impact:**
- Can't see why one client at the same tier pays $100 and another pays $50
- Can't audit if a "manual_grant" was actually a discount that should've been applied to subscription

**Fix needed:**
- Add `discount_code`, `discount_amount`, `discount_reason` to subscriptions
- Display on client detail page
- Add to transaction history context

---

### 10. **No Outstanding Balance / Past-Due Tracking**

**Current state:**
- Subscriptions show `status: past_due` but no amount owed
- No aging report (how long past-due? how much is overdue?)

**Impact:**
- Can't prioritize collection efforts
- Can't calculate cash-at-risk (total overdue balance)

**Fix needed:**
- Calculate days past due for each past-due subscription
- Show amount owed (sum of failed payments)
- Add "Past Due Aging" report (30/60/90+ days)

---

### 11. **No Credit Burn Rate / Depletion Forecast**

**Current state:**
- Credit balance shown as a snapshot
- No indication of velocity (is the client burning 100 credits/day or 1 credit/day?)
- No forecast of when they'll run out

**Impact:**
- Can't proactively alert clients before they hit 0
- Can't see at-risk churn (clients about to run out)
- Can't optimize credit grants (are we giving them too much / too little?)

**Fix needed:**
- Calculate credit burn rate over last 7/30 days (credits/day)
- Forecast depletion date (if burn continues)
- Display "at risk in X days" badge
- Alert for burn rate spikes (sign of buggy integration or fraud)

---

### 12. **No Webhook / Payment Event Audit Log**

**Current state:**
- No way to see "was the Stripe webhook for this charge received + processed?"
- No idempotency tracking

**Impact:**
- Can't debug "charge went through but wasn't credited" issues
- Can't verify webhook replay (if a webhook fired twice, was it idempotent?)
- Can't answer "is this a real transaction or a duplicate?"

**Fix needed:**
- Add webhook audit log (event_id, event_type, customer_id, amount, processed_at, status: ok / duplicate / error)
- Display in transaction history + client detail page
- Mark failed webhook events with error message

---

### 13. **No Trial → Paid Conversion Tracking**

**Current state:**
- Clients list shows trial count
- But no "trial started" vs. "trial ended" dates
- No conversion date (when did trial → paid?)

**Impact:**
- Can't measure trial → paid conversion rate per client
- Can't see if a trial is about to expire and needs follow-up
- Can't track trial cohort performance

**Fix needed:**
- Add `trial_started_at` + `trial_ends_at` to subscriptions
- Display on client detail page
- Add "trial expiring soon" alert (3 days before end)
- Add trial cohort report to revenue page

---

## 📋 Implementation Priority

### P0 (Week of Tue 16 — before clients touch product)
1. **Display `figsy_credits_remaining`** on client detail page + add grant form
2. **Display `clients.plan`** on client detail page
3. **Add billing period** start/end date to subscriptions + filter transactions by date
4. **Add plan context** to transaction history (which pool was charged?)

### P1 (Before Go/No-Go Thu 18)
5. **Subscription payment history** (link to Stripe invoice, payment status timeline)
6. **Multi-currency display** (show USD + ZAR for subscriptions)
7. **Revenue split** by product line on revenue page (lead_gen vs. figsy)
8. **Refund audit trail** (link refund → original, require approval for refunds)

### P2 (Post-launch, before ST2 — first full billing cycle)
9. **Credit burn rate + depletion forecast** on client detail page
10. **Past-due aging report** on clients list
11. **Webhook audit log** (event_id, processed_at, status)
12. **Trial expiration tracking** (trial_ends_at, days until expiry)
13. **Discount / promo code tracking** (why does one client pay less?)

---

## 🎯 Bookkeeper MVP (P0 + P1)

**What a bookkeeper needs to do their job Monday morning:**

1. **Client list view:**
   - Filter by plan (lead_gen | figsy)
   - Show `credit_balance` + `figsy_credits_remaining` + health dots
   - Show current subscription (product + status + amount_zar)

2. **Client detail view:**
   - Display both pools: `credit_balance` + `figsy_credits_remaining`
   - Display `clients.plan`
   - Subscriptions with billing period + payment history link
   - Transaction history filtered by date range, with plan context
   - Grant form for both lead-gen and FIGSY credits
   - Monthly statement (charges + credits + net for current billing period)

3. **Revenue dashboard:**
   - Split MRR by product (lead_gen subscriptions | figsy subscriptions | credit topups)
   - Show client count per product
   - Show trial → paid conversion tracker (trial count + conversion rate)

4. **Reports:**
   - "Clients by plan" (how many on lead_gen vs. figsy)
   - "Monthly billing summary" (total charged, total refunded, net revenue)
   - "Past-due aging" (past-due clients + amount + days overdue)

---

## 🔧 Schema Changes Required

### Existing Columns (Ready to Use)
- ✅ `clients.credit_balance` (existing, used in lead-gen pool)
- ✅ `clients.figsy_credits_remaining` (added 25 May, migration `20260525_add_missing_clients_columns.sql`)
- ✅ `credit_transactions.plan` (existing, logged with 'lead_gen' | 'figsy' | 'subscription')
- ✅ `subscriptions.amount_zar` (existing)

### New Columns to Add
- ❌ `clients.plan` ('lead_gen' | 'figsy') — **MUST ADD before Tuesday billing fix** (see MORNING-FIXLOG § BILLING CORRECTNESS item 1)
- ❌ `clients.preferred_currency` (optional, for multi-currency support — P2)
- ❌ `subscriptions.billing_period_start_at` (optional, for statement generation — P1)
- ❌ `subscriptions.billing_period_end_at` (optional, for statement generation — P1)

**Status:** `clients.plan` is referenced in the signed-off billing design (KIND-MASTER + MORNING-FIXLOG). Migration to add this column should go into the Tuesday build batch.

---

## 📝 Next Steps

1. **Monday (Mon 15):** Add `clients.plan` migration (prerequisite for Tuesday billing fix)
2. **Tuesday (Tue 16):** 
   - Build P0 features in admin (both credit pools visible + plan display + billing period)
   - Implement billing fix (pool-aware charging, remove double-charge, etc.) — see MORNING-FIXLOG § BILLING CORRECTNESS
3. **Wednesday–Thursday:** Build P1 features + smoke test with real client data
4. **Friday (Fri 19):** Bookkeeper is live + founder can manage client billing without hiring
5. **Post-launch:** P2 features (burn rate forecast, webhook audit, trial tracking)

---

## 📌 Integration with Billing Correctness (Tue 16)

**Scope overlap:** This audit identifies all admin features needed to operationalize the billing fixes from MORNING-FIXLOG § BILLING CORRECTNESS. 

- **Billing fix scope:** Code changes to charge correct pool, remove double-charge, add atomic RPC for FIGSY
- **Bookkeeper audit scope:** Admin portal features to visually track + manage the corrected billing

**Combined runbook:**
1. Add migration for `clients.plan` 
2. Backfill `clients.plan` on all existing clients (based on subscription products)
3. Update billing code to read + respect `clients.plan`
4. Update admin portal to display both pools + plan + billing period
5. Smoke test (verify a client's charges reconcile to the correct pool)

---

**Status:** Ready for implementation design (see MORNING-FIXLOG item #8 for context on why `figsy_credits_remaining` visibility is launch-critical).
