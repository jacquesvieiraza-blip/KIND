import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { describeBriefMemory, buildMillaChatSystem } from './milla-chat-system'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD 2 — ONE MILLA. She remembers what they told her, and there is one of her.
//
// ── THE THREE DEFECTS ──────────────────────────────────────────────────────────────────
//
// 🛑 ① SHE COULD NOT SEE THE ONBOARDING CONVERSATION AT ALL. A client spends twenty minutes
// telling Milla what their business is, who to avoid, what they want. That reached
// `figsy_knowledge` and `icps` as STRUCTURE; the WORDS stayed in `onboarding_brief_drafts`,
// read by the welcome screen and nothing else. The Milla they met afterwards was a different
// person wearing the same name.
//
// 🛑 ② TEN TURNS OF MEMORY. About five exchanges — so a client who explained something at the
// top of a conversation was talking to somebody who had forgotten it by the bottom.
//
// 🛑 ③ TWO OF HER ON ONE SCREEN. `MillaShell` mounts one conversation beside every route, and
// `/milla/chat` built a SECOND against the same session, each blind to the other's turns.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

const MEM = {
  facts: {
    contact_name: 'Jacques', company_name: 'Northstar Revenue',
    what_they_do: 'B2B sales consultancy helping founder-led service businesses',
    exclusions: 'no recruitment agencies or software companies',
    geographies: ['United Kingdom', 'United States'],
    desired_outcome: 'book qualified sales conversations',
  },
  conversation: [
    { role: 'user', content: "I'm Jacques and I run Northstar Revenue." },
    { role: 'assistant', content: 'Who are your best customers?' },
  ],
}

