// ⚑ 16 Sep — THREE GAP CLOSEOUTS ON THE MVP1 ALIGNMENT BRANCH.
//
// ── GAP 1: THE AUTOMATIC POOL COULD HAND OUT K.I.N.D'S OWN SENDING IDENTITY ───────────
//
// C1's claim already refuses any address that is LIVE on any client — including House, whose
// mailboxes are ordinary `client_inboxes` rows keyed on `HOUSE_CLIENT_ID`'s canonical
// counterpart. That covers "already assigned", and it is the DB truth winning over the env.
//
// 🛑 WHAT IT DID NOT COVER: K.I.N.D'S OWN SENDING ADDRESSES, WHICH HOLD NO `client_inboxes`
// ROW AT ALL. `FIGSY_COLD_FROM` is boot-critical and is the address all cold outreach leaves
// from; `hello@get-kind.com` is the transactional identity every invoice and password reset
// leaves from. Neither is a client mailbox, so neither appears in `client_inboxes` — and an
// operator populating `POOLED_SENDERS_JSON` from "the mailboxes we own" would hand one of them
// to an ordinary client, who would then send cold outreach as K.I.N.D itself.
//
// ⚠️ THIS IS NOT A HARD-CODED PRIVATE ADDRESS. Both are read from the SAME canonical constants
// the mailer sends from (`COLD_FROM` / `COLD_FROM_DEFAULT`), so the fence moves when they do.
//
// ── GAP 2: S5 — VERIFIED, AND ONLY THE UNPROVEN INVARIANT IS ADDED ────────────────────
//
// S5-A, S5-B and S5-C are ALREADY CORRECT and already covered (`house-authority.test.ts`, 147
// tests). S5-D — "every House protection path uses ONE canonical identity" — is correct in
// code and was PROVED NOWHERE, so only that gets a test. Nothing in S5 is edited.
//
// ── GAP 3: ONE EXTERNAL REPLY COULD BECOME TWO CLIENT-VISIBLE REPLY RECORDS ───────────
//
// 🛑 `routeReply(matches, null)` returns EVERY match across EVERY client, and the pipeline
// then loops `for (const lead of matches)` writing a reply row per match. The code says so in
// its own comment: *"the reply is now routed into each matching client's thread"*. That was a
// deliberate 2-client-shared-inbox decision (R1) — and C1 makes it live, because clients now
// get their own mailboxes while any provider that does not report `to` still lands here.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import { reservedSenderAddresses, senderIsReserved, parseSenderPool, SENDER_POOL_ENV } from './sender-pool'
import { COLD_FROM } from './deliverability'
import { routeReply, replyOwnerFromSends, type LeadMatch } from './reply-ingest'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

// ═════════════════════════════════════════════════════════════════════════════
// GAP 1 — SENDER / HOUSE ISOLATION
// ═════════════════════════════════════════════════════════════════════════════
describe('GAP 1 · Ⓐ K.I.N.D\'s own sending identities are never claimable', () => {
  it('🛑 THE COLD OUTREACH ADDRESS IS RESERVED', () => {
    // Every cold send in the product leaves from this. A client sending as it would be sending
    // cold outreach as K.I.N.D, on K.I.N.D's reputation, with their story.
    expect(senderIsReserved('hello@get-kind.com')).toBe(true)
  })

  it('and the reservation is CASE- AND FORM-INSENSITIVE', () => {
    // `POOLED_SENDERS_JSON` is hand-written, so the fence must survive a capital letter and
    // the `Name <addr>` form the constants themselves use.
    expect(senderIsReserved('Hello@Get-Kind.com')).toBe(true)
    expect(senderIsReserved('  hello@get-kind.com  ')).toBe(true)
  })

  it('an ordinary pooled address is NOT reserved', () => {
    expect(senderIsReserved('outreach1@example-pool.test')).toBe(false)
  })

  it('🛑 THE RESERVED SET IS DERIVED FROM THE CANONICAL CONSTANTS, not a typed list', () => {
    const reserved = reservedSenderAddresses()
    expect(reserved.size).toBeGreaterThan(0)
    // It must contain the address the mailer actually sends from, whatever that is today.
    const addr = (COLD_FROM.match(/<([^>]+)>/)?.[1] ?? COLD_FROM).trim().toLowerCase()
    expect(reserved.has(addr), 'the live cold-From is not reserved').toBe(true)
  })

  it('🛑 AND THE POOL PARSER DROPS A RESERVED ENTRY, naming it', () => {
    const r = parseSenderPool(JSON.stringify([{
      email: 'hello@get-kind.com', smtp_host: 'h', smtp_user: 'u', smtp_pass: 'p',
    }]))
    expect(r.senders, 'a K.I.N.D-owned address entered the claimable inventory').toHaveLength(0)
    expect(r.problems[0]).toContain('hello@get-kind.com')
    expect(r.problems[0]).toContain(SENDER_POOL_ENV)
  })
})

