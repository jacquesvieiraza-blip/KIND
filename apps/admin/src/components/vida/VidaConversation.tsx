'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

// ── ⚑ 4 Sep — THE ONE VIDA CONVERSATION (founder-approved operator shell) ────────────────
//
// 🛑 WHAT THIS REPLACES. The operator's assistant — transcript, shortcuts, composer and Run
// button — was declared inside `app/vida/page.tsx`, so it was a child of the clients console
// route. Opening Lead queue, Bookings, Reports, Sending or any other operator destination
// unmounted it: the transcript and the selected client went with it, and coming back started
// from nothing. The ICP tab then grew a SECOND transcript with its own bubbles and its own
// Send, so one screen carried two Vidas.
//
// ⚠️ ONE INSTANCE · ONE TRANSCRIPT · ONE COMPOSER. The conversation and the client it is
// scoped to live HERE, mounted once by `app/vida/layout.tsx`. Routes render their workspace;
// none of them owns a conversation, and none may build a second one.
//
// ⚠️ THE COCKPIT'S BUSINESS LOGIC IS NOT MOVED, IT IS REGISTERED. Sourcing still reloads the
// board and the people list; the ICP conversation still runs on the ICP surface; the Open
// link still switches tab in place. The console publishes those handlers while it is on
// screen (`useVidaSurface`), and the conversation calls them. A route that has no such
// surface simply does not register one — the generic operator command router then answers,
// which is exactly as conservative as it already was.

type CmdMsg = { role: 'operator' | 'vida'; text: string; link?: string | null }
type Blockers = { send_gate: number; money_gate: number; unsent_sourced: number; replies_to_triage: number }
type SourcePreview = { count: number; pool_free: number; pdl_needed: number; pdl_cost_est: number; allowance_left: number; leads_per_run: number; capped: boolean; is_demo: boolean; icp_name?: string | null; no_active_icp?: boolean }

/** What the workspace on screen tells the conversation about itself. Display facts only. */
export type VidaSurfaceDisplay = {
  /** Named in the empty state and the composer placeholder, so the operator sees the scope. */
  clientName: string | null
  blockers: Blockers | null
  /** `false` renders the kill-switch line. `null` = unknown, which asserts nothing. */
  outreachEnabled: boolean | null
  boardError: string | null
}

/** What the workspace on screen can DO when the conversation asks. Never rendered. */
export type VidaSurfaceHandlers = {
  /**
   * The workspace consumes the operator's text itself. Returns true when it did.
   *
   * ⚑ THIS IS THE #1643 RULE, MOVED WHOLE: once the operator has explicitly entered the ICP
   * conversation, what they type goes STRAIGHT to the ICP chat and never through the generic
   * `/operator/command` intent detector. Context routes; nothing is classified.
   */
  intercept?: (text: string) => boolean
  /** The operator's own sentence, carried back by the router so it is never retyped. */
  onHandoff?: (text: string) => void
  /** Sourcing landed — the workspace re-reads whatever it shows. */
  onSourced?: () => void | Promise<void>
  /** An "Open →" link into this same screen. Returns true when handled in place. */
  onOpen?: (url: URL) => boolean
  /** The three launch shortcuts, offered only while the surface that answers them is mounted. */
  buildIcp?: () => void
  buildCampaign?: () => void
  draftSequence?: () => void
}

