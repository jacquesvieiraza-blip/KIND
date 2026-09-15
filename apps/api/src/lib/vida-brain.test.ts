import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildVidaSystem, VIDA_TOOLS, readVidaProposal, boundedSourcingCount, VIDA_TABS,
} from './vida-brain'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD 3 — "ASK VIDA ANYTHING" IS A CONVERSATION NOW, AND HER AUTHORITY IS STILL BOUNDED.
//
// 🛑 WHAT SHE WAS. `POST /operator/command` was five regular expressions and a sixth branch
// that told the operator "I'm not sure what you're asking me to do with that. …try 'status'
// or 'what's blocking?'". There was no model anywhere near it. A second regex in the browser
// caught "source N leads" before the server saw it.
//
// ⚠️ THE TWO THINGS THESE PROVE, AND THEY PULL IN OPPOSITE DIRECTIONS:
//   · SHE CAN UNDERSTAND ANYTHING — no keyword decides whether she answers;
//   · SHE CAN ACT ON ALMOST NOTHING — every tool PROPOSES, and the doors that spend money,
//     change targeting or speak to a client are the same doors with the same confirms.
//
// A build that only proved the first would have handed a model the operator's authority.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

const CTX = {
  clientName: 'Northstar Revenue',
  clientId: 'client-a',
  operator: 'jacques@get-kind.com',
  pipeline: { sourced: 250, booked: 0 },
  brief: {
    company_name: 'Northstar Revenue', contact_name: 'Jacques',
    what_they_do: 'B2B sales consultancy', exclusions: 'no recruitment agencies or software companies',
    geographies: ['United Kingdom', 'United States'],
  },
  briefProgress: { count: 9, total: 11, missing: ['exclusions', 'desired outcome'] },
  briefTranscript: [{ role: 'user', content: "I'm Jacques and I run Northstar Revenue." }],
  clientMessages: [{ role: 'user', content: 'when do we see leads?' }],
  icp: { name: 'UK agencies', geographies: ['United Kingdom'] },
}

describe('🛑 BUILD 3 · Vida knows this client, and only this client', () => {
  it('the client she is working on is named, and she is told she can see no other', () => {
    const s = buildVidaSystem(CTX)
    expect(s).toContain('Northstar Revenue')
    expect(s).toContain('You cannot see any other client and must never answer about one')
  })

  it('🛑 she is given the client’s OWN WORDS, which the old engine never had', () => {
    const s = buildVidaSystem(CTX)
    expect(s).toContain("I'm Jacques and I run Northstar Revenue.")
    expect(s).toContain('no recruitment agencies or software companies')
    expect(s).toContain('when do we see leads?')
  })

  it('🛑 NO CROSS-CLIENT LEAK — nothing of client B appears in client A’s prompt', () => {
    const a = buildVidaSystem(CTX)
    const b = buildVidaSystem({
      ...CTX, clientName: 'MBF Holdings', clientId: 'client-b',
      brief: { company_name: 'MBF Holdings', exclusions: 'no estate agents' },
      briefTranscript: [{ role: 'user', content: 'MBF Holdings here, we do property finance.' }],
      clientMessages: [{ role: 'user', content: 'pause everything please' }],
      icp: { name: 'SA property', geographies: ['South Africa'] },
    })
    for (const leak of ['MBF Holdings', 'no estate agents', 'property finance', 'pause everything', 'South Africa']) {
      expect(a, `client B's "${leak}" is in client A's prompt`).not.toContain(leak)
    }
    for (const leak of ['Northstar', 'recruitment agencies', 'when do we see leads', 'UK agencies']) {
      expect(b, `client A's "${leak}" is in client B's prompt`).not.toContain(leak)
    }
  })

  it('🛑 "COULD NOT BE READ" IS SAID OUT LOUD, never rendered as "there is none"', () => {
    // An operator told a client has no Brief, when we merely failed to load it, acts on a
    // fact nobody established. The two states must not look the same to her.
    const unread = buildVidaSystem({ ...CTX, brief: null })
    expect(unread).toContain('could not be read')
    expect(unread).toContain('do not tell the operator it is empty')
    const empty = buildVidaSystem({ ...CTX, brief: {} })
    expect(empty).toContain('nothing recorded yet')
  })

  it('she is told not to invent, and told what she cannot do', () => {
    const s = buildVidaSystem(CTX)
    expect(s).toContain('NEVER INVENT A NUMBER, A DATE, A NAME OR A STATE')
    expect(s).toContain('YOU PROPOSE. THE OPERATOR PRESSES THE BUTTON')
    expect(s).toContain('NO power to send email, charge anything, activate a campaign, press GO')
  })

  it('the kill-switch is stated when it is on, and not implied when it is unknown', () => {
    expect(buildVidaSystem({ ...CTX, outreachEnabled: false })).toContain('SENDING IS OFF')
    expect(buildVidaSystem({ ...CTX, outreachEnabled: null })).not.toContain('SENDING IS OFF')
  })
})

