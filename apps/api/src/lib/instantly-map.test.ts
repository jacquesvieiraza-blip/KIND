import { describe, it, expect } from 'vitest'
import {
  canPushToInstantly, refusalLabel, toInstantlyLead, toInstantlySequence, fromInstantlyReply,
} from './instantly-map'

// PROMPT 4 — INSTANTLY, CLIENT ZERO.
//
// No network anywhere in this file. The two things that matter — *may this lead leave the
// building?* and *what exactly gets sent?* — are asserted against pure functions, because a
// wrong field name does not throw: it sends a blank first name to a real person.

const ALLOWED = { hasApiKey: true, killSwitchOn: true, isDemo: false, isHouseClient: true, leadEmail: 'a@b.com' }

// ── THE GATES ─────────────────────────────────────────────────────────────────────────
// Nothing here relaxes anything. These prove the existing gates still bite on the new path.
describe('canPushToInstantly — every existing gate still applies', () => {
  it('allows a real house lead when everything is in order', () => {
    expect(canPushToInstantly(ALLOWED)).toEqual({ ok: true })
  })

  it('a DEMO is refused — the one failure with a real person on the other end', () => {
    const d = canPushToInstantly({ ...ALLOWED, isDemo: true })
    expect(d.ok).toBe(false)
    expect(!d.ok && d.reason).toBe('is_demo')
  })

  it('the demo stop is checked FIRST — it wins even when everything else is also wrong', () => {
    // This is the assertion that survives a future reordering. If someone moves the demo
    // check behind a cheaper test, this fails.
    const d = canPushToInstantly({
      hasApiKey: false, killSwitchOn: false, isDemo: true, isHouseClient: false, leadEmail: null,
    })
    expect(!d.ok && d.reason).toBe('is_demo')
  })

  it('the kill-switch governs Instantly exactly as it governs SMTP', () => {
    const d = canPushToInstantly({ ...ALLOWED, killSwitchOn: false })
    expect(!d.ok && d.reason).toBe('kill_switch_off')
  })

  it('a CLIENT is refused — Instantly is ours, Smartlead is theirs (#577)', () => {
    const d = canPushToInstantly({ ...ALLOWED, isHouseClient: false })
    expect(!d.ok && d.reason).toBe('not_house_client')
  })

  it('no API key refuses rather than half-pushing', () => {
    expect(!canPushToInstantly({ ...ALLOWED, hasApiKey: false }).ok).toBe(true)
  })

  it('a lead with no email is refused — it would inflate the campaign count with a dead row', () => {
    expect(canPushToInstantly({ ...ALLOWED, leadEmail: null }).ok).toBe(false)
    expect(canPushToInstantly({ ...ALLOWED, leadEmail: '   ' }).ok).toBe(false)
  })

  it('every refusal carries a reason a human can act on', () => {
    for (const bad of [
      { ...ALLOWED, isDemo: true }, { ...ALLOWED, killSwitchOn: false },
      { ...ALLOWED, isHouseClient: false }, { ...ALLOWED, hasApiKey: false },
      { ...ALLOWED, leadEmail: null },
    ]) {
      const d = canPushToInstantly(bad)
      expect(d.ok).toBe(false)
      if (!d.ok) {
        expect(d.detail.length).toBeGreaterThan(20)
        expect(refusalLabel(d.reason).length).toBeGreaterThan(5)
      }
    }
  })
})

// ── THE PAYLOAD ───────────────────────────────────────────────────────────────────────
describe('toInstantlyLead', () => {
  it('maps our lead onto their field names', () => {
    expect(toInstantlyLead({
      first_name: 'Thabo', last_name: 'Nkosi', email: 'Thabo@Acme.CO.ZA',
      company: 'Acme Logistics', job_title: 'Head of Ops', industry: 'Logistics', country: 'South Africa',
    })).toEqual({
      email: 'thabo@acme.co.za',
      first_name: 'Thabo', last_name: 'Nkosi',
      company_name: 'Acme Logistics',
      personalization: 'Head of Ops',
      custom_variables: { job_title: 'Head of Ops', industry: 'Logistics', country: 'South Africa' },
    })
  })

  it('never emits undefined — Instantly renders whatever it holds, into a real email', () => {
    const p = toInstantlyLead({ email: 'x@y.com' })
    expect(p.first_name).toBe('')
    expect(p.company_name).toBe('')
    for (const v of Object.values(p.custom_variables)) expect(typeof v).toBe('string')
  })

  it('lowercases the address — reply matching is case-sensitive at the database', () => {
    expect(toInstantlyLead({ email: '  ThAbO@Acme.com ' }).email).toBe('thabo@acme.com')
  })
})

