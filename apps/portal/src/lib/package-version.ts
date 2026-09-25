// ═══════════════════════════════════════════════════════════════════════════════════════
// ⚑ 25 Sep (R160) — A CLIENT NEVER REFRESHES TO LEARN THEIR PACKAGE CHANGED.
//
// The founder, when House's rewrite published a new version that Milla did not show: *"so we
// should never refresh Milla. how would a client know to refresh their own screen. Vida should
// send them a chat or Milla should knowing that the rewrite sequence has been done and to look
// at their camaign."*
//
// The Approval screen re-reads the review package while it waits for the client; this decides
// whether what came back is a NEW version, and what Milla says about it. Pure, so it is tested
// directly. ⚠️ Approving a stale version was already refused by the server (`stale_version`);
// this is the half that tells the client before they press.
// ═══════════════════════════════════════════════════════════════════════════════════════

/** How often an open Approval screen re-checks the package. It also re-checks on return to the tab. */
export const PACKAGE_CHECK_MS = 30_000

/** A different frozen package — never "changed" when either side is unknown. */
export function packageChanged(shown: string | null | undefined, latest: string | null | undefined): boolean {
  return !!shown && !!latest && shown !== latest
}

/** What Milla says, once per version, when the package the client is reading has been replaced. */
export function newVersionLines(versionNumber: number | null | undefined): string[] {
  const which = typeof versionNumber === 'number' && versionNumber > 0 ? `version ${versionNumber}` : 'a new version'
  return [
    `I’ve rewritten your emails — this is now ${which}, and your screen has updated to show it.`,
    'Please read them again before you approve. Nothing has been sent.',
  ]
}
