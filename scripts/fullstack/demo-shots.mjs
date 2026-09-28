// ⚑ 28 Sep (R164 · demo B) — SCREENSHOT THE NORTHWIND DEMO AT EVERY STAGE, IN A REAL BROWSER.
//
// The companion to `demo-walk.mjs`: that one proves every read answers; this one looks at what a
// person actually sees. Signed in as the demo login (Milla) and as the harness operator (Vida),
// with the same session cookie the real apps read. Run after `demo-walk.mjs` (which seeds the
// login) against `bash scripts/fullstack.sh up`.
//
//   node scripts/fullstack/demo-shots.mjs [/tmp/kind-fullstack/env.json] [out-dir]
import { readFileSync, mkdirSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright')
const { stringToBase64URL } = await import('@supabase/ssr/dist/main/utils/base64url.js')

const ENV = JSON.parse(readFileSync(process.argv[2] ?? '/tmp/kind-fullstack/env.json', 'utf8'))
const OUT = process.argv[3] ?? '/tmp/kind-fullstack/demo-shots'
const SESSION = JSON.parse(readFileSync(process.argv[4] ?? '/tmp/kind-fullstack/demo-walk/session.json', 'utf8'))
mkdirSync(OUT, { recursive: true })

const host = new URL(ENV.supabaseUrl ?? ENV.gateway).hostname
const cookieName = `sb-${host.split('.')[0]}-auth-token`
const cookieValue = (jwt, id, email) => `base64-${stringToBase64URL(JSON.stringify({
  access_token: jwt, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'fullstack-harness-no-refresh', user: { id, email, aud: 'authenticated', role: 'authenticated' },
}))}`

const ADMIN = { 'x-admin-key': ENV.secrets.adminKey, 'x-operator-email': 'fullstack-operator@example.invalid', 'content-type': 'application/json' }
const setStage = async (stage) => {
  const r = await fetch(`${ENV.api}/operator/demo/northwind/stage`, { method: 'POST', headers: ADMIN, body: JSON.stringify({ stage }) })
  if (r.status !== 200) throw new Error(`could not set ${stage}: ${r.status}`)
}

const PAGES = {
  Brief: ['/milla', '/milla/welcome'],
  Proof: ['/milla'],
  Programme: ['/milla', '/milla/programme'],
  Approval: ['/milla', '/milla/programme'],
  Results: ['/milla', '/milla/replies', '/milla/meetings'],
  Complete: ['/milla', '/milla/meetings', '/dashboard/documents'],
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const ctx = async (base, jwt, id, email) => {
  const c = await browser.newContext({ viewport: { width: 1600, height: 1000 }, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } })
  const u = new URL(base)
  await c.addCookies([{ name: cookieName, value: cookieValue(jwt, id, email), domain: u.hostname, path: '/' }])
  return c
}
const milla = await ctx(ENV.portal, SESSION.jwt, SESSION.userId, SESSION.email)
const vida = await ctx(ENV.admin, ENV.adminJwt, ENV.adminUserId, ENV.adminEmail)

const report = []
for (const [stage, paths] of Object.entries(PAGES)) {
  await setStage(stage)
  for (const path of paths) {
    const page = await milla.newPage()
    await page.goto(`${ENV.portal}${path}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await page.waitForTimeout(3500)
    const file = `${OUT}/milla-${stage}${path.replace(/\//g, '_')}.png`
    await page.screenshot({ path: file })
    const text = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ')
    const bad = ['Client not found', 'Something went wrong', 'could not be loaded', 'Failed to load', 'Server error',
      // ⛓️ 28 Sep (R173 · 3 of 3) — Documents: a programme client has accepted the terms.
      'No purchase yet', 'No acceptance on record'].filter(t => text.includes(t))
    report.push({ stage, where: `Milla ${path} → ${new URL(page.url()).pathname}`, bad, file })
    await page.close()
  }
  let vp = await vida.newPage()
  await vp.goto(`${ENV.admin}/vida/demo`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await vp.waitForTimeout(2500)
  await vp.screenshot({ path: `${OUT}/vida-${stage}_demo.png` })
  report.push({ stage, where: `Vida /vida/demo → ${new URL(vp.url()).pathname}`, bad: [], file: `${OUT}/vida-${stage}_demo.png` })
  // Vida's own view of the client — what an operator sees with Northwind open.
  const st = await (await fetch(`${ENV.api}/operator/demo/northwind`, { headers: ADMIN })).json()
  if (st?.data?.clientId) {
    // A FRESH tab: Vida keeps the selected client in page state, and a tab that already showed
    // the demo page keeps its blank selection.
    await vp.close()
    const fresh = await ctx(ENV.admin, ENV.adminJwt, ENV.adminUserId, ENV.adminEmail)
    vp = await fresh.newPage()
    await vp.goto(`${ENV.admin}/vida?client=${st.data.clientId}`, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    await vp.waitForTimeout(4000)
    await vp.screenshot({ path: `${OUT}/vida-${stage}_client.png` })
    const text = (await vp.innerText('body').catch(() => '')).replace(/\s+/g, ' ')
    const bad = ['Something went wrong', 'Failed to load', 'Server error'].filter(t => text.includes(t))
    report.push({ stage, where: `Vida /vida?client=… → ${new URL(vp.url()).pathname}`, bad, file: `${OUT}/vida-${stage}_client.png` })
  }
  await vp.close()
}
await browser.close()
for (const r of report) console.log(`${r.bad.length ? '✗' : '✓'} ${r.stage.padEnd(9)} ${r.where}${r.bad.length ? `  — shows: ${r.bad.join(', ')}` : ''}`)
// A screen showing an error is a failed demo: the gate (`scripts/demo-walk.sh`) reads this exit.
if (report.some(r => r.bad.length > 0)) process.exit(1)
