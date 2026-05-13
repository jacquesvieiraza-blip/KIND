import Anthropic from '@anthropic-ai/sdk'
import { db } from '@kind/db'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface IcpCriteria {
  job_titles: string[]
  seniority_levels: string[]
  industries: string[]
  company_sizes: string[]
  geographies: string[]
  keywords: string[]
}

interface ScoreResult {
  id: string
  score: number
  reasoning: string
}

export async function scoreLeadsForIcp(
  leadIds: string[],
  icp: IcpCriteria,
  clientName: string,
): Promise<void> {
  const BATCH_SIZE = 10

  for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
    const batchIds = leadIds.slice(i, i + BATCH_SIZE)

    try {
      const { data: leads, error } = await db
        .from('leads')
        .select('id, first_name, last_name, job_title, company, industry, seniority, country')
        .in('id', batchIds)

      if (error || !leads?.length) continue

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
          (l, idx) =>
            `${idx + 1}. id="${l.id}" name="${l.first_name} ${l.last_name}" title="${l.job_title || 'unknown'}" company="${l.company || 'unknown'}" industry="${l.industry || 'unknown'}" seniority="${l.seniority || 'unknown'}" country="${l.country || 'unknown'}"`,
        )
        .join('\n')

      const prompt = `You are scoring sales leads for ${clientName} against their Ideal Customer Profile (ICP).

ICP criteria:
${icpDescription}

Score each lead from 0 to 100 based on how well they match the ICP. 100 = perfect match, 0 = no match.

Leads to score:
${leadsText}

Return ONLY a JSON array with no markdown, no explanation:
[{"id":"<lead-id>","score":<0-100>,"reasoning":"<one sentence>"}]`

      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      })

      const raw = (message.content[0] as { type: string; text: string }).text.trim()
      const results: ScoreResult[] = JSON.parse(raw)

      const now = new Date().toISOString()

      await Promise.all(
        results.map((r) =>
          db
            .from('leads')
            .update({
              score: r.score,
              score_reasoning: r.reasoning,
              scored_at: now,
              status: 'scored',
              estimated_deal_value_usd: r.score * 100,
            })
            .eq('id', r.id),
        ),
      )
    } catch (err) {
      console.error(`[scoring] batch ${i / BATCH_SIZE + 1} failed:`, err)
    }
  }
}
