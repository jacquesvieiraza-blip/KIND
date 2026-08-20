import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── HC-3 — THE SMARTLEAD PATH HAD NONE OF OUR SUPPRESSION NETS ────────────────────────────
//
// `pushApprovedLeadToSmartlead` is the R25 month-one send path for EVERY new client, and it
// had no opt-out check, no do-not-contact stop, no PECR gate and no launch-country hold.
//
// ⚠️ WHY THAT IS DIFFERENT FROM A MISSING GATE ANYWHERE ELSE. **Smartlead's own engine sends.**
// This push is a hand-off: once the lead is in their campaign, `sendSequenceEmail` — the
// chokepoint that carries all four of those nets — is never reached for those emails. There is
// no safety net behind this line and no later cron that re-asks. What the push accepts, a real
// person receives.
//
// ⚠️ AND THE PUSH FIRED ON LEADS OUR OWN ENROL HAD ALREADY REFUSED. `autoEnrollLead` returns
// `Promise<void>` and every refusal inside it is a bare `return`, never a throw — so `enrolled`
// in `approve-lead.ts` is true whenever it did not CRASH. `if (enrolled)` then pushed. A lead
// refused for do-not-contact, PECR or launch-country was handed straight to Smartlead.
//
// The first describe block reproduces that, because it is the part that reads like a mistake in
// the test rather than a real defect until you see it run.

const state = {
  isDemo: false,
  blocklistHit: false,
  blocklistError: null as { message: string } | null,
  lead: {} as Record<string, unknown>,
  /** Leads that actually reached Smartlead's addLeads. The whole question, in one array. */
  added: [] as unknown[],
  leadUpdates: [] as Record<string, unknown>[],
  alerts: [] as { subject: string; lines: string[] }[],
  membership: [] as Record<string, unknown>[],
}

vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      for (const m of ['select', 'eq', 'in', 'order', 'limit', 'is', 'not', 'ilike']) q[m] = () => q
      q.update = (row: Record<string, unknown>) => {
        state.leadUpdates.push(row)
        return { eq: async () => ({ error: null }) }
      }
      q.maybeSingle = async () => {
        if (table === 'clients') return { data: { id: 'c1', is_demo: state.isDemo, company_name: 'Acme' } }
        if (table === 'leads') return { data: state.lead }
        if (table === 'client_inboxes') return { data: { id: 'i1' } }
        if (table === 'figsy_sequences') return { data: { steps: [{ channel: 'email', subject: 'Hi', body: 'Body' }] } }
        if (table === 'opt_out_blocklist') {
          if (state.blocklistError) return { data: null, error: state.blocklistError }
          return { data: state.blocklistHit ? { id: 'b1' } : null, error: null }
        }
        return { data: null, error: null }
      }
      // `alertSmartleadStillSending` awaits the builder to list leads with a membership.
      q.then = (r: (v: unknown) => unknown) => {
        if (table === 'leads') return Promise.resolve({ data: state.membership, error: null }).then(r)
        return Promise.resolve({ data: [], error: null }).then(r)
      }
      return q
    },
  },
}))

vi.mock('./instantly-push', () => ({ houseClientId: () => 'house-client' }))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (_k: string, subject: string, lines: string[]) => { state.alerts.push({ subject, lines }) },
}))
vi.mock('./smartlead', () => ({
  smartleadConfigured: () => true,
  createCampaign: async () => ({ ok: true, data: { id: 77 } }),
  saveSequence:   async () => ({ ok: true, data: {} }),
  addLeads:       async (_c: string, list: unknown[]) => { state.added.push(...list); return { ok: true, data: {} } },
  listCampaignsTyped: async () => ({ ok: true, data: [] }),
}))

const CLEAN = {
  id: 'l1', email: 'ada@acme.com', first_name: 'Ada', last_name: 'L',
  company: 'Acme Inc', country: 'United States',
}

async function push(lead: Record<string, unknown> = CLEAN) {
  state.lead = lead
  state.added = []
  state.leadUpdates = []
  process.env.AUTO_OUTREACH_ENABLED = 'true'
  const { pushApprovedLeadToSmartlead } = await import('./smartlead-send')
  return pushApprovedLeadToSmartlead(String(lead.id ?? 'l1'), 'c1')
}

beforeEach(() => {
  state.isDemo = false
  state.blocklistHit = false
  state.blocklistError = null
  state.added = []
  state.leadUpdates = []
  state.alerts = []
  state.membership = []
})

