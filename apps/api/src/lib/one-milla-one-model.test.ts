import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// O1 + O2 — THE TWO WAYS THE FOUNDATION WAS STILL BEING UNDERCUT BY SOMETHING REACHABLE.
//
// 🛑 O1 — A SECOND MILLA, STILL REACHABLE. `POST /milla/chat` is stateless: ten turns of
// browser history in, an answer out, nothing stored. `AgentColumn` handed it to the Milla
// card as `liveChatEndpoint`, and the middleware redirects every signed-in `/dashboard/*`
// request to `/milla/*` EXCEPT `partner`, `developer` and `client-partner` — while
// `/billing/confirm` sits in the same route group with no `/dashboard` prefix at all. Four
// URL families still render that column, so four ways in still existed to a Milla who
// remembered nothing and lost every word when the tab closed.
//
// 🛑 O2 — FIGSY COULD ESCAPE TO SONNET BY DATA. `MODEL_MAP[modelPreference ?? 'haiku']` let a
// row in `campaigns` overrule "THE OTHER PARTS = HAIKU". Any authenticated client could set
// it through `PATCH /figsy/campaigns/:id`.
//
// ⚠️ BOTH ARE ASSERTED AT THE MECHANISM, not at a comment. O1 reads the component that
// chooses the endpoint and the middleware that decides reachability; O2 executes the real
// generator and reads which model it asked for.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

