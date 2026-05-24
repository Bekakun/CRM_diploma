import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import type { Toast } from '../../hooks/useToast'

interface Props {
  toasts: Toast[]
  dismiss: (id: number) => void
}

const CONFIG = {
  success: {
    icon: <CheckCircle className="w-4 h-4 shrink-0" />,
    gradient: 'from-emerald-500 to-teal-500',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200/60 dark:border-emerald-700/40',
    text: 'text-emerald-700 dark:text-emerald-300',
    iconColor: 'text-emerald-500',
    bar: 'bg-gradient-to-r from-emerald-400 to-teal-500',
  },
  error: {
    icon: <XCircle className="w-4 h-4 shrink-0" />,
    gradient: 'from-red-500 to-rose-500',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200/60 dark:border-red-700/40',
    text: 'text-red-700 dark:text-red-300',
    iconColor: 'text-red-500',
    bar: 'bg-gradient-to-r from-red-400 to-rose-500',
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    gradient: 'from-blue-500 to-primary-500',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200/60 dark:border-blue-700/40',
    text: 'text-blue-700 dark:text-blue-300',
    iconColor: 'text-blue-500',
    bar: 'bg-gradient-to-r from-blue-400 to-primary-500',
  },
}

export default function Toaster({ toasts, dismiss }: Props) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2.5 pointer-events-none">
      {toasts.map((toast) => {
        const cfg = CONFIG[toast.type]
        return (
          <div
            key={toast.id}
            className={`relative flex items-center gap-3 px-4 py-3.5
                        rounded-2xl border
                        ${cfg.bg} ${cfg.border}
                        bg-white/90 dark:bg-gray-900/90
                        backdrop-blur-xl
                        shadow-[0_8px_30px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]
                        min-w-[280px] max-w-sm pointer-events-auto overflow-hidden
                        animate-[fadeSlideUp_0.25s_ease_both]`}
          >
            {/* Left accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar} rounded-l-2xl`} />

            <div className={`${cfg.iconColor} ml-1`}>{cfg.icon}</div>
            <p className={`flex-1 text-sm font-semibold ${cfg.text}`}>{toast.message}</p>
            <button
              onClick={() => dismiss(toast.id)}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10
                         transition-colors text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
