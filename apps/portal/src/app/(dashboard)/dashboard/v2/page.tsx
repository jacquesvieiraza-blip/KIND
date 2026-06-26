import { redirect } from 'next/navigation'

// Route PULLED 26 Jun (yellow/red live-exposure audit). This was the v2/Casey
// "coming soon / demo" preview, reachable only by URL. Redirect away so clients
// can't land on a demo surface. Re-instate when v2/Casey is wired (the T5
// wire-or-cut decision; prior implementation is in git history).
export default function V2Pulled() {
  redirect('/dashboard')
}
