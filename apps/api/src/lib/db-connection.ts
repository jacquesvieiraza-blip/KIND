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

/**
 * The password from a postgres:// URL.
 *
 * Greedy to the LAST '@' on purpose. A generated password containing an unencoded '@' (which
 * is invalid but extremely common in pasted connection strings) would otherwise be truncated
 * at the first one — and a truncated password reads back as "password authentication failed",
 * sending you hunting for a credentials problem that is really a parsing bug.
 */
export function passwordOf(databaseUrl: string): string | null {
  const m = databaseUrl.match(/^postgres(?:ql)?:\/\/([^:@/]+):(.*)@([^@]+)$/i)
  return m ? m[2] : null
}

/** The username from a postgres:// URL. */
export function usernameOf(databaseUrl: string): string | null {
  const m = databaseUrl.match(/^postgres(?:ql)?:\/\/([^:@/]+):/i)
  return m ? m[1] : null
}

/**
 * Does DATABASE_URL point at a DIFFERENT project from SUPABASE_URL?
 *
 * WHY THIS EXISTS. Rewriting DATABASE_URL to the pooler form requires typing the project ref
 * into the username (`postgres.<ref>`), and on 27 Jul a worked example I wrote was pasted in
 * literally — placeholder ref and all. The failure that came back was
 * `(ENOTFOUND) tenant/user postgres.abcdefghijk not found`, which is Supavisor being
 * perfectly accurate and completely unhelpful: it names a tenant, not a mistake.
 *
 * The two variables sit next to each other in Railway and must describe the SAME project, so
 * a disagreement is always a typo and never a valid configuration. Detecting it turns a
 * baffling DNS-shaped error into one sentence naming the variable, the wrong value and the
 * right one. Returns null when there is nothing to compare — never a false alarm.
 */
export function refMismatch(databaseUrl?: string | null, supabaseUrl?: string | null): string | null {
  if (!databaseUrl || !supabaseUrl) return null
  const apiRef = supabaseUrl.match(/https?:\/\/([a-z0-9]+)\.supabase\.(?:co|com)/i)?.[1]
  if (!apiRef) return null
  // Either shape: the direct host `@db.<ref>.supabase.co`, or the pooler username
  // `postgres.<ref>` that Supavisor splits into user + tenant.
  const dbRef = databaseUrl.match(/@db\.([a-z0-9]+)\.supabase\.(?:co|com)/i)?.[1]
    ?? databaseUrl.match(/^postgres(?:ql)?:\/\/postgres\.([a-z0-9]+):/i)?.[1]
  if (!dbRef || dbRef.toLowerCase() === apiRef.toLowerCase()) return null
  return `DATABASE_URL names project "${dbRef}" but SUPABASE_URL names "${apiRef}". They must be the same project, so this is a typo in DATABASE_URL — the correct ref is "${apiRef}". Fix it in Railway → @kind/api → Variables.`
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
export function connectionCandidates(
  databaseUrl: string,
  supabaseUrl?: string | null,
  passwordOverride?: string | null,
): string[] {
  // An operator-supplied password replaces the one in DATABASE_URL — the escape hatch for
  // "the stored password is stale and the dashboard that could reset it is unreachable".
  const pw = (passwordOverride && passwordOverride.length > 0) ? passwordOverride : passwordOf(databaseUrl)
  const ref = projectRef(databaseUrl, supabaseUrl)

  const candidates: string[] = []
  // Only trust the configured URL as-is when we are NOT overriding its password.
  if (!passwordOverride) candidates.push(databaseUrl)
  else if (ref && pw) candidates.push(`postgresql://postgres:${encodeURIComponent(pw)}@db.${ref}.supabase.co:5432/postgres`)

  if (!isDirectSupabaseHost(databaseUrl) && !passwordOverride) return candidates
  if (!ref || !pw) return candidates

  // Supavisor wants user `postgres.<ref>`: it splits on the dot into user + tenant, which is
  // why an auth failure here is reported against user "postgres" rather than the full string.
  // Guard against double-suffixing if DATABASE_URL already carries the pooler username.
  const user = `postgres.${ref}`
  for (const region of POOLER_REGIONS) {
    candidates.push(`postgresql://${user}:${encodeURIComponent(pw)}@aws-0-${region}.pooler.supabase.com:5432/postgres`)
  }
  return Array.from(new Set(candidates))
}

/**
 * Does this error mean "the server answered and rejected the credentials"? That is a very
 * different message to the operator than "nothing was reachable": one is a password to fix,
 * the other is a network route. Conflating them is what sent us chasing IPv6 twice.
 */
export function isAuthError(err: unknown): boolean {
  const code = (err as { code?: string })?.code ?? ''
  const msg = err instanceof Error ? err.message : String(err)
  return code === '28P01' || code === '28000' || /password authentication failed|no pg_hba|role .* does not exist|Tenant or user not found/i.test(msg)
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
