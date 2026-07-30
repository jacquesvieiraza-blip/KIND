import { describe, it, expect } from 'vitest'
import {
  decideHouseClient, parseMailboxInput, readinessTone, nextStepFor,
  HOUSE_CLIENT_NAME, HOUSE_CLIENT_ID_NOTICE, HOUSE_ACCOUNT_EMAIL,
  ADDABLE_STATUSES, ADDABLE_KINDS, DEFAULT_WARMUP_DAYS,
} from './house-client'

// #547/#552/#553 — GETTING CLIENT ZERO FROM "I OWN FOUR MAILBOXES" TO "THE PRODUCT SENDS".
//
// Tomorrow the founder buys four Google mailboxes. The Supabase dashboard is unreachable on
// this account, so **anything that needs a hand-written INSERT is not a plan** — every step
// has to be a control in Vida. Three judgements had to exist for that to be possible, and
// they are all here, pure, because none of them should need a database to prove:
//
//   ① WHAT A MAILBOX ROW MUST CARRY before it is worth saving — the half-filled row is the
//      state that made "Assign pooled inbox" look like it worked while the client still
//      could not send anyone an email (#552).
//   ② ADOPT vs CREATE for the house client. Minting a second account for the founder's own
//      login is #584 happening again, on purpose this time.
//   ③ WHICH REFUSALS ARE THIS CLIENT'S PROBLEM and which are everyone's — a distinction the
//      board has to draw in colour, or a broken environment reads as one client's to-do.

// ── ② ADOPT, CREATE, OR REFUSE ───────────────────────────────────────────────────────────

const client = (o: Partial<{ id: string; user_id: string | null; company_name: string | null; is_demo: boolean | null }> = {}) => ({
  id: 'c-1', user_id: 'u-house', company_name: HOUSE_CLIENT_NAME, is_demo: false, ...o,
})

describe('the house client is ADOPTED when one already exists', () => {
  it('adopts the account the house login already owns', () => {
    // The founder signs into the portal, which creates a client row. Creating a second is
    // how #584 happened: two accounts for one person and nothing deciding which is real.
    const d = decideHouseClient({ houseUserIds: ['u-house'], clients: [client(), client({ id: 'c-2', user_id: 'u-other' })] })
    expect(d.action).toBe('adopt')
    expect(d.action === 'adopt' && d.clientId).toBe('c-1')
    expect(d.why).toContain('#584')
  })

  it('flags a house account wrongly marked as a demo', () => {
    // `is_demo` excludes it from every revenue figure AND makes the CSV import refuse it
    // (#599) — so Client Zero would silently be unable to receive its own prospect list.
    const d = decideHouseClient({ houseUserIds: ['u-house'], clients: [client({ is_demo: true })] })
    expect(d.action === 'adopt' && d.needsUnDemo).toBe(true)
  })

  it('flags a rename only when the name actually differs', () => {
    const named = decideHouseClient({ houseUserIds: ['u-house'], clients: [client()] })
    const unnamed = decideHouseClient({ houseUserIds: ['u-house'], clients: [client({ company_name: null })] })
    expect(named.action === 'adopt' && named.needsRename).toBe(false)
    expect(unnamed.action === 'adopt' && unnamed.needsRename).toBe(true)
  })

  it('matches on the AUTH USER, never on the company name', () => {
    // #593's rule. A name is a label a human edits; an id is not. An account called exactly
    // the house name but owned by someone else must not be adopted.
    const d = decideHouseClient({
      houseUserIds: ['u-house'],
      clients: [client({ id: 'imposter', user_id: 'u-someone-else', company_name: HOUSE_CLIENT_NAME })],
    })
    expect(d.action).toBe('create')
  })
})

