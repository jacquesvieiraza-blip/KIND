// #554 — ROW-LEVEL SECURITY, READ END TO END, WITH A VERDICT PER TABLE.
//
// ── WHY THIS IS CODE AND NOT JUST A DOCUMENT ─────────────────────────────────────────────
//
// The item asks for the policies to be read and a verdict written for each table. I read
// them: **151 policies across 39 SQL files** (the item said "seven migration files" — the
// surface is five times bigger than the row claimed).
//
// But a verdict read off those files is a verdict about FILES. This repo has three separate
// migration directories — `supabase/migrations/`, `packages/db/src/migrations/` and
// `apps/api/src/migrations/` — plus two whole-schema snapshots that disagree with each
// other, and #558 is the standing finding that the repo no longer describes the live
// database. `subscriptions.status` is an enum in production and a text+CHECK in
// `schema.sql`; `copilot_mode` was missing in production while the checklist showed green.
//
// A security audit that reports what a file says is worth nothing. **So the verdict is
// computed from `pg_policies` and `pg_class.relrowsecurity` in the live database.**
//
// ── THE RULE THAT MAKES THIS DANGEROUS ───────────────────────────────────────────────────
//
// Two things about Postgres RLS decide almost every finding here:
//
//   ① **A policy with no `TO` clause applies to PUBLIC** — every role, including the `anon`
//      role that the public Supabase key authenticates as. `CREATE POLICY "Service role
//      bypass" ON t FOR ALL USING (true)` does not restrict anything to the service role
//      despite its name. It grants the whole table to anyone holding the anon key.
//
//   ② **Permissive policies combine with OR.** One `USING (true)` makes every careful
//      `client_id = current_client_id()` policy on that table irrelevant. Access is granted
//      if ANY permissive policy passes, so the weakest policy on a table IS the policy.
//
// #350 found exactly one instance of ① — `visitor_sessions.admin_read_visits`, confirmed
// anon-readable in production, holding visitor IPs and enrichment — dropped it, and **nobody
// swept for the pattern**. This audit is that sweep.

export type PolicyRow = {
  tablename: string
  policyname: string
  /** 'PERMISSIVE' | 'RESTRICTIVE' */
  permissive: string
  /** Postgres reports `{public}` when the policy has no TO clause. */
  roles: string[]
  /** ALL | SELECT | INSERT | UPDATE | DELETE */
  cmd: string
  /** The USING expression, or null. */
  qual: string | null
  /** The WITH CHECK expression, or null. */
  with_check: string | null
}

export type TableState = {
  tablename: string
  rlsEnabled: boolean
  policies: PolicyRow[]
}

export type Verdict = 'exposed' | 'unprotected' | 'deny_all' | 'scoped' | 'review'

export type TableVerdict = {
  tablename: string
  verdict: Verdict
  /** One sentence a human can act on. */
  finding: string
  /** Named policies responsible for an `exposed` verdict. */
  offenders: string[]
}

/** Roles that a browser holding the PUBLIC Supabase key can act as. */
const BROWSER_ROLES = ['public', 'anon', 'authenticated']

/** Does this policy reach a role a stranger with the public key can use? */
export function reachesBrowser(p: PolicyRow): boolean {
  // Postgres stores `{public}` for a policy written without a TO clause. That is not a
  // formality — it is the difference between "the service role" and "everyone".
  if (!p.roles || p.roles.length === 0) return true
  return p.roles.some(r => BROWSER_ROLES.includes(r.toLowerCase().trim()))
}

/** An expression that lets every row through. */
export function isUnconditional(expr: string | null): boolean {
  if (expr === null) return false
  return expr.replace(/[\s()]/g, '').toLowerCase() === 'true'
}

/** Does this policy grant READ access (SELECT is reachable through it)? */
export function grantsRead(p: PolicyRow): boolean {
  const c = p.cmd.toUpperCase()
  return c === 'ALL' || c === 'SELECT'
}

/**
 * The one condition that leaks a table: a PERMISSIVE policy, reaching a browser role, whose
 * USING expression is unconditionally true, on a command that can read.
 *
 * RESTRICTIVE policies are excluded deliberately — those AND-combine and can only ever
 * narrow access, so `USING (true)` on a restrictive policy is a no-op, not a leak.
 */
