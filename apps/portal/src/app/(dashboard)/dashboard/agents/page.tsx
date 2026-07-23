// #478 — the standalone "agents" gallery still sold the old FIGSY/Denise/Vida family
// ("The Opener", "The Closer"…) that the managed-service pivot retires. It was reachable
// only by typing the URL (no sidebar link). Redirect to the dashboard so nothing markets
// a product surface we don't sell. The AI family story now lives on the marketing site.
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function AgentsPage() {
  redirect('/dashboard')
}
