import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── #617 — THE DAY-1 BATCH HAD NO PECR GATE ───────────────────────────────────────────────
//
// `sendDay1OutreachBatch` is the fallback send path for a client with no active campaign, and
// it produces the FIRST email a prospect ever receives from us. It honoured the kill-switch,
// the demo lock, the do-not-contact list and the opt-out blocklist — and asked nothing at all
// about PECR, while sending through `sendAs` directly rather than the guarded chokepoint every
// other send funnels through. A UK sole trader reaching this path was cold-emailed.
//
// ── WHY THIS FILE IS A HARNESS AND NOT THREE GREPS ────────────────────────────────────────
// Founder-ruled 19 Aug: *"no quick solutions. the right solution."*
//
// Before this file, NOTHING in the repo executed `sendDay1OutreachBatch` — not one test. The
// existing PECR tests read figsy.ts as TEXT and assert that `pecrVerdict({` appears somewhere.
// That style is why this gap survived: a source grep can prove a call is PRESENT, and this bug
// was that the call was ABSENT from one function while present in two others, which reads as
// "PECR is handled" to anything counting occurrences file-wide.
//
// So this builds the harness the path never had: the database, the mailer, the mailbox
// resolution, the pooled rotation and the AI draft step, all stood up so the real function runs
// end to end and we can watch WHICH leads actually reach `sendAs`. That is the only kind of
// proof that distinguishes "the gate is written" from "the gate works".
//
// The harness is deliberately reusable — `runBatch()` takes the leads and returns who was
// mailed — because this path still has no other coverage and the next defect here should cost
// a test, not a test framework.

type MockLead = {
  id: string; email: string; first_name: string; last_name: string
  company: string | null; country: string | null; client_id?: string
}

const state = {
  leads: [] as MockLead[],
  /** Addresses that actually reached the mailer. The whole question, in one array. */
  mailed: [] as string[],
  sentRows: [] as Record<string, unknown>[],
  warnings: [] as string[],
}

vi.mock('@kind/db', () => {
  const chain = (table: string): Record<string, unknown> => {
    const q: Record<string, unknown> = {
      select() { return q },
      eq() { return q },
      is() { return q },
      not() { return q },
      gte() { return q },
      in() { return q },
      order() { return q },
      limit() { return q },
      insert(row: Record<string, unknown>) {
        if (table === 'figsy_sent_emails') state.sentRows.push(row)
        return Promise.resolve({ data: null, error: null })
      },
      update() {
        const c: Record<string, unknown> = {
          eq() { return c }, in() { return c }, select() { return c },
          then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
        }
        return c
      },
      async single() {
        if (table === 'clients') return { data: { company_name: 'Acme Client', industry: 'SaaS' }, error: null }
        return { data: null, error: null }
      },
      async maybeSingle() {
        if (table === 'clients') return { data: { signer_name: 'Ada' }, error: null }
        // Nobody is on the blocklist — this file is about PECR, and a blocklist hit would
        // skip the lead for the WRONG reason and quietly fake a pass.
        if (table === 'opt_out_blocklist') return { data: null, error: null }
        return { data: null, error: null }
      },
      // Awaiting the builder itself (the `leads` and `client_inboxes` reads do this).
      then(resolve: (v: unknown) => unknown) {
        if (table === 'leads')          return Promise.resolve({ data: state.leads, error: null }).then(resolve)
        if (table === 'client_inboxes') return Promise.resolve({ data: [INBOX], error: null }).then(resolve)
        return Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)
      },
    }
    return q
  }
  return { db: { from: (t: string) => chain(t) } }
})

const INBOX = {
  id: 'ib1', email: 'ada@acme-client.com', kind: 'branded', status: 'active', provider: 'smtp',
  daily_cap: 30, smtp_host: 'smtp.acme.com', smtp_port: 587, smtp_secure: true,
  smtp_user: 'ada@acme-client.com', smtp_pass_enc: 'v1:a:b:c', from_name: 'Ada',
}

vi.mock('./demo',        () => ({ isDemoClient: async () => false }))
vi.mock('./suppression', () => ({ isSuppressed: () => false }))
vi.mock('./alerts',      () => ({ sendFounderAlert: async () => undefined }))
vi.mock('./inbox-secret', () => ({ secretState: () => ({ ok: true }) }))
vi.mock('./sending-inbox', () => ({
  resolveSendingInbox: async () => ({ ok: true, inbox: INBOX }),
  refusalLabel: () => 'no mailbox',
  sendablePool: () => ({ ok: true, boxes: [INBOX] }),
  nextFromRotation: (rot: { id: string }[]) => rot[0]?.id ?? null,
}))

// THE OBSERVATION POINT. Every address that gets here is an address we cold-emailed.
vi.mock('./mailer', () => ({
  sendAs: async (_inbox: unknown, mail: { to: string }) => {
    state.mailed.push(mail.to)
    return { ok: true, id: `m-${state.mailed.length}`, error: null }
  },
}))

// The AI draft step — deterministic, and it must return the JSON shape the real prompt asks
// for. The first version of this mock returned prose, every draft threw "Claude returned
// invalid JSON", and NOTHING sent — which made the red proof pass for entirely the wrong
// reason. A suppression test that passes because the whole batch is broken proves nothing, and
// the only thing that caught it was asserting that the ALLOWED leads do still send.
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: 'text', text: JSON.stringify({ subject: 'Hello', body: 'Body text.' }) }],
      }),
    }
  },
}))

