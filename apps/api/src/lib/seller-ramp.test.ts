import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { rampFor, rampSummary, RAMP, NAME_YOUR_NETWORK, FIRST_ASKS } from './seller-ramp'
import { sellerPlaybook } from './seller-playbook'

// ── THE SELLER RAMP (#654) ──────────────────────────────────────────────────────────────
//
// Founder, 16 Aug: "getting someone to sign up to sell is easy. keeping them enagged and
// selling is another thing."
//
// The two things these tests protect:
//   1. R40's BOUNDARY. The ramp is a seller's own notebook. If anything here ever sources a
//      lead, or leaks her contact names into the operator's console, the promise made in her
//      contract ("your own network") is broken by the product itself.
//   2. THE SCOREBOARD BEING HONEST. Gates are derived from work actually recorded, and the
//      timestamps come from the server. A ramp whose numbers can be typed coaches nobody.

const REPO = join(__dirname, '../../../..')
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const routes = read('apps/api/src/routes/partners.ts')
const vida = read('apps/admin/src/app/vida/partners/page.tsx')
const migration = read('supabase/migrations/20260817_seller_ramp.sql')

const zero = { contacts: 0, asksSent: 0, conversations: 0, demosBooked: 0, clientsLive: 0 }

describe('the gates are derived from real work, never stored', () => {
  it('a fresh seller is on gate 1 with nothing complete', () => {
    const { gates, complete, currentIndex } = rampFor(zero)
    expect(gates).toHaveLength(4)
    expect(complete).toBe(false)
    expect(currentIndex).toBe(0)
    expect(gates[0].current).toBe(true)
    expect(gates.every(g => !g.complete)).toBe(true)
  })

  it(`${NAME_YOUR_NETWORK - 1} names is NOT gate one — ${NAME_YOUR_NETWORK} is`, () => {
    // The threshold comes from the named constant, so moving it moves the test with it and
    // this stays a statement about the design rather than a magic number.
    expect(rampFor({ ...zero, contacts: NAME_YOUR_NETWORK - 1 }).gates[0].complete).toBe(false)
    expect(rampFor({ ...zero, contacts: NAME_YOUR_NETWORK }).gates[0].complete).toBe(true)
  })

  it('twenty is a FLOOR — more names is still complete, never an error', () => {
    const { gates } = rampFor({ ...zero, contacts: NAME_YOUR_NETWORK + 40 })
    expect(gates[0].complete).toBe(true)
    expect(gates[0].progress.done).toBe(NAME_YOUR_NETWORK)   // the bar caps; the list does not
  })

  it(`asks open gate two at ${FIRST_ASKS}, and the current gate moves with it`, () => {
    const r = rampFor({ ...zero, contacts: NAME_YOUR_NETWORK, asksSent: FIRST_ASKS })
    expect(r.gates[1].complete).toBe(true)
    expect(r.currentIndex).toBe(2)
    expect(r.gates[2].current).toBe(true)
  })

  it('a later gate completing early does NOT skip the unfinished one', () => {
    // A demo booked before five asks were logged is good news, not a reason to hide the gap:
    // the honest picture is the coachable one.
    const r = rampFor({ ...zero, contacts: NAME_YOUR_NETWORK, demosBooked: 1 })
    expect(r.gates[2].complete).toBe(true)
    expect(r.currentIndex).toBe(1)              // still owes the asks
    expect(r.complete).toBe(false)
  })

  it('the ramp completes only when a client is actually live', () => {
    const r = rampFor({ contacts: 30, asksSent: 9, conversations: 4, demosBooked: 2, clientsLive: 1 })
    expect(r.complete).toBe(true)
    expect(r.currentIndex).toBe(-1)
  })

  it('every gate says WHY in plain words — a gate with no reason is a chore', () => {
    for (const g of RAMP) {
      expect(g.why.length, `${g.id} has no why`).toBeGreaterThan(80)
      expect(g.title.length).toBeGreaterThan(8)
    }
  })
})

