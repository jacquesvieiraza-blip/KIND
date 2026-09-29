// ⚑ 28 Sep (R164 · demo B) — SCREENSHOT THE NORTHWIND DEMO AT EVERY STAGE, IN A REAL BROWSER.
//
// The companion to `demo-walk.mjs`: that one proves every read answers; this one looks at what a
// person actually sees. Signed in as the demo login (Milla) and as the harness operator (Vida),
// with the same session cookie the real apps read. Run after `demo-walk.mjs` (which seeds the
// login) against `bash scripts/fullstack.sh up`.
//
//   node scripts/fullstack/demo-shots.mjs [/tmp/kind-fullstack/env.json] [out-dir]
//
// ⚑ 29 Sep (R174 ⑧ · PR 8e) — THE SWEEP OPENS EVERY PAGE. It used to open a handful per stage and
// never Pipeline, Inbox at Complete, Coaching, Billing, ROI, Settings, or any Vida menu page or
// tab — which is how the audit's gaps got through. Now, at every stage: every Milla page, and the
// demo open in Vida on every tab; at the delivering stages, every Vida menu page. A page fails on
// error text, on red text in Milla, on a retired word (the one list the code guard reads), and on
// the facts that must read true (paid in full; Pipeline and Inbox open). Every future feature
// updates the demo or this goes red (R173).
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

const MILLA_PAGES = ['/milla', '/milla/programme', '/milla/pipeline', '/milla/replies', '/milla/meetings',
  '/milla/performance', '/milla/analytics', '/milla/roi', '/milla/reports', '/milla/coaching', '/milla/billing',
  '/milla/usage', '/milla/documents', '/milla/icp', '/milla/campaign', '/milla/settings', '/milla/referral',
  '/milla/command-centre', '/milla/chat', '/dashboard/documents']
const PAGES = {
  Brief: ['/milla', '/milla/welcome'],
  Proof: MILLA_PAGES, Programme: MILLA_PAGES, Approval: MILLA_PAGES, Results: MILLA_PAGES, Complete: MILLA_PAGES,
}
const VIDA_TABS = ['Inbox', 'Approvals', 'People', 'Campaign', 'ICP', 'Sequence', 'Asks', 'Bookings', 'Programme', 'Pool', 'Exceptions']
const VIDA_PAGES = ['/vida', '/vida?needs=1', '/vida/bookings', '/vida/reports', '/vida/cockpit', '/vida/sending', '/vida/unibox',
  '/vida/suppression', '/vida/clients-admin', '/vida/demo', '/vida/money-path', '/vida/billing', '/vida/revenue',
  '/vida/system', '/vida/engine', '/vida/audit', '/vida/gtm', '/vida/partners', '/vida/nexus', '/vida/founder', '/vida/governed-documents']

const ERROR_TEXT = ['Client not found', 'Something went wrong', 'could not be loaded', 'Failed to load', 'Server error',
  'Application error', 'Unhandled Runtime Error', 'This page could not be found',
  // ⛓️ 28 Sep (R173 · 3 of 3) — Documents: a programme client has accepted the terms.
  'No purchase yet', 'No acceptance on record']
const RETIRED = JSON.parse(readFileSync(new URL('./retired-client-words.json', import.meta.url), 'utf8'))
  .map(([name, src, flags]) => [name, new RegExp(src, flags)])
const retiredIn = (text) => RETIRED.filter(([, re]) => re.test(text)).map(([name]) => `retired word: ${name}`)

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM ?? '/opt/pw-browsers/chromium' })
const ctx = async (base, jwt, id, email) => {
  const c = await browser.newContext({ viewport: { width: 1600, height: 1000 }, extraHTTPHeaders: { 'x-forwarded-proto': 'https' } })
  const u = new URL(base)
  await c.addCookies([{ name: cookieName, value: cookieValue(jwt, id, email), domain: u.hostname, path: '/' }])
  return c
}
const milla = await ctx(ENV.portal, SESSION.jwt, SESSION.userId, SESSION.email)

// Red text a client can see: any visible element whose own text is set in a red.
const redTextOn = (page) => page.evaluate(() => {
  const out = []
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join(' ').trim()
    if (!own || el.offsetParent === null) continue
    const m = getComputedStyle(el).color.match(/\d+/g)
    if (!m) continue
    const [r, g, b] = m.map(Number)
    if (r >= 150 && g < 90 && b < 90) out.push(own.slice(0, 80))
  }
  return out.slice(0, 3)
})

