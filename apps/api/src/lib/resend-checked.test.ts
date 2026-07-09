import { describe, it, expect } from 'vitest'
import { interpretSend } from './resend-checked'

describe('interpretSend (#338 — Resend returns {error}, never throws)', () => {
  it('ok when a message id came back and no error', () => {
    const v = interpretSend({ data: { id: 'msg_123' }, error: null })
    expect(v).toEqual({ ok: true, id: 'msg_123', error: null })
  })

  it('NOT ok when Resend returned an error (the phantom-send case)', () => {
    const err = { name: 'validation_error', message: 'Invalid recipient' }
    const v = interpretSend({ data: null, error: err })
    expect(v.ok).toBe(false)
    expect(v.id).toBeNull()
    expect(v.error).toBe(err)
  })

  it('NOT ok when there is no message id even without an explicit error', () => {
    const v = interpretSend({ data: null, error: null })
    expect(v.ok).toBe(false)
    expect(v.id).toBeNull()
    expect(v.error).toBeInstanceOf(Error)
  })

  it('NOT ok on a null/undefined result (network layer returned nothing)', () => {
    expect(interpretSend(null).ok).toBe(false)
    expect(interpretSend(undefined).ok).toBe(false)
  })

  it('error takes precedence even if a stray id is present', () => {
    const v = interpretSend({ data: { id: 'msg_x' }, error: { message: 'rate_limited' } })
    expect(v.ok).toBe(false)
    expect(v.id).toBeNull()
  })
})
