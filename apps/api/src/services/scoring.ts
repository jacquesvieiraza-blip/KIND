import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface ScoringResult {
  score: number
  reasoning: string
}

export async function scoreLead(
  lead: {
    first_name: string
    last_name: string
    job_title: string | null
    company: string | null
    country: string | null
  },
  icp: {
    industries: string[]
    job_titles: string[]
    company_sizes: string[]
    locations: string[]
    keywords: string[]
  }
): Promise<ScoringResult> {
  const prompt = `Score this B2B lead's fit against the Ideal Customer Profile (ICP) from 0-100.

ICP:
- Industries: ${icp.industries.join(', ')}
- Job Titles: ${icp.job_titles.join(', ')}
- Company Sizes: ${icp.company_sizes.length ? icp.company_sizes.join(', ') + ' employees' : 'Any'}
- Locations: ${icp.locations.length ? icp.locations.join(', ') : 'Any'}
- Keywords: ${icp.keywords.length ? icp.keywords.join(', ') : 'None'}

Lead:
- Name: ${lead.first_name} ${lead.last_name}
- Job Title: ${lead.job_title ?? 'Unknown'}
- Company: ${lead.company ?? 'Unknown'}
- Country: ${lead.country ?? 'Unknown'}

Reply with valid JSON only, no markdown:
{"score": <integer 0-100>, "reasoning": "<1-2 sentences explaining the score>"}`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 200,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'
  const text = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()
  const parsed = JSON.parse(text)

  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score)))),
    reasoning: String(parsed.reasoning ?? ''),
  }
}

// Run with limited concurrency to respect Claude rate limits
export async function scoreLeadsInBatches<T>(
  items: T[],
  scorer: (item: T) => Promise<void>,
  concurrency = 5
): Promise<void> {
  const chunks: T[][] = []
  for (let i = 0; i < items.length; i += concurrency) {
    chunks.push(items.slice(i, i + concurrency))
  }
  for (const chunk of chunks) {
    await Promise.allSettled(chunk.map(scorer))
  }
}
