// ⚑ 29 Sep (R174 · 6c) — WHAT A TOTAL COVERS, SAID ON THE SCREEN.
// ⛓️ The Milla number pages printed "Replies, all time" over what is now THIS PROGRAMME's count.
// The API says what its totals cover (`totals_scope`); every page words it the same way.
export type TotalsScope = 'programme' | 'account' | 'none' | undefined

export function totalsLabel(what: 'Replies' | 'Meetings', scope: TotalsScope): string {
  if (scope === 'programme') return `${what} · this programme`
  if (scope === 'account') return `${what}, all time`
  return `${what} · none yet`
}
