> ⚠️ **SUPERSEDED (12 Jun late, re-locked):** current plan = **MON 15: Company Command Centre + payments → production (only early ship) · FRI 19: launch · post-19: everything else.** Current truth: [`PRODUCT-INVENTORY.md`](./PRODUCT-INVENTORY.md) + [`FOUNDER-ACTIONS.md`](./FOUNDER-ACTIONS.md). This plan kept for history.

# 📌 BOOKMARK — KIND Week Plan to Live

> When the founder says **"bookmark"**, present this content (unless overridden).
> Last updated: 2026-06-12

---

## Staging isolation deliverables (built, on `claude/kind-carson-MYhSl`)

| File | What it does |
|------|-------------|
| `supabase/staging-schema.sql` | Paste once into new Supabase project → full schema in one shot |
| `supabase/staging-seed.sql` | Sign up → paste → MaceyLuxe with 50 leads, 2 campaigns, 5 replies, credits |
| `apps/portal/src/app/(dashboard)/layout.tsx` | Amber "STAGING" banner on every page when `NEXT_PUBLIC_IS_STAGING=true` |

---

## Week plan: Today → Friday live

### TODAY (Thursday 12 Jun) — Staging setup + smoke tests
**You do (30 min):**
1. Merge `claude/kind-carson-MYhSl` → `staging` branch (the only merge you do)
2. Railway: create a **new Supabase project** (free tier, call it `kind-staging`)
3. Paste `supabase/staging-schema.sql` → SQL Editor → Run
4. Sign up at your staging URL → creates your auth user
5. Paste `supabase/staging-seed.sql` → SQL Editor → Run
6. Railway staging service → Variables, add:
```
NEXT_PUBLIC_IS_STAGING=true
NEXT_PUBLIC_FEATURE_V2_SCREENS=all
NEXT_PUBLIC_SUPABASE_URL=<your NEW staging project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your NEW staging anon key>
SUPABASE_SERVICE_ROLE_KEY=<your NEW staging service role key>
```
**Result:** Sealed-off staging world. Log in, see "STAGING" banner, MaceyLuxe with 50 leads + 2 campaigns. Every new page linked in sidebar. Nothing touches production.
**Claude does:** Smoke tests T3-T7 — fix anything that breaks same-day.

### FRIDAY 13 Jun — Smoke tests T8-T10 + cosmetic batch
**You:** Run T8 (credit purchase), T9 (consent email), T10 (FIGSY sequence send) on staging.
**Claude:** Fix T8-T10 bugs. Ship cosmetic batch (7 UI polish items from B0b list).

### SATURDAY 14 Jun — Rest / optional review
Founder reviews staged pages at leisure. No builds. Flag anything to change.

### MONDAY 16 Jun — Next staging queue (Q1-Q5 quick wins)
**Claude builds:** Q1 Templates page · Q2 What's New page · Q3 Notetaker page · Q4 Sequence Builder V2 UI · Q5 Integrations page. All → feature branches → merged to `staging`.

### TUESDAY 17 Jun — Medium builds (M1-M3)
**Claude builds:** M1 Company Command Centre wired to real staging DB · M2 Team management (invite reps, roles) · M3 Developer keys page.

### WEDNESDAY 18 Jun — Go/No-Go gate + D9 deliverability
**You:** Full Go/No-Go review on staging. All 29 V2 screens live + clickable.
**Claude:** D9 deliverability audit (SPF/DKIM/DMARC, warm-up status).
**Decision:** Green-light launch or one more week.

### THURSDAY 19 Jun — Legal pack + pre-launch
**Claude:** Legal pack #10-14 (T&C, privacy policy, POPIA notice).
**You:** Final merge decision — `staging` → `main` if Go/No-Go passed.

### FRIDAY 20 Jun — LIVE (if green-lit Thursday)
Production deploy. Real clients see new dashboard. 24h monitoring.

---

**Immediate next action:** Merge `claude/kind-carson-MYhSl` → `staging`, then do the 6 Railway variable changes above. That's everything for a sealed staging environment today.

---

## Safety rules (always in force)
- None of this goes live until founder approves and merges.
- Founder does the merges, not Claude.
- No fabricated/invented numbers anywhere.
- Do not enable V2 in production / change production default behaviour.
- Do not push to main. Do not change production Railway variables.
- Do not use the production database for staging.
