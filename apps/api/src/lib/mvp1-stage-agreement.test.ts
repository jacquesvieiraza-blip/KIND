// ⚑ 16 Sep (MVP1 · B1) — THE CANONICAL SIX ARE NOW *CONSUMED*, NOT MERELY DECLARED.
//
// 🛑 THE DEFECT, AND IT IS THE SHARPEST KIND. `packages/shared/src/mvp1-stage.ts` already held
// the founder's six-stage projection, already mapped every engine state into it, and was
// already covered by `mvp1-stage.test.ts`. It was exported from the package index. And
// NOTHING IN EITHER APP IMPORTED IT.
//
// Both ribbons still rendered their own hand-typed lists:
//
//   · `apps/admin/src/components/vida/LifecycleRibbon.tsx` — `LIFECYCLE_RIBBON`, EIGHT labels
//     typed into the component, indexed off `verdict.stageIndex`;
//   · `apps/portal/src/components/milla/MillaShell.tsx` + `ProgrammeWorkspace.tsx` —
//     `MILLA_STAGES`, SEVEN labels with no Brief at all.
//
// So the founder's own complaint was literally true: one client could be at a differently
// NUMBERED and differently NAMED stage depending on which console was open, and the shared
// module written to end that was a library nobody called. A canonical truth that nothing
// consumes is not a canonical truth — it is a second opinion with better comments.
//
// ⚠️ THE SIX ARE NOT RE-DECLARED HERE. This file proves CONSUMPTION and AGREEMENT. What the
// six ARE, and how each engine state maps into them, is `mvp1-stage.test.ts`'s job and that
// file is untouched.

process.env.SUPABASE_URL ??= 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role'

import { describe, it, expect, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

vi.mock('@kind/db', () => ({ db: { from: () => ({}), rpc: async () => ({ data: null, error: null }) } }))

import {
  MVP1_MILLA_STAGES, MVP1_VIDA_STAGES, mvp1MillaStage, mvp1VidaStage, mvp1StageNumber,
  type EngineLifecycleStage,
} from '@kind/shared'
import { LIFECYCLE_STAGES } from './programme-lifecycle'

const REPO = join(__dirname, '../../../..')
const codeOnly = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\/\*|\*)/.test(l)).join('\n')
const src = (p: string) => codeOnly(readFileSync(join(REPO, p), 'utf8'))

