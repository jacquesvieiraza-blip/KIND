// ══════════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE MIGRATION RUNNER FINISHES — 23 Sep 2026
//
// ── WHAT WAS WRONG, AND IT HAD ALREADY STRANDED TWO MIGRATIONS ON PRODUCTION ────────────
//
// `runPendingMigrations` ran EVERY key on its own fresh connection, every time, whatever the
// ledger said. At 84 keys the run no longer reached the end of its own array before the request
// died — and the entries at the end are, by definition, the ones somebody is waiting for.
//
// `20260922_unlimited_proof_refinement` sat unapplied on production for a day for exactly this
// reason. The screen reported "not run" honestly and there was nothing anyone could do about
// it: pressing the button again restarted the same 84 and died in the same place. The feature
// that migration enables had been merged, deployed, and inert, and nothing said so.
//
// ⚠️ THE EARLIER FIX WAS A HALF-FIX AND IS UNTOUCHED. Recording each outcome as it lands made
// the progress VISIBLE, which was right. A visible stall is still a stall.
//
// ── THE RULE THE SKIP IS BUILT ON, AND IT IS ASYMMETRIC ON PURPOSE ──────────────────────
//
// 🛑 SKIP ONLY WHAT WE POSITIVELY KNOW SUCCEEDED. Re-running an idempotent migration costs one
// connection. Skipping one we were NOT sure about leaves a column missing and every reader of
// it broken — on a database nobody is looking at, because the screen will say it is applied.
// So `never_run`, a recorded FAILURE, and an unreadable ledger all still run.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const REPO = join(__dirname, '../../../..')

