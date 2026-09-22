import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE MAP — every Milla and Vida path, pinned as assertions. (R121 · 14 Sep.)
//
// ── WHY THIS FILE EXISTS, AND WHY IT IS A TEST RATHER THAN A DOCUMENT ──────────────────
//
// 🛑 THREE ROUNDS OF THIS CORRECTION ENDED THE SAME WAY: real fixes, a thin report, and
// "done" declared by the builder. Each round the audit lived only in a chat message, so the
// next round had to redo it from nothing and the gaps between the fixes were invisible. The
// country parser was deleted while a nineteen-word list in the website widget survived —
// because nobody was holding a list of every place customer language was being read.
//
// 🛑 A DOCUMENT DRIFTS FROM THE CODE. A TEST CANNOT. The inventories below ARE the audit,
// and they are executed: if somebody adds a model call, a chat door, a canned sentence or a
// regex over customer words, the inventory no longer matches the repository and this file
// goes red. The map is therefore true on every run, not on the day it was written.
//
// ⚠️ IT IS A SOURCE PIN BY NECESSITY. There is no way to observe which model a route sends,
// or which sentence a customer sees, without calling Anthropic and a browser. This reads the
// repository as text. Its counterpart is the live eval (REAL MODEL) and the founder's own
// preview walk (RUNTIME) — both of which remain unproven until they are actually run.
// ═══════════════════════════════════════════════════════════════════════════════════════

const REPO = process.cwd()
const read = (p: string) => readFileSync(join(REPO, p), 'utf8')

/** Comment lines out. This repo QUOTES retired code in `⛓️` notes on purpose, so a struck
 *  model id or a deleted sentence lives on in the note that records its deletion. A guard
 *  that failed on its own epitaph would teach the next person to delete the history. */
const live = (src: string) =>
  src.split('\n').filter(l => {
    const t = l.trimStart()
    return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*')
  }).join('\n')

function walk(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...walk(full))
    else if (full.endsWith('.ts') && !full.endsWith('.test.ts') && !full.endsWith('.eval.ts')) out.push(full)
  }
  return out
}
const API_FILES = walk(join(REPO, 'apps/api/src')).map(f => f.slice(REPO.length + 1))

// ═══════════════════════════════════════════════════════════════════════════════════════
// M1 — EVERY MODEL CALL, CLASSIFIED
// ═══════════════════════════════════════════════════════════════════════════════════════

type Klass = 'MILLA' | 'VIDA' | 'OTHER'

/**
 * 🛑 THE INVENTORY IS THE TEST DATA. Every `messages.create(` in the API is listed here with
 * the surface it serves. A new call that is not listed fails M1, which is the point: the
 * question "is this Milla, Vida, or neither?" gets answered here, out loud, by whoever adds
 * it — rather than inside a pull request nobody read.
 *
 * ⚠️ THE WEBSITE WIDGET (`lib/vida.ts`) IS `OTHER` PENDING A FOUNDER DECISION. Its schema
 * calls it Vida; the founder's words were "Vida. is a conversation for the operator. we dont
 * have a client help bubble". Classifying it MILLA or VIDA here would decide his cost
 * question by the back door.
 */
