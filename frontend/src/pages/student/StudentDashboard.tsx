import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Calendar, Award, Clock, ArrowRight, Sparkles, TrendingUp, Flame } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import AnimatedStatCard from '../../components/common/AnimatedStatCard'
import { StatCardSkeleton, ListItemSkeleton } from '../../components/common/Skeleton'
import { useAuthStore } from '../../context/authStore'
import StudentLessonDetailModal from '../../components/student/StudentLessonDetailModal'

interface Enrollment {
  id: string
  courseId: string
  courseName: string
  averageGrade: number | null
  attendanceRate: number | null
  homeworkCompletionRate: number | null
}

interface LessonResponse {
  id: string
  courseId: string
  title: string
  courseName: string
  scheduledAt: string
  hasHomework: boolean
}

interface RecentGrade {
  hwTitle: string
  courseName: string
  grade: number
  gradedAt: string
  lessonId: string
  courseId: string
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

export default function StudentDashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [upcomingLessons, setUpcomingLessons] = useState<LessonResponse[]>([])
  const [recentGrades, setRecentGrades] = useState<RecentGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonForModal | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [enrollRes, lessonsRes] = await Promise.all([
        api.get<Enrollment[]>('/student/me/enrollments'),
        api.get<LessonResponse[]>('/student/lessons'),
      ])
      setEnrollments(enrollRes.data)
      const now = new Date()
      setUpcomingLessons(lessonsRes.data.filter(l => new Date(l.scheduledAt) >= now).slice(0, 3))

      const grades: RecentGrade[] = []
      for (const enrollment of enrollRes.data) {
        try {
          const perfRes = await api.get<{
            performance: { lessonId: string; lessonTitle: string; homework?: { title: string; submission?: { grade?: number; gradedAt?: string } } }[]
            courseName: string
          }>(`/student/me/performance/${enrollment.id}`)
          for (const p of perfRes.data.performance) {
            const sub = p.homework?.submission
            if (sub?.grade != null && sub.gradedAt) {
              grades.push({
                hwTitle: p.homework!.title,
                courseName: perfRes.data.courseName,
                grade: sub.grade,
                gradedAt: sub.gradedAt,
                lessonId: p.lessonId,
                courseId: enrollment.courseId,
              })
            }
          }
        } catch {}
      }
      grades.sort((a, b) => new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime())
      setRecentGrades(grades.slice(0, 4))
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  const avgGrade = enrollments.length > 0
    ? Math.round(enrollments.reduce((s, e) => s + (e.averageGrade ?? 0), 0) / enrollments.length)
    : null

  const pendingHomework = upcomingLessons.filter(l => l.hasHomework).length

