// ══════════════════════════════════════════════════════════════════════════════════════════
// BATCH 1b · MINT A SUPABASE-SHAPED JWT FOR THE HARNESS
//
// PostgREST authorises by validating a JWT against its own `PGRST_JWT_SECRET` and reading the
// `role` claim. Real Supabase issues these from the project's JWT secret; here the harness
// issues them from a harness secret, which is why NO GoTrue is needed for any Batch 1b check.
//
// ⚠️ THE SECRET IS A LITERAL IN `fullstack.sh` AND THAT IS CORRECT. It authorises nothing but
// a database that was created seconds earlier on loopback and is destroyed at teardown. A real
// secret must never be passed here — and cannot be useful, since PostgREST validates against
// whatever it was started with.
// ══════════════════════════════════════════════════════════════════════════════════════════
// ── AN OPTIONAL SUBJECT, FOR THE ONE CHECK THAT NEEDS A SESSION ─────────────────────────
//
// Check 3's timeout half must cross the REAL admin middleware, which reads a Supabase
// session (`supabase.auth.getUser()` → `GET /auth/v1/user`). That call identifies a USER, so
// the token needs `sub` and `email`; the `service_role`/`anon` tokens PostgREST validates
// need neither. Passing them is therefore optional and the two-argument form is unchanged.
//
// ⚠️ SAME SECRET, AND THAT IS THE POINT — the gateway verifies this signature with exactly
// the secret PostgREST was started with, so an unsigned or foreign token is refused by both.
// Still no GoTrue: nothing here issues, refreshes or stores a session, and there is no
// password anywhere in the harness.
import { createHmac } from 'node:crypto'

const [role, secret, sub, email] = process.argv.slice(2)
if (!role || !secret) { console.error('usage: mint-jwt.mjs <role> <secret> [sub] [email]'); process.exit(1) }

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url')
const now = Math.floor(Date.now() / 1000)
const header = b64({ alg: 'HS256', typ: 'JWT' })
const payload = b64({
  role, iss: 'kind-fullstack-harness', iat: now, exp: now + 86400,
  ...(sub ? { sub, aud: 'authenticated' } : {}),
  ...(email ? { email } : {}),
})
const sig = createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
process.stdout.write(`${header}.${payload}.${sig}`)
