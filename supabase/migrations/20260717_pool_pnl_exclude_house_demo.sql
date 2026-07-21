-- ============================================================================
-- FIX phantom pool revenue — lead_pool_pnl counted EVERY reveal + every FIGSY
-- work against a pooled email as paid revenue, regardless of WHICH account did
-- it. So the founder's own house account (hello@get-kind.com) revealing and
-- warm-up-enrolling the pooled leads showed up as "$874 REVENUE OFF THE POOL"
-- while $0 cash was ever collected.
--
-- Real pool revenue = activity from REAL, PAYING, EXTERNAL clients only. This
-- redefinition excludes:
--   • demo/test clients      (is_demo = true — free by design, never revenue)
--   • the house account      (hello@get-kind.com — the founder's own testing)
-- from BOTH the reveal count and the FIGSY-work count.
--
-- Effect: until a real client reveals/works a pooled record, revenue reads $0 —
-- the honest number. A live CREATE OR REPLACE VIEW: takes effect immediately,
-- Money Path reads it on next load, no deploy.
-- ============================================================================

CREATE OR REPLACE VIEW public.lead_pool_pnl AS
SELECT
  lp.email_norm,
  lp.company,
  lp.title,
  lp.acquisition_cost,
  COALESCE(r.reveals, 0)::int AS reveals,
  COALESCE(w.works,   0)::int AS works,
  (COALESCE(r.reveals, 0) * 1 + COALESCE(w.works, 0) * 3)::numeric AS revenue_usd,
  ((COALESCE(r.reveals, 0) * 1 + COALESCE(w.works, 0) * 3)::numeric
     / NULLIF(lp.acquisition_cost, 0)) AS roi
FROM public.lead_pool lp
LEFT JOIN (
  -- Reveals by REAL paying clients only (exclude demo + the house account).
  SELECT cr.email_norm, COUNT(*) AS reveals
  FROM public.client_reveals cr
  JOIN public.clients c ON c.id = cr.client_id
  LEFT JOIN auth.users u ON u.id = c.user_id
  WHERE COALESCE(c.is_demo, false) = false
    AND lower(COALESCE(u.email, '')) <> 'hello@get-kind.com'
  GROUP BY cr.email_norm
) r ON r.email_norm = lp.email_norm
LEFT JOIN (
  -- FIGSY works by REAL paying clients only. figsy_enrollments carries client_id;
  -- the lead carries the email, normalized (lower+btrim) to match email_norm.
  SELECT lower(btrim(l.email)) AS email_norm, COUNT(*) AS works
  FROM public.figsy_enrollments fe
  JOIN public.leads   l ON l.id = fe.lead_id
  JOIN public.clients c ON c.id = fe.client_id
  LEFT JOIN auth.users u ON u.id = c.user_id
  WHERE l.email IS NOT NULL AND btrim(l.email) <> ''
    AND COALESCE(c.is_demo, false) = false
    AND lower(COALESCE(u.email, '')) <> 'hello@get-kind.com'
  GROUP BY lower(btrim(l.email))
) w ON w.email_norm = lp.email_norm;
