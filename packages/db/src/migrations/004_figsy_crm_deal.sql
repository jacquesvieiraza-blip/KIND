-- F2-2: CRM deal push on interested reply
-- Track which enrollments have been pushed to CRM as a deal/opportunity

alter table public.figsy_enrollments
  add column if not exists crm_deal_id    text,
  add column if not exists crm_pushed_at  timestamptz;
