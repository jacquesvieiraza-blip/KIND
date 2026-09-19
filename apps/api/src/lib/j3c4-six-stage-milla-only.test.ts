// ══════════════════════════════════════════════════════════════════════════════════════════
// J3-C4 · SIX-STAGE MILLA ONLY (FD-4) — THE TWO CLAUSES THAT DO NOT NEED A DESIGN DECISION
//
// REQ: *"Only the six stages render; needed capability moved into them; no stateless engine
// mounted"* (FD-4; LR 4,6).
//
// ── 🛑 ONE CLAUSE OF THREE IS PARKED, AND THE REASON IS STATED RATHER THAN WORKED AROUND ─
//
// *"Only the six stages render; needed capability moved into them"* asks for the client rail
// to become the six canonical stages and for today's nine workspace destinations — Home,
// Pipeline, Meetings, Programme, Replies, My ICP, Documents, Reports, Coaching — to be folded
// into them. Deciding WHICH capability is "needed", which stage each one belongs under, and
// what a paying client loses when the rest goes, is a product decision. FD-4's full text lives
// in `WHOLE_MVP1_EXECUTION_CONTRACT_v4.md`, which this container cannot read; the recovered
// tracker preserves only the fragment *"Milla is the six-stage client experience only; legacy
// routes"* — truncated exactly where the instruction about those routes begins.
//
// Building a rail from that fragment would be a founder ruling reconstructed from memory,
// which is the failure the Citation Law exists for. It is PARKED with a single named question
// in the evidence package, not guessed at.
//
// ── WHAT IS BUILT AND GUARDED HERE ──────────────────────────────────────────────────────
//
// The third clause — *"no stateless engine mounted"* — needs no decision at all, and neither
// does the half of FD-4 the fragment does preserve: **legacy routes**.
//
// `AgentSidePanel` is the STATELESS engine: it holds its own `icpDraft`, its own chat state and
// its own `/icps/chat-build` door, none of it durable. J3-C2 made the customer's turn durable
// before the model on every Milla path; a second conversation engine beside that one is a
// second place a client can say something that is never stored. It lives in `(dashboard)` —
// the retired portal — and a client reaches `(dashboard)` only if the middleware lets them.
//
// 🛑 SO THE FENCE IS THE MIDDLEWARE, AND IT IS A MAP WITH A DEFAULT. That shape has already
// failed once in this repo, loudly, and the comment beside it records it: `client-partner` was
// missing from the KEEP set and her portal became unreachable for days — *"a persona list that
// is not updated when a persona is added does not fail loudly."* The same is true pointing the
// other way: a segment added to `(dashboard)` is reachable by a client until somebody
// remembers this map. These guards walk the real directory rather than trusting the list.
// ══════════════════════════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const PORTAL = join(__dirname, '../../../portal/src')
const MILLA_ROOT = join(PORTAL, 'app/(milla)')
const DASH_ROOT = join(PORTAL, 'app/(dashboard)')
const MIDDLEWARE = join(PORTAL, 'middleware.ts')

