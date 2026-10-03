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

/**
 * ⚑ 3 Oct (sequencing piece 4 — the founder's blueprint view 5) — WHO THIS PROGRAMME IS FOR.
 * A NARROWER SLICE of the client's own targeting (My ICP): only values already in it, plus extra
 * exclusions. It is approved with the direction and applied to THIS programme's searches only —
 * the saved targeting is never changed (`applyAudienceSlice`, used by `runIcpJob`).
 */
export type Audience = {
  industries: string[]; company_sizes: string[]; job_titles: string[]
  /** Extra "leave out" for this programme, added to the targeting's own exclusions. */
  exclude: string
  /** Why this slice fits the goal, in one sentence. */
  reason: string
}
export type MasterTargeting = { industries: string[]; company_sizes: string[]; job_titles: string[] }

export type Direction = Record<DirectionKey, string> & {
  /** `undefined`/`null` on a direction drafted before piece 4 — no narrowing. */
  audience?: Audience | null
  /** ⚑ Piece 7 — the "Your business" version it was approved against (absent before piece 7). */
  business_version?: number
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

const list = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && !!x.trim()).map(x => x.trim()) : [])

/** Keep only values already in the client's targeting (their casing). Empty → the whole list: never narrower than nothing. */
function subsetOf(chosen: unknown, master: string[]): string[] {
  const byLower = new Map(master.map(m => [m.toLowerCase(), m]))
  const kept = [...new Set(list(chosen).map(c => byLower.get(c.toLowerCase())).filter((x): x is string => !!x))]
  return kept.length ? kept : [...master]
}

/** The model's audience, made safe: only the client's own values, short free text. Pure. */
export function cleanAudience(raw: unknown, master: MasterTargeting): Audience {
  const o = (raw ?? {}) as Rec
  return {
    industries: subsetOf(o.industries, master.industries),
    company_sizes: subsetOf(o.company_sizes, master.company_sizes),
    job_titles: subsetOf(o.job_titles, master.job_titles),
    exclude: s(o.exclude).slice(0, 300),
    reason: s(o.reason).slice(0, 300),
  }
}

/**
 * THIS programme's search: the targeting narrowed to the slice. Pure; the saved row is never
 * written from this. A list the slice would empty keeps the targeting's own (never widened, never
 * emptied); the exclusions are added to, never replaced.
 */
export function applyAudienceSlice<T extends Rec>(icp: T, a: Audience): T {
  const narrow = (own: unknown, slice: string[]): string[] => {
    const mine = list(own)
    if (!mine.length) return mine
    const keep = new Set(slice.map(x => x.toLowerCase()))
    const kept = mine.filter(x => keep.has(x.toLowerCase()))
    return kept.length ? kept : mine
  }
  const own = s(icp.exclusions)
  return {
    ...icp,
    industries: narrow(icp.industries, a.industries),
    company_sizes: narrow(icp.company_sizes, a.company_sizes),
    job_titles: narrow(icp.job_titles, a.job_titles),
    exclusions: [own, s(a.exclude)].filter(Boolean).join('; ') || (icp.exclusions ?? null),
  }
}

export function audienceLine(a: Audience): string {
  return [
    `industries ${a.industries.join(', ') || '(as targeted)'}`,
    `company size ${a.company_sizes.join(', ') || '(as targeted)'}`,
    `roles ${a.job_titles.join(', ') || '(as targeted)'}`,
    a.exclude ? `leaving out ${a.exclude}` : '',
  ].filter(Boolean).join(' · ')
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
    ...(d.audience ? [`- The audience for this programme: ${audienceLine(d.audience)}`] : []),
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

/** A real person Milla already found, shown against the audience (company and role only — no names). */
export type AudienceExample = { company: string; role: string; industry: string; fits: boolean }

/** Does this person fit the slice? Their role must match one of its roles. Pure. */
export function fitsAudience(role: string, a: Audience): boolean {
  const r = role.toLowerCase()
  return a.job_titles.some(t => r.includes(t.toLowerCase()) || t.toLowerCase().includes(r))
}

export type DirectionView = {
  direction: Direction | null
  /** Up to three of the people Milla already found, marked against the audience. */
  examples: AudienceExample[]
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
  let examples: AudienceExample[] = []
  if (direction?.audience) {
    const { data: leads, error: lErr } = await db.from('leads')
      .select('company, job_title, industry').eq('client_id', clientId).order('created_at', { ascending: false }).limit(40)
    if (lErr) throw new Error(lErr.message)
    const seen = new Set<string>()
    for (const l of (leads ?? []) as { company?: string | null; job_title?: string | null; industry?: string | null }[]) {
      const company = s(l.company); const role = s(l.job_title)
      if (!company || !role || seen.has(company.toLowerCase())) continue
      seen.add(company.toLowerCase())
      examples.push({ company, role, industry: s(l.industry), fits: fitsAudience(role, direction.audience) })
      if (examples.length === 3) break
    }
  }
  return { direction, examples, suggestedGoal, lastGoal }
}

/** The client's own targeting lists (the active ICP in My ICP). A failed read THROWS. */
export async function masterTargeting(clientId: string): Promise<MasterTargeting> {
  const { data, error } = await db.from('icps')
    .select('industries, company_sizes, job_titles').eq('client_id', clientId).eq('is_active', true)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  if (error) throw new Error(error.message)
  const r = (data ?? {}) as Rec
  return { industries: list(r.industries), company_sizes: list(r.company_sizes), job_titles: list(r.job_titles) }
}

async function askModel(prompt: string): Promise<string> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const { CONVERSATION_MODEL, AI_TURN_BOUND } = await import('./models')
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, ...AI_TURN_BOUND })
  try {
    const r = await anthropic.messages.create({ model: CONVERSATION_MODEL, max_tokens: 900, messages: [{ role: 'user', content: prompt }] })
    return r.content.map(c => (c.type === 'text' ? c.text : '')).join('')
  } catch (e) {
    throw new DirectionError('model_unavailable', `Milla could not draft this just now (${e instanceof Error ? e.message : String(e)}).`)
  }
}

