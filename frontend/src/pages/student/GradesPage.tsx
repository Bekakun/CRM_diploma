import { useState, useEffect } from 'react'
import { Award, BookOpen, CheckSquare, MessageSquare, TrendingUp, Calendar, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import { StatCardSkeleton, GradeSectionSkeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import StudentLessonDetailModal from '../../components/student/StudentLessonDetailModal'

type PeriodPreset = 'all' | 'today' | 'week' | 'custom'

interface Enrollment {
  id: string
  courseId: string
  courseName: string
  averageGrade: number | null
  attendanceRate: number | null
  homeworkCompletionRate: number | null
}

interface HomeworkGrade {
  hwTitle: string
  grade: number
  feedback?: string
  gradedAt: string
  submittedAt: string
  lessonId: string
}

interface LessonForModal {
  id: string
  courseId: string
  courseName: string
  title: string
  date: string
  time: string
  materials: { id: string; name: string; url: string; type: 'pdf' | 'docx' }[]
  recordingUrl?: string
  homework?: {
    id: string
    title: string
    description: string
    deadline: string
    homeworkFileId?: string
    submittedUrl?: string
    grade?: number
  }
}

interface CourseGrades {
  enrollmentId: string
  courseName: string
  averageGrade: number | null
  attendanceRate: number | null
  homeworkCompletionRate: number | null
  grades: HomeworkGrade[]
}

const gradeStyle = (grade: number) => {
  if (grade >= 90) return {
    bar: 'from-emerald-400 to-teal-500',
    badge: 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800/50',
    glow: 'shadow-[0_2px_8px_rgba(16,185,129,0.3)]',
  }
  if (grade >= 75) return {
    bar: 'from-blue-400 to-primary-500',
    badge: 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800/50',
    glow: 'shadow-[0_2px_8px_rgba(59,130,246,0.3)]',
  }
  if (grade >= 60) return {
    bar: 'from-amber-400 to-orange-500',
    badge: 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/50',
    glow: 'shadow-[0_2px_8px_rgba(245,158,11,0.3)]',
  }
  return {
    bar: 'from-red-400 to-rose-500',
    badge: 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30 border border-red-100 dark:border-red-800/50',
    glow: 'shadow-[0_2px_8px_rgba(239,68,68,0.3)]',
  }
}

const fmt = (v: number | null) => (v != null ? `${Math.round(v)}%` : '—')

export default function GradesPage() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const [courses, setCourses] = useState<CourseGrades[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [period, setPeriod] = useState<PeriodPreset>('all')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc')
  const [selectedLesson, setSelectedLesson] = useState<LessonForModal | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)

  useEffect(() => { loadGrades() }, [])

  const loadGrades = async () => {
    setLoading(true)
    try {
      const enrollRes = await api.get<Enrollment[]>('/student/me/enrollments')
      const courseGrades: CourseGrades[] = []

      await Promise.all(
        enrollRes.data.map(async (enrollment) => {
          try {
            const perfRes = await api.get<{
              courseName: string
              averageGrade: number | null
              attendanceRate: number | null
              homeworkCompletionRate: number | null
              performance: {
                lessonId: string
                homework?: {
                  title: string
                  submission?: { grade?: number; feedback?: string; gradedAt?: string; submittedAt?: string }
                }
              }[]
            }>(`/student/me/performance/${enrollment.id}`)

            const grades: HomeworkGrade[] = perfRes.data.performance
              .filter((p) => p.homework?.submission?.grade != null)
              .map((p) => ({
                hwTitle: p.homework!.title,
                grade: p.homework!.submission!.grade!,
                feedback: p.homework!.submission!.feedback,
                gradedAt: p.homework!.submission!.gradedAt ?? '',
                submittedAt: p.homework!.submission!.submittedAt ?? '',
                lessonId: p.lessonId,
              }))
              .sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())

            courseGrades.push({
              enrollmentId: enrollment.id,
              courseName: perfRes.data.courseName,
              averageGrade: perfRes.data.averageGrade,
              attendanceRate: perfRes.data.attendanceRate,
              homeworkCompletionRate: perfRes.data.homeworkCompletionRate,
              grades,
            })
          } catch {}
        })
      )
      setCourses(courseGrades)
      if (courseGrades.length > 0) setSelectedCourseId(prev => prev ?? courseGrades[0].enrollmentId)
    } catch (err) {
      console.error('Failed to load grades:', err)
    } finally {
      setLoading(false)
    }
  }

  const filterGrades = (grades: HomeworkGrade[]): HomeworkGrade[] => {
    if (period === 'all') return grades
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    if (period === 'today') {
      return grades.filter(g => g.gradedAt && new Date(g.gradedAt) >= startOfToday)
    }
    if (period === 'week') {
      const weekAgo = new Date(startOfToday)
      weekAgo.setDate(weekAgo.getDate() - 6)
      return grades.filter(g => g.gradedAt && new Date(g.gradedAt) >= weekAgo)
    }
    if (period === 'custom') {
      const from = customFrom ? new Date(customFrom) : null
      const to = customTo ? new Date(customTo + 'T23:59:59') : null
      return grades.filter(g => {
        if (!g.gradedAt) return false
        const d = new Date(g.gradedAt)
        if (from && d < from) return false
        if (to && d > to) return false
        return true
      })
    }
    return grades
  }

  const handleGradeClick = async (hw: HomeworkGrade, courseId: string, courseName: string) => {
    setLoadingModal(true)
    try {
      const lessonsRes = await api.get<{ id: string; courseId: string; courseName: string; title: string; scheduledAt: string; recordingUrl?: string; materialsCount: number }[]>('/student/lessons')
      const lesson = lessonsRes.data.find(l => l.id === hw.lessonId)
      if (!lesson) return

      const dt = new Date(lesson.scheduledAt)
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const time = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

      let materials: LessonForModal['materials'] = []
      if (lesson.materialsCount > 0) {
        try {
          const matRes = await api.get<{ id: string; name: string; fileType: string }[]>(`/instructor/lessons/${lesson.id}/materials`)
          materials = matRes.data.map(m => ({ id: m.id, name: m.name, url: '', type: (m.fileType === 'pdf' ? 'pdf' : 'docx') as 'pdf' | 'docx' }))
        } catch {}
      }

      let homework: LessonForModal['homework'] | undefined
      try {
        const hwRes = await api.get<{ id: string; title: string; description: string; deadline: string; taskFileUrl?: string }>(`/instructor/lessons/${lesson.id}/homework`)
        const h = hwRes.data
        let submittedUrl: string | undefined
        let grade: number | undefined
        try {
          const subRes = await api.get<{ githubUrl?: string; grade?: number }>(`/student/homework/${h.id}/my-submission`)
          submittedUrl = subRes.data.githubUrl
          grade = subRes.data.grade
        } catch {}
        homework = { id: h.id, title: h.title, description: h.description, deadline: h.deadline, homeworkFileId: h.taskFileUrl ? h.id : undefined, submittedUrl, grade }
      } catch {}

      setSelectedLesson({ id: lesson.id, courseId, courseName, title: lesson.title, date, time, materials, recordingUrl: lesson.recordingUrl, homework })
    } finally {
      setLoadingModal(false)
    }
  }

  const activeCourse = courses.find(c => c.enrollmentId === selectedCourseId) ?? courses[0] ?? null

  const filteredCourses = courses.map(c => ({
    ...c,
    grades: filterGrades(c.grades).sort((a, b) => {
      const diff = new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime()
      return sortDir === 'desc' ? diff : -diff
    }),
  }))
  const activeFiltered = filteredCourses.find(c => c.enrollmentId === selectedCourseId) ?? filteredCourses[0] ?? null

  const overallAvg = activeCourse?.averageGrade != null ? Math.round(activeCourse.averageGrade) : null
  const totalGraded = activeFiltered?.grades.length ?? 0

  const stats = [
    { label: t('student.grades.avgGrade'), value: overallAvg != null ? `${overallAvg}%` : '—', icon: Award, bg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400' },
    { label: t('common.courses'), value: String(courses.length), icon: BookOpen, bg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('student.grades.graded'), value: String(totalGraded), icon: CheckSquare, bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  ]

  return (
    <div className="space-y-6">
      <div className="animate-fadeSlideDown">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('student.grades.title')}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('student.grades.subtitle')}</p>
      </div>

      {/* Period filter */}
      <div className="card !p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-500 dark:text-gray-400 shrink-0">
          <Calendar className="w-4 h-4" />
          <span>{t('student.grades.period')}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'today', 'week', 'custom'] as PeriodPreset[]).map((p) => {
            const labels: Record<PeriodPreset, string> = {
              all: t('student.grades.periodAll'),
              today: t('student.grades.periodToday'),
              week: t('student.grades.periodWeek'),
              custom: t('student.grades.periodCustom'),
            }
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  period === p
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {labels[p]}
              </button>
            )
          })}
        </div>
        {period === 'custom' && (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customFrom}
              onChange={e => setCustomFrom(e.target.value)}
              className="input-field !py-1.5 !px-3 !text-sm w-auto"
            />
            <span className="text-gray-400 text-sm">—</span>
            <input
              type="date"
              value={customTo}
              onChange={e => setCustomTo(e.target.value)}
              className="input-field !py-1.5 !px-3 !text-sm w-auto"
            />
          </div>
        )}

        {/* Sort */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('student.grades.sort')}</span>
          <button
            onClick={() => setSortDir(d => d === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                       bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400
                       hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-150"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortDir === 'desc' ? t('student.grades.sortNewest') : t('student.grades.sortOldest')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((s, i) => <AnimatedStatCard key={s.label} {...s} delay={i * 80} />)
        }
      </div>

      {/* Course tabs */}
      {!loading && courses.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {courses.map(c => (
            <button
              key={c.enrollmentId}
              onClick={() => setSelectedCourseId(c.enrollmentId)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 flex items-center gap-2 ${
                selectedCourseId === c.enrollmentId
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-primary-300 dark:hover:border-primary-700'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              {c.courseName}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 1 }).map((_, i) => <GradeSectionSkeleton key={i} />)}
        </div>
      ) : !activeFiltered ? (
        <div className="card">
          <EmptyState
            icon={Award}
            title="Нет записей об успеваемости"
            description="Оценки появятся после зачисления на курс"
          />
        </div>
      ) : (
        <div className="space-y-4 animate-[fadeSlideUp_0.4s_0.2s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          {[activeFiltered].map((course) => {
            const style = course.averageGrade != null ? gradeStyle(course.averageGrade) : null
            return (
              <div key={course.enrollmentId} className="card overflow-hidden">
                {/* Gradient top strip */}
                {style && (
                  <div className={`h-1 bg-gradient-to-r ${style.bar} -mx-6 -mt-6 mb-5`} />
                )}

                {/* Course header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-sm">
                        <BookOpen className="w-4 h-4 text-white" />
                      </div>
                      <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{course.courseName}</h2>
                    </div>
                    <div className="flex flex-wrap gap-5 mt-2">
                      <div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">
                          {t('common.attendance')}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-400 to-primary-500 transition-all duration-700"
                              style={{ width: `${course.attendanceRate ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmt(course.attendanceRate)}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-1.5 uppercase tracking-wide">
                          {t('student.grades.hwCompletion')}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-700"
                              style={{ width: `${course.homeworkCompletionRate ?? 0}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{fmt(course.homeworkCompletionRate)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {course.averageGrade != null && style && (
                    <div className={`px-4 py-2.5 rounded-2xl font-bold text-2xl shrink-0 ${style.badge} ${style.glow}`}>
                      {Math.round(course.averageGrade)}%
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                {course.averageGrade != null && style && (
                  <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full mb-5 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${style.bar} transition-all duration-1000`}
                      style={{ width: `${course.averageGrade}%` }}
                    />
                  </div>
                )}

                {/* Grades list */}
                {course.grades.length === 0 ? (
                  <p className="text-sm text-center py-6 text-gray-400 dark:text-gray-500">
                    {t('student.grades.noGraded')}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {course.grades.map((hw, i) => {
                      const s = gradeStyle(hw.grade)
                      return (
                        <div
                          key={i}
                          onClick={() => handleGradeClick(hw, course.enrollmentId, course.courseName)}
                          className="p-4 bg-gray-50/80 dark:bg-gray-800/40
                                     rounded-xl border border-gray-100 dark:border-gray-800/60
                                     hover:border-violet-200 dark:hover:border-violet-700
                                     hover:bg-violet-50/50 dark:hover:bg-violet-900/10
                                     transition-colors cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div className="w-7 h-7 bg-violet-50 dark:bg-violet-900/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                                <TrendingUp className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{hw.hwTitle}</p>
                                {hw.gradedAt && (
                                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                                    {t('student.grades.checked')} {new Date(hw.gradedAt).toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' })}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className={`px-3 py-1.5 rounded-xl text-sm font-bold shrink-0 ${s.badge}`}>
                              {hw.grade}%
                            </span>
                          </div>
                          {hw.feedback && (
                            <div className="mt-3 flex items-start gap-2 p-3
                                            bg-white dark:bg-gray-900/80
                                            rounded-xl border border-gray-100 dark:border-gray-800">
                              <MessageSquare className="w-3.5 h-3.5 text-primary-400 mt-0.5 shrink-0" />
                              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{hw.feedback}</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {loadingModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
      {selectedLesson && !loadingModal && (
        <StudentLessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
        />
      )}
    </div>
  )
}