const shot = async (page, file) => { await page.screenshot({ path: file }).catch(() => {}) }
// ⚠️ NOT `networkidle`: since 7a Milla refreshes itself every 20 seconds, so the network is
// never idle and every page sat out the whole timeout (≈45 s a page, hours for the sweep). The
// page is loaded, then given a fixed moment for its reads to land — as the old scan did.
const open = async (c, url, wait) => {
  const page = await c.newPage()
  await page.goto(url, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(wait)
  const text = (await page.innerText('body').catch(() => '')).replace(/\s+/g, ' ')
  return { page, text }
}

// Four pages at a time: each has its own tab, and none of them changes anything.
const inBatches = async (items, fn, size = 4) => {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn))
}

const report = []
for (const [stage, paths] of Object.entries(PAGES)) {
  await setStage(stage)
  await inBatches(paths, async (path) => {
    const { page, text } = await open(milla, `${ENV.portal}${path}`, 2500)
    const file = `${OUT}/milla-${stage}${path.replace(/\//g, '_')}.png`
    await shot(page, file)
    const bad = [...ERROR_TEXT.filter(t => text.includes(t)), ...retiredIn(text),
      ...(await redTextOn(page)).map(t => `red text: "${t}"`)]
    // ⚑ 8b — once there is a programme, Billing reads paid, never "Not yet paid".
    if (path === '/milla/billing' && ['Approval', 'Results', 'Complete'].includes(stage) && text.includes('Not yet paid')) bad.push('Billing says "Not yet paid"')
    if (text.trim().length < 20) bad.push('the page is blank')
    report.push({ stage, where: `Milla ${path} → ${new URL(page.url()).pathname}`, bad, file })
    await page.close()
  })
  // Vida: the demo open on every tab — a FRESH context each stage, because Vida keeps the selected
  // client in page state and a tab that already showed another page keeps its blank selection.
  const st = await (await fetch(`${ENV.api}/operator/demo/northwind`, { headers: ADMIN })).json()
  const vida = await ctx(ENV.admin, ENV.adminJwt, ENV.adminUserId, ENV.adminEmail)
  if (st?.data?.clientId) {
    await inBatches(VIDA_TABS, async (tab) => {
      const { page, text } = await open(vida, `${ENV.admin}/vida?client=${st.data.clientId}&tab=${encodeURIComponent(tab)}`, 3000)
      const file = `${OUT}/vida-${stage}_client_${tab}.png`
      await shot(page, file)
      const bad = ['Something went wrong', 'Failed to load', 'Server error', 'Application error', 'Unhandled Runtime Error'].filter(t => text.includes(t))
      report.push({ stage, where: `Vida demo · ${tab}`, bad, file })
      await page.close()
    })
  }
  // Every Vida menu page, where the demo's data is at its fullest (and at the start, for the empties).
  if (['Brief', 'Results', 'Complete'].includes(stage)) {
    await inBatches(VIDA_PAGES, async (path) => {
      const { page, text } = await open(vida, `${ENV.admin}${path}`, 3000)
      const file = `${OUT}/vida-${stage}${path.replace(/[/?=]/g, '_')}.png`
      await shot(page, file)
      const bad = ['Something went wrong', 'Server error', 'Application error', 'Unhandled Runtime Error', 'This page could not be found'].filter(t => text.includes(t))
      if (text.trim().length < 20) bad.push('the page is blank')
      report.push({ stage, where: `Vida ${path} → ${new URL(page.url()).pathname}`, bad, file })
      await page.close()
    })
  }
  await vida.close()
}
await browser.close()
for (const r of report) console.log(`${r.bad.length ? '✗' : '✓'} ${r.stage.padEnd(9)} ${r.where}${r.bad.length ? `  — shows: ${r.bad.join(', ')}` : ''}`)
console.log(`${report.length} pages opened · ${report.filter(r => r.bad.length).length} failed`)
// A screen showing an error is a failed demo: the gate (`scripts/demo-walk.sh`) reads this exit.
if (report.some(r => r.bad.length > 0)) process.exit(1)
