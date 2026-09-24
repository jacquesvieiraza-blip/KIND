'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'
import { useMillaConversation } from '@/components/milla/MillaConversation'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'
// ⚑ 22 Sep — THE CAPACITY MODEL, IMPORTED RATHER THAN RE-DERIVED. Method rule 7 applied to
// meetings instead of money: the number of meetings a client is promised is a commitment, so
// it derives from the shared constants at every surface that states it. A `Math.floor(n/400)`
// written here would be a second definition of the promise, and the first one to drift.
import { capacitySentence, committedCapacity, workablePool } from '@kind/shared'
import {
  firstProofReadiness, PROOF_PREPARING_COPY, PROOF_NEEDS_US_COPY, PROOF_NEEDS_CLIENT_COPY,
  APOLLO_SENIORITY_LABELS, APOLLO_INDUSTRIES, PICK_INDUSTRY_COPY, NEVER_CONTACT_ASK_COPY,
  type ProofReadiness, type ProofSummaryFacts,
} from '@kind/shared'
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
      icp_review?: { requirements: Array<{ field: string; said: string[] }> } | null
      // ⚑ 14 Sep (S1-RT-009A/B) — fact #10 and fact #6 as the DURABLE Brief holds them, so
      // the confirmation shows what the client actually said rather than whatever this one
      // model sample remembered.
      brief_exclusions?: string
      brief_geographies?: string[]
      // ⚑ 18 Sep (J5-C4 · LR 10,12) — the other four targeting facts, from the same durable
      // record, so the approval card can show what the CLIENT said rather than the closed
      // provider vocabularies we translated it into.
      brief_target_category?: string
      brief_company_sizes?: string[]
      brief_roles?: string[]
      brief_seniority?: string[]
      // ⚑ 16 Sep (S1-ONB-001) — the server saying READY. The plan object is only the CONTENT.
      onboarding_state?: 'ready' }
  // ── ⚑ 16 Sep (S1-RT-010) — THE SERVER VETOED A PREMATURE COMPLETION ─────────────────
  //
  // 🛑 NOT A MILLA TURN, AND THAT IS THE WHOLE POINT. The model declared the Brief finished
  // while the server's eleven-fact gate still held a fact outstanding. Its sentence ("Great,
  // that's everything I need") was SUPPRESSED server-side, because showing it and then
  // contradicting it is the stranding this fixes. What arrives instead is product state.
  //
  // ⚠️ THIS APP DECIDES NOTHING ABOUT IT. `remaining`, `total` and `next` are the server's
  // answer from the one canonical eleven-fact counter. There is no fact list in this file,
  // no count computed here, and no opinion about which fact comes next.
  | { type: 'outstanding'; brief_outstanding: {
      /** ⚑ 16 Sep (S1-ONB-002) — the canonical ELEVEN only. `total` is its matched denominator. */
      remaining: number; total: number
      /** Unresolved ACCOUNT facts, counted separately and never folded into `remaining`. */
      account?: number
      next: { id: string; label: string }
    } }
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

// ── 🛑 ⚑ 22 Sep — THE LOCKED OPENING, WHICH IS THREE MESSAGES, NOT ONE ──────────────────
//
// ⛓️ WAS: ~~"Hi 👋 I'm Milla, your campaign partner. Let's get you set up — tell me a bit
// about your company and who your best customers are, and I'll build your targeting plan. No
// forms."~~ — one paragraph carrying four jobs at once.
//
// 🛑 THE APPROVED PORTAL SPLITS IT DELIBERATELY, and each part earns its place: you are IN
// (nothing is pending), there is NOTHING TO FILL IN (no wizard is coming), and — the one a
// first-time client most needs — LOOKING COSTS NOTHING, with the panel beside them named as
// the thing that shows her working. A client who does not know the right-hand side is a
// live read-out has no reason to look at it, and correcting Milla while she is still here is
// the entire point of the screen.
//
// ⚠️ THE FINAL LINE IS A COMMERCIAL PROMISE AND IT IS TRUE TODAY. Brief and Proof spend
// nothing: Apollo's People Search costs no credits and the pool is free. The first money is
// P1 at Programme, after the client has seen real people.
const GREETING_LINES = [
  "Hi, I’m Milla. Welcome — you’re in.",
  "There’s nothing to fill in and nothing to set up. Tell me what you’re trying to achieve and who you want in front of, in whatever words you’d use, and I’ll shape the rest from there.",
  "Everything I understand appears on the right as we talk, so you can see me getting it right — or tell me when I’ve got it wrong.\n\nLooking costs nothing. You don’t pay for anything until you’ve seen real people and decided how many meetings you want.",
  // ⚑ 23 Sep (R144) — THE FOURTH MESSAGE: WHAT TO TYPE FIRST. Founder, verbatim: *"welcome is
  // good. but it actually does not then tell me what to do next. i have to assume here. the 3
  // messages are great. but there should be a 4th message. say please tell us who you are, name
  // etc. just to get going."* It asks for the first three brief facts in their own order —
  // contact name, company, website — and the website is read by the existing BASIC read.
  "To get us going — what’s your name, and which company are you with? If you have a website, send it too and I’ll read it, so you don’t have to explain everything.",
]

/**
 * The first line, kept as its own constant — three resume paths still name it.
 */
const GREETING = GREETING_LINES[0]

/**
 * 🛑 IS THIS TRANSCRIPT STILL THE UNTOUCHED OPENING?
 *
 * ⛓️ 22 Sep — REPLACES ~~`m.length === 1 && m[0].content === GREETING`~~ AT ALL THREE RESUME
 * CALL SITES, and the change is forced rather than stylistic: the opening is three messages
 * now, so a length-1 test would have answered `false` for every brand-new client and the
 * resume greeting would have been appended BELOW the welcome instead of replacing it.
 *
 * ⚠️ IT STILL PROTECTS THE THING THOSE CHECKS EXIST FOR. The moment the client has said
 * anything — or Milla has answered — the array is longer or its contents differ, and a real
 * transcript is never overwritten. One definition, so the three call sites cannot drift.
 */
const isUntouchedGreeting = (m: Msg[]): boolean =>
  m.length === GREETING_LINES.length && m.every((x, i) => x.role === 'assistant' && x.content === GREETING_LINES[i])

/**
 * ⚑ 22 Sep — the locked starter chips. Not suggestions we invented: they are the three
 * openings the approved portal offers, and each is a sentence a client can send as-is.
 */
const STARTERS = ['We want more meetings', "Here’s who we sell to", 'What do you need from me?']

// ══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 22 Sep — WHAT A CLIENT MAY PICK, AND WHY THE SIX FIELDS ARE NOT ALIKE
//
// 🛑 APOLLO IS NOT UNIFORM, AND PRETENDING OTHERWISE IS HOW THE LAST VOCABULARY GOT INVENTED.
// Only two of the six are genuine closed lists at the provider. Two more are free text it
// takes as typed. The last two are not filters at all — the locked preview draws no caret on
// either, which is the drawing being faithful rather than incomplete:
//
//   · Seniority  — CLOSED. `person_seniorities`. ~~Our six labels map to Apollo's own values.~~
//                  ⛓️ 23 Sep (R142): Apollo's own eleven, from `@kind/shared/apollo-seniority`.
//   · Employees  — CLOSED. `organization_num_employees_ranges`, via the six-band ladder.
//   · Job titles — FREE TEXT. `person_titles` takes "Operations Director" as typed, so this
//                  is an add/remove chip box. Offering a closed list here would be us
//                  inventing a title vocabulary Apollo does not have — the exact mistake the
//                  sixteen-word industry list was.
//   · Location   — FREE TEXT. `person_locations` takes place names.
//   · Order by   — not sent to the provider at all. It ranks. Nothing to choose from.
//   · Never contact — an instruction the client gives Milla, not a list we hold.
//
// ⚠️ THE OPTIONS ARE THE STORED VOCABULARY, NOT APOLLO'S WIRE VALUES. A client picks
// "C-Suite"; `icps.seniority_levels` holds "C-Suite"; `buildSearchBody` turns it into
// `c_suite` at the boundary, and the panel prints that underneath. One translation, in the
// one place that has always done it.
// ⛓️ 23 Sep (R142) — WAS ['C-Suite', 'VP / Director', 'Head of', 'Manager', 'Senior',
// 'Individual Contributor'] — six labels we invented, two of which Apollo has no single value
// for. Founder: *"this is why we use apollo drop downs and make sure we do not assume."* The
// client now picks from Apollo's own eleven, read from the one shared list the search and the
// Proof check also read.
const SENIORITY_OPTIONS: string[] = [...APOLLO_SENIORITY_LABELS]
const SIZE_OPTIONS = ['1–10', '11–50', '51–200', '201–500', '501–1,000', '1,000+']

