# 🔍 K.I.N.D — DEEP VERIFICATION & LAUNCH-BLOCKER AUDIT (8 Jul 2026)

> **Scope of trust:** every verdict is **CODE-CONFIRMED** (read on `origin/main` @ b10e883) unless explicitly marked **NEEDS-RUNTIME** or **NEEDS-PROD-DB**. The auditor (Claude) has **no runtime, staging, Stripe, or production-DB access** — so *nothing here is runtime-proven*. The read-only SQL (§D) and test plans (§C/§N) are the instruments to obtain that proof; they must be run by the founder/CI. **Do not treat "code says so" as "proven in product."**

---

## A. EXECUTIVE TRUTH

- **SAFE (code-confirmed, atomic/fail-closed):** FIGSY enrollment *charge* (`try_charge_figsy_credit`), Stripe *credit-bundle* purchase grant (ledger-first, unique reference, 500-on-fail retry), refund/referral claw-back idempotency, Milla cron guards. These are the exemplars; the fix for everything else is "make it look like these."
- **UNSAFE (code-confirmed):** the *send outcome* of every email (phantom sends — `result.error` never checked at 29/30 sites, incl. the alert system itself); the entire *subscription* lifecycle (failed→active, cancel-doesn't-cancel, MRR $0); `check-lapsed` cron (writes an enum value that doesn't exist → 500s daily → unpaid clients keep access); cron double-run (no singleton) + kill-switch that doesn't cover crons; auto-topup double-charge; `lookalike` cross-tenant IDOR; #335 & #336 inert client-side; the 90-day guarantee (self-contradictory, inoperable).
- **UNKNOWN (NEEDS-PROD-DB — no migration runner, prod = whatever was hand-pasted):** whether `subscriptions(client_id,product)`, `partner_commissions`, `partner_referrals`, `figsy_enrollments(campaign_id,lead_id)` uniques exist; whether `subscription_status` enum has the values code writes; whether `webhook_endpoints`/`subscribers`/`whatsapp_messages`/`clients.last_seen_at` exist; live RLS policies. **This is the single biggest blind spot — §D resolves it.**
- **Bottom line:** one genuinely-real product (FIGSY email outreach) inside a much larger surface of partial/inert/crashing claims. ~20 Critical + ~20 High, clustering to ~12 code fixes + 1 prod-DB session + a claims rewrite.

---

## B. AUDIT-OF-AUDIT — previous findings re-verified

