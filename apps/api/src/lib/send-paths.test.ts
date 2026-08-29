// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY SEND PATH ASKS THE SUPPRESSION QUESTION. NO EXCEPTIONS.
//
// FOUNDER RULING, 29 Aug: suppression EFFECT is global — "if an email address is
// legitimately suppressed / opted out anywhere in K.I.N.D, every K.I.N.D send path must
// treat that address as blocked", and that explicitly "includes the dormant Instantly path
// before it can ever be revived."
//
// ⚠️ WHY THIS TEST EXISTS RATHER THAN A CODE REVIEW. Two paths reached a real person with NO
// suppression check of any kind and both looked completely healthy:
//
//   · `instantly-push.ts` — dormant (INSTANTLY_API_KEY unset), so nothing failed and nobody
//     noticed. The day someone sets that key, its first act would have been to push people
//     who told us to stop into an engine that mails them from its own copy of the lead,
//     where our blocklist has no reach at all.
//   · `lib/whatsapp.ts` — on a table that has carried a `whatsapp_number` column all along.
//     `routes/whatsapp.ts` WRITES an opt-out there when someone replies STOP, and nothing
//     ever read it back: a person could opt out on WhatsApp and keep receiving WhatsApp.
//
// A rule held by convention across N modules holds until module N+1 is written by someone
// who did not know. This is what makes it structural.
//
// ⚠️ THE SWEEP MUST NOT BE EMPTY. A guard that inspects zero paths passes forever and proves
// only that nobody wrote it correctly — asserted directly below, as the founder's acceptance
// matrix requires.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { stripCommentsForEnvScan } from './env-inventory'

/**
 * Every module that can transmit to a real person, and how it asks the question.
 *
 * `gate` names what must appear in the file. Two answers are accepted because two shapes
 * are legitimate: the shared `checkSendAllowed` gate, or — for paths that were already
 * asking both halves before this build, and whose refusal wording is load-bearing elsewhere
 * — the explicit pair of `isSuppressed` and an `opt_out_blocklist` read. What is NOT
 * accepted is neither.
 */
const SEND_PATHS: { file: string; what: string }[] = [
  { file: 'lib/figsy.ts',           what: 'the SMTP sequence — our own sending' },
  { file: 'lib/smartlead-send.ts',  what: 'Smartlead — sends from its own copy of the lead' },
  { file: 'lib/instantly-push.ts',  what: 'Instantly — DORMANT, gated before it can be revived' },
  { file: 'lib/whatsapp.ts',        what: 'WhatsApp — text and template, both doors' },
  { file: 'lib/linkedin.ts',        what: 'LinkedIn steps' },
]

const API = join(__dirname, '..')
const read = (f: string) => stripCommentsForEnvScan(readFileSync(join(API, f), 'utf8'))

describe('the sweep is not vacuous', () => {
  it('THERE ARE SEND PATHS TO INSPECT — a guard over zero paths proves nothing', () => {
    expect(SEND_PATHS.length).toBeGreaterThan(0)
  })

  it('every listed path is a real file (a typo would silently shrink the sweep)', () => {
    for (const p of SEND_PATHS) {
      expect(() => readFileSync(join(API, p.file), 'utf8'), `${p.file} does not exist`).not.toThrow()
    }
  })

  it('the checker actually detects an ungated file (proved against a synthetic one)', () => {
    // RED proof for the guard itself. Without this, a checker whose predicate never matched
    // would report every file as gated and pass forever.
    const ungated = "export async function send(to: string) { await fetch('https://api.example/send') }"
    expect(hasSuppressionGate(ungated)).toBe(false)
    expect(hasSuppressionGate("const v = await checkSendAllowed({ email })")).toBe(true)
  })
})

/** Either the shared gate, or the explicit DNC + blocklist pair. Never neither. */
function hasSuppressionGate(src: string): boolean {
  if (src.includes('checkSendAllowed')) return true
  return src.includes('isSuppressed') && src.includes('opt_out_blocklist')
}

describe('SUPPRESSION IS CHECKED ON EVERY SEND PATH', () => {
  for (const p of SEND_PATHS) {
    it(`${p.file} — ${p.what}`, () => {
      expect(
        hasSuppressionGate(read(p.file)),
        `${p.file} can reach a real person without asking whether they are suppressed. Call checkSendAllowed() from lib/send-gate.ts.`,
      ).toBe(true)
    })
  }
})

