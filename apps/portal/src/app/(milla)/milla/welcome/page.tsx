'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
// ⚑ 14 Sep (S1-PD-08) — the Get Help state machine. Pure, executed by the gate, and the one
// place that decides what this screen is allowed to claim happened.
import {
  mayStartHelp, helpStateAfter, helpCopy, helpButtonLabel, SUPPORT_EMAIL, type HelpState,
} from '@/lib/get-help-state'
// ⚑ 24 Aug — PACK_PRICE_USD / PACK_LEADS are no longer imported here, and that is the
// point rather than a tidy-up: this screen no longer names a price at all. The pack ask
// moved behind "Looks right" on the desk, where those constants are still interpolated.
// If a price ever needs to appear on this panel again, import them then — do not
// hand-type one (the 3-Aug $99-vs-$299 bug).

// #513/#514 — MILLA CONVERSATIONAL ONBOARDING. Milla-led, no forms: the client describes
// who they want to reach, Milla (via /icps/builder/chat) proposes a structured ICP, we show
// it + a recommended credit plan (from /icps/preview-count), and on approval we persist the
// ICP (POST /icps → this becomes v1) and drop them on the dashboard. Design ref: the
// approved onboarding preview. Full-screen (MillaShell hides its chrome on /milla/welcome).
//
// ── 24 Aug — THIS IS NOW THE WHOLE FIRST RUN, NOT THE SECOND HALF OF IT ─────────────────
// A new client used to be interviewed at /onboard before they entered K.I.N.D at all: six
// scripted questions, FIGSY's face over copy that said "I'm Milla", and "what does your
// company do?" asked there and then asked AGAIN here. The founder ruled that authentication
// is all that happens before K.I.N.D. So this page now also collects the account facts —
// company, who we're speaking to, country, mobile, website — and writes the clients row at
// the confirmation, through the UNCHANGED /auth/onboard handler.

type IcpDraft = {
  name: string; industries: string[]; job_titles: string[]; seniority_levels: string[]
  company_sizes: string[]; geographies: string[]; tech_stack: string[]; keywords: string[]
  apollo_only_consented: boolean
}
/** What Milla learned about the BUSINESS — the half FIGSY writes from. */
type Business = {
  product: string; pitch: string; pain_points: string
  differentiators: string; tone: string; bad_fit: string
}
/** The few facts the ACCOUNT needs. `company_name` and `country` are required by
 *  `onboardSchema` and by the clients table; the rest are genuinely optional. */
type Profile = {
  company_name: string; country: string; contact_name: string
  phone: string; website: string; industry: string
}
/** The basic website read's output — six targeting arrays, and nothing about the business. */
type WebsiteEvidence = {
  url?: string; industries?: string[]; job_titles?: string[]; seniority_levels?: string[]
  company_sizes?: string[]; geographies?: string[]; keywords?: string[]
}
/** A specific claim (named customer, case study, result). Unusable in outreach until permitted. */
type ProofClaim = { claim: string; permitted: boolean }
type BuilderReply =
  | { type: 'question'; content: string }
  | { type: 'complete'; icp: IcpDraft; summary: string | null
      profile?: Profile; business?: Business; proof?: ProofClaim[]
      website_hints?: string[]; campaign_intent?: string
      // ⚑ 14 Sep (S1-RT-005) — what the SERVER could not translate into provider values.
      // Carried, never interpreted: this app decides nothing about it and shows the client
      // nothing different because of it.
      icp_review?: { requirements: Array<{ field: string; said: string[] }> } | null }
type Msg = { role: 'user' | 'assistant'; content: string }

async function token(): Promise<string | undefined> {
  try { const { data } = await createClient().auth.getSession(); return data.session?.access_token } catch { return undefined }
}

/** ── A PERSON'S WEBSITE, TURNED INTO A URL (GPT review, 24 Aug) ────────────────────────
 *
 *  `/auth/onboard` validates `website` with `z.string().url()`, and a person asked for their
 *  website says "acme.com". That is not a URL, and the whole account creation — company,
 *  country, referral, consent — would have 400'd on the one optional field, because the first
 *  cut trusted the model to happen to emit a scheme. It usually would. "Usually" is not a
 *  contract, and the failure lands on the client's very first action.
 *
 *  So the value is normalised here, deterministically, before it is ever posted:
 *    ''               → ''             (blank stays blank — the field is optional)
 *    'https://acme.com' → unchanged     (already valid)
 *    'acme.com'       → 'https://acme.com'
 *    'www.acme.com'   → 'https://www.acme.com'   (their words kept, scheme added)
 *    'we don't have one' → null        (NOT a website, and nothing is invented from it)
 *
 *  ⚠️ It only ever ADDS A SCHEME to something already shaped like a host. It never guesses a
 *  domain from a company name, never infers one from an email, and returns null rather than
 *  producing a plausible-looking URL nobody typed.
 *
 *  ⚠️ NOT EXPORTED, and it cannot be: a Next.js App Router page may only export page fields,
 *  and `export function normalizeWebsite` failed the portal build with "not a valid Page
 *  export field". `first-run-milla.test.ts` therefore lifts this function out of the source
 *  and runs it, which tests the real thing without needing an export the router forbids. */
function normalizeWebsite(raw: string | null | undefined): string | null {
  const v = (raw ?? '').trim()
  if (!v) return ''                                   // blank is a valid answer: no website
  if (/\s/.test(v)) return null                       // a sentence is not a website
  // ⚠️ AN EMAIL ADDRESS IS NOT A WEBSITE, and this is not theoretical: `new URL` happily
  // reads "jacques@acme.com" as userinfo + host, so the first cut of this helper turned a
  // client's email into "https://jacques@acme.com" and stored it as their site. Caught by
  // the guard below. Anything carrying credentials-shaped syntax is refused outright.
  if (v.includes('@')) return null
  const withScheme = /^https?:\/\//i.test(v) ? v : `https://${v}`
  const u = (() => { try { return new URL(withScheme) } catch { return null } })()
  if (!u) return null
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
  // A host must look like a real domain: at least one dot and an alphabetic TLD. This is
  // what rejects "hello", "acme.", "127.0.0.1" and anything with an @ in it.
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(u.hostname)) return null
  return u.toString().replace(/\/$/, '')              // no cosmetic trailing slash
}

/** First thing in a message that looks like the client's website. Deliberately dumb: it only
 *  has to spot "acme.co.za" or "https://acme.com" so Milla can offer to have a look. A miss
 *  costs nothing — she asks for it in words, and the client can say it again.
 *  Normalised through the SAME helper the account write uses, so the site we read and the
 *  site we store can never disagree. */
