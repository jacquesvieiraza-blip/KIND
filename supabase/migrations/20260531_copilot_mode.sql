-- P0-10: Co-pilot mode per campaign — when true, emails await
-- manual approval before sending
alter table figsy_campaigns
  add column if not exists copilot_mode boolean default false;
