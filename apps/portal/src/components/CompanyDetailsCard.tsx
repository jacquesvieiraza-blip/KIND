'use client'

// #615 — YOUR COMPANY DETAILS, AND WHY WE ASK FOR THEM.
//
// Founder-ruled 4 Aug: *"as part of onboarding we capture their company information in
// documents section… all clients."*
//
// ⚠️ THIS IS NOT ADMIN PAPERWORK AND THE COPY SAYS SO. We are a UK Ltd. For a BUSINESS customer
// the place of supply is where the customer belongs, so an overseas business is outside UK VAT
// — but only if we hold proof they are a business. **Without a registration number on file, the
// correct treatment is to charge VAT.** A client who does not understand why we are asking
// skips the form; a client who is told it keeps 20% off their invoice fills it in.
//
// The "not registered" tick is a real answer, not an escape hatch: a sole trader under the
// threshold genuinely has no number, and forcing one would make them invent it — and an
// invented tax ID is worse than a blank, because it looks like evidence so nobody chases it.

import { useState } from 'react'
import { api } from '@/lib/api'
import { createClient } from '@/lib/supabase/client'

type Props = {
  initial?: { company_name?: string | null; company_registration?: string | null; vat_number?: string | null }
  onSaved?: () => void
}

const NOT_REGISTERED = 'NOT_REGISTERED'

export default function CompanyDetailsCard({ initial, onSaved }: Props) {
  const already = String(initial?.vat_number ?? '')
  const [name, setName] = useState(initial?.company_name ?? '')
  const [reg, setReg] = useState(initial?.company_registration ?? '')
  const [vat, setVat] = useState(already === NOT_REGISTERED ? '' : already)
  const [notReg, setNotReg] = useState(already === NOT_REGISTERED)
  const [errors, setErrors] = useState<string[]>([])
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true); setErrors([]); setSaved(false)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setErrors(['Your session expired — sign in again.']); return }
      const r = await api.post<{ success: boolean; errors?: string[]; error?: string }>(
        '/clients/company-details',
        { company_name: name, company_registration: reg, vat_number: notReg ? '' : vat, not_vat_registered: notReg },
        session.access_token,
      )
      if (!r?.success) { setErrors(r?.errors ?? [r?.error ?? 'Could not save your details.']); return }
      setSaved(true)
      onSaved?.()
    } catch (e) {
      setErrors([e instanceof Error ? e.message : 'Could not save your details.'])
    } finally { setBusy(false) }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#ece5fb] p-5">
      <h3 className="text-[15px] font-bold text-[#1f1235]">Your company details</h3>
      <p className="text-[13px] text-[#5c5279] mt-1 leading-relaxed max-w-[62ch]">
        These go on your invoices. Your registration number is what shows you are a business rather than an
        individual — <b>without it we have to add VAT</b>, so this is worth two minutes.
      </p>

      <div className="mt-4 space-y-3">
        <label className="block">
          <span className="text-[12.5px] font-semibold text-[#3f3560] block mb-1">Company legal name</span>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="The name on your registration, not a trading name"
            className="w-full text-[13.5px] border border-[#e4dcf7] rounded-xl px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-[#3f3560] block mb-1">Company registration number</span>
          <input value={reg} onChange={e => setReg(e.target.value)}
            placeholder="e.g. 12345678"
            className="w-full text-[13.5px] border border-[#e4dcf7] rounded-xl px-3 py-2" />
        </label>

        <label className="block">
          <span className="text-[12.5px] font-semibold text-[#3f3560] block mb-1">VAT / tax registration number</span>
          <input value={vat} onChange={e => setVat(e.target.value)} disabled={notReg}
            placeholder={notReg ? 'Not registered' : 'e.g. GB123456789'}
            className="w-full text-[13.5px] border border-[#e4dcf7] rounded-xl px-3 py-2 disabled:bg-[#f8f6fd] disabled:text-[#9b8ec4]" />
        </label>

        <label className="flex items-start gap-2 cursor-pointer">
          <input type="checkbox" checked={notReg} onChange={e => { setNotReg(e.target.checked); if (e.target.checked) setVat('') }}
            className="mt-0.5" />
          <span className="text-[12.5px] text-[#5c5279] leading-relaxed">
            We are <b>not</b> VAT or tax registered.
            <span className="block text-[11.5px] text-[#8579a8]">
              Tick this if you genuinely have no number — a sole trader under the threshold, for example. It is a real
              answer and we record it as one. Please do not invent a number.
            </span>
          </span>
        </label>
      </div>

      {errors.length > 0 && (
        <ul className="mt-3 space-y-1">
          {errors.map((e, i) => <li key={i} className="text-[12.5px] text-red-700 leading-relaxed">{e}</li>)}
        </ul>
      )}
      {saved && errors.length === 0 && (
        <p className="text-[12.5px] font-semibold text-emerald-700 mt-3">Saved — thank you. These now appear on your invoices.</p>
      )}

      <button onClick={save} disabled={busy}
        className="mt-4 bg-[#7C3AED] hover:bg-[#6D28D9] text-white rounded-xl px-4 py-2 text-[13.5px] font-bold disabled:opacity-60">
        {busy ? 'Saving…' : 'Save company details'}
      </button>
    </div>
  )
}