function firstUrl(text: string): string | null {
  const m = text.match(/\b(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(\/\S*)?/i)
  if (!m) return null
  const host = m[1].toLowerCase()
  // An email address is not a website.
  if (text.toLowerCase().includes(`@${host}`)) return null
  return normalizeWebsite(host) || null
}

const GREETING = "Hi 👋 I'm Milla, your campaign partner. Let's get you set up — tell me a bit about your company and who your best customers are, and I'll build your targeting plan. No forms."
// ⚠️ REFINING IS NOT STARTING AGAIN (22 Aug, integration fix). A prospect who says "not
// these people" after their first proof batch arrives back on this page — and it greeted
// them as a stranger and saved as if it were building something new. The server now keeps
// ONE core ICP and updates it, so the words here have to match: this is the same targeting
// being sharpened, not a second experiment.
const REFINING_GREETING = "Welcome back 👋 Let's sharpen the same targeting rather than start over — tell me what was off about the people I found, and I'll adjust who we look for."

/**
 * ⚑ MVP1 — the welcome back for somebody whose Brief is part-collected.
 *
 * ⚠️ THE NUMBERS ARE THE SERVER'S, INTERPOLATED — never typed. `count` and `total` come from
 * the shared eleven-fact counter and `nextLabel` from the same list; this app has no opinion
 * about what the facts are or how many there are.
 *
 * ⚠️ AND IT PROMISES NOTHING ABOUT CONFIRMATION. Holding every fact is not the same as having
 * confirmed the brief — that gate is separate, and it is the panel after this conversation.
 */
function resumeGreeting(count: number, total: number, nextLabel: string | null): string {
  const held = `Welcome back 👋 I still have everything you told me — that's ${count} of ${total} things I needed.`
  return nextLabel
    ? `${held} Next up: ${nextLabel.toLowerCase()}.`
    : `${held} I have everything I need — say the word and I'll put your plan together.`
}

export default function MillaWelcomePage() {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [proposed, setProposed] = useState<IcpDraft | null>(null)
  // ⚑ 14 Sep (S1-RT-005) — carried from the completion to `POST /icps`, which is what
  // persists it. Held here for one hop only; this app never reads it to decide anything.
  const [icpReview, setIcpReview] = useState<{ requirements: Array<{ field: string; said: string[] }> } | null>(null)
  // ⚑ 24 Aug — the VALUE is no longer read on this screen (the plan card that displayed it
  // is gone), but the setter stays: `propose()` still runs the gated preview and "Keep
  // adjusting the target" still clears it, and neither of those is copy. Bound as `[,
  // setMatchCount]` rather than deleted, so the preview behaviour is untouched by a copy
  // change. ⚠️ REPORTED, NOT FIXED HERE: that means /icps/preview-count now has no consumer
  // on this page. Whether it should still run at all is a provider-boundary question, and
  // this build is copy-only.
  const [, setMatchCount] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ⚑ 14 Sep (S1-RT-003/004) — the server's own eleven-fact progress, held so the resume
  // path and the Get Help escape can both speak from it. The numbers are never derived here.
  const [briefProgress, setBriefProgress] = useState<{ count: number; total: number } | null>(null)
  const [briefNext, setBriefNext] = useState<string | null>(null)
  // What Milla understood about the business, alongside the targeting.
  const [business, setBusiness] = useState<Business | null>(null)
  const [proof, setProof] = useState<ProofClaim[]>([])
  const [intent, setIntent] = useState('')
  // Do they already have a core ICP? Then this visit is a REFINEMENT of it.
  const [refining, setRefining] = useState(false)
  // ⚑ 24 Aug — the account facts, and whether this person already HAS an account.
  // `null` = we have not looked yet. Everything first-run-only keys off `hasClient === false`
  // so that an unanswered lookup never causes an existing client to be treated as new.
  const [hasClient, setHasClient] = useState<boolean | null>(null)
  // ── THE FIRST MESSAGE CANNOT RACE THE LOOKUP (GPT review, 24 Aug) ──────────────────
  // `hasClient` starts null and resolves asynchronously, and a real person types fast. In
  // the first cut, a brand-new client who pasted their website into the very first message
  // hit `readWebsite`'s `hasClient !== false` guard while the answer was still in flight —
  // so their site was silently never read — and `send` posted with no idea which mode the
  // conversation was in. Both failures are invisible: nothing errors, the client just gets
  // a worse product than the one we built.
  //
  // FAIL CLOSED. Nothing substantive happens until the answer is in. And a lookup that
  // FAILED is not an answer: it must never be resolved by guessing, in either direction.
  // Guessing "new" re-interviews a paying client; guessing "existing" strands a new one
  // with no account. So it becomes a retry, and until then: no provider call, no write.
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [profile, setProfile] = useState<Profile | null>(null)
  // Provisional website evidence: held to pass BACK into Milla's context, and shown on the
  // panel as unconfirmed until the client endorses it out loud.
  const [webEvidence, setWebEvidence] = useState<WebsiteEvidence | null>(null)
  const [webHints, setWebHints] = useState<string[]>([])
  /** Websites already read this session. The founder capped it: one read per supplied
   *  website, and another only if the client explicitly changes it to a different one. */
  const readSites = useRef<Set<string>>(new Set())
  const bodyRef = useRef<HTMLDivElement>(null)

  /** Resolve "does this person already have an account?" — the question every first-run
   *  rule below keys off. Separate and retryable, because it is now a hard prerequisite
   *  rather than a nice-to-have. */
  const loadStatus = useCallback(async () => {
    setStatus('loading')
    const tk = await token()
    // `/clients/me/profile` answers with `data: null` rather than 404, so a brand-new
    // signup is a clean "no" and not an error. Only a CONFIRMED answer sets the flag.
    try {
      const p = await api.get<{ data: { id: string } | null }>('/clients/me/profile', tk)
      setHasClient(Boolean(p.data?.id))
      setStatus('ready')
    } catch {
      setHasClient(null)
      setStatus('error')
      return
    }
    try {
      const r = await api.get<{ data: Array<{ id: string }> }>('/icps', tk)
      if ((r.data ?? []).length > 0) {
        setRefining(true)
        setMessages(m => (m.length === 1 && m[0].content === GREETING)
          ? [{ role: 'assistant', content: REFINING_GREETING }] : m)
        return
      }
    } catch { /* silent — the page still works as first-time setup */ }

    // ── ⚑ MVP1 — THEY STARTED THIS BEFORE, AND WE STILL HAVE THEIR ANSWERS ─────────────
    //
    // 🛑 WHAT THIS FIXES. The whole Brief lived in `messages`, in one browser tab. Close it,
    // reload, or come back tomorrow and every answer was gone — the client was greeted as a
    // stranger and asked the same eleven things again. Their answers are in the draft now, and
    // this is the screen finally saying so.
    //
    // ⚠️ THE COUNT AND THE NEXT FACT ARE THE SERVER'S. `progress` comes from the shared
    // eleven-fact counter and `next` from the same list, in the same order. There is no
    // eleven-fact list in this app, and the denominator is never typed here.
    //
    // ⚠️ IT ONLY REPLACES THE GREETING, NEVER A REAL TRANSCRIPT. A client who reloaded
    // mid-sentence keeps what is on screen; the resume line is for an empty conversation.
    //
    // ⚠️ AND IT FAILS SILENT. No draft, an unreadable draft, or a draft with nothing in it
    // yet all leave this page exactly as it was before this existed.
    try {
      const d = await api.get<{ data: {
        progress: { count: number; total: number }
        next: { id: string; label: string } | null
        conversation?: { role: 'user' | 'assistant'; content: string }[]
      } }>('/milla/brief-draft', tk)
      const p = d.data?.progress
      const next = d.data?.next ?? null
      const convo = d.data?.conversation ?? []
      // ⚑ 14 Sep (S1-RT-004) — held so Get Help can tell an operator where they are stuck.
      if (p) setBriefProgress(p)
      setBriefNext(next?.label ?? null)
      // ── 🛑 ⚑ 14 Sep (S1-RT-003) — THE CONVERSATION COMES BACK, NOT JUST THE COUNT ─────
      //
      // ⛓️ WHAT STOOD HERE replaced the greeting with a one-line "welcome back, that's N of
      // 11" and nothing else, because the transcript existed nowhere but this tab. Two things
      // followed, and both were live: the client saw what looked like a conversation that had
      // restarted, and Milla's NEXT turn was sent with that single line as its entire history
      // — so she genuinely had no memory of the last ten minutes and could not continue
      // naturally. Milla is conversational precisely because every client says the same thing
      // differently; a Milla who forgets is a different product.
      //
      // ⚠️ THE SERVER'S COPY, ALREADY BOUNDED AND VALIDATED (`readConversation`). This app
      // does not decide the window, trim the turns or filter the roles — a second opinion
      // about the transcript is how two copies drift apart.
      //
      // ⚠️ IT REPLACES ONLY THE UNTOUCHED GREETING, exactly as the resume line did. A client
      // who reloaded mid-sentence keeps what is on their screen; this is for a conversation
      // that has not started in THIS tab. So a refresh cannot duplicate a message — the
      // restored transcript is assigned, never appended.
      //
      // ⚠️ AND THE RESUME LINE IS STILL SAID, AFTER the transcript. It is what tells them
      // their answers survived and what is still needed — the count is the server's, and
      // there is no eleven-fact list in this app.
      if (convo.length > 0) {
        setMessages(m => (m.length === 1 && m[0].content === GREETING)
          ? [...convo, ...(p && p.count > 0
              ? [{ role: 'assistant' as const, content: resumeGreeting(p.count, p.total, next?.label ?? null) }]
              : [])]
          : m)
      } else if (p && p.count > 0) {
        // No stored transcript (a Brief begun before this existed, or an unreadable value):
        // exactly the previous behaviour, which is still strictly better than a bare greeting.
        setMessages(m => (m.length === 1 && m[0].content === GREETING)
          ? [{ role: 'assistant', content: resumeGreeting(p.count, p.total, next?.label ?? null) }] : m)
      }
    } catch { /* silent — a client with no saved draft simply gets the normal greeting */ }
  }, [])

  useEffect(() => { void loadStatus() }, [loadStatus])

  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, proposed])

  const propose = useCallback(async (icp: IcpDraft) => {
    setProposed(icp)
    // ── PAID PREVIEW WAITS FOR THE ACCOUNT (founder-ruled 24 Aug) ─────────────────────
    // /icps/preview-count runs real PDL/Apollo calls and needs no client row, so once
    // signup landed straight here it would have become the normal way a brand-new visitor
    // reached a paid provider — before we knew who they were. The founder's sequencing
    // ruling: confirm, create the client row, persist the understanding, and only THEN may
    // normal preview/proof/provider behaviour occur.
    //
    // Nothing about the provider path itself changes — not the cache, not the rate limit,
    // not `audienceForUser`, not the boundary. This is WHEN it may be called, not HOW.
    // The panel already renders a null count as "—" (that has always been the path when a
    // preview fails), so a first-run client sees the recommended starter plan and no
    // invented number.
    if (hasClient !== true) { setMatchCount(null); return }
    try {
      const r = await api.post<{ data: { count: number } }>('/icps/preview-count', icp, await token())
      setMatchCount(typeof r.data?.count === 'number' ? r.data.count : null)
    } catch { setMatchCount(null) }
  }, [hasClient])

  /** The existing BASIC website read, moved inside Milla. Returns evidence to be CONFIRMED,
   *  never targeting to be applied. First-run only, once per distinct website. */
  const readWebsite = useCallback(async (url: string): Promise<WebsiteEvidence | null> => {
    if (hasClient !== false) return null          // existing client opening Milla: never
    if (readSites.current.has(url)) return null   // one read per supplied website
    readSites.current.add(url)
    try {
      const r = await api.post<{ data: Omit<WebsiteEvidence, 'url'> }>('/icps/prefill', { website_url: url }, await token())
      const ev: WebsiteEvidence = { url, ...(r.data ?? {}) }
      setWebEvidence(ev)
      return ev
    } catch {
      // A site that will not load or parse is not an error the client should carry. Milla
      // simply carries on asking, which is what she would have done anyway.
      return null
    }
  }, [hasClient])

  // ⚑ 26 Aug — ONE DELIVERY PATH, SO A RETRY IS THE SAME CODE AS A SEND.
  //
  // THE DEFECT THIS RESTRUCTURE CLOSES. When a turn failed, the error banner told the
  // client to "send your last answer again" — but their answer was ALREADY in `messages`
  // and already re-sent with the next attempt, so obeying appended a duplicate user turn
  // ("no" twice in a row) and the model saw a transcript the client never spoke. The
  // truthful recovery is to re-deliver the history AS IT STANDS, which is what `retry()`
  // does and what the failure banner now offers.
  const [canRetry, setCanRetry] = useState(false)
  // ⚑ 14 Sep (S1-RT-004) — the Get Help escape, and whether it has already been taken.
  // ⚑ 14 Sep (S1-PD-08) — ONE state with FOUR values, not two booleans that could both be
  // wrong at once. `helpSent === true` used to be set by the catch block as well as the try,
  // so a failed escalation told the client K.I.N.D had been told.
  const [helpState, setHelpState] = useState<HelpState>('idle')

  /**
   * ⚑ 14 Sep (S1-RT-001) — the product's canonical sign-out, reached from onboarding.
   *
   * ⚠️ IDENTICAL TO `MillaShell.signOut`, deliberately. A second way to end a session is a
   * second thing that can be wrong about what a session is; this is the same two lines.
   * `window.location.href` rather than the router, so no React state outlives the sign-out.
   */
  async function signOut() {
    try { await createClient().auth.signOut() } catch { /* ignore — leaving is not blocked */ }
    window.location.href = '/login'
  }

  /**
   * 🛑 ⚑ 14 Sep (S1-RT-004) — A HUMAN, WHEN MILLA CANNOT RECOVER.
   *
   * THE DEFECT. A failed turn offered exactly one action: Try again. When the failure was
   * deterministic — and the live one was, because a retry re-sends the identical transcript
   * to the same model — that button could never work, and a brand-new client's first
   * experience of K.I.N.D was a dead end with no way to reach anybody.
   *
   * ⚠️ THE EXISTING PRIMITIVE, NOT A NEW ONE. `POST /support/escalate` is the same route
   * `VidaHelpBubble` already uses; it resolves the person from their auth token and raises a
   * `support_escalation` founder alert. It does `.maybeSingle()` on `clients`, so it already
   * works for somebody who has no client row yet — which is every client in this screen.
   *
   * ⚠️ IT SENDS CONTEXT, NEVER A STACK TRACE. What Milla last asked, what the client last
   * answered and how far through the eleven they are — enough for an operator to pick it up
   * and continue by hand. The client is shown a plain sentence; the technical error text is
   * ours and stays in the alert, not in their message.
   */
  async function getHelp() {
    // ⚠️ `mayStartHelp` IS THE DUPLICATE FENCE TOO: `sending` and `sent` both refuse, so a
    // second click after a successful ask cannot raise a second alert for the same moment.
    // `failed` is the one state that lets a client try again.
    if (!mayStartHelp(helpState)) return
    setHelpState('sending')
    try {
      const { data: { session } } = await createClient().auth.getSession()
      const lastAsk = [...messages].reverse().find(m => m.role === 'assistant')?.content ?? '(nothing yet)'
      const lastAnswer = [...messages].reverse().find(m => m.role === 'user')?.content ?? '(nothing yet)'
      await api.post('/support/escalate', {
        message: [
          '🆘 A client is STUCK IN THE MILLA BRIEF and asked for help from the onboarding screen.',
          // ⚠️ STATED FROM WHAT WE ACTUALLY KNOW, NEVER ASSUMED. This screen is reached by
          // people mid-signup AND by a client who already has an account revisiting it, so
          // asserting "no client row" for everybody would put a false sentence in front of
          // an operator. `hasClient` is the server's own answer to that question.
          hasClient === false
            ? 'They have NO client row yet — this is a signed-in onboarding identity (see reply-to).'
            : hasClient === true
              ? 'They DO already have a client account (see reply-to).'
              : 'Whether they already have a client account could not be established from this screen.',
          '',
          `Brief progress: ${briefProgress ? `${briefProgress.count} of ${briefProgress.total} facts held` : 'not known'}.`,
          `Still needed: ${briefNext ?? '(not known)'}.`,
          '',
          `Milla last asked: ${lastAsk}`,
          `They last answered: ${lastAnswer}`,
          '',
          `What the screen showed them: ${error ?? '(no error text)'}`,
        ].join('\n'),
      }, session?.access_token)
      // Reached ONLY when the POST resolved — `apiFetch` throws on every non-2xx and on a
      // network failure, so there is no path where this line runs and nobody was told.
      setHelpState(helpStateAfter(true))
    } catch {
      // ⛓️ ~~`setHelpSent(true)`~~ STOOD HERE, under a comment claiming the client was "given
      // an address they can reach without us". They were not: this set the SUCCESS flag and
      // rendered "K.I.N.D has been told" over a request that had failed. The escape hatch
      // reported success while doing nothing — a stuck client waited for an email nobody was
      // ever going to send, and stopped looking for another way through.
      setHelpState(helpStateAfter(false))
    }
  }

  async function deliver(history: Msg[], evidence: WebsiteEvidence | null) {
    setError(null); setCanRetry(false); setThinking(true)
    try {
      // The route cannot know who is calling — it holds no client row — so the mode is
      // stated explicitly. TRUE only on a confirmed first run; a returning client is asked
      // for nothing about an account they already have.
      // ⚠️ THE GREETING IS UI COPY, NOT A CONVERSATION TURN (founder-ruled 24 Aug).
      // `messages[0]` is the seeded greeting rendered as an assistant bubble, so the array
      // posted to the model used to BEGIN with an assistant turn — and the API contract is
      // that the first message must be a user turn. Everything from the client's first real
      // answer onward is sent; the greeting stays on screen and out of the payload.
      const forModel = history.slice(history.findIndex(m => m.role === 'user'))
      // ⚠️ 60s, NOT the 15s default. The server gives Anthropic 45s with one retry; a
      // browser that walks away at 15s abandons a reply that is still legitimately coming,
      // and this route keeps no server state, so that work was simply thrown away.
      const r = await api.post<{ data: BuilderReply }>(
        '/icps/builder/chat',
        {
          messages: forModel,
          profile_required: hasClient === false,
          ...(evidence ? { website_evidence: evidence } : {}),
        },
        await token(),
        60_000,
      )
      const d = r.data
      if (d.type === 'complete') {
        setMessages(m => [...m, { role: 'assistant', content: d.summary || "Here's the targeting plan I'd recommend — review it on the right." }])
        if (d.profile) setProfile(d.profile)
        if (d.business) setBusiness(d.business)
        if (Array.isArray(d.proof)) setProof(d.proof)
        if (Array.isArray(d.website_hints)) setWebHints(d.website_hints)
        // ⚠️ SET ON EVERY COMPLETION, including to `null`. A later completion that translated
        // cleanly must CLEAR a review the earlier one recorded, or a stale flag would block
        // a client whose targeting is now provider-safe.
        setIcpReview(d.icp_review ?? null)
        if (typeof d.campaign_intent === 'string') setIntent(d.campaign_intent)
        await propose(d.icp)
      } else {
        setMessages(m => [...m, { role: 'assistant', content: d.content }])
      }
    } catch (e) {
      // The user's turn stays in `messages` — nothing was lost, and the banner offers the
      // one action that is actually needed: deliver the same transcript again.
      setError(e instanceof Error ? e.message : 'Milla hit a snag — please try again')
      setCanRetry(true)
    }
    finally { setThinking(false) }
  }

  /** Re-deliver the transcript exactly as it stands. Appends NOTHING. */
  async function retry() {
    // The same fail-closed guard as send(): a retry is a delivery too, and it must not be
    // able to run the conversation in a mode nobody chose.
    if (status !== 'ready' || hasClient === null) return
    if (thinking || messages.findIndex(m => m.role === 'user') < 0) return
    await deliver(messages, webEvidence)
  }

  async function send(text: string) {
    const msg = text.trim(); if (!msg || thinking) return
    // ⚠️ FAIL CLOSED ON AN UNRESOLVED ACCOUNT STATUS. Not a nicety: everything below —
    // which mode the builder runs in, whether the website is read, whether preview may
    // call a provider — depends on knowing. The composer is disabled while this is true,
    // so reaching here means a keyboard submit beat the render; refuse rather than run
    // the conversation in a mode nobody chose.
    if (status !== 'ready' || hasClient === null) return
    setInput('')
    // ⚑ 26 Aug — A RETYPE AFTER A FAILURE IS A RETRY, NOT A NEW TURN. The old banner
    // trained clients to type their last answer again; anyone who still does must not end
    // up with the same words twice in the transcript. Identical text, straight after a
    // failed delivery, re-delivers instead of appending.
    const last = messages[messages.length - 1]
    if (canRetry && last?.role === 'user' && last.content.trim() === msg) {
      await deliver(messages, webEvidence)
      return
    }
    const history = [...messages, { role: 'user' as const, content: msg }]
    setMessages(history)
    // If they just gave us their website, have a look at it BEFORE Milla replies, so her
    // very next message can put what we found to them and ask whether it is right.
    const url = firstUrl(msg)
    const evidence = (url ? await readWebsite(url) : null) ?? webEvidence
    await deliver(history, evidence)
  }

  async function approve() {
    if (!proposed) return
    setSaving(true); setError(null)
    try {
      const tk = await token()

      // ── THE ACCOUNT IS OPENED HERE, ONCE (founder-ruled 24 Aug) ────────────────────
      // This used to happen at the end of the /onboard interview. It now happens at the
      // moment the client says Milla understood them — the same click that saves the ICP.
      //
      // ⚠️ NOTHING IS EVER FILLED IN ON THEIR BEHALF. `company_name` and `country` are
      // required, and if either is missing we ASK rather than submit: the clients table
      // defaults country to 'South Africa', so an empty value would not fail loudly, it
      // would quietly invent a country. The founder ruled that out by name.
      if (hasClient === false) {
        // ── 🛑 ⚑ MVP1 — THE CLIENT CONFIRMS THEIR BRIEF BEFORE ANYTHING IS CREATED ──────
        //
        // ⚠️ THIS CLICK IS THE CONFIRMATION, AND IT IS RECORDED AS ONE. Until now the act
        // existed only in the browser: pressing approve went straight to creating a client,
        // so "the client agreed to this brief" was never a fact the server held. It is the
        // gate Proof is started behind and the $299 is asked for behind, and a gate that
        // lives in a component is not a gate.
        //
        // ⚠️ THE SERVER RE-CHECKS THE ELEVEN HERE. If a fact is genuinely outstanding the
        // route names it, Milla asks for it, and NOTHING has been created — which is the
        // whole reason this call comes before `/auth/onboard` rather than after it.
        //
        // ⚠️ 404 IS NOT A FAILURE. A client whose draft predates this table, or whose draft
        // could not be stored, has nothing to confirm; promotion then behaves exactly as it
        // did before drafts existed. Only a real refusal stops the journey.
        try {
          await api.post('/milla/brief-draft/confirm', {}, tk)
        } catch (e) {
          // ⚠️ BRANCHED ON THE STATUS, NEVER ON THE SENTENCE. Matching prose is how two
          // opposite refusals came to look identical to this app once already (C01); the
          // status is carried through `apiFetch` precisely so a caller need not guess.
          //   404 — nothing to confirm (a journey that predates drafts). Carry on.
          //   409 — already confirmed and promoted. Carry on; every call below is idempotent.
          //   anything else — a real refusal, and NOTHING has been created yet.
          // ── 🛑 ⚑ 14 Sep (S1-RT-006) — AN UNSUPPORTED MARKET IS A CONVERSATION ──────
          //
          // 🛑 THE CLIENT ASKED FOR SOMEWHERE WE DO NOT WORK. Until now they learned that as a
          // raw Zod 400 from `POST /icps` — the THIRD leg — by which point `/auth/onboard`
          // had already created their canonical client row. A real person, now a client, with
          // no ICP and a validation error on screen.
          //
          // ⚠️ MILLA SAYS IT, IN HER OWN THREAD, AND NOTHING IS CREATED. The server refused
          // the CONFIRMATION, so the client row, the ICP, the welcome email and Proof are all
          // still behind a door that did not open. Her sentence is appended as an assistant
          // turn and the composer stays open — the client simply answers, revises the market,
          // and confirms again.
          //
          // ⚠️ BRANCHED ON THE CODE, NEVER ON THE SENTENCE (C01). And placed BEFORE the
          // status branch below, because 409 already means "already confirmed" there — two
          // opposite situations that must not share a path.
          //
          // ⚠️ AND IT DOES NOT FALL THROUGH. `setSaving(false); return` is what keeps the
          // account from being opened for somebody we cannot serve.
          if ((e as { code?: string })?.code === 'unsupported_geography') {
            const ask = e instanceof Error && e.message ? e.message : ''
            setMessages(msgs => [...msgs, { role: 'assistant', content: ask
              || 'We don\u2019t currently source in that market. Are there other markets you\u2019d like us to target?' }])
            setProposed(null)          // the plan card closes; the conversation is live again
            setSaving(false)
            return
          }
          const st = (e as { status?: number })?.status
          if (st !== 404 && st !== 409) {
            setMessages(msgs => [...msgs, { role: 'assistant', content: (e instanceof Error && e.message)
              || 'I could not confirm your brief just yet — nothing has been created. Let us try that again.' }])
            setSaving(false)
            return
          }
        }
        const p = profile
        const missing = [
          !p?.company_name?.trim() ? 'your company name' : '',
          !p?.country?.trim() ? 'which country your business is based in' : '',
        ].filter(Boolean)
        if (missing.length) {
          setMessages(m => [...m, { role: 'assistant', content:
            `Before I can open your account I still need ${missing.join(' and ')} — could you tell me?` }])
          setSaving(false)
          return
        }
        // Partner attribution (P4) and the Item-186 T&C tick were carried from signup by
        // /onboard. It no longer posts, so they are carried from here — to the SAME
        // unchanged handler. Losing the referral would mean a partner is never paid for
        // this client, ever; losing the tick would lose the binding consent record.
        const ref = (() => {
          try {
            const q = new URLSearchParams(window.location.search).get('ref')
            return q || localStorage.getItem('kind_referral') || ''
          } catch { return '' }
        })()
        const termsAccepted = (() => { try { return localStorage.getItem('kind_terms_accepted') === '1' } catch { return false } })()

        await api.post('/auth/onboard', {
          company_name: p!.company_name.trim(),
          country:      p!.country.trim(),
          industry:     p!.industry?.trim() || '',
          // Normalised, never fabricated: "acme.com" becomes a URL the schema accepts, and
          // anything that is not a website at all becomes blank rather than a 400 that
          // would take the whole account creation down with it. Website is optional; the
          // account is not.
          website:      normalizeWebsite(p!.website) || '',
          phone:        p!.phone?.trim() || '',
          contact_name: p!.contact_name?.trim() || '',
          ...(ref ? { referred_by: ref } : {}),
          ...(termsAccepted ? { terms_accepted: true } : {}),
          // ── 🛑 ⚑ 10 Sep (C03) — WHAT THEY SAID THEY WANT, SENT ONCE, IN THEIR WORDS ────
          //
          // `intent` is what the client typed when Milla asked what this is for. It was
          // already captured — and went only to `icps.campaign_intent`, copy input for the
          // sequence writer, rendered nowhere the client would look again. So a client who
          // said "book qualified meetings with those founders and CEOs" then read
          // "OUTCOME — not set yet" on their own home screen.
          //
          // ⚠️ THE SENTENCE ONLY. The server derives the KIND from it (`readStatedOutcome`)
          // — if this screen could declare "meetings", a meeting target could later be
          // agreed against an answer that never asked for one.
          ...(intent.trim() ? { outcome_stated: intent.trim() } : {}),
        }, tk)
        try { localStorage.removeItem('kind_referral'); localStorage.removeItem('kind_terms_accepted') } catch { /* ignore */ }
        setHasClient(true)
      }

      // ⚑ 22 Aug — the SAME conversation now carries the business understanding and the
      // campaign's purpose, not just the targeting. Before this, everything Milla learned
      // about what the client actually sells was discarded the moment the ICP was saved,
      // and FIGSY wrote every email with no idea who it was writing for.
      //
      // `proof` claims each carry their own `permitted` flag. Only the ones the client
      // explicitly approved reach outreach — the rest are recorded for a human to ask about.
      // ⚑ MVP1 — `from_brief_draft` NAMES THE ACT: this save IS the promotion of the brief,
      // not an ordinary revision. It can only make the server STRICTER — a replayed
      // promotion (double click, retry after an ambiguous response) is answered with the
      // core ICP the first call created and writes nothing, so a stale onboarding snapshot
      // can never overwrite confirmed targeting that has legitimately moved on since.
      // ── 🛑 ⚑ 14 Sep (S1-PD-01) — `icp_review` IS NOT SENT, AND MUST NOT BE ────────────
      //
      // ⛓️ ~~`icp_review: icpReview`~~ was here for one round, under a comment calling this
      // app "a courier for one hop". It was carrying the DECISION about whether a client's
      // sourcing is blocked — through a browser, where it could be omitted by a stale build,
      // dropped by a failed render, or replaced by anyone with the developer tools open.
      // The server now derives that from the values it is about to write, so this page sends
      // exactly the targeting and nothing about its own opinion of it. `icpReview` remains in
      // state for ONE purpose: telling the person on screen what is happening.
      const saved = await api.post<{ data?: { id?: string } }>(
        '/icps', { ...proposed, business, proof, campaign_intent: intent, from_brief_draft: true }, tk)

      // ── FREE PROOF COMES BEFORE THE ASK (founder-ruled 24 Aug) ─────────────────────
      //
      // ⚑ This used to be `router.push('/milla/billing?start=1&from=icp')` — the client
      // confirmed that Milla understood them and the very next screen asked for $299,
      // having shown them nothing. The founder's walk caught it: the approved journey is
      // understanding → confirm → FREE PROOF → up to 20 masked leads → the client judges
      // the fit → and ONLY on "Looks right" does the $299 appear. The proof entry existed
      // and worked (`POST /icps/:id/proof`, its passes, its 40-record and $300 fences) —
      // it was simply orphaned on `/milla/icp`, a page a brand-new prospect never opens.
      //
      // Nothing about proof itself changed here. This is the missing navigation.
      const icpId = saved?.data?.id
      try {
        if (!icpId) throw new Error('no icp id')
        // EXACTLY ONE call. Never in a loop, never from an error handler, never retried:
        // a pass is claimed atomically the moment this lands, and a second POST would
        // claim the client's SECOND pass — leaving them two passes down having seen no
        // leads at all. `api.post` itself performs a single fetch with no retry.
        // ⚑ MVP1 — and the same naming on the proof start, for the same reason: a replayed
        // promotion must not claim the client's SECOND free pass before they have looked at
        // the first batch. The server answers `already_started` and claims nothing.
        await api.post(`/icps/${icpId}/proof`, { from_brief_draft: true }, tk)
      } catch (proofErr) {
        // ── 🛑 ⚑ 14 Sep (S1-RT-005) — "WAITING ON US" IS NOT A FAILURE ─────────────────
        //
        // 🛑 THE CLIENT DID NOTHING WRONG AND MUST NOT BE TOLD THEY DID. When their own
        // words could not be translated into provider values, the server refuses Proof —
        // deliberately, so nothing is sourced or spent against targeting we cannot complete
        // — and an operator finishes the translation. That is OUR work in progress, not a
        // broken account, and it is not the terminal failure the branch below describes.
        //
        // ⚠️ BRANCHED ON THE CODE, NEVER ON THE SENTENCE. Matching prose is how two opposite
        // refusals came to look identical to this app once already (C01); `code` is carried
        // through `apiFetch` precisely so a caller need not guess.
        //
        // ⚠️ AND IT DOES NOT PRETEND PROOF STARTED. They go to the desk with no `finding=1`
        // hint — because nothing is being found yet — and the desk's own honest copy stands.
        if ((proofErr as { code?: string })?.code === 'needs_icp_review') {
          router.push('/milla')
          return
        }
        // ── TERMINAL. NO RETRY, NO BILLING (founder-ruled 24 Aug) ───────────────────
        // A proof start that fails is OURS to fix, not something the client did. They
        // stay on this screen, they are told plainly, and there is deliberately no
        // "try again" — pressing it could spend the second pass on top of the first.
        // Falling through to billing would ask a prospect for $299 having shown them
        // nothing, which is the exact defect this build exists to remove.
        //
        // ⚠️ AND IT DOES NOT CLAIM ANYONE WAS TOLD. The first draft ended "we have been
        // told, and we will get this moving and let you know" — traced, and false: the
        // route's failure branch only `console.error`s, a network drop or the 15s timeout
        // never reaches the server at all, and no alert, queue or Vida item exists for this
        // path. A promise nothing keeps is the same defect as the desk's "we'll notify you".
        // It says what is true instead: this is ours to resolve.
        setError('Your targeting is saved, but we could not start finding your matches just yet. Nothing has been charged and nobody has been contacted. K.I.N.D needs to resolve this before your proof can continue.')
        setSaving(false)
        return
      }

      // Their masked leads land on the desk. The $299 lives behind "Looks right" there.
      //
      // ⚑ `?finding=1` — the run is FIRE-AND-FORGET, so the desk would otherwise fetch once
      // on mount, find nothing, and tell them "no leads waiting" until they reloaded by
      // chance. The flag is explicit rather than inferred: "no leads + never paid" is also
      // the state of someone who never started a run, and they must keep the honest copy.
      // It is a READ signal only — the desk polls the existing lead GETs and never POSTs.
      // ⚑ 26 Aug — `?finding=1` IS A HINT, NOT A CLOCK. The run's START was recorded by the
      // claim itself (`clients.proof_started_at`), so nothing timing-related is carried in
      // the URL or written to browser storage. This is the FIRST-CLIENT path — the one a
      // prospect is most likely to walk away from and come back to on another device — and
      // it is exactly the case a browser stamp could never have answered.
      router.push('/milla?finding=1')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save your ICP — please try again'); setSaving(false) }
  }

  // ── NO NUMBER WITHOUT A PREVIEW BEHIND IT (GPT review, 24 Aug) ──────────────────────
  // This read `matchCount == null ? 200 : …`, and 200 then drove the "Approvals" figure
  // AND an "8–14 meetings" estimate. That fallback was written when a null count meant a
  // preview had FAILED — a rare accident. Deferring the paid preview until the account
  // exists makes null the NORMAL first-run state, so the fallback stopped being a graceful
  // degradation and became a fabricated recommendation: a brand-new client would read a
  // precise-looking plan and a meetings range that came from nothing, sitting directly
  // beneath the targeting it appears to describe. That is the "$138 · verified" failure —
  // a number nobody computed, rendered as though somebody had.
  //
  // So the tiles went honest instead. The fix was display-only: no provider call was added,
  // and the preview gate was untouched.
  //
  // ⚑ 24 Aug (free-proof copy) — AND NOW THE PANEL THEY FED IS GONE, so they are too.
  // `previewReady`, `recCredits`, `meetLow` and `meetHigh` existed only to render a plan
  // card that quoted the post-purchase per-lead price before the client had seen a lead.
  // With that card replaced by the free-proof card, nothing reads them — they only fed each
  // other. Deleting them is a consequence of the copy change, not a tidy-up: leaving four
  // dead derivations of a price this screen must not show is how the price finds its way
  // back. The preview itself is UNCHANGED: `matchCount` is still set by `propose()` behind
  // the same account gate, and still cleared by "Keep adjusting the target".
  const chips = (arr: string[]) => arr.filter(Boolean)
  const showProfile = hasClient === false && profile && Object.values(profile).some(Boolean)

  const stepDot = (n: number, label: string, state: 'done' | 'on' | 'todo') => (
    <span className="flex items-center gap-1.5 text-[12px] font-bold shrink-0" style={{ color: state === 'todo' ? '#9b8ec4' : '#7C3AED' }}>
      <span className="w-[22px] h-[22px] rounded-full text-[11px] font-extrabold flex items-center justify-center text-white"
        style={{ background: state === 'done' ? '#059669' : state === 'on' ? '#7C3AED' : '#e7ddf7', color: state === 'todo' ? '#9b8ec4' : '#fff' }}>
        {state === 'done' ? '✓' : n}
      </span>{label}
    </span>
  )

  return (
    <div className="h-screen flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      <header className="h-[54px] shrink-0 flex items-center gap-3 px-6 border-b border-[#eee7f7] bg-white">
        {/* ⚑ 24 Aug — MILLA'S OWN FACE. This was a gradient "M" tile, and the page a client
            reached BEFORE it showed FIGSY's photo over copy that said "I'm Milla". Milla has
            a canonical identity already — Milla · The Brain · /agents/milla.png, the same
            asset the agent gallery and the marketplace use — so it is used here rather than
            anything new being drawn. FIGSY's own surfaces are untouched. */}
        <img src="/agents/milla.png" alt="Milla" className="w-8 h-8 rounded-[10px] object-cover object-top" />
        <b className="text-[15px]">Milla</b><span className="text-[#9b8ec4] text-[12.5px] font-semibold">· let&rsquo;s set up your campaign</span>
        {/* ── 🛑 ⚑ 14 Sep (S1-RT-001) — THERE WAS NO WAY OUT OF ONBOARDING ────────────────
            `MillaShell` returns `<>{children}</>` for /milla/welcome — onboarding is
            deliberately full-screen, with no rail and no top bar. That is also where the
            product's only Sign out lives, so a signed-in person mid-Brief had no normal way
            to leave their own account. On a shared machine that is not a cosmetic gap.

            ⚠️ THE CANONICAL MECHANISM, NOT A SECOND ONE. Byte-for-byte the same act as
            `MillaShell.signOut` — `createClient().auth.signOut()` then a hard navigation to
            /login. No new auth path, no new session concept, and it needs no client row, so
            it works from the first second of onboarding.

            ⚠️ AND IT LOSES NOTHING. The Brief lives in `onboarding_brief_drafts`, keyed on
            the USER, so signing back in resumes the same draft — facts and conversation. */}
        <button
          onClick={() => void signOut()}
          className="ml-auto shrink-0 text-[12.5px] font-semibold text-[#9b8ec4] hover:text-[#1f1235] underline underline-offset-2"
        >
          Sign out
        </button>
      </header>

      <div className="shrink-0 flex items-center gap-3 px-6 py-3 bg-white border-b border-[#eee7f7] overflow-x-auto">
        {stepDot(1, 'Welcome', 'done')}<span className="w-8 h-0.5 bg-[#e7ddf7]" />
        {stepDot(2, 'Your target', proposed ? 'done' : 'on')}<span className="w-8 h-0.5 bg-[#e7ddf7]" />
        {stepDot(3, 'Your plan', proposed ? 'on' : 'todo')}<span className="w-8 h-0.5 bg-[#e7ddf7]" />
        {stepDot(4, 'Go live', 'todo')}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* conversation */}
        <section className="flex-1 min-w-0 flex flex-col">
          <div ref={bodyRef} className="flex-1 overflow-y-auto px-6 py-5">
            <div className="max-w-2xl mx-auto space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed ${m.role === 'user' ? 'bg-[#1f1235] text-white' : 'bg-white border border-[#eee7f7]'}`}>{m.content}</div>
                </div>
              ))}
              {thinking && <div className="flex justify-start"><div className="bg-white border border-[#eee7f7] rounded-2xl px-4 py-2.5 text-[#9b8ec4] text-[13px]">Milla is thinking…</div></div>}
              {error && (
                <div className="text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-3">
                  <span className="flex-1">{error}</span>
                  {/* ⚑ 26 Aug — the one action that actually recovers: re-deliver the
                      transcript as it stands. The answer is already in it; nothing to
                      retype, and pressing this cannot duplicate a turn. */}
                  {canRetry && (
                    <button onClick={() => void retry()} disabled={thinking}
                      className="shrink-0 text-[12px] font-bold text-red-700 underline underline-offset-2 disabled:opacity-50">
                      Try again
                    </button>
                  )}
                  {/* ── 🛑 ⚑ 14 Sep (S1-RT-004) — AND A HUMAN, WHEN TRY AGAIN CANNOT WORK ──
                      Try again re-sends the identical transcript, so a deterministic failure
                      repeats for ever — which is exactly what happened live. A first-time
                      client was left with one button that could not help them and no way to
                      reach anybody. This raises the SAME `support_escalation` the rest of
                      the product uses, works with no client row, and says plainly that a
                      person will pick it up. */}
                  {/* ⚑ 14 Sep (S1-PD-08) — EVERY SENTENCE HERE COMES FROM `helpCopy`, so the
                      screen cannot claim something the state does not support. `sent` is the
                      only state whose copy says anybody was told. */}
                  {helpState === 'sent' ? (
                    <span className="shrink-0 text-[12px] font-semibold text-red-700">
                      {helpCopy('sent').text}
                    </span>
                  ) : (
                    <span className="shrink-0 flex flex-wrap items-center gap-x-2 gap-y-1 justify-end">
                      {helpState === 'failed' && (
                        <span className="text-[12px] text-red-700">{helpCopy('failed').text}</span>
                      )}
                      <button onClick={() => void getHelp()} disabled={helpState === 'sending'}
                        className="shrink-0 text-[12px] font-bold text-red-700 underline underline-offset-2 disabled:opacity-50">
                        {helpButtonLabel(helpState)}
                      </button>
                      {/* 🛑 A ROUTE OUT THAT DOES NOT DEPEND ON US BEING REACHABLE. If our own
                          API cannot be reached, another button that calls it is not an escape. */}
                      {helpCopy(helpState).showFallback && helpCopy(helpState).fallbackHref && (
                        <a href={helpCopy(helpState).fallbackHref as string}
                          className="shrink-0 text-[12px] font-bold text-red-700 underline underline-offset-2">
                          Email {SUPPORT_EMAIL}
                        </a>
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 px-6 pb-5 pt-2 border-t border-[#eee7f7] bg-white">
            {/* The composer is closed until we know whether this person already has an
                account — see the `status` comment above. A failed lookup offers a retry
                rather than a guess, because both guesses are wrong for somebody. */}
            {status === 'error' ? (
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-[12.5px] text-[#7a6a3a]">I couldn&rsquo;t load your account just now, so I&rsquo;d rather not start until I can.</span>
                <button type="button" onClick={() => { void loadStatus() }}
                  className="text-[12.5px] font-bold text-white rounded-xl px-4 py-2 bg-[#7C3AED] shrink-0">Try again</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); send(input) }} className="max-w-2xl mx-auto flex gap-2">
                <input value={input} onChange={e => setInput(e.target.value)} disabled={status !== 'ready'}
                  placeholder={status === 'ready' ? 'e.g. Heads of Ops at UK logistics firms, 50–500 staff…' : 'One moment — getting your account ready…'}
                  className="flex-1 text-[13.5px] rounded-xl border border-[#e4dcf7] px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 disabled:opacity-50" />
                <button type="submit" disabled={status !== 'ready' || thinking || !input.trim()} className="text-[13px] font-bold text-white rounded-xl px-6 bg-[#7C3AED] disabled:opacity-50">Send</button>
              </form>
            )}
          </div>
        </section>

        {/* proposal */}
        <aside className="w-[420px] shrink-0 border-l border-[#eee7f7] bg-white overflow-y-auto">
          {!proposed ? (
            <div className="p-6 text-[13px] text-[#9b8ec4] leading-relaxed">
              <div className="text-[15px] font-bold text-[#1f1235] mb-2">Your targeting plan</div>
              {/* ⛓️ 30 Aug (BUILD-004A-1 live-walk, FOUNDER DECISION 4) — FOUNDER'S EXACT
                  WORDS. This read: "a recommended **credit plan** here. You approve before
                  anything starts." Retired on both counts — "credit plan" is the wallet/pack
                  economics the programme model removed, and "You approve" is the per-lead
                  approval it also removed. A prospect met both on the FIRST screen of the
                  product, before they had seen a single person.
                  ⚠️ `&rsquo;` not a literal ’ — this is a JSX text node and every other
                  apostrophe in this file is written the same way. */}
              As we chat, Milla builds your <b>ICP</b> (who to target) and a recommended <b>programme</b> here. You&rsquo;ll review it before anything starts.
            </div>
          ) : (
            <div className="p-6">
              <div className="text-[15px] font-bold mb-1">Proposed ICP · <span className="text-[#7C3AED]">v1</span></div>
              <div className="text-[13px] text-[#5c5279] font-semibold mb-3">{proposed.name}</div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {[...chips(proposed.seniority_levels), ...chips(proposed.job_titles), ...chips(proposed.industries), ...chips(proposed.geographies), ...chips(proposed.company_sizes).map(s => `${s} staff`)].map((c, i) => (
                  <span key={i} className="text-[11.5px] font-semibold text-[#7C3AED] bg-[#f3ecff] rounded-full px-2.5 py-1">{c}</span>
                ))}
              </div>

              {/* ── YOUR ACCOUNT (24 Aug) ───────────────────────────────────────────────
                  The facts that used to be typed into a form before the client had entered
                  K.I.N.D. Read back here for the same reason the business understanding is:
                  so the client sees what we heard before it becomes their record. Shown only
                  on a genuine first run — an existing client already has these and is never
                  asked again. Nothing is pre-filled or guessed; a blank means Milla has not
                  been told yet, and the button below will ask rather than submit. */}
              {showProfile && (
                <div className="border border-[#eee7f7] rounded-xl p-3.5 mb-4 bg-[#fcfbff]">
                  <div className="text-[15px] font-bold mb-2">Your account</div>
                  <div className="space-y-2 text-[12.5px] leading-relaxed">
                    <div><span className="text-[#9b8ec4] font-semibold">Company — </span><span className="text-[#5c5279]">{profile!.company_name || <span className="text-[#c9a0a0]">still needed</span>}</span></div>
                    <div><span className="text-[#9b8ec4] font-semibold">Based in — </span><span className="text-[#5c5279]">{profile!.country || <span className="text-[#c9a0a0]">still needed</span>}</span></div>
                    {profile!.contact_name && <div><span className="text-[#9b8ec4] font-semibold">Speaking to — </span><span className="text-[#5c5279]">{profile!.contact_name}</span></div>}
                    {profile!.phone && <div><span className="text-[#9b8ec4] font-semibold">Mobile — </span><span className="text-[#5c5279]">{profile!.phone}</span></div>}
                    {profile!.website && <div><span className="text-[#9b8ec4] font-semibold">Website — </span><span className="text-[#5c5279]">{profile!.website}</span></div>}
                  </div>
                </div>
              )}

              {/* ── WHAT WE UNDERSTAND ABOUT YOU (22 Aug) ───────────────────────────────
                  The client confirms we understood their BUSINESS — they do not review
                  copy, and they never become the copywriter. Everything shown here is
                  read back from what Milla actually stored; nothing is invented for the
                  panel. If it reads wrong, the fix is to tell Milla, not to edit a field.
                  Rendered only when the conversation produced something to show. */}
              {business && (Object.values(business).some(Boolean) || intent) && (
                <div className="border border-[#eee7f7] rounded-xl p-3.5 mb-4 bg-[#fcfbff]">
                  <div className="text-[15px] font-bold mb-2">Here&rsquo;s what I understand about your business</div>
              {refining && (
                <p className="text-[11.5px] text-[#9b8ec4] mb-2">
                  This updates your existing targeting — same plan, sharpened. We keep everything you&rsquo;ve seen so far.
                </p>
              )}
                  <div className="space-y-2 text-[12.5px] leading-relaxed">
                    {business.product && <div><span className="text-[#9b8ec4] font-semibold">What you sell — </span><span className="text-[#5c5279]">{business.product}</span></div>}
                    {business.pitch && <div><span className="text-[#9b8ec4] font-semibold">Why it matters — </span><span className="text-[#5c5279]">{business.pitch}</span></div>}
                    {business.pain_points && <div><span className="text-[#9b8ec4] font-semibold">The problem you solve — </span><span className="text-[#5c5279]">{business.pain_points}</span></div>}
                    {business.differentiators && <div><span className="text-[#9b8ec4] font-semibold">What makes you different — </span><span className="text-[#5c5279]">{business.differentiators}</span></div>}
                    {intent && <div><span className="text-[#9b8ec4] font-semibold">What this campaign is for — </span><span className="text-[#5c5279]">{intent}</span></div>}
                    {business.tone && <div><span className="text-[#9b8ec4] font-semibold">How you want to sound — </span><span className="text-[#5c5279]">{business.tone}</span></div>}
                  </div>

                  {/* Proof is shown SPLIT, because the split is the promise: we may know
                      something and still not be allowed to say it. */}
                  {proof.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#eee7f7]">
                      <div className="text-[10px] uppercase font-extrabold text-[#b3a9cc] mb-1.5">Proof we may use in your emails</div>
                      {proof.filter(p => p.permitted).length > 0
                        ? <div className="flex flex-wrap gap-1.5">{proof.filter(p => p.permitted).map((p, i) => (
                            <span key={i} className="text-[11.5px] font-semibold text-[#059669] bg-[#e8f7f0] rounded-full px-2.5 py-1">{p.claim}</span>
                          ))}</div>
                        : <div className="text-[12px] text-[#9b8ec4]">None yet — we will not name a customer or quote a result until you say we can.</div>}
                      {proof.some(p => !p.permitted) && (
                        <div className="text-[11.5px] text-[#9b8ec4] mt-2">
                          {proof.filter(p => !p.permitted).length} other thing(s) you mentioned are saved but <b className="text-[#5c5279]">will not be used</b> until you approve them.
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── FROM YOUR WEBSITE, NOT FROM YOU (24 Aug) ───────────────────────
                      The reflect-back has to keep these apart. Everything above is what the
                      client SAID; this is what a machine guessed from a quick read of their
                      site and they have not yet endorsed. Founder's ruling: website evidence
                      is not unquestioned truth, and a hint may never silently become
                      canonical targeting. So it is listed separately, named as unconfirmed,
                      and it reaches the saved ICP only once the client tells Milla it is
                      right — at which point Milla stops listing it here. */}
                  {webHints.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[#eee7f7]">
                      <div className="text-[10px] uppercase font-extrabold text-[#b3a9cc] mb-1.5">From a quick read of your website · not yet confirmed</div>
                      <div className="flex flex-wrap gap-1.5">
                        {webHints.map((h, i) => (
                          <span key={i} className="text-[11.5px] font-semibold text-[#8a7fa8] bg-[#f4f1fa] border border-dashed border-[#d9cff0] rounded-full px-2.5 py-1">{h}</span>
                        ))}
                      </div>
                      <div className="text-[11.5px] text-[#9b8ec4] mt-2">
                        We guessed these from your site — you haven&rsquo;t told us they&rsquo;re right, so they are <b className="text-[#5c5279]">not part of your targeting</b>. Tell Milla which ones fit and she&rsquo;ll add them.
                      </div>
                    </div>
                  )}

                  <div className="text-[11.5px] text-[#9b8ec4] mt-3">
                    Confirming below tells us this represents you, and we record that. If anything is off, keep talking to Milla — we would rather fix it now than write from it.
                  </div>
                </div>
              )}

              {/* ── THIS SCREEN DESCRIBES ONE STAGE, AND THE STAGE IS FREE (founder-ruled 24 Aug) ──
                  This was a "Starter plan" card: an Approvals tile reading "$4 per approved
                  lead", and a line ending "you only ever pay when you approve a lead". Every
                  word of it was TRUE and every word of it was PREMATURE — it quoted the
                  post-purchase per-lead price to a prospect who has not seen a single lead
                  yet, on the one screen whose whole job is now "here is what free proof will
                  show you". The approved sequence is free proof → they judge the fit → $299
                  → first 100 included → $4 after that. So the panel says the stage it is in,
                  and the money arrives when the money is actually being asked for.
                  ⚠️ NO PRICE OF ANY KIND BELONGS ON THIS SCREEN — not $299, not $4, not the
                  first 100. The $299 ask lives behind "Looks right" on the desk, and the $4
                  model is unchanged everywhere it legitimately appears (billing, usage, the
                  wallet chip, the desk). This is copy, and only copy: no economics moved. */}
              <div className="text-[15px] font-bold mb-2">Free proof</div>
              <div className="bg-[#faf8ff] border border-[#eee7f7] rounded-xl px-3 py-2.5 mb-2">
                <div className="text-[9.5px] uppercase font-extrabold text-[#b3a9cc]">What happens next</div>
                <div className="text-[19px] font-extrabold">Up to 20 masked leads</div>
                <div className="text-[11px] text-[#9b8ec4]">See who K.I.N.D would find before you decide to go live.</div>
              </div>

              {/* ⚑ round 4 — THE BUTTON IS THE CONFIRMATION. Pressing it persists the business
                  understanding AND records that the client said it represents them
                  (`clients.milla_understanding_confirmed_at`).
                  ⚑ 24 Aug — on a first run it also OPENS THE ACCOUNT, through the unchanged
                  /auth/onboard handler, immediately before the ICP is saved.
                  ⚑ 24 Aug (free-proof entry) — AND NO PRICE APPEARS HERE ANY MORE. This
                  button read "go live for $299" and the next screen was billing: a prospect
                  was asked to pay having been shown nobody. The approved journey puts FREE
                  PROOF in between, so the words say what the click now does — she goes and
                  finds them. The $299 ask is not deleted, it MOVED to where it already
                  belonged: behind "Looks right" on the desk, which routes to
                  `/milla/billing?start=1&from=proof`. It is still interpolated from
                  PACK_PRICE_USD where it is rendered — the constant is untouched.
                  ⚠️ The old label hand-typed "$99" and survived the 3-Aug $299 sweep because
                  the sweep fixed the small print one line below and missed the button above
                  it, showing two prices at once. That is why a price is never hand-typed on
                  a screen a client reads — and why this screen now carries none at all. */}
              <button disabled={saving} onClick={approve} className="w-full text-[13px] font-bold text-white rounded-xl py-3 bg-gradient-to-br from-[#7C3AED] to-[#EC4899] disabled:opacity-50">{saving ? 'Saving…' : "Yes, this represents us — show me who you'd find"}</button>
              <div className="text-[11.5px] text-[#9b8ec4] mt-2 text-center">We&rsquo;ll find real people who match this and show them to you — <b className="text-[#5c5279]">free, masked, and nobody is contacted</b>. You decide what happens next.</div>
              <button disabled={saving} onClick={() => { setProposed(null); setMatchCount(null) }} className="w-full text-[12.5px] font-semibold text-[#5c5279] mt-2 py-2">Keep adjusting the target</button>
              {error && <div className="mt-3 text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div>}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
