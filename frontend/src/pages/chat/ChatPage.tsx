import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Send, MessageSquare, Search, Plus, X, Paperclip, FileText, Download, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'
import { connectChat, disconnectChat, isSocketConnected } from '../../services/chatSocket'
import { useAuthStore } from '../../context/authStore'
import { tokenStorage } from '../../services/authService'

interface Conversation {
  id: string
  otherUserId: string
  otherUserName: string
  otherUserRole: string
  otherUserAvatar: string | null
  lastMessageAt: string | null
  unreadCount: number
}

interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderAvatar: string | null
  content: string | null
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
  fileSize: number | null
  read: boolean
  createdAt: string
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  role: string
  avatarUrl: string | null
  email: string
}

function NewChatModal({ onSelect, onClose }: { onSelect: (userId: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const { t } = useTranslation()

  useEffect(() => {
    setLoading(true)
    const timer = setTimeout(() => {
      api.get<Contact[]>(`/chat/contacts?q=${encodeURIComponent(query)}`)
        .then((r) => setContacts(r.data))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, query ? 300 : 0)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t('chat.newDialog')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('chat.searchContacts')}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 rounded-xl border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>
        <div className="overflow-y-auto max-h-72">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : contacts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">
              {t('chat.notFound')}
            </p>
          ) : (
            contacts.map((c) => (
              <button
                key={c.id}
                onClick={() => { onSelect(c.id); onClose() }}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left"
              >
                <Avatar name={`${c.firstName} ${c.lastName}`} url={c.avatarUrl} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {c.firstName} {c.lastName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {t(`roles.${c.role}`)} · {c.email}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Avatar({ name, url, size = 'md' }: { name: string; url?: string | null; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm'
  if (url) return <img src={getFileUrl(url)} className={`${cls} rounded-full object-cover shrink-0`} alt={name} />
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className={`${cls} rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center shrink-0`}>
      {initials}
    </div>
  )
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [search, setSearch] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null)
  const [deletingConvId, setDeletingConvId] = useState<string | null>(null)
  const [deletingMsgId, setDeletingMsgId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()
  const accessToken = tokenStorage.getAccessToken()
  const { t, i18n } = useTranslation()

  const loadConversations = useCallback(async () => {
    try {
      const res = await api.get<Conversation[]>('/chat/conversations')
      setConversations(res.data)
    } finally {
      setLoadingConvs(false)
    }
  }, [])

  // Open conversation with a specific user if ?userId= is in the URL
  const openWithUser = useCallback(async (userId: string): Promise<Conversation> => {
    const res = await api.post<Conversation>(`/chat/conversations/with/${userId}`)
    setActiveConv(res.data)
    setConversations((prev) => {
      const exists = prev.find((c) => c.id === res.data.id)
      return exists ? prev : [res.data, ...prev]
    })
    return res.data
  }, [])

  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  useEffect(() => {
    const userId = searchParams.get('userId')
    if (userId) openWithUser(userId)
  }, [searchParams, openWithUser])

  // WebSocket connection
  useEffect(() => {
    if (!accessToken) return
    const handler = (msg: Message) => {
      setMessages((prev) => {
        if (prev.find((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      setConversations((prev) =>
        prev.map((c) =>
          c.id === msg.conversationId
            ? { ...c, lastMessageAt: msg.createdAt, unreadCount: activeConv?.id === c.id ? 0 : c.unreadCount + 1 }
            : c
        )
      )
    }
    connectChat(accessToken, handler)
    return () => disconnectChat(handler)
  }, [accessToken])

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConv) return
    setLoadingMsgs(true)
    setMessages([])
    api.get<Message[]>(`/chat/conversations/${activeConv.id}/messages`)
      .then((res) => setMessages(res.data))
      .finally(() => setLoadingMsgs(false))
    api.post(`/chat/conversations/${activeConv.id}/read`).catch(() => {})
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConv.id ? { ...c, unreadCount: 0 } : c))
    )
  }, [activeConv?.id])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fallback: reload messages when tab regains focus (in case WebSocket missed something)
  useEffect(() => {
    if (!activeConv) return
    const onFocus = () => {
      if (!isSocketConnected()) {
        api.get<Message[]>(`/chat/conversations/${activeConv.id}/messages`)
          .then((res) => setMessages(res.data))
          .catch(() => {})
      }
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [activeConv?.id])

  const handleDeleteConversation = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!window.confirm(t('chat.confirmDeleteConversation'))) return
    setDeletingConvId(convId)
    try {
      await api.delete(`/chat/conversations/${convId}`)
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConv?.id === convId) setActiveConv(null)
    } finally {
      setDeletingConvId(null)
    }
  }

  const handleDeleteMessage = async (msgId: string) => {
    if (!window.confirm(t('chat.confirmDeleteMessage'))) return
    setDeletingMsgId(msgId)
    try {
      await api.delete(`/chat/messages/${msgId}`)
      setMessages((prev) => prev.filter((m) => m.id !== msgId))
    } finally {
      setDeletingMsgId(null)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return
    setSending(true)
    try {
      const res = await api.post<Message>(`/chat/conversations/${activeConv.id}/messages`, { content: input.trim() })
      setMessages((prev) => [...prev, res.data])
      setInput('')
    } finally {
      setSending(false)
    }
  }

  const handleDownload = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = objectUrl
      a.download = fileName || 'file'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      window.open(url, '_blank')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeConv) return
    setUploadingFile(true)
    try {
      const form = new FormData()
      form.append('file', file)
      // Do NOT set Content-Type manually — Axios + browser must set multipart/form-data with boundary
      const res = await api.post<Message>(`/chat/conversations/${activeConv.id}/upload`, form)
      setMessages((prev) => [...prev, res.data])
    } catch (err) {
      console.error('File upload failed:', err)
      alert(t('chat.uploadError'))
    } finally {
      setUploadingFile(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const filteredConvs = conversations.filter((c) =>
    c.otherUserName.toLowerCase().includes(search.toLowerCase())
  )

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0)

  return (
    <div className="flex h-[calc(100vh-80px)] overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${activeConv ? 'hidden md:flex' : 'flex'} w-full md:w-72 shrink-0 flex-col border-r border-gray-200 dark:border-gray-700`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            <h2 className="font-bold text-gray-900 dark:text-gray-100">{t('chat.messages')}</h2>
            {totalUnread > 0 && (
              <span className="bg-primary-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
            <button
              onClick={() => setShowNewChat(true)}
              className="ml-auto p-1.5 rounded-lg bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/50 transition-colors"
              title={t('chat.newDialog')}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('chat.search')}
              className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 rounded-lg border-0 outline-none text-gray-900 dark:text-gray-100 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredConvs.length === 0 ? (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">{t('chat.noDialogs')}</p>
          ) : (
            filteredConvs.map((c) => (
              <div
                key={c.id}
                className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                  activeConv?.id === c.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
                onClick={() => setActiveConv(c)}
              >
                <div className="relative">
                  <Avatar name={c.otherUserName} url={c.otherUserAvatar} />
                  {c.unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                      {c.unreadCount > 9 ? '9+' : c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${c.unreadCount > 0 ? 'font-semibold text-gray-900 dark:text-gray-100' : 'font-medium text-gray-800 dark:text-gray-200'}`}>
                    {c.otherUserName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{t(`roles.${c.otherUserRole}`)}</p>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(c.id, e)}
                  disabled={deletingConvId === c.id}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
                  title={t('chat.deleteConversation')}
                >
                  {deletingConvId === c.id
                    ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    : <Trash2 className="w-3.5 h-3.5" />
                  }
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      {activeConv ? (
        <div className={`${activeConv ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0">
            <button
              onClick={() => setActiveConv(null)}
              className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <Avatar name={activeConv.otherUserName} url={activeConv.otherUserAvatar} />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">{activeConv.otherUserName}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{t(`roles.${activeConv.otherUserRole}`)}</p>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 sm:px-5 py-4 space-y-3">
            {loadingMsgs ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-8">{t('chat.startConversation')}</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id
                return (
                  <div key={msg.id} className={`group flex gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    {!isMe && <Avatar name={msg.senderName} url={msg.senderAvatar} size="sm" />}
                    <div className={`max-w-[85%] sm:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                      <div className={`flex items-end gap-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                      {isMe && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          disabled={deletingMsgId === msg.id}
                          className="opacity-0 group-hover:opacity-100 mb-1 p-1 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shrink-0"
                          title={t('chat.deleteMessage')}
                        >
                          {deletingMsgId === msg.id
                            ? <div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                        </button>
                      )}
                      <div className={`rounded-2xl text-sm leading-relaxed break-all overflow-hidden ${
                        isMe
                          ? 'bg-primary-600 text-white rounded-tr-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-tl-sm'
                      }`}>
                        {msg.fileUrl ? (
                          msg.fileType?.startsWith('image/') ? (
                            <button
                              onClick={() => setLightboxImage({ src: getFileUrl(msg.fileUrl), alt: msg.fileName ?? 'image' })}
                              className="block focus:outline-none"
                            >
                              <img
                                src={getFileUrl(msg.fileUrl)}
                                alt={msg.fileName ?? 'image'}
                                className="max-w-[240px] max-h-[200px] object-cover rounded-2xl hover:opacity-90 transition-opacity cursor-zoom-in"
                              />
                            </button>
                          ) : (
                            <div className={`flex items-center gap-2.5 px-4 py-3 ${isMe ? 'text-white' : ''}`}>
                              {/* Клик на имя/иконку — открыть */}
                              <a
                                href={getFileUrl(msg.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2.5 flex-1 min-w-0 hover:opacity-80 transition-opacity"
                              >
                                <FileText className="w-5 h-5 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium truncate max-w-[180px]">{msg.fileName}</p>
                                  {msg.fileSize && (
                                    <p className={`text-xs ${isMe ? 'text-primary-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                      {msg.fileSize < 1024 * 1024
                                        ? `${(msg.fileSize / 1024).toFixed(1)} KB`
                                        : `${(msg.fileSize / 1024 / 1024).toFixed(1)} MB`}
                                    </p>
                                  )}
                                </div>
                              </a>
                              {/* Клик на иконку — скачать (blob для iOS) */}
                              <button
                                onClick={() => handleDownload(getFileUrl(msg.fileUrl), msg.fileName ?? 'file')}
                                className="shrink-0 p-1.5 rounded-lg hover:opacity-80 transition-opacity"
                                title="Скачать"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )
                        ) : (
                          <p className="px-4 py-2.5 break-all whitespace-pre-wrap">
                            {msg.content?.split(/(https?:\/\/[^\s]+)/g).map((part, i) =>
                              /^https?:\/\//.test(part)
                                ? <a key={i} href={part} target="_blank" rel="noreferrer"
                                    className={`underline ${isMe ? 'text-white/90' : 'text-primary-600 dark:text-primary-400'}`}>
                                    {part}
                                  </a>
                                : part
                            )}
                          </p>
                        )}
                      </div>
                      </div>
                      <span className="text-[10px] text-gray-400 dark:text-gray-500 px-1">
                        {new Date(msg.createdAt).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Almaty' })}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-5 py-4 border-t border-gray-200 dark:border-gray-700 shrink-0">
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
                onChange={handleFileUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                title={t('chat.attachFile')}
                className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 rounded-xl transition-colors shrink-0"
              >
                {uploadingFile
                  ? <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                  : <Paperclip className="w-4 h-4" />
                }
              </button>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder={t('chat.inputPlaceholder')}
                rows={1}
                className="flex-1 resize-none px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-primary-500 dark:focus:border-primary-400 transition-colors max-h-32 overflow-y-auto"
                style={{ minHeight: '42px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-3 text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('chat.selectOrStart')}</p>
        </div>
      )}

      {showNewChat && (
        <NewChatModal
          onClose={() => setShowNewChat(false)}
          onSelect={async (userId) => {
            const conv = await openWithUser(userId)
            if (conv) setActiveConv(conv)
          }}
        />
      )}

      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  )
}
