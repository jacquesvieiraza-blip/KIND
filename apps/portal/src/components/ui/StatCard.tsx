import { ReactNode } from 'react'

const COLOR_MAP = {
  blue:   'bg-[#F5F0FF] text-[#7C3AED]',
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
  size?: 'default' | 'small'
}

export function StatCard({ label, value, suffix, prefix, icon, color, size = 'default' }: StatCardProps) {
  const c = COLOR_MAP[color]
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-purple-100/60 p-5">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${COLOR_MAP[color]}`}>{icon}</div>
      <p className="text-2xl font-bold text-gray-900">{prefix}{value.toLocaleString()}{suffix}</p>
      <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
    </div>
  )
}
