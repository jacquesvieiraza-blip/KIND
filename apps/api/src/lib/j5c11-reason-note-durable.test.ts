// ══════════════════════════════════════════════════════════════════════════════════════════
// J5-C11 · THE REASON AND THE NOTE ARE DURABLE BEFORE THEY ARE ACKNOWLEDGED
//
// REQ: *"Told and retried; durable before acknowledgement"* (LR 17).
//
// ── ① THE SERVER ANSWERED `success: true` FOR A WRITE THAT FAILED ───────────────────────
//
//     if (error) {
//       console.error('[leads/feedback] NOT RECORDED for lead', req.params.id, error)
//       res.json({ success: true, recorded: false }); return
//     }
//
// 🛑 SO NO CALLER COULD EVER KNOW. `recorded: false` is in the payload and nothing anywhere
// reads it — the portal's `api.post` resolves on `success`, so a client whose reason was lost
// was told it landed. A retry is impossible to build on top of an answer that says it worked.
//
// ⚠️ THE REASON THE OLD SHAPE WAS WRITTEN IS STILL RESPECTED, AND IT IS A DIFFERENT RULE.
// Its guard said: *"a DB failure logs loudly and still answers success, because the pass
// stands and the client is not the person who can fix a database."* THE PASS STILL STANDS —
// it completed on `/leads/:id/pass`, a different route, before this one is ever called, and
// nothing here can undo it. What changes is that a LOST note is no longer reported as a saved
// one. Telling the truth about our own write is strictly stronger than swallowing it.
//
// ── ② AND THE SCREEN ERASED THE CLIENT'S WORDS BEFORE IT SENT THEM ──────────────────────
//
//     setNoteFor(null); setNoteText('')      // ← the box closes and CLEARS
//     try { await api.post(…) } catch { /* never surfaced */ }
//
// The client types "too corporate, we want independent agencies", presses Send, and the words
// are gone from the screen before the request is made. `sendReason` is the same shape.
//
// ⚠️ P32 IS NOT WEAKENED. *"One tap, never mandatory, never blocks the action."* The action is
// the pass and it already happened. Nothing here makes a reason or a note required, gates the
// next card, or delays anything. We simply stop claiming to have saved what we did not.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { saveDurably, NOTE_FAILED_COPY, NOTE_ATTEMPTS } from '../../../portal/src/lib/durable-note'

type Row = Record<string, unknown>
const state: { clients: Row[]; leads: Row[]; feedback: Row[] } = { clients: [], leads: [], feedback: [] }
/** Set by a test to make the `lead_feedback` write fail, like a real outage. */
let feedbackWriteFails = false

function table(name: string) {
  const rows = (): Row[] =>
    name === 'leads' ? state.leads : name === 'lead_feedback' ? state.feedback : state.clients
  const q: any = {
    _f: [] as ((r: Row) => boolean)[],
    select() { return q },
    eq(c: string, v: unknown) { q._f.push((r: Row) => r[c] === v); return q },
    is(c: string, v: unknown) { q._f.push((r: Row) => (r[c] ?? null) === v); return q },
    not() { return q },
    order() { return q },
    limit() { return q },
    async upsert(v: Row) {
      if (name === 'lead_feedback' && feedbackWriteFails) {
        return { error: { message: 'could not write lead_feedback (simulated)' } }
      }
      state.feedback.push(v); return { error: null }
    },
    async update() { return { error: null } },
    _hit() { return rows().filter(r => q._f.every((f: (r: Row) => boolean) => f(r))) },
    async maybeSingle() { return { data: q._hit()[0] ?? null, error: null } },
    async single() { return { data: q._hit()[0] ?? null, error: null } },
    then(res: (v: unknown) => unknown) {
      return Promise.resolve({ data: q._hit(), error: null, count: q._hit().length }).then(res)
    },
  }
  return q
}

vi.mock('@kind/db', () => ({
  db: {
    from: (t: string) => table(t),
    rpc: async () => ({ data: null, error: null }),
    auth: { admin: { getUserById: async () => ({ data: { user: { email: 'nobody@example.com' } } }) } },
  },
}))
vi.mock('./alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../lib/alerts', () => ({ sendFounderAlert: () => Promise.resolve() }))
vi.mock('../middleware/auth', () => ({
  requireAuth: (_r: unknown, _s: unknown, next: () => void) => next(),
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class { messages = { create: async () => ({ content: [] }) } } }))

const C = 'c-note'
const USER = 'u-note'

