'use client'

/**
 * THE SELLER RAMP (#654) — what a seller sees instead of a wall of zeros.
 *
 * Founder, 16 Aug: *"getting someone to sign up to sell is easy. keeping them enagged and
 * selling is another thing."*
 *
 * The problem this solves is specific. A commission-only seller's only scoreboard is money,
 * and money takes about six weeks — so for six weeks every screen says $0.00, which reads as
 * failure even when they are doing everything right. This puts the work they CONTROL at the
 * top of the page: people named, asks sent, conversations had, demos booked. The earnings
 * take over once the first client is live.
 *
 * ⚠️ R40 — A NOTEBOOK, NEVER LEAD-GEN. Every contact here is typed by the seller about
 * somebody they already know. Nothing on this page sources, suggests or enriches a name, and
 * nothing may be added that does. The operator sees her counts; he never sees these names.
 */

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Check, Lock, Plus, MessageSquare, Phone, CalendarCheck, ChevronDown, Loader2 } from 'lucide-react'

type Gate = {
  id: string; title: string; why: string
  progress: { done: number; target: number }
  complete: boolean; current: boolean
}
type Counts = { contacts: number; asksSent: number; conversations: number; demosBooked: number; clientsLive: number }
type Contact = {
  id: string; name: string; company: string | null; note: string | null
  ask_sent_at: string | null; conversation_at: string | null; demo_booked_at: string | null
}
type PlaybookEntry = { id: string; gate: string; title: string; purpose: string; body: string; watchOut: string }

async function token() {
  const { data } = await createClient().auth.getSession()
  return data.session?.access_token
}

