'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  programmeSourceRequest, sourcingChipLabel, sourcingConfirmQuestion,
  type ProgrammeSourcingAction,
} from '@/lib/programme-sourcing-action'

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

/**
 * What the workspace on screen tells the conversation about itself. Display facts only.
 *
 * ⚑ 4 Sep (UI-010) — `clientName` IS NOT HERE ANY MORE, and that is the point. WHO Vida is
 * scoped to is persistent conversation state, not something a workspace lends her: publishing
 * it meant that clearing a stale surface on unmount also erased the client, and the composer
 * degraded to "Command Vida in client context…" the moment the console left the screen.
 * Identity now lives beside `selected` in the provider; only these live, workspace-read facts
 * are published, and only these are cleared.
 */
export type VidaSurfaceDisplay = {
  blockers: Blockers | null
  /** `false` renders the kill-switch line. `null` = unknown, which asserts nothing. */
  outreachEnabled: boolean | null
  boardError: string | null
  /**
   * ⚑ 7 Sep (HOUSE-008) — THE SOURCING AUTHORITY ON SCREEN, or `null` for an ordinary client.
   *
   * 🛑 WHY IT IS PUBLISHED RATHER THAN FETCHED HERE. The console beside this conversation
   * already holds the programme truth; a second fetch would be a second answer, and the two
   * could disagree about the batch size on the very button that spends the money.
   *
   * ⚠️ `null` IS NOT "BLOCKED". `null` means this client has no programme, so the legacy
   * client-scoped shortcut stays exactly as it was. A non-null action with `blocked` set means
   * there IS a programme and it cannot source — which the operator must be told, not hidden
   * from by falling back to the client path.
   */
  programmeSourcing: ProgrammeSourcingAction | null
  /**
   * ⚑ 9 Sep — WHAT VIDA IS SAYING ABOUT THIS CLIENT RIGHT NOW, and her posture while she says
   * it. Published by the console for the same reason `programmeSourcing` is: the console
   * already holds the server's lifecycle verdict, and a second fetch here would be a second
   * answer — the two could disagree about whether the operator is needed, on the very column
   * that tells them.
   *
   * ⚠️ `null` ASSERTS NOTHING. On an operator destination with no client selected there is no
   * state to describe, and the header simply does not claim one.
   */
  lifecycle: {
    mode: 'No action needed' | 'Working' | 'Watching' | 'Needs you'
    messages: string[]
    chips: string[]
  } | null
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
  /** The selected client's name. Persistent identity — it survives every navigation. */
  selectedName: string | null
  /**
   * Choose the client this conversation is scoped to.
   *
   * ⚠️ THE NAME TRAVELS WITH THE ID. A caller that knows which client it picked knows what it
   * is called; making the panel go and look it up again is how the two drift apart.
   */
  setSelected: (id: string | null, name?: string | null) => void
  /**
   * ⚑ MVP1 (Preview 07) — the open onboarding draft being read, if any.
   *
   * 🛑 THIS IS NOT A CLIENT ID AND MUST NEVER BE PASSED AS ONE. There is no `clients` row
   * behind it, no programme, no entitlement and no money. It exists so an operator can open
   * somebody who has signed up and see how far Milla has got — which, before this, they
   * could not: a signup was invisible until the instant they confirmed.
   */
  selectedDraft: string | null
  /** Open a draft. Clears the selected client, because the two are mutually exclusive. */
  setSelectedDraft: (id: string | null) => void
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
   * Take it all back, because the workspace that published it is going away.
   *
   * 🛑 THE DEFECT THIS EXISTS FOR. `publish` overwrote the handlers ref and nothing ever wrote
   * an empty one back, so an UNMOUNTED console's blockers, board error and launch shortcuts
   * outlived it: on Lead queue the operator was offered "Build the ICP →" for a surface that
   * was not on screen, beside a blocker strip nobody had re-read.
   *
   * ⚠️ IT CLEARS THE WORKSPACE'S CONTRIBUTION ONLY. The transcript, the composer, the selected
   * client and its name are the conversation's own and are never touched by this.
   */
  unpublish: () => void
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
const INERT: VidaConversationApi = { selected: null, selectedName: null, setSelected: () => {}, selectedDraft: null, setSelectedDraft: () => {}, run: () => {}, say: () => {}, busy: false, publish: () => {}, unpublish: () => {}, setSlot: () => {} }

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
// ⛓️ 14 Sep (R121) — `parseSourceIntent` STOOD HERE AND IS DELETED.
//
// 🛑 IT WAS A LANGUAGE PARSER IN THE BROWSER. Two regexes over what the operator typed —
// /(source|find|pull|get|prospect)/ AND /(lead|leads|prospect|prospects)/ — plus the first
// number it could find. "get me some more people for these guys" matched neither and fell
// through to a keyword router that answered "I'm not sure what you're asking me to do with
// that"; "we should get rid of the 1-10 band" matched BOTH and offered to source 10 leads.
//
// Vida reads the sentence now and proposes `propose_sourcing` with a count. The preview, the
// real cost and the operator's "Run it" are all unchanged, so the money gate has not moved.

export function VidaConversationProvider({ children }: { children: React.ReactNode }) {
  const [selected, setSelectedId] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  // ⚑ MVP1 — the open onboarding draft being read, if any. NEVER a client id. See below.
  const [selectedDraft, setSelectedDraftId] = useState<string | null>(null)
  const [cmd, setCmd] = useState('')
  const [cmdLog, setCmdLog] = useState<CmdMsg[]>([])
  const [cmdBusy, setCmdBusy] = useState(false)
  const [srcPreview, setSrcPreview] = useState<SourcePreview | null>(null)
  // ⚑ 7 Sep — a SEPARATE card, not a variant of SourcePreview. That type carries pool counts,
  // a PDL split and a dollar estimate; none of them is true of an Apollo-only programme run,
  // and reusing the shape is how those numbers would end up rendered beside a House batch.
  const [progPreview, setProgPreview] = useState<ProgrammeSourcingAction | null>(null)
  const [srcBusy, setSrcBusy] = useState(false)
  const [srcResult, setSrcResult] = useState<string | null>(null)
  // #552 — "sourced fine, but they still cannot SEND". A separate slot from srcResult on
  // purpose: one is the outcome of the button, the other is the state of the client.
  const [srcSendWarn, setSrcSendWarn] = useState<{ headline: string; label: string; detail: string } | null>(null)
  const [surface, setSurface] = useState<VidaSurfaceDisplay | null>(null)
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  const handlers = useRef<VidaSurfaceHandlers>({})

  const setSelected = useCallback((id: string | null, name?: string | null) => {
    setSelectedId(id)
    // ⚠️ `undefined` MEANS "I DID NOT SAY", not "it has no name" — a caller that only knows the
    // id must not blank a name the conversation already holds. `null` is an explicit clear.
    if (name !== undefined) setSelectedName(name)
    // ⚑ MVP1 — PICKING A CLIENT DROPS ANY DRAFT. The two are mutually exclusive by
    // construction: see `setSelectedDraft` below.
    if (id) setSelectedDraftId(null)
  }, [])

  /**
   * ⚑ MVP1 (Preview 07) — open a person whose Brief Milla is still collecting.
   *
   * 🛑 A DRAFT IS NOT A CLIENT AND NEVER BECOMES ONE BY BEING SELECTED. It is deliberately a
   * SECOND piece of state rather than an id squeezed into `selected`: every command, every
   * `/operator/*` call and every surface in this console takes `selected` as a CLIENT id, and
   * a draft id arriving there would be sent to routes that would look up a client that does
   * not exist. Keeping them apart makes that impossible rather than merely unlikely.
   *
   * ⚠️ AND NEVER BOTH AT ONCE. Each setter clears the other, so the workspace can never be
   * asked to paint a client panel and a brief panel over one another.
   */
  const setSelectedDraft = useCallback((id: string | null) => {
    setSelectedDraftId(id)
    if (id) { setSelectedId(null); setSelectedName(null) }
  }, [])

  const unpublish = useCallback(() => { handlers.current = {}; setSurface(null) }, [])

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
      setSrcResult(`Sourced ${json.inserted} lead${json.inserted === 1 ? '' : 's'} for ${selectedName || 'client'}${json.note ? ` · ${json.note}` : ''}. New leads are in People.`)
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

  // ── ⚑ 7 Sep (HOUSE-008) · THE PROGRAMME PATH ────────────────────────────────────────
  //
  // Two functions, sitting deliberately beside `previewSource`/`confirmSource` rather than
  // inside them. The legacy pair answers "top this CLIENT's desk up from the pool and PDL";
  // this pair answers "run this PROGRAMME's next authorised batch". They share a screen and
  // nothing else — folding them together is what would let a programme fall back to the
  // client-scoped route on the day one of the branches was got wrong.

  /** No fetch at all: the quantity, the targeting and the verdict are already on screen. */
  function previewProgrammeSource(action: ProgrammeSourcingAction) {
    setSrcResult(null); setSrcSendWarn(null); setSrcPreview(null)
    setProgPreview(action)
  }

  async function confirmProgrammeSource() {
    if (!progPreview || progPreview.blocked) return
    setSrcBusy(true)
    try {
      // ⚠️ THE PAYLOAD IS BUILT BY THE SHARED HELPER, not assembled here — so there is exactly
      // one shape of this request, and it throws rather than firing on a blocked action.
      const req = programmeSourceRequest(progPreview)
      const res = await fetch(req.url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json?.success) throw new Error(json?.error || `Sourcing failed (${res.status})`)
      setSrcResult(`Sourced ${json.inserted} lead${json.inserted === 1 ? '' : 's'} for this programme${json.note ? ` · ${json.note}` : ''}. New leads are in People.`)
      setProgPreview(null)
      await handlers.current.onSourced?.()
    } catch (e) {
      // The route answers a refusal with the control that stopped it, in words. Showing that
      // sentence is the whole point — a bare "Sourcing failed" sends an operator hunting.
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

      // ── ⚑ 14 Sep (R121) — SHE PROPOSED SOMETHING; THE OPERATOR STILL PRESSES THE BUTTON ──
      //
      // 🛑 EVERY PROPOSAL LANDS ON THE DOOR IT ALWAYS LANDED ON. Sourcing opens the SAME
      // preview with the same real cost and the same "Run it"; an ICP goes to the editor the
      // operator saves themselves. Nothing here executes, and nothing here is a new
      // authority — the model chose which door, never whether to walk through it.
      //
      // ⚠️ AN UNKNOWN PROPOSAL IS IGNORED, NOT GUESSED AT. The server returns only the four
      // it knows; a fifth would be a model inventing an action, and the right answer to that
      // is her sentence and no button.
      const proposal = json.proposal as { kind?: string; input?: Record<string, unknown> } | null
      if (proposal?.kind === 'propose_sourcing') {
        // ⚑ 7 Sep, UNCHANGED — a PROGRAMME's batch size is the programme's, so a count in the
        // sentence is read as intent only and discarded on that path.
        const action = surface?.programmeSourcing ?? null
        if (action) previewProgrammeSource(action)
        else void previewSource(Math.max(1, Math.min(200, Number(proposal.input?.count) || 20)))
      }
    } catch (e) {
      setCmdLog(l => [...l, { role: 'vida', text: e instanceof Error ? e.message : 'Command failed' }])
    } finally { setCmdBusy(false) }
  }

  const run = useCallback((t: string) => { void runCommand(t) }, [selected, cmdBusy]) // eslint-disable-line react-hooks/exhaustive-deps
  const say = useCallback((role: 'operator' | 'vida', text: string) => setCmdLog(l => [...l, { role, text }]), [])
  const value = useMemo<VidaConversationApi>(
    () => ({ selected, selectedName, setSelected, selectedDraft, setSelectedDraft, run, say, busy: cmdBusy, publish, unpublish, setSlot }),
    [selected, selectedName, setSelected, selectedDraft, setSelectedDraft, run, say, cmdBusy, publish, unpublish])

  // ⚠️ THE CLIENT HEADER IS NOT HERE, AND THAT IS DELIBERATE. The avatar, the company name,
  // the onboarding percentage, the wallet chip, the "you're working X" line, the "Needs you"
  // alert strip and the onboarding-gap strip are all CONSOLE state — they read `cockpit`,
  // `myAlerts`, `modelView` and the client row, and their buttons switch the console's tabs
  // and write the console's asks. They stay exactly where they are, in `app/vida/page.tsx`,
  // above the element this panel is painted into. What moved is the conversation: the
  // blockers it is scoped by, the transcript, the shortcuts and the composer.
  const panel = (<>
        {/* live gate counts for THIS client.
            ⚑ 4 Sep (UI-010) — GUARDED ON THE FACTS, NOT ON THE OBJECT. `{surface && …}` drew
            "0 Send gate · 0 Money gate · 0 Unsent sourced · 0 To triage" for any published
            surface at all, so a workspace that cleared its contribution still left a row of
            confident zeros nobody had read. No blockers, no strip. */}
        {surface?.blockers && (
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

        {/* ── ⚑ 9 Sep — VIDA'S HEADER, AND THE ONE WORD FOR HER POSTURE ──────────────────
            🛑 FOUR MODES AND NO OTHERS: No action needed · Working · Watching · Needs you.
            The pill is the fastest thing on the screen to read, so it must never say anything
            the operator then has to interpret — "Needs you" is a promise there is something
            here they can actually do. */}
        {surface?.lifecycle && (
          <div className="shrink-0 flex items-center gap-2 px-[22px] py-2.5 border-b border-[#f2ecfb]">
            <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#EC4899] text-white flex items-center justify-center text-[13px] font-extrabold">V</span>
            <b className="text-[14.5px] text-[#1f1235]">Vida</b>
            <span className="text-[12.5px] text-[#9b8ec4]">· operational &amp; watching</span>
            <span className={`ml-auto flex items-center gap-1.5 text-[12.5px] font-extrabold ${
              surface.lifecycle.mode === 'Needs you' ? 'text-[#c2410c]'
              : surface.lifecycle.mode === 'Working' ? 'text-[#7C3AED]'
              : surface.lifecycle.mode === 'Watching' ? 'text-emerald-700' : 'text-[#9b8ec4]'}`}>
              <span className={`w-2 h-2 rounded-full ${
                surface.lifecycle.mode === 'Needs you' ? 'bg-[#f97316]'
                : surface.lifecycle.mode === 'Working' ? 'bg-[#7C3AED]'
                : surface.lifecycle.mode === 'Watching' ? 'bg-emerald-500' : 'bg-[#cfc4e8]'}`} />
              {surface.lifecycle.mode}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-[22px] py-3.5 space-y-2">
          {surface?.boardError && <div className="text-[13px] font-semibold text-red-600">{surface.boardError}</div>}
          {/* ⚠️ THE STANDING STATE, ABOVE THE CONVERSATION AND ALWAYS PRESENT. These are not
              chat turns — they are what is true right now, so they do not scroll away behind a
              question the operator asked, and they are re-read from the server on every load. */}
          {surface?.lifecycle?.messages.map((m, i) => (
            <div key={`lc-${i}`}>
              <span className="inline-block text-[13.5px] leading-relaxed rounded-xl px-3.5 py-2 max-w-[85%] text-left bg-[#f3ecff] text-[#1f1235]">{m}</span>
            </div>
          ))}
          {cmdLog.length === 0 && (
            <div className="text-[13.5px] text-[#9b8ec4] leading-relaxed max-w-lg">
              Ask Vida anything about <b className="text-[#5c5279]">{selectedName || 'this client'}</b> — or use a shortcut below.
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

          {progPreview && (
            <div className="border border-[#e4dcf7] bg-white rounded-xl px-3.5 py-3 max-w-md">
              <b className="text-[13.5px] block mb-1">
                {progPreview.blocked ? 'This programme cannot source yet' : sourcingConfirmQuestion(progPreview)}
              </b>
              {progPreview.blocked
                ? <p className="text-[12.5px] text-[#5c5279] leading-relaxed">{progPreview.blocked}</p>
                : <p className="text-[12.5px] text-[#5c5279] leading-relaxed">This runs the programme&rsquo;s next authorised batch against the targeting attached to it.</p>}
              <div className="flex gap-2 mt-2.5">
                {!progPreview.blocked && (
                  <button onClick={confirmProgrammeSource} disabled={srcBusy}
                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3 py-1.5 text-[13px] font-bold disabled:opacity-60">
                    {srcBusy ? 'Sourcing…' : 'Confirm & source'}
                  </button>
                )}
                <button onClick={() => setProgPreview(null)} className="border border-[#ece5fb] rounded-lg px-3 py-1.5 text-[13px] font-bold text-[#5c5279]">
                  {progPreview.blocked ? 'Close' : 'Cancel'}
                </button>
              </div>
            </div>
          )}
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
            {/* ⚑ 9 Sep — THE STATE'S OWN CHIPS COME FIRST. Two or three questions that are
                worth asking AT THIS STAGE, in front of the two generic ones. They are not a
                second navigation: each one is a sentence the operator would otherwise type. */}
            {(surface?.lifecycle?.chips ?? []).map(c => (
              <button key={`lc-${c}`} onClick={() => void runCommand(c)} disabled={cmdBusy}
                className="text-[12.5px] font-bold text-[#7C3AED] bg-[#f7f4fd] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f0eafb] disabled:opacity-50">{c}</button>
            ))}
            {["What's blocking?", 'Status'].map(c => (
              <button key={c} onClick={() => void runCommand(c)} disabled={cmdBusy}
                className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">{c}</button>
            ))}
            {/* ⚑ 7 Sep (HOUSE-008) — ONE SHORTCUT, TWO PATHS, AND THE LABEL TELLS THE TRUTH.
                It used to be the literal 'Source 20 leads' for everyone, and the WORDS ON THE
                BUTTON decided how many records were bought. For a programme the quantity now
                comes off programme truth and the click goes to the programme-native route.
                ⛓️ 14 Sep (R121) — for an ordinary client the sentence now reaches VIDA, who
                proposes a count; the preview and the operator's confirm are unchanged, so the
                button still cannot spend anything on its own. */}
            <button
              onClick={() => {
                const action = surface?.programmeSourcing ?? null
                if (action) previewProgrammeSource(action)
                else void runCommand('Source 20 leads')
              }}
              disabled={cmdBusy}
              className="text-[12.5px] font-semibold text-[#7C3AED] border border-[#e4dcf7] rounded-full px-3 py-1 hover:bg-[#f7f4fd] disabled:opacity-50">
              {sourcingChipLabel(surface?.programmeSourcing ?? null)}
            </button>
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
              placeholder={`Command Vida in ${selectedName || 'client'} context…`}
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
