'use client'

// ═══════════════════════════════════════════════════════════════════════════════════════
// ONE FIGURE AND ITS LABEL — the neutral card the Milla reporting pages share.
//
// ⚑ 31 Aug (BUILD-004A-2C). Purely presentational: it holds no data, no source and no rule,
// so sharing it couples nothing. That distinction is the whole point of the fork ruling —
// Reports, Performance, Analytics and ROI may look identical and must never share a claim.
//
// ⚠️ `null` IS A DASH, AND THAT IS NOT COSMETIC. Every count on these pages can fail to read,
// and rendering a failed read as "0" tells a client with six replies that they have none.
// Callers pass `null` for unreadable and the card refuses to print a number.
// ═══════════════════════════════════════════════════════════════════════════════════════

export function ProgrammeStat({ v, k, sub }: { v: string | number | null; k: string; sub?: string }) {
  return (
    <div className="bg-white border border-[#eee7f7] rounded-2xl px-5 py-4">
      <div className="text-[22px] font-extrabold text-[#1f1235] tabular-nums">
        {v === null ? '—' : typeof v === 'number' ? v.toLocaleString() : v}
      </div>
      <div className="text-[12.5px] text-[#9b8ec4] mt-0.5">{k}</div>
      {sub && <div className="text-[11.5px] text-[#b3a9cc] mt-0.5">{sub}</div>}
    </div>
  )
}

/** The page header every Milla reporting surface uses. Same shape as Meetings and Billing. */
export function ProgrammeHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <>
      <h1 className="text-2xl font-bold text-[#1f1235]">{title}</h1>
      <p className="text-sm text-[#7c6f9b] mt-0.5">{sub}</p>
    </>
  )
}
