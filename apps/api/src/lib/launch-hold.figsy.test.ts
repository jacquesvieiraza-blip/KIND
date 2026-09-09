import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ── THE LAUNCH-COUNTRY HOLD, ON THE SEND AND ENROL PATHS ──────────────────────────────────
//
// Founder-locked 20 Aug: at launch we send to the US and the UK, and nowhere else. A lead
// anywhere else is HELD — not deleted, not passed, not charged — and starts sending the day he
// opens its country.
//
// Six gates enforce it. Each one is covered by the strongest proof its path allows:
//
//   1. `approve-lead.ts` step 3d, before the $4     → EXECUTED in approve-lead.test.ts
//   2. `routes/figsy.ts` enrol gate (first route)   → placement guard, below
//   3. `routes/figsy.ts` enrol gate (second route)  → placement guard, below
//   4. `figsy.ts` autoEnrollLead                    → placement guard, below
//   5. `figsy.ts` sendDay1OutreachBatch             → EXECUTED in day1-pecr.test.ts
//   6. `figsy.ts` sendSequenceEmail                 → EXECUTED in this file
//
// ⚠️ AND THE DIFFERENCE BETWEEN THOSE TWO WORDS IS STATED, NOT BLURRED. An executed test runs
// the real function and watches whether a lead reaches the mailer. A placement guard reads the
// source and asserts the gate is written in the right ORDER relative to the charge. The second
// is genuinely weaker — it proves a call exists, and #617 existed precisely because a call
// existed in two functions and not a third, which reads as "handled" to anything counting
// occurrences. The enrol-route handlers are hundreds of lines with a dozen collaborators; the
// guards below are what this repo already uses for them (`pecr.test.ts`), and calling them
// proof of behaviour would be the dishonest part, not writing them.

const state = {
  blocked: false,
  mailerCalls: [] as string[],
  enrollmentUpdates: [] as Record<string, unknown>[],
}

vi.mock('@kind/db', () => ({
  db: {
    // `increment_figsy_emails_sent` runs AFTER a successful send. Omitted, it throws a
    // TypeError past the mailer and the test fails on the exception rather than the
    // assertion — which reads like the gate blocked the send when in fact it did not.
    rpc: async () => ({ data: null, error: null }),
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select() { return q },
        eq() { return q }, is() { return q }, in() { return q },
        // `not()` added 29 Aug (BUILD-003 PR2): the programme-authority read uses
        // `.not('status','in',...)` to skip terminal programmes. Without it the chain throws,
        // the gate fails CLOSED — correctly — and every send here defers for the wrong reason.
        not() { return q },
        order() { return q }, limit() { return q },
        // Chainable AND awaitable: `figsy_sent_emails` is written as
        // `.insert(row).select('id').single()`, and an insert mock that returns a bare Promise
        // makes `.select` undefined — the function throws on the line before the mailer, so
        // NOTHING sends and every suppression assertion here passes for the wrong reason.
        insert() {
          const ins: Record<string, unknown> = {
            select() { return ins },
            async single() { return { data: { id: 'se1' }, error: null } },
            async maybeSingle() { return { data: { id: 'se1' }, error: null } },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return ins
        },
        update(row: Record<string, unknown>) {
          if (table === 'figsy_enrollments') state.enrollmentUpdates.push(row)
          // ⚠️ THE ATOMIC STEP CLAIM (#354) MUST BE GRANTED, or the allowed leads never send and
          // every suppression assertion in this file passes for the wrong reason. The claim is
          // `update({current_step}).eq(id).eq(current_step).select('id').maybeSingle()`, and a
          // mock returning `{ data: null }` reads as "another runner already took this step" —
          // so the function bails BEFORE the mailer on US and UK leads too. That is exactly the
          // #617 harness failure: a batch that is entirely broken looks like a working gate.
          const granted = table === 'figsy_enrollments' && 'current_step' in row ? { id: 'e1' } : null
          const chain: Record<string, unknown> = {
            eq() { return chain }, is() { return chain }, in() { return chain }, select() { return chain },
            maybeSingle() { return Promise.resolve({ data: granted, error: null }) },
            single() { return Promise.resolve({ data: granted, error: null }) },
            then(r: (v: unknown) => unknown) { return Promise.resolve({ data: null, error: null }).then(r) },
          }
          return chain
        },
        async maybeSingle() {
          // No campaign row ⟹ no review required ⟹ the send proceeds. That is the legitimate
          // `{ data: null, error: null }` case C7 pinned, and it keeps this file about countries.
          if (table === 'opt_out_blocklist')  return { data: state.blocked ? { id: 'b1' } : null, error: null }
          if (table === 'figsy_enrollments')  return { data: { client_id: 'c1' }, error: null }
          // ⛓️ C2 — THE CLIENT ROW, added for the same reason `not()` was: the send gate now
          // resolves `clients.commercial_model` before it reads the programme, and a client that
          // does not exist fails CLOSED — correctly — so every send here would defer for a
          // reason that has nothing to do with countries. `commercial_model: null` is the
          // UNCLASSIFIED state, which with no programme is LEGACY.
          if (table === 'clients')            return { data: { id: 'c1', commercial_model: null }, error: null }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null, count: 0 }).then(r) },
      }
      return q
    },
  },
}))

