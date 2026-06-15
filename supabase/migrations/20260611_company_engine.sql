-- #88 Company / Per-Rep Engine — backend foundation (B-Month 2).
-- Builds on the existing client_members seat model. All additive; gated in the
-- portal behind v2Enabled('company'), so nothing changes for the live product
-- until the flag is flipped AND this is merged.

-- 35 · Per-rep autonomy + 37 · per-seat budget. Each seat (client_members row)
-- gets its own FIGSY autonomy mode and credit allocation drawn from the company.
ALTER TABLE public.client_members
  ADD COLUMN IF NOT EXISTS autonomy      text    NOT NULL DEFAULT 'copilot'
    CHECK (autonomy IN ('auto', 'copilot', 'off')),
  ADD COLUMN IF NOT EXISTS credit_budget integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS credits_used  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seat_active   boolean NOT NULL DEFAULT true;

-- 37 (2d) · Usage & budget — request / approve credits per seat. A rep asks for
-- more; the owner approves or denies. Exactly how an enterprise runs Claude.
CREATE TABLE IF NOT EXISTS public.seat_credit_requests (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  member_id   uuid NOT NULL REFERENCES public.client_members(id) ON DELETE CASCADE,
  amount      integer NOT NULL CHECK (amount > 0),
  reason      text,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  decided_by  uuid REFERENCES auth.users(id),
  decided_at  timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS seat_credit_requests_client_idx ON public.seat_credit_requests(client_id, status);

-- 39 · ★ Shared winning-play library. The owner perfects a sequence once; every
-- seat's FIGSY can inherit it. Stored at the company (client) level.
CREATE TABLE IF NOT EXISTS public.winning_plays (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name        text NOT NULL,
  note        text,
  sequence    jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {step1,step2,step3} or template ref
  reply_rate  numeric,                              -- observed, when known (never fabricated)
  pushed_to_all boolean NOT NULL DEFAULT false,
  created_by  uuid REFERENCES auth.users(id),
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS winning_plays_client_idx ON public.winning_plays(client_id);
