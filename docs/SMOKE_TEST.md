# K.I.N.D — End-to-End Smoke Test (prove the money path)
`Last-checked: 25 Jun 2026`

**Purpose:** verify a real client can sign up → build an ICP → GET leads → run FIGSY → get a reply → book a meeting, with money charged correctly and nothing silently broken. Run this AFTER the pre-flight below. Report failures as `T#-Step# — what I saw` and Claude fixes.

---

## PRE-FLIGHT (do these first — fixes depend on them)
- [ ] **Complete the full `DEPLOYMENT_GUIDE.md` first** (migrations 010/012/013, env vars, merge, post-deploy smoke). This smoke test assumes the deploy is live.
- [ ] **Run `supabase/migrations/20260603_schema_reconcile.sql`** in Supabase SQL editor (idempotent, safe). This is the keystone — the reply/send/credit pipeline depends on it.
- [ ] Railway API env: `ADMIN_SECRET_KEY` set · `RESEND_API_KEY` set · `RESEND_WEBHOOK_SECRET` set (inbound replies now fail-closed without it) · `ANTHROPIC_API_KEY` set · `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` set.
- [ ] Railway Portal env: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, the 6 `NEXT_PUBLIC_STRIPE_PRICE_*` IDs.
- [ ] Stripe price IDs added (for the billing test).
- [ ] A fresh Gmail you've never used on K.I.N.D.

---

## TEST 1 — Signup → Onboarding → Dashboard gate
1. Go to `app.get-kind.com` → Sign up with the fresh Gmail. → **Expect:** lands on `/onboard` (not a broken dashboard).
2. Complete onboarding (Company, "what do you do", country, website). → **Expect:** welcome email arrives; lands on `/dashboard`; credit balance shows **20**.
3. **Abandon test:** sign up a SECOND fresh email, but close the tab on the onboarding screen. Re-open `app.get-kind.com`. → **Expect:** you're sent BACK to `/onboard` (NOT stranded on an empty dashboard). *(verifies the onboarding gate fix)*
4. Log out → log back in. → **Expect:** session persists, lands on dashboard.

## TEST 2 — ICP → Leads (the "client must GET leads" path)
5. Dashboard → Leads → Build ICP → "Suggest with AI". → **Expect:** form pre-fills.
6. Save / "Find Leads". → **Expect:** leads appear **immediately** in the list (not empty), each scored 0–100. *(verifies deliver-on-run)*
7. Check credit balance. → **Expect:** balance dropped by the number of leads delivered (e.g. 20 leads → charged ~20). *(verifies charge-on-delivery)*
8. **Activate test:** create a SECOND ICP, click "Set active". → **Expect:** new leads start sourcing for it (not a silent no-op). *(verifies activate→run fix)*
9. Export CSV. → **Expect:** only delivered leads export; no undelivered/unpaid leads leak. *(verifies delivery gate)*

## TEST 3 — FIGSY outreach → reply → hot lead
10. Unlock FIGSY (admin: grant the account FIGSY access + credits if needed). Create a campaign, enrol a couple of **your own** test email addresses as leads (so you can reply).
11. Trigger send (or wait for the 2-hourly cron / use admin send-due). → **Expect:** the test addresses receive a real email **from the cold domain `hello@gettingkind.com`** (NOT get-kind.com — verifies D4 cold-FROM), with your **booking link** in it (if `booking_url` set). *(booking-link injection + cold-FROM)*
12. Reply "Yes, let's talk" from a test address. → **Expect:** within a minute or two it appears in the portal inbox / admin Unibox, classified **🔥 hot**, sequence paused. *(verifies the classification/reply pipeline — the schema reconcile must have run)*
13. Pause the campaign. Trigger send again. → **Expect:** NO further emails go out for it. *(verifies paused-campaign send stop)*

## TEST 4 — Booking + KPI
14. On the hot reply, connect Google Calendar (or use "Mark as booked"). Book a slot. → **Expect:** `meetings_booked` on the campaign increments; the reply is stamped booked. *(verifies KPI unify)*

