import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 NO LIVE PATH MAY BYPASS THE DURABLE PROOF AUTHORITY LEDGER (S2-AUDIT-001 · R119).
//
// ── WHY A SOURCE SCAN, AND WHY IT IS THE RIGHT INSTRUMENT HERE ─────────────────────────
//
// Before this build, Proof authority was decided in TWO places by TWO mechanisms: a counter
// (`try_claim_proof_pass` -> `clients.proof_passes_done`) and a compare-and-set on a second
// column (`claimCalibratedRestart` -> `clients.proof_calibrated_restart_used_at`). Neither
// could be released, and having two of them is how the restart drifted into a per-resolution
// allowance that R119 forbids and that was live in `main`.
//
// It is now ONE ledger. Both old mechanisms are LEFT IN PLACE for rollback — the founder's
// condition, verbatim: "Old RPC/function may remain for rollback compatibility only if ZERO
// live caller can reach it." That condition is not a comment; it is this file.
//
// ⚠️ A BEHAVIOURAL TEST CANNOT ASSERT AN ABSENCE. "No code path anywhere writes this column"
// is a statement about the whole repository, and the only instrument that can check it is a
// scan. The scan is therefore written to be HARD TO FOOL: it strips comments before looking
// (so the prose above cannot satisfy or break it), it reads every .ts file under apps/ and
// packages/ rather than a hand-listed set, and it names the one permitted residue explicitly
// instead of pattern-matching around it.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = join(__dirname, '../../../..')

/**
 * Strip block comments and `//` / `--` line comments.
 *
 * 🛑 STRIPPING `--` IS NOT OPTIONAL, AND THIS FILE PROVED IT THE HARD WAY. Assertion ⑨ below
 * forbids the pattern `proof_passes_legacy = proof_passes_done` in the migration — and the
 * migration's OWN PROSE quotes that pattern, because it explains why the founder refused it.
 * The first cut of the test read the raw file and failed on its own documentation.
 *
 * `constraint-ownership.test.ts` records the same lesson in its header: "a scanner that reads
 * raw text finds 'ownership' in commentary and passes on a repo that is actually broken.
 * That mistake has already been made five times in this repo." It is now six.
 *
 * ⚠️ THE `(?<!:)` ON `//` keeps `https://…` from truncating a line at the scheme separator.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(line => {
      const dash = line.indexOf('--')
      const slash = line.search(/(?<!:)\/\//)
      const cut = [dash, slash].filter(i => i >= 0).sort((a, b) => a - b)[0]
      return cut === undefined ? line : line.slice(0, cut)
    })
    .join('\n')
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, out)
    else if (/\.tsx?$/.test(entry)) out.push(full)
  }
  return out
}

/** Every TypeScript file that SHIPS — tests excluded, because a test may name anything. */
const LIVE_FILES = [join(REPO, 'apps'), join(REPO, 'packages')]
  .flatMap(root => walk(root))
  .filter(f => !/\.test\.tsx?$/.test(f))
  .map(f => ({ path: f.slice(REPO.length + 1), src: stripComments(readFileSync(f, 'utf8')) }))

/**
 * `pending-migrations.ts` carries every migration's SQL as a string, so it necessarily
 * contains the words `try_claim_proof_pass` and `proof_passes_done`. It is the MIGRATION
 * MIRROR, not a code path — its own guard is that the SQL matches `supabase/migrations`.
 */
const MIRROR = 'apps/api/src/lib/pending-migrations.ts'

/**
 * The one permitted rollback residue. It writes the mirror column directly and is
 * superseded; what makes it safe is that nothing live calls it, which is asserted below.
 */
const ROLLBACK_ONLY = 'apps/api/src/lib/proof-calibration-io.ts'

