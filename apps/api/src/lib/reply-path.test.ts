// #624 — WHERE DO REPLIES ACTUALLY GO, AND WOULD WE KNOW IF THEY STOPPED?
//
// The System check already had a reply-path row. It checked the signing secret and counted
// replies — and never asked WHERE replies are addressed. Outreach carries a `Reply-To` from
// COLD_REPLY_TO (FIGSY_COLD_REPLY_TO → FIGSY_REPLY_TO → a SILENT hardcoded default), and
// replies arrive only through Resend's inbound webhook. So the screen could report green while
// every reply went to a mailbox whose inbound was never wired: a campaign with no return path,
// and the failure is silent — an empty Unibox reads as "nobody answered", not "we lost them".
//
// ⚠️ EVERY PROOF RUNS BOTH DIRECTIONS. A test that only shows the broken case would pass just
// as happily if the row refused EVERYTHING and became noise the founder learns to ignore.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { replyPathVerdict, replyToSource, emailDomain, REPLY_TO_HARDCODED_DEFAULT } from './reply-path'
import { stripCommentsForEnvScan } from './env-inventory'

const NOW = new Date('2026-08-05T12:00:00Z')
const GOOD = {
  coldReplyTo: 'replies@kindoutreach.com',
  replyTo: null,
  resolved: 'replies@kindoutreach.com',
  resendDomains: ['kindoutreach.com', 'get-kind.com'],
  lastReplyAt: null,
  hasSent: false,
  secretSet: true,
  now: NOW,
}

describe('replyToSource — which env var chose this address', () => {
  it('names the cold var when it is set', () => {
    expect(replyToSource({ coldReplyTo: 'a@b.com', replyTo: 'c@d.com' })).toBe('cold_reply_to')
  })
  it('falls back to the general var', () => {
    expect(replyToSource({ coldReplyTo: '', replyTo: 'c@d.com' })).toBe('reply_to_fallback')
  })
  it('reports the hardcoded default when NOBODY set anything', () => {
    expect(replyToSource({})).toBe('hardcoded_default')
    expect(replyToSource({ coldReplyTo: '   ', replyTo: '  ' })).toBe('hardcoded_default')
  })
})

describe('emailDomain', () => {
  it('extracts and lowercases', () => {
    expect(emailDomain('Replies@KindOutreach.com')).toBe('kindoutreach.com')
  })
  it('returns null for anything that is not an address', () => {
    for (const bad of ['', null, undefined, 'nope', '@nodomain.com', 'user@']) {
      expect(emailDomain(bad as string)).toBe(null)
    }
  })
})

describe('replyPathVerdict — the happy path is genuinely happy', () => {
  it('OK when the address is chosen, the secret is set and Resend holds the domain', () => {
    const v = replyPathVerdict(GOOD)
    expect(v.state).toBe('ok')
    // The founder must be able to READ the address off the screen — that is the whole point.
    expect(v.detail).toContain('replies@kindoutreach.com')
    expect(v.detail).toContain('FIGSY_COLD_REPLY_TO')
  })

  it('and it REFUSES to overclaim — a listed domain is not proof a reply arrives', () => {
    // Resend lists domains verified for SENDING; receiving also needs MX. Saying "verified"
    // as though it proved delivery would be the false green this whole build exists to end.
    const v = replyPathVerdict(GOOD)
    expect(v.detail).toContain('NOT proof')
    expect(v.action).toContain('reply to it')
  })
})

describe('the silent default — a decision nobody made', () => {
  it('is NOT ok, names the address, and says how to fix it', () => {
    const v = replyPathVerdict({
      ...GOOD, coldReplyTo: null, replyTo: null,
      resolved: REPLY_TO_HARDCODED_DEFAULT,
      resendDomains: ['get-kind.com'],
    })
    expect(v.state).toBe('broken')
    expect(v.detail).toContain(REPLY_TO_HARDCODED_DEFAULT)
    expect(v.action).toContain('FIGSY_COLD_REPLY_TO')
  })

  it('THE OTHER DIRECTION — the SAME address, deliberately chosen, is fine', () => {
    // Without this, the rule would read "hello@get-kind.com is banned", which is not the point.
    // The fault is that nobody chose it, not the address itself.
    const v = replyPathVerdict({
      ...GOOD, coldReplyTo: REPLY_TO_HARDCODED_DEFAULT,
      resolved: REPLY_TO_HARDCODED_DEFAULT, resendDomains: ['get-kind.com'],
    })
    expect(v.state).toBe('ok')
  })
})