export function SellerRamp({ onComplete }: { onComplete?: (complete: boolean) => void }) {
  const [gates, setGates] = useState<Gate[]>([])
  const [counts, setCounts] = useState<Counts | null>(null)
  const [complete, setComplete] = useState(false)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [playbook, setPlaybook] = useState<PlaybookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [openWords, setOpenWords] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const t = await token()
      const [ramp, list, words] = await Promise.all([
        api.get<{ data: { gates: Gate[]; complete: boolean; counts: Counts } }>('/partners/me/ramp', t),
        api.get<{ data: Contact[] }>('/partners/me/contacts', t),
        api.get<{ data: PlaybookEntry[] }>('/partners/me/playbook', t),
      ])
      setGates(ramp.data.gates); setCounts(ramp.data.counts); setComplete(ramp.data.complete)
      setContacts(list.data ?? []); setPlaybook(words.data ?? [])
      onComplete?.(ramp.data.complete)
    } catch {
      // The ramp is an aid, not the product. If it cannot load, her earnings page must still
      // work — so this fails quiet rather than taking the screen down.
      setGates([])
    }
    setLoading(false)
  }, [onComplete])

  useEffect(() => { void load() }, [load])

  async function addContact(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true); setError('')
    try {
      await api.post('/partners/me/contacts', { name: name.trim(), company: company.trim() }, await token())
      setName(''); setCompany('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add them')
    }
    setBusy(false)
  }

  async function stamp(contact: Contact, event: 'ask' | 'conversation' | 'demo') {
    setError('')
    try {
      await api.patch(`/partners/me/contacts/${contact.id}`, { event }, await token())
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save that')
    }
  }

  if (loading) {
    return <div className="rounded-2xl border border-[#e7e2ef] bg-white p-6 mb-6 text-sm text-[#7b7190]">
      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading your ramp…
    </div>
  }
  if (!gates.length) return null

  const currentGate = gates.find(g => g.current)
  const wordsForGate = playbook.filter(p => p.gate === (currentGate?.id ?? ''))

  // Once the first client is live the ramp has done its job — it collapses to one line so the
  // earnings lead the page again.
  if (complete) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-3.5 mb-6 flex items-center gap-3">
        <Check className="w-4 h-4 text-emerald-700 shrink-0" />
        <p className="text-[13.5px] text-emerald-900">
          <strong>Ramp complete.</strong> {counts?.contacts ?? 0} people named · {counts?.demosBooked ?? 0} demos booked ·
          your first client is live. Keep asking each client you land for one introduction — that is what refills the list.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-[#e7e2ef] bg-white p-5 mb-6">
      <div className="flex items-baseline gap-3 flex-wrap mb-1">
        <h2 className="text-[16px] font-bold text-[#1E0A5C]">Your first 30 days</h2>
        <p className="text-[12.5px] text-[#9B8EC4]">Money takes a few weeks. This is the work that gets you there.</p>
      </div>

      {/* the scoreboard she controls */}
      <div className="grid gap-2 my-4" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))' }}>
        <Score label="People named" value={counts?.contacts ?? 0} />
        <Score label="Asks sent" value={counts?.asksSent ?? 0} />
        <Score label="Conversations" value={counts?.conversations ?? 0} />
        <Score label="Demos booked" value={counts?.demosBooked ?? 0} />
      </div>

      {/* the gates */}
      <div className="space-y-2">
        {gates.map((g, i) => (
          <div key={g.id} className={`rounded-xl border px-4 py-3 ${
            g.current ? 'border-[#c4b5fd] bg-[#faf7ff]' : g.complete ? 'border-emerald-100 bg-emerald-50/40' : 'border-[#f0ecfa] opacity-70'}`}>
            <div className="flex items-center gap-2.5">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold ${
                g.complete ? 'bg-emerald-600 text-white' : g.current ? 'bg-[#7C3AED] text-white' : 'bg-[#ece7f8] text-[#a9a1ba]'}`}>
                {g.complete ? <Check className="w-3.5 h-3.5" /> : g.current ? i + 1 : <Lock className="w-3 h-3" />}
              </span>
              <span className="text-[13.5px] font-semibold text-[#1E0A5C] flex-1">{g.title}</span>
              <span className="text-[12px] tabular-nums text-[#9B8EC4]">{g.progress.done}/{g.progress.target}</span>
            </div>
            {g.current && <p className="text-[12.5px] text-[#6b6383] leading-relaxed mt-2 ml-8.5">{g.why}</p>}
          </div>
        ))}
      </div>

      {/* the words, at the gate that needs them */}
      {wordsForGate.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a9a1ba]">What to say</p>
          {wordsForGate.map(w => (
            <div key={w.id} className="border border-[#ece7f8] rounded-xl overflow-hidden">
              <button type="button" onClick={() => setOpenWords(openWords === w.id ? null : w.id)}
                className="w-full text-left px-4 py-2.5 flex items-center gap-2 hover:bg-[#faf7ff]">
                <span className="text-[13px] font-semibold text-[#1E0A5C] flex-1">{w.title}</span>
                <ChevronDown className={`w-4 h-4 text-[#a9a1ba] transition-transform ${openWords === w.id ? 'rotate-180' : ''}`} />
              </button>
              {openWords === w.id && (
                <div className="px-4 pb-4 pt-1">
                  <p className="text-[12px] text-[#9B8EC4] mb-2">{w.purpose}</p>
                  <pre className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed text-[#2c2440] bg-[#faf7ff] rounded-lg p-3 border border-[#f0ecfa]">{w.body}</pre>
                  <p className="text-[12px] text-[#b9781f] bg-[#fdf3e2] rounded-lg px-3 py-2 mt-2"><strong>Watch out:</strong> {w.watchOut}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* her list */}
      <div className="mt-5">
        <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#a9a1ba] mb-2">
          Your list <span className="font-semibold normal-case tracking-normal text-[#c4b5fd]">— people you already know. Only you can see these.</span>
        </p>
        <form onSubmit={addContact} className="flex flex-wrap gap-2 mb-3">
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name"
            className="flex-1 min-w-[140px] border border-purple-100/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
          <input value={company} onChange={e => setCompany(e.target.value)} placeholder="Company (optional)"
            className="flex-1 min-w-[140px] border border-purple-100/80 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30" />
          <button type="submit" disabled={busy || !name.trim()}
            className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2 text-sm disabled:opacity-50 flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
        {error && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2 mb-3">{error}</p>}

        {contacts.length === 0 ? (
          <p className="text-[13px] text-[#9B8EC4] py-3">Nobody yet. Start with the easiest name you can think of — the list gets faster after the first three.</p>
        ) : (
          <div className="divide-y divide-[#f4f1fb] border border-[#f0ecfa] rounded-xl overflow-hidden">
            {contacts.map(c => (
              <div key={c.id} className="px-3.5 py-2.5 flex items-center gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                  <p className="text-[13.5px] font-semibold text-[#1E0A5C] truncate">{c.name}</p>
                  {c.company && <p className="text-[12px] text-[#9B8EC4] truncate">{c.company}</p>}
                </div>
                <Stamp done={!!c.ask_sent_at} onClick={() => stamp(c, 'ask')} icon={<MessageSquare className="w-3.5 h-3.5" />} label="Asked" />
                <Stamp done={!!c.conversation_at} onClick={() => stamp(c, 'conversation')} icon={<Phone className="w-3.5 h-3.5" />} label="Spoke" />
                <Stamp done={!!c.demo_booked_at} onClick={() => stamp(c, 'demo')} icon={<CalendarCheck className="w-3.5 h-3.5" />} label="Demo" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Score({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-[#faf7ff] border border-[#f0ecfa] px-3.5 py-2.5">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#a9a1ba]">{label}</p>
      <p className="text-[20px] font-extrabold text-[#1E0A5C] tabular-nums">{value}</p>
    </div>
  )
}

function Stamp({ done, onClick, icon, label }: { done: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick} disabled={done} title={done ? `${label} — recorded` : `Mark as ${label.toLowerCase()}`}
      className={`text-[11.5px] font-bold rounded-full px-2.5 py-1 flex items-center gap-1 shrink-0 ${
        done ? 'bg-emerald-50 text-emerald-700 cursor-default' : 'bg-[#f3ecff] text-[#7C3AED] hover:bg-[#e9dcff]'}`}>
      {done ? <Check className="w-3 h-3" /> : icon} {label}
    </button>
  )
}
