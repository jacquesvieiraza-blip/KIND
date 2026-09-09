// ═══════════════════════════════════════════════════════════════════════════════════════
// 🛑 THE KILL-SWITCH — THE HIGHEST-LEVEL DELIVERY STOP, AND IT IS ABSOLUTE.
//
// ── THE FOUNDER'S RULE, LOCKED 9 Sep 2026 ───────────────────────────────────────────────
//
//     KILL-SWITCH ON  = NO EXTERNALLY DELIVERED OUTREACH OF ANY KIND.
//     KILL-SWITCH OFF = sending MAY be permitted, subject to every other authority and gate.
//
// There is NO exception for: Founder · operator_run · canary · cron · retry · test send ·
// preview · a provider-specific push · LinkedIn · Smartlead · Instantly · SMTP · Resend ·
// any legacy path. **A run must never bypass the kill-switch.**
//
// ── WHY THIS IS A MODULE AND NOT A LINE IN `figsy.ts` ───────────────────────────────────
//
// ⛓️ WHAT WENT WRONG. The switch lived as `outreachEnabled()` inside `figsy.ts`, and every
// path was expected to remember to ask it. Most did. An audit on 9 Sep found the ones that
// did not, and the shape of the failure was always the same — a path that felt like an
// exception to whoever wrote it:
//
//   • `sendSequenceEmailCore` let an `operator_run` through on its OWN authority, so the
//     canary sent with automatic outreach off. It was described in a comment as "a different
//     key to the same door". It was a second door.
//   • the same gate exempted `isPreview`, whose route accepts a `to_email` override — so
//     "the founder's own inbox" was whatever address the request named.
//   • `dispatchLinkedInStep` asked the do-not-contact floor, the opt-out blocklist and
//     programme authority, and never asked this switch at all.
//   • two operator diagnostics sent real mail — one through the cold Resend identity, one
//     through a client's authenticated mailbox — and neither asked.
//
// A switch that each caller must remember to consult is not a kill-switch, it is a
// convention. So the question now lives in ONE place, and it is asked **at the provider
// seam** — inside `mailer.sendAs`, and at each provider push — where a new caller cannot
// route around it by not knowing about it.
//
// ── THE NAME HELD THE OPPOSITE OF ITS MEANING ──────────────────────────────────────────
//
// ⚠️ `AUTO_OUTREACH_ENABLED === 'true'` means the kill-switch is **OFF** (sending permitted).
// Reading the raw variable as "the kill-switch" inverts it, and the Smartlead and Instantly
// gates carried a field literally called `killSwitchOn` that held *enabled*. Both spellings
// are provided here so no caller has to do that inversion in their head:
//
//     outreachDeliveryPermitted() === true   ⇔   killSwitchOn() === false
//
// ⚠️ AND `PERMITTED` IS NOT `AUTHORISED`. This switch grants nothing on its own. Turning it
// off (permitting delivery) hands the decision back to programme authority, approval, P2,
// LIVE, the sender, the schedule, DNC/opt-out/PECR and the caps — every one of which still
// has to say yes. It can only ever REFUSE.
// ═══════════════════════════════════════════════════════════════════════════════════════

/**
 * Is external outreach delivery permitted at all right now?
 *
 * Absent, empty, `'TRUE'`, `'1'` or anything but the exact lowercase string is OFF —
 * the safe default, and deliberately the same shape as `operatorSendEnabled()` so the two
 * switches cannot be reasoned about differently.
 */
export function outreachDeliveryPermitted(): boolean {
  return process.env.AUTO_OUTREACH_ENABLED === 'true'
}

/** The founder's spelling: ON = blocked. The exact inverse of the line above. */
export function killSwitchOn(): boolean {
  return !outreachDeliveryPermitted()
}

/**
 * One sentence, used everywhere a refusal is reported, so an operator reading a log, a route
 * response or the console never has to work out whether "off" meant permitted or blocked.
 */
export const KILL_SWITCH_REFUSAL =
  'The kill-switch is ON (AUTO_OUTREACH_ENABLED is not "true"), so no outreach is delivered by any path. Nothing was sent.'

/** Channel names used only in logs — a refusal must say WHICH path asked. */
export type DeliveryChannel =
  | 'smtp'
  | 'resend_cold'
  | 'smartlead'
  | 'instantly'
  | 'linkedin'

/**
 * Refuse-and-log, for the provider seams.
 *
 * Returns `true` when delivery is BLOCKED (and has logged why), so a seam reads:
 *
 *     if (killSwitchBlocks('smtp', `${to}`)) return refusal
 *
 * ⚠️ IT NEVER THROWS. Every seam that calls it already has a verdict shape its callers
 * unwind safely; an exception here would escape rollback paths that exist precisely so a
 * refused send cannot strand a phantom "sent" row.
 */
export function killSwitchBlocks(channel: DeliveryChannel, subject: string): boolean {
  if (outreachDeliveryPermitted()) return false
  console.warn(`[kill-switch] ${channel} delivery REFUSED for ${subject} — AUTO_OUTREACH_ENABLED != true (kill-switch ON).`)
  return true
}
