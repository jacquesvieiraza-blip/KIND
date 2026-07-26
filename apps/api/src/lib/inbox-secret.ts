// MAILBOX PASSWORDS AT REST — AES-256-GCM, one key, held only in the environment.
//
// Founder-locked 26 Jul: option **B**. We press send ourselves, through the mailbox the
// provider warmed for the client — so the product holds one SMTP password per client. That
// is the cost of B, and the reason it is worth paying is that everything already built (the
// sequence engine, the send window, the daily caps, the A/B subjects, the kill-switch, the
// reply classifier) keeps working untouched. Option A would have moved scheduling into
// Smartlead's campaign engine and left us with two brains deciding when an email goes out.
//
// The rules this file exists to enforce:
//   • a password is NEVER stored in plaintext, and never appears in a log line or an API
//     response — `describeCipher` is the only thing any surface may show
//   • GCM, not CBC: it authenticates as well as encrypts, so a tampered ciphertext fails
//     loudly instead of decrypting to garbage we would then hand to a mail server
//   • a fresh random IV per encryption, stored alongside — reusing an IV under one key is
//     the classic way GCM is broken
//   • **no key = no decryption = no send.** Fail closed. A missing key must never fall back
//     to sending from our own shared address (that is the #547 rule, and this is the layer
//     it would have been quietly violated at)
//
// The key lives in `INBOX_SECRET_KEY` (Railway → @kind/api → Variables): 64 hex characters
// = 32 bytes. Rotating it makes every stored password undecryptable, so a rotation means
// re-entering the mailbox passwords — stated here because discovering that during an
// outage is worse than reading it now.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_BYTES = 12          // 96-bit nonce, the size GCM is specified for
const VERSION = 'v1'         // prefix, so a future scheme can co-exist with stored rows

export type SecretState =
  | { ok: true }
  | { ok: false; reason: 'missing' | 'malformed' }

/**
 * Is the key present and usable? Surfaces call this to say "sending is not configured"
 * BEFORE a send is attempted, rather than after a mail server has been dialled.
 */
export function secretState(): SecretState {
  const raw = process.env.INBOX_SECRET_KEY
  if (!raw) return { ok: false, reason: 'missing' }
  if (!/^[0-9a-fA-F]{64}$/.test(raw.trim())) return { ok: false, reason: 'malformed' }
  return { ok: true }
}

function key(): Buffer {
  const s = secretState()
  if (!s.ok) {
    // Deliberately a throw and not a silent fallback: the caller's job is to refuse the
    // send, and a returned null here would be easy to ignore at one of the call sites.
    throw new Error(
      s.reason === 'missing'
        ? 'INBOX_SECRET_KEY is not set — mailbox passwords cannot be read, so nothing can send. Set it in Railway → @kind/api → Variables (64 hex characters).'
        : 'INBOX_SECRET_KEY is not 64 hex characters (32 bytes) — mailbox passwords cannot be read, so nothing can send.',
    )
  }
  return Buffer.from(process.env.INBOX_SECRET_KEY!.trim(), 'hex')
}

/** Encrypt a mailbox password for storage. Returns `v1:<iv>:<tag>:<ciphertext>`, all hex. */
export function encryptSecret(plaintext: string): string {
  if (typeof plaintext !== 'string' || plaintext.length === 0) {
    throw new Error('encryptSecret: refusing to store an empty password')
  }
  const iv = randomBytes(IV_BYTES)
  const c = createCipheriv(ALGO, key(), iv)
  const body = Buffer.concat([c.update(plaintext, 'utf8'), c.final()])
  return [VERSION, iv.toString('hex'), c.getAuthTag().toString('hex'), body.toString('hex')].join(':')
}

/**
 * Decrypt a stored mailbox password.
 *
 * Throws on anything unexpected — wrong key, tampered ciphertext, a row written by an
 * older scheme. The caller must treat a throw as "this inbox cannot send", never as
 * "send from somewhere else".
 */
export function decryptSecret(stored: string): string {
  const parts = String(stored ?? '').split(':')
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error('decryptSecret: stored value is not in the v1 format — the mailbox password must be re-entered')
  }
  const [, ivHex, tagHex, bodyHex] = parts
  const d = createDecipheriv(ALGO, key(), Buffer.from(ivHex, 'hex'))
  d.setAuthTag(Buffer.from(tagHex, 'hex'))
  // GCM raises here on a bad key or tampered payload — which is the point of using it.
  return Buffer.concat([d.update(Buffer.from(bodyHex, 'hex')), d.final()]).toString('utf8')
}

/**
 * The ONLY thing any screen, log line or API response may show about a stored password:
 * its length and a short fingerprint. Enough to tell two passwords apart and to confirm
 * one was saved; never enough to use.
 */
export function describeCipher(stored: string | null | undefined): string {
  if (!stored) return 'not set'
  const fp = createHash('sha256').update(String(stored)).digest('hex').slice(0, 8)
  return `set · fingerprint ${fp}`
}
