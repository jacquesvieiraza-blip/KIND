/**
 * Founder Agent Stack — support, CS, and AE agents running KIND's own business
 * Protected by ADMIN_SECRET_KEY header.
 *
 * POST /founder/support/inbound    — triage inbound email to hello@get-kind.com
 * POST /founder/cs/followup        — send CS onboarding follow-up to a client
 * POST /founder/ae/demo-request    — draft and send AE demo booking email
 * GET  /founder/digest             — agent activity summary for admin dashboard
 */

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { db } from '@kind/db'
import Anthropic from '@anthropic-ai/sdk'
import { Resend } from 'resend'
import { computeChurnRisk } from './internal'
import { suggestWinBack, adminKeyValid } from './admin'
import { interpretSend } from '../lib/resend-checked'
import { BACKGROUND_MODEL } from '../lib/models'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const resend    = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
const FROM      = 'K.I.N.D <hello@get-kind.com>'
const FOUNDER   = process.env.FOUNDER_EMAIL || 'hello@get-kind.com'

export const founderRouter = Router()

function requireAdminKey(req: Request, res: Response, next: () => void) {
  // #402 (AR-65) — constant-time compare (avoids the char-by-char timing side-channel).
  if (!adminKeyValid(req.headers['x-admin-key'])) {
    res.status(401).json({ success: false, error: 'Unauthorized' })
    return
  }
  next()
}

founderRouter.use(requireAdminKey)

/**
 * ── ⚑ 8 Sep — NO AI-GENERATED OUTBOUND LEAVES WITHOUT THE SUPPRESSION FLOOR ─────────────
 *
 * 🛑 FOUND WHILE TRACING REPLY AUTHORITY TO COMPLETION (founder-ordered). Three agents in this
 * file generate a message with a model and send it: the support auto-reply, the CS follow-up
 * and the AE demo email. None of them asked ANY safety question. The support one is the sharpest
 * case — somebody who told us to stop can email `hello@get-kind.com`, and a model decides on its
 * own whether to answer them and what to say.
 *
 * ⚠️ PROGRAMME AUTHORITY WOULD BE THE WRONG BOUNDARY HERE, and forcing it would be cargo-culting
 * the fix from the outbound package. These messages are not programme delivery: there is no
 * programme, no campaign, no sequence and no prospect — they are K.I.N.D's own desk answering
 * its own inbox. Approval, Payment 2 and LIVE have nothing to say about them.
 *
 * ⚠️ THE CORRECT MINIMAL BOUNDARY IS SUPPRESSION. The do-not-contact floor and the cross-client
 * opt-out blocklist are about the PERSON, not about the work — which is exactly why they apply
 * to a support reply as much as to a cold email. `checkSendAllowed` is the existing shared gate
 * for that question, so this is one rulebook rather than a fourth copy.
 *
 * ⚠️ AND IT FAILS CLOSED. A refusal or an unreadable answer means the agent does not write and
 * does not send; the founder-forward below still runs, so a human sees the email either way.
 */
async function agentMayEmail(email: string): Promise<{ ok: true } | { ok: false; why: string }> {
  try {
    const { checkSendAllowed } = await import('../lib/send-gate')
    const verdict = await checkSendAllowed({ email, company: null, linkedin: null })
    if (verdict.allowed) return { ok: true }
    return { ok: false, why: verdict.message ?? verdict.reason ?? 'refused' }
  } catch (err) {
    return { ok: false, why: `the suppression gate could not be read (${err instanceof Error ? err.message : String(err)})` }
  }
}

