# RLS AUDIT — a verdict per table  ·  #554

> **Read 27 Jul 2026.** Every row-level-security statement in the repository read end to end:
> **151 policies across 39 SQL files.** The inventory row said *"seven migration files touch
> row-level security"* — the surface is **five times** what the row claimed, which is the
> first finding.

---

## ⚠️ What this document is, and what it is NOT

This is a verdict on **what the repository says**. It is not, and cannot be, a verdict on
production.

There are **three separate migration directories** — `supabase/migrations/`,
`packages/db/src/migrations/`, `apps/api/src/migrations/` — plus two whole-schema snapshots
> **✅ 31 Jul (#273): the three directories are now ONE — `supabase/migrations/`.** The other two are tombstoned (kept, not deleted). File paths in this doc point at the canonical home; the two-snapshot problem is unchanged and lives in [`SCHEMA-DRIFT.md`](./SCHEMA-DRIFT.md).
(`supabase/MASTER_SCHEMA.sql`, `supabase/staging-schema.sql`) that disagree with each other
and with both. **#558 is the standing finding that the repo no longer describes the live
database**: `subscriptions.status` is an enum in production and a `text`+CHECK in
`schema.sql`; `figsy_campaigns.copilot_mode` was absent from production while the schema
checklist showed twelve green rows.

A security audit that reports what a file says is worth nothing. So this document ships with
a **live checker**:

```
Vida → Engine → RLS audit          (GET /operator/rls-audit)
```

It reads `pg_policies` and `pg_class.relrowsecurity` **out of production** and applies the
same classification. It is read-only — two `SELECT`s against `pg_catalog`. **Where this
document and that endpoint disagree, the endpoint is right.**

---

## The two Postgres rules that produced every finding here

**① A policy with no `TO` clause applies to `PUBLIC`.** Every role — including `anon`, which
is what the public Supabase key authenticates as, and which ships in the browser bundle. So:

```sql
CREATE POLICY "Service role bypass" ON public.lead_enrichment FOR ALL USING (true);
```

restricts **nothing** to the service role. **The name is the trap** — a reviewer reads the
name and not the missing clause.

**② Permissive policies combine with `OR`.** One `USING (true)` makes every careful
`client_id = current_client_id()` policy on the same table irrelevant. **The weakest policy
on a table IS the policy.**

#350 found exactly one instance of ① — `visitor_sessions.admin_read_visits`, a `{public}`
`SELECT USING (true)` over visitor IPs and enrichment, **confirmed in production** — dropped
it, and **nobody swept for the pattern.** This audit is that sweep.

---

## ✅ RUN AGAINST PRODUCTION — 27 Jul 2026, 11:12 (`aws-0-eu-west-1.pooler`)

**The live audit returned three tables, and NONE of the five predicted below.** That is not a
footnote — it is the finding, and it is the reason this endpoint exists. The file-based
verdict was wrong in **both** directions: it named five tables that are fine, and it missed
the most sensitive table in the product.

| Table | Live verdict | Why the files could not show it |
|---|---|---|
| **`client_inboxes`** | 🔴 **RLS OFF, no policies** | **No file anywhere in the repo enables RLS on it.** `20260725_client_inboxes` created the table and simply never included the line, so there was nothing to read. |
| `app_migrations_applied` | 🔴 RLS OFF | Created as a *side effect* of `20260724_one_wallet.sql` via `CREATE TABLE IF NOT EXISTS` — it never passed through a review that would have asked. |
| `agreement_templates` | 🔴 EXPOSED — `agreement_templates_admin_write` | **That policy exists only in production.** The repo has never contained it; it knows only `agreement_templates_read`. Someone created it by hand. |

### `client_inboxes` is the one that matters

It holds **`smtp_pass_enc`, `smtp_host`, `smtp_user` and `email`** — how we log in to send as
each client. With RLS off, anyone holding the **public anon key** could read every client's
mailbox configuration. The passwords are AES-256-GCM ciphertext (`lib/inbox-secret.ts`), so
this was never plaintext credentials — but the hosts, usernames and addresses are plain, and
ciphertext should not have been fetchable either.

**Closed by `20260727_rls_live_findings`.** Safe because nothing in a browser touches any of
the three: every path is server-side on the service-role key, which bypasses RLS.

> **`agreement_templates_admin_write` is #558 pointing the other way.** The standing finding
> has been *"the repo describes tables production does not have."* This is the reverse:
> **production carries a policy no file can show you.** Any audit that reads only the repo is
> blind to it — which is the case for every security review this project has ever done.

---

## 🔴 The finding: five more tables of the same shape

⚠️ **The 27 Jul live run found NONE of these exposed** — see the section above. They were
either dropped by hand or the tables never existed in production. The list is kept because the
remediation is harmless and idempotent, and because the SHAPE is what matters. Each was
created by a migration **in the production path** and is dropped **nowhere** in that path. The only `DROP POLICY` statements for them live in `supabase/staging-schema.sql`, which
is a **staging** snapshot. So unless someone removed them by hand, they are live right now.

| Table | Created by | What it holds |
|---|---|---|
| `lead_enrichment` | `supabase/migrations/20260527_lead_enrichment.sql` | **enrichment data on real people** — the closest thing here to `visitor_sessions` |
| `partner_commissions` | `supabase/migrations/005_partners.sql` | **what each partner is owed** |
| `partner_referrals` | `supabase/migrations/005_partners.sql` | who referred whom |
| `partners` | `supabase/migrations/005_partners.sql` | partner names and emails |
| `figsy_calls` | `supabase/migrations/006_voice_calls.sql` | call records |
| `webhook_triggers` | `supabase/MASTER_SCHEMA.sql` | *(snapshot only — may never have been applied)* |

**Closed by `20260727_rls_close_public_policies`** (idempotent; run from Vida → Engine).

**Why dropping them is safe.** Dropping a *permissive* policy only ever **removes** access.
The API talks to Postgres with the **service-role key, which bypasses RLS entirely**, so
nothing the product does is affected. And no browser code reads any of these tables directly
— verified by reading every `.from('…')` call in the portal, website and admin apps. After
the drop, RLS stays **on** with no permissive policy: anon and authenticated get nothing.

**Nothing is deleted.** Those statements remove *policy definitions* — not a row of data, not
a column, not a table.

---

## Verdict per table

`browser?` marks the 13 tables that front-end code queries directly with the public key.
Those are the only tables that legitimately need a browser-facing policy at all; anywhere
else, a browser-facing policy is surface area with no purpose.

| Table | Verdict | browser? | Finding |
|---|---|---|---|
| `african_data_moat` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `agent_signals` | 🟢 scoped | — | 2 policies, each conditioned on the caller. |
| `calendar_bookings` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `client_members` | 🟢 scoped | — | 4 policies, each conditioned on the caller. |
| `client_messages` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `clients` | 🟢 deny-all | **yes** | RLS on, no policy → service role only. ⚠️ browser reads this table directly. |
| `companies` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `contact_requests` | 🟢 scoped | — | 2 policies, each conditioned on the caller. |
| `credit_transactions` | 🟢 scoped | **yes** | 1 policy, each conditioned on the caller. |
| `cron_claims` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `deal_registrations` | 🟢 scoped | — | 3 policies, each conditioned on the caller. |
| `denise_drafts` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `developer_keys` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `figsy_approval_queue` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `figsy_calls` | 🔴 **EXPOSED** | — | `Service role bypass` — `USING (true)`, no `TO` clause → **PUBLIC**. Created by `006_voice_calls.sql`. |
| `figsy_campaigns` | 🟢 scoped | **yes** | 2 policies, each conditioned on the caller. |
| `figsy_chat_messages` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `figsy_enrollments` | 🟢 scoped | **yes** | 2 policies, each conditioned on the caller. |
| `figsy_linkedin_queue` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `figsy_memory` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `figsy_replies` | 🟢 scoped | **yes** | 2 policies, each conditioned on the caller. |
| `figsy_sent_emails` | 🟢 scoped | **yes** | 2 policies, each conditioned on the caller. |
| `figsy_sequences` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `figsy_tasks` | 🟢 scoped | — | 3 policies, each conditioned on the caller. |
| `founder_agent_logs` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `icp_run_outcomes` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `icps` | 🟢 deny-all | **yes** | RLS on, no policy → service role only. ⚠️ browser reads this table directly. |
| `lead_enrichment` | 🔴 **EXPOSED** | — | `Service role bypass` — `USING (true)`, no `TO` clause → **PUBLIC**. Created by `20260527_lead_enrichment.sql`. |
| `milla_chunks` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `milla_documents` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `milla_messages` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `milla_sessions` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `nexus_profiles` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `outcome_events` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `partner_applications` | 🟢 scoped | — | 2 policies, each conditioned on the caller. |
| `partner_commissions` | 🔴 **EXPOSED** | — | `Service role bypass` — `USING (true)`, no `TO` clause → **PUBLIC**. Created by `005_partners.sql`. |
| `partner_referrals` | 🔴 **EXPOSED** | — | `Service role bypass` — `USING (true)`, no `TO` clause → **PUBLIC**. Created by `005_partners.sql`. |
| `partners` | 🔴 **EXPOSED** | — | `Service role bypass` — `USING (true)`, no `TO` clause → **PUBLIC**. Created by `005_partners.sql`. |
| `platform_status` | 🟢 scoped | **yes** | 1 policy, each conditioned on the caller. |
| `processed_webhook_events` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `product_waitlist` | 🟢 scoped | — | 2 policies, each conditioned on the caller. |
| `proposals` | 🟢 scoped | **yes** | 1 policy, each conditioned on the caller. |
| `push_subscriptions` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `seat_credit_requests` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `vida_configs` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `vida_messages` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `vida_sessions` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `visitor_sessions` | 🟢 scoped | — | 1 policy, each conditioned on the caller. |
| `webhook_endpoints` | 🟢 deny-all | — | RLS on, no policy → service role only. |
| `winning_plays` | 🟢 deny-all | — | RLS on, no policy → service role only. |

---

## How to read `🟢 deny-all`

**RLS on with no policy is the strongest configuration, not a gap.** The service role
bypasses RLS, so the API is unaffected; everyone else gets nothing. It is the correct setting
for every table only the API touches, and it is why the newest tables (`cron_claims`,
`icp_run_outcomes`, `nexus_profiles`) ship that way deliberately.

The one case where it is wrong is a table the **browser** reads directly — there, deny-all
means real users silently get an empty list. Those rows are marked ⚠️ above.

---

## Standing rule for any new policy

1. **Always write `TO`.** A policy without it is public. If it is for the API, the answer is
   almost always *no policy at all* — the service role does not need one.
2. **Never `USING (true)` on a permissive policy** that a browser role can reach.
3. **RLS is defence in depth, not the guard.** The API holds the service-role key, so
   application-level ownership checks remain the primary boundary (#261). RLS is what stops
   somebody with the public key going around the API entirely.
4. **Check it live, not in the repo.** `Vida → Engine → RLS audit`.

## Still open

- **`#55a` rep-level isolation** — this audit covers client-level isolation. Whether one rep
  inside a client can see another rep's rows is a separate question and is not answered here.
- **`webhook_triggers`** exists only in a schema snapshot; whether the table is even present
  in production is unknown until the live check is run.