describe('R40 — a notebook, never lead-gen, and her network stays hers', () => {
  it('the operator sees COUNTS, never contact names', () => {
    // rampSummary is what reaches Vida. If a name can travel with it, the contract's "your
    // own network" is broken by the product.
    const summary = rampSummary({ ...zero, contacts: 12, asksSent: 3 })
    expect(summary).toContain('12 named')
    expect(summary).toContain('3 asked')
    expect(summary).not.toMatch(/[A-Z][a-z]+ [A-Z][a-z]+/)   // no person-shaped strings
  })

  it('and the Vida page has no field that could carry one', () => {
    expect(vida).toContain('ramp_summary')
    expect(vida).not.toMatch(/ramp_contacts|contact_names|contacts:\s*Contact\[\]/)
  })

  it('THE OPERATOR PAYLOAD ITSELF carries no contact names — pinned at the route', () => {
    // ⚠️ WHY THIS PIN EXISTS AND THE OTHER TWO WERE NOT ENOUGH. Fable's verification injected
    // her contact NAMES into /partners/admin/list — server-side, exactly where a leak would
    // really happen — and all 27 tests stayed green. The counts-only pins watched the Vida
    // PAGE and the summary STRING; neither watches the payload the API actually sends. That
    // is the same placebo shape as asserting a function was called rather than that its
    // result was used: the assertion described the intention, not the effect.
    const start = routes.indexOf("partnersRouter.get('/admin/list'")
    const block = routes.slice(start, routes.indexOf("partnersRouter.patch('/admin/:partnerId/approve'"))
    expect(block.length).toBeGreaterThan(400)      // the slice actually found the route

    // rampCountsFor is the ONE legal reader of that table on this path: it selects timestamps
    // and returns numbers. The enrichment must go through it and never read the table itself.
    expect(block).toContain('rampCountsFor(')
    expect(block, 'the operator route reads the contacts table directly — only rampCountsFor may')
      .not.toContain("from('partner_ramp_contacts')")
    expect(block, 'a contacts payload is being built for the operator')
      .not.toMatch(/ramp_contacts|contact_names|contacts:/)
  })

  it('and the one legal reader selects timestamps, never a name', () => {
    const helper = routes.slice(routes.indexOf('async function rampCountsFor'), routes.indexOf("partnersRouter.get('/me/ramp'"))
    expect(helper).toMatch(/select\('ask_sent_at, conversation_at, demo_booked_at'\)/)
    expect(helper, 'the counts helper is selecting names it does not need').not.toMatch(/select\('[^']*\bname\b/)
  })

  it('NOTHING on the seller path sources a lead', () => {
    // The whole point of R40: a partner works people they already know. If runIcpJob were
    // ever called from a /partners/me route, the product would be sourcing on her behalf.
    const meRoutes = routes.slice(routes.indexOf("partnersRouter.get('/me/ramp'"), routes.indexOf("partnersRouter.post('/me/sign'"))
    expect(meRoutes).not.toContain('runIcpJob')
    expect(meRoutes).not.toMatch(/pdlSearchPeople|servePoolLeads/)
  })

  it('her contacts are read scoped to HER seat, resolved from her own session', () => {
    const list = routes.slice(routes.indexOf("partnersRouter.get('/me/contacts'"), routes.indexOf("partnersRouter.post('/me/contacts'"))
    expect(list).toContain("eq('partner_id', seat.id)")
    const patch = routes.slice(routes.indexOf("partnersRouter.patch('/me/contacts/:id'"))
    // scoped by partner_id as well as row id — a guessed id from another list must not stamp
    expect(patch.slice(0, 2500)).toMatch(/eq\('id', req\.params\.id\)\.eq\('partner_id', seat\.id\)/)
  })
})

describe('the scoreboard cannot be typed', () => {
  it('stamps are set server-side with now(), never taken from the request', () => {
    const patch = routes.slice(routes.indexOf("partnersRouter.patch('/me/contacts/:id'"), routes.indexOf("partnersRouter.get('/admin/list'"))
    expect(patch).toMatch(/\[column\]: new Date\(\)\.toISOString\(\)/)
    // the body is read ONLY for which event happened — never for when it happened
    expect(patch).not.toMatch(/b\.ask_sent_at|body\.timestamp|req\.body\.at\b/)
  })

  it('an unrecognised event is refused rather than silently ignored', () => {
    const patch = routes.slice(routes.indexOf("partnersRouter.patch('/me/contacts/:id'"), routes.indexOf("partnersRouter.get('/admin/list'"))
    expect(patch).toMatch(/Say what happened/)
  })

  it('an unmigrated table gives an EMPTY ramp, not a 500', () => {
    // Between deploy and "Run migrations" the table does not exist. A seller opening her
    // portal then must see a ramp at zero, not an error page.
    const counts = routes.slice(routes.indexOf('async function rampCountsFor'), routes.indexOf("partnersRouter.get('/me/ramp'"))
    expect(counts).toMatch(/if \(error\) return empty/)
  })
})

