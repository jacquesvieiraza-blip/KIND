# 🔍 K.I.N.D — DEEP AUDIT + ARCHITECTURE DECISION (8 Jul 2026)

> **Trust rule:** every verdict is **CODE-CONFIRMED** (read on `origin/main`) unless marked otherwise: **Prod-DB-Confirmed** (founder ran SQL), **Runtime-Proven** (observed live), **Suspected**, **Refuted**, **Unknown**. The auditor (Claude) had **no runtime/staging/Stripe/prod-DB access** — so **nothing here is runtime-proven** except where the founder observed it. §D SQL and §K tests are the instruments to obtain the missing proof.

---

## 1. EXECUTIVE TRUTH
- **Safe (code-confirmed):** FIGSY enrollment *charge* (atomic, fail-closed), Stripe *bundle* grant (idempotent, retry), refund/referral idempotency, Milla cron guards. That is the whole safe list.
- **Unsafe (code-confirmed):** the *send outcome* of every email (phantom sends — `figsy.ts:523` never checks Resend `{error}`; and `alerts.ts:24` — the alarm is itself a phantom sender); the subscription lifecycle (failed→active `stripe.ts:415`, cancel-doesn't-cancel `subscriptions.ts:40`, MRR $0 `stripe.ts:428`); `check-lapsed` cron 500s daily; no cron singleton; kill-switch misses crons; `lookalike` cross-tenant IDOR; #335/#336 inert client-side; the 90-day guarantee.
- **Prod-DB-Confirmed:** `visitor_sessions` is anon-readable (`admin_read_visits` = `{public}` SELECT USING(true)) — a live PII leak; the fix is a clean `DROP POLICY`. RLS "5 tables open" and `clients.plan` "missing" were **Refuted** — prod is fine there.
- **Unknown (needs §D SQL):** the idempotency uniques, the `subscription_status` enum, the missing tables, MRR-null — prod is whatever was hand-pasted (no migration runner).

## 2. THE REGISTER
All 67 findings are logged as 🔴 items **#338–#404** in `PRODUCT-INVENTORY.md`, tiered **CRITICAL(13) · HIGH(30) · MEDIUM(14) · LOW(10)**, each with file:line + owner (🤖 Claude / 🧍 Founder / 🤝 Both). Summary by tier lives in `LAUNCH-PAD.md` Milestone 0. Original #330–#337: #330-333 complete · #334/#335/#336/#337④ partial/inert.

## 3. THE THREE BUSINESS QUESTIONS (answered)
- **Do our agents do what we say?** HALF. Real: FIGSY engine, Milla brief+doc-chat, Denise drafts, Nora, Casey. False/broken: Vida knowledge+WhatsApp, Calendar auto-book, Denise closed-won, Milla connectors, FIGSY autonomous-replies (#403), Lena (#404). Every real agent is extendable.
- **Does a client get what they paid for?** PARTIALLY — leads source (~50/run not 250M), scores real-but-degrade-to-50, **the email advances to 'sent' whether Resend sent it or not (#338)**, copy generic (#346), replies drafted, no auto-book.
- **Do we get paid for what we give?** Correct AT enrollment; but pay-and-get-nothing via phantom send (#338), ledger drift (#349), subscription charge-after-cancel/active-on-fail (#340/#341).

---

## 4. ARCHITECTURE DECISION — verdict on "deterministic workflows, AI assists only"

**VERDICT: CORRECT, and it names the dominant root cause — but NECESSARY, NOT SUFFICIENT.**

The audit's worst findings are **not** "AI did something wrong." They are deterministic-engineering failures: **state advanced without verifying provider/DB success; fail-open instead of fail-closed; missing constraints/locks/tenant-checks.** AR-01 (phantom send) is literally "state advanced without provider proof." So the rule — *AI has no authority; deterministic software decides; state advances only after verified success; fail closed* — is the exact correct fix for ~40 of the ~67 findings.

**Three honest challenges:**
1. **It doesn't solve ~15 findings** — legal (AR-11 guarantee), copy (AR-49/50/#403), missing features/packages (AR-24 Vida RAG, AR-361 Calendar), prod-DB ops (AR-36/42). There, "fail closed" means **hide the claim / withhold the feature until built.**
2. **Deterministic ≠ correct.** The drip cap (#331) was deterministic and still had a business-logic bug that starved payers. Removing AI removes "the model decided wrong"; only **tests** remove "the rule was written wrong" — and you have ~zero route/cron/webhook tests.
3. **AI output still needs deterministic guards.** AR-20 (fake score 50 flows in as truth) proves that even "AI only scores" corrupts data when its failure is swallowed. Boundary = "AI has no authority" **AND** "AI output is validated/quarantined before any system trusts it."

**ML is NOT the solution.** The solution is **deterministic control-flow + fail-closed + provider/DB success verification + tests, with AI confined to draft/classify/score/summarise/suggest.** Treating AI as an authority is the actual disease.

## 5. THE SEND/CHARGE MODEL (the core fix)
Current = broken Option-1: charge before send, refund only on *insert* failure, **never on send failure** (swallowed). **Recommend Option-2 (reserve→commit):**
`credit_reserved → send_attempted → provider_confirmed → credit_committed → sent_logged`; on Resend `{error}` → `credit_released → retry_queued → human_review`.
Rules: **no `sent` without provider confirm · no permanent spend without delivery · no metric without provider proof · no alert "sent" without checking its result · no failure swallowed if it touches money/send/trust/tenant/legal.**

## 6. STATE MACHINES (make risky flows explicit)
- **Send:** `eligible → credit_reserved → send_attempted → provider_confirmed → credit_committed → sent_logged` (fail → `credit_released → retry/human`).
- **Subscription:** `payment_pending → active|past_due|incomplete → cancel_requested → cancel_confirmed → canceled_at_period_end`. Never `active` without a paid invoice.
- **Reply:** `received → classified → (suppressed | human_review → drafted → human_sent)`. No autonomous send.
- **Booking:** `slot_offered → event_created(provider_confirmed) → booked_verified`. Only `booked_verified` counts for the guarantee.
- **Cron:** `lock_acquired → running → completed|failed` (skip if no lock). **Webhook:** `verified → deduped → processed → ack(200 only on success)`.

## 7. AI/ML BOUNDARIES
**AI may:** draft copy, score leads, classify replies, detect intent/duplicates/anomalies, summarise, extract, suggest. **AI may NOT:** charge/grant/decrement credits, activate/cancel subs, refund, approve sends, mark sent, mark booked, change tenant, write dashboards-as-truth, decide guarantee eligibility, answer pricing/legal without approved source. **Every AI output is deterministically validated before trust** (scoring failure → quarantine, not `scored`; copy → grounding + no-fabrication; opt-out classification → high-recall).

## 8. FAIL-CLOSED POLICY (default = ABORT for money/send/tenant/legal)
Provider fail → abort + retry_queued + alert · alert fail → durable store + Slack (never rely on email) · Stripe fail → 500 (retry) · DB/RPC fail → abort txn + alert · bad webhook sig / OAuth state → reject · missing env/package/table/RLS → disable feature at boot + alert · scoring fail → quarantine · enrichment fail → hold lead · LLM fail → no autonomous action · cron-lock fail → skip · opt-out/credit/tenant fail → abort. Continue/retry only for non-money background work.

---

## 9. SAFE FIGSY-ONLY PRODUCT (Scope A — recommended)
**In:** sourcing (paginated), scoring (failure-quarantined), sequence drafting, knowledge entry + grounding (#346 on), **approve-before-send (human) (#347 fixed)**, Option-2 send, reply classify→draft→human-send, credits (reserve/commit), Stripe credit purchases.
**Hidden:** Vida knowledge, WhatsApp, Calendar booking, Denise/Milla claims, partner program, referral (until link fixed), auto-topup, subscriptions, the 90-day guarantee.
**Claims removed:** 250M→"targeted", autonomous replies, calendar booking, Vida "no hallucinations/your WhatsApp", Milla connectors, Denise closed-won, the guarantee.
**Could one real client safely use FIGSY after these controls?** → **Yes, after the top-20 below AND runtime proof on staging.** Until the staging proof of the send path exists, the send path is **Unknown-until-runtime.**

## 10. TOP-20 CONTROLS (build order)
1. Provider-success check on every send (#338) · 2. Checked + durable alerts (#339) · 3. Reserve/commit send state-machine (§5) · 4. Cron singleton lock (#343) · 5. Kill-switch in send path (#344) · 6. Checked money DB writes (#349) · 7. `figsy_enrollments` + `(enrollment_id,step)` uniques (#354/#373) · 8. Subscription status-mapper (#340) · 9. Real Stripe cancel (#341) · 10. Write `amount_usd` (#357) · 11. lookalike derive-from-auth (#345) · 12. Drop visitor_sessions public policy (#350) · 13. HMAC OAuth state (#368) · 14. Knowledge UI on + grounding (#346) · 15. Approve-before-send fixed (#347) · 16. Scoring failure-quarantine (#358) · 17. is_demo exclusion everywhere (#364) · 18. Prod-DB constraint verification (#373, §D) · 19. Rewrite/withhold guarantee + false claims (#348 + copy) · 20. Migration runner + schema-diff CI (#389).

---

## D. PROD-DB VERIFICATION — read-only SQL (paste into prod Supabase)
```sql
-- D1 enum (code writes active/trialing/past_due/cancelled/inactive/paused/lapsed)
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid WHERE t.typname='subscription_status' ORDER BY enumsortorder;
-- D2 money RPCs
SELECT proname FROM pg_proc WHERE proname IN ('try_charge_figsy_credit','increment_figsy_credits','increment_client_credits','allocate_pool_to_rep');
-- D3 idempotency uniques (must have: credit_transactions.reference, figsy_enrollments(campaign_id,lead_id), subscriptions(client_id,product))
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND indexdef ILIKE '%unique%' AND tablename IN ('subscriptions','partner_commissions','partner_referrals','figsy_enrollments','figsy_sent_emails','credit_transactions');
-- D4 tables the code calls
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('subscribers','webhook_endpoints','whatsapp_messages','figsy_sessions','figsy_knowledge');
-- D5 MRR sanity
SELECT count(*) total, count(*) FILTER (WHERE amount_usd IS NULL OR amount_usd=0) zero FROM subscriptions WHERE status='active';
-- (RLS already checked live: visitor_sessions admin_read_visits = {public} SELECT USING(true) → DROP POLICY admin_read_visits.)
```
**DO NOT RUN until reviewed:** `ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'lapsed';` · unique-index adds (dedupe first) · never re-paste `20260525_fix_subscriptions_schema.sql` (DROPs amount_usd).

## K. MINIMUM TESTS (you have ~7 lib tests, 0 route/cron/webhook/RLS)
Provider-failure (Resend `{error}`→not sent; Anthropic fail→not `scored`; Stripe grant fail→500) · cron double-run idempotency + kill-switch-stops-send + lapse-status-valid · race-at-1-credit + auto-topup-double + pool-0-row · tenant (lookalike forged id) + RLS (anon can't read figsy_knowledge/visitor_sessions) · Stripe test-mode subscription lifecycle · e2e (ref survives login→pays; knowledge changes copy) · opt-out high-recall. **No CRITICAL item is "fixed" without a regression test.**

## O. SCOPES
- **A — FIGSY-only (recommended):** §9. ~12 code fixes + prod-DB session + claims strip. Safe for one client after top-20 + staging proof.
- **B — + billing/referrals:** adds the subscription lifecycle rebuild — only after Stripe test-mode proof.
- **C — full surface:** weeks building 4 half-real integrations. Not recommended pre-revenue.

## P. NEXT ACTIONS
1. 🧍 Run §D SQL in prod + confirm Railway replica count + is `apps/landing` deployed → converts ~10 Unknowns to facts.
2. 🧍 Pick a scope (A recommended).
3. 🤖 Build the CRITICAL tier as small, individually-tested PRs — **#338 phantom-send + #339 blind-alarm first** (they gate visibility of everything else), then the top-20 in order.
4. 🤖 Rewrite/hide false claims + guarantee (one copy/legal PR).
5. Runtime-prove each fix on staging (§K) before any dot goes 🟢.

---
*8 Jul 2026. Code-confirmed on origin/main. No runtime/prod-DB access — §D SQL + §K tests are the proof instruments this doc cannot execute.*
