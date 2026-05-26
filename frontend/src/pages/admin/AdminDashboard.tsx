import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, UserPlus, GraduationCap, TrendingUp, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import AnimatedProgressBar from '../../components/common/AnimatedProgressBar'
import { StatCardSkeleton, ListItemSkeleton } from '../../components/common/Skeleton'
import { useAuthStore } from '../../context/authStore'
import UserProfileModal from '../../components/admin/UserProfileModal'
import EnrollStudentModal from '../../components/admin/EnrollStudentModal'
import Modal from '../../components/common/Modal'
import FormField from '../../components/common/FormField'
import { UserRole } from '../../types'

interface RecentUser {
  id: string
  firstName: string
  lastName: string
  email: string
  role: UserRole
  phone?: string
  profilePhotoUrl?: string
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING'
  createdAt: string
}

interface CourseItem {
  id: string
  name: string
  enrolledStudents: number
}

interface DashboardData {
  totalUsers: number
  newRegistrationsThisMonth: number
  activeCourses: number
  growthPercent: number
  activeUsersPercent: number
  courseFillPercent: number
  paidInvoicesPercent: number
  recentRegistrations: RecentUser[]
  courseList: CourseItem[]
}

const getRoleBadgeClass = (role: string) => {
  switch (role) {
    case 'STUDENT': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800'
    case 'INSTRUCTOR': return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800'
    default: return 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400 border-violet-100 dark:border-violet-800'
  }
}

