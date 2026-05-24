import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react'
import CreateLessonModal from '../../components/instructor/CreateLessonModal'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'
import api from '../../services/api'

interface Lesson {
  id: string
  courseId: string
  courseName: string
  title: string
  scheduledAt: string
  durationMinutes: number
  location?: string
  onlineMeetingUrl?: string
  recordingUrl?: string
  status: string
  hasHomework: boolean
  attendanceCount?: number
  totalStudents?: number
}

interface Course {
  id: string
  name: string
  description: string
  startDate: string
  endDate: string
  totalLessons: number
  enrolledStudents: number
}

export default function CourseManagementPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
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

        const otherCourses = (allCoursesRes.data.content ?? allCoursesRes.data).filter(
          (c: { id: string }) => c.id !== courseId
        )
        const otherLessonResults = await Promise.all(
          otherCourses.map((c: { id: string }) =>
            api.get(`/instructor/courses/${c.id}/lessons?size=100`)
              .then((r: { data: { content?: Lesson[]; [key: number]: Lesson } }) => r.data.content ?? Object.values(r.data))
              .catch(() => [] as Lesson[])
          )
        )
        setOtherLessons((otherLessonResults as Lesson[][]).flat())
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const formatDate = (date: Date) =>
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')

  const getLessonsForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return lessons.filter((lesson) => lesson.scheduledAt.slice(0, 10) === dateStr)
  }

  const getOtherLessonsForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return otherLessons.filter((lesson) => lesson.scheduledAt.slice(0, 10) === dateStr)
  }

  const getLessonTime = (scheduledAt: string) => scheduledAt.slice(11, 16)

  const handleDayClick = (date: Date) => {
    setSelectedDate(formatDate(date))
    setShowCreateModal(true)
  }

  const handleLessonClick = (e: React.MouseEvent, lesson: Lesson) => {
    e.stopPropagation()
    setSelectedLesson(lesson)
  }

  const handleLessonSaved = async () => {
    if (!courseId) return
    const res = await api.get(`/instructor/courses/${courseId}/lessons?size=100`)
    setLessons(res.data.content ?? res.data)
    setSelectedLesson(null)
  }

  const nextMonth = () => {
    const date = new Date(currentDate)
    date.setMonth(date.getMonth() + 1)
    setCurrentDate(date)
  }

  const prevMonth = () => {
    const date = new Date(currentDate)
    date.setMonth(date.getMonth() - 1)
    setCurrentDate(date)
  }

  const days = getDaysInMonth(currentDate)
  const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/instructor/courses')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{course?.name}</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{course?.description}</p>
          </div>
        </div>
      </div>

      <div className="card flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <ChevronRight className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-1">
        <div className="grid grid-cols-7 gap-1 min-w-[480px] px-1">
          {weekDays.map((day) => (
            <div key={day} className="text-center font-semibold text-gray-700 dark:text-gray-300 py-2">
              {day}
            </div>
          ))}

          {days.map((day, index) => {
            if (!day) {
              return <div key={`empty-${index}`} className="border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50" />
            }

            const dayLessons = getLessonsForDate(day)
            const dayOtherLessons = getOtherLessonsForDate(day)
            const isToday = day.toDateString() === new Date().toDateString()

            return (
              <div
                key={day.toISOString()}
                className={`border-2 rounded-lg p-2 min-h-[120px] cursor-pointer transition-all hover:border-primary-400 dark:hover:border-primary-500 ${
                  isToday
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                }`}
                onClick={() => handleDayClick(day)}
              >
                <div className={`text-sm font-semibold mb-2 ${
                  isToday ? 'text-primary-700 dark:text-primary-400' : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {day.getDate()}
                </div>

                <div className="space-y-1">
                  {dayLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="text-xs p-1 rounded truncate cursor-pointer bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60"
                      title={`${getLessonTime(lesson.scheduledAt)} — ${lesson.title}`}
                      onClick={(e) => handleLessonClick(e, lesson)}
                    >
                      {getLessonTime(lesson.scheduledAt)} — {lesson.title}
                    </div>
                  ))}
                  {dayOtherLessons.map((lesson) => (
                    <div
                      key={lesson.id}
                      className="text-xs p-1 rounded truncate cursor-default bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                      title={`${getLessonTime(lesson.scheduledAt)} — ${lesson.title} (${lesson.courseName})`}
                    >
                      {getLessonTime(lesson.scheduledAt)} — {lesson.courseName}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Занятия этого курса</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded" />
            <span className="text-gray-600 dark:text-gray-400">Занятия других курсов (конфликт)</span>
          </div>
        </div>
      </div>

      {showCreateModal && selectedDate && course && (
        <CreateLessonModal
          courseId={courseId!}
          courseName={course.name}
          selectedDate={selectedDate}
          onClose={() => {
            setShowCreateModal(false)
            setSelectedDate(null)
          }}
          onSave={(lesson: Lesson) => {
            setLessons((prev) => [...prev, lesson])
            setShowCreateModal(false)
            setSelectedDate(null)
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