describe('🛑 BUILD 3 · her tools PROPOSE — not one of them acts', () => {
  it('the four tools are the four, and each is a proposal', () => {
    expect(VIDA_TOOLS.map(t => t.name)).toEqual([
      'propose_sourcing', 'propose_icp_change', 'draft_client_ask', 'open_workspace',
    ])
    for (const t of VIDA_TOOLS) {
      expect(t.description, `${t.name} reads like it acts`)
        .toMatch(/confirm|reviews|operator reads|nothing you send here is stored|operator/i)
    }
  })

  it('🛑 NO TOOL TAKES A CLIENT ID — she cannot name a client, so she cannot name the wrong one', () => {
    for (const t of VIDA_TOOLS) {
      const props = Object.keys((t.input_schema as { properties: Record<string, unknown> }).properties)
      for (const p of props) {
        expect(p, `${t.name} accepts ${p}`).not.toMatch(/client/i)
      }
    }
  })

  it('🛑 THERE IS NO TOOL THAT SENDS, CHARGES, ACTIVATES OR PRESSES GO', () => {
    const names = VIDA_TOOLS.map(t => t.name).join(' ')
    for (const forbidden of ['send', 'charge', 'activate', 'go', 'enrol', 'enroll', 'pay', 'approve', 'kill']) {
      expect(names, `a tool named for ${forbidden} would be new authority`)
        .not.toMatch(new RegExp(`\\b\\w*${forbidden}\\w*\\b`, 'i'))
    }
  })

  it('an unknown tool name carries NO proposal — a button nobody designed is worse than none', () => {
    expect(readVidaProposal('propose_sourcing', { count: 20 })).toEqual({ kind: 'propose_sourcing', input: { count: 20 } })
    expect(readVidaProposal('run_sourcing', { count: 20 })).toBeNull()
    expect(readVidaProposal('propose_sourcing', 'twenty')).toBeNull()
    expect(readVidaProposal(null, {})).toBeNull()
  })

  it('🛑 a sourcing count is BOUNDED — it reaches a preview that prices real provider calls', () => {
    expect(boundedSourcingCount(50)).toBe(50)
    expect(boundedSourcingCount(5000)).toBe(200)
    expect(boundedSourcingCount(0)).toBe(20)
    expect(boundedSourcingCount(-3)).toBe(20)
    expect(boundedSourcingCount('lots')).toBe(20)
    expect(boundedSourcingCount(undefined)).toBe(20)
    expect(boundedSourcingCount(7.9)).toBe(7)
  })

  it('the workspaces she can open are the console’s own tabs', () => {
    const tab = VIDA_TOOLS.find(t => t.name === 'open_workspace')!
    const en = ((tab.input_schema as { properties: { tab: { enum: string[] } } }).properties.tab.enum)
    expect(en).toEqual([...VIDA_TABS])
    const console_ = read('apps/admin/src/app/vida/page.tsx')
    for (const t of VIDA_TABS) expect(console_, `${t} is not a console tab`).toContain(`'${t}'`)
  })
})

