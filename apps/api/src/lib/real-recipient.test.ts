import { describe, it, expect, vi } from 'vitest'

// `email.ts` builds a Resend client at module load; the function under test touches none of it.
vi.mock('resend', () => ({ Resend: class { emails = { send: async () => ({ data: null, error: null }) } } }))
vi.mock('@kind/db', () => ({ db: { from: () => ({}) } }))

import { isRealRecipient } from './email'
import { MBF_MARKER } from './demo-mbf-data'

// #544 — THE BACKSTOP DID NOT COVER THE ONE DOMAIN THE DEMO ACTUALLY USES.
//
// `isRealRecipient` is described in its own comment as the last line of defence: *"any
// transactional send to a non-deliverable address is dropped before it hits Resend"*. It
// filtered `.internal`, `kind-demo.`, `example.`, `.test` and `localhost` — and **not
// `.invalid`**, which is the TLD every MBF demo address carries (`mbf-demo.invalid`).
//
// It has never bitten, because the `is_demo` stop fires earlier on every send path. That is
// exactly why it is worth fixing rather than shrugging at: **a backstop that only holds while
// the thing in front of it holds is not a backstop.** The whole point of this function is to
// be correct when it is the only thing left, and a demo address reaching Resend is a hard
// bounce on the sending domain every real client shares.

describe('the gap: .invalid is what the demo actually uses', () => {
  it('REFUSES an MBF demo address', () => {
    expect(isRealRecipient('ada@mbf-demo.invalid')).toBe(false)
  })

  it('refuses any .invalid domain, not just ours', () => {
    for (const a of ['x@foo.invalid', 'y@a.b.invalid', 'z@invalid']) {
      expect(isRealRecipient(a), a).toBe(false)
    }
  })

  it('the domain it refuses is the one demo-mbf-data actually stamps on every cast member', () => {
    // Pinned against the real constant, so renaming the demo domain cannot silently reopen
    // the hole — the test would fail rather than keep passing on a stale literal.
    expect(MBF_MARKER).toContain('.invalid')
    expect(isRealRecipient(`someone@${MBF_MARKER}`)).toBe(false)
  })

  it('is case-insensitive — an address is not made real by capitals', () => {
    expect(isRealRecipient('Ada@MBF-Demo.INVALID')).toBe(false)
  })

  it('a real address that merely CONTAINS the word is still real', () => {
    // `invalidations@acme.com` is a real mailbox. Matching on a substring rather than the
    // domain suffix would silently stop mail to a paying client.
    expect(isRealRecipient('invalidations@acme.com')).toBe(true)
    expect(isRealRecipient('ada@invalid-cats.com')).toBe(true)
  })
})

describe('the filters that were already there still hold', () => {
  it('refuses the other non-deliverable shapes', () => {
    for (const a of ['a@kind-demo.internal', 'b@kind-demo.co', 'c@example.com', 'd@x.test', 'e@test', 'f@localhost']) {
      expect(isRealRecipient(a), a).toBe(false)
    }
  })

  it('accepts an ordinary work address', () => {
    expect(isRealRecipient('ada@acme.com')).toBe(true)
  })

  it('refuses junk rather than passing it through to Resend', () => {
    for (const a of ['', '   ', 'not-an-email']) {
      expect(isRealRecipient(a), JSON.stringify(a)).toBe(false)
    }
  })
})

describe('a LIST is only real if EVERY address is', () => {
  it('one demo address in a batch fails the whole batch', () => {
    // The dangerous direction: a digest to five real clients and one demo would otherwise
    // send, bouncing off the shared sending domain.
    expect(isRealRecipient(['ada@acme.com', 'ghost@mbf-demo.invalid'])).toBe(false)
  })

  it('an all-real batch passes', () => {
    expect(isRealRecipient(['ada@acme.com', 'bo@rivo.co.za'])).toBe(true)
  })

  it('an EMPTY list is not real — there is nobody to send to', () => {
    expect(isRealRecipient([])).toBe(false)
  })
})
