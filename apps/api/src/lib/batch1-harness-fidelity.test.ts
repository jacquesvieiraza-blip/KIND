// ═══════════════════════════════════════════════════════════════════════════════════════
// §8.2-H · THE HARNESS MUST NOT CLAIM STRONGER SCHEMA FIDELITY THAN IT PROVIDES
//
// ⛓️ 18 Sep — WRITTEN BECAUSE MY BATCH 1 RETURN OVER-CLAIMED. It listed the baseline, the 17
// superseded files and the one known-broken file, and then called §8.2-H green. Listing
// caveats is not reconciling them. GPT verification asked for one of two things: demonstrate
// that baseline + forward migrations IS the repo's authoritative supported path, or report a
// contract/code reality conflict.
//
// ── THE EVIDENCE SAYS IT IS THE SECOND, AND THE EVIDENCE IS CHECKABLE ──────────────────
//
// There is no supported path in this repository that constructs the database:
//
//   · there is no `supabase/config.toml`, so the Supabase CLI was never wired up;
//   · the ONLY glob over `supabase/migrations/` anywhere in the repo is `scripts/realdb.sh`
//     — this harness. Nothing in the product reads that directory;
//   · the product's one executor is `PENDING_MIGRATIONS`, a 74-key subset of 186 files, and
//     it exists to move production FORWARD, not to build a database;
//   · `docs/SCHEMA-DRIFT.md` (#558, derived from source) records that ~114 migrations were
//     "pasted into the Supabase SQL editor by hand, in an unrecorded order, at unrecorded
//     times, with no record of which ones took" — in an editor that can no longer be opened;
//   · three files each claim to BE the schema, declaring different table counts.
//
// So the harness's schema is a FOURTH path that the harness itself constructs. That is fine
// as object-level evidence — a CHECK constraint is a CHECK constraint — and it is NOT evidence
// about production's schema. This file exists so that distinction cannot quietly erode into
// "the repo's migrations are proven", which is the claim I actually made and should not have.
//
// ⚠️ THESE ARE ASSERTIONS ABOUT DISCLOSURE, and that is deliberate. The defect being guarded
// is not a broken function — it is a true-but-misleading report, which is the failure mode
// this whole repository's audit rules exist for.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '..', '..', '..', '..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

