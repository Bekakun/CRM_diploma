import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import StudentLessonDetailModal from '../../components/student/StudentLessonDetailModal'

interface LessonResponse {
  id: string
  courseId: string
  courseName: string
  title: string
  description?: string
  scheduledAt: string
  durationMinutes: number
  location?: string
  onlineMeetingUrl?: string
  recordingUrl?: string
  status: string
  materialsCount: number
  hasHomework: boolean
}

// Shape expected by StudentLessonDetailModal
interface LessonForModal {
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
    grade?: number
    maxGrade?: number
    feedback?: string
  }
}

// Ordered palette: each course gets a distinct color slot
const COURSE_COLORS = [
  { bg: 'bg-blue-100 dark:bg-blue-900/40',   hover: 'hover:bg-blue-200 dark:hover:bg-blue-900/60',   text: 'text-blue-800 dark:text-blue-200',   sub: 'text-blue-600 dark:text-blue-400' },
  { bg: 'bg-violet-100 dark:bg-violet-900/40', hover: 'hover:bg-violet-200 dark:hover:bg-violet-900/60', text: 'text-violet-800 dark:text-violet-200', sub: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900/40', hover: 'hover:bg-emerald-200 dark:hover:bg-emerald-900/60', text: 'text-emerald-800 dark:text-emerald-200', sub: 'text-emerald-600 dark:text-emerald-400' },
  { bg: 'bg-amber-100 dark:bg-amber-900/40',  hover: 'hover:bg-amber-200 dark:hover:bg-amber-900/60',  text: 'text-amber-800 dark:text-amber-200',  sub: 'text-amber-600 dark:text-amber-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900/40',    hover: 'hover:bg-rose-200 dark:hover:bg-rose-900/60',    text: 'text-rose-800 dark:text-rose-200',    sub: 'text-rose-600 dark:text-rose-400' },
  { bg: 'bg-cyan-100 dark:bg-cyan-900/40',    hover: 'hover:bg-cyan-200 dark:hover:bg-cyan-900/60',    text: 'text-cyan-800 dark:text-cyan-200',    sub: 'text-cyan-600 dark:text-cyan-400' },
]

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [lessons, setLessons] = useState<LessonResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonForModal | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)

  useEffect(() => {
    fetchLessons()
  }, [])

  const fetchLessons = async () => {
    setLoading(true)
    try {
      const res = await api.get<LessonResponse[]>('/student/lessons')
      setLessons(res.data)
    } catch (err) {
      console.error('Failed to load student lessons:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLessonClick = async (lesson: LessonResponse) => {
    setLoadingModal(true)
    try {
      const dt = new Date(lesson.scheduledAt)
      const date = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      const time = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

      // Fetch materials
      let materials: LessonForModal['materials'] = []
      if (lesson.materialsCount > 0) {
        try {
          const matRes = await api.get<{ id: string; name: string; fileType: string }[]>(
            `/instructor/lessons/${lesson.id}/materials`
          )
          materials = matRes.data.map(m => ({
            id: m.id,
            name: m.name,
            url: '',
            type: (m.fileType === 'pdf' ? 'pdf' : 'docx') as 'pdf' | 'docx',
          }))
        } catch {}
      }

      // Fetch homework (always try, don't rely on cached hasHomework flag)
      let homework: LessonForModal['homework'] | undefined
      try {
        const hwRes = await api.get<{
          id: string
          title: string
          description: string
          deadline: string
          maxGrade?: number
          taskFileUrl?: string
        }>(`/instructor/lessons/${lesson.id}/homework`)
        const hw = hwRes.data

        // Check if student already submitted
        let submittedUrl: string | undefined
        let grade: number | undefined
        let feedback: string | undefined
        try {
          const subRes = await api.get<{ githubUrl?: string; grade?: number; feedback?: string }>(
            `/student/homework/${hw.id}/my-submission`
          )
          submittedUrl = subRes.data.githubUrl
          grade = subRes.data.grade
          feedback = subRes.data.feedback
        } catch {}

        homework = {
          id: hw.id,
          title: hw.title,
          description: hw.description,
          deadline: hw.deadline,
          maxGrade: hw.maxGrade,
          homeworkFileId: hw.taskFileUrl ? hw.id : undefined,
          submittedUrl,
          grade,
          feedback,
        }
      } catch {
        // No homework for this lesson — that's fine
      }

      setSelectedLesson({
        id: lesson.id,
        courseId: lesson.courseId,
        courseName: lesson.courseName,
        title: lesson.title,
        description: lesson.description,
        date,
        time,
        durationMinutes: lesson.durationMinutes,
        location: lesson.location,
        onlineMeetingUrl: lesson.onlineMeetingUrl,
        status: lesson.status,
        materials,
        recordingUrl: lesson.recordingUrl,
        homework,
      })
    } finally {
      setLoadingModal(false)
    }
  }

  const localDateStr = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

  const getLessonsForDate = (date: Date) => {
    const dateStr = localDateStr(date)
    return lessons.filter(l => localDateStr(new Date(l.scheduledAt)) === dateStr)
  }

  const getLessonTime = (scheduledAt: string) => {
    return new Date(scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days: (Date | null)[] = []
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null)
    for (let i = 1; i <= lastDay.getDate(); i++) days.push(new Date(year, month, i))
    return days
  }

  const nextMonth = () => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + 1)
    setCurrentDate(d)
  }

  const prevMonth = () => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() - 1)
    setCurrentDate(d)
  }

  // Build stable courseId → color index mapping (sorted by first appearance)
  const courseColorMap = useMemo(() => {
    const seen = new Map<string, number>()
    lessons.forEach(l => {
      if (!seen.has(l.courseId)) seen.set(l.courseId, seen.size % COURSE_COLORS.length)
    })
    return seen
  }, [lessons])

  const getCourseColor = (courseId: string) =>
    COURSE_COLORS[courseColorMap.get(courseId) ?? 0]

  const days = getDaysInMonth(currentDate)
  const weekDays = useMemo(() => {
    const locale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(2023, 0, i + 1)
      return date.toLocaleDateString(locale, { weekday: 'short' })
    })
  }, [i18n.language])

  const monthLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{t('student.calendar.title')}</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">{t('student.calendar.subtitle')}</p>
      </div>

      <div className="card flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString(monthLocale, { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <div className="grid grid-cols-7 gap-1 min-w-[480px] px-1">
            {weekDays.map(day => (
              <div key={day} className="text-center font-semibold text-gray-700 dark:text-gray-300 py-2">
                {day}
              </div>
            ))}

            {days.map((day, index) => {
              if (!day) {
                return <div key={`empty-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800" />
              }

              const dayLessons = getLessonsForDate(day)
              const isToday = day.toDateString() === new Date().toDateString()

              return (
                <div
                  key={day.toISOString()}
                  className={`border-2 rounded-lg p-2 min-h-[120px] ${
                    isToday
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className={`text-sm font-semibold mb-2 ${
                    isToday ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {day.getDate()}
                  </div>

                  <div className="space-y-1">
                    {dayLessons.map(lesson => {
                      const color = getCourseColor(lesson.courseId)
                      return (
                        <div
                          key={lesson.id}
                          onClick={() => !loadingModal && handleLessonClick(lesson)}
                          className={`text-xs p-2 rounded cursor-pointer transition-colors ${color.bg} ${color.hover} ${color.text}`}
                        >
                          <div className="font-semibold truncate">{getLessonTime(lesson.scheduledAt)}</div>
                          <div className="truncate">{lesson.title}</div>
                          <div className={`text-[10px] truncate ${color.sub}`}>{lesson.courseName}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            </div>
          </div>
        )}
      </div>

      {loadingModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white border-t-transparent" />
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
