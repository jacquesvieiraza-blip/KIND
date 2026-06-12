# 🏢 Company Engine (#88) — How to test on staging

> Everything below runs on the **sealed staging environment** — fake data, cannot touch production.
> The engine = each rep has their own workspace (own leads/campaigns/FIGSY), the owner funds a
> credit pool and allocates per-seat budgets, reps request more, owner approves.

---

## STEP 0 — Get the new code + tables onto staging (one-time)

**A. Merge + redeploy** (same 3 steps as always)
1. GitHub → PR **base `staging`** ← **compare `claude/kind-carson-MYhSl`** → Merge
2. Railway `heartfelt-essence` → **Deployments → ⋮ → Redeploy** (force rebuild)
3. Also redeploy **`api-staging`** the same way (the backend changed too)

**B. Apply the new tables + seed** (in the `kind-staging` Supabase SQL editor)
1. Re-paste **`supabase/staging-schema.sql`** → Run *(idempotent — adds `companies`, seat columns, `seat_credit_requests`, `winning_plays`; safe to re-run)*
2. Open **`supabase/staging-seed.sql`**, copy **from the line `-- COMPANY ENGINE SEED (#88)` to the end**, paste → Run
   *(This adds the MaceyLuxe company + 3 reps with their own data. Don't re-run the top block — it'll complain about the existing client, which is harmless.)*

**C. Make sure the flag includes `company`**
Railway `heartfelt-essence` → Variables → `NEXT_PUBLIC_FEATURE_V2_SCREENS` should contain `company` (your current value already does).

---

## STEP 1 — Open the Command Centre
Go to **`/dashboard/company`** (or click **Company** in the sidebar).

**You should see:**
- Header: **MaceyLuxe · 3 seats**, pool credits, active count, requests count
- A **leaderboard of 3 reps** (Amara, Tunde, Zola) each with **real** Contacted · Reply % · Booked + credits left
- **2 pending credit requests** waiting for you

✅ *This proves per-rep workspaces work — each rep's numbers come from their own leads/campaigns, not sample data.*

---

## STEP 2 — Approve / deny a credit request
On the Command Centre tab, in **Pending credit requests**:
- Click **Approve** on one → the rep's budget goes up, the pool goes down, the request disappears
- Click **Deny** on the other → it's dismissed, no credits move

✅ *This is the core "owner controls the purse" loop.*

---

## STEP 3 — Fund the pool (staging test button)
Go to the **Usage & Budget** tab → click the amber **🧪 Staging: add 10,000 test credits to pool**.
- Pool jumps by 10,000. *(In production this comes from a real Stripe payment — the test button only exists on staging.)*

---

## STEP 4 — Manage a seat
Go to the **Seats** tab:
- Toggle a rep between **Auto-pilot** and **Co-pilot** → saves instantly
- See each rep's budget bar

---

## STEP 5 — Invite a new rep (the onboarding flow)
Still on the **Seats** tab → **Add a rep**:
1. Enter an email (e.g. `newrep@maceyluxe.test`) + a budget → **Invite**
2. You'll get a **copyable invite link**
3. The new rep now shows as a seat with **"Invite pending"**

**To test the rep accepting (optional, full loop):**
1. Create that email as a user in the `kind-staging` Supabase → Authentication → Add user (Auto-confirm)
2. Open the invite link → log in as that rep → it attaches their login to the seat
3. They land in **their own workspace** (their own leads/campaigns), funded by the budget you set

✅ *This is the real "each rep from start to finish" path.*

---

## STEP 6 — Winning plays
**Winning Plays** tab → see the 2 seeded plays → **Push to all** → marks it shared across the company.

---

## What's REAL vs still stubbed (honest)
| Works for real on staging | Still to wire |
|---------------------------|----------------|
| Per-rep workspaces + real per-rep stats | Real Stripe billing → pool (staging uses the test button) |
| Pool → per-seat budget allocation | Per-rep automated lead routing from a shared pool (each rep currently sources their own) |
| Request → approve/deny loop | Per-rep calendars |
| Invite → accept → own workspace | Email delivery of the invite link (you copy/paste it for now) |
| Autonomy (auto/co-pilot) per seat | |
| Winning-play library + push | |

---

## If something looks wrong
Tell me the screen + what you saw vs expected — I'll log it in `STAGING-REVIEW.md` and fix. The whole
section is judged **fresh**: tell me what you like and don't about the flow and the design.
