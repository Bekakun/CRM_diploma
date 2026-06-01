import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, BookOpen } from 'lucide-react'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'
import api from '../../services/api'

interface Lesson {
  id: string
  courseId: string
  courseName: string
  title: string
  scheduledAt: string
  durationMinutes?: number
  location?: string
  onlineMeetingUrl?: string
  recordingUrl?: string
  status: string
  hasHomework: boolean
  attendanceCount?: number
  totalStudents?: number
}

interface CourseResponse { id: string; name: string }
interface PageResponse<T> { content: T[]; totalElements: number }

// Week starts Monday: Mon=0 … Sun=6
const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800',
  IN_PROGRESS: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  COMPLETED:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  CANCELLED:   'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-700',
}
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Запланировано', IN_PROGRESS: 'Идёт', COMPLETED: 'Завершено', CANCELLED: 'Отменено',
}

export default function InstructorCalendarPage() {
  const [currentDate, setCurrentDate]     = useState(new Date())
  const [selectedDate, setSelectedDate]   = useState<Date>(new Date())
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [lessons, setLessons]             = useState<Lesson[]>([])
  const [isLoading, setIsLoading]         = useState(true)

  useEffect(() => { loadAllLessons() }, [])

  const loadAllLessons = async () => {
    setIsLoading(true)
    try {
      const coursesRes = await api.get<PageResponse<CourseResponse>>('/instructor/courses', { params: { size: 100 } })
      const results = await Promise.all(
        coursesRes.data.content.map(c =>
          api.get<PageResponse<Lesson>>(`/instructor/courses/${c.id}/lessons`, { params: { size: 200 } })
            .then(r => r.data.content).catch(() => [] as Lesson[])
        )
      )
      setLessons(results.flat())
    } catch {}
    finally { setIsLoading(false) }
  }

  // Build calendar days array (Mon-first)
  const getDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Mon=0…Sun=6
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: (Date | null)[] = Array(startOffset).fill(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const getLessonsFor = (date: Date) => {
    const s = toDateStr(date)
    return lessons.filter(l => toDateStr(new Date(l.scheduledAt)) === s)
  }

  const todayStr = toDateStr(new Date())
  const selectedStr = toDateStr(selectedDate)
  const days = getDays(currentDate)
  const selectedLessons = getLessonsFor(selectedDate)

  const changeMonth = (delta: number) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + delta)
    setCurrentDate(d)
  }

  return (
    <div className="space-y-4 pb-10">
      {/* Page header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Календарь занятий</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Все занятия по всем курсам</p>
      </div>

      <div className="card p-4 sm:p-6">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
            {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { changeMonth(-1) }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}
              className="px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400
                         hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
            >
              Сегодня
            </button>
            <button
              onClick={() => { changeMonth(1) }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map(d => (
                <div key={d} className={`text-center text-xs font-semibold py-1.5
                  ${d === 'Вс' ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells — compact iPhone style */}
            <div className="grid grid-cols-7 gap-y-1">
              {days.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />

                const str = toDateStr(day)
                const isToday = str === todayStr
                const isSelected = str === selectedStr
                const dayLessons = getLessonsFor(day)
                const hasDot = dayLessons.length > 0
                const isSun = (day.getDay() === 0)

                return (
                  <button
                    key={str}
                    onClick={() => setSelectedDate(day)}
                    className="flex flex-col items-center py-1 rounded-xl transition-all active:scale-95"
                  >
                    <span className={`
                      w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full
                      text-sm sm:text-base font-medium transition-colors
                      ${isSelected && isToday
                        ? 'bg-primary-600 text-white'
                        : isSelected
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : isToday
                        ? 'border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold'
                        : isSun
                        ? 'text-red-400 dark:text-red-500'
                        : 'text-gray-700 dark:text-gray-300'}
                    `}>
                      {day.getDate()}
                    </span>
                    {/* Event dots */}
                    <div className="flex gap-0.5 h-1.5 mt-0.5">
                      {hasDot && dayLessons.slice(0, 3).map((_, di) => (
                        <span key={di} className={`w-1 h-1 rounded-full
                          ${isSelected ? 'bg-white/70' : 'bg-primary-500 dark:bg-primary-400'}`}
                        />
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50" />

            {/* Selected day lesson list */}
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                {selectedLessons.length > 0 && (
                  <span className="ml-2 text-xs text-gray-400 dark:text-gray-500 font-normal">
                    {selectedLessons.length} {selectedLessons.length === 1 ? 'занятие' : selectedLessons.length < 5 ? 'занятия' : 'занятий'}
                  </span>
                )}
              </h3>

              {selectedLessons.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-6">
                  Нет занятий в этот день
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedLessons
                    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
                    .map(lesson => {
                      const time = new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty'
                      })
                      const colorCls = STATUS_COLORS[lesson.status] ?? STATUS_COLORS.SCHEDULED
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => setSelectedLesson(lesson)}
                          className={`w-full text-left p-3 sm:p-4 rounded-xl border
                                      hover:brightness-95 active:scale-[0.98]
                                      transition-all duration-150 ${colorCls}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm sm:text-base leading-snug">{lesson.title}</p>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs opacity-80">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 shrink-0" />
                                  {time}{lesson.durationMinutes ? ` · ${lesson.durationMinutes} мин` : ''}
                                </span>
                                {lesson.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    {lesson.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3 shrink-0" />
                                  {lesson.courseName}
                                </span>
                              </div>
                            </div>
                            <span className="shrink-0 text-[10px] font-medium opacity-70 mt-0.5">
                              {STATUS_LABELS[lesson.status] ?? lesson.status}
                            </span>
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

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onSave={() => { setSelectedLesson(null); loadAllLessons() }}
        />
      )}
    </div>
  )
}
