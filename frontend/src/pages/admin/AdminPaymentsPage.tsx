import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Edit, Trash2, X, RefreshCw, CheckCircle, XCircle,
  ArrowUpDown, Search, MoreVertical, ChevronDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

interface CourseOption { id: string; name: string }

interface PaymentRule {
  id: string; courseId: string; courseName: string
  amount: number; currency: string
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY'
  description?: string; isActive: boolean; dueDay: number
}

interface AdminPayment {
  id: string; studentId: string
  studentFirstName: string; studentLastName: string; studentEmail: string
  courseId: string; courseName: string
  amount: number; currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  dueDate: string; paidAt?: string
  periodMonth?: number; periodYear?: number; note?: string
}

interface AdminPaymentPage {
  content: AdminPayment[]; page: number; size: number
  totalElements: number; totalPages: number
}

const MONTH_NAMES = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const formatAmount = (amount: number, currency = 'KZT') =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  return (
    <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center shrink-0">
      <span className="text-white font-semibold text-xs">
        {(firstName?.[0] ?? '').toUpperCase()}{(lastName?.[0] ?? '').toUpperCase()}
      </span>
    </div>
  )
}

export default function AdminPaymentsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'rules' | 'payments'>('rules')

  // ── Rules state ──
  const [rules, setRules] = useState<PaymentRule[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PaymentRule | null>(null)
  const [formData, setFormData] = useState({ courseId: '', amount: '', frequency: 'MONTHLY' as string, dueDay: '10', description: '' })
  const [saveLoading, setSaveLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // ── Payments state ──
  const [paymentsData, setPaymentsData] = useState<AdminPaymentPage | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [sortMenuOpen, setSortMenuOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  // Close sort dropdown on outside click
  useEffect(() => {
    if (!sortMenuOpen) return
    const handler = () => setSortMenuOpen(false)
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [sortMenuOpen])

  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null)
  const [markPaidForm, setMarkPaidForm] = useState({ paidAt: '', note: '' })
  const [markPaidLoading, setMarkPaidLoading] = useState(false)

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Fetch ──
  useEffect(() => { fetchRulesAndCourses() }, [])

  const fetchRulesAndCourses = async () => {
    setLoading(true); setError('')
    try {
      const [rulesRes, coursesRes] = await Promise.all([
        api.get<PaymentRule[]>('/admin/payment-rules'),
        api.get<CourseOption[]>('/admin/courses'),
      ])
      setRules(rulesRes.data); setCourses(coursesRes.data)
    } catch { setError(t('admin.payments.errorLoad')) }
    finally { setLoading(false) }
  }

  const fetchPayments = useCallback(async (
    page: number, courseId: string, search: string, from: string, to: string, sort: 'asc' | 'desc'
  ) => {
    setPaymentsLoading(true); setPaymentsError('')
    try {
      const params = new URLSearchParams({ page: String(page), size: '10', sort })
      if (courseId) params.set('courseId', courseId)
      if (search.trim()) params.set('search', search.trim())
      if (from) params.set('dateFrom', from)
      if (to) params.set('dateTo', to)
      const res = await api.get<AdminPaymentPage>(`/admin/payments?${params}`)
      setPaymentsData(res.data)
    } catch { setPaymentsError(t('admin.payments.errorLoadPayments')) }
    finally { setPaymentsLoading(false) }
  }, [])

  useEffect(() => {
    if (activeTab === 'payments')
      fetchPayments(currentPage, courseFilter, studentSearch, dateFrom, dateTo, sortDir)
  }, [activeTab, currentPage, courseFilter, studentSearch, dateFrom, dateTo, sortDir, fetchPayments])

  // ── Rule handlers ──
  const openCreateModal = () => {
    setEditingRule(null); setFormData({ courseId: '', amount: '', frequency: 'MONTHLY', dueDay: '10', description: '' })
    setFormError(''); setIsModalOpen(true)
  }
  const openEditModal = (rule: PaymentRule) => {
    setEditingRule(rule)
    setFormData({ courseId: rule.courseId, amount: String(rule.amount), frequency: rule.frequency, dueDay: String(rule.dueDay), description: rule.description || '' })
    setFormError(''); setIsModalOpen(true)
  }
  const closeModal = () => { setIsModalOpen(false); setEditingRule(null) }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault(); setFormError(''); setSaveLoading(true)
    try {
      if (editingRule) {
        const res = await api.patch<PaymentRule>(`/admin/payment-rules/${editingRule.id}`, {
          amount: parseFloat(formData.amount), frequency: formData.frequency,
          dueDay: parseInt(formData.dueDay), description: formData.description || undefined,
        })
        setRules(prev => prev.map(r => r.id === editingRule.id ? res.data : r))
      } else {
        const res = await api.post<PaymentRule>('/admin/payment-rules', {
          courseId: formData.courseId, amount: parseFloat(formData.amount),
          frequency: formData.frequency, dueDay: parseInt(formData.dueDay),
          description: formData.description || undefined,
        })
        setRules(prev => [res.data, ...prev])
      }
      closeModal()
    } catch (err: any) { setFormError(err.response?.data?.message || 'Ошибка при сохранении') }
    finally { setSaveLoading(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.payments.confirmDeleteRule'))) return
    try { await api.delete(`/admin/payment-rules/${id}`); setRules(prev => prev.filter(r => r.id !== id)) }
    catch { alert(t('admin.payments.errorDelete')) }
  }

  const handleGenerate = async (id: string) => {
    try { await api.post(`/admin/payment-rules/${id}/generate`); alert(t('admin.payments.paymentsGenerated')) }
    catch { alert(t('admin.payments.errorGenerate')) }
  }

  // ── Payment handlers ──
  const openMarkPaidModal = (payment: AdminPayment) => {
    setSelectedPayment(payment); setMarkPaidForm({ paidAt: '', note: '' }); setMarkPaidModalOpen(true); setOpenMenuId(null)
  }

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault(); if (!selectedPayment) return
    setMarkPaidLoading(true)
    try {
      const body: { paidAt?: string; note?: string } = {}
      if (markPaidForm.paidAt) body.paidAt = new Date(markPaidForm.paidAt).toISOString()
      if (markPaidForm.note) body.note = markPaidForm.note
      const res = await api.patch<AdminPayment>(`/admin/payments/${selectedPayment.id}/mark-paid`, body)
      setPaymentsData(prev => prev ? { ...prev, content: prev.content.map(p => p.id === selectedPayment.id ? res.data : p) } : prev)
      setMarkPaidModalOpen(false)
    } catch { alert(t('admin.payments.errorMarkPaid')) }
    finally { setMarkPaidLoading(false) }
  }

  const handleMarkUnpaid = async (payment: AdminPayment) => {
    if (!confirm(t('admin.payments.confirmMarkUnpaid', { name: `${payment.studentFirstName} ${payment.studentLastName}` }))) return
    setOpenMenuId(null)
    try {
      const res = await api.patch<AdminPayment>(`/admin/payments/${payment.id}/mark-unpaid`)
      setPaymentsData(prev => prev ? { ...prev, content: prev.content.map(p => p.id === payment.id ? res.data : p) } : prev)
    } catch { alert(t('admin.payments.errorMarkUnpaid')) }
  }

  const getMonthLabel = (p: AdminPayment) =>
    p.periodMonth ? `${MONTH_NAMES[p.periodMonth]} ${p.periodYear ?? ''}` : new Date(p.dueDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const getStatusBadge = (payment: AdminPayment) => {
    const overdue = payment.status !== 'COMPLETED' && new Date(payment.dueDate) < new Date()
    if (payment.status === 'COMPLETED') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium whitespace-nowrap">
        <CheckCircle className="w-3 h-3" /> {t('admin.payments.statusPaid')}
      </span>
    )
    if (overdue) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs font-medium whitespace-nowrap">
        <XCircle className="w-3 h-3" /> {t('admin.payments.statusOverdue')}
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium whitespace-nowrap">
        {t('admin.payments.statusPending')}
      </span>
    )
  }

  const hasActiveFilters = courseFilter || studentSearch || dateFrom || dateTo

  const freqLabel = (f: string) => t(`admin.payments.${f === 'ONE_TIME' ? 'oneTime' : f === 'MONTHLY' ? 'monthly' : 'quarterly'}`)

  return (
    <div className="space-y-4 sm:space-y-6 pb-10">

      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.payments.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('admin.payments.subtitle')}</p>
        </div>
        {activeTab === 'rules' && (
          <button onClick={openCreateModal} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto">
            <Plus className="w-4 h-4" /> {t('admin.payments.addRule')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex">
          {[{ key: 'rules', label: t('admin.payments.tabRules') }, { key: 'payments', label: t('admin.payments.tabPayments') }].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'rules' | 'payments')}
              className={`flex-1 sm:flex-none px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >{tab.label}</button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Rules ── */}
      {activeTab === 'rules' && (
        <>
          <div className="card p-0 overflow-hidden">
            <div className="px-4 pt-4 sm:px-6 sm:pt-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                {t('admin.payments.rulesTitle')}
              </h2>
            </div>

            {loading ? (
              <div className="text-center py-12 text-gray-500">{t('admin.payments.loading')}</div>
            ) : error ? (
              <div className="text-center py-12 text-red-500">{error}</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-12 text-gray-500">{t('admin.payments.noRules')}</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="sm:hidden px-4 pb-4 space-y-2">
                  {rules.map(rule => (
                    <div key={rule.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
                        <span className="text-white font-bold text-xs">{rule.courseName?.[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{rule.courseName}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {freqLabel(rule.frequency)} · {t('admin.payments.dueDayLabel', { day: rule.dueDay })}
                        </p>
                      </div>
                      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 tabular-nums shrink-0">
                        {formatAmount(rule.amount, rule.currency)}
                      </span>
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => handleGenerate(rule.id)} title={t('admin.payments.applyToStudents')}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <RefreshCw className="w-4 h-4 text-blue-500" />
                        </button>
                        <button onClick={() => openEditModal(rule)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button onClick={() => handleDelete(rule.id)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden sm:block overflow-x-auto px-6 pb-6">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        {[t('admin.payments.colCourse'), t('admin.payments.colAmount'), t('admin.payments.colFrequency'), t('admin.payments.colDueDate'), t('admin.payments.colActions')].map((h, i) => (
                          <th key={i} className={`py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${i === 4 ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rules.map(rule => (
                        <tr key={rule.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          <td className="py-3.5 px-4 font-medium text-gray-900 dark:text-gray-100">{rule.courseName}</td>
                          <td className="py-3.5 px-4 font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(rule.amount, rule.currency)}</td>
                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{freqLabel(rule.frequency)}</td>
                          <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">{t('admin.payments.dueDayLabel', { day: rule.dueDay })}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => handleGenerate(rule.id)} title={t('admin.payments.applyToStudents')}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <RefreshCw className="w-4 h-4 text-blue-500" />
                              </button>
                              <button onClick={() => openEditModal(rule)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <Edit className="w-4 h-4 text-gray-500" />
                              </button>
                              <button onClick={() => handleDelete(rule.id)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('admin.payments.howItWorks')}</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>{t('admin.payments.howItWorksTip1')}</li>
              <li>{t('admin.payments.howItWorksTip2')}</li>
              <li>{t('admin.payments.howItWorksTip3')}</li>
              <li>{t('admin.payments.howItWorksTip4')}</li>
            </ul>
          </div>
        </>
      )}

      {/* ── Tab: Payments ── */}
      {activeTab === 'payments' && (
        <div className="card p-0 overflow-hidden">

          {/* Filters */}
          <div className="px-4 pt-4 pb-3 sm:px-6 sm:pt-5 space-y-2.5">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-400 z-10 pointer-events-none" />
              <input
                type="text" value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setCurrentPage(0) }}
                placeholder={t('admin.payments.searchStudent')}
                className="input-field pl-9"
              />
            </div>

            {/* Course + Dates + Sort */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">

              {/* Курс — слева */}
              <div className="relative sm:w-52 shrink-0">
                <select
                  value={courseFilter}
                  onChange={e => { setCourseFilter(e.target.value); setCurrentPage(0) }}
                  className="input-field appearance-none pl-3.5 pr-9 w-full"
                >
                  <option value="">{t('admin.payments.allCourses')}</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>

              {/* Даты — по центру на десктопе, стопкой на мобиле */}
              <div className="flex-1 flex flex-col sm:flex-row sm:items-center sm:justify-center gap-2">
                <input
                  type="date" value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); setCurrentPage(0) }}
                  className="input-field w-full sm:w-[148px] [color-scheme:light] dark:[color-scheme:dark]"
                  title={t('admin.payments.dateFrom')}
                />
                <span className="hidden sm:block text-gray-400 dark:text-gray-500 select-none shrink-0">—</span>
                <input
                  type="date" value={dateTo} min={dateFrom || undefined}
                  onChange={e => { setDateTo(e.target.value); setCurrentPage(0) }}
                  className="input-field w-full sm:w-[148px] [color-scheme:light] dark:[color-scheme:dark]"
                  title={t('admin.payments.dateTo')}
                />
              </div>

              {/* Sort — справа */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setSortMenuOpen(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm font-medium w-full sm:w-auto
                             bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700
                             text-gray-600 dark:text-gray-300 hover:border-gray-300 transition-all whitespace-nowrap"
                >
                  <ArrowUpDown className="w-4 h-4 shrink-0" />
                  <span className="flex-1 sm:flex-none text-left">
                    {sortDir === 'asc' ? t('admin.payments.sortEarlyFirst') : t('admin.payments.sortLateFirst')}
                  </span>
                  <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${sortMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {sortMenuOpen && (
                  <div className="absolute right-0 top-full mt-1.5 min-w-full bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1 animate-[fadeSlideUp_0.15s_ease_both]">
                    {(['asc', 'desc'] as const).map(dir => (
                      <button
                        key={dir}
                        onClick={() => { setSortDir(dir); setCurrentPage(0); setSortMenuOpen(false) }}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-2 transition-colors whitespace-nowrap
                          ${sortDir === dir
                            ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${sortDir === dir ? 'bg-primary-500' : 'bg-transparent'}`} />
                        {dir === 'asc' ? t('admin.payments.sortEarlyFirst') : t('admin.payments.sortLateFirst')}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Reset */}
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={() => { setCourseFilter(''); setStudentSearch(''); setDateFrom(''); setDateTo(''); setCurrentPage(0) }}
                  className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-auto"
                >
                  <X className="w-4 h-4" /> {t('admin.payments.reset')}
                </button>
              )}
            </div>
          </div>

          {paymentsLoading ? (
            <div className="text-center py-16 text-gray-500">{t('admin.payments.loading')}</div>
          ) : paymentsError ? (
            <div className="text-center py-16 text-red-500">{paymentsError}</div>
          ) : !paymentsData || paymentsData.content.length === 0 ? (
            <div className="text-center py-16 text-gray-500">{t('admin.payments.noPayments')}</div>
          ) : (
            <>
              {/* Mobile cards — Users-page style */}
              <div className="sm:hidden px-4 pb-4 space-y-2" ref={menuRef}>
                {paymentsData.content.map(payment => (
                  <div key={payment.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                    {/* Top row: avatar + name/email + status + menu */}
                    <div className="flex items-center gap-3">
                      <Avatar firstName={payment.studentFirstName} lastName={payment.studentLastName} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                          {payment.studentFirstName} {payment.studentLastName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{payment.studentEmail}</p>
                      </div>
                      {getStatusBadge(payment)}
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === payment.id ? null : payment.id)}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                        {openMenuId === payment.id && (
                          <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-20 py-1">
                            {payment.status !== 'COMPLETED' ? (
                              <button
                                onClick={() => openMarkPaidModal(payment)}
                                className="w-full text-left px-3.5 py-2.5 text-sm text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 flex items-center gap-2"
                              >
                                <CheckCircle className="w-4 h-4" /> {t('admin.payments.markPaid')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkUnpaid(payment)}
                                className="w-full text-left px-3.5 py-2.5 text-sm text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 flex items-center gap-2"
                              >
                                <XCircle className="w-4 h-4" /> {t('admin.payments.markUnpaid')}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom row: course · period · amount · due */}
                    <div className="mt-2 ml-12 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="font-medium text-gray-700 dark:text-gray-300">{payment.courseName}</span>
                      <span>·</span>
                      <span>{getMonthLabel(payment)}</span>
                      <span>·</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                        {formatAmount(payment.amount, payment.currency)}
                      </span>
                      <span>·</span>
                      <span>{t('admin.payments.colDeadline').toLowerCase()} {new Date(payment.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</span>
                      {payment.paidAt && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 dark:text-emerald-400">✓ {new Date(payment.paidAt).toLocaleDateString('ru-RU')}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden sm:block overflow-x-auto px-6 pb-6">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      {[t('admin.payments.colStudent'), t('admin.payments.colCourse'), t('admin.payments.colPeriod'), t('admin.payments.colAmount'), t('admin.payments.colDeadline'), t('admin.payments.colStatus'), ''].map((h, i) => (
                        <th key={i} className={`py-3 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide ${i === 6 ? 'text-right' : 'text-left'}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsData.content.map(payment => (
                      <tr key={payment.id} className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <Avatar firstName={payment.studentFirstName} lastName={payment.studentLastName} />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{payment.studentFirstName} {payment.studentLastName}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500">{payment.studentEmail}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">{payment.courseName}</td>
                        <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">{getMonthLabel(payment)}</td>
                        <td className="py-3.5 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(payment.amount, payment.currency)}</td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(payment.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                          {payment.paidAt && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">✓ {new Date(payment.paidAt).toLocaleDateString('ru-RU')}</div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(payment)}</td>
                        <td className="py-3.5 px-4 text-right">
                          {payment.status !== 'COMPLETED' ? (
                            <button onClick={() => openMarkPaidModal(payment)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors">
                              <CheckCircle className="w-3.5 h-3.5" /> {t('admin.payments.markPaid')}
                            </button>
                          ) : (
                            <button onClick={() => handleMarkUnpaid(payment)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors">
                              <XCircle className="w-3.5 h-3.5" /> {t('admin.payments.markUnpaid')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-6 pt-4 pb-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs text-gray-500 dark:text-gray-400 order-2 sm:order-1">
                  {t('admin.payments.shown', { count: paymentsData.content.length, total: paymentsData.totalElements })}
                </span>
                <div className="flex items-center gap-1 order-1 sm:order-2">
                  <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ‹
                  </button>
                  {Array.from({ length: paymentsData.totalPages }, (_, i) => i)
                    .filter(i => Math.abs(i - currentPage) <= 2)
                    .map(i => (
                      <button key={i} onClick={() => setCurrentPage(i)}
                        className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                          i === currentPage ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}>{i + 1}</button>
                    ))}
                  <button onClick={() => setCurrentPage(p => Math.min(paymentsData.totalPages - 1, p + 1))} disabled={currentPage >= paymentsData.totalPages - 1}
                    className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    ›
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Rule Create/Edit — slides up from bottom on mobile ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-md max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {editingRule ? t('admin.payments.modalEditRule') : t('admin.payments.modalAddRule')}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSave} className="px-5 py-5 space-y-4">
              {formError && <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm">{formError}</div>}
              {!editingRule ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.colCourse')} <span className="text-red-500">*</span></label>
                  <select value={formData.courseId} onChange={e => setFormData(p => ({ ...p, courseId: e.target.value }))} className="input-field" required>
                    <option value="">{t('admin.payments.selectCourse')}</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.colCourse')}</label>
                  <input value={editingRule.courseName} disabled className="input-field" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.amountKzt')} <span className="text-red-500">*</span></label>
                <input type="number" min="1" value={formData.amount} onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} className="input-field" placeholder="50000" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.frequency')} <span className="text-red-500">*</span></label>
                <select value={formData.frequency} onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))} className="input-field" required>
                  <option value="MONTHLY">{t('admin.payments.monthly')}</option>
                  <option value="QUARTERLY">{t('admin.payments.quarterly')}</option>
                  <option value="ONE_TIME">{t('admin.payments.oneTime')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.dueDayMonth')} <span className="text-red-500">*</span></label>
                <input type="number" min="1" max="31" value={formData.dueDay} onChange={e => setFormData(p => ({ ...p, dueDay: e.target.value }))} className="input-field" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.description')}</label>
                <input type="text" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} className="input-field" placeholder={t('admin.payments.descriptionOptional')} />
              </div>
              <div className="flex gap-3 pt-2 pb-safe">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">{t('admin.payments.cancel')}</button>
                <button type="submit" disabled={saveLoading} className="btn-primary flex-1">{saveLoading ? t('admin.payments.saving') : t('admin.payments.save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Mark Paid ── */}
      {markPaidModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:max-w-sm max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('admin.payments.modalMarkPaid')}</h2>
              <button onClick={() => setMarkPaidModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleMarkPaid} className="px-5 py-5 space-y-4">
              <div className="flex items-center gap-3 p-3.5 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <Avatar firstName={selectedPayment.studentFirstName} lastName={selectedPayment.studentLastName} />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{selectedPayment.studentFirstName} {selectedPayment.studentLastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{selectedPayment.courseName} · {getMonthLabel(selectedPayment)}</p>
                  <p className="font-bold text-gray-900 dark:text-gray-100 mt-0.5">{formatAmount(selectedPayment.amount, selectedPayment.currency)}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.paidAtLabel')}</label>
                <input type="datetime-local" value={markPaidForm.paidAt} onChange={e => setMarkPaidForm(p => ({ ...p, paidAt: e.target.value }))} className="input-field [color-scheme:light] dark:[color-scheme:dark]" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.payments.paidAtHint')}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.noteLabel')}</label>
                <input type="text" value={markPaidForm.note} onChange={e => setMarkPaidForm(p => ({ ...p, note: e.target.value }))} className="input-field" placeholder={t('admin.payments.notePlaceholder')} />
              </div>
              <div className="flex gap-3 pt-2 pb-safe">
                <button type="button" onClick={() => setMarkPaidModalOpen(false)} className="btn-secondary flex-1">{t('admin.payments.cancel')}</button>
                <button type="submit" disabled={markPaidLoading} className="btn-primary flex-1 bg-emerald-600 hover:bg-emerald-700">
                  {markPaidLoading ? t('admin.payments.saving') : t('admin.payments.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
