-- PR-A — surface silent 0-lead sourcing.
-- runIcpJob is fire-and-forget (the /run route returns {started:true} before the job
-- finishes, so the client never learns WHY a run produced no leads). This table records
-- one honest outcome row per run; the portal reads the latest via GET /icps/:id/last-run
-- and shows "quota temporarily out (credits untouched)" vs "no match — widen the ICP"
-- instead of an indistinguishable empty screen.
--
-- Idempotent + additive: CREATE ... IF NOT EXISTS, safe to re-run. Service-role only
-- (the API reads it via the service key, filtered by client_id in the route) — no client
-- policy needed because the client never queries this table directly.

CREATE TABLE IF NOT EXISTS public.icp_run_outcomes (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icp_id             uuid NOT NULL REFERENCES public.icps(id) ON DELETE CASCADE,
  client_id          uuid NOT NULL,
  status             text NOT NULL CHECK (status IN ('served','no_match','quota_exhausted','demo')),
  records_requested  int  NOT NULL DEFAULT 0,
  pool_served        int  NOT NULL DEFAULT 0,
  total_inserted     int  NOT NULL DEFAULT 0,
  message            text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS icp_run_outcomes_icp_created_idx
  ON public.icp_run_outcomes (icp_id, created_at DESC);

ALTER TABLE public.icp_run_outcomes ENABLE ROW LEVEL SECURITY;
-- No policies: RLS-on with zero policies denies anon/authenticated; the service role
-- (used by the API) bypasses RLS, which is the only accessor.
