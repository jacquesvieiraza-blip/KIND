// WHEN THE PORTAL EXPLAINS A RUN — and why this is not a condition in the JSX.
//
// The leads page decided whether to show the last-run explanation with this:
//
//     runResult.status === 'quota_exhausted' || runResult.status === 'no_match'
//
// An ALLOWLIST, spelled out in a template. #366 added a fifth outcome —
// `audience_exhausted`, the sentence that tells a client their audience is finished rather
// than that their targeting is bad — and the run recorded that message honestly in the
// database and then rendered **nothing at all**. The silent zero the whole item exists to
// kill, reappearing one layer above the fix.
//
// An allowlist fails closed on every value nobody thought of, and the person adding a status
// is rarely the person reading this JSX. So the rule is inverted and moved somewhere it can
// be tested: a `served` run needs no explanation, because the leads on the screen ARE the
// explanation. **Everything else is shown** — including a status this file has never heard
// of. A future outcome can now be forgotten here and still reach the client.

export type OutcomeBanner = { show: boolean; tone: 'warning' | 'neutral' }

export function outcomeBanner(status: string | null | undefined): OutcomeBanner {
  if (!status || status === 'served') return { show: false, tone: 'neutral' }
  // A quota outage is OUR failure and temporary — amber, because it warrants a second look.
  // A finished or a narrow audience is an ordinary fact about the ICP, not an alarm, and
  // colouring it as one teaches clients to distrust a screen that is telling the truth.
  return { show: true, tone: status === 'quota_exhausted' ? 'warning' : 'neutral' }
}

/** Tailwind classes per tone, so the two callers cannot drift apart. */
export function outcomeBannerClass(tone: OutcomeBanner['tone']): string {
  return tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-gray-200 bg-gray-50 text-gray-700'
}
