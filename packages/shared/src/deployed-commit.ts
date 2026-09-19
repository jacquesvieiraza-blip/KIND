// ── XC-4 · ONE RULE FOR "WHICH COMMIT IS THIS BUILD?", SHARED BY ALL FOUR SERVICES ──
//
// WHAT EARNED IT. `/health` on the API answered `commit: "unknown"` on every deploy this
// repo has ever made: it read only `RAILWAY_GIT_COMMIT_SHA`, and `scripts/ship.sh` deploys
// with `railway up` — a directory upload, not a git-source build — so Railway injects
// nothing for it. Meanwhile `ship.sh` wrote the exact short SHA into
// `apps/<app>/.deploy-stamp` before every upload, and nothing ever read it.
//
// The certification gate for MVP1 is "two consecutive clean runs on ONE SHA", and the
// release checklist's step 4 is "`/health.commit` equals the candidate short SHA on all
// four services". Neither sentence is executable by builds that cannot say what they are.
//
// WHY IT LIVES IN `@kind/shared`. Four services must answer the same question the same way:
// the API (Express), Milla (Next), Vida (Next) and the website (Express). Four copies of a
// lookup order is four chances for three of them to drift — the exact shape of the
// `normalisePort` and `_redirects` bugs this repo already paid for. So the RULE is here,
// pure and testable, and each service supplies only its own two-line file read.
//
// This module deliberately does NOT import `fs`: `@kind/shared` is consumed by browser
// bundles, and a node-only import here breaks both Next builds.

/** `git rev-parse --short` yields 7 characters on this repo. `/health` must match it. */
export const SHORT_SHA_LENGTH = 7

/** The honest answer when there is no evidence. Never a guess, never a fabrication. */
export const UNKNOWN_COMMIT = 'unknown'

export type CommitSource =
  | 'RAILWAY_GIT_COMMIT_SHA'
  | 'KIND_DEPLOY_COMMIT'
  | '.deploy-stamp'
  | 'none'

export interface DeployedCommit {
  commit: string
  source: CommitSource
}

/**
 * A commit-shaped value, shortened the way git shortens it — or null.
 *
 * Deliberately strict: hex only, at least `SHORT_SHA_LENGTH` characters. A stamp holding a
 * branch name, an error message or an HTML error page becomes `unknown`. **Echoing junk is
 * worse than admitting ignorance**, because the release checklist reads this field as a
 * verified identity.
 */
export function shortSha(raw: string | undefined | null): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!/^[0-9a-f]+$/i.test(trimmed)) return null
  if (trimmed.length < SHORT_SHA_LENGTH) return null
  return trimmed.slice(0, SHORT_SHA_LENGTH).toLowerCase()
}

export interface ResolveOptions {
  env: Record<string, string | undefined>
  /**
   * The `.deploy-stamp` contents, or null when absent. Supplied by the caller because the
   * four services find the file in four different places. May throw; this function
   * tolerates it — an unreadable stamp is no evidence, not a crash.
   */
  readStamp: () => string | null
}

/**
 * The lookup order, and the reason for it:
 *
 *   ① `RAILWAY_GIT_COMMIT_SHA` — when Railway builds from a git source it knows the commit
 *      first-hand. That outranks anything written by whoever ran the deploy.
 *   ② `KIND_DEPLOY_COMMIT` — an explicit operator override for a pipeline that is not
 *      Railway but does know its own commit.
 *   ③ `.deploy-stamp` — what `ship.sh` wrote next to the app, in the same run that
 *      uploaded it. `.gitignore` deliberately does not list it (see the note there) so it
 *      travels with the upload, and there is no `.dockerignore` to strip it.
 *   ④ nothing — `"unknown"`, and `source: 'none'` so the absence is legible.
 */
export function resolveDeployedCommit(opts: ResolveOptions): DeployedCommit {
  const fromRailway = shortSha(opts.env.RAILWAY_GIT_COMMIT_SHA)
  if (fromRailway) return { commit: fromRailway, source: 'RAILWAY_GIT_COMMIT_SHA' }

  const fromOverride = shortSha(opts.env.KIND_DEPLOY_COMMIT)
  if (fromOverride) return { commit: fromOverride, source: 'KIND_DEPLOY_COMMIT' }

  let stamp: string | null = null
  try {
    stamp = opts.readStamp()
  } catch {
    stamp = null
  }
  const fromStamp = shortSha(stamp)
  if (fromStamp) return { commit: fromStamp, source: '.deploy-stamp' }

  return { commit: UNKNOWN_COMMIT, source: 'none' }
}
