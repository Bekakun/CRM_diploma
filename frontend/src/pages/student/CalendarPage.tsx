import { useState, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, BookOpen } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import StudentLessonDetailModal from '../../components/student/StudentLessonDetailModal'

interface LessonResponse {
  id: string; courseId: string; courseName: string; title: string
  description?: string; scheduledAt: string; durationMinutes: number
  location?: string; onlineMeetingUrl?: string; recordingUrl?: string
  status: string; materialsCount: number; hasHomework: boolean
}

interface LessonForModal {
  id: string; courseId: string; courseName: string; title: string
  description?: string; date: string; time: string; durationMinutes?: number
  location?: string; onlineMeetingUrl?: string; status?: string
  materials: { id: string; name: string; url: string; type: 'pdf' | 'docx' }[]
  recordingUrl?: string
  homework?: {
    id: string; title: string; description: string; deadline: string
    homeworkFileId?: string; submittedUrl?: string; grade?: number
    maxGrade?: number; feedback?: string
  }
}

const COURSE_DOT_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
  'bg-amber-500', 'bg-rose-500', 'bg-cyan-500',
]
const COURSE_CARD_COLORS = [
  'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  'bg-violet-50 dark:bg-violet-900/20 border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-200',
  'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
  'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200',
  'bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200',
]

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

