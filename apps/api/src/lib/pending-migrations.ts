// PENDING MIGRATIONS — runnable from Vida, because the Supabase SQL editor is unreachable.
//
// Supabase login is GitHub OAuth and the founder's GitHub account is flagged ("cannot
// authorize a third party application"), so the dashboard cannot be opened at all. No psql,
// no Homebrew, and deliberately no new tooling. What we DO have is this API — which already
// holds DATABASE_URL — and Vida, which already talks to it behind the admin key.
//
// So the SQL lives here as a string constant (NOT read from disk: .sql files are not copied
// into dist/ by tsc, so a file read would work locally and fail in production), and an
// admin-gated endpoint executes it. Arbitrary SQL is never accepted over HTTP — only these
// reviewed, committed, IDEMPOTENT statements, which is why re-running is harmless.

export type PendingMigration = { key: string; title: string; sql: string }

export const PENDING_MIGRATIONS: PendingMigration[] = [
  {
    key: '20260725_client_inboxes',
    title: 'Client inboxes (Engine + pooled→branded inbox SOP)',
    sql: `
CREATE TABLE IF NOT EXISTS public.client_inboxes (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id         uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email             text NOT NULL,
  kind              text NOT NULL CHECK (kind IN ('pooled','branded')),
  status            text NOT NULL DEFAULT 'assigned'
                    CHECK (status IN ('assigned','warming','active','released','retired')),
  provider          text DEFAULT 'smartlead',
  daily_cap         integer,
  warmup_started_at timestamptz,
  warmup_ready_at   timestamptz,
  assigned_at       timestamptz NOT NULL DEFAULT now(),
  released_at       timestamptz,
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS client_inboxes_client_id_idx ON public.client_inboxes(client_id);
CREATE INDEX IF NOT EXISTS client_inboxes_status_idx    ON public.client_inboxes(status);

-- A pooled inbox and a warming branded one may co-exist for one client: that overlap is
-- exactly what makes the ~day-29 switch gapless. Never two of the same kind in flight.
CREATE UNIQUE INDEX IF NOT EXISTS client_inboxes_one_live_per_kind
  ON public.client_inboxes(client_id, kind)
  WHERE status IN ('assigned','warming','active');
`.trim(),
  },
  {
    // #290 — `supabase/migrations/20260703_error_events.sql` was written to be run BY HAND
    // in the Supabase SQL editor, and the founder has been locked out of that editor since
    // (GitHub flag). So there is no way to know whether this table exists in production —
    // and the error handler swallows the insert failure by design, which means error capture
    // may have been silently degraded this whole time: exactly the "exceptions vanish"
    // problem the item was raised to fix. Idempotent, so running it either way is safe.
    key: '20260703_error_events',
    title: 'Error events (error tracking — the table the 500-handler writes to)',
    sql: `
CREATE TABLE IF NOT EXISTS public.error_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route      text,
  method     text,
  status     integer,
  message    text,
  stack      text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS error_events_created_at_idx ON public.error_events(created_at DESC);
`.trim(),
  },
]

// Runs the statements against DATABASE_URL. Uses node-postgres because the Supabase JS
// client speaks PostgREST, which cannot execute DDL.
export async function runPendingMigrations(): Promise<{ key: string; ok: boolean; error?: string }[]> {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set on this service — add it in Railway → @kind/api → Variables.')

  const { Client } = await import('pg')
  const results: { key: string; ok: boolean; error?: string }[] = []

  for (const m of PENDING_MIGRATIONS) {
    // A fresh connection per migration so one failure cannot poison the next.
    const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
    try {
      await client.connect()
      await client.query(m.sql)
      results.push({ key: m.key, ok: true })
    } catch (e) {
      results.push({ key: m.key, ok: false, error: e instanceof Error ? e.message : String(e) })
    } finally {
      await client.end().catch(() => {})
    }
  }
  return results
}