type VidaConversationApi = {
  selected: string | null
  setSelected: (id: string | null) => void
  /** Run a command through the ONE conversation (used by the console's own shortcuts). */
  run: (text: string) => void
  /**
   * Post a turn into the ONE transcript.
   *
   * ⚠️ THIS IS WHY THERE IS NO SECOND ICP TRANSCRIPT. When the workspace consumes the
   * operator's text (`intercept`), the exchange still has to be READ somewhere — and the only
   * honest somewhere is the conversation they typed into. The ICP surface writes its turns
   * here instead of keeping a transcript of its own.
   */
  say: (role: 'operator' | 'vida', text: string) => void
  /** Whether the ONE conversation is mid-turn, so a surface can show the same busy state. */
  busy: boolean
  /** Publish what is on screen. Display facts re-render; handlers are held in a ref. */
  publish: (d: VidaSurfaceDisplay, h: VidaSurfaceHandlers) => void
  /**
   * WHERE the shell paints its conversation on this route.
   *
   * ⚠️ THE SLOT IS NOT THE OWNER. The transcript, the composer, the selected client and every
   * piece of conversation state live in this provider, which the LAYOUT mounts once and never
   * unmounts — so navigating between operator destinations cannot destroy them. A route that
   * places the console composition (nav | clients | Vida | workspace) hands back the element
   * the column belongs in; a full-width workspace hands back nothing and the column is simply
   * not painted there, which is why a dense table keeps its width.
   */
  setSlot: (el: HTMLElement | null) => void
}

const Ctx = createContext<VidaConversationApi | null>(null)
const INERT: VidaConversationApi = { selected: null, setSelected: () => {}, run: () => {}, say: () => {}, busy: false, publish: () => {}, setSlot: () => {} }

export function useVidaConversation(): VidaConversationApi { return useContext(Ctx) ?? INERT }

function initials(name: string | null): string {
  const n = (name ?? '').trim()
  if (!n) return 'CL'
  const parts = n.split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? 'C') + (parts[1]?.[0] ?? parts[0]?.[1] ?? 'L')).toUpperCase()
}

// #498b — detect a sourcing intent ("source 50 leads", "find 30 prospects", "source leads")
// and route it to the pool-aware CONFIRM flow instead of the prose command handoff. Returns
// the requested count (default 20) or null if the text isn't a sourcing command.
function parseSourceIntent(t: string): number | null {
  const lc = t.toLowerCase()
  // (audit fix) Require a sourcing verb AND a lead/prospect noun, so ordinary commands
  // ("find the CEO's email", "pull up the last reply") aren't hijacked into the pool-cost
  // confirm. Only phrasing like "source 20 leads" / "find leads" routes to sourcing.
  if (!/\b(source|find|pull|get|prospect)\b/.test(lc) || !/\b(lead|leads|prospect|prospects)\b/.test(lc)) return null
  const m = lc.match(/(\d{1,3})/)
  return m ? Math.max(1, Math.min(200, parseInt(m[1], 10))) : 20
}

