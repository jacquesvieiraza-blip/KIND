# SEED-DATA WIPE — the plan · #329

> **Nothing in this plan runs without the founder's explicit go.** The default of every path
> is to *report*. Execution needs two independent keys and expires the same day.

---

## The headline: most of this item is already done, and not by deleting anything

#329 was logged **7 Jul**. Its stated purpose is *"so Finance/Sales/GTM read the real first
client cleanly."*

Since then **#543 (demo exclusion)** and **#453 (demo mode)** were built. The money surfaces
already strip demo and house accounts through `getClientExclusions()` — applied in
`internal-briefs.ts`, `money-path.ts` and `internal.ts`. And the item's *"zero sample
`deal_registrations`"* describes rows that **do not exist**: that table has exactly one
writer (`routes/partners.ts`) and no seeder at all.

**Exclusion is strictly better than deletion here.** It is reversible, it cannot destroy
something that turns out to have been real, and it keeps the demo account working.

So the plan is deliberately unambitious:

1. **Report first.** Read production, classify every client, show what would be touched.
2. **Delete almost nothing.**
3. **Anything still leaking demo data into a real figure is a MISSING EXCLUSION to fix, not
   rows to destroy.**

## And `NOTHING GETS DELETED` is founder-locked

Locked **26 Jul** — after this item was written. The two are reconciled by the founder's own
Prompt 6 clause: *"plan + script, executed only on my go."*

Hence: report by default, and an arming step that cannot be reached by accident.

---

## What survives, and why

Classification lives in `apps/api/src/lib/seed-wipe.ts` and is unit-tested. Four protections,
checked **in this order** — the order is the safety property:

| # | Protected | Why it outranks what follows |
|---|---|---|
| **1** | **Any client with a real payment** | A Stripe-referenced ledger row is a **fact**; `is_demo` is a **human's opinion**. When they disagree on a destructive path, the fact must win. A paying client is protected *even if flagged demo, even if named `TEST DELETE ME`*. |
| **2** | **Any client holding leads with real email addresses** | Someone has worked that desk. Onboarded and sourced but not yet billed is still a live prospect list. |
| **3** | **The house account** (founder's own login) | Already excluded from every revenue figure. Deleting it takes the founder's own test history with it. |
| **4** | **The demo account** (`is_demo = true`) | **MBF is how the product is sold.** A wipe "at go-live" taken literally deletes the sales tool on the day it is most needed. `demo-mbf.ts` rebuilds it to a fixed cast on demand, so there is nothing here worth destroying. |

**The demo is identified by the FLAG, never by the name.** Name matching has bitten this
codebase twice — `MBF Holdings` vs the live `MBF Demo` (#584/#582). A name is a label a human
edits; on a destructive path, matching one deletes the wrong account.

**Eligible** = no real payments, no real leads, not the demo, not the house account.

---

## The arming gate

⛓️ **23 Sep (checked against main `83e9c1b`):** **this gate is not wired.** `armingCheck` (`apps/api/src/lib/seed-wipe.ts:138`) has no caller and no code reads `SEED_WIPE_ARMED` (it is absent from the env sweep). The delete that exists is **`POST /operator/seed-data/wipe-client`** (`apps/api/src/routes/operator.ts:7692`) — **one client at a time**, refused unless ① the `seed-wipe.ts` classification allows it (real payment, then real leads outrank every label), ② it is not the house account (by id), ③ it is not an `is_demo` row (by id), and ④ the operator types that **client's company name** (not the phrase below). The Engine page copy that still names `SEED_WIPE_ARMED` is out of date. ~~Execution is impossible unless **both** are true:~~

1. `SEED_WIPE_ARMED` is set on `@kind/api` to **today's UTC date** (e.g. `2026-08-14`), and
2. the phrase **`WIPE THE SEED DATA`** is typed exactly.

**The date is the point.** `SEED_WIPE_ARMED=1` would sit in Railway forever and become a
loaded gun any later deploy could pull. `FOUNDER_FLIP=1` is fine for a reversible dot; this
is not reversible, so **it expires at midnight UTC**. A stale value cannot fire.

---

## Runbook — the day of the first real client

**Step 0 — do nothing yet.** Onboard them first. Confirm their desk works. The wipe is
cleanup, never a prerequisite.

**Step 1 — read the report.** `Vida → Engine → Seed data`. Read-only, safe at any time. It
lists every client with its disposition and the reason.

**Step 2 — read every `eligible` row by name.** This is the only real check in the process.
If a single row looks like something you recognise, **stop** — the classification is wrong
and that is a bug to fix, not a judgement call to override.

**Step 3 — if it says `clean`, you are finished.** Most likely outcome. Nothing to run.

**Step 4 — only if there is genuine residue:** ⛓️ **23 Sep (checked against main `83e9c1b`):** press delete on that one row in `Vida → Engine → Seed data` and type its company name (see the gate note above). ~~set `SEED_WIPE_ARMED` to today's UTC date in
Railway, type the confirmation, run it. **Remove the variable immediately afterwards.**~~

**Step 5 — re-read the report** to confirm the result, then run `Vida → System → Run full
check` to confirm nothing else moved.

---

## What the script will never do

- Touch a client with a real payment or real leads — **at any arming level**.
- Delete the demo or the house account.
- Drop a table, a column, or a policy.
- Run because an environment variable was left set.
- Run without a report having been produced first.

## Rollback

There isn't one, which is why the gate is what it is. **Before Step 4, take a backup**
(#298 — the backup/restore drill). If the drill has not been run, do not run the wipe:
an untested restore is not a rollback plan.

---

## Open question for the founder

The report may well come back **clean**, in which case #329 closes without a single row being
deleted — the item's purpose having been met by exclusion instead.

If it does list residue, I would still rather **exclude than delete** unless you specifically
want the rows gone. Deleting buys a tidier table; excluding buys the same clean numbers and
keeps the ability to be wrong.
