import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../context/authStore'
import { useThemeStore } from '../../context/themeStore'
import { useLanguageStore } from '../../context/languageStore'
import { LANGUAGES } from '../../i18n/config'
import { useTranslation } from 'react-i18next'
import { Bell, LogOut, Menu, Moon, Sun, MessageSquare, X } from 'lucide-react'
import 'flag-icons/css/flag-icons.min.css'
import NotificationPanel, { type Notification } from '../common/NotificationPanel'
import api from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'

interface ChatToastData {
  id: string
  conversationId: string
  senderName: string
  senderAvatar: string | null
  content: string | null
  fileName: string | null
}

function ChatToast({ data, onClose, onClick }: { data: ChatToastData; onClose: () => void; onClick: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 5000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex items-start gap-3
                 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                 rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.15)]
                 px-4 py-3.5 max-w-sm min-w-[280px]
                 animate-[fadeSlideUp_0.25s_ease_both] cursor-pointer"
      onClick={onClick}
    >
      <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300
                      font-bold flex items-center justify-center shrink-0 text-sm overflow-hidden">
        {data.senderAvatar
          ? <img src={getFileUrl(data.senderAvatar)} alt={data.senderName} className="w-full h-full object-cover" />
          : data.senderName.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
        }
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <MessageSquare className="w-3 h-3 text-primary-500 shrink-0" />
          <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 truncate">{data.senderName}</p>
        </div>
        <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
          {data.content ?? (data.fileName ? `📎 ${data.fileName}` : 'Файл')}
        </p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onClose() }}
        className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

interface Props {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: Props) {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { language, setLanguage } = useLanguageStore()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [chatToast, setChatToast] = useState<ChatToastData | null>(null)
  const [showLangMenu, setShowLangMenu] = useState(false)

