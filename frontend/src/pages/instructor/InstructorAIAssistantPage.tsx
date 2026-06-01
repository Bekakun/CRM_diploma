import { useState, useEffect, useRef } from 'react'
import { Send, Bot, User, BookOpen, Plus, Trash2, MessageSquare, X } from 'lucide-react'
import MarkdownMessage from '../../components/common/MarkdownMessage'
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
  courseId: string | null
  updatedAt: string
}

interface Course {
  id: string
  name: string
}

const GREETING = 'Привет! Я ваш AI-помощник. Выберите курс выше, и я смогу помогать вам анализировать успеваемость студентов, выявлять отстающих и давать рекомендации.'

export default function InstructorAIAssistantPage() {
  const [courses, setCourses]               = useState<Course[]>([])
  const [selectedCourseId, setSelectedCourse] = useState<string>('')
  const [sessions, setSessions]             = useState<Session[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages]             = useState<Message[]>([])
  const [inputText, setInputText]           = useState('')
  const [isLoading, setIsLoading]           = useState(false)
  const [sidebarOpen, setSidebarOpen]       = useState(() => window.innerWidth >= 768)
  const [hoveredMsgId, setHoveredMsgId]     = useState<string | null>(null)
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)

  const { phrase: loadingPhrase, visible: phraseVisible } = useTypingPhrase(isLoading)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const greeting: Message = { id: 'greeting', text: GREETING, sender: 'ai', timestamp: new Date() }

  useEffect(() => {
    api.get<{ content: Course[] }>('/instructor/courses')
      .then(res => {
        const list = res.data.content ?? (res.data as unknown as Course[])
        setCourses(list)
        if (list.length > 0) setSelectedCourse(list[0].id)
      })
      .catch(() => {})
    loadSessions()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!messages.length) setMessages([greeting])
  }, [])

  const loadSessions = () => {
    api.get<Session[]>('/instructor/ai/sessions')
      .then(res => setSessions(res.data))
      .catch(() => {})
  }

  const closeSidebarMobile = () => { if (window.innerWidth < 768) setSidebarOpen(false) }

  const openSession = async (sessionId: string) => {
    closeSidebarMobile()
    try {
      const res = await api.get<{ messages: { id: string; role: string; content: string; createdAt: string }[] }>(
        `/instructor/ai/sessions/${sessionId}`
      )
      setActiveSessionId(sessionId)
      setMessages(res.data.messages.length === 0
        ? [greeting]
        : res.data.messages.map(m => ({
            id: m.id,
            text: m.content,
            sender: m.role === 'user' ? 'user' : 'ai',
            timestamp: new Date(m.createdAt),
          }))
      )
    } catch {
      setMessages([greeting])
    }
  }

  const newChat = async () => {
    if (!selectedCourseId) return
    closeSidebarMobile()
    try {
      const res = await api.post<Session>(`/instructor/ai/sessions?courseId=${selectedCourseId}`)
      setSessions(prev => [res.data, ...prev])
      setActiveSessionId(res.data.id)
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
      await api.delete(`/instructor/ai/sessions/${sessionId}`)
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
      await api.delete(`/instructor/ai/messages/${msgId}`)
      setMessages(prev => prev.filter(m => m.id !== msgId))
    } catch {}
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || !selectedCourseId || isLoading) return

    const userMsg: Message = { id: `tmp-${Date.now()}`, text, sender: 'user', timestamp: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInputText('')
    setIsLoading(true)

    try {
      const url = activeSessionId
        ? `/instructor/ai/chat?courseId=${selectedCourseId}&sessionId=${activeSessionId}`
        : `/instructor/ai/chat?courseId=${selectedCourseId}`

      const res = await api.post<{ reply: string; sessionId: string; messageId: string }>(url, { message: text })

      if (!activeSessionId) {
        setActiveSessionId(res.data.sessionId)
      }
      loadSessions()

      setMessages(prev => [...prev, {
        id: res.data.messageId,
        text: res.data.reply,
        sender: 'ai',
        timestamp: new Date(),
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        text: 'Произошла ошибка при обращении к AI. Попробуйте ещё раз.',
        sender: 'ai',
        timestamp: new Date(),
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const quickQuestions = [
    'Кто из студентов отстаёт по успеваемости?',
    'Какова средняя посещаемость по курсу?',
    'Кому из студентов нужна дополнительная помощь?',
    'Дай общий анализ успеваемости группы',
  ]

  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-4 relative overflow-hidden">

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — overlay on mobile, inline on desktop */}
      <aside className={`
        absolute md:relative top-0 left-0 h-full z-50 md:z-auto
        flex flex-col shrink-0 transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'w-72 translate-x-0' : 'w-72 -translate-x-full md:w-0 md:overflow-hidden md:translate-x-0'}
      `}>
        <div className="card flex flex-col h-full p-3 gap-2 min-w-[256px] rounded-none md:rounded-2xl shadow-2xl md:shadow-none">
          <button
            onClick={newChat}
            disabled={!selectedCourseId}
            className="flex items-center gap-2 w-full px-3 py-2.5
                       bg-violet-50 dark:bg-violet-900/20
                       hover:bg-violet-100 dark:hover:bg-violet-900/40
                       border border-violet-200 dark:border-violet-800/50
                       text-violet-700 dark:text-violet-400 font-medium text-sm
                       rounded-xl transition-all duration-200 disabled:opacity-40"
          >
            <Plus className="w-4 h-4" />
            Новый чат
          </button>

          <div className="flex-1 overflow-y-auto space-y-1">
            {sessions.length === 0 && (
              <p className="text-xs text-gray-400 dark:text-gray-600 text-center py-6 px-2">
                История пуста
              </p>
            )}
            {sessions.map(s => (
              <div
                key={s.id}
                onClick={() => openSession(s.id)}
                className={`group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                  activeSessionId === s.id
                    ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800/60 text-gray-700 dark:text-gray-300'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                <span className="text-xs flex-1 truncate">{s.title}</span>
                <button
                  onClick={(e) => deleteSession(s.id, e)}
                  disabled={deletingSessionId === s.id}
                  className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-0.5 rounded hover:text-red-500 transition-all shrink-0"
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

      {/* Main */}
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
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">AI Ассистент</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Анализ успеваемости студентов с помощью AI</p>
            </div>
          </div>

          {courses.length > 1 && (
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-gray-400 shrink-0" />
              <select
                value={selectedCourseId}
                onChange={e => {
                  setSelectedCourse(e.target.value)
                  setActiveSessionId(null)
                  setMessages([greeting])
                }}
                className="input-field text-sm py-2 max-w-[220px]"
              >
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {courses.length === 1 && selectedCourse && (
            <div className="flex items-center gap-2 px-3 py-1.5
                            bg-violet-50 dark:bg-violet-900/20
                            border border-violet-100 dark:border-violet-800/50
                            rounded-xl text-sm">
              <BookOpen className="w-3.5 h-3.5 text-violet-500" />
              <span className="font-medium text-violet-700 dark:text-violet-400">{selectedCourse.name}</span>
            </div>
          )}
        </div>

        {/* Chat */}
        <div className="card flex-1 flex flex-col min-h-0 p-0 overflow-hidden">
          <div className="h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent shrink-0" />

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
                    ? 'bg-violet-100 dark:bg-violet-900/40'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}>
                  {message.sender === 'ai'
                    ? <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                    : <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  }
                </div>

                <div className="flex flex-col gap-1 max-w-[90%] sm:max-w-[75%]">
                  <div className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.sender === 'ai'
                      ? 'bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                      : 'bg-violet-600 text-white rounded-tr-sm'
                  }`}>
                    {message.sender === 'ai' ? (
                      <div className="text-sm prose prose-sm dark:prose-invert max-w-none
                        prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2">
                        <MarkdownMessage>{message.text}</MarkdownMessage>
                      </div>
                    ) : (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
                    )}
                    <p className={`text-[11px] mt-1.5 ${
                      message.sender === 'ai' ? 'text-gray-400 dark:text-gray-500' : 'text-violet-200'
                    }`}>
                      {message.timestamp.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })}
                    </p>
                  </div>

                  {hoveredMsgId === message.id && message.id !== 'greeting' && (
                    <button
                      onClick={() => deleteMessage(message.id)}
                      className={`self-${message.sender === 'user' ? 'end' : 'start'} flex items-center gap-1
                                  text-xs text-gray-400 hover:text-red-500 transition-colors px-1`}
                    >
                      <Trash2 className="w-3 h-3" />
                      Удалить
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 animate-[fadeSlideUp_0.2s_ease_both]">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/60
                                rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2.5">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-bounce"
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

          {messages.length <= 1 && !isLoading && (
            <div className="px-3 sm:px-5 pb-3 sm:pb-4 border-t border-gray-100/80 dark:border-gray-800/60 pt-3 sm:pt-4">
              <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">Быстрые вопросы</p>
              <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                {quickQuestions.map((q, i) => (
                  <button key={i} onClick={() => setInputText(q)}
                    className="text-left p-2 sm:p-3 bg-violet-50/60 dark:bg-violet-900/15
                               hover:bg-violet-100 dark:hover:bg-violet-900/30
                               border border-violet-100 dark:border-violet-800/40
                               text-violet-700 dark:text-violet-400
                               rounded-xl text-xs sm:text-sm transition-all duration-200 hover:-translate-y-0.5 leading-snug">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="px-5 pb-5 pt-3 border-t border-gray-100/80 dark:border-gray-800/60 flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder={selectedCourseId ? 'Задайте вопрос о студентах...' : 'Выберите курс для начала...'}
              disabled={!selectedCourseId || isLoading}
              className="input-field flex-1 disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || !selectedCourseId || isLoading}
              className="flex items-center gap-2 px-5 py-2.5
                         bg-violet-600 hover:bg-violet-700 text-white
                         font-semibold text-sm rounded-xl
                         disabled:opacity-40 disabled:cursor-not-allowed
                         transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />
              }
              <span className="hidden sm:inline">Отправить</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
