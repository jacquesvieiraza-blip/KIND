# 🪦 HISTORICAL — do not add migrations here

**Every file in this directory has been consolidated into [`supabase/migrations/`](../../../../supabase/migrations/), which is the single home for migrations (#273, 31 Jul 2026).** The 13 files here are kept, not deleted (CORE-MAP rule 3, founder-locked: *nothing gets deleted*) — each carries a tombstone header pointing at its canonical copy.

## What this set is

The **oldest** migrations, numbered `001`–`013`. They created the original core tables: `figsy_*`, `milla_*`, `vida_*`, `denise_*`, `partners`, the CRM columns and the calendar. Because they are numbered rather than dated they sort **before** every dated file in the canonical directory, which happens to be chronologically right — but it is a coincidence of two naming schemes, not a design, and it is worth knowing when reading the canonical directory in order.

## ⚠️ Nothing here is known to have been applied

**#554c settled this the hard way.** A migration that dropped policies on these tables failed in production with `relation "public.lead_enrichment" does not exist` — and that answered an open audit question: **most of the tables from this directory were probably never created in production at all.** It is recorded in `pending-migrations.ts` as *"a directory nothing has ever confirmed was run there"*, and it is why the live RLS audit found none of them exposed.

Treat every table originating here as **unverified in production** until the #558 probe or a real `information_schema` read says otherwise (Vida → Engine → **Schema probe**).

## Where things go now

| I want to… | Change |
|---|---|
| record a migration | `supabase/migrations/` — the canonical file |
| make the product **run** it | `apps/api/src/lib/pending-migrations.ts` — the constant Vida executes |

Both, for anything that must actually reach production. There is no directory-based runner and never was.

**Full picture: [`docs/SCHEMA-DRIFT.md`](../../../../docs/SCHEMA-DRIFT.md).**
