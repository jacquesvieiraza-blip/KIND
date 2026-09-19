export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, isAllowedAdminEmail } from '@/lib/supabase/server'

// ── ⚑ 17 Sep (XC-3) — THE UPSTREAM IS CONFIGURATION, NOT A LITERAL ─────────────────────
//
// 🛑 THE PRODUCTION API URL WAS HARDCODED HERE. Every operator call in Vida goes through this
// hop, so the admin console could only ever talk to ONE deployment — pointing staging at the
// staging API, or a local admin at a local API, meant editing and redeploying this file. Worse:
// a preview build of the admin console silently drove the LIVE API, which on this repo is the
// database real clients are in (RULEBOOK §11 exists because merging to `main` ships live).
//
// ⚠️ THE FALLBACK IS THE OLD LITERAL, ON PURPOSE. Refusing to boot without the variable would
// take the console down the moment this deploys, before anyone can set it. So an unset
// variable keeps today's behaviour exactly — and `docs/ENVIRONMENT.md` documents the variable
// so pointing the console elsewhere is a setting rather than a code change.
const DEFAULT_API = 'https://kindapi-production-e64c.up.railway.app'
const API = (process.env.ADMIN_API_UPSTREAM || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API).replace(/\/+$/, '')

/**
 * How long this hop waits.
 *
 * ⚠️ THE NUMBER IS THE UPSTREAM'S BUDGET PLUS MARGIN, not a guess: the conversational routes
 * bound their own model call at 30s with no SDK retry (`AI_TURN_BOUND` in the API), so 45s
 * cannot be reached by a healthy turn.
 *
 * 🛑 BUT ONE ROUTE LEGITIMATELY OUTLIVES IT. `POST /operator/migrations/run` replays 74
 * migrations on 74 connections; that is minutes, not seconds. Aborting it is correct — the
 * operator's REQUEST should not hang — but reporting it as "API unreachable" was a lie, and
 * it is the lie that made the migration card unusable: the run was working, the screen said
 * the API was down, and re-pressing the button started a second run. XC-3's answer is that
 * the abort now says what it is, and the run records its own progress (`migrations/state`).
 */
const UPSTREAM_BOUND_MS = 45_000

async function proxy(req: NextRequest, path: string[]) {
  // #308 defense-in-depth: this route injects ADMIN_SECRET_KEY into upstream calls,
  // so it must verify the caller itself — not merely rely on middleware. Require a
  // signed-in Supabase user on the admin allowlist; otherwise 401 (never proxy).
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAllowedAdminEmail(user?.email)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  // Admin key is read SERVER-SIDE only. Never fall back to NEXT_PUBLIC_* — that would
  // ship the admin secret into the browser bundle (full auth bypass).
  const key = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET || ''
  if (!key) return NextResponse.json({ success: false, error: 'Admin key not configured — check ADMIN_SECRET_KEY env var' }, { status: 401 })

  // Forward the query string too — without req.nextUrl.search, GET calls like
  // /operator/board?client_id=… reach the API with NO client_id, which returned
  // "Unknown client_id" for every client (the Vida board never loaded).
  const url = `${API}/${path.join('/')}${req.nextUrl.search}`
  const isGet = req.method === 'GET'
  let res: Response
  // ── ⚑ 14 Sep — THIS HOP HAD NO BOUND AT ALL, AND NOW ONE OF ITS ROUTES WAITS ON A MODEL ──
  //
  // 🛑 EVERY OPERATOR CALL GOES THROUGH HERE, including Vida's conversation. With no timeout
  // an upstream that never answers holds the operator's request open for as long as the
  // platform allows and the console shows a spinner that resolves into nothing.
  //
  // ⛓️ 17 Sep (XC-3) — THE ABORT USED TO BE REPORTED AS "API unreachable", the same sentence a
  // network failure gets. Those are different facts and they need different actions: one means
  // nothing happened, the other means SOMETHING MAY STILL BE HAPPENING. See below.
  const bound = AbortSignal.timeout(UPSTREAM_BOUND_MS)
  try {
    res = await fetch(url, {
      method:  req.method,
      signal:  bound,
      // #486 — forward the VERIFIED operator email (from the Supabase session checked
      // above). The API trusts x-operator-email ONLY because it always arrives with a
      // valid x-admin-key, which only this server-side proxy holds — a browser can never
      // set it. This is what names the operator in operator_audit_log.
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key, 'x-operator-email': user!.email ?? 'unknown-operator' },
      body:    isGet ? undefined : await req.text(),
    })
  } catch (e: unknown) {
    // ── ⚑ 17 Sep (XC-3) — A TIMEOUT IS NOT AN UNREACHABLE API ─────────────────────────────
    //
    // 🛑 THE DEFECT, AND IT COST A REAL OPERATOR SESSION. Both cases returned
    // `{error: 'API unreachable'}` with a 503. But:
    //
    //   · A NETWORK FAILURE means the request never landed. Nothing happened. Retrying is
    //     free and is the right thing to do.
    //   · A TIMEOUT means WE stopped waiting. The request landed, the server is still working,
    //     and the work may well finish. Retrying is NOT free — on `migrations/run` a retry
    //     starts a second replay of 74 migrations against the same database.
    //
    // Telling somebody the API is down while it is mid-run, and inviting them to press the
    // button again, is the same class of defect as reporting a provider timeout as "no leads
    // matched": a "we could not tell" collapsed into a confident, wrong statement.
    //
    // ⚠️ THE SIGNAL IS STRUCTURED, not matched on a message. `AbortSignal.timeout` rejects with
    // a `TimeoutError`; an explicit abort gives `AbortError`. `bound.aborted` is checked too,
    // because a fetch can surface the abort under its own error name.
    const name = (e as { name?: unknown } | null)?.name
    const timedOut = bound.aborted || name === 'TimeoutError' || name === 'AbortError'
    if (timedOut) {
      return NextResponse.json({
        success: false,
        timeout: true,
        timeout_ms: UPSTREAM_BOUND_MS,
        error:
          `The API did not answer within ${Math.round(UPSTREAM_BOUND_MS / 1000)}s, so this request was abandoned — but the work may still be running on the server. ` +
          `Do NOT simply press the button again: read the state instead (for a migration run, Vida → Engine re-reads the applied-migration ledger).`,
      }, { status: 504 })
    }
    return NextResponse.json({
      success: false,
      timeout: false,
      error: `API unreachable — the request never reached ${API.replace(/^https?:\/\//, '')} (${(e as { message?: unknown } | null)?.message ?? 'no detail'}). Nothing happened, so retrying is safe.`,
    }, { status: 503 })
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ success: false, error: `API returned non-JSON response (${res.status})` }, { status: res.status || 500 })
  }
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}

export async function PUT(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