describe('HC-3 RED PROOF — the OLD gate chain accepted every one of them', () => {
  // The six gates as they stood before HC-3, exactly: all six are states of the SYSTEM and not
  // one asks anything about the person. Run against the four leads that must never be pushed.
  const oldGate = (a: { hasApiKey: boolean; killSwitchOn: boolean; isDemo: boolean; isHouseClient: boolean; hasSmartleadInbox: boolean; leadEmail: string | null }) => {
    if (a.isDemo) return false
    if (!a.killSwitchOn) return false
    if (a.isHouseClient) return false
    if (!a.hasApiKey) return false
    if (!a.hasSmartleadInbox) return false
    if (!a.leadEmail?.trim()) return false
    return true   // ← and that was the whole of it
  }
  const system = { hasApiKey: true, killSwitchOn: true, isDemo: false, isHouseClient: false, hasSmartleadInbox: true }

  it('an OPTED-OUT person was pushed — and Smartlead then mails someone who said STOP', () => {
    expect(oldGate({ ...system, leadEmail: 'stopped@acme.com' })).toBe(true)   // ← RED
  })
  it('a DO-NOT-CONTACT lead was pushed', () => {
    expect(oldGate({ ...system, leadEmail: 'someone@employer.com' })).toBe(true)   // ← RED
  })
  it('a UK INDIVIDUAL-SUBSCRIBER RISK was pushed — PECR reg. 22, no consent', () => {
    expect(oldGate({ ...system, leadEmail: 'sole@trader.co.uk' })).toBe(true)   // ← RED
  })
  it('a lead OUTSIDE the launch countries was pushed', () => {
    expect(oldGate({ ...system, leadEmail: 'ola@lagos.ng' })).toBe(true)   // ← RED
  })

  it('⚠️ AND `enrolled` WAS TRUE EVEN WHEN autoEnrollLead HAD REFUSED THE LEAD', async () => {
    // `autoEnrollLead: Promise<void>`, and every refusal is a bare `return`. `approve-lead.ts`
    // builds `enrolled` from `.then(() => true).catch(() => false)` — so a silent refusal is
    // indistinguishable from a successful enrol, and `if (enrolled)` pushed anyway.
    const autoEnrollLead = async (_refused: boolean) => { return }          // never throws
    const enrolled = await autoEnrollLead(true).then(() => true).catch(() => false)
    expect(enrolled, 'the lead was REFUSED and this still reads as enrolled').toBe(true)   // ← RED
  })
})

describe('HC-3 GREEN, REAL FUNCTION — each lead is refused, with its own reason', () => {
  it('an opted-out person never reaches Smartlead', async () => {
    state.blocklistHit = true
    const r = await push()

    expect(r.pushed).toBe(false)
    expect((r as { reason: string }).reason).toBe('opted_out')
    expect(state.added, 'THE ASSERTION THAT MATTERS — nothing reached their engine').toEqual([])
  })

  it('a do-not-contact lead never reaches Smartlead', async () => {
    // `isSuppressed` matches on the email domain against the founder's employer list.
    const { suppressedDomains } = await import('./suppression')
    const domain = suppressedDomains()[0]
    expect(domain, 'the do-not-contact list must not be empty, or this test proves nothing').toBeTruthy()

    const r = await push({ ...CLEAN, email: `someone@${domain}` })
    expect((r as { reason: string }).reason).toBe('do_not_contact')
    expect(state.added).toEqual([])
  })

  it('a UK sole trader never reaches Smartlead', async () => {
    // No corporate marker in the name + a UK country = an individual subscriber under PECR.
    const r = await push({ ...CLEAN, company: 'Sarah Jones Consulting', country: 'United Kingdom' })
    expect((r as { reason: string }).reason).toBe('pecr_individual_risk')
    expect(state.added).toEqual([])
  })

  it('a lead outside the launch countries never reaches Smartlead', async () => {
    const r = await push({ ...CLEAN, country: 'Nigeria' })
    expect((r as { reason: string }).reason).toBe('launch_hold')
    expect(state.added).toEqual([])
  })

  it('a lead with NO country never reaches Smartlead either', async () => {
    const r = await push({ ...CLEAN, country: null })
    expect((r as { reason: string }).reason).toBe('launch_hold')
    expect(state.added).toEqual([])
  })

  it('⚠️ A CLEAN LEAD STILL GOES THROUGH — without this the four above prove nothing', async () => {
    // The #617 lesson: a suppression test that cannot tell "blocked" from "broken" is not a
    // test. If the harness were simply failing, every assertion above would still be green.
    const r = await push()
    expect(r.pushed, 'a clean US lead must reach Smartlead').toBe(true)
    expect(state.added).toHaveLength(1)
    expect(JSON.stringify(state.added)).toContain('ada@acme.com')
  })

  it('a UK LIMITED company still goes through — the B2B exemption applies', async () => {
    const r = await push({ ...CLEAN, company: 'BigCo Ltd', country: 'United Kingdom' })
    expect(r.pushed).toBe(true)
    expect(state.added).toHaveLength(1)
  })
})

