'use client'

/**
 * VideoPlayerModal (#454, Phase 6) — plays a Learning Centre video in a modal via the
 * privacy-enhanced YouTube embed (youtube-nocookie.com). Must-haves per §10: play
 * (opens the embed), duration shown from config. Resume-where-left-off via the iframe
 * API is a documented nicety, intentionally skipped to avoid complexity.
 *
 * NOTE: the embed needs the CSP frame-src allowance for youtube-nocookie.com — see the
 * directives documented in apps/portal/next.config.mjs.
 */

import { X } from 'lucide-react'
import type { OnboardingVideo } from '@/lib/onboarding-videos'
import { youtubeEmbedUrl } from '@/lib/onboarding-videos'

export function VideoPlayerModal({ video, onClose }: { video: OnboardingVideo; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={video.title}>
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative w-full max-w-3xl">
        <div className="flex items-center justify-between mb-2">
          <div className="min-w-0">
            <p className="text-white font-semibold truncate">{video.title}</p>
            {video.duration && <p className="text-white/60 text-xs">{video.duration}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-white/80 hover:bg-white/10 transition-colors" aria-label="Close video">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative w-full overflow-hidden rounded-2xl bg-black" style={{ paddingTop: '56.25%' }}>
          <iframe
            className="absolute inset-0 w-full h-full"
            src={`${youtubeEmbedUrl(video.youtube_id)}?rel=0&modestbranding=1&autoplay=1`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
