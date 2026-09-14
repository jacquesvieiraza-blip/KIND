// ═══════════════════════════════════════════════════════════════════════════════════════
// VIDA IS A COLLEAGUE THE OPERATOR TALKS TO. (R121, BUILD 3.)
//
// ── WHAT SHE WAS ───────────────────────────────────────────────────────────────────────
//
// 🛑 "ASK VIDA ANYTHING" WAS NOT AI. `POST /operator/command` was five regular expressions
// over the lowercased text — /(block|stuck|waiting…)/, /(status|how.*going…)/,
// /(source|find|pull)/, /(sequence|email|copy)/, /(icp|target|who)/ — and a sixth branch that
// said "I'm not sure what you're asking me to do with that. …try 'status' or
// 'what's blocking?'". An operator who typed anything a human would type met that sentence.
// A second regex in the browser caught "source N leads" before the server ever saw it.
//
// She also knew nothing. The one model she DID have — the ICP builder — was given three
// profile fields and a JSON blob, and never the client's own words, though Milla had been
// storing them all along.
//
// ── WHAT SHE IS ────────────────────────────────────────────────────────────────────────
//
// A conversation, on the conversational model, with the client's canonical truth in front of
// her: who they are, where they are in the lifecycle, what is blocking, what they told Milla
// IN THEIR OWN WORDS, what they have asked us recently, and what their targeting says today.
//
// 🛑 AND THE AUTHORITY LINE IS THE POINT OF THE DESIGN. She may UNDERSTAND anything. She may
// only ACT through doors that already exist, with the confirms and gates they already have.
// Her tools PROPOSE; the operator presses the button. Sourcing spends money, a saved ICP
// changes who gets contacted, a message to a client is a message from us — none of those may
// happen because a model decided they should. Nothing in this file executes anything.
//
// ⚠️ PURE, AND DELIBERATELY SO. No database, no request, no clock. The route gathers the
// context and performs the call; everything here is the prompt, the tools and how a proposal
// is read back — which is what lets the live eval drive the real prompt without a server.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The workspaces the console can open. Mirrors `COCKPIT_TABS` in the admin app. */
export const VIDA_TABS = [
  'Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence', 'Asks', 'Bookings',
  'Programme', 'Pool', 'Exceptions',
] as const

export interface VidaContext {
  /** Who she is working on. Resolved SERVER-side; the model never supplies a client id. */
  clientName: string
  clientId: string
  /** The operator she is speaking to, as the proxy verified them. */
  operator: string
  /** Where the client is, as the console computes it. */
  lifecycle?: { step?: number | null; label?: string | null; mode?: string | null } | null
  pipeline?: Record<string, number> | null
  blockers?: Record<string, number> | null
  outreachEnabled?: boolean | null
  programme?: string | null
  /** The eleven canonical Brief facts, as the client gave them. */
  brief?: Record<string, unknown> | null
  briefProgress?: { count: number; total: number; missing: string[] } | null
  /** The client's own words to Milla — the thing Vida could never see. */
  briefTranscript?: Array<{ role: string; content: string }> | null
  /** What the client has said in their Milla thread recently. */
  clientMessages?: Array<{ role: string; content: string }> | null
  /** Their live targeting. */
  icp?: Record<string, unknown> | null
}

const line = (label: string, v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.length ? `  · ${label}: ${v.join(', ')}\n` : ''
  const s = String(v).trim()
  return s ? `  · ${label}: ${s}\n` : ''
}

const BRIEF_LABELS: Array<[string, string]> = [
  ['contact_name', 'Who we speak to'],
  ['company_name', 'Company'],
  ['website', 'Website'],
  ['what_they_do', 'What they do'],
  ['target_category', 'Who they want to reach (their words)'],
  ['target_company_type', 'What type of organisation those are'],
  ['geographies', 'Target markets'],
  ['company_sizes', 'Target company sizes'],
  ['job_titles', 'Target roles'],
  ['seniority_levels', 'Target seniority'],
  ['exclusions', 'Who they do NOT want'],
  ['desired_outcome', 'What they want out of this'],
  ['country', 'Where THEIR business is based'],
]

/**
 * 🛑 EVERYTHING SHE KNOWS, ASSEMBLED ONCE.
 *
 * ⚠️ ABSENT IS SAID OUT LOUD, NEVER LEFT BLANK. A section that simply does not appear reads,
 * to a model, as "there is nothing there" — so a client with no Brief and a client whose
 * Brief we could not READ would look identical to her, and she would tell the operator the
 * second one had told us nothing. Every block that could not be loaded says so.
 */
