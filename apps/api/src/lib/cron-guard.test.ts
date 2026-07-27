import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { cronsEnabled, slotFor, readClaimError, claimantId } from './cron-guard'

// #343 — TWO REPLICAS DOUBLED EVERY EMAIL AND EVERY CHARGE.
//
// `startCrons()` ran on every API process with no gate at all. The System screen has carried
// the warning for weeks: "if replicas > 1, every cron in cron.ts double-fires" — a client
// charged twice and a prospect emailed twice, on a schedule, silently.

describe('the env gate', () => {
  it('UNSET MEANS ON — a missing variable must never stop the whole business', () => {
    // The tempting default is off-unless-asked. It would mean one deploy without the
    // variable set stops every send, digest, drip and charge, and nobody finds out until a
    // client asks where their leads went. Doubling is prevented by the claim, not by this.
    expect(cronsEnabled(undefined).enabled).toBe(true)
    expect(cronsEnabled('').enabled).toBe(true)
  })

  it('turns off on every spelling of off', () => {
    for (const v of ['false', 'FALSE', '0', 'no', 'off', ' off ']) {
      expect(cronsEnabled(v).enabled, v).toBe(false)
    }
  })

  it('turns on on every spelling of on', () => {
    for (const v of ['true', 'TRUE', '1', 'yes', 'on']) {
      expect(cronsEnabled(v).enabled, v).toBe(true)
    }
  })

  it('A TYPO RUNS THE CRONS — it must not silently disable the company', () => {
    expect(cronsEnabled('fasle').enabled).toBe(true)
    expect(cronsEnabled('fasle').reason).toContain('not a value I understand')
  })

  it('always says WHY, so the startup log can be read at a glance', () => {
    expect(cronsEnabled(undefined).reason).toBeTruthy()
    expect(cronsEnabled('false').reason).toContain('DISABLED')
  })
})

describe('the slot key', () => {
  it('two fires in the same minute share a slot', () => {
    expect(slotFor(new Date('2026-07-27T08:00:00.100Z')))
      .toBe(slotFor(new Date('2026-07-27T08:00:00.900Z')))
  })

  it('ROUNDS, NOT TRUNCATES — clock skew across replicas straddles the minute boundary', () => {
    // This is the whole reason the function exists rather than a .slice(0,16). Truncation
    // puts these two in DIFFERENT slots, both claims succeed, and the job runs twice — the
    // exact bug, reintroduced by a rounding choice.
    const early = slotFor(new Date('2026-07-27T07:59:59.800Z'))
    const late  = slotFor(new Date('2026-07-27T08:00:00.200Z'))
    expect(early).toBe(late)
    expect(early).toBe('2026-07-27T08:00:00.000Z')
  })

  it('tolerates skew up to half a minute either side', () => {
    expect(slotFor(new Date('2026-07-27T07:59:40.000Z'))).toBe('2026-07-27T08:00:00.000Z')
    expect(slotFor(new Date('2026-07-27T08:00:20.000Z'))).toBe('2026-07-27T08:00:00.000Z')
  })

  it('genuinely different runs of the same job do NOT collide', () => {
    // /status/snapshot runs three times a day; each must get its own slot or two of the
    // three would be permanently suppressed as duplicates.
    expect(slotFor(new Date('2026-07-27T05:10:00Z'))).not.toBe(slotFor(new Date('2026-07-27T10:00:00Z')))
  })

  it('the same clock time on a different day is a different slot', () => {
    expect(slotFor(new Date('2026-07-27T08:00:00Z'))).not.toBe(slotFor(new Date('2026-07-28T08:00:00Z')))
  })
})

describe('reading the claim result', () => {
  it('no error means WE won the slot', () => {
    expect(readClaimError(null)).toEqual({ kind: 'claimed' })
  })

  it('A UNIQUE VIOLATION IS SUCCESS — somebody else got there first, and that is the point', () => {
    // The inversion that looks like a bug in review and is the feature in production.
    expect(readClaimError({ code: '23505', message: 'duplicate key value violates unique constraint' }).kind).toBe('taken')
  })

  it('recognises a duplicate from the message when the code is absent', () => {
    expect(readClaimError({ code: null, message: 'duplicate key value violates unique constraint "cron_claims_pkey"' }).kind).toBe('taken')
  })

  it('a MISSING TABLE is flagged as such — it means the migration has not been run', () => {
    const r = readClaimError({ code: '42P01', message: 'relation "cron_claims" does not exist' })
    expect(r.kind).toBe('unavailable')
    expect(r.kind === 'unavailable' && r.missingTable).toBe(true)
  })

  it('PostgREST\'s schema-cache wording counts as a missing table too', () => {
    const r = readClaimError({ code: 'PGRST205', message: "Could not find the table 'public.cron_claims' in the schema cache" })
    expect(r.kind === 'unavailable' && r.missingTable).toBe(true)
  })

  it('an ordinary outage is unavailable but NOT a missing table', () => {
    // Different fix entirely — one needs a migration, the other needs the database back.
    const r = readClaimError({ code: '08006', message: 'connection terminated unexpectedly' })
    expect(r.kind).toBe('unavailable')
    expect(r.kind === 'unavailable' && r.missingTable).toBe(false)
  })

  it('never mistakes a real failure for a won claim', () => {
    expect(readClaimError({ code: '08006', message: 'down' }).kind).not.toBe('claimed')
  })
})

describe('the claimant id', () => {
  it('prefers the replica id — the only thing that distinguishes two replicas', () => {
    expect(claimantId({ RAILWAY_REPLICA_ID: 'abcdef1234567890' } as NodeJS.ProcessEnv)).toBe('abcdef123456')
  })
  it('falls back to the hostname, then the pid — never empty', () => {
    expect(claimantId({ HOSTNAME: 'box-1' } as NodeJS.ProcessEnv)).toBe('box-1')
    expect(claimantId({} as NodeJS.ProcessEnv)).toMatch(/^pid-\d+$/)
  })
})

// ── THE WIRING. Pure functions nobody calls are how #1185 shipped "complete".
describe('the guard is actually WIRED', () => {
  const code = (p: string) => readFileSync(join(__dirname, p), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('startCrons refuses to schedule anything when the gate is off', () => {
    expect(code('../cron.ts')).toContain('cronsEnabled')
  })

  it('every job claims its slot before running', () => {
    const src = code('../cron.ts')
    expect(src).toContain('claimCronSlot')
    expect(src).toContain('slotFor')
  })

  it('the watchdog is claimed too — a duplicate ALERT is still a duplicate', () => {
    // checkSendsStalled does not go through callInternal, so it needs its own claim or two
    // replicas mail the founder the same stall twice an hour.
    const src = code('../cron.ts')
    const watchdog = src.slice(src.indexOf('checkSendsStalled'))
    expect(watchdog).toContain('claimCronSlot')
  })

  it('the claim table is in the runnable migration list', () => {
    expect(readFileSync(join(__dirname, './pending-migrations.ts'), 'utf8')).toContain('cron_claims')
  })

  it('the hardcoded job count is gone — it said 25 and there were 33', () => {
    // A startup line that reports a number nobody recounts is a small lie that gets believed.
    const src = code('../cron.ts')
    expect(src).not.toContain('25 jobs scheduled')
  })

  it('the System screen no longer claims replicas>1 double-fires — it no longer does', () => {
    expect(code('./system-probes.ts')).toContain('cron_claims')
  })
})
