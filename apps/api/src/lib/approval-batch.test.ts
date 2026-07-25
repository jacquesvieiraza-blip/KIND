import { describe, it, expect } from 'vitest'
import { requiredApprovals, checkBatch, batchLabel, MIN_BATCH_APPROVALS } from './approval-batch'

describe('the number is the founder-locked one', () => {
  it('20, and changing it changes what every client is asked to commit', () => {
    expect(MIN_BATCH_APPROVALS).toBe(20)
  })
})

describe('requiredApprovals', () => {
  it('a brand-new client with a full desk must pick 20', () => {
    expect(requiredApprovals(200, 0)).toBe(20)
  })

  it('never asks for more than they actually have to choose from', () => {
    // Demanding 20 of a client we only sent 12 people is an impossible gate, not a firm one.
    expect(requiredApprovals(12, 0)).toBe(12)
    expect(requiredApprovals(1, 0)).toBe(1)
  })

  it('counts what they have already committed', () => {
    expect(requiredApprovals(200, 5)).toBe(15)
    expect(requiredApprovals(200, 19)).toBe(1)
  })

  it('releases entirely once they are a working client', () => {
    // Past 20 they have committed. The gate exists to start the relationship, not to nag.
    expect(requiredApprovals(200, 20)).toBe(1)
    expect(requiredApprovals(200, 500)).toBe(1)
  })

  it('asks for nothing when there is nobody in front of them', () => {
    expect(requiredApprovals(0, 0)).toBe(0)
    expect(requiredApprovals(0, 50)).toBe(0)
  })

  it('treats junk as zero rather than letting a NaN open the gate', () => {
    expect(requiredApprovals(NaN, 0)).toBe(0)
    expect(requiredApprovals(200, -5)).toBe(20)
    expect(requiredApprovals(12.9, 0)).toBe(12)
  })
})

describe('checkBatch — the hard gate', () => {
  it('refuses one lead from a brand-new client', () => {
    // This is the whole point: a disabled button is a suggestion, the server is the gate.
    const r = checkBatch(1, 200, 0)
    expect(r.allowed).toBe(false)
    expect(r.required).toBe(20)
    expect(r.reason).toContain('19 more')
  })

  it('allows exactly the minimum', () => {
    expect(checkBatch(20, 200, 0).allowed).toBe(true)
  })

  it('allows more than the minimum', () => {
    expect(checkBatch(45, 200, 0).allowed).toBe(true)
  })

  it('allows a single approve once they are past the gate', () => {
    expect(checkBatch(1, 200, 20).allowed).toBe(true)
  })

  it('allows a short batch when that is everyone they have', () => {
    expect(checkBatch(12, 12, 0).allowed).toBe(true)
  })

  it('refuses an empty selection with something to do', () => {
    const r = checkBatch(0, 200, 0)
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe('Choose 20 to start.')
  })

  it('refuses honestly when there is nothing to approve at all', () => {
    const r = checkBatch(5, 0, 0)
    expect(r.allowed).toBe(false)
    expect(r.reason).toContain('nobody waiting')
  })

  it('says why in words a client can act on, never a bare number', () => {
    for (const [sel, avail, ever] of [[0, 200, 0], [3, 200, 0], [19, 200, 0], [5, 0, 0]]) {
      expect(/^\d+$/.test(checkBatch(sel, avail, ever).reason)).toBe(false)
    }
  })
})

describe('batchLabel', () => {
  it('counts them toward the target', () => {
    expect(batchLabel(0, 200, 0)).toBe('0 of 20 selected')
    expect(batchLabel(7, 200, 0)).toBe('7 of 20 selected')
  })

  it('says when they can go', () => {
    expect(batchLabel(20, 200, 0)).toBe('20 selected — ready to start')
    expect(batchLabel(31, 200, 0)).toBe('31 selected — ready to start')
  })

  it('drops the target language entirely once the gate is released', () => {
    expect(batchLabel(0, 200, 25)).toBe('Pick anyone you want us to work.')
    expect(batchLabel(3, 200, 25)).toBe('3 selected')
  })
})
