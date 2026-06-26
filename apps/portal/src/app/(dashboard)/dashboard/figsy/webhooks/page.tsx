import { redirect } from 'next/navigation'

// Route PULLED 26 Jun (yellow/red live-exposure audit). This page documented an
// inbound-enrolment webhook (`/figsy/webhook/enrol`) that was never built and a
// "Send test" that 404s — a shell reachable by URL. Redirect away so clients
// can't land on it. Re-instate when the real endpoint exists (PRODUCT-INVENTORY
// item 250 carries the build spec; prior implementation is in git history).
export default function WebhooksPulled() {
  redirect('/dashboard/figsy')
}