export function buildVidaSystem(ctx: VidaContext): string {
  const brief = ctx.brief ?? null
  const briefBlock = brief
    ? BRIEF_LABELS.map(([k, label]) => line(label, brief[k])).join('') || '  (nothing recorded yet)\n'
    : '  (their Brief could not be read — do not tell the operator it is empty, tell them it could not be read)\n'

  const transcript = (ctx.briefTranscript ?? []).slice(-12)
  const transcriptBlock = transcript.length
    ? transcript.map(t => `  ${t.role === 'user' ? 'CLIENT' : 'MILLA'}: ${String(t.content).slice(0, 600)}`).join('\n')
    : '  (no stored conversation — they may have signed up before we kept one)'

  const recent = (ctx.clientMessages ?? []).slice(-8)
  const recentBlock = recent.length
    ? recent.map(m => `  ${m.role === 'user' ? 'CLIENT' : 'US'}: ${String(m.content).slice(0, 400)}`).join('\n')
    : '  (nothing recent)'

  const icp = ctx.icp ?? null
  const icpBlock = icp
    ? ['name', 'industries', 'job_titles', 'seniority_levels', 'company_sizes', 'geographies', 'tech_stack', 'keywords']
        .map(k => line(k, icp[k])).join('') || '  (an ICP exists but carries no targeting)\n'
    : '  (no active ICP yet)\n'

  return `You are Vida, the K.I.N.D operator's colleague. You are talking to ${ctx.operator}, who works here — NOT to the client.

Everything in this conversation is about ONE client: ${ctx.clientName}. You cannot see any other client and must never answer about one.

── HOW YOU TALK ────────────────────────────────────────────────────────────────────────
Like a capable colleague who already knows this account. Plain sentences, 2–4 of them unless
they ask for more. No headings, no bullet lists unless they genuinely help, no markdown
tables. They are working, not reading a report.

Answer what they actually asked. If they ask something you cannot see, say so plainly rather
than guessing — "I can't see their sequence from here" is a useful answer and an invented one
is worse than nothing.

⚠️ NEVER INVENT A NUMBER, A DATE, A NAME OR A STATE. Everything factual you say must come
from what is written below or from what the operator told you in this conversation.

── WHAT YOU CAN AND CANNOT DO ──────────────────────────────────────────────────────────
🛑 YOU PROPOSE. THE OPERATOR PRESSES THE BUTTON. Sourcing spends real money, a saved ICP
changes who gets contacted, and a message to a client is a message from K.I.N.D — so when
they ask you to do one of those, you call the matching tool and the console shows it to them
to confirm. Say what you are proposing in your reply, naturally; do not describe the tool.

You have NO power to send email, charge anything, activate a campaign, press GO, or change
the kill-switch, and you must never imply otherwise.

── WHO THIS CLIENT IS ──────────────────────────────────────────────────────────────────
  · Client: ${ctx.clientName}
${ctx.lifecycle?.label ? `  · Stage: ${ctx.lifecycle.label}${ctx.lifecycle.mode ? ` (${ctx.lifecycle.mode})` : ''}\n` : ''}${ctx.programme ? `  · Programme: ${ctx.programme}\n` : ''}${ctx.outreachEnabled === false ? '  · ⚠️ SENDING IS OFF — the kill-switch is on. Nothing is going out for anybody.\n' : ''}
── WHAT THE CLIENT TOLD MILLA (their Brief — their own words) ──────────────────────────
${briefBlock}${ctx.briefProgress ? `  (${ctx.briefProgress.count} of ${ctx.briefProgress.total} understood${ctx.briefProgress.missing.length ? `; still missing: ${ctx.briefProgress.missing.join(', ')}` : ''})\n` : ''}
── HOW THEY SAID IT (the last of their onboarding conversation) ────────────────────────
${transcriptBlock}

── THEIR LIVE TARGETING ────────────────────────────────────────────────────────────────
${icpBlock}
── THEIR PIPELINE RIGHT NOW ────────────────────────────────────────────────────────────
${ctx.pipeline ? Object.entries(ctx.pipeline).map(([k, v]) => `  · ${k}: ${v}`).join('\n') : '  (could not be read)'}

── WHAT IS BLOCKING ────────────────────────────────────────────────────────────────────
${ctx.blockers ? Object.entries(ctx.blockers).map(([k, v]) => `  · ${k}: ${v}`).join('\n') : '  (could not be read)'}

── WHAT THEY HAVE SAID TO US LATELY ────────────────────────────────────────────────────
${recentBlock}
`
}

