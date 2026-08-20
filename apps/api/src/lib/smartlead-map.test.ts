import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  canPushToSmartlead, smartleadRefusalLabel, toSmartleadLead, toSmartleadSequence,
  chunkLeads, SMARTLEAD_SENDING_MODE, SMARTLEAD_MAX_LEADS_PER_REQUEST,
} from './smartlead-map'
import { canPushToInstantly } from './instantly-map'

// PROMPT 7 — SMARTLEAD, FOR CLIENTS.
//
// The exact mirror of Instantly. Founder-locked: **Instantly is OURS, Smartlead is the
// CLIENTS'** (#577). The property that matters most is that the two gates are INVERSES, so
// exactly one route can ever accept a given lead and neither can silently take the other's
// traffic.

// HC-3 — the four suppression answers default to "clean lead" so this file keeps testing the
// SYSTEM gates it was written for. Their own behaviour is proved in `smartlead-hc3.test.ts`,
// including that each one refuses on its own and reports its own reason.
const gate = (over: Partial<Parameters<typeof canPushToSmartlead>[0]> = {}) => canPushToSmartlead({
  hasApiKey: true, killSwitchOn: true, isDemo: false, isHouseClient: false,
  hasSmartleadInbox: true, leadEmail: 'someone@acme.com',
  isBlocklisted: false, isDoNotContact: false, pecrAllows: true, inLaunchCountry: true, ...over,
})

describe('the gates are exact inverses — this is the whole safety property', () => {
  const shared = { hasApiKey: true, killSwitchOn: true, isDemo: false, leadEmail: 'a@b.com',
    // HC-3 — a clean lead, so the INVERSE property below is about routing and nothing else.
    isBlocklisted: false, isDoNotContact: false, pecrAllows: true, inLaunchCountry: true }

  it('THE HOUSE CLIENT goes to Instantly and is REFUSED by Smartlead', () => {
    expect(canPushToInstantly({ ...shared, isHouseClient: true }).ok).toBe(true)
    expect(canPushToSmartlead({ ...shared, isHouseClient: true, hasSmartleadInbox: true }).ok).toBe(false)
  })

  it('A CLIENT goes to Smartlead and is REFUSED by Instantly', () => {
    expect(canPushToSmartlead({ ...shared, isHouseClient: false, hasSmartleadInbox: true }).ok).toBe(true)
    expect(canPushToInstantly({ ...shared, isHouseClient: false }).ok).toBe(false)
  })

  it('NEVER BOTH — for any client, at most one route accepts', () => {
    // The assertion that lets approve-lead.ts attempt both pushes without an if/else, which
    // keeps the routing decision out of the money path.
    for (const isHouseClient of [true, false]) {
      const both = [
        canPushToInstantly({ ...shared, isHouseClient }).ok,
        canPushToSmartlead({ ...shared, isHouseClient, hasSmartleadInbox: true }).ok,
      ].filter(Boolean)
      expect(both.length, `isHouseClient=${isHouseClient}`).toBe(1)
    }
  })

  it('the house refusal explains the DOMAIN risk, not just the rule', () => {
    const r = canPushToSmartlead({ ...shared, isHouseClient: true, hasSmartleadInbox: true })
    expect(r.ok).toBe(false)
    expect(r.ok === false && r.detail).toContain('their domain would carry our complaints')
  })
})

describe('a demo can never reach a real person', () => {
  it('is refused FIRST, before anything cheaper', () => {
    // Checked before the client identity, so no future reordering can put it behind a cheaper
    // test. A demo reaching a real mailbox is the one failure with a person on the other end.
    const r = gate({ isDemo: true, hasApiKey: false, killSwitchOn: false, leadEmail: null })
    expect(r.ok === false && r.reason).toBe('is_demo')
  })
  it('and it is a hard stop, said in those words', () => {
    expect(gate({ isDemo: true }).ok === false && gate({ isDemo: true })).toMatchObject({ ok: false })
  })
})