describe('🛑 BUILD 3 · the keyword router is gone, in both places it lived', () => {
  it('🛑 THE SERVER ROUTES ON NOTHING — no regex over what the operator typed', () => {
    const OP = read('apps/api/src/routes/operator.ts')
    const from = OP.indexOf("operatorRouter.post('/command'")
    const to = OP.indexOf('operatorRouter.', from + 10)
    const route = live(OP.slice(from, to > from ? to : undefined))
    // The five branches that WERE the product, by their own patterns.
    for (const gone of [
      /\(block\|stuck\|waiting/, /\(status\|how\.\?\*/, /\(source\|find\|new lead/,
      /\(sequence\|email\|copy/, /\(icp\|target\|persona/,
    ]) expect(route, `the keyword router is back: ${gone}`).not.toMatch(gone)
    // …and nothing else reads the text either.
    expect(route).not.toMatch(/\blc\s*=\s*q\.toLowerCase\(\)/)
    expect(route).not.toMatch(/\.test\(\s*lc\s*\)/)
    expect(route, 'the "I\'m not sure what you\'re asking" dead end')
      .not.toContain("I'm not sure what you're asking me to do with that")
    // 🛑 AND IT IS ACTUALLY A MODEL NOW.
    expect(route).toContain('buildVidaSystem')
    expect(route).toContain('CONVERSATION_MODEL')
    expect(route).toContain('VIDA_TOOLS')
  })

  it('🛑 THE BROWSER ROUTES ON NOTHING EITHER — parseSourceIntent is deleted', () => {
    const VC = live(read('apps/admin/src/components/vida/VidaConversation.tsx'))
    expect(VC, 'the browser-side language parser is back').not.toContain('function parseSourceIntent')
    expect(VC).not.toMatch(/\(source\|find\|pull\|get\|prospect\)/)
    // The sourcing path is reached by Vida's PROPOSAL, and the preview/confirm is unchanged.
    expect(VC).toContain("proposal?.kind === 'propose_sourcing'")
    expect(VC).toContain('previewSource(')
    expect(VC).toContain('previewProgrammeSource(')
  })

  it('🛑 THE ICP CHAT IS THE SAME VIDA — not a second engine with its own prompt', () => {
    const OP = read('apps/api/src/routes/operator.ts')
    const from = OP.indexOf("operatorRouter.post('/icp/chat'")
    const to = OP.indexOf('operatorRouter.', from + 10)
    const route = live(OP.slice(from, to > from ? to : undefined))
    expect(route).toContain('buildVidaSystem')
    expect(route).toContain('VIDA_TOOLS')
    // ⛓️ The JSON-text extractor and its read-out enum menu are gone.
    expect(route).not.toContain('Reply with ONLY valid JSON')
    expect(route).not.toContain('JSON.parse')
    expect(route).not.toContain('Fintech, Healthtech, E-commerce')
    // 🛑 AND NOTHING IT PROPOSES IS SAVED — the operator still writes the ICP themselves.
    expect(route).not.toMatch(/\.from\('icps'\)[\s\S]{0,200}\.(insert|update|upsert)\(/)
  })

  it('🛑 SHE REMEMBERS — the thread is keyed by operator AND client', () => {
    const OP = read('apps/api/src/routes/operator.ts')
    expect(OP).toContain('vidaConversationFor(operator, cid)')
    expect(OP).toContain('appendVidaConversation(operator, cid,')
    const store = live(read('apps/api/src/lib/vida-conversation.ts'))
    // Both keys on every read and write, or one operator reads another's thread — or worse,
    // one client's conversation is carried into another's.
    expect(store).toContain(".eq('operator', operator).eq('client_id', clientId)")
    expect(store).toContain("onConflict: 'operator,client_id'")
  })

  it('🛑 THE MIGRATION HAS BOTH HOMES AND SORTS LAST', () => {
    const sql = read('supabase/migrations/20260915_vida_conversations.sql')
    expect(sql).toContain('create table if not exists public.vida_conversations')
    expect(sql).toContain('create unique index if not exists vida_conversations_operator_client_idx')
    expect(sql, 'a client must never read what an operator said about them')
      .toContain('enable row level security')
    const pending = read('apps/api/src/lib/pending-migrations.ts')
    expect(pending).toContain("key: '20260915_vida_conversations'")
  })
})
