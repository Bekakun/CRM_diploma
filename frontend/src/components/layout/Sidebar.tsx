import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../context/authStore'
import { useTranslation } from 'react-i18next'
import {
  Home, Users, BookOpen, Calendar, GraduationCap,
  MessageSquare, CreditCard, UserPlus, Settings,
  Sparkles, BarChart2, Clock, X, MessagesSquare,
} from 'lucide-react'
import clsx from 'clsx'
import { UserRole } from '../../types'
import { useState, useEffect } from 'react'
import api from '../../services/api'

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  const { user } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const getSettingsPath = () => {
    switch (user?.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':      return '/admin/settings'
      case 'INSTRUCTOR': return '/instructor/settings'
      case 'STUDENT':    return '/student/settings'
      default:           return '/'
    }
  }

  const getRoleLabel = (role: UserRole) => t(`roles.${role}`)

  const getRoleAccent = (role?: UserRole) => {
    switch (role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':      return 'from-violet-500 to-purple-600'
      case 'INSTRUCTOR': return 'from-primary-500 to-cyan-500'
      case 'STUDENT':    return 'from-emerald-500 to-teal-500'
      default:           return 'from-primary-500 to-primary-700'
    }
  }

  const getNavItems = () => {
    if (!user) return []
    switch (user.role) {
      case 'SUPER_ADMIN':
      case 'ADMIN':
        return [
          { icon: Home,          label: t('nav.home'),        path: '/admin' },
          { icon: UserPlus,      label: t('nav.invite'),      path: '/admin/invite' },
          { icon: Users,         label: t('nav.users'),       path: '/admin/users' },
          { icon: CreditCard,    label: t('nav.payments'),    path: '/admin/payments' },
          { icon: MessagesSquare, label: t('nav.chat'),       path: '/chat', badge: true },
          { icon: Settings,      label: t('nav.settings'),    path: '/admin/settings' },
        ]
      case 'INSTRUCTOR':
        return [
          { icon: Home,             label: t('nav.home'),        path: '/instructor' },
          { icon: BookOpen,         label: t('nav.courses'),     path: '/instructor/courses' },
          { icon: Users,            label: t('nav.students'),    path: '/instructor/students' },
          { icon: Calendar,         label: t('nav.calendar'),    path: '/instructor/calendar' },
          { icon: BarChart2,        label: t('nav.analytics'),   path: '/instructor/analytics' },
          { icon: MessageSquare,    label: t('nav.aiAssistant'), path: '/instructor/ai-assistant' },
          { icon: MessagesSquare,   label: t('nav.chat'),        path: '/chat', badge: true },
          { icon: Settings,         label: t('nav.settings'),    path: '/instructor/settings' },
        ]
      case 'STUDENT':
        return [
          { icon: Home,             label: t('nav.home'),        path: '/student' },
          { icon: Calendar,         label: t('nav.calendar'),    path: '/student/calendar' },
          { icon: GraduationCap,    label: t('nav.grades'),      path: '/student/grades' },
          { icon: Clock,            label: t('nav.deadlines'),   path: '/student/deadlines' },
          { icon: MessageSquare,    label: t('nav.aiAssistant'), path: '/student/ai-assistant' },
          { icon: MessagesSquare,   label: t('nav.chat'),        path: '/chat', badge: true },
          { icon: CreditCard,       label: t('nav.payments'),    path: '/student/payments' },
          { icon: Settings,         label: t('nav.settings'),    path: '/student/settings' },
        ]
      default:
        return []
    }
  }

  const navItems = getNavItems()
  const accent = getRoleAccent(user?.role)

  const [unreadChat, setUnreadChat] = useState(0)
  useEffect(() => {
    api.get<{ count: number }>('/chat/unread-count')
      .then((r) => setUnreadChat(r.data.count))
      .catch(() => {})
    const timer = setInterval(() => {
      api.get<{ count: number }>('/chat/unread-count')
        .then((r) => setUnreadChat(r.data.count))
        .catch(() => {})
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  return (
    <aside
      className={clsx(
        // Base styles
        'fixed inset-y-0 left-0 z-40 w-64 flex flex-col',
        'bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl',
        'border-r border-gray-100/80 dark:border-gray-800/60',
        'shadow-[4px_0_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[4px_0_24px_-4px_rgba(0,0,0,0.4)]',
        'transition-transform duration-300 ease-in-out',
        // Mobile: slide in/out; Desktop: always visible
        'lg:translate-x-0 lg:static lg:z-10',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${accent} opacity-60`} />

      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-100/80 dark:border-gray-800/60">
        <div className="flex items-center gap-3">
          <div className={`relative w-10 h-10 bg-gradient-to-br ${accent} rounded-2xl
                           flex items-center justify-center shadow-lg inset-highlight`}>
            <Sparkles className="w-5 h-5 text-white drop-shadow" />
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} rounded-2xl opacity-50 blur-md -z-10`} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-gray-900 dark:text-gray-50 leading-tight">
              {t('sidebar.systemName')}
            </h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{t('sidebar.learningCenter')}</p>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item, i) => {
          const Icon = item.icon
          const isActive = location.pathname === item.path
          const badgeCount = (item as any).badge ? unreadChat : 0

          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              style={{ animationDelay: `${i * 30}ms` }}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-200',
                isActive
                  ? `bg-gradient-to-r from-primary-50 to-cyan-50/50
                     dark:from-primary-900/30 dark:to-cyan-900/20
                     text-primary-700 dark:text-primary-300
                     border border-primary-100 dark:border-primary-500/20
                     shadow-[0_2px_8px_rgba(14,165,233,0.12)]`
                  : `text-gray-500 dark:text-gray-400
                     hover:bg-gray-50/80 dark:hover:bg-white/[0.04]
                     hover:text-gray-900 dark:hover:text-gray-100`
              )}
            >
              <div className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200',
                isActive
                  ? `bg-primary-100 dark:bg-primary-500/20 text-primary-600 dark:text-primary-400`
                  : `text-gray-400 dark:text-gray-500 group-hover:text-gray-600`
              )}>
                <Icon size={16} />
              </div>
              <span className="truncate">{item.label}</span>
              {badgeCount > 0 && !isActive && (
                <span className="ml-auto bg-primary-600 text-white text-[9px] font-bold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}
              {isActive && (
                <span className={`ml-auto w-1.5 h-1.5 rounded-full bg-gradient-to-b ${accent} shadow-sm`} />
              )}
            </Link>
          )
        })}
      </nav>

      {/* User profile */}
      <div className="p-3 border-t border-gray-100/80 dark:border-gray-800/60">
        <div
          onClick={() => { navigate(getSettingsPath()); onClose() }}
          className="flex items-center gap-3 p-2.5 rounded-xl
                        hover:bg-gray-50/80 dark:hover:bg-white/[0.04]
                        transition-all duration-200 cursor-pointer group"
        >
          <div className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${accent}
                          flex items-center justify-center overflow-hidden shrink-0
                          shadow-md ring-2 ring-white/50 dark:ring-gray-900/50`}>
            {user?.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-semibold text-sm drop-shadow">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
              {user?.role && getRoleLabel(user.role)}
            </p>
          </div>
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)] shrink-0" />
        </div>
      </div>
    </aside>
  )
}
