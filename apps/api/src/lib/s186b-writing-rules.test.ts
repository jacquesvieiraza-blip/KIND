// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 2 Oct (R186 ① · card #2543 · S3 part 2) — THE AI WRITES LIKE A PROFESSIONAL, AND NEVER
// BAKES ONE PERSON'S JOB TITLE INTO AN EMAIL SENT TO MANY.
//
// The founder, on the 1 Oct email: *"incorrect lower case grammar. we professoinals here."*
// R186 ①: *"the subject goes out as written (never forced lowercase) · a blank line between
// paragraphs · a gap before the sign-off … The AI writing rules change to match, and no job
// title is baked into a template."*
//
// What was wrong: all three AI writers were told "Subject: 4–6 words, lowercase" — so every
// subject arrived as "ceo bandwidth this quarter" — and nothing asked for paragraphs. And a
// programme's sequence is written ONCE for one sample person and sent to everyone, with that
// person's job title in front of the model — so "as CEO" went to people who are not CEOs.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const prompts: string[] = []
const DRAFT = Object.fromEntries(Array.from({ length: 7 }, (_, i) => [`step${i + 1}`,
  { subject: `A short note ${i + 1}`, body: 'Hi Sam,\n\nA short note.\n\nReply STOP to opt out.' }]))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (args: { messages: { content: string }[] }) => {
        prompts.push(String(args.messages[0].content))
        return { content: [{ type: 'text', text: JSON.stringify(DRAFT) }], stop_reason: 'end_turn' }
      },
    }
  },
}))
vi.mock('@kind/db', () => {
  const q: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'in', 'is', 'not', 'order', 'limit', 'gte', 'lte', 'update', 'insert']) q[m] = () => q
  q.maybeSingle = async () => ({ data: null, error: null })
  q.single = async () => ({ data: null, error: null })
  q.then = (r: (v: unknown) => unknown) => r({ data: [], error: null })
  return { db: { from: () => q, rpc: async () => ({ data: null, error: null }) } }
})

const LEAD = {
  id: 'l1', first_name: 'Sam', last_name: 'Lee', email: 'sam@acme.example', job_title: 'CEO',
  company: 'Acme', industry: 'Software', seniority: 'c_suite', country: 'United Kingdom', tech_stack: [],
}

beforeEach(() => { prompts.length = 0 })

const SUBJECT_RULE = /sentence case/i
const PARAGRAPH_RULE = /blank line between paragraphs/i

describe('① the writing rules every AI writer is given', () => {
  it('🛑 the programme / sequence writer: subjects in sentence case, never lowercase; short paragraphs with blank lines', async () => {
    const { generateSequence } = await import('./figsy')
    await generateSequence(LEAD as never, 'Acme Outreach', 'Software')
    const p = prompts[0]
    expect(p, 'the writer is still told to write lowercase subjects').not.toMatch(/lowercase/i)
    expect(p).toMatch(SUBJECT_RULE)
    expect(p).toMatch(PARAGRAPH_RULE)
  })

  it('🛑 the memory-backed writer: the same rules', async () => {
    const { generateSequenceWithMemory } = await import('./figsy')
    await generateSequenceWithMemory(LEAD as never, 'client-1', 'Acme Outreach', 'Software').catch(() => null)
    const p = prompts.find(x => /Hard rules/.test(x)) ?? prompts[0] ?? ''
    expect(p.length, 'the memory writer was never called').toBeGreaterThan(0)
    expect(p).not.toMatch(/lowercase/i)
    expect(p).toMatch(SUBJECT_RULE)
    expect(p).toMatch(PARAGRAPH_RULE)
  })

  it('🛑 the day-1 writer: the same rules', () => {
    const src = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    const at = src.indexOf('async function generateDay1Email(')
    const prompt = src.slice(at, src.indexOf('Return ONLY valid JSON', at))
    expect(prompt).not.toMatch(/lowercase/i)
    expect(prompt).toMatch(SUBJECT_RULE)
    expect(prompt).toMatch(PARAGRAPH_RULE)
  })
})

describe('② no job title is baked into a template', () => {
  it('🛑 a programme\'s sequence is written without the sample person\'s job title or seniority in front of the model', () => {
    const src = readFileSync(join(__dirname, 'programme-sequence-generation.ts'), 'utf8')
    expect(src).toContain('{ ...sample, job_title: null, seniority: null }')
  })
})
