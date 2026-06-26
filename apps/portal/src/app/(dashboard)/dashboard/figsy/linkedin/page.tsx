import { redirect } from 'next/navigation'

// Route PULLED 26 Jun (yellow/red live-exposure audit). The LinkedIn outreach
// queue is a PARKED feature (no live LinkedIn sending), reachable only by URL.
// Redirect away so clients can't land on a parked surface. (The live LinkedIn
// CSV *import* is a different, working route: /dashboard/leads/linkedin.)
// Re-instate when LinkedIn outreach is real; prior implementation is in git history.
export default function FigsyLinkedinPulled() {
  redirect('/dashboard/figsy')
}
