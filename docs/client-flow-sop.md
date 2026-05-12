# K.I.N.D — Client Flow SOP
*Last updated: May 2026*

Complete start-to-finish — all paths.

---

## Path 1 — Self-service trial (most common)

**Entry point: get-kind.com**

1. Client visits get-kind.com, clicks "Start free trial"
2. Signs up with email + password → confirmation email sent
3. Clicks confirmation link → lands on app.get-kind.com/auth/callback → redirected to /onboard
4. Fills in company name, industry, country, phone, website → "Go to my dashboard"

**What happens in the background:**
- Client record created in DB
- 14-day trial subscription created (status: trialing)
- Order form auto-created and set to `sent` — Lead Gen, $100/mo minimum, billing starts day 15
- Welcome email sent via Resend

5. Dashboard loads — red banner: "Sign your Service Agreement — 14 days remaining"
6. Client clicks Sign now → Documents page → order form is already there
7. Reviews services ordered, billing start date, T&Cs → types full name → ticks checkbox → "Sign Order Form"
8. Banner changes to: "Trial: 13 days remaining. Upgrade before your trial ends."
9. Client sets up ICP, leads start appearing, explores dashboard for 14 days
10. Day 14 — trial expires → full-screen overlay: "Your trial has ended"
11. Client clicks "Choose a Plan" → Billing page → selects Lead Gen → Paystack → card entered → paid
12. Webhook fires → subscription flips to active → overlay gone → full access

**If they cancel before day 15 (billing start date):** no charge — trial ends, subscription stays trialing until it expires. They lose access at day 14 but were never billed.

---

## Path 2 — AE-assisted (your team is involved)

**Entry point: AE sends client to get-kind.com**

1–4. Identical to Path 1 — client self-registers and onboards

5. AE receives alert (or checks admin portal) — sees new client in Clients list with status "Trial"
6. AE opens client profile in admin portal → sees auto-generated order form ($100/mo Lead Gen)
7. AE customises it — adds correct products, custom pricing, scope notes, start date → "Update & resend"
8. Client's Documents page updates instantly — they now see the AE's version, not the auto-generated one
9. AE calls/emails the client to walk them through signing
10. Client signs the customised agreement
11. Admin portal shows status: "Signed — awaiting payment"
12. Client goes to Billing → selects their plan → Paystack → done
    OR AE shares a direct Paystack payment link with the client

**What's different from Path 1:** The order form is customised by a human before the client signs. Everything else is the same. The AE never needs to touch Supabase or create accounts — the client does all of that themselves first.

---

## Path 3 — Skip trial, pay on day 1

**Entry point: get-kind.com — client already knows they want to proceed**

1–4. Identical — client signs up and onboards
5. Client lands on dashboard with the "Sign your agreement" banner
6. Client goes to Documents → signs the auto-generated order form immediately
7. Instead of waiting for the 14-day trial, client goes to Billing
8. Clicks "Get started" on their chosen plan → Paystack → card entered → payment success
9. Subscription flips to active immediately
10. Trial period becomes irrelevant — active subscription takes over
11. No gates, no banners, full access from day 1

**No changes needed — this works today.**

---

## Path 4 — Trial expired, client never signed or paid

1. Trial expires on day 14 → full-screen overlay fires
2. If order form not signed yet: overlay shows two buttons — "Sign Service Agreement" + "View Plans"
3. Client goes to Documents → signs → overlay updates
4. Client goes to Billing → pays → active

**If client abandons entirely:** subscription stays trialing (expired) indefinitely. No charge ever happens. They appear in admin as "Trial expired — unpaid." A follow-up email sequence (future build) would be the re-engagement tool here.

---

## Path 5 — Active client upgrades (Lead Gen → Lead Gen + FIGSY bundle)

1. Active client, already paying $100/mo for Lead Gen
2. Goes to Billing → sees "Lead Gen + FIGSY Bundle" section
3. Clicks "Get started" → Paystack → new subscription initiated
4. On payment success → new subscription record created with product: `lead_gen_figsy`
5. Dashboard shows both products active
6. FIGSY outreach begins (F1 build)

**⚠️ Open item:** The old Lead Gen subscription stays active alongside the bundle. The Lead Gen-only subscription needs to be cancelled when they upgrade to the bundle — either a small admin action or an automated cancellation trigger. This needs to be decided and built before FIGSY goes live.

---

## Path 6 — Active client adds FIGSY as an add-on (not full bundle)

1. Active client on Lead Gen → Billing → "Add FIGSY to your existing plan"
2. Clicks "Request add-on" → mailto link → email to hello@get-kind.com
3. Manual process: AE goes to admin portal → opens client profile → adds FIGSY add-on line to order form → "Update & resend"
4. Client signs updated agreement
5. AE activates FIGSY product in the client's subscription manually (or via a future admin toggle)

**This is intentionally manual for now** because FIGSY is a higher-touch product. If you want this self-service later, it can be automated.

---

## Summary table

| Path | Who | Trial? | AE involved? | Works today? |
|------|-----|--------|-------------|-------------|
| 1 — Self-service trial | Client | Yes | No | Yes |
| 2 — AE-assisted | Client + AE | Yes | Yes | Yes |
| 3 — Pay day 1 | Client | Skipped | No | Yes |
| 4 — Trial expired, no payment | Client | Expired | Optional | Yes |
| 5 — Upgrade to bundle | Active client | No | No | Needs Path 5 fix |
| 6 — FIGSY add-on | Active client | No | Yes | Manual only |

---

*Update this document whenever a new client path is added or an existing path changes.*
