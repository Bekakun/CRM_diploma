import { useEffect, useRef, useState, useCallback } from 'react'
import { X, Bell, GraduationCap, BookOpen, CreditCard, Clock, CheckCircle2, AlertCircle, Info, Sparkles, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

export interface Notification {
  id: string
  type: 'grade' | 'lesson' | 'payment' | 'deadline' | 'general'
  title: string
  body: string
  isRead: boolean
  createdAt: string
}

const TYPE_CONFIG = {
  grade:    { icon: GraduationCap, gradient: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-50 dark:bg-emerald-900/20', color: 'text-emerald-600 dark:text-emerald-400' },
  lesson:   { icon: BookOpen,      gradient: 'from-blue-500 to-primary-500',   bg: 'bg-blue-50 dark:bg-blue-900/20',       color: 'text-blue-600 dark:text-blue-400' },
  payment:  { icon: CreditCard,    gradient: 'from-amber-500 to-orange-500',   bg: 'bg-amber-50 dark:bg-amber-900/20',     color: 'text-amber-600 dark:text-amber-400' },
  deadline: { icon: AlertCircle,   gradient: 'from-red-500 to-rose-500',       bg: 'bg-red-50 dark:bg-red-900/20',         color: 'text-red-600 dark:text-red-400' },
  general:  { icon: Info,          gradient: 'from-violet-500 to-purple-500',  bg: 'bg-violet-50 dark:bg-violet-900/20',   color: 'text-violet-600 dark:text-violet-400' },
}

function formatTime(createdAt: string) {
  const diff = Date.now() - new Date(createdAt).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин. назад`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} ч. назад`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'вчера'
  return new Date(createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
}

interface Props {
  onClose: () => void
  onUnreadCountChange: (count: number) => void
  cachedNotifications: Notification[] | null
  onNotificationsLoaded: (notifications: Notification[]) => void
}

export default function NotificationPanel({ onClose, onUnreadCountChange, cachedNotifications, onNotificationsLoaded }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()
  const [notifications, setNotifications] = useState<Notification[]>(cachedNotifications ?? [])
  const [loading, setLoading] = useState(cachedNotifications === null)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const updateNotifications = useCallback((data: Notification[]) => {
    setNotifications(data)
    onNotificationsLoaded(data)
    onUnreadCountChange(data.filter(n => !n.isRead).length)
  }, [onNotificationsLoaded, onUnreadCountChange])

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get<Notification[]>('/notifications')
      updateNotifications(res.data)
    } catch {
      // silently fail — notifications are non-critical
    } finally {
      setLoading(false)
    }
  }, [updateNotifications])

  useEffect(() => {
    // Загружаем только если нет кеша
    if (cachedNotifications === null) {
      loadNotifications()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleMarkAllRead = async () => {
    const updated = notifications.map(n => ({ ...n, isRead: true }))
    updateNotifications(updated)
    try {
      await api.post('/notifications/mark-all-read')
    } catch {
      loadNotifications()
    }
  }

  const handleMarkRead = async (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, isRead: true } : n)
    updateNotifications(updated)
    try {
      await api.patch(`/notifications/${id}/read`)
    } catch {
      loadNotifications()
    }
  }

  return (
    <div
      ref={panelRef}
      className="
        fixed inset-x-3 top-[4.25rem]
        sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]
        bg-white/90 dark:bg-gray-900/90
        backdrop-blur-xl
        rounded-2xl
        shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]
        border border-white/60 dark:border-gray-700/50
        z-50 overflow-hidden
        animate-[fadeSlideDown_0.2s_ease_both]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5
                      border-b border-gray-100/80 dark:border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-lg
                          flex items-center justify-center shadow-sm">
            <Bell className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.notifications')}</span>
          {unreadCount > 0 && (
            <span className="flex items-center justify-center px-1.5 h-5 text-[10px] font-bold
                             bg-gradient-to-r from-red-500 to-rose-500
                             text-white rounded-full leading-none shadow-sm">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary-600 dark:text-primary-400
                         hover:text-primary-700 dark:hover:text-primary-300
                         px-2 py-1 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/20
                         transition-colors font-medium">
              {t('common.markAllRead')}
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
                       hover:bg-gray-100 dark:hover:bg-gray-800
                       rounded-lg transition-all duration-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[440px]">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200
                            dark:from-gray-800 dark:to-gray-700
                            rounded-2xl flex items-center justify-center mb-3 shadow-sm">
              <CheckCircle2 className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('common.noNotifications')}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('common.noNotificationsDesc')}</p>
          </div>
        ) : (
          <div>
            {notifications.map((n, i) => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.general
              const { icon: Icon, gradient, bg, color } = cfg
              return (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && handleMarkRead(n.id)}
                  className={`flex gap-3 px-4 py-3 cursor-pointer
                              transition-colors duration-150 relative
                              ${!n.isRead
                                ? 'bg-primary-50/40 dark:bg-primary-950/30 hover:bg-primary-50/60 dark:hover:bg-primary-950/40'
                                : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                              }
                              ${i < notifications.length - 1 ? 'border-b border-gray-50 dark:border-gray-800/50' : ''}`}
                >
                  {/* Unread indicator */}
                  {!n.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5
                                    bg-gradient-to-b from-primary-400 to-primary-600" />
                  )}

                  <div className={`relative w-9 h-9 rounded-xl ${bg}
                                   flex items-center justify-center shrink-0 mt-0.5 overflow-hidden`}>
                    <Icon className={`w-4 h-4 ${color} relative z-10`} />
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0
                                     group-hover:opacity-10 transition-opacity`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm font-semibold leading-tight
                                     ${!n.isRead ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0 mt-1.5
                                         shadow-[0_0_6px_rgba(14,165,233,0.5)]" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.body}
                    </p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <Clock className="w-3 h-3 text-gray-300 dark:text-gray-600" />
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{formatTime(n.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100/80 dark:border-gray-800/60
                      bg-gray-50/50 dark:bg-gray-900/50 text-center">
        <button className="text-xs text-gray-400 dark:text-gray-500 font-medium flex items-center gap-1 mx-auto cursor-default">
          <Sparkles className="w-3 h-3" />
          {notifications.length > 0
            ? `${notifications.length} ${t('common.notificationsTotal', { defaultValue: 'уведомлений' })}`
            : t('common.showAll')
          }
        </button>
      </div>
    </div>
  )
}
