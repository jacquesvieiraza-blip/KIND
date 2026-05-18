export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'

const API = 'https://kindapi-production-e64c.up.railway.app'

async function proxy(req: NextRequest, path: string[]) {
  const key = process.env.ADMIN_SECRET_KEY || process.env.ADMIN_SECRET || process.env.NEXT_PUBLIC_ADMIN_KEY || ''
  const url = `${API}/${path.join('/')}`
  const isGet = req.method === 'GET'
  const res = await fetch(url, {
    method:  req.method,
    headers: { 'Content-Type': 'application/json', 'x-admin-key': key },
    body:    isGet ? undefined : await req.text(),
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(req, params.path)
}
