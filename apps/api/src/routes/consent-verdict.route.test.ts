import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE FIVE CONSENT DOORS IN leads.ts NOW READ THE MAILER'S VERDICT ───────────────────────
//
// HC-4 put the blocklist and do-not-contact gates INSIDE `sendConsentEmail`, and changed it to
// return a verdict — `{ sent: true }` or `{ sent: false, reason, detail }`. Six callers had to
// start reading it. **One did.** `routes/icps.ts`'s `autoConsentScoredLeads` was fixed with the
// gate; the five in `routes/leads.ts` went on ignoring the return value entirely.
//
// ⚠️ WHAT THAT ACTUALLY PRODUCES, AND WHY IT IS WORSE THAN THE BUG IT REPLACED. The gate works:
// an opted-out person receives nothing. Then the caller writes `status: 'consent_sent'` and
// `consent_sent_at` anyway, because it never asked whether anything was sent. So the row now
// says we asked this person for permission on a day when we deliberately did not contact them:
//
//   • the resend door's `consent_given` / `opted_out` checks never look at that lead again
//   • `/consent/bulk` skips it forever on `if (lead.consent_sent_at)`
//   • the blocklist entry that stopped the send leaves NO trace on the lead
//   • and under GDPR Art. 14 / POPIA s69 the consent record is the evidence — a fabricated
//     entry in it is the one field that must never be a guess
//
// A silent suppression that writes a false record is indistinguishable, on the board, from a
// successful send. Nobody would ever go looking.
//
// ROUTE-LEVEL, and deliberately so. A source-reading guard can prove `if (!verdict.sent)` is
// written; it cannot prove the status write is actually skipped — `{false && …}` in #620 and the
// non-greedy `sendAs` matcher in the postal-footer guard are two failures from this week alone
// where a guard read the right file and proved nothing. So this drives the real handlers and
// asserts on the UPDATE PAYLOADS the database would have received.

/** Every `leads` update the routes attempted. The whole question, in one array. */
const leadWrites: Record<string, unknown>[] = []
/** What the mailer decides. Flipped per-test. */
const mailer = { refuse: null as null | { reason: string; detail: string }, calls: [] as string[] }

const LEAD = {
  id: 'l1', email: 'ada@acme.com', first_name: 'Ada', last_name: 'L',
  status: 'scored', consent_sent_at: null as string | null, consent_token: 'tok-1',
  apollo_consented: false, client_id: 'client-1',
}

vi.mock('@kind/db', () => {
  const chain = (table: string, payload?: Record<string, unknown>) => {
    const q: Record<string, unknown> = {}
    // Every terminal shape the five doors use, all resolving to the same row set.
    const rows = table === 'leads' ? [LEAD] : [{ id: 'client-1', company_name: 'Acme Client' }]
    const result = { data: table === 'leads' ? [LEAD] : rows, error: null }
    for (const m of ['select', 'eq', 'in', 'is', 'not', 'order', 'limit']) {
      q[m] = () => {
        if (payload && table === 'leads') leadWrites.push(payload)
        return q
      }
    }
    q.update = (p: Record<string, unknown>) => chain(table, p)
    q.single = async () => ({ data: table === 'leads' ? LEAD : rows[0], error: null })
    q.maybeSingle = async () => ({ data: table === 'leads' ? LEAD : rows[0], error: null })
    // `.in().eq()` is awaited directly by the two bulk doors — the chain must be thenable.
    q.then = (res: (v: unknown) => unknown) => Promise.resolve(result).then(res)
    return q
  }
  return { db: { from: (t: string) => chain(t), rpc: async () => ({ data: null, error: null }) } }
})

vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _s: unknown, n: () => void) => n() }))
vi.mock('../lib/rate-limit', () => ({ rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n() }))

vi.mock('../lib/email', () => ({
  sendConsentEmail: async (to: string) => {
    mailer.calls.push(to)
    return mailer.refuse ? { sent: false, ...mailer.refuse } : { sent: true }
  },
  isRealRecipient: () => true,
}))

type Res = { code: number; payload: Record<string, unknown> }

