// #628/PART 6 — CAN A PROSPECT ACTUALLY BOOK, AND WOULD WE KNOW IF THEY COULD NOT?
//
// ⚠️ THE GAP, AND IT IS THE #624 GAP AGAIN. Calendar booking is the END of the loop we are
// building: FIGSY sends, the prospect answers interested, and the booking link turns that
// reply into a meeting in the client's own calendar. The build behind it is real —
// `gcal.ts` reads genuine free/busy, `events.insert` writes into the client's primary
// calendar, a Meet link is attached and `sendUpdates: 'all'` invites both sides.
//
// And **no System row covered any of it.** `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` /
// `GOOGLE_REDIRECT_URI` are all `level: 'optional'` in `startup-check.ts`, so the boot check
// says nothing when they are absent — correctly, because booking is optional. But "optional
// to boot" is not "optional to the product": with those vars unset, `/calendar/connect`
// cannot start an OAuth flow at all, so **no client can ever connect a calendar**, every
// booking link resolves to nothing, and the failure is completely silent. A prospect clicks,
// gets nowhere, and never tells us. That is exactly what #624 closed for replies — the same
// class, one step further down the same funnel.
//
// ⚠️ AN ENV CHECK ONLY, ON PURPOSE. This makes NO Google API call. Every other probe in this
// file obeys the same rule (*"never a paid call, never a send"*), and here it matters twice
// over: hitting Google would need a client's refresh token, which means acting on a client's
// account to draw a picture on our own operator screen. Reading three env vars and counting
// rows we already own answers the question that can actually be answered, and the verdict
// says out loud which question that is.
//
// Pure, for the same reason `replyPathVerdict`, `coldView` and `pecrVerdict` are: the
// judgement is provable without a network, a database or a clock. The probe gathers facts;
// this decides what they mean.

/** The three env vars OAuth needs. Named once so the verdict can say WHICH one is missing. */
export type CalendarEnv = {
  clientId?: string | null
  clientSecret?: string | null
  /**
   * `GOOGLE_REDIRECT_URI`. Unlike the other two this has a real fallback in `gcal.ts` —
   * `${PORTAL_URL}/calendar/callback`, and only a localhost literal below that. So it is
   * absent-but-derivable rather than simply absent, and the verdict must not shout about a
   * missing variable that the code fills in correctly from `PORTAL_URL`.
   */
  redirectUri?: string | null
  portalUrl?: string | null
}

export type CalendarVerdict = {
  state: 'ok' | 'broken' | 'unmeasured'
  detail: string
  action?: string
}

/** Trimmed, or null. `''` and `'   '` are both "not set" — a blank var is not a value. */
function val(v: string | null | undefined): string | null {
  const s = String(v ?? '').trim()
  return s || null
}

/**
 * Which OAuth env vars are missing, in the words the operator has to act on.
 *
 * Exported so the test can prove the naming without going through the whole verdict — and so
 * a second caller cannot invent its own idea of what "configured" means, which is the
 * `PDL_MONTHLY_CAP_KEY` lesson (#626) and the `coldView` lesson (#619).
 */
export function missingCalendarVars(env: CalendarEnv): string[] {
  const missing: string[] = []
  if (!val(env.clientId)) missing.push('GOOGLE_CLIENT_ID')
  if (!val(env.clientSecret)) missing.push('GOOGLE_CLIENT_SECRET')
  // Only missing when there is ALSO no PORTAL_URL to derive it from — see the type comment.
  if (!val(env.redirectUri) && !val(env.portalUrl)) missing.push('GOOGLE_REDIRECT_URI (or PORTAL_URL, which it is derived from)')
  return missing
}

/**
 * Can a client connect a calendar, and has anyone?
 *
 * `connections` is the count of clients holding a Google refresh token — the one durable
 * artefact of a completed OAuth flow, and the same column every booking route gates on
 * (`clients.google_calendar_refresh_token`). `null` means the count could not be read, which
 * is NOT-MEASURED and never a pass: an unreadable table must not render as "0 connections",
 * because zero is a legitimate, calm-looking number that would hide an outage.
 */
export function calendarBookingVerdict(a: {
  env: CalendarEnv
  connections: number | null
  /** Why the count could not be read, when it could not. */
  countError?: string | null
}): CalendarVerdict {
  const missing = missingCalendarVars(a.env)

  // ① The env comes first, because nothing downstream can be true without it. A missing
  //    variable is DEFINITIVE — not a warning — and the consequence is spelled out, since
  //    "GOOGLE_CLIENT_ID is not set" reads as trivia next to "no client can ever book".
  if (missing.length > 0) {
    return {
      state: 'broken',
      detail: `Calendar booking cannot work: ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} not set, so /calendar/connect cannot start a Google OAuth flow at all. No client can connect a calendar, every booking link a client shares resolves to nothing, and an interested prospect who clicks it simply gets nowhere and never tells us. These vars are 'optional' at boot, so nothing else in the product complains about this.`,
      action: 'Set them in Railway → @kind/api → Variables (Google Cloud console → APIs & Services → Credentials → OAuth 2.0 Client ID).',
    }
  }

  // ② Configured, but the count is unreadable. Say so rather than printing a zero we did not
  //    measure — the #565 class, where a broken check renders as a clean answer.
  if (a.connections === null) {
    return {
      state: 'unmeasured',
      detail: `Google OAuth is configured, so a client CAN connect a calendar. How many have was not established — the clients table could not be read${a.countError ? ` (${a.countError})` : ''} — so this is not a pass.`,
      action: 'Re-run once the database answers.',
    }
  }

  // ③ Configured with nobody connected. This is the EXPECTED pre-launch state, not a fault:
  //    no client has onboarded yet. Saying "0 connections" without saying that would put an
  //    alarming number on a screen the operator reads for alarm.
  if (a.connections === 0) {
    return {
      state: 'ok',
      detail: 'Google OAuth is configured — a client can connect a calendar. 0 client calendar connections on file, which is expected before the first client onboards; after onboarding, a zero here means the connect flow is failing rather than that nobody wanted it.',
    }
  }

  return {
    state: 'ok',
    detail: `Google OAuth is configured and ${a.connections} client calendar connection${a.connections === 1 ? '' : 's'} ${a.connections === 1 ? 'is' : 'are'} on file — prospects booking against ${a.connections === 1 ? 'it' : 'them'} land in the client's own calendar with a Meet link. This is an env-and-storage check, not a live Google call: a token that has been REVOKED at Google's end still counts here, and would only surface on the next real booking.`,
  }
}