const MODEL_CALLS: Array<{ file: string; line: number; surface: string; klass: Klass }> = [
  // ── MILLA — the client's colleague ────────────────────────────────────────────────────
  { file: 'apps/api/src/lib/milla.ts',      line: 272,  surface: 'Milla desk chat — lib chat()',            klass: 'MILLA' },
  // ⛓️ 18 Sep (D-63) — ~~`{ routes/milla.ts, 517, 'POST /milla/chat (stateless door)', MILLA }`~~
  // LEFT THIS INVENTORY BECAUSE THE DOOR LEFT THE PRODUCT. It is not reclassified and not
  // silently dropped: the route is unmounted, so it makes no model call to classify. That it
  // STAYS gone is asserted below rather than left to the absence of a row here.
  { file: 'apps/api/src/routes/icps.ts',    line: 2781, surface: 'POST /icps/chat-build (targeting)',       klass: 'MILLA' },
  { file: 'apps/api/src/routes/icps.ts',    line: 3995, surface: 'POST /icps/builder/chat (onboarding)',    klass: 'MILLA' },
  // ── VIDA — the operator's colleague ───────────────────────────────────────────────────
  { file: 'apps/api/src/routes/operator.ts', line: 1240, surface: 'POST /operator/icp/chat',                klass: 'VIDA' },
  { file: 'apps/api/src/routes/operator.ts', line: 4649, surface: 'POST /operator/command',                 klass: 'VIDA' },
  // ── OTHER — background, batch, prospect-facing writers, and the unruled surfaces ──────
  { file: 'apps/api/src/lib/scoring.ts',     line: 176,  surface: 'lead scoring',                           klass: 'OTHER' },
  { file: 'apps/api/src/lib/linkedin.ts',    line: 18,   surface: 'LinkedIn note',                          klass: 'OTHER' },
  { file: 'apps/api/src/lib/denise.ts',      line: 141,  surface: 'Denise follow-up draft',                 klass: 'OTHER' },
  { file: 'apps/api/src/lib/denise.ts',      line: 175,  surface: 'Denise proposal draft',                  klass: 'OTHER' },
  { file: 'apps/api/src/lib/denise.ts',      line: 222,  surface: 'Denise meeting prep',                    klass: 'OTHER' },
  { file: 'apps/api/src/lib/vida.ts',        line: 127,  surface: 'website chat widget reply — UNRULED',    klass: 'OTHER' },
  { file: 'apps/api/src/lib/vida.ts',        line: 180,  surface: 'website chat session score',             klass: 'OTHER' },
  { file: 'apps/api/src/lib/scrape.ts',      line: 51,   surface: 'website read',                           klass: 'OTHER' },
  { file: 'apps/api/src/lib/figsy.ts',       line: 339,  surface: 'FIGSY sequence writer',                  klass: 'OTHER' },
  { file: 'apps/api/src/lib/figsy.ts',       line: 422,  surface: 'FIGSY reply classifier',                 klass: 'OTHER' },
  { file: 'apps/api/src/lib/figsy.ts',       line: 1552, surface: 'FIGSY counters',                         klass: 'OTHER' },
  { file: 'apps/api/src/lib/figsy.ts',       line: 2018, surface: 'FIGSY sequence with memory',             klass: 'OTHER' },
  { file: 'apps/api/src/lib/whatsapp.ts',    line: 140,  surface: 'WhatsApp classify',                      klass: 'OTHER' },
  { file: 'apps/api/src/routes/milla.ts',    line: 572,  surface: 'POST /milla/notetaker (batch)',          klass: 'OTHER' },
  { file: 'apps/api/src/routes/internal-briefs.ts', line: 267, surface: 'internal briefs',                  klass: 'OTHER' },
  { file: 'apps/api/src/routes/denise.ts',   line: 110,  surface: 'Denise chat',                            klass: 'OTHER' },
  { file: 'apps/api/src/routes/mcp.ts',      line: 109,  surface: 'MCP tooling',                            klass: 'OTHER' },
  { file: 'apps/api/src/routes/mcp.ts',      line: 126,  surface: 'MCP tooling',                            klass: 'OTHER' },
  { file: 'apps/api/src/routes/mcp.ts',      line: 162,  surface: 'MCP tooling',                            klass: 'OTHER' },
  { file: 'apps/api/src/routes/support.ts',  line: 70,   surface: 'Support chat',                           klass: 'OTHER' },
  { file: 'apps/api/src/routes/casey.ts',    line: 58,   surface: 'Casey chat',                             klass: 'OTHER' },
  { file: 'apps/api/src/routes/vida.ts',     line: 165,  surface: 'POST /vida/help — UNREFERENCED, REPORTED', klass: 'OTHER' },
  { file: 'apps/api/src/routes/leads.ts',    line: 733,  surface: 'lead coaching brief',                    klass: 'OTHER' },
  { file: 'apps/api/src/routes/leads.ts',    line: 1854, surface: 'lead enrich',                            klass: 'OTHER' },
  { file: 'apps/api/src/routes/leads.ts',    line: 1980, surface: 'lead draft-email',                       klass: 'OTHER' },
  { file: 'apps/api/src/routes/leads.ts',    line: 2583, surface: 'lead research',                          klass: 'OTHER' },
  { file: 'apps/api/src/routes/founder.ts',  line: 81,   surface: 'founder support inbound',                klass: 'OTHER' },
  { file: 'apps/api/src/routes/founder.ts',  line: 116,  surface: 'founder support inbound',                klass: 'OTHER' },
  { file: 'apps/api/src/routes/founder.ts',  line: 209,  surface: 'founder CS follow-up',                   klass: 'OTHER' },
  { file: 'apps/api/src/routes/founder.ts',  line: 258,  surface: 'founder AE demo request',                klass: 'OTHER' },
  { file: 'apps/api/src/routes/founder.ts',  line: 398,  surface: 'founder Nora',                           klass: 'OTHER' },
  { file: 'apps/api/src/routes/icps.ts',     line: 5837, surface: 'ICP refine (batch)',                     klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy.ts',    line: 2229, surface: 'FIGSY reply follow-up',                  klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy.ts',    line: 2280, surface: 'FIGSY reply suggest',                    klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy.ts',    line: 2367, surface: 'FIGSY reply ai-draft',                   klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy.ts',    line: 2982, surface: 'FIGSY chat',                             klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy.ts',    line: 2992, surface: 'FIGSY chat (second call)',               klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy.ts',    line: 3103, surface: 'FIGSY suggest campaign',                 klass: 'OTHER' },
  { file: 'apps/api/src/routes/clients.ts',  line: 242,  surface: 'client suggest ICP',                     klass: 'OTHER' },
  { file: 'apps/api/src/routes/figsy-tasks.ts', line: 80, surface: 'FIGSY background tasks',                klass: 'OTHER' },
  { file: 'apps/api/src/routes/internal.ts', line: 372,  surface: 'internal AE check-in',                   klass: 'OTHER' },
  { file: 'apps/api/src/routes/internal.ts', line: 533,  surface: 'internal CRO digest',                    klass: 'OTHER' },
  { file: 'apps/api/src/routes/internal.ts', line: 770,  surface: 'internal CMO posts',                     klass: 'OTHER' },
  { file: 'apps/api/src/routes/operator.ts', line: 732,  surface: 'operator campaign suggest',              klass: 'OTHER' },
  { file: 'apps/api/src/routes/operator.ts', line: 4166, surface: 'operator prospect reply draft',          klass: 'OTHER' },
]