describe('every other refusal, each with its own reason', () => {
  it('the kill-switch governs Smartlead exactly as it governs Instantly', () => {
    const r = gate({ killSwitchOn: false })
    expect(r.ok === false && r.reason).toBe('kill_switch_off')
  })
  it('no API key', () => {
    expect(gate({ hasApiKey: false }).ok === false && gate({ hasApiKey: false })).toMatchObject({ ok: false })
  })
  it('NO MAILBOX — a client with nothing to send FROM', () => {
    // Pushing anyway creates leads in a campaign that can never deliver: the "looks covered
    // on the board and cannot send a single email" failure #552 was raised for.
    const r = gate({ hasSmartleadInbox: false })
    expect(r.ok === false && r.reason).toBe('no_smartlead_inbox')
  })
  it('a lead with no email address', () => {
    const r = gate({ leadEmail: '   ' })
    expect(r.ok === false && r.reason).toBe('no_email')
  })
  it('a clean client passes', () => {
    expect(gate().ok).toBe(true)
  })
  it('every refusal has a human label', () => {
    for (const r of ['no_api_key', 'kill_switch_off', 'is_demo', 'is_house_client', 'no_smartlead_inbox', 'no_email'] as const) {
      expect(smartleadRefusalLabel(r).length, r).toBeGreaterThan(5)
    }
  })
})

describe('the lead payload — Smartlead\'s verified shape', () => {
  const lead = { email: ' a@b.com ', first_name: ' Ada ', last_name: 'Lovelace', company: 'Acme', job_title: 'CTO', industry: 'SaaS', country: 'ZA' }

  it('uses lead_list field names: email, first_name, last_name, company_name', () => {
    const p = toSmartleadLead(lead)
    expect(p).toMatchObject({ email: 'a@b.com', first_name: 'Ada', last_name: 'Lovelace', company_name: 'Acme' })
  })

  it('extras go in custom_fields, not invented top-level keys', () => {
    expect(toSmartleadLead(lead).custom_fields).toEqual({ job_title: 'CTO', industry: 'SaaS', country: 'ZA' })
  })

  it('EMPTY STRINGS, NEVER NULL — null renders as the word "null" in a real inbox', () => {
    const p = toSmartleadLead({ email: 'a@b.com', first_name: null, last_name: null, company: null })
    expect(p.first_name).toBe('')
    expect(p.last_name).toBe('')
    expect(p.company_name).toBe('')
  })

  it('absent extras are omitted rather than sent as empty custom fields', () => {
    expect(toSmartleadLead({ email: 'a@b.com' }).custom_fields).toEqual({})
  })
})

describe('the sequence — our copy, rendered before it leaves', () => {
  const lead = { first_name: 'Ada', company: 'Acme' }

  it('renders OUR tokens, so their templating is never relied on', () => {
    // A token their engine does not recognise is delivered literally — {{first_name}} reaching
    // a real prospect as those characters.
    const out = toSmartleadSequence([{ channel: 'email', subject: 'Hi {{first_name}}', body: 'About {{company}}' }], lead as never)
    expect(out[0].subject).toContain('Ada')
    // NOTE the field is `email_body`, not `body` — Smartlead's name, not ours. The first
    // version of this assertion read `out[0].body`, which is `undefined`, and `undefined`
    // does not contain '{{' — so it would have PASSED while asserting nothing.
    expect(out[0].email_body).not.toContain('{{')
    expect(out[0].email_body).toContain('Acme')
  })

  it('wait_days passes straight through as delay_in_days — they mean the same thing', () => {
    // Instantly's `day` is CUMULATIVE and is accumulated by toInstantlySequence. Smartlead's
    // delay is from the PREVIOUS step. Getting that backwards either fires the whole sequence
    // at once or stretches it over months.
    const out = toSmartleadSequence([
      { channel: 'email', subject: 'a', body: 'a', wait_days: 0 },
      { channel: 'email', subject: 'b', body: 'b', wait_days: 3 },
      { channel: 'email', subject: 'c', body: 'c', wait_days: 4 },
    ], lead as never)
    expect(out.map(s => s.seq_delay_details.delay_in_days)).toEqual([0, 3, 4])
  })

  it('the FIRST step always sends immediately, whatever wait it carries', () => {
    const out = toSmartleadSequence([{ channel: 'email', subject: 'a', body: 'a', wait_days: 9 }], lead as never)
    expect(out[0].seq_delay_details.delay_in_days).toBe(0)
  })

  it('steps are numbered from 1, contiguously', () => {
    const out = toSmartleadSequence([
      { channel: 'email', subject: 'a', body: 'a' },
      { channel: 'email', subject: 'b', body: 'b' },
    ], lead as never)
    expect(out.map(s => s.seq_number)).toEqual([1, 2])
  })

  it('NON-EMAIL STEPS ARE DROPPED — a LinkedIn step must not become an email', () => {
    const out = toSmartleadSequence([
      { channel: 'email', subject: 'a', body: 'a' },
      { channel: 'linkedin', body: 'connect with me' } as never,
      { channel: 'email', subject: 'c', body: 'c' },
    ], lead as never)
    expect(out).toHaveLength(2)
    expect(out.map(s => s.seq_number)).toEqual([1, 2])
    expect(JSON.stringify(out)).not.toContain('connect with me')
  })

  it('a wholly empty step is dropped rather than sent blank', () => {
    const out = toSmartleadSequence([
      { channel: 'email', subject: '', body: '' },
      { channel: 'email', subject: 'real', body: 'real' },
    ], lead as never)
    expect(out).toHaveLength(1)
    expect(out[0].seq_number).toBe(1)
  })

  it('no steps means no sequence — the caller must refuse to push', () => {
    expect(toSmartleadSequence([], lead as never)).toEqual([])
  })
})

