import { describe, it, expect, vi, beforeEach } from 'vitest'

// #343 — THE RACE, ACTUALLY SETTLED.
//
// The source-scan guards in lib/cron-guard.test.ts prove the claim is CALLED. They cannot
// prove a second caller stands down — and "the loser stands down" is the entire feature.
// This drives the real function against a database that behaves the way Postgres does when
// two processes insert the same primary key.

const state = {
  claimed: new Set<string>(),
  failWith: null as { code?: string; message: string } | null,
  alerts: [] as string[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: () => ({
      insert: async (row: { job: string; slot: string }) => {
        if (state.failWith) return { error: state.failWith }
        const key = `${row.job}@${row.slot}`
        // Exactly what Postgres does on a duplicate primary key.
        if (state.claimed.has(key)) {
          return { error: { code: '23505', message: 'duplicate key value violates unique constraint "cron_claims_pkey"' } }
        }
        state.claimed.add(key)
        return { error: null }
      },
      delete: () => ({ lt: async () => ({ error: null }) }),
    }),
  },
}))

vi.mock('./lib/alerts', () => ({
  sendFounderAlert: vi.fn(async (_kind: string, subject: string) => { state.alerts.push(subject) }),
}))

import { claimCronSlot } from './cron'

beforeEach(() => {
  state.claimed.clear()
  state.failWith = null
  state.alerts.length = 0
})

describe('two processes, one scheduled minute', () => {
  const at = new Date('2026-07-27T08:00:00.000Z')

  it('the first process claims the slot', async () => {
    expect((await claimCronSlot('/figsy/send-due-all', at)).kind).toBe('claimed')
  })

  it('THE SECOND STANDS DOWN — this is the whole item', async () => {
    // Without this, both replicas send the same batch of emails to the same prospects.
    await claimCronSlot('/figsy/send-due-all', at)
    expect((await claimCronSlot('/figsy/send-due-all', at)).kind).toBe('taken')
  })

  it('a third and fourth stand down too', async () => {
    await claimCronSlot('/figsy/send-due-all', at)
    for (let i = 0; i < 3; i++) {
      expect((await claimCronSlot('/figsy/send-due-all', at)).kind).toBe('taken')
    }
  })

  it('replicas whose clocks straddle the minute boundary still collide', async () => {
    // The rounding in slotFor is what makes this true; truncation would let both through.
    expect((await claimCronSlot('/leads/drip', new Date('2026-07-27T07:59:59.800Z'))).kind).toBe('claimed')
    expect((await claimCronSlot('/leads/drip', new Date('2026-07-27T08:00:00.200Z'))).kind).toBe('taken')
  })
})

describe('what must still be allowed to run', () => {
  it('a DIFFERENT job in the same minute is not blocked', async () => {
    const at = new Date('2026-07-27T08:00:00Z')
    expect((await claimCronSlot('/leads/drip', at)).kind).toBe('claimed')
    expect((await claimCronSlot('/figsy/check-performance', at)).kind).toBe('claimed')
  })

  it('the SAME job tomorrow is not blocked — the guard must not be a one-shot', async () => {
    expect((await claimCronSlot('/leads/drip', new Date('2026-07-27T08:00:00Z'))).kind).toBe('claimed')
    expect((await claimCronSlot('/leads/drip', new Date('2026-07-28T08:00:00Z'))).kind).toBe('claimed')
  })

  it('/status/snapshot runs three times a day, each an independent slot', async () => {
    for (const t of ['05:10', '10:00', '17:00']) {
      expect((await claimCronSlot('/status/snapshot', new Date(`2026-07-27T${t}:00Z`))).kind).toBe('claimed')
    }
  })
})

describe('when the claim cannot be made at all', () => {
  it('a MISSING TABLE reports unavailable — the job is not silently skipped', async () => {
    // Failing closed here would stop every send, digest, drip and charge in the business the
    // moment a migration lagged a deploy. The job runs; the alert is the safety net.
    state.failWith = { code: '42P01', message: 'relation "cron_claims" does not exist' }
    const r = await claimCronSlot('/leads/drip', new Date())
    expect(r.kind).toBe('unavailable')
    expect(r.kind === 'unavailable' && r.missingTable).toBe(true)
  })

  it('a database outage is unavailable, and NOT reported as a missing table', async () => {
    state.failWith = { code: '08006', message: 'connection terminated unexpectedly' }
    const r = await claimCronSlot('/leads/drip', new Date())
    expect(r.kind === 'unavailable' && r.missingTable).toBe(false)
  })

  it('an unavailable claim is never mistaken for a won one', async () => {
    state.failWith = { code: '08006', message: 'down' }
    expect((await claimCronSlot('/leads/drip', new Date())).kind).not.toBe('claimed')
  })
})
