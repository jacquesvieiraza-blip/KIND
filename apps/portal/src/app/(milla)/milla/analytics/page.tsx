'use client'

// Milla-native — renders the REAL analytics page inside the Milla shell (no old-portal chrome,
// no exit). Same data + functionality, Milla frame. Rail links point here, not /dashboard.
import SourcePage from '@/app/(dashboard)/dashboard/analytics/page'

export default function MillaNative_analytics() {
  return (
    <div className="h-full overflow-y-auto p-5 sm:p-6">
      <SourcePage />
    </div>
  )
}
