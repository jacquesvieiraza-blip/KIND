import { MillaShell } from '@/components/milla/MillaShell'

// #488 — Milla owns its OWN full-screen shell, OUTSIDE the (dashboard) route group, so it
// never inherits the old portal chrome (sidebar/agent column). Auth is enforced by the
// middleware (/milla → login) + the dev-only MILLA_DEV_PREVIEW bypass for the harness.
// Design ref: docs/mv-previews/milla2.html.
export const dynamic = 'force-dynamic'

export default function MillaLayout({ children }: { children: React.ReactNode }) {
  return <MillaShell>{children}</MillaShell>
}