describe('the domain check', () => {
  it('BROKEN when Resend does not hold the reply-to domain — names it and lists what it has', () => {
    const v = replyPathVerdict({ ...GOOD, resendDomains: ['get-kind.com'] })
    expect(v.state).toBe('broken')
    expect(v.detail).toContain('kindoutreach.com')
    expect(v.detail).toContain('get-kind.com')
  })

  it('THE OTHER DIRECTION — present in the list passes', () => {
    expect(replyPathVerdict({ ...GOOD, resendDomains: ['KINDOUTREACH.COM'] }).state).toBe('ok')
  })

  it('an empty Resend list is broken, not ok — no domains means no inbound', () => {
    expect(replyPathVerdict({ ...GOOD, resendDomains: [] }).state).toBe('broken')
  })

  it('UNREACHABLE Resend is NOT-MEASURED, never ok — "configured" without proof is the bug', () => {
    const v = replyPathVerdict({ ...GOOD, resendDomains: null })
    expect(v.state).toBe('unmeasured')
    expect(v.detail).toContain('not a pass')
  })
})

describe('the signing secret still fails closed', () => {
  it('unset is broken even when everything else is perfect', () => {
    const v = replyPathVerdict({ ...GOOD, secretSet: false })
    expect(v.state).toBe('broken')
    expect(v.detail).toContain('RESEND_WEBHOOK_SECRET')
    expect(v.action).toContain('Railway')
  })
})

describe('an unusable address', () => {
  it('is broken when the reply-to is empty or malformed', () => {
    for (const bad of ['', 'not-an-address']) {
      const v = replyPathVerdict({ ...GOOD, coldReplyTo: bad || null, resolved: bad })
      expect(v.state).toBe('broken')
    }
  })
})

describe('reply age — the SAME zero means opposite things before and after send-day', () => {
  it('zero replies BEFORE any send is expected, not an alarm', () => {
    const v = replyPathVerdict({ ...GOOD, lastReplyAt: null, hasSent: false })
    expect(v.state).toBe('ok')
    expect(v.detail).toContain('expected before send-day')
  })

  it('zero replies AFTER sending is called out as the signature of a dead return path', () => {
    // This is the sentence that would have saved send-day: sending, and nothing ever came back.
    const v = replyPathVerdict({ ...GOOD, lastReplyAt: null, hasSent: true })
    expect(v.detail).toContain('NOT ONE reply has ever arrived')
    expect(v.detail).toContain('signature of a broken return path')
  })

  it('reports the age of a real reply in days', () => {
    const v = replyPathVerdict({ ...GOOD, lastReplyAt: '2026-08-02T12:00:00Z', hasSent: true })
    expect(v.detail).toContain('3 day(s) ago')
  })

  it('an unparseable timestamp does not crash or read as a fresh reply', () => {
    const v = replyPathVerdict({ ...GOOD, lastReplyAt: 'not-a-date', hasSent: true })
    expect(v.detail).toContain('NOT ONE reply has ever arrived')
  })
})

// ── THE WIRING — a verdict nothing renders is not a check ─────────────────────────────────
describe('the probe actually asks', () => {
  const src = stripCommentsForEnvScan(readFileSync(join(__dirname, 'system-probes.ts'), 'utf8'))
  const at = src.indexOf("'Reply path (inbound → client desk)'")
  const body = src.slice(at, src.indexOf('REPLICA COUNT', at) === -1 ? at + 4000 : src.indexOf('rows.push(await probe(\'Replica count\'', at))

  it('the reply row exists and calls the pure verdict', () => {
    expect(at).toBeGreaterThan(-1)
    expect(body).toContain('replyPathVerdict({')
  })

  it('feeds it the REAL resolved address, not a re-derived one', () => {
    // Re-deriving the fallback chain here would let the probe and the send path disagree about
    // where replies go — two copies of one rule, the #618/#619 failure.
    expect(body).toContain('COLD_REPLY_TO')
    expect(body).toContain('resolved: COLD_REPLY_TO')
  })

  it('asks Resend for its domains, and tolerates being unable to', () => {
    expect(body).toContain('api.resend.com/domains')
    expect(body).toContain('resendDomains')
  })

  it('feeds it whether anything has been sent — the zero-replies verdict depends on it', () => {
    expect(body).toContain('figsy_sent_emails')
    expect(body).toContain('hasSent')
  })

  it('renders all three states — a verdict that can only ever go green is not a check', () => {
    expect(body).toContain('return ok(label')
    expect(body).toContain('return broken(label')
    expect(body).toContain('return unmeasured(label')
  })

  it('is still ONE row — two rows answering one question is how they start disagreeing', () => {
    expect(src.split("'Reply path (inbound → client desk)'").length - 1).toBe(1)
  })
})
