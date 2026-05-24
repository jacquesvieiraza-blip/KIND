'use client'

import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export function DarkModeToggle() {
  const [dark, setDark] = useState(false)

  useEffect(() => {
    // Sync with whatever the inline script applied before React loaded
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  function toggle() {
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('kind_theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('kind_theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
    >
      {dark
        ? <Sun  className="w-4 h-4 shrink-0" />
        : <Moon className="w-4 h-4 shrink-0" />}
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}