async function feedback(body: Row): Promise<{ status: number; body: any }> {
  const mod = await import('../routes/leads')
  const layer = (mod.leadRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/:id/feedback' && l.route?.methods.post)
  if (!layer) throw new Error('POST /:id/feedback not found on leadRouter')
  const handler = layer.route.stack[layer.route.stack.length - 1].handle
  let status = 200
  let payload: any = null
  const res: any = { status(c: number) { status = c; return res }, json(b: unknown) { payload = b; return res } }
  await handler({ userId: USER, query: {}, body, params: { id: 'lead-1' } }, res, () => {})
  return { status, body: payload }
}

beforeEach(() => {
  state.clients = [{ id: C, user_id: USER }]
  state.leads = [{ id: 'lead-1', client_id: C }]
  state.feedback = []
  feedbackWriteFails = false
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① THE SERVER TELLS THE TRUTH ABOUT ITS OWN WRITE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C11 · a write that failed is never acknowledged as a write that happened', () => {
  it('a successful write is acknowledged, exactly as before', async () => {
    const { status, body } = await feedback({ action: 'pass', reason_code: 'too_big' })
    expect(status).toBe(200)
    expect(body?.success).toBe(true)
    expect(state.feedback).toHaveLength(1)
  })

  it('🛑 a FAILED write is NOT reported as success — nothing could retry on that answer', async () => {
    feedbackWriteFails = true
    const { status, body } = await feedback({ action: 'pass', free_text: 'too corporate for us' })
    expect(body?.success, 'the client was told their words were saved when they were lost').toBe(false)
    expect(status, 'a lost note answered 200, so no caller could distinguish it').not.toBe(200)
  })

  it('🛑 and it says so in a way a caller can act on, not only in prose', async () => {
    feedbackWriteFails = true
    const { body } = await feedback({ action: 'pass', free_text: 'too corporate for us' })
    expect(String(body?.code ?? ''), 'no stable code, so a retry must match on a sentence').toBeTruthy()
    expect(String(body?.error ?? ''), 'the client is told nothing').toBeTruthy()
  })

  it('NOTHING TO RECORD is still a success — a tapped-and-untapped chip is not an error', async () => {
    // The client tapped and untapped, or a stale build sent an unknown code. Neither deserves
    // an error on their screen, and this branch never reached the database at all.
    const { status, body } = await feedback({ action: 'pass', reason_code: 'nonsense' })
    expect(status).toBe(200)
    expect(body?.success).toBe(true)
    expect(body?.recorded).toBe(false)
  })

  it('🛑 THE PASS IS UNTOUCHED — the property the old shape existed to protect', async () => {
    // The guard this replaces said "the pass stands". It still does, for a stronger reason
    // than a swallowed error: the pass completed on `/leads/:id/pass`, a different route,
    // before this one is called, and nothing in this handler writes to `leads` at all.
    const ROUTES = readFileSync(join(__dirname, '../routes/leads.ts'), 'utf8')
    const at = ROUTES.indexOf("post('/:id/feedback'")
    expect(at).toBeGreaterThan(-1)
    const handler = ROUTES.slice(at, ROUTES.indexOf('\n})', at))
    expect(handler, 'the feedback route started writing the lead row')
      .not.toMatch(/from\('leads'\)[\s\S]{0,120}\.(update|insert|delete)\(/)
  })

  it('a client may still only file an opinion on their OWN lead', async () => {
    state.leads = [{ id: 'lead-1', client_id: 'somebody-else' }]
    const { status } = await feedback({ action: 'pass', reason_code: 'too_big' })
    expect(status).toBe(404)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② TOLD AND RETRIED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C11 · the send retries before it gives up, and says so when it does', () => {
  const noWait = async () => {}

  it('one attempt is enough when it works', async () => {
    let calls = 0
    const r = await saveDurably(async () => { calls++ }, { wait: noWait })
    expect(r.kind).toBe('saved')
    expect(calls, 'a working send was retried anyway').toBe(1)
  })

  it('🛑 a transient failure is RETRIED, not swallowed', async () => {
    let calls = 0
    const r = await saveDurably(async () => {
      calls++
      if (calls < 3) throw new Error('network')
    }, { wait: noWait })
    expect(r.kind, 'a recoverable failure lost the client\'s words').toBe('saved')
    expect(calls).toBe(3)
  })

  it('🛑 a persistent failure is TOLD, with the count that actually happened', async () => {
    let calls = 0
    const r = await saveDurably(async () => { calls++; throw new Error('down') }, { wait: noWait })
    expect(r.kind).toBe('failed')
    if (r.kind !== 'failed') throw new Error('unreachable')
    expect(r.message).toBe(NOTE_FAILED_COPY)
    expect(r.attempts).toBe(NOTE_ATTEMPTS)
    expect(calls).toBe(NOTE_ATTEMPTS)
  })

  it('the copy claims nothing — no promise to save later, no blame, and it says the words are kept', () => {
    expect(NOTE_FAILED_COPY).toMatch(/still here/i)
    expect(NOTE_FAILED_COPY).not.toMatch(/we (will|'ll) (try|save)|later|queue|retry automatically/i)
  })

  it('it waits BETWEEN attempts and not after the last one', async () => {
    const waits: number[] = []
    await saveDurably(async () => { throw new Error('down') }, {
      wait: async (ms: number) => { waits.push(ms) },
    })
    expect(waits, 'a backoff ran after the final failure, delaying the sentence for nothing')
      .toHaveLength(NOTE_ATTEMPTS - 1)
    expect(waits[0]).toBeLessThan(waits[1])
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE SCREEN KEEPS THE WORDS UNTIL THEY ARE STORED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J5-C11 · the screen acknowledges nothing it has not stored', () => {
  const PAGE = readFileSync(
    join(__dirname, '../../../portal/src/app/(milla)/milla/page.tsx'), 'utf8',
  )
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

  const fn = (name: string): string => {
    const at = PAGE.indexOf(`async function ${name}(`)
    expect(at, `${name} moved — this guard must be repointed`).toBeGreaterThan(-1)
    return PAGE.slice(at, PAGE.indexOf('\n  }', at))
  }

  it('🛑 the note box is not cleared before the send — the words survive a failure', () => {
    const body = fn('sendNote')
    expect(body, 'the send is not durable — nothing retries and nothing is told')
      .toMatch(/saveDurably\(/)
    // ⚠️ THE EMPTY-TEXT EARLY RETURN IS EXEMPT AND IS NOT A CLEAR OF ANYTHING: there is no
    // sentence to lose. It is removed before the scan so the guard tests the real property —
    // nothing the client TYPED is erased before we know it landed.
    const afterEarlyReturn = body.replace(/if \(!text\) \{[^}]*\}/, '')
    const send = afterEarlyReturn.indexOf('saveDurably(')
    expect(
      afterEarlyReturn.slice(0, send),
      'the client\'s sentence is still erased before the request is made',
    ).not.toMatch(/setNoteText\(''\)/)
    // And the clear that DOES happen is conditional on the write having landed.
    expect(body).toMatch(/kind === 'saved'\) \{ setNoteFor\(null\); setNoteText\(''\)/)
  })

  it('🛑 neither send swallows its failure any more', () => {
    // ⚠️ THE COMMENTS ARE STRIPPED, so matching the old "never surfaced" note would prove
    // nothing. What is asserted is the shape: no bare `catch { }` anywhere in either
    // function, and both routed through the durable send that reports its own outcome.
    for (const name of ['sendNote', 'sendReason']) {
      const body = fn(name)
      expect(body, `${name} still swallows a failure in a bare catch`).not.toMatch(/catch\s*\{\s*\}/)
      expect(body, `${name} does not report whether the write landed`).toMatch(/saveDurably\(/)
      expect(body, `${name} never branches on the outcome`).toMatch(/r\.kind === 'saved'/)
    }
  })

  it('🛑 the reason chip row survives a failed send, so the tap can be repeated', () => {
    const body = fn('sendReason')
    expect(body, 'the chip row is dismissed before the write lands, so a lost tap is invisible')
      .toMatch(/saveDurably\(/)
    expect(body).toMatch(/kind === 'saved'/)
  })

  it('🛑 the failure is on screen — both places the client can be waiting in', () => {
    // ⚠️ THE RENDER IS ASSERTED, NOT THE MENTION. `expect(PAGE).toMatch(/noteError/)` was my
    // first cut and it passes against `{false && noteError && (` — a guard that survives its
    // own defect. Both sites are named by their testid and by an UNCONDITIONAL binding.
    expect(PAGE, 'the reason prompt never shows that the tap was lost')
      .toMatch(/data-testid="reaction-not-saved"/)
    expect(PAGE, 'the note box never shows that the words were not saved')
      .toMatch(/data-testid="note-not-saved"/)
    const renders = PAGE.match(/\{noteError && \(/g) ?? []
    expect(renders, 'a render site was disabled or made conditional on something else')
      .toHaveLength(2)
  })

  it('P32 STANDS — the pass is not gated, delayed or undone by any of this', () => {
    const body = fn('pass')
    // The pass completes on its own route and clears the row; nothing about the note or the
    // chip is awaited inside it.
    expect(body).toMatch(/await api\.post\(`\/leads\/\$\{id\}\/pass`/)
    expect(body, 'the pass now waits on a calibration nicety').not.toMatch(/saveDurably/)
    // And the chip row is still skippable by ignoring it.
    expect(PAGE).toMatch(/Skip/)
  })
})