describe('🛑 BUILD 2 · she remembers what they told her at setup', () => {
  it('the canonical facts reach her, in the client’s own words', () => {
    const s = describeBriefMemory(MEM)
    expect(s).toContain('Northstar Revenue')
    expect(s).toContain('no recruitment agencies or software companies')
    expect(s).toContain('United Kingdom, United States')
    expect(s).toContain('book qualified sales conversations')
  })

  it('🛑 AND SO DOES SOME OF HOW THEY SAID IT', () => {
    expect(describeBriefMemory(MEM)).toContain("I'm Jacques and I run Northstar Revenue.")
  })

  it('🛑 SHE IS TOLD NOT TO ASK FOR ANY OF IT AGAIN', () => {
    // The whole point: a client who has already answered must never be re-interviewed.
    expect(describeBriefMemory(MEM)).toContain('never ask them for any of it again')
    expect(describeBriefMemory(MEM)).toContain('never sound like you are meeting them for the first time')
  })

  it('no memory, or an empty one, adds NOTHING — the prompt is exactly what it was', () => {
    expect(describeBriefMemory(null)).toBe('')
    expect(describeBriefMemory(undefined)).toBe('')
    expect(describeBriefMemory({ facts: {}, conversation: [] })).toBe('')
    // …and a door that passes nothing gets a prompt with no memory block in it.
    const without = buildMillaChatSystem(null, null, undefined)
    expect(without).not.toContain('WHAT THEY ALREADY TOLD YOU WHEN THEY SET UP')
  })

  it('🛑 IT IS A MEMORY, NOT A SECOND SOURCE OF TRUTH — it re-derives nothing', () => {
    // ⚠️ THE FACTS ARE RENDERED AS STORED. A block that recounted, re-totalled or
    // re-interpreted them would be a second answer to a question the programme and outcome
    // blocks already own — which is the competing-truth defect this whole correction closes.
    const src = live(read('apps/api/src/lib/milla-chat-system.ts'))
    const from = src.indexOf('export function describeBriefMemory')
    const body = src.slice(from, src.indexOf('\n}', from))
    expect(body).not.toMatch(/briefFacts|draftProgress|\.length\s*\/|count|total/)
  })

  it('🛑 THE DESK CHAT ACTUALLY READS IT, in the same parallel batch as everything else', () => {
    const src = live(read('apps/api/src/lib/milla.ts'))
    expect(src).toContain('buildMillaChatSystem(snapshot, programme, proof, briefMemory)')
    expect(src).toContain('briefDraftFor')
    // ⚠️ PARALLEL, NOT SERIAL. Adding a fifth serial lookup is what pushed first questions
    // over the browser budget in August; this one joins the existing Promise.all.
    const batch = src.slice(src.indexOf('await Promise.all(['), src.indexOf('const hasContext'))
    expect(batch, 'the brief lookup is outside the parallel batch').toContain('briefDraftFor')
    expect((src.match(/await Promise\.all\(\[/g) ?? []), 'the lookups were split into serial batches')
      .toHaveLength(1)
  })

  it('🛑 AND IT FAILS SOFT — an unreadable brief answers the question without it', () => {
    const src = live(read('apps/api/src/lib/milla.ts'))
    const from = src.indexOf('MillaBriefMemory')
    const leg = src.slice(from, from + 900)
    expect(leg).toContain('catch')
    expect(leg).toContain('return null')
  })
})

describe('🛑 BUILD 2 · her memory is as long as the conversation', () => {
  it('🛑 40 STORED TURNS, NOT 10 — and no summarisation call was added', () => {
    const src = live(read('apps/api/src/routes/milla.ts'))
    const from = src.indexOf("millaRouter.post('/sessions/:sessionId/chat'")
    const route = src.slice(from, from + 1_600)
    expect(route).toContain('.limit(40)')
    expect(route, 'the ten-turn window is back').not.toContain('.limit(10)')
    // ⚠️ A SUMMARISER WOULD BE A SECOND MODEL TURN PER MESSAGE for a problem a bigger window
    // already solves — and a second place the client's truth could be re-worded.
    expect(route).not.toMatch(/summari[sz]/i)
  })

  it('the window matches what the rest of the product means by "remembers"', () => {
    // The onboarding route windows 40; the Brief transcript is stored at 40. One answer to
    // "how much does Milla remember?" across the product.
    expect(live(read('apps/api/src/routes/icps.ts'))).toContain('messages.slice(-40)')
    expect(live(read('apps/api/src/lib/brief-draft.ts'))).toContain('BRIEF_TRANSCRIPT_MAX_TURNS = 40')
  })
})

describe('🛑 BUILD 2 · there is one of her on the screen', () => {
  it('🛑 /milla/chat NO LONGER BUILDS A SECOND TRANSCRIPT', () => {
    const page = read('apps/portal/src/app/(milla)/milla/chat/page.tsx')
    expect(page).toContain('useMillaConversation')
    // The second conversation's own state, composer and session handling are gone.
    const code = live(page)
    expect(code, 'a second transcript is back').not.toContain('setMessages')
    expect(code, 'a second composer is back').not.toContain('<form onSubmit')
    expect(code, 'a second session lookup is back').not.toContain('/milla/sessions')
  })

  it('the shell still mounts exactly one conversation for the whole route family', () => {
    const shell = live(read('apps/portal/src/components/milla/MillaShell.tsx'))
    expect((shell.match(/<MillaConversationProvider/g) ?? [])).toHaveLength(1)
  })
})

describe('🛑 BUILD 2 · the targeting door is a conversation, not a JSON form', () => {
  const route = (() => {
    const src = read('apps/api/src/routes/icps.ts')
    const from = src.indexOf("icpRouter.post('/chat-build'")
    const to = src.indexOf("icpRouter.post('/fresh'", from)
    return live(src.slice(from, to))
  })()

  it('🛑 THE FILTER FORM IS GONE FROM THE CLIENT’S FAILURE PATH', () => {
    // This sentence was Milla's voice, to a paying client, on the one door they use to change
    // their targeting — printed whenever a JSON.parse failed.
    expect(route).not.toContain('Tell me more about who you want to target — industry, job title, company size, location?')
    expect(route, 'the JSON contract is back').not.toContain('valid JSON')
    expect(route, 'model text is being parsed again').not.toContain('JSON.parse')
  })

  it('🛑 SHE PROPOSES THROUGH A TOOL, and her sentence is separate from it', () => {
    expect(route).toContain("name: 'propose_targeting'")
    expect(route).toContain("response.content.filter(b => b.type === 'text')")
    expect(route).toContain("response.content.find(b => b.type === 'tool_use')")
  })

  it('🛑 AND THE SERVER SIDE DID NOT MOVE — clear_fields is still fail-closed', () => {
    // The allowlist is what stops "remove this filter" being anything the model says it is.
    expect(route).toContain('CLEARABLE_ICP_FIELDS as readonly string[]')
    expect(route).toContain('clear_fields')
  })

  it('🛑 NO RAW SCHEMA ERROR REACHES A CUSTOMER, on this door either', () => {
    expect(route, 'the raw Zod issue array is back').not.toContain('error: err.errors')
    expect(route).toContain('zod_paths')
  })

  it('the retired guard module stayed retired', () => {
    expect(existsSync(join(REPO, 'apps/api/src/lib/brief-truth-guards.ts'))).toBe(false)
  })
})
