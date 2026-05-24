import { useState, useEffect, useRef } from 'react'
import { X, Video, CheckCircle, ExternalLink, Pencil, Paperclip, Trash2, BookOpen, Github, Star, RotateCcw, Plus } from 'lucide-react'
import api from '../../services/api'

interface LessonDetailModalProps {
  lesson: {
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
  onClose: () => void
  onSave: () => void
}

interface StudentResponse {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
}

interface AttendanceResponse {
  id: string
  lessonId: string
  studentId: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  notes?: string
  markedAt?: string
}

interface MaterialResponse {
  id: string
  lessonId: string
  name: string
  fileUrl: string
  fileType: string
  fileSize: number
  uploadedAt: string
}

interface StudentInfo {
  id: string
  userId: string
  firstName: string
  lastName: string
  email: string
}

interface SubmissionWithStudent {
  id: string
  homeworkId: string
  student: StudentInfo
  githubUrl: string
  submittedAt: string
  isLate: boolean
  grade: number | null
  feedback: string | null
  gradedAt: string | null
  gradedBy: string | null
}

interface HomeworkInfo {
  id: string
  title: string
  description: string
  deadline: string
  taskFileUrl?: string
}

interface SubmissionListResponse {
  homework: HomeworkInfo
  submissions: SubmissionWithStudent[]
}

export default function LessonDetailModal({ lesson, onClose, onSave }: LessonDetailModalProps) {
  const [recordingUrl, setRecordingUrl] = useState(lesson.recordingUrl ?? '')
  const [students, setStudents] = useState<StudentResponse[]>([])
  const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [savingRecording, setSavingRecording] = useState(false)
  const [savingAttendance, setSavingAttendance] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit mode
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState(lesson.title)
  const [editDescription, setEditDescription] = useState('')
  const [editDate, setEditDate] = useState(lesson.scheduledAt.slice(0, 10))
  const [editTime, setEditTime] = useState(lesson.scheduledAt.slice(11, 16))

  const editScheduledDateTime = new Date(`${editDate}T${editTime}:00`)
  const editIsPast = editScheduledDateTime < new Date()
  const [editDuration, setEditDuration] = useState(String(lesson.durationMinutes ?? 120))
  const [editLocation, setEditLocation] = useState(lesson.location ?? '')
  const [editOnlineUrl, setEditOnlineUrl] = useState(lesson.onlineMeetingUrl ?? '')
  const [materials, setMaterials] = useState<MaterialResponse[]>([])
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [deletingMaterialIds, setDeletingMaterialIds] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Homework & grading
  const [homework, setHomework] = useState<HomeworkInfo | null>(null)
  const [submissions, setSubmissions] = useState<SubmissionWithStudent[]>([])
  // grade inputs keyed by submissionId
  const [gradeInputs, setGradeInputs] = useState<Record<string, string>>({})
  const [feedbackInputs, setFeedbackInputs] = useState<Record<string, string>>({})
  const [gradingId, setGradingId] = useState<string | null>(null)
  // which submission rows are in edit-grade mode
  const [editingGradeIds, setEditingGradeIds] = useState<Set<string>>(new Set())

  // Homework edit/create in edit mode
  const [hwEditMode, setHwEditMode] = useState<'none' | 'edit' | 'create'>('none')
  const [hwTitle, setHwTitle] = useState('')
  const [hwDescription, setHwDescription] = useState('')
  const [hwDeadline, setHwDeadline] = useState('')
  const [hwNewFile, setHwNewFile] = useState<File | null>(null)
  const [hwSaving, setHwSaving] = useState(false)
  const [hwDeleting, setHwDeleting] = useState(false)
  const hwFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const fetchData = async () => {
      setLoadingData(true)
      try {
        const requests: Promise<any>[] = [
          api.get<AttendanceResponse[]>(`/instructor/lessons/${lesson.id}/attendance`),
          api.get(`/instructor/students?courseId=${lesson.courseId}&size=100`),
          api.get(`/instructor/lessons/${lesson.id}`),
          api.get<MaterialResponse[]>(`/instructor/lessons/${lesson.id}/materials`),
          api.get<HomeworkInfo>(`/instructor/lessons/${lesson.id}/homework`).catch(() => null),
        ]

        const results = await Promise.all(requests)
        const [attendanceRes, studentsRes, lessonRes, materialsRes, homeworkRes] = results

        setEditDescription(lessonRes.data.description ?? '')
        setMaterials(materialsRes.data)

        const existingAttendance: Record<string, 'PRESENT' | 'ABSENT'> = {}
        for (const record of attendanceRes.data) {
          existingAttendance[record.studentId] = record.status === 'LATE' ? 'PRESENT' : record.status
        }

        const studentList: StudentResponse[] = studentsRes.data.content ?? studentsRes.data
        setStudents(studentList)

        const initialAttendance: Record<string, 'PRESENT' | 'ABSENT'> = {}
        for (const s of studentList) {
          initialAttendance[s.userId] = existingAttendance[s.userId] ?? 'ABSENT'
        }
        setAttendance(initialAttendance)

        if (homeworkRes?.data) {
          const hw: HomeworkInfo = homeworkRes.data
          setHomework(hw)
          // load submissions
          try {
            const subRes = await api.get<SubmissionListResponse>(`/instructor/homework/${hw.id}/submissions`)
            setSubmissions(subRes.data.submissions ?? [])
            const grades: Record<string, string> = {}
            const feedbacks: Record<string, string> = {}
            for (const s of subRes.data.submissions ?? []) {
              grades[s.id] = s.grade != null ? String(s.grade) : ''
              feedbacks[s.id] = s.feedback ?? ''
            }
            setGradeInputs(grades)
            setFeedbackInputs(feedbacks)
          } catch {
            // no submissions yet
          }
        }
      } catch {
        setError('Не удалось загрузить данные')
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [lesson.id, lesson.courseId])

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
  }

  const handleDeleteMaterial = async (materialId: string) => {
    setDeletingMaterialIds((prev) => new Set(prev).add(materialId))
    try {
      await api.delete(`/instructor/materials/${materialId}`)
      setMaterials((prev) => prev.filter((m) => m.id !== materialId))
    } catch {
      setError('Не удалось удалить файл')
    } finally {
      setDeletingMaterialIds((prev) => {
        const next = new Set(prev)
        next.delete(materialId)
        return next
      })
    }
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setError(null)
    try {
      await api.patch(`/instructor/lessons/${lesson.id}`, {
        title: editTitle,
        description: editDescription || undefined,
        scheduledAt: `${editDate}T${editTime}:00`,
        durationMinutes: parseInt(editDuration, 10),
        location: editLocation || undefined,
        onlineMeetingUrl: editOnlineUrl || undefined,
      })

      if (newFiles.length > 0) {
        const formData = new FormData()
        newFiles.forEach((f) => formData.append('files', f))
        const res = await api.post<{ materials: MaterialResponse[] }>(
          `/instructor/lessons/${lesson.id}/materials`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        setMaterials((prev) => [...prev, ...res.data.materials])
        setNewFiles([])
      }

      setEditMode(false)
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Ошибка при сохранении')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveRecording = async () => {
    setSavingRecording(true)
    setError(null)
    try {
      await api.patch(`/instructor/lessons/${lesson.id}`, { recordingUrl })
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Ошибка при сохранении записи')
    } finally {
      setSavingRecording(false)
    }
  }

  const handleSaveAttendance = async () => {
    setSavingAttendance(true)
    setError(null)
    try {
      const payload = {
        attendance: students.map((s) => ({
          studentId: s.userId,
          status: attendance[s.userId] ?? 'ABSENT',
        })),
      }
      await api.post(`/instructor/lessons/${lesson.id}/attendance`, payload)
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Ошибка при сохранении посещаемости')
    } finally {
      setSavingAttendance(false)
    }
  }

  const toggleAttendance = (userId: string) => {
    setAttendance((prev) => ({
      ...prev,
      [userId]: prev[userId] === 'PRESENT' ? 'ABSENT' : 'PRESENT',
    }))
  }

  const handleGrade = async (submissionId: string) => {
    const gradeVal = gradeInputs[submissionId]
    const grade = parseInt(gradeVal, 10)
    if (isNaN(grade) || grade < 0 || grade > 100) {
      setError('Оценка должна быть от 0 до 100')
      return
    }
    setGradingId(submissionId)
    setError(null)
    try {
      const res = await api.patch(`/instructor/submissions/${submissionId}/grade`, {
        grade,
        feedback: feedbackInputs[submissionId] || undefined,
      })
      setSubmissions((prev) =>
        prev.map((s) => (s.id === submissionId ? { ...s, grade: res.data.grade, feedback: res.data.feedback, gradedAt: res.data.gradedAt } : s))
      )
      setEditingGradeIds((prev) => {
        const next = new Set(prev)
        next.delete(submissionId)
        return next
      })
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Ошибка при выставлении оценки')
    } finally {
      setGradingId(null)
    }
  }

  const startEditGrade = (sub: SubmissionWithStudent) => {
    setGradeInputs((prev) => ({ ...prev, [sub.id]: sub.grade != null ? String(sub.grade) : '' }))
    setFeedbackInputs((prev) => ({ ...prev, [sub.id]: sub.feedback ?? '' }))
    setEditingGradeIds((prev) => new Set(prev).add(sub.id))
  }

  const cancelEditGrade = (submissionId: string) => {
    setEditingGradeIds((prev) => {
      const next = new Set(prev)
      next.delete(submissionId)
      return next
    })
  }

  const openHwCreate = () => {
    setHwTitle('')
    setHwDescription('')
    setHwDeadline('')
    setHwNewFile(null)
    setHwEditMode('create')
  }

  const openHwEdit = () => {
    if (!homework) return
    setHwTitle(homework.title)
    setHwDescription(homework.description)
    // convert ISO datetime to datetime-local value (strip seconds)
    setHwDeadline(homework.deadline.slice(0, 16))
    setHwNewFile(null)
    setHwEditMode('edit')
  }

  const cancelHwEdit = () => {
    setHwEditMode('none')
    setHwNewFile(null)
    setError(null)
  }

  const handleSaveHomework = async () => {
    if (!hwTitle.trim() || !hwDescription.trim() || !hwDeadline) {
      setError('Заполните все обязательные поля домашнего задания')
      return
    }
    setHwSaving(true)
    setError(null)
    try {
      const formData = new FormData()
      const hwData = { title: hwTitle, description: hwDescription, deadline: `${hwDeadline}:00` }
      formData.append('homework', new Blob([JSON.stringify(hwData)], { type: 'application/json' }))
      if (hwNewFile) formData.append('taskFile', hwNewFile)

      if (hwEditMode === 'create') {
        const res = await api.post(`/instructor/lessons/${lesson.id}/homework`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setHomework(res.data)
        onSave()
      } else if (hwEditMode === 'edit' && homework) {
        const res = await api.patch(`/instructor/homework/${homework.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setHomework(res.data)
        onSave()
      }
      setHwEditMode('none')
      setHwNewFile(null)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Ошибка при сохранении домашнего задания')
    } finally {
      setHwSaving(false)
    }
  }

  const handleDeleteHomework = async () => {
    if (!homework) return
    setHwDeleting(true)
    setError(null)
    try {
      await api.delete(`/instructor/homework/${homework.id}`)
      setHomework(null)
      setSubmissions([])
      setHwEditMode('none')
      onSave()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Ошибка при удалении домашнего задания')
    } finally {
      setHwDeleting(false)
    }
  }

  // map userId -> submission for quick lookup
  const submissionByUserId: Record<string, SubmissionWithStudent> = {}
  for (const sub of submissions) {
    submissionByUserId[sub.student.userId] = sub
  }

  const scheduledDate = new Date(lesson.scheduledAt)
  const displayDate = scheduledDate.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const displayTime = scheduledDate.toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const presentCount = Object.values(attendance).filter((s) => s === 'PRESENT').length

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {editMode ? 'Редактировать занятие' : lesson.title}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {lesson.courseName} • {displayDate} • {displayTime}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
                Редактировать
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {editMode && (
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Название <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Дата <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Время <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className={`input-field ${editIsPast ? 'border-red-400 dark:border-red-500' : ''}`}
                  />
                </div>
              </div>
              {editIsPast && (
                <p className="flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400 -mt-2">
                  <span className="inline-flex w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/40 items-center justify-center text-xs font-bold shrink-0">!</span>
                  Нельзя сохранить занятие с датой и временем в прошлом
                </p>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Длительность (минут)
                </label>
                <input
                  type="number"
                  min="1"
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Описание
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="input-field resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Место проведения
                </label>
                <input
                  type="text"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="input-field"
                  placeholder="Аудитория 101"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Ссылка на онлайн-встречу
                </label>
                <input
                  type="url"
                  value={editOnlineUrl}
                  onChange={(e) => setEditOnlineUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://zoom.us/j/..."
                />
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">Файлы</span>
                </div>

                {materials.length > 0 && (
                  <div className="space-y-2">
                    {materials.map((m) => (
                      <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                        <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{m.name}</span>
                        <span className="text-gray-500 mx-3 shrink-0">{formatFileSize(m.fileSize)}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteMaterial(m.id)}
                          disabled={deletingMaterialIds.has(m.id)}
                          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {newFiles.length > 0 && (
                  <div className="space-y-2">
                    {newFiles.map((f, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                        <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{f.name}</span>
                        <span className="text-gray-500 mx-3 shrink-0">{formatFileSize(f.size)}</span>
                        <button
                          type="button"
                          onClick={() => setNewFiles((prev) => prev.filter((_, idx) => idx !== i))}
                          className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? [])
                    setNewFiles((prev) => [...prev, ...files])
                    e.target.value = ''
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary text-sm flex items-center gap-2"
                >
                  <Paperclip className="w-4 h-4" />
                  Прикрепить файлы
                </button>
              </div>

              {/* Домашнее задание */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-gray-500" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">Домашнее задание</span>
                  </div>
                  {hwEditMode === 'none' && (
                    homework ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={openHwEdit}
                          className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Изменить
                        </button>
                        <button
                          type="button"
                          onClick={handleDeleteHomework}
                          disabled={hwDeleting}
                          className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 dark:hover:text-red-400 hover:underline disabled:opacity-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          {hwDeleting ? 'Удаление...' : 'Удалить'}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openHwCreate}
                        className="flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Добавить
                      </button>
                    )
                  )}
                </div>

                {hwEditMode === 'none' && homework && (
                  <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <p className="font-medium text-gray-800 dark:text-gray-200">{homework.title}</p>
                    <p>{homework.description}</p>
                    <p className="text-xs">Дедлайн: {new Date(homework.deadline).toLocaleString('ru-RU')}</p>
                    {homework.taskFileUrl && (
                      <p className="text-xs text-primary-600 dark:text-primary-400">Файл задания прикреплён</p>
                    )}
                  </div>
                )}

                {hwEditMode === 'none' && !homework && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Домашнее задание не создано</p>
                )}

                {(hwEditMode === 'edit' || hwEditMode === 'create') && (
                  <div className="space-y-3 pt-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Название <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={hwTitle}
                        onChange={(e) => setHwTitle(e.target.value)}
                        className="input-field"
                        placeholder="Практическая работа №1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Описание <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={hwDescription}
                        onChange={(e) => setHwDescription(e.target.value)}
                        className="input-field resize-none"
                        rows={3}
                        placeholder="Что нужно сделать..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Срок сдачи <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={hwDeadline}
                        onChange={(e) => setHwDeadline(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Файл задания (PDF, DOC, DOCX — до 50 МБ)
                      </label>
                      {hwNewFile ? (
                        <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm">
                          <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{hwNewFile.name}</span>
                          <span className="text-gray-500 mx-3">{formatFileSize(hwNewFile.size)}</span>
                          <button type="button" onClick={() => setHwNewFile(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <input
                            ref={hwFileInputRef}
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => { setHwNewFile(e.target.files?.[0] ?? null); e.target.value = '' }}
                          />
                          <button
                            type="button"
                            onClick={() => hwFileInputRef.current?.click()}
                            className="btn-secondary text-sm flex items-center gap-2"
                          >
                            <Paperclip className="w-4 h-4" />
                            {hwEditMode === 'edit' ? 'Заменить файл' : 'Прикрепить файл'}
                          </button>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleSaveHomework}
                        disabled={hwSaving}
                        className="btn-primary text-sm flex-1 disabled:opacity-50"
                      >
                        {hwSaving ? 'Сохранение...' : hwEditMode === 'create' ? 'Создать ДЗ' : 'Сохранить ДЗ'}
                      </button>
                      <button type="button" onClick={cancelHwEdit} className="btn-secondary text-sm flex-1">
                        Отмена
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={isSaving || editIsPast} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditMode(false); setError(null); setNewFiles([]); setHwEditMode('none') }}
                  className="btn-secondary flex-1"
                >
                  Отмена
                </button>
              </div>
            </form>
          )}

          {!editMode && (
            <>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {lesson.location && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Место: </span>
                    <span className="text-gray-900 dark:text-gray-100">{lesson.location}</span>
                  </div>
                )}
                {lesson.onlineMeetingUrl && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Онлайн: </span>
                    <a
                      href={lesson.onlineMeetingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:text-primary-700 flex items-center gap-1 inline-flex"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ссылка
                    </a>
                  </div>
                )}
                {lesson.durationMinutes && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Длительность: </span>
                    <span className="text-gray-900 dark:text-gray-100">{lesson.durationMinutes} мин</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Статус: </span>
                  <span className="text-gray-900 dark:text-gray-100">{lesson.status}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ссылка на видеозапись
                </label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Video className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="url"
                      value={recordingUrl}
                      onChange={(e) => setRecordingUrl(e.target.value)}
                      className="input-field pl-10"
                      placeholder="https://example.com/recording"
                    />
                  </div>
                  {recordingUrl && (
                    <a
                      href={recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-secondary flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Открыть
                    </a>
                  )}
                </div>
                <button
                  onClick={handleSaveRecording}
                  disabled={savingRecording}
                  className="mt-2 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingRecording ? 'Сохранение...' : 'Сохранить запись'}
                </button>
              </div>

              {/* Посещаемость + ДЗ + оценки */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Посещаемость ({presentCount}/{students.length})
                </h3>

                {loadingData ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600" />
                  </div>
                ) : (
                  <>
                    <div className="space-y-3 mb-4">
                      {students.map((student) => {
                        const sub = submissionByUserId[student.userId]
                        const isEditing = sub ? editingGradeIds.has(sub.id) : false
                        const hasGrade = sub?.grade != null

                        return (
                          <div
                            key={student.userId}
                            className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
                          >
                            {/* Строка студента */}
                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700">
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                {student.firstName} {student.lastName}
                              </span>
                              <div className="flex items-center gap-2">
                                {/* Статус ДЗ */}
                                {homework && (
                                  <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
                                    sub
                                      ? sub.isLate
                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                  }`}>
                                    <BookOpen className="w-3 h-3" />
                                    {sub ? (sub.isLate ? 'Сдано с опозданием' : 'Сдано') : 'Не сдано'}
                                  </span>
                                )}
                                {/* Посещаемость */}
                                <label className="flex items-center gap-2 cursor-pointer select-none">
                                  <span className="text-sm text-gray-500 dark:text-gray-400">Посещаемость</span>
                                  <div
                                    onClick={() => toggleAttendance(student.userId)}
                                    className={`relative w-5 h-5 rounded flex items-center justify-center border-2 transition-colors ${
                                      attendance[student.userId] === 'PRESENT'
                                        ? 'bg-emerald-500 border-emerald-500'
                                        : 'bg-transparent border-gray-400 dark:border-gray-500 hover:border-emerald-400'
                                    }`}
                                  >
                                    {attendance[student.userId] === 'PRESENT' && (
                                      <CheckCircle className="w-3.5 h-3.5 text-white" />
                                    )}
                                  </div>
                                </label>
                              </div>
                            </div>

                            {/* Блок ДЗ — только если есть сабмит */}
                            {sub && (
                              <div className="px-3 pb-3 pt-2 bg-white dark:bg-gray-800 space-y-2">
                                {/* Ссылка на GitHub */}
                                <div className="flex items-center gap-2 text-sm">
                                  <Github className="w-4 h-4 text-gray-500 shrink-0" />
                                  <a
                                    href={sub.githubUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 dark:text-primary-400 hover:underline truncate"
                                  >
                                    {sub.githubUrl}
                                  </a>
                                  <span className="text-gray-400 text-xs shrink-0">
                                    {new Date(sub.submittedAt).toLocaleDateString('ru-RU')}
                                  </span>
                                </div>

                                {/* Оценка — просмотр */}
                                {hasGrade && !isEditing && (
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Star className="w-4 h-4 text-yellow-500" />
                                      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                        {sub.grade}/100
                                      </span>
                                      {sub.feedback && (
                                        <span className="text-sm text-gray-500 dark:text-gray-400">
                                          — {sub.feedback}
                                        </span>
                                      )}
                                    </div>
                                    <button
                                      onClick={() => startEditGrade(sub)}
                                      className="flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      Изменить
                                    </button>
                                  </div>
                                )}

                                {/* Форма выставления/редактирования оценки */}
                                {(!hasGrade || isEditing) && (
                                  <div className="flex items-center gap-2">
                                    <div className="relative w-28 shrink-0">
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        placeholder="0–100"
                                        value={gradeInputs[sub.id] ?? ''}
                                        onChange={(e) =>
                                          setGradeInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                        }
                                        className="input-field pr-8 text-sm"
                                      />
                                      <Star className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-400 pointer-events-none" />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Комментарий (необязательно)"
                                      value={feedbackInputs[sub.id] ?? ''}
                                      onChange={(e) =>
                                        setFeedbackInputs((prev) => ({ ...prev, [sub.id]: e.target.value }))
                                      }
                                      className="input-field text-sm flex-1"
                                    />
                                    <button
                                      onClick={() => handleGrade(sub.id)}
                                      disabled={gradingId === sub.id}
                                      className="btn-primary text-sm px-3 py-2 shrink-0 disabled:opacity-50"
                                    >
                                      {gradingId === sub.id ? '...' : hasGrade ? 'Сохранить' : 'Оценить'}
                                    </button>
                                    {isEditing && (
                                      <button
                                        onClick={() => cancelEditGrade(sub.id)}
                                        className="btn-secondary text-sm px-3 py-2 shrink-0"
                                      >
                                        Отмена
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    <button
                      onClick={handleSaveAttendance}
                      disabled={savingAttendance || students.length === 0}
                      className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingAttendance ? 'Сохранение...' : 'Сохранить посещаемость'}
                    </button>
                  </>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button onClick={onClose} className="btn-secondary flex-1">
                  Закрыть
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
