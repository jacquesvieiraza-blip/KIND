import { ReactNode } from 'react'

const COLOR_MAP = {
  blue:   { icon: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',   val: 'text-blue-700 dark:text-blue-300' },
  indigo: { icon: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400', val: 'text-indigo-700 dark:text-indigo-300' },
  green:  { icon: 'bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400',  val: 'text-green-700 dark:text-green-300' },
  purple: { icon: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400', val: 'text-purple-700 dark:text-purple-300' },
  yellow: { icon: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400', val: 'text-yellow-700 dark:text-yellow-300' },
  gray:   { icon: 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',    val: 'text-gray-700 dark:text-gray-200' },
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
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
      <div className={`${size === 'small' ? 'w-8 h-8' : 'w-9 h-9'} rounded-lg flex items-center justify-center mb-3 ${c.icon}`}>
        {icon}
      </div>
      <p className={`font-bold text-gray-900 dark:text-white ${size === 'small' ? 'text-xl' : 'text-2xl'}`}>
        {prefix}{value.toLocaleString()}{suffix}
      </p>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{label}</p>
    </div>
  )
}
