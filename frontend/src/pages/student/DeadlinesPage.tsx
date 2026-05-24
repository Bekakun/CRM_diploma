import { useState, useEffect, useMemo } from 'react'
import { Clock, CheckCircle2, XCircle, AlertTriangle, BookOpen, Filter, ArrowUpDown, CalendarDays } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import StudentLessonDetailModal from '../../components/student/StudentLessonDetailModal'
import api from '../../services/api'

// ── Types ──────────────────────────────────────────────────────────────────

type DeadlineStatus = 'pending' | 'submitted' | 'graded' | 'overdue'

interface Deadline {
  homeworkId: string
  lessonId?: string
  courseTitle: string
  homeworkTitle: string
  dueDate: string
  status: DeadlineStatus
  grade?: number
  maxGrade: number
  feedback?: string
  submittedAt?: string
  gradedAt?: string
}

interface LessonDetail {
  id: string
  courseId: string
  courseName: string
  title: string
  description?: string
  date: string
  time: string
  durationMinutes?: number
  location?: string
  onlineMeetingUrl?: string
  status?: string
  materials: { id: string; name: string; url: string; type: 'pdf' | 'docx' }[]
  recordingUrl?: string
  homework?: {
    id: string
    title: string
    description: string
    deadline: string
    homeworkFileId?: string
    submittedUrl?: string
    isLate?: boolean
    grade?: number
    maxGrade?: number
    feedback?: string
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const due = new Date(dateStr)
  const now = new Date()
  const diff = due.getTime() - now.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

const STATUS_ICONS: Record<DeadlineStatus, typeof CheckCircle2> = {
  pending: Clock,
  submitted: CheckCircle2,
  graded: CheckCircle2,
  overdue: XCircle,
}

const STATUS_BADGES: Record<DeadlineStatus, string> = {
  pending: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  submitted: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  graded: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  overdue: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
}

const STATUS_ICON_COLORS: Record<DeadlineStatus, string> = {
  pending: 'text-amber-500',
  submitted: 'text-blue-500',
  graded: 'text-emerald-500',
  overdue: 'text-red-500',
}

function urgencyStyle(days: number, status: DeadlineStatus): string {
  if (status === 'graded' || status === 'submitted') return ''
  if (status === 'overdue') return 'border-l-4 border-l-red-400'
  if (days <= 1) return 'border-l-4 border-l-red-400'
  if (days <= 3) return 'border-l-4 border-l-amber-400'
  return 'border-l-4 border-l-transparent'
}

type FilterKey = 'all' | 'pending' | 'submitted' | 'graded' | 'overdue'
type PeriodKey = 'all' | 'week' | 'month' | 'quarter'

// PERIODS is built inside the component so labels can use t()

function getPeriodBounds(period: PeriodKey): { from: Date; to: Date } | null {
  if (period === 'all') return null
  const now = new Date()
  const from = new Date(now)
  const to = new Date(now)
  if (period === 'week') {
    from.setDate(now.getDate() - 7)
    to.setDate(now.getDate() + 7)
  } else if (period === 'month') {
    from.setMonth(now.getMonth() - 1)
    to.setMonth(now.getMonth() + 1)
  } else if (period === 'quarter') {
    from.setMonth(now.getMonth() - 3)
    to.setMonth(now.getMonth() + 3)
  }
  return { from, to }
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function DeadlinesPage() {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [period, setPeriod] = useState<PeriodKey>('all')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [deadlines, setDeadlines] = useState<Deadline[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null)
  const [loadingLessonId, setLoadingLessonId] = useState<string | null>(null)
  const { t, i18n } = useTranslation()

  const PERIODS: { key: PeriodKey; label: string }[] = [
    { key: 'all',     label: t('student.deadlines.allTime') },
    { key: 'week',    label: t('student.deadlines.week') },
    { key: 'month',   label: t('student.deadlines.month') },
    { key: 'quarter', label: t('student.deadlines.quarter') },
  ]

  useEffect(() => {
    api.get<Deadline[]>('/student/deadlines')
      .then((res) => setDeadlines(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const openLesson = async (d: Deadline) => {
    if (!d.lessonId) return
    setLoadingLessonId(d.homeworkId)
    try {
      const [lessonRes, matRes] = await Promise.all([
        api.get<{ id: string; courseId: string; courseName: string; title: string; description?: string; scheduledAt: string; durationMinutes?: number; location?: string; onlineMeetingUrl?: string; recordingUrl?: string; status?: string }>(`/student/lessons/${d.lessonId}`),
        api.get<{ id: string; name: string; fileType: string }[]>(`/instructor/lessons/${d.lessonId}/materials`).catch(() => ({ data: [] })),
      ])

      const lesson = lessonRes.data
      const dt = new Date(lesson.scheduledAt)

      let homework: LessonDetail['homework'] | undefined
      try {
        const hwRes = await api.get<{ id: string; title: string; description: string; deadline: string; maxGrade?: number; homeworkFileId?: string }>(`/instructor/lessons/${d.lessonId}/homework`)
        const hw = hwRes.data
        let submittedUrl: string | undefined
        let grade: number | undefined
        let feedback: string | undefined
        try {
          const subRes = await api.get<{ githubUrl?: string; grade?: number; feedback?: string }>(`/student/homework/${hw.id}/my-submission`)
          submittedUrl = subRes.data.githubUrl
          grade = subRes.data.grade
          feedback = subRes.data.feedback
        } catch { /* no submission */ }
        homework = {
          id: hw.id,
          title: hw.title,
          description: hw.description,
          deadline: hw.deadline,
          maxGrade: hw.maxGrade,
          homeworkFileId: hw.homeworkFileId,
          submittedUrl,
          grade,
          feedback,
        }
      } catch { /* no homework */ }

      setSelectedLesson({
        id: lesson.id,
        courseId: lesson.courseId,
        courseName: lesson.courseName,
        title: lesson.title,
        description: lesson.description,
        date: lesson.scheduledAt,
        time: dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }),
        durationMinutes: lesson.durationMinutes,
        location: lesson.location,
        onlineMeetingUrl: lesson.onlineMeetingUrl,
        status: lesson.status,
        materials: (matRes.data as { id: string; name: string; fileType: string }[]).map(m => ({
          id: m.id,
          name: m.name,
          url: '',
          type: (m.fileType?.toLowerCase() === 'docx' ? 'docx' : 'pdf') as 'pdf' | 'docx',
        })),
        recordingUrl: lesson.recordingUrl,
        homework,
      })
    } catch (e) {
      console.error('Failed to load lesson', e)
    } finally {
      setLoadingLessonId(null)
    }
  }

  const periodFiltered = useMemo(() => {
    const bounds = getPeriodBounds(period)
    if (!bounds) return deadlines
    return deadlines.filter((d) => {
      const due = new Date(d.dueDate).getTime()
      return due >= bounds.from.getTime() && due <= bounds.to.getTime()
    })
  }, [deadlines, period])

  const pendingCount = periodFiltered.filter((d) => d.status === 'pending').length
  const overdueCount = periodFiltered.filter((d) => d.status === 'overdue').length
  const gradedCount = periodFiltered.filter((d) => d.status === 'graded').length

  const filtered = periodFiltered
    .filter((d) => filter === 'all' || d.status === filter)
    .sort((a, b) => {
      const diff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      return sortDir === 'asc' ? diff : -diff
    })

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: t('common.all') },
    { key: 'pending', label: t('student.deadlines.pending') },
    { key: 'submitted', label: t('student.deadlines.submitted') },
    { key: 'graded', label: t('student.deadlines.graded') },
    { key: 'overdue', label: t('student.deadlines.overdue') },
  ]

  return (
    <>
      {selectedLesson && (
        <StudentLessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
      )}

      <div className="space-y-6 animate-[fadeSlideDown_0.3s_ease_both]">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('student.deadlines.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('student.deadlines.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AnimatedStatCard
            label={t('student.deadlines.pending')}
            value={`${pendingCount}`}
            icon={Clock}
            bg="bg-amber-50 dark:bg-amber-900/20"
            iconColor="text-amber-600 dark:text-amber-400"
            delay={0}
          />
          <AnimatedStatCard
            label={t('student.deadlines.overdue')}
            value={`${overdueCount}`}
            icon={AlertTriangle}
            bg="bg-red-50 dark:bg-red-900/20"
            iconColor="text-red-600 dark:text-red-400"
            delay={80}
          />
          <AnimatedStatCard
            label={t('student.deadlines.graded')}
            value={`${gradedCount}`}
            icon={CheckCircle2}
            bg="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600 dark:text-emerald-400"
            delay={160}
          />
        </div>

        {/* Period selector */}
        <div className="flex items-center gap-1 flex-wrap">
          <CalendarDays className="w-4 h-4 text-gray-400 mr-1 shrink-0" />
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === p.key
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Filter tabs + sort */}
        <div className="flex items-center gap-1 flex-wrap">
          <Filter className="w-4 h-4 text-gray-400 mr-1 shrink-0" />
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f.key
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                       bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
                       text-gray-600 dark:text-gray-400
                       hover:border-gray-300 dark:hover:border-gray-600
                       transition-all shrink-0"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortDir === 'asc' ? t('student.deadlines.sortEarliest') : t('student.deadlines.sortLatest')}
          </button>
        </div>

        {/* Deadline list */}
        <div className="space-y-3">
          {loading ? (
            <div className="card flex items-center justify-center py-14">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-14 text-center">
              <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                <CheckCircle2 className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('student.deadlines.noPending')}</p>
            </div>
          ) : (
            filtered.map((d) => {
              const days = daysUntil(d.dueDate)
              const StatusIcon = STATUS_ICONS[d.status]
              const badge = STATUS_BADGES[d.status]
              const iconColor = STATUS_ICON_COLORS[d.status]
              const dueLabel =
                d.status === 'overdue' ? t('student.deadlines.daysAgo', { count: Math.abs(days) }) :
                d.status === 'graded' ? new Date(d.dueDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' }) :
                days === 0 ? t('common.today') :
                days === 1 ? t('common.tomorrow') :
                t('common.inDays', { count: days })

              const isLoading = loadingLessonId === d.homeworkId

              return (
                <div
                  key={d.homeworkId}
                  onClick={() => !isLoading && openLesson(d)}
                  className={`card py-4 flex items-start gap-4 ${urgencyStyle(days, d.status)} ${
                    d.lessonId ? 'cursor-pointer hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-md hover:bg-gray-50 dark:hover:bg-gray-800/70 transition-all duration-150' : ''
                  }`}
                >
                  {/* Course icon */}
                  <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center shrink-0">
                    {isLoading
                      ? <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                      : <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    }
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{d.courseTitle}</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5 leading-tight">{d.homeworkTitle}</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>
                        <StatusIcon className={`w-3 h-3 ${iconColor}`} />
                        {t(`student.deadlines.${d.status}`)}
                      </span>
                      {d.status === 'graded' && d.grade !== undefined && (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                          {d.grade}/{d.maxGrade}
                        </span>
                      )}
                      {d.status !== 'graded' && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">{t('student.deadlines.maxPoints', { count: d.maxGrade })}</span>
                      )}
                    </div>
                  </div>

                  {/* Due date */}
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold tabular-nums ${
                      d.status === 'overdue' ? 'text-red-500 dark:text-red-400' :
                      days <= 1 && d.status === 'pending' ? 'text-red-500 dark:text-red-400' :
                      days <= 3 && d.status === 'pending' ? 'text-amber-500 dark:text-amber-400' :
                      'text-gray-700 dark:text-gray-300'
                    }`}>
                      {dueLabel}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {new Date(d.dueDate).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </>
  )
}
