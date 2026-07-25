'use client'

// THE PRODUCT WALKTHROUGH (flow v2, step 1 — founder-locked 25 Jul).
//
// "Like the old system: highlighted areas, skip or next, pop-ups. Show them what to do
// rather than leaving them to work it out."
//
// A client lands in Milla the moment their ICP is approved and sees a chat column, a lead
// desk and four numbers, with no idea which one is their job. This walks them through it
// once, highlights the thing being described, and then never appears again.
//
// Deliberately dependency-free: no tour library, no portal, no CDN. It finds elements by
// `data-tour` attribute, so a step whose element isn't on screen is SKIPPED rather than
// pointing at nothing — which is what happens on a fresh account where the lead desk is
// still empty.

import { useEffect, useMemo, useState } from 'react'

export type TourStep = {
  /** Matches a `data-tour="..."` attribute in the page. */
  target: string
  title: string
  body: string
}

const SEEN_KEY = 'kind_tour_seen_v1'

type Box = { top: number; left: number; width: number; height: number }

export default function ProductTour({ steps, storageKey = SEEN_KEY }: { steps: TourStep[]; storageKey?: string }) {
  const [open, setOpen] = useState(false)
  const [i, setI] = useState(0)
  const [box, setBox] = useState<Box | null>(null)

  // Only ever on a first visit, and never on a device that has already seen it.
  useEffect(() => {
    try { if (localStorage.getItem(storageKey) !== '1') setOpen(true) } catch { /* private mode — just don't run */ }
  }, [storageKey])

  // Steps whose element isn't rendered are dropped, so we never highlight empty space.
  const live = useMemo(() => steps, [steps])

  useEffect(() => {
    if (!open) return
    const measure = () => {
      const el = document.querySelector<HTMLElement>(`[data-tour="${live[i]?.target}"]`)
      if (!el) { setBox(null); return }
      const r = el.getBoundingClientRect()
      setBox({ top: r.top, left: r.left, width: r.width, height: r.height })
    }
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [open, i, live])

  // A step pointing at something that isn't on screen advances itself rather than
  // showing an unanchored card in the middle of nowhere.
  useEffect(() => {
    if (!open || box !== null) return
    const el = document.querySelector(`[data-tour="${live[i]?.target}"]`)
    if (el) return
    const t = setTimeout(() => { if (i < live.length - 1) setI(n => n + 1); else finish() }, 60)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, box, i, live])

  function finish() {
    try { localStorage.setItem(storageKey, '1') } catch { /* nothing to do */ }
    setOpen(false)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      if (e.key === 'ArrowRight') setI(n => Math.min(n + 1, live.length - 1))
      if (e.key === 'ArrowLeft') setI(n => Math.max(n - 1, 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, live.length])

  if (!open || !live.length || !box) return null
  const step = live[i]
  const last = i === live.length - 1
  const pad = 8

  // Card goes under the highlight, unless that would run off the bottom.
  const below = box.top + box.height + 12
  const cardTop = below + 190 > window.innerHeight ? Math.max(12, box.top - 190) : below
  const cardLeft = Math.min(Math.max(12, box.left), Math.max(12, window.innerWidth - 372))

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Product tour">
      {/* The dim + the hole. One box-shadow does the cut-out — no SVG mask, no four divs. */}
      <div
        className="absolute rounded-2xl pointer-events-none transition-all duration-200"
        style={{
          top: box.top - pad, left: box.left - pad,
          width: box.width + pad * 2, height: box.height + pad * 2,
          boxShadow: '0 0 0 9999px rgba(20,10,40,.62)',
          outline: '2px solid #7C3AED', outlineOffset: 2,
        }}
      />
      <button aria-label="Skip the tour" onClick={finish} className="absolute inset-0 cursor-default" />

      <div className="absolute w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-[#eee7f7] p-4"
        style={{ top: cardTop, left: cardLeft }}>
        <div className="text-[10.5px] font-extrabold uppercase tracking-wide text-[#b3a9cc]">
          Step {i + 1} of {live.length}
        </div>
        <div className="text-[16px] font-extrabold text-[#1f1235] mt-0.5">{step.title}</div>
        <p className="text-[13.5px] text-[#5c5279] leading-relaxed mt-1.5">{step.body}</p>
        <div className="flex items-center gap-2 mt-3.5">
          <button onClick={finish} className="text-[13px] font-semibold text-[#9b8ec4]">Skip</button>
          <span className="ml-auto flex gap-1.5">
            {i > 0 && (
              <button onClick={() => setI(n => n - 1)}
                className="text-[13px] font-bold text-[#5c5279] border border-[#ece5fb] rounded-lg px-3 py-1.5">Back</button>
            )}
            <button onClick={() => (last ? finish() : setI(n => n + 1))}
              className="text-[13px] font-bold text-white rounded-lg px-4 py-1.5 bg-gradient-to-br from-[#7C3AED] to-[#EC4899]">
              {last ? 'Got it' : 'Next'}
            </button>
          </span>
        </div>
      </div>
    </div>
  )
}
