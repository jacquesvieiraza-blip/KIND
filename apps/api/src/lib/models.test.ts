import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { CONVERSATION_MODEL, BACKGROUND_MODEL, AI_TURN_BOUND } from './models'

// ═══════════════════════════════════════════════════════════════════════════════════════
// BUILD 0 — THE MODEL SPLIT IS A RULE, SO IT IS A TEST. (Founder-ruled 14 Sep.)
//
// 🛑 WHAT THIS PROTECTS. "sonnet on every human facing surface" is not a one-time edit — it
// is a property the repo has to keep. Before this, the model id was typed by hand at 46
// sites across 25 files, so the answer to "what does Milla run on?" was a grep and the
// answer to "did we miss one?" was nobody's job.
//
// ⚠️ IT ASSERTS BOTH DIRECTIONS, and the second is the one that costs money. Every
// conversational surface must read `CONVERSATION_MODEL`; every background job must NOT — a
// batch scorer quietly moved onto the conversational model is a bill nobody decided to pay,
// and it would pass a test that only checked the first half.
//
// ⚠️ AND IT IS A SOURCE PIN BY NECESSITY. There is no way to observe which model a route
// would send without calling Anthropic, so this reads the routes as text. The counterpart
// that proves the value actually reaches the provider is the live eval, which is RUNTIME.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()

/** Every .ts under a directory — so a new route cannot dodge the rule by being new. */
function readdirDeep(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...readdirDeep(full))
    else out.push(full)
  }
  return out
}
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

/** Comment lines are stripped: this repo QUOTES retired code in `⛓️` notes, and a quoted
 *  model id in a comment is history, not a call site. */
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

/**
 * 🛑 MILLA AND VIDA. THAT IS THE WHOLE LIST.
 *
 * ⛓️ 14 Sep — THIS LIST USED TO BE CALLED `HUMAN_FACING` AND HELD EIGHT FILES, adding Casey,
 * Denise, FIGSY and Support on the reasoning that a human waits on those replies too. The
 * founder's ruling is narrower and is now explicit: "MILLA = SONNET. VIDA = SONNET. THE OTHER
 * PARTS = HAIKU… Do not reinterpret 'human-facing' broadly." Four surfaces were moved back.
 *
 * ⚠️ THE BREADTH OF THIS LIST IS A COST DECISION AND IT IS HIS. Adding a file here is not a
 * technical tidy-up; it is spending his money on a surface he did not name.
 */
const MILLA_AND_VIDA: Array<[string, string]> = [
  ['apps/api/src/routes/icps.ts',     'Milla onboarding (builder/chat) and Milla targeting (chat-build)'],
  ['apps/api/src/lib/milla.ts',       'Milla concierge — the desk chat'],
  // ⛓️ 18 Sep (D-63) — ~~`['apps/api/src/routes/milla.ts', 'Milla concierge — the side-panel
  // door']`~~. THE SIDE-PANEL DOOR IS UNMOUNTED, so there is no conversational call in that
  // file to hold to the founder's ruling. Milla's remaining surfaces — the desk chat
  // (`lib/milla.ts`) and onboarding/targeting (`routes/icps.ts`) — are still listed above,
  // and `routes/milla.ts`'s only model call now is the Notetaker, which is background work an
  // operator never waits on. Removing the row LOOSENS nothing: the file is asserted below to
  // carry no conversational model at all.
  ['apps/api/src/routes/operator.ts', "Vida — the operator's colleague (/command and /icp/chat)"],
]

/**
 * 🛑 WORK NOBODY IS WAITING ON. These must stay on the background model.
 *
 * ⚠️ THE TWO PROSPECT-FACING WRITERS ARE HERE ON PURPOSE, NOT BY OVERSIGHT. FIGSY's sequence
 * and campaign writers and Denise's follow-up/proposal drafts produce text a prospect will
 * eventually read, which makes them a reasonable candidate for the conversational model —
 * and NO FOUNDER RULING COVERS THEM. Moving them quietly would be deciding a cost question
 * on his behalf; this list is what keeps that decision his, and the build reported it as an
 * open question rather than answering it.
 */
