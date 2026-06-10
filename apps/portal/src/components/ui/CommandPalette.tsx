'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Home,
  Users,
  TrendingUp,
  Search,
  Target,
  Inbox,
  BarChart,
  Brain,
  CreditCard,
  Settings,
  BarChart2,
  Command,
  ArrowRight,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  group: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home',            href: '/dashboard',                icon: Home,        group: 'Navigate' },
  { label: 'People',          href: '/dashboard/leads',          icon: Users,       group: 'Navigate' },
  { label: 'ICP Builder',     href: '/dashboard/leads/icp',      icon: TrendingUp,  group: 'Navigate' },
  { label: 'LinkedIn Import', href: '/dashboard/leads/linkedin', icon: Search,      group: 'Navigate' },
  { label: 'Campaigns',       href: '/dashboard/figsy',          icon: Target,      group: 'FIGSY' },
  { label: 'Inbox',           href: '/dashboard/figsy/replies',  icon: Inbox,       group: 'FIGSY' },
  { label: 'Performance',     href: '/dashboard/kpis',           icon: BarChart,    group: 'FIGSY' },
  { label: 'Knowledge',       href: '/dashboard/knowledge',      icon: Brain,       group: 'FIGSY' },
  { label: 'Billing',         href: '/dashboard/billing',        icon: CreditCard,  group: 'Account' },
  { label: 'Settings',        href: '/dashboard/settings',       icon: Settings,    group: 'Account' },
  { label: 'Usage',           href: '/dashboard/usage',          icon: BarChart2,   group: 'Account' },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Filtered results
  const filtered = query.trim()
    ? NAV_ITEMS.filter(item =>
        item.label.toLowerCase().includes(query.toLowerCase())
      )
    : NAV_ITEMS

  // Groups (only used when no query)
  const groups = query.trim()
    ? null
    : Array.from(new Set(NAV_ITEMS.map(item => item.group)))

  const handleOpen = useCallback(() => {
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
  }, [])

  const handleSelect = useCallback(
    (href: string) => {
      handleClose()
      router.push(href)
    },
    [handleClose, router]
  )

  // Global keydown listener for Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) {
          handleClose()
        } else {
          handleOpen()
        }
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleOpen, handleClose])

  // Arrow key / Enter / Escape navigation when open
  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        handleClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex(i => (i + 1) % filtered.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex(i => (i - 1 + filtered.length) % filtered.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const selected = filtered[activeIndex]
        if (selected) handleSelect(selected.href)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, filtered, activeIndex, handleClose, handleSelect])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
    }
  }, [open])

  // Reset active index when filtered results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query])

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector('[data-active="true"]')
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl border border-purple-100 max-w-xl w-full mx-4 mt-[15vh] overflow-hidden">
        {/* Search input row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-purple-50">
          <Command className="w-5 h-5 text-purple-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search pages…"
            className="flex-1 text-lg bg-transparent text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 border-none"
          />
          {query && (
            <button
              onMouseDown={(e) => { e.preventDefault(); setQuery('') }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200">clear</span>
            </button>
          )}
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              No results for &ldquo;{query}&rdquo;
            </div>
          ) : groups ? (
            // Grouped view (no search query)
            groups.map(group => {
              const groupItems = filtered.filter(item => item.group === group)
              return (
                <div key={group}>
                  <div className="px-4 pt-3 pb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                      {group}
                    </span>
                  </div>
                  {groupItems.map(item => {
                    const globalIdx = filtered.indexOf(item)
                    const isActive = globalIdx === activeIndex
                    const Icon = item.icon
                    return (
                      <button
                        key={item.href}
                        data-active={isActive}
                        onMouseEnter={() => setActiveIndex(globalIdx)}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(item.href) }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          isActive
                            ? 'bg-[#F5F0FF] text-[#7C3AED]'
                            : 'text-gray-700 hover:bg-purple-50'
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#7C3AED]' : 'text-gray-400'}`} />
                        <span className="flex-1 text-sm font-medium">{item.label}</span>
                        {isActive && <ArrowRight className="w-4 h-4 text-[#7C3AED]/60 shrink-0" />}
                      </button>
                    )
                  })}
                </div>
              )
            })
          ) : (
            // Flat filtered view (search query active)
            filtered.map((item, idx) => {
              const isActive = idx === activeIndex
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  data-active={isActive}
                  onMouseEnter={() => setActiveIndex(idx)}
                  onMouseDown={(e) => { e.preventDefault(); handleSelect(item.href) }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    isActive
                      ? 'bg-[#F5F0FF] text-[#7C3AED]'
                      : 'text-gray-700 hover:bg-purple-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#7C3AED]' : 'text-gray-400'}`} />
                  <span className="flex-1 text-sm font-medium">{item.label}</span>
                  {isActive && <ArrowRight className="w-4 h-4 text-[#7C3AED]/60 shrink-0" />}
                </button>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-purple-50 flex items-center gap-4">
          <span className="text-[11px] text-gray-400 font-mono">
            <span className="font-sans">⌘K to open</span>
            <span className="mx-1.5 opacity-40">•</span>
            ↑↓ to navigate
            <span className="mx-1.5 opacity-40">•</span>
            ↵ to go
            <span className="mx-1.5 opacity-40">•</span>
            esc to close
          </span>
        </div>
      </div>
    </div>
  )
}
