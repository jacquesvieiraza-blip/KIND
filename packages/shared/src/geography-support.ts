// ═══════════════════════════════════════════════════════════════════════════════════════
// WHERE WE CAN ACTUALLY WORK — the commercial geography gate. (S1-RT-006.)
//
// ── THE DEFECT, AND IT STRANDED A CLIENT WORSE THAN A 503 ──────────────────────────────
//
// `geographiesSchema` refuses a country outside `LAUNCH_SEND_COUNTRIES` — correctly: a
// country we cannot send to is a country we do not buy leads in. But it refuses on
// `POST /icps`, which is the THIRD leg of promotion. By then `/auth/onboard` has already
// created the canonical client row. So a prospect who said "Brazil" got:
//
//     confirm ✓ → clients row CREATED → POST /icps → Zod 400, raw, technical
//
// A real person, now a canonical client, with no ICP, no targeting, an unsealed draft and a
// validation error on screen. Founder-ruled: if a prospect cannot legitimately complete
// setup because we do not operate where they sell, we do NOT create them and strand them.
//
// ── THIS IS NOT THE PROVIDER-TRANSLATION PROBLEM, AND THE DIFFERENCE IS THE WHOLE POINT ─
//
//   · "small founder-led consultancy" not mapping onto Apollo's sixteen industries is OUR
//     translation problem. The client is right, our vocabulary is short, and it fails soft
//     into NEEDS ICP REVIEW where a human finishes it. (S1-RT-005.)
//
//   · "Brazil" when we do not source or send in Brazil is a REAL COMMERCIAL LIMIT. No human
//     can translate it, no review can resolve it, and flagging it for review would promise
//     an operator a job they cannot do. It has to be said, truthfully, in the conversation,
//     BEFORE an account exists.
//
// 🛑 SO THE TWO MUST NEVER SHARE A MECHANISM. A review that can never be resolved is a queue
// that grows for ever; a commercial limit dressed as a translation bug is a lie to an
// operator. This module decides only the second kind.
//
// ⚠️ IT DECIDES, IT DOES NOT REFUSE. Returning the split is all this does — who blocks on it
// (`confirmBriefDraft`, and `/auth/onboard` behind it) is the caller's business, and the
// sentence the client reads is `launchTargetRefusal`, which already existed and is already
// the truthful one.
// ═══════════════════════════════════════════════════════════════════════════════════════

import { isLaunchSendCountry, LAUNCH_SEND_COUNTRIES } from './launch-countries'

export interface GeographySplit {
  /** Countries we can actually work in, in the client's own spelling. */
  supported: string[]
  /**
   * Countries we cannot.
   *
   * ⚠️ THE CLIENT'S OWN SPELLING, NEVER A CANONICAL FORM. This is read back to them in a
   * sentence — "we don't currently source in Brazil" — and echoing a normalised token at
   * somebody who typed "brasil" reads as a machine, not an answer.
   */
  unsupported: string[]
}

/**
 * Split what they asked for against where we can work.
 *
 * ⚠️ A BLANK IS NOT A COUNTRY AND IS NOT AN OBJECTION. Empty strings are the UI's problem,
 * not this gate's — the same rule `geographiesSchema` already applies, so the two cannot
 * disagree about what counts as an answer.
 *
 * ⚠️ AND AN EMPTY LIST IS NOT A REFUSAL EITHER. "They have not told us yet" is the
 * eleven-fact gate's question, not this one. This answers only "is what they DID say
 * something we can do", so a Brief still collecting facts is never blocked by it.
 */
export function splitGeographies(geographies: readonly (string | null | undefined)[] | null | undefined): GeographySplit {
  const supported: string[] = []
  const unsupported: string[] = []
  for (const raw of geographies ?? []) {
    const said = String(raw ?? '').trim()
    if (said === '') continue
    const bucket = isLaunchSendCountry(said) ? supported : unsupported
    if (!bucket.includes(said)) bucket.push(said)
  }
  return { supported, unsupported }
}

/** 🛑 MAY THIS BRIEF BE CONFIRMED, as far as geography is concerned? */
export function geographySupported(geographies: readonly (string | null | undefined)[] | null | undefined): boolean {
  return splitGeographies(geographies).unsupported.length === 0
}

/**
 * The countries we can work in, as a person would say them.
 *
 * ⚠️ DERIVED FROM THE ONE CONSTANT, never typed. A hand-written list here would be a second
 * claim about where we operate, and the day the set changes one of them would be wrong.
 */
export function supportedCountriesPhrase(): string {
  const list = [...LAUNCH_SEND_COUNTRIES]
  if (list.length === 0) return 'no markets yet'
  if (list.length === 1) return list[0]
  return `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`
}

/**
 * 🛑 WHAT MILLA SAYS. One sentence, truthful, no jargon, and it ASKS — because the client's
 * next move is to tell us which other markets they want, not to go away.
 *
 * ⚠️ IT NAMES WHAT THEY SAID, NOT A NORMALISED TOKEN. "We don't currently source in Brazil"
 * is an answer; "geography 'brazil' is not in LAUNCH_SEND_COUNTRIES" is a stack trace with
 * manners.
 *
 * ⚠️ AND IT NEVER PROPOSES A REPLACEMENT. Offering "shall I use the United States instead?"
 * would be inventing targeting the client never chose — the one thing every rule in this
 * repo about the Brief forbids.
 *
 * ⚠️ THE MIXED CASE IS SAID OUT LOUD, DELIBERATELY. A client who asked for "UK, US and
 * Brazil" must not discover later that we quietly kept two and dropped one; the sentence
 * tells them exactly what we can do and asks them to decide.
 */
export function unsupportedGeographyAsk(split: GeographySplit): string {
  const bad = split.unsupported
  const named = bad.length === 1
    ? bad[0]
    : `${bad.slice(0, -1).join(', ')} and ${bad[bad.length - 1]}`
  const opening = bad.length === 1
    ? `We don't currently source in ${named}`
    : `We don't currently source in ${named}`
  const where = ` — right now we work in ${supportedCountriesPhrase()} only.`
  if (split.supported.length > 0) {
    const kept = split.supported.length === 1
      ? split.supported[0]
      : `${split.supported.slice(0, -1).join(', ')} and ${split.supported[split.supported.length - 1]}`
    return `${opening}${where} I can still target ${kept} for you — would you like me to go ahead with just ${kept}, or are there other markets you'd like to add?`
  }
  return `${opening}${where} Are there other markets you'd like us to target?`
}
