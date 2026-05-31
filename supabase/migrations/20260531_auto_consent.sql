-- P0-11: Track whether a consent email was auto-fired by the API
-- when a lead's status transitions to 'scored'
alter table leads
  add column if not exists consent_auto_fired boolean default false;
