export const dynamic = 'force-dynamic'

import Link from 'next/link'

const API_URL = process.env.API_URL || 'https://kindapi-production.up.railway.app'
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

interface PendingICP {
  id: string
  industries: string[]
  job_titles: string[]
  company_sizes: string[]
  locations: string[]
  keywords: string[]
  created_at: string
  clients: { company_name: string } | null
}

async function getPendingIcps(): Promise<PendingICP[]> {
  if (!ADMIN_SECRET) return []
  try {
    const res = await fetch(`${API_URL}/admin-api/icps/pending`, {
      headers: { 'x-admin-secret': ADMIN_SECRET },
      cache: 'no-store',
    })
    if (!res.ok) return []
    const data = await res.json() as { data: PendingICP[] }
    return data.data ?? []
  } catch {
    return []
  }
}

export default async function IcpReviewPage() {
  const icps = await getPendingIcps()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ICP Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">{icps.length} awaiting approval</p>
      </div>

      {icps.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400 text-sm">
          No ICPs pending review 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {icps.map((icp) => (
            <div key={icp.id} className="bg-white rounded-xl border border-amber-100 p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900">
                    {icp.clients?.company_name ?? 'Unknown Client'}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Submitted {new Date(icp.created_at).toLocaleDateString('en-ZA')}
                  </p>
                </div>
                <Link
                  href={`/clients/${icp.id.split('-')[0]}`}
                  className="text-xs text-blue-600 hover:underline"
                >
                  View Client
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-gray-600 mb-4">
                <div>
                  <p className="text-gray-400 mb-0.5">Industries</p>
                  <p>{icp.industries.join(', ')}</p>
                </div>
                <div>
                  <p className="text-gray-400 mb-0.5">Job Titles</p>
                  <p>{icp.job_titles.join(', ')}</p>
                </div>
                {icp.locations.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-0.5">Locations</p>
                    <p>{icp.locations.join(', ')}</p>
                  </div>
                )}
                {icp.company_sizes.length > 0 && (
                  <div>
                    <p className="text-gray-400 mb-0.5">Company Sizes</p>
                    <p>{icp.company_sizes.join(', ')}</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-gray-500">
                Review this ICP from the{' '}
                <Link href="/clients" className="text-blue-600 hover:underline">
                  client&apos;s detail page → ICPs tab
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
