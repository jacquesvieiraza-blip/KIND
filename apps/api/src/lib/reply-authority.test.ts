// ═══════════════════════════════════════════════════════════════════════════════════════
// EVERY REPLY-SHAPED PATH, TRACED TO ITS SEND — the "human-only" claim, proved or withdrawn.
//
// 🛑 I ASSERTED THIS EXCEPTION BEFORE I HAD EARNED IT. Two returns ago I put replies outside the
// preparation freeze on the grounds that they are "a human answering a human", and the pass
// after it I had to admit I could not prove that. This file is the trace, and it found a real
// automated sender I had not classified at all.
//
// ── THE FOUR CLASSES (founder's own taxonomy) ───────────────────────────────────────────
//   A · HUMAN-MANUAL       — a human decides AND writes AND sends, at that moment.
//   B · AUTOMATED-DECISION — the system or a model decides whether, or what, to send.
//   C · AUTOMATED-EXECUTION— previously-authorised work dispatched with no human click now.
//   D · NON-SENDING        — classification or state mutation only.
//
// ⚠️ AND THE RULE THAT MATTERS: **no AI or system-generated outbound may inherit the human-reply
// exception.** A is allowed outside the sequence freeze; B and C need their own explicit,
// appropriate authority — which is not always the PROGRAMME's authority, because a message that
// belongs to no programme cannot sensibly be gated on approval, Payment 2 and LIVE.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

vi.hoisted(() => {
  process.env.SUPABASE_URL ??= 'http://localhost:54321'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  process.env.SUPABASE_ANON_KEY ??= 'test-anon-key'
})

