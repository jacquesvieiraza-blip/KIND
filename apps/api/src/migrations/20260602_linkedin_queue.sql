-- LinkedIn outreach queue for FIGSY
CREATE TABLE IF NOT EXISTS public.figsy_linkedin_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.figsy_campaigns(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.figsy_leads(id) ON DELETE CASCADE,
  linkedin_url TEXT NOT NULL,
  connection_note TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','sent','failed','skipped')),
  phantombuster_launch_id TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_li_queue_client ON public.figsy_linkedin_queue(client_id);
CREATE INDEX IF NOT EXISTS idx_li_queue_status ON public.figsy_linkedin_queue(status);
