import { LoginForm } from './LoginForm'

// force-dynamic so the login page is NOT statically prerendered at build time —
// the client form calls the Supabase browser client, which needs NEXT_PUBLIC_*
// env at runtime (absent during a static export → build failure). #308.
export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return <LoginForm />
}
