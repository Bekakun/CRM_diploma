import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, BookOpen, Users, Calendar, FileText, Pencil, Trash2, ChevronRight } from 'lucide-react'
import api from '../../services/api'
import { Skeleton } from '../../components/common/Skeleton'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import FormField from '../../components/common/FormField'
import ConfirmDialog from '../../components/common/ConfirmDialog'
import Toaster from '../../components/common/Toaster'
import { useToast } from '../../hooks/useToast'

interface CourseResponse {
  id: string
  name: string
  description: string
  startDate: string
  endDate?: string
  totalLessons?: number
  enrolledStudents: number
}

interface CourseForm {
  name: string
  description: string
  startDate: string
  endDate: string
  totalLessons: string
}

const emptyForm: CourseForm = { name: '', description: '', startDate: '', endDate: '', totalLessons: '' }

function CourseCardSkeleton() {
  return (
    <div className="card space-y-4">
      <div className="flex items-start justify-between">
        <Skeleton className="w-12 h-12 rounded-xl" />
        <Skeleton className="w-20 h-6 rounded-full" />
      </div>
      <Skeleton className="h-5 w-3/4 rounded" />
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-2/3 rounded" />
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3 w-32 rounded" />
        <Skeleton className="h-3 w-40 rounded" />
      </div>
      <Skeleton className="h-9 w-full rounded-xl mt-2" />
    </div>
  )
}