describe('it creates only when there is genuinely nothing to adopt', () => {
  it('creates against the house auth user when it owns no client row', () => {
    const d = decideHouseClient({ houseUserIds: ['u-house'], clients: [client({ id: 'c-2', user_id: 'u-other' })] })
    expect(d.action).toBe('create')
    expect(d.action === 'create' && d.userId).toBe('u-house')
  })

  it('REFUSES when no house auth user exists, and does not mint one', () => {
    // We could call auth.admin.createUser — the demo seeder does — but that means generating
    // a password for the founder's own identity. Asking him to sign in once is smaller.
    const d = decideHouseClient({ houseUserIds: [], clients: [client()] })
    expect(d.action).toBe('refuse')
    expect(d.why).toContain(HOUSE_ACCOUNT_EMAIL)
    expect(d.why).toContain('Sign in to the portal')
  })

  it('REFUSES when the house login owns two accounts, and names them both', () => {
    // A coin toss here attaches our outreach to the wrong account's history. A human decides.
    const d = decideHouseClient({
      houseUserIds: ['u-house'],
      clients: [client({ id: 'c-1' }), client({ id: 'c-2', company_name: 'Old test' })],
    })
    expect(d.action).toBe('refuse')
    expect(d.action === 'refuse' && d.candidates?.map(c => c.id)).toEqual(['c-1', 'c-2'])
  })

  it('an empty client list still creates rather than refusing', () => {
    expect(decideHouseClient({ houseUserIds: ['u-house'], clients: [] }).action).toBe('create')
  })
})

describe('the HOUSE_CLIENT_ID warning travels with the id', () => {
  it('says plainly not to set it, and why', () => {
    // The id is exactly what makes somebody want to set the variable "to finish setup".
    // It gates the PARKED Instantly push (#593) and nothing about our own sending.
    expect(HOUSE_CLIENT_ID_NOTICE).toContain('Do NOT set HOUSE_CLIENT_ID')
    expect(HOUSE_CLIENT_ID_NOTICE).toContain('#593')
    expect(HOUSE_CLIENT_ID_NOTICE).toContain('Our own engine sends')
  })
})

// ── ① THE MAILBOX FORM ───────────────────────────────────────────────────────────────────

const FULL = {
  email: 'Jacques@Get-Kind.com', kind: 'branded', provider: 'google-smtp', status: 'warming',
  smtp_host: 'smtp.gmail.com', smtp_user: 'jacques@get-kind.com', smtp_pass: 'app-password',
  from_name: 'Jacques', daily_cap: 30,
}
const ok = (o: Record<string, unknown> = {}) => {
  const r = parseMailboxInput({ ...FULL, ...o })
  if (!r.ok) throw new Error(`expected ok, got: ${r.errors.join(' | ')}`)
  return r.value
}
const errs = (o: Record<string, unknown>) => {
  const r = parseMailboxInput({ ...FULL, ...o })
  return r.ok ? [] : r.errors
}

