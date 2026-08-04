'use client'

// #612 — THE COPY VERDICT, ON THE SCREEN WHERE THE DECISION IS MADE.
//
// Founder-ruled 4 Aug: *"shit emails out = zero meetings booked. for all clients."* The gate
// itself lives in the API (`lib/sequence-quality.ts`) and refuses activation; this is the half
// that tells the operator WHY before they get that far.
//
// ⚠️ A CLEAN RESULT MUST NAME WHAT IT CHECKED. This repo has met the opposite four times —
// #565, #576, #581, #611 — a screen that renders nothing when all is well is indistinguishable
// from a check that never ran, and the second one is the dangerous state. So a passing sequence
// lists what was looked at, not a bare green tick.
//
// Red = hard, and hard means it CANNOT go live. Amber = craft advice that never blocks: a
// warning that blocked would teach operators to route around the gate, and a gate people route
// around protects nothing.

type Violation = { rule: string; severity: 'hard' | 'warn'; step: number | null; why: string }
export type Quality = { hardFails: Violation[]; warnings: Violation[]; passes: string[]; ok: boolean }

export default function SequenceQuality({ quality }: { quality?: Quality | null }) {
  if (!quality) return null
  const { hardFails, warnings, passes, ok } = quality

  return (
    <div className="mt-3 border-t border-[#ece5fb] pt-3">
      <b className={`text-[12.5px] block ${ok ? 'text-emerald-800' : 'text-red-900'}`}>
        {ok
          ? warnings.length > 0
            ? `Good to send — ${warnings.length} thing${warnings.length === 1 ? '' : 's'} worth tightening first`
            : 'Good to send.'
          : `This cannot go live — ${hardFails.length} thing${hardFails.length === 1 ? '' : 's'} would damage the sending domain.`}
      </b>

      {hardFails.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {hardFails.map((v, i) => (
            <div key={`h${i}`} className="rounded-lg border border-red-300 bg-red-50 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-red-900">Must fix</span>
                {v.step !== null && <span className="text-[10.5px] font-bold text-red-800">Step {v.step}</span>}
              </div>
              <p className="text-[11.5px] text-red-900 mt-0.5 leading-relaxed">{v.why}</p>
            </div>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {warnings.map((v, i) => (
            <div key={`w${i}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900">Worth tightening</span>
                {v.step !== null && <span className="text-[10.5px] font-bold text-amber-800">Step {v.step}</span>}
              </div>
              <p className="text-[11.5px] text-amber-900 mt-0.5 leading-relaxed">{v.why}</p>
            </div>
          ))}
          <p className="text-[11px] text-[#8579a8] leading-relaxed">
            These do not stop the campaign — they are the difference between a sequence that sends and one that gets replies.
          </p>
        </div>
      )}

      {passes.length > 0 && (
        <details className="mt-2">
          <summary className="text-[11.5px] font-bold text-[#5c5279] cursor-pointer">
            What was checked and passed ({passes.length})
          </summary>
          <ul className="mt-1.5 space-y-0.5">
            {passes.map((p, i) => (
              <li key={`p${i}`} className="text-[11.5px] text-emerald-800 leading-relaxed">✅ {p}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
