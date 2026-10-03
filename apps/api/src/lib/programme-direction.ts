// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (R195 ① ② · sequencing piece 3 — the founder's blueprint views 1, 3 and 4, option A).
//
// The founder: *"a client can describe what they trying to achieve. because a recurring client may
// have a different objective"* (R193 ②), then *"A A A A A"* (R195) and, for where it lives, *"A, go"*:
//
//   ① every programme starts with "What are you trying to achieve this time?" — required;
//   ② Milla drafts the DIRECTION from that goal and "Your business" (piece 2) — who, one problem,
//     impact, our answer, proof, ask — and the client approves it BEFORE paying and before any
//     email is written. Option A: on the Programme page, right before the pay button, which stays
//     locked until then. The same for a new client and a returning one.
//
// 🛑 THE PROOF LINE IS NEVER THE MODEL'S. It is set here from the client's own result, and only
// when they ticked "you may quote this" (R163); otherwise it says no result is quoted. The model
// drafts the other five parts from the client's facts and nothing else.
//
// 🛑 ONE DIRECTION PER PROGRAMME, FROZEN ONCE PAID FOR. A direction is attached to the programme
// at its first payment (client checkout, or internal authority in Vida — R194: same rule) and is
// never reused: the next programme starts from a new goal (blueprint view 9).
//
// ⚠️ NO MIGRATION. Stored in `figsy_knowledge` (kind `programme_direction`), versioned: every
// change is a new version, the old one kept in history, and a change reopens approval.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export const DIRECTION_KEYS = ['goal', 'who', 'problem', 'impact', 'answer', 'proof', 'ask'] as const
export type DirectionKey = typeof DIRECTION_KEYS[number]
export const DIRECTION_FIELD_MAX = 400
const KIND = 'programme_direction'
const HISTORY_KEEP = 30

export type Direction = Record<DirectionKey, string> & {
  version: number
  status: 'draft' | 'approved'
  /** The programme it was paid for. `null` until the first payment. */
  programme_id: string | null
  drafted_at: string
  approved_at: string | null
}
export type DirectionStore = { current: Direction | null; history: Direction[] }
type Rec = Record<string, unknown>
const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

// ── pure ────────────────────────────────────────────────────────────────────────────────

/** The model's five parts, or `null` when any is missing — a half direction is never shown. */
export function parseDirectionDraft(text: string): Pick<Direction, 'who' | 'problem' | 'impact' | 'answer' | 'ask'> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  let o: Rec
  try { o = JSON.parse(m[0]) as Rec } catch { return null }
  const out = {
    who: s(o.who).slice(0, DIRECTION_FIELD_MAX), problem: s(o.problem).slice(0, DIRECTION_FIELD_MAX),
    impact: s(o.impact).slice(0, DIRECTION_FIELD_MAX), answer: s(o.answer).slice(0, DIRECTION_FIELD_MAX),
    ask: s(o.ask).slice(0, DIRECTION_FIELD_MAX),
  }
  return Object.values(out).every(Boolean) ? out : null
}

/** 🛑 The proof line — ours, never the model's. A result only with the client's tick. */
export function proofLineFor(b: { result: string; resultMayQuote: boolean }): string {
  return b.result.trim() && b.resultMayQuote
    ? `Quote only this result, exactly as you gave it: “${b.result.trim()}”. No other result, number or customer is claimed.`
    : 'No result is quoted. We describe how it works from what you told us — never an invented result, number or customer.'
}

/** The direction for the programme being chosen now, or `null` when a new one is needed. */
export function usableDirection(current: Direction | null, open: { id: string; paid: boolean } | null): Direction | null {
  if (!current) return null
  if (!current.programme_id) return current
  return open && !open.paid && current.programme_id === open.id ? current : null
}

export function changeDirection(
  store: DirectionStore, change: { key: DirectionKey; value: string; baseVersion: number }, at: string,
): { ok: true; data: DirectionStore } | { ok: false; reason: 'stale' | 'none' } {
  const cur = store.current
  if (!cur) return { ok: false, reason: 'none' }
  if (cur.version !== change.baseVersion) return { ok: false, reason: 'stale' }
  const next: Direction = {
    ...cur, [change.key]: change.value.slice(0, DIRECTION_FIELD_MAX), version: cur.version + 1,
    status: 'draft', approved_at: null, drafted_at: at,
  }
  return { ok: true, data: { current: next, history: [...store.history, cur].slice(-HISTORY_KEEP) } }
}