const NOT_MILLA_NOT_VIDA: Array<[string, string]> = [
  ['apps/api/src/routes/casey.ts',   'Casey chat — a human reads it, and the founder still ruled Haiku'],
  ['apps/api/src/routes/denise.ts',  'Denise chat — same ruling'],
  ['apps/api/src/routes/figsy.ts',   'FIGSY chat — same ruling'],
  ['apps/api/src/routes/support.ts', 'Support chat — same ruling'],
  ['apps/api/src/lib/vida.ts',       "the website chat widget — a visitor on a CLIENT's site, not the operator's Vida"],
  ['apps/api/src/lib/scoring.ts',           'lead scoring'],
  ['apps/api/src/lib/scrape.ts',            'website reading'],
  ['apps/api/src/lib/linkedin.ts',          'LinkedIn processing'],
  ['apps/api/src/lib/whatsapp.ts',          'WhatsApp processing'],
  ['apps/api/src/lib/figsy.ts',             'FIGSY sequence/email writers — OPEN QUESTION, unruled'],
  ['apps/api/src/lib/denise.ts',            'Denise follow-up/proposal drafts — OPEN QUESTION, unruled'],
  ['apps/api/src/routes/founder.ts',        'founder cockpit / Nora'],
  ['apps/api/src/routes/internal.ts',       'internal tooling'],
  ['apps/api/src/routes/internal-briefs.ts','internal briefs'],
  ['apps/api/src/routes/mcp.ts',            'MCP tooling'],
  ['apps/api/src/routes/leads.ts',          'lead enrichment and batch work'],
  ['apps/api/src/routes/clients.ts',        'client batch work'],
  ['apps/api/src/routes/figsy-tasks.ts',    'FIGSY background tasks'],
  // ⛓️ 18 Sep (D-63) — `routes/milla.ts` MOVED HERE FROM THE CONVERSATIONAL LIST. Its only
  // remaining model call is the Notetaker, which chews a transcript into action items with
  // nobody waiting on the reply. The conversational door that put this file on the other list
  // is unmounted, and this row is what makes that a CLASSIFICATION rather than a deletion:
  // the file is still checked, against the rule that now applies to it.
  ['apps/api/src/routes/milla.ts',          'the Notetaker — a transcript, no one waiting'],
]

