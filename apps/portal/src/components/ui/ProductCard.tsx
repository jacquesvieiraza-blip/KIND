import Link from 'next/link'
import { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

interface ProductCardProps {
  title: string
  description: string
  icon: ReactNode
  href: string
  status: 'active' | 'trialing' | 'inactive'
  metric: string
}

const STATUS_STYLES = { active: 'bg-green-50 text-green-700', trialing: 'bg-amber-50 text-amber-700', inactive: 'bg-gray-50 text-gray-500' }
const STATUS_LABELS = { active: 'Active', trialing: 'Trial', inactive: 'Inactive' }

export function ProductCard({ title, description, icon, href, status, metric }: ProductCardProps) {
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