export function approveDirectionPure(
  cur: Direction, baseVersion: number, at: string,
): { ok: true; direction: Direction } | { ok: false; reason: 'stale' | 'incomplete' } {
  if (cur.version !== baseVersion) return { ok: false, reason: 'stale' }
  if (DIRECTION_KEYS.some(k => !s(cur[k]))) return { ok: false, reason: 'incomplete' }
  return { ok: true, direction: { ...cur, status: 'approved', approved_at: at } }
}

/** What the email writer is given — said as the client's approval, every part. */
export function directionPromptBlock(d: Direction): string {
  return [
    'PROGRAMME DIRECTION — the client APPROVED this for this programme. Write every email to it; do not drift from it:',
    `- What they are trying to achieve: ${d.goal}`,
    `- Who it is for: ${d.who}`,
    `- The one problem to lead with: ${d.problem}`,
    `- What it costs them: ${d.impact}`,
    `- Our answer: ${d.answer}`,
    `- Proof: ${d.proof}`,
    `- The ask: ${d.ask}`,
  ].join('\n')
}

function asStore(data: Rec | null | undefined): DirectionStore {
  const d = (data ?? {}) as Rec
  return {
    current: (d.current && typeof d.current === 'object') ? d.current as Direction : null,
    history: Array.isArray(d.history) ? d.history as Direction[] : [],
  }
}

// ── storage ─────────────────────────────────────────────────────────────────────────────

/** A failed read THROWS — it is never "no direction", which would ask a paid client again. */
export async function readDirectionStore(clientId: string): Promise<DirectionStore> {
  const { data, error } = await db.from('figsy_knowledge')
    .select('data').eq('client_id', clientId).eq('kind', KIND).maybeSingle()
  if (error) throw new Error(error.message)
  return asStore((data as { data?: Rec } | null)?.data)
}

async function writeDirectionStore(clientId: string, store: DirectionStore): Promise<void> {
  const { error } = await db.from('figsy_knowledge').upsert(
    { client_id: clientId, kind: KIND, data: store, updated_at: new Date().toISOString() },
    { onConflict: 'client_id,kind' })
  if (error) throw new Error(error.message)
}

async function openUnpaid(clientId: string): Promise<{ id: string; paid: boolean } | null> {
  const { openProgrammeForClient, firstPaid, firstInternallyAuthorised } = await import('./programme')
  const p = await openProgrammeForClient(clientId)
  return p ? { id: p.id, paid: firstPaid(p) || firstInternallyAuthorised(p) } : null
}

export type DirectionView = {
  direction: Direction | null
  /** For a first programme: what they told Milla in the Brief. */
  suggestedGoal: string | null
  /** For a returning client: the last programme's goal, shown so they can say what is different. */
  lastGoal: string | null
}

export async function readDirectionView(clientId: string): Promise<DirectionView> {
  const store = await readDirectionStore(clientId)
  const direction = usableDirection(store.current, await openUnpaid(clientId))
  const used = [store.current, ...[...store.history].reverse()].filter((d): d is Direction => !!d && !!d.programme_id)
  const lastGoal = direction ? null : (used[0]?.goal ?? null)
  let suggestedGoal: string | null = null
  if (!direction && !used.length) {
    const { data, error } = await db.from('clients').select('outcome_stated').eq('id', clientId).maybeSingle()
    if (error) throw new Error(error.message)
    suggestedGoal = s((data as { outcome_stated?: string | null } | null)?.outcome_stated) || null
  }
  return { direction, suggestedGoal, lastGoal }
}

