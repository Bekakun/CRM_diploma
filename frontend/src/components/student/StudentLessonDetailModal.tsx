import { useState } from 'react'
import { X, Download, Video, FileText, ExternalLink, Upload, CheckCircle, Clock, MapPin, Link2, BookOpen, MessageSquare, Calendar } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'

interface Material {
  id: string
  name: string
  url: string
  type: 'pdf' | 'docx'
}

interface Homework {
  id: string
  title: string
  description: string
  deadline: string
  homeworkFileId?: string
  submittedUrl?: string
  isLate?: boolean
  grade?: number
  maxGrade?: number
  feedback?: string
}

interface Lesson {
  id: string
  courseId: string
  courseName: string
  title: string
  description?: string
  date: string
  time: string
  durationMinutes?: number
  location?: string
  onlineMeetingUrl?: string
  status?: string
  materials: Material[]
  recordingUrl?: string
  homework?: Homework
}

interface StudentLessonDetailModalProps {
  lesson: Lesson
  onClose: () => void
}

export default function StudentLessonDetailModal({ lesson, onClose }: StudentLessonDetailModalProps) {
  const { t } = useTranslation()
  const [homeworkUrl, setHomeworkUrl] = useState(lesson.homework?.submittedUrl || '')
  const [submittedUrl, setSubmittedUrl] = useState(lesson.homework?.submittedUrl || '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
    SCHEDULED: { label: t('student.lesson.statusScheduled'), cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
    COMPLETED:  { label: t('student.lesson.statusCompleted'),    cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
    CANCELLED:  { label: t('student.lesson.statusCancelled'),     cls: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  }

  const handleMaterialClick = async (material: Material) => {
    setDownloadingId(material.id)
    try {
      const res = await api.get<{ downloadUrl: string }>(`/instructor/files/materials/${material.id}`)
      window.open(res.data.downloadUrl, '_blank')
    } catch {
      alert(t('student.lesson.fileError'))
    } finally {
      setDownloadingId(null)
    }
  }

  const handleSubmitHomework = async () => {
    if (!homeworkUrl.trim() || !lesson.homework) return
    setIsSubmitting(true)
    try {
      await api.post(`/student/homework/${lesson.homework.id}/submit`, { githubUrl: homeworkUrl })
      setSubmittedUrl(homeworkUrl)
    } catch (err: any) {
      alert(err?.response?.data?.message || t('student.lesson.hwSubmitError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const isDeadlinePassed = lesson.homework
    ? new Date(lesson.homework.deadline) < new Date()
    : false

  const statusInfo = lesson.status ? STATUS_LABELS[lesson.status] : null

  return (
    <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto
                      shadow-[0_24px_64px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-gray-800">

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800
                        px-6 py-4 flex items-start justify-between rounded-t-2xl z-10">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{lesson.title}</h2>
              {statusInfo && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusInfo.cls}`}>
                  {statusInfo.label}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <BookOpen className="w-3.5 h-3.5" />
                {lesson.courseName}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(lesson.date).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {lesson.time}{lesson.durationMinutes ? ` · ${lesson.durationMinutes} ${t('student.lesson.minutes')}` : ''}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 dark:text-gray-500
                       hover:bg-gray-100 dark:hover:bg-gray-800
                       hover:text-gray-600 dark:hover:text-gray-300
                       transition-all duration-200 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Description */}
          {lesson.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
              {lesson.description}
            </p>
          )}

          {/* Location / Online meeting */}
          {(lesson.location || lesson.onlineMeetingUrl) && (
            <div className="flex flex-col gap-2">
              {lesson.location && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700/60">
                  <MapPin className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{lesson.location}</span>
                </div>
              )}
              {lesson.onlineMeetingUrl && (
                <a
                  href={lesson.onlineMeetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 p-3 rounded-xl
                             bg-blue-50 dark:bg-blue-900/20
                             border border-blue-200 dark:border-blue-800/50
                             hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors group"
                >
                  <Link2 className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="flex-1 text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
                    {t('student.lesson.onlineMeetingLink')}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400 dark:text-blue-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                </a>
              )}
            </div>
          )}

          {/* Recording */}
          {lesson.recordingUrl && (
            <a
              href={lesson.recordingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4
                         bg-purple-50 dark:bg-purple-900/20
                         border border-purple-200 dark:border-purple-800/60
                         rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30
                         transition-colors group"
            >
              <div className="w-9 h-9 bg-purple-100 dark:bg-purple-900/40 rounded-xl flex items-center justify-center shrink-0">
                <Video className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="flex-1 font-medium text-purple-700 dark:text-purple-300 text-sm">
                {t('student.lesson.watchRecording')}
              </span>
              <ExternalLink className="w-4 h-4 text-purple-400 dark:text-purple-500 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors" />
            </a>
          )}

          {/* Materials */}
          {lesson.materials.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
                {t('student.lesson.handouts')}
              </h3>
              <div className="space-y-2">
                {lesson.materials.map((material) => (
                  <button
                    key={material.id}
                    onClick={() => handleMaterialClick(material)}
                    disabled={downloadingId === material.id}
                    className="w-full flex items-center gap-3 p-3.5
                               bg-gray-50 dark:bg-gray-800/60
                               border border-gray-200 dark:border-gray-700/60
                               rounded-xl text-left
                               hover:bg-gray-100 dark:hover:bg-gray-800
                               hover:border-gray-300 dark:hover:border-gray-600
                               transition-all duration-150 disabled:opacity-50"
                  >
                    <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
                    <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{material.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase font-medium">{material.type}</span>
                    {downloadingId === material.id ? (
                      <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin shrink-0" />
                    ) : (
                      <Download className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Homework */}
          {lesson.homework && (
            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2.5">
                {t('student.lesson.homeworkTitle')}
              </h3>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700/60
                              bg-gray-50 dark:bg-gray-800/40 overflow-hidden">
                {/* HW header */}
                <div className="flex items-start justify-between gap-3 p-4 pb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">{lesson.homework.title}</h4>
                    {lesson.homework.description && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{lesson.homework.description}</p>
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    {lesson.homework.grade !== undefined ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5
                                       bg-emerald-100 dark:bg-emerald-500/15
                                       text-emerald-700 dark:text-emerald-400
                                       border border-emerald-200 dark:border-emerald-500/30
                                       rounded-full text-xs font-semibold">
                        <CheckCircle className="w-3.5 h-3.5" />
                        {lesson.homework.grade}{lesson.homework.maxGrade ? `/${lesson.homework.maxGrade}` : '%'}
                      </span>
                    ) : isDeadlinePassed ? (
                      <span className="flex items-center gap-1.5 px-3 py-1.5
                                       bg-red-100 dark:bg-red-500/15
                                       text-red-600 dark:text-red-400
                                       border border-red-200 dark:border-red-500/30
                                       rounded-full text-xs font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {t('student.lesson.overdue')}
                      </span>
                    ) : (
                      <span className="px-3 py-1.5
                                       bg-amber-100 dark:bg-amber-500/15
                                       text-amber-700 dark:text-amber-400
                                       border border-amber-200 dark:border-amber-500/30
                                       rounded-full text-xs font-medium">
                        {t('student.lesson.deadlineUntil', {
                          date: new Date(lesson.homework.deadline).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
                        })}
                      </span>
                    )}
                    {lesson.homework.maxGrade && lesson.homework.grade === undefined && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {t('student.lesson.maxPoints', { count: lesson.homework.maxGrade })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="px-4 pb-4 space-y-3">
                  {/* Feedback from instructor */}
                  {lesson.homework.feedback && (
                    <div className="flex gap-2.5 p-3 rounded-xl
                                    bg-violet-50 dark:bg-violet-900/20
                                    border border-violet-200 dark:border-violet-800/50">
                      <MessageSquare className="w-4 h-4 text-violet-500 dark:text-violet-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-medium text-violet-700 dark:text-violet-300 mb-0.5">{t('student.lesson.instructorFeedback')}</p>
                        <p className="text-xs text-violet-600 dark:text-violet-400 leading-relaxed">{lesson.homework.feedback}</p>
                      </div>
                    </div>
                  )}

                  {/* Task file */}
                  {lesson.homework.homeworkFileId && (
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get<{ downloadUrl: string }>(`/instructor/files/homework/${lesson.homework!.homeworkFileId}/task`)
                          window.open(res.data.downloadUrl, '_blank')
                        } catch {
                          alert(t('student.lesson.taskFileError'))
                        }
                      }}
                      className="w-full flex items-center gap-3 p-3
                                 bg-white dark:bg-gray-800
                                 border border-gray-200 dark:border-gray-700
                                 rounded-xl text-left
                                 hover:bg-gray-50 dark:hover:bg-gray-700/60
                                 transition-all duration-150"
                    >
                      <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                      <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100">{t('student.lesson.taskFile')}</span>
                      <Download className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                    </button>
                  )}

                  {/* Submit section */}
                  {lesson.homework.grade === undefined && (
                    <div className="space-y-2.5">
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">
                        {t('student.lesson.githubLabel')}
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 relative">
                          <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
                          <input
                            type="url"
                            value={homeworkUrl}
                            onChange={(e) => setHomeworkUrl(e.target.value)}
                            className="input-field pl-9 text-sm"
                            placeholder="https://github.com/username/repo"
                            disabled={!!submittedUrl}
                          />
                        </div>
                        {!submittedUrl && (
                          <button
                            onClick={handleSubmitHomework}
                            disabled={!homeworkUrl.trim() || isSubmitting}
                            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                          >
                            {isSubmitting ? (
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Upload className="w-4 h-4" />
                            )}
                            {isSubmitting ? t('student.lesson.submitting') : t('student.lesson.submitButton')}
                          </button>
                        )}
                      </div>
                      {submittedUrl && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          {t('student.lesson.submittedWaiting')}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Submitted + graded link */}
                  {lesson.homework.grade !== undefined && submittedUrl && (
                    <div className="flex items-center gap-2 text-xs
                                    text-blue-600 dark:text-blue-400
                                    bg-blue-50 dark:bg-blue-500/10
                                    border border-blue-100 dark:border-blue-500/20
                                    rounded-xl px-3 py-2.5">
                      <CheckCircle className="w-4 h-4 shrink-0" />
                      <span>{t('student.lesson.gradedWork')}</span>
                      <a
                        href={submittedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto hover:underline flex items-center gap-1 font-medium"
                      >
                        {t('student.lesson.viewSolution')}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!lesson.recordingUrl && lesson.materials.length === 0 && !lesson.homework && !lesson.description && !lesson.location && !lesson.onlineMeetingUrl && (
            <div className="text-center py-6">
              <p className="text-sm text-gray-400 dark:text-gray-500">{t('student.lesson.noAdditionalMaterials')}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
            <button onClick={onClose} className="btn-secondary px-6">
              {t('common.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
