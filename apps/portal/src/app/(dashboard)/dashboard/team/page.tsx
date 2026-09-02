'use client'

// The `/dashboard/team` route. The component moved to `components/TeamsHub.tsx` on 1 Sep so
// that `/milla/teams` could render the SAME component with truthful labels — Next.js forbids
// a page file from exporting anything but the route itself, which is the only reason for the
// move. Behaviour here is unchanged: no prop passed = the legacy labels this page always had.
import TeamsHub from '@/components/TeamsHub'

export default function TeamsHubPage() {
  return <TeamsHub />
}