const listsBlock = (m: MasterTargeting): string => [
  `Industries they target: ${m.industries.join(' | ') || '(none set)'}`,
  `Company sizes they target: ${m.company_sizes.join(' | ') || '(none set)'}`,
  `Job titles they target: ${m.job_titles.join(' | ') || '(none set)'}`,
].join('\n')

/** Milla's draft from the goal and "Your business". The model writes five parts; the proof is ours. */
export async function draftDirection(clientId: string, goalIn: string): Promise<Direction> {
  const goal = s(goalIn).slice(0, DIRECTION_FIELD_MAX)
  if (goal.length < 8) throw new DirectionError('goal_too_short', 'Tell Milla in a sentence what you want from this programme.')
  const { readBusiness } = await import('./client-business')
  const b = await readBusiness(clientId)
  const master = await masterTargeting(clientId)
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
- industries, company_sizes, job_titles: the narrower slice of their targeting this programme is for — arrays chosen ONLY from the values listed below, copied exactly. Choose fewer when the goal is narrower; never add a value that is not listed.
- exclude: anyone this programme should leave out that the goal implies (may be "").
- reason: one sentence on why this audience fits the goal.

Their targeting (choose only from these):
${listsBlock(master)}

Rules: use only the facts above. Never invent a result, number, percentage, customer or claim. Plain British English, one sentence each, no hype.
Return ONLY a JSON object with string keys who, problem, impact, answer, ask, exclude, reason and array keys industries, company_sizes, job_titles.`
  const text = await askModel(prompt)
  const parts = parseDirectionDraft(text)
  if (!parts) throw new DirectionError('draft_unreadable', 'Milla could not draft a complete direction just now.')

  const store = await readDirectionStore(clientId)
  const all = [store.current, ...store.history].filter((d): d is Direction => !!d)
  const version = all.reduce((m, d) => Math.max(m, d.version), 0) + 1
  const at = new Date().toISOString()
  const next: Direction = {
    goal, ...parts, proof: proofLineFor({ result: b.facts.result, resultMayQuote: b.resultMayQuote }),
    audience: cleanAudience(jsonOf(text), master),
    version, status: 'draft', programme_id: null, drafted_at: at, approved_at: null,
  }
  await writeDirectionStore(clientId, {
    current: next,
    history: store.current ? [...store.history, store.current].slice(-HISTORY_KEEP) : store.history,
  })
  return next
}

function jsonOf(text: string): Rec | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) as Rec } catch { return null }
}

/**
 * ⚑ Piece 4 — the client changes WHO this programme is for by telling Milla (R196: in the chat).
 * Milla re-draws the slice from their words, only from their own targeting; a new version that
 * waits for approval like any other change.
 */
export async function changeAudienceFor(
  clientId: string, instruction: string, baseVersion: number,
): Promise<{ ok: true; direction: Direction } | { ok: false; reason: 'stale' | 'none' }> {
  const store = await readDirectionStore(clientId)
  const cur = usableDirection(store.current, await openUnpaid(clientId))
  if (!cur) return { ok: false, reason: 'none' }
  if (cur.version !== baseVersion) return { ok: false, reason: 'stale' }
  const master = await masterTargeting(clientId)
  const now = cur.audience ?? cleanAudience(null, master)
  const text = await askModel(`PROGRAMME_AUDIENCE_JSON — you are Milla, changing who ONE outreach programme is for.

The programme's goal: "${cur.goal}"
The audience now: ${audienceLine(now)}
What the client asked: "${s(instruction).slice(0, 500)}"

Their targeting (choose only from these):
${listsBlock(master)}

Return ONLY a JSON object with array keys industries, company_sizes, job_titles (chosen ONLY from the values listed, copied exactly) and string keys exclude and reason, applying what the client asked.`)
  const o = jsonOf(text)
  if (!o) throw new DirectionError('draft_unreadable', 'Milla could not change the audience just now.')
  const at = new Date().toISOString()
  const next: Direction = { ...cur, audience: cleanAudience(o, master), version: cur.version + 1, status: 'draft', approved_at: null, drafted_at: at }
  await writeDirectionStore(clientId, { current: next, history: [...store.history, cur].slice(-HISTORY_KEEP) })
  return { ok: true, direction: next }
}

/** THIS programme's approved audience, or `null` (none approved, or drafted before piece 4). A failed read THROWS. */
export async function audienceSliceFor(programmeId: string, clientId: string): Promise<Audience | null> {
  const store = await readDirectionStore(clientId)
  const d = [store.current, ...[...store.history].reverse()].find(x => !!x && x.programme_id === programmeId && x.status === 'approved')
  return d?.audience ?? null
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
  // ⚑ Piece 7 — remember which "Your business" version this was approved against, so a later
  // programme can say "your profile unchanged" or "changed since" (blueprint view 9).
  const { readBusiness } = await import('./client-business')
  const approved: Direction = { ...r.direction, business_version: (await readBusiness(clientId)).version }
  await writeDirectionStore(clientId, { ...store, current: approved })
  return { ok: true, direction: approved }
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
