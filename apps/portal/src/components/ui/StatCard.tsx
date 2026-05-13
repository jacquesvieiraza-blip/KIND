import { ReactNode } from 'react'

const COLOR_MAP = {
  blue:   'bg-blue-50 text-blue-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  green:  'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  yellow: 'bg-yellow-50 text-yellow-600',
}

interface StatCardProps {
  label: string
  value: number
  suffix?: string
  prefix?: string
  icon: ReactNode
  color: keyof typeof COLOR_MAP
}

export function StatCard({ label, value, suffix, prefix, icon, color }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${COLOR_MAP[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{prefix}{value.toLocaleString()}{suffix}</p>
      <p className="text-sm text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