  const handleGradeClick = async (g: RecentGrade) => {
    setLoadingModal(true)
    try {
      const lessonsRes = await api.get<{ id: string; courseId: string; courseName: string; title: string; scheduledAt: string; recordingUrl?: string; materialsCount: number }[]>('/student/lessons')
      const lesson = lessonsRes.data.find(l => l.id === g.lessonId)
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
        const hw = hwRes.data
        let submittedUrl: string | undefined
        let grade: number | undefined
        try {
          const subRes = await api.get<{ githubUrl?: string; grade?: number }>(`/student/homework/${hw.id}/my-submission`)
          submittedUrl = subRes.data.githubUrl
          grade = subRes.data.grade
        } catch {}
        homework = { id: hw.id, title: hw.title, description: hw.description, deadline: hw.deadline, homeworkFileId: hw.taskFileUrl ? hw.id : undefined, submittedUrl, grade }
      } catch {}

      setSelectedLesson({ id: lesson.id, courseId: lesson.courseId, courseName: lesson.courseName, title: lesson.title, date, time, materials, recordingUrl: lesson.recordingUrl, homework })
    } finally {
      setLoadingModal(false)
    }
  }

  const handleLessonClick = async (lesson: LessonResponse) => {
    setLoadingModal(true)
    try {
      const dt = new Date(lesson.scheduledAt)
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const time = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

      let materials: LessonForModal['materials'] = []
      try {
        const matRes = await api.get<{ id: string; name: string; fileType: string }[]>(`/instructor/lessons/${lesson.id}/materials`)
        materials = matRes.data.map(m => ({ id: m.id, name: m.name, url: '', type: (m.fileType === 'pdf' ? 'pdf' : 'docx') as 'pdf' | 'docx' }))
      } catch {}

      let homework: LessonForModal['homework'] | undefined
      try {
        const hwRes = await api.get<{ id: string; title: string; description: string; deadline: string; taskFileUrl?: string }>(`/instructor/lessons/${lesson.id}/homework`)
        const hw = hwRes.data
        let submittedUrl: string | undefined
        let grade: number | undefined
        try {
          const subRes = await api.get<{ githubUrl?: string; grade?: number }>(`/student/homework/${hw.id}/my-submission`)
          submittedUrl = subRes.data.githubUrl
          grade = subRes.data.grade
        } catch {}
        homework = { id: hw.id, title: hw.title, description: hw.description, deadline: hw.deadline, homeworkFileId: hw.taskFileUrl ? hw.id : undefined, submittedUrl, grade }
      } catch {}

      setSelectedLesson({ id: lesson.id, courseId: lesson.courseId, courseName: lesson.courseName, title: lesson.title, date, time, materials, homework })
    } finally {
      setLoadingModal(false)
    }
  }

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800'
    if (grade >= 75) return 'text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
    if (grade >= 60) return 'text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800'
    return 'text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/30 border-red-200 dark:border-red-800'
  }

  const stats = [
    { label: t('student.dashboard.enrolledCourses'), value: String(enrollments.length), icon: BookOpen, bg: 'bg-blue-50 dark:bg-blue-900/20', iconColor: 'text-blue-600 dark:text-blue-400', onClick: () => navigate('/student/grades') },
    { label: t('student.dashboard.upcomingLessons'), value: String(upcomingLessons.length), icon: Calendar, bg: 'bg-emerald-50 dark:bg-emerald-900/20', iconColor: 'text-emerald-600 dark:text-emerald-400', onClick: () => navigate('/student/calendar') },
    { label: t('student.dashboard.avgGrade'), value: avgGrade != null ? `${avgGrade}%` : '—', icon: Award, bg: 'bg-violet-50 dark:bg-violet-900/20', iconColor: 'text-violet-600 dark:text-violet-400', onClick: () => navigate('/student/grades') },
    { label: t('common.homework'), value: String(pendingHomework), icon: Clock, bg: 'bg-orange-50 dark:bg-orange-900/20', iconColor: 'text-orange-600 dark:text-orange-400', onClick: () => navigate('/student/deadlines') },
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12
    ? t('common.goodMorning')
    : hour < 18
    ? t('common.goodAfternoon')
    : t('common.goodEvening')

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl
                      bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500
                      p-6 text-white shadow-lg
                      animate-[fadeSlideDown_0.4s_ease_both]">
        {/* Decorative blobs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/10 rounded-full blur-2xl translate-y-1/2" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="text-emerald-100/80 text-sm font-medium mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold leading-tight">
              {user ? `${user.firstName} ${user.lastName}` : t('student.dashboard.title')}
            </h1>
            <p className="text-emerald-100/70 text-sm mt-1">{t('student.dashboard.subtitle')}</p>
          </div>
          {avgGrade != null && (
            <div className="text-center bg-white/15 backdrop-blur-sm rounded-2xl px-5 py-3 border border-white/20 shrink-0">
              <div className="flex items-center gap-1.5 justify-center mb-0.5">
                <Flame className="w-4 h-4 text-amber-300" />
                <span className="text-xs text-emerald-100/70 font-medium">{t('student.dashboard.avgGrade')}</span>
              </div>
              <p className="text-3xl font-bold">{avgGrade}%</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : stats.map((stat, i) => (
            <AnimatedStatCard key={stat.label} {...stat} delay={i * 80} onClick={stat.onClick} />
          ))
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming lessons */}
        <div className="card animate-[fadeSlideUp_0.5s_0.2s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('student.dashboard.upcomingLessons')}</h2>
            <button
              onClick={() => navigate('/student/calendar')}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
            >
              Все <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <ListItemSkeleton key={i} />)}</div>
          ) : upcomingLessons.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">{t('student.dashboard.noLessons')}</div>
          ) : (
            <div className="space-y-2">
              {upcomingLessons.map((lesson, i) => {
                const dt = new Date(lesson.scheduledAt)
                return (
                  <div
                    key={lesson.id}
                    onClick={() => handleLessonClick(lesson)}
                    className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-primary-200 dark:hover:border-primary-800 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all duration-200 group cursor-pointer"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="w-10 h-10 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary-100 dark:group-hover:bg-primary-900/40 transition-colors">
                      <Calendar size={18} className="text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{lesson.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{lesson.courseName}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <span>{dt.toLocaleDateString(dateLocale)}</span>
                        <span>{dt.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent grades */}
        <div className="card animate-[fadeSlideUp_0.5s_0.3s_ease_both] opacity-0 [animation-fill-mode:forwards]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t('student.dashboard.recentGrades')}</h2>
            <button
              onClick={() => navigate('/student/grades')}
              className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
            >
              Все <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <ListItemSkeleton key={i} />)}</div>
          ) : recentGrades.length === 0 ? (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">{t('student.dashboard.noGrades')}</div>
          ) : (
            <div className="space-y-2">
              {recentGrades.map((g, i) => (
                <div
                  key={i}
                  onClick={() => handleGradeClick(g)}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-violet-200 dark:hover:border-violet-800 hover:bg-violet-50/50 dark:hover:bg-violet-900/10 transition-all duration-200 cursor-pointer"
                >
                  <div className="w-10 h-10 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center shrink-0">
                    <TrendingUp size={18} className="text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{g.hwTitle}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{g.courseName}</p>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-sm font-bold border ${getGradeColor(g.grade)}`}>
                    {g.grade}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lesson detail modal */}
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

      {/* AI Banner */}
      <div className="relative overflow-hidden rounded-3xl
                      bg-gradient-to-br from-violet-600 via-primary-600 to-cyan-600
                      p-6 text-white
                      shadow-[0_8px_32px_rgba(99,102,241,0.4)]
                      animate-[fadeSlideUp_0.5s_0.4s_ease_both] opacity-0 [animation-fill-mode:forwards]">
        {/* Decorative orbs */}
        <div className="absolute -top-6 -right-6 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 left-1/4 w-48 h-48 bg-cyan-400/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-violet-400/20 rounded-full blur-xl -translate-y-1/2" />
        {/* Dot grid */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '18px 18px' }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="relative w-14 h-14 bg-white/15 backdrop-blur-sm rounded-2xl
                            flex items-center justify-center shrink-0
                            border border-white/20 shadow-inner">
              <Sparkles className="w-7 h-7 text-white drop-shadow" />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/10 to-transparent" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <h3 className="font-bold text-lg">{t('student.aiAssistant.title')}</h3>
                <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-bold uppercase tracking-wide shrink-0">
                  Beta
                </span>
              </div>
              <p className="text-white/70 text-sm">{t('student.aiAssistant.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/student/ai-assistant')}
            className="bg-white/95 text-primary-700 px-5 py-2.5 rounded-xl font-bold text-sm
                       hover:bg-white transition-all duration-200
                       hover:-translate-y-0.5
                       shadow-[0_4px_14px_rgba(0,0,0,0.2)]
                       hover:shadow-[0_6px_20px_rgba(0,0,0,0.25)]
                       w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {t('common.aiAssistant')} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
