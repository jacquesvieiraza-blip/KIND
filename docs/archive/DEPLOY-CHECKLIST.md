# K.I.N.D — Deploy Checklist (🔨 BUILT → ✅ LIVE)

**Goal:** take branch `claude/kind-carson-MYhSl` from "built on branch" to "verified live" **safely**, in the right order. This is the one un-rehearsed step before launch — follow it top to bottom.

> **ORDER MATTERS:** migrations **before** code · env vars **before** merge · post-deploy smoke **before** declaring anything ✅.
> 🧍 = founder action · 🤖 = Claude does it (on your go).

---

## 0 · PRE-DEPLOY (do BEFORE merging to main)

### A. Run migrations 🧍 — Supabase → SQL Editor (in order; all additive + idempotent)
Run any not yet applied. **The new code reads these columns — deploy code before they exist and signer/cap/settings break.**
- [ ] `010_crm_dedup.sql`
- [ ] `011_denise.sql` *(if not already run)*
- [ ] `012_signer_and_booking.sql` — adds `clients.signer_name` (+ `booking_url`). **Without it, `PATCH /clients/me` breaks if the portal ever sends `signer_name`.**
- [ ] `013_nullable_sent_email_refs.sql` — lets day-1 sends record → unblocks the warmup cap counting them.

### B. Railway env vars 🧍
**API service:**
- [x] `FIGSY_COLD_FROM` = `K.I.N.D <hello@gettingkind.com>` *(set 8 Jun)*
- [x] `FIGSY_COLD_REPLY_TO` = `hello@gettingkind.com` *(set 8 Jun)*
- [x] `FIGSY_WARMUP_START` = `2026-06-09` *(set 8 Jun)*
- [ ] `ADMIN_SECRET_KEY` set — **CRITICAL: the admin proxy now requires it** (we removed the insecure `NEXT_PUBLIC_ADMIN_KEY` fallback). If unset, admin breaks.
- [ ] `RESEND_API_KEY` · `RESEND_WEBHOOK_SECRET` · `ANTHROPIC_API_KEY` · `SUPABASE_URL` · `SUPABASE_SERVICE_ROLE_KEY` set
- [ ] `STRIPE_PRICE_DENISE_MONTHLY` (needed for billing test T5)
- [ ] `TRACKING_URL` = `https://api.get-kind.com` — **only once that DNS resolves.** Until then leave UNSET (open-tracking just stays off — fine, not a blocker).

**Admin service:**
- [ ] `ADMIN_SECRET_KEY` set
- [ ] **DELETE any `NEXT_PUBLIC_ADMIN_KEY`** variable — it shipped the admin secret into the browser bundle.

**Portal service:**
- [ ] `NEXT_PUBLIC_API_URL` · `NEXT_PUBLIC_SUPABASE_URL` · `NEXT_PUBLIC_SUPABASE_ANON_KEY` · the `NEXT_PUBLIC_STRIPE_PRICE_*` IDs

### C. DNS 🧍 *(if not done)*
- [ ] `app` / `api` / `admin` / `status`.get-kind.com → Railway CNAMEs · Resend inbound webhook → API

---

## 1 · MERGE + DEPLOY
- [ ] 🤖 **On your go**, merge `claude/kind-carson-MYhSl` → `main` (clean fast-forward — verified, zero conflicts).
- [ ] Railway auto-deploys api / admin / portal from `main`.
- [ ] 🧍 Watch API deploy logs → startup prints **`KIND API build: <sha>`** matching `main` HEAD (the new dynamic build marker = proof the live build is current, not stale).

---

## 2 · POST-DEPLOY SMOKE (~5 min — before the full T1–T7)
Fast "did the deploy itself work" checks:
- [ ] API `/health` (or root) returns OK.
- [ ] `app.get-kind.com` loads + **login works** (proves portal env + auth).
- [ ] **Admin portal loads** + a data page renders (proves admin `ADMIN_SECRET_KEY` wired after the fallback removal).
- [ ] **Settings → save** works (proves migration 012 ran — if `signer_name` column is missing, the save 500s).
- [ ] Send one test cold email (admin send-due, or warmup Broadcast) → arrives, **not in spam**, has the unsubscribe footer.

---

## 3 · FULL VERIFICATION
- [ ] Run **`docs/SMOKE_TEST.md`** T1–T7 (incl. the new **Deliverability (D1–D5)** section) → all green.
- [ ] Run **`npm test`** in `apps/api` → 16/16 green (sanity that the build matches tested logic).
- [ ] Inbox-placement test (mail-tester / GlockApps) on the cold domain → aim 10/10 (D9).

**Only when 0–3 are all green is any of this 🔨 → ✅.**

---

## 4 · ROLLBACK PLAN (if it goes sideways)
- **Fastest:** Railway → the service → **Deployments → redeploy the previous good deployment** (near-instant; no code needed).
- Migrations are **additive** (new nullable columns) — safe to leave in place on rollback; they don't break old code.
- The branch is the source of truth; `main` can be reset to the prior commit if a merge needs undoing (🤖).
- If only ONE service is broken, roll back just that service — the others can stay.

---

## Quick reference — what this deploy turns on
| Built this sprint | Activated by |
|-------------------|--------------|
| D1–D5 deliverability (cold-FROM, List-Unsubscribe, plain-text, tracking guard) | env vars (set) + merge |
| Warmup cap + auto-ramp | `FIGSY_WARMUP_START` (set) + merge |
| Day-1 cap fix | migration 013 + merge |
| P-a signer | migration 012 + merge (portal field still TODO) |
| Admin security fixes | merge + admin env (`ADMIN_SECRET_KEY`, drop `NEXT_PUBLIC_ADMIN_KEY`) |