## TEST 5 — Billing (paid path)
15. Buy a credit bundle via Stripe checkout (test mode). → **Expect:** credits added once; balance correct.
16. (If possible) replay the same Stripe webhook. → **Expect:** credits NOT doubled. *(verifies webhook idempotency)*
17. Subscribe to Milla. → **Expect:** Milla unlocks; a non-subscriber calling the Milla API directly gets 403. *(verifies Milla API gate)*

## TEST 6 — Vida widget
18. Configure a chatbot, copy the embed snippet onto a test page. → **Expect:** the bubble renders (correct API host), is **purple** not blue, a visitor message gets a reply, and a lead is captured. *(verifies Vida host + color + capture)*

## TEST 7 — Milla & crons hygiene
19. Confirm a NON-Milla client does NOT receive Milla morning-brief / anomaly emails. *(verifies cron sub-gate)*

## TEST 8 — Deliverability (D1–D5, the #1 blocker) — NEVER tested end-to-end
Use the cold email received in T3 step 11. In Gmail, open it → "Show original".
20. **D4 cold-FROM:** `From:` is `…@gettingkind.com`, NOT `get-kind.com`. SPF + DKIM = **PASS**, and DKIM domain aligns to `gettingkind.com`.
21. **D1 List-Unsubscribe:** the raw headers include `List-Unsubscribe:` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. Gmail shows an **"Unsubscribe"** link by the sender name.
22. **D1 footer + endpoint:** the email body has a visible **"Unsubscribe"** link → click it → page says unsubscribed. Then trigger send again → **NO further email** to that address (added to opt-out blocklist).
23. **D2 plain-text:** "Show original" shows BOTH a `text/plain` and `text/html` part (not HTML-only).
24. **D3 tracking pixel:** in the HTML, the open-tracking `<img>` is **absent** unless `TRACKING_URL` is a branded domain (never a `*.railway.app` URL).
25. **P-a signer:** if `clients.signer_name` is set, the email signs off as **exactly that name** (not an invented one). *(set it via DB/API until the portal field ships)*
26. **Inbox placement:** the email landed in **Primary/Inbox**, not Spam/Promotions. (Formal check: mail-tester.com → aim 10/10.)

## TEST 9 — Team invites (first client needs ~10 people on one workspace)
27. Settings → Team → invite a teammate (`POST /team/invite`). → **Expect:** invite email arrives with an `/invite/accept?token=…` link.
28. Open the link in a fresh browser, sign up/log in as that teammate, accept. → **Expect:** they land in the **same client workspace** (shared leads/campaigns), `client_members` row marked accepted, role applied.
29. Repeat once more (2–3 total) → **Expect:** no seat cap blocks them, all see the same data. *(verifies multi-user works before loading a 10-person client)*

## TEST 10 — Partner onboarding (first partner — Nigeria)
30. Submit a partner application (`POST /partners/apply`) OR admin-create the partner. → **Expect:** record created with a **referral code**.
31. Admin approve (`PATCH /partners/admin/:id/approve`). → **Expect:** an **auto-provisioned demo sandbox** is created + a "sandbox ready" email sent; partner can log into `/dashboard/partner`.
32. Sign up a test client via the partner's **referral code** (`/partners/ref/:code`). → **Expect:** the signup is attributed to the partner; a commission can be recorded and shows on the partner dashboard. *(verifies the channel path before the real Nigeria partner relies on it)*

---

## PASS CRITERIA FOR LAUNCH
All of: signup gate works · leads appear + charge correctly · FIGSY sends from **gettingkind.com** + reply becomes hot · booking records · Stripe single-charge · Vida widget live + purple · no Milla email leak · **deliverability T8: SPF/DKIM pass, List-Unsubscribe present + one-click works, plain-text part present, inbox not spam.** Any fail → log as `T#-Step# — what I saw`, Claude fixes, re-run that test.
