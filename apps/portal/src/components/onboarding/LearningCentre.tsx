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
import { Play, GraduationCap, Check, RotateCcw, Sparkles, Rocket, Target, Search, Send, Coins, type LucideIcon } from 'lucide-react'
import { ONBOARDING_VIDEOS, youtubeThumbnail, type OnboardingVideo, type VideoCategory } from '@/lib/onboarding-videos'
import { VideoPlayerModal } from './VideoPlayerModal'
import { useOnboarding } from './OnboardingProvider'

// Placeholder art per category — a card with no youtube_id yet renders a designed
// brand tile (gradient + dot grid + icon + FIGSY avatar) instead of a blank box, so
// the section always looks finished on screen/recordings. Brand tokens only.
const CATEGORY_ICON: Record<VideoCategory, LucideIcon> = {
  'whats-new': Sparkles,
  'getting-started': Rocket,
  'icp': Target,
  'leads': Search,
  'campaigns': Send,
  'billing': Coins,
}

function PlaceholderArt({ category }: { category: VideoCategory }) {
  const Icon = CATEGORY_ICON[category] ?? Sparkles
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(135deg,#F5F0FF,#EDE9FE)',
        backgroundImage: 'radial-gradient(#E4DCFB 1.5px, transparent 1.5px), linear-gradient(135deg,#F5F0FF,#EDE9FE)',
        backgroundSize: '16px 16px, cover',
      }}
    >
      {/* big soft watermark icon */}
      <Icon className="absolute -bottom-3 -right-2 w-20 h-20 text-[#7C3AED] opacity-[0.08]" />
      {/* centred icon medallion */}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-[#EDE9FE] flex items-center justify-center">
          <Icon className="w-5 h-5" style={{ color: BRAND }} />
        </span>
      </span>
      {/* FIGSY avatar chip — it's his course */}
      <span className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-white/90 rounded-full pl-0.5 pr-2 py-0.5 border border-[#EDE9FE]">
        <span className="w-5 h-5 rounded-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/agents/figsy.png" alt="" className="w-full h-full object-cover object-top" />
        </span>
        <span className="text-[9px] font-bold text-[#7C3AED]">FIGSY</span>
      </span>
      <span className="absolute bottom-2 right-2 text-[9px] font-bold text-[#9B8EC4] bg-white/90 border border-[#EDE9FE] px-1.5 py-0.5 rounded-full">
        Coming soon
      </span>
    </div>
  )
}

const BRAND = '#7C3AED'
const WATCHED_KEY = 'kind_videos_watched'

function readWatched(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(WATCHED_KEY) || '[]')) }
  catch { return new Set() }
}

export function LearningCentre() {
  const [playing, setPlaying] = useState<OnboardingVideo | null>(null)
  const [watched, setWatched] = useState<Set<string>>(new Set())
  // F2 — the tour's only permanent re-entry point. startTour() resumes a skipped /
  // completed tour from its remembered step (see OnboardingProvider), so a client who
  // hit "Skip tour" is never locked out. Always present, regardless of tour status.
  const { startTour } = useOnboarding()

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
        <div className="flex items-center gap-3">
          <button
            onClick={startTour}
            className="flex items-center gap-1 text-xs font-semibold text-[#7C3AED] hover:underline"
          >
            <RotateCcw className="w-3 h-3" /> Restart the guided tour
          </button>
          {/* View all → for now the Learning Centre IS the full list; anchor kept for a
              future dedicated page (mobile/full index is Phase 8, out of scope). */}
          <a href="#learn-with-figsy" className="text-xs text-[#7C3AED] hover:underline">View all videos</a>
        </div>
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
                  <PlaceholderArt category={v.category} />
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
