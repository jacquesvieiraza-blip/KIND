// ⚑ 3 Oct (#2552 · R185 ③) — the one rule for a mailbox's daily limit, run by its test.

export function parseDailyCap(v: unknown): { ok: true; cap: number } | { ok: false; error: string } {
  const n = typeof v === 'number' ? v : Number(String(v ?? '').trim())
  if (!Number.isInteger(n) || n < 1 || n > 100) return { ok: false, error: 'The daily limit must be a whole number from 1 to 100.' }
  return { ok: true, cap: n }
}