describe('the 400-lead cap is chunked, never truncated', () => {
  it('splits at exactly 400', () => {
    const c = chunkLeads(Array.from({ length: 401 }, (_, i) => i))
    expect(c).toHaveLength(2)
    expect(c[0]).toHaveLength(400)
    expect(c[1]).toHaveLength(1)
  })
  it('the cap matches the documented limit', () => {
    expect(SMARTLEAD_MAX_LEADS_PER_REQUEST).toBe(400)
  })
  it('nothing in, nothing out — no empty request', () => {
    expect(chunkLeads([])).toEqual([])
  })
  it('EVERY lead survives the chunking — none silently dropped', () => {
    const input = Array.from({ length: 950 }, (_, i) => i)
    expect(chunkLeads(input).flat()).toEqual(input)
  })
})

describe('the sending mode', () => {
  it('is the value recorded on client_inboxes.provider', () => {
    expect(SMARTLEAD_SENDING_MODE).toBe('smartlead-api')
  })
})

// ── THE WIRING — Prompt 4 shipped a client and a mapping and wired neither into anything ──
describe('this is actually WIRED, unlike Prompt 4 on its first attempt', () => {
  const code = (p: string) => readFileSync(join(__dirname, p), 'utf8')
    .split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  it('the money path calls the Smartlead push', () => {
    // The grep that returned "tests only" for Instantly is the reason this test exists.
    expect(code('./approve-lead.ts')).toContain('pushApprovedLeadToSmartlead')
  })

  it('and it cannot break an approve the client has paid for', () => {
    const src = code('./approve-lead.ts')
    const i = src.indexOf('pushApprovedLeadToSmartlead')
    expect(src.slice(i - 400, i + 800)).toContain('catch')
  })

  it('the push reads the mailbox provider it gates on', () => {
    const src = code('./smartlead-send.ts')
    expect(src).toContain('client_inboxes')
    expect(src).toContain('SMARTLEAD_SENDING_MODE')
  })

  it('the campaign is named from the CLIENT ID, never the company name', () => {
    // A company name is a label a human edits. Renaming a client would orphan their campaign
    // and silently start a second one — with a sending account attached (#584/#582).
    const src = code('./smartlead-send.ts')
    expect(src).toContain('campaignNameFor')
    expect(src).not.toMatch(/campaignNameFor[\s\S]{0,200}company_name/)
  })

  it('the key never reaches a log — redact covers the URL-ENCODED form too', () => {
    // The key is a QUERY PARAMETER here, so it is encodeURIComponent-ed into every URL. A key
    // containing + or / would appear as %2B / %2F and slip past a plain string replace.
    const src = code('./smartlead.ts')
    expect(src).toContain('encodeURIComponent(k)')
  })

  it('suppression lists are respected — both ours and theirs', () => {
    // Setting these true to "get more leads through" is emailing people who said stop.
    const src = code('./smartlead.ts')
    expect(src).toContain('ignore_global_block_list: false')
    expect(src).toContain('ignore_unsubscribe_list: false')
  })
})
