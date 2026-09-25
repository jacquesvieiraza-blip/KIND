'use client'
// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R165) — THE CLIENT'S INBOX. WAS "REPLIES" / "UNIBOX".
//
// The founder: *"huge fix inside Milla. replies. this also needs to be lablled inbox. not
// replies. and then look inside. launch campaign. chat to figsy. irrelevant information. this
// needs to be much better. prebiew design first"* — previewed, then GO.
//
// What it is: a list of the people who replied, and the whole conversation with each one in
// order — our email, their reply, our answer — with a plain "what happens next" on top.
//
// 🛑 READ-ONLY FOR THE CLIENT (R150: *"Replies stay with us … offers no send."*). There is no
// composer, no "Help me reply", no Send and no "Mark meeting booked" here: a client click must
// never send an email, and must never create a billable meeting.
//
// ⚠️ NOTHING ON THIS SCREEN IS DECORATION. The old Unibox carried a LinkedIn filter (we only
// send email), Unread/Archived/Replied folders and tags with nothing behind them, an "ICP fit —"
// with no data, "FIGSY says" copy, and links to retired screens. Every count here is counted
// from the rows the API returned; every sentence says only what the product actually does.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Inbox as InboxIcon, Loader2, Search, X } from 'lucide-react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

import {
  buildConversations, inFilter, NEXT, STATUS,
  type Conversation, type InboxFilter, type InboxStatus, type ReplyRow, type SentRow,
} from '@/lib/inbox'

type InboxResponse = { data: ReplyRow[]; sent?: SentRow[] | null; sent_total?: number | null }

