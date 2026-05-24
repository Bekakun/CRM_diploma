import { AlertTriangle, Trash2 } from 'lucide-react'

interface Props {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Подтвердить',
  danger = false,
  onConfirm,
  onCancel,
}: Props) {
  const DangerIcon = danger ? Trash2 : AlertTriangle

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-md
                    flex items-center justify-center z-[200] p-4">
      <div
        className="bg-white/95 dark:bg-gray-900/95
                   backdrop-blur-xl
                   rounded-3xl
                   shadow-[0_24px_80px_rgba(0,0,0,0.25),0_8px_24px_rgba(0,0,0,0.15)]
                   border border-white/60 dark:border-gray-700/50
                   w-full max-w-sm p-6
                   animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)_both]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className={`relative w-14 h-14 rounded-2xl flex items-center justify-center
                          ${danger
                            ? 'bg-gradient-to-br from-red-500 to-rose-600'
                            : 'bg-gradient-to-br from-amber-400 to-orange-500'
                          } shadow-lg`}>
            <DangerIcon className="w-7 h-7 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-white/20 opacity-0 hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">{title}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 text-center leading-relaxed">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-semibold
                       text-gray-700 dark:text-gray-300
                       bg-gray-100 dark:bg-gray-800
                       hover:bg-gray-200 dark:hover:bg-gray-700
                       rounded-2xl transition-all duration-200
                       hover:-translate-y-0.5 hover:shadow-sm"
          >
            Отмена
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-2xl transition-all duration-200 hover:-translate-y-0.5 active:scale-95 shadow-sm hover:shadow-md ${
              danger
                ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
