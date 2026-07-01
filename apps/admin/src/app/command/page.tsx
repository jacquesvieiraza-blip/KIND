import { Gauge } from 'lucide-react'

// Placeholder — the full Command Centre (per-AE + per-partner: targets · 3× pipeline
// · mini-CRM · contracts) ships in the next slice (#274). Spec: docs/admin-centre-spec.md.
export default function CommandCentrePage() {
  return (
    <div className="px-8 py-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7C3AED] flex items-center justify-center">
          <Gauge className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🎖️ Command Centre</h1>
          <p className="text-sm text-gray-500 mt-0.5">Per-AE + per-partner oversight — the same cockpit shape, for our team and partners.</p>
        </div>
      </div>
      <div className="bg-gradient-to-br from-purple-50 to-white border border-purple-100 rounded-2xl p-6">
        <span className="inline-block text-[10px] font-bold uppercase tracking-wide text-[#a78bfa] bg-[#7C3AED]/15 rounded-full px-2 py-0.5 mb-3">coming soon</span>
        <p className="text-sm text-gray-700 leading-relaxed">
          Building now (#274). Each AE + partner will show: <b>book MRR + commission</b> · <b>targets</b> (monthly / quarter / annual) with tracking ·
          <b> pipeline + 3× coverage</b> · a <b>mini-CRM</b> of open deals · plays (what&apos;s working / not) · and a <b>contracts &amp; docs vault</b>.
          AEs = read + manage (+ add team member); partners = read-only oversight.
        </p>
        <p className="text-xs text-gray-400 mt-3">Full spec: <code className="bg-purple-50 px-1 rounded">docs/admin-centre-spec.md</code></p>
      </div>
    </div>
  )
}