describe('toInstantlySequence', () => {
  const lead = { first_name: 'Thabo', company: 'Acme' }
  const steps = [
    { channel: 'email' as const, subject: 'Hi {{first_name}}', body: 'About {{company}}', wait_days: 0 },
    { channel: 'email' as const, subject: 'Following up', body: 'Any thoughts?', wait_days: 3 },
    { channel: 'email' as const, subject: 'Last one', body: 'Closing the loop', wait_days: 4 },
  ]

  it('renders OUR tokens — the prospect must never see the braces', () => {
    const out = toInstantlySequence(steps, lead)
    expect(out[0].subject).toBe('Hi Thabo')
    expect(out[0].body).toBe('About Acme')
    expect(out[0].subject).not.toContain('{{')
  })

  it('converts gaps into CUMULATIVE days — the bug that would fire every follow-up early', () => {
    // Our wait_days is "since the previous step". Instantly schedules from campaign start.
    // Passing 0/3/4 straight through would send step 3 on day 4 instead of day 7.
    expect(toInstantlySequence(steps, lead).map(s => s.day)).toEqual([0, 3, 7])
  })

  it('drops non-email steps — Instantly sends email', () => {
    const mixed = [...steps, { channel: 'linkedin' as const, body: 'connect', wait_days: 1 }]
    expect(toInstantlySequence(mixed as never, lead)).toHaveLength(3)
  })

  it('an empty sequence yields an empty campaign rather than throwing', () => {
    expect(toInstantlySequence([], lead)).toEqual([])
  })
})

// ── REPLIES ───────────────────────────────────────────────────────────────────────────
// Produces the SAME shape Resend produces, so it flows through Prompt 2's reply spine
// (#589) — the multi-client match, the empty-body alert, the checked opt-out writes.
// Building a second reply path is exactly what that prompt existed to prevent.
describe('fromInstantlyReply', () => {
  it('maps a reply onto the provider-agnostic shape', () => {
    const r = fromInstantlyReply({
      lead_email: 'Thabo@Acme.com', lead_name: 'Thabo Nkosi',
      reply_subject: 'Re: quick question', reply_text: 'Tuesday works.', id: 'ins_123',
    })
    expect(r).toEqual({
      fromEmail: 'thabo@acme.com', fromName: 'Thabo Nkosi',
      subject: 'Re: quick question', body: 'Tuesday works.',
      providerMessageId: 'ins_123', provider: 'instantly',
    })
  })

  it('falls back to HTML and strips the tags when there is no text part', () => {
    const r = fromInstantlyReply({ lead_email: 'a@b.com', reply_html: '<p>Yes <b>please</b></p>' })
    expect(r?.body).toBe('Yes  please')
  })

  it('returns NULL when there is no sender — the caller must escalate, not store it against nobody', () => {
    expect(fromInstantlyReply({ reply_text: 'hello' })).toBeNull()
    expect(fromInstantlyReply({})).toBeNull()
  })

  it('accepts the alternative field names their payloads use', () => {
    expect(fromInstantlyReply({ from_email: 'a@b.com', text: 'hi' })?.fromEmail).toBe('a@b.com')
    expect(fromInstantlyReply({ email: 'a@b.com', body: 'hi' })?.body).toBe('hi')
  })

  it('an empty body still returns a reply — Prompt 2 decides what to do about that, not this', () => {
    // Deliberate: `isUnusable` in reply-ingest owns that judgement, and it ALERTS. Dropping
    // it here would restore the silent-200 bug on a new provider.
    const r = fromInstantlyReply({ lead_email: 'a@b.com' })
    expect(r).not.toBeNull()
    expect(r?.body).toBe('')
  })
})

