import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface Props {
  title: string
  subtitle?: string
  onClose: () => void
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

const sizeClass = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-xl',
  xl: 'max-w-3xl',
}

export default function Modal({ title, subtitle, onClose, children, size = 'md' }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 bg-black/40 dark:bg-black/60
                 backdrop-blur-md
                 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className={`relative bg-white/90 dark:bg-gray-900/90
                    backdrop-blur-xl
                    rounded-3xl
                    shadow-[0_24px_80px_rgba(0,0,0,0.2),0_8px_24px_rgba(0,0,0,0.12)]
                    border border-white/60 dark:border-gray-700/50
                    w-full ${sizeClass[size]} max-h-[90vh] flex flex-col
                    animate-[scaleIn_0.2s_cubic-bezier(0.34,1.56,0.64,1)_both]`}
        onClick={e => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div className="absolute top-0 left-8 right-8 h-px
                        bg-gradient-to-r from-transparent via-primary-400/40 to-transparent" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-0 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{title}</h2>
            {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800
                       rounded-xl transition-all duration-200
                       text-gray-400 hover:text-gray-700 dark:hover:text-gray-200
                       hover:rotate-90"
          >
            <X size={17} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-5 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
