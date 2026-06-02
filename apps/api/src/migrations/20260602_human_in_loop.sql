-- Human-in-the-loop approve-before-send for FIGSY campaigns
ALTER TABLE public.figsy_campaigns
  ADD COLUMN IF NOT EXISTS approve_before_send BOOLEAN NOT NULL DEFAULT false;

-- Queue for emails awaiting approval
CREATE TABLE IF NOT EXISTS public.figsy_approval_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.figsy_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.figsy_leads(id) ON DELETE CASCADE,
  sequence_step INTEGER NOT NULL DEFAULT 1,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','sent','expired')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_approval_client ON public.figsy_approval_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON public.figsy_approval_queue(status);
