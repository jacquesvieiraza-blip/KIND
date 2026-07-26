import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { encryptSecret, decryptSecret, describeCipher, secretState } from './inbox-secret'

// Option B's cost is that we hold one mailbox password per client. These tests are the
// receipt on that: encrypted at rest, authenticated so tampering fails loudly, a fresh IV
// every time, and **no key means no send** — never a quiet fallback to our shared address.

const KEY_A = 'a'.repeat(64)
const KEY_B = 'b'.repeat(64)
const original = process.env.INBOX_SECRET_KEY

beforeEach(() => { process.env.INBOX_SECRET_KEY = KEY_A })
afterEach(() => {
  if (original === undefined) delete process.env.INBOX_SECRET_KEY
  else process.env.INBOX_SECRET_KEY = original
})

describe('round trip', () => {
  it('what goes in comes back out', () => {
    const pw = 'x9!Kq2$vLm8#Tz'
    expect(decryptSecret(encryptSecret(pw))).toBe(pw)
  })

  it('handles the characters real mailbox passwords contain', () => {
    for (const pw of ['abcd efgh ijkl mnop', 'p@ss:word:with:colons', 'ünïcodé—ok', '"quoted"']) {
      expect(decryptSecret(encryptSecret(pw))).toBe(pw)
    }
  })

  it('a colon in the password cannot break the v1:iv:tag:body framing', () => {
    // The stored format is colon-delimited and the ciphertext is hex, so a colon in the
    // PLAINTEXT can never leak into the framing. Pinned because a naive format would split.
    const stored = encryptSecret('a:b:c:d:e')
    expect(stored.split(':')).toHaveLength(4)
    expect(decryptSecret(stored)).toBe('a:b:c:d:e')
  })
})

describe('the ciphertext gives nothing away', () => {
  it('never contains the plaintext', () => {
    expect(encryptSecret('SuperSecret123')).not.toContain('SuperSecret123')
  })

  it('encrypting the same password twice produces different output', () => {
    // A fresh random IV per encryption. Reusing an IV under one key is how GCM is broken,
    // and identical ciphertexts would also reveal that two clients share a password.
    expect(encryptSecret('same')).not.toBe(encryptSecret('same'))
  })

  it('is versioned, so a future scheme can co-exist with stored rows', () => {
    expect(encryptSecret('x').startsWith('v1:')).toBe(true)
  })
})

describe('it fails loudly, never silently', () => {
  it('a tampered ciphertext throws rather than decrypting to garbage', () => {
    // This is why GCM and not CBC: garbage handed to a mail server as a password is a
    // lockout, and a lockout on a warmed mailbox is expensive.
    const stored = encryptSecret('correct horse')
    const parts = stored.split(':')
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('00') ? '11' : '00')
    expect(() => decryptSecret(parts.join(':'))).toThrow()
  })

  it('the wrong key throws — it does not return a plausible string', () => {
    const stored = encryptSecret('correct horse')
    process.env.INBOX_SECRET_KEY = KEY_B
    expect(() => decryptSecret(stored)).toThrow()
  })

  it('a value from an older/unknown format throws with a fixable message', () => {
    expect(() => decryptSecret('plaintextpassword')).toThrow(/re-entered/i)
  })

  it('refuses to store an empty password', () => {
    expect(() => encryptSecret('')).toThrow()
  })
})

describe('no key = no send', () => {
  it('reports the key as missing before anything is attempted', () => {
    delete process.env.INBOX_SECRET_KEY
    const s = secretState()
    expect(s.ok).toBe(false)
    if (!s.ok) expect(s.reason).toBe('missing')
  })

  it('reports a wrong-length key as malformed rather than half-working', () => {
    process.env.INBOX_SECRET_KEY = 'abc123'
    const s = secretState()
    expect(s.ok).toBe(false)
    if (!s.ok) expect(s.reason).toBe('malformed')
  })

  it('rejects a 64-character key that is not hex', () => {
    process.env.INBOX_SECRET_KEY = 'z'.repeat(64)
    expect(secretState().ok).toBe(false)
  })

  it('throws on use when there is no key, so the caller must refuse the send', () => {
    delete process.env.INBOX_SECRET_KEY
    expect(() => encryptSecret('x')).toThrow(/INBOX_SECRET_KEY/)
    expect(() => decryptSecret('v1:00:00:00')).toThrow(/INBOX_SECRET_KEY/)
  })

  it('tolerates surrounding whitespace on a pasted key', () => {
    process.env.INBOX_SECRET_KEY = `  ${KEY_A}\n`
    expect(secretState().ok).toBe(true)
    expect(decryptSecret(encryptSecret('ok'))).toBe('ok')
  })
})

describe('what a screen may show about a stored password', () => {
  it('never the value — only that it is set, plus a fingerprint', () => {
    const stored = encryptSecret('SuperSecret123')
    const shown = describeCipher(stored)
    expect(shown).not.toContain('SuperSecret123')
    expect(shown).not.toContain(stored)
    expect(shown).toMatch(/^set · fingerprint [0-9a-f]{8}$/)
  })

  it('says so plainly when nothing is stored', () => {
    expect(describeCipher(null)).toBe('not set')
    expect(describeCipher(undefined)).toBe('not set')
    expect(describeCipher('')).toBe('not set')
  })

  it('two different passwords are distinguishable without revealing either', () => {
    expect(describeCipher(encryptSecret('one'))).not.toBe(describeCipher(encryptSecret('two')))
  })
})
