import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── HC-4 — THE CONSENT EMAIL BROKE TWO FOUNDER LOCKS AT ONCE ──────────────────────────────
//
// **S5 (founder-locked 26 Jul): "Never cold-email from the primary domain."**
// `sendConsentEmail` goes to a COLD PROSPECT — a stranger who has never heard of us — and it
// sent from `FROM`, the transactional identity `hello@get-kind.com`. That is the domain every
// invoice, password reset and receipt also leaves from, so a spam complaint from somebody who
// never asked to hear from us landed on the reputation of our billing mail. S5's enforcement
// column in PRODUCT-RULES read `—` for 25 days.
//
// **S6 (verified 26 Jul): "Opt-outs are global, checked at sourcing, across every client."**
// Nothing on this path checked the blocklist. A person who opted out of client A's outreach,
// freshly sourced for client B a week later and scored over 60, was emailed BY NAME and asked
// for permission — which is the most direct contradiction of an opt-out the product can
// produce, and it arrives looking like a polite first contact.
//
// ⚠️ SIX CALL SITES, DISAGREEING WITH EACH OTHER. `routes/icps.ts:109` plus five in
// `routes/leads.ts` (711, 1001, 1026, 1064, 1320). NOT ONE checked the blocklist; two checked
// `isSuppressed` and four did not; one had no gate at all. Gating the caller the defect was
// reported against would have left five doors open — the min-20 shape (18 green unit tests
// behind a bypassable route) and #617's (present in two functions, absent from a third).
//
// So the gates went INSIDE `sendConsentEmail`, and the last block below proves all six doors
// are covered by construction rather than by six copies of a check.

const state = {
  blocklistHit: false,
  blocklistError: null as { message: string } | null,
  isDemo: false,
  /** Every message that actually reached Resend. The whole question, in one array. */
  sent: [] as { from?: string; to: string | string[]; subject: string }[],
}

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: async (o: { from?: string; to: string | string[]; subject: string }) => {
        state.sent.push(o)
        return { data: { id: 'm1' }, error: null }
      },
    }
  },
}))

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'is', 'in', 'not', 'order', 'limit']) q[m] = () => q
      q.maybeSingle = async () => {
        if (table === 'opt_out_blocklist') {
          if (state.blocklistError) return { data: null, error: state.blocklistError }
          return { data: state.blocklistHit ? { id: 'b1' } : null, error: null }
        }
        return { data: null, error: null }
      }
      return q
    },
  },
}))

vi.mock('./demo', () => ({ isDemoClient: async () => state.isDemo }))

const PROSPECT = 'ada@acme.com'

async function sendConsent(to = PROSPECT) {
  const { sendConsentEmail } = await import('./email')
  return sendConsentEmail(to, 'Ada', 'Acme Client', 'https://app.get-kind.com/consent/abc', 'c1')
}

beforeEach(() => {
  // ⛓️ 10 Sep (I) — DELIVERY IS PERMITTED FOR THIS SUITE, AND THAT IS PART OF THE POINT.
  //
  // The kill-switch is now asked INSIDE `sendConsentEmail`, ahead of every gate below — the
  // same construction this file's header argues for, extended to the switch. It refuses before
  // the blocklist, the DNC floor and the cold identity are ever reached, so each S5/S6 case
  // has to open the switch to be testing what it claims. `⑤` proves the refusal itself, and
  // `restoreKillSwitch` puts the variable back so no other suite inherits it.
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  state.blocklistHit = false
  state.blocklistError = null
  state.isDemo = false
  state.sent = []
  process.env.RESEND_API_KEY = 'test-key'
  process.env.FIGSY_COLD_FROM = 'K.I.N.D <figsy@gettingkind.com>'
})

describe('HC-4 RED PROOF — the old function sent to anyone, from the primary domain', () => {
  it('S6: an OPTED-OUT person was emailed — no blocklist question was ever asked', () => {
    // The gate chain as it stood: a demo check, and nothing else about the person.
    const oldGate = (a: { isDemo: boolean; optedOut: boolean }) => !a.isDemo   // ← optedOut unread
    expect(oldGate({ isDemo: false, optedOut: true })).toBe(true)   // ← RED: it sends
  })

  it('S5: the from-address was the TRANSACTIONAL domain, on a send to a stranger', () => {
    const OLD_FROM = 'K.I.N.D <hello@get-kind.com>'
    expect(OLD_FROM).toContain('get-kind.com')                       // ← RED: the primary domain
    expect(OLD_FROM).not.toContain('gettingkind.com')
  })

  it('and the caller recorded "consent_sent" whether or not anything was sent', () => {
    // `sendConsentEmail` returned `void`, so `autoConsentScoredLeads` flipped the status
    // unconditionally — a false entry in the one record that proves we asked for consent.
    const oldFlow = async () => { /* returns void */ }
    const wrote = oldFlow().then(() => 'consent_sent')
    return expect(wrote).resolves.toBe('consent_sent')   // ← RED: written regardless
  })
})

