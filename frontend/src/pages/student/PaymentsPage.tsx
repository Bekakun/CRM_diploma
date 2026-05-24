import { useState, useEffect, useMemo } from 'react'
import { CheckCircle, XCircle, Clock, CreditCard, TrendingDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import { StatCardSkeleton, Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'

interface Payment {
  id: string
  courseId: string
  courseName: string
  amount: number
  currency: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  dueDate: string
  paidAt?: string
  periodMonth?: number
  periodYear?: number
}

const PAGE_SIZE = 10

function PaymentRowSkeleton() {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800">
      <td className="py-3.5 px-4"><Skeleton className="h-4 w-36 rounded" /></td>
      <td className="py-3.5 px-4"><Skeleton className="h-4 w-20 rounded" /></td>
      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24 rounded" /></td>
      <td className="py-3.5 px-4"><Skeleton className="h-4 w-24 rounded" /></td>
      <td className="py-3.5 px-4"><Skeleton className="h-6 w-24 rounded-full" /></td>
    </tr>
  )
}

export default function PaymentsPage() {
  const { t, i18n } = useTranslation()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    api.get<Payment[]>('/student/payments')
      .then((res) => setPayments(res.data))
      .catch((err) => console.error('Failed to load payments:', err))
      .finally(() => setLoading(false))
  }, [])

  const formatAmount = (amount: number) =>
    new Intl.NumberFormat(i18n.language, { style: 'currency', currency: 'KZT', minimumFractionDigits: 0 }).format(amount)

  const now = new Date()
  const currentMonth = now.getMonth() + 1
  const currentYear = now.getFullYear()

  const totalPaid = payments.filter((p) => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const totalUnpaid = payments.filter((p) => p.status !== 'COMPLETED').reduce((s, p) => s + p.amount, 0)
  const isOverdue = (p: Payment) => p.status !== 'COMPLETED' && new Date(p.dueDate) < now

  const isCurrentMonth = (p: Payment) => {
    const m = p.periodMonth ?? (new Date(p.dueDate).getMonth() + 1)
    const y = p.periodYear ?? new Date(p.dueDate).getFullYear()
    return m === currentMonth && y === currentYear
  }

  const getMonthLabel = (p: Payment) => {
    if (p.periodMonth) {
      return t(`months.${p.periodMonth - 1}`)
    }
    return new Date(p.dueDate).toLocaleDateString(i18n.language, { month: 'long' })
  }

  const getStatusBadge = (p: Payment) => {
    const overdue = isOverdue(p)
    if (p.status === 'COMPLETED') return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5" /> {t('student.payments.status.paid')}
      </span>
    )
    if (overdue) return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-full text-xs font-medium">
        <XCircle className="w-3.5 h-3.5" /> {t('student.payments.status.overdue')}
      </span>
    )
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isCurrentMonth(p)
          ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
      }`}>
        <Clock className="w-3.5 h-3.5" /> {t('student.payments.status.pending')}
      </span>
    )
  }

  const stats = [
    { label: t('student.payments.totalPaid'), value: formatAmount(totalPaid), icon: CheckCircle, bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('student.payments.totalDue'), value: formatAmount(totalUnpaid), icon: TrendingDown, bg: 'bg-amber-50 dark:bg-amber-900/20', iconColor: 'text-amber-600 dark:text-amber-400' },
    { label: t('student.payments.totalCount'), value: String(payments.length), icon: CreditCard, bg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
  ]

  const filtered = useMemo(() => {
    let result = [...payments]
    if (dateFrom) result = result.filter(p => p.dueDate >= dateFrom)
    if (dateTo) result = result.filter(p => p.dueDate <= dateTo + 'T23:59:59')
    result.sort((a, b) => {
      const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      return sortDir === 'asc' ? diff : -diff
    })
    return result
  }, [payments, dateFrom, dateTo, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const resetFilters = () => { setDateFrom(''); setDateTo(''); setPage(1) }

  return (
    <div className="space-y-6">
      <div className="animate-fadeSlideDown">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('student.payments.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('student.payments.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((s, i) => <AnimatedStatCard key={s.label} {...s} delay={i * 80} />)
        }
      </div>

      {loading ? (
        <div className="card animate-[fadeSlideUp_0.4s_0.2s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <Skeleton className="h-6 w-20 mb-4 rounded" />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[t('student.payments.course'), t('student.payments.month'), t('student.payments.amount'), t('student.payments.dueDate'), t('common.status')].map((h) => (
                    <th key={h} className="text-left py-3 px-4">
                      <Skeleton className="h-3 w-16 rounded" />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 4 }).map((_, i) => <PaymentRowSkeleton key={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : payments.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={CreditCard}
            title={t('student.payments.noPayments')}
            description={t('student.payments.subtitle')}
          />
        </div>
      ) : (
        <div className="card animate-[fadeSlideUp_0.4s_0.2s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t('common.from')}</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => { setDateFrom(e.target.value); setPage(1) }}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">{t('common.to')}</label>
              <input
                type="date"
                value={dateTo}
                onChange={e => { setDateTo(e.target.value); setPage(1) }}
                className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={() => { setSortDir(d => d === 'desc' ? 'asc' : 'desc'); setPage(1) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortDir === 'desc' ? t('student.deadlines.sortLatest') : t('student.deadlines.sortEarliest')}
            </button>
            {(dateFrom || dateTo) && (
              <button onClick={resetFilters} className="text-xs text-primary-600 dark:text-primary-400 hover:underline">
                {t('common.cancel')}
              </button>
            )}
            <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
              {filtered.length} {t('student.payments.totalCount').toLowerCase()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {[t('student.payments.course'), t('student.payments.month'), t('student.payments.amount'), t('student.payments.dueDate'), t('common.status')].map((h) => (
                    <th key={h} className="py-2.5 px-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-left">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paged.map((payment) => {
                  const overdue = isOverdue(payment)
                  return (
                    <tr
                      key={payment.id}
                      className={`border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        overdue ? 'bg-red-50/40 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-sm font-medium text-gray-900 dark:text-gray-100">{payment.courseName}</td>
                      <td className="py-3.5 px-4 text-sm text-gray-600 dark:text-gray-400">{getMonthLabel(payment)}</td>
                      <td className="py-3.5 px-4 text-sm font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatAmount(payment.amount)}</td>
                      <td className="py-3.5 px-4">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {new Date(payment.dueDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                        </span>
                        {payment.paidAt && (
                          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
                            ✓ {new Date(payment.paidAt).toLocaleDateString(i18n.language)}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(payment)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {page} / {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                      n === page
                        ? 'bg-primary-600 text-white'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
