// M0 · #338 (AR-01) — PHANTOM SENDS. resend.emails.send() RETURNS { data, error }
// (like supabase-js) — it does NOT throw on an API-level failure (bad recipient, rate
// limit, rotated/blocked key). Call sites that only awaited the promise and read
// `.data?.id` therefore treated a *failed* send as a success: the figsy_sent_emails row
// was inserted, the enrollment advanced, the counter bumped — a phantom send, and on the
// FIGSY money path a $3 charge for an email that never left.
//
// interpretSend() collapses the Resend result into a single honest verdict every send
// site checks BEFORE recording state. A send is real only when there is no error AND a
// message id came back.

export interface CheckedSend {
  ok: boolean
  id: string | null
  error: unknown
}

export function interpretSend(result: unknown): CheckedSend {
  const r = result as { data?: { id?: string | null } | null; error?: unknown } | null | undefined
  if (!r) return { ok: false, id: null, error: new Error('resend: no result') }
  if (r.error) return { ok: false, id: null, error: r.error }
  const id = r.data?.id ?? null
  if (!id) return { ok: false, id: null, error: new Error('resend: no message id returned') }
  return { ok: true, id, error: null }
}