describe('HC-4 — S6: the global opt-out is honoured, and the send is refused', () => {
  it('an opted-out person receives NOTHING', async () => {
    state.blocklistHit = true
    const r = await sendConsent()

    expect(r.sent).toBe(false)
    expect((r as { reason: string }).reason).toBe('opted_out')
    expect(state.sent, 'THE ASSERTION THAT MATTERS — nothing reached the transport').toEqual([])
  })

  it('the probe is NORMALISED, so a mixed-case address is still matched (HC-1)', async () => {
    // `leads.email` is stored raw and the blocklist normalised. Before HC-1 this comparison was
    // a coin toss on letter case — and replying STOP from `John@Acme.com` is the clearest
    // opt-out a person can give.
    state.blocklistHit = true
    const r = await sendConsent('  ADA@Acme.COM  ')
    expect(r.sent).toBe(false)
    expect(state.sent).toEqual([])
  })

  it('FAILS CLOSED — an unanswerable blocklist read refuses rather than sends', async () => {
    // A rejected read returns `data: null`, which reads as "not opted out". There is no second
    // gate behind this function — it IS the send — so an unanswerable question is a NO.
    state.blocklistError = { message: 'connection terminated unexpectedly' }
    const errs: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errs.push(a.join(' ')) })
    let r: Awaited<ReturnType<typeof sendConsent>>
    try { r = await sendConsent() } finally { spy.mockRestore() }

    expect(r.sent).toBe(false)
    expect(state.sent).toEqual([])
    expect(errs.join('\n'), 'and it says so loudly rather than refusing in silence').toContain('fail-closed')
  })

  it('a do-not-contact address receives nothing', async () => {
    const { suppressedDomains } = await import('./suppression')
    const domain = suppressedDomains()[0]
    expect(domain, 'the do-not-contact list must not be empty, or this proves nothing').toBeTruthy()

    const r = await sendConsent(`someone@${domain}`)
    expect((r as { reason: string }).reason).toBe('do_not_contact')
    expect(state.sent).toEqual([])
  })

  it('⚠️ AN ORDINARY PROSPECT STILL RECEIVES IT — without this the four above prove nothing', async () => {
    // The #617 lesson: a suppression test that cannot tell "blocked" from "broken" is not a
    // test. If the harness were simply failing, every assertion above would still be green.
    const r = await sendConsent()
    expect(r.sent, 'a clean prospect must still be asked for consent').toBe(true)
    expect(state.sent).toHaveLength(1)
    expect(state.sent[0].to).toBe(PROSPECT)
  })

  it('a demo client is still refused for BEING A DEMO, ahead of the new gates', async () => {
    state.isDemo = true
    const r = await sendConsent()
    expect((r as { reason: string }).reason).toBe('is_demo')
    expect(state.sent).toEqual([])
  })
})

describe('HC-4 — S5: the consent email leaves from the COLD domain, never the primary', () => {
  it('sends from FIGSY_COLD_FROM', async () => {
    await sendConsent()
    expect(state.sent).toHaveLength(1)
    expect(state.sent[0].from).toBe('K.I.N.D <figsy@gettingkind.com>')
  })

  it('⚠️ NEVER from the transactional identity — the whole of S5, asserted directly', async () => {
    await sendConsent()
    expect(state.sent[0].from, 'S5: never cold-email from the primary domain')
      .not.toContain('hello@get-kind.com')
  })

  it('the OTHER mails in this file still send from the transactional identity', async () => {
    // S5 is about COLD mail. A welcome email or an invoice is transactional and SHOULD come
    // from the primary domain — moving those would be a different bug wearing this fix's face.
    const src = readFileSync(join(__dirname, 'email.ts'), 'utf8')
    expect(src, 'the transactional FROM must still exist').toContain("const FROM = 'K.I.N.D <hello@get-kind.com>'")
    expect((src.match(/from: COLD_FROM/g) ?? []).length, 'exactly ONE send is cold: the consent email').toBe(1)
  })
})

