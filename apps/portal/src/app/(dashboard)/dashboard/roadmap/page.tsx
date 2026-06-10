import { redirect } from 'next/navigation'

// The product roadmap is an internal (admin-only) view — it lists features at
// various build stages, which isn't something clients should see. It lives in
// the admin portal. Any client-side link or stale bookmark lands back on the
// dashboard rather than an internal roadmap.
export default function RoadmapPage() {
  redirect('/dashboard')
}