describe('the words are real, and they are where they are needed', () => {
  const pb = sellerPlaybook()

  it('every gate that needs words has them', () => {
    const gatesWithWords = new Set(pb.map(p => p.gate))
    expect(gatesWithWords.has('name-your-20')).toBe(true)
    expect(gatesWithWords.has('send-five-asks')).toBe(true)
    expect(gatesWithWords.has('first-demo')).toBe(true)
    expect(gatesWithWords.has('first-client')).toBe(true)
  })

  it('the ask asks for a conversation, and carries no price', () => {
    const ask = pb.find(p => p.id === 'the-ask')!
    expect(ask.body).toMatch(/fifteen minutes/)
    expect(ask.body).not.toMatch(/\$\d/)
    expect(ask.watchOut).toMatch(/price/)
  })

  it('the day-30 move is there — it is how a finite network refills', () => {
    const move = pb.find(p => p.id === 'the-day-30-move')!
    expect(move.body).toMatch(/one person you know/)
    expect(move.watchOut).toMatch(/finite/)
  })

  it('NO invented results, counts or client names (R27)', () => {
    // These words go to people in a seller's own network — the relationships she keeps long
    // after this. A claim that turns out to be untrue costs her the relationship.
    for (const p of pb) {
      const text = `${p.body} ${p.watchOut}`
      expect(text, `${p.id} invents a statistic`).not.toMatch(/\d+\s*(clients|companies|customers)\b/i)
      expect(text, `${p.id} claims results`).not.toMatch(/on average|typically see|results show|proven to/i)
    }
  })

  it('and any money in them is interpolated from the constant, never typed', () => {
    const src = read('apps/api/src/lib/seller-playbook.ts')
    const code = src.split('\n').filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')
    expect(code).toContain('PACK_PRICE_USD')
    expect(code).not.toMatch(/\$\d{2,}/)
  })
})

describe('her demo environment — built already, and free', () => {
  it('the counter-signature provisions it, and only when there is not one', () => {
    const counter = routes.slice(
      routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"),
      routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"))
    expect(counter).toContain('provisionPartnerSandbox(')
    expect(counter).toMatch(/let sandboxReady = !!\(seat as \{ demo_env_id\?: string \}\)\.demo_env_id/)
    expect(counter).toMatch(/if \(!sandboxReady\)/)
  })

  it('a failed sandbox never blocks activation, and is reported', () => {
    const counter = routes.slice(
      routes.indexOf("partnersRouter.post('/admin/:partnerId/countersign'"),
      routes.indexOf("partnersRouter.post('/admin/:partnerId/archive'"))
    expect(counter).toContain('sandbox_ready: sandboxReady')
    expect(counter).toMatch(/The seat is LIVE, but their demo environment did not build/)
  })

  it('the sandbox client is is_demo — which is what makes it $0 (#453)', () => {
    const provision = routes.slice(routes.indexOf('async function provisionPartnerSandbox'), routes.indexOf('async function sendSandboxReadyEmail'))
    expect(provision).toMatch(/is_demo:\s*true/)
    // and the rule it depends on is still written where the money is spent
    expect(read('apps/api/src/routes/icps.ts')).toContain('DEMO MODE: sourcing is POOL-ONLY at $0')
  })

  it('the demo geography follows the SELLER — it was hard-coded to one country', () => {
    const provision = routes.slice(routes.indexOf('async function provisionPartnerSandbox'), routes.indexOf('async function sendSandboxReadyEmail'))
    expect(provision).toContain('const demoGeography')
    expect(provision).toMatch(/geographies:\s*\[demoGeography\]/)
    expect(provision).not.toMatch(/geographies:\s*\['South Africa'\]/)
  })

  it('and a Client Partner is sent to HER portal, not the legacy hub', () => {
    // The fifth wrong-console bug of 16 Aug, caught before anybody walked into it.
    const email = routes.slice(routes.indexOf('async function sendSandboxReadyEmail'), routes.indexOf('async function sendSandboxReadyEmail') + 3000)
    expect(email).toMatch(/seat_type === 'client_partner' \? '\/dashboard\/client-partner'/)
    expect(email).not.toContain('${portalUrl}/dashboard/partner"')
  })

  it('it reuses the two endpoints the legacy hub already uses — not a second door', () => {
    const card = read('apps/portal/src/app/(seat)/dashboard/client-partner/DemoEnvironmentCard.tsx')
    expect(card).toContain('/partners/me/sandbox')
    expect(card).toContain('/partners/me/sandbox-login')
    expect(existsSync(join(REPO, 'apps/portal/src/app/(seat)/dashboard/client-partner/SellerRamp.tsx'))).toBe(true)
  })
})

describe('the migration is in both homes', () => {
  it('canonical file and runner entry agree', () => {
    expect(migration).toContain('create table if not exists public.partner_ramp_contacts')
    const runner = read('apps/api/src/lib/pending-migrations.ts')
    expect(runner).toContain("key: '20260817_seller_ramp'")
    expect(runner.slice(runner.indexOf("key: '20260817_seller_ramp'"), runner.indexOf("key: '20260817_seller_ramp'") + 2500)).toContain('partner_ramp_contacts')
  })

  it('and it records that these are personal data held for the seller', () => {
    expect(migration).toMatch(/POPIA/)
    expect(migration).toMatch(/on delete cascade/)
  })
})