  // Request browser notification permission once
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Listen for incoming chat messages
  useEffect(() => {
    const handler = (e: Event) => {
      const msg = (e as CustomEvent).detail
      // Don't show toast if user is already on the chat page with this conversation
      const isOnChat = location.pathname === '/chat'
      if (isOnChat) return

      const toast: ChatToastData = {
        id: msg.id,
        conversationId: msg.conversationId,
        senderName: msg.senderName,
        senderAvatar: msg.senderAvatar ?? null,
        content: msg.content ?? null,
        fileName: msg.fileName ?? null,
      }
      setChatToast(toast)

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted' && document.hidden) {
        new Notification(msg.senderName, {
          body: msg.content ?? (msg.fileName ? `📎 ${msg.fileName}` : 'Прислал файл'),
          icon: msg.senderAvatar ?? '/favicon.ico',
          tag: msg.conversationId,
        })
      }
    }
    window.addEventListener('chat:message', handler)
    return () => window.removeEventListener('chat:message', handler)
  }, [location.pathname])

  const getSettingsPath = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':      return '/admin/settings'
      case 'INSTRUCTOR': return '/instructor/settings'
      case 'STUDENT':    return '/student/settings'
      default:           return '/'
    }
  }
  const themeIconRef = useRef<HTMLDivElement>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  // Кешируем уведомления на уровне Header — панель не теряет состояние при закрытии/открытии
  const [cachedNotifications, setCachedNotifications] = useState<Notification[] | null>(null)

  const dateLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get<{ count: number }>('/notifications/unread-count')
      setUnreadCount(res.data.count)
    } catch {
      // non-critical
    }
  }, [])

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 60000)
    return () => clearInterval(interval)
  }, [fetchUnreadCount])

  const handleOpenNotifications = () => {
    setShowNotifications(v => !v)
  }

  return (
    <>
    {chatToast && (
      <ChatToast
        data={chatToast}
        onClose={() => setChatToast(null)}
        onClick={() => {
          setChatToast(null)
          navigate('/chat')
        }}
      />
    )}
    <header className="relative z-10
                        bg-white/70 dark:bg-gray-900/60
                        backdrop-blur-xl
                        border-b border-gray-100/80 dark:border-gray-800/60
                        px-6 py-3.5
                        shadow-[0_1px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-center justify-between gap-3">
        {/* Left: hamburger (mobile) + greeting */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl text-gray-400 dark:text-gray-500
                       hover:bg-gray-100/80 dark:hover:bg-white/[0.06]
                       hover:text-gray-700 dark:hover:text-gray-300
                       transition-all duration-200 shrink-0"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 dark:text-gray-100 truncate">
              {t('common.welcomeBack')}{' '}
              <span className="text-gradient font-bold">{user?.firstName}</span>
              <span className="text-gray-900 dark:text-gray-100">!</span>
            </h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 capitalize hidden sm:block">
              {new Date().toLocaleDateString(dateLocale, {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">

          {/* Language switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(v => !v)}
              title="Язык интерфейса"
              className="flex items-center gap-1 px-2 py-2 rounded-xl text-gray-400 dark:text-gray-500
                         hover:bg-gray-100/80 dark:hover:bg-white/[0.06]
                         hover:text-gray-700 dark:hover:text-gray-300
                         transition-all duration-200 text-sm"
            >
              <span className="text-xs font-medium uppercase">{language}</span>
            </button>
            {showLangMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowLangMenu(false)} />
                <div className="absolute right-0 top-full mt-1.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg z-50 overflow-hidden">
                  {LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setShowLangMenu(false) }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm transition-colors whitespace-nowrap
                        ${language === lang.code
                          ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                    >
                      <span className={`fi fi-${lang.countryCode} rounded-sm shrink-0`} style={{ fontSize: '1.1rem' }} />
                      <span>{lang.label}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => {
              toggleTheme()
              const el = themeIconRef.current
              if (el) {
                el.classList.remove('animate-spin-once')
                void el.offsetWidth // reflow — перезапускает анимацию при быстром клике
                el.classList.add('animate-spin-once')
              }
            }}
            title={theme === 'light' ? t('common.darkTheme') : t('common.lightTheme')}
            className="relative p-2 rounded-xl text-gray-400 dark:text-gray-500
                       hover:bg-gray-100/80 dark:hover:bg-white/[0.06]
                       hover:text-gray-700 dark:hover:text-gray-300
                       transition-all duration-200"
          >
            <div
              ref={themeIconRef}
              onAnimationEnd={() => themeIconRef.current?.classList.remove('animate-spin-once')}
            >
              {theme === 'light'
                ? <Moon size={17} />
                : <Sun size={17} />
              }
            </div>
          </button>

          {/* Notification bell */}
          <div className="relative">
            <button
              onClick={handleOpenNotifications}
              title={t('common.notifications')}
              className={`relative p-2 rounded-xl transition-all duration-200 ${
                showNotifications
                  ? 'bg-primary-100 dark:bg-primary-500/15 text-primary-600 dark:text-primary-400'
                  : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100/80 dark:hover:bg-white/[0.06] hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Bell size={17} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-50 animate-ping" />
                  <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-white dark:ring-gray-900 leading-none">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                </span>
              )}
            </button>

            {showNotifications && (
              <NotificationPanel
                onClose={() => setShowNotifications(false)}
                onUnreadCountChange={setUnreadCount}
                cachedNotifications={cachedNotifications}
                onNotificationsLoaded={setCachedNotifications}
              />
            )}
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-700/60 mx-1" />

          {/* User avatar + logout */}
          <div className="flex items-center gap-2 pl-1">
            <button
              onClick={() => navigate(getSettingsPath())}
              title={t('nav.settings')}
              className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600
                          flex items-center justify-center overflow-hidden shadow-sm ring-2
                          ring-primary-200/50 dark:ring-primary-900/50 shrink-0
                          hover:ring-primary-400/60 dark:hover:ring-primary-600/60
                          transition-all duration-200"
            >
              {user?.profilePhotoUrl ? (
                <img src={getFileUrl(user.profilePhotoUrl)} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-semibold text-xs">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
              )}
            </button>

            <button
              onClick={async () => { await logout(); navigate('/login', { replace: true }) }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-500 dark:text-gray-400
                         hover:text-red-500 dark:hover:text-red-400
                         hover:bg-red-50 dark:hover:bg-red-500/10
                         rounded-lg transition-all duration-200 font-medium"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">{t('common.logout')}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
    </>
  )
}
