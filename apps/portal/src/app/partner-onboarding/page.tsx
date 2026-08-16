'use client'

/**
 * PARTNER ONBOARDING (R42, founder-ruled 16 Aug) — the page an invited partner lands on.
 *
 * His flow, in his words: *"i create the partner seat. it should send them an email notifying
 * them. they then sign up and complete their information pack. this renders all docs. they
 * sign. i recieve docs i sign and they then go live on partner."*
 *
 * What this replaces: nothing. A seat used to be created silently and the person was never
 * told it existed — the only way in was a "forgot password" nobody had mentioned. And the
 * details their contract is written from were typed by the OPERATOR, about a person who was
 * sitting right there and knows their own address.
 *
 * Four steps, in order, each one gating the next:
 *   1. set a password        — reuses the normal Supabase reset flow; no second auth path
 *   2. your details          — address, country, mobile (the contract's party line)
 *   3. how you get paid      — the agreement promises payment by transfer against an invoice,
 *                              and without this the first payout month is a WhatsApp hunt
 *   4. read and sign         — typed name + tick per document, frozen server-side
 *
 * Nothing here makes anyone live. That is the founder's counter-signature, in Vida.
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { api } from '@/lib/api'
import { Loader2, Check, FileText, ShieldCheck, Landmark, ChevronRight } from 'lucide-react'

type PartnerDoc = {
  id: string; title: string; version: string; updated: string
  signatureRequired: boolean; summary: string; body: string; live?: boolean
}

const MIN_PASSWORD = 8

function OnboardingFlow() {
  const params = useSearchParams()
  const token = params.get('token') ?? ''

  const [checking, setChecking] = useState(true)
  const [invite, setInvite] = useState<{ name: string; email: string; state: string } | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [address, setAddress] = useState('')
  const [country, setCountry] = useState('')
  const [phone, setPhone] = useState('')
  const [payoutMethod, setPayoutMethod] = useState('Wise')
  const [payoutAccount, setPayoutAccount] = useState('')
  const [invoiceName, setInvoiceName] = useState('')

  const [docs, setDocs] = useState<PartnerDoc[]>([])
  const [signedIds, setSignedIds] = useState<string[]>([])
  const [openDoc, setOpenDoc] = useState<PartnerDoc | null>(null)
  const [typedName, setTypedName] = useState('')
  const [agreed, setAgreed] = useState(false)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState(1)
  const [resendSent, setResendSent] = useState(false)

  useEffect(() => {
    let live = true
    ;(async () => {
      const { data } = await createClient().auth.getSession()
      if (!live) return
      setHasSession(!!data.session)
      // A session means she arrived through the invite's action link (or is coming back).
      // She still sets a password first — that is step 1 — so do NOT skip ahead here; the
      // earlier version jumped to step 2 and left her without a password she could reuse.
      if (token) {
        try {
          const res = await api.get<{ success: boolean; data: { name: string; email: string; state: string } }>(`/partners/invite/${token}`)
          if (live) setInvite(res.data)
        } catch (e) {
          if (live) setInviteError(e instanceof Error ? e.message : 'This invitation link is not valid any more.')
        }
      }
      if (live) setChecking(false)
    })()
    return () => { live = false }
  }, [token])

  async function loadDocs() {
    const { data } = await createClient().auth.getSession()
    const t = data.session?.access_token
    const res = await api.get<{ documents: PartnerDoc[] }>('/partners/documents', t)
    setDocs((res.documents ?? []).filter(d => d.signatureRequired))
  }

  // ⚠️ NO SESSION = THE PASSWORD FORM CANNOT WORK. `updateUser` needs one, so showing the
  // form to somebody whose link has expired would fail with "Auth session missing" and leave
  // them stuck on screen one with no way forward. Offer them a fresh link instead — the same
  // reset flow that is already live in the product.
  async function resendLink() {
    if (!invite?.email) { setError('We cannot tell who this invitation is for. Ask for a new one.'); return }
    setBusy(true); setError('')
    try {
      const next = encodeURIComponent(`/partner-onboarding?token=${token}`)
      const { error: err } = await createClient().auth.resetPasswordForEmail(invite.email, {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      })
      if (err) setError(err.message)
      else setResendSent(true)
    } catch {
      setError('We could not send a new link just now. Try again in a moment.')
    }
    setBusy(false)
  }

  async function setPasswordStep(e: React.FormEvent) {
    e.preventDefault(); setError('')
    if (password.length < MIN_PASSWORD) { setError(`Your password needs at least ${MIN_PASSWORD} characters.`); return }
    if (password !== confirm) { setError('Those two passwords do not match.'); return }
    setBusy(true)
    const supabase = createClient()
    const { error: err } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (err) { setError(err.message); return }
    setHasSession(true); setStep(2)
  }

  async function saveDetails(e: React.FormEvent) {
    e.preventDefault(); setError(''); setBusy(true)
    try {
      const { data } = await createClient().auth.getSession()
      await api.put('/partners/me/pack', {
        address, country, phone,
        payout_method: payoutMethod, payout_account: payoutAccount, invoice_name: invoiceName,
      }, data.session?.access_token)
      await loadDocs()
      setStep(4)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details')
    }
    setBusy(false)
  }

  async function signDoc(doc: PartnerDoc) {
    setError('')
    if (!typedName.trim()) { setError('Type your full name to sign.'); return }
    if (!agreed) { setError('Tick the box to confirm you agree to be bound by this document.'); return }
    setBusy(true)
    try {
      const { data } = await createClient().auth.getSession()
      const res = await api.post<{ data: { all_signed: boolean; signed: string[] } }>(
        '/partners/me/sign', { doc_id: doc.id, signed_name: typedName.trim() }, data.session?.access_token)
      setSignedIds(res.data.signed)
      setOpenDoc(null); setTypedName(''); setAgreed(false)
      if (res.data.all_signed) setStep(5)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not record your signature')
    }
    setBusy(false)
  }

  if (checking) {
    return <Shell><p className="text-sm text-[#7B6FA0] text-center py-6"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Checking your invitation…</p></Shell>
  }

  if (inviteError && !hasSession) {
    return (
      <Shell>
        <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">This invitation is not valid</h2>
        <p className="text-sm text-[#7B6FA0] mb-5">{inviteError}</p>
        <a href="/login" className="block w-full text-center bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm">Go to sign in</a>
      </Shell>
    )
  }

  return (
    <Shell wide={step === 4 || step === 5}>
      <Steps step={step} />

      {step === 1 && !hasSession && (
        <>
          <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">Your sign-in link has expired</h2>
          <p className="text-sm text-[#7B6FA0] mb-5">
            Invitation links only work once and time out. Send yourself a fresh one
            {invite?.email ? ` — it goes to ${invite.email}` : ''} and carry on where you left off.
          </p>
          {resendSent
            ? <p className="text-sm text-green-600 font-medium bg-green-50 rounded-xl px-3 py-2.5">New link sent — check your inbox.</p>
            : (
              <>
                {error && <div className="mb-3"><Err>{error}</Err></div>}
                <button onClick={resendLink} disabled={busy}
                  className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
                  {busy ? 'Sending…' : 'Send me a fresh link'}
                </button>
              </>
            )}
        </>
      )}

      {step === 1 && hasSession && (
        <>
          <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">Welcome{invite ? `, ${invite.name}` : ''}</h2>
          <p className="text-sm text-[#7B6FA0] mb-5">Choose a password to get started. You will use it with {invite?.email ?? 'your email address'}.</p>
          <form onSubmit={setPasswordStep} className="space-y-4">
            <Field label="Password"><input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={MIN_PASSWORD} className={INPUT} placeholder="••••••••" /></Field>
            <Field label="Confirm password"><input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={MIN_PASSWORD} className={INPUT} placeholder="••••••••" /></Field>
            {error && <Err>{error}</Err>}
            <Submit busy={busy}>Continue</Submit>
          </form>
        </>
      )}

      {(step === 2 || step === 3) && (
        <form onSubmit={saveDetails} className="space-y-4">
          <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">Your details</h2>
          <p className="text-sm text-[#7B6FA0] mb-2">Your agreement is written from these, so they appear on the contract you sign.</p>
          <Field label="Address"><input value={address} onChange={e => setAddress(e.target.value)} required className={INPUT} placeholder="Street, city, postcode" /></Field>
          <Field label="Country"><input value={country} onChange={e => setCountry(e.target.value)} required className={INPUT} placeholder="South Africa" /></Field>
          <Field label="Mobile"><input value={phone} onChange={e => setPhone(e.target.value)} required className={INPUT} placeholder="+27 ..." /></Field>

          <h3 className="text-base font-bold text-[#1E0A5C] pt-3">How you get paid</h3>
          <p className="text-sm text-[#7B6FA0] -mt-2">Commission is paid monthly, against your invoice, in your local currency.</p>
          <Field label="Method">
            <select value={payoutMethod} onChange={e => setPayoutMethod(e.target.value)} className={INPUT}>
              <option>Wise</option><option>Bank transfer</option>
            </select>
          </Field>
          <Field label={payoutMethod === 'Wise' ? 'Wise email or account' : 'Bank, account number and branch code'}>
            <input value={payoutAccount} onChange={e => setPayoutAccount(e.target.value)} required className={INPUT} placeholder={payoutMethod === 'Wise' ? 'you@example.com' : 'Bank · account · branch'} />
          </Field>
          <Field label="Name to invoice from"><input value={invoiceName} onChange={e => setInvoiceName(e.target.value)} required className={INPUT} placeholder="Your name or company" /></Field>
          {error && <Err>{error}</Err>}
          <Submit busy={busy}>Save and read my documents</Submit>
        </form>
      )}

      {step === 4 && (
        <>
          <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">Read and sign</h2>
          <p className="text-sm text-[#7B6FA0] mb-4">Three documents. Open each one, read it, then sign at the bottom.</p>
          <div className="space-y-2.5">
            {docs.map(d => {
              const done = signedIds.includes(d.id)
              return (
                <button key={d.id} type="button" onClick={() => { setOpenDoc(d); setTypedName(''); setAgreed(false) }}
                  className="w-full text-left flex items-center gap-3 border border-purple-100/80 rounded-xl px-4 py-3 hover:bg-[#faf7ff]">
                  <span className="w-8 h-8 rounded-lg bg-[#f1ebff] text-[#5b21b6] flex items-center justify-center shrink-0">
                    {d.id === 'commission-agreement' ? <FileText className="w-4 h-4" /> : d.id === 'nda' ? <ShieldCheck className="w-4 h-4" /> : <Landmark className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-semibold text-[#1E0A5C]">{d.title}</span>
                    <span className="block text-[12px] text-[#9B8EC4] truncate">{d.summary}</span>
                  </span>
                  {done
                    ? <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 flex items-center gap-1"><Check className="w-3 h-3" /> Signed</span>
                    : <ChevronRight className="w-4 h-4 text-[#c4b5fd]" />}
                </button>
              )
            })}
          </div>
          {error && <div className="mt-4"><Err>{error}</Err></div>}
        </>
      )}

      {step === 5 && (
        <div className="text-center py-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-4"><Check className="w-6 h-6" /></div>
          <h2 className="text-lg font-bold text-[#1E0A5C] mb-1">All signed — thank you</h2>
          <p className="text-sm text-[#7B6FA0]">
            Your documents have gone to K.I.N.D for counter-signature. You will get an email the
            moment your seat is live, with your referral link. Nothing to do until then.
          </p>
        </div>
      )}

      {openDoc && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-start justify-center p-4 sm:p-8 overflow-y-auto"
          role="dialog" aria-modal="true" aria-label={openDoc.title} onClick={() => setOpenDoc(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#eee9f7] sticky top-0 bg-white rounded-t-2xl flex items-start gap-3">
              <div className="min-w-0">
                <h3 className="text-base font-bold text-[#1E0A5C] truncate">{openDoc.title}</h3>
                <p className="text-[12px] text-[#9B8EC4]">Version {openDoc.version}{openDoc.updated ? ` · ${openDoc.updated}` : ''}</p>
              </div>
              <button onClick={() => setOpenDoc(null)} aria-label="Close" className="ml-auto text-[#9B8EC4] hover:text-[#1E0A5C] text-lg leading-none p-1">×</button>
            </div>
            {/* The stored text exactly as stored — no markdown transformation between what a
                person signs and what a person reads. */}
            <div className="px-6 py-5">
              <pre className="whitespace-pre-wrap font-sans text-[13.5px] leading-relaxed text-[#2c2440]">{openDoc.body}</pre>
            </div>
            <div className="px-6 py-5 border-t border-[#eee9f7] space-y-3">
              <Field label="Type your full name to sign">
                <input value={typedName} onChange={e => setTypedName(e.target.value)} className={INPUT} placeholder="Your full name" />
              </Field>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-[#7C3AED] shrink-0" />
                <span className="text-[12.5px] text-gray-600 leading-relaxed">I have read this document and I agree to be bound by it.</span>
              </label>
              <p className="text-[11.5px] text-[#9B8EC4] leading-relaxed">
                Signing here records your typed name and the time, and freezes a copy of exactly
                this text. It is an electronic signature, not a scanned one — and like the rest of
                this pack it has not been reviewed by a lawyer.
              </p>
              {error && <Err>{error}</Err>}
              <button onClick={() => signDoc(openDoc)} disabled={busy}
                className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm disabled:opacity-60">
                {busy ? 'Signing…' : 'Sign this document'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Shell>
  )
}

