// SCHEMA PROBE — asking the LIVE database the six questions #558 could only write down.
//
// ── WHY THIS EXISTS, AND IT IS MY OWN MISTAKE ────────────────────────────────────────────
//
// `docs/SCHEMA-DRIFT.md` (#558) ended with eight queries and the instruction *"paste these
// into Vida → Engine → SQL"*. **That screen does not exist.** The only SQL path in the
// product is `POST /operator/migrations/run`, which executes the reviewed
// `PENDING_MIGRATIONS` constants and deliberately refuses anything else — correct, and not
// something to widen. And `DATABASE_URL` is mangled, so there is no pg connection either.
//
// So the doc shipped eight correct queries with nowhere to run them: a finding with no next
// action, which is a finding that sits there. This is the smallest honest fix — **six of the
// eight questions answered with the supabase-js client we already have, and no SQL at all.**
//
// ── HOW YOU ASK "DOES THIS COLUMN EXIST?" WITHOUT information_schema ─────────────────────
//
// PostgREST cannot read `information_schema` or `pg_constraint` through the REST API. But it
// does not need to: **selecting a column that does not exist is an ERROR with a specific
// code**, and selecting one that does is a clean (empty) result. So the probe is the request
// itself, and the answer is in how it fails:
//
//   • `42703` / `PGRST204` — the column is not there
//   • `42P01` / `PGRST205` — the table is not there
//   • no error, or an error about anything else — it is there
//
// `LIMIT 0` with a head count, so nothing is read and no row-level policy can interfere.
//
// ── THE RULE THAT SHAPES THE RETURN TYPE ─────────────────────────────────────────────────
//
// **A probe that could not run returns UNKNOWABLE, never "missing."** An auth failure, a
// network drop, a paused project — every one of those produces an error, and reading any
// error as "the column is absent" would turn an outage into a confident, wrong schema
// verdict. That is #565 exactly: a broken check rendering as a clean answer. Three states,
// and the third one is used.

/** What a probe found. `unknowable` is a real answer, not a fallback. */
export type ProbeVerdict = 'exists' | 'missing' | 'unknowable'

export type ProbeResult = {
  verdict: ProbeVerdict
  /** The raw error, verbatim, so a surprising verdict can be argued with. */
  detail: string | null
  /** The error code we classified on, when there was one. */
  code: string | null
}

export type DbError = { code?: string | null; message?: string | null; details?: string | null } | null

/** Postgres + PostgREST codes for "no such relation". */
export const MISSING_TABLE_CODES = ['42P01', 'PGRST205'] as const

/**
 * Is this supabase error "the table is not there"?
 *
 * #627 — HOISTED SO A THIRD COPY CANNOT APPEAR. `cron-guard.ts` had its own inline version and
 * the PDL-cap probe was about to need a second, which is exactly how two call sites come to
 * disagree about what "missing" means. Matches the CODE first (authoritative) and falls back to
 * the message, because PostgREST does not always populate `code` on a schema-cache miss — the
 * founder's own failure read "Could not find the table 'public.app_settings' in the schema
 * cache", which is the message path, not the code path.
 */
export function isMissingTable(error: DbError): boolean {
  if (!error) return false
  const code = String(error.code ?? '')
  if ((MISSING_TABLE_CODES as readonly string[]).includes(code)) return true
  const msg = String(error.message ?? '')
  return /relation .* does not exist|could not find the table|schema cache/i.test(msg)
}
/** Postgres + PostgREST codes for "no such column". */
export const MISSING_COLUMN_CODES = ['42703', 'PGRST204'] as const

/**
 * Turn a supabase-js error into a verdict.
 *
 * PURE, because this is the whole judgement and it must be provable without a database —
 * including the branch that only fires during an outage, which is precisely the one that
 * cannot be tested against a working one.
 *
 * The message patterns are a SECOND route to the same conclusion, not a first: PostgREST has
 * renamed codes between versions, and a probe that silently reclassified every schema
 * question as `unknowable` after a dependency bump would be useless in exactly the quiet way
 * this file exists to avoid. Codes first, wording second, and anything else is unknowable.
 */
export function classifyProbeError(error: DbError, kind: 'table' | 'column'): ProbeResult {
  if (!error) return { verdict: 'exists', detail: null, code: null }

  const code = (error.code ?? '').trim()
  const message = [error.message, error.details].filter(Boolean).join(' — ') || 'no message'

  const missingTable =
    (MISSING_TABLE_CODES as readonly string[]).includes(code) ||
    /relation .* does not exist|could not find the table/i.test(message)

  const missingColumn =
    (MISSING_COLUMN_CODES as readonly string[]).includes(code) ||
    /column .* does not exist|could not find the '.*' column/i.test(message)

  // A column probe on a table that is itself absent answers the column question too — the
  // column cannot exist. Reported as missing with the table's error attached, because "the
  // table is gone" is the more useful sentence to read.
  if (kind === 'column' && (missingColumn || missingTable)) {
    return { verdict: 'missing', detail: message, code: code || null }
  }
  if (kind === 'table' && missingTable) {
    return { verdict: 'missing', detail: message, code: code || null }
  }

  // ⚠️ EVERYTHING ELSE IS UNKNOWABLE, AND THIS IS THE IMPORTANT BRANCH. A bad key, a paused
  // project, a network drop and an RLS refusal all arrive here. Calling any of them
  // "missing" would print a schema verdict during an outage — a broken probe reading as a
  // clean one, which is the defect this whole board exists to remove (#565).
  return { verdict: 'unknowable', detail: message, code: code || null }
}

/**
 * A row-count answer, kept separate from the schema verdicts because it is a different kind
 * of fact and must not be able to masquerade as one.
 */
