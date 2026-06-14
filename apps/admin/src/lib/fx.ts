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

export type FxRate = {
  zarPerUsd: number
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
      if (Number.isFinite(rate) && rate > 0) {
        return { zarPerUsd: rate, source: 'live', asOf: j?.time_last_update_utc || new Date().toISOString() }
      }
    }
  } catch {
    // network/parse failure — fall through to the fallback
  }
  return { zarPerUsd: FX_FALLBACK_ZAR_PER_USD, source: 'fallback', asOf: FX_FALLBACK_AS_OF }
}

/** Convert rand to whole US dollars at the given rate. */
export function zarToUsd(zar: number, zarPerUsd: number): number {
  if (!zarPerUsd || zarPerUsd <= 0) return 0
  return Math.round(zar / zarPerUsd)
}

/** Short human label for the rate, e.g. "R18.50/$ · live". */
export function fxLabel(fx: FxRate): string {
  const word = fx.source === 'live' ? 'live rate' : fx.source === 'configured' ? 'fixed rate' : 'est. rate'
  return `R${fx.zarPerUsd.toFixed(2)}/$ · ${word}`
}
