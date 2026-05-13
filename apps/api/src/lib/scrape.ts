import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

interface IcpSuggestion {
  industries: string[]
  job_titles: string[]
  seniority_levels: string[]
  company_sizes: string[]
  geographies: string[]
  keywords: string[]
}

export async function suggestIcpFromWebsite(url: string): Promise<IcpSuggestion> {
  let html: string
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0' },
    })
    clearTimeout(timeout)
    html = await response.text()
  } catch (err) {
    throw new Error(`Failed to fetch website: ${err instanceof Error ? err.message : String(err)}`)
  }

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .slice(0, 3000)

  const prompt = `You are analyzing a business website to suggest their ideal customer profile (ICP) for B2B lead generation. Based on this website content, suggest realistic ICP fields. Return ONLY valid JSON, no markdown, no explanation.

Valid seniority_levels values (use only these): ["C-Suite","VP / Director","Head of","Manager","Senior","Individual Contributor"]
Valid company_sizes values (use only these): ["1–10","11–50","51–200","201–500","501–1,000","1,000+"]
Each array should have 2-5 realistic items.

Return format:
{"industries":[],"job_titles":[],"seniority_levels":[],"company_sizes":[],"geographies":[],"keywords":[]}

Website content:
${text}`

  let raw: string
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    })
    raw = (message.content[0] as { type: string; text: string }).text.trim()
  } catch (err) {
    throw new Error(`Claude request failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  try {
    return JSON.parse(raw) as IcpSuggestion
  } catch {
    throw new Error(`Failed to parse Claude response as JSON: ${raw.slice(0, 200)}`)
  }
}