async function call(method: 'post' | 'patch', path: string, body: Record<string, unknown>): Promise<Res> {
  const { leadRouter } = await import('./leads')
  const stack = (leadRouter as unknown as { stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }> }).stack
  const layer = stack.find(l => l.route?.path === path && l.route?.methods[method])
  if (!layer?.route) throw new Error(`${method.toUpperCase()} ${path} not found — the guard is blind, fix the lookup rather than deleting the test`)
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const res: Res = { code: 200, payload: {} }
  const fakeRes = { status(c: number) { res.code = c; return fakeRes }, json(p: Record<string, unknown>) { res.payload = p; return fakeRes } }
  await handler({ body, userId: 'user-1', params: { id: 'l1' } }, fakeRes, () => {})
  // Door 711 is a fire-and-forget IIFE that runs AFTER res.json — let its microtasks drain.
  await new Promise(r => setTimeout(r, 0))
  return res
}

/** The five doors, each with the call that reaches its `sendConsentEmail`. */
const DOORS: Array<[string, () => Promise<Res>]> = [
  ['PATCH /:id/status (711, auto-fire)', () => call('patch', '/:id/status', { status: 'scored' })],
  ['POST /:id/consent',                  () => call('post',  '/:id/consent', {})],
  ['POST /:id/resend-consent',           () => call('post',  '/:id/resend-consent', {})],
  ['POST /consent/bulk',                 () => call('post',  '/consent/bulk', { leadIds: ['00000000-0000-4000-8000-000000000001'] })],
  ['POST /bulk-consent',                 () => call('post',  '/bulk-consent', { lead_ids: ['00000000-0000-4000-8000-000000000001'] })],
]

/** Did anything claim we asked this person for consent? */
const claimedSent = () => leadWrites.filter(w => w.status === 'consent_sent' || 'consent_sent_at' in w)

const envBefore = { outreach: process.env.AUTO_OUTREACH_ENABLED, resend: process.env.RESEND_API_KEY }
beforeEach(() => {
  leadWrites.length = 0
  mailer.refuse = null
  mailer.calls.length = 0
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  process.env.RESEND_API_KEY = 'test-key'          // door 711 returns early without this
})
afterEach(() => {
  process.env.AUTO_OUTREACH_ENABLED = envBefore.outreach
  if (envBefore.resend === undefined) delete process.env.RESEND_API_KEY
  else process.env.RESEND_API_KEY = envBefore.resend
})

describe('RED PROOF — ignoring the verdict writes a consent record for a person we refused to email', () => {
  it('the old caller shape: send, discard the answer, write "consent_sent" regardless', () => {
    // Reproduced from all five doors as they stood. `sendConsentEmail` returns a verdict; every
    // one of them awaited it into nothing and updated the row on the next line.
    const writes: string[] = []
    const oldDoor = async (verdict: { sent: boolean }) => {
      await Promise.resolve(verdict)          // ← the return value, discarded
      writes.push('consent_sent')             // ← unconditional
    }
    return oldDoor({ sent: false }).then(() => {
      expect(writes).toEqual(['consent_sent'])                    // ← RED: a false consent record
      expect(writes.length, 'for a person who received nothing').toBe(1)
    })
  })
})

describe('a REFUSED send never writes a consent record — all five doors', () => {
  for (const [name, drive] of DOORS) {
    it(`${name} — blocklisted lead: nothing is recorded as asked`, async () => {
      mailer.refuse = { reason: 'opted_out', detail: 'This person opted out of outreach.' }
      await drive()

      expect(mailer.calls, `${name}: the door must actually reach the mailer, or this proves nothing`).toHaveLength(1)
      expect(
        claimedSent(),
        `${name}: the mailer refused, and the row was still marked as asked — a fabricated consent record`,
      ).toEqual([])
    })

    it(`${name} — do-not-contact lead: same`, async () => {
      mailer.refuse = { reason: 'do_not_contact', detail: 'On the do-not-contact list.' }
      await drive()
      expect(claimedSent(), name).toEqual([])
    })
  }
})

