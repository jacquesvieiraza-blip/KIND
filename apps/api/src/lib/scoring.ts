import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'
import { sendFounderAlert } from './alerts'

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
): Promise<void> {
  if (!leadIds.length) return

  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[scoring] ANTHROPIC_API_KEY not set — skipping scoring, leads will stay as "pending"')
    return
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

Score each lead from 0 to 100 based on how well they match the ICP. 100 = perfect match, 0 = no match.

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
            db.from('leads').update({
              score:                    null,
              score_reasoning:          'SCORING_FAILED: AI scoring unavailable — not a real score (retried hourly by /figsy/rescore-stranded)',
              scored_at:                null,
              estimated_deal_value_usd: null,
            }).eq('id', id)
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
      // Mark these leads as scored with neutral score so they're visible in the UI
      try {
        const now = new Date().toISOString()
        await Promise.allSettled(
          batchIds.map(id =>
            db.from('leads').update({
              score:              50,
              score_reasoning:    'Auto-scored: scoring error, please review manually',
              scored_at:          now,
              status:             'scored',
              estimated_deal_value_usd: 5000,
            }).eq('id', id)
          )
        )
      } catch (fallbackErr) {
        console.error('[scoring] fallback score update also failed:', fallbackErr)
      }
    }
  }
}