/**
 * 🛑 HER TOOLS PROPOSE. NOT ONE OF THEM EXECUTES.
 *
 * ⚠️ EACH ONE LANDS ON A DOOR THAT ALREADY EXISTS, with the confirm and the gates it already
 * had: sourcing goes through the preview and the operator's "Run it"; an ICP goes to the
 * editor the operator saves themselves; an ask goes through `POST /operator/ask` into the
 * client's Milla thread. Adding a tool that WRITES would be granting a model authority the
 * founder gave to a person.
 *
 * ⚠️ AND NO TOOL TAKES A CLIENT ID. The client is resolved server-side from the operator's
 * selection; a model that could name a client could name the wrong one.
 */
export const VIDA_TOOLS = [
  {
    name: 'propose_sourcing',
    description: "Propose sourcing a batch of new leads for this client. Use when the operator asks to source, find, pull or get leads. The console shows them a preview with the real cost and they confirm it — you are not starting anything.",
    input_schema: {
      type: 'object' as const,
      properties: {
        count: { type: 'number', description: 'How many leads. Default 20 if they did not say.' },
        why: { type: 'string', maxLength: 300, description: 'One short line on why now, in your own words.' },
      },
      required: ['count'],
    },
  },
  {
    name: 'propose_icp_change',
    description: "Propose a change to this client's targeting. Use when the operator describes who to reach, or asks to add, remove or broaden something. Send the WHOLE profile as it should end up — start from their current targeting above and change only what they asked for. The operator reviews and saves it; nothing you send here is stored.",
    input_schema: {
      type: 'object' as const,
      properties: {
        name:             { type: 'string', maxLength: 120 },
        industries:       { type: 'array', maxItems: 6,  items: { type: 'string', maxLength: 80 } },
        job_titles:       { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 80 } },
        seniority_levels: { type: 'array', maxItems: 6,  items: { type: 'string', maxLength: 40 } },
        company_sizes:    { type: 'array', maxItems: 6,  items: { type: 'string', maxLength: 40 } },
        geographies:      { type: 'array', maxItems: 8,  items: { type: 'string', maxLength: 80 } },
        tech_stack:       { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 80 } },
        keywords:         { type: 'array', maxItems: 10, items: { type: 'string', maxLength: 80 } },
      },
    },
  },
  {
    name: 'draft_client_ask',
    description: "Draft a message to send to the client in their own Milla thread. Use when the operator wants to ask them for something or tell them something. Write it as K.I.N.D would say it to a client — warm, short, specific, never a list of field names. The operator reads it and sends it.",
    input_schema: {
      type: 'object' as const,
      properties: {
        message: { type: 'string', maxLength: 1200, description: 'The message, in full, ready to send.' },
      },
      required: ['message'],
    },
  },
  {
    name: 'open_workspace',
    description: 'Open one of the operator work areas for this client, when that is genuinely where they need to be.',
    input_schema: {
      type: 'object' as const,
      properties: {
        tab: { type: 'string', enum: [...VIDA_TABS] },
      },
      required: ['tab'],
    },
  },
] as const

export type VidaProposalKind = (typeof VIDA_TOOLS)[number]['name']

export interface VidaProposal {
  kind: VidaProposalKind
  input: Record<string, unknown>
}

/**
 * 🛑 READ A PROPOSAL, AND REFUSE ANYTHING THAT IS NOT ONE.
 *
 * ⚠️ THE NAME IS CHECKED AGAINST THE LIST, not merely present. A tool name we do not know is
 * a model inventing an action, and the honest answer to that is to carry none — the operator
 * gets her sentence and no button, rather than a button nobody designed.
 */
export function readVidaProposal(name: unknown, input: unknown): VidaProposal | null {
  const known = VIDA_TOOLS.map(t => t.name) as readonly string[]
  if (typeof name !== 'string' || !known.includes(name)) return null
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  return { kind: name as VidaProposalKind, input: input as Record<string, unknown> }
}

/** A sourcing count the operator could actually confirm: bounded, whole, never zero. */
export function boundedSourcingCount(v: unknown): number {
  const n = Math.floor(Number(v))
  if (!Number.isFinite(n) || n <= 0) return 20
  return Math.max(1, Math.min(200, n))
}
