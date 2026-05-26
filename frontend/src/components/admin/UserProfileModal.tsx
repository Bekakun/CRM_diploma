import { X, Edit, Ban, BookOpen, Mail, Phone, Calendar, ShieldCheck } from 'lucide-react'
import { UserRole } from '../../types'
import { useAuthStore } from '../../context/authStore'
import { getFileUrl } from '../../utils/fileUrl'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phone?: string
  profilePhotoUrl?: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  createdAt: string
}

interface Props {
  user: User
  onClose: () => void
  onEdit: (user: User) => void
  onToggleStatus: (user: User) => void
  onEnroll?: (user: User) => void
}

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  ADMIN: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  INSTRUCTOR: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  STUDENT: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
}
const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Супер-админ',
  ADMIN: 'Админ',
  INSTRUCTOR: 'Преподаватель',
  STUDENT: 'Студент',
}
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  PENDING: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
}
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Активен', INACTIVE: 'Неактивен', PENDING: 'Ожидает',
}

export default function UserProfileModal({ user, onClose, onEdit, onToggleStatus, onEnroll }: Props) {
  const { user: currentUser } = useAuthStore()
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-[fadeSlideUp_0.2s_ease_both]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col sm:flex-row">
          {/* Left — photo */}
          <div className="sm:w-56 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 flex flex-col items-center justify-center p-8 gap-4">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden ring-4 ring-white dark:ring-gray-800 shadow-lg">
              {user.profilePhotoUrl ? (
                <img src={getFileUrl(user.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white font-bold text-3xl">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              )}
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-base leading-tight">
                {user.firstName} {user.lastName}
              </p>
              <span className={`mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                {ROLE_LABELS[user.role]}
              </span>
            </div>
          </div>

          {/* Right — info */}
          <div className="flex-1 p-6 flex flex-col gap-5">
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Информация об аккаунте</h2>
              <p className="text-xs text-gray-400 mt-0.5">ID: {user.id}</p>
            </div>

            <div className="space-y-3">
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={user.email} />
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Телефон" value={user.phone || '—'} />
              <InfoRow
                icon={<ShieldCheck className="w-4 h-4" />}
                label="Статус"
                value={
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[user.status] ?? ''}`}>
                    {STATUS_LABELS[user.status] ?? user.status}
                  </span>
                }
              />
              <InfoRow
                icon={<Calendar className="w-4 h-4" />}
                label="Регистрация"
                value={new Date(user.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
              />
            </div>

            <div className="flex flex-wrap gap-2 mt-auto pt-2">
              {isSuperAdmin && (
                <button
                  onClick={() => { onEdit(user); onClose() }}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Редактировать
                </button>
              )}

              {isSuperAdmin && user.role === 'STUDENT' && onEnroll && (
                <button
                  onClick={() => { onEnroll(user); onClose() }}
                  className="btn-secondary flex items-center gap-2 text-sm"
                >
                  <BookOpen className="w-4 h-4" />
                  Записать на курс
                </button>
              )}

              {isSuperAdmin && (
                <button
                  onClick={() => { onToggleStatus(user); onClose() }}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-medium transition-colors border ${
                    user.status === 'ACTIVE'
                      ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40'
                      : 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40'
                  }`}
                >
                  <Ban className="w-4 h-4" />
                  {user.status === 'ACTIVE' ? 'Деактивировать' : 'Активировать'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-gray-400 shrink-0">{icon}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500 w-24 shrink-0">{label}</span>
      <span className="text-sm text-gray-800 dark:text-gray-200 font-medium">{value}</span>
    </div>
  )
}