/** Milla's draft from the goal and "Your business". The model writes five parts; the proof is ours. */
export async function draftDirection(clientId: string, goalIn: string): Promise<Direction> {
  const goal = s(goalIn).slice(0, DIRECTION_FIELD_MAX)
  if (goal.length < 8) throw new DirectionError('goal_too_short', 'Tell Milla in a sentence what you want from this programme.')
  const { readBusiness } = await import('./client-business')
  const b = await readBusiness(clientId)
  const facts = [
    `What they sell: ${b.facts.sells || '(not told)'}`,
    `Core market: ${b.market || '(not told)'}`,
    `Who buys: ${b.buyers || '(not told)'}`,
    `Problems they solve: ${b.facts.problems || '(not told)'}`,
    `What those problems cost their customers: ${b.facts.impact || '(not told)'}`,
    `Their answer: ${b.facts.answer || '(not told)'}`,
    `Who is not a fit: ${b.facts.not_fit || '(not told)'}`,
  ].join('\n')
  const prompt = `PROGRAMME_DIRECTION_JSON — you are Milla, drafting the direction for ONE outreach programme.

The client's goal for this programme, in their words: "${goal}"

The client's business (the only facts you may use):
${facts}

Draft the direction for this programme:
- who: the narrow audience this programme is for, chosen from their market and buyers to fit the goal.
- problem: ONE problem to lead with, chosen from the problems they solve.
- impact: what that problem costs the audience, from what they told us. Plain, not dramatic.
- answer: their answer to that problem, in one sentence.
- ask: a small, specific meeting ask (for example "15 minutes to compare how they …").

Rules: use only the facts above. Never invent a result, number, percentage, customer or claim. Plain British English, one sentence each, no hype.
Return ONLY a JSON object with string keys who, problem, impact, answer, ask.`
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const { CONVERSATION_MODEL, AI_TURN_BOUND } = await import('./models')
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, ...AI_TURN_BOUND })
  let text = ''
  try {
    const r = await anthropic.messages.create({ model: CONVERSATION_MODEL, max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
    text = r.content.map(c => (c.type === 'text' ? c.text : '')).join('')
  } catch (e) {
    throw new DirectionError('model_unavailable', `Milla could not draft the direction just now (${e instanceof Error ? e.message : String(e)}).`)
  }
  const parts = parseDirectionDraft(text)
  if (!parts) throw new DirectionError('draft_unreadable', 'Milla could not draft a complete direction just now.')

  const store = await readDirectionStore(clientId)
  const all = [store.current, ...store.history].filter((d): d is Direction => !!d)
  const version = all.reduce((m, d) => Math.max(m, d.version), 0) + 1
  const at = new Date().toISOString()
  const next: Direction = {
    goal, ...parts, proof: proofLineFor({ result: b.facts.result, resultMayQuote: b.resultMayQuote }),
    version, status: 'draft', programme_id: null, drafted_at: at, approved_at: null,
  }
  await writeDirectionStore(clientId, {
    current: next,
    history: store.current ? [...store.history, store.current].slice(-HISTORY_KEEP) : store.history,
  })
  return next
}

export class DirectionError extends Error {
  constructor(public code: string, message: string) { super(message) }
}

/** A change from the chat. Only to the direction for the programme being chosen. */
export async function changeDirectionFor(
  clientId: string, change: { key: DirectionKey; value: string; baseVersion: number },
): Promise<{ ok: true; direction: Direction } | { ok: false; reason: 'stale' | 'none' }> {
  const store = await readDirectionStore(clientId)
  if (!usableDirection(store.current, await openUnpaid(clientId))) return { ok: false, reason: 'none' }
  const r = changeDirection(store, change, new Date().toISOString())
  if (!r.ok) return r
  await writeDirectionStore(clientId, r.data)
  return { ok: true, direction: r.data.current! }
}

export async function approveDirectionFor(
  clientId: string, baseVersion: number,
): Promise<{ ok: true; direction: Direction } | { ok: false; reason: 'stale' | 'incomplete' | 'none' }> {
  const store = await readDirectionStore(clientId)
  const cur = usableDirection(store.current, await openUnpaid(clientId))
  if (!cur) return { ok: false, reason: 'none' }
  const r = approveDirectionPure(cur, baseVersion, new Date().toISOString())
  if (!r.ok) return r
  await writeDirectionStore(clientId, { ...store, current: r.direction })
  return { ok: true, direction: r.direction }
}

/**
 * 🛑 THE PAYMENT GATE (client checkout and Vida's internal P1 alike — R194). The programme's first
 * payment needs an APPROVED direction; passing it attaches the direction to this programme, so it
 * is the one its emails are written from and is never reused for the next.
 */
export async function requireApprovedDirection(
  clientId: string, programmeId: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const store = await readDirectionStore(clientId)
  const cur = usableDirection(store.current, { id: programmeId, paid: false })
  if (!cur || cur.status !== 'approved') {
    return { ok: false, message: 'The direction for this programme has not been approved yet. Approve it with Milla on the Programme page first. Nothing has been charged.' }
  }
  if (cur.programme_id !== programmeId) await writeDirectionStore(clientId, { ...store, current: { ...cur, programme_id: programmeId } })
  return { ok: true }
}

/**
 * The approved direction THIS programme was paid for, as the writer's block. `null` = the
 * programme has none (every programme paid before 3 Oct, House's current one included). A failed
 * read THROWS, so the writer stops rather than writing without the client's approved direction.
 */
export async function approvedDirectionFor(programmeId: string, clientId: string): Promise<string | null> {
  const store = await readDirectionStore(clientId)
  // Newest first: the version approved last for this programme is the one that was paid for.
  const d = [store.current, ...[...store.history].reverse()].find(x => !!x && x.programme_id === programmeId && x.status === 'approved')
  return d ? directionPromptBlock(d) : null
}
