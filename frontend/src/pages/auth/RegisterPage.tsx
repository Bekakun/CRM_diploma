import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '../../context/authStore'
import { authService } from '../../services/authService'
import { useTranslation } from 'react-i18next'
import {
  Sparkles, Mail, Lock, User, Phone, ArrowRight,
  ShieldCheck, KeyRound, CheckCircle2,
} from 'lucide-react'
import axios from 'axios'

const ORBS = [
  { ox: -200, oy: -180, size: 380, color: 'rgba(99,102,241,0.22)',  speed: 0.035 },
  { ox:  180, oy:  120, size: 300, color: 'rgba(14,165,233,0.18)',  speed: 0.055 },
  { ox:   30, oy:  200, size: 240, color: 'rgba(139,92,246,0.15)', speed: 0.025 },
  { ox:  220, oy: -220, size: 200, color: 'rgba(6,182,212,0.16)',  speed: 0.045 },
]

export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
    invitationToken: '',
  })
  const [error, setError]                   = useState('')
  const [step, setStep]                     = useState<'register' | 'verify'>('register')
  const [verificationCode, setVerificationCode] = useState('')
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const otpRefs = useRef<(HTMLInputElement | null)[]>([])
  const [submitLoading, setSubmitLoading]   = useState(false)
  const [verifyLoading, setVerifyLoading]   = useState(false)

  const navigate = useNavigate()
  const { register, setUser } = useAuthStore()
  const { t } = useTranslation()

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
  const pwdStrength = getPasswordStrength(formData.password)

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const orbRefs      = useRef<(HTMLDivElement | null)[]>([])
  const orbOff       = useRef(ORBS.map(() => ({ x: 0, y: 0 })))
  const mouseOff     = useRef({ x: 0, y: 0 })
  const rafLeft      = useRef<number>(0)

  const rightPanelRef = useRef<HTMLDivElement>(null)
  const spotRef       = useRef<HTMLDivElement>(null)
  const spotCur       = useRef({ x: 0, y: 0 })
  const spotTgt       = useRef({ x: 0, y: 0 })
  const rafRight      = useRef<number>(0)

  const animateOrbs = useCallback(() => {
    ORBS.forEach((orb, i) => {
      const cur = orbOff.current[i]
      cur.x += (mouseOff.current.x - cur.x) * orb.speed
      cur.y += (mouseOff.current.y - cur.y) * orb.speed
      const el = orbRefs.current[i]
      if (el) {
        el.style.transform = `translate3d(calc(-50% + ${cur.x + orb.ox}px), calc(-50% + ${cur.y + orb.oy}px), 0)`
      }
    })
    rafLeft.current = requestAnimationFrame(animateOrbs)
  }, [])

  const animateSpot = useCallback(() => {
    const cur = spotCur.current
    const tgt = spotTgt.current
    cur.x += (tgt.x - cur.x) * 0.07
    cur.y += (tgt.y - cur.y) * 0.07
    if (spotRef.current) {
      spotRef.current.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`
    }
    rafRight.current = requestAnimationFrame(animateSpot)
  }, [])

  const handleLeftMouseMove = useCallback((e: MouseEvent) => {
    const panel = leftPanelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    mouseOff.current.x = ((e.clientX - rect.left) / rect.width  - 0.5) * 160
    mouseOff.current.y = ((e.clientY - rect.top)  / rect.height - 0.5) * 160
  }, [])

  const handleRightMouseMove = useCallback((e: MouseEvent) => {
    const panel = rightPanelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    spotTgt.current.x = e.clientX - rect.left
    spotTgt.current.y = e.clientY - rect.top
  }, [])

  useEffect(() => {
    const lp = leftPanelRef.current
    const rp = rightPanelRef.current
    if (rp) {
      const r = rp.getBoundingClientRect()
      spotCur.current = { x: r.width / 2, y: r.height / 2 }
      spotTgt.current = { x: r.width / 2, y: r.height / 2 }
    }
    lp?.addEventListener('mousemove', handleLeftMouseMove, { passive: true })
    rp?.addEventListener('mousemove', handleRightMouseMove, { passive: true })
    rafLeft.current  = requestAnimationFrame(animateOrbs)
    rafRight.current = requestAnimationFrame(animateSpot)
    return () => {
      lp?.removeEventListener('mousemove', handleLeftMouseMove)
      rp?.removeEventListener('mousemove', handleRightMouseMove)
      cancelAnimationFrame(rafLeft.current)
      cancelAnimationFrame(rafRight.current)
    }
  }, [handleLeftMouseMove, handleRightMouseMove, animateOrbs, animateSpot])

  useEffect(() => {
    const tokenFromUrl = searchParams.get('token')
    if (!tokenFromUrl) return
    setFormData(prev => ({ ...prev, invitationToken: tokenFromUrl }))
    axios.get(`/api/v1/invitations/by-token/${tokenFromUrl}`)
      .then(res => {
        if (res.data.email) setFormData(prev => ({ ...prev, email: res.data.email }))
      })
      .catch(() => {})
  }, [searchParams])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setFormData({ ...formData, [e.target.name]: e.target.value })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitLoading(true)

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordMismatch'))
      setSubmitLoading(false)
      return
    }
    if (formData.password.length < 8) {
      setError(t('auth.passwordTooShort'))
      setSubmitLoading(false)
      return
    }
    const hasUppercase = /[A-Z]/.test(formData.password)
    const hasLowercase = /[a-z]/.test(formData.password)
    const hasDigit     = /\d/.test(formData.password)
    const hasSpecial   = /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
    if (!hasUppercase || !hasLowercase || !hasDigit || !hasSpecial) {
      setError(t('auth.passwordTooWeak'))
      setSubmitLoading(false)
      return
    }

    try {
      await register({
        email:           formData.email,
        password:        formData.password,
        firstName:       formData.firstName,
        lastName:        formData.lastName,
        phone:           formData.phone || undefined,
        invitationToken: formData.invitationToken || undefined,
      })
      setStep('verify')
    } catch (err: any) {
      const data = err.response?.data
      setError(
        data?.validationErrors
          ? Object.values(data.validationErrors).join(', ')
          : data?.message || t('auth.registerError')
      )
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifyLoading(true)
    try {
      const response = await authService.verifyEmail(formData.email, verificationCode)
      setUser(response.user)
      navigate('/', { replace: true })
    } catch (err: any) {
      setError(err.response?.data?.message || t('auth.verificationError'))
    } finally {
      setVerifyLoading(false)
    }
  }

  // ── Verify step ──
  if (step === 'verify') {
    return (
      <div className="min-h-screen flex bg-gray-50 overflow-hidden">
        {/* Left panel */}
        <div
          ref={leftPanelRef}
          className="hidden lg:flex lg:w-[55%] relative flex-col items-center justify-center p-12 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-primary-700 to-blue-900" />
          <div className="absolute inset-0 opacity-[0.035]"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '128px' }} />
          {ORBS.map((orb, i) => (
            <div key={i} ref={el => { orbRefs.current[i] = el }}
              className="absolute rounded-full blur-3xl pointer-events-none"
              style={{ width: orb.size, height: orb.size, background: orb.color, top: '50%', left: '50%', willChange: 'transform', transform: `translate3d(calc(-50% + ${orb.ox}px), calc(-50% + ${orb.oy}px), 0)` }} />
          ))}
          <div className="absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />

          <div className="relative text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 mx-auto bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center
                            shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-white">{t('auth.emailVerification')}</h2>
            <p className="text-indigo-200/80 text-lg leading-relaxed">
              {t('auth.verificationCodeSent')}{' '}
              <span className="font-semibold text-cyan-300">{formData.email}</span>
            </p>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-xl border border-white/20 text-white/70 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              Проверьте папку «Спам», если письмо не пришло
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div
          ref={rightPanelRef}
          className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[#f8fafc]" />
          <div className="absolute inset-0 opacity-40"
            style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
          <div ref={spotRef} className="pointer-events-none absolute rounded-full"
            style={{ width: 700, height: 700, top: -350, left: -350, willChange: 'transform', background: 'radial-gradient(circle, rgba(14,165,233,0.14) 0%, rgba(99,102,241,0.07) 45%, transparent 70%)', transform: 'translate3d(0px,0px,0)' }} />
          <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/60 to-transparent rounded-bl-full" />
          <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/40 to-transparent rounded-tr-full" />

          <div className="relative w-full max-w-[380px]">
            <div className="bg-white/85 backdrop-blur-2xl rounded-3xl p-8
                            shadow-[0_24px_64px_rgba(0,0,0,0.09),0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
                            border border-white/70 ring-1 ring-indigo-100/50">
              <div className="mb-8 text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-50 rounded-2xl mb-4 shadow-sm">
                  <Mail className="w-7 h-7 text-primary-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">{t('auth.emailVerification')}</h2>
                <p className="text-gray-500 text-sm mt-1">
                  {t('auth.verificationCodeSent')}{' '}
                  <span className="font-medium text-gray-700">{formData.email}</span>
                </p>
              </div>

              <form onSubmit={handleVerify} className="space-y-5">
                {error && (
                  <div className="flex items-start gap-2.5 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                    {error}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 text-center">
                    {t('auth.verificationCode')}
                  </label>
                  {/* OTP boxes */}
                  <div className="flex justify-center gap-2.5">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={el => { otpRefs.current[idx] = el }}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        autoFocus={idx === 0}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '')
                          if (!val) return
                          const newDigits = [...otpDigits]
                          newDigits[idx] = val[val.length - 1]
                          setOtpDigits(newDigits)
                          setVerificationCode(newDigits.join(''))
                          if (idx < 5) otpRefs.current[idx + 1]?.focus()
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Backspace') {
                            e.preventDefault()
                            const newDigits = [...otpDigits]
                            if (newDigits[idx]) {
                              newDigits[idx] = ''
                            } else if (idx > 0) {
                              newDigits[idx - 1] = ''
                              otpRefs.current[idx - 1]?.focus()
                            }
                            setOtpDigits(newDigits)
                            setVerificationCode(newDigits.join(''))
                          }
                        }}
                        onPaste={e => {
                          e.preventDefault()
                          const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
                          const newDigits = [...otpDigits]
                          for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i]
                          setOtpDigits(newDigits)
                          setVerificationCode(newDigits.join(''))
                          const nextFocus = Math.min(pasted.length, 5)
                          otpRefs.current[nextFocus]?.focus()
                        }}
                        className="w-11 h-14 text-center text-2xl font-bold rounded-xl border-2
                                   border-gray-200 bg-white text-gray-900
                                   focus:border-primary-500 focus:ring-2 focus:ring-primary-100
                                   outline-none transition-all duration-150
                                   shadow-sm hover:border-gray-300"
                      />
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading || verificationCode.length < 6}
                  className="btn-primary w-full py-3"
                >
                  {verifyLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{t('auth.verifyButton')}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-500">
                  <button
                    type="button"
                    onClick={() => setStep('register')}
                    className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                  >
                    {t('common.back')}
                  </button>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Register step ──
  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">

      {/* ── Left panel ── */}
      <div
        ref={leftPanelRef}
        className="hidden lg:flex lg:w-[45%] relative flex-col justify-between p-12 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-700 via-primary-700 to-blue-900" />
        <div className="absolute inset-0 opacity-[0.035]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")", backgroundSize: '128px' }} />
        {ORBS.map((orb, i) => (
          <div key={i} ref={el => { orbRefs.current[i] = el }}
            className="absolute rounded-full blur-3xl pointer-events-none"
            style={{ width: orb.size, height: orb.size, background: orb.color, top: '50%', left: '50%', willChange: 'transform', transform: `translate3d(calc(-50% + ${orb.ox}px), calc(-50% + ${orb.oy}px), 0)` }} />
        ))}
        <div className="absolute inset-0 opacity-[0.08]"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        <div className="absolute top-0 left-0 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center
                          shadow-[0_2px_12px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.2)]">
            <Sparkles className="w-5 h-5 text-white drop-shadow" />
          </div>
          <div>
            <span className="text-white font-bold text-lg leading-none">{t('sidebar.systemName')}</span>
            <p className="text-indigo-200/70 text-xs mt-0.5">{t('sidebar.learningCenter')}</p>
          </div>
        </div>

        {/* Content */}
        <div className="relative space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1.5
                            bg-white/10 backdrop-blur-sm rounded-full
                            border border-white/20 text-white/80 text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t('auth.registerSubtitle')}
            </div>
            <h1 className="text-[38px] font-bold text-white leading-[1.15] tracking-tight">
              {t('auth.register')}
              <span className="block text-cyan-300 mt-1">{t('sidebar.learningCenter')}</span>
            </h1>
            <p className="text-indigo-200/80 text-base leading-relaxed max-w-sm">
              {t('auth.heroSubtitle')}
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { icon: User,         text: 'Заполните личные данные' },
              { icon: KeyRound,     text: 'Придумайте надёжный пароль' },
              { icon: ShieldCheck,  text: 'Подтвердите email' },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-white/8 hover:bg-white/14
                                       backdrop-blur-sm rounded-xl border border-white/10 hover:border-white/25
                                       transition-all duration-300 group cursor-default">
                <div className="w-8 h-8 bg-white/15 rounded-lg flex items-center justify-center shrink-0
                                 group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary-500/40 border border-white/20 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-white/80 text-sm font-medium group-hover:text-white transition-colors duration-200">{step.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative" />
      </div>

      {/* ── Right panel ── */}
      <div
        ref={rightPanelRef}
        className="flex-1 flex items-center justify-center p-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-[#f8fafc]" />
        <div className="absolute inset-0 opacity-40"
          style={{ backgroundImage: 'radial-gradient(circle, rgba(99,102,241,0.07) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
        <div ref={spotRef} className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(600px circle at 50% 50%, rgba(14,165,233,0.1) 0%, transparent 70%)' }} />
        <div className="pointer-events-none absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-indigo-100/60 to-transparent rounded-bl-full" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-100/40 to-transparent rounded-tr-full" />

        <div className="relative w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">{t('sidebar.systemName')}</span>
          </div>

          {/* Form card */}
          <div className="bg-white/85 backdrop-blur-2xl rounded-3xl p-8
                          shadow-[0_24px_64px_rgba(0,0,0,0.09),0_4px_16px_rgba(0,0,0,0.05),inset_0_1px_0_rgba(255,255,255,0.9)]
                          border border-white/70 ring-1 ring-indigo-100/50">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t('auth.register')}</h2>
              <p className="text-gray-500 text-sm mt-1">{t('auth.registerSubtitle')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm border border-red-100">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  {error}
                </div>
              )}

              {formData.invitationToken && (
                <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 px-4 py-3 rounded-xl text-sm border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {t('auth.invitationActivated')}
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('common.firstName')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="Алия"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('common.lastName')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="Смагулова"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.email')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="your@email.com"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  {t('common.phone')}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="input-field pl-10"
                    placeholder="+77001234567"
                  />
                </div>
              </div>

              {/* Passwords row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('common.password')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder={t('auth.passwordPlaceholder')}
                      required
                    />
                  </div>
                  {/* Password strength indicator */}
                  {formData.password && (
                    <div className="space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(seg => (
                          <div
                            key={seg}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              pwdStrength.score >= seg ? pwdStrength.color : 'bg-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-medium transition-colors duration-200 ${
                        pwdStrength.score === 1 ? 'text-red-500' :
                        pwdStrength.score === 2 ? 'text-amber-500' :
                        pwdStrength.score === 3 ? 'text-lime-600' :
                        'text-emerald-600'
                      }`}>
                        {pwdStrength.label}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('auth.confirmPassword')} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-400 -mt-1">{t('auth.passwordHint')}</p>

              {/* Invitation token (if not prefilled) */}
              {!formData.invitationToken && (
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-gray-700">
                    {t('auth.invitationCode')}
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-primary-400 dark:text-primary-400 z-10 pointer-events-none" />
                    <input
                      type="text"
                      name="invitationToken"
                      value={formData.invitationToken}
                      onChange={handleChange}
                      className="input-field pl-10"
                      placeholder={t('auth.invitationCodePlaceholder')}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitLoading}
                className="btn-primary w-full py-3 mt-2"
              >
                {submitLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t('auth.registerButton')}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-500 pt-1">
                {t('auth.haveAccount')}{' '}
                <Link
                  to="/login"
                  className="text-primary-600 hover:text-primary-700 font-semibold transition-colors"
                >
                  {t('auth.loginLink')}
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