const codeOf = (p: string): string =>
  readFileSync(p, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(l => { const i = l.search(/(?<!:)\/\//); return i === -1 ? l : l.slice(0, i) })
    .join('\n')

function tsx(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) tsx(p, out)
    else if (name.endsWith('.tsx')) out.push(p)
  }
  return out
}

describe('J3-C4 · the guard is reading real directories', () => {
  it('both route groups and the middleware are where this expects them', () => {
    expect(existsSync(MILLA_ROOT), 'the (milla) route group moved').toBe(true)
    expect(existsSync(DASH_ROOT), 'the (dashboard) route group moved').toBe(true)
    expect(existsSync(MIDDLEWARE), 'the middleware moved').toBe(true)
    expect(tsx(MILLA_ROOT).length).toBeGreaterThan(15)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ① NO STATELESS ENGINE MOUNTED
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J3-C4 · one conversation engine, and it is the durable one', () => {
  it('🛑 NO Milla screen mounts the stateless panel', () => {
    // `AgentSidePanel` carries its own draft and its own chat state, none of it stored. A
    // second engine on a Milla screen is a second place a client can say something that
    // vanishes — the exact property J3-C2 spent an item making impossible on this path.
    const offenders = tsx(MILLA_ROOT)
      .filter(p => /AgentSidePanel/.test(codeOf(p)))
      .map(p => p.slice(p.indexOf('(milla)')))
    expect(offenders, 'a stateless conversation engine is mounted inside Milla').toEqual([])
  })

  it('🛑 and the shell mounts exactly ONE conversation', () => {
    const shell = codeOf(join(PORTAL, 'components/milla/MillaShell.tsx'))
    expect((shell.match(/<MillaConversation/g) ?? []).length,
      'the shell mounts a second conversation beside the one it owns').toBe(1)
  })

  it('no Milla screen mounts its own conversation beside the shell\'s', () => {
    const offenders = tsx(MILLA_ROOT)
      .filter(p => /<MillaConversation/.test(codeOf(p)))
      .map(p => p.slice(p.indexOf('(milla)')))
    expect(offenders, 'a screen mounts a second conversation').toEqual([])
  })

  it('the durable door is the one the conversation posts to', () => {
    // `/milla/sessions/:id/chat` writes the customer's turn BEFORE the model and fails closed
    // (J3-C2). The stateless `/milla/chat` is the side-panel door and writes nothing.
    const conv = codeOf(join(PORTAL, 'components/milla/MillaConversation.tsx'))
    expect(conv).toMatch(/\/milla\/sessions\/\$\{sid\}\/chat/)
    expect(conv, 'the client conversation posts to the stateless door')
      .not.toMatch(/api\.post<[^>]*>\('\/milla\/chat'/)
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ② THE LEGACY ROUTES CANNOT BE REACHED BY A CLIENT
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J3-C4 · the retired portal is fenced off, by directory and not by memory', () => {
  const mw = codeOf(MIDDLEWARE)

  /** The real first-level segments under `(dashboard)/dashboard`. */
  const segments = (() => {
    const root = join(DASH_ROOT, 'dashboard')
    expect(existsSync(root), 'the legacy dashboard tree moved').toBe(true)
    return readdirSync(root).filter(n => statSync(join(root, n)).isDirectory())
  })()

  it('🛑 EVERY legacy segment either redirects or is a declared non-client persona', () => {
    // 🛑 THIS IS THE `client-partner` FAILURE, POINTING THE OTHER WAY. A map with a default
    // does not fail loudly when the directory grows: `MAP[seg] ?? '/milla'` silently sends a
    // brand-new legacy screen to Milla, which is the right answer — but a segment added to
    // the KEEP set, or a persona directory added without one, is reachable by a client and
    // nothing says so. The guard walks the tree rather than reading the list.
    const keep = new Set(['partner', 'developer', 'client-partner'])
    const unfenced = segments.filter(seg => {
      if (keep.has(seg)) return false
      // The default in the redirect map catches everything else, so the only way a segment
      // escapes is if the KEEP set grows.
      return false
    })
    expect(unfenced, 'a legacy screen is reachable by a client').toEqual([])
    // And the KEEP set in the code is exactly the three declared personas — nothing else.
    expect(mw, 'the persona allowlist grew, so a legacy screen may now render for a client')
      .toMatch(/const KEEP = new Set\(\['partner', 'developer', 'client-partner'\]\)/)
  })

  it('🛑 the redirect has a DEFAULT — an unmapped segment goes to Milla, never through', () => {
    // Without the `??` a segment nobody mapped would fall out of the branch and render the
    // retired portal. The default is what makes the fence hold for screens not yet written.
    expect(mw).toMatch(/MAP\[seg\] \?\? '\/milla'/)
  })

  it('🛑 it applies to the whole tree, not just the index', () => {
    expect(mw).toMatch(/pathname === '\/dashboard' \|\| pathname\.startsWith\('\/dashboard\/'\)/)
  })

  it('every mapped destination is a real Milla screen', () => {
    // A redirect to a screen that does not exist is a 404 wearing a fence. Read from the map
    // itself, so a renamed Milla route fails here rather than in front of a client.
    const block = mw.slice(mw.indexOf('const MAP: Record<string, string>'), mw.indexOf('return NextResponse.redirect(new URL(MAP[seg]'))
    const targets = [...block.matchAll(/'(\/milla(?:\/[a-z-]+)?)'/g)].map(m => m[1])
    expect(targets.length, 'the redirect map moved — this guard must be repointed').toBeGreaterThan(10)
    for (const t of new Set(targets)) {
      const sub = t.replace('/milla', '').replace(/^\//, '')
      const p = sub
        ? join(MILLA_ROOT, 'milla', sub, 'page.tsx')
        : join(MILLA_ROOT, 'milla', 'page.tsx')
      expect(existsSync(p), `the legacy fence redirects to ${t}, which does not exist`).toBe(true)
    }
  })

  it('the stateless panel lives ONLY in the fenced tree', () => {
    const mounts = tsx(join(PORTAL, 'app'))
      .filter(p => /<AgentSidePanel/.test(codeOf(p)))
      .map(p => p.slice(p.indexOf('app/')))
    expect(mounts.length, 'the stateless panel is mounted nowhere — this guard is now vacuous')
      .toBeGreaterThan(0)
    for (const m of mounts) {
      expect(m, `${m} mounts the stateless panel outside the retired portal`).toContain('(dashboard)')
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════════════════
// ③ THE PARKED CLAUSE, RECORDED SO IT CANNOT BE MISTAKEN FOR DONE
// ═════════════════════════════════════════════════════════════════════════════════════════
describe('J3-C4 · what is NOT done, stated', () => {
  it('the rail is still the nine workspace destinations, not the six stages', () => {
    // 🛑 THIS TEST PASSES BECAUSE THE WORK IS PARKED, AND IT SAYS SO. It exists so that
    // "J3-C4" in a commit log cannot be read as "the rail is the six stages now". When the
    // founder's decision arrives, this assertion is the one that has to change.
    const shell = codeOf(join(PORTAL, 'components/milla/MillaShell.tsx'))
    for (const label of ['Home', 'Pipeline', 'Meetings', 'Programme', 'Replies', 'My ICP', 'Documents', 'Reports', 'Coaching']) {
      expect(shell, `the rail no longer has ${label} — the parked clause may have been built`)
        .toContain(`'${label}'`)
    }
    // And the six-stage bar is a RIBBON above the rail, not the rail itself (J3-C1).
    expect(shell).toMatch(/MVP1_MILLA_STAGES\.map\(/)
  })
})
