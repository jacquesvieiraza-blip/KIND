# K.I.N.D — Client Flow SOP
*Last updated: 18 May 2026*

Complete start-to-finish — all paths.

---

## Path 1 — Self-service trial (most common)

**Entry point: get-kind.com**

1. Client visits get-kind.com, clicks "Start free trial"
2. Redirected to app.get-kind.com/login → signs up with email + password
3. **No email confirmation required** — lands directly on /onboard
4. Fills in company name, industry, country, phone, website → "Start free trial"

**What happens in the background:**
- Client record created in DB
- 14-day trialing subscription created
- Welcome email sent via Resend

5. Dashboard loads — trial banner visible
6. Client builds ICP → leads appear → explores for 14 days
7. Day 14 — trial expires → full-screen overlay: "Your trial has ended"
8. Client clicks "Choose a Plan" → Billing page → selects plan → Paystack → card entered → paid
9. Webhook fires → subscription flips to active → overlay gone → full access

**If they abandon before paying:** subscription stays `trialing (expired)` — no charge ever.

---

## Path 2 — AE-assisted (your team is involved)

**Entry point: AE sends client to get-kind.com**

1–4. Identical to Path 1 — client self-registers and onboards (no email confirmation needed)

5. AE receives alert (or checks admin portal) — sees new client in Clients list with status "Trial"
6. AE opens client profile in admin portal → reviews subscriptions and details
7. AE calls/emails the client to walk them through signing
8. Client goes to Billing → selects their plan → Paystack → done

---

## Path 3 — Skip trial, pay on day 1

**Entry point: get-kind.com — client already knows they want to proceed**

1–4. Identical — client signs up and onboards
5. Dashboard loads with trial banner
6. Client goes directly to Billing → selects plan → Paystack → card → payment success
7. Subscription flips to active immediately
8. No trial overlay, no gates — full access from day 1

---

## Path 4 — Trial expired, client never paid

1. Trial expires on day 14 → full-screen overlay fires
2. Client clicks "Choose a Plan" → Billing → pays → active

**If client abandons entirely:** subscription stays `trialing (expired)` indefinitely. No charge ever. They appear in admin as trial expired.

---

## Path 5 — Active client upgrades (Lead Gen → Lead Gen + FIGSY bundle)

1. Active client on Lead Gen → Billing → sees FIGSY products
2. Selects FIGSY bundle → Paystack → payment
3. New subscription created with product: `lead_gen_figsy`
4. Dashboard shows FIGSY unlocked
5. **Admin action needed:** cancel the old Lead Gen-only subscription in admin portal

---

## Path 6 — Active client adds FIGSY as an add-on (not full bundle)

1. Active client on Lead Gen → Billing → "Add FIGSY"
2. Currently manual process: AE activates FIGSY in admin portal → grant subscription
3. Client sees FIGSY unlocked on next load

**This is intentionally manual for now** — FIGSY is a higher-touch product.

---

## Path 7 — Sales team demo

1. AE goes to admin.get-kind.com → Demo Environments
2. Fills in: prospect name, company name, industry, country, expiry date, AE name
3. System creates: real Supabase user + client + all 4 products active + runs real Apollo ICP
4. Leads start appearing within minutes
5. AE clicks "Open Demo" → portal opens in new tab, logged in as the demo client
6. AE walks the prospect through the live platform — real leads, real scores
7. After demo: demo expires automatically on set date, or AE can expire immediately

---

## Summary table

| Path | Who | Trial? | AE involved? | Works today? |
|------|-----|--------|-------------|-------------|
| 1 — Self-service trial | Client | Yes | No | ✅ Yes |
| 2 — AE-assisted | Client + AE | Yes | Yes | ✅ Yes |
| 3 — Pay day 1 | Client | Skipped | No | ✅ Yes |
| 4 — Trial expired, no payment | Client | Expired | Optional | ✅ Yes |
| 5 — Upgrade to bundle | Active client | No | Admin action | ✅ Yes (manual cancel old sub) |
| 6 — FIGSY add-on | Active client | No | Yes | ✅ Manual |
| 7 — Sales demo | AE only | Demo | Yes | ✅ Yes |

---

## Note on flowchart

A visual flowchart does not yet exist — this is the text SOP. If you want a Mermaid diagram or a visual flow built into the admin portal, say the word and it can be added.

---

*Update this document whenever a new client path is added or an existing path changes.*
