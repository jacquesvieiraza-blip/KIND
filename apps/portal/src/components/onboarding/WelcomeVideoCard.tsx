'use client'

/**
 * WelcomeVideoCard (#454, Phase 6) — the first-login card on /dashboard. Skippable and
 * resumable: the "seen" state rides on the onboarding status (hidden once the client
 * has started/skipped/finished the tour) with a localStorage fallback for the
 * dismissed-but-not-started case. Its primary button kicks off the guided tour.
 *
 * If a real welcome video is configured it plays inline; until the founder pastes a
 * youtube_id it shows a tasteful FIGSY intro (never a broken embed).
 */

import { useEffect, useState } from 'react'
import { Play, X, Sparkles } from 'lucide-react'
import { useOnboarding } from './OnboardingProvider'
import { welcomeVideo, WELCOME_PANE_IMAGE } from '@/lib/onboarding-videos'
import { VideoPlayerModal } from './VideoPlayerModal'

const BRAND = '#7C3AED'
const SEEN_KEY = 'kind_welcome_seen'

export function WelcomeVideoCard() {
  const { ready, saved, startTour } = useOnboarding()
  const [dismissed, setDismissed] = useState(true) // default hidden until we know state
  const [playing, setPlaying] = useState(false)
  const video = welcomeVideo()

  useEffect(() => {
    if (!ready) return
    let seen = false
    try { seen = localStorage.getItem(SEEN_KEY) === '1' } catch { /* ignore */ }
    // "Seen" rides on onboarding state: anything past not_started means they've engaged.
    const engaged = saved.status !== 'not_started'
    setDismissed(seen || engaged)
  }, [ready, saved.status])

  function markSeen() {
    try { localStorage.setItem(SEEN_KEY, '1') } catch { /* ignore */ }
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="relative rounded-2xl overflow-hidden border border-purple-100 shadow-sm"
      style={{ background: 'linear-gradient(135deg,#F5F0FF,#FFFFFF)' }}>
      <button
        onClick={markSeen}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-[#9B8EC4] hover:bg-white/60 transition-colors"
        aria-label="Dismiss welcome"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex flex-col sm:flex-row">
        {/* Video / intro pane */}
        <button
          onClick={() => video && setPlaying(true)}
          disabled={!video}
          className="relative sm:w-72 shrink-0 aspect-video sm:aspect-auto bg-[#EDE9FE] flex items-center justify-center group disabled:cursor-default"
          aria-label={video ? 'Play the welcome video' : 'Welcome'}
        >
          {video ? (
            <span className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <Play className="w-6 h-6 translate-x-0.5" style={{ color: BRAND }} />
            </span>
          ) : (
            /* No video id yet → pre-rendered dashboard mockup, never a blank pane. */
            <div className="absolute inset-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={WELCOME_PANE_IMAGE} alt="" className="absolute inset-0 w-full h-full object-cover object-left-top" />
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 text-[9px] font-bold text-[#7C3AED] bg-white/90 border border-[#EDE9FE] px-2 py-0.5 rounded-full whitespace-nowrap">
                <Sparkles className="w-2.5 h-2.5" /> Welcome video coming soon
              </span>
            </div>
          )}
        </button>

        {/* Copy + CTA */}
        <div className="flex-1 p-5">
          <p className="text-[11px] font-bold tracking-wide uppercase" style={{ color: BRAND }}>Welcome to K.I.N.D</p>
          <h3 className="mt-1 text-lg font-bold text-[#1E1152]">Let&apos;s get FIGSY working for you</h3>
          <p className="mt-1 text-sm text-gray-600 leading-relaxed">
            In a few guided steps I&apos;ll help you find your best-fit leads, unmask the ones you like,
            and launch your first campaign. It takes about 5 minutes.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => { markSeen(); startTour() }}
              style={{ background: BRAND }}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Start the guided tour
            </button>
            <button
              onClick={markSeen}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#7C3AED] bg-purple-50 hover:bg-purple-100 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>

      {playing && video && <VideoPlayerModal video={video} onClose={() => setPlaying(false)} />}
    </div>
  )
}