describe('⚠️ AND A CLEAN LEAD STILL FLIPS — without this the ten above prove nothing', () => {
  // The #617 lesson, and it has now caught a false pass three times this week: a suppression
  // test that cannot tell "refused" from "the harness is broken" is not a test. If the mock db
  // simply threw before every update, every assertion above would still be green.
  for (const [name, drive] of DOORS) {
    it(`${name} — an ordinary prospect is still recorded as asked`, async () => {
      mailer.refuse = null
      await drive()
      expect(mailer.calls, name).toHaveLength(1)
      expect(claimedSent().length, `${name}: a clean send MUST write the consent record`).toBeGreaterThan(0)
    })
  }
})

describe('the client is told WHY, in one wording, shaped to the door', () => {
  it('POST /:id/consent answers 409 with the mailer\'s own reason and detail', async () => {
    mailer.refuse = { reason: 'opted_out', detail: 'This person opted out of outreach.' }
    const res = await call('post', '/:id/consent', {})
    expect(res.code).toBe(409)
    expect(res.payload.error).toBe('opted_out')
    expect(res.payload.message).toBe('This person opted out of outreach.')
  })

  it('POST /:id/resend-consent uses the SAME shape, not a second wording', async () => {
    // Six doors wording one refusal six ways is how two gates' counts stop reconciling — the
    // reason `launchHoldReason` and `pecrSkipReason` are single functions.
    mailer.refuse = { reason: 'do_not_contact', detail: 'On the do-not-contact list.' }
    const res = await call('post', '/:id/resend-consent', {})
    expect(res.code).toBe(409)
    expect(res.payload.error).toBe('do_not_contact')
    expect(res.payload.message).toBe('On the do-not-contact list.')
  })

  it('⚠️ THE BULK DOORS COUNT the refusals — a loop has no single detail to carry', async () => {
    // `res.detail` is a sentence about ONE lead. Over 50 leads it is either wrong or arbitrary,
    // so the refusals join the reasons `/consent/bulk` already counts. A caller reads why
    // without trawling the logs for fifty console lines.
    mailer.refuse = { reason: 'opted_out', detail: 'This person opted out of outreach.' }
    const res = await call('post', '/consent/bulk', { leadIds: ['00000000-0000-4000-8000-000000000001'] })

    expect(res.code).toBe(200)
    expect(res.payload.sent).toBe(0)
    expect((res.payload.skippedReasons as Record<string, number>).opted_out).toBe(1)
    expect(res.payload.skipped, 'and the refusal is INSIDE the skipped total, not lost beside it').toBe(1)
  })

  it('POST /bulk-consent reports the same map — it had no reason breakdown at all before', async () => {
    mailer.refuse = { reason: 'do_not_contact', detail: 'On the do-not-contact list.' }
    const res = await call('post', '/bulk-consent', { lead_ids: ['00000000-0000-4000-8000-000000000001'] })
    const data = res.payload.data as { sent: number; skipped: number; skippedReasons: Record<string, number> }

    expect(data.sent).toBe(0)
    expect(data.skipped).toBe(1)
    expect(data.skippedReasons.do_not_contact).toBe(1)
  })

  it('⛓️ #675 — no skip reason claims CONSENT for a merely-verified email', async () => {
    // ⛓️ The key was `alreadyConsented` and it counted `lead.apollo_consented` — a provider
    // VERIFIED email, not a consent record. Press "send consent to these 50" and the answer
    // said "30 already consented" about 30 people who had clicked nothing. Nothing unsafe ever
    // happened (nobody was mailed who should not have been); the defect was the sentence
    // afterwards, which is why the founder parked it for one PR rather than letting it ride
    // into a comments-only pass — "leave it, log it as separate item", then "lets also fix
    // this now".
    //
    // Asserted on the RESPONSE rather than the source, because the response is the thing an
    // operator actually reads.
    mailer.refuse = null
    const res = await call('post', '/consent/bulk', { leadIds: ['00000000-0000-4000-8000-000000000001'] })
    const reasons = res.payload.skippedReasons as Record<string, number>

    expect(reasons, 'the reason map must exist, or this proves nothing').toBeTruthy()
    for (const key of Object.keys(reasons)) {
      expect(key, `a skip reason still claims consent: "${key}"`).not.toMatch(/consent/i)
    }
    expect(Object.keys(reasons), 'and the honest name is the one shipped').toContain('alreadyContactable')
  })

  it('the renamed counter still COUNTS — a rename that broke the tally would be worse', async () => {
    // The #617 shape. If the rename had orphaned the variable, every key would be absent and
    // the assertion above would pass on a response that reports nothing at all.
    LEAD.apollo_consented = true
    try {
      mailer.refuse = null
      const res = await call('post', '/consent/bulk', { leadIds: ['00000000-0000-4000-8000-000000000001'] })
      const reasons = res.payload.skippedReasons as Record<string, number>
      expect(reasons.alreadyContactable, 'a verified-email lead lands in this bucket').toBe(1)
      expect(res.payload.sent, 'and is not sent a consent request').toBe(0)
      expect(res.payload.skipped, 'and is inside the skipped total').toBe(1)
    } finally {
      LEAD.apollo_consented = false
    }
  })

  it('the bulk maps stay EMPTY on a clean run, rather than reporting a zero for every reason', async () => {
    mailer.refuse = null
    const res = await call('post', '/bulk-consent', { lead_ids: ['00000000-0000-4000-8000-000000000001'] })
    const data = res.payload.data as { sent: number; skippedReasons: Record<string, number> }
    expect(data.sent).toBe(1)
    expect(Object.keys(data.skippedReasons)).toEqual([])
  })
})

