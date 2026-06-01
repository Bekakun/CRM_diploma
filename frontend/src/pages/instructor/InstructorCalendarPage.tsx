import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Clock, MapPin, BookOpen } from 'lucide-react'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'
import api from '../../services/api'

interface Lesson {
  id: string; courseId: string; courseName: string; title: string
  scheduledAt: string; durationMinutes?: number; location?: string
  onlineMeetingUrl?: string; recordingUrl?: string; status: string
  hasHomework: boolean; attendanceCount?: number; totalStudents?: number
}
interface CourseResponse { id: string; name: string }
interface PageResponse<T> { content: T[]; totalElements: number }

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  COMPLETED:   'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  CANCELLED:   'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
}
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Запланировано', IN_PROGRESS: 'Идёт', COMPLETED: 'Завершено', CANCELLED: 'Отменено',
}

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

export default function InstructorCalendarPage() {
  const [currentDate, setCurrentDate]   = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [lessons, setLessons]           = useState<Lesson[]>([])
  const [isLoading, setIsLoading]       = useState(true)

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

  // Mon-first grid
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

  const changeMonth = (delta: number) => {
    const d = new Date(currentDate); d.setMonth(d.getMonth() + delta); setCurrentDate(d)
  }

  const todayStr   = toDateStr(new Date())
  const selectedStr = toDateStr(selectedDate)
  const days = getDays(currentDate)
  const selectedLessons = getLessonsFor(selectedDate)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())

  return (
    <div className="space-y-4 pb-10">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">Календарь занятий</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Все занятия по всем курсам</p>
      </div>

      <div className="card p-4 sm:p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-gray-100 capitalize">
            {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}
              className="px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
            >
              Сегодня
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* ── DESKTOP: large cells (md+) ── */}
            <div className="hidden md:block overflow-x-auto">
              <div className="grid grid-cols-7 gap-1 min-w-[560px]">
                {WEEK_DAYS.map(d => (
                  <div key={d} className={`text-center text-xs font-semibold py-2
                    ${d === 'Вс' ? 'text-red-400 dark:text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {d}
                  </div>
                ))}
                {days.map((day, i) => {
                  if (!day) return (
                    <div key={`e-${i}`} className="border border-gray-100 dark:border-gray-800 rounded-lg bg-gray-50 dark:bg-gray-800/50" />
                  )
                  const dayLessons = getLessonsFor(day)
                  const isToday = toDateStr(day) === todayStr
                  return (
                    <div
                      key={toDateStr(day)}
                      className={`border-2 rounded-lg p-2 min-h-[110px] transition-colors ${
                        isToday
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <div className={`text-sm font-semibold mb-1.5 ${
                        isToday ? 'text-primary-600 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayLessons.map(lesson => (
                          <div
                            key={lesson.id}
                            onClick={() => setSelectedLesson(lesson)}
                            className="text-xs p-1.5 rounded-lg cursor-pointer bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                          >
                            <div className="font-medium truncate">
                              {new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="truncate">{lesson.title}</div>
                            <div className="text-[10px] opacity-75 truncate">{lesson.courseName}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── MOBILE: compact iPhone-style (< md) ── */}
            <div className="md:hidden">
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEK_DAYS.map(d => (
                  <div key={d} className={`text-center text-xs font-semibold py-1.5
                    ${d === 'Вс' ? 'text-red-400 dark:text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {d}
                  </div>
                ))}
              </div>
              {/* Compact grid */}
              <div className="grid grid-cols-7 gap-y-1">
                {days.map((day, i) => {
                  if (!day) return <div key={`e-${i}`} />
                  const str = toDateStr(day)
                  const isToday    = str === todayStr
                  const isSelected = str === selectedStr
                  const dayLessons = getLessonsFor(day)
                  const isSun      = day.getDay() === 0
                  return (
                    <button key={str} onClick={() => setSelectedDate(day)}
                      className="flex flex-col items-center py-1 rounded-xl transition-all active:scale-95">
                      <span className={`
                        w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium transition-colors
                        ${isSelected && isToday  ? 'bg-primary-600 text-white'
                        : isSelected             ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : isToday                ? 'border-2 border-primary-500 text-primary-600 dark:text-primary-400 font-bold'
                        : isSun                  ? 'text-red-400 dark:text-red-500'
                        :                          'text-gray-700 dark:text-gray-300'}
                      `}>
                        {day.getDate()}
                      </span>
                      <div className="flex gap-0.5 h-1.5 mt-0.5">
                        {dayLessons.slice(0, 3).map((_, di) => (
                          <span key={di} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/70' : 'bg-primary-500 dark:bg-primary-400'}`} />
                        ))}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Selected day lessons */}
              <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50 pt-4">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {selectedLessons.length > 0 && (
                    <span className="ml-2 text-xs text-gray-400 font-normal">
                      {selectedLessons.length} {selectedLessons.length === 1 ? 'занятие' : selectedLessons.length < 5 ? 'занятия' : 'занятий'}
                    </span>
                  )}
                </h3>
                {selectedLessons.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-5">Нет занятий</p>
                ) : (
                  <div className="space-y-2">
                    {selectedLessons.map(lesson => {
                      const time = new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })
                      const colorCls = STATUS_COLORS[lesson.status] ?? STATUS_COLORS.SCHEDULED
                      return (
                        <button key={lesson.id} onClick={() => setSelectedLesson(lesson)}
                          className={`w-full text-left p-3 rounded-xl border hover:brightness-95 active:scale-[0.98] transition-all ${colorCls}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm">{lesson.title}</p>
                              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs opacity-75">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{time}</span>
                                {lesson.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{lesson.location}</span>}
                                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{lesson.courseName}</span>
                              </div>
                            </div>
                            <span className="text-[10px] opacity-70 shrink-0">{STATUS_LABELS[lesson.status] ?? lesson.status}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
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