const code = (f: string) => readFileSync(join(__dirname, f), 'utf8')
  .split('\n').filter(l => { const t = l.trim(); return t && !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') }).join('\n')

const MANUAL = code('./manual-reply.ts')
const AUTH = code('./programme-authority.ts')
const FIG = code('./figsy.ts')
const FOUNDER = code('../routes/founder.ts')

// ── A · HUMAN-MANUAL ─────────────────────────────────────────────────────────────────

describe('A · the manual reply is genuinely human — decided, written and sent by a person', () => {
  it('🛑 it has exactly two callers, and both are HTTP routes carrying a typed body', () => {
    const figRoute = code('../routes/figsy.ts')
    const opRoute = code('../routes/operator.ts')
    // The content is `req.body` — what a human typed — not anything generated.
    expect(figRoute).toContain('sendManualReply(req.params.id, clientId, replyBody)')
    expect(opRoute).toContain('sendManualReply(req.params.id, client.id, body.trim().slice(0, 5000))')
    // ⚠️ AND NOTHING ELSE CALLS IT. A cron or a queue calling this would make the "human"
    // premise false while every assertion above stayed true.
    const callers = ['./figsy.ts', './send-due.ts', './programme-preparation.ts', './start-work.ts',
                     './smartlead-inbound.ts', './instantly-push.ts', './linkedin.ts']
    for (const f of callers) {
      let src: string
      try { src = code(f) } catch { continue }
      expect(src, `${f} calls sendManualReply — it is no longer a human-only path`)
        .not.toContain('sendManualReply(')
    }
  })

  it('🛑 pause, terminal and an unreadable model still bite on it', () => {
    // The exception forgives MONEY and APPROVAL — the two refusals whose cost falls on a
    // prospect left mid-conversation. It forgives nothing about safety.
    expect(MANUAL).toContain('checkReplyAuthority(clientId)')
    const at = AUTH.indexOf('const REPLY_FORGIVEN')
    const list = AUTH.slice(at, AUTH.indexOf('export function mayReplyToProspect'))
    for (const mustBite of ['programme_paused', 'programme_terminal', 'programme_unresolvable',
                            'preparation_changed', 'sender_unsafe', 'sequence_not_canonical']) {
      expect(list, `${mustBite} is forgiven for replies`).not.toContain(mustBite)
    }
    expect(AUTH).toContain("if (model.model === 'unreadable') return unresolvable(model.reason)")
  })

  it('🛑 and it still obeys the kill-switch, the blocklist, demo mode and the mailbox', () => {
    expect(MANUAL).toContain('isDemoClient(clientId)')
    expect(MANUAL).toContain("db.from('opt_out_blocklist')")
    expect(MANUAL).toContain('AUTO_OUTREACH_ENABLED')
    expect(MANUAL).toContain('resolveSendingInbox(clientId)')
  })

  it('the freeze exception is therefore correct FOR THIS PATH — and only this one', () => {
    // A reply exists only because outreach we WERE authorised to send arrived and a human
    // answered it. Refusing to answer because the sequence was later edited would leave a real
    // person mid-conversation with silence, which is worse than the risk it removes.
    expect(AUTH, 'the reply verdict now runs the outbound comparison, which would strand people')
      .toContain('export function mayReplyToProspect')
    const body = AUTH.slice(AUTH.indexOf('export function mayReplyToProspect'), AUTH.indexOf('export async function checkReplyAuthority'))
    expect(body).not.toContain('outreachStillMatchesApproval')
  })
})

// ── C · AUTOMATED-EXECUTION AFTER A REPLY ────────────────────────────────────────────

describe('C · what a reply CAUSES later is automated, and is fully governed', () => {
  it('🛑 the reply branch dispatches a later step with NO human click — and it is gated', () => {
    // `applyReplyBranching` can leave the enrolment due for the next step. That step is sent by
    // `sendSequenceEmailCore`, which is class C and asks the full OUTREACH question.
    expect(FIG).toContain("const verdict = await checkEnrollmentAuthority(enrollmentId, 'OUTREACH', lead.client_id ?? null,")
    // Approval, Payment 2, LIVE, the canonical sequence, sender safety, the approved-preparation
    // comparison and the send window — all of it, because it is a fresh outbound touch.
    expect(AUTH).toContain('outreachStillMatchesApproval(p, enrolVerdict, ctx)')
  })

  it('🛑 D · classification and branching themselves send nothing', () => {
    const at = FIG.indexOf('export async function applyReplyBranching')
    expect(at).toBeGreaterThan(-1)
    const body = FIG.slice(at, FIG.indexOf('\nexport ', at + 10))
    for (const banned of ['resend.emails.send', 'sendSequenceEmail', 'sendManualReply', 'sendAs(']) {
      expect(body, `the reply branch sends directly (${banned})`).not.toContain(banned)
    }
  })
})

// ── B · THE ONE I HAD NOT CLASSIFIED ─────────────────────────────────────────────────

describe('B · the founder-agent stack generates outbound with a model, and now has a floor', () => {
  it('🛑 THE DEFECT: a model decided whether to answer AND what to say, with no safety gate', () => {
    // `POST /founder/support/inbound` classifies an inbound email with Haiku, and if the model
    // says `can_auto_reply` it generates a reply and sends it. Somebody who told us to stop can
    // email hello@get-kind.com. Two sibling endpoints (CS follow-up, AE demo) do the same.
    expect(FOUNDER).toContain('classification.can_auto_reply && mayEmail.ok')
    expect(FOUNDER, 'the AI auto-reply can send to a suppressed person again')
      .toContain('const mayEmail = await agentMayEmail(from)')
  })

  it('🛑 all three agent senders pass through the same floor', () => {
    expect((FOUNDER.match(/await agentMayEmail\(/g) ?? []).length,
      'one of the three model-written senders bypasses the suppression floor').toBe(3)
    // ⚠️ AND IT FAILS CLOSED — an unreadable gate refuses rather than sending.
    expect(FOUNDER).toContain('the suppression gate could not be read')
  })

  it('the boundary is SUPPRESSION, not programme authority — and that is deliberate', () => {
    // These are K.I.N.D's own desk answering its own inbox: no programme, no campaign, no
    // sequence, no prospect. Approval, Payment 2 and LIVE have nothing to say about them, and
    // forcing them in would be cargo-culting the outbound fix onto unrelated mail.
    expect(FOUNDER).toContain("import('../lib/send-gate')")
    expect(FOUNDER).toContain('checkSendAllowed({ email, company: null, linkedin: null })')
    expect(FOUNDER, 'programme authority was bolted onto a path that has no programme')
      .not.toContain('checkProgrammeAuthority')
  })

  it('🛑 and a human still sees the email even when the agent is refused', () => {
    // The founder-forward is outside the auto-reply branch, so a suppressed sender is not
    // silently dropped — nobody answers them, and a person knows they wrote.
    expect(FOUNDER).toContain('The email is still forwarded to a human')
  })
})