describe('door 711 — the one door that CANNOT answer, and says so', () => {
  it('NOT-POSSIBLE on the response half: res.json already fired before the mailer ran', () => {
    // ⚠️ NOT A GAP — a property of where this send sits. The auto-fire is a fire-and-forget IIFE
    // that starts AFTER the handler has responded to the client. There is no response left to
    // put a reason into, and inventing one would mean holding the HTTP response open on a cold
    // email the caller never asked to send.
    const src = readFileSync(join(__dirname, 'leads.ts'), 'utf8')
    const handler = src.slice(src.indexOf("leadRouter.patch('/:id/status'"))
    const body = handler.slice(0, handler.indexOf('\nleadRouter.'))
    const resJsonAt = body.indexOf('res.json({ success: true, data })')
    const mailerAt = body.indexOf('sendConsentEmail(')

    expect(resJsonAt, 'the handler responds').toBeGreaterThan(-1)
    expect(mailerAt, 'and the consent mail is attempted').toBeGreaterThan(-1)
    expect(mailerAt, 'AFTER the response — so no reason can ride back on it').toBeGreaterThan(resJsonAt)
  })

  it('so the refusal is LOGGED instead, in the same shape as the kill-switch line beside it', async () => {
    const warns: string[] = []
    const spy = vi.spyOn(console, 'warn').mockImplementation((...a) => { warns.push(a.join(' ')) })
    try {
      mailer.refuse = { reason: 'opted_out', detail: 'This person opted out of outreach.' }
      await call('patch', '/:id/status', { status: 'scored' })
    } finally { spy.mockRestore() }

    expect(warns.join('\n'), 'names the lead').toContain('l1')
    expect(warns.join('\n'), 'and the reason').toContain('opted_out')
    expect(claimedSent(), 'the half that IS possible: no false consent record').toEqual([])
  })
})

describe('all six callers read the verdict — counted, so a seventh door cannot slip in silently', () => {
  it('every sendConsentEmail call site assigns the result and branches on it', () => {
    // A source count on top of the behavioural tests above, for the failure they cannot see: a
    // NEW door added later. It would pass every test in this file by not existing in it.
    const leads = readFileSync(join(__dirname, 'leads.ts'), 'utf8')
    const icps = readFileSync(join(__dirname, 'icps.ts'), 'utf8')

    const callSites = (leads.match(/sendConsentEmail\(/g) ?? []).length + (icps.match(/sendConsentEmail\(/g) ?? []).length
    expect(callSites, 'six doors: five in leads.ts, one in icps.ts — if this changed, add the door above').toBe(6)

    const assigned = (leads.match(/const \w+ = await sendConsentEmail\(/g) ?? []).length
    expect(assigned, 'all five leads.ts doors capture the verdict rather than discarding it').toBe(5)

    const branches = (leads.match(/if \(!verdict\.sent\)/g) ?? []).length
    expect(branches, 'and each one branches on it before writing a status').toBe(5)
  })
})
