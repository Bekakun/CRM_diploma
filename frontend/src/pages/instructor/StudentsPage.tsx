import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Users } from 'lucide-react'
import api from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'
import { StudentCardSkeleton } from '../../components/common/Skeleton'

interface StudentResponse {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  profilePhotoUrl?: string
  courseId: string
  courseName: string
  averageGrade: number | null
  attendanceRate: number | null
  homeworkCompletionRate: number | null
  enrolledAt: string
}

interface CourseOption {
  id: string
  name: string
}

interface PageResponse<T> {
  content: T[]
  totalElements: number
}

const getGradeColor = (grade: number) => {
  if (grade >= 90) return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
  if (grade >= 75) return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30'
  if (grade >= 60) return 'text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/30'
  return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
}

const getBarColor = (val: number) => {
  if (val >= 75) return 'bg-emerald-500'
  if (val >= 50) return 'bg-yellow-500'
  return 'bg-red-500'
}

export default function StudentsPage() {
  const navigate = useNavigate()
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [courses, setCourses] = useState<CourseOption[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCourses()
  }, [])

  useEffect(() => {
    loadStudents()
  }, [selectedCourse])

  const loadCourses = async () => {
    try {
      const response = await api.get<PageResponse<CourseOption>>('/instructor/courses', {
        params: { size: 100 },
      })
      setCourses(response.data.content)
    } catch (err) {
      console.error('Failed to load courses:', err)
    }
  }

  const loadStudents = async () => {
    setIsLoading(true)
    try {
      const params: Record<string, string> = { size: '100' }
      if (selectedCourse !== 'all') params.courseId = selectedCourse
      const response = await api.get<PageResponse<StudentResponse>>('/instructor/students', { params })
      setStudents(response.data.content)
    } catch (err) {
      console.error('Failed to load students:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredStudents = students.filter((s) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    )
  })

  const fmt = (val: number | null) => (val != null ? `${Math.round(val)}%` : '—')

  return (
    <div className="space-y-6">
      <div className="animate-fadeSlideDown">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Студенты</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Отслеживание успеваемости студентов</p>
      </div>

      <div className="card animate-[fadeSlideUp_0.4s_0.1s_ease_both] opacity-0 [animation-fill-mode:forwards]">
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по имени или email..."
              className="input-field pl-9"
            />
          </div>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            className="input-field sm:w-56"
          >
            <option value="all">Все курсы</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>{course.name}</option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <StudentCardSkeleton key={i} />)}
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
              {searchQuery ? 'Студенты не найдены' : 'Нет студентов'}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {searchQuery ? 'Попробуйте изменить запрос' : 'Студенты появятся после зачисления'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredStudents.map((student, i) => (
              <div
                key={student.id}
                className="p-4 border border-gray-100 dark:border-gray-800 rounded-2xl hover:border-primary-200 dark:hover:border-primary-800 hover:shadow-sm transition-all"
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-primary-400 to-primary-600 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm">
                    {student.profilePhotoUrl ? (
                      <img src={getFileUrl(student.profilePhotoUrl)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white font-semibold text-sm">
                        {student.firstName[0]}{student.lastName[0]}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {student.firstName} {student.lastName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{student.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{student.courseName}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {student.averageGrade != null ? (
                      <span className={`px-3 py-1.5 rounded-xl text-xs font-bold ${getGradeColor(student.averageGrade)}`}>
                        {Math.round(student.averageGrade)}%
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-400 bg-gray-50 dark:bg-gray-800">
                        —
                      </span>
                    )}
                    <button
                      onClick={() => navigate(`/instructor/students/${student.id}`)}
                      className="px-3 py-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-xl transition-colors"
                    >
                      Детали
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Домашние задания</p>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmt(student.homeworkCompletionRate)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${getBarColor(student.homeworkCompletionRate ?? 0)}`}
                        style={{ width: `${student.homeworkCompletionRate ?? 0}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Посещаемость</p>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{fmt(student.attendanceRate)}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all ${getBarColor(student.attendanceRate ?? 0)}`}
                        style={{ width: `${student.attendanceRate ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && filteredStudents.length > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 text-center">
            Показано {filteredStudents.length} из {students.length} студентов
          </p>
        )}
      </div>
    </div>
  )
}