describe('§8.2-H · the facts the fidelity statement rests on are true TODAY', () => {
  it('the Supabase CLI is not wired up — nothing applies the directory for us', () => {
    // If this ever becomes false, the fidelity statement is out of date and the conflict may
    // be resolvable. Better to fail here than to keep telling the founder it is not.
    expect(existsSync(join(REPO, 'supabase/config.toml')),
      'supabase/config.toml now exists — re-read the §8.2-H fidelity statement, it may be stale').toBe(false)
  })

  it('the harness is the ONLY thing in the repo that globs the migration directory', () => {
    // 🛑 THE LOAD-BEARING FACT. If the product executed that directory, the harness would be
    // reproducing the supported path and §8.2-H would be satisfiable. It does not.
    const globbers: string[] = []
    const scan = (rel: string) => {
      const dir = join(REPO, rel)
      if (!existsSync(dir)) return
      for (const name of readdirSync(dir, { withFileTypes: true })) {
        if (name.name === 'node_modules' || name.name.startsWith('.')) continue
        const child = `${rel}/${name.name}`
        if (name.isDirectory()) { scan(child); continue }
        if (!/\.(ts|sh|yml|yaml)$/.test(name.name)) continue
        if (/\.test\.ts$/.test(name.name)) continue
        const src = read(child)
        if (/supabase\/migrations\/\*\.sql/.test(src)) globbers.push(child)
      }
    }
    scan('apps/api/src'); scan('apps/admin/src'); scan('packages'); scan('scripts'); scan('.github')
    expect(globbers, 'something other than the harness now executes the migration directory')
      .toEqual(['scripts/realdb.sh'])
  })

  it('the executor is a strict SUBSET of the record — it cannot build a database', () => {
    const runnerKeys = (read('apps/api/src/lib/pending-migrations.ts').match(/key:\s*'[^']+'/g) ?? []).length
    const files = readdirSync(join(REPO, 'supabase/migrations')).filter(f => f.endsWith('.sql')).length
    expect(runnerKeys).toBe(82)   // ⛓️ 81 → 82 on 22 Sep (MVP1 · Section 2): +1 20260922_unlimited_proof_refinement — see migration-home.test.ts for the full note.   // ⛓️ 80 → 81 on 19 Sep (MVP1 · J8 · FOUNDER RULING R134): +1 20260919_calibrated_restart_record_allowance — the one human-authorised calibrated restart carries its own 20 records, refused to automatic Proof, refused before the grant and gone once consumed. EXPAND ONLY: one function replaced, one defaulted parameter, and the pre-ruling two-argument signature dropped so no caller can reach the old fence by arity. NOT APPLIED.   // ⛓️ 79 → 80 on 19 Sep (MVP1 · J13, GPT correction pass): +1 20260919_one_canonical_sequence_per_campaign — one partial unique index closing the read-then-insert race that left a paid programme permanently unpreparable.   // ⛓️ 78 → 79 on 18 Sep (MVP1 · J6-C3 · PV 02): +1 20260918_proof_set_verdict — `clients.proof_stronger_set_unlocked_at` / `_reason`. `mayRequestStrongerSet` is the one spend gate between a client and their SECOND automatic Proof attempt, and it was derived, used and thrown away on every read: nothing recorded WHY a second set was unlocked at the moment the client was looking at the screen, and Vida's evidence panel did not carry the verdict at all. AN EVENT, NOT A MIRROR — the live derivation remains the gate and nothing reads these columns to spend, so there is nothing here for a live answer to drift away from. EXPAND ONLY: two nullable columns, no default, no backfill; a client unlocked before today reads NULL, which means 'not recorded', never 'refused'. NOT APPLIED.   // ⛓️ 77 → 78 on 18 Sep (MVP1 · J5-C4 · LR 10,12): +1 20260918_icp_target_size — `icps.target_size`, how big the target company should be IN THE CLIENT'S OWN WORDS. `company_sizes` is our closed six-band ladder and is to size exactly what `industries` is to category: an Apollo query hint, never the requirement. "Fifty to a hundred people" cannot be expressed in it, so it is snapped to ['11–50','51–200'] and the band rule then admits an 11-person company and a 190-person one as matches; "ten to fifty" is snapped to ['11–50'], which refuses the ten-person company the client explicitly asked for. Their phrase survived only inside `icp_review.requirements[].said`, which is CLEARED when an operator resolves the review. EXPAND ONLY: one nullable text column, no default, no backfill — an existing row reads NULL and the band rule answers for it unchanged. NOT APPLIED.   // ⛓️ 76 → 77 on 18 Sep (MVP1 · J5-C13 · FD-2): +1 20260918_lead_category_fit — `leads.category_fit` / `category_fit_reason`, the scoring model's verdict on whether a company is the KIND the client asked for. FD-2 makes that judgement model-interpreted, and a model cannot be called from `proof-fit.ts` (pure and synchronous, depended on by every surface) — so the model writes a FACT and the predicate reads it. EXPAND ONLY: two nullable text columns, no default, no backfill, CHECK admits NULL so no existing row is invalidated. NOT APPLIED.   // ⛓️ 75 → 76 on 18 Sep (MVP1 · J5-C12 · FD-1): +1 20260918_icp_exclusions — `icps.exclusions` did not exist and was ALREADY BEING WRITTEN: `lib/promotion.ts` includes it in the core-ICP insert whenever the confirmed brief holds it, and brief fact #10 is required by `mayConfirmBrief`, so every promoted client holds it and every promotion insert named a column Postgres does not have. Caught by `schema-truth.test.ts`. EXPAND ONLY: one nullable text column, no default, no backfill. NOT APPLIED.   // ⛓️ 74 → 75 on 18 Sep (MVP1 · J1-C1): +1 20260918_clients_one_per_user — `clients.user_id` carried NO unique index anywhere in this repository, so `POST /auth/onboard`'s check-then-insert let two concurrent onboards for ONE auth user BOTH succeed: one person, two client rows, and every downstream `.eq('user_id', …).maybeSingle()` picking one arbitrarily. EXPAND ONLY: one partial unique index, created inside a DO block that REFUSES and names the offending users if duplicates already exist — which of two client rows to keep is a decision about somebody's account, never a migration's. NOT APPLIED. (This is the migration whose addition required founder DECISION B, 18 Sep: the global migration-count assertion in the frozen `house-authority.test.ts` was removed, because that tripwire carries no House invariant and blocked every legitimate migration. The protection lives HERE.)
    expect(files).toBe(194)   // ⛓️ 193 → 194 on 22 Sep (MVP1 · Section 2 · FOUNDER RULING "2. unlimited now"): +1 20260922_unlimited_proof_refinement.sql — the canonical copy of the runner entry above, written in the same change. Replaces claim_proof_authority with the same body minus the `v_auto_used < 2` ceiling; no index moves, because proof_pass_claims_one_completed_automatic is keyed on (client_id, authority) and automatic_3 is simply a new value under it.   // ⛓️ 192 → 193 on 19 Sep (MVP1 · J8 · FOUNDER RULING R134): +1 20260919_calibrated_restart_record_allowance.sql — the canonical copy of the runner entry above, written in the same change.   // ⛓️ 191 → 192 on 19 Sep (MVP1 · J13, GPT correction pass): +1 20260919_one_canonical_sequence_per_campaign.sql — the canonical copy of the runner entry above, written in the same change.   // ⛓️ 190 → 191 on 18 Sep (MVP1 · J6-C3): +1 20260918_proof_set_verdict.sql — the canonical copy.   // ⛓️ 189 → 190 on 18 Sep (MVP1 · J5-C4): +1 20260918_icp_target_size.sql — the canonical copy.   // ⛓️ 188 → 189 on 18 Sep (MVP1 · J5-C13): +1 20260918_lead_category_fit.sql — the canonical copy.   // ⛓️ 187 → 188 on 18 Sep (MVP1 · J5-C12): +1 20260918_icp_exclusions.sql — the canonical copy. Every runner entry must have a home here, so the file count moves with the runner count.   // ⛓️ 186 → 187 on 18 Sep (MVP1 · J1-C1): +1 20260918_clients_one_per_user.sql — the canonical copy of the one-client-row-per-auth-user fence. Every runner entry must have a file here (§①), so the file count moves with the runner count above it.
    // The gap is the point: 112 canonical migrations the product has no mechanism to apply.
    expect(runnerKeys).toBeLessThan(files)
  })

  it('three files still each claim to be the schema, and they disagree', () => {
    // A harness has to pick one. Which one is authoritative is exactly the unresolved
    // question, so the count disagreement is asserted rather than described.
    const tables = (p: string) => (read(p).match(/^\s*create table/gim) ?? []).length
    const counts = {
      'packages/db/src/schema.sql': tables('packages/db/src/schema.sql'),
      'supabase/staging-schema.sql': tables('supabase/staging-schema.sql'),
      'supabase/MASTER_SCHEMA.sql': tables('supabase/MASTER_SCHEMA.sql'),
    }
    for (const [f, n] of Object.entries(counts)) expect(n, `${f} declares no tables`).toBeGreaterThan(0)
    expect(new Set(Object.values(counts)).size,
      'the three schema files now agree — the fidelity statement may be stale').toBeGreaterThan(1)
  })
})

describe('§8.2-H · the harness discloses its fidelity where it will actually be read', () => {
  const sh = read('scripts/realdb.sh')
  const readme = read('scripts/realdb/README.md')

  it('every `up` prints what a real-DB result does and does NOT mean', () => {
    // 🛑 A README NOBODY OPENS IS NOT A DISCLOSURE. The over-claim I made was made while the
    // caveats sat in a file I had written myself, so the statement has to be on the run.
    expect(sh).toContain('SCHEMA FIDELITY')
    const block = sh.slice(sh.indexOf('SCHEMA FIDELITY'))
    expect(block).toMatch(/NOT PROVEN/)
    expect(block).toMatch(/PRODUCTION/)
    expect(block).toMatch(/SNAPSHOT/)
    expect(block).toMatch(/SCHEMA-DRIFT/)
  })

  it('the README states the conflict, and does not pretend the harness resolves it', () => {
    expect(readme).toMatch(/CONTRACT ?\/ ?CODE REALITY CONFLICT/i)
    expect(readme).toMatch(/There is no migration path in this repository that constructs the database/)
    // It must name the decision as the founder's / Fable's, with real options — reporting a
    // conflict without options is just a complaint.
    expect(readme).toMatch(/Fable/)
    expect(readme).toMatch(/Adopt a baseline formally/)
    // …and it must not claim the item is done.
    expect(readme).toMatch(/§8\.2-H is \*\*NOT green\*\*/)
  })

  it('the harness still refuses to hide the three migration findings', () => {
    // Unchanged from Batch 1 and re-asserted here: the honest reconciliation replaces the
    // green claim, not the findings.
    expect(readme).toMatch(/cannot build the database from empty/)
    expect(readme).toMatch(/not re-runnable/)
    expect(readme).toMatch(/cannot execute anywhere/)
    expect(sh).toContain('KNOWN_BROKEN')
    // And a file that fails for any reason the rule does not cover still FAILS the harness.
    expect(sh).toMatch(/FAILED/)
  })
})
