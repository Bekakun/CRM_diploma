import { useState, useEffect } from 'react'
import { Search, BookOpen, Ban, Edit, RefreshCw, MoreVertical, Users, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import EnrollStudentModal from '../../components/admin/EnrollStudentModal'
import UserProfileModal from '../../components/admin/UserProfileModal'
import { useAuthStore } from '../../context/authStore'
import api from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'
import { UserRole } from '../../types'
import { TableRowSkeleton } from '../../components/common/Skeleton'
import Modal from '../../components/common/Modal'
import FormField from '../../components/common/FormField'
import EmptyState from '../../components/common/EmptyState'
import Toaster from '../../components/common/Toaster'
import { useToast } from '../../hooks/useToast'

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

interface PageResponse {
  content: User[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  ADMIN: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-400',
  INSTRUCTOR: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  STUDENT: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  INACTIVE: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',
  PENDING: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
}

export default function ManageUsersPage() {
  const { t } = useTranslation()
  const { toasts, show: showToast, dismiss } = useToast()
  const { user: currentUser } = useAuthStore()
  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN'
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [profileUser, setProfileUser] = useState<User | null>(null)
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: '' as UserRole })
  const [editLoading, setEditLoading] = useState(false)
  const [deletingUser, setDeletingUser] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const pageSize = 20

  useEffect(() => { loadUsers() }, [page])

  const loadUsers = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<PageResponse>('/admin/users', {
        params: { page, size: pageSize, sort: 'createdAt,desc' },
      })
      setUsers(res.data.content)
      setTotalElements(res.data.totalElements)
      setTotalPages(res.data.totalPages)
    } catch {
      showToast(t('admin.users.loadError'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    setOpenMenuId(null)
    try {
      await api.patch(`/admin/users/${user.id}/status`, { status: newStatus })
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus } : u))
      showToast(newStatus === 'ACTIVE' ? t('admin.users.activated') : t('admin.users.deactivated'), 'success')
    } catch {
      showToast(t('admin.users.statusError'), 'error')
    }
  }

  const openEdit = (user: User) => {
    setEditingUser(user)
    setEditForm({
      firstName: (user.firstName ?? '').trim(),
      lastName: (user.lastName ?? '').trim(),
      email: (user.email ?? '').trim(),
      phone: (user.phone ?? '').trim(),
      role: user.role
    })
    setOpenMenuId(null)
  }

  const handleSaveEdit = async () => {
    if (!editingUser) return
    setEditLoading(true)
    try {
      const res = await api.patch<User>(`/admin/users/${editingUser.id}`, {
        firstName: editForm.firstName,
        lastName: editForm.lastName,
        email: editForm.email,
        phone: editForm.phone || undefined,
        role: editForm.role,
      })
      setUsers((prev) => prev.map((u) => u.id === editingUser.id ? res.data : u))
      setEditingUser(null)
      showToast(t('admin.users.userUpdated'), 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('admin.users.saveError'), 'error')
    } finally {
      setEditLoading(false)
    }
  }

  const handleDeleteUser = async () => {
    if (!deletingUser) return
    setDeleteLoading(true)
    try {
      await api.delete(`/admin/users/${deletingUser.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id))
      setTotalElements((prev) => prev - 1)
      setDeletingUser(null)
      showToast(t('admin.users.deleted'), 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('admin.users.deleteError'), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase()
    const matchesSearch = !q || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    const matchesRole = filterRole === 'all' || u.role === filterRole
    return matchesSearch && matchesRole
  })

  const startIndex = page * pageSize + 1
  const endIndex = Math.min((page + 1) * pageSize, totalElements)

  const ROLE_LABELS: Record<UserRole, string> = {
    SUPER_ADMIN: t('roles.SUPER_ADMIN'),
    ADMIN: t('roles.ADMIN'),
    INSTRUCTOR: t('roles.INSTRUCTOR'),
    STUDENT: t('roles.STUDENT'),
  }

  const STATUS_LABELS: Record<string, string> = {
    ACTIVE: t('common.active'),
    INACTIVE: t('common.inactive'),
    PENDING: t('common.pending'),
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      <div className="space-y-6">
        <div className="flex items-start justify-between animate-fadeSlideDown">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.users.pageTitle')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.users.pageSubtitle')}</p>
          </div>
          <button
            onClick={loadUsers}
            disabled={isLoading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('admin.users.refresh')}
          </button>
        </div>

        <div className="card animate-[fadeSlideUp_0.4s_0.1s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('admin.users.searchPlaceholder')}
                className="input-field pl-9"
              />
            </div>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="input-field sm:w-48">
              <option value="all">{t('admin.users.allRoles')}</option>
              <option value="SUPER_ADMIN">{t('admin.users.filterSuperAdmins')}</option>
              <option value="ADMIN">{t('admin.users.filterAdmins')}</option>
              <option value="INSTRUCTOR">{t('admin.users.filterInstructors')}</option>
              <option value="STUDENT">{t('admin.users.filterStudents')}</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[t('admin.users.colUser'), t('admin.users.colRole'), t('admin.users.colStatus'), t('admin.users.colRegistration'), ''].map((h, i) => (
                    <th key={i} className={`py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${h === '' ? 'text-right' : 'text-left'}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => <TableRowSkeleton key={i} cols={5} />)
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        icon={Users}
                        title={searchQuery ? t('admin.users.notFound') : t('admin.users.noUsers')}
                        description={searchQuery ? t('admin.users.tryChangeQuery') : undefined}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      onClick={() => { setOpenMenuId(null); setProfileUser(user) }}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => { e.stopPropagation(); setProfileUser(user) }}
                            className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center overflow-hidden shrink-0 hover:ring-2 hover:ring-primary-400 hover:ring-offset-2 transition-all cursor-pointer"
                          >
                            {user.profilePhotoUrl ? (
                              <img src={getFileUrl(user.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-white font-semibold text-xs">
                                {user.firstName?.[0]}{user.lastName?.[0]}
                              </span>
                            )}
                          </button>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${ROLE_COLORS[user.role]}`}>
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[user.status] ?? ''}`}>
                          {STATUS_LABELS[user.status] ?? user.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="relative inline-block">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === user.id ? null : user.id) }}
                            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-400" />
                          </button>

                          {openMenuId === user.id && (
                            <div
                              className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-10 py-1 animate-[fadeSlideUp_0.15s_ease_both]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isSuperAdmin && user.role === 'STUDENT' && (
                                <button
                                  onClick={() => { setSelectedStudent(user); setOpenMenuId(null) }}
                                  className="w-full text-left px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <BookOpen className="w-4 h-4" /> {t('admin.users.enrollStudent')}
                                </button>
                              )}
                              {isSuperAdmin && (
                                <button
                                  onClick={() => openEdit(user)}
                                  className="w-full text-left px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Edit className="w-4 h-4" /> {t('common.edit')}
                                </button>
                              )}
                              {isSuperAdmin && user.id !== currentUser?.id && (
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  className={`w-full text-left px-3.5 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 ${
                                    user.status === 'ACTIVE'
                                      ? 'text-orange-600 dark:text-orange-400'
                                      : 'text-emerald-600 dark:text-emerald-400'
                                  }`}
                                >
                                  <Ban className="w-4 h-4" />
                                  {user.status === 'ACTIVE' ? t('admin.users.deactivate') : t('admin.users.activate')}
                                </button>
                              )}
                              {isSuperAdmin && user.id !== currentUser?.id && (
                                <>
                                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                  <button
                                    onClick={() => { setDeletingUser(user); setOpenMenuId(null) }}
                                    className="w-full text-left px-3.5 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {t('admin.users.deleteUser')}
                                  </button>
                                </>
                              )}
                              {!isSuperAdmin && (
                                <p className="px-3.5 py-2 text-xs text-gray-400 dark:text-gray-500">
                                  {t('admin.users.viewOnly')}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && totalElements > 0 && (
            <div className="flex items-center justify-between mt-5 pt-5 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {startIndex}–{endIndex} {t('common.of')} {totalElements}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => p - 1)}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter((i) => Math.abs(i - page) <= 2)
                  .map((i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        i === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {profileUser && (
        <UserProfileModal
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onEdit={(u) => { setProfileUser(null); openEdit(u) }}
          onToggleStatus={(u) => { setProfileUser(null); handleToggleStatus(u) }}
          onEnroll={(u) => { setProfileUser(null); setSelectedStudent(u) }}
          onDelete={(u) => { setProfileUser(null); setDeletingUser(u) }}
        />
      )}

      {selectedStudent && (
        <EnrollStudentModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}

      {deletingUser && (
        <Modal title={t('admin.users.deleteConfirmTitle')} onClose={() => setDeletingUser(null)}>
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800">
              <Trash2 className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-sm text-red-700 dark:text-red-300">
                {t('admin.users.deleteConfirmText', { name: `${deletingUser.firstName} ${deletingUser.lastName}` })}
              </p>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {t('admin.users.deleteConfirmWarning')}
            </p>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setDeletingUser(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
              >
                {deleteLoading ? t('admin.users.deleting') : t('admin.users.confirmDelete')}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {editingUser && (
        <Modal title={t('admin.users.editUser')} onClose={() => setEditingUser(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label={t('common.firstName')} required>
                <input type="text" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} className="input-field" />
              </FormField>
              <FormField label={t('common.lastName')} required>
                <input type="text" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} className="input-field" />
              </FormField>
            </div>
            <FormField label={t('common.email')}>
              <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="input-field" />
            </FormField>
            <FormField label={t('common.phone')}>
              <input type="tel" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" placeholder="+7XXXXXXXXXX" />
            </FormField>
            <FormField label={t('common.role')}>
              <select value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value as UserRole })} className="input-field">
                <option value="STUDENT">{t('roles.STUDENT')}</option>
                <option value="INSTRUCTOR">{t('roles.INSTRUCTOR')}</option>
                <option value="ADMIN">{t('roles.ADMIN')}</option>
                <option value="SUPER_ADMIN">{t('admin.users.roleSuperAdmin')}</option>
              </select>
            </FormField>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditingUser(null)} className="btn-secondary flex-1">{t('common.cancel')}</button>
              <button onClick={handleSaveEdit} disabled={editLoading} className="btn-primary flex-1 disabled:opacity-50">
                {editLoading ? t('admin.users.saving') : t('common.save')}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
