# 🔐 Key-Rotation Runbook

_Last-checked: 24 Jun 2026._

**Why:** the 4-Jun credential-exposure incident (keys pasted into chat). This is the
step-by-step to rotate the exposed secrets safely. Cross-ref: incident register in
`docs/legal/it-security-pack.md`.

**Golden rule:** rotate one key at a time, update **every** service that uses it
**before** revoking the old value, then verify. A secret used by two services and
updated on only one will hard-fail that service on its next boot.

**Priority:** do the 2 crown-jewels first (Stripe secret + Supabase service-role).
The rest of the keys from the incident (Resend, Anthropic, Flutterwave,
PDL, Hunter, etc.) follow the same pattern — rotate them too when you have time, but the
*(Vapi ⏸ PARKED 25 Jun — no active key; Paystack killed.)*
2 below are the launch-blocking ones.

---

## 1) `STRIPE_SECRET_KEY`  (used by: **API service only**)

Consumed in `apps/api/src/lib/stripe.ts`. No other service reads it.

1. Stripe Dashboard → **Developers → API keys** → **Roll** the Secret key (`sk_live_…`).
   - Stripe gives you the new value once. Copy it.
   - Stripe lets the old key keep working for a short grace window — good, no downtime.
2. Railway → **api** service → **Variables** → set `STRIPE_SECRET_KEY` = new value → redeploy.
3. **Verify:** run a test checkout / open the billing page in the portal; confirm a
   Stripe call succeeds (no 401 from Stripe in the api logs).
4. Back in Stripe, **revoke** the old key once the new one is confirmed working.

> The Stripe **webhook signing secret** (`STRIPE_WEBHOOK_SECRET`) is separate. Only
> rotate it if you recreate the webhook endpoint — if you do, copy the new `whsec_…`
> into the api service the same way.

---

## 2) Supabase **service-role** key  (used by: **API _and_ Admin** — TWO services)

Var name is the same everywhere: `SUPABASE_SERVICE_ROLE_KEY`.
- **API** reads it via `packages/db/src/client.ts` (the `db` client — every API route).
- **Admin** reads it directly in its server components + `/api/*` route handlers.
- **Portal does NOT use it** (anon key only) — nothing to change there.

1. Supabase → **Project Settings → API → Project API keys** → rotate the
   **`service_role`** key. Copy the new value.
2. Railway → **api** service → Variables → set `SUPABASE_SERVICE_ROLE_KEY` = new value.
3. Railway → **admin** service → Variables → set `SUPABASE_SERVICE_ROLE_KEY` = new value.
   - **Do both 2 and 3 before redeploying either**, so they come back up together.
4. Redeploy **api** and **admin**.
5. **Verify both:**
   - `GET https://api.get-kind.com/health` → 200, and the api logs show no
     "Missing … SUPABASE_SERVICE_ROLE_KEY" / 401 from Supabase.
   - Open an admin page that loads data (e.g. Clients) → it renders, no auth error.
6. The old service-role key is invalidated by the rotation itself — once both services
   are confirmed healthy, you're done.

> ⚠️ If you update only one of the two services, the other will throw
> `Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY` on boot and stay down.

---

## After rotation
- Tick the incident register in `it-security-pack.md` from "pending" → "rotated (date)".
- Confirm nothing else broke: signup, a FIGSY send, an admin demo login.
- The exposed values are now dead — even though they appeared in chat history, they
  no longer authenticate anything.
