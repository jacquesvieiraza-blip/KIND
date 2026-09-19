// ══════════════════════════════════════════════════════════════════════════════════════════
// J6-C2 · MILLA REFINES AGAINST THE TARGETING THAT IS ACTUALLY LIVE
//
// REQ: *"chat-build sees category/geography/exclusions"* (LR 11,13; FD-1).
//
// ── THE INSTRUCTION WAS THERE AND THE FACTS WERE NOT ────────────────────────────────────
//
// `/icps/chat-build`'s system prompt, verbatim:
//
//     "call the propose_targeting tool with the WHOLE profile as it should end up. Start from
//      what they already have and change only what they asked about."
//
// 🛑 AND THE HANDLER NEVER READ `icps`. It is handed the durable Brief and twenty turns of
// browser history — that is the whole of its context. So the model was told to start from
// something it had never been shown, and "the WHOLE profile" was produced from one
// conversation about one change. Whatever it omitted, `propose_targeting` returned as the
// end state, and `saveClientTargeting` wrote.
//
// ⚠️ THE BRIEF IS NOT THE ICP. The Brief is signup; the ICP is what is live now — after a
// refinement, after an operator translated a phrase we could not map, after a widened proof
// pass was adopted. Milla was reading the older of the two.
//
// 🛑 AND EXCLUSIONS ARE THE SHARPEST CASE (FD-1). "Not recruitment agencies" is canonical
// targeting truth on `icps.exclusions`. Invisible here, so a proposal could contradict the one
// instruction the client gave about who to leave out.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describeCurrentTargeting } from './icp-refine-context'

const LIVE = {
  name: 'Digital marketing agencies',
  target_category: 'digital marketing agencies',
  target_company_type: 'agency',
  target_size: '10 to 50 people',
  exclusions: 'no recruitment agencies, nothing in gambling',
  geographies: ['United Kingdom', 'Ireland'],
  company_sizes: ['11–50'],
  job_titles: ['Founder', 'CEO'],
  seniority_levels: ['founder'],
  industries: ['Media', 'Consulting'],
}

describe('J6-C2 · the block states what is actually stored', () => {
  const block = describeCurrentTargeting(LIVE)

  it('🛑 the three the REQ names are all in it', () => {
    expect(block, 'the client\'s own category is invisible to the model refining it')
      .toContain('digital marketing agencies')
    expect(block, 'geography is invisible, so a refinement can silently drop a country')
      .toContain('United Kingdom')
    expect(block, 'FD-1: a proposal could contradict who they asked us to leave out')
      .toContain('no recruitment agencies, nothing in gambling')
  })

  it('🛑 the exclusions carry the sentence that says they still apply', () => {
    // Stating the fact is not enough: "the WHOLE profile as it should end up" invites a model
    // to re-derive everything, and an exclusion it merely SAW is one it can drop.
    expect(block).toMatch(/LEAVE OUT[\s\S]*still applies unless they say otherwise/)
  })

  it('the client\'s own words outrank our provider tags, and the tags are labelled as ours', () => {
    const catAt = block.indexOf('digital marketing agencies')
    const tagAt = block.indexOf('Media, Consulting')
    expect(catAt).toBeGreaterThan(-1)
    expect(tagAt, 'the provider tags are not stated at all').toBeGreaterThan(-1)
    expect(catAt, 'the closed provider list is presented ahead of the client\'s own answer')
      .toBeLessThan(tagAt)
    expect(block).toMatch(/never their words/)
    expect(block, 'the model may read our internal tags back to the client')
      .toMatch(/Do not read these back to them/)
  })

  it('the stated size outranks the band, for the same reason (J5-C4)', () => {
    expect(block).toContain('10 to 50 people')
    expect(describeCurrentTargeting({ ...LIVE, target_size: null })).toContain('11–50')
  })

  it('🛑 A FIELD THAT IS NOT SET SAYS NOTHING — never "none", never "any"', () => {
    // The prompt's own rule is that an empty list means "I do not know yet". Rendering a
    // heading with "none" under it converts an absence into a stated requirement, which is
    // exactly the fabrication this whole area refuses.
    const thin = describeCurrentTargeting({ target_category: 'marketing agencies' })
    expect(thin).toContain('marketing agencies')
    expect(thin).not.toMatch(/\bnone\b|\bany\b|not set|unknown/i)
    expect(thin, 'a field nobody established was stated anyway').not.toMatch(/Countries|Seniority|LEAVE OUT/)
  })

  it('an ICP with nothing stored produces NOTHING, not an empty heading', () => {
    // A heading with nothing under it reads as "they have no targeting", which is a claim.
    expect(describeCurrentTargeting({})).toBe('')
    expect(describeCurrentTargeting(null)).toBe('')
    expect(describeCurrentTargeting({ geographies: [], job_titles: [] })).toBe('')
  })

  it('it says what "what they already have" means, so the instruction is answerable', () => {
    expect(block).toMatch(/what "what they already have" means/)
    expect(block).toMatch(/do not invent it/i)
  })
})

