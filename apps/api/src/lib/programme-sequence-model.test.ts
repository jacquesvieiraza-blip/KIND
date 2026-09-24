// ═══════════════════════════════════════════════════════════════════════════════════════
// 24 Sep (R159) — THE PROGRAMME'S EMAILS ARE WRITTEN BY SONNET. NOTHING ELSE MOVES.
//
// The founder, reading House's weak version 3 and told that R122a ("THE OTHER PARTS = HAIKU")
// covers Figsy: "yes Sonnet". A NAMED EXCEPTION: one call per programme or per Rewrite. This
// holds both halves — the programme writer asks for Sonnet, and no per-person writer does.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { describe, it, expect, vi } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const state = vi.hoisted(() => ({ opts: [] as unknown[] }))
const LEAD = {
  id: 'lead-1', first_name: 'Dana', last_name: 'Okafor', job_title: 'CEO', company: 'Harbour Point LLC',
  industry: null, seniority: 'c_suite', country: 'United States', tech_stack: null, score: 90, score_reasoning: null,
}
function table(name: string) {
  const row = name === 'leads' ? LEAD
    : name === 'clients' ? { company_name: 'K.I.N.D', industry: null, signer_name: null, booking_url: null }
    : { name: 'House', campaign_intent: null }
  const chain: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'not', 'is', 'order', 'limit']) chain[m] = () => chain
  chain.maybeSingle = async () => ({ data: row, error: null })
  return chain
}
vi.mock('@kind/db', () => ({ db: { from: (t: string) => table(t) } }))
vi.mock('./programme-chain', () => ({
  resolveProgrammeChain: async () => ({ ok: true, chain: { clientId: 'c', campaignId: 'camp', sequenceId: null, steps: [] } }),
}))
vi.mock('./figsy', () => ({
  generateSequence: async (...args: unknown[]) => { state.opts.push(args[7]); throw new Error('stop here') },
  getClientKnowledgeForOutreach: async () => undefined,
}))
vi.mock('./meeting-brief-deliver', () => ({ briefContextFor: async () => null }))

import { generateProgrammeSequence } from './programme-sequence-generation'
import { CONVERSATION_MODEL, BACKGROUND_MODEL } from './models'

const API = join(__dirname, '..')
const walk = (d: string): string[] => readdirSync(d).flatMap(f => {
  const p = join(d, f)
  return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') && !p.endsWith('.test.ts') ? [p] : []
})

describe('R159 — the named exception', () => {
  it('🛑 the programme writer asks generateSequence for the conversational model', async () => {
    await generateProgrammeSequence('prog-1')
    expect((state.opts[0] as { model?: string }).model).toBe(CONVERSATION_MODEL)
    expect(CONVERSATION_MODEL).not.toBe(BACKGROUND_MODEL)
  })

  it('🛑 generateSequence itself still defaults to the background model', () => {
    const figsy = readFileSync(join(__dirname, 'figsy.ts'), 'utf8')
    expect(figsy).toContain('model: opts?.model ?? BACKGROUND_MODEL,')
  })

  it('🛑 NO OTHER caller of generateSequence passes a model — every per-person writer stays on Haiku', () => {
    const offenders: string[] = []
    for (const file of walk(API)) {
      if (file.endsWith('programme-sequence-generation.ts')) continue
      const src = readFileSync(file, 'utf8')
      let at = src.indexOf('generateSequence(')
      while (at >= 0) {
        const call = src.slice(at, at + 700)
        if (!call.startsWith('generateSequence(\n  lead: Lead') && /\bmodel\s*:|CONVERSATION_MODEL/.test(call.slice(0, call.indexOf(')\n') > 0 ? call.indexOf(')\n') : 700))) {
          offenders.push(file.replace(API, ''))
        }
        at = src.indexOf('generateSequence(', at + 1)
      }
    }
    expect(offenders).toEqual([])
  })
})
