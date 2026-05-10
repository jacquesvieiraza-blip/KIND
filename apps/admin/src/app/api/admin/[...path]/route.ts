import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.API_URL || 'https://kindapi-production.up.railway.app'
const ADMIN_SECRET = process.env.ADMIN_SECRET || ''

export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(params.path, 'GET')
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(params.path, 'POST', await req.text())
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(params.path, 'PATCH', await req.text())
}

export async function DELETE(_req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxy(params.path, 'DELETE')
}

async function proxy(pathParts: string[], method: string, body?: string) {
  const path = pathParts.join('/')
  const res = await fetch(`${API_URL}/admin-api/${path}`, {
    method,
    headers: {
      'x-admin-secret': ADMIN_SECRET,
      'Content-Type': 'application/json',
    },
    body: body || undefined,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
