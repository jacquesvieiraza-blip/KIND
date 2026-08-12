// Single source of truth for ZAR→USD conversion.
//
// Why this exists: the admin used to divide by a hardcoded `19` in two places
// (dashboard + revenue), so USD revenue silently drifted wrong as the real
// rand/dollar rate moved. Now there is ONE place, it pulls a live rate, and the
// UI always discloses the rate + where it came from.
//
// Override order: env `ZAR_PER_USD` (or `NEXT_PUBLIC_ZAR_PER_USD`) → live API → fallback.

export const FX_FALLBACK_ZAR_PER_USD = 18.5
export const FX_FALLBACK_AS_OF = '2026-06-14'
/** #646 — a sane GBP/USD fallback so the label never has to show a rand rate. */
export const FX_FALLBACK_GBP_PER_USD = 0.79

export type FxRate = {
  zarPerUsd: number
  /** #646 — what the founder actually banks in. GBP per USD; undefined if the fetch failed. */
  gbpPerUsd?: number
  source: 'live' | 'configured' | 'fallback'
  asOf: string
}

/** Fetch the current ZAR-per-USD rate. Never throws — falls back honestly. */
export async function getZarPerUsd(): Promise<FxRate> {
  const override = process.env.ZAR_PER_USD || process.env.NEXT_PUBLIC_ZAR_PER_USD
  if (override) {
    const n = Number(override)
    if (Number.isFinite(n) && n > 0) {
      return { zarPerUsd: n, source: 'configured', asOf: 'set via env' }
    }
  }
  try {
    // Free, no-key FX endpoint. Cached for an hour so it doesn't hit on every render.
    const res = await fetch('https://open.er-api.com/v6/latest/USD', { next: { revalidate: 3600 } })
    if (res.ok) {
      const j = await res.json()
      const rate = j?.rates?.ZAR
      // #646 — the SAME response already carries GBP. The rand rate was being read off it
      // and the pound ignored, on a UK company's dashboard.
      const gbp = j?.rates?.GBP
      if (Number.isFinite(rate) && rate > 0) {
        return {
          zarPerUsd: rate,
          gbpPerUsd: Number.isFinite(gbp) && gbp > 0 ? gbp : undefined,
          source: 'live', asOf: j?.time_last_update_utc || new Date().toISOString(),
        }
      }
    }
  } catch {
    // network/parse failure — fall through to the fallback
  }
  return { zarPerUsd: FX_FALLBACK_ZAR_PER_USD, gbpPerUsd: FX_FALLBACK_GBP_PER_USD, source: 'fallback', asOf: FX_FALLBACK_AS_OF }
}

/** Convert rand to whole US dollars at the given rate. */
export function zarToUsd(zar: number, zarPerUsd: number): number {
  if (!zarPerUsd || zarPerUsd <= 0) return 0
  return Math.round(zar / zarPerUsd)
}

/**
 * Short human label for the rate the FOUNDER actually banks in, e.g. "£0.79/$ · live rate".
 *
 * ⚠️ #646 — THIS SAID `R16.19/$` UNTIL 12 Aug, ON A UK FOUNDER'S OWN DASHBOARD. Found during
 * the first A11 walk. The company is a UK Ltd; clients are charged in USD and the money is
 * banked in GBP, so rand-per-dollar is a number with no bearing on anything he does. It was a
 * leftover from the project's South-African origin, sitting on the one screen he opens daily.
 *
 * Nothing about a wrong-currency label is dangerous on its own — it is dangerous because it
 * teaches you to stop reading your own dashboard, and the cockpit is where the cost floor and
 * the burn are reported.
 *
 * The ZAR machinery below is untouched on purpose: `amount_zar` is a real column holding real
 * historic rows, and `zarToUsd` converts them. Rewriting revenue maths that has not been
 * re-verified would trade a cosmetic defect for a money one. What changed is the rate a human
 * is shown; see #647 for the revenue page still headlining "MRR (ZAR)".
 */
export function fxLabel(fx: FxRate): string {
  const word = fx.source === 'live' ? 'live rate' : fx.source === 'configured' ? 'fixed rate' : 'est. rate'
  if (fx.gbpPerUsd && fx.gbpPerUsd > 0) return `£${fx.gbpPerUsd.toFixed(2)}/$ · ${word}`
  // No GBP rate available — say nothing rather than show a currency the founder does not use.
  return `USD · ${word}`
}
