import { useState, useEffect } from 'react'
import { X, Plus } from 'lucide-react'
import api from '../../services/api'

interface Course {
  id: string
  name: string
  description?: string
  instructor?: {
    id: string
    firstName: string
    lastName: string
  }
}

interface Student {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface EnrollStudentModalProps {
  student: Student
  onClose: () => void
}

export default function EnrollStudentModal({ student, onClose }: EnrollStudentModalProps) {
  const [selectedCourses, setSelectedCourses] = useState<string[]>([])
  const [enrolledCourseIds, setEnrolledCourseIds] = useState<string[]>([])
  const [availableCourses, setAvailableCourses] = useState<Course[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [coursesRes, enrolledRes] = await Promise.all([
        api.get<Course[]>('/admin/courses'),
        api.get<string[]>(`/admin/users/${student.id}/enrolled-courses`).catch(() => ({ data: [] as string[] }))
      ])
      setAvailableCourses(coursesRes.data || [])
      setEnrolledCourseIds(enrolledRes.data || [])
    } catch (err) {
      console.error('Failed to load courses:', err)
      setError('Не удалось загрузить список курсов')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleCourse = (courseId: string) => {
    if (selectedCourses.includes(courseId)) {
      setSelectedCourses(selectedCourses.filter(id => id !== courseId))
    } else {
      setSelectedCourses([...selectedCourses, courseId])
    }
  }

  const handleSave = async () => {
    if (selectedCourses.length === 0) return

    setIsSaving(true)
    setError('')

    try {
      await api.post(`/admin/users/${student.id}/enroll`, {
        courseIds: selectedCourses
      })
      onClose()
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Ошибка при записи на курсы'
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  const studentName = `${student.firstName} ${student.lastName}`

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl">
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Запись на курсы</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {studentName} ({student.email})
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
            <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Доступные курсы
          </h3>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-600 border-t-transparent"></div>
            </div>
          ) : availableCourses.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">
              Нет доступных курсов
            </p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableCourses.map((course) => {
                const isEnrolled = enrolledCourseIds.includes(course.id)
                const isSelected = selectedCourses.includes(course.id)
                return (
                  <label
                    key={course.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                      isEnrolled
                        ? 'border-green-400 bg-green-50 dark:bg-green-900/20 cursor-not-allowed opacity-75'
                        : isSelected
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 cursor-pointer'
                          : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isEnrolled || isSelected}
                      disabled={isEnrolled}
                      onChange={() => !isEnrolled && toggleCourse(course.id)}
                      className="w-5 h-5 text-primary-600 rounded"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-gray-100">{course.name}</p>
                      {course.instructor && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Преподаватель: {course.instructor.firstName} {course.instructor.lastName}
                        </p>
                      )}
                    </div>
                    {isEnrolled && (
                      <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-medium">
                        Уже записан
                      </span>
                    )}
                    {!isEnrolled && isSelected && (
                      <span className="px-3 py-1 bg-primary-600 text-white rounded-full text-xs font-medium">
                        Выбран
                      </span>
                    )}
                  </label>
                )
              })}
            </div>
          )}

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Выбрано курсов: <span className="font-semibold">{selectedCourses.length}</span>
            </p>
            <div className="flex gap-3">
              <button onClick={onClose} className="btn-secondary">
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={selectedCourses.length === 0 || isSaving}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {isSaving ? 'Запись...' : 'Записать на курсы'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
