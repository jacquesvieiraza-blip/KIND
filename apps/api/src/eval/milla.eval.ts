import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HAVE_KEY, EVAL_TIMEOUT_MS, report } from './harness'

// ═══════════════════════════════════════════════════════════════════════════════════════
// MILLA, AGAINST THE REAL MODEL — 30 conversations, through the REAL onboarding handler.
//
// ── WHY THE HANDLER AND NOT A COPY OF THE PROMPT ───────────────────────────────────────
//
// 🛑 THE LESSON THIS REPO KEEPS RELEARNING IS THAT A HELPER CAN BE RIGHT AND THE ROUTE CAN
// CALL IT WRONG. An eval that rebuilt the prompt would be a SECOND home for the thing it is
// meant to check, and would have passed happily through every one of the five regex rounds —
// because the prompt was never the part that was broken. So this drives
// `POST /icps/builder/chat` itself: the real system prompt, the real tool schema, the real
// `applyListOps` merge, the real reply handling, on the real model.
//
// ⚠️ ONLY THE DATABASE IS A DOUBLE. `../lib/brief-draft` is replaced by an in-memory store,
// which is also what makes the MERGE observable — every case can read exactly what Milla
// stored, which is the fact that matters and the one no phrase test can see.
//
// ⚠️ NOTHING HERE IS IN THE GATE. `.eval.ts` is outside vitest's default include; without a
// key every case SKIPS. See `harness.ts`.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The in-memory draft this run's conversation writes into. */
const store: { facts: Record<string, unknown>; transcript: unknown[] } =
  { facts: {}, transcript: [] }

vi.mock('../lib/brief-draft', () => ({
  // A first-run client with nothing recorded, unless a case seeded it.
  writableBriefDraft: async () => ({ facts: store.facts, confirmedAt: null, promotedClientId: null }),
  briefDraftFor: async () => ({ facts: store.facts, confirmedAt: null, promotedClientId: null }),
  saveBriefDraft: async (_u: string, f: Record<string, unknown>) => {
    // ⚠️ MERGED, EXACTLY AS THE REAL ONE MERGES. A double that REPLACED would hide the
    // shallow-merge defect Build 1 was written to close.
    store.facts = { ...store.facts, ...f }
    return { ok: true, draft: { facts: store.facts } }
  },
  markBriefDraftPromoted: async () => ({ ok: true }),
  mayConfirmBrief: () => ({ ok: true, missing: [] }),
  BRIEF_TRANSCRIPT_MAX_TURNS: 40,
}))
vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, order: () => q, limit: () => q,
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
        insert: () => q, update: () => q, upsert: () => q, delete: () => q,
        then: (r: (v: unknown) => unknown) => r({ data: [], error: null }),
      }
      return q
    },
    auth: { getUser: async () => ({ data: { user: { id: 'user-1' } }, error: null }) },
  },
}))
vi.mock('../lib/rate-limit', () => ({
  rateLimit: () => (_q: unknown, _s: unknown, n: () => void) => n(),
}))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: async () => {} }))
// ⚠️ `middleware/auth` BUILDS A SUPABASE CLIENT AT MODULE SCOPE, so merely importing the
// router constructs one. The eval supplies the identity itself (there is no request and no
// token), so the middleware is replaced rather than fed a fake URL — the same thing
// `programme-attribution.test.ts` does, and for the same reason.
vi.mock('../middleware/auth', () => ({
  requireAuth: (_q: unknown, _s: unknown, n: () => void) => n(),
}))

type Said = { role: 'user' | 'assistant'; content: string }
type Reply =
  | { type: 'question'; content: string }
  | { type: 'complete'; [k: string]: unknown }
  | { error: string }

