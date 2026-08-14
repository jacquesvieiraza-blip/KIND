# 🔑 UNLOCK-DAY RUNBOOK — the day a client is in the works

> **Open this the day a client is in the works — BEFORE they pay, not after.** That timing is the ruling, not a preference: **R25** (12 Aug) — *"day 1 a client needs to use the system. full stop. so whatever is needed to unlock the smartlead connection is needed."* Buying on the day a client is *in the works* means month one can send at all, and buying no earlier means nothing leaks pre-revenue (R7 intact).
>
> **Two purchases, one key, four checks. Roughly 30 minutes, most of it waiting for a signup form.**
>
> Nothing in this runbook is automatic. Every step is yours, in order, and each one has a way of failing that this page names before it happens.

---

## Before you start — what is already true

The code side was built and red-proved on **13 Aug**, while the key still 401d. That means **nothing needs deploying on unlock day.** Specifically, these already exist and are wired:

| Already built | Where |
|---|---|
| Month-one leads pushed to Smartlead at approval | `smartlead-send.ts`, called from `approve-lead.ts` |
| Every push fails **closed** — no key, kill-switch off, demo, house account, no mailbox, no address | `smartlead-map.ts` |
| A pooled pre-warmed box assigned to a client | Vida → the client → assign inbox |
| The client's own branded box, warming ~14 days | Vida → the client → brand inbox |
| **The ~day-29 switch** — branded-and-active outranks pooled, automatically | `sending-inbox.ts`, data-driven, no deploy |
| **The backfill** for leads approved before the key existed | Vida → the client → Smartlead backfill |

---

## Step 1 · Buy Smartlead — **the tier WITH API access**

⚠️ **This is the step that has already failed once.** A Smartlead key existed and returned **401**. A 401 with a key set is almost never a typo — **it is the plan tier**. API access is a paid tier, and the cheaper tiers accept a key that can never work.

- Buy the tier that lists **API access** on the plan comparison. If the pricing page is ambiguous, ask their support *"does this tier include API access for adding leads and creating campaigns?"* before paying.
- Expect roughly **$94/mo** (the figure the money model carries as the client-triggered Smartlead line).

**How you'll know it went wrong:** you set the key, and the System page says *"Smartlead refused the key (HTTP 401)"*. That row now tells you plainly it is the plan, not the key — do not spend an hour re-copying a correct key.

## Step 2 · Put the key in Railway

- **Railway → `@kind/api` → Variables → `SMARTLEAD_API_KEY`** = the key from Smartlead → Settings → API.
- Railway redeploys the API by itself when a variable changes. Wait for it to finish before Step 4.

⚠️ **Do not paste the key anywhere else** — not into this repo, not into a chat, not into Vida. Railway is the only home for it.

## Step 3 · Buy the PDL tier — **$98/mo**

**R26** (12 Aug), same trigger, same day: *"a new client's pack sources 200 names on day 1, which no free key covers."*

- Buy the **$98/mo tier** (~350 names) on the PDL dashboard.
- Nothing to paste — the existing `PDL_API_KEY` keeps working; the tier is what changes.
- The **A17 spend cap** already fences this at $100/mo, so the tier cannot run away on its own.

## Step 4 · Check the System page — **in this order**

**Vida → System.** Read these four rows, top to bottom. The order matters: a later row can look wrong purely because an earlier one is.

| # | Row | What you want | What a failure means |
|---|---|---|---|
| 1 | **Smartlead (CLIENT sending)** | *"Key is live and Smartlead answered — month-one client sending can run."* | **401/403** → the plan tier, not the key (Step 1). Any other code → check the key in Smartlead → Settings → API |
| 2 | **PDL (sourcing)** | Key is set. **It will say it did not call PDL** — that is correct, this page never spends to prove a key works | A missing key here is a real fault; a "not called" is the page being honest |
| 3 | **PDL tier (R26 — unlock day)** | It will say the tier **cannot be established without a billable request**, and repeat the cap | This row can never go green by itself. **Confirm the tier on the PDL dashboard** — the page will not spend to find out |
| 4 | **Database → the 13 function rows** | 12 **Present**, `record_reveal_or_refund` **NOT MEASURED** | Any **MISSING** row is a real find — run migrations from Vida → Engine, then re-read |

## Step 5 · The client's mailboxes

1. **Assign the pooled pre-warmed box** — Vida → the client → assign inbox. They can send from day 1 on this.
   - *If it refuses with "already has a live pooled mailbox", that is the guard working: release the old one first. Two pooled boxes means two senders and no rule for which one sends.*
2. **Record their own branded box** — Vida → the client → brand inbox. It starts warming and is marked ready in **~14 days**.
3. **Do nothing about the switch.** At ~day 29, once the branded box is `active`, it outranks the pooled one automatically. Then release the pooled box so it returns to the pool.

⚠️ **A warming mailbox must never send** — sending on it is what un-warms it. The picker already refuses; do not override it.

## Step 6 · The backfill — **the step it is easiest to forget**

**Vida → the client → Smartlead backfill.**

Every lead the client approved **before** the key went live was charged, revealed and enrolled — but never handed to Smartlead, because there was no key to hand it to. Nothing replays that on its own.

- Run the backfill **once**, after Step 4's row 1 is green.
- Read the summary. **"0 of 40 pushed" is not success** — it says so in those words, and the per-lead reasons say why.
- If it reports *"AUTO_OUTREACH_ENABLED is off"*, that is correct and expected until send-day. Run it again after the switch is on.

---

## The one thing that is still off

**`AUTO_OUTREACH_ENABLED` stays off until send-day.** Everything above can be true — plan bought, key live, mailboxes assigned, tier active — and **nothing will send**, by design. That switch is separate, and it is the last one.

---

## If you only remember five lines

1. Buy the Smartlead tier **with API access** — a 401 means the plan, not the key.
2. Key goes in **Railway → `@kind/api` → `SMARTLEAD_API_KEY`**, nowhere else.
3. Buy the **PDL $98 tier**; nothing to paste.
4. **System page**, four rows, in order.
5. **Run the backfill**, or every lead approved before today never reaches their mailbox.

