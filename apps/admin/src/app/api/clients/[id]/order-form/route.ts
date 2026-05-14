import { NextResponse } from 'next/server'

// Order forms are no longer used — clients accept T&Cs via checkbox at Paystack checkout.
export async function GET()  { return NextResponse.json({ error: 'Order forms removed' }, { status: 410 }) }
export async function POST() { return NextResponse.json({ error: 'Order forms removed' }, { status: 410 }) }
