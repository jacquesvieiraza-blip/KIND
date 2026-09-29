// ⚑ 29 Sep (R174 · PR 7b) — THE RIGHT SCREEN FOR THE CLIENT'S STAGE.
//   · no account yet → the Brief, from any page (not fifteen red "Client not found" pages);
//   · a programme exists → never the Brief page;
//   · a Settings save before the account exists is refused, and writes nothing;
//   · Home decides Proof mode from the programme, not the old payment flag;
//   · sign-out always signs this browser out; Settings survives blocked storage.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'

type Row = Record<string, unknown>
const st = vi.hoisted(() => ({ rows: [] as Row[], writes: [] as string[] }))

vi.mock('@kind/db', () => ({
  db: {
    from: () => {
      const filters: ((r: Row) => boolean)[] = []
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => { filters.push(r => r[c] === v); return q },
        async maybeSingle() { return { data: st.rows.find(r => filters.every(f => f(r))) ?? null, error: null } },
        async single() { return { data: st.rows.find(r => filters.every(f => f(r))) ?? null, error: null } },
        update: (patch: Row) => { st.writes.push('update'); for (const r of st.rows) Object.assign(r, patch); return q },
        upsert: () => { st.writes.push('upsert'); return q },
        insert: () => { st.writes.push('insert'); return q },
      }
      return q
    },
  },
}))
vi.mock('@anthropic-ai/sdk', () => ({ default: class {} }))
vi.mock('../lib/crm', () => ({ testCrmConnection: async () => ({ success: true }) }))
vi.mock('../middleware/auth', () => ({ requireAuth: (_q: unknown, _r: unknown, next: () => void) => next() }))

async function patchMe(body: Row) {
  const { clientRouter } = await import('./clients')
  const layer = (clientRouter as unknown as { stack: Array<Record<string, any>> }).stack
    .find(l => l.route?.path === '/me' && l.route?.methods.patch)
  const handler = layer!.route.stack[layer!.route.stack.length - 1].handle
  let payload: Row = {}; let status = 200
  const res: any = { json: (b: Row) => { payload = b; return res }, status: (s: number) => { status = s; return res } }
  await handler({ body, params: {}, query: {}, headers: {}, userId: 'u1' }, res, () => {})
  return { status, payload }
}

beforeEach(() => { st.rows = []; st.writes = [] })

describe('a Settings save before the account exists', () => {
  it('is refused with a plain sentence, and nothing is written', async () => {
    const r = await patchMe({ company_name: 'Acme', country: 'South Africa' })
    expect(r.status).toBe(409)
    expect(String(r.payload.message)).toContain('Finish your Brief first')
    expect(st.writes).toEqual([])
  })
  it('once the account exists, it saves as before — an update, never an insert', async () => {
    st.rows = [{ id: 'c1', user_id: 'u1', company_name: 'Old' }]
    const r = await patchMe({ company_name: 'Acme' })
    expect(r.status).toBe(200)
    expect(st.writes).toEqual(['update'])
    expect(st.rows[0].company_name).toBe('Acme')
  })
})

describe('the screens send each client to the right place', () => {
  const read = (p: string) => readFileSync(join(process.cwd(), p), 'utf8')
  it('no account: the layout says so, and the shell sends every page but the Brief to the Brief', () => {
    const layout = read('apps/portal/src/app/(milla)/layout.tsx')
    expect(layout).toContain('noAccount = true')
    expect(layout).toContain('<MillaShell noAccount={noAccount}>')
    expect(read('apps/portal/src/components/milla/MillaShell.tsx'))
      .toContain("if (noAccount && pathname !== '/milla/welcome') router.replace('/milla/welcome')")
  })
  it('a programme: the Brief page sends them Home, and Home never sends them to the Brief', () => {
    expect(read('apps/portal/src/app/(milla)/milla/welcome/page.tsx'))
      .toContain("if (live && r?.data?.hasProgramme === true) router.replace('/milla')")
    const home = read('apps/portal/src/app/(milla)/milla/page.tsx')
    expect(home).toContain('if (!prog || prog.hasProgramme !== false) return\n    router.replace(\'/milla/welcome\')')
  })
  it('Proof mode comes from the programme, not the old payment flag', () => {
    const home = read('apps/portal/src/app/(milla)/milla/page.tsx')
    expect(home).toContain("const proofMode = !!summary && summary.icp_versions.length > 0 && prog?.stage === 'Proof'")
    expect(home).not.toMatch(/\n\s*const proofMode = needsGoLive/)
  })
  it('sign-out falls back to this device, and Settings survives blocked storage', () => {
    expect(read('apps/portal/src/components/milla/MillaShell.tsx')).toContain("await sb.auth.signOut({ scope: 'local' })")
    const settings = read('apps/portal/src/app/(milla)/milla/settings/page.tsx')
    expect(settings).toContain("} catch { /* storage unavailable — the field simply starts empty */ }")
  })
})
