export const dynamic = 'force-dynamic'

import { FileText, CheckCircle } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface Proposal {
  id: string
  title: string
  status: string
  recipient_email: string | null
  recipient_name: string | null
  sent_at: string | null
  signed_at: string | null
  created_at: string
  clients: { company_name: string } | null
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  draft:  { label: 'Draft',  className: 'bg-gray-100 text-gray-600' },
  sent:   { label: 'Sent',   className: 'bg-blue-100 text-blue-700' },
  viewed: { label: 'Viewed', className: 'bg-amber-100 text-amber-700' },
  signed: { label: 'Signed', className: 'bg-green-100 text-green-700' },
}

async function getProposals(): Promise<Proposal[]> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data } = await supabase
      .from('proposals')
      .select('id, title, status, recipient_email, recipient_name, sent_at, signed_at, created_at, clients(company_name)')
      .order('created_at', { ascending: false })
      .limit(200)
    return (data ?? []) as unknown as Proposal[]
  } catch { return [] }
}

function formatDate(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function AdminProposalsPage() {
  const proposals = await getProposals()

  const signed = proposals.filter(p => p.status === 'signed').length
  const sent = proposals.filter(p => p.status === 'sent' || p.status === 'viewed').length

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <FileText className="w-6 h-6 text-purple-600" />
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
        </div>
        <p className="text-sm text-gray-500">All client proposals across the platform</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <p className="text-2xl font-bold text-gray-900">{proposals.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Total proposals</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <p className="text-2xl font-bold text-blue-700">{sent}</p>
          <p className="text-xs text-gray-500 mt-0.5">Sent / viewed</p>
        </div>
        <div className="bg-white rounded-xl border border-purple-100 p-5 shadow-sm">
          <p className="text-2xl font-bold text-green-700">{signed}</p>
          <p className="text-xs text-gray-500 mt-0.5">Signed</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-purple-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-purple-100">
          <h2 className="font-semibold text-gray-900 text-sm">All Proposals</h2>
        </div>

        {proposals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <FileText className="w-8 h-8 text-purple-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No proposals yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-purple-50/50">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Recipient</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sent</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Signed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-50">
                {proposals.map(p => {
                  const meta = STATUS_META[p.status] ?? STATUS_META.draft
                  return (
                    <tr key={p.id} className="hover:bg-purple-50/30 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-gray-900 text-xs">
                        {p.clients?.company_name ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-gray-700 max-w-xs truncate">{p.title}</td>
                      <td className="px-5 py-3.5 text-gray-500 text-xs">
                        <div>{p.recipient_name ?? '—'}</div>
                        {p.recipient_email && <div className="text-gray-400">{p.recipient_email}</div>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${meta.className}`}>
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-400 text-xs">{formatDate(p.sent_at)}</td>
                      <td className="px-5 py-3.5 text-xs">
                        {p.signed_at ? (
                          <span className="flex items-center gap-1 text-green-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                            {formatDate(p.signed_at)}
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