describe('GAP 1 · Ⓑ DB assignment truth wins over the env inventory', () => {
  const claim = () => src('apps/api/src/lib/sender-claim.ts')

  it('🛑 ANY live row on ANY client excludes that address — House included', () => {
    const s = claim()
    // The read is NOT scoped to the claiming client: it asks the whole table for live rows,
    // which is what makes a House-assigned mailbox unclaimable by a normal client.
    expect(s).toMatch(/from\('client_inboxes'\)\s*\n?\s*\.select\('email'\)\.in\('status', LIVE_CLAIM_STATUSES/)
    expect(s, 'the live-mailbox read was scoped to one client — cross-client leakage')
      .not.toMatch(/\.select\('email'\)\.in\('status'[\s\S]{0,80}\.eq\('client_id'/)
  })

  it('the live set mirrors the index predicate exactly', () => {
    const s = claim()
    expect(s).toMatch(/LIVE_CLAIM_STATUSES = \['assigned', 'warming', 'active'\]/)
    const sql = readFileSync(join(REPO, 'supabase/migrations/20260916_client_inboxes_one_live_per_email.sql'), 'utf8')
    for (const st of ['assigned', 'warming', 'active']) {
      expect(sql, `the index does not constrain ${st}`).toContain(`'${st}'`)
    }
  })

  it('🛑 AND THE CLAIM CHECKS THE RESERVED SET TOO, not just the DB', () => {
    const s = claim()
    expect(s, 'the claim trusts the parser alone to have filtered reserved addresses')
      .toMatch(/senderIsReserved|reservedSenderAddresses/)
  })

  it('a lost race is the index refusing, and the next mailbox is tried', () => {
    const s = claim()
    const writer = s.slice(s.indexOf('async function insertClaim'))
    expect(writer).toMatch(/if \(isUniqueViolation\(error\)\) return \{ kind: 'lost_race' \}/)
    expect(s).toMatch(/continue/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GAP 2 — S5-D: ONE CANONICAL HOUSE IDENTITY
// ═════════════════════════════════════════════════════════════════════════════
describe('GAP 2 · S5-D · every House PROTECTION path uses one canonical identity', () => {
  /**
   * 🛑 THERE ARE TWO HOUSE-SHAPED ENVIRONMENT FACTS IN THIS REPO, and only one of them is an
   * identity. `HOUSE_ACCOUNT_EMAIL` → `resolveHouseUserIds` → `decideHouseClient` is the
   * canonical answer to "is this our own account". `HOUSE_CLIENT_ID` is the switch for the
   * PARKED Instantly push (#593) and is documented as "Do NOT set" — its own notice says our
   * sending does not read it and never has.
   *
   * The invariant: no SAFETY or MONEY decision may key off `HOUSE_CLIENT_ID`, because setting
   * that variable to any client id would hand that client House's exemptions.
   */
  const SAFETY_PATHS = [
    'apps/api/src/lib/programme.ts',              // internal P1 / P2 money authority
    'apps/api/src/lib/programme-authority.ts',    // every authority gate
    'apps/api/src/routes/internal.ts',            // the cold-check cron's exemption
    'apps/api/src/routes/operator.ts',            // the worklist's exemption badge
    'apps/api/src/lib/sender-claim.ts',           // GAP 1's new claim path
  ]

  it('🛑 NO SAFETY PATH *READS* `HOUSE_CLIENT_ID`', () => {
    // ⚠️ NAMING IT IS NOT READING IT. `operator.ts` legitimately imports
    // `HOUSE_CLIENT_ID_NOTICE` to put the "do NOT set this" warning on the screen, and several
    // files name the variable in a comment explaining why they do not use it. The invariant is
    // about the READ: `process.env.HOUSE_CLIENT_ID`, or the `houseClientId()` accessor.
    for (const f of SAFETY_PATHS) {
      const code = src(f)
      expect(code, `${f} reads process.env.HOUSE_CLIENT_ID — a second House identity`)
        .not.toMatch(/process\.env\.HOUSE_CLIENT_ID/)
      expect(code, `${f} calls houseClientId() — a second House identity`)
        .not.toMatch(/houseClientId\(\)/)
    }
  })

  it('and the only readers of that variable are the two PARKED push paths', () => {
    // Stated as an inventory so a third reader cannot appear unnoticed. Both are dormant
    // (Instantly/Smartlead push), both only GATE a push, and neither grants any authority.
    const readers = ['apps/api/src/lib/instantly-push.ts', 'apps/api/src/lib/smartlead-send.ts']
    for (const f of readers) {
      expect(src(f), `${f} stopped reading it — re-classify before changing this pin`)
        .toMatch(/houseClientId\(\)|process\.env\.HOUSE_CLIENT_ID/)
    }
  })

  it('and the money paths resolve House through the canonical set', () => {
    const p = src('apps/api/src/lib/programme.ts')
    // Both internal-authority writers ask the same question, via the same resolver.
    expect((p.match(/houseClientIds/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(p).toMatch(/getClientExclusions/)
  })

  it('🛑 AND THE CANONICAL RESOLVER IS KEYED ON THE AUTH EMAIL, not a client id', () => {
    const rc = src('apps/api/src/lib/real-clients.ts')
    expect(rc).toMatch(/HOUSE_ACCOUNT_EMAIL/)
    expect(rc).toMatch(/resolveHouseUserIds/)
  })

  it('the cold-check exemption resolves House the canonical way, and fails OPEN', () => {
    const internal = src('apps/api/src/routes/internal.ts')
    expect(internal).toMatch(/decideHouseClient/)
    expect(internal).toMatch(/resolveHouseUserIds/)
    // Fails open = nobody gains an exemption when House cannot be resolved.
    expect(internal).toMatch(/let houseClientId: string \| null = null/)
  })

  it('🛑 `HOUSE_CLIENT_ID` still carries its "do not set" notice, so it cannot drift into use', () => {
    const hc = src('apps/api/src/lib/house-client.ts')
    expect(hc).toMatch(/Do NOT set HOUSE_CLIENT_ID/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// GAP 3 — CROSS-CLIENT REPLY ISOLATION
// ═════════════════════════════════════════════════════════════════════════════
const A1: LeadMatch = { id: 'lead-a', client_id: 'client-A' }
const A2: LeadMatch = { id: 'lead-a2', client_id: 'client-A' }
const B1: LeadMatch = { id: 'lead-b', client_id: 'client-B' }

describe('GAP 3 · Ⓐ one external reply can never reach two clients', () => {
  it('🛑 THE DEFECT, PINNED — an unknown mailbox no longer fans out across clients', () => {
    const r = routeReply([A1, B1], null)
    expect(r.matches, 'the reply is still written to both clients').not.toHaveLength(2)
    expect(new Set(r.matches.map(m => m.client_id)).size,
      'one reply reached more than one client').toBeLessThanOrEqual(1)
  })

  it('🛑 AMBIGUOUS WITH NO EVIDENCE FAILS CLOSED — written to NEITHER', () => {
    const r = routeReply([A1, B1], null)
    expect(r.how).toBe('ambiguous')
    expect(r.matches).toEqual([])
    // Both are reported as excluded, so the operator alert can name the collision.
    expect(r.excluded).toHaveLength(2)
  })

  it('🛑 THE SINGLE-CLIENT HAPPY PATH IS UNCHANGED', () => {
    const r = routeReply([A1], null)
    expect(r.matches).toEqual([A1])
    expect(r.how).toBe('single')
    expect(r.excluded).toEqual([])
  })

  it('two leads, ONE client, unknown mailbox → both kept, still one client', () => {
    // A prospect can legitimately appear twice under the same client (two ICPs, two batches).
    // That is not ambiguity and must not fail closed.
    const r = routeReply([A1, A2], null)
    expect(r.matches).toEqual([A1, A2])
    expect(r.how).toBe('single')
  })

  it('a known inbox owner still wins outright — #551 behaviour intact', () => {
    const r = routeReply([A1, B1], 'client-A')
    expect(r.how).toBe('inbox')
    expect(r.matches).toEqual([A1])
    expect(r.excluded).toEqual([B1])
  })

  it('a known owner with no matching lead is still a real, empty outcome', () => {
    const r = routeReply([B1], 'client-A')
    expect(r.how).toBe('inbox')
    expect(r.matches).toEqual([])
  })

  it('🛑 NO MATCHES AT ALL is not "ambiguous" — there is nothing to be ambiguous about', () => {
    const r = routeReply([], null)
    expect(r.matches).toEqual([])
    expect(r.how).toBe('single')
  })
})

describe('GAP 3 · Ⓑ originating-send evidence resolves the owner', () => {
  it('🛑 THE CLIENT WE ACTUALLY EMAILED WINS', () => {
    // Persisted evidence: we sent to lead-a (Client A) and never to lead-b.
    const r = replyOwnerFromSends([A1, B1], new Set(['lead-a']))
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.clientId).toBe('client-A')
  })

  it('and routeReply uses it, writing only to that client', () => {
    const r = routeReply([A1, B1], null, new Set(['lead-a']))
    expect(r.how).toBe('originating_send')
    expect(r.matches).toEqual([A1])
    expect(r.excluded).toEqual([B1])
  })

  it('🛑 EVIDENCE ON BOTH SIDES IS STILL AMBIGUOUS — we emailed both, so we cannot tell', () => {
    const r = replyOwnerFromSends([A1, B1], new Set(['lead-a', 'lead-b']))
    expect(r.ok).toBe(false)
    const routed = routeReply([A1, B1], null, new Set(['lead-a', 'lead-b']))
    expect(routed.how).toBe('ambiguous')
    expect(routed.matches).toEqual([])
  })

  it('🛑 NO EVIDENCE AT ALL IS AMBIGUOUS — never a guess', () => {
    expect(replyOwnerFromSends([A1, B1], new Set()).ok).toBe(false)
    expect(routeReply([A1, B1], null, new Set()).how).toBe('ambiguous')
  })

  it('🛑 AND IT NEVER PICKS THE NEWEST — order carries no authority', () => {
    // Same inputs, reversed. A rule that read "the last one" would answer differently.
    const forward = routeReply([A1, B1], null, new Set())
    const reverse = routeReply([B1, A1], null, new Set())
    expect(forward.how).toBe(reverse.how)
    expect(forward.matches).toEqual([])
    expect(reverse.matches).toEqual([])
  })

  it('evidence for a lead of the SAME single client changes nothing', () => {
    const r = routeReply([A1, A2], null, new Set(['lead-a']))
    expect(r.how).toBe('single')
    expect(r.matches).toEqual([A1, A2])
  })
})

describe('GAP 3 · Ⓒ the pipeline actually applies it', () => {
  const pipe = () => src('apps/api/src/lib/reply-pipeline.ts')

  it('🛑 IT GATHERS THE EVIDENCE ONLY WHEN THE MATCHES SPAN MORE THAN ONE CLIENT', () => {
    const s = pipe()
    expect(s).toMatch(/sentLeadIdsFor|figsy_sent_emails/)
    // The single-client happy path must not pay for a read it cannot need.
    expect(s).toMatch(/size > 1|> 1/)
  })

  it('🛑 AMBIGUITY IS AN OPERATOR EXCEPTION, NOT A SILENT DROP', () => {
    const s = pipe()
    expect(s).toMatch(/ambiguous/)
    expect(s).toMatch(/sendFounderAlert/)
  })

  it('🛑 AND THE WRITE LOOP CANNOT SPAN TWO CLIENTS — the last line of defence', () => {
    const s = pipe()
    // ⛓️ TIGHTENED AFTER ITS OWN MUTATION DID NOT GO RED. The first cut searched the file for
    // /cross-client|one client/i — and PASSED with the refusal deleted, because the alert
    // TITLE string "matched more than one client" satisfied it. A guard a message can satisfy
    // is not a guard.
    //
    // The assertion is now the refusal itself: the write set is measured, a set spanning more
    // than one client returns before the loop, and the loop is what it protects.
    const at = s.indexOf('const writing = new Set(matches.map(m => m.client_id))')
    expect(at, 'the write set is no longer measured before the loop').toBeGreaterThan(0)
    const fence = s.slice(at, s.indexOf('for (const lead of matches)', at))
    expect(fence, 'a multi-client write set is no longer refused')
      .toMatch(/if \(writing\.size > 1\)/)
    // ⛓️ 17 Sep — RE-POINTED, AND THE DUTY IS UNCHANGED. It pinned the exact string
    // `dropped: 'ambiguous_owner'`; this branch now returns `ambiguous_owner_unretained`,
    // because reaching it means an assumption has broken and the one outcome that must NOT
    // follow is a 200 telling the provider we kept a reply that was neither written nor
    // retained. What this guard is FOR — the refusal actually returns, so the loop below is
    // unreachable — is what it now asserts, without binding to which refusal code.
    expect(fence, 'the refusal does not return — the loop would still run')
      .toMatch(/return \{ ok: false as const, dropped: 'ambiguous_owner(_unretained)?' as const \}/)
  })

  it('classification still happens ONCE, before the loop', () => {
    const s = pipe()
    const cls = s.indexOf('classifyReply(inbound.body)')
    const loop = s.indexOf('for (const lead of matches)')
    expect(cls).toBeGreaterThan(0)
    expect(loop).toBeGreaterThan(cls)
  })
})

describe('GAP 3 · Ⓓ email matching stays a lookup aid, never the authority', () => {
  it('the lead lookup is still case-insensitive-capable and bounded', () => {
    const s = src('apps/api/src/lib/reply-ingest.ts')
    expect(s).toMatch(/from\('leads'\)/)
    expect(s).toMatch(/\.limit\(50\)/)
  })

  it('🛑 BUT THE PROSPECT ADDRESS NEVER DECIDES THE OWNER ON ITS OWN', () => {
    // `routeReply` is the only decider, and it never receives the address.
    const s = src('apps/api/src/lib/reply-ingest.ts')
    const fn = s.slice(s.indexOf('export function routeReply'), s.indexOf('export async function resolveInboxOwner'))
    expect(fn).not.toMatch(/fromEmail|toEmail|@/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// MIGRATION SAFETY — what happens if duplicate live assignments already exist
// ═════════════════════════════════════════════════════════════════════════════
describe('the unique-email migration fails CLOSED on existing duplicates', () => {
  const SQL = readFileSync(
    join(REPO, 'supabase/migrations/20260916_client_inboxes_one_live_per_email.sql'), 'utf8')

  it('🛑 IT IS A PLAIN `CREATE UNIQUE INDEX`, which POSTGRES REFUSES on duplicate data', () => {
    // This is the fail-closed property, and it is a property of the statement rather than
    // something the SQL has to implement: Postgres validates existing rows when it builds a
    // unique index, and ERRORs if any pair violates it. Nothing is created, nothing is
    // changed, and the runner reports the error.
    expect(SQL).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS client_inboxes_one_live_per_email/)
    // 🛑 NO `CONCURRENTLY`, which would leave an INVALID index behind on failure — an index
    // that exists, enforces nothing, and reads as applied.
    expect(SQL, 'CONCURRENTLY would leave an INVALID index that looks applied').not.toMatch(/CONCURRENTLY/)
  })

  it('🛑 AND IT DOES NOT DEDUPE, DELETE OR RELEASE ANYTHING to make itself succeed', () => {
    // A migration that "cleaned up" duplicate live assignments would be choosing, silently,
    // which client loses their sending mailbox. That is a decision for a person.
    for (const destructive of ['DELETE', 'UPDATE', 'DROP', 'TRUNCATE', 'ALTER TABLE']) {
      expect(SQL, `the migration is not additive — it contains ${destructive}`)
        .not.toContain(destructive)
    }
  })

  it('it says out loud what a failure MEANS, so nobody retries blindly', () => {
    expect(SQL).toMatch(/IF IT CANNOT BE CREATED, THE DATA ALREADY VIOLATES IT/)
    expect(SQL).toMatch(/Resolve the duplicates/)
  })

  it('🛑 AND THE APPLICATION IS SAFE WHETHER OR NOT IT HAS RUN', () => {
    // Before the index exists, the claim still filters on live DB rows and still refuses
    // reserved addresses — it simply loses the race arbiter. After it exists, a lost race is
    // caught as a unique violation and the next mailbox is tried. Neither state can assign one
    // live mailbox to two clients through the generic claim path.
    const claim = src('apps/api/src/lib/sender-claim.ts')
    expect(claim).toMatch(/\.in\('status', LIVE_CLAIM_STATUSES/)
    expect(claim).toMatch(/isUniqueViolation/)
  })

  it('and it is registered in the runner as well as the file', () => {
    const pending = readFileSync(join(REPO, 'apps/api/src/lib/pending-migrations.ts'), 'utf8')
    expect(pending).toContain("key: '20260916_client_inboxes_one_live_per_email'")
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// THE RULINGS ARE IN THE REGISTER, NOT ONLY IN THIS BUILD
// ═════════════════════════════════════════════════════════════════════════════
//
// ⚠️ THE REASON THIS DESCRIBE EXISTS AT ALL (rule 4b · the citation law). A ruling that lives
// only in a chat transcript is a ruling that will be contradicted: the transcript is not read
// at session start and cannot be grepped. #549 was reversed on 6 Aug for exactly that reason.
//
// 🛑 AND IT CHECKS THE CHAIN, NOT JUST THE NEW ROW. D7 AND D15 BOTH carried *"an unknown inbox
// falls back to the fan-out"* — the sentence this build retires. Correcting one and leaving the
// other is how the register comes to contradict itself, so both are pinned as chained.
describe('R131 is recorded where it can be grepped, and D7/D15 are chained', () => {
  const rules = readFileSync(join(REPO, 'docs/PRODUCT-RULES.md'), 'utf8')

  it('🛑 R131 EXISTS, in the founder\'s own words', () => {
    expect(rules).toMatch(/R131/)
    for (const clause of [
      'Never fan out one external reply to multiple clients.',
      'If the system cannot determine one safe owner: FAIL CLOSED.',
      'Never guess the newest client/programme.',
      'Do NOT hard-code private email addresses if existing canonical House/client assignment truth can enforce this.',
    ]) {
      expect(rules, `R131 is missing the founder's clause: ${clause}`).toContain(clause)
    }
  })

  it('🛑 NEITHER D7 NOR D15 STILL ASSERTS THE FAN-OUT FALLBACK AS LIVE TRUTH', () => {
    // The old sentence survives ONLY struck through (`~~…~~`), which is what chaining means
    // here — the history is kept, the claim is not. A bare live copy of it is the defect.
    for (const id of ['| D7 |', '| **D15** |']) {
      const i = rules.indexOf(id)
      expect(i, `${id} has disappeared from the register — chained rules are never deleted`).toBeGreaterThan(-1)
      const row = rules.slice(i, rules.indexOf('\n', i))
      expect(row, `${id} is not marked as chained`).toContain('CHAINED 16 Sep')
      for (const m of row.matchAll(/An unknown inbox (?:now )?falls back to the fan-out/g)) {
        const before = row.slice(Math.max(0, m.index - 4), m.index)
        expect(before, `${id} still states the fan-out fallback as live truth`).toContain('~~')
      }
    }
  })

  it('and it does NOT claim to close Sprint 1, S5/S6 runtime, House runtime or MVP1', () => {
    // The founder said so by name, and a rule row is exactly where an overclaim would survive.
    const i = rules.indexOf('| **R131** |')
    const row = rules.slice(i, rules.indexOf('\n', i))
    expect(row).toContain('closes none of Sprint 1')
    expect(row, 'the unapplied migration is not flagged in the rule row').toMatch(/UNAPPLIED/i)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// S5-C · A LEGACY CREDIT BALANCE IS NOT PROGRAMME PAYMENT AUTHORITY
// ═════════════════════════════════════════════════════════════════════════════
//
// ⚠️ TEST ONLY — NO PRODUCTION CODE WAS CHANGED FOR THIS, and none needed to be. The
// independent review found S5-C already correct and said so; what it also found is that no
// test anywhere CONSTRUCTS the dangerous row. Every existing assertion proves "no P1 evidence
// → refused" on a row with nothing else on it either, so a future change that let a wallet
// balance answer for a payment would break no test in this repo.
//
// 🛑 WHY THE ROW BELOW IS THE DANGEROUS ONE. The legacy model sold a $299 pack and $4 per
// approved lead, and a client could carry a five-figure `figsy_credits_remaining` from it. The
// programme model does not use the wallet at all — P1 is `first_paid_at` (Stripe) or
// `first_authorised_at` (House, internal) and nothing else. So the row that must be refused is
// a client with PLENTY of legacy money and no programme payment: exactly the shape where
// "they have paid us, surely that counts" is a tempting one-line change.
//
// ⚠️ IT ASSERTS ON THE PREDICATE, NOT ON A ROUTE. `p1Authorised` is where the question is
// answered for every caller, so a guard placed anywhere else could be bypassed by the next one.
describe('S5-C · legacy credits can never satisfy programme P1', () => {
  // A SOURCING programme with no payment and no internal authority — and, in the fixture the
  // production code actually reads, no notion of a wallet at all. That absence IS the design:
  // if `p1Authorised` could see a credit balance, it would have to be given one.
  const noP1 = {
    id: 'prog-1', client_id: 'client-rich', status: 'SOURCING',
    recommended_volume: 1000, sourcing_ceiling: 1000, sourced_used: 0, sourced_reserved: 0,
    first_paid_at: null, first_payment_ref: null, first_payment_intent_id: null,
    first_authorised_at: null,
    second_paid_at: null, second_payment_ref: null, second_payment_intent_id: null,
    second_authorised_at: null,
    approved_at: null, went_live_at: null, run_at: null, paused_at: null,
    review_required_at: null, review_resolved_at: null,
  }

  it('🛑 SOURCING IS REFUSED — `first_payment_missing`, whatever the wallet says', async () => {
    const { authorityFor } = await import('./programme-authority')
    const v = authorityFor(noP1 as never, 'SOURCING')
    expect(v.allowed, 'a legacy credit balance bought programme sourcing').toBe(false)
    if (!v.allowed) expect(v.reason).toBe('first_payment_missing')
  })

  it('🛑 AND SO IS THE NEXT BATCH', async () => {
    const { authorityFor } = await import('./programme-authority')
    const v = authorityFor(noP1 as never, 'NEXT_BATCH')
    expect(v.allowed).toBe(false)
  })

  it('🛑 `p1Authorised` READS EXACTLY TWO FACTS, and neither is money we already hold', async () => {
    const { p1Authorised } = await import('./programme')
    // The two that DO authorise.
    expect(p1Authorised({ ...noP1, first_paid_at: '2026-09-01T00:00:00Z' } as never)).toBe(true)
    expect(p1Authorised({ ...noP1, first_authorised_at: '2026-09-01T00:00:00Z' } as never)).toBe(true)
    // And the row with neither, however much legacy value sits beside it.
    expect(p1Authorised(noP1 as never)).toBe(false)
  })

  it('🛑 NO WALLET, CREDIT, GRANT OR BALANCE WORD APPEARS IN THE P1/P2 PREDICATES', () => {
    // The structural half. A source guard, because the defect being prevented is somebody
    // ADDING a term to these two functions — which no behavioural test can see coming.
    const prog = src('apps/api/src/lib/programme.ts')
    const at = prog.indexOf('export function p1Authorised')
    const end = prog.indexOf('export function isInternallySettled', at) > -1
      ? prog.indexOf('export function isInternallySettled', at)
      : at + 1200
    const block = prog.slice(at, end)
    expect(at, 'p1Authorised has moved — re-point this guard').toBeGreaterThan(-1)
    for (const banned of ['credit', 'wallet', 'balance', 'grant', 'figsy_credits']) {
      expect(block.toLowerCase(), `the P1/P2 predicates now consider "${banned}" — legacy money cannot buy a programme`)
        .not.toContain(banned)
    }
  })
})