const FIELD_OPTIONS: Record<string, { options: string[]; free: boolean; max?: number }> = {
  target_roles: { options: [], free: true },
  seniority:    { options: SENIORITY_OPTIONS, free: false },
  company_size: { options: SIZE_OPTIONS, free: false },
  geography:    { options: [], free: true },
  // ⚑ 23 Sep (R142 · A2a) — Industry is now a CLOSED list: Apollo's own industries, picked by
  // the client. Founder: *"milla must say please look to the right and drop down and choose."*
  // ⛓️ WAS absent — the row was "Order by (never excludes)", filled from the client's sentence
  // and never sent to the search. Six is the ICP's own bound on industries.
  target_category: { options: [...APOLLO_INDUSTRIES], free: false, max: 6 },
}

/** Which draft key each editable field writes to. The server reads these names, not the row ids. */
const PICK_KEY: Record<string, string> = {
  target_roles: 'job_titles',
  seniority:    'seniority_levels',
  company_size: 'company_sizes',
  geography:    'geographies',
  target_category: 'industries',
}

/**
 * ── ⚑ 24 Sep (R145 step 2) — ONE TARGETING FILTER, DRAWN AS THE REDESIGN DRAWS IT ─────────
 *
 * Founder: *"match everything. colors everything."* The redesign's "Your targeting" is a list
 * of Apollo-style filter rows: the name, the chosen values as chips, and a caret that opens a
 * tick-list (searchable where the list is long, typed where Apollo takes free text).
 * ⛓️ WAS `PickField` — a chip box with a floating pop-over, in a three-column grid.
 *
 * ⚠️ NOT A `<select>`, for the reason the old field gave: every one of these is multi-value, and
 * a tick-list is the same gesture on a phone as on a desk.
 */
function FilterRow({ label, options, free, chosen, placeholder, onChange, max, said, sentAs, note, open: startOpen, extra }: {
  label: string
  options: string[]
  free: boolean
  chosen: string[]
  placeholder: string
  onChange: (next: string[]) => void
  /** The most that may be chosen; a further tick is ignored rather than refused by the server. */
  max?: number
  /** The client's own words — kept visible under a changed field, so a mistaken pick shows. */
  said?: string
  /** The values Apollo actually receives, from the server's own request builder. */
  sentAs?: string[]
  note?: string
  open?: boolean
  /** A second, closed tick-list above the typed one (the "Never contact" kinds). */
  extra?: { options: string[]; chosen: string[]; onChange: (next: string[]) => void }
}) {
  const [draft, setDraft] = useState('')
  const searchable = !free && options.length > 20
  const full = max !== undefined && chosen.length >= max
  const toggle = (v: string) => {
    if (chosen.includes(v)) { onChange(chosen.filter(x => x !== v)); return }
    if (full) return
    onChange([...chosen, v])
  }
  const q = draft.trim().toLowerCase()
  // A long closed list shows what is chosen first, then the first matches — never all 150 at once.
  const shown = free ? chosen
    : searchable ? [...chosen, ...options.filter(o => !chosen.includes(o) && (q === '' || o.toLowerCase().includes(q))).slice(0, 40)]
    : options
  const add = () => {
    const v = draft.trim()
    // A duplicate is a no-op, not an error.
    if (v && !chosen.includes(v)) onChange([...chosen, v])
    setDraft('')
  }
  const all = [...(extra?.chosen ?? []), ...chosen]
  return (
    <details className="mv-filter-row" open={startOpen}>
      <summary>
        <span className="mv-filter-name">{label}</span>
        <span className="mv-filter-value">
          {all.length === 0
            ? <span className="mv-empty">{placeholder}</span>
            : all.map(v => <span key={v} className="mv-chipx">{v}</span>)}
          {said ? <span className="mv-v truncate max-w-[220px]" title={said}>you said: {said}</span> : null}
        </span>
        <span className="mv-chev">⌄</span>
      </summary>
      <div className="mv-filter-drop">
        {extra ? (
          <div className="mv-option-list">
            {extra.options.map(v => {
              const on = extra.chosen.includes(v)
              return (
                <button key={v} type="button" className={`mv-option text-left ${on ? 'on' : ''}`}
                  onClick={() => extra.onChange(on ? extra.chosen.filter(x => x !== v) : [...extra.chosen, v])}>
                  <span className="mv-check">{on ? '✓' : ''}</span>{v}
                </button>
              )
            })}
          </div>
        ) : null}
        {free || searchable ? (
          <div className="mv-filter-search">
            <span>⌕</span>
            <input
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (free && e.key === 'Enter') { e.preventDefault(); add() } }}
              placeholder={free ? 'Type one and press enter' : 'Search the list'} />
            {free ? <button type="button" onClick={add} className="text-[9px] font-bold text-[color:var(--mv-accent-deep)] shrink-0">Add</button> : null}
          </div>
        ) : null}
        {full ? <div className="mv-muted-note mt-2">Up to {max}. Untick one to choose another.</div> : null}
        <div className={`mv-option-list ${searchable ? 'max-h-52 overflow-y-auto' : ''}`}>
          {/* A closed field lists its vocabulary; a free one lists what the client has given us,
              so removing is the same gesture as adding. */}
          {shown.map(v => {
            const on = chosen.includes(v)
            return (
              <button key={v} type="button" className={`mv-option text-left ${on ? 'on' : ''}`} onClick={() => toggle(v)}>
                <span className="mv-check">{on ? '✓' : ''}</span>{v}
              </button>
            )
          })}
          {free && chosen.length === 0
            ? <span className="mv-muted-note">Nothing yet. Type above, or just tell Milla.</span>
            : null}
        </div>
        {/* ⚠️ THE PROVIDER VALUES, PRINTED AS APOLLO RECEIVES THEM — the server runs the real
            request builder, so this line cannot drift from the search. */}
        {sentAs && sentAs.length > 0
          ? <div className="mv-muted-note mt-2 font-mono">stored &amp; sent as: {sentAs.join(' · ')}</div>
          : null}
        {note ? <div className="mv-muted-note mt-1">{note}</div> : null}
      </div>
    </details>
  )
}
// ⚠️ REFINING IS NOT STARTING AGAIN (22 Aug, integration fix). A prospect who says "not
// these people" after their first proof batch arrives back on this page — and it greeted
// them as a stranger and saved as if it were building something new. The server now keeps
// ONE core ICP and updates it, so the words here have to match: this is the same targeting
// being sharpened, not a second experiment.
const REFINING_GREETING = "Welcome back 👋 Let's sharpen the same targeting rather than start over — tell me what was off about the people I found, and I'll adjust who we look for."

/**
 * ⚑ MVP1 — the welcome back for somebody whose Brief is part-collected.
 *
 * ⛓️ 14 Sep (R121) — IT USED TO COUNT AT THEM: ~~"that's 7 of 11 things I needed. Next up:
 * target company type."~~ Every word of that was true and none of it was how a colleague
 * talks. It told the client three things they should never have to know — that there is a
 * list, how long it is, and where on it they are — and it did it in the first sentence after
 * they came back, which is the moment the product most needs to sound like it remembers them
 * rather than like it has been keeping score.
 *
 * ⚠️ THE FACTS ARE STILL THE SERVER'S AND ARE STILL USED — just not read out. Whether
 * anything is outstanding decides which sentence she says; the NUMBER behind it never
 * reaches the client, and this app still has no opinion about what the facts are.
 *
 * ⚠️ AND IT PROMISES NOTHING ABOUT CONFIRMATION. Holding every fact is not the same as having
 * confirmed the brief — that gate is separate, and it is the panel after this conversation.
 */
function resumeGreeting(count: number, total: number, nextLabel: string | null): string {
  void count; void total
  return nextLabel
    ? `Welcome back 👋 I've still got everything you told me — we can pick up where we left off.`
    : `Welcome back 👋 I've still got everything you told me, and I think I have what I need — say the word and I'll put your plan together.`
}

