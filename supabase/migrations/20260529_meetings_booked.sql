-- Add meetings_booked counter to campaigns
ALTER TABLE public.figsy_campaigns
  ADD COLUMN IF NOT EXISTS meetings_booked integer NOT NULL DEFAULT 0;

-- Add booked flag to replies
ALTER TABLE public.figsy_replies
  ADD COLUMN IF NOT EXISTS meeting_booked_at timestamptz;
