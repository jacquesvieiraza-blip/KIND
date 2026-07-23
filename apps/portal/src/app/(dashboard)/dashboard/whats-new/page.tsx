// #478 — the in-app "What's New" feed was orphaned (no sidebar link, URL-only) and is
// out of scope for the managed-service portal. Redirect to the dashboard rather than
// leave a dead, unreachable surface. Release notes live on the marketing site's "The Drop".
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function WhatsNewPage() {
  redirect('/dashboard')
}
