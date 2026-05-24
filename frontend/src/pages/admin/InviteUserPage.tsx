import { useState, useEffect } from 'react'
import { UserPlus, Mail, Send, Trash2, GraduationCap, Users, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { UserRole } from '../../types'
import { ListItemSkeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import FormField from '../../components/common/FormField'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Toaster from '../../components/common/Toaster'
import { useToast } from '../../hooks/useToast'

interface Invitation {
  id: string
  email: string
  role: UserRole
  expiresAt: string
  isUsed: boolean
  createdAt: string
}

export default function InviteUserPage() {
  const { t } = useTranslation()
  const { toasts, show: showToast, dismiss } = useToast()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('STUDENT')
  const [isLoading, setIsLoading] = useState(false)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoadingList, setIsLoadingList] = useState(true)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const ROLES: { value: UserRole; labelKey: string; descKey: string; icon: typeof GraduationCap }[] = [
    { value: 'STUDENT', labelKey: 'admin.invite.roleStudent', descKey: 'admin.invite.roleStudentDesc', icon: GraduationCap },
    { value: 'INSTRUCTOR', labelKey: 'admin.invite.roleInstructor', descKey: 'admin.invite.roleInstructorDesc', icon: Users },
    { value: 'ADMIN', labelKey: 'admin.invite.roleAdmin', descKey: 'admin.invite.roleAdminDesc', icon: Shield },
  ]

  const ROLE_LABEL: Record<UserRole, string> = {
    SUPER_ADMIN: t('roles.SUPER_ADMIN'),
    ADMIN: t('roles.ADMIN'),
    INSTRUCTOR: t('roles.INSTRUCTOR'),
    STUDENT: t('roles.STUDENT'),
  }

  function formatRelativeDate(dateString: string) {
    const d = new Date(dateString)
    const now = new Date()
    const diffDays = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return t('admin.invite.today')
    if (diffDays === 1) return t('admin.invite.yesterday')
    return t('admin.invite.daysAgo', { count: diffDays })
  }

  useEffect(() => { loadInvitations() }, [])

  const loadInvitations = async () => {
    setIsLoadingList(true)
    try {
      const res = await api.get<Invitation[]>('/admin/invitations')
      setInvitations(res.data)
    } catch {
      showToast(t('admin.invite.loadError'), 'error')
    } finally {
      setIsLoadingList(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    try {
      await api.post('/admin/invitations', { email, role })
      showToast(t('admin.invite.sentTo', { email }), 'success')
      setEmail('')
      await loadInvitations()
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('admin.invite.sendError'), 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await api.delete(`/admin/invitations/${deleteId}`)
      setInvitations((prev) => prev.filter((i) => i.id !== deleteId))
      showToast(t('admin.invite.inviteDeleted'), 'success')
    } catch {
      showToast(t('admin.invite.deleteError'), 'error')
    } finally {
      setDeleteId(null)
    }
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      <div className="max-w-2xl space-y-6 animate-fadeSlideDown">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('admin.invite.pageTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.invite.pageSubtitle')}</p>
        </div>

        <div className="card space-y-5">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label={t('admin.invite.emailLabel')} required>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-10"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </FormField>

            <FormField label={t('admin.invite.roleLabel')}>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-0.5">
                {ROLES.map(({ value, labelKey, descKey, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRole(value)}
                    className={`p-3.5 border-2 rounded-xl transition-all text-left ${
                      role === value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-2 ${role === value ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400'}`} />
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t(labelKey)}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{t(descKey)}</p>
                  </button>
                ))}
              </div>
            </FormField>

            <button type="submit" disabled={isLoading} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <Send className="w-4 h-4" />
              {isLoading ? t('admin.invite.sending') : t('admin.invite.sendInvite')}
            </button>
          </form>
        </div>

        {/* Invitations list */}
        <div className="card">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('admin.invite.listTitle')}</h3>

          {isLoadingList ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}
            </div>
          ) : invitations.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title={t('admin.invite.noInvitationsTitle')}
              description={t('admin.invite.noInvitationsDesc')}
            />
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{inv.email}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{formatRelativeDate(inv.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                      {ROLE_LABEL[inv.role]}
                    </span>
                    <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                      inv.isUsed
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    }`}>
                      {inv.isUsed ? t('admin.invite.statusUsed') : t('admin.invite.statusPending')}
                    </span>
                    {!inv.isUsed && (
                      <button
                        onClick={() => setDeleteId(inv.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <ConfirmDialog
          title={t('admin.invite.confirmDelete')}
          message={t('admin.invite.confirmDeleteMessage')}
          confirmLabel={t('common.delete')}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
