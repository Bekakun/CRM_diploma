import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowLeft, Plus, Clock, MapPin } from 'lucide-react'
import CreateLessonModal from '../../components/instructor/CreateLessonModal'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'
import api from '../../services/api'

interface Lesson {
  id: string; courseId: string; courseName: string; title: string
  scheduledAt: string; durationMinutes: number; location?: string
  onlineMeetingUrl?: string; recordingUrl?: string; status: string
  hasHomework: boolean; attendanceCount?: number; totalStudents?: number
}

interface Course {
  id: string; name: string; description: string
  startDate: string; endDate: string; totalLessons: number; enrolledStudents: number
}

const WEEK_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const toDateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED:   'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800 text-primary-800 dark:text-primary-200',
  IN_PROGRESS: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
  COMPLETED:   'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200',
  CANCELLED:   'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
}
const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Запланировано', IN_PROGRESS: 'Идёт', COMPLETED: 'Завершено', CANCELLED: 'Отменено',
}

export default function CourseManagementPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [otherLessons, setOtherLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!courseId) return
    const fetchData = async () => {
      setLoading(true)
      try {
        const [courseRes, lessonsRes, allCoursesRes] = await Promise.all([
          api.get(`/instructor/courses/${courseId}`),
          api.get(`/instructor/courses/${courseId}/lessons?size=100`),
          api.get(`/instructor/courses?size=100`),
        ])
        setCourse(courseRes.data)
        setLessons(lessonsRes.data.content ?? lessonsRes.data)

        const otherCourses = (allCoursesRes.data.content ?? allCoursesRes.data)
          .filter((c: { id: string }) => c.id !== courseId)
        const otherResults = await Promise.all(
          otherCourses.map((c: { id: string }) =>
            api.get(`/instructor/courses/${c.id}/lessons?size=100`)
              .then((r: { data: { content?: Lesson[] } }) => r.data.content ?? [])
              .catch(() => [] as Lesson[])
          )
        )
        setOtherLessons((otherResults as Lesson[][]).flat())
      } finally { setLoading(false) }
    }
    fetchData()
  }, [courseId])

  const getLessonsFor = (date: Date) => {
    const s = toDateStr(date)
    return lessons.filter(l => l.scheduledAt.slice(0, 10) === s)
  }
  const getOtherLessonsFor = (date: Date) => {
    const s = toDateStr(date)
    return otherLessons.filter(l => l.scheduledAt.slice(0, 10) === s)
  }

  const getDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear(), month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7
    const days: (Date | null)[] = Array(startOffset).fill(null)
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i))
    return days
  }

  const handleLessonSaved = async () => {
    if (!courseId) return
    const res = await api.get(`/instructor/courses/${courseId}/lessons?size=100`)
    setLessons(res.data.content ?? res.data)
    setSelectedLesson(null)
  }

  const changeMonth = (delta: number) => {
    const d = new Date(currentDate)
    d.setMonth(d.getMonth() + delta)
    setCurrentDate(d)
  }

  const todayStr = toDateStr(new Date())
  const selectedStr = toDateStr(selectedDate)
  const days = getDays(currentDate)
  const selectedMyLessons = getLessonsFor(selectedDate)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
  const selectedOtherLessons = getOtherLessonsFor(selectedDate)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-4 pb-10">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/instructor/courses')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 truncate">
            {course?.name}
          </h1>
          {course?.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{course.description}</p>
          )}
        </div>
      </div>

      <div className="card p-4 sm:p-6">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 capitalize">
            {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex items-center gap-1">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDate(new Date()) }}
              className="px-3 py-1.5 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-colors"
            >
              Сегодня
            </button>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
              <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1">
          {WEEK_DAYS.map(d => (
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
            const myLessons = getLessonsFor(day)
            const otherConflicts = getOtherLessonsFor(day)
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
                {/* Dots: blue = my lessons, red = conflicts */}
                <div className="flex gap-0.5 h-1.5 mt-0.5">
                  {myLessons.slice(0, 2).map((_, di) => (
                    <span key={`m-${di}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-primary-300' : 'bg-primary-500 dark:bg-primary-400'}`} />
                  ))}
                  {otherConflicts.slice(0, 1).map((_, di) => (
                    <span key={`o-${di}`} className={`w-1 h-1 rounded-full ${isSelected ? 'bg-red-300' : 'bg-red-500 dark:bg-red-400'}`} />
                  ))}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-primary-500" /> Занятия курса
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500" /> Конфликт
          </span>
        </div>

        {/* Divider */}
        <div className="mt-4 border-t border-gray-100 dark:border-gray-700/50" />

        {/* Selected day */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selectedDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
              {selectedMyLessons.length > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {selectedMyLessons.length} {selectedMyLessons.length === 1 ? 'занятие' : selectedMyLessons.length < 5 ? 'занятия' : 'занятий'}
                </span>
              )}
            </h3>
            {/* Create lesson button */}
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 hover:bg-primary-700
                         text-white text-xs font-semibold rounded-xl transition-colors active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" /> Добавить
            </button>
          </div>

          {/* My lessons */}
          {selectedMyLessons.length === 0 && selectedOtherLessons.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-5">
              Нет занятий — нажмите «Добавить» чтобы создать
            </p>
          ) : (
            <div className="space-y-2">
              {selectedMyLessons.map(lesson => {
                const time = new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })
                const colorCls = STATUS_COLORS[lesson.status] ?? STATUS_COLORS.SCHEDULED
                return (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-left p-3 rounded-xl border hover:brightness-95 active:scale-[0.98] transition-all ${colorCls}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm leading-snug">{lesson.title}</p>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs opacity-75">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 shrink-0" />
                            {time}{lesson.durationMinutes ? ` · ${lesson.durationMinutes} мин` : ''}
                          </span>
                          {lesson.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 shrink-0" /> {lesson.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-[10px] font-medium opacity-70 mt-0.5">
                        {STATUS_LABELS[lesson.status] ?? lesson.status}
                      </span>
                    </div>
                  </button>
                )
              })}

              {/* Conflict lessons from other courses */}
              {selectedOtherLessons.map(lesson => {
                const time = new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })
                return (
                  <div
                    key={lesson.id}
                    className="p-3 rounded-xl border bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300"
                    title={`${time} — ${lesson.title} (${lesson.courseName})`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                      <p className="text-xs font-medium truncate flex-1">
                        {time} · {lesson.courseName}
                      </p>
                      <span className="text-[10px] opacity-60 shrink-0">конфликт</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && course && (
        <CreateLessonModal
          courseId={courseId!}
          courseName={course.name}
          selectedDate={toDateStr(selectedDate)}
          onClose={() => setShowCreateModal(false)}
          onSave={(lesson: Lesson) => {
            setLessons(prev => [...prev, lesson])
            setShowCreateModal(false)
          }}
        />
      )}

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onSave={handleLessonSaved}
        />
      )}
    </div>
  )
}
