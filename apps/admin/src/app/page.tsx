import { redirect } from 'next/navigation'

// The admin app IS Vida now. Logging in lands the operator on the console —
// the old founder cockpit lives at /cockpit, reachable from Vida's top-right
// dropdown (the #485 nervous system), never as the landing page.
export default function Root() {
  redirect('/vida')
}