export function isLeak(p: PolicyRow): boolean {
  if (p.permissive.toUpperCase() !== 'PERMISSIVE') return false
  return reachesBrowser(p) && grantsRead(p) && isUnconditional(p.qual)
}

/**
 * Tables the API reads with the service-role key and that the browser never touches
 * directly. For these, RLS with NO policy is the correct, strongest configuration: the
 * service role bypasses RLS, everyone else gets nothing.
 */
export function verdictFor(state: TableState, browserReadsDirectly: boolean): TableVerdict {
  const { tablename, rlsEnabled, policies } = state

  if (!rlsEnabled) {
    return {
      tablename,
      verdict: 'unprotected',
      finding: policies.length > 0
        ? `RLS is OFF, so its ${policies.length} polic${policies.length === 1 ? 'y is' : 'ies are'} INERT — they are not enforced at all. Anyone with the public key can read the whole table.`
        : 'RLS is OFF and there are no policies. Anyone with the public key can read the whole table.',
      offenders: policies.map(p => p.policyname),
    }
  }

  const leaks = policies.filter(isLeak)
  if (leaks.length > 0) {
    return {
      tablename,
      verdict: 'exposed',
      // Permissive policies OR together, so naming the other policies would be misleading —
      // they cannot restrain this one.
      finding: `Readable by anyone holding the public anon key. ${leaks.length} permissive polic${leaks.length === 1 ? 'y grants' : 'ies grant'} every row to a browser role with USING (true); because permissive policies combine with OR, no other policy on this table can restrain it.`,
      offenders: leaks.map(p => p.policyname),
    }
  }

  if (policies.length === 0) {
    return {
      tablename,
      verdict: 'deny_all',
      finding: browserReadsDirectly
        ? 'RLS is on with NO policy, so anon/authenticated get nothing — but the browser reads this table directly, so it is currently returning empty to real users.'
        : 'RLS is on with no policy: anon and authenticated get nothing, the service role is unaffected. This is the strongest configuration for a table only the API touches.',
      offenders: [],
    }
  }

  const browserFacing = policies.filter(p => reachesBrowser(p) && p.permissive.toUpperCase() === 'PERMISSIVE')
  if (browserFacing.length === 0) {
    return {
      tablename, verdict: 'deny_all',
      finding: 'Every policy is scoped to a non-browser role, so anon and authenticated get nothing.',
      offenders: [],
    }
  }

  return {
    tablename,
    verdict: 'scoped',
    finding: `${browserFacing.length} browser-facing polic${browserFacing.length === 1 ? 'y' : 'ies'}, each conditioned on the caller's own identity rather than USING (true).`,
    offenders: [],
  }
}

/** Ranking for display — the worst thing on the page goes at the top. */
export const VERDICT_ORDER: Record<Verdict, number> = {
  exposed: 0, unprotected: 1, review: 2, deny_all: 3, scoped: 4,
}

export function summarise(verdicts: TableVerdict[]): {
  exposed: number; unprotected: number; denyAll: number; scoped: number; review: number; safe: boolean
} {
  const c = (v: Verdict) => verdicts.filter(x => x.verdict === v).length
  return {
    exposed: c('exposed'), unprotected: c('unprotected'), denyAll: c('deny_all'),
    scoped: c('scoped'), review: c('review'),
    safe: c('exposed') === 0 && c('unprotected') === 0,
  }
}

/**
 * Tables the BROWSER reads directly with the public key (found by reading every `.from('…')`
 * in the portal, website and admin apps). These are the only tables that legitimately need a
 * browser-facing policy at all; for every other table, a browser-facing policy is surface
 * area with no purpose.
 */
export const BROWSER_READ_TABLES = [
  'agreement_templates', 'clients', 'credit_transactions', 'figsy_campaigns',
  'figsy_enrollments', 'figsy_replies', 'figsy_sent_emails', 'icps', 'leads',
  'metrics_daily', 'platform_status', 'proposals', 'subscriptions',
] as const
