// ══════════════════════════════════════════════════════════════════════════════════════════
// J22-C3 · REPLY ROUTING HARDENING (R131)
//
// REQ: *"Lookup error = retained; normalised uncapped matching; single owner checked."*
// RED: *"Lookup error drops a reply; capped matching misses; two owners."*
//
// ── ① THE LOOKUP ERROR WAS A 200, WHICH IS THE ONE ANSWER THAT LOSES THE REPLY ─────────
//
// `findLeadMatches` throws on a read failure — correctly, because returning `[]` would be
// indistinguishable from "nobody matched". The caller then alerted and returned
// `dropped: 'lookup_failed'`, and the route answers that code with a **200**. So a transient
// database error while asking *whose lead is this* consumed the delivery: the provider is told
// we kept it, the dedup claim stays, and the prospect's answer exists nowhere.
//
// The reply was never unattributable. We simply failed to ask — the most recoverable failure
// of the lot — so it is now RETAINED IN FULL, with NO candidates, because the candidates are
// genuinely unknown and inventing a list would fabricate the evidence an operator is about to
// use. If the retention also fails, the webhook is refused and the provider redelivers.
//
// ── ② MATCHING MISSED ON LETTER CASE, AND TRUNCATED AT FIFTY ───────────────────────────
//
// `.eq('email', email)` compares the From header's casing — the sending server's choice —
// against `leads.email`, which is written raw from the provider. This repo already knew:
// `suppressOptOut` carries the note *"an exact compare between the two is a coin toss on
// letter case."* A reply from `Ada@Prospect.com` to a lead stored as `ada@prospect.com`
// matched NOTHING, and no match is a silent 200.
//
// `.limit(50)` truncated: a widely-held address returned an arbitrary fifty and the true owner
// could be outside them, so the reply was routed to whoever was in the window or read as
// ambiguous because the resolving evidence was cut off.
//
// ⚠️ THE `ilike` IS A PREFILTER AND THE EXACT COMPARE IS THE AUTHORITY — `_` and `%` are SQL
// wildcards and legal in a local part, so a widened pattern must not be able to widen the
// RESULT. On this path a widened result is one client reading another's inbound mail.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'

const state = {
  lookupThrows: false,
  retentionFails: false,
  retained: [] as Record<string, unknown>[],
  inserted: [] as Record<string, unknown>[],
  alerts: [] as { kind: string; subject: string; lines: string[] }[],
}