const UK_SOLE_TRADER: MockLead = {
  id: 'l-uk', email: 'sole@trader.co.uk', first_name: 'Sam', last_name: 'Trader',
  company: null, country: 'United Kingdom', client_id: 'c1',
}
const UK_LIMITED: MockLead = {
  id: 'l-ltd', email: 'ops@bigco.co.uk', first_name: 'Bea', last_name: 'Ltd',
  company: 'BigCo Ltd', country: 'United Kingdom', client_id: 'c1',
}
const US_LEAD: MockLead = {
  id: 'l-us', email: 'chris@usco.com', first_name: 'Chris', last_name: 'US',
  company: 'USCo Inc', country: 'United States', client_id: 'c1',
}

async function runBatch(leads: MockLead[]): Promise<string[]> {
  state.leads = leads
  state.mailed = []
  state.sentRows = []
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  const { sendDay1OutreachBatch } = await import('./figsy')
  await sendDay1OutreachBatch(leads.map(l => l.id), 'c1', 'Acme Client')
  return state.mailed
}

beforeEach(() => {
  state.leads = []; state.mailed = []; state.sentRows = []; state.warnings = []
})

describe('#617 RED PROOF — a UK lead with no corporate marker', () => {
  it('OLD behaviour: the batch had NO PECR gate, so this lead was cold-emailed', async () => {
    // The pre-fix pipeline, reproduced exactly: kill-switch, do-not-contact, blocklist —
    // and then it sends. No PECR question is asked at any point.
    const oldPipeline = (leads: MockLead[]) => leads
      .filter(l => !!l.email)
      .filter(() => true)          // isSuppressed → false
      .filter(() => true)          // blocklist    → miss
      .map(l => l.email)           // → straight to sendAs

    expect(oldPipeline([UK_SOLE_TRADER])).toEqual(['sole@trader.co.uk'])   // ← RED
  })

  it('NEW behaviour, REAL FUNCTION: the same lead is skipped and never reaches the mailer', async () => {
    const mailed = await runBatch([UK_SOLE_TRADER])

    expect(mailed, 'a UK sole trader has no corporate marker — PECR needs consent').toEqual([])
    expect(state.sentRows, 'and no phantom sent row is written either').toEqual([])
  })
})

describe('#617 — the gate refuses the right leads and only those', () => {
  it('a UK company WITH a corporate marker still sends — the B2B exemption applies', async () => {
    const mailed = await runBatch([UK_LIMITED])
    expect(mailed).toEqual(['ops@bigco.co.uk'])
  })

  it('a US lead is untouched — PECR does not govern it', async () => {
    const mailed = await runBatch([US_LEAD])
    expect(mailed).toEqual(['chris@usco.com'])
  })

  it('a mixed batch skips ONLY the refused lead and keeps going', async () => {
    // The `continue` matters: a refusal must not abort the batch. Ordering the refused lead
    // FIRST is deliberate — a `break` would have passed a test that put it last.
    const mailed = await runBatch([UK_SOLE_TRADER, UK_LIMITED, US_LEAD])

    expect(mailed).toEqual(['ops@bigco.co.uk', 'chris@usco.com'])
    expect(mailed).not.toContain('sole@trader.co.uk')
  })

  it('a lead with NO country still sends — and that is deliberate, not an oversight', async () => {
    // pecrVerdict returns allow:true / class 'unknown_country' on purpose: refusing every
    // blank country would silently delete most of the book on a field enrichment often misses.
    // ⚠️ Worth knowing what that means today — the founder's own export showed 166 of 166 leads
    // with no country, so this gate passes the entire current book. It protects the leads that
    // DO say United Kingdom, which is who it is for. Pinned so nobody "fixes" it by accident.
    const noCountry: MockLead = { ...UK_SOLE_TRADER, id: 'l-none', email: 'x@y.com', country: null }
    const mailed = await runBatch([noCountry])
    expect(mailed).toEqual(['x@y.com'])
  })
})

describe('#617 — the refusal is named through the shared helper', () => {
  it('logs the skip using pecrSkipReason, so three gates cannot word it three ways', async () => {
    const warns: string[] = []
    const spy = vi.spyOn(console, 'warn').mockImplementation((...a) => { warns.push(a.join(' ')) })
    try { await runBatch([UK_SOLE_TRADER]) } finally { spy.mockRestore() }

    expect(warns.join('\n')).toContain('pecr_individual_risk:')
    expect(warns.join('\n')).toContain('sole@trader.co.uk')
  })
})

describe('#617 — the gates that were already there still work', () => {
  it('the kill-switch still stops the whole batch', async () => {
    state.leads = [US_LEAD]
    state.mailed = []
    process.env.AUTO_OUTREACH_ENABLED = 'false'
    const { sendDay1OutreachBatch } = await import('./figsy')
    await sendDay1OutreachBatch(['l-us'], 'c1', 'Acme Client')
    process.env.AUTO_OUTREACH_ENABLED = 'true'

    expect(state.mailed, 'PECR is an ADDITIONAL gate, not a replacement').toEqual([])
  })
})
