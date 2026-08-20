-- ── GOVERNED DOCUMENTS — R46'S SINGLE HOME, BUILT THE SMALLEST HONEST WAY ──────────────────
--
-- Founder-ruled 17 Aug (R46): *"any documents we need to create hold of be governed get held
-- in Vida operator. on sole truth of source."* Logged 19 Aug; until now the enforcement column
-- read "nothing yet".
--
-- ⚠️ THIS IS NOT A NEW SYSTEM. It is "partner_signed_documents" (R42) generalised by one step.
-- That table already proved the shape that matters: a document's TEXT is stored verbatim as a
-- snapshot, never a reference to a generator, because a contract that re-renders is a contract
-- nobody can prove the terms of. "partner_signed_documents.body_snapshot" exists for exactly
-- that reason and this table's "body_md" is the same idea.
--
-- ⚠️ AND IT IS NOT "terms-library". That screen holds BLANK TEMPLATES you upload and hand out
-- (the MSA, the SLA, the service order) as files, and it has a delete button because deleting
-- last year's blank template is a normal thing to want. This table holds GOVERNED INSTRUMENTS
-- whose text IS the record. Two shelves, on purpose, and each screen now says which it is —
-- otherwise "single source of truth" becomes a question rather than an answer.
--
-- THE LAW HERE IS THE REGISTER'S LAW: versions CHAIN. A new version points at what it
-- supersedes, and nothing is edited in place or deleted. "docs/PRODUCT-RULES.md" works this way
-- because a superseded rule that vanishes takes with it the evidence that it was ever believed
-- — and #549 was contradicted on 6 Aug precisely because an amendment was forgotten while the
-- original was remembered.
--
-- ⚠️ BOTH HOMES (AR6/O3): this file is the canonical record; the entry in
-- apps/api/src/lib/pending-migrations.ts is the only thing that ever EXECUTES.

create table if not exists public.governed_documents (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  -- Free text rather than a check constraint: the founder adds kinds by governing a new sort of
  -- document, and a constraint would turn that into a migration. The screen offers the kinds
  -- already in use, so drift is visible without being enforced.
  kind          text not null,
  -- The document itself. Markdown, stored verbatim — the same reason
  -- partner_signed_documents keeps body_snapshot rather than a doc_id.
  body_md       text not null,
  version       integer not null default 1,
  -- NULL for the first version of a document; otherwise the row this one replaces.
  supersedes_id uuid references public.governed_documents(id),
  created_at    timestamptz not null default now(),
  -- The operator email from the verified admin session (never a request body) — the same
  -- identity operator_audit_log records.
  created_by    text not null
);

-- ⚠️ ONE SUCCESSOR PER VERSION — the chain may not FORK.
--
-- Without this, two operators can each add "version 2" of the same document and both rows point
-- at version 1. There is then no answer to "what is the current text?", which is the one
-- question this table exists to answer. Modelled on partner_signed_documents_once, which stops
-- the same class of problem for signatures.
create unique index if not exists governed_documents_one_successor
  on public.governed_documents (supersedes_id)
  where supersedes_id is not null;

-- Read paths: newest first within a document family, and by kind on the index screen.
create index if not exists governed_documents_kind_created
  on public.governed_documents (kind, created_at desc);

-- Service-role only. This is operator-governed content and the Vida console is internal
-- forever (R36) — no client, and no anonymous reader, has any business here. The API reaches
-- it with the service key; enabling RLS with no policy means nothing else can.
alter table public.governed_documents enable row level security;

comment on table public.governed_documents is
  'R46 — governed documents, versioned by chaining. Never edited in place, never deleted. Not the same as terms-library, which holds blank uploadable templates.';