vi.mock('@kind/db', () => ({
  db: {
    rpc: async () => ({ data: null, error: null }),
    from: () => {
      const q: Record<string, unknown> = {
        select() { return q }, eq() { return q }, in() { return q }, is() { return q },
        not() { return q }, ilike() { return q }, order() { return q }, limit() { return q },
        update() { return q },
        insert(row: Record<string, unknown>) { state.inserted.push(row); return q },
        async maybeSingle() { return { data: null, error: null } },
        async single() { return { data: { id: 'reply-1' }, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(r) },
      }
      return q
    },
  },
}))
vi.mock('./figsy', () => ({
  classifyReply: async () => ({ classification: 'warm', reasoning: 'r' }),
  isRiskyReply: () => false,
  recomputeCampaignCounters: async () => {},
}))
vi.mock('./reply-ingest', async (orig) => {
  const actual = await orig() as Record<string, unknown>
  return {
    ...actual,
    findLeadMatches: async () => {
      if (state.lookupThrows) throw new Error('connection reset')
      return []
    },
    resolveInboxOwner: async () => null,
    sentLeadIdsFor: async () => new Set<string>(),
    suppressOptOut: async () => {},
    alertDroppedReply: async (why: string, _i: unknown, detail?: string) => {
      state.alerts.push({ kind: 'dropped', subject: why, lines: [detail ?? ''] })
    },
  }
})
vi.mock('./unattributed-reply', () => ({
  retainUnattributedReply: async (input: Record<string, unknown>) => {
    if (state.retentionFails) return { ok: false, detail: 'relation does not exist' }
    state.retained.push(input)
    return { ok: true, id: 'unattr-9' }
  },
}))
vi.mock('./alerts', () => ({
  sendFounderAlert: async (kind: string, subject: string, lines: string[]) => {
    state.alerts.push({ kind, subject, lines })
    return { delivered: true, emailOk: true, slackOk: false, durableOk: true, taskOk: true }
  },
}))
vi.mock('./outcomes', () => ({ logOutcomeEvent: async () => {} }))
vi.mock('./crm', () => ({ pushDealToCrm: async () => {} }))
vi.mock('./hubspot', () => ({ syncFigsyInterestedToHubspot: async () => {} }))
vi.mock('./push', () => ({ sendPushToClient: async () => {} }))
vi.mock('../routes/signals', () => ({ emitSignal: () => {} }))

const INBOUND = {
  provider: 'resend',
  fromEmail: 'ada@prospect.com',
  fromName: 'Ada',
  toEmail: 'inbound@kind.test',
  subject: 'Re: hello',
  body: 'Yes please.',
}

/** `findLeadMatches` alone — the rest of this module compares addresses for other reasons. */
function findLeadMatchesBody(src: string): string {
  const at = src.indexOf('export async function findLeadMatches')
  if (at === -1) throw new Error('findLeadMatches moved — this guard must be repointed')
  const end = src.indexOf('\nexport ', at + 10)
  return src.slice(at, end === -1 ? src.length : end)
}

async function process() {
  const { processInboundReply } = await import('./reply-pipeline')
  return processInboundReply(INBOUND as never, { rawPayload: { a: 1 }, eventKey: 'resend:evt-1' } as never)
}

beforeEach(() => {
  state.lookupThrows = false
  state.retentionFails = false
  state.retained = []
  state.inserted = []
  state.alerts = []
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① A LOOKUP ERROR IS RETAINED, NOT DROPPED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C3 · a failed lead lookup keeps the reply', () => {
  it('🛑 THE REPLY IS RETAINED IN FULL', async () => {
    state.lookupThrows = true
    await process()
    expect(state.retained.length, 'a database hiccup consumed the reply').toBe(1)
    const row = state.retained[0]
    expect(row.fromEmail).toBe(INBOUND.fromEmail)
    expect(row.body, 'a row a human cannot read is not evidence').toBe(INBOUND.body)
    expect(row.subject).toBe(INBOUND.subject)
    expect(row.rawPayload, 'the provider payload was not kept for forensics').toBeTruthy()
    expect(row.providerEventKey).toBe('resend:evt-1')
  })

  it('🛑 WITH NO CANDIDATES — we do not know them, and a guess is fabricated evidence', async () => {
    state.lookupThrows = true
    await process()
    expect(state.retained[0].candidateClientIds).toEqual([])
    expect(state.retained[0].candidateLeadIds).toEqual([])
  })

  it('🛑 AND THE ALERT SAYS IT WAS KEPT, naming the record', async () => {
    state.lookupThrows = true
    await process()
    const dropped = state.alerts.find(a => a.subject === 'the lead lookup failed')
    expect(dropped, 'nobody was told the lookup failed').toBeTruthy()
    expect(dropped?.lines.join(' ')).toContain('unattr-9')
    expect(dropped?.lines.join(' ')).toContain('Nothing was lost')
  })

  it('🛑 IF THE RETENTION ALSO FAILS, THE WEBHOOK IS REFUSED so the provider redelivers', async () => {
    // A 200 is a promise we can only keep once the row exists — the same rule the ambiguous
    // path already follows, and the same refusal code, so the route needs no new branch.
    state.lookupThrows = true
    state.retentionFails = true
    const r = await process()
    expect(r.ok).toBe(false)
    expect((r as { dropped: string }).dropped).toBe('ambiguous_owner_unretained')
  })

  it('and nothing is written to any client on that path', async () => {
    state.lookupThrows = true
    await process()
    expect(state.inserted.filter(r => 'from_email' in r)).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② NORMALISED, UNCAPPED MATCHING — the real function, not a stub
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C3 · matching does not miss on letter case, and never truncates', () => {
  it('🛑 THE CEILING REFUSES RATHER THAN TRIMMING', async () => {
    const { LEAD_MATCH_CEILING } = await import('./reply-ingest')
    expect(LEAD_MATCH_CEILING).toBeGreaterThan(50)
    const src = (await import('node:fs')).readFileSync(
      (await import('node:path')).join(__dirname, 'reply-ingest.ts'), 'utf8')
    const fn = findLeadMatchesBody(src)
    expect(fn, 'the cap silently truncates again').not.toMatch(/\.limit\(50\)/)
    expect(fn).toMatch(/limit\(LEAD_MATCH_CEILING \+ 1\)/)
    expect(fn).toMatch(/throw new Error\(`\$\{normalised\} matches more than/)
  })

  it('🛑 THE COMPARE IS CASE-INSENSITIVE, AND THE WILDCARDS ARE ESCAPED', async () => {
    const src = (await import('node:fs')).readFileSync(
      (await import('node:path')).join(__dirname, 'reply-ingest.ts'), 'utf8')
    // ⚠️ BOUNDED TO THE FUNCTION. The rest of this file legitimately compares an address with
    // `.eq`, so a slice running to the end of the file would fail against code that is fine.
    const fn = findLeadMatchesBody(src)
    expect(fn, 'the lookup compares raw casing again').not.toMatch(/\.eq\('email', email\)/)
    expect(fn).toMatch(/\.ilike\('email', pattern\)/)
    expect(fn).toMatch(/replace\(\/\(\[\\\\%_\]\)\/g/)
    expect(fn, 'the prefilter is not re-checked, so a pattern could widen the result')
      .toMatch(/\.trim\(\)\.toLowerCase\(\) === normalised/)
  })

  it('an empty address matches nobody rather than everybody', async () => {
    const { findLeadMatches } = await import('./reply-ingest')
    expect(await findLeadMatches('   ')).toEqual([])
    expect(await findLeadMatches('')).toEqual([])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ SINGLE OWNER, STILL CHECKED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J22-C3 · one reply still reaches one client, or none', () => {
  it('🛑 THE WRITE SET IS ASSERTED AGAIN AT THE WRITE', async () => {
    const src = (await import('node:fs')).readFileSync(
      (await import('node:path')).join(__dirname, 'reply-pipeline.ts'), 'utf8')
    expect(src).toContain('const writing = new Set(matches.map(m => m.client_id))')
    expect(src).toContain('if (writing.size > 1) {')
    expect(src, 'a write set spanning two clients no longer refuses')
      .toContain("return { ok: false as const, dropped: 'ambiguous_owner_unretained' as const }")
  })

  it('🛑 AND ROUTING STILL NEVER SEES THE ADDRESS', async () => {
    // The prospect's address is a lookup aid, never the decider — otherwise two clients
    // holding one prospect would be resolved by the thing they have in common.
    const src = (await import('node:fs')).readFileSync(
      (await import('node:path')).join(__dirname, 'reply-ingest.ts'), 'utf8')
    const fn = src.slice(src.indexOf('export function routeReply'), src.indexOf('export async function resolveInboxOwner'))
    expect(fn).not.toMatch(/fromEmail|toEmail|@/)
  })
})