const INPUT = 'w-full border border-purple-100/80 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/30 focus:border-[#7C3AED]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>
}
function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{children}</p>
}
function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy}
      className="w-full bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-semibold rounded-xl px-4 py-2.5 text-sm transition-colors disabled:opacity-60">
      {busy ? 'Please wait…' : children}
    </button>
  )
}
function Steps({ step }: { step: number }) {
  const labels = ['Password', 'Your details', 'Sign', 'Done']
  const at = step === 1 ? 0 : step <= 3 ? 1 : step === 4 ? 2 : 3
  return (
    <div className="flex items-center gap-1.5 mb-5">
      {labels.map((l, i) => (
        <div key={l} className="flex-1">
          <div className={`h-1 rounded-full ${i <= at ? 'bg-[#7C3AED]' : 'bg-purple-100'}`} />
          <p className={`text-[10.5px] mt-1.5 font-semibold ${i <= at ? 'text-[#7C3AED]' : 'text-[#c4b5fd]'}`}>{l}</p>
        </div>
      ))}
    </div>
  )
}
function Shell({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #FAF0FF 55%, #EDE6FF 100%)' }}>
      <div className={wide ? 'w-full max-w-lg' : 'w-full max-w-sm'}>
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center shadow-lg shadow-purple-500/25">
              <img src="/logo-k.png" alt="K.I.N.D" className="w-full h-full object-contain" />
            </div>
            <span className="text-2xl font-bold text-[#1E0A5C]">K.I.N.D</span>
          </div>
          <p className="text-sm text-[#7B6FA0]">Client Partner onboarding</p>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-purple-100/60 p-8">{children}</div>
      </div>
    </div>
  )
}

export default function PartnerOnboardingPage() {
  return (
    <Suspense fallback={<Shell><p className="text-sm text-[#7B6FA0] text-center py-6">Loading…</p></Shell>}>
      <OnboardingFlow />
    </Suspense>
  )
}
