import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

interface CourseResponse {
  id: string
  name: string
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
}

export default function InstructorCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAllLessons()
  }, [])

  const loadAllLessons = async () => {
    setIsLoading(true)
    try {
      const coursesRes = await api.get<PageResponse<CourseResponse>>('/instructor/courses', {
        params: { size: 100 }
      })
      const courses = coursesRes.data.content

      const lessonResults = await Promise.all(
        courses.map(course =>
          api.get<PageResponse<Lesson>>(`/instructor/courses/${course.id}/lessons`, {
            params: { size: 200 }
          }).then(r => r.data.content).catch(() => [] as Lesson[])
        )
      )

      setLessons(lessonResults.flat())
    } catch (err) {
      console.error('Failed to load lessons:', err)
    } finally {
      setIsLoading(false)
    }
  }

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
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

  const getLessonsForDate = (date: Date) => {
    const dateStr = formatDate(date)
    return lessons.filter(lesson => formatDate(new Date(lesson.scheduledAt)) === dateStr)
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Календарь занятий</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Все занятия по всем курсам</p>
      </div>

      <div className="card flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
          </div>
        ) : (
          <div className="overflow-x-auto -mx-1">
            <div className="grid grid-cols-7 gap-1 min-w-[480px] px-1">
            {weekDays.map((day) => (
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
                  key={formatDate(day)}
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
                    {dayLessons.map((lesson) => (
                      <div
                        key={lesson.id}
                        className="text-xs p-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        onClick={() => setSelectedLesson(lesson)}
                      >
                        <div className="font-medium truncate">{new Date(lesson.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
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
        )}
      </div>

      {selectedLesson && (
        <LessonDetailModal
          lesson={selectedLesson}
          onClose={() => setSelectedLesson(null)}
          onSave={() => {
            setSelectedLesson(null)
            loadAllLessons()
          }}
        />
      )}
    </div>
  )
}