// ═══════════════════════════════════════════════════════════════════════════════════════
// O1
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('🛑 O1 · there is one Milla, and no reachable route offers a second', () => {
  const COLUMN = 'apps/portal/src/app/(dashboard)/AgentColumn.tsx'

  it('O1 no UI hands the stateless Milla endpoint to a chat panel', () => {
    // The panel posts to whatever `liveChatEndpoint` it is given (AgentSidePanel:154) and
    // stores nothing. Milla must never be given one.
    const col = live(read(COLUMN))
    const millaBlock = col.slice(col.indexOf('agentId="milla"'), col.indexOf('agentId="vida"'))
    expect(millaBlock, 'the Milla card can post to a stateless chat again')
      .not.toContain('liveChatEndpoint')

    // …and nothing anywhere else in the portal posts to it either.
    for (const f of [
      'apps/portal/src/app/(dashboard)/AgentColumn.tsx',
      'apps/portal/src/components/ui/AgentSidePanel.tsx',
      'apps/portal/src/components/milla/MillaConversation.tsx',
      'apps/portal/src/app/(milla)/milla/chat/page.tsx',
    ]) {
      expect(live(read(f)), `${f} posts to the stateless Milla door`)
        .not.toMatch(/['"]\/milla\/chat['"]\s*[,)]/)
    }
  })

  it('O1 🛑 THE FOUR SURVIVING (dashboard) ROUTE FAMILIES ARE STILL REACHABLE — this is why it mattered', () => {
    // ⚠️ THE GUARD IS NOT "the redirect hides it". It does not. This asserts the exact set
    // the middleware lets through, so if somebody widens that set the reasoning above is
    // re-read rather than silently outgrown.
    const mw = live(read('apps/portal/src/middleware.ts'))
    expect(mw).toContain("const KEEP = new Set(['partner', 'developer', 'client-partner'])")
    // And `/billing/confirm` is in the (dashboard) group WITHOUT a /dashboard prefix, so the
    // redirect never sees it at all.
    expect(() => read('apps/portal/src/app/(dashboard)/billing/confirm/page.tsx')).not.toThrow()
  })

  it('O1 the canonical persisted conversation is untouched and still the one door', () => {
    const conv = live(read('apps/portal/src/components/milla/MillaConversation.tsx'))
    // One provider, one transcript, posting to the PERSISTED session route.
    expect(conv).toMatch(/\/milla\/sessions\/\$\{sid\}\/chat/)
    const shell = live(read('apps/portal/src/components/milla/MillaShell.tsx'))
    expect((shell.match(/<MillaConversationProvider/g) ?? [])).toHaveLength(1)
    // The route page still only focuses it; it does not build its own.
    const page = live(read('apps/portal/src/app/(milla)/milla/chat/page.tsx'))
    expect(page).toContain('useMillaConversation')
    expect(page, 'a second transcript is back').not.toContain('setMessages')
  })

  it('O1 the panel falls back to navigation, and no replacement chat was added', () => {
    const panel = live(read('apps/portal/src/components/ui/AgentSidePanel.tsx'))
    // Pre-existing behaviour, unchanged by this ticket: no endpoint → hand off to onSend.
    expect(panel).toContain('if (!isFigsyLive && !liveChatEndpoint) { onSend(msg); return }')
    const col = live(read('apps/portal/src/app/(dashboard)/AgentColumn.tsx'))
    const millaBlock = col.slice(col.indexOf('agentId="milla"'), col.indexOf('agentId="vida"'))
    expect(millaBlock).toContain('onSend=')
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// O2
// ═══════════════════════════════════════════════════════════════════════════════════════

const box = vi.hoisted(() => ({ lastModel: null as unknown, calls: 0 }))
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: async (p: Record<string, unknown>) => {
        box.calls += 1
        box.lastModel = p.model
        // Enough JSON for the generator to parse a one-step sequence.
        return { content: [{ type: 'text', text: '{"step1":{"subject":"s","body":"b"}}' }] }
      },
    }
  },
}))
// 🛑 THE MEMORY ROW IS REAL, AND IT HAS TO BE.
//
// ⛓️ A FIRST CUT OF THIS TEST WAS VACUOUS AND ONLY A SENTINEL CAUGHT IT. With no
// `figsy_memory` row, `generateSequenceWithMemory` returns early into the plain
// `generateSequence`, which has its own Haiku literal — so the test watched a DIFFERENT
// function, saw Haiku, and passed no matter what the line under test said. Replacing
// `FIGSY_MODEL` with a sentinel proved the observed call was never the one being guarded.
//
// The gate is `!memory || total_sent_all_time < 20`, so the row below carries 500.
vi.mock('@kind/db', () => ({
  db: {
    from: (table: string) => {
      const q: Record<string, unknown> = {
        select: () => q, eq: () => q, in: () => q, order: () => q, limit: () => q,
        insert: () => q, update: () => q, upsert: () => q,
        async maybeSingle() {
          if (table === 'figsy_memory') {
            return { data: {
              best_subject_lines: ['a'], avg_reply_rate_30d: 4, total_sent_all_time: 500,
              last_winning_angle: 'x', episodic_memory: null, longterm_memory: null,
              preference_memory: null,
            }, error: null }
          }
          return { data: null, error: null }
        },
        async single() { return { data: null, error: null } },
        then(r: (v: unknown) => unknown) { return Promise.resolve({ data: [], error: null }).then(r) },
      }
      return q
    },
    rpc: async () => ({ data: null, error: null }),
  },
}))

beforeEach(() => { box.lastModel = null; box.calls = 0 })

describe('🛑 O2 · FIGSY cannot escape to Sonnet, by data or otherwise', () => {
  it('O2 the sonnet branch is gone from the source', () => {
    const src = live(read('apps/api/src/lib/figsy.ts'))
    expect(src, 'MODEL_MAP is back').not.toContain('MODEL_MAP')
    expect(src, 'a Sonnet id is back in FIGSY').not.toMatch(/'claude-sonnet[^']*'/)
    expect(src).toContain('const FIGSY_MODEL = BACKGROUND_MODEL')
  })

  it('O2 🛑 A CAMPAIGN ASKING FOR SONNET STILL GETS HAIKU — executed, not read', async () => {
    const { generateSequenceWithMemory } = await import('./figsy')
    const { BACKGROUND_MODEL, CONVERSATION_MODEL } = await import('./models')
    for (const pref of ['sonnet', 'haiku', undefined, '', 'SONNET', 'anything']) {
      box.lastModel = null
      try {
        await generateSequenceWithMemory(
          { id: 'l1', first_name: 'A', last_name: 'B', company: 'C', job_title: 'D', email: 'e@f.g' } as never,
          'client-1', 'Redmayne & Co.', null, 'book calls', pref as never,
        )
      } catch { /* the generator may bail for other reasons; the MODEL it asked for is the claim */ }
      if (box.lastModel !== null) {
        expect(box.lastModel, `model_preference=${JSON.stringify(pref)} reached ${String(box.lastModel)}`)
          .toBe(BACKGROUND_MODEL)
        expect(box.lastModel).not.toBe(CONVERSATION_MODEL)
      }
    }
    expect(box.calls, 'the generator never called a model — the assertion proved nothing')
      .toBeGreaterThan(0)
  })

  it('O2 the stored column is untouched — inert, not migrated away', () => {
    // ⚠️ THE LEAST DESTABILISING FIX. No migration, no backfill, no change to the writer: a
    // campaign still stores whatever it stored, the value simply no longer selects a model.
    const routes = live(read('apps/api/src/routes/figsy.ts'))
    expect(routes, 'the model_preference writer was removed — that is a schema change nobody asked for')
      .toContain('model_preference')
    expect(() => read('supabase/migrations/20260531_campaign_model_preference.sql')).not.toThrow()
  })
})
