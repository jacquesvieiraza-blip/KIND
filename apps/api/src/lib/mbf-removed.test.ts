// ⚑ 29 Sep (R174 · PR 4a·1) — THE MBF DEMO IS REMOVED. Founder: *"remove MBF"* (R164: one demo,
// Northwind). Its seed, reset route, Vida buttons and readiness probe are gone; the two jobs that
// lived in its file and are not about MBF (deleting a demo client, wiping a test client) moved
// unchanged to `client-purge.ts`, and still refuse anything that is not a demo.
import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'

const at = (p: string) => join(process.cwd(), p)
const read = (p: string) => readFileSync(at(p), 'utf8')

describe('MBF is gone', () => {
  it('its seed files are deleted', () => {
    expect(existsSync(at('apps/api/src/lib/demo-mbf.ts'))).toBe(false)
    expect(existsSync(at('apps/api/src/lib/demo-mbf-data.ts'))).toBe(false)
  })
  it('no route builds it and no Vida button calls one', () => {
    expect(read('apps/api/src/routes/operator.ts')).not.toContain("operatorRouter.post('/demo/mbf/reset'")
    for (const p of ['apps/admin/src/app/vida/engine/page.tsx', 'apps/admin/src/app/vida/demo/page.tsx']) {
      expect(read(p), p).not.toContain('/demo/mbf/reset')
      expect(read(p), p).not.toContain('Build / reset MBF')
    }
  })
  it('the health check no longer demands an MBF account; the one demo it expects is Northwind', () => {
    const probes = read('apps/api/src/lib/system-probes.ts')
    expect(probes).not.toContain("probe('MBF demo ready'")
    expect(probes).toContain("'One demo environment only — Northwind, as locked (R164).'")
  })
})

describe('what was not about MBF still works, and still refuses a real client', () => {
  it('delete-a-demo and wipe-a-test-client read the moved helpers', () => {
    expect(read('apps/api/src/routes/admin.ts')).toContain("const { purgeDemoClient } = await import('../lib/client-purge')")
    expect(read('apps/api/src/routes/operator.ts')).toContain("const { wipeClientRows } = await import('../lib/client-purge')")
    const purge = read('apps/api/src/lib/client-purge.ts')
    expect(purge).toContain("if (c.is_demo !== true) return { purged: false, reason: 'Refusing — that client is not a demo account.' }")
    expect(purge).toContain(".delete().eq('id', clientId).eq('is_demo', true)")
  })
  it('the one-demo check names Northwind', async () => {
    const { isTheDemoAccount } = await import('./integrity-checks')
    expect(isTheDemoAccount('Northwind Field Software')).toBe(true)
    expect(isTheDemoAccount('MBF Holdings')).toBe(false)
  })
})
