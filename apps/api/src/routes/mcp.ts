import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'

const router = Router()

// ── MCP TOOL LIST ─────────────────────────────────────────────────────────────
const MCP_TOOLS = [
  {
    name: 'figsy_find_leads',
    description: 'Search for B2B leads matching an Ideal Customer Profile using Apollo database (250M+ contacts)',
    inputSchema: {
      type: 'object',
      properties: {
        industry:     { type: 'string', description: 'Target industry (e.g. SaaS, Fintech, Healthcare)' },
        title:        { type: 'string', description: 'Job title keywords (e.g. CEO, Head of Sales, CTO)' },
        company_size: { type: 'string', description: 'Company size range (e.g. 10-50, 50-200, 200-1000)' },
        country:      { type: 'string', description: 'Target country (e.g. South Africa, Nigeria, United Kingdom)' },
        limit:        { type: 'number', description: 'Number of leads to return (max 50)', default: 10 },
      },
      required: ['industry', 'title'],
    },
  },
  {
    name: 'figsy_get_campaign_stats',
    description: 'Get performance stats for FIGSY outreach campaigns — emails sent, open rate, reply rate, meetings booked',
    inputSchema: {
      type: 'object',
      properties: {
        client_api_key: { type: 'string', description: 'KIND API key for authentication' },
      },
      required: ['client_api_key'],
    },
  },
  {
    name: 'milla_ask',
    description: 'Ask Milla a question about your business, get document drafts, or query your knowledge base',
    inputSchema: {
      type: 'object',
      properties: {
        question:       { type: 'string', description: 'Your question or request' },
        client_api_key: { type: 'string', description: 'KIND API key for authentication' },
      },
      required: ['question', 'client_api_key'],
    },
  },
  {
    name: 'figsy_suggest_campaign',
    description: 'Ask FIGSY to suggest a campaign strategy based on your ICP and current pipeline',
    inputSchema: {
      type: 'object',
      properties: {
        target_description: { type: 'string', description: 'Brief description of who you want to target' },
        client_api_key:     { type: 'string', description: 'KIND API key for authentication' },
      },
      required: ['target_description', 'client_api_key'],
    },
  },
]

// GET /mcp/tools — MCP tool discovery
router.get('/tools', (_req, res) => {
  res.json({ tools: MCP_TOOLS })
})

// POST /mcp/call — MCP tool execution
router.post('/call', async (req, res): Promise<void> => {
  const { tool, input } = req.body as { tool: string; input: Record<string, unknown> }
  if (!tool || !input) {
    res.status(400).json({ error: 'tool and input required' }); return
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    if (tool === 'figsy_find_leads') {
      res.json({
        content: [{
          type: 'text',
          text: `Searching for ${input.title} in ${input.industry} (${input.country ?? 'worldwide'})... To execute real lead searches, authenticate with your KIND API key and use the portal at app.get-kind.com.`,
        }],
      }); return
    }

    if (tool === 'milla_ask') {
      if (!input.question) {
        res.status(400).json({ error: 'question is required' }); return
      }
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: 'You are Milla, the Business Operations AI from KIND. You are The Brain — knowledgeable, organised, and helpful. Answer questions about business operations, draft documents, and provide intelligent assistance.',
        messages: [{ role: 'user', content: String(input.question) }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      res.json({ content: [{ type: 'text', text }] }); return
    }

    if (tool === 'figsy_suggest_campaign') {
      if (!input.target_description) {
        res.status(400).json({ error: 'target_description is required' }); return
      }
      const msg = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: 'You are FIGSY, an AI SDR known as The Closer. Suggest campaign strategies in a direct, results-focused tone.',
        messages: [{
          role: 'user',
          content: `Suggest a campaign for this target: ${input.target_description}. Return: campaign name, 3 subject line options, and a one-line rationale.`,
        }],
      })
      const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
      res.json({ content: [{ type: 'text', text }] }); return
    }

    if (tool === 'figsy_get_campaign_stats') {
      res.json({
        content: [{ type: 'text', text: 'Authenticate via the KIND portal to access live campaign stats at app.get-kind.com.' }],
      }); return
    }

    res.status(404).json({ error: `Unknown tool: ${tool}` })
  } catch (err) {
    console.error('[mcp/call]', err)
    res.status(500).json({ error: 'Tool execution failed' })
  }
})

// POST /mcp/guide — AI setup guide for clients connecting KIND via MCP
router.post('/guide', async (req, res): Promise<void> => {
  const { messages } = req.body as { messages: { role: string; content: string }[] }
  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'messages array required' }); return
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: `You are the KIND MCP Setup Guide — a friendly, concise AI assistant that helps clients connect their KIND account to Claude.ai, Cursor, and other MCP-compatible AI tools.

KIND's MCP server endpoint is: https://api.kindai.co.za/mcp
Tool discovery: GET https://api.kindai.co.za/mcp/tools
Execute tool: POST https://api.kindai.co.za/mcp/call

Available MCP tools:
1. figsy_find_leads — search for B2B leads by industry, title, country
2. figsy_get_campaign_stats — get outreach performance (emails sent, reply rate, meetings booked)
3. figsy_suggest_campaign — AI recommends a campaign strategy for a target audience
4. milla_ask — ask Milla business questions, draft documents, query knowledge base

To connect in Claude.ai:
1. Go to Claude.ai → Settings → Integrations → Add MCP Server
2. Server URL: https://api.kindai.co.za/mcp
3. Add your KIND Client ID as the api_key header
4. Save — KIND tools appear in Claude's tool picker

To connect in Cursor:
1. Open Cursor Settings → MCP Servers → Add
2. Set URL: https://api.kindai.co.za/mcp
3. Add header: client_api_key: [their KIND client ID]
4. Restart Cursor — KIND tools are now available in Cursor Agent

For any MCP client:
- Discovery endpoint: GET /mcp/tools (returns JSON tool list)
- Execution endpoint: POST /mcp/call with body: { tool: "tool_name", input: { ...params } }
- Pass client_api_key in the input for authenticated tools

Keep answers short, specific, and step-by-step. If asked about a topic outside MCP setup, redirect politely.`,
      messages: messages.slice(-20).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
    res.json({ data: { reply: text } })
  } catch (err) {
    console.error('[mcp/guide]', err)
    res.status(500).json({ error: 'Guide unavailable — try again.' })
  }
})

export default router