| Finding | Prev sev | Verified sev | Status | Evidence (file:line) | Code only? | What could make it wrong |
|---|---|---|---|---|---|---|
| Phantom sends (Resend `error` unread) | Critical | Critical | **CONFIRMED (code)** | `lib/figsy.ts:523` `messageId = (result as any).data?.id` — `result.error` never read; 29/30 sites | Yes | If prod Resend key + domain always healthy, never manifests — but no guard = latent always |
| Alarm is itself a phantom sender | Critical | Critical | **CONFIRMED (code)** | `lib/alerts.ts:24-27` try/catch around a non-throwing SDK; error unread | Yes | Slack path (if `SLACK_WEBHOOK_URL` set) is a partial backstop — but email alert is primary |
| Subscription status → active | Critical | Critical | **CONFIRMED (code)** | `routes/stripe.ts:415` `… ? sub.status : 'active'` | Yes | NEEDS-RUNTIME: confirm Stripe actually sends incomplete/past_due to this handler |
| Cancel doesn't cancel + no billing portal | Critical | Critical | **CONFIRMED (code)** | `routes/subscriptions.ts:40-48`; `billing_portal`=0 hits; portal has no cancel button | Yes | None — comment admits "Stripe handled by billing portal" that doesn't exist |
| MRR structurally $0 | Critical | High | **CONFIRMED (code)** | `stripe.ts:428` sub insert omits `amount_usd`; `auth.ts:159`=0 | Yes | NEEDS-RUNTIME: a real paid sub to confirm the number renders $0 |
| check-lapsed writes invalid `lapsed` | Critical | Critical | **CONFIRMED (code)** | `internal.ts:2038`; enum has only base+`paused` (`20260622_subscription_pause.sql:14`) | Yes | NEEDS-PROD-DB: someone may have hand-added the value → then it mis-lapses instead of 500 |
| approve-before-send dead (`figsy_leads`) | High | High | **CONFIRMED (code)** | `figsy.ts:2948` embeds `figsy_leads`; real table is `leads` | Yes | None |
| No cron singleton | Critical | Critical | **CONFIRMED (code)** | `index.ts:216` `startCrons()` unconditional; no lock/env gate | Yes | Only bites at 2+ replicas — NEEDS-RUNTIME to confirm replica count |
| Kill-switch misses crons | High | High | **CONFIRMED (code)** | `AUTO_OUTREACH_ENABLED` read only `icps.ts:178`; 3 cron send paths ignore it | Yes | None |
| trial-expiry daily forever | Critical | High | **CONFIRMED (code)** | `internal.ts:397` `daysLeft<=0` matches daily; no terminal state transition | Yes | None |
| send-due double-send | Critical | High | **CONFIRMED (code)** | `figsy.ts:545` state advances after send, no claim; no `(enrollment_id,step)` unique | Yes | NEEDS-PROD-DB: unique index may exist in prod (only plain indexes in repo) |
| auto-topup double card charge | High | High | **CONFIRMED (code)** | `figsy.ts:362-398` count-then-charge TOCTOU | Yes | Dead unless a client has `auto_topup_paystack_auth` (none today) |
| lookalike cross-tenant IDOR | Critical | Critical | **CONFIRMED (code)** | `lookalike.ts:46-49` body `client_id` unchecked; `:10-43` leaks foreign client | Yes | NEEDS-RUNTIME: confirm route is deployed & RLS doesn't save it (service-role bypasses RLS) |
| #335 inert (knowledge UI disabled) | — | Critical | **CONFIRMED (code)** | `knowledge/page.tsx:16` `TRAINING_LIVE=false`; backend fully built | Yes | None — one boolean |
| #336 inert (`?ref=` dropped) | — | High | **CONFIRMED (code)** | `page.tsx:14` `redirect('/login')` drops query | Yes | None |
| #337④ SA-name not swept | — | Low | **CONFIRMED (code)** | `figsy.ts:743, 989` "South African-sounding" | Yes | None |
| partner commission 20% recurring, no clawback, dup | High | High | **CONFIRMED (code)** | `stripe.ts:39,487`; `comp-engine.ts` imported by nothing; no unique on `partner_commissions` | Yes | NEEDS-PROD-DB: unique may exist in prod |
| RLS gaps anon-reachable | High | High | **CONFIRMED (code)** + NEEDS-PROD-DB | portal uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`; 5 newest tables no RLS | Partial | NEEDS-PROD-DB: live policies may differ from repo |
| Vida no knowledge layer | High | High | **CONFIRMED (code)** | `lib/vida.ts:46-53` prompt = name+company+freetext | Yes | None |
| Calendar crashes (googleapis) | Critical | High | **CONFIRMED (code)** | `lib/gcal.ts:17` `require('googleapis')`; absent from all package.json | Yes | None |
| 90-day guarantee inoperable | High | High | **CONFIRMED (code+terms)** | `terms.html:321,325,333` vs dead booking flow | Yes | None |
| $1 homepage residue | Med | Med | **CONFIRMED** | `index.html:1968` vs `:2015`; `apps/landing/index.html:379` | Yes | NEEDS-RUNTIME: confirm which site build is deployed |

**Refuted / softened from earlier passes:** `clients.plan` "missing" — **REFUTED**, exists at `20260616_billing_correctness.sql:13` (signups work). `20260707` money migration — **VERIFIED GOOD**. Inventory dots — mostly honest; 5 lying (see §K/§L).

---

## C. RUNTIME-PROOF GAP LIST (what code-confirmed items still require live proof)

Every Critical/High above is **code-confirmed only**. The following MUST be runtime-proven before a real client:
1. Failed-card subscription does/doesn't become active (Stripe test mode).
2. past_due stays past_due, not flipped to active by a later `subscription.updated`.
3. Cancel stops Stripe renewal (today: proven-broken by code; prove the fix).
4. MRR renders a real number post-fix.
5. Refund reverses credits + commissions.
6. Resend error → email NOT marked sent (inject a bad domain on staging).
7. Founder alert actually arrives on a money failure.
8. Two concurrent send-due runs → no duplicate email (needs the constraint).
9. Kill-switch stops cron sends.
10. Approve-queue loads leads and blocks send.
11. `?ref=` survives login → 15 credits paid on first purchase.
12. A client can enter knowledge and it changes outreach copy.
13. lookalike rejects a forged `client_id`.
14. Anon key cannot read `figsy_knowledge`/`metrics_daily`/`lead_enrichment`.
15. Forged WhatsApp/Vapi webhook rejected.
16. Seed endpoints don't move real KPIs.
17. trial-expiry sends once, not daily.
18. auto-topup doesn't double-charge.
19. Lead delivery aborts if charge fails.
See §N for the executable test specs.

---

## D. PRODUCTION DATABASE VERIFICATION CHECKLIST — read-only SQL (paste into prod Supabase SQL editor)

**All queries below are READ-ONLY. Run each; the "❓ expect" tells you what a healthy prod looks like.**

```sql
-- D1. subscription_status enum values (code writes: active, trialing, past_due, cancelled, inactive, paused, lapsed)
SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid=e.enumtypid
WHERE t.typname='subscription_status' ORDER BY enumsortorder;
-- ❓ expect all 7. If 'lapsed' MISSING → check-lapsed cron 500s daily (CONFIRMED likely).