// Week days Mon-first
const WEEK_DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export default function CalendarPage() {
  const { t, i18n } = useTranslation()
  const [currentDate, setCurrentDate]     = useState(new Date())
  const [selectedDate, setSelectedDate]   = useState<Date>(new Date())
  const [lessons, setLessons]             = useState<LessonResponse[]>([])
  const [loading, setLoading]             = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<LessonForModal | null>(null)
  const [loadingModal, setLoadingModal]   = useState(false)

  useEffect(() => { fetchLessons() }, [])

  const fetchLessons = async () => {
    setLoading(true)
    try {
      const res = await api.get<LessonResponse[]>('/student/lessons')
      setLessons(res.data)
    } catch {}
    finally { setLoading(false) }
  }

  const handleLessonClick = async (lesson: LessonResponse) => {
    setLoadingModal(true)
    try {
      const dt = new Date(lesson.scheduledAt)
      const date = toDateStr(dt)
      const time = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

      let materials: LessonForModal['materials'] = []
      if (lesson.materialsCount > 0) {
        try {
          const mr = await api.get<{ id: string; name: string; fileType: string }[]>(`/instructor/lessons/${lesson.id}/materials`)
          materials = mr.data.map(m => ({ id: m.id, name: m.name, url: '', type: (m.fileType === 'pdf' ? 'pdf' : 'docx') as 'pdf' | 'docx' }))
        } catch {}
      }

      let homework: LessonForModal['homework'] | undefined
      try {
        const hw = (await api.get<{ id: string; title: string; description: string; deadline: string; maxGrade?: number; taskFileUrl?: string }>(`/instructor/lessons/${lesson.id}/homework`)).data
        let submittedUrl: string | undefined, grade: number | undefined, feedback: string | undefined
        try {
          const sub = (await api.get<{ githubUrl?: string; grade?: number; feedback?: string }>(`/student/homework/${hw.id}/my-submission`)).data
          submittedUrl = sub.githubUrl; grade = sub.grade; feedback = sub.feedback
        } catch {}
        homework = { id: hw.id, title: hw.title, description: hw.description, deadline: hw.deadline, maxGrade: hw.maxGrade, homeworkFileId: hw.taskFileUrl ? hw.id : undefined, submittedUrl, grade, feedback }
      } catch {}

      setSelectedLesson({ id: lesson.id, courseId: lesson.courseId, courseName: lesson.courseName, title: lesson.title, description: lesson.description, date, time, durationMinutes: lesson.durationMinutes, location: lesson.location, onlineMeetingUrl: lesson.onlineMeetingUrl, status: lesson.status, materials, recordingUrl: lesson.recordingUrl, homework })
    } finally { setLoadingModal(false) }
  }

  // Build calendar grid (Mon-first)
  const getDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: (Date | null)[] = Array(startOffset).fill(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const getLessonsFor = (date: Date) => {
    const s = toDateStr(date)
    return lessons.filter(l => toDateStr(new Date(l.scheduledAt)) === s)
  }

  const courseColorMap = useMemo(() => {
    const seen = new Map<string, number>()
    lessons.forEach(l => { if (!seen.has(l.courseId)) seen.set(l.courseId, seen.size % COURSE_DOT_COLORS.length) })
    return seen
  }, [lessons])

  const todayStr = toDateStr(new Date())
  const selectedStr = toDateStr(selectedDate)
  const days = getDays(currentDate)
  const selectedLessons = getLessonsFor(selectedDate)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  const changeMonth = (delta: number) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + delta)
    setCurrentDate(d)
  }

  const monthLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'
  const weekDays = i18n.language === 'ru' ? WEEK_DAYS_RU : WEEK_DAYS_RU

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{t('student.calendar.title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">{t('student.calendar.subtitle')}</p>
      </div>

      <div className="card p-4 sm:p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
            {currentDate.toLocaleDateString(monthLocale, { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}
              className="px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
            >
              {t('student.calendar.today') || 'Сегодня'}
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {weekDays.map(d => (
                <div key={d} className={`text-center text-xs font-semibold py-1.5
                  ${d === 'Вс' ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Compact day grid */}
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />
                const str = toDateStr(day)
                const isToday = str === todayStr
                const isSelected = str === selectedStr
                const dayLessons = getLessonsFor(day)
                const isSun = day.getDay() === 0

                return (
                  <button
                    key={str}
                    onClick={() => setSelectedDate(day)}
                    className="flex flex-col items-center py-1 rounded-xl transition-all active:scale-95"
                  >
                    <span className={`
                      w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full
                      text-sm sm:text-base font-medium transition-colors
                      ${isSelected && isToday  ? 'bg-primary-600 text-white'
                      : isSelected             ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                      : isToday                ? 'border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold'
                      : isSun                  ? 'text-red-400 dark:text-red-500'
                      :                          'text-gray-700 dark:text-gray-300'}
                    `}>
                      {day.getDate()}
                    </span>
                    <div className="flex gap-0.5 h-1.5 mt-0.5">
                      {dayLessons.slice(0, 3).map((l, di) => (
                        <span key={di} className={`w-1 h-1 rounded-full
                          ${isSelected ? 'bg-white/70' : (COURSE_DOT_COLORS[courseColorMap.get(l.courseId) ?? 0])}`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50" />

            {/* Lessons for selected date */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {selectedDate.toLocaleDateString(monthLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                {selectedLessons.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    {selectedLessons.length} {selectedLessons.length === 1 ? 'занятие' : selectedLessons.length < 5 ? 'занятия' : 'занятий'}
                  </span>
                )}
              </h3>

              {selectedLessons.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  {t('student.calendar.noLessons') || 'Нет занятий в этот день'}
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedLessons.map(lesson => {
                    const colorCls = COURSE_CARD_COLORS[courseColorMap.get(lesson.courseId) ?? 0]
                    const time = new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })
                    return (
                      <button
                        key={lesson.id}
                        disabled={loadingModal}
                        onClick={() => handleLessonClick(lesson)}
                        className={`w-full text-left p-3 sm:p-4 rounded-xl border
                                    hover:brightness-95 active:scale-[0.98] disabled:opacity-60
                                    transition-all duration-150 ${colorCls}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-sm sm:text-base leading-snug">{lesson.title}</p>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs opacity-75">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 shrink-0" />
                                {time}{lesson.durationMinutes ? ` · ${lesson.durationMinutes} мин` : ''}
                              </span>
                              {lesson.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 shrink-0" /> {lesson.location}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <BookOpen className="w-3 h-3 shrink-0" /> {lesson.courseName}
                              </span>
                            </div>
                          </div>
                          {loadingModal && <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0 mt-0.5 opacity-60" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {selectedLesson && !loadingModal && (
        <StudentLessonDetailModal lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
      )}
    </div>
  )
}
