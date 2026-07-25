// WHY THIS EXISTS — "connect ENETUNREACH …:5432"
//
// Supabase's DIRECT database host (`db.<ref>.supabase.co`) has been IPv6-only since Jan 2024
// unless you pay for the IPv4 add-on. Railway's containers have no IPv6 egress, so every
// direct connection dies with ENETUNREACH before it sends a byte — which is exactly what the
// Vida "Run it now" button reported. Nothing about the SQL, the password or the code was
// wrong; the address was simply unreachable from where we run.
//
// Supabase's answer is the connection POOLER (Supavisor), which does publish IPv4:
//
//   postgres://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres
//
// Port 5432 = SESSION mode, which behaves like a normal Postgres connection and runs DDL.
// (Port 6543 is TRANSACTION mode — fine for queries, not the right tool for migrations.)
//
// The one thing we cannot derive is the project's REGION, and the founder cannot look it up
// because the Supabase dashboard is behind a flagged GitHub account. So we generate a
// candidate per Supabase region and try them: a region with no pooler fails DNS instantly, so
// the sweep is cheap. Whichever connects is reported back by host (never with the password)
// so it can be pasted into Railway once and this guesswork stops.

/** Supabase pooler regions. Ordered by likelihood for this account (SA/EU first). */
const POOLER_REGIONS = [
  'eu-west-1', 'eu-west-2', 'eu-central-1', 'af-south-1',
  'us-east-1', 'us-west-1', 'us-east-2', 'us-west-2',
  'eu-west-3', 'eu-central-2', 'eu-north-1',
  'ap-south-1', 'ap-southeast-1', 'ap-southeast-2',
  'ap-northeast-1', 'ap-northeast-2',
  'ca-central-1', 'sa-east-1',
]

/** Pull the Supabase project ref out of whichever URL actually carries it. */
export function projectRef(databaseUrl?: string | null, supabaseUrl?: string | null): string | null {
  // postgres://…@db.<ref>.supabase.co:5432/postgres
  const fromDb = databaseUrl?.match(/@db\.([a-z0-9]+)\.supabase\.(?:co|com)/i)?.[1]
  if (fromDb) return fromDb
  // https://<ref>.supabase.co
  const fromApi = supabaseUrl?.match(/https?:\/\/([a-z0-9]+)\.supabase\.(?:co|com)/i)?.[1]
  return fromApi ?? null
}

/** The password from a postgres:// URL, undecoded characters and all. */
function passwordOf(databaseUrl: string): string | null {
  const m = databaseUrl.match(/^postgres(?:ql)?:\/\/[^:/?#]+:([^@]*)@/i)
  return m ? m[1] : null
}

/** True when this URL points at the IPv6-only direct host rather than the pooler. */
export function isDirectSupabaseHost(databaseUrl: string): boolean {
  return /@db\.[a-z0-9]+\.supabase\.(?:co|com)/i.test(databaseUrl)
}

/**
 * Connection strings to try, in order: whatever is configured, then — only if that is the
 * direct IPv6-only host — one session-mode pooler candidate per region.
 *
 * Returns the configured URL unchanged when it is already a pooler URL or something custom:
 * we never second-guess a connection string that has a chance of working.
 */
export function connectionCandidates(databaseUrl: string, supabaseUrl?: string | null): string[] {
  const candidates = [databaseUrl]
  if (!isDirectSupabaseHost(databaseUrl)) return candidates

  const ref = projectRef(databaseUrl, supabaseUrl)
  const pw = passwordOf(databaseUrl)
  if (!ref || !pw) return candidates

  for (const region of POOLER_REGIONS) {
    candidates.push(`postgresql://postgres.${ref}:${pw}@aws-0-${region}.pooler.supabase.com:5432/postgres`)
  }
  return candidates
}

/** Host:port of a connection string — safe to log or show, carries no credentials. */
export function safeHost(connectionString: string): string {
  const m = connectionString.match(/@([^/?#]+)/)
  return m ? m[1] : 'unknown-host'
}

/**
 * A connection error that means "this address is unreachable from here", as opposed to one
 * that means "your credentials are wrong". Only the former is worth retrying elsewhere —
 * retrying a bad password against 18 regions would just lock the account out.
 */
export function isUnreachableError(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? ''
  const msg = err instanceof Error ? err.message : String(err)
  return ['ENETUNREACH', 'ENOTFOUND', 'ECONNREFUSED', 'EHOSTUNREACH', 'ETIMEDOUT', 'EAI_AGAIN'].includes(code)
    || /ENETUNREACH|ENOTFOUND|ECONNREFUSED|EHOSTUNREACH|ETIMEDOUT|timeout/i.test(msg)
}
