// #626 — THE PDL MONTHLY CAP, SETTABLE WITHOUT SQL.
//
// The System check reads `app_settings.pdl_monthly_cap_usd` and reports NOT-MEASURED when it is
// absent: *"$2.80 spent this month, but no usable pdl_monthly_cap_usd setting exists, so there is
// nothing to measure it against — the code default applies."* The action it printed was "set
// pdl_monthly_cap_usd" — and there was **no way to do that**. It needed a SQL statement, and the
// Supabase dashboard is locked behind the same account flag that has kept GitHub Actions at zero
// runs since July. So the screen named a fix nobody could perform.
//
// ⚠️ THE KEY IS A CONSTANT BECAUSE TWO SPELLINGS OF ONE KEY IS A SILENT FAILURE. The probe reads
// it, the setter writes it, and if those two strings ever drift the founder sets a cap that the
// check cannot see and the check keeps reporting "not set" against a value that exists. Nothing
// errors. One constant, imported by both — the same lesson as `coldView` (#619) and
// `resolveActiveCampaign` (#625).
//
// ⚠️ THIS IS A DATA WRITE, NOT A SCHEMA CHANGE. `app_settings` already exists. Migrations stay
// frozen; nothing here creates or alters a table.

/** The one key. Read by the System probe, written by the operator route. Never re-typed. */
export const PDL_MONTHLY_CAP_KEY = 'pdl_monthly_cap_usd'

/** Above this and it is not a ceiling, it is a typo — $10,000 of sourcing is ~35,000 records. */
export const PDL_CAP_MAX_USD = 10_000

export type CapVerdict =
  | { ok: true; value: number }
  | { ok: false; error: string }

/**
 * Is this a usable monthly cap?
 *
 * Pure, so the rule is provable without a database — and so the route and any future caller
 * cannot disagree about what "valid" means.
 *
 * Rejects zero as well as negatives: a cap of $0 would read as "unset" to the probe (which tests
 * `cap <= 0`) while looking deliberately set to whoever typed it. Refusing it is the honest
 * direction — if the founder wants sourcing stopped, that is a kill-switch, not a $0 ceiling.
 */
export function validateCapUsd(raw: unknown): CapVerdict {
  const n = typeof raw === 'number' ? raw : Number(String(raw ?? '').trim())
  if (!Number.isFinite(n)) return { ok: false, error: 'The cap must be a number, in whole dollars.' }
  if (n <= 0) return { ok: false, error: 'The cap must be greater than $0. To stop sourcing entirely, use the kill-switch — a $0 cap reads as "unset" to the System check.' }
  if (n > PDL_CAP_MAX_USD) return { ok: false, error: `That is above the $${PDL_CAP_MAX_USD.toLocaleString()} ceiling — at ~$0.28 a record that is over 35,000 people. If it is deliberate, raise PDL_CAP_MAX_USD deliberately.` }
  return { ok: true, value: Math.round(n * 100) / 100 }
}