vi.mock('./demo',        () => ({ isDemoClient: async () => false }))
vi.mock('./suppression', () => ({ isSuppressed: () => false }))
vi.mock('./billing-rules', () => ({
  normalizeRevealEmail: (e: string | null) => (e ? e.trim().toLowerCase() : null),
  normalizeRevealEmails: (xs: (string | null)[]) => xs.filter(Boolean).map(e => String(e).trim().toLowerCase()),
  canEnroll: () => ({ ok: true }),
}))
// THE OBSERVATION POINT. Every address that gets here is an address we emailed.
vi.mock('./mailer', () => ({
  sendAs: async (_i: unknown, mail: { to: string }) => { state.mailerCalls.push(mail.to); return { ok: true, id: 'm1', error: null } },
}))
// The client's own mailbox (#547/#548) — sends leave through SMTP, not Resend, so without this
// every allowed lead is refused for "no sending mailbox" and the positive assertions below go
// red for a reason that has nothing to do with countries.
const INBOX = {
  id: 'ib1', email: 'ada@acme-client.com', kind: 'branded', status: 'active', provider: 'smtp',
  daily_cap: 30, smtp_host: 'smtp.acme.com', smtp_port: 587, smtp_secure: true,
  smtp_user: 'ada@acme-client.com', smtp_pass_enc: 'v1:a:b:c', from_name: 'Ada',
}
vi.mock('./sending-inbox', () => ({
  resolveSendingInbox: async () => ({ ok: true, inbox: INBOX }),
  refusalLabel: () => 'no mailbox',
  sendablePool: () => ({ ok: true, boxes: [INBOX] }),
  nextFromRotation: (rot: { id: string }[]) => rot[0]?.id ?? null,
}))
vi.mock('./inbox-secret', () => ({ secretState: () => ({ ok: true }) }))
vi.mock('./alerts', () => ({ sendFounderAlert: async () => undefined }))

const lead = (country: string | null) => ({
  id: 'l1', client_id: 'c1', email: 'prospect@acme.com',
  first_name: 'Ada', last_name: 'Lovelace', company: 'Acme Ltd', country,
} as never)

async function callSend(country: string | null) {
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  const { sendSequenceEmail } = await import('./figsy')
  return sendSequenceEmail('e1', lead(country), 1, 'Subject', 'Body', 'camp-1')
}

beforeEach(() => {
  state.blocked = false
  state.mailerCalls = []
  state.enrollmentUpdates = []
})

describe('gate 6 — sendSequenceEmail, the safety net under every step-1/2/3 send', () => {
  it('RED PROOF — with only the enrol gates, an enrollment created BEFORE the hold still sends', () => {
    // This is the population the enrol gates structurally cannot cover: rows that were already
    // live and due when the allowlist shipped. There is no enrol event left to gate — the only
    // place left to stop them is the send itself.
    const preExistingEnrollment = { country: 'Nigeria', enrolled: 'before the allowlist shipped' }
    const oldSendPath = (l: { country: string }) => [l.country]   // no country question at all
    expect(oldSendPath(preExistingEnrollment)).toEqual(['Nigeria'])   // ← RED: it sends
  })

  it('GREEN, REAL FUNCTION: a Nigerian lead is suppressed and never reaches the mailer', async () => {
    const outcome = await callSend('Nigeria')

    expect(outcome).toBe('suppressed')
    expect(state.mailerCalls, 'THE ASSERTION THAT MATTERS').toEqual([])
  })

  it('stands the enrollment DOWN rather than leaving it due to re-fire every cron run', async () => {
    // The #349/#453 lesson: a suppressed row left due is re-processed forever. Standing it down
    // is still correct even though this hold is TEMPORARY — re-arming it is one update per
    // country the day he opens one, whereas a cron re-checking it every ten minutes until then
    // is pure burn with nothing to show for it.
    await callSend('Nigeria')
    expect(state.enrollmentUpdates.some(u => u.next_send_at === null)).toBe(true)
  })

  it('a blank country is suppressed too — the deliberate inversion of the PECR net above it', async () => {
    const outcome = await callSend(null)
    expect(outcome).toBe('suppressed')
    expect(state.mailerCalls).toEqual([])
  })

  it('a US lead still sends — the net refuses the right leads and only those', async () => {
    const outcome = await callSend('United States')
    expect(outcome, 'not merely "not suppressed" — it must actually SEND').toBe('sent')
    expect(state.mailerCalls).toEqual(['prospect@acme.com'])
  })

  it('a UK lead with a corporate marker still sends — PECR and the allowlist both pass it', async () => {
    await callSend('United Kingdom')
    expect(state.mailerCalls).toEqual(['prospect@acme.com'])
  })

  it('names the hold in the log, through the shared helper', async () => {
    const warns: string[] = []
    const spy = vi.spyOn(console, 'warn').mockImplementation((...a) => { warns.push(a.join(' ')) })
    try { await callSend('Nigeria') } finally { spy.mockRestore() }

    expect(warns.join('\n')).toContain('launch_hold: Nigeria')
    expect(warns.join('\n')).toContain('prospect@acme.com')
  })

  it('the gates that were already there still work — this is an ADDITIONAL check', async () => {
    // A new gate that quietly replaced the opt-out net would be a far worse bug than the one it
    // fixes, and it would look identical from the outside: nothing sends either way.
    state.blocked = true
    const outcome = await callSend('United States')
    expect(outcome).toBe('suppressed')
    expect(state.mailerCalls).toEqual([])
  })
})

