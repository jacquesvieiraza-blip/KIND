import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'
import { unscoredOnFailure } from './scoring-failure'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface IcpCriteria {
  job_titles:       string[]
  seniority_levels: string[]
  industries:       string[]
  company_sizes:    string[]
  geographies:      string[]
  keywords:         string[]
}

interface ScoreResult {
  id:        string
  score:     number
  reasoning: string
}

// Strip markdown code fences that Claude sometimes wraps JSON in
function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim()
}

// Parse Claude's JSON response safely — returns empty array on any failure
function parseScoringResponse(raw: string): ScoreResult[] {
  try {
    const cleaned = stripCodeFences(raw)
    const parsed  = JSON.parse(cleaned)
    if (!Array.isArray(parsed)) {
      console.error('[scoring] Claude returned non-array:', raw.slice(0, 200))
      return []
    }
    return parsed.filter((r): r is ScoreResult =>
      typeof r?.id === 'string' &&
      typeof r?.score === 'number' &&
      typeof r?.reasoning === 'string'
    )
  } catch (err) {
    console.error('[scoring] JSON parse failed:', err, '| raw:', raw.slice(0, 200))
    return []
  }
}

export async function scoreLeadsForIcp(
  leadIds: string[],
  icp: IcpCriteria,
  clientName: string,
  clientId?: string,   // #511t3 — enables the gated Nexus persona-boost (optional; omitted = today)
): Promise<void> {
  if (!leadIds.length) return

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[scoring] ANTHROPIC_API_KEY not set — skipping scoring, leads will stay as "pending"')
    return
  }

  // ── #511t3 NEXUS SOURCING TUNING (GATED — default-deny, money-sensitive) ──────────
  // Nudge scoring toward the persona THIS client actually BOOKS — but ONLY when the client's
  // auto-tune switch is ON and the confidence gate passes. Computed ONCE (not per batch). If
  // the gate isn't 'ready' (the default for every client), nexusBoost is '' → the prompt is
  // byte-identical to today, so which leads score high — and therefore what we spend PDL on —
  // is UNCHANGED until the founder explicitly enables this client. Fenced + best-effort.
  let nexusBoost = ''
  if (clientId) {
    try {
      const { getNexusProfile } = await import('./nexus')
      const { nexusTuneGate, nexusGlobalKill, assertSameClient } = await import('./nexus-guard')
      const prof = await getNexusProfile(clientId)
      assertSameClient(prof.client_id, clientId) // THE FENCE — never another client's brain
      const { data: flag } = await db.from('clients').select('nexus_autotune_enabled').eq('id', clientId).maybeSingle()
      const gate = nexusTuneGate(prof, flag?.nexus_autotune_enabled === true, nexusGlobalKill())
      const persona = [prof.top_persona.job_title, prof.top_persona.seniority, prof.top_persona.industry].filter(Boolean).join(' · ')
      if (gate.allowed && persona) {
        nexusBoost = `\n\nNexus signal (this client's OWN booked-meeting history): they convert best with ${persona}. All else equal, score leads matching that persona higher — but never override a clear ICP mismatch.`
      }
    } catch { /* best-effort — scoring proceeds exactly as today on any Nexus error */ }
  }

  // ── CALIBRATION v1 (P32) — WHAT THIS CLIENT HAS BEEN REJECTING ──────────────────────────
  //
  // Founder-ruled 21 Aug: *"FIGSY's scoring prompt receives the client's recent feedback as
  // context."* Structured codes only — free text never reaches the model, for the same reason
  // it never reaches the sourcing filter: he gated it, and a prompt IS an application.
  //
  // Fenced and best-effort like the Nexus block above: one client's rows, and any failure
  // leaves scoring byte-identical to today.
  let feedbackContext = ''
  if (clientId) {
    try {
      const { scoringFeedbackContext } = await import('./lead-feedback')
      const { data: fb } = await db.from('lead_feedback')
        .select('reason_code, leads!inner(company_size)')
        .eq('client_id', clientId).eq('action', 'pass')
        .order('created_at', { ascending: false }).limit(100)
      const line = scoringFeedbackContext((fb ?? []).map((r: Record<string, unknown>) => ({
        reason_code: r.reason_code as never,
        company_size: (r.leads as { company_size?: string | null } | null)?.company_size ?? null,
      })))
      if (line) feedbackContext = `\n\n${line}`
    } catch { /* best-effort — scoring proceeds exactly as today on any error */ }
  }

  const BATCH_SIZE = 10
  let alertedScoringFailure = false   // #358 — alert at most once per call, not per batch

  for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
    const batchIds = leadIds.slice(i, i + BATCH_SIZE)

    try {
      const { data: leads, error } = await db
        .from('leads')
        .select('id, first_name, last_name, job_title, company, industry, seniority, country')
        .in('id', batchIds)

      if (error) {
        console.error(`[scoring] batch ${Math.floor(i / BATCH_SIZE) + 1} — leads fetch error:`, error.message)
        continue
      }
      if (!leads?.length) continue

      const icpDescription = [
        `Job titles: ${icp.job_titles.join(', ') || 'any'}`,
        `Seniority levels: ${icp.seniority_levels.join(', ') || 'any'}`,
        `Industries: ${icp.industries.join(', ') || 'any'}`,
        `Company sizes: ${icp.company_sizes.join(', ') || 'any'}`,
        `Geographies: ${icp.geographies.join(', ') || 'any'}`,
        `Keywords: ${icp.keywords.join(', ') || 'none'}`,
      ].join('\n')

      const leadsText = leads
        .map(
          (l: Record<string, string | null>, idx: number) =>
            `${idx + 1}. id="${l.id}" name="${l.first_name} ${l.last_name}" title="${l.job_title || 'unknown'}" company="${l.company || 'unknown'}" industry="${l.industry || 'unknown'}" seniority="${l.seniority || 'unknown'}" country="${l.country || 'unknown'}"`,
        )
        .join('\n')

      const prompt = `You are scoring sales leads for ${clientName} against their Ideal Customer Profile (ICP).

ICP criteria:
${icpDescription}

Score each lead from 0 to 100 based on how well they match the ICP. 100 = perfect match, 0 = no match.${nexusBoost}${feedbackContext}

Leads to score:
${leadsText}

Return ONLY a JSON array with no markdown, no code fences, no explanation:
[{"id":"<lead-id>","score":<0-100>,"reasoning":"<one sentence>"}]`

      const message = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages:   [{ role: 'user', content: prompt }],
      })

      const raw     = (message.content[0] as { type: string; text: string }).text.trim()
      const results = parseScoringResponse(raw)

      if (!results.length) {
        console.error('[scoring] no valid results from Claude for batch', Math.floor(i / BATCH_SIZE) + 1)
        // #358 (AR-20) — DO NOT fake a 50/$5000 "scored" lead. A fabricated score is
        // indistinguishable from a real one, so the lead would be delivered + charged as
        // if genuinely qualified. Mark the batch DISTINCTLY instead: null score, no fake
        // value, scored_at null, and DON'T flip status to 'scored' — so the lead is not
        // delivered/charged and is re-scored on the next run. Alert once per call so a
        // persistent scoring outage is visible (the alarm is durable now, #339).
        await Promise.all(
          batchIds.map(id =>
            db.from('leads').update(unscoredOnFailure()).eq('id', id)
          )
        )
        if (!alertedScoringFailure) {
          alertedScoringFailure = true
          void sendFounderAlert('api_down', 'FIGSY lead scoring failed — AI returned no usable scores', [
            `Client: ${clientName}`,
            `At least one batch of ${batchIds.length} leads could not be scored and was left UNSCORED (not delivered, not charged).`,
            `They will be re-scored on the next run. If this persists, check ANTHROPIC_API_KEY / the model endpoint.`,
          ])
        }
        continue
      }

      const now = new Date().toISOString()

      // Update each lead individually so one failure doesn't block the rest
      await Promise.allSettled(
        results.map((r) =>
          db
            .from('leads')
            .update({
              score:                    r.score,
              score_reasoning:          r.reasoning,
              scored_at:                now,
              status:                   'scored',
              estimated_deal_value_usd: r.score * 100,
            })
            .eq('id', r.id)
        ),
      )

      console.log(`[scoring] batch ${Math.floor(i / BATCH_SIZE) + 1}: scored ${results.length} leads`)
    } catch (err) {
      console.error(`[scoring] batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, err)
      // #477 (was #358, half-fixed) — NEVER fake a score on the crash path either. A
      // thrown AI/network error must be treated EXACTLY like the no-results branch above:
      // null score, no fabricated value, scored_at null, status NOT flipped to 'scored'
      // — so the lead is not delivered/charged and is re-scored on the next run. The old
      // code stamped 50/$5000/'scored', which delivered + charged fake leads as real.
      try {
        await Promise.all(
          batchIds.map(id =>
            db.from('leads').update(unscoredOnFailure()).eq('id', id)
          )
        )
      } catch (fallbackErr) {
        console.error('[scoring] unscore-on-failure update also failed:', fallbackErr)
      }
      if (!alertedScoringFailure) {
        alertedScoringFailure = true
        void sendFounderAlert('api_down', 'FIGSY lead scoring failed — AI scoring threw an error', [
          `Client: ${clientName}`,
          `At least one batch of ${batchIds.length} leads could not be scored and was left UNSCORED (not delivered, not charged).`,
          `They will be re-scored on the next run. If this persists, check ANTHROPIC_API_KEY / the model endpoint.`,
        ])
      }
    }
  }
}