function CourseFormFields({
  form,
  onChange,
}: {
  form: CourseForm
  onChange: (f: CourseForm) => void
}) {
  return (
    <div className="space-y-4">
      <FormField label="Название курса" required>
        <input
          type="text"
          required
          value={form.name}
          onChange={(e) => onChange({ ...form, name: e.target.value })}
          className="input-field"
          placeholder="Например: JavaScript для начинающих"
        />
      </FormField>

      <FormField label="Описание">
        <textarea
          value={form.description}
          onChange={(e) => onChange({ ...form, description: e.target.value })}
          className="input-field"
          rows={3}
          placeholder="Краткое описание курса"
        />
      </FormField>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Дата начала" required>
          <input
            type="date"
            required
            value={form.startDate}
            onChange={(e) => onChange({ ...form, startDate: e.target.value })}
            className="input-field"
          />
        </FormField>

        <FormField label="Дата окончания">
          <input
            type="date"
            value={form.endDate}
            onChange={(e) => onChange({ ...form, endDate: e.target.value })}
            className="input-field"
          />
        </FormField>
      </div>

      <FormField label="Кол-во занятий">
        <input
          type="number"
          min="1"
          value={form.totalLessons}
          onChange={(e) => onChange({ ...form, totalLessons: e.target.value })}
          className="input-field"
          placeholder="Например: 24"
        />
      </FormField>
    </div>
  )
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const { toasts, show: showToast, dismiss } = useToast()
  const [courses, setCourses] = useState<CourseResponse[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<CourseForm>(emptyForm)
  const [isCreating, setIsCreating] = useState(false)

  const [editingCourse, setEditingCourse] = useState<CourseResponse | null>(null)
  const [editForm, setEditForm] = useState<CourseForm>(emptyForm)
  const [isSaving, setIsSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => { loadCourses() }, [])

  const loadCourses = async () => {
    setIsLoading(true)
    try {
      const res = await api.get<{ content: CourseResponse[] }>('/instructor/courses', { params: { size: 100 } })
      setCourses(res.data.content)
    } catch {
      showToast('Не удалось загрузить курсы', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    try {
      await api.post('/instructor/courses', {
        name: createForm.name,
        description: createForm.description,
        startDate: createForm.startDate,
        endDate: createForm.endDate || undefined,
        totalLessons: createForm.totalLessons ? parseInt(createForm.totalLessons, 10) : undefined,
      })
      showToast('Курс создан', 'success')
      setShowCreate(false)
      setCreateForm(emptyForm)
      await loadCourses()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка при создании', 'error')
    } finally {
      setIsCreating(false)
    }
  }

  const openEdit = (course: CourseResponse) => {
    setEditingCourse(course)
    setEditForm({
      name: course.name,
      description: course.description,
      startDate: course.startDate?.slice(0, 10) ?? '',
      endDate: course.endDate?.slice(0, 10) ?? '',
      totalLessons: course.totalLessons != null ? String(course.totalLessons) : '',
    })
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingCourse) return
    setIsSaving(true)
    try {
      await api.patch(`/instructor/courses/${editingCourse.id}`, {
        name: editForm.name,
        description: editForm.description,
        startDate: editForm.startDate || undefined,
        endDate: editForm.endDate || undefined,
        totalLessons: editForm.totalLessons ? parseInt(editForm.totalLessons, 10) : undefined,
      })
      showToast('Курс обновлён', 'success')
      setEditingCourse(null)
      await loadCourses()
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка при сохранении', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await api.delete(`/instructor/courses/${deleteId}`)
      showToast('Курс удалён', 'success')
      setDeleteId(null)
      await loadCourses()
    } catch {
      showToast('Ошибка при удалении', 'error')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      <div className="space-y-6">
        <div className="flex items-center justify-between animate-fadeSlideDown">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Мои курсы</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Управление курсами и материалами</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Создать курс
          </button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <CourseCardSkeleton key={i} />)}
          </div>
        ) : courses.length === 0 ? (
          <div className="card">
            <EmptyState
              icon={BookOpen}
              title="Курсов пока нет"
              description="Создайте первый курс, чтобы начать работу со студентами"
              action={{ label: 'Создать курс', onClick: () => setShowCreate(true) }}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 animate-[fadeSlideUp_0.4s_0.1s_ease_both] opacity-0 [animation-fill-mode:forwards]">
            {courses.map((course, idx) => (
              <div
                key={course.id}
                className="group relative flex flex-col
                           bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl
                           rounded-2xl border border-white/70 dark:border-gray-700/50
                           shadow-[0_2px_8px_rgba(0,0,0,0.06)]
                           hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1
                           transition-all duration-300 overflow-hidden"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                {/* Gradient cover strip */}
                <div className="h-1.5 bg-gradient-to-r from-primary-500 via-cyan-400 to-blue-500 w-full" />

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-cyan-500
                                    rounded-2xl flex items-center justify-center shadow-md
                                    group-hover:scale-110 transition-transform duration-300">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-900/20
                                       text-emerald-700 dark:text-emerald-400
                                       border border-emerald-100 dark:border-emerald-800/50
                                       rounded-full text-xs font-semibold">
                        Активный
                      </span>
                      <button
                        onClick={() => openEdit(course)}
                        className="p-1.5 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg
                                   text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                        title="Редактировать"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteId(course.id)}
                        className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg
                                   text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1.5
                                  group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {course.name}
                  </h3>
                  {course.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2 leading-relaxed">
                      {course.description}
                    </p>
                  )}

                  <div className="mt-auto space-y-2 mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                        <div className="w-6 h-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg flex items-center justify-center">
                          <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">{course.enrolledStudents}</span>
                        <span>студентов</span>
                      </div>
                      {course.totalLessons != null && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                          <div className="w-6 h-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                            <FileText className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="font-medium text-gray-700 dark:text-gray-300">{course.totalLessons}</span>
                          <span>занятий</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(course.startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => navigate(`/instructor/courses/${course.id}`)}
                    className="w-full flex items-center justify-center gap-2 py-2.5
                               text-sm font-semibold
                               text-primary-600 dark:text-primary-400
                               bg-primary-50/80 dark:bg-primary-900/20
                               hover:bg-primary-100 dark:hover:bg-primary-900/40
                               border border-primary-100 dark:border-primary-800/50
                               hover:border-primary-200 dark:hover:border-primary-700/60
                               rounded-xl transition-all duration-200 group/btn"
                  >
                    Управление курсом
                    <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <Modal title="Новый курс" subtitle="Заполните данные курса" onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <CourseFormFields form={createForm} onChange={setCreateForm} />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isCreating} className="btn-primary flex-1 disabled:opacity-50">
                {isCreating ? 'Создание...' : 'Создать'}
              </button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit modal */}
      {editingCourse && (
        <Modal title="Редактировать курс" onClose={() => setEditingCourse(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <CourseFormFields form={editForm} onChange={setEditForm} />
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={isSaving} className="btn-primary flex-1 disabled:opacity-50">
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" onClick={() => setEditingCourse(null)} className="btn-secondary flex-1">
                Отмена
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <ConfirmDialog
          title="Удалить курс?"
          message="Это действие нельзя отменить. Все связанные данные будут удалены."
          confirmLabel={isDeleting ? 'Удаление...' : 'Удалить'}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </>
  )
}
