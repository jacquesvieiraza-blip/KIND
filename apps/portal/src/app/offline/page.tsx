'use client'

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'linear-gradient(135deg, #FFF5EE 0%, #EDE6FF 100%)' }}>
      <div className="w-16 h-16 rounded-2xl bg-[#7C3AED] flex items-center justify-center text-white font-bold text-3xl shadow-lg">
        K
      </div>
      <h1 className="text-xl font-semibold text-gray-900">You&apos;re offline</h1>
      <p className="text-sm text-gray-500 text-center max-w-xs">
        Check your connection and try again. Your data is saved and will sync when you&apos;re back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-5 py-2.5 bg-[#7C3AED] text-white text-sm font-semibold rounded-lg hover:bg-[#6D28D9] transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
