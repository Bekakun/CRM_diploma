import { useEffect, useState, type ElementType } from 'react'
import { useCountUp } from '../../hooks/useCountUp'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface Props {
  label: string
  value: string
  icon: ElementType
  bg: string
  iconColor?: string
  delay?: number
  trend?: number
  onClick?: () => void
}

// Map bg class → gradient for the icon container
const BG_GRADIENTS: Record<string, string> = {
  'bg-blue-50 dark:bg-blue-900/20':      'from-blue-500 to-primary-500',
  'bg-emerald-50 dark:bg-emerald-900/20': 'from-emerald-500 to-teal-500',
  'bg-violet-50 dark:bg-violet-900/20':   'from-violet-500 to-purple-500',
  'bg-orange-50 dark:bg-orange-900/20':   'from-orange-400 to-amber-500',
  'bg-amber-50 dark:bg-amber-900/20':     'from-amber-400 to-orange-500',
  'bg-red-50 dark:bg-red-900/20':         'from-red-500 to-rose-500',
}

export default function AnimatedStatCard({ label, value, icon: Icon, bg, delay = 0, trend, onClick }: Props) {
  const [visible, setVisible] = useState(false)

  const parsed = parseFloat(value)
  const isNumeric = !isNaN(parsed) && value !== '—'
  const isInteger = isNumeric && Number.isInteger(parsed)
  const suffix = isNumeric ? value.replace(/^-?[\d.]+/, '') : ''
  const counted = useCountUp(isInteger ? parsed : 0, 900, visible)
  const displayValue = isNumeric
    ? `${isInteger ? counted : parsed}${suffix}`
    : value

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  const gradient = BG_GRADIENTS[bg] ?? 'from-primary-400 to-primary-600'

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden
                  bg-white/90 dark:bg-gray-900/80
                  backdrop-blur-xl
                  rounded-2xl p-5
                  border border-white/70 dark:border-gray-700/50
                  shadow-[0_2px_8px_rgba(0,0,0,0.06),0_1px_3px_rgba(0,0,0,0.04)]
                  hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1
                  transition-all duration-300 group
                  ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'cursor-default'}
                  ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
      style={{ transitionDelay: visible ? '0ms' : `${delay}ms` }}
    >
      {/* Subtle tinted background */}
      <div className={`absolute inset-0 ${bg} opacity-[0.04] dark:opacity-[0.07]`} />

      {/* Ambient glow at top-right */}
      <div className={`absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br ${gradient} opacity-[0.12] rounded-full blur-2xl`} />

      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide truncate">
            {label}
          </p>
          <p className="mt-2 text-[30px] font-bold tabular-nums leading-none
                        bg-gradient-to-br from-gray-900 to-gray-600
                        dark:from-gray-50 dark:to-gray-300
                        bg-clip-text text-transparent">
            {displayValue}
          </p>
          {trend !== undefined && (
            <div className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold
                             px-2 py-0.5 rounded-full
                             ${trend >= 0
                               ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                               : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                             }`}>
              {trend >= 0
                ? <TrendingUp className="w-3 h-3" />
                : <TrendingDown className="w-3 h-3" />
              }
              {Math.abs(trend)}%
            </div>
          )}
        </div>

        {/* Gradient icon box */}
        <div className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-2xl flex items-center justify-center shrink-0
                         shadow-[0_4px_12px_rgba(0,0,0,0.15)]
                         group-hover:scale-110 group-hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)]
                         transition-all duration-300`}>
          <Icon className="w-5 h-5 text-white drop-shadow-sm" />
        </div>
      </div>

      {/* Bottom accent line on hover */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5
                        bg-gradient-to-r ${gradient}
                        opacity-0 group-hover:opacity-100
                        transition-opacity duration-300 rounded-b-2xl`} />
    </div>
  )
}
