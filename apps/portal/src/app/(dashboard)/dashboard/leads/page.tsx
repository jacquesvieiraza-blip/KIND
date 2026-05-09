import { Users, TrendingUp, ShieldCheck, Download } from 'lucide-react'

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Lead Generation</h1>
        <p className="text-gray-500 text-sm mt-1">Precision-targeted B2B leads, AI-scored and POPIA-compliant.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: '-', icon: <Users className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Avg Score', value: '-', icon: <TrendingUp className="w-5 h-5" />, color: 'bg-indigo-50 text-indigo-600' },
          { label: 'POPIA Consented', value: '-', icon: <ShieldCheck className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
          { label: 'Exported', value: '-', icon: <Download className="w-5 h-5" />, color: 'bg-purple-50 text-purple-600' },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>{icon}</div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Lead Pipeline</h2>
          <span className="text-xs text-brand-500 font-medium bg-brand-50 px-2.5 py-1 rounded-full">Week 2 Build</span>
        </div>
        <div className="text-center py-12 text-gray-400">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">ICP Builder and lead pipeline coming in Week 2.</p>
        </div>
      </div>
    </div>
  )
}
