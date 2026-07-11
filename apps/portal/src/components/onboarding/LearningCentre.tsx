'use client'

/**
 * LearningCentre (#454, Phase 6 · buildplan §10) — the permanent "Learn with FIGSY"
 * grid below the dashboard content. Six cards from config (thumbnail · title · one-line
 * desc · duration · Watch · New badge · watched state) + a "View all videos" link.
 *
 * A card with an empty `youtube_id` shows a tasteful "coming soon" state — NEVER a
 * broken embed. Watched state persists in localStorage. Brand token #7C3AED.
 */

import { useEffect, useState } from 'react'
import { Play, GraduationCap, Check } from 'lucide-react'
import { ONBOARDING_VIDEOS, youtubeThumbnail, type OnboardingVideo } from '@/lib/onboarding-videos'
import { VideoPlayerModal } from './VideoPlayerModal'

const BRAND = '#7C3AED'
const WATCHED_KEY = 'kind_videos_watched'

function readWatched(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(WATCHED_KEY) || '[]')) }
  catch { return new Set() }
}

export function LearningCentre() {
  const [playing, setPlaying] = useState<OnboardingVideo | null>(null)
  const [watched, setWatched] = useState<Set<string>>(new Set())

  useEffect(() => { setWatched(readWatched()) }, [])

  function watch(v: OnboardingVideo) {
    if (!v.youtube_id) return // coming soon — nothing to play
    setPlaying(v)
    setWatched(prev => {
      const next = new Set(prev).add(v.id)
      try { localStorage.setItem(WATCHED_KEY, JSON.stringify(Array.from(next))) } catch { /* ignore */ }
      return next
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-[#EDE9FE] p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#7C3AED]/10 flex items-center justify-center">
            <GraduationCap className="w-3.5 h-3.5" style={{ color: BRAND }} />
          </div>
          <h2 className="font-semibold text-[#1E0A5C] text-sm">Learn with FIGSY</h2>
        </div>
        {/* View all → for now the Learning Centre IS the full list; anchor kept for a
            future dedicated page (mobile/full index is Phase 8, out of scope). */}
        <a href="#learn-with-figsy" className="text-xs text-[#7C3AED] hover:underline">View all videos</a>
      </div>

      <div id="learn-with-figsy" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {ONBOARDING_VIDEOS.map(v => {
          const comingSoon = !v.youtube_id
          const isWatched = watched.has(v.id)
          return (
            <div key={v.id} className="rounded-xl border border-[#EDE9FE] overflow-hidden flex flex-col">
              <button
                onClick={() => watch(v)}
                disabled={comingSoon}
                className="relative block w-full aspect-video bg-[#F5F0FF] group disabled:cursor-default"
                aria-label={comingSoon ? `${v.title} — coming soon` : `Watch ${v.title}`}
              >
                {comingSoon ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-[#9B8EC4]">Coming soon</span>
                  </div>
                ) : (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={youtubeThumbnail(v.youtube_id)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                      <span className="w-11 h-11 rounded-full bg-white/95 flex items-center justify-center shadow">
                        <Play className="w-5 h-5 translate-x-0.5" style={{ color: BRAND }} />
                      </span>
                    </span>
                  </>
                )}
                {v.isNew && (
                  <span className="absolute top-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full" style={{ background: BRAND }}>New</span>
                )}
                {v.duration && (
                  <span className="absolute bottom-2 right-2 text-[10px] font-semibold text-white bg-black/70 px-1.5 py-0.5 rounded">{v.duration}</span>
                )}
              </button>
              <div className="p-3 flex-1 flex flex-col">
                <div className="flex items-start gap-1.5">
                  <p className="text-sm font-semibold text-[#1E0A5C] flex-1">{v.title}</p>
                  {isWatched && <Check className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: BRAND }} aria-label="Watched" />}
                </div>
                <p className="text-xs text-[#9B8EC4] mt-0.5 flex-1">{v.description}</p>
                <button
                  onClick={() => watch(v)}
                  disabled={comingSoon}
                  className="mt-2 self-start text-xs font-semibold text-[#7C3AED] disabled:text-[#C4B5FD] disabled:cursor-default hover:underline"
                >
                  {comingSoon ? 'Coming soon' : 'Watch →'}
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {playing && <VideoPlayerModal video={playing} onClose={() => setPlaying(null)} />}
    </section>
  )
}