describe('a mailbox is saved whole or not at all', () => {
  it('accepts a complete Google mailbox and normalises the address', () => {
    const v = ok()
    expect(v.email).toBe('jacques@get-kind.com')
    expect(v.provider).toBe('google-smtp')
    expect(v.hasPassword).toBe(true)
  })

  it('REFUSES partial SMTP details — the half-filled row is the #552 defect', () => {
    // pickSendingInbox needs host AND user AND password. Two of three is indistinguishable
    // on the board from none, and reads as "saved".
    expect(errs({ smtp_pass: '' }).join(' ')).toContain('host, username AND password')
    expect(errs({ smtp_user: '' }).join(' ')).toContain('host, username AND password')
    expect(errs({ smtp_host: '' }).join(' ')).toContain('host, username AND password')
  })

  it('accepts a mailbox with NO SMTP details at all — record now, credentials later', () => {
    // Recording the address before the app password has been generated is a real workflow;
    // it is the *partial* row that lies, not the empty one.
    const v = ok({ smtp_host: '', smtp_user: '', smtp_pass: '' })
    expect(v.smtp_host).toBeNull()
    expect(v.hasPassword).toBe(false)
  })

  it('never returns the password, only whether one was given', () => {
    // The plaintext goes straight from the request body to encryptSecret and touches nothing
    // else. If it were carried in this object it would end up in a log line eventually.
    expect(JSON.stringify(ok())).not.toContain('app-password')
    expect(Object.keys(ok())).not.toContain('smtp_pass')
  })

  it('rejects a non-address', () => {
    expect(errs({ email: 'not-an-address' }).join(' ')).toContain('mailbox address is required')
  })

  it('only warming or live, only branded or pooled', () => {
    expect(ADDABLE_STATUSES).toEqual(['warming', 'active'])
    expect(ADDABLE_KINDS).toEqual(['branded', 'pooled'])
    expect(errs({ status: 'active-ish' }).join(' ')).toContain('warming, active')
    expect(errs({ kind: 'whatever' }).join(' ')).toContain('branded, pooled')
  })

  it('daily cap is optional, bounded, and blank means no cap', () => {
    expect(ok({ daily_cap: '' }).daily_cap).toBeNull()
    expect(ok({ daily_cap: '30' }).daily_cap).toBe(30)
    expect(errs({ daily_cap: 0 }).join(' ')).toContain('between 1 and 2000')
    expect(errs({ daily_cap: 9999 }).join(' ')).toContain('between 1 and 2000')
  })

  it('warms for 21 days by default, NOT the 14 the client SOP uses', () => {
    // /inboxes/brand records a mailbox a vendor pre-warmed. These are boxes bought this
    // morning with no reputation, and the founder's own plan says 3–4 weeks. Quoting 14
    // would put a "ready" date on screen a week before it is true.
    expect(DEFAULT_WARMUP_DAYS).toBe(21)
    expect(ok().warmupDays).toBe(21)
    expect(ok({ warmup_days: 28 }).warmupDays).toBe(28)
    expect(errs({ warmup_days: 200 }).join(' ')).toContain('between 0 and 90')
  })

  it('reports EVERY problem at once, not one per submit', () => {
    const e = errs({ email: 'x', status: 'nope', daily_cap: -1 })
    expect(e.length).toBeGreaterThanOrEqual(3)
  })
})

// ── ③ READINESS, IN COLOUR ───────────────────────────────────────────────────────────────

describe('a broken environment does not read as one client\'s to-do', () => {
  it('can send is OK', () => {
    expect(readinessTone(true, null)).toBe('ok')
  })

  it('missing mailbox, missing credentials and warming are AMBER — each is a task', () => {
    for (const r of ['no_inbox', 'no_credentials', 'warming_only']) {
      expect(readinessTone(false, r)).toBe('amber')
    }
  })

  it('a missing INBOX_SECRET_KEY is RED — it kills EVERY client, not this one', () => {
    // Painting this the same amber as "no mailbox yet" sends the founder to add a mailbox
    // for a client whose mailbox was never the problem.
    expect(readinessTone(false, 'no_secret_key')).toBe('red')
  })

  it('an unknown state is RED, never amber and never calm', () => {
    // "We could not tell" must not wear the same colour as an ordinary not-set-up-yet.
    // That is the #565 shape and the reason this whole board exists.
    expect(readinessTone(false, 'lookup_failed')).toBe('red')
    expect(readinessTone(false, 'check_failed')).toBe('red')
  })

  it('every refusal names a next step, and they are different steps', () => {
    const steps = ['no_inbox', 'no_credentials', 'warming_only', 'no_secret_key', 'lookup_failed', 'check_failed']
      .map(nextStepFor)
    expect(new Set(steps).size).toBe(steps.length)
    for (const s of steps) expect(s.length).toBeGreaterThan(30)
  })

  it('the database-failure step says do NOT go and add a mailbox', () => {
    // The old label sent the operator to configure a mailbox that was already there while
    // the database was the thing that was down (audit 27 Jul).
    expect(nextStepFor('lookup_failed')).toContain('do not go and add a mailbox')
    expect(nextStepFor('no_secret_key')).toContain('ANY client')
  })
})