-- D2. Money RPCs exist (the anti-#330 guard)
SELECT proname FROM pg_proc WHERE proname IN
 ('try_charge_figsy_credit','increment_figsy_credits','increment_client_credits',
  'increment_figsy_emails_sent','allocate_pool_to_rep','return_rep_to_pool');
-- ❓ expect first 3 + pool fns. 'increment_figsy_emails_sent' is EXPECTED MISSING (code has a racy fallback).

-- D3. Unique constraints/indexes that idempotency depends on
SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND (
  indexdef ILIKE '%unique%') AND tablename IN
  ('subscriptions','partner_commissions','partner_referrals','figsy_enrollments',
   'figsy_sent_emails','credit_transactions');
-- ❓ MUST see: credit_transactions(reference) unique; figsy_enrollments(campaign_id,lead_id) unique;
--   subscriptions(client_id,product) unique.  LIKELY MISSING: partner_commissions(partner,client,period),
--   figsy_sent_emails(enrollment_id,step). If subscriptions unique missing → double-sub on double-submit.

-- D4. Tables the code calls — do they exist?
SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN
 ('subscribers','webhook_endpoints','whatsapp_messages','figsy_sessions','figsy_knowledge',
  'credit_transactions','partner_commissions','processed_webhook_events','cron_runs');
-- ❓ EXPECTED MISSING: subscribers, whatsapp_messages, figsy_sessions (code silently fails on these).
--   webhook_endpoints likely MISSING (migration in non-canonical dir).

-- D5. Columns the code reads
SELECT column_name FROM information_schema.columns WHERE table_name='clients' AND column_name IN
 ('plan','last_seen_at','last_low_credit_email_at','leads_per_run','low_credit_warned_at',
  'referral_bonus_paid_at','figsy_credits_remaining','credit_balance','auto_topup_paystack_auth');
-- ❓ 'plan' MUST exist (signups work). 'last_seen_at' EXPECTED MISSING (churn scoring silently empty).

-- D6. RLS on anon-reachable tables (portal uses anon key)
SELECT c.relname, c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN
 ('figsy_knowledge','metrics_daily','error_events','nps_responses','cron_runs',
  'lead_enrichment','visitor_sessions','figsy_calls','milla_documents','milla_chunks')
ORDER BY c.relname;
-- ❓ relrowsecurity should be TRUE for every client-scoped/PII table. FALSE = anon-readable.

-- D7. RLS policies present per table (a table with RLS on but no policy = default-deny = safe;
--     RLS on + USING(true) = functionally open)
SELECT tablename, policyname, qual FROM pg_policies WHERE schemaname='public'
 AND tablename IN ('figsy_calls','lead_enrichment','visitor_sessions','milla_chunks');
-- ❓ 'qual' of "true" on a PII table = OPEN. Should be a client_id = auth-derived check.

-- D8. subscriptions.amount_usd exists AND is populated (MRR sanity)
SELECT count(*) total, count(*) FILTER (WHERE amount_usd IS NULL OR amount_usd=0) zero_amount
FROM subscriptions WHERE status='active';
-- ❓ if zero_amount = total, MRR is structurally $0 (CONFIRMED in code).
```

**DO NOT RUN (schema-changing — review first):**
```sql
-- FIX-1 (review): add the missing lapse status so the daily cron stops 500ing
--   ALTER TYPE subscription_status ADD VALUE IF NOT EXISTS 'lapsed';
-- FIX-2 (review): add subscription uniqueness (fails if dup rows exist — dedupe first)
--   CREATE UNIQUE INDEX CONCURRENTLY subscriptions_client_product_uidx ON subscriptions(client_id,product);
-- DANGER — NEVER re-paste: 20260525_fix_subscriptions_schema.sql (DROP COLUMN amount_usd destroys revenue data)
```

---

## E. CRITICAL LAUNCH BLOCKERS (must fix or hide before ONE real client)
1. Phantom sends — send state advances without provider success (`figsy.ts:523` + 28 sites).
2. Alarm is a phantom sender (`alerts.ts:24`) — you'd be blind to #1.
3. Cancel doesn't cancel → charged-after-cancel (`subscriptions.ts:40`).
4. Subscription status → active → free access (`stripe.ts:415`).
5. check-lapsed 500s daily → unpaid keep access (`internal.ts:2038` + enum).
6. No cron singleton → double-everything on scale (`index.ts:216`).
7. Kill-switch doesn't stop cron outreach.
8. lookalike cross-tenant IDOR (`lookalike.ts:46`).
9. RLS open/missing on anon-reachable PII (NEEDS-PROD-DB confirm).
10. #335 knowledge inert (`TRAINING_LIVE=false`) — outreach is generic for every client.
11. 90-day guarantee legally inoperable (rewrite terms).
12. approve-before-send dead (`figsy_leads`) — the human gate for sends doesn't load.

## F. HIGH LAUNCH BLOCKERS
Partner commission (overpay/no-clawback/dup) · auto-topup double-charge · trial-expiry daily · send-due double-send · #336 referral unearnable · consent emails outside kill-switch · MRR $0 · scoring→fake-50 on Anthropic error · WhatsApp unsigned webhook + not multi-tenant · Calendar crash · Vida no-knowledge claim · seed-leads overwrites real balance · fabricated $1 overage on Usage page · $1 homepage residue · Vapi 201-on-failure + unsigned webhook · PhantomBuster silent limbo · demo data in founder metrics.

## G. SEND-PATH MATRIX
| Path | Human-approval | Kill-switch | Demo-excl | Opt-out | Tenant | Idempotent | Provider-check | Verdict |
|---|---|---|---|---|---|---|---|---|
| Cold email (send-due) | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ (no claim) | ❌ phantom | **UNSAFE** |
| Follow-up (steps 2/3) | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | **UNSAFE** |
| Day-1 batch | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | **UNSAFE** |
| Consent email | ❌ | ❌ (outside gate) | partial | ✅ | ✅ | marks sent regardless | ❌ | **UNSAFE** |
| Trial/lifecycle | ❌ | n/a | ❌ (trial-expiry) | n/a | ✅ | calendar-gated not marker | ❌ | **UNSAFE** |
| Founder/support auto-reply | ❌ | n/a | n/a | n/a | n/a | ❌ | ❌ (hallucinated availability) | **UNSAFE** |
| Milla/zero-credit/nurture | ❌ | n/a | ✅ (Milla) | ✅ | ✅ | markers | ❌ | **PARTIAL** (Milla safest) |
| WhatsApp send | ❌ | ❌ | ❌ | ❌ (no opt-out check) | single global # | ❌ | loud-fail | **UNSAFE** |
| Voice (Vapi) | manual trigger | n/a | n/a | n/a | ✅ | keyed | 201-on-fail | **PARTIAL** |
| Calendar invite | n/a | n/a | n/a | n/a | n/a | n/a | crashes | **DISABLED/BROKEN** |
| Referral/partner email | n/a | n/a | n/a | n/a | ✅ | — | ❌ | **PARTIAL** |
| Founder alert | n/a | n/a | n/a | n/a | n/a | n/a | ❌ (phantom) | **UNSAFE** |
| Weekly/daily digest | ❌ | n/a | ❌ (digest) | ✅ | ✅ | calendar-gated | ❌ | **PARTIAL** |

## H. CRON/JOB MATRIX (25 jobs — full detail in Pass-1 findings; launch-blocking marked ⛔)
⛔ send-due-all (double-send, phantom, no kill-switch) · ⛔ check-lapsed (500s daily) · ⛔ trial-expiry (daily forever) · ⛔ check-intent-signals (unbounded wallet drain) · ⛔ cmo/self-outreach (placeholder emails, no kill-switch) · ⚠️ leads/drip (overdraw, swallowed charge) · ⚠️ nurture/activation/digest (calendar-gated dup, demo not excluded) · ✅ metrics/snapshot (only idempotent one) · ✅ Milla jobs (gold-standard guards). **Global: no singleton (⛔ all), 0 tests, none require approval, ADMIN_SECRET_KEY unset silently kills all.**

## I. API / TENANT / RLS MATRIX (highest-risk routes)
| Route | Auth | Tenant server-side | Trusts body id | Verdict |
|---|---|---|---|---|
| `POST /lookalike/generate` | ✅ | ❌ | `client_id` | **UNSAFE (IDOR)** |
| `GET /lookalike/best-client` | ✅ | ❌ (scans all clients) | — | **UNSAFE (PII leak)** |
| `GET /calendar/callback` | public OAuth | unsigned `state` | `base64(clientId)` | **UNSAFE (CSRF)** |
| `POST /calendar/book` | ✅ | lead ✅, enrollment ❌ | `enrollmentId` | **PARTIAL** |
| `/partners/me*` | ✅ | `ilike(email)` | — | **UNSAFE (LIKE-injection)** |
| `POST /whatsapp/webhook` | none | single global # | crafted payload | **UNSAFE (unsigned)** |
| `POST /voice/webhook` | none if secret unset | keyed | `vapi_call_id` | **PARTIAL (fail-open)** |
| `POST /admin/seed-leads` | admin-key | no is_demo guard | `email` | **UNSAFE (overwrites real balance)** |
| Core `/leads,/icps,/figsy,/voice,/proposals,/subscriptions,/company,/developer,/signals` | ✅ | ✅ `.eq(client_id)` | — | **SAFE** |
| RLS (portal anon key) | — | 5 newest tables no RLS; several `USING(true)` | — | **UNSAFE — NEEDS-PROD-DB (§D6/D7)** |

## J. BILLING / CREDITS / SUBSCRIPTION / REFUND MATRIX
| Concern | State |
|---|---|
| Enroll charge | ✅ atomic fail-closed |
| Bundle purchase grant | ✅ ledger-first, retry |
| Lead-gen delivery charge | ⚠️ swallowed on fail, no floor (overdraw) |
| Welcome/trial grants | ⚠️ racy RMW |
| Subscription create | 🔴 status→active, amount omitted |
| Subscription cancel | 🔴 no Stripe call, keeps charging |
| Refund credits | ✅ | Refund commissions | 🔴 never reversed |
| Auto-topup | 🔴 double-charge TOCTOU + dead Paystack |
| Referral payout | ✅ code / 🔴 unearnable (link) |
| Partner commission | 🔴 rate wrong, no clawback, no unique |
| MRR/ARPU | 🔴 $0, demo-polluted |

## K. AGENT CLAIM-VS-REALITY MATRIX
| Feature | Website | Code does | Client can use today | Recommendation |
|---|---|---|---|---|
| FIGSY email outreach | real | sources→scores→sends→classifies | ✅ (once phantom-send fixed) | **KEEP + harden** |
| FIGSY knowledge (#335) | "learns your business" | built, injected | ❌ UI disabled | **FIX (flip flag)** |
| FIGSY approval queue | "approve before send" | dead (`figsy_leads`) | ❌ 500s | **FIX (rename)** |
| FIGSY booking / guarantee | "books into your calendar" | crashes / manual button | ❌ | **HIDE + rewrite guarantee** |
| Vida | "no hallucinations / your KB / your WhatsApp" | name+prompt only, 1 global # | improvises | **HIDE knowledge+WhatsApp claims** |
| Milla | "connects CRM/email" | internal data only; brief real | brief ✅, connectors ❌ | **REWRITE claim; keep brief** |
| Denise | "trained on closed-won / confirms meetings" | static persona, drafts only | drafts ✅ | **REWRITE two claims** |
| Nora | admin co-pilot | real, admin-gated | ✅ (founder-only) | **KEEP** |
| WhatsApp | "connect your number" | 1 global #, unsigned webhook | ❌ | **HIDE** |
| Calendar | "auto-books" | googleapis missing → crash | ❌ | **HIDE** |
| HubSpot (client CRM) | integration | real, fire-and-forget | ✅ fragile | **KEEP w/ caveat** |
| HubSpot (platform sync) | — | dead code | ❌ | **DELETE dead code** |
| Vapi/voice | — | real, 201-on-fail | manual | **KEEP internal** |
| PhantomBuster/LinkedIn | "sends connection reqs" | manual approval, silent limbo | ❌ | **MARK coming-soon (site already hedges)** |
| Partner payouts | "via Wise" | manual admin field | manual | **REWRITE to "manual/managed"** |
| Referral | "15 credits" | code ✅ / link ❌ | ❌ | **FIX link** |
| Admin dashboards | "real data" | demo-polluted, MRR $0 | founder-only | **FIX metrics + go-live wipe (#329)** |

## L. LEGAL / PRICING / GUARANTEE RISK
| Claim | Location | Reality | Action |
|---|---|---|---|
| 90-day guarantee, "no fine print" | pricing.html:594, terms.html:321 | metric (auto calendar booking) can't run; manual excluded → every client qualifies for refund AND can be denied | **REWRITE terms before any signature** |
| "$1 per qualified lead" | index.html:1968 | retired; cards say $3 same page | **DELETE residue** |
| landing app "$1 / from $20" | apps/landing/index.html:379 | retired tier | **Take down / update landing** |
| "Cancel anytime" | billing/page.tsx:388 | no cancel path; keeps charging | **FIX cancel or change copy** |
| Vida "no hallucinations" | chatbot-agent.html:613 | no grounding | **REWRITE/HIDE** |
| "connect your WhatsApp Business number" | chatbot-agent.html:522 | 1 global # | **HIDE** |
| Milla "HubSpot synced/Gmail connected" | virtual-assistant.html:460 | fabricated mock | **REWRITE/HIDE** |
| "FIGSY handles all replies autonomously" | index.html:2038 | drafts only, human sends | **REWRITE** |
| Usage "$1/lead overage" | usage/page.tsx:83 | no metered billing exists | **DELETE panel** |
| "3 vs unlimited ICP regens" | index.html:2022 | no enforcement | **implement or drop differentiator** |

## M. OBSERVABILITY & ALERTING GAPS
- **The alert channel itself is unreliable** (`alerts.ts:24`, email send unchecked) → primary blind spot. `SLACK_WEBHOOK_URL` is an optional partial backstop.
- `cron_runs` table records runs (`callInternal`) — but the `ADMIN_SECRET_KEY`-unset skip returns *before* recording (`cron.ts:28`) → silent global stop.
- `error_events` middleware is real (homegrown), but portal/admin client errors aren't captured; no Sentry (`@sentry`=0 hits, #290).
- No dead-letter/retry table for failed sends or webhooks (Stripe self-retries; Resend/consent/day-1 do not).
- Dashboards **do not distinguish** real vs demo vs failed data (demo pollutes metrics; phantom rows inflate "sent").
- **Minimum viable alerting:** (1) make `sendFounderAlert` check the send result + always post to a durable store (a `founder_alerts` table) + Slack; (2) alert on: any money-RPC failure, any Resend error, any webhook 500, any cron 0-rows-where-expected; (3) a `/health` money-RPC probe (already added §engine) + a daily "did all crons run" digest.

## N. TEST & REGRESSION PLAN
**Existing tests (libs only):** `billing-rules`, `comp-engine`, `enrichment`, `suppression`, `sequence-apply`, `deliverability`, `webhook-idempotency`. **Zero route/webhook/cron/RLS/UI tests.**
**Must-add before "fixed":**
| Area | File to add | Proves |
|---|---|---|
| Phantom send | `apps/api/src/lib/__tests__/send-checked.test.ts` | Resend `{error}` → NOT marked sent, state not advanced |
| Cron double-run | `apps/api/src/routes/__tests__/send-due-idempotent.test.ts` | two concurrent runs → 1 email (needs claim + constraint) |
| Subscription webhook | `stripe-subscription.test.ts` | incomplete/past_due NOT written active; amount written |
| Cancel | `subscription-cancel.test.ts` | calls Stripe, renewal stops |
| Refund | `refund-reversal.test.ts` | credits + commission reversed |
| Tenant | `lookalike-tenant.test.ts` | forged client_id rejected |
| RLS | `rls-anon.test.ts` (against staging w/ anon key) | anon can't read figsy_knowledge/metrics_daily |
| Referral link | `referral-attribution.test.ts` (portal e2e) | ?ref survives login → 15 credits |
| Knowledge | `knowledge-affects-output.test.ts` | client knowledge changes generated copy |
| Webhook sig | `webhook-forgery.test.ts` | forged WhatsApp/Vapi rejected |
**Rule: no fix marked done without a regression test OR a documented manual staging check with pass/fail evidence.**

## O. SCOPE RECOMMENDATION
### Scope A — FIGSY-only safe launch **(RECOMMENDED)**
- **In:** FIGSY email outreach (sourcing→score→enrich→send→reply-classify→manual reply), credits (enroll charge), FIGSY knowledge (flip on), approval queue (fix rename).
- **Hidden:** Vida, WhatsApp, Calendar auto-book, Denise autonomous claims, Milla connectors, partner program, referral (until link fixed), auto-topup, the 90-day guarantee (or rewrite).
- **Code fixes:** phantom-send (4 chokepoints) · alerts-checked · cron singleton + kill-switch coverage · trial-expiry once · send-due claim · knowledge flag · approval rename · lookalike scoping · consent inside gate · SA-name sweep.
- **DB checks:** §D1–D8 (esp. figsy_enrollments unique, RLS on figsy_knowledge).
- **Copy/terms:** hide the above claims; rewrite/withhold guarantee; kill $1 residue.
- **Tests:** send-checked, cron-idempotent, knowledge-affects-output, tenant.
- **Safe for one real client?** Yes, once phantom-send + cron singleton + kill-switch + the DB checks pass. **Still scary:** shared cold domain (#211), no per-client sending isolation.

### Scope B — FIGSY + billing + referrals
- Adds: subscriptions (Milla/Vida-config/Denise as add-ons), referral link fix, real cancel, real MRR.
- **Extra fixes:** subscription status mapping, Stripe cancel, amount write, referral link, partner uniques, refund-commission reversal, auto-topup (Stripe port or keep hidden).
- **Extra DB:** subscription_status enum, subscriptions/partner uniques.
- **Safe for one client?** Only after the subscription lifecycle is runtime-proven in Stripe test mode. **Scary:** partner payouts still manual; commission math.

### Scope C — Full current surface
- Everything, including Vida knowledge (build RAG), WhatsApp multi-tenant, Calendar (add googleapis + prove), Denise/Milla real connectors.
- **Not recommended pre-revenue** — weeks of build across 4 half-built integrations, each its own risk surface.

## P. EXACT NEXT ACTIONS (in order)
1. **You (10 min):** run §D1–D8 in prod Supabase, paste me the outputs. This converts ~8 UNKNOWNs to facts and reorders the fix list.
2. **You (5 min):** confirm Railway API replica count (= is the no-singleton cron bug live?) and whether `apps/landing` is deployed anywhere ($1 tier).
3. **Decide scope** (A/B/C) — A recommended.
4. **I build Scope A code fixes** as small, separately-verifiable PRs, each with a regression test (§N). Phantom-send + alerts first (they gate visibility of everything else).
5. **Fix the lying dots + hide claims** (§L) in one docs/site PR.
6. **Rewrite the 90-day guarantee terms** (or withhold the guarantee) — before any client signs.
7. **Runtime-prove** each fix on staging per §C/§N before flipping any dot to 🟢.
8. **Only then** take a real client, Scope A.

---
*Generated 8 Jul 2026. Code-confirmed on origin/main b10e883. No runtime/prod-DB access — §D and §N are the instruments to obtain the proof this document cannot.*