/** Executable code only — this file's own commentary quotes the rules it asserts. */
function strip(file: string): string {
  const raw = readFileSync(join(REPO, file), 'utf8')
  let inBlock = false
  return raw.split('\n').map(l => {
    const x = l.trim()
    if (inBlock) { if (x.endsWith('*/') || x.endsWith('*/}')) inBlock = false; return '' }
    if (x.startsWith('/*')) { if (!x.endsWith('*/')) inBlock = true; return '' }
    if (x.startsWith('{/*')) { if (!x.endsWith('*/}')) inBlock = true; return '' }
    const i = l.search(/(?<!:)\/\//)
    return i >= 0 ? l.slice(0, i) : l
  }).join('\n')
}

const RUNNER = strip('apps/api/src/lib/pending-migrations.ts')
const ROUTE  = strip('apps/api/src/routes/operator.ts')
const ENGINE = strip('apps/admin/src/app/vida/engine/page.tsx')

describe('🛑 the runner skips what is already applied', () => {
  it('the sources were read and are not empty', () => {
    expect(RUNNER.length).toBeGreaterThan(10_000)
    expect(ROUTE.length).toBeGreaterThan(10_000)
    expect(ENGINE.length).toBeGreaterThan(2_000)
  })

  it('🛑 THE LOOP HAS A SKIP AT ALL — this is the whole fix', () => {
    expect(RUNNER, 'the run still replays every key and will strand the newest again')
      .toMatch(/if \(skip\.has\(m\.key\)\)/)
    expect(RUNNER).toMatch(/continue\b/)
  })

  it('a skipped key is reported as skipped, never as freshly applied', () => {
    // A skip that looked identical to an apply would hide the fact that a run did almost
    // nothing — the state an operator most needs to see.
    expect(RUNNER).toMatch(/skipped: true/)
  })

  it('🛑 ONLY A RECORDED SUCCESS IS SKIPPED', () => {
    // `last_outcome === 'ok'`, or the older two-column ledger's "there is a row and it has an
    // applied_at". A recorded FAILURE is not a success and must run again.
    expect(RUNNER).toMatch(/outcome === 'ok'/)
    expect(RUNNER).toMatch(/applied_at != null/)
  })

  it('🛑 AN UNREADABLE LEDGER SKIPS NOTHING — it must never read as "all applied"', () => {
    // The dangerous failure: a ledger we could not read answering "everything is done", after
    // which the run applies nothing and the screen agrees with it.
    expect(RUNNER).toMatch(/skip\.clear\(\)/)
  })

  it('the ledger is read on the RUNNER’s own connection, not through PostgREST', () => {
    // This function talks to DATABASE_URL directly and may reach a different database than the
    // API client does. Asking one database what to skip and writing to another is how a
    // migration gets skipped on the box that never had it.
    const at = RUNNER.indexOf('const skip = new Set<string>()')
    expect(at, 'the skip set is gone').toBeGreaterThan(-1)
    const body = RUNNER.slice(at, at + 1_400)
    expect(body).toContain('connectionString: working')
    expect(body, 'the skip list came from PostgREST rather than the target database')
      .not.toMatch(/from\('app_migrations_applied'\)/)
  })

  it('it tolerates the older ledger, whose outcome columns do not exist', () => {
    const at = RUNNER.indexOf('const skip = new Set<string>()')
    const body = RUNNER.slice(at, at + 1_400)
    expect(body).toContain('select key, applied_at from public.app_migrations_applied')
  })

  it('the probe connection is always closed, even when the read throws', () => {
    const at = RUNNER.indexOf('const skip = new Set<string>()')
    const body = RUNNER.slice(at, at + 1_400)
    expect(body).toMatch(/finally \{/)
    expect(body).toMatch(/probe\.end\(\)/)
  })
})

describe('🛑 force exists, and it is not the default', () => {
  it('the default run skips; only an explicit force replays everything', () => {
    // Force is for the one case skipping is wrong: a migration whose BODY changed after it ran.
    expect(RUNNER).toMatch(/if \(!opts\?\.force\)/)
    expect(ROUTE).toMatch(/\.force === true/)
  })

  it('🛑 THE ROUTE DEFAULTS TO SKIPPING — a missing body must not force a replay', () => {
    // `{}` is what the button posts. If an absent flag meant "force", the fix would do nothing.
    expect(ROUTE).toMatch(/const force = \(req\.body \?\? \{\}\)\.force === true/)
  })
})

describe('🛑 the audit row and the screen both tell apart "ran" from "was already there"', () => {
  it('the audit row counts skips separately from applies', () => {
    // Folding a skip into `ran` would make the audit claim this run applied 84 migrations when
    // it applied three — and the audit row is the only durable record of what a press did.
    expect(ROUTE).toMatch(/ran: results\.filter\(r => r\.ok && !r\.skipped\)/)
    expect(ROUTE).toMatch(/skipped: results\.filter\(r => r\.skipped\)\.length/)
    expect(ROUTE).toMatch(/forced: force/)
  })

  it('the screen does not call a skipped migration an applied one', () => {
    expect(ENGINE).toMatch(/r\.ok && !r\.skipped/)
    expect(ENGINE).toMatch(/r\.skipped/)
  })

  it('🛑 AND A RUN WITH NOTHING TO DO SAYS SO, rather than "0 migrations applied"', () => {
    // The most reassuring outcome there is, and the one most easily mistaken for a failure.
    expect(ENGINE).toMatch(/ran === 0 && skipped > 0/)
    expect(ENGINE).toContain('Nothing to apply')
  })
})

describe('🛑 the thing that made this urgent is still true', () => {
  it('there are more migrations than the old run could reach', () => {
    // Not an arbitrary number: it is the count that broke the runner. If this ever falls back
    // under a couple of dozen the skip is still correct, but the urgency below is history.
    const keys = (readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
      .match(/^ {4}key: '/gm) ?? []).length
    expect(keys).toBeGreaterThan(80)
  })

  it('each migration still gets its own connection — one failure stops nothing', () => {
    // The property the skip must not have broken: the loop still isolates per migration.
    expect(RUNNER).toMatch(/A fresh connection per migration so one failure cannot poison the next|new Client\(\{ connectionString: working/)
  })
})
