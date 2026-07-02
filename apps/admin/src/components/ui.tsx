/**
 * Admin UI kit — one source of truth for the preview look.
 * Every admin screen composes these so the layout is consistent:
 * full-width sections · small uppercase section labels · white rounded tiles ·
 * purple accent · dots · pills · bars. Matches scratchpad/admin-centre-preview.
 */
import type { ReactNode } from 'react'
export { default as MarkdownLite } from './MarkdownLite'

export function Page({ title, subtitle, right, children }: { title: string; subtitle?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-8 py-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div><h1 className="text-2xl font-bold text-gray-900">{title}</h1>{subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}</div>
        {right}
      </div>
      {children}
    </div>
  )
}

export function SectionLabel({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 pt-2">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</span>
      {right && <span className="ml-1">{right}</span>}
    </div>
  )
}

export function Card({ children, className = '', tone }: { children: ReactNode; className?: string; tone?: 'danger' | 'tint' }) {
  const border = tone === 'danger' ? 'border-red-200' : 'border-purple-100'
  const bg = tone === 'tint' ? 'bg-gradient-to-br from-purple-50 to-white' : 'bg-white'
  return <div className={`${bg} border ${border} rounded-2xl shadow-sm p-5 ${className}`}>{children}</div>
}

/** cols default 3; pass items as tiles */
export function TileGrid({ cols = 3, children }: { cols?: number; children: ReactNode }) {
  const map: Record<number, string> = { 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5' }
  return <div className={`grid grid-cols-2 ${map[cols] || 'md:grid-cols-3'} gap-4`}>{children}</div>
}

export function Tile({ label, value, note, tone, icon, right }: { label: string; value: ReactNode; note?: ReactNode; tone?: 'up' | 'down'; icon?: ReactNode; right?: ReactNode }) {
  const vc = tone === 'up' ? 'text-emerald-600' : tone === 'down' ? 'text-red-600' : 'text-gray-900'
  return (
    <div className="bg-white border border-purple-100 rounded-2xl shadow-sm p-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
        {right}
      </div>
      <p className={`text-2xl font-bold mt-1 ${vc}`}>{icon}{value}</p>
      {note && <p className="text-xs text-gray-400 mt-0.5">{note}</p>}
    </div>
  )
}

export function Pill({ children, tone = 'purp' }: { children: ReactNode; tone?: 'green' | 'amber' | 'red' | 'blue' | 'purp' | 'gray' }) {
  const map = {
    green: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700', red: 'bg-red-50 text-red-600',
    blue: 'bg-blue-50 text-blue-700', purp: 'bg-purple-50 text-[#7C3AED]', gray: 'bg-gray-50 text-gray-400',
  }
  return <span className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${map[tone]}`}>{children}</span>
}

export function Dot({ tone }: { tone: 'g' | 'a' | 'r' }) {
  const c = tone === 'g' ? 'bg-emerald-500' : tone === 'a' ? 'bg-amber-500' : 'bg-red-500'
  return <span className={`inline-block w-2 h-2 rounded-full mr-1.5 align-middle ${c}`} />
}

export function Bars({ data, max }: { data: [string, number][]; max?: number }) {
  const m = max ?? Math.max(1, ...data.map(d => d[1]))
  return <div>{data.map(([k, v]) => (
    <div key={k} className="my-2">
      <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{k}</span><b className="text-gray-900">{v.toLocaleString()}</b></div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-[#7C3AED]" style={{ width: `${Math.round(v / m * 100)}%` }} /></div>
    </div>
  ))}</div>
}

export function GoalBar({ label, val, target }: { label: string; val: number; target: number }) {
  const pct = Math.min(100, Math.round((val / target) * 100))
  const col = pct >= 100 ? '#059669' : pct >= 60 ? '#b45309' : '#dc2626'
  return (
    <div className="my-2.5">
      <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{label}</span><b>{val.toLocaleString()} / {target.toLocaleString()} · <span style={{ color: col }}>{pct}%</span></b></div>
      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: col }} /></div>
    </div>
  )
}

/** Simple table matching the preview */
export function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-wide">{head.map(h => <th key={h} className="text-left px-4 py-2 font-semibold">{h}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
export function TR({ children }: { children: ReactNode }) { return <tr className="border-t border-purple-50">{children}</tr> }
export function TD({ children, className = '' }: { children: ReactNode; className?: string }) { return <td className={`px-4 py-2.5 ${className}`}>{children}</td> }

/**
 * Button — the kit's action element (#277). Violet primary matches the portal.
 * Variants: primary (filled violet) · outline · ghost · danger. Sizes: sm · md.
 */
export function Button({
  children, onClick, href, variant = 'primary', size = 'md', disabled, type = 'button', className = '',
}: {
  children: ReactNode
  onClick?: () => void
  href?: string
  variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
  disabled?: boolean
  type?: 'button' | 'submit'
  className?: string
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:pointer-events-none'
  const sizes = { sm: 'text-xs px-3 h-8', md: 'text-sm px-4 h-10' }
  const variants = {
    primary: 'bg-brand-500 text-white hover:bg-brand-600',
    outline: 'border border-brand-200 text-brand-700 hover:bg-brand-100/60',
    ghost:   'text-brand-700 hover:bg-brand-100/60',
    danger:  'bg-red-500 text-white hover:bg-red-600',
  }
  const cls = `${base} ${sizes[size]} ${variants[variant]} ${className}`
  if (href) return <a href={href} className={cls}>{children}</a>
  return <button type={type} onClick={onClick} disabled={disabled} className={cls}>{children}</button>
}

/**
 * StatCard — portal-parity metric tile (same API as apps/portal StatCard) so
 * admin screens and the client portal render KPIs identically. (`Tile` above is
 * kept for existing/dense admin rows.)
 */
export function StatCard({
  label, value, prefix, suffix, icon, tone = 'brand',
}: {
  label: string
  value: ReactNode
  prefix?: string
  suffix?: string
  icon?: ReactNode
  tone?: 'brand' | 'green' | 'amber' | 'red'
}) {
  const iconTone = {
    brand: 'bg-brand-100 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red:   'bg-red-50 text-red-600',
  }[tone]
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-brand-200/60 p-5">
      {icon && <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${iconTone}`}>{icon}</div>}
      <p className="text-2xl font-bold text-gray-900">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}</p>
      <p className="text-sm text-[#7B6FA0] mt-0.5">{label}</p>
    </div>
  )
}
