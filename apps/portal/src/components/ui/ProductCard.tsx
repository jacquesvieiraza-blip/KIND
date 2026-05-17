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
  active:   'bg-green-50 text-green-700',
  trialing: 'bg-amber-50 text-amber-700',
  inactive: 'bg-gray-50 text-gray-500',
  locked:   'bg-purple-50 text-purple-600',
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
      <div className="block bg-white rounded-xl border border-gray-100 p-5 relative overflow-hidden">
        <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-3">
          <div className="bg-purple-50 rounded-full p-3">
            <Lock className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-sm font-semibold text-gray-700">Upgrade to unlock</p>
          <a
            href={upgradeHref ?? '/dashboard/billing'}
            className="inline-block bg-[#0066FF] hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Upgrade plan →
          </a>
        </div>
        <div className="flex items-start justify-between mb-3 opacity-30">
          <div className="w-10 h-10 bg-blue-50 text-[#0066FF] rounded-xl flex items-center justify-center">{icon}</div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
        </div>
        <h3 className="font-semibold text-gray-900 mb-1 opacity-30">{title}</h3>
        <p className="text-sm text-gray-500 mb-3 opacity-30">{description}</p>
        <div className="flex items-center justify-between opacity-30">
          <span className="text-xs text-gray-400">{metric}</span>
          <ArrowRight className="w-4 h-4 text-gray-300" />
        </div>
      </div>
    )
  }

  return (
    <Link href={href} className="block bg-white rounded-xl border border-gray-100 p-5 hover:border-blue-200 hover:shadow-sm transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 bg-blue-50 text-[#0066FF] rounded-xl flex items-center justify-center">{icon}</div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_STYLES[status]}`}>{STATUS_LABELS[status]}</span>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{metric}</span>
        <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#0066FF] transition-colors" />
      </div>
    </Link>
  )
}
