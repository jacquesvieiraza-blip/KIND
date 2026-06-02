// Browser-side Web Push subscription. Quietly does nothing unless the API has
// VAPID keys configured AND the user grants notification permission. Safe to
// call on every dashboard load.

import { api } from '@/lib/api'

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

export async function ensurePushSubscription(token: string): Promise<void> {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

    // Only subscribe if the user has already granted permission (we never
    // prompt automatically — the prompt is triggered from a settings toggle).
    if (Notification.permission !== 'granted') return

    const vapid = await api.get<{ data: { enabled: boolean; publicKey: string | null } }>(
      '/clients/push/vapid-key', token,
    )
    if (!vapid.data.enabled || !vapid.data.publicKey) return

    const reg = await navigator.serviceWorker.ready
    let sub = await reg.pushManager.getSubscription()
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid.data.publicKey) as BufferSource,
      })
    }

    const json = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } }
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return

    await api.post('/clients/me/push-subscribe', {
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
    }, token)
  } catch { /* push is best-effort — never block the app */ }
}

// Called from a user gesture (settings toggle) to request permission, then
// subscribe. Returns the resulting permission state.
export async function requestPushPermission(token: string): Promise<NotificationPermission> {
  try {
    if (!('Notification' in window)) return 'denied'
    const perm = await Notification.requestPermission()
    if (perm === 'granted') await ensurePushSubscription(token)
    return perm
  } catch {
    return 'denied'
  }
}