// ─────────────────────────────────────────────────────────────────────────────
// Ⓐ VIDA'S RIBBON READS THE SHARED SOURCE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓐ · B1 · the Vida ribbon consumes the canonical six', () => {
  const ribbon = () => src('apps/admin/src/components/vida/LifecycleRibbon.tsx')

  it('🛑 THE HAND-TYPED EIGHT-LABEL LIST IS GONE', () => {
    expect(ribbon(), 'the ribbon still declares its own stage vocabulary')
      .not.toMatch(/'Signup', 'Proof', 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion'/)
  })

  it('it imports the six and the projection from @kind/shared', () => {
    const s = ribbon()
    expect(s).toMatch(/from '@kind\/shared'/)
    expect(s).toMatch(/MVP1_VIDA_STAGES/)
    expect(s).toMatch(/mvp1VidaStage/)
  })

  it('🛑 AND IT PROJECTS THE ENGINE STAGE rather than trusting a number', () => {
    // `stageIndex` was an index into the EIGHT. Handing that number to a six-label list would
    // light the wrong stage — off by one from `sourcing` onwards, and out of range at 7 and 8.
    // The ribbon must take the engine stage NAME and project it.
    const s = ribbon()
    expect(s).toMatch(/mvp1VidaStage\(/)
    expect(s, 'the ribbon still lights a stage from an eight-stage index')
      .not.toMatch(/stageIndex === n/)
  })

  it('and the page passes the stage, not the index', () => {
    const page = src('apps/admin/src/app/vida/page.tsx')
    expect(page).toMatch(/<LifecycleRibbon\s+stage=\{/)
    expect(page, 'the page still hands the ribbon an eight-stage index')
      .not.toMatch(/<LifecycleRibbon stageIndex=/)
  })

  it('it is still READ-ONLY — a stage is a fact, not a control', () => {
    const s = ribbon()
    for (const interactive of ['<button', 'onClick', 'href=']) {
      expect(s, `the ribbon grew ${interactive} — an operator cannot move a client from a ribbon`)
        .not.toContain(interactive)
    }
    expect(s).toMatch(/role="list"/)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓑ MILLA'S RIBBON READS THE SAME SOURCE
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓑ · B1 · Milla\'s ribbon consumes the canonical six', () => {
  it('🛑 THE SEVEN-STAGE LIST NO LONGER DRAWS THE CLIENT\'S RIBBON', () => {
    const shell = src('apps/portal/src/components/milla/MillaShell.tsx')
    expect(shell, 'the client ribbon is still the seven-stage legacy vocabulary')
      .not.toMatch(/\{MILLA_STAGES\.map\(/)
    expect(shell).toMatch(/MVP1_MILLA_STAGES/)
  })

  it('and the programme workspace strip agrees with it', () => {
    const ws = src('apps/portal/src/components/milla/ProgrammeWorkspace.tsx')
    expect(ws, 'the workspace strip is still the seven-stage legacy vocabulary')
      .not.toMatch(/\{MILLA_STAGES\.map\(/)
    expect(ws).toMatch(/MVP1_MILLA_STAGES/)
  })

  it('🛑 AND BRIEF EXISTS ON THE CLIENT\'S RIBBON AT ALL', () => {
    // `MILLA_STAGES` starts at Proof. A client filling in their Brief had no position on their
    // own journey — the first thing they ever do was not on the map.
    expect(MVP1_MILLA_STAGES[0]).toBe('Brief')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓒ THE TWO CONSOLES AGREE, POSITION FOR POSITION
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓒ · B1 · one client, one position, whichever console is open', () => {
  /** The founder's own mapping table (section 9 of the build ticket). */
  const CASES: Array<{ what: string; engine: EngineLifecycleStage; milla: string; vida: string }> = [
    { what: 'draft / unconfirmed',                    engine: 'signup',         milla: 'Brief',     vida: 'Brief' },
    { what: 'confirmed client, Proof not complete',   engine: 'proof',          milla: 'Proof',     vida: 'Proof' },
    { what: 'Proof complete — calculator',            engine: 'recommendation', milla: 'Programme', vida: 'Prepare' },
    { what: 'P1 authorised, preparing',               engine: 'sourcing',       milla: 'Programme', vida: 'Prepare' },
    { what: 'Ready for Approval / Approved / P2',     engine: 'approval',       milla: 'Approval',  vida: 'Ready' },
    { what: 'Make Live / Run / sending',              engine: 'live',           milla: 'Results',   vida: 'Run' },
    { what: 'replies / meetings / review hold',        engine: 'review',         milla: 'Results',   vida: 'Run' },
    { what: 'COMPLETED / CANCELLED',                  engine: 'completion',     milla: 'Complete',  vida: 'Complete' },
  ]

  it.each(CASES)('$what — the two consoles are on the same NUMBER', ({ engine, milla, vida }) => {
    expect(mvp1VidaStage(engine)).toBe(vida)
    // 🛑 THE NUMBER IS THE THING. An operator on the phone must not be describing stage 4
    // while the client is reading stage 5 of the same journey.
    expect(mvp1StageNumber(vida)).toBe(mvp1StageNumber(milla))
  })

  it('🛑 EVERY engine stage projects into the six — no stage can fall off', () => {
    for (const s of LIFECYCLE_STAGES) {
      const v = mvp1VidaStage(s as EngineLifecycleStage)
      expect(MVP1_VIDA_STAGES, `${s} projects to "${v}", which is not one of the six`).toContain(v)
      expect(mvp1StageNumber(v), `${s} has no ribbon number`).toBeGreaterThan(0)
    }
  })

  it('🛑 THERE IS NO SEVENTH STAGE, on either side', () => {
    expect(MVP1_MILLA_STAGES).toHaveLength(6)
    expect(MVP1_VIDA_STAGES).toHaveLength(6)
    // And `signup` is a POSITION INSIDE Brief, never a stage of its own (founder decision A).
    expect(MVP1_VIDA_STAGES as readonly string[]).not.toContain('Signup')
    expect(MVP1_MILLA_STAGES as readonly string[]).not.toContain('Signup')
  })

  it('a client with no confirmed Brief is at Brief whatever the engine says', () => {
    for (const status of [null, 'DRAFT', 'SOURCING', 'LIVE', 'COMPLETED'] as const) {
      expect(mvp1MillaStage({ briefConfirmed: false, status }), String(status)).toBe('Brief')
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Ⓓ THE OPERATOR SUB-STATES STILL WORK UNDERNEATH
// ─────────────────────────────────────────────────────────────────────────────
describe('Ⓓ · B1 · sub-states are unharmed — the six sit ON TOP of them', () => {
  it('the detailed Vida states are all still declared', () => {
    const lc = src('apps/api/src/lib/programme-lifecycle.ts')
    for (const state of [
      'proof_exception', 'proof_calibration_failed', 'sourcing_exception',
      'live_ready_to_make_live', 'live_ready_to_run', 'review_reply', 'review_sender',
      'approval_package_stale', 'completion_repeat', 'blocked',
    ]) {
      expect(lc, `${state} was lost when the six were introduced`).toMatch(new RegExp(`'${state}'`))
    }
  })

  it('and needsYou is still the reason, not the stage', () => {
    const lc = src('apps/api/src/lib/programme-lifecycle.ts')
    expect(lc).toMatch(/const needsYou = reason !== null/)
  })

  it('🛑 THE ENGINE\'S EIGHT ARE UNTOUCHED — the six are a projection, not a replacement', () => {
    expect(LIFECYCLE_STAGES).toHaveLength(8)
    expect(LIFECYCLE_STAGES[0]).toBe('signup')
  })
})
