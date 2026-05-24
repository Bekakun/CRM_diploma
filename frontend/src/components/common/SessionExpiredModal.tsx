import { LogIn, ShieldAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Props {
  onLogin: () => void
}

export default function SessionExpiredModal({ onLogin }: Props) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-8 text-center
                      shadow-[0_24px_64px_rgba(0,0,0,0.25)]
                      border border-gray-100 dark:border-gray-800
                      animate-[fadeSlideDown_0.3s_ease_both]">
        <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 rounded-2xl
                        flex items-center justify-center mx-auto mb-5">
          <ShieldAlert className="w-8 h-8 text-amber-500 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('session.expired')}
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
          {t('session.expiredDesc')}
        </p>
        <button
          onClick={onLogin}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <LogIn className="w-4 h-4" />
          {t('session.loginAgain')}
        </button>
      </div>
    </div>
  )
}
