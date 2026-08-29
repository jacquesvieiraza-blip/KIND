// ═══════════════════════════════════════════════════════════════════════════════════════
// `20260829_delivery_rls` IS HELD OUT OF THE RUNNER, AND THIS IS WHAT KEEPS IT THERE.
//
// ⚠️ VIDA APPLIES ALL PENDING MIGRATIONS IN ONE ACTION. There is no per-migration apply, so
// "hold this one back" cannot be a note in a PR body or an instruction the founder remembers
// on the day — it has to be a property of the repository. The mechanism is simple: Vida runs
// `PENDING_MIGRATIONS` from `apps/api/src/lib/pending-migrations.ts`, so a migration with no
// entry there cannot be applied, whatever else is in the folder.
//
// WHY THIS ONE AND NOT THE OTHER FOUR. Meetings, delivery attribution, reply idempotency and
// provider eviction are additive and inert: new tables and nullable columns that nothing
// reads until the API is deployed. `delivery_rls` is different in kind — it changes what a
// signed-in BROWSER can read on nine live tables. Four of those are currently RLS-on with
// zero policies, so it RESTORES access rather than removing it, but whether anything else in
// production reads them on the anon/authenticated role is unverified. That is R2, and R2 is a
// runtime question no test in this repo can answer.
//
// 🛑 THE FAILURE THIS GUARDS IS INVISIBLE UNTIL A CLIENT SEES IT. Add a runner entry for this
// file and it goes out on the next "apply all pending" click — no error, no warning, and the
// first symptom is a client's dashboard behaving differently. So the absence is asserted.
//
// This is a PACKAGING control, not a scope change: the migration is written, reviewed and
// unchanged, and BUILD-003's twelve items are exactly as they were.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const REPO = join(__dirname, '../../../..')
const RUNNER = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
const runnerKeys = (RUNNER.match(/key:\s*'([^']+)'/g) ?? []).map(m => m.slice(m.indexOf("'") + 1, -1))

const HELD = '20260829_delivery_rls'

describe('the sweep is not vacuous', () => {
  it('the runner has entries to check', () => {
    expect(runnerKeys.length).toBeGreaterThan(0)
  })

  it('the other four PR 1 migrations ARE in the runner — so absence means something', () => {
    // Without this, the guard would pass on a runner that had lost every BUILD-003 entry, and
    // "delivery_rls is absent" would be true for the wrong reason.
    for (const k of ['20260829_meetings', '20260829_delivery_attribution',
                     '20260829_reply_idempotency', '20260829_provider_eviction']) {
      expect(runnerKeys, `${k} must be applied with the others`).toContain(k)
    }
  })
})

describe('DELIVERY_RLS IS NOT IN THE PENDING SET', () => {
  it('no runner entry exists for it — Vida cannot apply it', () => {
    expect(
      runnerKeys,
      'A runner entry for delivery_rls was added. Vida applies ALL pending migrations at once, so this would ship a live browser-access change while R2 is still open. Remove the entry; it goes in the follow-up PR after R2 closes.',
    ).not.toContain(HELD)
  })

  it('and its SQL does not reach the runner by any other route', () => {
    // A future edit could paste the statements into another entry's template rather than
    // adding a key. The distinctive policy names are what that would carry with it.
    for (const marker of ['figsy_sent_emails_own', 'blocklist_own', 'lead_pool_no_browser']) {
      expect(RUNNER, `delivery_rls SQL appears inside another runner entry (${marker})`).not.toContain(marker)
    }
  })
})

describe('THE FILE IS PRESERVED, NOT DELETED', () => {
  const path = join(REPO, 'supabase/migrations', `${HELD}.sql`)
  // ⚠️ READ LAZILY, NOT AT MODULE SCOPE. The first cut read it here; deleting the file then
  // threw during import and vitest reported "no tests" for the whole suite — a red build, but
  // one whose message says nothing about what happened. A guard is only useful if its failure
  // names the mistake, so the deletion now fails as an assertion with a sentence attached.
  const sqlOrNull = () => { try { return readFileSync(path, 'utf8') } catch { return null } }

  it('it still sits in the canonical directory with its siblings', () => {
    expect(
      sqlOrNull(),
      `${HELD}.sql has been DELETED. It is held out of the runner, not out of the repository — the follow-up PR after R2 needs this exact content.`,
    ).not.toBeNull()
    expect(readdirSync(join(REPO, 'supabase/migrations'))).toContain(`${HELD}.sql`)
  })

  it('its content is intact — every policy the review accepted', () => {
    // The follow-up PR adds a runner entry. It does NOT rewrite the migration, and this is
    // what would fail if someone "tidied" it in the meantime.
    for (const marker of [
      'figsy_campaigns_own', 'figsy_enrollments_own', 'figsy_replies_own', 'figsy_sent_emails_own',
      'blocklist_own', 'DROP POLICY IF EXISTS "blocklist_read"', 'DROP POLICY IF EXISTS "blocklist_write"',
      'ALTER TABLE public.lead_pool       ENABLE ROW LEVEL SECURITY',
      'ALTER TABLE public.sourcing_ledger ENABLE ROW LEVEL SECURITY',
      'CREATE OR REPLACE FUNCTION public.current_client_id',
    ]) {
      expect(sqlOrNull() ?? '', `delivery_rls lost: ${marker}`).toContain(marker)
    }
  })

  it('the file SAYS it is held, so nobody "fixes" the missing entry', () => {
    // The most likely way this breaks is somebody noticing a canonical file with no runner
    // entry, assuming it was an oversight, and helpfully adding one.
    expect(sqlOrNull() ?? '').toContain('HELD OUT OF THE RUNNER ON PURPOSE')
    expect(sqlOrNull() ?? '').toMatch(/R2/)
  })

  it('its tests are untouched — the design stays under review', () => {
    // tenant-isolation.test.ts reads this exact path. Holding the migration back must not
    // quietly retire the 27 assertions that reviewed it.
    const iso = readFileSync(join(__dirname, 'tenant-isolation.test.ts'), 'utf8')
    expect(iso).toContain(`supabase/migrations/${HELD}.sql`)
  })
})
