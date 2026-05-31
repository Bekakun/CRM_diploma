import { useState, useEffect, useCallback } from 'react'
import { Plus, Edit, Trash2, X, RefreshCw, CheckCircle, XCircle, ChevronLeft, ChevronRight, ArrowUpDown, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

interface CourseOption {
  id: string
  name: string
}

interface PaymentRule {
  id: string
  courseId: string
  courseName: string
  amount: number
  currency: string
  frequency: 'ONE_TIME' | 'MONTHLY' | 'QUARTERLY'
  description?: string
  isActive: boolean
  dueDay: number
}

interface AdminPayment {
  id: string
  studentId: string
  studentFirstName: string
  studentLastName: string
  studentEmail: string
  courseId: string
  courseName: string
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  dueDate: string
  paidAt?: string
  periodMonth?: number
  periodYear?: number
  note?: string
}

interface AdminPaymentPage {
  content: AdminPayment[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

const MONTH_NAMES = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь',
]

const formatAmount = (amount: number, currency = 'KZT') =>
  new Intl.NumberFormat('ru-RU', { style: 'currency', currency, minimumFractionDigits: 0 }).format(amount)

export default function AdminPaymentsPage() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<'rules' | 'payments'>('rules')

  // ── Rules state ──────────────────────────────────────────────
  const [rules, setRules] = useState<PaymentRule[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<PaymentRule | null>(null)
  const [formData, setFormData] = useState({
    courseId: '',
    amount: '',
    frequency: 'MONTHLY' as string,
    dueDay: '10',
    description: '',
  })
  const [saveLoading, setSaveLoading] = useState(false)
  const [formError, setFormError] = useState('')

  // ── Payments state ───────────────────────────────────────────
  const [paymentsData, setPaymentsData] = useState<AdminPaymentPage | null>(null)
  const [paymentsLoading, setPaymentsLoading] = useState(false)
  const [paymentsError, setPaymentsError] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [studentSearch, setStudentSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(0)

  const [markPaidModalOpen, setMarkPaidModalOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<AdminPayment | null>(null)
  const [markPaidForm, setMarkPaidForm] = useState({ paidAt: '', note: '' })
  const [markPaidLoading, setMarkPaidLoading] = useState(false)

  // ── Data fetching ────────────────────────────────────────────
  useEffect(() => {
    fetchRulesAndCourses()
  }, [])

  const fetchRulesAndCourses = async () => {
    setLoading(true)
    setError('')
    try {
      const [rulesRes, coursesRes] = await Promise.all([
        api.get<PaymentRule[]>('/admin/payment-rules'),
        api.get<CourseOption[]>('/admin/courses'),
      ])
      setRules(rulesRes.data)
      setCourses(coursesRes.data)
    } catch {
      setError(t('admin.payments.errorLoad'))
    } finally {
      setLoading(false)
    }
  }

  const fetchPayments = useCallback(async (
    page: number, courseId: string, search: string,
    from: string, to: string, sort: 'asc' | 'desc'
  ) => {
    setPaymentsLoading(true)
    setPaymentsError('')
    try {
      const params = new URLSearchParams({ page: String(page), size: '10', sort })
      if (courseId) params.set('courseId', courseId)
      if (search.trim()) params.set('search', search.trim())
      if (from) params.set('dateFrom', from)
      if (to) params.set('dateTo', to)
      const res = await api.get<AdminPaymentPage>(`/admin/payments?${params}`)
      setPaymentsData(res.data)
    } catch {
      setPaymentsError(t('admin.payments.errorLoadPayments'))
    } finally {
      setPaymentsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeTab === 'payments') {
      fetchPayments(currentPage, courseFilter, studentSearch, dateFrom, dateTo, sortDir)
    }
  }, [activeTab, currentPage, courseFilter, studentSearch, dateFrom, dateTo, sortDir, fetchPayments])

  // ── Rules handlers ───────────────────────────────────────────
  const openCreateModal = () => {
    setEditingRule(null)
    setFormData({ courseId: '', amount: '', frequency: 'MONTHLY', dueDay: '10', description: '' })
    setFormError('')
    setIsModalOpen(true)
  }

  const openEditModal = (rule: PaymentRule) => {
    setEditingRule(rule)
    setFormData({
      courseId: rule.courseId,
      amount: String(rule.amount),
      frequency: rule.frequency,
      dueDay: String(rule.dueDay),
      description: rule.description || '',
    })
    setFormError('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingRule(null)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')
    setSaveLoading(true)
    try {
      if (editingRule) {
        const res = await api.patch<PaymentRule>(`/admin/payment-rules/${editingRule.id}`, {
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          dueDay: parseInt(formData.dueDay),
          description: formData.description || undefined,
        })
        setRules(prev => prev.map(r => r.id === editingRule.id ? res.data : r))
      } else {
        const res = await api.post<PaymentRule>('/admin/payment-rules', {
          courseId: formData.courseId,
          amount: parseFloat(formData.amount),
          frequency: formData.frequency,
          dueDay: parseInt(formData.dueDay),
          description: formData.description || undefined,
        })
        setRules(prev => [res.data, ...prev])
      }
      closeModal()
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Ошибка при сохранении')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm(t('admin.payments.confirmDeleteRule'))) return
    try {
      await api.delete(`/admin/payment-rules/${id}`)
      setRules(prev => prev.filter(r => r.id !== id))
    } catch {
      alert(t('admin.payments.errorDelete'))
    }
  }

  const handleGenerate = async (id: string) => {
    try {
      await api.post(`/admin/payment-rules/${id}/generate`)
      alert(t('admin.payments.paymentsGenerated'))
    } catch {
      alert(t('admin.payments.errorGenerate'))
    }
  }

  // ── Payments handlers ────────────────────────────────────────
  const openMarkPaidModal = (payment: AdminPayment) => {
    setSelectedPayment(payment)
    setMarkPaidForm({ paidAt: '', note: '' })
    setMarkPaidModalOpen(true)
  }

  const handleMarkPaid = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPayment) return
    setMarkPaidLoading(true)
    try {
      const body: { paidAt?: string; note?: string } = {}
      if (markPaidForm.paidAt) body.paidAt = new Date(markPaidForm.paidAt).toISOString()
      if (markPaidForm.note) body.note = markPaidForm.note
      const res = await api.patch<AdminPayment>(`/admin/payments/${selectedPayment.id}/mark-paid`, body)
      setPaymentsData(prev => prev ? {
        ...prev,
        content: prev.content.map(p => p.id === selectedPayment.id ? res.data : p),
      } : prev)
      setMarkPaidModalOpen(false)
    } catch {
      alert(t('admin.payments.errorMarkPaid'))
    } finally {
      setMarkPaidLoading(false)
    }
  }

  const handleMarkUnpaid = async (payment: AdminPayment) => {
    if (!confirm(t('admin.payments.confirmMarkUnpaid', { name: `${payment.studentFirstName} ${payment.studentLastName}` }))) return
    try {
      const res = await api.patch<AdminPayment>(`/admin/payments/${payment.id}/mark-unpaid`)
      setPaymentsData(prev => prev ? {
        ...prev,
        content: prev.content.map(p => p.id === payment.id ? res.data : p),
      } : prev)
    } catch {
      alert(t('admin.payments.errorMarkUnpaid'))
    }
  }

  const getMonthLabel = (p: AdminPayment) =>
    p.periodMonth ? `${MONTH_NAMES[p.periodMonth]} ${p.periodYear ?? ''}` : new Date(p.dueDate).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })

  const getStatusBadge = (payment: AdminPayment) => {
    const overdue = payment.status !== 'COMPLETED' && new Date(payment.dueDate) < new Date()
    if (payment.status === 'COMPLETED') return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
        <CheckCircle className="w-3 h-3" /> {t('admin.payments.statusPaid')}
      </span>
    )
    if (overdue) return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
        <XCircle className="w-3 h-3" /> {t('admin.payments.statusOverdue')}
      </span>
    )
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-xs font-medium">
        {t('admin.payments.statusPending')}
      </span>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('admin.payments.title')}</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">{t('admin.payments.subtitle')}</p>
        </div>
        {activeTab === 'rules' && (
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t('admin.payments.addRule')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-1">
          {[
            { key: 'rules', label: t('admin.payments.tabRules') },
            { key: 'payments', label: t('admin.payments.tabPayments') },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as 'rules' | 'payments')}
              className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Tab: Rules ─────────────────────────────────────────── */}
      {activeTab === 'rules' && (
        <>
          <div className="card">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6">
              {t('admin.payments.rulesTitle')}
            </h2>

            {loading ? (
              <div className="text-center py-8 text-gray-500">{t('admin.payments.loading')}</div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">{t('admin.payments.noRules')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colCourse')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colAmount')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colFrequency')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colDueDate')}</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(rule => (
                      <tr key={rule.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-4 px-4">
                          <span className="font-medium text-gray-900 dark:text-gray-100">{rule.courseName}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-semibold text-gray-900 dark:text-gray-100">
                            {formatAmount(rule.amount, rule.currency)}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-700 dark:text-gray-300">{t(`admin.payments.${rule.frequency === 'ONE_TIME' ? 'oneTime' : rule.frequency === 'MONTHLY' ? 'monthly' : 'quarterly'}`)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-gray-700 dark:text-gray-300">{t('admin.payments.dueDayLabel', { day: rule.dueDay })}</span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleGenerate(rule.id)}
                              title={t('admin.payments.applyToStudents')}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={() => openEditModal(rule)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            </button>
                            <button
                              onClick={() => handleDelete(rule.id)}
                              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{t('admin.payments.howItWorks')}</h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-disc list-inside">
              <li>{t('admin.payments.howItWorksTip1')}</li>
              <li>{t('admin.payments.howItWorksTip2')}</li>
              <li>{t('admin.payments.howItWorksTip3')}</li>
              <li>{t('admin.payments.howItWorksTip4')}</li>
            </ul>
          </div>
        </>
      )}

      {/* ── Tab: Student Payments ───────────────────────────────── */}
      {activeTab === 'payments' && (
        <div className="card">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Student search */}
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setCurrentPage(0) }}
                placeholder={t('admin.payments.searchStudent')}
                className="input-field pl-9"
              />
            </div>

            {/* Course filter */}
            <div className="flex-1 min-w-[150px] max-w-xs">
              <select
                value={courseFilter}
                onChange={e => { setCourseFilter(e.target.value); setCurrentPage(0) }}
                className="input-field"
              >
                <option value="">{t('admin.payments.allCourses')}</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Date range */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setCurrentPage(0) }}
                className="input-field flex-1 sm:w-36 text-sm"
                title={t('admin.payments.dateFrom')}
              />
              <span className="text-gray-400 text-sm shrink-0">—</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={e => { setDateTo(e.target.value); setCurrentPage(0) }}
                className="input-field flex-1 sm:w-36 text-sm"
                title={t('admin.payments.dateTo')}
              />
            </div>

            {/* Sort by date */}
            <button
              onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setCurrentPage(0) }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                         bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                         text-gray-600 dark:text-gray-400
                         hover:border-gray-300 dark:hover:border-gray-600 transition-all shrink-0"
            >
              <ArrowUpDown className="w-4 h-4" />
              {sortDir === 'asc' ? t('admin.payments.sortEarlyFirst') : t('admin.payments.sortLateFirst')}
            </button>

            {/* Reset filters */}
            {(courseFilter || studentSearch || dateFrom || dateTo) && (
              <button
                onClick={() => { setCourseFilter(''); setStudentSearch(''); setDateFrom(''); setDateTo(''); setCurrentPage(0) }}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center gap-1 shrink-0"
              >
                <X className="w-4 h-4" /> {t('admin.payments.reset')}
              </button>
            )}
          </div>

          {paymentsLoading ? (
            <div className="text-center py-12 text-gray-500">{t('admin.payments.loading')}</div>
          ) : paymentsError ? (
            <div className="text-center py-12 text-red-500">{paymentsError}</div>
          ) : !paymentsData || paymentsData.content.length === 0 ? (
            <div className="text-center py-12 text-gray-500">{t('admin.payments.noPayments')}</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colStudent')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colCourse')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colPeriod')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colAmount')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colDeadline')}</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colStatus')}</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{t('admin.payments.colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentsData.content.map(payment => (
                      <tr key={payment.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                            {payment.studentFirstName} {payment.studentLastName}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{payment.studentEmail}</div>
                        </td>
                        <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">{payment.courseName}</td>
                        <td className="py-3.5 px-4 text-sm text-gray-700 dark:text-gray-300">{getMonthLabel(payment)}</td>
                        <td className="py-3.5 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                          {formatAmount(payment.amount, payment.currency)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {new Date(payment.dueDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                          </span>
                          {payment.paidAt && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                              ✓ {new Date(payment.paidAt).toLocaleDateString('ru-RU')}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">{getStatusBadge(payment)}</td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-end gap-2">
                            {payment.status !== 'COMPLETED' ? (
                              <button
                                onClick={() => openMarkPaidModal(payment)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> {t('admin.payments.markPaid')}
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMarkUnpaid(payment)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 rounded-lg transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" /> {t('admin.payments.markUnpaid')}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('admin.payments.shown', { count: paymentsData.content.length, total: paymentsData.totalElements })}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: paymentsData.totalPages }, (_, i) => i)
                    .filter(i => Math.abs(i - currentPage) <= 2)
                    .map(i => (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(i)}
                        className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                          i === currentPage
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(paymentsData.totalPages - 1, p + 1))}
                    disabled={currentPage >= paymentsData.totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Modal: Rule Create/Edit ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {editingRule ? t('admin.payments.modalEditRule') : t('admin.payments.modalAddRule')}
              </h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">{formError}</div>
              )}

              {!editingRule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('admin.payments.colCourse')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.courseId}
                    onChange={e => setFormData(p => ({ ...p, courseId: e.target.value }))}
                    className="input-field"
                    required
                  >
                    <option value="">{t('admin.payments.selectCourse')}</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editingRule && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('admin.payments.colCourse')}</label>
                  <input value={editingRule.courseName} disabled className="input-field bg-gray-50 dark:bg-gray-700" />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.payments.amountKzt')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                  className="input-field"
                  placeholder="50000"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.payments.frequency')} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.frequency}
                  onChange={e => setFormData(p => ({ ...p, frequency: e.target.value }))}
                  className="input-field"
                  required
                >
                  <option value="MONTHLY">{t('admin.payments.monthly')}</option>
                  <option value="QUARTERLY">{t('admin.payments.quarterly')}</option>
                  <option value="ONE_TIME">{t('admin.payments.oneTime')}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.payments.dueDayMonth')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={formData.dueDay}
                  onChange={e => setFormData(p => ({ ...p, dueDay: e.target.value }))}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.payments.description')}
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className="input-field"
                  placeholder={t('admin.payments.descriptionOptional')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  {t('admin.payments.cancel')}
                </button>
                <button type="submit" disabled={saveLoading} className="btn-primary flex-1">
                  {saveLoading ? t('admin.payments.saving') : t('admin.payments.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Mark Paid ────────────────────────────────────── */}
      {markPaidModalOpen && selectedPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t('admin.payments.modalMarkPaid')}</h2>
              <button
                onClick={() => setMarkPaidModalOpen(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleMarkPaid} className="p-6 space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm space-y-1">
                <div className="font-medium text-gray-900 dark:text-gray-100">
                  {selectedPayment.studentFirstName} {selectedPayment.studentLastName}
                </div>
                <div className="text-gray-500 dark:text-gray-400">
                  {selectedPayment.courseName} · {getMonthLabel(selectedPayment)}
                </div>
                <div className="font-semibold text-gray-900 dark:text-gray-100">
                  {formatAmount(selectedPayment.amount, selectedPayment.currency)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.payments.paidAtLabel')}
                </label>
                <input
                  type="datetime-local"
                  value={markPaidForm.paidAt}
                  onChange={e => setMarkPaidForm(p => ({ ...p, paidAt: e.target.value }))}
                  className="input-field"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{t('admin.payments.paidAtHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('admin.payments.noteLabel')}
                </label>
                <input
                  type="text"
                  value={markPaidForm.note}
                  onChange={e => setMarkPaidForm(p => ({ ...p, note: e.target.value }))}
                  className="input-field"
                  placeholder={t('admin.payments.notePlaceholder')}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMarkPaidModalOpen(false)}
                  className="btn-secondary flex-1"
                >
                  {t('admin.payments.cancel')}
                </button>
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
