'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE LIFECYCLE RIBBON — eight stages, exactly one of them live, and it is READ-ONLY.
//
// ── WHAT IT REPLACES ────────────────────────────────────────────────────────────────────
//
// ⛓️ The old strip was `FLOW = ['Sign up', 'Build plan', 'Approve send', 'Qualify', 'Client
// approves', 'Follow-up', 'Book', 'Learn']` — eight words describing OUR process, in a fixed
// row with nothing lit, beside a second eight-step `FLOW_STEPS` that lit a different thing.
// Two ribbons, two vocabularies, and neither was the client's lifecycle.
//
// 🛑 THE LOCKED EIGHT: Signup → Proof → Recommendation → Sourcing → Approval → Live → Review →
// Completion. P1, P2, qualification, preparation and Run are deliberately NOT here: they are
// commercial and operational truths that live INSIDE a stage. A ribbon carrying them would be
// explaining our plumbing to somebody trying to think about their client.
//
// ── IT IS NOT NAVIGATION, AND THAT IS THE POINT ─────────────────────────────────────────
//
// ⚠️ NO `<button>`, NO `href`, NO `onClick`. A stage is a fact about where the client IS, and
// a clickable one invites the reading that an operator can move them — which is exactly the
// belief the whole workspace exists to remove. The programme advances because the work
// advances; nobody drives it from a ribbon.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** The locked eight, in order. The index is the number the ribbon prints. */
export const LIFECYCLE_RIBBON = [
  'Signup', 'Proof', 'Recommendation', 'Sourcing', 'Approval', 'Live', 'Review', 'Completion',
] as const

export function LifecycleRibbon({ stageIndex }: { stageIndex: number | null }) {
  return (
    <div
      // ⚠️ `role="list"` AND NOTHING INTERACTIVE. Announced as what it is — a progress
      // statement — so a screen reader is not told there are eight controls here.
      role="list"
      aria-label="Client lifecycle"
      className="shrink-0 flex items-center gap-1 overflow-x-auto px-[22px] py-2.5 bg-[#1f1235]"
    >
      <span className="text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-[#8d7fb8] mr-2 shrink-0">Flow</span>
      {LIFECYCLE_RIBBON.map((label, i) => {
        const n = i + 1
        const now = stageIndex === n
        const done = stageIndex !== null && stageIndex > n
        return (
          <span key={label} role="listitem" className="flex items-center gap-1.5 shrink-0">
            <span className={`w-[19px] h-[19px] rounded-full text-[11px] font-extrabold flex items-center justify-center ${
              now ? 'bg-[#EC4899] text-white'
              : done ? 'bg-white/90 text-[#1f1235]'
              : 'bg-white/15 text-[#8d7fb8]'}`}>{n}</span>
            <span className={`text-[13px] whitespace-nowrap ${
              now ? 'font-extrabold text-white'
              : done ? 'font-bold text-white/85'
              : 'font-bold text-[#8d7fb8]'}`}>{label}</span>
            {i < LIFECYCLE_RIBBON.length - 1 && <span className="text-[#5b4d80] px-0.5">&rsaquo;</span>}
          </span>
        )
      })}
    </div>
  )
}