// ── PLACEMENT GUARDS — THE THREE ENROL GATES ──────────────────────────────────────────────
//
// What these can and cannot prove is stated at the top of this file. They exist for one
// specific failure that a behavioural test on ONE route would miss entirely: a gate added to
// the first enrol route and forgotten on the second, or written on the wrong side of the
// charge. Both are ORDERING facts, visible in the source and invisible from a single call.

describe('the two enrol routes hold, and hold BEFORE the charge', () => {
  const src = readFileSync(join(__dirname, '..', 'routes', 'figsy.ts'), 'utf8')

  it('the launch gate appears in BOTH enrol paths, not just the first', () => {
    // #617's shape exactly: present in two places, absent from a third, and every count-based
    // check reads the file as "handled".
    expect(src.split('isLaunchSendCountry(lead.country)').length - 1).toBe(2)
  })

  it('asks BEFORE chargeFigsyEnroll on every path — never a credit for a lead we refuse (#332)', () => {
    const charges = [...src.matchAll(/chargeFigsyEnroll/g)].map(m => m.index ?? -1)
    const gates   = [...src.matchAll(/isLaunchSendCountry\(lead\.country\)/g)].map(m => m.index ?? -1)
    expect(gates.length, 'two enrol paths').toBe(2)
    expect(charges.length, 'and each one charges').toBeGreaterThanOrEqual(2)

    // Pair each gate with the FIRST charge that follows it, and require one to exist. A gate
    // with no charge after it is a gate that has drifted below the till.
    for (const g of gates) {
      const nextCharge = charges.find(c => c > g)
      expect(nextCharge, `a launch gate at ${g} has no charge after it — it may have moved below the charge`).toBeDefined()
    }
  })

  it('names the skip through the shared helper — two routes must not word it differently', () => {
    expect(src.split('launchHoldReason(lead.country)').length - 1).toBe(2)
  })

  it('the PECR gate is still there and still separate — the launch hold did not replace it', () => {
    // They answer different questions (UK law vs. which countries we have opened) and merging
    // them would collapse a legal test into a commercial one.
    expect(src.split('pecrVerdict({').length - 1).toBe(2)
    expect(src.split('pecrSkipReason(').length - 1).toBe(2)
  })
})

describe('gate 4 — autoEnrollLead, the path a client approval takes', () => {
  const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
  const fn = src.slice(src.indexOf('export async function autoEnrollLead'))

  it('holds a lead outside the launch countries', () => {
    expect(fn).toContain('isLaunchSendCountry(lead.country)')
  })

  it('holds BEFORE the credit gate — a held lead must cost neither a credit nor a draft', () => {
    const gate   = fn.indexOf('isLaunchSendCountry(lead.country)')
    const credit = fn.indexOf('canEnroll(client?.figsy_credits_remaining)')
    expect(gate).toBeGreaterThan(-1)
    expect(credit).toBeGreaterThan(-1)
    expect(gate, 'the launch hold must sit above the billing gate').toBeLessThan(credit)
  })

  it('is exempt for demo clients — the demo book is entirely South African', () => {
    // Asserted on the guard as written, because a launch hold that caught demo leads would
    // break every walkthrough with a symptom that points nowhere near a country allowlist.
    // ⛓️ RETARGETED 9 Sep — the guard gained `!opts?.prepareOnly`, because the launch hold is a
    // SEND decision and applying it at enrolment stopped House preparing prospects it may
    // perfectly well prepare. The hold itself is unchanged and still stands at send time
    // (`sendSequenceEmailCore`), and the demo exemption this case is about is untouched.
    expect(fn).toContain('!isDemo && !opts?.prepareOnly && !isLaunchSendCountry(lead.country)')
  })
})
