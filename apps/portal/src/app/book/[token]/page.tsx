'use client'

/**
 * PUBLIC PROSPECT BOOKING PAGE (#361b) — /book/<signed-token>
 * ----------------------------------------------------------------------------
 * A cold prospect lands here from the link FIGSY drops in a sequence email. No
 * login: the signed token in the URL IS the authorization (binds lead→client,
 * verified server-side). They see the client's live open slots (in THEIR OWN
 * browser timezone), pick one, and FIGSY books it straight into the client's
 * Google Calendar with a Meet link. Honest states only — success shows the real
 * meeting link the API returned; it never claims "booked" otherwise.
 */

import { useState, useEffect, useCallback, use } from 'react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://kindapi-production-e64c.up.railway.app'

interface Slot { start: string; end: string }
type Phase = 'loading' | 'ready' | 'invalid' | 'disconnected' | 'empty' | 'booking' | 'booked' | 'error'

export default function BookingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [phase, setPhase]     = useState<Phase>('loading')
  const [slots, setSlots]     = useState<Slot[]>([])
  const [company, setCompany] = useState<string | null>(null)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [meetLink, setMeetLink] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')

  const tz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  const loadSlots = useCallback(async () => {
    setPhase('loading')
    try {
      const res = await fetch(`${API_URL}/calendar/public/${token}/slots`)
      if (res.status === 404) { setPhase('invalid'); return }
      if (!res.ok) { setPhase('error'); setErrorMsg('Could not load available times.'); return }
      const data = await res.json() as { connected?: boolean; slots?: Slot[]; company?: string | null }
      setCompany(data.company ?? null)
      if (!data.connected) { setPhase('disconnected'); return }
      const s = data.slots ?? []
      setSlots(s)
      setPhase(s.length === 0 ? 'empty' : 'ready')
    } catch {
      setPhase('error'); setErrorMsg('Could not load available times. Please check your connection.')
    }
  }, [token])

  useEffect(() => { void loadSlots() }, [loadSlots])

  async function confirm() {
    if (!selected) return
    setPhase('booking')
    try {
      const res = await fetch(`${API_URL}/calendar/public/${token}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start: selected.start, end: selected.end }),
      })
      const data = await res.json().catch(() => ({})) as { success?: boolean; meetLink?: string | null; error?: string; existing?: { start?: string | null; meetLink?: string | null } }
      if (res.ok && data.success) {
        setMeetLink(data.meetLink ?? null)
        setPhase('booked')
        return
      }
      if (res.status === 409) {
        // Slot taken, or a meeting already exists for this prospect.
        if (data.existing) {
          setMeetLink(data.existing.meetLink ?? null)
          setPhase('booked')
          return
        }
        setErrorMsg(data.error ?? 'That time was just taken. Please pick another.')
        setSelected(null)
        await loadSlots()
        return
      }
      setErrorMsg(data.error ?? 'Could not book that time. Please try another.')
      setPhase('error')
    } catch {
      setErrorMsg('Could not reach the booking service. Please try again.')
      setPhase('error')
    }
  }

  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

  // Group slots by local day for a clean picker.
  const byDay = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    const key = fmtDay(s.start)
    ;(acc[key] ??= []).push(s)
    return acc
  }, {})

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.bar} />
        <div style={styles.body}>
          <div style={styles.brand}>K.I.N.D</div>

          {phase === 'loading' && <p style={styles.muted}>Loading available times…</p>}

          {phase === 'invalid' && (
            <>
              <h1 style={styles.h1}>This link isn’t valid</h1>
              <p style={styles.muted}>This booking link is invalid or has expired. If you still want to meet, just reply to the email and we’ll sort out a time.</p>
            </>
          )}

          {phase === 'disconnected' && (
            <>
              <h1 style={styles.h1}>Booking isn’t available right now</h1>
              <p style={styles.muted}>{company ? `${company}’s` : 'The'} calendar isn’t connected at the moment. Please reply to the email and we’ll find a time together.</p>
            </>
          )}

          {phase === 'empty' && (
            <>
              <h1 style={styles.h1}>No open times right now</h1>
              <p style={styles.muted}>There aren’t any free slots in the next two weeks. Reply to the email and we’ll make one work.</p>
            </>
          )}

          {(phase === 'ready' || phase === 'booking') && (
            <>
              <h1 style={styles.h1}>{company ? `Book a 15-min chat with ${company}` : 'Book a 15-min chat'}</h1>
              <p style={styles.muted}>Pick a time that suits you. Times shown in your timezone ({tz}).</p>
              {errorMsg && <p style={styles.warn}>{errorMsg}</p>}

              <div style={styles.days}>
                {Object.entries(byDay).map(([day, daySlots]) => (
                  <div key={day} style={styles.dayBlock}>
                    <div style={styles.dayLabel}>{day}</div>
                    <div style={styles.slotRow}>
                      {daySlots.map(s => {
                        const active = selected?.start === s.start
                        return (
                          <button
                            key={s.start}
                            onClick={() => setSelected(s)}
                            style={{ ...styles.slot, ...(active ? styles.slotActive : {}) }}
                            disabled={phase === 'booking'}
                          >
                            {fmtTime(s.start)}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={confirm}
                disabled={!selected || phase === 'booking'}
                style={{ ...styles.cta, ...(!selected || phase === 'booking' ? styles.ctaDisabled : {}) }}
              >
                {phase === 'booking'
                  ? 'Booking…'
                  : selected
                    ? `Confirm ${fmtDay(selected.start)} at ${fmtTime(selected.start)}`
                    : 'Select a time'}
              </button>
            </>
          )}

          {phase === 'booked' && (
            <>
              <div style={styles.check}>✓</div>
              <h1 style={styles.h1}>You’re booked in</h1>
              <p style={styles.muted}>A calendar invite is on its way to your inbox{company ? ` from ${company}` : ''}.</p>
              {meetLink && (
                <a href={meetLink} target="_blank" rel="noopener noreferrer" style={styles.cta}>
                  Join the video call
                </a>
              )}
            </>
          )}

          {phase === 'error' && (
            <>
              <h1 style={styles.h1}>Something went wrong</h1>
              <p style={styles.muted}>{errorMsg || 'Please try again in a moment.'}</p>
              <button onClick={loadSlots} style={styles.cta}>Try again</button>
            </>
          )}
        </div>
      </div>
      <p style={styles.footer}>Powered by K.I.N.D</p>
    </div>
  )
}

const PURPLE = '#7C3AED'
const styles: Record<string, React.CSSProperties> = {
  wrap:   { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#faf8ff 0%,#f3eefe 100%)', padding: '24px', fontFamily: 'system-ui,-apple-system,Segoe UI,Roboto,sans-serif' },
  card:   { width: '100%', maxWidth: 480, background: '#fff', borderRadius: 18, overflow: 'hidden', boxShadow: '0 12px 40px rgba(124,58,237,.12)', border: '1px solid #efe9fb' },
  bar:    { height: 5, background: 'linear-gradient(90deg,#FFD4B2 0%,#F9C8FF 34%,#C4B5FD 68%,#7C3AED 100%)' },
  body:   { padding: '32px 28px 28px' },
  brand:  { fontWeight: 800, letterSpacing: '.04em', color: PURPLE, fontSize: 14, marginBottom: 20 },
  h1:     { fontSize: 22, fontWeight: 700, color: '#1f1235', margin: '0 0 8px', lineHeight: 1.25 },
  muted:  { fontSize: 14, color: '#6b6280', margin: '0 0 18px', lineHeight: 1.5 },
  warn:   { fontSize: 13, color: '#b4530a', background: '#fff4e8', border: '1px solid #ffe0bf', borderRadius: 10, padding: '8px 12px', margin: '0 0 16px' },
  days:   { display: 'flex', flexDirection: 'column', gap: 14, margin: '4px 0 22px', maxHeight: 320, overflowY: 'auto' },
  dayBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  dayLabel: { fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: '#9b8ec4' },
  slotRow: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  slot:   { padding: '8px 14px', borderRadius: 10, border: '1px solid #e4dcf7', background: '#fff', color: '#4a3d6b', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  slotActive: { background: PURPLE, borderColor: PURPLE, color: '#fff' },
  cta:    { display: 'inline-block', width: '100%', textAlign: 'center', padding: '13px 18px', borderRadius: 12, border: 'none', background: PURPLE, color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', boxSizing: 'border-box' },
  ctaDisabled: { background: '#d8cef0', cursor: 'not-allowed' },
  check:  { width: 52, height: 52, borderRadius: '50%', background: '#e9fbef', color: '#16a34a', fontSize: 28, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 0 14px' },
  footer: { marginTop: 18, fontSize: 12, color: '#a89fbf' },
}
