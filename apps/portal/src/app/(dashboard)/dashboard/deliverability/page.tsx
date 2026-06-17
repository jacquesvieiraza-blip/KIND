import { redirect } from 'next/navigation'

// Item 195 PR-2 — the Deliverability page was consolidated into Performance (sender
// health + warmup pacing) and Analytics (send-volume), so clients have TWO metric
// surfaces, not three. This route now redirects so old links/bookmarks still land
// somewhere useful instead of 404-ing.
export default function DeliverabilityPage() {
  redirect('/dashboard/kpis')
}
