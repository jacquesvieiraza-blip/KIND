import Link from 'next/link'
import { ReactNode } from 'react'
import { ArrowRight, Lock } from 'lucide-react'

interface ProductCardProps {
  title: string
  description: string
  icon: ReactNode
  href: string
  status: 'active' | 'trialing' | 'inactive' | 'locked'
  metric: string
  upgradeHref?: string
}

const STATUS_STYLES = {
  active:   'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400',
  trialing: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400',
  inactive: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  locked:   'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
}
const STATUS_LABELS = {
  active:   'Active',
  trialing: 'Trial',
  inactive: 'Inactive',
  locked:   'Upgrade',
}

export function ProductCard({ title, description, icon, href, status, metric, upgradeHref }: ProductCardProps) {
  if (status === 'locked') {
    return (
      <div className="relative bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 overflow-hidden transition-colors">
        {/* Blur overlay */}
        <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3">
          <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
            <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Upgrade to unlock</p>
          <a
            href={upgradeHref ?? '/dashboard/billing'}
            className="inline-block bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Upgrade plan →
          </a>
        </div>
        {/* Faded card content behind overlay */}
        <div className="opacity-20">
          <div className="flex items-start justify-between mb-4">
            <div className="w-10 h-10 bg-brand-50 dark:bg-brand-900 text-brand-500 rounded-xl flex items-center justify-center">
              {icon}
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>
              {STATUS_LABELS[status]}
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">{metric}</span>
            <ArrowRight className="w-4 h-4 text-gray-300" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <Link
      href={href}
      className="group block bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 hover:border-brand-200 dark:hover:border-brand-700 hover:shadow-md dark:hover:shadow-none transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 bg-brand-500/10 dark:bg-brand-500/15 text-brand-500 rounded-xl flex items-center justify-center group-hover:bg-brand-500/15 dark:group-hover:bg-brand-500/20 transition-colors">
          {icon}
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      </div>
      <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors">
        {title}
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400 dark:text-gray-500">{metric}</span>
        <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
      </div>
    </Link>
  )
}
