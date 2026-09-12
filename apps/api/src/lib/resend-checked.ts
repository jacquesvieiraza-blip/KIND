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
  /**
   * ⚑ 12 Sep (R120) — THE PROVIDER'S OWN ERROR NAME, SURFACED.
   *
   * WHY IT HAD TO BE ADDED. `error` is `unknown`, so no caller could branch on WHICH failure
   * happened — and the welcome-email rule turns on exactly that distinction:
   * `concurrent_idempotent_requests` means another same-key request is in flight (keep the
   * claim, retry later), `invalid_idempotent_request` means the key was used with a different
   * payload (fail closed), a 500 is ambiguous, and a validation error is a definitive refusal
   * whose claim may be released. Collapsing those four into one boolean is how a 409 got
   * misread as a send in the first draft of this build.
   *
   * ⚠️ NULL WHEN THERE IS NO PROVIDER NAME — a thrown socket error, a missing result, or a
   * success with no message id. Callers must treat null as AMBIGUOUS, never as refused: an
   * unrecognised failure is the one you must not release a claim on.
   */
  errorName: string | null
}

/** Resend's error shape is `{ name, message }`; anything else yields null rather than a guess. */
function providerErrorName(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null
  const name = (error as { name?: unknown }).name
  // An `Error` instance's `name` is 'Error' / 'TypeError' / … — our own wrapper, not the
  // provider's code. Excluding it keeps a thrown fault from masquerading as a provider verdict.
  if (error instanceof Error) return null
  return typeof name === 'string' && name ? name : null
}

export function interpretSend(result: unknown): CheckedSend {
  const r = result as { data?: { id?: string | null } | null; error?: unknown } | null | undefined
  if (!r) return { ok: false, id: null, error: new Error('resend: no result'), errorName: null }
  if (r.error) return { ok: false, id: null, error: r.error, errorName: providerErrorName(r.error) }
  const id = r.data?.id ?? null
  if (!id) return { ok: false, id: null, error: new Error('resend: no message id returned'), errorName: null }
  return { ok: true, id, error: null, errorName: null }
}
