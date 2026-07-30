# 🧬 K.I.N.D — SCHEMA DRIFT (#558)

> **What the repo can PROVE about the database, and what it cannot.**
> `Last-checked: 30 Jul 2026` — derived from source by `apps/api/src/lib/schema-drift.ts`, not from memory.
> ⚠️ **Nothing here was checked against production.** The Supabase dashboard is unreachable (the flagged GitHub account) and `DATABASE_URL` is mangled (#558's own symptom), so there is no introspection to fall back on. Every claim below is a claim about the **repo**. The queries that would settle the rest are at the bottom, ready to paste into Vida → Engine.

## The finding, in one paragraph

#558 says *"the migrations no longer describe the live database"* and gives one example (the `credit_transactions` type CHECK). The example is real, and it is a symptom of something larger:

**The repo holds 126 migration files in three directories, and exactly one runner that applies twelve of them.**

| Directory | Files | Applied by |
|---|--:|---|
| `supabase/migrations` | 94 | nothing — there is **no `supabase/config.toml`**, so the Supabase CLI was never wired up |
| `apps/api/src/migrations` | 19 | nothing |
| `packages/db/src/migrations` | 13 | nothing |
| **`PENDING_MIGRATIONS`** (a TypeScript constant) | **12** | **Vida → Engine → Run migrations** — the only mechanism the product has |

The other **114 were pasted into the Supabase SQL editor by hand**, in an unrecorded order, at unrecorded times, with no record of which ones took. That is the drift. **It is not that a column is wrong — it is that nothing in the repo knows what ran**, and now the editor that did the running cannot be opened.

On top of that, **three files each claim to be the schema**: `packages/db/src/schema.sql` (10 tables), `supabase/staging-schema.sql` (54), `supabase/MASTER_SCHEMA.sql` (13, "Last updated: 2026-05-27"). The migrations create **68**; the code writes to **61**.

## The three verdicts, and why the third is not a hedge

| Verdict | Means |
|---|---|
| ✅ **agree** | every column the code writes is declared somewhere the repo can point to |
| ⚠️ **drift** | the repo contradicts **itself** — provable today, fixable today, no production access needed |
| ❓ **unknowable** | the code writes a column **nothing in the repo declares**. It may exist in production (added by hand, in the SQL editor, during the months it was reachable) or it may not — **and the difference is a live 400 on a real request** |

Writing *"agree"* where the truth is *"we cannot tell"* is the same failure as a panel showing `failed: 0` for something never counted (#576) or a screen rendering a broken query as "nothing to do" (#565). So five rows say **unknowable** and mean it.

## ⚠️ The five unknowables, worst first

### 1. `leads.source` — and I introduced one of the two writers **yesterday**

**No migration and no snapshot in this repo declares `leads.source`.** Two code paths write it:

- `lib/vida.ts:187` writes `source: 'vida_chat'` when an inbound website chat becomes a lead — live for weeks
- `lib/lead-import.ts:224` writes `source: 'csv_import'` — **#599, shipped 30 Jul**

I set that field in #599 after reading `routes/icps.ts:513`, which does write `source: 'pdl'` — **to `lead_pool`, a different table.** I read a column off the wrong table and carried it into a new write path. This sweep is what caught it.

Both writers swallow the outcome. `vida.ts` destructures `{ data: row }` with no error check, so a missing column has been returning `leadId = null` silently; the CSV import checks its insert error, so it would report the failure — but only when somebody runs an import. **If the column does not exist, the CSV import (#600's whole point for Client Zero) fails on the first real Apollo file.** Query 1 below settles it in one paste.

### 2. `whatsapp_messages` — a table nothing in the repo creates

Ten columns written by `lib/whatsapp.ts`, and **no `CREATE TABLE` anywhere** — not in 126 migrations, not in any of the three snapshots. WhatsApp is parked (`WHATSAPP_TOKEN` is optional, #561), so nothing depends on it today. It is here because it is the clearest possible illustration: **a table the product writes to that the repo has never described.**

### 3. `opt_out_blocklist.whatsapp_number` — on the table every send checks

The table is declared in `schema.sql` and `staging-schema.sql` and **created by no migration**; the code writes a `whatsapp_number` column neither declares. The blocklist is the suppression gate every send passes through, and #599's CSV import reads it. It demonstrably works in production (the sending panel counts bounces out of it), so **production has this table and the repo never described how it got there.**

### 4. `subscribers` — another table nothing in the repo creates

`routes/subscribe.ts:24` inserts `{ name, email, company, source }` into a `subscribers` table that no migration and no snapshot declares. It is the marketing-playbook signup, so the stakes are low — but it is the second table in this list that the product writes to and the repo has never described.

### 5. `clients.last_low_credit_email_at`

Written by the low-credit warning path; declared nowhere. Its sibling `low_credit_warned_at` **is** declared (`20260707_money_integrity.sql`), which suggests a rename that reached the code and never reached a migration. Low blast radius: a failed write means the warning email can repeat.

## ⚠️ A bug in the instrument, found while building it

Twice, the scanner that produces this page reported findings that were not real — and both times the *harmless* half was the visible one.

1. **`.from('table').insert({ a, b })` in `schema-drift.ts`'s own doc comment** was read as a table called `table`. Comments were not stripped before code writes were extracted.
2. **A table called `figsy_enrollments` with a column `compat`** — which exists only in the words *"Back-compat"* in a comment on `figsy.ts:1691`. The shared comment-stripper handled quotes and regex literals but **not nested template literals**: `figsy.ts:232` holds a `` ` `` inside a `${…}` inside a `` ` ``, the outer template ended at the inner backtick, and the stripper **stopped stripping for the remaining 2,700 lines of the file.**

Both are fixed (the stripper now walks a mode stack). The reason they are recorded rather than quietly patched: **the dangerous half of each bug is the inverse.** A stripper that goes blind mid-file invents findings from prose *and hides real ones in the noise it invents* — and fixing #2 is what surfaced `subscribers.source`, a genuine undeclared column that the broken scanner had missed. `docs/ENVIRONMENT.md` (#561) uses the same stripper; its sweep was re-run and the count is unchanged at 100, because no `process.env` read happens to sit after a nested template in the same file.

## The `credit_transactions` CHECK — #558's own example, traced

Four migrations redefine `credit_transactions_type_check`, and they do not agree:

| Order | File | Types allowed | Runner |
|--:|---|---|---|
| 1 | `supabase/migrations/20260603_schema_reconcile.sql` | 9 base types | hand |
| 2 | `apps/api/src/migrations/20260723_money_retime.sql` | + `hold`, `release` | hand |
| 3 | `apps/api/src/migrations/20260724_one_wallet.sql` | + `wallet_topup/charge/reverse`, **keeps `hold`/`release`** *"so old rows validate"* | hand |
| 4 | `supabase/migrations/20260726_wallet_tx_types.sql` | wallet types, **DROPS `hold`/`release`** | **`PENDING_MIGRATIONS`** ✅ |

⚠️ **Only #4 has a runner, and it is the one that removes `hold`/`release`.** `ALTER TABLE … ADD CONSTRAINT` **validates existing rows**, so if production holds a single `type='hold'` row — and #492's hold/release lifecycle was live before the one-wallet change — then pressing **Run migrations** in Vida **throws**, and #3's own comment says those rows were expected to exist. Query 2 below answers it before you press the button.

## Table by table

77 tables. The five unknowables first, then everything that agrees.

| Table | Migrations say | `schema.sql` | `staging-schema` | `MASTER_SCHEMA` | Code writes | Verdict |
|---|--:|:-:|:-:|:-:|--:|---|
| `clients` | 56 cols | ✓ | ✓ | ✓ | 32 cols | ❓ unknowable — `last_low_credit_email_at` |
| `leads` | 36 cols | ✓ | ✓ | ✓ | 37 cols | ❓ unknowable — `source` |
| `opt_out_blocklist` | — cols | ✓ | ✓ | — | 6 cols | ❓ unknowable — `whatsapp_number` |
| `subscribers` | — cols | — | — | — | 1 cols | ❓ unknowable — `source` |
| `whatsapp_messages` | — cols | — | — | — | 10 cols | ❓ unknowable — `client_id`, `contact_name`, `direction`, `from_number`, `incoming_message`, `lead_id`, `message`, `reply_message`, `to_number`, `whatsapp_id` |
| `african_data_moat` | 16 cols | — | ✓ | — | — cols | ✅ agree |
| `agent_signals` | 6 cols | — | ✓ | — | 1 cols | ✅ agree |
| `agreement_templates` | — cols | ✓ | ✓ | — | 4 cols | ✅ agree |
| `app_migrations_applied` | 2 cols | — | — | — | — cols | ✅ agree |
| `assistant_messages` | — cols | ✓ | ✓ | — | — cols | ✅ agree |
| `calendar_bookings` | 15 cols | — | ✓ | — | 11 cols | ✅ agree |
| `chatbot_configs` | — cols | ✓ | ✓ | — | — cols | ✅ agree |
| `client_inboxes` | 20 cols | — | — | — | 7 cols | ✅ agree |
| `client_members` | 9 cols | — | ✓ | — | 6 cols | ✅ agree |
| `client_messages` | 6 cols | — | ✓ | — | 2 cols | ✅ agree |
| `client_reveals` | 4 cols | — | — | — | — cols | ✅ agree |
| `companies` | 7 cols | — | ✓ | — | 4 cols | ✅ agree |
| `contact_requests` | 7 cols | — | ✓ | ✓ | — cols | ✅ agree |
| `credit_holds` | 8 cols | — | — | — | 7 cols | ✅ agree |
| `credit_transactions` | 8 cols | — | ✓ | ✓ | 7 cols | ✅ agree |
| `cron_claims` | 4 cols | — | — | — | 1 cols | ✅ agree |
| `cron_runs` | 7 cols | — | — | — | 3 cols | ✅ agree |
| `dead_letter` | 8 cols | — | ✓ | — | 2 cols | ✅ agree |
| `deal_registrations` | 15 cols | — | ✓ | — | 8 cols | ✅ agree |
| `denise_drafts` | 6 cols | — | ✓ | — | 3 cols | ✅ agree |
| `developer_keys` | 9 cols | — | ✓ | — | 6 cols | ✅ agree |
| `error_events` | 7 cols | — | — | — | 5 cols | ✅ agree |
| `figsy_approval_queue` | 15 cols | — | ✓ | — | 10 cols | ✅ agree |
| `figsy_calls` | 13 cols | — | ✓ | ✓ | 8 cols | ✅ agree |
| `figsy_campaigns` | 21 cols | — | ✓ | — | 15 cols | ✅ agree |
| `figsy_chat_messages` | 5 cols | — | ✓ | — | — cols | ✅ agree |
| `figsy_enrollments` | 22 cols | — | ✓ | — | 16 cols | ✅ agree |
| `figsy_knowledge` | 4 cols | — | — | — | 3 cols | ✅ agree |
| `figsy_linkedin_queue` | 11 cols | — | ✓ | — | 8 cols | ✅ agree |
| `figsy_memory` | 12 cols | — | ✓ | ✓ | 6 cols | ✅ agree |
| `figsy_replies` | 18 cols | — | ✓ | — | 17 cols | ✅ agree |
| `figsy_sent_emails` | 12 cols | — | ✓ | — | 8 cols | ✅ agree |
| `figsy_sequences` | 6 cols | — | — | — | 4 cols | ✅ agree |
| `figsy_tasks` | 9 cols | — | ✓ | — | 5 cols | ✅ agree |
| `founder_agent_logs` | 5 cols | — | ✓ | ✓ | 3 cols | ✅ agree |
| `founder_alerts` | 7 cols | — | ✓ | — | 2 cols | ✅ agree |
| `icp_run_outcomes` | 9 cols | — | — | — | 6 cols | ✅ agree |
| `icps` | 8 cols | ✓ | ✓ | ✓ | 12 cols | ✅ agree |
| `lead_enrichment` | 6 cols | — | ✓ | ✓ | — cols | ✅ agree |
| `lead_pool` | 14 cols | — | — | — | — cols | ✅ agree |
| `metrics_daily` | 6 cols | — | — | — | 5 cols | ✅ agree |
| `milla_chunks` | 6 cols | — | ✓ | — | — cols | ✅ agree |
| `milla_documents` | 8 cols | — | ✓ | — | 5 cols | ✅ agree |
| `milla_messages` | 7 cols | — | ✓ | — | 5 cols | ✅ agree |
| `milla_sessions` | 5 cols | — | ✓ | — | 2 cols | ✅ agree |
| `money_settings` | 3 cols | — | — | — | 2 cols | ✅ agree |
| `nexus_profiles` | 12 cols | — | — | — | 12 cols | ✅ agree |
| `nps_responses` | 5 cols | — | — | — | 3 cols | ✅ agree |
| `operator_audit_log` | 8 cols | — | — | — | 6 cols | ✅ agree |
| `order_forms` | — cols | ✓ | ✓ | — | 3 cols | ✅ agree |
| `outcome_events` | 10 cols | — | ✓ | — | 8 cols | ✅ agree |
| `outreach_log` | 11 cols | — | — | — | — cols | ✅ agree |
| `partner_applications` | 8 cols | — | ✓ | ✓ | — cols | ✅ agree |
| `partner_commissions` | 11 cols | — | ✓ | — | 7 cols | ✅ agree |
| `partner_referrals` | 7 cols | — | ✓ | — | 5 cols | ✅ agree |
| `partners` | 17 cols | — | ✓ | — | 11 cols | ✅ agree |
| `platform_status` | 6 cols | — | ✓ | — | — cols | ✅ agree |
| `processed_webhook_events` | 3 cols | — | — | — | 1 cols | ✅ agree |
| `product_waitlist` | 6 cols | — | ✓ | ✓ | — cols | ✅ agree |
| `proposals` | 12 cols | — | ✓ | — | 6 cols | ✅ agree |
| `push_subscriptions` | 6 cols | — | ✓ | — | 4 cols | ✅ agree |
| `seat_credit_requests` | 9 cols | — | ✓ | — | 7 cols | ✅ agree |
| `sourcing_ledger` | 5 cols | — | — | — | 3 cols | ✅ agree |
| `subscriptions` | 4 cols | ✓ | ✓ | ✓ | 15 cols | ✅ agree |
| `usage_metrics` | — cols | ✓ | ✓ | — | — cols | ✅ agree |
| `vida_configs` | 12 cols | — | ✓ | — | 2 cols | ✅ agree |
| `vida_messages` | 6 cols | — | ✓ | — | — cols | ✅ agree |
| `vida_sessions` | 10 cols | — | ✓ | — | 4 cols | ✅ agree |
| `visitor_sessions` | 11 cols | — | ✓ | — | — cols | ✅ agree |
| `webhook_endpoints` | 7 cols | — | — | — | 3 cols | ✅ agree |
| `webhook_triggers` | — cols | — | — | ✓ | — cols | ✅ agree |
| `winning_plays` | 9 cols | — | ✓ | — | 5 cols | ✅ agree |

## What this scan can and cannot see

**The column-write scan reads 296 of the repo's 346 `.insert`/`.update` calls.** It can only read an **inline object literal** — `insert({ a, b })`. The other **50 pass a variable** (`insert(rows)`, `insert(accepted.map(toLeadRow))`), and the column names live inside a builder function the scanner cannot follow. `leads` alone has 12 such calls, **including #599's CSV import**.

That matters for how you read the ✅ rows: **"agree" means "no undeclared column among the writes I can read"**, not "no undeclared columns". `leads.source` was caught only because a *second*, inline writer (`lib/vida.ts:187`) also sets it — had the CSV import been the only one, this page would have called `leads` clean.

Which is the argument for query 8 below rather than a better parser: one paste of the live column list turns every ❓ **and** every unverified ✅ into a fact.

## 🧍 Founder checklist — the queries only production can answer

Vida → **Engine** → the SQL runner. **All read-only.** One per line, copy-pasteable, and each says what to do with the answer.

**1. Does `leads.source` exist? (blocks #599's CSV import)**
```sql
select column_name, data_type from information_schema.columns where table_schema='public' and table_name='leads' and column_name='source';
```
*0 rows → the CSV import will fail on the first real file. The fix is one `ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text;` — deliberately NOT in this PR, because it is a write to production and the prompt asked for none.*

**2. Are there `hold`/`release` rows? (blocks Run migrations)**
```sql
select type, count(*) from public.credit_transactions group by type order by 2 desc;
```
*Any `hold` or `release` row → `20260726_wallet_tx_types` will throw when you press Run migrations. Tell me and I will re-issue the constraint keeping both, as `20260724_one_wallet.sql` intended.*

**3. What does the live `credit_transactions` CHECK actually allow?**
```sql
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid='public.credit_transactions'::regclass;
```
*This is #558's literal example. Paste the answer back and the four disagreeing migrations get reconciled to it.*

**4. Does `opt_out_blocklist.whatsapp_number` exist?**
```sql
select column_name from information_schema.columns where table_schema='public' and table_name='opt_out_blocklist' order by 1;
```

**5. Does `clients.last_low_credit_email_at` exist, or only `low_credit_warned_at`?**
```sql
select column_name from information_schema.columns where table_schema='public' and table_name='clients' and column_name like '%low_credit%';
```

**6. Does `whatsapp_messages` exist at all?**
```sql
select to_regclass('public.whatsapp_messages') as exists_or_null;
```

**7. The full live table list — the one answer that ends the guessing**
```sql
select table_name from information_schema.tables where table_schema='public' order by 1;
```
*Paste this back and every ❓ in the table above becomes a ✅ or a fix. It is the single highest-value query on this page.*

**8. Every live column, for a full diff against this doc**
```sql
select table_name, column_name, data_type from information_schema.columns where table_schema='public' order by 1,2;
```
*Large. Save it to a file and hand it over — the derivation in `schema-drift.ts` can then be run against reality instead of against the repo.*

## What was fixed in this PR, and what was deliberately not

**Fixed** — `packages/db/src/schema.sql` was missing **76 columns its own migrations add**, across four tables it does declare:

| Table | Columns it did not declare | Included |
|---|--:|---|
| `clients` | 56 | `wallet_balance_usd`, `is_demo`, `sourcing_allowance`, `plan`, the whole onboarding block |
| `leads` | 12 | `delivered_at`, `revealed_at`, `consent_token`, `surfaced_for_approval_at` |
| `icps` | 6 | the three `pdl_scroll_*` cursor columns (#366) |
| `subscriptions` | 2 | `stripe_subscription_id` |

Those are the money column, the demo flag, and the timestamps the entire approve → surface → charge loop turns on. **Anyone who ran that file to stand up a database got one the product could not use.** The reconciliation block appended to it is idempotent `ADD COLUMN IF NOT EXISTS` only — nothing dropped, nothing renamed.

**Deliberately not fixed:**

- **No writes to production.** Not one statement here runs against the live database. Every question that needs prod is a read-only query above.
- **`schema.sql` still declares only 10 of 68 tables.** Making it complete is **#273** (schema-source consolidation), and this PR does not start it — it makes the four tables it *does* declare honest.
- **The four disagreeing `credit_transactions` CHECKs are left as they are.** Reconciling them means choosing which one production has, and query 3 is how that gets chosen. Guessing would be how #558 happens again.

## Related

- **`apps/api/src/lib/schema-drift.ts`** — the derivation. `schema-drift.test.ts` fails the gate if `schema.sql` falls behind its own migrations again, or if a new undeclared column appears in a write path.
- **`apps/api/src/lib/pending-migrations.ts`** — the twelve statements the product can actually run.
- **`docs/ENVIRONMENT.md`** (#561) — the same discipline for the environment.
