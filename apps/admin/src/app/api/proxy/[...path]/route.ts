export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const API = 'https://kindapi-production-e64c.up.railway.app'

async function proxy(req: NextRequest, path: string[]) {
  const key = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_KEY || ''
  if (!key) return NextResponse.json({ success: false, error: 'Admin key not configured — check ADMIN_SECRET_KEY env var' }, { status: 401 })

  const url = `${API}/${path.join('/')}`
  const isGet = req.method === 'GET'
  let res: Response
  try {
    res = await fetch(url, {
      method:  req.method,
      headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
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

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