/** Send one turn to the real route and return what a client's browser would receive. */
async function turn(messages: Said[]): Promise<{ reply: Reply; code: number }> {
  const { icpRouter } = await import('../routes/icps')
  const layer = (icpRouter as unknown as {
    stack: Array<{ route?: { path: string; methods: Record<string, boolean>; stack: Array<{ handle: Function }> } }>
  }).stack.find(l => l.route?.path === '/builder/chat' && l.route?.methods.post)
  if (!layer?.route) throw new Error('POST /icps/builder/chat not found on the router')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  const out: { reply: Reply; code: number } = { reply: { error: 'nothing' }, code: 200 }
  const res = {
    status(c: number) { out.code = c; return res },
    json(p: { success?: boolean; data?: Reply; error?: string }) {
      out.reply = (p.data ?? { error: String(p.error ?? 'unknown') }) as Reply
      return res
    },
  }
  await handler(
    { body: { messages, profile_required: true }, userId: 'user-1', headers: {}, socket: { remoteAddress: '1.2.3.4' } },
    res, () => {},
  )
  return out
}

/**
 * Run a whole conversation, one real turn at a time, and hand back the stored Brief.
 *
 * 🛑 A DEAD MODEL THROWS RATHER THAN RETURNING EMPTY. Without this, every case shaped "she
 * must NOT have stored X" would PASS when the provider was unreachable — nothing happened,
 * so nothing wrong happened. A vacuous pass in an eval is worse than a failure: it is the
 * report saying the conversation is fine when no conversation took place. The one thing this
 * whole exercise exists to stop is evidence that was never actually gathered.
 */
async function conversation(saidByClient: string[]): Promise<{
  messages: Said[]; facts: Record<string, unknown>; last: Reply
}> {
  const messages: Said[] = []
  let last: Reply = { error: 'nothing' }
  for (const said of saidByClient) {
    messages.push({ role: 'user', content: said })
    const { reply, code } = await turn(messages)
    last = reply
    if ('error' in reply) {
      throw new Error(
        `NO CONVERSATION TOOK PLACE — the route answered ${code} with `
        + `"${String(reply.error).slice(0, 160)}". This is a provider or wiring failure, not a `
        + 'model behaviour result, and nothing below it was measured.',
      )
    }
    if ('content' in reply && typeof reply.content === 'string') {
      messages.push({ role: 'assistant', content: reply.content })
    } else break
  }
  return { messages, facts: store.facts, last }
}

const asked = (r: Reply): string => ('content' in r && typeof r.content === 'string' ? r.content : '')
const list = (v: unknown): string[] => (Array.isArray(v) ? v.map(x => String(x).toLowerCase().trim()) : [])
const has = (v: unknown, want: string) => list(v).some(x => x.includes(want.toLowerCase()))

const evalIt = it.skipIf(!HAVE_KEY)

beforeEach(() => { store.facts = {}; store.transcript = [] })

