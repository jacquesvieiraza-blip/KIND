'use client'

import { useEffect } from 'react'
import { Zap } from 'lucide-react'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <html lang="en">
      <body>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 max-w-md w-full text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-7 h-7 text-[#0066FF]" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-500 text-sm mb-6">We hit an unexpected error. Please try again or contact support.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={reset}
                className="bg-[#0066FF] hover:bg-[#0055dd] text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors">
                Try again
              </button>
              <a href="mailto:hello@get-kind.com"
                className="border border-gray-200 hover:border-gray-400 text-gray-600 font-medium px-5 py-2.5 rounded-xl text-sm transition-colors">
                Contact support
              </a>
            </div>
            {error.digest && (
              <p className="text-xs text-gray-400 mt-4">Error ID: {error.digest}</p>
            )}
          </div>
        </div>
      </body>
    </html>
  )
}
