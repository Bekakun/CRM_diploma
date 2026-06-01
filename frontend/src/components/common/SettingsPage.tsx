import { useState, useRef, useEffect } from 'react'
import { Camera, Moon, Sun, Save, Lock, Send, CheckCircle, Unlink, Copy } from 'lucide-react'
import { useAuthStore } from '../../context/authStore'
import { useThemeStore } from '../../context/themeStore'
import { useToast } from '../../hooks/useToast'
import { useTranslation } from 'react-i18next'
import Toaster from './Toaster'
import FormField from './FormField'
import PasswordInput from './PasswordInput'
import api from '../../services/api'
import { getFileUrl } from '../../utils/fileUrl'

interface Props {
  showPasswordChange?: boolean
}

export default function SettingsPage({ showPasswordChange = true }: Props) {
  const { user, updateUser } = useAuthStore()
  const { theme, toggleTheme } = useThemeStore()
  const { toasts, show: showToast, dismiss } = useToast()
  const { t } = useTranslation()

  const [formData, setFormData] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    phone: user?.phone ?? '',
  })
  const [saveLoading, setSaveLoading] = useState(false)
  const [photoUploading, setPhotoUploading] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const [pw, setPw] = useState({ current: '', next: '', confirm: '' })
  const [pwLoading, setPwLoading] = useState(false)

  // Email change state
  const [emailStep, setEmailStep] = useState<'idle' | 'input' | 'code'>('idle')
  const [newEmail, setNewEmail] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [emailLoading, setEmailLoading] = useState(false)

  const handleRequestEmailChange = async () => {
    if (!newEmail || !newEmail.includes('@')) return
    setEmailLoading(true)
    try {
      await api.post('/profile/change-email/request', { newEmail })
      setEmailStep('code')
      showToast(`Код отправлен на ${newEmail}`, 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка отправки кода', 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  const handleConfirmEmailChange = async () => {
    if (emailCode.length < 6) return
    setEmailLoading(true)
    try {
      const res = await api.post<{ newEmail: string }>('/profile/change-email/confirm', { code: emailCode })
      updateUser({ email: res.data.newEmail })
      showToast('Email успешно изменён', 'success')
      setEmailStep('idle')
      setNewEmail('')
      setEmailCode('')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Неверный код', 'error')
    } finally {
      setEmailLoading(false)
    }
  }

  const [tgLinked, setTgLinked] = useState(false)
  const [tgCode, setTgCode] = useState<string | null>(null)
  const [tgCodeLoading, setTgCodeLoading] = useState(false)
  const [tgUnlinking, setTgUnlinking] = useState(false)

  useEffect(() => {
    // Fetch fresh profile to get up-to-date phone/name
    api.get<{ firstName: string; lastName: string; phone?: string; email?: string }>('/auth/me')
      .then(res => {
        setFormData(prev => ({
          ...prev,
          firstName: res.data.firstName ?? prev.firstName,
          lastName: res.data.lastName ?? prev.lastName,
          phone: res.data.phone ?? prev.phone,
        }))
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    api.get<{ linked: boolean }>('/telegram/status')
      .then(res => setTgLinked(res.data.linked))
      .catch(() => {})
  }, [])

  const handleGenerateCode = async () => {
    setTgCodeLoading(true)
    try {
      const res = await api.post<{ code: string }>('/telegram/link-code')
      setTgCode(res.data.code)
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('settings.telegramCodeError'), 'error')
    } finally {
      setTgCodeLoading(false)
    }
  }

  const handleUnlinkTelegram = async () => {
    setTgUnlinking(true)
    try {
      await api.delete('/telegram/unlink')
      setTgLinked(false)
      setTgCode(null)
      showToast(t('settings.telegramUnlinked'), 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Ошибка', 'error')
    } finally {
      setTgUnlinking(false)
    }
  }

  const copyCode = () => {
    if (tgCode) {
      navigator.clipboard.writeText(`/link ${tgCode}`)
      showToast(t('settings.telegramCommandCopied'), 'success')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaveLoading(true)
    try {
      const res = await api.patch<{ firstName: string; lastName: string; phone?: string }>('/profile', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone || undefined,
      })
      updateUser({ firstName: res.data.firstName, lastName: res.data.lastName, phone: res.data.phone })
      showToast(t('common.changesSaved'), 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('common.saveError'), 'error')
    } finally {
      setSaveLoading(false)
    }
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('common.fileTooLarge'), 'error')
      return
    }
    setPhotoUploading(true)
    try {
      const fd = new FormData()
      fd.append('photo', file)
      const res = await api.post<{ profilePhotoUrl?: string }>('/profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      updateUser({ profilePhotoUrl: res.data.profilePhotoUrl })
      showToast(t('common.photoUpdated'), 'success')
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('common.photoError'), 'error')
    } finally {
      setPhotoUploading(false)
    }
  }

  const getPasswordStrength = (pwd: string): { score: number; label: string; color: string } => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8)  score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[a-z]/.test(pwd)) score++
    if (/\d/.test(pwd))    score++
    if (/[!@#$%^&*(),.?":{}|<>_\-]/.test(pwd)) score++
    if (score <= 2) return { score: 1, label: t('auth.strengthWeak'),   color: 'bg-red-500' }
    if (score <= 4) return { score: 2, label: t('auth.strengthMedium'), color: 'bg-amber-500' }
    if (score <= 5) return { score: 3, label: t('auth.strengthGood'),   color: 'bg-lime-500' }
    return              { score: 4, label: t('auth.strengthStrong'),  color: 'bg-emerald-500' }
  }
  const pwStrength = getPasswordStrength(pw.next)

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (pw.next !== pw.confirm) {
      showToast(t('common.passwordMismatch'), 'error')
      return
    }
    if (pw.next.length < 8) {
      showToast(t('common.passwordTooShort'), 'error')
      return
    }
    setPwLoading(true)
    try {
      await api.post('/profile/change-password', {
        currentPassword: pw.current,
        newPassword: pw.next,
      })
      showToast(t('common.passwordChanged'), 'success')
      setPw({ current: '', next: '', confirm: '' })
    } catch (err: any) {
      showToast(err?.response?.data?.message || t('common.passwordError'), 'error')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <>
      <Toaster toasts={toasts} dismiss={dismiss} />

      <div className="max-w-3xl space-y-6 animate-fadeSlideDown">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t('settings.title')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('settings.subtitle')}</p>
        </div>

        {/* Photo + Theme side by side */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Photo */}
          <div className="card flex flex-col items-center">
            <div className="relative group mb-3">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden shadow-md">
                {user?.profilePhotoUrl ? (
                  <img src={getFileUrl(user.profilePhotoUrl)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-white">
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </span>
                )}
              </div>
              <label className={`absolute inset-0 rounded-full flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity ${photoUploading ? 'cursor-not-allowed' : ''}`}>
                {photoUploading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera className="w-5 h-5 text-white" />
                )}
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  disabled={photoUploading}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 text-center">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{user?.email}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">{t('common.clickToChangePhoto')}</p>
          </div>

          {/* Theme */}
          <div className="card sm:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('settings.appearance')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => theme === 'dark' && toggleTheme()}
                className={`p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
                  theme === 'light'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-10 h-10 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center shadow-sm">
                  <Sun className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('common.themeLight')}</p>
                  {theme === 'light' && (
                    <p className="text-xs text-primary-500 font-medium mt-0.5">{t('common.themeActive')}</p>
                  )}
                </div>
              </button>

              <button
                onClick={() => theme === 'light' && toggleTheme()}
                className={`p-4 border-2 rounded-xl transition-all flex flex-col items-center gap-2 ${
                  theme === 'dark'
                    ? 'border-primary-500 bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="w-10 h-10 bg-gray-900 border-2 border-gray-700 rounded-lg flex items-center justify-center shadow-sm">
                  <Moon className="w-5 h-5 text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t('common.themeDark')}</p>
                  {theme === 'dark' && (
                    <p className="text-xs text-primary-400 font-medium mt-0.5">{t('common.themeActive')}</p>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Profile form */}
        <form onSubmit={handleSubmit} className="card space-y-5">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.personalData')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label={t('common.firstName')} required>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="input-field"
                required
              />
            </FormField>

            <FormField label={t('common.lastName')} required>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="input-field"
                required
              />
            </FormField>

            <FormField label={t('common.email')}>
              {emailStep === 'idle' && (
                <div className="flex gap-2 items-stretch">
                  <input type="email" value={user?.email ?? ''} className="input-field flex-1 opacity-60 cursor-not-allowed" disabled />
                  <button type="button" onClick={() => setEmailStep('input')}
                    className="btn-secondary text-sm px-4 shrink-0 self-stretch">
                    {t('settings.changeEmail') || 'Сменить'}
                  </button>
                </div>
              )}
              {emailStep === 'input' && (
                <div className="space-y-2">
                  <input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    placeholder="Новый email" className="input-field" autoFocus />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleRequestEmailChange} disabled={emailLoading || !newEmail.includes('@')}
                      className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                      {emailLoading ? 'Отправка...' : 'Отправить код'}
                    </button>
                    <button type="button" onClick={() => { setEmailStep('idle'); setNewEmail('') }}
                      className="btn-secondary text-xs px-3 py-2">Отмена</button>
                  </div>
                </div>
              )}
              {emailStep === 'code' && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Код отправлен на <b>{newEmail}</b></p>
                  <input type="text" inputMode="numeric" maxLength={6} value={emailCode}
                    onChange={e => setEmailCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="000000" className="input-field text-center tracking-widest font-mono" autoFocus />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleConfirmEmailChange} disabled={emailLoading || emailCode.length < 6}
                      className="btn-primary text-xs px-3 py-2 disabled:opacity-50">
                      {emailLoading ? 'Проверка...' : 'Подтвердить'}
                    </button>
                    <button type="button" onClick={() => { setEmailStep('idle'); setNewEmail(''); setEmailCode('') }}
                      className="btn-secondary text-xs px-3 py-2">Отмена</button>
                  </div>
                </div>
              )}
            </FormField>

            <FormField label={t('common.phone')}>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
                placeholder={t('settings.phonePlaceholder')}
              />
            </FormField>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={saveLoading}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saveLoading ? t('common.saving') : t('common.save')}
            </button>
          </div>
        </form>

        {/* Telegram */}
        <div className="card space-y-4">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.telegram')}</h2>
          </div>

          {tgLinked ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>{t('settings.telegramLinked')}</span>
              </div>
              <button
                onClick={handleUnlinkTelegram}
                disabled={tgUnlinking}
                className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <Unlink className="w-4 h-4" />
                {tgUnlinking ? t('settings.telegramUnlinking') : t('settings.telegramUnlink')}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.telegramDesc')}
              </p>
              {!tgCode ? (
                <button
                  onClick={handleGenerateCode}
                  disabled={tgCodeLoading}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {tgCodeLoading ? t('settings.telegramGenerating') : t('settings.telegramGetCode')}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-2">{t('settings.telegramCodeLabel')}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl font-mono font-bold tracking-widest text-blue-700 dark:text-blue-300">{tgCode}</span>
                      <button onClick={copyCode} className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg transition-colors" title={t('settings.telegramCopyCommand')}>
                        <Copy className="w-4 h-4 text-blue-500" />
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-blue-600 dark:text-blue-400 space-y-1">
                      <p>{t('settings.telegramStep1')} <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">@crm_lms_telegram_bot</code></p>
                      <p>{t('settings.telegramStep2')} <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">/link {tgCode}</code></p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleGenerateCode}
                      disabled={tgCodeLoading}
                      className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
                    >
                      {t('settings.telegramNewCode')}
                    </button>
                    <button
                      onClick={async () => {
                        const res = await api.get<{ linked: boolean }>('/telegram/status')
                        if (res.data.linked) {
                          setTgLinked(true)
                          showToast(t('settings.telegramSuccess'), 'success')
                        } else {
                          showToast(t('settings.telegramNotLinked'), 'error')
                        }
                      }}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {t('settings.telegramCheckStatus')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Password */}
        {showPasswordChange && (
          <form onSubmit={handleChangePassword} className="card space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Lock className="w-4 h-4 text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{t('settings.changePassword')}</h2>
            </div>

            <FormField label={t('settings.currentPassword')} required>
              <PasswordInput
                value={pw.current}
                onChange={(e) => setPw((p) => ({ ...p, current: e.target.value }))}
                placeholder={t('settings.currentPasswordPlaceholder')}
                required
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <FormField label={t('settings.newPassword')} required>
                  <PasswordInput
                    value={pw.next}
                    onChange={(e) => setPw((p) => ({ ...p, next: e.target.value }))}
                    placeholder={t('settings.newPasswordPlaceholder')}
                    required
                  />
                </FormField>
                {pw.next ? (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1, 2, 3, 4].map(seg => (
                        <div
                          key={seg}
                          className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                            pwStrength.score >= seg ? pwStrength.color : 'bg-gray-200 dark:bg-gray-700'
                          }`}
                        />
                      ))}
                    </div>
                    <p className={`text-xs font-medium transition-colors duration-200 ${
                      pwStrength.score === 1 ? 'text-red-500' :
                      pwStrength.score === 2 ? 'text-amber-500' :
                      pwStrength.score === 3 ? 'text-lime-600' :
                      'text-emerald-600'
                    }`}>
                      {pwStrength.label}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('settings.newPasswordHint')}</p>
                )}
              </div>

              <FormField label={t('auth.confirmPassword')} required>
                <PasswordInput
                  value={pw.confirm}
                  onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
                  placeholder={t('settings.confirmPasswordPlaceholder')}
                  required
                />
              </FormField>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={pwLoading}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {pwLoading ? t('common.saving') : t('settings.changePasswordButton')}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  )
}