describe('🛑 MILLA = SONNET · VIDA = SONNET · EVERYTHING ELSE = HAIKU (founder-ruled)', () => {
  it('the two constants are the two the founder ruled', () => {
    expect(CONVERSATION_MODEL).toBe('claude-sonnet-5')
    expect(BACKGROUND_MODEL).toBe('claude-haiku-4-5-20251001')
    expect(CONVERSATION_MODEL).not.toBe(BACKGROUND_MODEL)
  })

  for (const [file, why] of MILLA_AND_VIDA) {
    it(`🛑 ${file} CALLS the model with the shared constant — ${why}`, () => {
      // ⛓️ 14 Sep — THIS USED TO BE `toContain('CONVERSATION_MODEL')` AND IT DID NOT BITE.
      // A tooth that changed `model: CONVERSATION_MODEL` to a hand-typed Haiku id in
      // `lib/milla.ts` left the IMPORT line untouched, so the file still "contained" the
      // string and the guard passed while Milla ran on the wrong model. Importing a constant
      // is not using it. The assertion is now on the USE.
      const src = live(read(file))
      expect(src, `${file} imports the conversational model but never calls with it`)
        .toMatch(/(?:model:\s*|=\s*)CONVERSATION_MODEL\b/)
    })
  }

  it('🛑 AND A MILLA/VIDA FILE NEVER HAND-TYPES A MODEL ON A CONVERSATIONAL CALL', () => {
    // These files legitimately hold background work too, so a Haiku literal is allowed — but
    // it must be reached through `BACKGROUND_MODEL` or be a genuine batch call. What may never
    // happen is a conversational entry point naming its own model, which is how the 46
    // hand-written ids happened in the first place.
    for (const [file] of MILLA_AND_VIDA) {
      const src = live(read(file))
      expect(src, `${file} hand-types the conversational model`).not.toContain(`'${CONVERSATION_MODEL}'`)
    }
  })

  it('🛑 NOBODY HAND-TYPES THE CONVERSATIONAL MODEL — it has one home or it has none', () => {
    // ⛓️ THE FIRST VERSION OF THIS ASSERTION WAS WRONG, and the four files it failed on are
    // why it is worth writing down: `icps.ts`, `milla.ts`, `operator.ts` and `figsy.ts` each
    // carry a human conversation AND background work in the same file, so a hand-typed HAIKU
    // id in them is correct — it is the batch job, not a missed surface. "No literal in a
    // human-facing file" was a property this repo does not have and should not have.
    //
    // 🛑 WHAT IS ACTUALLY TRUE, and is the regression worth catching: the conversational
    // model may never be typed inline. Typed once it can be typed twice, and the second copy
    // is how the 46 hand-written ids happened. Background work may name its own model
    // literally — that is the status quo and the founder's "background stays Haiku".
    const files = readdirDeep(join(REPO, 'apps/api/src'))
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('/models.ts'))
    const offenders: string[] = []
    for (const f of files) {
      if (live(readFileSync(f, 'utf8')).includes(`'${CONVERSATION_MODEL}'`)) {
        offenders.push(f.slice(REPO.length + 1))
      }
    }
    expect(offenders, `these hand-type the conversational model instead of importing it: ${offenders.join(', ')}`)
      .toHaveLength(0)
  })

  for (const [file, why] of NOT_MILLA_NOT_VIDA) {
    it(`${file} stays on the background model — ${why}`, () => {
      const src = live(read(file))
      expect(src, `${file} moved to the conversational model — that is a cost decision, and it is the founder's`)
        .not.toContain('CONVERSATION_MODEL')
    })
  }

  it('🛑 the conversational routes BOUND their model call, so the browser budget is real', () => {
    // ⚠️ WITHOUT THIS THE PORTAL'S 45s IS A COINCIDENCE. The SDK's own default timeout is ten
    // minutes; a browser that walks away while the server waits ten minutes has no arithmetic
    // at all. Every door that carries `AI_TURN_BOUND` is one whose worst case is provable.
    expect(AI_TURN_BOUND.timeout).toBe(30_000)
    // `maxRetries: 0` is not tidiness — the SDK's retry sleeps on `retry-after` for up to
    // nearly 60s BETWEEN attempts, so any retry count makes the worst case unbounded.
    expect(AI_TURN_BOUND.maxRetries, 'an SDK retry makes the worst case unprovable').toBe(0)
    // ⛓️ 18 Sep (D-63) — ~~`'apps/api/src/routes/milla.ts'`~~ LEFT THIS LIST BECAUSE THE CALL
    // IT BOUNDED LEFT THE PRODUCT. The bound exists so a browser's 45s budget is arithmetic
    // rather than coincidence, and that only means anything where a browser is waiting; the
    // stateless door was the one conversational call in that file and it is unmounted. Every
    // surface a person still waits on is below, unchanged.
    for (const file of [
      'apps/api/src/lib/milla.ts',
      'apps/api/src/routes/operator.ts',
    ]) {
      expect(live(read(file)), `${file} calls a model with no bound`).toContain('AI_TURN_BOUND')
    }
  })

  it('🛑 the portal waits longer than the server can take — the arithmetic, both halves', () => {
    const api = read('apps/portal/src/lib/api.ts')
    const m = api.match(/AI_TURN_TIMEOUT_MS\s*=\s*([0-9_]+)/)
    expect(m, 'the portal has no single home for the AI budget').toBeTruthy()
    const browser = Number((m![1]).replace(/_/g, ''))
    // The whole point: the browser must outlast the server, or it throws away replies that
    // were still legitimately coming — which is exactly what the 15s default did.
    expect(browser, 'the browser gives up before the server does').toBeGreaterThan(AI_TURN_BOUND.timeout)
  })

  it('🛑 every portal call that waits on a model passes that budget', () => {
    // ⚠️ NAMED FILES, NOT A PATTERN. A call that forgets the argument silently inherits the
    // 15s default and aborts a healthy Sonnet turn — invisible in review, obvious here.
    for (const file of [
      'apps/portal/src/components/milla/MillaConversation.tsx',
      // ⛓️ 14 Sep (R121, Build 2) — `(milla)/milla/chat/page.tsx` LEFT THIS LIST because it
      // no longer calls a model: it used to build a SECOND transcript against the same
      // session the shell conversation already owned, and it now focuses that one
      // conversation instead. A route that waits on nothing needs no budget.
      'apps/portal/src/app/(milla)/milla/page.tsx',
      'apps/portal/src/components/ui/AgentSidePanel.tsx',
      'apps/portal/src/components/ui/AskFigsyButton.tsx',
      'apps/portal/src/app/(v2)/v2/setup/page.tsx',
    ]) {
      expect(live(read(file)), `${file} waits on a model with the 15s CRUD default`)
        .toContain('AI_TURN_TIMEOUT_MS')
    }
    // The onboarding route is the exception, and it states its own arithmetic.
    expect(read('apps/portal/src/app/(milla)/milla/welcome/page.tsx')).toContain('60_000')
  })

  it('🛑 the operator proxy is bounded too — one hop, every Vida call goes through it', () => {
    const proxy = read('apps/admin/src/app/api/proxy/[...path]/route.ts')
    // ⛓️ 17 Sep (Batch 1 · XC-3) — WAS `toMatch(/AbortSignal\.timeout\(\s*45_000\s*\)/)`. The
    // number is unchanged; it is now a NAMED constant because the operator-facing timeout
    // sentence quotes it, and a literal inline would let the sentence and the bound disagree.
    // Still exactly one bound, still 45s, still asserted on live code.
    expect(live(proxy), 'an unbounded proxy holds the operator on a spinner that resolves into nothing')
      .toMatch(/AbortSignal\.timeout\(\s*UPSTREAM_BOUND_MS\s*\)/)
    expect(live(proxy), 'the bound must still BE 45s').toMatch(/UPSTREAM_BOUND_MS\s*=\s*45_000/)
  })
})
