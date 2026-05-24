import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import api from '../../services/api'
import LessonDetailModal from '../../components/instructor/LessonDetailModal'

interface SubmissionInfo {
  id: string
  githubUrl: string
  submittedAt: string
  isLate: boolean
  grade?: number
  feedback?: string
  gradedAt?: string
}

interface HomeworkInfo {
  id: string
  title: string
  deadline: string
  submission?: SubmissionInfo
}

interface LessonPerformance {
  lessonId: string
  lessonTitle: string
  lessonDate: string
  attendance: { status: string }
  homework?: HomeworkInfo
}

interface LessonDetail {
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

interface StudentDetail {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
  courseId: string
  courseName: string
  averageGrade?: number
  attendanceRate?: number
  homeworkCompletionRate?: number
  performance: LessonPerformance[]
}

export default function StudentDetailPage({ byUserId }: { byUserId?: boolean }) {
  const { studentId, userId } = useParams()
  const navigate = useNavigate()
  const [student, setStudent] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [grading, setGrading] = useState<Record<string, boolean>>({})
  const [selectedLesson, setSelectedLesson] = useState<LessonDetail | null>(null)
  const [loadingLessonId, setLoadingLessonId] = useState<string | null>(null)

  // Sorting, filtering, pagination
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 5

  const id = byUserId ? userId : studentId
  const apiPath = byUserId
    ? `/instructor/students/by-user/${userId}`
    : `/instructor/students/${studentId}`

  useEffect(() => {
    fetchStudent()
  }, [id])

  const fetchStudent = async () => {
    setLoading(true)
    try {
      const res = await api.get<StudentDetail>(apiPath)
      setStudent(res.data)
    } catch {
      setError('Не удалось загрузить данные студента')
    } finally {
      setLoading(false)
    }
  }

  const handleGrade = async (submissionId: string, hwId: string) => {
    const grade = parseInt(grades[submissionId] ?? '')
    if (isNaN(grade) || grade < 0 || grade > 100) return
    setGrading(prev => ({ ...prev, [submissionId]: true }))
    try {
      await api.patch(`/instructor/submissions/${submissionId}/grade`, { grade })
      // Update local state
      setStudent(prev => {
        if (!prev) return prev
        return {
          ...prev,
          performance: prev.performance.map(p => {
            if (p.homework?.id === hwId && p.homework.submission?.id === submissionId) {
              return {
                ...p,
                homework: {
                  ...p.homework,
                  submission: { ...p.homework.submission!, grade },
                },
              }
            }
            return p
          }),
        }
      })
    } catch {
      alert('Ошибка при выставлении оценки')
    } finally {
      setGrading(prev => ({ ...prev, [submissionId]: false }))
    }
  }

  const openLesson = async (lessonId: string) => {
    setLoadingLessonId(lessonId)
    try {
      const res = await api.get<LessonDetail>(`/instructor/lessons/${lessonId}`)
      setSelectedLesson(res.data)
    } catch { /* ignore */ }
    finally { setLoadingLessonId(null) }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-600 border-t-transparent" />
      </div>
    )
  }

  if (error || !student) {
    return <div className="text-center py-20 text-red-500">{error || 'Студент не найден'}</div>
  }

  const fmtPct = (val?: number | null) => val != null ? `${Math.round(val)}%` : '—'
  const fmtGrade = (val?: number | null) => val != null ? `${Math.round(val)}/100` : '—'