function ago(s: string | null): string {
  if (!s) return ''
  const mins = Math.floor((Date.now() - new Date(s).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}
const stamp = (s: string | null) => s
  ? new Date(s).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  : ''

const AV = ['#7C3AED', '#6D28D9', '#9333ea', '#a855f7', '#8b5cf6', '#7e22ce']
function avatar(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
  return AV[h % AV.length]
}
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?'

function Avatar({ name, size }: { name: string; size: number }) {
  return (
    <span className="rounded-full grid place-items-center text-white font-bold shrink-0"
      style={{ background: avatar(name), width: size, height: size, fontSize: size * 0.36 }}>{initials(name)}</span>
  )
}

function Pill({ status, big }: { status: InboxStatus; big?: boolean }) {
  return <span className={`inline-flex rounded-md font-bold ${big ? 'text-[11.5px] px-2.5 py-1' : 'text-[10.5px] px-2 py-0.5'} ${STATUS[status].tone}`}>{STATUS[status].label}</span>
}

const FILTERS: [InboxFilter, string][] = [['all', 'All'], ['interested', 'Interested'], ['booked', 'Meetings booked'], ['else', 'Everything else']]

export default function MillaInbox() {
  const [rows, setRows] = useState<ReplyRow[]>([])
  const [sent, setSent] = useState<SentRow[] | null>([])
  const [sentTotal, setSentTotal] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [filter, setFilter] = useState<InboxFilter>('all')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  /** Phone only: the open conversation covers the list until "Back". */
  const [reading, setReading] = useState(false)

  const load = useCallback(async () => {
    const { data: { session } } = await createClient().auth.getSession()
    if (!session) return
    try {
      const res = await api.get<InboxResponse>('/figsy/replies/all', session.access_token)
      setRows(res.data ?? [])
      setSent(res.sent === undefined ? [] : res.sent)
      setSentTotal(typeof res.sent_total === 'number' ? res.sent_total : null)
      setLoadError(null)
    } catch (e) {
      // 🛑 REFUSED, NOT EMPTY (4 Sep): the route fails CLOSED when current work is unreadable.
      // Rendering that as "no replies" would turn a refusal into a claim about their inbox.
      setLoadError(e instanceof Error ? e.message : 'We could not load your inbox right now. Nothing has changed.')
    }
    setLoading(false)
  }, [])
  useEffect(() => { void load() }, [load])

  const all = useMemo(() => buildConversations(rows, sent), [rows, sent])
  const counts = useMemo(() => ({
    all: all.length,
    interested: all.filter(c => inFilter(c, 'interested')).length,
    booked: all.filter(c => inFilter(c, 'booked')).length,
    else: all.filter(c => inFilter(c, 'else')).length,
  }), [all])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(c => inFilter(c, filter))
      .filter(c => !q || c.name.toLowerCase().includes(q) || (c.company ?? '').toLowerCase().includes(q))
  }, [all, filter, query])
  const open = shown.find(c => c.key === selected) ?? shown[0] ?? null

  return (
    <div className="bg-white border border-[#e7e3ec] rounded-2xl overflow-hidden flex flex-col min-h-[560px]" data-testid="milla-inbox">
      <header className="px-5 pt-4 pb-3 border-b border-[#e7e3ec] flex flex-wrap items-end gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-[19px] font-extrabold text-[#17101f]">Inbox</h1>
          <p className="text-[12.5px] text-[#6b6187] mt-0.5 max-w-[60ch] leading-relaxed">
            Every reply to your emails, in one place. We answer them for you and book the meetings. You can read every conversation here.
          </p>
        </div>
        {all.length > 0 && (
          <div className="ml-auto flex gap-4 text-[11.5px] text-[#6b6187]" data-testid="inbox-tally">
            <div><b className="block text-[17px] text-[#17101f] tabular-nums">{counts.all}</b>replied</div>
            <div><b className="block text-[17px] text-[#17101f] tabular-nums">{counts.interested}</b>interested</div>
            <div><b className="block text-[17px] text-[#17101f] tabular-nums">{counts.booked}</b>meetings booked</div>
          </div>
        )}
      </header>

      {loading ? (
        <div className="flex-1 grid place-items-center py-16"><Loader2 className="w-5 h-5 animate-spin text-[#9b8ec4]" /></div>
      ) : loadError ? (
        <div className="flex-1 grid place-items-center py-16 px-6 text-center" data-testid="inbox-error">
          <div>
            <p className="text-[13px] font-medium text-[#6b6187]">{loadError}</p>
            <button onClick={() => { setLoading(true); void load() }} className="mt-3 text-[12px] font-bold text-[#7C3AED] hover:underline">Try again</button>
          </div>
        </div>
      ) : all.length === 0 ? (
        <Empty sentTotal={sentTotal} />
      ) : (
        <div className="flex-1 grid md:grid-cols-[minmax(260px,330px)_minmax(0,1fr)] min-h-0">
          <div className={`md:border-r border-[#e7e3ec] flex-col min-w-0 ${reading ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-3 flex flex-col gap-2.5 border-b border-[#e7e3ec]">
              <label className="flex items-center gap-2 border border-[#ded8e8] rounded-lg px-2.5 py-1.5 focus-within:border-[#7C3AED]">
                <Search className="w-4 h-4 text-[#9b8ec4]" />
                <input id="inbox-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or company"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[12.5px] text-[#17101f] placeholder:text-[#9b8ec4]" />
                {query && <button onClick={() => setQuery('')} aria-label="Clear search" className="text-[#9b8ec4]"><X className="w-4 h-4" /></button>}
              </label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
                {FILTERS.map(([f, label]) => (
                  <button key={f} id={`inbox-filter-${f}`} onClick={() => setFilter(f)} aria-pressed={filter === f}
                    className={`text-[11.5px] font-semibold rounded-full px-2.5 py-1 border ${filter === f ? 'bg-[#7C3AED] border-[#7C3AED] text-white' : 'bg-white border-[#ded8e8] text-[#4c4459] hover:bg-[#faf8ff]'}`}>
                    {label}<span className="ml-1 opacity-75 tabular-nums">{counts[f]}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-y-auto">
              {shown.length === 0 ? (
                <p className="text-center text-[12.5px] text-[#9b8ec4] py-10 px-4">Nobody here{query ? ' matches that search' : ' yet'}.</p>
              ) : shown.map(c => (
                <button key={c.key} onClick={() => { setSelected(c.key); setReading(true) }} aria-current={open?.key === c.key}
                  className={`relative w-full text-left flex gap-2.5 px-3.5 py-3 border-b border-[#e7e3ec] ${open?.key === c.key ? 'bg-[#f3ecff]' : 'hover:bg-[#faf8ff]'}`}>
                  {open?.key === c.key && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#7C3AED]" />}
                  <Avatar name={c.name} size={34} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <b className="text-[13px] text-[#17101f] truncate">{c.name}</b>
                      <span className="ml-auto text-[11px] text-[#9b8ec4] whitespace-nowrap">{ago(c.lastAt)}</span>
                    </span>
                    {c.company && <span className="block text-[11.5px] text-[#6b6187]">{c.company}</span>}
                    <span className="block text-[12px] text-[#4c4459] mt-1 line-clamp-2 leading-snug">{c.snippet}</span>
                    <span className="block mt-1.5"><Pill status={c.status} /></span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <section className={`min-w-0 flex-col ${reading ? 'flex' : 'hidden md:flex'}`} aria-live="polite">
            {open && <Thread c={open} onBack={() => setReading(false)} />}
          </section>
        </div>
      )}
    </div>
  )
}

function Thread({ c, onBack }: { c: Conversation; onBack: () => void }) {
  const next = NEXT[c.status]
  return (
    <>
      <div className="px-5 py-3.5 border-b border-[#e7e3ec] flex flex-wrap items-center gap-3">
        <button onClick={onBack} className="md:hidden text-[#6b6187]" aria-label="Back to the list"><ArrowLeft className="w-5 h-5" /></button>
        <Avatar name={c.name} size={40} />
        <div className="min-w-0">
          <h2 className="text-[15px] font-bold text-[#17101f] truncate">{c.name}</h2>
          <p className="text-[12px] text-[#6b6187]">{[c.role, c.company].filter(Boolean).join(' · ')}</p>
        </div>
        <span className="ml-auto"><Pill status={c.status} big /></span>
      </div>
      <div className="mx-5 mt-3.5 rounded-xl border border-[#ded8e8] bg-[#fbf9ff] px-3.5 py-3 flex gap-3" data-testid="inbox-next">
        <span className="w-[26px] h-[26px] rounded-lg bg-[#7C3AED] text-white grid place-items-center text-[12px] font-extrabold shrink-0">M</span>
        <div>
          <b className="block text-[12.5px] text-[#17101f]">{next.title}</b>
          <p className="text-[12.5px] text-[#4c4459] leading-relaxed">
            {next.text}{next.meetings && <> <Link href="/milla/meetings" className="font-bold text-[#5b21b6]">Meetings</Link>.</>}
          </p>
        </div>
      </div>
      <div className="p-5 flex flex-col gap-3.5 flex-1 bg-[#faf8ff] mt-3.5 border-t border-[#e7e3ec]">
        {c.messages.map((m, i) => (
          <article key={i} className={`max-w-[640px] rounded-xl bg-white overflow-hidden border ${m.kind === 'theirs' ? 'border-[#c9b3f5]' : 'border-dashed border-[#ded8e8]'}`}>
            <header className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1 px-3.5 py-2 border-b border-[#e7e3ec] text-[11.5px] text-[#6b6187]">
              {m.kind !== 'theirs' && <span className="w-[7px] h-[7px] rounded-full bg-[#7C3AED] self-center" />}
              <b className="text-[12px] text-[#17101f]">{m.label}</b>
              {m.subject && <span className="font-semibold text-[#4c4459]">{m.subject}</span>}
              <time className="ml-auto">{stamp(m.at)}</time>
            </header>
            <div className="px-3.5 py-2.5 text-[13px] leading-relaxed text-[#4c4459] whitespace-pre-line">
              {m.text || <span className="italic text-[#9b8ec4]">No message text.</span>}
            </div>
          </article>
        ))}
      </div>
    </>
  )
}

function Empty({ sentTotal }: { sentTotal: number | null }) {
  // ⚠️ THE EMPTY SCREEN SAYS WHY, and only what is known: `sent_total` 0 = nothing has gone
  // out; > 0 = emails are out and nobody has answered yet; null = we don't know, so no claim.
  const nothingSent = sentTotal === 0
  return (
    <div className="flex-1 grid place-items-center px-5 py-12 text-center" data-testid="inbox-empty">
      <div className="max-w-[420px]">
        <div className="w-[52px] h-[52px] rounded-2xl bg-[#f3ecff] text-[#7C3AED] grid place-items-center mx-auto mb-3.5"><InboxIcon className="w-6 h-6" /></div>
        <h2 className="text-[16px] font-bold text-[#17101f] mb-1.5">
          {nothingSent ? 'No replies yet, because no emails have gone out' : 'No replies yet'}
        </h2>
        <p className="text-[13px] text-[#6b6187] leading-relaxed mb-3.5">
          {nothingSent
            ? 'Nothing is sent until your programme is live.'
            : sentTotal !== null
              ? 'Your emails are going out. Every reply lands here, and we answer it for you.'
              : 'Every reply lands here, and we answer it for you.'}
        </p>
        {nothingSent && (
          <>
            <ol className="text-left bg-[#faf8ff] border border-[#e7e3ec] rounded-xl px-3.5 py-3 mb-3.5 flex flex-col gap-2 text-[12.5px] text-[#4c4459]">
              {['You approve your programme.', 'It goes live and your emails start going out.', 'Every reply lands here. We answer it and book the meeting.'].map((s, i) => (
                <li key={i} className="flex gap-2.5"><span className="w-[18px] h-[18px] rounded-full bg-[#f3ecff] text-[#5b21b6] text-[10px] font-extrabold grid place-items-center shrink-0 mt-px">{i + 1}</span>{s}</li>
              ))}
            </ol>
            <Link href="/milla/programme" className="inline-block bg-[#7C3AED] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold">Go to your programme</Link>
          </>
        )}
      </div>
    </div>
  )
}
