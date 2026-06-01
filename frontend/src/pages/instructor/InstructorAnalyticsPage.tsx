import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart2,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  CheckSquare,
  ChevronDown,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'
import api from '../../services/api'

interface LessonResponse {
  id: string
  courseId: string
  courseName: string
  title: string
  scheduledAt: string
  durationMinutes?: number
  location?: string
  onlineMeetingUrl?: string
  recordingUrl?: string
  status?: string
  hasHomework?: boolean
  attendanceCount?: number
  totalStudents?: number
}

// ── Types ──────────────────────────────────────────────────────────────────

interface CourseItem {
  id: string
  title: string
}

interface GradeDistributionItem {
  label: string
  count: number
}

interface AttendanceTrendItem {
  lessonId: string
  lesson: string
  rate: number
  scheduledAt?: string
}

interface StudentRankItem {
  userId: string
  firstName: string
  lastName: string
  avg: number
}

interface CourseAnalytics {
  courseId: string
  courseName: string
  avgGrade: number | null
  totalStudents: number
  submissionRate: number
  attendanceRate: number
  gradeDistribution: GradeDistributionItem[]
  attendanceTrend: AttendanceTrendItem[]
  topStudents: StudentRankItem[]
  bottomStudents: StudentRankItem[]
}

// Colors are not returned from backend — map by index
const DIST_COLORS = ['bg-emerald-500', 'bg-blue-500', 'bg-amber-500', 'bg-red-500']

// ── Sub-components ─────────────────────────────────────────────────────────

function GradeBar({ label, count, color, max }: { label: string; count: number; color: string; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-14 shrink-0 text-right">{label}</span>
      <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 w-6 text-right">{count}</span>
    </div>
  )
}