describe('J6-C2 · and the door actually reads it', () => {
  const code = (p: string): string =>
    readFileSync(join(__dirname, p), 'utf8')
      .split('\n')
      .filter(l => { const t = l.trim(); return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*') })
      .join('\n')

  const ICPS = code('../routes/icps.ts')
  const handler = (() => {
    const at = ICPS.indexOf("icpRouter.post('/chat-build'")
    expect(at, 'the chat-build door moved — this guard must be repointed').toBeGreaterThan(-1)
    return ICPS.slice(at, ICPS.indexOf("icpRouter.post('/builder", at) > -1
      ? ICPS.indexOf("icpRouter.post('/builder", at)
      : at + 12_000)
  })()

  it('🛑 the current ICP is READ on this door — it never was', () => {
    expect(handler, 'the refine door still knows nothing about the targeting it is changing')
      .toMatch(/describeCurrentTargeting\(/)
    expect(handler, 'the three fields the REQ names are not selected')
      .toMatch(/target_category[\s\S]{0,200}exclusions/)
  })

  it('🛑 and the block reaches the MODEL, not just a variable', () => {
    expect(handler, 'the block is built and never sent').toMatch(/system \+ (briefBlock \+ )?currentBlock|currentBlock/)
    const sysAt = handler.indexOf('system: system +')
    expect(sysAt, 'the system prompt assembly moved').toBeGreaterThan(-1)
    expect(handler.slice(sysAt, sysAt + 120)).toContain('currentBlock')
  })

  it('it is CLIENT-SCOPED, like every other read on this route', () => {
    // ⚠️ THE READ, NOT THE RENDER. `describeCurrentTargeting` is the last line of the block;
    // the scope lives on the select a few lines above it, and it is scoped to the client id
    // this route resolved from the authenticated user — never to `req.userId` directly.
    const at = handler.indexOf("from('icps')")
    expect(at, 'the current-ICP read moved — this guard must be repointed').toBeGreaterThan(-1)
    const region = handler.slice(at, at + 600)
    expect(region, 'the refine door reads an ICP that may not be this client\'s')
      .toMatch(/\.eq\('client_id', cid\)/)
    expect(handler, 'the client id is not resolved from the authenticated user')
      .toMatch(/const cid = await getClientId\(req\.userId\)/)
  })

  it('🛑 BEST-EFFORT — an unreadable ICP costs the memory, never the turn', () => {
    // The Brief block already has this property and states why: "A Brief we cannot read costs
    // the client their memory, never their turn." A refine door that 500s because one select
    // failed would be a worse product than one that answers with less context.
    const at = handler.indexOf('describeCurrentTargeting(')
    const region = handler.slice(Math.max(0, at - 900), at + 400)
    expect(region, 'a failed read can take the client\'s turn down with it').toMatch(/catch/)
  })

  it('the Brief memory is still read — this ADDS a source, it replaces none', () => {
    expect(handler).toMatch(/describeBriefMemory\(/)
  })
})
