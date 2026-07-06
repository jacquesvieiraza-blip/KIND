import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // called from a Server Component — safe to ignore (middleware refreshes the session)
          }
        },
      },
    }
  )
}

// Shared allowlist: which signed-in emails may use the admin OS. Founder-only by
// default; override with ADMIN_ALLOWED_EMAILS (comma-separated) to add staff later.
export function adminAllowedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS || 'jacques.vieiraza@gmail.com')
    .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return adminAllowedEmails().includes(email.toLowerCase())
}
