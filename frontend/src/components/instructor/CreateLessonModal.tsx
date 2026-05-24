import { useState, useRef } from 'react'
import { X, Paperclip, BookOpen, Trash2 } from 'lucide-react'
import api from '../../services/api'

interface CreateLessonModalProps {
  courseId: string
  courseName: string
  selectedDate: string
  onClose: () => void
  onSave: (lesson: any) => void
}

export default function CreateLessonModal({
  courseId,
  courseName,
  selectedDate,
  onClose,
  onSave,
}: CreateLessonModalProps) {
  // Lesson fields
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('14:00')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [onlineMeetingUrl, setOnlineMeetingUrl] = useState('')
  const [durationMinutes, setDurationMinutes] = useState(120)

  // Materials
  const [materialFiles, setMaterialFiles] = useState<File[]>([])
  const materialInputRef = useRef<HTMLInputElement>(null)

  // Homework
  const [hwEnabled, setHwEnabled] = useState(false)
  const [hwTitle, setHwTitle] = useState('')
  const [hwDescription, setHwDescription] = useState('')
  const [hwDeadline, setHwDeadline] = useState('')
  const [hwFile, setHwFile] = useState<File | null>(null)
  const hwInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scheduledDateTime = new Date(`${selectedDate}T${time}:00`)
  const isPast = scheduledDateTime < new Date()

  const handleMaterialFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    setMaterialFiles(prev => [...prev, ...files])
    e.target.value = ''
  }

  const removeMaterialFile = (index: number) => {
    setMaterialFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleHwFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHwFile(e.target.files?.[0] ?? null)
    e.target.value = ''
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Б`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`
    return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // Step 1: Create the lesson
      const res = await api.post(`/instructor/courses/${courseId}/lessons`, {
        title,
        description: description || undefined,
        scheduledAt: `${selectedDate}T${time}:00`,
        durationMinutes,
        location: location || undefined,
        onlineMeetingUrl: onlineMeetingUrl || undefined,
      })
      const lesson = res.data
      const lessonId = lesson.id

      // Step 2: Upload materials if any
      if (materialFiles.length > 0) {
        const formData = new FormData()
        materialFiles.forEach(f => formData.append('files', f))
        await api.post(`/instructor/lessons/${lessonId}/materials`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      }

      // Step 3: Create homework if enabled
      if (hwEnabled && hwTitle && hwDescription && hwDeadline) {
        const hwFormData = new FormData()
        const hwData = {
          title: hwTitle,
          description: hwDescription,
          deadline: `${hwDeadline}:00`,
        }
        hwFormData.append('homework', new Blob([JSON.stringify(hwData)], { type: 'application/json' }))
        if (hwFile) {
          hwFormData.append('taskFile', hwFile)
        }
        try {
          await api.post(`/instructor/lessons/${lessonId}/homework`, hwFormData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } catch (hwErr: any) {
          const hwMsg =
            hwErr?.response?.data?.message ??
            hwErr?.response?.data?.error ??
            'Занятие создано, но ошибка при создании домашнего задания'
          setError(hwMsg)
          onSave(lesson)
          return
        }
      }

      onSave(lesson)
      onClose()
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ??
        err?.response?.data?.error ??
        'Ошибка при создании занятия'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700/60 shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700/60 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Создать занятие</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {courseName} •{' '}
              {new Date(selectedDate).toLocaleDateString('ru-RU', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Основные поля */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Название занятия *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              placeholder="Введение в асинхронность"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Время начала *
            </label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={`input-field ${isPast ? 'border-red-400 dark:border-red-500 focus:ring-red-400' : ''}`}
              required
            />
            {isPast && (
              <p className="mt-1.5 flex items-center gap-1.5 text-sm text-red-600 dark:text-red-400">
                <span className="inline-flex w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-bold items-center justify-center">!</span>
                Нельзя создать занятие с датой и временем в прошлом
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Длительность (минут)
            </label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="input-field"
              min={1}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Описание
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field resize-none"
              rows={3}
              placeholder="Краткое описание занятия"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Место проведения
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="input-field"
              placeholder="Аудитория 101"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ссылка на онлайн-встречу
            </label>
            <input
              type="url"
              value={onlineMeetingUrl}
              onChange={(e) => setOnlineMeetingUrl(e.target.value)}
              className="input-field"
              placeholder="https://zoom.us/j/..."
            />
          </div>

          {/* Раздаточные материалы */}
          <div className="border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 space-y-3 bg-gray-50/50 dark:bg-gray-800/30">
            <div className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Раздаточные материалы</span>
              <span className="text-sm text-gray-400 dark:text-gray-500">(PDF, DOC, DOCX — до 50 МБ)</span>
            </div>

            {materialFiles.length > 0 && (
              <div className="space-y-2">
                {materialFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg text-sm">
                    <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{f.name}</span>
                    <span className="text-gray-400 dark:text-gray-500 mx-3 shrink-0">{formatFileSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={() => removeMaterialFile(i)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input ref={materialInputRef} type="file" accept=".pdf,.doc,.docx" multiple className="hidden" onChange={handleMaterialFilesChange} />
            <button
              type="button"
              onClick={() => materialInputRef.current?.click()}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Paperclip className="w-4 h-4" />
              Прикрепить файлы
            </button>
          </div>

          {/* Домашнее задание */}
          <div className="border border-gray-200 dark:border-gray-700/60 rounded-xl p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hwEnabled}
                onChange={(e) => setHwEnabled(e.target.checked)}
                className="w-4 h-4 text-primary-600 rounded"
              />
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Добавить домашнее задание</span>
              </div>
            </label>

            {hwEnabled && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Название задания *</label>
                  <input type="text" value={hwTitle} onChange={(e) => setHwTitle(e.target.value)} className="input-field" placeholder="Практическая работа №1" required={hwEnabled} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Описание задания *</label>
                  <textarea value={hwDescription} onChange={(e) => setHwDescription(e.target.value)} className="input-field resize-none" rows={3} placeholder="Что нужно сделать..." required={hwEnabled} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Срок сдачи *</label>
                  <input type="datetime-local" value={hwDeadline} onChange={(e) => setHwDeadline(e.target.value)} className="input-field" required={hwEnabled} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Файл задания (PDF, DOC, DOCX — до 50 МБ)</label>
                  {hwFile ? (
                    <div className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700/50 rounded-lg text-sm">
                      <span className="text-gray-800 dark:text-gray-200 truncate flex-1">{hwFile.name}</span>
                      <span className="text-gray-400 dark:text-gray-500 mx-3">{formatFileSize(hwFile.size)}</span>
                      <button type="button" onClick={() => setHwFile(null)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <input ref={hwInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleHwFileChange} />
                      <button type="button" onClick={() => hwInputRef.current?.click()} className="btn-secondary text-sm flex items-center gap-2">
                        <Paperclip className="w-4 h-4" />
                        Прикрепить файл
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || isPast} className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Создание...' : 'Создать занятие'}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
