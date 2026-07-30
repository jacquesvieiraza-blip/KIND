'use client'

// ADD A MAILBOX — #547/#552/#553.
//
// ── THE GAP THIS FILLS, and it only shows up when you try to use the page ────────────────
//
// The only control that created an inbox row was **"Assign pooled inbox"**, and it renders
// *inside* the "Cannot send" card — a list built by filtering for clients that **cannot
// send**. So the moment mailbox #1 is saved with working credentials, the client leaves that
// list and the button **disappears with three mailboxes still to add.**
//
// A control that removes itself the instant it half-succeeds. Same shape as the migration
// card that hid once the first migration had run, and the reason tomorrow's four Google
// boxes could not have been entered without this.
//
// It also could not set `provider`, `daily_cap`, or a status of the operator's choosing —
// `/inboxes/assign` hardcodes `active`, `/inboxes/brand` hardcodes `warming`, so *which
// endpoint you called* decided the state. Here it is a field, like everything else.
//
// ── THE PASSWORD ─────────────────────────────────────────────────────────────────────────
//
// Typed once, POSTed once, encrypted server-side with the existing `INBOX_SECRET_KEY`
// scheme, and **never read back** — the API does not return it, in plaintext or ciphertext.
// It is cleared from this form the moment the save succeeds so it cannot sit in a React tree
// waiting for a screen-share. With the key unset the API **refuses and writes nothing**,
// which is stated here before you type rather than discovered on submit.

import { useEffect, useState } from 'react'

type Client = { id: string; company_name: string | null; is_demo?: boolean; house_or_demo?: boolean }
type Saved = { id: string; email: string; kind: string; status: string; provider: string | null; warmup_ready_at: string | null }

const FIELD = 'w-full text-[12.5px] border border-[#ece5fb] rounded-lg px-2.5 py-1.5 bg-white outline-none focus:border-[#7C3AED]'
const LABEL = 'block text-[11px] font-bold uppercase tracking-wide text-[#9b8ec4] mb-1'

const BLANK = {
  email: '', kind: 'branded', provider: 'google-smtp', status: 'warming',
  daily_cap: '30', warmup_days: '21',
  smtp_host: 'smtp.gmail.com', smtp_port: '587', smtp_secure: false,
  smtp_user: '', smtp_pass: '', from_name: '',
}