export default function AdminDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileUser, setProfileUser] = useState<RecentUser | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<RecentUser | null>(null)
  const [editingUser, setEditingUser] = useState<RecentUser | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '' as UserRole })
  const [editLoading, setEditLoading] = useState(false)
  const [courseTooltip, setCourseTooltip] = useState(false)
  const courseCardRef = useRef<HTMLDivElement>(null)
  const { t } = useTranslation()

  useEffect(() => {
    api.get<DashboardData>('/admin/dashboard')
      .then(res => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const stats = data ? [
    { label: t('admin.dashboard.totalUsers'), value: String(data.totalUsers), icon: Users, bg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400', onClick: () => navigate('/admin/users') },
    { label: t('admin.dashboard.newThisMonth'), value: String(data.newRegistrationsThisMonth), icon: UserPlus, bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('admin.dashboard.totalCourses'), value: String(data.activeCourses), icon: GraduationCap, bg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400' },
    { label: t('admin.dashboard.growth'), value: `${data.growthPercent}%`, icon: TrendingUp, bg: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400' },
  ] : []

  const bars = data ? [
    { label: t('admin.dashboard.courseFillRate'), value: data.courseFillPercent, color: 'bg-blue-500' },
    { label: t('admin.dashboard.paidInvoices'), value: data.paidInvoicesPercent, color: 'bg-violet-500' },
    { label: t('admin.dashboard.activeAccounts'), value: data.activeUsersPercent, color: 'bg-emerald-500' },
  ] : []

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('common.goodMorning') : hour < 18 ? t('common.goodAfternoon') : t('common.goodEvening')

  const openEdit = (user: RecentUser) => {
    setEditingUser(user)
    setEditForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, phone: user.phone ?? '', role: user.role })
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setEditLoading(true)
    try {
      const res = await api.patch<RecentUser>(`/admin/users/${editingUser.id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
      })
      setData(prev => prev ? {
        ...prev,
        recentRegistrations: prev.recentRegistrations.map(u => u.id === editingUser.id ? res.data : u)
      } : prev)
      setEditingUser(null)
    } catch { /* ignore */ }
    finally { setEditLoading(false) }
  }

  return (
    <>
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl
                      bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600
                      p-6 text-white shadow-lg
                      animate-[fadeSlideDown_0.4s_ease_both]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-fuchsia-400/15 rounded-full blur-2xl translate-y-1/2" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-violet-100/80 text-sm font-medium mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : t('admin.dashboard.title')}
            </h1>
            <p className="text-violet-100/70 text-sm mt-1">{t('admin.dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {data && (
              <div className="text-center bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20 shrink-0">
                <div className="flex items-center gap-1.5 justify-center mb-0.5">
                  <Users className="w-4 h-4 text-violet-200" />
                  <span className="text-xs text-violet-100/70 font-medium">{t('admin.dashboard.totalUsers')}</span>
                </div>
                <p className="text-3xl font-bold">{data.totalUsers}</p>
              </div>
            )}
            <div className="w-12 h-12 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat, i) => i === 2 ? (
            <div
              key={stat.label}
              ref={courseCardRef}
              className="relative"
              onMouseEnter={() => setCourseTooltip(true)}
              onMouseLeave={() => setCourseTooltip(false)}
            >
              <AnimatedStatCard {...stat} delay={i * 80} />
              {courseTooltip && data?.courseList && data.courseList.length > 0 && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-3 animate-[fadeSlideUp_0.15s_ease_both]">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2 px-1">
                    {t('admin.dashboard.totalCourses')}
                  </p>
                  <div className="space-y-1">
                    {data.courseList.map(c => (
                      <div key={c.id} className="flex items-center justify-between px-2 py-1.5 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">{c.name}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">{c.enrolledStudents} чел.</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <AnimatedStatCard key={stat.label} {...stat} delay={i * 80} />
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent registrations */}
        <div className="card animate-[fadeSlideUp_0.5s_0.2s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">{t('admin.dashboard.recentRegistrations')}</h2>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <ListItemSkeleton key={i} />)}</div>
          ) : (
            <div className="space-y-2">
              {data?.recentRegistrations.map((user, i) => (
                <div
                  key={user.id}
                  onClick={() => setProfileUser(user)}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700/60 transition-all duration-200 cursor-pointer"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center overflow-hidden shadow-sm shrink-0">
                      {user.profilePhotoUrl ? (
                        <img src={getFileUrl(user.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-white font-semibold text-sm">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getRoleBadgeClass(user.role)}`}>
                    {t(`roles.${user.role}`)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* System activity */}
        <div className="card animate-[fadeSlideUp_0.5s_0.3s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-5">{t('admin.dashboard.systemActivity')}</h2>
          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 w-36 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                    <div className="h-3 w-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                  <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-5">
              {bars.map((bar, i) => (
                <AnimatedProgressBar key={bar.label} {...bar} delay={i * 150} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>

    {profileUser && (
      <UserProfileModal
        user={profileUser}
        onClose={() => setProfileUser(null)}
        onEdit={(u) => { setProfileUser(null); openEdit(u) }}
        onToggleStatus={async (u) => {
          const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
          try {
            await api.patch(`/admin/users/${u.id}/status`, { status: newStatus })
            setData(prev => prev ? {
              ...prev,
              recentRegistrations: prev.recentRegistrations.map(r => r.id === u.id ? { ...r, status: newStatus } : r)
            } : prev)
            setProfileUser(prev => prev?.id === u.id ? { ...prev, status: newStatus } : prev)
          } catch { /* ignore */ }
        }}
        onEnroll={(u) => { setProfileUser(null); setSelectedStudent(u) }}
      />
    )}

    {selectedStudent && (
      <EnrollStudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
    )}

    {editingUser && (
      <Modal title="Редактировать пользователя" onClose={() => setEditingUser(null)}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Имя" required>
              <input type="text" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="input-field" />
            </FormField>
            <FormField label="Фамилия" required>
              <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="input-field" />
            </FormField>
          </div>
          <FormField label="Email">
            <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-field" />
          </FormField>
          <FormField label="Телефон">
            <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" placeholder="+7XXXXXXXXXX" />
          </FormField>
          <FormField label="Роль">
            <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })} className="input-field">
              <option value="STUDENT">Студент</option>
              <option value="INSTRUCTOR">Преподаватель</option>
              <option value="ADMIN">Администратор</option>
              <option value="SUPER_ADMIN">Супер-администратор</option>
            </select>
          </FormField>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1">Отмена</button>
            <button onClick={handleSaveEdit} disabled={editLoading} className="btn-primary flex-1 disabled:opacity-50">
              {editLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>
    )}
    </>
  )
}
