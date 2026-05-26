/**
 * Flutterwave v3 payment library
 * All functions are no-ops (return null) if FLUTTERWAVE_SECRET_KEY is not set.
 * API reference: https://developer.flutterwave.com/reference
 */

const FLW_BASE = 'https://api.flutterwave.com/v3'

function getKey(): string | null {
  return process.env.FLUTTERWAVE_SECRET_KEY || null
}

function authHeaders(key: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${key}`,
    'Content-Type': 'application/json',
  }
}

// ── createFlutterwavePaymentLink ──────────────────────────────────────────────
export interface FlutterwavePaymentParams {
  email: string
  name: string
  amount_usd: number
  currency: 'ZAR' | 'NGN' | 'KES' | 'GHS' | 'USD' | 'GBP'
  tx_ref: string
  redirect_url: string
  meta: Record<string, string | number>
}

export async function createFlutterwavePaymentLink(
  params: FlutterwavePaymentParams,
): Promise<{ link: string } | null> {
  const key = getKey()
  if (!key) return null

  try {
    const body = {
      tx_ref: params.tx_ref,
      amount: params.amount_usd,
      currency: params.currency,
      redirect_url: params.redirect_url,
      customer: {
        email: params.email,
        name: params.name,
      },
      meta: params.meta,
      customizations: {
        title: 'K.I.N.D AI',
        logo: 'https://get-kind.com/logo.png',
      },
    }

    const res = await fetch(`${FLW_BASE}/payments`, {
      method: 'POST',
      headers: authHeaders(key),
      body: JSON.stringify(body),
    })

    const data = (await res.json()) as { status: string; data?: { link: string } }

    if (data.status === 'success' && data.data?.link) {
      return { link: data.data.link }
    }

    console.error('[Flutterwave] createPaymentLink unexpected response:', JSON.stringify(data))
    return null
  } catch (err) {
    console.error('[Flutterwave] createPaymentLink error:', err)
    return null
  }
}

// ── verifyFlutterwavePayment ──────────────────────────────────────────────────
export interface FlutterwaveVerifyResult {
  status: string
  amount: number
  currency: string
  customer_email: string
  meta: Record<string, unknown>
}

export async function verifyFlutterwavePayment(
  transaction_id: string,
): Promise<FlutterwaveVerifyResult | null> {
  const key = getKey()
  if (!key) return null

  try {
    const res = await fetch(`${FLW_BASE}/transactions/${transaction_id}/verify`, {
      method: 'GET',
      headers: authHeaders(key),
    })

    const data = (await res.json()) as {
      status: string
      data?: {
        status: string
        amount: number
        currency: string
        customer: { email: string }
        meta: Record<string, unknown>
      }
    }

    if (data.status === 'success' && data.data) {
      return {
        status: data.data.status,
        amount: data.data.amount,
        currency: data.data.currency,
        customer_email: data.data.customer?.email ?? '',
        meta: data.data.meta ?? {},
      }
    }

    console.error('[Flutterwave] verifyPayment unexpected response:', JSON.stringify(data))
    return null
  } catch (err) {
    console.error('[Flutterwave] verifyPayment error:', err)
    return null
  }
}

// ── getFlutterwaveExchangeRate ────────────────────────────────────────────────
export async function getFlutterwaveExchangeRate(
  from: string,
  to: string,
  amount: number,
): Promise<number | null> {
  const key = getKey()
  if (!key) return null

  try {
    const url = `${FLW_BASE}/transfers/rates?amount=${amount}&destination_currency=${to}&source_currency=${from}`
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(key),
    })

    const data = (await res.json()) as {
      status: string
      data?: { rate: number }
    }

    if (data.status === 'success' && data.data?.rate != null) {
      return data.data.rate
    }

    console.error('[Flutterwave] getExchangeRate unexpected response:', JSON.stringify(data))
    return null
  } catch (err) {
    console.error('[Flutterwave] getExchangeRate error:', err)
    return null
  }
}

export function isFlutterwaveConfigured(): boolean {
  return Boolean(process.env.FLUTTERWAVE_SECRET_KEY)
}