function AttendanceChart({ data, onBarClick }: { data: AttendanceTrendItem[]; onBarClick: (lessonId: string) => void }) {
  return (
    <div className="flex items-end gap-2 mt-2" style={{ height: '144px' }}>
      {data.map((d) => {
        const heightPx = Math.round((d.rate / 100) * 120)
        const color =
          d.rate >= 90 ? 'bg-emerald-500' :
          d.rate >= 75 ? 'bg-blue-500' :
          d.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
        const clickable = !!d.lessonId
        return (
          <div
            key={d.lesson}
            className={`flex-1 flex flex-col items-center justify-end gap-1 group h-full ${clickable ? 'cursor-pointer' : ''}`}
            onClick={() => clickable && onBarClick(d.lessonId)}
            title={clickable ? `${d.lesson}: ${d.rate}% — перейти к уроку` : `${d.lesson}: ${d.rate}%`}
          >
            <div className="relative flex justify-center w-full">
              <div
                className={`w-full max-w-[32px] rounded-t-lg ${color} opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-300 relative`}
                style={{ height: `${heightPx}px` }}
              >
                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-600 dark:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {d.rate}%
                </span>
              </div>
            </div>
            <span className="text-[9px] text-gray-400 dark:text-gray-500 group-hover:text-primary-500 dark:group-hover:text-primary-400 text-center leading-tight shrink-0 transition-colors">
              {d.scheduledAt
                ? `${new Date(d.scheduledAt).getDate().toString().padStart(2, '0')}.${(new Date(d.scheduledAt).getMonth() + 1).toString().padStart(2, '0')}`
                : d.lesson.replace('Урок ', 'У')}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function InstructorAnalyticsPage() {
  const [courses, setCourses] = useState<CourseItem[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null)
  const [stats, setStats] = useState<CourseAnalytics | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [loadingStats, setLoadingStats] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null)
  const { t } = useTranslation()
  const navigate = useNavigate()

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return
    const handler = () => setDropdownOpen(false)
    const timer = setTimeout(() => document.addEventListener('click', handler), 0)
    return () => { clearTimeout(timer); document.removeEventListener('click', handler) }
  }, [dropdownOpen])

  const openLessonById = async (lessonId: string) => {
    if (!lessonId) return
    try {
      const res = await api.get<LessonResponse>(`/instructor/lessons/${lessonId}`)
      setSelectedLesson(res.data)
    } catch (err) {
      console.error('Failed to load lesson:', err)
    }
  }

  // Load instructor courses
  useEffect(() => {
    api.get('/instructor/courses?size=100')
      .then((res) => {
        const items: CourseItem[] = (res.data.content ?? []).map((c: { id: string; name: string }) => ({
          id: c.id,
          title: c.name,
        }))
        setCourses(items)
        if (items.length > 0) setSelectedCourseId(items[0].id)
      })
      .catch(console.error)
      .finally(() => setLoadingCourses(false))
  }, [])

  // Load analytics when course changes
  useEffect(() => {
    if (!selectedCourseId) return
    setLoadingStats(true)
    api.get<CourseAnalytics>(`/instructor/courses/${selectedCourseId}/analytics`)
      .then((res) => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoadingStats(false))
  }, [selectedCourseId])

  const selectedCourse = courses.find((c) => c.id === selectedCourseId)

  if (loadingCourses) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (courses.length === 0) {
    return (
      <div className="card flex flex-col items-center justify-center py-16 text-center">
        <BookOpen className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-3" />
        <p className="text-sm text-gray-500 dark:text-gray-400">{t('instructor.analytics.noCourses')}</p>
      </div>
    )
  }

  const totalForDist = stats?.gradeDistribution.reduce((s, d) => s + d.count, 0) ?? 0

  return (
    <div className="space-y-6 animate-[fadeSlideDown_0.3s_ease_both]">
      {/* Page header + course picker */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('instructor.analytics.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('instructor.analytics.subtitle')}</p>
        </div>

        {/* Course selector */}
        <div className="relative w-full sm:w-auto">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 px-4 py-2.5 w-full sm:w-auto bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
          >
            <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="flex-1 text-left truncate">{selectedCourse?.title ?? '—'}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform shrink-0 ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-full sm:w-56 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg z-20 overflow-hidden animate-[fadeSlideDown_0.15s_ease_both]">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setSelectedCourseId(c.id); setDropdownOpen(false) }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                    c.id === selectedCourseId
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {loadingStats || !stats ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AnimatedStatCard
              label={t('instructor.analytics.avgGrade')}
              value={stats.avgGrade != null ? `${stats.avgGrade}` : '—'}
              icon={Award}
              bg="bg-emerald-50 dark:bg-emerald-900/20"
              iconColor="text-emerald-600 dark:text-emerald-400"
              delay={0}
            />
            <AnimatedStatCard
              label={t('instructor.analytics.totalStudents')}
              value={`${stats.totalStudents}`}
              icon={Users}
              bg="bg-blue-50 dark:bg-blue-900/20"
              iconColor="text-blue-600 dark:text-blue-400"
              delay={80}
            />
            <AnimatedStatCard
              label={t('instructor.analytics.submissionRate')}
              value={`${stats.submissionRate}%`}
              icon={CheckSquare}
              bg="bg-purple-50 dark:bg-purple-900/20"
              iconColor="text-purple-600 dark:text-purple-400"
              delay={160}
            />
            <AnimatedStatCard
              label={t('instructor.analytics.attendanceRate')}
              value={`${stats.attendanceRate}%`}
              icon={TrendingUp}
              bg="bg-amber-50 dark:bg-amber-900/20"
              iconColor="text-amber-600 dark:text-amber-400"
              delay={240}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Grade distribution */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('instructor.analytics.gradeDistribution')}</h3>
              </div>
              {totalForDist === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t('instructor.analytics.noGrades')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.gradeDistribution.map((d, i) => (
                    <GradeBar key={d.label} label={d.label} count={d.count} color={DIST_COLORS[i] ?? 'bg-gray-400'} max={totalForDist} />
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 dark:text-gray-500 text-right">{t('instructor.analytics.totalStudentsLabel', { count: totalForDist })}</p>
            </div>

            {/* Attendance trend */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('instructor.analytics.attendanceTrend')}</h3>
              </div>
              {stats.attendanceTrend.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">{t('instructor.analytics.noAttendance')}</p>
              ) : (
                <AttendanceChart
                  data={stats.attendanceTrend}
                  onBarClick={openLessonById}
                />
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> ≥90%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> 75–89%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> 60–74%</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> &lt;60%</span>
              </div>
            </div>
          </div>

          {/* Top / Bottom students */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top students */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 text-xs font-bold">↑</span>
                {t('instructor.analytics.topStudents')}
              </h3>
              {stats.topStudents.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">{t('instructor.analytics.noGrades')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.topStudents.map((s, i) => (
                    <div
                      key={s.userId}
                      onClick={() => navigate(`/instructor/students/by-user/${s.userId}`)}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-xl cursor-pointer
                                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        i === 0 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        i === 1 ? 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400' :
                        'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'
                      }`}>{i + 1}</span>
                      <span className="flex-1 text-sm text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{s.firstName} {s.lastName}</span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{s.avg}</span>
                      <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom students */}
            <div className="card space-y-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-bold">↓</span>
                {t('instructor.analytics.bottomStudents')}
              </h3>
              {stats.bottomStudents.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">{t('instructor.analytics.noGrades')}</p>
              ) : (
                <div className="space-y-3">
                  {stats.bottomStudents.map((s) => (
                    <div
                      key={s.userId}
                      onClick={() => navigate(`/instructor/students/by-user/${s.userId}`)}
                      className="px-2 py-1.5 rounded-xl cursor-pointer
                                 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-800 dark:text-gray-200 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors flex items-center gap-1.5">
                          {s.firstName} {s.lastName}
                          <ChevronDown className="w-3.5 h-3.5 -rotate-90 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors" />
                        </span>
                        <span className="text-sm font-semibold text-red-500 dark:text-red-400">{s.avg}</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-red-400 rounded-full transition-all duration-700"
                          style={{ width: `${s.avg}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {selectedLesson && (
        <LessonDetailModal
          lesson={{
            id: selectedLesson.id,
            courseId: selectedLesson.courseId,
            courseName: selectedLesson.courseName,
            title: selectedLesson.title,
            scheduledAt: selectedLesson.scheduledAt,
            durationMinutes: selectedLesson.durationMinutes,
            location: selectedLesson.location,
            onlineMeetingUrl: selectedLesson.onlineMeetingUrl,
            recordingUrl: selectedLesson.recordingUrl,
            status: selectedLesson.status ?? 'SCHEDULED',
            hasHomework: selectedLesson.hasHomework ?? false,
            attendanceCount: selectedLesson.attendanceCount,
            totalStudents: selectedLesson.totalStudents,
          }}
          onClose={() => setSelectedLesson(null)}
          onSave={() => setSelectedLesson(null)}
        />
      )}
    </div>
  )
}
