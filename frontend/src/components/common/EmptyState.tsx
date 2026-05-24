import type { ElementType } from 'react'

interface Props {
  icon: ElementType
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="relative mb-5">
        <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200
                        dark:from-gray-800 dark:to-gray-700
                        rounded-2xl flex items-center justify-center shadow-sm
                        group-hover:scale-110 transition-transform">
          <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
        </div>
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400/10 to-transparent opacity-0 hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-sm font-semibold text-gray-600 dark:text-gray-400">{title}</p>
      {description && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 max-w-[240px] leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2 text-sm font-semibold
                     text-primary-600 dark:text-primary-400
                     bg-primary-50 dark:bg-primary-900/20
                     hover:bg-primary-100 dark:hover:bg-primary-900/40
                     border border-primary-100 dark:border-primary-800/50
                     rounded-xl transition-all duration-200
                     hover:shadow-sm hover:-translate-y-0.5"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