describe('HC-4 — the gate covers all SIX doors, by construction rather than by six copies', () => {
  const read = (f: string) => readFileSync(join(__dirname, '..', f), 'utf8')

  it('every consent send in the API goes through sendConsentEmail — there is no second sender', () => {
    // If a future path built the consent mail inline instead of calling this function, the
    // gates would not apply to it and nothing else here would notice.
    const files = ['routes/leads.ts', 'routes/icps.ts']
    let callSites = 0
    for (const f of files) callSites += (read(f).match(/sendConsentEmail\(/g) ?? []).length
    expect(callSites, 'six callers: five in leads.ts, one in icps.ts').toBe(6)
  })

  it('the gates live in the FUNCTION, not in the callers', () => {
    // The defect was reported against `autoConsentScoredLeads`. Gating there would have fixed
    // one door of six. This pins where the fix actually went.
    const email = readFileSync(join(__dirname, 'email.ts'), 'utf8')
    const fn = email.slice(email.indexOf('export async function sendConsentEmail'))
    const body = fn.slice(0, fn.indexOf('\n}\n'))
    expect(body, 'the blocklist probe is inside sendConsentEmail').toContain("from('opt_out_blocklist')")
    expect(body, 'the do-not-contact stop is inside sendConsentEmail').toContain('isSuppressed(')
  })

  it('autoConsentScoredLeads no longer writes consent_sent for a lead it did not send to', () => {
    const icps = read('routes/icps.ts')
    const fn = icps.slice(icps.indexOf('async function autoConsentScoredLeads'))
    const body = fn.slice(0, fn.indexOf('\n}\n'))
    expect(body, 'the verdict is read').toContain('if (!res.sent)')
    expect(body, 'and a refusal returns BEFORE the status update').toMatch(/if \(!res\.sent\)[\s\S]{0,400}?return/)
    expect(body, 'refusals are named, not a bare count').toContain('skipReasons')
  })
})

describe('HC-4 — S5 cannot silently regress: FIGSY_COLD_FROM is boot-critical', () => {
  it('is graded critical, not important', async () => {
    // `deliverability.ts` is `process.env.FIGSY_COLD_FROM || 'K.I.N.D <hello@get-kind.com>'`.
    // At `important`, forgetting one variable puts every cold send back on the transactional
    // domain with only a console.warn to show for it. At `critical` the API refuses to boot.
    const src = readFileSync(join(__dirname, 'startup-check.ts'), 'utf8')
    const line = src.split('\n').find(l => l.includes("key: 'FIGSY_COLD_FROM'"))
    expect(line, 'FIGSY_COLD_FROM must still be in the startup check').toBeTruthy()
    expect(line!, 'raised important → critical on the founder’s 20 Aug ruling').toContain("level: 'critical'")
  })

  it('and the fallback it guards is still there, so this promotion is what stops it', async () => {
    // Pinned so nobody "simplifies" the fallback away and quietly makes this test meaningless —
    // or, worse, removes the promotion believing the fallback is gone.
    const src = readFileSync(join(__dirname, 'deliverability.ts'), 'utf8')
    expect(src).toContain('COLD_FROM_DEFAULT')
    expect(src).toContain('hello@get-kind.com')
  })
})


// ═══════════════════════════════════════════════════════════════════════════════════════
// ⑤ THE KILL-SWITCH, ASKED AT THIS SEAM (I · 10 Sep)
//
// Every other cold seam asks the switch at the seam itself — SMTP inside `mailer.sendAs`, and
// each provider push. This path does not go through `mailer`: it reaches `sendTx` →
// `resend.emails.send` with `COLD_FROM`, and `sendTx` is the TRANSACTIONAL seam that invoices
// and password resets share, so the switch cannot live there without stopping mail R114 does
// not govern.
//
// Six callers remembered instead (`coldMailAllowed()` in `leads.ts`, a direct env read in
// `icps.ts`). All six were correct. The seventh is the one that would not be — which is the
// argument this whole file already makes about the blocklist and the cold identity.
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('🛑 ⑤ the kill-switch refuses at the consent seam, whatever the caller did', () => {
  it('ON = nothing is sent, and it says so as a refusal rather than an error', async () => {
    process.env.AUTO_OUTREACH_ENABLED = ''
    const r = await sendConsent()
    expect(r.sent).toBe(false)
    expect(r.sent === false && r.reason).toBe('kill_switch')
    expect(state.sent, 'a consent request left with the kill-switch ON').toHaveLength(0)
  })

  it('🛑 …and it is asked BEFORE the blocklist read, so no gate below can be reached', async () => {
    // Ordering matters for one reason: a refusal that happens after a database read is a
    // refusal that can fail differently when the database is down.
    process.env.AUTO_OUTREACH_ENABLED = ''
    state.blocklistError = { message: 'connection reset' }
    const r = await sendConsent()
    expect(r.sent === false && r.reason, 'the blocklist error was reported instead of the switch').toBe('kill_switch')
    expect(state.sent).toHaveLength(0)
  })

  it('an ordinary prospect still receives it with the switch OFF — otherwise the two above prove nothing', async () => {
    process.env.AUTO_OUTREACH_ENABLED = 'true'
    const r = await sendConsent()
    expect(r.sent).toBe(true)
    expect(state.sent).toHaveLength(1)
  })
})