export function VidaConversationProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelected] = useState<string | null>(null)
  const [cmd, setCmd] = useState('')
  const [cmdLog, setCmdLog] = useState<CmdMsg[]>([])
  const [cmdBusy, setCmdBusy] = useState(false)
  const [srcPreview, setSrcPreview] = useState<SourcePreview | null>(null)
  const [srcBusy, setSrcBusy] = useState(false)
  const [srcResult, setSrcResult] = useState<string | null>(null)
  // #552 — "sourced fine, but they still cannot SEND". A separate slot from srcResult on
  // purpose: one is the outcome of the button, the other is the state of the client.
  const [srcSendWarn, setSrcSendWarn] = useState<{ headline: string; label: string; detail: string } | null>(null)
  const [surface, setSurface] = useState<VidaSurfaceDisplay | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const handlers = useRef<VidaSurfaceHandlers>({})

  const publish = useCallback((d: VidaSurfaceDisplay, h: VidaSurfaceHandlers) => {
    handlers.current = h
    // ⚠️ COMPARED BEFORE IT IS SET. The console republishes on every render; storing an
    // equal-but-new object would re-render this provider, which re-renders the console, for
    // ever. Only a real change to what is DISPLAYED reaches state.
    setSurface(prev => (prev && JSON.stringify(prev) === JSON.stringify(d)) ? prev : d)
  }, [])

  async function previewSource(count: number) {
    if (!selected) return
    setSrcBusy(true); setSrcResult(null); setSrcPreview(null); setSrcSendWarn(null)
    try {
      const res = await fetch(`/api/proxy/operator/source-preview?client_id=${encodeURIComponent(selected)}&count=${count}`)
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Preview failed (${res.status})`)
      setSrcPreview(json.data)
    } catch (e) {
      setSrcResult(e instanceof Error ? e.message : 'Preview failed')
    } finally { setSrcBusy(false) }
  }

  async function confirmSource() {
    if (!selected || !srcPreview) return
    setSrcBusy(true)
    try {
      const res = await fetch('/api/proxy/operator/source', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, count: srcPreview.count, confirm: true }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Sourcing failed (${res.status})`)
      setSrcResult(`Sourced ${json.inserted} lead${json.inserted === 1 ? '' : 's'} for ${surface?.clientName || 'client'}${json.note ? ` · ${json.note}` : ''}. New leads are in People.`)
      // #552 — sourcing SUCCEEDED and the client still cannot send. Kept separate from
      // srcResult (which renders green) because this is not a failure of the thing just
      // pressed — it is the next thing that will block, and it must not read as an error of
      // the sourcing run nor be swallowed by its success.
      setSrcSendWarn(json.send_warning ?? null)
      setSrcPreview(null)
      await handlers.current.onSourced?.()
    } catch (e) {
      setSrcResult(e instanceof Error ? e.message : 'Sourcing failed')
    } finally { setSrcBusy(false) }
  }

  async function runCommand(text: string) {
    const t = text.trim()
    if (!t || !selected || cmdBusy) return
    // ── ⚑ 4 Sep — CONTEXT ROUTES, NOT KEYWORDS ─────────────────────────────────────────────
    //
    // 🛑 THE OPERATOR HAS ALREADY SAID WHAT THEY ARE DOING BY PRESSING "Build a NEW ICP by
    // talking". Sending what they type next through a `/icp|target|persona|who/` regex asks a
    // question the click already answered — and the founder's own sentence contains none of
    // those four words, so the router replied with a menu and dropped a complete ICP.
    //
    // ⚠️ ONLY INSIDE THE EXPLICIT MODE. Outside it the generic router stays exactly as
    // conservative as it was. This is state, not inference: nothing is classified. The
    // workspace answers whether it is in that mode; this conversation never guesses.
    if (handlers.current.intercept?.(t)) {
      // ⚠️ THE OPERATOR'S LINE STILL APPEARS HERE. The workspace answers it, but they typed it
      // into this conversation and this is where they will look for it.
      setCmd(''); setCmdLog(l => [...l, { role: 'operator', text: t }])
      return
    }
    // Sourcing intent → pool-aware confirm (spends OUR PDL budget), not the prose handoff.
    const srcCount = parseSourceIntent(t)
    if (srcCount != null) { setCmd(''); void previewSource(srcCount); return }
    setCmd(''); setCmdBusy(true)
    setCmdLog(l => [...l, { role: 'operator', text: t }])
    try {
      const res = await fetch('/api/proxy/operator/command', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: selected, text: t }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Command failed (${res.status})`)
      // ⚑ 4 Sep — CARRY THE OPERATOR'S OWN SENTENCE. `handoff_text` is exactly what they
      // typed; it is stashed against the client so the Open link can open the ICP
      // conversation with it already said, instead of asking them to say it twice.
      if (json.handoff_text && selected) {
        try { sessionStorage.setItem(`vida:icp-handoff:${selected}`, String(json.handoff_text)) } catch { /* private mode */ }
        handlers.current.onHandoff?.(String(json.handoff_text))
      }
      setCmdLog(l => [...l, { role: 'vida', text: json.reply, link: json.link }])
    } catch (e) {
      setCmdLog(l => [...l, { role: 'vida', text: e instanceof Error ? e.message : 'Command failed' }])
    } finally { setCmdBusy(false) }
  }

  const run = useCallback((t: string) => { void runCommand(t) }, [selected, cmdBusy]) // eslint-disable-line react-hooks/exhaustive-deps
  const say = useCallback((role: 'operator' | 'vida', text: string) => setCmdLog(l => [...l, { role, text }]), [])
  const value = useMemo<VidaConversationApi>(
    () => ({ selected, setSelected, run, say, busy: cmdBusy, publish, setSlot }), [selected, run, say, cmdBusy, publish])

  // ⚠️ THE CLIENT HEADER IS NOT HERE, AND THAT IS DELIBERATE. The avatar, the company name,
  // the onboarding percentage, the wallet chip, the "you're working X" line, the "Needs you"
  // alert strip and the onboarding-gap strip are all CONSOLE state — they read `cockpit`,
  // `myAlerts`, `modelView` and the client row, and their buttons switch the console's tabs
  // and write the console's asks. They stay exactly where they are, in `app/vida/page.tsx`,
  // above the element this panel is painted into. What moved is the conversation: the
  // blockers it is scoped by, the transcript, the shortcuts and the composer.
  const panel = (<>
        {/* live gate counts for THIS client */}
        {surface && (
          <div className="shrink-0 flex items-center gap-1.5 flex-wrap px-[22px] py-2 border-b border-[#f2ecfb]">
            <span className="text-[10.5px] font-bold uppercase tracking-wide text-[#b3a9cc] mr-1">Blockers</span>
            {([['Send gate', surface.blockers?.send_gate], ['Money gate', surface.blockers?.money_gate], ['Unsent sourced', surface.blockers?.unsent_sourced], ['To triage', surface.blockers?.replies_to_triage]] as [string, number | undefined][]).map(([label, n]) => (
              <span key={label} className={`text-[12px] font-bold rounded-full border px-2.5 py-0.5 ${n ? 'text-[#0e7c86] bg-[#e6f6f7] border-[#a8dde0]' : 'text-[#9b8ec4] bg-white border-[#ece5fb]'}`}>{n ?? 0} {label}</span>
            ))}
            {surface.outreachEnabled === false && (
              <span className="text-[12px] font-bold rounded-full border px-2.5 py-0.5 text-red-700 bg-red-50 border-red-200">Sending OFF (kill-switch)</span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-[22px] py-3.5 space-y-2">
          {surface?.boardError && <div className="text-[13px] font-semibold text-red-600">{surface.boardError}</div>}
          {cmdLog.length === 0 && (
            <div className="text-[13.5px] text-[#9b8ec4] leading-relaxed max-w-lg">
              Ask Vida anything about <b className="text-[#5c5279]">{surface?.clientName || 'this client'}</b> — or use a shortcut below.
              Everything you do here is scoped to them.
            </div>
          )}
          {cmdLog.map((m, i) => (
            <div key={i} className={m.role === 'operator' ? 'text-right' : ''}>
              <span className={`inline-block text-[13.5px] leading-relaxed rounded-xl px-3.5 py-2 max-w-[85%] text-left ${m.role === 'operator' ? 'bg-[#1f1235] text-white' : 'bg-white border border-[#eee7f7] text-[#1f1235]'}`}>{m.text}</span>
              {/* ⚑ 4 Sep — SAME PAGE, SO NO NAVIGATION. The link is the console with a tab and
                  a mode on it; reloading would throw away the conversation state and the
                  sentence just carried. The workspace switches in place instead, and the href
                  is kept so the URL still works when copied or bookmarked. */}
              {m.link && (
                <a href={m.link}
                  onClick={e => {
                    const u = new URL(m.link as string, window.location.origin)
                    if (handlers.current.onOpen?.(u)) e.preventDefault()
                  }}
                  className="block text-[12px] font-bold text-[#7C3AED] mt-0.5 hover:underline">Open &rarr;</a>
              )}
            </div>
          ))}

          {srcPreview && (
            <div className="border border-[#e4dcf7] bg-white rounded-xl px-3.5 py-3 max-w-md">
              <b className="text-[13.5px] block mb-1">Source {srcPreview.count} leads?</b>
              <p className="text-[12.5px] text-[#5c5279] leading-relaxed">
                {srcPreview.no_active_icp
                  ? 'This client has no active ICP — build one on the ICP tab first.'
                  : <>{srcPreview.pool_free} free from the pool · {srcPreview.pdl_needed} new from PDL (~${srcPreview.pdl_cost_est.toFixed(2)} of OUR budget){srcPreview.is_demo ? ' · demo client, pool only' : ''}</>}
              </p>
              {!srcPreview.no_active_icp && (
                <div className="flex gap-2 mt-2.5">
                  <button onClick={confirmSource} disabled={srcBusy}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3 py-1.5 text-[13px] font-bold disabled:opacity-60">
                    {srcBusy ? 'Sourcing…' : 'Confirm & source'}
                  </button>
                  <button onClick={() => setSrcPreview(null)} className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#5c5279]">Cancel</button>
                </div>
              )}
            </div>
          )}
          {srcResult && <div className="text-[13px] font-semibold text-emerald-700">{srcResult}</div>}
          {/* #552 — AMBER, NOT RED AND NOT GREEN. The sourcing worked; what follows it will
              not. Rendering this in the green success line would bury it, and in red would
              read as "the sourcing failed", which is a different and wrong instruction. */}
          {srcSendWarn && (
            <div className="mt-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2.5">
              <b className="text-[13px] text-amber-900 block">⚠️ {srcSendWarn.headline} — {srcSendWarn.label}</b>
              <p className="text-[12.5px] text-amber-800 mt-1 leading-relaxed">{srcSendWarn.detail}</p>
              <p className="text-[12px] text-amber-700 mt-1.5">
                The people just sourced are safely on their desk. Nothing will leave until a mailbox is assigned — by design, so no client ever sends from a shared address.
              </p>
            </div>
          )}
        </div>

        <div className="shrink-0 px-[22px] pb-3">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {["What's blocking?", 'Status', 'Source 20 leads'].map(c => (
              <button key={c} onClick={() => void runCommand(c)} disabled={cmdBusy}
                className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">{c}</button>
            ))}
            {/* These three are the launch path — they open the surface that does the work,
                instead of handing prose back to the operator.
                ⚠️ OFFERED ONLY WHERE THAT SURFACE IS ON SCREEN. A shortcut whose destination
                is not mounted would be a button that does nothing, which is the same defect
                as a link that lies. */}
            {handlers.current.buildIcp && (
              <button onClick={() => handlers.current.buildIcp?.()}
                className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd]">Build the ICP &rarr;</button>
            )}
            {handlers.current.buildCampaign && (
              <button onClick={() => handlers.current.buildCampaign?.()}
                className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd]">Build a campaign &rarr;</button>
            )}
            {handlers.current.draftSequence && (
              <button onClick={() => handlers.current.draftSequence?.()}
                className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd]">Draft the sequence &rarr;</button>
            )}
          </div>
          <form onSubmit={e => { e.preventDefault(); if (cmd.trim()) void runCommand(cmd.trim()) }} className="flex gap-2">
            <input value={cmd} onChange={e => setCmd(e.target.value)} disabled={cmdBusy}
              placeholder={`Command Vida in ${surface?.clientName || 'client'} context…`}
              className="flex-1 border border-[#ece5fb] rounded-xl px-3.5 py-2.5 text-[13.5px] bg-white outline-none focus:border-[#7C3AED] disabled:opacity-60" />
            <button type="submit" disabled={cmdBusy || !cmd.trim()}
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl px-5 text-[13.5px] font-bold disabled:opacity-40">
              {cmdBusy ? '…' : 'Run'}
            </button>
          </form>
        </div>
      </>)

  return (
    <Ctx.Provider value={value}>
      {slot ? createPortal(panel, slot) : null}
      {children}
    </Ctx.Provider>
  )
}