describe('no live path bypasses the durable Proof authority ledger', () => {
  it('① the superseded claim RPC has ZERO live callers', () => {
    const callers = LIVE_FILES
      .filter(f => f.path !== MIRROR)
      .filter(f => /\.rpc\(\s*['"`]try_claim_proof_pass['"`]/.test(f.src))
      .map(f => f.path)
    expect(callers, 'try_claim_proof_pass is invoked by live code — the ledger is bypassed').toEqual([])
  })

  it('② the superseded restart claimer has ZERO live callers', () => {
    const callers = LIVE_FILES
      .filter(f => f.path !== ROLLBACK_ONLY)
      .filter(f => /claimCalibratedRestart\s*[({]/.test(f.src) || /\bclaimCalibratedRestart\b\s*=/.test(f.src))
      .map(f => f.path)
    expect(callers, 'claimCalibratedRestart is called by live code — it writes the mirror without a claim row').toEqual([])
  })

  /**
   * Does `column:` appear as a key inside a supabase `.update({...})` / `.insert({...})`?
   *
   * ⚠️ THE DISCRIMINATOR HAD TO BE THIS, AND THE FIRST VERSION WAS WRONG. Matching
   * `proof_passes_done:` anywhere flagged `milla-summary.ts`, which builds a RETURN OBJECT
   * (`proof_passes_done: Number(client?.proof_passes_done ?? 0)`) — a read projection, not a
   * write. A guard that cannot tell a read from a write is a guard that gets deleted the
   * first time it cries wolf, so it now requires an actual write call in front of the key.
   */
  function writesColumn(src: string, column: string): boolean {
    const re = new RegExp(`${column}\\s*:`, 'g')
    for (let m = re.exec(src); m; m = re.exec(src)) {
      const before = src.slice(Math.max(0, m.index - 300), m.index)
      if (/\.(update|insert|upsert)\(\s*\{?[^)]*$/.test(before)) return true
    }
    return new RegExp('set\\s+' + column).test(src)
  }

  it('③ nothing live WRITES clients.proof_passes_done — it is a mirror, maintained by the ledger', () => {
    const writers = LIVE_FILES
      .filter(f => f.path !== MIRROR)
      .filter(f => writesColumn(f.src, 'proof_passes_done'))
      .map(f => f.path)
    expect(writers, 'live code writes proof_passes_done directly — the mirror and the ledger can disagree').toEqual([])
  })

  it('④ only the rollback-only function writes clients.proof_calibrated_restart_used_at', () => {
    const writers = LIVE_FILES
      .filter(f => f.path !== MIRROR)
      .filter(f => writesColumn(f.src, 'proof_calibrated_restart_used_at'))
      .map(f => f.path)
    // 🛑 IF THIS LIST EVER GROWS, A SECOND AUTHORITY MECHANISM HAS BEEN REINTRODUCED — which
    // is exactly how the restart drifted the first time.
    expect(writers).toEqual([ROLLBACK_ONLY])
  })

  it('⑤ the Proof route claims through the ledger and nothing else', () => {
    const route = LIVE_FILES.find(f => f.path === 'apps/api/src/routes/icps.ts')!
    expect(route.src).toMatch(/claimProofAuthority\(/)
    expect(route.src).toMatch(/settleProofClaim\(/)
    expect(route.src).not.toMatch(/\.rpc\(\s*['"`]try_claim_proof_pass['"`]/)
    expect(route.src).not.toMatch(/claimCalibratedRestart/)
  })

  it('⑥ the grant route can only move restart_at out of NULL once (R119)', () => {
    const op = LIVE_FILES.find(f => f.path === 'apps/api/src/routes/operator.ts')!
    // The struck per-resolution filter must be gone, and the once-only guard present.
    expect(op.src).toMatch(/\.is\('proof_calibrated_restart_at',\s*null\)/)
    expect(op.src).not.toMatch(/proof_calibrated_restart_at\.lt\./)
  })

  it('⑦ the ledger migration lives in BOTH homes with the same statements', () => {
    const sql = stripComments(readFileSync(join(REPO, 'supabase/migrations/20260912_proof_pass_claims.sql'), 'utf8'))
    const mirror = stripComments(readFileSync(join(REPO, MIRROR), 'utf8'))
    // Every object the migration creates must be named in the runner's copy too.
    for (const object of [
      'proof_pass_claims',
      'proof_pass_claims_one_open',
      'proof_pass_claims_one_completed_automatic',
      'proof_pass_claims_one_completed_restart',
      'claim_proof_authority',
      'settle_proof_claim',
      'classify_legacy_proof_passes',
      'classify_legacy_restart',
      'proof_passes_legacy',
    ]) {
      expect(sql, `${object} missing from the .sql file`).toContain(object)
      expect(mirror, `${object} missing from PENDING_MIGRATIONS`).toContain(object)
    }
  })

  it('⑧ the restart index is keyed on client_id ALONE, never on the grant (R119)', () => {
    const sql = stripComments(readFileSync(join(REPO, 'supabase/migrations/20260912_proof_pass_claims.sql'), 'utf8'))
    const idx = /create unique index if not exists proof_pass_claims_one_completed_restart\s*\n\s*on public\.proof_pass_claims \(([^)]*)\)/i.exec(sql)
    expect(idx, 'the one-restart index is missing').toBeTruthy()
    expect(idx![1].trim()).toBe('client_id')
    // Keying it on the grant timestamp is the per-resolution model R119 forbids.
    expect(idx![1]).not.toContain('restart_grant_at')
  })

  it('⑨ proof_passes_legacy is nullable, has no default and is never backfilled', () => {
    const sql = stripComments(readFileSync(join(REPO, 'supabase/migrations/20260912_proof_pass_claims.sql'), 'utf8'))
    expect(sql).toMatch(/add column if not exists proof_passes_legacy int;/)
    expect(sql).not.toMatch(/proof_passes_legacy int not null/i)
    expect(sql).not.toMatch(/proof_passes_legacy\s+int\s+default/i)
    // 🛑 THE FOUNDER REFUSED A BACKFILL BY NAME: snapshotting the counter "would memorialise
    // the defect we are fixing". So the migration must contain NO statement that derives the
    // legacy floor from `proof_passes_done`, in any spelling.
    expect(sql).not.toMatch(/proof_passes_legacy\s*=\s*coalesce\(\s*proof_passes_done/i)
    expect(sql).not.toMatch(/proof_passes_legacy\s*=\s*proof_passes_done/i)
    // ⚠️ EXACTLY TWO WRITERS, BOTH INSIDE A FUNCTION BODY, NEITHER AT MIGRATION TIME.
    //   · `claim_proof_authority` writes 0 for a brand-new client — a FACT (no claims, counter
    //     0, nothing to reconstruct), established explicitly so no arithmetic touches NULL;
    //   · `classify_legacy_proof_passes` writes the operator's audited judgement.
    // A third writer, or either one appearing before the first `create or replace function`,
    // would be a backfill by another name.
    const lines = sql.split('\n')
    const legacyWrites = lines.filter(l => /set\s+proof_passes_legacy/i.test(l))
    expect(legacyWrites.length, 'unexpected number of proof_passes_legacy writers').toBe(2)
    const firstFunction = sql.indexOf('create or replace function')
    for (const w of legacyWrites) {
      expect(sql.indexOf(w), 'a proof_passes_legacy write sits OUTSIDE a function — that is a backfill')
        .toBeGreaterThan(firstFunction)
    }
  })
})
