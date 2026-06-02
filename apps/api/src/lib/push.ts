// Web Push helper — sends PWA push notifications to a client's subscribed
// devices. Fully optional: if VAPID keys are not set, every function is a
// no-op so the rest of the platform is unaffected.
//
// To enable, generate a key pair once with:  npx web-push generate-vapid-keys
// then set in Railway (and Render) API env:
//   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:you@get-kind.com)
// and expose the public key to the portal as NEXT_PUBLIC_VAPID_PUBLIC_KEY.

import webpush from 'web-push'
import { db } from '@kind/db'

const PUBLIC  = process.env.VAPID_PUBLIC_KEY
const PRIVATE = process.env.VAPID_PRIVATE_KEY
const SUBJECT = process.env.VAPID_SUBJECT || 'mailto:hello@get-kind.com'

export const pushEnabled = Boolean(PUBLIC && PRIVATE)

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC!, PRIVATE!)
}

export interface PushPayload {
  title: string
  body: string
  url?: string
  tag?: string
}

// Send a push to every device a client has subscribed. Silently no-ops when
// push is disabled. Prunes subscriptions the browser has expired (410/404).
export async function sendPushToClient(clientId: string, payload: PushPayload): Promise<void> {
  if (!pushEnabled) return
  const { data: subs } = await db.from('push_subscriptions')
    .select('endpoint, p256dh, auth').eq('client_id', clientId)
  if (!subs?.length) return

  await Promise.all(subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify(payload),
      )
    } catch (err: unknown) {
      const code = (err as { statusCode?: number })?.statusCode
      if (code === 404 || code === 410) {
        // Subscription is dead — remove it so we stop trying.
        await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint).then(() => {}, () => {})
      }
    }
  }))
}
