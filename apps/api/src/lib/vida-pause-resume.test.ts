// ⚑ 29 Sep (R174 · PR 2a) — VIDA CAN PAUSE (WITH A REASON) AND RESUME.
// Every Vida Pause was refused: the API requires one of three reasons and Vida sent `{}`. And
// the API's Resume had no caller anywhere in Vida.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
const VIDA = read('apps/admin/src/app/vida/page.tsx')
const LIB = read('apps/api/src/lib/programme.ts')
const ROUTE = read('apps/api/src/routes/programme.ts')

const fn = (name: string) => {
  const start = VIDA.indexOf(`const ${name} = useCallback(`)
  expect(start, `${name} is gone`).toBeGreaterThan(-1)
  return VIDA.slice(start, VIDA.indexOf('\n  }, [', start))
}

describe('Pause sends a reason the API accepts', () => {
  it('Vida offers exactly the API\'s three reasons', () => {
    const api = LIB.match(/export type PauseReason = ([^\n]+)/)![1].match(/'([a-z_]+)'/g)!.map(x => x.slice(1, -1)).sort()
    const vida = [...VIDA.matchAll(/\{ key: '([a-z_]+)', label: '[^']+' \}/g)].map(m => m[1]).sort()
    expect(vida).toEqual(api)
    expect(ROUTE).toContain("reason !== 'client' && reason !== 'quality' && reason !== 'icp_change'")
  })
  it('the press sends the reason — never an empty body', () => {
    const pause = fn('pauseProgramme')
    expect(pause).toContain('body: JSON.stringify({ reason })')
    expect(pause).not.toContain("body: '{}'")
    expect(pause.indexOf('if (!reason) return')).toBeLessThan(pause.indexOf('fetch('))
  })
  it('the Programme tab picks the reason first; the old sender-screen action asks', () => {
    expect(VIDA).toContain('onClick={() => { if (pauseReason) void pauseProgramme(pauseReason) }} disabled={lcBusy !== null || !pauseReason}')
    expect(VIDA).toContain("case 'pause_programme': return void pauseProgramme()")
    expect(fn('pauseProgramme')).toContain('const reason = given ?? askPauseReason()')
  })
})

describe('Resume exists in Vida', () => {
  it('it calls the API\'s resume, after the ownership check and a confirmation', () => {
    const resume = fn('resumeProgramme')
    const own = resume.indexOf('if (!id) { setLcMsg(PROGRAMME_MISMATCH_COPY); return }')
    const ask = resume.indexOf('confirm(')
    const send = resume.indexOf('/resume`')
    expect(own).toBeGreaterThan(-1)
    expect(own).toBeLessThan(ask)
    expect(ask).toBeLessThan(send)
  })
  it('it is on the Programme tab whenever the programme is paused', () => {
    expect(VIDA).toContain("{prog.programme.paused_at && !['COMPLETED', 'CANCELLED'].includes(prog.programme.status) && (")
    expect(VIDA).toContain('onClick={() => void resumeProgramme()}')
  })
  it('the paused line names the reason in words, not its key', () => {
    expect(VIDA).toContain('` — ${pauseReasonLabel(prog.programme.pause_reason)}`')
  })
})
