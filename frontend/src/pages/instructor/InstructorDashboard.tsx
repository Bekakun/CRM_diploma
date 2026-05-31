import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Users, Calendar, Clock, ExternalLink, ChevronRight, FileText, GraduationCap } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import { StatCardSkeleton, ListItemSkeleton } from '../../components/common/Skeleton'
import { useAuthStore } from '../../context/authStore'

interface CourseResponse {
  id: string
  name: string
  enrolledStudents: number
}

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

interface PendingSubmission {
  submissionId: string
  homeworkId: string
  lessonId: string
  courseId: string
  homeworkTitle: string
  lessonTitle: string
  courseName: string
  studentFirstName: string
  studentLastName: string
  githubUrl: string
  submittedAt: string
  isLate: boolean
}

interface UpcomingLesson extends LessonResponse {
  date: string
  time: string
}

export default function InstructorDashboard() {
  const { user } = useAuthStore()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const dateLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const [isLoading, setIsLoading] = useState(true)
  const [courseCount, setCourseCount] = useState(0)
  const [courses, setCourses] = useState<CourseResponse[]>([])
  const [totalStudents, setTotalStudents] = useState(0)
  const [lessonsThisMonth, setLessonsThisMonth] = useState(0)
  const [upcomingLessons, setUpcomingLessons] = useState<UpcomingLesson[]>([])
  const [pendingSubmissions, setPendingSubmissions] = useState<PendingSubmission[]>([])
  const [selectedLesson, setSelectedLesson] = useState<LessonResponse | null>(null)
  const [loadingLessonId, setLoadingLessonId] = useState<string | null>(null)
  const [showCoursesTooltip, setShowCoursesTooltip] = useState(false)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    setIsLoading(true)
    try {
      const [coursesResponse, pendingResponse] = await Promise.all([
        api.get<{ content: CourseResponse[] }>('/instructor/courses', { params: { size: 100 } }),
        api.get<PendingSubmission[]>('/instructor/pending-submissions'),
      ])
      const courses = coursesResponse.data.content

      setCourses(courses)
      setCourseCount(courses.length)
      setTotalStudents(courses.reduce((sum, c) => sum + (c.enrolledStudents || 0), 0))
      setPendingSubmissions(pendingResponse.data)

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

      const lessonsRes = await api.get<{ content: LessonResponse[] }>(
        '/instructor/lessons', { params: { size: 200 } }
      )
      const allLessons: LessonResponse[] = lessonsRes.data.content ?? []

      setLessonsThisMonth(allLessons.filter((l) => {
        const d = new Date(l.scheduledAt)
        return d >= monthStart && d <= monthEnd
      }).length)

      setUpcomingLessons(
        allLessons
          .filter((l) => new Date(l.scheduledAt) >= now)
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
          .slice(0, 5)
          .map((l) => {
            const dt = new Date(l.scheduledAt)
            return {
              ...l,
              date: dt.toLocaleDateString(dateLocale, { day: 'numeric', month: 'short' }),
              time: dt.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }),
            }
          })
      )
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const openLessonById = async (lessonId: string) => {
    setLoadingLessonId(lessonId)
    try {
      const res = await api.get<LessonResponse>(`/instructor/lessons/${lessonId}`)
      setSelectedLesson(res.data)
    } catch (err) {
      console.error('Failed to load lesson:', err)
    } finally {
      setLoadingLessonId(null)
    }
  }

  const stats = [
    { label: t('instructor.courses.title'), value: String(courseCount), icon: BookOpen, bg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400' },
    { label: t('instructor.dashboard.totalStudents'), value: String(totalStudents), icon: Users, bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400' },
    { label: t('common.lessons'), value: String(lessonsThisMonth), icon: Calendar, bg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400' },
    { label: t('instructor.dashboard.pendingSubmissions'), value: String(pendingSubmissions.length), icon: Clock, bg: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400' },
  ]

  const hour = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Almaty' })).getHours()
  const greeting = hour < 6 ? t('common.goodNight') : hour < 12 ? t('common.goodMorning') : hour < 18 ? t('common.goodAfternoon') : t('common.goodEvening')

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl
                      bg-gradient-to-r from-primary-600 via-blue-600 to-cyan-500
                      p-6 text-white shadow-lg
                      animate-[fadeSlideDown_0.4s_ease_both]">
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-cyan-400/15 rounded-full blur-2xl translate-y-1/2" />
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-primary-100/80 text-sm font-medium mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : t('instructor.dashboard.title')}
            </h1>
            <p className="text-primary-100/70 text-sm mt-1">{t('instructor.dashboard.subtitle')}</p>
          </div>
          {!isLoading && (
            <div
              onClick={() => navigate('/instructor/students')}
              className="flex items-center gap-3
                         w-full sm:w-auto
                         bg-white/15 backdrop-blur-sm
                         rounded-2xl px-4 py-3
                         border border-white/20
                         cursor-pointer group
                         hover:bg-white/25 hover:border-white/40
                         active:scale-95
                         transition-all duration-200"
            >
              <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center shrink-0
                              group-hover:bg-white/30 transition-colors">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white/60 font-medium uppercase tracking-wider leading-none">
                  {t('instructor.dashboard.totalStudents')}
                </p>
                <p className="text-3xl font-bold leading-tight mt-0.5 group-hover:scale-105 transition-transform duration-200 inline-block">
                  {totalStudents}
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0" />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat, i) => i === 0 ? (
            <div
              key={stat.label}
              className="relative cursor-pointer"
              onClick={() => navigate('/instructor/courses')}
              onMouseEnter={() => setShowCoursesTooltip(true)}
              onMouseLeave={() => setShowCoursesTooltip(false)}
            >
              <AnimatedStatCard {...stat} delay={i * 80} />
              {showCoursesTooltip && courses.length > 0 && (
                <div className="absolute top-full left-0 mt-2 z-50 w-64
                                bg-white dark:bg-gray-800
                                border border-gray-200 dark:border-gray-700
                                rounded-2xl shadow-xl p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide px-1 mb-2">
                    Мои курсы
                  </p>
                  {courses.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-2 py-1.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <span className="text-sm text-gray-800 dark:text-gray-100 font-medium truncate mr-2">{c.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-400 shrink-0">{c.enrolledStudents} студ.</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : i === 1 ? (
            <div
              key={stat.label}
              className="cursor-pointer"
              onClick={() => navigate('/instructor/students')}
            >
              <AnimatedStatCard {...stat} delay={i * 80} />
            </div>
          ) : (
            <AnimatedStatCard key={stat.label} {...stat} delay={i * 80} />
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming lessons */}
        <div className="card animate-[fadeSlideUp_0.5s_0.2s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('instructor.dashboard.upcomingLessons')}</h2>
            {!isLoading && upcomingLessons.length > 0 && (
              <span className="text-xs text-gray-400 dark:text-gray-500">{upcomingLessons.length}</span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
            </div>
          ) : upcomingLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-3">
                <Calendar className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('instructor.dashboard.noUpcoming')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcomingLessons.map((lesson, i) => (
                <div
                  key={lesson.id}
                  onClick={() => setSelectedLesson(lesson)}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800 cursor-pointer transition-all group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 leading-none">{lesson.date.split(' ')[0]}</span>
                    <span className="text-[10px] text-blue-500/70 dark:text-blue-400/70 leading-none mt-0.5">{lesson.date.split(' ')[1]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{lesson.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{lesson.courseName} • {lesson.time}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending submissions */}
        <div className="card animate-[fadeSlideUp_0.5s_0.3s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('instructor.dashboard.pendingHomework')}</h2>
            {!isLoading && pendingSubmissions.length > 0 && (
              <span className="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-full text-xs font-semibold">
                {pendingSubmissions.length}
              </span>
            )}
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}
            </div>
          ) : pendingSubmissions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl flex items-center justify-center mb-3">
                <FileText className="w-6 h-6 text-emerald-500" />
              </div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('instructor.dashboard.noPending')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {pendingSubmissions.map((s, i) => (
                <div
                  key={s.submissionId}
                  onClick={() => openLessonById(s.lessonId)}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-orange-200 dark:hover:border-orange-800 cursor-pointer transition-all group"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <div className="w-9 h-9 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{s.homeworkTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{s.studentFirstName} {s.studentLastName} • {s.courseName}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(s.submittedAt).toLocaleDateString(dateLocale)}</span>
                      {s.isLate && (
                        <span className="text-xs px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded font-medium">
                          {t('student.deadlines.overdue')}
                        </span>
                      )}
                      <a
                        href={s.githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 ml-auto"
                      >
                        GitHub <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  {loadingLessonId === s.lessonId ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent shrink-0 mt-1" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-primary-500 transition-colors shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

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
          onSave={() => { setSelectedLesson(null); loadDashboardData() }}
        />
      )}
    </div>
  )
}