export default function AddMailbox({ secretKeySet, onSaved }: { secretKeySet?: boolean; onSaved?: () => void }) {
  const [clients, setClients] = useState<Client[] | null>(null)
  const [clientsErr, setClientsErr] = useState<string | null>(null)
  const [clientId, setClientId] = useState('')
  const [f, setF] = useState({ ...BLANK })
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState<Saved[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/proxy/operator/clients')
      .then(r => r.json())
      .then(j => {
        if (!j?.success) throw new Error(j?.error || 'Could not load clients')
        setClients(j.data as Client[])
      })
      .catch(e => setClientsErr(e instanceof Error ? e.message : 'Could not load clients'))
  }, [])

  const set = (k: keyof typeof BLANK, v: string | boolean) => setF(p => ({ ...p, [k]: v }))

  // Port and encryption are not independent — 465 is implicit TLS, 587 is STARTTLS — and
  // mismatching them makes an SMTP connection HANG rather than fail, which reads as a dead
  // product rather than a wrong setting. Moving the port moves the toggle with it.
  const setPort = (v: string) => setF(p => ({ ...p, smtp_port: v, smtp_secure: v.trim() === '465' }))

  // Partial credentials are refused by the API and stated here first: a mailbox with two of
  // the three reads as "saved" on the board and still cannot send (#552).
  const credCount = [f.smtp_host.trim(), f.smtp_user.trim(), f.smtp_pass].filter(Boolean).length
  const partialCreds = credCount > 0 && credCount < 3
  const canSave = !!clientId && f.email.includes('@') && !partialCreds && !busy

  async function save() {
    setBusy(true); setError(null)
    try {
      const r = await fetch('/api/proxy/operator/inboxes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...f }),
      })
      const j = await r.json()
      if (!j?.success) { setError(j?.error || `The mailbox was not saved (${r.status}).`); return }
      setSaved(s => [...s, j.data as Saved])
      // Keep the client and the connection settings — four Google boxes on one client differ
      // only by address and username, and re-typing the host four times invites a typo on
      // the fourth. The PASSWORD is always cleared: it is different every time and must not
      // linger in the form.
      setF(p => ({ ...p, email: '', smtp_user: '', smtp_pass: '', from_name: '' }))
      onSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The request failed and gave no reason.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#ece5fb] p-4 mt-4">
      <b className="text-[13px] text-[#1f1235] block">Add a mailbox</b>
      <p className="text-[11.5px] text-[#5c5279] mt-0.5 leading-relaxed">
        Records a sending mailbox and its SMTP details in one go, for <b>any</b> client and as many times as you
        need — the old &ldquo;Assign pooled inbox&rdquo; button only appeared for clients who could <i>not</i> send, so it
        vanished after the first mailbox worked. The password is encrypted before it is stored and is never
        readable again from anywhere in the product.
      </p>

      {secretKeySet === false && (
        <p className="text-[11.5px] font-semibold text-red-800 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3 leading-relaxed">
          <b>INBOX_SECRET_KEY is not set on the API.</b> A mailbox password cannot be encrypted, and it will never be
          stored unencrypted — so saving one here will be refused and <b>nothing will be written</b>. Set it in
          Railway → @kind/api → Variables (<code className="px-1 bg-white rounded border border-red-200">openssl rand -hex 32</code>),
          then come back. You can still record an address with no SMTP details in the meantime.
        </p>
      )}

      {clientsErr && (
        <p className="text-[11.5px] font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mt-3">
          Could not load the client list: {clientsErr}
        </p>
      )}

      <div className="grid gap-2.5 sm:grid-cols-3 mt-3">
        <div className="sm:col-span-3">
          <label className={LABEL}>Client</label>
          <select value={clientId} onChange={ev => setClientId(ev.target.value)} className={FIELD}>
            <option value="">{clients ? 'Choose a client…' : 'Loading clients…'}</option>
            {(clients ?? []).map(c => (
              <option key={c.id} value={c.id}>
                {c.company_name || 'Unnamed client'}{c.is_demo || c.house_or_demo ? ' · demo/house' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2">
          <label className={LABEL}>Mailbox address</label>
          <input value={f.email} onChange={ev => set('email', ev.target.value)} placeholder="jacques@get-kind.com" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>From name</label>
          <input value={f.from_name} onChange={ev => set('from_name', ev.target.value)} placeholder="Jacques" className={FIELD} />
        </div>

        <div>
          <label className={LABEL}>Kind</label>
          <select value={f.kind} onChange={ev => set('kind', ev.target.value)} className={FIELD}>
            <option value="branded">branded — their own domain</option>
            <option value="pooled">pooled — ours, lent out</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Provider (label only)</label>
          <input value={f.provider} onChange={ev => set('provider', ev.target.value)} placeholder="google-smtp" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <select value={f.status} onChange={ev => set('status', ev.target.value)} className={FIELD}>
            <option value="warming">warming — must not send yet</option>
            <option value="active">live — may send</option>
          </select>
        </div>

        <div>
          <label className={LABEL}>SMTP host</label>
          <input value={f.smtp_host} onChange={ev => set('smtp_host', ev.target.value)} placeholder="smtp.gmail.com" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>Port</label>
          <select value={f.smtp_port} onChange={ev => setPort(ev.target.value)} className={FIELD}>
            <option value="587">587 — STARTTLS</option>
            <option value="465">465 — implicit TLS</option>
          </select>
        </div>
        <div>
          <label className={LABEL}>Daily cap</label>
          <input value={f.daily_cap} onChange={ev => set('daily_cap', ev.target.value)} placeholder="blank = no cap" className={FIELD} />
        </div>

        <div>
          <label className={LABEL}>SMTP username</label>
          <input value={f.smtp_user} onChange={ev => set('smtp_user', ev.target.value)} placeholder="usually the full address" className={FIELD} />
        </div>
        <div>
          <label className={LABEL}>SMTP password</label>
          <input type="password" value={f.smtp_pass} onChange={ev => set('smtp_pass', ev.target.value)}
            placeholder="Google app password" className={FIELD} autoComplete="new-password" />
        </div>
        {f.status === 'warming' && (
          <div>
            <label className={LABEL}>Warm-up days</label>
            <input value={f.warmup_days} onChange={ev => set('warmup_days', ev.target.value)} className={FIELD} />
          </div>
        )}
      </div>

      <p className="text-[11px] text-[#5c5279] mt-2 leading-relaxed">
        Google and Microsoft both refuse an ordinary account password over SMTP — you need an <b>app password</b>,
        generated in the mailbox&apos;s own security settings. Warm-up days default to <b>21</b> for a box bought
        today with no reputation (the client SOP&apos;s 14 is for a mailbox a vendor pre-warmed). That date is a{' '}
        <b>reminder, not permission</b> — the <b>#553 ladder</b> decides when a mailbox may send: a test send that
        lands in a real inbox, mail-tester ≥9/10, cap on.
      </p>

      {partialCreds && (
        <p className="text-[11.5px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-2">
          SMTP details must be complete — <b>host, username and password</b>. A mailbox with only some of them looks
          saved on the board and still cannot send. Fill all three, or clear all three and add them later.
        </p>
      )}

      <div className="flex gap-2 mt-3">
        <button onClick={save} disabled={!canSave}
          className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-lg px-3.5 py-2 text-[12.5px] font-bold disabled:opacity-40">
          {busy ? 'Saving…' : 'Save mailbox'}
        </button>
        {saved.length > 0 && (
          <span className="text-[11.5px] text-[#5c5279] self-center">
            {saved.length} added this session — the address and password boxes clear so you can add the next one.
          </span>
        )}
      </div>

      {error && (
        <div className="border border-red-300 bg-red-50 rounded-lg px-3 py-2.5 mt-3">
          <b className="text-[12.5px] text-red-900 block">The mailbox was not saved.</b>
          <p className="text-[11.5px] text-red-800 mt-0.5 leading-relaxed">{error}</p>
        </div>
      )}

      {saved.length > 0 && (
        <ul className="mt-3 space-y-1">
          {saved.map(s => (
            <li key={s.id} className="text-[11.5px] text-[#1f1235] border border-emerald-200 bg-emerald-50 rounded-lg px-3 py-1.5">
              <b>{s.email}</b> — {s.kind} · {s.provider || 'no provider'} · <b>{s.status}</b>
              {s.warmup_ready_at && <> · warm-up reminder {new Date(s.warmup_ready_at).toDateString()}</>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