describe('MILLA · live', { timeout: EVAL_TIMEOUT_MS }, () => {
  // ══════════════════════════════════════════════════════════════════════════════════════
  // ① THE COUNTRY. Five rounds of regex died here. Every one of these sentences broke at
  // least one of them, and the last four are the exact strings from the V5 instruction.
  // ══════════════════════════════════════════════════════════════════════════════════════
  for (const { said, country, why } of [
    { said: "We're Redmayne & Co. and we're in the UK.", country: 'united kingdom', why: 'plain' },
    { said: 'Redmayne & Co. Our office is in Ireland.', country: 'ireland', why: '"office" was filler to V5' },
    { said: "Redmayne & Co. I'm currently in Ireland.", country: 'ireland', why: '"I am" was filler to V5' },
    { said: 'Redmayne & Co. Our business is based out of Dublin.', country: 'ireland', why: 'a city, not a country' },
    { said: 'Redmayne & Co. We run everything from Manchester.', country: 'united kingdom', why: 'a city, no country word' },
    { said: "Redmayne & Co. We're a British company.", country: 'united kingdom', why: 'a demonym' },
    { said: 'Redmayne & Co. HQ Dublin, but we sell into the States.', country: 'ireland', why: 'two countries, one is the market' },
  ]) {
    evalIt(`country · ${why} · "${said}"`, async () => {
      const { facts, last } = await conversation([said])
      const p: string[] = []
      const got = String(facts.country ?? '').toLowerCase()
      // 🛑 SHE MAY GET IT OR SHE MAY ASK. What she may NOT do is store the wrong one — that
      // is the state no client can correct, because nothing shows it to them.
      if (got && !got.includes(country)) p.push(`stored country "${facts.country}" — expected ${country}, or nothing and a question`)
      if (!got && !asked(last)) p.push('neither learned it nor asked')
      // And the company name was in the same sentence every time.
      if (!String(facts.company_name ?? '').toLowerCase().includes('redmayne')) {
        p.push(`missed the company name in the same sentence (stored "${facts.company_name ?? ''}")`)
      }
      expect(p, report(p)).toEqual([])
    })
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ② LIST CORRECTIONS. The defect nobody had named: a shallow merge meant "add the US as
  // well" could DELETE the market they gave an hour earlier. `brief_list_ops` is the fix,
  // and this is the only thing that can prove the model actually uses it.
  // ══════════════════════════════════════════════════════════════════════════════════════
  evalIt('lists · adding a market does not delete the first one', async () => {
    const { facts } = await conversation([
      'We are Redmayne & Co, UK based, we restore vintage watches and sell them to independent jewellers.',
      'We sell across the United Kingdom.',
      'Actually include the US as well.',
    ])
    const p: string[] = []
    if (!has(facts.geographies, 'united kingdom') && !has(facts.geographies, 'uk')) {
      p.push(`the UK was deleted by an ADD — geographies are now ${JSON.stringify(facts.geographies)}`)
    }
    if (!has(facts.geographies, 'united states') && !has(facts.geographies, 'us')) {
      p.push(`the US was never added — geographies are ${JSON.stringify(facts.geographies)}`)
    }
    expect(p, report(p)).toEqual([])
  })

  evalIt('lists · removing one market keeps the others', async () => {
    const { facts } = await conversation([
      'Redmayne & Co, UK, we restore vintage watches for independent jewellers.',
      'We sell in the United Kingdom, Ireland and France.',
      'Drop France, that was a mistake.',
    ])
    const p: string[] = []
    if (has(facts.geographies, 'france')) p.push('France was not removed')
    if (!has(facts.geographies, 'ireland')) p.push(`Ireland was lost by a REMOVE — ${JSON.stringify(facts.geographies)}`)
    expect(p, report(p)).toEqual([])
  })

  evalIt('lists · a job-title correction does not empty the list', async () => {
    const { facts } = await conversation([
      'Redmayne & Co, UK, vintage watch restoration, we sell to independent jewellers.',
      'We want owners and buying directors.',
      'Add managing directors too please.',
    ])
    const p: string[] = []
    if (!has(facts.job_titles, 'owner')) p.push(`Owner was dropped — ${JSON.stringify(facts.job_titles)}`)
    if (!has(facts.job_titles, 'managing director')) p.push(`the addition never landed — ${JSON.stringify(facts.job_titles)}`)
    expect(p, report(p)).toEqual([])
  })

  evalIt('lists · a full restatement REPLACES rather than accumulating', async () => {
    const { facts } = await conversation([
      'Redmayne & Co, UK, vintage watches sold to independent jewellers.',
      'Target the United Kingdom and Ireland.',
      'Scrap that. It is the United States only.',
    ])
    const p: string[] = []
    if (has(facts.geographies, 'united kingdom') || has(facts.geographies, 'ireland')) {
      p.push(`a clear restatement did not replace the old list — ${JSON.stringify(facts.geographies)}`)
    }
    expect(p, report(p)).toEqual([])
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ③ SHE MUST NOT RE-ASK. The prompt's counting defect: a client who gave nine facts in one
  // message was asked for the tenth, then the eleventh, one at a time.
  // ══════════════════════════════════════════════════════════════════════════════════════
  evalIt('🛑 everything at once · she does not re-ask for what she was just told', async () => {
    const { facts, last } = await conversation([
      "I'm Ellis Warner at Redmayne & Co, redmayne.co.uk, we're in the UK. We restore and sell "
      + 'vintage mechanical watches. We want to reach independent jewellers and watch dealers — '
      + 'retail businesses, 1 to 50 people, across the UK and Ireland. Owners and buying '
      + 'directors. Not pawnbrokers and nobody selling replicas. We want to get on calls with '
      + 'buyers who actually stock vintage pieces.',
    ])
    const p: string[] = []
    // Eleven things were said. The check is on what she STORED, never on her wording.
    const want: Array<[string, unknown]> = [
      ['contact_name', facts.contact_name], ['company_name', facts.company_name],
      ['website', facts.website], ['what_they_do', facts.what_they_do],
      ['target_category', facts.target_category], ['geographies', facts.geographies],
      ['company_sizes', facts.company_sizes], ['job_titles', facts.job_titles],
      ['exclusions', facts.exclusions], ['desired_outcome', facts.desired_outcome],
    ]
    const missed = want.filter(([, v]) => v === undefined || v === null || v === ''
      || (Array.isArray(v) && v.length === 0)).map(([k]) => k)
    if (missed.length > 3) p.push(`understood little of a message that said everything — missed ${missed.join(', ')}`)
    // 🛑 AND SHE MUST NOT COUNT OUT LOUD. This is the one wording check in the file, and it
    // is here because the sentence it catches was shown to a real client: "that's 7 of 11 ·
    // Next up: target company type" — three things a client should never have to know.
    const spoken = asked(last)
    if (/\b\d+\s*(of|\/)\s*11\b/i.test(spoken)) p.push(`counted out loud at the client: "${spoken.slice(0, 120)}"`)
    expect(p, report(p)).toEqual([])
  })

  evalIt('🛑 she does not ask twice for the same fact across turns', async () => {
    const { messages } = await conversation([
      'Redmayne & Co. We restore vintage watches.',
      'We are in the United Kingdom.',
      'We sell to independent jewellers, owners mostly.',
      'Avoid pawnbrokers.',
    ])
    // Structural, not textual: the same fact must not still be MISSING after she was told it.
    const p: string[] = []
    const facts = store.facts
    if (!String(facts.country ?? '')) p.push('after being told the country plainly, it is still not stored')
    if (!String(facts.exclusions ?? '')) p.push('after being told who to avoid, it is still not stored')
    if (messages.length < 4) p.push('the conversation ended early')
    expect(p, report(p)).toEqual([])
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ④ EVERY MESSAGE IS ACCEPTED AS CONVERSATION. The founder's rule: ambiguity causes a
  // follow-up question, never a customer-facing technical error.
  // ══════════════════════════════════════════════════════════════════════════════════════
  for (const said of [
    'hi',
    'not sure what you need from me tbh',
    'can you explain what this is first',
    'sorry, what?',
    'who is this',
    "I'd rather just talk to a person",
    'we tried something like this before and it was rubbish',
    'what does it cost',
  ]) {
    evalIt(`accepted · "${said}"`, async () => {
      // ⚠️ `conversation` THROWS if the route answered with an error, which IS this case's
      // first assertion: an unclear message must never produce a customer-facing technical
      // error. A thrown harness failure here is the defect, reported as one.
      const { last } = await conversation([said])
      const p: string[] = []
      const spoken = asked(last)
      if (!spoken.trim()) p.push(`answered with no words at all: ${JSON.stringify(last).slice(0, 160)}`)
      // 🛑 THE RETIRED CANNED SENTENCES. Both were shown to real clients on a live walk.
      for (const canned of [
        "Milla didn't catch that",
        'Tell me more about who you want to target — industry, job title, company size, location?',
        'Tell me a bit more about who you want to reach.',
      ]) {
        if (spoken.includes(canned)) p.push(`a retired canned sentence is back: "${canned}"`)
      }
      if ('error' in last) p.push(`a technical error reached the client: ${String(last.error).slice(0, 120)}`)
      expect(p, report(p)).toEqual([])
    })
  }

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ⑤ SHE DOES NOT INVENT THE CLIENT'S FACTS. The one direction R72 ⑦ forbids.
  // ══════════════════════════════════════════════════════════════════════════════════════
  evalIt('🛑 an unanswered fact stays unanswered — nothing is filled in for them', async () => {
    const { facts } = await conversation([
      'Redmayne & Co. We restore vintage watches. We are in the UK.',
    ])
    const p: string[] = []
    // They said nothing about who to avoid, or what they want out of it. Storing either would
    // be the model writing the client's answer for them.
    if (String(facts.exclusions ?? '').trim()) p.push(`invented an exclusion: "${facts.exclusions}"`)
    if (String(facts.desired_outcome ?? '').trim()) p.push(`invented an outcome: "${facts.desired_outcome}"`)
    expect(p, report(p)).toEqual([])
  })

  evalIt('🛑 "I don\'t know yet" is not an answer to be stored', async () => {
    const { facts } = await conversation([
      'Redmayne & Co, UK, we restore vintage watches.',
      'Who to avoid? No idea yet, honestly.',
    ])
    const p: string[] = []
    const ex = String(facts.exclusions ?? '').toLowerCase()
    if (ex.includes('no idea') || ex.includes("don't know") || ex.includes('not sure')) {
      p.push(`stored their non-answer as the answer: "${facts.exclusions}"`)
    }
    expect(p, report(p)).toEqual([])
  })

  // ══════════════════════════════════════════════════════════════════════════════════════
  // ⑥ THE OUTCOME KIND (Build 4). It replaced a ten-word list that got the founder's own
  // fixture backwards. These are the sentences the list was wrong about.
  // ══════════════════════════════════════════════════════════════════════════════════════
  for (const { said, kind, why } of [
    { said: 'We want to book qualified sales conversations.', kind: 'meetings', why: "the founder's own fixture — the list said other" },
    { said: 'Get us on calls with buyers.', kind: 'meetings', why: 'plainly meetings' },
    { said: 'We want to stop cold-calling and endless demos.', kind: 'other', why: 'the list said meetings' },
    { said: 'We want people downloading the catalogue.', kind: 'other', why: 'plainly not meetings' },
  ]) {
    evalIt(`outcome kind · ${why}`, async () => {
      const { facts } = await conversation([
        'Redmayne & Co, UK, we restore vintage watches and sell to independent jewellers.',
        said,
      ])
      const p: string[] = []
      const got = String(facts.desired_outcome_kind ?? '')
      // ⚠️ ABSENT IS ACCEPTABLE — an unset kind resolves to `other`, which reaches a person.
      // Storing the WRONG one is not, because a meeting target gets agreed against it.
      if (got && got !== kind) p.push(`classified "${said}" as ${got}, expected ${kind}`)
      if (kind === 'meetings' && got !== 'meetings') {
        p.push(`did not recognise a meetings outcome (stored "${got}") — a target cannot be agreed against it`)
      }
      expect(p, report(p)).toEqual([])
    })
  }

  // ⛓️ 14 Sep — A CASE PINNING THE MODEL NAME STOOD HERE AND IS DELETED.
  //
  // ~~`expect(CONVERSATION_MODEL).toBe('claude-sonnet-5')`~~
  //
  // 🛑 BUILD 0'S OWN GUARD CAUGHT IT, and was right to: `models.test.ts:92` already pins that
  // value, IN THE GATE, where it is checked on every run for free. Writing it again here was
  // a second home for one fact — and a second home in the one file that only runs when
  // somebody remembers to spend money on it, which is the worst possible place for it. The
  // eval asks what the MODEL DID; what the model IS belongs to the gate.
})
