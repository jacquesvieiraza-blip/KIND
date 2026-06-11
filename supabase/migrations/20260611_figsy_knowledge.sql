-- R15 (Learning Engine ①) — Train-FIGSY knowledge store.
-- The Knowledge page already POSTs/GETs /figsy/knowledge/:kind for seven kinds
-- (pitch, keywords, signals, dnc, messaging, context, prompts) but the backend
-- never existed, so saves 404'd. This is the persistence layer that makes the
-- page real. One row per (client, kind); the payload is stored verbatim as JSONB
-- so the frontend can evolve its shape without further migrations.
CREATE TABLE IF NOT EXISTS public.figsy_knowledge (
  client_id  uuid        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  kind       text        NOT NULL,
  data       jsonb       NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, kind)
);
