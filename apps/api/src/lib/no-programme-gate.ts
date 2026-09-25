// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R168 ② · P3c, board #2349) — NO SOURCING WITHOUT A PROGRAMME, FOR A CLIENT.
//
// Founder, asked whether a client may pull people with no programme behind them: *"A"* —
// clients need a programme to source; House and Free Proof carry on as today.
//
// Its own module so the ONE question has ONE answer, asked by `runIcpJob`'s authority gate
// (Free Proof never reaches that gate — `proofMode` skips it). Tests that exercise what happens
// AFTER the gate may stand this in, saying so; `batch1-programme-less-fence.test.ts` drives it
// for real and must never mock it.
// ═══════════════════════════════════════════════════════════════════════════════════════
import { audienceForClientStrict } from './provider-boundary'

/** Why a client with no programme is not sourced. Plain, no apostrophes (see `schema-truth.ts`). */
export const NO_PROGRAMME_NO_SOURCING =
  'This client has no programme, so nothing may be sourced for them. A client sources only through a ' +
  'programme; House and Free Proof are the only exceptions. Nothing was sourced and nothing was spent.'

/**
 * May this client source with NO open programme and an ICP attached to none? Only House.
 * ⚠️ STRICT, like the sourcing run itself: an audience that cannot be proven throws, so an
 * unreadable account is never waved through as House.
 */
export async function maySourceWithoutProgramme(clientId: string): Promise<boolean> {
  return (await audienceForClientStrict(clientId)) === 'house'
}
