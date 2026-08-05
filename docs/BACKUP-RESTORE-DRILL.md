# BACKUP–RESTORE DRILL — the plan · #298

> **Status, stated plainly: a restore has never been tested, and cannot be fully tested
> today.** This document says why, what has been built instead, and exactly what to do the
> moment the blocker lifts. It does not pretend the drill has been done.

---

## The blocker

A restore drill is three steps: **take a backup → restore it somewhere → prove the result
matches.**

The middle step was impossible when this was written. **⚠️ CORRECTED 6 Aug (#628) — the
dashboard is REACHABLE again.** The founder got in on 5 Aug by an alternate login, bypassing the
GitHub OAuth path that the flagged account blocks (*"cannot authorize a third party
application"*). The original text said the dashboard was unreachable full stop, which stopped
being true and would have kept this drill parked for a reason that had gone away.

**What that changes, and what it does not.** Browsing the backups Supabase takes, triggering a
point-in-time restore and creating the second project to restore *into* are all **dashboard
actions, so they are now possible** — the drill is unblocked and owed. What has **not** changed:
there is still no `psql`, no `pg_dump`, and by standing decision no new local tooling, so the
*verification* half below still has to be done through the product's own read paths rather than
at a shell. This remains a 🧍 job end to end; nothing here is automatable from this container.

Writing a runbook full of dashboard clicks nobody can perform would be the exact class of
document this project keeps catching: something that reads as done and cannot be executed.

**So this plan does not claim the drill is done. It is not.**

---

## What was missing anyway — and is now built

Here is the thing worth noticing: **even if the dashboard opened tomorrow, the drill still
could not have been done properly**, because nobody knows what *"restored correctly"* looks
like.

You press restore. The dashboard says success. And you have **no way to tell whether you got
everything, half of it, or last week's copy.**

**The comparison is the drill. The button is not.**

So: **`Vida → Engine → Backup manifest`** takes a snapshot of every table in `public` and its
**exact row count**, from `pg_catalog`, right now. Take one today. Take another after any
restore. Compare. That comparison is the only thing that ever proves a restore worked, and it
was missing regardless of the dashboard.

Two deliberate choices in it:

- **A real `COUNT(*)`, not `reltuples`.** The planner's estimate is only as fresh as the last
  `ANALYZE` and can be wrong by thousands on a table that has just been bulk-loaded — which
  is precisely the state a restored database is in. **An estimate would make a broken restore
  look fine**, the one outcome this exercise exists to prevent.
- **No data, only counts.** A dump-everything endpoint would be a single URL that exfiltrates
  the whole customer database — including `client_inboxes`, which #554b just found with **no
  row-level security at all**. Counts prove completeness without moving one personal detail.

And the comparison is **exact — no tolerance**. A restore that lands 99% of
`credit_transactions` has lost somebody's money; a percentage threshold would hide it.

---

## What to do now (5 minutes, today)

1. **`Vida → Engine → Backup manifest`.**
2. **Save the JSON somewhere that is not this system** — your laptop, Drive, an email to
   yourself. A manifest stored only in the database it describes is worthless in the exact
   situation it exists for.
3. **Repeat monthly.** A manifest older than 30 days describes a database that has moved on;
   comparing against it shows differences that mean nothing and hides the ones that do. The
   report tells you when it has gone stale.

That is the whole interim mitigation. It does not prove a restore works. It makes proving it
possible the day you can try.

---

## The drill itself — for the day Supabase access returns

**Do not skip step 0.**

**0. Take a fresh manifest and save it off-system.** This is the reference. Without it the
   rest of the drill proves nothing.

**1. Confirm backups actually exist.** Supabase → Database → Backups. Note the most recent
   one and its age. *If there are none, stop — everything below is moot and that is the
   emergency.*

**2. Restore into a SECOND project, never over production.** Create a new Supabase project
   and restore the backup there. Restoring over production to "test" it is not a drill; it is
   the incident.

**3. Point a throwaway environment at the restored database.** Set `DATABASE_URL` and the
   Supabase keys on a **preview** deployment — never on `@kind/api`.

**4. Take a manifest from the restored database and compare it to step 0's.**
   `Vida → Engine → Backup manifest` on the preview. Every table, every count.

**5. Read the differences, money first.** The comparison sorts `clients`,
   `credit_transactions`, `leads`, `subscriptions`, `client_inboxes`, `opt_out_blocklist`
   above everything else. `opt_out_blocklist` matters more than it looks: losing it means
   emailing people who told us to stop.

**6. Spot-check three things by hand**, because counts can match while content is wrong:
   - a known client's `wallet_balance_usd` is the number you expect;
   - a known lead's email address is intact and not `.invalid`;
   - `client_inboxes.smtp_pass_enc` decrypts with the live `INBOX_SECRET_KEY`. **If it does
     not, the restore is useless** — the mailbox rows exist and nothing can send. This is the
     single most likely silent failure, because the ciphertext restores perfectly whether or
     not the key still matches it.

**7. Write down the time it took, end to end.** That number is your real recovery time. Until
   it is measured it is a guess, and it is the number that decides whether an outage is an
   afternoon or a company.

**8. Delete the second project.** Note this is the one deletion in this document, it is of a
   throwaway you just created, and it should happen the same day — a forgotten copy of the
   entire customer database is its own incident.

---

## What is NOT proven, and I am not going to imply otherwise

- **That Supabase's backups exist or are recent.** Nobody has looked. The dashboard is shut.
- **That a restore completes.** Never attempted.
- **How long recovery takes.** Unmeasured, therefore unknown.
- **That the restored data is usable** — specifically the `INBOX_SECRET_KEY` question in
  step 6, which has never been tested against a restored row.

The honest current position: **we rely on Supabase's automated backups, which we have never
seen, verified, or restored from.** That is a real exposure, it is exactly what #298 was
raised to name, and it stays open until the dashboard is reachable.

## The one thing that would move this fastest

**Getting back into Supabase.** The GitHub flag blocks the dashboard, and the dashboard
blocks the drill, the RLS remediation history, the password rotation, and every migration
that has to run through Vida instead. It is one blocker sitting underneath a lot of items.

If GitHub support is a dead end, a fresh Supabase account with the project transferred to it
is the other route — worth a conversation before the first paying client, not after.
