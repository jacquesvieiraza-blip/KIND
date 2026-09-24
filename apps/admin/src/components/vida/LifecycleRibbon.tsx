'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LIFECYCLE RIBBON — the canonical SIX, exactly one of them live, and it is READ-ONLY.
//
// ── WHAT IT REPLACES ────────────────────────────────────────────────────────────────────
//
// ⛓️ The old strip was `FLOW = ['Sign up', 'Build plan', 'Approve send', 'Qualify', 'Client
// approves', 'Follow-up', 'Book', 'Learn']` — eight words describing OUR process, in a fixed
// row with nothing lit, beside a second eight-step `FLOW_STEPS` that lit a different thing.
// Two ribbons, two vocabularies, and neither was the client's lifecycle.
//
// ⛓️ 16 Sep (MVP1 · B1) — THE LOCKED SIX: Brief → Proof → Prepare → Ready → Run → Complete.
// ~~Signup → Proof → Recommendation → Sourcing → Approval → Live → Review → Completion~~ was
// the ENGINE's eight rendered as if it were the journey. `signup` is a position inside Brief
// rather than a stage of its own; `recommendation` and `sourcing` are both Prepare, because
// the operator has nothing to do while the client decides and nothing to do while preparation
// runs; and `review` is an exception INSIDE delivery, not a place after it.
//
// P1, P2, qualification, preparation and Run remain deliberately NOT here: they are commercial
// and operational truths that live INSIDE a stage. A ribbon carrying them would be explaining
// our plumbing to somebody trying to think about their client.
//
// ── IT IS NOT NAVIGATION, AND THAT IS THE POINT ─────────────────────────────────────────
//
// ⚠️ NO `<button>`, NO `href`, NO `onClick`. A stage is a fact about where the client IS, and
// a clickable one invites the reading that an operator can move them — which is exactly the
// belief the whole workspace exists to remove. The programme advances because the work
// advances; nobody drives it from a ribbon.
// ═══════════════════════════════════════════════════════════════════════════════════════

// ── ⛓️ 16 Sep (MVP1 · B1) — THE LABELS AND THEIR ORDER NOW COME FROM ONE SHARED SOURCE ──
//
// 🛑 WHAT STOOD HERE: ~~`export const LIFECYCLE_RIBBON = ['Signup', 'Proof',
// 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion']`~~ — eight labels
// typed into this component, indexed off `verdict.stageIndex`.
//
// `packages/shared/src/mvp1-stage.ts` has held the founder's SIX-stage projection all along,
// mapped every engine state into it, and was covered by its own test — and NOTHING IMPORTED
// IT. Meanwhile Milla's ribbon drew a different SEVEN from `MILLA_STAGES`. So one client was
// at a differently named and differently numbered stage depending on which console was open,
// which is the precise defect the shared module was written to end. A canonical truth nothing
// consumes is not a canonical truth.
//
// 🛑 AND THE NUMBER COULD NOT SIMPLY BE REUSED. `stageIndex` was a 1-based index into the
// EIGHT; feeding it to six labels lights the wrong stage from `sourcing` onwards and falls off
// the end at 7 and 8. The ribbon therefore takes the engine STAGE and projects it, so there is
// no arithmetic to get wrong.
//
// ⚠️ NOT ONE LABEL IS TYPED HERE ANY MORE. What renders is what `MVP1_VIDA_STAGES` holds, in
// its order. Adding, renaming or reordering a stage happens in one file and both consoles move.
//
// ⚠️ THE EIGHT ENGINE STAGES ARE UNTOUCHED. `LIFECYCLE_STAGES` remains the engine's own
// vocabulary and every detailed operator sub-state still exists underneath; this is the
// projection the RIBBON prints, not a replacement for either.
import { MVP1_VIDA_STAGES, mvp1VidaStage, type EngineLifecycleStage } from '@kind/shared'

export function LifecycleRibbon({ stage }: { stage: string | null }) {
  /**
   * ⚠️ AN UNKNOWN STAGE MARKS NOTHING, and that is a real state rather than a default. A
   * lifecycle that has not loaded, or could not be read, must show the journey without
   * claiming where in it the client is — the same rule Milla's ribbon already applied.
   */
  const current = (MVP1_VIDA_STAGES as readonly string[]).includes(
    stage ? mvp1VidaStage(stage as EngineLifecycleStage) : '',
  )
    ? mvp1VidaStage(stage as EngineLifecycleStage)
    : null
  const at = current ? MVP1_VIDA_STAGES.indexOf(current) : -1
  // ⛓️ 24 Sep (R145 step 7 · #85 · #45) — THE REDESIGN'S STAGE BAR. WAS a dark strip of numbered
  // circles in which a finished stage looked much like a future one. Founder: *"match everything.
  // colors everything."* Finished stages now show ✓ (#85), the current one is the accent, and the
  // bar is drawn during the Brief too (the console passes 'brief' for a signed-up draft, #45).
  // ⚠️ `role="list"` AND NOTHING INTERACTIVE — a progress statement, not six controls.
  return (
    <div role="list" aria-label="Client lifecycle" className="mv-stagebar shrink-0 h-[42px] overflow-x-auto">
      <div className="mv-label">FLOW</div>
      <div className="mv-steps">
        {MVP1_VIDA_STAGES.map((label, i) => {
          const now = at >= 0 && i === at
          const done = at >= 0 && i < at
          return (
            <span key={label} role="listitem" className="flex items-center gap-1.5 shrink-0">
              <span className={`mv-step ${now ? 'on' : done ? 'done' : ''}`}><i>{done ? '✓' : i + 1}</i>{label}</span>
              {i < MVP1_VIDA_STAGES.length - 1 && <span className="mv-sep" />}
            </span>
          )
        })}
      </div>
    </div>
  )
}