// ── SUPPORT TRIAGE ─────────────────────────────────────────────────────────────
founderRouter.post('/support/inbound', async (req: Request, res: Response) => {
  try {
    const { from, subject, body } = z.object({
      from:    z.string().email(),
      subject: z.string().default(''),
      body:    z.string().min(1),
    }).parse(req.body)

    // Classify the email
    const classifyRes = await anthropic.messages.create({
      model:      BACKGROUND_MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Classify this inbound support email for K.I.N.D (a B2B AI lead gen platform).
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 1000)}

Respond with JSON only: { "category": "billing|technical|sales|general", "urgency": "low|medium|high", "can_auto_reply": true|false, "summary": "one sentence" }`,
      }],
    })

    let classification = { category: 'general', urgency: 'low', can_auto_reply: false, summary: '' }
    try {
      const text = (classifyRes.content[0] as { type: string; text: string }).text
      classification = JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {}

    // Log the inbound email
    await Promise.resolve(db.from('founder_agent_logs').insert({
      agent:   'support',
      action:  'inbound_email',
      payload: { from, subject, body: body.slice(0, 500), classification },
    })).catch(() => {})

    let autoReplied = false

    // 🛑 THE MODEL DECIDES WHETHER TO ANSWER; IT DOES NOT DECIDE WHETHER WE MAY.
    const mayEmail = await agentMayEmail(from)
    if (classification.can_auto_reply && !mayEmail.ok) {
      console.warn(`[founder-agent] support auto-reply to ${from} SUPPRESSED — ${mayEmail.why}. The email is still forwarded to a human.`)
    }
    if (classification.can_auto_reply && mayEmail.ok) {
      const replyRes = await anthropic.messages.create({
        model:      BACKGROUND_MODEL,
        max_tokens: 400,
        system: `You are K.I.N.D support. K.I.N.D is a B2B AI platform for lead generation and automated outreach (FIGSY). You answer support emails on behalf of the K.I.N.D team. Be helpful, warm, and concise. Sign off as "The K.I.N.D Team".`,
        messages: [{
          role: 'user',
          content: `Reply to this support email:
From: ${from}
Subject: ${subject}
Body: ${body.slice(0, 1000)}

Write a helpful reply. Do not include the subject line.`,
        }],
      })
      const replyText = (replyRes.content[0] as { type: string; text: string }).text

      if (resend) {
        // #377 (AR-40) — only treat this as auto-replied when the send ACTUALLY left.
        // Resend returns { error } instead of throwing; the old code set autoReplied=true
        // unconditionally, so a failed auto-reply then SUPPRESSED the founder-forward
        // below → the support email was answered by nobody and seen by nobody.
        const replyResult = await resend.emails.send({
          from: FROM, to: [from], subject: `Re: ${subject}`,
          text: replyText,
        })
        const replyChecked = interpretSend(replyResult)
        if (replyChecked.ok) autoReplied = true
        else console.error('[founder/support] auto-reply send FAILED — forwarding to founder instead', replyChecked.error)
      }
    }

    // Always forward to founder for awareness (non-auto or high urgency). Because
    // autoReplied is now only true on a real send, a failed auto-reply falls through here.
    if (!autoReplied || classification.urgency === 'high') {
      if (resend) {
        await resend.emails.send({
          from, to: [FOUNDER],
          subject: `[Support ${classification.urgency.toUpperCase()}] ${subject}`,
          text: `From: ${from}\nCategory: ${classification.category}\nUrgency: ${classification.urgency}\nAuto-replied: ${autoReplied}\nSummary: ${classification.summary}\n\n---\n${body}`,
        })
      }
    }

    res.json({ success: true, data: { classification, auto_replied: autoReplied } })
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ success: false, error: err.errors }); return }
    console.error('[founder/support]', err)
    res.status(500).json({ success: false, error: 'Failed to process support email' })
  }
})

// ── ⛓️ 29 Sep (R174 ② · 1b) — ~~CS ONBOARDING FOLLOW-UP · AE DEMO REQUEST~~ ─────────────────
// Two routes stood here: `POST /cs/followup` wrote a Day 1/3/7 onboarding email with a model
// (self-serve advice: "build their ICP, run it to get leads") and sent it to a REAL client;
// `POST /ae/demo-request` wrote a demo invite and sent it to ANY address given. The Founder page
// fired both in one click, no preview. Founder ruling (R174): removed. Following up a client is
// Vida → the client → Asks (it lands in their Milla thread); inviting a prospect is the
// founder's own mail. The signup no longer calls either (see routes/auth.ts, C22).

// ── FOUNDER DIGEST ────────────────────────────────────────────────────────────
founderRouter.get('/digest', async (_req: Request, res: Response) => {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

    const [logsRes, clientsRes, leadsRes] = await Promise.all([
      db.from('founder_agent_logs')
        .select('*').gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false }).limit(50),
      db.from('clients').select('id', { count: 'exact', head: true }),
      db.from('leads').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo),
    ])

    const logs = logsRes.data ?? []
    const supportCount  = logs.filter((l: any) => l.agent === 'support').length
    const csCount       = logs.filter((l: any) => l.agent === 'cs').length
    const aeCount       = logs.filter((l: any) => l.agent === 'ae').length

    res.json({
      success: true,
      data: {
        total_clients:      clientsRes.count ?? 0,
        new_leads_7d:       leadsRes.count ?? 0,
        agent_actions_7d:   { support: supportCount, cs: csCount, ae: aeCount },
        recent_logs:        logs.slice(0, 20),
      },
    })
  } catch (err) {
    console.error('[founder/digest]', err)
    res.status(500).json({ success: false, error: 'Failed to get digest' })
  }
})

/**
 * POST /founder/nora — NORA (The Keeper), the admin co-pilot (#275).
 * All-round admin assistant, context-aware to the current admin screen.
 * Admin-key gated (via the router-level requireAdminKey). Called by the admin
 * app at /api/proxy/founder/nora.
 */
founderRouter.post('/nora', async (req: Request, res: Response) => {
  try {
    const { messages, screen } = z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })).min(1).max(20),
      screen: z.string().max(60).optional(),
    }).parse(req.body)

    // #293 — at-risk SAVE PLAYBOOK, folded into Nora. When the founder asks about
    // churn / retention / saving a client, give Nora the LIVE at-risk list (churn
    // engine) + the per-client save action (suggestWinBack, the same logic behind
    // /admin/win-back) so she guides the save with real clients — not generic advice.
    const lastUser = (messages[messages.length - 1]?.content || '').toLowerCase()
    const wantsRetention = /churn|at.?risk|at risk|retention|retain|save|saving|win.?back|winback|cancel|leaving|lapse|renew|disengag/.test(lastUser)
    let retentionContext = ''
    if (wantsRetention) {
      try {
        const atRisk = await computeChurnRisk()
        if (atRisk.length > 0) {
          const top = [...atRisk].sort((a, b) => b.churn_score - a.churn_score).slice(0, 8)
          retentionContext = `\n\nLIVE AT-RISK CLIENTS — churn engine, highest score first. Answer with THESE exact clients + their SAVE PLAY; never invent clients or numbers beyond this list:\n` +
            top.map(c => `• ${c.company_name} (churn score ${c.churn_score}) — signals: ${c.reasons.join(', ') || 'general disengagement'} → SAVE PLAY: ${suggestWinBack(c.reasons)}`).join('\n') +
            `\n(${atRisk.length} at-risk in total.)`
        } else {
          retentionContext = `\n\nLIVE: the churn engine shows NO clients at risk right now — reassure the founder and suggest a light proactive check-in cadence.`
        }
      } catch { /* fall back to generic guidance if the churn engine is unavailable */ }
    }

    const system = `You are Nora — "The Keeper" — the admin co-pilot inside the K.I.N.D Admin Centre.
K.I.N.D is a B2B AI outbound platform (finds leads, scores, enriches, sends cold email sequences via FIGSY; clients pay per credit).
You are all-round: you help the founder run the business — clients, revenue, pipeline, deliverability, partners, team, ops, security.
Persona: tidy, secure, in control. Warm but concise. You are founder-facing (internal), not a client agent.
The founder is currently on the "${screen || 'Cockpit'}" screen — bias your answer to that context.
Rules: be brief and practical (a few sentences or a short list). If you don't have live data, say what you'd check and where. Never invent specific numbers. Suggest the next concrete action.${retentionContext ? '\nWhen LIVE AT-RISK CLIENTS are listed below, this IS the retention playbook (#293): name the specific clients, cite their provided churn scores, and give each one its SAVE PLAY as the next action.' : ''}${retentionContext}`

    const response = await anthropic.messages.create({
      model:      BACKGROUND_MODEL,
      max_tokens: 600,
      system,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    })
    const reply = response.content
      .map(b => (b.type === 'text' ? b.text : ''))
      .join('\n').trim() || 'Sorry — I could not compose a reply just now.'

    await Promise.resolve(db.from('founder_agent_logs').insert({
      agent:   'nora',
      action:  'admin_chat',
      payload: { screen: screen || null, last_user: messages[messages.length - 1]?.content?.slice(0, 300) },
    })).catch(() => {})

    res.json({ success: true, data: { reply } })
  } catch (err) {
    console.error('[founder/nora]', err)
    res.status(500).json({ success: false, error: 'Nora is unavailable right now.' })
  }
})
