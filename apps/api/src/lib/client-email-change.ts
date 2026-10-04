// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 3 Oct (R195 ③ · sequencing piece 6 — the founder's blueprint view 7).
//
// R195 ③, the founder's "A": *the client may change email wording; every change comes back to the
// founder first, then to the client; the client never changes timing.* And R196: the change is made
// by TALKING TO MILLA in the middle column — never typed into the right panel.
//
// So: the client tells Milla what should change in ONE email. Milla rewrites that email only —
// same job, same timing, same sign-off, the same writing rules every sequence passes — and it
// becomes a NEW VERSION through the one rewrite door (`rewriteProgrammeMessages`), which updates
// every prepared person and re-freezes. A new version has a new hash, so the founder's approval
// does not cover it (`founderWordingApproved` is per hash) and the client cannot approve it until
// he has — founder first, then client, by construction.
//
// ⚠️ ONLY BEFORE APPROVAL (READY_FOR_APPROVAL, not approved, not paused, nothing sent). A live
// programme's wording changes through Vida's "New version for approval" as today.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { db } from '@kind/db'

export type EmailChangeResult =
  | { ok: true; version: number | null; step: number }
  | { ok: false; code: 'not_found' | 'wrong_state' | 'stale' | 'refused' | 'unavailable'; message: string }

type Rec = Record<string, unknown>
const s = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** The model's rewritten email, or `null`. Pure. */
export function parseEmailRewrite(text: string): { subject: string; body: string } | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    const o = JSON.parse(m[0]) as Rec
    const subject = s(o.subject).slice(0, 200); const body = s(o.body).slice(0, 4000)
    return subject && body ? { subject, body } : null
  } catch { return null }
}

/** Replace ONE email's words; its job, timing and everything else stay. Pure. */
export function withEmailChanged<T extends { subject: string; body: string }>(steps: T[], step: number, next: { subject: string; body: string }): T[] {
  return steps.map((st, i) => (i === step - 1 ? { ...st, subject: next.subject, body: next.body } : st))
}

export async function changeEmailForClient(
  clientId: string, input: { step: number; instruction: string; version: string },
): Promise<EmailChangeResult> {
  const { openProgrammeForClient } = await import('./programme')
  const p = await openProgrammeForClient(clientId)
  if (!p) return { ok: false, code: 'not_found', message: 'There is no programme to change.' }
  const row = p as unknown as { id: string; status: string; approved_at: string | null; paused_at: string | null; review_preparation_hash?: string | null }
  if (row.status !== 'READY_FOR_APPROVAL' || row.approved_at || row.paused_at) {
    return { ok: false, code: 'wrong_state', message: 'Your emails can be changed with Milla while they are waiting for your approval.' }
  }
  if (!input.version || row.review_preparation_hash !== input.version) {
    return { ok: false, code: 'stale', message: 'Your emails changed since you opened them. Please look again and tell Milla what to change.' }
  }
  const { resolveProgrammeChain } = await import('./programme-chain')
  const chain = await resolveProgrammeChain(row.id)
  if (!chain.ok) return { ok: false, code: 'unavailable', message: 'Your emails could not be read just now. Please try again.' }
  const steps = chain.chain.steps
  const cur = steps[input.step - 1]
  if (!cur) return { ok: false, code: 'not_found', message: `There is no email ${input.step}.` }

  const { approvedDirectionFor } = await import('./programme-direction')
  const direction = await approvedDirectionFor(row.id, clientId)
  const prompt = `PROGRAMME_EMAIL_REWRITE_JSON — you are Milla, rewriting ONE email of a client's approved outreach because the client asked.

Email ${input.step} of ${steps.length}${cur.job ? ` — its one job: ${cur.job}` : ''}.
Subject now: ${cur.subject}
Body now:
${cur.body}

What the client asked: "${s(input.instruction).slice(0, 600)}"
${direction ? `\n${direction}\n` : ''}
Rules: change only what the client asked, keep this email's job, keep merge tokens such as {{first_name}} and {{company}} exactly, keep the opt-out line and the sign-off, plain short paragraphs, subject 4–6 words in sentence case. Never invent a result, number, percentage, customer or claim. Never add a link.
Return ONLY a JSON object with string keys subject and body.`
  let text: string
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const { CONVERSATION_MODEL, AI_TURN_BOUND } = await import('./models')
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, ...AI_TURN_BOUND })
    const r = await anthropic.messages.create({ model: CONVERSATION_MODEL, max_tokens: 1200, messages: [{ role: 'user', content: prompt }] })
    text = r.content.map(c => (c.type === 'text' ? c.text : '')).join('')
  } catch {
    return { ok: false, code: 'unavailable', message: 'Milla could not rewrite that email just now. Please try again in a moment.' }
  }
  const next = parseEmailRewrite(text)
  if (!next) return { ok: false, code: 'unavailable', message: 'Milla could not rewrite that email just now. Please try again in a moment.' }

  // The sign-off is guaranteed by code, as it is for every programme email.
  const { data: client, error: cErr } = await db.from('clients').select('company_name, signer_name').eq('id', clientId).maybeSingle()
  if (cErr) return { ok: false, code: 'unavailable', message: 'Your emails could not be changed just now. Please try again.' }
  const { isHouseClient, HOUSE_SIGN_OFF } = await import('./house-client')
  const c = (client ?? {}) as { company_name?: string | null; signer_name?: string | null }
  const signOff = (await isHouseClient(clientId)) ? HOUSE_SIGN_OFF : (s(c.signer_name) || s(c.company_name))
  const { ensureSignOff } = await import('./sequence-tokens')
  const changed = withEmailChanged(steps, input.step, { subject: next.subject, body: ensureSignOff(next.body, signOff) })

  // The same writing rules every programme sequence must pass.
  const { lintSequence } = await import('./sequence-quality')
  const { gapsBeforeEachStep } = await import('./sequence-templates')
  const quality = lintSequence(gapsBeforeEachStep(changed) as never)
  if (!quality.ok) {
    return { ok: false, code: 'refused', message: `Milla's rewrite did not pass the writing rules every email must pass, so nothing changed: ${quality.hardFails.slice(0, 2).map(v => v.why).join(' ')}` }
  }

  const { applyProgrammeSequence } = await import('./programme-sequence')
  const { rewriteProgrammeMessages } = await import('./programme-rewrite')
  const r = await rewriteProgrammeMessages(row.id, {
    writer: async () => {
      const applied = await applyProgrammeSequence(row.id, changed.map((st, i) => ({ ...st, step: i + 1 })) as never, 'Programme sequence')
      return applied.ok ? { ok: true as const, name: 'Programme sequence' } : { ok: false as const, reason: applied.reason }
    },
  })
  if (!r.ok) return { ok: false, code: 'refused', message: `Your change could not be made: ${r.reason}` }
  console.log(`[programme] client ${clientId} changed email ${input.step} of programme ${row.id} with Milla — new version ${r.version}, waiting for the founder's check first (R195 ③).`)
  return { ok: true, version: r.version ?? null, step: input.step }
}
