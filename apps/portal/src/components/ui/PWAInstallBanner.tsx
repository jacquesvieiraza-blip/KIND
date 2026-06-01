'use client'

import { useEffect, useState } from 'react'
import { X, Smartphone } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [showIOSGuide, setShowIOSGuide] = useState(false)

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) return
    if (localStorage.getItem('pwa_banner_dismissed')) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as unknown as { MSStream: unknown }).MSStream
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('pwa_banner_dismissed', '1')
  }

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setDismissed(true)
    setPrompt(null)
  }

  // Nothing to show
  if (dismissed) return null
  if (!prompt && !isIOS) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:w-80">
      <div className="bg-white rounded-2xl shadow-xl border border-purple-100 p-4 flex gap-3 items-start">
        <div className="w-10 h-10 rounded-xl bg-[#7C3AED] flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900">Add K.I.N.D to your home screen</p>
          {isIOS && !showIOSGuide ? (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="text-xs text-[#7C3AED] font-medium mt-0.5 hover:underline"
            >
              Show me how
            </button>
          ) : isIOS && showIOSGuide ? (
            <p className="text-xs text-gray-500 mt-0.5">
              Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>
            </p>
          ) : (
            <button
              onClick={install}
              className="mt-1.5 text-xs bg-[#7C3AED] text-white font-semibold px-3 py-1.5 rounded-lg hover:bg-[#6D28D9] transition-colors"
            >
              Install app
            </button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 hover:bg-gray-100 rounded-lg transition-colors shrink-0">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </div>
  )
}
