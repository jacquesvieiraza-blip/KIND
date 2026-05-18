-- Re-enable RLS on clients and icps tables
-- These were disabled during debugging. Policies already exist from schema.sql.
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.icps    ENABLE ROW LEVEL SECURITY;