export default function MillaWelcomePage() {
  const router = useRouter()
  // ⚑ 24 Sep — THE ONE CHAT. This page runs the Brief's conversation engine, but it draws it in
  // the shell's column — claimed on arrival, handed back on leaving (see the portal below).
  const conversation = useMillaConversation()
  const claimChatSlot = conversation.claimChatSlot
  useEffect(() => claimChatSlot(), [claimChatSlot])
  const [messages, setMessages] = useState<Msg[]>(GREETING_LINES.map(content => ({ role: 'assistant', content })))
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [proposed, setProposed] = useState<IcpDraft | null>(null)
  // ⚑ 14 Sep (S1-RT-005) — carried from the completion to `POST /icps`, which is what
  // persists it. Held here for one hop only; this app never reads it to decide anything.
  const [icpReview, setIcpReview] = useState<{ requirements: Array<{ field: string; said: string[] }> } | null>(null)
  // ⚑ 14 Sep (S1-RT-009A) — the canonical exclusions. Held separately from `business.bad_fit`
  // because this is the CLIENT-FACING fact, resolved server-side from the durable Brief.
  const [briefExclusions, setBriefExclusions] = useState('')
  const [briefGeographies, setBriefGeographies] = useState<string[]>([])
  // ── ⚑ 18 Sep (J5-C4 · LR 10,12) — THE CLIENT'S OWN TARGETING WORDS ────────────────────
  //
  // 🛑 The chips below were built from `proposed.*` — the three CLOSED PROVIDER VOCABULARIES
  // — so a client who said "digital marketing agencies, ten to fifty people" was shown
  // "Marketing · Consulting · 11–50 staff" and asked to confirm it was their targeting. The
  // founder's rule is the opposite: the client speaks naturally, and translating their words
  // into provider format is OUR problem. `brief_geographies` already worked this way; these
  // four finish the row. Every one is resolved server-side from the durable Brief.
  const [briefTargetCategory, setBriefTargetCategory] = useState('')
  const [briefCompanySizes, setBriefCompanySizes] = useState<string[]>([])
  const [briefRoles, setBriefRoles] = useState<string[]>([])
  const [briefSeniority, setBriefSeniority] = useState<string[]>([])
  // ⚑ 24 Aug — the VALUE is no longer read on this screen (the plan card that displayed it
  // is gone), but the setter stays: `propose()` still runs the gated preview and "Keep
  // adjusting the target" still clears it, and neither of those is copy. Bound as `[,
  // setMatchCount]` rather than deleted, so the preview behaviour is untouched by a copy
  // change. ⚠️ REPORTED, NOT FIXED HERE: that means /icps/preview-count now has no consumer
  // on this page. Whether it should still run at all is a provider-boundary question, and
  // this build is copy-only.
  // ⚑ 22 Sep — STILL NO READER, AND NOW THE REASON IS RECORDED RATHER THAN OPEN. The founder
  // asked for a live count beside the targeting panel. It is not built, because the gated
  // single call site above may not run before the account row exists and this screen is
  // exactly the moment before it does — see `refreshTargeting` for the decision that is owed.
  // ⛓️ 22 Sep — READ AGAIN. ~~`const [, setMatchCount]`~~ was bound write-only on 24 Aug when
  // the plan card that displayed it was deleted, and the 22 Sep note above recorded the count
  // as "not built". The locked workspace has a match-count bar, so the value has a reader
  // again — from the SAME single gated call site, with no second call added and the account
  // gate untouched. What is still owed is the founder's decision on whether the free People
  // Search may run BEFORE the account row exists; until then the bar shows the locked em-dash.
  const [matchCount, setMatchCount] = useState<number | null>(null)
  /**
   * What Milla has understood, as the SERVER renders it: each fact in the client's own words
   * beside the provider value it produces. Finished render objects — this app learns nothing
   * about our fact vocabulary and derives none of it.
   */
  const [targeting, setTargeting] = useState<Array<{
    id: string; label: string; said: string; sending: string[]; placeholder: string
    /** The values Apollo actually receives, from the server's own request builder. */
    provider: string[]
    note?: string
    /** ⚑ 24 Sep (R145 step 2 · #73) — a row edited under its own draft key, with a second tick-list. */
    pick?: { key: string; kinds: string[]; kinds_chosen: string[]; kinds_key: string }
  }>>([])
  // ⚑ 22 Sep — the client's own outcome sentence, for the workspace's lead tile. Server's
  // `desired_outcome` fact verbatim; this file composes no sentence about their business.
  const [outcome, setOutcome] = useState('')
  /**
   * What the client picked in the workspace, keyed by ROW id.
   *
   * ⚠️ HELD SEPARATELY FROM `targeting` FOR ONE REASON: the save is a round trip, and a field
   * that snaps back to its old chips for 300ms while the server answers reads as the product
   * losing the click. This is the optimistic value; the server's is authoritative and arrives
   * on the next refresh.
   */
  const [picked, setPicked] = useState<Record<string, string[]>>({})
  // ⚑ 24 Sep (R145 step 2 · #8) — the picks the SERVER holds, keyed by draft key. The PUT replaces
  // the whole set, so every save starts from this and never from an empty tab.
  const [serverPicked, setServerPicked] = useState<Record<string, string[]>>({})
  // ⚑ 24 Sep (R145 step 2 · #71) — the fields whose words matched no Apollo option: the client picks them.
  const [needsPick, setNeedsPick] = useState<Array<{ id: string; said: string[] }>>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // ── 🛑 ⚑ 23 Sep — THE CLIENT STAYS IN THE BRIEF UNTIL THEIR PEOPLE ARE READY ─────────────
  //
  // Founder: *"we do not present the next step until we can verify we have the information we
  // need. the onboarding portal should not allow us to move to this screen ever."* — *"20, or
  // all of them if smaller."* ⛓️ WAS: confirm → `router.push('/milla?finding=1')` the moment the
  // run was STARTED, so a run that produced nobody left the client on the Proof desk reading
  // "We hit a snag confirming your matches" (Blackburne, 23 Sep). Now the client waits HERE,
  // told what is happening, and moves only when `proofReadiness` says `ready`.
  const [proofHold, setProofHold] = useState<ProofReadiness | null>(null)
  const holdAsked = useRef(false)
  // ⚑ 14 Sep (S1-RT-003/004) — the server's own eleven-fact progress, held so the resume
  // path and the Get Help escape can both speak from it. The numbers are never derived here.
  const [briefProgress, setBriefProgress] = useState<{ count: number; total: number } | null>(null)
  const [briefNext, setBriefNext] = useState<string | null>(null)
  // ⚑ 16 Sep (S1-RT-010) — set ONLY when the server vetoed a premature completion, cleared by
  // the next turn that answers normally. It is the reason a NOTICE is shown rather than a
  // bubble; the fact it names is `briefNext`, which is the server's, not this app's.
  const [outstanding, setOutstanding] = useState<{ label: string; remaining: number } | null>(null)
  // ── 🛑 ⚑ 16 Sep (S1-ONB-001) — THE SERVER'S PROGRESSION STATE, AND IT IS THE AUTHORITY.
  //
  // 🛑 `proposed !== null` USED TO GATE THE PLAN AND THE CONFIRM CTA, and it is not a fact
  // check — it records that a completion once arrived in THIS TAB. That is how a finished
  // targeting plan with a live Confirm button came to sit above a line reading "Based in —
  // still needed": the panel's existence and the panel's contents were answered by two
  // different systems, and the thing that actually blocked was a third check after the click.
  //
  // ⚠️ THIS APP COMPUTES NOTHING. The server's own onboarding-state authority is the only
  // definition of ready; there is no fact list, no count and no threshold in this file — and
  // a guard in `s1-onb-001-clean-onboarding.test.ts` asserts that by name.
  const [serverReady, setServerReady] = useState(false)
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
  // ⚑ 22 Sep — the last targeting we actually counted, so an unchanged search is not asked
  // again. A ref rather than state: it must not cause a render, and it must be readable by
  // the callback that sets it without re-creating that callback on every turn.
  const lastCountKey = useRef<string>('')

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
        setMessages(m => isUntouchedGreeting(m)
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
        onboarding_state?: 'conversing' | 'ready'
        onboarding_profile?: Partial<Profile>
        onboarding_business?: Partial<Business>
      } }>('/milla/brief-draft', tk)
      const p = d.data?.progress
      const next = d.data?.next ?? null
      const convo = d.data?.conversation ?? []
      // ── 🛑 ⚑ 16 Sep (S1-ONB-001) — HYDRATE FROM CANONICAL TRUTH, NOT FROM MEMORY ──────
      //
      // 🛑 THE CARDS USED TO COME ONLY FROM A COMPLETION REPLY held in this tab. So a client
      // who had already told Milla where they are based, then refreshed, was shown
      // "Based in — still needed" about a country the DRAFT was holding — and `/auth/onboard`
      // would have read that same draft and found it perfectly well. The screen was the only
      // thing that did not know.
      //
      // ⚠️ RENDER-ONLY, AND IT DECIDES NOTHING. The server sends finished render objects, so
      // this app never learns our fact vocabulary and never counts anything. Every gate reads
      // the server's onboarding state, derived from the same persisted facts.
      const op = d.data?.onboarding_profile
      const ob = d.data?.onboarding_business
      if (op && Object.values(op).some(v => typeof v === 'string' && v.trim() !== '')) {
        setProfile(prev => ({
          company_name: op.company_name || prev?.company_name || '',
          country:      op.country      || prev?.country      || '',
          contact_name: op.contact_name || prev?.contact_name || '',
          phone:        op.phone        || prev?.phone        || '',
          website:      op.website      || prev?.website      || '',
          industry:     op.industry     || prev?.industry     || '',
        }))
      }
      if (ob && Object.values(ob).some(v => typeof v === 'string' && v.trim() !== '')) {
        setBusiness(prev => ({
          product:         ob.product || prev?.product         || '',
          pitch:           prev?.pitch           || '',
          pain_points:     prev?.pain_points     || '',
          differentiators: prev?.differentiators || '',
          tone:            prev?.tone            || '',
          bad_fit:         ob.bad_fit || prev?.bad_fit         || '',
        }))
      }
      setServerReady(d.data?.onboarding_state === 'ready')
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
        setMessages(m => isUntouchedGreeting(m)
          ? [...convo, ...(p && p.count > 0
              ? [{ role: 'assistant' as const, content: resumeGreeting(p.count, p.total, next?.label ?? null) }]
              : [])]
          : m)
      } else if (p && p.count > 0) {
        // No stored transcript (a Brief begun before this existed, or an unreadable value):
        // exactly the previous behaviour, which is still strictly better than a bare greeting.
        setMessages(m => isUntouchedGreeting(m)
          ? [{ role: 'assistant', content: resumeGreeting(p.count, p.total, next?.label ?? null) }] : m)
      }
    } catch { /* silent — a client with no saved draft simply gets the normal greeting */ }
  }, [])

  /**
   * ── 🛑 ⚑ 22 Sep — WHAT MILLA HAS UNDERSTOOD, RE-READ AFTER EVERY TURN ─────────────────
   *
   * 🛑 FOUNDER-LOCKED 22 Sep: *"they speak there and see there."* The panel used to say
   * nothing until a finished ICP arrived at the end of the conversation, so a misread fact
   * was discovered after a run rather than corrected in the sentence after it was misread.
   *
   * ⚠️ DELIBERATELY NOT `loadStatus`. That callback also resolves the account, the existing
   * ICPs and the resume greeting; running it per turn could replace a transcript the client
   * is mid-sentence in. This asks one question and sets two pieces of state.
   *
   * ⚠️ THE VALUES ARE THE SERVER'S, AND THEY ARE `icpFromDraft`'S — the same function the
   * confirm persists from. So the panel cannot show one thing and the search send another.
   *
   * ⚠️ AND IT FAILS SILENT. A failed read leaves the panel exactly as it was; it never blanks
   * what the client has already been shown, and it never claims a count it did not receive.
   */
  const refreshTargeting = useCallback(async () => {
    const tk = await token()
    try {
      const d = await api.get<{ data: {
        onboarding_targeting?: Array<{ id: string; label: string; said: string; sending: string[]; placeholder: string; provider: string[]; note?: string; pick?: { key: string; kinds: string[]; kinds_chosen: string[]; kinds_key: string } }>
        onboarding_search?: Record<string, string[]> | null
        onboarding_outcome?: string
        progress?: { count: number; total: number }
        onboarding_state?: 'conversing' | 'ready'
        next?: { id: string; label: string } | null
        needs_pick?: Array<{ id: string; said: string[] }>
        onboarding_picked?: Record<string, string[]>
      } }>('/milla/brief-draft', tk)
      setTargeting(d.data?.onboarding_targeting ?? [])
      setNeedsPick(d.data?.needs_pick ?? [])
      setServerPicked(d.data?.onboarding_picked ?? {})
      // ⚑ 24 Sep (R145 step 2 · #9) — the button under the fields reads the server's own state and
      // next fact after EVERY turn, so it can say what is missing — not only on arrival.
      if (d.data?.onboarding_state) setServerReady(d.data.onboarding_state === 'ready')
      if (d.data && 'next' in d.data) setBriefNext(d.data.next?.label ?? null)
      setOutcome(d.data?.onboarding_outcome ?? '')
      // ── 🛑 ⚑ 22 Sep — AND THE LIVE COUNT, WHICH THE LOCK ABOVE USED TO FORBID ──────────
      //
      // ⛓️ The long note that stood here recorded the decision as OWED: the count was not
      // built because `preview-count` was gated on the account row and pinned to one call
      // site. The founder lifted the gate on 22 Sep (`countFor` carries the reasoning); the
      // pin is honoured by going THROUGH `countFor` rather than adding a second call site.
      //
      // ⚠️ IT ONLY ASKS WHEN THE SEARCH ACTUALLY CHANGED, and that is a real constraint
      // rather than caution: the route is rate-limited to TEN CALLS A MINUTE PER USER, and
      // this refresh runs after every turn including failed ones. A brisk conversation would
      // exhaust the budget on turns that moved nothing — and the eleventh turn, the one that
      // finally completed the targeting, is the one that would be refused.
      //
      // ⚠️ AN EMPTY SEARCH IS NOT ASKED AT ALL. Before any targeting exists the answer would
      // be "everybody", which is not a fact about this client and would replace the locked
      // em-dash with a number that means nothing.
      const search = d.data?.onboarding_search ?? null
      const key = search ? JSON.stringify(search) : ''
      const hasTargeting = !!search && Object.values(search).some(v => Array.isArray(v) && v.length > 0)
      if (hasTargeting && key !== lastCountKey.current) {
        lastCountKey.current = key
        void countFor(search as unknown as IcpDraft)
      }
      // ⚑ 22 Sep — the workspace header's "n of 11 understood" reads the SERVER'S count and
      // its SERVER'S denominator, the same verdict that decides what Milla still has to ask
      // for. A count derived in this file could disagree with the question she asks next.
      // ⚠️ The fact vocabulary and the counting rule both stay on the server — this file
      // holds two numbers it was handed and names neither of the eleven.
      if (d.data?.progress) setBriefProgress({ count: d.data.progress.count, total: d.data.progress.total })
      // ── 🛑 ⚑ 22 Sep — THE LIVE COUNT IS NOT HERE, AND THAT IS A FOUNDER DECISION OWED ───
      //
      // The founder asked for a live match count beside this panel, and the server already
      // sends `onboarding_search` for it. It is NOT called here, because doing so would break
      // a lock this file carries for a reason:
      //
      //   · `preview-count` is gated on `hasClient === true` — no provider call before the
      //     account row exists — and pinned to EXACTLY ONE call site "so the gate cannot be
      //     bypassed". A second call site here is precisely the bypass that pin forbids.
      //   · during the first run `hasClient` is false until `/auth/onboard`, so the gated call
      //     would answer nothing anyway for the client who most needs the number.
      //   · the route is rate-limited to ten calls a minute per user; once per turn would
      //     exhaust it inside a brisk conversation.
      //
      // The question is the founder's, not mine: may the FREE search run before the account
      // row exists? People Search spends no credits — the reveal is the cost — so the lock's
      // "paid preview" framing predates Apollo-only sourcing. But it is a lock, and the panel
      // above is useful without the number.
    } catch { /* silent — the panel keeps whatever it last showed */ }
  }, [])

  useEffect(() => { void loadStatus() }, [loadStatus])

  // ⚠️ ITS OWN EFFECT, NOT A SECOND STATEMENT IN `loadStatus`'s. That one is pinned by
  // `first-run-milla.test.ts` as the shape that makes a failed account lookup RETRYABLE —
  // a callback an effect re-runs, rather than a one-shot. Folding this into it would have
  // changed a line whose exact form is the guarantee.
  useEffect(() => { void refreshTargeting() }, [refreshTargeting])

  // ⚑ 23 Sep — READ THE PROOF STATE: once on arrival (a returning client whose run is still
  // being put together lands HERE, not on the desk), then every few seconds while held. The
  // rule is the shared one; this page only supplies the facts the summary already carries.
  const checkProof = useCallback(async (): Promise<ProofReadiness | null> => {
    try {
      const r = await api.get<{ data?: ProofSummaryFacts }>('/leads/milla-summary', await token())
      // First Proof only — `null` for a client already past it, who is never held here.
      return firstProofReadiness(r?.data)
    } catch { return null }
  }, [])
  useEffect(() => {
    let live = true
    void (async () => {
      const v = await checkProof()
      if (!live || v === null || v === 'not_started') return
      if (v === 'ready') { router.replace('/milla'); return }
      setProofHold(v)
    })()
    return () => { live = false }
  }, [checkProof, router])
  useEffect(() => {
    if (proofHold === null || proofHold === 'ready' || proofHold === 'not_started') return
    const t = setInterval(() => {
      void (async () => {
        const v = await checkProof()
        if (v === 'ready') { clearInterval(t); router.push('/milla'); return }
        if (v !== null && v !== 'not_started') setProofHold(v)
      })()
    }, 4000)
    return () => clearInterval(t)
  }, [proofHold, checkProof, router])
  // When only the client can move it forward, Milla says so ONCE, in the conversation.
  useEffect(() => {
    if (proofHold !== 'needs_client' || holdAsked.current) return
    holdAsked.current = true
    setMessages(m => [...m, { role: 'assistant', content: PROOF_NEEDS_CLIENT_COPY }])
  }, [proofHold])

  // ── ⚑ 23 Sep (R142 · A2a) — NO INDUSTRY PICKED, NO NEXT STEP, AND MILLA SAYS WHERE TO PICK ──
  //
  // Founder: *"milla must say please look to the right and drop down and choose."* The industry
  // is the one thing Milla never infers: it must come from Apollo's own list, chosen by the
  // client. Until it is, "Yes, this represents us" stays locked (R138 — the next step is not
  // presented until we have what it needs), and Milla says so ONCE, in the conversation.
  const industryChosen =
    (picked['target_category'] ?? targeting.find(t => t.id === 'target_category')?.sending ?? []).length > 0
  const industryAsked = useRef(false)
  useEffect(() => {
    // ⛓️ 24 Sep (R145 step 2) — WAS `if (!proposed || …)`: Milla asked only after the plan was
    // proposed. Founder: *"before we get to this next part choose from the drop downs"* — so she
    // now asks as soon as the server holds everything she asks for in conversation, too.
    if ((!proposed && !serverReady) || industryChosen || industryAsked.current) return
    industryAsked.current = true
    setMessages(m => [...m, { role: 'assistant', content: PICK_INDUSTRY_COPY }])
  }, [proposed, serverReady, industryChosen])

  // ── ⚑ 24 Sep (R145 step 2 · #71) — NO APOLLO OPTION FOR THEIR WORDS, SO MILLA ASKS THEM TO PICK ──
  // Founder: *"we dont assume again. if unsure milla needs to ask."* Said ONCE per field, in the chat.
  const pickAsked = useRef<Set<string>>(new Set())
  useEffect(() => {
    for (const n of needsPick) {
      if (pickAsked.current.has(n.id)) continue
      pickAsked.current.add(n.id)
      const label = targeting.find(t => t.id === n.id)?.label ?? 'that field'
      const said = n.said.length ? `“${n.said.join(', ')}”` : 'what you told me'
      setMessages(m => [...m, { role: 'assistant', content:
        `I couldn’t match ${said} to one of Apollo’s options (${label}), and I won’t guess. Please look to the right, open ${label} and pick what fits.` }])
    }
  }, [needsPick, targeting])

  /**
   * ⚑ 24 Sep (R145 step 2 · #9) — the ONE thing still missing before "Show me who you'd find", or
   * null. Every input is the server's (readiness, next fact, picks, the review verdict) — this file
   * decides no fact of its own; it only chooses which of the server's answers to say first.
   */
  const blocker: string | null =
    status !== 'ready' ? 'Loading your Brief…'
      : !serverReady ? (briefNext
        ? `Milla still needs: ${briefNext}. Tell her in the chat.`
        : 'Keep talking to Milla. She’ll say when she has what she needs.')
      : !industryChosen ? 'Choose your industry on the right. Open Industry and tick at least one.'
      : needsPick.length > 0 ? `Open ${targeting.find(t => t.id === needsPick[0].id)?.label ?? 'that field'} on the right and pick what fits. Apollo has no option for what you said.`
      : !proposed ? 'Tell Milla “that’s everything” and she’ll put your plan together.'
      : null

  useEffect(() => { const el = bodyRef.current; if (el) el.scrollTop = el.scrollHeight }, [messages, proposed])

  // ── 🛑 ⚑ 22 Sep — THE COUNT IS LIVE DURING THE BRIEF (founder-ruled) ──────────────────
  //
  // ⛓️ WAS: ~~`if (hasClient !== true) { setMatchCount(null); return }`~~ — "PAID PREVIEW
  // WAITS FOR THE ACCOUNT", founder-ruled 24 Aug. The reasoning was that signup landing
  // straight here would make `/icps/preview-count` *"the normal way a brand-new visitor
  // reached a PAID PROVIDER — before we knew who they were."*
  //
  // 🛑 THE COST THAT RULING PROTECTED AGAINST DOES NOT EXIST. Apollo's People Search is free
  // — `icps.ts` says it in three places (*"Apollo search costs nothing"*, *"the search
  // endpoint is Apollo's no-credit api_search"*, *"This route spends no Apollo CREDITS —
  // People Search is free; the credit is the reveal"*) — and PDL, the paid half of the
  // original "PDL/Apollo" framing, has not been a provider of ours since FD-6. The rule was
  // guarding a spend that moved to the reveal, which still waits for far more than an account.
  //
  // 🛑 AND IT WAS COSTING THE THING THE APPROVED PORTAL IS BUILT AROUND. The locked Brief
  // screen shows *"4,120 people match this so far — around ten meetings at this size"* WHILE
  // the client is still talking, because that number is what makes the targeting real and the
  // capacity promise honest. The account row is created at CONFIRM — after the Brief — so the
  // gate made the number impossible exactly where it was specified. Founder, 22 Sep: yes.
  //
  // ⚠️ STILL ONE CALL SITE, AND MORE STRICTLY SO THAN BEFORE. Both the proposal and the live
  // panel come through this function; `first-run-milla.test.ts` counts the string and the
  // count is one. What changed is WHEN it may run, not HOW — cache, rate limit, audience and
  // provider boundary are all untouched.
  const countFor = useCallback(async (icp: IcpDraft) => {
    try {
      const r = await api.post<{ data: { count: number } }>('/icps/preview-count', icp, await token())
      setMatchCount(typeof r.data?.count === 'number' ? r.data.count : null)
    } catch {
      // ⚠️ A FAILED COUNT IS "—", NEVER A STALE NUMBER. The bar has always rendered null as an
      // em-dash; showing the previous answer beside changed targeting would be a figure
      // nobody computed about a search nobody ran.
      setMatchCount(null)
    }
  }, [])

  const propose = useCallback(async (icp: IcpDraft) => {
    setProposed(icp)
    void countFor(icp)
  }, [countFor])

  /**
   * 🛑 SAVE ONE FIELD THE CLIENT PICKED — the other half of "talk to Milla or drop them down".
   *
   * ⚠️ IT SENDS ALL FOUR, EVERY TIME. `saveBriefDraft` merges at the top level only, so a body
   * carrying just the field that changed would REPLACE the whole `picked` object and silently
   * drop a size the client chose a minute earlier. The route's own note says so; this is the
   * caller honouring it rather than asking the server for a deeper merge nobody would find.
   *
   * ⚠️ AND IT NEVER TOUCHES WHAT THEY SAID. The eleven spoken facts are not in this body, so a
   * pick cannot overwrite a sentence — which is what keeps "you said: around twenty to fifty"
   * visible underneath a field the client has since changed to 201–500.
   *
   * ⚠️ A FAILED SAVE PUTS THE FIELD BACK. Showing the new chips over a value the server never
   * received is the worst of both: the client believes they changed the targeting, and the
   * search disagrees. `refreshTargeting` then re-reads the truth either way.
   */
  const savePick = useCallback(async (rowId: string, next: string[]) => {
    // ⚑ 24 Sep — a row the server sends with its own `pick.key` is saved under that key directly.
    const key = PICK_KEY[rowId] ?? rowId
    if (!key) return
    const before = picked
    const merged = { ...picked, [rowId]: next }
    setPicked(merged)
    try {
      // ⛓️ 24 Sep — WAS `const body = {}`: after a reload the tab held no earlier picks, so this
      // body replaced the stored set with ONE field. It now starts from what the server holds.
      const body: Record<string, string[]> = { ...serverPicked }
      for (const [id, v] of Object.entries(merged)) {
        if (Array.isArray(v)) body[PICK_KEY[id] ?? id] = v
      }
      await api.put('/milla/brief-draft', { picked: body }, await token())
    } catch {
      setPicked(before)
      setError('That change could not be saved just now — nothing else you told Milla is affected.')
    }
    await refreshTargeting()
  }, [picked, serverPicked, refreshTargeting])

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

  // ⛓️ 22 Sep — S1-RT-001's DUPLICATE SIGN-OUT IS GONE, AND ITS REQUIREMENT IS STRONGER FOR IT.
  // ~~`async function signOut() { … }`~~ existed only because `MillaShell` hid its rail on this
  // route, taking the product's one Sign out with it. The rail is present from the first second
  // now, so a person mid-Brief leaves their account by the canonical control — one sign-out
  // path, which is what that item wanted and could not have while the shell was hidden here.

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
      // ── 🛑 ⚑ 16 Sep (S1-RT-010) — PRODUCT STATE, NOT A SENTENCE FROM MILLA ────────────
      //
      // The server refused a completion it could prove was short of a fact, and suppressed the
      // model's "that's everything I need" rather than delivering it as the turn that was
      // meant to continue the conversation. Nothing is appended to `messages`: this must not
      // read as Milla speaking, because she did not say it. The composer stays enabled — the
      // client answers the outstanding fact in their own words, exactly as they have all along.
      if (d.type === 'outstanding') {
        const o = d.brief_outstanding
        setOutstanding({ label: o.next.label, remaining: o.remaining })
        void o.account
        // The server refused a completion, so onboarding is not ready whatever this tab holds.
        setServerReady(false)
        // ⚠️ THE SAME STATE THE RESUME PATH AND Get Help ALREADY SPEAK FROM — reused, never
        // duplicated, and still the server's numbers. `count` is derived by SUBTRACTION from
        // the server's own `total` and `remaining`; there is no eleven-fact list in this app.
        // ⛓️ 16 Sep (S1-ONB-002) — CANONICAL BRIEF PROGRESS, and now actually true. `remaining`
        // is the eleven alone, so this is facts held out of eleven — 10 of 11 stays 10 of 11
        // when the only thing outstanding is the client's own country. It used to subtract the
        // account gap too and under-report to the operator reading the Get Help email.
        setBriefProgress({ count: Math.max(0, o.total - o.remaining), total: o.total })
        setBriefNext(o.next.label)
        return
      }
      setOutstanding(null)
      // ⚑ 16 Sep (S1-ONB-001) — a QUESTION turn means the server has not said ready, so the
      // gate closes even if a completion reached this tab earlier in the conversation. That is
      // what makes a later correction able to take READY back.
      setServerReady(d.type === 'complete' && d.onboarding_state === 'ready')
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
        setBriefExclusions(typeof d.brief_exclusions === 'string' ? d.brief_exclusions : '')
        setBriefGeographies(Array.isArray(d.brief_geographies) ? d.brief_geographies : [])
        setBriefTargetCategory(typeof d.brief_target_category === 'string' ? d.brief_target_category : '')
        setBriefCompanySizes(Array.isArray(d.brief_company_sizes) ? d.brief_company_sizes : [])
        setBriefRoles(Array.isArray(d.brief_roles) ? d.brief_roles : [])
        setBriefSeniority(Array.isArray(d.brief_seniority) ? d.brief_seniority : [])
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
    finally {
      setThinking(false)
      // ⚑ 22 Sep — AFTER EVERY TURN, INCLUDING A FAILED ONE. The customer's message is durable
      // the moment it is sent (J5-C11), so a turn that errored on the way back may still have
      // moved the Brief. Re-reading here is how the panel stays the truth rather than an
      // optimistic echo of the last reply this tab happened to parse.
      void refreshTargeting()
    }
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
    // ⚑ 23 Sep (R142 · A2a) — the button is locked without an industry; this refuses a stale click too.
    if (!industryChosen) { setError('Choose at least one industry on the right first — Milla needs it before she can look.'); return }
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
        // ── ⛓️ 16 Sep (S1-ONB-001) — THE BROWSER-LOCAL ACCOUNT CHECK IS GONE ───────────
        //
        // 🛑 WHAT STOOD HERE WAS A READINESS AUTHORITY IN A COMPONENT, and it ran AFTER the
        // client had already pressed Confirm — so the plan rendered, the CTA was live, the
        // panel said "Based in — still needed", and the refusal arrived on the click, phrased
        // as a sentence from Milla that she never wrote.
        //
        // ⚠️ NOTHING IS WEAKENED. `country` is now part of the server's readiness answer, so a Brief
        // without it is not READY, this screen never offers Confirm, `/milla/brief-draft/
        // confirm` refuses it server-side, and `/auth/onboard` refuses it again. Milla asks
        // for it in the conversation instead — in her own words, before the button exists.
        const p = profile
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
          // ⛓️ 23 Sep — WAS `router.push('/milla')`. Waiting on our translation is still waiting:
          // they stay in the Brief, told it is ours to finish (founder's "do not present the
          // next step" rule).
          setProofHold('needs_us'); setSaving(false)
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
      // ⛓️ 23 Sep — WAS `router.push('/milla?finding=1')`: the client was moved to the Proof desk
      // the moment the run STARTED. They now wait here until `proofReadiness` says `ready`.
      setProofHold('preparing'); setSaving(false)
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

  // ⛓️ 22 Sep — ~~`const stepDot = …`~~ REMOVED WITH THE FOUR-STEP BAR IT DREW. Welcome · Your
  // target · Your plan · Go live was a fifth stage vocabulary, older than MVP1 and disagreeing
  // with the canonical six. The shell's FLOW ribbon reads `MVP1_MILLA_STAGES` from
  // `@kind/shared/mvp1-stage` — the same constant Vida's ribbon reads — and marks Brief current
  // here. One vocabulary, two views, and a client's first screen no longer carries two
  // progress indicators counting different things.

  return (
    // ── 🛑 ⚑ 22 Sep — THIS IS A PANEL NOW, NOT A SCREEN ──────────────────────────────────
    //
    // 🛑 FOUNDER-LOCKED 22 Sep: *"the client lands after sign up and lands in Milla portal.
    // they speak there and see there."* `MillaShell` no longer strips its chrome for this
    // route, so the rail, the account bar and the FLOW ribbon are around this conversation
    // from the first second. Three things therefore came OUT of this file, and each was
    // removed because the shell already renders it — never because it stopped mattering:
    //
    //   ① `h-screen` → `h-full`. The page no longer owns the viewport; it fills the shell's
    //      content area, which is what makes the rail and ribbon visible beside it.
    //   ② Its own 54px header — Milla's face and name. The shell's account bar is the one
    //      header, and two stacked would be the "second, independent vocabulary" defect the
    //      ribbon comment below already warns about.
    //   ③ Its Sign out button, added by S1-RT-001 *because* the shell used to be hidden here.
    //      The rail carries the canonical `MillaShell.signOut` again, so that item's actual
    //      requirement — a signed-in person mid-Brief can leave — is satisfied by the product's
    //      one sign-out path instead of a duplicate. **The requirement is met more strongly,
    //      not dropped.** The Brief still lives in `onboarding_brief_drafts` keyed on the USER,
    //      so signing back in still resumes the same draft.
    //
    // ⚠️ AND THE FOUR-STEP DOTS WENT WITH THE HEADER (Welcome · Your target · Your plan · Go
    // live). They are a FIFTH stage vocabulary that predates MVP1 and disagrees with the
    // canonical six the shell's ribbon reads from `@kind/shared/mvp1-stage`. Two progress
    // indicators stacked, counting different things, on a client's first screen. The ribbon
    // now marks **Brief** current during onboarding, which is where this client actually is.
    <div className="h-full flex flex-col bg-[#faf8ff] text-[#1f1235] overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {/* ── 🛑 ⚑ 22 Sep — MILLA IS A COLUMN, THE WORKSPACE IS THE SCREEN ────────────────
             ⛓️ WAS: ~~`<section className="flex-1 min-w-0 flex flex-col">`~~ beside a 420px
             panel — which was right while this page owned the whole viewport and wrong the
             moment it became a panel inside the shell. The conversation took every spare
             pixel, so one message floated at the top of a vast empty field with the composer
             stranded at the bottom of the screen, and the targeting panel was a narrow strip.

             🛑 THE APPROVED PORTAL IS THE OTHER WAY ROUND, and it is the same shape the
             shell's own conversation has always used: Milla is a FIXED 600px column with her
             own header, and the working area beside her is what grows. A conversation column
             past ~600px is 170+ characters a line, which reads badly however full it is.

             ⚠️ FULL WIDTH ON A PHONE, 600px ABOVE THE BREAKPOINT — byte-identical to
             `MillaConversation`'s own column, so the first run and every later screen are the
             same object at every width rather than two things that resemble each other. */}
        {/* ── 🛑 ⚑ 24 Sep — THE BRIEF SPEAKS IN THE ONE CHAT, NOT A SECOND ONE ─────────────────
             Founder, verbatim: *"we never leave one chat to go to another. not how it workss. evern
             the first part. the only change is the right screen."*
             ⛓️ WAS: ~~`<section className="w-full md:w-[600px] shrink-0 …">`~~ — this page drew its
             OWN conversation column (header, transcript, composer) while the shell's stood down,
             so moving on to Proof replaced one chat with another and the Brief vanished.
             Now the shell's column is the only one: this page CLAIMS its body (`claimChatSlot`)
             and renders the Brief's transcript and composer into it through a portal. Every word,
             rule and control below is unchanged — only where it is drawn moved. Releasing the
             claim (leaving this page) hands the column back, and the shell shows the Brief first. */}
        {conversation.chatSlot ? createPortal(
          <>
          <div ref={bodyRef} className="mv-chat">
            <>
              {messages.map((m, i) => (
                <div key={i} className={`mv-msg ${m.role === 'user' ? 'client' : 'agent'}`}>
                  <div className="mv-who">{m.role === 'user' ? 'You' : 'Milla'}</div>
                  {/* ⚑ 22 Sep — `whitespace-pre-line`, because the locked opening's third
                      message carries a real paragraph break before "Looking costs nothing"
                      and the default collapse ran the commercial promise onto the end of the
                      sentence above it. Applies to every bubble: Milla's own replies already
                      contained blank lines that were being flattened the same way. */}
                  <div className="mv-bubble whitespace-pre-line">{m.content}</div>
                </div>
              ))}
              {thinking && <div className="mv-msg agent"><div className="mv-who">Milla</div><div className="mv-bubble text-[#a29aa9]">Milla is thinking…</div></div>}
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
            </>
          </div>
          <div className="shrink-0">
            {/* The composer is closed until we know whether this person already has an
                account — see the `status` comment above. A failed lookup offers a retry
                rather than a guess, because both guesses are wrong for somebody. */}
            {/* ── 🛑 ⚑ 16 Sep (S1-RT-010) — THE ONE THING STILL NEEDED, AS PRODUCT STATE ──
                 Deliberately ABOVE the composer and deliberately NOT a chat bubble: it sits
                 outside the message list, carries no avatar and is not attributed to Milla,
                 because she did not say it — the server suppressed what she tried to say and
                 sent this fact instead. The label is the server's; this file names no fact.
                 The composer below stays exactly as enabled as it was: the client answers in
                 their own words, and the next turn is an ordinary Milla turn. */}
            {outstanding && status === 'ready' && (
              <div role="status" className="mx-[18px] mb-2 flex items-start gap-2.5 rounded-xl border border-[#e4dcf7] bg-[#faf7ff] px-4 py-3">
                <span aria-hidden className="text-[13px] leading-none mt-0.5">📝</span>
                <span className="text-[12.5px] text-[#5c5279] leading-relaxed">
                  {/* ── 🛑 ⚑ 16 Sep (S1-ONB-002) — THE NUMBER IS THE ELEVEN, OR THERE IS NO NUMBER.
                       `remaining` is now canonical Brief facts only, so it can be 0 while an
                       ACCOUNT fact is still outstanding — and "0 things still needed" beside a
                       request for that fact would be a lie. In that state the count is simply
                       not said. Still no checklist, still no "11/11", and the thing being
                       asked for is the server's own label either way. */}
                  {outstanding.remaining === 0
                    ? 'Just one more thing'
                    : outstanding.remaining === 1 ? 'One thing still needed' : `${outstanding.remaining} things still needed`}
                  {' — '}<b className="text-[#1f1235]">{outstanding.label}</b>.
                  {' '}Tell me below and I&rsquo;ll finish your targeting plan.
                </span>
              </div>
            )}
            {/* ── ⚑ 22 Sep — THE LOCKED STARTER CHIPS ──────────────────────────────────
                 🛑 They exist because "tell me what you're trying to achieve" is a blank page,
                 and a blank page is where a first-time client stalls. Each chip is a whole
                 sentence they can send as-is.

                 ⚠️ THEY SEND, THEY DO NOT PREFILL. `send()` is the same path the composer
                 uses, so a chip is an ordinary client turn — there is no second way into the
                 conversation and nothing here is attributed to Milla.

                 ⚠️ AND THEY RETIRE THE MOMENT THE CLIENT SPEAKS. Once the transcript is no
                 longer the untouched opening, Milla is asking her own questions and a row of
                 generic openers beneath them would be competing with her. */}
            {isUntouchedGreeting(messages) && status === 'ready' && !thinking && (
              <div className="mv-quickbar">
                {STARTERS.map(s => (
                  <button key={s} type="button" onClick={() => send(s)} className="mv-quick">
                    {s}
                  </button>
                ))}
              </div>
            )}
            {status === 'error' ? (
              <div className="mx-[18px] mb-[18px] flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <span className="text-[12.5px] text-[#7a6a3a]">I couldn&rsquo;t load your account just now, so I&rsquo;d rather not start until I can.</span>
                <button type="button" onClick={() => { void loadStatus() }}
                  className="text-[12.5px] font-bold text-white rounded-xl px-4 py-2 bg-[#7C3AED] shrink-0">Try again</button>
              </div>
            ) : (
              <form onSubmit={e => { e.preventDefault(); send(input) }} className="mv-composer">
                <input value={input} onChange={e => setInput(e.target.value)} disabled={status !== 'ready'}
                  placeholder={status === 'ready' ? 'e.g. Heads of Ops at UK logistics firms, 50–500 staff…' : 'One moment — getting your account ready…'}
                  className="disabled:opacity-50" />
                <button type="submit" disabled={status !== 'ready' || thinking || !input.trim()} className="mv-send accent !w-auto px-3.5 disabled:opacity-50">Send</button>
              </form>
            )}
          </div>
          </>,
          conversation.chatSlot,
        ) : null}

        {/* ── 🛑 ⚑ 24 Sep (R145 step 2) — THE BRIEF PANEL, AS THE REDESIGN DRAWS IT ─────────────
             Founder: *"yes but i cant add more informaiton when the purple part comes up"* ·
             *"match everything. colors everything."* ⛓️ WAS two screens in one: a workspace of
             six fields that was REPLACED by a "Proposed ICP" card the moment Milla finished, so
             the fields vanished exactly when the client wanted to check them, and the only way
             back was "Keep adjusting the target". Now there is ONE panel in every state:
               · the hero — how much Milla understands and how many people match (the count is
                 still the single gated `preview-count` call site, via `countFor`);
               · "Your targeting" — Apollo-style filter rows, always visible, always editable;
               · what Milla understood about the business, once there is something to show;
               · ONE button, "Show me who you'd find", lit only when everything is there, and a
                 line under it saying exactly what is still missing (#9).
             Locks kept from the panel this replaces: the client's own words stay visible under a
             changed field; "stored & sent as" prints what Apollo receives; the capacity sentence
             is derived (`capacitySentence(committedCapacity(…))`), never typed, and never the
             400; no price of any kind appears on this screen (R124). */}
        <aside className="mv-workspace-body flex-1 min-w-0 overflow-y-auto [&>*]:shrink-0">
          {(() => {
            const pct = briefProgress && briefProgress.total > 0 ? Math.round((briefProgress.count / briefProgress.total) * 100) : 0
            return (
              <div className="mv-hero-card">
                <div className="mv-eyebrow">
                  {briefProgress && briefProgress.count > 0 ? `Milla understands ${briefProgress.count} of ${briefProgress.total}` : 'Milla is listening'}
                </div>
                <h2>
                  {matchCount === null
                    ? 'Tell Milla who you want to meet.'
                    : `${matchCount.toLocaleString()} people match this so far.`}
                </h2>
                <p>
                  {matchCount === null
                    ? <>One message is enough to start. This fills in as you talk &mdash; nothing is charged and nobody is contacted.</>
                    : <>That&rsquo;s {capacitySentence(committedCapacity(workablePool(matchCount)))} &mdash; free to look at, nothing charged, nothing bought.</>}
                  {outcome ? <><br />Your outcome: <b className="text-[color:var(--mv-ink)]">{outcome}</b></> : null}
                </p>
                <div className="mv-progress-track"><div className="mv-progress-fill" style={{ width: `${pct}%` }} /></div>
              </div>
            )
          })()}

          <div className="mv-filter-shell">
            <div className="mv-filter-top">
              <div className="mv-copy">
                <b>Your targeting</b>
                <small>Milla builds this from your conversation. Open any filter to check or change it.</small>
              </div>
              {matchCount !== null ? <div className="mv-match-pill">{matchCount.toLocaleString()} matches · live</div> : null}
            </div>
            <div className="mv-filter-list">
              {targeting.map((t, i) => {
                if (t.pick) {
                  const pk = t.pick
                  const kinds = picked[pk.kinds_key] ?? pk.kinds_chosen
                  const named = picked[pk.key] ?? t.sending
                  return (
                    <FilterRow key={t.id} label={t.label} options={[]} free chosen={named}
                      placeholder={t.said || t.placeholder} said={t.said && named.length + kinds.length > 0 ? t.said : undefined}
                      note={t.note}
                      onChange={next => savePick(pk.key, next)}
                      extra={{
                        options: pk.kinds, chosen: kinds,
                        onChange: next => {
                          if (next.length > kinds.length) setMessages(m => [...m, { role: 'assistant', content: NEVER_CONTACT_ASK_COPY }])
                          void savePick(pk.kinds_key, next)
                        },
                      }} />
                  )
                }
                const opts = FIELD_OPTIONS[t.id]
                const chosen = picked[t.id] ?? t.sending
                return opts ? (
                  <FilterRow key={t.id} label={t.label} options={opts.options} free={opts.free} max={opts.max}
                    chosen={chosen} placeholder={t.placeholder} said={t.said || undefined}
                    sentAs={t.provider} note={t.note} open={i === 0 || needsPick.some(n => n.id === t.id)}
                    onChange={next => savePick(t.id, next)} />
                ) : null
              })}
            </div>
            <div className="mv-filter-note">
              <span>✦</span>
              <span><b>You don&rsquo;t need to fill this in.</b> Milla turns what you say into Apollo&rsquo;s own filters; these let you see and correct them.</span>
            </div>
          </div>

          {/* ── WHAT MILLA UNDERSTOOD — the account and the business, read back before they
               become the client's record. Nothing is invented for the panel; if it reads wrong,
               the fix is to tell Milla. Shown once there is something to show. */}
          {(showProfile || (business && (Object.values(business).some(Boolean) || intent)) || briefExclusions.trim()) ? (
            <div className="mv-section">
              <div className="mv-section-head"><b>What Milla understood</b><span>tell Milla if anything is off</span></div>
              <div className="mv-section-body">
                {refining ? <p className="mv-muted-note mb-2">This updates your existing targeting &mdash; same plan, sharpened.</p> : null}
                <div className="mv-kv-list">
                  {showProfile ? <>
                    <div className="mv-kv-row"><span>Company</span><strong>{profile!.company_name || 'still needed'}</strong></div>
                    <div className="mv-kv-row"><span>Based in</span><strong>{profile!.country || 'still needed'}</strong></div>
                    {profile!.contact_name ? <div className="mv-kv-row"><span>Speaking to</span><strong>{profile!.contact_name}</strong></div> : null}
                    {profile!.website ? <div className="mv-kv-row"><span>Website</span><strong>{profile!.website}</strong></div> : null}
                  </> : null}
                  {business?.product ? <div className="mv-kv-row"><span>What you sell</span><strong>{business.product}</strong></div> : null}
                  {business?.pain_points ? <div className="mv-kv-row"><span>The problem you solve</span><strong>{business.pain_points}</strong></div> : null}
                  {business?.differentiators ? <div className="mv-kv-row"><span>What makes you different</span><strong>{business.differentiators}</strong></div> : null}
                  {intent ? <div className="mv-kv-row"><span>What this campaign is for</span><strong>{intent}</strong></div> : null}
                  {business?.tone ? <div className="mv-kv-row"><span>How you want to sound</span><strong>{business.tone}</strong></div> : null}
                  {/* ⚑ 14 Sep (S1-RT-009A) — who we will NOT contact, from the durable Brief. */}
                  {briefExclusions.trim() ? <div className="mv-kv-row"><span>Who we will NOT contact</span><strong>{briefExclusions}</strong></div> : null}
                </div>
                {/* Proof is shown SPLIT, because the split is the promise: we may know something
                    and still not be allowed to say it. */}
                {proof.length > 0 ? (
                  <div className="mt-3">
                    <div className="mv-eyebrow">Proof we may use in your emails</div>
                    {proof.filter(p => p.permitted).length > 0
                      ? <div>{proof.filter(p => p.permitted).map((p, i) => <span key={i} className="mv-tag">{p.claim}</span>)}</div>
                      : <div className="mv-muted-note">None yet &mdash; we will not name a customer or quote a result until you say we can.</div>}
                    {proof.some(p => !p.permitted)
                      ? <div className="mv-muted-note mt-1">{proof.filter(p => !p.permitted).length} other thing(s) you mentioned are saved but <b>will not be used</b> until you approve them.</div>
                      : null}
                  </div>
                ) : null}
                {/* ⚑ 24 Aug — FROM YOUR WEBSITE, NOT FROM YOU. Listed separately and named as
                    unconfirmed; it reaches the targeting only once the client says it is right. */}
                {webHints.length > 0 ? (
                  <div className="mt-3">
                    <div className="mv-eyebrow">From a quick read of your website · not yet confirmed</div>
                    <div>{webHints.map((h, i) => <span key={i} className="mv-tag">{h}</span>)}</div>
                    <div className="mv-muted-note mt-1">We guessed these from your site &mdash; they are <b>not part of your targeting</b> until you tell Milla which ones fit.</div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── ⚑ 24 Sep (R145 step 2 · #9 · D2) — ONE BUTTON, AND WHAT IS STILL MISSING ──────
               Founder: *"Milla does not tell me what else i need here. i need to ask???"* and
               *"it says it has everything but wont let me thru"*. The button is always here; it
               is lit only when the server says the Brief is ready, the industry is picked and no
               field is waiting on a pick — and the line under it names the one thing missing.
               ⚑ round 4 — the button IS the confirmation (`clients.milla_understanding_confirmed_at`);
               ⚑ 24 Aug — on a first run it also opens the account, immediately before the ICP. */}
          {/* ── THIS SCREEN DESCRIBES ONE STAGE, AND THE STAGE IS FREE (founder-ruled 24 Aug) ──
               ⚠️ NO PRICE OF ANY KIND BELONGS ON THIS SCREEN — not $299, not $4, not the first
               100. ⛓️ 23 Sep — ~~"The $299 ask lives behind 'Looks right' on the desk"~~.
               FALSE SINCE R124 (16 Sep: *"299/4 is gone. out. we are on the programme. all clients."*).
               Nothing in the portal links to the retired pack, and the Milla billing page takes no
               payment at all; the client's first payment is P1 of a programme, on the Programme
               screen. ⛓️ 24 Sep (R145 · D2) — the button, which read "Yes, this represents us —
               show me who you'd find", is now the redesign's one Brief button. */}
          {proofHold === null || proofHold === 'not_started' ? (
            <div className="flex flex-col gap-2">
              <div className="mv-cta-row">
                <button disabled={saving || blocker !== null} onClick={approve}
                  className="mv-btn primary flex-1 disabled:opacity-50">
                  {saving ? 'Saving…' : "Show me who you'd find"}
                </button>
              </div>
              <div className="mv-muted-note text-center">
                {blocker ?? <><b>Free proof.</b> Up to 20 masked leads who match this &mdash; <b>free, masked, and nobody is contacted</b>. You decide what happens next.</>}
              </div>
              {error ? <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{error}</div> : null}
            </div>
          ) : (
            /* ⚑ 23 Sep — WHILE THEIR PEOPLE ARE BEING PUT TOGETHER, THEY STAY IN THE BRIEF. Never
               "a snag": either it is being put together, or it is ours to finish, or — only when
               the search found nobody — Milla asks them to widen, in the chat. */
            proofHold !== 'ready' ? (
              <div className="mv-hero-card">
                <div className="mv-eyebrow">Proof</div>
                <h2 className="!text-[17px]">
                  {proofHold === 'preparing' ? 'Putting your first examples together'
                    : proofHold === 'needs_client' ? 'One thing to widen'
                      : 'Your first examples are on their way'}
                </h2>
                <p>
                  {proofHold === 'preparing' ? PROOF_PREPARING_COPY
                    : proofHold === 'needs_client' ? PROOF_NEEDS_CLIENT_COPY
                      : PROOF_NEEDS_US_COPY}
                </p>
              </div>
            ) : null
          )}
        </aside>
      </div>
    </div>
  )
}