export type CountResult =
  | { measured: true; value: number }
  | { measured: false; why: string }

/** The ledger types #558 needs counted, and why each one matters. */
export const LEDGER_TYPES_TO_COUNT = ['hold', 'release'] as const

/**
 * Is it safe to press **Run migrations**?
 *
 * `20260726_wallet_tx_types` DROPS `hold` and `release` from `credit_transactions_type_check`,
 * and `ALTER TABLE … ADD CONSTRAINT` **validates existing rows** — so a single surviving row
 * of either type makes that migration throw. #492's hold/release lifecycle was live before
 * the one-wallet change, and `20260724_one_wallet.sql` kept both types in its own CHECK
 * expressly *"so old rows validate"*.
 *
 * Pure, and it refuses to say "safe" on an unmeasured count. An unread count is not zero —
 * the same rule the sending panel applies to failed sends (#576).
 */
export function migrationSafety(counts: Record<string, CountResult>): {
  safe: boolean | null
  headline: string
  detail: string
} {
  const unmeasured = Object.entries(counts).filter(([, c]) => !c.measured)
  if (unmeasured.length > 0) {
    return {
      safe: null,
      headline: 'Cannot tell whether Run migrations is safe',
      detail: `The ledger count did not run (${unmeasured.map(([t, c]) => `${t}: ${!c.measured ? c.why : ''}`).join('; ')}). This is NOT evidence that there are no hold/release rows — it is evidence we could not look.`,
    }
  }

  const offenders = Object.entries(counts)
    .filter(([, c]) => c.measured && c.value > 0)
    .map(([t, c]) => `${c.measured ? c.value : 0} × ${t}`)

  if (offenders.length > 0) {
    return {
      safe: false,
      headline: 'Do NOT press Run migrations yet',
      detail: `The ledger holds ${offenders.join(' and ')}. \`20260726_wallet_tx_types\` drops those types from the CHECK, and ADD CONSTRAINT validates existing rows — it will throw. The constraint needs re-issuing to keep them, as 20260724_one_wallet.sql intended.`,
    }
  }

  return {
    safe: true,
    headline: 'Run migrations is safe on this count',
    detail: 'No hold or release rows exist, so dropping those two types from the CHECK will not fail validation. (This says nothing about the other eleven migrations — only about the one #558 flagged.)',
  }
}

/**
 * The FIXED probe list. Not configurable, and that is the security property: this endpoint
 * accepts no input at all, so it cannot be turned into the arbitrary-SQL surface that
 * `pending-migrations.ts` deliberately refuses to be.
 *
 * Every entry is a question `docs/SCHEMA-DRIFT.md` asked and could not answer.
 */
export type ProbeSpec =
  | { kind: 'table'; id: string; table: string; question: string; ifMissing: string }
  | { kind: 'column'; id: string; table: string; column: string; question: string; ifMissing: string }

export const PROBES: ProbeSpec[] = [
  {
    kind: 'column', id: 'leads.source', table: 'leads', column: 'source',
    question: 'Does leads.source exist?',
    // The one that blocks something real, today.
    ifMissing: 'The CSV import (#599) writes this column on every row — it will fail on the first real Apollo file, and the Vida-chat lead path (lib/vida.ts:187) has been failing silently for weeks because it swallows its insert error. Fix: one ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS source text.',
  },
  {
    kind: 'column', id: 'opt_out_blocklist.whatsapp_number', table: 'opt_out_blocklist', column: 'whatsapp_number',
    question: 'Does opt_out_blocklist.whatsapp_number exist?',
    ifMissing: 'The WhatsApp opt-out path writes it. WhatsApp is parked, so nothing breaks today — but the suppression table is the gate every send passes through, and no migration in this repo ever created it.',
  },
  {
    kind: 'column', id: 'clients.last_low_credit_email_at', table: 'clients', column: 'last_low_credit_email_at',
    question: 'Does clients.last_low_credit_email_at exist?',
    ifMissing: 'The low-credit warning writes it. Its sibling low_credit_warned_at IS declared, so this looks like a rename that reached the code and never reached a migration. Blast radius: the warning email can repeat.',
  },
  {
    kind: 'table', id: 'whatsapp_messages', table: 'whatsapp_messages',
    question: 'Does the whatsapp_messages table exist?',
    ifMissing: 'No migration and no snapshot creates it, and lib/whatsapp.ts writes ten columns to it. WhatsApp is parked so nothing depends on it — this is the clearest illustration of the #558 problem, not an outage.',
  },
  {
    kind: 'table', id: 'subscribers', table: 'subscribers',
    question: 'Does the subscribers table exist?',
    ifMissing: 'routes/subscribe.ts writes the marketing-playbook signup here. Nothing in the repo creates it, so every playbook signup would be silently lost.',
  },
]

/**
 * The two questions that CANNOT be answered this way, stated here so the gap travels with
 * the answers rather than being discovered later.
 *
 * PostgREST exposes tables, not the catalog: there is no way to read `pg_constraint` or
 * `information_schema` through it. A live constraint definition and a full table census both
 * need a real Postgres connection, which means `DATABASE_URL` — currently mangled (#558).
 */
export const NEEDS_PG_CONNECTION = [
  {
    id: 'credit_transactions_type_check',
    question: 'What does the live credit_transactions CHECK actually allow?',
    why: 'Reading pg_constraint needs a Postgres connection. PostgREST cannot see the catalog. Blocked until DATABASE_URL is fixed in Railway.',
  },
  {
    id: 'table_census',
    question: 'What tables and columns does the live database actually have?',
    why: 'information_schema is not exposed through PostgREST. This is the single highest-value answer for #558 and it needs DATABASE_URL. Until then the probes above answer named questions one at a time.',
  },
] as const
