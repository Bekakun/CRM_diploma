import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, BookOpen, Zap, Plus, Trash2, MessageSquare, X } from 'lucide-react'
import MarkdownMessage from '../../components/common/MarkdownMessage'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { useTypingPhrase } from '../../hooks/useTypingPhrase'

interface Message {
  id: string
  text: string
  sender: 'user' | 'ai'
  timestamp: Date
}

interface Session {
  id: string
  title: string
  enrollmentId: string | null
  courseId: string | null
  updatedAt: string
}

interface Enrollment {
  id: string
  courseId: string
  courseName: string
}

export default function AIAssistantPage() {
  const { t, i18n } = useTranslation()
  const dateLocale = i18n.language === 'kk' ? 'kk-KZ' : i18n.language === 'en' ? 'en-US' : 'ru-RU'

  const [enrollments, setEnrollments]               = useState<Enrollment[]>([])
  const [selectedEnrollmentId, setSelectedEnrollment] = useState<string>('')
  const [sessions, setSessions]                     = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId]       = useState<string | null>(null)
  const [messages, setMessages]                     = useState<Message[]>([])
  const [inputText, setInputText]                   = useState('')
  const [isLoading, setIsLoading]                   = useState(false)
  const [sidebarOpen, setSidebarOpen]               = useState(() => window.innerWidth >= 768)
  const [hoveredMsgId, setHoveredMsgId]             = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId]   = useState<string | null>(null)

  const { phrase: loadingPhrase, visible: phraseVisible } = useTypingPhrase(isLoading)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef       = useRef<HTMLInputElement>(null)

  const greeting: Message = {
    id: 'greeting',
    text: t('student.aiAssistant.greeting'),
    sender: 'ai',
    timestamp: new Date(),
  }

  // Load enrollments + sessions
  useEffect(() => {
    api.get<Enrollment[]>('/student/me/enrollments')
      .then(res => {
        setEnrollments(res.data)
        if (res.data.length > 0) setSelectedEnrollment(res.data[0].id)
      })
      .catch(() => {})

    loadSessions()
  }, [])

  const loadSessions = () => {
    api.get<Session[]>('/student/ai/sessions')
      .then(res => setSessions(res.data))
      .catch(() => {})
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const openSession = async (sessionId: string) => {
    try {
      const res = await api.get<{ messages: { id: string; role: string; content: string; createdAt: string }[] }>(
        `/student/ai/sessions/${sessionId}`
      )
      setActiveSessionId(sessionId)
      if (res.data.messages.length === 0) {
        setMessages([greeting])
      } else {
        setMessages(res.data.messages.map(m => ({
          id: m.id,
          text: m.content,
          sender: m.role === 'user' ? 'user' : 'ai',
          timestamp: new Date(m.createdAt),
        })))
      }
    } catch {
      setMessages([greeting])
    }
  }

  const newChat = async () => {
    if (!selectedEnrollmentId) return
    try {
      const res = await api.post<Session>(`/student/ai/sessions?enrollmentId=${selectedEnrollmentId}`)
      const session = res.data
      setSessions(prev => [session, ...prev])
      setActiveSessionId(session.id)
      setMessages([greeting])
    } catch {
      setActiveSessionId(null)
      setMessages([greeting])
    }
  }

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingSessionId(sessionId)
    try {
      await api.delete(`/student/ai/sessions/${sessionId}`)
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setMessages([greeting])
      }
    } catch {} finally {
      setDeletingSessionId(null)
    }
  }

  const deleteMessage = async (msgId: string) => {
    if (msgId === 'greeting') return
    try {
      await api.delete(`/student/ai/messages/${msgId}`)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch {}
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || !selectedEnrollmentId || isLoading) return

    const userMsg: Message = { id: `tmp-${Date.now()}`, text, sender: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    try {
      const url = activeSessionId
        ? `/student/ai/chat?enrollmentId=${selectedEnrollmentId}&sessionId=${activeSessionId}`
        : `/student/ai/chat?enrollmentId=${selectedEnrollmentId}`

      const res = await api.post<{ reply: string; sessionId: string; messageId: string }>(url, { message: text })

      // Update session id if new
      if (!activeSessionId) {
        setActiveSessionId(res.data.sessionId)
        loadSessions()
      } else {
        // Refresh session list title
        loadSessions()
      }

      // Replace temp user msg with real id
      setMessages(prev => prev.map(m =>
        m.id === userMsg.id ? { ...m, id: `user-${Date.now()}` } : m
      ))

      setMessages(prev => [...prev, {
        id: res.data.messageId,
        text: res.data.reply,
        sender: 'ai',
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        text: t('student.aiAssistant.error'),
        sender: 'ai',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
      inputRef.current?.focus()
    }
  }

  const quickQuestions = [
    t('student.aiAssistant.q1'),
    t('student.aiAssistant.q2'),
    t('student.aiAssistant.q3'),
    t('student.aiAssistant.q4'),
  ]

  const selectedCourse = enrollments.find(e => e.id === selectedEnrollmentId)
  const showQuickQuestions = messages.length <= 1 && !isLoading

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4">

      {/* ── Sidebar overlay backdrop (mobile only) ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar: history ── */}
      <aside className={`
        flex flex-col shrink-0 transition-all duration-300
        md:relative md:z-auto
        fixed inset-y-0 left-0 z-40 md:inset-auto
        ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:w-0 md:overflow-hidden md:translate-x-0'}
      `}>
        <div className="card flex flex-col h-full p-3 gap-2 w-64 md:min-w-[256px] overflow-y-auto mt-0 md:mt-0 pt-safe">
          {/* New chat button */}
          <button
            onClick={newChat}
            disabled={!selectedEnrollmentId}
            className="flex items-center gap-2 w-full px-3 py-2.5
                       bg-primary-50 dark:bg-primary-900/20
                       hover:bg-primary-100 dark:hover:bg-primary-900/40
                       border border-primary-200 dark:border-primary-800/50
                       text-primary-700 dark:text-primary-400 font-medium text-sm
                       rounded-xl transition-all duration-200 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            {t('student.aiAssistant.newChat')}
          </button>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-6 px-2">
                {t('student.aiAssistant.noHistory')}
              </p>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => openSession(s.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  activeSessionId === s.id
                    ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="text-xs flex-1 truncate">{s.title}</span>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  disabled={deletingSessionId === s.id}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all shrink-0"
                >
                  {deletingSessionId === s.id
                    ? <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3 h-3" />
                  }
                </button>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between animate-[fadeSlideDown_0.4s_ease_both]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(v => !v)}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {sidebarOpen ? <X className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />}
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {t('student.aiAssistant.title')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {t('student.aiAssistant.subtitle')}
              </p>
            </div>
          </div>

          {/* Course selector */}
          {enrollments.length > 1 && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={selectedEnrollmentId}
                onChange={e => {
                  setSelectedEnrollment(e.target.value)
                  setActiveSessionId(null)
                  setMessages([greeting])
                }}
                className="input-field text-sm py-2 max-w-[220px]"
              >
                {enrollments.map(e => (
                  <option key={e.id} value={e.id}>{e.courseName}</option>
                ))}
              </select>
            </div>
          )}

          {enrollments.length === 1 && selectedCourse && (
            <div className="flex items-center gap-2 px-3 py-1.5
                            bg-primary-50 dark:bg-primary-900/20
                            border border-primary-100 dark:border-primary-800/50
                            rounded-xl text-sm">
              <BookOpen className="w-3.5 h-3.5 text-primary-500" />
              <span className="font-medium text-primary-700 dark:text-primary-400">{selectedCourse.courseName}</span>
            </div>
          )}
        </div>

        {/* Chat container */}
        <div className="card flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-primary-400/40 to-transparent shrink-0" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((message, idx) => (
              <div
                key={message.id}
                className={`flex gap-3 group animate-[fadeSlideUp_0.3s_ease_both] ${
                  message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                }`}
                style={{ animationDelay: `${idx * 20}ms` }}
                onMouseEnter={() => setHoveredMsgId(message.id)}
                onMouseLeave={() => setHoveredMsgId(null)}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  message.sender === 'ai'
                    ? 'bg-gradient-to-br from-primary-500 to-cyan-500'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600'
                }`}>
                  {message.sender === 'ai'
                    ? <Bot className="w-4 h-4 text-white" />
                    : <User className="w-4 h-4 text-white" />
                  }
                </div>

                <div className="flex flex-col gap-1 max-w-[90%] sm:max-w-[75%]">
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.sender === 'ai'
                      ? 'bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                      : 'bg-gradient-to-br from-primary-500 to-primary-600 text-white rounded-tr-sm shadow-[0_4px_14px_rgba(14,165,233,0.35)]'
                  }`}>
                    {message.sender === 'ai' ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none
                        prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0
                        prose-headings:my-2">
                        <MarkdownMessage>{message.text}</MarkdownMessage>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    )}
                    <p className={`text-[11px] mt-1.5 ${
                      message.sender === 'ai' ? 'text-gray-400 dark:text-gray-500' : 'text-primary-100/80'
                    }`}>
                      {message.timestamp.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })}
                    </p>
                  </div>

                  {/* Delete message button */}
                  {hoveredMsgId === message.id && message.id !== 'greeting' && (
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className={`self-${message.sender === 'user' ? 'end' : 'start'} flex items-center gap-1
                                  text-xs text-gray-400 hover:text-red-500 transition-colors px-1`}
                    >
                      <Trash2 className="w-3 h-3" />
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-3 animate-[fadeSlideUp_0.2s_ease_both]">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60
                                rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 bg-primary-400 rounded-full animate-bounce"
                      style={{ animationDelay: `${delay}ms` }} />
                  ))}
                  <span
                    className="text-sm text-gray-500 dark:text-gray-400 transition-opacity duration-300"
                    style={{ opacity: phraseVisible ? 1 : 0 }}
                  >
                    {loadingPhrase}
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick questions */}
          {showQuickQuestions && (
            <div className="px-3 sm:px-5 pb-3 sm:pb-4 border-t border-gray-100/80 dark:border-gray-800/60 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                {t('student.aiAssistant.quickQuestions')}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInputText(q); inputRef.current?.focus() }}
                    className="text-left p-2 sm:p-3
                               bg-primary-50/60 dark:bg-primary-900/15
                               hover:bg-primary-100 dark:hover:bg-primary-900/30
                               border border-primary-100 dark:border-primary-800/40
                               hover:border-primary-200 dark:hover:border-primary-700/60
                               text-primary-700 dark:text-primary-400
                               rounded-xl text-xs sm:text-sm transition-all duration-200
                               hover:-translate-y-0.5 hover:shadow-sm leading-snug"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-5 pb-5 pt-3 border-t border-gray-100/80 dark:border-gray-800/60 flex gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={selectedEnrollmentId
                  ? t('student.aiAssistant.placeholder')
                  : t('student.aiAssistant.selectCourseFirst')
                }
                disabled={!selectedEnrollmentId || isLoading}
                className="input-field w-full pr-4 disabled:opacity-50"
              />
              {inputText && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">↵</div>
              )}
            </div>
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || !selectedEnrollmentId || isLoading}
              className="flex items-center gap-2 px-5 py-2.5
                         bg-gradient-to-r from-primary-500 to-primary-600
                         hover:from-primary-600 hover:to-primary-700
                         text-white font-semibold text-sm rounded-xl
                         shadow-[0_4px_14px_rgba(14,165,233,0.4)]
                         hover:shadow-[0_6px_20px_rgba(14,165,233,0.5)]
                         disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
                         transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />
              }
              <span className="hidden sm:inline">{t('student.aiAssistant.send')}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
