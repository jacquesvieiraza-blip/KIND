export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient, isAllowedAdminEmail } from '@/lib/supabase/server'

const API = 'https://kindapi-production-e64c.up.railway.app'

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
  try {
    res = await fetch(url, {
      method:  req.method,
      // #486 — forward the VERIFIED operator email (from the Supabase session checked
      // above). The API trusts x-operator-email ONLY because it always arrives with a
      // valid x-admin-key, which only this server-side proxy holds — a browser can never
      // set it. This is what names the operator in operator_audit_log.
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key, 'x-operator-email': user!.email ?? 'unknown-operator' },
      body:    isGet ? undefined : await req.text(),
    })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: 'API unreachable' }, { status: 503 })
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