/** Files holding a MILLA or VIDA call — the only files allowed to name the conversational model. */
const CONVERSATIONAL_FILES = [...new Set(
  MODEL_CALLS.filter(c => c.klass !== 'OTHER').map(c => c.file))]

describe('M1 — every model call is inventoried and on the model the founder ruled', () => {
  it('M1', () => {
    // ① THE INVENTORY MATCHES THE REPOSITORY. A call that is not listed is a surface nobody
    // classified, which is exactly how the website widget ran for months on the wrong model
    // with a keyword list deciding who became a lead.
    // ⚠️ KEYED ON FILE AND COUNT, NOT ON LINE NUMBERS. A line-pinned inventory goes red the
    // moment anybody adds a comment above a call, which trains people to "fix" the map by
    // renumbering it rather than by reading it. File + count still catches the thing that
    // matters: a NEW model call, or one that quietly moved into a file nobody classified.
    const actual = new Map<string, number>()
    for (const f of API_FILES) {
      const n = readFileSync(join(REPO, f), 'utf8').split('\n')
        .filter(l => l.includes('messages.create(') && !l.trimStart().startsWith('//')).length
      if (n > 0) actual.set(f, n)
    }
    const expectedPerFile = new Map<string, number>()
    for (const c of MODEL_CALLS) expectedPerFile.set(c.file, (expectedPerFile.get(c.file) ?? 0) + 1)

    const unlisted = [...actual.keys()].filter(f => !expectedPerFile.has(f))
    expect(unlisted, `files with model calls nobody classified: ${unlisted.join(', ')}`).toEqual([])
    const vanished = [...expectedPerFile.keys()].filter(f => !actual.has(f))
    expect(vanished, `the inventory lists calls that no longer exist: ${vanished.join(', ')}`).toEqual([])
    for (const [f, n] of expectedPerFile) {
      expect(actual.get(f), `${f} has ${actual.get(f)} model calls, the inventory says ${n} — classify the new one`)
        .toBe(n)
    }

    // ② EVERY MILLA AND VIDA CALL USES THE SHARED CONSTANT — asserted on the USE. Asserting
    // that the file merely CONTAINS the name is what let an earlier guard pass while Milla's
    // own call had been changed to a hand-typed Haiku id and only the import survived.
    for (const file of CONVERSATIONAL_FILES) {
      expect(live(read(file)), `${file} imports the conversational model but never calls with it`)
        .toMatch(/(?:model:\s*|=\s*)CONVERSATION_MODEL\b/)
    }

    // ③ NOTHING OUTSIDE MILLA AND VIDA REFERENCES IT.
    for (const f of API_FILES) {
      if (CONVERSATIONAL_FILES.includes(f) || f.endsWith('lib/models.ts')) continue
      expect(live(read(f)), `${f} is not Milla or Vida and reads the conversational model`)
        .not.toContain('CONVERSATION_MODEL')
    }

    // ④ 🛑 NOTHING OUTSIDE MILLA AND VIDA RUNS ON SONNET BY DEFAULT.
    //
    // ⛓️ THE EARLIER GUARD FORBADE ONLY THE EXACT STRING `claude-sonnet-5`, so it never saw
    // `routes/leads.ts` calling `'claude-sonnet-4-6'` unconditionally on
    // `/leads/:id/draft-email` — a prospect-email writer that is neither Milla nor Vida,
    // running on Sonnet against ruling 5, reached from the client's own leads page. A
    // version-specific ban is not a ban.
    //
    // ⛓️ 14 Sep (O2) — THE NARROW ALLOWANCE THAT STOOD HERE IS GONE, AND SO IS WHAT IT
    // ALLOWED. `lib/figsy.ts` held a Sonnet id inside `MODEL_MAP`, reachable through a
    // per-campaign `model_preference`; this test listed it as a pre-existing operator choice
    // and deferred it as a founder question. That was wrong: the founder had already ruled
    // "THE OTHER PARTS = HAIKU", FIGSY is one of the other parts, and a row in a table is not
    // an exception to a ruling. The toggle is removed, so the allowlist has nothing to hold
    // and the rule is now absolute — no Sonnet id of any version, anywhere, outside the one
    // file that defines it.
    for (const f of API_FILES) {
      // `lib/models.ts` is the ONE home the conversational id is allowed to have — that is
      // the whole point of the file, and Build 0 exists because it previously had 46.
      if (f.endsWith('apps/api/src/lib/models.ts')) continue
      const hits = live(read(f)).match(/'claude-sonnet[^']*'/g) ?? []
      expect(hits, `${f} runs on Sonnet against ruling 5: ${hits.join(', ')}`).toEqual([])
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// M2 — EVERY DOOR A HUMAN TYPES INTO, AND THE STORE BEHIND IT
// ═══════════════════════════════════════════════════════════════════════════════════════

const ENTRY_POINTS: Array<{ route: string; file: string; who: string; store: string }> = [
  { route: "icpRouter.post('/builder/chat'",  file: 'apps/api/src/routes/icps.ts',     who: 'client — onboarding',       store: 'onboarding_brief_drafts (facts + conversation)' },
  { route: "icpRouter.post('/chat-build'",    file: 'apps/api/src/routes/icps.ts',     who: 'client — change targeting', store: 'reads onboarding_brief_drafts; proposes only' },
  { route: "millaRouter.post('/sessions/:sessionId/chat'", file: 'apps/api/src/routes/milla.ts', who: 'client — desk',    store: 'milla_sessions / milla_messages' },
  // ⛓️ 18 Sep (D-63) — ~~`{ "millaRouter.post('/chat'", routes/milla.ts, 'client — stateless
  // door', 'NONE — stateless' }`~~ WAS THE ONE ENTRY POINT WHOSE STORE WAS "NONE", and that was
  // the whole problem with it: a door a client types into that remembers nothing. Unmounted.
  { route: "operatorRouter.post('/command'",  file: 'apps/api/src/routes/operator.ts', who: 'operator — Vida',           store: 'vida_conversations (operator + client)' },
  { route: "operatorRouter.post('/icp/chat'", file: 'apps/api/src/routes/operator.ts', who: 'operator — Vida ICP',       store: 'vida_conversations' },
  { route: "operatorRouter.post('/ask'",      file: 'apps/api/src/routes/operator.ts', who: 'operator → client',         store: 'milla_messages (the client thread)' },
  { route: "'/escalate',",                    file: 'apps/api/src/routes/support.ts',  who: 'client — escalation',       store: 'founder_alerts' },
  { route: "millaRouter.get('/brief-draft'",  file: 'apps/api/src/routes/milla.ts',    who: 'client — re-entry read',    store: 'onboarding_brief_drafts' },
]

describe('M2 — every entry point exists and names its store', () => {
  it('M2', () => {
    for (const e of ENTRY_POINTS) {
      expect(read(e.file), `${e.route} is gone — ${e.who}`).toContain(e.route)
    }
    // Nothing new has appeared that talks to a human and is not listed. A ROUTE file with a
    // conversational call must be an entry point above; a LIB file is reached through one,
    // so it is named by the route that calls it rather than by its own path.
    const LIB_REACHED_BY: Record<string, string> = {
      'apps/api/src/lib/milla.ts': "millaRouter.post('/sessions/:sessionId/chat'",
    }
    for (const c of MODEL_CALLS.filter(x => x.klass !== 'OTHER')) {
      if (LIB_REACHED_BY[c.file]) {
        expect(ENTRY_POINTS.some(e => e.route === LIB_REACHED_BY[c.file]),
          `${c.surface} is reached by a door that is not listed`).toBe(true)
        continue
      }
      expect(ENTRY_POINTS.some(e => e.file === c.file), `${c.surface} has no entry point row`).toBe(true)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// M3 — WHERE TRUTH LIVES, AND WHICH COPY IS AUTHORITATIVE
// ═══════════════════════════════════════════════════════════════════════════════════════

describe('M3 — one authoritative home per fact', () => {
  it('M3', () => {
    // 🛑 THE ELEVEN BRIEF FACTS HAVE EXACTLY ONE AUTHORITATIVE HOME: the `facts` column of
    // `onboarding_brief_drafts`, merged only by `saveBriefDraft`. Everything else derives.
    const draft = live(read('apps/api/src/lib/brief-draft.ts'))
    // ⛓️ 14 Sep (O4) — THIS WAS A PREFIX MATCH AND A TOOTH WALKED THROUGH IT. Renaming the
    // writer to `saveBriefDraftRENAMED` still CONTAINED `saveBriefDraft`, so the guard passed
    // while the only writer of the eleven facts had been renamed out from under every caller.
    // The boundary is now asserted.
    expect(draft, 'the single writer of the facts column is gone or renamed')
      .toMatch(/export async function saveBriefDraft\s*\(/)
    // The transcript has its own writers and they NEVER touch facts — writing a transcript
    // through the facts writer would un-confirm the Brief every time somebody spoke.
    expect(draft).toMatch(/export async function saveBriefConversation\s*\(/)
    expect(draft).toMatch(/export async function rememberCustomerTurn\s*\(/)
    // And the counter is shared, so no surface can hold a second opinion about completeness.
    expect(live(read('packages/shared/src/brief-facts.ts'))).toContain('export function briefFactsFromDraft')
    // The confirmation derives from the durable record, never from one model sample.
    expect(live(read('apps/api/src/routes/icps.ts')))
      .toMatch(/resolveBriefFacts\(\s*\n?\s*Object\.keys\(held\)\.length > 0/)
    // Vida's memory is keyed by BOTH operator and client, or one operator reads another's.
    expect(live(read('apps/api/src/lib/vida-conversation.ts')))
      .toContain(".eq('operator', operator).eq('client_id', clientId)")
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// M4 — NOTHING PUTS WORDS IN THEIR MOUTH
// ═══════════════════════════════════════════════════════════════════════════════════════

/** Sentences that were shown to real people and are retired. None may return, anywhere. */
const RETIRED_SENTENCES = [
  "I'm not sure what you're asking me to do with that",
  'Tell me more about who you want to target — industry, job title, company size, location?',
  'Tell me a bit more about who you want to reach.',
  'Here — take a look and confirm if that is right.',
  'I did not catch that — say it again?',
]

describe('M4 — a Milla or Vida answer is hers, or it is an honest error', () => {
  it('M4', () => {
    const CONVERSATIONAL = [
      'apps/api/src/routes/icps.ts',
      'apps/api/src/routes/milla.ts',
      'apps/api/src/routes/operator.ts',
      'apps/api/src/lib/milla.ts',
    ]
    for (const f of CONVERSATIONAL) {
      const src = live(read(f))
      for (const s of RETIRED_SENTENCES) {
        expect(src, `${f} brought back a retired sentence: "${s}"`).not.toContain(s)
      }
      // 🛑 AND NO ROUTE ANSWERS `success: true` WITH A SENTENCE THE MODEL DID NOT WRITE.
      // A configuration fault reported in her voice reads, to the person, as Milla having
      // heard them and declined. It is an operational error and must say so.
      expect(src, `${f} speaks for her when the model is unreachable`)
        .not.toMatch(/success:\s*true[\s\S]{0,80}reply:\s*"I can't reach my brain/)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// M5 — THE LANGUAGE INTERPRETATION INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * 🛑 CLASS A IS FORBIDDEN: deterministic code deciding what a customer MEANT.
 * CLASS B IS ALLOWED: structure, safety, format, allowlists, error-message matching.
 *
 * Every hit on a Milla or Vida path is listed with its class and its reason. A new hit that
 * is not listed fails this test, so the next regex over a customer's words has to be argued
 * for here rather than added quietly.
 */
const LANGUAGE_HITS: Array<{ file: string; what: string; klass: 'A' | 'B'; why: string }> = [
  // ── THE CLIENT AND OPERATOR APPS (added 14 Sep, O3) ─────────────────────────────────
  //
  // ⛓️ M5 PINNED THE API ONLY, so "class A is empty" was true of half the product and
  // asserted of all of it. The founder's rule reaches wherever customer language is read,
  // and the browser is where they type it. Every hit below was found by sweeping the UI
  // that sends to, or renders, a Milla or Vida conversation.
  { file: 'apps/portal/src/app/(milla)/milla/welcome/page.tsx', what: 'normalizeWebsite / firstUrl — 8 URL-shape operations (whitespace, @, scheme, hostname, domain match, lowercase host, @host)', klass: 'B', why: 'spots a DOMAIN so Milla can offer to read their site; a miss costs nothing because she asks in words' },
  // ── ⚑ 22 Sep — THE WORKSPACE'S EDITABLE FIELDS ─────────────────────────────────────
  //
  // 🛑 CLASS B, AND THE REASON IS THE STRONGEST ONE IN THIS TABLE: the subject of every one of
  // these `.includes` is a value THE CLIENT PICKED FROM A LIST WE SHOWED THEM — "C-Suite",
  // "11–50", or a title they typed into their own chip box. Nothing here reads a sentence,
  // infers an intent or decides what anybody meant. `chosen.includes(v)` asks "is this chip
  // already on?", which is the question a toggle has to answer to be a toggle.
  //
  // ⚠️ AND THIS IS THE OPPOSITE OF THE RULE'S TARGET. M5 exists because deterministic code
  // was deciding what a customer meant; the dropdowns exist so the client can say what they
  // meant WITHOUT anything having to interpret them. A pick is the one input on this screen
  // that cannot be misread.
  { file: 'apps/portal/src/app/(milla)/milla/welcome/page.tsx', what: 'PickField/savePick — 3 `chosen.includes(v)` membership checks on the client\'s own picked chips', klass: 'B', why: 'asks whether a chip the client selected is already selected; no sentence is read and no meaning is inferred' },
  { file: 'apps/portal/src/components/milla/MillaConversation.tsx', what: 'PAUSE_STAGES / ROI_STAGES / OUTREACH_STAGES .includes(prog.stage)', klass: 'B', why: 'membership on a STAGE ENUM the server issued, never on what the client typed' },
  { file: 'apps/portal/src/app/(milla)/milla/page.tsx', what: 'OUTREACH_STAGES.includes(prog.stage)', klass: 'B', why: 'same stage enum, a render gate' },
  { file: 'apps/portal/src/app/(dashboard)/AgentColumn.tsx', what: 'pathname regexes ×3', klass: 'B', why: 'URL routing; the subject is the address bar, not a sentence' },
  { file: 'apps/admin/src/app/vida/page.tsx', what: 'status / tab / send-day .includes ×5', klass: 'B', why: 'enum membership on operator state' },

  { file: 'apps/api/src/routes/icps.ts',            what: '/check constraint|violates/i.test(error.message)', klass: 'B', why: 'matches a DATABASE error string, never a customer sentence' },
  { file: 'apps/api/src/routes/icps.ts',            what: '/column|schema cache/i.test(icpUpdateErr.message)', klass: 'B', why: 'same — a Postgres error' },
  { file: 'apps/api/src/routes/icps.ts',            what: 'CLEARABLE_ICP_FIELDS.includes(f)',                 klass: 'B', why: 'allowlist on a FIELD NAME the model sent, fail-closed' },
  { file: 'apps/api/src/lib/milla.ts',              what: "text.match(/[^.!?\\n]+[.!?\\n]+/g)",               klass: 'B', why: 'splits a DOCUMENT into chunks for embedding; no meaning is read' },
  { file: 'apps/api/src/lib/brief-list-ops.ts',     what: 'trim().toLowerCase().replace(/\\s+/g)',            klass: 'B', why: 'normalises a list VALUE for equality so a remove matches; decides nothing' },
  { file: 'apps/api/src/lib/vida-brain.ts',         what: 'known.includes(name)',                             klass: 'B', why: 'allowlist on a TOOL NAME, fail-closed' },
  { file: 'apps/api/src/lib/milla-reply-shape.ts',  what: 'COMPLETION_READINESS_PATHS.includes(path)',        klass: 'B', why: 'allowlist on a ZOD ISSUE PATH, not on words' },
]

describe('M5 — no deterministic code decides what a customer meant', () => {
  it('M5', () => {
    // ① NOTHING IS CLASS A.
    const classA = LANGUAGE_HITS.filter(h => h.klass === 'A')
    expect(classA, `deterministic code is interpreting customer language: ${classA.map(h => h.file).join(', ')}`)
      .toEqual([])

    // ② THE DELETED PARSERS STAY DELETED — by mechanism, not only by name.
    expect(existsSync(join(REPO, 'apps/api/src/lib/brief-truth-guards.ts')),
      'the country parser module is back').toBe(false)
    expect(live(read('apps/api/src/lib/client-outcome.ts')), 'MEETING_WORDS is back')
      .not.toContain('MEETING_WORDS')
    expect(live(read('apps/api/src/lib/vida.ts')), 'the widget keyword list is back')
      .not.toContain('buyingIntentKeywords')

    // ③ AND THE COUNT ON EACH PATH HAS NOT GROWN. The inventory is per-file; a new regex
    // over customer words lands in one of these files and pushes its count past the pinned
    // number, which is what makes an un-argued addition visible.
    const EXPECTED: Record<string, number> = {
      'apps/api/src/routes/icps.ts': 3,
      'apps/api/src/lib/milla.ts': 1,
      'apps/api/src/lib/brief-list-ops.ts': 1,
      'apps/api/src/lib/vida-brain.ts': 1,
      'apps/api/src/lib/milla-reply-shape.ts': 1,
      'apps/api/src/lib/brief-draft.ts': 0,
      'apps/api/src/lib/client-outcome.ts': 0,
      'apps/api/src/lib/milla-chat-system.ts': 0,
      'apps/api/src/lib/vida-conversation.ts': 0,
      'apps/api/src/lib/brief-fact-resolution.ts': 0,
      // ── THE BROWSER HALF (O3) ─────────────────────────────────────────────────────
      // ⚠️ THESE FILES SEND TO, OR RENDER, A MILLA OR VIDA CONVERSATION. A new regex over a
      // customer's words would land in one of them and push its count past the pin.
      // ⛓️ 22 Sep — 8 → 11. The three new hits are the editable workspace fields; see the
      // LANGUAGE_HITS entry above for why a pick is the one input here that cannot be misread.
      'apps/portal/src/app/(milla)/milla/welcome/page.tsx': 11,
      'apps/portal/src/components/milla/MillaConversation.tsx': 3,
      'apps/portal/src/app/(milla)/milla/page.tsx': 1,
      'apps/portal/src/app/(dashboard)/AgentColumn.tsx': 3,
      'apps/portal/src/components/ui/AgentSidePanel.tsx': 0,
      'apps/portal/src/components/ui/AskFigsyButton.tsx': 0,
      'apps/portal/src/components/ui/VidaHelpBubble.tsx': 0,
      'apps/portal/src/app/(milla)/milla/chat/page.tsx': 0,
      'apps/portal/src/lib/get-help-state.ts': 0,
      'apps/admin/src/components/vida/VidaConversation.tsx': 0,
      'apps/admin/src/app/vida/page.tsx': 5,
    }
    const RE = /\.match\(|\.test\(|new RegExp|toLowerCase\(\)|\.includes\(/g
    for (const [file, n] of Object.entries(EXPECTED)) {
      const hits = (live(read(file)).match(RE) ?? []).length
      expect(hits, `${file}: ${hits} language operations, inventory says ${n} — classify the new one in LANGUAGE_HITS`)
        .toBe(n)
    }
  })
})

// ═══════════════════════════════════════════════════════════════════════════════════════
// M6 — EVERY FAILURE, AND WHAT IT COSTS THE PERSON
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * For each failure branch: what happens to the customer's MESSAGE, to the canonical BRIEF,
 * and what the person SEES. The rule the founder locked is that our failure never costs them
 * their words.
 */
const ERROR_PATHS = [
  { route: '/icps/builder/chat', branch: 'provider unreachable (both attempts)', message: 'PERSISTED before the call', brief: 'untouched', sees: '503 retryable, honest' },
  { route: '/icps/builder/chat', branch: 'max_tokens truncation',                message: 'PERSISTED', brief: 'untouched', sees: '503 retryable' },
  { route: '/icps/builder/chat', branch: 'text reply, no tool call',             message: 'PERSISTED', brief: 'untouched', sees: 'HER SENTENCE as the question — not a failure' },
  { route: '/icps/builder/chat', branch: 'premature complete',                   message: 'PERSISTED', brief: 'this turn MERGED', sees: 'her sentence as a question' },
  { route: '/icps/builder/chat', branch: 'one unreadable fact in the snapshot',  message: 'PERSISTED', brief: 'the readable facts MERGED', sees: 'a normal answer' },
  { route: '/icps/builder/chat', branch: 'durable brief unreadable',             message: 'PERSISTED', brief: 'untouched', sees: 'a question, never a plan to approve' },
  { route: '/operator/command',  branch: 'no model key',                         message: 'n/a',       brief: 'n/a',       sees: '503, an operational fault, NOT in her voice' },
  { route: '/operator/command',  branch: 'no words and no proposal',             message: 'n/a',       brief: 'n/a',       sees: '503 retryable, no sentence attributed to her' },
]

describe('M6 — our failure never costs them their words', () => {
  it('M6', () => {
    const icps = live(read('apps/api/src/routes/icps.ts'))
    const op = live(read('apps/api/src/routes/operator.ts'))
    expect(ERROR_PATHS.length).toBeGreaterThan(0)

    // The message is owned BEFORE the provider is asked. This is the whole of ruling 17.
    expect(icps, 'the customer turn is no longer persisted before the model call')
      .toContain('rememberCustomerTurn')
    const callAt = icps.indexOf('const callModel =')
    const writeAt = icps.indexOf('rememberCustomerTurn')
    expect(writeAt, 'the message is written AFTER the model call again').toBeLessThan(
      icps.indexOf('await callModel(25_000)'))
    expect(callAt).toBeGreaterThan(0)

    // A text-only reply is her question, not a discarded turn.
    expect(icps).toContain("MillaQuestionReply.safeParse({ type: 'question', content: textReply })")
    // A premature completion continues the conversation.
    expect(icps).toContain('isPrematureCompletion')
    // An unreadable record may answer but may never present a plan to approve.
    expect(icps).toContain('mustNotConfirm')
    // Vida: no words and no proposal is a failed turn, not a sentence in her voice.
    expect(op).toMatch(/if \(!reply && !proposal\)/)
    expect(op).toMatch(/success: false, retryable: true/)
  })
})