describe('DNC AND THE OPT-OUT BLOCKLIST ARE BOTH CHECKED — they answer different questions', () => {
  // isSuppressed() is the do-not-contact FLOOR: the founder's employer and its sister brands,
  // hard-coded so it survives a missing env var. Nobody there is contacted whether or not
  // they ever heard from us.
  // opt_out_blocklist is a PERSON who told us to stop. Global, and it outlives the client
  // who first mailed them.
  // A path that checks only one of these has a real hole; the shared gate asks both.
  const gate = read('lib/send-gate.ts')

  it('the shared gate consults the do-not-contact floor', () => {
    expect(gate).toContain('isSuppressed')
  })

  it('the shared gate consults the opt-out blocklist', () => {
    expect(gate).toContain("from('opt_out_blocklist')")
  })

  it('SUPPRESSION IS GLOBAL — the blocklist read carries NO client filter', () => {
    // The row is keyed by whoever recorded the opt-out, but the EFFECT is global: a later
    // client cannot cause us to contact someone who already told us to stop. Adding
    // `.eq('blocked_by_client_id', …)` here would quietly turn a global promise into a
    // per-tenant one, and it would look perfectly reasonable in review.
    const fn = gate.slice(gate.indexOf("from('opt_out_blocklist')"))
    const query = fn.slice(0, fn.indexOf('maybeSingle'))
    expect(query).not.toContain('blocked_by_client_id')
    expect(query).not.toContain('client_id')
  })

  it('an opt-out that was reversed does not suppress — opted_back_in_at is honoured', () => {
    expect(gate).toContain("is('opted_back_in_at', null)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// BEHAVIOUR — the gate itself, run
// ═══════════════════════════════════════════════════════════════════════════════════════

type Rec = { rows: unknown; error: { message: string } | null }

async function withGate(rec: Rec) {
  vi.resetModules()
  vi.doMock('@kind/db', () => ({
    db: { from: () => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'or', 'limit']) q[m] = () => q
      q.maybeSingle = async () => ({ data: rec.rows, error: rec.error })
      return q
    } },
  }))
  return import('./send-gate')
}

describe('the gate refuses, and refuses for the right reason', () => {
  let rec: Rec
  beforeEach(() => { rec = { rows: null, error: null } })
  afterEach(() => { vi.doUnmock('@kind/db'); vi.resetModules() })

  it('a clean address is allowed', async () => {
    const g = await withGate(rec)
    expect((await g.checkSendAllowed({ email: 'someone@example.com' })).allowed).toBe(true)
  })

  it('AN OPTED-OUT PERSON IS REFUSED, whichever client is asking', async () => {
    rec.rows = { id: 'b-1' }
    const g = await withGate(rec)
    const v = await g.checkSendAllowed({ email: 'stop@example.com' })
    expect(v.allowed).toBe(false)
    if (!v.allowed) expect(v.reason).toBe('opted_out')
  })

  it('THE DO-NOT-CONTACT FLOOR IS CHECKED WITHOUT TOUCHING THE DATABASE', async () => {
    // It cannot fail, cannot be switched off, and costs nothing — a network problem must
    // never be the reason we mail the employer.
    rec.error = { message: 'database is down' }
    const g = await withGate(rec)
    const v = await g.checkSendAllowed({ email: 'someone@smartsheet.com' })
    expect(v.allowed).toBe(false)
    if (!v.allowed) expect(v.reason).toBe('do_not_contact')
  })

  it('AN UNREADABLE BLOCKLIST FAILS CLOSED — the send is refused, never allowed', async () => {
    // Refusing a send that would have been fine costs one delayed email. Sending to someone
    // who told us to stop is the thing we promised not to do, and cannot be taken back.
    rec.error = { message: 'permission denied for table opt_out_blocklist' }
    const g = await withGate(rec)
    const v = await g.checkSendAllowed({ email: 'someone@example.com' })
    expect(v.allowed).toBe(false)
    if (!v.allowed) expect(v.reason).toBe('suppression_unreadable')
  })

  it('a demo row is exempt — a .invalid address can never reach a person', async () => {
    rec.rows = { id: 'b-1' }
    const g = await withGate(rec)
    expect((await g.checkSendAllowed({ email: 'x@demo.invalid', isDemo: true })).allowed).toBe(true)
  })

  it('a subject with no email and no phone is not queried at all', async () => {
    rec.error = { message: 'should not have been asked' }
    const g = await withGate(rec)
    expect((await g.checkSendAllowed({ company: 'Acme' })).allowed).toBe(true)
  })

  it('phone numbers match across formatting — "+27 82 555 1234" is "27825551234"', async () => {
    const g = await withGate(rec)
    expect(g.normalizePhone('+27 82 555 1234')).toBe('27825551234')
    expect(g.normalizePhone('27825551234')).toBe('27825551234')
  })

  it('a too-short number is ignored rather than matched — three digits would suppress half the world', async () => {
    const g = await withGate(rec)
    expect(g.normalizePhone('123')).toBeNull()
    expect(g.normalizePhone('')).toBeNull()
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE TWO PATHS THAT HAD NOTHING — asserted by name, so a revert is loud
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('INSTANTLY REFUSES A SUPPRESSED CONTACT — before it can ever be revived', () => {
  const src = read('lib/instantly-push.ts')

  it('the push asks the gate', () => {
    expect(src).toContain('checkSendAllowed')
  })

  it('it asks BEFORE rendering the sequence — a suppressed person costs us nothing', () => {
    const gateAt = src.indexOf('checkSendAllowed')
    const renderAt = src.indexOf('toInstantlySequence')
    expect(gateAt).toBeGreaterThan(-1)
    expect(renderAt).toBeGreaterThan(-1)
    expect(gateAt).toBeLessThan(renderAt)
  })

  it('a refusal returns a NAMED reason, not a generic failure', () => {
    // `refusalLabel` renders these to an operator; a generic 'api_error' would send someone
    // looking for an outage that never happened.
    expect(src).toContain("'do_not_contact'")
    expect(src).toContain("'opted_out'")
  })
})

describe('WHATSAPP REFUSES A SUPPRESSED NUMBER — on both doors', () => {
  const src = read('lib/whatsapp.ts')

  it('sendTextMessage asks the gate', () => {
    const fn = src.slice(src.indexOf('export async function sendTextMessage'))
    expect(fn.slice(0, fn.indexOf('fetch('))).toContain('checkSendAllowed')
  })

  it('sendTemplateMessage asks it too — a channel with two doors needs the check on both', () => {
    const fn = src.slice(src.indexOf('export async function sendTemplateMessage'))
    expect(fn.slice(0, fn.indexOf('fetch('))).toContain('checkSendAllowed')
  })

  it('the opt-out this channel WRITES is the one it now READS', () => {
    // routes/whatsapp.ts has always written whatsapp_number opt-outs. Nothing read them.
    const route = read('routes/whatsapp.ts')
    expect(route).toContain('whatsapp_number')
    expect(read('lib/send-gate.ts')).toContain('whatsapp_number')
  })
})