describe('HC-3 — the blocklist read FAILS CLOSED, and that is the opposite of the SMTP path', () => {
  it('an unanswerable read refuses the push rather than assuming "not opted out"', async () => {
    // A rejected supabase read returns `data: null`, which reads as a blocklist MISS. On the
    // SMTP path that is survivable because a later cron re-asks. Here there is no later: the
    // lead goes to an engine we do not control and our net never runs again.
    state.blocklistError = { message: 'connection terminated unexpectedly' }
    const errs: string[] = []
    const spy = vi.spyOn(console, 'error').mockImplementation((...a) => { errs.push(a.join(' ')) })
    let r: Awaited<ReturnType<typeof push>>
    try { r = await push() } finally { spy.mockRestore() }

    expect(r.pushed).toBe(false)
    expect((r as { reason: string }).reason).toBe('opted_out')
    expect(state.added).toEqual([])
    expect(errs.join('\n'), 'and it says so loudly rather than refusing in silence').toContain('fail-closed')
  })
})

describe('HC-3 — a demo account is exempt from all four, as it is from everything else', () => {
  it('a demo lead is refused for BEING A DEMO, not for its country', async () => {
    // The order matters for what a person reads. Every demo address is `.invalid` and the demo
    // book is entirely South African — classifying those rows would refuse leads that were
    // never going to send and make the demo output read as broken.
    state.isDemo = true
    const r = await push({ ...CLEAN, country: 'South Africa', company: 'Yoco Technologies' })
    expect((r as { reason: string }).reason).toBe('is_demo')
    expect(state.added).toEqual([])
  })
})

describe('HC-3 — the push records WHO is inside Smartlead', () => {
  it('writes smartlead_campaign_id after the lead is added, never before', async () => {
    // Nothing used to write this down: the campaign id was returned and discarded. Without it
    // an opt-out alert cannot name who to remove, or from which campaign.
    const r = await push()
    expect(r.pushed).toBe(true)
    expect(state.leadUpdates).toContainEqual({ smartlead_campaign_id: '77' })
  })

  it('records NOTHING when the lead was refused', async () => {
    // A membership row for a lead Smartlead never received would send an operator hunting for
    // someone who is not there — and would fire the opt-out alert for a person never at risk.
    state.blocklistHit = true
    await push()
    expect(state.leadUpdates).toEqual([])
  })
})

describe('HC-3 — an opt-out on someone already inside Smartlead ALERTS, because our blocklist cannot reach them', () => {
  it('names the person and the campaign to remove them from', async () => {
    state.membership = [{ id: 'l1', email: 'ada@acme.com', client_id: 'c1', smartlead_campaign_id: '77' }]
    const { alertSmartleadStillSending } = await import('./smartlead-send')
    await alertSmartleadStillSending('ada@acme.com', 'replied_opt_out')

    expect(state.alerts).toHaveLength(1)
    const a = state.alerts[0]
    expect(a.subject).toContain('ada@acme.com')
    expect(a.lines.join('\n')).toContain('campaign 77')
    expect(a.lines.join('\n'), 'the alert must say WHY a blocklist row is not enough')
      .toContain('does NOTHING to Smartlead')
  })

  it('is SILENT when the person is in no campaign — which is every lead today', async () => {
    // Smartlead is unpurchased and returns 401, so nothing has ever been pushed. If this fired
    // on ordinary opt-outs it would become the alert everyone learns to ignore, and the one
    // that actually matters would go unread with it.
    state.membership = []
    const { alertSmartleadStillSending } = await import('./smartlead-send')
    await alertSmartleadStillSending('nobody@acme.com', 'list_unsubscribe')

    expect(state.alerts).toEqual([])
  })

  it('never throws — a failed alert must not take the blocklist write down with it', async () => {
    const { alertSmartleadStillSending } = await import('./smartlead-send')
    await expect(alertSmartleadStillSending('', 'replied_opt_out')).resolves.toBeUndefined()
  })
})

describe('HC-3 — the removal gap is REGISTERED, not hidden', () => {
  it('NOT_POSSIBLE names the missing remove endpoint', async () => {
    // Founder-ruled 20 Aug: "yes alert not api". The gap is real and the register is where a
    // real gap goes — a silent no-op would make the product LOOK like it propagates opt-outs.
    // `importActual` because this file MOCKS './smartlead' to keep the network out — reading
    // NOT_POSSIBLE off the mock would assert against a fixture and prove nothing about the
    // register that actually ships.
    const { NOT_POSSIBLE } = await vi.importActual<typeof import('./smartlead')>('./smartlead')
    const entry = NOT_POSSIBLE.find(n => /remov|stopping a lead/i.test(n.what))
    expect(entry, 'the opt-out removal gap must be in NOT_POSSIBLE').toBeTruthy()
    expect(entry!.why).toContain('alert not api')
  })

  it('and there is genuinely no remove/stop call to have used', async () => {
    // The prompt said "call the existing smartlead.ts API surface". It does not exist — this
    // pins that, so if someone later adds one, this test tells them to wire it in.
    const mod = await vi.importActual<typeof import('./smartlead')>('./smartlead')
    const names = Object.keys(mod)
    expect(names.filter(n => /remove|delete|stop|pause/i.test(n))).toEqual([])
  })
})