  const filteredPerformance = student.performance
    .filter(p => {
      if (!p.lessonDate) return true
      const d = new Date(p.lessonDate)
      if (dateFrom && d < new Date(dateFrom)) return false
      if (dateTo && d > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
    .sort((a, b) => {
      const da = a.lessonDate ? new Date(a.lessonDate).getTime() : 0
      const db = b.lessonDate ? new Date(b.lessonDate).getTime() : 0
      return sortOrder === 'asc' ? da - db : db - da
    })

  const totalPages = Math.ceil(filteredPerformance.length / PAGE_SIZE)
  const pagedPerformance = filteredPerformance.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <>
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/instructor/students')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            {student.firstName} {student.lastName}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {student.email} • {student.courseName}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-blue-100 text-sm">Средний балл</p>
          <p className="text-4xl font-bold mt-2">{fmtGrade(student.averageGrade)}</p>
        </div>
        <div className="card bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-green-100 text-sm">Посещаемость</p>
          <p className="text-4xl font-bold mt-2">{fmtPct(student.attendanceRate)}</p>
        </div>
        <div className="card bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-purple-100 text-sm">Выполнено ДЗ</p>
          <p className="text-4xl font-bold mt-2">{fmtPct(student.homeworkCompletionRate)}</p>
        </div>
      </div>

      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Занятия и домашние задания
            <span className="ml-2 text-sm font-normal text-gray-400">({filteredPerformance.length})</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date from */}
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setPage(0) }}
              className="input-field text-sm py-1.5 w-36"
              placeholder="С даты"
            />
            <span className="text-gray-400 text-sm">—</span>
            {/* Date to */}
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setPage(0) }}
              className="input-field text-sm py-1.5 w-36"
            />
            {/* Reset */}
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); setPage(0) }}
                className="text-xs text-gray-400 hover:text-red-500 transition-colors px-1"
              >
                ✕
              </button>
            )}
            {/* Sort */}
            <button
              onClick={() => { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); setPage(0) }}
              className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
            >
              {sortOrder === 'asc' ? '↑' : '↓'} Дата
            </button>
          </div>
        </div>

        {filteredPerformance.length === 0 ? (
          <p className="text-center py-8 text-gray-500 dark:text-gray-400">Занятия не найдены</p>
        ) : (
          <>
          <div className="space-y-4">
            {pagedPerformance.map((p) => {
              const attended = p.attendance?.status === 'PRESENT' || p.attendance?.status === 'LATE'
              const notMarked = p.attendance?.status === 'NOT_MARKED'
              const sub = p.homework?.submission

              return (
                <div
                  key={p.lessonId}
                  onClick={() => openLesson(p.lessonId)}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 cursor-pointer
                             hover:border-primary-400 dark:hover:border-primary-500
                             hover:bg-gray-50 dark:hover:bg-gray-800/60
                             hover:shadow-md transition-all duration-150 group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">{p.lessonTitle}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {p.lessonDate ? new Date(p.lessonDate).toLocaleDateString('ru-RU') : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {loadingLessonId === p.lessonId && (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
                      )}
                      {notMarked ? (
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full text-sm">
                          Не отмечен
                        </span>
                      ) : attended ? (
                        <span className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm">
                          <CheckCircle className="w-4 h-4" />
                          Присутствовал
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm">
                          <XCircle className="w-4 h-4" />
                          Отсутствовал
                        </span>
                      )}
                    </div>
                  </div>

                  {p.homework && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100">{p.homework.title}</h4>
                        {sub?.isLate && (
                          <span className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded text-xs font-medium">
                            <Clock className="w-3 h-3" />
                            Просрочено
                          </span>
                        )}
                      </div>

                      {sub ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-gray-600 dark:text-gray-400 shrink-0" />
                            <a
                              href={sub.githubUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary-600 hover:text-primary-700 text-sm underline truncate"
                            >
                              {sub.githubUrl}
                            </a>
                          </div>

                          <div className="flex items-center justify-between text-sm">
                            <div className="text-gray-600 dark:text-gray-400">
                              Сдано: {new Date(sub.submittedAt).toLocaleDateString('ru-RU')}
                              <span className="mx-2">•</span>
                              Дедлайн: {new Date(p.homework.deadline).toLocaleDateString('ru-RU')}
                            </div>

                            {sub.grade != null ? (
                              <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded font-semibold">
                                Оценка: {sub.grade}%
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  placeholder="0-100"
                                  value={grades[sub.id] ?? ''}
                                  onChange={e => setGrades(prev => ({ ...prev, [sub.id]: e.target.value }))}
                                  className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <button
                                  onClick={() => handleGrade(sub.id, p.homework!.id)}
                                  disabled={grading[sub.id]}
                                  className="px-3 py-1 bg-primary-600 text-white rounded text-sm hover:bg-primary-700 disabled:opacity-50"
                                >
                                  {grading[sub.id] ? '...' : 'Оценить'}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {p.homework.deadline && new Date(p.homework.deadline) < new Date() ? (
                            <span className="text-red-600 dark:text-red-400 font-medium">
                              Не сдано (дедлайн: {new Date(p.homework.deadline).toLocaleDateString('ru-RU')})
                            </span>
                          ) : (
                            <span>
                              Ожидается до {p.homework.deadline ? new Date(p.homework.deadline).toLocaleDateString('ru-RU') : '—'}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-5 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredPerformance.length)} из {filteredPerformance.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => p - 1)}
                  disabled={page === 0}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >‹</button>
                {Array.from({ length: totalPages }, (_, i) => i)
                  .filter(i => Math.abs(i - page) <= 2)
                  .map(i => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={`w-8 h-8 text-sm rounded-lg transition-colors ${
                        i === page
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >{i + 1}</button>
                  ))}
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >›</button>
              </div>
            </div>
          )}
          </>
        )}
      </div>
    </div>

    {selectedLesson && (
      <LessonDetailModal
        lesson={selectedLesson}
        onClose={() => setSelectedLesson(null)}
        onSave={() => { setSelectedLesson(null); fetchStudent() }}
      />
    )}
    </>
  )
}
